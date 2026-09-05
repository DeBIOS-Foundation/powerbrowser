# WORKLOAD FIT: DuckDB vs SQLite for the Power Browser Tab Store

**Question:** Should the tab-store engine be DuckDB instead of the decided SQLite?
**Dimension:** Workload fit only (OLTP tab workload vs OLAP engine; concurrency; crash recovery).
**Decided context challenged:** own `tabs.sqlite` in profile dir; single chrome-side writer, Theia backend readonly reader; registry URIs as PK; sessionstore stays restore authority.
**Researched:** 2026-09-05
**Verdict: SQLite. Keep the decided design. Do not switch to DuckDB.**
**Confidence:** HIGH for the verdict direction (convergent official-docs evidence); MEDIUM on exact latency/throughput ratios (benchmarks vary by hardware/version — ranges given, not single numbers).

> Confidence note: `gsd_run query classify-confidence` grades all web/fetch transport as LOW by transport alone (verified 2026-09-05: `--provider websearch` → LOW, `--provider docs --verified` → LOW). This repo's established convention (FEATURES.md §Source Confidence, PITFALLS.md header) treats **verbatim canonical docs** (duckdb.org, sqlite.org) as high practical reliability despite the transport grade. That convention is followed below: every load-bearing claim cites the canonical page it was read from.

---

## 1. Workload-shape table: what the tab store actually does vs what each engine is built for

| Workload trait | Tab-store reality | SQLite fit | DuckDB fit |
|---|---|---|---|
| Operation mix | Single-row upserts on tab open/close/navigation/activate; point lookups by registry-URI PK; small cross-surface joins (tabs ⋈ history ⋈ bookmarks on URL) | **Native.** B-tree row store: insert/update/retrieve of one complete record touches one row. Iterator (row-at-a-time) execution is lightweight at this scale | **Mismatch.** Columnar row-group segments + vectorized 2048-row batches: pays column-assembly cost on every single-row write/read, amortized only over bulk scans |
| Table size | Human-scale: tens to low hundreds of live rows; bounded closed-tab retention (hundreds–low thousands; 10k-row fixture is the stress case per PITFALLS.md Performance Traps) | Entire working set fits in page cache; B-tree seek ~0.01 ms class; `integrity_check` cheap | Columnar advantages (compression, zone-map skipping, parallel scan) need millions of rows to matter; at hundreds of rows they are pure overhead |
| Point-lookup latency (PK) | Hot path: "where is my `terminal:build` tab", URI→row on every switch | **~0.01 ms class** (B-tree seek; systems-explained comparison). Row-store tax is zero when you want the whole row | **~0.1–0.4 ms class, ~8–10× slower**: 0.224 ms with ART index / 0.422 ms without on 50M-row bench (Datapace, DuckDB 1.4.5); ~0.1 ms vs ~0.01 ms in the SQLite-vs-DuckDB systems comparison. ART + zone maps are scan accelerators, not B-tree replacements |
| Single-row write rate | Bursty human rate: tab open/close/activate storms (100+ tabs, rapid switching per PITFALLS.md); write-behind/batched via `TabStateFlusher`-class throttling, but granularity stays row-at-a-time | **~30–40k naive inserts/s; ~400k rows/s in WAL mode with transactions** (marending.dev measurement; systems-explained figure). WAL append is O(row) | **~4k naive inserts/s** (marending.dev) — **an order of magnitude slower**; 1M single-row inserts 12.5 s (SQLite) vs 145.8 s (DuckDB) in the duckdblab bench (~11×). Causes: per-transaction open/commit overhead × WAL-flush-per-commit × in-memory structure churn. Bulk path (`COPY` / batched `INSERT ... SELECT` / Appender API, ≥1,000-row batches) is fast — but the tab workload cannot produce 1,000-row batches without inventing a buffering layer that adds crash-loss surface |
| Read projections (bookmarks/history) | Places stays upstream-owned; we expose reads (views/query helpers), never rebuild. Sessionstore is decoded + projected, never replaced | Reads of `moz_places`/`moz_bookmarks` are PK/range lookups — same OLTP shape | DuckDB's `sqlite` extension can *query* SQLite files analytically — which concedes the point: the sanctioned hybrid pattern in DuckDB's own docs is **"do multi-process transactions on SQLite, use DuckDB's SQLite extension for periodic analytics"** (DuckDB concurrency docs). DuckDB as a *reader* of the SQLite store is the only shape its docs endorse |
| Analytical share | None in v1.1: no aggregations over millions of rows, no GROUP BY over history, no Parquet/CSV ingestion, no dashboards. Closed-tab "what did I close Tuesday" is a bounded recency query with a retention cap, not a warehouse scan | Full-table scans are slow (~60 s per 100M-row aggregation) — irrelevant at our row counts | 10–100× faster at 10–100M-row aggregations (2 s vs 60 s on 100M rows; 99 ms vs 4.5 s on filtered 5M-group rollup) — **capability with no consumer**. Paying OLTP latency on every tab event to buy scan speed for queries that never run |

