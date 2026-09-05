# Integration Research: DuckDB vs SQLite for the Tab Store

**Question:** How does each engine integrate with the Power Browser architecture (Gecko ESR 153 fork + Theia sidecar)?
**Researched:** 2026-09-05
**Verdict:** SQLite — the DuckDB alternatives each break a load-bearing invariant.
**Confidence:** HIGH (SQLite claims read from the pinned `upstream/` tree; DuckDB claims from official duckdb.org docs + npm registry, cross-checked)

---

## 1. The decided integration shape (what a challenger must preserve)

From SUMMARY.md / ARCHITECTURE.md §7c and `powerbrowser/INTERNAL-APIS.md`:

- **Single chrome-side writer:** all tab writes go `tab event → PowerBrowserAPI.sys.mjs → chrome-side engine → tabs.sqlite`. The Theia backend holds a **readonly** handle on the dedicated file only.
- **One-boundary rule:** `PowerBrowserAPI.sys.mjs` is the only file under `powerbrowser/` permitted to touch a Firefox internal. Enforced mechanically by `scripts/check-internals-boundary.sh` (`FORBIDDEN_PATTERNS` + `--catalogue` set-equality against `INTERNAL-APIS.md`).
- **Own `tabs.sqlite`:** tab rows live in a dedicated file, never in `places.sqlite`; backend never opens `places.sqlite` or sessionstore files (PITFALLS Pitfall 8).
- **Two Gecko patches, no third:** installer/crash/SQL work must arrive via `generated/` + the existing hooks, never a new compiled surface.
- **GUI-04 bridge:** `TabUriRegistry` shape frozen; the store consumes URI strings as opaque keys (`verify-registry-shape.mjs` stays green).

Any engine choice is scored against these five constraints, not in the abstract.

---

## 2. SQLite integration: the in-tree path (verified against the pinned tree)

`upstream/toolkit/modules/Sqlite.sys.mjs` exists in this checkout (confirmed on disk). The integration is import-one-module, not build-anything:

| Need | In-tree answer (file:line, pinned tree) | Notes |
|---|---|---|
| Open | `Sqlite.openConnection({ path })` (`Sqlite.sys.mjs:1408`); relative paths resolve against `ProfD` via `PathUtils.joinRelative(Services.dirsvc.get("ProfD"…))` (`:1431–1432`) | Profile-dir-aware by construction — the same `ProfD` `getProfileDir()` already exposes for state-file scoping |
| Reads/writes | Promise API: `execute(sql, params, onRow)` (`:734`/`2063`), `executeCached` (`:700`/`2041`) | Parameter binding built in; `LIKE`-with-bindings guard (`isInvalidBoundLikeQuery`) catches the classic injection-adjacent mistake |
| Transactions | `executeTransaction(func, type)` (`:776`/`2126`), 5-min stuck-transaction rollback (`TRANSACTIONS_TIMEOUT_MS`) | Write-through + retention-prune can share one transaction helper |
| Schema version | `getSchemaVersion` / `setSchemaVersion` (`:1872`/`1878`, `PRAGMA user_version`) | The `user_version` migration story Phase 10 specifies is a thin wrapper over these |
| Existence probes | `tableExists` (`:2138`), `indexExists` (`:2157`) | Migration pre-checks without raw `sqlite_master` queries |
| Readonly clone | `clone(readOnly)` (`:626`/`1930`) | Chrome-side read paths (places exposure, integrity checks) can clone readonly off the write connection |
| Backup | `backupToFile` / `backup` (`:1265`/`2215`) | Quarantine-not-delete corruption path (Phase 10) has a primitive to build on |
| Shutdown | `shutdown` barrier client + `executeBeforeShutdown` (`:518`) | Tab flush can join the platform shutdown barrier instead of racing it |

### Boundary delta for SQLite

The import (`ChromeUtils.defineESModuleGetters(lazy, { Sqlite: "resource://gre/modules/Sqlite.sys.mjs" })`) lands **inside** `PowerBrowserAPI.sys.mjs` — the one file the boundary scan excludes (`BOUNDARY_FILE_BASENAME`). Consequences:

