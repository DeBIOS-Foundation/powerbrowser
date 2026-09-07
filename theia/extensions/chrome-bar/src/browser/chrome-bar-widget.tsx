import * as React from '@theia/core/shared/react';
import { createPortal } from '@theia/core/shared/react-dom';
import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    FrontendApplicationContribution,
    OpenerService,
    ReactWidget,
    StatusBar,
    StatusBarAlignment,
    Widget,
} from '@theia/core/lib/browser';
import { CommandRegistry, Disposable } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { NavigatableWidget } from '@theia/core/lib/browser/navigatable-types';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import pDebounce from 'p-debounce';
import type { TabQueryRow } from '@powerbrowser/tab-uris/lib/node/tab-query-service';
import { WebTabChannel, WebTabWidget } from '@powerbrowser/tab-uris/lib/browser/web-tab';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';
import {
    CHROME_BAR_BACK_COMMAND_ID,
    CHROME_BAR_FORWARD_COMMAND_ID,
    CHROME_BAR_INPUT_CLASS,
    CHROME_BAR_NEW_TAB_COMMAND_ID,
    CHROME_BAR_RELOAD_COMMAND_ID,
    chromeBarHasNavigableTab,
    currentWebTab,
    focusAddressPill,
    setCurrentWebTab,
} from './chrome-bar-commands';
import { CHROME_SUGGESTION_LIMIT, ChromeBarSuggestionService } from './chrome-bar-suggestion-service';
import { MODES_ACTIVATE_COMMAND_ID } from '@powerbrowser/modes/lib/browser/modes-commands';
import { ModeService } from '@powerbrowser/modes/lib/browser/mode-service';
// The organising placeholder's own id, imported for the same const-discipline
// reason every command id here is imported: the tab count excludes that widget
// by identity, and a re-spelled string would keep counting it the day the
// widget renames.
import { OrganisingWidget } from '@powerbrowser/modes/lib/browser/organising-widget';
import '../../src/browser/chrome-bar.css';

/**
 * Maps raw typed text onto the contracted search-or-address routing.
 * Returns the URL to open, or undefined when the text is not an address
 * this tree can visit (the caller surfaces the contracted in-bar failure
 * row). No search-engine host is minted here by design.
 */
function typedAddressTargetOf(text: string): string | undefined {
    if (/^https?:\/\//i.test(text)) {
        return text;
    }
    if (!/\s/.test(text) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text) && text.includes('.')) {
        return `https://${text}`;
    }
    return undefined;
}

/**
 * GUI-06 (13-03): the chrome bar widget -- nav buttons, address pill with
 * suggestions, new-tab, mode toggle, and tab-count chip.
 *
 * A React contribution added once at startup to the top shell area -- the
 * plain Lumino panel above the main dock, so no core patch and no dock
 * surgery (13-RESEARCH.md Pattern 1). Ratified Variant-A order is menubar,
 * chrome bar, tab strip, workarea, status bar (13-UI-SPEC.md Bar placement
 * and order). Structural class hooks below are the
 * style layer's contract (chrome-bar.css targets them verbatim): bar,
 * buttons, pill, input, dropdown, rows, toggle, segments, tab count.
 *
 * Menu-visibility coupling (13-RESEARCH.md Pitfall 1): the whole top panel
 * hides with `window.menuBarVisibility`, so this bar vanishes with the
 * menu. The menu stays visible by default and no check ever asserts bar
 * visibility while the menu is hidden.
 *
 * Threat notes (13-03 threat model): suggestion titles and captions render
 * as React text nodes only, never markup (T-13-03-01); address commits
 * route through the existing opener with empty as a no-op and no
 * evaluation surface (T-13-03-03); the toggle is selection state only and
 * never touches a tab, with the chip asserting the invariant on every
 * switch (T-13-03-04); a refused or unacknowledged web-tab navigation takes
 * the same throw-and-catch path a blocked popup once did, with no new dialog
 * authored (T-13-03-05).
 *
 * GUI-02 (14.1-02): http(s) commits, suggestion rows and "+" all land in an
 * in-shell web tab (navigateWebTab below and the New Tab command); the pill
 * is bound to the shell's current widget and to the active web tab's state
 * pushes; nav enablement follows those pushes. No path from this file reaches
 * the stock window -- that survives only behind the GUI-01 palette command.
 *
 * No chrome-side command is registered and nothing opens at startup: the
 * bar only issues commands through the registry on user gestures (a
 * startup-opened window would break the stock chrome per the candidate-A
 * constraint).
 */
