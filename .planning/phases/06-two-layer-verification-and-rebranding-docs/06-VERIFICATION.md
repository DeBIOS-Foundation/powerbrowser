---
phase: 06-two-layer-verification-and-rebranding-docs
verified: 2026-09-04T00:00:00Z
status: human_needed
score: 4/4 must-haves verified (static + dev-live); 0 gaps; 4 live/ritual drills open for human
---

# Phase 6: Two-Layer Verification and Rebranding Docs — Verification Report

**Phase Goal:** The build proves its own branding correctness for any downstream, and a stranger has a document that carries them through a full rebrand
**Requirements:** VER-01, VER-02, DOC-01
**Plans:** 06-01, 06-02, 06-03, 06-04, 06-05, 06-06 (all complete)
**Verified:** 2026-09-04 (re-ran every Phase 6 check + self-test in this pass; no tier-3/release builds)
**Status:** human_needed (all automated checks green; only the staged ritual + live drills remain — see 06-UAT.md)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | Static scan with committed scope list + boundary-matched (not substring) tokens fails the build on hardcoded brand values outside the manifest — and fails on stale allowlist entries | ✓ VERIFIED | `node scripts/verify-manifest-literals.mjs` PASS (151 files, 122 occurrences all allowlisted, 41 entries all fresh). `--self-test` PASS: planted display literal red naming file+value, boundary control green, 3 stale-entry kinds (removed literal / rewritten file / deleted file) each red naming the entry, empty-scope/empty-literal/empty-allowlist guards each red distinctly. Derives the 4 literal slots at check time from `configuration.toml` via `resolveConfig`; boundary rule reused by import (`findMatches`), zero literals kept in the checker (zero `Power Browser` occurrences in the identity checker; slot-keyed allowlist). Registry rows `verify-manifest-literals` + `-self-test` present in `verify-platform.sh` and green via `--only` |
| 2 | Runtime verification checks the six branding surfaces by exact equality against the **built artifact**, expectations from `configuration.toml` not constants, fails on disagreement | ✓ VERIFIED (dev-live) / HUMAN for release-live | `node scripts/verify-branding-identity.mjs --variant dev` PASS — all six surfaces (executable, application-ini, runtime-identity, brand-full-name, desktop-entry, version) exact-equal against `objdir/dist/bin/powerbrowser`. `--self-test` PASS: shipped-manifest control green both variants + scratch-manifest drift fault derives the scratch value (proves expectations come from the manifest, not a constant). Preflight section 4 manifest-vs-inventory agreement PASS + `--self-test` disagreement plant red naming variant and both values. 06-04 legal-notice channel: `verify-theia-branding` PASS (fragment, tracked block, `tsc` compile), preflight section 11b plants 22–23 red naming the notice. Release-variant live proof UNEXECUTED (`objdir-release/` absent, tier-3 build out of scope) → UAT-2 |
| 3 | `docs/REBRANDING.md` documents every `configuration.toml` field and walks a first-time reader clone → branded build with no prior knowledge | ✓ VERIFIED (static) / HUMAN for end-to-end walk | `docs/REBRANDING.md` (359 lines): numbered clone→branded-build walkthrough with paste-able commands + 35-field reference across 9 section tables + downstream obligations (own identity, Mozilla non-association, Eclipse attribution, no Power Browser marks, profile old→new copy command, fixed-forever identifiers). `node scripts/verify-rebranding-docs.mjs` PASS (35/35 fields, 4 commands); `--self-test` PASS (field-removal + command-removal plants red naming each). Stranger-read confirmations logged in 06-05 SUMMARY (every command/path verified against the tree; 2 genuine gaps fixed in place). End-to-end stranger run is human by definition → folded into UAT-3 drill context |
| 4 | Both verification layers plus `generate --check` run in CI and pass on Power Browser's own build | ✓ VERIFIED (static half) / HUMAN for CI-runtime | `.github/workflows/verify.yml` (85 lines): push+PR, WR-09 token posture, generate → `--check` → `--quick` in the load-bearing 02-06 order, runtime-behind-build exclusions each named with reason + local drill (never silently skipped). `node scripts/generate.mjs --check` PASS (52 files). `scripts/verify-platform.sh --quick` PASS (95 PASS rows, 0 FAIL) incl. all ten Phase 6 rows. CI-runtime replay on a fresh clone UNEXECUTED by design (no second checkout materialised) → UAT-3 |

