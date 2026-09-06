import { injectable, inject } from '@theia/core/shared/inversify';
import {
    ApplicationShell,
    FrontendApplicationContribution,
    StatusBar,
    StatusBarAlignment,
} from '@theia/core/lib/browser';
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { QuickInputService } from '@theia/core/lib/common/quick-pick-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChangeType } from '@theia/filesystem/lib/common/files';
import { UserStorageUri } from '@theia/userstorage/lib/browser/user-storage-uri';
import pDebounce from 'p-debounce';
import { SHIPPED_MODES, closeOrganisingSlot, openOrganisingSlot } from './mode-descriptors';

/**
 * GUI-07 (14-02): custom modes as user-storage data over the shipped defaults.
 *
 * Schema (resolves 14-RESEARCH.md Open Question 2, modes half): the customs
 * file holds an object with a numeric version plus a customs array whose rows
 * carry a name, side-panel visibility flags, and a shell layout snapshot.
 * Validation is hand-rolled total parsing: unknown fields are dropped, rows
 * with an unusable name are dropped silently, rows with a readable name but
 * unreadable fields are dropped with the contracted fallback notice naming
 * them, and a wholly unreadable file falls back to shipped Browsing with the
 * contracted notice (naming the last-good active custom when one is known,
 * resetting silently otherwise) -- never a blank shell, never a throw during
 * startup (T-14-02-01).
 *
 * Lifecycle (customize-css precedent): absence is the default and is never
 * created; the first read runs fire-and-forget after startup (awaiting a
 * user-storage read inside onStart re-enters the documented boot-chain
 * deadlock); later read failures keep last-good content; DELETED resets
 * immediately; other changes reload through the in-tree 150ms debounce, and
 * the persisted active custom id is re-applied after registration so a custom
 * mode survives relaunch (14-RESEARCH.md Pitfall 3). Stock PerspectiveService
 * exposes no unregister, so a custom deleted mid-session keeps its descriptor
 * until relaunch: the service drops it from every listing and falls back to
 * Browsing when stuck on it, and the stale toggle row clears on relaunch.
 *
 * Save path (14-PATTERNS.md section 3): the typed name is trimmed and cut at
 * the contracted 60-character cap before commit; the contracted empty-name
 * and duplicate-name errors write nothing partial; success flashes the
 * contracted saved confirmation and lands in the new mode (whose stock switch
 * event repaints the toggle). A custom never alters a shipped default in
 * place: shipped-colliding names are duplicates. Names render as text with
 * ellipsis plus tooltip at the toggle (T-14-02-02).
 *
 * The switch path (activateMode) is the allowlisted surface the
 * switch-invariant gate derives at check time: stock perspective switching,
 * side-panel expand and collapse, contribution-routed placeholder open and
 * close through the descriptor slot seam, and -- via the widget's
 * publishTabCount on the same stock event -- the chip re-assertion. No switch
 * path closes, moves, or detaches a tab (T-14-02-04).
 */

/** Accepted store versions. Newer writers are read leniently: unknown fields drop. */
export const MODES_STORE_VERSION = 1;

/** Contracted name cap (14-UI-SPEC.md): pasted overflow is cut before commit. */
export const MODE_NAME_MAX = 60;

export interface CustomModeSnapshot {
    name: string;
    leftVisible: boolean;
    rightVisible: boolean;
    bottomVisible: boolean;
    layout: unknown;
}

const SHIPPED_IDS: ReadonlySet<string> = new Set(SHIPPED_MODES.map(descriptor => descriptor.id));

/** Custom descriptor ids live in their own namespace, never colliding with shipped ids. */
export function customModeIdFor(name: string): string {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `custom-${slug || 'mode'}`;
}

interface ParsedModeStore {
    ok: boolean;
    customs: CustomModeSnapshot[];
    badNames: string[];
}

/**
 * Total parse of the customs file: never throws, always produces a value.
 * Whole-file failure (unparseable, not an object, non-numeric version,
 * non-array customs) reports ok:false; row failure drops the row, naming it
 * in badNames only when its name survived (otherwise silent).
 */
