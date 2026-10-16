# Phase 16: AI backend adapter (OpenCode) — Research

**Researched:** 2026-09-06 · **Domain:** Theia AI adapters / ACP / MCP bridge / extension packaging · **Confidence:** MEDIUM-HIGH

## Summary

Intercept-then-record is possible: `opencode acp` forwards its internal permission asks to the ACP client via `session/request_permission` and, for `edit`, delegates the actual file write to the client's `writeTextFile` capability. The adapter therefore stages Change Sets instead of letting opencode write disk. Upstream `@theia/ai-claude-code` (PR #16273, merged 2025-09-26, milestone 1.65.0) is the structural template to clone file-by-file, substituting ACP stdio for Claude CLI stdio. Two premises in SPEC/CONTEXT are wrong and the planner must adjust: (1) no `/mcp` server endpoint exists anywhere in Theia 1.74.1 or upstream master — slice-0 must build it; (2) no supervisor-issued token path exists for grandchildren by design — the token lives only in backend memory and the adapter backend must bridge it to the opencode child itself.

**Primary recommendation:** Clone `ai-claude-code`'s frontend-agent + backend-service split; speak ACP via `@agentclientprotocol/sdk`; implement `requestPermission` + `writeTextFile` on the client side for the gated preset; spawn the child from the Theia backend with a scrubbed env; build a minimal `/mcp` StreamableHTTP contribution for R5.

## Q1 — `opencode acp` permission / tool-approval hooks

**Verdict: INTERCEPT POSSIBLE. Plan intercept-then-record (D-03, first option).**

`opencode acp --help` (installed 1.18.25 [VERIFIED: `opencode acp --help`, `opencode --version`]) exposes only transport flags (`--port/--hostname/--mdns/--cors/--cwd/--pure/--log-level`); there are no permission flags on the command itself. All approval behavior comes from the ACP protocol plus opencode config:

