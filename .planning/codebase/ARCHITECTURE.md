<!-- refreshed: 2026-09-07 -->
# Architecture

**Analysis Date:** 2026-09-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│  Rebrand inputs (hand-edited by a downstream)                │
│  `configuration.toml`   `brand/mark.svg`                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ node scripts/generate.mjs
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Derived build surfaces — `generated/`                       │
│  .mozconfig, identity.configure, branding/, installer/,      │
│  theia-*.json, endpoint-hosts.json, upstream-pins.env        │
└───────────────────────────┬─────────────────────────────────┘
                            │ compared byte-for-byte against
                            ▼
┌──────────────────┬──────────────────┬───────────────────────┐
│  Gecko patch set │  Chrome shell    │  Theia sidecar        │
│  `patches/`      │  `powerbrowser/  │  `theia/`             │
│  over `upstream/`│   shell/`        │                       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│  Runtime process pair                                        │
│                                                              │
│  Gecko parent process                     Node sidecar       │
│  ┌───────────────────────────────┐        ┌───────────────┐  │
│  │ powerbrowser.xhtml            │ spawn  │ Theia backend │  │
│  │  + powerbrowser.js (bootstrap)│───────▶│ 127.0.0.1:PORT│  │
│  │  + TheiaService.sys.mjs       │◀───────│ ready sentinel│  │
│  │      (supervisor)             │ stdout └───────┬───────┘  │
│  │  + PowerBrowserAPI.sys.mjs    │                │ HTTP/WS  │
│  │      (ONE internals boundary) │                ▼          │
│  └──────────────┬────────────────┘        ┌───────────────┐  │
│                 │ JSWindowActor pair      │ Theia frontend│  │
│                 │ PowerBrowserGroup*      │  in <browser> │  │
│                 └────────────────────────▶│  @powerbrowser│  │
│                   + DOM CustomEvents      │  /* extensions│  │
│                                           └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Profile-local state: `tabs.sqlite` (single chrome writer),  │
│  sidecar-state.json (per-profile), Firefox sessionstore      │
│  (remains the restore authority)                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Rebrand generator | Turns `configuration.toml` + `brand/` into every derived build surface under `generated/` | `scripts/generate.mjs` |
| Brand manifest | The single rebrand input; also the DEFAULTS layer a downstream manifest overlays | `configuration.toml` |
| Gecko patch stack | The only permitted edit to Firefox source; touches exactly `browser/moz.build` and `browser/moz.configure` | `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch` |
| Internals boundary | The **only** file allowed to reach a Firefox internal (`Services.*`, `Cc/Ci/Cr/Cu`, `AppConstants`, XPCOM) | `powerbrowser/shell/PowerBrowserAPI.sys.mjs` |
| Boundary catalogue | One row per internals touchpoint, derived from the guard script, not hand-kept beside it | `powerbrowser/INTERNAL-APIS.md` |
| Sidecar supervisor | Mint token → resolve sidecar → spawn → await ready sentinel → health-gate → set cookie → swap; steady-state health loop, bounded quit, ring-buffer log | `powerbrowser/shell/TheiaService.sys.mjs` |
| Shell bootstrap | Classic (non-module) chrome script for the shell document; emits sentinels, presents the `gBrowser` stand-in, drives the deck | `powerbrowser/shell/powerbrowser.js` |
| Shell document / deck | Loading / error / diagnostics layers over the single content `<browser>` | `powerbrowser/shell/powerbrowser.xhtml`, `powerbrowser/shell/powerbrowser.css` |
| Chrome↔frontend actor (content half) | Zero-privilege relay of `PowerBrowserGroupRequest`/`Response` DOM events and chrome-pushed web-tab state | `powerbrowser/shell/GroupActorChild.sys.mjs` |
| Single-instance handler | Chooses the startup window (shell) without overriding `BROWSER_CHROME_URL` | `powerbrowser/shell/components.conf` |
| Sidecar prefs | Preprocessed pref file carrying the dev-tree path, node path, timeouts | `powerbrowser/shell/powerbrowser-sidecar.js` |
| Tab/URI registry | `factoryId ↔ URI` registry; its exported shape is the public interface `@powerbrowser/browser-bridge` will consume | `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` |
| Modes / groups / setups | Mode switching, group model, panorama, organising tree, setups persistence | `theia/extensions/modes/src/browser/` |
| Verification driver | The one registry of every check, with `--quick` / `--only` / `--gate` modes | `scripts/verify-platform.sh` |

## Pattern Overview

**Overall:** Patch-set repo + anti-corruption layer + supervised sidecar, with a generator-derived brand layer.

**Key Characteristics:**
- `upstream/` is a fetched, never-hand-edited Gecko checkout; all Gecko change lives in `patches/` and is regenerated, never text-edited.
- Exactly one anti-corruption layer to Firefox internals; every other chrome file is a consumer of it.
- Theia is consumed as versioned npm dependencies (all `@theia/*` pinned to `1.74.1` in `theia/package.json` `resolutions`); additions are separate `@powerbrowser/*` extensions.
- Branding is a hand-written literal layer (`powerbrowser/branding/`) plus a generated layer (`generated/branding/`), kept byte-identical as the rebrand acceptance test.
- Checks derive their expectations from the tree at check time and compare as set equality, rather than keeping a hand-maintained list.

## Layers

**Brand/config layer:**
- Purpose: turn one manifest into every derived build surface
- Location: `configuration.toml`, `brand/`, `scripts/generate.mjs`, `generated/`
- Contains: TOML manifest, SVG mark, the generator, generated `.mozconfig` / `identity.configure` / branding / installer / Theia JSON fragments
- Depends on: `scripts/lib/toml.cjs`, `scripts/lib/config-schema.json`
- Used by: the Gecko build (`--with-branding=powerbrowser/branding-generated/<variant>`), the Theia application package, endpoint and pin checks

**Gecko patch layer:**
- Purpose: the minimum change to Firefox needed to register the shell package and the identity
- Location: `patches/`, applied to `upstream/`
- Contains: two patches touching `browser/moz.build` and `browser/moz.configure` only
- Depends on: the pinned ESR tag fetched by `scripts/fetch-upstream.sh`
- Used by: `scripts/apply-patches.sh`, `scripts/rebase-upstream.sh`, `scripts/check-patch-surface.sh`

**Chrome shell layer (privileged, parent process):**
- Purpose: open the shell window, supervise the sidecar, own all privileged state
- Location: `powerbrowser/shell/`
- Contains: `PowerBrowserAPI.sys.mjs` (2592 lines, the boundary), `TheiaService.sys.mjs` (1407 lines, the supervisor), the bootstrap, document, CSS, actor child, `moz.build`/`jar.mn` packaging
- Depends on: Gecko modules, reached only through `PowerBrowserAPI`
- Used by: the shell document and, indirectly, the Theia frontend via the actor pair

**Theia extension layer (unprivileged web content):**
- Purpose: the default GUI
- Location: `theia/extensions/*/src/{browser,node,common}/`
- Contains: eight `@powerbrowser/*` extensions — `branding`, `token-gate`, `tab-uris`, `customize`, `telemetry`, `modes`, `chrome-bar`, `backend-opencode`
- Depends on: `@theia/*` npm packages and Inversify DI; never Theia core sources
- Used by: `theia/applications/browser` (the composed app)

**Verification layer:**
- Purpose: one driver, one registry of checks across all tiers
- Location: `scripts/verify-platform.sh` plus ~60 `scripts/verify-*.mjs|sh` check implementations
- Used by: the commit gate, `scripts/rebase-upstream.sh`, `.github/workflows/`

## Data Flow

### Startup path

1. Single-instance handler selects the shell window (`powerbrowser/shell/components.conf`).
2. `powerbrowser.xhtml` loads; `powerbrowser.js` fires on `DOMContentLoaded` and dumps `POWERBROWSER_SHELL_READY` before any backend work.
3. The bootstrap installs the `window.gBrowser` stand-in (`tabs`, `permanentKey`) so WebDriver can address the shell's single browser (`powerbrowser/shell/powerbrowser.js`).
4. `TheiaService.start()` resolves the Node executable and backend entry from prefs, spawns the sidecar on port 0, and hands the token over **stdin**, never the environment.
5. The supervisor waits for the backend ready sentinel, then a passing health probe (`powerbrowser/shell/TheiaService.sys.mjs`).
6. `PowerBrowserAPI.setSessionCookie()` mints the per-launch `POWERBROWSER_TOKEN` session cookie (`SameSite=Lax`, `SCHEME_HTTP`).
7. The `<browser>` swaps from `chrome://powerbrowser/content/powerbrowser.xhtml` to `http://127.0.0.1:PORT/`; the deck's three layers go hidden and `POWERBROWSER_DECK_STATE` is dumped.
8. Steady state: health loop with pinned-port restart and backoff; on `quit-application-granted` a bounded shutdown signals and awaits the backend.

### Frontend → chrome path (groups, web tabs)

1. Theia frontend (unprivileged content) dispatches a `PowerBrowserGroupRequest` DOM event carrying `{ requestId, msg }` (`theia/extensions/modes/src/browser/group-actor-client.ts`).
2. `PowerBrowserGroupChild` forwards it as `PowerBrowserGroupMutation` to the parent actor (`powerbrowser/shell/GroupActorChild.sys.mjs`).
3. The parent acts through `PowerBrowserAPI` and replies; the child re-dispatches `PowerBrowserGroupResponse`, correlated by `requestId` with a 5s ack timeout and a contracted save-error bar.
4. Reverse direction: chrome pushes `PowerBrowserWebTabState` (URL, title, loading, back/forward, focus request) into the content window as a DOM event of the same name.

### Tab persistence path

1. `PowerBrowserAPI.startTabStoreTriggers()` enumerates stock `navigator:browser` windows and observes `browser-delayed-startup-finished` for late windows.
2. TabOpen/TabClose/TabSelect/TabAttrModified drive `writeTabRow` / `removeTabRow` against profile-relative `tabs.sqlite`; private windows are filtered at the single writer.
3. `sessionstore-state-write-complete` runs a bounded reconciliation sweep. Sessionstore remains authoritative for restore — the store rebuilds from it, never the reverse.

**State Management:**
- Supervisor state is per-launch, in-memory only; nothing in `TheiaService` writes a file except the profile-scoped `sidecar-state.json` for leftover reaping.
- Frontend state lives in Theia's own DI-scoped services under `theia/extensions/*/src/browser/`.

## Key Abstractions

**`PowerBrowserAPI` (the boundary):**
- Purpose: the single anti-corruption layer over Firefox internals
- File: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in `powerbrowser/INTERNAL-APIS.md`
- Pattern: flat namespace object of small wrapper methods; every internal reached from one lazy-getter block

**`TabUriRegistry`:**
- Purpose: `factoryId ↔ URI` mapping; the bridge's future public interface
- File: `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`
- Pattern: runtime discovery over the `AbstractViewContribution` contribution provider; `view-factory-table.ts` is a coverage contract cross-checked against the discovery, never the lookup itself
- Shape asserted by: `scripts/verify-registry-shape.mjs`

**`USER_MESSAGE` copy table:**
- Purpose: the only strings that may reach `#powerbrowser-error-message`
- File: `powerbrowser/shell/TheiaService.sys.mjs`
- Pattern: table is the check surface — `scripts/verify-shell-error-copy.mjs` derives it from the file and compares declared vs referenced key sets

