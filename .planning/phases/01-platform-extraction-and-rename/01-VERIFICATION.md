---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T23:55:00Z
status: gaps_found
score: 9/12 must-haves verified (1 gap closed for real this pass, 1 gap reopened in a different shape by a fresh review and independently reproduced, 2 partial — human halves still open)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/12
  gaps_closed:
    - "Truth 8 (residual-brand rebase gate cannot regress) — CR-01 (coincidental-row exemption under --extra-root) and CR-02 (unreadable file silently skipped and miscounted as scanned) are both genuinely fixed by 01-17. Independently reproduced in this pass, not accepted on the SUMMARY's narrative: `MOZ_OBJDIR=/home/chris/coding/sourcerer/objdir` planted under a scratch --extra-root now exits 1 naming the file; a chmod-000 file carrying a brand token under --extra-root now exits 1 reporting '1 unreadable file(s)'. Both were exit-0 escapes in the prior pass."
  gaps_remaining:
    - "Truth 7 (copy-safety gate cannot be defeated) — 01-16 closed the exact two shapes CR-03 named (comma-less call, optional-chaining receiver) with a second, independently-derived call-site count. A fresh review (01-REVIEW.md, committed after 01-16/01-17 landed) found the new count itself is defeatable: it computes `definitions` as every line-initial `_showError(` occurrence and subtracts it from the raw total to get `present`, then asserts `callSites === present`. A CALL site written without a receiver at the start of a line matches the same `definitions` pattern, so appending one raises the raw count AND `definitions` together, leaving `present` unchanged while `callSites` (which requires `this.`) also stays unchanged -- the two counts agree with each other while the call site is never examined. Independently reproduced in this pass against the shipped checker: a copy of TheiaService.sys.mjs with an appended receiverless `_showError(err.message, false, []);` exits 0. A second, separate escape (WR-01, also reproduced this pass) shows a `.bind`-aliased call site (`this._showError.bind(this)`) is invisible to both counters because neither matches `_showError.bind(` as an occurrence of `_showError(`; a call through that alias with `err.message` also exits 0."
  regressions: []
  new_gaps_this_pass:
    - "None net-new: CR-01/WR-01 (01-REVIEW.md, this pass's HEAD) are a reopening of the same must-have (Truth 7) that was already FAILED in the prior verification pass, in a different specific shape, exactly as Truth 7 itself predicted would keep happening absent a structural fix. Independently re-confirmed here by direct reading of scripts/verify-shell-error-copy.mjs:379-380/422-430 and by re-running both reproductions against the shipped checker."
