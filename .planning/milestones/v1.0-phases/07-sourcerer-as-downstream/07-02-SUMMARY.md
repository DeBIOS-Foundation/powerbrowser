---
phase: 07-sourcerer-as-downstream
plan: 02
subsystem: config
tags: [PB_CONFIG_DIR, downstream-fixture, DOC-02, VER-03, CFG-05, resolveConfig, harness]

# Dependency graph
requires:
  - phase: 07-sourcerer-as-downstream (plan 01)
    provides: [PB_CONFIG_DIR external-config resolution, driver sanitization]
provides:
  - Committed synthetic downstream fixture (Northlight brand, fully distinct required keys)
  - Fixture harness scripts/verify-downstream-fixture.mjs (pass/fail drive, --all, --self-test)
  - DOC-02 evidence baseline (per-surface fixture values asserted green)
affects: [07-03 adversarial fixtures, 07-04 layers proof]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 9014
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [resolveConfig-derived fixture expectations, derived-invariance sweep exemption, per-fixture expect-fail.txt markers]

key-files:
  created: [.planning/phases/07-sourcerer-as-downstream/fixtures/sourcerer-equivalent/configuration.toml, .planning/phases/07-sourcerer-as-downstream/fixtures/sourcerer-equivalent/brand/mark.svg, scripts/verify-downstream-fixture.mjs]
  modified: []

key-decisions:
  - "Sweep exemption E1 derives rebrand-invariance per run (same file, same line bytes under both brands) instead of hand-keeping emitter-literal exclusions"
  - "--all takes no default fixtures root: the phase path spells a residue probe no in-scope file may carry, so callers pass --fixtures-root as argv"
  - "Fixture omits variants/theia_release-override/cosmetic keys: variants inherit (default-echo path), theia_release stays platform-identical (no emitted fragment, pins gate)"

patterns-established:
  - "Downstream proof shape: copy fixture to mkdtemp external dir, snapshot generated/ hashes, child-generate with PB_CONFIG_DIR, assert, restore default + --check fresh + hash equality"
  - "Mixed fixture sets: expect-fail.txt per fixture dir selects expect-fail mode under --all, CLI --expect-fail overrides"

requirements-completed: [CFG-05, VER-03, DOC-02]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Synthetic downstream fixture (Northlight manifest plus original diamond-ring artwork) resolves clean with four defaulted paths"
    requirement: "DOC-02"
    verification:
      - kind: other
        ref: "resolveConfig(platform manifest, fixture manifest): zero failures, defaulted=[product.description, product.homepage, theia.default_theme, variants]"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fixture harness drives external generate, asserts exact brand bytes plus platform absence, restores default byte-identical"
    requirement: "VER-03"
    verification:
      - kind: other
        ref: "node scripts/verify-downstream-fixture.mjs --self-test (9 planted cases all behaved as pinned)"
        status: pass
      - kind: other
        ref: "node scripts/verify-downstream-fixture.mjs --source <fixture> (PASS, 66 assertions) and --all --fixtures-root (PASS, 1 fixture, 66 assertions)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Platform generates and verifies identically with the downstream absent"
    requirement: "CFG-05"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick: PASS -- all checks passed; generate --check fresh; both --self-tests green; residual scan green"
        status: pass
    human_judgment: false

# Metrics
duration: ~7min
completed: 2026-09-04
status: complete
---

# Phase 7 Plan 02: Synthetic Downstream Fixture plus Harness Summary

**Sourcerer-equivalent external config (Northlight brand) generates a fully branded tree from an untouched platform tree, proven by a 66-assertion harness with a 9-case self-test**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-04T10:01:37Z
- **Completed:** 2026-09-04T10:08:10Z
- **Tasks:** 3
- **Files modified:** 3 (2 fixture sources plus 1 harness)

