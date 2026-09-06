---
phase: 13-chrome-bar-strip-relocation-spike
plan: 05
subsystem: browser-gui
tags: [chrome-bar, theia, placement-gate, ui-contract, verify-gates]
requires:
  - phase: 13-chrome-bar-strip-relocation-spike/13-04
    provides: [row-URL commit routing with in-bar failure row, copy gate owning the failure string]
provides:
  - Ratified bar-above-strip Variant-A contract with the core-touch reason on record
  - DOM-order placement gate deriving area plus contracted order with green-first self-test
  - Two registry rows beside the chrome-bar pair in the single driver
affects: [gui06-uat-test-3, GUI-02-navigable-tabs]
actuals:
  tokens: 3238
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [derive-and-compare placement assertion, plant-landed self-test proofs]
key-files:
  created: [scripts/verify-chrome-bar-placement.mjs]
  modified: [.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UI-SPEC.md, theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx, scripts/verify-platform.sh]
key-decisions:
  - "Ratify bar-above-strip as the Variant-A contract: the below-strip slot needs dock surgery, a Theia-core touch forbidden by the never-fork-core hard rule"
  - "Placement gate derives the contribution area and the contracted order at check time; empty derivation on either side fails as a broken instrument, never passes as clean"
patterns-established:
  - "Placement assertion: addWidget area plus UI-SPEC order line compared as derived-vs-declared, drift named on both sides"
requirements-completed: [GUI-06]
coverage:
  - id: D1
    description: "UI contract records bar-above-strip as the ratified Variant-A order with the core-touch reason; widget header cites it with no code change; Copywriting Contract gains the commit-failure row"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "grep -c 'chrome bar → tab strip' 13-UI-SPEC.md plus grep -c commit-failure copy"
        status: pass
      - kind: other
        ref: "scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D2
    description: "DOM-order placement gate green with three plant-landed self-test proofs; both registry rows plus neighbouring chrome-bar rows green through the single-gate runner"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "node scripts/verify-chrome-bar-placement.mjs"
        status: pass
      - kind: other
        ref: "node scripts/verify-chrome-bar-placement.mjs --self-test"
        status: pass
      - kind: other
        ref: "scripts/verify-platform.sh --only gui06-chrome-bar-placement plus --only gui06-chrome-bar-placement-self-test plus neighbouring chrome-bar rows"
        status: pass
    human_judgment: false
duration: not instrumented (spawn timestamp not captured; two gate-plus-commit cycles)
completed: 2026-09-06
status: complete
---

# Phase 13 Plan 05: Bar-Above-Strip Ratification Plus Placement Gate Summary

**Bar-above-strip ratified as the Variant-A contract with the dock-surgery reason on record, held by a derived placement gate whose three planted faults all go red**

## Performance

- **Duration:** not instrumented (spawn timestamp not captured)
- **Completed:** 2026-09-06
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- UI-SPEC Bar placement section records the ratified order menubar, chrome bar, tab strip, workarea, status bar with the never-fork-core reason replacing the planner-call sentence
- Copywriting Contract gains the commit-failure row owning the identical 13-04 copy string with the Enter-retry affordance noted
- Widget header cites the ratified Variant-A order; zero widget code changed
- New placement gate derives the addWidget area and the contracted order at check time, passing only on top-area plus bar-immediately-above-strip
- Two registry rows beside the chrome-bar pair with honesty comments; no sibling driver created; quick gate green

## Task Commits

Each task was committed atomically:

1. **Task 1: Ratify bar-above-strip in the UI contract plus widget note** - `26a8666` (fix)
2. **Task 2: DOM-order placement gate as registry rows with self-test** - `413f485` (fix)

## Files Created/Modified

- `.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UI-SPEC.md` - ratified order line plus core-touch reason; commit-failure copy row
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` - header note cites the ratified order (comment only)
- `scripts/verify-chrome-bar-placement.mjs` - DOM-order gate with green-first self-test (new, 206 lines)
- `scripts/verify-platform.sh` - placement entry plus self-test rows beside the chrome-bar pair

## Decisions Made

- Ratification over dock work: the below-strip slot would need dock surgery, which is a Theia-core touch forbidden by the never-fork-core hard rule, so below-strip stays out of Variant A (facet 2 closed by contract, not code)
- Gate parses the bold-stripped section text across the source line wrap, so contract emphasis and the parsed order stay independent
- Order-deletion plant uses comma-joined region names (no arrows) so it breaks derivation distinctly from the order-flip plant, which keeps arrows but swaps the pair

## Deviations from Plan

None - plan executed exactly as written. (One self-correction during task 2: the first area-respell self-test expectation carried quotes the failure message does not emit; fixed to the bracketed form before committing. Not a plan deviation — the committed gate proves all three plants.)

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-13-3 facet 2 is closed: the wrong-location facet now rests on a ratified contract plus a mechanical gate, not a mock
- GUI-06 gap-closure set is complete across 13-04 (facets 1+3) and 13-05 (facet 2); live-activation proof stays with UAT test 3 via `/gsd-verify-work 13`
- No Theia-core or Gecko surface touched: changes are one extension comment, two scripts, one registry block, and planning prose

---
*Phase: 13-chrome-bar-strip-relocation-spike*
*Completed: 2026-09-06*

## Self-Check: PASSED

- All four modified files plus the SUMMARY file exist on disk
- Both task commits resolve: `26a8666`, `413f485` present in `git log`
- No new stubs introduced (no TODO/FIXME/placeholder text in the created gate or edited prose)
- No threat-model surface beyond the plan's register (text reads only; no installs, no endpoints, no schema)
