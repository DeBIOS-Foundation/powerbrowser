#!/usr/bin/env node
// fixtures/exercise-migrations.mjs
//
// THROWAWAY TEST SCAFFOLDING — not store code, not a verify-platform.sh
// registry row. Exercises the forward-only migration chain from SCHEMA.md /
// MIGRATIONS.md against COPIES of the committed fixtures under a mktemp
// stage outside the repo. Committed fixtures are never written; the live
// profile is never touched. Promotion to a registry row is Phase 12's
// decision.
//
// Engine: standard-library `node:sqlite` first. Only when that import is
// absent does the script re-exec node with the flagged invocation, and only
// when that is absent does it perform an ephemeral registry install
// confined to the stage directory (never touching repo manifests).
//
// Drives: (A) fresh-create from an unset version, (B) idempotent re-run
// over the v1 fixture copy, (C) tampered-copy tripwire firing the
// quarantine path without deletion, (D) stale-version copy advancing
// through the chain. C and D are the non-vacuity controls: they prove the
// assertions can fail (tripwire fires, versions advance) rather than
// passing on an empty drive.

import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const NAME = 'exercise-migrations';
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_V1 = join(HERE, 'tabs-v1.sqlite');
const CURRENT_SCHEMA_VERSION = 1;
const CREATE_TABS_V1_SQL = `CREATE TABLE tabs (
  uri         TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  last_active INTEGER NOT NULL
)`;
const CREATE_INDEX_V1_SQL = `CREATE INDEX idx_tabs_last_active ON tabs (last_active)`;

// --- engine probe: standard library first ----------------------------------

let DatabaseSync = null;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  DatabaseSync = null;
}

if (!DatabaseSync && !process.env.PB_EXERCISE_FLAGGED_RETRY) {
  // Flagged-invocation fallback: one re-exec with the sqlite flag, then stop.
  const retry = spawnSync(process.execPath, ['--experimental-sqlite', ...process.argv.slice(1)], {
    env: { ...process.env, PB_EXERCISE_FLAGGED_RETRY: '1' },
    encoding: 'utf8',
  });
  process.stdout.write(retry.stdout ?? '');
  process.stderr.write(retry.stderr ?? '');
  process.exit(retry.status ?? 1);
}

if (!DatabaseSync) {
  // Ephemeral registry fallback, confined to the stage dir only. This path
  // runs only where the standard library has no database support at all.
  const stage = mkdtempSync(join(tmpdir(), 'pb-tabs-migrate-'));
  const install = spawnSync('npm', ['install', '--no-save', '--prefix', stage, 'better-sqlite3'], {
    encoding: 'utf8',
  });
  if (install.status !== 0) {
    console.error(`${NAME}: FAIL -- no standard-library database support and ephemeral install failed; refusing to touch repo manifests`);
    process.exit(1);
  }
  const { default: Better } = await import(join(stage, 'node_modules', 'better-sqlite3', 'lib', 'index.js'));
  DatabaseSync = Better;
  console.log(`${NAME}: note -- standard-library support absent, using stage-confined ephemeral install at ${stage}`);
}

// --- chain -------------------------------------------------------------------

function getUserVersion(db) {
  return db.prepare('PRAGMA user_version').get().user_version;
}

function tableExists(db, name) {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
  return row !== undefined;
}

