import * as React from '@theia/core/shared/react';
import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    FrontendApplicationContribution,
    OpenerService,
    ReactWidget,
    StatusBar,
    StatusBarAlignment,
} from '@theia/core/lib/browser';
import { CommandRegistry } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { NavigationLocationService } from '@theia/editor/lib/browser/navigation/navigation-location-service';
import pDebounce from 'p-debounce';
import { TabQueryRow } from '@powerbrowser/tab-uris/lib/node/tab-query-service';
import {
    CHROME_BAR_BACK_COMMAND_ID,
    CHROME_BAR_FORWARD_COMMAND_ID,
    CHROME_BAR_INPUT_CLASS,
    CHROME_BAR_NEW_TAB_COMMAND_ID,
    CHROME_BAR_RELOAD_COMMAND_ID,
} from './chrome-bar-commands';
import { CHROME_SUGGESTION_LIMIT, ChromeBarSuggestionService } from './chrome-bar-suggestion-service';
import './chrome-bar.css';

/**
 * GUI-06 (13-03): the chrome bar widget -- nav buttons, address pill with
 * suggestions, new-tab, mode toggle, and tab-count chip.
 *
 * A React contribution added once at startup to the top shell area -- the
 * plain Lumino panel above the main dock, so no core patch and no dock
 * surgery (13-RESEARCH.md Pattern 1). Structural class hooks below are the
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
 * switch (T-13-03-04); blocked popups keep the existing throw path with no
 * new dialog authored (T-13-03-05).
 *
 * No chrome-side command is registered and nothing opens at startup: the
 * bar only issues commands through the registry on user gestures (a
 * startup-opened window would break the stock chrome per the candidate-A
 * constraint).
 */
export class ChromeBarWidget extends ReactWidget {

    static readonly ID = 'powerbrowser.chrome-bar';

    /** The three shipped mode defaults, in contracted order. */
    static readonly MODES = ['Coding', 'Browsing', 'Organising'];

    @inject(CommandRegistry)
    protected readonly commands: CommandRegistry;

    @inject(NavigationLocationService)
    protected readonly navigation: NavigationLocationService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    @inject(ChromeBarSuggestionService)
    protected readonly suggestions: ChromeBarSuggestionService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    protected inputValue = '';
    protected committedAddress = '';
    protected rows: TabQueryRow[] = [];
    protected dropdownOpen = false;
    protected highlightIndex = -1;
    protected providerFailed = false;
    protected shimmer = false;
    protected mode = ChromeBarWidget.MODES[0];
    protected tabCount = 0;
    protected querySeq = 0;

    /** Debounced pill queries over the RPC proxy (in-tree p-debounce pin, 150ms precedent). */
    protected readonly debouncedQuery = pDebounce((prefix: string) => this.runQuery(prefix), 150);

    constructor() {
        super();
        this.id = ChromeBarWidget.ID;
        this.title.label = 'Chrome Bar';
        this.title.caption = 'Chrome Bar';
        this.title.closable = false;
    }

    protected runCommand = (id: string) => async (): Promise<void> => {
        await this.commands.executeCommand(id);
        this.update();
    };

    protected async runQuery(prefix: string): Promise<void> {
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
        this.update();
        void this.debouncedQuery(this.inputValue);
    };

    /**
     * Commits text through the existing opener routing -- the bar never
     * invents an addressability scheme. Empty commits are no-ops; provider
     * failure degrades to this same plain commit (Enter always works).
     * Navigation failures surface in the stock surfaces -- no replacement
     * error UI is authored here.
     */
    protected commitAddress = async (raw: string): Promise<void> => {
        const text = raw.trim();
        if (!text) {
            return;
        }
        this.committedAddress = text;
        this.inputValue = text;
        this.dropdownOpen = false;
        this.highlightIndex = -1;
        this.update();
        try {
            // The opener-service routing (mirrors the `open()` helper's own
            // two steps: highest-priority handler, then its open) -- the
            // existing tab-URI handlers decide, never a new scheme here.
            const uri = new URI(text);
            const handler = await this.openerService.getOpener(uri);
            await handler.open(uri);
        } catch (error) {
            console.error('[@powerbrowser/chrome-bar] address commit failed:', error);
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
            const highlighted = this.highlightIndex >= 0 ? this.rows[this.highlightIndex] : undefined;
            void this.commitAddress(highlighted ? highlighted.uri : this.inputValue);
        } else if (e.key === 'Escape') {
            // Two-stage dismissal: first press closes the dropdown, second
            // restores the committed address.
            if (this.dropdownOpen) {
                this.dropdownOpen = false;
                this.highlightIndex = -1;
                this.update();
            } else {
                this.inputValue = this.committedAddress;
                this.update();
            }
        }
    };

