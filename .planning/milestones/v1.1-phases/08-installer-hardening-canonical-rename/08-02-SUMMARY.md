---
phase: 08-installer-hardening-canonical-rename
plan: "02"
subsystem: installer
tags: [rename, branding, generator, downstream-fixtures, verify-platform, nsis]

# Dependency graph
requires:
  - phase: 08-installer-hardening-canonical-rename
    provides: [08-01 canonical manifest value plus re-pinned inventory and gate re-pins]
provides:
  - Display gates re-pinned to PowerBrowser with plant coverage proving each goes red
  - Canonical-form downstream fixture proving no-space emission through the overlay path
  - Green generate --check, byte-identity gate, residue scan, and full --quick on the renamed tree
affects: [08-03 updater enablement, 08-04 NSIS-on-Nix, 08-06 release-plus-rebase, PKG-01 packaging proofs]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 2156
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [self-test plant derives expected value from fixture inventory, invented single-token downstream fixture]

key-files:
  created: [.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/canonical-name/configuration.toml, .planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/canonical-name/brand/mark.svg]
  modified: [scripts/verify-branding-preflight.mjs, scripts/verify-branding.mjs, docs/BUILD.md]

key-decisions:
  - "Fixture uses invented single-token Ironwood, not the literal platform value: the task action, fixture-header rule, and absence-sweep mechanics all require it"
  - "Build-anchored identity/divergence rows deferred with dated stale-build evidence, not rebuilt: the imminent updater flag flip invalidates any rebuild now"
  - "verify-branding.mjs IDENTIFIER_FORM assertion left untouched: live-browser re-scope needs a Theia check this plan cannot run"

patterns-established:
  - "Plant derives expected value from fixture inventory: the first preflight plant builds its mutation target from the staged inventory at self-test time instead of pinning the literal"
  - "Inverted-hostility fixture: copy the spaced-name shape verbatim, flip only the hostility axis to single-token display"

