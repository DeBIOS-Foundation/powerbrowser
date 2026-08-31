---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T23:40:00Z
status: gaps_found
score: 8/12 must-haves verified (1 newly closed since last pass, 2 new blockers found in a code review run after the last pass, 2 partial — human halves still open)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/11
  gaps_closed:
    - "2d — the classification now gates BOTH the background probe timer (closed by 01-12) and the user-driven Retry route (closed by 01-13): TheiaService.retry() refuses to re-enter _restart() unless this._errorRecoverable === true, checked and returning BEFORE _hideError() so a refused click cannot null _failureDetails; powerbrowserShowError mirrors the classification onto errorRetryButton.hidden as presentation only. Independently confirmed by direct reading of TheiaService.sys.mjs:955-990,1131-1162 and powerbrowser.js:100-125, by running scripts/verify-platform.sh --quick myself (shell-error-contract: PASS naming all four scenarios including the new unrecoverable-classification-refuses-the-retry-click; shell-error-contract-self-test: PASS, 10/10 rows including the four new planted faults), and by cross-reading 01-REVIEW.md's independent re-derivation reaching the same conclusion."
  gaps_remaining: []
  regressions: []
  new_gaps_this_pass:
    - "CR-A — verify-shell-error-copy.mjs's rule (4) admits any `<identifier>.message` as a valid _showError() argument, not only a table-validated result object's `.message`. `err.message` (a raw exception string) matches and passes all three static analyzers. Found by 01-REVIEW.md's own CR-01 (a code review run after the last verification pass, committed at 51fda7c), independently confirmed here by direct reading of the regex."
    - "CR-B — the residual-brand scan invoked by scripts/rebase-upstream.sh after a patch replay scans `git ls-files` only, and `upstream/` is listed in `.gitignore`, so the invocation cannot see a single byte of the tree the rebase just replayed patches onto. CLAUDE.md's stated guarantee — 'an upstream rebase that reintroduces a brand token fails there rather than in a release' — does not hold for anything under `upstream/`. Found by 01-REVIEW.md's CR-02, independently confirmed here by reading scan-brand-residue.mjs's `scopeFiles()` and rebase-upstream.sh's invocation, and by the counts in 01-REVIEW.md's reproduction (109 tracked files scanned, 0 of them under `upstream/`)."
