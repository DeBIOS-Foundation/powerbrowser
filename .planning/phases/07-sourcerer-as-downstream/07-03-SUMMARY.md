---
phase: 07-sourcerer-as-downstream
plan: 03
subsystem: config
tags: [PB_CONFIG_DIR, adversarial-fixture, VER-03, expect-fail, square-artwork, required-setting]

# Dependency graph
requires:
  - phase: 07-sourcerer-as-downstream (plan 02)
    provides: [synthetic downstream fixture, verify-downstream-fixture.mjs harness with expect-fail path and self-test]
provides:
  - Four adversarial fixtures (spaced-name, late-sort-name, non-square-logo, missing-required-key) at intended outcomes
  - Harness copy-shape fix (case-insensitive re-run next-step assertion)
  - VER-03 never-silently-wrong five-row evidence matrix
affects: [07-04 layers proof (drives --all over this fixture set; will need expect-fail.txt markers)]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 2735
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [single-defect-per-plant fixtures (verbatim manifest clone isolates the failure attribution)]

key-files:
  created: [.planning/phases/07-sourcerer-as-downstream/fixtures/spaced-name/configuration.toml, .planning/phases/07-sourcerer-as-downstream/fixtures/spaced-name/brand/mark.svg, .planning/phases/07-sourcerer-as-downstream/fixtures/late-sort-name/configuration.toml, .planning/phases/07-sourcerer-as-downstream/fixtures/late-sort-name/brand/mark.svg, .planning/phases/07-sourcerer-as-downstream/fixtures/non-square-logo/configuration.toml, .planning/phases/07-sourcerer-as-downstream/fixtures/non-square-logo/brand/mark.svg, .planning/phases/07-sourcerer-as-downstream/fixtures/missing-required-key/configuration.toml, .planning/phases/07-sourcerer-as-downstream/fixtures/missing-required-key/brand/mark.svg]
  modified: [scripts/verify-downstream-fixture.mjs]

key-decisions:
  - "Harness copy-shape fix is case-insensitive matching, not a generator copy change: the generator's two failure shapes are each pinned by its own 41-case self-test"
  - "Fail plants clone the 07-02 manifest verbatim so each fixture carries exactly one defect and the failure attributes to it alone"
  - "No expect-fail.txt markers added: outside this plan's file list, and per-fixture proof belongs to 07-04's --all drive"

patterns-established:
  - "Adversarial fixture shape: invented brand family per pass-fixture, verbatim-clone-plus-one-defect per fail-fixture, original square artwork everywhere except the artwork plant"

