---
phase: 08-installer-hardening-canonical-rename
reviewed: 2026-09-05T07:12:12Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - scripts/generate.mjs
  - scripts/verify-installer-schema.mjs
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-manifest-literals.mjs
  - scripts/verify-platform.sh
  - scripts/check-patch-surface.sh
  - scripts/check-internals-boundary.sh
  - scripts/lib/firefox-bidi.mjs
  - scripts/verify-branding.mjs
  - scripts/verify-customize-inert.mjs
  - scripts/verify-dev-flag-off.mjs
  - scripts/verify-uri-roundtrip.mjs
  - scripts/verify-gui01-command.mjs
  - scripts/verify-mar-update-hop.mjs
  - scripts/verify-installer-build-proof.mjs
  - configuration.toml
  - inventory/brand-tokens.json
  - powerbrowser/distribution/policies.json
  - powerbrowser/endpoint-allowlist.json
  - defs.mk
  - docs/BUILD.md
  - .mozconfig
  - .gitignore
  - powerbrowser/packaging/version-nplus1/version.txt
  - powerbrowser/packaging/version-nplus1/version_display.txt
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/release/configure.sh
  - powerbrowser/branding/dev/locales/en-US/brand.ftl
  - powerbrowser/branding/release/locales/en-US/brand.ftl
  - powerbrowser/branding/dev/locales/en-US/brand.properties
  - powerbrowser/branding/release/locales/en-US/brand.properties
  - powerbrowser/powerbrowser.desktop
  - powerbrowser/powerbrowser-release.desktop
  - powerbrowser/shell/powerbrowser.xhtml
  - theia/applications/browser/package.json
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: findings
---

# Phase 08: Code Review Report

**Reviewed:** 2026-09-05T07:12:12Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** findings

## Summary

Reviewed the full Phase 08 diff (`1426f6d^..05ef20e`, 37 files, +2233/-267) at standard depth:
NSIS sink guard plus bare-dollar/escape twin probes, fixture-rooted tile check, canonical-rename
fan-out, `registerWindowActor` boundary entry, URL-matched BiDi context selection plus live
self-test, the two new gates (`verify-mar-update-hop.mjs`, `verify-installer-build-proof.mjs`),
all five bare-launch caller conversions, `policies.json` / `endpoint-allowlist.json` /
`defs.mk` / `configuration.toml` / `inventory/brand-tokens.json`, and the BUILD.md packaging
procedure. Re-ran `generate --self-test` (43 green), `verify-mar-update-hop --self-test`
(green), `verify-installer-schema --self-test` (4 green), `verify-manifest-literals --self-test`
(9 green), `check-internals-boundary.sh --self-test` (green), and `scan-brand-residue.mjs`
(PASS, 146 files) to ground every claim below.

No Critical findings. Four Warnings: a provable bypass of the new NSIS sink guard via
3-dollar runs, an import-time argv sniff in the shared BiDi library that the tree's own
generator comments forbid, a root-threading inconsistency in the new build-proof gate of the
exact WR-07 class fixed next door, and a "fork key" integrity rung in docs/comments that
asserts a control the binary does not enforce. Six Info items. Hard-rule check is clean
(see below).

**CLAUDE.md hard rules — clean:** no Theia-core edits (only `@powerbrowser/*` extension
fallbacks plus `applicationName` copy-over re-pins); no off-stack Gecko edits (no `patches/`
changes; `check-patch-surface.sh` touches one comment example only); no hand-edited patch
hunks; every new `verify-platform.sh` row ships its `--self-test` twin in `--quick`
(`mar-update-hop-self-test`, `installer-build-proof-self-test`), full rows fail loud on
absent evidence instead of skipping green.

## Warnings

### WR-01: NSIS sink guard passes 3-dollar runs that NSIS still expands

