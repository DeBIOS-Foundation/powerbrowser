---
phase: 05-hook-only-patches-and-upstream-uptake
plan: "02"
subsystem: patches
tags: [upstream-pins, esr-tag, generate, fetch-upstream, rebase-upstream, pin-agreement, CFG-06, UPD-01]

# Dependency graph
requires:
  - phase: 03-firefox-branding-emitter-and-icon-pipeline
    provides: generated/ fragment layout and TARGETS-row conventions
  - phase: 05-hook-only-patches-and-upstream-uptake
    provides: 05-01 hook-only stack and brand-value gate precedent
provides:
  - Single-sourced ESR pin ([upstreams] firefox_esr_tag + schema + emitter)
  - generated/upstream-pins.env shell fragment consumed by fetch
  - Pin-agreement check with planted-fault self-test and registry rows
affects: [05-03, 05-04]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 7596
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [manifest pin with shell-fragment carrier, parse-don't-execute default resolution, tag-literal sweep with path allowlist]

key-files:
  created:
    - scripts/verify-upstream-pins.mjs
  modified:
    - configuration.toml
    - scripts/lib/config-schema.json
    - scripts/generate.mjs
    - scripts/fetch-upstream.sh
    - scripts/rebase-upstream.sh
    - .github/workflows/rebase-upstream.yml
    - scripts/verify-platform.sh
    - scripts/verify-extension-pins.mjs

key-decisions:
  - "Pin is schema-required (masked from defaults): a downstream inherits no ESR tag silently, it must state its own"
  - "Fragment row carries no tracked comparand, same as the theia/endpoint fragments: the tag is derived, never hand-written"
  - "Tag-literal shape is FIREFOX_-plus-digit: reader names (FIREFOX_ESR_TAG, FIREFOX_BIN, FIREFOX_BRANDING_*) carry letters there"
  - "Sweep fixtures live only in the checker (path-excluded); generate.mjs and extension-pins fixtures use a shape-valid Acme pin"
  - "Absent fragment SKIPs the fragment steps but the sweep, manifest, workflow and fetch-parse steps still run"

patterns-established:
  - "Pin fragment carrier: [upstreams] value emitted as one KEY=value shell assignment with its own banner (no copy step exists, so no GENERATED_BANNER)"
  - "Agreement by parsing: fetch's effective default resolved from script text (sources fragment + no literal), never by executing the clone path"

requirements-completed: [UPD-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "ESR pin declared once in configuration.toml with schema validation and generated shell fragment"
    requirement: "UPD-01"
    verification:
      - kind: other
        ref: "node scripts/generate.mjs && node scripts/generate.mjs --check (52 files, green)"
        status: pass
      - kind: other
        ref: "node scripts/generate.mjs --self-test (39 cases green)"
        status: pass
      - kind: other
        ref: "unset-pin resolveConfig probe fails naming upstreams.firefox_esr_tag; glob probe fails naming the char class"
        status: pass
    human_judgment: false
  - id: D2
    description: "fetch, rebase and workflow consume the single pin with no hardcoded literal in fetch"
    requirement: "UPD-01"
    verification:
      - kind: other
        ref: "bash scripts/fetch-upstream.sh --self-test"
        status: pass
      - kind: other
        ref: "bash scripts/rebase-upstream.sh --tag <manifest-pin> --dry-run (exit 0, tag-existence gate only network)"
        status: pass
      - kind: other
        ref: "missing-fragment run fails naming fragment+rerun; TAG= override proven against live upstream/"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pin-agreement check green on shipped tree, red on both planted faults, registered in the driver"
    requirement: "UPD-01"
    verification:
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs"
        status: pass
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs --self-test (mirror drift + second literal, clean control)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full static gate set green including the two new rows"
    requirement: "UPD-01"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick (77 row PASS, 0 FAIL)"
        status: pass
      - kind: other
        ref: "node scripts/scan-brand-residue.mjs (PASS, counts unmoved)"
        status: pass
    human_judgment: false

# Metrics
duration: 6min
completed: 2026-09-04
status: complete
---

# Phase 05 Plan 02: Single-Source ESR Pin Summary

**Firefox ESR tag declared once in configuration.toml, fanned out through a generated shell fragment to fetch/rebase/workflow, guarded by a pin-agreement check that goes red on mirror drift or a second literal**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-09-04T08:13:05Z
- **Completed:** 2026-09-04T08:19:22Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- `[upstreams] firefox_esr_tag` in the manifest (live pin, unbumped), schema-required with the rebase plain-tag-name char class, emitted as `generated/upstream-pins.env`
- `fetch-upstream.sh` sources the fragment for its TAG default (explicit export still wins, HEAD-vs-tag logic untouched); missing fragment fails naming the rerun; hardcoded literal gone
- `verify-upstream-pins.mjs`: four-way agreement (manifest/fragment/workflow-mirror/fetch-parse) plus an in-scope literal sweep, with a two-fault self-test; registered beside the fetch rows
- Full `--quick` green: 77 row PASS, 0 FAIL (75 + 2 new rows); residue scan PASS with no count moves

## Task Commits

Each task was committed atomically:

1. **Task 1: Declare [upstreams] firefox_esr_tag in manifest, schema, and generator** - `476afdf` (feat)
2. **Task 2: Rewire fetch, rebase, and workflow to consume the single pin** - `f3a14ed` (feat)
3. **Task 3: Add the pin-agreement check and register it** - `fd7aaa3` (feat)

**Plan metadata:** final docs commit follows (gsd-tools query commit)

## Files Created/Modified
- `configuration.toml` - New `[upstreams]` section carrying the live ESR tag, with the single-source comment
- `scripts/lib/config-schema.json` - `upstreams.firefox_esr_tag`: required, `^[A-Za-z0-9._-]+$`; Acme-shaped example (a real tag literal here would trip the new sweep)
- `scripts/generate.mjs` - `emitUpstreamPins` + banner + TARGETS row (no comparand, fragment convention); fixture base carries a shape-valid Acme pin; target count 51->52 in four count comments
- `generated/upstream-pins.env` - Emitted (git-ignored): banner + `FIREFOX_ESR_TAG=<pin>`
- `scripts/fetch-upstream.sh` - Fragment-sourced TAG default, explicit-export override, missing-fragment hard fail, literal removed
- `scripts/rebase-upstream.sh` - Dry-run/echo prose names the manifest pin, not a default
- `.github/workflows/rebase-upstream.yml` - Literal input default kept as a check-covered mirror with the manifest-authoritative comment
- `scripts/verify-upstream-pins.mjs` - NEW: agreement check + self-test
- `scripts/verify-platform.sh` - `verify-upstream-pins` + self-test rows beside the fetch row
- `scripts/verify-extension-pins.mjs` - Synthetic fixture states the new required key (Rule 3 fix, see deviations)

## Decisions Made
- Pin is schema-`required: true`, so D-06 masking strips it from the defaults layer: a downstream that omits `[upstreams]` hard-fails rather than silently building Power Browser's ESR. A pin is identity-class, not a cosmetic default.
- Fragment TARGETS row has no `tracked` comparand, exactly like the theia/endpoint fragments: the tag is derived from the manifest, there is no hand-written original, and `--check` still covers the row through the frozen table. `verify-generated-identity.mjs` EXPECTED needed no change (verified: byte-identity row green untouched).
- Tag-literal shape is `FIREFOX_` plus a digit. A bare-prefix match would flag the legitimate readers (`FIREFOX_ESR_TAG`, `FIREFOX_BIN`, `FIREFOX_BRANDING_*`), and a gate that fires on its own machinery trains readers to ignore it.
- Tag-shaped fixture values live ONLY in the checker (which excludes itself from the sweep by path, per the plan's success criterion). `generate.mjs` FIXTURE_BASE and the extension-pins synthetic manifest use `ACME_1_2_3esr_RELEASE`: shape-valid, obviously a fixture, sweep-clean.
- Absent fragment skips only the fragment-equality step; manifest derivation, workflow parse, fetch parse and the sweep still run, so a fresh clone stays green without losing the checks that need no generated tree.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extension-pins synthetic fixture went red on the new required key**
- **Found during:** Task 3 (registry verification -- its self-test is a `--quick` row)
- **Issue:** `verify-extension-pins.mjs --self-test` builds a full synthetic manifest with no `[upstreams]` section; the new required key made its green control red (`upstreams.firefox_esr_tag is not set`), which would have failed `--quick`
- **Fix:** Added `[upstreams] firefox_esr_tag = "ACME_1_2_3esr_RELEASE"` to the synthetic manifest -- the Acme form keeps the in-scope file sweep-clean
- **Files modified:** scripts/verify-extension-pins.mjs
- **Verification:** Its `--self-test` and main check both PASS again
- **Committed in:** fd7aaa3 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the plan's own done criteria (green `--quick`). No scope creep: no behavior change, fixture-only edit. Telemetry/branding checkers needed nothing -- their fixtures derive from the shipped manifest and inherit the new section.

## Issues Encountered
- None. Network was available, so the rebase `--dry-run` tag-existence gate ran live (exit 0); no clone was triggered.

## Single-Source Proof (plan verification item 4)
- The tag literal appears in exactly: `configuration.toml` (authoritative), `generated/upstream-pins.env` (derived fragment, git-ignored), `.github/workflows/rebase-upstream.yml` (check-covered mirror)
- The checker itself carries zero tag literals (neighbour derived at runtime); every other in-scope tracked file is sweep-clean per the green check

## Known Stubs
None - stub-pattern grep over all created/modified files is clean (`NEW_TAG=""` is a legitimate init, not a stub).

## Threat Flags
None - no new network endpoints, auth paths, or schema changes at trust boundaries. T-05-03 mitigated: the manifest-to-fetch chain stays local-trusted-input (fragment is manifest-derived bytes), the agreement check fails loudly on mirror drift, and fetch keeps its HEAD-vs-tag hash comparison byte-identical. T-05-04 transferred per plan (ls-remote existence gate + 05-04 operator baseline diff).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UPD-01 wiring complete and statically proven; the live bump drill (05-04) runs through this wiring: edit one pin, regenerate, fetch, replay
- CFG-06 ESR half complete; Theia half is plan 05-03, which follows the same fragment pattern established here
- No blockers

## Self-Check: PASSED
- All created files exist on disk (checker, fragment, manifest section, schema key, registry rows).
- All task commits exist: 476afdf, f3a14ed, fd7aaa3.

---
*Phase: 05-hook-only-patches-and-upstream-uptake*
*Completed: 2026-09-04*
