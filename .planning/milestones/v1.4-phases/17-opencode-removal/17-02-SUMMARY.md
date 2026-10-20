---
phase: 17-opencode-removal
plan: 02
subsystem: infra
tags: [opencode, generator, schema, verify-platform, ng-051, rebranding]
status: complete

requires:
  - phase: 17-01
    provides: "theia workspace without backend-opencode"
provides:
  - "removal SHA 02fffb6210fda013fe22c0794c3bad92b1daa2c5 (commit B) for Chris's re-lock in plan 04"
  - "53-target generator with no AI backend emitter"
  - "manifest and schema with no [ai] table / ai.backend key"
  - "registry with no OpenCode or NG-051 rows or helpers"
affects: [17-03, 17-04]

actuals:
  tokens: 33373
  tasks: 2
  commits: 1
plan_head_before: ba6a5a53dfab3a1647c9539d99ca522e817aa1f8
plan_head_after: 02fffb6210fda013fe22c0794c3bad92b1daa2c5

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - scripts/verify-platform.sh
    - docs/non-gui/checks-wave-e.tsv
    - configuration.toml
    - scripts/lib/config-schema.json
    - scripts/generate.mjs
    - theia/applications/browser/package.json
    - docs/REBRANDING.md
  deleted:
    - scripts/verify-ng-051-backend-off.mjs
    - scripts/verify-opencode-bridge.mjs
    - scripts/verify-opencode-presets.mjs
    - scripts/verify-opencode-tracer.mjs
    - docs/ai-opencode-adapter.md

key-decisions:
  - "Sets R and M landed as one commit (B, 02fffb6) because the deleted scripts imported emitAiBackend; the phase-gate locked-check-missing line for the 051 file is the expected red until plan 04's re-lock"

patterns-established: []

duration: 2min
completed: 2026-10-17
---

# Phase 17 Plan 02: OpenCode manifest path and registry removal Summary

**One commit (B, `02fffb6210fda013fe22c0794c3bad92b1daa2c5`) removes the `[ai]` manifest table, the `ai.backend` schema key, `emitAiBackend` with its TARGETS row (generator now 53 targets), `powerbrowserAiBackend`, the REBRANDING `[ai]` section, the three verify-opencode scripts, the NG-051 check, the adapter doc, and every registry row and helper that named them.**

## Removal SHA (for plan 04)

`02fffb6210fda013fe22c0794c3bad92b1daa2c5`, which is `refactor(17-02): remove the OpenCode manifest path, checks and registry rows`. NG-051 drop commit `c3929e9` is an ancestor (verified with `git merge-base --is-ancestor`).

## Expected red window

`python3 scripts/phase-gate.py --root .` now prints exactly:

```
locked check missing: scripts/verify-ng-051-backend-off.mjs
```

The plan expects this line. The ledger still lists the deleted 051 file as locked until Chris re-locks at commit B in plan 04. No ledger command was run, and the file was not restored.

## Performance

- **Duration:** about 2 min
- **Completed:** 2026-10-17T06:10:21Z
- **Tasks:** 2
- **Files:** 12 (7 modified, 5 deleted); 3 insertions, 2627 deletions

## Task Commits

1. **Task 1: Delete the OpenCode and NG-051 checks and their registry rows.** Staged only, no commit of its own, as the plan requires.
2. **Task 2: Remove the [ai] manifest path and commit the removal SHA.** `02fffb6` (refactor). Contains all twelve Set R and Set M paths.

## Verification

- Task 1 chain: `bash -n` passes, `--only theia-build-order` PASS, no ai-opencode/ng051/adapter_composed/verify-opencode/NG-051 text left in the driver, and the allowlist-schema anchor is kept.
- Task 2 chain run against commit B: all checks pass.
  - `generate --check`: `all 53 generated file(s) match`.
  - `verify-rebranding-docs`: 40/40 fields.
  - `scan-brand-residue`: PASS over 347 files.
  - The app package.json diff is `0 1`.
  - `theia/package.json`, `theia/extensions`, `theia/yarn.lock` and `.gitignore` are unchanged.
- `--quick` (log at `.planning/phases/17-opencode-removal/logs/quick-17-02.log`, git-ignored): reached its summary, and `generate-check` and `verify-rebranding-docs` PASS. The only FAIL rows are `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy` and `gui08-panorama-copy-self-test`.
- `generated/ai-backend.json` was removed from disk. It was untracked.

## Deviations from Plan

None. The plan was executed exactly as written, and every line-number anchor matched.

## Notes for later plans

Historical docs still name the removed items: `docs/non-gui/GAPS.md`, `docs/non-gui/decisions.md`, `docs/non-gui/import-review.txt` and `docs/non-gui/plans/wave-*-PLAN.md`. These files are outside this plan's file set and were left untouched.

## Self-Check: PASSED

- The five deleted paths are not tracked: `git ls-files` returns empty.
- Commit `02fffb6` is HEAD and an ancestor check passes.
- This SUMMARY exists at `.planning/phases/17-opencode-removal/17-02-SUMMARY.md`.
