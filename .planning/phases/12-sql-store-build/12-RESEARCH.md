# Phase 12: SQL Store Build - Research

**Researched:** 2026-09-05
**Domain:** Chrome-side SQLite tab-store implementation (writer, read paths, store gates) — no GUI surface
**Confidence:** HIGH (in-tree primitives read line-verbatim this session; engine pre-decided; reader API confirmed against official docs; one structural open question flagged, not hidden)

## Summary

Phase 12 turns Phase 11's signed design into code: a single chrome-side writer (`Sqlite.sys.mjs` behind `PowerBrowserAPI.sys.mjs`, the sole boundary, with new `INTERNAL-APIS.md` catalogue rows) persists every tab as a row in an own `tabs.sqlite` in the profile directory; read paths expose bookmarks/history via Places APIs, a sessionstore read projection, and a query API beside (never on) the frozen `TabUriRegistry`; and four store gates land as `verify-platform.sh` registry rows with `--self-test`. Sessionstore stays authoritative for restore throughout; the store is an additive projection.

Every load-bearing primitive was re-verified against the pinned tree this session: `openConnection` with profile-relative resolution, `execute`/`executeCached` with bound parameters, `executeTransaction`, `getSchemaVersion`/`setSchemaVersion`, `tableExists`/`indexExists`, `clone(readOnly)`, `backupToFile`; `PrivateBrowsingUtils.isWindowPrivate` for the writer-side private filter; `SessionStore.getBrowserState` (returns a JSON string) plus the `sessionstore-state-write-complete` observer topic; `TabOpen`/`TabClose`/`TabSelect`/`TabAttrModified` tab events on browser windows; `History.fetch`, `Bookmarks.fetch`, `PlacesUtils.getFolderContents`; vendored SQLite 3.53.2 (UPSERT and WAL both available); `better-sqlite3@13.0.3` legitimacy OK with `readonly` open confirmed in its official API docs.

**Primary recommendation:** Decompose tracer-first into 3 plans — (1) writer + roundtrip on a temp DB first (schema DDL verbatim, WAL pre-BEGIN, bound-parameter upsert, private filter, quarantine path honoring all seven Phase 11 fixes), then (2) read paths + emitter-exercising absence test (Places reads chrome-side, sessionstore projection, query API in `@powerbrowser/tab-uris` backend module, `better-sqlite3` readonly), then (3) the four registry-row gates + live ESR rebase drill. The planner's single hardest decision is the event-source→URI-key binding (Open Question 1): no Theia→chrome data channel exists, so the v1.2 live trigger must be chrome-observable (stock-window tab events and/or the sessionstore-write observer), with any browser-tab URI emission living beside the frozen registry, never on it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — discuss phase was skipped per user setting (`workflow.skip_discuss`). No locked implementation decisions exist.

Standing autonomous: nonstop, verification deferred, --no-reversibility-gates, halt only on 3x blocker.

Engine: SQLite. Gecko Sqlite.sys.mjs writes; Theia backend better-sqlite3@13.0.3 readonly.

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, Phase 11 design docs, and codebase conventions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SQL-01 | Chrome-side writer ships — `Sqlite.sys.mjs` behind `PowerBrowserAPI.sys.mjs` (sole boundary, new INTERNAL-APIS.md rows), own `tabs.sqlite` in profile dir, sessionstore stays authoritative for restore, registry URIs are the join key | Writer pattern (§Architecture Patterns, Pattern 1–2); boundary catalogue mechanics; all seven Phase 11 fixes (§Phase 11 Fixes to Honor) |
| SQL-04 | Read paths ship — bookmarks/history via Places APIs (never raw places writes), sessionstore read projection, query API on `@powerbrowser/tab-uris`, private-browsing exclusion with emitter-exercising absence test | Read-path pattern (Pattern 3); Places/SessionStore API pins (§Code Examples); token-gate backend-module analog for query-service placement |
| SQL-05 | Store gates green — second-writer negative scan, interleaved tab+bookmark write soak with `PRAGMA integrity_check` clean, URI→row→restart→reopen roundtrip on temp DB, registry-shape untouched, live ESR rebase drill | Gate specifications (Pattern 4); registry quick/full classification (§Validation Architecture); rebase-drill scope (§Rebase-Drill Scope) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Binding directives the plan must not violate:

