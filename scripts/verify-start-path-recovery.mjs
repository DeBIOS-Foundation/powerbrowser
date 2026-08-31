#!/usr/bin/env node
// scripts/verify-start-path-recovery.mjs
//
// start-path-recovery (static) / health-gate-recovery-swaps (runtime) -- 01-09.
//
// The start path's recovery contract: a spawn that announces readiness, pins a
// port, and then FAILS the health gate must not poison the rest of the browser
// session. The next spawn that actually passes the health gate has to perform
// the full one-time initialisation -- session cookie, the single navigation,
// the steady-state health loop -- so the branded loading layer is hidden and
// the user reaches the interface.
//
// 01-VERIFICATION.md recorded that clause FAILED. The root cause was one
// conflation in the supervisor's own state keying: "a port has been pinned"
// (`this._port !== null`) and "a spawn has actually completed" (`this._swapped`)
// were treated as one condition, so a single transient health-gate failure
// permanently skipped the initialisation block on every later, successful
// respawn.
//
// HOW THE STATIC HALF ASSERTS (default invocation). Two facts are DERIVED
// independently from TheiaService.sys.mjs at check time:
//   A -- the instance field named in `_swap()`'s own early-return guard;
//   B -- the instance field named in the guard of `_spawnAndGate`'s one-time
//        initialisation block, located by its BODY (the block that sets the
//        session cookie, calls the navigation helper and starts the health
//        loop), never by a line number.
// The assertion is A === B. Renaming the field at both sites keeps this green
// -- correct, the invariant still holds. Re-keying the block onto anything else
// goes red NAMING BOTH derived values. Deleting either site goes red naming
// which derivation yielded nothing. There is no literal field name written into
// this file for the tree to agree with. One ordering assertion rides along:
// `_swap()` must set that field AFTER the navigation call, so a throwing swap
// cannot leave the launch permanently marked done.
//
// HOW THE LOG HALF ASSERTS (--log <path>). Before matching anything, the
// analyzer proves the sentinel prefixes it greps for are emitted BY THE CODE
// UNDER TEST -- they must appear as `dump(` literals in powerbrowser.js -- and
// derives the health-gate failure's log signature from the `_fatal()` template
// that writes it, rather than keeping a copy of that sentence here. A rename of
// either sentinel, or of that failure text, goes red here instead of silently
// never matching. Then, over the log:
//   1. the derived health-gate failure line is present  (the plant fired);
//   2. the swap sentinel is present;
//   3. it appears EXACTLY ONCE  (the one-time block ran once, not twice);
//   4. the deck-state line whose `where` is the swap reports `loading` as
//      `none`  (JSON-parsed, never substring-matched);
//   5. the failure PRECEDES the swap, by byte offset. Without (5) this check
//      would also pass on a run whose first health probe simply succeeded --
//      the happy path the existing smoke tests already cover, and the exact
//      vacuity this gap exists to remove.
//
// This is the ONE analyzer the registered runtime row
// (check_health_gate_recovery_swaps in verify-platform.sh) drives, so the
// assertion that ships is the assertion that gets fault-proven.
//
// Static on purpose: both halves read source and a log, need no build, no
// browser, no display and no network, so a regression in the recovery contract
// costs seconds rather than a rebuild.
//
// Usage:
//   node scripts/verify-start-path-recovery.mjs [--file <path>] [--shell-file <path>]
//   node scripts/verify-start-path-recovery.mjs --log <path> [--file <path>] [--shell-file <path>]
//   node scripts/verify-start-path-recovery.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test plants faults on both halves, requires each
// to go red naming the drift, and requires two clean controls to go green -- a
// self-test whose fixture is already red before any plant proves nothing about
// the plants.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(SELF), "..");
const DEFAULT_SUPERVISOR = join(REPO_ROOT, "powerbrowser/shell/TheiaService.sys.mjs");
const DEFAULT_SHELL = join(REPO_ROOT, "powerbrowser/shell/powerbrowser.js");

