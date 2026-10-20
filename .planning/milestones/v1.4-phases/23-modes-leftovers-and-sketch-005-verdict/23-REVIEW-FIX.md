---
phase: 23-modes-leftovers-and-sketch-005-verdict
fixed_at: 2026-10-18T00:00:00Z
review_path: .planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-10-18
**Source review:** .planning/phases/23-modes-leftovers-and-sketch-005-verdict/23-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (Critical 0, Warning 4)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: modes-panel-motion reads the stock expandDuration and then ignores it

**Files modified:** `scripts/verify-panel-motion.mjs`
**Commit:** 5dd622e
**Applied fix:** `deriveCode` now takes the stock map. When a rebind panel has no `expandDuration`, the check uses the stock `DEFAULT_OPTIONS` value for that panel. A non-zero inherited value fails as unguarded and is reported as "(inherited from stock DEFAULT_OPTIONS)". If stock declares no value either, the check fails with ZERO. Self-test plant 9 changes stock `leftPanel.expandDuration` from 0 to 150 and goes red. Plant 9 runs only on a kind=a tree, because under kind b or c every panel sets its own duration.

### WR-02: inputCappedName accepts InputOptions but uses only prompt and placeHolder

**Files modified:** `theia/extensions/modes/src/browser/capped-name-input.ts`
**Commit:** 863037b
**Applied fix:** The parameter type is now `{ prompt?: string; placeHolder?: string }`, and the header comment was corrected. A structural type was used instead of `Pick<InputOptions, 'prompt' | 'placeHolder'>` so that this file still contains no string literal (the copy checks scan the modes sources for string literals). This is a type-only change, so the emitted JS is the same.

### WR-03: modes-name-cap-at-input checks only the first cap number on each spec line

**Files modified:** `scripts/verify-name-cap-at-input.mjs`
**Commit:** 5d1a461
**Applied fix:** For each rule line, the check now collects every number that follows "at most", "more than", "capped at" or "first". Each number is compared as `<label> #k`. Plant 6's regex was updated for the `#1` label. A new plant 10 changes only the second cap number on the custom-modes bullet and goes red.

### WR-04: 14-UI-SPEC says pasted text is cut, but the code cuts the field's combined value

**Files modified:** `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md`, `scripts/verify-name-cap-at-input.mjs`
**Commit:** bcdf102
**Applied fix:** The custom-modes bullet and the named-setups Save bullet now use 23-UI-SPEC A1's rule: "after any typed or pasted change it keeps the first 60 characters of the result, and the caret moves to the end". The anchors the checks depend on are kept ("while typing", "capped at 60 characters while typing;", and no "slid"). Plant 10's anchor was moved to the new wording. The code was not changed. These are Interaction Contract lines, not Copywriting Contract lines, and no on-screen string changed. The other option the review offers, cutting only the inserted text, is still Chris's call under A1.

## Verification

All gates ran in the main checkout (`workflow.use_worktrees=false`), so they can be reproduced from this tree.

- `node scripts/verify-panel-motion.mjs` and `--self-test` both PASS (9 of 9 plants go red).
- `node scripts/verify-name-cap-at-input.mjs` and `--self-test` both PASS (10 of 10 plants go red).
- Sidecar rebuilt after WR-02 inside `nix develop .#theia` (modes extension, then applications/browser), exit 0.
- Live rows on PB_VERIFY_PORT=3939 all PASS: `modes-name-cap-at-input-live`, `ng-035-custom-mode-saves-layout`, `ng-036-setup-records-dock-layout`.
- `scripts/verify-platform.sh --quick` PASS with 0 FAIL, run after all four edits. `docs/non-gui/quick-baseline.txt` is empty (0 bytes).
- Before each commit, the root was `/home/chris/coding/Power-Browser` on branch `main`.

## Out of scope (Info, not attempted)

- IN-01 and IN-02 (ng half): hash-locked files `scripts/verify-ng-035-custom-mode-layout.mjs` and `scripts/verify-ng-036-setup-dock-layout.mjs`. Needs Chris re-lock.
- IN-03 to IN-06: Info tier. Not in critical_warning scope.

---

_Fixed: 2026-10-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
