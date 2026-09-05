---
phase: 05-hook-only-patches-and-upstream-uptake
verified: 2026-09-04T00:00:00Z
status: human_needed
score: 4/4 must-haves verified (static); 0 gaps; 3 live drills open for human
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  status: human_needed
---

# Phase 5: Hook-Only Patches and Upstream Uptake — Verification Report

**Phase Goal:** The patch stack carries no brand values, and adopting an upstream release means editing one pin
**Requirements:** MIG-05, CFG-06, UPD-01, UPD-02
**Plans:** 05-01, 05-02, 05-03, 05-04 (all complete)
**Verified:** 2026-09-04 (re-ran key static checks in this pass; no upstream fetch, no tier-3 build)
**Status:** human_needed (all static checks green; only live rebase/build drills remain — see 05-UAT.md)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | No `patches/*.patch` contains a configured brand value — hooks only — with 3-way blob-hash chain intact and non-vacuity firing on silent no-op | ✓ VERIFIED | `grep -E '^[+]' patches/*.patch`: +lines are comments + `include("../identity.configure")` (010) + `DIRS += ["../powerbrowser/shell"]` (020) only. `check-patch-surface.sh` PASS; `--self-test` + `--self-test-brand` PASS (planted display-name offender red by name, shipped stack green control). `apply-patches.sh --self-test` PASS all 3 cases: first apply changes file, second apply rejected by name (non-vacuity), conflict-drifted content rejected by name |
| 2 | Firefox ESR + Theia pins declared once in `configuration.toml`, consumed by fetch/build scripts; no duplicated version string | ✓ VERIFIED | `verify-upstream-pins.mjs` PASS (ESR 4-way agreement + Theia 1.74.1 across resolutions, 6 members, lockfile); `--self-test` PASS (4 plants red naming the file). Tag literal `FIREFOX_153_1_0esr_RELEASE` in exactly configuration.toml + workflow mirror + generated fragment. `generate.mjs --check` PASS (52 files) |
| 3 | ESR pin bump + fetch + patch apply yields working branded build; rebase/conflict tooling fails loudly on drift | ✓ STATIC / HUMAN for live | Statically: drift-class→proof map complete (conflict / silent-adoption / unaccounted-dirt / surface-regression, each red-capable per 05-04); `fetch-upstream.sh --self-test` PASS (4 cases); `rebase --dry-run` vs manifest pin exit 0. Live rebase + tier-3 branded build UNEXECUTED (needs a real next ESR tag + CI/build time) → UAT-1, UAT-2 |
| 4 | Theia pin bump re-pins sidecar with core neither forked nor patched | ✓ STATIC / HUMAN for live | Statically: agreement check green both directions, one-pin re-pin procedure as exact commands in docs/BUILD.md:163-224, never-do list present, no live re-pin performed by design. Core-untouched proof NOT runnable here: `diff-theia-core.sh --quick` exits 1 (`yarn: command not found` outside nix shell) → UAT-3 |

