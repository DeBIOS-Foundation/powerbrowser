---
phase: 14-modes-windows-setups
plan: 02
subsystem: ui
tags: [theia, modes, perspectives, user-storage, placeholders, verify-gates]

# Dependency graph
requires:
  - phase: 14-modes-windows-setups
    provides: [modes skeleton with shipped descriptors, bridged toggle, defaults gate]
provides:
  - Custom modes as user-storage JSON with total parsing and contracted fallback
  - Organising placeholder slot behind the descriptor slot seam
  - Toggle custom rows with single active marker
  - Modes style layer on locked tokens below the user layer
  - Switch-path invariant gate plus extended copy coverage
affects: [14-03 (dependents and setups on the customs + slot foundation)]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 17317
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [user-storage-modes-with-total-parsing, slot-seam-shared-by-hooks-and-service, enumerated-sites-copy-derivation]

key-files:
  created:
    - theia/extensions/modes/src/browser/mode-service.ts
    - theia/extensions/modes/src/browser/modes-commands.ts
    - theia/extensions/modes/src/browser/organising-placeholder-widget.ts
    - theia/extensions/modes/src/browser/modes.css
    - scripts/verify-mode-switch-tabs-invariant.mjs
  modified:
    - theia/extensions/modes/src/browser/mode-descriptors.ts
    - theia/extensions/modes/src/browser/modes-frontend-module.ts
    - theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
    - theia/extensions/chrome-bar/package.json
    - scripts/verify-shell-error-copy.mjs
    - scripts/verify-mode-toggle-commands.mjs
    - scripts/verify-platform.sh

key-decisions:
  - "Mode empty/duplicate error copy mirrors the setup shape with Save as Mode (planner-fixed per RESEARCH OQ2)"
  - "Placeholder show/hide is one module slot seam shared by descriptor hooks and the service, avoiding a DI cycle"
  - "Widget lists customs through ModeService (not the perspective registry) so mid-session deletes reflect immediately"
  - "Copy gate compares verbatim templates, bans non-plain-identifier interpolation, and pins widget copy by set equality"

patterns-established:
  - "Custom modes as descriptors built from user-storage JSON with never-create absence and corrupt fallback"
  - "Switch-path allowlist derived from named function bodies at check time, red on addition and removal"
  - "Enumerated-sites copy derivation with a stated residual hole instead of a banned-literal list"

requirements-completed: [GUI-07]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Custom modes save, reload, and fall back per contract with the extension building clean"
    requirement: "GUI-07"
    verification:
      - kind: integration
        ref: "nix develop .#theia --command bash -c 'cd theia/extensions/modes && yarn build' (exit 0) + scripts/verify-platform.sh --quick (PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Organising paints the contracted placeholder slot with a working Back to Browsing control"
    requirement: "GUI-07"
    verification: []
    human_judgment: true
    rationale: "Synchronous paint and the Back control need a live Theia session; held for a headed run per the standing deferred-verification rule"
  - id: D3
    description: "Toggle lists customs beside shipped defaults and every switch keeps all tabs with the chip re-asserted"
    requirement: "GUI-07"
    verification: []
    human_judgment: true
    rationale: "Custom-row listing plus the live tab-count oracle need a headed session with a real modes.json; deferred per the standing nonstop rule"
  - id: D4
    description: "Modes style layer carries no literal typeface and stays below the user layer"
    requirement: "GUI-07"
    verification:
      - kind: other
        ref: "test $(grep -v '^#' theia/extensions/modes/src/browser/modes.css | grep -c 'font-family') -eq 0 + quick green"
        status: pass
    human_judgment: false
  - id: D5
    description: "Switch-path invariant gate plus self-test green, registry rows green"
    requirement: "GUI-07"
    verification:
      - kind: other
        ref: "node scripts/verify-mode-switch-tabs-invariant.mjs && node scripts/verify-mode-switch-tabs-invariant.mjs --self-test (3 plants red)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Copy gate covers the new modes sources with its self-test still green"
    requirement: "GUI-07"
    verification:
      - kind: other
        ref: "node scripts/verify-shell-error-copy.mjs && node scripts/verify-shell-error-copy.mjs --self-test (15 + 4 plants red)"
        status: pass
    human_judgment: false

# Metrics
duration: 28min
completed: 2026-09-06
status: complete
---

# Phase 14 Plan 02: Full Modes Summary

