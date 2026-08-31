---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T20:05:00Z
status: gaps_found
score: 6/9 must-haves verified (1 newly closed, 3 new failures found this pass, 2 partial — human halves still open)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "The backend supervisor recovers from a transient health-gate failure without leaving the user on a permanent, unrecoverable loading screen with a healthy backend and no error affordance — closed by 01-09 (re-keyed _spawnAndGate's one-time block, _restart()'s port choice, and _swap()'s completion assignment onto this._swapped) and 01-10 (reportUnexpectedFailure terminal handler on all four fire-and-forget entry points; the three named unguarded throw sites guarded)"
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "Clicking Retry on the error layer does not permanently disable the error layer for the rest of the browser session — a failed Retry must still be able to repaint an error state on a subsequent failure. This is the same user-visible symptom class ('boots, and works as an actual web browser' clause; dead loading/blank screen, no message, no Retry, no Details) that 01-09/01-10 were scoped to eliminate, reached by a third, still-open route."
    status: failed
    reason: >
      Independently confirmed by reading powerbrowser/shell/powerbrowser.js and
      powerbrowser/shell/TheiaService.sys.mjs directly — not merely cited from 01-REVIEW.md's CR-01,
      which was produced against the identical post-01-10 tree and reaches the same conclusion.
      window.powerbrowserRetry (powerbrowser.js:121-124) writes the DOM directly
      (`errorElement.style.display = "none"`) and calls `TheiaService.retry()`. `retry()`
      (TheiaService.sys.mjs:899-901) is `async retry() { await this._restart(); }` — it never calls
      `_hideError()`. `_hideError()` (line 1015) is the ONLY site that clears `_errorShown`, and the
      only caller of `_hideError()` is `_restart()`'s success path (line 854, "successful spawn calls
      `_hideError`"). So on every Retry click whose restart does not succeed: (1) the DOM error layer
      is hidden by the click handler; (2) `_restart()` fails and, on give-up, calls `_showError(...)`
      again; (3) `_showError` (line 1000-1004) reads `if (this._errorShown) { return; }` and early-
      returns, because `_errorShown` was never reset. The error layer never repaints: no message, no
      Retry control, no Details control, on a screen the click handler already blanked. Because
      `_hideError()` also never ran, `_stopRecoveryProbe()` never ran either, so the background probe
      from the ORIGINAL failure is still active and may eventually recover the launch on its own after
      N x recoveryProbeIntervalMs (15000ms default) — but with zero on-screen feedback and no user
      affordance in the meantime, and never if the underlying condition does not clear on its own.
      This is not a hypothetical: clicking Retry while a genuinely transient condition (e.g. the
      token-gate race 01-UI-SPEC and the supervisor's own comments name elsewhere) is still resolving
      is the single most likely user action in the error state, and it reaches this path on the very
      first failed retry, no unusual timing required. Filed by 01-10 itself as deferred-items.md item
      7 ("same defect class as this plan ... pre-existing since 05-02 and outside 01-10's named
      scope"), i.e. known and explicitly not fixed, not deferred to any later ROADMAP phase (Phase
      2-7's goals are all about the configuration-manifest generator and its emitters; none covers
      backend-supervisor error recovery).
    artifacts:
      - path: "powerbrowser/shell/powerbrowser.js"
        issue: "Line 122: errorElement.style.display = \"none\" writes the DOM directly instead of routing through the supervisor's _hideError(), so the DOM and TheiaService._errorShown fall out of agreement on every failed Retry."
      - path: "powerbrowser/shell/TheiaService.sys.mjs"
        issue: "retry() (899-901) never calls _hideError() before re-entering _restart(); _showError()'s _errorShown guard (1000-1004) then swallows every repaint for the life of the browser session once a Retry has failed once."
    missing:
      - "Route the DOM hide through the supervisor: retry() should call this._hideError() (clearing _errorShown, stopping the stale recovery probe, and hiding the DOM through the same window global _showError paints with) before re-entering _restart(), and powerbrowser.js's powerbrowserRetry should stop writing errorElement.style.display directly."
      - "A registered check asserting that a FAILING Retry emits a second POWERBROWSER_SHELL_ERROR sentinel (with a POWERBROWSER_SHELL_ERROR_CLEARED between the two) — the existing shell03-budget-exhausted-error row only ever observes the first sentinel, which is why this shipped green through 01-08/01-09/01-10's full verification runs."
  - truth: "_showError does not start the background recovery probe for an unrecoverable failure classification, so a launch whose sidecar was never resolved (start()'s _resolveSidecar() failure branch, recoverable: false) does not drive an unbounded respawn loop against instance fields (_configDir, _stateFilePath) that were never assigned."
    status: failed
    reason: >
      Independently confirmed by direct reading (01-REVIEW.md's CR-02, produced against the identical
      tree, reaches the same conclusion). `start()`'s `_resolveSidecar()` failure branch
      (TheiaService.sys.mjs:134-142) calls `this._showError(resolved.message, /* recoverable */ false,
      resolved.details)` and returns at line 141 — before `_configDir` (144), `_stateFilePath` (176)
      and `PowerBrowserAPI.onQuitGranted` (181) are ever assigned. `_showError` (1000-1012) calls
      `this._startRecoveryProbe()` unconditionally, with no check of the `recoverable` parameter it
      was just passed — 01-09/01-10 touched the completion-field keying and the three named throw
      sites but did not add this gate. Fifteen seconds later the probe's `_restart()` call spawns
      against a supervisor whose `_configDir`/`_stateFilePath` were never resolved. This is unchanged
      by 01-09/01-10, whose stated scope was the state-gating conflation and the three named unguarded
      throws — not the sidecar-resolution failure path's own probe-gating.
    artifacts:
      - path: "powerbrowser/shell/TheiaService.sys.mjs"
        issue: "_showError (1000-1012) calls _startRecoveryProbe() unconditionally; the D-113 comment at start()'s _resolveSidecar() failure branch (136-139) states this class is 'unrecoverable by construction ... with no retry at all', which the code does not enforce."
    missing:
      - "Gate _startRecoveryProbe() in _showError on the recoverable flag (or an explicit this._sidecarResolved flag set only after _resolveSidecar() returns ok), so an unrecoverable resolve failure genuinely gets no retry."
  - truth: "The quit observer (onQuitGranted) and the state-file path are established before any code path that can result in a spawned, healthy backend, so quit always stops a backend this launch started and a crash leaves a reapable state-file record."
    status: failed
    reason: >
      Independently confirmed by direct reading (01-REVIEW.md's CR-03, produced against the identical
      tree). `PowerBrowserAPI.onQuitGranted(() => this.stop())` is registered at line 181 -- after the
      settings-folder ensureDirectory try/catch (153-168), which can return at line 167 on failure.
      That failure is classified recoverable: true, so (via the CR-02 mechanism above) _startRecoveryProbe()
      still runs and can drive a spawn that passes the health gate and swaps -- a live, healthy,
      supervised backend on a launch that never registered a quit observer and never set
      _stateFilePath, so stop() never runs on quit and no crash-leftover record exists for
      _reapLeftover() on the next launch. Unchanged by 01-09/01-10, whose scope did not include
      reordering this registration.
    artifacts:
      - path: "powerbrowser/shell/TheiaService.sys.mjs"
        issue: "onQuitGranted (181) and _stateFilePath's assignment (176) both sit after the settings-folder try/catch's return path (167-168), so a spawn reached via that recoverable path's recovery probe is unobserved by quit and unreapable by a later launch."
    missing:
      - "Move _stateFilePath's derivation and PowerBrowserAPI.onQuitGranted's registration ahead of the settings-folder ensureDirectory try/catch, and retain the unregister function onQuitGranted returns so stop() can detach it."
deferred:
  - truth: "GUI-02 — open and browse web pages inside Theia as URL-addressable tabs"
    addressed_in: "v2 (not a numbered roadmap phase yet)"
    evidence: "ROADMAP.md / REQUIREMENTS.md: 'GUI-02 deferred to v2 on 2026-08-30 at the D-22 gate' — pre-existing deferral, unaffected by this pass"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15) — unchanged by 01-09/01-10, neither of which touches this surface."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks only prove inertness and flag-gating, not the visible-restyle claim. Still open (ledger item 16) — unchanged by 01-09/01-10."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T20:05:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 01-09 and 01-10, and against a fresh code review
