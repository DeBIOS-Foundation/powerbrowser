---
phase: 07-sourcerer-as-downstream
verified: 2026-09-04T00:00:00Z
status: human_needed
score: 4/4 must-haves verified (static + generate level); 0 gaps; 3 live-build drills open for human
---

# Phase 7: Sourcerer as Downstream — Verification Report

**Phase Goal:** A stranger's config, living in their own repo, produces their fully branded browser from an untouched platform tree
**Requirements:** CFG-05, VER-03, DOC-02
**Plans:** 07-01, 07-02, 07-03, 07-04 (all complete)
**Verified:** 2026-09-04 (re-ran every Phase 7 gate in this pass: harness `--all` + `--self-test`, generate `--self-test` + `--check`, full `--quick`, both tree scans, branding-identity `--self-test`; no tier-3 builds)
**Status:** human_needed (all automated checks green; only the staged UNEXECUTED tier-3 live-build drills remain — see 07-UAT.md)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|--------------------|--------|----------|
| 1 | Pointing `PB_CONFIG_DIR` at an external directory builds from that config with zero edits inside the platform repo | ✓ VERIFIED | `scripts/generate.mjs` reads `PB_CONFIG_DIR` once (16 occurrences: `externalConfigDir()` derivation, `main()` overlay as `downstreamPath` into the existing `resolveConfig` merge path, `ASSET_ROOT` switch for every artwork read + inkscape argv). Generate `--self-test` PASS 41/41 incl. the 2 CFG-05 pins (valid external manifest resolves to its own values; missing manifest fails naming the variable). Harness proves path-independence per fixture (copies source to mkdtemp outside dir, never generates from inside the repo; snapshots `generated/` hashes, restores hash-equal). `verify-platform.sh` sanitizes with `unset PB_CONFIG_DIR` at the top (2 occurrences: unset + comment) so CI can never inherit a stray export. Default tree neutral after every drive in this pass: `--check` PASS (52 files fresh), `generated/branding/dev/configure.sh` carries `MOZ_APP_DISPLAYNAME="Power Browser Dev"`, `git status` clean under scripts/docs/generated |
| 2 | Sourcerer-equivalent external config + logo assets yield the fully branded product; Power Browser still builds with the downstream absent | ✓ VERIFIED (generate level) / HUMAN for live build | Synthetic fixture (`sourcerer-equivalent/`: fully distinct required keys — Northlight vendor pair, spaced display name, distinct basenames/distribution/legal/URLs/pins — plus original square diamond-ring artwork) drives EXPECTED-PASS at 66 assertions: exact bytes on dev+release configure.sh display lines, both variants' brand.ftl/brand.properties full-name agreement, frontend-config applicationName, legal-notice own-notice, upstream-pins tag, staged markSvg; required-slot platform values absent from `generated/` except the fixed forever-identifiers (E1 derived-invariance + E2 fixed-set exemptions). Neutrality re-proven in this pass with the downstream absent: full `--quick` PASS (all rows incl. the two new fixture rows), byte-identity PASS, manifest-literals PASS, branding-identity `--self-test` PASS, residual scan PASS (141 files). Live per-fixture build UNEXECUTED by scope (tier-3, ~1h each) → UAT-1/2/3 |
| 3 | Adversarial fixtures (spaced name, post-`m-browser` sort name, non-square logo, missing required key) each build+verify correctly or fail with the intended clear error — never silently wrong | ✓ VERIFIED | Five-row matrix re-run green in this pass via `--all` (5 fixtures, 210 assertions = 66+66+66+6+6): `spaced-name` (`Cedar Falls Browser`, two interior spaces, spaceless `vendor_machine` vs spaced `vendor_display`) PASS 66; `late-sort-name` (`Zebra Browser`, display/basename/binary/remoting all post-m-browser) PASS 66, spaced bytes exact on shell double-quoted assignment, desktop Name key, both locale files per variant, installer defines; `non-square-logo` (planted `viewBox="0 0 128 64"`) EXPECTED-FAIL naming `square` (marker file `expect-fail.txt`); `missing-required-key` (display_name removed, not blanked) EXPECTED-FAIL naming `identity.display_name`. Both fail paths assert non-zero exit, substring, plain-words next step, no stack, snapshot-equality (tree untouched). Harness `--self-test` 9/9 PASS proves the assertions go red on drift (wrong-substring, platform-value-swap, and copy-shape plants) |
| 4 | Both verification layers pass for every fixture, proving nothing keyed to Power Browser's or any fixture's own values | ✓ VERIFIED (generate level) / HUMAN for six-surface live | Static layer: `verify-manifest-literals.mjs` PASS in default mode after every fixture run (151 files, 122 occurrences all allowlisted, 41 entries all fresh — no fixture literal leaked into hand-written files) plus the harness's required-slot-absence and presence-iff-echoed assertions inside the 210. Runtime layer at generate level: per-fixture brand-full-name agreement (ftl vs properties vs manifest-derived expectation, both variants) inside the 210, plus `verify-branding-identity.mjs --self-test` PASS (proves derivation still manifest-driven after the 07-01 mechanism change; zero kept literals). Registered rows `verify-downstream-fixtures` + `-self-test` present in `verify-platform.sh` (glob-derived fixtures root, per-command env prefixes) and green via `--only` and inside full `--quick` in this pass. Full six-surface live proof per fixture stays tier-3, staged not run → UAT-1/2/3 |

