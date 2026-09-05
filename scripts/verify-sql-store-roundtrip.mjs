#!/usr/bin/env node
// scripts/verify-sql-store-roundtrip.mjs
//
// SQL-05 gate 3 scaffolding (plan 12-01; promoted to a registry row in
// plan 12-03): URI -> row -> restart -> reopen roundtrip proof for the
// chrome-side tab-store writer. Derives the DDL from the writer-source
// marker comments at check time and fails distinctly when the markers are
// absent -- never a copy.
//
// Engine: standard-library `node:sqlite` only (host node v24, no install,
// no shell wrapper). Every mutation lands on copies under a mktemp stage
// outside the repo at a space-free path; the committed tree is untouched.
// Sidecars are removed checkpoint-then-clean after all handles close.
//
// Self-test (`--self-test`): asserts the unmodified drive green first, then
// plants a missing row and an extra row through the same set-equality
// comparator, each going red naming the planted URI. Each plant is asserted
// to have landed before its result is trusted.

import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const NAME = 'verify-sql-store-roundtrip';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const WRITER = join(REPO_ROOT, 'powerbrowser/shell/PowerBrowserAPI.sys.mjs');
const KEY_MODULE = join(REPO_ROOT, 'theia/extensions/tab-uris/src/browser/browser-tab-uri.ts');
const SCHEME_COVERAGE = join(REPO_ROOT, 'theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts');
const CHAIN_HEAD = 1;

function fail(message) {
  throw new Error(`${NAME}: FAIL -- ${message}`);
}

// --- derivation (from the tree, never a copy) --------------------------------

function extractWriterDdl() {
  const src = readFileSync(WRITER, 'utf8');
  const m = /PB-SQL-TABS-DDL-START\s*\*\/\s*`([\s\S]*?)`\s*\/\*\s*PB-SQL-TABS-DDL-END/.exec(src);
  if (!m) {
    fail('writer DDL markers absent in powerbrowser/shell/PowerBrowserAPI.sys.mjs (want PB-SQL-TABS-DDL-START/END delimiting one template literal)');
  }
  return m[1];
}

// The one-line key rule, pinned at both implementations: each must carry a
// `return '<scheme>:' + <spec>` line, and both scheme literals must agree.
function extractKeyScheme(file, param) {
  const src = readFileSync(file, 'utf8');
  const m = new RegExp(`return\\s*(["'])([A-Za-z][\\w+.-]*:)\\1\\s*\\+\\s*${param}`).exec(src);
  if (!m) {
    fail(`browser-tab key rule unlocatable in ${file} (want return '<scheme>:' + ${param})`);
  }
  return m[2];
}

function assertKeyRuleAgreement() {
  const chromeScheme = extractKeyScheme(WRITER, 'urlSpec');
  const besideScheme = extractKeyScheme(KEY_MODULE, 'urlSpec');
  if (chromeScheme !== besideScheme) {
    fail(`browser-tab key rule drift: chrome spells '${chromeScheme}' but beside-registry spells '${besideScheme}'`);
  }
  const coverage = readFileSync(SCHEME_COVERAGE, 'utf8');
  if (!coverage.includes(`${chromeScheme}\${`) && !coverage.includes(chromeScheme)) {
    fail(`key scheme '${chromeScheme}' has no spelling in existing-scheme-coverage.ts to reuse`);
  }
  return chromeScheme;
}