## Accomplishments
- Committed fixture with every required key distinct from the platform's (Northlight vendor pair, display name with interior space, distinct basenames/distribution/legal triple/support URL/telemetry host, distinct ESR point-release tag) plus an original diamond-ring square artwork with a one-line svg element
- Harness stages the fixture to a mkdtemp external dir, child-generates with PB_CONFIG_DIR, derives all expectations through the imported resolveConfig merge path, asserts exact bytes on configure.sh display lines, brand.ftl/brand.properties full names with agreement, frontend-config applicationName, legalNotices own-notice, upstream-pins tag, and staged markSvg
- Platform-absence sweep plus default-echo coverage, expect-fail path with plain-words copy-shape checks, snapshot-restore with hash equality, --all mode, all green; full --quick and both tree scans green with the downstream absent

## DOC-02 evidence baseline (per-surface fixture values asserted, for 07-04)

- Dev display: `MOZ_APP_DISPLAYNAME="Northlight Browser Dev"`; release: `"Northlight Browser"`
- brand.ftl `-brand-full-name` and brand.properties `brandFullName` agree per variant (Dev / release base)
- Vendor pair: machine `Northlight`, display `Northlight Collective`
- Trademark notice: `Northlight Browser is a trademark of Northlight Collective.`
- Pins: `FIREFOX_ESR_TAG=FIREFOX_154_0esr_RELEASE`, theia `1.74.1` (platform-identical, no emitted fragment)
- Support `https://northlight.example.org`, telemetry endpoint `https://telemetry.northlight.example.org/v1/events` (level `error`)
- Echoed defaults on the fixture run: `product.description`, `product.homepage`, `theia.default_theme`, `variants`

## Task Commits

Each task was committed atomically:

1. **Task 1: Synthetic fixture sources** - `b3d0e1e` (feat)
2. **Task 2: Downstream-fixture harness with self-test** - `3d44342` (feat, amended once to remove residue-probe spellings — see deviation 1)
3. **Task 3: Neutrality re-proof** - no tree change (verification only; generated/ is git-ignored)

**Plan metadata:** docs commit follows (this SUMMARY plus STATE/ROADMAP/REQUIREMENTS updates).

## Files Created/Modified
- `.planning/phases/07-sourcerer-as-downstream/fixtures/sourcerer-equivalent/configuration.toml` - Synthetic downstream manifest (test data, scan-excluded location)
- `.planning/phases/07-sourcerer-as-downstream/fixtures/sourcerer-equivalent/brand/mark.svg` - Original diamond-ring artwork, square viewBox, one-line svg
- `scripts/verify-downstream-fixture.mjs` - Fixture harness: pass/fail drive, --all, --self-test (675 lines, exceeds the 120-line minimum)

