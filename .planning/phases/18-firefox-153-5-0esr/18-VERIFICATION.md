---
phase: 18-firefox-153-5-0esr
verified: 2026-10-17T02:30:00Z
status: human_needed
score: 10/11 must-haves verified
covered_files:
  - ".github/workflows/rebase-upstream.yml"
  - ".planning/phases/18-firefox-153-5-0esr/18-01-PLAN.md"
  - ".planning/phases/18-firefox-153-5-0esr/18-01-SUMMARY.md"
  - ".planning/phases/18-firefox-153-5-0esr/18-02-PLAN.md"
  - ".planning/phases/18-firefox-153-5-0esr/18-02-SUMMARY.md"
  - ".planning/phases/18-firefox-153-5-0esr/18-03-PLAN.md"
  - ".planning/phases/18-firefox-153-5-0esr/18-03-SUMMARY.md"
  - ".planning/phases/18-firefox-153-5-0esr/18-FAILSET-153.1.txt"
  - ".planning/phases/18-firefox-153-5-0esr/18-FAILSET-153.5.txt"
  - "README.md"
  - "configuration.toml"
  - "docs/BUILD.md"
  - "scripts/fetch-upstream.sh"
  - "scripts/smoke-firefox.sh"
  - "scripts/verify-platform.sh"
covered_digest: "v3:sha256:413548470fa08a6cb9aac76c9762d8173a39df1403e7d53020a55ae7fe4565a8"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Free localhost:3000 (it is held by the host-networked mem0-dashboard-1 container), then run each of: scripts/verify-platform.sh --only smoke-theia; --only diff-theia-core; --only gui01-command-registered; --only verify-branding; --only verify-customize-inert; --only verify-dev-flag-off; --only verify-uri-roundtrip"
    expected: "Each of the 7 rows prints `<label>: PASS` against the 153.5 objdirs. Any FAIL that is not a port-collision line is a 153.5 regression (or a pre-existing defect) that the phase did not measure."
    why_human: "Port 3000 is owned by Chris's container; the verifier is not permitted to stop it. These 7 rows were red with the same port-collision line at both 153.1 and 153.5, so the subset rule holds on them without measuring anything. Three of them (verify-branding, verify-uri-roundtrip, gui01-command-registered) drive objdir/dist/bin/powerbrowser over WebDriver BiDi (scripts/lib/firefox-bidi.mjs:44), so they are Gecko-version-sensitive and have no 153.5 evidence."
---

# Phase 18: Firefox 153.5.0esr Verification Report

