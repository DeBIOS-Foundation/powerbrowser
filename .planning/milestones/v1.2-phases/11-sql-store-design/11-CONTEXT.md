# Phase 11: SQL Store Design - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The store's authority rules and schema are written down and reviewed before any store code exists

Requirements: SQL-02, SQL-03

Success criteria:
1. Authority/invariant table exists stating single chrome-side writer, sessionstore authoritative for restore, registry URIs as join key, Theia backend never opening profile SQLite, own-file rule — reviewed and signed before schema work
2. Schema + migration plan exists showing tabs table on URI primary key, schema_version/user_version from day one, forward-only migrations exercised against fixture DBs, quarantine-not-delete corruption path, private-tab exclusion rule, fixed tabs.sqlite filename as platform content (not manifest) — reviewed and signed
3. SQLite only engine per .planning/research/duckdb-vs-sqlite/VERDICT.md; no DuckDB surface, no [features]/[sql] manifest flag (ARCHITECTURE.md Anti-Pattern 6), no GUI surface

Depends on: Phase 10. No GUI work. Design only — no store code exists after this phase.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop — verification deferred until roadmap fully executed; plan-phase with --no-reversibility-gates; audit gaps accepted; halt only on blocker surviving 3 retries.

Engine decided: SQLite. Gecko Sqlite.sys.mjs writes; Theia backend reads dedicated file only via better-sqlite3@13.0.3 (readonly: true); node:sqlite revisit at next Node re-pin.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

Key touchpoints: powerbrowser/shell/PowerBrowserAPI.sys.mjs (sole boundary), powerbrowser/INTERNAL-APIS.md catalogue, @powerbrowser/tab-uris TabUriRegistry (URI join key, GUI-04 bridge shape asserted by scripts/verify-registry-shape.mjs), theia/extensions/tab-uris, scripts/verify-platform.sh registry.

Prior: Phase 10 closeout (record/live evidence), v1.1 Phases 08/09.

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
