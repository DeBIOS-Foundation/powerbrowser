# Technology Stack

**Analysis Date:** 2026-09-04

## Languages

**Primary:**
- TypeScript ~5.9.3 - Theia sidecar: all code under `theia/extensions/*` (`branding`, `tab-uris`, `customize`, `token-gate`) and `theia/applications/browser/` build files (`esbuild.mjs`, `gen-esbuild.*.mjs`)
- JavaScript (ES modules, `.sys.mjs` / `.mjs`) - Gecko shell layer `powerbrowser/shell/` (`PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs`, `powerbrowser-sidecar.js`, `powerbrowser.js`); all build/verify tooling under `scripts/*.mjs` (notably `scripts/generate.mjs`, `scripts/verify-*.mjs`); vendored TOML parser `scripts/lib/toml.cjs`
- Bash - Upstream/rebase/patch lifecycle `scripts/fetch-upstream.sh`, `scripts/apply-patches.sh`, `scripts/rebase-upstream.sh`, `scripts/check-patch-surface.sh`, `scripts/check-internals-boundary.sh`, `scripts/verify-platform.sh`, `scripts/verify-endpoints.sh`, `scripts/smoke-*.sh`, `scripts/toolchain-baseline.sh`

**Secondary:**
- TOML - Single rebrand input `configuration.toml` (validated against `scripts/lib/config-schema.json`)
- JSON - Pref defaults `powerbrowser/branding/{dev,release}/pref/firefox-branding.js` (JS-syntax prefs), endpoint policy `powerbrowser/endpoint-allowlist.json`, enterprise policy `powerbrowser/distribution/policies.json`, schema `scripts/lib/config-schema.json`, all `package.json` manifests
- Nix expression language - `flake.nix` (two dev shells: `.#theia`, `.#firefox`)
- Mozilla build DSL - `.mozconfig` (generated from `configuration.toml`), `powerbrowser/shell/moz.build`, `powerbrowser/branding/*/moz.build`, `content/jar.mn`, `locales/jar.mn`
- Fluent (`.ftl`) + legacy `.properties` - `powerbrowser/branding/{dev,release}/en-US/brand.ftl`, `brand.properties`
- CSS - `powerbrowser/shell/powerbrowser.css`, `powerbrowser/branding/*/content/aboutDialog.css`, Theia `customize` extension runtime CSS injection (`theia/extensions/customize/src/browser/customize-css-contribution.ts`)
- XUL/XHTML - `powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser/shell/components.conf`, `powerbrowser/shell/jar.mn`
- C++ / Rust - Not authored here. They are the `upstream/` Gecko implementation language, reached only through the patch stack (`patches/*.patch`) and the `PowerBrowserAPI.sys.mjs` anti-corruption layer (catalogued in `powerbrowser/INTERNAL-APIS.md`)
- Python - Gecko build tooling inside `upstream/` (driven via `./mach`), plus `python3` in the `.#theia` dev shell for `node-gyp` native modules

## Runtime

**Environment:**
- Node.js 22 (pinned `pkgs.nodejs_22` in `flake.nix`; `engines: node >= 22` in `theia/package.json`). Host shells may carry another Node (e.g. v24) — builds must run under `nix develop .#theia`
- Yarn 1.x (`engines: yarn >=1.7.0 <2` in `theia/package.json`; `flake.nix` overrides `pkgs.yarn` to run on Node 22 so `node-gyp` native modules target the right `MODULE_VERSION`)
- Gecko/Firefox ESR 153 — pinned tag `FIREFOX_153_1_0esr_RELEASE` (`scripts/fetch-upstream.sh`, `TAG` override; `flake.nix` `.#firefox` shell uses `inputsFrom = [ pkgs.firefox-esr-153-unwrapped ]`)
- Rust 1.97.1 / Cargo 1.97.0 / cbindgen 0.29.4 — authoritative values in `toolchain-baseline.txt`, enforced by `scripts/toolchain-baseline.sh`; supplied by the `.#firefox` shell (clang via `llvmPackages.stdenv`, `RUSTC_WRAPPER=sccache`)

