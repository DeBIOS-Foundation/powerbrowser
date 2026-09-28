---
phase: 11-sql-store-design
plan: 02
subsystem: database
tags: [sqlite, schema, migrations, fixtures, sign-off]

# Dependency graph
requires:
  - phase: 11-sql-store-design plan 01
    provides: [six-row authority table with Phase 12 enforcement pointers, recorded reviewer approval]
provides:
  - Tabs schema document on URI TEXT primary key with version 1 from day one
  - Forward-only migration plan with quarantine path and 15-drive exercise log at execution (later synced to 23 drives by the review-fix series)
  - Committed v1 fixture database plus throwaway exercise script
  - Recorded reviewer approval for the schema and migration plan
affects: [11-03 review-sign gate, phase-12 store build]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Commit SHAs below are taken from `git log --oneline --grep="11-02"`.
actuals:
  tokens: not established
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [forward-only numbered migrations with pre-checks, quarantine-not-delete with N=max+1 allocator, fixture exercise with firing non-vacuity controls]

key-files:
  created: [.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md, .planning/milestones/v1.2-phases/11-sql-store-design/schema/MIGRATIONS.md, .planning/milestones/v1.2-phases/11-sql-store-design/fixtures/tabs-v1.sqlite, .planning/milestones/v1.2-phases/11-sql-store-design/fixtures/exercise-migrations.mjs, .planning/milestones/v1.2-phases/11-sql-store-design/schema/SIGN-OFF.md]
  modified: []
  # Paths above are the current archive locations; at execution the commits added the same files under .planning/phases/ (verified: c1a004d added .planning/phases/11-sql-store-design/schema/SCHEMA.md); archive b7b3b33 moved them.

key-decisions:
  - "Four-column YAGNI set (uri, url, title, last_active) with last_active index; window, pinned and private columns excluded"
  - "Private exclusion is total with the detection symbol pinned from the pinned tree"
  - "Phase 12 gates specified as future registry rows with self-test obligations, not implemented here"

patterns-established:
  - "Exercise script mutates mktemp stage copies only; committed fixture must stay byte-identical"
  - "Non-vacuity controls must fire: tampered copy trips the wire, stale version advances, newer version refuses"

