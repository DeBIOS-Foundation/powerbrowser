<!-- refreshed: 2026-09-04 -->
# Architecture

**Analysis Date:** 2026-09-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Gecko Shell (chrome)                      │
├──────────────────┬──────────────────┬───────────────────────┤
│  Shell Document  │  Anti-Corruption │  Supervisor           │
│  `powerbrowser/  │  Boundary        │  `powerbrowser/shell/ │
│  shell/power-    │  `powerbrowser/  │  TheiaService.sys.mjs`│
│  browser.xhtml`  │  shell/Power-    │                       │
│  + `power-       │  BrowserAPI.     │                       │
│  browser.js`     │  sys.mjs`        │                       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         │  spawn + stdin   │  cookie + swap      │  stdout
         │  handshake       │  navigation         │  sentinels
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Theia Sidecar (Node + browser)                  │
│  `theia/applications/browser/` + `theia/extensions/*/`      │
│  token-gate │ parent-watchdog │ tab-uris │ branding │ customize│
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Rebrand Inputs → Generator → Build Surfaces                 │
│  `configuration.toml` + `brand/` → `scripts/generate.mjs`   │
│  → `generated/` → `powerbrowser/branding-generated/`,       │
│  `.mozconfig`, `*.desktop`                                   │
└─────────────────────────────────────────────────────────────┘
```

Underneath both halves sits the patch-set substrate: `upstream/` (pinned ESR checkout, never hand-edited) plus `patches/` (currently `010-powerbrowser-identity.patch`, `020-powerbrowser-shell.patch`). Above everything sits the verification registry `scripts/verify-platform.sh`, which is the single driver for all checks.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Anti-corruption boundary | Sole file allowed to touch Firefox internals (`Services.*`, `Cc`/`Ci`/`Cu`, `Subprocess`, `ctypes`, `AppConstants`); every touchpoint catalogued | `powerbrowser/shell/PowerBrowserAPI.sys.mjs` |
| Backend supervisor | Owns sidecar lifecycle: resolve → spawn → readiness gate → cookie → swap → health loop → restart budget → quit; all per-launch in-memory state | `powerbrowser/shell/TheiaService.sys.mjs` |
| Chrome bootstrap | Paints loading/error/diagnostics deck, exposes `window.powerbrowser*` globals, emits `dump()` sentinels, hands off to `TheiaService.start()` | `powerbrowser/shell/powerbrowser.js` |
| Shell document | Chromeless window: branded loading layer + error layer + diagnostics layer + one remote `<browser>`; no tab strip/toolbar/address bar | `powerbrowser/shell/powerbrowser.xhtml` |
| Single-instance handler | Startup-window selection: focus existing shell window or open it on initial launch, set `preventDefault` so stock handler stays quiet | `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`PowerBrowserSingleInstanceHandler`, registered in `powerbrowser/shell/components.conf`) |
| Sidecar defaults | Preprocessed pref defaults (`backendMain`, `nodePath`, timeouts, give-up budget, recovery probe interval) | `powerbrowser/shell/powerbrowser-sidecar.js` |
| Token gate | Fail-closed Express gate on every backend route; loopback-bind assertion; readiness sentinel emission; health endpoint | `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` |
| Env capture + stdin handshake | Captures and scrubs all `POWERBROWSER_*` from `process.env` at module load; reads token off stdin byte-at-a-time on supervised launches | `theia/extensions/token-gate/src/node/powerbrowser-env.ts` |
| Parent-death watchdog | Self-SIGTERM when supervisor's stdin pipe EOFs; inert unless `POWERBROWSER_SUPERVISED=1` | `theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts` |
| Tab-URI registry | `factoryId <-> URI` bidirectional registry; declared public shape consumed by future `@powerbrowser/browser-bridge` | `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` |
| URI open handlers | `view:`/`settings:` handler plus terminal/output/webview handlers; priority `1000` over in-tree bidders | `theia/extensions/tab-uris/src/browser/view-open-handler.ts`, `theia/extensions/tab-uris/src/browser/terminal-open-handler.ts`, `theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts` |
| View factory table | Coverage contract: static list of `view:` factory ids cross-checked against runtime DI discovery at first use | `theia/extensions/tab-uris/src/browser/view-factory-table.ts` |
| Browser-window command | GUI-01 entry affordance `powerbrowser.open-browser-window` → `window.open(url, '_blank')` from Theia frontend, no chrome-side code | `theia/extensions/tab-uris/src/browser/browser-window-command.ts` |
| Branding extension | Welcome widget, favicon, about-dialog rebind, AI-layout rebinds (guarded `rebind`) | `theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts` |
| Customize extension | Opt-in CSS + privileged-JS surface, bound only when `powerbrowserPrivilegedJs === true` | `theia/extensions/customize/src/browser/customize-frontend-module.ts` |
| Sidecar composition | Theia app assembly: pins `@theia/*@1.74.1`, composes four `@powerbrowser/*` extensions, sets `applicationName`, `powerbrowserPrivilegedJs: false` | `theia/applications/browser/package.json` |
| Rebrand generator | Reads `configuration.toml`, validates against `scripts/lib/config-schema.json`, emits 33 byte-identical targets under `generated/` | `scripts/generate.mjs` |
| Verification registry | Single driver: `--quick` / `--only <label>` / `--gate` / full; every check is one registry row | `scripts/verify-platform.sh` |
| Internals catalogue | Derived catalogue of every boundary touchpoint; `check-internals-boundary.sh --catalogue` fails on drift | `powerbrowser/INTERNAL-APIS.md` |

