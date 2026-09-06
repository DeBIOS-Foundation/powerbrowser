---
phase: 14-modes-windows-setups
plan: 03
subsystem: ui
tags: [theia, setups, user-storage, secondary-window, dependents, verify-gates]

# Dependency graph
requires:
  - phase: 14-modes-windows-setups
    provides: [modes skeleton with shipped descriptors, customs service with slot seam, GREEN probe verdict for the stock secondary-window path]
provides:
  - Named setups as user-storage JSON with snapshot, restore, delete, and last-session applicator
  - Dependent windows on the stock path with membership gate and closed state
  - Setup roundtrip gate and dependent-content gate with self-tests plus registry rows
affects: [14-04 (phase closeout on the shipped setups/dependents foundation), 15-panorama (organising canvas in the placeholder slot)]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 17685
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [user-storage-setups-with-total-parsing, ready-ordered-last-session-applicator, membership-pin-makes-second-frame-unreachable, live-half-reserved-full-suite]

key-files:
  created:
    - theia/extensions/modes/src/browser/setups-service.ts
    - theia/extensions/modes/src/browser/setups-commands.ts
    - theia/extensions/modes/src/browser/dependent-windows.ts
    - scripts/verify-setup-roundtrip.mjs
    - scripts/verify-dependent-window-content.mjs
  modified:
    - theia/extensions/modes/src/browser/modes-frontend-module.ts
    - scripts/verify-platform.sh
    - scripts/verify-mode-toggle-commands.mjs

key-decisions:
  - "GREEN verdict: dependents drive stock moveWidgetToSecondaryWindow; PowerBrowserAPI.sys.mjs and INTERNAL-APIS.md byte-identical"
  - "Restores switch mode through stock switchPerspective with Browsing fallback, panels and placeholder via descriptor hooks"
  - "File tabs key off the editor resource URI (probe Constraint 3); unowned widgets are skipped, never guessed"
  - "Content gate live half cites the standing probe record under --live instead of re-running a browser"

patterns-established:
  - "Setups as user-storage JSON with total parsing, corrupt-to-empty, gone-tabs explanation, and single-write persistence"
  - "Ready-ordered applicator plus onStop pointer auto-save for relaunch restore with no core-close dialog"
  - "Membership narrowing only (never widen) with loaded-never-opened timing and idempotent closed-state render"

requirements-completed: [GUI-09]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Named setups save, list, restore, and delete per contract with last-session relaunch, extension building clean"
    requirement: "GUI-09"
    verification:
      - kind: integration
        ref: "nix develop .#theia --command bash -c 'cd theia/extensions/modes && yarn build' (exit 0) + scripts/verify-platform.sh --quick (PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dependents host single tab views on the stock path with membership pinned and chrome-side files byte-identical"
    requirement: "GUI-09"
    verification:
      - kind: other
        ref: "grep moveWidgetToSecondaryWindow + grep 'This tab is closed' + bash scripts/check-internals-boundary.sh (PASS) + git diff --stat HEAD -- powerbrowser/ (empty)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Setup roundtrip gate plus self-test green, registry rows green"
    requirement: "GUI-09"
    verification:
      - kind: other
        ref: "node scripts/verify-setup-roundtrip.mjs && node scripts/verify-setup-roundtrip.mjs --self-test (3 plants red)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dependent-content gate plus self-test green, registry rows green"
    requirement: "GUI-09"
    verification:
      - kind: other
        ref: "node scripts/verify-dependent-window-content.mjs && node scripts/verify-dependent-window-content.mjs --self-test (3 plants red)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live dependent behaviors (extraction paint, verbatim geometry, close-matrix focus return) in a headed session"
    requirement: "GUI-09"
    verification: []
    human_judgment: true
    rationale: "Headless moveTo/resizeTo silently no-op and focus never sticks headless per the probe record; the gate live half cites the standing GREEN record and the full headed pass is deferred per the standing nonstop rule"