function parseModeStore(raw: string): ParsedModeStore {
    const empty: ParsedModeStore = { ok: false, customs: [], badNames: [] };
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
    if (typeof record['version'] !== 'number' || !Array.isArray(record['customs'])) {
        return empty;
    }
    const customs: CustomModeSnapshot[] = [];
    const badNames: string[] = [];
    const seen = new Set<string>();
    for (const entry of record['customs']) {
        if (typeof entry !== 'object' || entry === null) {
            continue;
        }
        const row = entry as Record<string, unknown>;
        if (typeof row['name'] !== 'string') {
            continue;
        }
        const name = row['name'].trim().slice(0, MODE_NAME_MAX);
        if (!name) {
            continue;
        }
        const id = customModeIdFor(name);
        // Shipped-colliding NAMES are duplicates (ids live in the separate
        // `custom-<slug>` namespace, so comparing the id against SHIPPED_IDS
        // could never match -- compare the label instead, matching the save
        // path's `isDuplicateName` discipline).
        if (SHIPPED_MODES.some(descriptor => descriptor.label.toLowerCase() === name.toLowerCase()) || seen.has(id)) {
            continue;
        }
        seen.add(id);
        if (typeof row['leftVisible'] !== 'boolean'
            || typeof row['rightVisible'] !== 'boolean'
            || typeof row['bottomVisible'] !== 'boolean') {
            badNames.push(name);
            continue;
        }
        const layout = 'layout' in row ? row['layout'] : null;
        if (layout !== null && typeof layout !== 'object') {
            badNames.push(name);
            continue;
        }
        customs.push({
            name,
            leftVisible: row['leftVisible'] as boolean,
            rightVisible: row['rightVisible'] as boolean,
            bottomVisible: row['bottomVisible'] as boolean,
            layout,
        });
    }
    return { ok: true, customs, badNames };
}

@injectable()
export class ModeService implements FrontendApplicationContribution {

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(PerspectiveService)
    protected readonly perspectives: PerspectiveService;

    @inject(StorageService)
    protected readonly storage: StorageService;

    @inject(QuickInputService)
    protected readonly quickInput: QuickInputService;

    @inject(FileService)
    protected readonly fileService: FileService;

    @inject(StatusBar)
    protected readonly statusBar: StatusBar;

    protected readonly modesUri = UserStorageUri.resolve('modes.json');
    protected readonly debouncedReload = pDebounce(() => this.reloadCustomModes(), 150);
    protected lastGoodCustoms: CustomModeSnapshot[] = [];
    protected registeredCustomIds = new Set<string>();
    protected droppedCustomIds = new Set<string>();

    onStart(): void {
        // Fire-and-forget: awaiting this read here re-enters the boot-chain
        // deadlock documented in the customize-css header. Shipped modes are
        // already registered synchronously by ModesContribution.
        void this.loadCustomModes();
        // GUI-07 (14-UI-SPEC: "Browsing (launch default)"): nothing else
        // activates a mode on a normal launch. ModesContribution only
        // REGISTERS the descriptors, and reapplyPersistedMode() re-activates
        // custom ids only, so a shipped id was restored by nobody. The shell
        // therefore opened on stock Theia's own layout while the toggle
        // asserted its first literal label -- and because activateMode()
        // early-returns on the already-active id, the mode the toggle falsely
        // claimed could not be entered by clicking it. Fire-and-forget for the
        // same reason as loadCustomModes above: awaiting a read here re-enters
        // the boot-chain deadlock documented in the customize-css header.
        void this.applyLaunchMode();
        this.fileService.onDidFilesChange(event => {
            // A DELETED change is a deliberate absence: reset immediately,
            // bypassing the keep-last-good guard (same shape as customize).
            if (event.contains(this.modesUri, FileChangeType.DELETED)) {
                void this.handleStoreDeleted();
                return;
            }
            if (event.contains(this.modesUri)) {
                void this.debouncedReload();
            }
        });
    }

    /**
     * The mode switch path: stock switch, explicit panel flags, placeholder
     * slot, and -- through the widget's stock-event subscription -- the chip
     * re-assertion. Unknown ids resolve to shipped Browsing, so this never
     * blanks the shell. The switch-invariant gate derives the shell-mutating
     * calls in this body at check time; keep them to the allowlist.
     */
    async activateMode(id: string): Promise<void> {
        const target = this.resolveTarget(id);
        try {
            await this.perspectives.switchPerspective(target);
        } catch {
            try {
                await this.perspectives.switchPerspective('browsing');
            } catch {
                // Last resort: stock misbehaves twice -- the shell keeps its
                // current layout and the callers (all void) see no rejection.
            }
            closeOrganisingSlot();
            return;
        }
        const flags = this.visibilityFor(target);
        // collapse() floats a promise (expand is sync void): attach the
        // no-op catch so a shutdown-time rejection is silence, not noise.
        if (flags.left) {
            this.shell.leftPanelHandler.expand('explorer-view-container');
        } else {
            void this.shell.leftPanelHandler.collapse().catch(() => undefined);
        }
        if (flags.right) {
            this.shell.rightPanelHandler.expand();
        } else {
            void this.shell.rightPanelHandler.collapse().catch(() => undefined);
        }
        if (flags.bottom) {
            this.shell.expandPanel('bottom');
        } else {
            await this.shell.collapsePanel('bottom');
        }
        if (target === 'organising') {
            openOrganisingSlot();
        } else {
            closeOrganisingSlot();
        }
    }

