---
phase: 20-non-gui-gaps
plan: 02
subsystem: verification
tags: [verify-platform, planning-paths, git-ls-files, milestone-archive, PLAT-05]
status: complete

requires:
  - phase: 20-01
    provides: the race-free verify-downstream-fixtures harness this plan repoints
provides:
  - scripts/verify-planning-paths.mjs (derived planning-path row with --self-test)
  - planning-paths and planning-paths-self-test rows at the end of the --quick array
  - five verify-script literals pointing at their milestones/ archive paths, fallbacks deleted
affects: [20-03, 20-04, 20-05, v1.4 closeout]

actuals:
  tokens: 3212
  tasks: 2
  commits: 2
plan_head_before: fc3b9a7d54d514c9dd1576ed711168d4bc2bb83f
plan_head_after: 743bb59d4b5b9267b46572063e8b3e8e778276a4

tech-stack:
  added: []
  patterns:
    - "The tracked set (git ls-files -z) is both the scan input and the resolution target; a glob must match exactly one distinct tracked file or dir prefix"
    - "Self-test plant paths are assembled at runtime, so the script never spells a concrete planning path in its own scan scope"

key-files:
  created:
    - scripts/verify-planning-paths.mjs
  modified:
    - scripts/verify-platform.sh
    - scripts/verify-sql-store-soak.mjs
    - scripts/verify-strip-spike-verdict.mjs
    - scripts/verify-dependent-window-content.mjs

key-decisions:
  - "PLAT-05 closes with one derived row: no fallback inside planning-paths, because a fallback is the breakage it exists to catch"
  - "resolveRecord in the strip-spike and dependent-window scripts is kept unchanged; its first branch now finds the archived literal directly"

patterns-established:
  - "A script that points into a live phase dir turns planning-paths red at the milestone closeout that archives it"

requirements-completed: [PLAT-05]

duration: ~20min
completed: 2026-10-17
---

# Phase 20 Plan 02: Planning-path row Summary

`planning-paths` resolves every planning-tree literal in tracked `scripts/` and `.github/` against `git ls-files`. It was seen red on the five live-phase literals; those five now point at their archived paths, and their fallbacks are deleted.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | planning-paths check, red on the five live-phase sites | 025512a | scripts/verify-planning-paths.mjs |
| 2 | Repoint the five literals, delete fallbacks, register the rows | 743bb59 | scripts/verify-platform.sh, scripts/verify-sql-store-soak.mjs, scripts/verify-strip-spike-verdict.mjs, scripts/verify-dependent-window-content.mjs |

## Results

**Pre-repoint red (Task 1, logs/planning-paths-pre-20-02.log, exit 1, exactly five lines):**

```
planning-paths: FAIL -- scripts/verify-dependent-window-content.mjs:50 .planning/phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md (0 tracked)
planning-paths: FAIL -- scripts/verify-platform.sh:287 .planning/phases/07-*/fixtures (matches 0)
planning-paths: FAIL -- scripts/verify-platform.sh:308 .planning/phases/09-*/fixtures (matches 0)
planning-paths: FAIL -- scripts/verify-sql-store-soak.mjs:50 .planning/phases/11-sql-store-design/fixtures/tabs-v1.sqlite (0 tracked)
planning-paths: FAIL -- scripts/verify-strip-spike-verdict.mjs:63 .planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md (0 tracked)
```

The two verify-platform.sh sites sat at :287 and :308, one line below the plan's :286 and :307. They are the same two `git grep` hits.

**Self-test:** `planning-paths-self-test: PASS -- 7 cases`. A scratch mutation (`n !== 1` changed to `n === 0`) made it go red: `'glob matching 2' expected ... (matches 2); got: (no failures)`.

**Post-repoint:** `planning-paths: PASS -- 11 references in 161 tracked files under scripts/ and .github/ resolve to tracked paths (scope is scripts/ and .github/ only; docs/ and CLAUDE.md are not checked)`. 11 matches the expected count: the 14 found before, minus the 3 deleted fallback literals.

**Readers (logs/readers-20-02.log, each `--only`):** planning-paths, planning-paths-self-test, sql-store-soak (14 drives incl. fixture-byte-identity on the archived fixture), gui07-strip-spike-verdict, gui07-strip-spike-verdict-self-test, gui09-dependent-window-content, gui09-dependent-window-content-self-test and verify-downstream-fixtures all PASS. The gui09 row skips its live half, which is the only reader of the record path. I ran `node scripts/verify-dependent-window-content.mjs --live` as well (it reads the record and starts no browser), and it PASSed on the archived record.

**Quick gate (R33, logs/quick-20-02.log):** the log reaches `verify-platform: summary` with 122 PASS. The only FAILs are the four gui08 baseline rows (gui08-canvas-geometry, -self-test, gui08-panorama-copy, -self-test). FAIL set minus docs/non-gui/quick-baseline.txt is empty. Baseline not refreshed.

**Gates:** `git grep -n '\.planning/phases/' -- scripts .github` prints nothing. Brand-residue scan exits 0. `phase-gate.py` stays silent after both commits. `plan-gate.py --phase 20` reports `plan gate passed`. `git show --stat 743bb59` lists exactly the four files. The 07 glob and the 09 glob each appear on one line (:288, :299). The ledger precondition grep found no hits, so none of the three .mjs readers is sha-locked.

## Deviations from Plan

None. The plan executed as written. The only extra check was the `--live` run of the dependent-window reader, added so the repointed record path is actually read.

## For Chris (20-05)

CLAUDE.md:145 names `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md`, which has been archived and no longer resolves. It is outside this row's scope (scripts/ and .github/ only). Whether to repoint it, or to widen planning-paths to CLAUDE.md and docs/, is your call in 20-05.

## Known Stubs

None.

## Scratch left behind

- /tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/pp-mut.mjs (mutation copy of the check)

## Self-Check: PASSED

- FOUND: scripts/verify-planning-paths.mjs (tracked)
- FOUND: 025512a, 743bb59 (ancestors of HEAD)
