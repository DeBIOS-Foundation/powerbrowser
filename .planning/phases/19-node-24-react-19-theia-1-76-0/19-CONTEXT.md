# Phase 19: Node 24, React 19, Theia 1.76.0 - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The sidecar runs Theia 1.76.0 with React 19 on Node 24, with Theia's AI framework
as upstream ships it, each step checked live before the next (RM-02, UPD-07..UPD-10).
See ROADMAP.md Phase 19 success criteria. Phases 17 (OpenCode removed) and 18
(Gecko 153.5.0esr) are complete.

</domain>

<decisions>
## Implementation Decisions

### Locked
- Three ordered commits, each followed by `--quick` and a live sidecar start:
  (1) Node 24 — `flake.nix` only, `flake.lock` byte-unchanged (no `nix flake update`);
  (2) React 19.2.8 / `@types/react` 19.2.18 / `@types/react-dom` 19.2.7 at Theia 1.74.1;
  (3) every `@theia/*` except `@theia/monaco-editor-core` to 1.76.0.
- RM-02 (Chris, 2026-10-16: "Theia AI should remain as stock"): delete both
  AI-layout overrides in `@powerbrowser/branding` (decision 22 in PROJECT.md);
  the 12 `@theia/ai-*` packages stay composed, moved to 1.76.0, unmodified.
- Theia's Welcome page (pulled in by `@theia/ai-ide` → `@theia/getting-started`
  at 1.76) must not open: set `workbench.startupEditor: "none"` in the app's
  default preferences; prove it on a fresh and a carried-over config dir.
- Telemetry collision (autonomous decision, recommended by CLAUDE.md's
  user-facing-copy rule): the PowerBrowser `telemetry.telemetryLevel` registration
  must be the one the Settings UI shows (its copy names PowerBrowser); make it win
  deterministically and assert that live. Record the decision in the SUMMARY and
  flag it for Chris's acknowledgement (UPD-10 names him as the decider).
- Old ledger row NG-082 (Chris, 2026-10-17: "Drop it, add a new row"): its text
  says 1.75.0 and `ledger-amend.py set` cannot change text, so Chris removes that
  row himself. The agent then creates a new row with the agent-allowed
  `ledger-amend.py add` for "Theia 1.76.0 + React 19 + Node 24", records its
  failing run, and closes it with evidence. Plans cite the new row ID plus NG-074
  and NG-084. If the old row is still open when that plan starts, the plan stops
  and surfaces the exact terminal command for Chris.
- New `--quick` row: exactly one installed copy each of react, react-dom,
  `@types/react`, `@types/react-dom`, inversify; derived from node_modules, with a
  `--self-test` that plants a duplicate and must go red naming the package.
- Refresh `docs/non-gui/quick-baseline.txt` (R33) if the FAIL set changes.
- Live sidecar checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000.
- Rebuild the sidecar before any live check (Phase 17 review IN-02: build output
  predates the OpenCode removal).
- Never fork or patch Theia core; `scripts/diff-theia-core.sh` must pass.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria, `.planning/research/STACK.md`,
`.planning/research/PITFALLS.md` and this phase's research.

</decisions>

<code_context>
## Existing Code Insights

- Change sites (milestone research, re-verify): `flake.nix:20`; `theia/package.json`
  pins incl. `:65-66` type pins and `resolutions`; every `theia/extensions/*/package.json`
  and `theia/applications/browser/package.json`; branding
  `powerbrowser-ai-layout-contribution.ts`, `powerbrowser-frontend-module.ts`;
  `theia/extensions/telemetry` preferences.
- `scripts/verify-upstream-pins.mjs` checks the Theia pin across resolutions,
  member files and the lockfile.

</code_context>

<specifics>
## Specific Ideas

Research questions flagged by the roadmap: which telemetry schema wins at 1.76;
`view:` factory ids still valid; `pagehide` persistence; dependent-window theme;
drivelist under Node 24 headers.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
