# Phase 20: Non-GUI Gaps - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The remaining non-GUI gaps are closed on the final dependency set (Theia 1.76.0,
React 19.2.8, Node 24, Gecko 153.5.0esr), each by a check that can go red or by a
recorded result (PLAT-01..PLAT-05). See ROADMAP.md Phase 20 success criteria.
Phases 17, 18 and 19 are complete.

</domain>

<decisions>
## Implementation Decisions

### Locked
- PLAT-01 (G-14.1.1-9): a build from a clean checkout passes, including
  `yarn build:extensions`. The clean checkout is a fresh clone outside the repo,
  or a quiet tree. Never `git clean` or reset the main checkout.
- PLAT-02 (G-14.1.1-10): a `--quick` group-channel row with a `--self-test` that
  plants faults; each planted fault must go red naming the drift. Derive the
  expectation from the tree, do not hand-keep it (CLAUDE.md verification rule 2).
- PLAT-03: the schema v3/v4 work gets ledger rows. The agent creates rows only with
  the agent-allowed `ledger-amend.py` subcommands. Any step that needs Chris
  (approve, lock-checks, drop) is a blocking-human checkpoint that gives him the
  exact terminal command, starting with `cd /home/chris/coding/Power-Browser` on its
  own line.
- PLAT-04: `generate-check` is either closed as not reproducible, with passing runs
  recorded in both the host shell and `nix develop .#theia`, or reproduced and
  fixed. Phase 19's verifier saw `verify-downstream-fixtures` go red once in
  `--quick` ("restored generated/ hashes differ"), then pass on re-run; research
  whether that is the same flake (a concurrent `--quick` writing generated/).
- PLAT-05: every verify-script path into `.planning/phases/` resolves to its
  archived location (`.planning/milestones/v*-phases/...`), or the check fails
  naming the missing path. The fix is a derived check, not a hand-kept path list.
- Add the `-purgecaches` line to `docs/BUILD.md` (edits to powerbrowser/shell/*.js
  need `-purgecaches` or they silently do not run).
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000.
- Never fork or patch Theia core; never hand-edit `upstream/`.
- Refresh `docs/non-gui/quick-baseline.txt` (R33) only by derivation, if the FAIL
  set changes. The 4 gui08 rows stay red until Phase 21.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria, the v1.4 research files and
this phase's research.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Starting points:
`scripts/verify-platform.sh` (the one registry), `scripts/generate.mjs --check`,
`scripts/ledger-amend.py`, the G-14.1.1-9/10 gap records in the v1.3 archive
(`.planning/milestones/v1.3-phases/14*`), and `docs/BUILD.md`.

</code_context>

<specifics>
## Specific Ideas

None beyond the ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