// The two sentinel prefixes this analyzer reads. They are NOT an expectation:
// every mode below first proves each one is emitted by a `dump(` in the chrome
// bootstrap under test, and fails by name when it is not.
const SWAP_SENTINEL = "POWERBROWSER_SHELL_SWAP";
const DECK_SENTINEL = "POWERBROWSER_DECK_STATE";

// The PowerBrowserAPI.log() mirror prefix, exactly as verify-platform.sh's own
// first_byte_offset/sentinel_present helpers tolerate it.
const MIRROR_PREFIX = /^\[PowerBrowserAPI\] [a-z]+: /;

const failures = [];
const fail = (msg) => failures.push(msg);

/**
 * Removes block comments and whole-line `//` comments so the derivations see
 * code only. Trailing `//` comments are deliberately NOT stripped: the sources
 * read here contain `http://127.0.0.1` and `chrome://powerbrowser/...` inside
 * real strings, and a naive strip-to-end-of-line would mangle them into
 * silence.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

function readSource(path, what) {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    fail(`cannot read the ${what} at ${path}: ${err.message}`);
    return null;
  }
}

// --- derivations -----------------------------------------------------------

/** Every ALL-CAPS prefix this file hands to `dump(` as a literal or template. */
function deriveDumpSentinels(shellSrc) {
  const found = new Set();
  for (const m of shellSrc.matchAll(/dump\(\s*[`"']([A-Z][A-Z0-9_]*)/g)) {
    found.add(m[1]);
  }
  return found;
}

/** Derivation A: the instance field named in `_swap()`'s early-return guard. */
function deriveSwapGuardField(src) {
  const m = src.match(/_swap\(\)\s*\{\s*if\s*\(\s*this\.(_[A-Za-z0-9_]+)\s*\)\s*\{\s*return;/);
  return m ? m[1] : null;
}

/**
 * Derivation B: the instance field named in the guard of `_spawnAndGate`'s
 * one-time initialisation block -- located by its BODY (the block that sets the
 * session cookie), never by a line number, so the block may move freely.
 */
function deriveOneTimeBlockField(src) {
  const m = src.match(/if\s*\(([^)]*)\)\s*\{\s*PowerBrowserAPI\.setSessionCookie\(/);
  if (!m) {
    return { field: null, reason: "no `if (...) { PowerBrowserAPI.setSessionCookie(` block found" };
  }
  const body = src.slice(m.index, m.index + 1200);
  if (!body.includes("this._swap()") || !body.includes("this._healthLoop()")) {
    return {
      field: null,
      reason:
        "the block guarding PowerBrowserAPI.setSessionCookie( no longer also calls this._swap() and " +
        "this._healthLoop() -- the one-time initialisation block has been split, so there is nothing " +
        "single left to key on",
    };
  }
  const fieldMatch = m[1].match(/this\.(_[A-Za-z0-9_]+)/);
  if (!fieldMatch) {
    return {
      field: null,
      reason: `the one-time initialisation block's guard \`${m[1].trim()}\` names no instance field`,
    };
  }
  return { field: fieldMatch[1], reason: null };
}

/**
 * The health-gate failure's log signature, derived from the `_fatal()` template
 * that writes it: its fixed leading text, up to the first interpolation. A
 * template that moved makes every log assertion below vacuous, so this failing
 * to locate is itself a named failure.
 */
function deriveHealthFailureText(src) {
  const m = src.match(/this\._fatal\(\s*`([^`]*never returned 200[^`]*)`/);
  if (!m) {
    return null;
  }
  const fixed = m[1].split("${")[0].trim();
  return fixed.length > 0 ? fixed : null;
}

// --- assertions ------------------------------------------------------------

/** Every mode: prove the prefixes this analyzer greps for are actually emitted. */
function assertEmitters(shellPath) {
  const raw = readSource(shellPath, "chrome bootstrap source");
  if (raw === null) {
    return;
  }
  const emitted = deriveDumpSentinels(stripComments(raw));
  for (const prefix of [SWAP_SENTINEL, DECK_SENTINEL]) {
    if (!emitted.has(prefix)) {
      fail(
        `the chrome bootstrap (${shellPath}) emits no \`dump(\` line beginning \`${prefix}\` -- ` +
          `this analyzer greps for it, so a match could only ever come from something other than the code under test`
      );
    }
  }
}

function assertStatic(supervisorPath) {
  const raw = readSource(supervisorPath, "supervisor source");
  if (raw === null) {
    return;
  }
  const src = stripComments(raw);

  const swapField = deriveSwapGuardField(src);
  if (!swapField) {
    fail(
      "derivation A yielded nothing: `_swap()` has no `if (this.<field>) { return; }` early-return guard -- " +
        "without it a swap can run twice, and there is no completion field left to compare against"
    );
  }

  const block = deriveOneTimeBlockField(src);
  if (!block.field) {
    fail(`derivation B yielded nothing: ${block.reason}`);
  }

  if (swapField && block.field && swapField !== block.field) {
    fail(
      `the one-time initialisation block is keyed on \`this.${block.field}\` while \`_swap()\`'s own guard ` +
        `reads \`this.${swapField}\` -- "a spawn has actually completed" and whatever \`this.${block.field}\` ` +
        `records are two different facts, and treating them as one is the conflation that strands a launch on ` +
        `the loading layer after a failed health gate`
    );
  }

  // The completion field must be set AFTER the navigation returns, so a
  // throwing swap leaves the launch retryable rather than permanently done.
  if (swapField) {
    const body = src.match(/_swap\(\)\s*\{[\s\S]*?\n {2}\},/);
    if (!body) {
      fail("could not isolate `_swap()`'s method body -- the assignment-order assertion would be vacuous");
    } else {
      const navIndex = body[0].indexOf("powerbrowserSwapToUrl(");
      const setIndex = body[0].indexOf(`this.${swapField} = true`);
      if (navIndex === -1) {
        fail("`_swap()` no longer calls powerbrowserSwapToUrl( -- the navigation site this contract is about has moved");
      } else if (setIndex === -1) {
        fail(`\`_swap()\` never assigns \`this.${swapField} = true\` -- the completion field is never recorded`);
      } else if (setIndex < navIndex) {
        fail(
          `\`_swap()\` sets \`this.${swapField} = true\` BEFORE calling powerbrowserSwapToUrl( -- a swap that ` +
            `throws would leave the launch permanently marked done, reintroducing the conflation class this ` +
            `check exists to remove`
        );
      }
    }
  }
}

function assertLog(logPath, supervisorPath) {
  const supRaw = readSource(supervisorPath, "supervisor source");
  if (supRaw === null) {
    return;
  }
  const failureText = deriveHealthFailureText(stripComments(supRaw));
  if (!failureText) {
    fail(
      "could not locate the `_fatal()` call reporting that the health probe never returned 200 -- " +
        "the log assertions below derive their match pattern from it, so every one of them would be vacuous"
    );
    return;
  }

  let log;
  try {
    log = readFileSync(logPath, "utf8");
  } catch (err) {
    fail(`cannot read the launch log at ${logPath}: ${err.message}`);
    return;
  }

  // (1) the plant fired.
  const failureOffset = log.indexOf(failureText);
  if (failureOffset === -1) {
    fail(
      `the launch log carries no health-gate failure line (derived signature ${JSON.stringify(failureText)}) -- ` +
        `the planted fault never fired, so this run exercises the happy path and proves nothing about recovery`
    );
  }

  // (2)/(3) the swap sentinel, exactly once.
  const swapLines = log
    .split("\n")
    .map((line) => line.replace(MIRROR_PREFIX, ""))
    .filter((line) => line.startsWith(`${SWAP_SENTINEL} `));
  if (swapLines.length === 0) {
    fail(
      `the launch log carries no ${SWAP_SENTINEL} sentinel -- the spawn that passed the health gate never ` +
        `performed the one-time initialisation, so the user is still looking at the loading layer with a ` +
        `healthy backend behind it`
    );
  } else if (swapLines.length !== 1) {
    fail(
      `the launch log carries ${swapLines.length} ${SWAP_SENTINEL} sentinels, expected exactly once -- ` +
        `the one-time initialisation block ran more than once`
    );
  }

  // (4) the deck's resolved visibility at the swap.
  const deckPayload = log
    .split("\n")
    .map((line) => line.replace(MIRROR_PREFIX, ""))
    .filter((line) => line.startsWith(`${DECK_SENTINEL} `))
    .map((line) => {
      try {
        return JSON.parse(line.slice(DECK_SENTINEL.length + 1));
      } catch {
        return null;
      }
    })
    .find((payload) => payload && payload.where === "swap");
  if (!deckPayload) {
    fail(
      `the launch log carries no ${DECK_SENTINEL} payload whose \`where\` is "swap" -- ` +
        `the deck's resolved visibility at the navigation was never announced, so nothing here observes it`
    );
  } else if (deckPayload.loading !== "none") {
    fail(
      `at the swap, the deck reports the loading layer as ${JSON.stringify(deckPayload.loading)} rather than ` +
        `"none" -- the branded loading layer is still covering the content browser after the navigation`
    );
  }

  // (5) ordering: the failure must precede the swap.
  const swapOffset = log.search(new RegExp(`^(\\[PowerBrowserAPI\\] [a-z]+: )?${SWAP_SENTINEL} `, "m"));
  if (failureOffset !== -1 && swapOffset !== -1 && failureOffset > swapOffset) {
    fail(
      `the ${SWAP_SENTINEL} sentinel (byte ${swapOffset}) precedes the health-gate failure (byte ${failureOffset}) -- ` +
        `the first health probe simply succeeded and the recovery branch was never entered, which is the happy ` +
        `path the smoke tests already cover`
    );
  }
}

// ---------------------------------------------------------------------------
// --self-test: plant faults, require each to go red naming the drift, and
// require clean controls to go green so every red is proven plant-caused.
// ---------------------------------------------------------------------------

/**
 * The exact line shapes assertLog parses -- the clean control. Every log fault
 * below is ONE mutation of this, so each red differs from the green control by
 * exactly one thing.
 */
function cleanLogLines(failureText) {
  return [
    "POWERBROWSER_SHELL_READY chrome://powerbrowser/content/powerbrowser.xhtml",
    `[PowerBrowserAPI] error: [TheiaService] ${failureText} 41234 never returned 200 within 3000ms.`,
    'POWERBROWSER_BACKEND_READY {"port":41235,"pid":4242}',
    `${SWAP_SENTINEL} http://127.0.0.1:41235/`,
    `${DECK_SENTINEL} {"loading":"none","error":"none","diagnostics":"none","where":"swap"}`,
    "",
  ];
}

const SOURCE_FAULTS = [
  {
    name: "the one-time initialisation block re-keyed onto a different condition",
    target: "supervisor",
    apply: (s) => s.replace("if (!this._swapped) {", "if (!this._errorShown) {"),
    expect: "is keyed on `this._errorShown` while `_swap()`'s own guard reads `this._swapped`",
  },
  {
    name: "`_swap()`'s early-return guard removed, so derivation A yields nothing",
    target: "supervisor",
    apply: (s) => s.replace("  _swap() {\n    if (this._swapped) {\n      return;\n    }\n", "  _swap() {\n"),
    expect: "derivation A yielded nothing",
  },
  {
    name: "the completion field set before the navigation instead of after it",
    target: "supervisor",
    apply: (s) =>
      s.replace(
        "    this._browserElement.ownerDocument.defaultView.powerbrowserSwapToUrl(`http://127.0.0.1:${this._port}/`);\n    this._swapped = true;",
        "    this._swapped = true;\n    this._browserElement.ownerDocument.defaultView.powerbrowserSwapToUrl(`http://127.0.0.1:${this._port}/`);"
      ),
    expect: "BEFORE calling powerbrowserSwapToUrl(",
  },
  {
    name: "the swap sentinel renamed in the chrome bootstrap, so the emitter proof fails",
    target: "shell",
    apply: (s) => s.replace(`dump(\`${SWAP_SENTINEL} `, "dump(`POWERBROWSER_SHELL_NAVIGATED "),
    expect: `emits no \`dump(\` line beginning \`${SWAP_SENTINEL}\``,
  },
];

const LOG_FAULTS = [
  {
    name: "a log missing the swap sentinel",
    apply: (lines) => lines.filter((l) => !l.startsWith(`${SWAP_SENTINEL} `)),
    expect: `carries no ${SWAP_SENTINEL} sentinel`,
  },
  {
    name: "a log missing the derived health-gate failure line",
    apply: (lines) => lines.filter((l) => !l.includes("never returned 200")),
    expect: "carries no health-gate failure line",
  },
  {
    name: "a log whose swap deck-state reports the loading layer still displayed",
    apply: (lines) => lines.map((l) => l.replace('"loading":"none"', '"loading":"flex"')),
    expect: "reports the loading layer as",
  },
  {
    name: "a log carrying two swap sentinels",
    apply: (lines) => lines.flatMap((l) => (l.startsWith(`${SWAP_SENTINEL} `) ? [l, l] : [l])),
    expect: `carries 2 ${SWAP_SENTINEL} sentinels`,
  },
  {
    name: "a log in which the swap precedes the health-gate failure",
    apply: (lines) => {
      const failLine = lines.find((l) => l.includes("never returned 200"));
      return [...lines.filter((l) => l !== failLine), failLine];
    },
    expect: "precedes the health-gate failure",
  },
];

function runOnce(args) {
  try {
    const out = execFileSync(process.execPath, [SELF, ...args], { encoding: "utf8", stdio: "pipe" });
    return { exitCode: 0, out };
  } catch (err) {
    return { exitCode: err.status ?? 1, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function judge(name, expect, result) {
  if (result.exitCode === 0) {
    console.error(`  FAIL  ${name} -- planted fault did NOT go red`);
    return false;
  }
  if (!result.out.includes(expect)) {
    console.error(
      `  FAIL  ${name} -- went red but did not name the drift (expected output to mention ${JSON.stringify(expect)})\n` +
        result.out.replace(/^/gm, "        ")
    );
    return false;
  }
  console.log(`  ok    ${name} -- red, naming the drift`);
  return true;
}

function runSelfTest(supervisorPath, shellPath) {
  let supervisorSrc;
  let shellSrc;
  try {
    supervisorSrc = readFileSync(supervisorPath, "utf8");
    shellSrc = readFileSync(shellPath, "utf8");
  } catch (err) {
    console.error(`  FAIL  clean control -- cannot read a derivation source: ${err.message}`);
    return false;
  }
  const failureText = deriveHealthFailureText(stripComments(supervisorSrc));
  if (!failureText) {
    console.error(
      "  FAIL  clean control -- could not derive the health-gate failure signature from the supervisor " +
        "source; every log row below would be built from an invented sentence"
    );
    return false;
  }

  const dir = mkdtempSync(join(tmpdir(), "verify-start-path-recovery-"));
  let allOk = true;
  try {
    const cleanLog = join(dir, "clean.log");
    writeFileSync(cleanLog, cleanLogLines(failureText).join("\n"));

    // Clean controls FIRST: a self-test whose fixture is already red before any
    // plant proves nothing about the plants.
    const staticControl = runOnce(["--file", supervisorPath, "--shell-file", shellPath]);
    if (staticControl.exitCode !== 0) {
      console.error(
        `  FAIL  clean control (static) -- the unmutated tree is already red:\n${staticControl.out.replace(/^/gm, "        ")}`
      );
      allOk = false;
    } else {
      console.log("  ok    clean control (static) -- green on the unmutated tree");
    }
    const logControl = runOnce(["--log", cleanLog, "--file", supervisorPath, "--shell-file", shellPath]);
    if (logControl.exitCode !== 0) {
      console.error(
        `  FAIL  clean control (log) -- the unmutated clean log is already red:\n${logControl.out.replace(/^/gm, "        ")}`
      );
      allOk = false;
    } else {
      console.log("  ok    clean control (log) -- green on the unmutated clean log");
    }

    const supCopy = join(dir, "TheiaService.sys.mjs");
    const shellCopy = join(dir, "powerbrowser.js");
    for (const fault of SOURCE_FAULTS) {
      const original = fault.target === "supervisor" ? supervisorSrc : shellSrc;
      const mutated = fault.apply(original);
      if (mutated === original) {
        console.error(`  FAIL  ${fault.name} -- the fault did not apply; this self-test row proves nothing`);
        allOk = false;
        continue;
      }
      writeFileSync(supCopy, fault.target === "supervisor" ? mutated : supervisorSrc);
      writeFileSync(shellCopy, fault.target === "shell" ? mutated : shellSrc);
      if (!judge(fault.name, fault.expect, runOnce(["--file", supCopy, "--shell-file", shellCopy]))) {
        allOk = false;
      }
    }

    const clean = cleanLogLines(failureText);
    const faultedLog = join(dir, "faulted.log");
    for (const fault of LOG_FAULTS) {
      const mutated = fault.apply(clean);
      if (mutated.join("\n") === clean.join("\n")) {
        console.error(`  FAIL  ${fault.name} -- the fault did not apply; this self-test row proves nothing`);
        allOk = false;
        continue;
      }
      writeFileSync(faultedLog, mutated.join("\n"));
      if (!judge(fault.name, fault.expect, runOnce(["--log", faultedLog, "--file", supervisorPath, "--shell-file", shellPath]))) {
        allOk = false;
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return allOk;
}

// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let supervisorPath = DEFAULT_SUPERVISOR;
let shellPath = DEFAULT_SHELL;
let logPath = null;
let selfTest = false;

const needsValue = (i, flag) => {
  const value = argv[i + 1];
  if (!value) {
    console.error(`verify-start-path-recovery: FAIL -- ${flag} requires a path argument`);
    process.exit(1);
  }
  return value;
};

for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--self-test") {
    selfTest = true;
  } else if (argv[i] === "--file") {
    supervisorPath = needsValue(i, "--file");
    i += 1;
  } else if (argv[i] === "--shell-file") {
    shellPath = needsValue(i, "--shell-file");
    i += 1;
  } else if (argv[i] === "--log") {
    logPath = needsValue(i, "--log");
    i += 1;
  } else {
    console.error(`verify-start-path-recovery: FAIL -- unknown argument '${argv[i]}'`);
    process.exit(1);
  }
}

if (selfTest) {
  const faultCount = SOURCE_FAULTS.length + LOG_FAULTS.length;
  console.log(`verify-start-path-recovery --self-test: planting ${faultCount} fault(s) plus 2 clean controls`);
  if (runSelfTest(supervisorPath, shellPath)) {
    console.log(`verify-start-path-recovery: PASS -- all ${faultCount + 2} self-test rows behaved as required`);
    process.exit(0);
  }
  console.error("verify-start-path-recovery: FAIL -- see the self-test rows above");
  process.exit(1);
}

assertEmitters(shellPath);
if (logPath) {
  assertLog(logPath, supervisorPath);
} else {
  assertStatic(supervisorPath);
}

if (failures.length === 0) {
  console.log(
    logPath
      ? `verify-start-path-recovery: PASS -- the launch recovered from a failed health gate and swapped exactly once (${logPath})`
      : `verify-start-path-recovery: PASS -- the one-time initialisation block and _swap()'s guard are keyed on the same completion field (${supervisorPath})`
  );
  process.exit(0);
}
for (const f of failures) {
  console.error(`verify-start-path-recovery: FAIL -- ${f}`);
}
process.exit(1);
