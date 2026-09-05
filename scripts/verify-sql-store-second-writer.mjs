#!/usr/bin/env node
// scripts/verify-sql-store-second-writer.mjs
//
// SQL-05 gate 1 (plan 12-03): second-writer negative scan.
//
// A second read-write opener of the profile tab database in any process
// defeats WAL coordination, so exactly one file in this repo may open it
// read-write (the chrome-side writer) plus one readonly reader. This gate
// walks tracked first-party source only (git ls-files: never anything
// untracked, never the upstream clone, which legitimately opens its own
// databases hundreds of times) and fails naming file:line for every
// profile-database open shape outside exactly two allowlist rules:
//
//   (a) inside powerbrowser/shell/ -- the writer's home, the sole boundary;
//   (b) the single backend reader call carrying the readonly flag --
//       derive-and-compare: EVERY new Database( line under theia/ must carry
//       a `readonly: true` literal on the same line (WR-02: a substring
//       presence check let `readonly: false` and flagless calls with a
//       nearby comment pass), or it fails naming the line.
//   (c) the node:sqlite DatabaseSync test-engine shape inside scripts/
//       stage-disciplined instruments only -- files that themselves use
//       mkdtempSync (WR-02: the exact-paren spelling excluded DatabaseSync
//       entirely, so a theia-side read-write writer via the stdlib engine
//       evaded the scan). Keyed on the mktemp marker in the file rather
//       than a blanket scripts/ exemption.
//
// Scope: powerbrowser/, theia/, scripts/, patches/ filtered to
// *.sys.mjs/*.mjs/*.js/*.ts/*.xhtml, excluding node_modules/ and lib/ path
// segments. Deliberately OUT of scope and documented here rather than
// silently unhandled (WR-02): `.py`/`.sh` sources and direct `sqlite3`-CLI
// invocations are not scanned -- a second writer in those shapes would
// evade this gate, and widening the walk to them is future work, not a
// claim made here. An empty scan set fails distinctly (a broken walk
// reporting clean is worse than red). Comment lines (first non-whitespace
// // or *) are skipped the way the internals-boundary scan skips them.
//
// The matched shapes live in OPEN_SHAPES below. The node:sqlite
// DatabaseSync test-engine shape IS matched (rule (c) above): the roundtrip,
// absence, and soak instruments open mktemp stage copies only, never profile
// paths, and each carries the mkdtempSync marker this gate keys its carve-out
// on. This file itself is exempt by basename -- it must spell the shapes to
// match them, the same reason the boundary guard exempts its boundary file --
// and --self-test proves the instrument still discriminates on planted files
// elsewhere.
//
// Self-test (--self-test): asserts the unmodified tree green first, then a
// planted offending open outside the shell and separately a stripped
// readonly flag each go red naming the planted path (each plant asserted
// to have landed), a flag-carrying reader stays green, and the empty set
// fails distinctly.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const NAME = 'verify-sql-store-second-writer';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const SELF_BASENAME = 'verify-sql-store-second-writer.mjs';

const SCOPED_TREES = ['powerbrowser/', 'theia/', 'scripts/', 'patches/'];
const SCOPED_EXTS = ['.sys.mjs', '.mjs', '.js', '.ts', '.xhtml'];
const EXCLUDED_SEGMENTS = ['node_modules', 'lib'];
const OPEN_SHAPES = ['openConnection', 'Services.storage', 'new Database(', 'new DatabaseSync(', 'openDatabase'];

function fail(message) {
  throw new Error(`${NAME}: FAIL -- ${message}`);
}

// Rule (b): the theia reader allowlist is a readonly:true LITERAL on the
// same line -- `readonly: false` or a bare call fails.
function theiaReaderAllowed(line) {
  return /readonly\s*:\s*true/.test(line);
}

// Rule (c): DatabaseSync is allowed only in scripts/ instruments that carry
// the mkdtempSync stage-discipline marker themselves. A theia/ or
// patches/ DatabaseSync, or one in a scripts/ file without the marker, is
// an offense.
function databaseSyncAllowed(rel, src) {
  return rel.split('/')[0] === 'scripts' && src.includes('mkdtempSync');
}

function isCommentLine(line) {
  const trimmed = line.replace(/^\s+/, '');
  return trimmed.startsWith('//') || trimmed.startsWith('*');
}

function inScope(rel) {
  if (!SCOPED_TREES.some(t => rel.startsWith(t))) return false;
  if (!SCOPED_EXTS.some(e => rel.endsWith(e))) return false;
  if (rel.split('/').some(seg => EXCLUDED_SEGMENTS.includes(seg))) return false;
  if (rel.split('/').pop() === SELF_BASENAME) return false;
  return true;
}

function isShellPath(p) {
  return /(^|\/)powerbrowser\/shell\//.test(p);
}

