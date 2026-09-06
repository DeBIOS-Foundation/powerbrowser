# Phase 15: Panorama Organising - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The user organises tabs spatially on a freeform canvas and hierarchically in a tree, over SQL-persisted groups

Requirements: GUI-08 (Panorama organising).
Depends on: Phase 14 (organising placeholder slot + modes shell; groups schema reserved — dead layout blob kept deliberately for this canvas per REVIEW-FIX).

Success criteria:
1. Free drag, corner resize, auto-box on canvas drop, zoom, ungrouped tray.
2. Canvas/tree flip over identical group data.
3. Groups persist via SQL groups table + `group_id` on URI-keyed rows, single chrome-side writer; sessionstore stays restore authority; never sessionstore-coupled (Bugzilla 1221050).
4. PNG last-view snapshot thumbnails.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop by default — verification deferred until roadmap fully executed; plan-phase runs with --no-reversibility-gates; milestone audit gaps/tech debt accepted; cleanup dry-run approved if phase scratch only; halt only on blocker surviving 3 fix-and-retry attempts.

### Committed direction (not to be re-litigated)
- Panorama research note (browser-organising-panorama.md) is the interaction authority: pixel-free boxes, header-drag move, corner resize, no snap/grid/auto-fit, semantic zoom, auto-box on canvas drop, piles only if cheap (defer otherwise), type-anywhere search only if cheap.
- Tree is vertical stacked lists over identical group data, never a second store. Kanban retired.
- SQL groups table (id, title, bounds, activeGroupId) + group_id on tab rows; canvas reads/writes via the single chrome-side writer path (Theia side must not open profile SQLite — second-writer gate goes red by design; route through existing readonly query API + writer extension point).
- Thumbnails: PNG last-view snapshots (tab-sql-substrate.md) — recognizable cards without live capture.
- Sketch 002 organising view is the visual reference; sketch-findings skill auto-loads.
- 14-02/14-03 organising placeholder slot is replaced by the real canvas in browsing/organising modes.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

Known anchors: `theia/extensions/modes/` (mode-service, setups-service, organising-placeholder-widget.ts to replace, modes.css layer), `theia/extensions/chrome-bar/` (commands/widget), v1.2 writer + readonly TabQueryService/searchByPrefix RPC, `theia/extensions/tab-uris` (uriOf identity).

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
