# Phase 16: AI backend adapter - OpenCode - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-06
**Phase:** 16-ai-backend-adapter-opencode
**Areas discussed:** ACP transport binding, Change Set emission path, Preset UX surface, Slice-0 bridge auth

---

## ACP transport binding

| Option | Description | Selected |
|--------|-------------|----------|
| stdio-spawned `opencode acp` child | Theia backend owns lifecycle; no network/auth surface; supervised death | ✓ |
| HTTP serve-attach | Attach to `opencode serve`; richer API but auth + supervision cost | |

**User's choice:** [auto] stdio-spawned child (recommended default)
**Notes:** Matches Claude-adapter lifecycle pattern. serve-attach kept as documented fallback.

---

## Change Set emission path

| Option | Description | Selected |
|--------|-------------|----------|
| Intercept via ACP hooks | Stage before write; needs protocol hook support | ✓ (preferred, verify first) |
| Apply-then-record | Write then immediately log history; always available | ✓ (fallback) |

**User's choice:** [auto] Prefer intercept, fall back to apply-then-record; researcher verifies hooks on 1.18.25.
**Notes:** Stale-hunk check placed at accept time on the Theia side either way.

---

## Preset UX surface

| Option | Description | Selected |
|--------|-------------|----------|
| Per-session chat-header toggle, default gated | Session scope; dangerous runs never inherit auto-accept | ✓ |
| Global setting | One switch for all sessions | |
| Chrome-bar toggle | Visible everywhere, more build | |

**User's choice:** [auto] Per-session toggle, default gated (recommended default)
**Notes:** Reuses existing Change Set + session-history surfaces; no bespoke history widget.

---

## Slice-0 bridge auth

| Option | Description | Selected |
|--------|-------------|----------|
| Loopback URL + supervisor token path, never hardcoded | Follows powerbrowser-env scrub precedent | ✓ |
| Hardcoded token in config | Simple, leaks credential | |

**User's choice:** [auto] Supervisor token path (recommended default)
**Notes:** Researcher verifies child-process accommodation with token-gate.

---

## Claude's Discretion

All areas auto-resolved in automatic mode per user instruction ("automatic till its done"). Two unknowns flagged for researcher: ACP hook availability, token-gate child accommodation.

## Deferred Ideas

Pi/DSH adapters, per-line steering, `/btw`, Supercomplete, browser verification, sandbox-button — all captured in CONTEXT.md deferred section.
