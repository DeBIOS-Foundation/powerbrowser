# Phase 3: Firefox Branding Emitter and Icon Pipeline - Research

**Researched:** 2026-09-04
**Domain:** Gecko branding materialization (Firefox branding directory, Linux icon rasterization, cross-platform installer fields) from a TOML manifest via the Phase 2 Node generator
**Confidence:** HIGH

## Summary

Phase 3 extends `scripts/generate.mjs` — it does not create a second generator. Every new surface follows the frozen-target-table + emitter-per-format pattern Phase 2 proved: brand.ftl / brand.properties emitters parameterized by variant, a five-size PNG raster step driven by `brand/mark.svg` through the already-present system `inkscape` 1.4.4, installer-field emitters for NSIS / MSIX / macOS bundle outputs, and a new `generated/identity.configure` carrying the `imply_option` lines patch 010 currently hard-codes. The single highest-risk item is the pre-registered spike: `mach` runs with `TOPSRCDIR=upstream/` (`cd upstream && MOZCONFIG=../.mozconfig ./mach build`), so today's `--with-branding=powerbrowser/branding/dev` resolves through the `upstream/powerbrowser -> ../powerbrowser` symlink, while a `generated/branding/dev` target would sit *outside* topsrcdir as `../generated/branding/dev`. Whether moz.configure and the moz.build file machinery accept a branding directory outside topsrcdir is unknown — the spike must answer it with a throwaway dir before any emitter is built, and a symlink fallback using the identical mechanism already exists if the answer is no.

The second most important finding is a scope correction: the success criteria name `brand.dtd` as a third emitted file, but the pinned upstream ESR tree contains no `brand.dtd` anywhere under `browser/branding/` and nothing references `chrome://branding/locale/brand.dtd` — only the `moz-l10n` Python tooling library mentions the DTD *format*. The DTD half of branding died in the Fluent migration; the emitter must produce exactly two locale files (brand.ftl, brand.properties), not three. Emitting a brand.dtd nobody consumes would ship dead weight into the chrome package and confuse the Phase 6 literal scan.

**Primary recommendation:** Grow `generate.mjs` with format emitters (ftl, properties, configure.sh-identity, branding.nsi-fields, msix/AppxManifest-fields, Info.plist-fields, VisualElementsManifest) plus an inkscape-driven icon step and pure-Node ICO writer; run the `--with-branding`-outside-topsrcdir spike first and let its result pick between direct `../generated/` pointing and a topsrcdir-internal symlink; do not emit brand.dtd.

## Project Constraints (from CLAUDE.md)

