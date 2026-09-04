# Codebase Structure

**Analysis Date:** 2026-09-04

## Directory Layout

```
Power-Browser/
├── powerbrowser/           # Gecko-side platform: shell + branding + policies
│   ├── shell/              # Chrome window, boundary, supervisor (the owned core)
│   ├── branding/           # Hand-written Phase 1 branding dirs (dev/release) — byte-identity reference
│   ├── branding-generated/ # Build-consumed symlink/copy target (points at generated/branding/*)
│   ├── distribution/       # policies.json
│   └── INTERNAL-APIS.md    # Derived catalogue of every Firefox-internal touchpoint
├── theia/                  # Theia sidecar: app composition + @powerbrowser/* extensions
│   ├── applications/browser/ # App assembly (package.json composition)
│   └── extensions/         # tab-uris/ token-gate/ branding/ customize/
├── patches/                # Gecko patch stack (010 identity, 020 shell hook)
├── upstream/               # Pinned ESR checkout (git-ignored, never hand-edited)
├── scripts/                # verify-platform.sh registry + ~30 checkers + generator + lib/
├── tools/                  # Reserved / empty at this snapshot
├── brand/                  # Rebrand input: mark.svg (single icon source)
├── configuration.toml      # Rebrand input: the manifest (defaults layer)
├── generated/              # Generator output (git-ignored): branding/, .mozconfig, *.desktop
├── inventory/              # brand-tokens.json — rename machinery source of truth
├── docs/                   # BUILD.md, CUSTOMIZE.md, URI-SCHEMES.md
├── objdir/                 # Dev-variant Gecko build output (git-ignored)
├── objdir-release/         # Release-variant Gecko build output (git-ignored, usually absent)
├── .planning/              # GSD planning record (ROADMAP, REQUIREMENTS, phases/, codebase/)
├── .mozconfig              # Generated dev build config (copy of generated/ output)
├── flake.nix               # Nix dev shells: .#firefox (Gecko toolchain), .#theia (Node/yarn)
└── CLAUDE.md               # Project hard rules (no Theia fork, boundary, bridge, no-space path)
```

## Directory Purposes

**`powerbrowser/shell/`:**
- Purpose: The owned Gecko core — startup window, internals boundary, sidecar supervisor
- Contains: `.sys.mjs` modules, chrome document/script/style, XPCOM/build manifests, sidecar pref defaults
- Key files: `PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs`, `powerbrowser.js`, `powerbrowser.xhtml`, `powerbrowser.css`, `powerbrowser-sidecar.js`, `components.conf`, `jar.mn`, `moz.build`

**`powerbrowser/branding/` + `powerbrowser/branding-generated/`:**
- Purpose: `branding/` holds the Phase 1 hand-written `dev`/`release` branding directories — the byte-identity reference the generator must reproduce; `branding-generated/` is what the build actually consumes
- Contains: Per variant `brand.ftl`, `brand.properties`, `moz.build`, `content/`, `locales/`, `pref/firefox-branding.js`, icon rasters
- Key files: `powerbrowser/branding/dev/*`, `powerbrowser/branding/release/*`

**`theia/extensions/`:**
- Purpose: All `@powerbrowser/*` Theia extensions — the only Theia-side code this project owns
- Contains: Four extensions, each with `package.json`, `src/`, `tsconfig.json`, compiled `lib/` (git-ignored)
- Key files: `tab-uris/src/browser/tab-uri-registry.ts`, `token-gate/src/node/powerbrowser-env.ts`, `branding/src/browser/powerbrowser-frontend-module.ts`, `customize/src/browser/customize-frontend-module.ts`

**`theia/applications/browser/`:**
- Purpose: Sidecar composition — which `@theia/*` packages ship and which `@powerbrowser/*` extensions compose in
- Contains: `package.json` (the composition), `src-gen/` (generated), `lib/` (built backend+frontend, git-ignored)
- Key files: `theia/applications/browser/package.json`

**`patches/`:**
- Purpose: The entire Gecko diff — hook-only by design after startup selection moved into `PowerBrowserSingleInstanceHandler`
- Contains: `010-powerbrowser-identity.patch` (identity imply_options), `020-powerbrowser-shell.patch` (adds `powerbrowser/shell` to the build)
- Key files: `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`

**`scripts/`:**
- Purpose: Verification registry, checkers, rebrand generator, lifecycle helpers
- Contains: `verify-platform.sh` (the driver), `verify-*.mjs` / `verify-*.sh` checks, `generate.mjs`, `rename-brand.mjs`, `scan-brand-residue.mjs`, `apply-patches.sh`, `check-*.sh`, `smoke-*.sh`, `lib/` (`config-schema.json`, `toml.cjs`, `firefox-bidi.mjs`)
- Key files: `scripts/verify-platform.sh`, `scripts/generate.mjs`, `scripts/lib/config-schema.json`

