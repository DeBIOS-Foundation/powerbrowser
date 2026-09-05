---
phase: 11-sql-store-design
reviewed: 2026-09-05T19:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - .planning/phases/11-sql-store-design/authority/AUTHORITY.md
  - .planning/phases/11-sql-store-design/authority/SIGN-OFF.md
  - .planning/phases/11-sql-store-design/schema/SCHEMA.md
  - .planning/phases/11-sql-store-design/schema/MIGRATIONS.md
  - .planning/phases/11-sql-store-design/schema/SIGN-OFF.md
  - .planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs
  - .planning/phases/11-sql-store-design/fixtures/tabs-v1.sqlite
  - .planning/phases/11-sql-store-design/11-REVIEW.md
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: clean
---

# Phase 11: Code Review Report (sql-store-design)

**Reviewed:** 2026-09-05T19:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** clean

## Summary

Reviewed the Phase 11 design-only deliverables: the SQL-02 authority table
plus sign-off, the SQL-03 schema plus migration plan plus sign-off, the
fixture database and throwaway exercise script, and the 11-REVIEW.md gate
record. Context files (11-CONTEXT/RESEARCH/PATTERNS/VALIDATION, plans,
11-01-SUMMARY) were read as background. The exercise script was re-run
(15 drives, 15 assertions, exit 0), the fixture was introspected via
node:sqlite, upstream source pins were checked line-by-line, and
`verify-platform.sh --quick`, `verify-registry-shape.mjs`, and
`check-internals-boundary.sh --catalogue` were all re-run green.

**Phase-discipline verdict: HOLDS.** Design-only confinement verified
(`git status` clean for `powerbrowser/ theia/ upstream/ patches/ scripts/`;
`git log 6337c9f~1..HEAD` outside the phase dir shows only workflow
bookkeeping flips in REQUIREMENTS/ROADMAP/STATE, no source changes);
SQLite-only verified (raw `duckdb` grep hits exactly the two deliberate
prior-research citations at AUTHORITY.md:41 and SCHEMA.md:155; refined
search plus import-pattern search clean); no manifest keys
(`configuration.toml`, `[features]`, `[sql]` all NO MATCH); no GUI surface
(tracked surface confined to the phase dir); authority-before-schema holds
in commit order (66d4547, 2184e0b before 769d855, 14009ef, 41dbad1 before
33f6480, bebe1ef). Upstream pins verified exact: `isWindowPrivate` at
PrivateBrowsingUtils.sys.mjs:18, `openConnection` at Sqlite.sys.mjs:1408
with ProfD-relative resolution at :1431-1433, `executeTransaction` at :776,
`get/setSchemaVersion` at :1872-1885, `tableExists`/`indexExists` at
:2138-2157, `clone` at :626, `backupToFile` at :1265, `execute(sql, params)`
at :734. Fixture matches its inventory (user_version=1, WAL mode, 3 public
rows incl. the quote-plus-unicode bound-parameter probe, both indexes,
`quick_check` exactly `['ok']`, sha256 `9daab2d5…e73f` stable across runs).

One BLOCKER: the quarantine suffix allocator is unspecified and the
reference implementation hardcodes `.corrupt-1`, so a second corruption
incident overwrites the first forensics — deletion wearing a recovery
costume, against the doc's own "never delete" rule. Six WARNINGs are all
exercise-fidelity or contract-precision gaps Phase 12 would otherwise copy
verbatim (downgrade refusal unexercised, WAL pin unasserted, rebuild outside
a transaction, sidecar litter contradicting the cleanup promise, fallback
readonly-flag mismatch, missing CHECK constraints).

## Critical Issues

### CR-01: Quarantine suffix `<N>` allocation unspecified; exercise hardcodes `.corrupt-1`, so a second incident destroys the first forensics