gaps:
  - truth: "No raw internal identifier, pref key, or exception message can reach the user-facing error layer — enforced by a check that cannot be defeated (CLAUDE.md: 'shell-error-copy-no-internals enforces this by pattern, not by a list of banned strings')."
    status: failed
    reason: >
      The enforcement mechanism itself has a hole, independently confirmed by direct reading, not
      taken from 01-REVIEW.md's narrative. `scripts/verify-shell-error-copy.mjs:183-190`'s rule (4)
      is the only gate between an arbitrary string and `#powerbrowser-error-message`:
      `/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\.message)$/`. The second alternative
      matches ANY identifier followed by `.message` — including `err.message`, the exact shape a
      caught exception takes. The comment beside it claims the checks above "prove" a `.message`
      argument is safe, but those checks only prove that `message:` PROPERTY-DECLARATION sites are
      `USER_MESSAGE` entries; they say nothing about the identifier bound at a `_showError` CALL
      site. `TheiaService.reportUnexpectedFailure` — confirmed the ONE terminal handler for every
      fire-and-forget promise root in the shell (four confirmed call sites: the bootstrap's start
      call, the Retry control's retry call, and the two long-lived loops) — is exactly the kind of
      site where a future edit could plausibly pass `err.message` instead of a `USER_MESSAGE` key,
      and today's gate would not catch it. The current shipped tree is clean on its merits (every
      real call site today passes a `USER_MESSAGE`-derived value, confirmed by grep), so there is no
      live user-facing leak right now — but CLAUDE.md's own Verification section makes check honesty
      itself a correctness property ("never assert on the absence of a log line unless you have
      proven that line is emitted by the code under test"), and a gate that structurally cannot fire
      on the shape it exists to catch is not verified, it is decorative.
    artifacts:
      - path: "scripts/verify-shell-error-copy.mjs"
        issue: "Rule (4)'s regex (lines 183-190) admits any `<identifier>.message`, not only a locally-derived result object whose own `message:` field this file has validated against the USER_MESSAGE table."
    missing:
      - "Bind rule (4) to the set of local bindings whose object literal or return value carries a table-validated `message:` field (derived, not a name allowlist), and reject every other `<identifier>.message` shape by name, quoting the raw identifier and explaining that `err.message` is a raw exception string."
      - "A --self-test row that plants `this._showError(err.message, ...)` in place of a `USER_MESSAGE.*` reference and requires the check to go red naming the raw-exception-string leak."
  - truth: "The residual-brand scan is a permanent gate that fails on a brand token reintroduced by an upstream rebase (CLAUDE.md: 'wired into rebase-upstream.sh and .github/workflows/rebase-upstream.yml, so an upstream rebase that reintroduces a brand token fails there rather than in a release')."
    status: failed
    reason: >
      Independently confirmed by direct reading, not taken from 01-REVIEW.md's narrative.
      `scan-brand-residue.mjs:255-269` (`scopeFiles`) builds its scanned file set from
      `execFileSync('git', ['ls-files', '-z'], ...)` with no parameter to add a filesystem root
      outside the git index. `.gitignore:20` is `upstream/`. `scripts/rebase-upstream.sh:108` calls
      `node scripts/scan-brand-residue.mjs` with no arguments after the patch replay. So the
      post-replay invocation scans exactly the same git-tracked files the pre-replay invocation (and
      the CI workflow's own step 1) already scanned — none of which is anything under `upstream/`,
      which is precisely the tree a rebase rewrites and the tree this specific invocation exists to
      re-check. This is the same failure class CLAUDE.md's own Verification rule 1 names: an
      assertion that is green by construction can never go red for its stated cause. Note this does
      NOT affect the scan's ordinary function over the repo's own tracked tree (SC1/SC5's evidence,
      re-confirmed this pass by `scan-brand-residue: PASS` and its self-test in `--quick`) — this
      gap is scoped specifically to the rebase-triggered re-scan of the untracked upstream checkout,
      the one CLAUDE.md names by name as this gate's reason for existing at that call site.
    artifacts:
      - path: "scripts/scan-brand-residue.mjs"
        issue: "scopeFiles() (lines 255-269) has no parameter to walk a filesystem root outside the git index; upstream/ is gitignored and therefore invisible to it."
      - path: "scripts/rebase-upstream.sh"
        issue: "Line 108 invokes scan-brand-residue.mjs with no extra-root argument, so the post-replay re-scan is a no-op relative to the tree the rebase just touched."
    missing:
      - "Add an `--extra-root <dir>` (or equivalent) mode to scan-brand-residue.mjs that walks the filesystem under a caller-supplied root outside the git index, applying the same scope.exclude/binary_extensions filters, and have rebase-upstream.sh pass $UPSTREAM_DIR to the post-replay invocation."
      - "A --self-test row that plants a brand token in a scratch directory passed as --extra-root and requires the scan to name that path."
deferred:
  - truth: "GUI-02 — open and browse web pages inside Theia as URL-addressable tabs"
    addressed_in: "v2 (not a numbered roadmap phase yet)"
    evidence: "ROADMAP.md / REQUIREMENTS.md: 'GUI-02 deferred to v2 on 2026-08-30 at the D-22 gate' — pre-existing deferral, unaffected by this pass"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15) — unchanged by 01-13."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks only prove inertness and flag-gating, not the visible-restyle claim. Still open (ledger item 16) — unchanged by 01-13."
  - test: "The two tier-3 regression confirmations named by WINDOWS.md ledger item 19 (shell03-budget-exhausted-error, shell03-auto-dismiss-on-selfheal) re-run against a repackaged binary"
    expected: "Neither check moves, since neither clicks Retry — the run exists to prove that, per 01-11-SUMMARY.md's own deferral"
    why_human: "Requires a ./mach build faster repackage and a running binary; explicitly deferred to the phase gate, not run by this static verification pass"
  - test: "A human clicking Retry in a real launched window on an unrecoverable failure sees the control absent, and on a recoverable failure sees it present with a working restart, and confirms the diagnostics rows survive a refused click"
    expected: "Matches the node-harness-proven contract: no Retry control on the unrecoverable class, a working one on the recoverable class, diagnostics preserved either way"
    why_human: "01-13's verify-shell-error-contract.mjs proves the supervisor/bootstrap contract and the spawn counts under Node against a faked PowerBrowserAPI — it does not prove a hidden button is actually unpainted on screen. Chrome-context Marionette is platform-blocked on Linux (ledger item 7), same residual as GUI-01/GUI-03."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T23:40:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plan 01-13, and against a fresh code review
(01-REVIEW.md, committed after 01-13) that found two new Blocker-tier issues in the verification
apparatus itself

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate, 01-06) — not scored here,
not orphaned.

