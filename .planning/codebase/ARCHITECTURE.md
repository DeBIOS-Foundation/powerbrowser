<!-- refreshed: 2026-09-04 -->
# Architecture

**Analysis Date:** 2026-09-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME SHELL (Gecko, privileged)              │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Boundary        │  Supervisor      │  Bootstrap / Window       │
│  `powerbrowser/  │  `powerbrowser/  │  `powerbrowser/shell/     │
│  shell/Power-    │  shell/Theia-    │  powerbrowser.xhtml` +    │
│  BrowserAPI.     │  Service.        │  `powerbrowser/shell/     │
│  sys.mjs`        │  sys.mjs`        │  powerbrowser.js`         │
└────────┬─────────┴────────┬─────────┴──────────┬────────────────┘
         │ spawn/stdin/     │ swap/navigate      │ window.open
         │ cookie/health    │                    │ (no chrome code)
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              THEIA SIDECAR (unprivileged Node + browser)         │
│  `theia/extensions/token-gate/*` (backend gate + watchdog)      │
│  `theia/extensions/tab-uris/*` (URL-addressable tabs, GUI-01)   │
│  `theia/extensions/branding/*` + `theia/extensions/customize/*` │
│  Composed by `theia/applications/browser/package.json`          │
└─────────────────────────────────────────────────────────────────┘
         ▲ derived from                        ▲ pins
         │                                     │
