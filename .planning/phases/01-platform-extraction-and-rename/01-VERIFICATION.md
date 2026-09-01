---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T23:59:00Z
status: gaps_found
score: 12/13 must-haves verified (1 prior gap genuinely closed this pass; 1 new blocker found by a fresh review after two UAT-driven gap-closure plans landed)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/12
  gaps_closed:
    - "Truth 7 (copy-safety gate for _showError cannot be defeated) — genuinely fixed since the last verification pass. 01-REVIEW-FIX.md's CR-01 fix replaced the count-based completeness guard with a position-set comparison (allSites/defs/parsed by construction), and its WR-01 fix added an `escapes` check rejecting any `_showError` not immediately followed by `(`. Independently reproduced in THIS pass, not accepted on the fix report's narrative: appending a receiverless `_showError(err.message, false, []);` to a scratch copy of the shipped `TheiaService.sys.mjs` now exits 1 (\"1 `_showError(` call site(s) ... were not parsed\"); a `.bind`-aliased call site (`const show = this._showError.bind(this); show(err.message, ...)`) now exits 1 (\"`_showError` is referenced without being called\"). Both were exit-0 escapes in the prior pass. `--self-test` now carries 15/15 rows, including both new fault rows, all green."
  gaps_remaining: []
  regressions: []
  new_gaps_this_pass:
    - "CR-01 (about:license suppressed alongside the Mozilla links) — not a regression of anything scored in the prior pass. It is a NEW defect introduced by plan 01-18 (which ran after the prior verification pass, to close a UAT-found gap, G-01-3) and caught by a fresh code review (01-REVIEW.md, committed after 01-18/01-19 both landed) that this pass independently reproduced against the current tree by reading the shipped CSS and the upstream markup it targets."
gaps:
  - truth: "Debranding the About dialog must not remove the user's access to a legitimate, internal product affordance — specifically, the aggregated open-source licence text at `about:license`, the product's only in-UI route to it — while suppressing the stock Mozilla-destined outbound links (donate/get-involved/terms/privacy) that are the actual reported defect (UAT gap G-01-3)."
    status: failed
    reason: >
      `powerbrowser/branding/{dev,release}/content/aboutDialog.css` (both variants, byte-identical)
      suppresses `#bottomBox > hbox` wholesale via `display: none`. `upstream/browser/base/content/aboutDialog.xhtml:138-143`
      shows that container's three children: `about:license` (an internal, `useoriginprincipal="true"`
      page — the ONLY in-product route to the aggregated open-source licence text for everything this
      build links), then two outbound `https://www.mozilla.org/...` links (terms, privacy). Two of the
      three are the reported defect; the first is not. The rule hides all three as one unit, so the
      licence disclosure link disappears as a side effect of removing the Mozilla-branded ones, and
      nothing replaces it — there is no Power-Browser-authored licence surface in this tree, and
      CLAUDE.md's rule 5 forbids authoring one (custom browser chrome).

      Read directly in this pass, not accepted on 01-REVIEW.md's or 01-18-SUMMARY's narrative:
      `powerbrowser/branding/release/content/aboutDialog.css` lines 51-55 read exactly
      `#communityDesc, #contributeDesc, #bottomBox > hbox { display: none; }` in the current tree
      (dev variant is byte-identical, confirmed), and `upstream/browser/base/content/aboutDialog.xhtml`
      lines 138-143 confirm `#bottomBox > hbox` is the single container wrapping all three
      `<label is="text-link" class="bottom-link">` rows, `about:license` first. No selector in the
      shipped stylesheet distinguishes the internal link from the two outbound ones.

      This was introduced by plan 01-18 (commit `e24f210`, "fix"), whose own SUMMARY frontmatter
      claims `requirements-completed: [MIG-03, MIG-04]` — i.e. this plan is the one both requirements'
      completion rests on for the About-dialog surface — and it is exactly the kind of "actual web
      browser" regression the phase goal and CLAUDE.md's licence-visibility framing both name.
      `deferred-items.md` row 11 records the "hidden, not removed" design choice and the risk that a
      future ESR rebase could silently un-hide the rows, but it does NOT record that the current
      selector removes a legitimate link TODAY, so this defect is undocumented as well as unfixed.
      Neither `scripts/verify-branding-preflight.mjs` (which asserts packaging completeness, not
      selector correctness — confirmed by reading section 9) nor any other registered check asserts
      that the suppression selectors target only outbound links; 01-REVIEW.md's WR-03 independently
      makes the same point about the selectors having no gate at all.
    artifacts:
      - path: "powerbrowser/branding/dev/content/aboutDialog.css"
        issue: "Lines 51-55: `#bottomBox > hbox { display: none; }` hides the entire link row, including `about:license` at index 0, not only the two `https://www.mozilla.org/...` rows at index 1-2."
      - path: "powerbrowser/branding/release/content/aboutDialog.css"
        issue: "Byte-identical to dev; same defect."
    missing:
      - "Replace the container selector with a target selector, e.g. `#bottomBox > hbox > .bottom-link[href^=\"https://www.mozilla.org\"] { display: none; }`, which keeps the row's `pack=\"center\"` layout with only the internal `about:license` link visible, and update the file's comment (which currently mischaracterises the row as entirely outbound) to say why the internal link stays."
      - "A registered check (or a self-test row on the existing branding-preflight registry entry) asserting that the shipped suppression selectors never match `about:license`'s label, so a future edit to this file cannot silently regress it — WR-03 in 01-REVIEW.md proposes the same fix independently."
      - "A pass over `deferred-items.md` row 11 correcting it: it should record that the CURRENT selector removes a legitimate disclosure link, not only that a future ESR rebase might."
