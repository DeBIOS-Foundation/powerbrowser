---
phase: "18"
slug: "firefox-153-5-0esr"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-16"
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `18-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` (one registry) + standalone node/bash checks |
| **Config file** | none (registry inside the driver) |
| **Quick run command** | `scripts/verify-platform.sh --quick` (FAIL set must equal the four gui08 rows) |
| **Full suite command** | `scripts/verify-platform.sh` (218 rows; both objdirs, the package, a display) |
| **Estimated runtime** | quick: seconds; full: tens of minutes; each Gecko build ~50-55 min |

---

## Sampling Rate

- **After every task commit:** `scripts/verify-platform.sh --quick` + `node scripts/verify-upstream-pins.mjs` + staged brand scan
- **After every plan wave:** the `--only` rows named below for that wave
- **Before `/gsd-verify-work`:** full run compared with the 153.1 baseline (criterion 4 reading in 18-CONTEXT.md)
- **Max feedback latency:** quick gate seconds; build-bound checks one build

---

## Per-Requirement Verification Map

| Req / SC | Behavior | Test Type | Automated Command | Failing direction | Status |
|----------|----------|-----------|-------------------|-------------------|--------|
| UPD-05 / SC1 | Pin, fragment, workflow mirror and fetch default agree | static | `node scripts/verify-upstream-pins.mjs` | FAILs after editing only `configuration.toml` (stale fragment, drifted mirror) | ✅ |
| UPD-05 / SC1 | SHA recorded | static | `grep -c 223014c6b9299ac9b035b4c50ea481e5c6de282c docs/BUILD.md` ≥ 1 | 0 before the docs edit | ✅ |
| UPD-05 / SC1 | Tag comment corrected | static | `! grep -q 'at the identical commit' scripts/fetch-upstream.sh` | matches today (line 279) | ✅ |
| UPD-05 / SC1 | `configuration.toml:104` split | static | `! grep -q 'this# project' configuration.toml && node scripts/generate.mjs --check` | grep hits today | ✅ |
| UPD-05 / SC2 | Replay with patches byte-unchanged; tree at SHA | integration | `scripts/rebase-upstream.sh --tag FIREFOX_153_5_0esr_BUILD1`; `git diff --exit-code -- patches/`; `git -C upstream rev-parse HEAD` = SHA | `fetch-upstream.sh` FAILs before the rebase | ✅ |
| UPD-05 / SC2 | Patch application non-vacuous | integration | `bash scripts/apply-patches.sh --self-test`; `--only about-dialog-suppression`; `--only check-patch-surface` | existing self-tests plant faults | ✅ |
| UPD-05 / SC2 | Smoke reports a tree-derived version | build | `scripts/verify-platform.sh --only smoke-firefox` | dev build with the old literal FAILs "did not report 153.1.0esr" | ✅ |
| UPD-06 / SC3 | Both objdirs at 153.5 | build | `grep -h '^Version=' objdir*/dist/bin/application.ini` = 153.5.0 ×2; `--only verify-branding-identity-dev`; `--only verify-branding-identity-release` | release row FAILs between the two builds | ✅ |
| UPD-06 / SC3 | Release objdir has release branding | static | `grep -c 'with-branding=powerbrowser/branding/release' objdir-release/config.status` ≥ 1 | `branding-variant-divergence-self-test` | ✅ |
| UPD-06 / SC4 | Full run: no new red; version rows green | e2e | full `scripts/verify-platform.sh`, FAIL set compared with the 153.1 baseline log | package rows FAIL before `package-linux.sh` | ✅ |
| UPD-06 / SC4 | MAR evidence labelled pre-153.5 | static + doc | compare `.mozbuild/mar-hop/hop.json` version with `objdir/dist/bin/application.ini` | versions differ; label present in docs/BUILD.md | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The only script change is
the `smoke-firefox.sh` version step; its red direction comes from the build order.

---

## Manual-Only Verifications

None. Criterion 4's "no new red" reading is recorded in 18-CONTEXT.md and reported
in the phase summary.

## Validation Audit 2026-10-17

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