**`generated/`:**
- Purpose: Generator output only — never hand-edited; `node scripts/generate.mjs --check` asserts it matches `configuration.toml`
- Contains: `branding/dev|release/`, `.mozconfig`-equivalent, `powerbrowser.desktop`, `powerbrowser-release.desktop`
- Generated: Yes
- Committed: No (git-ignored)

**`inventory/`:**
- Purpose: Rename machinery — the machine-readable token inventory shared by the rename executor and the residue scan
- Contains: `brand-tokens.json` (the only file allowed to name the originating product)
- Key files: `inventory/brand-tokens.json`

**`docs/`:**
- Purpose: Human references for build, customization, and tab addresses
- Contains: `BUILD.md` (timings name tree/host/toolchain), `CUSTOMIZE.md`, `URI-SCHEMES.md` (all five URI schemes)

## Key File Locations

**Entry Points:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`PowerBrowserSingleInstanceHandler.handle`): process-startup window selection
- `powerbrowser/shell/powerbrowser.xhtml`: shell document loaded as the startup window
- `powerbrowser/shell/powerbrowser.js`: chrome bootstrap (`DOMContentLoaded` → sentinels → `TheiaService.start`)
- `theia/applications/browser/lib/backend/main.js`: sidecar backend main (built artifact; composition source is `theia/applications/browser/package.json`)
- `scripts/verify-platform.sh`: verification entry (`--quick` | `--only <label>` | `--gate` | full)
- `scripts/generate.mjs`: rebrand entry (`--check` | `--self-test` | emit)

**Configuration:**
- `configuration.toml`: rebrand manifest (identity/product/legal/theia/variants) — defaults layer
- `scripts/lib/config-schema.json`: manifest schema the generator validates against
- `powerbrowser/shell/powerbrowser-sidecar.js`: sidecar pref defaults (preprocessed `#filter substitution`, `POWERBROWSER_DEV_TREE` from `moz.build`)
- `powerbrowser/distribution/policies.json`: distribution policies
- `powerbrowser/endpoint-allowlist.json`: allowed/denied network hosts + gating prefs (read by `scripts/verify-endpoints.sh`)
- `.mozconfig`: active dev build config (generated copy — edit `configuration.toml`, regenerate, copy over)
- `flake.nix`: Nix shells (`.#firefox` clang/Gecko toolchain, `.#theia` Node 22/yarn)
- `theia/package.json`: yarn workspaces root (`applications/*`, `extensions/*`), `@theia/*@1.74.1` resolutions

**Core Logic:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs`: internals boundary + single-instance handler
- `powerbrowser/shell/TheiaService.sys.mjs`: sidecar supervisor (~1100 lines; resolve/spawn/gate/swap/health/restart/quit)
- `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: tab-URI registry (frozen bridge shape)
- `theia/extensions/tab-uris/src/browser/view-factory-table.ts`: `view:` coverage contract
- `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`: fail-closed gate + health route + readiness sentinel
- `theia/extensions/token-gate/src/node/powerbrowser-env.ts`: env capture/scrub + stdin token read
- `theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts`: dies-with-browser watchdog

**Testing:**
- `scripts/verify-platform.sh`: the only driver — `CHECKS+=(...)` registry near the bottom of the file
- `scripts/verify-*.mjs`: static/derived-shape checks (`verify-registry-shape.mjs`, `verify-shell-error-copy.mjs`, `verify-shell-error-contract.mjs`, `verify-branding*.mjs`, `verify-gui01-*.mjs`, `verify-uri-roundtrip.mjs`, `verify-customize-inert.mjs`, `verify-dev-flag-off.mjs`, …)
- `scripts/smoke-theia.sh`, `scripts/smoke-firefox.sh`: smoke gates registered first in the full set
- `scripts/lib/firefox-bidi.mjs`: BiDi helper for checks that drive the live binary
- No `*.test.*` / `*.spec.*` unit-test convention — verification is check-script + `--self-test` per check, not a JS test runner

## Naming Conventions

**Files:**
- Gecko chrome: lowercase `powerbrowser.<ext>` (`powerbrowser.js`, `powerbrowser.xhtml`, `powerbrowser.css`, `powerbrowser-sidecar.js`); privileged modules `PascalCase.sys.mjs` (`PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs`); build manifests lowercase (`moz.build`, `jar.mn`, `components.conf`)
- Theia extensions: kebab-case package dirs (`tab-uris/`, `token-gate/`), kebab-case source files (`tab-uri-registry.ts`, `view-factory-table.ts`, `browser-window-command.ts`, `powerbrowser-env.ts`); module manifests `*-frontend-module.ts` (browser) / `*-backend-module.ts` (node); React widgets `*.tsx` (`powerbrowser-welcome-widget.tsx`, `powerbrowser-about-dialog.tsx`)
- Scripts: `verify-<area>.mjs|.sh` per check, `check-<surface>.sh` for guards, `smoke-<half>.sh` for smoke gates; `lib/` helpers (`toml.cjs`, `config-schema.json`, `firefox-bidi.mjs`)
- Patches: zero-padded sequence `NNN-<slug>.patch` (`010-powerbrowser-identity.patch`, `020-powerbrowser-shell.patch`)
- Planning: `UPPERCASE.md` for codebase maps (`ARCHITECTURE.md`, `STRUCTURE.md`); phase dirs under `.planning/phases/`

