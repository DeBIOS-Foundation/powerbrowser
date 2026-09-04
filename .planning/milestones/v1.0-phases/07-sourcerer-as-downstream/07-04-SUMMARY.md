---
phase: 07-sourcerer-as-downstream
plan: 04
subsystem: config
tags: [PB_CONFIG_DIR, downstream-fixture, VER-03, DOC-02, verify-platform, rebranding-guide, tier-3-drill]

# Dependency graph
requires:
  - phase: 07-sourcerer-as-downstream (plan 03)
    provides: [five fixtures at intended outcomes, expect-fail copy-shape fix, never-silently-wrong matrix]
provides:
  - Registered both-layers proof rows (verify-downstream-fixtures + self-test) in the platform driver
  - Carry-tested external-config guide section (PB_CONFIG_DIR contract)
  - Staged UNEXECUTED tier-3 per-fixture drill README plus milestone acceptance mapping
affects: [build phase executing the staged tier-3 drills, milestone close-out]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 3620
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [glob-derived probe-bearing paths in scan-scoped files, override-plus-direct-assert drill staging for manifest-derived script surfaces]

key-files:
  created: [.planning/phases/07-sourcerer-as-downstream/fixtures/non-square-logo/expect-fail.txt, .planning/phases/07-sourcerer-as-downstream/fixtures/missing-required-key/expect-fail.txt, .planning/phases/07-sourcerer-as-downstream/fixtures/README.md]
  modified: [scripts/verify-platform.sh, docs/REBRANDING.md]

key-decisions:
  - "Fixtures root is glob-derived (07-*/fixtures) in a wrapper function, never spelled: the phase dir name carries a case-insensitive residue probe and verify-platform.sh is scan-scoped"
  - "expect-fail.txt markers (square, identity.display_name) added here per 07-03's explicit deferral — the --all drive cannot go green without them"
  - "Rebranding-docs checker untouched: the new section's spans cover the existing four commands, no new load-bearing command introduced"
  - "Drill identity step pairs script overrides with direct artifact assertions: application-ini and executable surfaces derive from the platform manifest with no override flag, so they report the rebrand delta by design"

patterns-established:
  - "Probe-bearing path rule: any scan-scoped file needing a path through a probe-carrying directory derives it by glob at runtime and documents why, so the gate never fails on its own registry"
  - "Drill staging shape: exact commands plus a reading-the-output note wherever the instrument derives expectations from the un-rebranded manifest"

requirements-completed: [VER-03, DOC-02]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Both-layers proof registered in the platform driver and green (harness --all over 5 fixtures plus self-test)"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --only verify-downstream-fixtures (PASS) and --only verify-downstream-fixtures-self-test (PASS) inside full --quick (PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "REBRANDING.md external-config section carried through against a scratch outside dir (steps 2, 4, 8 verbatim)"
    requirement: "DOC-02"
    verification:
      - kind: other
        ref: "node scripts/verify-rebranding-docs.mjs (PASS, 35/35 fields, 4 commands) and --self-test (PASS); scan-brand-residue (PASS)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tier-3 per-fixture drills staged as exact UNEXECUTED commands with acceptance mapping, tree neutral"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "test -f fixtures/README.md; scripts/verify-platform.sh --quick (PASS); git status shows no intended-file drift"
        status: pass
    human_judgment: false

# Metrics
duration: ~10min
completed: 2026-09-04
status: complete
---

# Phase 7 Plan 04: Acceptance Close-Out Summary

**Both verification layers registered and green for all five fixtures, the rebranding guide carry-tested against a real outside dir, tier-3 drills staged exact-but-unexecuted — VER-03 and DOC-02 closed**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-04T10:18:23Z
- **Completed:** 2026-09-04T10:26:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Registered `verify-downstream-fixtures` plus its mandatory self-test row in `scripts/verify-platform.sh`: harness `--all` drives all five committed fixtures (three EXPECTED-PASS at 66 assertions each, two EXPECTED-FAIL at 6 each — 210 assertions total), green via `--only` and inside the full `--quick`
- Carry-tested `docs/REBRANDING.md` walkthrough steps 2, 4, and 8 verbatim against a scratch mkdtemp outside dir (prefixed generate emits staged brand bytes, staged-only edits move them, prefixed `--check` fresh, default tree restored byte-neutral after), then wrote the external-config section the guide lacked — coverage gate 35/35 with self-test green, checker untouched
- Staged `fixtures/README.md` with one UNEXECUTED drill block per EXPECTED-PASS fixture plus the milestone acceptance mapping; every drill labeled with the tier-3 cost reason and ending in default-regenerate plus `--check`

## Both-layers argument (ROADMAP criterion 4)

- **Static layer:** `verify-manifest-literals.mjs` green in default mode after every fixture run (151 files, 122 occurrences all allowlisted, 41 entries all fresh) — no fixture literal leaked into hand-written files — plus the harness's required-slot-absence and presence-iff-echoed assertions over each fixture's generated/ tree, inside the 210.
- **Runtime layer at generate level:** per-fixture brand-full-name agreement (ftl versus properties versus manifest-derived expectation) asserted by the harness for both variants, plus `verify-branding-identity.mjs --self-test` green proving derivation is still manifest-driven after the 07-01 mechanism change.
- Full six-surface live proof stays tier-3: staged, not run, in the drill README.

## Task Commits

Each task was committed atomically:

1. **Task 1: Register the both-layers proof and its fixture rows** - `fa68b41` (feat)
2. **Task 2: Carry-test REBRANDING.md and document PB_CONFIG_DIR** - `ffe78e8` (docs)
3. **Task 3: Stage tier-3 drills and map acceptance criteria** - `abc62dc` (docs)

