# Phase 16: AI backend adapter - OpenCode — Specification

**Created:** 2026-09-06
**Ambiguity score:** 0.19 (gate: ≤ 0.20)
**Requirements:** 6 locked

## Goal

A user of the PowerBrowser Theia sidecar can select `@OpenCode` in chat and complete a code-change task through a staged accept/reject gate, where today no non-native backend exists in the sidecar at all.

## Background

The sidecar composes the full Theia 1.74.1 AI stack (ai-chat, ai-core,
ai-mcp, ai-openai, ai-anthropic, ai-terminal, Change Sets, context
variables) but ships no third-party backend adapter — the tree has no
`ai-claude-code` and no ACP package (verified in
`theia/node_modules/@theia/`). Installed `opencode` 1.18.25 exposes
`opencode acp` (ACP server) and `opencode serve` (own API/ACP, no
OpenAI-compatible endpoint), so the adapter transport is ACP stdio, not
a config-only OpenAI hookup. Theia exposes an MCP server (`/mcp`) the
backend can consume for workspace context. Packaging precedent is
`theia/extensions/tab-uris`. Goal note:
`.planning/notes/ai-backends-goal.md`; requirements AI-01..AI-05 in
REQUIREMENTS.md; behavior brief:
`.planning/research/ai-review-ux-and-backend-adapters.md`.

## Requirements

1. **Selectable chat agent**: User can select `@OpenCode` in Theia
   chat and exchange messages with the opencode backend over ACP
   stdio, with session continuity across prompts.
   - Current: No `@OpenCode` agent exists; only native Theia agents.
   - Target: `@OpenCode` registered as a ChatAgent; prompts route to
     a supervised `opencode acp` child; replies render in chat;
     session id maps to the Theia chat session.
   - Acceptance: Three sequential prompts in one chat session reach
     the same backend session (continuity observable); a new chat
     session starts a new backend session.

2. **Gated staged review**: File edits proposed by the backend appear
   as a staged Change Set with per-file accept/reject and diff view;
   nothing is written to disk until accepted under the gated preset.
   - Current: No backend proposals exist, so no staging path.
   - Target: Each proposal lands as Change Set entries grouped
     per file with diff view; Accept writes, Reject drops.
   - Acceptance: Propose-then-accept writes exact backend content;
     propose-then-reject leaves the file byte-identical; zero-edit
     answers create no Change Set entry.

3. **Auto-accept preset with mandatory history**: Auto-accept preset
   applies backend edits immediately while recording full Change Set
   history with per-file diffs and revert.
   - Current: No presets exist.
   - Target: Per-session gated/auto-accept preset; history records
     every applied edit with diff + revert under both presets.
   - Acceptance: Under auto-accept, an edit lands on disk without a
     click AND appears in history with a working revert; under
     gated, nothing lands without accept.

4. **Extension-only packaging**: Backend ships as Theia extensions
   only (frontend ChatAgent registration + backend ACP child-process
   lifecycle), no Theia core edits, packaged per the tab-uris
   pattern, selectable via `configuration.toml`.
   - Current: No backend extension exists.
   - Target: New `theia/extensions/backend-opencode` (+ shared
     chassis shaped for later backends); one dependency line in the
     browser app; `scripts/diff-theia-core.sh` stays green.
   - Acceptance: `verify-platform.sh --quick` green including the
     no-core-edit check; backend on/off via `configuration.toml`.

5. **MCP bridge (slice 0)**: The sidecar exposes a minimal MCP
   endpoint and opencode consumes it as one of its configured MCP
   servers to read workspace context. (Research 2026-09-06 refuted
   the config-only premise: no `/mcp` endpoint exists in 1.74.1, so
   this requirement BUILDS the endpoint, scoped to workspace-context
   reads.)
   - Current: No MCP endpoint in the sidecar; no bridge config.
   - Target: Minimal sidecar MCP endpoint (workspace-context reads)
     + checked-in opencode config consuming it.
   - Acceptance: From opencode, an MCP workspace-context read
     returns live sidecar state; reads are point-in-time (no
     snapshot guarantee).

6. **Shared services boundary**: Chat sessions, context variables,
   and the skills pool are shared with the adapter; CLI-owned tools
   and models are documented per adapter, not forced into Theia
   registries.
   - Current: Nothing shared because no adapter exists.
   - Target: Adapter uses shared ChatService/variables/skills;
     per-adapter doc lists which tools/models stay CLI-owned.
   - Acceptance: `#`-variables and skills resolve inside
     `@OpenCode` chats; the doc exists and names every CLI-owned
     tool.

## Boundaries

**In scope:**
- `@OpenCode` ChatAgent + ACP lifecycle backend (chassis-shaped for
  later backends, opencode-bound this phase)
- Staged Change Set review (per-file accept/reject + diff) and
  gated/auto-accept presets with mandatory history + revert
- MCP bridge config + docs (slice 0)
- Shared-services use + per-adapter ownership doc
- `configuration.toml` selection wiring

**Out of scope:**
- Pi and DSH adapters — later phases (Pi transport unverified)
- Per-line comment-to-steer, `/btw` ephemeral questions,
  Supercomplete Tab-accept — later review-UI scope
