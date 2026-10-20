---
phase: 23-modes-leftovers-and-sketch-005-verdict
plan: 03
subsystem: theia/extensions/modes
status: complete
tags: [modes, motion, side-panels, G-32, MODE-03]
requires: [23-02, 23-04]
provides:
  - "14-UI-SPEC motion contract as Chris chose it: side panels switch instantly (G-32 option a)"
  - "modes-panel-motion (--quick) and its --self-test with eight branch-aware plants"
affects: [14-UI-SPEC, 23-01, 23-05]
tech-stack:
  added: []
  patterns: ["spec-vs-code derivation: fixed-form spec sentence parsed, compared with the one ApplicationShellOptions rebind and stock DEFAULT_OPTIONS"]
key-files:
  created:
    - scripts/verify-panel-motion.mjs
  modified:
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md
    - scripts/verify-platform.sh
decisions:
  - "G-32 applied as option a (Chris, 2026-10-18): side panels open and close instantly on a mode switch; no theia/ file changes; 14-UI-SPEC amended in five places"
  - "No live motion row: option a has no motion to measure"
requirements: [MODE-03, NG-074, NG-084]
metrics:
  completed: 2026-10-18
  duration: 10min
  tasks: 2
estimate:
  tokens: 55000
  tasks: 2
actuals:
  tokens: 6606
  tasks: 2
  commits: 1
plan_head_before: 62d6846c4396ec60029db83c0662b89052557abb
plan_head_after: c86f432b7d3063b22ddced37d69213d21117c538
---

# Phase 23 Plan 03: Side panels switch instantly per Chris's G-32 choice Summary

Chris chose option a for G-32, so the code was already correct (stock `expandDuration` 0, the single rebind overriding only `expandThreshold`). This plan changed the spec to match the code: 14-UI-SPEC now describes instant panels in its scope note, Motion sentence, Interaction bullet and loading row, and the slide-distance exception row is gone. A new `--quick` check, `modes-panel-motion`, derives the motion from both sides and keeps them equal (MODE-03). Nothing under `theia/` changed. No new user-facing string.

## Chris's answer

ROADMAP Phase 23 Needs Chris line, verbatim fragment: `G-32 chosen by Chris 2026-10-18: a (instant, spec amended; MODE-03)`.
K = a, N = none.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | c86f432 `docs(23-03): side panels switch instantly per Chris's G-32 choice; 14-UI-SPEC amended and modes-panel-motion added (MODE-03)` | 14-UI-SPEC.md, scripts/verify-panel-motion.mjs, scripts/verify-platform.sh |
| 2 | none (option a: no live script; runs and logs only) | — |

`git show --stat --format= c86f432` lists exactly those three files. None of them changed in an earlier Phase 23 commit before 23-04's records commit.

## Task 1: spec, check, registry

14-UI-SPEC, five places:
- Scope note: "side panels open and close instantly per mode".
- Spacing exception "Panel slide distance": row deleted.
- Motion: "Side panels switch instantly on a mode switch, with no animation (Chris, G-32, 2026-10-18)." The toggle-segment and tab sentences after it are unchanged.
- Interaction bullet: "panels and the strip change at once".
- Loading row: "Panels switch instantly; tabs never unmount so there is no tab loading state on switch".
- `grep -i slid` over 14-UI-SPEC finds nothing.

`scripts/verify-panel-motion.mjs` output:
```
modes-panel-motion: PASS -- kind=a
  ok  1 spec Motion switched to another form -> red, naming 'disagree'
  ok  2 expandDuration: 150 added to bottomPanel -> red, naming 'bottomPanel'
  ok  3 second rebind added -> red, naming 'rebind count is 2'
  ok  4 expandThreshold 0 removed from leftPanel -> red, naming 'leftPanel lost expandThreshold 0'
  ok  5 loading row says it slides -> red, naming 'disagree'
  ok  6 slide-distance row restored -> red, naming 'slid'
  ok  7 left shrink added -> red, naming 'no kind'
  ok  8 `### Motion` heading renamed -> red, naming 'ZERO'
modes-panel-motion --self-test: PASS -- all 8 planted faults went red on a kind=a tree
```
It also implements the b and c derivations and plant variants, so the check keeps working if the answer changes. Only the a variants are exercised on this tree.

Registered in `--quick` after `gui07-mode-switch-tabs-invariant-self-test`: `modes-panel-motion` and `modes-panel-motion-self-test`. `git grep 'rebind(ApplicationShellOptions)' -- theia/extensions` gives one site. `verify-mode-switch-tabs-invariant.mjs` plus its `--self-test` and `verify-gui09-setups-copy.mjs` plus its `--self-test` all pass. The residue scan passes over 364 files. phase-gate printed nothing. Task 1's `<automated>` verify passed.

## Task 2: live proof and the wave-2 gate

- No live motion row: option a has no motion to measure. `scripts/verify-panel-motion-live.mjs` was not created.
- Rebuild: commit 8e57e96 under `theia/extensions` is newer than `build-23-02.log`, so the sidecar was rebuilt. `logs/build-23-03.log`: `PHASE23_WALL_SECONDS=12`, `PHASE23_EXIT=0`.
- `PB_VERIFY_PORT=3939 --only gui07-mode-switch-tabs-live`, `logs/switch-live-23-03.log` (`PHASE23_WALL_SECONDS=16`, `PHASE23_EXIT=0`):
  `verify-mode-switch-tabs-live: PASS -- 1 main-area and 2 bottom-area tab(s) survived every second-visit mode switch, attached` / `  gui07-mode-switch-tabs-live: PASS`
- `PB_VERIFY_PORT=3939 --only diff-theia-core`, `logs/diff-core-23-03.log` (`PHASE23_WALL_SECONDS=11`, `PHASE23_EXIT=0`): `  diff-theia-core: PASS`. `git -C upstream diff --quiet` exits 0.
- ng-035 not run: it is required only under option c.
- Wave-2 `--quick`, `logs/quick-23-03.log` (`PHASE23_WALL_SECONDS=50`, `PHASE23_EXIT=0`): **136 PASS, 0 FAIL**, `verify-platform: PASS -- all checks passed`. `modes-panel-motion`, `modes-panel-motion-self-test`, `modes-name-cap-at-input`, `gui07-mode-switch-tabs-invariant`, `gui09-setups-copy`, `allowlist-doc-consistency`, `scan-brand-residue` and `planning-paths` all PASS. `docs/non-gui/quick-baseline.txt` is 0 bytes.
- Task 2's `<automated>` verify passed.

End-of-phase human check for Chris (does not block): on a Browsing, Coding, Browsing round trip in the built shell, the panels open and close at once.

## Deviations from Plan

None. The plan was executed as written for option a.

## Notes

- `stripComments` in the check is a small tokenizer. It does not recognise regex literals, so an apostrophe inside a regex literal in an extension source could hide a later `rebind(ApplicationShellOptions)` in that file. It finds the one real site today.

## Self-Check: PASSED

- FOUND: scripts/verify-panel-motion.mjs
- FOUND: .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md
- FOUND: commit c86f432 (ancestor of HEAD)
