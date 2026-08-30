#!/usr/bin/env node
// scripts/scan-brand-residue.mjs
//
// D-16/D-17: the residual-brand scan as an executable guard, not prose. Reads
// its entire token set from `inventory/brand-tokens.json` (D-15) -- no token
// literal is hardcoded here, so "what is scanned" and "what is renamed" cannot
// drift apart. Grep-class: no build, no browser, no network.
//
// Structured as the Node port of scripts/check-internals-boundary.sh (the named
// in-tree idiom): a scan function, one `path:line:token` row per offense, a
// non-vacuity assertion that FAILS on an empty scan set with its own distinct
// message, a `--self-test` planting fixtures in `mktemp -d` (never a real repo
// file) that asserts the guard both rejects them AND names them, and argument
// dispatch at the bottom.
//
// -- Why a bare non-zero exit is not the contract (D-17) --
// An under-scanning scanner also exits non-zero on a dirty tree. So the red
// evidence is RECONCILED COUNTS, asserted by name in `--reconcile`:
//   1. every inventoried token with expected_count > 0 was found
//   2. each token's observed count EQUALS its expected count
//   3. every observed file appears in that token's expected_files
//   4. no occurrence was found that the inventory does not account for
// Condition 4 is the one that catches this file being wrong. It does NOT reuse
// the boundary matcher below -- it re-scans with `scope.residue_probes`, a
// case-insensitive raw-substring probe with no boundary rule at all, and
// asserts every probe hit lands inside a span some inventory row claimed. A
// boundary bug (missing `sourcererPrivilegedJs`, say) leaves an unclaimed probe
// hit and fails condition 4 even though conditions 1-3 all agree with
// themselves.
//
// -- `--reconcile` has two states, and says which one it is in --
// Pre-rename (any renameable occurrence still present): asserts 1-4 and exits
// non-zero. That run is the committed red evidence.
// Post-rename (zero renameable occurrences in scope): the four conditions above
// are about a tree that no longer exists, so instead it asserts that every
// `frozen` and `coincidental` row still reconciles by count -- the rename must
// not have eaten the XPCOM cid, the `a-` category prefix, or Gecko's own
// `%content/branding/` slot names. Exits 0. That assertion is what keeps the
// green run from being vacuous.
//
// -- `--scope-chain <name>` is a proof, not the gate --
// It narrows the scan to one coupled chain's files and rows so the rename
// machinery can be proven end-to-end on six sites before it is pointed at 755.
// Condition 2 (exact global counts) is deliberately NOT asserted in chain mode,
// because a chain row's expected_count is a whole-tree figure. The gate is the
// full-tree run.
//
// Text is read as UTF-8 and matched on JavaScript string code units with NO
// Unicode normalization -- normalizing would silently fold distinct byte
// sequences together. Binary paths are excluded by the inventory's explicit
// extension list rather than by content sniffing. Positions are reported as
// `path:line`, never as byte offsets.
//
// Usage:
//   node scripts/scan-brand-residue.mjs [--reconcile] [--scope-chain <name>]
//                                       [--report <path>] [--self-test]

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const INVENTORY_PATH = join(REPO_ROOT, 'inventory/brand-tokens.json');

export const CLASSES = Object.freeze([
  'brand-identifier',
  'brand-display',
  'identity',
  'frozen',
  'coincidental',
]);

/** Classes whose occurrences the rename must remove. Everything else stays put. */
export const RENAMEABLE_CLASSES = Object.freeze(['brand-identifier', 'brand-display', 'identity']);

export const CASE_FORMS = Object.freeze(['lower', 'title', 'upper', 'literal']);

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export function loadInventory(path = INVENTORY_PATH) {
  const inv = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(inv.tokens)) {
    throw new Error(`brand-tokens: FAIL -- ${path} has no tokens[] array`);
  }
  return inv;
}

// ---------------------------------------------------------------------------
// Token-boundary matching
// ---------------------------------------------------------------------------
//
// "Boundary" means the adjacent characters are not token characters, EXCEPT for
// the joins the inventory's case forms declare:
//
//   lower / title -- a camelCase join on the right is legal, so `sourcerer` in
//     `sourcererPrivilegedJs` and `Sourcerer` in `SourcererAPI` both match,
//     while `resourcerer` (letter on the left) and `Sourcerers` (lowercase on
//     the right) do not.
//   upper -- an UPPER_SNAKE join is legal, so `SOURCERER` in `SOURCERER_TOKEN`
//     matches while `SOURCERERX` does not.
//   literal -- a structural anchor (a UUID, a jar.mn slot name). No boundary
//     rule applies; it is matched as a raw substring.
//
// Matching is case-sensitive: the three case forms are three different tokens,
// not one token searched case-insensitively (Pitfall 1).

