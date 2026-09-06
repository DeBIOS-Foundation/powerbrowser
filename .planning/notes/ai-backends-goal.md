---
title: AI backends goal — selectable OpenCode/Pi in Theia review UX
date: 2026-09-06
context: gsd-explore on wiring opencode + pi into PowerBrowser Theia sidecar
---

# AI backends — goal

Recreate Antigravity 1.x's best editor GUI inside Power Browser's Theia
sidecar — see what the LLM just generated, highlight a section and chat
about only that, accept/reject/edit per chunk or line — while letting the
user pick the backend (opencode, Pi, DSH). GUI stays backend-agnostic;
each backend snaps in as a Theia extension.

## Decisions (from explore, 2026-09-06)

- Build on the Theia control plane and APIs as-is (1.74.1 AI stack:
  ai-chat, ai-core, ai-mcp, ai-openai, ai-anthropic, ai-terminal,
  Change Sets, context variables). Never fork Theia core.
- One thin extension per backend + one shared review-UI extension.
  Selection reuses the built-in `@agent`/model picker.
- Transport: `opencode acp` wrapper (config-only OpenAI hookup ruled
  out — `serve` exposes its own API/ACP, not `/v1/chat/completions`).
- Slice 1 done = Option A: chat driving the backend through the
  staged accept/reject gate, with an auto-accept preset available.
  Change Set history is mandatory under both presets (post-approval
  review + revert always possible).
- Order: opencode first (inspectable), Pi second (transport unverified
  — needs Pi-transport research first), DSH third.
- Safety framing is general-audience (any model can go rogue, so can
  the user). Rogue-model containment is sandboxing/VMing and is
  explicitly out of GUI scope; the sandbox-button is a later spike
  (idea key `sandbox-button`), not slice 1.

## Source brief

.planning/research/ai-review-ux-and-backend-adapters.md (2026-09-06).
Gaps vs Antigravity that define build scope: per-line
comment-to-steer loop, `/btw` ephemeral question, file-wide
Supercomplete Tab-accept.
