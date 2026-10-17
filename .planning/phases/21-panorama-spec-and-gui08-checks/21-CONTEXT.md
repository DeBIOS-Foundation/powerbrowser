# Phase 21: Panorama Spec and gui08 Checks - Context

**Gathered:** 2026-10-17
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The Panorama spec describes the design that shipped, the checks derived from it
pass, and the commit gate is green (PAN-01, PAN-07). See ROADMAP.md Phase 21 success
criteria. Execution starts after Phase 20 completes; planning runs alongside it.

</domain>

<decisions>
## Implementation Decisions

### Locked
- The shipped Panorama redesign (commit `7b7a1f7`) is the source of truth. 15-UI-SPEC
  (in the v1.3 milestone archive) is rewritten to describe it: canvas geometry, loose
  ungrouped cards, and the "Expand" / "Done" copy. The code is not changed to match the
  old spec.
- `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` keep deriving their
  expectations from 15-UI-SPEC (CLAUDE.md verification rule 2). Each `--self-test` must go
  red on each planted fault on a green tree.
- The 4 gui08 rows in `docs/non-gui/quick-baseline.txt` go green, and the baseline file
  becomes empty, by derivation, not by hand-editing.
- Stale tray code, comments and CSS are removed (PAN-07), and the canvas still shows
  ungrouped tabs as loose cards.
- User-facing copy follows the CLAUDE.md copy rule. "Expand" and "Done" are reviewed
  copy entering the declared contract; any other new string needs the same review.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000. Rebuild the
  sidecar before a live check.
- Never fork or patch Theia core.

### Claude's Discretion
Everything else, guided by the ROADMAP success criteria, the sketch findings
(`Skill("sketch-findings-Power-Browser")`), and this phase's research.

</decisions>

<code_context>
## Existing Code Insights

Starting points: `theia/extensions/modes/src/browser/organising-widget.ts`,
`theia/extensions/modes/src/browser/modes.css`, `scripts/verify-gui08-*.mjs`,
`.planning/milestones/v1.3-phases/15*/15-UI-SPEC.md`, and the current `--quick` failure
text (the card width, thumbnail box, `dataset.tray` hook, "Ungrouped" strings).

</code_context>

<specifics>
## Specific Ideas

None beyond the ROADMAP success criteria.

</specifics>

<deferred>
## Deferred Ideas

None.

</deferred>
