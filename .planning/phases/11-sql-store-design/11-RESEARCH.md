# Phase 11: SQL Store Design - Research

**Researched:** 2026-09-05
**Domain:** SQLite tab-store design (authority rules, schema, migrations, corruption path) — design-only, no store code
**Confidence:** HIGH

## Summary

Phase 11 writes down the SQL tab store's authority rules and schema and gets them reviewed and signed before any store code exists (Phase 12). The engine question is already closed: SQLite only, per the unanimous 2026-09-05 verdict from four parallel researchers [CITED: .planning/research/duckdb-vs-sqlite/VERDICT.md]. The integration shape is also already decided and documented: single chrome-side writer via `Sqlite.sys.mjs` behind `PowerBrowserAPI.sys.mjs`, own `tabs.sqlite` in the profile dir, sessionstore stays authoritative for restore, registry URIs are the join key, Theia backend holds a readonly handle via `better-sqlite3@13.0.3` [CITED: .planning/research/duckdb-vs-sqlite/03-INTEGRATION.md].

This research confirms every load-bearing primitive for that design exists in the pinned tree today: `upstream/toolkit/modules/Sqlite.sys.mjs` provides `openConnection`, promise-based `execute`, `executeTransaction`, `getSchemaVersion`/`setSchemaVersion` over `PRAGMA user_version`, `tableExists`, readonly `clone`, and `backupToFile` [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1408,1872-1885,776,2138,626,1265]. Official SQLite docs confirm `integrity_check` returns exactly one `'ok'` row when clean and `user_version` is the application-defined schema-version integer [CITED: sqlite.org/pragma.html]. `better-sqlite3@13.0.3` is legitimate and current (legitimacy gate: OK, ~10.4M weekly downloads, no postinstall) [VERIFIED: npm registry].

**Primary recommendation:** Decompose into 3 sequential plans — authority/invariant table first and signed before schema work (the success criteria mandate this order), then schema + migration plan with the forward-only chain exercised against fixture DBs via throwaway scripts (not store code, preserving "design only"), then a review-sign gate that also proves the static gates stayed green.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — discuss phase was skipped per user setting (`workflow.skip_discuss`). No locked implementation decisions exist.

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop — verification deferred until roadmap fully executed; plan-phase with --no-reversibility-gates; audit gaps accepted; halt only on blocker surviving 3 retries.

Engine decided: SQLite. Gecko Sqlite.sys.mjs writes; Theia backend reads dedicated file only via better-sqlite3@13.0.3 (readonly: true); node:sqlite revisit at next Node re-pin.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SQL-02 | Authority/invariant table written and reviewed BEFORE schema — single chrome-side writer, sessionstore authoritative for restore, registry URIs as join key, Theia backend never opens profile SQLite, own-file rule | Integration shape (§Architecture Patterns, Pattern 1–2); boundary catalogue mechanics; responsibility map; prior-research reconciliation table |
| SQL-03 | Schema + migration plan reviewed — tabs table on URI PK, `schema_version`/`user_version` from day one, forward-only migrations exercised against fixture DBs, quarantine-not-delete corruption path, private-tab exclusion rule, fixed `tabs.sqlite` filename as platform content (not manifest) | `user_version` primitive + migration pattern; `integrity_check` corruption path; URI-PK key-shape analysis; private-exclusion design + absence-test requirement; fixture-DB exercise procedure |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Binding directives the plan must not violate:

