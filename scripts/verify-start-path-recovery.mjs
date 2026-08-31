#!/usr/bin/env node
// scripts/verify-start-path-recovery.mjs
//
// health-gate-recovery-swaps (01-09 Task 1).
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
// Usage:
//   node scripts/verify-start-path-recovery.mjs --log <path> [--file <path>] [--shell-file <path>]
//   node scripts/verify-start-path-recovery.mjs [--file <path>] [--shell-file <path>]
//
// Exit 0 pass, 1 fail.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const argv = process.argv.slice(2);
let supervisorPath = DEFAULT_SUPERVISOR;
let shellPath = DEFAULT_SHELL;
let logPath = null;

const needsValue = (i, flag) => {
  const value = argv[i + 1];
  if (!value) {
    console.error(`verify-start-path-recovery: FAIL -- ${flag} requires a path argument`);
    process.exit(1);
  }
  return value;
};

for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--file") {
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

assertEmitters(shellPath);
if (logPath) {
  assertLog(logPath, supervisorPath);
}

if (failures.length === 0) {
  console.log(
    logPath
      ? `verify-start-path-recovery: PASS -- the launch recovered from a failed health gate and swapped exactly once (${logPath})`
      : `verify-start-path-recovery: PASS -- the swap and deck-state sentinels are emitted by ${shellPath}`
  );
  process.exit(0);
}
for (const f of failures) {
  console.error(`verify-start-path-recovery: FAIL -- ${f}`);
}
process.exit(1);
