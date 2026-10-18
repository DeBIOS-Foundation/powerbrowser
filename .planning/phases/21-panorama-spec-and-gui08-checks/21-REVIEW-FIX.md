---
phase: 21-panorama-spec-and-gui08-checks
fixed_at: 2026-10-17T00:00:00Z
review_path: .planning/phases/21-panorama-spec-and-gui08-checks/21-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 6
skipped: 2
status: partial
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-10-17
**Source review:** .planning/phases/21-panorama-spec-and-gui08-checks/21-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (Critical 0, Warning 8)
- Fixed: 6
- Skipped: 2, both because they need Chris's copy review

## Fixed Issues

### WR-01: Zero-group loose cards overlap the "No tab groups" panel in a short host

**Files modified:** `theia/extensions/modes/src/browser/organising-widget.ts`, `scripts/verify-gui08-canvas-geometry.mjs`, `scripts/verify-gui08-loose-cards-live.mjs`, `.planning/phases/21-panorama-spec-and-gui08-checks/21-UI-SPEC.md`
**Commit:** 5714f36
**Applied fix:** `renderLoose(minTop = 0)` now computes the line as `Math.max(minTop, height - LOOSE_H - LOOSE_MARGIN)`. When the line is pushed below the host, it raises the canvas min-height so the cards stay on the canvas and the host scrolls. In the zero-group branch, `minTop` is the panel's bottom edge plus `LOOSE_MARGIN`. The live row gains a 300px-host block (border-box) that asserts no overlap with the panel and that every card is on the canvas. It also has an in-run control: with `minTop` dropped, the cards must overlap the panel, which shows that 300px exercises the clamp. The canvas-geometry A3 check and its plant accept the argument form. The 21-UI-SPEC loose-cards bullet now records the clamp. The panel copy is unchanged. Status: fixed, requires human verification (layout logic).

### WR-03: Typography size check is unscoped

**Files modified:** `scripts/verify-gui08-canvas-geometry.mjs`
**Commit:** c63228b
**Applied fix:** Sizes and weights now read one rule set: the comment-stripped rules whose selector contains `.pb-org-`. Stripping comments also closes a second gap: a rule with a leading comment used to fail the old `startsWith('.pb-org-')` weight filter. A new plant deletes every `.pb-org-*` 13px declaration while `.pb-modes-custom-row` keeps its 13px, and it requires the "declared under no .pb-org-* rule" line. Self-test: 15/15.

### WR-04: Retired-copy search misses a `\u`-escaped revival

**Files modified:** `scripts/verify-gui08-panorama-copy.mjs`
**Commit:** 605b53c
**Applied fix:** The negated search now matches both the raw source and the `unescapeUnicode` form. A new plant writes `'No ungrouped tabs — …'` (literal backslash-u) into `mode-descriptors.ts`, a file outside the enumeration, and requires a red line that names that file. Self-test: 10/10.

### WR-06: Const completeness skips consts outside the parser's grammar

**Files modified:** `scripts/lib/ui-spec.mjs`, `scripts/verify-gui08-canvas-geometry.mjs`
**Commit:** 5ce3fa3
**Applied fix:** `topLevelNumericConsts` now matches every top-level SCREAMING_CASE const, with any spacing, an optional type annotation, and a multi-line or derived expression. It skips only strings and string lists, so a form the evaluator cannot read still needs a row, and `resolveConst` then reports it as unsupported. `resolveConst` accepts a type annotation. The unused `CONST_EXPR` was removed. Two new plants: `const PILE_STEP = STACK_OFFSET * 2;` and `export const LOOSE_GAP: number=12;`. Each goes red as undeclared. Status: fixed, requires human verification (parser logic).

### WR-07: Live row's geometry probes have no control; stubs not restored on a throw

**Files modified:** `scripts/verify-gui08-loose-cards-live.mjs`
**Commit:** feb7387
**Applied fix:** Two rectangle controls were added. Shifting a card to `top: -500px` must turn `outside()` red. Laying a card on `.pb-org-empty` must turn the overlap probe red. Both set `transition: none`, because the first run showed that `transition: all` on cards left the rectangle at its old place and the overlap control stayed green. Every stub and plant is undone in `finally`, and a restored-clean assertion follows. The one-group block asserts that loose cards do not overlap `.pb-org-box`. The overlap logic moved into the shared `PROBES` (`overlapping(sel)`, `offCanvas()`) so the controls test the same code the assertions use.

### WR-08: Held-out backstop text contradicts the A5 focus contract

**Files modified:** `scripts/verify-gui08-canvas-geometry.mjs`
**Commit:** 2201206
**Applied fix:** The backstop now reads "every visible loose card and every expanded-stack card is reachable by Tab plus arrows, and Enter opens it; hidden pile cards are skipped (21-UI-SPEC A5)". The review suggested "reached through the tree view". That wording was not used: 21-UI-SPEC says loose cards have no tree representation, so it would be false. Making the pile count focusable is a behaviour decision and was not taken.

## Skipped Issues

### WR-02: The empty-canvas body still names a gesture that no longer exists

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:496`
**Reason:** Needs Chris copy review. This is a user-facing string, and the review records it as held for Chris's Phase 22 copy edit. The fix changes the 15-UI-SPEC contract row and the literal together, and the wording needs his approval. Candidate from the review: "There are no tab groups yet — choose New Group, or draw a box around tabs on the canvas to start one."
**Original issue:** "…or drag a tab onto the canvas to start one." A tab dropped on the canvas is placed loose. Only a rubber band starts a group.

### WR-05: Copy derivation enumerates sinks by hand

**File:** `scripts/verify-gui08-panorama-copy.mjs:83-114`, `theia/extensions/modes/src/browser/organising-widget.ts:856`
**Reason:** Needs Chris copy review. Deriving every sink (any `aria-*` attribute, template-literal `textContent`/`title`, `alt`) makes the gate red at once on shipped copy that is not in the contract: `aria-valuetext` `${group.w} by ${group.h} pixels` and the card tooltip `${tab.title}\n${tab.url}`. Two ways make it green, and both are copy decisions for Chris: add those strings to the 15-UI-SPEC Copywriting Contract, or reword them (the review flags the box bounds in `aria-valuetext` as an internal). The quick baseline must stay empty, so the broadening was not landed red. A narrower hand-extended sink list would repeat the defect, so none was added.
**Original issue:** User-facing strings sit at sinks the enumeration does not list, so they can ship without review.

## Verification

All gates ran in the main checkout at /home/chris/coding/Power-Browser. `workflow.use_worktrees` is `false`, so no worktree was created.

- `node scripts/verify-gui08-canvas-geometry.mjs`: PASS. `--self-test`: PASS, 15 plants.
- `node scripts/verify-gui08-panorama-copy.mjs`: PASS. `--self-test`: PASS, 10 plants.
- Theia: `yarn --cwd extensions/modes build` and `yarn --cwd applications/browser build` inside `nix develop .#theia`, both 0 errors. The bundle contains `renderLoose(minTop = 0)`.
- `PB_VERIFY_PORT=3939 PB_NG_ALLOW_DIRTY=1 scripts/verify-platform.sh --only gui08-loose-cards-live`: PASS, with 5 probe controls red as planted plus the short-host control. `PB_NG_ALLOW_DIRTY=1` was needed because another session has an uncommitted 21-VALIDATION.md, which is not part of this change.
- `scripts/verify-platform.sh --quick` (after the last commit): PASS, 132 checks, 0 FAIL.

---

_Fixed: 2026-10-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
