---
phase: 08-installer-hardening-canonical-rename
plan: "01"
subsystem: installer
tags: [nsis, rename, branding, generator, verify-platform, byte-identity]

# Dependency graph
requires:
  - phase: 07-sourcerer-as-downstream
    provides: [downstream fixture harness whose archived root the quick gate resolves]
provides:
  - WR-04 bare-dollar NSIS sink guard with discriminating self-test twins
  - WR-07 fixture-rooted tile check with divergent-manifest plants in both polarities
  - Canonical identity.display_name PowerBrowser fanned out through emitter, comparands, and re-pinned gates
  - Green generate --check, byte-identity gate, residue scan, and full --quick on the renamed tree
affects: [08-02 rename follow-through, PKG-01 packaging proofs, BLD-01 release rows, GUI live checks]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 22000
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [sink-guard rejection-only extension, fixture-root threading, spaceless-join absence needle, single-token derivation skip]

key-files:
  created: []
  modified: [scripts/generate.mjs, scripts/verify-installer-schema.mjs, scripts/verify-branding-preflight.mjs, scripts/verify-manifest-literals.mjs, scripts/verify-platform.sh, scripts/check-patch-surface.sh, configuration.toml, inventory/brand-tokens.json]

key-decisions:
  - "Downstream-fixtures fallback glob: v1.0 archival moved the 07 fixtures, so the check falls back to the milestones archive root"
  - "Section-6 leak needle re-scoped from bare identifier to per-variant spaceless join derived from inventory full names"
  - "Manifest-literals derives multi-word literals only; single-token values are boundary-indistinguishable from identifier text"
  - "Legal/trademark copy frozen out of the slice: notice, LICENSE, and user-facing strings keep the spaced form for 08-02"

patterns-established:
  - "Spaceless-join absence needle: when display equals identifier, assert the under-spaced join derived per variant, never the bare form"
  - "Single-token derivation skip: values without whitespace are not boundary-scannable; pin their carriers exactly elsewhere"
  - "Census recount by independent read: new expected_counts measured from the files' intended content, never copied from a check run"

