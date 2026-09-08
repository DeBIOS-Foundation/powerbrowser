# Codebase Structure

**Analysis Date:** 2026-09-07

## Directory Layout

```
Power-Browser/
├── configuration.toml       # The rebrand manifest — one of only two rebrand inputs
├── brand/                   # The other rebrand input: mark.svg + HUMAN-REVIEW.md
├── generated/               # Derived build surfaces written by scripts/generate.mjs
├── powerbrowser/            # Chrome-side shell, branding literals, packaging
├── patches/                 # The entire Gecko change set (2 patches)
├── upstream/                # Fetched Gecko checkout at a pinned ESR tag — never hand-edited
├── theia/                   # Theia sidecar: application + @powerbrowser/* extensions
├── scripts/                 # Generator, guards, and ~60 verify-* checks
├── inventory/               # brand-tokens.json — the only file that may name the origin product
├── docs/                    # BUILD, REBRANDING, RELEASING, CUSTOMIZE, URI-SCHEMES, CRASH-POLICY
├── .planning/               # GSD planning tree (PROJECT, ROADMAP, REQUIREMENTS, phases)
├── .github/                 # CI workflows, including rebase-upstream.yml
├── flake.nix / flake.lock   # Nix dev shells: .#firefox and .#theia
├── defs.mk / .mozconfig     # Build entry configuration
├── toolchain-baseline.txt   # Pinned toolchain versions
└── objdir*/                 # Gecko build outputs (dev, release, nplus1) — not source
```

## Directory Purposes

**`powerbrowser/`:**
- Purpose: everything that ships inside the Gecko build and is not a patch
- Contains: the chrome shell, hand-written branding literals, packaging, distribution policy
- Key files: `powerbrowser/INTERNAL-APIS.md`, `powerbrowser/endpoint-allowlist.json`, `powerbrowser/distribution/policies.json`, `powerbrowser/identity.configure.comparand`

**`powerbrowser/shell/`:**
- Purpose: the privileged chrome layer
- Contains: `PowerBrowserAPI.sys.mjs` (2592 lines — the sole internals boundary), `TheiaService.sys.mjs` (1407 — the sidecar supervisor), `powerbrowser.js` (357 — the classic-script bootstrap), `powerbrowser.xhtml`, `powerbrowser.css`, `GroupActorChild.sys.mjs`, `powerbrowser-sidecar.js` (preprocessed prefs), `moz.build`, `jar.mn`, `components.conf`

**`powerbrowser/branding/{dev,release}/`:**
- Purpose: the hand-written branding literals Phase 2's generated output must match byte-for-byte
- Contains: `configure.sh`, `moz.build`, `default{16,32,48,64,128}.png`, `content/` (`aboutDialog.css`, `jar.mn`), `locales/en-US/` (`brand.ftl`, `brand.properties`), `pref/firefox-branding.js`

**`generated/`:**
- Purpose: the derived mirror of the above, written only by `scripts/generate.mjs`
- Contains: `.mozconfig`, `identity.configure`, `branding/{dev,release}/` (adds `firefox.ico`, `firefox.icns`, `branding.nsi`, `firefox.VisualElementsManifest.xml`), `installer/{dev,release}/`, `theia-frontend-config.json`, `theia-branding.json`, `theia-telemetry.json`, `theia-plugins.json`, `endpoint-hosts.json`, `upstream-pins.env`, `webextensions-settings.json`, `ai-backend.json`, the desktop files
- Generated: Yes. Committed: Yes (it is the comparand).

**`theia/`:**
- Purpose: the sidecar GUI, a yarn workspace over `applications/*` and `extensions/*`
- Key file: `theia/package.json` pins every `@theia/*` to `1.74.1` under `resolutions` and defines the ordered `build:extensions` chain

**`theia/applications/browser/`:**
- Purpose: the composed Theia app; depends on all eight `@powerbrowser/*` extensions and the `@theia/*` set
- Key file: `theia/applications/browser/package.json` — carries the `theia.frontend.config` block (applicationName, `powerbrowserBranding`, `powerbrowserTelemetry`, `powerbrowserPrivilegedJs`, `powerbrowserAiBackend`, legal notices)
- `src-gen/` and `lib/` are build outputs

