---
phase: 06-two-layer-verification-and-rebranding-docs
plan: 04
subsystem: verification
tags: [ver-02, legal-notices, branding-channel, about-dialog, static-gate, verify-platform]

# Dependency graph
requires:
  - phase: 06-two-layer-verification-and-rebranding-docs
    provides: 06-03 primary-source trademark basis (mandated Mozilla non-association wording, Eclipse attribution form)
  - phase: 02-configuration-manifest-and-generator-core
    provides: configuration.toml manifest plus generate.mjs resolveConfig derivation
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: powerbrowserBranding runtime channel, readBrandingConfig reader, verify-theia-branding pin gate
provides:
  - legalNotices on the runtime channel: emitter derivation, channel reader, dialog rendering, tracked block
  - Preflight section 11b legal-notice pin with two planted-fault self-test plants (22-23)
  - Trademark-surface anchored exclusion for the mandated sentence with tightness plant (5)
affects: [06-06-ci-wiring, rebranding-docs, tier-3-verify-branding, downstream-rebrand]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 9000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [derived-not-kept-checker-expectations, imported-exclusion-anchor, one-notice-per-line-emission]

key-files:
  created: []
  modified: [scripts/generate.mjs, theia/extensions/branding/src/browser/powerbrowser-branding-config.ts, theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx, theia/applications/browser/package.json, scripts/verify-branding-preflight.mjs, inventory/brand-tokens.json, scripts/verify-trademark-surface.mjs]

key-decisions:
  - "Mozilla sentence uses the dev display composition (base plus suffix) per the plan's display-name-plus-suffix direction; the fragment row is single-variant"
  - "Eclipse sentence carries a product-home clause over the URL-parsed domain, bare attribution core when repoUrl is null (channel null-tolerance, no new hard gate)"
  - "One notice per emitted line so the token-scan exclusion stays per-notice granular"
  - "Trademark exclusion imports the emitter tail const (derive, never restate)"
  - "No new 06-01 allowlist rows: coverage is line-granular and existing rows cover the new lines (verified by a green run, not assumed)"
  - "Tier-3 verify-branding.mjs conflict documented as a follow-up, not edited blind without a runnable browser"

patterns-established:
  - "Imported exclusion anchor: a checker exclusion for emitter-fixed wording imports the const rather than restating the string"
  - "Derived-not-kept checker expectations: legal content originates in the manifest, so the pin derives through the emitter instead of a third source"

requirements-completed: [VER-02]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "About dialog renders all three legal notices (own trademark, Mozilla non-association, Eclipse attribution) from the runtime channel"
    requirement: "VER-02"
    verification:
      - kind: unit
        ref: "scripts/verify-theia-branding.mjs#fragment, block and compile green (includes tsc)"
        status: pass
      - kind: unit
        ref: "scripts/verify-branding-preflight.mjs#section 11b read, fallback, render-rule and carrier pins"
        status: pass
    human_judgment: false
  - id: D2
    description: "Removing the channel read or any notice fails the static gate naming the notice"
    requirement: "VER-02"
    verification:
      - kind: unit
        ref: "scripts/verify-branding-preflight.mjs --self-test#plants 22 (read removed) and 23 (notice dropped)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No byte-identical generator surface changed; generate --check, byte-identity and the full --quick table stay green"
    requirement: "VER-02"
    verification:
      - kind: manual_procedural
        ref: "scripts/verify-platform.sh --quick (84 checks + summary, all PASS)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tier-3 verify-branding.mjs accepts the mandated Eclipse sentence in the About dialog"
    requirement: "VER-02"
    verification: []
    human_judgment: true
    rationale: "The runtime gate asserts /Theia|Eclipse/i absence in About textContent, which the mandated attribution now violates by design; changing that gate needs a browser build to validate, builds are out of scope for this static-only plan, and verification is deferred to end-of-roadmap"

# Metrics
duration: 25min
completed: 2026-09-04
status: complete
---

# Phase 6 Plan 04: Legal Notices on the Runtime Channel Summary

**About dialog renders three manifest-derived legal notices through `readBrandingConfig`, pinned by a preflight triple and two planted faults, with the full `--quick` table green**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-04T09:05:00Z (approx)
- **Completed:** 2026-09-04T09:30:00Z (approx)
- **Tasks:** 3 auto complete
- **Files modified:** 7

