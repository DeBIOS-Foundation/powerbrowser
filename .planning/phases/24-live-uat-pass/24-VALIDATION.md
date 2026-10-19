---
phase: "24"
slug: "live-uat-pass"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-18"
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry (node checks), plus the human UAT sheets read by the GSD UAT predicate rules |
| **Config file** | the `CHECKS` array in `scripts/verify-platform.sh` (NG-074 rows near `:4516` and `:4747` are the placement precedent) |
| **Quick run command** | `node scripts/verify-ng-089-uat-sheets.mjs --self-test` |
| **Full suite command** | `scripts/verify-platform.sh` |
| **Estimated runtime** | about 1 s for the NG-089 check; seconds for `--quick` |

---

## Sampling Rate

- **After every task commit:** run `node scripts/verify-ng-089-uat-sheets.mjs --self-test`. Recount results on each touched sheet with `grep -E '^result:' <sheet> | sort | uniq -c` and compare against `## Summary`. Run `node scripts/scan-brand-residue.mjs` after `git add`.
- **After every plan wave:** run `scripts/verify-platform.sh --quick` (0 FAIL, empty baseline), then `python3 scripts/phase-gate.py --root .`.
- **Before `/gsd-verify-work`:** the following must all hold:
  - the live session is done;
  - `node scripts/verify-ng-089-uat-sheets.mjs` exits 0;
  - NG-089 is `done` and locked by Chris;
  - `phase-gate.py` prints nothing;
  - `--quick` shows 0 FAIL after the GEN-05 revert.
- **Max feedback latency:** about 5 seconds for static checks. The live UAT is human-paced.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | UAT-01 | T-24-03 | The check goes red on every planted fault | static | `node scripts/verify-ng-089-uat-sheets.mjs --self-test` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | UAT-01 | T-24-02 | NG-084 is dropped only by Chris, with his quote | ledger | `python3 scripts/ledger-report.py --root .` shows `NG-084  dropped` | ✅ | ⬜ pending |
| 24-01-03 | 01 | 1 | UAT-01 | T-24-03 | NG-089 is added; the check exits 1 naming pending results; `record-fail` is recorded | ledger | `node scripts/verify-ng-089-uat-sheets.mjs` (expect exit 1); `python3 scripts/phase-gate.py --root .` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 1 | UAT-01 | — | `15-UAT.md` exists with every test `result: pending` and Summary counts that match | static | `grep -E '^result:' .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md \| sort \| uniq -c` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 1 | UAT-01 | — | Each of the six sheets has a `### N. React 19 runtime` test and a `build:` block | static | `grep -c '^### [0-9]*\. React 19' <each sheet>` = 1 | ❌ W0 | ⬜ pending |
| 24-02-03 | 02 | 1 | UAT-01 | T-24-01 | The agent changed no `result:` line except to add new `pending` tests | static | `git diff -U0 -- .planning/milestones \| grep -E '^[-+]result:'` shows only added `pending` lines | ✅ | ⬜ pending |
| 24-03-01 | 03 | 2 | UAT-01 | T-24-05 | Prep: sidecar rebuilt; fixtures bound to an ephemeral loopback port, never 3000 | static | `scripts/verify-platform.sh --quick` 0 FAIL | ✅ | ⬜ pending |
| 24-03-02 | 03 | 2 | UAT-01 | T-24-01 | Live session: Chris records every result; `reported:` carries his words | manual | — (Chris) | — | ⬜ pending |
| 24-03-03 | 03 | 2 | UAT-01 | T-24-04 | GEN-05 drill reverted; tree clean | static | `node scripts/generate.mjs --check`; `scripts/verify-platform.sh --quick` 0 FAIL; `git -C upstream diff --quiet` | ✅ | ⬜ pending |
| 24-04-01 | 04 | 3 | UAT-01 | — | No pending result on the six sheets; React 19 recorded; Summaries recounted | static | `node scripts/verify-ng-089-uat-sheets.mjs` (expect exit 0) | ❌ W0 | ⬜ pending |
| 24-04-02 | 04 | 3 | UAT-01 | T-24-03 | NG-089 `done` with evidence; Chris's `lock-checks`; gate silent | ledger | `python3 scripts/phase-gate.py --root .` prints nothing | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Threat refs:
- **T-24-01:** a result written that Chris did not report.
- **T-24-02:** a relayed approval used as consent.
- **T-24-03:** a check that cannot go red, or one edited after `record-fail`.
- **T-24-04:** fixture brand values leak into a commit.
- **T-24-05:** a fixture or live run on port 3000.

---

## Wave 0 Requirements

- [ ] `scripts/verify-ng-089-uat-sheets.mjs`, with `--self-test`. It plants a missing sheet, a `pending` result, a `[pending]` result, an empty result, a heading with no result line, a result inside a code fence, a missing React 19 heading, and a React 19 heading with a pending result.
- [ ] Two registry rows in `scripts/verify-platform.sh`: `ng089-uat-sheets-self-test` in `--quick`, and `ng089-uat-sheets` in the full set only.
- [ ] `.planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md`, which is the sixth sheet the check must find.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Every live UAT observation, L01–L33 and 15/1–47 (24-RESEARCH tables) | UAT-01 | CONTEXT: only Chris can record a live UAT result | Follow the ordered script, sessions P, D, A, B, F (if chosen), C and X. Each result goes on every row the observation settles |
| React 19 runtime line on each sheet | UAT-01 | It is an observation in Chris's window on the final stack | Record it at the end of Launch B on 10/6, 13/15, 14/11, 14.1/11, 14.1.1/49 and 15/1 |
| NG-084 drop and NG-089 lock | UAT-01 | The ledger hook keeps both with Chris | Chris runs each command himself, starting with `cd /home/chris/coding/Power-Browser` on its own line |
| Copy changes requested during UAT | UAT-01 | CONTEXT: applied only from Chris's own words | The agent applies the copy, then `shell-error-copy-no-internals` stays green |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
