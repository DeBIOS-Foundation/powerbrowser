# SQL tab-store authority and invariants (SQL-02)

Scope: the tab store added in Phase 12. Sessionstore stays the restore
authority throughout; the store is an additive projection beside it.
Design only — no store code exists in this phase.

## Invariants

One row = one invariant + where Phase 12 enforces it + why.

| # | Invariant | Enforced where (Phase 12) | Why / threat if violated |
|---|---|---|---|
| 1 | Single chrome-side writer. Every tab write flows `tab event → PowerBrowserAPI.sys.mjs method → Sqlite.sys.mjs → tabs.sqlite`. The `Sqlite` lazy-getter lands in the existing lazy-getter block inside the sole boundary file `powerbrowser/shell/PowerBrowserAPI.sys.mjs`; the boundary guard excludes that file by basename, so its forbidden-pattern list needs zero changes, and each new writer wrapper gains one catalogue row in `powerbrowser/INTERNAL-APIS.md`. No other process, test helper, or migration path opens the file read-write — no exceptions. | Phase 12 negative scan: no profile-database opens outside `powerbrowser/shell/`; `internals-catalogue` fails on any uncatalogued writer touchpoint. | WAL coordination defeated by a second writer is repeatable profile-database corruption (shared-profile precedent). One writer is the single enforcement point the whole design funnels through (T-11-01). |
| 2 | Sessionstore authoritative for restore. The store never sources a restart: reopen reads sessionstore, exactly as today. The store is a projection of live tabs, never the restore source; the corruption procedure rebuilds live rows FROM sessionstore plus the registry, never the reverse. | Phase 12 roundtrip gate: URI → row → restart → reopen asserts the restored set equals sessionstore, with the store agreeing. | Letting the newer, faster, queryable store become restore authority by gravity removes the rebuild source; the first corruption then has nothing to rebuild from (T-11-05 adjacent; Pitfall 3). |
| 3 | Registry URIs as opaque TEXT join key. The row key is the canonical opaque `scheme:path` emission (never the `scheme://authority` serialization, which lower-cases and forks identity). Chrome binds the string as a statement parameter and never parses it. Zero `TabUriRegistry` shape change: the frozen export plus four public members stay exactly as `scripts/verify-registry-shape.mjs` asserts; the Phase 12 query surface lives beside the registry, never as new public members on it. | `gui04-registry-shape` stays green by construction; any deliberate contract change edits the expectation in the same commit, never smuggled inside store work. | A second identity scheme is a second source of truth; parsing chrome-side reintroduces the lower-casing fork the opaque form exists to prevent. The bridge contract (GUI-04) must stay landable without rework. |
| 4 | Backend never opens profile database files. The Theia backend holds a readonly handle on the dedicated store file only. Reads of history, bookmarks, and session state stay chrome-side behind existing platform read paths; the backend never opens those profile databases, readonly included — a readonly open still participates in shared-state checkpointing, so "readonly so safe" is false. | Phase 12 negative scan covers all profile-database opens (same scan as row 1); backend open call is reviewed for the readonly flag at review time. | A backend open of an upstream-owned database couples tab reads to bookmark/history checkpointing and widens the blast radius of any backend file-handle bug to data the store does not own (T-11-04). |
| 5 | Own-file rule. Tabs live in one dedicated file, `tabs.sqlite`, opened profile-directory-relative, and nowhere else. No tab tables are ever added to the upstream-owned history/bookmark database: every platform rebase may migrate that schema under foreign tables. Blast radius of any tab-store bug is tabs only. | Schema review in plan 11-02 asserts the DDL targets the dedicated file; the platform-content paragraph below makes the filename unparameterizable. | Hosting tab tables inside an upstream-owned file couples tabs to another subsystem's migrations and checkpointing (Pitfall 2). |
| 6 | Launch token never in SQL. Tab rows carry tab content only (URI key, page address, title, activity bookkeeping — column set pinned in plan 11-02). No credential, session token, or secret is ever written to any store table, including by reflection of page content. Secrets stay in the existing diagnostics separation: named there, never persisted here. | Schema review rejects any credential-shaped column; Phase 12 write-path review confirms bound parameters carry tab fields only. | A token reflected into a row turns every read path into a disclosure path and persists a secret in a file whose readers were sized for tab content (T-11-03). |

## Deliberately not replaced

| Thing left alone | Reason |
|---|---|
| Sessionstore as restore authority (D-107/D-108 voice) | Phase 11 adds no persistence of its own and no dependence on the session store module; naming it here, un-touched, keeps the storage ground clean — the store rebuilds FROM it and never replaces it. |
| Upstream-owned history/bookmark database schema | Not a host for tab tables (row 5); read exposure, if ever needed, goes through platform read paths chrome-side (row 4), never raw writes. |
| `TabUriRegistry` exported shape | Frozen bridge contract (row 3); consumed as opaque strings, never extended. |

## Consistency

Each invariant names its Phase 12 enforcement above so doc and gates cannot
drift apart: row 1 → second-writer negative scan plus catalogue rows;
row 2 → restart roundtrip gate; row 3 → registry-shape check green by
construction; row 4 → profile-database-open negative scan plus readonly-open
review; row 5 → schema review against the dedicated file; row 6 → schema and
write-path review for credential absence. Any Phase 12 check specified from
these rows lands as a `verify-platform.sh` registry row with a self-test that
plants faults in both directions — never a sibling driver, never a hand-kept
expectation list.

Engine: SQLite only, per the unanimous engine verdict in
`.planning/research/duckdb-vs-sqlite/VERDICT.md`. The chrome writer uses the
in-tree `Sqlite.sys.mjs` module; the Theia backend reads the dedicated file
only through `better-sqlite3@13.0.3` opened readonly. No second engine
surface exists in this design.

Platform content, not configuration: the filename `tabs.sqlite` and the
schema version (starting at 1, forward-only) are fixed platform content.
They are never manifest keys, never per-downstream settings, and never
feature flags — a downstream changing platform behavior needs an extension
point, not a flag.

No GUI surface: this authority table authorizes no window, no strip, no
toolbar, no address bar, no menu, and no user-facing string of any kind.
