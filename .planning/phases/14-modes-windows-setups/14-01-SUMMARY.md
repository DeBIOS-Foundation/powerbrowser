---
phase: 14-modes-windows-setups
plan: 01
subsystem: ui
tags: [theia, perspectives, modes, secondary-window, bidi, chrome-bar]

# Dependency graph
requires:
  - phase: 13-chrome-bar-strip-relocation-spike
    provides: [chrome-bar toggle + chip, BiDi probe harness pattern, RED strip verdict binding]
provides:
  - BiDi GREEN verdict routing dependent-window work to the stock secondary-window path
  - "@powerbrowser/modes extension with three shipped PerspectiveDescriptors"
  - "chrome-bar toggle bridged to stock switchPerspective with chip re-assert"
  - "shipped-mode defaults gate with self-test plus registry rows"
affects: [14-02 (custom modes, organising placeholder hooks), 14-03 (dependent windows on the stock path)]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 13035
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [perspective-descriptors-as-shipped-defaults, toggle-agreement-through-gate-never-imports, derive-and-compare-defaults-gate]

key-files:
  created:
    - .planning/phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md
    - theia/extensions/modes/src/browser/mode-descriptors.ts
    - theia/extensions/modes/src/browser/modes-frontend-module.ts
    - scripts/verify-mode-toggle-commands.mjs
  modified:
    - theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
    - theia/package.json
    - theia/applications/browser/package.json
    - scripts/verify-platform.sh

key-decisions:
  - "Probe verdict GREEN: 14-03 builds dependents on the stock secondary-window path, no chrome-side fallback"
  - "Descriptors use string literals (not id consts) so the defaults gate can derive-and-compare"
  - "Toggle-to-descriptor mapping is lowercased-labels-equal-ids, asserted by the gate rather than trusted"
  - "Workspace realignment via yarn install (no new packages) to link modes and chrome-bar into the app"

patterns-established:
  - "Shipped modes as stock PerspectiveDescriptors registered synchronously in onStart, user data deferred"
  - "Toggle/descriptor agreement through a derive-and-compare gate, never cross-extension imports"
  - "Scoped negated manifest-flag search with backtick-prose exemption plus a planted-flag positive control"

requirements-completed: [GUI-07, GUI-09]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Probe record with one-line GREEN verdict routing 14-03 to the stock secondary-window path"
    requirement: "GUI-09"
    verification:
      - kind: manual_procedural
        ref: "grep ^Verdict: GREEN 14-PROBE-DEPENDENT-WINDOWS.md + git -C upstream diff --quiet + shipped-tree clean + scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D2
    description: "Modes extension builds with three shipped descriptors registered synchronously"
    requirement: "GUI-07"
    verification:
      - kind: integration
        ref: "nix develop .#theia --command bash -c 'cd theia/extensions/modes && yarn build' (exit 0) + bundle contains ModesContribution"
        status: pass
    human_judgment: false
  - id: D3
    description: "Toggle switches stock perspectives end-to-end with tabs invariant and chip re-assert"
    requirement: "GUI-07"
    verification:
      - kind: other
        ref: "tsc -b chrome-bar + app build green; live switch held for headed session per deferred-verification rule"
        status: unknown
    human_judgment: true
    rationale: "Static wiring plus stock-API contract only; a headed live switch with tab-count oracle is the genuine judgment and is deferred per the standing nonstop rule"
  - id: D4
    description: "Shipped-mode defaults gate plus self-test green, registry rows green"
    requirement: "GUI-07"
    verification:
      - kind: automated_ui
        ref: "node scripts/verify-mode-toggle-commands.mjs && node scripts/verify-mode-toggle-commands.mjs --self-test (6 plants red)"
        status: pass
    human_judgment: false

# Metrics
duration: 30min
completed: 2026-09-06
status: complete
---

# Phase 14 Plan 01: Probe + Modes Tracer Summary

**BiDi GREEN verdict routes dependents to the stock secondary-window path; modes ship as three stock descriptors behind a bridged toggle under a mechanical defaults gate.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-09-06T05:05:00Z
- **Completed:** 2026-09-06T05:35:01Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Live BiDi probe proves `moveWidgetToSecondaryWindow` hosts terminal and dirty editor widgets in a real secondary frame — GREEN, no chrome fallback needed
- `@powerbrowser/modes` extension with Coding/Browsing/Organising descriptors, synchronously registered, composed into the app bundle
- Chrome-bar toggle bridged to stock `switchPerspective` with chip re-assert on every perspective change
- Defaults gate (ids/labels/order/placements + no-manifest-flag proof) with 6-plant self-test, registered in `verify-platform.sh`

## Task Commits

Each task was committed atomically:

1. **Task 1: BiDi window-routing probe with GREEN/RED record** - `f8081cb` (docs)
2. **Task 2: Modes extension skeleton with shipped descriptors** - `351ca7d` (feat)
3. **Task 3: Toggle bridge to stock switching plus defaults gate** - `74e1db8` (feat)

**Plan metadata:** pending (docs: this summary commit)

