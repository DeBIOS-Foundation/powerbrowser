---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T05:10:00Z
status: gaps_found
score: 6/8 must-haves verified (2 partial — automated half only, human halves open; 0 failed of the original 2; 1 new gap discovered this pass)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/7
  gaps_closed:
    - "Every branding value in the tree is a hand-written literal, and the space-less identifier form never leaks into a display string — the About dialog rendered the IDENTIFIER form (theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:34)"
    - "scripts/scan-brand-residue.mjs is registered in the verify script set so residual brand strings can never re-enter — the plain, un-flagged registered gate could not fail on an unclaimed occurrence"
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "The backend supervisor (TheiaService.sys.mjs) recovers from a transient health-gate failure without leaving the user on a permanent, unrecoverable loading screen with a healthy backend and no error affordance — a precondition of the phase goal 'boots, and works as an actual web browser'"
    status: failed
    reason: >
      Newly discovered this verification pass, independently confirmed by reading
      powerbrowser/shell/TheiaService.sys.mjs directly (not merely cited from 01-REVIEW.md's
      CR-01/CR-02, which were produced against the identical tree and independently found the
      same defect). `_spawnAndGate(firstSpawn)` assigns `this._port = ready.port` at line 596,
      immediately after the readiness sentinel parses and BEFORE `_pollUntilHealthy` runs at
      line 623 and can still fail. `_restart()` derives `firstSpawn` for every retry as
      `this._port === null` (line 760). So a spawn that announces readiness and then fails the
      health probe (transient token-gate race, slow start, timeout) leaves `this._port` pinned
      to a real port while no cookie was set and `_swap()` was never called. Every subsequent
      attempt in that browser session — including the very next retry inside the same
      `_restart()` call, and any later background-recovery-probe respawn — computes
      `firstSpawn === false` and takes the `else` branch at line 654, which only logs
      "Recovered on port ..." and skips the cookie/swap/health-loop block entirely (line
      641-656). `_hideError()` then runs, hiding an error layer that was never shown, leaving
      `#powerbrowser-loading` visible forever — it is hidden only by `powerbrowserSwapToUrl`
      inside `_swap()` (powerbrowser.js:75), which this path never reaches. No user action is
      required to reach this state, only one transient health-probe failure followed by a
      successful respawn. Compounding this (01-REVIEW.md's CR-02, also independently confirmed
      by direct reading): `powerbrowser.js:231` calls `TheiaService.start(browserElement);`
      with no `await` and no `.catch()`, and three reachable throws inside the start path
      (`PowerBrowserAPI.ensureDirectory` at TheiaService.sys.mjs:145, `signalBarePid` reached
      from `_reapLeftover()` at :165, and `PowerBrowserAPI.setSessionCookie` at :642) are not
      wrapped in `try`/`catch`, so any of the three becomes an unhandled promise rejection in
      chrome with the identical user-visible outcome — a dead loading screen, no message, no
      Retry, no Details. Neither defect is addressed by plan 01-08 (out of its scope, which was
      limited to the two must-haves 01-VERIFICATION.md's prior pass recorded FAILED) and neither
      is recorded as deferred to a later phase in ROADMAP.md or deferred-items.md. No registered
      check exercises this path: `verify-platform.sh --quick` and the full smoke tests only
      exercise the happy path where the first health probe succeeds.
    artifacts:
      - path: "powerbrowser/shell/TheiaService.sys.mjs"
        issue: "Lines 596-597 pin this._port before the health gate at line 623 can still fail; line 641's firstSpawn branch (cookie + _swap() + _healthLoop()) is then permanently skipped for the rest of the browser session on any recoverable respawn. Lines 145, 165, 642 are unguarded throw sites reachable from an un-awaited, uncaught entry point."
      - path: "powerbrowser/shell/powerbrowser.js"
        issue: "Line 231 calls TheiaService.start(browserElement) with no await and no .catch(); any of the three unguarded throws above becomes an unhandled rejection with no user-facing error."
    missing:
      - "Key the firstSpawn cookie/swap/health-loop block (TheiaService.sys.mjs:641) on this._swapped rather than firstSpawn/this._port === null, so it fires exactly once — on the spawn that actually passes the health gate — regardless of how many prior attempts pinned a port without completing it"
      - "Add a terminal .catch() to TheiaService.start(browserElement) at powerbrowser.js:231 that shows a static, product-named, USER_MESSAGE-table error with a Retry/Details affordance instead of leaving an unhandled rejection"
      - "Wrap the three unguarded throw sites (TheiaService.sys.mjs:145, :165, :642) in try/catch returning the same classified-result shape every other failure in _spawnAndGate returns"
      - "Add a registered check with a planted fault: force _pollUntilHealthy to fail once, then require the shell still swaps (assert POWERBROWSER_SHELL_SWAP appears and POWERBROWSER_DECK_STATE reports loading: \"none\") — both sentinels already exist (powerbrowser.js:73, :46-54)"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger item 7). No human was present for 01-07 or 01-08, so none of these five steps has been performed. Automated coverage (gui01-single-shell-window, gui01-browser-close-does-not-quit, gui01-command-registered, gui04-registry-shape) is green and unaffected. Ledger item 15, still open."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks (verify-customize-inert, verify-dev-flag-off) only prove inertness of an absent stylesheet and flag-gating of the privileged JS binding, neither exercises the visible-restyle claim. No human was present for 01-07 or 01-08. Ledger item 16, still open."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T05:10:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap closure (plan 01-08)

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate, 01-06) — not scored here,
not orphaned.