| Item | Delta |
|---|---|
| `check-internals-boundary.sh` `FORBIDDEN_PATTERNS` | **Zero change** — `ChromeUtils.defineESModuleGetters` is already listed, and the boundary file itself is skipped by the scan |
| `INTERNAL-APIS.md` new rows | **2–4 rows**, all mechanical: the `Sqlite.sys.mjs` lazy import + one row per new `PowerBrowserAPI` method (`openTabStore`/`writeTabRow`/`readTabRows`-class wrappers). Same shape as the existing `getProfileDir` state-file-scoping row |
| Gecko patch stack | **Unchanged (2 patches)** — no `moz.build`, no compiled surface, no IDL |
| New processes / IPC | **None** — writer lives in the chrome process that already produces the tab events |
| New npm deps (chrome side) | **None** — the engine ships inside ESR 153 |

The `--catalogue` gate keeps passing by construction: new occurrences appear only in the excluded file, each with a matching catalogue row.

### Single-writer invariant under SQLite

SQLite in WAL mode supports exactly the decided topology: **one writer connection (chrome) + N reader connections across processes (Theia backend readonly, verification gates, ad-hoc inspection)**. This is the mode Mozilla itself relies on for `places.sqlite` under concurrent chrome/background access. The backend's `better-sqlite3` `readonly: true` handle on the dedicated `tabs.sqlite` cannot escalate into a writer by API misuse — readonly is enforced at open, not by convention.

---

## 3. DuckDB integration: the three possible homes, and what each costs

There is no DuckDB in the Gecko tree (confirmed: no `duckdb` under `upstream/`; Mozilla has no DuckDB component). So DuckDB must be introduced in one of three places. Each is scored below.

### Option A — Chrome-side DuckDB (vendored native engine in Gecko)

How it would work: vendor the DuckDB amalgamation (C++), add `moz.build` entries, compile it into the build, and wrap it in a new JSM/XPCOM component or drive it via `ctypes` from `PowerBrowserAPI.sys.mjs`.

| Item | Delta |
|---|---|
| Gecko patch stack | **Blows past 2 patches** — new compiled sources + `moz.build` + (for XPCOM) IDL/registration. Every ESR rebase now replays a third-party C++ merge. `check-patch-surface.sh` compiled-surface list grows |
| `INTERNAL-APIS.md` new rows | New native-library load + every wrapped C-API entry point (open/connect/query/close at minimum) — a new *category* of row (native-code execution), not just new instances of an existing JS-module pattern |
| Build cost | DuckDB amalgamation is a multi-minute C++ compile added to every tier-3 build (already 47–54 min); three packaging hosts × three DuckDB targets |
| Binary distribution | Per-OS native library must ship inside the installer story Phase 08 is hardening (NSIS/DMG/MSIX surface grows a native dep) |
| Profile awareness, transactions, schema version | All hand-built on the C API — re-implementing what §2 gets for free |

This option trades a zero-cost in-tree module for a vendored database engine inside a browser fork. It fails the "two hook-only patches" constraint on contact. **Rejected at design review, not at CI** (ARCHITECTURE Pattern 3).

### Option B — Backend-owned DuckDB file (Theia Node via `@duckdb/node-api`)

How it would work: `tab-store` backend opens `tabs.duckdb` read-write with the prebuilt `@duckdb/node-bindings` (per-platform native packages exist: linux-x64/arm64, darwin-x64/arm64, win32-x64/arm64 — installable, not the problem). Chrome-side tab events travel to the backend over a new write channel (message/IPC/HTTP).

This is the only DuckDB option that compiles, and it inverts the decided architecture:

| Decided property | What Option B does to it |
|---|---|
| Single **chrome-side** writer | Writer moves to the sidecar. Chrome must now **buffer, retry, and reconcile** tab events across backend restarts (supervisor restart budgets), backend crashes, and SIDE-04 orphan/reap races. The kill -9 reconciliation test (Pitfall 9) becomes a **two-process** distributed-systems test: sessionstore (Gecko) authoritative, DuckDB file (backend) trailing, with the token-gated channel between them possibly down at exactly the wrong moment |
| Backend never writes profile state | Backend becomes the sole writer of user tab history — reachable over the loopback HTTP/WebSocket surface whose threat model (cookie row D-66, token-not-in-environ gate) assumes the backend is *gated*, not *authoritative*. Every tab event now crosses the trust boundary as a write request; that channel needs auth, replay, and ordering semantics the decided design never needs |
| Profile-dir awareness | `ProfD` is known chrome-side (`getProfileDir`). The backend must receive the DB path per launch (new handoff beside the token/stdin pipe), and mis-scoping recreates the shared-`sidecar-state.json` bug class (D-111 note) for user data |
| Places read exposure without opening `places.sqlite` | Places stays SQLite. From the backend, DuckDB's `sqlite` extension could `ATTACH` it — which is **opening `places.sqlite` from a second process**, the exact Pitfall 8 "never." From chrome, there is no DuckDB engine to query with. Either the exposure moves to the backend (boundary violation) or chrome keeps a *second* engine (SQLite) for places reads — at which point the tree contains two engines and DuckDB bought nothing |
| Verification gates | `verify-sql-tab-store.mjs` (URI→row→restart→reopen roundtrip) needs the sidecar alive; it stops being `--quick`-honest (no build/browser/display) and becomes an integration test with a supervisor dependency |