## Files Created/Modified
- `.planning/phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md` - GREEN verdict record with verbatim BiDi evidence, close matrix, proofs
- `theia/extensions/modes/package.json` - extension manifest (pinned in-tree specs only, no new packages)
- `theia/extensions/modes/tsconfig.json` - verbatim tab-uris compiler shape
- `theia/extensions/modes/src/browser/mode-descriptors.ts` - three shipped PerspectiveDescriptors, RED-bounded shell map, strip named nowhere
- `theia/extensions/modes/src/browser/modes-frontend-module.ts` - static binds + synchronous shipped registration, no user-storage reads
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` - PerspectiveService bridge, chip re-assert subscription, css import idiom fix
- `scripts/verify-mode-toggle-commands.mjs` - defaults gate with self-test (6 plants)
- `scripts/verify-platform.sh` - two registry rows beside the gui07 verdict pair
- `theia/package.json`, `theia/applications/browser/package.json` - hand-appended composition entries

## Decisions Made
- GREEN verdict: 14-03 builds on the stock secondary-window path (terminal + dirty editor hosted live with correct titles; close matrix loses nothing; dirty content reaches disk on dependent close)
- Descriptors use string literals per plan; the lowercased-label mapping rule is gate-asserted, never trusted
- `yarn install --frozen-lockfile` realignment (links modes + chrome-bar, zero lockfile change, no new packages) instead of leaving composition unresolvable
- Dirty-flag survival mechanism left unattributed (save-on-close vs autoSave): 14-03 must not assume unsaved-dirty survives as dirty

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored the deleted drivelist native binding**
- **Found during:** Task 1 (backend crashed at require time, shell stuck on about:blank)
- **Issue:** `theia/node_modules/drivelist/build/` never compiled; backend bundle requires it eagerly; no probe could run
- **Fix:** Copied the build's own `lib/backend/native/drivelist.node` into place (sha256-identical both copies); require-test green
- **Files modified:** theia/node_modules (gitignored, invisible to git)
- **Verification:** Backend boots; 4 probe sessions ran; `DRIVELIST_LOADS_OK`
- **Committed in:** n/a (gitignored artifact restore, documented in the probe record)

**2. [Rule 1 - Bug] chrome-bar css import follows the upstream src-relative idiom**
- **Found during:** Task 2 (first app build with chrome-bar linked failed: `Could not resolve "./chrome-bar.css"`)
- **Issue:** Phase 13 shipped `import './chrome-bar.css'` whose compiled `require` has no lib-side target; latent until first app composition (matches `@theia/preferences` `../../src/browser/style/index.css` precedent)
- **Fix:** One-line import path correction, no behavior change
- **Files modified:** theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
- **Verification:** Full `yarn build` green; bundle carries chrome-bar (10 refs)
- **Committed in:** 351ca7d (Task 2 commit)

**3. [Rule 2 - Missing Critical] Descriptor ids as string literals, not consts**
- **Found during:** Task 3 (gate derived ZERO ids: `id: CODING_MODE_ID` is not derivable)
- **Issue:** Plan requires static literals and a derive-and-compare gate; const indirection defeats derivation
- **Fix:** Literals in descriptors; mapping rule asserted by the gate
- **Files modified:** theia/extensions/modes/src/browser/mode-descriptors.ts
- **Verification:** Gate + self-test green
- **Committed in:** 74e1db8 (Task 3 commit)

**4. [Rule 3 - Blocking] Workspace realignment to link modes and chrome-bar**
- **Found during:** Task 2 (app build could not resolve `@powerbrowser/modes`; probe found chrome-bar missing from the bundle)
- **Issue:** `yarn install` predated both workspace members; composition entries alone do not link
- **Fix:** `yarn install --frozen-lockfile` (2 s, no lockfile change, no new packages)
- **Files modified:** theia/node_modules links only (gitignored)
- **Verification:** Bundle contains ModesContribution (8 refs) and chrome-bar; full build green
- **Committed in:** n/a (environment realignment, documented here)

---

**Total deviations:** 4 auto-fixed (1 bug, 1 missing critical, 2 blocking)
**Impact on plan:** All required for a working composition; no scope creep. No new packages, no manifest flags, no Theia-core or Gecko touches.

## Issues Encountered
- Core-diff instrument still red after realignment (stage-1 `yarn check --integrity` flags mismatch, same pre-existing signature as 13-SPIKE): one fix-and-retry spent (the realignment), now deferred per the standing gap rule. The GREEN verdict never rested on it (BiDi contexts are the routing instrument) — recorded as probe Constraint 4.
- Headless geometry (moveTo/resizeTo silently ignored) and focused-tab focus held out for a headed session per the UI-SPEC backstop discipline; verbatim no-throw evidence recorded.
- Run-3 Q1/Q3 close halves void (secondary ref stashed before popup load); completed in run 4 with settle-time stashing. Full correction trail in the probe record.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 14-02 builds custom modes + organising placeholder hooks on the shipped descriptors; FileService-only JSON per probe Constraint 2; file-tab identity needs a non-registry key per Constraint 3
- 14-03 builds dependents on the stock path; close handling must be idempotent (double-`closed` variance observed); dirty-flag survival unattributed
- Composition realignment done: future extensions link via the same install step

## Self-Check: PASSED
- Record, descriptors, module, gate exist on disk; all staged paths committed
- `f8081cb`, `351ca7d`, `74e1db8` present in `git log`
- Verdict line greps; upstream diff empty; quick gate green at each task commit

---
*Phase: 14-modes-windows-setups*
*Completed: 2026-09-06*
