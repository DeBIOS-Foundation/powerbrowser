// scripts/lib/tab-store-fixtures.mjs
//
// tabs.sqlite fixtures for wave A's checks (non-GUI build). A fixture at schema
// version N is built from the first N DDL marker blocks in
// powerbrowser/shell/PowerBrowserAPI.sys.mjs -- the text the writer itself
// runs, never a copy -- so a check can hand the real browser a store exactly as
// an older build left it. Files are opened read-write only under a stage from
// newStage() or a check's own throwaway profile before its first launch; a
// live store is read with readStore() and never written while its browser runs.

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = join(REPO_ROOT, 'powerbrowser/shell/PowerBrowserAPI.sys.mjs');
const readApi = () => readFileSync(API, 'utf8');

/** A space-free stage directory outside the repo. */
export function newStage(name) {
    const dir = mkdtempSync(join(tmpdir(), `pb-${name}-`));
    if (/\s/.test(dir)) {
        throw new Error(`stage path contains a space: ${dir}`);
    }
    return dir;
}

/** The DDL marker blocks in source order: block N (1-based) is schema version N. */
export function versionBlocks(src = readApi()) {
    return [...src.matchAll(/PB-SQL-([A-Z0-9]+)-DDL-START \*\/ `([\s\S]*?)` \/\* PB-SQL-\1-DDL-END/g)]
        .map(m => ({ name: m[1], statements: m[2].split(';').map(s => s.trim()).filter(Boolean) }));
}

export function schemaHead(src = readApi()) {
    const m = /const TAB_STORE_SCHEMA_HEAD = (\d+);/.exec(src);
    if (!m) {
        throw new Error('TAB_STORE_SCHEMA_HEAD not found in PowerBrowserAPI.sys.mjs');
    }
    return Number(m[1]);
}

/** Every column the tabs table has at `version`: the CREATE's columns plus each ADD COLUMN. */
export function tabColumnsAt(version, src = readApi()) {
    const columns = [];
    for (const block of versionBlocks(src).slice(0, version)) {
        for (const statement of block.statements) {
            if (/^create table tabs\b/i.test(statement)) {
                for (const m of statement.matchAll(/^\s*([a-z_]+)\s+(?:TEXT|INTEGER)\b/gim)) {
                    columns.push(m[1]);
                }
            }
            const added = /^alter table tabs add column (\w+)/i.exec(statement);
            if (added) {
                columns.push(added[1]);
            }
        }
    }
    return columns;
}

function withDb(path, fn) {
    const db = new DatabaseSync(path);
    try {
        return fn(db);
    } finally {
        db.close();
    }
}

const has = (db, type, name) => !!db.prepare('SELECT 1 FROM sqlite_schema WHERE type = ? AND name = ?').get(type, name);
const columnsOfDb = (db, table) => db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);

/**
 * Writes a store at schema `version` to `path`: the first `version` marker
 * blocks, user_version stamped, then the seed. A seed field the version has
 * no column for is dropped, so one seed serves every version. `settings` rows
 * go into a settings table, created inert when the version has none.
 */
export function buildStore(path, version, { tabs = [], groups = [], settings = {} } = {}) {
    const blocks = versionBlocks();
    if (version > blocks.length) {
        throw new Error(`no DDL marker block for schema version ${version} (the writer has ${blocks.length})`);
    }
    withDb(path, db => {
        db.exec('PRAGMA journal_mode=WAL');
        for (const block of blocks.slice(0, version)) {
            for (const statement of block.statements) {
                db.exec(statement);
            }
        }
        db.exec(`PRAGMA user_version = ${version}`);
        const insert = (table, row) => {
            if (!has(db, 'table', table)) {
                return;
            }
            const cols = new Set(columnsOfDb(db, table));
            const keys = Object.keys(row).filter(key => cols.has(key));
            db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
                .run(...keys.map(key => row[key]));
        };
        groups.forEach(row => insert('groups', row));
        tabs.forEach(row => insert('tabs', row));
        if (Object.keys(settings).length) {
            db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
            for (const [key, value] of Object.entries(settings)) {
                db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
            }
        }
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    });
}

export function setUserVersion(path, version) {
    withDb(path, db => {
        db.exec(`PRAGMA user_version = ${Number(version)}`);
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    });
}

export function integrityOk(path, pragma = 'integrity_check') {
    try {
        return withDb(path, db => {
            const rows = db.prepare(`PRAGMA ${pragma}`).all().map(r => Object.values(r)[0]);
            return rows.length === 1 && rows[0] === 'ok';
        });
    } catch {
        return false;
    }
}

/** Fills page 2 with 0xff: the header stays readable and quick_check trips (the phase-11 exercise's control C). */
export function tamperBodyPage(path) {
    const buf = readFileSync(path);
    const raw = buf.readUInt16BE(16);
    const pageSize = raw === 1 ? 65536 : raw;
    if (buf.length < pageSize * 2) {
        throw new Error(`${path} has fewer than two pages; the tamper cannot land`);
    }
    buf.fill(0xff, pageSize, pageSize * 2);
    writeFileSync(path, buf);
    if (integrityOk(path, 'quick_check')) {
        throw new Error('the page-2 tamper did not trip quick_check');
    }
}

/**
 * Changes one idx_tabs_last_active entry so quick_check passes and
 * integrity_check does not -- the fault only the full check finds. The store
 * must hold its tabs row with rowid 1 at last_active 77.
 */
export function plantIndexMismatch(path) {
    const { root, pageSize } = withDb(path, db => ({
        root: db.prepare("SELECT rootpage FROM sqlite_schema WHERE name = 'idx_tabs_last_active'").get().rootpage,
        pageSize: db.prepare('PRAGMA page_size').get().page_size,
    }));
    const buf = readFileSync(path);
    const page = buf.subarray((root - 1) * pageSize, root * pageSize);
    // Index record (last_active, rowid): header size 3, serial type 1 (int8),
    // serial type 9 (the constant 1), then the int8 value 77.
    const at = page.indexOf(Buffer.from([0x03, 0x01, 0x09, 77]));
    if (at < 0) {
        throw new Error('no idx_tabs_last_active entry for rowid 1 at last_active 77; seed that row first');
    }
    page[at + 3] = 78;
    writeFileSync(path, buf);
    if (!integrityOk(path, 'quick_check') || integrityOk(path, 'integrity_check')) {
        throw new Error('the index plant did not land: want quick_check ok and integrity_check not ok');
    }
}

/** The store as a check sees it from outside: version, rows (with row_id), groups, settings. */
export function readStore(path) {
    if (!existsSync(path)) {
        return { version: null, tabs: [], groups: [], settings: {} };
    }
    const db = new DatabaseSync(path, { readOnly: true });
    try {
        const table = name => has(db, 'table', name);
        return {
            version: db.prepare('PRAGMA user_version').get().user_version,
            tabs: table('tabs') ? db.prepare('SELECT rowid AS row_id, * FROM tabs ORDER BY rowid').all() : [],
            groups: table('groups') ? db.prepare('SELECT rowid AS row_id, * FROM groups ORDER BY rowid').all() : [],
            settings: table('settings')
                ? Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value]))
                : {},
        };
    } finally {
        db.close();
    }
}

export function columnsOf(path, table) {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
        return columnsOfDb(db, table);
    } finally {
        db.close();
    }
}