@injectable()
export class ChromeBarWidget extends ReactWidget {

    static readonly ID = 'powerbrowser.chrome-bar';

    /** The three shipped mode defaults, in contracted order. */
    static readonly MODES = ['Coding', 'Browsing', 'Organising'];

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ChromeBarSuggestionService)
    protected readonly suggestions: ChromeBarSuggestionService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    // No PerspectiveService here by design: every mode switch this widget
    // issues -- shipped segment and custom row alike -- goes through the mode
    // command, which owns the stock switch plus the contracted panel work.
    // The contribution below still holds the service, to LISTEN for the stock
    // perspective event and to read the live id at startup; it never switches.

    /**
     * GUI-07 (14-02): custom modes listed beside the shipped defaults. The
     * shipped MODES literal above stays the fallback behind customs: customs
     * append as menu rows after the shipped segments, truncated by ellipsis
     * at row width with full names in tooltips, the active row carrying the
     * inherited selected-row marker. Shipped rows are never mutated.
     */
    @inject(ModeService)
    protected readonly modes: ModeService;

    /** GUI-02: the widget -> URI direction, for the pill's address on non-web tabs (UI-SPEC A6). */
    @inject(TabUriRegistry)
    protected readonly tabUris: TabUriRegistry;

    /** The active web tab's state-push subscription; replaced on every current-widget change. */
    protected stateSubscription: Disposable | undefined;

    protected customModes: Array<{ id: string; name: string }> = [];
    protected activeCustomId: string | undefined = undefined;

    protected inputValue = '';
    protected committedAddress = '';
    protected rows: TabQueryRow[] = [];
    protected dropdownOpen = false;
    protected highlightIndex = -1;
    protected providerFailed = false;
    protected commitFailed = false;
    protected shimmer = false;
    protected mode = ChromeBarWidget.MODES[0];
    protected tabCount = 0;
    protected querySeq = 0;
    /** True from a keystroke until the dropdown is closed on user intent; a debounced query fires only while armed. */
    protected dropdownArmed = false;
    protected pillRef: HTMLDivElement | null = null;

    /**
     * Re-derives the portalled dropdown geometry after a window resize
     * (every keystroke already re-renders, so only resize needs a push).
     */
    repositionDropdown(): void {
        if (this.dropdownOpen) {
            this.update();
        }
    }

    /** Debounced pill queries over the RPC proxy (in-tree p-debounce pin, 150ms precedent). */
    protected readonly debouncedQuery = pDebounce((prefix: string) => this.runQuery(prefix), 150);

    constructor() {
        super();
        // ReactWidget's constructor opts every subclass into perfect-scrollbar.
        // On a fixed-height bar that is actively harmful: it set overflow:hidden
        // on a node the shell had sized to the 32px menubar row while the bar
        // itself is 40px, so 8px was clipped and the bar drifted to y=-4 as the
        // hidden scroll position moved. The bar is one fixed row and scrolls in
        // no direction, so it takes no scrollbar.
        this.scrollOptions = undefined;
        this.id = ChromeBarWidget.ID;
        this.title.label = 'Chrome Bar';
        this.title.caption = 'Chrome Bar';
        this.title.closable = false;
    }

    protected runCommand = (id: string) => async (): Promise<void> => {
        try {
            await this.commands.executeCommand(id);
        } catch (error) {
            console.error('[@powerbrowser/chrome-bar] command failed:', id, error);
        }
        this.update();
    };

    /**
     * Closes the dropdown on user intent (commit, Escape, blur) AND
     * invalidates any query still in flight. Without the bump, a query
     * started by the last keystroke and still outstanding at Enter would
     * finish after the commit and re-open the dropdown over the page --
     * measured live by 14.1-03's web-tab check, where the reopened
     * dropdown counted as a blocking layer and the overlay stayed hidden.
     */
    protected closeDropdown(): void {
        this.querySeq += 1;
        this.dropdownArmed = false;
        this.dropdownOpen = false;
        this.highlightIndex = -1;
    }

    protected async runQuery(prefix: string): Promise<void> {
        // Only text typed since the last close may open the dropdown. The
        // debounce delays this call, so a query scheduled by the last
        // keystroke BEFORE Enter still arrives here AFTER the commit; the
        // sequence bump in closeDropdown cannot see it because the sequence
        // is taken below. Without this guard that late query re-opened the
        // dropdown over the committed page.
        if (!this.dropdownArmed) {
            return;
        }
        const seq = ++this.querySeq;
        // Row-level shimmer only past the contracted delay: local matches
        // paint synchronously with no spinner; the shimmer row appears only
        // when the provider is still outstanding after 150ms.
        const timer = setTimeout(() => {
            if (this.querySeq === seq) {
                this.shimmer = true;
                this.dropdownOpen = true;
                this.update();
            }
        }, 150);
        try {
            const rows = await this.suggestions.searchByPrefix(prefix, CHROME_SUGGESTION_LIMIT);
            if (this.querySeq !== seq) {
                return;
            }
            this.rows = rows.slice(0, CHROME_SUGGESTION_LIMIT);
            this.providerFailed = false;
        } catch {
            if (this.querySeq !== seq) {
                return;
            }
            this.rows = [];
            this.providerFailed = true;
        } finally {
            clearTimeout(timer);
            if (this.querySeq === seq) {
                this.shimmer = false;
                this.dropdownOpen = true;
                this.highlightIndex = -1;
                this.update();
            }
        }
    }

    protected onInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.inputValue = e.target.value;
        this.commitFailed = false;
        this.dropdownArmed = true;
        this.update();
        void this.debouncedQuery(this.inputValue);
    };

    /**
     * Opens a committed URL on the GUI-02 routing: http and https navigate
     * the active in-shell web tab, or open a new one when the active tab is
     * not a web tab (navigateWebTab below); every other scheme (view:,
     * settings:) keeps the existing two-step opener routing (getOpener plus
     * handler open), which already navigates in-Theia views correctly. No
     * path from here reaches the stock window: that survives only behind
     * the GUI-01 palette command.
     */
    protected openCommittedUrl = async (url: string): Promise<void> => {
        if (/^https?:\/\//i.test(url)) {
            await this.navigateWebTab(url);
        } else {
            const uri = new URI(url);
            const handler = await this.openerService.getOpener(uri);
            await handler.open(uri);
        }
    };

    /**
     * The one http(s) route. With an active web tab, navigates it in place
     * and turns a refused or unacknowledged reply into a throw so the
     * caller's catch surfaces the carried in-bar failure row (no new copy);
     * without one, the two-step opener resolves to WebTabOpenHandler at
     * priority 1000 and opens a new web tab.
     */
    protected async navigateWebTab(url: string): Promise<void> {
        const tab = currentWebTab();
        if (tab) {
            const reply = await tab.navigate(url);
            if (!reply.ok) {
                throw new Error('web tab did not acknowledge the navigation');
            }
            return;
        }
        const uri = new URI(url);
        const handler = await this.openerService.getOpener(uri);
        await handler.open(uri);
    }

    /** Surfaces a commit failure in-bar per the copy contract: one failure row, Enter retries. */
    protected showCommitFailure(): void {
        this.commitFailed = true;
        this.dropdownOpen = true;
        this.highlightIndex = -1;
        this.update();
    }

    /**
     * Activates a suggestion row through its url field, never its opaque
     * uri key: the key is a store identity (kept as the React list key
     * below), not an address any opener could route.
     */
    protected commitRow = async (row: TabQueryRow): Promise<void> => {
        const url = row.url;
        this.committedAddress = url;
        this.inputValue = url;
        this.commitFailed = false;
        this.closeDropdown();
        this.update();
        try {
            await this.openCommittedUrl(url);
        } catch {
            this.showCommitFailure();
        }
    };

    /**
     * Commits typed text by scheme, inventing no search addressability:
     * text already carrying http or https goes to the web-tab route as-is;
     * host-like text (no spaces, no scheme, containing a dot) is normalized
     * with an https prefix onto the same route; anything else is not an
     * address this tree can visit, so it surfaces the contracted in-bar
     * failure row instead of a file-scheme editor open, and no search-engine
     * host is minted anywhere (non-address text stays local). Empty commits
     * are no-ops.
     */
    protected commitText = async (raw: string): Promise<void> => {
        const text = raw.trim();
        if (!text) {
            return;
        }
        this.committedAddress = text;
        this.inputValue = text;
        this.commitFailed = false;
        this.closeDropdown();
        this.update();
        const target = typedAddressTargetOf(text);
        if (!target) {
            this.showCommitFailure();
            return;
        }
        try {
            await this.openCommittedUrl(target);
        } catch {
            this.showCommitFailure();
        }
    };

    protected onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!this.dropdownOpen || this.rows.length === 0) {
                return;
            }
            const step = e.key === 'ArrowDown' ? 1 : -1;
            const next = this.highlightIndex + step;
            this.highlightIndex = (next + this.rows.length) % this.rows.length;
            this.update();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.commitFailed) {
                // Retry affordance: Enter re-commits the typed text.
                this.commitFailed = false;
                void this.commitText(this.inputValue);
                return;
            }
            const highlighted = this.highlightIndex >= 0 ? this.rows[this.highlightIndex] : undefined;
            if (highlighted) {
                void this.commitRow(highlighted);
            } else {
                void this.commitText(this.inputValue);
            }
        } else if (e.key === 'Escape') {
            // Two-stage dismissal: first press closes the dropdown, second
            // restores the committed address.
            if (this.dropdownOpen) {
                this.closeDropdown();
                this.update();
            } else {
                this.inputValue = this.committedAddress;
                this.update();
            }
        }
    };

    protected onInputBlur = (): void => {
        this.closeDropdown();
        this.update();
    };

    /**
     * The address the pill shows for a widget (UI-SPEC "The address pill,
     * bound to the active tab"): a web tab's live page URL when it has one;
     * any other tab's registry URI string; the empty string for a page-less
     * web tab, a widget with no registry URI, or no widget at all. The
     * empty-page URL, factory ids and tab counters never reach here.
     */
    protected addressOf(widget: Widget | undefined): string {
        if (!widget) {
            return '';
        }
        if (widget instanceof WebTabWidget) {
            return widget.hasPage ? widget.url : '';
        }
        // Editors are Theia Navigatables addressed by their own resource
        // URI (docs/URI-SCHEMES.md), not registry rows -- fall back to it so
        // a file tab shows its path (found live 2026-09-07: empty pill).
        return this.tabUris.uriOf(widget)?.toString(true)
            ?? NavigatableWidget.getUri(widget)?.toString(true)
            ?? '';
    }

    /**
     * Re-derives the pill from a widget, unless the user is typing: while
     * the input has focus AND carries an uncommitted edit, neither a tab
     * change nor a state push overwrites it (the carried two-stage Esc
     * restores the committed address). Focus alone is not the guard: after
     * Enter the input keeps focus and the value equals the committed text,
     * and that is exactly when chrome's canonical URL must replace it.
     */
    protected syncAddressFromWidget(widget: Widget | undefined): void {
        const input = this.pillRef?.querySelector('input');
        if (input && document.activeElement === input && this.inputValue !== this.committedAddress) {
            return;
        }
        const address = this.addressOf(widget);
        this.inputValue = address;
        this.committedAddress = address;
        this.commitFailed = false;
        this.update();
    }

    /**
     * Current-widget change from the contribution: follows the new widget's
     * state pushes when it is a web tab (dropping the previous
     * subscription), then syncs the pill and re-renders nav enablement.
     */
    onCurrentWidgetChanged(widget: Widget | undefined): void {
        this.stateSubscription?.dispose();
        this.stateSubscription = undefined;
        if (widget instanceof WebTabWidget) {
            this.stateSubscription = widget.onDidChangeState(() => {
                this.syncAddressFromWidget(widget);
                this.update();
            });
        }
        this.syncAddressFromWidget(widget);
        this.update();
    }

    /**
     * The MAIN-AREA tab count, and only that. `allTabBars` is
     * mainAreaTabBars plus bottomAreaTabBars plus the left and right panel
     * tab bars, so counting it folded in exactly the surfaces a mode switch
     * is contracted to change: Browsing and Organising collapse all three
     * side areas, Coding expands the left one. The before/after comparison
     * in selectMode was therefore false-red by construction -- it reported
     * the contracted panel reshape as a broken tabs invariant on every
     * switch, which is permanent noise in the one log used to diagnose a
     * real tab loss.
     *
     * The organising placeholder is excluded one hop further down for the
     * same reason: the Organising slot opens exactly one main-area widget on
     * entry and closes it on exit, so counting it would move the number by
     * one on each of the two switches that cross the Organising boundary --
     * again a contracted change, not a lost tab.
     */
    protected countTabs(): number {
        return this.shell.mainAreaTabBars.reduce(
            (total, tabBar) => total + tabBar.titles.filter(title => title.owner.id !== OrganisingWidget.ID).length,
            0
        );
    }

    /**
     * The tab-count chip: a plain count published to the status bar,
     * asserting the tabs invariant on every switch. The toggle below is
     * selection state only with shell consequences deferred, so before and
     * after must agree -- a mismatch is logged, never thrown, and the
     * switch still lands.
     */
    publishTabCount(): void {
        this.tabCount = this.countTabs();
        // Handled, never floating: a rejection during teardown is noise in
        // exactly the logs used for diagnosis.
        void this.statusBar.setElement('powerbrowser.chrome-bar.tab-count', {
            text: `${this.tabCount} tabs`,
            alignment: StatusBarAlignment.RIGHT,
        }).catch(() => undefined);
        this.update();
    }

    /**
     * Segment selection activates the matching shipped mode through the
     * imported mode command const -- the identical channel selectCustomMode
     * uses below, never a re-spelled string.
     *
     * The three shipped segments used to call the stock perspective service
     * directly, one hop shallower, and that was the whole reason a shipped
     * mode reshaped nothing: the contracted per-mode panel map, the panel
     * expand/collapse flags, and the organising slot all live behind the
     * mode command, so a direct stock switch skipped every one of them.
     * Coding switched perspective and then showed no Theia view. Custom rows
     * never had the bug because they always routed through the command.
     *
     * The toggle stays selection state only: the segment is set and the chip
     * re-asserted even when activation throws, and a tab-count mismatch is
     * logged, never thrown. Segment labels map to mode ids by lowercasing --
     * the shipped-mode defaults gate asserts that rule, so a label that stops
     * mapping fails the gate instead of silently switching nothing. The
     * repaint path is unchanged: the stock perspective event still fires at
     * the end of the switch (one hop deeper now, inside the command), and
     * the contribution's onDidChangePerspective subscription re-asserts the
     * toggle and the chip from it.
     */
    protected selectMode = (next: string) => async (): Promise<void> => {
        if (this.mode === next && this.activeCustomId === undefined) {
            return;
        }
        const before = this.countTabs();
        this.mode = next;
        this.activeCustomId = undefined;
        try {
            await this.commands.executeCommand(MODES_ACTIVATE_COMMAND_ID, next.toLowerCase());
        } catch (error) {
            console.error('[@powerbrowser/chrome-bar] mode activation failed:', next, error);
        }
        const after = this.countTabs();
        if (before !== after) {
            console.error(
                `[@powerbrowser/chrome-bar] tabs invariant broken by a mode switch: ${before} tabs before, ${after} after`
            );
        }
        this.publishTabCount();
    };

    /**
     * GUI-07 (14-02): custom-mode activation routes through the imported mode
     * command const (never a re-spelled string) so panel flags, the
     * placeholder slot, and the chip re-assert run the same switch path as
     * shipped segments. The stock perspective event repaints the toggle.
     */
    protected selectCustomMode = (id: string) => async (): Promise<void> => {
        try {
            await this.commands.executeCommand(MODES_ACTIVATE_COMMAND_ID, id);
        } catch (error) {
            console.error('[@powerbrowser/chrome-bar] custom mode activation failed:', id, error);
        }
        this.update();
    };

    protected refreshCustomModes(): void {
        let customs: Array<{ id: string; name: string }> = [];
        try {
            customs = this.modes.getCustomModes();
        } catch {
            customs = [];
        }
        this.customModes = customs;
        if (this.activeCustomId !== undefined && !customs.some(row => row.id === this.activeCustomId)) {
            this.activeCustomId = undefined;
        }
    }

    /**
     * Stock perspective changes from anywhere else (commands, palette,
     * layout restore) re-assert the toggle and the chip. Unknown ids leave
     * the shipped selection untouched and still re-assert the count.
     */
    syncModeFromPerspective(id: string): void {
        this.refreshCustomModes();
        const label = ChromeBarWidget.MODES.find(candidate => candidate.toLowerCase() === id);
        if (label !== undefined) {
            this.mode = label;
            this.activeCustomId = undefined;
        } else if (this.modes.hasCustomMode(id)) {
            this.activeCustomId = id;
        } else {
            this.activeCustomId = undefined;
        }
        this.publishTabCount();
    }

    protected renderDropdown(): React.ReactNode {
        if (!this.dropdownOpen) {
            return undefined;
        }
        const body = this.dropdownBody();
        // Body portal: the bar lives under a PerfectScrollbar `.ps` wrapper
        // with overflow hidden, which clips any in-tree dropdown at the
        // 40px bar edge (rows render in DOM but are neither visible nor
        // hittable). Portalling to body with fixed geometry escapes the
        // clipping ancestor; no ancestor carries transform/filter, so fixed
        // positions against the viewport. Geometry re-derives on every
        // render (each keystroke re-renders) plus on window resize.
        const pill = this.pillRef?.getBoundingClientRect();
        const style: React.CSSProperties | undefined = pill ? {
            position: 'fixed',
            top: Math.round(pill.bottom + 4),
            left: Math.round(pill.left),
            width: Math.round(pill.width),
        } : undefined;
        return createPortal(
            <div className='pb-chrome-bar-dropdown' role='listbox' aria-label='Suggestions' style={style}>
                {body}
            </div>,
            document.body
        );
    }

    protected dropdownBody(): React.ReactNode {
        if (this.commitFailed) {
            return <>
                <div className='pb-chrome-bar-row'>Power Browser couldn&apos;t open that address. Press Enter to try again.</div>
                <div className='pb-chrome-bar-dropdown-footer'>Enter opens the address · Esc closes suggestions</div>
            </>;
        }
        return <>
            {this.providerFailed ? (
                <div className='pb-chrome-bar-row'>Power Browser couldn&apos;t load suggestions. Press Enter to visit what you typed.</div>
            ) : this.rows.length === 0 && !this.shimmer ? (
                <div className='pb-chrome-bar-row'>
                    <div className='pb-chrome-bar-row-title'>No suggestions</div>
                    <div className='pb-chrome-bar-row-caption'>No matches for what you typed — press Enter to visit it as an address.</div>
                </div>
            ) : (
                this.rows.map((row, index) => (
                    <div
                        key={row.uri}
                        role='option'
                        aria-selected={index === this.highlightIndex}
                        className={'pb-chrome-bar-row' + (index === this.highlightIndex ? ' is-highlighted' : '')}
                        onMouseDown={e => {
                            e.preventDefault();
                            void this.commitRow(row);
                        }}
                    >
                        <div className='pb-chrome-bar-row-title' title={row.title}>{row.title}</div>
                        <div className='pb-chrome-bar-row-caption' title={row.url}>{row.url}</div>
                    </div>
                ))
            )}
            {this.shimmer && <div className='pb-chrome-bar-row is-shimmer' aria-hidden='true' />}
            <div className='pb-chrome-bar-dropdown-footer'>Enter opens the address · Esc closes suggestions</div>
        </>;
    }

    protected render(): React.ReactNode {
        // One shared navigable-tab predicate (GUI-02-owned) narrowed by the
        // active web tab's last state push: all three controls dim with
        // their contracted tooltips retained and the layout never shifts.
        const canNavigate = chromeBarHasNavigableTab();
        const tab = currentWebTab();
        const secure = this.inputValue.trim().startsWith('https://');
        return <div className='pb-chrome-bar'>
            <button
                className='pb-chrome-bar-button'
                title='Back'
                aria-label='Back'
                disabled={!canNavigate || !tab?.canGoBack}
                onClick={this.runCommand(CHROME_BAR_BACK_COMMAND_ID)}
            >
                <span className='codicon codicon-chevron-left' />
            </button>
            <button
                className='pb-chrome-bar-button'
                title='Forward'
                aria-label='Forward'
                disabled={!canNavigate || !tab?.canGoForward}
                onClick={this.runCommand(CHROME_BAR_FORWARD_COMMAND_ID)}
            >
                <span className='codicon codicon-chevron-right' />
            </button>
            <button
                className='pb-chrome-bar-button'
                title='Reload'
                aria-label='Reload'
                disabled={!canNavigate || !tab?.canReload}
                onClick={this.runCommand(CHROME_BAR_RELOAD_COMMAND_ID)}
            >
                <span className='codicon codicon-refresh' />
            </button>
            <div className='pb-chrome-bar-pill' ref={el => { this.pillRef = el; }}>
                {secure && <span className='codicon codicon-lock pb-chrome-bar-lock' aria-hidden='true' />}
                <input
                    className={CHROME_BAR_INPUT_CLASS}
                    placeholder='Search or enter address'
                    aria-label='Search or enter address'
                    spellCheck={false}
                    value={this.inputValue}
                    onChange={this.onInputChange}
                    onKeyDown={this.onInputKeyDown}
                    onBlur={this.onInputBlur}
                />
            </div>
            {this.renderDropdown()}
            <button
                className='pb-chrome-bar-button'
                title='New Tab'
                aria-label='New Tab'
                onClick={this.runCommand(CHROME_BAR_NEW_TAB_COMMAND_ID)}
            >
                <span className='codicon codicon-plus' />
            </button>
            <div className='pb-chrome-bar-toggle' role='group' aria-label='Mode'>
                {ChromeBarWidget.MODES.map(name => (
                    <button
                        key={name}
                        type='button'
                        className={'pb-chrome-bar-segment' + (this.mode === name && this.activeCustomId === undefined ? ' is-active' : '')}
                        aria-pressed={this.mode === name && this.activeCustomId === undefined}
                        onClick={this.selectMode(name)}
                    >
                        {name}
                    </button>
                ))}
                {this.customModes.length > 0 && (
                    <div className='pb-modes-custom-menu'>
                        {this.customModes.map(row => (
                            <button
                                key={row.id}
                                type='button'
                                className={'pb-chrome-bar-segment pb-modes-custom-row' + (this.activeCustomId === row.id ? ' is-active' : '')}
                                aria-pressed={this.activeCustomId === row.id}
                                title={row.name}
                                onClick={this.selectCustomMode(row.id)}
                            >
                                {row.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <span className='pb-chrome-bar-tab-count' aria-label={`${this.tabCount} tabs`}>{this.tabCount}</span>
        </div>;
    }
}

@injectable()
export class ChromeBarContribution implements FrontendApplicationContribution {

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(ChromeBarWidget)
    protected readonly barWidget: ChromeBarWidget;

    @inject(PerspectiveService)
    protected readonly perspectives: PerspectiveService;

    /** GUI-02: the frontend end of the web-tab bridge, for chrome's reserved accel+L. */
    @inject(WebTabChannel)
    protected readonly webTabs: WebTabChannel;

    /**
     * One current-widget sync for the subscription and the startup seed:
     * the shared navigable-tab predicate, the pill's address and the chip
     * all follow the shell's current widget.
     */
    protected syncCurrentWidget(widget: Widget | undefined): void {
        setCurrentWebTab(widget);
        this.barWidget.onCurrentWidgetChanged(widget);
        this.barWidget.publishTabCount();
    }

    async onStart(): Promise<void> {
        if (!this.shell.getWidgetById(ChromeBarWidget.ID)) {
            await this.shell.addWidget(this.barWidget, { area: 'top' });
        }
        this.perspectives.onDidChangePerspective(id => {
            this.barWidget.syncModeFromPerspective(id);
        });
        // The toggle's opening selection is the LIVE perspective, never the
        // first shipped label. Mode activation and this contribution are both
        // FrontendApplicationContributions with no ordering guarantee between
        // them, so a perspective activated before this subscription fires no
        // event we can hear -- and the toggle would keep asserting Coding
        // while the shell sat in the Browsing launch default. That
        // disagreement was not cosmetic: activateMode() early-returns when the
        // requested mode is already selected, so clicking the segment the
        // toggle already claimed was a no-op and Coding was unreachable until
        // the user round-tripped through another mode.
        const activePerspective = this.perspectives.getActivePerspectiveId();
        if (activePerspective !== undefined) {
            this.barWidget.syncModeFromPerspective(activePerspective);
        }
        // Live chip: republish on every shell add, remove, and
        // current-change so the count never goes stale between mode
        // switches (no mode switch required).
        this.shell.onDidAddWidget(() => this.barWidget.publishTabCount());
        this.shell.onDidRemoveWidget(() => this.barWidget.publishTabCount());
        // GUI-02: the SELECTED MAIN-AREA TAB drives the navigable-tab
        // predicate and the pill -- the dock's current title, not the
        // focus-derived shell.currentWidget. A web tab's body is covered by
        // the chrome overlay, so its placeholder node never receives DOM
        // focus in real use ("+" focuses the pill, a click lands in the
        // overlay): keyed on focus, the bar never subscribed to the tab's
        // state pushes and the pill stayed on the typed text (found live
        // 2026-09-07). Seeded once because an activation can precede this
        // subscription (the perspective seed above exists for the same
        // ordering hazard).
        this.shell.mainPanel.onDidChangeCurrent(title => this.syncCurrentWidget(title?.owner));
        this.syncCurrentWidget(this.shell.mainPanel.currentTitle?.owner);
        this.shell.onDidChangeCurrentWidget(() => this.barWidget.publishTabCount());
        // The landing half of chrome's reserved accel+L: from inside a page
        // the shell key asks the frontend to focus the address, the channel
        // re-emits it here, and the pill takes focus with its content
        // selected -- the same result as the in-Theia keybinding.
        this.webTabs.onDidRequestFocusAddress(() => focusAddressPill());
        // The portalled dropdown positions against the viewport, so a
        // window resize re-derives its geometry while open.
        window.addEventListener('resize', () => this.barWidget.repositionDropdown());
        this.barWidget.publishTabCount();
    }
}
