#!/usr/bin/env node
// scripts/rename-brand.mjs
//
// D-05: the Sourcerer -> Power Browser rename as a committed, rerunnable
// script rather than a hand-edit, so the rename is auditable evidence that it
// was mechanical. Its only input data is inventory/brand-tokens.json (D-15) --
// the same file scripts/scan-brand-residue.mjs reads, and it imports that
// script's matcher rather than carrying a second copy, so "what is scanned"
// and "what is renamed" are the same rule by construction and cannot drift.
//
// -- Why the naive approach was rejected --
// `git grep -l sourcerer | xargs sed -i` is the obvious shape and it is wrong
// in at least four measured ways, every one of which still produces a
// SUCCESSFUL BUILD:
//   1. TitleCase `Sourcerer` is two different tokens (Pitfall 1). 291 lexically
//      identical occurrences, ~40 of them display strings whose target is
//      `Power Browser` with a space, not `PowerBrowser`. A single pass renames
//      `-brand-full-name = Sourcerer Dev` to `PowerBrowser Dev` and
//      verify-branding-identity.mjs then AGREES, because the same pass rewrote
//      the descriptor it compares against. Those surfaces are in
//      `hand_write` here and the script refuses to touch them.
//   2. `Exec=/home/chris/coding/sourcerer/objdir/dist/bin/sourcerer` carries
//      three tokens with three different correct targets (Pitfall 4). The
//      `.desktop` files are hand-written for the same reason.
//   3. `resourcerer` must not match while `sourcererPrivilegedJs` must
//      (the camelCase join) -- a substring pass gets both wrong.
//   4. The XPCOM cid, the `a-` category prefix and Gecko's own
//      `%content/branding/` slot are held back by class, not by luck.
//
// -- The gate --
// This script REFUSES TO RUN, naming the offending rows, while any inventoried
// row lacks a `class` from the five-value set, and it refuses to run on an
// inventory carrying zero token rows. An empty input is never a silent pass:
// the classification file is the gate, not documentation (T-01-02).
//
// -- Determinism and rerunnability --
// Rows apply longest-token-first, then UPPER_SNAKE, TitleCase, lowercase,
// literal (scan-brand-residue.mjs's `orderRows`). Overlapping spans are claimed
// in that order and never re-claimed, which is what makes
// `@sourcerer.dev/single-instance-clh;1` one identity site rather than also a
// lowercase brand site. Each file is then rebuilt in ONE pass from its claimed
// spans, so no replacement can be re-matched by a later row. No target contains
// its own source token, so a second run over an already-renamed tree finds
// nothing and produces a zero-byte diff -- which the plan asserts, because a
// second pass that could compound a wrong replacement is the tampering risk
// this property closes.
//
// Usage:
//   node scripts/rename-brand.mjs [--scope-chain <name>] [--dry-run] [--self-test]

import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  CLASSES,
  INVENTORY_PATH,
  REPO_ROOT,
  RENAMEABLE_CLASSES,
  chainOf,
  claimOccurrences,
  loadInventory,
  scopeFiles,
} from './scan-brand-residue.mjs';

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

/** Returns a list of human-readable problems; empty means the inventory may run. */
export function gateFailures(inv) {
  const problems = [];
  if (!Array.isArray(inv.tokens) || inv.tokens.length === 0) {
    problems.push('inventory carries zero token rows -- an empty replacement plan is never a silent no-op pass');
    return problems;
  }
  inv.tokens.forEach((row, i) => {
    const where = `tokens[${i}] token=${JSON.stringify(row.token)}`;
    if (!row.class) problems.push(`${where}: unclassified -- no \`class\``);
    else if (!CLASSES.includes(row.class)) problems.push(`${where}: class "${row.class}" is not one of ${CLASSES.join(' | ')}`);
    if (!row.target) problems.push(`${where}: no \`target\``);
    if ((row.class === 'frozen' || row.class === 'coincidental') && !row.reason) {
      problems.push(`${where}: class ${row.class} requires a non-empty \`reason\``);
    }
    (row.site_overrides ?? []).forEach((s, j) => {
      if (!s.class || !CLASSES.includes(s.class)) {
        problems.push(`${where}: site_overrides[${j}] (${s.file}:${s.line}) is unclassified`);
      }
    });
  });
  return problems;
}

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

