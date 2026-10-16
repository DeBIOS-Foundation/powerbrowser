# Phase 16: AI backend adapter (OpenCode) — Pattern Map

**Mapped:** 2026-09-06 · **Files classified:** 9 · **Analogs found:** 7/9 (2 partial/none)
**Scope:** `theia/extensions/` (tab-uris, chrome-bar, customize, modes, telemetry, token-gate, branding)
**Gate check:** every analog below verified `git ls-files`-tracked (mirror-path rule N/A — no mirrors exist).

## File Classification

| Likely new file | Role | Data flow | Closest analog (tracked) | Match |
|---|---|---|---|---|
| `theia/extensions/backend-opencode/package.json` | config | — | `theia/extensions/tab-uris/package.json` | exact |
| `src/browser/backend-opencode-frontend-module.ts` | module | request-response | `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` | exact |
| `src/browser/opencode-chat-agent.ts` | service (ChatAgent) | streaming/req-resp | `theia/node_modules/@theia/ai-chat/lib/common/chat-agents.d.ts` (upstream, untracked) + `tab-uris/.../browser-window-command.ts` idiom | partial |
| `src/browser/opencode-preset-contribution.ts` | command | request-response | `theia/extensions/modes/src/browser/modes-commands.ts` | role-match |
| `src/node/backend-opencode-backend-module.ts` | module | request-response | `theia/extensions/token-gate/src/node/token-gate-backend-module.ts` | exact |
| `src/node/opencode-acp-supervisor.ts` | service (child lifecycle) | event-driven | `theia/extensions/token-gate/src/node/parent-watchdog-backend-contribution.ts` + `powerbrowser-env.ts` | role-match |
| `src/node/opencode-changeset-emitter.ts` | service | transform | `theia/extensions/chrome-bar/src/node/chrome-bar-suggestion-service-impl.ts` | partial |
| `opencode.mcp.json` + bridge doc | config/docs | — | none in-tree (see § No Analog) | none |
| `configuration.toml` wiring + ownership doc | config/docs | — | `scripts/generate.mjs` + `customize/.../customize-frontend-module.ts` (D-62) | role-match |

## Pattern Assignments

### 1. `package.json` — copy `theia/extensions/tab-uris/package.json`
- **Copy:** `"private": true`, `"theiaExtensions": [{frontend: lib/browser/...}, {backend: lib/node/...}]`, `"files": ["lib","src"]`, scripts `"clean": "rm -rf lib *.tsbuildinfo"`, `"build": "tsc -b"`.
- **Deps:** pin `@theia/*` to `1.74.1` exactly (resolutions block in `theia/package.json` holds); add backend dep only if needed (tab-uris precedent: `better-sqlite3: 13.0.3`).
- **Differ:** name `@powerbrowser/backend-opencode`; needs `@theia/ai-chat: 1.74.1` + `@theia/ai-core: 1.74.1` frontend deps (no existing ext depends on them — new ground, keep the two lines adjacent).
- **Compose:** one dependency line in `theia/applications/browser/package.json` beside the other `@powerbrowser/*` lines; one clause in root `theia/package.json` `build:extensions`; never edit app source files.

### 2. Frontend module — copy `chrome-bar/.../chrome-bar-frontend-module.ts` (lines 14–33)
- **Copy:** `export default new ContainerModule(bind => {...})`; `bind(X).toSelf().inSingletonScope()` + `bind(Contribution).toService(X)` pairs; `WebSocketConnectionProvider.createProxy` + `toDynamicValue` for the backend proxy (lines 23–25).
- **Also read:** `tab-uris/.../tab-uris-frontend-module.ts` lines 90–92 — static binds at module load (D-50: late-bound contributions are permanently invisible). ChatAgent + preset commands bind here, never lazily.
- **Differ:** bind `ChatAgent` token via `bind(ChatAgent).toService(OpencodeChatAgent)` (registry point per CONTEXT.md); keep the chat-header preset toggle out of this file (see §4).

