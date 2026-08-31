---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T21:15:00Z
status: gaps_found
score: 8/11 must-haves verified (2 newly closed, 1 gap still open under a different mechanism, 2 partial — human halves still open)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/9
  gaps_closed:
    - "2c — a failing Retry no longer permanently disables the error layer: retry() calls _hideError() before _restart(); powerbrowserRetry no longer writes errorElement.style.display. Independently confirmed by direct reading of powerbrowser.js:131-133 and TheiaService.sys.mjs:955-957, and by scripts/verify-platform.sh --quick (shell-error-contract: PASS, 6/6 self-test rows)."
    - "2e — the quit observer and _stateFilePath are now established immediately after _configDir (TheiaService.sys.mjs:153/170/186), ahead of the settings-folder try/catch (196-211) that 2e named. Independently confirmed by direct reading and by the ordering dump in 01-12-SUMMARY.md, cross-checked against the live file."
  gaps_remaining:
    - "2d (re-scoped by CR-01) — _showError's background-probe timer is now correctly gated on recoverable (TheiaService.sys.mjs:1088-1090, confirmed), but nothing gates the user-driven route to the identical unretryable class: retry() (955-957) and the Retry button (powerbrowser.xhtml:39, no disabled/hidden attribute; powerbrowser.js:135-137, unconditional click listener) run unconditionally regardless of the recoverable classification _showError was given. A user who clicks Retry after an unrecoverable _resolveSidecar failure re-enters _restart()/_spawnAndGate() against _configDir=null, _stateFilePath=null and no registered quit observer, and _hideError() (1096-1103) unconditionally nulls _failureDetails, erasing the original diagnostic rows on every such click. This is the same defect CLASS 2d was opened to close (an unrecoverable classification not actually preventing re-entry into the failed launch path) reached by a different route than the one 01-12 closed."
  regressions: []