    /** Customs listed beside the shipped defaults for the toggle; shipped rows untouched. */
    getCustomModes(): Array<{ id: string; name: string }> {
        return this.lastGoodCustoms.map(row => ({ id: customModeIdFor(row.name), name: row.name }));
    }

    hasCustomMode(id: string): boolean {
        return this.lastGoodCustoms.some(row => customModeIdFor(row.name) === id);
    }

    async saveCurrentAsMode(): Promise<void> {
        const answer = await this.quickInput.input({ prompt: 'Save as Mode', placeHolder: 'Mode name' });
        if (answer === undefined) {
            return;
        }
        const name = answer.trim().slice(0, MODE_NAME_MAX);
        if (!name) {
            void this.flash('Give the mode a name — type a name and choose Save as Mode.');
            return;
        }
        if (this.isDuplicateName(name)) {
            void this.flash('A mode with this name already exists. Choose a different name.');
            return;
        }
        const row: CustomModeSnapshot = {
            name,
            leftVisible: this.shell.isExpanded('left'),
            rightVisible: this.shell.isExpanded('right'),
            bottomVisible: this.shell.isExpanded('bottom'),
            layout: this.snapshotLayout(),
        };
        const customs = [...this.lastGoodCustoms, row];
        try {
            await this.fileService.write(this.modesUri, JSON.stringify({ version: MODES_STORE_VERSION, customs }, undefined, 2));
        } catch {
            void this.flash('Power Browser could not save this mode. Your panels are unchanged — try again.');
            return;
        }
        this.lastGoodCustoms = customs;
        // A re-save after a store delete must clear the stale drop marker:
        // the descriptor was never unregistered by stock, so without this
        // `resolveTarget` keeps rejecting the just-saved id to Browsing.
        this.droppedCustomIds.delete(customModeIdFor(name));
        this.registerCustom(row);
        void this.flash(`Mode "${name}" saved.`);
        await this.activateMode(customModeIdFor(name));
    }

    protected resolveTarget(id: string): string {
        if (SHIPPED_IDS.has(id)) {
            return id;
        }
        if (this.registeredCustomIds.has(id) && !this.droppedCustomIds.has(id)) {
            return id;
        }
        return 'browsing';
    }

    protected visibilityFor(target: string): { left: boolean; right: boolean; bottom: boolean } {
        const custom = this.lastGoodCustoms.find(row => customModeIdFor(row.name) === target);
        if (custom) {
            return { left: custom.leftVisible, right: custom.rightVisible, bottom: custom.bottomVisible };
        }
        if (target === 'coding') {
            return { left: true, right: this.shell.isExpanded('right'), bottom: true };
        }
        return { left: false, right: false, bottom: false };
    }

    protected isDuplicateName(name: string): boolean {
        const folded = name.toLowerCase();
        if (SHIPPED_MODES.some(descriptor => descriptor.label.toLowerCase() === folded)) {
            return true;
        }
        const id = customModeIdFor(name);
        return this.lastGoodCustoms.some(row => row.name.toLowerCase() === folded || customModeIdFor(row.name) === id);
    }

    protected snapshotLayout(): unknown {
        try {
            return JSON.parse(JSON.stringify(this.shell.getLayoutData()));
        } catch {
            return null;
        }
    }

    protected async flash(text: string): Promise<void> {
        const id = 'powerbrowser.modes.notice';
        try {
            await this.statusBar.setElement(id, { text, alignment: StatusBarAlignment.RIGHT });
        } catch {
            return;
        }
        window.setTimeout(() => {
            void this.statusBar.removeElement(id).catch(() => undefined);
        }, 4000);
    }

    protected registerCustom(row: CustomModeSnapshot): void {
        const id = customModeIdFor(row.name);
        if (SHIPPED_IDS.has(id) || this.registeredCustomIds.has(id)) {
            return;
        }
        const collapsed: Array<'left' | 'right' | 'bottom'> = [];
        if (!row.leftVisible) {
            collapsed.push('left');
        }
        if (!row.rightVisible) {
            collapsed.push('right');
        }
        if (!row.bottomVisible) {
            collapsed.push('bottom');
        }
        try {
            this.perspectives.registerPerspective({
                id,
                label: row.name,
                viewPlacements: new Map(),
                chromeOptions: { collapseAreas: collapsed },
            });
        } catch {
            return;
        }
        this.registeredCustomIds.add(id);
    }