### 3. `opencode-chat-agent.ts` (ChatAgent class) — PARTIAL analog
- **No in-tree ChatAgent implementation exists** (SPEC-verified: no `ai-claude-code`, no ACP package in tree). Interface source is upstream `theia/node_modules/@theia/ai-chat/lib/common/chat-agents.d.ts` — read-only reference, never an analog to copy-tree from (hard rule 1).
- **Copy class idiom** from `tab-uris/.../browser-window-command.ts` lines 57–64: `@injectable()` class, constructor/property injection, named `export const ..._COMMAND_ID` for every id.
- **Differ:** everything transport-shaped comes from upstream `@theia/ai-claude-code` PR #16273 (structural template only, not vendored) + RESEARCH.md ACP notes; session-id ↔ Theia chat-session mapping is new logic with no precedent.
- **Must-NOT:** file contents route only to the session's selected backend; no tokens/credentials into history (SPEC prohibitions — fail-closed tests TBD at plan time).

### 4. Preset toggle — copy `modes/.../modes-commands.ts` + `chrome-bar/.../chrome-bar-commands.ts`
- **Copy:** command-per-action model, each id a named export (`MODES_ACTIVATE_COMMAND_ID` pattern, modes-commands lines 17–30) so verify scripts import the const; labelless `Command` for palette-invisible toggles (`CHROME_BAR_FOCUS_ADDRESS`, chrome-bar-commands lines 44–46).
- **Differ:** default preset is **gated** (D-05); toggle is per-session in the chat header area, never persisted across sessions; auto-accept enabled only by explicit per-session user action (SPEC prohibition — default-preset assertion test required).
- **Future home:** `chrome-bar` widget pattern if a toolbar home is ever needed — not this phase (D-05 stays chat-header).

### 5. Backend module — copy `token-gate/.../token-gate-backend-module.ts` (whole file, 12 lines)
- **Copy:** one `ContainerModule`; per-contribution `bind(X).toSelf().inSingletonScope()` + `bind(BackendApplicationContribution).toService(X)` (lines 7–11).
- **If frontend needs RPC:** add the `chrome-bar-backend-module.ts` JSON-RPC shape (lines 18–24): `bind(ConnectionHandler).toDynamicValue(ctx => new JsonRpcConnectionHandler(PATH, () => ctx.container.get(Impl)))` over the existing authenticated websocket — no new transport, no HTTP route, no token-gate re-review.
- **Differ:** binds the ACP supervisor contribution (see §6); no `EarlyExpressMiddleware` unless the bridge needs an HTTP route (avoid — prefer existing `/mcp` endpoint).

### 6. ACP supervisor — copy `parent-watchdog-backend-contribution.ts` + `powerbrowser-env.ts`
- **Copy lifecycle:** `implements BackendApplicationContribution`, `initialize()` as earliest hook; die-with-parent via stdin EOF → re-signal SIGTERM (watchdog lines 39–54), armed ONLY when `POWERBROWSER_SUPERVISED=1`.
- **Copy env hygiene:** read everything via `POWERBROWSER_ENV` (`powerbrowser-env.ts` line 133), never `process.env`; module-load capture-and-scrub of `POWERBROWSER_*` beats `EnvVariablesServerImpl`'s constructor snapshot (lines 40–59).
- **Differ (load-bearing):** supervisor SPAWNS `opencode acp` stdio child (D-01: spawn, workspace handoff, restart, death-with-parent). Nested-backend hazard: scrubbed env must not re-arm a watchdog in grandchildren; supervisor token for `/mcp` bridge auth via the stdin-pipe path, never hardcoded in checked-in config (D-07).
- **Must-NOT:** never write outside workspace root (negative test required); fail-closed startup if token/supervision handshake missing (token-gate lines 51–65 precedent: `process.exit(78)` before listen).

### 7. Change Set emitter — PARTIAL analog (`chrome-bar-suggestion-service-impl.ts` backend-impl shape)
- **Copy:** `@injectable()` backend service class delegating over the established channel; stale-hunk check lives THEIA-side at accept time (D-04: compare staged hunk vs live file; refuse + preserve on mismatch) — never in the backend.
- **Differ:** Change Set store/session-history APIs have no in-tree writer precedent — researcher verifies `@theia/ai-chat` 1.74.1 Change Set surface before planner commits (D-03 intercept-then-record vs apply-then-record hinges on `opencode acp` 1.18.25 hooks). Ordering rules: staging order = backend emission order; latest proposal supersedes (marked, never merged); history append order = apply order; zero-edit answers create no entry.
- **Reuse:** existing Change Set + session-history surfaces for history + revert UI — no bespoke widget (D-06).

