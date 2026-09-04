# Testing Patterns

**Analysis Date:** 2026-09-04

## Test Framework

**Runner:**
- No unit-test runner exists. There is no jest, vitest, mocha, or `*.test.ts`/`*.spec.ts` in the tree, and no `test` script in `theia/package.json` or any extension `package.json`. The test framework is `scripts/verify-platform.sh` — one driver, one `CHECKS` registry, one summary table — plus the `scripts/verify-*.mjs` / `scripts/check-*.sh` / `scripts/smoke-*.sh` checks it invokes.
- Config: the registry itself, `run_own_checks()` in `scripts/verify-platform.sh` (~line 3489). Adding a check means appending one `"label|command"` row to the `CHECKS` array. It does NOT mean creating a sibling driver — that rule is stated in the file header and is the reason the four `verify-phase-0*.sh` drivers were consolidated.

**Assertion Library:**
- None. Assertions are hand-rolled per check: `grep -qE` against sentinel patterns in bash, string/RegExp derivations and set-equality comparisons in Node, `pgrep`/`/proc` polling for lifecycle checks. Failure output always follows `"<check>: FAIL -- <reason>"` on stderr with exit 1; passes print `"<check>: PASS -- <what was proven>"` with exit 0.

**Run Commands:**
```bash
scripts/verify-platform.sh --quick          # no build, no browser, no display, no network — the commit gate (seconds)
scripts/verify-platform.sh --only <label>   # exactly one registry row, e.g. --only shell-error-copy-no-internals
scripts/verify-platform.sh                  # everything (tier 3: builds + headless launches, tens of minutes)
scripts/verify-platform.sh --gate           # everything, plus the WINDOWS.md known-open exclusions
node scripts/<check>.mjs --self-test        # fault-planting proof for one Node check
bash scripts/<guard>.sh --self-test         # fault-planting proof for one bash guard
```

## Test File Organization

**Location:**
- Checks live in `scripts/`, beside the code they guard — not co-located with sources and not in a separate `test/` tree. Shared drivers live in `scripts/lib/` (notably `scripts/lib/firefox-bidi.mjs`, the WebDriver-BiDi page driver every live-frontend check imports via `withFirefoxPage`).
- The supervisor/contract checks evaluate the shipped sources in-process rather than importing test doubles of them: `scripts/verify-shell-error-contract.mjs` `await import()`s `powerbrowser/shell/TheiaService.sys.mjs` with a faked `globalThis.ChromeUtils` and runs `powerbrowser/shell/powerbrowser.js` through `node:vm`.

**Naming:**
- `verify-<behavior>.mjs` — behavioral checks with `--self-test` (e.g. `scripts/verify-registry-shape.mjs`, `scripts/verify-shell-error-copy.mjs`, `scripts/verify-generated-identity.mjs`)
- `check-<boundary>.sh` — executable guards over a directory/patch surface (`scripts/check-internals-boundary.sh`, `scripts/check-patch-surface.sh`)
- `smoke-<target>.sh` — build/boot proofs (`scripts/smoke-theia.sh`, `scripts/smoke-firefox.sh`)
- Registry labels are kebab-case and stable: `shell-error-copy-no-internals`, `gui04-registry-shape`, `side04-sigkill-no-orphan`, `generated-byte-identity`

**Structure:**
```
scripts/
├── verify-platform.sh          # THE driver: helpers + CHECKS registry + runner + summary
├── verify-<behavior>.mjs       # one behavior per file: check() + FAULTS[] + --self-test
├── check-<boundary>.sh         # scan function + --self-test fixture planting
├── smoke-<target>.sh           # install/build/boot with real-spawn proofs
└── lib/
    ├── firefox-bidi.mjs        # shared withFirefoxPage driver (BiDi over the live app)
    ├── toml.cjs                # vendored parser (digest-pinned, see verify-vendored-parser.mjs)
    └── config-schema.json      # configuration.toml schema for scripts/generate.mjs
```

## Test Structure