    protected async loadCustomModes(): Promise<void> {
        let raw: string;
        try {
            raw = (await this.fileService.read(this.modesUri)).value;
        } catch {
            // First-ever read: absence is the untouched default, never created.
            return;
        }
        this.applyStoreText(raw);
    }

    protected async reloadCustomModes(): Promise<void> {
        let raw: string;
        try {
            raw = (await this.fileService.read(this.modesUri)).value;
        } catch {
            // A later read failure is a mid-save race: keep last good, leave
            // the shell untouched.
            return;
        }
        this.applyStoreText(raw);
    }

    protected async handleStoreDeleted(): Promise<void> {
        try {
            const active = this.perspectives.getActivePerspectiveId();
            this.lastGoodCustoms = [];
            this.droppedCustomIds = new Set(this.registeredCustomIds);
            if (this.registeredCustomIds.has(active)) {
                await this.activateMode('browsing');
            }
        } catch {
            this.lastGoodCustoms = [];
        }
    }

    protected applyStoreText(raw: string): void {
        const parsed = parseModeStore(raw);
        if (!parsed.ok) {
            void this.handleCorruptStore();
            return;
        }
        this.lastGoodCustoms = parsed.customs;
        const currentIds = new Set(parsed.customs.map(row => customModeIdFor(row.name)));
        this.droppedCustomIds = new Set(
            [...this.registeredCustomIds].filter(id => !currentIds.has(id) && !SHIPPED_IDS.has(id))
        );
        for (const row of parsed.customs) {
            this.registerCustom(row);
        }
        for (const bad of parsed.badNames) {
            void this.flash(`Power Browser couldn't load the "${bad}" mode. Browsing is shown instead.`);
        }
        const active = this.safeActiveId();
        if (active !== undefined && this.droppedCustomIds.has(active)) {
            void this.activateMode('browsing');
        } else {
            void this.reapplyPersistedMode();
        }
    }

    protected async handleCorruptStore(): Promise<void> {
        const fallbackName = await this.corruptFallbackName();
        this.lastGoodCustoms = [];
        this.droppedCustomIds = new Set(this.registeredCustomIds);
        await this.activateMode('browsing');
        if (fallbackName !== undefined) {
            void this.flash(`Power Browser couldn't load the "${fallbackName}" mode. Browsing is shown instead.`);
        }
    }

    protected async corruptFallbackName(): Promise<string | undefined> {
        try {
            const persisted = await this.storage.getData<{ activePerspectiveId?: unknown }>('perspective-layouts');
            const id = persisted?.activePerspectiveId;
            if (typeof id === 'string' && id.startsWith('custom-')) {
                const known = this.lastGoodCustoms.find(row => customModeIdFor(row.name) === id);
                if (known) {
                    return known.name;
                }
                const human = id.slice('custom-'.length).replace(/-+/g, ' ').trim();
                if (human) {
                    return human;
                }
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    /**
     * GUI-07/GUI-09: the mode a launch opens in -- the persisted mode when it
     * is one of the shipped ids, else the contracted Browsing default. Custom
     * ids are deliberately NOT handled here: they register asynchronously from
     * user storage, and reapplyPersistedMode() already owns re-activating them
     * once they exist. An unreadable store is an absence, never a throw, and
     * falls through to the same default.
     */
    protected async applyLaunchMode(): Promise<void> {
        let persistedId: unknown;
        try {
            const data = await this.storage.getData<{ activePerspectiveId?: unknown }>('perspective-layouts');
            persistedId = data?.activePerspectiveId;
        } catch {
            persistedId = undefined;
        }
        const shipped = typeof persistedId === 'string'
            && SHIPPED_MODES.some(descriptor => descriptor.id === persistedId);
        await this.activateMode(shipped ? persistedId as string : 'browsing');
    }

    protected async reapplyPersistedMode(): Promise<void> {
        let persistedId: unknown;
        try {
            const data = await this.storage.getData<{ activePerspectiveId?: unknown }>('perspective-layouts');
            persistedId = data?.activePerspectiveId;
        } catch {
            return;
        }
        if (typeof persistedId !== 'string') {
            return;
        }
        if (this.registeredCustomIds.has(persistedId) && !this.droppedCustomIds.has(persistedId)) {
            if (this.safeActiveId() !== persistedId) {
                await this.activateMode(persistedId);
            }
        } else if (this.droppedCustomIds.has(persistedId) && this.safeActiveId() === persistedId) {
            await this.activateMode('browsing');
        }
    }

    protected safeActiveId(): string | undefined {
        try {
            return this.perspectives.getActivePerspectiveId();
        } catch {
            return undefined;
        }
    }
}
