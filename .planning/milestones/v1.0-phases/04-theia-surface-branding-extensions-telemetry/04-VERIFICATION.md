---
phase: 04-theia-surface-branding-extensions-telemetry
verified: 2026-09-04T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Fixture rebrand + app-bundle build + live render drill (welcome, about, favicon, theme)"
    expected: "Welcome tab, about dialog, favicon and default theme show the fixture values with zero modified theia/**/src/**/*.ts"
    why_human: "No app-bundle build or browser boot ran in this pass (per instruction: no builds); static gates prove emission and read sites but never observed a rendered pixel"
  - test: "Declared-extension download + bundle + load drill (one real pinned entry, then revert)"
    expected: "yarn download:plugins lands plugins/<id>.vsix, extension-pins passes, theia build consumes it, the extension contributes at runtime; unpinned/unreachable entries fail loudly"
    why_human: "Full theia build plus runtime contribution check needs the theia dev shell and network; unreachable-URL loud failure was observed by the executor but not re-run here"
  - test: "Telemetry live-delivery drill against a local collector at each of the four levels, then scripts/verify-platform.sh --gate"
    expected: "Level off sends zero POSTs; crash/error/all deliver the correct event kinds with batching and retry; --gate (browser-boot layers incl. verify-endpoints layer 1) green"
    why_human: "Needs a running sidecar plus a collector endpoint; layer 1 needs the tier-3 Gecko build — none runnable in this static pass"
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  status: human_needed
---

# Phase 4: Theia Surface — Branding, Extensions, Telemetry Verification Report

**Phase Goal:** Everything on the Theia side — product branding, declared extensions, telemetry delivery — is driven by `configuration.toml` with no TypeScript recompile for a rebrand
**Verified:** 2026-09-04
**Status:** human_needed
**Re-verification:** No — initial verification

All commands below were run live against the working tree by the verifier.
SUMMARY.md claims were treated as leads, not evidence: every must-have was
re-proven with independent reads, greps, gate executions, and one directly
re-run unit suite. No builds were run (per instruction); no state was
mutated (`git status` on tracked phase-4 code paths is clean apart from
pre-existing unrelated entries).

