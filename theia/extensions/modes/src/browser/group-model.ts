/**
 * GUI-08 (15-01): the single in-memory group store behind BOTH the canvas
 * and the tree roots. One ordered group list, one membership map, one
 * active-group id -- the view toggle flips visibility only, never reloads
 * and never loses selection, so a canvas/tree mismatch is a render bug in
 * one file, never store divergence (15-RESEARCH.md Pitfall 5).
 *
 * Total parse (modes/setups precedent): unknown fields are dropped, a
 * corrupt payload degrades to the contracted empty state, and load never
 * throws -- the widget paints the contracted empty/load-error copy instead.
 *
 * Every mutation paints optimistically, persists through one actor message,
 * and on nack/timeout keeps the painted change behind the contracted
 * save-error bar with Retry; Retry replays the write once and reverts the
 * painted change only if the replay fails again (15-UI-SPEC.md).
 */

import { injectable } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common';
import type { GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';
import type { GroupActorClient, GroupMutation } from './group-actor-client';

/** Contracted rename cap (15-UI-SPEC.md); duplicates allowed, empty reverts. */
export const GROUP_TITLE_MAX_CHARS = 60;

/** Group-box minimum geometry (15-UI-SPEC.md: fits header plus one card). */
export const GROUP_BOX_MIN_W = 200;
export const GROUP_BOX_MIN_H = 144;

/** Default title for New Group (contracted copy, verbatim). */
export const UNTITLED_GROUP_TITLE = 'Untitled group';

export interface PanoramaGroup {
    id: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    isActive: boolean;
}

export interface PanoramaTab {
    uri: string;
    url: string;
    title: string;
    thumbnail?: string | null;
    /**
     * Where a loose tab sits on the canvas, or undefined for one that has
     * never been placed. Never-placed tabs are laid out along the bottom by
     * the canvas itself, so an existing profile upgrades without every tab
     * it has ever seen acquiring a position.
     */
    x?: number;
    y?: number;
}

/**
 * One tab the shell actually has open, as `load` needs to see it.
 *
 * `tabs.sqlite` is a tab HISTORY carrying group membership, not a live tab
 * list: `startTabStoreTriggers` writes a row for every tab in every stock
 * browser window as well as for in-shell web tabs, the sessionstore sweep
 * adds whatever sessionstore knows, and `pruneClosedTabRows` only removes a
 * closed tab's row once it is older than the seven-day retention window. So
 * the store on its own answers "which tabs has this profile seen lately",
 * which is not the question the canvas asks.
 *
 * The shell answers that one. `uri` is the store key -- the page URL, the
 * same value `writeTabRow` binds -- so the two join without a second
 * identity scheme, and the bridge (GUI-04) can later supply chrome-owned
 * tabs through the same shape without changing this file.
 */
export interface LiveTab {
    uri: string;
    url: string;
    title: string;
}

/**
 * Card key for a tab that has no page yet -- a New Tab still on the empty
 * page. Chrome writes store rows for http(s) targets only, so such a tab has
 * no row and no URL to be keyed by, and four of them would all key as the
 * same empty address. The shell's own per-tab id stands in.
 *
 * It is a key, never a label: nothing built from it may reach the screen.
 */
export const SESSION_TAB_PREFIX = 'session:';

/** The shell tab id inside a session key, or undefined for a real URL key. */
function sessionTabId(uri: string): string | undefined {
    return uri.startsWith(SESSION_TAB_PREFIX) ? uri.slice(SESSION_TAB_PREFIX.length) : undefined;
}

function toFinite(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

@injectable()
export class GroupModel {
    private readonly changeEmitter = new Emitter<void>();
    readonly onDidChange: Event<void> = this.changeEmitter.event;

    private groups: PanoramaGroup[] = [];
    private readonly members = new Map<string, PanoramaTab[]>();
    private ungrouped: PanoramaTab[] = [];
    private activeGroupId: string | undefined;
    private loaded = false;
    private loadFailed = false;
    /**
     * WR-01: one pending write per mutation key, not a single slot. A
     * cross-key failure used to evict the earlier write's revert closure,
     * stranding its painted-but-unpersisted change with no recovery path.
     * Bounded (drop-oldest past 20) so a failure storm cannot grow it.
     */
    private readonly pendingWrites = new Map<string, { attempts: number; revert: () => void; write: () => Promise<unknown> }>();
    private static readonly PENDING_WRITES_MAX = 20;

    /**
     * Group membership for tabs the store cannot hold: anything without an
     * http(s) URL of its own -- a New Tab still on the empty page, the
     * Welcome page, an editor. Keyed by the shell's tab id and dropped when
     * the frontend does, which is honest about what it is.
     *
     * ponytail: session-only. Such a tab returns to Ungrouped on restart even
     * when the shell restores the tab itself. Persisting it needs a store key
     * that is not the page URL, which is the same change GUI-04's chrome-owned
     * tab model brings.
     */
    private readonly sessionGroups = new Map<string, string>();

    /**
     * Canvas positions for the same tabs the store cannot key -- a New Tab on
     * the empty page, Welcome, an editor. A tab WITH a page keeps its position
     * in the store and survives restart; these keep it for the session, which
     * is the whole life of the tab anyway, since the shell does not restore
     * them either.
     */
    private readonly sessionPlaces = new Map<string, { x: number; y: number }>();

    /**
     * Previews for tabs that are not pages -- the Welcome view, an editor, a
     * terminal. Chrome photographs the shell frame for these rather than a
     * document, and there is no store column for the result, so they live for
     * the session. Bounded, because a data URL is not small.
     */
    private readonly sessionThumbs = new Map<string, string>();
    private static readonly SESSION_THUMBS_MAX = 40;

    /** Keeps one captured preview, evicting the oldest past the cap. */
    rememberThumbnail(uri: string, png: string): void {
        if (this.sessionThumbs.has(uri)) {
            this.sessionThumbs.delete(uri);
        } else if (this.sessionThumbs.size >= GroupModel.SESSION_THUMBS_MAX) {
            const oldest = this.sessionThumbs.keys().next().value;
            if (oldest !== undefined) {
                this.sessionThumbs.delete(oldest);
            }
        }
        this.sessionThumbs.set(uri, png);
        this.changeEmitter.fire();
    }

    get isLoaded(): boolean {
        return this.loaded;
    }

    get hasLoadFailed(): boolean {
        return this.loadFailed;
    }

    get hasPendingWrite(): boolean {
        return this.pendingWrites.size > 0;
    }

    listGroups(): readonly PanoramaGroup[] {
        return Object.freeze([...this.groups]);
    }

    getTabs(groupId: string): readonly PanoramaTab[] {
        return Object.freeze([...(this.members.get(groupId) ?? [])]);
    }

    listUngrouped(): readonly PanoramaTab[] {
        return Object.freeze([...this.ungrouped]);
    }

    getActiveGroupId(): string | undefined {
        return this.activeGroupId;
    }

    /**
     * Loads groups, membership, and the tray from the reader. Total parse:
     * unparseable rows are dropped, a corrupt payload lands the contracted
     * empty state, and failures resolve with loadFailed set -- never throws.
     *
     * `live`, when given, is the set of tabs the shell actually has open, and
     * it decides which cards exist -- see `LiveTab`. Omitting it uses the
     * store whole, which is what every caller without a shell wants.
     */
    async load(reader: GroupQueryService, live?: readonly LiveTab[]): Promise<void> {
        try {
            const rows = await reader.listGroups();
            const parsed = Array.isArray(rows) ? rows.flatMap(row => {
                const group = this.parseGroup(row);
                return group ? [group] : [];
            }) : [];
            const nextMembers = new Map<string, PanoramaTab[]>();
            for (const group of parsed) {
                let tabs: PanoramaTab[] = [];
                try {
                    const memberRows = await reader.getGroupTabs(group.id);
                    tabs = Array.isArray(memberRows) ? memberRows.flatMap(row => {
                        const tab = this.parseTab(row);
                        return tab ? [tab] : [];
                    }) : [];
                } catch {
                    tabs = [];
                }
                nextMembers.set(group.id, tabs);
            }
            let tray: PanoramaTab[] = [];
            try {
                const trayRows = await reader.listUngroupedTabs();
                tray = Array.isArray(trayRows) ? trayRows.flatMap(row => {
                    const tab = this.parseTab(row);
                    return tab ? [tab] : [];
                }) : [];
            } catch {
                tray = [];
            }
            if (live) {
                // The shell decides which cards exist and what they are
                // called; the store decides only which group each one is in
                // and what its last thumbnail was.
                const liveByUri = new Map(live.map(tab => [tab.uri, tab]));
                const thumbnails = new Map<string, string | null | undefined>();
                const placements = new Map<string, { x?: number; y?: number }>();
                for (const tabs of [...nextMembers.values(), tray]) {
                    for (const tab of tabs) {
                        thumbnails.set(tab.uri, tab.thumbnail ?? this.sessionThumbs.get(tab.uri));
                        placements.set(tab.uri, { x: tab.x, y: tab.y });
                    }
                }
                const claimed = new Set<string>();
                for (const [id, tabs] of nextMembers) {
                    nextMembers.set(id, tabs.flatMap(tab => {
                        const open = liveByUri.get(tab.uri);
                        if (!open) {
                            return [];
                        }
                        claimed.add(tab.uri);
                        return [{ ...tab, url: open.url, title: open.title || tab.title }];
                    }));
                }
                // Everything else open: in a group if this session put it in
                // one, ungrouped otherwise. That includes a tab opened seconds
                // ago whose row does not exist yet, which the store's own
                // listUngroupedTabs cannot know about and which was therefore
                // invisible on the canvas until now.
                const rest: PanoramaTab[] = [];
                for (const tab of live) {
                    if (claimed.has(tab.uri)) {
                        continue;
                    }
                    const placed = placements.get(tab.uri) ?? this.sessionPlaces.get(tab.uri);
                    const card: PanoramaTab = {
                        uri: tab.uri,
                        url: tab.url,
                        title: tab.title,
                        // The store first, then anything captured this
                        // session for a tab the store cannot photograph.
                        thumbnail: thumbnails.get(tab.uri) ?? this.sessionThumbs.get(tab.uri) ?? null,
                        x: placed?.x,
                        y: placed?.y,
                    };
                    const session = sessionTabId(tab.uri);
                    const target = session ? this.sessionGroups.get(session) : undefined;
                    if (target !== undefined && nextMembers.has(target)) {
                        nextMembers.set(target, [...(nextMembers.get(target) ?? []), card]);
                    } else {
                        rest.push(card);
                    }
                }
                tray = rest;
            }
            this.groups = parsed;
            this.members.clear();
            for (const [id, tabs] of nextMembers) {
                this.members.set(id, tabs);
            }
            this.ungrouped = tray;
            const active = parsed.find(group => group.isActive);
            this.activeGroupId = active?.id;
            this.loaded = true;
            this.loadFailed = false;
        } catch {
            this.groups = [];
            this.members.clear();
            this.ungrouped = [];
            this.activeGroupId = undefined;
            this.loaded = true;
            this.loadFailed = true;
        }
        this.changeEmitter.fire();
    }

    /**
     * Creates a box titled Untitled group; the widget puts it in edit mode.
     * `at` may carry a size as well as a position -- a group drawn on the
     * canvas is whatever rectangle was dragged, floored at the contracted
     * minimum; the button passes a position only and gets the default box.
     */
    async createGroup(client: GroupActorClient, at?: { x: number; y: number; w?: number; h?: number }): Promise<PanoramaGroup> {
        const group: PanoramaGroup = {
            id: `group-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x100000).toString(36)}`,
            title: UNTITLED_GROUP_TITLE,
            x: Math.max(0, Math.floor(at?.x ?? 24)),
            y: Math.max(0, Math.floor(at?.y ?? 24)),
            w: Math.max(GROUP_BOX_MIN_W, Math.floor(at?.w ?? 400)),
            h: Math.max(GROUP_BOX_MIN_H, Math.floor(at?.h ?? 300)),
            isActive: false,
        };
        const apply = (): void => {
            this.groups = [...this.groups, group];
            this.members.set(group.id, []);
        };
        const revert = (): void => {
            this.groups = this.groups.filter(candidate => candidate.id !== group.id);
            this.members.delete(group.id);
            if (this.activeGroupId === group.id) {
                this.activeGroupId = undefined;
            }
        };
        await this.persist(`create:${group.id}`, apply, revert, () =>
            client.mutate({ kind: 'createGroup', id: group.id, title: group.title, x: group.x, y: group.y, w: group.w, h: group.h }));
        return group;
    }

    /**
     * Commits a title edit. Empty reverts to the prior title locally with no
     * write; over-long input is cut at the cap before commit; duplicates are
     * allowed. Returns the title now painted.
     */
    async commitTitle(client: GroupActorClient, id: string, raw: string): Promise<string> {
        const group = this.groups.find(candidate => candidate.id === id);
        if (!group) {
            return '';
        }
        const trimmed = raw.trim().slice(0, GROUP_TITLE_MAX_CHARS);
        if (!trimmed) {
            this.changeEmitter.fire();
            return group.title;
        }
        if (trimmed === group.title) {
            return group.title;
        }
        const prior = group.title;
        const apply = (): void => {
            const current = this.groups.find(candidate => candidate.id === id);
            if (current) {
                current.title = trimmed;
            }
        };
        const revert = (): void => {
            const current = this.groups.find(candidate => candidate.id === id);
            if (current) {
                current.title = prior;
            }
        };
        await this.persist(`rename:${id}`, apply, revert, () => client.mutate({ kind: 'renameGroup', id, title: trimmed }));
        return trimmed;
    }

    /** Moves a box (header-drag); bounds are clamped chrome-side as well. */
    async moveGroup(client: GroupActorClient, id: string, x: number, y: number): Promise<void> {
        const group = this.groups.find(candidate => candidate.id === id);
        if (!group) {
            return;
        }
        const next = { x: Math.max(0, Math.floor(x)), y: Math.max(0, Math.floor(y)) };
        if (next.x === group.x && next.y === group.y) {
            return;
        }
        const prior = { x: group.x, y: group.y };
        await this.persist(`move:${id}`, () => {
            const current = this.groups.find(candidate => candidate.id === id);
            if (current) {
                current.x = next.x;
                current.y = next.y;
            }
        }, () => {
            const current = this.groups.find(candidate => candidate.id === id);
            if (current) {
                current.x = prior.x;
                current.y = prior.y;
            }
        }, () => client.mutate({ kind: 'moveGroup', id, x: next.x, y: next.y }));
    }

    /** Resizes a box (corner handle); floors at the contracted minimum. */
    async resizeGroup(client: GroupActorClient, id: string, w: number, h: number): Promise<void> {
        const group = this.groups.find(candidate => candidate.id === id);
        if (!group) {
            return;
        }
        const next = { w: Math.max(GROUP_BOX_MIN_W, Math.floor(w)), h: Math.max(GROUP_BOX_MIN_H, Math.floor(h)) };
        if (next.w === group.w && next.h === group.h) {
            return;
        }
        const prior = { w: group.w, h: group.h };
        await this.persist(`resize:${id}`, () => {
            const current = this.groups.find(candidate => candidate.id === id);
            if (current) {
                current.w = next.w;
                current.h = next.h;
            }
        }, () => {
            const current = this.groups.find(candidate => candidate.id === id);
            if (current) {
                current.w = prior.w;
                current.h = prior.h;
            }
        }, () => client.mutate({ kind: 'resizeGroup', id, w: next.w, h: next.h }));
    }

    /**
     * Auto-draws one box around the given cards (the drop-matrix gesture:
     * card-onto-card contains both, card-onto-field contains the one).
     * Paints the box plus the membership move optimistically; the write is
     * one composite (createGroup, idempotent upsert, then one setTabGroup
     * per card) so Retry replays it whole and a second failure reverts it
     * whole. Returns the painted box, or undefined when no URI resolved.
     */
    async autoBox(client: GroupActorClient, uris: readonly string[], at: { x: number; y: number }): Promise<PanoramaGroup | undefined> {
        const placements = [...new Set(uris)].flatMap(uri => {
            const found = this.locateCard(uri);
            return found ? [{ uri, groupId: found.groupId, card: found.card }] : [];
        });
        if (!placements.length) {
            return undefined;
        }
        const group: PanoramaGroup = {
            id: `group-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x100000).toString(36)}`,
            title: UNTITLED_GROUP_TITLE,
            x: Math.max(0, Math.floor(at.x)),
            y: Math.max(0, Math.floor(at.y)),
            w: 400,
            h: 300,
            isActive: false,
        };
        const apply = (): void => {
            this.groups = [...this.groups, group];
            this.members.set(group.id, []);
            for (const placement of placements) {
                this.removeCardLocal(placement.uri);
                this.insertCardLocal(placement.card, group.id);
            }
        };
        const revert = (): void => {
            this.groups = this.groups.filter(candidate => candidate.id !== group.id);
            this.members.delete(group.id);
            for (const placement of placements) {
                this.removeCardLocal(placement.uri);
                this.insertCardLocal(placement.card, placement.groupId);
            }
            if (this.activeGroupId === group.id) {
                this.activeGroupId = undefined;
            }
        };
        await this.persist(`autobox:${group.id}`, apply, revert, async () => {
            await client.mutate({ kind: 'createGroup', id: group.id, title: group.title, x: group.x, y: group.y, w: group.w, h: group.h });
            for (const placement of placements) {
                await this.writeMembership(client, placement.uri, group.id);
            }
        });
        return group;
    }

    /**
     * Relocates one card between a box and the tray (or box to box). When
     * the source box ends up empty the caller follows with dissolveGroup --
     * the last-card-out gesture -- so nothing is orphaned.
     */
    /**
     * Moves a card into a group, optionally at a chosen place in it. Dropping
     * a card between two others is a move AND a reorder, so both are written:
     * the membership, then the group's new order as one list.
     *
     * A move within the same group is a pure reorder and is allowed through --
     * before this it early-returned, so a card could only ever be appended.
     */
    async moveCard(client: GroupActorClient, uri: string, toGroupId: string | null, index?: number): Promise<void> {
        const from = this.locateCard(uri);
        if (!from) {
            return;
        }
        const sameGroup = from.groupId === toGroupId;
        if (sameGroup && (index === undefined || toGroupId === null)) {
            return;
        }
        const card = from.card;
        const before = sameGroup && toGroupId !== null
            ? (this.members.get(toGroupId) ?? []).findIndex(tab => tab.uri === uri)
            : undefined;
        const apply = (): void => {
            this.removeCardLocal(uri);
            this.insertCardLocal(card, toGroupId, index);
        };
        const revert = (): void => {
            this.removeCardLocal(uri);
            this.insertCardLocal(card, from.groupId, before);
        };
        await this.persist(`card:${uri}`, apply, revert, async () => {
            if (!sameGroup) {
                await this.writeMembership(client, uri, toGroupId);
            }
            if (toGroupId !== null) {
                await this.writeOrder(client, toGroupId);
            }
        });
    }

    /**
     * Writes one group's running order. Sent as the whole list because a drop
     * between two cards renumbers everything after it -- one transaction is
     * either the new order or the old one, where a write per tab could leave
     * the group half-renumbered.
     *
     * Tabs the store cannot key are filtered out rather than sent: their rows
     * do not exist, so an UPDATE naming them would match nothing while
     * silently shifting the ordinals of the tabs that do exist.
     */
    private async writeOrder(client: GroupActorClient, groupId: string): Promise<void> {
        const uris = (this.members.get(groupId) ?? [])
            .map(tab => tab.uri)
            .filter(uri => sessionTabId(uri) === undefined);
        if (!uris.length) {
            return;
        }
        await client.mutate({ kind: 'setGroupOrder', groupId, uris });
    }

    /**
     * Places a loose tab on the canvas. Paints first, then persists, like
     * every other mutation here; a tab that is in a group is ignored, because
     * a grouped tab's position is decided by its group's grid.
     */
    async placeCard(client: GroupActorClient, uri: string, x: number, y: number): Promise<void> {
        const at = { x: Math.max(0, Math.floor(x)), y: Math.max(0, Math.floor(y)) };
        const index = this.ungrouped.findIndex(candidate => candidate.uri === uri);
        if (index < 0) {
            return;
        }
        const before = { x: this.ungrouped[index].x, y: this.ungrouped[index].y };
        const apply = (): void => {
            const at2 = this.ungrouped.findIndex(candidate => candidate.uri === uri);
            if (at2 >= 0) {
                this.ungrouped[at2] = { ...this.ungrouped[at2], ...at };
            }
        };
        const revert = (): void => {
            const at2 = this.ungrouped.findIndex(candidate => candidate.uri === uri);
            if (at2 >= 0) {
                this.ungrouped[at2] = { ...this.ungrouped[at2], ...before };
            }
        };
        await this.persist(`place:${uri}`, apply, revert, () => this.writePlacement(client, uri, at.x, at.y));
    }

    /**
     * One placement write, split the same way membership is: a tab the store
     * cannot key by URL keeps its position for the session instead of sending
     * an UPDATE that would match no row, report success, and lose the change
     * on the next reload.
     */
    private async writePlacement(client: GroupActorClient, uri: string, x: number, y: number): Promise<void> {
        if (sessionTabId(uri) !== undefined) {
            this.sessionPlaces.set(uri, { x, y });
            return;
        }
        await client.mutate({ kind: 'setTabPosition', uri, x, y });
    }

    /**
     * One membership write. A tab with no store row of its own -- no http(s)
     * URL to be keyed by -- is remembered for the session instead of being
     * sent to a store that has nothing to update; the mutation would find no
     * row, report success, and the card would silently return to Ungrouped on
     * the next reload.
     */
    private async writeMembership(client: GroupActorClient, uri: string, groupId: string | null): Promise<void> {
        const session = sessionTabId(uri);
        if (session !== undefined) {
            if (groupId === null) {
                this.sessionGroups.delete(session);
            } else {
                this.sessionGroups.set(session, groupId);
            }
            return;
        }
        await client.mutate({ kind: 'setTabGroup', uri, groupId });
    }

    /** Removes an emptied box (last-card-out); tabs survive, ungrouped. */
    async dissolveGroup(client: GroupActorClient, id: string): Promise<void> {
        const index = this.groups.findIndex(candidate => candidate.id === id);
        if (index < 0) {
            return;
        }
        const removed = this.groups[index];
        const stragglers = [...(this.members.get(id) ?? [])];
        const apply = (): void => {
            this.groups = this.groups.filter(candidate => candidate.id !== id);
            this.members.delete(id);
            for (const tab of stragglers) {
                this.insertCardLocal(tab, null);
            }
            if (this.activeGroupId === id) {
                this.activeGroupId = undefined;
            }
        };
        const revert = (): void => {
            this.groups = [...this.groups.slice(0, index), removed, ...this.groups.slice(index)];
            this.members.set(id, stragglers);
            for (const tab of stragglers) {
                this.removeCardLocal(tab.uri);
            }
            this.ungrouped = this.ungrouped.filter(tab => !stragglers.some(other => other.uri === tab.uri));
        };
        await this.persist(`dissolve:${id}`, apply, revert, () => client.mutate({ kind: 'dissolveGroup', id }));
    }

    /** Closes exactly one group's tabs and removes its box (destructive). */
    async closeGroup(client: GroupActorClient, id: string): Promise<{ name: string; count: number } | undefined> {
        const index = this.groups.findIndex(candidate => candidate.id === id);
        if (index < 0) {
            return undefined;
        }
        const removed = this.groups[index];
        const tabs = [...(this.members.get(id) ?? [])];
        const wasActive = this.activeGroupId === id;
        const priorActive = this.activeGroupId;
        const apply = (): void => {
            this.groups = this.groups.filter(candidate => candidate.id !== id);
            this.members.delete(id);
            this.ungrouped = this.ungrouped.filter(tab => !tabs.some(other => other.uri === tab.uri));
            this.activeGroupId = wasActive ? this.groups[0]?.id : this.activeGroupId;
            for (const group of this.groups) {
                group.isActive = group.id === this.activeGroupId;
            }
        };
        const revert = (): void => {
            this.groups = [...this.groups.slice(0, index), removed, ...this.groups.slice(index)];
            this.members.set(id, tabs);
            this.activeGroupId = priorActive;
            for (const group of this.groups) {
                group.isActive = group.id === priorActive;
            }
        };
        await this.persist(`close:${id}`, apply, revert, () => client.mutate({ kind: 'closeGroup', id }));
        return { name: removed.title, count: tabs.length };
    }

    /** Marks one group active (accent border + title 600, persisted). */
    async setActiveGroup(client: GroupActorClient, id: string): Promise<void> {
        if (this.activeGroupId === id) {
            return;
        }
        if (!this.groups.some(group => group.id === id)) {
            return;
        }
        const prior = this.activeGroupId;
        const apply = (): void => {
            this.activeGroupId = id;
            for (const group of this.groups) {
                group.isActive = group.id === id;
            }
        };
        const revert = (): void => {
            this.activeGroupId = prior;
            for (const group of this.groups) {
                group.isActive = group.id === prior;
            }
        };
        await this.persist(`active:${id}`, apply, revert, () => client.mutate({ kind: 'setActiveGroup', id }));
    }

    /**
     * Replays every pending write once (save-error Retry). Entries that fail
     * again revert their painted change and clear; entries that succeed
     * clear. Throws the first replay error so the save-error bar stays up.
     */
    async retryPending(client: GroupActorClient): Promise<void> {
        const entries = [...this.pendingWrites.entries()];
        if (!entries.length) {
            return;
        }
        let firstError: unknown;
        for (const [key, current] of entries) {
            try {
                await current.write();
                if (this.pendingWrites.get(key) === current) {
                    this.pendingWrites.delete(key);
                }
            } catch (error) {
                current.attempts += 1;
                if (current.attempts >= 2) {
                    current.revert();
                    this.pendingWrites.delete(key);
                }
                if (firstError === undefined) {
                    firstError = error;
                }
            }
        }
        this.changeEmitter.fire();
        if (firstError !== undefined) {
            throw firstError;
        }
    }

    private async persist(key: string, apply: () => void, revert: () => void, write: () => Promise<unknown>): Promise<void> {
        apply();
        this.changeEmitter.fire();
        let slot = this.pendingWrites.get(key);
        if (!slot) {
            slot = { attempts: 0, revert, write };
            if (this.pendingWrites.size >= GroupModel.PENDING_WRITES_MAX) {
                const oldest = this.pendingWrites.keys().next();
                if (!oldest.done) {
                    this.pendingWrites.delete(oldest.value);
                }
            }
            this.pendingWrites.set(key, slot);
        }
        try {
            await write();
            this.pendingWrites.delete(key);
        } catch (error) {
            slot.attempts += 1;
            if (slot.attempts >= 2) {
                revert();
                this.changeEmitter.fire();
                this.pendingWrites.delete(key);
            }
            throw error;
        }
    }

    private locateCard(uri: string): { groupId: string | null; card: PanoramaTab } | undefined {
        for (const [groupId, tabs] of this.members) {
            const card = tabs.find(tab => tab.uri === uri);
            if (card) {
                return { groupId, card };
            }
        }
        const tray = this.ungrouped.find(tab => tab.uri === uri);
        return tray ? { groupId: null, card: tray } : undefined;
    }

    private removeCardLocal(uri: string): void {
        for (const [groupId, tabs] of this.members) {
            const at = tabs.findIndex(tab => tab.uri === uri);
            if (at >= 0) {
                this.members.set(groupId, [...tabs.slice(0, at), ...tabs.slice(at + 1)]);
                return;
            }
        }
        this.ungrouped = this.ungrouped.filter(tab => tab.uri !== uri);
    }

    private insertCardLocal(card: PanoramaTab, groupId: string | null, index?: number): void {
        if (groupId === null) {
            if (!this.ungrouped.some(tab => tab.uri === card.uri)) {
                this.ungrouped = [...this.ungrouped, card];
            }
            return;
        }
        const tabs = this.members.get(groupId);
        if (!tabs || tabs.some(tab => tab.uri === card.uri)) {
            return;
        }
        const at = index === undefined ? tabs.length : Math.max(0, Math.min(tabs.length, index));
        this.members.set(groupId, [...tabs.slice(0, at), card, ...tabs.slice(at)]);
    }

    private parseGroup(raw: unknown): PanoramaGroup | undefined {
        if (!raw || typeof raw !== 'object') {
            return undefined;
        }
        const row = raw as Record<string, unknown>;
        if (typeof row.id !== 'string' || !row.id) {
            return undefined;
        }
        const title = typeof row.title === 'string' && row.title.trim()
            ? row.title.trim().slice(0, GROUP_TITLE_MAX_CHARS)
            : UNTITLED_GROUP_TITLE;
        return {
            id: row.id,
            title,
            x: Math.max(0, toFinite(row.x, 0)),
            y: Math.max(0, toFinite(row.y, 0)),
            w: Math.max(GROUP_BOX_MIN_W, toFinite(row.w, 400)),
            h: Math.max(GROUP_BOX_MIN_H, toFinite(row.h, 300)),
            isActive: row.is_active === 1,
        };
    }

    private parseTab(raw: unknown): PanoramaTab | undefined {
        if (!raw || typeof raw !== 'object') {
            return undefined;
        }
        const row = raw as Record<string, unknown>;
        if (typeof row.uri !== 'string' || !row.uri) {
            return undefined;
        }
        const placed = (value: unknown): number | undefined => {
            const n = typeof value === 'number' ? value : Number(value);
            return value === null || value === undefined || !Number.isFinite(n) ? undefined : Math.max(0, Math.floor(n));
        };
        return {
            uri: row.uri,
            url: typeof row.url === 'string' ? row.url : '',
            title: typeof row.title === 'string' && row.title ? row.title : row.uri,
            thumbnail: typeof row.thumbnail === 'string' && row.thumbnail ? row.thumbnail : null,
            x: placed(row.x),
            y: placed(row.y),
        };
    }
}

export type { GroupMutation };