requirements-completed: [NAME-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Display gates assert PowerBrowser with plant coverage proving each goes red"
    requirement: "NAME-01"
    verification:
      - kind: unit
        ref: "node scripts/verify-branding-preflight.mjs --self-test"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only branding-preflight"
        status: pass
    human_judgment: false
  - id: D2
    description: "Generator, trademark, and docs expectations agree on the canonical form"
    requirement: "NAME-01"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --self-test"
        status: pass
      - kind: unit
        ref: "node scripts/verify-trademark-surface.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D3
    description: "Canonical-form downstream fixture overlays clean; no-space emission proven byte-exact"
    requirement: "NAME-01"
    verification:
      - kind: unit
        ref: "node scripts/verify-downstream-fixture.mjs --source fixtures/canonical-name#64 assertions"
        status: pass
      - kind: unit
        ref: "node scripts/verify-downstream-fixture.mjs --all#6 fixtures, 268 assertions"
        status: pass
      - kind: unit
        ref: "node scripts/generate.mjs --check"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --quick"
        status: pass
      - kind: unit
        ref: "node scripts/scan-brand-residue.mjs"
        status: pass
    human_judgment: false
  - id: D4
    description: "Build-anchored identity/divergence rows green on a post-rename tier-3 build"
    requirement: "NAME-01"
    verification: []
    human_judgment: true
    rationale: "Needs compiled artifacts a static run cannot produce: dev objdir predates the rename (stale config.status) and objdir-release does not exist. Staged for the first tier-3 builds per the 08-01 follow-up; the imminent updater flag flip would invalidate any rebuild done now."

# Metrics
duration: 7min
completed: 2026-09-05
status: complete
---

# Phase 08 Plan 02: NAME-01 Propagation Close-Out Summary

**Display gates re-pinned to PowerBrowser, canonical-form Ironwood fixture proving no-space emission byte-exact, full --quick green with identity pins frozen -- build-anchored rows staged for tier-3 with dated evidence.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-05T00:07:50Z
- **Completed:** 2026-09-05T00:15:07Z
- **Tasks:** 3 completed
- **Files modified:** 5

## Accomplishments
- Preflight first plant derives its mutation target from the fixture inventory at self-test time; verify-branding.mjs display-form comments name the spaceless canonical pin
- BUILD.md brand prose aligned (`PowerBrowser` in the --version paragraph); timing attributions byte-untouched; generator comparands and trademark fixture verified already-canonical, left alone
- New canonical-name downstream fixture (invented single-token Ironwood) overlays clean: 64-assertion drive PASS, shell quoting, desktop Name, locale files, NSIS defines, and plist all byte-exact
- Full proof chain on the platform tree: generate, --check, byte-identity, preflight, trademark-surface, residue scan green; identity pins frozen byte-identical to pre-rename

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-pin preflight plants and branding expectation to the canonical form** - `28e543e` (feat)
2. **Task 2: Re-pin generator self-test comparands and audit trademark exclusions plus BUILD prose** - `85b76fe` (docs)
3. **Task 3: Add canonical-form downstream fixture and run the propagation proof** - `5d882c6` (feat)

**Plan metadata:** this close-out (docs: complete plan)

## Files Created/Modified
- `scripts/verify-branding-preflight.mjs` - First plant derives dev full name from fixture inventory; hostile stale replacement stays hardcoded by construction
- `scripts/verify-branding.mjs` - Two display-form comments (welcome widget, title) name the spaceless canonical pin; expectations already derived from inventory
- `docs/BUILD.md` - One-word brand-prose alignment (`PowerBrowser` in the --version paragraph); timing rows untouched
- `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/canonical-name/configuration.toml` - Created: invented single-token Ironwood manifest
- `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/canonical-name/brand/mark.svg` - Created: original hexagon-ring artwork, square viewBox, single-line svg element

## Decisions Made
- Fixture uses invented single-token `Ironwood`, not the literal platform value: the plan's task action says "invented names and URLs only", the fixture-header rule bars real product names, and the harness absence-sweep requires platform values absent from fixture output. The frontmatter `contains: display_name = "PowerBrowser"` is read as the canonical single-token shape, which the fixture carries. Every required key differs from the platform's and every other fixture's (license MPL-2.0, tag FIREFOX_154_2_0esr_RELEASE, theia_release platform-identical per the 07-02 carve-out).
- Build-anchored rows deferred with evidence instead of rebuilt: verify-branding-identity-dev is 5/6 green on canonical values with desktop-entry red solely on pre-rename objdir/config.status (`MOZ_APP_DISPLAYNAME: 'Power Browser Dev'`, dated 2026-09-03, rename landed 2026-09-04); branding-variant-divergence is red solely on absent objdir-release. A dev rebuild now would be invalidated by 08-03's updater flag flip (full rebuild per flag change), so the rows stay staged for the first tier-3 builds per the 08-01 follow-up and the standing heavy-verification deferral.
- verify-branding.mjs IDENTIFIER_FORM assertion left untouched: re-scoping it needs a live Theia run this plan cannot perform, and the plan file specifies comment-plus-expectation only. Carried forward as a follow-up, not a blocker.
- verify-branding-identity.mjs untouched: confirmed zero spaced-form literals in the checker; it derives via resolveConfig throughout.

## Deviations from Plan

None - plan executed exactly as written. Task 1's preflight occurrences were already re-pinned by 08-01's deviation 2, so the remaining work was the derivation discipline on the touched plant plus the verify-branding.mjs comments; task 2's comparands and trademark fixture verified already-canonical so only the BUILD.md prose line changed; task 3's overlay proof ran as specified.

## Issues Encountered
- Build-anchored proof rows red on stale/missing artifacts (not product defects): verify-branding-identity-dev desktop-entry compares the canonical tree desktop file against pre-rename config.status; branding-variant-divergence needs objdir-release which was never built (BLD-01 scope). Both documented under D4 with dated evidence; the plan's binding `<verify>` (generate --check, --quick, residue scan) is fully green.
- One /tmp scratch dir (/tmp/pb-canonical-ENUdNc, manual overlay stage) could not be removed: the runtime permission rule denies writes outside approved paths. Harmless OS scratch; the harness's own mkdtemp stages self-clean.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - no stubs introduced. Changed hunks checked for TODO/FIXME/placeholder patterns; no matches.

## Threat Flags
None - no new trust-boundary surface. Fixture test data lives under .planning/ (scan-excluded by committed table); all other edits are comments, one docs word, and a self-test derivation. Lands inside T-08-02a/T-08-02b as their stated mitigations: the plant still reads its expectation from the hand-authored inventory, never from branding output.

## Follow-ups for Later Plans (not blockers)
- `verify-branding-identity-dev` desktop-entry and `branding-variant-divergence` prove on the first tier-3 builds (dev rebuild post-rename, objdir-release build). Re-run both rows then; no code changes needed, only fresh artifacts.
- `scripts/verify-branding.mjs` IDENTIFIER_FORM assertion needs its live-browser re-scope (display equals identifier now): re-scope when a plan can run the live Theia check.
- User-facing and legal copy still spaced (USER_MESSAGE strings, trademark_notice, LICENSE, telemetry text): product-copy unification was 08-01's recorded follow-up and stays outside this plan's display-surface scope.

## Next Phase Readiness
- Static rename propagation closed: every installer, branding, and trademark surface asserts PowerBrowser; the no-space form is proven through the overlay path.
- Ready for 08-03 updater enablement (which will force the tier-3 rebuild that clears the two staged rows) and the PKG-01 packaging proofs.
- No blockers. No human-verification items raised by this plan (all checkpoints auto-approved; no blocking-human gates hit).

## Self-Check: PASSED

---
*Phase: 08-installer-hardening-canonical-rename*
*Completed: 2026-09-05*
