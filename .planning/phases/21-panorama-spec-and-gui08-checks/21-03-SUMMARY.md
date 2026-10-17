---
phase: 21-panorama-spec-and-gui08-checks
plan: 03
subsystem: verification
tags: [gui08, panorama, copy-gate, ui-spec, self-test]
status: complete
requires: [21-01]
provides: [verify-gui08-panorama-copy derived from 15-UI-SPEC with a 9-plant self-test]
affects: [gui08-panorama-copy, gui08-panorama-copy-self-test]
tech-stack:
  added: []
  patterns: [spec-derived expectation via scripts/lib/ui-spec.mjs, in-memory plants with anchor-drift detection]
key-files:
  created: []
  modified: [scripts/verify-gui08-panorama-copy.mjs]
decisions:
  - "verify-gui08-panorama-copy keeps no copy list: the contract and retired sets come from the 15-UI-SPEC Copywriting Contract at check time, and the spec is excluded from the retired-copy search"
metrics:
  duration: 10min
  completed: 2026-10-17
requirements: [PAN-01, NG-074, NG-084]
actuals:
  tokens: 3500
  tasks: 2
  commits: 2
plan_head_before: 177e222bab5b9cc7b10c2124b2ca259c1ab483a8
plan_head_after: adff6b59025d0ea4361ee5942ff1a6a4ba825880
---

# Phase 21 Plan 03: panorama-copy derives from 15-UI-SPEC Summary

`verify-gui08-panorama-copy` now reads its contracted and retired copy from the 15-UI-SPEC Copywriting Contract through `copyContract`/`normaliseSlots` in `scripts/lib/ui-spec.mjs`. The hand-kept `EXPECTED_COPY`/`RETIRED_COPY` blocks are deleted. A 9-plant self-test, 4 of them on the spec, proves the check reads the spec.

## Results

Task 1 PASS line at the post-21-01 tree:

```
verify-gui08-panorama-copy: PASS -- 29 painted strings equal the 29 literals of the 15-UI-SPEC Copywriting Contract; 4 retired literals absent; no internals in copy
```

Before the rewrite, the check was red on the same tree: `"Expand"` and `"Done"` were unreviewed, and `"Ungrouped"` and the tray caption were GONE.

Task 2 self-test:

```
  ok  label drift -> user-facing strings NOT in the declared contract (unreviewed copy): "New group"
  ok  Expand removed -> declared contract strings are GONE (drifted or removed copy): "Expand"
  ok  placeholder revival -> retired copy "Organising arrives next" survives in theia/extensions/modes/src/browser/organising-widget.ts -- ...
  ok  unscanned-file revival -> retired copy "Back to Browsing" survives in theia/extensions/modes/src/browser/mode-descriptors.ts -- ...
  ok  spec Done row deleted -> user-facing strings NOT in the declared contract (unreviewed copy): "Done"
  ok  spec Retry reworded -> ... (unreviewed copy): "Retry" | declared contract strings are GONE (drifted or removed copy): "Try again"
  ok  spec heading stripped -> derived ZERO contracted literals from the Copywriting Contract table in .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md -- ... (broken instrument, not a clean tree)
  ok  retired caption revived -> retired copy "No ungrouped tabs — drag a tab here to ungroup it." survives in theia/extensions/modes/src/browser/organising-widget.ts -- ...
  ok  Retired copy heading stripped -> derived ZERO retired literals from the ### Retired copy table in .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md -- ... (broken instrument, not a clean tree)
verify-gui08-panorama-copy --self-test: PASS -- 9 planted faults went red naming the drift
```

Both tasks' `<verify>` blocks passed: the committed state, planning-paths, the residue scan, phase-gate silent, and no writes to disk.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | af75de6 | test(21-03): derive the panorama copy contract and retired copy from 15-UI-SPEC (PAN-01) |
| 2 | adff6b5 | test(21-03): plant code-side and spec-side copy faults in the panorama-copy self-test (PAN-01) |

`git show --stat` on each commit lists only `scripts/verify-gui08-panorama-copy.mjs`.

## Deviations from Plan

None. The plan was executed as written. One choice inside the plan's latitude: `expect` is a list of groups, and each group must be matched in full by one failure line. Plant 6 therefore requires the surplus line and the missing line separately.

## Notes

- The registry rows are unchanged. `scripts/verify-platform.sh` was not run, because 21-04 owns the wave's `--quick` run.
- The unused `fail()` helper was already dead before this plan and is left in place.
- NG-074 and NG-084 are cited only. No ledger file was touched.

## Self-Check: PASSED

- FOUND: scripts/verify-gui08-panorama-copy.mjs
- FOUND: af75de6, adff6b5 (ancestors of HEAD)