**Write amplification, concretely:** a single-row tab upsert in a row store appends one WAL frame for one page. In a columnar store the row's fields scatter across per-column compressed segments; durability goes through DuckDB's WAL + background checkpoint that must fold WAL back into columnar row groups, and a large un-checkpointed WAL makes even *opening* the database slow (marending.dev observation; DuckDB docs prescribe periodic checkpointing). At tab-event frequency this is flush-per-commit overhead with zero compensating scan benefit.

**Bottom line of §1:** the workload is textbook OLTP at human scale; DuckDB is textbook OLAP. Every independent comparison surveyed (systems-explained, Datacamp, dev.to festival-project write-up, duckdblab benches, Datapace measurements) converges on the same sentence: *SQLite for transactions, DuckDB for analytics; single-row writes are a DuckDB anti-pattern.* The cross-surface joins (tabs ⋈ history ⋈ bookmarks) do not change this — they are small-N PK joins, the shape row stores win.

---

## 2. Concurrency comparison: one chrome-side writer + readonly Theia reader in a second process

This is the load-bearing section. The decided architecture is two **processes** (Gecko chrome + Theia Node backend), one writer, one reader, sharing one profile file.

| Property | SQLite (WAL mode) | DuckDB (native file format) |
|---|---|---|
| Cross-process writer + reader | **Supported and designed for it.** WAL mode: one writer appends to WAL while readers hold snapshot reads off the wal-index in shared memory (`-shm`). Snapshot isolation; readers never block the writer, writer never blocks readers (modulo documented `SQLITE_BUSY` edges). File locking coordinates processes | **Not supported.** Official docs (`duckdb.org/docs/current/connect/concurrency`): exactly two in-process modes — (1) *one process* reads+writes (multi-thread MVCC/optimistic concurrency *within that single process* only), or (2) *multiple processes* read with `access_mode='READ_ONLY'` **while nobody writes**. "Writing to DuckDB from multiple processes is not supported automatically and is not a primary design goal." Concurrent multi-process writes fail with `Could not set lock on file` (Discussion #4899, maintainer answer: "unlikely to be supported in the future" — shared WAL/blocks need out-of-scope coordination) |
| What "second-process reader while writer is active" requires | Works, with known care: shared `-shm`/`-wal` sidecars, same-machine only (no NFS), checkpoint-starvation awareness with a long-lived reader (reader gaps or explicit `wal_checkpoint`), `PERSIST_WAL` consideration for permission-asymmetric readers. This is exactly why Pitfall 8 bans even *readonly* opens of `places.sqlite` (WAL/`-shm` participation + Firefox exclusive-locking precedent) while sanctioning a **dedicated** `tabs.sqlite` with a readonly second handle + soak test | **Requires application-level mutual exclusion the engine does not provide:** cross-process mutex + open-write-close per operation with retry-on-lock, or a client-server shim. DuckDB's own docs warn open/close-per-write "is not optimized" for this use. Alternatives the docs name: Quack remote protocol (**beta in v1.5.2, stable-target v2.0 fall 2026** — not shippable substrate today), or DuckLake + PostgreSQL catalog (a second database server to coordinate an embedded file — absurd for a profile dir), or "do transactions in SQLite/Postgres and query via DuckDB extension" (i.e. keep SQLite) |
| Fit to decided roles | Exact match: chrome-side `Sqlite.sys.mjs` serializes writes (Gecko precedent: internal transaction queue per Bug 1090961); Theia `better-sqlite3` readonly handle observes snapshots. Soak + `integrity_check` verification already specified | **Disqualifying mismatch.** The decided topology (writer process A + reader process B, both attached, writer active) is the one topology DuckDB's native format forbids. Adopting DuckDB forces either (a) routing Theia reads through the chrome channel anyway (then DuckDB buys nothing over SQLite while adding a second engine), or (b) building a bespoke lock/retry IPC layer around every tab event (new corruption surface, contradicts Pitfall 8's "never a second writer" invariant in spirit — a second *opener* with a file lock is the same hazard class) |
| Threading model relevance | Gecko single-writer discipline maps 1:1 onto WAL's single-writer rule; no engine threads needed | DuckDB's strengths (morsel-driven multi-core parallelism, multi-thread MVCC appends) live *inside one process*. The tab store has no parallel-scan work to distribute and no multi-thread writer to coordinate — the parallelism is stranded while the missing capability (cross-process attach) is the one we need |