1. **Never fork or patch Theia core** — query API lands in `@powerbrowser/tab-uris` (new backend module beside the frozen frontend surface), never in `@theia/*`. `scripts/diff-theia-core.sh` stays green.
2. **Never modify Gecko outside the patch stack** — `upstream/` never hand-edited (`git -C upstream diff` empty). All Firefox reach-through lives in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` + one catalogue row per touchpoint in `powerbrowser/INTERNAL-APIS.md`. Patch 020's whole content is one line (`DIRS += ["../powerbrowser/shell"]` in `browser/moz.build`, resolving through the `upstream/powerbrowser` symlink), so editing files under `powerbrowser/shell/` (including `jar.mn`) needs no patch regeneration.
3. **Design for the bridge** — zero `TabUriRegistry` shape change. `scripts/verify-registry-shape.mjs` asserts set equality over 5 exported names across 2 modules and 4 public members [VERIFIED: scripts/verify-registry-shape.mjs:55-71]; query surface lives beside the registry.
4. **Space-free checkout path** — temp-DB, stage-dir, and fixture paths must be space-free (mktemp default satisfies this; never hardcode `/tmp` with spaces).
5. **No custom browser chrome authored; no GUI surface** — SQL-01/04/05 ship no window, strip, toolbar, address bar, menu, or user-facing string. `powerbrowser.xhtml` keeps zero occurrences of `tabbrowser`/`nav-bar`/`toolbarbutton`/`urlbar` (existing shell01 gate).
6. **One driver, one registry** — all four store gates land as `verify-platform.sh` CHECKS rows with `--self-test`, never sibling drivers. Base array = `--quick` set; rows appended under `if [ "$QUICK" -eq 0 ]` are full-tier only [VERIFIED: scripts/verify-platform.sh:4209-4210].
7. **Derive-from-tree-and-compare; presence assertions, never absence** — with the ONE permitted exception: the private-tab absence test, valid only because it exercises the real emitter (SCHEMA.md design rule; CLAUDE.md absence-assertion rule).
8. **Residual-brand scan is a permanent gate** — stage new files before trusting a green scan; never spell the originating-product token outside `inventory/brand-tokens.json`.
9. **Patches are regenerated, never text-edited** — Phase 12 needs no patch change at all (writer is JS-only inside the excluded boundary file; `jar.mn` addition is this-tree packaging, not a hunk edit).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tab-write capture (open/close/navigate/activate → row upsert) | Gecko chrome (`PowerBrowserAPI` + shell listeners) | — | Single-writer invariant forbids any other writer; only chrome sees both tab events and private-window state |
| Tab-row persistence (`tabs.sqlite`, migrations, integrity) | Gecko chrome (`Sqlite.sys.mjs` connection) | — | In-tree wrapper, profile-dir-aware, WAL-capable; vendored SQLite 3.53.2 |
| Restore authority (what reopens after restart) | Gecko platform (sessionstore) | — | Locked invariant; store is a projection, never the restore source |
| Tab identity / join key | Theia frontend (`TabUriRegistry`, existing, frozen) + beside-registry emission for browser tabs if needed | — | URIs minted Theia-side; chrome binds them as opaque TEXT, never parses |
| Read/query serving to Theia UI | Theia backend (Node, readonly handle) | Chrome-side readonly clone for Places/sessionstore projection | Backend never opens profile SQLite; Places/sessionstore reads stay chrome-side |
| Private-tab exclusion enforcement | Gecko chrome (write-path filter before upsert) | — | One enforcement point at the single writer; backend/tests only observe absence |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `Sqlite.sys.mjs` (in-tree Gecko module) | ESR-pinned tree (2252 lines, read this session) | Chrome-side open/execute/transaction/schema-version/backup/clone | Zero new deps, zero new build targets, profile-dir-aware; every first-party consumer sits on it |
| SQLite (vendored `third_party/sqlite3`) | 3.53.2 [CITED: upstream/third_party/sqlite3/src/sqlite3.h:149] | Engine under both `Sqlite.sys.mjs` and `better-sqlite3` | UPSERT (3.24+) and WAL (3.7+) both available; 25-year format stability across ESR re-pins |
| SQLite `PRAGMA user_version` via `getSchemaVersion`/`setSchemaVersion` | In-tree wrapper | Forward-only migration chain, v1 from day one | Thin integer-guarded wrapper over the pragma [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1872-1885] |
| SQLite `PRAGMA quick_check` / `integrity_check` | Same engine | Startup tripwire + scheduled full check feeding quarantine-not-delete | Exact-`['ok']` keying; no FK validation needed (schema has no FKs) |
| `better-sqlite3` (Theia backend reader only) | 13.0.3 (2026-08-05, node ≥22, no postinstall) | Readonly handle on the dedicated file | N-API, ~10.4M weekly downloads, legitimacy OK; `readonly` open confirmed in official API docs [VERIFIED: npm registry + legitimacy seam; CITED: official api.md] |
| SQLite WAL mode | Pinned at creation + every rebuild, pre-BEGIN | One chrome writer + N cross-process readers | The decided topology's native mode |

Version verification (run this session):

```bash
npm view better-sqlite3 version          # → 13.0.3
npm view better-sqlite3 scripts.postinstall  # → null (no postinstall risk)
node --version                           # → v24.19.0 (satisfies engines node ≥22)
grep SQLITE_VERSION upstream/third_party/sqlite3/src/sqlite3.h  # → 3.53.2
```

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Sqlite.sys.mjs` `executeTransaction` | In-tree | Atomic DDL+migration+write+prune | Every multi-statement writer path [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:776] |
| `Sqlite.sys.mjs` `tableExists` / `indexExists` | In-tree | Migration pre-checks, no raw `sqlite_master` | Migration guards [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:2138-2147,2157-2164] |
| `Sqlite.sys.mjs` `clone(readOnly)` | In-tree | Chrome-side read paths off the write connection | Places/sessionstore-adjacent reads, integrity checks [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:626-633] |
| `Sqlite.sys.mjs` `backupToFile` | In-tree | Quarantine primitive (copy-then-rename, never delete) | Corruption path [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1265-1273] |
| `Sqlite.sys.mjs` `executeCached` / `execute` | In-tree | Bound-parameter statements | Write-through upsert + point reads [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:700-711,734-739] |
| `PrivateBrowsingUtils.isWindowPrivate` | In-tree | Writer-side private filter | Called on the tab's chrome window before upsert [VERIFIED: upstream/toolkit/modules/PrivateBrowsingUtils.sys.mjs:18-28] |
| `SessionStore.getBrowserState` / `getWindowState` | In-tree | Read projection + quarantine rebuild source | Returns a JSON **string** (`JSON.stringify(state)`) — projection does `JSON.parse` [VERIFIED: upstream/browser/components/sessionstore/SessionStore.sys.mjs:3938-3948,300-301,319-321] |
| `sessionstore-state-write-complete` observer topic | In-tree | Reconciliation sweep trigger + rebuild freshness signal | Notified after every atomic session-file write [VERIFIED: upstream/browser/components/sessionstore/SessionSaver.sys.mjs:375-383] |
| `TabOpen` / `TabClose` / `TabSelect` / `TabAttrModified` events | In-tree tabbrowser | Live write-through triggers on stock windows | Bubbling CustomEvents on the tab element [VERIFIED: upstream/browser/components/tabbrowser/content/tabbrowser.js:4978-4985 (`TabOpen`); CITED: :1867 (`TabSelect`), :2161 (`TabAttrModified`), :5924 (`TabClose`)] |
| `PlacesUtils.history` (`History.fetch`) | In-tree | History read projection, never raw `places.sqlite` access | `fetch(guidOrURI, options)` [VERIFIED: upstream/toolkit/components/places/History.sys.mjs:137-144] |
| `PlacesUtils.bookmarks` (`Bookmarks.fetch`) | In-tree | Bookmark read projection | `fetch(guidOrInfo, onResult, options)`; URL-keyed fetch supported [VERIFIED: upstream/toolkit/components/places/Bookmarks.sys.mjs:1510-1524] |
| `PlacesUtils.getFolderContents` | In-tree | Folder listing via `history.executeQuery` | Read-only query path, no raw DB [VERIFIED: upstream/toolkit/components/places/PlacesUtils.sys.mjs:1379-1391] |
| `Services.wm` window enumeration | In-tree | Finding stock browser windows to attach tab listeners | `getMostRecentWindow` already used in-boundary [VERIFIED: powerbrowser/shell/PowerBrowserAPI.sys.mjs:477-479]; `getEnumerator("navigator:browser")` is the stock pattern [CITED: upstream/browser/base/content/browser.js:748] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite | DuckDB | REJECTED unanimously 2026-09-05 (cross-process RW+RO sharing forbidden, OLAP ~8–11× slower on single-row writes, per-minor format revs) [CITED: .planning/research/duckdb-vs-sqlite/VERDICT.md] |
| `Sqlite.sys.mjs` wrapper | Raw mozStorage / `Services.storage` | Rejected: loses transaction queue, stuck-transaction rollback, profile-aware open [ASSUMED — architectural judgment, low risk] |
| `better-sqlite3` reader | `node:sqlite` | Revisit at next Node re-pin per standing decision; not today's reader [ASSUMED] |
| Own `tabs.sqlite` | Tables in `places.sqlite` | OUT OF SCOPE (REQUIREMENTS.md): upstream-owned schema migrates under every rebase |
| Sessionstore authoritative | Store-as-restore-authority | OUT OF SCOPE: needs dual-write + restore-parity proof first |
| Chrome-side listeners + sessionstore observer | Theia-widget events via new Theia→chrome channel (JSWindowActor) | Rejected for Phase 12: no Theia→chrome data channel exists by design (GUI-01 uses `window.open` only, carrying no data); a new privileged channel is bridge work for v1.3, not store-only scope. Actor registration would also need a `FORBIDDEN_PATTERNS` entry in the same commit (WINDOWS 13 rule) |

**Installation:**

```bash
# Inside nix theia shell only (yarn does not work on host):
nix develop .#theia --command bash -c "cd theia && yarn add better-sqlite3@13.0.3"
# Pin exact version; theia/ uses yarn v1 (workspace-local packages not recorded in lock — same discipline as prior @powerbrowser additions).
```