# Metrics
duration: 12min
completed: 2026-09-06
status: complete
---

# Phase 14 Plan 03: Dependents + Setups Summary

**Named setups in user-storage JSON with geometry/placement/mode restore plus last-session relaunch, dependents on the stock secondary-window path behind a membership pin, both halves under mechanical gates.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-06T06:06:47Z
- **Completed:** 2026-09-06T06:18:39Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Setups service snapshots verbatim rects plus opaque tab URIs plus mode id, restores through the contribution open path with gone-tabs explanation, deletes only with confirmation, and re-applies the last-session pointer after core restore with no core-close dialog
- Four scope-prefixed setup/dependent command ids with contracted Save/Delete labels verbatim and labelless restore/dependent-open
- Dependent-windows contribution on the GREEN path: chrome-bar pinned non-extractable (pre-existing fixed), loaded-time orphan check, contracted closed state with window-only close, focus return on close, chrome-side files byte-identical
- Roundtrip gate (schema/ids/labels/copy/cap plus derived-field JSON roundtrip, 3-plant self-test) and content gate (asset/membership/closed-state/timing, 3-plant self-test, live half reserved full-suite), four registry rows, quick green throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Named setups with restore applicator plus setup commands** - `17ee47a` (feat) + `9217fb7` (fix: stale-index forward fix, see Deviations)
2. **Task 2: Dependent windows per the probe verdict with membership gate** - `4d1728e` (feat)
3. **Task 3: Setup roundtrip and dependent-content gates as registry rows** - `d2744ed` (feat)

**Plan metadata:** pending (docs: this summary commit)

## Files Created/Modified
- `theia/extensions/modes/src/browser/setups-service.ts` - setups.json snapshot/list/restore/delete, reachability-clamped geometry, ready-ordered last-session applicator, dependent-open execution
- `theia/extensions/modes/src/browser/setups-commands.ts` - four SETUPS_* command ids, contracted Save Setup / Delete Setup labels, labelless restore and dependent-open
- `theia/extensions/modes/src/browser/dependent-windows.ts` - GREEN-path hosting, NON_EXTRACTABLE_WIDGET_IDS pin, contracted closed-state copy, loaded/orphan and remove/close subscriptions
- `theia/extensions/modes/src/browser/modes-frontend-module.ts` - static binds for the service, both command contributions, and the dependents contribution
- `scripts/verify-setup-roundtrip.mjs` - schema roundtrip gate with green-first 3-plant self-test
- `scripts/verify-dependent-window-content.mjs` - content gate (static quick, live reserved) with green-first 3-plant self-test
- `scripts/verify-platform.sh` - four gui09 rows with honesty comments beside the gui07 pairs
- `scripts/verify-mode-toggle-commands.mjs` - manifest-flag scan widened to the three new modes sources

