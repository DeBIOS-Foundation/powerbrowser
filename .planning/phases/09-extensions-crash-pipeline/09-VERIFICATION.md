---
phase: 09-extensions-crash-pipeline
verified: 2026-09-05T12:00:00Z
status: passed
score: 16/16
behavior_unverified: 0
overrides_applied: 0
roadmap_sc: 4/4
staged:
  - item: "Windows 11 + macOS tier-3 build/install cells over the new extension kinds"
    reason: "No reachable packaging host; exact provisioning errors + operator unblocks recorded in docs/BUILD.md per 08-05 discipline"
    evidence: "docs/BUILD.md staged-unexecuted rows with error text and unblocks; per-target vsix bytes + hashes already retrieved live on nix-linux (.mozbuild/0904/)"
  - item: "Live Theia re-pin adoption to 1.75.0"
    reason: "Adoption-scale rewrite no phase-09 requirement demands; agreement + token-gate proven at the stated 1.74.1 pin, runbook staged verbatim"
    evidence: "docs/BUILD.md UPD-04 proof record + staged-bump section with operator unblock"
  - item: "about:crashes in-browser render of the collector record"
    reason: "VALIDATION.md manual by plan sanction; locked acceptance shape is the server round-trip (submit, CrashID response, local record), never a native crash since the reporter stays compiled out"
    evidence: "Verifier independently re-ran the loopback round-trip 2026-09-05: HTTP 200 CrashID + matching .dmp/.json record (see Behavioral Spot-Checks)"
coverage_note: "09-COVERAGE.json carries 5 unresolved/unclassified edges with no authored probes (null verification) — planning-artifact state only, same standing pattern as 08-COVERAGE.json. Requirement proof rides the discriminating gates below, each re-run green by the verifier. Flagged INFO, not a gap."
---

# Phase 09: Extensions + Crash Pipeline Verification Report

**Phase Goal:** Downstreams declare npm/local-path extensions and crashes reach their own collector
**Verified:** 2026-09-05T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Roadmap Success Criteria (4/4)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | npm + local-path entries get exact-pinned, integrity-verified installs that fail loud on mismatch, per target platform incl. offline-from-vendor packaging | ✓ VERIFIED | Generate self-test 62/62 (re-run); pin-gate self-test 7+ plants red-naming (re-run); harness `--all` 3 fixtures / 198 assertions (re-run); tier-3 nix-linux logs on disk (download-stock, plugins-hashes, build-sidecar 0 errors); per-target pins for linux-x64 + win32-x64 + darwin-arm64 in BUILD.md; placeholder verbatim in staged fragment. Win/mac build+install cells staged (unreachable hosts, errors+unblocks recorded) — staged, not gap |
| 2 | Declared WebExtensions land through ExtensionSettings in distribution/policies.json with agreement gate green | ✓ VERIFIED | policies.json carries `ExtensionSettings: {}` with 3 sibling keys byte-identical; gate main PASS + self-test 6/6 plants red-naming (both re-run); `--only webextensions` + `--only webextensions-self-test` PASS; ESR mechanism recorded by file-and-rule reference in gate header |
| 3 | Crashing-browser submits flow through the minimal Antenna collector (multipart POST, upload_file_minidump, CrashID, about:crashes record) under the written policy, native reporter still compiled out | ✓ VERIFIED | Gate self-test control-green + 8 plants + budget proof (re-run); gate main policy-literal PASS (re-run); telemetry suite 9/9 (re-run); verifier independently re-proved the loopback round-trip (200 CrashID + matching .dmp/.json); `.mozconfig:13 --disable-crashreporter`; no upstream/patches diff. In-browser render step staged per plan sanction (see Staged) |
| 4 | Tier-3 per-fixture builds pass over the new source kinds on real built artifacts; Theia re-pin proof passes with token-gate backend intact | ✓ VERIFIED | Tier-3 evidence logs on disk (see SC1); re-pin agreement self-test + full row PASS at 1.74.1 (re-run); `tsc -b theia/extensions/token-gate` exit 0 (re-run); telemetry 9/9; runbook + UPD-04 proof record in BUILD.md name runbook steps, theia_release, monaco exception, token-gate intactness. Live 1.75.0 bump staged — staged, not gap |

