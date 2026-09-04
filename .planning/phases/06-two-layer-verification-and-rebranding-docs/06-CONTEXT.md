# Phase 6: Two-Layer Verification and Rebranding Docs - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The build proves its own branding correctness for any downstream, and a stranger has a document that carries them through a full rebrand. Requirements: VER-01, VER-02, DOC-01. Depends on Phases 4 and 5 (both emitter halves exist, literal scan is meaningful).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Existing verification assets to build on: `scripts/scan-brand-residue.mjs` (+ `--extra-root`), `scripts/verify-branding-preflight.mjs` (13 sections), `scripts/verify-theia-branding.mjs`, `scripts/verify-theia-endpoints.mjs`, `scripts/verify-generated-identity.mjs`, `scripts/verify-upstream-pins.mjs`, `scripts/verify-extension-pins.mjs`, `scripts/verify-telemetry.mjs`, `scripts/verify-platform.sh` registry, endpoint allowlist + `verify-endpoints`, `verify-registry-shape.mjs`, `verify-shell-error-copy.mjs`. New checks follow the registry pattern (derive-from-tree-and-compare, planted-fault self-test proving red).

ROADMAP research note: Mozilla/Eclipse trademark findings are LOW-confidence web-sourced — re-check against primary policy text before any gate depends on them; record named human review of every file in `brand/`.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Relevant areas: `scripts/` verifiers, `docs/` (BUILD.md exists; REBRANDING.md does not), `.github/workflows/` CI, `configuration.toml` full field list, built-artifact surfaces (Gecko branding dir, icons, installer fields, Theia frontend config).

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria:

1. Static scan with committed scope list + boundary-matched tokens fails build on hardcoded brand values outside manifest; also fails on stale allowlist entries.
2. Runtime verification checks six branding surfaces by exact equality against the BUILT ARTIFACT, expectations read from `configuration.toml`, fails on disagreement.
3. `docs/REBRANDING.md` documents every field, walks first-time reader clone → branded build.
4. Both layers + `generate --check` run in CI and pass on Power Browser's own build.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
