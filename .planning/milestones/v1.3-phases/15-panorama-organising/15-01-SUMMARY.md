---
phase: 15-panorama-organising
plan: 01
subsystem: panorama
tags: [gui08, js-window-actor, sqlite-migration, theia-widget, group-model]

# Dependency graph
requires:
  - phase: 14-modes-windows-setups
    provides: organising placeholder slot seam plus modes shell the tracer binds behind
  - phase: 12-sql-store-build
    provides: v1 tab-store writer, readonly TabQueryService, second-writer gate
provides:
  - v2 groups schema plus single-writer group methods in PowerBrowserAPI
  - PowerBrowserGroup JSWindowActor pair with startup registration
  - GroupModel single store plus GroupActorClient correlator
  - tracer Panorama widget owning the organising slot (canvas plus tree roots)
  - gui08 persistence-roundtrip gate plus registry rows
affects: [15-02, 15-03, 15-04, 15-05]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 56000
  tasks: 4
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [actor-child-dom-event-bridge, derived-then-compared-gate, catalogue-line-repin]

key-files:
  created: [powerbrowser/shell/GroupActorChild.sys.mjs, theia/extensions/tab-uris/src/browser/group-query-service.ts, theia/extensions/modes/src/browser/group-model.ts, theia/extensions/modes/src/browser/group-actor-client.ts, theia/extensions/modes/src/browser/organising-widget.ts, theia/extensions/modes/src/browser/panorama-commands.ts, scripts/verify-gui08-persistence-roundtrip.mjs]
  modified: [powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/shell/TheiaService.sys.mjs, powerbrowser/shell/jar.mn, powerbrowser/INTERNAL-APIS.md, theia/extensions/tab-uris/src/node/tab-query-service.ts, theia/extensions/tab-uris/src/node/tab-query-backend-module.ts, theia/extensions/modes/src/browser/modes-frontend-module.ts, theia/extensions/modes/src/browser/modes.css, scripts/verify-platform.sh, inventory/brand-tokens.json]

key-decisions:
  - "Card dive reuses the GUI-01 window.open channel, not OpenerService"
  - "setTabGroupId private-exclusion rides the known-row check (private tabs never have rows)"
  - "Zoom ships as a pure view transform; resize and auto-box stay 15-02"
  - "GUI-08 stays Pending: this plan lands gate 1 of 5, completion waits for 15-05"

patterns-established:
  - "Actor child file carries zero privileged reach: handleEvent plus sendQuery plus DOM dispatch only"
  - "Catalogue line re-pin: every PowerBrowserAPI insertion re-derives occurrence lines and rewrites File:Line cells plus adds one row per new occurrence line"
  - "Frozen brand row moves by documented COUNT MOVED with byte-identical priors, never renumber-or-delete"

requirements-completed: []  # GUI-08 partial (gate 1 of 5 landed); completion lands with 15-05. Deliberately not marked complete.

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "v2 groups migration plus six single-writer group methods with quarantine-reseed-empty"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "node scripts/verify-gui08-persistence-roundtrip.mjs"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only sql-store-second-writer"
        status: pass
    human_judgment: false
  - id: D2
    description: "PowerBrowserGroup actor pair with startup registration and catalogue rows"
    requirement: "GUI-08"
    verification:
      - kind: automated_ui
        ref: "bash scripts/check-internals-boundary.sh (plus --catalogue plus --self-test)"
        status: pass
      - kind: other
        ref: "sole-caller assertion: registerWindowActor in exactly PowerBrowserAPI.sys.mjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "GroupModel single store with canvas plus tree tracer roots and actor-backed mutations"
    requirement: "GUI-08"
    verification:
      - kind: unit
        ref: "tsc -b theia/extensions/modes theia/extensions/tab-uris (nix develop .#theia)"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D4
    description: "Persistence-roundtrip gate with --self-test through the single driver"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-persistence-roundtrip"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-persistence-roundtrip-self-test"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live headed proof: one group roundtrip through the real actor crossing, painted identically in canvas plus tree"
    verification: []
    human_judgment: true
    rationale: "No display in this env (RESEARCH Environment Availability); chrome SQL halves proven by D1/D4 mirrors, wire names match both sides, but Gecko delivery plus DOM paint need a headed shell"

# Metrics
duration: 34min
completed: 2026-09-06
status: complete
---

# Phase 15 Plan 01: Transport plus Migration plus GroupModel Tracer Summary

**Single chrome-side group write path live: v1→v2 migration, actor pair, shared GroupModel, tracer widget, persistence gate green**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-06T07:45:44Z
- **Completed:** 2026-09-06T08:19:31Z
- **Tasks:** 4
- **Files modified:** 18 (7 created chrome/Theia-side plus gate, 11 extended)

## Accomplishments
- v2 schema (groups table, group_id plus thumbnail columns) migrates forward with downgrade refusal and quarantine-rebuilds-empty
- PowerBrowserGroup actor pair registered at startup, Theia-origin-checked, sole-caller-held, catalogued
- Tracer Panorama widget owns the organising slot: canvas plus tree over one GroupModel, tray always rendered, contracted copy verbatim
- gui08-persistence-roundtrip gate plus self-test green through the single driver; full --quick green