## Pattern Overview

**Overall:** Patch-set browser substrate + supervised sidecar + InversifyJS-composed Theia frontend, gated by a derive-and-compare verification registry.

**Key Characteristics:**
- Never fork, never patch outside the stack: `upstream/` is fetched by `scripts/fetch-upstream.sh` and `git -C upstream diff` staying empty is the invariant; all Gecko reach-through lives in one file (`powerbrowser/shell/PowerBrowserAPI.sys.mjs`), enforced by `scripts/check-internals-boundary.sh`.
- Supervisor owns the backend process: `TheiaService.sys.mjs` imports nothing but the boundary file; it mints a per-launch token, resolves the sidecar, spawns Node with `environmentAppend: true`, hands the token over the stdin pipe (never the environment), waits for the `POWERBROWSER_BACKEND_READY` sentinel, health-gates, mints the cookie, then swaps the `<browser>` exactly once.
- InversifyJS composition over inheritance: each `@powerbrowser/*` extension contributes a `ContainerModule` (`*-frontend-module.ts` / `*-backend-module.ts`); overrides use the guarded `if (isBound(X)) rebind(X).to(Y)` idiom so modules stay loadable when a base binding is absent.
- Derive-from-the-tree-and-compare: checks never hand-keep expectation lists. `scripts/verify-registry-shape.mjs` derives the registry's exported shape and compares as set equality; `scripts/verify-shell-error-copy.mjs` derives `USER_MESSAGE` values from `TheiaService.sys.mjs`; `scripts/check-internals-boundary.sh --catalogue` re-derives occurrences from the boundary file.
- Sentinel protocol over stdout: `POWERBROWSER_SHELL_READY`, `POWERBROWSER_SHELL_SWAP`, `POWERBROWSER_SHELL_ERROR`, `POWERBROWSER_BACKEND_READY`, `POWERBROWSER_DIAGNOSTICS`, `POWERBROWSER_DECK_STATE` — written with chrome-global `dump()` so `--quick` and headless runs can assert without a display.

## Layers

**Gecko chrome shell:**
- Purpose: Chromeless startup window, supervision entry point, diagnostics deck
- Location: `powerbrowser/shell/`
- Contains: `powerbrowser.xhtml`, `powerbrowser.js`, `powerbrowser.css`, `PowerBrowserAPI.sys.mjs`, `TheiaService.sys.mjs`, `powerbrowser-sidecar.js`, `components.conf`, `jar.mn`, `moz.build`
- Depends on: `upstream/` platform (via boundary only), `theia/applications/browser/lib/backend/main.js` at runtime
- Used by: Nothing above it — this is the top of the stack; `verify-platform.sh` drives it as a black box

**Theia backend (Node):**
- Purpose: Serves the IDE UI on loopback; gated by token; supervised via stdin pipe
- Location: `theia/extensions/token-gate/src/node/`, composed in `theia/applications/browser/`
- Contains: `token-gate-backend-contribution.ts`, `powerbrowser-env.ts`, `parent-watchdog-backend-contribution.ts`, `token-gate-backend-module.ts`
- Depends on: `@theia/core` `BackendApplicationContribution` + `EarlyExpressMiddleware` hooks
- Used by: Chrome shell (spawns it, probes `/powerbrowser/health`)

