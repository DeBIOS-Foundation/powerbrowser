import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    FrontendApplicationContribution,
    OpenerService,
    StatusBar,
    StatusBarAlignment,
    Widget,
    open,
} from '@theia/core/lib/browser';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import { SecondaryWindowHandler, extractSecondaryWindow } from '@theia/core/lib/browser/secondary-window-handler';
import { ExtractableWidget } from '@theia/core/lib/browser/widgets/extractable-widget';
import { ConfirmDialog } from '@theia/core/lib/browser/dialogs';
import { QuickInputService } from '@theia/core/lib/common/quick-pick-service';
import URI from '@theia/core/lib/common/uri';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChangeType } from '@theia/filesystem/lib/common/files';
import { UserStorageUri } from '@theia/userstorage/lib/browser/user-storage-uri';
import { TabUriRegistry } from '@powerbrowser/tab-uris/lib/browser/tab-uri-registry';
import pDebounce from 'p-debounce';
import { SHIPPED_MODES } from './mode-descriptors';
import { ModeService } from './mode-service';

/**
 * GUI-09 (14-03): named setups as user-storage data owned entirely
 * Theia-side (14-RESEARCH.md Pattern 2 idiom, 14-PATTERNS.md section 3).
 *
 * Schema (resolves 14-RESEARCH.md Open Question 2, setups half): the store
 * file holds an object with a numeric version, a setups array whose rows
 * carry a name, a mode id, a windows array of verbatim rects with tab-URI
 * lists and an active tab, plus a saved timestamp, and a last-session
 * pointer naming the setup to auto-restore or null. Snapshots reference
 * opaque tab URIs so the bridge stays landable; setup tab-placement for
 * file tabs uses the editor resource URI the opener already resolves
 * (14-PROBE Constraint 3: the registry covers views and terminals only).
 *
 * Validation discipline (14-PATTERNS.md section 3): hand-rolled total
 * parsing -- unknown fields dropped, corrupt data degrading to the
 * contracted empty state, restore dropping unresolvable URIs with the
 * contracted explanation, geometry numbers validated before any move call
 * (T-14-03-01), failures leaving current windows and tabs untouched
 * (T-14-03-02). Lifecycle mirrors the customize precedent: absence is the
 * default and is never created; the first read runs fire-and-forget after
 * startup (boot-chain deadlock); later read failures keep last good;
 * DELETED resets immediately; other changes reload debounced.
 *
 * Restore (14-UI-SPEC.md named-setups section): geometry verbatim with
 * reachability clamping as the documented backstop (a rect no display can
 * contain is pulled into view, never stranded off-screen); tabs placed
 * through the contribution open path (the opener, which delegates to each
 * contribution's own options); gone tabs dropped with the contracted
 * variant explanation while geometry plus mode still complete; failure
 * leaving the session untouched with the contracted restore-failure error.
 * Delete is the only destructive action (contracted confirmation, no undo):
 * it clears the current marker and changes nothing on screen. Core-close
 * carries no confirmation: the last-session pointer auto-saves on shutdown
 * and the ready-ordered applicator re-applies it after core layout restore.
 */

/** Accepted store versions. Newer writers are read leniently: unknown fields drop. */
export const SETUPS_STORE_VERSION = 1;

/** Contracted name cap (14-UI-SPEC.md): pasted overflow is cut before commit. */
export const SETUP_NAME_MAX = 60;

/** User-storage file beside modes.json (never SQLite: single-writer rule). */
export const SETUPS_STORE_FILENAME = 'setups.json';

export interface SetupWindowSnapshot {
    x: number;
    y: number;
    width: number;
    height: number;
    tabs: string[];
    activeTab: string | null;
}

export interface SetupSnapshot {
    name: string;
    modeId: string;
    windows: SetupWindowSnapshot[];
    savedAt: string;
}

export interface SetupStoreShape {
    version: number;
    setups: SetupSnapshot[];
    lastSession: string | null;
}

/** Contracted save-dialog title (14-UI-SPEC.md, verbatim). */
export const SETUP_DIALOG_TITLE = 'Save Setup';

/** Contracted save-dialog name placeholder (14-UI-SPEC.md, verbatim). */
export const SETUP_NAME_PLACEHOLDER = 'Setup name';

