# Phase 12: SQL Store Build - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Tabs persist as SQL rows behind the platform boundary with read paths and green gates — no GUI surface

Requirements: SQL-01, SQL-04, SQL-05

Success criteria:
1. Every tab is a SQL row written only by chrome-side writer (Sqlite.sys.mjs behind PowerBrowserAPI.sys.mjs, sole boundary, new INTERNAL-APIS.md rows) into own tabs.sqlite in profile dir, sessionstore stays authoritative for restore, registry URIs are join key
2. Bookmarks/history exposed via Places APIs (never raw places writes), sessionstore read projection and query API on @powerbrowser/tab-uris answer reads, private tabs absent under emitter-exercising absence test
3. Store gates green: second-writer negative scan (no profile-DB opens outside powerbrowser/shell/), interleaved tab+bookmark write soak with PRAGMA integrity_check clean, URI→row→restart→reopen roundtrip on temp DB, registry-shape gate untouched, live ESR rebase drill over new touchpoints
4. Theia backend reads dedicated file only via better-sqlite3@13.0.3 (readonly: true); Theia core unpatched; no Gecko change outside patch stack

Depends on: Phase 11 (design reviewed before code — authority/AUTHORITY.md, schema/SCHEMA.md, MIGRATIONS.md, fixtures + 23/23 exercise).

No GUI surface. SQLite only.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, Phase 11 design docs, and codebase conventions.

Standing autonomous: nonstop, verification deferred, --no-reversibility-gates, halt only on 3x blocker.

Engine: SQLite. Gecko Sqlite.sys.mjs writes; Theia backend better-sqlite3@13.0.3 readonly.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

Phase 11 design outputs (must conform): .planning/phases/11-sql-store-design/authority/AUTHORITY.md, schema/SCHEMA.md, schema/MIGRATIONS.md (quarantine allocator N=max+1, WAL pin pre-BEGIN, rebuild in txn, CHECKs, downgrade refusal, readonly tripwire).

Touchpoints: powerbrowser/shell/ (writer home), PowerBrowserAPI.sys.mjs boundary, INTERNAL-APIS.md catalogue, @powerbrowser/tab-uris (query API + registry URIs), Places APIs, sessionstore, scripts/verify-platform.sh registry (4 new rows with --self-test per 11 handoff).

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP + Phase 11 design.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
