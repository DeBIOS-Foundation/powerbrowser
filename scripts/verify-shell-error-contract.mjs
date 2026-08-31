#!/usr/bin/env node
// scripts/verify-shell-error-contract.mjs
//
// shell-error-contract -- 01-11.
//
// The error state's REPAINT contract: a Retry that fails must put the error
// layer back. 01-VERIFICATION.md recorded that clause FAILED (truth 2c). The
// root cause was two owners for one fact -- the chrome bootstrap's Retry global
// blanked the error element itself while the supervisor's `_errorShown` repaint
// guard stayed set, so the FIRST failing Retry left the DOM blank and the guard
// swallowed every later repaint for the life of the session: no message, no
// Retry, no Details, forever.
//
// This shipped green through three full verification runs because no registered
// check ever observes a SECOND error sentinel. verify-platform.sh's
// shell03-budget-exhausted-error asserts there is exactly ONE, which is correct
// for the launch it drives and blind to this one.
//
// HOW THIS ASSERTS. It does not re-implement the supervisor and it does not
// text-transform either source. It EVALUATES both shipped files in-process:
//
//   * the supervisor is `await import()`ed with `globalThis.ChromeUtils` faked,
//     so its own top-level `ChromeUtils.importESModule` resolves against a fake
//     PowerBrowserAPI with no edit to the file. A distinct cache-busting query
//     per scenario gives each scenario a fresh module instance with fresh
//     per-launch fields.
//   * the chrome bootstrap is run through `node:vm` against a sandbox that is
//     also its own `window`, so its `window.powerbrowser*` assignments land
//     where the supervisor can reach them. Firing the captured
//     `DOMContentLoaded` handler IS the drive -- the handler calls
//     `TheiaService.start()` itself, so the entry point stays under test rather
//     than under simulation.
//
// The fake PowerBrowserAPI is a Proxy whose unknown-property trap THROWS naming
// the method, so a supervisor change that reaches a new boundary method goes red
// naming it instead of being silently satisfied.
//
// Before any scenario runs, the analyzer proves the two sentinel prefixes it
// reads are emitted by `dump(` call sites in the file under test, so a match
// could never come from the harness's own instrumentation. The only
// instrumentation here is a recording `dump`, and every line it records was
// written by the code under test.
//
// Scenario `two-consecutive-failing-retries-repaint`: drive a launch whose spawn
// cannot succeed, then click Retry twice. The error-family sentinel stream must
// read, IN ORDER:
//   POWERBROWSER_SHELL_ERROR, POWERBROWSER_SHELL_ERROR_CLEARED,
//   POWERBROWSER_SHELL_ERROR, POWERBROWSER_SHELL_ERROR_CLEARED,
//   POWERBROWSER_SHELL_ERROR
// -- five presence assertions, never an absence assertion. A shape assertion
// rides along: every recorded error sentinel's JSON must carry exactly the keys
// `reason` and `recoverable`, the same anchored contract
// shell03-budget-exhausted-error enforces on the first sentinel, so a repaint
// that starts leaking a key (the per-launch token above all) goes red here too.
//
// WHAT THIS DOES NOT PROVE. It proves the supervisor/bootstrap contract and the
// sentinel ordering under Node. It does not prove the pixels. The perceptual
// half -- a human clicking Retry in a real window and seeing the error layer
// come back -- stays on the WINDOWS.md human record, because chrome-context
// Marionette is platform-blocked on Linux (ledger item 7).
//
// Usage:
//   node scripts/verify-shell-error-contract.mjs [--file <path>] [--shell-file <path>]
//   node scripts/verify-shell-error-contract.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test runs a clean control against the unmutated
// tree FIRST (a self-test whose fixture is already red proves nothing about its
// plants), then plants three faults and requires each to go red naming the
// drift.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createContext, runInContext } from "node:vm";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(SELF), "..");
const DEFAULT_SUPERVISOR = join(REPO_ROOT, "powerbrowser/shell/TheiaService.sys.mjs");
const DEFAULT_SHELL = join(REPO_ROOT, "powerbrowser/shell/powerbrowser.js");

