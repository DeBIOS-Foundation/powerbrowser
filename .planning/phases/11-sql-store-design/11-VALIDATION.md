---
phase: "11"
slug: "sql-store-design"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-05"
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node scripts (verify-platform.sh registry) + throwaway fixture-DB scripts under mktemp |
| **Config file** | scripts/verify-platform.sh |
| **Quick run command** | `scripts/verify-platform.sh --quick` |
| **Full suite command** | `scripts/verify-platform.sh --quick` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `scripts/verify-platform.sh --quick`
- **After every plan wave:** Run `scripts/verify-platform.sh --quick`
- **Before `/gsd-verify-work`:** Quick green (design phase - docs + fixture exercises)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SQL-02 authority | — | N/A (docs) | static | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | SQL-03 schema | — | N/A (docs+fixtures) | static | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 3 | SQL-02+SQL-03 sign | — | N/A | static | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements (design docs + throwaway fixture scripts, no new framework).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Authority/invariant table review sign-off | SQL-02 | Human review signature | Reviewer reads authority table, signs |
| Schema + migration plan review sign-off | SQL-03 | Human review signature | Reviewer reads schema plan, signs |

*Autonomous nonstop mode: review signs staged as recorded approvals with reviewer checklist, not live human signatures.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
