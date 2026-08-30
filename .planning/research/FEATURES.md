# Feature Research

**Domain:** Rebrandable browser/IDE distribution platform — a Firefox-ESR fork base + Theia sidecar whose entire brand and configuration surface is driven from one declarative manifest (`configuration.toml`) plus a `brand/` asset folder.
**Researched:** 2026-08-29
**Confidence:** MEDIUM overall (see Source Confidence, below — the seam grades transport as LOW, but the load-bearing facts were read verbatim from canonical artifacts)

## Prior Art Surveyed

Five products solve exactly this problem. Their manifests are the field list Power Browser must at least match.

| Product | Manifest | Shape |
|---------|----------|-------|
| **Zen Browser** (`@zen-browser/surfer`) | `surfer.json` at repo root | Closest structural analogue. `name`, `vendor`, `appId`, `binaryName`, `version{product,version,candidate,candidateBuild}`, `buildOptions{generateBranding,windowsUseSymbolicLinks}`, `addons{}` with per-entry source kind (`github{id,repo,version,fileGlob}` / `amo{id,amoId,version}` / `url{id,url,version}`), `brands{release,twilight}{backgroundColor,brandShorterName,brandShortName,brandFullName,release{displayVersion,github.repo},archives}`, `license{licenseType,ignoredFiles}`, `updateHostname` |
| **VSCodium** | `product.json`, jq-merged over upstream's | `nameShort`, `nameLong`, `applicationName`, `dataFolderName`, `urlProtocol`, `extensionsGallery{serviceUrl,itemUrl}`, `updateUrl`, `downloadUrl`, `quality`, `extensionKind`, `extensionAllowedBadgeProviders`. Plus `APP_NAME`/`BINARY_NAME` placeholder substitution inside patches |
| **Chromium** | `chrome/app/theme/<component>/BRANDING`, key=value | `COMPANY_FULLNAME`, `COMPANY_SHORTNAME`, `PRODUCT_FULLNAME`, `PRODUCT_SHORTNAME`, `PRODUCT_INSTALLER_FULLNAME`, `PRODUCT_INSTALLER_SHORTNAME`, `COPYRIGHT`. Selected by GN arg `branding_path_component` |
| **Firefox** | `browser/branding/<name>/` — a *directory*, selected by `--with-branding` | ~30 files + 5 subdirs (see below). `configure.sh` sets only `MOZ_APP_DISPLAYNAME` and `MOZ_MACBUNDLE_ID`; names also live in `locales/en-US/{brand.dtd,brand.ftl,brand.properties}` |
| **LibreWolf** | `mozconfig --with-branding=` + a **separate** settings repo | Brand identity and preference defaults (`librewolf.cfg`, `policies.json`) are deliberately different artifacts with different cadence |
| **Eclipse Theia** | `theia.frontend.config` in the app `package.json` + `theiaPlugins` map | `applicationName`, `defaultTheme`, `defaultIconTheme`, `preferences{}`, `reloadOnReconnect`. `theiaPlugins` is id → download URL, materialized at build time into `theiaPluginsDir`. Registry redirect via `VSX_REGISTRY_URL`; multi-registry via `--ovsx-router-config` |

**Firefox branding directory, verbatim** (`browser/branding/unofficial`): `configure.sh`, `moz.build`, `branding.nsi`, `default{16,22,24,32,48,64,128,256}.png`, `firefox.ico`, `firefox64.ico`, `firefox.icns`, `disk.icns`, `document.icns`, `document.ico`, `document_pdf.ico`, `newtab.ico`, `newwindow.ico`, `pbmode.ico`, `background.png`, `Assets.car`, `dsstore`, `firefox.VisualElementsManifest.xml`, `private_browsing.VisualElementsManifest.xml`, `VisualElements_{70,150}.png`, `PrivateBrowsing_{70,150}.png`, `wizHeader.bmp`, `wizHeaderRTL.bmp`, `wizWatermark.bmp`, plus `content/`, `locales/`, `msix/`, `pref/`, `stubinstaller/`.

**Three findings that contradict assumptions in PROJECT.md — read these before writing the roadmap:**