## Task Commits

Each task was committed atomically:

1. **Task 1: Chrome v1→v2 migration + group writer methods** - `f420ee9` (feat)
2. **Task 2: JSWindowActor pair + startup registration + catalogue rows** - `3c9fb9f` (feat)
3. **Task 3: Theia GroupModel + reads + tracer widget behind slot seam** - `72b3e0f` (feat)
4. **Task 4: Persistence-roundtrip gate + registry rows** - `94e98fc` (feat)

**Plan metadata:** revised commit cb2f67e followed throughout

## Files Created/Modified
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` - v2 DDL/migration, 6 writers, 3 read-backs, actor parent plus dispatch plus registration
- `powerbrowser/shell/GroupActorChild.sys.mjs` - boundary-clean child (handleEvent/sendQuery/DOM dispatch only)
- `powerbrowser/shell/TheiaService.sys.mjs` - registerGroupActor call beside tab-store wiring
- `powerbrowser/shell/jar.mn` - child packaging line (this tree's surface, no patch touch)
- `powerbrowser/INTERNAL-APIS.md` - line re-pin plus group-close plus group-actor rows
- `theia/extensions/tab-uris/src/node/tab-query-service.ts` - listGroups/getGroupTabs/getThumbnail/listUngroupedTabs over the same readonly handle
- `theia/extensions/tab-uris/src/node/tab-query-backend-module.ts` - GROUP_PATH handler over the existing websocket
- `theia/extensions/tab-uris/src/browser/group-query-service.ts` - GROUP_PATH const plus read contract
- `theia/extensions/modes/src/browser/group-model.ts` - single store, optimistic apply, retry-once-then-revert, total parse
- `theia/extensions/modes/src/browser/group-actor-client.ts` - CustomEvent correlator, 5s ack timeout
- `theia/extensions/modes/src/browser/organising-widget.ts` - tracer widget (canvas plus tree plus tray), panorama commands handler
- `theia/extensions/modes/src/browser/panorama-commands.ts` - powerbrowser.panorama.* consts
- `theia/extensions/modes/src/browser/modes-frontend-module.ts` - tracer bind swapped in (placeholder file left unbound for 15-03)
- `theia/extensions/modes/src/browser/modes.css` - tracer classes in the same @layer block
- `scripts/verify-gui08-persistence-roundtrip.mjs` - derive-and-compare plus mkdtemp live mirror plus 3-plant self-test
- `scripts/verify-platform.sh` - gui08 registry pair beside the gui09 pair
- `inventory/brand-tokens.json` - frozen -PLAN.md row 36→39 for the new provenance citations

## Decisions Made
- Card dive reuses the GUI-01 `window.open(url, '_blank')` channel: the only existing opener that opens a stock tab without new privileged surface; OpenerService routes Theia resources, not stock tabs.
- setTabGroupId/writeThumbnail private-exclusion rides the known-row check: private tabs never have rows (writeTabRow skips before upsert), so unknown-URI rejection is the gate with no window object needed on the actor path.
- Zoom ships as a pure view transform (25–200%, 100% reset, readout): the toolbar cluster would otherwise be a dead control, and zoom persists nothing per UI-SPEC, so no 15-02 contract is touched. Corner resize and auto-box stay 15-02.
- Widget ID versioned to `powerbrowser.modes.organising`; slot continuity rides the registerOrganisingSlot seam, not the ID string.
- GUI-08 stays Pending: gate 1 of 5 landed; requirements-completed left empty on purpose and `requirements mark-complete` NOT run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task-1 commit swept 6 pre-staged foreign files**
- **Found during:** Task 1 commit (concurrent 16-x process had staged configuration.toml, docs, scripts, theia files)
- **Issue:** Bare `git commit` swept the shared index; the commit held 8 files instead of 2
- **Fix:** Soft-reset and re-committed path-scoped (`git commit -- <paths>`); foreign staging restored byte-identical; all later commits path-scoped
- **Files modified:** none beyond the intended two
- **Verification:** `git show --stat` per commit shows exactly the planned file sets
- **Committed in:** f420ee9 (repaired before Task 2)

**2. [Rule 1 - Bug] migrateTabStoreToV1 stamped the head instead of 1**
- **Found during:** Task 1 (migration chaining)
- **Issue:** Under head 2 a v0 store running migrateTabStoreToV1 would stamp 2 and skip the groups shape entirely
- **Fix:** Both stamp sites in migrateTabStoreToV1 now stamp literal 1; openTabStore chains v1 then v2 sequentially
- **Files modified:** powerbrowser/shell/PowerBrowserAPI.sys.mjs
- **Verification:** roundtrip gate migration half green over a v1 seed
- **Committed in:** f420ee9

**3. [Rule 3 - Blocking] Catalogue line re-pin (twice)**
- **Found during:** Tasks 1 and 2 (`--catalogue` red: 29 then 32 uncatalogued lines)
- **Issue:** INTERNAL-APIS.md rows pin absolute File:Line; any insertion shifts every row below it
- **Fix:** Re-derived occurrence lines from the guard's own patterns, rewrote cells by content mapping (early block +15, late block +161, verified collision-free), added one row per new occurrence line (closeStockTabByUri :1086→:1101, registerWindowActor :1209)
- **Files modified:** powerbrowser/INTERNAL-APIS.md
- **Verification:** `--catalogue` plus `--self-test` green
- **Committed in:** f420ee9, 3c9fb9f

**4. [Rule 2 - Missing Critical] listUngroupedTabs reader (4th method)**
- **Found during:** Task 3 (GroupModel.load)
- **Issue:** Plan names 3 reader methods, but the always-rendered Ungrouped tray has no data source without a NULL-group listing
- **Fix:** Added listUngroupedTabs to TabQueryService (same readonly handle, bound params, never-throw) plus the contract interface
- **Files modified:** tab-query-service.ts, group-query-service.ts
- **Verification:** tsc clean; gate backend-binding presence check green
- **Committed in:** 72b3e0f

**5. [Rule 1 - Bug] In-package lib self-import broke tsc -b emit (TS5055)**
- **Found during:** Task 3 (tab-uris build)
- **Issue:** group-query-service.ts imported `@powerbrowser/tab-uris/lib/...` (cross-package idiom); inside its own package the emitted d.ts becomes both input and output
- **Fix:** Relative `../node/tab-query-service` import; cross-package lib imports (modes, chrome-bar) unchanged
- **Files modified:** group-query-service.ts
- **Verification:** `tsc -b` clean in nix develop .#theia
- **Committed in:** 72b3e0f

**6. [Rule 3 - Blocking] Frozen -PLAN.md brand row 36→39**
- **Found during:** Task 3 (`--quick` red: expected 36, observed 39)
- **Issue:** The 3 new 15-01 provenance citations (2 catalogue rows, 1 actor-parent comment) moved the frozen count
- **Fix:** COUNT MOVED 36→39 entry per precedent (priors verified byte-identical, PowerBrowserAPI.sys.mjs joins expected_files); no renumber-or-delete
- **Files modified:** inventory/brand-tokens.json
- **Verification:** scan-brand-residue PASS, full --quick PASS
- **Committed in:** 72b3e0f

**7. [Rule 1 - Bug] Self-test plant-1 landed predicate**
- **Found during:** Task 4 (gate self-test: plant reported "did not land")
- **Issue:** `is_active` also appears in `idx_groups_active`, so the dropped-column plant still matched the naive `includes` check
- **Fix:** Landed predicate checks `/is_active\s+INTEGER/` (the column definition), red check still names `is_active`
- **Files modified:** scripts/verify-gui08-persistence-roundtrip.mjs
- **Verification:** all 3 plants red naming drift, green-first control holds
- **Committed in:** 94e98fc

---

**Total deviations:** 7 auto-fixed (2 bugs, 2 missing-critical, 3 blocking)
**Impact on plan:** All required for gate-green correctness; no scope creep. No new npm packages (0 package.json/yarn.lock touches across the 4 commits). No Gecko patch touch. No Theia core fork.

## Issues Encountered
- Concurrent 16-x agent activity shares the tree and index: pre-staged foreign files (repaired, see deviation 1) and interleaved commits on main. All task commits verified atomic by `git show --stat`.
- `tsc` absent on the nix-shell PATH: ran the repo-pinned `./node_modules/.bin/tsc` inside `nix develop .#theia` (same toolchain the repo's own tab-uris-typecheck uses).
- Task-1 roundtrip half deferred to Task 4 per the plan's own forward reference; re-ran green after Task 4 landed (TASK1-GATE-RERUN-PASS).