(01-REVIEW.md) run on the resulting tree

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate, 01-06) — not scored here,
not orphaned.

## Disposition of the Prior Gap (closed, independently re-verified against the live tree)

### The health-gate state-conflation and the three unguarded throw sites — CLOSED

Prior finding (01-VERIFICATION.md, previous pass): `_spawnAndGate`'s one-time cookie/navigate/
health-loop block was keyed on `firstSpawn`/`this._port === null`, conflating "a port has been
pinned" with "a spawn has actually completed" — a transient health-gate failure followed by any
successful respawn permanently skipped that block, and `powerbrowser.js:231`'s un-awaited, uncaught
`TheiaService.start()` call left three throw sites capable of becoming silent unhandled rejections
with the identical dead-screen symptom.

Independently re-verified by direct reading, not by re-running the shipped self-tests alone:

- `grep -n "_swapped" powerbrowser/shell/TheiaService.sys.mjs` shows the field used at the one-time
  block's guard (line 701, `if (!this._swapped)`), `_restart()`'s per-attempt argument (line 852,
  `this._spawnAndGate(!this._swapped)`), and `_swap()`'s guard/assignment (lines 1173/1177), with the
  assignment on a later line than the `powerbrowserSwapToUrl` call it guards.
- `powerbrowser.js:246` reads `TheiaService.start(browserElement).catch(err =>
  TheiaService.reportUnexpectedFailure(err));` — the previously-uncaught entry point now has a
  terminal handler.
