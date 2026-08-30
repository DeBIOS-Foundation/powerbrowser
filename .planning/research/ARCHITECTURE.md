# Architecture Research

**Domain:** Rebrandable Firefox-ESR fork platform (midstream) + Theia sidecar, driven by a single declarative config file
**Researched:** 2026-08-29
**Confidence:** HIGH for everything derived from direct inspection of `/home/chris/coding/sourcerer` (I read the actual files listed in Sources). MEDIUM-to-LOW for the external precedent (Zen Browser's `surfer`); the confidence seam classifies `webfetch` as LOW, so surfer is used as corroboration that this shape works in production, never as a load-bearing claim.

---

## Executive answer

Three findings shape everything below.

1. **Debranding is not renaming.** Mozilla's trademark policy requires renaming the *product*, not internal symbols. Internal identifiers (`chrome://powerbrowser/`, `PowerBrowserAPI.sys.mjs`, `@powerbrowser/*`, the `powerbrowser.*` pref branch, `POWERBROWSER_*` env vars) stay fixed forever across every downstream. Only user-visible surfaces are configurable. This roughly halves the generator's scope and removes the riskiest churn.

2. **Nothing generated is committed; nothing committed contains a brand literal.** Every generated artifact lands under one gitignored `generated/` root, produced either by synthesis or from a `templates/*.in` file containing `@PLACEHOLDER@` and zero brand strings. This makes the verifier's job a tractable grep instead of sourcerer's abandoned "`grep -ri firefox` comes back empty" criterion, which that project already documented as unachievable.

3. **The generator composes; it does not template everything.** `sourcerer/branding/*/pref/firefox-branding.js` is ~150 lines of dense endpoint-hardening policy with one brand-varying line. Turning that into a template would destroy the comments that are its actual value. The generator concatenates a verbatim platform fragment with a small generated brand fragment.

---

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│  SOURCE OF TRUTH  (2 things a rebrander touches, nothing else)         │
│                                                                        │
│    configuration.toml            brand/                                │
│    [product][identity][assets]     logo.svg                            │
│    [telemetry][extensions]         (optional per-variant overrides)     │
│    [urls][legal][theia]                                                │
│    [upstreams][build]                                                   │
└──────────────┬──────────────────────────────────┬──────────────────────┘
               │                                  │
   builtins.fromTOML                     tools/generate.mjs
   (pins ONLY: ESR tag,                  (the ONE TOML parser
    Theia ver, Node ver)                  for everything else)
               │                                  │
               ▼                                  ▼
┌──────────────────────────┐   ┌────────────────────────────────────────┐
│ flake.nix                │   │ generated/            (GITIGNORED)     │
│  devShells.theia         │   │  env.sh          ← sourced by bash      │
│  devShells.firefox       │   │  mozconfig       ← MOZCONFIG=           │
│  (toolchains only)       │   │  identity.configure  ← moz.configure    │
└──────────────────────────┘   │  branding/{dev,release}/               │
                               │    configure.sh  moz.build             │
                               │    default{16,32,48,64,128}.png        │
                               │    pref/firefox-branding.js            │
                               │    locales/en-US/{brand.ftl,           │
                               │                   brand.properties}    │
                               │    content/{jar.mn,moz.build}          │
                               │  desktop/*.desktop                     │
                               │  endpoint-allowlist.json               │
                               │  theia/package.json  (app manifest)    │
                               │  theia/brand.json    (runtime strings) │
                               └───────┬───────────────────┬────────────┘
                                       │                   │
              ┌────────────────────────┘                   └──────────┐
              ▼                                                       ▼
┌───────────────────────────────────────────┐   ┌────────────────────────────────┐
│ FIREFOX HALF                              │   │ THEIA HALF                     │
│  upstream/  (pinned ESR tag, never edited)│   │  theia/extensions/             │
│  patches/   (HOOK-ONLY, brand-free)       │   │    @powerbrowser/branding      │
│    └ adds DIRS + include() lines only     │   │    @powerbrowser/customize     │
│  powerbrowser/  (platform tree)           │   │    @powerbrowser/tab-uris      │
│    shell/ PowerBrowserAPI.sys.mjs         │   │    @powerbrowser/token-gate    │
│           TheiaService.sys.mjs            │   │  theia/applications/browser    │
│           powerbrowser.xhtml/.js/.css     │   │    (manifest = generated)      │
│    distribution/policies.json             │   │  theiaPlugins ← [extensions]   │
│  upstream/powerbrowser  → symlink to tree │   └────────────────────────────────┘
│  upstream/generated     → symlink to gen  │
└───────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `configuration.toml` | The single declarative source of every user-visible identity, URL, telemetry, extension and pin value. Unset keys fall back to Power Browser defaults. | Hand-edited TOML at repo root |
| `brand/` | The single asset source. One `logo.svg` is sufficient; everything else derives. | SVG + optional PNG overrides |
| `tools/schema.mjs` | Config schema, defaults, and validation. The only place that knows what a valid config is. Fails loudly and by key name. | Plain JS object + validator, no schema library |
| `tools/generate.mjs` | Reads config + brand, drives emitters, writes `generated/`. Idempotent, deterministic, `--check` mode diffs instead of writing. | Node ESM, one TOML dep (`smol-toml`), one raster dep (`sharp`) |
| `tools/emitters/*.mjs` | One module per output surface (mozconfig, firefox-branding, desktop, theia, shell prefs, env, allowlist). Each is a pure `(config) → {path: contents}`. | Pure functions; trivially unit-testable |
| `templates/*.in` | Verbatim bodies with `@PLACEHOLDER@` markers and zero brand literals. Includes the platform pref-hardening fragment kept verbatim. | Text files |
| `generated/` | All build output of the generator. Gitignored. Deleting it and re-running must reproduce it byte-for-byte. | Directory |
| `patches/` | **Hook-only.** Adds `DIRS +=` and `include()` lines into upstream. Carries no configuration and no brand string. | `*.patch`, replayed by `apply-patches.sh` |
| `powerbrowser/` | Platform chrome code. Fixed internal names. Never contains a configurable value inline — reads prefs the generator emits. | XHTML/JS/sys.mjs, wired via `moz.build` + `jar.mn` |
| `theia/extensions/@powerbrowser/*` | Theia-side platform behaviour. Brand strings come from generated `brand.json`, never hardcoded. | TypeScript Theia extensions |
| `flake.nix` | Toolchains only. Reads `configuration.toml` via `builtins.fromTOML` for pins it needs at eval time (Node version, ESR tag echo). Does **not** run the generator. | Nix devShells |
| `tools/verify.mjs` | Layer A gate: `generate --check` clean + no configured brand literal in any tracked non-template file. Runs in seconds, no build required. | Node, CI-friendly |
| `scripts/verify-branding-identity.mjs` | Layer B gate: the existing six-surface runtime identity proof, retargeted to read expected values from `configuration.toml` instead of hardcoded constants. | Existing script, evolved |

---

## Recommended Project Structure

```
powerbrowser/                           # repo root (DeBIOS-Foundation/powerbrowser)
├── configuration.toml                  # THE file — Power Browser's own defaults
├── brand/
│   └── logo.svg                        # THE asset — everything rasterizes from here
├── tools/
│   ├── generate.mjs                    # single entry point: `node tools/generate.mjs [--check]`
│   ├── schema.mjs                      # schema + defaults + validation
│   ├── verify.mjs                      # layer-A static gate
│   └── emitters/
│       ├── env.mjs                     # generated/env.sh  (bash consumers)
│       ├── mozconfig.mjs               # generated/mozconfig
│       ├── identity.mjs                # generated/identity.configure (imply_option block)
│       ├── firefox-branding.mjs        # generated/branding/<variant>/**  incl. icons
│       ├── desktop.mjs                 # generated/desktop/*.desktop
│       ├── theia.mjs                   # generated/theia/{package.json,brand.json}
│       ├── shell-prefs.mjs             # generated/powerbrowser-sidecar.js
│       └── allowlist.mjs               # generated/endpoint-allowlist.json
├── templates/
│   ├── mozconfig.in
│   ├── pref/platform-hardening.js      # VERBATIM, brand-free, ~150 lines of policy
│   ├── pref/variant-dev.js             # the dev/release delta only
│   ├── branding-moz.build.in
│   ├── branding-jar.mn.in
│   ├── desktop.in
│   ├── theia-package.json.in           # full dependency list lives here
│   └── endpoint-allowlist.base.json    # platform hosts; downstream hosts appended
├── patches/
│   ├── 010-identity-hook.patch         # adds: include("../generated/identity.configure")
│   └── 020-shell-hook.patch            # adds: DIRS += ["../powerbrowser/shell"]  + BROWSER_CHROME_URL
├── powerbrowser/                       # platform tree (ex-`sourcerer/`)
│   ├── shell/
│   │   ├── PowerBrowserAPI.sys.mjs     # anti-corruption layer, name FIXED
│   │   ├── TheiaService.sys.mjs
│   │   ├── powerbrowser.{xhtml,js,css}
│   │   ├── moz.build  jar.mn  components.conf
│   ├── distribution/policies.json
│   └── INTERNAL-APIS.md
├── theia/
│   ├── package.json                    # workspace root (resolutions = Theia pin)
│   ├── extensions/{branding,customize,tab-uris,token-gate}/   # @powerbrowser/*
│   └── applications/browser/           # package.json is a SYMLINK to generated/theia/package.json
├── scripts/
│   ├── fetch-upstream.sh               # sources generated/env.sh for the ESR tag
│   ├── apply-patches.sh                # unchanged mechanism (3-way + non-vacuity assert)
│   ├── rebase-upstream.sh
│   ├── check-patch-surface.sh
│   ├── verify-endpoints.sh             # reads generated/endpoint-allowlist.json
│   ├── verify-branding-identity.mjs    # layer B
│   └── smoke-{firefox,theia}.sh
├── docs/
│   ├── REBRANDING.md                   # the stranger-facing walkthrough
│   ├── BUILD.md
│   └── ARCHITECTURE.md
├── flake.nix
├── generated/                          # GITIGNORED — every generated artifact
└── upstream/                           # GITIGNORED — pinned ESR checkout
    ├── powerbrowser -> ../powerbrowser # git-excluded symlink (existing mechanism)
    └── generated    -> ../generated    # git-excluded symlink (NEW, same mechanism)
```

### Structure Rationale

- **`generated/` as a single root, not scattered in place.** The invariant becomes one sentence: *tracked = source, `generated/` = disposable.* A human reviewing a diff never has to ask which category a file is in. Cost is one extra git-excluded symlink inside `upstream/` — `scripts/fetch-upstream.sh` already creates and git-excludes exactly this kind of symlink for `upstream/sourcerer`, so the mechanism is proven, not invented.
- **Name it `generated/`, not `.generated/`.** `--with-branding` feeds `MOZ_BRANDING_DIRECTORY`, which lands in a `DIRS +=` in `browser/moz.build`. A leading-dot directory in a mozbuild `DIRS` entry is an unnecessary unknown for zero benefit.
- **`templates/` separate from `powerbrowser/`.** Templates contain `@PLACEHOLDER@` and are not valid standalone files; keeping them out of the platform tree stops anyone from accidentally building against a template.
- **`applications/browser/package.json` as a symlink into `generated/`.** Theia's `applicationName` is baked into `src-gen` at build time from `theia.frontend.config.applicationName` in that manifest, so the file genuinely must vary per downstream. A symlink is lazier and safer than a JSON-AST rewriter: no reformatting drift, no partially-generated committed file, and the dependency list stays hand-maintained in `templates/theia-package.json.in`.
- **`patches/` shrinks to two hook lines.** Every rebase conflict this project will ever have is proportional to patch surface. Moving configuration out of patches shrinks that surface *and* debrands them in the same move.

---

## Architectural Patterns

### Pattern 1: Hook-only patches — configuration lives in our tree, never in a patch

**What:** A patch against `upstream/` may only add a `DIRS +=` or `include()` line pointing back into our own tree. All actual settings live in a generated file that the `include()` pulls in.

**When to use:** Every patch, without exception. `scripts/check-patch-surface.sh` should be extended to enforce it.

**Trade-offs:** One extra generated file and one extra indirection. In exchange: patches never conflict on a value change, patches carry zero brand literals, and a downstream changing its vendor name causes no patch churn at all.

Today (`patches/010-sourcerer-identity.patch`) the vendor name is *inside the patch*:

```diff
-imply_option("MOZ_APP_VENDOR", "Mozilla")
+imply_option("MOZ_APP_VENDOR", "Deocracy")
```

Recommended instead — the patch becomes brand-free and permanent:

```diff
 imply_option("MOZ_PLACES", True)
+include("../generated/identity.configure")
```

with `generated/identity.configure` emitted from `configuration.toml`:

```python
# GENERATED from configuration.toml — do not edit
imply_option("MOZ_APP_VENDOR", "Deocracy")
imply_option("MOZ_APP_UA_NAME", "Firefox")
imply_option("MOZ_APP_ID", "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}")
imply_option("MOZ_SERVICES_HEALTHREPORT", False)
imply_option("MOZ_NORMANDY", False)
```

Note this keeps `browser/moz.configure` as the only patched compiled-adjacent file, preserving the D-72 tier-3 avoidance rationale already documented in `docs/BUILD.md`.

### Pattern 2: Compose, don't template — verbatim fragments plus a generated delta

**What:** For any output file that is mostly platform policy with a little brand in it, the emitter concatenates a verbatim template fragment with a generated fragment. It does not placeholder-ize the whole file.

**When to use:** `pref/firefox-branding.js` above all — it is ~150 lines whose value is entirely in its comments (each pref carries a traced justification and a Gecko source citation). Also `endpoint-allowlist.json`.

**Trade-offs:** The generator's output is not a single template render, so "which template produced this line" needs a header comment. Worth it: templating that file would either lose the comments or turn 150 lines of prose into a template maintenance burden nobody will keep current.

```
generated/branding/release/pref/firefox-branding.js
  = templates/pref/platform-hardening.js          (verbatim, brand-free)
  + emitters/firefox-branding.mjs brand block     (homepage URLs, update URLs,
                                                   telemetry endpoint, support URL)
  + templates/pref/variant-dev.js                 (dev variant only:
                                                   browser.tabs.inTitlebar = 0)
```

### Pattern 3: One parser, one direction — everything flows out of the generator

**What:** Exactly one process parses TOML for generation purposes: `tools/generate.mjs` in Node. Python/mozbuild never parses TOML. Node at runtime never parses TOML. Bash never parses TOML — it sources `generated/env.sh`. Nix reads the TOML natively but only for the two or three pins it needs at *evaluation* time, before `generated/` is guaranteed to exist.

**When to use:** Always. The moment a second language parses `configuration.toml`, you have two schema implementations that will disagree.

**Trade-offs:** `generated/env.sh` is a mildly ugly artifact. It is also zero-dependency, works in every shell, and removes a `jq` dependency from `fetch-upstream.sh` and `rebase-upstream.sh`.

```sh
# generated/env.sh  — GENERATED, do not edit
PB_ESR_TAG=FIREFOX_153_1_0esr_RELEASE
PB_THEIA_VERSION=1.74.1
PB_BINARY_NAME=powerbrowser
PB_DISPLAY_NAME='Power Browser'
PB_APP_BASENAME=PowerBrowser
PB_BRANDING_DIR=generated/branding/dev
PB_OBJDIR=objdir
```

Firefox's own tree already vendors `tomli`/`tomlkit` under `upstream/third_party/python/`, and the host Python here is 3.13 (stdlib `tomllib`), so a Python-side parse is *possible*. Do not do it anyway — availability is not a reason to add a second schema implementation.

### Pattern 4: Internal names are platform-fixed; only user-visible surfaces are configurable

**What:** A hard, documented two-column list. Nothing in the left column is ever derived from `configuration.toml`.

| Fixed forever (internal) | Configurable (user-visible) |
|---|---|
| `chrome://powerbrowser/` package name | display name, short/shorter/full brand names |
| `PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs` | vendor, distribution id, `MOZ_APP_ID` |
| `@powerbrowser/*` npm scope | binary name, `MOZ_APP_REMOTINGNAME`, `StartupWMClass` |
| `powerbrowser.sidecar.*` pref branch | `--with-app-basename` (profile directory) |
| `POWERBROWSER_*` env vars (`_TOKEN`, `_SUPERVISED`) | all icons, wordmark, welcome/about mark |
| `powerbrowser/` directory name | installer + `.desktop` name/icon |
| patch filenames, template filenames | Theia `applicationName`, welcome/about text |
| | telemetry endpoint + toggles, all `[urls]`, license/copyright |

**Why:** Mozilla's trademark policy constrains the *product identity a user sees*, not symbol names. `chrome://` package names and pref branches are invisible to the trademark question and to the end user. Making them configurable buys nothing and costs a per-downstream rename pass across `jar.mn`, `moz.build`, `components.conf`, every `import` in the Theia extensions, and every pref read in `TheiaService.sys.mjs`.

**Caveat that is genuinely load-bearing:** `--with-app-basename` and `MOZ_APP_REMOTINGNAME` *must* be configurable, or a Power Browser build and a Sourcerer build on the same machine share a profile directory and a remoting name and will fight over single-instance activation. `sourcerer/shell/components.conf` registers a single-instance command-line handler; that path is sensitive to remoting name collisions.

### Pattern 5: Downstream layering by config-directory indirection, not by forking or patching

**What:** The generator resolves its input from `PB_CONFIG_DIR`, defaulting to the repo root. The platform ships its own `configuration.toml` + `brand/` at the root, so it builds standalone with zero arguments — satisfying the hard requirement that Power Browser must build with Sourcerer absent.

**When to use:** Any downstream that wants to track platform releases without carrying a permanent merge conflict.

```
Deocracy/Sourcerer  (downstream repo)
├── configuration.toml        # Sourcerer's identity
├── brand/logo.svg            # Sourcerer's mark
├── platform/                 # submodule or pinned checkout of powerbrowser @ vX.Y
└── build.sh                  # PB_CONFIG_DIR=$PWD platform/tools/generate.mjs && ...
```

This satisfies the boundary rule literally: the downstream contributes **zero files into the platform tree**. It also supports the simpler UX PROJECT.md describes — a stranger clones Power Browser, edits `configuration.toml` in place, and builds — because that is just the default `PB_CONFIG_DIR=.` case. One environment variable covers both models; do not build two mechanisms.

**Trade-off:** `generated/` still lives inside the platform checkout even in the overlay model (mach needs the branding directory reachable from `topsrcdir`). That is fine — it is gitignored there, and the platform checkout is disposable build state for a downstream.

### Pattern 6: Icons rasterize from one source at generation time

**What:** `brand/logo.svg` → `sharp` → `default{16,32,48,64,128}.png` into each variant's branding directory.

The exact set is small and known, because the current tree's `branding/*/content/jar.mn` deliberately re-exports only those five PNGs and explicitly does *not* reference `about.png`, `about-logo*`, `about-wordmark.svg`, `firefox-wordmark.svg`, `document.ico` or `document_pdf.svg` — those are Mozilla marks or unshipped files. Do not expand the icon set beyond what `jar.mn` consumes.

**Trade-offs:** One npm dependency (`sharp`, which rasterizes SVG through libvips/librsvg — no ImageMagick system dependency, and Node is already a hard requirement for the Theia sidecar). Must be version-pinned: `--check` mode compares bytes, and a `sharp` upgrade that changes PNG encoding would fail the gate spuriously. Record that pin in `configuration.toml`'s `[upstreams]` alongside Node and Theia.

---

## Data Flow

### Generation flow (the core one)

```
configuration.toml ──┐
                     ├──► tools/schema.mjs (validate, apply defaults)
brand/logo.svg ──────┘              │
                                    ▼
                        tools/emitters/*  (pure: config → {path: bytes})
                                    │
        ┌───────────┬───────────┬───┴───────┬────────────┬─────────────┐
        ▼           ▼           ▼           ▼            ▼             ▼
    env.sh      mozconfig  identity.    branding/    desktop/    theia/
        │           │      configure    <variant>/   *.desktop   package.json
        │           │           │           │            │       brand.json
        ▼           ▼           ▼           ▼            ▼             ▼
   bash scripts  MOZCONFIG=  moz.configure  --with-   install to   theia build
   (fetch,       ./mach      include()      branding= ~/.local/     (src-gen)
    rebase)                                            share
```

### Build flow (strict order — each step depends on the previous)

```
0.  edit configuration.toml / brand/
        │
1.  node tools/generate.mjs                     ~1s, no build state touched
        │   writes generated/** ; fails loudly on invalid config
        ▼
2.  . generated/env.sh ; scripts/fetch-upstream.sh    (ESR tag from step 1)
        │   idempotent; creates upstream/{powerbrowser,generated} symlinks
        ▼
3.  scripts/apply-patches.sh                    hook-only patches, 3-way + non-vacuity
        │   scripts/check-patch-surface.sh gates compiled-file targets
        ▼
4.  nix develop .#firefox ; MOZCONFIG=../generated/mozconfig ./mach build
        │   ~54 min cold (measured in sourcerer docs/BUILD.md)
        ▼
5.  nix develop .#theia ; yarn install --ignore-scripts --frozen-lockfile
        │   (cd node_modules/drivelist && node-gyp rebuild)   ← load-bearing
        │   theia download:plugins    ← NEW: from [extensions]
        │   yarn build
        ▼
6.  node tools/verify.mjs                       layer A — static, seconds, no build
    node scripts/verify-branding-identity.mjs   layer B — runtime, needs step 4
    bash scripts/verify-endpoints.sh            reads generated/endpoint-allowlist.json
```

**Where the generator sits, stated plainly: step 1, before everything, outside Nix.** Nix supplies toolchains via `devShells`; it does not run the generator. Making the generator a Nix derivation would move the edit→rebuild loop into `nix build`, and mach needs the branding directory *inside the source tree*, not in the store. Nix's only read of `configuration.toml` is `builtins.fromTOML` for eval-time pins (Node version above all), which must work before `generated/` exists.

### Key data flows worth naming

1. **Telemetry endpoint → endpoint allowlist.** `[telemetry] endpoint` must be appended into `generated/endpoint-allowlist.json` with disposition `allow`, or `scripts/verify-endpoints.sh` layer 3 fails the build the moment a downstream configures telemetry. This coupling is invisible until it bites; it belongs in the same phase as the telemetry work.
2. **`[urls]` → endpoint allowlist, both directions.** The current tree carries a live example: `sourcerer-welcome-widget.tsx`'s repo link to `github.com` triggered Gecko DNS prefetch, which was fixed with `network.dns.disablePrefetch=true` while `github.com` stays a `deny` entry. Any downstream URL host must flow into the allowlist through the generator, and the prefetch pref must stay in the platform-hardening fragment.
3. **`[extensions]` → `theiaPlugins` + `theia download:plugins`.** `docs/BUILD.md` currently states, explicitly, that the app ships no `theiaPlugins` block and no download step, and says not to add one "unless a future phase decides to ship default extensions." This milestone *is* that phase. The mechanism is Theia's own `theiaPlugins` manifest block in the generated app `package.json` plus the `theia download:plugins` step in build order 5.
4. **`[upstreams]` → three consumers.** ESR tag → `env.sh` → `fetch-upstream.sh`/`rebase-upstream.sh`. Theia version → `theia/package.json` `resolutions` block *and* every extension's dependency pins. Node version → `flake.nix` via `fromTOML`. The Theia pin appears in ~50 `resolutions` entries plus four extension manifests today — that fan-out is a generator job, not a hand-edit.
5. **Runtime brand strings → Theia.** `generated/theia/brand.json` is imported by `@powerbrowser/branding`; today the mark SVG is a hardcoded template literal in `sourcerer-mark.ts` and the repo URL is a `const` in `sourcerer-welcome-widget.tsx`. Both become reads from the generated module.

---

## Suggested Build Order (roadmap phase implications)

Seven steps. The ordering argument is the important part.

| # | Phase | Why here |
|---|-------|----------|
| 1 | **Extract + rename.** Copy tree, `sourcerer/`→`powerbrowser/`, `@sourcerer/*`→`@powerbrowser/*`, `SourcererAPI`→`PowerBrowserAPI`, chrome package, pref branch, env vars. Hardcode "Power Browser" everywhere. Re-fetch `upstream/` via `fetch-upstream.sh`; never copy objdirs. Prove it builds and boots. | No generator yet — deliberately. This is a pure mechanical rename with a binary pass/fail (it boots or it doesn't). Mixing it with generator design would make failures ambiguous. **Highest-risk phase**; PROJECT.md already flags plan-review-convergence here, correctly. |
| 2 | **Schema + generator core + cheap emitters** (`env.sh`, `mozconfig`, `desktop`). | The acceptance test is free and total: generated output must be **byte-identical to the files phase 1 wrote by hand**. Any diff is a generator bug. This proof only exists if phase 1 came first. |
| 3 | **Firefox branding emitter + icon pipeline.** Both variants, all five PNGs, `brand.ftl`/`brand.properties` pair, the composed pref file, `moz.build`/`jar.mn`/`configure.sh`. | Same byte-identical proof. Separate from phase 2 because it adds the `sharp` dependency and the dev/release variant delta — the two things most likely to need iteration. |
| 4 | **Theia emitter.** Generated app manifest (symlink), `brand.json`, `applicationName`, welcome/about/mark/favicon reads, `theiaPlugins` from `[extensions]` + `theia download:plugins`. | Depends on nothing in phase 3; could run parallel. Contains the only genuinely *new* capability in the milestone (plugin bundling), so it carries the most unknowns. |
| 5 | **De-configure the patches.** Move `imply_option` block into `generated/identity.configure`; patches become hook-only; extend `check-patch-surface.sh` to enforce it. | Must come after 2–3, because `generated/` and the `upstream/generated` symlink have to exist before a patch can `include()` into it. Cheap once they do. |
| 6 | **Verification + docs.** `tools/verify.mjs` (layer A: `--check` clean + literal scan), retarget `verify-branding-identity.mjs` to read expectations from `configuration.toml`, generated `endpoint-allowlist.json` wired into `verify-endpoints.sh`, `docs/REBRANDING.md`. | The literal scan can only pass once every surface is generated. Running it earlier produces noise, not signal. |
| 7 | **Sourcerer as downstream.** `PB_CONFIG_DIR`, a separate repo with only `configuration.toml` + `brand/`, build the Sourcerer-branded product from the untouched platform. | The milestone's real acceptance test. It is the only step that can prove the boundary rule holds, and it can only run when 1–6 are done. |

**Parallelization:** 3 and 4 are independent (Firefox half vs Theia half) and can be separate workstreams after 2. Everything else is a chain.

**Research flags:** phase 1 (rename blast radius across `jar.mn`/`moz.build`/`components.conf`/pref reads) and phase 4 (`theia download:plugins` is unexercised in this tree and Open VSX pinning semantics are unverified here) are the two that warrant phase-level research. Phases 2, 3, 5, 6 are mechanical against a known target.

---

## Scaling Considerations

"Scale" here is downstream count and rebase load, not users.

| Scale | Architecture adjustments |
|-------|--------------------------|
| 1 downstream (Sourcerer) | Nothing beyond the above. `PB_CONFIG_DIR` + a pinned platform checkout. |
| 2–5 downstreams | Publish tagged platform releases; downstreams pin a tag rather than a branch. Add a `configuration.toml` schema version field so the platform can reject a config written for an older schema by name instead of failing obscurely mid-generation. |
| 5+ downstreams | The `[extensions]` mechanism starts carrying real weight — a self-hosted Open VSX mirror (R9 in the upstream requirements) becomes the pin authority. Consider a `[theia.extensions]` seam for downstream-supplied *compiled* Theia extensions (Databasise-shaped), which milestone 1 deliberately does not build. |

### Scaling priorities

1. **First bottleneck: the ESR rebase, not the generator.** ~4-week cadence, one major per ESR year. Patch surface is the whole cost, which is exactly why Pattern 1 (hook-only patches) pays for itself immediately.
2. **Second bottleneck: Theia re-pinning fan-out.** The Theia version appears in ~50 `resolutions` entries plus four extension manifests. Generating those from `[upstreams] theia` turns a re-pin from a 50-line edit into a one-line edit.
3. **Not a bottleneck: generator runtime.** It is a sub-second script. Do not optimize it, cache it, or make it incremental.

---

## Anti-Patterns

### Anti-Pattern 1: Templating the patches

**What people do:** `patches/010-identity.patch.in` with `@VENDOR@` inside the diff body, substituted before `git apply`.
**Why it's wrong:** It keeps configuration inside the rebase surface. Every value change now risks patch fuzz, and `apply-patches.sh`'s blob-hash non-vacuity assertion has to reason about substituted content. It also leaves the patch un-debranded in the repo.
**Do this instead:** Pattern 1 — the patch adds an `include()` line and nothing else.

### Anti-Pattern 2: Renaming internal identifiers per downstream

**What people do:** Make `chrome://<brand>/`, the npm scope, the pref branch and the env var prefix all derive from `configuration.toml`, on the theory that "fully rebranded" means no platform name anywhere.
**Why it's wrong:** Trademark policy governs product identity, not symbol names. Each rename multiplies the generator's surface across `jar.mn`, `moz.build`, `components.conf`, TypeScript imports and every pref read, and every one is a chance to produce a build that compiles and silently fails to find its own chrome package.
**Do this instead:** Pattern 4's fixed/configurable split, written down in `docs/REBRANDING.md` so a downstream is never surprised by seeing `powerbrowser` in `about:config`.

### Anti-Pattern 3: Committing generated files

**What people do:** Generate in place under `powerbrowser/branding/` and commit the result "so the tree is browsable."
**Why it's wrong:** It makes the verifier's literal scan impossible (generated brand literals are indistinguishable from hardcoded ones), it produces review noise on every config change, and it guarantees the committed copy will eventually drift from what the generator produces.
**Do this instead:** One gitignored `generated/` root. `generate --check` in CI proves the tree is reproducible.

### Anti-Pattern 4: Making the generator a Nix derivation

**What people do:** `nix build .#branding` producing a store path, symlinked into the tree.
**Why it's wrong:** The generator is already deterministic, so hermeticity buys nothing; it moves an edit→rebuild loop that should be one second into a Nix evaluation; and mach wants the branding directory reachable from `topsrcdir`, not a store path. Nix's real job here — supplying the Gecko and Node toolchains via `devShells` — already works and should not be disturbed.
**Do this instead:** Plain Node script. Nix reads `configuration.toml` only for eval-time pins.

### Anti-Pattern 5: Three languages parsing the same TOML

**What people do:** Nix reads it with `fromTOML`, mozbuild reads it with vendored `tomli`, the Theia backend reads it with an npm TOML parser at runtime.
**Why it's wrong:** Three schema implementations, three default-value behaviours, three failure modes, and the defaults will silently diverge. The Theia runtime read is especially bad — it makes a config typo a runtime crash instead of a generation-time error.
**Do this instead:** Pattern 3. One parser in the generator; everyone else consumes generated artifacts. Nix's eval-time pin read is the single deliberate exception and stays limited to `[upstreams]`.

### Anti-Pattern 6: `#ifdef`-ing downstream features into the platform

**What people do:** Add Databasise or the curated addon set behind a `[features] databasise = true` flag in `configuration.toml`.
**Why it's wrong:** It is exactly what the boundary rule forbids, and it means Power Browser can no longer be built with Sourcerer absent from the tree — which is a stated hard requirement.
**Do this instead:** Downstream composes. If a downstream needs to change platform behaviour, the platform needs an extension point; adding a flag is the bug, not the fix.

### Anti-Pattern 7: "`grep -ri firefox` returns empty" as the verification criterion

**What people do:** Gate the build on no occurrence of the upstream or platform name anywhere.
**Why it's wrong:** Already learned the hard way in the source tree — `scripts/verify-branding-identity.mjs`'s own header documents this as "unachievable," because a correctly branded unpackaged build still ships dozens of files with `firefox` in the name (upstream feature names, the update-file set). A criterion that can only ever fail is not a criterion. Note also that `MOZ_APP_UA_NAME` is deliberately kept as `Firefox` for User-Agent compatibility, and `-brand-product-name` is deliberately kept as `Firefox` for the "requires Firefox" compatibility strings.
**Do this instead:** Two layers. **A** (static, seconds): `generate --check` produces no diff, AND no *configured* brand value from `configuration.toml` appears in any tracked file outside `configuration.toml` and `brand/`. **B** (runtime, needs a build): the existing six-surface exact-equality identity check, with expectations read from `configuration.toml`.

---

## Integration Points

### External Services / Toolchains

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Firefox ESR source | `scripts/fetch-upstream.sh` clones the pinned tag; idempotent no-op if already at tag | 5.6 GB tree, ~438 s clone, ~54 min full build (measured). Never copy objdirs between repos. |
| mozbuild / mach | `MOZCONFIG=../generated/mozconfig ./mach build`; branding via `--with-branding`, our tree via `DIRS +=` through the `upstream/powerbrowser` symlink | Keep patches off compiled-file suffixes or every rebuild becomes tier 3. `check-patch-surface.sh` already enforces this. |
| Nix | `devShells.{theia,firefox}`; `firefox` shell must keep the `llvmPackages.stdenv` override and the `unset AS LD NM …` shellHook | Both are load-bearing and non-obvious; carry them over verbatim, do not "clean them up." |
| Eclipse Theia | npm workspace, pinned via `resolutions`; never fork core, compose `@powerbrowser/*` extensions | Yarn Classic, `--ignore-scripts` + one explicit `drivelist` `node-gyp rebuild`. Do not simplify to a bare `yarn install`. |
| Open VSX | `[extensions]` → `theiaPlugins` + `theia download:plugins`; `VSX_REGISTRY_URL` already set explicitly so a mirror is a config change | Unexercised in the current tree — verify pin semantics during phase 4. |
| `sharp` (npm) | Icon rasterization from `brand/logo.svg` | Version-pin it; `--check` compares bytes. |
| `smol-toml` (npm) | The one TOML parse | Any spec-compliant parser is fine; pick one and never add a second. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `configuration.toml` ↔ everything | one-way, generation-time only | Never read at runtime by browser or sidecar. |
| generator ↔ mozbuild | files on disk (`generated/**`) reached via `upstream/generated` symlink | Same git-excluded-symlink mechanism already used for `upstream/sourcerer`. |
| generator ↔ Nix | `builtins.fromTOML` on `[upstreams]` only | Must work before `generated/` exists. |
| generator ↔ bash scripts | `generated/env.sh`, sourced | No `jq`, no parser dependency in shell. |
| Firefox chrome ↔ Theia backend | supervised child process, token on stdin (never in env), token-authenticated localhost | Existing design; `POWERBROWSER_*` env keys are captured-and-deleted at module load to stop inheritance into terminals and the plugin host. Preserve this exactly — the reasoning in `sourcerer-env.ts` is subtle and correct. |
| Platform chrome ↔ Gecko internals | `PowerBrowserAPI.sys.mjs` only, catalogued in `INTERNAL-APIS.md`, gated by `check-internals-boundary.sh` | One file to fix per ESR break. Unchanged by this milestone. |
| Platform ↔ downstream | `PB_CONFIG_DIR` + pinned platform checkout; downstream writes zero files into the platform tree | The boundary rule, made mechanical. |

---

## Open Questions / Gaps

- **`theia download:plugins` pin semantics** are unverified in this tree (no `theiaPlugins` block has ever existed here). Whether an Open VSX entry can be pinned to an exact version and verified by hash needs phase-4 research.
- **`--with-branding` pointing into a sibling generated directory** is architecturally sound via the existing symlink mechanism but has not been executed. It is the one step of the plan that could surprise; validate it early in phase 3 with a throwaway branding directory before building the full emitter.
- **`sharp` output determinism across versions** is assumed, not measured. If `--check` proves flaky, the fallback is to compare decoded pixel data rather than PNG bytes.
- **Windows/macOS branding surfaces** (`.ico`, `.icns`, NSIS installer strings, `MacOSInstaller.svg`) are out of scope for Linux-first, but the emitter interface should not preclude them. Do not build them; do not design them out.

---

## Sources

Primary — read directly this session (HIGH confidence; these are the actual files, not descriptions of them):

- `/home/chris/coding/sourcerer/docs/PRODUCT-REQUIREMENTS.md` — stream model, boundary rule, repo homes, platform naming
- `/home/chris/coding/sourcerer/docs/research/sourcerer-architecture.md` — layer diagram, components, build order, repo strategy
- `/home/chris/coding/sourcerer/docs/BUILD.md` — Theia half, Firefox half, tiered rebuild loop, compiled-file boundary (D-72), endpoint allowlist (D-83–D-88), dev/release divergence (BRAND-06), rebase procedure
- `/home/chris/coding/sourcerer/scripts/apply-patches.sh` — 3-way apply + blob-hash non-vacuity assertion, self-test
- `/home/chris/coding/sourcerer/scripts/fetch-upstream.sh` — pinned `TAG`, `upstream/sourcerer` git-excluded symlink
- `/home/chris/coding/sourcerer/scripts/verify-branding-identity.mjs` — the six-surface criterion and why the naive grep criterion was abandoned
- `/home/chris/coding/sourcerer/patches/{010,020}*.patch` — current patch surface and its brand literals
- `/home/chris/coding/sourcerer/sourcerer/branding/{dev,release}/**` — exact generated-file target set
- `/home/chris/coding/sourcerer/sourcerer/shell/{moz.build,jar.mn,sourcerer-sidecar.js}` — chrome registration, `JS_PREFERENCE_PP_FILES` preprocessing precedent
- `/home/chris/coding/sourcerer/theia/**/package.json`, `theia/extensions/branding/src/**` — `@sourcerer/*` scope, `applicationName`, hardcoded mark and repo URL
- `/home/chris/coding/sourcerer/{flake.nix,.mozconfig,.gitignore}` — toolchain shells, branding/objdir env indirection, ignore conventions
- `/home/chris/coding/sourcerer/sourcerer/endpoint-allowlist.json` — telemetry/URL coupling

Corroborating precedent (seam-classified LOW for `webfetch`; used only to confirm the shape is production-proven, never as a load-bearing claim):

- [zen-browser/surfer](https://github.com/zen-browser/surfer) and [desktop/surfer.json](https://github.com/zen-browser/desktop/blob/dev/surfer.json) — a Firefox fork driven by one root config file (`name`, `vendor`, `appId`, `binaryName`, `version`, `brands`, `buildOptions.generateBranding`, `updateHostname`, `license`), with generation as an explicit pre-build `import` step
- [Gluon branding guide](https://docs.gluon.dev/guides/branding/) — `config/branding/<brand>/logo.png` downscaled at import; confirms the one-source-asset model
- [surfer CLI reference](https://deepwiki.com/zen-browser/surfer/6-cli-reference) — command order: `download` → `import` (generate + patch) → `build` → `package`, matching the build order above

---
*Architecture research for: rebrandable Firefox-ESR + Theia platform*
*Researched: 2026-08-29*
