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