**Theia frontend (browser):**
- Purpose: Default GUI — tab URIs, branding, customize surface, browser-window command
- Location: `theia/extensions/tab-uris/src/browser/`, `theia/extensions/branding/src/browser/`, `theia/extensions/customize/src/browser/`
- Contains: `ContainerModule` files, `OpenHandler` implementations, `TabUriRegistry`, React widgets (`.tsx`)
- Depends on: `@theia/*@1.74.1` packages (consumed as npm deps, never vendored; `scripts/diff-theia-core.sh` guards this)
- Used by: Shell's `<browser>` element after the swap; future `@powerbrowser/browser-bridge` consumes `TabUriRegistry`'s exported shape

**Patch substrate:**
- Purpose: Minimal hook into upstream build (add `powerbrowser/shell` dir; set identity imply_options); startup-window selection moved out of the patch into `PowerBrowserSingleInstanceHandler`
- Location: `patches/`
- Contains: `010-powerbrowser-identity.patch`, `020-powerbrowser-shell.patch`
- Depends on: `upstream/` at pinned ESR tag
- Used by: `scripts/apply-patches.sh`; surface guarded by `scripts/check-patch-surface.sh`

**Rebrand pipeline:**
- Purpose: `configuration.toml` + `brand/` are the only rebrand inputs; generator output is byte-identical to Phase 1 hand-written files
- Location: `configuration.toml`, `brand/mark.svg`, `scripts/generate.mjs`, `scripts/lib/config-schema.json`, `generated/`
- Contains: Manifest, SVG source, generator, vendored TOML parser (`scripts/lib/toml.cjs`), emitted branding dirs / `.mozconfig` / `.desktop` files
- Depends on: System `inkscape` for icon rasters (GEN-02)
- Used by: Build (`POWERBROWSER_BRANDING`, `MOZ_OBJDIR` variants `dev`/`release`); checked by `generate-check`, `generated-byte-identity`, `branding-dir-agreement`

**Verification harness:**
- Purpose: One driver, one `CHECKS` registry; `--quick` (no build/browser/display) is the commit gate
- Location: `scripts/verify-platform.sh` plus ~20 `scripts/verify-*.mjs` / `verify-*.sh` checkers and `scripts/lib/firefox-bidi.mjs`
- Contains: Shell-lifecycle helpers (`start_shell`, `start_shell_display`), sentinel helpers (`sentinel_present`, `first_byte_offset`), per-check functions, known-open ledger (`--gate` exclusions)
- Depends on: Built binary at `objdir/dist/bin/powerbrowser`, Theia dev app at `http://localhost:3000`, `upstream/` clone for source-comparison checks
- Used by: CI, commit gate, phase verification

## Data Flow

### Primary Request Path

1. OS launches binary → `PowerBrowserSingleInstanceHandler.handle()` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:588`) looks up `powerbrowser:main` window; on initial launch opens `chrome://powerbrowser/content/powerbrowser.xhtml` and sets `preventDefault` (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:494`).
2. `powerbrowser.js` `DOMContentLoaded` writes `POWERBROWSER_SHELL_READY` via `dump()`, wires the deck, seeds `window.gBrowser` + `permanentKey`, fires `notifyStartupFinished` for WebDriver, then calls `TheiaService.start(browserElement)` fire-and-forget with a terminal `.catch(reportUnexpectedFailure)` (`powerbrowser/shell/powerbrowser.js:20`, `:254`, `:266`).
3. `TheiaService.start()` mints `crypto.randomUUID()` token, resolves sidecar (`backendMain` pref + `node` on PATH), derives profile-scoped state-file path, registers `onQuitGranted(stop)`, reaps leftover, enters `_restart()` (`theia` side: `powerbrowser/shell/TheiaService.sys.mjs:147`).
4. `_spawnAndGate(!swapped)` spawns `node <backendMain> --hostname 127.0.0.1 --port <0|pinned>`, writes token on stdin pipe, pumps stdout for `POWERBROWSER_BACKEND_READY {port, pid}`, writes sidecar state file, polls `/powerbrowser/health` (`powerbrowser/shell/TheiaService.sys.mjs:551`).
5. Backend `powerbrowser-env.ts` at module load captures/scrubs `POWERBROWSER_*` and reads the token off stdin; `PowerBrowserTokenGateContribution.initialize()` unshifts the gate ahead of stock middleware and fails closed (exit 78) with no token; `onStart()` asserts loopback bind and announces readiness (`theia/extensions/token-gate/src/node/powerbrowser-env.ts:66`, `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:30`, `:85`).
6. Supervisor mints `POWERBROWSER_TOKEN` session cookie (`SameSite=Lax`, `secure=false` on loopback), calls `window.powerbrowserSwapToUrl(url)` → `loadURIInBrowser` → loading layer hides, `POWERBROWSER_SHELL_SWAP` emitted, steady-state `_healthLoop()` starts (`powerbrowser/shell/TheiaService.sys.mjs:775`, `powerbrowser/shell/powerbrowser.js:72`).