## Shared Patterns

### Module registration (all new modules)
Static `ContainerModule` binds at load; `toSelf().inSingletonScope()` + `toService(contributionToken)`; guarded `isBound`/`rebind` only when overriding upstream (tab-uris-frontend-module lines 51–65). Source: `chrome-bar-frontend-module.ts`, `token-gate-backend-module.ts`.

### Command contribution (all commands)
`@injectable() implements CommandContribution`, `registerCommands()` with `execute`/`isEnabled`/`isVisible`; named `*_COMMAND_ID` consts; cross-extension reuse by importing the const, never re-spelling (chrome-bar-commands line 4). Source: `chrome-bar-commands.ts` lines 64–106, `modes-commands.ts`.

### Backend contribution (all backend lifecycle)
`implements BackendApplicationContribution`; `initialize()` (pre-listen) → `configure(app)` (routes, already gated) → `onStart(server)` (loopback assert + readiness). Fail-closed with `process.exit(78)` + stderr reason, never silent pass-through. Source: `token-gate-backend-contribution.ts` lines 30–123.

### `configuration.toml` selection wiring
Generator owns derivation: edit `configuration.toml` → `node scripts/generate.mjs` → generated fragment (never hand-edit generated output). Consume via `FrontendApplicationConfigProvider.get()['key']` inside the module callback with a plain `if` so the binding is skipped entirely when off — the D-62 `powerbrowserPrivilegedJs` precedent in `customize-frontend-module.ts`. Missing key = off, never on.

## Build / Test Commands

```sh
nix develop .#theia          # Node/yarn shell — yarn runs ONLY here
yarn build                   # root theia build: build:extensions (tsc -b per ext) + browser app rebuild
scripts/verify-platform.sh --quick          # commit gate: seconds, no build/browser/display
scripts/verify-platform.sh --only <label>   # sample exactly one check per task
```

New checks follow the registry rule: **append one row** to `verify-platform.sh`, never a sibling driver; every check needs a `--self-test` planting faults that go red naming the drift; derive expectations from the tree, never hand-kept lists or absence-of-log-line assertions (CLAUDE.md Verification).

## Hard-Rule Gates

- `scripts/diff-theia-core.sh` stays green — `@powerbrowser/*` extensions composed in, upstream re-pinned never edited (add the new ext's pin to `verify-extension-pins.mjs` scope if applicable).
- `scripts/check-internals-boundary.sh` — no new Firefox-internal touchpoint; supervisor spawn env flows through the existing `PowerBrowserAPI`/TheiaService boundary.
- `node scripts/scan-brand-residue.mjs` must exit 0 — **stage new files first** (`git ls-files` scope hides unstaged files); originating-product token namable only in `inventory/brand-tokens.json`.
- No core fork, no Gecko change, no new HTTP auth surface beyond the existing gated channel (SPEC R4/out-of-scope).

## No Analog Found

| Need | Role | Why none |
|---|---|---|
| `opencode.mcp.json` bridge config + docs | config/docs | No ext ships MCP-server-consumption config; Theia `/mcp` is consumed, not configured, in-tree. Planner uses RESEARCH.md slice-0 notes; nearest doc-shape precedent is `docs/URI-SCHEMES.md` + `powerbrowser/INTERNAL-APIS.md` catalogue style. |
| Per-adapter CLI-owned tools/models doc | docs | No per-adapter doc exists (first adapter). Follow `docs/*.md` plain-language style; user-facing strings obey the no-internal-identifiers rule (CLAUDE.md), identifiers go in the diagnostics layer. |
| ChatAgent impl + Change Set writer | service | First non-native backend; upstream PR #16273 is template-only. |

## Metadata

**Analog search scope:** `theia/extensions/{tab-uris,chrome-bar,customize,modes,telemetry,token-gate,branding}/src`, `theia/applications/browser/package.json`, `theia/package.json`, `scripts/` · **Files read:** 14 · **Extraction date:** 2026-09-06
