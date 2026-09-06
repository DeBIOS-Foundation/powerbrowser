---
phase: 15-panorama-organising
plan: 02
subsystem: panorama
tags: [gui08, canvas-geometry, auto-box, pagethumbs, close-group, tray, zoom]

# Dependency graph
requires:
  - phase: 15-01
    provides: actor write path plus GroupModel plus tracer widget this canvas completes
provides:
  - full canvas geometry (drag, corner resize, auto-box drops, zoom) over the actor path
  - tray plus dive plus rename rules with roving tabindex and const-wired commands
  - PageThumbs last-view capture with cap, skip-private, and silent fallback
  - gui08 canvas-geometry gate plus self-test through the single driver
affects: [15-03, 15-04, 15-05]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 30113
  tasks: 4
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [geometry-seq-invalidation, composite-actor-write, sleep-settle-debounce, content-map-catalogue-repin]

key-files:
  created: [scripts/verify-gui08-canvas-geometry.mjs]
  modified: [theia/extensions/modes/src/browser/organising-widget.ts, theia/extensions/modes/src/browser/modes.css, theia/extensions/modes/src/browser/group-model.ts, powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/INTERNAL-APIS.md, scripts/verify-gui08-persistence-roundtrip.mjs, scripts/verify-platform.sh, inventory/brand-tokens.json]

key-decisions:
  - "HTML5 DnD kept: Esc-cancel is native (no drop, no persist) with no mid-drag paint to revert"
  - "Auto-box is one composite actor write (create plus assigns) so Retry replays whole and second failure reverts whole"
  - "Settle-debounce rides sleep(), adding zero new privileged timer surface"
  - "Close dialog keeps stock ConfirmDialog: no severity API exists and global CSS would bleed to every dialog"
  - "GUI-08 stays Pending: gates 2 of 5 landed; completion waits for 15-05"

patterns-established:
  - "Geometry-seq invalidation: trailing debounced persists carry the gesture seq and no-op after Esc, cancel, or commit"
  - "Shared stock-tab lookup: close and capture resolve URIs through one helper so they can never disagree"
  - "Content-map catalogue re-pin: line shifts resolved by exact-content match against git HEAD, ambiguous lines by context"

requirements-completed: []  # GUI-08 partial (gates 2 of 5 landed); completion lands with 15-05. Deliberately not marked complete.

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Canvas geometry static halves: resize handle, auto-box matrix, zoom consts, Esc discipline, drag idiom classes"
    requirement: "GUI-08"
    verification:
      - kind: unit
        ref: "tsc -b theia/extensions/modes (nix develop .#theia)"
        status: pass
      - kind: integration
        ref: "node scripts/verify-gui08-canvas-geometry.mjs"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-canvas-geometry"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tray, card dive over the stock opener, rename rules, roving tabindex, command-const wiring"
    requirement: "GUI-08"
    verification:
      - kind: unit
        ref: "tsc -b theia/extensions/modes (nix develop .#theia)"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D3
    description: "PageThumbs last-view capture with 100KB cap, skip-private at two sites, silent fallback, catalogued touchpoint"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "node scripts/verify-gui08-persistence-roundtrip.mjs"
        status: pass
      - kind: integration
        ref: "bash scripts/check-internals-boundary.sh (plus --catalogue)"
        status: pass
      - kind: integration
        ref: "node scripts/verify-gui08-canvas-geometry.mjs (capture-surface half)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Canvas-geometry gate with --self-test through the single driver"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-canvas-geometry-self-test"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live headed proof: drag feel, auto-box matrix, close exactness, capture bytes through the real shell"
    verification: []
    human_judgment: true
    rationale: "No display in this env (RESEARCH Environment Availability); static halves proven by D1-D4, but pointer feel plus Gecko delivery plus DOM paint need a headed shell"

# Metrics
duration: 52min
completed: 2026-09-06
status: complete
---

# Phase 15 Plan 02: Full Canvas Surface Summary

**Panorama canvas complete over the actor path: drag, corner resize, auto-box drops, zoom, tray, dive, renames, confirmed Close Group, and settle-debounced PNG capture behind a text-first fallback**

## Performance

