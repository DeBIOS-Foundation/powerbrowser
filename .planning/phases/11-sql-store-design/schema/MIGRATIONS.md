# Migration plan (SQL-03): forward-only chain + corruption path + exercise log

Status: design record for Phase 12. The chain procedure below is the
contract the Phase 12 writer implements with the in-tree wrapper
primitives; the exercise script proves the procedure against fixture
copies without shipping store code.

## Forward-only chain procedure

1. `tabs.sqlite` is created with `user_version = 1` in the same
   transaction as the v1 DDL (`SCHEMA.md`). `PRAGMA journal_mode=WAL`
   is set at creation outside that transaction (journal_mode is
   immutable inside one). Version 1 exists from day
   one — there is no unversioned production database.
2. Every later schema change is a numbered migration (`-- v2: …`, …,
   `vN`), applied in ascending order. Each migration runs inside exactly
   one transaction with pre-checks first and the version bump last.
3. Pre-checks use the in-tree existence probes instead of raw
   `sqlite_master` queries. A migration that finds its own work already
   done is a no-op success (idempotent re-run), never an error.
4. Never downgrades: a database whose `user_version` exceeds the chain
   head is left untouched and reported — the writer refuses rather than
   rewriting history.
5. Never destructive rewrites: migrations add (tables, columns, indexes);
   any removal first proves no Phase 12 reader projects the removed
   shape — proof is a grep over the reader surface plus a failing-first
   drive, both recorded in the migration entry — and the corrupt-file
   path below never deletes.

Source pins for the primitives (pinned `upstream/` tree, via
`.planning/phases/11-sql-store-design/11-RESEARCH.md`): open with
`Sqlite.openConnection({ path })` (`upstream/toolkit/modules/Sqlite.sys.mjs:1408`,
profile-relative `:1431-1433`); atomicity with
`executeTransaction(func)` (`:776`, 5-minute stuck-transaction
rollback); version read/write with `getSchemaVersion` /
`setSchemaVersion` over `PRAGMA user_version` (`:1872-1885`, including
the in-tree non-integer guard); pre-checks with `tableExists` /
`indexExists` (`:2138-2157`); chrome-side reads off the write connection
with `clone(readOnly)` (`:626`); quarantine copies with `backupToFile`
(`:1265`).

## Corruption procedure (quarantine, not delete)

