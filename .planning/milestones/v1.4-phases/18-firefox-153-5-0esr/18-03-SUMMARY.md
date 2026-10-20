---
phase: 18-firefox-153-5-0esr
plan: 03
subsystem: infra
tags: [gecko, esr, release-build, verify-platform, failset]

requires:
  - phase: 18
    provides: 18-01's 153.1 FAIL set B; 18-02's 153.5 pin, dev objdir and 153.5.0 package
provides:
  - objdir-release clobbered and rebuilt at 153.5.0esr with release branding
  - 18-FAILSET-153.5.txt, the 153.5 full-run FAIL set A with an owner on every row
  - docs/BUILD.md tier-3 rows #4 (dev) and #5 (release) for the 153.5 re-pin builds
affects: [phase-21, phase-25, 999.2]

actuals:
  tokens: 1500
  tasks: 2
  commits: 2
plan_head_before: aea81636aaa4b32fce85b5ecf5c613401d85339e
plan_head_after: 8415c63e4fde417b98d60484a401d05052c7f446

tech-stack:
  added: []
  patterns:
    - "FAIL set A derived from the driver's summary lines and compared with B by awk, not by reading"

key-files:
  created:
    - .planning/phases/18-firefox-153-5-0esr/18-FAILSET-153.5.txt
  modified:
    - docs/BUILD.md

key-decisions:
  - "Port 3000 was still held by mem0-dashboard-1 at the full run; the run went ahead and the 7 port-bound rows are owned as unmeasured, not as 153.5 evidence"
  - "PB_NG_ALLOW_DIRTY was not set: the tracked tree was clean and assertCleanTree ignores untracked files; all 18 ng-* live rows passed in the full run"
  - "UPD-06 marked complete under the locked criterion-4 reading; the 7 port-bound rows remain unmeasured at both 153.1 and 153.5"

requirements-completed: [UPD-06]

coverage:
  - id: D1
    description: "Release objdir at 153.5.0esr with release branding; stale-binary red observed first"
    requirement: "UPD-06"
    verification:
      - kind: integration
        ref: "logs/release-build-153.5.log (PHASE18_EXIT=0); --only verify-branding-identity-release/-dev, branding-variant-divergence"
        status: pass
    human_judgment: false
  - id: D2
    description: "153.5 full run: A subset of B, same row registry, 17 version rows PASS, every red owned"
    requirement: "UPD-06"
    verification:
      - kind: integration
        ref: "logs/full-153.5.log plus the Task 2 <verify> chain"
        status: pass
    human_judgment: true
    rationale: "7 theia-app rows are unmeasured at 153.5 because port 3000 is held; Chris must free it and re-run them with --only"

duration: 90min
completed: 2026-10-17
status: complete
---

# Phase 18 Plan 03: Release build at 153.5 and full-run comparison Summary

**The release objdir is rebuilt at 153.5.0esr with release branding (2620 s). The full 153.5 run has 218 rows, 206 PASS and 12 FAIL. Every FAIL label is in the 153.1 set B, and all 17 version-sensitive rows PASS. Seven of the 12 reds are unmeasured because port 3000 is still held.**

## Performance

- **Duration:** about 90 min
- **Started:** 2026-10-17T00:25Z
- **Completed:** 2026-10-17T01:55Z
- **Tasks:** 2
- **Files modified:** 2

## Task 1: release variant run record

| Step | Result |
|------|--------|
| Pre-build `--only verify-branding-identity-release` (stale 153.1 binary, 153.5 tree) | exit 1, as expected. `verify-branding-identity: FAIL version -- --version output="DeBIOS powerbrowser 153.1.0esr" (expected "DeBIOS powerbrowser 153.5.0esr")`, plus `FAIL runtime-identity` with `version="153.1.0esr" (expected "153.5.0esr")`. The row detects a stale binary |
| `mach clobber` with release env | 6 s, exit 0; `objdir-release/dist/bin/application.ini` absent; `objdir/dist/bin/application.ini` still `Version=153.5.0` |
| Release `mach build` (logs/release-build-153.5.log) | **2620 s**, `PHASE18_EXIT=0`; 0 `mach bootstrap` lines; 0 CLOBBER-updated messages |
| `objdir-release/config.status` | `with-branding=powerbrowser/branding/release` |
| application.ini, both objdirs | `Version=153.5.0` |
| `--version`, both binaries | `DeBIOS powerbrowser 153.5.0esr` |
| `--only` verify-branding-identity-release, -dev, branding-variant-divergence | all PASS |
| `--quick` after the docs edit | 118 rows, only the 4 gui08 rows FAIL; staged brand scan PASS (365 files) |

docs/BUILD.md tier-3 table: row #4 (dev) is 2388 s (~39m48s), taken from the `PHASE18_WALL_SECONDS` line of logs/dev-build-153.5.log. Row #5 (release) is 2620 s (~43m40s). The sccache cell reads `not sampled` in both rows.

## Task 2: full run at 153.5

- **Commit measured:** `d65b1b28f07a29f4c17c93e6c23318dce9c6343c` (`PHASE18_RUN_COMMIT` in logs/full-153.5.log). The baseline measured `802f2f82508af3b2882ae1b2cf4589f6ba043cb0`
- **Pre-flight:** no long run active; exactly one `objdir/dist/powerbrowser-153.5.0.en-US.linux-x86_64.tar.xz`; both objdirs `Version=153.5.0`; `DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0`, the same as the baseline; tracked tree clean; `PB_NG_ALLOW_DIRTY` unset
- **Port 3000:** `ss -ltnp` showed `0.0.0.0:3000` LISTEN immediately before the run (mem0-dashboard-1). Per the orchestrator decision, the run went ahead and the container was not touched
- **Wall:** 2456 s; exit 1 (expected: owned rows are red); `verify-platform: summary` present
- **Rows:** 218 total, 206 PASS, 12 FAIL. The baseline was 218 total, 188 PASS, 30 FAIL
- **Tracked tree after the run:** identical to the pre-run snapshot; no rerun was needed