1. **Never fork or patch Theia core** — Theia-side additions are `@powerbrowser/*` extensions; upstream adopted by re-pin only. The design must not propose Theia core edits (the query API lands on `@powerbrowser/tab-uris` in Phase 12, not in core).
2. **Never modify Gecko outside the patch stack** — `upstream/` never hand-edited; all Gecko reach-through lives in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in `powerbrowser/INTERNAL-APIS.md`. The design's writer methods must be thin `PowerBrowserAPI` wrappers + new catalogue rows; patch stack stays at 2 (no compiled surface, no IDL, no `moz.build` for the store).
3. **Design for the bridge** — nothing welds Theia to full-window presentation; `TabUriRegistry`'s exported shape is frozen by `scripts/verify-registry-shape.mjs`. The design must consume URI strings as opaque keys and propose zero registry shape changes.
4. **Space-free checkout path** — irrelevant to doc-writing, but fixture-DB paths in the migration exercise procedure must not assume spaces work.
5. **Theia is default GUI; stock chrome reachable; no custom browser chrome authored** — no GUI surface in this design (explicit success criterion 3).
6. **One driver, one registry** — any new check Phase 11's docs specify for Phase 12 (second-writer scan, integrity soak, roundtrip, absence test) must be specified as `verify-platform.sh` registry rows with `--self-test`, never sibling drivers.
7. **Derive-from-tree-and-compare; presence assertions, never absence** — with one deliberate exception: the private-tab exclusion rule REQUIRES an emitter-exercising absence test (the project's absence-assertion rule: an absence assertion is only valid when the emitter is proven to be the code under test). The schema must support that test (see Pitfall 5).
8. **Residual-brand scan is a permanent gate** — new design docs must not spell the originating product's token anywhere (only `inventory/brand-tokens.json` may name it), and new files must be staged before trusting a green scan.
9. **Patches are regenerated, never text-edited** — the design must not propose hand-editing patch hunks (it doesn't need any patch change at all).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tab-write capture (open/close/navigate/activate → row upsert) | Gecko chrome (`PowerBrowserAPI` + supervisor) | — | Tab events originate chrome-side; single-writer invariant forbids any other writer |
| Tab-row persistence (`tabs.sqlite`, migrations, integrity) | Gecko chrome (`Sqlite.sys.mjs` connection) | — | `Sqlite.sys.mjs` is profile-dir-aware and already vendored; WAL single-writer is its home turf |
| Restore authority (what reopens after restart) | Gecko platform (sessionstore) | — | Locked invariant: sessionstore stays authoritative; store is a projection, never the restore source |
| Tab identity / join key | Theia frontend (`TabUriRegistry`, existing) | — | URIs are minted and resolved Theia-side; chrome treats them as opaque TEXT keys |
| Read/query serving to Theia UI | Theia backend (Node, readonly handle) | Chrome-side readonly clone for places/sessionstore projection | Backend must never open profile SQLite read-write; places/sessionstore reads stay chrome-side |
| Private-tab exclusion enforcement | Gecko chrome (write path filter) | — | Exclusion at the single writer is one enforcement point; backend/test only observes absence |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `Sqlite.sys.mjs` (in-tree Gecko module) | ESR-pinned tree (file: 2252 lines, verified on disk) | Chrome-side open/execute/transaction/schema-version/backup | Zero new deps, zero new build targets, profile-dir-aware, WAL-capable; every first-party consumer already sits on it [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1408] |
| SQLite `PRAGMA user_version` via `getSchemaVersion`/`setSchemaVersion` | SQLite ≥3.7.0 era (WAL floor) | Forward-only migration chain, version 1 from day one | Decades-stable mechanism; in-tree wrapper is a thin integer guard over the pragma [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1872-1885] |
| SQLite `PRAGMA integrity_check` / `quick_check` | Same engine | Startup corruption tripwire feeding quarantine-not-delete | Returns exactly one `'ok'` row when clean, else one row per problem [CITED: sqlite.org/pragma.html] |
| `better-sqlite3` (Theia backend reader only) | 13.0.3 (2026-08-05, engines: node ≥22) | Readonly handle on the dedicated file | N-API, ~10.4M weekly downloads, small native addon, prebuilds cover Node 22; readonly enforced at open [VERIFIED: npm registry] |
| SQLite WAL mode | Persistent once set | One chrome writer + N cross-process readers | The decided topology's natively supported mode; what Firefox itself relies on for places-adjacent access [CITED: .planning/research/duckdb-vs-sqlite/03-INTEGRATION.md] |

Version verification (run this session):
```bash
npm view better-sqlite3 version   # → 13.0.3 [VERIFIED: npm registry]
npm view better-sqlite3 engines   # → { node: '>=22' } (host node v24.19.0 ✓)
npm view better-sqlite3 scripts.postinstall  # → null (no postinstall risk)
wc -l upstream/toolkit/modules/Sqlite.sys.mjs  # → 2252, exists in pinned tree
```

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Sqlite.sys.mjs` `executeTransaction` | in-tree | Atomic write-through + retention-prune in one transaction | Every multi-statement writer path [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:776] |
| `Sqlite.sys.mjs` `tableExists` / `indexExists` | in-tree | Migration pre-checks without raw `sqlite_master` queries | Migration guard clauses [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:2138] |
| `Sqlite.sys.mjs` `clone(readOnly)` | in-tree | Chrome-side read paths (places exposure, integrity checks) off the write connection | Read projection without a second connection [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:626] |
| `Sqlite.sys.mjs` `backupToFile` | in-tree | Quarantine path primitive (copy-then-rename rather than delete) | Corruption recovery procedure [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1265] |
| Places read APIs (`PlacesUtils.bookmarks`/`history`) | in-tree | Bookmark/history exposure without raw `places.sqlite` writes | Phase 12 read paths; never raw places writes [ASSUMED — API surface not re-read this session] |
| Sessionstore (`sessionstore.jsonlz4` / SessionStore) | in-tree | Restore authority + quarantine rebuild source | Deliberately untouched today per D-107/D-108; the store rebuilds FROM it, never replaces it [VERIFIED: powerbrowser/INTERNAL-APIS.md:50-54] |
| Private-window detection (e.g. `PrivateBrowsingUtils.isWindowPrivate`) | in-tree | Private-tab exclusion filter at the writer | Exact API name to be pinned during schema design [ASSUMED — not re-read this session; see Open Questions] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite | DuckDB | REJECTED unanimously 2026-09-05: forbids RW+RO cross-process sharing (the decided topology fails at open), OLAP engine ~8–11× slower on single-row writes, format revs per minor, ~40MB binaries [CITED: .planning/research/duckdb-vs-sqlite/VERDICT.md] |
| `Sqlite.sys.mjs` wrapper | Raw mozStorage / direct `Services.storage` | Rejected: loses the transaction queue, stuck-transaction rollback, and profile-aware open every first-party consumer already relies on [ASSUMED] |
| `better-sqlite3` reader | `node:sqlite` | Revisit at next Node re-pin per CONTEXT.md; not the design's reader today [ASSUMED] |
| Own `tabs.sqlite` | New tables in `places.sqlite` | OUT OF SCOPE (REQUIREMENTS.md): upstream-owned schema, every ESR rebase may migrate it |
| Sessionstore stays authoritative | Store-as-restore-authority | OUT OF SCOPE: needs a dual-write + restore-parity proof first |

**Installation:** None in Phase 11 — design only, no store code, no new dependencies. `better-sqlite3@13.0.3` installation belongs to Phase 12 (with a `checkpoint:human-verify` only if its legitimacy regresses; it is OK today).

## Package Legitimacy Audit

> Phase 11 installs nothing. This audit pre-clears the one package the design names for Phase 12 so the planner can schedule its install without a gate.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `better-sqlite3` | npm, 13.0.3 (2026-08-05) | ~9 yrs (first publish 2017) | ~10.4M/wk | github.com/WiseLibs/better-sqlite3 | OK | Approved for Phase 12 install |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious (SUS):** none.
**Postinstall check:** `npm view better-sqlite3 scripts.postinstall` → null. No network/filesystem postinstall risk [VERIFIED: npm registry].

*No packages in this research are tagged [ASSUMED]: the only install the design implies (`better-sqlite3`) was verified against the registry AND the legitimacy gate this session.*

## Architecture Patterns

### System Architecture Diagram

```text
                    ┌─────────────────────────────────┐
                    │  Tab events (open/close/        │
                    │  navigate/activate, incl.       │
                    │  private windows)               │
                    └───────────────┬─────────────────┘
                                    │  (1) write-through,
                                    │  private filtered HERE
                                    ▼
┌──────────────┐   ┌─────────────────────────────────┐   ┌──────────────────┐
│ TabUriRegistry│──▶│  PowerBrowserAPI.sys.mjs        │──▶│  tabs.sqlite     │
│ (Theia       │URI │  SOLE boundary: thin wrappers  │SQL│  own file,       │
│  frontend)   │str │  openTabStore/writeTabRow/      │WAL│  ProfD,          │
│  opaque key  │ing │  readTabRows/prune (2–4 new     │   │  user_version=N  │
│  source      │s   │  catalogue rows, Phase 12)      │   │                  │
└──────────────┘   └─────────────────────────────────┘   └────────┬─────────┘
         ▲                       │                               │ readonly
         │ join key              │ (2) sessionstore               │ handle
         │ (TEXT PK)             │     stays RESTORE authority    ▼
         │                       │                      ┌──────────────────┐
         │                       │                      │ Theia backend    │
         │                       │                      │ better-sqlite3   │
         │                       │                      │ readonly: true   │
         │                       │                      │ query API on     │
         │                       │                      │ @powerbrowser/   │
         │                       │                      │ tab-uris (Ph.12) │
         │                       ▼                      └──────────────────┘
                ┌─────────────────────────────────┐
                │ sessionstore.jsonlz4            │
                │ restore authority + quarantine  │
                │ rebuild source; places.sqlite   │
                │ read via Places APIs (never raw │
                │ places writes, never backend    │
                │ opens of profile SQLite)        │
                └─────────────────────────────────┘

Corruption path: startup integrity_check → NOT ok → quarantine
(tabs.sqlite → tabs.sqlite.corrupt-N, sidecar state removed) →
rebuild live rows from sessionstore + registry → degraded mode, never delete.
```

A reader traces the primary use case: tab event → single chrome writer → `tabs.sqlite` row keyed by registry URI string → Theia backend serves reads from its readonly handle; on corruption the file is quarantined and live tabs rebuild from sessionstore.

### Recommended Project Structure

Phase 11 creates docs only (tracer-first precedent: authority doc before schema doc):

```text
.planning/phases/11-sql-store-design/
├── 11-CONTEXT.md        # exists (discuss skipped)
├── 11-RESEARCH.md       # this file
├── 11-01-PLAN.md        # authority/invariant table + sign-off
├── 11-02-PLAN.md        # schema + migration plan + sign-off
├── 11-03-PLAN.md        # review-sign gate (both docs signed, gates green)
├── authority/           # SQL-02 deliverable: AUTHORITY.md + SIGN-OFF.md
│   ├── AUTHORITY.md     # invariant table (writer, restore, join key, never-open, own-file)
│   └── SIGN-OFF.md      # reviewer signature record
├── schema/              # SQL-03 deliverable: SCHEMA.md + MIGRATIONS.md + SIGN-OFF.md
│   ├── SCHEMA.md        # tabs table DDL, URI PK, indexes, user_version=1, filename, platform-content note
│   ├── MIGRATIONS.md    # forward-only chain v1→vN, fixture-DB exercise log, quarantine procedure
│   └── SIGN-OFF.md      # reviewer signature record
└── fixtures/            # throwaway-versioned DBs v1..vN for exercising migrations (test data, not store code)
```

Design-doc location note: keep the deliverables under the phase dir (planning record), NOT under `powerbrowser/` — the residual-brand scan covers the whole tree and planning docs are its normal home; placing design docs in `powerbrowser/` risks implying shipped surface.

### Pattern 1: Single chrome-side writer behind the sole boundary
**What:** All tab writes flow `tab event → PowerBrowserAPI.sys.mjs method → Sqlite.sys.mjs → tabs.sqlite`. The import lands inside the boundary file, which the guard scan excludes by basename — so `FORBIDDEN_PATTERNS` needs zero changes and the `--catalogue` gate keeps passing with 2–4 new rows of the existing shape [CITED: .planning/research/duckdb-vs-sqlite/03-INTEGRATION.md].
**When to use:** Every writer method Phase 12 adds (`openTabStore`/`writeTabRow`-class wrappers, exact names at planner's discretion).
**Example:**
```javascript
// Source: upstream/toolkit/modules/Sqlite.sys.mjs (pinned tree) + powerbrowser/shell/PowerBrowserAPI.sys.mjs:14-24 (lazy-getter block pattern)
// DATA_Q7mK2vRx_START
ChromeUtils.defineESModuleGetters(lazy, {
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
});
// DATA_Q7mK2vRx_END
// Then thin never-throw/async wrappers on PowerBrowserAPI, one INTERNAL-APIS.md row each.
// Open primitive (relative paths resolve against ProfD):
// DATA_b4Tn8FwD_START
//   // Retains absolute paths and normalizes relative as relative to profile.
//   path = PathUtils.joinRelative(
//     Services.dirsvc.get("ProfD", Ci.nsIFile).path,
//     options.path
//   );
// DATA_b4Tn8FwD_END
// [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:15-23 (lazy-getter shape in PowerBrowserAPI.sys.mjs), :1431-1433 (ProfD-relative open)]
```

### Pattern 2: `user_version` forward-only migrations from day one
**What:** `tabs.sqlite` ships with `user_version = 1` set at creation. Every schema change is a numbered, forward-only, idempotent migration (`-- v2: ...`) applied in order inside `executeTransaction`, guarded by `tableExists` pre-checks — never downgrade migrations, never destructive rewrites. The wrapper:
```javascript
// [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1872-1885]
// DATA_p9Xc3LqZ_START
//   getSchemaVersion(schemaName = "main") {
//     return this.execute(`PRAGMA ${schemaName}.user_version`).then(result =>
//       result[0].getInt32(0)
//     );
//   },
//   setSchemaVersion(value, schemaName = "main") {
//     if (!Number.isInteger(value)) {
//       // Guarding against accidental SQLi
//       throw new TypeError("Schema version must be an integer. Got " + value);
//     }
// DATA_p9Xc3LqZ_END
```
**When to use:** Schema design (v1 DDL) + `MIGRATIONS.md` chain; exercised against fixture DBs at every prior version (see Pattern 4).
**Why forward-only:** SQLite's format guarantee (readable back to 3.0.0/2004, promised through 2050 [CITED: sqlite.org/formatchng.html via 04-PITFALLS.md]) makes forward-only safe across ESR re-pins and browser downgrades — the exact property DuckDB's per-minor storage revs lack.

### Pattern 3: Quarantine-not-delete corruption path
**What:** Startup `integrity_check`; exact-`["ok"]` keying; on any other result: copy/quarantine (`tabs.sqlite` → `tabs.sqlite.corrupt-<N>`, building on `backupToFile`), remove dependent sidecar state, rebuild live rows from sessionstore (restore authority) + registry, continue degraded. Never delete the corrupt file — it is forensics.
**When to use:** `MIGRATIONS.md` corruption procedure + Phase 12 startup path.
**Official behavior [CITED: sqlite.org/pragma.html]:**
```text
// DATA_m2Vc8NrT_START
// If pragma integrity_check finds no errors, a single row with the value 'ok'
// is returned. ... PRAGMA integrity_check does not find FOREIGN KEY errors.
// DATA_m2Vc8NrT_END
```
Design consequences: key quarantine on "exactly `['ok']`, nothing else"; use `quick_check` as the cheap per-launch tripwire with full `integrity_check` on schedule/suspicion [ASSUMED — tripwire cadence is planner's discretion]; do not rely on integrity_check for FK validation.

### Pattern 4: Fixture-DB migration exercise (throwaway harness, not store code)
**What:** Commit versioned fixture DBs (`fixtures/tabs-v1.sqlite`, …) and a throwaway Node exercise script (better-sqlite3, read-write on COPIES under mktemp — never the fixtures) that applies the forward-only chain from each prior version and asserts: final `user_version`, `integrity_check = ['ok']`, row preservation, index presence. The script is test scaffolding, not the store; it satisfies "exercised against fixture DBs" without violating "no store code."
**When to use:** Plan 11-02 must-have; re-run by Phase 12 Wave 0.
**Why this shape:** Follows the repo's fixture discipline (planted fixtures under mktemp, mutation-landed guards) while keeping shipped surface at zero files.

### Pattern 5: Registry URIs as opaque TEXT join key
**What:** The tabs table PK is the canonical URI string (`scheme:path` opaque form, never `scheme://authority` — authority lower-cases on serialization and forks widget identity [CITED: docs/URI-SCHEMES.md]). Chrome never parses the URI; it binds the string as a parameter. Lengths are short human-scale identifiers (view ids, `terminal:t1`-class names); TEXT PK with one `lastActive` index covers the workload (tens–hundreds of live rows, bounded closed retention) [CITED: .planning/research/duckdb-vs-sqlite/02-WORKLOAD.md].
**When to use:** `SCHEMA.md` PK + collation choice (exact-match lookups; case-sensitivity is planner's discretion — note `parseName` reads `uri.authority` directly and never `toString()`, so the stored form must be the already-canonical emission [VERIFIED: theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:90-96]).
**Frozen contract:** `TabUriRegistry` exposes exactly `TabUriRegistry` + 4 public members (`getViewContribution`, `parseName`, `createWidgetOptions`, `uriOf`) [VERIFIED: scripts/verify-registry-shape.mjs:55-71]; the design proposes zero changes, so `gui04-registry-shape` stays green by construction.

### Anti-Patterns to Avoid
- **Second writer in any process:** a Theia-side read-write open, a test helper that writes, or a migration script pointed at the live profile — the documented corruption class (WAL/`-shm` + profile-lock defeat). One writer, enforced by a negative scan in Phase 12.
- **Tables inside `places.sqlite`:** upstream-owned schema; every ESR rebase may migrate it. Own `tabs.sqlite` or nothing.
- **Store-as-restore-authority:** replacing sessionstore needs a dual-write + restore-parity proof first (out of scope). The design states sessionstore-authoritative unconditionally.
- **`[features]`/`[sql]` manifest flag:** ARCHITECTURE.md Anti-Pattern 6 (extension point, not a flag) — filename `tabs.sqlite` and `user_version` are fixed platform content, never manifest keys. (Note: current `ARCHITECTURE.md` in `.planning/codebase/` no longer numbers this anti-pattern; the normative statement lives in REQUIREMENTS.md Out of Scope + ROADMAP Phase 11 criterion 3. The design cites those, not a section number.)
- **Backend opens of profile SQLite:** even readonly opens of `places.sqlite` participate in WAL/`-shm` checkpointing — "readonly so safe" is false. Backend touches the dedicated file only, readonly.
- **Hand-kept expectation lists in new checks:** any Phase 12 gate the design specifies must derive-from-tree-and-compare with `--self-test` (see TESTING.md checklist), or it can only agree with the tree it was copied from.
- **Brand token in design docs:** the originating product may be named only in `inventory/brand-tokens.json`. Design docs discussing "upstream"/"Mozilla"/"Firefox" are fine; the token string itself is a scan failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema versioning | Version table + custom comparator | `PRAGMA user_version` + `get/setSchemaVersion` | Integer in the DB header, zero-table, wrapper already guards non-integers (SQLi guard quoted above) |
| Migration atomicity | Multi-statement scripts without transactions | `executeTransaction(func)` with 5-min stuck-transaction rollback | Partial migrations are the corruption vector; the wrapper already serializes per Gecko precedent (Bug 1090961 class) |
| Corruption detection | Custom checksums / row counts | `PRAGMA integrity_check` / `quick_check` | Page-level b-tree + index cross-verification with 20 years of exercised precedent (places `.corrupt`-rename-and-rebuild) |
| Corrupt-file preservation | Delete-and-recreate | `backupToFile` + rename to `tabs.sqlite.corrupt-<N>` | Forensics + downgrade safety; deletion is data loss wearing a recovery costume |
| Profile-relative paths | Hand-rolled ProfD joins | `Sqlite.openConnection({path})` relative-path form | Resolves against `ProfD` by construction [VERIFIED: upstream/toolkit/modules/Sqlite.sys.mjs:1431-1433] |
| Chrome→backend tab sync | New IPC/write channel with auth/ordering/retry | Single-writer file + readonly handle (WAL gives cross-process readers for free) | A write channel across the trust boundary needs auth, replay, and ordering semantics the file topology never needs |
| Feature-flagging the store | `[features]`/`[sql]` manifest key | Fixed platform content (`tabs.sqlite`, `user_version`) | Anti-Pattern 6: a downstream changing platform behavior needs an extension point, not a flag |
| Tab identity scheme | New UUID/rowid-join scheme | Registry URI strings as opaque TEXT PK | Stable identity already exists and is bridge-frozen; a second identity is a second source of truth |

**Key insight:** Every hard problem in this design (versioning, atomicity, corruption detection, cross-process reads, identity) already has a solved, in-tree, decades-old answer. The design's job is to *select and constrain* those answers into invariants, not to invent mechanics.

## Common Pitfalls

### Pitfall 1: Second writer (any process, any pretext)
**What goes wrong:** WAL/`-shm` coordination defeated → repeatable profile-DB corruption (2026-05 Firefox+Thunderbird shared-`$HOME` precedent).
**Why it happens:** Someone opens the file read-write from the backend, a test, or a migration script "just this once."
**How to avoid:** Invariant table states single chrome-side writer with no exceptions; Phase 12 ships the negative scan (no profile-DB opens outside `powerbrowser/shell/`); migration exercise runs on fixture copies under mktemp.
**Warning signs:** Any design sentence with "the backend writes" or "temporarily open read-write."

### Pitfall 2: Tables in `places.sqlite`
**What goes wrong:** ESR rebase migrates upstream's schema under the store's tables; blast radius couples tabs to bookmarks/history checkpointing.
**Why it happens:** "One fewer file" minimalism.
**How to avoid:** Own-file rule in the invariant table; blast radius of any tab-store bug is tabs only.
**Warning signs:** Schema doc mentions `moz_places`, `moz_bookmarks`, or `places.sqlite` as a host.

### Pitfall 3: Letting the store become restore authority by accident
**What goes wrong:** Restart path reads tabs.sqlite first; sessionstore drift goes unnoticed until the file corrupts and there is no rebuild source.
**Why it happens:** The store is newer, faster, queryable — gravity pulls reads toward it.
**How to avoid:** Invariant states sessionstore-authoritative unconditionally; quarantine procedure rebuilds FROM sessionstore; roundtrip gate (Phase 12) asserts URI→row→restart→reopen.
**Warning signs:** "Restore from the store" in any design sentence.

### Pitfall 4: Manifest-flagging the store
**What goes wrong:** A `[sql]` key that changes platform behavior per downstream — the extension-point bug.
**Why it happens:** Generator habit: everything configurable.
**How to avoid:** Filename, `user_version`, and quarantine policy are fixed platform content. The design doc says so explicitly so Phase 12 has nothing to parameterize.
**Warning signs:** `configuration.toml`, `config-schema.json`, or `[features]` in the schema doc.

### Pitfall 5: Private-tab absence test that can't go red
**What goes wrong:** An absence assertion ("no private rows in store") over an emitter the test also controls passes forever — the exact failure CLAUDE.md's verification rule exists to prevent.
**Why it happens:** Test writes only public tabs, then asserts no private rows. Vacuous.
**How to avoid:** Schema supports the emitter-exercising design: exclusion enforced at the single writer (private filter before upsert); the Phase 12 absence test must drive REAL private-window tab events through the real writer path (open private tab → navigate → close) and then assert absence — proving the emitter (real tab events incl. private ones) ran. Schema implication: either no private column at all (nothing to leak, exclusion total) or, if a diagnostic flag is kept, the test asserts on store contents after exercising the private path, never on a fixture it constructed. Recommend: no private rows, no private flag — exclusion total, nothing to select.
**Warning signs:** Absence test that never opens a private window.

### Pitfall 6: Registry-shape drift via "just one query method"
**What goes wrong:** Phase 12's query API gets added as public members on `TabUriRegistry`, tripping `gui04-registry-shape` (set equality fails on surplus).
**Why it happens:** The registry is the natural home for URI-keyed queries.
**How to avoid:** Design states the query API lives alongside/beside the registry (new module or backend service in `@powerbrowser/tab-uris`), never as new public members on the frozen class. A deliberate contract change edits EXPECTED in the same commit — the design must not smuggle that in.
**Warning signs:** `SCHEMA.md` or the query-API sketch names `TabUriRegistry.newMethod`.

### Pitfall 7: Brand token or internal identifier in design docs
**What goes wrong:** `scan-brand-residue` fails (token) or a confused downstream treats a doc literal as API (identifier).
**Why it happens:** Design docs discuss lineage ("extracted from…") or copy pref/sentinel names for illustration.
**How to avoid:** Never spell the originating product token outside `inventory/brand-tokens.json`; use "upstream"/"originating product" prose. Stage new files before trusting a green scan (unstaged files are invisible to it).
**Warning signs:** Any proper-noun product name in a doc diff that isn't Power Browser / Firefox / Mozilla / Theia.

## Code Examples

Verified patterns from in-tree sources (skeletons for the planner; bodies are Phase 12):

### Open + version-guard (chrome side)
```javascript
// Source: upstream/toolkit/modules/Sqlite.sys.mjs:1408 (+ ProfD-relative :1431-1433), :1872-1885
// openTabStore (Phase 12 name TBD): open-or-create the dedicated file,
// set user_version=1 on creation, run forward-only migrations to CURRENT.
const conn = await lazy.Sqlite.openConnection({ path: "tabs.sqlite" }); // relative → ProfD
const v = await conn.getSchemaVersion();
if (v === 0) {
  await conn.executeTransaction(async () => {
    await conn.execute(CREATE_TABS_V1_SQL);   // from SCHEMA.md, URI TEXT PRIMARY KEY
    await conn.setSchemaVersion(1);
  });
} else {
  await runForwardMigrations(conn, v);        // from MIGRATIONS.md, each in executeTransaction
}
```

### Write-through with bound params (chrome side)
```javascript
// Source pattern: Sqlite.sys.mjs execute(sql, params, onRow) (:734); LIKE-with-bindings guard built in
// Never interpolate the URI string — bind it. Registry URI treated as opaque TEXT.
await conn.executeCached(
  `INSERT INTO tabs (uri, url, title, last_active) VALUES (:uri, :url, :title, :t)
   ON CONFLICT (uri) DO UPDATE SET url=excluded.url, title=excluded.title, last_active=excluded.last_active`,
  { uri, url, title, t: Date.now() }
);
// Private-tab filter runs BEFORE this call (single enforcement point). [ASSUMED shape — planner pins]
```

### Readonly reader (Theia backend, Phase 12)
```javascript
// Source: CONTEXT.md engine line (readonly: true) + better-sqlite3@13.0.3 [VERIFIED: npm registry]
// [ASSUMED API shape — planner confirms against better-sqlite3 docs at build time]
import Database from "better-sqlite3";
const db = new Database(profileDir + "/tabs.sqlite", { readonly: true });
const row = db.prepare("SELECT * FROM tabs WHERE uri = ?").get(uriString);
```

### Startup integrity tripwire (chrome side)
```javascript
// Source: sqlite.org PRAGMA integrity_check semantics [CITED] + Sqlite.sys.mjs execute
const rows = await conn.execute("PRAGMA quick_check");
const ok = rows.length === 1 && rows[0].getString(0) === "ok";  // exact-['ok'] keying
if (!ok) { await quarantineAndRebuild(conn); }  // backupToFile → .corrupt-N → rebuild from sessionstore
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Sqlite.jsm` / raw `Services.storage` (legacy wrapper names) | `Sqlite.sys.mjs` ES module with promise API + transaction queue | Gecko modernization (pre-ESR 128 era) | Design targets the ES-module path only; legacy names must not appear in `SCHEMA.md`/`MIGRATIONS.md` [ASSUMED — legacy naming from training; the in-tree file verified is `Sqlite.sys.mjs`] |
| Sessionstore-only tab memory | Sessionstore authoritative + SQLite projection alongside | This design (v1.2) | Restore path unchanged; store is additive, zero restore risk |
| DuckDB as candidate engine | SQLite only, DuckDB carve-out as read-side accelerator over exports only | 2026-09-05 VERDICT.md | Design must contain zero DuckDB surface |
| Per-phase verify drivers | Single `verify-platform.sh` registry | Phase 01 consolidation (D-21) | Store gates are registry rows, not scripts |

**Deprecated/outdated:**
- DuckDB as system of record: rejected (topology, workload, cost, format) — analytics-later via DuckDB's SQLite extension stays open without migration.
- `node:sqlite` as backend reader: not current; revisit at next Node re-pin.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `PrivateBrowsingUtils.isWindowPrivate`-class API exists for the writer-side private filter (exact name unpinned) | Supporting / Pitfall 5 | LOW — private-window detection is long-standing Gecko API; planner pins the exact symbol in 11-02, Phase 12 catalogue row names it |
| A2 | Places read APIs (`PlacesUtils.bookmarks`/`history`) suffice for exposure without raw places writes | Supporting | LOW — read-projection is the documented Firefox pattern; planner confirms exact methods in 11-02 |
| A3 | better-sqlite3 `new Database(path, { readonly: true })` + `prepare().get()` API shape | Code Examples | LOW — canonical documented API; planner confirms at Phase 12 build; legitimacy + version verified |
| A4 | `quick_check` as per-launch tripwire + periodic full `integrity_check` cadence | Pattern 3 | LOW — both pragmas verified; cadence is discretion, either choice is safe |
| A5 | Write-through SQL shape (`INSERT … ON CONFLICT DO UPDATE`) executes on mozStorage's SQLite build | Code Examples | LOW — UPSERT is SQLite 3.24+ (2018); ESR vendored SQLite is 3.53.4-class per 01-STACK.md (HIGH there, cited here) |
| A6 | No new Gecko compiled surface needed (zero `moz.build`/IDL for the store) | Project Constraints | LOW — `Sqlite.sys.mjs` import is JS-only inside the excluded boundary file; 03-INTEGRATION.md reaches the same conclusion |

## Open Questions

1. **Exact private-window detection symbol**
   - What we know: Exclusion must be enforced at the single chrome writer before upsert; Gecko ships private-browsing window state to chrome JS.
   - What's unclear: The exact in-tree symbol name/signature to pin in `SCHEMA.md` (candidate: `PrivateBrowsingUtils.isWindowPrivate`).
   - Recommendation: 11-02 pins it by reading the pinned `upstream/` tree (not training memory); catalogue row in Phase 12 names the file:line.

2. **Tabs-table column set beyond the key**
   - What we know: PK is URI TEXT; workload needs `lastActive` ordering + bounded closed-tab retention; URL/title needed for joins and future (v1.3+) GUI.
   - What's unclear: Exact columns (e.g. `url`, `title`, `last_active`, `window_id`?, `is_pinned`?) and secondary indexes.
   - Recommendation: Planner's discretion in 11-02; keep minimal (YAGNI) — every column must name its Phase 12 consumer; v1.3 GUI needs are out of scope.

3. **FTS5 availability for future history search**
   - What we know: 03-INTEGRATION.md states FTS5 ships in-tree with mozStorage (zero new deps for future search).
   - What's unclear: Not re-verified against compile options this session.
   - Recommendation: 11-02 records it as cited-prior-research, not as a v1.2 dependency (no FTS index in v1 schema regardless).

4. **`tabs.sqlite` synchronous/journal tuning**
   - What we know: WAL is the decided mode; defaults are safe.
   - What's unclear: Whether to pin `synchronous`, `journal_size_limit`, or checkpoint policy in the design.
   - Recommendation: Design pins WAL only; leaves other pragmas at engine defaults with a note that Phase 12's soak test runs defaults first.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node (host) | Fixture-DB exercise scripts (better-sqlite3) | ✓ | v24.19.0 (needs ≥22 per better-sqlite3 engines) | nix `.#theia` shell Node |
| `upstream/` checkout with `Sqlite.sys.mjs` | Design source-pin verification | ✓ | 2252-line file on disk | `fetch-upstream.sh` re-fetch |
| `sqlite3` CLI | Ad-hoc fixture inspection | ✗ | — | Node `better-sqlite3` scripts or `Sqlite.sys.mjs` via xpcshell; do NOT make the CLI a gate |
| yarn | Phase 12 Theia install | (nix shell only) | — | `nix develop .#theia` (normal) |
| Gecko build / `./mach` | Not needed Phase 11 | n/a | — | — |
| DuckDB / any new engine | Nothing (rejected) | n/a | — | — |

**Missing dependencies with no fallback:** none — Phase 11 is docs-only.
**Missing dependencies with fallback:** `sqlite3` CLI absent → fixture work goes through Node scripts (recommended anyway: same engine family as the Phase 12 reader).

## Validation Architecture

> nyquist_validation is enabled (`.planning/config.json`: `workflow.nyquist_validation` absent→default… actually present as `true`). Phase 11 is design-only: no runtime behavior, no unit/integration tests. Validation = sign-off procedure + static gates staying green.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (no unit-test runner exists in tree — no jest/vitest/mocha, no `*.test.*`) |
| Config file | Registry itself (`run_own_checks()` in `scripts/verify-platform.sh`) |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SQL-02 | Authority table exists, reviewed + signed before schema work | manual-only (human review signature) | `scripts/verify-platform.sh --quick` (proves docs broke nothing) | ❌ Wave 0 (AUTHORITY.md + SIGN-OFF.md) |
| SQL-03 | Schema + migration plan exists, reviewed + signed; migrations exercised on fixture DBs | manual-only (sign-off) + throwaway exercise script (not a registry row — scaffolding) | Exercise: `node schema/fixtures/exercise-migrations.mjs` (throwaway, planner names it) | ❌ Wave 0 (SCHEMA.md + MIGRATIONS.md + SIGN-OFF.md + fixtures) |

Manual-only justification: the deliverables ARE reviewed documents; no runtime behavior exists to automate. The exercise script is proof the migration chain works, run by the plan author and logged in MIGRATIONS.md — promoting it to a registry row is Phase 12's decision (the roundtrip/soak gates there subsume it).

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick` (residue scan must see staged docs; registry-shape + catalogue rows must stay green — Phase 11 adds no code so they are green by construction, which is itself asserted).
- **Per wave merge:** `--quick` (no tier-3 in a docs phase).
- **Phase gate:** Both SIGN-OFF.md files present + `--quick` green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `authority/AUTHORITY.md` — covers SQL-02 (invariant table)
- [ ] `authority/SIGN-OFF.md` — covers SQL-02 (review signature)
- [ ] `schema/SCHEMA.md` — covers SQL-03 (DDL, PK, indexes, v1, filename)
- [ ] `schema/MIGRATIONS.md` — covers SQL-03 (forward-only chain, exercise log, quarantine procedure)
- [ ] `schema/SIGN-OFF.md` — covers SQL-03 (review signature)
- [ ] `fixtures/tabs-vN.sqlite` + throwaway exercise script — covers SQL-03 "exercised" clause

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Store holds no credentials; token gate is separate (token-gate extension, out of this design) |
| V3 Session Management | No | No sessions in the store; `POWERBROWSER_TOKEN` never touches SQLite (invariant table should state this explicitly) |
| V4 Access Control | Yes | Single chrome-side writer; backend `readonly: true` enforced at open; no second opener (negative scan, Phase 12) |
| V5 Input Validation | Yes | Bound parameters on every statement (`execute(sql, params)`); URI strings never interpolated; `setSchemaVersion` integer guard in-tree |
| V6 Cryptography | No | No crypto in the store; private-tab rule is exclusion (not redaction/encryption) — there is nothing to decrypt because nothing is stored |
| V14 Configuration | Yes (adjacent) | No manifest flag for the store (Anti-Pattern 6); filename/version are fixed platform content, not downstream-settable |

### Known Threat Patterns for SQLite tab store

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Second writer corrupts profile DBs | Tampering | Single-writer invariant + Phase 12 negative scan (no profile-DB opens outside `powerbrowser/shell/`) |
| SQL injection via URI/title strings | Tampering | Parameter binding everywhere; `Sqlite.sys.mjs` LIKE-bindings guard; never string-interpolate |
| Private-tab data persisted or leaked via reads | Information disclosure | Exclusion at the single writer (no private rows, no private flag) + emitter-exercising absence test (Phase 12) |
| Backend opens `places.sqlite` (even readonly) | Tampering | Own-file rule; backend touches dedicated file only; places reads stay chrome-side via Places APIs |
| Corrupt DB deletes user data on "recovery" | Denial of service | Quarantine-not-delete + rebuild from sessionstore; forensics preserved |
| Token/secret written into tab rows (title/URL reflection) | Information disclosure | Invariant: token never in SQL; diagnostics layer already separates secrets from content (existing posture, design restates) |

## Sources

### Primary (HIGH confidence)
- `upstream/toolkit/modules/Sqlite.sys.mjs` (pinned tree, read this session): `openConnection` :1408, ProfD-relative open :1431–1433, `execute`/`executeCached` :700–734, `executeTransaction` :776, `backupToFile` :1265, `getSchemaVersion`/`setSchemaVersion` :1872–1885, `clone` :626/:1930, `tableExists`/`indexExists` :2138–2157, exports :2232+
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` + `powerbrowser/INTERNAL-APIS.md` (boundary shape, catalogue discipline, D-107/D-108 sessionstore-untouched) — read this session
- `scripts/check-internals-boundary.sh` (`FORBIDDEN_PATTERNS`, `BOUNDARY_FILE_BASENAME` exclusion, `--catalogue`/`--self-test`) — read this session
- `scripts/verify-registry-shape.mjs` (frozen contract: 1 export + 4 members) — read this session
- npm registry (`better-sqlite3` 13.0.3, 2026-08-05, engines node≥22, postinstall null) + `package-legitimacy check` verdict OK — run this session
- Node v24.19.0 host; `upstream/` present; `sqlite3` CLI absent — probed this session

### Secondary (MEDIUM confidence)
- [CITED: https://sqlite.org/pragma.html] — `integrity_check`/`quick_check`/`user_version`/`journal_mode` semantics (fetched this session)
- [CITED: .planning/research/duckdb-vs-sqlite/VERDICT.md + 01-STACK.md + 02-WORKLOAD.md + 03-INTEGRATION.md + 04-PITFALLS.md] — engine decision, workload fit, boundary deltas, corruption record (in-repo prior research, unanimous HIGH, read this session)
- [CITED: docs/URI-SCHEMES.md] — canonical opaque URI form, lenient parsing, carve-outs
- [CITED: .planning/codebase/ARCHITECTURE.md + TESTING.md] — component map, check-adding checklist, derive-and-compare discipline

### Tertiary (LOW confidence)
- Legacy wrapper names (`Sqlite.jsm`), `node:sqlite` status, Places/PrivateBrowsing exact symbols — training knowledge, flagged [ASSUMED] with in-tree pinning assigned to 11-02

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — in-tree primitives read line-verbatim; engine pre-decided by unanimous in-repo research; reader package registry-verified + legitimacy-gated
- Architecture: HIGH — responsibility map follows decided integration shape; all touchpoints read this session
- Pitfalls: HIGH — corruption record cross-checked across vendor docs + issue record in 04-PITFALLS.md; project-specific traps (residue scan, absence rule, shape freeze) from lived history
- Schema details (columns/indexes/private symbol): MEDIUM — correctly deferred to 11-02 with pinning procedure specified

**Research date:** 2026-09-05
**Valid until:** 30 days (stable domain: SQLite semantics, frozen contracts; only `better-sqlite3` re-pin state could drift, and it is Phase 12's install)

---

## Recommended Plan Decomposition (for planner)

Tracer-first, sequential (success criterion 1 orders authority-sign-off before schema work):

1. **11-01 Authority/invariants (SQL-02):** Write `authority/AUTHORITY.md` (5-row invariant table: single chrome writer; sessionstore restore authority; registry-URI join key; backend-never-opens-profile-SQLite; own-file rule + token-never-in-SQL) → human review → `SIGN-OFF.md`. Must-haves: `--quick` green (residue scan over staged docs, shape/catalogue untouched); no code, no manifest, no GUI.
2. **11-02 Schema + migration plan (SQL-03):** Write `schema/SCHEMA.md` (tabs DDL on URI TEXT PK, `last_active` index, `user_version=1`, fixed `tabs.sqlite` as platform content, private-exclusion rule with pinned detection symbol) + `schema/MIGRATIONS.md` (forward-only chain procedure, fixture DBs v1..vN, throwaway exercise log, quarantine-not-delete procedure) → exercise migrations on fixture copies → human review → `SIGN-OFF.md`.
3. **11-03 Review-sign gate:** Both sign-offs present; `--quick` green; explicit negative assertions (no DuckDB surface, no `[features]`/`[sql]` key in schema/config, no GUI surface, no registry-shape change, no new catalogue rows — design-only so all hold by construction); close SQL-02/SQL-03.
