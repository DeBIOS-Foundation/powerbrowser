# Stack Research: v1.4 Platform Updates (Theia 1.76.0 + React 19 + Node 24, Firefox 153.5.0esr)

**Domain:** Version updates for the PowerBrowser platform: the Theia sidecar and its dev shell, and the Gecko upstream pin
**Researched:** 2026-10-16
**Confidence:** HIGH for versions, the patch surface, and compile-level impact. MEDIUM for runtime behaviour, because no sidecar has been started at 1.76.0 and no full Gecko build has been run at 153.5.

Scope: this file covers only what the two updates need. Capabilities already validated in `.planning/PROJECT.md` are not re-researched.

Evidence labels used below:
- **[verified 2026-10-16]**: re-checked in this session against the registry, the Mozilla remote, the locked nixpkgs, or the tree.
- **[trial 2026-10-15]**: reported by the 2026-10-15 trial (session a38939de) and checked by its verifier. Not re-run here.
- **UNVERIFIED**: no evidence yet. Needs the live check named next to it.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Firefox ESR | `FIREFOX_153_5_0esr_BUILD1` = commit `223014c6b9299ac9b035b4c50ea481e5c6de282c` | Gecko substrate (`upstream/`) | It is the current ESR: `product-details.mozilla.org/1.0/firefox_versions.json` reports `FIREFOX_ESR: "153.5.0esr"`, and `browser/config/version_display.txt` at that commit reads `153.5.0esr` [verified 2026-10-16]. There is no newer ESR major. The remote has esr115/128/140/153 branches only. |
| Eclipse Theia | `1.76.0` (all `@theia/*` except monaco-editor-core) | Sidecar GUI framework | npm `latest` = 1.76.0, published 2026-09-24. `next` is 1.77.0-next.57 and `patch` is 1.74.2 [verified 2026-10-16]. It replaces NG-082's stale 1.75.0 target. |
| `@theia/monaco-editor-core` | `1.108.201` (unchanged) | Monaco build used by Theia | `@theia/monaco@1.76.0` still depends on exactly `1.108.201` [verified 2026-10-16]. The exception in `verify-upstream-pins.mjs` stays as it is. |
| React / ReactDOM | `19.2.8` / `19.2.8` (exact) | Theia widget layer | Theia 1.75.0 dropped React 18 (#17932). `@theia/core@1.76.0` peerDependencies are `react`, `react-dom`, `@types/react` and `@types/react-dom` at `^19.0.0` [verified 2026-10-16]. Theia's own `package-lock.json` at tag v1.76.0 resolves react/react-dom **19.2.8** [verified 2026-10-16]. Pin what upstream's CI ran, not npm `latest` (19.3.1) and not the trial's 19.1.10. |
| `@types/react` / `@types/react-dom` | `19.2.18` / `19.2.7` (exact) | Type definitions | These are the versions Theia v1.76.0's lockfile resolves [verified 2026-10-16]. `@types/react-dom@19.2.7` peers on `@types/react ^19.2.0`. |
| TypeScript | `~5.9.3` (unchanged) | Extension compile | Theia v1.76.0 root `package.json:78` is `~5.9.3`, the same pin as the tree (`theia/package.json:64`). |
| Node.js | `24.19.0` (`pkgs.nodejs_24` in the **already-locked** nixpkgs `ffb3c9b7…`) | Sidecar runtime, yarn, node-gyp | Theia 1.75.0 set `engines.node >=24` and dropped Node 22 (#17936). Theia v1.76.0 root `package.json:5-6` is `"node": ">=24"`, and "Node 24 stays the recommended default". `nix eval --inputs-from . nixpkgs#nodejs_24.version` returns `24.19.0` at the current `flake.lock` rev, so no lock bump is needed [verified 2026-10-16]. Published `@theia/core`/`@theia/cli@1.76.0` declare no `engines`, so Node 22 is not blocked, only unsupported [trial 2026-10-15]. |
| yarn classic | `1.22.22` (unchanged) | Workspace installs | Same nixpkgs attr. `flake.nix:21` overrides it onto the chosen `nodejs`. |

### Supporting Libraries (native modules: Node 24 impact)

Every native module in `theia/node_modules` exports `napi_register_module_v1`, which makes it ABI-stable across Node majors. Each one loaded under Node 24.19.0 in this session [verified 2026-10-16].

| Library | Version | How it gets a binary | Node 24 action |
|---------|---------|----------------------|----------------|
| `drivelist` | 12.0.2 | Built from source: `node-gyp rebuild`, N-API 8, no prebuild. CI step at `.github/workflows/verify.yml:83` | Rebuild inside the new shell for reproducibility. Node 24's bundled node-gyp is **12.4.0** at `${nodejs_24}/lib/node_modules/npm/bin/node-gyp-bin`, the path `flake.nix:58` already uses [verified]. A Node 22-built `drivelist.node` also loads on 24 [verified], but the compile under 24 headers is UNVERIFIED. |
| `better-sqlite3` | 13.0.3 | In-package N-API prebuild (`prebuilds/linux-x64.node`). `engines >=22` | None. Loads on 24 and reports SQLite 3.53.4 [verified]. |
| `node-pty` | 1.2.0-beta.12 (pinned by `@theia/terminal@1.76.0`) | In-package N-API prebuilds | None for loading [verified]. `scripts/smoke-theia.sh` spawn proof must be re-run (UNVERIFIED on 24). |
| `@parcel/watcher` | 2.6.0 | N-API optional package `watcher-linux-x64-glibc` | None [verified]. |
| `msgpackr-extract` | 3.0.4 | `node.napi.glibc.node` prebuild | None [verified]. |
| `keytar` | 7.9.0 | No binary present, because `--ignore-scripts` skips its prebuild | Already broken under Node 22, so the Node 24 move changes nothing. The runtime impact (Theia credential storage) is UNVERIFIED and outside this milestone. |
| `@theia/ffmpeg` | 1.76.0 | Optional `binding.gyp` | Do not build it. A script-enabled install leaves `node_modules/@theia/ffmpeg/build`, and `diff-theia-core.sh` then fails [trial 2026-10-15]. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `nix develop .#theia` | Node 24 shell | Edit only `flake.nix:20`. Do not run `nix flake update`: the lock pins inkscape **1.4.4** (verified), which the `generated-byte-identity` row depends on (`flake.nix:37-46`), and rustc **1.97.1** (verified) for the Gecko shell. |
| `nix develop .#firefox` | Gecko toolchain | No change. `python/mozboot/mozboot/util.py` (`MINIMUM_RUST_VERSION`), `toolchain.configure`, `bindgen.configure` and `node.configure` have the same blob SHA at 153.1 and 153.5 BUILD1 [verified]. The `rust.configure` diff only handles target triples from rustc ≥ 1.98, and the lock has 1.97.1. |
| `scripts/rebase-upstream.sh --tag FIREFOX_153_5_0esr_BUILD1` | ESR move | It composes `fetch-upstream.sh` (which recreates the overlay symlinks through `ensure_branding_overlay`) and `apply-patches.sh`. |
| `node scripts/verify-upstream-pins.mjs` | One-pin agreement for Theia and the ESR | It also checks that `.github/workflows/rebase-upstream.yml:33` mirrors the ESR pin. |
| `scripts/diff-theia-core.sh` | Hard rule 1 gate | Run it after an `--ignore-scripts --frozen-lockfile` install only. |

---

## Exact Change Sites

### A. Do OpenCode removal first (it changes what the Theia bump touches)

Removing `theia/extensions/backend-opencode` before the bump means the re-pin edits 7 extensions instead of 8, and `@agentclientprotocol/sdk@1.4.0` leaves the regenerated lockfile. The sites that intersect the bump:
- `theia/package.json:69`: drop `&& yarn --cwd extensions/backend-opencode build` from `build:extensions`.
- `theia/applications/browser/package.json:15`: the `powerbrowserAiBackend` key.
- `configuration.toml:117-127`: the `[ai]` table and its comment.

### B. Theia 1.74.1 → 1.76.0 with React 19

| File:line | Change |
|-----------|--------|
| `configuration.toml:115` | `theia_release = "1.76.0"`, then `node scripts/generate.mjs` |
| `theia/package.json:8-57` | 49 of the 50 `@theia/*` resolutions → `1.76.0`. `:35` `@theia/monaco-editor-core` stays `1.108.201` |
| `theia/package.json:61` | `"node": ">=22"` → `">=24"` (matches Theia root `package.json:5-6`) |
| `theia/package.json:65-66` | `@types/react` `18.3.31` → `19.2.18`. `@types/react-dom` `18.3.7` → `19.2.7` |
| `theia/applications/browser/package.json:4` | `"version": "1.74.1"` → `"1.76.0"` (the trial's sed changed it too) |
| `theia/applications/browser/package.json` deps, `:99` | every `@theia/*` → `1.76.0`, and `@theia/cli` → `1.76.0` |
| `theia/applications/browser/package.json:95-96` | `react`/`react-dom` `18.3.1` → `19.2.8` |
| `theia/extensions/{branding,chrome-bar,customize,modes,tab-uris,telemetry,token-gate}/package.json` | every `@theia/*` → `1.76.0` |
| `theia/extensions/branding/src/browser/powerbrowser-ai-layout-contribution.ts:11, :28-43` | **Delete** `PowerBrowserAIConfigurationViewContribution` and its import. The 1.75.0 rework (#17820) renamed the base class to `AIConfigurationViewContribution` (`ai-configuration-view-contribution.ts:45` in the 1.76.0 tarball) and removed `initializeLayout`. `openView` now runs only from the command (`:96`) [verified]. With no forced open left, a rename would leave the subclass with nothing to override. Update the file header (`:1-5`), which says "These two rebinds". |
| `theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts:5, :10, :40-44` | Delete the import at `:5`, drop the second name from `:10`, and delete the guarded rebind at `:40-44`. **Keep** D-22 rebind 1 (`:35-39`): `AIFirstPerspectiveContribution.registerPerspectives` still exists at 1.76.0 (`ai-first-perspective-contribution.ts:29-31`) [verified]. |
| `theia/yarn.lock` | Regenerate. The trial measured about +700/−2550 lines [trial 2026-10-15]. |
| `theia/applications/browser/package.json:20-22` | **New finding: add `"workbench.startupEditor": "none"`** to `frontend.config.preferences`. See "New transitive extensions" below. |
| `docs/BUILD.md:268-286`, `README.md:87` | Re-record the UPD-04 proof at 1.76.0 and close the 1.75.0 deferral. |

The tree has no React 18-only API to remove (see the audit below), and no extension `tsconfig.json` change is needed.

### C. Node 22 → 24

| File:line | Change |
|-----------|--------|
| `flake.nix:20` | `nodejs = pkgs.nodejs_22;` → `pkgs.nodejs_24;` |
| `flake.nix:14-19` | Rewrite the D-16 comment, which this change supersedes. **Keep** the `yarn.override` at `:21`. It is now a no-op, because nixpkgs' default `nodejs` is also 24.19.0 [verified], but it keeps yarn and node-gyp on the shell's Node when nixpkgs moves its default to 26. |
| `flake.nix:53-57` | Comment only. The node-gyp PATH line at `:58` is already Node-agnostic. |
| `scripts/lib/firefox-bidi.mjs:5`, `scripts/smoke-theia.sh:57`, `scripts/verify-platform.sh:3000` | Comments naming "Node 22"/`nodejs_22`. Text only. Global `WebSocket` and `node:sqlite` are present on 24. |

CI needs no separate edit. `.github/workflows/verify.yml:67-93` runs every step through `nix develop .#theia`, so it inherits the flake change.

### D. Firefox 153.1.0esr → 153.5.0esr BUILD1

| File:line | Change |
|-----------|--------|
| `configuration.toml:114` | `firefox_esr_tag = "FIREFOX_153_5_0esr_BUILD1"`, then `node scripts/generate.mjs` (rewrites `generated/upstream-pins.env`) |
| `.github/workflows/rebase-upstream.yml:33` | Mirror the default to the same tag. `verify-upstream-pins.mjs` fails on drift. |
| `scripts/smoke-firefox.sh:41-42` | **Hard-coded `'153.1.0esr'`**: the `smoke-firefox` row (`verify-platform.sh:4682`) goes red after the rebase. Derive the expected value from `upstream/browser/config/version_display.txt`, as `verify-branding-identity.mjs:75-78` already does. That follows the "derive from the tree" rule. |
| `scripts/fetch-upstream.sh:276-282` | Correct the comment. "RELEASE and BUILD1 share a commit" is not a general rule: for 153.4, RELEASE = BUILD3 (`508788b6f8`) and BUILD1 = `f92008fc60` [verified]. The hash comparison itself is correct, so only the comment changes. |
| `configuration.toml:104` | Cosmetic: two comment lines are joined ("…this# project builds against…"). |
| `README.md:87`, `docs/BUILD.md` (near `:446`, `:1088`), `scripts/lib/firefox-bidi.mjs:11`, `scripts/verify-branding-identity.mjs:31` | Version mentions in prose and comments only. |
| `patches/*.patch` | **No change.** The 4 patches touch 5 files (`browser/moz.build`, `browser/moz.configure`, `browser/installer/windows/nsis/{defines.nsi.in,installer.nsi}`, `toolkit/mozapps/update/updater/moz.build`). Each of the 5 has the same blob SHA at `468445e58d` (153.1) and `223014c6b9` (153.5 BUILD1) [verified via the GitHub contents API]. The patches' blob index lines therefore still match, and the 3-way apply cannot degrade into a silent no-op. |

---

## React 18-only API audit (per `@powerbrowser/*` extension)

Search run over `theia/extensions/*/src` and `*/test` (`.ts`, `.tsx`) for `ReactDOM.render`, `hydrate`, `unmountComponentAtNode`, `findDOMNode`, `.defaultProps`, `propTypes`/`PropTypes`, `contextTypes`/`childContextTypes`/`getChildContext`, string refs (`ref="…"`, `this.refs`), `react-dom/test-utils`, `react-test-renderer`, `act(`, `createFactory`, `UNSAFE_*`/legacy lifecycles, `useRef()` without an argument, bare global `JSX.`, and `element.ref` access. **Zero matches in every extension** [verified 2026-10-16].

| Extension | React files | APIs in use | React 19 status |
|-----------|-------------|-------------|-----------------|
| branding | `powerbrowser-welcome-widget.tsx:1,3,38,72,114`, `powerbrowser-about-dialog.tsx:1,47,93,106` | `ReactWidget`/`AboutDialog` subclasses, `React.ReactNode`, `React.SyntheticEvent`, keyed `map` | Compatible. Its only 1.76 break is the AI override (section B). |
| chrome-bar | `chrome-bar-widget.tsx:1-2,97,254,361,578-603,677`, `tab-strip-widget.tsx:1,3,71,425,446,541,583` | `ReactWidget`, `createPortal` (from `@theia/core/shared/react-dom`, still exported in 19), event types, a block-bodied callback ref `ref={el => { this.pillRef = el; }}` (`:677`) | Compatible. The ref callback returns `undefined`, so React 19's ref-cleanup typing does not reject it. |
| modes | `organising-widget.ts:4` is a plain Lumino `Widget` ("NOT React") | none | Not affected. |
| customize, tab-uris, telemetry, token-gate | none | none | Not affected. |
| backend-opencode | none | none | Deleted in section A. |

Type pins: only `theia/package.json:65-66` (`@types/react` 18.3.31, `@types/react-dom` 18.3.7). The lockfile holds a single copy of each (`yarn.lock:2782`, `:2787`, `:7539`, `:7585`). Every `tsconfig.json` uses `"jsx": "react"` with `import * as React from '@theia/core/shared/react'`. Theia 1.75 moved its own packages to `react-jsx`, but "Adopters are not required to switch" (CHANGELOG 1.75.0), so leave the tsconfigs alone.

Compile evidence: React 19.1.10 with `@types` 19.3.0 built with 0 TS errors and `diff-theia-core.sh` PASS [trial 2026-10-15]. The 19.2.8 / 19.2.18 / 19.2.7 set recommended here sits between those versions and has not itself been compiled (UNVERIFIED, low risk).

React 19 runtime behaviour to confirm live (UNVERIFIED):
- Errors thrown during render that no boundary catches now go to `window.reportError` rather than being rethrown. `telemetry-error-capture.ts:20` listens on `window` `'error'`, which `reportError` dispatches, so capture should still work. Confirm with one forced render error.
- The chrome-bar dropdown portal and its `getBoundingClientRect` positioning (`chrome-bar-widget.tsx:590-603`) after React 19's commit-phase changes.

---

## Theia 1.75/1.76 breaking changes against packages this tree consumes

The sites come from the deep imports the extensions make (51 distinct `@theia/*` module paths).

| Change (PR) | Tree site | Impact |
|-------------|-----------|--------|
| React 18 dropped, `^19` peers (#17932) | section B | Required. Yarn only **warns** on the unmet peer, so with React 18 left in place the build passes and the mismatch surfaces only at runtime [trial]. |
| AI Configuration master-detail rework; `AIAgentConfigurationViewContribution` gone (#17820) | `branding/.../powerbrowser-ai-layout-contribution.ts:11,38`, `powerbrowser-frontend-module.ts:5,40-44` | TS2724 compile failure. Fix: delete (section B). |
| Node 22 dropped, `engines >=24` (#17936) | `flake.nix:20`, `theia/package.json:61` | Section C. |
| `@theia/ai-ide` now depends on `@theia/getting-started` (#17969) | none today. `@theia/getting-started` is **absent** from `theia/node_modules` at 1.74.1 | **New behaviour.** Theia collects extensions transitively (`application-package/lib/extension-package-collector.js:72`). At 1.76.0, `GettingStartedContribution.onStart` therefore opens Theia's own "Welcome" widget (`getting.started.widget`, with links to theia-ide.org) whenever `editorManager.all.length === 0`, and the preference default is `workbench.startupEditor: 'welcomePage'` (`getting-started-preferences.ts:29-42`) [verified from the tarball]. Web tabs and the PowerBrowser welcome are not editors, so it would open on every start. That conflicts with D-24/D-33. Fix: one line, the default preference in section B. The trial did not catch this because it never started the sidecar. |
| `@theia/plugin-ext` now depends on `@theia/telemetry` (#17963) | `telemetry/src/browser/telemetry-preferences.ts:27-45,64` | `@theia/telemetry@1.76.0` also registers `telemetry.telemetryLevel`, with the same enum `off/crash/error/all` and default `off`. `PreferenceSchemaService.addSchema` keeps whichever registers **first** and logs `Property with id 'telemetry.telemetryLevel' already exists` for the second [verified from the tarball]. Values and behaviour match, but the Settings description may become Theia's text instead of the PowerBrowser copy. Which one wins depends on module load order (UNVERIFIED). Theia's backend binds no default `TelemetrySink`, so nothing leaves the machine [verified]. Decide at the live check: keep it and accept the warning, or drop our schema and consume Theia's (`TELEMETRY_LEVEL` from `@theia/telemetry`). |
| `TabBarToolbarItem.isVisible` contextMatcher mandatory (#17978) | `chrome-bar-commands.ts:120,128,138` | Not affected. These are `CommandHandler.isVisible`, not toolbar items. |
| `SecondaryWindowService.onWindowLoaded` added; Monaco theme injected into secondary windows (#17874) | `modes/src/browser/dependent-windows.ts:4,69-70` (consumer only) | No compile impact, because the tree injects the service rather than implementing it. The behaviour change (theme in dependent windows) needs a live look (UNVERIFIED). |
| `unload` → `pagehide` for layout save (#17870) | `modes` uses `shell-layout-restorer` | Should improve save-on-close. Confirm that named setups and modes survive a restart (UNVERIFIED). |
| Connection-token re-issue drops `If-None-Match` (#17762) | `token-gate` (separate from Theia's token) | Expected none. `EnvVariablesServerImpl` still snapshots `process.env` in its constructor at 1.76.0, which keeps the `powerbrowser-env.ts:43` scrub ordering valid [trial verifier]. |
| Webpack bundling removed (#17935) | `theia/applications/browser/` already ships `esbuild.mjs` + `gen-esbuild.*.mjs` | Not affected. `theia build --mode development` (`package.json:104`) passed [trial]. |
| `ILogger` injected into many classes (#17763) | `extensions/telemetry/test/telemetry-sender.test.mjs` (plain node, no container) | Not affected. 9/9 PASS [trial]. |
| `PreferencesContribution.scopeTracker` removed, `VSXExtensionsWidget.resolveCount` sync, `PluginPaths` moved, `ScmCommitWidget` rebound, Copilot/model-list prefs removed, `DecorationsProvider.onDidChange` widened, Electron `CHANNEL_WC_METADATA` | tab-uris imports `preference-open-handler`, `vsx-extension-editor`, `plugin-view-registry`, `webview`. None of the changed members is used | Not affected. The tree compiled at 1.76.0 apart from branding [trial]. |

---

## Installation (runbook order)

```bash
# 0. OpenCode removed first (separate commit).
# 1. Node 24: edit flake.nix:20, then
nix develop .#theia --command node -v        # expect v24.19.0
# 2. Theia + React: edit pins (section B), then
node scripts/generate.mjs
nix develop .#theia --command bash -c 'cd theia && yarn install --ignore-scripts && \
  (cd node_modules/drivelist && node-gyp rebuild) && yarn build'
#    (re-run with --frozen-lockfile after committing the regenerated lock)
node scripts/verify-upstream-pins.mjs && scripts/diff-theia-core.sh
nix develop .#theia --command bash -c 'node theia/node_modules/typescript/bin/tsc -b theia/extensions/token-gate'
node theia/extensions/telemetry/test/telemetry-sender.test.mjs
bash scripts/smoke-theia.sh                   # node-pty spawn under Node 24
# 3. Firefox: edit configuration.toml:114 + rebase-upstream.yml:33 + smoke-firefox.sh:41-42, then
node scripts/generate.mjs
scripts/rebase-upstream.sh --tag FIREFOX_153_5_0esr_BUILD1   # ~6 min clone
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach build'  # ~47-54 min
scripts/verify-platform.sh
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `FIREFOX_153_5_0esr_BUILD1` | `FIREFOX_153_5_0esr_RELEASE` (the existing convention) | Today both tags resolve to `223014c6b9` [verified]. The 2026-10-15 trial, however, recorded RELEASE at `f617beaded` (2026-10-13, "make esr153 not next-esr", version 153.6.0esr), which is 183 commits **after** BUILD1 (`compare 223014c6b9...f617beaded` = ahead 183, behind 0) [verified]. Either the tag moved or the trial misread it. A BUILD tag names the build Mozilla shipped, so pin BUILD1 and record the commit hash in `docs/BUILD.md`. Return to RELEASE only after it has been seen stable across several point releases. |
| React 19.2.8 | React 19.3.1 (npm latest) | Only after a Theia release whose lockfile resolves 19.3.x. |
| React 19.2.8 | 19.1.10 (the trial's set) | Acceptable fallback. It is already proven to compile. |
| Theia 1.76.0 | 1.74.2 (`patch` dist-tag) | Only if React 19 or Node 24 had to be deferred. It contains none of the upstream fixes after 1.74. |
| Default preference `workbench.startupEditor: none` | Rebind `GettingStartedContribution` in `@powerbrowser/branding` to a no-op `onStart` | Use the rebind only if users must not be able to turn the Theia welcome back on. The preference is one line and leaves the walkthrough command reachable. |
| Keep `@theia/ai-*` composed | Drop `@theia/ai-ide` (which removes getting-started from the closure) | This is a product decision tied to DSH (last phase), not a version-update fix. Do not make it here. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Renaming the override to `AIConfigurationViewContribution` | The base class has no `initializeLayout` at 1.76.0, so the subclass would override nothing and become dead code | Delete it (section B) |
| Editing anything under `theia/node_modules/@theia` or vendoring Theia | Hard rule 1; `diff-theia-core.sh` | DI rebinds or default preferences in `@powerbrowser/*` |
| Script-enabled `yarn install` | The puppeteer@25.1.0 postinstall fails (environmental), and the `@theia/ffmpeg/build` it leaves behind makes `diff-theia-core.sh` red [trial] | `--ignore-scripts` plus the explicit `drivelist` rebuild |
| `nix flake update` / a newer nixpkgs | It would change inkscape (byte-identity row), rustc (Gecko shell) and every toolchain at once. Node 24 is already available at the locked rev | Edit `flake.nix:20` only |
| `yarn upgrade --latest` | Resolves to whatever is newest instead of the declared pin (`docs/BUILD.md:263-266`) | The one-pin runbook |
| Switching extension tsconfigs to `jsx: react-jsx` | Optional upstream change. It adds churn to 7 tsconfigs with no benefit to the bump | Keep `"jsx": "react"` |
| Regenerating `patches/*.patch` for 153.5 | All target blobs are unchanged, so regeneration produces identical patches | Replay through `rebase-upstream.sh` as-is |
| Dropping the `yarn.override` in `flake.nix:21` | It would let yarn and node-gyp drift to nixpkgs' default Node when that moves to 26 | Keep it, with an updated comment |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@theia/*@1.76.0` | `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19` | Peer ranges. Upstream lock: 19.2.8 / 19.2.8 / 19.2.18 / 19.2.7 |
| `react-virtuoso@2.19.1`, `react-tooltip@4.5.1` (deps of `@theia/core@1.76.0`) | React 19 | Peer ranges `>=16 \|\| >=17 \|\| >= 18` and `>=16.0.0` [verified] |
| `@theia/*@1.76.0` | Node 24 (recommended), Node 26 | Theia CI matrix. Node 22 is unsupported, not blocked |
| `better-sqlite3@13.0.3` | Node `>=22` | N-API prebuild |
| `@theia/monaco@1.76.0` | `@theia/monaco-editor-core@1.108.201` | Unchanged exception |
| Firefox 153.5 BUILD1 | locked nixpkgs (rustc 1.97.1, `firefox-esr-153-unwrapped` toolchain at 153.1.0esr) | `MINIMUM_RUST_VERSION` source unchanged. `mach configure` passed on a later esr153 commit with this shell [trial]. A full build at BUILD1 is UNVERIFIED |
| New transitive packages at 1.76.0 | `@theia/getting-started`, `@theia/telemetry`, `@theia/plugin-utils` (exact 1.76.0) | `verify-upstream-pins.mjs` passed with them in the lock [trial] |

## Open items the live check must close (all UNVERIFIED)

1. Fresh profile at 1.76.0: no AI Configuration tab opens, no Theia "Welcome" opens (after the `startupEditor` default), and the PowerBrowser welcome opens once.
2. `telemetry.telemetryLevel`: which schema wins, whether the warning appears, and what the Settings text says.
3. React 19 rendering of the welcome, about, chrome bar, dropdown portal and tab strip, plus one forced render error reaching telemetry capture.
4. Dependent windows (Monaco theme) and setup/mode persistence across restart (`pagehide`).
5. `drivelist` compiles under Node 24 headers. `smoke-theia.sh` passes on Node 24.
6. Full `./mach build` at `223014c6b9`, then `scripts/verify-platform.sh` (including `smoke-firefox` after the `:41-42` fix).

## Sources

- npm registry, `npm view` on 2026-10-16: `@theia/{core,cli,ai-ide,monaco,telemetry,plugin-ext}` dist-tags, deps and peers; `react`/`react-dom`/`@types/*` versions; `react-virtuoso`, `react-tooltip`, `better-sqlite3` peers and engines. HIGH
- `npm pack` tarballs of `@theia/{core,ai-ide,getting-started,telemetry}@1.76.0`, read in the session scratchpad: class names, `onStart`, preference schema, `addSchema` collision rule. HIGH
- Theia `v1.76.0` tag (`12f62a6b`): `CHANGELOG.md` (1.75.0 and 1.76.0 breaking changes), root `package.json` (engines, TypeScript), `packages/core/package.json` (peer and dev React), `package-lock.json` (resolved React and types). HIGH
- `git ls-remote https://github.com/mozilla-firefox/firefox.git` (153 tags, esr branches); GitHub API commits, compare and contents for `223014c6b9`, `f617beaded`, `468445e58d` (version file, patched-file blob SHAs, toolchain files). HIGH
- `https://product-details.mozilla.org/1.0/firefox_versions.json`: `FIREFOX_ESR = 153.5.0esr`. HIGH
- Locked nixpkgs `ffb3c9b700e7…` via `nix eval --inputs-from .`: nodejs_24 24.19.0, nodejs_22 22.23.2, yarn 1.22.22, rustc 1.97.1, inkscape 1.4.4, firefox-esr-153-unwrapped 153.1.0esr; nodejs_24's bundled node-gyp 12.4.0. HIGH. The `nixos` MCP tool was not exposed to this agent, so the locked rev was queried directly. That is the authoritative source for this tree anyway.
- Native-module load test under Node 24.19.0 in `theia/node_modules`. HIGH
- Trial report, session a38939de (2026-10-15), with its verifier: compile results, the React 19.1.10 build, lockfile size, `diff-theia-core` and ffmpeg note, and patch replay on the later esr153 commit. MEDIUM (not re-run)

---
*Stack research for: PowerBrowser v1.4 version updates*
*Researched: 2026-10-16*
