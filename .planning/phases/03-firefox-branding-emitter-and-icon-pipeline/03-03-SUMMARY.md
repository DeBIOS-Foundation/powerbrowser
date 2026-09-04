---
phase: 03-firefox-branding-emitter-and-icon-pipeline
plan: 03
subsystem: branding
tags: [nsis, msix, plist, tile-manifest, node, generator]

# Dependency graph
requires:
  - phase: 03-firefox-branding-emitter-and-icon-pipeline (plan 03-01)
    provides: [emitter-per-format precedent, TARGETS table, agreement gate, generated branding/<variant> drop-in dirs]
  - phase: 03-firefox-branding-emitter-and-icon-pipeline (plan 03-02)
    provides: [trackless-TARGETS-row precedent, container self-test and registry-row conventions]
  - phase: 02-configuration-manifest-and-generator-core
    provides: [generator pipeline (parse, reject-unknown, mask, merge, validate), single schema table, generate --check / --self-test harness]
provides:
  - Installer branding emission: NSIS defines, MSIX fields, macOS bundle fields, tile manifest per variant from configuration.toml, each sink-guarded
  - Registry rows installer-schema and installer-schema-self-test gating the installer output inside --quick
affects: [03-04 (tier-3 build; GEN-03 shared and gated), GEN-03 v2 PKG-01 (Windows/macOS host builds explicitly deferred, companion .ico coverage recorded)]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 7128
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [per-sink reject-only guards beside assertEmittable (NSIS dollar-brace, XML metacharacters), manifest-state-matched omission (tile BackgroundColor), child-process probe for emit-time guards that report-through-report]

key-files:
  created: [scripts/verify-installer-schema.mjs]
  modified: [scripts/generate.mjs, scripts/lib/config-schema.json, configuration.toml, scripts/verify-platform.sh]

key-decisions:
  - "CFBundleName carries base plus variant suffix like every other per-variant surface, so a dev bundle never shares the release name; CFBundleIdentifier derives as distribution_id plus upstream-formula sanitized name with no new key"
  - "Info-plist fragment uses direct element names (CFBundleName, DocumentIconFile) rather than plist key/string pairs, so no invented name can be mistaken for an Apple-official key; the v2 packager expands DocumentIconFile into CFBundleDocumentTypes"
  - "Tile files are byte-identical across variants because [installer] is a global table, not a per-variant one — the same trade the ICO/ICNS rows make"
  - "support_url schema regex follows the plan literally (https plus no spaces or control characters), so the NSIS dollar-brace hostile case is an emit-time child-process probe, not a fixture"
  - "XML sink guard has no end-to-end red proof by construction — every XML-bound value already carries a stricter schema regex, so on a validated manifest it never fires; same defense-in-depth class as assertUnderRepo"

patterns-established:
  - "Registry check reads manifest state (tile_color) at check time and asserts the emitted omission matches it, so a manifest edit without a regenerate goes red"
  - "Tile-mismatch self-test plant takes the opposite of whatever configuration.toml states, so it stays a mismatch however a future manifest sets the key"