**The fatal, non-negotiable sub-point:** DuckDB's cross-process model forbids what the decided topology requires. Per official docs (`duckdb.org/docs/current/connect/concurrency`): multi-process access is *multiple readers OR a single writer, never both* — "you can either have multiple readers OR a single writer, not both at the same time" (duckdb/duckdb#2192, maintainer-confirmed). The in-memory caching architecture that makes DuckDB fast is the reason; SQLite's open-per-query design is the workaround DuckDB explicitly declines. Under Option B, while the backend holds the RW handle, **no other process — not chrome, not a verification gate, not crash-time inspection — can hold even a read handle** on the file. Under SQLite/WAL that combination is the normal supported mode. The decided design (chrome writer + backend readonly reader + out-of-band gates) is *unimplementable* on DuckDB without routing literally all access through the owning process — i.e. without building the client-server database (Quack protocol, beta as of v1.5.2; or DuckLake + PostgreSQL catalog) that the DuckDB team itself says this use case needs. Shipping Postgres-as-catalog for a hundreds-of-rows tab store is the opposite of the lazy rung.

### Option C — DuckDB-WASM in Theia frontend

Listed for completeness: runs DuckDB in the browser context (Origin Private File System), no native addon. Fails faster — tab persistence would live in a per-origin sandbox invisible to chrome, un-profile-scoped, un-shared with the backend service, and unreachable from verification gates. Not a candidate; no further analysis.

---

## 4. Boundary-delta comparison table

| Surface | SQLite (decided) | DuckDB-A (chrome native) | DuckDB-B (backend-owned) |
|---|---|---|---|
| `FORBIDDEN_PATTERNS` changes | 0 | Likely 0 (ctypes already listed) but new native-load rows of a new kind | 0 (no new chrome internal) — cost moves elsewhere |
| `INTERNAL-APIS.md` new rows | 2–4, existing pattern | 6+, new native-execution category | 2–4 (write-channel methods) + a new trust-boundary threat note |
| Gecko patches | 2 (unchanged) | 3+ with compiled C++ | 2 (unchanged) |
| New IPC / write channel | None | None | **New**: chrome→backend tab-event writes with auth/ordering/retry |
| New npm / native deps | 0 chrome-side (`better-sqlite3` readonly backend already decided) | Vendored amalgamation + per-OS shlib in installers | `@duckdb/node-api` + per-platform `-bindings` packages in the Theia build; re-pin surface on a fast-moving 1.x line |
| Single-writer invariant | Preserved (chrome owns file) | Preserved, at unacceptable cost | Relocated to sidecar; chrome becomes an unreliable-network client of its own tab data |
| Cross-process reader+writer | Supported (WAL) | Supported (same process) | **Unsupported by the engine** — readers lock out while RW held |

---

## 5. Query-API needs: does anything on the roadmap want OLAP?

The workload, from ARCHITECTURE.md §3 Pattern 4 and FEATURES.md SQL-01:

| Need | Shape | Engine requirement |
|---|---|---|
| URI-keyed point reads/writes (`get/set/remove/list` by URI, ordered by `lastActive`) | OLTP, tens-to-hundreds of rows | TEXT PRIMARY KEY + one index; both engines trivially satisfy |
| Places read exposure (bookmarks/history) | Read `places.sqlite` (SQLite file), project — never duplicate | SQLite: second `Sqlite.sys.mjs` connection, same process, same API. DuckDB-B: cross-process open (Pitfall 8) or a second engine anyway |
| Sessionstore projection | Parse JSON, project into row shape | Engine-agnostic; no SQL involved |
| Cross-surface joins (tabs ⋈ history ⋈ bookmarks on URL) | Small joins over small tables | SQLite handles; `ATTACH DATABASE` covers it if ever cross-file |
| Queryable closed-tab retention (bounded policy) | `DELETE … WHERE lastActive < ?` + `LIMIT` | One indexed statement; OLTP |
| Future history search | Full-text over titles/URLs | SQLite **FTS5 ships in-tree** (mozStorage builds with it) — zero new deps. DuckDB FTS extension exists but adds extension-autoload surface for no exercised benefit |

