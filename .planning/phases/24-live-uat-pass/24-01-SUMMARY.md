---
phase: 24-live-uat-pass
plan: 01
subsystem: ledger-and-checks
status: complete
tags: [uat, ledger, ng-089, react-19, verify-platform]
requires: []
provides:
  - "scripts/verify-ng-089-uat-sheets.mjs: the NG-089 check, sheet list read from the row text, with a 14-plant --self-test"
  - "Registry rows ng089-uat-sheets-self-test (quick) and ng089-uat-sheets (full only)"
  - "NG-084 dropped by Chris; NG-089 open, phase 24, with a recorded exit-1 check-fail"
affects: [24-03, 24-04, 24-05, 24-06]
tech-stack:
  added: []
  patterns: ["sheet list derived from ledger row text, never hand-kept", "UAT predicate stripping (frontmatter, comments, fences, blockquotes) before reading result lines"]
key-files:
  created:
    - scripts/verify-ng-089-uat-sheets.mjs
  modified:
    - scripts/verify-platform.sh
    - ledger/REQUIREMENTS.json
    - ledger/checksums.sha256
    - ledger/history/log.jsonl
decisions:
  - "NG-089 counts issue, skipped and superseded as recorded results; only pending, [pending], empty or missing result lines are red (UAT-01 reads no pending; stricter GSD audit semantics are not this row)"
  - "NG-089 text kept as proposed; Chris did not reword it"
  - "The check guards its main branch with a realpath IS_MAIN test so its pure exports import without I/O"
metrics:
  duration: "about 9 h wall clock, most of it waiting at the Chris-only checkpoint (first commit 2026-10-18T23:17-07:00, last ledger commit 2026-10-19T08:17-07:00)"
  completed: 2026-10-19
estimate:
  tokens: 45000
  tasks: 3
actuals:
  tokens: 3000
  tasks: 3
  commits: 7
plan_head_before: ee8af17357de66cb1ee07b06e4935b05b478496c
plan_head_after: ad17c0e
---

# Phase 24 Plan 01: NG-089 UAT-sheet check and the NG-084 replacement Summary

This plan added a check that reads its six-sheet list from NG-089's own ledger text. The check strips frontmatter, comments, fences and blockquotes the way the GSD UAT predicate does, then names every pending, empty or missing result and every sheet that has no recorded React 19 test. Chris then removed NG-084 from his own terminal. NG-089 replaced it, and its exit-1 failing run is recorded in the ledger.

`commits: 7` is measured as `ee8af17..ad17c0e`. Four of those seven commits belong to the concurrent plan 24-02: 5c7d223, 2ff2ea4, 08d0aeb and b906ba4. This plan made three commits; the SUMMARY commit is a fourth.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | NG-089 check, self-test, registry rows, green quick gate | 9aa0bbb | scripts/verify-ng-089-uat-sheets.mjs, scripts/verify-platform.sh |
| 2 | Chris removes NG-084 (blocking-human); agent commits the ledger | 71919ed | ledger/REQUIREMENTS.json, ledger/checksums.sha256, ledger/history/log.jsonl |
| 3 | Add NG-089, open in phase 24, point it at the check, record the failing run | ad17c0e | ledger/REQUIREMENTS.json, ledger/checksums.sha256, ledger/history/log.jsonl |

`git show --stat` lists exactly two files for 9aa0bbb and exactly the three ledger files for each of 71919ed and ad17c0e.

## Task 1 evidence

- Self-test: `ng089-uat-sheets --self-test: PASS -- 14 plants red, control green`
- Main run before NG-089 existed: `ng089-uat-sheets: ERROR -- ledger row NG-089 is missing`, exit 2
- `scripts/verify-platform.sh --quick` run after the check commit, log at .planning/phases/24-live-uat-pass/logs/quick-24-01.log (untracked): 137 PASS, 0 FAIL, `PHASE24_EXIT=0`, 61 s. The rows `ng089-uat-sheets-self-test`, `planning-paths` and `scan-brand-residue` all PASS. docs/non-gui/quick-baseline.txt is empty, and phase-gate prints nothing.
- Registry placement: the self-test row sits right after `ng074-ci-green-on-main-self-test`, in the quick set. The main row sits right after `ng074-ci-green-on-main`, in the full set behind the indented `if [ "$QUICK" -eq 0 ]` line.

