---
phase: 01-platform-extraction-and-rename
plan: 10
subsystem: shell-supervisor
tags: [gap-closure, supervisor, error-affordance, verification, MIG-04, GUI-01]
status: complete

requires:
  - 01-09 (the supervisor's completion-keyed one-time block; this plan's cookie guard depends on it)
  - 01-07 (the USER_MESSAGE table, the diagnostics rows, and shell-error-copy-no-internals)
  - a built objdir (01-04) — the new runtime row launches the binary
provides:
  - TheiaService.reportUnexpectedFailure — one terminal handler, four attachment points
  - three guarded throw sites in the start path, two carrying the classified-result shape
  - a tree-derived terminal-handler coverage rule in scripts/verify-start-path-recovery.mjs
  - one registry label — start-failure-shows-error
affects:
  - powerbrowser/shell/TheiaService.sys.mjs
  - powerbrowser/shell/powerbrowser.js
  - scripts/verify-platform.sh
  - scripts/verify-start-path-recovery.mjs
  - .planning/WINDOWS.md

tech-stack:
  added: []
  patterns:
    - one decision site, N attachment points — four promise roots, one handler, no per-site logic
    - derive-and-compare (D-21 rule 2) applied to promise-returning-method coverage, both sides from the tree
    - vacuity guard as a first-class failure — a coverage rule that finds no call sites is red, not green
    - deliberate asymmetric classification, commented at the site, so a non-fatal guard reads as decided rather than forgotten

key-files:
  created: []
  modified:
    - powerbrowser/shell/TheiaService.sys.mjs
    - powerbrowser/shell/powerbrowser.js
    - scripts/verify-platform.sh
    - scripts/verify-start-path-recovery.mjs
    - .planning/WINDOWS.md
    - .planning/ROADMAP.md

decisions:
  - "One public terminal handler (reportUnexpectedFailure) with four attachment points, not four handlers: four promise roots have no shared root to guard, but there is exactly one place the outcome is decided."
  - "The two long-lived supervisor loops were attached too — a strict superset of the gap's missing: list. Same defect class, same supervisor; leaving them would keep the bug alive on the path a mid-session outage takes."
  - "No USER_MESSAGE entry minted. The declared-versus-referenced equality means a new key must be referenced somewhere, and for a generic backstop that means inventing a distinction the user cannot act on."
  - "The leftover-reap site is guarded but deliberately NON-FATAL — a reasoned deviation from missing: item 3. It is best-effort cleanup of a PREVIOUS launch's process; failing this launch over a stale pid would turn a cosmetic miss into the dead screen the guard exists to prevent."
  - "The session-cookie catch RETURNS before the navigation. Continuing would present an unauthenticated browser to a fail-closed backend and paint a blank frame instead of an actionable error (T-01-08)."
  - "verify-start-path-recovery.mjs's derivation B moved from an adjacency assumption to a nearest-enclosing-guard search: the new try/catch made the old regex yield nothing, and a derivation that breaks when the code it describes is legitimately restructured is a fragile check, not a strict one."

metrics:
  duration: ~40m
  tasks: 3
  files: 6
  completed: 2026-08-31

actuals:
  tokens: 24688
  tasks: 3
  commits: 4
---

# Phase 01 Plan 10: Start-Path Error Affordance Summary

A rejection escaping the backend supervisor's start path can no longer vanish: all four
fire-and-forget entry points onto the supervisor route to one terminal handler that paints a
product-named sentence from the existing copy table with the Retry and Details controls already on
screen, and the three unguarded throw sites the verification named each have a decided outcome —
proven by a registered check observed RED (no error sentinel at all) before the handler existed and
GREEN on the same binary after it.

## Reconciliation against 01-VERIFICATION.md's `missing:` list