gaps:
  - truth: "An unrecoverable failure classification (recoverable: false) actually prevents re-entry into the failed launch path — not just the background timer, but every route the UI offers, including the Retry button."
    status: failed
    reason: >
      Independently confirmed by direct reading of powerbrowser.js and TheiaService.sys.mjs, not
      merely cited from 01-REVIEW.md's CR-01 (produced against the identical post-01-12 tree and
      reaching the same conclusion). 01-12 correctly closed the TIMER half of this gap: `_showError`
      (TheiaService.sys.mjs:1079-1092) now reads `if (recoverable) { this._startRecoveryProbe(); }`
      -- confirmed present, and confirmed exercised by the registered
      `unrecoverable-classification-starts-no-probe` / `recoverable-classification-starts-the-probe`
      scenario pair (`scripts/verify-platform.sh --quick` → PASS). But the USER-driven half was never
      touched: `powerbrowserShowError` (powerbrowser.js:102-109) destructures `{ reason, recoverable }`
      and forwards `recoverable` to the `POWERBROWSER_SHELL_ERROR` sentinel dump only (line 106) — it
      never reads or writes `errorRetryButton`. The XHTML markup
      (`powerbrowser.xhtml:39`, confirmed by direct read) carries no `disabled`/`hidden` attribute on
      that button, and `powerbrowser.css` (confirmed by grep) has no rule that hides or disables
      `#powerbrowser-error-retry`. The click listener (`powerbrowser.js:135-137`) is unconditional.
      `TheiaService.retry()` (`:955-958`, confirmed) is `async retry() { this._hideError(); await
      this._restart(); }` — no check of any recoverable/recorded classification anywhere in its body.
      So on the ONE class the supervisor's own D-113 comment (TheiaService.sys.mjs:145-148, confirmed)
      calls "unrecoverable by construction ... with no retry at all" -- the `_resolveSidecar()` failure
      branch that returns at line 150, before `_configDir` (153), `_stateFilePath` (170) or the quit
      observer (186) are ever assigned -- the user is looking at a live, enabled Retry control
      (`USER_MESSAGE.nodeMissing` even names it as the next step: "Install Node.js 22 or later, then
      choose Retry"), and clicking it: (1) calls `_hideError()`, which unconditionally nulls
      `_failureDetails` (TheiaService.sys.mjs:1099, confirmed) -- the diagnostic rows that identified
      the actual problem (`["Preference", "powerbrowser.sidecar.nodePath"]`,
      `["Preference status", "unset, and no node was found on PATH"]`) are gone from the diagnostics
      layer for the rest of the session, replaced on the next paint by a generic
      `USER_MESSAGE.couldNotStart` plus a raw spawn-error string; (2) re-enters `_restart()` →
      `_spawnAndGate()` (TheiaService.sys.mjs:532 onward, confirmed) with `this._nodePath` still null
      (nothing between the failed `_resolveSidecar()` call and this retry ever re-resolves it --
      `_resolveSidecar()` is only ever called once, from `start()`, which is permanently
      `_started`-guarded) and `this._configDir`/`this._stateFilePath` still unset, and with no quit
      observer registered (`PowerBrowserAPI.onQuitGranted` never reached, since `start()` returned
      before line 186 on this branch). `PowerBrowserAPI.spawnProcess` (confirmed,
      `PowerBrowserAPI.sys.mjs:193-201`) passes `command: this._nodePath` straight into
      `Subprocess.call`, which today rejects on a null command -- so no process currently escapes,
      but that is an accident of `_nodePath` being null on this specific branch, not a guard the code
      enforces, exactly as 01-REVIEW.md's CR-01 states. `deferred-items.md` item 7 and WINDOWS.md
      ledger 20 both record 2c/2d/2e as fully "fixed" / "RESOLVED" -- accurate for the specific
      mechanisms those plans targeted, but the ledger's own "fixed" disposition for 2d is not
      accurate against the phase goal's "works as an actual web browser" clause once the Retry button
      is included, since the identical unretryable-class re-entry the gate exists to prevent remains
      reachable by the single UI control the error screen offers.
    artifacts:
      - path: "powerbrowser/shell/powerbrowser.js"
        issue: "powerbrowserShowError (102-109) forwards `recoverable` to the sentinel only; it never disables/hides errorRetryButton. The click listener (135-137) is unconditional."
      - path: "powerbrowser/shell/TheiaService.sys.mjs"
        issue: "retry() (955-958) contains no recoverable/last-classification check before calling _hideError()/_restart(); _hideError() (1096-1103) unconditionally nulls _failureDetails, destroying the diagnostics for the failure that led to the error state on every Retry click regardless of outcome."
      - path: "powerbrowser/shell/powerbrowser.xhtml"
        issue: "Line 39: #powerbrowser-error-retry carries no disabled/hidden attribute and is not conditionally rendered."
    missing:
      - "Gate the Retry affordance itself on the classification, not only the background timer -- e.g. powerbrowserShowError sets errorRetryButton.hidden = !recoverable (Option A in 01-REVIEW.md's CR-01), plus a defence-in-depth guard in retry() itself (e.g. an _errorRecoverable field set alongside _errorShown in _showError, checked at the top of retry())."
      - "Reword USER_MESSAGE.nodeMissing (and any other unrecoverable-class message) so its stated next step matches whatever affordance actually remains on screen once Retry is hidden for that class."
      - "A registered scenario in scripts/verify-shell-error-contract.mjs that drives the unrecoverable branch and then calls sandbox.powerbrowserRetry(), asserting state.spawnsAfterError === 0 across that call -- the same instrument 01-12 built, applied to the user-driven path instead of only the timer-driven one. 01-REVIEW.md's CR-01 names this exact scenario and instrument."
      - "Update WINDOWS.md ledger 20's disposition and deferred-items.md item 7 once this is actually closed -- both currently read 'fixed'/'RESOLVED' for the class this gap reopens under a different route."
deferred:
  - truth: "GUI-02 — open and browse web pages inside Theia as URL-addressable tabs"
    addressed_in: "v2 (not a numbered roadmap phase yet)"
    evidence: "ROADMAP.md / REQUIREMENTS.md: 'GUI-02 deferred to v2 on 2026-08-30 at the D-22 gate' — pre-existing deferral, unaffected by this pass"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15) — unchanged by 01-11/01-12."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks only prove inertness and flag-gating, not the visible-restyle claim. Still open (ledger item 16) — unchanged by 01-11/01-12."
  - test: "The two tier-3 regression confirmations named by WINDOWS.md ledger item 19 (shell03-budget-exhausted-error, shell03-auto-dismiss-on-selfheal) re-run against a repackaged binary"
    expected: "Neither check moves, since neither clicks Retry -- the run exists to prove that, per 01-11-SUMMARY.md's own deferral"
    why_human: "Requires a ./mach build faster repackage and a running binary; explicitly deferred to the phase gate by 01-11-SUMMARY.md itself, not run by this verification pass"
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T21:15:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 01-11 and 01-12, and against a fresh code review
(01-REVIEW.md) run on the resulting tree

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate, 01-06) — not scored here,
not orphaned.

