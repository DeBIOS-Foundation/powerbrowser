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
 * NG-012: a store it cannot read -- no profile directory, a missing or
 * unopenable file, a `user_version` other than the head it reads -- is an
 * error naming the cause, never an empty answer: an empty answer reads on
 * screen as 'no tabs', and the Organising load and the chrome-bar provider
 * each have a contracted error state for exactly this.
 *
 * Rows are keyed by tab identity (docs/TAB-STORE.md); the page address is
 * the `url` column. Panorama and suggestion reads serve open rows only
 * (`closed_at IS NULL`).
 */

import { injectable } from '@theia/core/shared/inversify';
import { statSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { POWERBROWSER_ENV } from '@powerbrowser/token-gate/lib/node/powerbrowser-env';

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
    /**
     * Where a loose tab was last placed on the canvas, or NULL for one that
     * has never been placed -- those the canvas lays out along the bottom
     * itself, so an upgraded profile invents no coordinates.
     */
    x: number | null;
    y: number | null;
    /**
     * Place within the group, or NULL for a tab never arranged by hand --
     * those sort after the arranged ones, so an existing store keeps its URI
     * order until a group is first rearranged.
     */
    ord: number | null;
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

/**
 * NG-012: the schema version this reader is written against. It must equal
 * PowerBrowserAPI.sys.mjs's TAB_STORE_SCHEMA_HEAD; gui08-persistence-roundtrip
 * compares the two, so a head move without a reader change fails --quick.
 */
export const TAB_STORE_SCHEMA_HEAD = 5;

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

@injectable()
export class TabQueryService {
    private db: Database | null = null;
    /** The inode of the file `db` opened; a quarantine rebuild replaces the file under it (I2). */
    private dbInode: number | undefined;

    // No constructor parameter: inversify cannot resolve a bare `string`
    // serviceIdentifier, so a defaulted ctor param throws "No matching
    // bindings" on every websocket connection and the suggestion RPC hangs
    // (stuck shimmer). The supervisor already exports
    // POWERBROWSER_PROFILE_DIR into the backend environment; read it here at
    // construction and re-point later via setProfileDir.
    //
    // POWERBROWSER_ENV, never `process.env`. token-gate's powerbrowser-env.ts
    // captures every POWERBROWSER_*-prefixed key and DELETES it out of
    // process.env at module load, so the supervisor's handshake is not
    // inherited by every terminal, task, debug adapter and plugin host the
    // backend later forks. Its own doc comment states the rule this line used
    // to break -- "every reader ... must use this instead of process.env --
    // reading process.env directly would find nothing" -- and it found
    // nothing: the scrub runs when token-gate's backend module is loaded
    // (src-gen/backend/server.js:64), thirty-one loads ahead of this
    // extension's (:95), so the read resolved to '' on every launch,
    // openIfNeeded() bailed on the empty profileDir, and listGroups() /
    // getGroupTabs() / listUngroupedTabs() served [] unconditionally. That
    // reads on screen as the contracted empty state, which is why an
    // unconditional blindness bug looked like an absence of data.
    //
    // Construction time is safe, and NOT merely because of that load order:
    // the import above is itself the ordering guarantee. Requiring
    // powerbrowser-env runs its capture to completion before this module's
    // class body is evaluated, so `captured` is populated whichever
    // extension reaches it first. A deferred read would buy nothing.
    private profileDir: string = POWERBROWSER_ENV['POWERBROWSER_PROFILE_DIR'] ?? '';

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
     * Opens the readonly handle on first use; throws naming why it cannot.
     * Nothing is cached on failure, so a file the writer creates or
     * migrates later is picked up by the next read.
     */
    private openIfNeeded(): Database {
        if (this.db) {
            return this.db;
        }
        if (!this.profileDir) {
            throw new Error('TabQueryService: no profile directory is known, so tabs.sqlite cannot be read');
        }
        let db: Database;
        try {
            db = new Database(join(this.profileDir, TAB_QUERY_FILE_NAME), { readonly: true, fileMustExist: true });
        } catch (error) {
            throw new Error(`TabQueryService: tabs.sqlite cannot be opened: ${messageOf(error)}`);
        }
        const refuse = (message: string): Error => {
            try {
                db.close();
            } catch {
                // Close is best-effort; the error is the point.
            }
            return new Error(`TabQueryService: ${message}`);
        };
        if (!db.readonly) {
            throw refuse('readonly flag not honoured by the engine');
        }
        let version: number;
        try {
            // A file that is not a database opens without complaint and fails
            // here, at its first read (SQLITE_NOTADB).
            version = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
        } catch (error) {
            throw refuse(`tabs.sqlite cannot be opened: ${messageOf(error)}`);
        }
        if (version !== TAB_STORE_SCHEMA_HEAD) {
            throw refuse(`tabs.sqlite is at schema version ${version}; this build reads version ${TAB_STORE_SCHEMA_HEAD}`);
        }
        this.db = db;
        this.dbInode = this.storeInode();
        return db;
    }

    /**
     * One read. A failure drops the handle -- a quarantine rebuild may have
     * replaced the file under it -- and rethrows naming the read.
     */
    private read<T>(what: string, query: (db: Database) => T): T {
        // I2: a mid-session quarantine unlinks the file and rebuilds a new one;
        // one stat per read notices and reopens on the new file.
        if (this.db && this.storeInode() !== this.dbInode) {
            this.setProfileDir(this.profileDir);
        }
        const db = this.openIfNeeded();
        try {
            return query(db);
        } catch (error) {
            this.setProfileDir(this.profileDir);
            throw new Error(`TabQueryService: ${what} failed: ${messageOf(error)}`);
        }
    }

    private storeInode(): number | undefined {
        try {
            return statSync(join(this.profileDir, TAB_QUERY_FILE_NAME)).ino;
        } catch {
            return undefined;
        }
    }

    /** Point read by opaque URI key. Throws when the store cannot be read (NG-012). */
    getByUri(uri: string): TabQueryRow | undefined {
        return this.read('getByUri', db => db.prepare('SELECT uri, url, title, last_active FROM tabs WHERE uri = ?').get(uri) as TabQueryRow | undefined);
    }

    /**
     * The open row showing `urlSpec`, most recently active first. The page
     * address is a column to match, never a key to rebuild (NG-001).
     * Throws when the store cannot be read (NG-012).
     */
    getBrowserTabByUrl(urlSpec: string): TabQueryRow | undefined {
        return this.read('getBrowserTabByUrl', db => db.prepare('SELECT uri, url, title, last_active FROM tabs WHERE url = ? AND closed_at IS NULL ORDER BY last_active DESC LIMIT 1').get(urlSpec) as TabQueryRow | undefined);
    }

    /**
     * Recency-ordered listing, newest first, capped at `limit` rows.
     * Throws when the store cannot be read (NG-012). Ordering contract
     * (IN-02, 12-CODE-REVIEW.md): recency serves UI reads; the chrome-side
     * listTabRows orders by URI for sweep set-equality instead. One order
     * per consumer, documented at both sites.
     */
    listByRecency(limit: number): TabQueryRow[] {
        return this.read('listByRecency', db => db.prepare('SELECT uri, url, title, last_active FROM tabs ORDER BY last_active DESC LIMIT ?').all(limit) as TabQueryRow[]);
    }

    /**
     * Prefix-substring search over the address and title columns, newest
     * first, capped at the caller-supplied `limit` rows. "Prefix" names the
     * user's typed input, matched anywhere in either column (substring
     * semantics, never anchored to column start). The pattern is
     * escaped (see `escapeLikePattern`) before wrapping, bound twice, and
     * read under an explicit `ESCAPE '\'` clause; the limit is bound, never
     * interpolated. Throws when the store cannot be read (NG-012); the
     * chrome bar shows its provider-failure row. Follows the UI side of the
     * ordering contract (IN-02): recency serves UI reads. Open http(s) rows
     * only (NG-001): a closed tab is history, and an editor's or a New Tab's
     * row has no page.
     */
    searchByPrefix(prefix: string, limit: number): TabQueryRow[] {
        return this.read('searchByPrefix', db => {
            const pattern = `%${escapeLikePattern(prefix)}%`;
            return db.prepare(
                'SELECT uri, url, title, last_active FROM tabs WHERE (url LIKE ? ESCAPE \'\\\' OR title LIKE ? ESCAPE \'\\\') AND closed_at IS NULL AND url LIKE \'http%\' ORDER BY last_active DESC LIMIT ?'
            ).all(pattern, pattern, limit) as TabQueryRow[];
        });
    }

    /**
     * GUI-08 (15-01): group listing in insertion order over the SAME lazy
     * readonly handle above -- never a second open. Throws when the store
     * cannot be read (NG-012); the Organising load shows its load-error state.
     */
    async listGroups(): Promise<GroupRow[]> {
        return this.read('listGroups', db => db.prepare('SELECT id, title, x, y, w, h, is_active FROM groups ORDER BY rowid').all() as GroupRow[]);
    }

    /**
     * GUI-08 (15-01): one group's tab rows in their arranged order, then URI
     * order (matching the chrome-side `getGroupTabs`). Bound parameter.
     * Throws when the store cannot be read (NG-012).
     */
    async getGroupTabs(groupId: string): Promise<GroupTabRow[]> {
        return this.read('getGroupTabs', db => db.prepare(
            'SELECT uri, url, title, last_active, group_id, thumbnail, x, y, ord FROM tabs WHERE group_id = ? AND closed_at IS NULL ORDER BY ord IS NULL, ord, uri'
        ).all(groupId) as GroupTabRow[]);
    }

    /**
     * GUI-08 (15-01): one tab's snapshot bytes by opaque URI key. Resolves
     * undefined when the row or its snapshot is absent -- the card paints its
     * title + URI block alone in that case (contracted text fallback).
     * Throws when the store cannot be read (NG-012).
     */
    async getThumbnail(uri: string): Promise<string | undefined> {
        return this.read('getThumbnail', db => (db.prepare('SELECT thumbnail FROM tabs WHERE uri = ?').get(uri) as { thumbnail: string | null } | undefined)?.thumbnail ?? undefined);
    }

    /**
     * GUI-08 (15-01): tray listing -- tab rows with no group, newest first.
     * Same lazy readonly handle, bound params. Throws when the store cannot
     * be read (NG-012). Without this the always-rendered Ungrouped tray has
     * no data source.
     */
    async listUngroupedTabs(): Promise<GroupTabRow[]> {
        return this.read('listUngroupedTabs', db => db.prepare(
            'SELECT uri, url, title, last_active, group_id, thumbnail, x, y FROM tabs WHERE group_id IS NULL AND closed_at IS NULL ORDER BY last_active DESC'
        ).all() as GroupTabRow[]);
    }

    /** NG-011: the settings table as key -> value, for the restore path and any other reader. */
    async getSettings(): Promise<Record<string, string>> {
        const rows = this.read('getSettings', db => db.prepare('SELECT key, value FROM settings').all()) as { key: string; value: string }[];
        return Object.fromEntries(rows.map(row => [row.key, row.value]));
    }
}