**File:** `.planning/phases/11-sql-store-design/schema/MIGRATIONS.md:52-53` and `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:166`
**Issue:** MIGRATIONS.md step 1 says to copy to `tabs.sqlite.corrupt-<N>`
with no rule for allocating `<N>`, while the reference implementation
Phase 12 copies verbatim hardcodes the suffix
(`const corruptPath = \`${path}.corrupt-1\``). A second corruption trip
overwrites the first `.corrupt-1` file, destroying the earlier forensics.
That is deletion of the exact evidence the procedure exists to preserve,
directly contradicting MIGRATIONS.md:61 ("Never delete the corrupt copy.
Deletion is data loss wearing a recovery costume"). The exercise never
drives a double-quarantine, so the collision is unproven-absent rather
than tested.
**Fix:**
```markdown
<!-- MIGRATIONS.md step 1: replace the bare <N> with an allocation rule -->
1. Copy the database file to the next free corrupt-suffixed name
   (`tabs.sqlite.corrupt-<N>`, N = max existing suffix + 1, starting at 1)
   via the `backupToFile` primitive. Never reuse a suffix: if
   `tabs.sqlite.corrupt-1` exists, write `tabs.sqlite.corrupt-2`.
```
```javascript
// exercise-migrations.mjs quarantineAndRebuild: allocate, don't hardcode
import { readdirSync } from 'node:fs';
function nextCorruptPath(path) {
  const dir = dirname(path), base = path.split('/').pop();
  let n = 0;
  for (const f of readdirSync(dir)) {
    const m = f.match(new RegExp(`^${base}\\.corrupt-(\\d+)$`));
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `${path}.corrupt-${n + 1}`;
}
// plus a drive: quarantine twice, assert both .corrupt-1 and .corrupt-2 exist
```

## Warnings

### WR-01: Never-downgrade refusal is specified but has zero exercise coverage

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:98-102` (spec at `schema/MIGRATIONS.md:19-21`)
**Issue:** The chain procedure's step 4 ("a database whose `user_version`
exceeds the chain head is left untouched and reported — the writer refuses")
is a load-bearing safety rule with no drive: fresh-create (v0), rerun (v1),
tamper, and stale (v0-with-tables) are exercised, but no copy with
`user_version > 1` is ever fed to `migrateToV1` to prove the throw fires
and the file is untouched. The refusal branch (`throw new Error('refusing
downgrade…')`) is dead code as exercised.
**Fix:** Add a drive — copy fixture, `PRAGMA user_version = 99`,
assert `migrateToV1` throws `/refusing downgrade/`, assert version still
99 and row set byte-equal afterwards:
```javascript
{
  const p = join(stage, 'newer.sqlite');
  copyFileSync(FIXTURE_V1, p);
  const v = new DatabaseSync(p);
  v.exec('PRAGMA user_version = 99');
  v.close();
  const db = new DatabaseSync(p);
  let threw = false;
  try { migrateToV1(db); } catch (e) { threw = /refusing downgrade/.test(e.message); }
  finally { db.close(); }
  check('newer-version-refuses', threw, 'chain head did not refuse a newer user_version');
}
```

### WR-02: WAL pin is specified but never set or asserted by the exercise

**File:** `.planning/phases/11-sql-store-design/schema/SCHEMA.md:138-143`
**Issue:** "Write-ahead-logging (WAL) is pinned" is part of the on-disk
contract, yet neither `migrateToV1` (fresh-create/stale paths) nor
`quarantineAndRebuild` executes `PRAGMA journal_mode=WAL`, and no drive
asserts `journal_mode`. Fresh-created and rebuilt staged DBs therefore run
in default rollback-journal mode while the drives report green — the
exercise proves everything about v1 except the one pragma the schema pins.
Phase 12 copying this shape would ship the version header without the
journal-mode pin the single-writer-plus-N-readers topology assumes.
**Fix:** Set WAL at creation/rebuild inside the same transaction as the DDL
(`db.exec('PRAGMA journal_mode=WAL')` before the version bump) and assert
in the fresh-create and quarantine drives:
```javascript
check('fresh-create-wal', db.prepare('PRAGMA journal_mode').get().journal_mode === 'wal', 'journal mode is not WAL after fresh-create');
```

### WR-03: Quarantine rebuild runs outside any transaction

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:173-181`
**Issue:** The rebuild path issues `CREATE TABLE`, `CREATE INDEX`,
`PRAGMA user_version`, and N `INSERT`s as independent statements with no
`BEGIN`/`COMMIT`, contradicting the doc's own one-transaction-per-mutation
rule (MIGRATIONS.md:13-15). A crash mid-rebuild leaves a version-stamped
but row-partial database — the exact partial-migration corruption vector
the chain procedure exists to prevent. The `migrateToV1` paths use
transactions correctly; only the rebuild diverges.
**Fix:** Wrap lines 174-178 in `BEGIN`/`COMMIT` with the existing
rollback-on-error pattern used at lines 117-126.

### WR-04: Exercise leaves `-wal`/`-shm` sidecars beside the committed fixture, contradicting the removal promise; no ignore coverage

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:206` (promise at `schema/MIGRATIONS.md:130-133`)
**Issue:** The run-time expectation probe opens the *committed* fixture
(`new DatabaseSync(FIXTURE_V1, { readOnly: true })`), and any WAL-mode open
materializes `-shm` (wal-index) beside it — observed this session: a 32768-byte
untracked `tabs-v1.sqlite-shm` plus `tabs-v1.sqlite-wal` appeared after a run
(cleaned up during review; fixture hash unaffected). MIGRATIONS.md promises
sidecars "are removed after every run", but the script only removes the mktemp
stage, never the fixture sidecars. `.gitignore` has no `*-wal`/`*-shm`
coverage, so a future `git add -A` commits 32KB of runtime state. Deleting
sidecars is additionally only safe when fully checkpointed — no
checkpoint-before-commit discipline is documented, so the current "delete the
sidecars" advice could discard uncheckpointed frames on a future fixture.
**Fix:**
```javascript
// after the probe close (or in a finally): checkpoint then clean
// probe.exec('PRAGMA wal_checkpoint(TRUNCATE)') on a read-write COPY is wrong;
// instead open probe on a copy, or unlink sidecars only after checkpoint:
const rw = new DatabaseSync(copyOfFixture);
rw.exec('PRAGMA wal_checkpoint(TRUNCATE)');
rw.close();
```
plus: remove `tabs-v1.sqlite-wal/-shm` at script end, add `*-wal` / `*-shm`
(or `*.sqlite-wal`, `*.sqlite-shm`) to `.gitignore`, and record
"checkpoint-then-clean" in MIGRATIONS.md's sidecar note.

### WR-05: Fallback reader uses the wrong readonly-option spelling and opens the fixture read-write

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:206` with fallback at `:73-74`
**Issue:** Line 206 opens the probe with node:sqlite spelling
`{ readOnly: true }`. When the ephemeral-fallback path activates
(`DatabaseSync` = better-sqlite3), the correct spelling is
`{ readonly: true }` (all-lowercase) — the unknown `readOnly` key is
ignored, so the fallback opens the *committed fixture* read-write instead
of readonly, breaking the "mutated copies only / byte-identity" guarantee
the whole exercise stands on. Latent on Node ≥22 (standard library present;
verified present here, v24.19.0) but a real wrong-behavior bug on any host
where the fallback runs.
**Fix:**
```javascript
const probe = DatabaseSync === null
  ? null
  : new DatabaseSync(FIXTURE_V1, isBetterSqlite3 ? { readonly: true } : { readOnly: true });
// simplest robust form: branch once where the fallback assigns DatabaseSync,
// e.g. record `let readOnlyOption = { readOnly: true }` and set
// `readOnlyOption = { readonly: true }` in the better-sqlite3 branch.
```

### WR-06: DDL permits empty-string URI primary key and negative `last_active`

**File:** `.planning/phases/11-sql-store-design/schema/SCHEMA.md:33-42`
**Issue:** `uri TEXT PRIMARY KEY` accepts `''` and `last_active INTEGER NOT
NULL` accepts negatives. A writer bug binding an empty URI inserts a poison
row that joins nothing yet satisfies the PK; a clock bug stores negative
activity that corrupts recency ordering and retention pruning (`DELETE …
WHERE last_active < ?`). Both are cheap to exclude at the contract layer
where Phase 12 implements the DDL verbatim.
**Fix:**
```sql
CREATE TABLE tabs (
  uri         TEXT PRIMARY KEY CHECK(length(uri) > 0),
  url         TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  last_active INTEGER NOT NULL CHECK(last_active >= 0)
);
```

## Info

### IN-01: Tripwire integrity check opens the suspect file read-write before preserving it

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:156`
**Issue:** `quarantineAndRebuild` opens the possibly-corrupt staged file
read-write just to run `quick_check`. A read-write open performs recovery
writes (hot-journal rollback, WAL recovery) that mutate the evidence before
line 167 copies it to the `.corrupt-*` path — the forensics copy is
post-recovery, not the original corrupt state. Harmless here (staged copies
only) and the chrome-side real path uses the already-open write connection,
but Phase 12 should perform the check off a readonly handle or the existing
connection, never a fresh read-write open of a suspect file.
**Fix:** Open readonly for the check (`new DatabaseSync(path, { readOnly: true })`)
or run the tripwire on the already-open write connection.

### IN-02: Bare `catch {}` blocks discard diagnostically valuable errors

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:111,124,162-164,168-170`
**Issue:** The `ROLLBACK`-in-handler ignores (lines 111, 124) are standard
idiom and fine, but line 162-164 maps *every* open failure to
`ok = false` while dropping the error object — which failure mode tripped
the wire (unopenable vs not-ok vs I/O error) is forensics. Log it.
**Fix:** `catch (e) { console.log(\`${NAME}: tripwire open failed: ${e.message}\`); ok = false; }`

### IN-03: Dynamic import of an absolute path without a file URL in the fallback path

**File:** `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs:73`
**Issue:** `await import(join(stage, 'node_modules', …))` passes a bare
POSIX path to the ESM loader; the robust form is
`pathToFileURL(...).href`. Works on current Node, brittle across versions
— and it only runs in the already-rare fallback path.
**Fix:** `const { default: Better } = await import(pathToFileURL(join(stage, 'node_modules', 'better-sqlite3', 'lib', 'index.js')).href);`

### IN-04: 11-03-PLAN.md:88 verify predicate over-matches the deliberate DuckDB citations

**File:** `.planning/phases/11-sql-store-design/11-03-PLAN.md:88`
**Issue:** The plan's literal `! grep -rEi 'duckdb' …/authority …/schema`
fails on the two intentional traceability citations (AUTHORITY.md:41,
SCHEMA.md:155). The gate (11-REVIEW.md §3) transparently records this
deviation and substitutes raw-plus-refined proof — correct handling, no doc
change needed. Noting so Phase 12 authors copying the predicate use the
refined form (exclude `research/duckdb-vs-sqlite` citation paths).
**Fix:** None required; when reused, append `| grep -v 'research/duckdb-vs-sqlite'` before asserting absence.

### IN-05: Future-removal proof mechanism is unspecified

**File:** `.planning/phases/11-sql-store-design/schema/MIGRATIONS.md:22-24`
**Issue:** "Any removal first proves no Phase 12 reader projects the removed
shape" names no proof procedure (which readers, which check, where
recorded). Acceptable for a v1-only phase with zero removals, but the first
removal migration will need the mechanism stated or the rule is
unenforceable.
**Fix:** When the first removal is proposed, specify the proof (e.g. grep
over the reader surface plus a failing-first drive) in the migration entry.

---

_Reviewed: 2026-09-05T19:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Fixed: 2026-09-05 — all 12 findings addressed in 12 atomic fix(11) commits
(32cce0d CR-01, 5f66d67 WR-01, 3a98922 WR-02, 9d5d360 WR-03, a78b6d1 WR-04,
2f46b47 WR-05, 7ae32ed WR-06, 88ba7ea IN-01, 88c646d IN-02, d2f14c4 IN-03,
7b04657 IN-04, e65f58f IN-05); exercise 23/23 green, quick gate green.
Status set to clean._
_Depth: standard_