gaps:
  - truth: "No raw internal identifier, pref key, or exception message can reach the user-facing error layer — enforced by a check that cannot be defeated (CLAUDE.md: 'shell-error-copy-no-internals enforces this by pattern, not by a list of banned strings')."
    status: failed
    reason: >
      01-16 correctly closed the exact two shapes CR-03 named (a comma-less `this._showError(x)`
      call and an optional-chaining `this?._showError(x)` call) by adding a second, independently
      derived call-site count and asserting it equals the enumeration regex's count. Both new
      `--self-test` rows for those shapes are present (12 rows total, all green) and both go red
      against a scratch copy of the pre-01-16 checker. That part of the fix is genuine.

      But the new count itself has a blind spot the review found and this pass reproduced directly:
      `present` is computed as (every textual `_showError(`) minus `definitions`, where `definitions`
      is every line whose first non-whitespace token is `_showError(`
      (`/^\s*_showError\s*\(/gm`). That pattern does not identify "the method definition" — it
      identifies "a line-initial `_showError(`", and a bare CALL written at the start of a line
      matches it exactly as well as the definition does. Appending such a call raises the raw
      textual count by 1 and raises `definitions` by 1 in the same edit, so `present` (their
      difference) is unchanged; `callSites` (which requires a literal `this.` receiver, unaffected
      by a receiverless call) is also unchanged; `callSites === present` still holds; the run exits
      0. The call site is never examined by rule (4), so its argument — reproduced here as a caught
      exception's `.message`, the exact shape this whole checker exists to stop — is never rejected.

      Reproduced directly in this pass against the shipped checker:
        cp powerbrowser/shell/TheiaService.sys.mjs /tmp/E.mjs
        printf '\n_showError(err.message, false, []);\n' >> /tmp/E.mjs
        node scripts/verify-shell-error-copy.mjs --file /tmp/E.mjs
        => "verify-shell-error-copy: PASS -- no internal identifier can reach the error layer"; EXIT=0

      A second, separate escape (WR-01 in 01-REVIEW.md, also reproduced here) shows a `.bind`-aliased
      call site is invisible to BOTH counters, since neither matches `_showError.bind(` as an
      occurrence of `_showError(`:
        printf '\nconst show = this._showError.bind(this);\nshow(err.message, false, []);\n' >> /tmp/A.mjs
        node scripts/verify-shell-error-copy.mjs --file /tmp/A.mjs
        => PASS; EXIT=0

      None of the 12 planted `--self-test` rows cover either shape (confirmed: `--self-test` output
      lists 12 rows, none named for a receiverless or `.bind`-aliased call), so the self-test itself
      does not catch its own checker's blind spot. Today's 5 shipped call sites in
      TheiaService.sys.mjs all use `this._showError(` with a trailing comma, so there is still no
      LIVE leak in the shipped product — but this is the third consecutive verification/review pass
      to find a new way to defeat the same gate (CR-A closed by 01-14, CR-03's two named shapes
      closed by 01-16, this shape open now), which is exactly the pattern CLAUDE.md's "derive from
      the tree and compare" rule exists to prevent: a hand-written pattern about call SHAPE
      (`definitions`) is not a derivation, it is an assumption, and it keeps having new counter-examples.
    artifacts:
      - path: "scripts/verify-shell-error-copy.mjs"
        issue: "Lines 379-380: `definitions = [...src.matchAll(/^\\s*_showError\\s*\\(/gm)].length` and `present = total - definitions` cancel exactly when a receiverless call site is appended, because the same regex that is meant to identify the one definition also matches a line-initial call. Separately, both the enumeration regex (line ~383) and this new count key on the literal substring `_showError(`, so `this._showError.bind(this)` — `_showError.bind(` — is counted by neither and the call through the alias is unexamined."
    missing:
      - "Replace the count-based completeness check with a position-set check that cannot cancel: collect every textual `_showError(` occurrence's offset in the comment-stripped source, separately identify the ONE definition by requiring its parameter list be followed by a `{` (a property no call site has), and require every remaining occurrence to be present in the enumeration regex's matched-offset set — failing loudly and naming the unparsed offset(s) when it is not. Drop the `definitions`/`present` subtraction entirely; a set-membership check cannot exhibit the cancel-in-tandem failure a difference-of-counts check can."
      - "Reject any textual `_showError` not immediately followed by `(` (i.e. `/_showError(?!\\s*\\()/g`) as an escape this check cannot examine — this closes the `.bind` alias (and any other property-read escape) by refusing it rather than trying to follow it through the alias."
      - "Two new `--self-test` FAULTS rows: a receiverless line-initial call (`_showError(err.message, false, []);`) and a `.bind`-aliased call, each verified GREEN against a scratch copy of today's shipped checker (restored from git) and RED against the fixed one — the same discrimination-control standard the existing 12 rows already meet."
