---
phase: "3"
slug: "firefox-branding-emitter-and-icon-pipeline"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-03"
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from 03-RESEARCH.md `## Validation Architecture` (2026-09-04).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **None, by design.** Same convention as Phase 2: per-script `--self-test` fault planting, registered as rows in one driver. Introducing a test runner here would violate CLAUDE.md §Verification's one-driver rule. |
| **Config file** | `scripts/verify-platform.sh` — the single registry |
| **Quick run command** | `node scripts/generate.mjs --self-test && scripts/verify-platform.sh --quick` |
| **Single-check command** | `scripts/verify-platform.sh --only <label>` |
| **Full suite command** | `scripts/verify-platform.sh` (plus one tier-3 `./mach build` for criterion 1) |
| **Estimated runtime** | ~10 seconds for `--quick` (no build, no browser, no display, no network); tier-3 build ~47–54 min on the reference host, scheduled once |

**Exactly one `./mach build` is required by this phase** (criterion 1: Linux build via `--with-branding` proves the branded application; criterion 2's icon proof rides the same build). The spike needs only `./mach configure` with a throwaway branding dir — not a full build.

---

## Sampling Rate

- **After every task commit:** `node scripts/generate.mjs --self-test && scripts/verify-platform.sh --quick`
- **After every plan wave:** `scripts/verify-platform.sh`
- **Before `/gsd-verify-work`:** Full suite green + one tier-3 Linux build proving criteria 1–2
- **Max feedback latency:** ~10 seconds (build excluded by design — one scheduled run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(populated at plan time — planner maps each task to a GEN-0x requirement and a command below)* | | | | | | | | | |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → command seeds from research (planner binds each to a concrete task):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | ftl/properties/configure.sh emitted atomically + cross-checked; `identity.configure`; Linux build branded via `--with-branding` | unit (emitters) + build (tier 3) | `node scripts/generate.mjs --self-test`; `verify-platform.sh --only generated-byte-identity`; `./mach build` + `verify-branding-identity.mjs` | ❌ Wave 0 (new emitters, new registry rows) |
| GEN-02 | 5 sizes rasterized from brand/ source; IHDR-exact; app shows downstream icon | unit (IHDR) + build | `node scripts/generate.mjs --self-test`; desktop-entry Icon + `dist` icon inspection | ❌ Wave 0 |
| GEN-03 | NSIS/MSIX/DMG-icns fields emitted, schema-complete; Linux output build-verified | unit (schema check) | `node scripts/generate.mjs --self-test` (new cases: hostile values, schema presence) | ❌ Wave 0 |

---

## Wave 0 Requirements

Created inside the phase's own plans; no separate Wave 0 plan and no framework install.

- [ ] New emitter functions + frozen-target rows in `scripts/generate.mjs` (GEN-01/02/03)
- [ ] New `config-schema.json` keys (`[installer]` table et al.)
- [ ] New `verify-platform.sh` registry rows (branding-dir agreement, icon IHDR, installer schema)
- [ ] Spike result (throwaway dir + `./mach configure` only — no new files)
- [ ] Wave-0 check: `nix develop .#firefox --command inkscape --version`

**No test framework install is needed. None should be added.**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The built Linux application shows the downstream's icon in launcher, window, and desktop entry | GEN-02 | "Shows the icon" is a visual judgement; the automated half asserts IHDR-exact rasters and the desktop-entry Icon line, not the rendered pixels | After the tier-3 build: launch the application, inspect the launcher, window decoration, and desktop entry, and judge the mark |
| The display-name change propagates to every Gecko-side surface with no second file edited | Success criterion 4 | Single-variable propagation is a whole-tree judgement; the automated half asserts byte-identity and agreement checks per surface | Change the display name in `configuration.toml`, regenerate, and confirm every surface (or the one named surface the plan under test owns) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