function indexExists(db, name) {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`).get(name);
  return row !== undefined;
}

// Forward-only chain to CURRENT_SCHEMA_VERSION. Each migration runs inside
// one transaction with pre-checks; newer-than-current refuses (never
// downgrades). Mirrors the chrome-side procedure (executeTransaction +
// tableExists pre-checks) in throwaway form.
function migrateToV1(db) {
  const v = getUserVersion(db);
  if (v > CURRENT_SCHEMA_VERSION) {
    throw new Error(`refusing downgrade: user_version=${v} is newer than chain head ${CURRENT_SCHEMA_VERSION}`);
  }
  if (v === CURRENT_SCHEMA_VERSION) {
    // Idempotent re-run: pre-checks, create-if-missing inside one transaction.
    // WAL pin precedes the transaction: journal_mode cannot change inside
    // a transaction (silent no-op), so it is set outside it.
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('BEGIN');
    try {
      if (!tableExists(db, 'tabs')) db.exec(CREATE_TABS_V1_SQL);
      if (!indexExists(db, 'idx_tabs_last_active')) db.exec(CREATE_INDEX_V1_SQL);
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }
    return 'rerun';
  }
  // v === 0: fresh-create or stale-version advance through the same v1 step.
  // WAL pin precedes the DDL transaction (journal_mode is immutable inside one).
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('BEGIN');
  try {
    if (!tableExists(db, 'tabs')) db.exec(CREATE_TABS_V1_SQL);
    if (!indexExists(db, 'idx_tabs_last_active')) db.exec(CREATE_INDEX_V1_SQL);
    db.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  return 'migrated';
}

function integrityOk(db) {
  const rows = db.prepare('PRAGMA quick_check').all();
  const values = rows.map((r) => Object.values(r)[0]);
  return values.length === 1 && values[0] === 'ok';
}

function readRows(db) {
  return db.prepare('SELECT uri, url, title, last_active FROM tabs ORDER BY uri').all();
}

function snapshotFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

// --- quarantine (throwaway form of the MIGRATIONS.md procedure) --------------
//
// Tripwire: exact single-'ok' keying on quick_check. On any other result:
// copy the file to a corrupt-suffixed name (chrome uses backupToFile;
// a staged file copy is the throwaway equivalent), remove dependent
// sidecar state, rebuild live rows from the restore-authority row set
// (chrome rebuilds FROM sessionstore plus the registry — here the caller
// passes the pre-tamper live rows as that authority), continue degraded.
// Never deletes: the corrupt copy must still exist afterwards.
// Allocate the next free corrupt-suffixed name: N = max existing suffix + 1,
// starting at 1. Never reuse a suffix — a second incident must not overwrite
// the first forensics (MIGRATIONS.md corruption step 1).
function nextCorruptPath(path) {
  const dir = dirname(path);
  const base = basename(path);
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}\\.corrupt-(\\d+)$`);
  let n = 0;
  for (const f of readdirSync(dir)) {
    const m = f.match(re);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `${path}.corrupt-${n + 1}`;
}

function quarantineAndRebuild(path, restoreRows) {
  let ok = false;
  try {
    const db = new DatabaseSync(path);
    try {
      ok = integrityOk(db);
    } finally {
      db.close();
    }
  } catch {
    ok = false; // unopenable counts as tripped, same as not-ok
  }
  if (ok) return { quarantined: false };
  const corruptPath = nextCorruptPath(path);
  copyFileSync(path, corruptPath); // backup-primitive stand-in: copy, then rebuild
  for (const suffix of ['-wal', '-shm', '-journal']) {
    try { rmSync(path + suffix, { force: true }); } catch {}
  }
  try { rmSync(path, { force: true }); } catch {}
  const fresh = new DatabaseSync(path);
  // WAL pin precedes the rebuild transaction (immutable inside one).
  fresh.exec('PRAGMA journal_mode=WAL');
  try {
    fresh.exec(CREATE_TABS_V1_SQL);
    fresh.exec(CREATE_INDEX_V1_SQL);
    fresh.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    const ins = fresh.prepare('INSERT INTO tabs (uri, url, title, last_active) VALUES (?, ?, ?, ?)');
    for (const r of restoreRows) ins.run(r.uri, r.url, r.title, r.last_active);
  } finally {
    fresh.close();
  }
  return { quarantined: true, corruptPath };
}

// --- harness -------------------------------------------------------------------

