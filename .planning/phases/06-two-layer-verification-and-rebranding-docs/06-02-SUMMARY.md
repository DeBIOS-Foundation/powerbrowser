---
phase: 06-two-layer-verification-and-rebranding-docs
plan: 02
subsystem: verification
tags: [ver-02, runtime-check, branding, manifest-derived, verify-platform]

# Dependency graph
requires:
  - phase: 02-configuration-manifest-and-generator-core
    provides: configuration.toml manifest plus generate.mjs resolveConfig derivation
  - phase: 06-two-layer-verification-and-rebranding-docs
    provides: 06-01 manifest-derived literal scan and slot-keyed allowlist discipline
provides:
  - VER-02 runtime layer: six-surface identity check with manifest-derived expectations, live dev run green
  - manifest-vs-inventory preflight agreement check with planted-disagreement self-test
affects: [06-06-ci-wiring, rebranding-docs, downstream-rebrand]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 6600
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [derive-expectations-from-manifest-at-check-time, line-shape-anchor-for-self-test-plants]

key-files:
  created: []
  modified: [scripts/verify-branding-identity.mjs, scripts/verify-branding-preflight.mjs, scripts/verify-manifest-literals.mjs]

key-decisions:
  - "VARIANTS descriptor keeps structural paths only; every brand value derives from configuration.toml via resolveConfig at check time"
  - "Self-test plants anchor on the display_name line shape, never its value, so the checker stays literal-free"
  - "Preflight section 4 compares manifest-derived identity values against the inventory; the inventory stays the expected side"

patterns-established:
  - "Line-shape anchor: self-test fixtures locate the manifest line by shape (startsWith/endsWith), never by spelling its value"
  - "Manifest-vs-inventory agreement: two independent hand-authored sources concur; disagreement fails naming variant and both values"

requirements-completed: [VER-02]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Six-surface runtime check derives brandFullName, vendor, and basename from configuration.toml and passes live against the dev build"
    requirement: "VER-02"
    verification:
      - kind: manual_procedural
        ref: "node scripts/verify-branding-identity.mjs --variant dev#all six surfaces PASS against objdir/dist/bin/powerbrowser"
        status: pass
    human_judgment: false
  - id: D2
    description: "Scratch manifest with a different display name derives the scratch value through the same path (expectations come from the manifest, not a constant)"
    requirement: "VER-02"
    verification:
      - kind: unit
        ref: "node scripts/verify-branding-identity.mjs --self-test#scratch manifest fault derives the scratch value"
        status: pass
    human_judgment: false
  - id: D3
    description: "Manifest/inventory disagreement goes red naming the variant, the manifest value, and the inventory value"
    requirement: "VER-02"
    verification:
      - kind: unit
        ref: "node scripts/verify-branding-preflight.mjs --self-test#twenty-first plant rejected naming variant and both values"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-09-04
status: complete
---

# Phase 6 Plan 02: VER-02 Runtime Retarget Summary

**Six-surface identity check re-sourced to manifest-derived expectations via resolveConfig, live dev run green, manifest/inventory disagreement proven red**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-04T08:57:02Z
- **Completed:** 2026-09-04T09:01:18Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `scripts/verify-branding-identity.mjs`: VARIANTS descriptor keeps structural paths only; brandFullName per variant (`display_name` + `name_suffix`, the exact emitter composition), machine vendor, and app basename all derive at check time from `configuration.toml` through `resolveConfig`; new `--self-test` (shipped-manifest control + scratch-manifest fault, no build needed); all six surface IDs, exact-equality comparisons, coverage guard, positive controls, and CLI overrides intact
- `scripts/verify-branding-preflight.mjs` section 4: manifest-derived identity values (per-variant brand_full_name, vendor_machine, app_basename) compared against `brand_display_expectations`; fixture carries `configuration.toml`; 21st self-test plant proves disagreement goes red naming variant and both values
- Live dev-variant six-surface run green against `objdir/dist/bin/powerbrowser`; full `--quick` (81 rows) green with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Derive identity expectations from the manifest** - `501f904` (feat)
2. **Task 2: Repoint preflight section 4 at manifest-vs-inventory** - `0e238f1` (feat)
3. **Task 3: Run the retargeted check live against the dev build** - no file edits (live run exposed no defect), no commit

