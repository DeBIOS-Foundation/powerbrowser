# Tabs table schema (SQL-03, v1)

Status: design record for Phase 12. No store code exists in this phase;
the DDL below is the contract the Phase 12 writer implements verbatim.

## Primary key: canonical opaque URI string

The primary key is the canonical opaque URI string in `scheme:path`
(opaque `scheme-colon-path`) form that chrome binds as a statement
parameter and never parses. The string stored is the emission the
`TabUriRegistry` produces on the widget-to-URI direction (`uriOf`):
chrome treats it as an opaque TEXT join key — no URI parsing, no
serialization, no normalization chrome-side.

Source pin for the emission semantics: `parseName` in
`theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` reads
`uri.authority` directly and never `toString()`, because the authority
form lower-cases its authority only on serialization while Theia widget
ids are not uniformly lowercase — two typeable spellings of one address
would otherwise fork into two widgets. The stored form must therefore be
the already-canonical opaque emission, never the `scheme://authority`
serialization, which forks identity by lower-casing. (See
`docs/URI-SCHEMES.md` "General rules": canonical printed form is the
opaque `scheme:path`; parsing is lenient, emission is canonical.)

Frozen-contract consequence: `TabUriRegistry`'s exported shape (one
export plus `getViewContribution`, `parseName`, `createWidgetOptions`,
`uriOf`, as asserted by `scripts/verify-registry-shape.mjs`) changes not
at all for this schema. Zero frozen-class change.

## DDL (v1)

```sql
CREATE TABLE tabs (
  uri         TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  last_active INTEGER NOT NULL
);

CREATE INDEX idx_tabs_last_active ON tabs (last_active);
```

Version header (set once at creation, inside the same transaction as the
DDL above):

```sql
PRAGMA user_version = 1;
```

WAL pin (`PRAGMA journal_mode=WAL`) is set at creation and at every
quarantine rebuild, executed outside the DDL transaction — journal_mode
cannot change inside a transaction (silent no-op), so it precedes the
`BEGIN`.

In-tree wrapper pins (pinned `upstream/` tree, cited from
`.planning/phases/11-sql-store-design/11-RESEARCH.md`): open via
`Sqlite.openConnection({ path })` with profile-directory-relative
resolution (`upstream/toolkit/modules/Sqlite.sys.mjs:1408,1431-1433`);
version read/write via `getSchemaVersion` / `setSchemaVersion` over
`PRAGMA user_version` (`:1872-1885`, with the in-tree non-integer guard);
multi-statement creation inside `executeTransaction` (`:776`), which
carries the 5-minute stuck-transaction rollback; bound parameters via
`execute(sql, params)` (`:734`).

## Column consumers (YAGNI — every column names its Phase 12 consumer)

| Column | Type / constraint | Phase 12 consumer |
|---|---|---|
| `uri` | `TEXT PRIMARY KEY` | Join lookup: the opaque registry emission is the join key between Theia tabs and chrome rows; point reads/writes keyed by URI (`get/set/remove/list` by URI) |
| `url` | `TEXT NOT NULL` | Read projection: the page address served to Theia UI reads and to future cross-surface joins against history/bookmark projections |
| `title` | `TEXT NOT NULL DEFAULT ''` | Read projection: the tab title served to Theia UI reads; empty-string default keeps rows writable before a title is known |
| `last_active` | `INTEGER NOT NULL` | Ordering with bounded closed-retention pruning: `ORDER BY last_active` for recency plus `DELETE … WHERE last_active < ?` retention statements, served by `idx_tabs_last_active` |

Workload fit: tens to hundreds of live rows of short human-scale
identifiers. A TEXT primary key plus one `last_active` index covers
point lookups, recency ordering, and bounded retention with no further
indexes.

## Explicitly excluded columns

- `window_id` (window identifier): excluded. No Phase 12 consumer reads
  a window column; the v1 workload is URI-keyed point reads plus
  recency ordering, and a window column with no reader is speculative
  surface that a later phase must then migrate. If a future phase names
  a consumer (e.g. per-window grouping), it arrives as a numbered
  forward-only migration, not as a silent v1 addition.
- `is_pinned` (pinned flag): excluded, same rationale. No Phase 12
  consumer projects or filters on a pinned flag; adding it now would be
  YAGNI inventory with migration cost later.
- Private flag / private column: **no private column at all**.
  Exclusion is total — there is nothing to leak because nothing is
  stored (see next section).

## Private-tab exclusion rule (total)

No private-tab row is ever written, and no private-marker column exists
to select on. The exclusion is enforced at the single chrome-side writer:
the writer-side filter runs **before** upsert — a tab whose window is
private never reaches the `INSERT … ON CONFLICT DO UPDATE` statement.

Pinned detection symbol (pinned against the local tree, not training
memory): `PrivateBrowsingUtils.isWindowPrivate` at
`upstream/toolkit/modules/PrivateBrowsingUtils.sys.mjs:18`
(`isWindowPrivate: function pbu_isWindowPrivate(aWindow)`), which
returns `privacyContextFromWindow(aWindow).usePrivateBrowsing`. The
Phase 12 writer calls this on the tab's chrome window before upsert and
skips private windows outright. Deferral procedure: if the Phase 12
implementation finds this symbol unusable from the writer context, the
Phase 12 catalogue row for the writer method names the replacement
symbol with its file-colon-line, and this section is amended in the same
commit — no unnamed detection path is ever wired.