// The two sentinel prefixes this analyzer reads. They are NOT an expectation:
// assertEmitters below first proves each one is emitted by a `dump(` in the
// chrome bootstrap under test, and fails by name when it is not.
const ERROR_SENTINEL = "POWERBROWSER_SHELL_ERROR";
const CLEARED_SENTINEL = "POWERBROWSER_SHELL_ERROR_CLEARED";

const SCENARIO = "two-consecutive-failing-retries-repaint";

// The expected error-family stream: paint, clear, repaint, clear, repaint.
const EXPECTED_STREAM = [ERROR_SENTINEL, CLEARED_SENTINEL, ERROR_SENTINEL, CLEARED_SENTINEL, ERROR_SENTINEL];

// Bounds. The fake sleep resolves immediately so the drive costs milliseconds,
// which means the supervisor's background recovery probe would spin forever in
// the microtask queue and starve the event loop. After this many resolutions
// every further sleep returns a promise that never settles, which parks every
// supervisor loop for good. The wall-clock race is the second belt.
const SLEEP_BUDGET = 50;
const SCENARIO_TIMEOUT_MS = 20000;
const DRAIN_TURNS = 20;

const failures = [];
const fail = (msg) => failures.push(msg);

/**
 * Removes block comments and whole-line `//` comments so the derivation sees
 * code only. Trailing `//` comments are deliberately NOT stripped: these sources
 * contain `http://127.0.0.1` and `chrome://powerbrowser/...` inside real
 * strings, and a naive strip-to-end-of-line would mangle them into silence.
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

/** Every ALL-CAPS prefix this file hands to `dump(` as a literal or template. */
function deriveDumpSentinels(shellSrc) {
  const found = new Set();
  for (const m of shellSrc.matchAll(/dump\(\s*[`"']([A-Z][A-Z0-9_]*)/g)) {
    found.add(m[1]);
  }
  return found;
}

/**
 * The emitter proof, run before any scenario. An assertion over a log line must
 * first establish that the line belongs to the code under test; otherwise a
 * match could come from the harness itself and the assertion could never go red
 * for the right reason.
 */
function assertEmitters(shellPath) {
  const raw = readSource(shellPath, "chrome bootstrap source");
  if (raw === null) {
    return false;
  }
  const emitted = deriveDumpSentinels(stripComments(raw));
  let ok = true;
  for (const prefix of [ERROR_SENTINEL, CLEARED_SENTINEL]) {
    if (!emitted.has(prefix)) {
      ok = false;
      fail(
        `the chrome bootstrap (${shellPath}) emits no \`dump(\` line beginning \`${prefix}\` -- ` +
          `this analyzer reads that prefix, so a match could only ever come from something other than the ` +
          `code under test and every assertion below would be instrumentation asserting on itself`
      );
    }
  }
  return ok;
}

// --- the fakes -------------------------------------------------------------

/**
 * The fake boundary. A Proxy over a small stub table whose get trap returns, for
 * anything not stubbed, a function that throws naming the method. That trap is
 * what keeps this fake from drifting away from the real PowerBrowserAPI: a
 * supervisor change reaching a new boundary method goes red naming that method
 * rather than being silently satisfied by something plausible.
 */
function makeFakeApi(state) {
  const table = {
    // _resolveSidecar: a backend entry file that resolves, and no configured
    // node path so the PATH search below is what answers.
    getStringPref: (key, fallback) => (key.endsWith(".backendMain") ? `${state.scratch}/backend-main.js` : fallback ?? ""),
    // The caller's own default, except the give-up budget: 1 attempt means the
    // give-up path is reached on the first spawn rather than after six.
    getIntPref: (key, fallback) => (key.endsWith(".giveUpAttempts") ? 1 : fallback),
    pathExists: async () => true,
    pathSearch: async () => `${state.scratch}/node`,
    getEnv: () => state.scratch,
    getProfileDir: () => state.scratch,
    ensureDirectory: async () => {},
    readStateFile: async () => null,
    removeStateFile: async () => {},
    // Same shape the real boundary returns: an unregister function.
    onQuitGranted: () => () => {},
    // The supervisor's console/stdout mirror is not what this check reads.
    log: () => {},
    // Immediate, counted, and hard-parked past the budget -- see SLEEP_BUDGET.
    sleep: () => {
      state.sleeps += 1;
      return state.sleeps > SLEEP_BUDGET ? new Promise(() => {}) : Promise.resolve();
    },
    // The failure this whole scenario rests on. `_spawnAndGate` classifies a
    // throwing spawn unrecoverable (D-113) and reports it through `_showError`.
    spawnProcess: () => {
      throw new Error("harness: the platform refused to exec the backend");
    },
    // Reached by the chrome bootstrap rather than the supervisor.
    createPermanentKey: () => ({}),
    getAppIdentity: () => ({ name: "Power Browser", vendor: "Power Browser", version: "0.0.0" }),
    notifyStartupFinished: () => {},
  };
  return new Proxy(table, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      if (typeof prop === "symbol") {
        return undefined;
      }
      return () => {
        throw new Error(`unstubbed PowerBrowserAPI.${String(prop)} reached by the harness`);
      };
    },
  });
}