## Disposition of Prior Gaps (both closed, independently re-verified against the live tree)

### 1. Residual-brand gate could not fail — CLOSED

Prior finding: the registered, un-flagged `node scripts/scan-brand-residue.mjs` (the invocation
`verify-platform.sh`, `rebase-upstream.sh`, and CI all use) evaluated exit status from
`offenses.length` alone and never reached condition 4 (the unclaimed-probe walk) on the
post-rename branch, and `--reconcile`'s failures were gated behind a flag no registered caller
passed.

Independently re-verified, not merely re-run:
- Read `reconcile()` directly: the `unclaimedProbes` walk (lines 437-450) now sits **above** the
  `if (postRename)` split (line 451) — reachable on both branches.
- Read `main()` directly: `rec = reconcile(...)` is computed unconditionally (line 862, not gated
  by `wantReconcile`); `rec.failures` are printed unconditionally (line 875); `gateFailures(offenses,
  rec, ...)` (lines 534-543, 882) is the single, unconditional exit-code source.
- Built an independent fixture from scratch (not the shipped `--self-test`'s own fixture) using the
  exported `scan`/`reconcile`/`gateFailures` functions directly: a post-rename inventory with one
  claimed frozen row and one unclaimed occurrence planted in a second file. Result: `postRename:
  true`, `gate: ["1 reconciliation failure(s)"]`, `WOULD EXIT: 1` — the plain, un-flagged path fails
  on a fault no inventory row claims.
- `node scripts/scan-brand-residue.mjs` → exit 0; `node scripts/scan-brand-residue.mjs --reconcile`
  → exit 0 — the two modes now agree on the identical tree (the prior disagreement is gone).
- `node scripts/scan-brand-residue.mjs --self-test` → exit 0, 7 PASS lines including the new
  post-rename plant-and-require-red case with a clean control.
- `.planning/WINDOWS.md` item 6 is `fixed`, with a resolution naming both facts that changed.

**Verdict: VERIFIED.**

### 2. About dialog rendered the identifier form — CLOSED

Prior finding: `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:34` rendered
`<h3>PowerBrowser</h3>` (no space) as user-facing text, and `verify-branding.mjs`'s `checkAbout()`
lacked the assertion `checkWelcome()` carried, so it could not catch the leak.

Independently re-verified:
- Read the file directly: line 34 now reads `<h3>Power Browser</h3>` (two words, with the space).
  Nothing else on the surface changed (mark, container class, version line, repo anchor all intact).
- Read `verify-branding.mjs` directly: `checkAbout()` (line 166) now calls the same
  `assertDisplayForm()` (defined lines 90-103) that `checkWelcome()` calls (line 135); the expected
  literal (`DISPLAY_FORM`) and the identifier-leak regex (`IDENTIFIER_FORM`) are read from
  `inventory/brand-tokens.json`'s `brand_display_expectations` at lines 55-57, not hand-kept as
  string constants in the checker.
- Read `verify-branding-preflight.mjs` directly: the display-surface set is now built by
  `readdirSync` over `theia/extensions/branding/src/browser/` at check time (lines 371-390), with a
  distinct failure message if that walk yields zero files (line 386) — not a hand-appended path
  list.
- `node scripts/verify-branding-preflight.mjs --self-test` → exit 0, including a case that plants
  the identifier form in the About dialog's fixture copy and requires rejection by the derived walk.
- `node scripts/verify-branding-preflight.mjs` → exit 0.
- `scripts/verify-platform.sh --quick` → exit 0, 20/20 PASS including `branding-preflight` and
  `branding-preflight-self-test`.
- WINDOWS.md item 17 (the hand-kept surface list that let this bug class through in the first
  place) is also `fixed`, and its resolution correctly names the residual it does NOT close — a
  display surface authored outside the enumerated directory rests on code review (recorded as a
  backstop truth, not silently absorbed into a closed gap).

**Verdict: VERIFIED.**

## New Finding This Pass (not part of 01-08's scope, discovered during re-verification)

A code re-review committed at `6ef5c04` (after 01-08, against the identical post-gap-closure
tree) reports two new critical findings — a `TheiaService.sys.mjs` state bug (CR-01) and three
unhandled-rejection paths with the identical user-visible outcome (CR-02). Per the verification
brief, these are weighed independently rather than inherited or ignored. I read the source
directly rather than trusting the review narrative:

- `this._port = ready.port` (TheiaService.sys.mjs:596) executes before `_pollUntilHealthy`
  (line 623), which can still return `false`.
- `_restart()`'s retry loop derives `firstSpawn` as `this._port === null` (line 760) on every
  attempt, including the very next retry inside the same `_restart()` call.
- The one-time cookie/`_swap()`/`_healthLoop()` block (lines 641-656) is gated on `firstSpawn`,
  not on whether a spawn ever actually passed the health gate.
- Net effect, confirmed by tracing the actual control flow rather than assuming the review's
  narrative: a transient health-probe failure (token-gate race, slow start, timeout) followed by
  any successful respawn — in the same `_restart()` call or via the background recovery probe —
  permanently skips the cookie/swap/health-loop block for the rest of the browser session. The
  loading screen is hidden only inside `_swap()` (via `powerbrowser.js:75`'s
  `powerbrowserSwapToUrl`), so the user is left on `#powerbrowser-loading` forever, with a healthy
  backend, no error text, no Retry, no Details.
- Confirmed the compounding CR-02 by direct read: `powerbrowser.js:231` is
  `TheiaService.start(browserElement);` with no `await`, no `.catch()`. Three throw sites inside
  the start path are unguarded (`ensureDirectory` at :145, `signalBarePid` via `_reapLeftover()` at
  :165, `setSessionCookie` at :642) — any of the three becomes an unhandled promise rejection in
  chrome with the identical dead-loading-screen outcome.

This falsifies the phase's own goal wording — "boots, and works as an actual web browser" — under
a realistic, no-user-action-required condition that the existing smoke tests do not exercise (they
only cover the happy path where the first health probe succeeds). It is not addressed by plan
01-08 (out of that plan's stated scope, which was limited to the two must-haves the prior
verification pass recorded FAILED) and is not recorded as deferred to a later phase in
ROADMAP.md or `deferred-items.md`. Phase 2 onward concern the configuration-manifest generator,
not backend supervision — nothing later in the roadmap covers this. Filed as a gap (see
frontmatter) rather than dropped.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Committed token-classification inventory exists; residual scan demonstrably red on the pre-rename tree | ✓ VERIFIED | Unchanged from prior pass; regression-checked, `inventory/brand-tokens.json` intact, `01-SCAN-RED-REPORT.md` still committed |
| 2 | SC2 — Repo builds from a script-refetched `upstream/` and launches a Power-Browser-branded app on Linux passing the smoke tests (happy path) | ✓ VERIFIED | Regression-checked: `objdir/dist/bin/powerbrowser` still present (2.4MB); fetch/apply self-tests unaffected by 01-08 (no files touched) |
| 2b | The backend supervisor recovers from a transient health-gate failure without a permanent, unrecoverable loading screen | ✗ FAILED | New finding — see above and Gaps |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green (`gui04-registry-shape` + self-test PASS in `--quick`); perceptual half still open (ledger 15) |
| 4 | SC4 — Runtime restyle via customize bridge | ◐ PARTIAL | Automated half green (`verify-customize-inert`, `verify-dev-flag-off` PASS); perceptual half still open (ledger 16) |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal, no identifier-form leak into display text | ✓ VERIFIED (now closed) | About dialog fix independently confirmed above |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked: `process.exit(78)` still present at the three cited sites in `token-gate-backend-contribution.ts`; file untouched by 01-08 |
| 7 | Residual brand strings can never re-enter — the registered scan gate fails on an unclaimed occurrence | ✓ VERIFIED (now closed) | Independently reproduced above with a from-scratch fixture, not the shipped self-test alone |

**Score:** 6/8 fully verified (5 carried/regression-checked + 2 newly closed... counted as one row each above; see frontmatter for the exact tally), 2 partial (human verification open), 1 new failure

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/scan-brand-residue.mjs` | Residual-brand gate, condition 4 reachable on both branches, single exit source | ✓ VERIFIED | `gateFailures()` single-sourced; condition 4 above the branch split; confirmed by independent from-scratch fixture, not just the self-test |
| `inventory/brand-tokens.json` | Reconciled census | ✓ VERIFIED | `--reconcile` exits 0; four rows corrected with named justification (spot-checked against SUMMARY's table) |
| `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` | Hand-written display literal | ✓ VERIFIED | Line 34: `<h3>Power Browser</h3>`, read directly |
| `scripts/verify-branding-preflight.mjs` | Tree-derived display-surface set | ✓ VERIFIED | `readdirSync` walk at lines 371-390, zero-file guard present |
| `scripts/verify-branding.mjs` | Shared display-form assertion | ✓ VERIFIED | `assertDisplayForm()` called by both `checkWelcome()` and `checkAbout()` |
| `powerbrowser/shell/TheiaService.sys.mjs` | Backend supervisor with correct one-time init gating | ✗ DEFECTIVE | `firstSpawn`/`this._port === null` conflates "port ever pinned" with "health gate ever passed" — see Gaps |
| `powerbrowser/shell/powerbrowser.js` | Entry point with a terminal handler on the supervisor's start promise | ✗ DEFECTIVE | Line 231: no `await`, no `.catch()` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/scan-brand-residue.mjs`'s un-flagged path | `gateFailures()` | single exit source | ✓ WIRED | Confirmed by direct read and independent fixture |
| `verify-branding.mjs`'s `checkAbout()` | `assertDisplayForm()` | shared assertion call | ✓ WIRED | Line 166 |
| `verify-branding-preflight.mjs` | `theia/extensions/branding/src/browser/` | `readdirSync` at check time | ✓ WIRED | Lines 371-390 |
| `powerbrowser.js:231` | `TheiaService.start()`'s rejection path | `.catch()` handler | ✗ NOT WIRED | No `.catch()`; three unguarded throws inside the start path become unhandled rejections (CR-02) |
| `_restart()`'s retry loop | the one-time cookie/swap/health-loop block | `firstSpawn` gate | ✗ MISWIRED | Gated on `this._port === null` (pinned at the readiness sentinel) rather than on whether the health gate was ever actually passed (CR-01) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Residual-brand scan agrees across modes | `node scripts/scan-brand-residue.mjs` / `--reconcile` | both exit 0 | ✓ PASS |
| Residual-brand gate fails on an independently-built unclaimed fixture | custom `scan`/`reconcile`/`gateFailures` invocation (not the shipped self-test) | `gate: ["1 reconciliation failure(s)"]`, would exit 1 | ✓ PASS |
| Scanner's own self-test | `node scripts/scan-brand-residue.mjs --self-test` | 7/7 PASS | ✓ PASS |
| Branding preflight self-test | `node scripts/verify-branding-preflight.mjs --self-test` | PASS, 3 planted faults rejected | ✓ PASS |
| Branding preflight | `node scripts/verify-branding-preflight.mjs` | PASS | ✓ PASS |
| Quick verification suite (20 checks) | `scripts/verify-platform.sh --quick` | PASS, 20/20 | ✓ PASS |
| Backend supervisor's health-gate-failure recovery path | (no registered check exists) | not exercised by any registered check | ? SKIP — see Gaps; the happy-path smoke tests do not cover this branch |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED (gate now real) | Prior regression hole closed and independently reproduced |
| MIG-04 | Renamed tree builds and boots under branding | ⚠️ SATISFIED ON THE HAPPY PATH ONLY | Smoke tests (happy path) still pass; the supervisor's transient-failure recovery path is defective (new gap) — "boots... as an actual web browser" is not robustly true |
| GUI-01 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-03 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Unchanged, regression-checked |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Unchanged, regression-checked |

No orphaned requirements: all 8 phase-1 requirement IDs are accounted for. GUI-02 correctly absent
(deferred to v2).

### Anti-Patterns Found

None. `grep -E "TBD|FIXME|XXX"` over the files 01-08 modified plus `TheiaService.sys.mjs` and
`powerbrowser.js` returned zero matches. The new gap is a logic/control-flow defect, not a debt
marker or stub.

## Human Verification Required

### 1. GUI-01 — browser-window toggle, full perceptual walkthrough

**Test:** Launch the app; open a browser window; confirm the address bar takes keyboard focus and
navigates a typed URL; confirm an in-window modal appears; close the window and confirm the shell
returns with the app still running.
**Expected:** All five steps succeed exactly as a stock browser window would behave.
**Why human:** BiDi cannot see chrome contexts on Linux; chrome-context Marionette is
platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15) — no human was present
for 01-07 or 01-08.