**Native-build fallback (verified viable, not a blocker):** `better-sqlite3` ships prebuilt binaries for common platforms; if the sandbox forces a source build, the theia dev shell already carries the toolchain — `python3`, `gnumake`, `pkg-config`, and the pinned Node's own `node-gyp-bin` on PATH [VERIFIED: flake.nix:25-45]. Precedent: `drivelist` already falls through to `node-gyp rebuild` in this shell (same comment block). Tag the install task with the shell requirement; do not run yarn on the host.

## Package Legitimacy Audit

> Legitimacy gate run this session via seam (`gsd_run query package-legitimacy check --ecosystem npm better-sqlite3`).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `better-sqlite3@13.0.3` | npm, published 2026-08-05 | ~9 yrs (since 2017) | ~10.4M/wk | github.com/WiseLibs/better-sqlite3 | OK | Approved — no `checkpoint:human-verify` needed |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** none.
**Postinstall check:** `postinstall: null` in seam signals and `npm view` — no network/filesystem postinstall risk.

*Tier note (honest): the `classify-confidence` seam rates registry-metadata claims MEDIUM even with legitimacy OK; HIGH-tier claims in this document rest on the official API docs fetched this session (webfetch of the authoritative repo) and on line-verbatim in-tree reads, not on registry metadata alone.*

## Architecture Patterns

### System Architecture Diagram

```text
 STOCK BROWSER WINDOWS (GUI-01-reachable)      THEIA SIDE (reads only)
 ┌──────────────────────────────┐
 │ gBrowser tabs                │
 │ TabOpen/TabClose/TabSelect/  │   (no Theia→chrome channel exists;
 │ TabAttrModified (bubbling)   │    GUI-01 uses window.open, no data)
 └──────────────┬───────────────┘
                │ (1) chrome-observable events
                │ + sessionstore-state-write-complete
                │   reconciliation sweep
                ▼
 ┌──────────────────────────────────┐    ┌──────────────────┐
 │ PowerBrowserAPI.sys.mjs          │SQL │ tabs.sqlite      │
 │ SOLE boundary:                   │WAL │ own file, ProfD, │
 │  + Sqlite lazy import            ├───▶│ user_version=1   │
 │  + openTabStore/writeTabRow/     │    │ tabs(uri PK, url,│
 │    removeTabRow/readTabRows/     │    │ title,last_active)│
 │    prune (new catalogue rows)    │    └────────┬─────────┘
 │  + PrivateBrowsingUtils filter   │             │ readonly handle
 │    BEFORE upsert                 │             ▼
 └──────────────────────────────────┘    ┌──────────────────┐
                │                        │ Theia backend    │
                │ (2) sessionstore       │ better-sqlite3   │
                │ stays RESTORE          │ readonly:true    │
                │ authority              │ query API in     │
                ▼                        │ @powerbrowser/   │
 ┌──────────────────────────────────┐    │ tab-uris backend │
 │ sessionstore (jsonlz4)           │    │ module (NEW,     │
 │ restore authority + quarantine   │    │ beside frozen    │
 │ rebuild source; places.sqlite    │    │ TabUriRegistry)  │
 │ read via Places APIs, never raw, │    └──────────────────┘
 │ never backend opens              │
 └──────────────────────────────────┘
 Corruption: quick_check tripwire → NOT exactly ['ok'] → backupToFile
 → tabs.sqlite.corrupt-<N> (N=max+1) → rm -wal/-shm/-journal →
 rebuild FROM sessionstore+registry in ONE txn → degraded, never delete.
```

A reader traces the primary use case: stock-window tab event → private filter → bound-parameter upsert keyed by URI string → Theia backend serves reads from its readonly handle; on corruption the file is quarantined and live rows rebuild from sessionstore.

### Recommended Project Structure

```text
powerbrowser/shell/
├── PowerBrowserAPI.sys.mjs   # writer wrappers land HERE (sole boundary) + Sqlite lazy import
├── jar.mn                    # +1 line if a new TabStore.sys.mjs module is added (this-tree packaging, no patch regen)
├── TheiaService.sys.mjs      # consumer only — no direct internals; store lifecycle calls route via PowerBrowserAPI
└── (new) TabStore.sys.mjs    # OPTIONAL — planner's choice: writer helper must still import NOTHING
                              # but PowerBrowserAPI (boundary guard scans this dir minus PowerBrowserAPI.sys.mjs)

theia/extensions/tab-uris/
├── package.json              # + {"backend": "lib/node/<module>"} theiaExtensions entry (token-gate analog)
└── src/node/
    └── tab-query-backend-module.ts  # NEW: readonly better-sqlite3 query service (ContainerModule)

scripts/
├── verify-sql-store-second-writer.mjs    # NEW (--quick): negative scan
├── verify-sql-store-soak.mjs             # NEW (full-tier live half; static fixture half may ride --quick)
├── verify-sql-store-roundtrip.mjs        # NEW (full-tier: temp profile + restart)
└── verify-sql-store-absence.mjs          # NEW (full-tier: real private window through real writer)
```

Chrome-packaging note: patch 020's entire content is `DIRS += ["../powerbrowser/shell"]` (resolving through the `upstream/powerbrowser` symlink), so a new `.sys.mjs` under `powerbrowser/shell/` needs only a `jar.mn` content line to be reachable at `chrome://powerbrowser/content/`. Do NOT register XPCOM components: `XPCOM_MANIFESTS` triggers a full tier-3 `./mach build` [CITED: powerbrowser/shell/moz.build:25-28]; a plain ES module imported by URL stays on the fast preprocessing tier.

Theia-composition note: the browser app already depends on `@powerbrowser/tab-uris: 0.1.0` [VERIFIED: theia/applications/browser/package.json:40]; adding a `backend` entry to tab-uris' `theiaExtensions` (shape: `{"backend": "lib/node/token-gate-backend-module"}` [VERIFIED: theia/extensions/token-gate/package.json:9-13]) composes the query service at build time with no app-file edit and no core patch.

### Pattern 1: Single chrome-side writer behind the sole boundary

**What:** All tab writes flow `tab event → PowerBrowserAPI.sys.mjs method → Sqlite.sys.mjs → tabs.sqlite`. The `Sqlite` import lands in the existing `lazy` getter block; the guard excludes the boundary file by basename (`BOUNDARY_FILE_BASENAME="PowerBrowserAPI.sys.mjs"` [CITED: scripts/check-internals-boundary.sh:31]), so `FORBIDDEN_PATTERNS` needs zero changes. Each new touchpoint (`Sqlite` import line, `PrivateBrowsingUtils` import line, `SessionStore`/`PlacesUtils` import lines, `Services.wm`/`Services.obs` if newly touched lines) gains one catalogue row; `--catalogue` derives occurrences from the code and fails naming any uncatalogued `file:line`.