**Package Manager:**
- Yarn 1.x workspaces for the Theia sidecar (`theia/package.json` declares `workspaces: ["applications/*", "extensions/*"]`)
- Lockfile: `theia/yarn.lock` (present — committed; install via `nix develop .#theia` then `yarn install` inside `theia/`)
- No root `package.json`, no npm: repo root is manifest-driven (`configuration.toml`), and `scripts/` deliberately has zero install step — `scripts/lib/toml.cjs` is vendored `smol-toml@1.8.0` source, verified by `scripts/verify-vendored-parser.mjs`, so `scripts/verify-platform.sh --quick` runs on a fresh clone with only system `node`

## Frameworks

**Core:**
- Eclipse Theia 1.74.1 - Default GUI sidecar. Every `@theia/*` dependency is pinned to `1.74.1` twice: as `resolutions` in `theia/package.json` and as direct deps in `theia/applications/browser/package.json`. Consumed strictly as npm dependencies — never vendored, never patched (`scripts/diff-theia-core.sh` enforces this). Composed app: `theia/applications/browser/` (`powerbrowser-theia-browser-app`)
- Gecko / Firefox ESR 153 - Browser substrate. `upstream/` checkout (gitignored, multi-GB) + `patches/` stack (`010-powerbrowser-identity.patch`, `020-powerbrowser-shell.patch`) + `powerbrowser/` tree overlaid via symlink. Never hand-edited (`git -C upstream diff` must stay empty outside patch paths)
- React 18.3.1 + react-dom 18.3.1 - Theia frontend UI (direct deps of `theia/applications/browser/package.json`; `@types/react 18.3.31`, `@types/react-dom 18.3.7` devDeps in `theia/package.json`)
- InversifyJS (DI) - Via `@theia/core/shared/inversify` (see `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`); the standard Theia contribution/module pattern (`*-frontend-module.ts`, `*-backend-module.ts`) is used by all four `@powerbrowser/*` extensions
- Express - Via `@theia/core/shared/express` (token-gate backend middleware: `BackendApplicationContribution`, `EarlyExpressMiddleware`)
- Monaco editor core 1.108.201 - Pinned alongside Theia (`@theia/monaco-editor-core` in both `theia/package.json` resolutions and the browser app deps)

**Theia AI feature set (compiled in, user-keyed at runtime):**
- `@theia/ai-anthropic`, `@theia/ai-openai`, `@theia/ai-core`, `@theia/ai-core-ui`, `@theia/ai-chat`, `@theia/ai-chat-ui`, `@theia/ai-ide`, `@theia/ai-editor`, `@theia/ai-terminal`, `@theia/ai-code-completion`, `@theia/ai-mcp`, `@theia/ai-mcp-ui` — all `1.74.1`, direct deps of `theia/applications/browser/package.json`. No keys or endpoints in tree; providers are configured by the end user at runtime

**Testing:**
- No unit-test runner (no jest/vitest/mocha config anywhere). Verification is bespoke: `node --self-test` entry points inside each `scripts/verify-*.mjs` check plus `scripts/verify-platform.sh` as the single driver/registry (`--quick` = commit gate, `--only <label>` = one check, `--gate` = full + `WINDOWS.md` exclusions). `@theia/test 1.74.1` is present only as a composed Theia framework package, not as project test harness

**Build/Dev:**
- esbuild - Theia browser app bundler (`theia/applications/browser/esbuild.mjs` + generated `gen-esbuild.browser.mjs` / `gen-esbuild.node.mjs`); app scripts: `rebuild` (`theia rebuild:browser`), `build` (`theia build --app-target=browser --mode development`), `start` (`theia start`)
- TypeScript project references - Each extension builds with `tsc -b` (`"build": "tsc -b"`, `"clean": "rm -rf lib *.tsbuildinfo"`); root sidecar build order is `theia/package.json` `"build:extensions"` (branding → tab-uris → customize → token-gate) then the browser app
- `scripts/generate.mjs` - THE build-time generator: reads `configuration.toml`, validates against `scripts/lib/config-schema.json`, emits 23 byte-identical targets under `generated/` (branding `configure.sh`, `.mozconfig`, `.desktop` files, per-variant `brand.ftl`/`brand.properties`/`moz.build`/`jar.mn`/`aboutDialog.css`/`firefox-branding.js`). `--check` and `--self-test` modes; nothing under `generated/` is written until all checks pass
- Mozilla `mach` build - `./mach build` with `MOZCONFIG=../.mozconfig` inside `upstream/` (tier-3 cost, ~47–54 min per `docs/BUILD.md`); `MOZBUILD_STATE_PATH` anchored repo-local (`.mozbuild/`) by the `.#firefox` shell hook; `sccache` wraps `rustc`
- `p-debounce ^2.1.0` - Only third-party runtime dep outside Theia/React: used by `@powerbrowser/customize` (`theia/extensions/customize/package.json`)