- ACP `session/request_permission` is an agent→client JSON-RPC request sent BEFORE the tool executes; the client replies `selected {optionId}` or `cancelled` [CITED: https://agentclientprotocol.com/protocol/v1/tool-calls]. Clients MAY auto-allow/deny per user settings — this is the gated/auto-accept preset hook.
- opencode's ACP layer forwards every internal `permission.asked` event to `connection.requestPermission()` with options once/always/reject, and FAILS CLOSED (replies `reject`) if the client lacks the capability or the call errors [CITED: https://github.com/anomalyco/opencode/blob/2a33addd/packages/opencode/src/acp/permission.ts].
- For `edit` specifically: after approval opencode computes the patched content and calls the client's `writeTextFile({sessionId, path, content})` with the unified diff already applied; the permission request itself carries a `diff`-type ToolCallContent (`oldText`/`newText`) [CITED: same file]. A Theia client that implements `writeTextFile` therefore receives every file write as data and can stage it into a Change Set instead of touching disk. A client that does NOT implement it gets opencode writing disk itself (apply-then-record fallback).
- Which tools ask is driven by opencode `permission` config (`"*": "ask"`, per-tool `edit`/`bash`/`read`/…, granular object syntax, `external_directory` defaults to `ask`) [CITED: https://opencode.ai/docs/permissions/]. Ship the adapter with a generated config setting `edit: ask` (gated) and document the auto-accept flip; defaults are otherwise permissive (`allow`).
- `session/new` accepts `{cwd, mcpServers}` and `session/set_config_option` sets the model per session [CITED: anomalyco/opencode issue #31964 repro transcript]. That issue also reports permission replies are silently dropped after `session/load` with a DIFFERENT cwd (hangs the turn). Consequence: map 1 Theia chat session → 1 ACP session created at the workspace root; never `load` elsewhere.
- Client capability advertisement happens in `initialize` (`clientCapabilities.fs.readTextFile/writeTextFile`, `terminal`) [ASSUMED — standard ACP shape, confirm against `@agentclientprotocol/sdk@1.4.0` types at plan time; version verified on npm registry].

Open unknowns: the `permission.ts` source was read from a GitHub mirror (`anomalyco/opencode`), not pinned to 1.18.25 — empirically probe the installed binary (stdio `initialize`→`session/new`→prompt-with-`edit:ask`, auto-reply, observe `request_permission` + `writeTextFile`) before planner commits to exact payload shapes. Whether opencode core double-writes after `writeTextFile` delegation (reply `once` lets core proceed) needs the same probe — plan idempotent accept handling regardless.

## Q2 — Upstream `@theia/ai-claude-code` structure to clone

Upstream: PR eclipse-theia/theia#16273, merged 2025-09-26 into master, milestone 1.65.0; "no direct dependency to Claude Code, expects it installed; tracks file modifications via Claude Code hooks + Theia Change Set; asks user for permission if not granted via settings" [CITED: https://github.com/eclipse-theia/theia/pull/16273]. Package `packages/ai-claude-code` is NOT in this tree's 1.74.1 (`theia/node_modules/@theia/` has no `ai-claude-code`) [VERIFIED: `ls theia/node_modules/@theia/`] — clone by reading upstream, do not add a dependency.

Exact file/class map (all paths under `packages/ai-claude-code/src/`, verified via GitHub API + raw source grep) [CITED: https://api.github.com/repos/eclipse-theia/theia/contents/packages/ai-claude-code/src/{browser,common,node}]:

| File | Class / symbol | Clone as |
|---|---|---|
| `common/claude-code-service.ts` | `ClaudeCodeService` (`send/cancel/handleApprovalResponse`), `ClaudeCodeClient` (`sendToken/sendError`), `CLAUDE_CODE_SERVICE_PATH='/services/claude-code'`, `ToolApprovalRequest/ResponseMessage` | ACP service interface: `send(prompt)/cancel/handlePermissionResponse`; JSON-RPC path `/services/opencode` |
| `node/claude-code-service-impl.ts` | `ClaudeCodeServiceImpl`: spawns CLI (`--output-format stream-json --verbose --append-system-prompt`), `pendingApprovals: Map`, `requestToolApproval()` → forwards to client, `ensureFileBackupHook`/`ensureStopHook` writing `.claude/hooks/*.js` | ACP child lifecycle: spawn `opencode acp --cwd`, per-session ACP sessions, permission-queue map; SKIP the `.claude` hooks — ACP `writeTextFile` replaces them |
| `node/claude-code-backend-module.ts` | `ConnectionHandler` + `ConnectionContainerModule` wiring service↔client | Same shape for the opencode backend connection |
| `browser/claude-code-chat-agent.ts` | `ClaudeCodeChatAgent implements ChatAgent`, `CLAUDE_CHAT_AGENT_ID='ClaudeCode'`, session/token/approval state keys, `systemPromptAppendixTemplate` | `OpenCodeChatAgent`, id `OpenCode`, same state-key pattern |
| `browser/claude-code-frontend-module.ts` | Binds `Agent`+`ChatAgent` `toService`, `PreferenceContribution` schema, `ClaudeCodeFrontendService`/`ClaudeCodeClientImpl`, `FileEditBackupService`, `ClaudeCodeEditToolService`, per-tool `ChatResponsePartRenderer`s, slash-commands + command contributions | Same module shape; renderers map to opencode tools (edit/write/patch, bash, read, grep, glob); backup service replaced by Change Set staging |
| `common/claude-code-preferences.ts` | `ai-features.claudeCode.executablePath`, `apiKey` prefs | `ai-features.opencode.executablePath` (+ permission-preset pref lives in chat session state per D-05, not here) |
| `browser/renderers/` + `claude-code-tool-call-content.ts`, `claude-code-edit-tool-service.ts`, `claude-code-file-edit-backup-service.ts` | Per-tool UI renderers; edit application + backup | Renderer per opencode tool kind (`toToolKind` analogue); edit application = Change Set entry creation |

Do NOT clone into Theia registries per R6: CLI-owned tools/models stay opencode-side (permission config + `session/set_config_option`), shared side is ChatService/variables/skills only. Adaptation delta vs Claude adapter: transport is ACP JSON-RPC over stdio (use `@agentclientprotocol/sdk`, npm `1.4.0` [VERIFIED: `npm view`]) instead of Claude CLI stream-json; session continuity is ACP `sessionId` (stable cwd, never reload elsewhere); Change Set emission is `writeTextFile` interception, not post-hoc hook backup.

## Q3 — MCP bridge + token-gate child path

**Verdict A (auth): NO supervisor-issued token path exists for grandchildren — by explicit design. The adapter backend must bridge the token itself.**
**Verdict B (endpoint): NO `/mcp` server endpoint exists — SPEC R5's premise is false; slice-0 must BUILD it.**

Token facts [VERIFIED: `theia/extensions/token-gate/src/node/powerbrowser-env.ts`, `token-gate-backend-contribution.ts`, `powerbrowser/shell/TheiaService.sys.mjs:166,590-700,815-835`]:

- Supervisor mints `this._token = crypto.randomUUID()` per browser launch, writes it as one stdin line per backend spawn (`writeStdinLine`), and mints the `POWERBROWSER_TOKEN` session cookie for the browser frame. Same token across respawns.
- Backend captures ALL `POWERBROWSER_*` keys at module load and deletes them from `process.env`; the gate fails closed (exit 78) without the stdin token and rejects every non-cookie request with 403 via front-inserted early middleware — which covers ALL routes including any future `/mcp`.
- `_spawnAndGate` deliberately puts NO secret in the spawn environment (`/proc/<pid>/environ` is same-uid readable; comments forbid adding `POWERBROWSER_*` keys "expecting a grandchild to read it"). A spawned `opencode acp` child therefore inherits NO token.
- Approved bridge (satisfies D-07, no hardcoding): the adapter's backend contribution already holds the token in memory (`POWERBROWSER_ENV`). At opencode-spawn time it writes a private opencode config (or env) for THAT child only, using opencode's `{env:VAR}` interpolation — e.g. remote MCP `{type:"remote", url:"http://127.0.0.1:<port>/mcp", headers:{Authorization:"Bearer {env:POWERBROWSER_MCP_TOKEN}"}, oauth:false}` [CITED: https://opencode.ai/docs/mcp-servers/ remote+headers+`{env:}` sections]. Checked-in config contains only the URL + `{env:…}` reference; the value is injected per-spawn and never committed (powerbrowser-env scrub precedent applies).
- Alternative with zero token-on-disk: pass `mcpServers` per-session in ACP `session/new` (protocol supports it) — still needs the endpoint from Verdict B and per-request auth headers; planner's choice.
- Mandatory hygiene: scrub `POWERBROWSER_SUPERVISED` (and any re-added secrets) from the opencode child's env — inheriting it arms the parent-watchdog in nested backends spawned from opencode terminals and they self-terminate on stdin EOF [VERIFIED: `parent-watchdog-backend-contribution.ts:26-37`, `powerbrowser-env.ts:7-22`]. Mirror the capture-and-delete pattern.

Endpoint facts: no `StreamableHTTPServerTransport`/`SSEServerTransport` anywhere under `theia/node_modules/@theia/` [VERIFIED: grep]; upstream master `packages/ai-mcp/src/node/` contains only client files (`mcp-server-manager-impl.ts`, `mcp-server.ts`, oauth) — no server contribution [VERIFIED: GitHub API listing]; "Theia as MCP server" is an open discussion (#15606), not a feature [CITED: https://github.com/eclipse-theia/theia/discussions/15606]. R5 acceptance ("MCP workspace read returns live sidecar state") therefore requires a NEW `BackendApplicationContribution` in `backend-opencode` mounting an MCP StreamableHTTP server on `/mcp` (gated for free by the early middleware), exposing workspace-context tools. That is the slice-0 build, not a config-only hookup — re-scope R5 accordingly.

## Q4 — `tab-uris` packaging pattern for `backend-opencode`

Verified against `theia/extensions/tab-uris/package.json`, `tsconfig.json`, `src/node/tab-query-backend-module.ts`, `theia/package.json`, `theia/applications/browser/package.json` [VERIFIED: all read this session]. Exact requirements:

1. **New dir `theia/extensions/backend-opencode/`** with `package.json`: `private:true`, `name:"@powerbrowser/backend-opencode"`, `version:"0.1.0"`; `dependencies` on each used `@theia/*` pinned exactly `1.74.1` (+ runtime deps, e.g. `@agentclientprotocol/sdk`, following the `better-sqlite3: 13.0.3` backend-dep precedent) [VERIFIED: tab-uris package.json:1-16].
2. **`theiaExtensions` rows**: `[{"frontend":"lib/browser/<name>-frontend-module"},{"backend":"lib/node/<name>-backend-module"}]` — frontend-only or backend-only rows allowed (token-gate is backend-only) [VERIFIED: tab-uris:17-24]. ContainerModule shape: singleton binding + `toService`, no app-file edits [VERIFIED: `tab-query-backend-module.ts`].
3. **`files:["lib","src"]`, scripts `clean: rm -rf lib *.tsbuildinfo`, `build: tsc -b`**; copy `tsconfig.json` verbatim (composite, `rootDir src`, `outDir lib`, ES2017/commonjs, decorators) [VERIFIED: tab-uris tsconfig.json].
4. **`theia/package.json`**: `workspaces` already covers `extensions/*` (no edit). `resolutions` needs NO new row unless the adapter uses a `@theia/*` package outside the pinned set — every `@theia/*` dep in the extension must have an exact-`1.74.1` resolutions row or yarn hoists duplicates [VERIFIED: theia/package.json:7-54]. Append to `scripts.build:extensions`: `&& yarn --cwd extensions/backend-opencode build` [VERIFIED: theia/package.json:61].
5. **Browser app**: one line `"@powerbrowser/backend-opencode": "0.1.0"` in `theia/applications/browser/package.json` dependencies (alphabetical among `@powerbrowser/*`) [VERIFIED: browser package.json:38-44].
6. **Selection wiring**: `configuration.toml` currently has NO `[ai]`/backend keys (only `[product]/[identity]/[legal]/[theia]`) [VERIFIED: grep + head]. Planner must add a backend-selection key plus `scripts/generate.mjs` support — this is new generator work, not a one-line toggle.
7. Chassis shape (per CONTEXT chassis-first): put transport-generic code (ACP lifecycle, Change Set staging, preset state) in `@powerbrowser/backend-opencode` structured so Pi/DSH later add sibling extensions with command/args/flag-mapping deltas only.

## Open unknowns (planner must resolve)

1. Installed-binary behavior: probe `opencode acp` 1.18.25 over stdio (`initialize`→`session/new`→prompt with `edit:"ask"`) to confirm `request_permission` + `writeTextFile` payload shapes and rule out core double-write; mirror sources are unpinned to the binary.
2. Upstream provenance: fetched opencode docs/source link to `anomalyco/opencode`, not the canonical `sst/opencode` — confirm which repo the 1.18.25 binary was built from before citing internals as locked.
3. `/mcp` tool surface: which workspace-context tools slice-0 exposes (file read? diagnostics? tasks?) — needs a product decision; keep minimal (read-only context) to bound the new attack surface behind the token gate.
4. `verify-platform.sh --quick` + `diff-theia-core.sh` green-path for a NEW extension (resolutions pin, build line, dependency line) — assumed green by pattern [ASSUMED], executor must run the gate.
5. Session-mapping edge cases (R1/R4/R6 backstops in SPEC) remain assumptions per SPEC Edge Coverage — held for plan-phase tests.

## Sources

- Local (HIGH): `theia/extensions/tab-uris/package.json`, `tsconfig.json`, `src/node/tab-query-backend-module.ts`; `theia/extensions/token-gate/src/node/{powerbrowser-env,token-gate-backend-contribution,parent-watchdog-backend-contribution}.ts`; `powerbrowser/shell/TheiaService.sys.mjs`; `theia/package.json`; `theia/applications/browser/package.json`; `configuration.toml`; `opencode acp --help` (v1.18.25).
- Upstream (MEDIUM): eclipse-theia/theia PR #16273; `packages/ai-claude-code/src/{browser,common,node}` file listings + `claude-code-service-impl.ts` key lines; https://agentclientprotocol.com/protocol/v1/tool-calls; https://opencode.ai/docs/{acp,permissions,mcp-servers}/; opencode `acp/permission.ts` + `acp/agent.ts` (mirror); theia discussion #15606; `@agentclientprotocol/sdk@1.4.0` (npm registry).
- Low/assumed: ACP `initialize` capability shape; `verify-platform.sh` green for new extension; slice-0 tool surface.
