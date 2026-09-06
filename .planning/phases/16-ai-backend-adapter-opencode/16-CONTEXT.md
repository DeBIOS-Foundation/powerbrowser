# Phase 16: AI backend adapter - OpenCode - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning
**Mode:** auto (all gray areas auto-selected, recommended defaults)

<domain>
## Phase Boundary

A selectable `@OpenCode` backend inside the Theia sidecar chat, with staged
Change Set review and per-session permission presets. Requirements are
locked by SPEC.md — this context covers implementation decisions only.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**6 requirements are locked.** See `16-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `16-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):** `@OpenCode` ChatAgent + ACP lifecycle backend
(chassis-shaped for later backends, opencode-bound this phase); staged
Change Set review (per-file accept/reject + diff) and gated/auto-accept
presets with mandatory history + revert; MCP bridge config + docs
(slice 0); shared-services use + per-adapter ownership doc;
`configuration.toml` selection wiring.
**Out of scope (from SPEC.md):** Pi and DSH adapters; per-line
comment-to-steer, `/btw`, Supercomplete Tab-accept; browser visual
verification; sandbox-button constrained backend (separate spike track);
any Theia core fork or Gecko change.

</spec_lock>

<decisions>
## Implementation Decisions

### ACP transport binding
- **D-01:** Backend is a stdio-spawned `opencode acp` child owned by the
  Theia backend contribution (spawn, workspace handoff, restart, death
  with parent) — **Reversibility:** costly — switching to HTTP
  serve-attach later reworks lifecycle, auth, and session mapping.
  [auto] Recommended: matches the Claude-adapter lifecycle pattern,
  no network/auth surface, supervised death.
- **D-02:** HTTP `serve`-attach kept as documented fallback only, not
  the primary path. [auto]

### Change Set emission path
- **D-03:** Prefer intercept-then-record via ACP permission/tool hooks
  if the protocol exposes them; else apply-then-record with immediate
  history write. Researcher verifies which hooks `opencode acp`
  1.18.25 offers before planner commits. [auto]
- **D-04:** Stale-hunk conflict check lives at accept time in the
  Theia side (compare staged hunk against live file; refuse + preserve
  on mismatch), never in the backend. [auto]

### Preset UX surface
- **D-05:** Gated/auto-accept toggle is per-session in the chat header
  area; default preset is gated. [auto] Recommended: session scope
  matches SPEC R3 and the safety posture (dangerous runs never inherit
  another session's auto-accept).
- **D-06:** History + revert UI reuses the existing Change Set +
  session-history surfaces; no bespoke history widget this phase. [auto]

### Slice-0 bridge auth
- **D-07:** Bridge config uses the loopback `/mcp` URL with auth via
  the supervisor-issued token path; the token is never hardcoded in
  checked-in config (powerbrowser-env scrub precedent applies).
  Researcher verifies the child-process accommodation with
  token-gate before planner commits. [auto]

### Claude's Discretion
All of the above were auto-selected in automatic mode; the user reviews
decisions in this file. Researcher and planner own verification of the
two flagged unknowns (ACP hooks, token-gate child accommodation).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked spec + goal
- `.planning/phases/16-ai-backend-adapter-opencode/16-SPEC.md` — Locked requirements — MUST read before planning
- `.planning/notes/ai-backends-goal.md` — Phase goal + explore decisions (opencode-first, Option A, general-audience safety)
- `.planning/research/ai-review-ux-and-backend-adapters.md` — Antigravity behavior brief + Theia capability inventory + snap-in contract
- `.planning/REQUIREMENTS.md` (AI-01..AI-05) — Candidate requirements this phase implements

### Codebase anchors
- `theia/extensions/tab-uris` — Packaging precedent (theiaExtensions frontend/backend modules, one dependency line, resolutions pin)
- `theia/extensions/token-gate/src/node/` — Token-gate + parent watchdog; constrains bridge auth (D-07) and child supervision (D-01)
- `theia/applications/browser/package.json` — Composed AI stack (ai-chat, ai-core, ai-mcp, ai-openai, ai-anthropic, ai-terminal); dependency line lands here
- `powerbrowser/shell/` (TheiaService.sys.mjs) — Supervisor spawn environment; POWERBROWSER_SUPERVISED inheritance hazard for nested backends

### External (verify at research time, do not bake in)
- Upstream `@theia/ai-claude-code` adapter (PR eclipse-theia/theia#16273) — structural template for the wrapper; not vendored
- `opencode acp` (v1.18.25, on PATH) — transport under test for D-01/D-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tab-uris` extension skeleton: build scripts (`tsc -b`), module registration shape, `better-sqlite3` precedent for backend deps.
- `token-gate` backend contribution: fail-closed gate + stdin-token + env-scrub patterns to mirror for child supervision.
- `chrome-bar` contribution (Phase 13): command + widget + CSS-layer pattern if preset toggle needs a toolbar home later (D-05 stays chat-header this phase).

### Established Patterns
- Never fork Theia core (`scripts/diff-theia-core.sh` gate); `@powerbrowser/*` extensions composed into the sidecar.
- `yarn build:extensions` builds all sidecar extensions; resolutions pinned in `theia/package.json`.
- Autonomous nonstop default (STATE.md): verify→defer+continue; halt only on 3-retry-exhausted blocker.

### Integration Points
- ChatAgent registry (`bind(ChatAgent).toService(...)`) — frontend registration point.
- Theia `/mcp` endpoint — slice-0 consumption point.
- Change Set store + session history — review/history surfaces (D-06).
- `configuration.toml` + generator — backend selection wiring (SPEC R4).

</code>

<specifics>
## Specific Ideas

- "I want it like Claude Code in VSC": auto-accept preset + post-hoc review from history (D-05/D-06).
- Chassis-first: per-backend delta is command/args/flag-mapping/prompt-appendix only (SPEC Background).

</specifics>

<deferred>
## Deferred Ideas

- Pi adapter (transport unverified) — future phase behind Pi-transport research.
- DSH adapter — future phase.
- Sandbox-button constrained backend — separate spike track (idea key `sandbox-button`, other session).
- Per-line comment-to-steer, `/btw`, Supercomplete — later review-UI scope.

</deferred>

---

*Phase: 16-ai-backend-adapter-opencode*
*Context gathered: 2026-09-06*