MVP-mode note: ROADMAP marks Phase 4 `Mode: mvp`, but its goal is not in
user-story form ("As a …, I want …, so that …"), so no User Flow Coverage
table is derivable. Verified against the four ROADMAP success criteria as
the must-haves, per instruction. Recommend running `/gsd mvp-phase 4` if
the MVP framing is wanted retroactively — non-blocking.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Welcome tab, about dialog, product name, logo, default theme come from generated frontend config keys; a rebrand needs no TypeScript recompile | VERIFIED (static; live render pending, see Human Verification) | `generated/theia-frontend-config.json` = `{"applicationName": "Power Browser", "defaultTheme": "dark"}`; welcome widget reads `FrontendApplicationConfigProvider.get().applicationName` (line 86) + `readBrandingConfig().welcomeText/repoUrl/markSvg` (lines 100-108); about dialog same shape (lines 62-86); favicon reads channel mark (line 24); `node scripts/generate.mjs --check` PASS (52/52); `node scripts/verify-theia-branding.mjs` PASS; `verify-branding-preflight` green inside `--quick`; zero debt markers in branding sources |
| 2 | Extensions declared in `configuration.toml` (Open VSX id or URL + pin) download and bundle at build time; unpinned/unreachable entries fail loudly | VERIFIED (static; bundle+load drill pending, see Human Verification) | `theia/applications/browser/package.json:100-101`: `"download:plugins": "theia download:plugins --packed"`, build chains `rebuild && download:plugins && theia build` with no `--ignore-errors` (grep confirms zero occurrences); entry-free manifest → `generated/theia-plugins.json` = `{}` and no `theiaPlugins` key in tracked package.json (strict empty-means-no-block); `node scripts/verify-extension-pins.mjs` PASS; duplicate-id and non-archive-URL rejection in `validateExtensionElements` |
| 3 | Level `off` (default) sends nothing; a set level batches/retries to the configured endpoint honoring off/crash/error/all | VERIFIED (static; live delivery pending, see Human Verification) | `generated/theia-telemetry.json` = `{"level": "off", "endpoint": null}` on the shipped manifest; unit suite re-run live: 5/5 PASS (off-sends-nothing with same-run on-level control, size flush, interval flush, retry-then-drop, runtime level change); sender core has bounded backoff (`maxAttempts` default 3, injectable clock/fetch); fail-closed gating (unknown level → off, enabled-without-endpoint drops with diagnostic); `node scripts/verify-telemetry.mjs` PASS; extension composes (`powerbrowserTelemetry` block + dep + `build:extensions` entry) |
| 4 | Manifest telemetry/URL hosts are allowlisted and Mozilla telemetry/crash prefs follow the manifest | VERIFIED (static; installed-binary layer pending, see Human Verification) | `node scripts/verify-theia-endpoints.mjs` PASS (fragment pin, missing-coverage and marked-stale plants both red-naming per `--self-test` inside `--quick`); shipped `firefox-branding.js` carries blanked `toolkit.telemetry.server` + `breakpad.reportURL` (lines 56-57) with single-source derivation owned by `mozillaEndpointPrefs` (`generate.mjs:2181`, spliced at `DYNAMIC_PREF_ANCHOR`); `generated/endpoint-hosts.json` = `["powerbrowser.org"]`; byte-identity/52-file `--check` green |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `generated/theia-frontend-config.json` | applicationName + defaultTheme fragment | VERIFIED | On disk, correct values, `--check` green |
| `generated/theia-branding.json` | texts + repo URL + mark SVG fragment | VERIFIED | On disk (null texts shipped by design, D-04-04-04); branding gate PASS |
| `generated/theia-plugins.json` | theiaPlugins fragment | VERIFIED | `{}` on entry-free manifest; pin gate PASS |
| `generated/theia-telemetry.json` | level + endpoint fragment | VERIFIED | `off`/null shipped; telemetry gate PASS |
| `generated/endpoint-hosts.json` | sorted manifest hosts fragment | VERIFIED | `["powerbrowser.org"]`; endpoints gate PASS |
| `theia/extensions/branding/.../powerbrowser-branding-config.ts` | shared synchronous channel reader | VERIFIED | Imported by welcome, about, favicon; `tsc` covered by branding gate |
| `theia/extensions/telemetry/` | batching sender + preference + logger + module + suite | VERIFIED | Suite re-run 5/5 live; `tsc -b` covered by telemetry gate |
| `scripts/verify-theia-branding.mjs` | branding pin gate + self-test | VERIFIED | PASS; self-test row PASS in `--quick` |
| `scripts/verify-theia-endpoints.mjs` | allowlist coverage gate + self-test | VERIFIED | PASS; self-test row PASS in `--quick` |
| `scripts/verify-extension-pins.mjs` | pin gate + self-test | VERIFIED | PASS; self-test row PASS in `--quick` |
| `scripts/verify-telemetry.mjs` | fragment/block/compile/suite gate + self-test | VERIFIED | PASS; self-test row PASS in `--quick` |
| `scripts/lib/config-schema.json` | extensions/telemetry/theia/urls keys | VERIFIED | All keys present per plan diffs; 39 generate self-test faults green via `--quick` |
| `powerbrowser/endpoint-allowlist.json` | breakpad entry + manifest-driven reasons | VERIFIED | New entry + reason updates; endpoints gate agrees with allowlist expects |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `configuration.toml` | `generated/theia-*.json` + `endpoint-hosts.json` | `scripts/generate.mjs` TARGETS rows | WIRED | `--check` PASS 52/52 on the live tree |
| `generated/theia-frontend-config.json` | `theia/applications/browser/package.json` | surgical block apply (applicationName, defaultTheme) | WIRED | theia-branding gate asserts block/key equality |
| `generated/theia-branding.json` | same `package.json` | surgical `powerbrowserBranding` block | WIRED | Same gate; propagation drill showed add-only diffs |
| `generated/theia-plugins.json` | same `package.json` | surgical `theiaPlugins` block | WIRED | extension-pins asserts fragment + block equality |
| `generated/theia-telemetry.json` | same `package.json` | surgical `powerbrowserTelemetry` block | WIRED | telemetry gate asserts fragment + block equality |
| welcome/about/favicon | runtime channel | `FrontendApplicationConfigProvider` + `readBrandingConfig` | WIRED | Grep-confirmed read sites above; preflight sources-clean sections green |
| sender | `telemetry.telemetryLevel` preference | `PreferenceService.get(name, manifestLevel)` per event | WIRED | Level-matrix test (runtime change, no restart) green |
| `[telemetry]`/`[urls]` | Gecko pref files | `mozillaEndpointPrefs` splice at anchor | WIRED | Regenerated pref files carry blanked prefs; endpoints gate asserts allowlist agreement |
| build | `plugins/<id>.vsix` | `download:plugins --packed`, no `--ignore-errors` | WIRED | Script grep-confirmed; 404 loud-failure observed by executor (not re-run here — network) |

