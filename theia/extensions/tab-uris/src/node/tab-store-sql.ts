/**
 * NG-025 (non-GUI wave B): read-only SQL over tabs.sqlite for the store
 * endpoint.
 *
 * Each statement runs in its own child process, so a slow statement never
 * blocks the backend's event loop, which every Theia RPC shares, and a
 * statement past the time limit is SIGKILLed: a worker thread could not be
 * interrupted mid-step because the SQLite step is native, so the runaway
 * kept its CPU core and one of the SQL_MAX_RUNNING slots until it finished.
 * The child opens its own readonly handle -- the second-writer gate admits a
 * `new Database(` line under theia/ only with a `readonly: true` literal on
 * it -- and refuses anything but one read-only statement that returns rows.
 * Words that reach past this file or reconfigure the connection are refused
 * before the child starts, wherever they appear in the text.
 */
import { spawn } from 'child_process';

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

// Plain CommonJS for a `node -e` child: it cannot import this bundle, so the
// request (including the SQLite binding's resolved path) arrives on stdin and
// the single JSON answer leaves on stdout.
const CHILD_SOURCE = `
const chunks = [];
process.stdin.on('data', c => { chunks.push(c); });
process.stdin.on('end', () => {
    let p;
    try {
        p = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (e) {
        process.stdout.write(JSON.stringify({ ok: false, message: 'invalid request' }));
        return;
    }
    const Database = require(p.modulePath);
    let db;
    try {
        db = new Database(p.file, { readonly: true, fileMustExist: true });
        const stmt = db.prepare(p.sql);
        if (!stmt.reader || !stmt.readonly) {
            throw new Error('only one read-only statement that returns rows is allowed');
        }
        const rows = [];
        let bytes = 0;
        let truncated = false;
        for (const row of stmt.iterate(...p.params)) {
            bytes += JSON.stringify(row).length;
            if (rows.length === p.maxRows || bytes > p.maxBytes) {
                truncated = true;
                break;
            }
            rows.push(row);
        }
        process.stdout.write(JSON.stringify({ ok: true, columns: stmt.columns().map(c => c.name), rows, truncated }));
    } catch (err) {
        process.stdout.write(JSON.stringify({ ok: false, message: String((err && err.message) || err) }));
    } finally {
        try { if (db) { db.close(); } } catch (e) { /* closing is best-effort */ }
    }
});
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
    let child: ReturnType<typeof spawn>;
    try {
        // stderr is ignored: the child reports failures as JSON on stdout,
        // and an unread stderr pipe could block its exit.
        child = spawn(process.execPath, ['-e', CHILD_SOURCE], { stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
    }
    // The slot is taken only after the child exists, and released exactly once
    // on every path below (answer, spawn error, stdin failure, or the limit).
    running += 1;
    let settled = false;
    const release = (): void => {
        if (!settled) {
            settled = true;
            running -= 1;
        }
    };
    try {
        return await new Promise<SqlResult>((resolve, reject) => {
            const timer = setTimeout(() => {
                try {
                    child.kill('SIGKILL');
                } catch {
                    /* already gone; the slot is still freed */
                }
                release();
                reject(new Error(`the statement ran past the ${SQL_TIME_LIMIT_MS / 1000} s time limit`));
            }, SQL_TIME_LIMIT_MS);
            let out = '';
            if (child.stdout) {
                child.stdout.on('data', (c: Buffer) => {
                    out += c.toString('utf8');
                });
            }
            child.on('error', err => {
                clearTimeout(timer);
                release();
                reject(err);
            });
            child.on('close', () => {
                if (settled) {
                    return;
                }
                clearTimeout(timer);
                let m: { ok: boolean; message?: string; columns: string[]; rows: Record<string, unknown>[]; truncated: boolean };
                try {
                    m = JSON.parse(out);
                } catch {
                    release();
                    reject(new Error('the statement ended without answering'));
                    return;
                }
                release();
                if (m.ok) {
                    resolve({ columns: m.columns, rows: m.rows, truncated: m.truncated });
                } else {
                    reject(new Error(m.message));
                }
            });
            try {
                if (!child.stdin) {
                    throw new Error('the statement child started without a stdin pipe');
                }
                child.stdin.end(JSON.stringify({ modulePath: require.resolve('better-sqlite3'), file, sql, params: bound, maxRows: SQL_MAX_ROWS, maxBytes: SQL_MAX_BYTES }));
            } catch (err) {
                clearTimeout(timer);
                try {
                    child.kill('SIGKILL');
                } catch {
                    /* already gone; the slot is still freed */
                }
                release();
                reject(err);
            }
        });
    } finally {
        // The limit path already SIGKILLed; a settled answer leaves a child
        // with no pending handles to exit on its own, so this only hurries a
        // lingerer and never touches a reaped pid (exitCode is set by then).
        try {
            if (child.exitCode === null) {
                child.kill('SIGKILL');
            }
        } catch {
            /* already gone */
        }
    }
}