requirements-completed: [SQL-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Schema document with opaque-form URI primary key, four-column set, version 1 from day one, fixed filename as platform content"
    requirement: "SQL-03"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick (green over staged docs)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration plan with forward-only chain, quarantine procedure, and exercise log showing passing drives plus firing controls"
    requirement: "SQL-03"
    verification:
      - kind: other
        ref: "node .planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs (15 drives, 15 assertions at execution; later synced to 23 drives, 23 assertions by the review-fix series ending 4bbdf7f)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Recorded reviewer approval with per-item checklist for the schema and migration plan"
    requirement: "SQL-03"
    verification: []
    human_judgment: true
    rationale: "A review signature is a human judgment by definition — the record exists on disk but a person must trust the named reviewer's verdict"

# Metrics
duration: 4min
completed: 2026-09-05
status: complete
---

# Phase 11 Plan 02: Schema and Migration Plan Summary

**SQL-03 schema plus migration plan written, exercised against fixture copies with a 15-drive log at execution (later synced to 23 drives by the review-fix series), and signed with a recorded approval**

## Performance

- **Duration:** ~4 min (first to last plan commit, 11:43 to 11:48 -0700 on 2026-09-05)
- **Started:** 2026-09-05
- **Completed:** 2026-09-05
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- SCHEMA.md: opaque-form URI TEXT PRIMARY KEY, four columns (uri, url, title, last_active) with the last_active index, version 1 set at creation through the user-version pragma, fixed `tabs.sqlite` filename as platform content, total private exclusion with a pinned detection symbol
- MIGRATIONS.md: forward-only numbered-migration procedure with one transaction per migration plus pre-checks and never downgrades, quarantine-not-delete corruption path with the N=max+1 allocator, fixture inventory, and the exercise log at execution (15 drives, 15 assertions; verified at 8864270; the review-fix series ending 4bbdf7f later synced the log to 23 drives, 23 assertions; fixture sha256 `9daab2d5b09a5b843d1fdecba0410346b0b5969a6d16cd2a35ff67f4f2e7e73f` unchanged across ffff801, 8864270 and the current tree)
- Fixtures: committed `tabs-v1.sqlite` (version 1, WAL mode, 3 public-tab rows, no private rows) plus the throwaway `exercise-migrations.mjs` scaffold (standard-library `node:sqlite` with a stage-confined ephemeral-install fallback when standard-library support is absent, mktemp stage copies only)
- SIGN-OFF.md: recorded approval (Chris, 2026-09-05) with a 9-item checklist, all PASS, plus reviewed-files rows and assumed-item dispositions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the tabs schema document** - `c1a004d` (feat)
2. **Task 2: Write the migration plan, build fixtures, and exercise the chain** - `ffff801` (feat)
3. **Task 3: Reviewer pass and recorded approval for schema and migration plan** - `8864270` (docs)

**Commit SHAs verified with `git log --oneline --grep="11-02"`. File line counts at those commits: SCHEMA.md 217, MIGRATIONS.md 152, exercise script 309, SIGN-OFF.md 78. Where a fact below cannot be established from the evidence, that is stated instead of guessed.**

## Files Created/Modified
- `.planning/phases/11-sql-store-design/schema/SCHEMA.md` - URI PK on the opaque canonical form, YAGNI column set with per-column Phase 12 consumers, private exclusion with pinned symbol, version rule, fixed filename, coverage boundary, query-API placement, Phase 12 registry-row specification
- `.planning/phases/11-sql-store-design/schema/MIGRATIONS.md` - Forward-only chain procedure with in-tree wrapper source pins, corruption procedure, fixture inventory, exercise log with drive map, test-scaffolding note, authority-consistency section
- `.planning/phases/11-sql-store-design/fixtures/tabs-v1.sqlite` - Committed fixture database at the initial schema version, verified byte-identical before and after the exercise run. The per-row contents of the fixture cannot be established from the plan file or the commit record alone; this summary does not state them.
- `.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs` - Throwaway exercise script, test scaffolding only, explicitly not a registry row
- `.planning/phases/11-sql-store-design/schema/SIGN-OFF.md` - STATUS RECORDED approval with procedure, 9-item checklist results, reviewed-files rows, evidence basis (A1 pinned, A2–A4 deferred or planner's discretion)

## Decisions Made
- Four-column set only: uri, url, title, last_active, plus one index on last_active; window-identifier and pinned-flag columns excluded for no Phase 12 consumer; no private column at all with the writer-side filter placed before upsert
- Private-window detection symbol pinned from the pinned checkout (`upstream/toolkit/modules/PrivateBrowsingUtils.sys.mjs:18` per the sign-off record); whether the plan file itself prescribed that exact path or the reviewer resolved it during execution cannot be established from the plan file alone and is not stated here
- Review-driven fix during the approval pass: WAL-sidecar note added to MIGRATIONS.md (readonly opens may materialize `-wal`/`-shm` beside the committed fixture; runtime state only, removed after every run)
- Phase 12 gates (second-writer scan, integrity soak, restart roundtrip, emitter-exercising absence test) specified as future registry rows with self-test obligations, not implemented in this plan

## Deviations from Plan

None established — the three task commits match the three plan tasks in order, and the sign-off record states each checklist item was judged by inspection against the cited source. Whether review defects beyond the WAL-sidecar note were found and fixed in the same pass cannot be established from the commit record and is not stated here.

## Issues Encountered
- The exact reviewer identity beyond the name recorded in SIGN-OFF.md (Chris, 2026-09-05) and the wall-clock duration of each task cannot be established from the plan file or the commit record; they are not stated here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 11-03 (review-sign gate) consumes both SIGN-OFF.md files plus the exercise log as its evidence; the validation-strategy file stays untouched for the verifier
- Phase 12 consumes the signed design: writer wrappers, the roundtrip script, and the four specified registry rows

## Self-Check: PASSED

- FOUND: .planning/phases/11-sql-store-design/schema/SCHEMA.md (230 lines)
- FOUND: .planning/phases/11-sql-store-design/schema/MIGRATIONS.md (190 lines)
- FOUND: .planning/phases/11-sql-store-design/schema/SIGN-OFF.md (78 lines)
- FOUND: .planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs (411 lines)
- FOUND: c1a004d, FOUND: ffff801, FOUND: 8864270

---
*Phase: 11-sql-store-design*
*Completed: 2026-09-05*