- `grep -n reportUnexpectedFailure` across both files shows five call sites: the declaration
  (TheiaService.sys.mjs:932), the health loop and recovery-probe loop attachments
  (TheiaService.sys.mjs:741, 974), and the start call and the Retry call in powerbrowser.js (123, 246)
  — all four fire-and-forget entry points route to the one handler.
- The three named throw sites (settings-folder creation, leftover reap, session-cookie minting) are
  each inside a `try {`/`catch` in the current source (TheiaService.sys.mjs:153-168, 200-204,
  confirmed by direct read); the leftover-reap site is deliberately non-fatal, recorded as a reasoned
  deviation in 01-10-SUMMARY.md.
- `scripts/verify-platform.sh --quick` → exit 0, 22/22 PASS, including `start-path-recovery`,
  `start-path-recovery-self-test` (13 self-test rows, all behaving as required),
  `shell-error-copy-no-internals`, and `shell-error-copy-no-internals-self-test`.
- `node scripts/verify-start-path-recovery.mjs` (static mode) → PASS against the working tree
  independently, not only inside the `--quick` run.

**Verdict: VERIFIED — this specific gap is genuinely closed.** Plan 01-09's and 01-10's own claims
hold up under independent reading and independent command execution.

## New Findings This Pass (not part of 01-09/01-10's scope; discovered by 01-REVIEW.md and
independently confirmed by direct source reading rather than trusted from its narrative)

A code review committed after 01-09/01-10 (`01-REVIEW.md`, `01-VERIFICATION.md`'s sibling artifact
for this pass) reports three new BLOCKER findings against the identical post-gap-closure tree. Per
the verification brief, each was independently re-derived from source before being accepted:

**CR-01 — a failed Retry permanently disables the error layer.** `powerbrowser.js:121-124`'s
`powerbrowserRetry()` hides the DOM directly (`errorElement.style.display = "none"`) and calls
`TheiaService.retry()` (TheiaService.sys.mjs:899-901), which is `await this._restart();` and never
calls `_hideError()`. `_hideError()` (line 1015) is the only site that clears `_errorShown`, and its
only caller is `_restart()`'s **success** path (line 854). So a Retry that does not succeed leaves
`_errorShown` true while the DOM has already been blanked by the click handler; the next time
`_showError` runs, its `if (this._errorShown) { return; }` guard (line 1001) swallows the repaint —
byte-for-byte the same user-visible outcome ("dead screen, no message, no Retry, no Details") that
01-09/01-10 were scoped to eliminate, reached via a third route neither plan's acceptance criteria
cover. **This is explicitly acknowledged, not merely alleged**: 01-10-SUMMARY.md itself records it as
`deferred-items.md` item 7, filed during 01-10's own execution and named "same defect class as this
plan... pre-existing since 05-02 and outside 01-10's named scope," with disposition "a follow-up plan;
needs a runtime check that drives two consecutive failing retries." It was not deferred to any later
ROADMAP phase — Phase 2 through 7's goals are entirely about the configuration-manifest generator and
its emitters, none of which touches backend-supervisor error recovery — so Step 9b's later-phase
deferral filter does not apply and this stays a live gap against Phase 1's own goal wording.

**CR-02 — the recovery probe starts on an unrecoverable resolve failure, against unresolved state.**
`start()`'s `_resolveSidecar()` failure branch (134-142) is explicitly commented "unrecoverable by
construction ... with no retry at all" (D-113) and returns before `_configDir` (144),
`_stateFilePath` (176) are ever assigned. `_showError` (1000-1012) calls `_startRecoveryProbe()`
unconditionally — it does not inspect the `recoverable` parameter it was just passed. 01-09/01-10 did
not touch this call; their scope was the completion-field keying and the three throw sites named in
the prior verification's `missing:` list, not this probe-gating decision. Unaddressed and unmentioned
in either plan's SUMMARY.

