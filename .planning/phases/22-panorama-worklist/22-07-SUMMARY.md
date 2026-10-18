---
phase: 22-panorama-worklist
plan: 07
subsystem: verification
tags: [panorama, full-suite, failset, provenance, gui08]
status: complete
requires:
  - phase: 22-06
    provides: the card close (PAN-05) and every earlier Phase 22 change, committed and green
provides:
  - The full suite on one rebuilt sidecar at 48025d3, with every Phase 22 and regression row PASS
  - 22-FAILSET.txt, derived, carrying only ng074-ci-green-on-main (NG-074, Phase 25)
  - 15-UI-SPEC Provenance row for Phase 22 and current gui08 registry comments
affects: [22-verify-work, v1.4 closeout]
tech-stack:
  added: []
  patterns: [FAIL set generated from the run summary joined with the 19-FAILSET-1.76 owners]
key-files:
  created:
    - .planning/phases/22-panorama-worklist/22-FAILSET.txt
  modified:
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
    - scripts/verify-platform.sh
decisions:
  - "verify-customize-inert failed in the full run (state 1 absent vs state 2 empty, pixels differ) and passed in its alone re-run, so under R28 it is not in 22-FAILSET.txt"
requirements: [PAN-02, PAN-03, PAN-04, PAN-05, PAN-06, NG-074, NG-084]
metrics:
  duration: 49min
  completed: 2026-10-18
actuals:
  tokens: 1240
  tasks: 2
  commits: 2
plan_head_before: 48025d3ea6e972b6e39796f077166ddb7b9d2768
plan_head_after: b546b9a636c05293d1567e692ff52369dbdb4d75
---

# Phase 22 Plan 07: Full-suite proof, provenance and end-of-phase review Summary

The full `scripts/verify-platform.sh` ran on one sidecar rebuilt at 48025d3: 237 PASS, 2 FAIL. The R28 alone re-runs leave one red, `ng074-ci-green-on-main`, which NG-074 owns, so 22-FAILSET.txt holds that one line. 15-UI-SPEC Provenance now has a Phase 22 row, and the gui08 registry comments describe the undo-window contract.

## Task 1: full suite on one rebuilt sidecar

- **Build** (`logs/build-22-07.log`): `PHASE22_RUN_COMMIT=48025d3ea6e972b6e39796f077166ddb7b9d2768`, `PHASE22_WALL_SECONDS=11`, `PHASE22_EXIT=0`. The rebuild rewrote `theia/applications/browser/lib/frontend/bundle.js` at 08:29:51, after the last theia commit (13ba87b, 08:18:18).
- **Full run** (`logs/full-22-07.log`, `PB_VERIFY_PORT=3939`, no flag): `PHASE22_RUN_COMMIT=48025d3ea6e972b6e39796f077166ddb7b9d2768`, **`PHASE22_WALL_SECONDS=2676`**, `PHASE22_EXIT=1`. Summary: **237 PASS, 2 FAIL** (`verify-customize-inert`, `ng074-ci-green-on-main`).
- **R28 alone re-runs:**
  - `verify-customize-inert` failed in the full run with `verify-customize-inert: FAIL -- state 1 (absent) vs state 2 (empty) -- pixels differ, the inertness claim failed`. Alone (`logs/rerun-verify-customize-inert-22-07.log`) it gave `verify-customize-inert: PASS`, `PHASE22_EXIT=0`, 15 s. It is not listed. Phase 22 did not touch the customize extension.
  - `ng074-ci-green-on-main` alone (`logs/rerun-ng074-ci-green-on-main-22-07.log`) still FAIL. It is owned in 19-FAILSET-1.76 as `NG-074 (Phase 25)`. A push that lets CI prove the tree again is Chris's job.
- **22-FAILSET.txt** was generated from the run summary, the re-run logs and the 19-FAILSET-1.76 owner column, not typed by hand:

  ```
  ng074-ci-green-on-main	NG-074 (Phase 25)
  ```

- Every named row is PASS in the full run: pan03-strip-group-live, pan04-undo-close-group-live, pan05-card-close-live, ng-004, ng-006, ng-007, ng-008, ng-032, ng-034, gui02-web-tab-live, gui07-mode-switch-tabs-live (+ self-test), gui08-loose-cards-live, gui08-close-exactness, gui08-canvas-geometry, gui08-panorama-copy, gui08-view-parity and scan-brand-residue. The task's automated verify chain passed, and `phase-gate.py` printed nothing.
- **Screenshots** (untracked):
  - `logs/undo-window-22-07.png`: Organising, Canvas view at 100%. To the left, the closed group's place holds one "Undo Close Group" button, about 145 px wide and 32 px high, on the surface fill. The one remaining "Untitled group" box (card "page s") shows no close × in its header, which is the PAN-06 last-group guard: a group in its undo window does not count. The "Welcome" loose card is at the bottom left.
  - `logs/card-close-22-07.png`: Organising, Canvas view. There are two "Untitled group" boxes, each with its header ×; the right one shows "Empty group — drag tabs here." The left box's card "page c" shows its round × (dark translucent fill, white ×) 4 px in from the card's top-right corner, over the green preview. Loose cards "Welcome" and "page l" are at the bottom left.

