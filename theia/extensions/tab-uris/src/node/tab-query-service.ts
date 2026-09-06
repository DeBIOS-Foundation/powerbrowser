/**
 * SQL-04 (12-02): readonly tab-row query service, beside the registry.
 *
 * First consumer landed (13-02): `@powerbrowser/chrome-bar`'s suggestion
 * service reaches this reader over the existing authenticated JSON-RPC
 * channel (`chrome-bar-suggestion-service-impl.ts` delegates to
 * `searchByPrefix` below), so the staged caveat from 12-CODE-REVIEW.md
 * WR-04 no longer applies. The service still exposes no HTTP route and
 * opens no profile database but the dedicated file (AUTHORITY.md row 4).
 * Chrome-side `PowerBrowserAPI` remains the sole writer; this service only
 * serves rows the writer wrote.
 *
 * First-launch tolerance: the backend may start before the chrome writer
 * ever creates the file, and a readonly open of a missing file fails -- so
 * an open failure resolves to an empty answer with a lazy re-open attempt
 * on the next query instead of crashing the backend.
 *
 * Browser-tab lookups apply the beside-registry key rule from
 * `../browser/browser-tab-uri` identically to the chrome-side
 * `browserTabKey`, never a re-spelled copy of it.
 */

import { injectable } from '@theia/core/shared/inversify';
import { join } from 'path';
import Database from 'better-sqlite3';
import { browserTabKeyOf } from '../browser/browser-tab-uri';

/** One projected tab row, mirroring the chrome-side store projection. */
export interface TabQueryRow {
    uri: string;
    url: string;
    title: string;
    last_active: number;
}

/**
 * GUI-08 (15-01): one projected group row, mirroring the chrome-side v2
 * projection (`PowerBrowserAPI.listGroupRows`). `is_active` is 0/1 at the
 * store; the frontend model folds it to boolean.
 */
export interface GroupRow {
    id: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    is_active: number;
}

/**
 * GUI-08 (15-01): one grouped tab row -- the tab projection plus its
 * membership key and last-view snapshot bytes (NULL/absent means the
 * contracted text fallback, never a broken-image glyph).
 */
export interface GroupTabRow extends TabQueryRow {
    group_id: string | null;
    thumbnail: string | null;
}

/**
 * Neutralises LIKE metacharacters so typed text matches literally.
 * Binding the pattern blocks SQL injection, but `%`/`_`/`\` stay wildcards
 * inside the pattern itself (Pitfall 3: an unescaped `%` degrades the query
 * to a full-table dump) -- hence the escape before wrapping plus the
 * explicit `ESCAPE '\'` clause at the call site.
 */
