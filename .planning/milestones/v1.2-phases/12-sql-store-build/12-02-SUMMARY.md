---
phase: 12-sql-store-build
plan: 02
subsystem: sql-store
tags: [sqlite, better-sqlite3, places, sessionstore, theia-backend, absence-test]

# Dependency graph
requires:
  - phase: 12-sql-store-build plan 01
    provides: chrome-side writer with private filter, DDL markers, beside-registry key rule
provides:
  - readonly better-sqlite3 query API on @powerbrowser/tab-uris tolerating a missing file
  - chrome-side Places reads plus sessionstore projection behind the boundary
  - emitter-exercising private-absence instrument with positive control
affects: [12-03 promotion to registry rows, startup trigger wiring]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 9000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: [better-sqlite3@13.0.3 (theia backend reader only, readonly)]
  patterns: [readonly-handle-with-lazy-reopen reader, delegate-to-single-parser read projection, static-derive-plus-staged-live gate]

key-files:
  created: [theia/extensions/tab-uris/src/node/tab-query-service.ts, theia/extensions/tab-uris/src/node/tab-query-backend-module.ts, theia/extensions/tab-uris/src/node/better-sqlite3.d.ts, scripts/verify-sql-store-absence.mjs]
  modified: [theia/extensions/tab-uris/package.json, theia/yarn.lock, powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/INTERNAL-APIS.md, inventory/brand-tokens.json]

key-decisions:
  - "Local better-sqlite3.d.ts instead of @types/better-sqlite3: no new supply-chain surface for 25 lines of typings"
  - "projectSessionStoreTabs delegates to the 12-01 parser rather than re-parsing: one JSON-string parse, rebuild source and read surface cannot disagree"
  - "Live absence drive STAGED on derived startup-wiring absence (not faked): nothing calls ensureTabStore/startTabStoreTriggers at startup yet, so no session can exercise the emitter until the 12-03 promotion"

patterns-established:
  - "Reader missing-file tolerance: catch readonly-open failure, serve empty, lazy re-open on next query"
  - "Catalogue renumbering after boundary edits: every downstream file:line row is re-derived, never left stale"
  - "Frozen -PLAN.md census moves by documented COUNT MOVED with nothing renumbered or deleted"

requirements-completed: [SQL-04]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "TabQueryService serves point reads and recency listing from a readonly handle, tolerating a missing file"
    requirement: "SQL-04"
    verification:
      - kind: integration
        ref: "node one-off drive: temp tabs.sqlite point/keyed/recency reads plus missing-dir empty answers"
        status: pass
    human_judgment: false
  - id: D2
    description: "Chrome-side history, bookmark, folder-listing, and sessionstore readers behind the boundary with no raw places access"
    requirement: "SQL-04"
    verification:
      - kind: other
        ref: "node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs + scripts/check-internals-boundary.sh --catalogue + places.sqlite grep gate"
        status: pass
    human_judgment: false
  - id: D3
    description: "Absence instrument static half plus self-test green; live drive STAGED pending startup wiring"
    requirement: "SQL-04"
    verification:
      - kind: other
        ref: "node scripts/verify-sql-store-absence.mjs && node scripts/verify-sql-store-absence.mjs --self-test"
        status: pass
    human_judgment: false

# Metrics
duration: 45min
completed: 2026-09-05
status: complete
---

# Phase 12 Plan 02: SQL-04 Read Paths Summary

**Readonly better-sqlite3 query API beside the frozen registry, chrome-side Places reads plus sessionstore projection, and an emitter-exercising absence instrument that stages honestly until startup wiring lands**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-05T11:30:00Z
- **Completed:** 2026-09-05T12:15:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Theia backend serves tab reads from a readonly handle on tabs.sqlite with first-launch tolerance, composed with no core patch
- History, bookmark, folder-listing, and sessionstore reads exposed chrome-side through platform APIs; backend still touches only the dedicated file
- Private exclusion proven by an instrument that derives its assertions from the writer source and cannot pass vacuously

## Task Commits

Each task was committed atomically:

1. **Task 1: Readonly query API in @powerbrowser/tab-uris** - `1b7bf88` (feat)
2. **Task 2: Chrome-side Places reads plus sessionstore projection** - `6799c70` (feat)
3. **Task 3: Emitter-exercising private-absence instrument** - `4a3330c` (feat)

