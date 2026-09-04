# Phase 7: Sourcerer as Downstream - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

A stranger's config, living in their own repo, produces their fully branded browser from an untouched platform tree. Requirements: CFG-05, VER-03, DOC-02. Depends on Phase 6. This is the milestone's real acceptance test.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Known assets: `PB_CONFIG_DIR` external-config mechanism (verify how generate.mjs resolves it), `generated/` gitignored root, both verification layers (static scan + runtime identity check now manifest-derived), `docs/REBRANDING.md`, adversarial fixture classes named by ROADMAP (spaced display name, post-`m-browser` sort name, non-square logo, missing required key). Sourcerer's real branding lives in its own repo — fixtures stand in here; no Sourcerer marks in this tree (residual-brand scan gate).

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Relevant areas: `scripts/generate.mjs` config-dir resolution, `generated/` layout, verification layers from Phase 6, `docs/REBRANDING.md` walkthrough (fixture run doubles as its first real carry-through test).

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria:

1. `PB_CONFIG_DIR` at external dir builds from that config with zero platform-repo edits.
2. Sourcerer-equivalent external config + logo assets yield fully branded product; Power Browser still builds with downstream absent.
3. Adversarial fixtures (spaced name, late-sort name, non-square logo, missing key) each build+verify correctly or fail with intended clear error — never silently wrong.
4. Both verification layers pass for every fixture — nothing keyed to Power Browser's own values.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