deferred: []
human_verification:
  - test: "Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a repackaged binary (WINDOWS.md ledger item 19, still `open`)."
    expected: "Neither check moves, since neither clicks Retry — 01-11's error-layer visibility change is not expected to affect either scenario."
    why_human: "Requires a `./mach build faster` repackage and a running binary; explicitly deferred to the phase gate, not run by this static verification pass, and not covered by the live UAT session (01-UAT.md's 41 tests do not include these two)."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T23:59:00Z
**Status:** gaps_found
**Re-verification:** Yes — against the state after live UAT (01-UAT.md, 40/41 pass, 2 gaps: G-01-3,
G-01-25), the two gap-closure plans that followed (01-18, 01-19), and a fresh code review committed
after both landed (01-REVIEW.md, `ddbc8f4`) that found a new Critical-tier defect in 01-18's own fix.

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate) — not scored here, not
orphaned (it appears in 01-06's plan frontmatter, the deferral is recorded, nothing is missing).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` + self-test, run directly this pass via `--quick` |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests | ✓ VERIFIED | Historical build evidence (01-04) unaffected by 01-16 through 01-19; UAT tests 1, 35 pass; not rebuilt this pass (cost, per instruction) |
| 2b | Backend supervisor's state-gating conflation and unguarded throw sites closed | ✓ VERIFIED | Regression-checked; files unaffected by 01-16 through 01-19 |
| 2c | A failed Retry does not permanently disable the error layer for the rest of the session | ✓ VERIFIED | `shell-error-contract: PASS`, run directly this pass; UAT test 9 pass (live, user-confirmed) |
| 2d | An unrecoverable failure classification prevents re-entry into the failed launch path | ✓ VERIFIED | `shell-error-contract`/self-test PASS run directly; UAT test 8 pass (live, user-confirmed) |
| 2e | Quit observer and state-file path established before any backend-spawning path | ✓ VERIFIED | `start-path-recovery: PASS` + self-test, run directly this pass; UAT test 10 pass |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ✓ VERIFIED | `gui04-registry-shape` + self-test PASS, run directly; UAT test 2 pass — 5-step walkthrough (address bar focus, in-window modal, close-returns-to-shell) live-confirmed by the user 2026-09-01 |
| 4 | SC4 — Runtime restyle via customize bridge, no fork | ✓ VERIFIED | `theia/extensions/customize/*` present and wired; UAT test 6 pass — "red outline+top-panel rule appeared within ~1s of write, reverted on delete. Both halves confirmed by user." |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | `branding-preflight` + self-test PASS, run directly; UAT tests 24-27 pass; G-01-25 (title-bar identifier leak, found by UAT) closed by 01-19 and regression-checked here |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; UAT tests 34, 37 pass |
| 7 | No raw internal identifier, pref key, or exception message can reach the user-facing error layer, enforced by a gate that cannot be defeated | ✓ VERIFIED (newly closed this pass) | Independently reproduced against the shipped checker: the receiverless-call shape and the `.bind`-alias shape (both FAILED as recently as the prior verification pass) now each exit 1 by name; `--self-test` 15/15 rows PASS including both new fault rows |
| 8 | The residual-brand scan fails on a brand token reintroduced by an upstream rebase | ✓ VERIFIED | Regression-checked; `scan-brand-residue-self-test` PASS, unaffected by 01-18/01-19 |
| 9 | Debranding the About dialog must not remove a legitimate internal disclosure (`about:license`) while suppressing the reported Mozilla-outbound links | ✗ FAILED | `#bottomBox > hbox { display: none; }` in both variant stylesheets hides all three children of that container, including `about:license` at index 0 — read directly against the shipped CSS and the upstream markup it targets in this pass |

**Score:** 12/13 truths verified (1 flipped from FAILED to VERIFIED this pass — the old copy-safety
gate defeat, closed for real; 1 new FAILED — a different defect, introduced by the gap-closure work
that ran after the prior verification pass, found by a fresh review, independently reproduced here).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/shell/TheiaService.sys.mjs`, `powerbrowser.js` | Supervisor with correct init gating, quit-observer ordering, classification-respecting Retry | ✓ VERIFIED | Regression-checked; unaffected by 01-16 through 01-19 |
| `scripts/verify-shell-error-contract.mjs` | Behavioral contract checker for the error layer and probe gate | ✓ VERIFIED | 4/4 scenarios + 10/10 self-test rows PASS, run directly |
| `scripts/verify-shell-error-copy.mjs` | Static gate enforcing no raw internal identifier/exception text reaches the error layer | ✓ VERIFIED | Both previously-defeating shapes (receiverless call, `.bind` alias) now rejected by name; 15/15 self-test rows PASS |
| `scripts/scan-brand-residue.mjs` + `scripts/rebase-upstream.sh` | A permanent gate that catches a brand token reintroduced by an upstream rebase | ✓ VERIFIED | Regression-checked; unaffected by 01-18/01-19 |
| `scripts/verify-registry-shape.mjs`, `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` | `TabUriRegistry`'s exported shape stays asserted and landable | ✓ VERIFIED | File exists at the expected path; `gui04-registry-shape` + self-test PASS |
| `theia/extensions/customize/src/browser/{customize-css-contribution,customize-privileged-js-contribution,customize-frontend-module}.ts` | Runtime CSS layer + dev-flagged privileged JS bridge | ✓ VERIFIED | Present, compiled to `lib/`, wired into `customize-frontend-module`; live-confirmed by UAT test 6 |
| `powerbrowser/shell/powerbrowser.xhtml` | Shell chrome document; title bar and loading wordmark in display form, no identifier leak | ✓ VERIFIED | `<title>Power Browser</title>` and `#powerbrowser-loading` both read the spaced form; regression-checked via `branding-preflight`'s section-6 derivation |
| `powerbrowser/branding/{dev,release}/content/aboutDialog.css` | Suppresses only the reported stock Mozilla-destined link rows, preserving the internal `about:license` disclosure | ✗ DEFECTIVE | Packaging is correct (loads via `jar.mn`, both variants byte-identical) but the suppression selector `#bottomBox > hbox` is broader than the file's own comment claims — it removes `about:license` alongside the two Mozilla links (Truth 9) |
| `scripts/verify-branding-preflight.mjs` | Packaging-completeness gate for branding chrome resources; shell-markup display-surface leak scan | ✓ VERIFIED (packaging) / ⚠️ does not cover selector correctness | Section 9 (packaging) and section 6 (leak scan) both self-test clean; neither asserts that a suppression selector targets only the intended link class — this is exactly the gap Truth 9 exploits, independently named by 01-REVIEW.md's WR-03 |
| `scripts/verify-platform.sh` | Single registry, `--quick` green | ✓ VERIFIED | 24/24 PASS, run directly this pass (3.1s wall) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowserRetry()` | `TheiaService.retry()`'s classification guard | direct call, no DOM bypass | ✓ WIRED | Regression-checked |
| `_showError()` call sites | a validated `USER_MESSAGE` table entry only | position-set completeness (`allSites`/`defs`/`parsed`) + `escapes` rejection | ✓ WIRED | Both previously-open escapes now rejected by name, reproduced this pass |
| `rebase-upstream.sh`'s post-replay check | the rewritten `upstream/` tree | `--extra-root $UPSTREAM_DIR` → `extraRootFiles()` → `scan()` | ✓ WIRED | Regression-checked (unaffected by 01-18/01-19) |
| `powerbrowser/branding/*/content/jar.mn` | `aboutDialog.css` | packaging manifest entry | ✓ WIRED | Symlinked into `objdir/dist/bin/...`, confirmed by 01-18-SUMMARY's `cmp`; packaging-completeness self-test PASS |
| `aboutDialog.css`'s suppression selector | upstream's actual DOM structure (`#bottomBox > hbox`'s three children) | CSS selector matching by container rather than by link target | ✗ MISWIRED | The selector matches at the wrong granularity: it reaches `about:license` (index 0) as well as the two intended targets (index 1-2), because nothing narrows the match to `.bottom-link[href^="https://www.mozilla.org"]` |
| `powerbrowser/shell/jar.mn` | `verify-branding-preflight.mjs` section 6's shell-markup leak scan | manifest read at check time | ✓ WIRED | Regression-checked; this is the derivation 01-19 added to close G-01-25 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (24 checks) | `bash scripts/verify-platform.sh --quick` (run directly this pass) | PASS, 24/24, 3.1s | ✓ PASS |
| `shell-error-copy-no-internals --self-test` | `node scripts/verify-shell-error-copy.mjs --self-test` | 15/15 rows PASS, including both previously-defeating rows | ✓ PASS |
| Receiverless line-initial `_showError(err.message, ...)` is rejected | Reproduced this pass: scratch copy of `TheiaService.sys.mjs` + appended call | exit **1**, names the offset | ✓ PASS (gap closed) |
| `.bind`-aliased `_showError` call site is rejected | Reproduced this pass: scratch copy + `const show = this._showError.bind(this); show(err.message, ...)` | exit **1**, "referenced without being called" | ✓ PASS (gap closed) |
| `#bottomBox > hbox` selector matches `about:license` as well as the two Mozilla links | Read directly against `powerbrowser/branding/release/content/aboutDialog.css:51-55` and `upstream/browser/base/content/aboutDialog.xhtml:138-143` | Selector matches the container; `about:license` is its first child | ✗ FAIL (new gap, this pass) |
| `--gate` (full registry + WINDOWS.md known-open exclusions) | `bash scripts/verify-platform.sh --gate` | Not completed — the command produced no output for 5+ minutes and, per its own source (`smoke-firefox.sh` in the registry), reaches the incremental `./mach build` path. Terminated rather than risk the ~47-54 min full build the phase brief explicitly says not to run. | ? SKIP (cost) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; its verification driver is
`scripts/verify-platform.sh`, covered above.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED | Regression-checked; `fetch-upstream-self-test` PASS |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED | G-01-25 (title-bar leak) closed by 01-19, regression-checked; Truth 9's defect is a disclosure-link regression, not an identifier-naming one, so it does not itself un-satisfy MIG-03's literal text |
| MIG-04 | Renamed tree builds and boots, works as an actual browser | ◐ SATISFIED (narrow build/boot text) / gap open at the phase-goal level | Build+boot+branding-identity evidence from 01-04 stands (UAT test 35 pass); but Truth 9 (About-dialog licence-link removal) is a real, unfixed defect in a browser surface that the SAME two requirements' completion (`requirements-completed: [MIG-03, MIG-04]`, per 01-18-SUMMARY) rests on for this file. See REQUIREMENTS.md discrepancy note below. |
| GUI-01 | Toggle Theia ↔ browser UI | ✓ SATISFIED | Automated (`gui04-registry-shape`) + human (UAT test 2, live, user-confirmed 2026-09-01) — though WINDOWS.md ledger item 15 is still marked `open`, a documentation-currency lag behind the UAT evidence, not a functional gap |
| GUI-03 | Runtime GUI customization bridge | ✓ SATISFIED | Automated + human (UAT test 6, live, user-confirmed) — WINDOWS.md ledger item 16 similarly stale |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Regression-checked |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Regression-checked |

**No orphaned requirements.** All 8 phase-1 requirement IDs (MIG-01/02/03/04, GUI-01/03/04, SEC-01)
appear in at least one plan's `requirements` frontmatter across all 19 `01-*-PLAN.md` files, confirmed
by direct grep this pass. GUI-02 correctly appears only in 01-06 and is recorded as deferred to v2 at
the D-22 gate — not orphaned, not scored here.

**REQUIREMENTS.md MIG-04 checkbox/traceability discrepancy — resolved, both halves read directly this
pass:**
- Line 19's checklist entry is `- [ ] **MIG-04**...`, unticked.
- The SAME line's inline HTML comment states MIG-04 was "CLOSED by plan 01-04, 2026-08-30, on evidence
  rather than frontmatter," and recites the actual evidence (smoke-firefox PASS at 2830s, smoke-theia
  PASS, six branding-identity surfaces green on the built artifact with a positive control) — real,
  substantive closure evidence, not an assertion.
- Line 263's traceability table reads `MIG-04 | Phase 1 | Complete — closed by 01-04's build...`.
- **Determination: the traceability table (line 263) is correct; the checklist checkbox (line 19) is
  stale and was never ticked when the inline comment was added.** This is the same class of
  documentation-currency defect as the WINDOWS.md ledger items above — real work is genuinely done,
  the tracking artifact recording it was not fully updated. It is not a functional gap and does not
  affect this report's score, but the checkbox should be corrected to `[x]` to stop this exact
  discrepancy from being re-litigated at the next verification pass.

### Anti-Patterns Found

`grep -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` over the seven files touched by 01-18/01-19 (both
`aboutDialog.css` variants, both `jar.mn` variants, `powerbrowser.xhtml`, `verify-branding-preflight.mjs`,
`verify-platform.sh`): zero matches. No debt markers.

Truth 9 (the `about:license` suppression) is a **selector-scope defect in shipped product logic**, not
a stub or placeholder — the CSS is fully implemented and does exactly what it says, but what it says
(suppress the whole container) is broader than what was asked (suppress the outbound rows).

01-REVIEW.md's remaining Warning-tier findings (WR-01 through WR-08) and Info-tier findings (IN-01,
IN-02) are not elevated to blocking here, consistent with the review's own severity classification.
WR-03 (no gate over the suppression selectors' correctness) is the direct cause of Truth 9 going
undetected and is worth folding into the same closure plan as CR-01, but it is a hardening
recommendation rather than an independent blocker.

## Human Verification Required

### 1. Tier-3 regression re-confirmation (WINDOWS.md ledger item 19)

**Test:** Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
repackaged binary (`./mach build faster`, minutes not the full ~47-54 min build).
**Expected:** Neither check moves, since neither clicks Retry.
**Why human:** Requires a running repackaged binary; explicitly deferred to the phase gate, not run
by this static verification pass and not among 01-UAT.md's 41 tests.

## Gaps Summary

**The prior verification pass's blocking gap is genuinely closed.** The `_showError()` copy-safety
gate's completeness check — defeated twice more since the phase started (CR-A closed by 01-14, CR-03's
two named shapes closed by 01-16, then the completeness COUNT itself found defeatable by a receiverless
call and a `.bind` alias, per the prior verification pass) — is fixed by 01-REVIEW-FIX.md's structural
rewrite: a position-set comparison that cannot cancel the way a difference-of-counts check can, plus an
explicit `escapes` rejection for any `_showError` not immediately followed by `(`. Both previously
open shapes were independently reproduced against the shipped checker in THIS pass and both now exit 1.

**Between that verification pass and this one, a live UAT session ran and found two real gaps** (G-01-3:
stock Mozilla About-dialog links; G-01-25: shell window title bar leaking the compact identifier form),
**both closed by dedicated plans (01-18, 01-19) with genuine, regression-checked fixes** — the title-bar
correction and its detection-gap closure (deriving the leak scan's file set from `powerbrowser/shell/jar.mn`
rather than a hand-kept path) are sound and verified directly in this pass.

**But 01-18's fix for G-01-3 introduced a new defect, found by a fresh code review after both
gap-closure plans landed, and independently reproduced here.** `#bottomBox > hbox { display: none; }`
suppresses the whole three-link row instead of only the two Mozilla-destined ones, taking
`about:license` — the product's only in-UI route to its aggregated open-source licence text — down
with it. This is not a hypothetical: the CSS in the tree right now, read directly against the upstream
markup it targets, confirms the selector cannot distinguish the internal link from the outbound ones.
Nothing in the registered check set catches this (branding-preflight asserts packaging completeness,
not selector correctness), and `deferred-items.md` row 11 documents the "hidden not removed" design
choice without recording that the CURRENT selector already removes more than it should.

Because this is a Critical-tier, reproduced, unfixed defect in a user-facing browser surface — one
whose closure this same plan claims against MIG-03 and MIG-04 in its own SUMMARY frontmatter — the
overall status stays **gaps_found**, even though the score improved (9/12 → 12/13, with the ratio
shift reflecting one closed gap and one new, differently-shaped one added to the denominator).

One human-verification item remains open and unrun: the tier-3 regression re-confirmation named by
WINDOWS.md ledger item 19. Ledger items 15 and 16 (GUI-01 and GUI-03 perceptual walkthroughs) are
functionally resolved — 01-UAT.md records live, user-confirmed passes for both on 2026-09-01 — but the
ledger rows themselves are still marked `open`, a documentation-currency lag rather than an open
functional question; recommend updating WINDOWS.md alongside the REQUIREMENTS.md MIG-04 checkbox noted
above.

---

_Verified: 2026-08-31T23:59:00Z_
_Verifier: Claude (gsd-verifier)_