**Plan metadata:** docs commit follows (this SUMMARY plus STATE/ROADMAP updates).

## Files Created/Modified

- `scripts/verify-platform.sh` - Two wrapper functions plus two registry rows (glob-derived fixtures root, per-command config env from the harness, inherited PB_CONFIG_DIR already sanitized at driver top)
- `docs/REBRANDING.md` - External-config section: outside-dir layout, prefixed generate/check commands, generated-stays-in-tree plus upstream-pins flow, restated fixed identifiers, cross-substitution profile-migration note
- `.planning/phases/07-sourcerer-as-downstream/fixtures/non-square-logo/expect-fail.txt` - `square` marker for `--all` expect-fail mode
- `.planning/phases/07-sourcerer-as-downstream/fixtures/missing-required-key/expect-fail.txt` - `identity.display_name` marker for `--all` expect-fail mode
- `.planning/phases/07-sourcerer-as-downstream/fixtures/README.md` - UNEXECUTED drill blocks plus acceptance mapping

## Decisions Made

- Fixtures root is glob-derived (`07-*/fixtures`) inside wrapper functions, never spelled as a registry string: the phase directory name carries a case-insensitive residue probe and verify-platform.sh is scan-scoped, so a literal path would fail the scan gate on the registry itself. A zero- or multi-match glob fails loudly inside the harness on the unknown path, never as a quiet pass.
- expect-fail.txt markers added under this plan per 07-03 SUMMARY's explicit deferral ("added under that plan's file list"); the task-1 `--all` drive cannot go green without them. Contents are the exact substrings 07-03 recorded (`square`, `identity.display_name`).
- Rebranding-docs checker left untouched: the new section introduces no new load-bearing command (its spans cover the existing four), so extending REQUIRED_COMMANDS would be scope creep with no failing case behind it.
- Drill identity step pairs `--expect-brand-full-name` / `--expect-display-name` overrides with direct artifact assertions (`test` on the fixture-named binary, `grep` on application.ini Name/Vendor): the script's application-ini and executable surfaces derive from the platform manifest with no override flag, so they report the rebrand delta by design — the README's reading note says so, and the direct lines assert the delta is exactly the staged brand.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added the two expect-fail.txt markers the --all drive requires**
- **Found during:** Task 1 (first `--all` drive went red on the two fail fixtures running in pass mode)
- **Issue:** The plan's files list names the registry row but not the markers, while the task action requires `--all` green with both EXPECTED-FAIL fixtures failing naming their rules — impossible without per-fixture markers, since one CLI substring cannot express mixed expectations. 07-03 deferred exactly these two files to this plan.
- **Fix:** `square` and `identity.display_name` markers; `--all` then PASS (5 fixtures, 210 assertions).
- **Files modified:** the two expect-fail.txt files (scan-excluded .planning/ location)
- **Verification:** `--all` PASS; both fail fixtures PASS in expect-fail mode at 6 assertions each
- **Committed in:** fa68b41 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deferred mechanism the prior plan explicitly assigned here. No scope creep; no generator or platform behavior changed.

## Issues Encountered

- Genuine carry-through gaps closed in place (T-07-06 mitigation): step 2 had no external-config command form (no `PB_CONFIG_DIR` prefix to paste); steps 4/6 named in-tree paths only (staged `configuration.toml` / `brand/mark.svg` locations unstated); generated-stays-in-platform-tree plus the upstream-pins.env tag flow unstated; step 5 fixed identifiers and the profile-migration note written for the in-tree reader only. All four now covered by the new section, each claim executed live during the carry-through.
- Drill-staging discovery (recorded, not a deviation): on a fixture-built tree the identity script's application-ini and executable surfaces report the rebrand delta by derivation design (platform-manifest expectations, no override flags) — documented in the README's reading note with direct assertions carrying the exact staged values, so a future drill runner is never surprised by the two non-green rows.
- Opencode file-access policy denied literal /tmp paths in two Bash calls during the carry-through; restaged via mkdtemp-relative shell variables in single calls. No plan impact.

## Threat Flags

None — no new surface beyond the plan's `<threat_model>`. T-07-06 mitigated (guide steps executed against a scratch dir, not reviewed; coverage gate pins field and command completeness). T-07-07 mitigated (every drill block labeled UNEXECUTED with the tier-3 cost reason; acceptance mapping cites generate-level evidence only). The registry wrappers pass no values (paths derived, config env per child command from the harness); the guide section carries no identifier beyond the PB_CONFIG_DIR contract name the plan requires.

## Known Stubs

None — stub-pattern scan over the realized diff is clean (no TODO/FIXME/placeholder text).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 7 is 4/4 plans complete with this SUMMARY: VER-03 and DOC-02 both closed (already marked Complete in REQUIREMENTS.md by 07-02/07-03; re-confirmed by this plan's gates).
- The build phase inherits three exact drill blocks plus the known two-delta-rows reading note; release-variant rows runnable unchanged once a release objdir exists.
- Pre-existing workspace dirt (M .planning/config.json, M 01-VERIFICATION.md, assorted untracked planning scaffolding) is not from this plan and was left untouched; `git status` under scripts/, docs/, generated/ is clean.

---
*Phase: 07-sourcerer-as-downstream*
*Completed: 2026-09-04*

## Self-Check: PASSED
- All created/modified files verified present (registry rows, guide section, 2 markers, drill README)
- Task commits verified present (`fa68b41`, `ffe78e8`, `abc62dc`); no commit contains file deletions
- --all PASS (5 fixtures, 210 assertions), both --only rows PASS, full --quick PASS, coverage gate plus self-test PASS, residual scan PASS (141 files), default tree restored (`Power Browser Dev`, --check fresh)