function escapeLikePattern(raw: string): string {
    return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** The dedicated store filename: fixed platform content, never configured. */
export const TAB_QUERY_FILE_NAME = 'tabs.sqlite';

@injectable()
export class TabQueryService {
    private db: Database | null = null;

    // No constructor parameter: inversify cannot resolve a bare `string`
    // serviceIdentifier, so a defaulted ctor param throws "No matching
    // bindings" on every websocket connection and the suggestion RPC hangs
    // (stuck shimmer). The supervisor already exports
    // POWERBROWSER_PROFILE_DIR into the backend environment; read it here at
    // construction (per-connection, lazy) and re-point later via
    // setProfileDir.
    private profileDir: string = process.env.POWERBROWSER_PROFILE_DIR ?? '';

    /** Points the reader at a profile directory, resetting any open handle. */
    setProfileDir(dir: string): void {
        if (this.db) {
            try {
                this.db.close();
            } catch {
                // Close is best-effort; the reset below is the point.
            }
            this.db = null;
        }
        this.profileDir = dir;
    }

    /**
     * Opens the readonly handle on first use, retrying after any earlier
     * open failure so a file created later is picked up. Resolves null when
     * no profile directory is known or the file is not yet readable --
     * callers serve empty answers in that case.
     */
    private openIfNeeded(): Database | null {
        if (this.db) {
            return this.db;
        }
        if (!this.profileDir) {
            return null;
        }
        try {
            const db: Database = new Database(join(this.profileDir, TAB_QUERY_FILE_NAME), { readonly: true });
            if (!db.readonly) {
                try {
                    db.close();
                } catch {
                    // Close is best-effort here; the refusal below is the error.
                }
                throw new Error('TabQueryService: readonly flag not honoured by the engine');
            }
            this.db = db;
            return db;
        } catch {
            this.db = null;
            return null;
        }
    }

    /** Point read by opaque URI key; resolves undefined when unreadable. */
    getByUri(uri: string): TabQueryRow | undefined {
        const db = this.openIfNeeded();
        if (!db) {
            return undefined;
        }
        try {
            const row = db.prepare('SELECT uri, url, title, last_active FROM tabs WHERE uri = ?').get(uri) as TabQueryRow | undefined;
            return row;
        } catch {
            return undefined;
        }
    }

    /**
     * Browser-tab point read: applies the beside-registry key rule to the
     * URL spec, then serves the same point read the writer keyed.
     */
    getBrowserTabByUrl(urlSpec: string): TabQueryRow | undefined {
        return this.getByUri(browserTabKeyOf(urlSpec));
    }

    /**
     * Recency-ordered listing, newest first, capped at `limit` rows.
     * Resolves [] when the store is not yet readable. Ordering contract
     * (IN-02, 12-CODE-REVIEW.md): recency serves UI reads; the chrome-side
     * listTabRows orders by URI for sweep set-equality instead. One order
     * per consumer, documented at both sites.
     */
    listByRecency(limit: number): TabQueryRow[] {
        const db = this.openIfNeeded();
        if (!db) {
            return [];
        }
        try {
            return db.prepare('SELECT uri, url, title, last_active FROM tabs ORDER BY last_active DESC LIMIT ?').all(limit) as TabQueryRow[];
        } catch {
            return [];
        }
    }

    /**
     * Prefix-substring search over the address and title columns, newest
     * first, capped at the caller-supplied `limit` rows. "Prefix" names the
     * user's typed input, matched anywhere in either column (substring
     * semantics, never anchored to column start). The pattern is
     * escaped (see `escapeLikePattern`) before wrapping, bound twice, and
     * read under an explicit `ESCAPE '\'` clause; the limit is bound, never
     * interpolated. Resolves [] when the store is not yet readable or the
     * query fails -- the same never-throw convention as the point reads and
     * the recency listing. Follows the UI side of the ordering contract
     * (IN-02): recency serves UI reads.
     */
    searchByPrefix(prefix: string, limit: number): TabQueryRow[] {
        const db = this.openIfNeeded();
        if (!db) {
            return [];
        }
        try {
            const pattern = `%${escapeLikePattern(prefix)}%`;
            return db.prepare(
                'SELECT uri, url, title, last_active FROM tabs WHERE url LIKE ? ESCAPE \'\\\' OR title LIKE ? ESCAPE \'\\\' ORDER BY last_active DESC LIMIT ?'
            ).all(pattern, pattern, limit) as TabQueryRow[];
        } catch {
            return [];
        }
    }

    /**
     * GUI-08 (15-01): group listing in insertion order over the SAME lazy
     * readonly handle above -- never a second open. Resolves [] when the
     * store is unreadable OR still v1 (no groups table): the never-throw
     * convention degrades that to the contracted empty copy, never an
     * exception in UI paths.
     */
    async listGroups(): Promise<GroupRow[]> {
        const db = this.openIfNeeded();
        if (!db) {
            return [];
        }
        try {
            return db.prepare('SELECT id, title, x, y, w, h, is_active FROM groups ORDER BY rowid').all() as GroupRow[];
        } catch {
            return [];
        }
    }

    /**
     * GUI-08 (15-01): one group's tab rows in URI order (the sweep's
     * set-equality order, matching the chrome-side `getGroupTabs`). Bound
     * parameter, never throws -- resolves [] like every other read here.
     */
    async getGroupTabs(groupId: string): Promise<GroupTabRow[]> {
        const db = this.openIfNeeded();
        if (!db) {
            return [];
        }
        try {
            return db.prepare(
                'SELECT uri, url, title, last_active, group_id, thumbnail FROM tabs WHERE group_id = ? ORDER BY uri'
            ).all(groupId) as GroupTabRow[];
        } catch {
            return [];
        }
    }

    /**
     * GUI-08 (15-01): one tab's snapshot bytes by opaque URI key. Resolves
     * undefined when unreadable or absent -- the card paints its title + URI
     * block alone in that case (contracted text fallback).
     */    async getThumbnail(uri: string): Promise<string | undefined> {
        const db = this.openIfNeeded();
        if (!db) {
            return undefined;
        }
        try {
            const row = db.prepare('SELECT thumbnail FROM tabs WHERE uri = ?').get(uri) as { thumbnail: string | null } | undefined;
            return row?.thumbnail ?? undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * GUI-08 (15-01): tray listing -- tab rows with no group, newest first.
     * Same lazy readonly handle, bound params, never throws. Without this
     * the always-rendered Ungrouped tray has no data source.
     */
    async listUngroupedTabs(): Promise<GroupTabRow[]> {
        const db = this.openIfNeeded();
        if (!db) {
            return [];
        }
        try {
            return db.prepare(
                'SELECT uri, url, title, last_active, group_id, thumbnail FROM tabs WHERE group_id IS NULL ORDER BY last_active DESC'
            ).all() as GroupTabRow[];
        } catch {
            return [];
        }
    }}