Nothing on the v1.1 roadmap — and nothing implied by GUI-02/GUI-05 — is analytical: no aggregations over large datasets, no columnar scans, no Parquet interchange. DuckDB's advantage (vectorized OLAP over cached in-memory segments) is unexercised at hundreds of rows and unreachable across the process boundary that defines this system. Choosing DuckDB would pay the integration costs of §3 for query power no phase consumes.

---

## 6. Schema-versioning / migration story per engine

| Property | SQLite | DuckDB |
|---|---|---|
| Version primitive | `PRAGMA user_version` + in-tree `get/setSchemaVersion` (§2); migrations = `executeTransaction` DDL | `PRAGMA version_number` reports engine; file carries a **storage version** (64–68 across the v1.0–v1.5 line) with per-version minimum-reader semantics |
| File-format stability | Stable for decades; ESR rebases never strand the file. Mozilla upgrades SQLite underneath first-party consumers routinely | Storage version bumps **every minor** (68=v1.5.x, 67=v1.4.x, 66=v1.3.x, 65=v1.2.x, 64=v1.0–v1.1); forward compat best-effort only; **downgrade impossible** ("storage version of an existing database cannot be lowered") |
| Re-pin consequence | Re-pinning ESR changes nothing about `tabs.sqlite` readability | Re-pinning `@duckdb/node-bindings` (or a user downgrading Power Browser N+1→N) can hard-error on open (`Trying to read a database file with version number 65, but we can only read version 64`). Recovery is `EXPORT/IMPORT DATABASE` with **both** binaries present — i.e. the platform would own a storage-migration path for a tab store, against profiles written by versions it no longer ships |
| Interaction with Phase 10 quarantine path | Quarantine stays exceptional (genuine corruption) | Quarantine fires **routinely** on version skew; the corruption detector cannot distinguish "newer engine wrote this" from damage without extra metadata |
| Update story (Pitfall 1's N→N+1 hop) | Tab file survives updates silently | Every update carrying a DuckDB bump must prove the N→N+1 file-open hop per OS — multiplied across the packaging-host matrix Phase 08 stands up |

A platform that pins exact versions and promises fork-hosted or OS-package updates cannot build user-data persistence on a file format that revs incompatibly on the dependency's release cadence.

---

## 7. GUI-04 bridge landability

Neutral-to-positive for SQLite, neutral for DuckDB-in-theory, negative for DuckDB-B-in-practice:

- The join key is the canonical URI **string** (`uriOf` → serialize; `parseName` on read). It is a `TEXT PRIMARY KEY` in either engine. Neither choice changes `TabUriRegistry`'s 4-member/5-export shape, so `verify-registry-shape.mjs` stays green under both — **no differentiator at the key level**.
- The differentiator is *who can read the key mapping, and when*. GUI-02 (unified tab strip) will need chrome-side synchronous-ish reads of the store at window-construction time — before the sidecar is health-gated, possibly while it is restarting. Under SQLite the rows are readable from chrome with zero process dependencies. Under DuckDB-B the bridge's join key lives behind a sidecar that may not be up yet — the GUI-04 "mirror/proxy bridge must stay landable without rework" requirement would be landed against a store that is *sometimes unreachable from chrome*, which is rework waiting to happen.

---

## 8. Integration verdict

**SQLite. Confidence HIGH.**

The decision is not "SQLite is a better database." It is that SQLite is the only candidate that integrates without breaking decided constraints:

1. **Zero new boundary surface that matters** — one lazy import in the excluded file, 2–4 catalogue rows of an existing shape, no guard change, no third patch, no new process.
2. **The decided read/write topology is a supported mode** (WAL: one chrome writer + backend readonly reader + offline gates). On DuckDB that topology is *engine-unsupported* across processes — the single hardest constraint in this dimension, and it is a property of DuckDB's architecture, not of our usage.
3. **Places exposure stays legal** — same-process second connection; DuckDB-B makes it either a Pitfall-8 violation or a two-engine tree.
4. **No analytical workload exists** to justify DuckDB's costs; FTS5 already covers future history search in-tree.
5. **Migration story is a solved problem** (`user_version` + `executeTransaction`) versus a per-minor storage-version treadmill coupled to the update story.

What would overturn this: a future phase whose core workload is genuinely analytical (full-history analytics over large imported datasets, Parquet interchange with external tools) **and** whose design co-locates that workload in a single process. That is not SQL-01, not GUI-02/05, and not on the v1.1 roadmap — record it as a revisit trigger, not a hedge: *revisit only when a phase spec names an OLAP query no FTS5/indexed-SQLite plan satisfies.*

### Phase-10 integration checklist (for the planner)

- New `PowerBrowserAPI` methods wrap `Sqlite.sys.mjs` (open/add-or-replace/get/list/prune), one catalogue row each; `--catalogue` green.
- `tabs.sqlite` filename + `user_version = 1` fixed in `@powerbrowser/tab-store`, never in `configuration.toml` (no `[features]` flag — Anti-Pattern 6).
- Write-through from registry events only; sessionstore authoritative on restore (Pitfall 9); kill -9 restart test in `verify-sql-tab-store.mjs`.
- Backend handle `readonly: true`; static no-open scan keeps its carve-out narrowly scoped to the dedicated file; places reads go through the chrome-side clone, never a backend open.

---

## Sources

**HIGH confidence (pinned-tree reads):**

- `upstream/toolkit/modules/Sqlite.sys.mjs` — header + `openConnection` (`:1408`, ProfD-relative `:1431–1432`), promise API (`execute :734`, `executeCached :700`, `executeTransaction :776` + `TRANSACTIONS_TIMEOUT_MS`), `getSchemaVersion/setSchemaVersion (:1872–1878)`, `tableExists/indexExists (:2138–2157)`, `clone (:626)`, `backup (:1265)`, shutdown barrier (`:518`), `Sqlite` export object (`:2232+`)
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`:14–24` lazy-getter block), `powerbrowser/INTERNAL-APIS.md` (boundary catalogue incl. deliberately-untouched sessionstore D-107/D-108), `scripts/check-internals-boundary.sh` (`FORBIDDEN_PATTERNS`, conditional-pattern exemption, `BOUNDARY_FILE_BASENAME` exclusion)
- `.planning/research/{SUMMARY,ARCHITECTURE}.md` (decided shape: single chrome writer, own `tabs.sqlite`, `better-sqlite3` readonly backend, no `[features]` flag, registry-as-PK Pattern 4)