/** Contracted empty-name error (14-UI-SPEC.md, verbatim): writes nothing. */
export const SETUP_EMPTY_NAME_ERROR = 'Give the setup a name — type a name and choose Save Setup.';

/** Contracted duplicate-name error (14-UI-SPEC.md, verbatim): no overwrite offer. */
export const SETUP_DUPLICATE_NAME_ERROR = 'A setup with this name already exists. Choose a different name, or delete the existing setup first.';

/** Contracted empty-list heading (14-UI-SPEC.md, verbatim). */
export const SETUPS_EMPTY_HEADING = 'No saved setups';

/** Contracted empty-list body (14-UI-SPEC.md, verbatim). */
export const SETUPS_EMPTY_BODY = 'Save the current windows, tabs, and mode as a setup to restore them later — choose Save Setup.';

/** Contracted restore-failure error (14-UI-SPEC.md, verbatim): session untouched. */
export const SETUP_RESTORE_FAILURE = 'Power Browser couldn\'t restore this setup. Your current windows and tabs are unchanged — try again, or delete the setup and save a new one.';

/**
 * Contracted gone-tabs variant (14-UI-SPEC.md): the restore still completes
 * on geometry plus mode with this explanation naming the dropped tabs as
 * "some tabs no longer exist" -- the row is never left half-applied with no
 * explanation.
 */
export const SETUP_GONE_TABS_NOTICE = 'Power Browser restored this setup, but some tabs no longer exist. Geometry and mode are applied.';

/**
 * Contracted unknown-mode fallback notice (14-UI-SPEC.md): stock
 * `switchPerspective` silently no-ops on unknown ids (never throws), so the
 * restore pre-validates against shipped + custom ids and falls back to
 * Browsing with this explanation instead of keeping a wrong mode silently.
 * The stored id is never interpolated: custom ids are internal identifiers.
 */
export const SETUP_MODE_FALLBACK_NOTICE = 'Power Browser restored this setup, but its saved mode is no longer available. Browsing is shown instead.';

/** Contracted saved confirmation shape: `Setup "<name>" saved.` */
export function setupSavedConfirmation(name: string): string {
    return `Setup "${name}" saved.`;
}

/** Contracted delete body shape: `Delete "<name>"? You can't undo this.` */
export function setupDeleteBody(name: string): string {
    return `Delete "${name}"? You can't undo this.`;
}