### Data-Flow Trace (Level 4)

Manifest-value → schema → emitter → fragment → tracked block → runtime
read was traced for all five fragments: every fragment on disk carries the
shipped-manifest value; every tracked block equals its fragment (four pin
gates green); every runtime read site resolves through the provider or the
shared reader with a compiled fallback (grep-confirmed). No static return
stands in for a manifest read. The 04-04 propagation drill (fixture
rebrand, manifest-only edit, `grep -rn "Acme Browser" theia/**/src`
empty) is recorded in 04-04-SUMMARY.md and was not re-run here — it
requires generate + file writes against a fixture manifest, which this
static pass deferred to the human drill in 04-UAT.md.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Freshness check (52 targets) | `node scripts/generate.mjs --check` | PASS, 52/52 match | PASS |
| Branding gate | `node scripts/verify-theia-branding.mjs` | PASS | PASS |
| Endpoints gate | `node scripts/verify-theia-endpoints.mjs` | PASS | PASS |
| Extension-pins gate | `node scripts/verify-extension-pins.mjs` | PASS | PASS |
| Telemetry gate (incl. suite + tsc) | `node scripts/verify-telemetry.mjs` | PASS | PASS |
| Telemetry unit suite, direct | `node theia/extensions/telemetry/test/telemetry-sender.test.mjs` | SUITE PASS, 5/5 | PASS |
| Full `--quick` registry | `scripts/verify-platform.sh --quick` | PASS, all rows incl. 8 new Phase-4 rows | PASS |
| No `--ignore-errors` in plugin download path | grep over theia package.jsons | Zero matches; `--packed` wired | PASS |
| Shipped prefs blanked | grep `firefox-branding.js` (release) | `toolkit.telemetry.server ""`, `breakpad.reportURL ""` | PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` files exist for this phase and none are
referenced in the plans or summaries. Skipped — not applicable.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| GEN-05 | 04-01, 04-04 | Theia branding via frontend config keys, no TS recompile | SATISFIED (static); live render pending | Fragments, read sites, gates all green; fixture render drill is human item 1 |
| EXT-01 | 04-02 | Declared extensions downloaded + bundled; loud failure | SATISFIED (static); bundle+load pending | Schema, emitter, download wiring, pin gate green; real-entry drill is human item 2 |
| TEL-01 | 04-03 | Level + endpoint declared in manifest | SATISFIED | Schema enum + https pattern, shipped `off`, 34-case generate self-test green |
| TEL-02 | 04-03 | Batching sender honoring level; off sends nothing | SATISFIED (static); live delivery pending | Suite 5/5 re-run live; app-composition + POST drill is human item 3 |
| TEL-03 | 04-04 | Hosts allowlisted; Mozilla prefs repointed/disabled | SATISFIED (static); installed-binary layer pending | Endpoints gate + pref splice green; layer-1 on built binary rides human item 3 |

Requirement IDs declared across the four plans match the phase's declared
set (GEN-05, EXT-01, TEL-01, TEL-02, TEL-03) exactly. No orphaned
requirements for Phase 4.

### Anti-Patterns Found

No `TODO|FIXME|XXX|TBD|PLACEHOLDER|Not implemented` markers in the six
phase-4 gate/extension sources grepped. No stubs found: every read site
resolves through the runtime channel with a boot fallback, every emitter
row is `--check`-covered, every gate carries a `--self-test` with
red-observed plants.

### Human Verification Required

### 1. Fixture rebrand + app-bundle build + live render drill

**Test:** Apply a fixture rebrand (edit ONLY `configuration.toml`:
`display_name`, `[theia]` theme + `welcome_text`, `[telemetry]`
level + endpoint, one `[urls]` value, one real `[[extensions]]`
entry with bootstrapped pin; swap `brand/mark.svg` for a square
fixture SVG), then run `node scripts/generate.mjs`, surgically apply
the five blocks into `theia/applications/browser/package.json`,
copy the regenerated pref files over the tracked ones, add the
fixture hosts to `powerbrowser/endpoint-allowlist.json`, run
`nix develop .#theia --command bash -c "cd theia && yarn build"`,
then `node scripts/verify-theia-branding.mjs` and
`node scripts/verify-theia-endpoints.mjs`, start the app, and open
the welcome tab + about dialog.
**Expected:** Both gates PASS; welcome/about show the fixture
name/texts/mark; favicon is the fixture mark; theme follows the
fixture; `git status --porcelain theia/` shows zero modified
`src/**/*.ts`. Then revert every fixture value, regenerate, and
restore `package.json` + pref files + allowlist (`--check` green).
**Why human:** Needs the theia dev shell, a ~minute app-bundle build,
and eyes on rendered pixels — none available in this pass.