const results = [];
let assertions = 0;
function check(id, cond, detail) {
  assertions += 1;
  results.push({ id, pass: !!cond, detail });
  console.log(`${NAME}: drive ${cond ? 'PASS' : 'FAIL'} -- ${id}${cond ? '' : ` -- ${detail}`}`);
}

const stage = mkdtempSync(join(tmpdir(), 'pb-tabs-migrate-'));
if (/\s/.test(stage)) {
  console.error(`${NAME}: FAIL -- stage path contains a space: ${stage}`);
  process.exit(1);
}
console.log(`${NAME}: stage ${stage} (space-free, outside repo)`);

try {
  const fixtureHash = snapshotFile(FIXTURE_V1);
  console.log(`${NAME}: committed fixture sha256 ${fixtureHash}`);
  // Expectations derived at run time from the committed fixture itself.
  const probe = new DatabaseSync(FIXTURE_V1, { readOnly: true });
  let expectedRows;
  let expectedVersion;
  try {
    expectedVersion = getUserVersion(probe);
    expectedRows = readRows(probe);
  } finally {
    probe.close();
  }
  check('fixture-probe-nonvacuous', expectedRows.length >= 2 && expectedVersion === 1,
    `want >=2 rows at version 1, got ${expectedRows.length} rows at version ${expectedVersion}`);

  // Drive A: fresh-create — an unset version (0, no tables) advances to v1.
  {
    const p = join(stage, 'fresh.sqlite');
    const db0 = new DatabaseSync(p);
    db0.close();
    const db = new DatabaseSync(p);
    try {
      const action = migrateToV1(db);
      check('fresh-create-advances', action === 'migrated' && getUserVersion(db) === 1,
        `want migrated-to-1, got action=${action} version=${getUserVersion(db)}`);
      check('fresh-create-shape', tableExists(db, 'tabs') && indexExists(db, 'idx_tabs_last_active'),
        'tabs table or last_active index missing after fresh-create');
      check('fresh-create-integrity', integrityOk(db), 'quick_check is not exactly [ok] after fresh-create');
      check('fresh-create-wal', db.prepare('PRAGMA journal_mode').get().journal_mode === 'wal',
        'journal mode is not WAL after fresh-create');
    } finally {
      db.close();
    }
  }

  // Drive B: idempotent re-run over the v1 fixture copy; rows preserved.
  {
    const p = join(stage, 'rerun.sqlite');
    copyFileSync(FIXTURE_V1, p);
    const db = new DatabaseSync(p);
    try {
      const action = migrateToV1(db);
      const rows = readRows(db);
      check('rerun-idempotent', action === 'rerun' && getUserVersion(db) === 1,
        `want rerun-at-1, got action=${action} version=${getUserVersion(db)}`);
      check('rerun-rows-preserved', JSON.stringify(rows) === JSON.stringify(expectedRows),
        `row set drifted: got ${JSON.stringify(rows)}`);
      check('rerun-integrity', integrityOk(db), 'quick_check is not exactly [ok] after re-run');
      check('rerun-index-present', indexExists(db, 'idx_tabs_last_active'), 'last_active index missing after re-run');
    } finally {
      db.close();
    }
  }

  // Control C: deliberately tampered copy — the tripwire must fire and the
  // quarantine path must run without deleting the corrupt file.
  {
    const p = join(stage, 'tampered.sqlite');
    copyFileSync(FIXTURE_V1, p);
    const bytes = readFileSync(p);
    bytes.fill(0xff, 100, 612); // corrupt a body page, keep the header openable
    writeFileSync(p, bytes);
    const outcome = quarantineAndRebuild(p, expectedRows);
    check('tamper-tripwire-fires', outcome.quarantined === true, 'quick_check passed on a deliberately corrupted copy');
    check('quarantine-preserves-corrupt-copy', !!outcome.corruptPath && existsSync(outcome.corruptPath),
      'corrupt-suffixed copy missing — recovery deleted forensics');
    const rebuilt = new DatabaseSync(p);
    try {
      const rows = readRows(rebuilt);
      check('quarantine-rebuilds-live-rows', getUserVersion(rebuilt) === 1 && JSON.stringify(rows) === JSON.stringify(expectedRows),
        `rebuilt state wrong: version=${getUserVersion(rebuilt)} rows=${JSON.stringify(rows)}`);
      check('quarantine-rebuilt-integrity', integrityOk(rebuilt), 'rebuilt copy fails quick_check');
      check('quarantine-rebuilt-wal', rebuilt.prepare('PRAGMA journal_mode').get().journal_mode === 'wal',
        'journal mode is not WAL after quarantine rebuild');
    } finally {
      rebuilt.close();
    }
    // Second incident: re-tamper the rebuilt file — the allocator must write
    // .corrupt-2 without overwriting .corrupt-1 forensics.
    {
      const firstCorrupt = outcome.corruptPath;
      const firstBytes = readFileSync(firstCorrupt);
      const bytes2 = readFileSync(p);
      bytes2.fill(0xff, 100, 612);
      writeFileSync(p, bytes2);
      const outcome2 = quarantineAndRebuild(p, expectedRows);
      check('quarantine-second-incident-advances', outcome2.quarantined === true && !!outcome2.corruptPath && outcome2.corruptPath !== firstCorrupt,
        `second quarantine did not allocate a new suffix: got ${outcome2.corruptPath}`);
      check('quarantine-preserves-both-copies', existsSync(firstCorrupt) && existsSync(outcome2.corruptPath) && readFileSync(firstCorrupt).equals(firstBytes),
        'first forensics overwritten or missing after second incident');
    }
  }

  // Control D: stale-version copy (v1 tables present, version left at 0)
  // advances through the chain with rows intact.
  {
    const p = join(stage, 'stale.sqlite');
    copyFileSync(FIXTURE_V1, p);
    const stale = new DatabaseSync(p);
    stale.exec('PRAGMA user_version = 0');
    stale.close();
    const db = new DatabaseSync(p);
    try {
      const action = migrateToV1(db);
      const rows = readRows(db);
      check('stale-version-advances', action === 'migrated' && getUserVersion(db) === 1,
        `want migrated-to-1, got action=${action} version=${getUserVersion(db)}`);
      check('stale-rows-preserved', JSON.stringify(rows) === JSON.stringify(expectedRows),
        `row set drifted: got ${JSON.stringify(rows)}`);
    } finally {
      db.close();
    }
  }

  // Control E: newer-than-chain copy — the writer refuses rather than
  // rewriting history (MIGRATIONS.md never-downgrades rule). Version and
  // rows must be untouched afterwards.
  {
    const p = join(stage, 'newer.sqlite');
    copyFileSync(FIXTURE_V1, p);
    const v = new DatabaseSync(p);
    v.exec('PRAGMA user_version = 99');
    v.close();
    const db = new DatabaseSync(p);
    let threw = false;
    try {
      migrateToV1(db);
    } catch (e) {
      threw = /refusing downgrade/.test(e.message);
    }
    try {
      const rows = readRows(db);
      check('newer-version-refuses', threw, 'chain head did not refuse a newer user_version');
      check('newer-version-untouched', getUserVersion(db) === 99 && JSON.stringify(rows) === JSON.stringify(expectedRows),
        `newer copy mutated: version=${getUserVersion(db)} rows=${JSON.stringify(rows)}`);
    } finally {
      db.close();
    }
  }

  check('assertions-nonvacuous', assertions > 0, 'zero assertions ran -- a drive that asserts nothing proves nothing');
} finally {
  rmSync(stage, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.pass);
if (failed.length > 0) {
  console.error(`${NAME}: FAIL -- ${failed.length}/${results.length} drive(s) red`);
  process.exit(1);
}
console.log(`${NAME}: PASS -- ${results.length} drives, ${assertions} assertions`);
