---
phase: 12-sql-store-build
reviewed: 2026-09-05T21:00:00Z
depth: deep
files_reviewed: 13
files_reviewed_list:
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
  - powerbrowser/INTERNAL-APIS.md
  - theia/extensions/tab-uris/src/browser/browser-tab-uri.ts
  - theia/extensions/tab-uris/src/node/tab-query-service.ts
  - theia/extensions/tab-uris/src/node/tab-query-backend-module.ts
  - theia/extensions/tab-uris/src/node/better-sqlite3.d.ts
  - theia/extensions/tab-uris/package.json
  - scripts/verify-sql-store-roundtrip.mjs
  - scripts/verify-sql-store-absence.mjs
  - scripts/verify-sql-store-second-writer.mjs
  - scripts/verify-sql-store-soak.mjs
  - scripts/verify-platform.sh
  - theia/yarn.lock
findings:
  critical: 4
  warning: 5
  info: 3
  total: 12
status: clean
---

# Phase 12: Code Review Report

**Reviewed:** 2026-09-05T21:00:00Z
**Depth:** deep
**Files Reviewed:** 13
**Status:** clean

## Summary

Reviewed the Phase 12 SQL store build end to end: the chrome-side writer behind
`PowerBrowserAPI.sys.mjs`, the beside-registry key rule, the readonly
better-sqlite3 reader, all four store-gate instruments, the nine new
`verify-platform.sh` rows, and the `INTERNAL-APIS.md` catalogue delta.
Cross-file tracing was done against pinned upstream source
(`SessionStore.sys.mjs`, `Sqlite.sys.mjs`, `PlacesUtils.sys.mjs`) rather than
trusting the implementation's comments.

What holds: single boundary file with zero `FORBIDDEN_PATTERNS` changes,
`--catalogue` and the boundary guard both green, DDL verbatim against
`SCHEMA.md` v1 (both CHECKs intact), bound parameters on every statement, URI
join key spelled identically both sides, registry-shape files byte-identical,
patch 020 untouched, no Theia core patch, no XPCOM/jar.mn surface, all four
gate scripts plus self-tests green, `--quick` green.

What does not hold: the privacy invariant is broken on two paths, the
corruption-recovery path cannot succeed, the recovery proof proves a procedure
the production code does not implement, and the writer never executes in
production at all. Four BLOCKERs below; none is a style preference.

## Critical Issues