**Score:** 4/4 truths verified (all static + generate-level evidence green; per-fixture live builds open)
**Gaps:** none — no BLOCKER, no stub, no unwired link found in this pass

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/generate.mjs` | `PB_CONFIG_DIR` external-config resolution (manifest overlay + asset root) | ✓ VERIFIED | `externalConfigDir()` + `ASSET_ROOT`/`markSvgAbs()` present (16 `PB_CONFIG_DIR` occurrences); `--self-test` 41/41 PASS in this pass |
| `scripts/verify-platform.sh` | Driver sanitization + registered downstream-fixture rows + self-test rows | ✓ VERIFIED | `unset PB_CONFIG_DIR` near top; two wrapper functions + two registry rows (`verify-downstream-fixtures`, `-self-test`); green via `--only` and inside `--quick` in this pass |
| `scripts/verify-downstream-fixture.mjs` | Fixture harness: stage-external, generate, assert, restore; `--all`, `--self-test`, expect-fail paths | ✓ VERIFIED | 677 lines (>120 min); `--self-test` 9/9 PASS, `--all` 5 fixtures / 210 assertions PASS in this pass |
| `fixtures/sourcerer-equivalent/` | Synthetic downstream manifest + original square artwork, all required keys distinct | ✓ VERIFIED | `configuration.toml` + `brand/mark.svg` (square `viewBox="0 0 128 128"`, one-line svg); EXPECTED-PASS 66 assertions in this pass |
| `fixtures/spaced-name/` + `late-sort-name/` | Hostile-but-valid manifests + original square artwork | ✓ VERIFIED | `Cedar Falls Browser` (two interior spaces) + `Zebra Browser` (post-m-browser sort); each EXPECTED-PASS 66 assertions in this pass |
| `fixtures/non-square-logo/` + `missing-required-key/` | Single-defect plants + `expect-fail.txt` markers | ✓ VERIFIED | Planted `viewBox="0 0 128 64"` + removed `identity.display_name`; markers `square` / `identity.display_name`; each EXPECTED-FAIL 6 assertions in this pass |
| `docs/REBRANDING.md` | External-config rebrand section, carry-tested | ✓ VERIFIED | `PB_CONFIG_DIR` section (outside-dir layout, prefixed generate/check, generated-stays-in-tree, upstream-pins flow, fixed identifiers, profile-migration note); coverage gate 35/35 + `--self-test` PASS in this pass |
| `scripts/verify-rebranding-docs.mjs` | Coverage gate still green after guide edit | ✓ VERIFIED | Check + `--self-test` PASS in this pass; checker correctly untouched (new section adds no load-bearing command) |
| `fixtures/README.md` | Per-fixture tier-3 drill blocks, UNEXECUTED + acceptance mapping | ✓ VERIFIED (staged) | 3 drill blocks each labeled UNEXECUTED with cost reason + default-regenerate close + reading-the-output note; live execution is the human item → 07-UAT.md |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| generate.mjs `main()` | `resolveConfig` merge path | `downstreamPath` from `PB_CONFIG_DIR`, no new merge code | ✓ WIRED | External-manifest self-test case resolves to staged values through the shipped function |
| generate.mjs artwork reads | `ASSET_ROOT` | `MARK_SVG_ABS` + `readMarkSvgElement` + inkscape argv flow through one root | ✓ WIRED | Task-2 proof at plan time (external raster valid 32x32 PNG differing from platform hash); squareness plant refuses before any write |
| verify-downstream-fixture | generate.mjs | Child-process `PB_CONFIG_DIR=<stage>` generate + imported `resolveConfig` for expectations | ✓ WIRED | Expectations derived per run from the staged manifest, never kept in the harness; wrong-substring plant goes red |
| verify-downstream-fixture | verify-branding-identity | Mirrored brand-full-name read contract (trimmed selection + agreement) | ✓ WIRED | Per-variant ftl-vs-properties-vs-manifest agreement asserted for every EXPECTED-PASS fixture |
| verify-platform.sh | verify-downstream-fixture | Registry rows drive `--all` + `--self-test` with per-command env | ✓ WIRED | Both rows green via `--only` and inside `--quick` in this pass; driver-level `unset` prevents inherited-env rebrand |
| REBRANDING.md | verify-rebranding-docs | Field list from `config-schema.json`, walkthrough commands as code spans | ✓ WIRED | 35/35 fields, 4 commands PASS; removal plants red |
| fixtures/README.md drills | verify-branding-identity | `--expect-brand-full-name` / `--expect-display-name` overrides + direct artifact assertions | ✓ WIRED (staged) | Reading note documents the two derivation-by-design delta rows; direct `test`/`grep` lines assert the staged values |

### Data-Flow / Behavioral Spot-Checks (re-run in this pass)

| Check | Command | Result |
|-------|---------|--------|
| CFG-05 mechanism pins | `node scripts/generate.mjs --self-test` | PASS (41 planted faults, incl. 2 external-config cases) |
| Harness discrimination | `node scripts/verify-downstream-fixture.mjs --self-test` | PASS (9 planted cases) |
| All-fixture proof | `node scripts/verify-downstream-fixture.mjs --all --fixtures-root <fixtures>` | PASS (5 fixtures, 210 assertions) |
| Generator freshness | `node scripts/generate.mjs --check` | PASS (52 files match) |
| Default neutrality | `grep MOZ_APP_DISPLAYNAME generated/branding/*/configure.sh` + `git status` (scripts/docs/generated) | `Power Browser Dev` / `Power Browser`; clean |
| Static layer | `node scripts/verify-manifest-literals.mjs` | PASS (151 files / 122 occ / 41 fresh) |
| Runtime derivation | `node scripts/verify-branding-identity.mjs --self-test` | PASS (control + scratch-manifest drift fault) |
| Byte identity | `node scripts/verify-generated-identity.mjs` | PASS (34 files byte-identical, `generated/` untracked) |
| Doc coverage | `node scripts/verify-rebranding-docs.mjs` (+ `--self-test`) | PASS (35/35, 4 cmds) |
| Residual scan (all new prose in scope) | `node scripts/scan-brand-residue.mjs` | PASS (141 files) |
| Full static gate | `scripts/verify-platform.sh --quick` | PASS (all checks, 0 FAIL, incl. both new fixture rows) |
| Per-fixture live builds | staged drill blocks in `fixtures/README.md` | NOT RUN (tier-3, ~1h each) → 07-UAT.md |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CFG-05 external config dir so downstreams live in their own repo | ✓ SATISFIED | SC1 evidence above (mechanism + pins + sanitization + neutrality) |
| VER-03 adversarial fixtures prove nothing keyed to one config's values | ✓ SATISFIED (generate level) / live builds staged | SC3 + SC4; five-row matrix + 210-assertion `--all`; live half in UAT-1/2/3 |
| DOC-02 Sourcerer reproduced as pure downstream, zero platform edits | ✓ SATISFIED (synthetic stand-in at generate level) / live build staged | SC2; synthetic fixture + harness + carry-tested guide; no real-world marks in tree (residual scan green); live half in UAT-1/2/3 |

### Anti-Patterns Found

None. `TODO|FIXME|XXX|HACK|PLACEHOLDER` grep clean across the harness and all fixture sources. The `console.log` hits in `scripts/verify-downstream-fixture.mjs` are the harness's own PASS/FAIL reporting lines, and the two `return null` hits are legitimate helper returns (`discoverFixtures` on missing root, non-exempt-line predicate) — neither flows to rendered output. No `return []/{}` stubs, no empty handlers, no hardcoded empty data. Failure copy names the variable/rule, states the problem in plain words, ends with the re-run next step, no stack, no host path.

### Decision Coverage (07-CONTEXT `<decisions>`)

| Decision | Honored in | Evidence |
|----------|-----------|----------|
| All implementation choices at Claude's discretion (discuss skipped) | Plans 07-01..07-04 | 4/4 plans executed; mechanism, harness, adversarial set, registry rows, guide section, staged drills all landed per ROADMAP SCs |
| Build on known assets: `PB_CONFIG_DIR` mechanism, `generated/` gitignored root, both verification layers, `docs/REBRANDING.md`, ROADMAP-named adversarial classes | 07-01 (mechanism), 07-02 (harness + synthetic), 07-03 (four hostile classes), 07-04 (layers proof + guide carry-through + drills) | Every named asset used; `generated/` stays untracked in the platform tree (byte-identity PASS); all four adversarial classes committed at intended outcomes |
| Fixtures stand in; no Sourcerer marks in this tree (residual-brand scan gate) | 07-02..07-04 | Invented brand families only (Northlight / Cedar Falls / Zebra); residual scan PASS (141 files) with all new prose in scope; `inventory/brand-tokens.json` remains the only file allowed to name the originating product |

## Human Verification Required

3 items — see [07-UAT.md](07-UAT.md) for exact commands and expected output. All are the deliberately staged, UNEXECUTED tier-3 per-fixture live-build drills from `fixtures/README.md` (static-plus-generate proof is this phase's scope; each live build costs roughly an hour):

1. **UAT-1:** sourcerer-equivalent (Northlight) live build + six-surface identity proof + default regenerate
2. **UAT-2:** spaced-name (Cedar Falls) live build + six-surface identity proof + default regenerate
3. **UAT-3:** late-sort-name (Zebra) live build + six-surface identity proof + default regenerate

## Gaps Summary

**No gaps found.** Every automated criterion is proven with red-capable self-tests (41 generator pins, 9 harness plants, both tree scans, byte-identity, doc-coverage gate); the default tree is neutral after every drive; the only open items are the deliberately staged live-build drills (they need tier-3 build time verification never spends). No fix plans generated.

---
*Verified: 2026-09-04*
*Verifier: Muse Spark (gsd-verifier, end-of-roadmap batch)*
