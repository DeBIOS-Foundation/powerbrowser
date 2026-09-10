# Phase 16 deferred / out-of-scope items

Items discovered during 16-03 execution that belong to other agents' scope.
Not fixed here per the scope boundary (concurrent agents active).

## 2026-09-06: scan-brand-residue frozen row moved under concurrent phase-15 work

- **Row:** `-PLAN.md` (literal/frozen), `inventory/brand-tokens.json`
  (expected 36; observed 37, then 39 across runs as phase 15 commits land).
- **Cause:** phase-15 agent's committed edits to
  `powerbrowser/INTERNAL-APIS.md` (19 -> 21 citations) plus one citation
  in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (a file outside the
  row's `expected_files`). Zero contribution from 16-03: no staged 16-03
  file contains `-PLAN.md`, and none is in the row's `expected_files`.
- **Owner:** phase-15 agent (precedent 12-02: the plan that adds citations
  bumps the row in its own commit).
- **Status at 16-03 Task-2 commit:** `scan-brand-residue` plus its
  self-test cascade are the only red rows in `verify-platform.sh --quick`;
  every other row is green, including all four 16-01/16-02 rows and the
  `verify-rebranding-docs` coupling 16-03 added.
- **Resolved during 16-03 Task 3:** the phase-15 agent landed their
  inventory bump; the Task-3 full-`--quick` run is green on every row,
  including both scan rows and both new bridge rows.
