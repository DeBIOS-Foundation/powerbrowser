# Stack Research

**Domain:** Rebrandable Firefox-ESR fork platform (Zen-style `upstream/ + patches/ + own tree`) hosting an Eclipse Theia sidecar, driven by a single `configuration.toml` manifest
**Researched:** 2026-08-29
**Confidence:** HIGH (most decisions verified against the live sourcerer tree, the vendored Firefox ESR source, the npm registry, and a running Nix 2.34.8)

---

## Verdict

There is no "standard 2026 stack" to adopt wholesale — there is exactly one piece
of real prior art (Zen's **surfer**), and Power Browser should copy its *shape*
(one manifest + a template directory + a generator) while rejecting its
*implementation* (a 20-dependency npm CLI that owns your whole build and copies
generated branding into the vendored Firefox tree).

The correct stack is almost entirely **already in the sourcerer tree** and should
be carried over unchanged. The genuinely new surface is small: a TOML parser for
Node, an SVG rasterizer, and ~400 lines of plain Node ESM. **Three new
dependencies total.** Anything more is over-building.

---

## Recommended Stack

### Core Technologies (inherited — carry over, do not re-decide)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Firefox ESR | `153.1.0esr` (tag `FIREFOX_153_1_0esr_RELEASE`) | Browser substrate | Mozilla product-details (2026-08-29) lists `FIREFOX_ESR_NEXT = 153.1.0esr` and `FIREFOX_ESR = 140.14.0esr`. Sourcerer already pins ESR-next, which is the correct forward-looking pin during the ESR overlap window. **Confidence: HIGH** (live product-details JSON) |
| Zen-style fork layout | n/a | `upstream/` (pinned tag, never committed) + `patches/` + `powerbrowser/` tree + `upstream/powerbrowser -> ../powerbrowser` symlink | Already proven in sourcerer. The symlink is what lets `--with-branding=powerbrowser/branding/release` resolve inside topsrcdir while the branding files live in *our* repo, not in the disposable vendored tree. This is strictly better than surfer's approach of generating into `engine/browser/branding/`. **Confidence: HIGH** (read from the live tree) |
| Eclipse Theia | **pin `1.74.1`** (latest is `1.75.0`, published 2026-08-27) | IDE sidecar | Do not bundle a Theia bump into an extraction/rename milestone. `1.74.1` is the version the working sourcerer tree builds and smoke-tests against, including the `@theia/monaco-editor-core@1.108.201` pairing. Bump in a separate milestone. **Confidence: HIGH** |
| Node.js | `22.x` for the Theia toolchain | Theia backend + native modules | Sourcerer's flake pins `nodejs_22` *and* overrides `yarn` to run on it, because nixpkgs' `yarn` shebang hard-codes the default Node (24.x) and would build `drivelist`'s node-gyp native module for the wrong `MODULE_VERSION`. Keep this override verbatim. **Confidence: HIGH** (documented in `flake.nix` with the failure mode) |
| Yarn | `1.22.x` (classic) | Theia workspace build | `theia/package.json` declares `"yarn": ">=1.7.0 <2"`. `@theia/cli` builds are validated against yarn 1; switching package managers during an extraction is gratuitous risk. **Confidence: HIGH** |
| TypeScript | `~5.9.3` | Theia extensions | **Do not take `typescript@7.x`** (latest is `7.0.2`, the Go-native rewrite). Theia 1.74's `tsc -b` project-references build and its `@theia/*` `.d.ts` surface are validated on 5.x. **Confidence: HIGH** |
| React | `18.3.1` (+ `@types/react@18.3.31`) | Theia widgets | Pinned by Theia 1.74. Not a choice. **Confidence: HIGH** |
| Nix flake | `nixpkgs-unstable`, Nix `2.34.8` | Two dev shells (`theia`, `firefox`) | Supplies the entire Gecko toolchain via `inputsFrom = [ firefox-esr-153-unwrapped ]` plus `mkShell.override { stdenv = llvmPackages.stdenv; }`. Reproducing that by hand is days of work. **Confidence: HIGH** |
| `mach` + `.mozconfig` | ships with ESR | Firefox build driver | Not optional. **The `.mozconfig` becomes a generated file** (see Generator, below). **Confidence: HIGH** |

### New Dependencies (the entire net addition)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **`smol-toml`** | `1.8.0` (published 2026-08-11) | Parse (and stringify) `configuration.toml` in Node | **Zero runtime dependencies**, ESM + CJS, `engines.node >= 18`, BSD-3-Clause, 109 KB unpacked, TOML 1.0.0-correct, actively maintained. `stringify` is a bonus: it is how you machine-generate the downstream Sourcerer `configuration.toml` that proves the mechanism. **Confidence: HIGH** (registry metadata read directly) |
| **`sharp`** | `0.35.4` (published 2026-08-26) | Rasterize `brand/logo.svg` → `default{16,32,48,64,128}.png`, and resize PNG→PNG for the About logo | Prebuilt N-API binaries for linux-x64/arm64 with **no system libraries required**, so a stranger who clones the repo does not have to install librsvg first. Actively maintained. Handles both the SVG path and the "downstream only has a PNG" path with one dependency. **Confidence: HIGH** for maintenance/format support; **MEDIUM** on rasterization fidelity — see the `density` pitfall below |
| **`builtins.fromTOML`** | built into Nix (verified on 2.34.8) | `flake.nix` reads `[upstreams]` pins from the same manifest | No dependency at all. Verified live: handles tables, arrays of tables, multi-line strings, floats, bools, dotted keys. Gives one source of truth for the ESR tag across the Nix shell and `fetch-upstream.sh`. **Confidence: HIGH** (tested empirically this session) |

That is the complete list. Everything else the generator needs is `node:fs`,
`node:path`, and template literals.

### Development / Verification Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `desktop-file-validate` (nixpkgs `desktop-file-utils` 0.28) | Validate every generated `.desktop` file | Free correctness gate on generated output; one line in the verify script. Add `pkgs.desktop-file-utils` to the flake. |
| `sccache` | Gecko rebuild cache | Already wired (`RUSTC_WRAPPER=sccache`, `--with-ccache=sccache`). Exported **after** the `unset AS LD NM ...` line — order is load-bearing. |
| Plain Node `.mjs` scripts, no test framework | All verification | Sourcerer's `scripts/*.mjs` deliberately carry **zero npm dependencies** and run under bare `node`. Preserve this: `verify-branding-identity.mjs` must be runnable before `yarn install` ever happens. |
| `scripts/lib/firefox-bidi.mjs` (vendored) | WebDriver BiDi driving of the built browser | Already exists (15 KB). Live-page assertions beat reading source, per the existing `D-64` "vacuous pass" rule. |
| `git grep` / Node regex walk | "no hardcoded brand string outside the manifest" gate | Do not add ripgrep as a dependency; extend the existing `.mjs` verifier. |

---

## Installation

```bash
# Root tooling package (new): the generator's only two deps.
# Keep this SEPARATE from theia/package.json — the generator must be
# installable and runnable without the Theia workspace existing.
npm install --save-exact smol-toml@1.8.0 sharp@0.35.4

# Nix shells (existing flake, two additions)
#   theia shell:   unchanged (nodejs_22 + overridden yarn + python3 + pkg-config)
#   firefox shell: add pkgs.desktop-file-utils  (validate generated .desktop)
#                  add pkgs.librsvg             (optional rsvg-convert fallback)

# Theia sidecar (existing)
cd theia && yarn install && yarn build
```

---

## The Generator: prescribed design

One file, `scripts/generate-brand.mjs`, plain Node ESM, run before `mach build`
and before `yarn build`. Idempotent. Supports `--check` (regenerate to a temp dir
and diff; non-zero exit on drift) so CI proves generated output is in sync.

### Surface map — what it writes, from which manifest key

| Generated artifact | Manifest source | Notes |
|---|---|---|
| `powerbrowser/branding/<variant>/configure.sh` | `[product] name` | `MOZ_APP_DISPLAYNAME="..."` (+ `MOZ_APP_REMOTINGNAME` for non-release variants) |
| `.../locales/en-US/brand.ftl` | `[product] name`, `short_name`, `vendor` | `-brand-{shorter,short,shortcut,full}-name`, `-vendor-short-name`, `trademarkInfo`. **Keep `-brand-product-name = Firefox`** — a small set of "requires Firefox" compat strings interpolate it (sourcerer's D-78) |
| `.../locales/en-US/brand.properties` | same | Must agree byte-for-byte with `brand.ftl` — the existing verifier already fails on divergence (WR-01) |
| `.../locales/{jar.mn,moz.build}`, `.../content/{jar.mn,moz.build}` | none (static) | Copy from template unchanged |
| `.../moz.build` | none (static) | `include("../../../browser/branding/branding-common.mozbuild"); FirefoxBranding()` — the `../../../` depth is fixed by the symlink layout |
| `.../default{16,32,48,64,128}.png` | `[assets] logo_svg` | **Exactly these five** for Linux — verified in `browser/branding/branding-common.mozbuild`, which only adds those five under `MOZ_WIDGET_TOOLKIT == "gtk"`. Upstream `unofficial/` also ships 22/24/256 but the gtk template does not install them |
| `.../pref/firefox-branding.js` | `[telemetry]`, `[urls]` | The prefs that gate unattended callouts. Sourcerer's file is a hard-won ledger (OpenH264/`extensions.update.autoUpdateDefault`, GMP manager, NetworkConnectivityService, DNS prefetch). **Port it verbatim as the template's static body**; only the URL-valued prefs are substituted |
| `.mozconfig` | `[identity]`, `[build]`, `[upstreams]` | `--with-app-basename`, `--with-distribution-id`, `--with-branding`, `MOZ_APP_REMOTINGNAME`, objdir |
| `powerbrowser/<binary>-<variant>.desktop` | `[product]`, `[identity]`, install prefix | Currently hand-written with an absolute `/home/chris/...` path — that alone justifies generation |
| `theia/applications/browser/package.json` → `theia.frontend.config` | `[product]`, `[theia]`, `[telemetry]` | See "Theia side" below |
| `theia/applications/browser/package.json` → `dependencies` | `[extensions]` | id + source + pin |
| `flake.nix` **reads** `[upstreams]` (not generated) | `[upstreams] firefox_esr_tag` | `builtins.fromTOML (builtins.readFile ./configuration.toml)` |

### Theia side: use frontend config custom keys, not code generation

Sourcerer already proves the pattern — `theia.frontend.config.sourcererPrivilegedJs`
is a **custom key** read at runtime through `FrontendApplicationConfigProvider`
(D-62), and the existing `verify-branding.mjs` reads it live in the page over BiDi.

Put every user-visible Theia brand value there (`applicationName`, welcome text,
about text, repo URL, logo path) and have `@powerbrowser/branding` read them from
the provider. **Do not** generate a `generated-brand.ts` module and rebuild the
extension on every rebrand — that turns a config edit into a TypeScript compile.
The `package.json` `theia` block is already a build-time input; one generated
JSON blob there covers the whole surface.

**Confidence: HIGH** — the mechanism, and a headless test for it, already exist in
the tree.

### No templating engine

Surfer does `stringTemplate(fileContents, brandingConfig)` — plain `${var}`
substitution over a `template/branding.optional/` directory tree, then fills any
remaining gaps by copying `browser/branding/unofficial/`. That is the right
amount of machinery. Use `String.prototype.replace` with a
`/\{\{(\w+)\}\}/g` callback that **throws on an unknown key** (so a typo in a
template fails the build instead of silently emitting `{{brandFulName}}`).

Do not add Handlebars/Mustache/EJS/Nunjucks.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Write our own ~400-line generator | **Zen's `@zen-browser/surfer` 1.14.8** | If you wanted surfer to own download, bootstrap, patch, build, package, and update. It does all of that, pulls ~20 deps (axios, execa, fs-extra, commander, prompts, xmlbuilder2…), and generates branding *into* the vendored Firefox tree. Power Browser already has `fetch-upstream.sh`, `apply-patches.sh`, `rebase-upstream.sh` and a Nix toolchain that surfer does not know about. **Steal the schema, not the tool.** Worth re-reading `src/commands/patches/branding-patch.ts` before writing ours |
| `sharp` for rasterization | `rsvg-convert` (nixpkgs `librsvg` 2.62.3) | If you decide the generator may assume the Nix shell. One shell-out per size, deterministic, zero npm deps. Genuinely tempting; rejected only because "a stranger clones and builds" is the project's stated core value and this adds a system prerequisite |
| `sharp` | `resvg` CLI (nixpkgs 0.48.1) | Best pure-Rust SVG fidelity, self-contained font handling. Same system-prerequisite objection |
| `sharp` | `@resvg/resvg-js` 2.6.2 | Note: surfer *imports* `renderAsync` from it but the import is effectively dead — surfer requires pre-rendered `logo{16..512}.png`. Last published **2024-03**; stale. Deriving sizes from one SVG is a real improvement over surfer, so don't inherit its dead dep |
| Hand-rolled schema validation (~60 lines: required-key table + type checks) | `zod` / `ajv` + JSON Schema | If `configuration.toml` grows past ~50 keys or a third party needs a machine-readable schema. Until then a declarative key table gives better error messages to non-developers ("`[product] name` is required — set it in configuration.toml line N") than a Zod issue array |
| Node parses the TOML | Nix `fromTOML` → `configuration.json` → Node `JSON.parse` | Would drop `smol-toml` entirely, but makes **Nix mandatory to build**, which contradicts the core value. Use `fromTOML` only for the pins the flake itself needs |
| One generated `.mozconfig` | Hand-maintained `.mozconfig` + env vars | Never — `--with-branding`, `--with-app-basename` and `--with-distribution-id` are all manifest-derived. A hand-maintained mozconfig *is* the second file a rebrander has to edit, which is the bug the project exists to prevent |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `typescript@7.x` | Latest is `7.0.2` (Go-native rewrite). Theia 1.74's project-references `tsc -b` build and `@theia/*` typings are validated on 5.x. Unrelated risk in a rename milestone | `typescript@~5.9.3` |
| `@theia/core@1.75.0` in this milestone | Latest (2026-08-27), but the extraction milestone should change **names only**. A version bump underneath a rename makes every failure ambiguous | Pin `1.74.1`; bump in its own milestone |
| Yarn 2+/Berry, pnpm, npm for the Theia workspace | `theia/package.json` declares `"yarn": ">=1.7.0 <2"`; `@theia/cli`'s `rebuild:browser`/`build` path assumes yarn 1 hoisting | Yarn 1.22 classic |
| `@iarna/toml` | Last publish **2020-04**, TOML 0.5 era, unmaintained | `smol-toml@1.8.0` |
| `@ltd/j-toml` | Last publish **2023-01** | `smol-toml@1.8.0` |
| `toml` (BinaryMuse) / `js-toml` | Both are alive (2026) and target TOML **1.1.0**, which is *not* a finished spec. Writing 1.1-only syntax would silently break `builtins.fromTOML`, which is 1.0.0 | `smol-toml@1.8.0` — TOML 1.0.0, the version Nix also implements |
| A hand-rolled TOML subset parser | Users will write valid TOML your subset mis-parses; a wrong parse of a branding manifest is a shipped-with-wrong-name build | `smol-toml` |
| TOML **date/time literals** anywhere in `configuration.toml` | **Verified this session:** `builtins.fromTOML` *errors* on both `d = 1979-05-27T07:32:00Z` and `d = 1979-05-27`, while `smol-toml` parses them into a `TomlDate`. The two readers would disagree, and Nix would hard-fail | Quote all dates as strings: `release_date = "2026-08-29"` |
| Committing generated branding output | It is derived state; a stale commit and a fresh generate diverge silently | `.gitignore` the generated dirs; add `generate-brand.mjs --check` to CI |
| Generating into `upstream/browser/branding/` (surfer's model) | `upstream/` is disposable and re-fetched at the pinned tag. Anything written there is destroyed on rebase and invisible to `git status` | Keep branding in `powerbrowser/branding/<variant>/`, reached via the `upstream/powerbrowser` symlink |
| `npm install`-time postinstall hooks to run the generator | Firefox side must be buildable without ever touching npm lifecycle scripts | Explicit `scripts/generate-brand.mjs` invocation in the documented build steps |
| Adding `zod`/`ajv`/`chalk`/`commander` to the generator | Every dep is one more thing a stranger's `npm ci` can fail on before they have a browser | `node:util.parseArgs`, `process.exitCode`, plain strings |

---

## Stack Pitfalls (specific, load-bearing)

**1. `sharp` + SVG needs `density`, not `resize`. — Confidence: MEDIUM-HIGH**
`sharp(svg).resize(16,16)` rasterizes the SVG at its intrinsic size (72 dpi) and
then *downsamples*, which blurs small icons. Rasterize at the target size
instead: `sharp(svgBuffer, { density: 72 * targetPx / intrinsicPx })`. Verify by
eye on `default16.png` — this is exactly the size where the mistake shows.
Corollary: **require logo SVGs to have text converted to paths**, and document it
in `REBRANDING.md`. sharp's SVG text rendering goes through fontconfig and will
not match across machines.

**2. Brand strings currently live inside `patches/`. — Confidence: HIGH**
`patches/010-sourcerer-identity.patch` sets `imply_option("MOZ_APP_VENDOR", "Deocracy")`
and `020` sets `BROWSER_CHROME_URL` to `chrome://sourcerer/...` and
`DIRS += ["../sourcerer/shell"]`. If patches carry brand strings, a rebrand
requires regenerating patches — the exact failure mode this project forbids.

**Rule to adopt: the internal namespace is fixed at `powerbrowser`; only
user-visible strings come from `configuration.toml`.** Chrome URLs, directory
names, and the npm scope stay `powerbrowser` in every downstream. That makes the
patch set brand-invariant and rebasable forever.

`MOZ_APP_VENDOR` is the one genuinely user-visible value stuck in a patch.
`toolkit/moz.configure` declares it with `env="MOZ_APP_VENDOR"`, so the intended
route is `mk_add_options "export MOZ_APP_VENDOR=..."` in the generated
`.mozconfig`, with the `imply_option` line dropped from the patch. **This needs a
real `configure` run to confirm** — `imply_option` conflicts with an explicitly
set option, and `toolkit/moz.configure:103-106` `die()`s if no value is supplied
at all. Flag this for phase-level verification; fallback is a templated patch.

**3. `--with-branding` path depth is fixed by the symlink. — Confidence: HIGH**
`powerbrowser/branding/<variant>/moz.build` must `include("../../../browser/branding/branding-common.mozbuild")`.
Three levels up resolves to topsrcdir *only* through `upstream/powerbrowser -> ../powerbrowser`.
If the generator ever emits branding at a different nesting depth, that include
breaks. Keep the depth constant; make the variant name the only variable.

**4. Node version split is deliberate. — Confidence: HIGH**
The generator must run on any Node ≥18 (it is a stranger's first command). The
Theia sidecar must run on Node 22 with the yarn override. Do not couple them —
no shared `node_modules`, no shared `package.json`.

**5. `verify-branding-identity.mjs` is the asset to evolve, not replace. — Confidence: HIGH**
604 lines already implement a six-surface exact-equality identity check
(executable name, `application.ini`, live runtime identity via a real headless
launch, `brand.ftl`+`brand.properties` cross-agreement, `.desktop`, `--version`
string), with cross-variant positive controls. The "no hardcoded brand string
outside the manifest" requirement is a **seventh surface on that file**, not a new
script.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@theia/core@1.74.1` | `@theia/monaco-editor-core@1.108.201` | Pinned pair; `resolutions` in `theia/package.json` forces it across the workspace. Do not bump one alone |
| `@theia/*@1.74.1` | `typescript@~5.9.3`, `react@18.3.1`, `@types/react@18.3.31` | React 19 types will break Theia widget typings |
| `nodejs_22` | `yarn` **overridden** to the same Node | nixpkgs `yarn` otherwise runs node-gyp under Node 24 → `MODULE_VERSION` mismatch → `drivelist` fails to load in the Node 22 backend |
| `smol-toml@1.8.0` | Node ≥18, `builtins.fromTOML` (Nix ≥2.x) | Both implement TOML **1.0.0**. Agreement holds only if the manifest avoids date/time literals |
| `sharp@0.35.4` | Node ≥20.9.0 (Node-API v9) | Generator's real floor is therefore Node 20.9, not 18 |
| Firefox ESR `153.1.0esr` | `rustc 1.97.1` / `cargo 1.97.0` / `cbindgen 0.29.4` | Recorded in `toolchain-baseline.txt`; supplied by the `firefox` dev shell via `inputsFrom` |
| Firefox ESR `153.x` | `llvmPackages.stdenv` (clang), **not** gcc | `mkShell` defaults to gcc and `mach build` fails at "Could not find clang to generate run bindings" |

---

## Sources & Confidence

| Source | Provider | Confidence |
|---|---|---|
| `/home/chris/coding/sourcerer` — `flake.nix`, `.mozconfig`, `patches/`, `sourcerer/branding/**`, `scripts/**`, `theia/package.json` | local (primary) | HIGH |
| `upstream/browser/branding/branding-common.mozbuild`, `browser/branding/unofficial/**`, `toolkit/moz.configure` (vendored ESR 153.1.0) | local (upstream source) | HIGH |
| npm registry metadata for `smol-toml`, `sharp`, `@theia/core`, `typescript`, `@resvg/resvg-js`, `js-toml`, `toml`, `@iarna/toml`, `@ltd/j-toml` | registry API | HIGH |
| `product-details.mozilla.org/1.0/firefox_versions.json` (2026-08-29) | Mozilla official | HIGH |
| `builtins.fromTOML` behaviour incl. datetime failure | empirical, Nix 2.34.8 | HIGH |
| nixpkgs-unstable versions: `librsvg` 2.62.3, `resvg` 0.48.1, `desktop-file-utils` 0.28 | `nix eval` | HIGH |
| `zen-browser/desktop` `surfer.json`; `zen-browser/surfer` `package.json` + `src/commands/patches/branding-patch.ts` (v1.14.8) | GitHub raw | HIGH |
| Node has no built-in TOML parser | empirical (Node v24.19.0) + web search | HIGH |
| LibreWolf / Waterfox / Floorp rebrand tooling | web search only, no source read | LOW — none of them ship a manifest-driven generator; they use patch trees + Makefiles. No usable prior art beyond surfer. Do not plan around this |