requirements-completed: [GEN-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Two installer schema keys (support_url, tile_color) with regex guards plus the own-manifest [installer] section with tile_color deliberately unset"
    requirement: "GEN-03"
    verification:
      - kind: other
        ref: "node scripts/generate.mjs --self-test → 20/20 PASS (task-1 baseline)"
        status: pass
      - kind: other
        ref: "node -e schema-key presence check → both keys carry regex"
        status: pass
      - kind: other
        ref: "scratch-manifest probe: misspelt [installler] section → unknown-key rejection naming it"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four installer emitters plus NSIS and XML sink guards with eight trackless TARGETS rows; 45 files emitted, tile-color omission honored on the own tree"
    requirement: "GEN-03"
    verification:
      - kind: other
        ref: "node scripts/generate.mjs → 45 files; BrandFullName count 1; BackgroundColor grep exit 1"
        status: pass
      - kind: other
        ref: "node scripts/generate.mjs --self-test → 23/23 PASS incl. 3 hostile cases red naming their key"
        status: pass
      - kind: other
        ref: "node scripts/generate.mjs --check → all 45 match"
        status: pass
    human_judgment: false
  - id: D3
    description: "scripts/verify-installer-schema.mjs plus installer-schema and installer-schema-self-test registry rows, both green inside --quick with schema-complete-only copy"
    requirement: "GEN-03"
    verification:
      - kind: other
        ref: "node scripts/verify-installer-schema.mjs → PASS; --self-test → control green then 3 plants red"
        status: pass
      - kind: other
        ref: "scripts/verify-platform.sh --only installer-schema → PASS; --only installer-schema-self-test → PASS"
        status: pass
      - kind: other
        ref: "scripts/verify-platform.sh --quick → all checks passed"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-04
status: complete
---

# Phase 03 Plan 03: Installer Branding Fields Summary

**NSIS defines, MSIX fields, macOS bundle fields, and tile manifest emitted per variant from configuration.toml, each sink-guarded and gated schema-complete-only in the single driver**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-04T04:14:42Z
- **Completed:** 2026-09-04T04:26:23Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Two optional installer schema keys with regex guards; own manifest carries `[installer]` with support_url set and tile_color unset, exercising the omission path
- Four emitters (emitBrandingNsi, emitAppxManifestFields, emitInfoPlistFields, emitVisualElementsManifest) plus NSIS and XML reject-only sink guards; eight trackless TARGETS rows; generator self-test at 23 planted faults
- scripts/verify-installer-schema.mjs gates fragment presence, six-define completeness, XML tag-balance with required fields, and tile-color state match; both registry rows green inside --quick with no build-verified claim

## Task Commits

Each task was committed atomically:

1. **Task 1: Installer schema keys plus own-manifest values** - `16970eb` (feat)
2. **Task 2: Four installer emitters plus NSIS and XML sink guards** - `306edb0` (feat)
3. **Task 3: Installer schema registry check plus rows** - `cc7ddd2` (feat)

**Plan metadata:** committed as `docs(03-03)` (see git log following this SUMMARY's commit)

## Files Created/Modified
- `scripts/lib/config-schema.json` - installer.support_url (https, no spaces/controls) and installer.tile_color (#rrggbb), both optional with regex, help, example
- `configuration.toml` - `[installer]` section: support_url set to the project's own homepage host, tile_color unset with the omission rationale in a comment
- `scripts/generate.mjs` - assertNsisEmittable/assertXmlEmittable guards, installerSupportUrl fallback helper, four emitters, eight TARGETS rows, three hostile self-test cases plus child-process probe, header and stale-count comments moved 37 -> 45
- `scripts/verify-installer-schema.mjs` - New (481 lines): TARGETS-derived set comparison both directions, six-define assertion, tag-balance plus required-element assertions, tile-state match against configuration.toml, control-green-first self-test with three plants
- `scripts/verify-platform.sh` - installer-schema and installer-schema-self-test rows with NEW (03-03) provenance; generate-self-test comment moved 20 -> 23 cases

## Decisions Made
- CFBundleName carries base plus variant suffix like every other per-variant surface, so a dev bundle never shares the release name; CFBundleIdentifier derives as distribution_id plus the upstream-formula sanitized name with no new key (plan: "carrying no new key")
- Info-plist fragment uses direct element names rather than plist key/string pairs, so DocumentIconFile (our contract name, expanded by the v2 packager into CFBundleDocumentTypes) cannot be mistaken for an Apple-official key
- Tile files are byte-identical across variants because [installer] is a global table — the same trade the ICO/ICNS rows make, with the same uniformity comment
- support_url schema regex follows the plan literally, so the NSIS dollar-brace hostile case is proven by an emit-time child-process probe (the guard reports through report(), which exits) rather than a validate-time fixture
- XML sink guard has no end-to-end red proof by construction: every XML-bound value already carries a stricter schema regex, so on a validated manifest it never fires — same defense-in-depth class as assertUnderRepo, documented in the guard comment
- Full-suite tier-3 rows not run: the plan's own verification note assigns Linux build-verification of installer output to 03-04's tier-3 build; every row this plan's blast radius touches was run green instead (see Issues Encountered)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fragment-set derivation mixed prefixed and unprefixed paths**
- **Found during:** Task 3 (Installer schema registry check plus rows), on the first `node scripts/verify-installer-schema.mjs` run
- **Issue:** actualFragments() built `generated/`-prefixed rel paths while expectedFragments() derived prefix-less TARGETS paths, so the real tree reported "holds no installer fragments at all" — the comparison agreed with nothing, exactly the vacuity the non-vacuity guard exists to catch
- **Fix:** actualFragments() returns TARGETS-style prefix-less paths; the `generated/` prefix is applied at display and disk-read time only
- **Files modified:** scripts/verify-installer-schema.mjs
- **Verification:** check PASS on the real tree; self-test control green then all three plants red
- **Committed in:** cc7ddd2 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug in new code, caught by its own verification before commit)
**Impact on plan:** The fix is confined to the new checker and changes no plan behavior; no scope creep.

## Issues Encountered
- Full `scripts/verify-platform.sh` (tier-2/3 rows: live Theia frontend, built-tree browser sessions, tier-3 build) not run: those rows need a display, dev shells, and long builds, and the plan assigns the only build-dependent verification in its blast radius — Linux build-verification of installer output — to 03-04's tier-3 build. Mitigation: ran every check the plan's files can affect (generate --self-test 23/23, generate --check 45/45, installer-schema pair, generated-byte-identity, branding-dir-agreement, --quick all-green), so no row this plan adds or alters is unverified.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GEN-03 emission fully checked short of host rendering; Windows shell / MSIX / Finder byte-level correctness is explicitly deferred to v2 PKG-01 (flagged assumption 1), and companion .ico coverage (document, newtab and siblings) is a named PKG-01 input (T-03-10), not silently dropped
- GEN-03 REQUIREMENTS.md marking is gated: the ID is shared with 03-04 (no SUMMARY yet), so ready-ids blocks it until 03-04 closes — same pattern 03-02 recorded for GEN-02
- Ready for 03-04 (close): tier-3 build plus patch-010 de-configuration; installer output rides that build per this plan's verification note

## Self-Check: PASSED
- scripts/verify-installer-schema.mjs exists on disk (481 lines, above the 100-line artifact gate); scripts/generate.mjs contains emitBrandingNsi, emitAppxManifestFields, emitInfoPlistFields, emitVisualElementsManifest, assertNsisEmittable, assertXmlEmittable
- git log confirms 16970eb, 306edb0, cc7ddd2
- All three task <verify> suites re-run green in this session (self-test 23/23, --check 45/45, installer-schema pair, --quick all-green); no success copy, label, or message claims a Windows or macOS build

---
*Phase: 03-firefox-branding-emitter-and-icon-pipeline*
*Completed: 2026-09-04*
