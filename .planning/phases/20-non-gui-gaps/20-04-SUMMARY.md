---
phase: 20-non-gui-gaps
plan: 04
subsystem: ledger
tags: [ledger, tab-store, schema-v3, schema-v4, PLAT-03, NG-087, NG-088]
status: complete

requires:
  - phase: 20-03
    provides: a clean --quick gate (FAIL set = the 4 gui08 baseline rows) to register into
provides:
  - scripts/verify-ng-087-loose-position-across-restart.mjs (schema v3 x/y check with --at and a 4-plant --self-test)
  - scripts/verify-ng-088-group-order-across-restart.mjs (schema v4 ord check with --at and a 3-plant --self-test)
  - four --quick rows after ng-020
  - ledger rows NG-087 and NG-088, done, each with a recorded red against b9412fa
affects: [20-05 (Chris's lock-checks hashes both check files), 20-VERIFICATION]

actuals:
  tokens: 10900
  tasks: 3
  commits: 2
plan_head_before: a1046dd4065ce0e6fced9a8ecc662206145db017
plan_head_after: d8ddcf75f3384fce8e6be9f05e296601f8fbff1f

tech-stack:
  added: []
  patterns:
    - "Mutations go through handleGroupMutation with a fake shell-frame sender, so an older writer's refusal (unknown kind) is the red"
    - "Reader SQL is parsed from tab-query-service.ts per method at check time; the closed-tab history read is the loose SQL with its open-row clause inverted"
    - "Exit 1 = red, exit 2 = broken instrument (git show failure, reader SQL not found)"

key-files:
  created:
    - scripts/verify-ng-087-loose-position-across-restart.mjs
    - scripts/verify-ng-088-group-order-across-restart.mjs
  modified:
    - scripts/verify-platform.sh
    - ledger/REQUIREMENTS.json
    - ledger/checksums.sha256
    - ledger/history/log.jsonl

key-decisions:
  - "The closed-tab history read is listUngroupedTabs' SQL with 'AND closed_at IS NULL' turned into 'IS NOT NULL', so every read still comes from the reader text; a reader without that clause is a red, not a broken instrument (b9412fa's reader lacks it, and is reached only after the writer's refusal)"
  - "NG-088's hand order [b, web, a] is neither URI order nor its reverse, so a reader or writer falling back to either cannot pass by accident"

metrics:
  duration: "~25 min (excluding the checkpoint wait)"
  completed: 2026-10-17
---

# Phase 20 Plan 04: Schema v3/v4 ledger rows Summary

The tab-store schema v3 (x, y) and v4 (ord) work from 7b7a1f7 now has two ledger rows, NG-087 and NG-088. Each row has its own offline check that runs the real writer over node:sqlite and reads through the SQL in tab-query-service.ts. Each has a recorded red against the pre-v3 writer at b9412fa, a green at HEAD, and the row text Chris accepted.

## Chris's acceptance (Task 2)

Chris's reply at the blocking-human checkpoint, verbatim:

> accept

He accepted both row texts unchanged, and the red-against-b9412fa method. The rows were added with the draft texts verbatim.

## Results

At HEAD:
- `ng087-loose-position-across-restart: PASS -- the tree: a loose terminal keeps (40, 60) across restart and re-track; a loose web row keeps (300, 200) as closed-tab history and gets it back on reopen (reads use the listUngroupedTabs SQL)`
- `ng088-group-order-across-restart: PASS -- the tree: the hand order [terminal:ng088-b, web:wt-ng088-1, terminal:ng088-a] (not URI order) comes back from the getGroupTabs SQL after setGroupOrder and after restart and re-track`

`--at b9412fa260d425deb3fb9a08c82a5b4ba39a8800` (exit 1). These are also the record-fail outputs, history log entries v382 and v388:
```
ng087-loose-position-across-restart: FAIL (writer and reader at b9412fa260d425deb3fb9a08c82a5b4ba39a8800)
  setTabPosition refused by the writer: handleGroupMutation: unknown kind setTabPosition
```
```
ng088-group-order-across-restart: FAIL (writer and reader at b9412fa260d425deb3fb9a08c82a5b4ba39a8800)
  setGroupOrder refused by the writer: handleGroupMutation: unknown kind setGroupOrder
```

Self-tests:
- `ng087-loose-position-across-restart-self-test: PASS -- 4 plants red`
  - (a) setTabPosition binds x/y null
  - (b) closeEndedWebRows clears x/y
  - (c) trackShellTab loses `AND closed_at IS NOT NULL`
  - (d) the loose reader drops `x, y`
- `ng088-group-order-across-restart-self-test: PASS -- 3 plants red`
  - (a) reversed ord
  - (b) reader `ORDER BY uri`
  - (c) the trackShellTab plant
- Each plant must match a stage-specific failure.
- An anchor that is missing or not unique is reported as such, and that report is itself checked.

Broken instrument: `--at 0000000000000000000000000000000000000000` exits 2 with `FAIL -- broken instrument: git show ... failed`.

Ledger and gates:
- H = `b3e8883`, the single commit of both check files and the registry.
- Ledger version 378 before, 390 after. The ledger commit is `d8ddcf7`.
- `ledger-report`: `NG-087  done`, `NG-088  done`, with 88 rows (done=55, deferred-approved=9, dropped=24).
- phase-gate and check-ledger print nothing. `plan gate passed` for phase 20.
- `git status --porcelain -- ledger` is empty.
- `grep 'unknown kind setTabPosition'` and `grep 'unknown kind setGroupOrder'` over ledger/history/log.jsonl each print one check-fail line.
- `--quick` (logs/quick-20-04.log): the log reaches `verify-platform: summary` with 128 PASS. The FAIL set is exactly the 4 gui08 baseline rows, so the R33 subtraction is empty. All 4 ng-087/088 rows pass.

NG-074 and NG-084 stay deferred-approved (owner chris, phase 15), carried as they were.

## Commits

- `b3e8883` test(20-04): add the schema v3 and v4 checks for NG-087 and NG-088 (PLAT-03)
- `d8ddcf7` chore(20): add NG-087 and NG-088 for tab store schema v3 and v4, recorded red and closed

Each check file has exactly one commit. Chris's lock-checks in 20-05 seals them.

## Deviations from Plan

**1. [Rule 1 - Bug] The closed-tab history read was a broken instrument against b9412fa**
- **Found during:** Task 1
- **Issue:** The first draft derived the history SQL up front and threw an instrument error (exit 2) when `AND closed_at IS NULL` was absent. b9412fa's listUngroupedTabs has no such clause, so `--at b9412fa` exited 2 instead of reaching the writer's refusal.
- **Fix:** The derivation moved to the read that uses it, after the restart. A missing clause is now a red, and the writer's refusal comes first.
- **Files modified:** scripts/verify-ng-087-loose-position-across-restart.mjs. The fix was made before the file's single commit.
- **Commit:** b3e8883

The `--quick` gate also ran once before the checkpoint, while the files were still uncommitted. Any defect it found could then be fixed without a second commit on a check file. It found none.

## Self-Check: PASSED

- FOUND: scripts/verify-ng-087-loose-position-across-restart.mjs
- FOUND: scripts/verify-ng-088-group-order-across-restart.mjs
- FOUND: b3e8883, d8ddcf7 (ancestors of HEAD)