interface ParsedSetupStore {
    ok: boolean;
    setups: SetupSnapshot[];
    lastSession: string | null;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Total parse of one window row: rect numbers must be finite (validated
 * before any move call, T-14-03-01); tab lists keep strings only; anything
 * else degrades the row to null (dropped, never thrown).
 */
function parseSetupWindow(entry: unknown): SetupWindowSnapshot | null {
    if (typeof entry !== 'object' || entry === null) {
        return null;
    }
    const row = entry as Record<string, unknown>;
    if (!isFiniteNumber(row['x']) || !isFiniteNumber(row['y'])
        || !isFiniteNumber(row['width']) || !isFiniteNumber(row['height'])) {
        return null;
    }
    if (!Array.isArray(row['tabs'])) {
        return null;
    }
    const tabs = row['tabs'].filter((tab): tab is string => typeof tab === 'string' && tab.length > 0);
    const activeTab = typeof row['activeTab'] === 'string' && row['activeTab'].length > 0
        ? row['activeTab'] as string
        : null;
    return { x: row['x'], y: row['y'], width: row['width'], height: row['height'], tabs, activeTab };
}

/** Total parse of one setup row: nameless or windowless rows drop silently. */
function parseSetupRow(entry: unknown): SetupSnapshot | null {
    if (typeof entry !== 'object' || entry === null) {
        return null;
    }
    const row = entry as Record<string, unknown>;
    if (typeof row['name'] !== 'string') {
        return null;
    }
    const name = (row['name'] as string).trim().slice(0, SETUP_NAME_MAX);
    if (!name || typeof row['modeId'] !== 'string' || !Array.isArray(row['windows'])) {
        return null;
    }
    const windows: SetupWindowSnapshot[] = [];
    for (const windowEntry of row['windows'] as unknown[]) {
        const parsed = parseSetupWindow(windowEntry);
        if (parsed) {
            windows.push(parsed);
        }
    }
    if (windows.length === 0) {
        return null;
    }
    const savedAt = typeof row['savedAt'] === 'string' ? row['savedAt'] as string : new Date(0).toISOString();
    return { name, modeId: row['modeId'] as string, windows, savedAt };
}

/**
 * Total parse of the setups file: never throws, always produces a value.
 * Whole-file failure (unparseable, not an object, non-numeric version,
 * non-array setups) reports ok:false and the caller degrades to the
 * contracted empty state.
 */
function parseSetupStore(raw: string): ParsedSetupStore {
    const empty: ParsedSetupStore = { ok: false, setups: [], lastSession: null };
    let top: unknown;
    try {
        top = JSON.parse(raw);
    } catch {
        return empty;
    }
    if (typeof top !== 'object' || top === null) {
        return empty;
    }
    const record = top as Record<string, unknown>;
    if (typeof record['version'] !== 'number' || !Array.isArray(record['setups'])) {
        return empty;
    }
    const setups: SetupSnapshot[] = [];
    const seen = new Set<string>();
    for (const entry of record['setups'] as unknown[]) {
        const parsed = parseSetupRow(entry);
        if (!parsed || seen.has(parsed.name.toLowerCase())) {
            continue;
        }
        seen.add(parsed.name.toLowerCase());
        setups.push(parsed);
    }
    const lastSession = typeof record['lastSession'] === 'string' ? record['lastSession'] as string : null;
    return { ok: true, setups, lastSession };
}

/**
 * Reachability clamp (documented backstop, 14-RESEARCH.md Pitfall 5): the
 * contract restores verbatim, but a rect no display can contain (stored
 * display gone) is pulled into view so dependents never strand off-screen.
 * A fully reachable rect passes through untouched.
 */
export function clampRectForDisplay(rect: { x: number; y: number; width: number; height: number }): { x: number; y: number; width: number; height: number } {
    const availWidth = window.screen?.availWidth ?? 1280;
    const availHeight = window.screen?.availHeight ?? 800;
    const width = Math.min(Math.max(Math.round(rect.width), 200), Math.max(availWidth, 200));
    const height = Math.min(Math.max(Math.round(rect.height), 150), Math.max(availHeight, 150));
    let x = Math.round(rect.x);
    let y = Math.round(rect.y);
    if (!Number.isFinite(x) || x + width < 100 || x > availWidth - 100) {
        x = Math.max(0, Math.min(100, availWidth - width));
    }
    if (!Number.isFinite(y) || y + height < 50 || y > availHeight - 50) {
        y = Math.max(0, Math.min(80, availHeight - height));
    }
    return { x, y, width, height };
}

/** Row meta contract: "{Mode} · {N} window(s) · {M} tab(s)", singular/plural exact. */
export function setupRowMeta(modeLabel: string, windows: number, tabs: number): string {
    const windowWord = windows === 1 ? 'window' : 'windows';
    const tabWord = tabs === 1 ? 'tab' : 'tabs';
    return `${modeLabel} · ${windows} ${windowWord} · ${tabs} ${tabWord}`;
}

@injectable()
export class SetupsService implements FrontendApplicationContribution {

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(PerspectiveService)
    protected readonly perspectives: PerspectiveService;

    @inject(ModeService)
    protected readonly modes: ModeService;

    @inject(OpenerService)
    protected readonly opener: OpenerService;

    @inject(TabUriRegistry)
    protected readonly tabUris: TabUriRegistry;

    @inject(SecondaryWindowHandler)
    protected readonly secondaryWindows: SecondaryWindowHandler;

    @inject(FrontendApplicationStateService)
    protected readonly stateService: FrontendApplicationStateService;

    @inject(QuickInputService)
    protected readonly quickInput: QuickInputService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    protected readonly setupsUri = UserStorageUri.resolve(SETUPS_STORE_FILENAME);
    protected readonly debouncedReload = pDebounce(() => this.reloadSetups(), 150);
    protected lastGoodSetups: SetupSnapshot[] = [];
    protected currentSetup: string | null = null;
    protected secondaryByWidget = new Map<string, Window>();

