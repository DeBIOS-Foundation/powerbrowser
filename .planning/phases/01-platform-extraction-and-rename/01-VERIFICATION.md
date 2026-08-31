---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T23:55:00Z
status: gaps_found
score: 8/12 must-haves verified (2 gate-correctness gaps closed then re-opened in a different shape by a fresh review, 2 partial — human halves still open)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/12
  gaps_closed:
    - "The exact demonstration cases named by the prior pass's CR-A and CR-B `missing[]` lists are genuinely closed: plan 01-14 binds verify-shell-error-copy.mjs rule (4) to a derived set of message-bearing bindings and rejects `err.message`/`stray.message` at the one call site CR-A named (TheiaService.sys.mjs:1036), proven by a red-then-green discrimination control against the pre-fix checker. Plan 01-15 gives scan-brand-residue.mjs an --extra-root mode and wires rebase-upstream.sh to pass $UPSTREAM_DIR to it, proven by a discrimination control against the pre-fix script and by a live 55s/463,930-file run over the real upstream/ checkout. Both independently confirmed here by direct reading of the current tree and by running scripts/verify-platform.sh --quick (24/24 PASS)."
  gaps_remaining:
    - "Truth 7 (copy-safety gate cannot be defeated) — reopened as CR-03: rule (4)'s call-site enumeration regex (/this\\._showError\\(\\s*([^,]+?)\\s*,/g) requires a literal `this.` receiver and a comma after the first argument. A call site matching neither shape (no trailing comma, optional-chaining receiver, or a bound alias) is never enumerated, so it is never checked -- not rejected, simply invisible. The only completeness guard is `callSites === 0`, which does not fire when 5 of 6 sites are seen. Independently reproduced here: a copy of TheiaService.sys.mjs with an appended comma-less `this._showError(err.message)` call exits 0."
    - "Truth 8 (residual-brand rebase gate cannot regress) — reopened as CR-01 and CR-02, both inside the --extra-root mode 01-15 just built: (a) the extra-root scan() call passes no `rows` filter, so a `coincidental`-class inventory row (a local absolute path fact about THIS checkout) can win a longest-token-first claim over a real brand-identifier row in a foreign tree and both suppress the offense AND suppress the independent unclaimed-probe detector, with no reconcile() count check behind it in that path to catch the difference; (b) `scan()`'s per-file read is wrapped in a silent `catch { continue; }` justified only for the git-ls-files source (\"a path git tracks but this checkout does not materialise\") but the extra-root file set comes from a readdirSync that just confirmed the file exists, so an unreadable file there is EACCES/EISDIR/oversize, is skipped with no failure recorded, and is still counted in the reported scanned-file total. Both independently reproduced here: an absolute-path token planted under --extra-root exits 0; a chmod-000 file carrying `chrome://sourcerer/content/x` under --extra-root exits 0 and is counted as scanned."
  regressions: []
  new_gaps_this_pass:
    - "CR-01, CR-02, CR-03 (01-REVIEW.md, committed 917ff5d, this pass's HEAD) -- three Critical findings in the code shipped by 01-14/01-15 itself, each with a reproduction against the shipped script. All three independently re-confirmed by direct reading and by re-running each reproduction in this pass, not accepted on the review's narrative."