## Disposition of the Prior Gaps (independently re-verified against the live tree, not taken from either SUMMARY)

### 2c — a failing Retry permanently disabling the error layer — CLOSED

Prior finding: `powerbrowserRetry` hid the DOM directly and `retry()` never cleared `_errorShown`, so
the first failing Retry left the error layer permanently blank for the session.

Independently re-verified by direct reading:

- `powerbrowser/shell/TheiaService.sys.mjs:955-958` — `async retry() { this._hideError();
  await this._restart(); }`. `_hideError()` clears `_errorShown` before `_restart()` runs.
- `powerbrowser/shell/powerbrowser.js:131-133` — `powerbrowserRetry`'s only statement is the guarded
  `TheiaService.retry()` call; grep confirms zero occurrences of `errorElement.style.display` inside
  its body.
- `scripts/verify-platform.sh --quick` → `shell-error-contract: PASS` (scenario
  `two-consecutive-failing-retries-repaint` exercises exactly this: two consecutive failing retries,
  each repainting) and `shell-error-contract-self-test: PASS` (6/6 rows, including a planted fault
  that removes `_hideError()`'s guard-clear specifically).

**Verdict: VERIFIED — genuinely closed**, for the mechanism 2c named (a failing Retry that DOES
re-enter `_restart()`).

### 2e — quit observer / state-file path ordering — CLOSED for the branch it named

Prior finding: `PowerBrowserAPI.onQuitGranted` and `_stateFilePath` were registered after the
settings-folder `ensureDirectory` try/catch, a recoverable-classified branch that can still return
and leave a probe-driven spawn unobserved by quit.

Independently re-verified by direct reading:

- `TheiaService.sys.mjs:153` (`_configDir`), `:170` (`_stateFilePath`), `:186` (`onQuitGranted`) all
  precede the settings-folder try/catch at `:196-211` — confirmed by line-order read, not grep count
  alone.
- `stop()` (`:253-293`) retains and detaches `_quitObserverOff` after the process is signalled and
  the state file removed.
- `scripts/verify-platform.sh --quick` → `start-path-recovery: PASS`, `start-path-recovery-self-test:
  PASS` (18/18 rows, including derivation E's tree-derived early-return window).

**Verdict: VERIFIED for the settings-folder branch this truth named.** See the Gaps section below,
however: the SAME underlying guarantee ("no path that can reach a spawn lacks a quit observer") is
still violated by a different, user-driven route — the `_resolveSidecar()` failure branch, which
returns even earlier than the settings-folder branch (line 150, before line 153) by design, and is
reachable via a Retry click regardless of that design intent (see the CR-01 gap below, consequence
3 — "latent backend leak", currently inert only because `_nodePath` is null on that branch, not
because anything gates it).

## New Finding This Pass — CR-01, independently re-derived from source (not new; a related route through the same defect class 2d/2e were opened to close)

A code review run against the post-01-11/01-12 tree (`01-REVIEW.md`) reports one Critical finding.
Per the verification brief, it was independently re-derived from source before being accepted, not
taken on the review's narrative:

**`recoverable: false` gates the background probe timer but not the Retry button**, so the one class
the supervisor's own D-113 comment calls "unrecoverable by construction ... with no retry at all" is
still re-entered — by the user, with the same unassigned state (`_configDir`, `_stateFilePath`, no
quit observer) the settings-folder fix (2e) was written to prevent on its own branch.

Confirmed line-by-line (see the `gaps:` frontmatter entry above for the full derivation):

- `powerbrowserShowError` (`powerbrowser.js:102-109`) forwards `recoverable` to a `dump()` sentinel
  only; it never touches `errorRetryButton`.
- `powerbrowser.xhtml:39` — the button carries no `disabled`/`hidden` attribute; `powerbrowser.css`
  has no rule that hides or disables it.
- `errorRetryButton`'s click listener (`powerbrowser.js:135-137`) is unconditional.
- `TheiaService.retry()` (`:955-958`) contains no check of the classification anywhere in its body.
- `_hideError()` (`:1096-1103`) unconditionally nulls `_failureDetails` — every Retry click, whether
  the classification was recoverable or not, destroys the diagnostic rows that identified the actual
  failure.

**This means truth 2d, as stated in the phase goal's own terms ("an unrecoverable classification
gets no retry"), is not fully closed.** 01-12's fix is real and correctly closes the TIMER-driven
half (confirmed: `_showError` at `:1079-1092` reads `if (recoverable) { this._startRecoveryProbe();
}`, and the registered `unrecoverable-classification-starts-no-probe` /
`recoverable-classification-starts-the-probe` scenario pair proves the gate discriminates rather
than failing everything). But the USER-driven half — the single affordance the error screen actually
offers — was not addressed by either 01-11 or 01-12, and is not exercised by any registered check:
`verify-shell-error-contract.mjs`'s unrecoverable scenario asserts `state.spawnsAfterError === 0`
without ever calling `sandbox.powerbrowserRetry()`.

WINDOWS.md ledger 20 and `deferred-items.md` item 7 both record this class "fixed"/"RESOLVED" — an
accurate account of the specific mechanisms 01-11 and 01-12 targeted, but not of the phase goal's
"works as an actual web browser" clause once the Retry button is in scope, since the defect class
(an unrecoverable classification failing to actually prevent re-entry into the failed launch path)
remains live via that route.

None of this is a stub or a debt marker (`grep -E "TBD|FIXME|XXX"` over the four touched files: zero
matches) — it is a control-flow gap in code that is present, wired, and covered by passing checks
that do not happen to exercise this specific path, the same class of gap the last two verification
passes have each found in a different corner of the same supervisor.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` in `--quick` |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests (happy path) | ✓ VERIFIED | Regression-checked; unaffected by 01-11/01-12 |
| 2b | The backend supervisor's state-gating conflation and the three named unguarded throw sites are closed | ✓ VERIFIED | Regression-checked from the prior pass; unaffected by 01-11/01-12 |
| 2c | A failed Retry does not permanently disable the error layer for the rest of the session | ✓ VERIFIED (now closed) | See "Disposition" above — `retry()` calls `_hideError()` before `_restart()`, confirmed by direct read and `shell-error-contract: PASS` |
| 2d | An unrecoverable failure classification actually prevents re-entry into the failed launch path (timer AND user-driven) | ✗ FAILED | CR-01 — timer half closed, Retry-button half open; confirmed by direct reading of `powerbrowser.js:102-137` and `TheiaService.sys.mjs:955-958,1079-1103` |
| 2e | The quit observer and state-file path are established before any path that can spawn a backend | ✓ VERIFIED (for the branch named) | See "Disposition" above; residual risk on the `_resolveSidecar`-failure branch is the same CR-01 gap, currently inert (spawn with a null command rejects today) |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green (`gui04-registry-shape` + self-test PASS in `--quick`); perceptual half still open (ledger 15), unchanged |
| 4 | SC4 — Runtime restyle via customize bridge | ◐ PARTIAL | Automated half green; perceptual half still open (ledger 16), unchanged |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | Regression-checked; `branding-preflight` + self-test PASS in `--quick` |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; `process.exit(78)` sites untouched by 01-11/01-12 |
| 7 | Residual brand strings can never re-enter — registered scan gate fails on an unclaimed occurrence | ✓ VERIFIED | Regression-checked; `scan-brand-residue`/self-test PASS in `--quick` |

**Score:** 8/11 truths verified (6 regression-checked + 2 newly closed), 1 failed (2d, reopened by a
different route than the one it was previously failed on), 2 partial (human verification open,
unchanged).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/shell/TheiaService.sys.mjs` | Backend supervisor with correct one-time init gating, correct probe gating, quit-observer ordering, AND a Retry path that respects the classification it was given | ⚠️ PARTIALLY DEFECTIVE | Init gating, probe-timer gating and quit-observer ordering are all now correct (confirmed); `retry()` itself still contains no classification check (CR-01) |
| `powerbrowser/shell/powerbrowser.js` | Entry point with a terminal handler on every fire-and-forget supervisor call, no DOM write bypassing the supervisor, and a Retry affordance that reflects recoverability | ⚠️ PARTIALLY DEFECTIVE | Terminal handlers confirmed correct (01-10); DOM-bypass fixed (01-11, confirmed); `powerbrowserShowError` still never gates `errorRetryButton` on `recoverable` (CR-01) |
| `scripts/verify-shell-error-contract.mjs` | Behavioral contract checker for the error layer and probe gate | ✓ VERIFIED (as scoped) | 6/6 self-test rows PASS; does not yet drive a Retry click on the unrecoverable branch — the gap the missing scenario above names |
| `scripts/verify-start-path-recovery.mjs` | Recovery contract checker: static + log + self-test | ✓ VERIFIED | 18/18 self-test rows PASS |
| `scripts/verify-platform.sh` | Single registry, `--quick` green | ✓ VERIFIED | 24/24 PASS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowserRetry()` | `TheiaService._hideError()` | `retry()` calls it first | ✓ WIRED | Confirmed at TheiaService.sys.mjs:955-957, powerbrowser.js:131-133 |
| `_showError`'s recovery-probe TIMER start | the `recoverable` classification | `if (recoverable) { this._startRecoveryProbe(); }` | ✓ WIRED | TheiaService.sys.mjs:1088-1090, confirmed; exercised by registered scenario pair |
| `start()`'s early-returning settings-folder branch | `PowerBrowserAPI.onQuitGranted` registration | registration ordering | ✓ WIRED | onQuitGranted (186) precedes the settings-folder try/catch (196-211) |
| `powerbrowserShowError`'s `recoverable` argument | `errorRetryButton`'s enabled/visible state | (none) | ✗ NOT WIRED | powerbrowser.js:102-109 forwards `recoverable` to a `dump()` sentinel only; the button is never disabled or hidden (CR-01) |
| `TheiaService.retry()` | any classification/`_errorRecoverable` check | (none) | ✗ NOT WIRED | TheiaService.sys.mjs:955-958 has no gate; every Retry click re-enters `_restart()` unconditionally (CR-01) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (24 checks) | `scripts/verify-platform.sh --quick` | PASS, 24/24 | ✓ PASS |
| Two consecutive failing retries repaint the error layer | `scripts/verify-platform.sh --only shell-error-contract` (scenario `two-consecutive-failing-retries-repaint`) | PASS | ✓ PASS |
| Unrecoverable classification drives no timer-based spawn | `scripts/verify-platform.sh --only shell-error-contract` (scenario `unrecoverable-classification-starts-no-probe`) | PASS | ✓ PASS |
| Recoverable classification still auto-recovers | `scripts/verify-platform.sh --only shell-error-contract` (scenario `recoverable-classification-starts-the-probe`) | PASS | ✓ PASS |
| Retry clicked on an unrecoverable classification drives no spawn | (no registered check exists) | not exercised by any registered check | ? SKIP — see Gaps; this is the exact missing scenario CR-01 names |
| Quit observer registered before any spawnable path (including `_resolveSidecar` failure) | (no registered check exists) | not exercised for this specific branch | ? SKIP — inert today only because `_nodePath` is null on this branch (not a guard) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-04 | Renamed tree builds and boots under branding | ✗ NOT SATISFIED | Happy-path smoke tests pass; 2c and the settings-folder half of 2e are genuinely closed; the "unrecoverable classification actually prevents retry" guarantee (2d) is still open via the Retry button, one of the two most obvious user actions on the error screen |
| GUI-01 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-03 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Unchanged, regression-checked |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Unchanged, regression-checked |

No orphaned requirements: all 8 phase-1 requirement IDs appear in at least one of the 12 plans'
`requirements` frontmatter. GUI-02 correctly absent (deferred to v2).

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX` debt markers in any of the four touched files. All findings this pass are
control-flow defects in present, wired, passing-check-covered code, not stubs.

Additional findings from 01-REVIEW.md, confirmed present but classified Warning/Info by the review
and not elevated to blocking here (they concern the *robustness of the checks themselves* or
lower-probability edge cases, not the three named truths):

| File | Finding | Severity | Impact |
|------|---------|----------|--------|
| `scripts/verify-start-path-recovery.mjs:446-464` | WR-01: visibility-writer derivation matches one syntactic form (`.style.display =`) only; a working mutant using `document.getElementById(...)` directly stays green | Warning | Verification-gate weakness, not a live defect in shipped code today |
| `powerbrowser.js:111-114` | WR-02: `powerbrowserHideError` emits no deck-state dump, so nothing observes the layer actually became hidden; a working mutant that shows instead of hides stays green | Warning | Verification-gate weakness |
| `TheiaService.sys.mjs:1079-1093` | WR-03: `_showError` latches `_errorShown` and starts the probe before the DOM call, which can throw; a throwing paint leaves the guard set with nothing painted | Warning | Low-probability (requires `defaultView` null or a `powerbrowserShowError` throw) |
| `TheiaService.sys.mjs:186,289-292` | WR-04: `stop()`'s `_quitObserverOff()` call is outside any try/catch; `Services.obs.removeObserver` throws if not registered | Warning | Low-probability re-entrancy edge case |
| `TheiaService.sys.mjs:1023-1032` | WR-05: a rejected `_recoveryProbeLoop` leaves `_recoveryProbeActive` permanently true, silently disabling future auto-recovery | Warning | State-transition invariant, not exercised by any registered check |

These are recorded for follow-up but do not change this pass's status determination — none of them
falsifies a currently-scored truth, per the review's own severity classification, which this
verification independently agrees with on direct reading.

## Human Verification Required

### 1. GUI-01 — browser-window toggle, full perceptual walkthrough

**Test:** Launch the app; open a browser window; confirm the address bar takes keyboard focus and
navigates a typed URL; confirm an in-window modal appears; close the window and confirm the shell
returns with the app still running.
**Expected:** All five steps succeed exactly as a stock browser window would behave.
**Why human:** BiDi cannot see chrome contexts on Linux; chrome-context Marionette is
platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15), unchanged by 01-11/01-12.

### 2. GUI-03 — customize bridge, visible restyle

**Test:** With the dev flag on, edit `customize.css` and confirm the shell visibly restyles
without a rebuild; delete the file and confirm the shell reverts.
**Expected:** The runtime CSS layer applies and un-applies visibly.
**Why human:** Perceptual outcome; automated checks only prove inertness and flag-gating, not the
visible effect. Still open (ledger item 16), unchanged by 01-11/01-12.

### 3. Tier-3 regression re-confirmation (WINDOWS.md ledger item 19)

**Test:** Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
repackaged binary (`./mach build faster` chrome-JS repackage, minutes not the full ~47–54 min build).
**Expected:** Neither check moves, since neither clicks Retry.
**Why human:** Requires a running repackaged binary; explicitly deferred to the phase gate by
01-11-SUMMARY.md, not run by this static verification pass.

## Gaps Summary

Two of the three gaps the prior verification pass recorded FAILED are now genuinely closed, each
independently re-verified against the live source rather than taken from either SUMMARY's narrative:

1. **2c** — a failing Retry no longer permanently disables the error layer. `retry()` calls
   `_hideError()` before `_restart()`; the chrome bootstrap no longer writes the DOM directly.
   Confirmed by direct reading and by `shell-error-contract: PASS`.
2. **2e** — the quit observer and `_stateFilePath` now precede the settings-folder branch this truth
   named. Confirmed by direct reading and by `start-path-recovery: PASS`.

The third, **2d**, is only PARTIALLY closed. 01-12's fix is real and correct for the mechanism it
targeted — the background recovery-probe TIMER now honours the `recoverable` classification
`_showError` receives, proven by a genuine two-directional gate (a registered positive control that
would fail if the fix "stopped probing everywhere"). But a code review run against the resulting
tree (01-REVIEW.md's CR-01), independently re-derived from source in this pass rather than trusted
from its narrative, found that the classification never reaches the Retry button: `errorRetryButton`
is unconditionally enabled and its click handler unconditionally re-enters `_restart()`, with no
check anywhere in `retry()`'s body. On the exact class the supervisor's own D-113 comment calls
"unrecoverable by construction ... with no retry at all," the user is looking at a message that
explicitly tells them to click Retry (`USER_MESSAGE.nodeMissing`), and doing so both destroys the
diagnostic rows that identified the real problem (`_hideError()` unconditionally nulls
`_failureDetails`) and re-attempts a spawn against state that branch never assigned — currently inert
only because the resulting `spawnProcess` call has a null command, not because anything in the code
prevents it.

Since 2d, as the phase goal frames it ("works as an actual web browser," which includes not leaving
the user stuck behind a dead-end affordance), is not fully closed, and since this is reachable by the
single most obvious action on the error screen, this pass's overall status remains **gaps_found**.
This is not a new class of defect — it is the SAME class 01-09/01-10/01-11/01-12 have each closed one
route of — reached by a fourth route (the Retry button) that has not yet been named a distinct plan.

Neither WINDOWS.md ledger 20 nor `deferred-items.md` item 7's "fixed"/"RESOLVED" disposition should
be read as covering this route; both were accurate for the mechanisms their respective plans
targeted at the time they were written.

Two success criteria (3 and 4) still have their perceptual halves un-performed, carried forward
unchanged from the prior pass and from `WINDOWS.md` (ledger items 15, 16) — not newly discovered,
not silently dropped. WINDOWS.md ledger item 19's tier-3 regression re-confirmation also remains
unrun, as 01-11-SUMMARY.md itself deferred it to the phase gate.

---

_Verified: 2026-08-31T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