## Disposition of the Prior Gap (independently re-verified against the live tree)

### 2d — a Retry click re-entering the failed launch path on an unrecoverable classification — CLOSED

Prior finding (carried from the previous verification pass): 01-12 correctly gated the background
recovery-probe TIMER on the `recoverable` classification, but `TheiaService.retry()` and the
on-screen Retry button remained unconditional, so the single most obvious user action on the error
screen re-entered `_restart()`/`_spawnAndGate()` against unassigned state and erased the diagnostic
rows on the way.

Independently re-verified by direct reading of the current tree (not taken from 01-13-SUMMARY.md's
narrative):

- `powerbrowser/shell/TheiaService.sys.mjs:123` — a new field `_errorRecoverable: null`.
- `:1140` (`_showError`) — `this._errorRecoverable = recoverable === true;`, written inside the
  same `_errorShown` false-to-true latch.
- `:1159` (`_hideError`) — `this._errorRecoverable = null;`, cleared at the single site
  `_errorShown` is cleared.
- `:990-994` (`retry()`) — `if (this._errorRecoverable !== true) { this._pushLog(...); return; }`
  BEFORE `_hideError()` is called, confirmed by reading the method body directly: the guard's
  `return` precedes the `_hideError()`/`_restart()` calls, so a refused click cannot null
  `_failureDetails`.
- `powerbrowser/shell/powerbrowser.js:115` (`powerbrowserShowError`) —
  `errorRetryButton.hidden = !recoverable;`, at the show site only.
- `powerbrowser/shell/powerbrowser.xhtml:39` and `powerbrowser.css` — the button carries no
  `disabled`/`hidden` HARD-CODED attribute (correct, since it is toggled dynamically), and the CSS
  file declares no `display` property on `#powerbrowser-error-retry` that could defeat the
  `[hidden]` UA rule (confirmed by grep — the only three rules matching that selector are
  font/color/hover/focus-visible declarations).
- `scripts/verify-platform.sh --quick`, run by this verification pass directly (not accepted from
  any SUMMARY): `shell-error-contract: PASS` naming all four scenarios including the new
  `unrecoverable-classification-refuses-the-retry-click`, and
  `shell-error-contract-self-test: PASS` over 10 rows (9 planted faults + 1 clean control),
  including the four new faults this plan added (guard removed from `retry()`; guard reordered
  below `_hideError()`; the presentation mirror removed; the guard made unconditional in the
  reverse direction).
- `01-REVIEW.md`'s own independent re-derivation (run separately, after 01-13, by a different
  process) reaches the identical conclusion: "The previous CR-01 is genuinely closed."

**Verdict: VERIFIED — genuinely closed.** Both the supervisor-side authority (`retry()`'s guard,
returning before `_hideError()`) and the presentation mirror (`errorRetryButton.hidden`) are
present, correctly ordered, and covered by a two-directional test (a positive control proves the
gate does not degrade into "refuse every Retry").

## New Findings This Pass — CR-A and CR-B, independently re-derived from source

