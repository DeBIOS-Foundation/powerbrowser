---
phase: 15-panorama-organising
plan: 03
subsystem: panorama
tags: [gui08, tree-view, group-model, verify-gates, placeholder-retirement]

# Dependency graph
requires:
  - phase: 15-01
    provides: single GroupModel plus tracer widget plus persistence gate this tree extracts over
  - phase: 15-02
    provides: full canvas geometry plus close dialog plus capture surface the parity and copy gates pin
provides:
  - widget-owned tree render module over the single GroupModel with visibility-only flip
  - gui08 view-parity, close-exactness, and panorama-copy gates plus self-tests through the single driver
  - placeholder retirement (file, bind residue, CSS, copy) with four older gates re-pinned
affects: [15-04, 15-05]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 17000
  tasks: 4
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [widget-owned-render-module, negated-needle-gate-with-self-exclusion-note]

key-files:
  created: [theia/extensions/modes/src/browser/organising-tree.ts, scripts/verify-gui08-view-parity.mjs, scripts/verify-gui08-close-exactness.mjs, scripts/verify-gui08-panorama-copy.mjs]
  modified: [theia/extensions/modes/src/browser/organising-widget.ts, theia/extensions/modes/src/browser/modes.css, theia/extensions/modes/src/browser/modes-frontend-module.ts, scripts/verify-gui08-canvas-geometry.mjs, scripts/verify-shell-error-copy.mjs, scripts/verify-mode-switch-tabs-invariant.mjs, scripts/verify-mode-toggle-commands.mjs, scripts/verify-dependent-window-content.mjs, scripts/verify-platform.sh]

key-decisions:
  - "New copy gate file instead of extending shell-error-copy: verbatim set-equality plus absence proof is a different assertion shape"
  - "Task-2 commit landed before Task-1 commit per the plan's covering order"
  - "Task-4 sweep grep excludes the asserting gate file: negated needles are the instrument, not shipped copy"
  - "GUI-08 stays Pending: gates 5 of 5 landed at static level; live backstops plus completion wait for 15-05"

patterns-established:
  - "Widget-owned render module: data plus callbacks cross the boundary as arguments; the module imports types only, never the store, reader, or actor"
  - "Gate-needle self-exclusion: a negated-search gate names the forbidden string, so tree-wide greps exclude the gate file by name and the gate's own scoped search proves absence in shipped sources"

requirements-completed: []  # GUI-08 partial (gates 5 of 5 landed at static level; live backstops reserved headed; completion lands with 15-05). Deliberately not marked complete.

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Tree sections plus rows over the single GroupModel with visibility-only flip and selection preserved"
    requirement: "GUI-08"
    verification:
      - kind: unit
        ref: "tsc -b theia/extensions/modes theia/extensions/tab-uris (nix develop .#theia)"
        status: pass
      - kind: integration
        ref: "node scripts/verify-gui08-view-parity.mjs"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-view-parity"
        status: pass
    human_judgment: false
  - id: D2
    description: "View-parity plus close-exactness gates with --self-test through the single driver"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-close-exactness-self-test"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-view-parity-self-test"
        status: pass
    human_judgment: false
  - id: D3
    description: "Panorama copy gate: contracted strings verbatim, placeholder proven absent, no internals in copy"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui08-panorama-copy-self-test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Placeholder fully retired with four older gates re-pinned and full --quick green"
    requirement: "GUI-08"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D5
    description: "Live headed proof: tree/canvas membership equality, flip-keeps-selection, confirm-closes-exact-tabs, cancel-no-op"
    verification: []
    human_judgment: true
    rationale: "No display in this env (RESEARCH Environment Availability); static halves proven by D1-D4, but Gecko delivery plus DOM paint plus pointer feel need a headed shell"

# Metrics
duration: 16min
completed: 2026-09-06
status: complete
---

# Phase 15 Plan 03: Tree Plus Gates Plus Placeholder Retirement Summary

**Tree renders over the single GroupModel through a widget-owned module, three new gui08 gates prove parity plus close exactness plus contracted copy, and the Phase-14 placeholder is fully retired**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-06T08:44:21Z
- **Completed:** 2026-09-06T09:00:00Z
- **Tasks:** 4
- **Files modified:** 13 (4 created, 8 extended, 1 deleted)

## Accomplishments
- organising-tree.ts exports widget-owned section/row renders with no fetch, no cache, no model query; flip stays visibility-only with selection preserved
- gui08-view-parity gate (single-reader set equality, tree negated-fetch search, flip shape) plus gui08-close-exactness gate (dialog verbatim, cancel-before-mutation, model plus chrome per-tab wiring) green with self-tests through the driver
- gui08-panorama-copy gate pins 27 contracted strings verbatim, proves zero retired placeholder copy in shipped sources, and shape-checks no internals in copy
- Placeholder file git-rm'd; module comment, slot CSS classes, and copy residue swept; four older gates re-pinned; full --quick green