// CR-03 static pin (12-CODE-REVIEW.md): the production quarantine must
// delete the tripped live file after the backup and before reopening --
// the procedure this drive's quarantineAndRebuild proves (rmSync(path)
// then fresh-create). Derived from the writer source: IOUtils.remove of
// the live path must sit between backupToFile and openConnection inside
// quarantineAndRebuildTabStore, failing distinctly when unlocatable.
function assertQuarantineRemovalPinned() {
  const src = readFileSync(WRITER, 'utf8');
  const start = src.indexOf('async quarantineAndRebuildTabStore(');
  if (start === -1) {
    fail('quarantine removal unlocatable in writer source (want `async quarantineAndRebuildTabStore(`)');
  }
  const body = src.slice(start, src.indexOf('async ensureTabStore(', start));
  const backup = body.indexOf('backupToFile');
  // Exact spelling: a best-effort `{ ignoreAbsent: true }` removal would
  // still contain the bare prefix, so pin the load-bearing call verbatim.
  const removal = body.indexOf('await IOUtils.remove(livePath);');
  const reopen = body.indexOf('openConnection');
  if (backup === -1 || removal === -1 || reopen === -1 || !(backup < removal && removal < reopen)) {
    fail('quarantine delete-then-rebuild order unlocatable in writer source (want backupToFile, then IOUtils.remove(livePath), then openConnection)');
  }
}
function assertDowngradeBranchPresent() {
  // T-12-05 static pin: the downgrade-refusal branch is derived from the
  // writer source (getSchemaVersion compared against the chain head with a
  // refusing error), failing distinctly when unlocatable.
  const src = readFileSync(WRITER, 'utf8');
  const compared = /getSchemaVersion\(\)[\s\S]{0,300}?>\s*TAB_STORE_SCHEMA_HEAD/.test(src)
    || /schemaVersion\s*>\s*TAB_STORE_SCHEMA_HEAD/.test(src);
  const refuses = /refusing downgrade/.test(src);
  if (!compared || !refuses) {
    fail('downgrade-refusal branch unlocatable in writer source (want getSchemaVersion() compared > TAB_STORE_SCHEMA_HEAD with a refusing-downgrade error)');
  }
}

// --- store procedure (throwaway form of the writer's, driven by its DDL) -----

function statementsOf(ddl) {
  return ddl.split(';').map((s) => s.trim()).filter(Boolean);
}

function getUserVersion(db) {
  return db.prepare('PRAGMA user_version').get().user_version;
}

function tableExists(db, name) {
  return db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) !== undefined;
}

function indexExists(db, name) {
  return db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`).get(name) !== undefined;
}

// Forward-only chain to CHAIN_HEAD over the derived DDL. WAL pin precedes
// the transaction (journal_mode is immutable inside one); each migration is
// one transaction with pre-checks; newer-than-head refuses, never rewrites.
function migrateToHead(db, ddl) {
  const v = getUserVersion(db);
  if (v > CHAIN_HEAD) {
    throw new Error(`refusing downgrade: user_version=${v} is newer than chain head ${CHAIN_HEAD}`);
  }
  db.exec('PRAGMA journal_mode=WAL');
  const stmts = statementsOf(ddl);
  const createTable = stmts.find((s) => /^create table\b/i.test(s));
  const createIndex = stmts.find((s) => /^create index\b/i.test(s));
  if (!createTable || !createIndex) {
    fail('derived DDL missing CREATE TABLE or CREATE INDEX');
  }
  if (v === CHAIN_HEAD && tableExists(db, 'tabs') && indexExists(db, 'idx_tabs_last_active')) {
    return 'rerun';
  }
  db.exec('BEGIN');
  try {
    if (!tableExists(db, 'tabs')) db.exec(createTable);
    if (!indexExists(db, 'idx_tabs_last_active')) db.exec(createIndex);
    db.exec(`PRAGMA user_version = ${CHAIN_HEAD}`);
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
  return db.prepare('SELECT uri, url, title, last_active FROM tabs ORDER BY uri').all()
    .map((r) => ({ uri: r.uri, url: r.url, title: r.title, last_active: r.last_active }));
}

function upsertRow(db, row) {
  db.prepare(`INSERT INTO tabs (uri, url, title, last_active) VALUES (?, ?, ?, ?)
    ON CONFLICT (uri) DO UPDATE SET url=excluded.url, title=excluded.title, last_active=excluded.last_active`)
    .run(row.uri, row.url, row.title, row.last_active);
}

// Exact set equality, reporting every drift by URI -- surplus names the
// extra, missing names the lost.
function compareRowSets(actual, expected) {
  const failures = [];
  const a = new Map(actual.map((r) => [r.uri, r]));
  const e = new Map(expected.map((r) => [r.uri, r]));
  for (const [uri, row] of e) {
    if (!a.has(uri)) failures.push(`missing row for URI '${uri}'`);
    else if (JSON.stringify(a.get(uri)) !== JSON.stringify(row)) failures.push(`row drifted for URI '${uri}'`);
  }
  for (const uri of a.keys()) {
    if (!e.has(uri)) failures.push(`surplus row for URI '${uri}'`);
  }
  return failures;
}

// N = max existing corrupt suffix + 1, starting at 1 -- never reuse.
function nextCorruptPath(path) {
  const dir = dirname(path);
  const base = path.slice(dir.length + 1);
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}\\.corrupt-(\\d+)$`);
  let n = 0;
  for (const f of readdirSync(dir)) {
    const m = f.match(re);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `${path}.corrupt-${n + 1}`;
}

