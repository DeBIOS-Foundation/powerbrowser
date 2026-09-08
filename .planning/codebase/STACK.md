# Technology Stack

**Analysis Date:** 2026-09-07

## Languages

**Primary:**
- TypeScript ~5.9.3 — the Theia sidecar: `theia/extensions/*/src/`, `theia/applications/browser/`
- JavaScript (ESM, `.mjs`) — the generator and every verification check: `scripts/generate.mjs`, `scripts/verify-*.mjs`
- Firefox system modules (`.sys.mjs`) — the Gecko chrome layer: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/shell/TheiaService.sys.mjs`, `powerbrowser/shell/GroupActorChild.sys.mjs`
- Bash — drivers and gates: `scripts/verify-platform.sh`, `scripts/fetch-upstream.sh`, `scripts/apply-patches.sh`, `scripts/rebase-upstream.sh`

**Secondary:**
- TSX/React — Theia widgets, e.g. `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`
- Nix — the two dev shells in `flake.nix`
- TOML — the single rebrand manifest, `configuration.toml`
- Chrome XHTML/CSS/JS — the shell window: `powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser/shell/powerbrowser.css`, `powerbrowser/shell/powerbrowser.js`, `powerbrowser/shell/powerbrowser-sidecar.js`
- Unified diff — the Gecko patch stack: `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`
- Makefile fragments — `defs.mk`, `powerbrowser/shell/moz.build`, `powerbrowser/shell/jar.mn`

## Runtime

**Environment:**
- Node.js 22 (pinned `pkgs.nodejs_22` in `flake.nix`; `theia/package.json` `engines.node >= 22`). The pin is load-bearing: `yarn` is overridden onto the same Node so native modules build for one `MODULE_VERSION`.
- Gecko / Firefox ESR — `FIREFOX_153_1_0esr_RELEASE`, declared in `configuration.toml` `[upstreams]`, emitted to `generated/upstream-pins.env`, consumed by `scripts/fetch-upstream.sh`.

**Package Manager:**
- Yarn 1 (`engines.yarn >= 1.7.0 < 2`), Yarn workspaces over `theia/applications/*` and `theia/extensions/*`
- Lockfile: `theia/yarn.lock` present
- No root-level `package.json`; the JS project root is `theia/`

## Frameworks

**Core:**
- Eclipse Theia 1.74.1 — the sidecar GUI framework, consumed strictly as `@theia/*` npm dependencies (`theia/applications/browser/package.json`). Never vendored, never patched; `scripts/diff-theia-core.sh` is the gate.
- `@theia/monaco-editor-core` 1.108.201 — the one deliberate exception to the 1.74.1 line (it follows upstream Monaco's own versioning)
- React 18.3.1 / React DOM 18.3.1 — Theia's widget layer
- InversifyJS DI — via `@theia/core`; extension wiring lives in each `*-frontend-module.ts` / `*-backend-module.ts`
- Gecko/Firefox — as a patch-set overlay, not a fork. `upstream/` is a fetched pinned checkout that is never hand-edited.

**Testing:**
- No unit-test framework. Verification is a registry of standalone Node and Bash checks driven by `scripts/verify-platform.sh`; each `scripts/verify-*.mjs` carries its own `--self-test` fault-planting mode.

**Build/Dev:**
- `@theia/cli` 1.74.1 — `theia rebuild:browser`, `theia download:plugins`, `theia build` (`theia/applications/browser/package.json` scripts)
- webpack (via `@theia/cli`) — app bundling
- `./mach build` — Gecko, driven from `upstream/` with `MOZCONFIG=../.mozconfig`
- Nix flake dev shells: `nix develop .#theia`, `nix develop .#firefox` (`flake.nix`)
- sccache — Rust/C++ compile cache; `RUSTC_WRAPPER=sccache` in the firefox shell and `--with-ccache=sccache` in `.mozconfig`
- Inkscape 1.4.4 — pinned in the theia shell because `scripts/generate.mjs` rasterises `brand/mark.svg` and the tracked PNGs are byte-compared
- clang via `pkgs.llvmPackages.stdenv` — required, the firefox shell overrides `mkShell`'s stdenv to match `buildMozillaMach`
- node-gyp from the pinned Node's npm — `drivelist` has no prebuild and falls through to a native rebuild

## Key Dependencies

**Critical:**
- `@theia/core` 1.74.1 — every `@powerbrowser/*` extension depends on it
- `better-sqlite3` 13.0.3 — read-only reader for the chrome-owned tab store (`theia/extensions/tab-uris/src/node/tab-query-service.ts`, local typings in `better-sqlite3.d.ts`). Native module, hence the Node-version pin.
- `@agentclientprotocol/sdk` 1.4.0 — ACP client for the OpenCode chat backend (`theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts`)
- `p-debounce` ^2.1.0 — used by `chrome-bar`, `customize`, `modes`

**Infrastructure (in-repo workspaces, `theia/extensions/`):**
- `@powerbrowser/token-gate` 0.1.0 — captures and scrubs `POWERBROWSER_*` env vars, gates backend endpoints, parent watchdog
- `@powerbrowser/tab-uris` 0.1.0 — URI/tab registry, the bridge-shaped seam (`TabUriRegistry`, shape asserted by `scripts/verify-registry-shape.mjs`)
- `@powerbrowser/branding` 0.1.0 — welcome/about surfaces
- `@powerbrowser/modes` 0.1.0 — mode switching and setups
- `@powerbrowser/chrome-bar` 0.1.0 — the in-Theia bar/strip
- `@powerbrowser/customize` 0.1.0 — user-storage-backed customization
- `@powerbrowser/telemetry` 0.1.0 — manifest-gated sender, off by default
- `@powerbrowser/backend-opencode` 0.1.0 — the optional AI chat backend

## Configuration

**Rebrand manifest (the only hand-edited input):**
- `configuration.toml` — `[product] [identity] [legal] [theia] [[variants]] [installer] [telemetry] [upstreams] [ai]`
- `brand/mark.svg` — the one raster/vector source
- `node scripts/generate.mjs` rewrites `generated/`: `identity.configure`, `upstream-pins.env`, `theia-frontend-config.json`, `theia-branding.json`, `theia-telemetry.json`, `theia-plugins.json`, `ai-backend.json`, `endpoint-hosts.json`, `webextensions-settings.json`, `branding/`, `installer/`, desktop files
- `generate --check` and the `generated-byte-identity` verification row assert the derived files match the tracked hand-written ones

**Build:**
- `.mozconfig` — generated; sets `--with-app-basename=powerbrowser`, `--with-distribution-id=org.debios`, `--disable-crashreporter`, `--enable-unverified-updates`, branding dir, objdir
- `defs.mk` — `XPI_ROOT_APPID=$(MOZ_APP_ID)` for the symlinked-out subtrees
- `flake.nix` / `flake.lock` — toolchain pin (nixpkgs `nixos-unstable`)
- `toolchain-baseline.txt` + `scripts/toolchain-baseline.sh` — recorded toolchain versions
- `opencode.json` — OpenCode agent permissions
- Objdirs: `objdir` (dev), `objdir-release`, `objdir-nplus1`

**Runtime environment variables:**
- `POWERBROWSER_*` — the shell→sidecar channel, captured and scrubbed in `theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- `POWERBROWSER_MCP_PORT`, `POWERBROWSER_MCP_TOKEN`, `POWERBROWSER_PROFILE_DIR`, `POWERBROWSER_SIDECAR_PREFS`, `POWERBROWSER_MODES_JSON`, `POWERBROWSER_DECK_STATE`, `POWERBROWSER_BRANDING`, `POWERBROWSER_OBJDIR`, `POWERBROWSER_REPO_ROOT`
- `THEIA_CONFIG_DIR` — set to `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser` by the app's `start` script
- `VSX_REGISTRY_URL=https://open-vsx.org` — same script
- No `.env` file in the tree; configuration flows through the manifest and process env.

## Platform Requirements

**Development:**
- Linux x86_64 only — `flake.nix` declares `system = "x86_64-linux"`
- Nix with flakes; builds run inside `nix develop .#theia` or `nix develop .#firefox`, never the host shell
- The checkout path must contain no space character — `NIX_LDFLAGS` is space-separated and every native link step breaks otherwise
- `upstream/` is a ~1.1 GB Firefox clone materialized by `scripts/fetch-upstream.sh`
- Full `./mach build` is roughly 47–54 minutes on the reference host (`docs/BUILD.md`); `scripts/verify-platform.sh --quick` is the seconds-scale commit gate

**Production:**
- Self-hosted MAR updates over the fork's own `AppUpdateURL` (`powerbrowser/distribution/policies.json`); packaging under `powerbrowser/packaging/`, NSIS installer inputs under `generated/installer/`; release process in `docs/RELEASING.md`

---

*Stack analysis: 2026-09-07*
