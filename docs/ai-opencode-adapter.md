# @OpenCode chat backend

PowerBrowser's sidecar can register an `@OpenCode` entry in the chat
picker, answered by the opencode backend running on your own machine.
This page says what is shared with the sidecar, what stays opencode's
own, and how to turn the backend on or off.

## Turning it on or off

The backend is **off by default**. One manifest edit turns it on:

1. In `configuration.toml`, set the selection key:
   ```toml
   [ai]
   backend = "opencode"
   ```
   (`backend = "off"` registers no backend. A missing key also means
   off -- never on.)
2. Regenerate: `node scripts/generate.mjs`. This writes the derived
   fragment `generated/ai-backend.json`.
3. Copy the fragment's value into the composed app manifest: in
   `theia/applications/browser/package.json`, under
   `theia.frontend.config`, set `"powerbrowserAiBackend"` to the same
   value (`"off"` or `"opencode"`). Never hand-edit anything under
   `generated/` -- it is rewritten on every generate run.
4. Rebuild the sidecar, then check the gate:
   `node scripts/verify-opencode-bridge.mjs`.

To turn it back off, set both values to `"off"` and rebuild. The
`@OpenCode` picker entry and its review toggle disappear entirely when
off -- they are skipped at composition time, not merely hidden.

## Shared side: sessions, variables, skills

These sidecar services work inside `@OpenCode` chats exactly as they do
in native chats -- nothing extra to configure:

- **Chat sessions.** Each chat session keeps its own backend session
  across prompts; starting a new chat starts a new backend session.
- **`#`-variables.** Variables you `#`-mention in a prompt resolve
  before the prompt reaches the backend, so `@OpenCode` sees the
  resolved text like every other participant.
- **Skills pool.** Skills you select for a chat apply to `@OpenCode`
  turns the same way; the backend never keeps a separate skill list.

## CLI-owned side: opencode's tools and models

The tools below stay opencode's own (opencode 1.18.25 built-in set).
They run under opencode's permission rules, are configured in
opencode's own configuration, and are deliberately NOT re-registered
in the sidecar -- the sidecar only stages their proposed file edits
for your accept or reject:

| Tool | What it does |
|------|--------------|
| `bash` | Runs shell commands |
| `edit` | Applies precise edits to existing files |
| `read` | Reads file contents |
| `write` | Writes new files |
| `glob` | Finds files by name pattern |
| `grep` | Searches file contents |
| `task` | Runs a subagent task |
| `todowrite` | Keeps the backend's todo list |
| `webfetch` | Fetches a web page |
| `websearch` | Searches the web |
| `lsp` | Asks the language server about code |
| `skill` | Runs an opencode skill |
| `question` | Asks you a clarifying question |
| `plan_exit` | Leaves plan mode with the plan |
| `apply_patch` | Applies a patch block |

**Model selection stays opencode-side too.** Which model answers an
`@OpenCode` turn is chosen through opencode's own model configuration,
not through any sidecar setting.

**Serve-attach is fallback only.** The supported path is the supervised
one the sidecar spawns itself. Attaching to an already-running
`opencode serve` by hand is documented for recovery use only, not for
daily driving.

## Bridge setup: workspace reads

opencode reads workspace context through the sidecar's read-only
endpoint as one of its configured servers. The checked-in template
`theia/extensions/backend-opencode/opencode.mcp.json` carries the
endpoint address plus two references and no secret value: the port
reference resolves per launch and the token reference resolves per
spawn from the backend's live token, which is injected for that spawn
only and never written into any committed file.

To check the bridge by hand while the sidecar runs (token from your
launch; port from the backend's ready line in its log):

```sh
curl -s http://127.0.0.1:PORT/mcp \
  -H "Cookie: POWERBROWSER_TOKEN=TOKEN"
```

Expect a descriptor naming the two read tools and the live workspace
folder. Without the cookie the same address answers 403. A posted tool
call reads one file:

```sh
curl -s http://127.0.0.1:PORT/mcp \
  -H "Cookie: POWERBROWSER_TOKEN=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"workspace_read","arguments":{"path":"README.md"}}}'
```

Reads are point-in-time: a read racing a write returns whole bytes
from before or after the write, never a mixture, and never an error
beyond what the read itself needs (unknown path, unreadable file).