**Theia extension module:**
- Purpose: composition unit
- Files: `theia/extensions/*/src/browser/*-frontend-module.ts`, `src/node/*-backend-module.ts`
- Pattern: Inversify `ContainerModule` binding contributions; no Theia core edits

## Entry Points

**Gecko shell window:**
- Location: `powerbrowser/shell/powerbrowser.xhtml` → `powerbrowser/shell/powerbrowser.js`
- Triggers: application startup via the single-instance handler
- Responsibilities: paint, emit sentinels, start the supervisor

**Stock browser window (GUI-01):**
- Location: opened by `window.open(url, '_blank')` from `theia/extensions/tab-uris/src/browser/browser-window-command.ts`
- Triggers: a Theia frontend command; no chrome-side command is registered, and that absence is the ratified design
- Responsibilities: opens stock upstream `BROWSER_CHROME_URL`

**Theia application:**
- Location: `theia/applications/browser/package.json` (`yarn build` → `build:extensions` then the app)
- Triggers: spawned by `TheiaService`, or standalone on :4000 for debugging
- Responsibilities: serves frontend and backend over loopback HTTP/WS behind the token gate

**Rebrand generator:**
- Location: `scripts/generate.mjs`
- Triggers: `node scripts/generate.mjs` after editing `configuration.toml` or `brand/`
- Responsibilities: writes `generated/` atomically — nothing is written until every check passes