## Decisions Made
- E1 exemption derives rebrand-invariance per run (a hit line byte-identical in the default tree's same file is an emitter literal, invariant under rebrand) instead of hand-keeping the three emitter-comment lines — a hand-kept list could only agree with the tree it was copied from.
- `--all` takes no default fixtures root: the phase directory path spells a residue probe, and no in-scope file may carry that token, so callers pass `--fixtures-root` as argv (scan-excluded .planning/ content is unaffected).
- Fixture carve-outs documented in its header: theia_release kept platform-identical (generator emits no fragment; the pins gate enforces it against @theia pins) and [[variants]] omitted (inheritance is the intended fallback and exercises the default-echo path).
- "Presence iff echoed" read as presence-implies-coverage: any non-fixture platform value present in generated/ must sit on an exempt line or be echo-covered; echoed-but-unemitted values (e.g. description) are informational, not failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Harness spelled the residue probe token in an in-scope file**
- **Found during:** Task 2 (post-commit scan)
- **Issue:** Two spellings in scripts/verify-downstream-fixture.mjs (a "Sourcerer-equivalent" comment and the default fixtures-root path through the phase directory) flipped the residual scan into pre-rename mode: 63 reconciliation failures. The plan's "no mark may enter this tree" constraint forbids the token outside inventory/brand-tokens.json and .planning/.
- **Fix:** Reworded the comment; removed the default root entirely so --all requires --fixtures-root as argv. Amended the task commit so the token never persists in an in-scope blob.
- **Files modified:** scripts/verify-downstream-fixture.mjs
- **Verification:** `scan-brand-residue` PASS over 141 files, `verify-manifest-literals` PASS over 151 files
- **Committed in:** 3d44342 (amended)

**2. [Rule 2 - Missing Critical] Added the derived-invariance (E1) sweep exemption the plan's sweep needs to go green**
- **Found during:** Task 2 (probe generate before writing the harness)
- **Issue:** Three emitter-authored comment literals carry platform display strings into every emission regardless of brand (brand.ftl D-78 rationale, brand.ftl machine-vendor comment, aboutDialog.css branding-directory comment). The specified sweep, read literally, can never pass.
- **Fix:** Exempt a hit line when it is byte-identical in the default tree's same file (derived per run by set comparison), keeping the E2 fixed-identifier enumeration from REBRANDING.md step 5 as the second exemption. Variable surfaces stay fully swept.
- **Files modified:** scripts/verify-downstream-fixture.mjs
- **Verification:** Self-test platform-value-swap case goes red naming file and value; committed fixture drive green with 66 assertions
- **Committed in:** 3d44342

**3. [Rule 3 - Blocking] Added per-fixture expect-fail.txt markers for --all over mixed sets**
- **Found during:** Task 2 (contract review for 07-03's adversarial fixtures)
- **Issue:** A single CLI --expect-fail substring cannot express per-fixture expectations when --all drives a mixed pass/fail set.
- **Fix:** A fixture dir holding expect-fail.txt runs in expect-fail mode with its trimmed content; CLI --expect-fail overrides; absent file means expected-pass.
- **Files modified:** scripts/verify-downstream-fixture.mjs
- **Verification:** Self-test wrong-substring case goes red; --all drive green
- **Committed in:** 3d44342

**4. [Rule 3 - Blocking] Fixed node:crypto import and a dirty-tree self-test failure**
- **Found during:** Task 2 (first self-test run)
- **Issue:** createHash imported from node:fs (lives in node:crypto); then the green-control case failed only on restore-hash equality because the earlier probe run had left fixture bytes in generated/.
- **Fix:** Corrected the import; restored the default tree and re-ran green. The restore assertion catching the dirty tree is the mechanism proving itself.
- **Files modified:** scripts/verify-downstream-fixture.mjs (import only; tree restored, no commit needed)
- **Verification:** --self-test PASS (9/9), fixture drive PASS (66 assertions), --check fresh
- **Committed in:** 3d44342

---

**Total deviations:** 4 auto-fixed (1 bug, 1 missing-critical, 2 blocking)
**Impact on plan:** All four are gate-correctness fixes inside the harness author's scope. No scope creep; the milestone acceptance core is proven as specified.

## Issues Encountered
- None beyond the deviations above. Inkscape rasterized the diamond-ring fixture artwork first try; the restored default raster hashes matched the pre-fixture snapshot exactly.

## Threat Flags
None — no new surface beyond the plan's `<threat_model>`. The harness imports resolveConfig and findMatches read-only, writes only to a mkdtemp stage plus generated/ (restored hash-equal), and interpolates fixture values solely into failure messages via JSON.stringify. T-07-02 mitigated (expectations derived per run; 9 self-test plants prove the assertions go red); T-07-03 accepted (invented marks only, scan-excluded location).

## Known Stubs
None — stub-pattern scan over the three new files is clean.

## User Setup Required
None - no external service configuration required. Fixture artwork is synthetic test data; no human-review ritual applies.

## Next Phase Readiness
- Plan 07-03 drives the EXPECTED-FAIL path (expect-fail.txt markers ready); plan 07-04 drives --all over the fixture set.
- Pre-existing workspace modifications (M .planning/config.json, M 01-VERIFICATION.md, assorted untracked planning files) are not from this plan and were left untouched.

---
*Phase: 07-sourcerer-as-downstream*
*Completed: 2026-09-04*

## Self-Check: PASSED
- All created files verified present (fixture configuration.toml, brand/mark.svg, scripts/verify-downstream-fixture.mjs)
- Task commits verified present (`b3d0e1e`, `3d44342`); amended commit contains no file deletions (1 file changed, 675 insertions)
- Fixture drive PASS (66 assertions), --all PASS, --self-test PASS (9/9), generate --check fresh, full --quick PASS, both tree scans green
