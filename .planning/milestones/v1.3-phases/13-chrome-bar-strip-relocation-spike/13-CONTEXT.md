# Phase 13: Chrome Bar + Strip-Relocation Spike - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The user navigates with a top chrome bar, and strip-relocation feasibility is proven with the fallback decided

Requirements: GUI-06 (chrome bar), GUI-07 spike entry criterion (mapped to Phase 14 — the spike verdict is this phase's exit gate).
Depends on: Phase 12 (v1.2 SQL store shipped — tab rows and registry URIs are the identity substrate).

Success criteria:
1. Top chrome bar visible (back/forward/reload, address input, new tab, mode toggle) as a toolbar-like `@powerbrowser/*` contribution, styled Theia-native per the sketch-findings theme.
2. Back/forward/reload/new-tab work from the bar (new-tab via stock-window escape until GUI-02; no bookmarks/mute/menu).
3. Address input suggests while typing; activating a suggestion navigates.
4. Spike verdict recorded: live strip moves shell areas without forking Theia core (green → Variant B in Phase 14; red → Variant-A fallback, modes still ship).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop by default — verification deferred until roadmap fully executed; plan-phase runs with --no-reversibility-gates; milestone audit gaps/tech debt accepted; cleanup dry-run approved if phase scratch only; halt only on blocker surviving 3 fix-and-retry attempts.

### Committed direction (from sketch wrap-up, not to be re-litigated)
- Sketch 001 winner A (top chrome bar, Firefox-like); the bar is called the **chrome bar**.
- Sketch 002 winner B (strip relocates per mode) PENDING the spike verdict — the spike decides, not preference.
- Design tokens: `.claude/skills/sketch-findings-Power-Browser/` (auto-loads when building UI).

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

Known anchors: `theia/extensions/tab-uris` (TabUriRegistry, OpenHandlers, `window.open` browser-window command), `theia/extensions/customize` (CSS layer + privileged-JS pattern, user-storage precedent), v1.2 chrome-side tab writer behind `PowerBrowserAPI.sys.mjs` (`tabs.sqlite`).

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
