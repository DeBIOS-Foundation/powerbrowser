---
phase: 23-modes-leftovers-and-sketch-005-verdict
plan: 01
subsystem: planning records (v1.3 archive) and theia/extensions/modes
status: complete
tags: [modes, records, variant-b, G-11, G-23, G-32, MODE-01, MODE-02, MODE-03]
requires: [23-02, 23-03]
provides:
  - "Five Variant B records describe the shipped relocation (539ba36) and hand G-11 to the Phase 24 session"
  - "G-14.1.1-23 and G-14.1.1-32 closed on the 23-02 and 23-03 commits; 14.1.1-UAT and 14-UAT Summary blocks equal a recount"
affects: [24]
tech-stack:
  added: []
  patterns: ["truth_correction line beside an unchanged truth (G-14.1.1-24 precedent)"]
key-files:
  created: []
  modified:
    - theia/extensions/modes/src/browser/mode-descriptors.ts
    - .planning/GUI-DEFECTS.md
    - .planning/milestones/v1.3-REQUIREMENTS.md
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
decisions:
  - "G-14.1.1-11 set in_tree with fixable needs-chris; tests 11, 23 and 32 reset to pending for Chris in the Phase 24 session"
  - "G-14.1.1-32 gets a truth_correction for option a (instant panels); its closed_by cites c86f432"
requirements: [MODE-01, MODE-02, MODE-03, NG-074, NG-084]
metrics:
  completed: 2026-10-18
  duration: 25min
  tasks: 2
estimate:
  tokens: 35000
  tasks: 2
actuals:
  tokens: 6600
  tasks: 2
  commits: 2
plan_head_before: 87d57fed71cf37645bb1cf06fa839ef6c3150734
plan_head_after: 41643cbbe7acdc38f89cdf10fd6bc8eb5d15b769
---

# Phase 23 Plan 01: Variant B records current, G-23 and G-32 closed Summary

The five records that still described the abandoned strip-stays-top fallback now describe the relocation built in `539ba36`, with three strip homes: Browsing at the very top, Coding in the dock tab bars, Organising on the Panorama canvas. Each one records that Chris confirms the relocation live in the Phase 24 session (G-11). G-14.1.1-23 and G-14.1.1-32 are closed on the 23-02 and 23-03 commits. Both UAT Summary blocks were recounted from their entries. The only code change is a comment. `--quick` reports 136 PASS and 0 FAIL, and the baseline is empty.

## Inputs read

- G-32 answer, from the ROADMAP Phase 23 Needs Chris line: `G-32 chosen by Chris 2026-10-18: a (instant, spec amended; MODE-03)`. K = a, N = none.
- Hashes, from `git log --format=%h --grep`: `(23-02)` on `capped-name-input.ts` gave `8b7f484`. The spec commit `ea5301d` comes from `(23-02)` on 14-UI-SPEC. `(23-03)` on 14-UI-SPEC gave `c86f432`.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | 36eaa29 `docs(23-01): bring the five Variant B records current and hand G-11 to Phase 24 (MODE-01)` | the five files in key-files |
| 2 | 41643cb `docs(23-01): close G-23 and G-32 on the 23-02 and 23-03 commits and recount the 14.1.1-UAT summary (MODE-02, MODE-03)` | 14.1.1-UAT.md |

`git show --stat` lists exactly five files for 36eaa29 and exactly one for 41643cb. `git rev-list --count 87d57fe..HEAD` = 2.

## Task 1: the five Variant B records

1. **mode-descriptors.ts header (comment only).**
   - Before: "Strip binding (13-01 verdict RED): the tab strip stays top in every mode, so no descriptor names the strip, the top area, or any relocation. ... The Organising placeholder show/hide hooks land in plan 14-02."
   - After: "Strip binding: the 13-01 spike re-probed GREEN and 14-UI-SPEC was amended on 2026-09-08, so the tab strip changes home per mode. The chrome bar owns that rule (chrome-bar-widget.tsx, applyStripHome), not a descriptor, so no descriptor names the strip or the top area. Descriptors reshape side-panel visibility and the main-area view only: ... Organising view is the Panorama canvas (Phase 15)."
   - Every changed line starts with ` *`. The text has no quote character, no `textContent`, and no lowercase mode id followed by a colon.
2. **14.1.1-UAT test 11.**
   - Before: `### 11. Tabs move between modes (Variant B) — or the strip stays top (Variant-A fallback)`, with `fixable: decision`, `result: issue` and "Decision required".
   - After: `### 11. Tabs move between modes (Variant B)`. The contract is the amended binding constraint (14-UI-SPEC.md:22), the per-mode map (:249, table :256-260) and the spike Verdict GREEN (:16). Expected lists the three homes and the split-pane case. Evidence cites `539ba36`, `applyStripHome`, the `tab-strip-widget.tsx` header and the 23-03 `gui07-mode-switch-tabs-live` PASS. `fixable: needs-chris`, `result: pending`, and a dated reason hands the test to Phase 24.
3. **Gap G-14.1.1-11.**
   - The `truth:` line is unchanged.
   - Added: `truth_correction: "RESTATED 2026-10-18 by 23-01 (v1.4 Phase 23): the decision this truth asks for was taken — ... built in 539ba36. ..."`.
   - Status: `open` became `in_tree`. Fixable: `decision` became `needs-chris`.
   - root_cause: before, it read "Decision, not a code defect. Options: (a) ... (b) ...". After, it reads "Decided and built ... Chris's live look ... is handed to the v1.4 Phase 24 session".
   - Two artifacts were added: `chrome-bar-widget.tsx` and `tab-strip-widget.tsx`.