┌─────────────────────┐              ┌────────────────────────────┐
│  GENERATOR LAYER    │              │  UPSTREAM (never edited)   │
│  `configuration.toml` + `brand/`  │  `upstream/` (pinned ESR)   │
│  → `scripts/generate.mjs`         │  + `patches/*.patch`        │
│  → `generated/` → copy over       │  applied by                 │
│    `powerbrowser/branding/*`,     │  `scripts/apply-patches.sh` │
│    `.mozconfig`, `*.desktop`      │                             │
└─────────────────────┘              └────────────────────────────┘
         │ asserted by
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  VERIFICATION REGISTRY                                           │
│  `scripts/verify-platform.sh` (one CHECKS array, --quick/full)  │
│  + `scripts/check-internals-boundary.sh` + per-surface          │
│    `scripts/verify-*.mjs` checks                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Anti-corruption boundary | Only file allowed to touch Firefox internals (`Services`, `Cc`/`Ci`/`Cu`, `Subprocess`, `ctypes`, cookie manager, quit observers, window mediator); thin never-throw wrappers | `powerbrowser/shell/PowerBrowserAPI.sys.mjs` |
| Sidecar supervisor | Spawns, health-gates, restarts, and reaps the Theia backend; owns token, port, swap state, error classification, recovery probe | `powerbrowser/shell/TheiaService.sys.mjs` |
| Chrome bootstrap | Paints window first, wires deck layers (loading/error/diagnostics), exposes `window.powerbrowser*` globals, starts supervisor | `powerbrowser/shell/powerbrowser.js` |
| Startup window | Chrome document: branded loading layer over one remote `<browser>`; error + diagnostics deck layers; no tab strip/toolbar/address bar | `powerbrowser/shell/powerbrowser.xhtml` |
| Single-instance handler | Startup-window selection + second-launch focus; registered XPCOM command-line handler | `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`PowerBrowserSingleInstanceHandler`) + `powerbrowser/shell/components.conf` |
| Sidecar defaults | Preprocessed default prefs (`nodePath`, `backendMain`, health/timeout/grace/log-buffer, give-up budget) | `powerbrowser/shell/powerbrowser-sidecar.js` |
| Tab-URI registry | `factoryId <-> URI` bidirectional registry; seed of the chrome-owned tab model for the future mirror/proxy bridge | `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` |
| URL open handlers | `view:`/`settings:`/`terminal:`/output/webview scheme handlers + terminal naming | `theia/extensions/tab-uris/src/browser/view-open-handler.ts`, `theia/extensions/tab-uris/src/browser/terminal-open-handler.ts`, `theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`, `theia/extensions/tab-uris/src/browser/view-factory-table.ts`, `theia/extensions/tab-uris/src/browser/terminal-naming-contribution.ts` |
| GUI-01 command | Palette command `powerbrowser.open-browser-window` that opens a stock browser window via `window.open(url, '_blank')` | `theia/extensions/tab-uris/src/browser/browser-window-command.ts` |
| Token gate | Fail-closed backend auth: front-inserted Express middleware checking `POWERBROWSER_TOKEN` cookie; `/powerbrowser/health`; readiness sentinel; loopback-bind enforcement | `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` |
| Env capture + token read | Module-load capture-and-scrub of all `POWERBROWSER_*` env keys; reads token off stdin byte-at-a-time | `theia/extensions/token-gate/src/node/powerbrowser-env.ts` |
| Parent watchdog | Dies-with-the-browser: `POWERBROWSER_SUPERVISED=1`-gated stdin-EOF self-SIGTERM | `theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts` |
| Theia composition root | DI composition: binds the four `@powerbrowser/*` extensions alongside pinned `@theia/*` packages | `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`, `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`, `theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts`, `theia/extensions/customize/src/browser/customize-frontend-module.ts`, `theia/applications/browser/package.json` |
| Branding extension | Welcome/about/favicon/AI-layout brand surfaces | `theia/extensions/branding/src/browser/powerbrowser-welcome-contribution.ts`, `theia/extensions/branding/src/browser/powerbrowser-ai-layout-contribution.ts`, `theia/extensions/branding/src/browser/powerbrowser-favicon-contribution.ts`, `theia/extensions/branding/src/browser/powerbrowser-mark.ts` |
| Customize bridge | Runtime CSS + dev-flagged privileged JS bridge (`powerbrowserPrivilegedJs: false` by default) | `theia/extensions/customize/src/browser/customize-css-contribution.ts`, `theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts`, `theia/extensions/customize/src/browser/powerbrowser-privileged-js.ts` |
| Generator | Reads `configuration.toml`, validates against schema, emits 23 tracked-equivalent build surfaces under `generated/` | `scripts/generate.mjs` (+ schema `scripts/lib/config-schema.json`, vendored parser `scripts/lib/toml.cjs`) |
| Verification driver | Single CHECKS registry; `--quick` (static, seconds) vs full (build/browser/display); `--only <label>`; `--gate` | `scripts/verify-platform.sh` |
| Internals guard | Executable SHELL-02 boundary: fails on any forbidden pattern outside the boundary file; `--catalogue` mode derives `powerbrowser/INTERNAL-APIS.md` | `scripts/check-internals-boundary.sh` |
| Brand gates | Residual-token scan; branding preflight/identity/agreement; generated byte-identity | `scripts/scan-brand-residue.mjs`, `scripts/verify-branding*.mjs`, `scripts/verify-generated-identity.mjs`, `scripts/verify-branding-agreement.mjs` |
| Patch stack | Identity hook (vendor/UA/healthreport/normandy flags) + shell hook (build `DIRS` only, no `BROWSER_CHROME_URL` override) | `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch` |

## Pattern Overview

**Overall:** Zen-style patch-set browser + supervised sidecar + Inversify-composed Theia extensions + manifest-driven generator, all held together by a single verification registry.

**Key Characteristics:**
- Upstream is never forked: `upstream/` is fetched by `scripts/fetch-upstream.sh` and never hand-edited; all Gecko reach-through is confined to one boundary file, and all Theia additions are `@powerbrowser/*` extensions composed into the sidecar (never an edit to `@theia/*` core, guarded by `scripts/diff-theia-core.sh`).
- One anti-corruption layer: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` is the only file permitted to reach a Firefox internal; `powerbrowser/shell/TheiaService.sys.mjs` is its consumer (imports nothing else). Every touchpoint is catalogued in `powerbrowser/INTERNAL-APIS.md`, derived by `scripts/check-internals-boundary.sh --catalogue`.
- Supervisor owns the backend lifecycle end-to-end: token mint → sidecar resolve → spawn on port 0 → readiness sentinel → health gate → cookie → swap → steady-state loop with pinned-port restart, bounded give-up, error layer, and background recovery probe.
- Credentials avoid the environment: the token travels over the spawn stdin pipe (`PowerBrowserAPI.writeStdinLine`), is captured-and-scrubbed at backend module load (`theia/extensions/token-gate/src/node/powerbrowser-env.ts`), and never appears in `/proc/<pid>/environ`, logs, sentinels, or the diagnostics layer.
- The manifest is the only rebrand input: `configuration.toml` + `brand/` → `scripts/generate.mjs` → `generated/`; byte-identity against the hand-written files is the acceptance gate (`generated-byte-identity`).
- Verification is one registry, not N drivers: adding a check means appending one row to `scripts/verify-platform.sh`; every check carries a `--self-test` proving it can go red.

## Layers

**Gecko chrome shell (`powerbrowser/shell/`):**
- Purpose: Privileged startup window, process supervision, and the single Firefox-internals boundary.
- Location: `powerbrowser/shell/`
- Contains: Chrome document (`powerbrowser/shell/powerbrowser.xhtml`), bootstrap (`powerbrowser/shell/powerbrowser.js`), boundary (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`), supervisor (`powerbrowser/shell/TheiaService.sys.mjs`), prefs (`powerbrowser/shell/powerbrowser-sidecar.js`), XUL/XPCOM registration (`powerbrowser/shell/jar.mn`, `powerbrowser/shell/moz.build`, `powerbrowser/shell/components.conf`), styles (`powerbrowser/shell/powerbrowser.css`).
- Depends on: Firefox platform services (only via the boundary file), the built Theia backend entry file at spawn time.
- Used by: Nothing above it — it is the process entry surface. The Theia frontend later triggers stock-chrome windowing through platform machinery, not through this layer's code.

**Theia sidecar backend (`theia/extensions/token-gate/`, `theia/applications/browser/`):**
- Purpose: Unprivileged IDE backend gated by a per-launch token; health endpoint; parent-death watchdog; crash-leftover state-file protocol peer.
- Location: `theia/extensions/token-gate/src/node/`, composed at `theia/applications/browser/package.json`
- Contains: Inversify `ContainerModule` (`theia/extensions/token-gate/src/node/token-gate-backend-module.ts`), gate/health/readiness (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`), env handshake (`theia/extensions/token-gate/src/node/powerbrowser-env.ts`), watchdog (`theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts`).
- Depends on: `@theia/core` backend contribution points (`BackendApplicationContribution`, `EarlyExpressMiddleware`); supervisor-provided env + stdin line.
- Used by: The shell supervisor (spawn/health/swap lifecycle); the frontend over loopback HTTP/WebSocket once gated.

**Theia sidecar frontend (`theia/extensions/tab-uris/`, `theia/extensions/branding/`, `theia/extensions/customize/`):**
- Purpose: URL-addressable tabs (bridge seed), product branding, user customization bridge, GUI-01 stock-window command.
- Location: `theia/extensions/*/src/browser/`, composed at `theia/applications/browser/package.json`
- Contains: `ContainerModule`s, `OpenHandler`s, `CommandContribution`s, `FrontendApplicationContribution`s.
- Depends on: `@theia/*` 1.74.1 packages only; `@powerbrowser/tab-uris` exposes `TabUriRegistry` for `@powerbrowser/customize` (optional, `isBound`-guarded).
- Used by: The Theia application shell at runtime; the future `@powerbrowser/browser-bridge` consumes `TabUriRegistry`'s exported shape (asserted by `scripts/verify-registry-shape.mjs`).

**Branding / generator layer (`configuration.toml`, `brand/`, `scripts/generate.mjs`, `generated/`):**
- Purpose: Single-file rebrand: manifest + assets in, 23 build surfaces out.
- Location: `configuration.toml`, `brand/`, `scripts/generate.mjs`, `scripts/lib/config-schema.json`, `generated/`
- Contains: Manifest sections (`product`, `identity`, `legal`, `theia`, `variants`), schema + validation, per-format emitters (`emitConfigureSh`, `emitBrandFtl`, `emitBrandProperties`, `emitMozconfig`, `emitDesktopEntry`, branding-layout literals), frozen `TARGETS` table.
- Depends on: Nothing at runtime — build-time only. Pipeline order is load-bearing: parse → reject-unknown → mask → merge → validate → emit → write; nothing is written until every check passes.
- Used by: The Gecko build (copied over `powerbrowser/branding/*`, `.mozconfig`, `*.desktop`); the verification gates that prove byte-identity and agreement.

**Patch / upstream layer (`upstream/`, `patches/`):**
- Purpose: Pin ESR, hook in the shell build directory and identity values without forking.
- Location: `upstream/` (git-ignored 1.1 GB clone), `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`
- Contains: `moz.configure` identity hook (vendor `DeBIOS`, UA `Firefox`, health-report/normandy off); `browser/moz.build` `DIRS += ["../powerbrowser/shell"]` hook-only entry (no `BROWSER_CHROME_URL` override since GUI-01 moved startup selection into `PowerBrowserSingleInstanceHandler`).
- Depends on: `scripts/fetch-upstream.sh` + `scripts/apply-patches.sh`; guarded by `scripts/check-patch-surface.sh`.
- Used by: The Gecko build (`objdir/`).

**Verification layer (`scripts/verify-platform.sh` + `scripts/verify-*.mjs`):**
- Purpose: One driver, one CHECKS registry, one summary table: static brand/boundary/generator gates (`--quick`) plus live backend/shell/window gates (full).
- Location: `scripts/verify-platform.sh`, `scripts/verify-*.mjs`, `scripts/check-*.sh`, `scripts/smoke-*.sh`, `scripts/verify-endpoints.sh`
- Contains: ~44 ported rows + project rows (GUI-01 window trio, GUI-04 registry shape, error-copy, start-path-recovery, error-contract, generated byte-identity, branding agreement, about-dialog suppression).
- Depends on: Built tree / live app / display only for the full tier; `--quick` needs none of those.
- Used by: Commit gate (`--quick`), per-task sampling (`--only`), release gate (`--gate`).

## Data Flow

### Primary Request Path (startup → swap → steady state)

1. OS launches binary; `PowerBrowserSingleInstanceHandler.handle()` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:588`) finds no shell window on initial launch → `openShellWindow()` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:494`) opens `chrome://powerbrowser/content/powerbrowser.xhtml`, sets `preventDefault` so the stock handler opens nothing else (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:599`).
2. `powerbrowser.xhtml` loads; `powerbrowser.js` `DOMContentLoaded` writes `POWERBROWSER_SHELL_READY` via `dump()` first, before any backend work (`powerbrowser/shell/powerbrowser.js:20`), then imports the two `.sys.mjs` modules, mints `permanentKey`, presents the `gBrowser.tabs` shape for automation, fires `notifyStartupFinished` (`powerbrowser/shell/powerbrowser.js:254`), and calls `TheiaService.start(browserElement)` fire-and-forget with a terminal handler (`powerbrowser/shell/powerbrowser.js:266`).
3. `TheiaService.start()` (`powerbrowser/shell/TheiaService.sys.mjs:147`) sets the `_started` idempotency guard, mints `crypto.randomUUID()` token, resolves sidecar (`_resolveSidecar`), derives profile-scoped state-file path (`_stateFilePath`), registers the quit observer early (`_quitObserverOff`), ensures config dir, reaps any verified leftover (`_reapLeftover`), then enters `_restart()`.
4. `_restart()` (`powerbrowser/shell/TheiaService.sys.mjs:889`) → `_spawnAndGate(!this._swapped)` (`powerbrowser/shell/TheiaService.sys.mjs:551`): spawns `node backendMain --hostname 127.0.0.1 --port 0` with `POWERBROWSER_SUPERVISED=1` and `POWERBROWSER_TOKEN_DISABLE=""` in environment (`powerbrowser/shell/TheiaService.sys.mjs:572`), writes the token over the stdin pipe (`powerbrowser/shell/TheiaService.sys.mjs:636`), pumps stdout for `POWERBROWSER_BACKEND_READY {port, pid}`, pins `this._port`/`this._pid`, writes `sidecar-state-<profileKey>.json` with field-22 start ticks, polls `/powerbrowser/health` to 200, mints the `POWERBROWSER_TOKEN` Lax session cookie (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:152`), swaps the `<browser>` via `loadURIInBrowser` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:365`), and starts `_healthLoop()` fire-and-forget.
5. Backend side: `powerbrowser-env.ts` captures-and-scrubs `POWERBROWSER_*` at module load and reads the token off stdin (`theia/extensions/token-gate/src/node/powerbrowser-env.ts:115`); the gate fails closed without it and front-inserts itself ahead of the stock connection-token middleware (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:74`); `onStart` enforces loopback bind and announces readiness on stdout (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:85`); the watchdog arms only when supervised (`theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:26`).
6. Steady state: `_healthLoop()` (`powerbrowser/shell/TheiaService.sys.mjs:819`) probes every `healthIntervalSteadyMs`; two consecutive failures trigger `_restart()` on the pinned port (D-104: the loaded page's origin must hold still).

### Error → Retry → Recovery

1. Any spawn failure returns `{ok:false, recoverable, message, details}` (`powerbrowser/shell/TheiaService.sys.mjs:514`); unrecoverable (missing entry file, unresolvable node, `spawn()` throw, pinned-port steal) gives up immediately, recoverable retries with 500 ms → 5000 ms backoff until `giveUpAttempts`/`giveUpWallclockMs` (`powerbrowser/shell/TheiaService.sys.mjs:895`), both prefs overridable via `powerbrowser/shell/powerbrowser-sidecar.js:34`.
2. Give-up paints the error layer through `window.powerbrowserShowError({reason, recoverable})` (`powerbrowser/shell/powerbrowser.js:102`): `reason` is always a `USER_MESSAGE` value (`powerbrowser/shell/TheiaService.sys.mjs:41`), identifiers ride the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel + `getFailureDetails()` rows, and `errorRetryButton.hidden = !recoverable` (`powerbrowser/shell/powerbrowser.js:115`).
3. `retry()` (`powerbrowser/shell/TheiaService.sys.mjs:991`) refuses unless `_errorRecoverable === true` (supervisor-side refusal, not just hidden button), clears via `_hideError()`, and re-enters `_restart()` under the shared `_restartInFlight` guard; the background `_recoveryProbeLoop()` (`powerbrowser/shell/TheiaService.sys.mjs:1052`) takes the same path when the failure clears on its own, emitting `POWERBROWSER_SHELL_ERROR_CLEARED`. Any escaping rejection lands in the single terminal handler `reportUnexpectedFailure()` (`powerbrowser/shell/TheiaService.sys.mjs:1029`).

### Crash-leftover reap (SIDE-04)

1. Every successful spawn writes `{pid, port, startTicks, writtenAt}` to the profile-scoped state file (`powerbrowser/shell/TheiaService.sys.mjs:722`); clean `stop()` removes it (`powerbrowser/shell/TheiaService.sys.mjs:292`).
2. Next `start()` calls `_reapLeftover()` before its first spawn (`powerbrowser/shell/TheiaService.sys.mjs:443`): absent/malformed record → proceed; dead pid → remove file; live pid → compare `/proc/<pid>/stat` field-22 ticks (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:415`) for exact string equality; mismatch (recycled pid) → never signal; match → `SIGTERM` via `ctypes` `kill(2)` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:453`), bounded 3 s poll, no escalation, remove file either way. Outcomes go to the dual channel (ring buffer + stdout) via `_reapLog()`.

### GUI-01 stock window (frontend → chrome with no chrome code)

1. User invokes `powerbrowser.open-browser-window` from the palette (`theia/extensions/tab-uris/src/browser/browser-window-command.ts:60`).
2. The Theia frontend (remote web content) calls `window.open(url, '_blank')` (`theia/extensions/tab-uris/src/browser/browser-window-command.ts:77`); the shell window carries no `nsIBrowserDOMWindow`, so `nsWindowWatcher` falls through to `AppWindow::CreateNewContentWindow`, opening stock `BROWSER_CHROME_URL` — correct only because `patches/020-powerbrowser-shell.patch` no longer overrides that define.
3. `PowerBrowserAPI.openBrowserWindow()` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:523`) remains as the pre-approved JSWindowActor fallback, deliberately unused.

**State Management:**
- All supervisor state is per-launch and in-memory (`powerbrowser/shell/TheiaService.sys.mjs:65`): token, port, pid, proc handle, `_swapped`, `_shuttingDown`, `_started`, `_errorShown`/`_errorRecoverable`, `_restartInFlight`, `_recoveryProbeActive`, D-106 ring buffer `_log`. The sole persistence is the crash-leftover state file (D-110), written on every successful spawn and removed on clean stop.
- Completion is keyed on `this._swapped`, never on `this._port !== null`: a spawn that pinned a port but failed the health gate must not count as completed, or later respawns skip cookie/navigation/loop-start.
- Backend state is per-process: token + supervised flag captured at module load (`theia/extensions/token-gate/src/node/powerbrowser-env.ts:66`); respawn-accepts-the-same-cookie comes from the supervisor re-writing the same token per spawn, not from backend persistence.

## Key Abstractions

**PowerBrowserAPI (boundary):**
- Purpose: The one module allowed to name platform internals; everything else calls named wrappers.
- Examples: `powerbrowser/shell/PowerBrowserAPI.sys.mjs:36` (`getStringPref`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:193` (`spawnProcess`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:248` (`sleep` via `nsITimer`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:294` (`probeHealth` via privileged `XMLHttpRequest`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:311` (`onQuitGranted`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:336` (`notifyStartupFinished`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:415` (`readProcessStartTicks`), `powerbrowser/shell/PowerBrowserAPI.sys.mjs:453` (`signalBarePid`).
- Pattern: Frozen export object of never-throw-or-throw-loudly primitives with no policy; lazy `ChromeUtils.defineESModuleGetters` for `Subprocess`/`ctypes`/`AppConstants`.

**TheiaService (supervisor):**
- Purpose: Owns the whole sidecar lifecycle and the user-visible failure contract.
- Examples: `powerbrowser/shell/TheiaService.sys.mjs:147` (`start`), `powerbrowser/shell/TheiaService.sys.mjs:272` (`stop`), `powerbrowser/shell/TheiaService.sys.mjs:551` (`_spawnAndGate`), `powerbrowser/shell/TheiaService.sys.mjs:819` (`_healthLoop`), `powerbrowser/shell/TheiaService.sys.mjs:889` (`_restart`), `powerbrowser/shell/TheiaService.sys.mjs:991` (`retry`), `powerbrowser/shell/TheiaService.sys.mjs:443` (`_reapLeftover`).
- Pattern: Singleton object with latched guards (`_started`, `_shuttingDown`, `_swapped`, `_errorShown`, `_restartInFlight`); `USER_MESSAGE` table (`powerbrowser/shell/TheiaService.sys.mjs:41`) as the only user-facing copy source.

**TabUriRegistry + OpenHandlers (bridge seed):**
- Purpose: Bidirectional `factoryId <-> URI` mapping across `view:`/`settings:`/`terminal:`/output/webview/extension-detail schemes; runtime discovery over `ContributionProvider<CommandContribution>` with a static coverage table cross-check.
- Examples: `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:32`, `theia/extensions/tab-uris/src/browser/view-factory-table.ts`, `theia/extensions/tab-uris/src/browser/view-open-handler.ts`, `theia/extensions/tab-uris/src/browser/terminal-open-handler.ts`, `theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts`
- Pattern: Inversify `@injectable()` singletons wired in `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts`; late-registration escape hatch `registerLateOpenHandler` for post-first-`open()` bindings.

**Token gate trio (backend auth boundary):**
- Purpose: Fail-closed loopback gate + stdin credential channel + supervised-only watchdog.
- Examples: `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`, `theia/extensions/token-gate/src/node/powerbrowser-env.ts`, `theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts`, wired by `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`
- Pattern: `BackendApplicationContribution` pair + module-load side-effect module; every reader uses `POWERBROWSER_ENV`, never `process.env`.

**Generator pipeline (manifest → surfaces):**
- Purpose: Parse → reject-unknown → mask → merge → validate → emit → write; provenance-tracked merge, per-key required masking so downstreams can never inherit identity/legal keys.
- Examples: `scripts/generate.mjs` (pipeline + emitters), `scripts/lib/config-schema.json` (single schema both masker and validator read), `scripts/lib/toml.cjs` (vendored parser with digest-pinned header).
- Pattern: Frozen `TARGETS` table (`scripts/generate.mjs`) consumed by both the emitter and `scripts/verify-generated-identity.mjs`, so an added/removed target goes red without a second list.

**Prefs as policy knobs:**
- Purpose: Timeouts, intervals, grace, log-buffer size, and the SHELL-03 give-up budget live in prefs so verification can force fast failure via a launch profile's `user.js`.
- Examples: `powerbrowser/shell/powerbrowser-sidecar.js:16`, `scripts/verify-platform.sh:890` (poisoned `backendMain`), `scripts/verify-platform.sh:949` (`giveUpAttempts=2` fixture).

## Entry Points

**Gecko process start:**
- Location: `powerbrowser/shell/components.conf` → `powerbrowser/shell/PowerBrowserAPI.sys.mjs:583` (`PowerBrowserSingleInstanceHandler`)
- Triggers: OS launch / second launch against the same profile (platform remoting keys on profile path).
- Responsibilities: First launch opens the shell and claims startup (`preventDefault`); second launch focuses the existing `powerbrowser:main` window and claims the handoff; pre-window remote handoff does nothing. Thrown errors are logged and swallowed so later handlers still run.

**Shell window load:**
- Location: `powerbrowser/shell/powerbrowser.xhtml` + `powerbrowser/shell/powerbrowser.js:17` (`DOMContentLoaded`, `{once:true}`)
- Triggers: `openShellWindow()` (first launch).
- Responsibilities: Paint first (`POWERBROWSER_SHELL_READY`), wire deck globals (`powerbrowserSwapToUrl`, `powerbrowserShowError/HideError`, `powerbrowserRetry`, `powerbrowserShowDiagnostics/HideDiagnostics`), emit pref + identity sentinels, fire startup-finished for automation, start the supervisor, install the diagnostics chord (`accel,alt,shift+D`).

**Theia backend start:**
- Location: `theia/applications/browser/lib/backend/main.js` (built; source composition in `theia/applications/browser/package.json`)
- Triggers: Supervisor spawn with `--hostname 127.0.0.1 --port <0|pinned>`.
- Responsibilities: Load container modules (including `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`), run env capture + token read at module load, fail closed without a token, bind loopback, announce `POWERBROWSER_BACKEND_READY`.

**Theia frontend composition:**
- Location: `theia/extensions/*/src/browser/*-frontend-module.ts`, rooted at `theia/applications/browser/package.json`
- Triggers: Backend serves the frontend; shell swaps the `<browser>` onto it.
- Responsibilities: Bind open handlers, commands, and contributions into the Inversify container before first use (late bindings use `registerLateOpenHandler`).

**Generator CLI:**
- Location: `scripts/generate.mjs` (`node scripts/generate.mjs`, `--check`, `--self-test`)
- Triggers: Developer rebrand edit; `generate-check` / `generated-byte-identity` gates.
- Responsibilities: Validate manifest, emit all 23 targets into `generated/` (or assert identity/idempotence without writing).

**Verification driver:**
- Location: `scripts/verify-platform.sh` (`--quick`, `--only <label>`, `--build`, `--gate`)
- Triggers: Commit gate, per-task sampling, full/release runs.
- Responsibilities: Run the CHECKS registry in order, always the whole table (no `-e`), with lazy Theia-app boot, headless/display shell harnesses, and `setsid` process-group teardown.

## Architectural Constraints

- **Threading:** Chrome shell JS is single-threaded event-loop; timed waits use `nsITimer` one-shots held in a module-level `pendingTimers` set (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:29`) because the timer does not keep itself alive. No worker threads. The backend is a separate Node OS process supervised over stdio/HTTP, never in-process.
- **Global state:** Per-launch in-memory singletons only: `TheiaService` fields (`powerbrowser/shell/TheiaService.sys.mjs:65`), `PowerBrowserAPI`'s `pendingTimers`, backend module-load `captured` env (`theia/extensions/token-gate/src/node/powerbrowser-env.ts:66`), `TabUriRegistry._index` lazily built after all modules load (`theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:50`). Re-entrancy is latched (`_started`, `_shuttingDown`, `_restartInFlight`, `_errorShown`).
- **Circular imports:** None by construction. `TheiaService` imports only the boundary file (`powerbrowser/shell/TheiaService.sys.mjs:16`); `powerbrowser.js` imports both; the boundary imports no project file. Frontend `@powerbrowser/customize` reaches `@powerbrowser/tab-uris` only through an `isBound`-guarded optional get (`theia/extensions/customize/src/browser/customize-frontend-module.ts:37`).
- **Linux-only paths:** Bare-pid signalling opens `libc.so.6` via `ctypes` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:453`); `/proc/<pid>/stat` field-22 identity and `/proc/<pid>/environ` reasoning assume Linux procfs.
- **No-space checkout path:** `pkgs.mkShell` appends an rpath to space-separated `NIX_LDFLAGS`; the repo must live at a path with no space. `vendor_machine` stays space-free (`DeBIOS`) because it lands in the profile path.
- **No custom browser chrome:** No tab strip, toolbar, address bar, or menu of our own (`powerbrowser/shell/powerbrowser.xhtml:5`); stock chrome is reachable (GUI-01) but never authored.
- **Internal identifiers are fixed:** `chrome://powerbrowser/`, `@powerbrowser/*`, pref branches, `PowerBrowserAPI`, and sentinel names are never rebrand inputs.

## Anti-Patterns

### Privileged call outside the boundary file

**What happens:** Chrome-privileged API (`fixupAndLoadURIString`, `nodePrincipal`) is called directly from `powerbrowser.js` or a new shell module, possibly with a comment saying it avoids the boundary.
**Why it's wrong:** The guard's pattern list is the definition of "internal"; an unnamed touch passes the check while breaking the one-file audit surface the next ESR rebase depends on.
**Do this instead:** Add a named wrapper in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (see `loadURIInBrowser` at `powerbrowser/shell/PowerBrowserAPI.sys.mjs:365`) and catalogue the row in `powerbrowser/INTERNAL-APIS.md`; the guard fails until both exist.

### Secret in the spawn environment

**What happens:** A credential (token, cookie value) is added to `_spawnAndGate`'s `environment` object or any `POWERBROWSER_*` key expecting a grandchild to read it.
**Why it's wrong:** `environment` becomes `/proc/<pid>/environ`, an exec-time snapshot readable by any same-uid process for the process lifetime; `delete process.env.X` does not rewrite it. Node also hands `process.env` to every child (terminals, tasks, plugin host).
**Do this instead:** Hand secrets over the stdin pipe per spawn (`powerbrowser/shell/TheiaService.sys.mjs:636` → `theia/extensions/token-gate/src/node/powerbrowser-env.ts:88`) and read them from `POWERBROWSER_ENV`, never `process.env`.

### Keying respawn logic on the pinned port

**What happens:** `_spawnAndGate` / `_restart` branches on `this._port === null` to decide first-spawn vs respawn behavior.
**Why it's wrong:** A first spawn that announced readiness (pinning a port) then failed the health gate leaves every later successful respawn taking the "already initialised" branch — no cookie, no navigation, no health loop — stranding the user on the loading layer with a healthy backend.
**Do this instead:** Key completion on `this._swapped` (`powerbrowser/shell/TheiaService.sys.mjs:762`), the one field `_swap()`'s own guard owns; the static half is enforced by `start-path-recovery` (`scripts/verify-start-path-recovery.mjs`).

### Second owner of one rendered fact

**What happens:** The bootstrap writes `errorElement.style.display` (or any deck visibility) directly alongside the supervisor's `_showError`/`_hideError`, or the retry control clears the layer before the supervisor does.
**Why it's wrong:** Two writers drift: the DOM goes blank while `_errorShown` stays latched, so the next failing retry repaints nothing and the session ends on a blank window.
**Do this instead:** Route every visibility change through `TheiaService._showError/_hideError` → `window.powerbrowserShowError/HideError` (`powerbrowser/shell/powerbrowser.js:102`, `powerbrowser/shell/powerbrowser.js:122`); the retry entry clears via the supervisor (`powerbrowser/shell/TheiaService.sys.mjs:991`), never the DOM.

### Hand-kept expectation lists

**What happens:** A check asserts against a literal list of files, sentinels, or messages copied from the tree.
**Why it's wrong:** The list agrees with the tree it was copied from forever; additions and removals both pass silently.
**Do this instead:** Derive the expectation at check time and compare as set equality — `TARGETS` shared between `scripts/generate.mjs` and `scripts/verify-generated-identity.mjs`, factory-id set derived from sources in `scripts/verify-registry-shape.mjs`, `USER_MESSAGE` values derived from `powerbrowser/shell/TheiaService.sys.mjs` in `scripts/verify-shell-error-copy.mjs` — each with a `--self-test` planting faults that must go red.

## Error Handling

**Strategy:** Never-throw primitives at the boundary; classified `{ok, recoverable, message, details}` results in the supervisor; static product-named copy on screen with full identifiers in the diagnostics layer; a single terminal backstop for escaping rejections; machine-readable `dump()` sentinels for the harness.

**Patterns:**
- Boundary accessors return fallbacks instead of throwing (`getStringPref`/`getIntPref`/`getProfileDir`/`pathSearch`/`readStateFile`/`probeHealth` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`); the loud exceptions are `setSessionCookie` rejection (silent 403 is worse than a throw) and swallowed-then-logged handler errors (`PowerBrowserSingleInstanceHandler.handle`).
- `USER_MESSAGE` (`powerbrowser/shell/TheiaService.sys.mjs:41`) is the only user-facing copy source; every message names the product, states the problem plainly, and ends with a real on-screen affordance; no pref key, sentinel, port, timeout, or raw exception ever reaches `#powerbrowser-error-message` (gated by `shell-error-copy-no-internals`).
- `_fatal()` keeps full diagnostics in the D-106 ring buffer + stdout; `getFailureDetails()` (`powerbrowser/shell/TheiaService.sys.mjs:327`) is the single accessor both the rendered rows and the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel read.
- All four fire-and-forget promise roots (bootstrap `start()`, retry, `_healthLoop`, `_recoveryProbeLoop`) route rejections to `reportUnexpectedFailure()` (`powerbrowser/shell/TheiaService.sys.mjs:1029`).

## Cross-Cutting Concerns

**Logging:** Dual channel everywhere: `PowerBrowserAPI.log()` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:322`) mirrors to browser console + stdout with a `[PowerBrowserAPI] <level>:` prefix the harness tolerates; `TheiaService._pushLog/_reapLog` feed the bounded (500-line, `powerbrowser/shell/powerbrowser-sidecar.js:25`) in-memory ring buffer read by `getRecentLog()` and the diagnostics `<pre>`. Never log the token — enforced by `shell04-log-redacts-token`.
**Validation:** Manifest validation in `scripts/generate.mjs` (unknown-setting rejection before merge, required-mask before merge, regex/type/business rules, emittability sink guard); schema in `scripts/lib/config-schema.json`; every failure message is user-facing copy naming the dotted setting and a next step.
**Authentication:** Per-launch token minted by the supervisor, delivered over stdin, minted into a `SameSite=Lax` non-`Secure` session cookie for loopback HTTP (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:152`), checked with `timingSafeEqual` on every plain-HTTP route ahead of stock middleware (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:74`); named `POWERBROWSER_TOKEN_DISABLE=1` bypass exists only for dev/verify loops and is explicitly cleared on the supervised spawn.

---

*Architecture analysis: 2026-09-04*