    protected onInputBlur = (): void => {
        this.dropdownOpen = false;
        this.highlightIndex = -1;
        this.update();
    };

    protected countTabs(): number {
        return this.shell.allTabBars.reduce((total, tabBar) => total + tabBar.titles.length, 0);
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
        void this.statusBar.setElement('powerbrowser.chrome-bar.tab-count', {
            text: `${this.tabCount} tabs`,
            alignment: StatusBarAlignment.RIGHT,
        });
        this.update();
    }

    protected selectMode = (next: string) => (): void => {
        if (this.mode === next) {
            return;
        }
        const before = this.countTabs();
        this.mode = next;
        const after = this.countTabs();
        if (before !== after) {
            console.error(
                `[@powerbrowser/chrome-bar] tabs invariant broken by a mode switch: ${before} tabs before, ${after} after`
            );
        }
        this.publishTabCount();
    };

    protected renderDropdown(): React.ReactNode {
        if (!this.dropdownOpen) {
            return undefined;
        }
        return <div className='pb-chrome-bar-dropdown' role='listbox' aria-label='Suggestions'>
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
                            void this.commitAddress(row.uri);
                        }}
                    >
                        <div className='pb-chrome-bar-row-title' title={row.title}>{row.title}</div>
                        <div className='pb-chrome-bar-row-caption' title={row.url}>{row.url}</div>
                    </div>
                ))
            )}
            {this.shimmer && <div className='pb-chrome-bar-row is-shimmer' aria-hidden='true' />}
            <div className='pb-chrome-bar-dropdown-footer'>Enter opens the address · Esc closes suggestions</div>
        </div>;
    }

    protected render(): React.ReactNode {
        const canBack = this.navigation.canGoBack();
        const canForward = this.navigation.canGoForward();
        const secure = this.inputValue.trim().startsWith('https://');
        return <div className='pb-chrome-bar'>
            <button
                className='pb-chrome-bar-button'
                title='Back'
                aria-label='Back'
                disabled={!canBack}
                onClick={this.runCommand(CHROME_BAR_BACK_COMMAND_ID)}
            >
                <span className='codicon codicon-chevron-left' />
            </button>
            <button
                className='pb-chrome-bar-button'
                title='Forward'
                aria-label='Forward'
                disabled={!canForward}
                onClick={this.runCommand(CHROME_BAR_FORWARD_COMMAND_ID)}
            >
                <span className='codicon codicon-chevron-right' />
            </button>
            <button
                className='pb-chrome-bar-button'
                title='Reload'
                aria-label='Reload'
                disabled={true}
                onClick={this.runCommand(CHROME_BAR_RELOAD_COMMAND_ID)}
            >
                <span className='codicon codicon-refresh' />
            </button>
            <div className='pb-chrome-bar-pill'>
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
                        className={'pb-chrome-bar-segment' + (this.mode === name ? ' is-active' : '')}
                        aria-pressed={this.mode === name}
                        onClick={this.selectMode(name)}
                    >
                        {name}
                    </button>
                ))}
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

    async onStart(): Promise<void> {
        if (!this.shell.getWidgetById(ChromeBarWidget.ID)) {
            await this.shell.addWidget(this.barWidget, { area: 'top' });
        }
        this.barWidget.publishTabCount();
    }
}
