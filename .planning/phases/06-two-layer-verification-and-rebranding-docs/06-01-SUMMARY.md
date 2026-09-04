---
phase: 06-two-layer-verification-and-rebranding-docs
plan: 01
subsystem: verification
tags: [ver-01, static-scan, branding, boundary-match, allowlist, verify-platform]

# Dependency graph
requires:
  - phase: 02-configuration-manifest-and-generator-core
    provides: configuration.toml manifest plus generate.mjs resolveConfig derivation
  - phase: 01-platform-extraction-and-rename
    provides: scan-brand-residue.mjs boundary matcher and verify-platform.sh registry
provides:
  - VER-01 static layer: manifest-derived brand-literal scan failing on hardcoded display values and stale allowlist entries
  - verify-manifest-literals and verify-manifest-literals-self-test registry rows
affects: [06-06-ci-wiring, rebranding-docs, downstream-rebrand]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 18500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [derive-from-manifest-at-check-time, slot-keyed-allowlist, hermetic-mkdtemp-self-test]

key-files:
  created: [scripts/verify-manifest-literals.mjs]
  modified: [scripts/verify-platform.sh]

key-decisions:
  - "Allowlist keyed by derivation slot (variant role / dotted key), never by literal value, so the checker keeps no display string and cannot fail on itself"
  - "Line-level coverage: one entry covers every slot value matching that line, so dev-form lines need only their dev entry's file present"
  - "No RegExp built from manifest values at all (indexOf-based findMatches only), which moots T-06-01 rather than escaping around it"
  - "Dual-form files carry both slot rows for stale precision rather than relying on substring coverage"

patterns-established:
  - "Slot-keyed allowlist: entries reference which derived literal they cover via manifest structure, keeping the instrument literal-free"
  - "vacuityFailures pure guard: the three non-vacuity messages asserted directly by the self-test"

requirements-completed: [VER-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Static scan fails on a hardcoded configured display value outside the manifest, naming file, line, and value"
    requirement: "VER-01"
    verification:
      - kind: unit
        ref: "scripts/verify-manifest-literals.mjs --self-test#planted display literal"
        status: pass
    human_judgment: false
  - id: D2
    description: "Static scan fails on a stale allowlist entry (removed literal, rewritten file, deleted file), naming the entry"
    requirement: "VER-01"
    verification:
      - kind: unit
        ref: "scripts/verify-manifest-literals.mjs --self-test#stale slot entry / rewritten-clean entry / deleted-file entry"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both registry rows present and green; full --quick table green"
    requirement: "VER-01"
    verification:
      - kind: manual_procedural
        ref: "scripts/verify-platform.sh --quick (50 rows, all PASS)"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-09-04
status: complete
---

# Phase 6 Plan 01: VER-01 Static Literal Scan Summary

**Manifest-derived brand-literal scan with a committed 42-entry slot-keyed allowlist, registered as two `--quick` verifier rows, full table green**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-04T08:28:00Z (approx)
- **Completed:** 2026-09-04T08:53:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `scripts/verify-manifest-literals.mjs` (564 lines): derives 4 literal slots from `configuration.toml` via `resolveConfig` at check time, matches with the reused `findMatches` boundary rule, fails on uncovered occurrences (file:line:value) and stale allowlist entries (naming the entry), with three distinct non-vacuity guards
- Hermetic `--self-test`: green control first, then 7 planted faults each going red as pinned (display plant, boundary control, 3 stale kinds, empty scope, empty literals) plus the empty-allowlist guard
- Two registry rows (`verify-manifest-literals`, `verify-manifest-literals-self-test`) beside the static branding gates; both `--only` paths green; full `--quick` (50 rows) green with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write verify-manifest-literals.mjs with self-test** - `5688785` (feat)
2. **Task 2: Register both rows and prove the gate end to end** - `274fd9f` (feat)

## Files Created/Modified
- `scripts/verify-manifest-literals.mjs` - VER-01 static scan: derived slots, exclusion map, 42-row allowlist, `checkTree` gate, hermetic self-test
- `scripts/verify-platform.sh` - Two new CHECKS rows with the established NEW-plan comment block

## Decisions Made
- Slot-keyed allowlist instead of literal-keyed: the plan's "no literal kept in the checker" success criterion forbids literal keys (the instrument would fail on itself), so entries name the manifest source and resolve the value at check time
- T-06-01 mitigated by construction: zero RegExp built from manifest values (only the indexOf-based reused matcher), values reach output via JSON.stringify alone
- Dual-form files (dev value containing the release value as a substring) carry both slot rows for stale precision

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. Survey before writing found exactly 30 in-scope carrier files (145 scoped of 289 tracked); the trademark-notice slot has zero in-scope occurrences so it carries no allowlist rows, which the non-vacuity rule permits (it guards the table, not each slot).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VER-01 static half landed; CI wiring (06-06) has two labelled rows to consume
- `docs/REBRANDING.md` (06-0X) is pre-excluded as the documenting surface, so writing it cannot redden this gate

## Self-Check: PASSED
- `scripts/verify-manifest-literals.mjs` FOUND, `scripts/verify-platform.sh` rows FOUND
- Commits `5688785`, `274fd9f` FOUND in log, no deletions in either

---
*Phase: 06-two-layer-verification-and-rebranding-docs*
*Completed: 2026-09-04*
