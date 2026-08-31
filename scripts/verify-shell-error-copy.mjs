#!/usr/bin/env node
// scripts/verify-shell-error-copy.mjs
//
// shell-error-copy-no-internals (01-07).
//
// Asserts that no internal identifier can reach #powerbrowser-error-message --
// the full-screen text a user is looking at when the pointer-driven happy path
// has already failed. Before 01-07 that element was painted with strings like
// `powerbrowser.sidecar.backendMain (/x/y) does not exist` and `Backend did not
// announce POWERBROWSER_BACKEND_READY within 90000ms.`; a pure rename would
// have prefixed the leak with a new product name and shipped it.
//
// HOW IT ASSERTS, and why it is not a banned-literal list. It DERIVES, from
// TheiaService.sys.mjs at check time:
//
//   1. the USER_MESSAGE table's declared keys and their string values;
//   2. every `USER_MESSAGE.<key>` reference in the file;
//   3. every `message:` property value in the file;
//   4. every `this._showError(...)` call's first argument.
//
// and then compares those derived sets. A hand-kept list of forbidden strings
// can only ever agree with the tree it was written from; these comparisons go
// red on an ADDED leak, an ad-hoc literal that bypasses the table, a STALE
// declared-but-unreferenced entry, and a REMOVED entry that is still
// referenced. The leak test itself is a SHAPE test -- an all-caps underscored
// token of four or more characters, or a dotted key of three or more segments
// -- so a failure path added next year is covered without touching this file.
//
// Static on purpose: it reads the source, needs no build, no browser and no
// display, and therefore belongs in --quick where a leak costs seconds rather
// than a forty-minute rebuild. Its runtime counterpart is verify-platform.sh's
// shell-diagnostics-rows-populated, which drives two real failure paths and
// asserts the painted message is one of the values derived here.
//
// Usage:
//   node scripts/verify-shell-error-copy.mjs [--file <path>]
//   node scripts/verify-shell-error-copy.mjs --self-test
//
// Exit 0 pass, 1 fail. --self-test plants six faults in a temporary copy and
// requires each to go red naming the drift; a check that can only go green is
// not a check.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(SELF), "..");
const DEFAULT_TARGET = join(REPO_ROOT, "powerbrowser/shell/TheiaService.sys.mjs");

// An ALL-CAPS underscored token (POWERBROWSER_BACKEND_READY, THEIA_CONFIG_DIR),
// four characters or more so a bare "A_B" in prose is not a false positive.
const ALL_CAPS_TOKEN = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
// A dotted key of three or more segments (powerbrowser.sidecar.backendMain).
// Three, not two, so "Node.js" and a sentence-ending "...js." stay legal.
const DOTTED_KEY = /\b[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*){2,}\b/g;

const failures = [];
const fail = (msg) => failures.push(msg);