### Observable Truths (16/16 plan must-haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (09-01) Synthetic npm + local-path manifest generates theiaPlugins fragment with pinned URLs for both | ✓ VERIFIED | `node scripts/generate.mjs --self-test` PASS, 62 cases incl. "declared extensions resolve to exact versioned URLs" (re-run by verifier) |
| 2 | (09-01) Floated npm tarball URL fails the pin gate naming the entry id | ✓ VERIFIED | Pin-gate self-test: npm-float plant REJECTED naming acme.npmpack via `-<version>.tgz` suffix rule (re-run) |
| 3 | (09-01) Absent local-path directory fails the pin gate naming the entry id | ✓ VERIFIED | Pin-gate self-test: local-absence plant REJECTED naming acme.localtool (re-run) |
| 4 | (09-01) Target-placeholder URL reaches fragment byte-verbatim, never expanded to generator host platform | ✓ VERIFIED | Generator self-test placeholder-verbatim case PASS (re-run); staged drill fragment holds `${targetPlatform}` verbatim (`.mozbuild/0904/theia-plugins.drill.json`); committed tree entry-free so no literal leaks |
| 5 | (09-02) Well-formed multipart crash submit returns CrashID response + matching local store record | ✓ VERIFIED | Gate control GREEN (re-run) + verifier's own independent loopback proof: `STATUS 200 CrashID=53c95d1e-…`, store `.dmp`+`.json`, id-match true, `ROUNDTRIP_OK` |
| 6 | (09-02) Malformed submit rejected with named discard reason, no store write | ✓ VERIFIED | Plants `malformed_wrong_content_type` + `malformed_no_minidump` REJECTED with store-empty assertion (re-run) |
| 7 | (09-02) Over-throttle submit soft-rejected on the success status code | ✓ VERIFIED | Plant `throttled_per_minute_cap` answers 200 (re-run); WR-01 fix confirmed in code (`recordAccept` only after successful store write, line ~290) |
| 8 | (09-02) Crash-level error events ride the ping sender; minidump bytes never enter that sender | ✓ VERIFIED | Telemetry suite 9/9 incl. 4 separation cases (re-run); report path asserted from collector's own exports (`MINIDUMP_PART_NAME`), never a kept copy |
| 9 | (09-03) Manifest webextensions table emits ExtensionSettings fragment matching tracked policies.json key | ✓ VERIFIED | Generator check 53 files PASS (re-run); `ExtensionSettings: {}` on both sides for the entry-free root manifest; 5 webextensions self-test cases in generator suite |
| 10 | (09-03) Drifted ExtensionSettings key fails agreement gate naming the add-on id | ✓ VERIFIED | Gate self-test: tracked-drift, fragment-drift, stale-key plants all red naming the id (re-run, 6/6 incl. WR-05 missing/extra-id plants) |
| 11 | (09-03) install_url origin missing allowlist coverage fails naming the host | ✓ VERIFIED | Uncovered-origin plant red naming `uncovered-plant.example.org` (re-run) |
| 12 | (09-03) Tracked policies.json carries only declared add-ons, 3 existing keys byte-identical | ✓ VERIFIED | policies.json on disk: AppUpdateURL + DisableTelemetry + DisableFirefoxStudies intact, `ExtensionSettings: {}`; gate main PASS (re-run) |
| 13 | (09-04) Per-fixture generate-level cells over new kinds pass, post-run tree hashes equal snapshot | ✓ VERIFIED | Harness `--all` over 09 fixtures root: 3 fixtures, 198 assertions PASS (re-run); `--only verify-downstream-fixtures` PASS; self-test 14/14 (re-run) |
| 14 | (09-04) Real pinned Open VSX entry + synthetic npm/local-path fixtures travel the download→hash→build path on the reachable host | ✓ VERIFIED | SUMMARY evidence stands (tier-3, not re-run per instruction): download-stock.log (stock fetch both vsix, placeholder expanded), plugins-hashes.log (5/5 hash-matched), build-sidecar.log (0 errors both targets) — all present on disk and byte-sane (inspected, not executed) |
| 15 | (09-04) Unreachable packaging-host cells recorded staged-unexecuted with exact errors + operator unblocks, never silent skips | ✓ VERIFIED | BUILD.md staged-unexecuted rows carry exact provisioning errors + unblocks for pkg-win11, pkg-macos, and the sidecar build/install cells (inspected); zero green claims without logs |
| 16 | (09-04) Theia pin agreement holds at stated pin; token-gate backend compiles with suites green | ✓ VERIFIED | Agreement self-test 4/4 + full row PASS at 1.74.1 (re-run); `tsc -b theia/extensions/token-gate` exit 0 (re-run); telemetry 9/9; runbook greps (token-gate, theia_release, monaco-editor-core) all hit |

