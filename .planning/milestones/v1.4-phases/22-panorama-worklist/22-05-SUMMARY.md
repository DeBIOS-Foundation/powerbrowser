---
phase: 22-panorama-worklist
plan: 05
subsystem: ui
tags: [theia, panorama, close-group, last-group, gui08-checks, live-check]
status: complete
completed: 2026-10-18

requires:
  - phase: 22-panorama-worklist
    provides: 22-03/22-04 undo window (closeGroup moves a group out of `groups` into `closing`), the Undo Close Group control, close-exactness re-derived for the deferred close
provides:
  - GroupModel.canCloseGroup and the closeGroup guard (PAN-06)
  - no x on the last visible group's canvas box or tree section; TreeSectionHooks.closable
  - close-exactness derivations (h)-(k) with three new plants (10 total) and a last-group backstop
  - pan04 step (h) and probe control P5
affects: [22-06, 22-07, panorama]

plan_head_before: 6407a8a4cb84df364200e1c49ebc1bccdd281ac7
plan_head_after: b9073d2ba1f3e18e8000f06d6aaeb1c35e29be68

actuals:
  tokens: 7200     # chars/4 over the theia, scripts and 15-UI-SPEC diff 6407a8a..b9073d2 (28622 chars)
  tasks: 2
  commits: 2       # git rev-list --count 6407a8a..b9073d2

key-files:
  modified:
    - theia/extensions/modes/src/browser/group-model.ts
    - theia/extensions/modes/src/browser/organising-widget.ts
    - theia/extensions/modes/src/browser/organising-tree.ts
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
    - scripts/verify-gui08-close-exactness.mjs
    - scripts/verify-pan04-undo-close-group-live.mjs

key-decisions:
  - "canCloseGroup(id) is `this.groups.length > 1 && id is in groups`; groups in their undo window are already out of `groups`, so they do not count as remaining"
  - "The guard is closeGroup's first statement, so every caller (x, tree x, command) is covered; closeGroupById also returns early so no flash or Undo is painted"
  - "pan04's status-bar probe reads the DOM element `status-bar-powerbrowser.modes.panorama-notice`; its positive control is G5's closable close in step (g)"
---

# Phase 22 Plan 05: The last group stays Summary

**The last visible group has no x on the canvas or in the tree, and the close-group command does nothing for it: no undo window, no Undo control, no status-bar notice. A pending group does not count as remaining. GroupModel.canCloseGroup implements the rule, and the guard is the first statement of `closeGroup`. close-exactness derives the guard in the model, the canvas and the tree, and pan04 shows it live.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 43f91dc | feat(22-05): the last remaining group cannot be closed (PAN-06) |
| 1 | b9073d2 | test(22-05): pan04 covers the last remaining group (PAN-06) |
| 2 | (none) | ran checks only |

`git show --stat --format= 43f91dc` lists exactly the five files: 15-UI-SPEC.md, verify-gui08-close-exactness.mjs, group-model.ts, organising-tree.ts and organising-widget.ts.

## What changed

- **group-model.ts:** `canCloseGroup(id)` is true when `id` is a visible group and `this.groups.length > 1`. `closeGroup` returns `undefined` at its first statement when `canCloseGroup` is false.
- **organising-widget.ts:** `buildBox` builds the header x only inside `if (this.model.canCloseGroup(group.id))`. The title already has `flex: 1`, so it takes the freed space. `closeGroupById` returns before it flashes or paints an Undo control. `buildSection` passes `closable: this.model.canCloseGroup(group.id)`. `dissolveEmptied` is unchanged.
- **organising-tree.ts:** `TreeSectionHooks.closable: boolean` is documented. The x is built only inside `if (hooks.closable)`. The tree still makes no model query. The 22-04 known gap is fixed here: the header comment no longer says "identical confirmation".
- **15-UI-SPEC:** "Groups on the canvas" gains the three last-group bullets. The tooltip row's Element cell reads "Group close button tooltip (every group except the last)", and the literal is unchanged. UI Considerations gains the "E2 + E5 close" zero-one-many row and the "last-group" backstop. The count line is now 36 covered and 9 backstop, recounted from the table. The Provenance Deferred row no longer names keeping the last group.

## Evidence

