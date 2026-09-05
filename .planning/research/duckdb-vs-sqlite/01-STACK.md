# STACK Dimension: DuckDB vs SQLite Embedding Cost (Both Processes)

**Question:** Should the Power Browser tab store engine be DuckDB instead of the decided SQLite?
**Researched:** 2026-09-05
**Dimension verdict: SQLite — keep the decided stack. Do not adopt DuckDB.**
**Dimension confidence:** HIGH (every load-bearing claim is backed by DuckDB's own current docs; size/version numbers are from release artifacts dated within the last 6 weeks)

---

## 1. Both-Sides Cost Table

| Cost axis | SQLite (decided) | DuckDB (challenger) | Winner |
|---|---|---|---|
| **Gecko chrome-side writer API** | `Sqlite.sys.mjs`, in-tree at ESR 153, promise wrapper over mozStorage. Zero new deps, zero new build targets, profile-dir-aware, WAL-capable. **HIGH** | No JS-accessible binding exists in-tree. Must either (a) vendor the DuckDB C/C++ engine into the Gecko build and write a new XPIDL/JS bridge, or (b) shell out to a sidecar process. Both are new subsystems, not a storage swap. **HIGH** | SQLite |
| **Gecko build vendoring** | Already vendored: `third_party/sqlite3/` (amalgamation `sqlite3.c`/`sqlite3.h` + Mozilla-owned `moz.build` + `sqlite.symbols`), updated via `./mach vendor third_party/sqlite3/moz.yaml`. **HIGH** | New `third_party/duckdb/` vendor: DuckDB ships CMake, not `moz.build` — every DuckDB upgrade requires hand-translating build definitions, authoring `moz.yaml` + `moz.build` + symbol files from scratch, and carrying Mozilla-specific patches. DuckDB releases roughly monthly, so the pin rots ~10x faster than SQLite's slow-moving amalgamation. **HIGH** (vendoring mechanics per Firefox Source Docs; DuckDB release cadence per GitHub releases: 1.2.x→1.5.x in ~15 months) | SQLite |
| **Source mass vendored** | SQLite amalgamation: 2 files (`sqlite3.c` ~9 MB, `sqlite3.h`), single public-domain file pair Mozilla has carried for a decade. **HIGH** | DuckDB amalgamation (`duckdb.hpp` + `duckdb.cpp`) is ~**0.5M lines of code**, and DuckDB's own docs mark the amalgamation build **"best-effort, not officially supported"**. Vendoring half a million lines of best-effort CMake output into a `moz.build` tree is a standing porting liability. **HIGH** (duckdb.org building docs) | SQLite |
| **Static-link / binary size** | SQLite adds ~1 MB to libxul-class binaries; effectively invisible. **HIGH** | `libduckdb-linux-amd64.zip` alone is **39.3 MB compressed** (v1.5.4 release assets); unbundled static libs **exceed 100 MB** (stated as the reason for DuckDB PR #16655 splitting the bundle). Static-linking DuckDB into libxul grows every installer (Windows stub/full, MSIX, DMG) by tens of MB compressed. **HIGH** (release asset table, 2026) | SQLite |
| **Build-time delta** | Zero — SQLite already compiles in every Gecko build. **HIGH** | Full DuckDB source build is a **~10-minute-class compile on a fast desktop** (community report: 10 min on a 4-year-old MBP; needs CMake + C++11 toolchain, Ninja recommended). Every `./mach build` and every CI/tier-3 per-fixture build pays a large increment unless the object cache hits perfectly. **MEDIUM** (single community datapoint + official CMake/Ninja requirements; direction is certain, exact minutes on the reference host unverified) | SQLite |
| **Allocator / toolchain conflict** | None — mozStorage allocates through Gecko's own `mozjemalloc`/`mozglue` uniformly. **HIGH** | Real conflict surface. Firefox replaces the global allocator (`memory/build/replace_malloc`, `MOZ_MEMORY`, STL wrapping). DuckDB (a) vendors its **own jemalloc as a static `third_party` lib linked by default on Linux** (PR #22558, May 2026, first shipped in the 1.5.x line) with `duckdb_je_`-prefixed symbols, and (b) previously hit new/delete-override conflicts embedding into Python/Julia runtimes (PR #11891 discussion). Prefixed symbols avoid a hard link collision, but two jemalloc arenas in one process means duplicated allocator metadata, `about:memory` misattribution, and a second background-purge thread family inside the browser process. On Windows, Mozilla's own `mozmemory_wrap.cpp` documents `libc++`/`_aligned_malloc` symbol-pull-in conflicts — exactly the class of fight a second big C++ runtime invites. **MEDIUM** (mechanism documented both sides; no public report of DuckDB-inside-Firefox to cite) | SQLite |
| **C++ embedding API stability** | mozStorage/`Sqlite.sys.mjs` surface is versioned with the tree; ESR pins it for its lifetime. **HIGH** | DuckDB's **C++ API is explicitly declared internal and unstable**: "not guaranteed to be stable and can change without notice — use the C API" (current `clients/cpp` docs). The promised stable C ABI + thin C++ layer ships with **v2.0 (Oct 2026, currently alpha, "details may still shift")** — i.e. stability arrives one month *after* this decision and requires targeting a pre-release major with a **new storage format + breaking changes**. **HIGH** | SQLite |
| **Storage-format stability across ESR rebases** | SQLite file format is famously back-compat-stable; Firefox migrates `places.sqlite` with versioned migrators, and our own `tabs.sqlite` carries `user_version` under our control. **HIGH** | DuckDB v2.0 ships **a new default storage format** (Aug 2026 preview post). Adopting DuckDB now means either pinning pre-2.0 and forfeiting the stable ABI, or riding a format break during v1.2 with a file-migration story we would own. Either way the rebase drill gains a database-migration dimension SQLite never imposes. **HIGH** | SQLite |
| **Node backend reader** | `better-sqlite3@13.0.3`: N-API (works across Node versions), ~10.4M weekly downloads, ~9,800 dependents, small native addon bundling the SQLite amalgamation, prebuilds cover Node 22 (NODE_MODULE_VERSION 127), source fallback via the existing theia-shell node-gyp path. **HIGH** | `@duckdb/node-api@1.5.5-r.4` (2026-08-11, MIT): downloads **released libduckdb binaries (~40 MB)** instead of rebuilding — every `yarn install` and every packaging proof hauls a 40 MB blob. ~1.2M weekly downloads / ~236 dependents (an order of magnitude less battle-tested in Node than better-sqlite3). Old `duckdb` package is **deprecated, no 1.5.x releases**. Feature gaps on the Neo client roadmap (MAP/UNION append, UDFs, profiling, table-description APIs incomplete). Platform cover is good (linux x64/arm64 glibc+musl, darwin arm64/x64, win32 x64/arm64) but `windows_arm64` historically lagged. **HIGH** for versions/sizes (npm registry + duckdb.org install pages); **MEDIUM** for "40 MB per install hurts" (judgment, but arithmetic) | SQLite |
| **Cross-process access pattern (the actual design)** | Single chrome-side writer + readonly Node reader on the same file is SQLite WAL's home turf: one-writer/multiple-reader across processes is battle-tested and is what Firefox itself relies on for places-adjacent access. **HIGH** | DuckDB's documented in-process modes are (1) one process reads+writes, or (2) multiple processes read **while none writes**. Chrome-writes + Node-reads concurrently across two processes is **not a documented/supported pattern**; multi-process writes need the Quack remote protocol (**beta** in 1.5.x, "mature by v2.0") or DuckLake+Postgres (a server, not an embedded file). **MEDIUM-HIGH** (concurrency docs are explicit about the two modes; absence of mixed-mode support is a docs-absence claim, flagged honestly) | SQLite |
| **Workload fit (tab store)** | Row-store, point lookups, small transactional writes, PK-keyed reads — SQLite's exact design center. **HIGH** | Columnar vectorized OLAP engine: 10–15x faster on >100 MB aggregations, but **single-row INSERTs measurably slower than SQLite** and single-writer model bottlenecks on small concurrent writes (2026-07 benchmark: DuckDB wins load+aggregate 1.57s vs 21.87s, loses the transactional story). A tab store (dozens–hundreds of rows, PK lookups, per-navigation upserts) pays DuckDB's overhead and uses none of its throughput. **HIGH** | SQLite |
| **WASM alternative** | `sql.js`/SQLite WASM ~**400 KB gzipped** — but irrelevant: both consumers (Gecko, Node backend) are native and already load native modules. **MEDIUM** (Kanopy 2026-04 benchmark figures) | DuckDB WASM ~**2.8 MB gzipped** + extensions, slower cold start (150–300 ms), no polished IndexedDB persistence layer, weak single-row writes. Answers neither side: Gecko can't consume WASM-as-storage without a new bridge, Node doesn't need it. **MEDIUM** (same source) | Moot — native wins both sides |

---

## 2. Versions With Dates (verified 2026-09-05)

| Artifact | Version | Date | Source |
|---|---|---|---|
| DuckDB stable (engine + C++ API + libduckdb) | **1.5.5** | current stable per duckdb.org install pages | duckdb.org |
| DuckDB LTS | 1.4.5 | alongside 1.5.5 | duckdb.org install page |
| DuckDB v2.0 (new parser, new storage format, reworked C API, breaking changes) | alpha (`v2.0-cyanoptera` branched **2026-09-02**, GA projected Oct 2026) | 2026-08-17 preview + 2026-09-02 alpha post | duckdb.org blog |
| `@duckdb/node-api` (Neo client) | **1.5.5-r.4** | 2026-08-11 | npm registry |
| `duckdb` (legacy Node package) | deprecated; last line 1.4.x, **no 1.5.x releases planned** | deprecation notice live | GitHub duckdb/duckdb-node |
| `better-sqlite3` (decided) | **13.0.3** | 2026-08-05 | npm registry |
| SQLite in Firefox ESR line | 3.53.4 vendored (2026-07-24) | mozilla-central `third_party/sqlite3/moz.yaml` | searchfox / GitHub firefox mirror |

---

## 3. ESR Rebase: What Happens to Vendored DuckDB

1. **Upstream rebases never touch it** — `third_party/duckdb/` would be our directory; Mozilla has no DuckDB. The cost is not collision, it is **carriage**: every ESR rebase compiles and links our vendored half-million lines against a new compiler/flag baseline with zero upstream coverage.
2. **Every DuckDB upgrade is a manual re-vendor** (`./mach vendor` + `moz.build` re-translation + patch re-application), on DuckDB's monthly-ish cadence — versus SQLite's slow amalgamation Mozilla absorbs for us.
3. **The v1.5→v2.0 boundary forces a file migration** (new storage format) mid-milestone if we track stable, or strands us on a pre-stable-ABI line if we don't. SQLite imposes no equivalent event.
4. **Size tax compounds**: +tens of MB compressed on every installer artifact the rebase re-produces (NSIS/MSIX/DMG), re-verified per OS per rebase.

Net: DuckDB converts the existing "live rebase drill" from a patch-stack exercise into a patch-stack **plus allocator/build-system/database-migration** exercise. **Confidence: MEDIUM** (mechanics follow directly from the vendoring system + release history; no DuckDB-in-Firefox precedent exists to calibrate against).

---

## 4. Explicit Stack Verdict

**Keep SQLite. Reject DuckDB for the tab store — unanimously on cost, with zero compensating benefit for this workload.**

- The tab store (hundreds of rows, URI-PK point lookups, per-navigation single-row upserts, one chrome writer + one readonly Node reader) sits exactly on SQLite's design center and exactly off DuckDB's (columnar OLAP, single-writer-process, 40 MB engine).
- SQLite costs **zero new Gecko deps, zero new build targets, ~1 MB, and an already-vendored amalgamation**; DuckDB costs a new `third_party` port (~0.5M LOC, best-effort amalgamation, CMake→moz.build translation), **tens of MB per installer**, minutes per build, a second jemalloc in-process, an explicitly-unstable C++ API until a post-decision v2.0, and a storage-format break on the horizon.
- Node side is the same story at smaller scale: `better-sqlite3` (N-API, ~10M wk downloads) vs a Neo client that downloads 40 MB libduckdb binaries with ~1/10th the adoption and open roadmap gaps.
- The one honest DuckDB strength — 10–15x analytical scan throughput over 100 MB+ datasets — has no consumer in SQL-01 (no GUI, no reporting surface this milestone; cross-surface joins are bookmark/history-scale, not lake-scale). If a future analytics surface ever needs it, the correct shape is **DuckDB-as-read-replica over a SQLite/places export**, never DuckDB-as-system-of-record — and that is a v2+ research question, not a v1.2 engine swap.

**Revisit triggers (all must hold):** (a) DuckDB v2.0 stable ABI ships and soaks ≥1 ESR cycle; (b) a concrete analytical feature (not the tab store) needs >100 MB scan throughput in-process; (c) someone demonstrates mixed RW+RO cross-process access on one DuckDB file without Quack/server infra. Until then, this question is closed.

---

## 5. Confidence Per Claim

| Claim | Confidence | Basis |
|---|---|---|
| DuckDB C++ API unstable; C API recommended; stable ABI lands in v2.0 (Oct 2026) | HIGH | DuckDB's own current client docs + Aug 2026 preview post |
| Versions/dates table (1.5.5, node-api 1.5.5-r.4, legacy deprecation, SQLite 3.53.4) | HIGH | npm registry + duckdb.org install pages + mozilla-central moz.yaml, all read this session |
| Size figures (libduckdb 39.3 MB zip, statics >100 MB, WASM 2.8 MB vs 400 KB) | HIGH | v1.5.4 release asset table + PR #16655 + Kanopy 2026-04 benchmark |
| Amalgamation ~0.5M LOC, best-effort/unsupported | HIGH | duckdb.org building docs verbatim |
| Firefox vendoring mechanics (moz.yaml, mach vendor, sqlite precedent) | HIGH | Firefox Source Docs + sqlite moz.yaml + Bug 1855455 commit |
| Workload mismatch (OLAP vs OLTP, single-row INSERT slower) | HIGH | 2026-07 DuckDB-vs-SQLite benchmark + DuckDB concurrency docs |
| Node comparison (40 MB binary wrap, adoption gap, Neo roadmap gaps) | HIGH for facts, MEDIUM for "hurts" judgment | npm registry + node_neo docs |
| jemalloc-in-process conflict | MEDIUM | Both allocators' mechanics documented; no DuckDB-inside-Firefox precedent to cite |
| Cross-process RW+RO unsupported without Quack/DuckLake | MEDIUM-HIGH | Documented modes enumerated; mixed mode absent (docs-absence claim, flagged) |
| Build-time delta (~10-min class) | MEDIUM | One community datapoint + official toolchain requirements; exact host minutes unverified |
| ESR rebase carriage analysis | MEDIUM | Inference from vendoring system + cadence; no precedent exists |

---

## 6. Sources

- DuckDB C++ client docs (`duckdb.org/docs/current/clients/cpp.html`) — C++ API instability warning, 1.5.5 current
- DuckDB install pages (`duckdb.org/install/?environment=c…`) — 1.5.5 stable / 1.4.5 LTS
- "A Preview of DuckDB v2.0" (2026-08-17) + "Try DuckDB v2.0-alpha" (2026-09-02) — new parser/format/C API, breaking changes, Oct 2026 GA
- Node.js (Neo) client docs — 1.5.5, platform list, roadmap gaps
- npm registry: `@duckdb/node-api` 1.5.5-r.4 (2026-08-11, ~1.2M wk dl, 236 dependents); `better-sqlite3` 13.0.3 (2026-08-05, ~10.4M wk dl, ~9.8k dependents); v13 N-API release notes
- GitHub `duckdb/duckdb-node` — legacy package deprecation notice
- GitHub `duckdb/duckdb` releases v1.5.4 asset table — 39.3 MB libduckdb zip, 28.5 MB static-libs zip
- GitHub PR #16655 — bundled statics exceed 100 MB
- duckdb.org building docs — amalgamation ~0.5M LOC, best-effort/unsupported; CMake+C++11+Ninja requirements
- go-duckdb#38 — ~10-min source build datapoint
- GitHub PR #22558 + #11891 + `allocator_jemalloc.cpp` + jemalloc internals docs — jemalloc-in-core, new/delete conflicts, `duckdb_je_` prefixing
- Firefox Source Docs vendoring guide + `third_party/sqlite3/moz.yaml` + Bug 1855455 commit — mach vendor system, sqlite precedent (3.53.4, 2026-07-24)
- `memory/build/replace_malloc.h`, `mozmemory_wrap.cpp`, `mozjemalloc.h` (mozilla-central) — allocator replacement facility, libc++ symbol conflicts
- duckdb.org concurrency docs — single-writer-process model, Quack beta, DuckLake+Postgres path
- Kanopy "PGlite vs SQLite Wasm vs DuckDB Wasm" (2026-04-03) — WASM sizes, single-row INSERT comparison
- Markaicode "DuckDB vs SQLite" (2026-07-21, v1.5.4/v3.51.1) — 14x end-to-end OLAP gap, single-writer bottleneck, file-size 39 MB vs 222 MB