**Suite Organization:**
```bash
# `scripts/verify-platform.sh` — every row is "label|command"; helpers above, registry below
local -a CHECKS=(
  "scan-brand-residue|node $REPO_ROOT/scripts/scan-brand-residue.mjs"
  "scan-brand-residue-self-test|node $REPO_ROOT/scripts/scan-brand-residue.mjs --self-test"
  "shell-error-copy-no-internals|node $REPO_ROOT/scripts/verify-shell-error-copy.mjs"
  "side04-sigkill-no-orphan|check_side04_sigkill_no_orphan"
  ...
)
# Runner: each entry runs under `setsid` in its own process group so
# `kill -- "-$PID"` on interrupt reaches the whole group (browsers two layers deep).
```

**Patterns:**
- **Setup pattern:** `mktemp -d` throwaway dirs tracked in `TEMP_PATHS` (`track_temp`) with a merged `cleanup()` on `EXIT`/`INT`/`TERM`; throwaway browser profiles per launch; `XDG_CONFIG_HOME` pointed at a harness-scoped temp dir so runs never litter `~/.config/powerbrowser` — see the top of `scripts/verify-platform.sh`.
- **Teardown pattern:** `stop_shell` / `stop_shell_display` / `stop_virtual_display` kill the whole process group (`kill -- "-$PID"`), then `wait`, then `rm -rf` over `TEMP_PATHS`. The `trap cleanup EXIT` plus `trap 'cleanup; exit 130' INT TERM` pair exists because a bare EXIT trap resumes the script after SIGINT instead of exiting.
- **Assertion pattern:** poll-until-sentinel with a bounded deadline, then fail naming the log. Never assert on the absence of a log line unless the emitter is proven to be the code under test:
```bash
# `scripts/verify-platform.sh` — check_shell03_budget_exhausted_error
deadline=$((SECONDS + 30))
while [ "$SECONDS" -lt "$deadline" ]; do
  sentinel_present 'POWERBROWSER_SHELL_ERROR ' "$BROWSER_LOG" && break
  ...
done
# Positive controls ride along so a check cannot pass vacuously:
# an unrecoverable failure must show NO spawn-attempt line AND exactly one error sentinel
# with exactly the {reason, recoverable} JSON shape.
```

## Mocking

**Framework:** None. Fakes are hand-rolled per check, in three shapes:

```javascript
// 1. Proxy-throws fake boundary — a supervisor change reaching a new
//    PowerBrowserAPI method goes red NAMING it instead of passing silently.
//    `scripts/verify-shell-error-contract.mjs`
// "The fake PowerBrowserAPI is a Proxy whose unknown-property trap THROWS
//  naming the method, so a supervisor change that reaches a new boundary
//  method goes red naming it instead of being silently satisfied."
```

```javascript
// 2. node:vm sandbox that IS its own window — the chrome bootstrap's
//    `window.powerbrowser*` assignments land where the supervisor reaches them,
//    and firing the captured DOMContentLoaded handler IS the drive.
//    `scripts/verify-shell-error-contract.mjs`
```

```bash
# 3. Wrapper-backend fixtures that count their own invocations in a marker
#    file — the analyzer asserts the count OUTSIDE the code under test, so a
#    wrong analyzer cannot excuse a fixture that never fired.
#    `scripts/verify-platform.sh` — check_health_gate_recovery_swaps
echo 0 > "$marker"
cat > "$wrap_dir/main.js" <<EOF
const n = parseInt(fs.readFileSync('$marker', 'utf8'), 10) + 1;
fs.writeFileSync('$marker', String(n));
// Invocation 1: bind, announce readiness, answer 503 (health-gate timeout,
// not a crash). Invocation 2+: answer 200.
EOF
```

**What to Mock:**
- The platform boundary (`ChromeUtils`, `Services`, `Subprocess`, `dump`) when driving supervisor logic in-process — `scripts/verify-shell-error-contract.mjs`.
- The backend entry file (`powerbrowser.sidecar.backendMain` pointed at a wrapper/crasher via a `user.js` profile override) when driving launch/recovery behavior — `check_shell03_budget_exhausted_error`, `check_health_gate_recovery_swaps` in `scripts/verify-platform.sh`.
- The config/profile filesystem (`mkdtemp` config homes, planted `sidecar-state-<profile>.json` files in the exact JSON shape `TheiaService` writes) for leftover-reap controls — `plant_leftover`/`unplant_leftover` in `scripts/verify-platform.sh`.

