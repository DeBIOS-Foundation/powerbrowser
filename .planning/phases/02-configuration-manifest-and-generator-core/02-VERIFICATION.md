---
phase: 02-configuration-manifest-and-generator-core
verified: 2026-09-01T00:00:00Z
status: passed-with-corrections
corrected: 2026-09-04
gaps_found_after_verification: [G-02-11, G-02-12]
gaps_closed_by: [02-08]
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 2: Configuration Manifest and Generator Core Verification Report

**Phase Goal:** A downstream author can express their entire brand in `configuration.toml` +
`brand/`, and one generator turns it into the cheap build surfaces.
**Verified:** 2026-09-01
**Status:** passed
**Re-verification:** No — initial verification

All commands below were run live against the working tree, including negative cases against a
scratch manifest held outside the tracked `configuration.toml` (`resolveConfig()` was invoked
directly with a scratch path as `defaultsPath`, since the CLI itself has no `--config` flag —
this exercises the exact same parse/mask/merge/validate pipeline the CLI uses). The tracked
`configuration.toml` was never modified; `git status --short` was checked before and after every
mutation and stayed limited to the pre-existing unrelated items called out in the task (staged
`01-LEARNINGS.md`, modified `01-VERIFICATION.md`, untracked `.gsd/`, `.planning/estimation-calibration.json`,
`.planning/state.json`).

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running the generator against Power Browser's own `configuration.toml` reproduces Phase 1's hand-written env script, `.mozconfig`, and desktop files byte-for-byte, and those files are no longer edited by hand | VERIFIED | `node scripts/generate.mjs` writes 5 files under `generated/`; `cmp` against each of `.mozconfig`, `powerbrowser/branding/{dev,release}/configure.sh`, `powerbrowser/powerbrowser{,-release}.desktop` reports IDENTICAL for all five. `node scripts/verify-generated-identity.mjs` independently confirms: `PASS -- 5 generated file(s) are byte-identical to their hand-written counterparts, and generated/ is untracked`. Simulated a fresh clone by `rm -rf generated/` and re-ran the identity gate — still PASS (comparand is emitted to its own `mkdtemp`, never read from `generated/`), and `generate.mjs --check` correctly reported the distinct absent-directory message rather than crashing or silently passing. That simulation exercised the absent-output case only, not a relocated checkout: every check this run performed, it performed at this checkout's single path, so it could not see G-02-11, which 02-UAT.md test 11 found by running a genuine clone at a different path. |
| 2 | Generation hard-fails and names the offending key when any identity field or legal field is unset — no build can proceed under Power Browser's mark by omission | VERIFIED | `scripts/lib/config-schema.json` marks all of `product.vendor_machine`, `product.vendor_display`, every `identity.*` key, and every `legal.*` key as `required: true`. Negative test: a scratch manifest with `identity.display_name = "   "` (whitespace-only) run through `resolveConfig()` returned `failures: ["identity.display_name is not set. ..."]` — confirming the unset test is a trim, not merely an absence check. `generate.mjs --self-test` also plants and confirms red on a missing required key, a whitespace-only identity value, and a partial identity table (9/9 self-test cases pass). |
| 3 | A basename or binary name violating `^[a-z][a-z0-9-]{1,31}$` is rejected at generate time with a clear message, never silently sanitized into an invalid `MOZ_APP_NAME` | VERIFIED | Negative test: scratch manifest with `identity.app_basename = "Power Browser 2!"` returned a rejection naming the key, quoting the offending value, and stating the character-set/length/leading-letter rule in words (`^[a-z][a-z0-9-]{1,31}$`, with a worked example) — no lowercased/hyphenated auto-corrected value was ever written. `generate.mjs --self-test`'s "invalid basename" case independently confirms the same. |
| 4 | Cosmetic fields left unset fall back to Power Browser defaults that are themselves a `configuration.toml` (one merge code path), with every applied default echoed at generate time | VERIFIED | `node scripts/generate.mjs` on the real manifest echoes exactly the cosmetic keys left unset (`product.description`, `product.homepage`, `theia.default_theme`, `variants`), each as one sorted stderr line. Adjacency-edge negative test: a scratch downstream manifest that explicitly sets `theia.default_theme = "dark"` (same value as the default) does NOT appear in the returned `defaulted` array — proving downstream-set values are never echoed as inherited defaults even when the resolved value is unchanged. `resolveConfig()`'s single defaults path is `configuration.toml` itself (masked of required keys), confirmed by reading the merge code (`maskDefaults`/`mergeLayers` in `scripts/generate.mjs`) — one merge code path, no separate defaults file. |
| 5 | Everything the generator writes lands under a single gitignored `generated/` root, nothing generated is committed, and `generate --check` fails when that output is stale | VERIFIED | `.gitignore` line 31: `/generated/`. `git check-ignore -v generated/` confirms the match; `git ls-files generated/` returns 0 tracked files. Staleness test: appended a stray line to `generated/.mozconfig`, ran `generate.mjs --check` — exited 1, named `generated/.mozconfig -- differs, from line 12`; restored the byte-identical content, re-ran `--check` — exited 0. `verify-generated-identity.mjs --self-test` (7 planted faults, all five emitters plus a surplus and a missing target) and `generate.mjs --self-test`'s own "stale generated output" case both independently confirm. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/lib/toml.cjs` | Vendored TOML parser | VERIFIED | Present, imported by `generate.mjs` |
| `scripts/lib/config-schema.json` | Single schema table | VERIFIED | Present; identity + legal keys `required: true`; basename/binary/remoting_name carry the `^[a-z][a-z0-9-]{1,31}$` regex |
| `configuration.toml` | Power Browser's brand + defaults layer | VERIFIED | Present at repo root, untouched by any negative test |
| `scripts/generate.mjs` | Parse/reject/validate/emit/write pipeline, `--check`, `--self-test` | VERIFIED | 5-target frozen table, `resolveConfig`/`TARGETS`/`REPO_ROOT` named exports, `IS_MAIN` guard, 9-case self-test, all passing |
| `scripts/verify-generated-identity.mjs` | Byte-identity gate | VERIFIED | mkdtemp-based comparand, 7-case self-test, all passing |
| `brand/mark.svg` | Assets half of CFG-01's rebrand surface | VERIFIED | Present; `powerbrowser/branding/mark.svg` no longer exists (single home) |
| `.gitignore` | `/generated/` root-anchored entry | VERIFIED | Line 31 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/generate.mjs` | `scripts/lib/toml.cjs` | ESM import of parser | WIRED | `generate.mjs` runs and parses `configuration.toml` successfully |
| `scripts/generate.mjs` | `scripts/lib/config-schema.json` | single schema read by unknown-key check, masker, validator | WIRED | Confirmed by negative tests exercising unknown-key rejection, required-field rejection, and basename regex rejection — all three paths consult the same schema |
| `scripts/verify-generated-identity.mjs` | `scripts/generate.mjs` | named import of `TARGETS`/`resolveConfig` | WIRED | Confirmed the gate derives its emitter set from the generator rather than a hand-kept copy (self-test plants a surplus/missing target and both go red) |
| `scripts/verify-platform.sh` (`--quick`) | `scripts/generate.mjs`, `scripts/verify-generated-identity.mjs` | 4 registry rows | WIRED | `generated-byte-identity`, `generated-byte-identity-self-test`, `generate-check`, `generate-self-test` all present inside the `--quick` `CHECKS` array (confirmed by `sed`-inspecting the array boundary) and all PASS in a live `scripts/verify-platform.sh --quick` run |
| `.github/workflows/rebase-upstream.yml` | `scripts/generate.mjs`, `scripts/verify-generated-identity.mjs` | 3 run steps, generate → check → byte-identity order | WIRED | Confirmed by direct grep: lines 95/98/101 run in exactly that order |
| `scripts/verify-branding-preflight.mjs` | `inventory/brand-tokens.json` | independent expectation source | WIRED (prohibition upheld) | Confirmed the gate still reads `brand_display_expectations` from `inventory/brand-tokens.json` and contains no reference to `configuration.toml` |

### Data-Flow Trace (Level 4)

Not applicable in the UI-rendering sense — this phase is a CLI generator, not a rendered
component. The equivalent trace (manifest key → schema → merge → emitter → write path) was
exercised directly: an edited scratch manifest key change flowed through `resolveConfig()` to a
changed `failures`/`defaulted` result in every negative test above, and a corrupted `generated/`
file was correctly detected as stale by `--check`. No static/hardcoded fallback was found
standing in for a real manifest read.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Generator produces byte-identical output | `node scripts/generate.mjs` then `cmp` against 5 tracked files | All 5 IDENTICAL | PASS |
| `--check` detects freshness | `node scripts/generate.mjs --check` (clean tree) | exit 0 | PASS |
| `--check` detects staleness | corrupt `generated/.mozconfig`, re-run `--check` | exit 1, names file and line | PASS |
| `--check` handles absent `generated/` | `rm -rf generated/`, re-run `--check` | exit 1, distinct "nothing has been generated" message, not a crash | PASS |
| Generator self-test | `node scripts/generate.mjs --self-test` | `PASS -- 9 planted faults all behaved as pinned` | PASS |
| Identity gate self-test | `node scripts/verify-generated-identity.mjs --self-test` | `PASS -- 7 planted faults all went red naming the drift` | PASS |
| Unset identity field (negative, scratch manifest) | `resolveConfig()` with whitespace-only `display_name` | Rejected naming `identity.display_name` | PASS |
| Invalid basename (negative, scratch manifest) | `resolveConfig()` with `"Power Browser 2!"` as `app_basename` | Rejected, quoting value and regex, no silent sanitization | PASS |
| Unknown key (negative, scratch manifest) | `resolveConfig()` with `product.totally_unknown_key` | Rejected naming the offending key | PASS |
| Adjacency edge (negative, scratch manifest) | downstream value equals default value | Not echoed in `defaulted` array | PASS |
| Full registry | `scripts/verify-platform.sh --quick` | `PASS -- all checks passed` (28/28 rows, including all 4 new phase-2 rows) | PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist for this phase and none are referenced in the plans
or summaries. Skipped — not applicable.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| CFG-01 | 02-01, 02-02, 02-03, 02-04, 02-05 | `configuration.toml` + `brand/` are the only rebrand inputs | SATISFIED | `configuration.toml` at repo root; `brand/mark.svg` present, old location removed; byte-identity gate green; five build surfaces reproduced from the manifest alone |
| CFG-02 | 02-01, 02-03, 02-06 | Identity/legal fields required, hard-fail when unset | SATISFIED | Schema `required: true` on all identity/legal keys; negative test confirms hard-fail naming the key |
| CFG-03 | 02-01, 02-04, 02-06 | Basename/binary validated against regex, never silently sanitized | SATISFIED | Negative test confirms rejection with clear message, no auto-correction |
| CFG-04 | 02-03 | Cosmetic fields fall back to Power Browser defaults, one merge path, every default echoed | SATISFIED | Live run echoes exactly the unset cosmetic keys; adjacency-edge negative test confirms downstream-set values matching the default are never echoed |
| GEN-04 | 02-01, 02-04, 02-05, 02-06 | Generated output never committed, single gitignored root, `--check` verifies freshness | SATISFIED | `.gitignore` entry confirmed; `git ls-files generated/` empty; staleness/absence negative tests confirm `--check` behavior |

Requirement IDs declared across the six plans (`CFG-01, CFG-02, CFG-03, CFG-04, GEN-04`) match
the phase's declared requirement set exactly. REQUIREMENTS.md's traceability table already lists
all five as "Phase 2 | Complete" — consistent with the evidence above. No orphaned requirements
found for Phase 2.

### Anti-Patterns Found

None. Scanned `scripts/generate.mjs`, `scripts/verify-generated-identity.mjs`,
`scripts/lib/config-schema.json`, and `configuration.toml` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER`
— zero matches in any phase-2 file.

