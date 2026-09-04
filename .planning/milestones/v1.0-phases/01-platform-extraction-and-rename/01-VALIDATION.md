---
phase: 1
slug: platform-extraction-and-rename
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `01-RESEARCH.md` § Validation Architecture. The Per-Task Verification Map
> is filled by `/gsd-validate-phase` once PLAN.md task IDs exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — bash + Node ESM scripts, zero npm test dependencies. Each script is self-contained and self-testing. |
| **Config file** | none |
| **Quick run command** | `scripts/fetch-upstream.sh --self-test && scripts/apply-patches.sh --self-test && scripts/check-patch-surface.sh && scripts/scan-brand-residue` |
| **Full suite command** | `scripts/smoke-theia.sh && scripts/smoke-firefox.sh && node scripts/verify-branding-identity.mjs && node scripts/verify-branding.mjs && scripts/verify-endpoints.sh && node scripts/verify-uri-roundtrip.mjs && node scripts/verify-customize-inert.mjs && node scripts/verify-dev-flag-off.mjs` |
| **Estimated runtime** | Quick: ~seconds (no build). Full: ~40 min — dominated by `scripts/smoke-firefox.sh` (full Gecko compile). |

---

## Sampling Rate

- **After every task commit:** `scripts/scan-brand-residue` + `scripts/check-patch-surface.sh` + `tsc -b` on the Theia extensions. Seconds, no build.
- **After every plan wave:** add the three self-tests (`fetch-upstream --self-test`, `apply-patches --self-test`, `check-internals-boundary` self-test) + `scripts/smoke-theia.sh`.
- **Before `/gsd-verify-work`:** full suite including the one `./mach build` must be green.
- **Max feedback latency:** ~30 seconds per commit; ~40 minutes at the phase gate.

**Nyquist note (from research):** the Gecko build is the sampling bottleneck — at ~40 minutes it
cannot be sampled per-commit. Compensate by making everything the build would catch catchable
*without* it: the residual scan, the patch-surface guard, the hash-chain assertion, and a **static
pre-flight check that every hand-written branding literal matches the value
`verify-branding-identity.mjs`'s `VARIANTS` descriptor expects**, run before the build rather
than after it.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MIG-01 | — | N/A | integration | `rm -rf upstream && scripts/fetch-upstream.sh` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-01 | — | N/A | unit (self-test) | `scripts/fetch-upstream.sh --self-test` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-01 | — | N/A | integration | `scripts/apply-patches.sh` then re-run (must fail by name) | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-01 | — | N/A | unit (self-test) | `scripts/apply-patches.sh --self-test` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-01 | — | no patch touches a compiled path | unit | `scripts/check-patch-surface.sh` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-02 | — | N/A | unit | `scripts/scan-brand-residue --reconcile --report <path>` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MIG-03 | — | N/A | unit | `scripts/scan-brand-residue` (exit 0) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | MIG-03 | — | internals boundary + chrome package allowlist hold | unit | `scripts/check-internals-boundary.sh` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-04 | — | N/A | integration | `scripts/smoke-theia.sh` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-04 | — | N/A | integration (~40 min) | `scripts/smoke-firefox.sh` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-04 | — | N/A | e2e | `node scripts/verify-branding-identity.mjs` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-04 | — | comparison discriminates (non-vacuous) | e2e control | `node scripts/verify-branding-identity.mjs --positive-control runtime-identity` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | MIG-04 | — | no unattended callout to a non-allowlisted host | e2e | `scripts/verify-endpoints.sh` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | GUI-01 | — | N/A | **manual-only** | — (BiDi cannot see chrome contexts on Linux) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | GUI-01 | — | N/A | integration | new check: spawn twice, count windows via `SHELL_READY` sentinels | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | GUI-02 | — | N/A | unit/e2e | extend `node scripts/verify-uri-roundtrip.mjs` (table-driven) | ❌ W0 (row) | ⬜ pending |
| TBD | TBD | TBD | GUI-03 | — | absent `customize.css` renders pixel-identically to an empty one | e2e | `node scripts/verify-customize-inert.mjs` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | GUI-03 | — | privileged-JS binding absent with flag off | e2e | `node scripts/verify-dev-flag-off.mjs` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | GUI-03 | — | branding extension actually loaded | e2e | `node scripts/verify-branding.mjs` | ✅ migrates | ⬜ pending |
| TBD | TBD | TBD | GUI-04 | — | `TabUriRegistry` exported shape unchanged | unit | new assertion over the module's exports | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/scan-brand-residue` + `inventory/brand-tokens.{toml,json}` — covers MIG-02, MIG-03; **must exist and be proven red before any rename runs** (binding ordering constraint)
- [ ] `scripts/rename-brand.*` — the D-05 rerunnable rename script
- [ ] New GUI-01 checks: first-launch/second-launch window count; browser-window reachability (may be manual-only — justify in the plan)
- [ ] New GUI-02 row in `verify-uri-roundtrip.mjs`'s table + a documented X-Frame-Options carve-out
- [ ] New GUI-04 assertion over `TabUriRegistry`'s exported shape
- [ ] Static pre-flight branding-literal consistency check (cheap; saves 40-minute round trips)
- [ ] Decision + consolidation of `scripts/verify-phase-0*.sh` (Research Open Question 2)
- [ ] `CLAUDE.md` for this repo (Research Open Question 4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A stock browser window opens, has a working address bar, and closing it returns to the shell | GUI-01 | BiDi cannot see chrome contexts on Linux (`WINDOWS.md #7`, cited in `verify-branding-identity.mjs` header) | Launch the app; toggle to browser UI; confirm the address bar accepts a URL and navigates; close the window and confirm the Theia shell returns |
| Runtime GUI restyle via the customize bridge visibly changes the shell | GUI-03 | Visual/perceptual outcome; the automated checks only prove inertness and flag-gating | With the dev flag on, edit `customize.css`, confirm the change appears without a rebuild; remove it, confirm the shell reverts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s per commit (build-gated checks excepted, per the Nyquist note)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
