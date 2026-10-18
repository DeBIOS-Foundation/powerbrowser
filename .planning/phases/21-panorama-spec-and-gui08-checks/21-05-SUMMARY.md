---
phase: 21-panorama-spec-and-gui08-checks
plan: 05
subsystem: verification
tags: [panorama, gui08, live, loose-cards, pan-07, baseline, r33]
status: complete
requires:
  - phase: 21-03
    provides: "gui08-panorama-copy derived from the 15-UI-SPEC Copywriting Contract"
  - phase: 21-04
    provides: "loose cards with zero groups (A3), loose and expanded cards in the focus scope (A5), canvas geometry derived from 15-UI-SPEC"
provides:
  - "gui08-loose-cards-live (full tier): live DOM proof of loose cards with zero groups and with one, all inside the canvas host, no tray element, ArrowRight between loose cards, three in-run probe controls"
  - "The zero-group loose line sits inside the visible canvas (display: flow-root on .pb-org-canvas)"
  - "docs/non-gui/quick-baseline.txt empty by derivation; --quick 132 PASS, 0 FAIL, confirmed by a second run"
affects: [phase-21-verification]
tech-stack:
  added: []
  patterns:
    - "A live row's probes are shared code: the probe controls plant a page fault and re-run the same probe that passed"
    - "A live geometry claim asserts placement inside the visible host, not only non-overlap"
key-files:
  created:
    - scripts/verify-gui08-loose-cards-live.mjs
  modified:
    - scripts/verify-platform.sh
    - theia/extensions/modes/src/browser/modes.css
    - docs/non-gui/quick-baseline.txt
    - docs/non-gui/decisions.md
decisions:
  - "Option A for the zero-group clipping defect: display: flow-root on .pb-org-canvas plus an in-host assertion in the live row. The orchestrator chose it under Chris's standing autonomous rule (take the recommended option when one exists); Chris was not asked"
  - "No 15-UI-SPEC row added for display: flow-root: gui08-canvas-geometry derives px rows only and stayed green with its self-test"
metrics:
  duration: "about 45 min"
  completed: 2026-10-17
estimate:
  tokens: 45000
  tasks: 2
actuals:
  tokens: 4300
  tasks: 2
  commits: 4
plan_head_before: 1318d60026a96e8e735f82f142d865ac5d0152a3
plan_head_after: 41a1975d96f7e272cc2f3e315d1288ad455dc24d
---

# Phase 21 Plan 05: Live Loose-Cards Row and Empty R33 Baseline Summary

The live row `gui08-loose-cards-live` checks the running Organising canvas. With zero groups and with one group, ungrouped tabs show as loose cards wholly inside the visible canvas, no tray element exists, and ArrowRight moves between loose cards. Three planted page faults each turn their probe red. The live run found a 24 px clipping defect in the zero-group state; it is fixed. `--quick` has no FAIL row, and the R33 baseline is 0 bytes by derivation.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | 04bb426b57b447211bfebfb1d2284759283cc8e9 test(21-05): add the live loose-cards row ... | scripts/verify-gui08-loose-cards-live.mjs, scripts/verify-platform.sh |
| 1 (deviation) | 0256597708085a31e21f958309931fd72e530309 test(21-05): require every loose card to lie inside the canvas host ... | scripts/verify-gui08-loose-cards-live.mjs |
| 1 (deviation) | 81c5952f88b5e41e6976ad8ffc33175ae08aa8c1 fix(21-05): keep the zero-group loose line inside the canvas ... | theia/extensions/modes/src/browser/modes.css |
| 2 | 41a1975d96f7e272cc2f3e315d1288ad455dc24d docs(21-05): derive the R33 quick baseline empty ... | docs/non-gui/quick-baseline.txt, docs/non-gui/decisions.md, scripts/verify-platform.sh |

`git show --stat` lists exactly the planned files for 04bb426 (2 files) and for 41a1975 (3 files).

## Task 1: live evidence (logs/ under the phase directory, git-ignored)

The final build and the runs on it:

| Log | Result | PHASE21_WALL_SECONDS |
|-----|--------|----------------------|
| build-21-05.log (rebuild after 81c5952) | PHASE21_EXIT=0 | 10 |
| loose-cards-21-05.log | PASS | 11 |
| ng007-21-05.log | PASS | 24 |
| ng008-21-05.log | PASS | 26 |
| loose-cards-red-21-05.log (strengthened row, pre-fix bundle) | FAIL, as required | 9 |

The first rebuild, before the fix, took 13 s and was incremental (`tsc -b` and webpack). `bundle.js` was rewritten at 17:02:44 and carried the 21-04 focus scope. After the fix, `bundle.css` carries `.pb-org-canvas { display: flow-root; ... }`.

loose-cards-21-05.log:

```
gui08-loose-cards-live: zero groups: 3 terminal tabs are loose cards beside the empty panel (no overlap, all inside the canvas host); DOM loose 4 = model ungrouped 4
gui08-loose-cards-live: no tray: 0 pb-org-tray elements beside 16 pb-org-card elements
gui08-loose-cards-live: keyboard: ArrowRight moved focus view:welcome -> terminal:gui08-loose-a across 4 visible loose cards, 1 tab stop
gui08-loose-cards-live: screenshot of the zero-group canvas: .../logs/loose-cards-zero-groups-21-05.png
gui08-loose-cards-live: one group: 1 box, no empty panel, 3 loose cards still on the canvas, all inside the canvas host
gui08-loose-cards-live: probe controls: 3 planted page faults each turned their probe red
verify-gui08-loose-cards-live: PASS
  gui08-loose-cards-live: PASS
```