A code review run against the tree AFTER 01-13 landed (`01-REVIEW.md`, committed at `51fda7c`,
which is the current HEAD) found two Critical/Blocker-tier issues, both in the phase's STATIC
GATES rather than in product code. Per this verification's brief, both were independently
re-derived from source before being accepted, not taken on the review's narrative — see the exact
line reads below and in the `gaps:` frontmatter.

**CR-A — the copy-safety gate has an escape hatch.** `scripts/verify-shell-error-copy.mjs:183-190`
is the check CLAUDE.md names as the enforcement of "no internal identifier may appear in
user-facing text ... by pattern, not by a list of banned strings." Its rule (4) regex —
`/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\.message)$/` — accepts ANY
`<identifier>.message`, which is exactly the shape of a caught exception's message
(`err.message`). Confirmed present on the current tree by direct read of the regex; the review's
own reproduction (a mutant painting `err.message` at `TheiaService.sys.mjs:1036`, run against all
three static analyzers with an unmutated control) is consistent with what the regex, read cold,
predicts. **The shipped tree is clean on its merits today** — grep confirms every current
`_showError()` call site passes a `USER_MESSAGE.*` reference — but the gate that is supposed to
keep it that way structurally cannot fire on the one shape most likely to appear by accident in a
future edit to `reportUnexpectedFailure` or a similar catch-and-report site.