const LEFT_TOKEN_CHAR = /[A-Za-z0-9]/;
const RIGHT_LOWERISH = /[a-z0-9]/;
const RIGHT_UPPERISH = /[A-Za-z0-9]/;

export function isBoundaryMatch(text, index, token, caseForm) {
  if (caseForm === 'literal') return true;
  const before = index > 0 ? text[index - 1] : '';
  const after = index + token.length < text.length ? text[index + token.length] : '';
  if (before && LEFT_TOKEN_CHAR.test(before)) return false;
  const rightRe = caseForm === 'upper' ? RIGHT_UPPERISH : RIGHT_LOWERISH;
  if (after && rightRe.test(after)) return false;
  return true;
}

/** Every boundary-legal start index of `token` in `text`, ascending. */
export function findMatches(text, token, caseForm) {
  const out = [];
  let i = text.indexOf(token);
  while (i !== -1) {
    if (isBoundaryMatch(text, i, token, caseForm)) out.push(i);
    i = text.indexOf(token, i + 1);
  }
  return out;
}

/** Precomputed newline offsets, so index -> 1-based line is a binary search. */
export function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

export function lineOf(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

// ---------------------------------------------------------------------------
// Deterministic row order: longest token first, then UPPER_SNAKE, TitleCase,
// lowercase, then literal; ties broken by token then class so two runs of this
// file over the same inventory produce byte-identical output.
// ---------------------------------------------------------------------------

const CASE_RANK = { upper: 0, title: 1, lower: 2, literal: 3 };

export function orderRows(rows) {
  return [...rows].sort((a, b) =>
    b.token.length - a.token.length ||
    (CASE_RANK[a.case_form] ?? 9) - (CASE_RANK[b.case_form] ?? 9) ||
    a.token.localeCompare(b.token) ||
    a.class.localeCompare(b.class));
}

/**
 * Claims spans in `text` for the given rows, longest-token-first. A span already
 * claimed by an earlier (longer) row is never re-claimed, which is how
 * `@sourcerer.dev/...` is one identity occurrence rather than also a lowercase
 * brand occurrence, and how `/home/chris/coding/sourcerer/sourcerer/...` splits
 * into the coincidental repo root plus one brand token.
 */
export function claimOccurrences(text, rows, file) {
  const starts = lineIndex(text);
  const claimed = [];
  const taken = new Uint8Array(text.length);
  for (const row of orderRows(rows)) {
    for (const index of findMatches(text, row.token, row.case_form)) {
      let free = true;
      for (let k = index; k < index + row.token.length; k++) {
        if (taken[k]) { free = false; break; }
      }
      if (!free) continue;
      for (let k = index; k < index + row.token.length; k++) taken[k] = 1;
      claimed.push({ file, index, line: lineOf(starts, index), row });
    }
  }
  claimed.sort((a, b) => a.index - b.index);
  return { claimed, taken };
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export function scopeFiles(inv, { chainFiles = null } = {}) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const exclude = inv.scope?.exclude ?? [];
  const binary = inv.scope?.binary_extensions ?? [];
  let files = tracked.filter((p) =>
    !exclude.some((x) => p === x || p.startsWith(x)) &&
    !binary.some((ext) => p.toLowerCase().endsWith(ext)));
  if (chainFiles) {
    const want = new Set(chainFiles);
    files = files.filter((p) => want.has(p));
  }
  return files.sort();
}

export function chainOf(inv, name) {
  const rows = inv.tokens.filter((t) => t.chain === name);
  if (rows.length === 0) {
    throw new Error(`scan-brand-residue: FAIL -- no inventory row carries chain "${name}"`);
  }
  const files = [...new Set(rows.flatMap((t) => t.expected_files ?? []))].sort();
  return { rows, files };
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

export function scan(inv, { chain = null, root = REPO_ROOT, files = null, rows = null } = {}) {
  const activeRows = rows ?? (chain ? chainOf(inv, chain).rows : inv.tokens);
  const activeFiles = files ?? scopeFiles(inv, { chainFiles: chain ? chainOf(inv, chain).files : null });

  if (activeFiles.length === 0) {
    return { empty: true, occurrences: [], unclaimedProbes: [], files: activeFiles, rows: activeRows };
  }

  const occurrences = [];
  const unclaimedProbes = [];
  const probes = inv.scope?.residue_probes ?? [];

  for (const file of activeFiles) {
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch {
      continue; // a path git tracks but this checkout does not materialise
    }
    const { claimed, taken } = claimOccurrences(text, activeRows, file);
    occurrences.push(...claimed);

    // Condition 4's independent detector: raw case-insensitive substring, no
    // boundary rule, deliberately NOT the matcher above.
    const lower = text.toLowerCase();
    const starts = lineIndex(text);
    for (const probe of probes) {
      const needle = probe.toLowerCase();
      let i = lower.indexOf(needle);
      while (i !== -1) {
        if (!taken[i]) {
          unclaimedProbes.push({ file, line: lineOf(starts, i), probe, text: text.slice(i, i + needle.length) });
        }
        i = lower.indexOf(needle, i + 1);
      }
    }
  }

  occurrences.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.index - b.index);
  unclaimedProbes.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { empty: false, occurrences, unclaimedProbes, files: activeFiles, rows: activeRows };
}

export function offensesOf(result) {
  return result.occurrences.filter((o) => RENAMEABLE_CLASSES.includes(o.row.class));
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export function reconcile(inv, result, { chain = null } = {}) {
  const failures = [];
  const byRow = new Map();
  for (const o of result.occurrences) {
    const key = `${o.row.token}@${o.row.case_form}@${o.row.class}`;
    if (!byRow.has(key)) byRow.set(key, []);
    byRow.get(key).push(o);
  }

  const conditions = [];
  const postRename = offensesOf(result).length === 0;

  if (postRename) {
    // Green state. The four pre-rename conditions describe a tree that no
    // longer exists; assert instead that nothing the rename was forbidden to
    // touch moved, which is a real assertion over a real expected count.
    let checked = 0;
    for (const row of result.rows) {
      if (row.class !== 'frozen' && row.class !== 'coincidental') continue;
      const key = `${row.token}@${row.case_form}@${row.class}`;
      const observed = (byRow.get(key) ?? []).length;
      checked++;
      if (observed !== row.expected_count) {
        failures.push(`held-back row "${row.token}" (${row.case_form}/${row.class}): expected ${row.expected_count} occurrence(s), observed ${observed}`);
      }
    }
    conditions.push(`held-back rows intact: every frozen/coincidental row still reconciles by count (${checked} row(s) checked)`);
    if (checked === 0) {
      failures.push('held-back rows intact: no frozen or coincidental row was in scope, so a clean result would prove nothing');
    }
    return { postRename, conditions, failures };
  }

  // Red state: the four D-17 conditions, asserted by name.
  conditions.push('condition 1: every inventoried token with expected_count > 0 was found');
  for (const row of result.rows) {
    if (!(row.expected_count > 0)) continue;
    const key = `${row.token}@${row.case_form}@${row.class}`;
    if (!byRow.has(key)) {
      failures.push(`condition 1: token "${row.token}" (${row.case_form}/${row.class}) expected ${row.expected_count} occurrence(s), found none`);
    }
  }

  if (chain) {
    conditions.push('condition 2: SKIPPED in --scope-chain mode -- expected_count is a whole-tree figure; the full-tree run is the gate');
  } else {
    conditions.push('condition 2: each token\'s observed count EQUALS its expected count');
    for (const row of result.rows) {
      const key = `${row.token}@${row.case_form}@${row.class}`;
      const observed = (byRow.get(key) ?? []).length;
      if (observed !== row.expected_count) {
        failures.push(`condition 2: token "${row.token}" (${row.case_form}/${row.class}): expected ${row.expected_count}, observed ${observed}`);
      }
    }
  }

  conditions.push('condition 3: every observed file appears in that token\'s expected_files');
  for (const [key, list] of byRow) {
    const row = list[0].row;
    const allowed = new Set(row.expected_files ?? []);
    for (const file of new Set(list.map((o) => o.file))) {
      if (!allowed.has(file)) {
        failures.push(`condition 3: token "${row.token}" (${key.split('@').slice(1).join('/')}) found in ${file}, which is not in its expected_files`);
      }
    }
  }

  conditions.push('condition 4: no occurrence was found that the inventory does not account for (independent case-insensitive probe, no boundary rule)');
  for (const u of result.unclaimedProbes) {
    failures.push(`condition 4: ${u.file}:${u.line}: "${u.text}" matched probe "${u.probe}" but no inventory row claimed it`);
  }

  return { postRename, conditions, failures };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function renderReport(inv, result, rec, { chain = null } = {}) {
  const offenses = offensesOf(result);
  const heldBack = result.occurrences.filter((o) => !RENAMEABLE_CLASSES.includes(o.row.class));
  const lines = [];
  lines.push('# Residual-brand scan report');
  lines.push('');
  lines.push(`- Inventory: \`inventory/brand-tokens.json\``);
  lines.push(`- Scope: ${chain ? `chain \`${chain}\`` : 'whole tree (`git ls-files` minus `scope.exclude` minus binary extensions)'}`);
  lines.push(`- Files scanned: ${result.files.length}`);
  lines.push(`- Inventory rows in scope: ${result.rows.length}`);
  lines.push(`- Verdict: **${rec.postRename ? 'GREEN — no renameable occurrence remains' : 'RED — renameable occurrences remain'}**`);
  lines.push('');
  lines.push('## Reconciliation conditions asserted');
  lines.push('');
  for (const c of rec.conditions) lines.push(`- ${c}`);
  lines.push('');
  lines.push(rec.failures.length === 0
    ? 'All asserted conditions hold.'
    : `**${rec.failures.length} reconciliation failure(s):**`);
  if (rec.failures.length) {
    lines.push('');
    for (const f of rec.failures) lines.push(`- ${f}`);
  }
  lines.push('');
  lines.push(`## Offenses — occurrences that must be renamed (${offenses.length})`);
  lines.push('');
  lines.push('One row per occurrence, as `path:line:token`, sorted by path then line.');
  lines.push('');
  lines.push('```');
  for (const o of offenses) lines.push(`${o.file}:${o.line}:${o.row.token}`);
  if (offenses.length === 0) lines.push('(none)');
  lines.push('```');
  lines.push('');
  lines.push(`## Held back — frozen / coincidental occurrences the rename must not touch (${heldBack.length})`);
  lines.push('');
  lines.push('```');
  for (const o of heldBack) lines.push(`${o.file}:${o.line}:${o.row.token}  [${o.row.class}]`);
  if (heldBack.length === 0) lines.push('(none)');
  lines.push('```');
  lines.push('');
  lines.push('## Per-token totals');
  lines.push('');
  lines.push('| token | case | class | expected | observed |');
  lines.push('|---|---|---|---|---|');
  const counts = new Map();
  for (const o of result.occurrences) {
    const key = `${o.row.token}@${o.row.case_form}@${o.row.class}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const row of orderRows(result.rows)) {
    const key = `${row.token}@${row.case_form}@${row.class}`;
    lines.push(`| \`${row.token}\` | ${row.case_form} | ${row.class} | ${row.expected_count} | ${counts.get(key) ?? 0} |`);
  }
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

const SELF_TEST_INVENTORY = {
  $comment: 'scan-brand-residue.mjs --self-test fixture inventory. Never the real one.',
  scope: { exclude: [], binary_extensions: ['.png'], residue_probes: ['sourcerer'] },
  tokens: [
    {
      token: 'sourcerer',
      case_form: 'lower',
      class: 'brand-identifier',
      target: 'powerbrowser',
      expected_count: 1,
      expected_files: ['planted-violation.txt'],
    },
  ],
};

function selfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'scan-brand-residue-'));
  let overall = 0;
  try {
    // Fixture 1: a planted residual occurrence must be rejected AND named.
    const plantedRel = 'planted-violation.txt';
    writeFileSync(join(tmp, plantedRel), 'chrome://sourcerer/content/x\n');
    const r1 = scan(SELF_TEST_INVENTORY, { root: tmp, files: [plantedRel] });
    const o1 = offensesOf(r1);
    if (o1.length === 0) {
      console.error('scan-brand-residue: --self-test FAIL -- planted violation was NOT rejected');
      overall = 1;
    } else if (o1.some((o) => o.file === plantedRel)) {
      console.log(`scan-brand-residue: --self-test PASS -- planted violation was correctly rejected and named: ${o1[0].file}:${o1[0].line}:${o1[0].row.token}`);
    } else {
      console.error('scan-brand-residue: --self-test FAIL -- rejected, but message does not name the planted path');
      overall = 1;
    }

    // Fixture 2: the boundary rule. `resourcerer` is not a token match;
    // `sourcererPrivilegedJs` is (camelCase join).
    const boundaryRel = 'planted-boundary.txt';
    writeFileSync(join(tmp, boundaryRel), 'resourcerer\nsourcererPrivilegedJs\n');
    const invB = structuredClone(SELF_TEST_INVENTORY);
    invB.tokens[0].expected_files = [boundaryRel];
    const r2 = scan(invB, { root: tmp, files: [boundaryRel] });
    const hits = r2.occurrences.map((o) => o.line);
    if (hits.length === 1 && hits[0] === 2) {
      console.log('scan-brand-residue: --self-test PASS -- boundary rule left `resourcerer` untouched and matched `sourcererPrivilegedJs`');
    } else {
      console.error(`scan-brand-residue: --self-test FAIL -- boundary rule matched lines [${hits}], expected exactly [2] (planted-boundary.txt)`);
      overall = 1;
    }

    // Fixture 3: condition 4's independent probe catches an occurrence the
    // boundary matcher misses. `resourcerer` contains the probe but no row
    // claims it, so a --reconcile run must fail naming that file:line.
    const rec2 = reconcile(invB, r2, {});
    if (rec2.failures.some((f) => f.includes('condition 4') && f.includes(boundaryRel))) {
      console.log('scan-brand-residue: --self-test PASS -- condition 4 named the unclaimed probe hit in planted-boundary.txt');
    } else {
      console.error('scan-brand-residue: --self-test FAIL -- condition 4 did not name the unclaimed probe hit');
      overall = 1;
    }

    // Fixture 4: non-vacuity. An empty scan set is a FAIL, not a clean pass.
    const r3 = scan(SELF_TEST_INVENTORY, { root: tmp, files: [] });
    if (r3.empty) {
      console.log('scan-brand-residue: --self-test PASS -- an empty scan set is reported as empty, not as clean');
    } else {
      console.error('scan-brand-residue: --self-test FAIL -- empty scan set was not flagged');
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
    console.error('scan-brand-residue: FAIL -- --scope-chain requires a chain name');
    return 2;
  }
  const reportIdx = argv.indexOf('--report');
  const reportPath = reportIdx === -1 ? null : argv[reportIdx + 1];
  if (reportIdx !== -1 && !reportPath) {
    console.error('scan-brand-residue: FAIL -- --report requires a path');
    return 2;
  }
  const wantReconcile = argv.includes('--reconcile');

  if (!existsSync(INVENTORY_PATH)) {
    console.error(`scan-brand-residue: FAIL -- ${INVENTORY_PATH} does not exist; the inventory is this scan's only token source`);
    return 1;
  }
  const inv = loadInventory();
  if (inv.tokens.length === 0) {
    console.error('scan-brand-residue: FAIL -- inventory carries zero token rows; an empty token set is not a clean scan');
    return 1;
  }

  const result = scan(inv, { chain });
  if (result.empty) {
    console.error(`scan-brand-residue: FAIL -- the scanned file set is empty${chain ? ` for chain "${chain}"` : ''} -- an empty file set is not a clean tree, it is a scan that ran over nothing`);
    return 1;
  }

  const offenses = offensesOf(result);
  for (const o of offenses) {
    console.error(`  ${o.file}:${o.line}: ${o.row.token}`);
  }

  const rec = reconcile(inv, result, { chain });

  if (reportPath) {
    writeFileSync(resolve(REPO_ROOT, reportPath), renderReport(inv, result, rec, { chain }));
    console.log(`scan-brand-residue: report written to ${reportPath}`);
  }

  if (wantReconcile) {
    for (const c of rec.conditions) console.log(`scan-brand-residue: asserting ${c}`);
    for (const f of rec.failures) console.error(`scan-brand-residue: ${f}`);
  }

  if (offenses.length !== 0) {
    console.error(`scan-brand-residue: FAIL -- ${offenses.length} residual brand occurrence(s) across ${new Set(offenses.map((o) => o.file)).size} file(s)${chain ? ` in chain "${chain}"` : ''}`);
    return 1;
  }
  if (wantReconcile && rec.failures.length !== 0) {
    console.error(`scan-brand-residue: FAIL -- ${rec.failures.length} reconciliation failure(s)`);
    return 1;
  }
  console.log(`scan-brand-residue: PASS -- no residual brand occurrence in ${result.files.length} scanned file(s)${chain ? ` for chain "${chain}"` : ''}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(main(process.argv.slice(2)));
}
