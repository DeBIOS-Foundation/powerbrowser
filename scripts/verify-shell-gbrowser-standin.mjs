#!/usr/bin/env node
// scripts/verify-shell-gbrowser-standin.mjs
//
// G-14.1.1-19 gate (plan 14.1.1-04): the shell window's `gBrowser` stand-in
// implements exactly the member set upstream calls on it.
//
// The shell window is deliberately not Firefox chrome and has no tabbrowser,
// but privileged upstream code still reaches `win.gBrowser` and calls members
// on it. Those calls are optional-chained on the RECEIVER
// (`this?.documentGlobal?.gBrowser?.getTabForBrowser(this)`), so a non-nullish
// stand-in missing the member THROWS rather than short-circuiting -- once per
// overlay creation, burying the next real chrome-side error in the same log.
//
// This gate is a POSITIVE set-equality assertion, deliberately, and that
// choice is the point rather than an implementation detail. The reported
// defect is "no TypeError appears in the launch log", but CLAUDE.md's first
// verification rule forbids asserting on the ABSENCE of a log line whose
// emitter you do not control: an absence assertion over Gecko's console can
// never be shown to go red. So the invariant is restated as something the
// tree can prove -- the implemented member set EQUALS the set upstream calls
// -- which goes red on an upstream rebase that adds a call AND on a
// stand-in member that is deleted or added unreviewed.
//
// Both sides are DERIVED at check time (CLAUDE.md `## Verification` rule 2):
//
//   REQUIRED     -- every member name invoked on a `gBrowser` receiver in the
//                   upstream call sites listed in UPSTREAM_CALL_SITES below,
//                   optional chaining included. Read-only: this gate never
//                   writes to `upstream/`.
//   IMPLEMENTED  -- the top-level members of the `window.gBrowser` object
//                   literal in powerbrowser/shell/powerbrowser.js, parsed by
//                   brace matching with comment lines skipped the way the
//                   internals-boundary scan skips them, so a member named
//                   only in a comment cannot satisfy the set.
//
// DATA_MEMBERS below is the ONE hand-kept entry in this file, and it carries
// its reason: `tabs` is a data property no upstream `gBrowser`-receiver call
// site can derive (WebDriver reaches it through a local `tabBrowser` binding
// in remote/shared/TabManager.sys.mjs, never as `gBrowser.tabs(...)`). It is
// held OUT of the upstream-call comparison and asserted PRESENT separately,
// so deleting it is still red.
//
// An empty derivation on either side fails distinctly as a broken instrument.
// A negated or set-equality assertion over a walk that found nothing is not a
// clean tree.
//
// This file is exempt from its own scan by basename -- it must spell the
// shapes it matches, the same reason the internals-boundary guard exempts its
// boundary file.
//
// Honestly --quick: it reads text files only. No build, no browser, no
// display, no network.
//
// Self-test (--self-test): asserts the unmodified tree green first, then
// plants four faults, each asserted to have LANDED and each required to go
// red NAMING the drift: (a) a staged stand-in with one required member
// removed; (b) a staged upstream copy with a new member call added; (c) a
// staged stand-in carrying a surplus member nothing upstream calls; (d) an
// empty upstream file list.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = 'verify-shell-gbrowser-standin';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const SELF_BASENAME = 'verify-shell-gbrowser-standin.mjs';

// READ ONLY. Each entry carries the one-line reason it is in scope. Never
// written by this gate: `git -C upstream status --porcelain` must stay empty.
const UPSTREAM_CALL_SITES = [
  [
    'upstream/toolkit/content/widgets/browser-custom-element.mjs',
    'the <browser> element resolves its owning tabbrowser through an optional chain on the gBrowser RECEIVER, so a missing member throws instead of short-circuiting -- the exact reported overlay TypeError',
  ],
  [
    'upstream/browser/actors/LinkHandlerParent.sys.mjs',
    'the favicon/link actor calls gBrowser members for every page that declares a <link>, which is the highest-frequency caller against the shell window',
  ],
  [
    'upstream/browser/actors/ContextMenuParent.sys.mjs',
    'the context-menu actor reaches the owning tabbrowser for the browser it was invoked on; in scope so a rebase that introduces a call here is caught at check time rather than on screen',
  ],
];

const SHELL_FILE = 'powerbrowser/shell/powerbrowser.js';
const STANDIN_ANCHOR = 'window.gBrowser';