## Task 2: Chris's removal

The agent never ran the removal. Chris ran it in his own terminal. The coordinator relayed his command verbatim:

> `python3 scripts/ledger-amend.py --root . drop --id NG-084 --reason "Superseded by NG-089: UAT sheets 10, 13, 14, 14.1, 14.1.1 and 15, each with a React 19 runtime line (UAT-01, Phase 24)" --quote "DROP NG-084 Superseded by NG-089: six UAT sheets plus a React 19 line (Phase 24)"`

The command printed no error. Chris gave no separate wording for NG-089, so he accepted the proposed text by not rewording it. That approval came through the coordinator, not as a direct `dropped` reply. ledger-report then showed `NG-084  dropped` and no NG-089 line. phase-gate was silent and plan-gate read `plan gate passed: 1/1 IDs cited (phase 24)`.

## Task 3: NG-089 as added

- Text: "UAT sheets 10, 13, 14, 14.1, 14.1.1 and 15 have no pending result, and each records a React 19 runtime result (UAT-01)."
- spec_ref `.planning/REQUIREMENTS.md UAT-01`; test_ref `scripts/verify-ng-089-uat-sheets.mjs::ng089-uat-sheets`; code_ref `.planning/milestones UAT sheets 10, 13, 14, 14.1, 14.1.1, 15`; status open, phase 24.
- Red run: exit 1 with 94 problems. 88 are `result pending` lines: 10 has 6, 13 has 2, 14 has 5, 14.1 has 11, 14.1.1 has 17 and 15 has 47. The other six are one `no recorded React 19 runtime test` per sheet, because every sheet's React 19 test exists and reads pending.
- record-fail: history entry v400, `"op": "check-fail", "id": "NG-089"`, `"exit": 1`, head 71919ed, sha256 `097248ea98c7a4e7b1a3e0228ad8d0691d50d9cc96872e29c8e329cf8cb43c37`. That hash equals `sha256sum scripts/verify-ng-089-uat-sheets.mjs`. The recorded tail is the problem list (15-UAT tests 29 to 47 pending, then its React 19 line), not an exit-2 instrument error.
- Ledger versions: 395 at plan start, 396 after Chris's removal, 400 after record-fail (add, set-status, set and check-fail).
- After commit: the Task 3 `<verify>` block passed. That covers phase-gate and check-ledger silent, `plan gate passed: 2/2 IDs cited (phase 24)`, and the check unchanged since 9aa0bbb. `git status --porcelain -- ledger` prints nothing.
- No commit touches scripts/verify-ng-089-uat-sheets.mjs after 9aa0bbb. Chris's lock in 24-06 hashes the same bytes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Main-module guard**
- **Found during:** Task 1
- **Issue:** A main branch that runs at module load, as in the ng074 template, makes the exported pure functions impossible to import without ledger I/O and an exit.
- **Fix:** Main and `--self-test` now run only when `realpathSync(process.argv[1])` equals the module's own path.
- **Files modified:** scripts/verify-ng-089-uat-sheets.mjs
- **Commit:** 9aa0bbb

**2. [Scope] Three extra self-test plants**
- **Found during:** Task 1
- **Change:** Beyond the plants the plan listed, the self-test adds a result inside an indented tilde fence, a result inside an HTML comment, and row text with "UAT sheets" but no numbers (instrument error). The total is 14 plants.
- **Commit:** 9aa0bbb

The requirement IDs were not marked complete. UAT-01 and NG-089 stay open until 24-06 closes them on live results. STATE.md and ROADMAP.md were left untouched, as the orchestrator instructed.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/verify-ng-089-uat-sheets.mjs
- FOUND: 9aa0bbb, 71919ed, ad17c0e (ancestors of HEAD)
- FOUND: NG-089 check-fail entry in ledger/history/log.jsonl
