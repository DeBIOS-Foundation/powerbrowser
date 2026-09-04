---
phase: 03-firefox-branding-emitter-and-icon-pipeline
plan: 02
subsystem: branding
tags: [inkscape, png, ico, icns, node, generator]

# Dependency graph
requires:
  - phase: 03-firefox-branding-emitter-and-icon-pipeline (plan 03-01)
    provides: [TARGETS table precedent, branding-dir agreement gate, emitted branding/<variant> drop-in dirs]
  - phase: 02-configuration-manifest-and-generator-core
    provides: [generator core, byte-identity gate, generate --check / --self-test harness]
  - phase: 01-platform-extraction-and-rename
    provides: [ten hand-rasterized PNGs under powerbrowser/branding as byte comparands]
provides:
  - Icon pipeline: ten IHDR-exact PNGs per emit plus real firefox.ico / firefox.icns per variant from the single brand/mark.svg source
  - Registry rows icon-ihdr and icon-ihdr-self-test gating the icon output inside --quick
affects: [03-04 (tier-3 build consumes the rasters; GEN-02 shared and gated), GEN-03 v2 PKG-01 (macOS-host ICNS rendering explicitly deferred)]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 15000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-Node binary container writers (ICO/ICNS) with zero new packages, inkscape argv-array spawn with frozen size array, IHDR readUInt32BE dimension assertion]

key-files:
  created: [scripts/verify-icon-ihdr.mjs]
  modified: [scripts/generate.mjs, scripts/verify-generated-identity.mjs, scripts/verify-platform.sh]

key-decisions:
  - "Dev and release rasters are byte-identical yet written as ten separate files with no shared cache entry — neither variant reads the other's bytes"
  - "ICO/ICNS TARGETS rows carry no tracked comparand — no hand-written originals exist; the agreement gate covers them from the frozen table"
  - "macOS-host ICNS rendering stays deferred to v2 PKG-01 per GEN-03; this plan guarantees structural validity only"

patterns-established:
  - "Squareness pre-check parses brand/mark.svg viewBox and hard-fails naming the asset and the rule — never stretches, letterboxes, or substitutes"
  - "Registry check mirrors the generated icon set into mkdtemp, holds control green first, then plants one mutation per fault case"

requirements-completed: [GEN-02]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Ten PNG rasters (default16/32/48/64/128 per variant) emitted from brand/mark.svg with IHDR dimensions exactly N by N and byte-identical to the tracked Phase 1 rasters"
    requirement: "GEN-02"
    verification:
      - kind: other
        ref: "task-1 IHDR loop: readUInt32BE(16/20) === N for all five dev sizes"
        status: pass
      - kind: other
        ref: "node scripts/verify-generated-identity.mjs → 33/33 byte-identical"
        status: pass
    human_judgment: false
  - id: D2
    description: "Real firefox.ico (3-entry 16/32/48) and firefox.icns (ic07/icp5/icp4 chunks) per variant with structurally valid headers and payload-identity to the rasters"
    requirement: "GEN-02"
    verification:
      - kind: other
        ref: "task-2 header probe: ICO 0/1/3 LE fields, ICNS magic plus length field === file length, both variants"
        status: pass
      - kind: other
        ref: "node scripts/generate.mjs --self-test → 20/20 incl. truncated-ICO and wrong-magic ICNS red cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "Icon registry check (icon-ihdr plus icon-ihdr-self-test) green on the real tree and red on each planted fault, both rows passing singly and inside --quick"
    requirement: "GEN-02"
    verification:
      - kind: other
        ref: "node scripts/verify-icon-ihdr.mjs → PASS on real tree"
        status: pass
      - kind: other
        ref: "node scripts/verify-icon-ihdr.mjs --self-test → control green then 3 planted faults red naming file"
        status: pass
      - kind: other
        ref: "scripts/verify-platform.sh --quick → PASS including both new rows"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-09-04
status: complete
---

# Phase 03 Plan 02: Icon Pipeline Summary

