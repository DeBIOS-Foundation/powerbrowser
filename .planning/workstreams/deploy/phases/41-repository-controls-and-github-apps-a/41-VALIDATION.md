---
phase: "41"
slug: "repository-controls-and-github-apps-a"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-21"
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry rows; each script carries its own `--self-test` |
| **Config file** | none — rows are appended to the CHECKS array (quick rows before `if [ "$QUICK" -eq 0 ]`, full rows inside it) |
| **Quick run command** | `scripts/verify-platform.sh --only <label>` (`workflows`, `zizmor`, `repo-controls-self-test`, and their self-tests) |
| **Full suite command** | `scripts/verify-platform.sh --quick`; after the owner checkpoint, `scripts/verify-platform.sh --only repo-controls` |
| **Estimated runtime** | ~70 seconds (`--quick`); `repo-controls` a few seconds of read-only `gh api` |

---

## Sampling Rate

- **After every task commit:** `scripts/verify-platform.sh --quick` after `git add` of new files (the brand scan reads `git ls-files`)
- **After every plan wave:** `--quick` plus each new row's `--self-test`
- **Before `/gsd-verify-work`:** `--quick` green, owner checkpoint done, then `--only repo-controls` green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 41-TBD | TBD | TBD | GH-12 | event text injected into run:/prompt:; legion label reachable by untrusted jobs | workflow trust rules hold over the tree | static, quick | `--only workflows` / `--only workflows-self-test` | ❌ new `scripts/verify-workflows.mjs` | ⬜ pending |
| 41-TBD | TBD | TBD | AUTO-09 | template injection; unpinned uses | zizmor offline green; planted injection red | static, quick | `--only zizmor` / `--only zizmor-self-test` | ❌ new `scripts/verify-zizmor.mjs` | ⬜ pending |
| 41-TBD | TBD | TBD | GH-02, GH-05..GH-10, SEC-11, SEC-06 | settings drift; bypass widening; App with Workflows | live state equals declared bodies; fail closed when unreadable | full (network) | `--only repo-controls` | ❌ new `scripts/verify-repo-controls.mjs` | ⬜ pending |
| 41-TBD | TBD | TBD | GH-02 | — | missing ruleset, null env policy, App with workflows, unreadable API go red | in-memory, quick | `--only repo-controls-self-test` | ❌ same file | ⬜ pending |
| 41-TBD | TBD | TBD | GH-08 | — | settings file set equals the declared controls table | in-memory, quick | covered by `repo-controls-self-test` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky* — task IDs are filled in once plans exist.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements (the registry and self-test conventions exist; the new scripts are the deliverables).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Runner-group "selected workflows" probe on Free | GH-11 | needs `admin:org` as org owner | Owner probes as org admin; result recorded in `docs/RELEASING.md` |
| Test assignment and pending deployment reach the phone | GH-18 | phone delivery | Second owner account creates the assignment and dispatches the test deployment; owner records receipt in `docs/RELEASING.md` |
| Recovery codes stored offline for both owners | SEC-06 | physical storage | Owner attests in `docs/RELEASING.md` |
| Live settings applied | GH-02, GH-05..GH-10, SEC-11, SEC-06 | writes to the live org/repo are owner actions | Owner runs the apply script at the checkpoint; then `--only repo-controls` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