## Accomplishments
- `emitLegalNotices` in `scripts/generate.mjs`: own `legal.trademark_notice` verbatim, Mozilla sentence over the dev display composition with the fixed tail, Eclipse sentence over the URL-parsed repo domain (bare core when null); emitted one notice per line; `generate --self-test` branding control extended with literal Acme triple
- Channel reader parses `legalNotices` as a non-empty string array (anything else resolves to `undefined`, never throws); dialog renders notices as mapped text nodes through the reader with compiled `FALLBACK_LEGAL_NOTICES`
- Regenerated fragment plus surgical tracked-block copy (that key only, byte-minimal diff); `verify-theia-branding` and its self-test green with no checker edits (includes the `tsc` compile proof)
- Preflight section 11b: read pin, per-notice quoted-fallback pin, per-notice no-render-text rule, tracked-block always-assert plus generated-fragment check-when-present — all derived from the manifest through the emitter; plants 22–23 red naming the notice
- Full `scripts/verify-platform.sh --quick` green (84 checks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Emit legalNotices and render them from the channel** - `bdc6b91` (feat)
2. **Task 2: Pin the legal-notice channel in the preflight** - `792eb88` (feat, includes census fix)
3. **Task 3: Prove the full static table with the new shape** - `fd769f4` (fix: trademark exclusion)

**Plan metadata:** covered by the task commits above (no separate docs commit yet; SUMMARY commit follows)

## Files Created/Modified
- `scripts/generate.mjs` - `emitLegalNotices` derivation, `MOZILLA_NON_ASSOCIATION_TAIL` export, fragment key, literal self-test triple
- `theia/extensions/branding/src/browser/powerbrowser-branding-config.ts` - `legalNotices` channel shape and reader
- `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` - compiled fallback array, channel getter, mapped text-node render
- `theia/applications/browser/package.json` - `powerbrowserBranding.legalNotices` copied from the fragment (that key only)
- `scripts/verify-branding-preflight.mjs` - section 11b pin plus `pinLegalNotices` helper, fixture fragment copy, plants 22–23
- `inventory/brand-tokens.json` - package.json display census count 1→3 for the two new notice lines
- `scripts/verify-trademark-surface.mjs` - mandated-sentence anchored exclusion on the imported tail, tightness plant 5

## Decisions Made
- Mozilla sentence names the dev composition (`Power Browser Dev ...`) exactly as the plan's display-name-plus-suffix direction states; the fragment row is single-variant so there is one composition to pin
- Eclipse sentence shape `This product (<domain>) includes Eclipse Theia, a trademark of Eclipse Foundation AISBL.` reuses the already-derived repo URL host via URL parsing (a domain move carries it); null repo URL emits the bare attribution core, matching the channel's existing null-tolerance instead of inventing a new hard gate
- Notices emitted one per line so the trademark token-scan exclusion applies per notice rather than shielding a whole single-line array
- No new 06-01 allowlist rows: that gate covers lines (not occurrences), so the existing file rows cover the new lines — confirmed by a green run, and the occurrence count moved 112→122 all allowlisted
- Tier-3 `verify-branding.mjs` (`NO_STOCK_IDENTITY`) will redden on the mandated Eclipse sentence at runtime; left untouched (cannot validate a gate change without a browser) and recorded as coverage D4 plus Next Phase Readiness below

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bumped the package.json brand-display census count 1→3**
- **Found during:** Task 2 (preflight verification after regeneration)
- **Issue:** The tracked block's two display-carrying notices are legitimate new occurrences of the census target; the exact-count gate went red naming the file and both counts
- **Fix:** Count 1→3 with the reason extended to name the two notice lines; drift in either direction still goes red
- **Files modified:** inventory/brand-tokens.json
- **Verification:** `verify-branding-preflight.mjs` PASS
- **Committed in:** 792eb88 (part of task commit)

**2. [Rule 3 - Blocking] Excluded the mandated sentence from the trademark token scan**
- **Found during:** Task 3 (full `--quick`: `verify-trademark-surface` red on the fragment's Mozilla line)
- **Issue:** The policy-mandated non-association sentence must name Mozilla in words, which the display-token scan otherwise forbids on every scanned surface
- **Fix:** Anchored line exclusion on the emitter-fixed full tail imported from the generator (derived, never restated), plus a self-test plant proving the mandated sentence goes green while a bare token on a non-notice line still goes red
- **Files modified:** scripts/verify-trademark-surface.mjs
- **Verification:** `verify-trademark-surface.mjs` plus `--self-test` (5 plants) PASS; full `--quick` PASS
- **Committed in:** fd769f4 (part of task commit)

---

**Total deviations:** 2 auto-fixed (both blocking, both directly caused by the task's own changes)
**Impact on plan:** Both required for a green `--quick`; no scope creep. The exclusion is the one place a future reader must review with care — it admits exactly one sentence shape.

## Issues Encountered
- Tier-3 `scripts/verify-branding.mjs` `assertDisplayForm` rejects `/Theia|Eclipse/i` in About textContent, which the mandated Eclipse attribution now violates by design (it also requires `@theia/` absence and no `eclipse-theia` link — both still hold). Not a static failure: recorded as coverage D4 and carried to verification, not patched blind. See Next Phase Readiness.
- No stubs introduced; no new network/auth/file-access surface. Notices render as React text nodes (escaped) through the channel reader with no literal markup strings, satisfying the T-06-04 mitigation; no new threat flags.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CI wiring (06-06) consumes the same registry labels (`theia-branding`, `verify-branding-preflight` and their self-tests); no new rows were added
- Tier-3 follow-up (at `/gsd-verify-work`, not now): `verify-branding.mjs` needs a legal-notice-aware `assertDisplayForm` for the About surface — subtract the three channel notices (derived from the manifest through the emitter, the same source section 11b uses) from the text before asserting `NO_STOCK_IDENTITY`, and extend its fault plants to prove a non-notice `Theia`/`Eclipse` string still goes red
- The deferred 06-03 human ritual is unaffected (artwork untouched)

## Self-Check: PASSED
- `generated/theia-branding.json` FOUND with 3-notice array; tracked block FOUND equal to the fragment's; dialog fallback FOUND (3 literals), channel getter FOUND, mapped render FOUND with no notice literal in render code
- Commits `bdc6b91`, `792eb88`, `fd769f4` FOUND in log, no deletions in any
- `generate` + `--check` PASS, `generate --self-test` PASS (39), `verify-theia-branding` + `--self-test` PASS (3), `verify-branding-preflight` + `--self-test` PASS (23 plants), `verify-trademark-surface` + `--self-test` PASS (5), `verify-manifest-literals` PASS, `scan-brand-residue` PASS (via `--quick`), full `--quick` PASS (84 checks, exit 0)

---
*Phase: 06-two-layer-verification-and-rebranding-docs*
*Completed: 2026-09-04*