## Files Created/Modified
- `theia/extensions/tab-uris/src/node/tab-query-service.ts` - Readonly query service: single readonly handle with engine assert, missing-file tolerance plus lazy re-open, bound-param point reads and recency listing, beside-registry key lookup
- `theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` - ContainerModule composition with one singleton binding, no HTTP route
- `theia/extensions/tab-uris/src/node/better-sqlite3.d.ts` - Minimal local typings for the used surface (deviation: avoids a new @types dependency)
- `theia/extensions/tab-uris/package.json` - better-sqlite3@13.0.3 exact pin plus backend theiaExtensions entry; frontend entry byte-identical
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` - PlacesUtils lazy import; readHistoryEntry, readBookmarkByUrl, listBookmarkFolder, projectSessionStoreTabs
- `powerbrowser/INTERNAL-APIS.md` - Two new catalogue rows plus renumbering of all 28 downstream rows shifted by the insertions
- `inventory/brand-tokens.json` - Frozen -PLAN.md census 34 -> 36 with documented count move
- `scripts/verify-sql-store-absence.mjs` - Static derive-and-compare plus filter-ordering checks, both-directions self-test, headless-first live drive with honest STAGED path

## Decisions Made
- Local `better-sqlite3.d.ts` instead of installing `@types/better-sqlite3`: the reader uses four methods, and a new registry dependency for typings alone widens the supply chain for nothing.
- `projectSessionStoreTabs` delegates to the 12-01 `parseSessionStoreTabRows` instead of adding a second JSON-string parse: rebuild source, sweep input, and read surface share one shape by construction.
- Live absence drive reports STAGED (exit 0, exact rerun command) when derived readiness fails: binary present, but no startup call into ensureTabStore/startTabStoreTriggers exists in powerbrowser.js or TheiaService.sys.mjs, so no session today can exercise the emitter. Attempting the launch anyway would fail the positive control for want of wiring, not coverage -- staging records the blocker instead of faking a pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added local better-sqlite3 type declarations**
- **Found during:** Task 1 (extension build in the theia shell)
- **Issue:** `tsc -b` failed with TS7016 -- better-sqlite3 ships no types and noImplicitAny is on
- **Fix:** Created `src/node/better-sqlite3.d.ts` covering exactly the used surface (constructor with readonly flag, readonly property, prepare/get/all, close) instead of installing `@types/better-sqlite3`
- **Files modified:** theia/extensions/tab-uris/src/node/better-sqlite3.d.ts
- **Verification:** `yarn build` clean in the theia shell
- **Committed in:** 1b7bf88 (part of task commit)

**2. [Rule 1 - Bug] Repaired catalogue table row clobbered by edit**
- **Found during:** Task 2 (catalogue row insertion)
- **Issue:** Edit replaced the opening cells of the adjacent Services.wm row, corrupting the table
- **Fix:** Re-added the dropped row prefix; verified table shape by reading the region
- **Files modified:** powerbrowser/INTERNAL-APIS.md
- **Verification:** `--catalogue` check passes
- **Committed in:** 6799c70 (part of task commit)

**3. [Rule 1 - Bug] Renumbered 28 catalogue rows shifted by insertions**
- **Found during:** Task 2 (`--catalogue` went red naming 28 uncatalogued lines)
- **Issue:** Lazy-block (+5) and wrapper (+82) insertions shifted every downstream occurrence line; rows carry exact file:line
- **Fix:** Remapped all 28 rows to derived current lines via scripted regex, re-ran `--catalogue` green
- **Files modified:** powerbrowser/INTERNAL-APIS.md
- **Verification:** `scripts/check-internals-boundary.sh --catalogue` exits 0
- **Committed in:** 6799c70 (part of task commit)

**4. [Rule 2 - Missing Critical] Bumped frozen -PLAN.md census 34 -> 36**
- **Found during:** Task 2 (quick gate red on scan-brand-residue reconciliation)
- **Issue:** Two new 12-02 provenance citations in INTERNAL-APIS.md broke the frozen count assertion
- **Fix:** COUNT MOVED with rationale prepended, following the 12-01 precedent verbatim; nothing renumbered or deleted
- **Files modified:** inventory/brand-tokens.json
- **Verification:** `scripts/verify-platform.sh --quick` exits 0
- **Committed in:** 6799c70 (part of task commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 blocking, 1 missing critical)
**Impact on plan:** All required for correctness and green gates. No scope creep; no GUI surface; no core patch.

## Issues Encountered
- TS7016 on the theia build (no shipped types for better-sqlite3) -- resolved with local declarations per above.
- Catalogue line-shift cascade after boundary insertions -- resolved by full renumbering; future boundary edits must repeat this step.
- Live absence drive cannot run end-to-end yet: startup trigger wiring (ensureTabStore/startTabStoreTriggers called at shell startup) is not landed. The script derives this from the tree and STAGEs with the exact rerun command rather than failing or faking a pass. This is the known 12-03 promotion item, not a defect in this plan's deliverables.

## Threat Flags

None - no new surface beyond the plan's threat model. Backend opens only tabs.sqlite readonly (T-12-07 mitigated by flag plus property assert); no private column exists and the filter-ordering check pins exclusion at the writer (T-12-08 instrumented); projections carry tab fields only (T-12-09); missing-file tolerance serves empty with re-open (T-12-10); Places reads use fetch/getFolderContents with zero places.sqlite references (T-12-11, grep-gated); better-sqlite3 legitimacy OK per Phase 12 research, exact pin recorded in the install commit (T-12-SC accepted).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 12-03 consumes the absence script and the backend reader: promote the instruments to registry rows and wire startup triggers (ensureTabStore plus startTabStoreTriggers at shell startup), which clears the live drive's STAGED condition.
- Backend reader's profile directory arrives via POWERBROWSER_PROFILE_DIR env or setProfileDir; the supervisor spawn path should set it when wiring reads in 12-03.

---
*Phase: 12-sql-store-build*
*Completed: 2026-09-05*

## Self-Check: PASSED
- FOUND: theia/extensions/tab-uris/src/node/tab-query-service.ts (124 lines)
- FOUND: theia/extensions/tab-uris/src/node/tab-query-backend-module.ts (15 lines)
- FOUND: scripts/verify-sql-store-absence.mjs (453 lines)
- FOUND: 1b7bf88, 6799c70, 4a3330c in git log
- Reader serves rows from temp DB; missing dir serves empty; zero write tokens; catalogue green; quick green