**Concurrency verdict:** SQLite WAL supports the decided topology natively; DuckDB's native format explicitly does not. The multi-process story DuckDB offers (Quack beta, DuckLake+Postgres) is heavier than the tab store itself and unshipped/unstable on our horizon. DuckDB's documentation literally prescribes SQLite as the transactional host with DuckDB as the periodic analytical reader — that hybrid pattern is available later *without* changing the store.

---

## 3. Crash-recovery comparison

| Property | SQLite | DuckDB |
|---|---|---|
| Durability mechanism | WAL + checkpoint. Crash mid-transaction → automatic rollback on next access; recovery is fully automatic, no user action (sqlite.org `howtocorrupt`). WAL-mode sync-failure analysis: a failed COMMIT loses durability but does not corrupt; only checkpoint-time sync failure can corrupt — hence checkpoint-infrequently guidance | WAL + checkpoint (MVCC versions folded on checkpoint). Large un-checkpointed WAL slows opens; checkpoint discipline is operator-visible in a way SQLite's is not at our scale |
| Corruption detection | `PRAGMA integrity_check` (full b-tree + index cross-verification) / `quick_check` (fast tripwire). Read-only open for checks; exact-`["ok"]` keying; quarantine-not-delete (`tabs.sqlite.corrupt` + sidecar removal + rebuild-from-sessionstore) — already specified in Pitfall 15 and SUMMARY.md §Phase 10 | `PRAGMA integrity_check` exists but the recovery story is WAL-replay + checkpoint, with file-lock-mediated recovery that returns `SQLITE_BUSY`-analogous lock errors to a third attacher during recovery (SQLite documents these edges precisely; DuckDB's multi-process recovery edges are less charted because multi-process is out of scope) |
| `user_version` / migration story | `PRAGMA user_version` + forward-only migrations against fixture DBs from each prior version — decades-stable mechanism, file-format bytes 18/19 contract, WAL format unchanged since 3.7.0 (2010). Places' `.corrupt`-rename-and-rebuild precedent is directly reusable | No `user_version` equivalent with the same stability contract; schema evolution rides the storage version (see next row) |
| File-format stability across versions | **25+ years; billions of deployments.** Format frozen; WAL-mode readable by every SQLite ≥ 3.7.0. A profile file written by ESR N opens under ESR N+1 without export/import. Known bug class (2026-03 WAL-reset race, fixed 3.51.3) is instructive: affected only concurrent multi-connection write-vs-checkpoint races — our single-writer discipline sidesteps it — and was patched with backports | **Stabilized June 2024 with v1.0; backward-compat only since v0.10 (Feb 2024).** Forward compat is explicitly best-effort and routinely breaks (v0.10→v0.9 forward-read already fails with views, indexes/PKs, or FLOAT/DOUBLE ALP compression — i.e. ordinary schema). Default on-disk version is 64 (v1.0); newer features require explicit `STORAGE_VERSION` opt-in that *raises the minimum reader version*; mismatch error is `Trying to read a database file with version number 65, but we can only read version 64` with remediation **EXPORT then IMPORT** (DuckDB storage docs). A profile-carried file would couple every DuckDB dependency bump to a potential export/import migration event across browser updates — the exact "second-month" failure class PITFALLS.md exists to prevent |
| Operational precedent in this tree | Firefox's entire profile (`places.sqlite`, `favicons.sqlite`, …) runs this machinery; `Sqlite.sys.mjs` is the in-tree, profile-dir-aware, WAL-capable writer with zero new deps | No in-tree precedent; would add a native dependency (or WASM bridge) with its own toolchain (node-gyp/prebuild surface the project already weighed for `better-sqlite3`), plus storage-version pinning discipline nobody owns |

**Recovery verdict:** SQLite's story (automatic WAL recovery + `integrity_check` + `user_version` + quarter-century format freeze) is the one Pitfall 15's mitigations were written against. DuckDB's format is four orders of magnitude younger in stability-years, its upgrade path is export/import on mismatch, and its forward-compat best-effort guarantee is incompatible with a file that must survive unattended browser updates.

---

## 4. MotherDuck / remote / extension ecosystem (relevance check)

**Not relevant to the embedded single-file profile use. Say so explicitly:**

- **MotherDuck (cloud):** requires network round-trips, an account/identity, and a third-party data custodian for the user's live tab list. Contradicts offline-first profile semantics, the endpoint-allowlist discipline (every new host is a review event per Pitfall 7's coupling rule), and the privacy posture (tab URIs leave the machine). Solves scale (TB/cloud sharing) we do not have.
- **Remote protocols (Quack):** beta, server-shaped — the opposite of an embedded profile file. See §2.
- **Extensions (`httpfs`, `postgres_scanner`, `sqlite`, Parquet/Arrow readers):** each is native surface + supply-chain pin + build-toolchain cost for capabilities with no consumer (§1: no Parquet ingestion, no S3, no DataFrame handoff in v1.1). The one relevant extension — `sqlite` — argues *against* migration: it exists so DuckDB can read SQLite files, i.e. the analytics-later path stays open with SQLite as the store.