- Never fork or patch Theia core — Phase 3 touches no Theia code; icon asset swaps only.
- Never modify Gecko outside the patch stack — `upstream/` is never hand-edited; branding dirs live in this repo's `powerbrowser/` tree and resolve into the build through the `upstream/powerbrowser` symlink. New branding content must arrive via `generated/` + patch hooks, not via edits under `upstream/`.
- Byte-identical generator outputs — new emitters reproduce Phase 1 hand-written bytes first (brand.ftl, brand.properties, configure.sh), proof green, then diverge. Same order Phase 2 used (02-DESIGN D-03 pattern).
- Residual-brand scan gate — every new emitter output carrying a brand value must be inside the scan's scope or explicitly inventoried; stage new files before trusting a green scan.
- Patches are regenerated, never text-edited — the patch-010 de-configuration (moving `imply_option` lines into `generated/identity.configure` + a hook `include()`) must be regenerated from a patched tree, never hand-edited.
- One driver, one registry — new checks append rows to `scripts/verify-platform.sh`; no sibling drivers. New checks derive expectations from the tree and compare (set equality), with `--self-test` planted faults proven red.
- No internal identifier in user-facing copy — generator failure messages name the TOML dotted path, plain words, next step (extends `assertEmittable` to the new sinks: shell, NSIS, XML/plist).
- Builds run in Nix shells; full `./mach build` is ~47–54 min tier 3 — the spike should stop at `./mach configure`, not a full build.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Manifest parse / validate / merge | Generator (Node, `scripts/generate.mjs`) | — | Phase 2 owns this; Phase 3 adds schema keys only, no pipeline changes |
| Locale file emission (ftl, properties) | Generator | Gecko l10n packaging (jar.mn) | Generator writes bytes; existing `locales/jar.mn` already packages them — no jar.mn change needed |
| `configure.sh` / `identity.configure` emission | Generator | moz.configure (consumer) | Generator writes shell/configure snippets; the build sources them |
| PNG rasterization | Generator invoking system `inkscape` | — | Same tool 01-03 used; deterministic `-w/-h` export |
| ICO / ICNS emission | Generator (pure-Node writer) | — | Tiny container formats over the generated PNGs; no new dependency |
| Installer field emission (NSIS/MSIX/DMG-plist) | Generator | Foreign packagers (not run) | GEN-03: Linux build-verified, Win/macOS schema-complete only |
| `--with-branding` wiring | `.mozconfig` (generated) + symlink | moz.configure `moz_branding_directory` | Spike decides direct vs symlink route |
| Brand agreement verification | `verify-platform.sh` registry rows | `verify-branding-identity.mjs` surface 4 pattern | Reuse the ftl-vs-properties exact-equality pattern |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node builtins (`node:fs`, `node:child_process`) | 24.19.0 [VERIFIED: `node --version` this session] | Emitters, atomic writes, inkscape spawn | Zero-dep `--quick` invariant: no install step before gates run |
| `scripts/lib/toml.cjs` (vendored smol-toml) | 1.8.0 | Manifest parsing | Already vendored; Phase 3 adds schema keys, not parser work |
| `scripts/lib/config-schema.json` | (this tree) | Single schema table for new keys | D-06: masker + validator share one table — new keys go here first |
| Inkscape CLI | 1.4.4 [VERIFIED: `inkscape --version` this session] | SVG→PNG rasterization at exact sizes | Produced the ten current rasters (01-03-SUMMARY T-03-SC); `-w/-h` override DPI [CITED: https://inkscape.org/doc/man/inkscape-man.html] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `icnsutils` (`png2icns`) | 0.8.1 (distro pkg) [CITED: https://manpages.ubuntu.com/manpages/jammy/man1/png2icns.1.html] | `.icns` from PNGs if pure-Node writer is rejected | Only if the plan prefers a system tool over the ~60-line Node writer; needs a nix flake addition |
| FirefoxUX `firefox-brand` generator | upstream main | Reference design, NOT a dependency | Study its `brand-config.json` → drop-in `browser/branding/<brand>/` mapping [CITED: https://github.com/FirefoxUX/firefox-brand]; do not adopt (new dep, Mozilla's workflow) |
| gjoa mozconfig pattern | — | Precedent for third-party `--with-branding` + `--with-app-name` | Proof a fork brands via `ac_add_options --with-branding=browser/branding/gjoa` + `--with-app-name`/`--with-app-basename`/`--with-distribution-id` [CITED: https://github.com/tompassarelli/gjoa/blob/09650318b193bf170ee7a528ebb41246f29eca07/.github/workflows/build-linux.yml] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| inkscape | `sharp` (npm) / `resvg` / ImageMagick | All need an install step (npm or nix) before `--quick` can run; inkscape is already present and already produced the checked-in rasters |
| Pure-Node ICO writer | ImageMagick `convert` | `convert` is absent from this host [VERIFIED: `command -v` this session]; ICO is a 6-byte header + 16-byte entries wrapping PNG payloads — trivially writable, zero-dep |
| Pure-Node ICNS writer | `png2icns` (icnsutils) | png2icns is absent and needs a flake addition; ICNS is a 8-byte header + `ic0N`-family chunks that accept PNG payloads on modern macOS [ASSUMED — needs a macOS-host verification in v2 PKG-01, acceptable because GEN-03 requires schema-complete only] |
| `generated/identity.configure` include | mozconfig `export MOZ_APP_VENDOR=…` lines | All three patch-010 values (`MOZ_APP_VENDOR`, `MOZ_APP_UA_NAME`, `MOZ_APP_ID`) are `project_flag(env=…)` [VERIFIED: upstream/toolkit/moz.configure:18-35], so mozconfig exports satisfy `check_moz_app_vendor` with no patch touch at all — spike both, prefer exports if configure accepts them (fewer patch-stack moving parts) |

**Installation:**
```bash
# No new packages. Inkscape is already on the host; if it is missing from the
# nix dev shells, add pkgs.inkscape to the firefox shell buildInputs (one line).
```

**Version verification:** No registry packages are recommended by this research. `inkscape 1.4.4` and `node v24.19.0` verified by direct invocation this session. No `npm view` / legitimacy gate required — nothing is installed.

## Package Legitimacy Audit

No external packages are installed by this phase. All emission is Node builtins + the already-vendored TOML parser; rasterization uses the system `inkscape`; ICO/ICNS are pure-Node writers over generated PNGs.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
configuration.toml + brand/
        │  (parse → reject-unknown → mask → merge → validate — unchanged)
        ▼
scripts/generate.mjs ──┬── format emitters (ftl, properties, configure.sh,
                       │     identity.configure, branding.nsi fields,
                       │     AppxManifest fields, Info.plist fields,
                       │     VisualElementsManifest, moz.build, jar.mn?)
                       │         │ atomic write (tmp + renameSync)
                       │         ▼
                       │   generated/branding/{dev,release}/  (FULL branding
                       │         │    dir: drop-in for browser/branding/<brand>/)
                       │         ▼
                       ├── icon step: inkscape -w/-h → 5 PNGs per variant
                       │   → pure-Node .ico (+ .icns schema-complete)
                       │         │
                       ▼         ▼
               .mozconfig (generated): --with-branding=<spike answer>
                       │
                       ▼ (cd upstream && MOZCONFIG=../.mozconfig ./mach configure)
               MOZ_BRANDING_DIRECTORY ──► jar.mn / branding-common.mozbuild
                       │                    package icons + locale files
                       ▼
               Linux build shows downstream brand + icons;
               NSIS/MSIX/DMG fields present and schema-checked, not built
```

### Recommended Project Structure

```
generated/
├── .mozconfig                  # existing (adds --with-branding per spike)
├── branding/
│   ├── dev/                    # EXTENDED from {configure.sh} to a FULL branding dir:
│   │   ├── configure.sh        #   existing
│   │   ├── moz.build           #   DIRS += content/locales + FirefoxBranding() (literal, cf. upstream official)
│   │   ├── content/{jar.mn,moz.build,aboutDialog.css}
│   │   ├── locales/{jar.mn,moz.build,en-US/{brand.ftl,brand.properties}}
│   │   ├── pref/firefox-branding.js   # literal copy of tracked file (Phase 3 emits? see Pitfall 7)
│   │   ├── default{16,32,48,64,128}.png   # inkscape output
│   │   ├── firefox.ico         # pure-Node writer (schema-complete + real file)
│   │   ├── firefox.icns        # pure-Node writer (schema-complete, macOS build in v2)
│   │   ├── branding.nsi        # NSIS field defines from manifest
│   │   ├── firefox.VisualElementsManifest.xml  # tile fields from manifest
│   │   └── msix/               # AppxManifest field fragment (schema-complete)
│   └── release/                # same, name_suffix = ""
├── identity.configure          # NEW: imply_option lines (or: nothing — mozconfig exports instead)
├── powerbrowser.desktop(. .)   # existing
```

### Pattern 1: One emitter per file FORMAT, parameterized by variant
**What:** `emitBrandFtl(config, variant)`, `emitBrandProperties(config, variant)` — the dev/release difference is exactly `display_name + name_suffix`, mirroring `emitConfigureSh`. [VERIFIED: powerbrowser/branding/dev vs release differ in exactly one line each — `brand.ftl:11`, `brand.properties:11` — read this session]
**When to use:** Every new text surface. A second emitter per variant is how two files that must differ in one line drift in others (Phase 2 decision, still binding).
**Example:**
```js
// Source: extends scripts/generate.mjs emitConfigureSh pattern
function emitBrandFtl(config, variant) {
  const full = `${assertEmittable('identity.display_name', config.identity.display_name)}`
    + `${assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix)}`;
  // -brand-shorter-name/-short-name/-shortcut-name carry the BASE name (no suffix);
  // -brand-full-name carries base + suffix [VERIFIED: powerbrowser/branding/dev/locales/en-US/brand.ftl:8-11
  // vs release — shorter/short/shortcut identical, full-name differs by " Dev"].
  // -brand-product-name stays "Firefox" per D-78 (UA/compat strings); -vendor-short-name
  // comes from product.vendor_display; trademarkInfo from legal.trademark_notice.
}
```

### Pattern 2: Atomic write + cross-file agreement check
**What:** Each emitter writes to a temp file in the same directory then `renameSync`s over the target (same-filesystem atomic replace); after all three locale/config files are emitted, assert `brand.ftl` terms equal `brand.properties` values for shorter/short/full names — the exact-equality pattern `verify-branding-identity.mjs` surface 4 already implements [VERIFIED: scripts/verify-branding-identity.mjs header comments + powerbrowser/branding/dev/locales/en-US/brand.properties:5-8, read this session].
**When to use:** Always for the branding dir; a half-written branding dir is a silently misbranded build.

### Pattern 3: Branding dir as drop-in replacement
**What:** `generated/branding/<variant>/` mirrors `browser/branding/<brand>/` file-for-file (moz.build, jar.mn, locales/, content/, pref/, icons). This layout is precedented: Mozilla's own `firefox-brand` generator outputs "a drop-in replacement for the corresponding `browser/branding/<brand>/` directory… the folder layout, filenames, and relative paths match" [CITED: https://github.com/FirefoxUX/firefox-brand], and third-party forks point `--with-branding` at their own in-tree branding dir [CITED: gjoa workflow above]. `moz_branding_directory` resolution order is official-branding → `--with-branding` → `MOZ_BRANDING_DIRECTORY` confvar → `<project>/branding/nightly` default [VERIFIED: upstream/toolkit/moz.configure:3238-3273, read this session].
**When to use:** The spike decides only the *path spelling* (`../generated/branding/dev` vs a topsrcdir-internal symlink); the *content layout* is settled.

### Pattern 4: Identity via generated configure, vendors via required keys
**What:** `MOZ_APP_VENDOR` comes from `product.vendor_machine`, `-vendor-short-name` from `product.vendor_display` (D-09 split — machine form has no space because it is lowercased into the profile path [VERIFIED: configuration.toml:22-29 + upstream/toolkit/moz.configure:22-25,103-107]). `MOZ_APP_NAME` defaults to lowercase `MOZ_APP_BASENAME` ("If not set, defaults to a lowercase form of MOZ_APP_BASENAME" [VERIFIED: upstream/js/moz.configure:15-35]); live build confirms `MOZ_APP_NAME = powerbrowser`, `MOZ_APP_BASENAME = powerbrowser` [VERIFIED: objdir/config/autoconf.mk:124,128]. `MOZ_MACBUNDLE_ID` derives as `<distribution_id>.<sanitized-display-name>` [VERIFIED: upstream/toolkit/moz.configure:3836-3852] — no manifest key needed. `MOZ_APP_REMOTINGNAME` already flows via generated `.mozconfig` export [VERIFIED: .mozconfig:16 + upstream/toolkit/moz.configure:3337-3354].
**When to use:** New `[installer]`/vendor-derived schema keys must reuse `product.*`/`identity.*` — never a second vendor string.

### Anti-Patterns to Avoid
- **Emitting brand.dtd:** Nothing consumes it (see §State of the Art). An emitter for a dead file is scope creep that the Phase 6 scan must then police.
- **A second TOML-to-shell interpolation without `assertEmittable`:** NSIS (`!define` double quotes, `${}`), XML/plist (`&<>"`), and shell sinks each need their guard extended — a schema pattern per key backed by the sink assertion, exactly as Phase 2 does for shell/desktop.
- **Writing PNGs non-atomically or at the wrong density:** Rasterize at exactly `-w N -h N` per size (square source, square output); verify by reading PNG IHDR, the 01-03 pattern (`file(1)` is absent on this host — use the Node IHDR reader).
- **Pointing `--with-branding` at generated/ without running `--check` first:** `generated/` is gitignored and absent on fresh clones; a build against a stale/missing generated dir misbrands silently. The build docs must order `generate` before `configure`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG rasterization | Canvas/SVG parser in Node | System `inkscape --export-filename -w -h` | Font/text handling, filters, exact hinting; 01-03 already proved it on this mark; CLI `-w/-h` override DPI [CITED: https://inkscape.org/doc/man/inkscape-man.html] |
| Windows/macOS installer *builds* | NSIS/MSIX/DMG construction on Linux | Emit fields only; builds land with packaging hosts (v2 PKG-01) | Mozilla's own generator skips macOS-only outputs (`*.icns`, `Assets.car`, `dsstore`) on Linux [CITED: https://github.com/FirefoxUX/firefox-brand] — GEN-03's schema-complete split is precedented |
| Fluent/l10n parsing | A .ftl parser for the cross-check | Plain string equality on the emitted lines | The cross-check compares what the emitter just wrote, not arbitrary Fluent — exact match on 3 terms, same as surface 4 |
| PNG encoding/dimensions | Pixel-pushing PNG encoder | inkscape output + IHDR reader for verification | Encoding is solved; only dimension assertion is needed |
| Branding layout invention | A novel directory scheme | Mirror `browser/branding/<brand>/` file-for-file | Every consumer (jar.mn, branding-common.mozbuild, packager, `browser/app/moz.build:185` .ico DEFINES) already knows this layout |

**Key insight:** The one thing that *looks* hand-rolled but isn't is the ICO writer: ICO with PNG-compressed entries is a 6-byte header plus 16-byte directory entries wrapping byte-identical PNG payloads — a ~40-line pure-Node function with no parsing, no dependency, and no behavior to drift. That is the same class of decision as the vendored TOML parser: zero-dep beats tiny-dep under the `--quick` invariant.

## Common Pitfalls

### Pitfall 1: `--with-branding` outside TOPSRCDIR may not resolve
**What goes wrong:** `mach` runs from `upstream/` [VERIFIED: docs/BUILD.md:563,588], so TOPSRCDIR is `upstream/`, and `generated/` is a sibling (`../generated/branding/dev` from the branding flag's perspective). moz.build file machinery may refuse files outside topsrcdir even if `moz_branding_directory` accepts the string.
**Why it happens:** Today's path works only through the `upstream/powerbrowser -> ../powerbrowser` symlink [VERIFIED: `ls -la upstream/powerbrowser` this session].
**How to avoid:** Spike first with a throwaway dir (ROADMAP prescription). Fallback, same mechanism: a topsrcdir-internal symlink (e.g. `powerbrowser/branding-generated -> ../../generated/branding`) so the flag value stays inside topsrcdir exactly like today.
**Warning signs:** `mach configure` resolving `MOZ_BRANDING_DIRECTORY` to a path but `moz.build` include failing, or icons missing from `dist/` while configure exits 0.

### Pitfall 2: Stale `generated/` silently misbrands
**What goes wrong:** Build reads whatever is in `generated/`; editing `configuration.toml` without regenerating builds the old brand with exit 0.
**Why it happens:** `generated/` is gitignored — no diff, no status hint.
**How to avoid:** Build docs order `node scripts/generate.mjs` before `./mach configure`; extend `generate --check` to cover the new targets (it iterates the frozen table, so new rows are covered automatically); CI keeps generate → check → byte-identity ordering.

### Pitfall 3: `imply_option` vs mozconfig-export semantics differ
**What goes wrong:** Dropping `imply_option("MOZ_APP_VENDOR", …)` from patch 010 and replacing it with the wrong carrier leaves `check_moz_app_vendor` to `die("No value for MOZ_APP_VENDOR…")` [VERIFIED: upstream/toolkit/moz.configure:103-107].
**Why it happens:** `imply_option` sets a default; env/export sets an explicit value — usually equivalent, but configure caching (`config.status`) can pin the old value across rebuilds.
**How to avoid:** Spike both carriers (`include()` of `generated/identity.configure` from `browser/moz.configure` — `include()` takes topsrcdir/file-relative paths [VERIFIED: upstream/browser/moz.configure:55] — vs mozconfig `export` lines); after switching, force `./mach configure` (not incremental build) and diff `objdir/config/autoconf.mk` `MOZ_APP_VENDOR`/`MOZ_APP_DISPLAYNAME`/`MOZ_BRANDING_DIRECTORY` lines against the pre-switch build.

### Pitfall 4: Display-name characters that are legal in TOML but fatal downstream
**What goes wrong:** `MOZ_MACBUNDLE_ID` sanitizes with `re.sub("[^a-z-]", "", app_displayname.lower())` [VERIFIED: upstream/toolkit/moz.configure:3843] — a display name of "123 Browser!" yields a mangled bundle id; NSIS `!define` breaks on `"`; `.desktop`/`configure.sh` sinks break on `` $ ` \ `` and newlines (Phase 2 `UNEMITTABLE`).
**Why it happens:** Each sink has its own metacharacters; the schema regexes are the primary guard.
**How to avoid:** Every new schema key that reaches NSIS/XML/shell gets a `regex` plus a sink-side assertion; add self-test cases with hostile values (quotes, `${}`, `&<>`, trailing spaces).

### Pitfall 5: Non-square or non-SVG source logo
**What goes wrong:** `mark.svg` is square `viewBox="0 0 128 128"` by contract [VERIFIED: brand/mark.svg, read this session]; a downstream non-square logo (Phase 7 fixture) stretched with `-w N -h N` produces a distorted icon set.
**Why it happens:** `-w`+`-h` together force dimensions; aspect is not preserved.
**How to avoid:** Validate squareness at generate time (SVG viewBox parse for `.svg`; PNG IHDR width==height for `.png`) and hard-fail with the plain-words message shape; never silently letterbox.

### Pitfall 6: `firefox-branding.js` drift between variants
**What goes wrong:** The two `pref/firefox-branding.js` files are byte-identical today except the dev-only `browser.tabs.inTitlebar` default [VERIFIED: dev file ends with the BRAND-06 block; release tree "deliberately carries no such default" per its own comment]. If Phase 3 emits this file, the variant difference must stay exactly that block.
**Why it happens:** Same one-line-difference class as configure.sh/brand.ftl.
**How to avoid:** Either keep `firefox-branding.js` hand-written and out of the emitter (smallest scope — it contains no brand values today), or emit via one function parameterized on variant. Recommendation: keep hand-written; nothing in it varies per downstream except the dev/release block, which is a *variant* property, not a *brand* property.

### Pitfall 7: Inkscape missing from the build shell
**What goes wrong:** `inkscape` is on the host PATH (`/run/current-system/sw/bin/inkscape`) but the Gecko build runs under `nix develop .#firefox`; if that shell lacks inkscape, generation fails inside the documented build environment.
**Why it happens:** Host tools ≠ shell tools on NixOS.
**How to avoid:** Check `nix develop .#firefox --command inkscape --version` in Wave 0; if absent, add `pkgs.inkscape` to that shell's inputs (one line, no new pattern).

## Code Examples

Verified patterns from in-tree sources and official docs:

### Atomic emit (new emitters)
```js
// Source: standard Node tmp+rename; ordering constraint from scripts/generate.mjs
// ("Nothing is written under generated/ until every check has passed").
import { writeFileSync, renameSync, mkdirSync } from 'node:fs';
// 1. emit ALL surfaces to memory first (validation incl. ftl↔properties agreement)
// 2. only then write: temp file in same dir + renameSync over target
writeFileSync(tmpPath, body, 'utf8');
renameSync(tmpPath, outPath); // same-filesystem atomic replace
```

### Icon rasterization
```bash
# Source: https://inkscape.org/doc/man/inkscape-man.html (-w/-h override --export-dpi);
# precedent: 01-03 rasterized all ten current PNGs with inkscape (01-03-SUMMARY.md T-03-SC).
for s in 16 32 48 64 128; do
  inkscape brand/mark.svg --export-filename=generated/branding/dev/default${s}.png -w $s -h $s
done
# Verify each output by reading its PNG IHDR (width/height big-endian uint32 at
# bytes 16..24) — the 01-03 Node IHDR-reader pattern, since file(1) is absent.
```

### NSIS / MSIX / macOS fields (schema-complete emitters)
```nsi
; Source: upstream/browser/branding/official/branding.nsi + unofficial/branding.nsi (read this session).
; The per-downstream subset the emitter owns — everything else is layout constant:
!define BrandFullNameInternal "<display_name><name_suffix>"   ; cf. "Mozilla Firefox" / "Mozilla Developer Preview"
!define BrandFullName         "<display_name><name_suffix>"
!define CompanyName           "<vendor_display>"              ; unofficial uses "mozilla.org" here
!define URLInfoAbout          "<homepage>"
!define HelpLink              "<support-url or homepage>"
!define Channel               "unofficial"                    ; literal — never "release"/"official"
```
```xml
<!-- Source: upstream/browser/installer/windows/msix/AppxManifest.xml.in:39 + upstream/browser/branding/official/firefox.VisualElementsManifest.xml -->
<!-- AppxManifest: DisplayName/Description ← display_name(+suffix); Identity Name ← distribution_id + basename -->
<!-- VisualElementsManifest: BackgroundColor ← new [installer] tile_color key (default the shell neutral) -->
<!-- Info.plist.in: CFBundleName ← MAC_APP_NAME (derived from display name);
     CFBundleIdentifier ← MOZ_MACBUNDLE_ID (derived, no key); icon files firefox.icns/document.icns -->
```

### Spike procedure (do this before building emitters)
```bash
# 1. Copy powerbrowser/branding/dev to generated/branding-spike/ (throwaway, gitignored anyway).
# 2. cd upstream && POWERBROWSER_BRANDING=../generated/branding-spike MOZCONFIG=../.mozconfig ./mach configure
# 3. Inspect objdir/config/autoconf.mk: MOZ_BRANDING_DIRECTORY must equal the spike dir
#    and configure must exit 0. (A full build is NOT needed — tier-1 cost.)
# 4a. Green → emitters target generated/branding/<variant>/ directly.
# 4b. Red → fallback: topsrcdir-internal symlink (powerbrowser/branding-generated ->
#     ../../generated/branding), flag value stays inside topsrcdir like today.
# 5. Same session: drop imply_option("MOZ_APP_VENDOR"...) from a scratch copy of the
#    patch tree, add the mozconfig export instead, re-run configure, diff autoconf.mk.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `brand.dtd` + `brand.properties` (DTD entities) | Fluent `brand.ftl` + legacy `brand.properties` kept in sync | Fluent migration (pre-ESR-128) | DTD file is gone upstream; the properties file remains for XUL `stringbundle` consumers [VERIFIED: `chrome://branding/locale/brand.properties` referenced by 7 in-tree consumers; `brand.dtd` referenced by none — searched upstream/browser+toolkit this session] |
| Hand-maintained per-fork branding dirs | Generated branding dirs (Mozilla's `firefox-brand` tool) | 2024–2025 | Drop-in `browser/branding/<brand>/` generation from SVG sources + `brand-config.json` is the sanctioned pattern [CITED: https://github.com/FirefoxUX/firefox-brand] |
| `--enable-official-branding` for Mozilla builds | `--with-branding=<dir>` for everything else | Long-standing | Third-party brand = one flag + one dir; gjoa precedent [CITED above] |

**Deprecated/outdated:**
- `brand.dtd`: absent from upstream ESR branding; do not emit. The Phase 3 success criterion naming it is stale — needs a one-line criterion fix, not an emitter.
- `MOZ_APP_VENDOR` in patch 010 as a hard-coded value: slated for `generated/identity.configure` or mozconfig exports (this phase), full hook-only in Phase 5 (MIG-05).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PNG payloads inside ICO/ICNS are accepted by the Windows shell / macOS Finder for the respective schema-complete outputs | Standard Stack | Low — Linux build never reads them; v2 PKG-01 verifies on real hosts; png2icns fallback exists |
| A2 | `inkscape` is (or can be one-line added to) the `.#firefox` nix shell | Pitfall 7 | Low — host has 1.4.4; flake edit is additive |
| A3 | `firefox-branding.js` stays hand-written (no brand values in it) | Pitfall 6 | Low — if a brand value is later needed there, it becomes one more format emitter |
| A4 | `--with-branding=../generated/…` (outside topsrcdir) works, else symlink fallback | Spike / Pitfall 1 | Medium — spike answers it at tier-1 cost before emitters are built; both routes fully designed |
| A5 | mozconfig `export MOZ_APP_VENDOR/UA_NAME/ID` satisfies configure without patch 010's `imply_option` lines | Alternatives | Low — `project_flag(env=…)` + `check_moz_app_vendor` read this session; spike confirms in the same configure run as A4 |

## Open Questions

1. **brand.dtd in the success criteria**
   - What we know: No `brand.dtd` exists under `upstream/browser/branding/{official,unofficial,aurora,nightly}/` and no consumer references `chrome://branding/locale/brand.dtd` (searched this session).
   - What's unclear: Whether the criterion author meant a real third file or carried the name from pre-Fluent docs.
   - Recommendation: Strike `brand.dtd` from the criterion; emit ftl + properties only. Confirm with the user at plan review (one-line decision).

2. **New `[installer]` schema keys**
   - What we know: NSIS needs CompanyName/URLs/Channel; MSIX needs publisher/display/description; DMG needs background/dsstore (Linux-skipped per Mozilla precedent); tile color needs a value.
   - What's unclear: Exact key list and which fall back to `product.homepage` vs hard-fail.
   - Recommendation: Planner proposes the key table; required = {company, urls}, defaulted = {channel="unofficial", tile color=shell neutral}. User confirms during discuss.

3. **Do the Windows `.ico` companions (`document.ico`, `newtab.ico`, …) ship?**
   - What we know: `browser/app/moz.build:185` builds DEFINES for firefox/document/newwindow/newtab/pbmode/document_pdf `.ico` from the branding dir; our tree ships none of the companions (jar.mn comment says document.ico deliberately unshipped).
   - What's unclear: Whether a Windows build fails without them or falls back.
   - Recommendation: Out of scope for v1 (Linux-verified only); record as a PKG-01 input so v2 doesn't rediscover it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | generator | ✓ | v24.19.0 | — |
| inkscape (host PATH) | icon raster | ✓ | 1.4.4 | — |
| inkscape (inside `.#firefox` shell) | icon raster in build env | ? | — | Add `pkgs.inkscape` to shell inputs (Wave 0 check) |
| png2icns / icnsutils | .icns via system tool | ✗ | — | Pure-Node ICNS writer (recommended) |
| ImageMagick `convert` | nothing (rejected) | ✗ | — | Not needed |
| Windows packaging host (NSIS/MSIX) | GEN-03 builds | ✗ | — | Schema-complete only per requirement |
| macOS packaging host (iconutil, dmg) | GEN-03 builds | ✗ | — | Schema-complete only per requirement |
| `./mach configure` (tier 1, ~seconds-minutes) | spike | ✓ | — | — |
| Full `./mach build` (tier 3, ~47–54 min) | success criterion 1 | ✓ (reference host `legion`) | — | `mach configure` + autoconf.mk diff for iteration; one full build for the gate |

**Missing dependencies with no fallback:** none (all missing items are explicitly out of scope per GEN-03).
**Missing dependencies with fallback:** inkscape-in-shell (flake one-liner); png2icns (Node writer).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node `--self-test` planted-fault convention + `scripts/verify-platform.sh` registry (no new harness) |
| Config file | none — see Wave 0 |
| Quick run command | `node scripts/generate.mjs --self-test && scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh` (plus one tier-3 `./mach build` for criterion 1) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | ftl/properties/configure.sh emitted atomically + cross-checked; `identity.configure`; Linux build branded via `--with-branding` | unit (emitters) + build (tier 3) | `node scripts/generate.mjs --self-test`; `verify-platform.sh --only generated-byte-identity`; `./mach build` + `verify-branding-identity.mjs` | ❌ Wave 0 (new emitters, new registry rows) |
| GEN-02 | 5 sizes rasterized from brand/ source; IHDR-exact; app shows downstream icon | unit (IHDR) + build | `node scripts/generate.mjs --self-test`; desktop-entry Icon + `dist` icon inspection | ❌ Wave 0 |
| GEN-03 | NSIS/MSIX/DMG-icns fields emitted, schema-complete; Linux output build-verified | unit (schema check) | `node scripts/generate.mjs --self-test` (new cases: hostile values, schema presence) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/generate.mjs --self-test && scripts/verify-platform.sh --quick`
- **Per wave merge:** `scripts/verify-platform.sh`
- **Phase gate:** Full suite green + one tier-3 Linux build proving criteria 1–2 before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] New emitter functions + frozen-target rows in `scripts/generate.mjs` (GEN-01/02/03)
- [ ] New `config-schema.json` keys (`[installer]` table et al.)
- [ ] New `verify-platform.sh` registry rows (branding-dir agreement, icon IHDR, installer schema)
- [ ] Spike result (throwaway dir + `./mach configure` only — no new files)
- [ ] Wave-0 check: `nix develop .#firefox --command inkscape --version`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Schema `regex` per key (primary) + `assertEmittable`-family sink assertions for shell/NSIS/XML (defence in depth, Phase 2 pattern) |
| V6 Cryptography | no | — |
| V14 Configuration | yes | Frozen target table: no manifest value may select a write path (Phase 2 invariant, extends to new rows) |

### Known Threat Patterns for generator → build-file pipeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Shell command injection via brand value (`configure.sh` is sourced by the build) | Tampering / Elevation | `UNEMITTABLE` guard + schema regex; reject, never escape (Phase 2, extends to NSIS `${}`/`"` and XML `&<>`) |
| `.desktop` Exec/Icon injection via newline in Name | Tampering | Same sink guard (line-oriented format) |
| `__proto__`/prototype pollution via new TOML keys | Tampering | Unknown-key rejection before merge (Phase 2 ordering — unchanged) |
| Supply chain via new tooling | Tampering | Zero new packages; inkscape is a pinned-nixpkgs system binary, same trust as the existing toolchain |

## Sources

### Primary (HIGH confidence)
- Pinned `upstream/` tree read this session: `toolkit/moz.configure` (branding resolution :3238-3273, vendor/UA/ID flags :18-35, remoting :3337-3354, bundle id :3836-3852), `build/moz.configure/init.configure` (`--with-app-basename` :1272-1298), `js/moz.configure` (`--with-app-name` defaults to lowercase basename :15-35), `browser/branding/{official,unofficial}/` (configure.sh, branding.nsi, moz.build, jar.mn, brand.ftl, brand.properties), `browser/installer/windows/{nsis/defines.nsi.in,msix/AppxManifest.xml.in}`, `browser/app/moz.build:185` (.ico DEFINES), `browser/app/macbuild/Contents/Info.plist.in`, `browser/confvars.sh`, `branding-common.mozbuild` (GTK icon set = exactly 16/32/48/64/128)
- This repo read this session: `scripts/generate.mjs` (full pipeline), `scripts/lib/config-schema.json`, `configuration.toml`, `brand/mark.svg`, `powerbrowser/branding/{dev,release}/` (all files + dev/release diffs), `.mozconfig`, `patches/010`, `docs/BUILD.md` (build topology, timings), `objdir/config/autoconf.mk` (live resolved values), `scripts/verify-branding-identity.mjs`, `01-03-SUMMARY.md` (inkscape precedent), `02-RESEARCH.md` (locked decisions D-01..D-16)
- `inkscape --version` (1.4.4), `node --version` (v24.19.0), `command -v` tool probe

### Secondary (MEDIUM confidence — websearch cross-checked with official/primary sources)
- Firefox source docs: mozconfig semantics [CITED: https://firefox-source-docs.mozilla.org/setup/configuring_build_options.html]
- Inkscape man page: `-w/-h` export semantics [CITED: https://inkscape.org/doc/man/inkscape-man.html]
- `firefox-brand` generator README: drop-in layout + Linux-skips-macOS-outputs precedent [CITED: https://github.com/FirefoxUX/firefox-brand]
- gjoa workflow: third-party `--with-branding` + `--with-app-name` precedent [CITED: https://github.com/tompassarelli/gjoa/blob/09650318b193bf170ee7a528ebb41246f29eca07/.github/workflows/build-linux.yml]
- png2icns man pages (Ubuntu/Arch/Debian): CLI shape [CITED: https://manpages.ubuntu.com/manpages/jammy/man1/png2icns.1.html]

### Tertiary (LOW confidence)
- None — every load-bearing claim is HIGH or MEDIUM; residual unknowns are in Assumptions/Open Questions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified by invocation; no new packages.
- Architecture: HIGH — every consumer (moz.configure, moz.build, jar.mn, packagers) read in the pinned tree; precedent projects corroborate.
- Pitfalls: HIGH for in-tree items; MEDIUM for spike-dependent items (A4/A5 explicitly gated on the spike).

**Research date:** 2026-09-04
**Valid until:** 2026-10-04 (stable — pinned ESR tree; re-verify `brand.dtd` absence after any ESR rebase)