**Static checks at 43f91dc:**
- `verify-gui08-close-exactness: PASS -- no dialog and no commit at the click; the timer and the quit flush commit; Undo clears the timer and writes nothing; exact close wiring; the last group has no close in the model, the canvas or the tree`
- `verify-gui08-close-exactness --self-test: PASS -- 10 planted faults went red naming the drift`. The three new plants:
  - `last-group guard removed from the model close -> ...group-model.ts: closeGroup does not start with a canCloseGroup( guard that returns -- the close command can close the last remaining group`
  - `canvas close made unconditional -> ...organising-widget.ts: pb-org-box-close is built outside an if naming canCloseGroup( (enclosing block: '{') -- the last remaining group shows a close control`
  - `tree close made unconditional -> ...organising-tree.ts: pb-org-tree-close is built outside 'if (hooks.closable)' (enclosing block: '{') -- the last remaining group shows a close control`
- `verify-gui08-close-exactness: HELD-OUT (reserved live) -- with one visible group no close control renders on canvas or tree; a second group brings both back [verification: backstop]`
- `verify-gui08-view-parity: PASS -- one model, widget-owned tree renders, visibility-only flip`, and its self-test: `all four fault directions went red naming the drift`
- `verify-gui08-canvas-geometry: PASS` (19 plants in its self-test); `verify-gui08-panorama-copy: PASS -- 30 painted strings equal the 30 literals ...` (14 plants in its self-test)
- `scan-brand-residue: PASS -- no residual brand occurrence in 359 scanned file(s)`; the files were staged first.

**Live runs** (logs under `.planning/phases/22-panorama-worklist/logs/`, untracked, `PB_VERIFY_PORT=3939`):

| Log | Run at | Exit | Wall time |
|-----|--------|------|-----------|
| build-22-05 | b9073d2 | 0 | 11 s |
| pan04-22-05 | b9073d2 | 0 (`  pan04-undo-close-group-live: PASS`) | 82 s |
| ng006-22-05 | b9073d2 | 0 (`  ng-006-close-group-closes-web-tabs: PASS`) | 32 s |
| loose-22-05 | b9073d2 | 0 (`  gui08-loose-cards-live: PASS`) | 12 s |
| ng007-22-05 | b9073d2 | 0 (`  ng-007-shell-tabs-keep-group-across-restart: PASS`) | 24 s |
| quick-22-05 | b9073d2 | 0 | 59 s |

Every row passed on its first run. None needed the single re-run that R28 allows.

pan04 last-group detail lines, verbatim:
- `(h) one visible group G2: no x on its canvas box or tree section; close-group on G2: pending false, still listed, 0 Undo controls, notice false (shown after G5's close: true)`
- `(h) G6 created: x on G2 and G6 in both views; G6 closed: G2 has no x while G6 is pending; Undo: both x return`
- `probe controls: 5 planted page faults each turned their probe red`

Steps (a) to (g) from 22-03 and 22-04 are still green in the same run. ng-006 closes one of two groups, so the rule does not affect it.

**Task 2:** `--quick` (`logs/quick-22-05.log`): `PHASE22_RUN_COMMIT=b9073d2ba1f3e18e8000f06d6aaeb1c35e29be68`, 132 PASS, 0 FAIL, `verify-platform: PASS -- all checks passed`, `PHASE22_EXIT=0`. `docs/non-gui/quick-baseline.txt` is still 0 bytes. `python3 scripts/phase-gate.py --root .` printed nothing after each commit and after the quick run.

## Deviations from Plan

None in the code. Two choices within the plan:

- **Probe order.** P5 (`canCloseGroup` stubbed to always true) runs while G2 is still alone, before G6 is created. Otherwise the stub would not show anything. The G6 sequence ends with G6 restored, so step (f) runs with G2 and G6 present, and it still closes G4 and quits.
- **Notice probe.** The status-bar notice is read from the DOM element `status-bar-powerbrowser.modes.panorama-notice`, which is the id Theia renders for the `powerbrowser.modes.panorama-notice` entry. The step first waits for any earlier notice to clear. It then runs the command and waits 1.5 s, which is inside the notice's 4 s lifetime.

## Notes for the verifier

- **A10 last-card-out dissolve.** `gui08-loose-cards-live` passed. Its log lines do not show it dragging a group's last card out. The evidence that the dissolve path is unchanged is the diff itself: 43f91dc does not touch `dissolveEmptied` or its callers.
- **Ledger.** No ledger file and no hash-locked check file was touched. NG-074 and NG-084 are cited in `requirements` only, as the plan's `ledger_note` says.

## Known Stubs

None.

## Self-Check: PASSED

Commits 43f91dc and b9073d2 are ancestors of HEAD. The logs build-22-05, pan04-22-05, ng006-22-05, loose-22-05, ng007-22-05 and quick-22-05 exist, each with `PHASE22_EXIT=0`.