### Criterion-4 reading (18-CONTEXT.md, locked) and result

The reading: "full `verify-platform.sh` passes" means all three of the following:
- no row is newly red at 153.5;
- every version-sensitive row is green;
- each remaining red row is named against its owning phase or ledger ID.

| Condition | Result |
|-----------|--------|
| Set B (153.1) | 30 labels: 4 gui08, ng074, 18 ng-* live rows (clean-tree guard), 7 port-bound rows |
| Set A (153.5) | 12 labels: 4 gui08, ng074, 7 port-bound rows |
| A labels absent from B (new red) | **empty** |
| Row-label sets, 153.1 against 153.5 | **equal**. `git log 802f2f8..d65b1b2 -- scripts/verify-platform.sh` is empty, so no row was added or removed |
| 17 version-sensitive rows | **all PASS**: smoke-firefox, verify-branding-identity-dev, -release, -brand-ftl-control, -runtime-control, branding-variant-divergence, installer-build-proof, about-dialog-suppression, apply-patches-self-test, check-patch-surface, verify-upstream-pins, desktop-entry-quick, ng063, ng064, ng065, ng066, ng072 |
| Remaining reds owned | gui08-canvas-geometry, -self-test, gui08-panorama-copy, -self-test: **Phase 21**. ng074-ci-green-on-main: **NG-074 (Phase 25)**, which failed on `gh auth login` missing in the run's environment, before reading CI. 7 port-bound rows: **unmeasured** (below) |

The 18 ng-* live rows that were red at 153.1 only because of the clean-tree guard all PASS in this full run, so they are measured at 153.5.

### The 7 port-bound rows are NOT evidence for 153.5

smoke-theia, diff-theia-core, gui01-command-registered, verify-branding, verify-customize-inert, verify-dev-flag-off and verify-uri-roundtrip failed with the same line as at 153.1. One example: `theia_app_up: FAIL -- something is still listening on http://localhost:3000 30s later (stale run?)`. They were unmeasured at 153.1 too, so the subset rule holds on them, but it holds without measuring anything. A 153.5 regression in these rows would be hidden. Their owner in 18-FAILSET-153.5.txt is `unmeasured: port 3000 held by mem0-dashboard-1 (needs Chris to free it, then re-run with --only)`.

**For Chris:** free port 3000 (stop `mem0-dashboard-1`), then run:

```sh
scripts/verify-platform.sh --only smoke-theia
scripts/verify-platform.sh --only diff-theia-core
scripts/verify-platform.sh --only gui01-command-registered
scripts/verify-platform.sh --only verify-branding
scripts/verify-platform.sh --only verify-customize-inert
scripts/verify-platform.sh --only verify-dev-flag-off
scripts/verify-platform.sh --only verify-uri-roundtrip
```

### MAR evidence (Pitfall E)

`.mozbuild/mar-hop/hop.json` `n.version` is **153.1.0**. The built `Version=` is **153.5.0**. The `mar-update-hop: PASS` in this run therefore re-verifies evidence that predates 153.5. It is not a 153.5 proof, which matches the `predates 153.5` labels in docs/BUILD.md. The re-run belongs to 999.2.

### Carried ledger rows

- **NG-074** (Phase 25): cited. `ng074-ci-green-on-main` is an owned known red here, and it is not closed.
- **NG-084** (Phase 24, the UAT sheets): cited, not touched.
- `rebase-upstream.yml` has not been exercised: no workflow run exists (recorded in 18-02).

## Task Commits

1. **Task 1: Release variant at 153.5** - `d65b1b2` (docs)
2. **Task 2: Full run compared with the 153.1 baseline** - `8415c63` (docs)

## Files Created/Modified

- `docs/BUILD.md` - tier-3 rows #4 and #5, plus one sentence naming them as the Phase 18 re-pin builds
- `.planning/phases/18-firefox-153-5-0esr/18-FAILSET-153.5.txt` - set A, 12 label<TAB>owner lines, LC_ALL=C sorted

## Decisions Made

- The 7 port-bound rows carry the orchestrator's `unmeasured: ...` owner, not B's `unowned-pre-existing: ...` text. This states plainly that they are not 153.5 evidence.
- `PB_NG_ALLOW_DIRTY` was not set. `assertCleanTree` runs `git status --untracked-files=no`, so the four untracked files belonging to other sessions do not count as dirty.
- The table dates use the host-local date on `legion` (2026-10-16 PDT) for both builds.

## Deviations from Plan

None. The plan executed as written. No new red appeared, so the rerun branch of Task 2 step 4 was not exercised.

## Issues Encountered

- Port 3000 is still held, so 7 rows are unmeasured at both baselines (see above).
- `gh` was not authenticated in the full run's environment, so ng074 failed on its prerequisite rather than on a CI result. NG-074 owns it either way.

## Next Phase Readiness

- Phase 18's build and verification work is done: both variants are at 153.5.0esr, and criterion 4 holds under the locked reading.
- Open for Chris: the 7 `--only` re-runs above, once port 3000 is free.

---
*Phase: 18-firefox-153-5-0esr*
*Completed: 2026-10-17*

## Self-Check: PASSED