### CR-01: Private tabs leak into SQL via the sessionstore sweep and quarantine rebuild

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:868-891` (`parseSessionStoreTabRows`), `996-1008` (`sweepTabStoreFromSessionStore`), `901-952` (`quarantineAndRebuildTabStore`)
**Issue:** The write-path private filter (`isWindowPrivate(chromeWin)` in
`writeTabRow`) only runs when the caller passes a `chromeWin`. The sweep calls
`writeTabRow` with no `chromeWin` (lines 1000-1005), so the guard
`if (chromeWin && ...)` is skipped by construction. Worse, the rows themselves
include private tabs: `parseSessionStoreTabRows` iterates every window in
`getBrowserState()` with no `isPrivate` skip. Verified against pinned
upstream: `getCurrentState` pushes all entries of `this._windows` into the
state with no `isPrivate` filter, and window data carries `isPrivate = true`
(`upstream/browser/components/sessionstore/SessionStore.sys.mjs:2090`, state
assembly loop with no private exclusion — the `!wData.isPrivate` filters at
2517/2536/2574/2595 gate save/close paths, not `getCurrentState`). So every
sweep upserts private-window tabs, and every quarantine rebuild persists them.
The quarantine path inserts `restoreRows` directly with no filter possible.
The absence gate's static half pins only the `writeTabRow` ordering, so it
stays green while both leak paths flow. This contradicts T-12-03/T-12-08 and
the phase success criterion "private tabs absent".
**Fix:**
```javascript
for (const win of state.windows ?? []) {
  if (win.isPrivate) {
    continue; // sessionstore includes private windows; the store never does
  }
  for (const tab of win.tabs ?? []) {
```

### CR-02: `quarantineAndRebuildTabStore` nests `executeTransaction`, which upstream forbids — rebuild always times out and rolls back

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:940-949` (outer transaction) calling `636-660` (`migrateTabStoreToV1`, inner transaction)
**Issue:** The quarantine path runs `conn.executeTransaction(async () => {
await PowerBrowserAPI.migrateTabStoreToV1(conn); ... })`, and
`migrateTabStoreToV1` itself calls `conn.executeTransaction(...)`. Pinned
upstream states verbatim: "YOU SHOULD _NEVER_ NEST executeTransaction CALLS
FOR ANY REASON ... NESTING CALLS WILL BLOCK ANY FUTURE TRANSACTION UNTIL A
TIMEOUT KICKS IN" (`upstream/toolkit/modules/Sqlite.sys.mjs:2093-2110`).
The inner transaction enqueues behind the outer on `_transactionQueue` while
the outer awaits it: deadlock until `TRANSACTIONS_TIMEOUT_MS`, then the inner
rejects, the outer rolls back, the rebuild throws, `tabStoreConn` is never
assigned, and the store stays corrupt-and-untouched permanently (every later
open re-trips). The corruption-recovery path — the entire point of Fix 3 —
cannot succeed.
**Fix:** Do not call `migrateTabStoreToV1` inside the outer transaction.
Inline the DDL statements into the outer transaction body (they are already
derived from the marker constant), or run the migration first and the
row-inserts second in two sequential top-level transactions:
```javascript
await PowerBrowserAPI.migrateTabStoreToV1(conn); // own transaction, not nested
await conn.executeTransaction(async () => {
  for (const row of restoreRows) {
    await conn.execute(/* upsert */, { ... });
  }
});
```

### CR-03: Quarantine rebuilds INTO the corrupt live file; the roundtrip proof proves a different procedure than production runs

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:918-950`; contrast `scripts/verify-sql-store-roundtrip.mjs:196-220`
**Issue:** After `backupToFile` + close + sidecar removal, production reopens
the same corrupt `livePath` and runs the migration against it. On a
corrupt-but-readable file, `migrateTabStoreToV1`'s `tableExists`/`indexExists`
pre-checks return true, so it takes the "no-op success that only stamps the
version" branch and inserts live rows into a corrupt database. The roundtrip
script's `quarantineAndRebuild` instead does `rmSync(path)` (line 202) and
rebuilds on a fresh file — the gate proves delete-then-rebuild while production
does open-corrupt-then-migrate. A gate that exercises different code than what
ships proves nothing about the shipped path (even with CR-02 fixed, the
rebuilt rows land in the tripped file).
**Fix:** After a successful `backupToFile`, delete the live file before
reopening, matching the proven procedure:
```javascript
await IOUtils.remove(livePath); // forensics already preserved at corruptPath
const conn = await lazy.Sqlite.openConnection({ path: TAB_STORE_FILE_NAME });
```
and extend the roundtrip drive (or a new assertion) to derive this removal
from the writer source the way the downgrade branch is pinned.

### CR-04: The writer never executes in production — no startup wiring calls `ensureTabStore`/`startTabStoreTriggers`

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:961-1085` (dead on arrival); evidence derived by `scripts/verify-sql-store-absence.mjs:337-347` and `scripts/verify-sql-store-soak.mjs:247-256`
**Issue:** Nothing in the tree calls `ensureTabStore` or
`startTabStoreTriggers`: no reference in `powerbrowser.js`,
`TheiaService.sys.mjs`, or anywhere outside the boundary file itself
(verified by grep — the only file naming these symbols outside the verify
scripts is their own definition site). The project's own instruments derive
this and report STAGED, and both live halves exit clean without driving
anything. Net effect: zero rows are ever written, zero triggers attached,
phase success criterion 1 ("every tab is a SQL row written only by the
chrome-side writer") is unmet in production, and ~500 lines of writer/trigger
code ship as unreachable dead code. STAGED-exit-clean is registration proof
for a gate, not delivery proof for the feature; 12-02 promised the wiring
"lands with the plan 12-03 promotion" and 12-03 did not land it.
**Fix:** Wire the startup calls (e.g. in the shell startup path via
`TheiaService` → `PowerBrowserAPI.ensureTabStore()` then
`startTabStoreTriggers()`), at which point the STAGED live halves must go
green for real — a STAGED full-tier row must not be the phase's closing state
for its own core criterion.

## Warnings

### WR-01: `listBookmarkFolder` never sets `containerOpen = true`, so it always resolves `[]`

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:788-809`
**Issue:** The code reads `root.childCount` / `root.getChild(i)` on the
`getFolderContents(...).root` node without ever setting
`root.containerOpen = true` (the `finally` sets it `false`). Upstream's own
contract opens the container before reading children
(`upstream/toolkit/components/places/PlacesUtils.sys.mjs:1390`:
`result.root.containerOpen = true`). A closed container exposes no children,
so the folder listing silently returns empty — masked by the never-throw
convention into a plausible `[]`. Success criterion 2 claims bookmark
exposure; this reader cannot return a row.
**Fix:**
```javascript
const root = lazy.PlacesUtils.getFolderContents(folderGuid, false, false).root;
root.containerOpen = true;
try {
  // ... existing child enumeration ...
} finally {
  root.containerOpen = false;
}
```

### WR-02: Second-writer scan has three bypass shapes that stay green

**File:** `scripts/verify-sql-store-second-writer.mjs:99-107`
**Issue:** (a) Rule (b) allows any theia/ `new Database(` line containing the
substring `readonly` — `new Database(p, { readonly: false })` passes, as does
`new Database(p); // TODO: readonly later`. The flag value is never parsed.
(b) `new DatabaseSync(` (node:sqlite) never matches `new Database(` (exact
open-paren spelling), so a theia-side read-write writer via the stdlib engine
the project's own scripts already use evades the scan entirely. (c) `.py`,
`.sh`, and `sqlite3`-CLI writes are outside the scanned extensions. No live
offender exists today, so this is enforcement depth, not an active second
writer — but the gate claims "every new Database call without the flag fails"
and that claim is false for these shapes.
**Fix:** Parse the options literal for `readonly: true` (fail on
`readonly: false` or an unparseable call), add `DatabaseSync(` to
`OPEN_SHAPES` with a carve-out for `scripts/` stage-copy usage keyed on
`mktemp`/stage paths rather than a blanket exemption, and document the
`.py`/`.sh`/CLI exclusion in the header.

### WR-03: Committed reader does not typecheck against its own `d.ts`; the compiling form is an unstaged working-tree edit

**File:** `theia/extensions/tab-uris/src/node/tab-query-service.ts:39,62,70`; `theia/extensions/tab-uris/src/node/better-sqlite3.d.ts:8-24`
**Issue:** HEAD declares `private db: Database.Database | null` (three
sites), but the shipped local `d.ts` declares only a default-exported class
with no `Database` namespace member — `Database.Database` resolves to nothing
under it, and better-sqlite3@13.0.3 ships no bundled types (verified:
`types`/`typings` absent, so no other declaration competes). The working tree
carries the fix (`Database | null`) as an uncommitted, unstaged modification,
so HEAD is red under `tsc -b` while the tree looks green, and no
`verify-platform.sh` row compiles the extension — the break is invisible to
every gate. Unstaged fixes are also invisible to the residue scan's trust
model (stage-before-green).
**Fix:** Commit the `Database | null` form (or extend the `d.ts` with the used
namespace surface, not both), and add a static row that runs the extension
build or at minimum `tsc --noEmit` so type errors go red in `--quick`.

### WR-04: `TabQueryService` has no consumer — the query API is unreachable

**File:** `theia/extensions/tab-uris/src/node/tab-query-service.ts`; `theia/extensions/tab-uris/src/node/tab-query-backend-module.ts:13-15`
**Issue:** Grep over `theia/extensions` (excluding node_modules) shows
`TabQueryService` named only in its own two files. No injection site, no HTTP
route (correctly no `BackendApplicationContribution`, but then nothing serves
it), no frontend RPC interface, no `POWERBROWSER_PROFILE_DIR` wiring from the
supervisor spawn path (noted as future work in the 12-02 summary). The
`ContainerModule` binds a singleton nobody injects — inversify instantiates on
demand, so the service never constructs. "A query API answers reads" is
unproven and currently uncallable.
**Fix:** Add the first real consumer (frontend RPC binding or backend route
plus supervisor `setProfileDir` wiring) or mark the service explicitly staged
with its own STAGED-style readiness check rather than presenting it as
shipped.

### WR-05: `checkTabStoreIntegrity` is dead code; `ensureTabStore` duplicates its tripwire inline

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:851-859` vs `968-975`
**Issue:** `checkTabStoreIntegrity` has zero callers anywhere in the tree.
`ensureTabStore` re-implements the identical exact-single-`ok` quick_check
inline instead of calling it. The two copies can now drift independently (one
fix lands in one copy), and the catalogued method is the one that never runs.
**Fix:** Call the method:
```javascript
const ok = await PowerBrowserAPI.checkTabStoreIntegrity();
if (ok) {
  return "ready";
}
```

## Info

### IN-01: Soak "interleave" is sequential, so no WAL contention is exercised

**File:** `scripts/verify-sql-store-soak.mjs:164-180`
**Issue:** Handles A and B take turns with awaited statements — Node runs each
to completion before the next begins, so no lock, busy-handler, or checkpoint
contention path is ever stressed. The header's "exercising WAL multi-handle
traffic the way a tab burst beside Places traffic does" overstates what
sequential awaits prove. Harmless as a binding/integrity test; weak as a soak.
**Fix:** Either attempt genuinely overlapping transactions (e.g. begin on A,
write on B before A commits, asserting busy/timeout behavior is sane) or
reword the header to "sequential dual-handle interleave".

### IN-02: Recency-ordering contract differs across the boundary for no stated reason

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:727` vs `theia/extensions/tab-uris/src/node/tab-query-service.ts:119`
**Issue:** Chrome `listTabRows` returns `ORDER BY uri`; the backend
`listByRecency` returns `ORDER BY last_active DESC LIMIT ?`. Two list surfaces
over the same store with different orderings and no documented rule for which
consumer uses which. Not a bug today (no consumers), but the first consumer
will pick one arbitrarily.
**Fix:** Document which ordering is canonical per consumer, or serve both from
one parameterized implementation.

### IN-03: Quarantine path derivation mixes `getProfileDir()` with ProfD-relative open

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:902-917, 938`
**Issue:** `corruptPath` is built from `getProfileDir()`, which resolves `""`
on any failure — yielding `/tabs.sqlite.corrupt-1` at the filesystem root —
while the reopen uses ProfD-relative `tabs.sqlite`. On a profile-dir failure
the backup throws (likely EACCES at `/`), which `ensureTabStore` catches into
`degraded`, but only after sidecar-removal attempts against root-anchored
paths and with forensics unpreserved.
**Fix:** Refuse early when `profileDir` is empty (`throw new Error(
"quarantineAndRebuildTabStore: unknown profile dir")`) before touching
anything, letting the caller degrade cleanly.

---

_Reviewed: 2026-09-05T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Fixed: 2026-09-05 — all 12 findings addressed in 10 atomic fix(12) commits
(4ac17eb CR-01 parser isPrivate skip plus absence static pin,
91cfd10 CR-02 sequential top-level transactions,
2aeac84 CR-03 delete-then-rebuild plus IN-03 empty-profile-dir refusal,
00c0051 CR-04 startup wiring with late-window triggers plus catalogue rows
plus absence 60s settle, e5489c1 WR-01, a90a345 WR-02 plus roundtrip pin
re-anchor, 7ba2266 WR-03 plus tab-uris-typecheck registry row,
9d0403f WR-04, c4be357 WR-05, cddacf2 IN-01, a6fc167 IN-02).
Live proof: absence private-zero plus public-row PASS through the built
binary; roundtrip 24/24, soak 14/14, all self-tests, --quick, registry-shape,
boundary plus catalogue green. Status set to clean._