### Supervision / Recovery Loop

1. `_healthLoop()` sleeps `healthIntervalSteadyMs` (default 5000ms), probes once with bounded `healthTimeoutMs`; two consecutive failures trigger `_restart()` (`powerbrowser/shell/TheiaService.sys.mjs:819`).
2. `_restart()` reaps, then retries with exponential backoff (500ms → 5000ms cap) until success or the SHELL-03 split give-up: unrecoverable (bad `backendMain`, unresolvable Node, spawn throw, pinned-port conflict) gives up immediately; recoverable retries until `giveUpAttempts` (default 6) or `giveUpWallclockMs` (default 45000ms) (`powerbrowser/shell/TheiaService.sys.mjs:889`).
3. Give-up paints the error layer via `window.powerbrowserShowError({reason, recoverable})` and starts the slow `_recoveryProbeLoop()` (default 15000ms) that re-enters `_restart()`; success calls `_hideError()` and auto-dismisses (`powerbrowser/shell/TheiaService.sys.mjs:102`, `:1052`).
4. Retry control calls `window.powerbrowserRetry()` → `TheiaService.retry()`, refused unless `_errorRecoverable === true` so unrecoverable screens keep their diagnostics (`powerbrowser/shell/TheiaService.sys.mjs:991`).
5. Quit (`quit-application-granted`) → `stop()` kills backend with `killGraceMs` (default 3000ms), removes state file, detaches observer (`powerbrowser/shell/TheiaService.sys.mjs:272`). SIGKILL path is covered by the backend watchdog (stdin EOF → self-SIGTERM) plus next-launch `_reapLeftover()` with exact `/proc/<pid>/stat` start-tick identity (`theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts:21`, `powerbrowser/shell/TheiaService.sys.mjs:443`).

### Tab-URI Open Path

1. Frontend calls `OpenerService.open('view:explorer-view-container')` → `DefaultOpenerService` enumerates `ContributionProvider<OpenHandler>` → `ViewUriOpenHandler.canHandle()` returns 1000 on scheme (`theia/extensions/tab-uris/src/browser/view-open-handler.ts:58`).
2. `open()` parses the name via `TabUriRegistry.parseName()` (authority-aware, lenient over `scheme:x` / `scheme:/x` / `scheme:///x` / `scheme://x`), resolves the `AbstractViewContribution` from the lazily-built runtime index, delegates to `contribution.openView()` so placement matches the menu path (`theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:50`, `:90`).
3. Reverse direction (`uriOf(widget)`) reads `WidgetManager.getDescription()` — never the shell widget walk — with carve-outs for settings (`settings:`), terminal (`terminal:<name>`), output channels, webviews, and plugin view containers (`theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:123`).
4. Late-bound handlers (e.g. user `customize.js`) use `registerLateOpenHandler()` because `ContributionProvider.getContributions()` caches on first call (`theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:23`).

### GUI-01 Stock-Browser-Window Path

1. User invokes `powerbrowser.open-browser-window` from the palette (`theia/extensions/tab-uris/src/browser/browser-window-command.ts:22`).
2. `window.open(url, '_blank')` from remote web content crosses into chrome: shell carries no `nsIBrowserDOMWindow`, so `nsWindowWatcher` cannot divert into a tab and falls through to `AppWindow::CreateNewContentWindow`, opening stock `BROWSER_CHROME_URL` (`powerbrowser/shell/powerbrowser.js:287` documents the chain).
3. No chrome-side command is registered — that absence is the ratified design. `PowerBrowserAPI.openBrowserWindow()` remains only as the pre-approved JSWindowActor fallback (`powerbrowser/shell/PowerBrowserAPI.sys.mjs:523`).

