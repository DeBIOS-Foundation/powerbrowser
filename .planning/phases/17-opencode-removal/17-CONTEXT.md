# Phase 17: OpenCode Removal - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The tree carries no OpenCode adapter (RM-01). See ROADMAP.md Phase 17 success
criteria. Run order: Phase 18 (Firefox 153.5) already completed first; Phase 17
touches no Gecko file.

</domain>

<decisions>
## Implementation Decisions

### Locked
- **NG-051 is already dropped by Chris** (ledger commit c3929e9, 2026-10-17, via
  `scripts/ledger-amend.py drop`). The removal commit may now delete
  `scripts/verify-ng-051-backend-off.mjs`.
- **Re-lock is Chris's step.** `ledger-amend.py lock-checks --commit <sha>` is not
  agent-allowed (hook). After the removal commit the phase gate will report
  `locked check missing: scripts/verify-ng-051-backend-off.mjs` until Chris runs
  `python3 scripts/ledger-amend.py --root . lock-checks --commit <removal-sha>` in
  his terminal. The plan ends with that as a `blocking-human` step that prints
  the exact command with the SHA filled in.
- **Theia AI stays stock** (Chris, 2026-10-16): the 12 `@theia/ai-*` packages stay
  composed and unmodified. Do not touch the D-22 overrides here (RM-02 is Phase 19).
- **DSH is out of scope**; nothing replaces OpenCode.
- Removal surface and pitfalls: `.planning/research/ARCHITECTURE.md` (three sets:
  manifest, workspace, registry) and `.planning/research/PITFALLS.md`. Each set is
  green only as a whole.
- Ignored leftovers must be removed on this checkout: `theia/extensions/backend-opencode/lib/`,
  the workspace symlink under `theia/node_modules/@powerbrowser/`, `generated/ai-backend.json`
  (the generator never deletes extra files).
- Commit the regenerated `theia/yarn.lock` in the same change; verify with
  `yarn install --frozen-lockfile` inside `nix develop .#theia`.
- Refresh `docs/non-gui/quick-baseline.txt` (R33) to the post-removal `--quick` FAIL set.
- Remove AI-01..05 and Phase 16 from live planning records only where still live;
  archived milestone files stay as history.
- Verification runs on port `PB_VERIFY_PORT` (default 3939) since commit 3079774.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria and the research files.

</decisions>

<code_context>
## Existing Code Insights

See `.planning/research/ARCHITECTURE.md` §removal surface (file:line for every
item: configuration.toml `[ai]`, config-schema.json `ai.backend`, generate.mjs
`emitAiBackend` + TARGETS row, REBRANDING.md section, theia/package.json
`build:extensions`, app package.json `powerbrowserAiBackend`,
verify-backend-env-readers.mjs `EXPECTED_ENV_TOUCHERS`, verify-platform.sh
`adapter_composed` / `check_ai_opencode_held` / the ng051 row).

</code_context>

<specifics>
## Specific Ideas

None beyond the research files.

</specifics>

<deferred>
## Deferred Ideas

Removing the `@theia/ai-*` framework — a later milestone, if ever (Chris: "we will work with it later").

</deferred>