The Phase 12 absence test (specified, not implemented — see "Phase 12
gates" below) must exercise the real emitter: drive real private-window
tab events through the real writer path, then assert absence. An absence
assertion over a fixture the test itself constructed can never go red.

## Schema version from day one

`tabs.sqlite` ships with `user_version = 1` set at creation, in the same
transaction as the v1 DDL. Every later schema change is a numbered,
forward-only, idempotent migration applied in order, each inside one
transaction with `tableExists` / `indexExists` pre-checks — never
downgrades, never destructive rewrites. The full chain procedure lives
in `MIGRATIONS.md`; the rule is stated here because the version header
is part of the on-disk contract.

Threat note T-11-11 (accepted, low): `PRAGMA integrity_check` does not
find foreign-key errors per vendor docs; this schema carries no foreign
keys, so there is nothing to miss. Recorded explicitly so a later
foreign-key addition revisits the check choice.

## Filename: fixed platform content

The store file is `tabs.sqlite`, opened profile-directory-relative
(relative `path` resolves against `ProfD` by construction in
`Sqlite.openConnection`). The filename and the schema version are fixed
platform content: never manifest keys, never per-downstream settings,
never feature flags. A downstream changing platform behavior needs an
extension point, not a flag.

Quarantine copies use `tabs.sqlite.corrupt-<N>` with N = max existing
suffix + 1 starting at 1 (never reuse a suffix; full procedure in
`MIGRATIONS.md`).

Journal mode: write-ahead-logging (WAL) is pinned — it is the mode that
supports the decided topology of one chrome writer plus N cross-process
readers (Theia backend readonly handle, offline gates). The writer sets
`PRAGMA journal_mode=WAL` at creation and at every quarantine rebuild,
outside the DDL transaction. All remaining
pragmas stay at engine defaults. Soak-on-defaults note: Phase 12's soak
test runs engine defaults first and only pins a further pragma on
measured evidence, recorded in the same commit as the pin.

Single-writer restatement (authority row 1): no other process, test
helper, or migration path opens this file read-write — no exceptions.
The Theia backend holds a readonly handle on this dedicated file only,
via `better-sqlite3@13.0.3` opened readonly.

## Coverage boundary

Excluded from v1, addressable later at zero design cost:

- Full-text search indexing (FTS5): no FTS index in v1. Prior research
  (`.planning/research/duckdb-vs-sqlite/03-INTEGRATION.md` §5) records
  that FTS5 ships in-tree with mozStorage at zero new dependencies, so a
  future history-search phase can add an FTS index as a numbered
  migration without re-deciding the engine or the file layout. The v1
  workload (URI-keyed point reads, recency ordering, bounded retention)
  has no query no indexed plan fails to satisfy.
- Window/pinned/private columns: excluded per the sections above; each
  arrives as a numbered migration only when a phase names its consumer.
- Sessionstore duplication: the store never sources a restart. Reopen
  reads sessionstore exactly as today; the store is a projection of live
  tabs. On corruption the live rows rebuild FROM sessionstore plus the
  registry, never the reverse (authority row 2; procedure in
  `MIGRATIONS.md`).

## Query-API placement

Tab reads live beside the registry in the `@powerbrowser/tab-uris`
extension surface (new module or backend service in Phase 12) — never as
new public members on the frozen `TabUriRegistry` class. Adding a query
method to the frozen class would trip `gui04-registry-shape` set
equality on surplus; a deliberate contract change edits the expectation
in the same commit and is never smuggled inside store work.

## Phase 12 registry-row specification (specified, not implemented)

The following four gates are specified here as future
`scripts/verify-platform.sh` registry rows. Each carries a `--self-test`
obligation that plants faults in both directions (addition and removal,
clean and corrupt) and requires each fault to go red naming the drift.
None is implemented in this phase — promoting any of them to a registry
row is Phase 12's decision.

1. Second-writer scan: no profile-database opens outside
   `powerbrowser/shell/`; fails naming the uncatalogued file-colon-line.
2. Integrity soak: startup `quick_check` tripwire plus scheduled full
   `integrity_check` against fixture and live-shape databases.
3. Restart roundtrip: URI → row → restart → reopen asserts the restored
   set equals sessionstore, with the store agreeing (authority row 2).
4. Emitter-exercising absence test: real private-window tab events
   through the real writer path, then asserts no private rows exist —
   the one absence assertion this design permits, valid because the
   emitter is proven to be the code under test.

## Consistency with the signed authority

- Row 1 (single writer): this schema's writer path and WAL mode assume
  exactly one chrome-side writer; MIGRATIONS.md exercises only fixture
  copies.
- Row 2 (sessionstore authoritative): restated in the coverage boundary;
  quarantine rebuilds FROM sessionstore.
- Row 3 (opaque TEXT join key): the primary-key section above; zero
  registry change.
- Row 4 (backend never opens profile databases): backend touches this
  dedicated file only, readonly.
- Row 5 (own-file rule): `tabs.sqlite`, profile-directory-relative,
  nowhere else; no tab tables in upstream-owned files.
- Row 6 (no credential in SQL): no credential-shaped column exists;
  Phase 12 write-path review confirms bound parameters carry tab fields
  only. Bound parameters on every statement (threat T-11-07).

Engine exclusivity: SQLite only. No second engine surface exists in this
design. No GUI surface: this schema authorizes no window, no strip, no
toolbar, no address bar, no menu, and no user-facing string of any kind.
