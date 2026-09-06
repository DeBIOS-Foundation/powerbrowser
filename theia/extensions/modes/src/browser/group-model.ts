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
        return this.groups;
    }

    getTabs(groupId: string): readonly PanoramaTab[] {
        return this.members.get(groupId) ?? [];
    }

    listUngrouped(): readonly PanoramaTab[] {
        return this.ungrouped;
    }

    getActiveGroupId(): string | undefined {
        return this.activeGroupId;
    }

    /**
     * Loads groups, membership, and the tray from the reader. Total parse:
     * unparseable rows are dropped, a corrupt payload lands the contracted
     * empty state, and failures resolve with loadFailed set -- never throws.
     */
    async load(reader: GroupQueryService): Promise<void> {
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

    /** Creates a box titled Untitled group; the widget puts it in edit mode. */
    async createGroup(client: GroupActorClient, at?: { x: number; y: number }): Promise<PanoramaGroup> {
        const group: PanoramaGroup = {
            id: `group-${Date.now().toString(36)}-${Math.floor(Math.random() * 0x100000).toString(36)}`,
            title: UNTITLED_GROUP_TITLE,
            x: Math.max(0, Math.floor(at?.x ?? 24)),
            y: Math.max(0, Math.floor(at?.y ?? 24)),
            w: 400,
            h: 300,
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
                await client.mutate({ kind: 'setTabGroup', uri: placement.uri, groupId: group.id });
            }
        });
        return group;
    }

    /**
     * Relocates one card between a box and the tray (or box to box). When
     * the source box ends up empty the caller follows with dissolveGroup --
     * the last-card-out gesture -- so nothing is orphaned.
     */
    async moveCard(client: GroupActorClient, uri: string, toGroupId: string | null): Promise<void> {
        const from = this.locateCard(uri);
        if (!from) {
            return;
        }
        if (from.groupId === toGroupId) {
            return;
        }
        const card = from.card;
        const apply = (): void => {
            this.removeCardLocal(uri);
            this.insertCardLocal(card, toGroupId);
        };
        const revert = (): void => {
            this.removeCardLocal(uri);
            this.insertCardLocal(card, from.groupId);
        };
        await this.persist(`card:${uri}`, apply, revert, () =>
            client.mutate({ kind: 'setTabGroup', uri, groupId: toGroupId }));
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

    private insertCardLocal(card: PanoramaTab, groupId: string | null): void {
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
        this.members.set(groupId, [...tabs, card]);
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
        return {
            uri: row.uri,
            url: typeof row.url === 'string' ? row.url : '',
            title: typeof row.title === 'string' && row.title ? row.title : row.uri,
            thumbnail: typeof row.thumbnail === 'string' && row.thumbnail ? row.thumbnail : null,
        };
    }
}

export type { GroupMutation };