**Five exact PNG rasters per variant from brand/mark.svg via inkscape, pure-Node firefox.ico/firefox.icns writers, and an IHDR plus container registry check — all green inside --quick**

## Performance

- **Duration:** 8 min (verification and close-out; implementation landed in the prior session 2026-09-03 ~21:00-21:07 local)
- **Started:** 2026-09-04T04:04:00Z
- **Completed:** 2026-09-04T04:12:31Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- rasterizeIcons step emits default16/32/48/64/128 PNGs per variant from the single brand/mark.svg source, IHDR-exact and byte-identical to the ten tracked Phase 1 rasters
- emitFirefoxIco and emitFirefoxIcns write real Windows/macOS containers with zero new packages, payloads byte-identical to the just-rasterized buffers
- scripts/verify-icon-ihdr.mjs gates PNG signature plus IHDR, ICO reserved/type/count with per-entry payload slices, and ICNS magic plus chunk-chain lengths, with a control-green-first self-test
- Registry rows icon-ihdr and icon-ihdr-self-test appended with NEW (03-02) provenance, both honestly --quick

## Task Commits

Each task was committed atomically (tasks 2-3 landed in the prior session; this session verified all three green and closed out):

1. **Task 1: Rasterize five exact PNG sizes per variant from brand/mark.svg** - `633976e` (feat)
2. **Task 2: Pure-Node firefox.ico and firefox.icns writers** - `83646b1` (feat)
3. **Task 3: Icon registry check plus rows** - `e66f59c` (feat)

**Plan metadata:** committed as `docs(03-02)` (see git log following this SUMMARY's commit)

## Files Created/Modified
- `scripts/generate.mjs` - rasterizeIcons step with squareness/presence guards, emitFirefoxIco, emitFirefoxIcns, fourteen new TARGETS rows
- `scripts/verify-icon-ihdr.mjs` - New: IHDR plus ICO/ICNS magic-and-length check with --self-test (412 lines)
- `scripts/verify-generated-identity.mjs` - Byte-identity gate extended to the icon rows (untracked ICO/ICNS rows skipped by design)
- `scripts/verify-platform.sh` - icon-ihdr and icon-ihdr-self-test registry rows

## Decisions Made
- Dev and release rasters are byte-identical yet written as ten separate files with no shared cache entry — neither variant reads the other's bytes (plan assumption 1, kept as designed)
- ICO/ICNS TARGETS rows carry no tracked comparand — no hand-written originals exist; the agreement gate covers them from the frozen table
- macOS-host ICNS rendering stays deferred to v2 PKG-01 per GEN-03; this plan guarantees structural validity only
- Resume divergence: the recovery prompt expected only task 1 committed, but 83646b1 and e66f59c already landed all of tasks 2-3; re-running their full <verify> suites green was adopted as evidence instead of manufacturing duplicate commits

## Deviations from Plan

None - plan executed exactly as written. (The resume-state divergence above is a process note, not a code deviation: no implementation differed from the plan, and every <verify> plus acceptance criterion passed on the landed commits.)

## Issues Encountered
- Stale resume state: the recovery prompt directed fresh execution of tasks 2-3, but both were already committed and green. Resolved by verifying rather than redoing — no code changed, no extra commits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GEN-02 emission fully checked short of the human visual; the rendered-pixel check ("shows the downstream icon in launcher, window, desktop entry") is carried by plan 03-04's build task under end-of-phase mode
- GEN-02 REQUIREMENTS.md marking is gated: the ID is shared with 03-04 (no SUMMARY yet), so ready-ids blocks it until 03-04 closes
- Ready for 03-03 (Windows/macOS installer schema emitters)

## Self-Check: PASSED
- scripts/verify-icon-ihdr.mjs exists on disk; scripts/generate.mjs contains rasterizeIcons, emitFirefoxIco, emitFirefoxIcns
- git log confirms 633976e, 83646b1, e66f59c
- All three task <verify> suites re-run green in this session; scripts/verify-platform.sh --quick PASS

---
*Phase: 03-firefox-branding-emitter-and-icon-pipeline*
*Completed: 2026-09-04*