/**
 * Removes block comments and whole-line `//` comments so the derivations below
 * see code only. Trailing `//` comments are deliberately NOT stripped: this
 * file contains `http://127.0.0.1` and `https://open-vsx.org` inside real
 * strings, and a naive strip-to-end-of-line would mangle them into silence.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

function parseUserMessageTable(src) {
  const block = src.match(/const USER_MESSAGE = \{\n([\s\S]*?)\n\};/);
  if (!block) {
    return null;
  }
  const entries = new Map();
  const entryRe = /^\s*([A-Za-z_$][\w$]*):\s*("(?:[^"\\]|\\.)*")\s*,\s*$/gm;
  let m;
  while ((m = entryRe.exec(block[1])) !== null) {
    entries.set(m[1], JSON.parse(m[2]));
  }
  return { entries, raw: block[0] };
}

function check(targetPath) {
  let raw;
  try {
    raw = readFileSync(targetPath, "utf8");
  } catch (err) {
    fail(`cannot read ${targetPath}: ${err.message}`);
    return;
  }
  const src = stripComments(raw);

  const table = parseUserMessageTable(src);
  if (!table) {
    fail(
      "no `const USER_MESSAGE = { ... };` table found -- the user-facing error " +
        "copy has no single derivable source, so nothing here can be checked"
    );
    return;
  }
  if (table.entries.size === 0) {
    fail("the USER_MESSAGE table is empty -- a table with no strings asserts nothing");
    return;
  }

  // --- (1) every declared message is clean -------------------------------
  for (const [key, value] of table.entries) {
    if (!value.includes("Power Browser")) {
      fail(`USER_MESSAGE.${key} does not name the product ("Power Browser"): ${JSON.stringify(value)}`);
    }
    for (const hit of value.match(ALL_CAPS_TOKEN) ?? []) {
      if (hit.length >= 4) {
        fail(
          `USER_MESSAGE.${key} leaks the internal identifier "${hit}" (all-caps underscored token) ` +
            `into user-facing error text -- it belongs in a diagnostics field row`
        );
      }
    }
    for (const hit of value.match(DOTTED_KEY) ?? []) {
      fail(
        `USER_MESSAGE.${key} leaks the internal identifier "${hit}" (dotted multi-segment key) ` +
          `into user-facing error text -- it belongs in a diagnostics field row`
      );
    }
    if (value.includes("${")) {
      fail(
        `USER_MESSAGE.${key} interpolates a runtime value -- a user-facing sentence must be a ` +
          `fixed literal; the varying part is a diagnostics field row`
      );
    }
  }

  // --- (2) every `message:` site resolves back to the table ---------------
  const referenced = new Set();
  const outsideTable = src.replace(table.raw, "");
  for (const m of outsideTable.matchAll(/USER_MESSAGE\.([A-Za-z_$][\w$]*)/g)) {
    referenced.add(m[1]);
  }

  for (const m of src.matchAll(/(?:^|[^\w.$])message:\s*([^,\n]+)/g)) {
    const expr = m[1].trim();
    if (expr === "null") {
      continue;
    }
    if (!/^USER_MESSAGE\.[A-Za-z_$][\w$]*$/.test(expr)) {
      fail(
        `a \`message:\` site is set to \`${expr}\`, which is not a USER_MESSAGE entry -- ` +
          `an ad-hoc string bypasses the copywriting contract and its checks entirely`
      );
      continue;
    }
    const key = expr.slice("USER_MESSAGE.".length);
    if (!table.entries.has(key)) {
      fail(`a \`message:\` site references USER_MESSAGE.${key}, which the table does not declare`);
    }
  }

  // --- (3) declared and referenced key sets must be equal -----------------
  for (const key of table.entries.keys()) {
    if (!referenced.has(key)) {
      fail(
        `USER_MESSAGE.${key} is declared but never referenced -- a stale entry drifts out of ` +
          `sync with the copy that actually paints`
      );
    }
  }
  for (const key of referenced) {
    if (!table.entries.has(key)) {
      fail(`USER_MESSAGE.${key} is referenced but not declared -- it resolves to undefined at runtime`);
    }
  }

  // --- (4) every _showError() call takes a table-derived message ----------
  let callSites = 0;
  for (const m of src.matchAll(/this\._showError\(\s*([^,]+?)\s*,/g)) {
    callSites += 1;
    const arg = m[1].trim();
    if (!/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\.message)$/.test(arg)) {
      fail(
        `this._showError() is called with \`${arg}\` as its message -- only a USER_MESSAGE entry ` +
          `or a result object's \`.message\` (which the checks above prove is one) may paint the error layer`
      );
    }
  }
  if (callSites === 0) {
    fail(
      "no `this._showError(` call site found -- either the error layer is unreachable or this " +
        "check has stopped matching the code, and either way it is asserting nothing"
    );
  }
}

// ---------------------------------------------------------------------------
// --self-test: plant faults, require each to go red naming the drift.
// ---------------------------------------------------------------------------

const FAULTS = [
  {
    name: "all-caps sentinel leaked into a message",
    apply: (s) =>
      s.replace(
        "Power Browser's interface didn't finish starting.",
        "Power Browser did not see POWERBROWSER_BACKEND_READY."
      ),
    expect: "POWERBROWSER_BACKEND_READY",
  },
  {
    name: "pref key leaked into a message",
    apply: (s) =>
      s.replace(
        "Power Browser needs Node.js and couldn't find it.",
        "Power Browser could not read powerbrowser.sidecar.nodePath."
      ),
    expect: "powerbrowser.sidecar.nodePath",
  },
  {
    name: "ad-hoc string literal bypasses the table",
    apply: (s) => s.replace("message: USER_MESSAGE.couldNotStart,", 'message: "Backend spawn failed.",'),
    expect: "Backend spawn failed",
  },
  {
    name: "stale declared-but-unreferenced entry",
    apply: (s) =>
      s.replace(
        "const USER_MESSAGE = {\n",
        'const USER_MESSAGE = {\n  neverUsed: "Power Browser has an unused message.",\n'
      ),
    expect: "USER_MESSAGE.neverUsed is declared but never referenced",
  },
  {
    name: "referenced entry removed from the table",
    apply: (s) => s.replace(/^ {2}nodeMissing: .*\n/m, ""),
    expect: "USER_MESSAGE.nodeMissing is referenced but not declared",
  },
  {
    name: "_showError() called with raw interpolated text",
    apply: (s) =>
      s.replace(
        "this._showError(resolved.message, /* recoverable */ false, resolved.details);",
        "this._showError(`raw ${resolved.detail}`, false, resolved.details);"
      ),
    expect: "this._showError() is called with",
  },
];