requirements-completed: [PKG-03, NAME-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Bare dollar-name in installer-bound values rejected at emission naming the key; doubled-dollar escape still emits"
    requirement: "PKG-03"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --self-test#hostile bare dollar-name in support URL"
        status: pass
      - kind: unit
        ref: "node scripts/generate.mjs --self-test#escaped doubled dollar in support URL still emits"
        status: pass
    human_judgment: false
  - id: D2
    description: "Installer verifier reads the fixture-root manifest; divergent tile states go red in both polarities"
    requirement: "PKG-03"
    verification:
      - kind: unit
        ref: "node scripts/verify-installer-schema.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D3
    description: "Canonical display value fanned out with byte-identity green and identity pins frozen"
    requirement: "NAME-01"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --check"
        status: pass
      - kind: unit
        ref: "node scripts/verify-generated-identity.mjs"
        status: pass
      - kind: unit
        ref: "node scripts/scan-brand-residue.mjs"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false

# Metrics
duration: 31min
completed: 2026-09-05
status: complete
---

# Phase 08 Plan 01: WR Pre-Fixes plus Canonical Rename Slice Summary

**WR-04 bare-dollar NSIS rejection plus WR-07 fixture-rooted tile check, with identity.display_name carried to PowerBrowser through the emitter, comparands, and re-pinned gates -- byte-identity and full --quick green.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-09-04T23:34:30Z
- **Completed:** 2026-09-05T00:05:25Z
- **Tasks:** 2 completed
- **Files modified:** 19

## Accomplishments
- NSIS sink guard rejects bare `$NAME` as well as `${NAME}` while `$$` still emits, proved by two new self-test twins (43 plants green)
- Tile-color check reads the fixture-root manifest with divergent-manifest plants in both polarities (4 plants green, control first)
- Canonical `PowerBrowser` in configuration.toml fanned out to all eight drifted byte-identity files, the Theia copy-over keys, shell title, and widget fallbacks
- Inventory expectations re-pinned (dev `PowerBrowser Dev`, release `PowerBrowser`) with the identifier_form re-scoping recorded; all affected gates re-pinned and green

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer: WR-04 bare-dollar guard plus WR-07 fixture-root thread with self-test twins** - `1426f6d` (fix)
2. **Task 2: NAME-01 slice: canonical display value plus inventory re-pin plus regenerated comparands** - `bb92d6e` (feat)

**Plan metadata:** `bb92d6e` plus this close-out (docs: complete plan)

## Files Created/Modified
- `scripts/generate.mjs` - WR-04 guard class plus NAME-01 re-pins (error example, ftl header, agreement comparand)
- `scripts/verify-installer-schema.mjs` - WR-07 root threading plus divergent-manifest plant
- `scripts/verify-branding-preflight.mjs` - Section-6 spaceless-join re-scope plus plant re-pins
- `scripts/verify-manifest-literals.mjs` - Single-token derivation skip plus re-cut allowlist plus skip plant
- `scripts/verify-platform.sh` - Downstream-fixtures archive fallback plus divergence re-pin
- `scripts/check-patch-surface.sh` - Brand-value comment example re-pinned
- `configuration.toml` - identity.display_name to PowerBrowser (one line)
- `inventory/brand-tokens.json` - Variant expectations, census recount, identifier_form scoping record
- `powerbrowser/branding/{dev,release}/configure.sh` - Regenerated display names
- `powerbrowser/branding/{dev,release}/locales/en-US/brand.ftl` - Regenerated terms plus header
- `powerbrowser/branding/{dev,release}/locales/en-US/brand.properties` - Regenerated keys
- `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop` - Regenerated Name=
- `powerbrowser/shell/powerbrowser.xhtml` - Shell title and loading text to canonical form
- `theia/applications/browser/package.json` - applicationName plus branding block copy-over
- `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx` - Boot fallback to canonical form
- `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` - Boot fallback plus Mozilla sentence to canonical form

## Decisions Made
- Downstream-fixtures fallback glob: the v1.0 closeout archived the 07 fixtures under milestones, so the check falls back to the archived root instead of failing on a moved directory. Still glob-derived, still loud on a miss.
- Section-6 needle re-scoped per the plan's identifier_form action sentence: bare-identifier absence cannot discriminate once display equals identifier, so the check asserts the per-variant spaceless join (`PowerBrowserDev`) derived from inventory full names with a no-needle vacuity guard.
- Manifest-literals derives multi-word literals only: single-token values match every identifier they prefix under the shared boundary rule, so scanning for the release form flagged 40 files. Dev composition, vendor, and notice keep coverage; display files stay pinned exactly by preflight sections 2-4.
- Legal and trademark copy frozen out of the slice: trademark_notice, LICENSE, the own-notice fallbacks, USER_MESSAGE strings, and prose keep the spaced form. The plan scoped NAME-01 to display surfaces; unifying product copy is 08-02 work.
- Comparand correctly untouched: powerbrowser/identity.configure.comparand carries vendor, UA name, and telemetry policy only -- no display bytes -- so the rename leaves it byte-identical. Verified, not assumed.
- Dev suffix stays spaced (`PowerBrowser Dev`): base moves, suffix unchanged, per the plan acceptance criteria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Downstream-fixtures row red at baseline -- archived fixtures root**
- **Found during:** Task 1 (tracer verify: --quick baseline)
- **Issue:** `verify-downstream-fixtures` failed with `no such fixtures root: .planning/phases/07-*/fixtures` before any plan edit -- the v1.0 closeout archived phase 07 under `.planning/milestones/v1.0-phases/`. The plan's verify requires --quick green.
- **Fix:** Fallback glob to the archived fixtures root when the live phases dir carries none. Still glob-derived (residue-probe safe), still loud on a miss. Proved first by running the harness directly against the archive root (5 fixtures, 210 assertions PASS).
- **Files modified:** scripts/verify-platform.sh
- **Verification:** `scripts/verify-platform.sh --only verify-downstream-fixtures` PASS; full --quick green
- **Committed in:** 1426f6d (part of task commit)

**2. [Rule 3 - Blocking] Rename blast radius exceeded the plan's five-file list -- gate re-pins required for --quick green**
- **Found during:** Task 2 (NAME-01 propagation: first --quick after the manifest edit)
- **Issue:** The plan listed configuration.toml, inventory, the comparand, and two configure.sh files, but --quick pins the display form in more places: generate self-test comparand and error example, preflight section 6 plus five plants, the emitter-owned ftl header, the inventory census rows, manifest-literals derivation, the divergence check and fixtures, the Theia copy-over keys, shell title, and widget fallbacks. Leaving any of them red fails the plan's own verify.
- **Fix:** Each pin re-pinned following its checker's own discipline (derive-at-check-time kept, self-test twins extended, control-green-first preserved, reasons updated). No checker logic weakened: the two re-scopes (section 6, manifest-literals) replace vacuous-or-exploding assertions with discriminating ones, each with a new plant proving it. Details per file in the Files section above.
- **Files modified:** scripts/generate.mjs, scripts/verify-branding-preflight.mjs, scripts/verify-manifest-literals.mjs, scripts/verify-platform.sh, scripts/check-patch-surface.sh, theia/* (4 files), powerbrowser/shell/powerbrowser.xhtml, plus the 8 regenerated branding files
- **Verification:** Full --quick PASS; each touched self-test PASS (generate 43, installer-schema 4, preflight 23, literals 9)
- **Committed in:** bb92d6e (part of task commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both required to meet the plan's own verify gates. No scope creep beyond what --quick greenness demanded; product-copy unification stays in 08-02.

## Issues Encountered
- Baseline --quick was red before any edit (archived fixtures root). Fixed as deviation 1 above; the remaining baseline was green.
- The ftl header comment is emitter-owned, so its inverted wording ("TWO WORDS WITH A SPACE") had to change in emitBrandFtl with a regenerate-and-copy pass, not by hand-editing the tracked files. Same byte-identity procedure as the display terms.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - no stubs introduced. Changed hunks checked for TODO/FIXME/placeholder patterns; the only matches are removed allowlist lines referencing the established placeholder-mark term.

## Threat Flags
None - no new trust-boundary surface. The WR-04 change stays rejection-only per CFG-03 (no escaper, no new sink); WR-07 changes which manifest the existing read targets. Both land inside the plan's threat register items T-08-01a/T-08-01b as their stated mitigations.

## Follow-ups for Later Plans (not blockers)
- `scripts/verify-branding.mjs` (full-mode, needs a live browser): its IDENTIFIER_FORM assertion now matches every display surface since display equals identifier. Re-scope when a plan can run the live Theia check; left untouched because it cannot be verified in this run.
- User-facing copy still spaced (`USER_MESSAGE` strings, shell-error-copy requirement, CLAUDE.md copy rule, README/BUILD prose, telemetry preference text): product-copy unification belongs to the 08-02 rename pass, which owns human-eyes review.
- `trademark_notice`, LICENSE notice, and own-notice fallbacks keep the spaced legal copy deliberately; changing the mark's legal notice is a legal-copy decision, not a display propagation.
- Full-mode rows (branding-variant-divergence, verify-branding-identity-*) are re-pinned to canonical values and will prove on the first tier-3 builds; --gate exclusions keyed on ledger 10 unchanged.

## Next Phase Readiness
- Static pipeline falsified and green under the canonical name: WR-04/WR-07 guards discriminate, byte-identity holds, residue scan clean.
- Ready for the next 08 plans (updater enablement, NSIS-on-Nix, host-named MSIX/DMG work) without re-proving the static layer.
- No blockers. No human-verification items raised by this plan (all checkpoints auto-approved; no blocking-human gates hit).

## Self-Check: PASSED

---
*Phase: 08-installer-hardening-canonical-rename*
*Completed: 2026-09-05*