The fourth loose card is the Welcome view. Every fresh profile opens it, and the model counts it as ungrouped, so the DOM count of 4 equals the model's count of 4.

ng logs: `  ng-007-shell-tabs-keep-group-across-restart: PASS`, `  ng-008-panorama-card-reopens-through-opener: PASS`.

**Screenshot** `logs/loose-cards-zero-groups-21-05.png` is untracked and kept as evidence for the end-of-phase review.
- It shows the Organising canvas in Canvas view at 100%, with the "No tab groups" panel and its New Group button top-centre.
- Four loose cards (Welcome, bash, bash, bash) sit on one line along the bottom-left, fully visible with their title strips, and well clear of the panel.
- A thin scrollbar strip shows at the right edge of the canvas host (see Deferred Issues).

Before the fix, the same screenshot showed the cards cut off at the window's bottom edge, with no title strips visible.

## Task 2: commit gate and baseline

- Derivation run, `logs/quick-21-05-base.log`: `verify-platform: summary` present, 132 PASS, 0 FAIL, `verify-platform: PASS -- all checks passed`, 51 s.
- The R33 pipeline over that log wrote `docs/non-gui/quick-baseline.txt`. `wc -c` reports 0. No label was typed, and the file was kept.
- Confirming run, `logs/quick-21-05.log` (the verify block's second `--quick`, after the commit): 132 PASS, 0 FAIL. `fail-21-05.log` is 0 bytes and `cmp`-equal to the baseline.
- All gui08 rows, planning-paths and scan-brand-residue pass by name.
- `plan gate passed: 2/2 IDs cited (phase 21)`. phase-gate is silent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The zero-group loose line sat 24 px below the visible canvas**
- **Found during:** Task 1, reading the first screenshot. The row had passed.
- **Issue:** `.pb-org-empty`'s `margin: 24px auto` collapsed through `.pb-org-canvas` (position-relative, with no padding or border), so the canvas root started 24 px below the host's padding edge. `renderLoose()` places the line from `canvasHost.clientHeight`, so every loose card ended at y 792 against a host bottom of 768. The cards were clipped and the host scrolled. The defect appeared when 21-04 (A3) made the zero-group branch draw loose cards. The one-group state was not affected.
- **Decision:** I stopped and reported it as a checkpoint. The orchestrator chose option A under Chris's standing autonomous rule ("take the recommended option when one exists"). Chris was not asked.
- **Fix:** `display: flow-root;` on `.pb-org-canvas`. Measured beforehand with a runtime-only test: canvas top moves from 129 to 105, card bottom from 792 to 768, and the clip from 24 px to 0, the same as the one-group geometry. `gui08-canvas-geometry` and its self-test pass (`logs/geometry-21-05.log`, `logs/geometry-selftest-21-05.log`). That check derives px rows only, so 15-UI-SPEC needed no new row.
- **Files modified:** theia/extensions/modes/src/browser/modes.css
- **Commit:** 81c5952f88b5e41e6976ad8ffc33175ae08aa8c1

**2. [Rule 2 - Missing check] The live row did not assert placement inside the visible canvas**
- **Found during:** Task 1, same finding.
- **Issue:** The plan's assertions (no overlap with the panel, positive area) could not see clipping.
- **Fix:** Every visible loose card's rect must lie inside `.pb-org-canvas-host`'s rect, in the zero-group and one-group states. This was committed before the fix and run on the unfixed bundle. It went red naming all four cards, for example `[32,677,192,792]` against host `[0,89,1280,768]` (`logs/loose-cards-red-21-05.log`). It passes after the fix and rebuild. The file is not hash-locked, and phase-gate stayed silent.
- **Files modified:** scripts/verify-gui08-loose-cards-live.mjs
- **Commit:** 0256597708085a31e21f958309931fd72e530309

## Deferred Issues

- **Scrollbar on the canvas host in every state.** The host's scrollHeight is 707 against a clientHeight of 679, in the one-group state before this plan's fix as well. `canvasRoot.minHeight` is the host height minus 4, and the host's 16 px padding adds to it. This predates Phase 21; the line math dates from 7b7a1f7. The loose cards are now fully visible, so I left it alone.
- **Detail lines print even when an assertion fails.** In the red log, the zero-group detail line still says "all inside the canvas host" above the FAIL. The FAIL lines and the exit code are authoritative. Only the probe-controls line is gated on success.

## Threat model

- T-21-09: every driver call used `PB_VERIFY_PORT=3939`. The pgrep guard ran before each build and live run. Port 3000 was never touched.
- T-21-10: the baseline is pipeline output, `cmp`-equal to a second run.
- T-21-11: the tray probe has a positive control in the same query pass (16 pb-org-card elements), and all three probe controls went red.

## End-of-phase human check (Chris, not blocking)

1. Look at `logs/loose-cards-zero-groups-21-05.png`: the loose cards sit beside the panel, fully visible.
2. Ratify or overturn the 21-UI-SPEC assumptions A2 to A5. The `flow-root` fix depends on A3 (loose cards with zero groups).
3. Optional: update the three tray lines in the sketch-findings `modes-tabs-and-organising.md` reference.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/verify-gui08-loose-cards-live.mjs
- FOUND: docs/non-gui/quick-baseline.txt (0 bytes)
- FOUND: logs/loose-cards-zero-groups-21-05.png (untracked)
- FOUND commits: 04bb426, 0256597, 81c5952, 41a1975 (all ancestors of HEAD)