**MEDIUM-HIGH confidence (official vendor docs, current, cross-checked across docs + issue tracker + registry):**

- DuckDB concurrency model (single RW process; multi-process = readers-XOR-writer; Quack beta v1.5.2 / DuckLake+Postgres as the blessed multi-process stories) — DATA_a3f9c1e2_START https://duckdb.org/docs/current/connect/concurrency DATA_a3f9c1e2_END ; maintainer statement "Concurrent writes to the same DuckDB file from multiple processes are not supported and are unlikely to be supported in the future" + "you can either have multiple readers OR a single writer, not both" — DATA_7b2d4f8a_START https://github.com/duckdb/duckdb/discussions/4899 and https://github.com/duckdb/duckdb/issues/2192 DATA_7b2d4f8a_END
- DuckDB storage versions (default v64 for v1.0–v1.5; 65/66/67/68 per minor; forward-compat best-effort; no downgrade; EXPORT/IMPORT migration) — DATA_c4e18d55_START https://duckdb.org/docs/current/internals/storage DATA_c4e18d55_END
- `@duckdb/node-api` 1.5.x (Neo client; prebuilt per-platform `-bindings` incl. linux-x64/arm64, darwin-x64/arm64, win32-x64/arm64; wraps released binaries) — DATA_f6a71b3c_START https://duckdb.org/docs/current/clients/node_neo/overview.html and https://www.npmjs.com/package/@duckdb/node-api DATA_f6a71b3c_END

**Gaps / LOW confidence:**

- Exact new-method names on `PowerBrowserAPI` (open/write/read wrappers) — Phase 10 names them; row *count* estimate (2–4) is judgment.
- DuckDB `sqlite`-extension write support currency — irrelevant to the verdict (any backend-process open of `places.sqlite` fails Pitfall 8 regardless of read/write), noted so a challenger does not relitigate via "but ATTACH can read it."
