# Testing Patterns

**Analysis Date:** 2026-09-04

## Test Framework

**Runner:**
- No unit-test runner is configured. Verified absent: no `jest.config.*`, `vitest.config.*`, or mocha config; no `*.test.*` / `*.spec.*` files; no `test` script in `theia/package.json` (scripts are `build:extensions`, `build`, `start` only).
- The test system is `scripts/verify-platform.sh` — one driver, one `CHECKS` registry, one summary table — plus per-check `--self-test` entry points and two smoke scripts. `verify-phase-0{2,3,4,5}.sh` were deleted in the commit that created it and must not come back.

**Assertion Library:**
- Bash: POSIX `[ ]`, `grep -qE`, and purpose-built helpers (`sentinel_present`, `backend_ready_pids` in `scripts/verify-platform.sh`).
- Node: `node:assert`-free hand-rolled `failures.push(...)` arrays compared as set equality, plus `process.exit(1)` on any failure (see `scripts/verify-shell-error-copy.mjs`, `scripts/verify-registry-shape.mjs`, `scripts/verify-generated-identity.mjs`).

**Run Commands:**
```bash
scripts/verify-platform.sh --quick          # no build, no browser, no display — the commit gate (seconds)
scripts/verify-platform.sh --only <label>   # exactly one named check and nothing else
scripts/verify-platform.sh                  # everything (needs built tree; tier-3 class checks launch a browser)
scripts/verify-platform.sh --gate           # everything, plus the WINDOWS.md known-open exclusions
node scripts/<check>.mjs --self-test        # prove one Node check discriminates
bash scripts/<guard>.sh --self-test         # prove one bash guard discriminates
```

## Test File Organization

**Location:**
- Static/hermetic checks live beside the driver: `scripts/verify-*.mjs` (one file per behavior) and `scripts/check-*.sh` (boundary/surface guards).
- Launch-class checks live as `check_*` shell functions INSIDE `scripts/verify-platform.sh` (shared `start_shell`/`stop_shell` scaffolding cannot be sourced into a second driver — one-driver rule).
- Build gates: `scripts/smoke-theia.sh` (yarn install + native rebuild + app build), `scripts/smoke-firefox.sh` (no-bootstrap + pinned ESR version), `scripts/verify-endpoints.sh` (endpoint surface, with `--interrupt-self-test`).
- Shared helpers: `scripts/lib/firefox-bidi.mjs` (BiDi reads of the live frontend), `scripts/lib/config-schema.json` + `scripts/lib/toml.cjs` (vendored parser, provenance-checked by `scripts/verify-vendored-parser.mjs`).
- Human verification record: `.planning/WINDOWS.md` ledger plus phase `01-UAT.md`-style UAT reports (e.g. GUI-01/GUI-03 live runs referenced by ledger items 15–16).

**Naming:**
- Check files: `verify-<subject>.mjs`. Guard files: `check-<subject>.sh`. Registry labels: kebab-case matching the behavior (`shell-error-copy-no-internals`, `gui04-registry-shape`, `generated-byte-identity`, `start-path-recovery`, `shell-error-contract`, `about-dialog-suppression`, `side04-sigkill-no-orphan`, `health-gate-recovery-swaps`).
- Every check row SHOULD have a paired `<label>-self-test` row in the same `CHECKS` array.

**Structure:**
```
scripts/
├── verify-platform.sh          # THE driver: helpers + check_* functions + CHECKS registry + runner
├── verify-<subject>.mjs        # static/hermetic check (scan fn + selfTest + arg dispatch)
├── check-<subject>.sh          # bash guard (scan fn + --self-test fixture + default-path scan)
├── smoke-theia.sh / smoke-firefox.sh / verify-endpoints.sh
└── lib/                        # firefox-bidi.mjs, config-schema.json, toml.cjs (vendored)
```

## Test Structure

**Suite Organization:**
- The suite IS the `CHECKS` array in `scripts/verify-platform.sh:3489` (quick set) plus the `CHECKS+=(...)` full-set block. Each entry is `label|command`: external `bash <script>` / `node <script>` invocations run under `setsid` in their own process group; bare names must be argument-free shell functions (anything needing arguments gets a wrapper like `check_verify_branding`, never an inline command string).
- Tiering rule: `--quick` rows must need no build, no browser, no display, no network. Rows that need a built tree or the 1.1 GB `upstream/` clone live in the full set (the RE-TIERED comment block in `scripts/verify-platform.sh` records why `desktop-entry-quick` and `apply-patches-self-test` moved).
- An empty check set is a loud FAIL, not a pass (`scripts/verify-platform.sh:3890-3896`). `--gate` cannot combine with `--quick`/`--only` (named, loud error).