deferred:
  - truth: "GUI-02 — open and browse web pages inside Theia as URL-addressable tabs"
    addressed_in: "v2 (not a numbered roadmap phase yet)"
    evidence: "ROADMAP.md / REQUIREMENTS.md: 'GUI-02 deferred to v2 on 2026-08-30 at the D-22 gate' — pre-existing deferral, unaffected by this pass"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger item 7). Still open (ledger item 15) — unchanged by 01-16/01-17."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks only prove inertness and flag-gating, not the visible-restyle claim. Still open (ledger item 16) — unchanged by 01-16/01-17."
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
**Re-verification:** Yes — after gap-closure plans 01-16 and 01-17, and against a fresh code review
(01-REVIEW.md, committed after both plans landed) that found one new Critical-tier finding (plus two
sibling Warnings, one of which — WR-01 — bears directly on the same must-have) in the gap-closure
code itself.

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate, 01-06) — not scored here,
not orphaned.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` + self-test PASS, run directly in `--quick` this pass |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests (happy path) | ✓ VERIFIED | Regression-checked from 01-04's build evidence; unaffected by 01-16/01-17; not re-built this pass (47–54 min cost, per brief) |
| 2b | The backend supervisor's state-gating conflation and the three named unguarded throw sites are closed | ✓ VERIFIED | Regression-checked; unaffected by 01-16/01-17 (files not in either plan's `files_modified`) |
| 2c | A failed Retry does not permanently disable the error layer for the rest of the session | ✓ VERIFIED | Regression-checked; `shell-error-contract: PASS`, run directly this pass |
| 2d | An unrecoverable failure classification actually prevents re-entry into the failed launch path (timer AND user-driven) | ✓ VERIFIED | Regression-checked; `shell-error-contract`/self-test PASS run directly this pass |
| 2e | The quit observer and state-file path are established before any path that can spawn a backend | ✓ VERIFIED | Regression-checked; `start-path-recovery: PASS` + self-test, run directly this pass |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green (`gui04-registry-shape` + self-test PASS, run directly); perceptual half still open (ledger 15), unchanged |
| 4 | SC4 — Runtime restyle via customize bridge | ◐ PARTIAL | Automated half green; perceptual half still open (ledger 16), unchanged |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | Regression-checked; `branding-preflight` + self-test PASS, run directly this pass |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; token-gate mechanism untouched by 01-16/01-17 |
| 7 | No raw internal identifier, pref key, or exception message can reach the user-facing error layer, enforced by a gate that cannot be defeated | ✗ FAILED | CR-03's two named shapes closed by 01-16, but the new completeness count itself cancels on a receiverless call (CR-01, 01-REVIEW.md, reproduced here) and a `.bind` alias is invisible to both counters (WR-01, reproduced here) |
| 8 | The residual-brand scan fails on a brand token reintroduced by an upstream rebase, as CLAUDE.md states | ✓ VERIFIED | 01-17 closed both prior escapes for real: a coincidental-row-claimed token and a silently-skipped unreadable file each now exit 1, reproduced independently against the shipped script in this pass |

**Score:** 9/12 truths verified (1 flipped from FAILED to VERIFIED this pass; 1 remains FAILED, reopened
in a different shape by a fresh review; 2 remain PARTIAL — automated half green, perceptual half
unchanged).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/shell/TheiaService.sys.mjs` | Backend supervisor with correct one-time init gating, correct probe gating, quit-observer ordering, AND a Retry path that respects the classification it was given | ✓ VERIFIED | Regression-checked; unaffected by 01-16/01-17; confirmed not in either plan's `files_modified` |
| `powerbrowser/shell/powerbrowser.js` | Entry point with terminal handlers, no DOM-write bypass, Retry affordance reflecting recoverability | ✓ VERIFIED | Regression-checked |
| `scripts/verify-shell-error-contract.mjs` | Behavioral contract checker for the error layer and probe gate | ✓ VERIFIED | 4/4 scenarios + 10/10 self-test rows PASS, run directly this pass |
| `scripts/verify-shell-error-copy.mjs` | Static gate enforcing no raw internal identifier/exception text reaches the error layer, with no escape hatch | ✗ STUB-LIKE (defeatable, third shape found) | Accept-set derivation (01-14) and the two CR-03 shapes (01-16) are sound; the new completeness COUNT the fix added is itself defeatable by a receiverless call (cancels with `definitions`) and a `.bind` alias (invisible to both counters) — reproduced |
| `scripts/scan-brand-residue.mjs` + `scripts/rebase-upstream.sh` | A permanent gate that also catches a brand token reintroduced by an upstream rebase | ✓ VERIFIED | `--extra-root` mode (01-15/01-17) now correctly rejects a coincidental-row-claimed token and an unreadable file carrying a token — both reproduced as exit 1 against the shipped script in this pass |
| `scripts/verify-platform.sh` | Single registry, `--quick` green | ✓ VERIFIED | 24/24 PASS, run directly this pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowserRetry()` | `TheiaService.retry()`'s classification guard | direct call, no DOM bypass | ✓ WIRED | Regression-checked |
| `_showError`'s classification | `errorRetryButton.hidden` / `_errorRecoverable` | latch/clear pair | ✓ WIRED | Regression-checked |
| `rebase-upstream.sh`'s post-replay check | the actual rewritten `upstream/` tree | `--extra-root $UPSTREAM_DIR` → `extraRootFiles()` → `scan()` | ✓ WIRED | Reaches the tree, filters `coincidental` rows out of the extra-root row set, and now fails on an unreadable file — all three reproduced this pass |
| `_showError()` call sites | a validated `USER_MESSAGE` table entry only | derived accept set (rule 4) + a second, independently derived call-site count | ⚠️ PARTIALLY WIRED | The accept-side derivation is sound; the two CR-03 shapes are closed; the completeness COUNT protecting the enumeration step is itself defeatable by a receiverless call and a `.bind` alias — reproduced this pass |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (24 checks) | `scripts/verify-platform.sh --quick` (run directly this pass) | PASS, 24/24 | ✓ PASS |
| `shell-error-copy-no-internals --self-test` | `node scripts/verify-shell-error-copy.mjs --self-test` | 12/12 rows PASS | ✓ PASS (but does not cover the two shapes below) |
| `scan-brand-residue --self-test` | `node scripts/scan-brand-residue.mjs --self-test` | run via `--quick`; PASS | ✓ PASS |
| CR-01 (this pass): a receiverless, line-initial `_showError(err.message, ...)` call is enumerated and rejected | Reproduced directly this pass: scratch copy of `TheiaService.sys.mjs` with an appended receiverless call | exit **0** (should be non-zero) | ✗ FAIL (gap, reproduced) |
| WR-01: a `.bind`-aliased `_showError` call site with `err.message` is enumerated and rejected | Reproduced directly this pass: scratch copy with `const show = this._showError.bind(this); show(err.message, ...)` | exit **0** (should be non-zero) | ✗ FAIL (gap, reproduced) |
| Prior-pass CR-01 (coincidental-row exemption under `--extra-root`) is now caught | Reproduced directly this pass: `MOZ_OBJDIR=/home/chris/coding/sourcerer/objdir` under a scratch `--extra-root` | exit **1**, names the file and token | ✓ PASS (gap closed) |
| Prior-pass CR-02 (unreadable file silently skipped under `--extra-root`) is now caught | Reproduced directly this pass: `chmod 000` file containing a brand token under a scratch `--extra-root` | exit **1**, "1 unreadable file(s) under --extra-root ... FAIL" | ✓ PASS (gap closed) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED (present state); regression-prevention gap now closed | The `--extra-root` gate that catches a rebase-reintroduced brand token is now genuinely sound (Truth 8 flipped to VERIFIED this pass) |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Unchanged, regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED (present state); rebase-regression half now closed, copy-safety half still open | Truth 8 closed; Truth 7 (copy-safety gate) still open, see below |
| MIG-04 | Renamed tree builds and boots under branding, and works as an actual browser | ✗ NOT SATISFIED | Truth 7 still FAILED: a browser whose user-facing error layer's leak-prevention gate can be silently defeated (by a receiverless call or a `.bind` alias, both reproduced this pass) is not proven to "work as an actual web browser" under CLAUDE.md's own bar |
| GUI-01 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-03 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | Unchanged from prior pass |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Unchanged, regression-checked |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Unchanged, regression-checked |

No orphaned requirements: all 8 phase-1 requirement IDs appear in at least one plan's `requirements`
frontmatter (confirmed across all `01-*-PLAN.md` files, including 01-16 and 01-17 which both carry the
full phase requirement set). GUI-02 correctly absent (deferred to v2).

REQUIREMENTS.md's traceability table (lines 260-268) still reads MIG-01/02/03/04 and SEC-01 as flatly
"Complete" while the top-of-file checklist correctly leaves MIG-04 and SEC-01 unchecked with an inline
note explaining the evidence basis — this pre-existing documentation-currency mismatch is unchanged by
01-16/01-17 and is not itself a code gap; it is the same finding the prior two verification passes
already recorded for a different set of rows.

### Anti-Patterns Found

`grep -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` over both files touched by 01-16/01-17
(`scripts/verify-shell-error-copy.mjs`, `scripts/scan-brand-residue.mjs`): zero matches. No debt
markers. CR-01 (this pass) and WR-01 are gate-correctness gaps in checking code — a hand-written
pattern about call shape that is not truly independent of the shape it is meant to cross-check — not
stubs or placeholders.

`01-REVIEW.md`'s remaining Warning-tier findings (WR-02 through WR-09) and Info-tier findings (IN-01
through IN-04) are not elevated to blocking here, consistent with the review's own severity
classification, except WR-01 which is folded into Truth 7's gap above because it is the same class
of escape (an unexamined `_showError` call site) as CR-01, reproduced independently in this pass.
WR-02 (a quoted-key `USER_MESSAGE` entry drops silently) touches the same file and would be worth
folding into the same closure plan; it was independently reproduced by 01-REVIEW.md but is Warning,
not Critical, tier and is not required to close Truth 7's FAILED status.

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

**Truth 8 is genuinely closed this pass.** 01-17's `--extra-root` gate hardening is sound: the
`coincidental`-class row exemption is fixed with a stated, correct filter, and the unreadable-file
skip is fixed by collecting `{file, reason}` for every read failure and gating on it under
`--extra-root`. Both prior escape reproductions from the last verification pass now exit 1, and both
were re-run directly against the shipped script in this pass rather than accepted on 01-17-SUMMARY's
narrative.

**Truth 7 is not closed, for the third time in a row, in a new shape.** 01-16 correctly closed CR-03's
two named call shapes (a comma-less call, an optional-chaining receiver) by adding a second,
independently derived call-site count and asserting equality with the enumeration regex's count. A
fresh code review (01-REVIEW.md, committed after 01-16 and 01-17 both landed) found the new count
itself is not independent of the shape it is meant to cross-check: its `definitions` term
(`/^\s*_showError\s*\(/gm`, "a line-initial `_showError(`") is meant to identify the one method
definition but also matches a bare CALL written at the start of a line, so appending such a call moves
both the raw total and `definitions` together, leaving the derived `present` unchanged and the
assertion agreeing with itself. This pass independently reproduced that exact input against the
shipped checker (`_showError(err.message, false, []);` appended to a scratch copy of
`TheiaService.sys.mjs`, exit 0) and a second, separate escape (a `.bind`-aliased call site, invisible
to both counters because neither matches `_showError.bind(` as an occurrence of `_showError(`, also
exit 0). Neither shape is among the 12 rows the checker's own `--self-test` plants, so the self-test
does not catch its own checker's blind spot.

Today's shipped call sites in `TheiaService.sys.mjs` all use `this._showError(` with a trailing comma
(confirmed 5/5 parsed), so there is no live leak in the product today. But this is the pattern
CLAUDE.md's "derive from the tree and compare; do not hand-keep an expectation list" rule exists to
prevent, recurring a third time in the same file: CR-A (an accept-side regex admitting any
`<x>.message`) closed by 01-14; CR-03's two named enumeration shapes closed by 01-16; this shape
(a hand-written pattern about call SHAPE, not a true independent derivation) open now. The review's
proposed fix — compare a POSITION SET rather than a difference of two counts, since a set-membership
check cannot exhibit the cancel-in-tandem failure a subtraction can — is recorded verbatim in this
report's `gaps` frontmatter for the next closure plan.

Because a FAILED truth outranks a closed gap in the status decision tree, this pass's overall status
remains **gaps_found**, though the score improved from 8/12 to 9/12 and one of the prior pass's two
gaps (Truth 8) is genuinely resolved. Two success criteria (GUI-01, GUI-03) still have their
perceptual halves un-performed, carried forward unchanged from the prior pass and from `WINDOWS.md`
(ledger items 15, 16). WINDOWS.md ledger item 19's tier-3 regression re-confirmation also remains
unrun, deferred to the phase gate.

---

_Verified: 2026-08-31T23:55:00Z_
_Verifier: Claude (gsd-verifier)_