**Directories:**
- Kebab-case throughout (`tab-uris/`, `token-gate/`, `powerbrowser/`, `sidecar-state-*`); Theia source split `src/browser/` vs `src/node/` by runtime; compiled output always `lib/` (git-ignored); per-variant branding `dev/` vs `release/`

## Where to Add New Code

**New Feature (Gecko shell behaviour):**
- Primary code: `powerbrowser/shell/` — new privileged capability goes as a method on `PowerBrowserAPI` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` + catalogue row in `powerbrowser/INTERNAL-APIS.md`; policy/lifecycle goes in `powerbrowser/shell/TheiaService.sys.mjs` (which must keep importing nothing else)
- Chrome UI: `powerbrowser/shell/powerbrowser.xhtml` + `powerbrowser/shell/powerbrowser.js` (new `window.powerbrowser*` global) + `powerbrowser/shell/powerbrowser.css`
- Tests: append one row to the `CHECKS` registry in `scripts/verify-platform.sh` (never a sibling driver); static checks live in `scripts/verify-<area>.mjs` with a `--self-test` planting addition + removal

**New Component/Module (Theia side):**
- Implementation: new dir under `theia/extensions/<name>/src/browser/` (frontend) or `src/node/` (backend), wired via a new `ContainerModule` (`<name>-frontend-module.ts` / `<name>-backend-module.ts`), composed by adding `@powerbrowser/<name>` to `theia/applications/browser/package.json` dependencies; never edit `@theia/*` sources
- Tab-addressable view: add the factory id row to `theia/extensions/tab-uris/src/browser/view-factory-table.ts` (coverage contract) — the runtime discovery in `tab-uri-registry.ts` needs no change; update `docs/URI-SCHEMES.md` and expect `scripts/verify-registry-shape.mjs` / `verify-uri-roundtrip.mjs` to cover it

**Utilities:**
- Shared shell helpers: methods on `PowerBrowserAPI` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`) for anything touching platform internals
- Shared Theia helpers: alongside the owning extension (e.g. `existing-scheme-coverage.ts` in `theia/extensions/tab-uris/src/browser/`); cross-extension reads via DI (`ctx.container.get/isBound`), not direct imports
- Check helpers: `scripts/lib/` (BiDi, schema, vendored TOML parser — note `scripts/lib/toml.cjs` is vendored with a digest pinned in its header; do not hand-edit)

**Rebrand-affecting change:**
- Inputs only: `configuration.toml` + `brand/mark.svg`; run `node scripts/generate.mjs`, then copy the matching file(s) out of `generated/` over the build-consumed location (Phase 2 does not write in place); never hand-edit `generated/`, `.mozconfig`, `*.desktop`, or `powerbrowser/branding-generated/`

## Special Directories

**`upstream/`:**
- Purpose: Pinned ESR checkout materialised by `scripts/fetch-upstream.sh`
- Generated: Yes (fetch, ~1.1 GB)
- Committed: No (git-ignored; `git -C upstream diff` must stay empty)

**`objdir/` / `objdir-release/`:**
- Purpose: Gecko build outputs for the `dev` / `release` variants (`MOZ_OBJDIR`)
- Generated: Yes (`./mach build`, ~47–54 min full)
- Committed: No (git-ignored)

**`generated/`:**
- Purpose: Rebrand generator output (33 targets: branding dirs, `.mozconfig`, `.desktop`, icon rasters)
- Generated: Yes (`node scripts/generate.mjs`)
- Committed: No (git-ignored; `--check` asserts freshness)

**`theia/**/lib/` + `theia/**/node_modules/`:**
- Purpose: Compiled extension/app output (`tsc`) and yarn installs
- Generated: Yes (`yarn build`, `yarn install --frozen-lockfile`)
- Committed: No (git-ignored)

**`powerbrowser/branding/`:**
- Purpose: Phase 1 hand-written branding literals — the byte-identity reference, not build input
- Generated: No
- Committed: Yes (deliberate: Phase 2 acceptance is byte-identity against these files; no generator/template may have produced them)

**`.planning/`:**
- Purpose: GSD record — `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `phases/`, `codebase/`, `research/`
- Generated: No (working record; excluded from the brand-residue scan by design)
- Committed: Yes

---

*Structure analysis: 2026-09-04*