## Key Dependencies

**Critical:**
- `@theia/* @ 1.74.1` (~40 packages) - Entire IDE substrate: `core`, `monaco`, `filesystem`, `terminal`, `preferences`, `navigator`, `editor`, `debug`, `plugin`/`plugin-ext`/`plugin-ext-vscode`, `ovsx-client`, `vsx-registry`, `ai-*`, and the rest listed in `theia/package.json` resolutions. Re-pinned as a set on upstream adoption; never partially upgraded
- `@powerbrowser/branding`, `@powerbrowser/tab-uris`, `@powerbrowser/customize`, `@powerbrowser/token-gate` (all `0.1.0`, `private: true`) - First-party Theia extensions composed into `theia/applications/browser/package.json`. `customize` depends on `@powerbrowser/tab-uris`; `tab-uris` consumes `@theia/ai-chat-ui`, `@theia/output`, `@theia/plugin-ext(-vscode)`, `@theia/preferences`, `@theia/terminal`, `@theia/vsx-registry`; `branding` consumes `@theia/ai-ide` + `@theia/core`; `token-gate` is backend-only (`lib/node/token-gate-backend-module`)
- `smol-toml 1.8.0` (vendored, not installed) - `scripts/lib/toml.cjs` + provenance header + `scripts/lib/toml.LICENSE` (BSD-3-Clause). Pinned by sha256 recorded in the file header; `scripts/verify-vendored-parser.mjs` re-derives both sides
- Gecko ESR 153 source - Not a package; the `upstream/` git checkout at `FIREFOX_153_1_0esr_RELEASE` from `https://github.com/mozilla-firefox/firefox.git`, mutated only by `scripts/apply-patches.sh` replaying `patches/*.patch`

