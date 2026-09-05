---
phase: "10"
slug: "sign-off-closeout"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-05"
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node scripts (verify-platform.sh registry) |
| **Config file** | scripts/verify-platform.sh |
| **Quick run command** | `scripts/verify-platform.sh --quick` |
| **Full suite command** | `scripts/verify-platform.sh` |
| **Estimated runtime** | ~60 seconds for --quick |

---

## Sampling Rate

- **After every task commit:** Run `scripts/verify-platform.sh --quick`
- **After every plan wave:** Run `scripts/verify-platform.sh --quick`
- **Before `/gsd-verify-work`:** Full suite must be green (or staged per autonomous deferral)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | MIG-01..DOC-01 record-close | — | N/A (docs) | static | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | TEL-01,TEL-02,EXT-01,VER-01 | — | N/A | drill | `scripts/verify-platform.sh --only <row>` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 1 | VER-01 gates-green | — | N/A | static | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (verify-platform.sh registry + prior SUMMARY evidence).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser-window toggle (5 steps) | GUI-01 | Needs human eyes on real window | UAT sheet 10-UAT-GUI-01.md steps |
| Customize-bridge restyle (3 steps) | GUI-03 | Perceptual restyle | UAT sheet 10-UAT-GUI-03.md steps |
| Icon pixel look | GEN-02 | Pixel aesthetics | UAT sheet 10-UAT-GEN-02.md steps |
| Theia welcome/about render | GEN-05 | Visual render | UAT sheet 10-UAT-GEN-05.md steps |
| Stranger carry-test | DOC-01 | Human follows REBRANDING.md | UAT sheet 10-UAT-DOC-01.md steps |

*Autonomous nonstop mode: manual runs staged with exact runbooks, recorded deferred, not performed.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