requirements-completed: [VER-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Spaced-name and late-sort-name fixtures generate fully branded output with exact bytes on every asserted surface"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "node scripts/verify-downstream-fixture.mjs --source <spaced-name|late-sort-name> (PASS, 66 assertions each)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Non-square-logo and missing-required-key plants fail loudly naming their rule with generated/ untouched"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "node scripts/verify-downstream-fixture.mjs --source <plant> --expect-fail <square|identity.display_name> (PASS, 6 assertions each: non-zero exit, substring, next-step, no stack, snapshot equality)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Harness copy-shape fix: required-setting failures accepted without weakening any red"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "node scripts/verify-downstream-fixture.mjs --self-test (PASS, 9 planted cases all behaved as pinned)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Platform neutral with the downstreams absent"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick (PASS, all checks); generate --self-test (41/41); branding-identity --self-test (PASS); manifest-literals (PASS); residual scan (PASS, 141 files)"
        status: pass
    human_judgment: false

# Metrics
duration: ~5min
completed: 2026-09-04
status: complete
---

# Phase 7 Plan 03: Adversarial Fixtures Summary

**VER-03 hostile half closed: spaced and late-sort names generate byte-exact, non-square art and a missing key fail naming their rule with the tree untouched, five-for-five through the harness**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-04T10:11:43Z
- **Completed:** 2026-09-04T10:16:00Z
- **Tasks:** 3
- **Files modified:** 9 (8 fixture sources plus 1 harness fix)

## Accomplishments
- Spaced-name fixture (Cedar Falls family: two interior spaces, spaceless vendor_machine against spaced vendor_display) and late-sort-name fixture (Zebra family: display/basename/binary/remoting all sorting after m-browser) each drive EXPECTED-PASS green at 66 assertions with zero platform edits
- Non-square-logo plant (128x64 viewBox) refuses naming the square-artwork rule; missing-required-key plant (display_name absent, not blanked) fires the required-setting check naming identity.display_name — both with generated/ snapshot-proven untouched, no stack, plain-words next step
- Found and fixed the one harness gap the plan anticipated (copy-shape casing), re-ran its --self-test 9/9, and re-proved default-mode neutrality end to end

## Never-silently-wrong matrix (VER-03 evidence)

| Fixture | Intended outcome | Proving command | Observed result |
|---|---|---|---|
| sourcerer-equivalent (07-02) | pass, exact bytes | `verify-downstream-fixture.mjs --source` | PASS, 66 assertions |
| spaced-name | pass, spaced bytes exact on shell/desktop/locale/installer | `verify-downstream-fixture.mjs --source` | PASS, 66 assertions |
| late-sort-name | pass, late-sort bytes exact on every surface | `verify-downstream-fixture.mjs --source` | PASS, 66 assertions |
| non-square-logo | fail naming the square-artwork rule, tree untouched | `--source ... --expect-fail square` | PASS, 6 assertions |
| missing-required-key | fail naming identity.display_name, tree untouched | `--source ... --expect-fail identity.display_name` | PASS, 6 assertions |

## Failure copy (for the record)

Both verified live; each names its rule, states the problem in plain words, and ends with the re-run next step:

```
generate: FAIL -- 1 problem(s) in configuration.toml
  - identity.display_name is not set. Open configuration.toml, find the [identity] section, and give display_name a value. Then run: node scripts/generate.mjs
```

```
brand/mark.svg is 128 wide by 64 tall, but every icon must come from square artwork. Replace it with a square logo, then run: node scripts/generate.mjs
```

(The second is the generator's squareness-rule sentence with width=128 height=64 from the planted `viewBox="0 0 128 64"`; the harness asserted its substring, next-step, no-stack, and snapshot-equality properties over 6 assertions.)

## Task Commits

Each task was committed atomically:

1. **Task 1: EXPECTED-PASS adversarial fixtures** - `25a5426` (feat)
2. **Task 2: EXPECTED-FAIL plants plus harness fix** - `b8132ba` (feat)
3. **Task 3: Missing-key square artwork** - `f05fed6` (feat)

**Plan metadata:** docs commit follows (this SUMMARY plus STATE/ROADMAP/REQUIREMENTS updates).

## Files Created/Modified
- `.planning/phases/07-sourcerer-as-downstream/fixtures/spaced-name/configuration.toml` - Cedar Falls hostile-but-valid manifest (two interior spaces, split vendor pair)
- `.planning/phases/07-sourcerer-as-downstream/fixtures/spaced-name/brand/mark.svg` - Original triangle-ring square artwork
- `.planning/phases/07-sourcerer-as-downstream/fixtures/late-sort-name/configuration.toml` - Zebra hostile-but-valid manifest (post-m-browser sort names)
- `.planning/phases/07-sourcerer-as-downstream/fixtures/late-sort-name/brand/mark.svg` - Original stripes square artwork
- `.planning/phases/07-sourcerer-as-downstream/fixtures/non-square-logo/configuration.toml` - Verbatim 07-02 clone (defect isolated to artwork)
- `.planning/phases/07-sourcerer-as-downstream/fixtures/non-square-logo/brand/mark.svg` - Planted 128x64 viewBox defect
- `.planning/phases/07-sourcerer-as-downstream/fixtures/missing-required-key/configuration.toml` - Verbatim 07-02 clone minus identity.display_name
- `.planning/phases/07-sourcerer-as-downstream/fixtures/missing-required-key/brand/mark.svg` - Original hexagon-ring square artwork (failure attributes to the key alone)
- `scripts/verify-downstream-fixture.mjs` - Case-insensitive re-run next-step assertion plus contract-comment note (harness gap fix)

## Decisions Made
- Fixed the harness, not the generator copy: the generator's `Then run:` (required-setting) vs `then run:` (artwork) casings are each pinned by its own 41-case self-test, so the check that must accept both shapes is the harness's. One-line regex change plus contract-comment note.
- Fail plants clone the 07-02 manifest verbatim (same Northlight values) rather than inventing new families: each fixture then carries exactly one defect, so a red can only attribute to the plant. New families would have added unproven values to a failure path.
- Sort-position note: the machine-sortable keys (`zebra-browser`, `zebra`) sort after `m-browser` byte-wise; the display form (`Zebra Browser`) sorts after case-insensitively — byte-wise an uppercase Z precedes lowercase m, which is itself why a position-sensitive consumer would mishandle it, and the exact-bytes assertions would go red.
- No `expect-fail.txt` markers added: outside this plan's file list, and per-fixture expectations under `--all` belong to 07-04's drive. Flagged under Next Phase Readiness instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Harness re-run next-step assertion rejected the generator's canonical required-setting shape**
- **Found during:** Task 2 (missing-required-key drive went red on copy shape, not on outcome)
- **Issue:** The expect-fail path asserted `stderr.includes('then run:')` (lowercase t), but required-setting failures use capital-T `Then run:` while artwork failures use lowercase. The missing-key failure was exactly the intended text and still failed the drive — a harness gap of the exact kind the plan named.
- **Fix:** Case-insensitive `/then run:/i` match plus a contract-comment note recording the two canonical casings. Generator copy untouched.
- **Files modified:** scripts/verify-downstream-fixture.mjs
- **Verification:** Harness --self-test PASS (9/9, so no red was weakened), both expect-fail drives PASS (6 assertions each)
- **Committed in:** b8132ba (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The anticipated harness-gap fix, inside this task's explicit scope. No scope creep; no generator or platform behavior changed.

## Issues Encountered
- `gsd_run windows append` for the deviation ledger entry refused to write: pre-existing ledger inconsistency (`frontmatter open/waived/fixed/total=5/0/16/21 but entries yield 7/0/14/21`). Reconciling those counts is outside this plan's scope, so the entry is recorded here instead of the ledger. No stub, skipped test, or unrun verify exists in this plan — the deviation is fixed and verified, not an open defect.

## Threat Flags
None — no new surface beyond the plan's `<threat_model>`. T-07-04 mitigated (exact-equality harness assertions per surface green on both hostile-but-valid fixtures, including the shell double-quoted assignment and both locale files per variant); T-07-05 mitigated (squareness rule refuses before any write; harness snapshot proves generated/ byte-identical). The harness fix touches only a failure-message predicate, never a value flow.

## Known Stubs
None — stub-pattern scan over the nine new/modified files is clean (no empty values flowing to render, no placeholder text, no TODO/FIXME).

## User Setup Required
None - no external service configuration required. Fixture artwork is synthetic test data; no human-review ritual applies.

## Next Phase Readiness
- 07-04 drives `--all` over the fixture set: the two fail fixtures will need `expect-fail.txt` markers (`square` and `identity.display_name` respectively) added under that plan's file list — deliberately not added here.
- Pre-existing workspace modifications (M .planning/config.json, M 01-VERIFICATION.md, assorted untracked planning files) are not from this plan and were left untouched.

---
*Phase: 07-sourcerer-as-downstream*
*Completed: 2026-09-04*

## Self-Check: PASSED
- All created files verified present (8 fixture sources; harness modification in b8132ba)
- Task commits verified present (`25a5426`, `b8132ba`, `f05fed6`); no commit contains file deletions
- Five-row matrix all PASS (66/66/66/6/6 assertions), generate --self-test 41/41, branding-identity --self-test PASS, manifest-literals PASS, full --quick PASS, residual scan PASS over 141 files
