---
phase: 24-live-uat-pass
plan: 04
subsystem: uat-records
status: complete
tags: [uat, live-session, launch-a, build-record]
requires: [24-03]
provides:
  - "build: block on all six UAT sheets naming the build under test (HEAD 612e0bf, Theia 1.76.0, React 19.2.8, Node v24.19.0, Gecko 153.5.0, clean tree)"
  - "24-UAT-SCRIPT.md Prepared paths: UAT root, fixture server, launch, modes.json corruption, customize.css write and delete, desktop entry"
  - "24-UAT-REPLIES.md section 'Launch A and B (24-04)': Chris's run-2 replies, verbatim"
  - "Chris's results on 47 rows; T rows skipped from Route T; gap G-14-9 added and G-14.1.1-11 reopened for A18"
affects: [24-05, 24-06, scripts/verify-ng-089-uat-sheets.mjs]
tech-stack:
  added: []
  patterns: ["a row shared by an A item and a T item reads skipped when the T half is skipped", "live_check: line on a handed-over gap, whatever the result"]
key-files:
  created: []
  modified:
    - .planning/phases/24-live-uat-pass/24-UAT-SCRIPT.md
    - .planning/phases/24-live-uat-pass/24-UAT-REPLIES.md
    - .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md
    - .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md
    - .planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md
decisions:
  - "Rows Chris did not report stay pending at his request (\"OK finish up what is left ... I just want a list\"); none is marked skipped and none is recorded from scripted evidence"
  - "A09, A10, A16, A19 and A20 pass on Chris's line \"Accept the script's results\"; each row carries a note that the evidence is the scripted headless run he accepted"
  - "Rows shared by an A item and a T item (13/6, 14.1/5, 14.1.1/37) read skipped: the T half is skipped by Route T d, and a row passes only if every owning item passed"
  - "14.1.1/15 (O06) keeps result issue: only its cold-start half was reported"
  - "A18 failed: G-14-9 added on the 14 sheet; G-14.1.1-11 set from in_tree to open with a live_check line"
metrics:
  duration: "about 5.5 h wall, mostly Chris's two launches and the checkpoint round trips"
  completed: 2026-10-19
estimate:
  tokens: 70000
  tasks: 3
actuals:
  tokens: 5900
  tasks: 3
  commits: 2
plan_head_before: 612e0bf327b11bb72c4aab93bce847f980a6d6b9
plan_head_after: 69f10f5d95525ee2219d40891cf316e9e399a66f
---

# Phase 24 Plan 04: Launch A and B, build record and Chris's results Summary

This plan rebuilt the sidecar and proved it with the gui02 live row on port 3939. It recorded that build on all six sheets and prepared a throwaway profile, a config directory and a fixture server. It then recorded Chris's Launch A results. He covered A01 to A20 (five of them by accepting a scripted headless run) and failed A18's Organising step. He asked to leave everything else pending for a later run on his own time.

`actuals.tokens` is chars/4 over the lines this plan added (23,561 chars). `actuals.commits` is `git rev-list --count 612e0bf..69f10f5`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build, prove and record the build; prepare the throwaway environment and commands | e0ce877 | six sheets, 24-UAT-SCRIPT.md |
| 2 | Launch A and B (checkpoint, blocking-human) | none | none |
| 3 | Record Chris's results, with gaps | 69f10f5 | 24-UAT-REPLIES.md, six sheets |

## Task 1: build and environment

- **Build:** `logs/build-24-04.log` (untracked), built from HEAD 612e0bf on a clean tree, `PHASE24_EXIT=0`, 12 s (incremental).
- **Live row:** `logs/web-tab-live-24-04.log` (untracked) printed `  gui02-web-tab-live: PASS` and `PHASE24_EXIT=0` on that build, with `PB_VERIFY_PORT=3939`. Port 3000 was never used.
- **Build block:** all six sheets now name the build under test:
  - Theia 1.76.0 and React 19.2.8 (read from `theia/node_modules`);
  - Node v24.19.0;
  - Gecko 153.5.0 (BuildID 20261018083353).