- Browser visual verification (screenshots/recordings) — later scope
- Sandbox-button constrained backend — separate spike track
  (idea key `sandbox-button`, other session)
- Any Theia core fork or Gecko change — hard rules forbid it

## Constraints

- No edits to Theia core (`scripts/diff-theia-core.sh` must stay
  green); upstream Theia adopted by re-pinning only.
- ACP stdio is the transport; no OpenAI-compatibility assumption
  about `opencode serve`.
- Theia 1.74.1 pins in `theia/package.json` resolutions hold.
- Repo must stay at a space-free path (existing hard rule).

## Acceptance Criteria

- [ ] `@OpenCode` appears in the chat agent picker and answers a
  prompt (R1)
- [ ] Backend session continuity across 3 prompts; new chat starts
  a new backend session (R1)
- [ ] Staged proposal shows per-file diff; accept writes exact
  content; reject leaves file byte-identical (R2)
- [ ] Zero-edit answer creates no Change Set entry (R2)
- [ ] Auto-accept writes without click AND records revertible
  history; gated writes nothing without accept (R3)
- [ ] Overlapping proposals to one hunk: latest supersedes, old
  marked superseded, never silently merged (R2 edge)
- [ ] Multi-file staging order matches backend emission order (R2 edge)
- [ ] Accept of a stale staged hunk after an external editor edit is
  refused with a conflict message; proposal preserved (R2 edge)
- [ ] History append order equals apply order (R3 edge)
- [ ] No core edits; quick gate green; backend toggled via
  `configuration.toml` (R4)
- [ ] MCP workspace read returns live sidecar state (R5)
- [ ] `#`-variables and skills resolve in `@OpenCode` chats;
  CLI-owned tools doc exists (R6)

## Edge Coverage

**Coverage:** 9/12 applicable edges resolved · 3 unresolved

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| adjacency | R2 | ✅ covered | Latest-wins supersede, marked, never merged |
| empty | R2 | ✅ covered | No entry for zero-edit answers |
| ordering | R2 | ✅ covered | Emission order is staging order |
| concurrency | R2 | ✅ covered | Stale-hunk accept refused w/ conflict, proposal kept |
| adjacency | R3 | ✅ covered | Ordered append, no merge |
| empty | R3 | ✅ covered | No entry for zero-edit answers |
| ordering | R3 | ✅ covered | History order equals apply order |
| concurrency | R3 | 🧪 backstop | Revert under concurrent user edits — held-out edge test for plan-phase |
| concurrency | R5 | 🧪 backstop | Concurrent read/write never crashes; point-in-time reads |
| unclassified | R1 | ⚠ UNRESOLVED | Probe manual-review nudge — planner treats session-mapping edge cases as assumption |
| unclassified | R4 | ⚠ UNRESOLVED | Probe manual-review nudge — planner treats packaging edge cases as assumption |
| unclassified | R6 | ⚠ UNRESOLVED | Probe manual-review nudge — planner treats sharing edge cases as assumption |

## Prohibitions (must-NOT)

**Coverage:** 4/4 applicable prohibitions resolved · 0 unresolved

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|------------------------|
| MUST NOT write outside the workspace root | R2, R3 | resolved | verification: test (negative write-outside-root test; descriptor TBD at plan time — fail-closed until wired) |
| MUST NOT enable auto-accept except by explicit user action per session | R3 | resolved | verification: test (default-preset assertion; descriptor TBD — fail-closed until wired) |
| MUST NOT route file contents to any provider other than the session's selected backend | R1 | resolved | verification: judgment (routes to judgment review) |
| MUST NOT persist credentials or tokens into chat history or Change Sets | R1, R3 | resolved | verification: test (redaction test; descriptor TBD — fail-closed until wired) |

Canon referrals (not minted here): path-traversal / prototype-pollution /
prompt-injection payload handling are canon — owned by /gsd-secure-phase +
eslint; not minted here.

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                              |
|--------------------|-------|------|--------|------------------------------------|
| Goal Clarity       | 0.85  | 0.75 | ✓      | Selectable backend + staged review |
| Boundary Clarity   | 0.80  | 0.70 | ✓      | Opencode-only, explicit exclusions |
| Constraint Clarity | 0.75  | 0.65 | ✓      | ACP stdio, no core fork            |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | 12 pass/fail criteria              |
| **Ambiguity**      | 0.19  | ≤0.20| ✓      |                                    |

## Interview Log

| Round | Perspective    | Question summary              | Decision locked                     |
|-------|----------------|-------------------------------|-------------------------------------|
| 1     | Researcher     | Attach shape (native vs chassis vs bridge) | (b) chassis-first ACP wrapper — auto-selected: only shape giving full UX + generic future |
| 2     | Simplifier     | Thinnest success slice        | (b) chat + gated edits — auto-selected: chat-only doesn't prove review UX |
| 3     | Boundary Keeper| Opencode-only vs +Pi          | (a) opencode-only — auto-selected: Pi transport unverified |

[auto] All decisions auto-selected with reasoning above. No user rounds (automatic mode).

---

*Phase: 16-ai-backend-adapter-opencode*
*Spec created: 2026-09-06*
*Next step: /gsd-discuss-phase 16 — implementation decisions (how to build what's specified above)*