**When to use:** Every writer/reader/projection method Phase 12 adds (`openTabStore`/`writeTabRow`/`removeTabRow`/`readTabRows`/`pruneClosed`-class names at planner's discretion).

**Example (lazy-import shape — the only legal import shape for a new Gecko module):**

```javascript
// Source: powerbrowser/shell/PowerBrowserAPI.sys.mjs:14-24 (existing block)
const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
  // + PrivateBrowsingUtils, SessionStore, PlacesUtils as needed, same block
});
```

```javascript
// Source: upstream/toolkit/modules/Sqlite.sys.mjs:1431-1433 (ProfD-relative open)
// DATA_a3F9kQ2m_START
//   path = PathUtils.joinRelative(
//     Services.dirsvc.get("ProfD", Ci.nsIFile).path,
//     options.path
//   );
// DATA_a3F9kQ2m_END
// Relative `path: "tabs.sqlite"` resolves against ProfD by construction —
// the own-file rule needs no hand-rolled path join [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1428-1435].
```

### Pattern 2: Write-through triggers (chrome-observable only)

**What:** Two complementary triggers, both chrome-side, no new IPC:
1. **Live:** `TabOpen`/`TabClose`/`TabSelect`/`TabAttrModified` listeners attached per stock browser window (enumerated via `Services.wm`, attached on window open), calling the boundary upsert/remove wrappers. Private filter runs before every upsert.
2. **Reconciliation sweep:** `sessionstore-state-write-complete` observer → diff `JSON.parse(SessionStore.getBrowserState())` open tabs against store rows → upsert missing / prune closed (bounded retention). This sweep is also what makes the roundtrip gate deterministic.

**When to use:** Plan 1 (writer). The sweep doubles as the quarantine-rebuild reader (rebuild FROM sessionstore + registry in one txn).

**URI-key binding (planner's decision, constraints fixed):** the row PK must be the canonical opaque `scheme:path` emission the registry produces via `uriOf` (authority form lower-cases on serialization and forks identity — `parseName` reads `uri.authority` directly, never `toString()` [VERIFIED: theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:90-96]). Chrome binds the string and never parses it. If the v1.2 live trigger observes browser tabs (which have no `uriOf` emission), the emission function for those tabs must live in a NEW module beside the registry — never as new public members on `TabUriRegistry`, or `gui04-registry-shape` set-equality fails on surplus. A deliberate contract change edits EXPECTED in the same commit, never smuggled inside store work.

### Pattern 3: Read paths (Places APIs, sessionstore projection, beside-registry query API)

**What:** Three read surfaces, all read-only against upstream-owned state:
- **Bookmarks/history:** `Bookmarks.fetch({url})` point reads, `History.fetch(url)` page reads, `getFolderContents` folder listings — all through `PlacesUtils`, never raw `places.sqlite` opens (the backend never opens profile SQLite at all, readonly included — readonly opens still participate in WAL checkpointing).
- **Sessionstore projection:** `JSON.parse(SessionStore.getBrowserState())` (or `getWindowState(win)`) shaped into the same row projection the store serves; chrome-side only.
- **Tab query API:** new backend module in `@powerbrowser/tab-uris` (`src/node/`, `ContainerModule` binding like token-gate) holding the single readonly `better-sqlite3` handle on the dedicated file only. Reader must tolerate a missing `tabs.sqlite` (first launch before the writer creates it): `fileMustExist` is ignored for readonly connections per official docs, and a readonly SQLite open of a nonexistent file fails — catch at open, serve empty, retry on next query [CITED: official better-sqlite3 api.md `new Database(path, options)`].

**Reader example (official API shape [CITED: github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md]):**

```javascript
// DATA_r7T2nX8p_START
// options.readonly: open the database connection in readonly mode (default: false).
// const stmt = db.prepare('SELECT age FROM cats WHERE name = ?');
// const cat = stmt.get('Joey');
// DATA_r7T2nX8p_END
import Database from "better-sqlite3";
let db = null;
function openReader(profileDir) {
  try {
    db = new Database(profileDir + "/tabs.sqlite", { readonly: true });
  } catch {
    db = null; // store not created yet — serve empty until it exists
  }
}
const row = db?.prepare("SELECT uri, url, title, last_active FROM tabs WHERE uri = ?").get(uriString);
```

### Pattern 4: Four gates as registry rows (specified in SCHEMA.md, implemented here)

| # | Gate | Tier | Self-test plants (both directions) |
|---|------|------|-------------------------------------|
| 1 | Second-writer scan: no profile-DB opens outside `powerbrowser/shell/`; fails naming `file:line` | `--quick` (reads tree only) | A planted `openConnection`/`new Database(` outside shell → red; the allowlisted readonly reader call → green |
| 2 | Integrity soak: interleaved tab+bookmark writes, ends `PRAGMA integrity_check` exactly `['ok']` | Split: static fixture half `--quick`, live half full-tier | Tampered copy trips; clean copy passes |
| 3 | Restart roundtrip: URI→row→restart→reopen on temp DB; restored set equals sessionstore, store agrees | Full-tier (built binary + temp profile + restart) | Seeded divergence (row missing / extra) → red naming the URI |
| 4 | Emitter-exercising absence: real private-window tab events through the real writer, then zero private rows | Full-tier (built binary; display TBD — see Open Question 2) | Same drive with a public window asserts rows EXIST (positive control proving the emitter ran) |

Registry-row shape (existing idiom [CITED: scripts/verify-platform.sh:3667-3668]):

```bash
"sql-store-second-writer|node $REPO_ROOT/scripts/verify-sql-store-second-writer.mjs"
"sql-store-second-writer-self-test|node $REPO_ROOT/scripts/verify-sql-store-second-writer.mjs --self-test"
```

### Anti-Patterns to Avoid

- **Second writer in any process:** backend read-write open, test helper writing the live file, migration script pointed at a profile. The scan (gate 1) is the enforcement, not prose.
- **Raw `places.sqlite` access from any new code:** upstream-owned schema; reads go through Places APIs chrome-side; backend never opens it, readonly included.
- **Store-as-restore-authority:** reopen reads sessionstore exactly as today; the roundtrip gate asserts agreement, not store-first restore.
- **`[features]`/`[sql]` manifest flag or parameterizable filename/version:** `tabs.sqlite` + `user_version=1` are fixed platform content (REQUIREMENTS.md Out of Scope; ARCHITECTURE.md Anti-Pattern 6 lineage).
- **Query methods on `TabUriRegistry`:** trips the frozen-shape gate on surplus. New module beside it.
- **New Theia→chrome channel for v1.2 triggers:** bridge work, not store scope (see Alternatives Considered).
- **XPCOM registration for store modules:** forces tier-3 rebuilds; plain `chrome://` ES modules stay on the fast tier.
- **Hand-kept expectation lists in new checks:** derive actuals at check time, compare as set equality, `--self-test` both directions (verify-registry-shape.mjs:179-250 is the in-tree model).
- **Absence test that can't go red:** no-private-rows asserted without driving private-window events is vacuous — gate 4's positive control (public window produces rows) is mandatory, not optional.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema versioning | Version table + custom comparator | `PRAGMA user_version` + `get/setSchemaVersion` (non-integer guard in-tree) | Zero-table, header integer, SQLi guard already written [VERIFIED: Sqlite.sys.mjs:1878-1885] |
| Migration atomicity | Multi-statement scripts | `executeTransaction(func)` with stuck-transaction timeout | Partial migrations are the corruption vector; queue already serializes [VERIFIED: Sqlite.sys.mjs:776-799] |
| Corruption detection | Checksums / row counts | `PRAGMA quick_check` per launch, full `integrity_check` on schedule/suspicion | Page-level b-tree verification; places' own `.corrupt`-rename precedent |
| Corrupt preservation | Delete-and-recreate | `backupToFile(destFilePath)` → `.corrupt-<N>` | Forensics + downgrade safety [VERIFIED: Sqlite.sys.mjs:1265-1279] |
| Profile-relative paths | Hand-rolled ProfD joins | `openConnection({path: "tabs.sqlite"})` relative form | ProfD resolution by construction [VERIFIED: Sqlite.sys.mjs:1428-1435] |
| Chrome→backend tab sync | New IPC/write channel with auth/ordering/retry | Single-writer file + readonly handle (WAL gives cross-process readers) | A write channel across the trust boundary needs auth/replay/ordering the file topology never needs |
| Readonly enforcement | App-level "we only SELECT" discipline | `better-sqlite3` `{readonly: true}` at open + `Database.readonly` property | Engine-enforced; `Statement.readonly` flags stray writes [CITED: official api.md] |
| Tab identity | New UUID/rowid scheme | Registry opaque URI strings as TEXT PK | Stable identity exists and is bridge-frozen; a second identity is a second source of truth |

**Key insight:** Every hard problem (versioning, atomicity, corruption detection, cross-process reads, identity) already has a solved in-tree answer. Phase 12 selects and wires them; it invents no mechanics.

## Phase 11 Fixes to Honor

> The prompt names seven fixes from Phase 11 review; each maps to signed-design content the writer implements verbatim. Status of each in the design record:

| # | Fix | Design source | Phase 12 implementation rule |
|---|-----|---------------|------------------------------|
| 1 | Quarantine allocator N=max+1 | MIGRATIONS.md:56-60 (never reuse a suffix; `corrupt-1` exists → write `corrupt-2`, exercised by control C2) | Allocator scans existing `tabs.sqlite.corrupt-*` suffixes, takes max+1 starting at 1; second-incident behavior covered by roundtrip/soak self-tests |
| 2 | WAL pre-BEGIN | SCHEMA.md:51-54 (`journal_mode` immutable inside a txn — silent no-op — so `PRAGMA journal_mode=WAL` precedes `BEGIN`) | Writer issues WAL pin outside `executeTransaction` at creation and every rebuild; never inside the DDL transaction |
| 3 | Rebuild in txn | MIGRATIONS.md:63-67 (DDL + version bump + row inserts inside exactly one transaction) | Quarantine rebuild runs DDL, `setSchemaVersion`, and sessionstore-sourced inserts in a single `executeTransaction` |
| 4 | CHECKs | SCHEMA.md:34-39 (`CHECK(length(uri) > 0)`, `CHECK(last_active >= 0)`, exercised rejecting empty URI / negative last_active) | DDL implemented verbatim; writer never catches-and-masks constraint violations as success |
| 5 | Downgrade refusal | MIGRATIONS.md:21-26 + exercise control E (`user_version=99` refused, untouched) | Writer compares `getSchemaVersion()` against chain head; newer-than-head → refuse (log + degraded read-only/closed state), never rewrite |
| 6 | Readonly tripwire | MIGRATIONS.md:142-145 (unopenable counts as tripped; exact-`['ok']` keying) + SCHEMA.md startup `quick_check` | Every launch runs `PRAGMA quick_check` on the write connection; result must be exactly one `'ok'` row or the quarantine path runs; open failure counts as tripped |
| 7 | Sidecar cleanup | MIGRATIONS.md:62 (remove `-wal`/`-shm`/`-journal` after quarantine copy) + fixture WAL-sidecar note (:161-166, git-ignored, checkpoint-then-clean) | Quarantine removes sidecars post-copy; `*.sqlite-wal/shm` stay git-ignored; never commit a sidecar |

## Common Pitfalls

### Pitfall 1: Second writer (any process, any pretext)
**What goes wrong:** WAL/`-shm` coordination defeated → repeatable profile-DB corruption.
**Why it happens:** Backend opens read-write "just for one migration"; a test helper writes the live file; the soak script points at a profile instead of a temp copy.
**How to avoid:** Gate 1 negative scan over this repo's own trees (`powerbrowser/`, `theia/`, `scripts/`, `patches/` — NOT `upstream/`, which legitimately opens `places.sqlite` hundreds of times). Exactly one allowlisted open: the backend reader with `readonly: true`, asserted by the scan itself (derive-and-compare: every `new Database(` in `theia/` must carry the readonly flag or fail naming the line).
**Warning signs:** Any plan sentence with "the backend writes" or "temporarily open read-write."

### Pitfall 2: `journal_mode=WAL` set inside the transaction (silent no-op)
**What goes wrong:** Writer believes it pinned WAL; the database stays in rollback-journal mode; cross-process readers hit locking behavior the design never tested.
**Why it happens:** The natural code shape is "open → begin → DDL + pragmas → commit."
**How to avoid:** Fix #2: WAL pin executes before `executeTransaction` begins, at creation and every rebuild. Assert `PRAGMA journal_mode` returns `wal` after the pin (read-back, not assumption).
**Warning signs:** `journal_mode` appearing inside a migration/creation transaction body.

### Pitfall 3: Readonly reader crashes on first launch (missing file)
**What goes wrong:** Theia backend starts before the chrome writer ever creates `tabs.sqlite`; `new Database(path, {readonly: true})` throws; backend crashes or serves 500s until restart.
**Why it happens:** `fileMustExist` is ignored for readonly connections, so there is no "create-empty-if-missing" readonly mode — a missing file is an open failure, full stop.
**How to avoid:** Catch at open, serve empty results, retry open on subsequent queries (lazy re-open). Cover with a self-test case (reader against absent file → empty, then file appears → rows).
**Warning signs:** Reader code with no try/catch around `new Database`.

### Pitfall 4: Interpolating the URI string into SQL
**What goes wrong:** Registry URIs contain `:`, `.`, unicode, quotes (the fixture title `It's a "build" shell — ünïcödé ✓` exists precisely to catch this); interpolation breaks or injects.
**Why it happens:** PK is TEXT and "just a string" invites template literals.
**How to avoid:** Bound parameters on every statement (`execute(sql, params)` / `executeCached(sql, params)`); `setSchemaVersion`'s integer guard is the in-tree model. Threat T-11-07.
**Warning signs:** A template literal containing `${uri}` anywhere near SQL.

### Pitfall 5: Private filter placed after upsert (or in the wrong process)
**What goes wrong:** Private rows exist transiently (or permanently on crash between write and delete); reads/tests observe them.
**Why it happens:** "Write then filter on read" feels equivalent — it is not (crash windows, reader bugs).
**How to avoid:** `isWindowPrivate(chromeWin)` runs BEFORE the `INSERT … ON CONFLICT DO UPDATE`, at the single writer; no private column exists to select on (exclusion total). Note the API contract: pass a chrome window (`isChromeWindow` true) — content windows only warn; for a `<browser>` element prefer `isBrowserPrivate(aBrowser)` which resolves the chrome window itself [VERIFIED: PrivateBrowsingUtils.sys.mjs:35-47].
**Warning signs:** A `DELETE WHERE private` anywhere; a private flag column in any DDL draft.

### Pitfall 6: Registry-shape drift via "just one query method"
**What goes wrong:** Query API added as `TabUriRegistry` members → `gui04-registry-shape` fails on surplus → either the gate is (wrongly) edited to accommodate or store work stalls.
**Why it happens:** The registry is the natural home for URI-keyed queries.
**How to avoid:** New backend module / new beside-registry module; the frozen surface (5 exports, 4 members) stays byte-identical.
**Warning signs:** A diff touching `tab-uri-registry.ts` or `view-factory-table.ts` in a store plan.

### Pitfall 7: Absence test without a positive control
**What goes wrong:** "No private rows" passes forever because the drive never produced any tab events at all (private or otherwise).
**Why it happens:** The test constructs its own fixtures instead of exercising the emitter.
**How to avoid:** Gate 4 drives real private-window tab events through the real writer, then asserts absence — AND drives the same events through a public window asserting rows exist. The project's absence-assertion rule permits exactly this shape.
**Warning signs:** An absence gate with no emitter-exercising positive control.

### Pitfall 8: Soak/roundtrip pointed at the live profile
**What goes wrong:** Test corrupts or locks the developer's real `tabs.sqlite` / `places.sqlite`; WAL sidecars leak into the repo.
**Why it happens:** Hardcoded profile paths; stage dir inside the repo.
**How to avoid:** Temp profile per run (`mktemp -d`, space-free, outside repo); fixture discipline from Phase 11 (mutate copies, byte-identity the committed fixture); sidecars removed after handles close (checkpoint-then-clean per MIGRATIONS.md:161-166).
**Warning signs:** A test path containing `~/.mozilla`, `$HOME`, or the repo root.

### Pitfall 9: better-sqlite3 installed outside the Nix shell
**What goes wrong:** `yarn` on the host resolves a different Node/ABI; native binding mismatches at runtime (`better_sqlite3.node` built for the wrong Node).
**Why it happens:** `node` works on host, so `yarn` feels like it should too — it does not (CLAUDE.md Environment).
**How to avoid:** Install + build inside `nix develop .#theia` only; engines `node ≥22` matches host v24 but the shell's pinned Node is authoritative.
**Warning signs:** `yarn add` in a plan action without the `nix develop .#theia --command` wrapper.

## Code Examples

Verified patterns (skeletons for the planner; bodies are Phase 12):

### Open + version-guard + WAL pre-BEGIN (chrome side)

```javascript
// Source: Sqlite.sys.mjs:1408 (openConnection), :1431-1433 (ProfD-relative), :1872-1885 (version)
const conn = await lazy.Sqlite.openConnection({ path: "tabs.sqlite" }); // relative → ProfD
// WAL pin OUTSIDE any transaction (silent no-op inside one):
await conn.execute("PRAGMA journal_mode=WAL;");
const v = await conn.getSchemaVersion();
if (v === 0) {
  await conn.executeTransaction(async () => {
    await conn.execute(CREATE_TABS_V1_SQL); // SCHEMA.md DDL verbatim
    await conn.execute("CREATE INDEX idx_tabs_last_active ON tabs (last_active);");
    await conn.setSchemaVersion(1);
  });
} else if (v > CURRENT_CHAIN_HEAD) {
  /* downgrade refusal: log, leave untouched, degraded mode — never rewrite */
} else {
  await runForwardMigrations(conn, v); // each in executeTransaction, tableExists/indexExists pre-checks
}
```

### Write-through with bound params + private filter (chrome side)

```javascript
// Source pattern: Sqlite.sys.mjs execute(sql, params) (:734); UPSERT needs SQLite 3.24+,
// vendored is 3.53.2 [CITED: upstream/third_party/sqlite3/src/sqlite3.h:149]
// Private filter BEFORE upsert [VERIFIED: PrivateBrowsingUtils.sys.mjs:18-28]:
// DATA_q5W8dM3n_START
//   isWindowPrivate: function pbu_isWindowPrivate(aWindow) {
//     ...
//     return this.privacyContextFromWindow(aWindow).usePrivateBrowsing;
//   },
// DATA_q5W8dM3n_END
if (lazy.PrivateBrowsingUtils.isWindowPrivate(chromeWin)) {
  return; // exclusion total — never reaches SQL
}
await conn.executeCached(
  `INSERT INTO tabs (uri, url, title, last_active) VALUES (:uri, :url, :title, :t)
   ON CONFLICT (uri) DO UPDATE SET url=excluded.url, title=excluded.title, last_active=excluded.last_active`,
  { uri, url, title, t: Date.now() }
);
```

### Startup integrity tripwire (chrome side)

```javascript
// Exact-['ok'] keying; unopenable counts as tripped:
let ok = false;
try {
  const rows = await conn.execute("PRAGMA quick_check");
  ok = rows.length === 1 && rows[0].getString(0) === "ok";
} catch {
  ok = false;
}
if (!ok) { await quarantineAndRebuild(conn); } // backupToFile → .corrupt-N (N=max+1)
                                               // → rm sidecars → rebuild FROM sessionstore in ONE txn
```

### Sessionstore read projection (chrome side)

```javascript
// Source: SessionStore.getBrowserState returns a JSON STRING
// [VERIFIED: upstream/browser/components/sessionstore/SessionStore.sys.mjs:3938-3948]:
// DATA_z8P4wL6k_START
//   getBrowserState: function ssi_getBrowserState() {
//     let state = this.getCurrentState();
//     ...
//     return JSON.stringify(state);
//   },
// DATA_z8P4wL6k_END
const state = JSON.parse(lazy.SessionStore.getBrowserState());
for (const win of state.windows ?? []) {
  for (const tab of win.tabs ?? []) {
    const entry = tab.entries?.[tab.index - 1];
    // { url: entry.url, title: entry.title } → projection / rebuild source
  }
}
```

### Second-writer scan skeleton (gate 1, --quick)

```javascript
// Derive-from-tree: walk this repo's own trees (powerbrowser/, theia/, scripts/, patches/),
// collect profile-DB open call shapes (openConnection, Services.storage, new Database, openDatabase),
// fail naming file:line unless allowlisted: (a) inside powerbrowser/shell/, or
// (b) the single backend reader call carrying readonly:true. --self-test plants
// an offending open (must go red naming it) and removes the readonly flag (must go red).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Sqlite.jsm` / `Services.storage` legacy names | `Sqlite.sys.mjs` ES module, promise API + transaction queue | Gecko modernization (pre-ESR era) | Phase 12 targets the ES-module path only [ASSUMED naming history; in-tree file verified] |
| Sessionstore-only tab memory | Sessionstore authoritative + SQLite projection alongside | This design (v1.2) | Restore path unchanged; store additive, zero restore risk |
| DuckDB candidate | SQLite only; DuckDB carve-out as read-side accelerator over exports | 2026-09-05 VERDICT.md | Zero DuckDB surface in Phase 12 |
| Per-phase verify drivers | Single `verify-platform.sh` registry | Phase 01 consolidation | Store gates are registry rows with `--self-test` |
| `node:sqlite` as backend reader | `better-sqlite3@13.0.3` readonly | Standing engine decision | Revisit at next Node re-pin only |

**Deprecated/outdated:**
- DuckDB as system of record: rejected (topology, workload, cost, format).
- Backend opening profile SQLite even readonly: forbidden by invariant (WAL-checkpoint participation), not merely discouraged.

## Rebase-Drill Scope

The live ESR rebase drill runs over the new touchpoints once catalogue rows land: `scripts/rebase-upstream.sh --tag <NEXT_ESR> [--dry-run]` (composes fetch + apply-patches replay, gates on `check-patch-surface.sh`; real path re-clones `upstream/`, so local exercise is `--dry-run` until a next ESR tag exists). Drill asserts: (1) patch 020's `DIRS` line still the whole Gecko-side surface (store adds no patch); (2) every pinned `upstream/` line cited here (`Sqlite.sys.mjs`, `PrivateBrowsingUtils.sys.mjs`, `SessionStore*.sys.mjs`, `Places*.sys.mjs`, `tabbrowser.js` event lines, `sqlite3.h` version) still resolves — re-pin moved lines get re-pinned in the same commit, never silently; (3) `--quick` green plus the store gates green on the rebased tree; (4) `git -C upstream diff` empty (no hand-edits smuggled in during the drill).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Services.wm.getEnumerator("navigator:browser")` + per-window `TabOpen`-family listeners is a viable chrome-side trigger (pattern CITED from upstream browser.js:748, not exercised in this tree) | Pattern 2 | LOW — standard platform API; planner proves with the writer tracer before building gates on it |
| A2 | Readonly SQLite open of a nonexistent file fails (so the reader-catches-missing-file rule holds) | Pitfall 3 | LOW — SQLite `SQLITE_CANTOPEN` on readonly-missing is long-standing engine behavior; self-test case covers it either way |
| A3 | `jar.mn`-only addition stays on the fast preprocessing tier (inverse of the XPCOM tier-3 rule stated in moz.build) | Project Structure | LOW — if wrong, cost is a tier-3 build, not a redesign; planner confirms on first build |
| A4 | Legacy wrapper names (`Sqlite.jsm`) must not appear in new code | State of the Art | NEGLIGIBLE — in-tree file verified as `Sqlite.sys.mjs` |
| A5 | Private windows are reachable in the harness the absence gate uses (headless or Xvfb) | Open Question 2 | MEDIUM — determines gate-4 harness choice; planner spikes display availability first (existing `harness-display-available` check is the model) |

## Open Questions

1. **Event-source→URI-key binding (the planner's primary decision)**
   - What we know: PK must be the canonical opaque `scheme:path` registry emission bound as a parameter, never parsed; no Theia→chrome data channel exists; stock windows expose `TabOpen`/`TabClose`/`TabSelect`/`TabAttrModified` + `sessionstore-state-write-complete` chrome-side, all verified this session.
   - What's unclear: Whether the v1.2 live trigger observes stock-window tabs (needs a beside-registry browser-tab URI emission — new module, frozen shape untouched) or sessionstore-sweep-only, and where Theia-widget events enter (v1.3 bridge).
   - Recommendation: Tracer wires stock-window listeners + sessionstore sweep with a beside-registry emission function; document the Theia-widget seam for v1.3. Do NOT create a Theia→chrome channel in Phase 12.

2. **Absence-gate display requirements**
   - What we know: Gate 4 needs a real private window through the real writer; `harness-display-available` (Xvfb fallback) is the established pattern for display-dependent checks.
   - What's unclear: Whether headless supports private-window tab events sufficiently, or gate 4 must use `start_shell_display`.
   - Recommendation: Spike headless-first; fall back to the Xvfb harness; record the choice in the plan.

3. **Soak-gate placement (live vs static halves)**
   - What we know: The writer is chrome JS — drivable only via built binary (or xpcshell, unproven in this tree); fixture-copy discipline from Phase 11 covers the static half under `--quick`.
   - What's unclear: Whether an xpcshell drive of the writer exists cheaply, or the live half rides the full-tier binary launch like the side04/shell03 checks.
   - Recommendation: Static fixture half `--quick` (fast feedback), live interleaved tab+bookmark soak full-tier; do not block the writer tracer on xpcshell.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node (host) | Version check only | ✓ | v24.19.0 (≥22 per better-sqlite3 engines) | `nix develop .#theia` pinned Node (authoritative) |
| `nix develop .#theia` (yarn + python3 + gnumake + node-gyp-bin) | `better-sqlite3` install (+ source-build fallback) | ✓ | flake-defined | Prebuilt binaries (normal path) |
| `upstream/` pinned checkout | All source pins above | ✓ | SQLite 3.53.2 vendored | `scripts/fetch-upstream.sh` re-fetch |
| `better-sqlite3@13.0.3` | Theia backend reader | ✗ (not installed — Phase 12 installs) | 13.0.3 on npm, legitimacy OK | None needed (install is planned work) |
| `sqlite3` CLI | Ad-hoc inspection | ✗ (per 11-RESEARCH) | — | Node scripts via `better-sqlite3`; never a gate |
| Built binary (`objdir/dist/bin/powerbrowser`) | Gates 3–4 live halves, soak live half | Unknown (Phase 10–11 deferred builds) | — | Planner checks at Wave 0; tier-3 build is 47–54 min — schedule accordingly |
| Gecko build toolchain (`nix develop .#firefox`) | Only if XPCOM/jar packaging surprises arise | Presumed | — | No compiled surface is planned, so not needed |

**Missing dependencies with no fallback:** none blocking the writer tracer (chrome JS needs the built binary only for live verification, not for writing code).
**Missing dependencies with fallback:** `better-sqlite3` uninstalled → install in Plan 2; `sqlite3` CLI absent → Node scripts.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (no unit-test runner in tree — no jest/vitest/mocha, no `*.test.*`) |
| Config file | Registry itself (`CHECKS=(…)` array; base = `--quick`, `QUICK -eq 0` append = full-tier) |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh` |
| Single-gate run | `scripts/verify-platform.sh --only <label>` (per-task sampling) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SQL-01 | Writer persists rows; single-writer; sessionstore authoritative | unit (chrome logic) + gate 1 scan + gate 3 roundtrip | `--only sql-store-second-writer`; `--only sql-store-roundtrip` | ❌ Wave 0 |
| SQL-04 | Places/sessionstore/query reads; private absence | gate 4 absence (+ positive control) | `--only sql-store-absence` | ❌ Wave 0 |
| SQL-05 | Gates green: scan, soak, roundtrip, shape untouched, rebase drill | 4 registry rows + drill | `--quick` (gates 1, static halves) + full (gates 2-live, 3, 4) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick` (residue scan sees staged files; shape + catalogue rows green).
- **Per wave merge:** `--quick`; full suite when a live half lands.
- **Phase gate:** Full suite green (or recorded-deferred per nonstop standing rule) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `powerbrowser/shell/` writer surface (wrappers ± new module + `jar.mn` line) — covers SQL-01
- [ ] `powerbrowser/INTERNAL-APIS.md` new catalogue rows — covers SQL-01 boundary half
- [ ] `theia/extensions/tab-uris/src/node/` query backend module + `package.json` backend entry + `better-sqlite3` install — covers SQL-04
- [ ] `scripts/verify-sql-store-{second-writer,soak,roundtrip,absence}.mjs` (each with `--self-test`) + 8 registry rows — covers SQL-05
- [ ] Temp-profile + fixture-copy harness conventions (space-free, outside repo, sidecar cleanup) — covers Pitfall 8

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Store holds no credentials; token gate is separate and untouched |
| V3 Session Management | No | No sessions in SQL; `POWERBROWSER_TOKEN` never touches SQLite (AUTHORITY row 6; schema review rejects credential-shaped columns) |
| V4 Access Control | Yes | Single chrome-side writer; backend `readonly: true` engine-enforced at open; gate-1 negative scan |
| V5 Input Validation | Yes | Bound parameters on every statement; URI never interpolated; `setSchemaVersion` integer guard in-tree; CHECKs in DDL |
| V6 Cryptography | No | No crypto in the store; private-tab rule is total exclusion, not redaction/encryption |
| V14 Configuration | Yes (adjacent) | No manifest flag; filename/version fixed platform content, never downstream-settable |

### Known Threat Patterns for SQLite tab store

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Second writer corrupts profile DBs | Tampering | Single-writer invariant + gate-1 scan (allowlist: shell dir + one readonly reader) |
| SQL injection via URI/title strings | Tampering | Parameter binding everywhere; quote-unicode fixture row proves it |
| Private-tab data persisted or leaked | Information disclosure | Exclusion before upsert at single writer; no private column; gate-4 emitter-exercising absence |
| Backend opens `places.sqlite` (even readonly) | Tampering | Own-file rule; Places reads chrome-side only; backend touches dedicated file readonly |
| Corrupt DB deletes data on "recovery" | Denial of service | Quarantine-not-delete (N=max+1) + rebuild FROM sessionstore in one txn |
| Token/secret reflected into rows | Information disclosure | AUTHORITY row 6; write-path review confirms bound params carry tab fields only |

## Sources

### Primary (HIGH confidence)
- Pinned-tree reads this session: `upstream/toolkit/modules/Sqlite.sys.mjs` (:700-739, :776-799, :1265-1279, :1428-1435, :1872-1885, :2138-2164 + :626-633); `upstream/toolkit/modules/PrivateBrowsingUtils.sys.mjs` (:18-47); `upstream/browser/components/sessionstore/SessionStore.sys.mjs` (:300-321, :3938-3948); `upstream/browser/components/sessionstore/SessionSaver.sys.mjs` (:375-383); `upstream/browser/components/tabbrowser/content/tabbrowser.js` (:4978-4985); `upstream/toolkit/components/places/{History,Bookmarks,PlacesUtils}.sys.mjs` (:137-144, :1510-1524, :1379-1391); `upstream/third_party/sqlite3/src/sqlite3.h` (:149, via grep)
- This-tree reads: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (whole file), `powerbrowser/shell/{jar.mn,moz.build}`, `powerbrowser/INTERNAL-APIS.md`, `scripts/{verify-platform.sh:3551+,4209-4216,check-internals-boundary.sh:27-65,verify-registry-shape.mjs:55-71}`, `flake.nix:25-45`, `theia/{applications/browser/package.json:40,extensions/tab-uris/package.json,extensions/token-gate/package.json:9-13}`, `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:90-96`
- Official docs fetched this session: better-sqlite3 `docs/api.md` (`readonly` option, `prepare/get/all`, named params, `Database.readonly`, `fileMustExist`-ignored-for-readonly) — digest cached via `research-store`
- Seam outputs: `package-legitimacy check` → better-sqlite3 OK (10.4M/wk, no postinstall); `classify-confidence` tiers honored (registry-metadata = MEDIUM, hence official-docs confirmation above)

### Secondary (MEDIUM confidence)
- Grep-observed (not Read) pinned-tree usages: `Services.wm.getEnumerator("navigator:browser")` (browser.js:748), `TabSelect`/:1867, `TabAttrModified`/:2161, `TabClose`/:5924, SQLite `SQLITE_VERSION 3.53.2` (sqlite3.h:149)
- In-repo prior research (unanimous, cited): `.planning/research/duckdb-vs-sqlite/{VERDICT,01-STACK,02-WORKLOAD,03-INTEGRATION,04-PITFALLS}.md`; Phase 11 `AUTHORITY.md`, `SCHEMA.md`, `MIGRATIONS.md`, `11-REVIEW.md` (§6 handoff = the 4 gate specs), `11-RESEARCH.md`, `11-PATTERNS.md`

### Tertiary (LOW confidence)
- Legacy wrapper-name history, `node:sqlite` revisit timing, xpcshell viability for the soak — training knowledge, flagged [ASSUMED] where used

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — primitives read line-verbatim; engine pre-decided unanimously; reader legitimacy + official API confirmed
- Writer architecture: HIGH — boundary mechanics, catalogue discipline, and all seven Phase 11 fixes traced to design sources
- Trigger/URI-key binding: MEDIUM — constraints fixed and verified, but the planner chooses the emission shape (Open Question 1)
- Gates: HIGH — four specs signed in Phase 11 review; quick/full classification verified against the registry runner
- Pitfalls: HIGH — corruption record cross-checked; three new build-specific pitfalls (missing-file reader crash, WAL-in-txn no-op, host-yarn ABI mismatch) grounded in verified sources

**Research date:** 2026-09-05
**Valid until:** 30 days (stable domain: vendored SQLite semantics, frozen contracts; only `better-sqlite3` re-pin state could drift, and it is Phase 12's own install)

---

## Recommended Plan Decomposition (for planner)

Tracer-first, sequential (writer before reads before gates — each plan proves its layer live before the next builds on it):

1. **12-01 Writer + roundtrip tracer (SQL-01 core, SQL-05 gate 3 scaffolding):** `Sqlite` lazy import + `openTabStore`/`writeTabRow`/`removeTabRow` wrappers in `PowerBrowserAPI.sys.mjs` (+ optional `TabStore.sys.mjs` + `jar.mn` line — no XPCOM, no patch change); DDL verbatim from SCHEMA.md with WAL pre-BEGIN, CHECKs, `user_version=1`; bound-parameter UPSERT; `isWindowPrivate` filter before upsert; quarantine path honoring all seven §Phase 11 fixes; stock-window tab listeners + sessionstore-sweep trigger (planner pins URI emission per Open Question 1); new catalogue rows; roundtrip proven on a temp DB (URI→row→restart→reopen, restored set equals sessionstore). Must-haves: `--quick` green, `internals-catalogue` green, `gui04-registry-shape` untouched.
2. **12-02 Read paths + absence (SQL-04):** `better-sqlite3@13.0.3` install in the Nix theia shell; new `src/node/` backend module in `@powerbrowser/tab-uris` + `package.json` backend entry (token-gate analog); readonly open with missing-file tolerance; chrome-side Places reads (`History.fetch`/`Bookmarks.fetch`/`getFolderContents`) + `getBrowserState` projection behind boundary wrappers + catalogue rows; gate-4 emitter-exercising absence test with positive control (full-tier; display approach per Open Question 2).
3. **12-03 Gates + rebase drill (SQL-05):** gate-1 second-writer scan + self-test (`--quick`); gate-2 soak (static fixture half `--quick`, live interleaved tab+bookmark half full-tier, ends `integrity_check` exactly `['ok']`); gate-3 roundtrip promoted to registry row; gate-4 promoted; all eight rows (4 + 4 self-tests) with both-direction faults; live ESR rebase drill over new touchpoints per §Rebase-Drill Scope (dry-run locally until a next tag exists); `--quick` green at closeout, full suite green or recorded-deferred per standing nonstop rule.
