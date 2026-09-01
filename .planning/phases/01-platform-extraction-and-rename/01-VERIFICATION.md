---
phase: 01-platform-extraction-and-rename
verified: 2026-09-01T12:00:00Z
status: gaps_found
score: 12/13 must-haves verified (Truth 9's original over-reach half genuinely closed by 01-20; a
  narrower but Critical-tier coverage gap in the check that was supposed to guard this exact
  surface is independently reproduced this pass and stays open)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/13
  gaps_closed:
    - "Truth 9 (about:license suppressed alongside the Mozilla links) — genuinely closed for the
      over-reach direction it names. Read directly this pass: powerbrowser/branding/{dev,release}/content/aboutDialog.css
      now ships `#bottomBox > hbox > .bottom-link[href^=\"https://www.mozilla.org\"]` in place of
      the bare `#bottomBox > hbox` container selector; both variants remain byte-identical (`cmp`
      clean, reproduced). Ran `node scripts/verify-about-dialog-suppression.mjs` directly against
      the current tree: exit 0. Ran `--self-test`: 4/4 planted faults (internal-link suppression,
      stale selector, empty selector set, missing premise) each independently reproduced as RED,
      naming the drift, plus a green control. `about:license` is confirmed unreachable by any
      shipped selector; both mozilla.org links are confirmed currently suppressed."
  gaps_remaining: []
  regressions: []
  new_gaps_this_pass:
    - "CR-02 (the About-dialog suppression gate has no coverage assertion) — not a regression of
      anything scored in the prior pass; it is a defect in the NEW verification artifact plan
      01-20 built specifically to close Truth 9, found by a fresh code review (01-REVIEW.md pass
      2, committed at HEAD after 01-20 landed) and independently reproduced against the current
      tree in this pass rather than accepted on the review's narrative."
