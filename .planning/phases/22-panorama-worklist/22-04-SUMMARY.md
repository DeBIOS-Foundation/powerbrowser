---
phase: 22-panorama-worklist
plan: 04
subsystem: ui
tags: [theia, panorama, undo, close-group, gui08-checks, ng-006, live-check]
status: complete
completed: 2026-10-18

requires:
  - phase: 22-panorama-worklist
    provides: 22-03 undo window on GroupModel (closeGroup, undoCloseGroup, commitClose, commitAllClosing, listClosing); 22-01 copy answers C1
provides:
  - Undo Close Group control on canvas and tree (buildUndo, renderUndo), focus rules, fade (UNDO_FADE_MS 150)
  - powerbrowser.panorama.undo-close-group, labelless, in data-command
  - the Close Group confirmation and its danger-ink rule removed
  - close-exactness re-derived for the deferred close (7 plants); canvas-geometry and panorama-copy updated (slot-aware retired search)
  - ng-a-live closeGroupCommitted; ng-006 proves the close at the end of the window
affects: [22-05, 22-06, 22-07, panorama]

plan_head_before: 5e7c5796b358bb2229260322c9d51ceea568cd44
plan_head_after: 2b9fd9147f8f1ad77ad2be21f4192e14e760842e

actuals:
  tokens: 22000    # chars/4 over the theia, scripts and 15-UI-SPEC diff 5e7c579..2b9fd91 (87966 chars)
  tasks: 3
  commits: 8       # git rev-list --count 5e7c579..2b9fd91; includes f6d58cc (22-02/22-03 docs) and Chris's two ledger commits

key-files:
  modified:
    - theia/extensions/modes/src/browser/organising-widget.ts
    - theia/extensions/modes/src/browser/panorama-commands.ts
    - theia/extensions/modes/src/browser/modes.css
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
    - scripts/verify-gui08-panorama-copy.mjs
    - scripts/verify-gui08-canvas-geometry.mjs
    - scripts/verify-gui08-close-exactness.mjs
    - scripts/verify-pan04-undo-close-group-live.mjs
    - scripts/lib/ng-a-live.mjs
    - scripts/verify-ng-006-close-group-closes-web-tabs.mjs

key-decisions:
  - "The Undo control is a native button with an explicit Enter/Space keydown handler, so synthetic and real key presses both restore; undoCloseGroupById is idempotent, so a native click after the keydown is harmless"
  - "render() keeps focus on a focused Undo control across rebuilds and sends it to New Group once that group is no longer pending (22-UI-SPEC step 5)"
  - "The retired copy search is slot-aware: a {word} slot in a retired literal matches any ${...} in source"
  - "Chris set the check baseline at ledger version 392 (baseline-checks, ledger v393) instead of a fresh recorded red for the edited NG-006 check; phase-gate's failure-proof rule no longer covers any row completed at or before v392"
---

# Phase 22 Plan 04: Undo Close Group replaces the close confirmation Summary

**× closes a group at once, with no dialog. An Undo Close Group control appears in the group's bounds on the canvas, or in its section's place in the tree, and takes focus. Undo restores the group. When the window ends, the close commits. The 15-UI-SPEC and the three gui08 checks changed in the same commit as the code (SC3), and each passed there. ng-006 now proves the tabs close when the window ends.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 9c7e543 | feat(22-04): Undo Close Group replaces the close confirmation; 15-UI-SPEC copy and the gui08 checks change with it (PAN-04) |
| 1 | 70b1ab6 | test(22-04): pan04 drives the Undo Close Group control on canvas and tree (PAN-04) |
| 1 | c0c752c | fix(22-04): pan04 retries focusing the Undo control after the mode switch and reports why it fails (PAN-04) |
| 1 | 7565dec | fix(22-04): pan04 reads the Undo control from the view on screen after the mode switch (PAN-04) |
| 2 | 1171320 | test(22-04): ng-006 closes the group through its undo window and the commit (PAN-04) |
| 3 | 2a153a0 | chore(22): record Chris's re-lock of the check hashes at 1171320 (ledger v392, `lock-checks` at 1171320, run by Chris) |
| 3 | 2b9fd91 | chore(22): record Chris's check baseline (ledger v393, `baseline-checks`, run by Chris) |

f6d58cc (`docs(22): plans 22-02 and 22-03 complete`) also lies in 5e7c579..HEAD; it belongs to those plans, not to this one.

`git show --stat --format= 9c7e543` lists exactly the seven SC3 files: 15-UI-SPEC.md, the three gui08 checks, modes.css, organising-widget.ts and panorama-commands.ts.

## Evidence

**SC3: check lines at 9c7e543.** No check input changed after that commit.
- `verify-gui08-close-exactness: PASS -- no dialog and no commit at the click; the timer and the quit flush commit; Undo clears the timer and writes nothing; exact close wiring`
- `verify-gui08-close-exactness --self-test: PASS -- 7 planted faults went red naming the drift`
- `verify-gui08-canvas-geometry: PASS -- 20 const rows and 8 CSS rows equal 15-UI-SPEC Canvas Geometry; ...`
- `verify-gui08-canvas-geometry --self-test: PASS -- 19 planted faults went red naming the drift`
- `verify-gui08-panorama-copy: PASS -- 30 painted strings equal the 30 literals of the 15-UI-SPEC Copywriting Contract; 7 retired literals absent; no internals in copy`
- `verify-gui08-panorama-copy --self-test: PASS -- 14 planted faults went red naming the drift`