> **Corrected 2026-09-04 (Phase 2 UAT, test 11).** The marker scan above stayed clean while the
> UAT found the anti-pattern a marker scan cannot: an expectation hand-kept as an absolute
> literal (`repo_root` in `inventory/brand-tokens.json`, mirrored in the tracked `.desktop`
> files), which made the preflight a tautology with respect to location (G-02-12). It violated
> the CLAUDE.md rule to derive from the tree and compare rather than hand-keep an expectation
> list. Closed by 02-08, which deleted the `repo_root` key and derives the preflight's
> expectation from the token instead.

### Deferred Items

The one item logged in `deferred-items.md` under "02-03 — scripts/generate.mjs is not a
verify-platform.sh row" was resolved within this same phase: plans 02-05 and 02-06 registered
all four rows (`generated-byte-identity`, `generated-byte-identity-self-test`, `generate-check`,
`generate-self-test`) in `scripts/verify-platform.sh`'s `--quick` array, confirmed present and
passing in the live run above. No open deferrals remain for Phase 2.

The unrelated `.planning/WINDOWS.md` frontmatter-count discrepancy noted in the same file is
outside this phase's scope and is not a Phase 2 gap.

### Human Verification Required

None. Every truth was verified programmatically with live command execution, including negative
cases against a scratch manifest.

