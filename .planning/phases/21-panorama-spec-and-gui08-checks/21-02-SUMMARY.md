---
phase: 21-panorama-spec-and-gui08-checks
plan: 02
subsystem: theia/modes (Panorama)
tags: [PAN-07, dead-code, panorama, comments]
status: complete
requires: []
provides:
  - Panorama widget and GroupModel without the card-onto-card / auto-box path
  - No tray wording in theia/extensions or powerbrowser/shell outside modes.css and moveCardFocus (21-04)
affects: [21-04]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - theia/extensions/modes/src/browser/organising-widget.ts
    - theia/extensions/modes/src/browser/group-model.ts
    - theia/extensions/tab-uris/src/node/tab-query-service.ts
    - powerbrowser/shell/PowerBrowserAPI.sys.mjs
decisions:
  - "The card-onto-card handler and GroupModel.autoBox were deleted rather than kept: git grep shows no caller for the handler and only that handler as the caller of autoBox"
requirements: [PAN-07, NG-074, NG-084]
metrics:
  duration: ~4 min
  completed: 2026-10-17
actuals:
  tokens: 3843
  tasks: 2
  commits: 2
plan_head_before: b660c369010849c05c971a3fd656a48237dd7511
plan_head_after: 0b6ae33c15b48e63fb1fa6359eaff3e3996e5616
---

# Phase 21 Plan 02: Panorama tray-era code and wording removal Summary

Deleted the unreachable card-onto-card drop handler, GroupModel's `autoBox` write (with its `autobox:` persist key), the unused `targetCard` local and an orphan JSDoc block. The remaining tray wording in Panorama comments and locals now says loose. No painted string, CSS rule or check changed.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | Delete the dead card-onto-card path | c5812c9 | organising-widget.ts, group-model.ts |
| 2 | Replace tray wording with loose; wave-1 quick gate | 0b6ae33 | organising-widget.ts, group-model.ts, tab-query-service.ts, PowerBrowserAPI.sys.mjs |

## Reachability evidence (Task 1, step 2)

`git grep -n -e dropCardOntoCard -e autoBox -e 'const targetCard' -e 'autobox:' -- theia scripts` before the deletion:

```
group-model.ts:494:    async autoBox(client: GroupActorClient, uris: readonly string[], at: ...
group-model.ts:530:        await this.persist(`autobox:${group.id}`, apply, revert, async () => {
organising-widget.ts:1713:            const targetCard = under?.closest('.pb-org-card') as HTMLElement | null;
organising-widget.ts:1818:    protected async dropCardOntoCard(event: MouseEvent, targetUri: string, targetGroup: string | null): Promise<void> {
organising-widget.ts:1828:            const box = await this.model.autoBox(this.actor, [drag.uri, targetUri], this.canvasPoint(event));
```

- `dropCardOntoCard` had no caller.
- `autoBox` had one caller, which was that handler.
- `targetCard` was assigned and never read.
- The `autobox:` key appeared only inside the method.
- No class extends OrganisingWidget: `grep 'extends OrganisingWidget'` found nothing.

The same grep after the commit returns exit 1, meaning no matches.

Every helper `autoBox` called still has another caller: `locateCard`, `removeCardLocal`, `insertCardLocal`, `writeMembership`, `persist` and `UNTITLED_GROUP_TITLE`. The handler's own helpers, `canvasPoint` and `dissolveEmptied`, also still have callers. **No helper was left without a caller.**

## Verification

- Task 1 verify exited 0. The modes build is green. The gui08-canvas-geometry and gui08-panorama-copy output is byte-identical to the before logs; both checks still fail as they did before (exit 1). gui08-view-parity, gui08-close-exactness and gui08-persistence-roundtrip pass, and so do their self-tests. `phase-gate.py` printed nothing.
- Task 2 verify exited 0:
  - The only `tray` matches left are the two moveCardFocus lines that 21-04 owns.
  - PowerBrowserAPI.sys.mjs numstat is `1 1`, and the `check-internals-boundary.sh --catalogue` check passes.
  - The `listUngroupedTabs` occurrence count is unchanged, and `listUngrouped()` and `this.ungrouped` are kept.
  - Both builds are green, and `phase-gate.py` printed nothing.
- Wave-1 `scripts/verify-platform.sh --quick`, run once and alone (log: `logs/quick-21-02.log`):
  - Result: **128 PASS, 4 FAIL**.
  - The 4 FAILs are gui08-canvas-geometry, gui08-canvas-geometry-self-test, gui08-panorama-copy and gui08-panorama-copy-self-test, all of which are in the baseline.
  - The R33 subtraction (`comm -13 docs/non-gui/quick-baseline.txt -`) gave **empty** output, so this plan introduced no new red.
- The quick run happened while 21-01 had an untracked `scripts/lib/ui-spec.mjs` and edits to 15-UI-SPEC.md that were not committed. The brand scan reads only tracked files, so it did not see that work. That work is 21-01's to scan once it commits.

## Deviations from Plan

None. The plan was executed as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: c5812c9, 0b6ae33 (both ancestors of HEAD; `git show --stat` lists exactly each task's files)
- FOUND: all four modified files; logs gui08-{geometry,copy}-{before,after}-21-02.log, build-modes-21-02-t1.log, build-21-02-t2.log, quick-21-02.log (git-ignored)