## Task 2: provenance, registry comments, commit gate

- 15-UI-SPEC Provenance has a new "Phase 22 additions" row covering the strip following the active group, "+" joining it, Undo Close Group replacing the confirmation, the card ×, and the last group kept. It cites 22-UI-SPEC, Chris's decisions 1 and 2, and his copy answers. It cites no `.planning/phases/` path.
- `scripts/verify-platform.sh` (comments only): the `gui08-close-exactness` comment describes the deferred close (no dialog, commitClose reached by the UNDO_CLOSE_MS timer and the quit flush, Undo writes nothing, the canCloseGroup last-group guard) and the unchanged chrome-side close. It no longer mentions cancel-before-mutation. The `gui08-canvas-geometry` comment names the undo, fade and card-close rows. `bash -n` is clean.
- After the edit, gui08-canvas-geometry (20 const rows and 10 CSS rows), gui08-panorama-copy (31 strings), gui08-close-exactness and scan-brand-residue (360 files) all PASS.
- **`--quick`** (`logs/quick-22-07.log`, run alone): `PHASE22_RUN_COMMIT=b546b9a636c05293d1567e692ff52369dbdb4d75`, **132 PASS, 0 FAIL**, `verify-platform: PASS -- all checks passed`, `PHASE22_WALL_SECONDS=56`, `PHASE22_EXIT=0`. `docs/non-gui/quick-baseline.txt` is 0 bytes.
- The chrome writer `PowerBrowserAPI.sys.mjs` is unchanged since 02ce825. Every theia/extensions commit since 02ce825 descends from 7cf50ce (PAN-02). `plan-gate --phase 22` passed. `phase-gate.py` printed nothing. The task's automated verify chain passed.

## Phase 22 commits (full SHA)

```
8aa648deb309262f7708b9032f8aeb43ca62387b docs(22,23): UI-SPECs (approved by ui-checker), research, validation and plans
7cf50cedcdbe20d7190a20cea76c3d90dd413f4e docs(22): context with Chris's Panorama decisions 1 and 2 (PAN-02)
a328d6508d451f4aeb13bbdf753139399ccf4007 feat(22-01): the Browsing strip shows the active group's tabs, loose tabs and the current tab, and + joins the active group (PAN-03)
181f8d977f1bcfc46a73a1e5b8561313a622f167 test(22-01): add the live strip-follows-group row with in-run probe controls (PAN-03)
a5795b0113e675181fb686af6cc78c036ecdd232 fix(22-01): reach the tab strip through DI in the pan03 live row
d1de8373a00161291168499e6100426fa78124c0 docs(22-01): complete the strip-follows-group plan with copy answers C1
78ebd1d2df23bcf8a76e7c63b3b65dcddc16c4db docs(22): plan 22-01 complete
40fad6dca663496dc57173037e5d8e6429a23eb8 fix(22-02): contract the Panorama copy Chris reviewed and derive it from every text sink (PAN-04, PAN-05)
54f3c8b3a494f3c35c775fc4e2d049ec7d063a20 fix(22-02): name each text-bearing ARIA attribute in full in the copy sink pattern
ccf1092a6129caab8a44207783ec64dcbc673c46 docs(22-02): complete the Panorama copy contract plan
449516bd6969714fcfa10dde8bbfdfc8c467a787 feat(22-03): a closed group waits UNDO_CLOSE_MS on the model and commits through closeGroupRows (PAN-04)
14d8f2fd4991c44894f0567e532be221ec7e002a test(22-03): add the live undo-window row over the group model with in-run probe controls (PAN-04)
4fcf4b20226ae6ecae883885ae2f4b70cc8e7590 feat(22-03): hide a closing group's tabs in every tab bar and commit pending closes when PowerBrowser quits (PAN-04)
2b82ea09668cf7c825fe1b870341b46c5d216302 test(22-03): pan04 covers every tab bar during the window and a quit inside it (PAN-04)
5e7c5796b358bb2229260322c9d51ceea568cd44 docs(22-03): complete the undo-window-on-the-model plan
9c7e543e4484361860ad6047fc47135796b435f5 feat(22-04): Undo Close Group replaces the close confirmation; 15-UI-SPEC copy and the gui08 checks change with it (PAN-04)
70b1ab645a179fe4021a15bfefefe0b83e5b0911 test(22-04): pan04 drives the Undo Close Group control on canvas and tree (PAN-04)
c0c752cfeb55d59ad9261e03f8bd3fc11e43227d fix(22-04): pan04 retries focusing the Undo control after the mode switch and reports why it fails (PAN-04)
7565decb7557ac9518509287f8804d76e6522bc9 fix(22-04): pan04 reads the Undo control from the view on screen after the mode switch (PAN-04)
1171320e996321f78114fb72ba0c4b474a7c11bc test(22-04): ng-006 closes the group through its undo window and the commit (PAN-04)
f6d58cc361e040dc818511f0c78487764acf3763 docs(22): plans 22-02 and 22-03 complete
2a153a0ce8192d4bea14af109b7640078959bf93 chore(22): record Chris's re-lock of the check hashes at 1171320
2b9fd9147f8f1ad77ad2be21f4192e14e760842e chore(22): record Chris's check baseline
6407a8a4cb84df364200e1c49ebc1bccdd281ac7 docs(22-04): complete the Undo Close Group plan; record the stale NG-006 failure and Chris's check baseline
43f91dc2375561eef9a3185348dbf91b79c35826 feat(22-05): the last remaining group cannot be closed (PAN-06)
b9073d2ba1f3e18e8000f06d6aaeb1c35e29be68 test(22-05): pan04 covers the last remaining group (PAN-06)
cc1984d454a251635bd98329059fe61a0fd70cc6 docs(22-05): complete the last-group plan (PAN-06)
a8118f6d1ff8675ad5c9213b6888a5692019d8ee feat(22-06): close a tab from its Panorama card with × or Delete (PAN-05)
d2f55252f1ddeae39ce6a0105e2e8f75ea2e5e84 test(22-06): add the live card-close row with in-run probe controls (PAN-05)
13ba87bc3db2550af7ec75b29438ee6fcf34c9be fix(22-06): a focused card keeps focus across a re-render, so a keyboard close leaves focus on the next card (PAN-05)
49b8a85902de787279a81863d234a47a1a16bb28 fix(22-06): pan05 reads the editor's text model through its document and names a missing one (PAN-05)
db153129c0d4751d0358af1a7f7156756d8d13b6 fix(22-06): pan05 gives the card keyboard focus before it reads the x's opacity (PAN-05)
f7199cca00837de5acf7a382dcb47e949d7f7225 fix(22-06): pan05 shows the card x under a trusted hover and reads the focus rule from the CSSOM (PAN-05)
c23a79ba039a043ae7463e27cca6998bbb367891 fix(22-06): pan05 prints its (g) detail line again (PAN-05)
48025d3ea6e972b6e39796f077166ddb7b9d2768 docs(22-06): complete the card-close plan (PAN-05)
6b32bc62759e540fe34da09ba29e20f7362b1de7 docs(22-07): record the Phase 22 full-run FAIL set (owned reds only)
b546b9a636c05293d1567e692ff52369dbdb4d75 docs(22-07): record the Phase 22 Panorama additions in 15-UI-SPEC provenance and the gui08 registry comments
```