Startup tripwire: `PRAGMA quick_check` on every launch — the cheap check.
Keying is exact: the result must be a single row with the value `'ok'`
and nothing else. A full `PRAGMA integrity_check` runs on schedule or on
suspicion (cadence at Phase 12's discretion). Vendor semantics per the
research record: a clean database returns exactly one `'ok'` row, one row
per problem otherwise; `integrity_check` does not find foreign-key
errors, and this schema carries no foreign keys (SCHEMA.md threat note
T-11-11).

On any other result — including an unopenable file, which counts as
tripped:

1. Copy the database file to the next free corrupt-suffixed name
   (`tabs.sqlite.corrupt-<N>`, N = max existing suffix + 1, starting at 1)
   via the `backupToFile` primitive. Never reuse a suffix: if
   `tabs.sqlite.corrupt-1` exists, write `tabs.sqlite.corrupt-2`.
   Copy first; the corrupt file is forensics.
2. Remove dependent sidecar state (`-wal`, `-shm`, `-journal`).
3. Rebuild the live rows FROM sessionstore plus the registry — the
   restore authority. Sessionstore stays authoritative for restore
   throughout (authority row 2); the store never sources a restart, so
   the first corruption always has a rebuild source. The rebuild runs
   inside exactly one transaction (DDL plus version bump plus row
   inserts).
4. Continue degraded with the rebuilt file at the current chain version.
5. Never delete the corrupt copy. Deletion is data loss wearing a
   recovery costume.

## Fixture inventory

| Fixture | Version | Rows | Purpose |
|---|---|---|---|
| `fixtures/tabs-v1.sqlite` | `user_version = 1`, WAL mode | 3 public-tab rows | Committed initial-version database the exercise drives copy |

Row cover (opaque URI edge shapes, all public — no private rows exist in
any fixture):

- `view:explorer-view-container` — plain opaque singleton address.
- `terminal:build` — multi-instance named address.
- `settings:editor.fontSize` — dotted path address.

The `terminal:build` row carries the title `It's a "build" shell —
ünïcödé ✓`: a quote-plus-unicode value proving bound parameters on the
write path (threat T-11-07). Fixture sha256 at exercise time:
`9daab2d5b09a5b843d1fdecba0410346b0b5969a6d16cd2a35ff67f4f2e7e73f`.

## Exercise log

Run: `node .planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs`
(engine: standard-library `node:sqlite`; no install. Fixtures copied to a
mktemp stage outside the repo at a space-free path; only the copies are
mutated. Expectations derived at run time from a stage copy of the
committed `tabs-v1.sqlite`: final version, single-`ok` integrity result,
row preservation by exact set equality, index presence, WAL pin, CHECK
enforcement.)

```text
exercise-migrations: stage /tmp/pb-tabs-migrate-d22rki (space-free, outside repo)
exercise-migrations: committed fixture sha256 9daab2d5b09a5b843d1fdecba0410346b0b5969a6d16cd2a35ff67f4f2e7e73f
exercise-migrations: drive PASS -- fixture-probe-nonvacuous
exercise-migrations: drive PASS -- fresh-create-advances
exercise-migrations: drive PASS -- fresh-create-shape
exercise-migrations: drive PASS -- fresh-create-integrity
exercise-migrations: drive PASS -- fresh-create-wal
exercise-migrations: drive PASS -- fresh-create-rejects-empty-uri
exercise-migrations: drive PASS -- fresh-create-rejects-negative-last-active
exercise-migrations: drive PASS -- rerun-idempotent
exercise-migrations: drive PASS -- rerun-rows-preserved
exercise-migrations: drive PASS -- rerun-integrity
exercise-migrations: drive PASS -- rerun-index-present
exercise-migrations: tripwire open failed: database disk image is malformed
exercise-migrations: drive PASS -- tamper-tripwire-fires
exercise-migrations: drive PASS -- quarantine-preserves-corrupt-copy
exercise-migrations: drive PASS -- quarantine-rebuilds-live-rows
exercise-migrations: drive PASS -- quarantine-rebuilt-integrity
exercise-migrations: drive PASS -- quarantine-rebuilt-wal
exercise-migrations: tripwire open failed: database disk image is malformed
exercise-migrations: drive PASS -- quarantine-second-incident-advances
exercise-migrations: drive PASS -- quarantine-preserves-both-copies
exercise-migrations: drive PASS -- stale-version-advances
exercise-migrations: drive PASS -- stale-rows-preserved
exercise-migrations: drive PASS -- newer-version-refuses
exercise-migrations: drive PASS -- newer-version-untouched
exercise-migrations: drive PASS -- assertions-nonvacuous
exercise-migrations: PASS -- 23 drives, 23 assertions
```

Drive map:

- Fresh-create (A): an unset version (0, no tables) migrates to version
  1 with table plus index present, `quick_check` exactly `['ok']`, WAL
  pinned, and the `CHECK(length(uri) > 0)` / `CHECK(last_active >= 0)`
  constraints rejecting an empty URI and a negative `last_active`.
- Idempotent re-run (B): the version-1 fixture copy re-runs cleanly at
  version 1 with the row set byte-equal and the index present.
- Non-vacuity control C: a deliberately tampered copy (body page filled
  with `0xff`) trips the wire — the quarantine path runs, the
  corrupt-suffixed copy survives (no deletion), and the rebuilt file is
  back at version 1 with the live rows restored, `quick_check` clean,
  and WAL pinned. A tripwire that never fires proves nothing; this one
  fired (readonly handle; open failure is logged, unopenable counts as
  tripped).
- Second-incident control C2: re-tampering the rebuilt file allocates
  `..corrupt-2` without overwriting `..corrupt-1` — both forensics
  survive with the first byte-identical.
- Non-vacuity control D: a stale-version copy (v1 tables present,
  version reset to 0) advances through the chain to version 1 with rows
  intact. A chain that only handles the empty case proves nothing; this
  one advanced a stale database.
- Non-vacuity control E: a newer-than-chain copy (`user_version = 99`)
  is refused (`/refusing downgrade/`) with version and rows untouched —
  the never-downgrades rule is exercised, not just specified.

Fixture byte-identity: the committed `tabs-v1.sqlite` hash before the
run equals the hash after the run (`sha256sum -c` OK) — the script
mutates stage copies only; the probe opens a stage copy, never the
committed file. WAL sidecar note: opening any WAL-mode database (even
readonly) may materialize `-wal`/`-shm` sidecars; those are runtime
state, never committed (`*.sqlite-wal` / `*.sqlite-shm` are git-ignored),
and are removed after every run once all handles are closed —
checkpoint-then-clean (a read-write copy checkpoints with
`PRAGMA wal_checkpoint(TRUNCATE)` before its sidecars are unlinked).
Only `tabs-v1.sqlite` itself is tracked.

## Test-scaffolding note (explicitly not a registry row)

`fixtures/exercise-migrations.mjs` is test scaffolding: it proves this
plan's chain procedure, it is not the store, and it is not a
`verify-platform.sh` registry row. Promoting any part of it (second-writer
scan, integrity soak, restart roundtrip, emitter-exercising absence test)
to registry rows with `--self-test` obligations is Phase 12's decision;
SCHEMA.md specifies those four rows without implementing them.

## Consistency with the signed authority

- Chain atomicity (threat T-11-08): one-transaction-per-migration with
  pre-checks; the idempotent re-run drive proves it.
- Private exclusion (threat T-11-09): no private rows in any fixture; the
  emitter-exercising absence test is specified for Phase 12.
- Corrupt-file recovery (threat T-11-10): quarantine-not-delete with
  rebuild from the sessionstore restore authority; control C fired it.
- Fixture-script confinement (threat T-11-12): mktemp copies only, with
  the byte-identity check above.
- Bound parameters (threat T-11-07): the quote-plus-unicode title row
  proves binding in the exercise.
