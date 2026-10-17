---
phase: 21-panorama-spec-and-gui08-checks
plan: 04
subsystem: verification
tags: [panorama, gui08, canvas-geometry, ui-spec, pan-07, keyboard]
status: complete
requires:
  - phase: 21-01
    provides: "scripts/lib/ui-spec.mjs (geometryDiff, geometryRows, typography) and the re-pinned 15-UI-SPEC"
  - phase: 21-02
    provides: "tray-era code removed from the widget and model"
provides:
  - "verify-gui08-canvas-geometry derives every geometry value and its type sizes and weights from 15-UI-SPEC"
  - "PAN-07 as a commit-gate fact: a .pb-org-tray selector or widget tray reference is red"
  - "Loose cards render with zero groups (21-UI-SPEC A3); loose and expanded-stack cards are in the roving focus (A5); expanded-stack heading at 400 (A4)"
  - "12-plant self-test, 4 plants on the spec"
affects: [21-05]
tech-stack:
  added: []
  patterns:
    - "Source-shape clauses brace-match the method or branch under test (braceBlock); an unfound block is underivable, never a pass"
    - "Weights are checked per innermost rule body, so a selector cannot be misattributed across lines"
key-files:
  created: []
  modified:
    - scripts/verify-gui08-canvas-geometry.mjs
    - theia/extensions/modes/src/browser/modes.css
    - theia/extensions/modes/src/browser/organising-widget.ts
decisions:
  - "geometryDiff failures are prefixed '15-UI-SPEC.md Canvas Geometry vs tree:' so each one names the spec file; geometryDiff itself names the tree file where it has one"
  - "codeSources is every .ts/.mjs/.css source read; the spec and INTERNAL-APIS.md never reach geometryDiff"
  - "The font-size set is compared over the whole comment-stripped modes.css, as the old 12/13/14 clause did; weights only over rules whose selector starts .pb-org-"
metrics:
  duration: "about 30 min"
  completed: 2026-10-17
estimate:
  tokens: 50000
  tasks: 3
actuals:
  tokens: 8300
  tasks: 3
  commits: 3
plan_head_before: 31dc62a100db3ba720ed3d573ea92b5007e351f4
plan_head_after: 0462f88702f57e12fdb7679c9a39927119c94e74
---

# Phase 21 Plan 04: canvas-geometry from 15-UI-SPEC, tray removed, loose cards and focus scope Summary

`verify-gui08-canvas-geometry` now takes its geometry values from the 15-UI-SPEC Canvas Geometry table through `geometryDiff`, and its font sizes and weights from the Typography table. It no longer contains any hand-kept zoom, box, tray, card, thumbnail or capture number. It goes red when a tray selector or tray hook survives. In the same commits: the tray CSS was deleted, loose cards render when there are zero groups, loose and expanded-stack cards are in the arrow-key focus, and the expanded-stack heading is weight 400.

## Results

**Task 1 red log** (`logs/geometry-red-21-04-t1.log`, before the code changes):
```
verify-gui08-canvas-geometry: FAIL -- 6 failure(s):
  theia/extensions/modes/src/browser/modes.css: tray selector '.pb-org-tray' survives -- ungrouped tabs are loose cards on the canvas (PAN-07)
  theia/extensions/modes/src/browser/modes.css: tray selector '.pb-org-tray-label' survives -- ...
  theia/extensions/modes/src/browser/modes.css: tray selector '.pb-org-tray-cards' survives -- ...
  theia/extensions/modes/src/browser/modes.css: tray selector '.pb-org-tray-empty' survives -- ...
  theia/extensions/modes/src/browser/organising-widget.ts: tray reference 'pb-org-tray' survives -- ...
  theia/extensions/modes/src/browser/organising-widget.ts: moveCardFocus does not scope .pb-org-expand-cards, is-loose -- those cards cannot be reached by keyboard (21-UI-SPEC A5)
```
The log has no other failures, so `geometryDiff` agreed with the tree at that point. After the code changes the check printed `verify-gui08-canvas-geometry: PASS`.

**Task 2 red log** (`logs/geometry-red-21-04-t2.log`):
```
verify-gui08-canvas-geometry: FAIL -- 2 failure(s):
  theia/extensions/modes/src/browser/modes.css: font-weight 500 on '.pb-org-expand-heading' is not a .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md Typography weight (400/600)
  theia/extensions/modes/src/browser/organising-widget.ts: renderCanvas returns on zero groups without renderLoose() -- ungrouped tabs vanish when no group exists (21-UI-SPEC A3)
```
PASS line after the code changes:
```
verify-gui08-canvas-geometry: PASS -- 18 const rows and 7 CSS rows equal 15-UI-SPEC Canvas Geometry; type sizes 12/13/14px and weights 400/600 from its Typography table; no tray; loose cards with zero groups; loose and expanded cards in focus scope; fallback, registry, discipline and capture hold
```
The check holds out 5 backstops: draw-a-group, join or place, keyboard reach, tree parity, and Close Group. None of them mentions the tray or auto-draw. `git grep -n -i -w tray -- theia/extensions powerbrowser/shell` returns nothing.