gaps:
  - truth: "No raw internal identifier, pref key, or exception message can reach the user-facing error layer — enforced by a check that cannot be defeated (CLAUDE.md: 'shell-error-copy-no-internals enforces this by pattern, not by a list of banned strings')."
    status: failed
    reason: >
      01-14 correctly closed the exact shape CR-A named (an accept-side regex that admitted ANY
      `<identifier>.message`) by deriving the accept set from the file under test. CR-03
      (01-REVIEW.md, independently confirmed here) shows the fix did not close the class: the
      ENUMERATION of `this._showError(` call sites — the step that decides which call sites are even
      examined — is still a regex (`/this\._showError\(\s*([^,]+?)\s*,/g`) that requires a literal
      `this.` receiver and a trailing comma. A call site outside that shape (no comma, `this?.`, a
      bound alias) is not rejected, it is simply never seen; the only completeness assertion
      (`callSites === 0`) cannot detect "5 of 6 sites parsed." Reproduced directly in this pass: a
      copy of TheiaService.sys.mjs with an appended `try { x(); } catch (err) { this._showError(err.message) }`
      (no trailing comma) exits 0 against `node scripts/verify-shell-error-copy.mjs --file <copy>`.
      Today's shipped call sites all match the regex (confirmed: 5/5 parsed), so there is still no
      live leak — but CLAUDE.md's own doctrine ("derive from the tree and compare") is violated by the
      enumeration step itself, which is exactly the property this must-have requires.
    artifacts:
      - path: "scripts/verify-shell-error-copy.mjs"
        issue: "The call-site enumeration regex at line 303 (`/this\\._showError\\(\\s*([^,]+?)\\s*,/g`) silently skips any `this._showError(` call whose shape it does not match, and the only completeness guard (`callSites === 0`) cannot detect a partial miss."
    missing:
      - "Derive the total count of `_showError(` call sites independently (e.g. every textual `_showError(` minus its one definition) and require the enumeration regex's `callSites` to equal that total, failing loudly and naming the gap when they disagree — the same set-equality discipline checks (2) and (3) in this file already use."
      - "A --self-test row planting a comma-less or optional-chained `_showError(` call site and requiring the check to go red for 'a call site this check cannot read'."
  - truth: "The residual-brand scan is a permanent gate that fails on a brand token reintroduced by an upstream rebase (CLAUDE.md: 'wired into rebase-upstream.sh and .github/workflows/rebase-upstream.yml, so an upstream rebase that reintroduces a brand token fails there rather than in a release')."
    status: failed
    reason: >
      01-15 correctly closed the exact shape CR-B named (the post-replay scan could not see anything
      under `upstream/` at all) by adding a real `--extra-root` filesystem walk, proven live against a
      5.6GB checkout. CR-01 and CR-02 (01-REVIEW.md, independently confirmed here) show the new mode
      has two holes of its own, both reproduced against the shipped script: (a) the extra-root
      `scan()` call reuses the full inventory row set including `coincidental`-class rows — a fact
      about THIS repo's own checkout (e.g. its absolute local path) — so a longest-token-first claim
      lets that row swallow a real brand-identifier span in a foreign tree, marking it not-an-offense
      AND suppressing the independent unclaimed-probe detector at that index; nothing constrains this
      in the extra-root path because `reconcile()` is deliberately not run there. Reproduced: planting
      `MOZ_OBJDIR=/home/chris/coding/sourcerer/objdir` under a scratch `--extra-root` exits 0. (b) the
      shared per-file `catch { continue; }` in `scan()` is justified only for the git-ls-files
      provenance ("a path git tracks but this checkout does not materialise") but applies unconditionally
      to the extra-root file set too, where a throw means the file is unreadable (EACCES etc), not
      absent — so an unreadable file is skipped with no failure recorded and is still counted in the
      reported scanned-file total. Reproduced: a chmod-000 file containing `chrome://sourcerer/content/x`
      under `--extra-root` exits 0, reporting '1 file(s) scanned'. Both are the same failure class CR-B
      itself was: a gate that is green by construction on the input it exists to catch.
    artifacts:
      - path: "scripts/scan-brand-residue.mjs"
        issue: "Line 1090's extra-root `scan(inv, { root: extraRoot, files: extraFiles })` call passes no `rows` override, so `coincidental`-class rows (checked only by `reconcile()`, which the extra-root path deliberately skips) can claim and suppress a real brand-identifier span in a foreign tree. Separately, `scan()`'s per-file `catch { continue; }` (line 391-396) is shared by both file-set sources but its justifying comment only holds for the git-ls-files source; an unreadable extra-root file is silently skipped and miscounted as scanned."
    missing:
      - "Filter the extra-root pass's inventory rows to exclude the `coincidental` class (`rows: inv.tokens.filter((r) => r.class !== 'coincidental')`), since those rows describe facts about this checkout, not a foreign one, and a self-test row planting a coincidental-shaped token under --extra-root requiring a red."
      - "Make the per-file catch collect and surface unreadable files (distinct from an absent file) so an unreadable extra-root file is a gate failure, not a silent, mis-counted skip — and a self-test row proving a chmod-000 file under --extra-root fails loudly."