1. **There is no Theia upstream telemetry endpoint.** Theia IDE ships no telemetry and "no setting or hidden switch that could activate any collection." Theia 1.74 added a telemetry *framework* for adopters — preference `telemetry.telemetryLevel` (default `off`; `off|crash|error|all`) and `telemetry.filters` — but **no destination is shipped; adopters implement and ship their own.** The planned `[telemetry] send-to-theia` toggle has nothing to talk to. Mirror Theia's real shape instead: a level enum defaulting to off, plus one endpoint Power Browser itself implements.
2. **Nobody actually achieves single-file rebrand.** Surfer still needs a `src/` overlay tree and a patch set beside `surfer.json`. VSCodium needs `product.json` *and* patches *and* env-var placeholders *and* icon-replacement scripts. Editing Chromium's `BRANDING` alone leaves DMG output still saying "Chromium." The single-file guarantee is the differentiator precisely because it is unclaimed.
3. **"Grep for the platform name comes back empty" is not an achievable verification criterion.** Sourcerer already refuted it in `scripts/verify-branding-identity.mjs`: a correctly branded, unpackaged build still ships dozens of files with "firefox" in the name (upstream feature names, update-file sets). The working form is an enumerated fixed surface list with exact-equality assertions and a coverage guard that fails if any surface never ran.

## Feature Landscape

### Table Stakes (Users Expect These)