### Gaps Summary

No gaps found. All five ROADMAP success criteria are independently reproducible in the live
tree: byte-identity holds against a fresh-clone simulation, both hard-fail paths (unset
identity/legal, invalid basename) reject with clear messages and no silent transformation, the
defaults-echo mechanism is a single merge path with the adjacency edge correctly handled, and
`generated/` is genuinely gitignored with `--check` correctly distinguishing fresh/stale/absent.
All four newly-registered `verify-platform.sh --quick` rows pass in a full `--quick` run
alongside the pre-existing 24 rows (28/28 total). The working tree was left clean — no phase-2
file was mutated by this verification pass.

### Gaps found after this report

> **Corrected 2026-09-04 (Phase 2 UAT, 2026-09-02).** This report said "No gaps found" above
> while two major gaps were open against the same phase. The run could not see them because
> every check it ran, it ran at one checkout path — this machine's — and both gaps are
> invisible there:
>
> - **G-02-11** (major, 02-UAT.md test 11): "On a clean clone with no node_modules and no
>   network, scripts/verify-platform.sh --quick runs to completion green" — failed, because the
>   tracked `.desktop` files carried this checkout's absolute path while the emitter rebuilt it
>   from the live repo root.
> - **G-02-12** (major, 02-UAT.md test 11): "A gate that checks the tracked .desktop entries
>   catches one that is wrong for the checkout it is in" — failed, because the preflight built
>   its expectation from the same hand-kept `repo_root` literal the tracked files carried, a
>   tautology with respect to location.
>
> Both were closed by plan **02-08** under the ratified design in `02-DESIGN-G-02-11.md`
> (`option-4-placeholder`): emitter and tracked files carry `@POWERBROWSER_REPO_ROOT@`,
> `foreign_checkout_byte_identity_exit: 0` and `foreign_checkout_preflight_exit: 0` observed at
> a relocated checkout. The requirement traceability table above was considered and deliberately
> left: G-02-11 and G-02-12 were defects in the GATES over CFG-01..04 and GEN-04, not in the
> requirements themselves, so marking a requirement incomplete on this evidence would misreport
> the phase in the opposite direction.

---

_Verified: 2026-09-01_
_Verifier: Claude (gsd-verifier)_