- **Duration:** 52 min
- **Started:** 2026-09-06T08:23:32Z
- **Completed:** 2026-09-06T09:15:00Z
- **Tasks:** 4
- **Files modified:** 9 (1 created, 8 extended)

## Accomplishments
- Corner resize (16px handle, 200x144 live floor) and the four-gesture auto-box matrix with optimistic paint and contracted rollback
- Esc cancels any geometry gesture with paint reverted and no further persist; dragged card rides at 0.7 with accent target outlines
- Tray, stock-path dive, full rename rules (empty-revert, 60-cap, duplicates allowed), roving tabindex with arrow travel
- PageThumbs last-view capture on settle (TabSelect-leave plus TabClose) with 100KB cap, double private skip, silent text fallback
- gui08-canvas-geometry gate plus self-test green through the single driver; full --quick green

## Task Commits

Each task was committed atomically:

1. **Task 1: Canvas geometry: drag, corner resize, zoom, auto-box** - `58ea78f` (feat)
2. **Task 2: Tray, dive, rename rules** - `8d6ab96` (feat)
3. **Task 3: Close Group + PageThumbs last-view capture** - `a9cce96` (feat)
4. **Task 4: Canvas-geometry gate (incl. thumbnail fallback) + registry rows** - `a43275d` (feat)

**Plan metadata:** revised commit cb2f67e followed throughout

## Files Created/Modified
- `theia/extensions/modes/src/browser/organising-widget.ts` - resize gestures, auto-box matrix, Esc cancel, roving tabindex, const wiring
- `theia/extensions/modes/src/browser/modes.css` - handle, drag, drop-target, reduced-motion classes in the same layer
- `theia/extensions/modes/src/browser/group-model.ts` - GROUP_BOX_MIN consts, resizeGroup, composite autoBox
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` - PageThumbs lazy getter, settle scheduler, capture method, shared tab lookup, trigger hooks
- `powerbrowser/INTERNAL-APIS.md` - PageThumbs row, shared-lookup rewrite, full line re-pin
- `scripts/verify-gui08-canvas-geometry.mjs` - derive-and-compare gate with 3-plant self-test and held-out backstops
- `scripts/verify-gui08-persistence-roundtrip.mjs` - EXPECTED methods plus captureTabThumbnail (deliberate surface change)
- `scripts/verify-platform.sh` - gui08-canvas-geometry registry pair beside the persistence pair
- `inventory/brand-tokens.json` - frozen -PLAN.md row 39→40 for the new provenance citation

## Decisions Made
- HTML5 DnD kept from the tracer: an Esc-cancelled native drag fires no drop event, so nothing persists by construction and there is no mid-drag paint to revert; pointer-capture gestures (move/resize) carry the explicit Esc path instead.
- Auto-box persists as one composite actor write (createGroup upsert, then one setTabGroup per card) so the existing retry-once-then-revert discipline replays and reverts it whole.
- Settle-debounce reuses `PowerBrowserAPI.sleep()` through a per-URI token map: zero new `Cc`/`Ci` surface, coalesced per tab, private skipped at schedule time and again at capture time.
- Close Group keeps the stock `ConfirmDialog` (title/msg/ok/cancel plus `if (!confirmed) return`, setups-service precedent): Theia 1.74 offers no severity or class hook, and tinting the dialog via global CSS would bleed into every consumer. Destructive ink therefore rides the stock primary treatment; the contracted copy is verbatim.
- Field-background click marks active at box level (header or card-area background): the click cannot name any other group, and activating the clicked box is idempotent with dive.
- GUI-08 stays Pending with `requirements-completed` empty on purpose; `requirements mark-complete` NOT run (gates 2 of 5; completion lands with 15-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] GroupModel resizeGroup plus autoBox plus min-size consts**
- **Found during:** Task 1 (no persist path exists for the resize handle or the auto-box gestures)
- **Issue:** The 15-01 actor serves `resizeGroup` but the model exposes no method for it, and auto-box needs a composite create-plus-assign write the model never had
- **Fix:** Added `resizeGroup` (mirrors moveGroup, floors at the contracted minimum), `autoBox` (single composite write, whole replay/revert), and `GROUP_BOX_MIN_W/H` consts now shared by model parse, model resize, and widget clamp
- **Files modified:** theia/extensions/modes/src/browser/group-model.ts
- **Verification:** tsc clean; geometry gate min-size half green
- **Committed in:** 58ea78f (Task 1 commit)

**2. [Rule 3 - Blocking] Persistence-gate EXPECTED methods plus captureTabThumbnail**
- **Found during:** Task 3 (`--quick` red: surplus group-surface method)
- **Issue:** The new async capture method legitimately extends the surface the persistence gate enumerates
- **Fix:** Added `captureTabThumbnail` to EXPECTED_GROUP_METHODS (the gate's documented deliberate-change process); sync helpers (`scheduleSettleCapture`, `findStockTabBrowser`) stay outside the enumeration by the gate's own async-only rule
- **Files modified:** scripts/verify-gui08-persistence-roundtrip.mjs
- **Verification:** persistence gate plus --quick green
- **Committed in:** a9cce96 (Task 3 commit)

**3. [Rule 3 - Blocking] Frozen -PLAN.md brand row 39→40**
- **Found during:** Task 3 (`--quick` red: expected 39, observed 40)
- **Issue:** The new PageThumbs catalogue row carries one 15-02 provenance citation (verified: INTERNAL-APIS.md 21→22, API file unchanged at 1)
- **Fix:** COUNT MOVED 39→40 entry per precedent (priors byte-identical, expected_files unchanged); no renumber-or-delete
- **Files modified:** inventory/brand-tokens.json
- **Verification:** scan-brand-residue PASS, full --quick PASS
- **Committed in:** a9cce96 (Task 3 commit)

**4. [Rule 1 - Bug] Self-test plant-1 landed predicate**
- **Found during:** Task 4 (gate self-test: plant reported "did not land")
- **Issue:** The `dataset.canvasMissing` replacement still contains `dataset.canvas` as a prefix substring, so the landed check never fired
- **Fix:** Plant replaces with `dataset.field`, cleanly removing the needle
- **Files modified:** scripts/verify-gui08-canvas-geometry.mjs
- **Verification:** all 3 plants red naming drift, green-first control holds
- **Committed in:** a43275d (Task 4 commit)

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking)
**Impact on plan:** All required for gate-green correctness; no scope creep. No new npm packages (0 package.json/yarn.lock touches across the 4 commits). No Gecko patch touch. No Theia core fork. panorama-commands.ts needed no change (registry already exact) and is absent from the commits on purpose.

## Issues Encountered
- Task-1 geometry gate did not exist until Task 4 per the plan's own forward reference; re-ran green after Task 4 landed (TASK1-GATE-RERUN-PASS).
- `tsc` resolved at `theia/node_modules/.bin/tsc` inside `nix develop .#theia`, not the repo-root path (same toolchain the repo's own tab-uris-typecheck uses).
- Pre-existing catalogue staleness (row 28 `:817` points at a line with no occurrence; the real sessionstore use is uncatalogued only because `SessionStore.*` matches no guard pattern): left untouched as out of scope, not introduced here.