export function excludedWholeFile(inv, file) {
  return (inv.hand_write?.files ?? []).includes(file);
}

export function excludedLine(inv, file, lineText) {
  return (inv.hand_write?.line_contains ?? [])
    .some((r) => r.file === file && lineText.includes(r.contains));
}

// ---------------------------------------------------------------------------
// Rewrite
// ---------------------------------------------------------------------------

/**
 * Applies every renameable claim to `text` in one rebuild. `site_overrides`
 * win over the row's own class and target, keyed by file:line -- that is how a
 * single TitleCase row can still hold back the handful of sites where the same
 * literal means the display name.
 */
export function rewrite(inv, file, text, rows) {
  const { claimed } = claimOccurrences(text, rows, file);
  const lines = text.split('\n');
  const out = [];
  let cursor = 0;
  let applied = 0;

  for (const c of claimed) {
    let cls = c.row.class;
    let target = c.row.target;
    const override = (c.row.site_overrides ?? []).find((s) => s.file === file && s.line === c.line);
    if (override) {
      cls = override.class;
      target = override.target ?? target;
    }
    if (!RENAMEABLE_CLASSES.includes(cls)) continue;
    if (cls === 'brand-display') continue; // always hand-written (Pitfall 1)
    if (excludedLine(inv, file, lines[c.line - 1] ?? '')) continue;

    out.push(text.slice(cursor, c.index), target);
    cursor = c.index + c.row.token.length;
    applied++;
  }
  out.push(text.slice(cursor));
  return { text: out.join(''), applied };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export function run(inv, { chain = null, dryRun = false, root = REPO_ROOT, files = null } = {}) {
  const rows = chain ? chainOf(inv, chain).rows : inv.tokens;
  const scope = files ?? scopeFiles(inv, { chainFiles: chain ? chainOf(inv, chain).files : null });

  if (scope.length === 0) {
    throw new Error(`rename-brand: FAIL -- the file set to rewrite is empty${chain ? ` for chain "${chain}"` : ''} -- an empty scope is not a completed rename`);
  }

  const changes = [];
  for (const file of scope.slice().sort()) {
    if (excludedWholeFile(inv, file)) continue;
    const abs = join(root, file);
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const { text: next, applied } = rewrite(inv, file, text, rows);
    if (applied === 0 || next === text) continue;
    if (!dryRun) writeFileSync(abs, next);
    changes.push({ file, applied });
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------
//
// Plants both halves of the boundary rule in a mktemp -d directory, never a
// real repo file: `resourcerer` must survive untouched (a token character on
// the left is not a boundary) and `sourcererPrivilegedJs` must become
// `powerbrowserPrivilegedJs` (a camelCase join on the right IS one). Also
// proves the two gates reject rather than warn.

const SELF_TEST_INVENTORY = {
  $comment: 'rename-brand.mjs --self-test fixture inventory. Never the real one.',
  scope: { exclude: [], binary_extensions: [], residue_probes: ['sourcerer'] },
  hand_write: { files: [], line_contains: [] },
  tokens: [
    {
      token: 'sourcerer',
      case_form: 'lower',
      class: 'brand-identifier',
      target: 'powerbrowser',
      expected_count: 1,
      expected_files: ['planted-fixture.txt'],
    },
  ],
};

function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'rename-brand-'));
  let overall = 0;
  try {
    const rel = 'planted-fixture.txt';
    const before = 'const a = resourcerer;\nconst b = sourcererPrivilegedJs;\n';
    writeFileSync(join(tmp, rel), before);
    run(SELF_TEST_INVENTORY, { root: tmp, files: [rel] });
    const after = readFileSync(join(tmp, rel), 'utf8');

    if (after.includes('resourcerer') && !after.includes('repowerbrowser')) {
      console.log('rename-brand: --self-test PASS -- the planted `resourcerer` fixture was left untouched (a token character on the left is not a boundary)');
    } else {
      console.error(`rename-brand: --self-test FAIL -- the planted \`resourcerer\` fixture in ${rel} was modified: ${JSON.stringify(after)}`);
      overall = 1;
    }
    if (after.includes('powerbrowserPrivilegedJs') && !after.includes('sourcererPrivilegedJs')) {
      console.log('rename-brand: --self-test PASS -- the planted `sourcererPrivilegedJs` fixture became `powerbrowserPrivilegedJs` (a camelCase join on the right IS a boundary)');
    } else {
      console.error(`rename-brand: --self-test FAIL -- the planted camelCase fixture in ${rel} was not renamed: ${JSON.stringify(after)}`);
      overall = 1;
    }

    // Rerun must be a no-op -- the property that stops a second pass from
    // compounding a wrong replacement.
    run(SELF_TEST_INVENTORY, { root: tmp, files: [rel] });
    if (readFileSync(join(tmp, rel), 'utf8') === after) {
      console.log('rename-brand: --self-test PASS -- a second run over the already-renamed fixture changed nothing');
    } else {
      console.error('rename-brand: --self-test FAIL -- a second run modified the already-renamed fixture');
      overall = 1;
    }

    // Gate 1: an unclassified row refuses the run AND is named.
    const unclassified = structuredClone(SELF_TEST_INVENTORY);
    delete unclassified.tokens[0].class;
    const g1 = gateFailures(unclassified);
    if (g1.some((p) => p.includes('unclassified') && p.includes('sourcerer'))) {
      console.log('rename-brand: --self-test PASS -- an unclassified row was rejected and named');
    } else {
      console.error(`rename-brand: --self-test FAIL -- an unclassified row was not rejected by name: ${JSON.stringify(g1)}`);
      overall = 1;
    }

    // Gate 2: an empty inventory is a FAIL, never a silent clean pass.
    const empty = structuredClone(SELF_TEST_INVENTORY);
    empty.tokens = [];
    if (gateFailures(empty).some((p) => p.includes('zero token rows'))) {
      console.log('rename-brand: --self-test PASS -- an inventory with zero token rows was rejected with its own distinct message');
    } else {
      console.error('rename-brand: --self-test FAIL -- an empty inventory was not rejected');
      overall = 1;
    }

    // Gate 3: an empty file scope is a FAIL, never a silent clean pass.
    let emptyScopeRejected = false;
    try {
      run(SELF_TEST_INVENTORY, { root: tmp, files: [] });
    } catch (err) {
      emptyScopeRejected = String(err.message).includes('empty');
    }
    if (emptyScopeRejected) {
      console.log('rename-brand: --self-test PASS -- an empty file scope was rejected rather than reported as a completed rename');
    } else {
      console.error('rename-brand: --self-test FAIL -- an empty file scope was not rejected');
      overall = 1;
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return overall;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  if (argv.includes('--self-test')) return selfTest();

  const chainIdx = argv.indexOf('--scope-chain');
  const chain = chainIdx === -1 ? null : argv[chainIdx + 1];
  if (chainIdx !== -1 && !chain) {
    console.error('rename-brand: FAIL -- --scope-chain requires a chain name');
    return 2;
  }
  const dryRun = argv.includes('--dry-run');

  if (!existsSync(INVENTORY_PATH)) {
    console.error(`rename-brand: FAIL -- ${INVENTORY_PATH} does not exist; the inventory is this script's only replacement plan`);
    return 1;
  }
  const inv = loadInventory();

  const problems = gateFailures(inv);
  if (problems.length !== 0) {
    console.error(`rename-brand: FAIL -- refusing to run; ${problems.length} inventory row problem(s):`);
    for (const p of problems) console.error(`  ${p}`);
    return 1;
  }

  let changes;
  try {
    changes = run(inv, { chain, dryRun });
  } catch (err) {
    console.error(String(err.message));
    return 1;
  }

  for (const c of changes) console.log(`  ${c.file}: ${c.applied} replacement(s)`);
  const total = changes.reduce((n, c) => n + c.applied, 0);
  console.log(`rename-brand: ${dryRun ? 'DRY RUN -- ' : ''}${total} replacement(s) across ${changes.length} file(s)${chain ? ` for chain "${chain}"` : ''}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main(process.argv.slice(2)));
}