### Rebrand Generation Path

1. Downstream edits `configuration.toml` (+ `brand/mark.svg`) only.
2. `node scripts/generate.mjs` parses → rejects unknown settings → masks → merges over defaults → validates → emits 33 targets under `generated/` (branding dirs per variant, `.mozconfig`, `.desktop` files, icon rasters).
3. Nothing is written until every check passes; `node scripts/generate.mjs --check` asserts the tree matches the manifest; byte-identity against Phase 1 hand-written files is the acceptance test.

**State Management:**
- Chrome side: all supervisor state is per-launch, in-memory (`_token`, `_port`, `_pid`, `_proc`, `_swapped`, `_healthy`, `_restartCount`, `_errorShown`, `_restartInFlight`, `_failureDetails`, `_log` ring buffer in `TheiaService.sys.mjs`); the single file exception is the crash-recovery state file `~/.config/powerbrowser/sidecar-state-<profileKey>.json` (written per spawn, removed on clean stop).
- Backend side: token held in-memory (`POWERBROWSER_ENV`), never persisted; no session-store dependence by design (see `powerbrowser/INTERNAL-APIS.md` "Deliberately not touched").
- Frontend side: Theia `WidgetManager` dedup keys + `OpenerService` handler priorities; `TabUriRegistry._index` lazily cached after all modules load.

## Key Abstractions

**PowerBrowserAPI (boundary):**
- Purpose: The one file that may touch Firefox internals; thin never-throw wrappers (`getStringPref`, `getIntPref`, `getEnv`, `spawnProcess`, `probeHealth`, `sleep`, `setSessionCookie`, `loadURIInBrowser`, state-file trio, bare-pid signal trio, window trio)
- Examples: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in `powerbrowser/INTERNAL-APIS.md`, guarded by `scripts/check-internals-boundary.sh`
- Pattern: Anti-corruption layer — `TheiaService.sys.mjs` imports nothing else

**TheiaService (supervisor):**
- Purpose: Sidecar process supervision with bounded give-up and self-healing
- Examples: `powerbrowser/shell/TheiaService.sys.mjs`
- Pattern: `_spawnAndGate` returns classified `{ok, recoverable, message, details}`; `_restart` is the single entry for every spawn after resolve; `_showError`/`_hideError` latch the deck; `reportUnexpectedFailure` is the one terminal backstop for all four fire-and-forget promise roots

**TabUriRegistry (bridge contract):**
- Purpose: Bidirectional `factoryId <-> URI` mapping whose exported shape is frozen for the post-4.0 mirror/proxy bridge
- Examples: `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`, `theia/extensions/tab-uris/src/browser/view-factory-table.ts`
- Pattern: Runtime DI discovery (`ContributionProvider<CommandContribution>` filtered to `AbstractViewContribution`) + static coverage table cross-checked at first use; shape asserted by `scripts/verify-registry-shape.mjs`

**Token gate + env handshake:**
- Purpose: Fail-closed auth for a loopback server with file/terminal reach
- Examples: `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`, `theia/extensions/token-gate/src/node/powerbrowser-env.ts`
- Pattern: `EarlyExpressMiddleware.handlers.unshift(gate)` ahead of stock cookie bootstrap; `timingSafeEqual` cookie compare; token via stdin line, never environment (`/proc/<pid>/environ` exposure); `POWERBROWSER_TOKEN_DISABLE=1` dev bypass only for unsupervised runs

**ContainerModule composition:**
- Purpose: Assemble the sidecar from `@theia/*` + `@powerbrowser/*` without forking Theia
- Examples: `theia/extensions/*/src/*// *-frontend-module.ts`, `theia/extensions/token-gate/src/node/token-gate-backend-module.ts`, `theia/applications/browser/package.json`
- Pattern: `bind(X).toSelf().inSingletonScope()` + `bind(Contribution).toService(X)`; overrides via guarded `isBound`/`rebind`; `powerbrowserPrivilegedJs: false` default keeps the privileged surface unbound (`isBound` provably false)