---

## 5. Explicit workload verdict

**Keep SQLite. Reject DuckDB for the tab store.** The evidence challenges the decision and confirms it:

1. The workload (single-row upserts, URI-PK point lookups, human-scale rows, read projections) is the OLTP shape SQLite's B-tree row store is built for and the OLAP shape DuckDB's columnar vectorized engine is explicitly not built for — with measured single-row-write gaps of ~8–11× and point-lookup gaps of ~8–10× against SQLite.
2. The decided two-process topology (chrome writer + Theia readonly reader) is natively supported by SQLite WAL and explicitly unsupported by DuckDB's native format — disqualifying independent of performance.
3. The profile-file durability contract (automatic crash recovery, `integrity_check` + quarantine, `user_version` migrations, format stability across updates) is SQLite's home turf; DuckDB's storage format offers backward-only guarantees since 2024 with export/import remediation on mismatch.
4. Nothing DuckDB uniquely offers (bulk scan speed, MotherDuck, Parquet/extension ecosystem) has a consumer in v1.1, and the one future worth preserving (analytical queries over the store) is available via DuckDB's SQLite extension *without* migrating the store.

**Legitimate future re-entry (not now):** if a later milestone demonstrates a real analytical bottleneck (e.g. multi-thousand-row closed-tab retention analytics too slow under SQLite), add DuckDB as a read-side projector over `tabs.sqlite` via its SQLite extension — the hybrid pattern DuckDB's own docs prescribe. The store stays SQLite.

## Sources

Canonical (read verbatim; high practical reliability per repo convention):

- DuckDB concurrency (single-writer-process / readonly-multi-process modes; multi-process write unsupported; Quack beta; DuckLake+Postgres alternative; "do transactions on SQLite, query via DuckDB extension"): https://duckdb.org/docs/current/connect/concurrency.html
- DuckDB concurrent-write refusal (`Could not set lock on file`, maintainer: "unlikely to be supported"): https://github.com/duckdb/duckdb/discussions/4899
- DuckDB storage versions & format (backward since v0.10; forward best-effort; default v64; `STORAGE_VERSION` minimum-reader semantics; EXPORT/IMPORT remediation): https://duckdb.org/docs/current/internals/storage
- DuckDB 1.0 stability theme (format stabilized; SQL/C-API caution): https://duckdb.org/2024/06/03/announcing-duckdb-100
- DuckDB 0.10 compat limits (forward-read fails with views/indexes/ALP FLOAT/DOUBLE): https://duckdb.org/2024/02/13/announcing-duckdb-0100
- SQLite WAL (single writer + snapshot readers; wal-index/`-shm` same-machine; checkpoint starvation; `SQLITE_BUSY` edges incl. Firefox/Chrome exclusive-lock precedent): https://www.sqlite.org/wal.html
- SQLite corruption/recovery (automatic rollback; file-lock coordination; WAL-reset bug scope 3.7.0–3.51.2, fixed 3.51.3): https://sqlite.org/howtocorrupt.html
- SQLite isolation (serializable writes, snapshot isolation in WAL, `BEGIN IMMEDIATE`): https://www.sqlite.org/isolation.html

Benchmarks / secondary (MEDIUM — single-source numbers, convergent direction; use ranges, not point claims):

- Point-lookup 0.029 ms row-store vs 0.224 ms indexed / 0.422 ms unindexed DuckDB; 46× aggregation gap on same rows; co-location tail effects: https://datapace.ai/blog/oltp-vs-olap-vs-htap-measured
- Row vs columnar architecture, 0.01 ms vs 0.1 ms PK lookup, 400k vs 200k rows/s, 60 s vs 2 s scans: https://systeminternals.dev/duckdb/vs-sqlite/
- 4k vs 30–40k naive inserts/s; WAL-size slow-open; Appender/batch remedy: https://marending.dev/notes/sqlite-vs-duckdb/
- 1M single-row inserts 12.5 s vs 145.8 s; transaction/WAL-flush overhead analysis: https://duckdblab.org/en/post/duckdb-performance-myth/
- Festival-project write-up (1 ms vs 10–50 ms/insert; reader-blocking; hybrid SQLite-write + DuckDB-read pattern; decision flowchart): https://dev.to/soytuber/maybe-sqlite-is-still-better-than-duckdb-for-my-workloads-hli
- Datacamp comparison (OLTP vs OLAP framing; complementary-use recommendation): https://www.datacamp.com/blog/duckdb-vs-sqlite-complete-database-comparison