## Gate Evidence
- `node scripts/verify-gui08-canvas-geometry.mjs` → PASS (hooks, zoom, minimums, tray, cards, fallback, registry, discipline, capture surface) plus 5 HELD-OUT backstop lines
- `--self-test` → PASS (removed hook, zoom-range drift, label drift — each red naming drift)
- `--only gui08-canvas-geometry[-self-test]` → PASS through the single driver
- `check-internals-boundary.sh` plus `--catalogue` → PASS (PageThumbs row present; full re-pin verified)
- `node scripts/verify-gui08-persistence-roundtrip.mjs` → PASS (with the extended method surface)
- `tsc -b theia/extensions/modes` (nix .#theia) → exit 0
- `verify-platform.sh --quick` → PASS (final, all tasks landed)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 15-03 builds on: resizeGroup/autoBox actor writes served, capture seeding rows on leave/close, tray plus rename plus const wiring landed
- Live headed proof (coverage D5: drag feel, auto-box matrix, close exactness, capture bytes) awaits a display-capable env; static halves green
- GUI-08 remains Pending until 15-05 lands the 5th gate

---
*Phase: 15-panorama-organising*
*Completed: 2026-09-06*

## Self-Check: PASSED
All 9 created/modified key files found on disk; all 4 task commits found in git log; SUMMARY present.