view-parity and its self-test, the mode-switch invariant and gui09-setups-copy were all green at that commit.

**Painted copy.** The label is "Undo Close Group". The accessible name and tooltip are `Undo Close Group "{name}"`. Both are character for character Chris's 22-01 C1 answers 1 and 2; the pan04 (g) line shows `label "Undo Close Group", name "Undo Close Group \"Untitled group\""`.

**Live runs** (logs under `.planning/phases/22-panorama-worklist/logs/`, git-ignored):

| Log | Run at | Exit | Wall time |
|-----|--------|------|-----------|
| build-22-04-t1 | 70b1ab6 | 0 | 10 s |
| pan04-22-04-t1 | 7565dec | 0 (`  pan04-undo-close-group-live: PASS`) | 80 s |
| gui07-22-04 | 7565dec | 0 (`  gui07-mode-switch-tabs-live: PASS`) | 15 s |
| build-22-04-t2 | 1171320 | 0 | 10 s |
| ng006-22-04 | 1171320 | 0 (`  ng-006-close-group-closes-web-tabs: PASS`) | 31 s |
| ng008-22-04 | 1171320 | 0 (`  ng-008-panorama-card-reopens-through-opener: PASS`) | 26 s |
| loose-22-04 | 1171320 | 0 (`  gui08-loose-cards-live: PASS`) | 10 s |

pan04 (g) detail lines, verbatim:
- `(g) canvas: x on G5 opened no dialog; 1 Undo control, 0.008331298828125 px from the vacated centre at scale 1, focused, label "Undo Close Group", name "Undo Close Group \"Untitled group\""; Enter restored G5 at {"index":1,"title":"Untitled group","x":40,"y":40,"w":400,"h":300,"keys":[]} with focus on its title`
- `(g) tree: the Undo control sits at section index 1, focused; Browsing and back: the control is still there (tree view); at the deadline with focus on it, the commit left focus on New Group`
- `probe controls: 4 planted page faults each turned their probe red`

Steps (a) to (f) from 22-03 are still green in the same run.

**Screenshot** (`logs/undo-window-22-04.png`, untracked). It shows the Organising canvas at 100%. The "Undo Close Group" control sits where G5's box was, centred in its old bounds at the top left. G2's box ("Untitled group", holding the green "page s" card) is to its right, and the Welcome loose card is at the bottom left. No dialog or overlay is present. The control has the surface fill and the hairline border. No focus ring shows because the close was a scripted click, so `:focus-visible` does not match.

**Phase-gate after Task 2** (full output):

```
scripts/verify-ng-006-close-group-closes-web-tabs.mjs: test file changed (locked 3aef2f3d4dfb1cf1083b8707cf26d5af85103cde758c6688256c6f5df317473d, now 4e7e8b3c70c454e768545773873f52e0f7ace386114ef4a71625c42d881eb1d1)
```

`scripts/lib/ng-a-live.mjs` is not hash-locked. ng-006 has exactly one commit since 02ce825 (1171320). Task 2's `<verify>` passed in full.

## Task 3: re-lock, stale failure, check baseline

**Re-lock.** The checkpoint showed Chris the lock command with H = 1171320e996321f78114fb72ba0c4b474a7c11bc, starting with the `cd /home/chris/coding/Power-Browser` line. The agent never ran it. Chris ran it in his own terminal. The ledger records it as v392, `op: lock-checks`, `commit: 1171320e996321f78114fb72ba0c4b474a7c11bc`, which locks the NG-006 file at `4e7e8b3c...881eb1d1`. The three ledger files were committed as 2a153a0.

**Stale failure after the re-lock.** With the new hash locked, phase-gate no longer printed `test file changed`. It printed the stale-failure line that the plan's step 2 anticipates, from `scripts/phase-gate.py:152`, for NG-006's ref:

```
NG-006: recorded failure is stale (test file changed since the failing run for scripts/verify-ng-006-close-group-closes-web-tabs.mjs::ng-006-close-group-closes-web-tabs)
```

This line is rebuilt from the format string at line 152 and NG-006's `test_ref`. The captured output from that run is not in any file this executor can read. NG-006 was completed after the old check baseline (252). Its recorded failure carries the sha256 of the pre-edit file (`3aef2f3d...f317473d`), so it no longer matches the locked hash. Per the plan, the agent stopped, showed Chris the line, and ran no ledger command.

**Options put to Chris (a/b/c).** The executor that reached this point put three options to Chris. The verbatim a/b/c text was given in that session and is not in any artifact this executor can read. Two of the paths it offered can be inferred from what followed:
- record a fresh red of the edited NG-006 check: run it against a mutated tree in a scratch worktree, then use the agent-permitted `record-fail`;
- Chris moves the check baseline himself with the user-only `baseline-checks`.

