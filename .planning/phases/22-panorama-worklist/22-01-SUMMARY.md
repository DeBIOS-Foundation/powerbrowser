---
phase: 22-panorama-worklist
plan: 01
subsystem: ui
tags: [theia, panorama, tab-strip, group-model, live-check]
status: complete

requires:
  - phase: 21-panorama-spec-and-gui08-checks
    provides: gui08 static checks, gui08-loose-cards-live and its probe-control pattern
provides:
  - GroupModel loads itself at layout init (onDidInitializeLayout, not awaited) and reloads on shell add/remove
  - GroupModel.liveTabs, showsInStrip and joinActiveGroup
  - Browsing strip paints the active group's tabs, the loose tabs and the current tab (PAN-03, D1, D2)
  - "+" (powerbrowser.chrome-bar.new-tab) joins the active group
  - 15-UI-SPEC binding sentence amended (L2) and E11 rows
  - full-tier live row pan03-strip-group-live with two in-run probe controls
  - Chris's copy answers C1 (the recommended set, accepted by Chris)
affects: [22-02, 22-04, 22-06, panorama, chrome-bar]

actuals:
  tokens: 9569
  tasks: 3
  commits: 3
plan_head_before: 68bf812d426e1f217f57745bc74e99080659f963
plan_head_after: a5795b0113e675181fb686af6cc78c036ecdd232

tech-stack:
  added: []
  patterns:
    - "The strip reads GroupModel for membership and keeps no tab model of its own"
    - "Live expected sets derived from membership reads, never from the predicate under test"

key-files:
  created:
    - scripts/verify-pan03-strip-group-live.mjs
  modified:
    - theia/extensions/modes/src/browser/group-model.ts
    - theia/extensions/modes/src/browser/modes-frontend-module.ts
    - theia/extensions/modes/src/browser/organising-widget.ts
    - theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx
    - theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
    - scripts/verify-platform.sh

key-decisions:
  - "GroupModel is a FrontendApplicationContribution whose onDidInitializeLayout awaits nothing, so the self-load cannot re-enter the boot deadlock"
  - "Live checks reach the tab strip through DI (A.get('TabStripWidget')): it is a chrome-bar child, not a shell-area widget"
  - "Copy C1: the recommended set (1 ok, 2 ok, 3 ok, 4a, 5 add, 6 add, 7 add), accepted by Chris with the reply 'just contiune the planed work'; binding for 22-02, 22-04, 22-06"

requirements-completed: [PAN-02, PAN-03]

duration: ~1 session (resumed mid-Task 1)
completed: 2026-10-18
---

# Phase 22 Plan 01: Browsing strip follows the active group Summary

**GroupModel loads itself at layout init. The Browsing strip paints only the active group's tabs, the loose tabs and the current tab. "+" writes the new tab into the active group. pan03 proves all of this live, on a rebuilt sidecar, with two probe controls shown able to go red.**

## Resume note

A previous executor stopped partway through Task 1 and left uncommitted edits to four files: group-model.ts, modes-frontend-module.ts, organising-widget.ts and tab-strip-widget.tsx. I reviewed them against plan steps 1-4. They were correct and I kept them unchanged.

I then completed steps 5-10:
- the New Tab join;
- the 15-UI-SPEC amendment;
- the builds and static checks;
- both commits;
- the live row and its registry line;
- the rebuild and the live run.

The Task 1 precondition (a clean tracked tree) was not met at the start. That was expected for a resume.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | a328d65 | feat(22-01): the Browsing strip shows the active group's tabs, loose tabs and the current tab, and + joins the active group (PAN-03) |
| 1 | 181f8d9 | test(22-01): add the live strip-follows-group row with in-run probe controls (PAN-03) |
| 1 | a5795b0 | fix(22-01): reach the tab strip through DI in the pan03 live row |
| 2 | none | checks only; the logs are git-ignored |
| 3 | none | copy checkpoint; answers recorded below |

PAN-02 holds: 7cf50ce is an ancestor of a328d65.

`git show --stat` of a328d65 lists exactly the five code files and 15-UI-SPEC.md. 181f8d9 lists exactly the script and the registry.

## Evidence

