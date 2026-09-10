---
title: PBA plugin shipping design — Deep Sea Harness as a .vsix over a Power Browser plugin API
date: 2026-09-10
context: gsd-explore on shipping Deep Sea Harness (DSH), the engine of the Power Browser Assistant (PBA), as an independently versioned .vsix wired into Theia's native chat
---

# Decisions (2026-09-10)

- **PBA is a brand name over DSH.** DSH is the engine; PBA is the agent id and display
  name the picker shows, sourced from the rebrand inputs like every other product string.
- **DSH replaces opencode.** Phase 16's `@OpenCode` adapter is retired, not extended.
  Carried assets: the token gate, the `/mcp` endpoint, the Change Set staging logic.
- **The .vsix is the shipping unit for DSH.** It is the one artifact that installs
  unchanged into VS Code, VSCodium, any Theia-based IDE, and Power Browser, which is what
  "agnostic, everything as a plugin" means in practice. Its version is decoupled from
  Power Browser's.
- **Power Browser extends what a .vsix can do, without forking Theia.** A
  `@powerbrowser/plugin-api` Theia extension publishes a `powerbrowser` namespace into the
  plugin host through Theia's own `ExtPluginApiProvider` / `MainPluginApiProvider`
  contribution points. Hard rule 1 holds.
- **DSH keeps its own native UI and also drives Theia's native chat.** ("native ip" in
  the discussion read as native UI.) Theia's chat, Change Sets, and agent picker are the
  only GUI through the first milestone; a custom GUI is postponed.
- **The store is a self-hosted Open VSX.** The `[[extensions]]` pin keeps a baseline
  shipping with every Power Browser release regardless.
- **Phase 16 is expendable.** Its chassis was built for sibling adapters; the plugin
  route supersedes that shape.
- **AI-04 is restated.** From "a backend snaps in as Theia extensions only" to
  "backends are plugins over the Power Browser plugin API".

# The five processes

| Process | Owns | Changes for PBA |
|---|---|---|
| Firefox chrome process | browser internals via `PowerBrowserAPI.sys.mjs`; supervises the sidecar; sole SQL writer | browser-action tools become new catalogued touchpoints |
| Theia backend (Node) | token gate, `/mcp` endpoint, plugin deployment, spawns the plugin host | nothing DSH-specific |
| Theia frontend (shell window) | chat UI, Change Sets, agent picker, MCP manager | gains `@powerbrowser/plugin-api` (main side) and the citation renderer |
| Plugin host (Node child of the backend) | runs the PBA .vsix like any VS Code extension | the .vsix spawns and owns the DSH process |
| DSH process | agent loop, providers, skills, MCP clients, own UI | never touched by Power Browser |

# Power Browser's two stable pieces

1. **`@powerbrowser/plugin-api`** — a generic AI-backend plugin API, not a DSH API. DSH is
   its first consumer; opencode as a plain .vsix would be the proof it is agnostic.
   Namespace surface:
   - `chat.registerAgent(descriptor, handler)` — wraps the handler in a Theia `ChatAgent`
     whose `invoke` proxies over the plugin RPC and streams text, tool-call, progress, and
     citation chunks into the request model. Same pattern as Theia's own `lm-main` /
     `lm-ext` pair.
   - `chat.proposeEdit(session, edit)` — stages a file edit as a Change Set entry so
     accept/reject stay in Theia's UI. Phase 16's changeset emitter logic moves here.
   - `mcp.endpoint()` — the live URL and cookie for Power Browser's MCP server. Replaces
     environment variables: the plugin host's environment is scrubbed by the token gate.
   - `host.version`, `host.productName` — feature detection and branding.
   - The namespace is typed and versioned as a published d.ts package; the markdown
     reference is derived from it with a verify row.
2. **The MCP endpoint** — today read-only workspace reads
   (`theia/extensions/backend-opencode/src/node/opencode-mcp-contribution.ts`); becomes a
   versioned tool catalogue (below).

# The PBA .vsix

Contains: the DSH runtime or a launcher for it, bundled skills, bundled MCP definitions,
a host shim, optionally DSH's own webview panel. On activation the shim checks for the
`powerbrowser` namespace. Present: register into native chat, fetch the MCP endpoint.
Absent: stock `vscode.chat` where the host implements it, else the own panel. A button
opens DSH's native UI as an in-Theia web tab (Phase 14.1's GUI-02) when that UI is served
over HTTP; a terminal UI opens in Theia's terminal instead.

# Structured content with provenance

Hover-to-sources needs: DSH emits citations as data per span (not per answer), Theia
renders hover cards, a click opens the tab. Theia has no built-in citation content type;
the plugin API defines one, and a Power Browser extension ships the renderer through the
`ChatResponsePartRenderer` contribution. Citations key on the TabUriRegistry URI plus the
SQL row, never on raw URLs, so a source reopens the exact tab or snapshot and the store
can record which sources fed which answer. This is the one hard requirement PBA places on
DSH's design.

