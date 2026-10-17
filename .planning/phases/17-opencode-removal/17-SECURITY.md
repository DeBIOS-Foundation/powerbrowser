---
phase: "17"
slug: "opencode-removal"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-10-17"
---

# Phase 17 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry to `theia/yarn.lock` | Lock regeneration may re-resolve entries | Dependency set |
| Agent to ledger | Approvals and check locks are Chris's only | Ledger state |
| Removal sweep to shared code | The tab-uris `/mcp` store endpoint is not OpenCode's | Locked check NG-025/026 |
| Repo to `.gitignore` | Chris's own `opencode.json` must stay ignored | Local CLI permissions |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-17-01 | Tampering | yarn.lock regeneration | medium | mitigate | commit A lock numstat `0 5`; no `@agentclientprotocol`; frozen install on a fresh copy, `cmp` equal | closed |
| T-17-02 | DoS | other session's sidecar on theia/node_modules | medium | mitigate | precondition pgrep check in 17-01 | closed |
| T-17-03 | Tampering | tab-uris `/mcp` endpoint | high | mitigate | `git diff 6096a81 HEAD -- theia/extensions/tab-uris` empty | closed |
| T-17-04 | Elevation | EXPECTED_ENV_TOUCHERS | medium | mitigate | backend-env-readers PASS, 1-entry allowlist equals touchers | closed |
| T-17-05 | Info disclosure | `.gitignore` opencode.json line | low | mitigate | `.gitignore` unchanged since 6096a81 | closed |
| T-17-06 | Tampering | locked `verify-ng-*` checks | high | mitigate | only 051 deleted in B; none changed after B; phase-gate clean | closed |
| T-17-07 | Repudiation | removal before the NG-051 amend | medium | mitigate | c3929e9 is an ancestor of B (02fffb6) | closed |
| T-17-08 | Tampering | downstream manifest with `[ai]` | low | accept | fail-closed unknown-key error names the key | closed |
| T-17-09 | Tampering | stale generated/ai-backend.json | low | mitigate | file absent; `generate --check` 53 PASS | closed |
| T-17-10 | Tampering | history files rewritten | medium | mitigate | banner commit numstat zero deletions; named lines only | closed |
| T-17-11 | Info disclosure | STACK.md opencode.json record | low | mitigate | line present (1 match) | closed |
| T-17-12 | Repudiation | hand-typed baseline | medium | mitigate | R33-derived; `cmp` equal to a measured run; 4 gui08 rows | closed |
| T-17-13 | Tampering | lock at wrong commit / by agent | high | mitigate | blocking-human; Chris ran lock-checks at 02fffb6; phase-gate exits 0 | closed |
| T-17-14 | Tampering | ledger commit sweeping foreign files | medium | mitigate | commit 8092428 holds exactly the three ledger files | closed |
| T-17-SC | Tampering | npm/pip/cargo installs | low | accept | no package added; install only pruned one stanza with `--ignore-scripts` | closed |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-01 | T-17-08 | Rejecting a removed manifest key is the correct contract | plan 17-02 (autonomous run) | 2026-10-17 |
| AR-17-02 | T-17-SC | No dependency added | plans 17-01..04 (autonomous run) | 2026-10-17 |

## Security Audit

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-17 | 15 | 15 | 0 | orchestrator (L1 grep-depth; register authored at plan time, ASVS 1) |

## Sign-Off

- [x] All threats have a disposition
- [x] Accepted risks documented
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set

**Approval:** verified 2026-10-17