4. **GUI-DEFECTS item 2.**
   - Before: a row in "Visible to Chris, still broken" with status `OPEN`, reading "Variant B ... so the re-probe can reopen it."
   - After: a row in "Fixed in the tree, unconfirmed in the window" with status `IN TREE`. It reads "Variant B shipped in `539ba36` ... Chris confirms in the Phase 24 session (G-14.1.1-11); it becomes CONFIRMED there."
5. **v1.3-REQUIREMENTS GUI-07.**
   - The box is still unchecked and its text is unchanged.
   - Added note: "*Status 2026-10-18 (v1.4 Phase 23, plan 23-01):* the relocation shipped in `539ba36` (2026-09-08) with three strip homes ... Side panels switch instantly; Chris amended "side panels slide" on 2026-10-18 (G-32 choice a, 23-03 commit `c86f432`). The box flips in v1.4 Phase 24 once Chris confirms the relocation live."
   - Traceability: `Pending` became `Pending (relocation in tree, 539ba36; live confirmation in v1.4 Phase 24)`.
6. **14-UAT test 3.**
   - Before: `### 3. Tab strip stays top in every mode`, `result: skipped`, reason "Ratified Variant-A fallback ...".
   - After: `### 3. Tab strip relocates per mode (Variant B)`. Expected lists the three homes, the split-pane case and the no-loss rule, and cites the spec sections by name and line. `result: pending`. The dated reason says the skip described a superseded fallback, that the relocation shipped in 539ba36, and that Chris sets the result in Phase 24.
   - Summary: before, `issues: 4, pending: 3, skipped: 1`. After, `issues: 5, pending: 4, skipped: 0`. The old block undercounted issues by one.
7. The five checks that read the descriptor file each pass with and without `--self-test`: mode-toggle-commands, mode-switch-tabs-invariant, gui08-panorama-copy, gui08-view-parity and dependent-window-content. ng-070 passes. scan-brand-residue passes over 364 files. phase-gate printed nothing. Task 1's `<automated>` verify exited 0.

## Task 2: G-23, G-32 and the recount

- **Test 23:** `result: pending`. The contract cites the Save bullet (:314), the custom-modes bullet (:271-273) and the E2 long-text row (:358). Expected states the cut-while-typing rule. Evidence cites 8b7f484, ea5301d, `inputCappedName` and both PASS rows.
- **G-14.1.1-23** is now `fixed`. Its `deferred_to:` line is deleted. root_cause now names `saveCurrentAsSetup` and `saveCurrentAsMode` and records that Chris's 2026-10-17 decision to cut while typing superseded the validateInput remedy. `capped-name-input.ts` was added to its artifacts.
  `closed_by: "plan 23-02, commits 8b7f484, ea5301d — modes-name-cap-at-input-live PASS on a rebuilt sidecar: a 70-character value reads back as its first 60 on both inputs; modes-name-cap-at-input holds code and 14-UI-SPEC together"`
- **Test 32:** `result: pending`, `fixable: needs-chris`. Expected is the 23-03 spec wording ("Side panels switch instantly on a mode switch, with no animation"). Evidence names stock `expandDuration: 0` and the single rebind as the cause, not modes.css.
- **G-14.1.1-32** is now `fixed`. Its `truth:` line is unchanged, and a `truth_correction:` for option a was added. The root cause is stock `expandDuration: 0`. Artifacts: modes.css was replaced by 14-UI-SPEC and `scripts/verify-panel-motion.mjs`.
  `closed_by: "plan 23-03, commit c86f432 — spec amended to instant per Chris's choice; modes-panel-motion (--quick) PASS, kind=a, holds the spec and the shell options together, and its self-test turns all eight planted faults red"`
- **Recounted Summary block:**

```
total: 48
passed: 0
issues: 32
pending: 16
skipped: 0
blocked: 0
Gaps by fixability: yes 21 (...) · decision 5 (G-12, 28, 29, 30, 31) · needs-chris 9 (G-1, 2, 3, 11, 13, 14, 15, 32, 43).
Pending tests ... needs-chris 8 (11, 16, 17, 18, 23, 32, 35, and the in-flight half of 37; test 42's strip look).
```

  A dated closing-note sentence was appended. It records that Phase 23 closed G-23 and G-32, set G-11 in_tree, and that Chris sets tests 11, 23 and 32 in Phase 24.
- **Wave-3 quick gate** (`logs/quick-23-01.log`, `PHASE23_WALL_SECONDS=55`, `PHASE23_EXIT=0`): **136 PASS, 0 FAIL**, with the line `verify-platform: PASS -- all checks passed`. These rows are PASS: gui07-mode-toggle-commands, gui07-mode-switch-tabs-invariant, gui08-panorama-copy, gui08-view-parity, gui09-dependent-window-content, modes-name-cap-at-input, modes-panel-motion and scan-brand-residue. `docs/non-gui/quick-baseline.txt` is 0 bytes. Task 2's `<automated>` verify exited 0, and Task 1's verify still exits 0 when re-run.

## Deviations from Plan

- **[Rule 1 - path] tab-strip-widget.tsx location.** The plan names `theia/extensions/modes/src/browser/tab-strip-widget.tsx`. The file lives at `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`, which is where 539ba36 added it. The records cite the real path.
- **G-14.1.1-32 artifacts.** The plan lists 14-UI-SPEC only for option a. `scripts/verify-panel-motion.mjs` was added as well, because it is the check that holds the closure.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: all five modified files; logs/quick-23-01.log
- FOUND: commits 36eaa29 and 41643cb (ancestors of HEAD)