    onStart(): void {
        // Fire-and-forget: awaiting this read here re-enters the boot-chain
        // deadlock documented in the customize-css header.
        void this.loadSetups();
        // Track dependent windows for geometry snapshots (the Window rides
        // the add event; close handling lives in the dependents
        // contribution, which owns focus return and the closed state).
        this.secondaryWindows.onDidAddWidget(([widget, win]) => {
            this.secondaryByWidget.set(widget.id, win);
        });
        this.secondaryWindows.onDidRemoveWidget(([widget]) => {
            this.secondaryByWidget.delete(widget.id);
        });
        // Ready-ordered applicator: runs after core layout restore, so the
        // last-session pointer re-applies onto the restored shell with no
        // race (14-RESEARCH.md Pattern 1 ordering).
        void this.stateService.reachedState('ready').then(() => this.applyLastSession());
        this.fileService.onDidFilesChange(event => {
            // A DELETED change is a deliberate absence: reset immediately,
            // bypassing the keep-last-good guard (same shape as customize).
            if (event.contains(this.setupsUri, FileChangeType.DELETED)) {
                this.handleStoreDeleted();
                return;
            }
            if (event.contains(this.setupsUri)) {
                void this.debouncedReload();
            }
        });
    }

    onStop(): void {
        // Auto-save the last-session pointer on shutdown so relaunch
        // restores automatically with no core-close confirmation.
        void this.persistLastSession(this.currentSetup);
    }

    /** Save the current windows, tabs, and mode under a typed name. */
    async saveCurrentAsSetup(): Promise<void> {
        const answer = await this.quickInput.input({ prompt: SETUP_DIALOG_TITLE, placeHolder: SETUP_NAME_PLACEHOLDER });
        if (answer === undefined) {
            return;
        }
        const name = answer.trim().slice(0, SETUP_NAME_MAX);
        if (!name) {
            void this.flash(SETUP_EMPTY_NAME_ERROR);
            return;
        }
        if (this.isDuplicateName(name)) {
            void this.flash(SETUP_DUPLICATE_NAME_ERROR);
            return;
        }
        const row: SetupSnapshot = {
            name,
            modeId: this.currentModeId(),
            windows: this.snapshotWindows(),
            savedAt: new Date().toISOString(),
        };
        const setups = [...this.lastGoodSetups, row];
        try {
            // One file-service write: atomic from the reader's view, never a
            // truncate-then-read-your-own-write.
            await this.fileService.write(this.setupsUri, JSON.stringify({ version: SETUPS_STORE_VERSION, setups, lastSession: name }, undefined, 2));
        } catch {
            void this.flash(SETUP_RESTORE_FAILURE);
            return;
        }
        this.lastGoodSetups = setups;
        this.currentSetup = name;
        void this.flash(setupSavedConfirmation(name));
    }

    /**
     * Restore a setup by name (or pick from the list when omitted): geometry
     * verbatim with reachability clamping, tabs through the contribution
     * open path with unresolvable URIs dropped, then the stored mode.
     * Completes on geometry plus mode with the contracted variant
     * explanation when tabs are gone; on failure the session is untouched
     * with the contracted restore-failure error.
     */
    async restoreSetup(name?: string): Promise<void> {
        const target = name ?? await this.pickSetup('Restore Setup');
        if (target === undefined) {
            return;
        }
        const row = this.lastGoodSetups.find(setup => setup.name === target);
        if (!row) {
            void this.flash(SETUP_RESTORE_FAILURE);
            return;
        }
        // Validate everything before touching the session: a row that cannot
        // restore must leave current windows and tabs untouched.
        if (row.windows.length === 0) {
            void this.flash(SETUP_RESTORE_FAILURE);
            return;
        }
        this.applyGeometry(row.windows[0]);
        const dropped = await this.placeTabs(row);
        // Stock `switchPerspective` silently no-ops on unknown ids (never
        // throws), so pre-validate against shipped + custom ids: an unknown
        // mode falls back to Browsing with the contracted notice instead of
        // silently keeping whatever mode was active.
        const knownCustom = this.modes.getCustomModes().some(custom => custom.id === row.modeId);
        const known = SHIPPED_MODES.some(descriptor => descriptor.id === row.modeId) || knownCustom;
        try {
            await this.perspectives.switchPerspective(known ? row.modeId : 'browsing');
        } catch {
            try {
                await this.perspectives.switchPerspective('browsing');
            } catch {
                // Stock switch failed twice: geometry and tabs still stand.
            }
        }
        this.currentSetup = row.name;
        void this.persistLastSession(row.name);
        if (dropped > 0) {
            void this.flash(SETUP_GONE_TABS_NOTICE);
        }
        if (!known) {
            void this.flash(SETUP_MODE_FALLBACK_NOTICE);
        }
    }