**File:** `scripts/generate.mjs:876`
**Issue:** The WR-04 guard `NSIS_UNEMITTABLE = /"|(?<!\$)\$(?!\$)|\r|\n|\0/` rejects an
isolated `$` but matches nothing in any `$`-run of length 3+ at odd alignment: every position
is either preceded or followed by another `$`. Verified live against the shipped regex —
`https://example.org/$$$INSTDIR/x` tests `false` (emits), as do `abc$$$` and `abc$$$$def`,
while `$INSTDIR`, `${NAME}`, `a$b`, and trailing `abc$` correctly test `true`. NSIS folds
`$$` to one literal `$` before expansion, so `$$$INSTDIR` compiles to a literal `$` followed
by the expansion of `$INSTDIR` — the exact compile-time link-rewrite WR-04 exists to stop.
The `$$`-escape control probe only covers even-aligned pairs, so the twins stay green while
this hole is open. Downgraded from Critical only because the manifest is trusted first-party
input and the guard is documented defense-in-depth, not a trust boundary.
**Fix:** Strip escapes first, then reject any surviving `$`:
```js
const hasBareDollar = (s) => s.replaceAll('$$', '').includes('$');
// in assertNsisEmittable: reject when hasBareDollar(value) (keep the
// quote/CRLF/NUL alternatives in NSIS_UNEMITTABLE, drop the dollar branch)
```
Add a `$$$$`/`$$$NAME` twin pair to the self-test so the alignment class stays pinned.
**Status:** FIXED in `cb1f762` — `hasBareDollar` strips `$$` pairs then rejects any surviving `$`; hostile `$$$INSTDIR` probe plus `$$$$` control added (generate `--self-test` 45/45 green).

### WR-02: Shared BiDi library sniffs importer argv for `--self-test` at import time

**File:** `scripts/lib/firefox-bidi.mjs:540`
**Issue:** `if (process.argv.slice(2).includes('--self-test'))` runs at module top level, but
this file is a library imported by six live scripts (`verify-branding.mjs`,
`verify-customize-inert.mjs`, `verify-dev-flag-off.mjs`, `verify-uri-roundtrip.mjs`,
`verify-gui01-command.mjs`, plus `verify-gui01-window.mjs`). Any importer ever invoked with a
`--self-test` argument would execute the live two-browser self-test and `process.exit()` at
import time, killing the importer's own run. `scripts/generate.mjs:153-156` documents exactly
this prohibition ("an importer's own flags are not this file's"), and
`scripts/verify-mar-update-hop.mjs:500-506` shows the tree's correct `INVOKED_DIRECTLY`
pattern. No live caller forwards the flag today, so this is latent — hence Warning.
**Fix:**
```js
import { resolve } from 'node:path';
const INVOKED_DIRECTLY = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY && process.argv.slice(2).includes('--self-test')) { ... }
```
**Status:** FIXED in `5d3fede` — `INVOKED_DIRECTLY` guard added per the mar-hop precedent; import with `--self-test` in argv verified to survive without launching the live self-test.

### WR-03: Build-proof gate ignores its own root parameter for build-derived reads

**File:** `scripts/verify-installer-build-proof.mjs:164-207`
**Issue:** `runChecks(root)` stages inputs and evidence paths under `root`, but
`configStatusValue` (line 164), `buildId` (line 171), and `manifestIdentity` (line 186) all
read from `REPO_ROOT`. This is the WR-07 defect class fixed in the same phase next door
(`readTileColor(root)` in `verify-installer-schema.mjs`): a root parameter that promises
fixture-rootability while helpers silently compare against the live tree. No live caller is
affected today (`main` passes `REPO_ROOT`; `selfTest` never calls `runChecks`), so Warning,
not Critical — but the first future self-test against a staged root will compare staged
inputs to live-tree values and either false-red or, worse, validate the wrong tree.
**Fix:** Thread the parameter — `configStatusValue(key, root)`, `buildId(r, root)`,
`manifestIdentity(r, root)` — following the `evDir`/`proofDir` pattern already used at
lines 195/211.
**Status:** FIXED in `0c8e9b2` — all three helpers take `root`; live path (`runChecks(REPO_ROOT)`) behavior-identical; build-proof `--self-test` green.

### WR-04: "Fork key" rung claims an integrity control the binary does not enforce