**`theia/extensions/`:**
- Purpose: all Theia-side additions, one `@powerbrowser/*` package each
- `branding/` — welcome page, favicon, mark, AI layout
- `token-gate/` — backend token enforcement, parent watchdog, env readers
- `tab-uris/` — the `factoryId ↔ URI` registry, web tabs, view/terminal open handlers, node-side tab query service
- `customize/` — user CSS and (default-off) privileged JS
- `telemetry/` — opt-in sender, preferences, logger
- `modes/` — mode service, group model, panorama, organising tree/widget, setups, dependent windows, group actor client
- `chrome-bar/` — commands, keybindings, suggestion service (frontend + node impl)
- `backend-opencode/` — ACP supervisor, chat agent, preset commands, MCP contribution, changeset emitter

**`patches/`:**
- Purpose: the entire Gecko diff
- Contains: `010-powerbrowser-identity.patch` (`browser/moz.configure`), `020-powerbrowser-shell.patch` (`browser/moz.build`)

**`upstream/`:**
- Purpose: the pinned Gecko checkout
- Generated: Yes, by `scripts/fetch-upstream.sh`. Committed: No. Never hand-edited, never catalogued as project source.

**`scripts/`:**
- Purpose: the generator, the boundary/patch/Theia guards, and every verification check
- Key files: `generate.mjs`, `verify-platform.sh` (the single driver and registry), `check-internals-boundary.sh`, `check-patch-surface.sh`, `diff-theia-core.sh`, `scan-brand-residue.mjs`, `apply-patches.sh`, `fetch-upstream.sh`, `rebase-upstream.sh`, `rename-brand.mjs`, `crash-collector.mjs`
- `scripts/lib/` — `toml.cjs` (vendored TOML parser), `config-schema.json`, `firefox-bidi.mjs`

**`inventory/`:**
- Purpose: brand-token classification for the residue scan
- Key file: `inventory/brand-tokens.json` — the only file permitted to spell the originating product's name

## Key File Locations

**Entry Points:**
- `powerbrowser/shell/powerbrowser.xhtml`: the shell window document
- `powerbrowser/shell/powerbrowser.js`: chrome bootstrap
- `theia/applications/browser/package.json`: the Theia app composition
- `scripts/generate.mjs`: rebrand generation
- `scripts/verify-platform.sh`: the verification driver

**Configuration:**
- `configuration.toml`: the brand manifest and defaults layer
- `.mozconfig`, `defs.mk`, `toolchain-baseline.txt`: build config
- `flake.nix`: `nix develop .#firefox` (Gecko toolchain) and `.#theia` (Node/yarn)
- `powerbrowser/shell/powerbrowser-sidecar.js`: sidecar prefs (node path, backend main, timeouts, log size)
- `powerbrowser/endpoint-allowlist.json`: permitted network hosts

