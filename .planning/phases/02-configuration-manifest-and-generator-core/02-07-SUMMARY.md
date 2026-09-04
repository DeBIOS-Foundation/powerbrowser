---
phase: 02-configuration-manifest-and-generator-core
plan: 07
subsystem: testing
tags: [gate-design, scorecard, gap-closure, G-02-11, G-02-12]

# Dependency graph
requires:
  - phase: 02-configuration-manifest-and-generator-core (02-UAT)
    provides: G-02-11/G-02-12 gap records and the 17-agent design panel ranking option 1 first with option 4 flagged unaudited
provides:
  - 02-DESIGN-G-02-11.md with 8-row scorecard, fresh-clone criterion, and machine-readable ratified verdict + foreign-checkout exit codes that 02-08 branches on
affects: [02-08 tracer implementation, 02-09 record corrections]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 5200
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [decision-as-machine-readable-token, scorecard-before-one-way-door]

key-files:
  created: [.planning/phases/02-configuration-manifest-and-generator-core/02-DESIGN-G-02-11.md, .planning/phases/02-configuration-manifest-and-generator-core/02-07-SUMMARY.md]
  modified: [.planning/phases/02-configuration-manifest-and-generator-core/deferred-items.md]

key-decisions:
  - "Ratified option-4-placeholder at blocking-human checkpoint: exact byte comparison survives, tracked .desktop entries carry @POWERBROWSER_REPO_ROOT@, --quick goes green on any clone"
  - "Scorecard recommends option 4 (4x pass vs 4x serious); operator ratified the recommendation, not against it"

patterns-established:
  - "One-way-door format/contract changes get scored on the panel's lenses and ratified before any implementation commit"

requirements-completed: [GEN-04, CFG-01]

# Metrics
duration: ~30min
completed: 2026-09-03
status: complete
---

# Phase 02 Plan 07 Summary

**Scored unaudited placeholder design against panel-ranked quotient design on four lenses; operator ratified `option-4-placeholder` as machine-readable verdict for 02-08**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-03T00:00:00Z
- **Completed:** 2026-09-03
- **Tasks:** 3
- **Files modified:** 2 (1 created + verdict appended, 1 line appended)

## Accomplishments

- `02-DESIGN-G-02-11.md` scorecard: 8 option-by-lens rows, every row citing a file path; option-1 honesty row names all three claim sites; option-1 rules row names the space-root and PASS-path holes; option-4 rules row cites the `.mozconfig` POWERBROWSER_* precedent (verified: scan exits 0 with those literals)
- Fresh-clone criterion answered per option: option-1 `--quick` = no (preflight honestly red elsewhere), option-4 = yes
- Blocking-human checkpoint resolved by operator: `option-4-placeholder` (matching the scorecard recommendation)
- `## Verdict` records `ratified: option-4-placeholder` plus `### Why`, the three `foreign_checkout_*_exit:` lines (0/0/0), and `## Relationship to D-04` (keeps no-machine-value-in-manifest, amends mechanism — authorised amendment to a locked decision)
- `deferred-items.md` appended with ratification record; additions only

## Task Commits

Each task was committed atomically:

1. **Task 1: Score option 4 against option 1** - scorecard commit (docs)
2. **Task 2: blocking-human checkpoint** - no commit (decision only, recorded in task 3)
3. **Task 3: Record ratified verdict** - verdict commit (docs)

**Plan metadata:** summary commit (docs: complete plan)

## Files Created/Modified

- `.planning/phases/02-configuration-manifest-and-generator-core/02-DESIGN-G-02-11.md` - Scorecard, fresh-clone criterion, recommendation, ratified verdict, foreign-checkout expectations, D-04 relationship
- `.planning/phases/02-configuration-manifest-and-generator-core/deferred-items.md` - One appended ratification line
- `.planning/phases/02-configuration-manifest-and-generator-core/02-07-SUMMARY.md` - This file

## Decisions Made

- Ratified `option-4-placeholder`: the only design restoring G-02-11's failed truth literally (`--quick` green on clean clone); keeps exact byte comparison; dissolves G-02-12; accepted costs are the documented install substitution step and the narrowed preflight
- No third design was proposed at the checkpoint; 02-08 reads the two literals and nothing else

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Task 1 verify gates passed on first run (8/8 rows, headings correct, no source tree touched). `scripts/verify-platform.sh --quick` exits 0 after the plan, as required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 02-08 unblocked: reads `ratified: option-4-placeholder` and `foreign_checkout_preflight_exit: 0` from `02-DESIGN-G-02-11.md`; implements branch B (token in `emitDesktopEntry`, both tracked `.desktop` files rewritten in the same commit, token-based preflight + no-absolute-path assertion, `repo_root` removal, `docs/BUILD.md` subsection)
- 02-08 is `autonomous: true`, wave 2 — ready to execute

---
*Phase: 02-configuration-manifest-and-generator-core*
*Completed: 2026-09-03*