**What NOT to Mock:**
- The tree under test. Checks derive expectations FROM the sources at check time (the `USER_MESSAGE` table, the registry's exported members, the catalogue occurrence lines) and compare as set equality — a mock of the source would be a second expectation list that can only agree with itself.
- Your own instrumentation. Never assert on the absence of a log line unless you have proven that line is emitted by the code under test rather than by your own harness (`scripts/verify-shell-error-contract.mjs` proves its sentinel prefixes come from `dump(` call sites before any scenario runs).

## Fixtures and Factories

**Test Data:**
```bash
# Planted violation fixture in a mktemp dir — never a real repo file.
# `scripts/check-internals-boundary.sh` --self-test
cat > "$tmp/planted-violation.sys.mjs" <<'EOF'
export function badFunction() {
  return Services.prefs.getBoolPref("some.pref", false);
}
EOF
# ...then assert the scan rejects it AND names the planted path.
```

```javascript
// Planted-fault table: each row mutates a copy and names the drift it must produce.
// `scripts/verify-shell-error-copy.mjs`
const FAULTS = [
  { name: "all-caps sentinel leaked into a message",
    apply: (s) => s.replace("Power Browser's interface didn't finish starting.",
                            "Power Browser did not see POWERBROWSER_BACKEND_READY."),
    expect: "POWERBROWSER_BACKEND_READY" },
  { name: "stale declared-but-unreferenced entry",
    apply: (s) => s.replace("const USER_MESSAGE = {\n",
                            'const USER_MESSAGE = {\n  neverUsed: "Power Browser has an unused message.",\n'),
    expect: "USER_MESSAGE.neverUsed is declared but never referenced" },
  // ...15 rows total: each must go red NAMING the drift, or the self-test fails.
];
```

**Location:**
- Fixtures are built inline in the check (heredocs, `node -e` writers, `FAULTS[].apply` mutations) under `mktemp -d` / `mkdtempSync(join(tmpdir(), ...))` and removed in `cleanup()` / `finally { rmSync }`. There is no shared fixtures directory — each check owns its plants so a fixture change cannot silently weaken a sibling check.

## Coverage

**Requirements:** No line/branch coverage tool and no percentage target. Coverage is defined as registry reconciliation: every behavior has a row, and every row proves it discriminates via `--self-test`. The known gaps that cannot run on Linux (chrome-context Marionette clicks, pixel assertions) are recorded as named items in `docs/WINDOWS.md` and routed to the human record — a check that cannot run FAILs or is re-tiered, never skipped-and-green.

**View Coverage:**
```bash
scripts/verify-platform.sh --quick              # the commit gate: static checks only
scripts/verify-platform.sh --only <label>       # per-task sampling of one row
node scripts/verify-shell-error-copy.mjs --self-test   # prove one check discriminates
```

## Test Types

**Unit Tests:**
- Not used as a category. The smallest checks are static source-derivation assertions (export sets, `USER_MESSAGE` table shape, `_showError` call-site enumeration, vendored-parser digest) that read files and compare derived sets — see `scripts/verify-registry-shape.mjs`, `scripts/verify-shell-error-copy.mjs`, `scripts/verify-vendored-parser.mjs`. They run in milliseconds under `--quick`.

**Integration Tests:**
- In-process contract checks: supervisor + chrome bootstrap evaluated together with faked platform, asserting sentinel ordering across failing-Retry repaints, probe gating in both directions, and refusal of unrecoverable Retry — `scripts/verify-shell-error-contract.mjs` (four scenarios, still `--quick` because no build/browser is needed).
- Live-frontend checks over BiDi: branding, customize-inert, dev-flag-off, URI roundtrip, GUI-01 command registration — `scripts/verify-branding.mjs`, `scripts/verify-customize-inert.mjs`, `scripts/verify-dev-flag-off.mjs`, `scripts/verify-uri-roundtrip.mjs`, `scripts/verify-gui01-command.mjs`, all needing the lazily-started Theia dev app (`theia_app_up` in `scripts/verify-platform.sh`).
- Headless-binary lifecycle checks: SIGKILL-no-orphan, leftover-reaped, stale-identity-not-signalled, budget-exhausted-error, auto-dismiss-on-selfheal, health-gate-recovery-swaps, diagnostics-rows-populated — the `check_side04_*` / `check_shell03_*` functions in `scripts/verify-platform.sh`.

**E2E Tests:**
- `scripts/smoke-theia.sh` (yarn install frozen-lockfile, drivelist rebuild, app build, node-pty real-spawn proof, backend boot) and `scripts/smoke-firefox.sh` (incremental `./mach build` no-op, no-`mach bootstrap` assertion, `--version` reports pinned ESR). Human-driven perceptual halves (real Retry click, pixel states) stay on the `docs/WINDOWS.md` record because chrome-context Marionette is platform-blocked on Linux.

## Common Patterns

**Async Testing:**
```bash
# Bounded poll for a sentinel; tolerate the console-mirror duplicate line;
# assert liveness BEFORE the kill so "no orphan" cannot pass vacuously.
# `scripts/verify-platform.sh` — check_side04_sigkill_no_orphan
backend_pid="$(backend_ready_pids "$BROWSER_LOG" | head -1)"
[ -e "/proc/$backend_pid" ] || FAIL  # must be alive before the kill
kill -9 "$BROWSER_SPAWN_PID"          # browser process ALONE, never the group
wait_pid_gone_or_zombie "$backend_pid" || FAIL  # 15s poll, Z (zombie) counts as gone
orphans="$(backends_in_groups "$backend_pgid")"  # run-scoped PGID, not machine-wide pgrep
[ -n "$orphans" ] && FAIL
```

**Error Testing:**
```javascript
// --self-test runner shape shared by every Node check:
// 1. prove the clean tree is green first (else plants are meaningless);
// 2. assert each plant actually mutated the source (else the row is vacuous);
// 3. require red output NAMING the drift (not just non-zero exit).
// `scripts/verify-registry-shape.mjs`
const baseline = checkShape(clean);
if (baseline.length !== 0) { /* FAIL: unmodified tree already red */ }
for (const testCase of cases) {
  const mutated = /* any source differs from clean */;
  if (!mutated) { /* FAIL: anchor drifted, plant landed nowhere */ }
  const failures = checkShape(testCase.sources);
  if (!failures.some(f => f.includes(testCase.expect))) { /* FAIL */ }
}
```

**Derive-from-tree-and-compare (the master pattern — use for every new check):**
```javascript
// Actual surface DERIVED from the module source at check time; only the
// EXPECTED set is written down. Discriminates in BOTH directions:
// an addition is a surplus, a removal is a shortfall, both named.
// `scripts/verify-registry-shape.mjs`
const actual = exportedNamesOf(sources[file]);
if (actual.length === 0) { /* FAIL: parse found nothing — proves nothing */ }
const { surplus, missing } = diff(actual, expected);
```
- A hand-kept expectation list "can only ever agree with the tree it was copied from" — it goes stale silently and can never go red on an addition. New checks must derive the actual set from the tree and compare as set equality, with a non-vacuity guard and a `--self-test` planting one fault per direction (addition + removal minimum).

**Checklist for adding a check (from `CLAUDE.md` and the registry comments):**
1. Append one `"label|command"` row to `CHECKS` in `run_own_checks()` in `scripts/verify-platform.sh` — never a sibling driver.
2. Place it honestly: `--quick` array only if it needs no build, no browser, no display, no network, and no `upstream/` clone (re-tiering precedent: `desktop-entry-quick`, `apply-patches-self-test`, `about-dialog-suppression`).
3. Derive, don't list: actual set computed from the tree at check time, set-equality comparison, non-vacuity guard.
4. Ship `--self-test` in the same commit: one planted fault per failure mode, each required to go red naming the drift, plus mutation-landed and clean-tree-green guards. Register the self-test as its own adjacent registry row.
5. Presence assertions, never absence — unless the emitter is proven to be the code under test.

---

*Testing analysis: 2026-09-04*
