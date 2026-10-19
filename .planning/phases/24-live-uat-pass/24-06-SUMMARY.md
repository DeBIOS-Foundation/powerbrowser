---
phase: 24-live-uat-pass
plan: 06
subsystem: uat-records
status: complete
tags: [uat, closeout, ledger, deferral]
requires: [24-01, 24-04]
provides:
  - "Six UAT sheets closed as records: [testing complete] with build blocks kept, status by the complete-session rule, Summaries equal to a recount"
  - "NG-089 deferred-approved to phase 26: requested on Chris's own words, approved by Chris (history v402, quote \"APPROVE NG-089\")"
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
  duration: "about 35 min of agent time, plus the wait for Chris's approval"
  completed: 2026-10-19
estimate:
  tokens: 45000
  tasks: 3
actuals:
  tokens: 378
  tasks: 3
  commits: 4
plan_head_before: 170a337c3977a66470dd5b30d01254d91e895001
plan_head_after: cbb8df4d0ed83b5b2e291711010e192d990ca3b1
---

# Phase 24 Plan 06: Close the six UAT sheets and request the NG-089 deferral Summary

The six UAT sheets now read as closed records of Chris's 24-04 results. Each shows `[testing complete]`, keeps its build block, and has a Summary that matches a recount of its tests. NG-089's check is still red: 44 rows are pending, and no sheet has a recorded React 19 runtime result. Chris chose to defer the remaining GUI checks. The agent requested the NG-089 deferral to phase 26, and Chris approved it himself, so NG-089 reads `deferred-approved`. phase-gate and check-ledger print nothing, plan-gate passes, and `--quick` is green.

`actuals.tokens` is chars/4 over the lines this plan added outside this SUMMARY (1,510 chars). `actuals.commits` is `git rev-list --count 170a337..cbb8df4`, which includes the first SUMMARY commit a1e4c00.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Close the six sheets; G-11 records; NG-089 on the check | 1dc17f0 | six sheets |
| 2 | Checkpoint: Chris chose `defer`; deferral requested | f14b7a5 | three ledger files |
| 3 | Commit Chris's approval; prove the gates | cbb8df4 | three ledger files |

a1e4c00 is the first version of this SUMMARY, written while Task 3 waited on Chris.

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

**Chris's approval, verbatim.** He typed the following in chat on 2026-10-19:

> APPROVE NG-089

The ledger hook recorded the approval from that line as history entry v402: `{"op": "approve", "id": "NG-089", "quote": "APPROVE NG-089", "changes": {"status": ["deferred-requested", "deferred-approved"]}}` at 2026-10-19T23:09:04Z. The agent ran no user-only ledger command.

## Task 3: Chris's approval committed, gates proven

1. `git status --porcelain -- ledger`, run alone, listed the three ledger files as modified by his approval:
   - ` M ledger/REQUIREMENTS.json`
   - ` M ledger/checksums.sha256`
   - ` M ledger/history/log.jsonl`
2. **Ledger commit cbb8df4**, `chore(24-06): record Chris's approval of the NG-089 deferral (UAT-01)`:
   - `git add` of the three ledger files, alone;
   - `git diff --cached --name-only`, alone, listed exactly those three;
   - `git commit -F` with a message file and no pathspec.

   After the commit, `git status --porcelain -- ledger` printed nothing.
3. **Gates:**
   - `python3 scripts/phase-gate.py --root .` printed nothing (rc 0).
   - `python3 scripts/check-ledger.py --root .` printed nothing (rc 0).
   - `python3 scripts/plan-gate.py --root . --phase 24 --plans .planning/phases/24-live-uat-pass` printed `plan gate passed: 1/1 IDs cited (phase 24)` (rc 0).
4. **NG-089 now reads** `NG-089  deferred-approved ... owner=chris phase=26 age=0d`. The report line reads `89 rows: done=55, deferred-approved=9, dropped=25 | phase=unset due=0`.
5. **Final `--quick`:** `logs/quick-24-06.log`, run after this SUMMARY was staged. Its counts are in the next section.

## Quick gate runs (untracked logs)

| Log | Before | Result |
|-----|--------|--------|
| logs/quick-24-06-t1.log | commit 1dc17f0 | 137 PASS rows, no FAIL, `PHASE24_EXIT=0`, 54 s |
| logs/quick-24-06-t2.log | commit f14b7a5 | 137 PASS rows, no FAIL, `PHASE24_EXIT=0`, 69 s |
| logs/quick-24-06-t3.log | commit a1e4c00 | 137 PASS rows, no FAIL, `PHASE24_EXIT=0`, 58 s |
| logs/quick-24-06-t4.log | commit cbb8df4 | 137 PASS rows, no FAIL, `PHASE24_EXIT=0`, 60 s |
| logs/quick-24-06.log | this SUMMARY's commit (final) | 137 PASS rows, no FAIL, `ng089-uat-sheets-self-test: PASS`, `PHASE24_EXIT=0`, 56 s; repeated after the commit so the log postdates it |

`docs/non-gui/quick-baseline.txt` is empty. Port 3000 was never used, and no product code was changed.

## Deviations from Plan

- **24-05 not run.** The plan's precondition (24-05 complete) is not met. Chris deferred every remaining GUI check, C01 included, so 10/4 stays pending. Task 1 ran anyway, as the orchestrator directed.
- **Quick log names.** The pre-commit `--quick` runs wrote `quick-24-06-t1.log` to `-t4.log`. `quick-24-06.log` holds Task 3's final run, which its `<verify>` reads. That run is repeated after the SUMMARY commit, so the log postdates the last commit.
- **How Chris's approval was recorded.** He did not run the approval command from his terminal. He typed "APPROVE NG-089" in chat, and the project's ledger hook wrote the approval from that line. Either way, the approval is his own.
- **STATE.md and ROADMAP.md were left to the orchestrator.** 24-05 has not run, so Phase 24 is not complete.

## Known Stubs

None.

## Self-Check: PASSED

- 1dc17f0, f14b7a5, a1e4c00 and cbb8df4 are ancestors of HEAD.
- The six sheets and the three ledger files are committed, and `git status --porcelain -- ledger` prints nothing.
- The NG-089 report line reads deferred-approved, phase 26.