**Phase Goal:** PowerBrowser builds on Gecko 153.5.0esr and passes the full verification run on both build variants
**Verified:** 2026-10-17T02:30:00Z
**Status:** human_needed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: configuration.toml pins `FIREFOX_153_5_0esr_BUILD1`; docs/BUILD.md records `223014c6b9299ac9b035b4c50ea481e5c6de282c`; rebase-upstream.yml mirrors the pin; the fetch-upstream tag comment is corrected; configuration.toml:104 is split | VERIFIED | configuration.toml:115 pin; :104-105 two comment lines; rebase-upstream.yml:33 `default: FIREFOX_153_5_0esr_BUILD1`; BUILD.md:1119-1120 SHA; fetch-upstream.sh:276-282 says `_RELEASE`/`_BUILD<n>` "usually share a commit, but not always", no tag literal. `node scripts/verify-upstream-pins.mjs` PASS and `generate --check` PASS (54 files), both run by the verifier |
| 2 | SC2: the four patches replay through rebase-upstream.sh with patches/ byte-unchanged; smoke-firefox.sh reports a version read from the tree | VERIFIED | logs/rebase-153.5.log ends `rebase-upstream: PASS` and `PHASE18_EXIT=0`; `git diff 802f2f8 HEAD -- patches/` empty; `git -C upstream diff` empty; `fetch-upstream.sh` (verifier run) reports `fully-applied` and `accounted-for clean`. smoke-firefox.sh reads `upstream/browser/config/version_display.txt`, has the absent-or-empty guard, and contains no `153.x` literal. Red direction in logs/dev-build-153.5.log:1447 (`did not report 153.1.0esr`), green in logs/smoke-153.5.log and in full-153.5.log (`smoke-firefox: PASS`) |
| 3 | SC3: dev objdir and objdir-release both build at 153.5 and both binaries report 153.5.0esr | VERIFIED | Both application.ini read `Version=153.5.0`; both binaries print `DeBIOS powerbrowser 153.5.0esr` (verifier run); objdir-release/config.status has `with-branding=powerbrowser/branding/release`; release-build log `PHASE18_EXIT=0`, 0 `mach bootstrap`, 0 CLOBBER messages; dev-build log 0 `mach bootstrap`. Verifier re-ran `--only verify-branding-identity-dev`, `-release` and `branding-variant-divergence`: all PASS with the 153.5.0esr version surface |
| 4 | SC4: a full scripts/verify-platform.sh run passes, with mar-update-hop evidence labelled pre-153.5 | ? UNCERTAIN | The locked criterion-4 reading's mechanical conditions hold (truths 9 and 10). But 7 of the 12 red rows were never measured at either version (port 3000 held), and 3 of those drive the Gecko binary. Their owner is `unmeasured: port 3000 held...`, which is an environmental cause, not the "owning phase or ledger ID" the CONTEXT reading requires. A human must free the port and run the 7 `--only` commands |
| 5 | The 153.1 FAIL baseline was taken and committed before any tree change, with an owner on every row | VERIFIED | full-153.1.log: `PHASE18_RUN_COMMIT=802f2f8...`, summary present, 218 rows, 30 FAIL; FAILSET-153.1 equals the log's FAIL labels exactly (verifier re-derived); baseline commit 5e0dcd3 is an ancestor of the pin commit 3cfc4cd; all 30 rows have a non-empty owner |
| 6 | objdir/dist holds exactly one 153.5.0 Linux package | VERIFIED | `objdir/dist/powerbrowser-153.5.0.en-US.linux-x86_64.tar.xz` is the only tarball; package-153.5.log `PHASE18_EXIT=0` |
| 7 | docs/BUILD.md records the SHA, labels MAR evidence pre-153.5, records rebase-upstream.yml as unexercised; README names the new pin | VERIFIED | BUILD.md:804 and :1048 `predates 153.5`; :1153 `unexercised`; :1119 `**Pinned ESR (Phase 18).**` with both 153.4 SHAs (match logs/ls-remote-153.4.log); README.md:87 `FIREFOX_153_5_0esr_BUILD1` |
| 8 | objdir-release rebuilt from a clobbered objdir with both POWERBROWSER_* variables | VERIFIED | logs/clobber-release-153.5.log present; config.status release branding; dev objdir config.status still names dev branding; prebuild-release-identity.log shows the expected stale-binary FAIL before the build |
| 9 | Full 153.5 run: same row set as 153.1, no FAIL label absent from the 153.1 set, all 17 version-sensitive rows PASS, every red row owned | VERIFIED | Verifier re-derived from logs: 218 rows both runs, row-label sets equal, `git log 802f2f8..d65b1b2 -- scripts/verify-platform.sh` empty; FAILSET-153.5 equals the log's 12 FAIL labels; awk subset check prints no new red; all 17 rows print `: PASS` in full-153.5.log |
| 10 | mar-update-hop PASS is reported as re-verifying pre-153.5 evidence | VERIFIED | `.mozbuild/mar-hop/hop.json` `n.version` = `153.1.0` against built `Version=153.5.0`; labelled in BUILD.md and 18-03-SUMMARY |
| 11 | Tier-3 table lists both 153.5 builds with measured wall times | VERIFIED | BUILD.md:560 row #4, 2388 s (matches dev-build log `PHASE18_WALL_SECONDS=2388`); :561 row #5, 2620 s (matches release-build log) |

