---
phase: 08-installer-hardening-canonical-rename
verified: 2026-09-05T12:00:00Z
status: passed
score: 17/20 must-haves verified, 3 staged (plan-sanctioned), 0 failed
behavior_unverified: 0
overrides_applied: 0
staged:
  - truth: "MSIX and DMG artifacts are built on named real hosts, never on Linux"
    state: staged-unexecuted
    evidence: "docs/BUILD.md capability record names pkg-win11 + pkg-macos with exact provisioning errors and operator unblock commands; zero Linux MSIX/DMG attempts"
  - truth: "The per-OS install, launch, uninstall, no-residue matrix is green including alongside stock Firefox"
    state: partial-linux-verified
    evidence: "Linux cells L1-L4 ALL PASS in .mozbuild/matrix/matrix.log on disk; Windows/macOS cells staged-unexecuted with unblocks in BUILD.md"
  - truth: "One real N to N-plus-1 hop is proven per OS from the fork server"
    state: partial-linux-verified
    evidence: "Linux hop re-proven live: scripts/verify-platform.sh --only mar-update-hop PASS on current tree 2026-09-05 plus hop.json applied 153.1.0/20260904184538 to 153.1.1/20260904191328; Windows/macOS hops staged-unexecuted"
---

# Phase 08: Installer Hardening + Canonical Rename Verification Report