**Verification driver:**
- Location: `scripts/verify-platform.sh` (~5000 lines, one `CHECKS` registry in `run_own_checks`)
- Triggers: commit gate (`--quick`), rebase workflow, full runs

## Architectural Constraints

- **Process model:** two processes — the Gecko parent (plus content processes) and one Node sidecar. Privileged work is parent-only; the actor child carries zero privileged reach and loads only in documents matching the Theia local origin.
- **Internals boundary:** a second file importing a Firefox internal is the failure the design exists to prevent; enforced by `scripts/check-internals-boundary.sh` (`--self-test`, `--catalogue`).
- **Theia core:** never forked or patched; enforced by `scripts/diff-theia-core.sh`. Upstream is adopted by re-pinning versions in `theia/package.json` `resolutions`.
- **Patch surface:** patches touch only `browser/moz.build` and `browser/moz.configure`; `scripts/check-patch-surface.sh` guards this, and patches are regenerated rather than edited (a hand-edited hunk silently no-ops).
- **Repo path:** must contain no space character — `NIX_LDFLAGS` is space-separated and a space breaks every native link step.
- **Brand tokens:** `inventory/brand-tokens.json` is the only file that may name the originating product; `scripts/scan-brand-residue.mjs` must exit 0 over `git ls-files`.
- **No generator shortcuts in the hand-written branding layer:** every Phase-1 branding value is a literal so `generated/` can be proven byte-identical to it.

## Anti-Patterns