deferred:
  - truth: "GUI-02 — open and browse web pages inside Theia as URL-addressable tabs"
    addressed_in: "v2 (not a numbered roadmap phase yet)"
    evidence: "ROADMAP.md / REQUIREMENTS.md: 'GUI-02 deferred to v2 on 2026-08-30 at the D-22 gate' — pre-existing deferral, unaffected by this pass"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15) — unchanged by 01-14/01-15."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks only prove inertness and flag-gating, not the visible-restyle claim. Still open (ledger item 16) — unchanged by 01-14/01-15."
  - test: "The two tier-3 regression confirmations named by WINDOWS.md ledger item 19 (shell03-budget-exhausted-error, shell03-auto-dismiss-on-selfheal) re-run against a repackaged binary"
    expected: "Neither check moves, since neither clicks Retry"
    why_human: "Requires a ./mach build faster repackage and a running binary; explicitly deferred to the phase gate, not run by this static verification pass"
  - test: "A human clicking Retry in a real launched window on an unrecoverable failure sees the control absent, and on a recoverable failure sees it present with a working restart, and confirms the diagnostics rows survive a refused click"
    expected: "Matches the node-harness-proven contract: no Retry control on the unrecoverable class, a working one on the recoverable class, diagnostics preserved either way"
    why_human: "verify-shell-error-contract.mjs proves the supervisor/bootstrap contract under Node against a faked PowerBrowserAPI — it does not prove a hidden button is actually unpainted on screen. Chrome-context Marionette is platform-blocked on Linux (ledger item 7), same residual as GUI-01/GUI-03."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T23:55:00Z
**Status:** gaps_found
**Re-verification:** Yes — after gap-closure plans 01-14 and 01-15, and against a fresh code review
(01-REVIEW.md, committed after both plans landed) that found three new Critical-tier findings in the
gap-closure code itself

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate, 01-06) — not scored here,
not orphaned.

## Disposition of the Two Prior Gaps (independently re-verified against the live tree)

### CR-A (prior pass) — the copy-safety gate's accept-side hole — DEMONSTRATION CASE CLOSED, CLASS RE-OPENED AS CR-03

01-14 rewrote rule (4) of `scripts/verify-shell-error-copy.mjs` so the accept set for a `.message`
argument is derived from the file under test (`messageBearingBindings`, `catchParamNames`) instead of
matched by a permissive `<identifier>.message` regex. Independently confirmed by direct reading of the
current file (lines 296-341) and by running `node scripts/verify-shell-error-copy.mjs --self-test`
(8/8 rows PASS) and the discrimination control recorded in `01-14-SUMMARY.md` (both new fault rows
GREEN under the pre-fix checker, RED under the fixed one).

**But** a fresh review (`01-REVIEW.md`, committed at the current HEAD after both gap-closure plans)
found CR-03: the ENUMERATION step that decides which `this._showError(` call sites even reach rule (4)
is still an unproven regex (`/this\._showError\(\s*([^,]+?)\s*,/g`), requiring a literal `this.`
receiver and a trailing comma. A call site outside that shape is never examined — not rejected, simply
invisible — and the only completeness guard (`callSites === 0`) cannot detect a partial miss.
Independently reproduced in this pass: appending a comma-less `this._showError(err.message)` call to a
scratch copy of `TheiaService.sys.mjs` and running `node scripts/verify-shell-error-copy.mjs --file
<scratch>` exits **0**. This is the same defect class CR-A was, one step removed: the checker no longer
has a hand-kept accept-list, but its coverage of what it even looks at is still unproven.