## Gate Evidence
- `node scripts/verify-gui08-persistence-roundtrip.mjs` → PASS (derived DDL, head 2, 10 methods, GROUP_PATH, cap 60; mkdtemp migrate/CRUD/quarantine/downgrade-refusal)
- `--self-test` → PASS (dropped DDL field, removed writer method, path drift — each red naming drift)
- `--only gui08-persistence-roundtrip[-self-test]` → PASS through the single driver
- `check-internals-boundary.sh` plus `--catalogue` plus `--self-test` → PASS; sole-caller assertion PASS
- `verify-sql-store-second-writer` → PASS (117 files); `tab-uris-typecheck` → PASS
- `tsc -b theia/extensions/modes theia/extensions/tab-uris` (nix .#theia) → exit 0
- `verify-platform.sh --quick` → PASS (final, all tasks landed)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 15-02 builds on: actor 8-kind dispatch (resizeGroup/closeGroup already served), writeThumbnail cap, GROUP_PATH reads, GroupModel ops
- Placeholder file deletion reserved for 15-03 (left unbound, tracked here)
- Live headed actor roundtrip (coverage D5) awaits a display-capable env; static halves green
- GUI-08 remains Pending until 15-05 lands the 5th gate

---
*Phase: 15-panorama-organising*
*Completed: 2026-09-06*

## Self-Check: PASSED
All 7 created/modified key files found on disk; all 4 task commits found in git log; SUMMARY present.