### Editing `upstream/` directly

**What happens:** a fix is applied in the Gecko checkout instead of the patch stack.
**Why it's wrong:** `git -C upstream diff` staying empty is the invariant; the change is lost on the next `scripts/fetch-upstream.sh` and never reaches a downstream.
**Do this instead:** patch the tree, then regenerate the patch into `patches/` and re-run `scripts/check-patch-surface.sh`.

### Text-editing a patch hunk

**What happens:** a hunk body is edited by hand without recomputing blob hashes.
**Why it's wrong:** the three-way merge degrades into a **silent no-op** — the patch appears to apply and changes nothing.
**Do this instead:** regenerate from a patched tree; `scripts/apply-patches.sh --self-test` guards the mechanism.

### A second file reaching a Firefox internal

**What happens:** a new chrome module imports `Services` or `Ci` directly because it needs one call.
**Why it's wrong:** it destroys the single-boundary property the whole design rests on and fails `scripts/check-internals-boundary.sh`.
**Do this instead:** add a method to `powerbrowser/shell/PowerBrowserAPI.sys.mjs` and a row to `powerbrowser/INTERNAL-APIS.md`.

### Creating a sibling verification driver

**What happens:** a new `verify-phase-NN.sh` is added beside `verify-platform.sh`.
**Why it's wrong:** the per-phase drivers were deleted precisely to end this; four registries drifted apart.
**Do this instead:** append one row to the `CHECKS` registry in `scripts/verify-platform.sh`.

### Hand-keeping an expectation list

**What happens:** a check compares the tree against a list copied from that same tree.
**Why it's wrong:** it can only ever agree with itself and never goes red on drift.
**Do this instead:** derive the expectation at check time and compare as set equality, as `scripts/verify-registry-shape.mjs` and `scripts/verify-shell-error-copy.mjs` do; add a `--self-test` that plants faults.

### Asserting on the absence of a log line you emit

**What happens:** a check asserts a sentinel never appears, where the sentinel is the check's own instrumentation.
**Why it's wrong:** such an assertion can never go red.
**Do this instead:** prove the line is emitted by the code under test, with a positive control.

### Leaking an internal identifier into user copy

**What happens:** a pref key, port, timeout, sentinel name, or raw exception text reaches `#powerbrowser-error-message`.
**Why it's wrong:** it violates the copywriting contract in `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md`; `shell-error-copy-no-internals` enforces this by pattern.
**Do this instead:** use a `USER_MESSAGE` table value and carry every dropped identifier as a labelled diagnostics row via `getFailureDetails()`.

### Welding Theia to full-window presentation

**What happens:** frontend code assumes it owns the whole window.
**Why it's wrong:** the mirror/proxy bridge (`@powerbrowser/browser-bridge`, GUI-04) must stay landable without rework.
**Do this instead:** keep tab identity in `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`, whose exported shape is asserted.

## Error Handling

**Strategy:** classify failures at the supervisor, collapse them onto a small user-facing copy table, and keep every dropped identifier in a parallel diagnostics structure.

**Patterns:**
- `TheiaService._showError(USER_MESSAGE.X, details)` — one sentence, one real on-screen next step (Retry or Details).
- `getFailureDetails()` returns `[label, value]` rows; the diagnostics layer and the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel read the same source, so a rendered row is an announced row.
- `_fatal()` keeps full diagnostic text in the log, which is what `scripts/verify-platform.sh` matches on.
- `PowerBrowserAPI` getters (`getStringPref`, `getIntPref`, `getEnv`, `getProfileDir`) never throw; they return the caller's fallback.
- Unrecoverable classes (missing pref, unresolvable Node) are first-launch give-up cases and are never retried from the restart path.

## Cross-Cutting Concerns

**Logging:** `dump()` sentinels on stdout from chrome (`POWERBROWSER_SHELL_READY`, `POWERBROWSER_DECK_STATE`, `POWERBROWSER_BACKEND_READY`, `POWERBROWSER_SHELL_ERROR`, `POWERBROWSER_ERROR_DIAGNOSTICS`), plus a bounded in-memory ring buffer exposed by `TheiaService.getRecentLog()`. Frontend telemetry is opt-in and off by default (`theia/extensions/telemetry/`).

**Validation:** manifest values are schema-checked in `scripts/lib/config-schema.json`; network hosts are allowlisted in `powerbrowser/endpoint-allowlist.json`; SQL statements bind parameters, never interpolate.

**Authentication:** a per-launch `POWERBROWSER_TOKEN` gates every backend HTTP route and the WS upgrade. It is handed to the sidecar over stdin (never the environment, which `/proc/<pid>/environ` would expose) and reaches the frontend as a `SameSite=Lax` session cookie. Enforced backend-side by `theia/extensions/token-gate/src/node/`.

---

*Architecture analysis: 2026-09-07*