**Mutation-red attempt denied.** The agent's attempt to create a detached scratch worktree for the mutation-red run was denied by the permission system, as the orchestrating session reports. The agent stopped and did not work around the denial. Chris then created the worktree in his own terminal (`git worktree add --detach .../scratchpad/wt-ng006 HEAD`, "HEAD is now at 2a153a0"). After that he chose not to record a red. The worktree is his. Nothing in this plan used it, and it is left in place.

**Chris's choice, verbatim:**

```
python3 scripts/ledger-amend.py --root . baseline-checks
```

He ran it in his own terminal. The ledger records it as v393, `op: baseline-checks`, `changes: {"check_baseline": [252, 392]}`. It was committed as 2b9fd91.

**Consequence.** `scripts/phase-gate.py:146-147` skips the failure-proof check for every due row whose completion version is less than or equal to `check_baseline`. With the baseline now at 392, no row completed at or before ledger version 392 needs a recorded failure, and no stale-failure test applies to it either. That covers NG-006 and every row completed before it. NG-006's new check has a green run (`logs/ng006-22-04.log`, `  ng-006-close-group-closes-web-tabs: PASS` at 1171320) but **no recorded red**. Its record of failing exists only for the pre-edit file. The hash lock still applies: any later edit of a locked check file prints `test file changed`.

**phase-gate now:** `python3 scripts/phase-gate.py --root .` prints nothing (exit 0), at HEAD 2b9fd91.

**`--quick`** (`logs/quick-22-04.log`, run alone after both ledger commits): `PHASE22_RUN_COMMIT=2b9fd9147f8f1ad77ad2be21f4192e14e760842e`, 132 PASS, 0 FAIL, `verify-platform: PASS -- all checks passed`, `PHASE22_WALL_SECONDS=50`, `PHASE22_EXIT=0`. `docs/non-gui/quick-baseline.txt` is still 0 bytes.

**Task 3 `<verify>`:** phase-gate is silent. ng-006 has exactly one commit since 02ce825 (1171320). The result was `plan gate passed: 2/2 IDs cited (phase 22)`. `scan-brand-residue: PASS -- no residual brand occurrence in 359 scanned file(s)`. The quick log has its summary and no FAIL row, and its run commit descends from the last non-`.planning` commit. `git status --porcelain -- ledger` prints nothing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] pan04 focused the Undo control in a hidden view root**
- **Found during:** Task 1, step 10, in the first two live runs.
- **Issue:** The Organising widget keeps its view across a mode switch. After the tree step, the canvas root was hidden, so `.focus()` on its Undo control did nothing. The "focus on the control at its deadline" setup failed, and so did the New Group assertion that depends on it. Diagnostics showed `shown: false`, with the widget visible and attached.
- **Fix:** The later steps read the control from the view on screen (`org.view`), and the focus setup retries until the control is shown. No assertion was weakened.
- **Files modified:** scripts/verify-pan04-undo-close-group-live.mjs
- **Commits:** c0c752c, 7565dec

### Off-plan path in Task 3 (Chris's decision, not an auto-fix)

**2. NG-006's failure proof is covered by a check baseline, not by a fresh recorded red**
- **Found during:** Task 3, step 2 after Chris replied. phase-gate printed `NG-006: recorded failure is stale`.
- **Plan said:** stop and wait; the remedy is Chris's.
- **What happened:** the agent stopped. The mutation-red worktree attempt was denied by the permission system. Chris ran `baseline-checks` (ledger v393, baseline 252 to 392), committed as 2b9fd91.
- **Effect:** no row completed at or before v392 is subject to the failure-proof check any longer. NG-006's edited check has a green run and no recorded red.

### Choices within the plan

- **pan04 screenshot:** `PB_PAN04_SHOT` is now taken during the (g) canvas window, so it shows the Undo control rather than the model-only (a) step.
- **ng-006 dry run:** before the single commit, ng-006 ran once on the uncommitted edit with `PB_NG_ALLOW_DIRTY=1`, into the scratchpad. It passed. The official log is `ng006-22-04.log`, run on the committed tree after the t2 build.
- **15-UI-SPEC:** the plan's W4 edits are in, plus a description row, "Undo Close Group position" (two or more plain words, so it is not compared). The Retired copy table also gains a not-searched row for the dialog's "Close Group" and "Cancel" words, in the form of the existing tray-label row.

## Known gaps, not fixed here

- `theia/extensions/modes/src/browser/organising-tree.ts:12` still says "header close with the identical confirmation" in its header comment. The file is not in this plan's file list.
- The screenshot shows the address bar reading `view:powerbrowser.modes.organising` in Organising mode. This plan did not introduce that internal identifier: none of its changes touch the address bar. It was not investigated here.

## Known Stubs

None.

## Self-Check: PASSED

The commits 9c7e543, 70b1ab6, c0c752c, 7565dec, 1171320, 2a153a0 and 2b9fd91 are all ancestors of HEAD. The files `logs/quick-22-04.log`, `logs/ng006-22-04.log` and `scripts/verify-pan04-undo-close-group-live.mjs` exist.
