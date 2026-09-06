# Phase 14: Modes + Windows & Setups - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The user switches modes that reshape the shell around invariant tabs, and works across core/dependent windows with named setups

Requirements: GUI-07 (modes), GUI-09 (windows & setups).
Depends on: Phase 13 (chrome bar hosts the mode toggle; spike verdict fixes Variant B vs Variant-A fallback).

Success criteria:
1. Coding/browsing/organising switchable from shipped defaults, customizable, savable as modes (data, never manifest flags).
2. Strip relocates per mode — UNDER THE BINDING 13-01 VERDICT (RED): the strip STAYS TOP in all modes per the Variant-A fallback; modes still ship. Any Phase-14 work predicated on relocation is out; the re-probe runway (realign node_modules, re-run) may reopen Variant B only as a recorded decision, not as silent scope.
3. Dependent windows host tab content (never a second IDE frame); core-close kills session, relaunch restores setup.
4. Named setups save/restore geometry + tab placement + mode.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop by default — verification deferred until roadmap fully executed; plan-phase runs with --no-reversibility-gates; milestone audit gaps/tech debt accepted; cleanup dry-run approved if phase scratch only; halt only on blocker surviving 3 fix-and-retry attempts.

### Committed direction (not to be re-litigated)
- 13-01 spike verdict RED is binding: Variant-A fallback. No relocation work in this phase.
- Modes are data with shipped defaults (coding/browsing/organising); custom modes save current layout.
- Tabs invariant across every switch (status-bar chip pattern from Phase 13).
- Core + dependents: sub-windows host tab content only; core-close-full-kill.
- Sketch findings skill auto-loads when building UI.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

Known anchors: `theia/extensions/chrome-bar/` (Phase 13: commands, widget, CSS layer, gates), `theia/extensions/tab-uris` (registry + secondary-window isExtractable precedent), v1.2 chrome-side writer + readonly query API (`tabs.sqlite`), `theia/extensions/customize` (user-storage precedent for custom modes).

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
