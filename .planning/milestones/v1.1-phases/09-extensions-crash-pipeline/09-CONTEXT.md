# Phase 09: Extensions + Crash Pipeline - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Downstreams declare npm/local-path extensions and crashes reach their own
collector. Requirements: EXT-02, EXT-03, TEL-04, BLD-02, UPD-04. No GUI work.
Research in `.planning/research/SUMMARY.md` (v1.1 synthesis). Builds on
Phase 08 (installer pipeline, MAR hop gate, BUILD.md procedure).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Locked pre-decisions (milestone scoping + research):
- EXT-02 reuses the EXT-01 chain (one `theiaPlugins`-fragment → copy-over →
  pin-verify path): npm resolves to a pinned URL, local-path packs to hashable
  content. Exact pins + integrity digests, fail-loud.
- EXT-03 via `ExtensionSettings` in the already-emitted
  `distribution/policies.json` (not `distribution/extensions/`); closes the
  STATE.md pending todo (tagged resolves_phase: 9).
- TEL-04: minimal Antenna-protocol collector + crash-ping/report separation +
  PII/retention/throttle policy; native reporter stays compiled out (Phase 08
  locked this; no Breakpad re-enablement, no Socorro, no mini-breakpad-server).
- BLD-02 tier-3 per-fixture builds run over the NEW source kinds on real
  built artifacts. UPD-04 Theia re-pin proof keeps token-gate intact.
- Nonstop autonomous defaults apply (see STATE.md standing instructions);
  plan with `--no-reversibility-gates`.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
