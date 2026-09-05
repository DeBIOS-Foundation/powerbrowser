---
phase: "12"
slug: "sql-store-build"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-05"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node scripts (verify-platform.sh registry) + xpcshell/mocha where applicable |
| **Config file** | scripts/verify-platform.sh |
| **Quick run command** | `scripts/verify-platform.sh --quick` |
| **Full suite command** | `scripts/verify-platform.sh` |
| **Estimated runtime** | ~60s quick; full tier-3 excluded (heavy) |

---

## Sampling Rate

- **After every task commit:** Run `scripts/verify-platform.sh --quick`
- **After every plan wave:** Run `scripts/verify-platform.sh --quick`
- **Before `/gsd-verify-work`:** Quick green + new store rows green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | SQL-01 writer | — | Single writer | integration | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | SQL-04 reads | — | No raw places writes | integration | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 3 | SQL-05 gates | — | Second-writer scan | static+soak | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |

---

## Wave 0 Requirements

- Existing infrastructure covers base; new store rows add Wave-0-level gates per 11 handoff (4 registry rows with --self-test).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| URI→row→restart→reopen roundtrip on temp DB | SQL-05 | Needs restart cycle | Run roundtrip script per plan |
| Live ESR rebase drill over new touchpoints | SQL-05 | Heavy, needs tag | Staged with exact commands if no tag |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