**CR-03 — the quit observer is registered after a return path that can result in a spawned backend.**
`PowerBrowserAPI.onQuitGranted(() => this.stop())` (181) sits after the settings-folder
`ensureDirectory` try/catch (153-168), which 01-10 itself guarded and classified `recoverable: true`
— meaning (via CR-02's mechanism) the recovery probe still runs and can drive a spawn to a healthy,
swapped state on a launch that never registered a quit observer and never derived `_stateFilePath`.
Unaddressed by 01-10, whose settings-folder fix (Site 1 in 01-10's Task 2) closed the "silent
rejection" half of that path but did not reorder `onQuitGranted`/`_stateFilePath` ahead of it.

None of the three is a stub or a debt marker; all three are logic/control-flow defects in code that
is present, wired, and covered by passing checks that do not happen to exercise these branches — the
same class of gap the previous verification pass found (a check observing the state the supervisor
*believes* it is in, not the DOM-vs-supervisor agreement or the probe-gating decision itself).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `inventory/brand-tokens.json` intact, `scan-brand-residue: PASS` in `--quick` |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests (happy path) | ✓ VERIFIED | Regression-checked: `objdir/dist/bin/powerbrowser` present (2.4MB, built 08-30); 01-09/01-10 both repackaged and re-ran the happy path as part of their own RED/GREEN observations |
| 2b | The backend supervisor's state-gating conflation and the three named unguarded throw sites are closed | ✓ VERIFIED (now closed) | See "Disposition of the Prior Gap" above — independently confirmed by direct reading and by running `--quick` and the static analyzer myself |
| 2c | A failed Retry does not permanently disable the error layer for the rest of the session | ✗ FAILED | CR-01 — see above; confirmed by direct reading of `powerbrowser.js:121-124` and `TheiaService.sys.mjs:899-901,1000-1012` |
| 2d | The recovery probe is gated on recoverability, not started unconditionally on every `_showError` call | ✗ FAILED | CR-02 — see above; confirmed `_showError` (1000-1012) calls `_startRecoveryProbe()` with no check of `recoverable` |
| 2e | The quit observer and state-file path are established before any path that can spawn a backend | ✗ FAILED | CR-03 — see above; confirmed `onQuitGranted` (181) sits after a returnable, recoverable-classified try/catch (153-168) |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green (`gui04-registry-shape` + self-test PASS in `--quick`); perceptual half still open (ledger 15), unchanged |
| 4 | SC4 — Runtime restyle via customize bridge | ◐ PARTIAL | Automated half green; perceptual half still open (ledger 16), unchanged |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | Regression-checked: About dialog line 34 still reads `<h3>Power Browser</h3>`; `branding-preflight` + self-test PASS in `--quick` |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked: `process.exit(78)` present at 3 sites in `token-gate-backend-contribution.ts`, file untouched by 01-09/01-10 |
| 7 | Residual brand strings can never re-enter — registered scan gate fails on an unclaimed occurrence | ✓ VERIFIED | Regression-checked: `scan-brand-residue: PASS` and `scan-brand-residue-self-test: PASS` in `--quick` |

**Score:** 6/9 fully verified (5 regression-checked + 1 newly closed), 3 new failures (2c/2d/2e), 2
partial (human verification open).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/shell/TheiaService.sys.mjs` | Backend supervisor with correct one-time init gating, correct probe gating, and quit-observer ordering | ⚠️ PARTIALLY DEFECTIVE | The `_swapped`-keyed init block is correct (01-09) and the three named throw sites are guarded (01-10); the probe-start gating (CR-02) and the quit-observer/state-file ordering (CR-03) remain defective |
| `powerbrowser/shell/powerbrowser.js` | Entry point with a terminal handler on every fire-and-forget supervisor call, and no DOM write that bypasses the supervisor's own state | ⚠️ PARTIALLY DEFECTIVE | The start call and the Retry call both carry `reportUnexpectedFailure` (01-10, correct); the Retry click handler still writes `errorElement.style.display` directly instead of routing through `_hideError()` (CR-01) |
| `scripts/verify-start-path-recovery.mjs` | Recovery contract checker: static + log + self-test | ✓ VERIFIED | 13/13 self-test rows PASS; static mode PASS standalone |
| `scripts/verify-platform.sh` | Single registry, `--quick` green | ✓ VERIFIED | 22/22 PASS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `_spawnAndGate`'s one-time block / `_restart()`'s port choice / `_swap()` | `this._swapped` | shared completion field | ✓ WIRED | Confirmed at TheiaService.sys.mjs:701, 852, 1173/1177 |
| `powerbrowser.js`'s start call and Retry call | `TheiaService.reportUnexpectedFailure` | `.catch()` | ✓ WIRED | powerbrowser.js:123, 246 |
| `powerbrowserRetry()`'s DOM hide | `TheiaService._hideError()` / `_errorShown` | (none — direct DOM write) | ✗ NOT WIRED | powerbrowser.js:122 writes `errorElement.style.display` directly; `_errorShown` is never cleared by this path (CR-01) |
| `_showError`'s recovery-probe start | the `recoverable` classification it was just passed | (none — unconditional call) | ✗ NOT WIRED | TheiaService.sys.mjs:1011 calls `_startRecoveryProbe()` with no gate on `recoverable` (CR-02) |
| `start()`'s early-returning steps | `PowerBrowserAPI.onQuitGranted` registration | registration ordering | ✗ MISWIRED | `onQuitGranted` (181) sits after a returnable, recoverable-classified try/catch (153-168) that can still lead to a spawn via CR-02's mechanism (CR-03) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (22 checks) | `scripts/verify-platform.sh --quick` | PASS, 22/22 | ✓ PASS |
| Start-path recovery static check | `node scripts/verify-start-path-recovery.mjs` | PASS | ✓ PASS |
| Start-path recovery self-test | `node scripts/verify-start-path-recovery.mjs --self-test` | PASS, 13/13 rows | ✓ PASS |
| Retry-after-failed-retry repaints a second error | (no registered check exists) | not exercised by any registered check | ? SKIP — see Gaps; `shell03-budget-exhausted-error` only observes the first sentinel |
| Recovery probe gated on `recoverable` | (no registered check exists) | not exercised | ? SKIP — see Gaps |
| Quit observer registered before any spawnable path | (no registered check exists) | not exercised | ? SKIP — see Gaps |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-04 | Renamed tree builds and boots under branding | ✗ NOT SATISFIED | Happy-path smoke tests still pass, and the specific gap 01-09/01-10 were scoped to close is genuinely closed — but three further routes to the identical "boots... works as an actual web browser" failure (CR-01/02/03) are live and unaddressed, one of them (CR-01) reachable by the single most obvious user action in the error state |
| GUI-01 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-03 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Unchanged, regression-checked |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Unchanged, regression-checked |

No orphaned requirements: all 8 phase-1 requirement IDs are accounted for. GUI-02 correctly absent
(deferred to v2).

### Anti-Patterns Found

None. `grep -E "TBD|FIXME|XXX"` over `TheiaService.sys.mjs` and `powerbrowser.js` returns zero
matches. All three new gaps are logic/control-flow defects in present, wired, passing-check-covered
code, not stubs or debt markers.

## Human Verification Required

### 1. GUI-01 — browser-window toggle, full perceptual walkthrough

**Test:** Launch the app; open a browser window; confirm the address bar takes keyboard focus and
navigates a typed URL; confirm an in-window modal appears; close the window and confirm the shell
returns with the app still running.
**Expected:** All five steps succeed exactly as a stock browser window would behave.
**Why human:** BiDi cannot see chrome contexts on Linux; chrome-context Marionette is
platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15), unchanged by 01-09/01-10.

### 2. GUI-03 — customize bridge, visible restyle

**Test:** With the dev flag on, edit `customize.css` and confirm the shell visibly restyles
without a rebuild; delete the file and confirm the shell reverts.
**Expected:** The runtime CSS layer applies and un-applies visibly.
**Why human:** Perceptual outcome; automated checks only prove inertness and flag-gating, not the
visible effect. Still open (ledger item 16), unchanged by 01-09/01-10.

## Gaps Summary

The one gap the prior verification pass recorded FAILED — the supervisor's state-gating conflation
and the three named unguarded throw sites — is now genuinely closed. 01-09's and 01-10's own claims
hold up under independent re-reading of the source and independent re-execution of the static
checks: `this._swapped` correctly gates the one-time init block, the per-attempt port choice, and
`_swap()`'s own completion assignment; `reportUnexpectedFailure` is attached at all four fire-and-
forget entry points; the three named throw sites are guarded.

But a code review run against the resulting tree (01-REVIEW.md) found three further defects in the
same supervisor, all independently re-derived from source rather than trusted from the review's
narrative, and all bearing on the identical phase-goal clause — "boots, and works as an actual web
browser":

1. **CR-01** — a failed Retry permanently disables the error layer for the rest of the session,
   because the click handler hides the DOM directly instead of routing through the supervisor's
   `_hideError()`, so `_errorShown` is never cleared and every subsequent `_showError` call
   early-returns. This is the single most likely user action in the error state, and 01-10's own
   SUMMARY names it as a known, deferred, out-of-scope item (`deferred-items.md` #7) — acknowledged,
   not fixed, and not deferred to any later numbered ROADMAP phase.
2. **CR-02** — the background recovery probe starts unconditionally from `_showError`, including for
   the one failure class the supervisor's own comment calls "unrecoverable by construction... with no
   retry at all," driving spawns against instance fields (`_configDir`, `_stateFilePath`) that were
   never assigned.
3. **CR-03** — the quit observer is registered after a returnable, recoverable-classified try/catch,
   so a spawn reached via that path's recovery probe can produce a live, healthy backend with no quit
   observer and no state-file record.

None of the three is addressed by 01-09 or 01-10, whose scope was explicitly the specific gap the
prior verification recorded. None is recorded as deferred to a later phase in ROADMAP.md — Phase 2
through 7 are entirely about the configuration-manifest generator and its emitters. All three are
therefore live gaps against this phase's own goal.

Two success criteria (3 and 4) still have their perceptual halves un-performed, carried forward
unchanged from the prior pass and from `WINDOWS.md` (ledger items 15, 16) — not newly discovered,
not silently dropped.

---

_Verified: 2026-08-31T20:05:00Z_
_Verifier: Claude (gsd-verifier)_
