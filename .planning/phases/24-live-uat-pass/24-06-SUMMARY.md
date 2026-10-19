---
phase: 24-live-uat-pass
plan: 06
subsystem: uat-records
status: partial
tags: [uat, closeout, ledger, deferral]
requires: [24-01, 24-04]
provides:
  - "Six UAT sheets closed as records: [testing complete] with build blocks kept, status by the complete-session rule, Summaries equal to a recount"
  - "NG-089 deferred-requested to phase 26 on Chris's own words; waiting on his approval"
affects: [24-CHRIS-CHECKLIST.md, ledger/REQUIREMENTS.json, scripts/verify-ng-089-uat-sheets.mjs]
tech-stack:
  added: []
  patterns: ["a closed sheet with pending rows reads partial; diagnosed is kept where an unresolved issue exists"]
key-files:
  created:
    - .planning/phases/24-live-uat-pass/24-06-SUMMARY.md
  modified:
    - .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md
    - .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md
    - .planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md
    - ledger/REQUIREMENTS.json
    - ledger/checksums.sha256
    - ledger/history/log.jsonl
decisions:
  - "G-11 is not earned: 14/3 and 14.1.1/11 read issue (A18 failed), so GUI-DEFECTS item 2 stays IN TREE and the v1.3 GUI-07 box stays unchecked"
  - "NG-089 deferral requested to phase 26 (the phase after the roadmap's last numbered phase, 25), on Chris's 2026-10-19 defer choice"
  - "24-05 (GEN-05 drill, Session C) was not run; 10/4 stays pending, at Chris's request"
metrics:
  duration: "about 25 min"
  completed: 2026-10-19
estimate:
  tokens: 45000
  tasks: 3
actuals:
  tokens: 335
  tasks: 2
  commits: 2
plan_head_before: 170a337c3977a66470dd5b30d01254d91e895001
plan_head_after: f14b7a53b0ab49ef9600c646de0d66f6e242961c
---

# Phase 24 Plan 06: Close the six UAT sheets and request the NG-089 deferral Summary

The six UAT sheets now read as closed records of Chris's 24-04 results. Each shows `[testing complete]`, keeps its build block, and has a Summary that matches a recount of its tests. NG-089's check is still red: 44 rows are pending, and no sheet has a recorded React 19 runtime result. Chris chose to defer the remaining GUI checks, so NG-089 is `deferred-requested` to phase 26. **Task 3 waits on Chris's approval.**

`actuals.tokens` is chars/4 over the lines this plan added before this SUMMARY (1,341 chars). `actuals.commits` is `git rev-list --count 170a337..f14b7a5`. `actuals.tasks` counts Tasks 1 and 2. Task 3 has not run.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Close the six sheets; G-11 records; NG-089 on the check | 1dc17f0 | six sheets |
| 2 | Checkpoint: Chris chose `defer`; deferral requested | f14b7a5 | three ledger files |
| 3 | Commit Chris's approval; prove the gates | **waiting on Chris's approval** | none yet |

## Task 1: sheets

**Changes on each sheet:**
- The Current Test body is replaced by `[testing complete]`.
- The `build: |` block is kept, and on 14.1.1 the `previous_build: |` block is kept too.
- `updated:` is set to 2026-10-19T22:54:30Z.

**Status, by the complete-session rule:**

| Sheet | Before | After | Why |
|-------|--------|-------|-----|
| 10 | pending-human | partial | 4 tests pending |
| 13 | partial | partial | 1 pending |
| 14 | partial | partial | 4 pending |
| 14.1 | testing | partial | 1 pending |
| 14.1.1 | diagnosed | diagnosed | unresolved issues, so it stays diagnosed (5 pending) |
| 15 | testing | partial | 29 pending |

**14.1.1:**
- The "Pending tests automatable" line now reads "Pending tests: 16, 17, 18, 23 and 49 (all need Chris)."
- The closing note gained: "On 2026-10-19 (24-06), Phase 24 recorded Chris's live results, kept verbatim in .planning/phases/24-live-uat-pass/24-UAT-REPLIES.md."

**Recount.** Every Summary already equalled the recount, so no count changed. The final Summary blocks:

```text
10:     total 6,  passed 2,  issues 0,  pending 4,  skipped 0, blocked 0, automated 0
13:     total 15, passed 11, issues 0,  pending 1,  skipped 3, blocked 0
14:     total 11, passed 2,  issues 4,  pending 4,  skipped 0, superseded 1, blocked 0
14.1:   total 11, passed 7,  issues 0,  pending 1,  skipped 3, blocked 0
14.1.1: total 49, passed 10, issues 31, pending 5,  skipped 3, blocked 0
15:     total 47, passed 14, issues 0,  pending 29, skipped 4, blocked 0
```

**G-11.** 14/3 and 14.1.1/11 both read `issue` (A18: "organising does not look good"). Nothing changed for G-11:
- GUI-DEFECTS item 2 reads IN TREE.
- The v1.3 GUI-07 box stays `- [ ]`, and its traceability row is unchanged.
- G-14.1.1-11 stays `open`, with 24-04's FAILED `live_check:`.

