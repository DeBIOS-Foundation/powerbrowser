# Phase 4: Theia Surface — Branding, Extensions, Telemetry - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Everything on the Theia side — product branding, declared extensions, telemetry delivery — is driven by `configuration.toml` with no TypeScript recompile for a rebrand. Requirements: GEN-05, EXT-01, TEL-01, TEL-02, TEL-03. Depends on Phase 2 (parallelizable with Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key unknowns flagged by ROADMAP research note: `theia download:plugins` and Open VSX pin semantics are entirely unexercised in this tree (no `theiaPlugins` block has ever existed here); whether a pin can be hash-verified is unknown. Highest-unknown phase — research recommended before planning.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Relevant areas: `theia/` sidecar tree, `@powerbrowser/*` extensions, generator (`scripts/generate.mjs`), `configuration.toml` schema, endpoint allowlist + `verify-endpoints`, Mozilla telemetry/crash endpoint references.

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria:

1. Welcome tab, about dialog, product name, logo, default theme from generated frontend config keys alone — no TypeScript recompile on rebrand.
2. Extensions declared in `configuration.toml` (Open VSX id or direct URL + pin) downloaded and bundled at build time; unpinned/unreachable entry fails the build loudly.
3. Telemetry `off` (default) sends nothing; when set, sender batches/retries to configured endpoint honoring level (off / crash / error / all).
4. Configured telemetry + URL hosts in generated endpoint allowlist so `verify-endpoints` passes for arbitrary downstream; Mozilla telemetry/crash endpoints repointed or disabled per manifest.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