| # | `missing:` item | Closed by | How |
|---|---|---|---|
| 1 | Key the `firstSpawn` cookie/swap/health-loop block on `this._swapped` | **01-09 Task 1** | Block, `_restart()`'s port choice and `_swap()`'s assignment order all re-keyed onto the completion field; `health-gate-recovery-swaps` observed red then green |
| 2 | Add a terminal `.catch()` to `TheiaService.start(browserElement)` showing a static, product-named, USER_MESSAGE-table error with Retry/Details | **01-10 Task 1** | `reportUnexpectedFailure` + four attachments (start, Retry, `_healthLoop`, `_recoveryProbeLoop`); paints a direct `USER_MESSAGE.couldNotStart` reference. Superset: the item named one site, four were attached |
| 3 | Wrap the three unguarded throw sites in try/catch returning the same classified-result shape | **01-10 Task 2** | Two of three return that exact shape; the third (leftover reap) is guarded, logged and deliberately non-fatal — a recorded deviation, reasoned below |
| 4 | Add a registered check with a planted fault forcing the health probe to fail once, requiring the shell still swaps | **01-09 Task 1** | `check_health_gate_recovery_swaps` — a counting wrapper backend that answers 503 on invocation 1 and 200 after; asserts the swap sentinel exactly once and `loading: "none"` at the swap |

Item 2 was closed by a strict superset of its wording, and item 3 by a deliberate deviation on one
of its three sites. Both are stated as such rather than as clean closures.

## What Changed

**`powerbrowser/shell/TheiaService.sys.mjs`** — one new public method plus three guards:

| Site | Line | Before | After |
|---|---|---|---|
| `reportUnexpectedFailure(err)` | 932 | — | the ONE terminal handler: `_fatal` the full text, then `_showError(USER_MESSAGE.couldNotStart, true, [failed step, error])` |
| settings-folder creation | `try {` 153, call 154 | unguarded `await ensureDirectory` | recoverable classified result → `_showError` → return |
| leftover reap | `try {` 200, call 201 | unguarded `await this._reapLeftover()` | guarded, `_reapLog`'d, **non-fatal**, falls through to the spawn |
| session-cookie minting | `try {` 713, call 714 | unguarded `setSessionCookie` | recoverable classified result RETURNED at line 723, before the navigation at line 733 |
| health loop | 741 | `this._healthLoop();` | `.catch(err => this.reportUnexpectedFailure(err))` |
| recovery probe loop | 974 | `this._recoveryProbeLoop();` | same handler |

**The USER_MESSAGE table gained no entry.** Declared entry count is **4 before and 4 after**
(`interfaceFilesMissing`, `nodeMissing`, `couldNotStart`, `didNotFinishStarting`); the staged diff
carries no added or removed line inside the `const USER_MESSAGE = {` block.

**`powerbrowser/shell/powerbrowser.js`** — two attachment points, no new copy and no new UI. The
error layer's Retry and Details controls already existed and are untouched.
`grep -c reportUnexpectedFailure` = **2** here and **3** in the supervisor (declaration + two loops).

**`scripts/verify-platform.sh`** — `check_start_failure_shows_error` plus one appended registry row
in the full set (`start-failure-shows-error`). No sibling driver: `ls scripts/verify-phase-*.sh`
finds nothing.

**`scripts/verify-start-path-recovery.mjs`** — the terminal-handler coverage rule, two more planted
faults, and one repaired derivation (below).

## The RED → GREEN observation (Task 1)

**RED**, on the pre-handler build after `./mach build faster` synced the tree
(`scripts/verify-platform.sh --only start-failure-shows-error`, exit 1) — verbatim:

```
verify-platform: running start-failure-shows-error...
start-failure-shows-error: FAIL -- MIG-04 -- a throw out of the start path produced NO error state within 30s: the rejection was swallowed and the user is looking at the loading layer with no message, no Retry and no Details; log:
*** You are running in headless mode.
POWERBROWSER_SHELL_READY chrome://powerbrowser/content/powerbrowser.xhtml
POWERBROWSER_SIDECAR_PREFS backendMain=/tmp/tmp.26I5xmzQee/main.js nodePath=
POWERBROWSER_APP_IDENTITY {"name":"powerbrowser","vendor":"DeBIOS","version":"153.1.0esr"}
Crash Annotation GraphicsCriticalError: |[0][GFX1-]: RenderCompositorSWGL failed mapping default framebuffer, no dt (t=0.75643) [GFX1-]: RenderCompositorSWGL failed mapping default framebuffer, no dt
JavaScript error: , line 0: InvalidAccessError: Could not create directory `/tmp/tmp.dddXk1iu7U/powerbrowser': file exists and is not a directory (NS_ERROR_FILE_NOT_DIRECTORY)