# Tool catalogue

Every tool names its provider from day one:

| Provider | Examples | Path |
|---|---|---|
| sidecar | workspace list, file read, file write | Theia backend, exists read-only today |
| chrome | open tab, navigate, read page, make group, add to group | via `PowerBrowserAPI.sys.mjs`; each is a catalogued touchpoint |
| browser memory | tab and group queries | the readonly reader in `theia/extensions/tab-uris/src/node/tab-query-service.ts` |
| plugin | anything a .vsix registers | stock `languageModelTools` / `mcpServerDefinitionProviders`; DSH calls them with `vscode.lm.invokeTool` |
| app-tab (reserved) | tools an app tab declares | convention decided when the first app tab exists |

Permission model: Theia's per-tool confirmation preferences extend Phase 16's presets to
browser actions. Page content returned by tools carries an explicit untrusted marker;
DSH treats it as data. Reserve the server name `powerbrowser`.

# State tiers (why updates cannot clobber the user)

| Tier | Where | Touched by an update |
|---|---|---|
| bundled | inside the .vsix | replaced |
| user | DSH's own config dir; `~/.config/powerbrowser` (settings.json, prompt-templates/, agents/, skill dirs) | never |
| workspace | the project | never |

Plugin-registered MCP servers are held in memory (`autostart: false`, lazy resolve), never
written to settings. The plugin never writes into DSH's config; Power Browser's servers are
handed over per session, as Phase 16 does for opencode.

# Verified mechanisms (Theia 1.74.1, in this tree)

- `vscode.chat.createChatParticipant` is `@stubbed` and `vscode.lm.registerLanguageModelChatProvider` returns `Disposable.NULL` — a .vsix cannot reach Theia's chat by itself: `theia/node_modules/@theia/plugin-ext/lib/plugin/plugin-context.js:1026` and `:1059`.
- `lm.registerMcpServerDefinitionProvider` → `MCPServerManager.addOrUpdateServer` (in memory): `theia/node_modules/@theia/plugin-ext/lib/main/browser/lm-main.js`.
- `lm.registerTool` / `lm.invokeTool` → `ToolInvocationRegistry`: `theia/node_modules/@theia/plugin-ext/lib/main/browser/lm-tool-main.js`.
- Contribution points a .vsix has: `mcpServerDefinitionProviders`, `languageModelTools`; none for skills or prompt templates: `theia/node_modules/@theia/plugin-ext/lib/common/plugin-protocol.d.ts:98`.
- `ExtPluginApiProvider` / `MainPluginApiProvider.initialize(rpc, container)`: `theia/node_modules/@theia/plugin-ext/lib/common/plugin-ext-api-contribution.d.ts`.
- Runtime registration: `ChatAgentService.registerChatAgent`, `AgentService.registerAgent`, `LanguageModelRegistry.addLanguageModels`.
- `ChatResponsePartRenderer` contribution: `theia/node_modules/@theia/ai-chat-ui/lib/browser/chat-response-part-renderer.d.ts`.
- Theia skills: `SKILL.md`, tiers workspace/configured/default: `theia/node_modules/@theia/ai-core/lib/common/skill.d.ts`.
- Config dir: `THEIA_CONFIG_DIR=~/.config/powerbrowser` (`theia/applications/browser/package.json` start script).
- Registry client defaults to open-vsx.org, supports `targetPlatform`; no update/outdated affordance found in `@theia/vsx-registry` (grep, not docs).
- `[[extensions]]` build-time pin, sha256-gated: `docs/REBRANDING.md:325`, `scripts/verify-extension-pins.mjs`.
- `[ai] backend` selector: `configuration.toml:115`.

# Unresolved ledger (never to be smoothed into prose)

- DSH transport and location — unanswered twice; binary over ACP, own protocol, or Node package/HTTP. Decides the launcher and the edit-staging hook.
- VS Code API version Theia 1.74.1 accepts — could not read it from the tree.
- How the plugin host obtains the MCP credential under the env-scrubbing rules — design says via `mcp.endpoint()`; unbuilt.
- Whether a Theia plugin can install its own update — unverified.
- What a self-hosted Open VSX needs to run — unverified.

# Rejected

- Re-pinning Theia to a version that bridges VS Code chat participants natively: unverified, and would still lack Change Sets and the MCP handoff.
- The sidecar spawning DSH (Phase 16's shape): host-specific, versions with Power Browser.
- DSH as a toolbox for Theia's native agents only: inverts the harness. Kept as coexistence instead: DSH is an agent in the picker and also exposes tools to Coder and Architect.