**Custom modes as user-storage data with contracted fallback, the organising slot, custom toggle rows, and mechanical proof no switch path can touch a tab.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-06T05:35:00Z
- **Completed:** 2026-09-06T06:03:23Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Mode service loads `modes.json` after startup with never-create absence, total parsing, corrupt fallback to Browsing with the contracted notice, debounced hot reload, and persisted-active re-apply
- Save path with the contracted 60-char cap, empty/duplicate errors writing nothing partial, saved confirmation, and landing in the new mode
- Organising placeholder slot with contracted copy and a working Back to Browsing control routed through the imported activate const
- Toggle custom rows with ellipsis, tooltips, single active marker, and internal scroll; shipped rows untouched
- Switch-path invariant gate (8 allowlisted calls, 2 command ids, const discipline) plus extended copy coverage, both with self-tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Custom modes service with fallback plus mode commands** - `813d9b8` (feat)
2. **Task 2: Organising placeholder plus toggle custom rows and style layer** - `fae0224` (feat)
3. **Task 3: Switch-path invariant gate plus copy coverage as registry rows** - `c1b4d5c` (feat)

**Plan metadata:** pending (docs: this summary commit)

## Files Created/Modified
- `theia/extensions/modes/src/browser/mode-service.ts` - Customs from user-storage JSON with total parsing, fallback, save path, and the allowlisted switch path
- `theia/extensions/modes/src/browser/modes-commands.ts` - Labelless activate plus Save as Mode command ids
- `theia/extensions/modes/src/browser/organising-placeholder-widget.ts` - Contracted slot with Back to Browsing, contribution-routed through the slot seam
- `theia/extensions/modes/src/browser/modes.css` - Single layer on locked tokens below the user layer (118 lines, no literal typeface)
- `theia/extensions/modes/src/browser/mode-descriptors.ts` - Organising show/hide hooks plus the shared slot seam
- `theia/extensions/modes/src/browser/modes-frontend-module.ts` - Static binds for the service, commands, and placeholder view
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` - Custom rows after shipped segments with active-custom tracking
- `theia/extensions/chrome-bar/package.json` - Workspace modes dep edge (no new packages)
- `scripts/verify-mode-switch-tabs-invariant.mjs` - Switch allowlist plus command registry gate with 3-plant self-test
- `scripts/verify-shell-error-copy.mjs` - Modes-copy extension (10-string contract, widget pin) with 4 new self-test plants
- `scripts/verify-mode-toggle-commands.mjs` - Manifest-flag scan widened to the new modes sources
- `scripts/verify-platform.sh` - Invariant gate plus self-test rows beside the toggle pair

## Decisions Made
- Mode empty-name error ("Give the mode a name — type a name and choose Save as Mode.") and duplicate-name error ("A mode with this name already exists. Choose a different name.") mirror the setup shape with the mode CTA; planner-fixed per RESEARCH Open Question 2 alongside the version-plus-customs schema
- Placeholder show/hide is one module slot seam (`openOrganisingSlot`/`closeOrganisingSlot`) shared by the descriptor hooks and the service, so no service-to-contribution DI edge and no cycle back through the Back control's command call
- Widget lists customs through `ModeService.getCustomModes()` rather than the perspective registry: stock 1.74.1 exposes no unregister, so registry listing would keep mid-session-deleted customs visible until relaunch while the service drops them immediately
- Copy gate compares verbatim templates (interpolations normalized), bans dotted/complex interpolation while allowing a single plain identifier, and pins the grandfathered widget copy by set equality only
- Stock bottom panel is a dock panel without expand/collapse, so the switch path uses `expandPanel`/`collapsePanel` for bottom and handler expand/collapse for the sides; all four spellings sit in the allowlist

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Staged mode-descriptors.ts in Task 1 for the slot seam**
- **Found during:** Task 1 (mode-service cannot compile without the seam it calls)
- **Issue:** Plan files list three files, but the slot functions live in mode-descriptors.ts
- **Fix:** Added the seam additively (gate-safe: no id/label/placement lines touched) and staged it
- **Files modified:** theia/extensions/modes/src/browser/mode-descriptors.ts
- **Verification:** Modes extension builds; toggle gate still green
- **Committed in:** 813d9b8 (Task 1 commit)

**2. [Rule 1 - Bug] Placeholder rewritten from ReactWidget to plain Widget**
- **Found during:** Task 2 (modes build failed: JSX does not parse in the plan-pinned `.ts` file)
- **Issue:** First draft used JSX, but the plan's file list and verify grep pin `organising-placeholder-widget.ts`
- **Fix:** Rewrote with DOM nodes plus `textContent` (the copy gate's enumerated site); caught a staging slip the same way when the commit briefly held the JSX version, amended immediately
- **Files modified:** theia/extensions/modes/src/browser/organising-placeholder-widget.ts
- **Verification:** Modes build green; `grep -c ReactWidget` on HEAD content is 0
- **Committed in:** fae0224 (Task 2 commit, after amend)

**3. [Rule 3 - Blocking] Staged chrome-bar/package.json plus the forgotten module bind**
- **Found during:** Task 2 (cross-extension const import cannot resolve without the dep edge; placeholder bind unstaged by the plan's four-file add list)
- **Issue:** Two files outside the plan's add list were required for a working composition
- **Fix:** Added the workspace modes dep (realigned with `yarn install --frozen-lockfile`, no lockfile change, no new packages); amended the bind into the task commit
- **Files modified:** theia/extensions/chrome-bar/package.json, theia/extensions/modes/src/browser/modes-frontend-module.ts
- **Verification:** Both extensions build; quick green
- **Committed in:** fae0224 (Task 2 commit, after amend)

**4. [Rule 2 - Missing Critical] Copy self-test plant expectation corrected**
- **Found during:** Task 3 (new modes plant M3 failed: gate went red naming `Save Mode`, plant expected `Save as Mode`)
- **Issue:** My expectation was wrong, not the gate: the drifted value is the surplus that names the drift, while `Save as Mode` still derives from the save prompt
- **Fix:** Expectation now names the drifted value; the invariant gate pins the command label verbatim on top
- **Files modified:** scripts/verify-shell-error-copy.mjs
- **Verification:** All 15 + 4 plants red naming their drifts
- **Committed in:** c1b4d5c (Task 3 commit)

**5. Hardening beyond the letter: manifest-flag scan widened to the new modes sources**
- **Found during:** Task 3 (new files carry the same no-`[modes]`-flag property the toggle gate proves)
- **Issue:** Plan did not ask, but leaving new sources outside the scan weakens the standing rule
- **Fix:** Three files appended to `MODES_GLOB_RELS`; toggle self-test re-run green
- **Files modified:** scripts/verify-mode-toggle-commands.mjs
- **Verification:** Toggle gate plus self-test green
- **Committed in:** c1b4d5c (Task 3 commit)

---

**Total deviations:** 5 auto-fixed (1 bug, 1 missing critical, 2 blocking, 1 hardening)
**Impact on plan:** All required for compiling, composing, or correctly asserting code; no scope creep. No new packages, no manifest flags, no Theia-core or Gecko touches.

## Issues Encountered
- A JSX-in-`.ts` draft failed the modes build on the first attempt (one fix-and-retry spent inside Task 2, resolved by the plain-Widget rewrite; no deferral needed)
- A regex-mystery detour during copy-gate calibration (backtick attr values not matching) resolved to a real JSX subtlety, not a tooling bug: the value sits in an expression container (`aria-label={`...`}`), so the attr pattern takes an optional brace pair
- No gaps required deferral: every verify in the plan passed unmodified, both builds green, quick green throughout

## Known Limitations
- A custom deleted mid-session keeps its perspective descriptor until relaunch (stock 1.74.1 exposes no unregister): the service drops it from every listing and falls back to Browsing when stuck on it, and the stale toggle row clears on relaunch
- Customs registered in the background repaint the toggle on the next switch (stock exposes no registration event); the save flow and the reload re-apply both switch, so both repaint through the stock event

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 14-03 builds dependents and setups on this foundation: customs registry plus the slot seam are the hooks; the layout snapshot stored per custom row is available to the setups restore path
- Live behaviors held for a headed session per the standing deferred-verification rule: save dialog flow, corrupt-file fallback flash, custom-row listing, placeholder paint, and the tab-count oracle across switches (coverage D2, D3)

## Self-Check: PASSED
- All created files exist on disk; all modified files present
- `813d9b8`, `fae0224`, `c1b4d5c` present in `git log`
- Stub scan over new sources: no TODO/FIXME/coming-soon/not-available (exit 1, clean)
- Threat surface: nothing beyond the plan threat model (user-storage JSON plus input text, both mitigated per T-14-02-01/02); no new endpoints, packages, or transports

---
*Phase: 14-modes-windows-setups*
*Completed: 2026-09-06*
