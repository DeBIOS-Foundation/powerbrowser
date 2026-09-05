---
phase: 11-sql-store-design
plan: 01
subsystem: database
tags: [sqlite, authority, invariants, sign-off, sessionstore]

# Dependency graph
requires:
  - phase: 10-sign-off-closeout
    provides: [record/live evidence discipline, sign-off-phase precedent]
provides:
  - Six-row SQL store authority/invariant table (SQL-02) with Phase 12 enforcement pointers
  - Recorded reviewer approval for the authority table
affects: [11-02 schema plan, 11-03 review-sign gate, phase-12 store build]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 2964
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [catalogue-doc invariant table, sign-off ritual record]

key-files:
  created: [.planning/phases/11-sql-store-design/authority/AUTHORITY.md, .planning/phases/11-sql-store-design/authority/SIGN-OFF.md]
  modified: []

key-decisions:
  - "No AUTHORITY.md defects in reviewer pass — six rows confirmed as written"
  - "Assumed inputs A1-A5 deferred with pinning procedures, A6 pinned by construction"

patterns-established:
  - "Invariant table: one row = one invariant + Phase 12 enforcement + threat-if-violated"
  - "Sign-off ritual: STATUS header, procedure checklist, reviewed-files table, evidence basis, dated signature"

requirements-completed: [SQL-02]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Authority/invariant table with six rows (single writer, restore authority, URI join key, backend-never-opens, own-file, token-never-in-SQL)"
    requirement: "SQL-02"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick (scan-brand-residue + registry rows green over staged docs)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Recorded reviewer approval with per-item checklist for the authority table"
    requirement: "SQL-02"
    verification: []
    human_judgment: true
    rationale: "A review signature is a human judgment by definition — the record exists on disk but a person must trust the named reviewer's verdict"

# Metrics
duration: 12min
completed: 2026-09-05
status: complete
---

# Phase 11 Plan 01: Authority Table Summary

**SQL store authority rules signed before schema work: six invariants with Phase 12 enforcement pointers plus a recorded approval**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-05T18:38:38Z
- **Completed:** 2026-09-05
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- AUTHORITY.md: six-row invariant table (single chrome-side writer, sessionstore restore authority, registry URIs as opaque join key, backend never opens profile databases, own-file rule, token never in SQL), each row naming its Phase 12 enforcement
- SIGN-OFF.md: recorded approval (Chris, 2026-09-05) with per-item checklist all PASS and assumed inputs pinned-or-deferred
- Quick gate green on the final tree with both files staged, including the residue scan

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end authority slice** - `66d4547` (docs)
2. **Task 2: Reviewer pass and recorded approval** - `2184e0b` (docs)

**Plan metadata:** tracer verified end-to-end (re-ran `--quick`, green) before expanding to the reviewer pass, per the interactive end-of-phase tracer gate.

## Files Created/Modified
- `.planning/phases/11-sql-store-design/authority/AUTHORITY.md` - Six invariant rows, deliberately-not-replaced section, consistency section, SQLite-only engine paragraph, platform-content paragraph, no-GUI-surface sentence
- `.planning/phases/11-sql-store-design/authority/SIGN-OFF.md` - STATUS RECORDED, procedure checklist, reviewed-files table, evidence basis (A1-A6), dated signature

## Decisions Made
- No AUTHORITY.md defects found in the reviewer pass — the tracer draft already satisfied every checklist item, so Task 2 changed only SIGN-OFF.md
- Assumed inputs A1–A5 deferred with in-tree pinning procedures owned by plan 11-02 / Phase 12; A6 pinned by construction (JS-only import inside the excluded boundary file)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 11-02 (schema + migration plan) can consume AUTHORITY.md as its governing constraint
- Known deferred pins for 11-02: private-window detection symbol (A1), history/bookmark read methods (A2)

## Self-Check: PASSED

- FOUND: .planning/phases/11-sql-store-design/authority/AUTHORITY.md (53 lines, 6 invariant rows)
- FOUND: .planning/phases/11-sql-store-design/authority/SIGN-OFF.md (83 lines, RECORDED present)
- FOUND: 66d4547, FOUND: 2184e0b

---
*Phase: 11-sql-store-design*
*Completed: 2026-09-05*