**Core Logic:**
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs`: internals boundary
- `powerbrowser/shell/TheiaService.sys.mjs`: sidecar supervisor
- `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`: bridge-facing registry
- `theia/extensions/modes/src/browser/mode-service.ts`: mode switching

**Testing / Verification:**
- `scripts/verify-platform.sh`: registry of all checks
- `scripts/verify-*.mjs`: individual checks, most with a `--self-test`
- `scripts/smoke-firefox.sh`, `scripts/smoke-theia.sh`: smoke runs

**Documentation:**
- `powerbrowser/INTERNAL-APIS.md`: boundary catalogue (derived from the guard script)
- `docs/BUILD.md`, `docs/REBRANDING.md`, `docs/RELEASING.md`, `docs/CUSTOMIZE.md`, `docs/URI-SCHEMES.md`, `docs/CRASH-POLICY.md`
- `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md`: the user-facing copy contract

## Naming Conventions

**Files:**
- Chrome ES modules: `PascalCase.sys.mjs` (`PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs`, `GroupActorChild.sys.mjs`)
- Chrome classic scripts and assets: `lowercase-hyphen` (`powerbrowser.js`, `powerbrowser-sidecar.js`)
- TypeScript: `kebab-case.ts`, with role suffixes — `*-frontend-module.ts`, `*-backend-module.ts`, `*-contribution.ts`, `*-service.ts`, `*-service-impl.ts`, `*-commands.ts`, `*-keybindings.ts`, `*-widget.ts`
- Checks: `scripts/verify-<subject>.mjs` (or `.sh`); guards: `scripts/check-<subject>.sh`
- Patches: `NNN-powerbrowser-<subject>.patch`

**Directories:**
- Theia extension internals mirror Theia's own split: `src/browser/`, `src/node/`, `src/common/`
- Branding variants are always `dev/` and `release/`, in both `powerbrowser/branding/` and `generated/branding/`

**Identifiers:**
- Theia packages are scoped `@powerbrowser/<extension-dir-name>`
- Chrome sentinels are `POWERBROWSER_<SCREAMING_SNAKE>` on stdout
- Actor messages are `PowerBrowser<Thing>` (`PowerBrowserGroupRequest`, `PowerBrowserGroupMutation`, `PowerBrowserWebTabState`)
- Requirement/decision tags appear in comments as `GUI-NN`, `SHELL-NN`, `SQL-NN`, `D-NN`, `T-NN-NN`

## Where to Add New Code

**A new privileged capability (anything touching Gecko):**
- Add a method to `powerbrowser/shell/PowerBrowserAPI.sys.mjs` — never a second file
- Add a row to `powerbrowser/INTERNAL-APIS.md`
- Verify with `scripts/check-internals-boundary.sh --catalogue`

**A new GUI feature:**
- New extension: `theia/extensions/<name>/src/browser/` (+ `src/node/`, `src/common/` as needed), a `package.json` named `@powerbrowser/<name>`, a dependency line in `theia/applications/browser/package.json`, and an entry in the ordered `build:extensions` chain in `theia/package.json`
- Existing extension: add the file next to its peers and bind it in that extension's `*-frontend-module.ts` / `*-backend-module.ts`

**A change to Firefox source:**
- Patch `upstream/`, regenerate the patch into `patches/`, re-run `scripts/check-patch-surface.sh`. Never edit a hunk body by hand.

**A new branding value:**
- Add the key to `configuration.toml`, teach `scripts/generate.mjs` to emit it into `generated/`, and write the matching hand-written literal under `powerbrowser/branding/<variant>/`

**A new check:**
- Implement `scripts/verify-<subject>.mjs` with a `--self-test` that plants faults, derive its expectation from the tree at check time, and append **one row** to the `CHECKS` registry in `scripts/verify-platform.sh`. Do not create a sibling driver.

**Documentation:**
- Operator-facing: `docs/`
- Planning artifacts: `.planning/phases/<phase>/`

## Special Directories

**`upstream/`:**
- Purpose: pinned Gecko source. Generated: Yes (`scripts/fetch-upstream.sh`). Committed: No. Invariant: `git -C upstream diff` is empty.

**`generated/`:**
- Purpose: derived build surfaces. Generated: Yes (`scripts/generate.mjs`). Committed: Yes — it is the byte-identical comparand for the hand-written layer.

**`objdir/`, `objdir-release/`, `objdir-nplus1/`:**
- Purpose: Gecko build outputs (`objdir/dist/bin/powerbrowser` is the runnable binary). Generated: Yes. Committed: No.

**`theia/**/node_modules/`, `theia/applications/browser/{lib,src-gen}/`, `theia/extensions/*/lib/`:**
- Purpose: yarn installs and build output. Generated: Yes. Committed: No.

**`.planning/`:**
- Purpose: GSD planning tree — `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `state.json`, `phases/`, `milestones/`, `codebase/`. Committed: Yes.

**`.direnv/`, `.mozbuild/`:**
- Purpose: Nix/direnv and mozbuild caches. Committed: No.

---

*Structure analysis: 2026-09-07*
