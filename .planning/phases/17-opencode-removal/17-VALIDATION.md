---
phase: "17"
slug: "opencode-removal"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-17"
---

# Phase 17 — Validation Strategy

> Source: `17-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry + node/python checks |
| **Config file** | the `CHECKS` array inside `scripts/verify-platform.sh` |
| **Quick run command** | `scripts/verify-platform.sh --only <label>` |
| **Full suite command** | `scripts/verify-platform.sh --quick` (commit gate; no build artefact changes this phase) |
| **Estimated runtime** | ~1 min for `--quick` |

---

## Sampling Rate

- **After every task commit:** the `--only` rows below for the files touched
- **After every plan wave:** full `--quick` plus the R33 subtraction (`docs/non-gui/quick-baseline.txt`)
- **Before `/gsd-verify-work`:** every row below, plus `python3 scripts/phase-gate.py --root .` exit 0 after Chris's re-lock

---

## Per-Requirement Verification Map

| Criterion | Check / command | Failing direction | Status |
|---|---|---|---|
| RM-01.1 no adapter dir | `test -z "$(git ls-files theia/extensions/backend-opencode)"` and `test ! -e theia/extensions/backend-opencode` | a tracked file or ignored `lib/` remains | ✅ |
| RM-01.1 build chain | `--only theia-build-order` | names a missing dir, or dir present but unnamed | ✅ |
| RM-01.1 env allowlist | `--only backend-env-readers` | `STALE ALLOWLIST ENTRY` / `UNGATED ENV TOUCHER` | ✅ |
| RM-01.1 no `[ai]` / schema / emitter | `! git grep -q -E '^\[ai\]\|"ai\.backend"\|emitAiBackend' -- configuration.toml scripts/` | any survives | ✅ |
| RM-01.1 schema vs docs | `--only verify-rebranding-docs` | `does not document 'ai.backend'` | ✅ |
| RM-01.1 manifest valid | `--only generate-check` | unknown-key failure, or stale `generated/ai-backend.json` | ✅ |
| RM-01.1 no scripts / rows | `git ls-files` for the four scripts + docs file empty; no `ai-opencode\|ng051\|adapter_composed` in the driver | any survives | ✅ |
| RM-01.2 53 targets | `node scripts/generate.mjs --check` → `all 53 generated file(s)` | 54, or extra-file FAIL | ✅ |
| RM-01.3 lockfile | `! grep -q '@agentclientprotocol' theia/yarn.lock` + 5-deletion numstat | stanza kept (frozen install does NOT catch this) | ✅ |
| RM-01.3 frozen install | scratch copy: `yarn install --ignore-scripts --frozen-lockfile` | lock missing an entry | ✅ |
| RM-01.3 gate | `--quick` FAIL set = the four gui08 rows; baseline refreshed | new red, or a baseline row now passing | ✅ |
| RM-01.3 brand scan | `node scripts/scan-brand-residue.mjs` after `git add` | count drift | ✅ |
| RM-01.4 ledger | `python3 scripts/phase-gate.py --root .` exit 0 after re-lock | any line other than the expected pre-relock `locked check missing` | ✅ |
| RM-01.4 AI stays | `grep -c '"@theia/ai-'` = 12 in both package.json files | any removed | ✅ |
| RM-01.4 plan coverage | `python3 scripts/plan-gate.py --root . --phase 17 --plans .planning/phases/17-opencode-removal` | NG-074 / NG-084 not cited | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new registry row: a
permanent "no opencode" row would be an absence assertion with no emitter left
(CLAUDE.md verification rule 1).

---

## Manual-Only Verifications

- Chris runs `python3 scripts/ledger-amend.py --root . lock-checks --commit <removal-sha>` (agent-blocked by hook).

## Validation Audit 2026-10-17

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