function isTheiaPath(p) {
  return /(^|\/)theia\//.test(p);
}

function collectTrackedFiles() {
  const r = spawnSync('git', ['-C', REPO_ROOT, 'ls-files', '-z'], { encoding: 'buffer' });
  if (r.status !== 0) fail('git ls-files failed -- cannot derive the tracked set');
  return r.stdout.toString('utf8').split('\0').filter(Boolean).filter(inScope);
}

function scanFiles(files) {
  const offenses = [];
  for (const f of files) {
    if (isShellPath(f)) continue;
    let src;
    try {
      src = readFileSync(f.startsWith('/') ? f : join(REPO_ROOT, f), 'utf8');
    } catch {
      fail(`unreadable scan file: ${f}`);
    }
    let lineNo = 0;
    for (const line of src.split('\n')) {
      lineNo++;
      if (isCommentLine(line)) continue;
      for (const shape of OPEN_SHAPES) {
        if (!line.includes(shape)) continue;
        if (shape === 'new Database(' && isTheiaPath(f) && theiaReaderAllowed(line)) continue;
        if (shape === 'new DatabaseSync(' && databaseSyncAllowed(f, src)) continue;
        offenses.push({ file: f, line: lineNo, shape });
      }
    }
  }
  return offenses;
}

function runScan(files) {
  if (files.length === 0) {
    return { ok: false, reason: 'empty', offenses: [] };
  }
  const offenses = scanFiles(files);
  return { ok: offenses.length === 0, reason: offenses.length ? 'offenses' : '', offenses };
}

function main() {
  const files = collectTrackedFiles();
  const result = runScan(files);
  if (result.reason === 'empty') {
    console.error(`${NAME}: FAIL -- scanned file set is empty (tracked powerbrowser/theia/scripts/patches sources) -- an empty file set is not a clean tree`);
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`${NAME}: FAIL -- ${result.offenses.length} second-writer offense(s):`);
    result.offenses.forEach(o => console.error(`  ${o.file}:${o.line}: ${o.shape}`));
    process.exit(1);
  }
  console.log(`${NAME}: PASS -- ${files.length} tracked files, no profile-database opens outside powerbrowser/shell/ except the readonly reader`);
}