// The ONE hand-kept list in this file, each entry with its reason. A data
// property cannot be derived from a `gBrowser`-receiver CALL site, so it is
// held out of the set-equality comparison and asserted present on its own.
const DATA_MEMBERS = new Map([
  [
    'tabs',
    'WebDriver finds content browsing contexts through win.gBrowser.tabs and identifies each by its browser permanentKey; remote/shared/TabManager.sys.mjs reaches it through a local tabBrowser binding, so no gBrowser-receiver call site exists to derive it from',
  ],
]);

// A member CALL on a gBrowser receiver, optional chaining included. A bare
// `win.gBrowser` read or a `gBrowser` passed as an argument is not a member
// call and must not enter the required set.
const GBROWSER_CALL = /\bgBrowser\s*\??\.\s*([A-Za-z_$][\w$]*)\s*\(/g;

function isCommentLine(line) {
  const trimmed = line.replace(/^\s+/, '');
  return trimmed.startsWith('//') || trimmed.startsWith('*');
}

function stripCommentLines(src) {
  return src
    .split('\n')
    .map(line => (isCommentLine(line) ? '' : line))
    .join('\n');
}

function readSource(path) {
  const abs = path.startsWith('/') ? path : join(REPO_ROOT, path);
  try {
    return readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function deriveRequired(files) {
  const members = new Set();
  const unreadable = [];
  for (const path of files) {
    if (path.split('/').pop() === SELF_BASENAME) continue;
    const src = readSource(path);
    if (src === null) {
      unreadable.push(path);
      continue;
    }
    const code = stripCommentLines(src);
    let m;
    GBROWSER_CALL.lastIndex = 0;
    while ((m = GBROWSER_CALL.exec(code)) !== null) {
      members.add(m[1]);
    }
  }
  return { members, unreadable };
}

// Top-level member names of the object literal that follows `anchor`, by
// brace matching over comment-stripped source with string literals skipped.
// Returns null when the anchor or its literal cannot be found at all -- a
// distinct broken-instrument outcome, never an empty clean set.
function objectLiteralMembers(code, anchor) {
  const at = code.indexOf(anchor);
  if (at === -1) return null;
  const open = code.indexOf('{', at);
  if (open === -1) return null;

  const members = new Set();
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '{' || c === '[' || c === '(') {
      depth++;
      continue;
    }
    if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (depth === 0) return members;
      continue;
    }
    if (depth === 1 && /[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < code.length && /[\w$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let k = j;
      while (k < code.length && /\s/.test(code[k])) k++;
      // A key is an identifier followed by `:` (property) or `(` (method
      // shorthand). Anything else at depth 1 is not a member name.
      if (code[k] === ':' || code[k] === '(') members.add(word);
      i = j - 1;
    }
  }
  return null; // unbalanced literal -- broken instrument, not a clean set
}

function deriveImplemented(shellFile) {
  const src = readSource(shellFile);
  if (src === null) return { members: null, reason: 'unreadable' };
  const members = objectLiteralMembers(stripCommentLines(src), STANDIN_ANCHOR);
  if (members === null) return { members: null, reason: 'no-literal' };
  return { members, reason: '' };
}

function sorted(set) {
  return [...set].sort();
}

function runScan(upstreamFiles, shellFile) {
  if (upstreamFiles.length === 0) {
    return { ok: false, reason: 'empty-upstream', detail: 'no upstream call-site files were supplied' };
  }
  const { members: required, unreadable } = deriveRequired(upstreamFiles);
  if (unreadable.length) {
    return { ok: false, reason: 'unreadable-upstream', detail: unreadable.join(', ') };
  }
  if (required.size === 0) {
    return { ok: false, reason: 'empty-required', detail: 'derived zero gBrowser member calls from the upstream call sites' };
  }

  const impl = deriveImplemented(shellFile);
  if (impl.members === null) {
    return { ok: false, reason: `implemented-${impl.reason}`, detail: shellFile };
  }
  if (impl.members.size === 0) {
    return { ok: false, reason: 'empty-implemented', detail: shellFile };
  }

  const missingData = [...DATA_MEMBERS.keys()].filter(k => !impl.members.has(k));
  const methods = new Set([...impl.members].filter(m => !DATA_MEMBERS.has(m)));
  const unimplemented = sorted(new Set([...required].filter(m => !methods.has(m))));
  const surplus = sorted(new Set([...methods].filter(m => !required.has(m))));

  return {
    ok: unimplemented.length === 0 && surplus.length === 0 && missingData.length === 0,
    reason: '',
    required: sorted(required),
    implemented: sorted(impl.members),
    unimplemented,
    surplus,
    missingData,
  };
}

function reportFailure(result) {
  switch (result.reason) {
    case 'empty-upstream':
      console.error(`${NAME}: FAIL -- broken instrument: ${result.detail}. A set comparison over an empty upstream file list proves nothing.`);
      return;
    case 'unreadable-upstream':
      console.error(`${NAME}: FAIL -- broken instrument: unreadable upstream call site(s): ${result.detail}`);
      return;
    case 'empty-required':
      console.error(`${NAME}: FAIL -- broken instrument: ${result.detail}. An empty required set is a broken derivation, not a clean tree.`);
      return;
    case 'implemented-unreadable':
      console.error(`${NAME}: FAIL -- broken instrument: cannot read ${result.detail}`);
      return;
    case 'implemented-no-literal':
      console.error(`${NAME}: FAIL -- broken instrument: no balanced '${STANDIN_ANCHOR} = { ... }' object literal found in ${result.detail}`);
      return;
    case 'empty-implemented':
      console.error(`${NAME}: FAIL -- broken instrument: the ${STANDIN_ANCHOR} literal in ${result.detail} has no members at all`);
      return;
    default:
      break;
  }
  console.error(`${NAME}: FAIL -- the shell gBrowser stand-in does not match what upstream calls on it`);
  console.error(`  required (derived from upstream): ${result.required.join(', ')}`);
  console.error(`  implemented (derived from ${SHELL_FILE}): ${result.implemented.join(', ')}`);
  for (const m of result.unimplemented) {
    console.error(`  UNIMPLEMENTED: '${m}' is called on a gBrowser receiver upstream but the stand-in does not implement it -- every such call is a TypeError, once per overlay creation`);
  }
  for (const m of result.surplus) {
    console.error(`  DEAD SURFACE: '${m}' is implemented on the stand-in but nothing upstream calls it -- remove it rather than carry it`);
  }
  for (const m of result.missingData) {
    console.error(`  MISSING DATA MEMBER: '${m}' -- ${DATA_MEMBERS.get(m)}`);
  }
}

function main() {
  const result = runScan(UPSTREAM_CALL_SITES.map(([p]) => p), SHELL_FILE);
  if (!result.ok) {
    reportFailure(result);
    process.exit(1);
  }
  console.log(
    `${NAME}: PASS -- required {${result.required.join(', ')}} derived from ${UPSTREAM_CALL_SITES.length} upstream call sites equals the stand-in's implemented method set; data member(s) {${[...DATA_MEMBERS.keys()].join(', ')}} present`
  );
}

function selfTest() {
  const realUpstream = UPSTREAM_CALL_SITES.map(([p]) => p);
  const baseline = runScan(realUpstream, SHELL_FILE);
  if (!baseline.ok) {
    console.error(`${NAME} --self-test: FAIL -- the unmodified tree is already red, so the planted-fault results below would be meaningless:`);
    reportFailure(baseline);
    process.exit(1);
  }
  console.log(`${NAME} --self-test: unmodified tree green -- required {${baseline.required.join(', ')}} == implemented {${baseline.implemented.join(', ')}}; planting faults`);

  const required = baseline.required;
  const victim = required[0];
  const stage = mkdtempSync(join(tmpdir(), 'pb-gbrowser-standin-'));
  if (/\s/.test(stage)) throw new Error(`${NAME}: FAIL -- stage path contains a space: ${stage}`);
  let failed = 0;

  // A stand-in fixture built from a member list, so a plant is unambiguous
  // and exercises the same literal parser the real check uses.
  const writeStandIn = (path, members) => {
    const body = members.map(m => (m === 'tabs' ? '  tabs: [{ linkedBrowser: b }],' : `  ${m}() { return null; },`)).join('\n');
    writeFileSync(path, `window.gBrowser = {\n${body}\n};\n`);
  };

  try {
    // Plant (a): a required member removed from the stand-in.
    {
      const path = join(stage, 'standin-missing.js');
      writeStandIn(path, ['tabs', ...required.filter(m => m !== victim)]);
      const impl = deriveImplemented(path);
      if (!impl.members || impl.members.has(victim)) {
        console.error(`${NAME} --self-test: FAIL -- 'missing member' plant did not land (${victim} still parsed as implemented)`);
        failed++;
      } else {
        const r = runScan(realUpstream, path);
        if (r.ok || !r.unimplemented?.includes(victim)) {
          console.error(`${NAME} --self-test: FAIL -- removing '${victim}' did not go red naming it; got: ${JSON.stringify({ reason: r.reason, unimplemented: r.unimplemented, surplus: r.surplus })}`);
          failed++;
        } else {
          console.log(`  ok  stand-in missing '${victim}' -> red, naming it UNIMPLEMENTED`);
        }
      }
    }

    // Plant (b): an upstream file gaining a new gBrowser member call.
    {
      const planted = 'zzzPlantedRebaseMember';
      const source = UPSTREAM_CALL_SITES[1][0];
      const path = join(stage, 'upstream-new-call.sys.mjs');
      writeFileSync(path, `${readSource(source)}\nfunction plantedRebase(gBrowser, tab) {\n  return gBrowser.${planted}(tab);\n}\n`);
      const landed = readFileSync(path, 'utf8').includes(`gBrowser.${planted}(`);
      if (!landed) {
        console.error(`${NAME} --self-test: FAIL -- 'new upstream call' plant did not land`);
        failed++;
      } else {
        const r = runScan([path, UPSTREAM_CALL_SITES[0][0], UPSTREAM_CALL_SITES[2][0]], SHELL_FILE);
        if (r.ok || !r.unimplemented?.includes(planted)) {
          console.error(`${NAME} --self-test: FAIL -- a new upstream member call did not go red naming '${planted}'; got: ${JSON.stringify({ reason: r.reason, unimplemented: r.unimplemented })}`);
          failed++;
        } else {
          console.log(`  ok  upstream rebase adding '${planted}' -> red, naming it UNIMPLEMENTED`);
        }
      }
    }

    // Plant (c): a surplus stand-in member nothing upstream calls.
    {
      const planted = 'zzzDeadSurfaceMember';
      const path = join(stage, 'standin-surplus.js');
      writeStandIn(path, ['tabs', ...required, planted]);
      const impl = deriveImplemented(path);
      if (!impl.members || !impl.members.has(planted)) {
        console.error(`${NAME} --self-test: FAIL -- 'surplus member' plant did not land`);
        failed++;
      } else {
        const r = runScan(realUpstream, path);
        if (r.ok || !r.surplus?.includes(planted)) {
          console.error(`${NAME} --self-test: FAIL -- a surplus stand-in member did not go red naming '${planted}'; got: ${JSON.stringify({ reason: r.reason, surplus: r.surplus })}`);
          failed++;
        } else {
          console.log(`  ok  stand-in surplus '${planted}' -> red, naming it DEAD SURFACE`);
        }
      }
    }

    // Plant (d): an empty upstream file list is a broken instrument, never clean.
    {
      const r = runScan([], SHELL_FILE);
      if (r.ok || r.reason !== 'empty-upstream') {
        console.error(`${NAME} --self-test: FAIL -- an empty upstream file list did not fail distinctly as a broken instrument; got reason='${r.reason}'`);
        failed++;
      } else {
        console.log(`  ok  empty upstream file list -> distinct broken-instrument failure, not clean`);
      }
    }

    // Positive control on the data member: dropping `tabs` is red too, so the
    // hold-out is not a blanket exemption.
    {
      const path = join(stage, 'standin-no-tabs.js');
      writeStandIn(path, required);
      const r = runScan(realUpstream, path);
      if (r.ok || !r.missingData?.includes('tabs')) {
        console.error(`${NAME} --self-test: FAIL -- dropping the 'tabs' data member did not go red naming it; got: ${JSON.stringify({ reason: r.reason, missingData: r.missingData })}`);
        failed++;
      } else {
        console.log(`  ok  stand-in missing 'tabs' -> red, naming it MISSING DATA MEMBER`);
      }
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }

  if (failed) process.exit(1);
  console.log(`${NAME} --self-test: PASS -- every planted fault landed and went red naming its drift; the empty file list failed distinctly`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  main();
}