**Patterns:**
- Setup pattern: `REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` at the top of every script; throwaway dirs via `mktemp -d` registered with `track_temp` and removed by a `trap cleanup EXIT` + `trap 'cleanup; exit 130' INT TERM` pair (`scripts/verify-platform.sh:90-164`). The trap handler exits itself — a bare EXIT-trap cleanup that returns lets bash continue the script after SIGINT.
- Lazy shared fixtures: the Theia dev app boots once via `theia_app_up()` on first need (60 s poll, stale-occupant wait), never unconditionally, so `--quick` never pays for it.
- Teardown pattern: `stop_shell` / `stop_shell_display` / `stop_virtual_display` kill the whole `setsid` process group (`kill -- "-$PID"`), then `wait`, then clear the PID var. Two concurrent instances are tracked with explicit locals (`pid_a`/`pid_b`), never the shared global.
- Assertion pattern: named FAIL to stderr (`<label>: FAIL -- <SCOPE> -- <detail>`), `cat "$BROWSER_LOG"` on failure paths, `result=1` accumulation with all branches still executed.
- Hermeticity pattern: one run-scoped throwaway `XDG_CONFIG_HOME` exported for every launch (`scripts/verify-platform.sh:97-115`); `VERIFY05_USER_JS_PROFILE` injects pref overrides per launch; `VERIFY05_XDG_CONFIG_HOME` redirects the config dir per check. Never touch the real `$HOME/.config/powerbrowser` or any repo file from a check.

## Mocking

**Framework:** None. There are no mocks, stubs libraries, or fakes directories. Isolation is achieved with real processes, real files in `mktemp -d`, and inline `node -e` harnesses.

**Patterns:**
```bash
# Planted leftover process + forged state file (SIDE-04 reaping checks)
setsid sleep 300 &
PLANTED_PID=$!
node -e '...fs.writeFileSync(path, JSON.stringify({pid, port, startTicks, writtenAt}))...' \
  "$PLANTED_STATE_FILE" "$PLANTED_PID" "$ticks"
export VERIFY05_XDG_CONFIG_HOME="$parent"
start_shell "$PLANTED_PROFILE_DIR"
```
```bash
# Always-crashing backend + lowered attempt budget (SHELL-03 budget checks)
echo 'process.exit(1);' > "$crasher_dir/main.js"
printf 'user_pref("powerbrowser.sidecar.backendMain", "%s/main.js");\nuser_pref("powerbrowser.sidecar.giveUpAttempts", 2);' \
  "$crasher_dir" > "$user_js"
```
```javascript
// Shipped module under test with its one chrome dep stubbed (shell04-log-redacts-token)
globalThis.ChromeUtils = { importESModule: () => ({ PowerBrowserAPI: { getIntPref: (_k, d) => d } }) };
const { TheiaService } = await import(process.env.SHIPPED_THEIA_SERVICE);
TheiaService._pushLog.call({ _token: "TOK-11111111", _log: [] }, "Cookie: powerbrowser-token=TOK-11111111");
```
```javascript
// Chrome bootstrap evaluated in a node:vm sandbox that is also its own window
// (shell-error-contract drives the supervisor + bootstrap without a browser)
```

Additional planted fixtures: invocation-counting wrapper backends (healthy-on-Nth-try via a marker file), a 503-then-200 health-gate stub, a poisoned config home (regular file where the settings folder must be), and known-bad markup fixtures for scanner self-tests (e.g. the `style=`/`onclick=` fixture asserting exactly 2 offenses in `check_shell_csp_inline_attrs`).

**What to Mock (plant):**
- Backend entry files, `user.js` pref overrides, config-home contents, state-file JSON, log text, markup fixtures — all under `mktemp -d`, all removed by `cleanup()`.

**What NOT to Mock:**
- The supervisor logic under test (`powerbrowser/shell/TheiaService.sys.mjs` is imported directly, never re-implemented); the analyzer a runtime check asserts (e.g. `health-gate-recovery-swaps` drives `scripts/verify-start-path-recovery.mjs` on the real launch log); the command registry in GUI-01 checks (read from the live frontend via BiDi). A self-test that re-implements the unit under test proves nothing.

## Fixtures and Factories

**Test Data:**
```bash
# Canonical temp-dir lifecycle for every fixture
fixture_dir="$(mktemp -d)"; track_temp "$fixture_dir"
cat > "$fixture" <<'EOF'
<!-- decoy: style="display:none;" inside a comment must not be flagged -->
<div id="powerbrowser-error" style="display:none;"></div>
EOF
```
- Self-test fault tables are `cases` arrays in-file: each case names the plant, the expected red text (file + both values), and any required green-at-foreign-root polarity (`scripts/verify-generated-identity.mjs:260-483`, `scripts/generate.mjs:1828-2318`).
- Sentinel polling uses bounded `SECONDS`-deadline loops (`deadline=$((SECONDS + 30))`) with explicit "process exited early" branches that `cat` the log — a timeout without the liveness branch cannot distinguish failure from slowness.

**Location:**
- Fixtures are created inline in `mkdtemp`/`mktemp -d` at check time. No committed fixture directory exists. The one exception is data derived from the tree itself at check time (jar.mn ship lists, `USER_MESSAGE` tables, `TARGETS` rows), which are reads, not fixtures.