    /** Delete a setup: the ONLY destructive action -- contracted confirmation, no undo. */
    async deleteSetup(): Promise<void> {
        const target = await this.pickSetup('Delete Setup');
        if (target === undefined) {
            return;
        }
        const row = this.lastGoodSetups.find(setup => setup.name === target);
        if (!row) {
            return;
        }
        const confirmed = await new ConfirmDialog({
            title: 'Delete Setup',
            msg: setupDeleteBody(row.name),
            ok: 'Delete',
            cancel: 'Cancel',
        }).open();
        if (!confirmed) {
            return;
        }
        const setups = this.lastGoodSetups.filter(setup => setup.name !== row.name);
        try {
            await this.fileService.write(this.setupsUri, JSON.stringify({
                version: SETUPS_STORE_VERSION,
                setups,
                lastSession: this.currentSetup === row.name ? null : this.currentSetup,
            }, undefined, 2));
        } catch {
            void this.flash(SETUP_RESTORE_FAILURE);
            return;
        }
        this.lastGoodSetups = setups;
        // Deleting the current setup clears the current marker while
        // changing nothing on screen.
        if (this.currentSetup === row.name) {
            this.currentSetup = null;
        }
    }

    /**
     * Open a dependent window hosting one tab-content widget through the
     * stock secondary-window handler (14-PROBE verdict GREEN). Defaults to
     * the active widget; reuses the blocked path voice with no new dialog.
     */
    async openDependent(widgetId?: string): Promise<void> {
        const widget = widgetId !== undefined ? this.findWidget(widgetId) : this.shell.activeWidget;
        if (!widget || !ExtractableWidget.is(widget)) {
            throw new Error(
                'powerbrowser.setups.open-dependent: this tab cannot open in a dependent window -- ' +
                'choose a tab with hosted content (a terminal or an editor) and invoke the command again from the command palette'
            );
        }
        this.secondaryWindows.moveWidgetToSecondaryWindow(widget);
    }

    /** Rows for the list surface: name over the contracted meta line, current marked. */
    listRows(): Array<{ name: string; meta: string; current: boolean }> {
        return this.lastGoodSetups.map(row => ({
            name: row.name,
            meta: setupRowMeta(this.modeLabelFor(row.modeId), row.windows.length, row.windows.reduce((total, win) => total + win.tabs.length, 0)),
            current: this.currentSetup === row.name,
        }));
    }

    /** Snapshot the core window plus tracked dependents, rects verbatim. */
    protected snapshotWindows(): SetupWindowSnapshot[] {
        const coreTabs = this.tabsOfShell();
        const active = this.shell.activeWidget?.id;
        const core: SetupWindowSnapshot = {
            x: window.screenX,
            y: window.screenY,
            width: window.outerWidth,
            height: window.outerHeight,
            tabs: coreTabs.map(entry => entry.uri),
            activeTab: coreTabs.some(entry => entry.id === active) ? (coreTabs.find(entry => entry.id === active)?.uri ?? null) : null,
        };
        const dependents: SetupWindowSnapshot[] = [];
        for (const widget of this.secondaryWindows.widgets) {
            const win = this.secondaryByWidget.get(widget.id);
            const uri = this.tabUriOf(widget);
            dependents.push({
                x: win?.screenX ?? window.screenX,
                y: win?.screenY ?? window.screenY,
                width: win?.outerWidth ?? 800,
                height: win?.outerHeight ?? 600,
                tabs: uri !== undefined ? [uri] : [],
                activeTab: uri ?? null,
            });
        }
        return [core, ...dependents];
    }

    /** All core-model tabs as opaque URIs (registry first, editor resource fallback). */
    protected tabsOfShell(): Array<{ id: string; uri: string }> {
        const out: Array<{ id: string; uri: string }> = [];
        for (const tabBar of this.shell.allTabBars) {
            for (const title of tabBar.titles) {
                const widget = title.owner;
                if (!widget) {
                    continue;
                }
                const uri = this.tabUriOf(widget);
                if (uri !== undefined) {
                    out.push({ id: widget.id, uri });
                }
            }
        }
        return out;
    }

