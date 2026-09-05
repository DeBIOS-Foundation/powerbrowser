/**
 * SQL-04 (12-02): readonly tab-row query service, beside the registry.
 *
 * Holds the single Theia-backend handle on the dedicated `tabs.sqlite`
 * file, opened with the engine readonly flag at open time and asserted via
 * the handle's own readonly property -- never a read-write open, never any
 * profile database but the dedicated file (AUTHORITY.md row 4). Chrome-side
 * `PowerBrowserAPI` remains the sole writer; this service only serves rows
 * the writer wrote.
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

/** The dedicated store filename: fixed platform content, never configured. */
export const TAB_QUERY_FILE_NAME = 'tabs.sqlite';

@injectable()
export class TabQueryService {
    private db: Database.Database | null = null;

    constructor(private profileDir: string = process.env.POWERBROWSER_PROFILE_DIR ?? '') {}

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
    private openIfNeeded(): Database.Database | null {
        if (this.db) {
            return this.db;
        }
        if (!this.profileDir) {
            return null;
        }
        try {
            const db: Database.Database = new Database(join(this.profileDir, TAB_QUERY_FILE_NAME), { readonly: true });
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
     * Resolves [] when the store is not yet readable.
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
}