## Task Commits

Each task was committed atomically (Task 2 before Task 1 per the plan's covering order):

1. **Task 2: View-parity + close-exactness gates** - `ad5f698` (feat)
2. **Task 1: Tree view over the shared GroupModel** - `c231fa0` (feat)
3. **Task 3: Panorama copy gate (contracted strings + placeholder absence)** - `12c256a` (feat)
4. **Task 4: Placeholder retirement + phase gate sweep** - `220e183` (feat)

**Plan metadata:** revised commit cb2f67e followed throughout

## Files Created/Modified
- `theia/extensions/modes/src/browser/organising-tree.ts` - widget-owned tree section/row renders over injected data plus callbacks
- `theia/extensions/modes/src/browser/organising-widget.ts` - buildSection delegates to the tree module; new buildTreeTitle helper
- `theia/extensions/modes/src/browser/modes.css` - tree-row hover surface-raised wash; placeholder slot classes plus prose removed
- `theia/extensions/modes/src/browser/modes-frontend-module.ts` - placeholder-retired bind comment
- `theia/extensions/modes/src/browser/organising-placeholder-widget.ts` - DELETED via git rm
- `scripts/verify-gui08-view-parity.mjs` - single-model parity gate with 3-plant self-test
- `scripts/verify-gui08-close-exactness.mjs` - close exactness gate with 3-plant self-test
- `scripts/verify-gui08-panorama-copy.mjs` - contracted copy plus absence plus no-internals gate with 3-plant self-test
- `scripts/verify-gui08-canvas-geometry.mjs` - tooltip assertion spans canvas plus tree sources (extraction repair)
- `scripts/verify-shell-error-copy.mjs` - placeholder derivation plus 4 retired EXPECTED entries removed
- `scripts/verify-mode-switch-tabs-invariant.mjs` - placeholder const-import pair plus scan lists removed (required: would go red on '')
- `scripts/verify-mode-toggle-commands.mjs` - placeholder path dropped from the manifest-flag glob
- `scripts/verify-dependent-window-content.mjs` - placeholder path dropped from the extractability scan
- `scripts/verify-platform.sh` - six new registry rows (parity, exactness, copy plus self-tests)

## Decisions Made
- New copy-gate file instead of extending verify-shell-error-copy.mjs: that harness proves table-derived error text plus a leak shape, while this gate proves verbatim contracted literals plus placeholder absence with a no-internals shape over a different site enumeration — one gate owns these strings either way, as the plan allows.
- Commit order Task 2 then Task 1 per the plan's covering order (Task 2 authors the gate Task 1's verify forward-references); Task-1 gate re-run green after Task 2 landed.
- Task-4 sweep grep excludes scripts/verify-gui08-panorama-copy.mjs by name: the gate's negated needles plus self-test plant are the asserting instrument, not shipped copy; the gate's own scoped search (widget, tree, css, commands, model, module) proves absence in shipped sources.
- GUI-08 stays Pending with `requirements-completed` empty on purpose; `requirements mark-complete` NOT run (static halves 5 of 5; live backstops plus completion land with 15-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Canvas-geometry gate tooltip assertion split across two files**
- **Found during:** Task 1 (tree extraction moved one 'Close group' tooltip into organising-tree.ts)
- **Issue:** The 15-02 gate required ≥2 `= 'Close group'` matches in the widget alone and would go red on the extraction
- **Fix:** Gate now reads organising-tree.ts and requires ≥1 match in each of the widget (canvas) and tree sources
- **Files modified:** scripts/verify-gui08-canvas-geometry.mjs
- **Verification:** geometry gate plus self-test green; full --quick green
- **Committed in:** c231fa0 (Task 1 commit)

**2. [Rule 3 - Blocking] Four older gates referenced the deleted placeholder file**
- **Found during:** Task 4 (retirement sweep)
- **Issue:** shell-error-copy derived placeholder strings against EXPECTED entries (would red as GONE); mode-switch-tabs-invariant required the placeholder const-import pair (would red on ''); toggle-commands and dependent-window glob lists carried a dead path (residue)
- **Fix:** Removed the placeholder const, derivations, scan-list entries, and 4 retired EXPECTED entries ('Organising' plus 3 placeholder strings — 'Organising' handoff now pinned by the panorama copy gate via .label/widgetName); updated the harness prose
- **Files modified:** scripts/verify-shell-error-copy.mjs, scripts/verify-mode-switch-tabs-invariant.mjs, scripts/verify-mode-toggle-commands.mjs, scripts/verify-dependent-window-content.mjs
- **Verification:** all four gates plus self-tests green through the driver
- **Committed in:** 220e183 (Task 4 commit)

**3. [Rule 1 - Bug] Copy-gate EXPECTED apostrophe mismatch plus self-test predicate**
- **Found during:** Task 3 (gate first run and self-test)
- **Issue:** EXPECTED dialog body used U+2019 while the source carries a straight apostrophe; label-drift plant asserted the un-drifted form while 'New Group' still derives from widget sites
- **Fix:** EXPECTED body matches the verbatim straight quote; plant asserts the drifted 'New group' surplus
- **Files modified:** scripts/verify-gui08-panorama-copy.mjs
- **Verification:** gate plus all 3 plants green
- **Committed in:** 12c256a (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All required for gate-green correctness after the extraction and retirement the plan mandates; no scope creep. No new npm packages (0 package.json/yarn.lock touches across the 4 commits). No Gecko patch touch. No Theia core fork.

## Issues Encountered
- `tsc` absent on the nix-shell PATH (known from 15-01/15-02): ran the repo-pinned `./theia/node_modules/.bin/tsc` inside `nix develop .#theia` (same toolchain the repo's own tab-uris-typecheck uses).
- `git -C upstream status` shows two STAGED entries (browser/moz.build, browser/moz.configure) predating this session (mtimes 2026-09-04): verified content is exactly the 2 hook-only patches (010 identity, 020 shell) applied in the build tree. Working-tree `git -C upstream diff` is empty. Not touched; left alone as out of scope.
- Untracked `theia/*/lib` build output still contains stale placeholder strings (bundle.js/css, placeholder-widget.js): untracked build artifacts, invisible to git-ls-files-based scans, regenerate on build. Left alone as out of scope.
- Pre-existing `.planning/state.json` modification and untracked research-cache/yarn.lock/ai-review files predate this session; untouched.

## Gate Evidence
- `node scripts/verify-gui08-view-parity.mjs` → PASS (single reader is the widget; tree carries no fetch; flip visibility-only) plus 2 HELD-OUT backstop lines
- `--self-test` → PASS (second fetch site, flip-clears-draft, ownership removal — each red naming drift)
- `node scripts/verify-gui08-close-exactness.mjs` → PASS (dialog verbatim, cancel-first ordering, model plus chrome per-tab wiring) plus 3 HELD-OUT backstop lines
- `--self-test` → PASS (dialog drift, wiring removal, cancel-guard removal — each red naming drift)
- `node scripts/verify-gui08-panorama-copy.mjs` → PASS (27 strings verbatim, placeholder absent, no internals) — no backstops, fully static
- `--self-test` → PASS (label drift, removed string, reintroduced placeholder — each red naming drift)
- `--only gui08-{view-parity,close-exactness,panorama-copy}[-self-test]` → PASS through the single driver
- `shell-error-copy-no-internals[-self-test]`, `gui07-mode-toggle-commands[-self-test]`, `gui07-mode-switch-tabs-invariant[-self-test]`, `gui09-dependent-window-content[-self-test]`, `internals-boundary[-self-test]`, `internals-catalogue`, `sql-store-second-writer[-self-test]`, `gui08-persistence-roundtrip[-self-test]`, `gui08-canvas-geometry[-self-test]` → PASS
- `tsc -b theia/extensions/modes theia/extensions/tab-uris` (nix .#theia) → exit 0
- `node scripts/scan-brand-residue.mjs` → PASS (220 files; no frozen-row change — no new -PLAN.md citations)
- `verify-platform.sh --quick` → PASS (final, all tasks landed)

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. The tree module imports types only (erased at compile); the close path reuses the existing actor dispatch; the placeholder deletion removes surface.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 15-04/15-05 build on: widget-owned tree module (new tree affordances land as module functions with widget-supplied data), parity/exactness/copy gates pinning the contract, placeholder fully gone
- Live headed proof (coverage D5: membership equality, flip-keeps-selection, confirm-exact-tabs, cancel-no-op) awaits a display-capable env; static halves green
- GUI-08 remains Pending until 15-05 lands completion with the live halves

---
*Phase: 15-panorama-organising*
*Completed: 2026-09-06*

## Self-Check: PASSED
All 4 created key files found on disk; placeholder file confirmed absent; all 4 task commits found in git log (ad5f698, c231fa0, 12c256a, 220e183); SUMMARY present.