function tripwireTripped(path) {
  try {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      return !integrityOk(db);
    } finally {
      db.close();
    }
  } catch {
    return true; // unopenable counts as tripped
  }
}

function quarantineAndRebuild(path, ddl, restoreRows) {
  const corruptPath = nextCorruptPath(path);
  copyFileSync(path, corruptPath);
  for (const suffix of ['-wal', '-shm', '-journal']) {
    try { rmSync(path + suffix, { force: true }); } catch {}
  }
  try { rmSync(path, { force: true }); } catch {}
  const fresh = new DatabaseSync(path);
  try {
    fresh.exec('PRAGMA journal_mode=WAL');
    fresh.exec('BEGIN');
    try {
      for (const s of statementsOf(ddl)) fresh.exec(s);
      fresh.exec(`PRAGMA user_version = ${CHAIN_HEAD}`);
      for (const r of restoreRows) upsertRow(fresh, r);
      fresh.exec('COMMIT');
    } catch (err) {
      try { fresh.exec('ROLLBACK'); } catch {}
      throw err;
    }
  } finally {
    fresh.close();
  }
  return corruptPath;
}

// Checkpoint-then-clean: a read-write handle checkpoints before sidecars
// are unlinked. All handles on the file must already be closed.
function checkpointThenClean(path) {
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } finally {
    db.close();
  }
  for (const suffix of ['-wal', '-shm']) {
    try { rmSync(path + suffix, { force: true }); } catch {}
  }
}

// --- main drive ----------------------------------------------------------------