**Score:** 16/16 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/lib/config-schema.json` | npm/local-path/webextensions key shapes | ✓ EXISTS + SUBSTANTIVE | `extensions[].integrity` (SRI), `extensions[].path`, `webextensions[].id/mode/url` keys present; single SCHEMA_KEYS list read by validator (no second list) |
| `scripts/generate.mjs` | npm/local-path validation + resolvers; ExtensionSettings emitter | ✓ EXISTS + SUBSTANTIVE | `EXTENSION_SOURCES` 4-kind frozen allowlist; `NPM_EXACT_VERSION` exact-pin (WR-06); `emitTheiaPlugins` + `emitWebExtensionSettings`; TARGETS rows incl. `webextensions-settings.json`; 62-case self-test |
| `scripts/verify-extension-pins.mjs` | per-kind pin handling + self-test plants | ✓ EXISTS + SUBSTANTIVE | `.tgz`→`.tar.gz` mapping, npm suffix float guard, local-path absence leg; fixture + plants, self-test PASS |
| `scripts/crash-collector.mjs` | stdlib-only Antenna collector | ✓ EXISTS + SUBSTANTIVE | Exports `parseMultipart`, `buildCrashIdResponse`, `buildDiscardResponse`, `handleSubmit`; `MINIDUMP_PART_NAME=upload_file_minidump`; loopback-only bind (no expose flag); node --check clean |
| `scripts/verify-crash-collector.mjs` | collector contract gate + self-test | ✓ EXISTS + SUBSTANTIVE | Imports collector exports (never a kept copy); policy-literal agreement; control-green-first + 8 plants + budget proof |
| `docs/CRASH-POLICY.md` | written PII/retention/throttle policy | ✓ EXISTS + SUBSTANTIVE | 7-field allowlist, 30-day deletion sweep, 60/60s throttle, ping/report routing; pinned by gate literals (WR-02: MiB caps exported from code) |
| `theia/extensions/telemetry/test/telemetry-sender.test.mjs` | ping/report separation cases | ✓ EXISTS + SUBSTANTIVE | 9/9 incl. crash-error-admitted, crash-usage-dropped, unknown-fail-closed, minidump-no-sender-path (WR-08: instance+export scans) |
| `scripts/verify-webextensions.mjs` | webextensions agreement gate + self-test | ✓ EXISTS + SUBSTANTIVE | Derives via `emitWebExtensionSettings` import; canonical per-entry compare (WR-04); absent-fragment SKIP + always-on equality; stale-key + origin-coverage legs; ESR mechanism by file-and-rule ref |
| `powerbrowser/distribution/policies.json` | tracked ExtensionSettings consumer key | ✓ EXISTS + SUBSTANTIVE | `ExtensionSettings: {}` + 3 pre-existing keys byte-identical; no fixture data |
| `scripts/verify-downstream-fixture.mjs` | generate-level fixture cells over new kinds | ✓ EXISTS + SUBSTANTIVE | Independent `expectedExtensionUrl`/`checkExtensionFragment` oracle; 14-plant self-test; `--all` drives 09 fixtures root |
| `scripts/verify-upstream-pins.mjs` | Theia re-pin agreement proof | ✓ EXISTS + SUBSTANTIVE | Untouched by 09-04 (steps 5–7 already enforce UPD-04); self-test + full row green at 1.74.1 |
| `docs/BUILD.md` | fixture matrix record + re-pin runbook | ✓ EXISTS + SUBSTANTIVE | Tier-3 drill section (matrix, per-target evidence, staged rows, verbatim transcript) + re-pin runbook steps 1–6 with UPD-04 proof record |
| 09 fixtures ×3 + harness/registry rows | npm-kind, local-path-kind, openvsx-pinned cells | ✓ EXISTS + SUBSTANTIVE | Acme ids + example hosts (sweep-clean); real akamud 2.3.0 true-byte sha256 |
| `scripts/verify-platform.sh` | registry rows for all new gates | ✓ EXISTS + SUBSTANTIVE | crash-collector pair + webextensions pair + downstream-fixtures drive of 09 root; `--quick` PASS all rows |

**Artifacts:** 14/14 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| config-schema.json | generate.mjs | validator reads SCHEMA_KEYS, never its own copy | ✓ WIRED | `SCHEMA_KEYS` frozen from schema (generate.mjs:184); per-key loops reference it; no second list |
| generate.mjs | generated/theia-plugins.json | emitTheiaPlugins resolver dispatch, one URL per entry | ✓ WIRED | Export at :1864, TARGETS row at :3362; `--check` 53 files match |
| theia-plugins fragment | verify-extension-pins.mjs | fragment equality + per-kind hash proof | ✓ WIRED | Main gate PASS; float/hash/drift plants all red-naming |
| verify-crash-collector.mjs | crash-collector.mjs | imports exported pure functions | ✓ WIRED | Line 65 imports `parseMultipart` et al.; gate fails naming the export if it moves |
| telemetry test | telemetry-sender.ts | separation cases assert levelAllowsEvent admits crash error only | ✓ WIRED | `levelAllowsEvent` at sender :76, enforced at :185; suite 9/9 |
| verify-platform.sh | verify-crash-collector.mjs | registry CHECKS pair rows | ✓ WIRED | Lines ~4146–4171; `--only crash-collector[-self-test]` PASS |
| generate.mjs | generated/webextensions-settings.json | TARGETS fragment row, no tracked comparand | ✓ WIRED | Row at :3375; emitter `emitWebExtensionSettings`; `--check` green |
| webextensions fragment | policies.json | surgical copy sets only ExtensionSettings key | ✓ WIRED | Tracked key `{}` equals derived fragment; 3 siblings byte-identical |
| verify-webextensions.mjs | generate.mjs | gate derives through emitter, never a kept copy | ✓ WIRED | Line 68 imports `emitWebExtensionSettings`; used at :127/:300/:303 |
| verify-downstream-fixture.mjs | generate.mjs | harness generates from staged fixture dirs in child process | ✓ WIRED | `--all --fixtures-root` 198 assertions PASS; drill-then-restore hash-equal |
| BUILD.md | .mozbuild | matrix/drill evidence logs referenced by path | ✓ WIRED | All referenced logs present on disk (download-stock, plugins-hashes, build-sidecar, drill fragment/backups) |
| verify-upstream-pins.mjs | theia/package.json | pin agreement over resolutions + lockfile stanzas | ✓ WIRED | Main row PASS naming 1.74.1 across resolutions, 6 member files, lockfile |

**Wiring:** 12/12 connections verified

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| theia-plugins fragment (drill) | per-entry URLs | registry tarball layout / Open VSX API / packed bytes | ✓ FLOWING | Real chart.js 4.5.1 + akamud 2.3.0 bytes hashed to pins; placeholder expanded per-target by stock downloader |
| ExtensionSettings key | per-id mode+url | manifest [[webextensions]] table | ✓ FLOWING (fixture-proven) | Fixture manifests round-trip emitter→fragment→tracked key; root manifest entry-free by mechanism-only scope |
| crash store record | CrashID + annotations + dump bytes | live multipart submit over loopback | ✓ FLOWING | Verifier's own round-trip: response id == `<id>.json` + `<id>.dmp` on disk, bytes match |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Generator self-test | `node scripts/generate.mjs --self-test` | 62 planted faults behaved as pinned | ✓ PASS |
| Pin-gate self-test | `node scripts/verify-extension-pins.mjs --self-test` | PASS (control green + npm-float, local-absence, hash, drift plants red-naming) | ✓ PASS |
| Crash-collector self-test | `node scripts/verify-crash-collector.mjs --self-test` | Control GREEN + 8 plants REJECTED naming rules + budget proof | ✓ PASS |
| Webextensions self-test | `node scripts/verify-webextensions.mjs --self-test` | 6 planted faults red-naming | ✓ PASS |
| Downstream-fixture self-test + all | `node scripts/verify-downstream-fixture.mjs --self-test` / `--all --fixtures-root …/09-…/fixtures` | 14/14; 3 fixtures 198 assertions PASS | ✓ PASS |
| Upstream-pins self-test + main | `node scripts/verify-upstream-pins.mjs --self-test` / main | 4 plants red-naming file; PASS at 1.74.1 | ✓ PASS |
| Crash main + webextensions main + pins main + generate check | 4 gate commands | All PASS | ✓ PASS |
| Telemetry suite | `node theia/extensions/telemetry/test/telemetry-sender.test.mjs` | SUITE PASS 9/9 | ✓ PASS |
| Token-gate compile | `node theia/node_modules/typescript/bin/tsc -b theia/extensions/token-gate` | exit 0, no errors | ✓ PASS |
| Loopback crash round-trip (verifier-owned) | ephemeral-port serve + FormData POST | `STATUS 200 CrashID=53c95d1e-…`; store id-match true, dump bytes match; `ROUNDTRIP_OK` | ✓ PASS |
| Commit gate | `scripts/verify-platform.sh --quick` | PASS all checks (incl. all 6 new rows) | ✓ PASS |
| Registry `--only` rows | extension-pins-self-test, webextensions[2], crash-collector[2], verify-downstream-fixtures[2], verify-upstream-pins | All PASS | ✓ PASS |

Tier-3 cells (downloads, sidecar build) and the staged-window full chain were NOT re-executed per instruction; SUMMARY evidence stands and the referenced logs were inspected on disk.

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes are declared by any 09 plan, and none exist conventionally for this phase. Step 7c: SKIPPED (no probes declared). 09-COVERAGE.json note: 5 edges, all `unresolved`/`unclassified` with null verification — no authored probes to run; flagged INFO in frontmatter.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXT-02 | 09-01, 09-04 | npm + local-path kinds, exact pins + integrity, fail-loud, per-target | ✓ SATISFIED | Truths 1–4, 13–15; gates + tier-3 logs |
| EXT-03 | 09-03 | WebExtensions via ExtensionSettings in policies.json | ✓ SATISFIED | Truths 9–12; agreement gate green |
| TEL-04 | 09-02 | Minimal Antenna collector + separation + policy; reporter out | ✓ SATISFIED | Truths 5–8; policy pinned; `.mozconfig --disable-crashreporter`; no Socorro/mini-breakpad-server |
| BLD-02 | 09-04 | Tier-3 per-fixture builds over new kinds on real artifacts | ✓ SATISFIED | Truths 13–15; reachable-host logs on disk; unreachable cells staged with errors+unblocks |
| UPD-04 | 09-04 | Theia re-pin proof with token-gate intact | ✓ SATISFIED | Truth 16; agreement at 1.74.1; tsc clean; runbook recorded; live bump staged |

No orphaned requirements: REQUIREMENTS.md maps exactly EXT-02, EXT-03, TEL-04, BLD-02, UPD-04 to Phase 09, and every one is claimed by a plan.

**Coverage:** 5/5 requirements satisfied

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| scripts/generate.mjs | 4296–4297 | `XXXX` string | ℹ️ Info | Deliberate bad-magic plant bytes in `probeWrongMagicIcns`, not a debt marker — no action |
| — | — | `TODO`/`FIXME`/`PLACEHOLDER`/empty-value stubs in phase-touched code | — | None found (grep clean; matches SUMMARY stub scans) |

10 code-review warnings (WR-01…WR-10) were all FIXED with commits (d5d90c1, 604775f, 04f41f2, 384c9f0, 4c1985b, 98a6b75, 7307703, 8337589, 0c8ec25, 7fc6b9a); each fix confirmed present: exact-version allowlist, post-write throttle accounting, canonical entry compare, 6 webextensions plants, per-part/500 plants, source-key allowlist, instance+export scans, CRLF-anchored multipart split, finite-clock fail-closed.

**Anti-patterns:** 0 blockers, 0 warnings, 1 info (benign)

### Hard-Rule Compliance (per CLAUDE.md)

- No Theia-core patch: only tree-owned `theia/extensions/telemetry/test/` touched; re-pin is pins + lockfile only. ✓
- No Gecko off-stack edit: `upstream/` + `patches/` diff empty; internals boundary untouched. ✓
- Bridge-safe: no Theia presentation welding in this phase. ✓
- No sibling drivers: all new gates ride `verify-platform.sh` registry rows with `--self-test` twins. ✓
- No vendored add-ons: no `distribution/extensions/` dir (only `policies.json`); no XPIs/vsix in tracked tree; root manifest entry-free; tracked allowlist free of fixture hosts. ✓
- No Socorro / mini-breakpad-server / re-enabled reporter. ✓

### Staged Items (plan-sanctioned — not gaps)

1. **Win/mac tier-3 build+install cells** — unreachable hosts; exact errors + operator unblocks in BUILD.md; per-target vsix bytes already retrieved live with documented pins for the future green runs.
2. **Live Theia 1.75.0 adoption** — staged with unblock; agreement + token-gate proven at 1.74.1.
3. **about:crashes in-browser render** — VALIDATION.md manual; locked acceptance shape (collector round-trip → CrashID → local record) independently re-proved by the verifier. No native-crash proof by locked decision.

### Gaps Summary

**No gaps found.** All 16 plan must-have truths verified with re-run evidence, all 4 roadmap success criteria hold, all 12 key links wired, all 5 requirements satisfied, zero blocker anti-patterns, hard rules clean, `--quick` green. Phase goal achieved. Staged items above are tracked follow-ups with recorded unblocks, not goal blockers.

## Verification Metadata

**Verification approach:** Goal-backward (roadmap SCs → plan must-haves → artifacts → links → data flow)
**Must-haves source:** 09-01..09-04 PLAN.md frontmatter (16 truths) + ROADMAP.md Phase 09 SCs (4)
**Automated checks:** 12 spot-check rows passed, 0 failed
**Human checks required:** 0
**Total verification time:** ~15 min (no tier-3 rebuilds per instruction)

---
*Verified: 2026-09-05T12:00:00Z*
*Verifier: Claude (gsd-verifier)*