**Plan metadata:** covered by the two task commits above (no separate docs commit yet; SUMMARY commit follows)

## Live Dev-Variant Run (Task 3)

`node scripts/verify-branding-identity.mjs --variant dev` → exit 0, all six surface IDs in `surfacesRun`:

| Surface | Result | Observed vs expected (exact equality) |
|---|---|---|
| executable | PASS | `objdir/dist/bin/powerbrowser` executable, no `firefox` file |
| application-ini | PASS | Name=`powerbrowser`, Vendor=`DeBIOS` (both now manifest-derived) |
| runtime-identity | PASS | sentinel name=`powerbrowser`, vendor=`DeBIOS`, version=`153.1.0esr` |
| brand-full-name | PASS | brand.ftl and brand.properties both `Power Browser Dev` (manifest-derived) |
| desktop-entry | PASS | Name=`Power Browser Dev`, StartupWMClass=`powerbrowser` |
| version | PASS | `--version` = `DeBIOS powerbrowser 153.1.0esr` |

Release-variant drill (staged, not attempted — `objdir-release/` absent, tier-3 build out of scope):

```sh
node scripts/verify-branding-identity.mjs --variant release
```

Prerequisite: a release build at `objdir-release/dist/bin/powerbrowser` (plus its `config.status` and the release branding files, all already in the tree).

## Files Created/Modified
- `scripts/verify-branding-identity.mjs` - Manifest-derived expectations, `--self-test` with control + scratch fault, literal-free (zero `Power Browser` occurrences)
- `scripts/verify-branding-preflight.mjs` - Section 4 manifest-vs-inventory agreement, fixture carries `configuration.toml`, 21st plant
- `scripts/verify-manifest-literals.mjs` - Removed the two now-stale identity-checker allowlist rows (42 → 40 entries)

## Decisions Made
- Descriptor keeps paths, never values: the plan allowed keeping structural paths as declared layout; expected values all derive, so a downstream manifest satisfies the checker with no checker edit
- Line-shape self-test anchor: the first cut spelled `display_name = "Power Browser"` as the scratch needle and 06-01's scan immediately flagged the dev row stale-but-release-fresh asymmetry; anchoring on the line shape instead keeps the checker literal-free and drops both rows
- Preflight compares vendor_machine and app_basename too, not just brand_full_name: all three are identity expectations the checker derives, so all three participate in the agreement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed two stale allowlist rows in verify-manifest-literals.mjs**
- **Found during:** Task 1 (identity checker retarget)
- **Issue:** Removing the hardcoded `brandFullName` values made the `variant-display:dev/release → scripts/verify-branding-identity.mjs` allowlist rows stale; the 06-01 gate fails on stale rows
- **Fix:** Removed both rows (the checker carries no derived literal anymore, verified by grep); reworked the self-test anchor to the line shape so no new literal re-entered
- **Files modified:** scripts/verify-manifest-literals.mjs
- **Verification:** `verify-manifest-literals` PASS (146 files, 111 occurrences all allowlisted, 40 entries all fresh) plus `--self-test` PASS
- **Committed in:** 501f904 (part of task commit)

---

**Total deviations:** 1 auto-fixed (blocking, directly caused by the task's own change)
**Impact on plan:** Consequential cleanup the plan's success criteria require (no stale gate). No scope creep.

## Issues Encountered
None. The live run exposed no defect, so Task 3 made no file edits per the plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VER-02 runtime half landed; CI wiring (06-06) has the retargeted checker plus both self-tests to consume
- Release-variant proof stays a staged drill until a release build exists; the command and prerequisite are recorded verbatim above

## Self-Check: PASSED
- `scripts/verify-branding-identity.mjs` FOUND, `scripts/verify-branding-preflight.mjs` FOUND
- Commits `501f904`, `0e238f1` FOUND in log, no deletions in either
- No stubs, no threat-surface additions (checker-only changes, derived values reach exact-equality comparisons only — T-06-02)

---
*Phase: 06-two-layer-verification-and-rebranding-docs*
*Completed: 2026-09-04*
