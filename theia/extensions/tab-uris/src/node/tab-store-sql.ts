/**
 * NG-025 (non-GUI wave B): read-only SQL over tabs.sqlite for the store
 * endpoint.
 *
 * Each statement runs in its own worker thread, so a slow statement never
 * blocks the backend's event loop, which every Theia RPC shares. The worker
 * opens its own readonly handle -- the second-writer gate admits a
 * `new Database(` line under theia/ only with a `readonly: true` literal on
 * it -- and refuses anything but one read-only statement that returns rows.
 * Words that reach past this file or reconfigure the connection are refused
 * before the worker starts, wherever they appear in the text.
 */
import { Worker } from 'worker_threads';

export const SQL_TIME_LIMIT_MS = 5000;
export const SQL_MAX_ROWS = 1000;
export const SQL_MAX_BYTES = 8 * 1024 * 1024;
export const SQL_MAX_RUNNING = 2;
const SQL_MAX_CHARS = 10000;
const REFUSED_WORDS = /\b(attach|detach|vacuum|pragma|load_extension)\b/i;

export interface SqlResult {
    columns: string[];
    rows: Record<string, unknown>[];
    truncated: boolean;
}

// Plain CommonJS for an eval worker: it cannot import this bundle, so the
// SQLite binding's resolved path arrives in workerData.
const WORKER_SOURCE = `
const { parentPort, workerData } = require('worker_threads');
const Database = require(workerData.modulePath);
let db;
try {
    db = new Database(workerData.file, { readonly: true, fileMustExist: true });
    const stmt = db.prepare(workerData.sql);
    if (!stmt.reader || !stmt.readonly) {
        throw new Error('only one read-only statement that returns rows is allowed');
    }
    const rows = [];
    let bytes = 0;
    let truncated = false;
    for (const row of stmt.iterate(...workerData.params)) {
        bytes += JSON.stringify(row).length;
        if (rows.length === workerData.maxRows || bytes > workerData.maxBytes) {
            truncated = true;
            break;
        }
        rows.push(row);
    }
    parentPort.postMessage({ ok: true, columns: stmt.columns().map(c => c.name), rows, truncated });
} catch (err) {
    parentPort.postMessage({ ok: false, message: String((err && err.message) || err) });
} finally {
    try { if (db) { db.close(); } } catch (e) { /* closing is best-effort */ }
}
`;

let running = 0;

/** Runs one read-only statement against `file`; rejects with a message the endpoint hands back as a tool error. */
export async function runReadOnlySql(file: string, sql: unknown, params: unknown): Promise<SqlResult> {
    if (typeof sql !== 'string' || !sql.trim() || sql.length > SQL_MAX_CHARS) {
        throw new Error(`sql must be one statement of 1 to ${SQL_MAX_CHARS} characters`);
    }
    if (REFUSED_WORDS.test(sql)) {
        throw new Error("ATTACH, DETACH, VACUUM, PRAGMA and load_extension are refused; read the schema with pragma_table_info('tabs') instead");
    }
    const bound = params === undefined ? [] : params;
    if (!Array.isArray(bound) || bound.length > 100 || !bound.every(v => v === null || typeof v === 'string' || typeof v === 'number')) {
        throw new Error('params must be an array of at most 100 strings, numbers or nulls');
    }
    if (running >= SQL_MAX_RUNNING) {
        throw new Error(`${SQL_MAX_RUNNING} statements are already running; retry when one finishes`);
    }
    running += 1;
    const worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: { modulePath: require.resolve('better-sqlite3'), file, sql, params: bound, maxRows: SQL_MAX_ROWS, maxBytes: SQL_MAX_BYTES },
    });
    worker.once('exit', () => { running -= 1; });
    try {
        return await new Promise<SqlResult>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`the statement ran past the ${SQL_TIME_LIMIT_MS / 1000} s time limit`)), SQL_TIME_LIMIT_MS);
            worker.once('message', (m: { ok: boolean; message?: string; columns: string[]; rows: Record<string, unknown>[]; truncated: boolean }) => {
                clearTimeout(timer);
                if (m.ok) {
                    resolve({ columns: m.columns, rows: m.rows, truncated: m.truncated });
                } else {
                    reject(new Error(m.message));
                }
            });
            worker.once('error', err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    } finally {
        // ponytail: the bundled SQLite is built without the progress callback and
        // exposes no interrupt, so terminate() lands only when the statement
        // returns; a runaway statement holds one of the SQL_MAX_RUNNING slots
        // until then. Add sqlite3_interrupt when the binding exposes it.
        void worker.terminate();
    }
}