**Task 1 `<verify>`:** run verbatim after commit 1dc17f0. It printed `TASK1-VERIFY-PASS (check exit 1, R3=issue R11=issue)`.

**`node scripts/verify-ng-089-uat-sheets.mjs`, exit 1.** No ledger file was changed in Task 1. The output, verbatim:

```text
ng089-uat-sheets: FAIL -- .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md: test 2: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md: test 4: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md: test 5: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md: test 6: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md: no recorded React 19 runtime test
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md: test 15: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md: no recorded React 19 runtime test
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md: test 5: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md: test 7: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md: test 8: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md: test 11: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md: no recorded React 19 runtime test
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md: test 11: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md: no recorded React 19 runtime test
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md: test 16: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md: test 17: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md: test 18: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md: test 23: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md: test 49: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md: no recorded React 19 runtime test
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 1: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 4: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 5: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 6: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 7: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 8: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 10: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 11: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 13: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 14: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 15: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 16: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 17: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 18: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 19: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 20: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 21: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 22: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 23: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 24: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 25: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 26: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 27: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 28: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 29: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 30: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 38: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 41: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: test 44: result pending
ng089-uat-sheets: FAIL -- .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md: no recorded React 19 runtime test
```

## Task 2: Chris's choice and the deferral request

**Chris's reply, verbatim.** He gave it in chat on 2026-10-19 and the orchestrator relayed it as his `defer` choice:

> OK finish up what is left I want to do the GUI checks when everthing is done on my own time I just want a list

His list of remaining checks is in [24-CHRIS-CHECKLIST.md](24-CHRIS-CHECKLIST.md) (commit 170a337).

**Phase value: 26.**
- `ledger-amend.py` accepts any `parse_phase_like` number for `deferred-requested`, and no frozen-ledger cap applies to that path.
- The roadmap's last numbered phase is 25 (CI Green on Main), and the 999.x phases are backlog. 26 is the next phase after the roadmap.

**Pre-checkpoint `<verify>`** printed `TASK2-VERIFY-PASS`:
- the check exited 1 while NG-089 read open;
- the check's last commit is still `9aa0bbb test(24-01): ...`, so no commit after 24-01 touched it.

**Command run alone:** `python3 scripts/ledger-amend.py --root . set-status --id NG-089 --status deferred-requested --owner chris --phase 26 --reason "OK finish up what is left I want to do the GUI checks when everthing is done on my own time I just want a list"`. It printed nothing (exit 0).

**Ledger commit f14b7a5:**
- `git add` of the three ledger files, alone.
- `git diff --cached --name-only`, alone. It listed exactly `ledger/REQUIREMENTS.json`, `ledger/checksums.sha256` and `ledger/history/log.jsonl`.
- `git commit -F` with a message file and no pathspec.

**NG-089 ledger state now:** `NG-089  deferred-requested ... owner=chris phase=26 age=0d`. The report line reads `89 rows: done=55, deferred-requested=1, deferred-approved=8, dropped=25 | phase=unset due=0`. After the commit, `phase-gate.py` and `check-ledger.py` each printed nothing (rc 0).

**Approval text for Chris.** The agent did not run this command. Run it from your own terminal:

    cd /home/chris/coding/Power-Browser
    python3 scripts/ledger-amend.py --root . approve --id NG-089 --quote "YOUR OWN WORDS"

Reply `approved` once it has run, or paste the error it printed.

## Task 3: waiting on Chris's approval

Task 3 has not run. Once Chris replies `approved`:
1. commit his ledger change: `chore(24-06): record Chris's approval of the NG-089 deferral (UAT-01)`;
2. run `phase-gate.py` and `check-ledger.py`, then `plan-gate --phase 24`;
3. run the final `--quick` into `logs/quick-24-06.log`.

## Quick gate runs (untracked logs)

| Log | Before | Result |
|-----|--------|--------|
| logs/quick-24-06-t1.log | commit 1dc17f0 | 137 PASS rows, no FAIL, `PHASE24_EXIT=0`, 54 s |
| logs/quick-24-06-t2.log | commit f14b7a5 | 137 PASS rows, no FAIL, `PHASE24_EXIT=0`, 69 s |

`docs/non-gui/quick-baseline.txt` is empty. Port 3000 was never used, and no product code was changed.

## Deviations from Plan

- **24-05 not run.** The plan's precondition (24-05 complete) is not met. Chris deferred every remaining GUI check, C01 included, so 10/4 stays pending. Task 1 ran anyway, as the orchestrator directed.
- **Quick log names.** The two pre-commit `--quick` runs wrote `quick-24-06-t1.log` and `quick-24-06-t2.log`. `quick-24-06.log` is kept for Task 3's final run, which its `<verify>` reads.
- **STATE.md and ROADMAP.md were not advanced.** The plan is not complete: Task 3 waits on Chris.

## Known Stubs

None.

## Self-Check: PASSED

- 1dc17f0 and f14b7a5 are ancestors of HEAD.
- The six sheets and the three ledger files are committed.
- The NG-089 report line reads deferred-requested.
