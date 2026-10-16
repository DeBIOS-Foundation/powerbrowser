---
phase: 18-firefox-153-5-0esr
plan: 01
subsystem: infra
tags: [gecko, esr, verify-platform, baseline, fetch-upstream, configuration-toml]

requires:
  - phase: 15
    provides: the 218-row verify-platform registry and the 153.1 dev and release objdirs
provides:
  - 18-FAILSET-153.1.txt, the 153.1 full-run FAIL set B with an owner on every row
  - a corrected _RELEASE/_BUILD<n> tag comment in scripts/fetch-upstream.sh
  - configuration.toml:104 split back into two comment lines
affects: [18-02, 18-03, phase-21, phase-25]

actuals:
  tokens: 1900
  tasks: 2
  commits: 2
plan_head_before: 802f2f82508af3b2882ae1b2cf4589f6ba043cb0
plan_head_after: b46876165bd131ddae1eecb5aafc7430781489f4

tech-stack:
  added: []
  patterns:
    - "Baseline FAIL set derived mechanically from the driver's own summary lines, never hand-listed"

key-files:
  created:
    - .planning/phases/18-firefox-153-5-0esr/18-FAILSET-153.1.txt
  modified:
    - scripts/fetch-upstream.sh
    - configuration.toml

key-decisions:
  - "18 ng-* live rows that failed only on the ng-a-live clean-tree guard (uncommitted .planning/STATE.md and state.json) were re-run with PB_NG_ALLOW_DIRTY=1 and passed; owner flaky-at-153.1"
  - "7 theia-app rows stay red at 153.1 because localhost:3000 is held by Chris's host-networked mem0-dashboard container; owner unowned-pre-existing; the container was not stopped (permission denied)"
  - "ng074-ci-green-on-main is red at 153.1 because gh is not authenticated in this environment, not because CI was read as failing; owner NG-074 (Phase 25) per the plan"

patterns-established:
  - "Plan 03 must free port 3000 and either commit .planning/ state or set PB_NG_ALLOW_DIRTY=1 before its 153.5 full run, or 25 of B's 30 rows go unmeasured"

requirements-completed: [UPD-05, UPD-06]

coverage:
  - id: D1
    description: "153.1 full-run FAIL set B committed before any tree change, one label<TAB>owner line per summary FAIL row"
    requirement: "UPD-06"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh (full, logs/full-153.1.log) plus the task 1 <verify> chain"
        status: pass
    human_judgment: true
    rationale: "Seven rows are owned as unowned-pre-existing because of an environmental port collision; Chris decides whether to free port 3000 for plan 03"
  - id: D2
    description: "fetch-upstream.sh tag comment states _RELEASE and _BUILD<n> can sit on different commits, with no tag literal"
    requirement: "UPD-05"
    verification:
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs; bash -n scripts/fetch-upstream.sh; staged comment-only diff gate"
        status: pass
    human_judgment: false
  - id: D3
    description: "configuration.toml:104 split into two comment lines with no TOML value changed"
    requirement: "UPD-05"
    verification:
      - kind: other
        ref: "node scripts/generate.mjs --check; scripts/verify-platform.sh --quick (only gui08 rows red)"
        status: pass
    human_judgment: false

duration: 50min
completed: 2026-10-16
status: complete
---

# Phase 18 Plan 01: 153.1 baseline and comment corrections Summary

**The 153.1 full-run FAIL baseline (218 rows, 188 PASS, 30 FAIL, every red row owned) is committed before the substrate moves. The fetch-upstream `_RELEASE`/`_BUILD<n>` comment and `configuration.toml:104` are corrected without a gate changing state.**

## Performance

- **Duration:** 50 min
- **Started:** 2026-10-16T22:36:07Z
- **Completed:** 2026-10-16T23:26:37Z
- **Tasks:** 2
- **Files modified:** 3

## Baseline run record (Task 1)

- **Commit measured:** `802f2f82508af3b2882ae1b2cf4589f6ba043cb0` (`PHASE18_RUN_COMMIT` line in logs/full-153.1.log)
- **Tree:** upstream/ HEAD `468445e58d3acc7e4e059be99856daff1f2ae8f1`; `objdir` and `objdir-release` both `Version=153.1.0`; no tracked changes under configuration.toml, scripts, .github, docs, README.md or patches; `POWERBROWSER_OBJDIR` and `POWERBROWSER_BRANDING` unset
- **Date:** 2026-10-16
- **Display:** `DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0`
- **Wall seconds:** 2105; exit 1 (expected: red rows exist)
- **Summary rows:** 218 total, 188 PASS, 30 FAIL
- **Tracked tree after the run:** identical to the pre-run `git status --porcelain` snapshot
- **Version-sensitive rows** (the list plan 03 needs green): none is red at 153.1

### FAIL set B by cause

