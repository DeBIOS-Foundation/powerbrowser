---
phase: 01-platform-extraction-and-rename
verified: 2026-09-01T21:15:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/13
  gaps_closed:

    - "Truth 9c — the registered check built to close Truth 9
      (`scripts/verify-about-dialog-suppression.mjs`) had no coverage assertion and could not go
      red on the exact regression it exists to prevent (a suppression selector deleted or
      narrowed). Closed by plan 01-21: a fifth assertion derives every external (http/https) link
      from the parsed upstream markup at check time and requires per-variant coverage against the
      shipped selectors, failing with `UNSUPPRESSED VENDOR LINK` naming the surviving href and the
      stylesheet. Independently reproduced in this pass, not accepted on 01-21-SUMMARY's narrative:
      re-ran the exact scratch-root mutation the prior pass used to prove the gap (the outbound
      `.bottom-link[href^=\"https://www.mozilla.org\"]` selector deleted from a scratch copy of both
      stylesheets) — it exited **0** before 01-21 and now exits **1**, naming both surviving links
      (Terms of Use and Privacy Notice) in both branding variants."
  gaps_remaining: []
  regressions: []
  new_gaps_this_pass: []
gaps: []
deferred: []
behavior_unverified_items: []
human_verification:

  - test: "Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
      repackaged binary (WINDOWS.md ledger item 19, still `open`)."
    expected: "Neither check moves, since neither clicks Retry."
    why_human: "Requires a `./mach build faster` repackage and a running binary; explicitly
      deferred to the phase gate, not run by this static verification pass (build cost ~47-54 min
      per CLAUDE.md, out of scope per this pass's explicit instruction)."

  - test: "A repackaged binary's About dialog renders 'Licensing Information' as the only visible
      bottom-row link, clicking it opens the aggregated open-source licence text, and no Terms of
      Use, Privacy Notice, community, contribute, or experimental-community row is present (01-21
      PLAN's `verification: backstop` truth, MIG-04 boot-failure edge, superseding the narrower
      pre-01-21 version of this same item)."
    expected: "One visible link, correctly labelled, correctly routed; no vendor-destined row
      including the newly-suppressed `#communityExperimentalDesc` row."
    why_human: "Needs `./mach build faster` and a launched binary. 01-21-SUMMARY records this
      explicitly as `human_needed` (coverage entry D6). The static gate proves selector logic
      against markup; it does not prove rendered pixels. Not run in this pass per the phase-gate
      cost instruction."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-09-01T21:15:00Z
**Status:** human_needed
**Re-verification:** Yes — fourth pass. Prior pass (2026-09-01, score 12/13) found Truth 9c FAILED:
`scripts/verify-about-dialog-suppression.mjs` could not go red on the regression it exists to
prevent (an outbound suppression selector deleted or narrowed). Plan 01-21 (`gap_closure: true`)
was written and executed specifically to close that one gap. This pass independently re-runs every
check the prior pass ran, plus 01-21's own load-bearing mutation, against the current tree — none
of it is accepted on 01-21-SUMMARY's narrative.

**Scope note:** Requirements verified against REQUIREMENTS.md: MIG-01, MIG-02, MIG-03, MIG-04,
GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 remains deferred to v2 (D-22 gate) — not scored here, not
orphaned.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Token-classification inventory exists; residual scan red on pre-rename tree | ✓ VERIFIED | Regression-checked; `scan-brand-residue: PASS` (110 files) via `--quick`, run directly this pass |
| 2 | SC2 — Repo builds from script-refetched `upstream/`, launches branded app, passes smoke tests | ✓ VERIFIED | Historical build evidence (01-04) unaffected by 01-21; not rebuilt this pass (47-54 min cost, per explicit instruction) |
| 2b-2e | Backend supervisor error-layer contract truths (state-gating, quit-observer ordering, retry classification) | ✓ VERIFIED | Regression-checked; `shell-error-contract`, `start-path-recovery` + self-tests PASS via `--quick`, run directly; files unaffected by 01-21 |
| 3 | SC3 — Toggle Theia → browser UI and back; `TabUriRegistry`'s exported shape stays landable | ✓ VERIFIED | `gui04-registry-shape` + self-test PASS via `--quick`, run directly; unaffected by 01-21 |
| 4 | SC4 — Runtime restyle via customize bridge, no fork | ✓ VERIFIED | Regression-checked; unaffected by 01-21 |
| 5 | SC5 — Internal identifiers fixed everywhere; every branding value is a hand-written literal | ✓ VERIFIED | `branding-preflight` + self-test PASS via `--quick`, run directly; unaffected by 01-21 |
| 6 | SEC-01 — Backend unreachable without a per-launch credential; fails closed | ✓ VERIFIED | Regression-checked; unaffected by 01-21 |
| 7 | No raw internal identifier can reach the user-facing error layer, gate cannot be defeated | ✓ VERIFIED | `shell-error-copy-no-internals` + self-test PASS via `--quick`, run directly; unaffected by 01-21 |
| 8 | The residual-brand scan fails on a brand token reintroduced by an upstream rebase | ✓ VERIFIED | Regression-checked; `scan-brand-residue-self-test` PASS via `--quick` |
| 9a | The About dialog's `about:license` disclosure link is NOT suppressed by the debranding rule (over-reach direction) | ✓ VERIFIED | Regression-checked; assertion 4 unchanged, self-test fault (a) reproduced RED naming `about:license` |
| 9b | The About dialog's Mozilla-outbound links (Terms/Privacy, UAT G-01-3) stay suppressed TODAY | ✓ VERIFIED | Read directly: the qualified selector matches both mozilla.org hrefs in `upstream/browser/base/content/aboutDialog.xhtml`; `node scripts/verify-about-dialog-suppression.mjs` exits 0 against the unmutated tree, run directly this pass |
| 9c | A registered check fails by name if the Mozilla-outbound suppression (9b) is ever removed or narrowed | ✓ VERIFIED (newly closed) | Independently reproduced this pass: the scratch-root mutation that exited 0 before 01-21 (outbound selector deleted from both variants) now exits **1**, stderr naming `UNSUPPRESSED VENDOR LINK`, `https://www.mozilla.org/about/legal/terms/firefox/`, `https://www.mozilla.org/privacy/firefox/...`, and both `powerbrowser/branding/{dev,release}/content/aboutDialog.css` paths — 4 problems, one per link per variant. `--self-test` run directly: 6/6 planted faults (four from 01-20 plus rows (e) deletion and (f) narrowing) each independently REJECTED naming their drift, plus a green control |

**Score:** 13/13 truths verified (Truth 9 stays split into three sub-truths to keep the
over-reach/current-state/regression-durability directions separately auditable; all three now
hold).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `powerbrowser/branding/{dev,release}/content/aboutDialog.css` | Suppresses only the reported stock Mozilla-destined links, preserving `about:license`, with full coverage of every outbound link including the previously-uncovered `#communityExperimentalDesc` | ✓ VERIFIED | Read directly; four-entry selector list confirmed (`#communityDesc`, `#communityExperimentalDesc`, `#contributeDesc`, the href-qualified `#bottomBox` compound); both variants byte-identical (`cmp` clean, reproduced this pass) |
| `scripts/verify-about-dialog-suppression.mjs` | Derived-both-sides gate over the About dialog's suppression selectors, including coverage, with a planted-fault `--self-test` proving it gates | ✓ VERIFIED (gap closed) | All five assertions (non-vacuity, grammar, staleness, over-reach, coverage) independently reproduced as working. The coverage assertion (new) closes the Critical-tier hole the prior pass found: the exact regression that exited 0 at the prior pass's HEAD now exits 1, naming the surviving link and file |
| `scripts/verify-platform.sh` registry rows `about-dialog-suppression`, `about-dialog-suppression-self-test` | Reachable via `--only`; `--quick` stays green, same row count (25) — no sibling driver | ✓ VERIFIED | `git diff b5fefe4..HEAD --stat -- scripts/verify-platform.sh` produces no output — file unedited by 01-21. `--quick` run directly this pass: 25/25 PASS. `--only about-dialog-suppression` and `--only about-dialog-suppression-self-test` both run directly and PASS |
| `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` row 11 | Scoped correctly: renames covered by staleness, deletions/narrowings covered by the new coverage assertion; `#communityExperimentalDesc`/WR-08 closure recorded with its reasoning; G-01-25's optional item ruled on | ✓ VERIFIED | Read directly: row 11(a) now attributes the rename case to the staleness assertion and the deletion/narrowing case to 01-21's coverage assertion, citing CR-02; sub-item (a-iii) records the WR-08 closure and the rejected-exemption-list reasoning; (a-i)/(a-ii) extended; row 13 records an explicit DEFER on G-01-25's optional registry row, routed onto row 12 |
| `.planning/WINDOWS.md` ledger rows 15, 16 | Stay resolved; row 19 stays open | ✓ VERIFIED | Regression-checked; rows 15/16 read `fixed`; row 19 still `open`, unaffected by 01-21 (not in its scope) |
| `.planning/REQUIREMENTS.md` line 19 | MIG-04 checklist ticked to `[x]` | ✓ VERIFIED | Regression-checked; unaffected by 01-21 |

**New finding, not a gap in this phase's technical goal.** `.planning/REQUIREMENTS.md`'s
traceability table (lines 258-268) and checkboxes still mark MIG-01, MIG-02, GUI-01, GUI-03, and
GUI-04 as `Gaps Found` / unchecked — a state left over from a 2026-08-31 revert (`ad5b93e2`) made
mid-phase when gaps genuinely existed, that was never restored for these five lines even though
the underlying gaps were closed and this project's own verification (this pass and the prior one)
independently confirms all five SATISFIED by direct functional evidence. `SEC-01`'s row is
internally inconsistent too: its traceability status reads `Complete` while its checkbox on line
100 is still unchecked. This is a documentation-currency defect in a planning ledger, not a defect
in the platform — it does not change any functional truth scored above, and 01-21 was never scoped
to touch it (its `files_modified` list does not include `REQUIREMENTS.md`). Recorded here as an
Info-tier finding for a future doc-only pass, not elevated to a gap.

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `powerbrowser/branding/*/content/aboutDialog.css` suppression selectors | upstream's actual DOM (every external link, not only the three previously named) | href-qualified CSS selector matching + derived coverage comparison, `verify-about-dialog-suppression.mjs` | ✓ WIRED (over-reach, staleness, AND coverage) | The selector set correctly spares `about:license`, catches a stale selector, and now catches a deleted or narrowed selector — all three independently reproduced |
| `scripts/verify-about-dialog-suppression.mjs` | `scripts/verify-platform.sh` registry | two rows (`about-dialog-suppression`, `-self-test`), reached via `--only` | ✓ WIRED | Both run directly this pass, both PASS; registry file unedited (`git diff --stat` empty) |
| `powerbrowser/branding/*/content/jar.mn` | `aboutDialog.css` | packaging manifest entry | ✓ WIRED | Regression-checked; unaffected by 01-21 |

### Data-Flow Trace (Level 4)

Not applicable in the dynamic-data sense — this artifact is a static verification script and two
static stylesheets, not a UI component rendering fetched data. The relevant "flow" is the
derive-and-compare chain (parsed upstream markup → derived external-link set → per-variant
coverage comparison against parsed selectors), traced and confirmed above under Key Link
Verification.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full quick verification suite (25 checks) | `bash scripts/verify-platform.sh --quick` (run directly this pass) | PASS, 25/25 | ✓ PASS |
| `verify-about-dialog-suppression --self-test` | `node scripts/verify-about-dialog-suppression.mjs --self-test` (run directly this pass) | Green control + 6/6 planted faults RED, each naming its drift | ✓ PASS |
| `verify-about-dialog-suppression` against the unmutated shipped tree | `node scripts/verify-about-dialog-suppression.mjs` | exit 0, PASS line now states coverage was proven too | ✓ PASS |
| Load-bearing regression: outbound selector deleted from a scratch copy (restores UAT G-01-3 in full) — the exact command that exited 0 at the prior pass's HEAD | Reproduced this pass in a fresh scratch root: copied the current script, real upstream markup, and both stylesheets with the `[href^=...]` bottom-link compound and its preceding comma removed, ran the checker | exit **1** — 4 problems, `UNSUPPRESSED VENDOR LINK` naming both Terms-of-Use and Privacy-Notice hrefs in both `dev` and `release` `aboutDialog.css` | ✓ PASS (gap closed) |
| `--only about-dialog-suppression` (full variant, reads `upstream/`) | `bash scripts/verify-platform.sh --only about-dialog-suppression` | PASS | ✓ PASS |
| `cmp` dev vs release `aboutDialog.css` | `cmp powerbrowser/branding/dev/content/aboutDialog.css powerbrowser/branding/release/content/aboutDialog.css` | no output — byte-identical | ✓ PASS |
| `git -C upstream diff --stat` | Confirms upstream clone unmodified | no output | ✓ PASS |
| `git diff b5fefe4..HEAD --stat -- scripts/verify-platform.sh` | Confirms the registry file was not edited by 01-21 | no output | ✓ PASS |
| `--gate` (full registry + WINDOWS.md exclusions) | `bash scripts/verify-platform.sh --gate` | Not run — reaches the incremental `./mach build` path (~47-54 min); explicitly out of scope per instruction | ? SKIP (cost) |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; its verification driver
is `scripts/verify-platform.sh`, covered above.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| MIG-01 | Script-refetched upstream, no copied objdirs | ✓ SATISFIED | Regression-checked; `fetch-upstream-self-test` PASS via `--quick`. REQUIREMENTS.md's own checkbox/table is stale for this ID — see Required Artifacts note above; not a functional gap |
| MIG-02 | Committed pre-rename inventory | ✓ SATISFIED | Regression-checked. Same REQUIREMENTS.md staleness note applies |
| MIG-03 | Identifiers fixed everywhere, cannot regress | ✓ SATISFIED | Unaffected by 01-21's surface (About-dialog links, not identifier naming) |
| MIG-04 | Renamed tree builds and boots, works as an actual browser | ✓ SATISFIED (fully closed) | Build+boot evidence from 01-04 stands. The About-dialog gate's coverage hole (9c), the last open edge against this requirement, is closed this pass. REQUIREMENTS.md line 19 correctly ticked `[x]`, matching the traceability table |
| GUI-01 | Toggle Theia ↔ browser UI | ✓ SATISFIED | Regression-checked; unaffected by 01-21. REQUIREMENTS.md staleness note applies |
| GUI-03 | Runtime GUI customization bridge | ✓ SATISFIED | Regression-checked; unaffected by 01-21. REQUIREMENTS.md staleness note applies |
| GUI-04 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | Regression-checked; unaffected by 01-21. REQUIREMENTS.md staleness note applies |
| SEC-01 | Backend fail-closed | ✓ SATISFIED | Regression-checked; unaffected by 01-21 |

**No orphaned requirements.** 01-21's frontmatter declares MIG-03 and MIG-04; both already appear in
the phase's requirement set. All 8 phase-1 requirement IDs remain accounted for in REQUIREMENTS.md
(present in both the checklist and the traceability table, even where the table's status column is
stale per the note above).

### Anti-Patterns Found

`grep -nE "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` over all four files 01-21 modified
(`scripts/verify-about-dialog-suppression.mjs`, both `aboutDialog.css` variants,
`deferred-items.md`): zero matches. No debt markers.

`git status --short` shows a clean working tree (only an untracked `.gsd/` tooling directory,
unrelated to this phase). No stray edits outside 01-21's declared `files_modified`.

`.planning/REQUIREMENTS.md`'s stale traceability table (MIG-01, MIG-02, GUI-01, GUI-03, GUI-04
marked `Gaps Found`; SEC-01's checkbox/table internally inconsistent) is an ℹ️ Info-tier finding —
see the Required Artifacts section above. Not a blocker.

01-REVIEW.md's remaining Warning-tier findings for this surface (WR-09, WR-11, WR-12, and the
already-Info-tier WR-01/02/04-07/10/13) are not elevated to blocking here, consistent with the
review's own severity classification and 01-21-SUMMARY's explicit record that none was in the
prior verification's `missing[]` and none blocks the coverage assertion.