    /**
     * One tab's opaque identity: the registry URI where it owns the widget,
     * else the editor resource URI the opener resolves (never a widget id or
     * shell-internal key, so the bridge stays landable). Unowned widgets
     * return undefined and are skipped, never guessed.
     */
    protected tabUriOf(widget: Widget): string | undefined {
        try {
            const uri = this.tabUris.uriOf(widget);
            if (uri !== undefined) {
                return uri.toString();
            }
        } catch {
            // A throwing registry lookup falls through to the editor
            // resource-URI fallback below instead of losing the tab.
        }
        try {
            const navigable = widget as unknown as { getResourceUri?: () => { toString(): string } };
            const resource = navigable.getResourceUri?.();
            if (resource) {
                return resource.toString();
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    protected currentModeId(): string {
        try {
            return this.perspectives.getActivePerspectiveId();
        } catch {
            return 'browsing';
        }
    }

    protected modeLabelFor(modeId: string): string {
        const shipped = SHIPPED_MODES.find(descriptor => descriptor.id === modeId);
        if (shipped) {
            return shipped.label;
        }
        const custom = this.modes.getCustomModes().find(row => row.id === modeId);
        return custom?.name ?? modeId;
    }

    protected isDuplicateName(name: string): boolean {
        const folded = name.toLowerCase();
        return this.lastGoodSetups.some(row => row.name.toLowerCase() === folded);
    }

    /** Geometry verbatim with reachability clamping (backstop, never silent stranding). */
    protected applyGeometry(rect: SetupWindowSnapshot): void {
        const clamped = clampRectForDisplay(rect);
        try {
            window.moveTo(clamped.x, clamped.y);
            window.resizeTo(clamped.width, clamped.height);
        } catch {
            // Headless and managed displays ignore placement without
            // throwing or with a denial: geometry is best-effort, the tabs
            // and mode below still apply.
        }
    }

    /**
     * Place every recorded tab through the contribution open path. Returns
     * the count of URIs that no longer resolve (dropped, never forced --
     * T-14-03-02). Dependent rows re-host through the stock handler after
     * their tabs resolve.
     */
    protected async placeTabs(row: SetupSnapshot): Promise<number> {
        let dropped = 0;
        const opened = new Map<string, Widget>();
        for (const tab of row.windows[0].tabs) {
            const widget = await this.openTabUri(tab);
            if (widget === null) {
                dropped += 1;
            } else if (widget instanceof Widget) {
                opened.set(tab, widget);
            }
        }
        if (row.windows[0].activeTab && opened.has(row.windows[0].activeTab as string)) {
            await this.openTabUri(row.windows[0].activeTab as string);
        }
        for (const dependent of row.windows.slice(1)) {
            const widgets: Widget[] = [];
            for (const tab of dependent.tabs) {
                const existing = opened.get(tab);
                if (existing) {
                    widgets.push(existing);
                    continue;
                }
                const widget = await this.openTabUri(tab);
                if (widget === null) {
                    dropped += 1;
                } else if (widget instanceof Widget) {
                    opened.set(tab, widget);
                    widgets.push(widget);
                }
            }
            this.hostDependent(widgets, dependent);
        }
        return dropped;
    }

    /** One tab through the opener: unresolvable URIs drop (null), never throw out. */
    protected async openTabUri(tab: string): Promise<Widget | true | null> {
        try {
            const opened = await open(this.opener, new URI(tab));
            if (opened instanceof Widget) {
                return opened;
            }
            // A truthy non-widget (e.g. a boolean from a delegating handler)
            // means the tab placed without a hostable widget.
            return opened ? true : null;
        } catch {
            return null;
        }
    }

    /** Re-host resolved dependents in the stock secondary window with verbatim rects. */
    protected hostDependent(widgets: Widget[], rect: SetupWindowSnapshot): void {
        const extractables = widgets.filter(ExtractableWidget.is);
        if (extractables.length === 0) {
            return;
        }
        try {
            this.secondaryWindows.moveWidgetToSecondaryWindow(extractables[0]);
            const win = extractSecondaryWindow(extractables[0]) ?? this.secondaryByWidget.get(extractables[0].id);
            for (const widget of extractables.slice(1)) {
                if (win) {
                    this.secondaryWindows.addWidgetToSecondaryWindow(widget, win);
                } else {
                    this.secondaryWindows.moveWidgetToSecondaryWindow(widget);
                }
            }
            if (win) {
                const clamped = clampRectForDisplay(rect);
                try {
                    win.moveTo(clamped.x, clamped.y);
                    win.resizeTo(clamped.width, clamped.height);
                } catch {
                    // Placement is best-effort (see applyGeometry).
                }
            }
        } catch {
            // A dependent that cannot re-host leaves its tabs in core: the
            // restore still completed on geometry plus mode above.
        }
    }

    protected findWidget(id: string): Widget | undefined {
        for (const tabBar of this.shell.allTabBars) {
            for (const title of tabBar.titles) {
                if (title.owner?.id === id) {
                    return title.owner;
                }
            }
        }
        return undefined;
    }

    /** The list surface: quick pick rows with the contracted meta line; zero setups flash the empty copy. */
    protected async pickSetup(placeHolder: string): Promise<string | undefined> {
        const rows = this.listRows();
        if (rows.length === 0) {
            void this.flash(`${SETUPS_EMPTY_HEADING} — ${SETUPS_EMPTY_BODY}`);
            return undefined;
        }
        const picked = await this.quickInput.showQuickPick(
            rows.map(row => ({
                label: row.current ? `$(check) ${row.name}` : row.name,
                description: row.meta,
                id: row.name,
            })),
            { placeholder: placeHolder }
        );
        return picked?.id;
    }

    protected async flash(text: string): Promise<void> {
        const id = 'powerbrowser.setups.notice';
        try {
            await this.statusBar.setElement(id, { text, alignment: StatusBarAlignment.RIGHT });
        } catch {
            return;
        }
        window.setTimeout(() => {
            void this.statusBar.removeElement(id).catch(() => undefined);
        }, 4000);
    }

    protected async loadSetups(): Promise<void> {
        let raw: string;
        try {
            raw = (await this.fileService.read(this.setupsUri)).value;
        } catch {
            // First-ever read: absence is the untouched default, never created.
            return;
        }
        this.applyStoreText(raw);
    }

    protected async reloadSetups(): Promise<void> {
        let raw: string;
        try {
            raw = (await this.fileService.read(this.setupsUri)).value;
        } catch {
            // A later read failure is a mid-save race: keep last good, leave
            // the session untouched.
            return;
        }
        this.applyStoreText(raw);
    }

    protected handleStoreDeleted(): void {
        this.lastGoodSetups = [];
        this.currentSetup = null;
    }

    /** Corrupt data degrades to the contracted empty state: zero rows, no marker, never a throw. */
    protected applyStoreText(raw: string): void {
        const parsed = parseSetupStore(raw);
        if (!parsed.ok) {
            this.lastGoodSetups = [];
            this.currentSetup = null;
            return;
        }
        this.lastGoodSetups = parsed.setups;
        if (this.currentSetup !== null && !parsed.setups.some(row => row.name === this.currentSetup)) {
            this.currentSetup = null;
        }
    }

    /** Ready-ordered applicator: the last-session pointer re-applies after core restore, no confirmation. */
    protected async applyLastSession(): Promise<void> {
        let raw: string;
        try {
            raw = (await this.fileService.read(this.setupsUri)).value;
        } catch {
            return;
        }
        const parsed = parseSetupStore(raw);
        if (!parsed.ok || !parsed.lastSession) {
            return;
        }
        this.lastGoodSetups = parsed.setups;
        const row = parsed.setups.find(setup => setup.name === parsed.lastSession);
        if (!row) {
            return;
        }
        await this.restoreSetup(row.name);
    }

    protected async persistLastSession(name: string | null): Promise<void> {
        let setups = this.lastGoodSetups;
        try {
            const raw = (await this.fileService.read(this.setupsUri)).value;
            const parsed = parseSetupStore(raw);
            if (parsed.ok) {
                setups = parsed.setups;
                this.lastGoodSetups = parsed.setups;
            }
        } catch {
            if (name === null) {
                return;
            }
        }
        try {
            await this.fileService.write(this.setupsUri, JSON.stringify({ version: SETUPS_STORE_VERSION, setups, lastSession: name }, undefined, 2));
        } catch {
            return;
        }
    }
}