**Score:** 4/4 truths verified (all static + dev-live evidence green; release-live, CI-runtime, and artwork-ritual drills open)
**Gaps:** none — no BLOCKER, no stub, no unwired link found in this pass

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/verify-manifest-literals.mjs` | VER-01 static scan, manifest-derived, stale-failing | ✓ VERIFIED | 563 lines (>150 min); check + `--self-test` (7 plants) PASS in this pass |
| `scripts/verify-branding-identity.mjs` | Six-surface runtime check, manifest-derived | ✓ VERIFIED | `--variant dev` 6/6 PASS in this pass; `--self-test` (scratch-manifest fault) PASS; zero kept literals |
| `scripts/verify-trademark-surface.mjs` | Mechanical trademark gate + review agreement | ✓ VERIFIED | 636 lines (>120 min); check + `--self-test` (5 plants) PASS in this pass |
| `brand/HUMAN-REVIEW.md` | Named human review per brand/ file | ⚠️ DRAFT — ritual open | 72 lines; procedure + verbatim primary-source basis (Mozilla policy URL + 2026-09-04 confirmation; Eclipse v1.1.1 effective 2026-03-18 + confirmation) complete; 3 `TO-BE-SIGNED` placeholders unsigned → UAT-1 |
| `scripts/generate.mjs` (legalNotices) | Emitter derivation for About dialog | ✓ VERIFIED | `emitLegalNotices` + `MOZILLA_NON_ASSOCIATION_TAIL` export present; fragment carries 3-notice array |
| `theia/extensions/branding/.../powerbrowser-about-dialog.tsx` | Channel-read rendering of notices | ✓ VERIFIED | `legalNotices` getter via `readBrandingConfig`, mapped text-node render, no notice literal in render code |
| `scripts/verify-branding-preflight.mjs` | Manifest-vs-inventory + legal-notice pins | ✓ VERIFIED | Main + `--self-test` (23 plants incl. 11b pair) PASS in this pass |
| `docs/REBRANDING.md` | Walkthrough + every-field reference | ✓ VERIFIED | 359 lines (>200 min); coverage gate 35/35 green; residue scan green with it in scope |
| `scripts/verify-rebranding-docs.mjs` | Schema-derived doc-coverage gate | ✓ VERIFIED | 252 lines (>80 min); check + `--self-test` (2 plants) PASS in this pass |
| `.github/workflows/verify.yml` | Push/PR CI for generate/--check/--quick | ✓ VERIFIED | Step order + token posture + named exclusions confirmed by read-through in this pass |
| `scripts/verify-platform.sh` | Six new registry rows (3 checks + 3 self-tests) | ✓ VERIFIED | All six rows present and green via `--quick` in this pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| verify-manifest-literals | generate.mjs | `resolveConfig` import, derives slots at check time | ✓ WIRED | grep confirms import + call; scratch-manifest fault proves derivation |
| verify-manifest-literals | scan-brand-residue.mjs | reused `findMatches` boundary matcher | ✓ WIRED | No second local copy of the rule (T-06-01 mooted — indexOf only, no RegExp from values) |
| verify-branding-identity | generate.mjs | `resolveConfig` per-variant brandFullName/vendor/basename | ✓ WIRED | Import + call confirmed; self-test scratch fault exercises the path |
| verify-branding-preflight §4 | inventory/brand-tokens.json | manifest-derived values vs `brand_display_expectations` | ✓ WIRED | Disagreement plant red naming variant + both values |
| verify-trademark-surface | brand/HUMAN-REVIEW.md | check-time brand/ listing vs signed list, set equality | ✓ WIRED | Unlisted-file plant red naming the file; self-listing record closes the set |
| about-dialog.tsx | branding-config.ts | `legalNotices` through `readBrandingConfig`, never literals | ✓ WIRED | Read + fallback + render-rule pins green; removal plants red |
| verify-branding-preflight §11b | generate.mjs | expected notices via `emitTheiaBranding` at check time | ✓ WIRED | Notice-drop plant red naming the notice |
| verify-rebranding-docs | generate.mjs schema | field list from `config-schema.json` the generator reads | ✓ WIRED | No second hand-kept list; exact backtick-span match |
| verify.yml | verify-platform.sh | CI invokes `--quick`, the same gate developers run | ✓ WIRED | `verify-platform.sh --quick` step present; no restated rows to drift |
| verify.yml | generate.mjs | generate then `--check` in 02-06 order before readers | ✓ WIRED | `generate.mjs --check` step after generate step, order confirmed |

### Data-Flow / Behavioral Spot-Checks (re-run in this pass)

| Check | Command | Result |
|-------|---------|--------|
| VER-01 static layer | `node scripts/verify-manifest-literals.mjs` (+ `--self-test`) | PASS (151 files / 122 occ / 41 fresh; 7 plants) |
| VER-02 runtime dev-live | `node scripts/verify-branding-identity.mjs --variant dev` (+ `--self-test`) | PASS (6/6 surfaces; control + drift fault) |
| Trademark mechanical | `node scripts/verify-trademark-surface.mjs` (+ `--self-test`) | PASS (348 files clean; 5 plants) |
| Doc coverage | `node scripts/verify-rebranding-docs.mjs` (+ `--self-test`) | PASS (35/35, 4 cmds; 2 plants) |
| Legal-notice channel | `node scripts/verify-theia-branding.mjs` + preflight (+ `--self-test`s) | PASS (fragment/block/compile; 23 plants) |
| Generator freshness | `node scripts/generate.mjs --check` | PASS (52 files) |
| Residual scan (new prose in scope) | `node scripts/scan-brand-residue.mjs` | PASS (141 files) |
| Full static gate | `scripts/verify-platform.sh --quick` | PASS (95 PASS rows, 0 FAIL) |
| Release-live | `node scripts/verify-branding-identity.mjs --variant release` | NOT RUN (no `objdir-release/`, tier-3) → UAT-2 |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| VER-01 static brand-literal scan + stale-allowlist failure | ✓ SATISFIED | SC1 evidence above (06-01 mechanical + 06-03 trademark mechanical) |
| VER-02 runtime six-surface manifest-derived check | ✓ SATISFIED (dev-live) / release-live staged | SC2; staged release command + prerequisite in 06-02/06-06 SUMMARies + UAT-2 |
| DOC-01 rebranding guide, every field | ✓ SATISFIED (static) / stranger-run staged | SC3; coverage gate + stranger-read log + UAT-3 context |

### Anti-Patterns Found

None. `TODO|FIXME|XXX` grep clean across all six Phase 6 files. The only `placeholder` hits are the ratified "placeholder mark" artwork language (allowlisted with reason) and the `TO-BE-SIGNED` placeholders that are the deferred UAT-1 ritual itself — not stubs. No `return null/[]/{}` or console-only handlers introduced (checker + prose changes only, except the 06-04 channel work which ships with `tsc` compile proof via `verify-theia-branding`).

### Decision Coverage (06-CONTEXT `<decisions>`)

| Decision | Honored in | Evidence |
|----------|-----------|----------|
| Build on existing verification assets; new checks follow the registry pattern (derive-from-tree-and-compare, planted-fault self-test proving red) | All six plans | 6 new registry rows, every checker derives at check time, every self-test plants faults proven red with green control first |
| LOW-confidence trademark findings re-checked against primary policy text; named human review of every brand/ file recorded | 06-03 | Verbatim primary-source basis with URLs/versions/dates in `brand/HUMAN-REVIEW.md`; mechanical half green; sign-off ritual deferred → UAT-1 |

## Human Verification Required

4 items — see [06-UAT.md](06-UAT.md) for exact commands and expected output:

1. **UAT-1:** Trademark artwork ritual — open `brand/mark.svg`, confirm no third-party mark, sign `brand/HUMAN-REVIEW.md` (3 `TO-BE-SIGNED` placeholders)
2. **UAT-2:** Release-variant six-surface live proof after a release build exists (`objdir-release/` absent; tier-3)
3. **UAT-3:** CI-runtime drill — fresh-clone replay of generate → `--check` → `--quick` (+ first-push workflow green)
4. **UAT-4 (carried tier-3 follow-up from 06-04):** `verify-branding.mjs` needs a legal-notice-aware `assertDisplayForm` — its `NO_STOCK_IDENTITY` (`/Theia|Eclipse/i`) now fires on the mandated Eclipse attribution by design; changing it needs a browser build to validate

## Gaps Summary

**No gaps found.** Every automated criterion is proven with red-capable self-tests; the only open items are the deliberately deferred ritual and live drills (they need human eyes, a release build, and CI/fresh-clone runtime — none of which verification spends). No fix plans generated.

---
*Verified: 2026-09-04*
*Verifier: Muse Spark (gsd-verifier, end-of-roadmap batch)*
