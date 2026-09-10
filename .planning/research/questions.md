# Research questions

## Open

### Q1 (2026-09-05, from tab-SQL explore): per-session restore security model

The explore session leaned toward sessions restoring full live state when young
(~5 min: cookies, credentials, cache intact) and degrading with age, with the
policy itself configurable in SQL. Open before any SQL-01 scoping:

- Does each session get an isolated cookie jar / credential scope, or one
  shared jar with per-session URL sets?
- What is the threat model for a user-queryable, MCP-writable store holding
  session cookies and credentials (encryption at rest, access control on the
  MCP surface, redaction in diagnostics)?
- What does age-based degradation concretely drop at each tier (cookies,
  cache, snapshot, saved page), and who configures the tiers?

## 2026-09-10 — PBA / Deep Sea Harness shipping (from gsd-explore; see notes/pba-plugin-shipping-design.md)

- What is DSH concretely as the sidecar reaches it: a CLI speaking ACP over stdio, a CLI with its own protocol or SDK, or a Node package / HTTP service? Where does it live today? Decides the .vsix launcher and the edit-staging hook. Asked twice, unanswered.
- Which VS Code API version does Theia 1.74.1's plugin host accept? Could not be read from the tree. Caps the PBA .vsix `engines.vscode`.
- How does the plugin host obtain the MCP credential under the token gate's env-scrubbing rules? Design answer is `powerbrowser.mcp.endpoint()`; verify the plugin RPC path carries it without an environment variable.
- Can a Theia plugin install its own update (a self-update prompt from the PBA .vsix)? No update/outdated affordance was found in `@theia/vsx-registry` 1.74.1 by grep; docs not checked.
- What does a self-hosted Open VSX need to run (database, storage, Docker images, publish flow with `ovsx`)? Decided as the store on 2026-09-10; operations unverified.
