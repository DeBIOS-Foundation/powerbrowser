---
phase: 03-firefox-branding-emitter-and-icon-pipeline
verified: 2026-09-04T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Launch objdir/dist/bin/powerbrowser on a graphical session and inspect the window, launcher/dock entry, and desktop entry"
    expected: "The downstream mark renders at correct density in all three places and the title carries the suffixed display name (Power Browser Dev)"
    why_human: "No pixel judge exists in this runtime; the automated surrogate (headless launch + byte-identical installed rasters + desktop Name assertion) cannot judge rendered visuals"
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  status: human_needed
---

# Phase 3: Firefox Branding Emitter and Icon Pipeline Verification Report

**Phase Goal:** Every Gecko-side branding surface — branding directory, icon set, installer fields — is materialized from the manifest
**Verified:** 2026-09-04
**Status:** human_needed
**Re-verification:** No — initial verification

All commands below were run live against the working tree by the verifier.
SUMMARY.md claims were treated as leads, not evidence: every must-have was
re-proven with independent reads, greps, `cmp` comparisons, gate executions,
and one live manifest excursion (edited and restored in-task with
byte-identical restore proven afterward). The tracked `configuration.toml` was
restored via `git checkout` and `git status` confirms zero tracked drift from
the excursion.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Branding directory emitted complete (brand.ftl/properties + layout) with agreement check green; generated/identity.configure exists and reaches the build via the patch include hook; patch 010 carries no brand values in +lines (MOZ_APP_ID retained) | VERIFIED | `cmp` identical for all 4 locale files vs `powerbrowser/branding/...` tracked comparands; 19 files per variant on disk (`configure.sh`, 2 locale, 7 layout/pref, 5 PNG, ico, icns, nsi, tile); `verify-branding-agreement.mjs` PASS; `generated/identity.configure` carries exactly the two `imply_option` lines (vendor `DeBIOS`, UA `Firefox`); patch 010 `+` lines are only the two `False` flips plus `include("../identity.configure")`, MOZ_APP_ID retained as context line 21; `MOZ_APP_VENDOR", "DeBIOS"` absent from patch; `objdir/config/autoconf.mk` reads `MOZ_APP_VENDOR = DeBIOS`, `MOZ_APP_DISPLAYNAME = Power Browser Dev`, `MOZ_BRANDING_DIRECTORY = powerbrowser/branding-generated/dev`; `.mozconfig:15` carries the spike-decided `--with-branding` spelling; zero `brand.dtd` files under `generated/`, zero `brand.dtd` references in the emitter (03-01 prohibition upheld — see SC1 note) |
| 2 | Five icon sizes per variant rasterized from brand/mark.svg; ICO/ICNS containers real; built artifact shows downstream icon; desktop Icon line resolves to a 03-02 raster | VERIFIED (automated; visual pixel judgment pending, see Human Verification) | IHDR probe: all five `defaultN.png` per variant read exactly N×N via `readUInt32BE(16/20)`; all five dev rasters `cmp`-identical to the tracked Phase 1 rasters; ICO header fields 0/1/3 LE with 3 entries, ICNS magic `icns` with length field === file length, both variants; `verify-icon-ihdr.mjs` PASS; installed `objdir/dist/bin/browser/chrome/icons/default/default{16,32,48,64,128}.png` all present and `default128.png` `cmp`-identical to the 03-02 raster; `generated/powerbrowser.desktop` carries `Name=Power Browser Dev` and `Icon=.../powerbrowser/branding/dev/default128.png` |
| 3 | Installer fragments (NSIS/MSIX/plist/tile) emitted per variant, schema-complete gate green | VERIFIED | 8 fragments on disk with manifest-derived values (`branding.nsi` ×2, `AppxManifest-fields.xml` ×2, `Info-plist-fields.xml` ×2, tile ×2); `branding.nsi` carries all six `!define` lines (`BrandFullNameInternal`/`BrandFullName` = display+suffix, `CompanyName` = vendor_display, URL keys = support_url, `Channel` = literal `unofficial`); Appx carries DisplayName/Description/Identity Name; plist carries CFBundleName/CFBundleIdentifier plus icns literals; tile omits `BackgroundColor` exactly as required with `tile_color` unset; `verify-installer-schema.mjs` PASS; schema keys `installer.support_url`/`installer.tile_color` present with regex; no success copy claims a Windows/macOS build |
| 4 | Single-edit propagation: manifest display_name edit moves every Gecko surface, restore is byte-identical | VERIFIED (live excursion by the verifier) | Set `display_name = "Zebra Browser"`, regenerated (exit 0): exactly the 14 value-carrying surfaces carry `Zebra Browser` (configure.sh ×2, ftl ×2, properties ×2, nsi ×2, Appx ×2, plist ×2, desktop ×2), zero `Power Browser Dev` remnants anywhere under `generated/`; `.mozconfig`, tile manifests, identity carrier, and icons correctly unchanged (carry no display value); restored via `git checkout`, regenerated: `generate --check` PASS (46/46), `verify-generated-identity` PASS (33/33), `git status` shows zero tracked drift |
| 5 | Tier-3 build evidence: built artifact + identity verifier state; six surfaces green on disk (no rebuild — tree inspection only) | VERIFIED | `objdir/dist/bin/powerbrowser` present (2.4 MB, built Sep 3); `node scripts/verify-branding-identity.mjs` PASS — all six surfaces green (executable, application-ini, runtime-identity with positive control discriminating, brand-full-name, desktop-entry, version `DeBIOS powerbrowser 153.1.0esr`); the diagnostics-layer cross-check inside runtime-identity reports `skipped -- no chrome-context driver available in this repo (WINDOWS.md #7)`, a documented known-open exclusion, not a surface failure |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/generate.mjs` | Locale/icon/installer/carrier emitters, 46-row TARGETS, `--check`/`--self-test` | VERIFIED | `emitBrandFtl`, `rasterizeIcons`, `emitFirefoxIco`/`emitFirefoxIcns`, `emitBrandingNsi`, `emitAppxManifestFields`, `emitInfoPlistFields`, `emitVisualElementsManifest`, `emitIdentityConfigure` all present; `--self-test` PASS (23 planted faults); `--check` PASS (46/46) |
| `scripts/verify-branding-agreement.mjs` | Branding-dir agreement registry check | VERIFIED | PASS on the real tree |
| `scripts/verify-icon-ihdr.mjs` | PNG IHDR + ICO/ICNS registry check | VERIFIED | PASS on the real tree |
| `scripts/verify-installer-schema.mjs` | Installer fragment schema check | VERIFIED | PASS on the real tree |
| `scripts/lib/config-schema.json` | Installer keys with regex guards | VERIFIED | `installer.support_url` + `installer.tile_color` present with regex, help, example |
| `configuration.toml` | Own-manifest `[installer]` section | VERIFIED | `support_url` set, `tile_color` deliberately unset (omission path exercised) |
| `patches/010-powerbrowser-identity.patch` | De-configured, hook-only + 2 behavior flips | VERIFIED | `+` lines: 2× `False` flips + include hook only; MOZ_APP_ID retained as context |
| `generated/identity.configure` | Carrier fragment (gitignored) | VERIFIED | Two `imply_option` lines; `upstream/identity.configure` symlink resolves to it |
| `.mozconfig` | `--with-branding` routed to generated output | VERIFIED | Line 15: `--with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding-generated/dev}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/generate.mjs` | `powerbrowser/branding/.../brand.ftl` | TARGETS tracked comparands | WIRED | `cmp`-identical ×4, identity gate 33/33 PASS |
| `.mozconfig` | `generated/branding/dev` | `--with-branding` + overlay symlink | WIRED | `autoconf.mk` `MOZ_BRANDING_DIRECTORY` names the generated dir; configure proven exit-0 in 03-01/03-04 (autoconf.mk state on disk confirms) |
| `scripts/generate.mjs` | `objdir/config/autoconf.mk` | Identity carrier fragment through patch include hook | WIRED | Vendor/display/branding lines resolve from generated output; patch carries no vendor hard-code |
| `scripts/generate.mjs` | `brand/mark.svg` | Fixed literal source path, squareness pre-check | WIRED | Rasters byte-identical to tracked comparands; hostile self-test cases (non-square, missing source) pass |
| `scripts/generate.mjs` | `scripts/lib/config-schema.json` | Single schema table, `installer.*` keys | WIRED | Unknown-key rejection + regex guards exercised by self-test hostile cases |
| Built artifact | 03-02 rasters | Branding overlay packaging | WIRED | Installed `default128.png` `cmp`-identical to generated raster; desktop `Icon` line resolves to the raster path |

### Data-Flow Trace (Level 4)

Generator phase, not rendered UI. The equivalent trace (manifest key →
schema → emitter → emitted bytes → build consumption) was exercised live:
the Zebra excursion proved `identity.display_name` flows to exactly the 14
value-carrying files and nothing else, and `objdir/config/autoconf.mk` +
the six-surface identity verifier prove generated bytes reach the built
application. No static fallback stands in for a manifest read. One
imprecision noted: `generated/identity.configure`'s banner points at the
`generated-byte-identity` gate, which skips untracked rows by design — the
real gates for that file are `generate --check` and preflight check 5
(REVIEW WR-05, cosmetic).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Generate fresh (46 targets) | `node scripts/generate.mjs` | PASS, 46 files written | PASS |
| Freshness check | `node scripts/generate.mjs --check` | PASS, 46/46 match | PASS |
| Generator self-test | `node scripts/generate.mjs --self-test` | PASS, 23 planted faults behaved as pinned | PASS |
| Byte-identity gate | `node scripts/verify-generated-identity.mjs` | PASS, 33/33 byte-identical, generated/ untracked | PASS |
| Agreement / icon / installer gates | three verifiers | All three PASS | PASS |
| Identity verifier on built artifact | `node scripts/verify-branding-identity.mjs` | PASS, six surfaces green + positive control discriminates | PASS |
| Propagation excursion + restore | Zebra edit → regenerate → restore → regenerate | 14/14 moved, 0 remnants, restore check-clean + identity-clean + zero tracked drift | PASS |
| Full `--quick` registry | `scripts/verify-platform.sh --quick` | PASS, all checks including all six new 03-xx rows | PASS |

Note: `verify-generated-identity` returned exit 1 once during this run
with `brand/mark.svg could not be turned into the 128-pixel icon`
(inkscape raster step inside its mkdtemp regeneration), then PASSed on
immediate re-run with no tree change — transient tool failure, not content
drift. Inkscape is present at `/run/current-system/sw/bin/inkscape`.

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist for this phase and none are
referenced in the plans or summaries. Skipped — not applicable.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| GEN-01 | 03-01, 03-04 | Complete branding directory + identity carrier from `configuration.toml`, Linux build wired via `--with-branding` | SATISFIED | Locale/layout emission byte-identical, agreement green, carrier + hook live with autoconf.mk proof, tier-3 build green with six surfaces passing |
| GEN-02 | 03-02, 03-04 | All five Linux icon sizes from the single source SVG; built app shows downstream icon | SATISFIED (automated); visual pixel sign-off pending | IHDR-exact + byte-identical rasters, real ICO/ICNS, installed icons identical to generated rasters, desktop entry correct; launcher/window pixel judgment is the one human item below |
| GEN-03 | 03-03, 03-04 | Installer branding for Linux + Windows (NSIS/MSIX) + macOS (DMG/.icns) from the manifest; Linux build-verified, foreign hosts schema-complete | SATISFIED | 8 fragments emitted and schema-gated, hostile sink-guard cases red, Linux build green; Windows/macOS host builds remain v2 PKG-01 scope per the requirement text itself |

Requirement IDs declared across the four plans (`GEN-01`, `GEN-02`,
`GEN-03`) match the phase's declared requirement set exactly. No orphaned
requirements for Phase 3.

ROADMAP success-criterion note: SC1 names `brand.dtd` ("`brand.ftl`,
`brand.properties`, and `brand.dtd` written atomically and cross-checked").
The pinned ESR tree contains no `brand.dtd` under `browser/branding/` and no
consumer references it, so 03-01 recorded the `must_haves.prohibitions`
entry resolving to emit ftl + properties only and no `brand.dtd` exists
anywhere in `generated/` or the emitter. The criterion's intent (complete
drop-in branding dir, atomically written, cross-checked) is met; the
`brand.dtd` token itself is superseded by that documented decision, not an
omission.

### Anti-Patterns Found

No `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` debt markers in phase-3 files. The
03-REVIEW.md findings (7 warnings, 5 infos) were each assessed against the
tree; all are verification/hardening-layer gaps around a sound mechanism,
none blocks the phase goal:

| Finding | Severity | Verification relevance | Disposition |
|---------|----------|------------------------|-------------|
| WR-01: preflight hard-fails on absent `generated/identity.configure` where sibling checks SKIP (fresh-clone `--quick` red) | Warning | Real — confirmed at `verify-branding-preflight.mjs:391-392`; SUMMARY premise about `generate --check` being red is false (it SKIPs exit 0). Gate ergonomics, not emitted-output correctness | Non-blocking; recommend fix in Phase 5/6 (scope the fail to partial-tree, add `generate` to the BUILD.md fresh-clone recipe) |
| WR-02: UA_NAME half of the carrier has no positive static assertion | Warning | Real — check 5 asserts only the vendor line; identity gate skips untracked rows; no UA assertion in the identity verifier. D-78 compat literal unguarded | Non-blocking; recommend one-line assertion + self-test plant |
| WR-03: patch's two behavioral `False` lines asserted by no gate | Warning | Consistent with tree (no HEALTHREPORT/NORMANDY assertion found in preflight); a rebase flipping either passes every gate | Non-blocking; recommend asserting both lines in check 5 |
| WR-04: NSIS sink guard misses bare `$VAR` (only `${VAR}`) | Warning | Real — confirmed regex `/"\|\$\{\|\r\|\n\|\0/` at `generate.mjs:614`; schema admits `$`, so `https://example.org/$INSTDIR/x` would emit silently | Non-blocking, narrow; recommend rejecting bare `$` |
| WR-05: carrier banner names a nonexistent copy destination and a gate that skips it | Warning | Real — confirmed verbatim in `generated/identity.configure` header | Cosmetic; recommend carrier-specific banner |
| WR-06: identity overlay symlink has no self-test or existence gate | Warning | Symlink present and resolving; self-test coverage not independently re-audited | Non-blocking; recommend overlay case in `fetch-upstream.sh --self-test` + static existence assertion |
| WR-07: installer verifier reads live manifest instead of its fixture root | Warning | Real — confirmed `readTileColor()` uses `REPO_ROOT` at `verify-installer-schema.mjs:288-292`; harmless today (self-test mirrors live tree), latent false-green | Non-blocking; recommend threading `root` through |
| IN-01..IN-05 (nonexistent `product.ua_name` path, single-quote bypass, `ln -sfn` without `-T`, XML guard imprecision, Buffer written with `utf8` arg) | Info | Noted, no action required for this phase | Accepted as review debt |

### Human Verification Required

### 1. Downstream mark and suffixed name in the launched application

**Test:** Launch `objdir/dist/bin/powerbrowser` in a graphical session; inspect the application window, the launcher/dock entry, and the desktop entry.
**Expected:** The downstream mark renders at correct density in all three places and the title carries `Power Browser Dev`.
**Why human:** No pixel judge exists in this runtime (the executor likewise deferred it as coverage D4, `human_judgment: true`). Automated surrogate is green: headless runtime-identity launch PASS, installed rasters byte-identical to generated output, desktop `Name`/`Icon` lines correct.

### Gaps Summary

No automated gaps. All five must-haves verify against the live tree, all
four static gates plus `--quick` pass, the tier-3 build artifact on disk
passes all six identity surfaces, and the single-edit propagation proof was
re-run live with a byte-identical restore. The one open item is the
deferred visual pixel judgment above (ROADMAP SC2's "shows the downstream's
icon" clause), which routes this report to `human_needed` rather than
`passed`. The seven REVIEW warnings are recorded as non-blocking hardening
follow-ups, not gaps: each leaves every emitted byte and every gate result
unchanged.

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
