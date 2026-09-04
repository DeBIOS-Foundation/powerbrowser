# Codebase Structure

**Analysis Date:** 2026-09-04

## Directory Layout

```
Power-Browser/
├── configuration.toml      # THE rebrand manifest (only rebrand input besides brand/)
├── brand/                  # Rebrand assets (mark.svg)
├── generated/              # Generator output (git-ignored; copy over tracked files)
├── powerbrowser/           # Gecko-side tree: shell, branding, distribution
│   ├── shell/              # Chrome window + boundary + supervisor + prefs
│   ├── branding/           # Tracked hand-written branding dirs (dev, release)
│   ├── branding-generated/ # Symlink: powerbrowser/branding-generated -> ../../generated/branding
│   ├── distribution/       # policies.json
│   ├── endpoint-allowlist.json
│   ├── INTERNAL-APIS.md    # Boundary catalogue (derived, not hand-kept)
│   └── *.desktop           # Tracked hand-written desktop entries
├── theia/                  # Theia sidecar (yarn workspaces)
│   ├── applications/browser/  # Composed app (package.json = composition root)
│   └── extensions/         # @powerbrowser/* (branding, tab-uris, customize, token-gate)
├── patches/                # Gecko patch stack (010 identity, 020 shell hook)
├── upstream/               # Pinned ESR checkout (git-ignored, fetched, never edited)
├── objdir/                 # Gecko build output (powerbrowser binary lives here)
├── scripts/                # Generator, verification registry, guards, smoke scripts
│   ├── verify-platform.sh  # THE verification driver (CHECKS registry)
│   ├── generate.mjs        # THE generator
│   └── lib/                # config-schema.json, toml.cjs, firefox-bidi.mjs
├── docs/                   # BUILD.md, CUSTOMIZE.md, URI-SCHEMES.md
├── inventory/              # brand-tokens.json (only file allowed to name the origin product)
├── flake.nix               # Nix dev shells (#theia Node/yarn, #firefox Gecko toolchain)
├── .mozconfig              # Tracked hand-written Gecko build config
└── .planning/              # GSD planning docs (PROJECT.md, ROADMAP.md, codebase/)
```

## Directory Purposes

**Repo root:**
- Purpose: Rebrand inputs, build entry files, toolchain pins.
- Contains: `configuration.toml`, `brand/`, `.mozconfig`, `flake.nix`, `flake.lock`, `toolchain-baseline.txt`, `.mozconfig`-adjacent Gecko dotfiles (`.mozbuild/`, `.mozconfig`).
- Key files: `configuration.toml`, `flake.nix`, `.mozconfig`, `README.md`, `CLAUDE.md`