verify-platform: summary
  start-failure-shows-error: FAIL
verify-platform: FAIL -- see summary above
```

This is the defect, not a fixture failure. The plant fired — the `InvalidAccessError` line is the
settings-folder step rejecting — and the shell stayed alive with no error sentinel, no diagnostics
sentinel and no swap. That bare `JavaScript error:` line **is** the unhandled promise rejection; it
is the whole of what a user got.

**GREEN**, after the handler and its four attachments landed and `./mach build faster` repackaged,
identical command, exit 0 — verbatim (this run is after Task 2, so it carries the rows line too):

```
verify-platform: running start-failure-shows-error...
start-failure-shows-error: rows[Failed step	creating the settings folder,Error	Could not create directory `/tmp/tmp.6FJoz5XtG4/powerbrowser': file exists and is not a directory (NS_ERROR_FILE_NOT_DIRECTORY),]
start-failure-shows-error: painted 'Power Browser couldn't start its interface. Choose Retry, or open Details to see the error.'

verify-platform: summary
  start-failure-shows-error: PASS
verify-platform: PASS -- all checks passed
```

The Task-1-only green (before the rows assertion existed) was identical minus the `rows[...]` line.

### Which planted fault was used, and why

The **first** fault — a regular FILE at the path `_resolveConfigDir()` derives from the config-home
environment variable — fired on this host, so the `chmod 500` fallback the plan named was never
needed. `PowerBrowserAPI.ensureDirectory` is `IOUtils.makeDirectory`, which rejects with
`NS_ERROR_FILE_NOT_DIRECTORY` when the target exists and is not a directory. This is the better of
the two: it is deterministic (no dependence on the process's uid or on `chmod` semantics under the
harness), and the message it produces names the exact condition, which is what the diagnostics row
then carries.

## The diagnostics-row assertion (Task 2)

Parsed rows array from the passing run:

```
Failed step	creating the settings folder
Error	Could not create directory `/tmp/tmp.6FJoz5XtG4/powerbrowser': file exists and is not a directory (NS_ERROR_FILE_NOT_DIRECTORY)
```

This is what distinguishes Task 2 from Task 1: Task 1 proved an error paints at all, this proves the
failure carries **its own** classification rather than the generic backstop's `"starting the
interface"`. Both assertions are kept; neither subsumes the other, and stripping the settings-folder
guard reverts this row to the backstop label while every Task 1 assertion stays green.

## The reap-site deviation (Task 2), and why the escape hatch is still closed

`missing:` item 3 asks for a classified result at **all three** sites. The leftover-reap site
instead gets a guard, a log line, and execution continuing to the spawn.

**Reasoning.** The reap is best-effort cleanup of a *previous* launch's process — SIDE-04's startup
half. `PowerBrowserAPI.signalBarePid` opens libc *outside* its own try block, so it can genuinely
throw. Failing this launch because a stale pid could not be signalled would convert a cosmetic
cleanup miss into the dead screen this entire gap is about — trading a real regression for a
theoretical consistency.

**The escape hatch is closed either way**: the site is guarded and the outcome is decided. Nothing is
lost, because `_reapLog` writes on the same dual channel every other reap decision uses — the D-106
ring buffer the diagnostics layer renders, and the process's own stdout, which is the sink
`verify-platform.sh`'s automated controls read. A failed reap is now attributable after the fact
rather than invisible. The asymmetry with the settings-folder site is commented at the site itself so
it reads as a decision, not an oversight.

## The hand-planted RED of the coverage rule (Task 3)

The terminal handler was stripped from the bootstrap's start call in the working tree
(`TheiaService.start(browserElement).catch(...)` → `TheiaService.start(browserElement);`) and
`scripts/verify-platform.sh --only start-path-recovery` run — exit 1, verbatim:

```
verify-platform: running start-path-recovery...
verify-start-path-recovery: FAIL -- `TheiaService.start(` is called in the chrome bootstrap with no terminal handler on the same statement -- `start` is declared async, so this is a promise ROOT and a rejection escaping it becomes an unhandled promise rejection in chrome: the user is left on the loading layer with no message, no Retry and no Details

verify-platform: summary
  start-path-recovery: FAIL
verify-platform: FAIL -- see summary above
```

It names the specific call site, as required. **Restored** (`git diff --stat` on the file reports no
change against the committed version), same command, exit 0 — verbatim:

```
verify-platform: running start-path-recovery...
verify-start-path-recovery: PASS -- the one-time initialisation block and _swap()'s guard are keyed on the same completion field (/home/chris/coding/Power-Browser/powerbrowser/shell/TheiaService.sys.mjs)

verify-platform: summary
  start-path-recovery: PASS
verify-platform: PASS -- all checks passed
```

The self-test now reports **13 rows — 11 planted faults plus 2 clean controls** (01-09's 9 plus this
task's 2), each red naming its drift.

## Verification results

| Step | Command | Result |
|---|---|---|
| 1 | `node scripts/verify-start-path-recovery.mjs --self-test` | exit 0 — 13 rows |
| 2 | `node scripts/verify-shell-error-copy.mjs` and `--self-test` | exit 0 both — all 6 planted faults red |
| 3 | `scripts/verify-platform.sh --quick` | exit 0 — 22 rows PASS, zero `: FAIL` lines |
| 4 | `check-internals-boundary.sh` and `--catalogue` | exit 0 both; `git diff --stat powerbrowser/INTERNAL-APIS.md` empty |
| 5 | `scan-brand-residue.mjs` and `--reconcile` | exit 0 both, everything staged first |
| 6 | `./mach build faster` (tier 2) | 5s, 3s and 4s across the three runs |
| 7 | `--only start-failure-shows-error` | exit 0 |
| 8 | `--only health-gate-recovery-swaps` | exit 0 — plan 01-09's fix intact |
| 9 | `git -C upstream diff --quiet` | clean |

`--quick`'s summary contains `start-path-recovery: PASS` and `start-path-recovery-self-test: PASS`.
`git diff --stat .planning/REQUIREMENTS.md` is empty — requirement status was not self-certified.
`ls scripts/verify-phase-*.sh` finds nothing — D-21's consolidation is intact.

## Ledger reconciliation

`.planning/WINDOWS.md` gains **entry 18**, a `deviation` naming both halves of the supervisor gap
(the state-keying conflation and the unguarded start path), with a resolution stating what changed,
how it was proven — the two registered checks and the red each was observed to produce before its own
fix — and the residual it explicitly does NOT close: **no registered check drives a rejection out of
either long-lived supervisor loop**, so those two terminal handlers rest on the source-derived
coverage rule rather than on a runtime red.

Open-row counts: **6 before, 6 after** (entry 18 is recorded `fixed`). Items **15 and 16 remain
open**, un-substituted and textually unchanged — nothing in either gap-closure plan performs or
proxies a perceptual walkthrough, and the plan's own prohibition forbids one.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] `verify-start-path-recovery.mjs`'s derivation B stopped finding the block**

- **Found during:** Task 2, immediately after wrapping `setSessionCookie` in its own try/catch.
- **Issue:** derivation B matched `if (...) {\s*PowerBrowserAPI.setSessionCookie(`, an *adjacency*
  assumption. The new `try {` between the guard and the call made it yield nothing:
  `verify-start-path-recovery: FAIL -- derivation B yielded nothing: no \`if (...) { PowerBrowserAPI.setSessionCookie(\` block found`.
- **Fix:** it now finds the nearest enclosing `if (...) {` before the cookie call and requires the
  gap between them to be whitespace or that one `try {` — anything else is reported by name. The
  body window widened 1200 → 2400 chars to still cover the block. Still body-located, still no field
  name written into the checker; the assumption that was too tight is gone rather than special-cased.
- **Files modified:** `scripts/verify-start-path-recovery.mjs`
- **Commit:** `d5073a6`

This file was not in Task 2's declared `<files>` list. Touching it was unavoidable: Task 2's edit
broke an existing green check, and leaving `--quick` red was not an option.

### Judgment calls

**2. The tracer feedback gate was satisfied by re-running the tracer's `<verify>`, not by a
checkpoint.** The executor's tracer protocol asks for a `checkpoint:human-verify` after the tracer
task in an interactive run. This plan declares `autonomous: true`, contains no `checkpoint:*` task,
and its own `<verification>` block states "Human verification: none is added by this plan" — so the
plan author's explicit position is that no human is in the loop. The gate's purpose (do not pour
expansion work onto a broken foundation) was met by running the tracer's full `<verify>` chain
end-to-end: build → `--only start-failure-shows-error` → `--only health-gate-recovery-swaps` →
`--quick`, all exit 0, before Task 2 began. Halting here would have left two committed halves of one
defect fix and invited exactly the premature-complete churn commit `034f857` already had to revert.

**3. The two loop attachments are a superset of what the gap asked for**, as the plan itself
directed. Recorded here because the acceptance criterion counts them.

No other deviations. No architectural decision arose. No authentication gate was hit. No package was
installed — the extended script uses only `node:` builtins.

## Deferred Issues

One item logged to `deferred-items.md` (row 7), out of scope and pre-existing:
`powerbrowserRetry()` hides the error layer with a direct `style.display = "none"` without clearing
`TheiaService._errorShown`, so a Retry that *resolves* after failing again hits `_showError`'s early
return and leaves a blank screen. Same defect class as this plan, but from 05-02, outside 01-10's
named scope, and it needs its own runtime check driving two consecutive failing retries — which
cannot be a chrome-side click on Linux (ledger 7). The terminal handler added here covers the
*rejected*-retry path correctly; this is the *resolved-but-failed* one.

## Known Stubs

None. The verification fixture's stub backend and poisoned config home are `mktemp`-scoped test
doubles registered with `track_temp`, never repo files and never paths outside the temp root
(T-01-10), and the stub is never spawned on the path under test.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or trust-boundary schema change.
`check-internals-boundary.sh` and `--catalogue` are green, `powerbrowser/INTERNAL-APIS.md` is
unchanged, and no new symbol is exported from `PowerBrowserAPI.sys.mjs`. The register's own high
items are held: T-01-06 (`shell04-log-redacts-token` green, no new sink — the rejection text reaches
the rows through `_showError`'s existing per-launch token redaction and the ring buffer through
`_pushLog`'s), T-01-07 (`shell-error-copy-no-internals` and its self-test green; the painted sentence
is a direct table reference resolved syntactically by rule 4), T-01-08 (the cookie catch returns at
line 723, before the navigation at line 733), T-01-SC (no dependency added).

## Requirements

- **MIG-04** — the renamed tree's boot path now has no state in which the user faces a screen that
  will never change with no way to act. Either the interface loads, or a product-named error with a
  working Retry and a populated Details layer is on screen. Both halves of the FAILED must-have
  (01-09's recovery, 01-10's affordance) are closed behind registered checks each observed red first.
  Status stays the verifier's call on evidence; nothing here self-certifies it.
- **GUI-01** — the shell remains reachable and actionable after a start-path failure, so the
  browser-window toggle is not stranded behind a dead loading layer. `gui04-registry-shape` and the
  three GUI-01 checks are untouched.
- **UI-SPEC E2/E3** — the painted copy is the existing two-part sentence with Retry and Details as
  on-screen affordances and no internal identifier; the error layer and its `max-width: 40em`
  wrapping are reused unchanged; rows are supplied only for identifiers the failing path holds, so
  no empty-labelled row is produced.
- **SEC-01** — untouched and strengthened at one edge: a launch whose session cookie could not be
  minted no longer navigates to the backend origin at all.

## Self-Check: PASSED

- `powerbrowser/shell/TheiaService.sys.mjs` — FOUND
- `powerbrowser/shell/powerbrowser.js` — FOUND
- `scripts/verify-platform.sh` — FOUND
- `scripts/verify-start-path-recovery.mjs` — FOUND
- `.planning/WINDOWS.md` — FOUND
- commit `26c69ec` (Task 1) — FOUND
- commit `d5073a6` (Task 2) — FOUND
- commit `af2c04b` (Task 3) — FOUND
