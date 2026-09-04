# Technology Stack

**Analysis Date:** 2026-09-04

## Languages

**Primary:**
- TypeScript (~5.9.3, `ES2017` target, `commonjs` modules) - all Theia sidecar code: `theia/extensions/*/src/**/*.ts(.tsx)`, built per-extension with `tsc -b`
- JavaScript ES modules (`.sys.mjs`, no `setTimeout` in module global scope) - Gecko shell: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (the one internals boundary), `powerbrowser/shell/TheiaService.sys.mjs` (supervisor, boundary consumer only)
- JavaScript ESM (Node, `node:` built-ins only where noted) - all `scripts/*.mjs` checkers and `scripts/generate.mjs` generator
- Bash (`set -uo pipefail`, no `-e` in the driver) - `scripts/*.sh`, above all `scripts/verify-platform.sh` (the single check registry)

**Secondary:**
- Nix (flake expression) - `flake.nix` defines the two dev shells (`#theia`, `#firefox`)
- Python 3 (system `pkgs.python3`, no virtualenv, no `requirements.txt`) - Gecko `mach`/mozbuild toolchain only; no first-party Python source in this tree
- Rust 1.97.1 / C++ (upstream Gecko, never hand-edited) - compiled via `./mach build` inside `upstream/`; this repo authors only `patches/*.patch` plus `powerbrowser/shell/` chrome code
- CSS - `powerbrowser/shell/powerbrowser.css`, per-variant `aboutDialog.css` branding surfaces
- TOML - `configuration.toml` (the only hand-edited rebrand input file)
- Fluent (`*.ftl`) + legacy `.properties` - branding locale surfaces (`brand.ftl`, `brand.properties` per variant)
- mozbuild dialect (Python-embedded) - `powerbrowser/shell/moz.build`, branding `moz.build` files

## Runtime

**Environment:**
- Node.js 22 (`pkgs.nodejs_22`, "one Node version for the whole sidecar toolchain" - `flake.nix:14-21`) for everything Theia-side: lifecycle scripts, `node-gyp`, backend, `esbuild`
- Firefox ESR 153 (`FIREFOX_153_1_0esr_RELEASE`, `firefox-esr-153-unwrapped` stdenv) - the Gecko shell runtime; built binary runs outside the dev shell, verified live (`scripts/lib/firefox-bidi.mjs:13-20`)
- System Inkscape - icon raster pipeline only (`scripts/generate.mjs:1501-1513`, per-variant `default16/32/48/64/128.png` from `brand/mark.svg`)

**Package Manager:**
- Yarn Classic (`>=1.7.0 <2`, `engines` in `theia/package.json:59-62`), overridden to run on the pinned Node 22 (`flake.nix:21`)
- Lockfile: present and enforced - `theia/yarn.lock` + `yarn install --frozen-lockfile` (docs: `docs/BUILD.md:49`)
- Nix flakes (`flake.lock` pins `nixos-unstable` @ `ffb3c9b700e759be2ef13237c9d8f953b32a1e46`) for system toolchains; host Node 24 exists but is explicitly excluded from the toolchain (MODULE_VERSION 137 mismatch, `flake.nix:15-19`)

## Frameworks