function runSelfTest(targetPath) {
  const original = readFileSync(targetPath, "utf8");
  const dir = mkdtempSync(join(tmpdir(), "verify-shell-error-copy-"));
  let allOk = true;
  try {
    for (const fault of FAULTS) {
      const mutated = fault.apply(original);
      if (mutated === original) {
        console.error(`  FAIL  ${fault.name} -- the fault did not apply; this self-test row proves nothing`);
        allOk = false;
        continue;
      }
      const path = join(dir, "TheiaService.sys.mjs");
      writeFileSync(path, mutated);

      let out = "";
      let exitCode = 0;
      try {
        out = execFileSync(process.execPath, [SELF, "--file", path], { encoding: "utf8", stdio: "pipe" });
      } catch (err) {
        exitCode = err.status ?? 1;
        out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
      }

      if (exitCode === 0) {
        console.error(`  FAIL  ${fault.name} -- planted fault did NOT go red`);
        allOk = false;
      } else if (!out.includes(fault.expect)) {
        console.error(
          `  FAIL  ${fault.name} -- went red but did not name the drift ` +
            `(expected output to mention ${JSON.stringify(fault.expect)})`
        );
        allOk = false;
      } else {
        console.log(`  ok    ${fault.name} -- red, naming the drift`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return allOk;
}

// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let target = DEFAULT_TARGET;
let selfTest = false;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--self-test") {
    selfTest = true;
  } else if (argv[i] === "--file") {
    target = argv[i + 1];
    i += 1;
    if (!target) {
      console.error("verify-shell-error-copy: FAIL -- --file requires a path argument");
      process.exit(1);
    }
  } else {
    console.error(`verify-shell-error-copy: FAIL -- unknown argument '${argv[i]}'`);
    process.exit(1);
  }
}

if (selfTest) {
  console.log(`verify-shell-error-copy --self-test: planting ${FAULTS.length} fault(s)`);
  if (runSelfTest(target)) {
    console.log(`verify-shell-error-copy: PASS -- all ${FAULTS.length} planted faults went red naming the drift`);
    process.exit(0);
  }
  console.error("verify-shell-error-copy: FAIL -- see the self-test rows above");
  process.exit(1);
}

check(target);
if (failures.length === 0) {
  console.log(`verify-shell-error-copy: PASS -- no internal identifier can reach the error layer (${target})`);
  process.exit(0);
}
for (const f of failures) {
  console.error(`verify-shell-error-copy: FAIL -- ${f}`);
}
process.exit(1);