| Rows | Count | Owner | Cause and rerun result |
|------|-------|-------|------------------------|
| gui08-canvas-geometry, -self-test, gui08-panorama-copy, -self-test | 4 | Phase 21 | Known red |
| ng074-ci-green-on-main | 1 | NG-074 (Phase 25) | This run failed on `gh auth login` missing, before reading any CI result |
| ng-001 … ng-015, ng-017, ng-018, ng-085 | 18 | flaky-at-153.1: passed on --only rerun | `scripts/lib/ng-a-live.mjs` `assertCleanTree` refused to run because `.planning/STATE.md` and `.planning/state.json` (orchestrator writes, no code) were uncommitted. All 18 passed on `--only` with `PB_NG_ALLOW_DIRTY=1` (logs/rerun-*.log, logs/triage-153.1.log) |
| smoke-theia, diff-theia-core, gui01-command-registered, verify-branding, verify-customize-inert, verify-dev-flag-off, verify-uri-roundtrip | 7 | unowned-pre-existing | `localhost:3000` is held by the `mem0-dashboard-1` container (host networking, page title "Mem0 - Log in"). `APP_URL` is hard-coded to :3000, so `theia_app_up` and `smoke-theia` refuse to boot. Failed again on `--only` with the same line. No ROADMAP phase, WINDOWS.md entry or ledger ID owns them |

**For Chris:** these 7 rows have no measured 153.1 state. Their failure is environmental, not a tree defect. They are the four `_run_app_check_mjs` rows, plus diff-theia-core and smoke-theia, plus verify-branding. Stopping the container was attempted and denied by the permission classifier. Plan 03 must free port 3000 before its 153.5 full run. If it does not, these rows fail the same way, the subset test passes on them without measuring anything, and a 153.5 regression in them stays hidden (T-18-02).

## Accomplishments

- 153.1 FAIL set B committed with an owner on all 30 rows, measured before any tree change in this phase
- 23 of the 26 unexpected reds were traced to two environmental causes: 18 to the clean-tree guard and 7 to the port collision. The remaining 3 are the known gui08 and ng074 rows
- fetch-upstream.sh comment no longer claims `_BUILD1` and `_RELEASE` always share a commit; it describes tags by suffix only
- configuration.toml:104 lost newline restored

## Task Commits

1. **Task 1: Record the 153.1 full-run FAIL baseline** - `5e0dcd3` (docs)
2. **Task 2: Correct the fetch-upstream tag comment and split configuration.toml:104** - `b468761` (fix)

## Files Created/Modified

- `.planning/phases/18-firefox-153-5-0esr/18-FAILSET-153.1.txt` - FAIL set B, 30 label<TAB>owner lines, LC_ALL=C sorted
- `scripts/fetch-upstream.sh` - tag-identity comment above the commit-hash comparison (comment only)
- `configuration.toml` - line 104 split into two comment lines (comment only)

## Decisions Made

- The 18 ng rows use the plan's `flaky-at-153.1: passed on --only rerun` owner, with the actual cause appended in parentheses, so plan 03 can see they are deterministic environmental blocks rather than intermittent failures.
- The owner of each port-bound row is `unowned-pre-existing: ` plus its first FAIL line, per the plan.
- Re-running the baseline in full was not chosen: the plan prescribes per-row `--only` triage, and a full re-run would not have changed the port result.

## Deviations from Plan

None. The plan executed as written. The triage branch for non-gui08 rows was exercised for 25 rows.

## Issues Encountered

- **Port 3000 collision.** Seven rows could not be measured, and freeing the port was outside what I was permitted to do (stopping `mem0-dashboard-1` was denied). This is recorded above for Chris and for plan 03.
- **gh is not authenticated.** `gh auth login` has not been run in this environment, so `ng074-ci-green-on-main` cannot read CI runs. It is owned by NG-074 in any case.
- **Ledger append failed.** `gsd_run windows append` refused to record the unmeasured-rows entry. Its reason: the WINDOWS.md table disagrees with its fenced JSON for rows 10, 11 and 19. That drift predates this plan, and recording the entry is best-effort, so it was not forced. The entry's text is in the table above.

## Verification

- Task 1 `<verify>`: PASS (summary line present, sentinels present, FAILSET labels equal the log's FAIL labels, every line has an owner, gui08 rows owned by Phase 21, upstream/ HEAD unchanged, file tracked)
- Task 2 `<verify>`: PASS (`verify-upstream-pins` PASS, `generate --check` PASS on 54 files, staged `scan-brand-residue` PASS on 365 files, `bash -n` clean, staged diff comment-only, `--quick` 118 rows with only the four gui08 rows red)

## User Setup Required

None for this plan. Before plan 03's full run, port 3000 must be free.

## Next Phase Readiness

- Ready for 18-02 (the pin move and rebase). The 153.1 tree may now be replaced.
- Plan 03 should treat the 18 `flaky-at-153.1` rows and the 7 port-bound rows as required-green, since none has a code-level owner. Before its full run it should: free port 3000; commit or exclude the `.planning` state writes, or export `PB_NG_ALLOW_DIRTY=1`; and run `gh auth login` if ng074 is to be read at all.

---
*Phase: 18-firefox-153-5-0esr*
*Completed: 2026-10-16*

## Self-Check: PASSED