**`powerbrowser/shell/`:**
- Purpose: The entire privileged chrome surface: window, bootstrap, internals boundary, backend supervisor, default prefs, XPCOM/XUL registration.
- Contains: `.sys.mjs` modules, chrome JS/XHTML/CSS, `components.conf`, `jar.mn`, `moz.build`, preprocessed prefs.
- Key files: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/shell/TheiaService.sys.mjs`, `powerbrowser/shell/powerbrowser.js`, `powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser/shell/powerbrowser-sidecar.js`, `powerbrowser/shell/components.conf`

**`powerbrowser/branding/` + `powerbrowser/branding-generated/`:**
- Purpose: Tracked comparands (`branding/`) vs build-consumed link farm (`branding-generated/`). `branding/` holds the hand-written dev/release branding dirs byte-identity compares against; `branding-generated/` symlinks into `generated/branding/` so `--with-branding` stays inside topsrcdir.
- Contains: Per variant `configure.sh`, `brand.ftl`/`brand.properties`, `moz.build`, `jar.mn` files, `aboutDialog.css`, `pref/firefox-branding.js`, icon PNGs.
- Key files: `powerbrowser/branding/dev/configure.sh`, `powerbrowser/branding/release/configure.sh`

**`powerbrowser/distribution/`:**
- Purpose: Enterprise policy defaults shipped in the build.
- Contains: `powerbrowser/distribution/policies.json`

**`theia/extensions/`:**
- Purpose: All Theia-side additions, one directory per `@powerbrowser/*` npm package. Upstream `@theia/*` is consumed as pinned npm deps, never vendored.
- Contains: `branding/`, `tab-uris/`, `customize/`, `token-gate/` — each with `package.json`, `tsconfig.json`, `src/`, compiled `lib/`.
- Key files: `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`, `theia/extensions/token-gate/src/node/powerbrowser-env.ts`, `theia/extensions/tab-uris/src/browser/browser-window-command.ts`

**`theia/applications/browser/`:**
- Purpose: The composed Theia application: dependency list (four `@powerbrowser/*` + pinned `@theia/*` 1.74.1), frontend config (`applicationName`, `powerbrowserPrivilegedJs: false`), build/start scripts.
- Contains: `package.json`, `src-gen/` (generated DI wiring), `lib/` (built backend incl. `lib/backend/main.js` — the supervisor's spawn target).
- Key files: `theia/applications/browser/package.json`

**`patches/`:**
- Purpose: The entire Gecko diff as a regenerable stack (never hand-edit a hunk body).
- Contains: `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`
- Key files: `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`

**`scripts/`:**
- Purpose: Generator, the one verification driver, executable guards, smoke scripts, per-surface checkers.
- Contains: `verify-platform.sh`, `generate.mjs`, `check-*.sh`, `verify-*.mjs`, `smoke-*.sh`, `fetch-upstream.sh`, `apply-patches.sh`, `rebase-upstream.sh`, `scan-brand-residue.mjs`, `rename-brand.mjs`, `lib/`.
- Key files: `scripts/verify-platform.sh`, `scripts/generate.mjs`, `scripts/check-internals-boundary.sh`, `scripts/lib/config-schema.json`

**`generated/` + `brand/`:**
- Purpose: Generator outputs (`generated/`, git-ignored: `.mozconfig`, `branding/`, `*.desktop`) and rebrand art inputs (`brand/mark.svg`).
- Contains: `generated/.mozconfig`, `generated/branding/dev|release/`, `generated/powerbrowser*.desktop`; `brand/mark.svg`.
- Key files: `generated/.mozconfig`, `configuration.toml`, `brand/mark.svg`

**`upstream/` + `objdir/`:**
- Purpose: Fetched ESR source (`upstream/`, git-ignored ~1.1 GB) and Gecko build output (`objdir/`, binary at `objdir/dist/bin/powerbrowser`).
- Contains: Full Firefox-ESR tree; compiled objects + `dist/`.
- Key files: `upstream/browser/moz.configure` (patch 010 target), `upstream/browser/base/content/aboutDialog.xhtml` (suppression-gate subject), `objdir/dist/bin/powerbrowser`

**`docs/` + `inventory/`:**
- Purpose: Human build/customize/scheme docs; machine brand-token inventory.
- Contains: `docs/BUILD.md`, `docs/CUSTOMIZE.md`, `docs/URI-SCHEMES.md`; `inventory/brand-tokens.json` (sole file allowed to name the originating product).
- Key files: `docs/BUILD.md`, `inventory/brand-tokens.json`

## Key File Locations

**Entry Points:**
- `powerbrowser/shell/components.conf`: XPCOM registration of `PowerBrowserSingleInstanceHandler` (startup-window selection + second-launch focus).
- `powerbrowser/shell/powerbrowser.xhtml`: Startup window document (loading/error/diagnostics deck + remote `<browser>`).
- `powerbrowser/shell/powerbrowser.js`: Chrome bootstrap (`DOMContentLoaded` → sentinels → supervisor start).
- `theia/extensions/*/src/browser/*-frontend-module.ts` + `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`: Inversify composition roots.
- `theia/applications/browser/lib/backend/main.js`: Built backend entry (supervisor spawn target; configured via `powerbrowser.sidecar.backendMain`).
- `scripts/generate.mjs`: Generator CLI.
- `scripts/verify-platform.sh`: Verification driver.

**Configuration:**
- `configuration.toml`: Rebrand manifest (`product`, `identity`, `legal`, `theia`, `variants`).
- `scripts/lib/config-schema.json`: Single schema for mask + validation.
- `powerbrowser/shell/powerbrowser-sidecar.js`: Preprocessed sidecar default prefs.
- `powerbrowser/distribution/policies.json`: Enterprise policies.
- `.mozconfig`: Gecko build config (tracked comparand; `generated/.mozconfig` is the emitter output).
- `theia/applications/browser/package.json`: Theia composition + frontend config.
- `flake.nix`: `#theia` (Node 22/yarn) and `#firefox` (clang/rustc/cargo/cbindgen/sccache) dev shells.

**Core Logic:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs`: Internals boundary + single-instance handler.
- `powerbrowser/shell/TheiaService.sys.mjs`: Backend supervisor.
- `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: Factory↔URI registry (bridge contract).
- `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`: Backend auth gate.
- `theia/extensions/token-gate/src/node/powerbrowser-env.ts`: Env capture + stdin token read.
- `powerbrowser/INTERNAL-APIS.md`: Boundary catalogue (enforced, not prose).

**Testing:**
- `scripts/verify-platform.sh`: CHECKS registry (only place a check is registered).
- `scripts/verify-*.mjs`: Per-surface checkers, each with `--self-test` (e.g. `scripts/verify-registry-shape.mjs`, `scripts/verify-shell-error-copy.mjs`, `scripts/verify-generated-identity.mjs`, `scripts/verify-start-path-recovery.mjs`, `scripts/verify-shell-error-contract.mjs`).
- `scripts/check-internals-boundary.sh`, `scripts/check-patch-surface.sh`: Executable architecture guards.
- `scripts/smoke-theia.sh`, `scripts/smoke-firefox.sh`, `scripts/verify-endpoints.sh`: Live smoke/endpoint gates.

## Naming Conventions

**Files:**
- Gecko chrome modules: `PascalCase.sys.mjs` for ES modules (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/shell/TheiaService.sys.mjs`); `lowercase.js` for classic chrome scripts (`powerbrowser/shell/powerbrowser.js`, `powerbrowser/shell/powerbrowser-sidecar.js`); lowercase XHTML/CSS alongside (`powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser/shell/powerbrowser.css`).
- Theia sources: `kebab-case.ts`/`.tsx` under `src/browser/` (frontend) or `src/node/` (backend), e.g. `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`, `theia/extensions/token-gate/src/node/powerbrowser-env.ts`; each package has `*-frontend-module.ts` / `*-backend-module.ts` composition roots.
- Verification scripts: `verify-<surface>.mjs` checkers + `verify-platform.sh` driver; `check-*.sh` guards; `smoke-*.sh` live smokes.
- Sentinels: `POWERBROWSER_<NOUN>_<VERB>` stdout lines (`POWERBROWSER_SHELL_READY`, `POWERBROWSER_BACKEND_READY`, `POWERBROWSER_SHELL_SWAP`, `POWERBROWSER_SHELL_ERROR`, `POWERBROWSER_DECK_STATE`, `POWERBROWSER_DIAGNOSTICS`, `POWERBROWSER_APP_IDENTITY`).
- Prefs: `powerbrowser.sidecar.*` branch (`powerbrowser/shell/powerbrowser-sidecar.js`).
- Patches: `NNN-<topic>-<area>.patch`, zero-padded ordering (`patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`).

**Directories:**
- `powerbrowser/`: Gecko-side tree (shell, branding, distribution) — lowercase, matches `chrome://powerbrowser/` + `@powerbrowser/*` fixed identifiers.
- `theia/extensions/<name>/src/{browser,node}/`: Theia convention — `browser/` = frontend code, `node/` = backend code.
- `theia/extensions/<name>/lib/`: Compiled output (checked in for the four packages; rebuilt by `yarn build:extensions`).
- `powerbrowser/branding/{dev,release}/`, `generated/branding/{dev,release}/`: Per-variant branding dirs; dev carries the `name_suffix = " Dev"`.
- `scripts/lib/`: Shared generator/verify libraries (`config-schema.json`, `toml.cjs`, `firefox-bidi.mjs`).

## Where to Add New Code

**New sidecar supervisor behavior (spawn/health/retry/reap/diagnostics):**
- Primary code: `powerbrowser/shell/TheiaService.sys.mjs` (policy) + thin primitives in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (any new Firefox-internal reach) + catalogue row in `powerbrowser/INTERNAL-APIS.md`
- Bootstrap wiring (new deck layer/global): `powerbrowser/shell/powerbrowser.js` + `powerbrowser/shell/powerbrowser.xhtml` + `powerbrowser/shell/powerbrowser.css`
- Tests: new `check_*` function + one CHECKS row in `scripts/verify-platform.sh`, with a `--self-test` in the checker script

**New Theia frontend capability (tab type, scheme, command, customization):**
- Primary code: `theia/extensions/tab-uris/src/browser/` (tab/URI/window surface) or `theia/extensions/customize/src/browser/` (user-facing customization) or `theia/extensions/branding/src/browser/` (brand surface)
- Composition: bind in the package's `*-frontend-module.ts`; depend on `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` for anything addressable (keep its exported shape — `scripts/verify-registry-shape.mjs` asserts it)
- Tests: `scripts/verify-uri-roundtrip.mjs` / `scripts/verify-customize-inert.mjs` family + registry row; app-level wiring via `theia/applications/browser/package.json`

**New backend gate/watchdog behavior:**
- Primary code: `theia/extensions/token-gate/src/node/`; read handshake state from `theia/extensions/token-gate/src/node/powerbrowser-env.ts` (`POWERBROWSER_ENV`), never `process.env`
- Composition: `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`
- Tests: `side02-*` / `side01-*` / `side04-*` rows in `scripts/verify-platform.sh`

**New brand/rebrand surface:**
- Primary code: schema entry in `scripts/lib/config-schema.json` + emitter in `scripts/generate.mjs` + frozen `TARGETS` row (the same table `scripts/verify-generated-identity.mjs` reads — never a second list)
- Manifest: key in `configuration.toml` (required identity/legal keys go through the mask so downstreams cannot inherit them)
- Tests: `generated-byte-identity` + `generate-check`/`generate-self-test` rows; never edit `generated/` by hand, never edit tracked `powerbrowser/branding/*` to make a gate green

**New Gecko patch:**
- Primary code: regenerate from a patched tree (`scripts/apply-patches.sh --self-test` guards the mechanism; `scripts/check-patch-surface.sh` guards the surface) — never text-edit a hunk body
- Tests: `check-patch-surface` row; keep `patches/020-powerbrowser-shell.patch` hook-only (no `BROWSER_CHROME_URL` override — startup selection lives in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`)

**New verification check:**
- Primary code: checker in `scripts/verify-*.mjs` (derive expectations from the tree, compare as set equality, include `--self-test` planting faults that must go red naming the drift)
- Registration: append exactly one row to the CHECKS array in `scripts/verify-platform.sh` (never a sibling driver); `--quick` only if it needs no build, browser, display, or network

**Utilities:**
- Shared generator/verify helpers: `scripts/lib/` (`config-schema.json`, `toml.cjs`, `firefox-bidi.mjs`)
- Build environment changes: `flake.nix` (`#theia` vs `#firefox` shells); user docs: `docs/` (`BUILD.md`, `CUSTOMIZE.md`, `URI-SCHEMES.md`)

## Special Directories

**`upstream/`:**
- Purpose: Pinned Firefox-ESR source checkout the patch stack applies to.
- Generated: Yes (via `scripts/fetch-upstream.sh` from a pinned tag).
- Committed: No (git-ignored ~1.1 GB; `git -C upstream diff` staying empty is the invariant — never hand-edit).

**`objdir/` / `objdir-release/`:**
- Purpose: Gecko build outputs; `objdir/dist/bin/powerbrowser` is the testable binary.
- Generated: Yes (via `./mach build` under `nix develop .#firefox`).
- Committed: No.

**`generated/`:**
- Purpose: Generator output tree (mirrors the tracked files it must equal).
- Generated: Yes (via `node scripts/generate.mjs`).
- Committed: No (git-ignored and tracked-empty; asserted by `generated-byte-identity`).

**`theia/node_modules/`, `theia/*/node_modules/`, `theia/applications/browser/lib/`, `theia/extensions/*/lib/`:**
- Purpose: Yarn workspaces install + compiled extension/app output.
- Generated: Yes (via `yarn install` / `yarn build` under `nix develop .#theia`).
- Committed: Partially — `lib/` compiled output for the four `@powerbrowser/*` packages is present in-tree; `node_modules/` is not.

**`powerbrowser/branding-generated/`:**
- Purpose: Symlink farm (`dev`/`release` → `generated/branding/*`) keeping `--with-branding` inside topsrcdir (a branding path outside topsrcdir is rejected by the `moz.build` sandbox).
- Generated: Yes (link layout; content via generator).
- Committed: Yes (symlinks).

**`.planning/`:**
- Purpose: GSD product/roadmap/phase docs plus these codebase maps (`.planning/codebase/`).
- Generated: No (hand-maintained project memory).
- Committed: Yes.

---

*Structure analysis: 2026-09-04*
