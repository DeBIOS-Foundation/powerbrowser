---
phase: "09"
slug: "extensions-crash-pipeline"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-05"
---

# Phase 09 — Validation Strategy

> Per-phase validation contract. Same harness as Phase 08: verify-platform.sh
> rows + Node self-tests. Wave 0 = new gates + plants + runbook before plans.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | verify-platform.sh registry + Node `--self-test` rows |
| **Config file** | `scripts/verify-platform.sh` (registry; append-only) |
| **Quick run command** | `scripts/verify-platform.sh --quick` |
| **Full suite command** | `scripts/verify-platform.sh` |
| **Estimated runtime** | ~60 seconds (`--quick`); tier-3 fixture builds excepted |

---

## Sampling Rate

- **After every task commit:** Run `scripts/verify-platform.sh --quick`
- **After every plan wave:** Run `--quick` + affected `--self-test` rows
- **Before `/gsd-verify-work`:** Full suite green (deferred per standing instruction)
- **Max feedback latency:** 300 seconds (`--quick`; tier-3 builds excepted)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-0* | ext | * | EXT-02 | T-supply-chain | Pin+hash fail-loud on mismatch | self-test | `node scripts/verify-extension-pins.mjs --self-test` | ✅ | ⬜ pending |
| 09-0* | webext | * | EXT-03 | T-sideload | Only declared extensions land | gate | `node scripts/verify-webextensions.mjs --self-test` + `--only` row | ❌ W0 | ⬜ pending |
| 09-0* | crash | * | TEL-04 | T-crash-PII | Collector enforces PII/retention/throttle; rejects malformed | self-test | `node scripts/verify-crash-collector.mjs --self-test` + round-trip | ❌ W0 | ⬜ pending |
| 09-0* | fixtures | * | BLD-02 | — | Tier-3 fixture builds green on real artifacts | build | per-fixture builds (heavy, staged per host) | ❌ W0 | ⬜ pending |
| 09-0* | repin | * | UPD-04 | T-token-bypass | Theia re-pinned, token-gate intact | gate | re-pin runbook + `--only token-gate-*` rows | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `verify-webextensions.mjs` + `verify-crash-collector.mjs` gates with self-test plants
- [ ] Per-kind self-test plants (npm/local-path fixtures: one real Open VSX pin + synthetic fixtures)
- [ ] Tier-3 fixture matrix entries for new source kinds
- [ ] Theia re-pin runbook

*Existing pin-gate + endpoint + token-gate infrastructure covers the rest.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Crash report appears in operator's collector dashboard | TEL-04 | Needs a live collector deployment | Deploy collector, submit synthetic crash, confirm listing + CrashID |
| about:crashes lists the crash | TEL-04 | Client record path needs a running browser | Round-trip synthetic submit per RESEARCH; confirm record step |

*Collector round-trip is automated (synthetic submit); dashboard/operator halves deferred per standing instruction.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