**CR-B — the rebase-triggered residual-brand re-scan cannot see the tree it exists to check.**
`scripts/scan-brand-residue.mjs:255-269` (`scopeFiles`) sources its file set from `git ls-files`
only; `.gitignore:20` lists `upstream/`; `scripts/rebase-upstream.sh:108` invokes the scanner with
no argument to add a filesystem root outside the index. Confirmed present by direct read of all
three files. CLAUDE.md states in as many words that this gate is "wired into
`scripts/rebase-upstream.sh` and `.github/workflows/rebase-upstream.yml`, so an upstream rebase
that reintroduces a brand token fails there rather than in a release" — that specific guarantee
does not hold for anything under `upstream/`, which is the one tree a rebase actually rewrites.
The scan's ordinary function over this repo's own tracked tree (the evidence behind SC1 and SC5,
re-confirmed by this pass's own `--quick` run) is unaffected; this gap is scoped precisely to the
rebase call site CLAUDE.md names.

**Neither finding is a stub, a debt marker, or a live product-code defect** — `grep -E
"TBD|FIXME|XXX"` over both touched files returns zero matches, and both gates otherwise function
exactly as designed for the inputs they are actually reachable with. They are gaps in what the
gates PROVE relative to what CLAUDE.md and their own inline comments CLAIM they prove — the same
class of finding the last several verification/review passes have each surfaced in a different
corner of this codebase, this time in the checking apparatus rather than the supervisor.

Both are classified BLOCKER here, consistent with 01-REVIEW.md's own severity call and with
CLAUDE.md's Verification section making check honesty a correctness property of this repo, not a
nicety — and consistent with this verification's brief to treat a must-have whose only proof is a
gate that cannot fail as not verified.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` + self-test PASS, run directly in `--quick` this pass |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests (happy path) | ✓ VERIFIED | Regression-checked from 01-04's build evidence; unaffected by 01-13; not re-built this pass (47–54 min cost, per brief) |
| 2b | The backend supervisor's state-gating conflation and the three named unguarded throw sites are closed | ✓ VERIFIED | Regression-checked; unaffected by 01-13 |
| 2c | A failed Retry does not permanently disable the error layer for the rest of the session | ✓ VERIFIED | Regression-checked; `shell-error-contract: PASS`, confirmed by direct read of `retry()`/`_hideError()` ordering |
| 2d | An unrecoverable failure classification actually prevents re-entry into the failed launch path (timer AND user-driven) | ✓ VERIFIED (now closed) | See "Disposition" above — closed by 01-13; confirmed by direct read + `shell-error-contract`/self-test PASS run by this pass |
| 2e | The quit observer and state-file path are established before any path that can spawn a backend | ✓ VERIFIED | Regression-checked; `start-path-recovery: PASS` + self-test, run directly in `--quick` this pass |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green (`gui04-registry-shape` + self-test PASS in `--quick`, confirmed run directly); perceptual half still open (ledger 15), unchanged |
| 4 | SC4 — Runtime restyle via customize bridge | ◐ PARTIAL | Automated half green; perceptual half still open (ledger 16), unchanged |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | Regression-checked; `branding-preflight` + self-test PASS, confirmed run directly in `--quick` |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; token-gate mechanism untouched by 01-13; the ~20 launch-lifecycle checks that would exercise this live (`side02-token-*`) remain unrun per WINDOWS.md ledger item 11 (require a built binary + display) — residual, not a regression |
| 7 | No raw internal identifier, pref key, or exception message can reach the user-facing error layer, enforced by a gate that cannot be defeated | ✗ FAILED | CR-A — `verify-shell-error-copy.mjs`'s rule (4) admits `<identifier>.message`; confirmed by direct read of the regex. Tree is clean on merits today; the gate is not proven to keep it that way |
| 8 | The residual-brand scan fails on a brand token reintroduced by an upstream rebase, as CLAUDE.md states | ✗ FAILED | CR-B — `scan-brand-residue.mjs`'s `scopeFiles()` reads `git ls-files` only; `upstream/` is gitignored; `rebase-upstream.sh:108` passes no extra root. Confirmed by direct read of all three files |

**Score:** 8/12 truths verified (1 newly closed since the last pass), 2 failed (new this pass,
found by a code review that ran after the last verification and independently confirmed here), 2
partial (human verification open, unchanged).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/shell/TheiaService.sys.mjs` | Backend supervisor with correct one-time init gating, correct probe gating, quit-observer ordering, AND a Retry path that respects the classification it was given (both routes) | ✓ VERIFIED | All four properties confirmed present by direct read: `_errorRecoverable` field, `retry()`'s guard before `_hideError()`, `_showError`'s probe gate, quit-observer ordering ahead of the settings-folder branch |
| `powerbrowser/shell/powerbrowser.js` | Entry point with a terminal handler on every fire-and-forget supervisor call, no DOM write bypassing the supervisor, and a Retry affordance that reflects recoverability | ✓ VERIFIED | Terminal handlers, DOM-bypass fix, and `errorRetryButton.hidden` mirror all confirmed present by direct read |
| `scripts/verify-shell-error-contract.mjs` | Behavioral contract checker for the error layer and probe gate, including the user-driven Retry route | ✓ VERIFIED | 4/4 scenarios + 10/10 self-test rows PASS, run directly by this pass |
| `scripts/verify-shell-error-copy.mjs` | Static gate enforcing no raw internal identifier/exception text reaches the error layer, with no escape hatch | ✗ STUB-LIKE (defeatable) | Passes on the current clean tree, but its rule (4) regex structurally admits `err.message` — CR-A |
| `scripts/scan-brand-residue.mjs` + `scripts/rebase-upstream.sh` | A permanent gate that also catches a brand token reintroduced by an upstream rebase | ✗ NOT WIRED (for the rebase path) | Functions correctly over the tracked tree; cannot see `upstream/` at all — CR-B |
| `scripts/verify-platform.sh` | Single registry, `--quick` green | ✓ VERIFIED | 24/24 PASS, run directly by this pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowserRetry()` | `TheiaService.retry()`'s classification guard | direct call, no DOM bypass | ✓ WIRED | Confirmed at powerbrowser.js:135-137, TheiaService.sys.mjs:990-994 |
| `_showError`'s classification | `errorRetryButton.hidden` | `errorRetryButton.hidden = !recoverable` at the show site | ✓ WIRED | powerbrowser.js:115, confirmed |
| `_showError`'s classification | `_errorRecoverable` field, read by `retry()` | latch/clear pair inside `_showError`/`_hideError` | ✓ WIRED | TheiaService.sys.mjs:1140,1159,992 |
| `rebase-upstream.sh`'s post-replay check | the actual rewritten `upstream/` tree | `scan-brand-residue.mjs` invocation | ✗ NOT WIRED | `scopeFiles()` reads `git ls-files` only; `upstream/` is gitignored; no extra-root argument passed — CR-B |
| `_showError()` call sites | a validated `USER_MESSAGE` table entry only | rule (4) regex in `verify-shell-error-copy.mjs` | ⚠️ PARTIALLY WIRED | Gate exists and runs, but its own pattern admits a second, unsafe shape (`<identifier>.message`) — CR-A |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (24 checks) | `scripts/verify-platform.sh --quick` (run directly by this pass) | PASS, 24/24 | ✓ PASS |
| Retry against an unrecoverable classification drives no spawn, keeps diagnostics, offers no control | `--only shell-error-contract` (scenario `unrecoverable-classification-refuses-the-retry-click`) | PASS | ✓ PASS |
| Recoverable classification still honours Retry (reverse-direction control) | `--only shell-error-contract` (scenario `two-consecutive-failing-retries-repaint`, retargeted) | PASS | ✓ PASS |
| Copy-safety gate rejects a raw exception string | (no such check exists) | not exercised — CR-A names exactly this missing assertion | ✗ FAIL (gap) |
| Rebase-triggered brand scan sees a token planted under `upstream/` | (no such check exists) | not exercised — CR-B names exactly this missing assertion | ✗ FAIL (gap) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED (present state); regression-prevention gap noted | Unchanged, regression-checked. CR-B means a rebase that reintroduces a brand token into `upstream/` would not be caught by the gate CLAUDE.md names for that purpose — recorded as a gap, not a downgrade of the current tree's correctness |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED (present state); regression-prevention gap noted | Current tree's identifiers are correct (verified by SC1/SC5's direct evidence, not solely by the scan gate); CR-B is specifically about the "cannot regress via rebase" half of this requirement |
| MIG-04 | Renamed tree builds and boots under branding, and works as an actual browser | ✗ NOT SATISFIED | 2d is now closed (VERIFIED); MIG-04 is blocked instead by CR-A — a browser whose error-copy safety gate can be silently defeated is not proven to "work as an actual web browser" under CLAUDE.md's own correctness bar for user-facing text |
| GUI-01 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-03 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Unchanged, regression-checked; `gui04-registry-shape` + self-test PASS, run directly |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Unchanged, regression-checked; launch-lifecycle checks that would exercise this remain unrun (ledger 11), residual not regression |

No orphaned requirements: all 8 phase-1 requirement IDs appear in at least one of the 13 plans'
`requirements` frontmatter (confirmed by grep across all `01-*-PLAN.md` files). GUI-02 correctly
absent (deferred to v2).

### Anti-Patterns Found

`grep -E "TBD|FIXME|XXX"` over the six files touched by 01-13 and the two files named by CR-A/CR-B:
zero matches. No debt markers. Both new findings this pass are gate-correctness gaps in checking
code, not stubs or placeholders in product code.

Additional Warning/Info findings carried in `01-REVIEW.md` (WR-01 through WR-09, IN-01 through
IN-13) are not elevated to blocking here, consistent with the review's own severity
classification, which this verification independently agrees with on direct reading of the
highest-relevance ones (WR-01/WR-02, previously reviewed; WR-03 through WR-06, new
supervisor-lifecycle edge cases; WR-07/WR-08, gate weaknesses in `verify-branding-preflight.mjs`
and `check-internals-boundary.sh --catalogue`). None of these falsifies a currently-scored truth —
they are candidates for a future closure plan, not phase-goal blockers on their own.

One documentation-staleness item, not a code gap: `.planning/REQUIREMENTS.md`'s own Traceability
table (lines ~260-268) still reads "Gaps Found" for MIG-01, MIG-02, MIG-03, GUI-01, GUI-03, GUI-04
— stale from before the 01-09 through 01-13 gap-closure sequence and not kept in sync through it.
Worth a housekeeping pass; does not itself affect this verification's findings, which are drawn
from the code and from `WINDOWS.md`'s ledger rather than from that table.

## Human Verification Required

### 1. GUI-01 — browser-window toggle, full perceptual walkthrough

**Test:** Launch the app; open a browser window; confirm the address bar takes keyboard focus and
navigates a typed URL; confirm an in-window modal appears; close the window and confirm the shell
returns with the app still running.
**Expected:** All five steps succeed exactly as a stock browser window would behave.
**Why human:** BiDi cannot see chrome contexts on Linux; chrome-context Marionette is
platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15), unchanged by 01-13.

### 2. GUI-03 — customize bridge, visible restyle

**Test:** With the dev flag on, edit `customize.css` and confirm the shell visibly restyles
without a rebuild; delete the file and confirm the shell reverts.
**Expected:** The runtime CSS layer applies and un-applies visibly.
**Why human:** Perceptual outcome; automated checks only prove inertness and flag-gating, not the
visible effect. Still open (ledger item 16), unchanged by 01-13.

### 3. Tier-3 regression re-confirmation (WINDOWS.md ledger item 19)

**Test:** Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
repackaged binary (`./mach build faster` chrome-JS repackage, minutes not the full ~47–54 min build).
**Expected:** Neither check moves, since neither clicks Retry.
**Why human:** Requires a running repackaged binary; explicitly deferred to the phase gate, not run
by this static verification pass.

### 4. Perceptual confirmation of the 01-13 Retry gate

**Test:** Launch the app with the backend entry preference unset (drives the unrecoverable
`nodeMissing` classification); confirm Details shows the diagnostic rows and no Retry control is
present. Separately, drive a recoverable failure and confirm Retry is present and functional.
**Expected:** Matches the node-harness-proven contract exactly.
**Why human:** `verify-shell-error-contract.mjs` proves the supervisor/bootstrap contract under
Node against a faked `PowerBrowserAPI`; it does not prove a hidden button is actually unpainted on
screen. Same platform block as items 1–2 (ledger item 7).

## Gaps Summary

**One prior gap is genuinely closed.** 2d — the last item blocking the previous verification pass
— is now closed by plan 01-13, independently re-verified against the live tree by direct reading
of `TheiaService.sys.mjs` and `powerbrowser.js`, and by running `scripts/verify-platform.sh
--quick` directly rather than accepting the SUMMARY's claim of it. The fix reaches both the
supervisor entry point (the authority) and the on-screen control (presentation only), and is
proven two-directional by a registered positive control.

**Two new blockers were found by a code review that ran after the previous verification pass
completed** (`01-REVIEW.md`, committed at the current HEAD, `51fda7c`). Both are independently
confirmed here, not accepted on the review's narrative:

1. **CR-A** — the static gate enforcing CLAUDE.md's "no internal identifier in user-facing text"
   rule has an escape hatch: its regex admits `<identifier>.message` unconditionally, which matches
   a raw caught exception's `.message`. The shipped tree is clean on its merits today, but the gate
   that is supposed to keep it that way cannot fire on this shape.
2. **CR-B** — the residual-brand scan's rebase-triggered re-scan cannot see anything under
   `upstream/`, because it scans `git ls-files` and `upstream/` is gitignored. CLAUDE.md's specific
   claim that "an upstream rebase that reintroduces a brand token fails there rather than in a
   release" does not hold.

Both are BLOCKER-tier because they are verification-apparatus defects CLAUDE.md's own Verification
section treats as correctness properties, not niceties — a must-have whose only proof is a gate
that cannot fail is not verified. Neither is a live product-code defect, a stub, or a debt marker;
both are gaps between what a gate PROVES and what CLAUDE.md and the gate's own inline comments
CLAIM it proves.

Two success criteria (GUI-01, GUI-03) still have their perceptual halves un-performed, carried
forward unchanged from the prior pass and from `WINDOWS.md` (ledger items 15, 16). WINDOWS.md
ledger item 19's tier-3 regression re-confirmation also remains unrun, deferred to the phase gate.

Because of rule ordering (a FAILED truth outranks a closed prior gap), this pass's overall status
is **gaps_found**, even though the specific defect the previous pass was blocked on (2d) is now
closed. This is not a regression on 2d — it is a new, distinct finding surfaced by a review that
ran on the same tree afterward.

---

_Verified: 2026-08-31T23:40:00Z_
_Verifier: Claude (gsd-verifier)_