**Infrastructure:**
- `nixpkgs nixos-unstable` (`flake.lock` rev `ffb3c9b...`) - Supplies both dev shells; `firefox-esr-153-unwrapped` supplies the Gecko toolchain via `inputsFrom`
- `sccache` - Compiler cache in the `.#firefox` shell (`buildInputs`), exported as `RUSTC_WRAPPER`
- `node-gyp` (bundled with pinned Node's npm, prepended to `PATH` in the `.#theia` shell hook) - Required because `drivelist` ships no prebuild and falls through to `node-gyp rebuild`
- System libs `libx11`, `libxkbfile`, `pkg-config`, `gnumake`, `python3` - Native-module build inputs in the `.#theia` shell
- `actions/checkout@v4.4.0` (pinned SHA `11d5960a...`) - Only CI action, in `.github/workflows/rebase-upstream.yml`

## Configuration

**Environment:**
- `configuration.toml` + `brand/` are the ONLY rebrand inputs (CFG-01). Sections: `[product]` (vendors, description, homepage), `[identity]` (all REQUIRED: `display_name`, `app_basename`, `binary_name`, `remoting_name`, `distribution_id`), `[legal]` (all REQUIRED: `license`, `copyright_holder`, `trademark_notice`), `[theia]` (`default_theme`), `[[variants]]` (`dev` with `name_suffix = " Dev"`, `branding_dir = "powerbrowser/branding/dev"`, `objdir = "objdir"`; `release` with empty suffix, `powerbrowser/branding/release`, `objdir-release`). Schema: `scripts/lib/config-schema.json`. Required keys can never be inherited from defaults (mask-then-merge in `scripts/generate.mjs`); unknown/reserved (`__proto__`, `constructor`, `prototype`) keys are hard failures. Machine-specific values are forbidden in the manifest — repo root is derived from the generator's own path, `.desktop` absolute paths use the `@POWERBROWSER_REPO_ROOT@` install-time token
- Shell env (runtime): `POWERBROWSER_SUPERVISED=1`, `POWERBROWSER_TOKEN` (per-spawn supervisor-minted credential delivered over stdin, never inherited — `theia/extensions/token-gate/src/node/powerbrowser-env.ts`), `POWERBROWSER_TOKEN_DISABLE` (dev-only bypass), `THEIA_CONFIG_DIR` (`${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser`, created in the app `start` script), `VSX_REGISTRY_URL=https://open-vsx.org`
- Shell env (build): `MOZCONFIG`, `MOZBUILD_STATE_PATH` (repo-local `.mozbuild/`), `POWERBROWSER_OBJDIR` / `POWERBROWSER_BRANDING` (release overrides for the dev defaults baked into `.mozconfig`), `LIBCLANG_PATH`, `RUSTC_WRAPPER=sccache`, `TAG` (upstream pin override for `scripts/fetch-upstream.sh`)
- Firefox prefs: `powerbrowser/branding/{dev,release}/pref/firefox-branding.js` (unlocked `pref()` calls only — no `autoconfig.js`/locking, per D-84); enterprise policy `powerbrowser/distribution/policies.json` (`DisableAppUpdate`, `DisableTelemetry`, `DisableFirefoxStudies`); network policy `powerbrowser/endpoint-allowlist.json` (`hosts` + `prefs`, enforced by `scripts/verify-endpoints.sh`)
- Brand-token inventory: `inventory/brand-tokens.json` (sole file allowed to name the originating product; drives `scripts/scan-brand-residue.mjs` and `scripts/verify-branding-preflight.mjs` expectations)

**Build:**
- `flake.nix` — `.#theia` (Node 22 + yarn + python3 + native inputs) and `.#firefox` (Gecko toolchain via `inputsFrom`, clang `stdenv` override, sccache). `flake.lock` pins `nixos-unstable`
- `.mozconfig` — Generated artifact (banner: `Generated from configuration.toml by scripts/generate.mjs`); build consumes the tracked copy, generator writes `generated/` (byte-identity gated by `scripts/verify-generated-identity.mjs` via `scripts/verify-platform.sh --only generated-byte-identity`)
- `.envrc` + `.direnv/` — direnv/Nix integration (do not hand-edit generated state)
- `theia/*/tsconfig.json` — Per-extension TypeScript project references
- `theia/applications/browser/package.json` `theia.frontend.config` — `applicationName: "Power Browser"`, `powerbrowserPrivilegedJs: false` (default-off dev flag, enforced by `scripts/verify-dev-flag-off.mjs`), `security.workspace.trust.enabled: false`; backend `frontendConnectionTimeout: 3000`

## Platform Requirements

**Development:**
- Linux `x86_64-linux` (both dev shells pin `system = "x86_64-linux"`); Nix with flakes; checkout path must contain NO space character (hard rule — `NIX_LDFLAGS` rpath splitting breaks native links in both Gecko and `node-gyp` builds)
- `nix develop .#theia` for `theia/` (`node` works outside, `yarn` does not); `nix develop .#firefox` for `upstream/` (`rustc`, `cargo`, `cbindgen`, `clang` supplied — no separate toolchain setup)
- Fresh clone needs `scripts/fetch-upstream.sh` (multi-GB clone, re-runnable, verifies `HEAD` == pinned tag + D-76 dirt classification) then `scripts/apply-patches.sh`, then `node scripts/generate.mjs` before `./mach configure`
- Commit gate is seconds: `scripts/verify-platform.sh --quick` (no build, no browser, no display). Full `./mach build` is ~47–54 min — never spend it on a typo

**Production:**
- Deployment target is a locally installed Gecko application, not a hosted service: Gecko packaging machinery produces per-OS installers; Linux desktop entries `powerbrowser/powerbrowser.desktop` and `powerbrowser/powerbrowser-release.desktop` (generated, `Exec`/`Icon` carry the `@POWERBROWSER_REPO_ROOT@` token substituted at install time per `docs/BUILD.md`); `StartupWMClass` = remoting name; `powerbrowser/branding-generated/` symlink exposes `generated/branding/` inside topsrcdir for `--with-branding`
- No server, container, or cloud target. The Theia backend is a supervised loopback sidecar spawned by `powerbrowser/shell/TheiaService.sys.mjs` at browser runtime, not a deployed process
- Excluded by design (never scanned, never committed): `upstream/` (~5 GB ESR checkout, reproducible via `scripts/fetch-upstream.sh`), `objdir/` + `objdir-release/` (Gecko build output), `theia/**/node_modules`, `generated/` (gitignored generator output), `.mozbuild/` (local mozbuild state), `powerbrowser/branding-generated` (untracked overlay symlink)

---

*Stack analysis: 2026-09-04*
