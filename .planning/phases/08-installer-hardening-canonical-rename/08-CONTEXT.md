# Phase 08: Installer Hardening + Canonical Rename - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Downstreams ship real, self-updating branded installers under the canonical
PowerBrowser name. Requirements: NAME-01, PKG-01, PKG-02, PKG-03, BLD-01,
UPD-03, SEC-02, SHELL-01. No GUI work. Research in
`.planning/research/SUMMARY.md` (v1.1 synthesis).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Locked pre-decisions (milestone scoping 2026-09-04):
- NAME-01 folded into this phase (not standalone): `identity.display_name` →
  `PowerBrowser`, gates re-pinned, propagation proof re-run live.
- Update story: self-hosted MAR updates under fork signing.
- Packaging hosts: Nix-built packaging tried first, agent-driven VMs fallback
  (Windows NSIS likely Nix-buildable on Linux; MSIX + macOS DMG need real hosts/VMs).
- WR-04 + WR-07 pre-fixes land before the first real-host build.
- Crash reporter stays compiled out (TEL-04 is Phase 09; no Breakpad re-enablement here).
- Nonstop autonomous defaults apply (see STATE.md standing instructions).

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