function main() {
  const results = [];
  let assertions = 0;
  function check(id, cond, detail) {
    assertions += 1;
    results.push({ id, pass: !!cond });
    console.log(`${NAME}: drive ${cond ? 'PASS' : 'FAIL'} -- ${id}${cond ? '' : ` -- ${detail}`}`);
  }

  const stage = mkdtempSync(join(tmpdir(), 'pb-tabs-roundtrip-'));
  if (/\s/.test(stage)) fail(`stage path contains a space: ${stage}`);
  if (stage.startsWith(REPO_ROOT)) fail(`stage path is inside the repo: ${stage}`);
  console.log(`${NAME}: stage ${stage} (space-free, outside repo)`);

  try {
    const ddl = extractWriterDdl();
    check('ddl-derived-from-writer', ddl.includes('CREATE TABLE tabs') && ddl.includes('CREATE INDEX idx_tabs_last_active'),
      'derived DDL lacks the tabs table or its index');
    check('ddl-checks-intact', ddl.includes('CHECK(length(uri) > 0)') && ddl.includes('CHECK(last_active >= 0)'),
      'derived DDL lacks one of the two CHECK constraints');
    assertDowngradeBranchPresent();
    check('downgrade-branch-pinned', true, 'unreachable');
    assertQuarantineRemovalPinned();
    check('quarantine-removal-pinned', true, 'unreachable');
    const scheme = assertKeyRuleAgreement();
    check('key-rule-agreement', true, 'unreachable');

    // Sessionstore authority, through its JSON-string boundary: entries in,
    // rows out, keyed by the agreed one-line rule exactly as
    // parseSessionStoreTabRows does chrome-side.
    const plantedUri = `${scheme}https://example.com/roundtrip/quote-1`;
    const sessionState = JSON.stringify({ windows: [{ tabs: [
      { index: 1, entries: [{ url: 'https://example.com/roundtrip/quote-1', title: `It's a "build" shell \u2014 \u00fcn\u00efc\u00f6d\u00e9 \u2713` }] },
      { index: 1, entries: [{ url: 'about:newtab', title: '' }] },
    ] }] });
    const now = 1700000000000;
    const authorityRows = [];
    for (const win of JSON.parse(sessionState).windows ?? []) {
      for (const tab of win.tabs ?? []) {
        const entry = tab.entries?.[tab.index - 1];
        if (entry?.url) authorityRows.push({ uri: scheme + entry.url, url: entry.url, title: entry.title ?? '', last_active: now });
      }
    }
    authorityRows.sort((x, y) => (x.uri < y.uri ? -1 : 1));
    check('authority-nonvacuous', authorityRows.length === 2 && authorityRows.some((r) => r.uri === plantedUri),
      `want 2 authority rows including ${plantedUri}`);

    // Create with version one and WAL pinned, bound-parameter upsert of the
    // quote-plus-unicode title row.
    const p = join(stage, 'tabs.sqlite');
    {
      const db = new DatabaseSync(p);
      try {
        check('create-advances', migrateToHead(db, ddl) === 'migrated' && getUserVersion(db) === 1,
          `want migrated-to-1, got version=${getUserVersion(db)}`);
        check('create-wal', db.prepare('PRAGMA journal_mode').get().journal_mode === 'wal',
          'journal mode is not WAL after create');
        for (const r of authorityRows) upsertRow(db, r);
        check('upsert-bound-params', readRows(db).some((r) => r.uri === plantedUri && r.title.includes('"build"')),
          'quote-plus-unicode title row missing after bound-parameter upsert');
      } finally {
        db.close();
      }
    }

    // Restart: close plus reopen with the restored set equal by exact set
    // equality, integrity exactly single-ok.
    {
      const db = new DatabaseSync(p);
      try {
        const drift = compareRowSets(readRows(db), authorityRows);
        check('reopen-set-equality', drift.length === 0, drift.join(' | '));
        check('reopen-integrity', integrityOk(db), 'quick_check is not exactly [ok] after reopen');
      } finally {
        db.close();
      }
    }

    // Contract CHECKs reject an empty URI and a negative last_active.
    {
      const db = new DatabaseSync(p);
      try {
        let emptyRejected = false;
        try { upsertRow(db, { uri: '', url: 'u', title: 't', last_active: 0 }); } catch { emptyRejected = true; }
        check('rejects-empty-uri', emptyRejected, 'empty-string URI accepted despite CHECK(length(uri) > 0)');
        let negativeRejected = false;
        try { upsertRow(db, { uri: `${scheme}check:negative`, url: 'u', title: 't', last_active: -1 }); } catch { negativeRejected = true; }
        check('rejects-negative-last-active', negativeRejected, 'negative last_active accepted despite CHECK(last_active >= 0)');
      } finally {
        db.close();
      }
    }

    // Newer-than-head refuses with version and rows untouched (T-12-05,
    // functional half of the static pin above).
    {
      const q = join(stage, 'newer.sqlite');
      copyFileSync(p, q);
      const v = new DatabaseSync(q);
      v.exec(`PRAGMA user_version = 99`);
      v.close();
      const db = new DatabaseSync(q);
      let threw = false;
      try {
        migrateToHead(db, ddl);
      } catch (e) {
        threw = /refusing downgrade/.test(e.message);
      }
      try {
        const drift = compareRowSets(readRows(db), authorityRows);
        check('newer-version-refuses', threw, 'chain head did not refuse user_version=99');
        check('newer-version-untouched', getUserVersion(db) === 99 && drift.length === 0,
          `newer copy mutated: version=${getUserVersion(db)} drift=${drift.join(' | ')}`);
      } finally {
        db.close();
      }
      checkpointThenClean(q);
    }

    // Quarantine: tamper, trip, preserve forensics, rebuild live rows, then
    // a second incident advancing the suffix without overwriting the first.
    {
      const bytes = readFileSync(p);
      bytes.fill(0xff, 100, 612);
      writeFileSync(p, bytes);
      check('tamper-tripwire-fires', tripwireTripped(p), 'quick_check passed on a deliberately corrupted copy');
      const firstCorrupt = quarantineAndRebuild(p, ddl, authorityRows);
      const firstBytes = readFileSync(firstCorrupt);
      check('quarantine-preserves-corrupt-copy', firstCorrupt.endsWith('.corrupt-1') && existsSync(firstCorrupt),
        'corrupt-suffixed copy missing -- recovery deleted forensics');
      const rebuilt = new DatabaseSync(p);
      try {
        const drift = compareRowSets(readRows(rebuilt), authorityRows);
        check('quarantine-rebuilds-live-rows', getUserVersion(rebuilt) === 1 && drift.length === 0,
          `rebuilt state wrong: version=${getUserVersion(rebuilt)} drift=${drift.join(' | ')}`);
        check('quarantine-rebuilt-integrity', integrityOk(rebuilt), 'rebuilt copy fails quick_check');
        check('quarantine-rebuilt-wal', rebuilt.prepare('PRAGMA journal_mode').get().journal_mode === 'wal',
          'journal mode is not WAL after quarantine rebuild');
      } finally {
        rebuilt.close();
      }
      const bytes2 = readFileSync(p);
      bytes2.fill(0xff, 100, 612);
      writeFileSync(p, bytes2);
      const secondCorrupt = quarantineAndRebuild(p, ddl, authorityRows);
      check('quarantine-second-incident-advances', secondCorrupt.endsWith('.corrupt-2') && secondCorrupt !== firstCorrupt,
        `second quarantine did not allocate a new suffix: got ${secondCorrupt}`);
      check('quarantine-preserves-both-copies', existsSync(firstCorrupt) && existsSync(secondCorrupt) && readFileSync(firstCorrupt).equals(firstBytes),
        'first forensics overwritten or missing after second incident');
    }

    checkpointThenClean(p);
    const sidecars = readdirSync(stage).filter((f) => f.endsWith('-wal') || f.endsWith('-shm'));
    check('sidecars-cleaned', sidecars.length === 0, `stage sidecars remain: ${sidecars.join(', ')}`);
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
}

// --- self-test -------------------------------------------------------------------

function selfTest() {
  // The unmodified path goes green first -- planted-fault results are
  // meaningless otherwise.
  const green = spawnSync(process.execPath, [join(HERE, 'verify-sql-store-roundtrip.mjs')], { encoding: 'utf8' });
  if (green.status !== 0) {
    console.error(`${NAME} --self-test: FAIL -- the unmodified drive is already red, so the planted-fault results below would be meaningless:`);
    process.stderr.write(green.stderr ?? '');
    process.exit(1);
  }
  console.log(`${NAME} --self-test: unmodified drive green, planting faults`);

  const scheme = assertKeyRuleAgreement();
  const plantedUri = `${scheme}https://example.com/roundtrip/quote-1`;
  const expected = [
    { uri: plantedUri, url: 'https://example.com/roundtrip/quote-1', title: 't', last_active: 1 },
    { uri: `${scheme}about:newtab`, url: 'about:newtab', title: '', last_active: 2 },
  ];

  let failed = 0;

  // Plant 1: a missing row must go red naming the URI.
  {
    const actual = expected.filter((r) => r.uri !== plantedUri);
    if (actual.length !== expected.length - 1) {
      console.error(`${NAME} --self-test: FAIL -- 'missing row' plant did not land; the anchor rows drifted`);
      failed++;
    } else {
      const failures = compareRowSets(actual, expected);
      if (!failures.some((f) => f.includes(plantedUri))) {
        console.error(`${NAME} --self-test: FAIL -- 'missing row' did not go red naming '${plantedUri}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
        failed++;
      } else {
        console.log(`  ok  missing row -> red, naming '${plantedUri}'`);
      }
    }
  }

  // Plant 2: an extra row must go red naming the URI.
  {
    const ghostUri = `${plantedUri}/ghost`;
    const actual = [...expected, { uri: ghostUri, url: 'https://example.com/ghost', title: 'g', last_active: 3 }];
    if (!actual.some((r) => r.uri === ghostUri)) {
      console.error(`${NAME} --self-test: FAIL -- 'extra row' plant did not land; the anchor rows drifted`);
      failed++;
    } else {
      const failures = compareRowSets(actual, expected);
      if (!failures.some((f) => f.includes(ghostUri))) {
        console.error(`${NAME} --self-test: FAIL -- 'extra row' did not go red naming '${ghostUri}'; got: ${failures.join(' | ') || '(no failures at all)'}`);
        failed++;
      } else {
        console.log(`  ok  extra row -> red, naming '${ghostUri}'`);
      }
    }
  }

  if (failed) process.exit(1);
  console.log(`${NAME} --self-test: PASS -- 2 planted faults both went red`);
}

if (process.argv.includes('--self-test')) selfTest();
else main();