**Phase Goal:** Downstreams ship real, self-updating branded installers under the canonical PowerBrowser name
**Verified:** 2026-09-05T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A bare dollar-variable in an installer-bound manifest value fails generation naming the key (08-01) | ✓ VERIFIED | Re-ran `node scripts/generate.mjs --self-test`: PASS, 45 plants. `hasBareDollar` at scripts/generate.mjs:891, guard at :899 |
| 2 | The installer verifier checks a fixture manifest root, never the live tree (08-01) | ✓ VERIFIED | Re-ran installer-schema self-test: PASS, control-green-first + 4 plants incl. both divergent-manifest polarities. `readTileColor(root)` at scripts/verify-installer-schema.mjs:289, rooted call sites :352/:449 |
| 3 | configuration.toml carries identity.display_name PowerBrowser and generated branding matches it (08-01) | ✓ VERIFIED | configuration.toml:38 reads `display_name = "PowerBrowser"`; re-ran `node scripts/generate.mjs --check`: PASS, all 52 files match |
| 4 | generate --check and the byte-identity gate are green after the rename slice (08-01) | ✓ VERIFIED | Re-ran full `scripts/verify-platform.sh --quick`: PASS, incl. `generated-byte-identity: PASS` and `generate-check: PASS` |
| 5 | No generated or built surface carries the spaced display form (08-02) | ✓ VERIFIED | Re-ran `node scripts/scan-brand-residue.mjs`: PASS, 146 files; `verify-branding-preflight: PASS` in --quick |
| 6 | The preflight, branding check, and generator self-test assert the canonical form (08-02) | ✓ VERIFIED | All three self-tests re-ran PASS (generate 45, preflight, trademark-surface 5 plants); preflight plants name `PowerBrowser Dev` / `PowerBrowser` from inventory/brand-tokens.json:77-81 |
| 7 | A single-token display name emits cleanly through shell quoting, desktop Name, locale files, and NSIS defines (08-02) | ✓ VERIFIED | Canonical-name fixture (`display_name = "Ironwood"`, invented per fixture-header rule) on disk; `verify-downstream-fixtures: PASS` in re-ran --quick (6 fixtures incl. canonical-name) |
| 8 | The identity checker derives the new value with no re-pin, proving single-edit propagation (08-02) | ✓ VERIFIED | scripts/verify-branding-identity.mjs:121 imports `resolveConfig` from generate.mjs, zero spaced-form literals; release run below proves derivation live |
| 9 | A registerWindowActor call outside the boundary file fails the guard naming file and pattern (08-03) | ✓ VERIFIED | Re-ran `bash scripts/check-internals-boundary.sh --self-test`: all 3 plants PASS incl. actor plant naming file+pattern; unconditional entry at scripts/check-internals-boundary.sh:56 with no-exemption comment :50-55; `--only internals-boundary: PASS` |
| 10 | BiDi evaluate and screenshot run against the URL-bearing context, not the shell context (08-03) | ✓ VERIFIED | Live proof re-ran on current tree: `--only gui01-browser-close-does-not-quit: PASS` (bare launch, single context, evaluate targets it). `resolveUrlContext` at scripts/lib/firefox-bidi.mjs:149 via `topLevelContexts`; URL-passed-but-unmatched throws loud, never falls back |
| 11 | WINDOWS ledger entries 13 and 14 are closed with their gates green (08-03) | ✓ VERIFIED | .planning/WINDOWS.md rows 13/14 read `fixed` with 08-03 gate evidence; open_count is 2 (entries 11, 19 — outside this phase) |
| 12 | The mozconfig no longer disables the updater and the built tree contains an updater binary (08-04) | ✓ VERIFIED | .mozconfig:8 `ac_add_options --enable-unverified-updates`; re-ran `test -x objdir/dist/bin/updater` → UPDATER_PRESENT; release updater also present at objdir-release/dist/bin/updater |
| 13 | A Linux client performs one real N to N-plus-1 MAR hop from the fork update descriptor with zero Mozilla update hosts contacted (08-04) | ✓ VERIFIED | Re-ran `--only mar-update-hop: PASS` on current tree; hop.json on disk: 153.1.0/20260904184538 → 153.1.1/20260904191328, result applied; mar self-test re-ran PASS incl. same-version-loop and Mozilla-host plants REJECTED |
| 14 | makensis on Nix compiles the upstream installer script with generated branding on the Linux host (08-04) | ✓ VERIFIED | Re-ran `--only installer-build-proof: PASS` (makensis 3.12, setup.exe from generated branding.nsi); build-proof self-test re-ran PASS, 4 plants |
| 15 | BUILD.md documents the packaging procedure with attributed timings (08-04) | ✓ VERIFIED | Packaging procedure + key-custody rung + VM paths present; attributed-timings table at docs/BUILD.md:846-857 (tree+host+toolchain per row, e.g. release 54m40s with log path); every command ran live per D2/D3 rows above |
| 16 | MSIX and DMG artifacts are built on named real hosts, never on Linux (08-05) | STAGED | Plan-sanctioned falsification branch: no reachable win/mac host. BUILD.md:796-804 capability record with exact provisioning errors + operator unblocks for pkg-win11/pkg-macos; zero Linux MSIX/DMG attempts. Not a gap |
| 17 | The per-OS install, launch, uninstall, no-residue matrix is green including alongside stock Firefox (08-05) | STAGED (Linux VERIFIED) | Linux L1-L4 ALL PASS in .mozbuild/matrix/matrix.log on disk (L3: 20146-byte stock screenshot with fork alive; L4: empty home diff). Win/mac cells staged-unexecuted with unblocks at BUILD.md:834-835. Not a gap |
| 18 | One real N to N-plus-1 hop is proven per OS from the fork server (08-05) | STAGED (Linux VERIFIED) | Linux re-proven (see #13, row PASS on current tree 2026-09-05). Win/mac hops staged-unexecuted with unblocks. Not a gap |
| 19 | The release objdir-release build passes with release-variant rows green (08-05) | ✓ VERIFIED | Re-ran on current tree, no rebuild: `--only branding-variant-divergence: PASS`; `node scripts/verify-branding-identity.mjs --variant release`: all six surfaces PASS (brandFullName `PowerBrowser`, desktop `Name=PowerBrowser`, StartupWMClass `powerbrowser`, version `DeBIOS powerbrowser 153.1.0esr`). Ledger 10 reads fixed |
| 20 | The ESR rebase drill passes or is staged with the exact unblock condition (08-05) | ✓ VERIFIED | Drill ran live to FIREFOX_153_2_0esr_RELEASE with restore to pinned tag; logs on disk (.mozbuild/rebase-drill-0805.log, rebase-restore-0805.log); outcome + adoption note at docs/BUILD.md:882-897. Not re-run (would re-clobber objdir incrementals); evidence stands |

**Score:** 17/20 truths verified, 3 staged (plan-sanctioned falsification branches), 0 failed

### Staged Items (plan-sanctioned, not gaps)

Items not yet met but explicitly routed by plan 08-05's falsification criterion
(unreachable named VMs → record exact error + unblock, mark staged-unexecuted, never green-without-logs).

| # | Item | State | Evidence |
|---|------|-------|----------|
| 16 | MSIX/DMG on pkg-win11 / pkg-macos | staged-unexecuted | BUILD.md capability record: exact errors + operator unblocks |
| 17 | Windows/macOS matrix cells (incl. alongside + no-residue) | staged-unexecuted | BUILD.md:834-835 matrix table; Linux cells green (matrix.log ALL PASS) |
| 18 | Windows/macOS per-OS hops | staged-unexecuted | Same capability record; Linux hop green (row PASS + hop.json) |

The two build-anchored rows deferred with dated evidence in 08-02 (D4:
verify-branding-identity-dev desktop-entry on a pre-rename objdir,
branding-variant-divergence on absent objdir-release) were **cleared by 08-05**:
both release rows re-ran green above on the fresh objdir-release tree, and the
dev tree was rebuilt post-rename. No deferral remains open.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/generate.mjs` | WR-04 bare-dollar rejection + self-test plant | ✓ EXISTS + SUBSTANTIVE + WIRED | `NSIS_UNEMITTABLE` :882, `hasBareDollar` :891, guard :899; self-test 45 plants PASS |
| `scripts/verify-installer-schema.mjs` | WR-07 root-threaded readTileColor + divergent plants | ✓ EXISTS + SUBSTANTIVE + WIRED | `readTileColor(root)` :289, rooted calls :352/:449; self-test 4 plants PASS |
| `configuration.toml` | Canonical display_name | ✓ EXISTS + SUBSTANTIVE + WIRED | Line 38 `display_name = "PowerBrowser"`; --check 52 files PASS |
| `inventory/brand-tokens.json` | Re-pinned hand-authored display expectations | ✓ EXISTS + SUBSTANTIVE + WIRED | dev `PowerBrowser Dev`, release `PowerBrowser` (:77-81); preflight reads block at verify-branding-preflight.mjs:191 |
| `scripts/verify-branding-preflight.mjs` | Re-pinned plants/messages on canonical form | ✓ EXISTS + SUBSTANTIVE + WIRED | Self-test PASS; `--only branding-preflight: PASS` |
| `scripts/verify-branding.mjs` | Updated display expectation + NAME-01 re-scope | ✓ EXISTS + SUBSTANTIVE + WIRED | Per-text-node token-boundary check + derived legal-notice exemption; live row green via --gate evidence, gui01 row re-ran PASS |
| `fixtures/canonical-name/` | No-interior-space downstream fixture | ✓ EXISTS + SUBSTANTIVE + WIRED | `display_name = "Ironwood"` (invented single-token per fixture-header rule; satisfies frontmatter single-token shape); spaced-name fixture untouched (`Cedar Falls Browser`); downstream-fixtures row PASS |
| `scripts/check-internals-boundary.sh` | registerWindowActor forbidden pattern + plant | ✓ EXISTS + SUBSTANTIVE + WIRED | Entry :56 unconditional, no-exemption comment :50-55; self-test 3 plants PASS |
| `scripts/lib/firefox-bidi.mjs` | URL-matched context selection + logged fallback | ✓ EXISTS + SUBSTANTIVE + WIRED | `resolveUrlContext` :149; live gui01 row PASS on current tree |
| `.planning/WINDOWS.md` | Ledger 10/13/14 closed with gate evidence | ✓ EXISTS + SUBSTANTIVE | Rows 10/13/14 `fixed` with plan+gate citations; counts machine-consistent (2 open / 19 fixed) |
| `.mozconfig` | Regenerated updater-enabled flags | ✓ EXISTS + SUBSTANTIVE + WIRED | Line 8 `enable-unverified-updates`; byte-identity green; updater binaries present (dev + release) |
| `powerbrowser/distribution/policies.json` | Fork update URL policy, no self-update contradiction | ✓ EXISTS + SUBSTANTIVE + WIRED | `AppUpdateURL: https://updates.powerbrowser.org/update.xml`; hop row reads effective URL from policy, PASS |
| `scripts/verify-mar-update-hop.mjs` | MAR-hop check + mock-MAR twin + zero-Mozilla proof | ✓ EXISTS + SUBSTANTIVE + WIRED | `runChecks` :193; registry rows `mar-update-hop` + self-test twin; both PASS re-ran |
| `scripts/verify-installer-build-proof.mjs` | Build-proof check + synthetic-dist twin | ✓ EXISTS + SUBSTANTIVE + WIRED | Registry rows `installer-build-proof` + self-test twin; both PASS re-ran |
| `docs/BUILD.md` | Packaging procedure, capability record, matrix, drill | ✓ EXISTS + SUBSTANTIVE | AppUpdateURL procedure, host-capability rows (pkg-win11 ×3, pkg-macos ×3), staged matrices with unblocks, attributed timings, drill outcome |

**Artifacts:** 15/15 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| scripts/generate.mjs | powerbrowser/branding/*/configure.sh | emitter regenerates tracked branding through TARGETS, proved by byte-identity | ✓ WIRED | `--check`: all 52 files match; byte-identity row PASS |
| inventory/brand-tokens.json | scripts/verify-branding-preflight.mjs | preflight reads expected display values from inventory block | ✓ WIRED | preflight.mjs:191 reads `inv.brand_display_expectations`; plant derives dev full name from staged inventory |
| scripts/verify-branding-identity.mjs | configuration.toml | VARIANTS derive values via resolveConfig, no re-pin | ✓ WIRED | identity.mjs:121 imports resolveConfig; release run derives `PowerBrowser` live |
| scripts/check-internals-boundary.sh | powerbrowser/INTERNAL-APIS.md | boundary-file occurrences need catalogue row; zero WindowActor occurrences | ✓ WIRED | `--catalogue` mode covered by `internals-catalogue: PASS` in --quick |
| scripts/lib/firefox-bidi.mjs | scripts/verify-platform.sh | app-check callers launch bare / assert matched context | ✓ WIRED | 5 callers converted to bare launch; gui01 + shell01 rows PASS |
| scripts/generate.mjs | .mozconfig | mozconfig emitter regenerates flags through byte-identity in one commit | ✓ WIRED | Emitter literal :1208; tracked .mozconfig matches; --check PASS |
| powerbrowser/distribution/policies.json | scripts/verify-mar-update-hop.mjs | hop check reads effective update URL from policy | ✓ WIRED | `--only mar-update-hop: PASS` ("policy carries the fork update URL … verifies end to end") |
| scripts/verify-platform.sh | scripts/verify-*.mjs | registry rows appended, self-test twins riding quick | ✓ WIRED | 4 rows (mar-update-hop ×2, installer-build-proof ×2) all PASS re-ran |
| docs/BUILD.md | scripts/verify-platform.sh | procedure cites registry rows gating each proof | ✓ WIRED | Procedure cites mar-update-hop + installer-build-proof rows by label |
| .planning/WINDOWS.md | scripts/verify-platform.sh | gate exclusions key on ledger ids, never bare labels | ✓ WIRED | Ledger-10 exclusions disarmed by the ledger flip itself (08-05) |

**Wiring:** 10/10 connections verified

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| generate.mjs → branding.nsi | six NSIS defines | configuration.toml identity/branding via emitter | ✓ FLOWING | --check 52 files match; installer.nsi compiles with them (build-proof PASS) |
| policies.json → hop check | AppUpdateURL | fork descriptor served over loopback | ✓ FLOWING | hop.json applied N→N+1; access log cited; zero Mozilla hosts |
| inventory → preflight | brand_display_expectations | hand-authored values (independent third source) | ✓ FLOWING | Both counts and values asserted; plants go red naming values |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full static gate green | `scripts/verify-platform.sh --quick` | PASS, all rows | ✓ PASS |
| WR-04 discrimination | `node scripts/generate.mjs --self-test` | PASS, 45 plants | ✓ PASS |
| WR-07 discrimination | `node scripts/verify-installer-schema.mjs --self-test` | PASS, control-green + 4 plants | ✓ PASS |
| Preflight discrimination | `node scripts/verify-branding-preflight.mjs --self-test` | PASS | ✓ PASS |
| Boundary discrimination | `bash scripts/check-internals-boundary.sh --self-test` | PASS, 3 plants incl. actor | ✓ PASS |
| Patch surface clean | `bash scripts/check-patch-surface.sh` | PASS, 2 patches | ✓ PASS |
| MAR-hop discrimination | `node scripts/verify-mar-update-hop.mjs --self-test` | PASS, same-version + Mozilla-host plants red | ✓ PASS |
| Build-proof discrimination | `node scripts/verify-installer-build-proof.mjs --self-test` | PASS, 4 plants | ✓ PASS |
| Trademark discrimination | `node scripts/verify-trademark-surface.mjs --self-test` | PASS, 5 plants | ✓ PASS |
| MAR hop live (Linux) | `scripts/verify-platform.sh --only mar-update-hop` | PASS | ✓ PASS |
| NSIS-on-Nix live | `scripts/verify-platform.sh --only installer-build-proof` | PASS | ✓ PASS |
| BiDi live (two-context path) | `scripts/verify-platform.sh --only gui01-browser-close-does-not-quit` | PASS | ✓ PASS |
| Release variant live | `scripts/verify-platform.sh --only branding-variant-divergence` | PASS | ✓ PASS |
| Release identity live | `node scripts/verify-branding-identity.mjs --variant release` | PASS, all six surfaces | ✓ PASS |
| Updater present (dev + release) | `test -x objdir/dist/bin/updater` + release path | UPDATER_PRESENT both | ✓ PASS |
| Residue scan | `node scripts/scan-brand-residue.mjs` | PASS, 146 files | ✓ PASS |

Step 7b live-browser rows that need a display/server beyond headless
(branding live-Theia surfaces) rest on 08-05's recorded --gate green; the
headless-runnable subset above was re-run here. Tier-3 rebuilds were not
re-run per instruction; objdir evidence (binaries, logs, hop.json,
matrix.log) stands on disk and was read, not assumed.

### Probe Execution

No `scripts/*/tests/probe-*.sh` phase-declared probes exist for this phase;
PLAN/SUMMARY verification rides the registry `--self-test` twins and `--only`
rows listed above, all re-run here. Step 7c: no standalone probes to execute.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NAME-01 | 08-01, 08-02 | Canonical PowerBrowser everywhere + propagation proof | ✓ SATISFIED | display_name line, residue scan, preflight, fixture overlay, release identity six surfaces green |
| PKG-01 | 08-04, 08-05 | Windows + macOS installers built on packaging hosts | ◐ STAGED-PARTIAL | Nix NSIS proven (build-proof PASS); Linux matrix L1-L4 green; MSIX/DMG + win/mac cells staged with unblocks |
| PKG-02 | 08-04, 08-05 | Self-hosted MAR updates, per-OS matrix exit gate | ◐ STAGED-PARTIAL | Linux hop proven live (row PASS + hop.json applied); updater in dev+release; win/mac hops staged |
| PKG-03 | 08-01, 08-04 | BUILD.md procedure + WR-04/WR-07 pre-fixes first | ✓ SATISFIED | Both guards discriminate (self-tests PASS); procedure + timings + key-custody rung in BUILD.md |
| BLD-01 | 08-05 | Release objdir-release build + release rows green (#10) | ✓ SATISFIED | Both release rows re-ran PASS on current tree; ledger 10 fixed |
| UPD-03 | 08-05 | Live ESR rebase drill through rebase/conflict tooling | ✓ SATISFIED | Drill to 153.2.0esr + restore logged on disk; installer-schema green over rebased tree per log; outcome in BUILD.md |
| SEC-02 | 08-03 | WINDOWS #13 registerWindowActor hole closed | ✓ SATISFIED | Unconditional pattern + plant; self-test + row PASS; ledger 13 fixed |
| SHELL-01 | 08-03 | WINDOWS #14 BiDi context mis-resolution fixed | ✓ SATISFIED | resolveUrlContext + live gui01 row PASS on current tree; ledger 14 fixed |

**Coverage:** 6/8 fully satisfied, 2/8 staged-partial (Linux proven, win/mac staged per plan)

### 08-COVERAGE.json — 12 probe edges, each authored or flagged

The JSON inventory itself records all 12 as `unresolved` (it is the
pre-execution probe list; resolutions live in plan frontmatter + SUMMARYs).
Each edge maps to an explicit `flagged_assumptions` entry or discriminating
plant:

| # | Probe (req/category) | Disposition | Where |
|---|----------------------|-------------|-------|
| 1 | NAME-01/adjacency | Flagged: Dev-suffix join base + suffix pinned (`PowerBrowser Dev`) | 08-02 flagged_assumptions |
| 2 | NAME-01/empty | Flagged: empty display_name rejected by schema validation before emission | 08-02 flagged_assumptions |
| 3 | NAME-01/ordering | Flagged: divergence check compares both directions as sets over named keys | 08-02 flagged_assumptions |
| 4 | PKG-01/unclassified | Flagged + falsified: Nix NSIS spike falsified the Windows-only-plugin hypothesis (makensis 3.12 compiles in ~3s); residual Windows-only risk has recorded fallback | 08-04 flagged_assumptions + SUMMARY |
| 5 | PKG-02/idempotency | Flagged: regenerating update.xml from identical MAR bytes is byte-identical; asserted by double-generation in hop check | 08-04 flagged_assumptions |
| 6 | PKG-02/concurrency | Flagged: separate objdirs, content-addressed MARs; beyond that out of scope, recorded | 08-04 flagged_assumptions |
| 7 | PKG-03/unclassified | Flagged: WR-04/WR-07 plants are the discriminating gate; residual edges accepted as fixture-twin coverage | 08-01 flagged_assumptions |
| 8 | BLD-01/unclassified | Flagged: release build + both release-variant rows green is the coverage (re-ran green here) | 08-05 flagged_assumptions |
| 9 | UPD-03/unclassified | Flagged: drill green over rebased tree incl. installer-schema (log on disk) | 08-05 flagged_assumptions |
| 10 | SEC-02/boundary | Flagged: string-pattern boundary, no numeric threshold; one-line addition + plant is the proof | 08-03 flagged_assumptions |
| 11 | SEC-02/precision | Flagged: no numeric computation involved; not applicable, recorded not dropped | 08-03 flagged_assumptions |
| 12 | SHELL-01/unclassified | Flagged: two-context assertion + single-context control is the coverage (live row re-ran PASS) | 08-03 flagged_assumptions |

**Probes:** 12/12 accounted for (0 dropped silently)

### Backstop Prohibitions (15 — all confirmed with explicit evidence, 0 abstentions)

| # | Prohibition | Verdict | Explicit evidence (re-run or on-disk, not SUMMARY prose) |
|---|-------------|---------|----------------------------------------------------------|
| 08-01 P1 | Rename must not touch app_basename, binary_name, remoting_name, distribution_id, MOZ_APP_REMOTINGNAME, StartupWMClass | ✓ CONFIRMED | configuration.toml:39-42 frozen (`powerbrowser`/`org.debios`); release identity run: StartupWMClass=`powerbrowser`; byte-identity + preflight green |
| 08-01 P2 | WR-04 guard must not become an escaper; rejection-only | ✓ CONFIRMED | `hasBareDollar` uses replaceAll only to test, never rewrites the emitted value (:891 vs :899); self-test: bare rejected, doubled-dollar emits |
| 08-01 P3 | No upstream/ edit, no hand-edited patch hunk | ✓ CONFIRMED | `git -C upstream diff HEAD --name-only` = {browser/moz.build, browser/moz.configure} = patch-010/020 target set exactly; `check-patch-surface.sh: PASS` re-ran |
| 08-02 P1 | Must not rewrite spaced-name mechanism fixture | ✓ CONFIRMED | spaced-name fixture still `display_name = "Cedar Falls Browser"` |
| 08-02 P2 | No surface splits on interior space / trims spaceless to empty | ✓ CONFIRMED | Ironwood single-token fixture overlays clean; `verify-downstream-fixtures: PASS` in re-ran --quick |
| 08-02 P3 | Re-pinned error copy names product + ends with real next step | ✓ CONFIRMED | `shell-error-copy-no-internals` + self-test PASS in re-ran --quick |
| 08-03 P1 | No chrome-scheme exemption for actor registration | ✓ CONFIRMED | Comment :50-55 states unconditional; chrome-URL-carrying plant rejected (self-test re-ran) |
| 08-03 P2 | BiDi fix must not kill shell context / change launch semantics | ✓ CONFIRMED | Single-context control + live gui01/shell01 rows PASS (gui01 re-ran); zero new imports, process hygiene untouched |
| 08-03 P3 | Neither fix widens into GUI work | ✓ CONFIRMED | Changed files are scripts + WINDOWS.md only; no chrome UI surface |
| 08-04 P1 | Updater flag flip never accompanied by upstream/ edit | ✓ CONFIRMED | Same evidence as 08-01 P3 (diff set == patch targets; patch-surface PASS) |
| 08-04 P2 | Same-version MAR loop never presented as exit proof | ✓ CONFIRMED | Same-version plant REJECTED in re-ran self-test; hop.json shows two distinct versions + buildIDs, result applied |
| 08-04 P3 | Hop never contacts Mozilla hosts; green without fork-server log entry is failure | ✓ CONFIRMED | Mozilla-host plant REJECTED in re-ran self-test; `--only mar-update-hop: PASS` includes resolver-log sift + access-log proof |
| 08-05 P1 | No MSIX/DMG attempt from Linux tooling | ✓ CONFIRMED | BUILD.md stages win/mac cells; no Linux-built MSIX/DMG claimed anywhere |
| 08-05 P2 | Matrix must include alongside-stock-Firefox + no-residue check | ✓ CONFIRMED | matrix.log on disk: L3 alongside PASS (20146-byte stock screenshot, fork alive), L4 no-residue PASS (empty home diff) |
| 08-05 P3 | Production signing never procured or faked; test-signed only | ✓ CONFIRMED | Posture recorded BUILD.md:539, :807-808 (signtool test cert / ad-hoc codesign + SmartScreen/Gatekeeper friction); no cert material in tree |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None in phase-touched hunks | — | Changed hunks checked per SUMMARYs; re-ran scans (residue 146 files PASS, patch-surface PASS) confirm clean |

**Anti-patterns:** 0 found. No TODO/FIXME/placeholder stubs introduced; staged
cells are explicit staged-unexecuted records with unblocks, not stubs.

### Human Verification Required

N/A — Infrastructure/packaging phase with no user-facing elements to test
manually. All acceptance criteria are verifiable programmatically, and every
programmatic check was re-run above except tier-3 rebuilds (excluded by
instruction; their on-disk evidence was read directly) and the rebase drill
(not re-run: it would re-clobber objdir incrementals; drill + restore logs
verified on disk). The staged Windows/macOS cells are operator provisioning
work for a later phase with recorded unblock commands, not UAT for this phase.

## Gaps Summary

**No gaps found.** Phase goal achieved on every reachable host: the static
pipeline discriminates before binaries exist (WR-04/WR-07 plants), the
canonical PowerBrowser name is asserted on every surface including built
artifacts (release identity six surfaces green), the updater is compiled in
and one real Linux N→N+1 hop is proven with zero Mozilla hosts, NSIS compiles
on Nix, the release tree passes with ledger 10 closed, the rebase drill
passed with restore, and WINDOWS 13/14 are closed with green gates. The only
unproven cells (Windows MSIX / macOS DMG + per-OS matrix/hops) are
plan-sanctioned staged-unexecuted branches with exact errors and unblocks —
explicitly not gaps per the phase's falsification criterion.

## Verification Metadata

**Verification approach:** Goal-backward (derived from ROADMAP.md Phase 08 goal + 5 success criteria)
**Must-haves source:** 08-01 through 08-05 PLAN.md frontmatter (20 truths, 15 artifacts, 10 key links, 15 backstop prohibitions) + ROADMAP success criteria + 08-COVERAGE.json (12 probes)
**Automated checks:** 16 behavioral spot-checks re-run, all PASS (full --quick, 7 self-test twins, 4 --only rows, release identity, updater presence, residue scan, patch surface)
**Human checks required:** 0
**Total verification time:** ~15 min (no tier-3 rebuilds; no drill re-run)

---
*Verified: 2026-09-05T12:00:00Z*
*Verifier: Muse Spark (gsd-verifier)*
