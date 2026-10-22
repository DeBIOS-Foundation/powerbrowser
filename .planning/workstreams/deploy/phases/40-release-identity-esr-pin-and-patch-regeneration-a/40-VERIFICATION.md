---
phase: 40-release-identity-esr-pin-and-patch-regeneration-a
verified: 2026-10-22T05:09:43Z
status: human_needed
score: 70/73 must-haves verified (5/5 roadmap success criteria; 65/68 plan truths; 3 backstop truths insufficient_spec)
covered_files: [".github/workflows/rebase-upstream.yml", ".mozconfig", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-01-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-01-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-02-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-02-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-03-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-03-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-04-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-04-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-05-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-05-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-06-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-06-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-07-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-07-SUMMARY.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-08-PLAN.md", ".planning/workstreams/deploy/phases/40-release-identity-esr-pin-and-patch-regeneration-a/40-08-SUMMARY.md", "LICENSING.md", "README.md", "THIRD-PARTY-NOTICES.txt", "configuration.toml", "docs/BUILD.md", "docs/REBRANDING.md", "docs/RELEASING.md", "inventory/brand-tokens.json", "powerbrowser/branding/dev/pref/firefox-branding.js", "powerbrowser/branding/release/pref/firefox-branding.js", "powerbrowser/distribution/policies.json", "powerbrowser/endpoint-allowlist.json", "powerbrowser/packaging/version/release.txt", "powerbrowser/packaging/version/version.txt", "scripts/generate-licensing.mjs", "scripts/generate.mjs", "scripts/lib/config-schema.json", "scripts/lib/endpoint-verdict.mjs", "scripts/rebase-upstream.sh", "scripts/regenerate-patches.sh", "scripts/verify-downstream-fixture.mjs", "scripts/verify-endpoints.sh", "scripts/verify-extension-pins.mjs", "scripts/verify-generated-identity.mjs", "scripts/verify-manifest-literals.mjs", "scripts/verify-mar-update-hop.mjs", "scripts/verify-ng-064-update-url.mjs", "scripts/verify-platform.sh", "scripts/verify-release-identity.mjs", "scripts/verify-theia-endpoints.mjs", "scripts/verify-trademark-surface.mjs", "scripts/verify-update-channel.mjs", "scripts/verify-update-prefs.mjs", "scripts/verify-upstream-pins.mjs", "scripts/verify-webextensions.mjs"]
covered_digest: "v3:sha256:d1b7befa1b3712f643d2619fa50802059f0c082a4be9f535107bab514c53fc34"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "PKG-08: LICENSING.md and THIRD-PARTY-NOTICES.txt ship as assets of every Release"
    addressed_in: "Phase 49"
    evidence: "DIST-07: the draft's asset set must equal the manifest-derived set, which includes LICENSING.md and THIRD-PARTY-NOTICES.txt"
  - truth: "PKG-09: the en-US scope is stated on /download"
    addressed_in: "Phase 47"
    evidence: "Phase 47 SC3 / WEB-02: /download gives ... the en-US scope"
  - truth: "Full-tier mar-update-hop row (live N to N+1 hop) on a packaged build"
    addressed_in: "Phase 46"
    evidence: "Phase 46 depends on Phase 45 for the packaged mar-update-hop run (UPD-24); SC1 is asserted by the full-tier mar-update-hop row"
human_verification:
  - test: "Sign off the seven judgment-tier prohibitions listed under 'Prohibitions' in this report (40-02 write-mode refusal, 40-03 revision not in version_display.txt, 40-04 no Mozilla update host, 40-05 link prefs not unattended, 40-05 D-08 echo for inherited [urls], 40-07 no omitted package, 40-08 executor did not push)"
    expected: "Each prohibition holds. The verifier's non-authoritative verdict for all seven is HOLDS, each backed by a test or built-tree evidence recorded in the table"
    why_human: "unverified-prohibition -- human review recommended. Judgment-tier prohibitions are never passed silently by the verifier (ADR-550 D4)"
  - test: "Accept or reject three backstop truths that have only code-presence evidence: (a) 40-04 host comparison in verify-mar-update-hop.mjs is case- and path-insensitive (it uses new URL().hostname, ng064 uses .host); (b) 40-05 pref emission and the verdict function hold no shared mutable state under concurrent runs; (c) 40-07 an interrupted generate-licensing.mjs write never leaves a partial notice file (temp file + renameSync at scripts/generate-licensing.mjs:431)"
    expected: "Owner accepts each as held, or asks for a test"
    why_human: "verification: backstop truths need a passing test or directly observed behavior; presence and wiring do not qualify (insufficient_spec)"
---

# Phase 40: Release identity, ESR pin and patch regeneration (A) Verification Report

**Phase Goal:** The tree is on the current ESR security release, every release identity fact (release key, update channel, version files, update and release-notes URLs, licence notices) derives from `configuration.toml`, a patch can change only through regeneration, and `rebase-upstream.yml` replays the pin green inside Nix as a callable workflow.
**Verified:** 2026-10-22T05:09:43Z
**Status:** human_needed
**Re-verification:** No -- initial verification

All five roadmap success criteria are verified with code, row output and built-tree evidence. No gap blocks the goal. The status is `human_needed` only because the protocol routes judgment-tier prohibitions and code-presence-only backstop truths to the owner.

## Evidence run by the verifier

- `scripts/verify-platform.sh --quick`: exit 0, 274 PASS lines, `verify-platform: PASS -- all checks passed` (72 s).
- `scripts/verify-platform.sh --only ng064-update-url-from-manifest`: PASS on the built objdir.
- Read-only reads of the built tree: `objdir/dist/bin/powerbrowser --version` printed `DeBIOS powerbrowser 153.5.1esr`; `objdir/dist/bin/application.ini [AppUpdate] URL=https://updates.powerbrowser.org/update/6/...`; `objdir/config.status` substs `MOZ_UPDATE_CHANNEL: default`, `MAR_CHANNEL_ID` and `ACCEPTED_MAR_CHANNEL_IDS: powerbrowser-default`; `.mozbuild/phase40-smoke.exit` = `0`.
- `gh run view 39725128513`: workflow "Rebase upstream", event `workflow_dispatch`, branch `workspace/deploy`, head `2d4225a`, conclusion `success`, every step success; the run log shows `REBASE_TAG: FIREFOX_153_5_1esr_RELEASE`. `git diff 2d4225a HEAD` outside `.planning/` is empty, so the run covered the tree verified here.
- `git -C upstream rev-parse FIREFOX_153_5_1esr_RELEASE^{commit}` = `6cd88e7d45fe7a5b0b87b984fb32a8779151860e` = `upstream` HEAD.
- `verify-update-channel.mjs`, `verify-update-prefs.mjs` and `regenerate-patches.sh --check` each run twice: byte-identical output. `git status --porcelain` showed the same eight pre-existing untracked files before and after the quick run, so the rows wrote nothing to the tree.
- `resolveConfig` on a copy of `configuration.toml` with `revision = "1"`, `1.5` and `0`: each returns a failure naming `product.revision`; `revision = 1` returns none.
- `releaseIdentity()`: `FIREFOX_154_0esr_RELEASE` gives `v154.0-1`, `FIREFOX_153_5_1esr_RELEASE` gives `v153.5.1-1`, and `FIREFOX_153_5_1esr_BUILD1` fails naming `upstreams.firefox_esr_tag`.

## Goal Achievement

### Roadmap success criteria

| # | Success criterion | Status | Evidence |
|---|---|---|---|
| 1 | `configuration.toml` pins `FIREFOX_153_5_1esr_RELEASE` with `--quick` green (DIST-06 first); `rebase-upstream.yml` gains `on: workflow_call`, runs `node scripts/generate.mjs` inside `nix develop .#theia`, `tag` has no default asserted by `verify-upstream-pins.mjs` (AUTO-08); a dispatched run against that tag is green | VERIFIED | `configuration.toml:125` pins the tag; upstream HEAD is 6cd88e7d. `ad9fc4d` (DIST-06) changes the pin and the workflow default together and precedes `05d282b` (AUTO-08). The workflow declares `tag` under both `workflow_dispatch` and `workflow_call`, `required: true`, no `default`; all four generator/identity/rebase steps run `nix develop .#theia --command ...`; `permissions: contents: read`, `persist-credentials: false`, no push step. `verify-upstream-pins` PASS and its self-test reds 5 workflow faults naming `.github/workflows/rebase-upstream.yml` (default under either input, removed `workflow_call`, bare generator step, tag literal). Run 39725128513 success with tag FIREFOX_153_5_1esr_RELEASE. `--quick` green at HEAD. |
| 2 | Quick rows `release-identity` and `update-channel` green; self-tests red on a planted hand-written version literal, a descriptor version disagreeing with the key, and `powerbrowser-release` in one consumer | VERIFIED | Both rows PASS. `release-identity-self-test`: 7 planted faults red naming the file or tag (version.txt literal, release.txt literal, descriptor appVersion, descriptor displayVersion, milestone, two tag cases), 3 controls green. `update-channel-self-test`: 10 faults red, including `powerbrowser-release` in `docs/RELEASING.md` and in `docs/BUILD.md`, `release` channel in `.mozconfig` and in the emitter; control (MAR key store, runner unit) green. |
| 3 | Shipped `policies.json` has no `AppUpdateURL`; About-dialog release-notes and fallback links open the `[urls]` pages without throwing; allowlist accepts `user-initiated`; a planted unattended prefetch to powerbrowser.org goes red naming the host | VERIFIED | `powerbrowser/distribution/policies.json` holds only DisableTelemetry, DisableFirefoxStudies, ExtensionSettings. Both branding files set `app.releaseNotesURL`, `.aboutDialog`, `app.update.url.details` = GitHub releases and `app.update.url.manual` = `https://powerbrowser.org`, from `releaseLinkPrefs(config)` (`scripts/generate.mjs:2658`). Owner-observed About-dialog pass (40-08 checkpoint: release notes opened GitHub releases, manual link opened powerbrowser.org, no console URL error). `DISPOSITIONS = ['allow','deny','user-initiated']` in `scripts/lib/endpoint-verdict.mjs`, consumed by `allowlist-schema` (`verify-platform.sh:2613`) and by layer 3 (`verify-endpoints.sh:473` via `endpoint_violations`). `endpoint-dispositions-self-test`: `real-allowlist-unattended-powerbrowser.org: red, names powerbrowser.org`, same for github.com; after-click green; deny red in both modes. |
| 4 | Quick row `patches-regenerated` passes on every tracked patch and goes red naming the patch on a hand-edited hunk body; update-prefs row goes red on a planted `app.update.auto` | VERIFIED | `regenerate-patches: PASS -- 4 patch(es) equal their regeneration from upstream/`. Self-test: hand-edited `+` line red naming `010-a.patch` only; also pristine-upstream refusal, duplicate-path refusal, write-mode refusal with unchanged sha256. Wired into `scripts/rebase-upstream.sh:130`. `update-prefs-self-test`: `app.update.auto planted in dev -> red`, plus the four other forbidden prefs. |
| 5 | `LICENSING.md` and `THIRD-PARTY-NOTICES.txt` generated with a drift row green; README and PROJECT.md state en-US-only scope | VERIFIED | Both files tracked. `licensing: PASS -- ... equal their re-derivation (716 Theia packages in 337 licence groups, Node.js runtime v24.19.0)`, with no SKIP line, so the built about:license byte comparison ran. Self-test reds on tampered notice, added package, removed package, Node version drift, unresolvable dependency. `README.md:90` and `.planning/PROJECT.md:97` state en-US only. |

### Plan must-have truths (merged, 68)

| Plan | Truths | Verified | Notes |
|---|---|---|---|
| 40-01 | 6 | 6 | Quick-green on the DIST-06 commit itself is taken from 40-01-SUMMARY (not re-run at `ad9fc4d`); commit isolation and order verified from git. |
| 40-02 | 8 | 8 | Backstop ordering truth: two `--check` runs byte-identical over the real tree. |
| 40-03 | 6 | 6 | Schema and `releaseIdentity` exercised directly (see Evidence). Release-identity on the real tree finds 0 descriptors and 0 release tags, so those halves are proved by the self-test only. |
| 40-04 | 14 | 13 | Case-sensitivity proved by the self-test plant `Default`. Sorted output, idempotency and read-only proved by two identical runs and an unchanged tree. Insufficient_spec: host comparison in `verify-mar-update-hop.mjs` uses `.hostname`, and no test exercises letter case. |
| 40-05 | 9 | 8 | Insufficient_spec: no-shared-mutable-state concurrency truth (code only). |
| 40-06 | 8 | 8 | Emission order observed in two identical runs; in-memory only observed by an unchanged tree. |
| 40-07 | 10 | 9 | Insufficient_spec: temp-file rename on interruption (`renameSync(tmp, abs)` at line 431, untested). |
| 40-08 | 7 | 7 | Built tree read directly; ng064 re-run; run 39725128513 confirmed via `gh`; layer 3 exit 0 and toolchain-baseline empty diff are the caller-supplied live evidence; About dialog is owner-observed. |

**Score:** 70/73 truths verified (0 present-behavior-unverified; 3 insufficient_spec routed to human verification)

### Prohibitions (judgment tier, non-authoritative verifier verdict)

| Plan | Prohibition | Verdict | Evidence |
|---|---|---|---|
| 40-02 | Write mode must not overwrite a tracked patch with empty, partial or non-diff output | HOLDS (flagged) | Self-test: "write mode on a pristine upstream refuses and 010-a.patch's sha256 is unchanged"; write uses `mktemp` in the patches dir. |
| 40-03 | Revision must not reach `version_display.txt` or `--with-version-file-path` | HOLDS (flagged) | Binary reports `153.5.1esr`; `upstream` status shows only the patched files; `generate.mjs:3554` records that nothing passes the version files to Gecko. |
| 40-04 | No shipped build's effective update URL names a Mozilla host | HOLDS (flagged) | ng064 PASS on the built tree; `application.ini` `[AppUpdate]` names updates.powerbrowser.org. |
| 40-05 | About-dialog link prefs are not an unattended callout | HOLDS (flagged) | `releaseLinkPrefs` is separate from `mozillaEndpointPrefs` (`generate.mjs:2629`, `:2653`); `startup.homepage_override_url` is `""`; `network.dns.disablePrefetch` true; layer 3 exit 0 on the built tree (caller evidence). |
| 40-05 | A downstream must not silently inherit Power Browser's release-notes or homepage links | HOLDS (flagged) | `echoDefaults` prints `default applied -- <path>` on every run (`generate.mjs:4221`); the generator self-test fixture at `:5381` covers inherited `urls.release_notes`/`urls.homepage`; `generate-self-test` PASS. |
| 40-07 | Notices must not omit any shipped Theia or Node package | HOLDS (flagged) | Self-test: unresolvable declared dependency red; absent node_modules red; licence-less package listed with a marker. |
| 40-08 | No executor task pushes or dispatches | HOLDS (flagged) | 40-08 SUMMARY records only a docs commit; the run event is `workflow_dispatch` by the owner. Not independently provable from the tree. |

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | Notices ship as assets of every Release (PKG-08 last clause) | Phase 49 | DIST-07 asset set includes LICENSING.md and THIRD-PARTY-NOTICES.txt |
| 2 | en-US scope on /download (PKG-09) | Phase 47 | Phase 47 SC3 / WEB-02 |
| 3 | Full-tier `mar-update-hop` drill | Phase 46 | Phase 46 depends on Phase 45 for the packaged mar-update-hop run; SC1 asserts it |

### Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `configuration.toml` | VERIFIED | pin, `[product] revision = 1`, `[urls]` update/release_notes/homepage |
| `.github/workflows/rebase-upstream.yml` | VERIFIED | callable, no tag default, Nix-wrapped steps, dispatched green |
| `scripts/verify-upstream-pins.mjs` | VERIFIED | row + 8-fault self-test |
| `scripts/regenerate-patches.sh` | VERIFIED | write, `--check`, `--self-test`; wired into rebase-upstream.sh and the registry |
| `scripts/lib/config-schema.json` | VERIFIED | `product.revision` integer, required, minimum 1 |
| `powerbrowser/packaging/version/{version,release}.txt` | VERIFIED | `153.5.1`, `v153.5.1-1`, generator TARGETS rows at `generate.mjs:3557-3564` |
| `scripts/verify-release-identity.mjs` | VERIFIED | row + self-test |
| `scripts/verify-update-channel.mjs` | VERIFIED | row + self-test, including policy-key absence |
| `.mozconfig` | VERIFIED | channel `default`, MAR ids `powerbrowser-default` (lines 8-10), from `UPDATE_CHANNEL` (`generate.mjs:1378`) |
| `powerbrowser/distribution/policies.json` | VERIFIED | no update URL policy |
| `scripts/lib/endpoint-verdict.mjs` | VERIFIED | `DISPOSITIONS`, `entryFor`, `violations`; used by layer 3 and allowlist-schema |
| `powerbrowser/endpoint-allowlist.json` | VERIFIED | powerbrowser.org and github.com `user-initiated`; aus5 reason text updated in `119c6b0` |
| `powerbrowser/branding/{dev,release}/pref/firefox-branding.js` | VERIFIED | link prefs and `app.update.langpack.enabled` false |
| `scripts/verify-update-prefs.mjs` | VERIFIED | row + 9-fault self-test |
| `scripts/generate-licensing.mjs`, `LICENSING.md`, `THIRD-PARTY-NOTICES.txt` | VERIFIED | generator, drift row, self-test |

### Key Link Verification

| From | To | Status |
|---|---|---|
| rebase-upstream.yml | scripts/rebase-upstream.sh | WIRED (`nix develop .#theia --command bash scripts/rebase-upstream.sh --tag "$REBASE_TAG"`) |
| scripts/rebase-upstream.sh | scripts/regenerate-patches.sh | WIRED (`:130`) |
| verify-platform.sh | regenerate-patches / release-identity / update-channel / update-prefs / licensing | WIRED (rows ran in `--quick`) |
| verify-endpoints.sh layer 3 | scripts/lib/endpoint-verdict.mjs | WIRED (`endpoint_violations` at `:383`, called at `:473` and `:645`) |
| generate.mjs | .mozconfig / branding prefs / version files | WIRED (generated-byte-identity PASS) |
| verify-mar-update-hop.mjs | configuration.toml | WIRED (`readManifestUpdateUrl`) |

### Requirements Coverage

| Requirement | Plan | Status | Evidence |
|---|---|---|---|
| DIST-06 | 40-01, 40-08 | SATISFIED | pin, own commit, dispatched run green |
| AUTO-08 | 40-01, 40-08 | SATISFIED | workflow_call, no default, Nix wrap, verify-upstream-pins asserts |
| REL-01 | 40-03 | SATISFIED | revision, releaseIdentity, version files, row + self-test |
| UPD-11 | 40-04, 40-08 | SATISFIED | one constant, row + self-test, PROJECT.md:96; `build-update-xml.mjs` and `release-manifest.json` do not exist yet, so the row covers them only once they land |
| UPD-12 | 40-04, 40-08 | SATISFIED | policy removed; ng064, mar-update-hop and allowlist changed in `119c6b0` |
| UPD-13 | 40-05, 40-08 | SATISFIED | prefs from `[urls]`, owner-observed About dialog, `abdb3f2` message records verify-theia-endpoints treatment |
| UPD-33 | 40-05 | SATISFIED | third disposition, shared verdict, fixture self-test |
| UPD-25 | 40-06 | SATISFIED | langpack false in both variants, update-prefs row |
| PKG-08 | 40-07 | SATISFIED (release-asset clause deferred to Phase 49) | generator + drift row |
| PKG-09 | 40-07 | SATISFIED for Phase 40 scope | README and PROJECT.md; /download deferred to Phase 47; release-notes clause has no owning requirement (see warning) |
| AUTO-10 | 40-02 | SATISFIED | regenerate-patches.sh, rows, wired into rebase |

No orphaned requirement: every ID mapped to Phase 40 in REQUIREMENTS.md appears in a plan.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Commit gate | `scripts/verify-platform.sh --quick` | exit 0 | PASS |
| Built update URL | `--only ng064-update-url-from-manifest` | PASS | PASS |
| Built version | `objdir/dist/bin/powerbrowser --version` | `153.5.1esr` | PASS |
| Revision schema | `resolveConfig` with `"1"`, `1.5`, `0` | each fails naming `product.revision` | PASS |
| Tag shapes | `releaseIdentity` on 154.0, 153.5.1, `_BUILD1` | keys derived; `_BUILD1` refused | PASS |
| Determinism | three rows run twice | byte-identical | PASS |

### Probe Execution

Not applicable: no `scripts/*/tests/probe-*.sh` is declared by the phase; verification runs through `verify-platform.sh` rows.

### Anti-Patterns Found

None. The phase diff adds no TBD, FIXME, XXX, TODO or HACK marker (the two `XXXXXX` hits are a `mktemp` template and the `PLACEHOLDER` hit is a regex constant name).

### Warnings (non-blocking)

- PKG-09 says the en-US scope is stated "in the release notes". PROJECT.md:97 assigns that to Phases 49 and 50, but DIST-07's release-notes content list does not include it and no other requirement owns it. Add it to DIST-07 or a Phase 50 criterion, or the clause will be lost.
- `release-identity` on the real tree checks 0 descriptors and 0 release tags; those halves are proved only by the self-test until Phase 49 produces descriptors and tags.
- 40-08-SUMMARY line 36 says the About-dialog result has no per-link detail, while line 89 gives per-link detail. Documentation inconsistency only.

### Human Verification Required

### 1. Judgment-tier prohibitions

**Test:** Review the seven rows in the Prohibitions table.
**Expected:** Each holds; the verifier's non-authoritative verdict is HOLDS for all seven.
**Why human:** unverified-prohibition, human review recommended. The verifier may not pass judgment-tier prohibitions silently.

### 2. Backstop truths with code-only evidence

**Test:** Accept or reject (a) mar-update-hop host comparison by `new URL().hostname`, (b) 40-05 no shared mutable state under concurrent runs, (c) 40-07 interrupt-safe write by temp file and rename.
**Expected:** Accept, or request a test for any of them.
**Why human:** backstop truths need a passing test or observed behavior.

### Gaps Summary

No gaps. The ESR pin, the callable Nix replay workflow and its first green run, release-identity derivation, the single update channel, the removed update-URL policy, About-dialog links from `[urls]`, the `user-initiated` disposition, the update-prefs guard, patch regeneration and the generated licence notices all exist, are wired into `verify-platform.sh` and the rebase path, and pass. The remaining items are owner sign-offs required by the verification protocol, not missing work.

---

_Verified: 2026-10-22T05:09:43Z_
_Verifier: Claude (gsd-verifier)_