- **14.1.1 sheet:** its 2026-09-08 build block is kept as `previous_build:`.
- **UAT root:** `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/uat-24`. Route T is `d`, so there is no user.js and no Toolbox snippets.
- **Fixture server:** `uat-24/fixtures.mjs` serves the A12 retitling page and the A13 slow page (8 s) on ephemeral loopback ports, and exits if a bound port is 3000.
- **Desktop entry:** `~/.local/share/applications/powerbrowser.desktop` was absent, so it was installed with the docs/BUILD.md sed line. The Prepared paths note says Chris may remove it after 10/3.
- **Task 1 `<verify>`:** run verbatim, printed TASK1-VERIFY-PASS. `git show --stat e0ce877` lists exactly the six sheets and the script.

## Chris's replies (24-UAT-REPLIES.md, verbatim)

The section header is "## Launch A and B (24-04), received 2026-10-19".

**Run 1 was held and is not used.** Its reply was "A: ok" and "B: ok". Chris's terminal log showed something else:
- Launch A ran for about 2 minutes, with 2 web tabs.
- The corruption step printed the missing-file error.
- Only one launch was run.

**Run 2** used fresh `profile/` and `config/` directories at the same paths. Run 1's directories were moved to `uat-24/run1-used`. His lines, each given in answer to the orchestrator's per-item instruction:

```text
The checks all look fine did you run the already?
```
(after the A01 to A08 list. The orchestrator told him it had not run them and counts this line as A01 to A08 ok, and O06's cold-start half ok)

```text
Accept the script's results
```
(A09, A10, A16, A19, A20)

```text
ok
```
(A11, A12, A13, A14, A15 and A17, each separately. Before A15 he wrote "I dont see the buton" and "yes i see the new tab".)

```text
organising does not look good
```
(A18, Organising step, with a screenshot. He replied "ok" for steps 3, 4 and 6.)

```text
OK finish up what is left I want to do the GUI checks when everthing is done on my own time I just want a list
```

## What was recorded

Every row carries `reported:` lines found word for word in the replies file, plus `recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"`.

**pass**
- 10: 1, 3
- 14: 1, 2
- 14.1: 2, 3, 6, 7, 8, 9, 10
- 14.1.1: 1, 13, 32, 34, 35, 38, 39, 40, 41, 42
- 15: 2, 3, 9, 12

**issue**
- 14/3 and 14.1.1/11, from A18.
- 14.1.1/15 keeps `issue`. It gained the O06 reported line and a note that only the cold-start half was reported.

**skipped**, with reason "deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)" and reported "Q1: d" (Route T `d`):
- 14.1: 1, 4
- 14.1.1: 33, 36
- 15: 31, 32, 33, 34
- 13/6, 14.1/5 and 14.1.1/37 are shared with A09 or A13, which passed. Each of these rows carries both reported lines and a note.

**live_check lines on the handed-over gaps:**
- G-14-1, G-14-2, G-14-3, G-14.1.1-1 and G-14.1.1-13 each got a pass `live_check:` line. Each line says the evidence is the scripted headless run Chris accepted. Their status is unchanged (`in_tree`).
- G-14.1.1-15 got a `live_check:` line for the O06 cold-start half.

**Issues and gaps (for `/gsd-plan-phase 24 --gaps`; nothing was fixed in place):**
- **G-14-9 (new, 14 sheet, test 3, open, major).** Chris's words: "organising does not look good". The screenshot, as described by the orchestrator:
  - with a split main area, Organising opens as a tab inside the right pane, and the left pane keeps its tabs;
  - the Organising tab icon is a blank white square;
  - the group box is clipped at the right edge.
- **G-14.1.1-11 (14.1.1 sheet, test 11).** Status went from `in_tree` to `open`, with a FAILED `live_check:` line for the same observation. The G-11 confirmation is not earned.

**Summary counts**, recomputed from the rows:

| Sheet | Pass | Issue | Pending | Skipped | Other |
|-------|------|-------|---------|---------|-------|
| 10 | 2 | 0 | 4 | 0 | |
| 13 | 11 | 0 | 1 | 3 | |
| 14 | 2 | 4 | 4 | 0 | 1 superseded |
| 14.1 | 7 | 0 | 1 | 3 | |
| 14.1.1 | 10 | 31 | 5 | 3 | |
| 15 | 14 | 0 | 29 | 4 | |

## Rows still pending, per sheet

- **10:** 2, 4, 5, 6
- **13:** 15
- **14:** 5, 7, 8, 11
- **14.1:** 11
- **14.1.1:** 16, 17, 18, 23, 49
- **15:** 1, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 38, 41, 44

These correspond to A21 to A48, B01 to B10, Session O beyond O06, the corruption step, and Sessions C and X (10/4, 10/5).

## Verification

- **Task 3 `<verify>`:** run verbatim after 69f10f5. It exits 1 with 106 lines, and every line is one of two kinds:
  - "result is pending";
  - "was not recorded in this commit".

  All of them belong to the items Chris left pending: A21 to A48 and B01 to B10. There is no line about reported text, disagreeing rows, a changed row no item owns, or a removed test.
- **NG-089's check:** `node scripts/verify-ng-089-uat-sheets.mjs` exits **1** (red, instrument intact, not 2). It prints 50 FAIL lines:
  - 44 pending rows;
  - 6 "no recorded React 19 runtime test" lines, one per sheet.
- **Product code:** `git diff --name-only 612e0bf HEAD -- theia powerbrowser` is empty.
- **Record commit:** `git show --stat 69f10f5` lists exactly the replies file and the six sheets.
- **Brand-residue scan:** PASS.
- **`--quick`:** `logs/quick-24-04.log` (untracked), run after 69f10f5. Result: 137 PASS, 0 FAIL, 55 s wall, `PHASE24_EXIT=0`. `docs/non-gui/quick-baseline.txt` is still empty.

## Deviations from Plan

**1. [Ordered by Chris] A and B rows left pending**
- **Found during:** Task 3
- **Issue:** Task 3's `<fails_when>` counts any A or B row still pending as a failure. Chris chose to leave A21 to A48 and B01 to B10 pending, in his line "OK finish up what is left I want to do the GUI checks when everthing is done on my own time I just want a list".
- **Fix:** none, by his choice. Those rows stay `pending`. None is marked skipped, and none is recorded from the orchestrator's scripted evidence. Every other Task 3 condition holds.

**2. [Rule 3 - Blocking] Run 1 held and the session redone on a fresh profile**
- **Found during:** Task 2
- **Issue:** Run 1's reply ("A: ok", "B: ok") contradicted Chris's terminal log.
- **Fix:** the orchestrator held it and moved run 1's directories to `uat-24/run1-used`. Run 2 used new empty `profile/` and `config/` directories at the same paths. No result was recorded from run 1.

**3. [Process] An app was still running at Task 3**
- **Found during:** Task 3
- **Issue:** the precondition `pgrep -af 'objdir/dist/bin/powerbrowser'` showed Chris's run-2 instance still running on the throwaway profile.
- **Fix:** I did not ask again, because his last line explicitly asked to finish up. Recording reads and writes only tracked planning files, so it does not interact with the app. I did not stop the app.

**4. [Process] Five A items recorded from scripted evidence Chris accepted**
- **Issue:** A09, A10, A16, A19 and A20 were not observed by Chris in his window. He accepted the scripted headless run with "Accept the script's results".
- **Fix:** each of those rows carries a note naming the evidence. Their handed-over gaps keep `in_tree` status.

## Leftovers for Chris (a hook blocks rm -rf outside the project)

- `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/uat-24`: profile, config, `run1-used`, the `auto*` evidence and `fixtures.mjs`.
- `/tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/fixtures-24-04.log`.
- `~/.local/share/applications/powerbrowser.desktop`, installed by 24-04.
- The fixture server: node PID 3727838 if it is still running; stop it with `kill 3727838`.
- Untracked logs `build-24-04.log`, `web-tab-live-24-04.log` and `quick-24-04.log` under `.planning/phases/24-live-uat-pass/logs/`.

## Self-Check: PASSED

FOUND: e0ce877, 69f10f5 (both ancestors of HEAD); FOUND: 24-UAT-REPLIES.md, 24-UAT-SCRIPT.md and the six sheets.