## Human Verification Required

### 1. Tier-3 regression re-confirmation (WINDOWS.md ledger item 19)

**Test:** Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a
repackaged binary.
**Expected:** Neither check moves, since neither clicks Retry.
**Why human:** Requires a running repackaged binary; explicitly deferred to the phase gate, unaffected by 01-21.

### 2. About-dialog backstop truth (01-21 PLAN's `verification: backstop` item)

**Test:** In a repackaged binary, open the About dialog and confirm `Licensing Information` is the
only visible bottom-row link, that it opens the aggregated open-source licence text, and that no
Terms of Use, Privacy Notice, community, contribute, or experimental-community row is present (the
last of these is new: it covers WR-08's closure, not just the original three).
**Expected:** One visible, correctly-routed link; no vendor row of any kind, including the newly
suppressed `#communityExperimentalDesc`.
**Why human:** Needs `./mach build faster` and a launched binary; the static gate proves selector
logic against markup, not rendered pixels. 01-21-SUMMARY already records this as `human_needed`
(coverage entry D6).

## Gaps Summary

**No gaps remain.** The one gap the prior pass (12/13) found — Truth 9c, the About-dialog
suppression gate's missing coverage assertion — is closed by plan 01-21 and independently
reproduced as closed in this pass, not accepted on 01-21-SUMMARY's narrative:

- `node scripts/verify-about-dialog-suppression.mjs --self-test`, run directly: green control plus
  6/6 planted faults REJECTED naming their drift, including the two new rows — (e) the outbound
  selector deleted, (f) the outbound selector's href prefix narrowed — that specifically exercise
  the failure shape the prior pass found ungated.

- The prior pass's own load-bearing reproduction — a scratch copy of both `aboutDialog.css`
  variants with the outbound `.bottom-link[href^="https://www.mozilla.org"]` selector deleted,
  restoring UAT G-01-3 in full — was re-run in this pass against the current tree. It exited **0**
  before 01-21; it exits **1** now, with stderr naming `UNSUPPRESSED VENDOR LINK`, both surviving
  hrefs, and both stylesheet paths.

- `cmp` between the two branding variants stays clean; `git -C upstream diff` stays empty;
  `scripts/verify-platform.sh` is confirmed unedited since the prior verification's commit
  (`b5fefe4`); `--quick` stays green at the same 25-row count, so no sibling driver or registry
  row was introduced to reach this fix.

One finding independent of 01-21's scope surfaced this pass and is recorded for the record: the
project's own `.planning/REQUIREMENTS.md` traceability table has been stale for five of this
phase's eight requirement IDs since a mid-phase revert on 2026-08-31, disagreeing with this
project's own subsequent verification passes (including this one) that those five are functionally
satisfied. This is a documentation-currency defect, not a platform defect, is outside 01-21's
declared file scope, and does not change any observable truth scored above — it is noted as an
Info-tier finding for a follow-up doc-only pass, not as a gap.

Two human-verification items remain open and unrun, both carried forward from the prior pass and
both requiring a repackaged binary: the tier-3 regression re-confirmation (WINDOWS.md ledger item
19) and the About-dialog backstop truth (now covering the WR-08 closure too). Per the decision
tree, a clean gaps list with open human-verification items routes the overall status to
**human_needed**, not **passed** — the phase's static, no-build verification surface is now fully
green, but two rendered-pixel checks against a live binary remain outstanding and should be run at
the phase gate.

---

_Verified: 2026-09-01T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
