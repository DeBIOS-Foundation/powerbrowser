---
phase: 2
slug: configuration-manifest-and-generator-core
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None, by design.** This repo has no test runner. The convention is per-script `--self-test` fault planting, registered as rows in one driver. Introducing vitest/jest here would violate CLAUDE.md §Verification's one-driver rule. |
| **Config file** | `scripts/verify-platform.sh` — the single registry |
| **Quick run command** | `scripts/verify-platform.sh --quick` |
| **Single-check command** | `scripts/verify-platform.sh --only <label>` |
| **Full suite command** | `scripts/verify-platform.sh` |
| **Gate command** | `scripts/verify-platform.sh --gate` |
| **Estimated runtime** | ~10 seconds for `--quick` (no build, no browser, no display, no network) |

**No `./mach build` is required by this phase.** D-01 keeps every build consumer on the
hand-written files, so nothing this phase produces reaches the compiler. A full build costs 47–54
minutes on the reference host; nobody should schedule one out of caution.

---

## Sampling Rate

- **After every task commit:** `scripts/verify-platform.sh --quick`
- **After every plan wave:** `scripts/verify-platform.sh --quick` plus targeted `--only` runs of the four new rows
- **Before `/gsd-verify-work`:** `scripts/verify-platform.sh --quick` fully green; `--gate` if a built tree is available
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | GEN-04 | T-02-SC | Vendored dependency confirmed by a human against a recorded sha256 before any byte lands | checkpoint | *(blocking human checkpoint — no automated command by design)* | ✅ | ⬜ pending |
| 02-01-02 | 01 | 1 | GEN-04 | T-02-SC | No install-time execution vector; licence retained; output root ignored | gate | `git check-ignore -q generated/ && node scripts/scan-brand-residue.mjs` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | CFG-01, CFG-02, CFG-03 | T-02-01, T-02-02, T-02-03 | Schema allowlist rejection precedes any merge; no config value in a write path; no parser text in failure copy | gate | `node scripts/generate.mjs && cmp generated/branding/dev/configure.sh powerbrowser/branding/dev/configure.sh` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | CFG-01 | T-02-05, T-02-07 | The preflight's independent expectation source is unchanged; only the mark path moves | gate | `node scripts/verify-branding-preflight.mjs && node scripts/verify-branding-preflight.mjs --self-test` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 1 | CFG-01 | T-02-05 | Blast radius verified against the whole tree, not assumed from one grep | gate | `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | CFG-02, CFG-04 | T-02-04, T-02-01 | Mask applied to the defaults layer object before the merge; null-prototype accumulators | gate | `node scripts/generate.mjs && cmp generated/branding/dev/configure.sh powerbrowser/branding/dev/configure.sh` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | CFG-04 | T-02-09, T-02-10 | Echo carries no host path; array-replace pinned by a planted fault | self-test | `scripts/verify-platform.sh --only generate-self-test` *(row lands in 02-06; until then `node scripts/generate.mjs --self-test`)* | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 3 | CFG-01, CFG-03, GEN-04 | T-02-02, T-02-11 | Every write path a literal in the frozen target table; regex-gated values carry no shell meaning | gate | `node scripts/generate.mjs && cmp generated/.mozconfig .mozconfig` (plus the four sibling comparisons) | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 3 | GEN-04 | T-02-12 | `--check` emits only into a unique mkdtemp and mutates nothing | gate | `node scripts/generate.mjs --check` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 4 | GEN-04, CFG-01 | T-02-15, T-02-16, T-02-17 | Emitter set derived and set-compared; gate independent of git-ignored state; import has no side effect | gate | `scripts/verify-platform.sh --only generated-byte-identity` | ❌ W0 | ⬜ pending |
| 02-05-02 | 05 | 4 | GEN-04 | T-02-14 | Seven planted faults each go red naming the drift; clean-baseline and mutation-landed guards | self-test | `scripts/verify-platform.sh --only generated-byte-identity-self-test` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 5 | CFG-02, CFG-03 | T-02-18, T-02-03 | Nine planted faults; cross-cutting no-internals predicate over every case's output | self-test | `scripts/verify-platform.sh --only generate-self-test` | ❌ W0 | ⬜ pending |
| 02-06-02 | 06 | 5 | GEN-04 | T-02-20 | CI steps ordered so the freshness check asserts idempotence, not a phantom staleness | gate | `scripts/verify-platform.sh --only generate-check` | ❌ W0 | ⬜ pending |
| 02-06-03 | 06 | 5 | CFG-02 | T-02-19 | Byte-identity proven green against the ORIGINAL bytes before the comparand is edited | gate | `node scripts/verify-generated-identity.mjs && node scripts/verify-branding-preflight.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

`File Exists` reads ❌ W0 where the script under test is created by this phase — those are the
Wave 0 items below, not gaps.

---

## Wave 0 Requirements

Created inside the phase's own plans; no separate Wave 0 plan and no framework install.

- [ ] `scripts/lib/toml.cjs` + `scripts/lib/toml.LICENSE` — vendored parser, gated behind a blocking human checkpoint on the recorded sha256 (plan 02-01)
- [ ] `configuration.toml` — must exist before any emitter can be exercised (plan 02-01)
- [ ] `scripts/lib/config-schema.json` — blocks the unknown-key check, the masker, and the validator (plan 02-01)
- [ ] `.gitignore` entry `/generated/` (plan 02-01)
- [ ] `scripts/generate.mjs` — the generator and its `--self-test` (plans 02-01, 02-03, 02-04, 02-06)
- [ ] `scripts/verify-generated-identity.mjs` — the byte-identity gate and its `--self-test` (plan 02-05)
- [ ] Four registry rows in `scripts/verify-platform.sh` (plans 02-05, 02-06)
- [ ] Three `run:` steps in `.github/workflows/rebase-upstream.yml` (plan 02-06)

**No test framework install is needed. None should be added.**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The vendored parser is the package it claims to be | GEN-04 | Registry provenance and a supply-chain judgement cannot be settled by a local command; the legitimacy seam returned SUS and the protocol forbids overriding it with an agent's analysis | Plan 02-01 Task 1: confirm the npm page, the GitHub repository, the sha256 `195ca51f…`, and the 22907-byte size, then approve or halt |
| Generator failure copy reads as documentation, not as a parser | CFG-02, CFG-03 | "Reads like documentation for a stranger" is a copy judgement; the automated half asserts the absence of internals, not the presence of clarity | Plan 02-06 Task 3 `<human-check>`: read the rewritten `configure.sh` header, then run the generator against a manifest with a deliberately wrong binary name and judge the message |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a Wave 0 dependency (02-01-01 is a blocking human checkpoint by protocol; every other task carries an automated command)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