- **Static checks:** gui08 view-parity (with its self-test), close-exactness, canvas-geometry, panorama-copy and the mode-switch invariant are all green, and so are the self-tests of the last four.
- **Build:** `logs/build-22-01.log`, PHASE22_EXIT=0, **11 s** wall, built at 181f8d9. The bundle contains joinActiveGroup.
- **pan03:** `logs/pan03-22-01.log`, PASS, **44 s** wall, run at a5795b0. The first run failed (9 s, harness error) on the strip lookup; see Deviations. Detail lines, verbatim:
  - `pan03-strip-group-live: (a) no group: "+" opened web:wt-54cq7f-1, loose in the model and its row (group_id null); the strip paints all 2 home tabs`
  - `pan03-strip-group-live: (b) A active, /a current: the strip paints [Welcome | New Tab | page a | page b | page l] = the derived set, of 6 home tabs; B's "page c" absent`
  - `pan03-strip-group-live: (c) B's tab current: painted as the current tab, A still active; strip [Welcome | New Tab | page a | page b | page c | page l]`
  - `pan03-strip-group-live: (d) "+" with A active: row web:wt-54cq7f-6 has group_id group-mvda7f6q-7ben, getTabs(A) lists it, and the strip paints it with /a current`
  - `pan03-strip-group-live: (e) Coding with A active: all 8 main-area tabs displayed in their dock bars; back in Browsing the strip is filtered again`
  - `pan03-strip-group-live: (f) relaunch: model loaded in 1 ms with Organising never opened; A active; strip [Welcome | New Tab | page a | page b | page l | New Tab | New Tab] of 8 home tabs, B's tab filtered out`
  - `pan03-strip-group-live: probe controls: 2 planted page faults each turned their probe red`
  - `verify-pan03-strip-group-live: PASS` and `  pan03-strip-group-live: PASS`
- **Task 2 regression rows:** each ran alone after the build. All PASS:

  | Row | Wall time |
  |-----|-----------|
  | `  ng-004-new-tab-row-unknown-uri-error: PASS` | 13 s |
  | `  ng-007-shell-tabs-keep-group-across-restart: PASS` | 23 s |
  | `  ng-008-panorama-card-reopens-through-opener: PASS` | 26 s |
  | `  gui08-loose-cards-live: PASS` | 12 s |
  | `  gui02-web-tab-live: PASS` | 27 s |
  | `  gui07-mode-switch-tabs-live: PASS` | 16 s |

- **--quick:** `logs/quick-22-01.log`, 132 PASS, 0 FAIL, 63 s wall, run at a5795b0. `docs/non-gui/quick-baseline.txt` is still 0 bytes.
- **Gates:** the Task 1 and Task 2 `<verify>` blocks pass in full. `phase-gate.py` prints nothing and the brand-residue scan exits 0.

## Copy answers (C1)

History:
1. Chris's first reply to the copy checkpoint, verbatim: "can you contiue in atonomes mode". The orchestrator then took the recommended answers under that autonomous-mode instruction. Chris did not word any item.
2. The orchestrator then showed Chris the seven items with the recommended line `1 ok, 2 ok, 3 ok, 4a, 5 add, 6 add, 7 add` and asked him to confirm in his own words. His reply, verbatim, as relayed by the orchestrator: "just contiune the planed work".

Resolved: the recommended set `1 ok, 2 ok, 3 ok, 4a, 5 add, 6 add, 7 add`, which Chris accepted with that second reply. He did not reword any item.

1. Undo control label: "Undo Close Group"
2. Undo control accessible name and tooltip: Undo Close Group "{name}"
3. Card close control tooltip and accessible name: "Close tab"
4. Empty-canvas body: "There are no tab groups yet — choose New Group, or drag across the canvas to draw one."
5. Resize grip's accessible value: "{w} by {h} pixels" (add)
6. Card tooltip: the tab's title, a line break, then its address; just the title when there is no address (add)
7. Zoom readout: "{N}%" (add)

These answers are binding for 22-02 (items 4-7), 22-04 (items 1-2) and 22-06 (item 3). Item 1 keeps the PAN-04 name, so no rename note is needed. No 22-UI-SPEC assumption (A1-A12) was overturned. Chris may revise any of these at the end-of-phase review.

At checkpoint time the Task 3 `<verify>` passed:
- every quoted shipped string is still in organising-widget.ts, at :454, :487, :847 and :865;
- no "Undo Close Group" or 'Close tab' string is in the tree.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pan03 reached the strip by a lookup that returns undefined**
- **Found during:** Task 1, step 10 (first live run)
- **Issue:** The plan's `A.shell().getWidgetById('powerbrowser.tab-strip')` returns undefined. The strip is a DI singleton inside the chrome bar, not a shell-area widget.
- **Fix:** Use `A.get('TabStripWidget')`.
- **Files modified:** scripts/verify-pan03-strip-group-live.mjs
- **Commit:** a5795b0

### Strengthened probes (no assertion weakened)

- **Step (d):** /a is re-activated before the strip check. Without that, the "+" tab would be painted only because it is current, not because it is a member of A.
- **Step (f):** the run also requires B's tab to be open after the relaunch and not painted. This proves the strip is filtered, not only that it matches the derived set.

### Minor

- The New Tab join failure logs the error name only, after the fixed prefix. This follows the repo's practice of never logging a raw exception message.

## Known Stubs

None.

## Gaps not covered

- The 15-UI-SPEC "filter-live" backstop row also names card drag, band draw, close and undo. pan03 covers "+", group activation and relaunch. Close and undo arrive in later Phase 22 plans.
- "loaded in 1 ms" in step (f) means the model had already loaded at layout init, before the harness's first read. It is not a timing measurement.

## Self-Check: PASSED

- FOUND: scripts/verify-pan03-strip-group-live.mjs
- FOUND: a328d65, 181f8d9, a5795b0 (each an ancestor of HEAD)