**Sentinel + deck protocol:**
- Purpose: Machine-readable launch/swap/error/diagnostics channel over `dump()` plus a three-layer chrome deck (loading / error / diagnostics)
- Examples: `powerbrowser/shell/powerbrowser.js:20`, `:72`, `:102`, `:163`; `powerbrowser/shell/powerbrowser.xhtml:35`, `:36`, `:43`; `powerbrowser/shell/powerbrowser.css`
- Pattern: Copy contract — user strings live only in `USER_MESSAGE` (`TheiaService.sys.mjs:41`), identifiers live in `getFailureDetails()` rows; both surfaces read the same accessors so render and sentinel can never disagree

## Entry Points

**Shell startup (initial launch):**
- Location: `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`PowerBrowserSingleInstanceHandler`), wired by `powerbrowser/shell/components.conf`
- Triggers: OS process start / second launch against same profile (focus + `preventDefault`)
- Responsibilities: Open `chrome://powerbrowser/content/powerbrowser.xhtml` once; suppress the stock window via `preventDefault`

**Chrome bootstrap:**
- Location: `powerbrowser/shell/powerbrowser.js` (loaded by `powerbrowser/shell/powerbrowser.xhtml`)
- Triggers: `DOMContentLoaded` of the shell document
- Responsibilities: Paint first, emit `POWERBROWSER_SHELL_READY`, expose `window.powerbrowser*` globals, install diagnostics chord (`Ctrl+Alt+Shift+D`), start supervisor

**Backend main:**
- Location: `theia/applications/browser/lib/backend/main.js` (built; source composition in `theia/applications/browser/package.json`)
- Triggers: Spawned by supervisor with `--hostname 127.0.0.1 --port <n>`
- Responsibilities: Load container modules (including `powerbrowser-env.ts` scrub first), run contributions `initialize()` → `configure()` → `start()`/`onStart()`, announce `POWERBROWSER_BACKEND_READY`

**Generator:**
- Location: `scripts/generate.mjs` (`node scripts/generate.mjs [--check|--self-test]`)
- Triggers: Rebrand edit, CI, `verify-platform.sh` `generate-check` row
- Responsibilities: Validate manifest, emit `generated/` tree

**Verification driver:**
- Location: `scripts/verify-platform.sh` (`--quick` | `--only <label>` | `--gate` | full)
- Triggers: Commit gate, phase verification, CI
- Responsibilities: Run the `CHECKS` registry; adding a check means appending one row, never a sibling driver

## Architectural Constraints

- **Threading:** Chrome JS is single-threaded event loop; no `setTimeout` in `sys.mjs` scope — delays go through `PowerBrowserAPI.sleep()` (`Cc["@mozilla.org/timer;1"]` + strong `pendingTimers` reference so GC cannot swallow the timer). Backend is Node single-process; health probes are sequential with bounded timeouts so probes never overlap.
- **Global state:** `TheiaService` module-level singleton fields are per-launch in-memory only (see list above); the only persisted file is the sidecar state file, profile-keyed. No Firefox `SessionStore` dependence. Token lives in memory on both sides, never in prefs, logs, sentinels, or the DOM.
- **Circular imports:** None by construction — the dependency arrow is one-way: `powerbrowser.js` → `PowerBrowserAPI` + `TheiaService` → `PowerBrowserAPI`; `TheiaService` imports nothing else (boundary-guard enforced). Theia side: `customize` optionally reads `TabUriRegistry` via `isBound`-guarded `get`, never a hard import cycle.
- **No Theia core edits:** `@theia/*` consumed as pinned npm deps (`1.74.1`); `scripts/diff-theia-core.sh` fails on vendoring. Overrides are `rebind` in `@powerbrowser/*` modules only.
- **No space in checkout path:** `pkgs.mkShell` appends an rpath to space-separated `NIX_LDFLAGS`; dev shells (`nix develop .#firefox`, `nix develop .#theia`) and all builds assume a space-free path.
- **Copy rule:** No internal identifier (pref key, sentinel, port, timeout, raw exception) in user-facing text; every dropped identifier appears as a labelled diagnostics row (`shell-error-copy-no-internals` enforces by pattern).

## Anti-Patterns

### Second boundary file

