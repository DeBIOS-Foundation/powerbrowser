---
phase: "08"
slug: "installer-hardening-canonical-rename"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-04"
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> No pytest/jest harness in this tree — verification is `verify-platform.sh`
> rows plus Node self-tests. Wave 0 = gate greenness on the untouched tree.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | verify-platform.sh registry + Node `--self-test` rows (no unit framework) |
| **Config file** | `scripts/verify-platform.sh` (registry; append-only) |
| **Quick run command** | `scripts/verify-platform.sh --quick` |
| **Full suite command** | `scripts/verify-platform.sh` |
| **Estimated runtime** | ~60 seconds (`--quick`); ~47–54 min tier-3 Linux build where required |

---

## Sampling Rate

- **After every task commit:** Run `scripts/verify-platform.sh --quick`
- **After every plan wave:** Run `scripts/verify-platform.sh --quick` + affected `--self-test` rows
- **Before `/gsd-verify-work`:** Full suite must be green (deferred per standing instruction — recorded, not run)
- **Max feedback latency:** 300 seconds (`--quick`; tier-3 builds excepted)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-* | pre-fixes | 1 | PKG-03 | — | WR-04 rejects bare `$VAR`; WR-07 reads fixture root | self-test | `node scripts/verify-installer-schema.mjs --self-test` | ✅ | ⬜ pending |
| 08-02-* | rename | 1 | NAME-01 | T-rename-spoof | No spaced form on any generated surface | gate | `node scripts/scan-brand-residue.mjs` + `scripts/verify-platform.sh --quick` | ✅ | ⬜ pending |
| 08-03-* | updater | 2 | PKG-02 | T-update-hijack | MAR verifies against fork key only | live drill | `scripts/verify-platform.sh --only <updater-row>` | ❌ W0 | ⬜ pending |
| 08-04-* | NSIS/Nix | 2 | PKG-01 | — | Installer builds from generated branding | build | `nix develop .#firefox --command ./mach build` class | ✅ | ⬜ pending |
| 08-05-* | MSIX/DMG | 3 | PKG-01 | — | Per-OS matrix green on named hosts | matrix | install→launch→uninstall→no-residue per OS | ❌ W0 | ⬜ pending |
| 08-06-* | release+rebase+#13+#14 | 3 | BLD-01/UPD-03/SEC-02/SHELL-01 | T-boundary-hole | Boundary guard + release rows green | gate | `scripts/verify-platform.sh --gate` (staged) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Packaging hosts named (Nix capability matrix + VM fallback identities) — else PKG-01 plans cannot verify
- [ ] MAR signing key custody rung decided (`--enable-unverified-updates` vs fork CA)
- [ ] Canonical-form fixture (`PowerBrowser`, no interior space) for the rename gate

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Windows installer wizard look + launch | PKG-01 | Pixel/human-eyes | Follow docs/BUILD.md on Windows host, install, launch, screenshot |
| macOS DMG drag-install + launch | PKG-01 | Pixel/human-eyes | Follow docs/BUILD.md on macOS host, install, launch, screenshot |
| N→N+1 self-hosted update hop per OS | PKG-02 | Needs two published MARs | Publish N, install, publish N+1, confirm auto-update restarts into N+1 |

*Deferred per standing instruction (recorded, not run this cycle unless a real problem needs human help).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