## Coverage

**Requirements:** No numeric coverage target and no coverage tool. Coverage is structural: one registry row per behavior, one `--self-test` row per check, and the `.planning/WINDOWS.md` broken-windows ledger for everything known-open (`open_count`, per-item file/line/description/status, plus a machine-readable fenced JSON block that `--gate` reads).

**View Coverage:**
```bash
scripts/verify-platform.sh --quick                       # commit gate: ~all static rows
scripts/verify-platform.sh --only <label>                # per-task sampling of one row
node scripts/<check>.mjs --self-test                     # does this check discriminate?
grep -c 'self-test' scripts/verify-platform.sh           # every row should have a paired self-test row
```

## Test Types

**Unit Tests:**
- The `--quick` static checks are the unit layer: single-file readers asserting shape/set-equality over source (`shell-error-copy-no-internals` over `powerbrowser/shell/TheiaService.sys.mjs`; `gui04-registry-shape` over `theia/extensions/tab-uris/src/browser/`; `internals-boundary` over `powerbrowser/shell/`; `vendored-parser-digest` over `scripts/lib/toml.cjs`). No build, browser, display, or network.

**Integration Tests:**
- The full-set launch checks drive the built binary at `objdir/dist/bin/powerbrowser` headless (`start_shell`) or on a real/Xvfb display (`start_shell_display`) and assert on sentinel streams: SIDE-04 orphan/reap/identity checks, SHELL-03 error-budget checks, SIDE-05 second-launch checks, `health-gate-recovery-swaps`, `start-failure-shows-error`, `shell-diagnostics-rows-populated`, `side04-token-not-in-environment`.
- App-level checks boot the Theia dev app and read it over BiDi (`verify-branding`, `verify-customize-inert`, `verify-dev-flag-off`, `verify-uri-roundtrip`, `gui01-command-registered`), or launch real browser sessions (`verify-branding-identity-dev/release`, `verify-endpoints`).
- Every launch check asserts the launch actually reached readiness BEFORE drawing conclusions (the "never pass vacuously" rule), pairs the assertion with a positive control where a constant could satisfy it (e.g. `side05-no-second-backend`'s different-profile control, the two-failure-path discriminator in `shell-diagnostics-rows-populated`), and keeps the fixture's own proof outside the analyzer (marker-file invocation counts).

**E2E Tests:**
- No automated E2E framework (Selenium/Playwright/WebDriver) is used. Chrome-context driving is platform-blocked on Linux (`moz:windowless` is macOS-only — `.planning/WINDOWS.md` item 7; `scripts/lib/firefox-marionette.mjs` deliberately does not exist). The perceptual halves (Retry click, Details chord, GUI-01 window flow, customize live-restyle) route to the human record: UAT reports plus ledger entries 15–16 style closures. Never fabricate these as passes.

## Common Patterns

**Async Testing (sentinel polling):**
```bash
local deadline=$((SECONDS + 30))
while [ "$SECONDS" -lt "$deadline" ]; do
  sentinel_present 'POWERBROWSER_BACKEND_READY ' "$BROWSER_LOG" && break
  if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
    echo "<label>: FAIL -- browser exited before the sentinel appeared; log:" >&2
    cat "$BROWSER_LOG" >&2; stop_shell; return 1
  fi
  sleep 0.5
done
```

**Error Testing (planted-fault self-test):**
```javascript
// 1. Green control first: the unmutated tree/fixture must pass, else the red below proves nothing.
// 2. Plant one mutation per case into a mkdtemp mirror (never a repo file).
// 3. Require red NAMING the drift (file + both values), not just red.
// 4. Refuse to report when the unmodified tree is already red.
```

**Vacuity guards (apply to every new check):**
- Empty scan set / zero shippable files / zero parsed rows is its own distinct FAIL, never clean (`scan_internals_boundary`, `scan_inline_attrs` rc=2 path, `verify-branding-preflight.mjs` empty-row-set rejection).
- Start-time identity compares `startTicks` (`/proc/<pid>/stat` field 22), never bare pids — Linux recycles pids (`read_start_ticks` in `scripts/verify-platform.sh`, mirrored by `TheiaService`).
- Zombie (`Z`) state counts as gone; reap own children with `wait` so `kill(pid,0)`-style liveness re-checks do not false-alive (`wait_pid_gone_or_zombie`).
- Scope process scans to this run's process groups (`backends_in_groups`), never machine-wide `pgrep` — a developer box may already have the app open.
- Assert exact counts where "at least one" would pass vacuously (exactly 2 respawn attempts for `giveUpAttempts=2`; exactly one `POWERBROWSER_SHELL_ERROR`; exactly one swap sentinel across a recovery session).
- Cross-run discriminators: when one emitter serves two assertions, require the two runs' label sets to DIFFER, so a constant emitter cannot go green (the `shell-diagnostics-rows-populated` discriminator, documented in its header comment).

---

*Testing analysis: 2026-09-04*
