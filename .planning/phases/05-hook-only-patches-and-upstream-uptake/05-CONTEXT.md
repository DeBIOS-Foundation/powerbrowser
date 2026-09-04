# Phase 5: Hook-Only Patches and Upstream Uptake - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The patch stack carries no brand values, and adopting an upstream release means editing one pin. Requirements: MIG-05, CFG-06, UPD-01, UPD-02. Depends on Phase 3's `generated/` layout.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Constraints from tree: patches are regenerated from a patched tree, never text-edited (`scripts/check-patch-surface.sh` guards the surface; `apply-patches.sh --self-test` guards the mechanism). `upstream/` is never hand-edited. Phases 3–4 established the `generated/` layout the hooks must point into.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Relevant areas: `patches/` stack, `scripts/fetch-upstream.sh`, `scripts/rebase-upstream.sh`, `scripts/apply-patches.sh`, `scripts/check-patch-surface.sh`, `scripts/check-internals-boundary.sh`, `configuration.toml` (pin declarations), fetch/build scripts consuming version strings.

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria:

1. No `patches/*.patch` contains a configured brand value — hooks (`include()` / `DIRS +=`) into `generated/` only; 3-way-merge blob-hash chain intact; non-vacuity assertion still fires on silent no-op.
2. Firefox ESR + Theia pins declared once in `configuration.toml`, consumed by fetch/build scripts; no duplicated version strings.
3. ESR pin bump + fetch + patch apply yields working branded build; rebase/conflict tooling fails loudly on drift.
4. Theia pin bump re-pins sidecar with core neither forked nor patched.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