const drain = async (turns = DRAIN_TURNS) => {
  for (let i = 0; i < turns; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

/**
 * Loads BOTH shipped files and fires the bootstrap's own DOMContentLoaded
 * handler. Returns the recorded dump stream, the sandbox (so the Retry global
 * can be called the way the button's click handler calls it) and the supervisor
 * module instance (so per-launch state can be read back).
 */
async function loadShippedSources(supervisorPath, shellPath, tag) {
  const state = { scratch: `${tmpdir()}/powerbrowser-shell-error-contract`, sleeps: 0 };
  const api = makeFakeApi(state);

  // The supervisor's own top-level import resolves against this.
  globalThis.ChromeUtils = { importESModule: () => ({ PowerBrowserAPI: api }) };
  const mod = await import(`${pathToFileURL(supervisorPath).href}?scenario=${encodeURIComponent(tag)}`);
  if (!mod || !mod.TheiaService) {
    throw new Error(`the shipped supervisor at ${supervisorPath} exported no TheiaService`);
  }
  const TheiaService = mod.TheiaService;

  const recorded = [];
  const elements = new Map();
  const sandbox = {};
  const makeElement = () => ({
    style: {},
    textContent: "",
    setAttribute() {},
    appendChild() {},
    addEventListener() {},
    ownerDocument: { defaultView: sandbox },
  });

  let handler = null;
  sandbox.dump = (line) => {
    recorded.push(String(line).replace(/\n$/, ""));
  };
  sandbox.document = {
    addEventListener: (type, fn) => {
      if (type === "DOMContentLoaded") {
        handler = fn;
      }
    },
    getElementById: (id) => {
      if (!elements.has(id)) {
        elements.set(id, makeElement());
      }
      return elements.get(id);
    },
    createElement: () => makeElement(),
    createXULElement: () => makeElement(),
    documentElement: makeElement(),
  };
  // Resolved-value semantics, matching what the deck-state sentinel depends on:
  // the layers' hidden default comes from the stylesheet, so an unwritten inline
  // display reads as "none" rather than "".
  sandbox.getComputedStyle = (el) => ({ display: el.style.display || "none" });
  sandbox.ChromeUtils = {
    importESModule: (url) => {
      if (url.includes("PowerBrowserAPI.sys.mjs")) {
        return { PowerBrowserAPI: api };
      }
      if (url.includes("TheiaService.sys.mjs")) {
        return { TheiaService };
      }
      throw new Error(`the chrome bootstrap imported an unexpected module URL: ${url}`);
    },
  };
  sandbox.crypto = globalThis.crypto;
  sandbox.console = console;

  createContext(sandbox);
  sandbox.window = sandbox;

  const code = readFileSync(shellPath, "utf8");
  runInContext(code, sandbox, { filename: shellPath });

  if (typeof handler !== "function") {
    throw new Error(`the chrome bootstrap at ${shellPath} registered no DOMContentLoaded handler`);
  }
  return { recorded, sandbox, TheiaService, handler, state };
}

// --- the scenario ----------------------------------------------------------

/** The recorded stream, filtered to the two error-family prefixes, in order. */
function errorFamilyStream(recorded) {
  return recorded
    .filter((line) => line.startsWith(`${ERROR_SENTINEL} `) || line.startsWith(`${CLEARED_SENTINEL} `))
    .map((line) => (line.startsWith(`${CLEARED_SENTINEL} `) ? CLEARED_SENTINEL : ERROR_SENTINEL));
}

async function runScenario(supervisorPath, shellPath) {
  let loaded;
  try {
    loaded = await loadShippedSources(supervisorPath, shellPath, SCENARIO);
  } catch (err) {
    fail(
      `the shipped sources could not be evaluated (${err.message}) -- every assertion below would be ` +
        `vacuous, so this is reported rather than skipped`
    );
    return;
  }
  const { recorded, sandbox, TheiaService, handler } = loaded;

  // Firing the handler IS the drive: it calls TheiaService.start() itself, so
  // the entry point stays under test rather than under simulation.
  handler();
  await drain();

  if (!recorded.some((line) => line.startsWith(`${ERROR_SENTINEL} `))) {
    fail(
      `the drive never reached the error state at all -- no \`${ERROR_SENTINEL} \` line was emitted by the ` +
        `code under test, so the repaint assertions below would be vacuous. Recorded stream: ` +
        JSON.stringify(recorded)
    );
    return;
  }

  if (typeof sandbox.powerbrowserRetry !== "function") {
    fail(
      `the chrome bootstrap defines no Retry global on its own window, so the error layer's only affordance ` +
        `cannot be driven and this check would assert nothing`
    );
    return;
  }

  sandbox.powerbrowserRetry();
  await drain();
  const probeStillActiveAfterFirstRetry = TheiaService._recoveryProbeActive === true;
  sandbox.powerbrowserRetry();
  await drain();

  const observed = errorFamilyStream(recorded);
  const clearedSeen = observed.includes(CLEARED_SENTINEL);
  const errorCount = observed.filter((s) => s === ERROR_SENTINEL).length;

  if (observed.join(",") !== EXPECTED_STREAM.join(",")) {
    const named = [];
    if (!clearedSeen) {
      named.push(`no ${CLEARED_SENTINEL} was emitted after the first failing Retry`);
    }
    if (errorCount < 2) {
      named.push(`no second ${ERROR_SENTINEL} was emitted -- the error layer never came back`);
    }
    if (named.length === 0) {
      named.push("the stream is the wrong shape");
    }
    fail(
      `scenario ${SCENARIO}: ${named.join("; ")}. Expected ${JSON.stringify(EXPECTED_STREAM)} but observed ` +
        `${JSON.stringify(observed)}. The consequence is the whole point of this check: the user is looking ` +
        `at a screen the click handler blanked, with no message, no Retry and no Details, for the rest of ` +
        `the session. (Stale recovery probe still active after the first Retry: ` +
        `${probeStillActiveAfterFirstRetry}.)`
    );
  }

  // The repaint is held to the same anchored shape shell03-budget-exhausted-error
  // enforces on the first sentinel, so a second paint cannot start leaking a key.
  for (const line of recorded.filter((l) => l.startsWith(`${ERROR_SENTINEL} `))) {
    let payload;
    try {
      payload = JSON.parse(line.slice(ERROR_SENTINEL.length + 1));
    } catch (err) {
      fail(`an \`${ERROR_SENTINEL} \` line carried unparseable JSON (${err.message}): ${JSON.stringify(line)}`);
      continue;
    }
    const keys = Object.keys(payload).sort();
    if (keys.join(",") !== "reason,recoverable") {
      fail(
        `an \`${ERROR_SENTINEL} \` line carries the keys ${JSON.stringify(keys)} rather than exactly ` +
          `["reason","recoverable"] -- the error sentinel's shape is anchored, and a new key on this ` +
          `channel is how the per-launch token would reach a surface that renders it`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// --self-test
// ---------------------------------------------------------------------------

const SOURCE_FAULTS = [
  {
    name: "retry() re-entering the restart path without clearing the error state",
    mutate: ({ supervisorSrc, shellSrc }) => ({
      supervisorSrc: supervisorSrc.replace(
        "    this._hideError();\n    await this._restart();",
        "    await this._restart();"
      ),
      shellSrc,
    }),
    expect: `no ${CLEARED_SENTINEL} was emitted after the first failing Retry`,
  },
  {
    // The pre-fix pair, reproduced exactly: the bootstrap blanks the element
    // behind the supervisor's back AND the supervisor never clears its guard.
    name: "the Retry global blanking the error element directly instead of routing through the supervisor",
    mutate: ({ supervisorSrc, shellSrc }) => ({
      supervisorSrc: supervisorSrc.replace(
        "    this._hideError();\n    await this._restart();",
        "    await this._restart();"
      ),
      shellSrc: shellSrc.replace(
        /(\n(\s*))(\w+\.retry\(\))/,
        (_m, lead, indent, call) => `${lead}errorElement.style.display = "none";${lead}${call}`
      ),
    }),
    expect: `no ${CLEARED_SENTINEL} was emitted after the first failing Retry`,
  },
  {
    // Discriminates the repaint GUARD from the DOM write: the layer is still
    // hidden (CLEARED is emitted) but the guard is never released, so nothing
    // paints again.
    name: "_hideError() no longer clearing the repaint guard",
    mutate: ({ supervisorSrc, shellSrc }) => ({
      supervisorSrc: supervisorSrc.replace(
        "    this._errorShown = false;\n    this._failureDetails = null;",
        "    this._failureDetails = null;"
      ),
      shellSrc,
    }),
    expect: `no second ${ERROR_SENTINEL} was emitted`,
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
    console.error(`  FAIL  clean control -- cannot read a source under test: ${err.message}`);
    return false;
  }

  // The clean control FIRST: a self-test whose fixture is already red before any
  // plant proves nothing about its plants.
  let allOk = true;
  const control = runOnce(["--file", supervisorPath, "--shell-file", shellPath]);
  if (control.exitCode !== 0) {
    console.error(`  FAIL  clean control -- the unmutated tree is already red:\n${control.out.replace(/^/gm, "        ")}`);
    allOk = false;
  } else {
    console.log("  ok    clean control -- green on the unmutated tree");
  }

  const dir = mkdtempSync(join(tmpdir(), "verify-shell-error-contract-"));
  try {
    const supCopy = join(dir, "TheiaService.sys.mjs");
    const shellCopy = join(dir, "powerbrowser.js");
    for (const fault of SOURCE_FAULTS) {
      const mutated = fault.mutate({ supervisorSrc, shellSrc });
      if (mutated.supervisorSrc === supervisorSrc && mutated.shellSrc === shellSrc) {
        console.error(`  FAIL  ${fault.name} -- the fault did not apply; this self-test row proves nothing`);
        allOk = false;
        continue;
      }
      writeFileSync(supCopy, mutated.supervisorSrc);
      writeFileSync(shellCopy, mutated.shellSrc);
      if (!judge(fault.name, fault.expect, runOnce(["--file", supCopy, "--shell-file", shellCopy]))) {
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
let selfTest = false;

const needsValue = (i, flag) => {
  const value = argv[i + 1];
  if (!value) {
    console.error(`verify-shell-error-contract: FAIL -- ${flag} requires a path argument`);
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
  } else {
    console.error(`verify-shell-error-contract: FAIL -- unknown argument '${argv[i]}'`);
    process.exit(1);
  }
}

if (selfTest) {
  console.log(
    `verify-shell-error-contract --self-test: planting ${SOURCE_FAULTS.length} fault(s) plus 1 clean control`
  );
  if (runSelfTest(supervisorPath, shellPath)) {
    console.log(`verify-shell-error-contract: PASS -- all ${SOURCE_FAULTS.length + 1} self-test rows behaved as required`);
    process.exit(0);
  }
  console.error("verify-shell-error-contract: FAIL -- see the self-test rows above");
  process.exit(1);
}

if (assertEmitters(shellPath)) {
  await Promise.race([
    runScenario(supervisorPath, shellPath),
    new Promise((resolve) =>
      setTimeout(() => {
        fail(`scenario ${SCENARIO} did not settle within ${SCENARIO_TIMEOUT_MS}ms`);
        resolve();
      }, SCENARIO_TIMEOUT_MS)
    ),
  ]);
}

if (failures.length === 0) {
  console.log(
    `verify-shell-error-contract: PASS -- scenario ${SCENARIO}: a failing Retry repaints the error layer, ` +
      `twice over, driven against the shipped supervisor (${supervisorPath}) and the shipped chrome ` +
      `bootstrap (${shellPath})`
  );
  process.exit(0);
}
for (const f of failures) {
  console.error(`verify-shell-error-contract: FAIL -- ${f}`);
}
process.exit(1);