**Score:** 4/4 truths verified (2 fully static, 2 static-with-live-drill-open)
**Gaps:** none — no BLOCKER, no stub, no unwired link found in this pass

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `patches/010-powerbrowser-identity.patch` | Hook-only identity patch | ✓ VERIFIED | Regenerated via git diff (blob chain pristine-verified); +lines comments + include only |
| `patches/020-powerbrowser-shell.patch` | Hook-only (proven by audit) | ✓ VERIFIED | Single DIRS hunk, no value lines |
| `scripts/check-patch-surface.sh` | Compiled-surface + brand-value scans, self-tests | ✓ VERIFIED | Main + `--self-test` + `--self-test-brand` all PASS in this pass |
| `scripts/apply-patches.sh` | Replay + non-vacuity assertion | ✓ VERIFIED | 3-case self-test PASS in this pass |
| `scripts/verify-upstream-pins.mjs` | ESR + Theia agreement + self-test | ✓ VERIFIED | Main + `--self-test` (4 plants) PASS in this pass |
| `generated/upstream-pins.env` | Shell fragment from manifest | ✓ VERIFIED | `FIREFOX_ESR_TAG=` present, consumed by fetch (parse-verified, no literal fallback) |
| `configuration.toml [upstreams]` | Single pin declarations | ✓ VERIFIED | `firefox_esr_tag` + `theia_release = "1.74.1"`, both schema-required |
| `docs/BUILD.md` re-pin procedure | Exact one-pin commands | ✓ VERIFIED | Present with never-do list; commands dry-run validated per 05-03 |
| `powerbrowser/identity.configure.comparand` | Frozen emission bytes | ✓ VERIFIED | Byte-identity row green via --quick |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| 010 patch | generated/identity.configure | include hook via upstream symlink | ✓ WIRED | include line present; emitter carries relocated telemetry lines (byte-identity gated) |
| configuration.toml | generate.mjs | [upstreams] schema keys | ✓ WIRED | --check green; unset-pin probes fail naming the key |
| upstream-pins.env | fetch-upstream.sh | sourced TAG default | ✓ WIRED | Literal removed; missing-fragment fails naming rerun |
| verify-upstream-pins | workflow mirror | agreement assertion | ✓ WIRED | Drifted mirror goes red naming the file |
| rebase-upstream.sh | apply/check/surface/residue/fetch | post-replay chain | ✓ WIRED | Read-through confirmed ordering; dry-run exit 0 |

### Data-Flow / Behavioral Spot-Checks (re-run in this pass)

| Check | Command | Result |
|-------|---------|--------|
| Patch surface | `bash scripts/check-patch-surface.sh` (+ `--self-test`) | PASS |
| Replay assertion | `bash scripts/apply-patches.sh --self-test` | PASS (3/3 cases) |
| Pin agreement | `node scripts/verify-upstream-pins.mjs` (+ `--self-test`) | PASS (4/4 plants) |
| Generator freshness | `node scripts/generate.mjs --check` | PASS (52 files) |
| Fetch classifier | `bash scripts/fetch-upstream.sh --self-test` | PASS (4/4 cases) |
| Uptake dry-run | `rebase-upstream.sh --tag <manifest-pin> --dry-run` | exit 0 |
| Full static gate | `scripts/verify-platform.sh --quick` | PASS (95 PASS rows, 0 FAIL) |
| Core-untouched | `bash scripts/diff-theia-core.sh --quick` | NOT RUNNABLE HERE (yarn absent; exit 1) → UAT-3 |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MIG-05 hook-only patches | ✓ SATISFIED | SC1 evidence above |
| CFG-06 pins in manifest | ✓ SATISFIED | SC2 evidence above |
| UPD-01 ESR uptake by pin bump | ✓ STATIC, live drill staged | SC3; staged commands in 05-04 SUMMARY + UAT-1/UAT-2 |
| UPD-02 Theia re-pin, core untouched | ✓ STATIC, proof run staged | SC4; procedure in BUILD.md + UAT-3 |

### Anti-Patterns Found

None. Added-line audit shows comments + hooks only; stub-pattern grep clean per plan SUMMARies; no TODO/FIXME introduced.

## Human Verification Required

3 items — see [05-UAT.md](05-UAT.md) for exact commands and expected output:

1. **UAT-1:** Live ESR rebase drill onto a real next ESR tag (CI dispatch or local `rebase-upstream.sh`), incl. toolchain-baseline diff
2. **UAT-2:** Tier-3 branded build + built-artifact branding proof after the rebase (~47–54 min reference)
3. **UAT-3:** `diff-theia-core.sh` full green run under `nix develop .#theia` (yarn-gated; doubles as re-pin-procedure proof shape)

## Gaps Summary

**No gaps found.** Every static criterion is proven with red-capable self-tests; the only open items are live drills deliberately left unexecuted by the plans (they need a next ESR tag, CI/build minutes, and a nix Theia shell — none of which verification spends). No fix plans generated.

---
*Verified: 2026-09-04*
*Verifier: Muse Spark (gsd-verifier, end-of-roadmap batch)*