### 2. Declared-extension download + bundle + load drill

**Test:** With the fixture entry from drill 1 in place, run
`nix develop .#theia --command bash -c "cd theia && yarn download:plugins"`,
then `node scripts/verify-extension-pins.mjs`, complete the
`yarn build`, start the app, and confirm the extension loads and
contributes. Also point one entry at an unreachable URL and confirm
the build step fails naming the entry id. Then revert.
**Expected:** `plugins/<id>.vsix` lands byte-identical (sha256 =
pin); pin gate PASS; extension visible at runtime; unreachable URL
fails loudly naming the entry.
**Why human:** Needs network + theia shell + built sidecar; the
unreachable-URL failure was observed by the executor, not re-run here.

### 3. Telemetry live-delivery drill + full gate

**Test:** Set `[telemetry] level = "all"`, endpoint at a local
collector; regenerate + surgical apply; start the app; exercise usage

+ error paths at each of the four levels. Then run

`scripts/verify-platform.sh --gate`.
**Expected:** Level `off` produces zero POSTs; `crash`/`error`/`all`
deliver exactly the paths their level admits with batching and retry
visible; `--gate` green (incl. `verify-endpoints` layer 1 with the
repointed prefs on the built binary). Then revert the fixture.
**Why human:** Needs a running sidecar, a collector, and the tier-3
Gecko build for layer 1.

### Gaps Summary

No automated gaps. All four must-haves verify statically against the
live tree, all four Phase-4 gates plus `--quick` pass, the telemetry
suite was re-run directly (5/5), and every key link is wired with no
`--ignore-errors` escape hatch. The open items are the three deferred
live drills above (shared with 04-01..04-04, each SUMMARY names the
same deferral with `requirements-completed: []`), which route this
report to `human_needed` rather than `passed`.

Housekeeping note (not a gap): the four `04-*-PLAN.md` files are
untracked (`git status` shows them as `??` while all four SUMMARies
and CONTEXT are tracked). They are included in the verification
commit below so the phase record is complete.

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