**Verdict: the specific demonstration case named by the prior pass's `missing[]` is genuinely closed.
The must-have itself — "enforced by a check that cannot be defeated" — remains FAILED**, because a
different, independently reproduced input defeats it today.

### CR-B (prior pass) — the rebase-triggered scan blind to `upstream/` — DEMONSTRATION CASE CLOSED, CLASS RE-OPENED AS CR-01/CR-02

01-15 added `extraRootFiles()` and an `--extra-root <dir>` CLI mode to `scripts/scan-brand-residue.mjs`,
and wired `scripts/rebase-upstream.sh` to pass `$UPSTREAM_DIR` to the post-replay invocation.
Independently confirmed by direct reading of the current file (lines 300-352, 1078-1106) and by running
`node scripts/scan-brand-residue.mjs --self-test` (11/11 rows PASS, including three new `--extra-root`
rows) and by re-running the live 55-second, 463,930-file scan over the real `upstream/` checkout
(exit 0, `git -C upstream diff --stat` empty before and after).

**But** the fresh review found two holes inside that same new mode, both independently reproduced in
this pass: **CR-01** — the extra-root `scan()` call (line 1090) passes no `rows` filter, so
`coincidental`-class inventory rows (facts about THIS repo's own checkout, such as its absolute local
path) can win a longest-token-first claim over a real brand-identifier token in a foreign tree, marking
it not-an-offense and suppressing the independent unclaimed-probe detector at the same index — with no
`reconcile()` check behind the extra-root path to catch the difference (that omission is deliberate,
for a different, valid reason: D-17's census cannot close over a foreign checkout). Reproduced: planting
`MOZ_OBJDIR=/home/chris/coding/sourcerer/objdir` under a scratch `--extra-root` exits **0**. **CR-02** —
the shared per-file `catch { continue; }` inside `scan()` (lines 391-396) is justified only for the
git-ls-files provenance ("a path git tracks but this checkout does not materialise"); the extra-root
file set instead comes from a `readdirSync` that just confirmed the file exists, so a throw there means
EACCES/EISDIR/oversize — an unreadable file is silently skipped, no failure is recorded, and it is still
counted in the reported "N file(s) scanned" total. Reproduced: a `chmod 000` file containing
`chrome://sourcerer/content/x` under `--extra-root` exits **0**, reporting "1 file(s) under --extra-root".

**Verdict: the specific demonstration case named by the prior pass's `missing[]` is genuinely closed.
The must-have itself — "fails on a brand token reintroduced by an upstream rebase" — remains FAILED**,
because two different, independently reproduced inputs defeat the very mode built to close it.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` + self-test PASS, run directly in `--quick` this pass |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests (happy path) | ✓ VERIFIED | Regression-checked from 01-04's build evidence; unaffected by 01-14/01-15; not re-built this pass (47–54 min cost, per brief) |
| 2b | The backend supervisor's state-gating conflation and the three named unguarded throw sites are closed | ✓ VERIFIED | Regression-checked; unaffected by 01-14/01-15 |
| 2c | A failed Retry does not permanently disable the error layer for the rest of the session | ✓ VERIFIED | Regression-checked; `shell-error-contract: PASS`, run directly this pass |
| 2d | An unrecoverable failure classification actually prevents re-entry into the failed launch path (timer AND user-driven) | ✓ VERIFIED | Regression-checked; `shell-error-contract`/self-test PASS run directly this pass; unaffected by 01-14/01-15 |
| 2e | The quit observer and state-file path are established before any path that can spawn a backend | ✓ VERIFIED | Regression-checked; `start-path-recovery: PASS` + self-test, run directly this pass |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green (`gui04-registry-shape` + self-test PASS, run directly); perceptual half still open (ledger 15), unchanged |
| 4 | SC4 — Runtime restyle via customize bridge | ◐ PARTIAL | Automated half green; perceptual half still open (ledger 16), unchanged |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | Regression-checked; `branding-preflight` + self-test PASS, run directly this pass |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; token-gate mechanism untouched by 01-14/01-15; launch-lifecycle checks that would exercise this live remain unrun per WINDOWS.md ledger item 11, residual not regression |
| 7 | No raw internal identifier, pref key, or exception message can reach the user-facing error layer, enforced by a gate that cannot be defeated | ✗ FAILED | CR-A's demonstration case closed by 01-14; CR-03 (01-REVIEW.md, independently reproduced here: a comma-less `_showError(err.message)` call site is never enumerated) defeats it again by a different shape |
| 8 | The residual-brand scan fails on a brand token reintroduced by an upstream rebase, as CLAUDE.md states | ✗ FAILED | CR-B's demonstration case closed by 01-15's `--extra-root` mode; CR-01 and CR-02 (01-REVIEW.md, independently reproduced here: a coincidental-row swallow and a silently-skipped unreadable file) defeat the new mode itself |

**Score:** 8/12 truths verified, 2 failed (same two truths as the prior pass — the specific defect
each names has moved, not the truth's status), 2 partial (human verification open, unchanged).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/shell/TheiaService.sys.mjs` | Backend supervisor with correct one-time init gating, correct probe gating, quit-observer ordering, AND a Retry path that respects the classification it was given | ✓ VERIFIED | Regression-checked; unaffected by 01-14/01-15 |
| `powerbrowser/shell/powerbrowser.js` | Entry point with terminal handlers, no DOM-write bypass, Retry affordance reflecting recoverability | ✓ VERIFIED | Regression-checked |
| `scripts/verify-shell-error-contract.mjs` | Behavioral contract checker for the error layer and probe gate | ✓ VERIFIED | 4/4 scenarios + 10/10 self-test rows PASS, run directly this pass |
| `scripts/verify-shell-error-copy.mjs` | Static gate enforcing no raw internal identifier/exception text reaches the error layer, with no escape hatch | ✗ STUB-LIKE (defeatable, different shape) | Accept-set derivation (01-14) is sound; call-site ENUMERATION (unchanged since before 01-14) is a regex with no completeness proof — CR-03, reproduced |
| `scripts/scan-brand-residue.mjs` + `scripts/rebase-upstream.sh` | A permanent gate that also catches a brand token reintroduced by an upstream rebase | ✗ NOT FULLY WIRED (new mode has two holes) | `--extra-root` mode (01-15) reaches `upstream/` for the first time, but its inventory-row set is unfiltered (CR-01) and its unreadable-file handling is shared with a justification that does not hold for it (CR-02), both reproduced |
| `scripts/verify-platform.sh` | Single registry, `--quick` green | ✓ VERIFIED | 24/24 PASS, run directly this pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowserRetry()` | `TheiaService.retry()`'s classification guard | direct call, no DOM bypass | ✓ WIRED | Regression-checked |
| `_showError`'s classification | `errorRetryButton.hidden` / `_errorRecoverable` | latch/clear pair | ✓ WIRED | Regression-checked |
| `rebase-upstream.sh`'s post-replay check | the actual rewritten `upstream/` tree | `--extra-root $UPSTREAM_DIR` → `extraRootFiles()` → `scan()` | ⚠️ PARTIALLY WIRED | Reaches the tree for the first time (closes CR-B's demonstration case) but the scan it runs there admits a coincidental-row claim (CR-01) and silently miscounts an unreadable file as scanned (CR-02) |
| `_showError()` call sites | a validated `USER_MESSAGE` table entry only | derived accept set (rule 4) | ⚠️ PARTIALLY WIRED | The accept-side derivation is sound (closes CR-A's demonstration case), but the call-site enumeration feeding it is an unproven regex that silently drops non-matching shapes (CR-03) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (24 checks) | `scripts/verify-platform.sh --quick` (run directly this pass) | PASS, 24/24 | ✓ PASS |
| Rule (4)'s tightened derivation rejects `err.message`/`stray.message` at the documented call site | `node scripts/verify-shell-error-copy.mjs --self-test` | 8/8 rows PASS | ✓ PASS |
| `--extra-root` mode rejects a planted token, a missing root, an empty root | `node scripts/scan-brand-residue.mjs --self-test` | 11/11 rows PASS | ✓ PASS |
| CR-03: a comma-less `_showError(err.message)` call site is enumerated and rejected | Reproduced directly this pass: scratch copy of `TheiaService.sys.mjs` with an appended comma-less call | exit **0** (should be non-zero) | ✗ FAIL (gap, reproduced) |
| CR-01: a `coincidental`-class token under `--extra-root` is caught | Reproduced directly this pass: `MOZ_OBJDIR=/home/chris/coding/sourcerer/objdir` under a scratch `--extra-root` | exit **0** (should be non-zero) | ✗ FAIL (gap, reproduced) |
| CR-02: an unreadable file under `--extra-root` is reported as a failure, not silently skipped | Reproduced directly this pass: `chmod 000` file containing a brand token under a scratch `--extra-root` | exit **0**, counted as "1 file(s) scanned" (should fail, naming the unreadable file) | ✗ FAIL (gap, reproduced) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED (present state); regression-prevention gap noted | Unchanged. CR-01/CR-02 mean a rebase that reintroduces a brand token — or plants one behind an unreadable file, or one that happens to share a span with a coincidental-class row — into `upstream/` is still not reliably caught by the gate CLAUDE.md names for that purpose |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED (present state); regression-prevention gap noted | Current tree's identifiers are correct (SC1/SC5 direct evidence); CR-01/CR-02 are specifically about the "cannot regress via rebase" half |
| MIG-04 | Renamed tree builds and boots under branding, and works as an actual browser | ✗ NOT SATISFIED | CR-A's demonstration case closed by 01-14, but CR-03 reopens the same correctness bar this requirement was blocked on last pass: a browser whose error-copy safety gate can be silently defeated (by a different call shape) is not proven to "work as an actual web browser" under CLAUDE.md's own bar |
| GUI-01 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-03 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Unchanged, regression-checked |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Unchanged, regression-checked |

No orphaned requirements: all 8 phase-1 requirement IDs appear in at least one plan's `requirements`
frontmatter (confirmed across all `01-*-PLAN.md` files, including 01-14 and 01-15 which both carry the
full phase requirement set per their `<planning_dispositions>`). GUI-02 correctly absent (deferred to v2).

**REQUIREMENTS.md traceability table is stale, again, in the opposite direction this time.** Lines
260-268 read MIG-01/02/03/04 and SEC-01 as flatly "Complete", which does not reflect either this pass's
or the prior pass's gate-correctness findings. This is a documentation-currency issue, not a code gap —
the same class of finding the prior pass noted about this same table, now recurring in a different set
of rows. Worth a housekeeping pass once the gate-correctness class itself is actually closed rather than
edited after each partial fix.

### Anti-Patterns Found

`grep -E "TBD|FIXME|XXX"` over the five files 01-REVIEW.md analyzed (`scripts/scan-brand-residue.mjs`,
`scripts/verify-shell-error-copy.mjs`, `scripts/rebase-upstream.sh`,
`.github/workflows/rebase-upstream.yml`, `docs/BUILD.md`): zero matches. No debt markers. CR-01, CR-02,
and CR-03 are gate-correctness gaps in checking code — the same class the prior two passes each found in
a different corner — not stubs or placeholders.

`01-REVIEW.md`'s six Warning-tier findings (WR-01 through WR-06) and four Info-tier findings (IN-01
through IN-04) are not elevated to blocking here, consistent with the review's own severity
classification. None of them falsifies a currently-scored truth on its own; they are candidates for a
future closure plan (WR-01/WR-02 touch the same `messageBearingBindings`/`parseUserMessageTable`
machinery CR-03 sits in, and are worth folding into the same fix pass).

## Human Verification Required

### 1. GUI-01 — browser-window toggle, full perceptual walkthrough

**Test:** Launch the app; open a browser window; confirm the address bar takes keyboard focus and
navigates a typed URL; confirm an in-window modal appears; close the window and confirm the shell
returns with the app still running.
**Expected:** All five steps succeed exactly as a stock browser window would behave.
**Why human:** BiDi cannot see chrome contexts on Linux; chrome-context Marionette is
platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15), unchanged.

### 2. GUI-03 — customize bridge, visible restyle

**Test:** With the dev flag on, edit `customize.css` and confirm the shell visibly restyles
without a rebuild; delete the file and confirm the shell reverts.
**Expected:** The runtime CSS layer applies and un-applies visibly.
**Why human:** Perceptual outcome; automated checks only prove inertness and flag-gating, not the
visible effect. Still open (ledger item 16), unchanged.

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

**Both prior gaps' specific demonstration cases are genuinely closed.** 01-14 correctly bound rule
(4)'s ACCEPT set to bindings derived from `TheiaService.sys.mjs`, and 01-15 correctly gave the
residual-brand scan a real filesystem walk over `upstream/`, both independently re-verified against the
live tree in this pass (not accepted on either SUMMARY's narrative), and both proven by a red-then-green
discrimination control against the pre-fix code — including a live 55-second, 463,930-file run over the
real 5.6GB `upstream/` checkout for 01-15.

**Neither fix closed the class of failure it was meant to close, and a fresh review found the reopened
class in the shipped fix itself.** `01-REVIEW.md` (committed after both plans landed) found three new
Critical findings, all independently reproduced in this pass, not accepted on the review's narrative:

1. **CR-03** — rule (4)'s new derived accept set is sound, but the regex that ENUMERATES which call
   sites even reach it (`this._showError(` requiring a literal receiver and a trailing comma) can miss
   a call site silently, with no completeness proof behind it. Reproduced: a comma-less
   `this._showError(err.message)` call exits 0.
2. **CR-01** — the new `--extra-root` scan reuses the full inventory row set including `coincidental`
   rows (facts about this repo's own checkout), letting one such row's longest-token-first claim
   swallow a real brand token in a foreign tree. Reproduced: an absolute path under `--extra-root`
   exits 0.
3. **CR-02** — the same scan's per-file `catch { continue; }` is shared with the tracked-tree path but
   its justification ("not materialised") does not hold for the extra-root path, where a throw means
   unreadable; the file is silently skipped and miscounted as scanned. Reproduced: a chmod-000 file
   carrying a brand token under `--extra-root` exits 0.

All three are the same failure class the prior two verification/review passes each found in a different
corner of this codebase: a gate placed at exactly the right call site whose own mechanics keep it green
by construction on the specific input it exists to catch. Both truths this maps to (7 and 8) were FAILED
in the prior pass and remain FAILED in this pass — the defect moved, the truth's status did not.

Two success criteria (GUI-01, GUI-03) still have their perceptual halves un-performed, carried forward
unchanged from the prior pass and from `WINDOWS.md` (ledger items 15, 16). WINDOWS.md ledger item 19's
tier-3 regression re-confirmation also remains unrun, deferred to the phase gate.

Because of rule ordering (a FAILED truth outranks closed gaps), this pass's overall status is
**gaps_found**, unchanged from the prior pass's status, though its score composition and specific defect
descriptions have changed.

---

_Verified: 2026-08-31T23:55:00Z_
_Verifier: Claude (gsd-verifier)_