function selfTest() {
  const realFiles = collectTrackedFiles();
  const baseline = runScan(realFiles);
  if (!baseline.ok) {
    console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
    baseline.offenses.forEach(o => console.error(`  ${o.file}:${o.line}: ${o.shape}`));
    process.exit(1);
  }
  console.log(`${NAME} --self-test: unmodified tree green over ${realFiles.length} files, planting faults`);

  const stage = mkdtempSync(join(tmpdir(), 'pb-tabs-writer-scan-'));
  if (/\s/.test(stage)) fail(`stage path contains a space: ${stage}`);
  mkdirSync(join(stage, 'theia'), { recursive: true });
  let failed = 0;
  try {
    // Plant 1: an offending open outside the shell must go red naming it.
    {
      const path = join(stage, 'planted-evil.mjs');
      writeFileSync(path, 'export async function evil(Sqlite) {\n  const conn = await Sqlite.openConnection({ path: "tabs.sqlite" });\n  return conn;\n}\n');
      const landed = readFileSync(path, 'utf8').includes('openConnection');
      if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- 'offending open' plant did not land`);
        failed++;
      } else {
        const r = runScan([path]);
        if (r.ok || !r.offenses.some(o => String(o.file).includes('planted-evil.mjs'))) {
          console.error(`${NAME} --self-test: FAIL -- 'offending open' did not go red naming 'planted-evil.mjs'; got: ${r.offenses.map(o => `${o.file}:${o.line}`).join(' | ') || '(no failures at all)'}`);
          failed++;
        } else {
          console.log(`  ok  offending open outside the shell -> red, naming 'planted-evil.mjs'`);
        }
      }
    }

    // Plant 2: a theia reader call with the flag stripped must go red.
    {
      const path = join(stage, 'theia', 'reader-stripped.ts');
      writeFileSync(path, '// stripped fixture\nimport Database from "better-sqlite3";\nexport function openIt(p: string) {\n  return new Database(p);\n}\n', { flag: 'w' });
      const landed = readFileSync(path, 'utf8').includes('new Database(') && !readFileSync(path, 'utf8').includes('readonly');
      if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- 'stripped flag' plant did not land`);
        failed++;
      } else {
        const r = runScan([path]);
        if (r.ok || !r.offenses.some(o => String(o.file).includes('reader-stripped.ts'))) {
          console.error(`${NAME} --self-test: FAIL -- 'stripped flag' did not go red naming 'reader-stripped.ts'; got: ${r.offenses.map(o => `${o.file}:${o.line}`).join(' | ') || '(no failures at all)'}`);
          failed++;
        } else {
          console.log(`  ok  stripped readonly flag -> red, naming 'reader-stripped.ts'`);
        }
      }
    }

    // Plant 2b (WR-02): a theia reader call with `readonly: false` must go
    // red -- the old substring presence check let it pass.
    {
      const path = join(stage, 'theia', 'reader-false.ts');
      writeFileSync(path, '// readonly-false fixture\nimport Database from "better-sqlite3";\nexport function openIt(p: string) {\n  return new Database(p, { readonly: false });\n}\n', { flag: 'w' });
      const landed = readFileSync(path, 'utf8').includes('readonly: false');
      if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- 'readonly false' plant did not land`);
        failed++;
      } else {
        const r = runScan([path]);
        if (r.ok || !r.offenses.some(o => String(o.file).includes('reader-false.ts'))) {
          console.error(`${NAME} --self-test: FAIL -- 'readonly: false' did not go red naming 'reader-false.ts'; got: ${r.offenses.map(o => `${o.file}:${o.line}`).join(' | ') || '(no failures at all)'}`);
          failed++;
        } else {
          console.log(`  ok  readonly:false flag -> red, naming 'reader-false.ts'`);
        }
      }
    }

    // Plant 2c (WR-02): a theia-side node:sqlite writer must go red -- the
    // old exact-paren spelling never matched DatabaseSync at all.
    {
      const path = join(stage, 'theia', 'sync-writer.ts');
      writeFileSync(path, '// sync-writer fixture\nimport { DatabaseSync } from "node:sqlite";\nexport function openIt(p: string) {\n  return new DatabaseSync(p);\n}\n', { flag: 'w' });
      const landed = readFileSync(path, 'utf8').includes('new DatabaseSync(');
      if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- 'sync writer' plant did not land`);
        failed++;
      } else {
        const r = runScan([path]);
        if (r.ok || !r.offenses.some(o => String(o.file).includes('sync-writer.ts'))) {
          console.error(`${NAME} --self-test: FAIL -- 'sync writer' did not go red naming 'sync-writer.ts'; got: ${r.offenses.map(o => `${o.file}:${o.line}`).join(' | ') || '(no failures at all)'}`);
          failed++;
        } else {
          console.log(`  ok  theia DatabaseSync writer -> red, naming 'sync-writer.ts'`);
        }
      }
    }

    // Rule predicates, unit-held: the DatabaseSync carve-out keys on the
    // scripts/ tree plus the mktemp marker, nothing else.
    {
      const staged = 'import { mkdtempSync } from "node:fs";\nnew DatabaseSync(p);\n';
      const cases = [
        ['scripts/stage-tool.mjs', staged, true],
        ['scripts/no-marker.mjs', 'new DatabaseSync(p);\n', false],
        ['theia/reader.ts', staged, false],
        ['patches/fix.patch.js', staged, false],
      ];
      for (const [rel, src, want] of cases) {
        const got = databaseSyncAllowed(rel, src);
        if (got !== want) {
          console.error(`${NAME} --self-test: FAIL -- databaseSyncAllowed('${rel}') = ${got}, want ${want}`);
          failed++;
        }
      }
      if (!theiaReaderAllowed('new Database(p, { readonly: true })')
        || theiaReaderAllowed('new Database(p, { readonly: false })')
        || theiaReaderAllowed('new Database(p); // readonly later')) {
        console.error(`${NAME} --self-test: FAIL -- theiaReaderAllowed misclassifies a readonly literal case`);
        failed++;
      } else {
        console.log(`  ok  rule predicates hold (carve-out keys on scripts/ plus mktemp marker; readonly:true literal)`);
      }
    }
    // Positive: a flag-carrying theia reader must stay green (rule b is not
    // reject-all).
    {
      const path = join(stage, 'theia', 'reader-ok.ts');
      writeFileSync(path, '// flag-carrying fixture\nimport Database from "better-sqlite3";\nexport function openIt(p: string) {\n  return new Database(p, { readonly: true });\n}\n');
      const landed = readFileSync(path, 'utf8').includes('readonly');
      const r = runScan([path]);
      if (!landed || !r.ok) {
        console.error(`${NAME} --self-test: FAIL -- flag-carrying reader was rejected; rule (b) must allow it`);
        failed++;
      } else {
        console.log(`  ok  flag-carrying reader -> green (allowlist rule holds)`);
      }
    }

    // Empty set fails distinctly, never clean.
    {
      const r = runScan([]);
      if (r.ok || r.reason !== 'empty') {
        console.error(`${NAME} --self-test: FAIL -- empty scan set did not fail distinctly`);
        failed++;
      } else {
        console.log(`  ok  empty scan set -> distinct failure, not clean`);
      }
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }

  if (failed) process.exit(1);
  console.log(`${NAME} --self-test: PASS -- both fault directions went red, the allowlist held, the empty set failed distinctly`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