**Core:**
- Eclipse Theia 1.74.1 - sidecar GUI framework; 49-`@theia/*`-package "daily-drivable set" composed in `theia/applications/browser/package.json:26-74`, all versions pinned via `resolutions` in `theia/package.json:7-58`
- React 18.3.1 (`react`, `react-dom` in `theia/applications/browser/package.json:75-76`) - Theia frontend rendering (`.tsx` widgets, e.g. `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`)
- InversifyJS (via `@theia/core/shared/inversify`) - DI for all `@powerbrowser/*` contributions (e.g. `@injectable()` in `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`)
- Express (via `@theia/core/shared/express`) - Theia backend HTTP layer; `@powerbrowser/token-gate` inserts at `EarlyExpressMiddleware` (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`)
- Monaco editor core 1.108.201 (`@theia/monaco-editor-core`, `theia/package.json:35`) - editor widget backend

**Theia AI stack (composed but not wired to any key in-tree):**
- `@theia/ai-anthropic`, `@theia/ai-openai`, `@theia/ai-core`, `@theia/ai-chat`, `@theia/ai-mcp`, `@theia/ai-terminal`, etc. (`theia/applications/browser/package.json:26-37`) - present as dependencies; no API keys, endpoints, or provider config exist anywhere in this tree

**Testing:**
- No unit-test framework in first-party code - no `jest`/`vitest`/`mocha`/`playwright` config or scripts outside `theia/node_modules/` (transitive only)
- Verification driver: `scripts/verify-platform.sh` (bash registry, `CHECKS+=(...)` at `scripts/verify-platform.sh:3738`) invoking `scripts/verify-*.mjs` Node checkers + `scripts/*.sh` layer scripts; every checker carries a `--self-test` that plants faults and must go red
- Zero-dependency WebDriver BiDi harness: `scripts/lib/firefox-bidi.mjs` (global `WebSocket` on Node 22, no Playwright/Puppeteer/geckodriver per D-69)
- Smoke scripts: `scripts/smoke-theia.sh` (yarn install + drivelist rebuild + boot), `scripts/smoke-firefox.sh` (no-bootstrap + `--version` pin assert)

**Build/Dev:**
- `esbuild` via `@theia/bundle-plugin` - backend (`gen-esbuild.node.mjs`) + browser (`gen-esbuild.browser.mjs`) bundles, driven by `theia/applications/browser/esbuild.mjs`; native binding allowlist is one entry (`drivelist: drivelist/build/Release/drivelist.node`)
- `tsc -b` (TypeScript project references, `composite: true`, per-extension `tsconfig.json` e.g. `theia/extensions/tab-uris/tsconfig.json`) - `yarn build:extensions` in `theia/package.json:69`
- Theia CLI 1.74.1 (`@theia/cli`) - `theia rebuild:browser` + `theia build --app-target=browser --mode development` (`theia/applications/browser/package.json:81-84`)
- Gecko: `./mach build` under `nix develop .#firefox` with `MOZCONFIG=../.mozconfig`; `sccache` via `RUSTC_WRAPPER` (`flake.nix:85`); `MOZBUILD_STATE_PATH` anchored repo-local (`flake.nix:68`)
- Rebrand generator: `node scripts/generate.mjs` (reads `configuration.toml`, validates against `scripts/lib/config-schema.json`, writes 33 byte-identical targets under `generated/`)

## Key Dependencies

**Critical:**
- `@theia/*` 1.74.1 (49 packages) - the entire GUI substrate; adopted by re-pinning only, never patched (`scripts/diff-theia-core.sh` enforces)
- `react` / `react-dom` 18.3.1 - Theia frontend peer deps (`@types/react` 18.3.31, `@types/react-dom` 18.3.7 in `theia/package.json:63-67`)
- `p-debounce` ^2.1.0 - the ONLY direct third-party npm dependency outside Theia/React; used in `theia/extensions/customize/src/browser/customize-css-contribution.ts`
- Vendored TOML parser `scripts/lib/toml.cjs` (+ `scripts/lib/toml.LICENSE`) - `scripts/generate.mjs` parses `configuration.toml` with zero new npm installs

**First-party (`@powerbrowser/*` 0.1.0, composed in `theia/applications/browser/package.json:22-25`):**
- `@powerbrowser/branding` (`theia/extensions/branding/`) - welcome widget, frontend only
- `@powerbrowser/tab-uris` (`theia/extensions/tab-uris/`) - `TabUriRegistry`, frontend only; shape asserted by `scripts/verify-registry-shape.mjs`
- `@powerbrowser/customize` (`theia/extensions/customize/`) - CSS customization, frontend only, depends on `@powerbrowser/tab-uris`
- `@powerbrowser/token-gate` (`theia/extensions/token-gate/`) - backend-only Express gate + `GET /powerbrowser/health`

**Infrastructure:**
- `nixpkgs/nixos-unstable` (flake input) - supplies `nodejs_22`, `yarn`, `python3`, `pkg-config`, `gnumake`, `libx11`, `libxkbfile` (theia shell) and the full Gecko toolchain via `inputsFrom = [ pkgs.firefox-esr-153-unwrapped ]` with `llvmPackages.stdenv` override (clang, `flake.nix:57`)
- Gecko toolchain baseline `toolchain-baseline.txt`: `rustc 1.97.1`, `cargo 1.97.0`, `cbindgen 0.29.4`; diffed after every ESR rebase by `scripts/toolchain-baseline.sh`
- Native modules (transitive, prebuilt via platform optional-deps; install scripts skipped): `node-pty`, `@parcel/watcher`, `msgpackr-extract`, `esbuild`, `@vscode/ripgrep`; the one explicit rebuild is `drivelist@12.0.2` (`cd node_modules/drivelist && node-gyp rebuild`, `docs/BUILD.md:50`, node-gyp from pinned Node's npm per `flake.nix:43`)
- System `inkscape` - PNG raster pipeline in `scripts/generate.mjs` (never joined with manifest values on the command line)

## Configuration

**Environment:**
- Rebrand inputs (the ONLY two a downstream edits, CFG-01): `configuration.toml` + `brand/` (`brand/mark.svg`); generator `node scripts/generate.mjs` rewrites `generated/`; `--check` asserts freshness, `--self-test` exercises parse→merge→validate→emit
- Single schema table `scripts/lib/config-schema.json` - unknown-key rejection, required-key masking, and validation all derive from it; `required: true` doubles as the downstream-inheritance mask (D-06)
- `.mozconfig` is GENERATED output (banner: "do not edit here") - dev-variant defaults with `${POWERBROWSER_OBJDIR:-objdir}` / `${POWERBROWSER_BRANDING:-powerbrowser/branding-generated/dev}` shell fallbacks (`.mozconfig:6-16`)
- Sidecar prefs with code fallbacks (never throwing): `powerbrowser.sidecar.nodePath`, `backendMain`, `startupTimeoutMs` (90000), `healthIntervalStartupMs` (250), `healthIntervalSteadyMs` (5000), `healthTimeoutMs` (4000), `killGraceMs` (3000), `logBufferLines` (500), `giveUpAttempts` (6), `giveUpWallclockMs` (45000), `recoveryProbeIntervalMs` (15000) - defaults in `powerbrowser/shell/powerbrowser-sidecar.js`, read via `PowerBrowserAPI.getStringPref/getIntPref` in `powerbrowser/shell/TheiaService.sys.mjs`
- Theia app config in `theia/applications/browser/package.json:5-20` (`applicationName: "Power Browser"`, `frontendConnectionTimeout: 3000`, `powerbrowserPrivilegedJs: false`, workspace trust off); start script pins `VSX_REGISTRY_URL=https://open-vsx.org` and `THEIA_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"`
- `.envrc` contains only `use flake` (direnv → Nix); no `.nvmrc`/`.node-version`/`.python-version`; `.env*` files are absent by design (per-launch token is never persisted)
- Build variants from `configuration.toml:57-67`: `dev` (suffix `" Dev"`, `powerbrowser/branding/dev`, `objdir`) and `release` (empty suffix, `powerbrowser/branding/release`, `objdir-release`)

**Build:**
- `flake.nix` / `flake.lock` - Nix shells (never host toolchain; `yarn` does not work outside `nix develop .#theia`)
- `.mozconfig` - Gecko configure flags (`--enable-application=browser`, `--disable-updater`, `--disable-crashreporter`, `--with-ccache=sccache`, `--with-app-basename=powerbrowser`, `--with-distribution-id=org.debios`, `MOZ_APP_REMOTINGNAME=powerbrowser`)
- `patches/010-powerbrowser-identity.patch` (compile flags: vendor `DeBIOS`, `MOZ_APP_UA_NAME=Firefox`, telemetry/Normandy compiled out) and `patches/020-powerbrowser-shell.patch` (hook-only: adds `powerbrowser/shell` to `DIRS`)
- `powerbrowser/shell/moz.build`, `powerbrowser/shell/jar.mn`, `powerbrowser/shell/components.conf` - chrome packaging wiring
- Branding pref files `powerbrowser/branding/{dev,release}/pref/firefox-branding.js` - unattended-callout gates (see INTEGRATIONS.md)
- `theia/package.json` (workspaces `applications/*`, `extensions/*` + `@theia/*` resolutions), per-extension `package.json` + `tsconfig.json`, `theia/applications/browser/{esbuild.mjs,gen-esbuild.browser.mjs,gen-esbuild.node.mjs}`

## Platform Requirements

**Development:**
- Nix with flakes (`experimental-features = nix-command flakes`); two shells: `nix develop .#firefox` (Gecko toolchain) and `nix develop .#theia` (Node 22 + yarn + python3 + make + X11 libs)
- Linux `x86_64-linux` (flake `system` is fixed; Windows exclusions tracked via `--gate` in `scripts/verify-platform.sh`)
- Checkout path must contain NO space character (`NIX_LDFLAGS` is space-separated; breaks Gecko + node-gyp links) - e.g. `/home/chris/coding/Power-Browser`
- ~30 GB free disk, 8 GB RAM (full Gecko compile peaks ~14 GB `objdir/` + ~5.6 GB `upstream/` checkout); `upstream/` materialised by `scripts/fetch-upstream.sh` (default `TAG=FIREFOX_153_1_0esr_RELEASE`)
- Reference host `legion` (16 cores, 62 GB RAM, NixOS); full `./mach build` tier-3 ≈ 47–54 min; `--quick` (no build/browser/display) is the commit gate

**Production:**
- Linux desktop target: freedesktop `.desktop` entries emitted by the generator (`generated/powerbrowser.desktop`, `generated/powerbrowser-release.desktop`; `Exec`/`Icon` carry `@POWERBROWSER_REPO_ROOT@` token substituted at install time per `docs/BUILD.md`)
- Shipped shape: Gecko binary (`objdir/dist/bin/powerbrowser`) supervising a bundled Node 22 + Theia backend on loopback `127.0.0.1:3000`, presented full-window as the default GUI; stock browser chrome reachable via `window.open(url, '_blank')` (GUI-01)
- No updater, no crash reporter, no telemetry compiled or configured (compile flags + pref gates, audited by `scripts/verify-endpoints.sh` layers 1–3 against `powerbrowser/endpoint-allowlist.json`)
- License: PolyForm Noncommercial 1.0.0 (`LICENSE`, `configuration.toml:45`)

---

*Stack analysis: 2026-09-04*