"Users" here = a downstream rebrander. Missing any of these means they must edit a second file, which PROJECT.md defines as a bug.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Three-length display name** (`brandFullName` / `brandShortName` / `brandShorterName`) | Universal across all five prior arts. Firefox needs all three in `brand.properties`; a single `name` field cannot fill the About dialog and a 12-char menu label | LOW | Do not ship one `name` field. Derive short/shorter from full only as a *default*, always overridable |
| **Machine identity separate from display identity** — `appId`, `binaryName`, `MOZ_MACBUNDLE_ID`, `MOZ_APP_REMOTINGNAME`/WM_CLASS, URI scheme prefix, config-dir name, npm scope | VSCodium's `dataFolderName`/`urlProtocol` exist because a rebrand that forgets them collides with the upstream install's profile directory | MEDIUM | PROJECT.md's `[identity]` section already has this. Add config-dir name and remoting name — they are separate surfaces from `binaryName` |
| **Generated Firefox branding directory + `--with-branding` wiring** | Firefox will not build branded without it; it is a directory of ~30 generated files, not a file | HIGH | Highest-cost single item. Linux-only cuts `.icns`, `msix/`, `stubinstaller/`, `VisualElements*`, `wiz*.bmp` — roughly halves it |
| **Icon set generated from one source asset** | A rebrander supplies one logo, not eight PNGs plus an ICO | MEDIUM | `default{16..256}.png` from one SVG at build time. `.ico`/`.icns` deferred with Windows/macOS |
| **Name written to every locale surface consistently** (`brand.ftl` `-brand-full-name`, `brand.properties`, `brand.dtd`) | Firefox reads different files on different paths; the window title resolves via the Fluent term | MEDIUM | Sourcerer's review already caught `brand.ftl` and `brand.properties` silently disagreeing within one variant. Generate all three from one manifest value; verify cross-file equality |
| **Theia frontend config generation** — `applicationName`, `defaultTheme`, `defaultIconTheme`, welcome/about text and logo | Theia's own documented branding surface | LOW-MEDIUM | Build-time only: `theia generate`/`theia build` read it, `theia start` does not |
| **Extension declarations with source + pin** | `theiaPlugins` (URL map) is the mechanism; surfer proves rebranders expect multiple source kinds | MEDIUM | Materialize to `theiaPlugins` at build. Every entry pinned — see anti-features |
| **URLs block** — support, release notes, update check, crash report, homepage, default search | `updateHostname` (surfer), `updateUrl`/`downloadUrl` (VSCodium). A fork that phones home to Mozilla's update server is broken and possibly a trademark problem | LOW | Pure string substitution; the cost is finding every consumer |
| **Legal block** — license type, copyright holder, trademark notice | Chromium `COPYRIGHT`, surfer `license.licenseType` + `ignoredFiles`. Mozilla trademark rules make this load-bearing, not decorative | LOW | Surfer's `ignoredFiles` regex (skip license headers on `.*\.json`) is worth copying |
| **Upstream pins** — Firefox ESR tag, Theia release | Reproducibility; surfer's `version{product,version,candidate}` | LOW | Already the contract of `fetch-upstream.sh` |
| **Unset ⇒ platform default fallback** | Every prior art merges downstream over upstream (VSCodium literally uses `jq` merge) | MEDIUM | Requires the defaults themselves to be a `configuration.toml` — Power Browser's own — so the merge has one code path, not two |
| **Enumerated branding-surface verification** | A rebrand you cannot prove is a rebrand you will ship half-done | MEDIUM-HIGH | Evolve the existing six-surface checklist: executable, `application.ini`, runtime identity, brand-full-name cross-file, desktop entry, `--version` output |
| **`docs/REBRANDING.md` stranger walkthrough** | The single-file claim is untestable without a written path through it | LOW | Should read as: clone, edit N fields, drop one SVG, build |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **One file + one asset folder, enforced by CI** | Genuinely unclaimed. Every competitor requires a manifest *plus* patches *plus* scripts. "If a rebrand requires a second file, that is a bug" is a testable property no one else asserts | HIGH | The enforcement is what makes it real: a test that rebrands from a fixture `configuration.toml` and asserts nothing else was touched |
| **Second downstream as proof** (Sourcerer reproduced from its own `configuration.toml` + logos) | The melon → gluon → surfer lineage is three abandoned single-product build tools in a row. Each died because it served exactly one browser. A base that demonstrably serves two is the adoption signal | MEDIUM | This is the acceptance test for the whole milestone, and it must be last in dependency order |
| **TOML, not JSON** | Comments survive (a JSON manifest cannot explain its own fields), `builtins.fromTOML` is native in Nix, trivially parsed on the Node/Theia side | LOW | The comment support is the real win — a rebrander's manifest is also their documentation |
| **Browser + IDE in one manifest** | No prior art unifies a Gecko branding directory and a Theia app config. Rebranding a Theia-in-Firefox product currently means learning two unrelated systems | MEDIUM | The unifying value is that `[product] name` lands in `brand.ftl` *and* `applicationName` *and* the welcome page from one edit |
| **Telemetry as declared config, default-off, with a shipped destination** | Theia gives adopters the preference schema and no destination. Power Browser can ship the destination and let `configuration.toml` point it anywhere | MEDIUM | Copy the enum verbatim: `off\|crash\|error\|all`, default `off`. Do not invent a different vocabulary |
| **Extension source kinds beyond Open VSX URL** (Open VSX id, npm, URL, local path) with mandatory pins | Surfer's `github`/`amo`/`url` split shows real forks need more than one registry. Local path is what makes a downstream's private extensions declarable | MEDIUM | Depends on extension declaration existing first |
| **Build-time-only capability flags** (the `sourcererPrivilegedJs` pattern) | Already proven in the codebase: a flag that `theia start` cannot re-read is immune to being talked into activation by any runtime input | LOW | Generalize the pattern into the manifest rather than re-deriving it per feature |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **`[telemetry] send-to-theia` toggle** | PROJECT.md assumes Theia has an upstream collector to mirror | It does not exist. Theia IDE ships zero telemetry and no destination. The toggle would be a field that can never do anything | `level` (`off\|crash\|error\|all`, default `off`) + `endpoint` + `filters`, matching Theia 1.74's actual preference schema |
| **Generic "grep the tree for the platform name" hardcode detector** | Sounds like the obvious way to enforce "no branding outside the manifest" | Already refuted in this codebase: upstream legitimately ships dozens of files named `firefox*`. A criterion that can only fail is not a criterion | Enumerated surface list with exact-equality assertions plus a coverage guard that fails if a surface never ran |
| **Runtime-reloadable `configuration.toml` / hot rebrand** | "Why rebuild to change a name?" | Branding is compiled into `application.ini`, the binary name, the desktop entry, and the Fluent bundle. A runtime path could not reach them, and a release build that re-reads its identity from disk can be talked into lying about what it is | Build-time only, stated explicitly in `REBRANDING.md`. Same reasoning as the existing `sourcererPrivilegedJs` flag |
| **Multi-brand matrix in one manifest** (Zen's `release` + `twilight`) | Nightly/beta channels look inevitable | Doubles every generator output and every verify surface, for a channel Power Browser does not yet ship. Zen needs it because Zen ships two products | One brand per `configuration.toml`. A second channel is a second manifest file, later. Keep `[build] channel` as a plain string in v1 |
| **Preference/policy defaults in `configuration.toml`** | "It's configuration, it belongs in the configuration file" | LibreWolf deliberately keeps `librewolf.cfg`/`policies.json` in a *separate repo* — prefs churn on a different cadence than brand identity and are 100× the field count. Merging them turns a 40-line manifest into a 4000-line one | Keep prefs out of v1. If needed later, `[prefs] file = "..."` pointing at a separate artifact, not inline keys |
| **Downstream patches to `upstream/`** | Fastest way to change something the manifest does not cover | Violates the inherited boundary rule ("downstreams add, never patch") and makes every ESR rebase a downstream's problem | If a surface is not reachable from the manifest, add the field to the manifest — that is the whole product |
| **"Everything configurable" schema in milestone 1** | The `configuration.nix` analogy invites it | Every field costs a generator branch *and* a verify surface *and* a docs line. PROJECT.md already scoped this out | Branding, identity, telemetry, extensions, URLs, legal, pins. Grow incrementally, each field earning its verify surface |
| **Windows/macOS asset generation in v1** | The Firefox branding dir has slots for them | `.icns`, `Assets.car`, `dsstore`, `msix/`, `stubinstaller/`, `VisualElements*`, `wiz*.bmp` are a large fraction of the directory and untestable on a Linux host | Generate the Linux subset; leave the rest as upstream-inherited placeholders with a documented gap |
| **Unpinned extension fetch from a marketplace at build time** | Convenient — "always get the latest" | Non-reproducible builds and a supply-chain hole: a rebrander's build silently changes when a third party publishes | Every `[extensions]` entry carries a pin. No pin = build error |
| **GUI rebrand wizard / schema-driven config UI** | "Non-developers should not edit TOML" | The manifest *is* the UI. A wizard is a second surface that drifts from the schema, and TOML with comments is already the accessible format | `REBRANDING.md` plus a heavily commented default `configuration.toml` |

## Feature Dependencies

```
[schema + TOML parser + defaults merge]
    └──requires──> nothing (foundation)
         │
         ├──enables──> [generator: Firefox branding directory]
         │                  └──requires──> [icon rasterization from brand/ SVG]
         │                  └──enables──> [identity surfaces: executable name,
         │                                 application.ini, desktop entry,
         │                                 --version output, brand.ftl/.properties]
         │
         ├──enables──> [generator: Theia frontend config]
         │                  ├──enables──> [welcome/about branding]
         │                  ├──enables──> [telemetry level + endpoint wiring]
         │                  └──enables──> [extension declarations -> theiaPlugins]
         │
         ├──enables──> [URLs, legal, upstream pins substitution]
         │
         └──enables──> [verification: enumerated surface checklist]
                            └──requires──> generator output to exist first
                                    │
                                    └──enables──> [Sourcerer-as-downstream proof]
                                                   (acceptance test — needs ALL above)

[runtime config reload] ──conflicts──> [build-time verification]
[prefs/policies in manifest] ──conflicts──> [manifest stays human-scale]
[multi-brand matrix] ──conflicts──> [one-file guarantee]
```

### Dependency Notes

- **Everything requires the schema + defaults merge.** Power Browser's own defaults should themselves be a `configuration.toml`, so the merge has exactly one code path. Two code paths (defaults-in-code + overrides-from-file) is where "unset falls back" quietly diverges.
- **Firefox branding directory requires icon rasterization.** `default{16..256}.png` are generated files; there is no branding directory without them. Rasterization is the gating sub-task, not an afterthought.
- **Verification requires the generator, and reads the same manifest.** If verify hardcodes its expectations instead of reading `configuration.toml`, it passes for Power Browser and fails for every downstream — which is the exact bug the milestone exists to prevent.
- **Sourcerer-as-downstream proof requires all of the above.** It is the acceptance test for the milestone and must be the last phase. It is also the only test that can catch a field the generator handles but the schema does not expose.
- **Extension declaration → `theiaPlugins` → Theia build.** The declaration is inert until the build step materializes it into `theiaPluginsDir`; treat them as one feature, not two.
- **Runtime reload conflicts with build-time verification.** If the manifest can change after build, no verification result stays true. Pick build-time; the codebase already made this call for `sourcererPrivilegedJs`.
- **Name-to-locale generation must be atomic across three files.** `brand.ftl`, `brand.properties`, and `brand.dtd` disagreeing silently is a real defect already caught once here (03-REVIEW.md WR-01). Generate together, verify cross-file equality, never one at a time.

## MVP Definition

### Launch With (v1)

- [ ] **TOML schema + parser + defaults merge** — nothing else can exist first
- [ ] **`[product]` / `[identity]` / `[legal]` / `[urls]` / `[upstreams]` sections** — the field set every prior art has; cheap once the schema exists
- [ ] **Generated Firefox branding directory (Linux subset) + `--with-branding` wiring** — the build does not brand without it
- [ ] **Icon rasterization from one `brand/` SVG to `default{16..256}.png`** — gates the branding directory
- [ ] **Atomic `brand.ftl` + `brand.properties` + `brand.dtd` generation** — the cross-file disagreement is a known defect class here
- [ ] **Theia frontend config generation** (`applicationName`, `defaultTheme`, welcome/about text + logo) — the IDE half of the identity
- [ ] **Enumerated verification, reading the manifest not constants** — makes the guarantee testable rather than asserted
- [ ] **`docs/REBRANDING.md`** — the single-file claim is untestable without it
- [ ] **Sourcerer reproduced as a downstream `configuration.toml`** — the acceptance test; without a second consumer this is a rename, not a platform

### Add After Validation (v1.x)

- [ ] **`[telemetry]` with Theia's `off\|crash\|error\|all` level + endpoint + one shipped destination** — trigger: a downstream actually asks to collect something. Default-off means shipping it late costs nothing
- [ ] **`[extensions]` with multiple source kinds (Open VSX / npm / URL / local) and mandatory pins** — trigger: Sourcerer's curated addon set needs declaring. Start with Open VSX URL only, matching `theiaPlugins` natively
- [ ] **Second-file-touched CI guard** (rebrand a fixture, assert no other file changed) — trigger: after the generator stabilizes; premature, it just churns
- [ ] **`[build] channel` variants beyond one brand** — trigger: an actual beta/nightly channel exists

### Future Consideration (v2+)

- [ ] **Windows/macOS branding assets** (`.icns`, `.ico`, `VisualElements`, `msix/`, `stubinstaller/`) — defer with the platform packaging that needs them; untestable on the current Linux host
- [ ] **Prefs/policies pointer** (`[prefs] file = "..."`, never inline keys) — LibreWolf's split says this is a separate artifact when it arrives
- [ ] **Multi-brand matrix in one manifest** — only if Power Browser itself ships two channels
- [ ] **Manifest schema published for third-party tooling** — only worth it once external downstreams exist

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TOML schema + defaults merge | HIGH | LOW | P1 |
| Firefox branding directory generator (Linux) | HIGH | HIGH | P1 |
| Icon rasterization from one SVG | HIGH | MEDIUM | P1 |
| Atomic brand.ftl/.properties/.dtd generation | HIGH | LOW | P1 |
| Machine identity fields (appId, binary, remoting, URI, config dir) | HIGH | MEDIUM | P1 |
| Theia frontend config generation | HIGH | LOW | P1 |
| Enumerated verification reading the manifest | HIGH | MEDIUM | P1 |
| URLs / legal / upstream pins | MEDIUM | LOW | P1 |
| `REBRANDING.md` | HIGH | LOW | P1 |
| Sourcerer downstream proof | HIGH | MEDIUM | P1 |
| Telemetry level + endpoint + destination | MEDIUM | MEDIUM | P2 |
| Extension declarations with pins | MEDIUM | MEDIUM | P2 |
| Second-file-touched CI guard | MEDIUM | MEDIUM | P2 |
| Multi-source extension kinds (npm/local) | LOW | MEDIUM | P3 |
| Windows/macOS assets | LOW | HIGH | P3 |
| Prefs/policies pointer | LOW | MEDIUM | P3 |
| Multi-brand matrix | LOW | HIGH | P3 |
| GUI rebrand wizard | LOW | HIGH | never |

## Competitor Feature Analysis

| Feature | Zen / surfer | VSCodium | LibreWolf | Our Approach |
|---------|--------------|----------|-----------|--------------|
| Single manifest | `surfer.json` — but needs `src/` overlay + patches too | `product.json` — but needs patches + env placeholders + icon scripts | mozconfig flag + a whole separate settings repo | `configuration.toml` + `brand/` only; second file touched = bug, enforced in CI |
| Format | JSON (no comments) | JSON (no comments) | Python/JSON split | TOML — comments make the manifest self-documenting; `builtins.fromTOML` for Nix |
| Name fields | three lengths per brand | `nameShort` + `nameLong` | inherits Firefox's three | three lengths, short/shorter defaulted from full but overridable |
| Machine identity | `appId`, `binaryName` | `applicationName`, `dataFolderName`, `urlProtocol` | branding dir | full set: appId, binary, mac bundle, remoting/WM_CLASS, URI scheme, config dir, npm scope |
| Icons | generated by `generateBranding` | replaced by build scripts | hand-maintained in branding dir | generated from one SVG; Linux subset in v1 |
| Extensions | `addons{}` with github/amo/url + versions | `extensionsGallery` URLs only | n/a | `[extensions]` id + source + mandatory pin → `theiaPlugins` |
| Telemetry | not modeled | strips Microsoft's | strips Mozilla's | modeled explicitly: Theia's `off\|crash\|error\|all`, default off, own endpoint |
| Update endpoint | `updateHostname` | `updateUrl` + `downloadUrl` | patched | `[urls]` block covering update, crash, support, release notes |
| Verification | none | none | none | enumerated surface checklist with exact equality + coverage guard — nobody else ships this |
| Second consumer | one product (Zen) | one product | one product | Sourcerer, as the milestone's acceptance test |

## Source Confidence

The `classify-confidence` seam grades by **transport**, and returned `LOW` for both `websearch` and `webfetch` (even with `--verified`). Recording that honestly. The underlying artifacts differ substantially in authority, so both are listed:

| Claim group | Transport tier (seam) | Artifact | Practical reliability |
|-------------|----------------------|----------|----------------------|
| surfer.json key list | LOW | `raw.githubusercontent.com/zen-browser/desktop/dev/surfer.json` — the live file, read verbatim | High — canonical |
| Firefox branding directory listing | LOW | searchfox directory listing of `browser/branding/unofficial`, read verbatim | High — canonical |
| `configure.sh` sets only `MOZ_APP_DISPLAYNAME` + `MOZ_MACBUNDLE_ID` | LOW | searchfox file contents | High — canonical |
| Theia telemetry framework (1.74, `telemetry.telemetryLevel`, no shipped destination) | LOW | theia-ide.org official Data Usage and Telemetry page | High — official docs |
| VSCodium `product.json` fields | LOW | DeepWiki summary of VSCodium repo, not the file itself | Medium — verify field names against the repo before coding |
| Chromium BRANDING fields | LOW | search summary of chromium.googlesource.com | Medium — verify against the real file |
| surfer config schema details (`addons` source kinds, `buildOptions`) | LOW | DeepWiki configuration reference; partially corroborated by the live `surfer.json` | Medium |
| melon → gluon → surfer abandonment lineage | LOW | search summary of repo READMEs | Medium — directionally sound, exact attribution of "author stopped" is ambiguous between gluon and surfer |
| Sourcerer's six-surface checklist and the refuted grep criterion | n/a | read directly from `/home/chris/coding/sourcerer/scripts/verify-branding-identity.mjs` | High — local source |

**Before coding against them, verify:** VSCodium's exact `product.json` key names and Chromium's exact `BRANDING` keys against the real files. Everything marked canonical above was read verbatim and needs no re-check.

## Sources

- zen-browser/desktop `surfer.json` (dev branch) — https://github.com/zen-browser/desktop/blob/dev/surfer.json
- zen-browser/surfer — https://github.com/zen-browser/surfer
- Surfer configuration reference (DeepWiki) — https://deepwiki.com/zen-browser/surfer/7-configuration-reference
- pulse-browser/gluon — https://github.com/pulse-browser/gluon
- VSCodium product configuration (DeepWiki) — https://deepwiki.com/VSCodium/vscodium/6-product-configuration
- microsoft/vscode `product.json` — https://github.com/microsoft/vscode/blob/main/product.json
- Chromium `chrome/app/theme/chromium/BRANDING` — https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/app/theme/chromium/BRANDING
- Firefox Branding, Firefox Source Docs — https://firefox-source-docs.mozilla.org/browser/branding/docs/index.html
- `browser/branding/unofficial/` on searchfox — https://searchfox.org/firefox-main/source/browser/branding/unofficial
- LibreWolf settings docs — https://www.librewolf.net/docs/settings/
- Theia: Data Usage and Telemetry — https://theia-ide.org/docs/data_usage_telemetry/
- Theia: Extensions and Plugins — https://theia-ide.org/docs/extensions/
- Theia: Extending/Adopting the Theia IDE — https://theia-ide.org/docs/blueprint_documentation/
- `@theia/cli` README — https://github.com/eclipse-theia/theia/blob/master/dev-packages/cli/README.md
- Local: `/home/chris/coding/sourcerer/scripts/verify-branding-identity.mjs`, `verify-branding.mjs`, `docs/CUSTOMIZE.md`

---
*Feature research for: rebrandable browser/IDE distribution platform*
*Researched: 2026-08-29*