**Score:** 10/11 truths verified (0 present, behavior-unverified; 1 uncertain, routed to human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `18-FAILSET-153.1.txt` | 153.1 FAIL set B, label TAB owner | VERIFIED | 30 lines, equals log, tracked |
| `18-FAILSET-153.5.txt` | 153.5 FAIL set A | VERIFIED | 12 lines, equals log, subset of B, tracked |
| `configuration.toml` | ESR pin, split comment | VERIFIED | Diff vs 802f2f8 is the pin line plus the comment split |
| `.github/workflows/rebase-upstream.yml` | Mirror default | VERIFIED | One-line change; verify-upstream-pins enforces equality |
| `scripts/smoke-firefox.sh` | Tree-derived version check | VERIFIED | Wired as registry row `smoke-firefox` (verify-platform.sh:4684) |
| `scripts/fetch-upstream.sh` | Corrected comment | VERIFIED | Comment-only change |
| `docs/BUILD.md` | Pin record, MAR labels, CI note, tier-3 rows | VERIFIED | All markers present |
| `README.md` | Current pin | VERIFIED | Line 87 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| configuration.toml | rebase-upstream.yml | verify-upstream-pins step 2 | WIRED | Verifier run PASS |
| fetch-upstream.sh | verify-upstream-pins.mjs | step 3 rejects tag literal | WIRED | PASS, "no second literal in scope" |
| smoke-firefox.sh | verify-platform.sh | registry row | WIRED | Row ran in full-153.5 and PASSed |
| package-linux.sh | built-tree.mjs packagePath | one tarball at built Version | WIRED | ng063/064/065/066/072 PASS in full-153.5 |
| FAILSET-153.5 | FAILSET-153.1 | subset relation | WIRED | Verifier awk check empty |
| objdir-release/config.status | powerbrowser/branding/release | --with-branding | WIRED | grep confirmed |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data. The equivalent trace for this phase, from the manifest pin through the generated fragment, the replayed tree, `version_display.txt` and the built binary's `--version`, is covered by truths 1-3.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Pins agree | `node scripts/verify-upstream-pins.mjs` | PASS | PASS |
| Generated output matches manifest | `node scripts/generate.mjs --check` | 54 files match | PASS |
| upstream/ at pin, dirt = patch stack (the WR-01 precheck) | `env -u TAG scripts/fetch-upstream.sh` | exit 0, accounted-for clean | PASS |
| Both binaries at 153.5 | `objdir*/dist/bin/powerbrowser --version` | `DeBIOS powerbrowser 153.5.0esr` x2 | PASS |
| Commit gate | `scripts/verify-platform.sh --quick` | 118 rows, only the 4 gui08 rows FAIL (Phase 21) | PASS |
| Version rows, no rebuild | `--only` verify-branding-identity-dev, -release, branding-variant-divergence, check-patch-surface, apply-patches-self-test, about-dialog-suppression | all exit 0 with substantive PASS lines | PASS |
| Tracked tree untouched by verifier | `git status --porcelain` before/after | identical | PASS |

`--only smoke-firefox` was not re-run by the verifier because it invokes `./mach build`. After the WR-01 fix (01d92d4) the script differs from the version that PASSed in full-153.5 only by the fetch-upstream precheck, and that precheck exits 0 on the real tree (row above). The orchestrator's post-fix `--only smoke-firefox` PASS has no retained log in `logs/`.

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` is declared by any plan or summary. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| UPD-05 | 18-01, 18-02 | Pin + SHA, patches replay unchanged, smoke derives version, tag comment, :104 fix | SATISFIED | Truths 1, 2 |
| UPD-06 | 18-01, 18-02, 18-03 | Dev and release builds at 153.5; full verify-platform run passes; MAR labelled pre-153.5 | NEEDS HUMAN | Builds and MAR label satisfied (truths 3, 10). "Full run passes" holds under the locked reading except the 7 unmeasured rows (truth 4). REQUIREMENTS.md already marks UPD-06 `[x]` Complete; that mark is ahead of the evidence until the 7 rows are run |
| NG-074 | 18-03 | Ledger row, carried (Phase 25) | CARRIED, not closed | `ng074-ci-green-on-main` red in both runs. At 153.5 it failed on its prerequisite (`gh auth login` missing), before reading any CI result |
| NG-084 | 18-03 | Ledger row, carried (Phase 24) | CARRIED, not touched | Not in REQUIREMENTS.md by design |

Orphaned requirements: none. REQUIREMENTS.md maps only UPD-05 and UPD-06 to Phase 18, and both are claimed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (lines added by phase 18 in 7 files) | - | TBD/FIXME/XXX/TODO/HACK | none found | - |
| docs/BUILD.md | ~1124 | The recorded SHA is not enforced by any gate (WR-05, documented as such) | Info | A re-pointed upstream tag would pass every gate; the docs state this plainly |
| scripts/smoke-firefox.sh | version match | Unanchored substring match (IN-03, open) | Info | A version that contains the expected string as a prefix would match |
| 18-REVIEW-DISPOSITION.md | - | IN-01, IN-02, IN-04, IN-05 open | Info | Wording and message-text issues only |

### Human Verification Required

### 1. Measure the 7 port-bound rows at 153.5

**Test:** Free localhost:3000 (currently LISTEN, held by `mem0-dashboard-1`), then run:

```sh
scripts/verify-platform.sh --only smoke-theia
scripts/verify-platform.sh --only diff-theia-core
scripts/verify-platform.sh --only gui01-command-registered
scripts/verify-platform.sh --only verify-branding
scripts/verify-platform.sh --only verify-customize-inert
scripts/verify-platform.sh --only verify-dev-flag-off
scripts/verify-platform.sh --only verify-uri-roundtrip
```

**Expected:** each prints `<label>: PASS`.
**Why human:** the port belongs to Chris's container and the verifier may not stop it. Without this run, these rows satisfy the subset rule only because they failed identically at 153.1 and 153.5. Three of them launch the 153.5 Gecko binary over WebDriver BiDi, so a 153.5 regression in BiDi, the shell or GUI-01's `window.open` path would not have been detected.

### Gaps Summary

No blocking gap. The pin, the replay, both 153.5 builds, the package, the tree-derived smoke check, the docs and the criterion-4 comparison are all present in the tree and in the logs. The verifier re-derived the comparison independently. The phase stops at `human_needed` rather than `passed` for one reason: "passes the full verification run" has 7 rows that were never measured at either Gecko version, and 3 of them exercise Gecko. The subset rule is satisfied, but that satisfaction is not evidence. The 7 `--only` commands above settle it.

Deferral was considered and rejected. Phase 19 runs live sidecar checks, but it also changes Theia, React and Node, so a failure there could not be attributed to 153.5.

---

_Verified: 2026-10-17T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