**Task 3 self-test** (`node scripts/verify-gui08-canvas-geometry.mjs --self-test`):
```
  ok  removed canvas hook -> organising-widget.ts: canvas hook 'dataset.canvas' underivable -- ...
  ok  zoom step drift -> 15-UI-SPEC.md Canvas Geometry vs tree: row 'ZOOM_STEPS': ZOOM_STEPS is [25,50,75,100,125,150,250] in the tree, the spec says [25,50,75,100,125,150,200]
  ok  label drift -> panorama-commands.ts: exactly one labelled command ('New Group') is declared -- found 1 label sites; ...
  ok  spec value drift -> ... row 'LOOSE_W × LOOSE_H': LOOSE_W is 160 in the tree, the spec says 170
  ok  source value drift -> ... row 'TILE_GAP': TILE_GAP is 10 in the tree, the spec says 8
  ok  spec row deleted -> ... undeclared canvas constant TILE_GAP (organising-tiling.ts)
  ok  CSS out of its rule -> ... row '`.pb-org-card-thumb` height': .pb-org-card-thumb declares height 0 time(s) in modes.css, expected exactly once
  ok  tray revived -> modes.css: tray selector '.pb-org-tray' survives -- ...
  ok  heading weight 500 -> modes.css: font-weight 500 on '.pb-org-expand-heading' is not a ... Typography weight (400/600)
  ok  zero groups without loose cards -> organising-widget.ts: renderCanvas returns on zero groups without renderLoose() -- ...
  ok  focus scope back to the tray -> organising-widget.ts: tray reference 'pb-org-tray' survives -- ...
  ok  spec Typography 13px deleted -> modes.css: font-size 13px is not a ... Typography size (12/14)
verify-gui08-canvas-geometry --self-test: PASS -- 12 planted faults went red naming the drift
```
The quoted lines shorten the paths. The command prints them in full.

**Wave-2 `--quick`** (`logs/quick-21-04.log`, run once after all three commits): exit 0. The summary shows 132 PASS and 0 FAIL, including `gui08-canvas-geometry: PASS` and `gui08-canvas-geometry-self-test: PASS`. The R33 subtraction against `docs/non-gui/quick-baseline.txt` printed nothing.

**Every task:** the `yarn --cwd extensions/modes build` inside `nix develop .#theia` succeeded. `scan-brand-residue` exited 0 with the files staged. `verify-planning-paths` exited 0. `python3 scripts/phase-gate.py --root .` printed nothing after each commit. Each `<verify>` block exited 0. The spec and `scripts/lib/ui-spec.mjs` were not modified.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 (tracer) spec geometry, tray negation, focus scope; tray CSS removed, A5 focus | 101b383 | verify-gui08-canvas-geometry.mjs, modes.css, organising-widget.ts |
| 2 spec typography, zero-group clause; R4, R5, stale CSS comments | 9db6371 | verify-gui08-canvas-geometry.mjs, modes.css, organising-widget.ts |
| 3 12-plant self-test | 0462f88 | verify-gui08-canvas-geometry.mjs |

`git show --stat --format=` listed exactly these files for each commit. `git rev-list --count 31dc62a..HEAD` returns 3.

## Deviations from Plan

None. The plan was executed as written. Notes:

- The tray-era hook check (`dataset.tray`) and the negated tray search are separate clauses. A widget tray reference therefore shows up as its own failure line, which is what the Task 1 red log required.
- The old local `stripCssComments` and the zoom, box-minimum and thumbnail-span helpers were removed. The module's `stripCssComments` is used, and one `braceSpan`/`braceBlock` helper now serves the thumbnail gate, `moveCardFocus` and the zero-group branch.
- Plant 3's message reads "found 1 label sites" because the clause reports the label count, and the planted label still counts as one. The message is unchanged from the existing check. The plant matches on 'New Group'.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/verify-gui08-canvas-geometry.mjs, theia/extensions/modes/src/browser/modes.css, theia/extensions/modes/src/browser/organising-widget.ts
- FOUND: 101b383, 9db6371, 0462f88 (all ancestors of HEAD)