### 2. GUI-03 — customize bridge, visible restyle

**Test:** With the dev flag on, edit `customize.css` and confirm the shell visibly restyles
without a rebuild; delete the file and confirm the shell reverts.
**Expected:** The runtime CSS layer applies and un-applies visibly.
**Why human:** Perceptual outcome; automated checks only prove inertness and flag-gating, not the
visible effect. Still open (ledger item 16).

## Gaps Summary

The two must-have truths the prior verification pass recorded FAILED are now genuinely closed —
independently re-verified against the live tree by direct code reading and, for the residual-brand
gate, an independent from-scratch fixture rather than trusting the shipped self-test alone. Plan
01-08's own claims hold up.

A new gap was discovered during this pass, outside 01-08's scope: `TheiaService.sys.mjs`'s
one-time cookie/swap/health-loop initialization is gated on `this._port === null` (a port having
been pinned) rather than on whether a spawn ever actually passed the health gate. A transient
health-probe failure followed by any successful respawn permanently skips that block for the rest
of the browser session, leaving the user on a branded loading screen forever with a healthy
backend and no error affordance. This is compounded by three unguarded throw sites reachable from
an un-awaited, uncaught entry point (`powerbrowser.js:231`), producing the identical user-visible
outcome via an unhandled promise rejection. Both were confirmed by direct reading of the actual
control flow, not merely cited from the code review that also found them. No registered check
exercises the failing branch; the existing smoke tests only cover the happy path. This bears
directly on the phase's own goal wording — "boots, and works as an actual web browser" — because
the failure requires no user action, only one transient hiccup in backend startup.

Two success criteria (3 and 4) still have their perceptual halves un-performed, carried forward
unchanged from the prior pass and from `WINDOWS.md` (ledger items 15, 16) — not newly discovered,
not silently dropped.

---

_Verified: 2026-08-31T05:10:00Z_
_Verifier: Claude (gsd-verifier)_
