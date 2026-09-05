# Pitfalls / Corruption Record: DuckDB vs SQLite for the Tab Store

**Question:** Should the tab-store engine be DuckDB instead of the decided SQLite?
**Researched:** 2026-09-05
**Verdict: SQLite. Do not adopt DuckDB for the tab store.**
**Confidence:** HIGH (multi-process prohibition + format-stability asymmetry rest on official vendor docs; corruption record cross-checked across official docs + multiple GitHub issues; perf numbers MEDIUM, single-sourced via secondary benchmarks)

---

## 1. SQLite side: known precedents and how the decided design answers them

The SQLite corruption precedents are already documented in PITFALLS.md Pitfall 8 and are **design-matched, not open risks** — every one of them is produced by violating the invariant the project already decided:

| Precedent | What happened | Decided answer |
|---|---|---|
| Two processes, one profile's `*.sqlite`, no shared lock coordination → repeatable `places.sqlite` corruption (SQLite forum, 2026-05: bwrap-sandboxed Firefox+Thunderbird sharing `$HOME`; WAL/`-shm` coordination + Firefox profile lock both defeated) | Cross-process WAL writers without coordination | **Single chrome-side writer.** All SQL goes through `PowerBrowserAPI.sys.mjs` → `Sqlite.sys.mjs`. Theia never opens profile SQLite read-write (PITFALLS.md Pitfall 8). One writer is exactly the model SQLite's locking was built for. |
| Even readers are hazardous under WAL (readers participate in `-shm` checkpoint coordination) — "read-only, so it's safe" is false | Theia-side readonly opens of `places.sqlite` | **Own `tabs.sqlite`** (own WAL, own `-shm`), never tables in `places.sqlite`. Blast radius of any tab-store bug is tabs only; bookmarks/history checkpointing stays decoupled. |
| Gecko-internal: concurrent `Sqlite.jsm` transactions throw without a queue (Bug 1090961); exclusive locking rejected for WAL (Bug 627936); forced checkpoints deadlock across sync/async split (Bug 1359887); stuck `-wal` → silent write failures (Bug 2040253) | Intra-process misuse | Reuse `Sqlite.sys.mjs` — the wrapper every first-party consumer already sits on, with the transaction queue already in it. No new storage plumbing. |
| Co-resident profiles (stock Firefox / Sourcerer alongside Power Browser) | Interleaved writes to shared files | Separate product profile dir (Pitfall 2, identity freeze) **plus** separate file — two independent layers before any shared byte. |

SQLite's structural advantages behind those answers:

- **File-format guarantee, in writing, since 2004.** Newer versions can always read/write files back to 3.0.0 (2004-06-18); forward compat holds unless newer features are used; developers promise compatibility through 2050; US Library of Congress lists it for preservation ([formatchng](https://sqlite.org/formatchng.html), [lts](https://www.sqlite.org/lts.html), [onefile](https://www.sqlite.org/onefile.html)). A profile's `tabs.sqlite` written by browser N is readable by browser N+5 **and** N−1. Downgrades are safe.
- **Recovery is a 20-year-old exercised path, already specified for this project:** `PRAGMA user_version` + forward-only migrations, startup `integrity_check`, degraded mode, quarantine (`tabs.sqlite.corrupt`), rebuild from sessionstore + registry (Pitfall 15). Places has run exactly this loop in the wild.
- **Zero new native surface in Gecko.** SQLite is already compiled into the tree; `Sqlite.sys.mjs` is already the wrapper; the Theia-side reader (`better-sqlite3`, readonly, on the dedicated file) is already decided and reconciled with Pitfall 8 (SUMMARY.md §Stack reconciliation).

## 2. DuckDB side: verified record

### 2a. Multi-process access — a hard prohibition, and it kills the sanctioned architecture

Official docs ([concurrency](https://duckdb.org/docs/current/connect/concurrency)): exactly two modes — **one process reads+writes, or multiple processes read while nobody writes.** Maintainer statement, verbatim: *"It is not possible to have a read-write connection and a read-only connection connected to the same database file across multiple processes"* ([Discussion #5946](https://github.com/duckdb/duckdb/discussions/5946); root issue [#77](https://github.com/duckdb/duckdb/issues/77); confirmed again in [#2192](https://github.com/duckdb/duckdb/issues/2192)).

Why it can't be worked around cheaply: DuckDB caches catalog, function pointers, and data pages in-process RAM for OLAP speed; a writer checkpointing while another process's long-lived reader holds file references produces undefined behavior ([issue #77 discussion](https://github.com/duckdb/duckdb/issues/77)). SQLite avoids this by deliberately *not* caching across queries — the exact tradeoff DuckDB refused to make. The only sanctioned multi-process-write paths are the Quack remote protocol (**beta** as of v1.5.2, "expected to become mature by v2.0 in fall 2026") or DuckLake + a PostgreSQL catalog — i.e. **a server, negating the entire embedded premise**.

**Direct collision with the decided design:** the sanctioned architecture is chrome-side single writer (Gecko process) + Theia-backend readonly reader (separate Node process) on the dedicated file. Under DuckDB that combination **fails at open with `Could not set lock on file …: Resource temporarily unavailable`**. Adopting DuckDB forces one of: (a) route all reads through the writer over IPC — a new protocol to design, guard, and rebase, undoing the "reads are cheap" property the query API depends on; (b) open/close per query with retry loops — application-level lock choreography the docs explicitly push onto adopters, fragile across crashes (stale-lock/missed-reader races); (c) snapshot/export replication — a second copy of the data with its own staleness and failure modes. Each option is more machinery than the whole SQLite design it replaces.

### 2b. Crash-safety record — WAL replay failures that brick the file

DuckDB's own troubleshooting doc frames WAL replay + checkpoint as the crash-recovery path ([crashes](https://duckdb.org/docs/lts/guides/troubleshooting/crashes.html)). The issue record shows that path failing in ways that render the file **unopenable**:

| Report | Failure | Status / severity |
|---|---|---|
| [#22044](https://github.com/duckdb/duckdb/issues/22044) (2026-04) + siblings #18259, #19712, #20543 | Ungraceful shutdown with uncheckpointed DDL (`DROP INDEX`, `ALTER TABLE`) in WAL → `INTERNAL Error` on replay → file unreadable. A family of four, same pattern, across releases. | Pattern acknowledged; fix proposals per-issue, not a structural replay hardening |
| [#22124](https://github.com/duckdb/duckdb/issues/22124) (2026-04) | DML+DDL in one transaction, SIGKILL before checkpoint → reopen fails (`ReplayUseTable` internal/catalog error); root cause is commit-flush name serialization vs replay ordering | Fix PR referenced; still: crash-during-normal-use → unopenable file |
| [#19099](https://github.com/duckdb/duckdb/issues/19099) (2025-09) | Torn WAL flush (filesystem page-cache gaps) fails checksum → `throw`, DuckDB **fails to start**; no skip-and-salvage path | Open report: fail-closed on partial WAL = availability failure |
| [#24767](https://github.com/duckdb/duckdb/issues/24767) (2026-08, v1.5.2 → main) | Crash mid-checkpoint → every subsequent read-write open on **Windows** fails (`Could not move file: Access is denied`, stale handle across the recovery rename) → **permanent crash loop until manual file surgery**; reporter cites a 25-hour production outage | Windows is a PKG-01 target platform. POSIX `rename` masks it on dev machines — a second-machine failure by definition |
| [#21067](https://github.com/duckdb/duckdb/pull/21067) → revert [#21285](https://github.com/duckdb/duckdb/pull/21285) (2026-02/03) | Optimistic-write blocks freed by concurrent drop → WAL replay decompression failure (corruption); first fix caused block leaks, was reverted for a simpler fix the author notes is only correct **because** table-drops-during-checkpoint are currently disallowed | Recovery machinery still co-evolving with the checkpoint-concurrency work ([PR #20052](https://github.com/duckdb/duckdb/pull/20052) concurrent-checkpoint project) |

Pattern, not anecdote: the WAL/replay/checkpoint subsystem is under active redesign (concurrent checkpoints, pinned commits, checkpoint-WAL three-file dance). Bugs here fail **closed-and-total** (file won't open) rather than partial-and-detectable.

### 2c. Format compatibility — young guarantee, downgrade-hostile

- Backward compatibility exists only **since v0.10 (Feb 2024)**; everything before it is explicitly unreadable ([storage](https://duckdb.org/docs/current/internals/storage.html), [0.10.0 announcement](https://duckdb.org/2024/02/13/announcing-duckdb-0100.html)). Two years of guarantee vs SQLite's twenty-two.
- Forward compatibility is **best-effort, explicitly breakable** ("may be (partially) broken on occasion"). `STORAGE_VERSION` / `storage_compatibility_version` opt-ins create files older versions cannot open ([1.2.0 announcement](https://duckdb.org/2025/02/05/announcing-duckdb-120.html), [PR #12110](https://github.com/duckdb/duckdb/pull/12110)).
- Migration requires **both old and new binaries** (`EXPORT DATABASE` with the old, `IMPORT DATABASE` with the new). A browser auto-updater ships one engine; there is no in-product migration path if a DuckDB rev ever bumps the default storage version (defaults are currently pinned to v1.0.0 for v1.0–v1.5 — stable *so far*, a policy, not a promise).
- Downgrade scenario (user rolls browser back after a DuckDB rev): profile's `tabs.db` potentially **unreadable with no recovery except deletion** — indistinguishable from data loss to the user, and invisible in single-version testing.

### 2d. Maturity inside a host process someone else owns + the Node sidecar

- **No Gecko-embedding precedent found; DuckDB is a second engine, not a swap.** SQLite is compiled into Gecko with a profile-aware, crash-integrated wrapper. Embedding DuckDB means a large new C++ native dependency, new patch-surface/build wiring (hook-only-patches rule, Pitfall 10), and a second SQL dialect in the tree — for a store whose queries are point lookups by URI.
- **Node bindings are young and incomplete.** The Neo client (`@duckdb/node-api`, C-API-based) dates to Dec 2024 ([announcement](https://duckdb.org/2024/12/18/duckdb-node-neo-client.html)); roadmap gaps include MAP/UNION binding, UDFs, Arrow APIs; `windows_arm64` unsupported ([client docs](https://duckdb.org/docs/current/clients/node_neo/overview.html)); multiple instances in one process must not attach the same DB without the instance cache ([README](https://github.com/duckdb/duckdb-node-neo/blob/main/api/pkgs/@duckdb/node-api/README.md)); bundler friction is real — webpack/vite refuse `.node` files without externals/alias config ([issue #231](https://github.com/duckdb/duckdb-node-neo/issues/231)) — and Theia extensions bundle via webpack, so this cost lands directly in the sidecar build.
- **Wrong workload shape.** The tab store is OLTP: frequent small indexed writes (tab switch, title/favicon update, open/close) on a tiny row count. DuckDB is columnar OLAP; secondary benchmarks put SQLite **10×–500× faster on write-intensive transactional patterns** ([architectural analysis](https://thinhdanggroup.github.io/duckdb/)); DuckDB single-row writes each carry MVCC/undo + eventual checkpoint cost, and concurrent edits to one row **fail the loser with a conflict error** (optimistic concurrency, [concurrency docs](https://duckdb.org/docs/current/connect/concurrency)) — semantics a tab write-through path would have to absorb for zero benefit. The honest pro-DuckDB case (analytical joins across tabs ⋈ history) runs over result sets small enough to join in memory; it never justified an engine.

## 3. Risk table

| # | Risk | Engine | Severity | Basis |
|---|---|---|---|---|
| 1 | RW writer (Gecko) + RO reader (Theia Node) on one file **cannot open** — sanctioned architecture impossible as drawn | DuckDB | **CRITICAL — disqualifying** | Official concurrency docs + maintainer statements ([#5946](https://github.com/duckdb/duckdb/discussions/5946), [#77](https://github.com/duckdb/duckdb/issues/77), [#2192](https://github.com/duckdb/duckdb/issues/2192)). HIGH confidence |
| 2 | Crash → WAL-replay failure → whole file unopenable (DDL-in-WAL family, torn-WAL fail-closed, optimistic-write block reuse) | DuckDB | **HIGH** | [#22044](https://github.com/duckdb/duckdb/issues/22044) + 3 siblings, [#22124](https://github.com/duckdb/duckdb/issues/22124), [#19099](https://github.com/duckdb/duckdb/issues/19099), [#21067](https://github.com/duckdb/duckdb/pull/21067)/[#21285](https://github.com/duckdb/duckdb/pull/21285). MEDIUM-HIGH (issue record is selection-biased, but 4+ independent replay-brick reports in 12 months is a pattern) |
| 3 | Crash mid-checkpoint → **permanent crash loop on Windows** until manual file surgery | DuckDB | **HIGH** | [#24767](https://github.com/duckdb/duckdb/issues/24767); Windows is a PKG-01 ship target; POSIX dev machines never reproduce it. MEDIUM-HIGH |
| 4 | Engine rev → storage-version bump → downgraded/older browser builds can't open `tabs.db`; only migration path needs both binaries | DuckDB | **MEDIUM** (latent; bites on first rev-with-bump) | [storage docs](https://duckdb.org/docs/current/internals/storage.html); guarantee only 2 years old (v0.10, 2024-02). HIGH on mechanism, MEDIUM on timing |
| 5 | Second native engine in Gecko: build wiring, patch surface, rebase debt, no precedent | DuckDB | **MEDIUM** | No Gecko-embedding precedent found (LOW — absence of evidence, but cost direction is certain under Pitfall 10) |
| 6 | Node Neo bindings immature: missing APIs, no win-arm64, webpack externals friction in Theia build, instance-cache footgun | DuckDB | **MEDIUM** | [Neo announcement](https://duckdb.org/2024/12/18/duckdb-node-neo-client.html), [client docs](https://duckdb.org/docs/current/clients/node_neo/overview.html), [issue #231](https://github.com/duckdb/duckdb-node-neo/issues/231). HIGH |
| 7 | OLTP write pattern on an OLAP engine: 10–500× slower small writes, checkpoint cost, MVCC conflict errors on hot rows | DuckDB | **MEDIUM** | Secondary benchmarks ([analysis](https://thinhdanggroup.github.io/duckdb/)). MEDIUM (single-sourced numbers; direction undisputed — DuckDB/MotherDuck docs agree it is not for high-concurrency point writes) |
| 8 | Second writer corrupts profile DBs (WAL/`-shm` + profile-lock defeat) | SQLite | **HIGH if invariant violated / NEUTRALIZED as decided** | Already PITFALLS.md Pitfall 8; answered by single-writer + own-file + static scan + soak test |
| 9 | Format unreadable after upgrade/downgrade | SQLite | **LOW** | Written guarantee to 2050, stable since 2004 ([formatchng](https://sqlite.org/formatchng.html)). HIGH |
| 10 | Small-write throughput / main-thread jank at tab-hoarder scale | SQLite | **LOW-MEDIUM** | Known shape (sessionstore `TabStateFlusher` precedent); batch + write-behind already prescribed (PITFALLS.md Performance Traps). MEDIUM |

## 4. Degradation comparison: which engine fails better

| Dimension | SQLite (decided) | DuckDB |
|---|---|---|
| Failure granularity | Partial: page-level damage detected by `integrity_check`; healthy rows usually salvageable | Total: observed failure mode is `open()` throws during WAL replay — **all** rows (live tabs + closed-tab retention) unavailable until repaired |
| Detection | Startup `integrity_check`, already in the plan (Pitfall 15) | Open-time exception — detectable, but only by attempting open and catching; torn-WAL checksum throw is indistinguishable from real corruption without forensics |
| Recovery path | Quarantine (`tabs.sqlite.corrupt`) → rebuild from sessionstore (restore authority) + registry; Places has run this loop for decades | Same rebuild is *possible* (sessionstore is engine-independent), but recovery also requires handling three-file WAL states (`.wal`, `.wal.checkpoint`, `.wal.recovery`) and version-mismatch states SQLite never produces |
| Worst case on Windows crash | Stuck `-wal` → integrity failure → quarantine + rebuild; bookmarks untouched (separate file) | [#24767](https://github.com/duckdb/duckdb/issues/24767): deterministic crash loop needing manual file surgery — the one failure mode no automatic degraded path survives without bespoke code |
| Failure that loses user data | Corruption escaping `integrity_check` **and** sessionstore disagreeing (double failure; sessionstore is restore authority anyway, so live tabs survive) | WAL-replay brick **plus** any gap in sessionstore coverage (closed-tab retention lives only in the DB) — closed-tab history is the data class DuckDB's failure mode actually destroys |

SQLite degrades better on every axis that matters here: failures are partial and detectable with a decades-old tool, recovery reuses the sessionstore authority already declared in Pitfall 9, and no failure mode observed for SQLite turns a crash into a platform-specific restart loop.

## 5. Pitfalls verdict

- **Keep the decided SQLite design unchanged**: own `tabs.sqlite`, single chrome-side writer via `Sqlite.sys.mjs` behind `PowerBrowserAPI.sys.mjs`, Theia readonly reader, `user_version` migrations, `integrity_check` + quarantine + sessionstore rebuild, sessionstore stays restore authority. The SQLite corruption precedents (Pitfalls 8, 11/14-separation, 15) are answered by construction, not by hope.
- **Reject DuckDB for the tab store.** Risk 1 alone is disqualifying — the engine forbids the process topology the project already ratified. Risks 2–4 make it worse: a younger, still-churning crash-recovery subsystem whose failures are total, on a format guarantee two years old, with a downgrade path that ends in deletion.
- **Narrow carve-out, not now:** if a future milestone wants heavy analytical queries over history/bookmarks/tabs (aggregations over 10k+ rows), the evidence supports DuckDB as a **read-side accelerator over exported Parquet/snapshots** (the pattern DuckDB's own team recommends in [#2192](https://github.com/duckdb/duckdb/issues/2192): transactional writes in SQLite/Postgres, DuckDB for periodic analytical reads) — never as the system of record, never on the live profile file. Revisit only with: multi-process story resolved upstream, 5+ years of storage-format stability, and a workload that actually scans.
- **No change to the Phase 10 research flag:** storage-API choice (which Gecko interface hosts tab rows) remains the HIGH-priority question; this verdict removes "which engine" from it — the engine is SQLite, the question is only which wrapper/layer.