The commit that adds this SUMMARY follows these.

## End-of-phase review for Chris (verbatim from the plan)

End of phase (`human_verify_mode: end-of-phase`), for Chris; nothing here blocks:
1. Open `.planning/phases/22-panorama-worklist/logs/undo-window-22-07.png`: a group's place should hold one "Undo Close Group" control, centred where the box was. Open `card-close-22-07.png`: the focused card shows its × in the top-right corner over the preview.
2. Ratify or overturn the 22-UI-SPEC assumptions where the research report differed (research C2):
   - A1: no Close Group dialog;
   - A2: 15 s, no discard ×;
   - A4: a quit inside the window closes the group;
   - A5: the current tab stays in the strip (the alternative is that the active group follows the tab);
   - A7: "+" is the only joining path;
   - A10: the last group still dissolves when its last card is dragged out;
   - A11: no active-group label in the strip;
   - the "Group "{name}" closed." flash is kept at the click.

   An overturned item becomes a gap for `/gsd-plan-phase 22 --gaps`.
3. Recorded, not fixed (research Open Questions):
   - a split pane whose every tab belongs to a closing group keeps its own current tab; only the home pane is steered and asserted;
   - a frontend reload during an undo window ends it as an Undo, and the group comes back with its tabs;
   - 22-CONTEXT's "closeGroupRows is touched" was carried out as "the timer and quit commit call it unchanged" (no edit was needed).

   Say if any of these needs work.
4. Live in your own window, if you want to see it: switch to Organising, close a group, press Undo, then close a card with its ×.

## Deviations from Plan

None. The plan ran as written. `verify-customize-inert` failed in the full run and passed alone, which the plan's R28 step covers. No code changed, and no ledger file or ledger check file was touched. STATE.md and ROADMAP.md were left alone, as the orchestrator required.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: .planning/phases/22-panorama-worklist/22-FAILSET.txt (tracked, committed in 6b32bc6)
- FOUND: 6b32bc62759e540fe34da09ba29e20f7362b1de7, b546b9a636c05293d1567e692ff52369dbdb4d75 (ancestors of HEAD)
- FOUND: logs/build-22-07.log, logs/full-22-07.log, logs/quick-22-07.log, both rerun logs, both PNGs
