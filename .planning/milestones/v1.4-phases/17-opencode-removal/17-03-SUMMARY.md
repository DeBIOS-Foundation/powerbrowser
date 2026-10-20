---
phase: 17-opencode-removal
plan: 03
subsystem: docs
tags: [opencode, planning-records, codebase-map, roadmap, ng-051]
status: complete

requires:
  - phase: 17-02
    provides: "removal commit B 02fffb6 and the NG-051 drop c3929e9"
provides:
  - "codebase map describing the seven-extension tree with no OpenCode surface"
  - "ROADMAP Phase 16 record noting NG-051 dropped 2026-10-17 (c3929e9)"
  - "Superseded 2026-10-16 banners on the three OpenCode/PBA-era notes"
affects: [17-04]

actuals:
  tokens: 3100
  tasks: 2
  commits: 2
plan_head_before: 2f88427a79c7ae2cb6ae2c9d02ee83d8d5b71108
plan_head_after: e4c5079e6b87d12632faff1fd19c19c01230b144

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/STACK.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/ROADMAP.md
    - .planning/notes/ai-backends-goal.md
    - .planning/notes/pba-order-of-events.md
    - .planning/research/ai-review-ux-and-backend-adapters.md

key-decisions:
  - "STACK.md keeps its opencode.json line: the file is Chris's CLI config and still exists"

requirements-completed: [RM-01]

metrics:
  duration: 6min
  completed: 2026-10-17
---

# Phase 17 Plan 03: Live planning records after the OpenCode removal Summary

The codebase map now lists seven `@powerbrowser/*` extensions with no adapter, ACP SDK, `ai-backend.json`, `[ai]` table or `POWERBROWSER_MCP_*` entries. ROADMAP's Phase 16 record states that NG-051 was dropped 2026-10-17 (c3929e9). The three OpenCode-era notes carry additive Superseded banners.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Drop the OpenCode adapter from the codebase map | 84987f3 | ARCHITECTURE.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md |
| 2 | Record the NG-051 drop in the roadmap; mark OpenCode-era notes superseded | e4c5079 | ROADMAP.md, ai-backends-goal.md, pba-order-of-events.md, ai-review-ux-and-backend-adapters.md |

## Verification

- Task 1 `<verify>` chain passed. The adapter pattern returns no match in ARCHITECTURE/STRUCTURE/INTEGRATIONS, STACK.md matches only `- \`opencode.json\` — OpenCode agent permissions`, both files say seven extensions, the `@theia/ai-anthropic` bullet is kept, and the index held exactly the four files before commit.
- Task 2 `<verify>` chain passed after the commit. The numstat log `.planning/phases/17-opencode-removal/logs/numstat-17-03.log` (git-ignored) shows `3 0` for each note, and the commit names exactly the four task files. `Requirements (was): AI-01..AI-05` is still present.
- Before editing, `git grep POWERBROWSER_MCP` over `theia/ powerbrowser/ scripts/` returned nothing, which confirms the env-var lines were adapter-only.

## Deviations from Plan

None. The plan was executed as written. ROADMAP's "Kept and built: NG-051 (...)" sentence was reworded in place. The required phrase is on one physical line.

## Notes

- `phase-gate.py` still reports `locked check missing: scripts/verify-ng-051-backend-off.mjs`, as expected; plan 04 re-locks. The ledger was not touched.
- No archived milestone, docs/non-gui history or ledger file was edited.
- The markdownlint MD032 warnings on the edited bold-label lists match the existing style of these files. They were not introduced by this plan.

## Self-Check: PASSED

- Commits 84987f3 and e4c5079 are ancestors of HEAD; all eight modified files exist.