## Decisions Made
- GREEN verdict honored literally: zero chrome-side edits (2-file task commit proves it); `PowerBrowserAPI.sys.mjs` + `INTERNAL-APIS.md` byte-identical with an explicit note here
- Restore switches mode via stock `switchPerspective` with Browsing fallback rather than the ModeService wrapper, so the key-link pattern holds and customs re-apply through their registered descriptors; panels/placeholder follow descriptor hooks
- File-editor tab identity uses the duck-typed editor resource URI the opener resolves (probe Constraint 3); registry-unowned widgets are skipped, never guessed, and unresolvable URIs drop with the contracted variant explanation
- Content-gate live half reports SKIP by default and cites the standing probe record's `Verdict: GREEN` line under `--live` instead of re-running a browser in a quick gate
- Reachability clamp is a documented backstop (verbatim restore otherwise): unreachable rects pull into view, reachable rects pass untouched

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Forward fixup for a stale-index Task 1 commit**
- **Found during:** Closeout (HEAD copy of setups-service.ts failed the plan's own contract: `this.opener.open` plus `placeHolder`)
- **Issue:** The Task 1 commit captured the first `git add` (pre-fix) index; the OpenerService free-`open()` helper plus `placeholder` spelling fixes verified green in the worktree but never reached the commit
- **Fix:** Staged the verified worktree file and committed forward as `9217fb7` (no history rewrite); re-verified extension build, roundtrip gate, and quick green
- **Files modified:** theia/extensions/modes/src/browser/setups-service.ts
- **Verification:** `yarn build` exit 0, roundtrip gate PASS, quick PASS
- **Committed in:** 9217fb7 (fix, part of Task 1)

**2. [Rule 1 - Bug] Gate-script corrections before the Task 3 commit**
- **Found during:** Task 3 (gates red on the unmodified tree)
- **Issue:** Three gate-side bugs: apostrophe-escape mismatch on the restore-failure literal, a doc comment re-matching the closed-state plant, and the missing-asset plant expecting the wrong path
- **Fix:** Unescape-normalize service source in the roundtrip gate; reworded the dependents doc comment off the verbatim string; plant now expects the override path
- **Files modified:** scripts/verify-setup-roundtrip.mjs, scripts/verify-dependent-window-content.mjs, theia/extensions/modes/src/browser/dependent-windows.ts (comment only)
- **Verification:** Both gates plus both self-tests green (6 plants red naming their drifts)
- **Committed in:** d2744ed (Task 3 commit)

**3. Hardening beyond the letter: manifest-flag scan widened to the new modes sources**
- **Found during:** Task 3 (new files carry the same no-`[modes]`-flag property the toggle gate proves)
- **Issue:** Plan did not ask, but leaving new sources outside the scan weakens the standing rule (mirrors 14-02 deviation 5)
- **Fix:** Three files appended to `MODES_GLOB_RELS`; toggle gate plus self-test re-run green
- **Files modified:** scripts/verify-mode-toggle-commands.mjs
- **Verification:** `gui07-mode-toggle-commands` PASS through the single-gate runner
- **Committed in:** d2744ed (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 hardening)
**Impact on plan:** All required for compiling, correctly asserting, or uniformly guarding code; no scope creep. No new packages, no manifest flags, no Theia-core or Gecko touches.

## Issues Encountered
- One fix-and-retry inside Task 1 (OpenerService has no `.open` method; free helper instead) plus one inside Task 3 closeout (stale index) — both resolved, none deferred
- Concurrent orchestrator commits landed on main during execution (phase-16 context); task commits verified present by hash regardless

## Known Stubs
None — stub scan over all new sources returns only benign matches (the contracted "Setup name" placeholder doc word, the QuickPick `placeholder` API field, the organising-placeholder filename).

## Threat Flags
None beyond the plan threat model — user-storage JSON plus dialog text plus secondary-window hosting, all mitigated per T-14-03-01..05 (total parsing, drop-unresolvable, no new message channel, existing blocked path, verbatim contracted copy asserted by both gates). No new endpoints, packages, or transports.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 14 closes on this plan: shipped defaults (14-01), customs plus placeholder (14-02), dependents plus setups with gates (this plan) — GUI-07/GUI-09 mechanically enforced
- Held for a headed session per the standing deferred-verification rule: save/list/restore/delete flows, corrupt-file empty state, dependent paint and verbatim geometry, close-matrix focus return (coverage D5)
- Phase 15 builds the organising canvas behind the placeholder slot seam; no interface changes needed

## Self-Check: PASSED
- All created files exist on disk; `17ee47a`, `4d1728e`, `d2744ed`, `9217fb7` present in `git log`
- Chrome-side files byte-identical (`git diff HEAD -- powerbrowser/` empty at Task 2 commit; boundary check PASS)
- Upstream diff empty; no new patch; quick gate green at every task commit

---
*Phase: 14-modes-windows-setups*
*Completed: 2026-09-06*
