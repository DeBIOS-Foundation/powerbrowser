# Verdict: SQLite — DuckDB rejected for the tab store

Decided 2026-09-05 by 4 parallel researchers (stack, workload, integration, pitfalls), unanimous, HIGH confidence. Full evidence in `01-STACK.md` … `04-PITFALLS.md`.

## Why SQLite

1. **Topology disqualifier (workload + pitfalls).** DuckDB natively forbids one RW process + reader processes sharing a file; our ratified topology is exactly chrome-writer + Theia-reader. SQLite WAL supports it.
2. **Wrong workload (workload).** Tab store is OLTP: single-row upserts, URI-PK point lookups, hundreds of rows. DuckDB is OLAP columnar: ~8–11x slower single-row writes, ~8–10x slower PK lookups. Its 10–15x edge applies only to 100MB+ scans, which nothing on the roadmap does.
3. **Zero-cost embedding (stack).** SQLite is already inside Gecko (`Sqlite.sys.mjs`/mozStorage): no new dep chrome-side. DuckDB means vendoring ~0.5M LOC into `third_party`, +39MB/installer, second jemalloc in-process, C++ API unstable until v2.0 — plus 40MB Node binaries at 1/10th better-sqlite3's adoption.
4. **Format stability (pitfalls + integration).** SQLite: 25-year format freeze, `user_version` migrations stable across ESR re-pins. DuckDB: format stabilized 2024, backward-only, storage revs per minor — each browser update risks a forced tab-file migration; downgrade is EXPORT/IMPORT. Its WAL-replay failures brick the whole file.

## Carve-out

DuckDB someday only as a read-side accelerator over exported snapshots — never the system of record. Analytics-later stays open via DuckDB's SQLite extension with no migration.

## Revisit trigger

Revisit only if the store's workload turns analytical (full-history search at scale is FTS5's job, not this) AND DuckDB's C++ API + storage format stabilize post-v2.0 AND the process-sharing restriction lifts.
