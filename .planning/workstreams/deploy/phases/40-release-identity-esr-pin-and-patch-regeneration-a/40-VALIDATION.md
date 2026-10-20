---
phase: "40"
slug: "release-identity-esr-pin-and-patch-regeneration-a"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-20"
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry plus per-script `--self-test` (node built-ins, bash) |
| **Config file** | none — rows are the `CHECKS=(` array in `scripts/verify-platform.sh` |
| **Quick run command** | `scripts/verify-platform.sh --only <label>` (and `<label>-self-test`) |
| **Full suite command** | `scripts/verify-platform.sh --quick` |
| **Estimated runtime** | ~60 seconds (`--quick`, 58 s on 2026-10-20) |

---

## Sampling Rate

- **After every task commit:** `scripts/verify-platform.sh --only <new label>` and its `-self-test`; `node scripts/scan-brand-residue.mjs` after `git add`
- **After every plan wave:** `scripts/verify-platform.sh --quick`
- **Before `/gsd-verify-work`:** `--quick` green, plus one dev build with `--only ng064-update-url-from-manifest`, `--only mar-update-hop` and the manual About-dialog check
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 40-TBD | TBD | TBD | DIST-06 | — | Manifest pin = workflow default = fragment; upstream at 6cd88e7d | quick | `scripts/verify-platform.sh --only verify-upstream-pins` | ✅ | ⬜ pending |
| 40-TBD | TBD | TBD | AUTO-08 | template injection via `inputs.tag` | No `tag` default; generate inside Nix; tag passed via `env:` | quick + self-test | `--only verify-upstream-pins` / `--only verify-upstream-pins-self-test` | ✅ (extend) | ⬜ pending |
| 40-TBD | TBD | TBD | REL-01 | release tag not matching version | Version files and tag agree with derivation | quick + self-test | `--only release-identity` / `-self-test` | ❌ W0 | ⬜ pending |
| 40-TBD | TBD | TBD | UPD-11 | — | One channel across consumers | quick + self-test | `--only update-channel` / `-self-test` | ❌ W0 | ⬜ pending |
| 40-TBD | TBD | TBD | UPD-12 | two update URL sources | No `AppUpdateURL` | quick + full | `--only update-channel`; `--only ng064-update-url-from-manifest` | ❌ / ✅ (edit) | ⬜ pending |
| 40-TBD | TBD | TBD | UPD-13 | — | Link prefs derived and parse as URLs | quick | `--only update-prefs`, `--only generated-byte-identity` | ❌ W0 / ✅ | ⬜ pending |
| 40-TBD | TBD | TBD | UPD-33 | user-initiated host fetched unattended | `user-initiated` accepted; unattended request red naming host | quick + self-test | `--only allowlist-schema`, `--only endpoint-dispositions-self-test` | ✅ (edit) / ❌ W0 | ⬜ pending |
| 40-TBD | TBD | TBD | UPD-25 | — | langpack false; five update prefs absent | quick + self-test | `--only update-prefs` / `-self-test` | ❌ W0 | ⬜ pending |
| 40-TBD | TBD | TBD | PKG-08 | incomplete third-party notices | Notices equal re-derivation | quick + self-test | `--only licensing` / `-self-test` | ❌ W0 | ⬜ pending |
| 40-TBD | TBD | TBD | PKG-09 | — | en-US scope stated | grep | `grep -n 'en-US' README.md .planning/PROJECT.md` | ✅ (edit) | ⬜ pending |
| 40-TBD | TBD | TBD | AUTO-10 | hand-edited hunk silently no-ops | Patches equal regeneration; hand edit red | quick + self-test | `--only patches-regenerated` / `-self-test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky* — task IDs are filled in once plans exist.

---

## Wave 0 Requirements

- [ ] `scripts/verify-release-identity.mjs` — REL-01
- [ ] `scripts/verify-update-channel.mjs` — UPD-11, UPD-12
- [ ] `scripts/verify-update-prefs.mjs` — UPD-13, UPD-25
- [ ] `scripts/regenerate-patches.sh` — AUTO-10
- [ ] `scripts/generate-licensing.mjs` — PKG-08
- [ ] `verify-endpoints.sh --disposition-self-test` plus a shared verdict function — UPD-33

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First real `rebase-upstream.yml` run green | DIST-06, AUTO-08 | Owner push and `workflow_dispatch` on GitHub | Owner pushes, dispatches with `tag=FIREFOX_153_5_1esr_RELEASE`, `gh run watch <id>` |
| About dialog release-notes and fallback links open without throwing | UPD-13 | Needs a rebuilt dev objdir and a display | Build dev objdir, open About, click each link |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