**File:** `docs/BUILD.md:541-543`
**Issue:** The key-custody rung header reads "Fork key plus HTTPS plus hash-pinned update
descriptors", and `scripts/generate.mjs:1163-1171` says the flag "lets fork builds consume
locally-signed MARs". By 08-04's own deviation-4 evidence, MAR signature and MAR-channel
checks sit inside `#ifdef MOZ_VERIFY_MAR_SIGNATURE`, which `--enable-unverified-updates`
drops — nothing verifies any signature, no fork key was generated in this phase, and the
hash pin lives inside `update.xml` fetched over the same TLS channel as the MAR, so it adds
no MITM resistance beyond TLS. Effective update-channel integrity is TLS to
`updates.powerbrowser.org` only. The interim posture itself is ratified (T-08-04a, production
signing an open question), so the finding is the documentation overclaim, not the flag.
**Fix:** Reword the rung to "HTTPS-only interim (no code signature verified)" citing the
`updater.cpp:3063,3329` evidence and RESEARCH open question 2; change "locally-signed MARs"
to "unsigned, hash-pinned MARs" in the emitter comment.
**Status:** FIXED in `23d4836` — rung reworded to "HTTPS-only interim (no code signature verified)" with the `updater.cpp` evidence and open-question-2 citation; emitter comment says "unsigned, hash-pinned MARs"; section lede adjusted to match (adjacent scope). Historical phase records (`08-04-PLAN/SUMMARY`, `08-RESEARCH`) left as written.

## Info

### IN-01: Token-boundary regex omits underscore joins

**File:** `scripts/verify-branding.mjs:63-65`
**Issue:** `IDENTIFIER_EMBEDDED` covers `[A-Za-z0-9]` adjacency only, so an underscore-joined
`PowerBrowser_Foo` or `my_PowerBrowser` inside a single text node passes. Underscore joins
are the norm in code identifiers; rendered DOM text rarely contains them, so Info.
**Fix:** Add `_` to both character classes.

### IN-02: MAR-hop header overclaims the resolver sift's scope

**File:** `scripts/verify-mar-update-hop.mjs:5-6`
**Issue:** The header promises "zero Mozilla update hosts", but `isMozillaHost` (line 162)
matches only `.mozilla.org` / `.mozilla.net` — any `.mozilla.com` host passes, and the
self-test control proves it: the mock log carries `firefox.settings.services.mozilla.com`
and stays GREEN (confirmed in this review's `--self-test` run). Tolerating the settings host
is by design (deviation 5 isolates it test-side only); the header just claims more than the
sift implements.
**Fix:** Narrow the header to "zero `*.mozilla.org` / `*.mozilla.net` hosts" or broaden the
sift with a `.mozilla.com` carve-out list.

### IN-03: `hop.json` fields consumed without validation

**File:** `scripts/verify-mar-update-hop.mjs:256-262`
**Issue:** `hop.mar` is `join`ed into the evidence dir with no basename check (`../../x`
escapes the evidence root), and an unparseable `hop.servedUrl` makes `servedHost` return
`null`, which silently skips the serving-host presence check instead of failing. `hop.json`
is proof-tooling output under gitignored `.mozbuild/`, so Info.
**Fix:** Reject `hop.mar` outside `/^[A-Za-z0-9._-]+$/`; fail (not skip) when `servedUrl`
does not parse.

### IN-04: Legal-notice read throws at module load instead of failing clean

**File:** `scripts/verify-branding.mjs:104-121`
**Issue:** Top-level `const LEGAL_NOTICES = readLegalNotices()` turns a missing `generated/`
tree into an uncaught exception plus stack trace rather than a `FAIL` line. The message does
name the rerun command (`node scripts/generate.mjs`), so this is polish, not a gate hole.
**Fix:** Move the read into `main()` / `assertDisplayForm` and report through the check's
normal FAIL path.

### IN-05: Build-proof compiler floats on the unpinned `nixpkgs#nsis` registry ref

**File:** `scripts/verify-installer-build-proof.mjs:122`
**Issue:** The `nix shell nixpkgs#nsis` fallback resolves through the global flake registry,
not the repo `flake.lock`, so the compiler version floats (observed 3.12) and first runs
fetch from `cache.nixos.org`. Reproducibility note only; T-08-SC already records the posture
and `stage.json` records the resolved version.
**Fix:** Resolve `nsis` through the repo flake input, or assert the recorded version prefix
in the gate.

### IN-06: Dead `staleMar` parameter in the MAR-hop self-test mirror

**File:** `scripts/verify-mar-update-hop.mjs:341`
**Issue:** `mirror({ staleMar })` implements a stale-MAR branch no caller exercises — plant 2
tampers with the MAR bytes directly instead. Harmless; either wire plant 2 through it or
delete the parameter.
**Fix:** `mirror({ staleMar: true })` for plant 2, or remove the option.

---

_Reviewed: 2026-09-05T07:12:12Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