gaps:
  - truth: "The registered check built to close Truth 9 (`scripts/verify-about-dialog-suppression.mjs`,
      registry rows `about-dialog-suppression` / `about-dialog-suppression-self-test`) must fail
      by name if the About dialog's Mozilla-outbound links (the original reported defect, UAT
      G-01-3) are ever un-suppressed again — not only if `about:license` is suppressed."
    status: failed
    reason: >
      `runChecks()` in `scripts/verify-about-dialog-suppression.mjs` performs exactly four
      assertions: (1) non-vacuity of the derived selector/link sets, (2) every derived selector
      parses under the supported grammar, (3) staleness — every derived selector matches at least
      one element in the upstream markup, (4) over-reach — no derived selector reaches
      `about:license` or any of its ancestors. Nothing derives the set of outbound mozilla.org
      links from the markup and requires each one to be reached by a shipped selector. The check
      has no notion of coverage.

      Independently reproduced in this pass (not accepted on 01-REVIEW.md's narrative): a scratch
      copy of the shipped tree with the `#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]`
      selector deleted entirely (only `#communityDesc, #contributeDesc` remain) — i.e. the exact
      UAT G-01-3 defect (Terms of Use and Privacy Notice links visible again inside a
      Power-Browser-branded dialog) fully restored — still exits **0**:
      `verify-about-dialog-suppression: PASS -- every shipped suppression selector matches
      upstream markup and none reaches the about:license disclosure link`. The surviving selectors
      (`#communityDesc`, `#contributeDesc`) are still non-stale (they match real elements) and
      still don't reach `about:license`, so assertions 1-4 all pass having examined a tree that no
      longer suppresses either vendor link.

      This is a Critical-tier finding independently confirmed, not merely 01-REVIEW.md's CR-02
      accepted on narrative. `deferred-items.md` row 11(a), rewritten by 01-20's own Task 3, claims
      "the original row's OTHER concern... is now covered too" for the staleness case (an ESR
      rebase renaming a container id) — that claim is accurate for renames, but the row does not
      mention, and the checker does not cover, the simpler case of a selector being deleted or
      narrowed outright while the rest of the tree stays syntactically valid. So the corrected
      record itself still overstates the coverage this gate provides.

      The CURRENT shipped tree is not defective — both mozilla.org links are suppressed today,
      confirmed by direct read of the CSS and by running the checker against the unmutated tree —
      so this gap is about durability of the fix, not the fix's current state. But the entire
      reason 01-20 exists is "so the current defect cannot be reintroduced silently" (01-20 PLAN's
      own must_haves truth 2) and 01-REVIEW.md's WR-03 (the precedent this plan cites) asked for
      exactly this kind of derived-and-compared regression protection. A check that cannot go red
      on the regression it was purpose-built to prevent does not meet that bar, even though the
      narrower literal wording of 01-20's must-have (fails when a selector reaches `about:license`)
      is met.
    artifacts:
      - path: "scripts/verify-about-dialog-suppression.mjs"
        issue: "runChecks() (lines ~272-364) has no fifth assertion deriving the outbound
          mozilla.org link set from the markup and requiring each to be reached by a shipped
          selector; only over-reach (assertion 4) and staleness (assertion 3) are covered."
    missing:
      - "A fifth assertion in runChecks(), after the per-file loop: derive every external
        (http/https) link element from the parsed upstream markup and require each to be matched
        by at least one shipped suppression selector, failing by name (link description + file)
        for any that is not covered — 01-REVIEW.md's CR-02 proposes the exact patch."
      - "A --self-test row (e.g. deleting the mozilla.org selector from the fixture, leaving
        #communityDesc/#contributeDesc) that must go RED naming the surviving unsuppressed
        mozilla.org href, proving the new assertion actually gates rather than being green by
        construction."
      - "deferred-items.md row 11(a)'s claim that 'the original row's OTHER concern... is now
        covered too' should be scoped to the rename/staleness case only, not read as full
        regression coverage, until the fifth assertion lands."
deferred: []
behavior_unverified_items: []
human_verification:
  - test: "Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
      repackaged binary (WINDOWS.md ledger item 19, still `open`)."
    expected: "Neither check moves, since neither clicks Retry."
    why_human: "Requires a `./mach build faster` repackage and a running binary; explicitly
      deferred to the phase gate, not run by this static verification pass."
  - test: "A repackaged binary's About dialog renders 'Licensing Information' as the only visible
      bottom-row link, and clicking it opens the aggregated open-source licence text; no Terms of
      Use or Privacy Notice row is present (01-20 PLAN's backstop truth, MIG-04 boot-failure edge)."
    expected: "One visible link, correctly labelled, correctly routed."
    why_human: "Needs `./mach build faster` (minutes, not the ~47-54 min full build) and a launched
      binary. 01-20-SUMMARY records this explicitly as `human_needed`, not a silent pass. The
      static gate proves the selector cannot reach the licence link in upstream's markup; it does
      not prove the pixels. Not run in this pass per the phase-gate cost instruction."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-09-01T12:00:00Z
**Status:** gaps_found
**Re-verification:** Yes — third pass. Prior pass (2026-08-31, score 12/13) found Truth 9 (the
About dialog's `about:license` link suppressed alongside the reported Mozilla-outbound links)
FAILED. Plan 01-20 was written and executed specifically to close that gap. A code review
(01-REVIEW.md, cumulative, pass 2 committed at HEAD `de88cce`) confirms 01-20's fix (CR-01) but
finds a new Critical-tier defect (CR-02) in the check 01-20 registered to guard the fix. This pass
independently reproduces both the fix and the new defect against the current tree — neither is
accepted on narrative.

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate) — not scored here, not
orphaned.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` (110 files), run directly this pass |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests | ✓ VERIFIED | Historical build evidence (01-04) unaffected by 01-20; not rebuilt this pass (cost, per instruction) |
| 2b-2e | Backend supervisor error-layer contract truths (state-gating, quit-observer ordering, retry classification) | ✓ VERIFIED | Regression-checked; `shell-error-contract`, `start-path-recovery` + self-tests PASS, run directly; files unaffected by 01-20 |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ✓ VERIFIED | `gui04-registry-shape` + self-test PASS, run directly; unaffected by 01-20 |
| 4 | SC4 — Runtime restyle via customize bridge, no fork | ✓ VERIFIED | Regression-checked; unaffected by 01-20 |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | `branding-preflight` + self-test PASS, run directly; unaffected by 01-20 |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; unaffected by 01-20 |
| 7 | No raw internal identifier can reach the user-facing error layer, gate cannot be defeated | ✓ VERIFIED | `shell-error-copy-no-internals` + self-test PASS (15/15 rows), run directly; unaffected by 01-20 |
| 8 | The residual-brand scan fails on a brand token reintroduced by an upstream rebase | ✓ VERIFIED | Regression-checked; `scan-brand-residue-self-test` PASS |
| 9a | The About dialog's `about:license` disclosure link is NOT suppressed by the debranding rule (over-reach direction) | ✓ VERIFIED (newly closed) | `powerbrowser/branding/{dev,release}/content/aboutDialog.css` now ships `#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]` in place of the bare container selector; read directly this pass. `verify-about-dialog-suppression` exits 0 against the current tree; `--self-test` fault (a) (restoring the pre-fix selector) independently reproduced as RED naming `about:license` |
| 9b | The About dialog's Mozilla-outbound links (Terms/Privacy, UAT G-01-3) stay suppressed TODAY | ✓ VERIFIED (current state) | Read directly: the qualified selector matches both mozilla.org hrefs in `upstream/browser/base/content/aboutDialog.xhtml`; neither renders |
| 9c | A registered check fails by name if the Mozilla-outbound suppression (9b) is ever removed or narrowed | ✗ FAILED (new gap) | Independently reproduced: deleting the mozilla.org selector entirely from a scratch copy of the shipped tree — fully restoring the original G-01-3 defect — still exits 0 from `verify-about-dialog-suppression.mjs`. `runChecks()` has no coverage assertion; see CR-02 and the Gaps Summary below |

**Score:** 12/13 truths verified (Truth 9 is split into three sub-truths this pass to separate the
over-reach direction that 01-20 fixed from the coverage/regression-reintroduction direction that
01-20's own check does not gate; 9a and 9b hold, 9c fails).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/branding/{dev,release}/content/aboutDialog.css` | Suppresses only the reported stock Mozilla-destined link rows, preserving the internal `about:license` disclosure | ✓ VERIFIED (current state) | Read directly; selector qualified by `href^="https://www.mozilla.org"`; both variants byte-identical (`cmp` clean, reproduced) |
| `scripts/verify-about-dialog-suppression.mjs` | Derived-both-sides gate over the About dialog's suppression selectors, with a planted-fault `--self-test` | ⚠️ INCOMPLETE GATE | Over-reach (assertion 4) and staleness (assertion 3) are real and independently reproduced as working. No coverage assertion exists — the gate cannot detect the exact regression (G-01-3) it exists to prevent, independently reproduced this pass |
| `scripts/verify-platform.sh` registry rows `about-dialog-suppression`, `about-dialog-suppression-self-test` | Reachable via `--only`; `--quick` stays green, one row longer (25) | ✓ VERIFIED | `git diff --stat d3a43ff..10dc32d -- scripts/verify-platform.sh` = 32 insertions, 0 deletions (no existing row removed); `--quick` run directly this pass: 25/25 PASS; `--only about-dialog-suppression` and `--only about-dialog-suppression-self-test` both run directly and PASS |
| `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` row 11 | Corrected to record the defect that existed, not only a future risk | ✓ VERIFIED (with a caveat) | Read directly; row 11(a) now states the defect was live, names 01-VERIFICATION.md Truth 9 and 01-REVIEW.md CR-01, and records the closure. Its claim that the ESR-rebase risk is "now covered too" is accurate for renames but does not disclose the coverage gap (9c/CR-02) — see missing item above |
| `.planning/WINDOWS.md` ledger rows 15, 16 | Moved from `open` to resolved, citing UAT evidence | ✓ VERIFIED | Read directly; both rows now read `fixed`, citing 01-UAT.md tests 2 and 6 and the 2026-09-01 confirmation; row 19 still `open` as intended |
| `.planning/REQUIREMENTS.md` line 19 | MIG-04 checklist ticked to `[x]` | ✓ VERIFIED | Read directly: `- [x] **MIG-04**...`; `git diff` scope matches the plan's stated single-line change |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowser/branding/*/content/aboutDialog.css` suppression selector | upstream's actual DOM (`#bottomBox`'s three children) | href-qualified CSS selector matching, checked by `verify-about-dialog-suppression.mjs` | ✓ WIRED (for over-reach and staleness) / ✗ NOT WIRED (for coverage) | The selector correctly spares `about:license` today and the checker catches over-reach and staleness regressions; it does not catch a coverage regression (selector deleted/narrowed), independently reproduced |
| `scripts/verify-about-dialog-suppression.mjs` | `scripts/verify-platform.sh` registry | two rows (`about-dialog-suppression`, `-self-test`), reached via `--only` | ✓ WIRED | Both run directly this pass, both PASS; no sibling driver created (single 32-insertion diff) |
| `powerbrowser/branding/*/content/jar.mn` | `aboutDialog.css` | packaging manifest entry | ✓ WIRED | Regression-checked; unaffected by 01-20 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (25 checks) | `bash scripts/verify-platform.sh --quick` (run directly this pass) | PASS, 25/25 | ✓ PASS |
| `verify-about-dialog-suppression --self-test` | `node scripts/verify-about-dialog-suppression.mjs --self-test` (run directly this pass) | Green control + 4/4 planted faults RED, each naming the drift | ✓ PASS |
| `verify-about-dialog-suppression` against the unmutated shipped tree | `node scripts/verify-about-dialog-suppression.mjs` | exit 0 | ✓ PASS |
| Coverage regression: mozilla.org suppression selector deleted entirely from a scratch copy (restores G-01-3 in full) | Reproduced this pass: copied script + both stylesheets + upstream markup into a scratch root, deleted the third selector, ran the checker against the mutated root | exit **0** — "PASS -- every shipped suppression selector matches upstream markup and none reaches the about:license disclosure link" | ✗ FAIL (CR-02, independently confirmed) |
| `node scripts/scan-brand-residue.mjs` with the new script staged | Run directly this pass | PASS, 110 files scanned, exit 0 | ✓ PASS |
| `--gate` (full registry + WINDOWS.md exclusions) | `bash scripts/verify-platform.sh --gate` | Not run — reaches the incremental `./mach build` path (~47-54 min); explicitly out of scope per instruction | ? SKIP (cost) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; its verification driver
is `scripts/verify-platform.sh`, covered above.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED | Regression-checked; `fetch-upstream-self-test` PASS |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Regression-checked |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED | Unaffected by 01-20's surface (About-dialog links, not identifier naming) |
| MIG-04 | Renamed tree builds and boots, works as an actual browser | ◐ SATISFIED (build/boot text) / gap open at phase-goal narrative level | Build+boot evidence from 01-04 stands. The About-dialog licence-disclosure defect that partially blocked this requirement is fixed for its current state (9a/9b), but the check meant to keep it fixed durably has a Critical-tier coverage hole (9c) that this same plan's SUMMARY claims against MIG-04. REQUIREMENTS.md line 19 is now correctly ticked `[x]`, matching the traceability table — that documentation-currency issue from the prior pass is resolved. |
| GUI-01 | Toggle Theia ↔ browser UI | ✓ SATISFIED | Regression-checked; unaffected by 01-20 |
| GUI-03 | Runtime GUI customization bridge | ✓ SATISFIED | Regression-checked; unaffected by 01-20 |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Regression-checked; unaffected by 01-20 |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Regression-checked; unaffected by 01-20 |

**No orphaned requirements.** 01-20's frontmatter declares MIG-03 and MIG-04; both already appear in
the phase's requirement set. All 8 phase-1 requirement IDs remain accounted for.

### Anti-Patterns Found

`grep -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` over the four files 01-20 modified (both
`aboutDialog.css` variants, `scripts/verify-about-dialog-suppression.mjs`,
`scripts/verify-platform.sh`): zero matches. No debt markers.

`verify-about-dialog-suppression.mjs`'s CR-02 gap (missing coverage assertion) is a **logic gap in
shipped verification tooling**, not a stub or placeholder — the four assertions it does make are
fully implemented and each independently reproduced as working for what they check. What it does
not check (coverage of the outbound links) is simply absent, not stubbed.

01-REVIEW.md's remaining Warning-tier findings for this surface (WR-01, WR-02, WR-04 through
WR-13) and Info-tier findings (IN-01 through IN-04) are not elevated to blocking here, consistent
with the review's own severity classification and this project's convention of scoring only
Critical-tier findings as gaps. WR-08 (the `#communityExperimentalDesc` mozilla.org link, dormant
at the current ESR version string) is a distinct, pre-existing scope question about G-01-3's
original boundary, not part of Truth 9's reopened scope, and is not elevated here.

## Human Verification Required

### 1. Tier-3 regression re-confirmation (WINDOWS.md ledger item 19)

**Test:** Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
repackaged binary.
**Expected:** Neither check moves, since neither clicks Retry.
**Why human:** Requires a running repackaged binary; explicitly deferred to the phase gate.

### 2. About-dialog backstop truth (01-20 PLAN's `verification: backstop` item)

**Test:** In a repackaged binary, open the About dialog and confirm `Licensing Information` is the
only visible bottom-row link, that it opens the aggregated open-source licence text, and that no
Terms of Use or Privacy Notice row is present.
**Expected:** One visible, correctly-routed link.
**Why human:** Needs `./mach build faster` and a launched binary; the static gate proves selector
logic against markup, not rendered pixels. 01-20-SUMMARY already records this as `human_needed`.

## Gaps Summary

**Truth 9's original defect — `about:license` suppressed alongside the reported Mozilla-outbound
links — is genuinely fixed.** Read directly this pass against the shipped CSS: the container
selector `#bottomBox > hbox` became `#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]`
in both byte-identical variants. `verify-about-dialog-suppression.mjs` exits 0 against the current
tree, and its `--self-test` independently reproduces all four planted faults as RED, including the
fault that restores the exact pre-fix selector and requires it to name `about:license`. This is not
accepted on 01-20-SUMMARY's or 01-REVIEW.md's narrative — both the CSS and the checker were run
directly in this pass.

**But the check plan 01-20 registered to guard this exact surface has a Critical-tier hole, and it
is real: it cannot detect the regression it exists to prevent.** `runChecks()` asserts non-vacuity,
grammar validity, staleness (a selector matching nothing), and over-reach (a selector reaching
`about:license`). It never asserts that the outbound mozilla.org links are actually suppressed. I
independently reproduced this: taking a scratch copy of the current, correctly-fixed tree and
deleting the mozilla.org selector entirely (restoring the original UAT G-01-3 defect — both vendor
links visible again inside a Power-Browser-branded dialog) still produces
`verify-about-dialog-suppression: PASS`, exit 0, and `bash scripts/verify-platform.sh --only
about-dialog-suppression` would report the same false PASS. The surviving `#communityDesc`/
`#contributeDesc` selectors keep assertions 1-3 satisfied, and nothing reaches `about:license` so
assertion 4 stays silent too.

This matters for three reasons specific to this project. First, 01-20's own objective states the
check exists "so the current defect cannot be reintroduced silently" — for the over-reach direction
that promise holds, but the plan's broader framing (closing UAT gap G-01-3's regression risk, cited
against MIG-03/MIG-04) is only half kept. Second, CLAUDE.md's verification philosophy is explicit
that a registered check must "derive from the tree and compare" rather than assert on a narrow,
hand-picked condition — a check that only watches one of two ways the same CSS rule can go wrong is
the same failure shape the project's own rule 1 (never assert on the absence of something you
haven't proven is emitted) warns against, applied to the positive case: never claim a regression
gate that only watches one of two symmetric failure modes. Third, `deferred-items.md` row 11(a),
rewritten by this same plan's Task 3, states the row's ESR-rebase risk is "now covered too" — true
for renames, silent about deletions/narrowings — so the corrected record itself does not disclose
the gap this pass found.

The current shipped tree is not defective: both mozilla.org links are suppressed today and
`about:license` is reachable today, confirmed by direct reads and a direct checker run. This is a
durability gap in the regression-prevention mechanism, not a live user-facing defect — but it is
exactly the kind of gap this project's verification philosophy treats as a blocker, because the
entire reason a phase-gate check exists is to make a future regression impossible to ship silently,
and this one currently cannot.

Because this is a Critical-tier, independently reproduced, unfixed defect in the verification
artifact this same plan claims closes MIG-03/MIG-04's regression-reintroduction edge, the overall
status stays **gaps_found**. The score holds at 12/13 (Truth 9 is now split into 9a/9b/9c to
separate what closed from what didn't; 9a and 9b hold, 9c fails, netting the same one-truth gap as
the prior pass, now differently shaped and with a proposed fix already drafted in 01-REVIEW.md's
CR-02).

Two human-verification items remain open and unrun: the tier-3 regression re-confirmation (WINDOWS.md
ledger item 19) and the About-dialog backstop truth from 01-20's own PLAN (a repackaged binary's
rendered pixels). Neither changes the gaps_found status, since a gaps_found status takes precedence
over human_needed in the decision tree, but both should be run at the phase gate alongside the
CR-02 fix.

---

_Verified: 2026-09-01T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