**What happens:** A new file under `powerbrowser/` imports `Services`, `Cc`/`Ci`, `ChromeUtils.import*`, or calls `fixupAndLoadURIString` / touches `nodePrincipal` directly.
**Why it's wrong:** The audit surface at ESR rebase is exactly one file; a second touchpoint splits it and `INTERNAL-APIS.md` can no longer claim completeness.
**Do this instead:** Add a thin wrapper method on `PowerBrowserAPI` in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogue it in `powerbrowser/INTERNAL-APIS.md`, and call it from the consumer (`scripts/check-internals-boundary.sh` fails otherwise).

### Reading `process.env` for the handshake in token-gate code

**What happens:** A new reader uses `process.env.POWERBROWSER_TOKEN` instead of `POWERBROWSER_ENV`.
**Why it's wrong:** `powerbrowser-env.ts` scrubs those keys at module load, so the read finds nothing — and re-adding the variable re-opens the `/proc/<pid>/environ` + child-inheritance leaks the stdin handoff was built to close.
**Do this instead:** Read `POWERBROWSER_ENV` from `theia/extensions/token-gate/src/node/powerbrowser-env.ts`, which is the captured-then-scrubbed handshake.

### Late `OpenHandler` / `CommandContribution` binding

**What happens:** Binding an `OpenHandler` or palette command after the app's first `OpenerService.open()` / command enumeration.
**Why it's wrong:** `ContributionProvider.getContributions()` caches on first call and drops its container reference — the late binding is permanently invisible (no error, just a URI/command that quietly does nothing).
**Do this instead:** Bind statically at module load like `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:38`; runtime additions go through `registerLateOpenHandler()` in the same file.

### Hand-kept expectation lists in checks

**What happens:** A new `scripts/verify-*.mjs` asserts a copied list of strings (probe names, message texts, file lists).
**Why it's wrong:** The list agrees with the tree it was copied from forever — it goes red on neither additions nor removals.
**Do this instead:** Derive the actual set from the tree at check time and compare as set equality, with a `--self-test` that plants an addition and a removal (see `scripts/verify-registry-shape.mjs`, `scripts/verify-shell-error-copy.mjs`).

## Error Handling

**Strategy:** Classified failures with a user/diagnostics split: every failure path returns `{ok, recoverable, message, details}`; the user sees only a `USER_MESSAGE` sentence ending in a real on-screen affordance (Retry / Details); every dropped identifier becomes a labelled diagnostics row readable through the single `getFailureDetails()` accessor.

**Patterns:**
- Never-throw boundary reads (`getStringPref`/`getIntPref`/`readStateFile`/`getProfileDir` resolve fallbacks, never throw) vs. fail-loud writes (`setSessionCookie` throws on cookie rejection so a dead credential never becomes a silent 403 after the swap).
- Bounded give-up with split rule (`_restart()`): unrecoverable → immediate `_showError(recoverable: false)`, Retry hidden and refused; recoverable → exhaust attempts/wall-clock, then `_showError(recoverable: true)` + background recovery probe.
- One terminal backstop: `reportUnexpectedFailure()` is the single handler for all four fire-and-forget promise roots (start call, Retry call, `_healthLoop`, `_recoveryProbeLoop`); it paints `couldNotStart` (recoverable) with the rejection text in the rows — a slow-but-succeeding start can never trip it.

## Cross-Cutting Concerns

**Logging:** Dual channel — `PowerBrowserAPI.log()` mirrors to browser console + stdout (`dump()`), and `TheiaService._log` ring buffer (`logBufferLines` pref, default 500) backs `getRecentLog()` for the diagnostics layer. Every message is static/derived-from-config text, never the token.
**Validation:** Manifest validated against `scripts/lib/config-schema.json` (unknown-setting rejection before merge; required-identity check; no writes until green). Prefs read with fallbacks; user.js overrides used by checks to force fast give-up.
**Authentication:** Per-launch token: minted in chrome, delivered over stdin pipe, validated per-request with `timingSafeEqual` against the `POWERBROWSER_TOKEN` cookie; fail-closed (exit 78) when absent; named `POWERBROWSER_TOKEN_DISABLE=1` bypass only for unsupervised dev runs, explicitly cleared (`""`) on every supervised spawn.

---

*Architecture analysis: 2026-09-04*
