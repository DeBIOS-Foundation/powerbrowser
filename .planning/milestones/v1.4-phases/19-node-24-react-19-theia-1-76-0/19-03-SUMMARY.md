---
phase: 19-node-24-react-19-theia-1-76-0
plan: 03
subsystem: build toolchain (.#theia dev shell)
tags: [UPD-07, node-24, flake, drivelist, commit-1-of-3]
status: complete
requires: [19-02]
provides:
  - "commit 1 of 3: the .#theia dev shell runs Node 24.19.0 (flake.nix only, flake.lock byte-unchanged)"
  - "theia/node_modules/drivelist rebuilt against nodejs-slim-24.19.0 headers (on disk, not tracked)"
affects: [19-04, 19-05, 19-07]
tech-stack:
  added: []
  patterns:
    - "yarn stays overridden onto the pinned nodejs, so lifecycle scripts and node-gyp compile on the shell's Node"
key-files:
  created: []
  modified:
    - flake.nix
decisions:
  - "The shellHook node-gyp comment was rewritten because its sentence 'would drag that Node back into the toolchain' became false once the pinned Node and nixpkgs' default nodejs are both 24.19.0; the reason it still holds is stated as the general case (a default that differs from the pin)"
metrics:
  duration: ~13m
  completed: 2026-10-17
  tasks: 2
  files: 1
estimate_ref: {tokens: 25000, tasks: 2}
actuals:
  tokens: 560
  tasks: 2
  commits: 1
commits: 1
plan_head_before: 9daa3b390a30eb32ea371fd0575c2560af9e4983
plan_head_after: 4cf6806f30a6eb1630e85f4a7f3153d842dd0c35
---

# Phase 19 Plan 03: Node 24 for the theia dev shell (commit 1 of 3) Summary

`flake.nix` now selects `pkgs.nodejs_24`, which is 24.19.0 at the locked nixpkgs rev. yarn stays overridden onto that nodejs. flake.lock is byte-unchanged. Under the new shell, drivelist was rebuilt against the Node 24.19.0 headers, smoke-theia and the full `yarn build` passed, the quick gate showed only the 4 baseline gui08 reds, and all five live rows passed.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Move the theia dev shell to Node 24, rebuild natively, build, quick gate | 4cf6806 | flake.nix |
| 2 | Live sidecar start after commit 1 | none (verification only) | logs only |

**Commit 1:** `4cf6806f30a6eb1630e85f4a7f3153d842dd0c35`, `build(19-03): move the theia dev shell to Node 24 (UPD-07)`. `git show --name-only --format= 4cf6806` prints only `flake.nix`.

## Recorded values

- **HEAD before:** `9daa3b390a30eb32ea371fd0575c2560af9e4983`
- **flake.lock sha256 before:** `e2d456892d4edf016746addbe85ffc48c5128f3c4c9d058721c564a11cddb156`
- **flake.lock sha256 after commit 1:** `e2d456892d4edf016746addbe85ffc48c5128f3c4c9d058721c564a11cddb156` (identical). `nix flake update` was never run.
- **Shell Node:** `nix develop .#theia --command node -v` prints `v24.19.0`. `node -p process.versions.node` prints `24.19.0`.
- **At the locked rev,** `pkgs.nodejs` (the default), `pkgs.nodejs_24` and the shell's node are all 24.19.0. yarn is 1.22.22.
- **drivelist nodedir:** `"nodedir": "/nix/store/bfqsxlviikq7vlp36kasy5hhamlxlkd2-nodejs-slim-24.19.0",` (build/config.gypi line 503).
  - The smoke log shows `gyp info using node-gyp@12.4.0` and `gyp info using node@24.19.0`.
  - `build/Release/drivelist.node` exists (83992 bytes) and was still present after the full build.
- **`grep -c nodejs_22 flake.nix`:** 0

## Long runs

| Run | Log | Wall seconds | Exit |
|-----|-----|--------------|------|
| smoke-theia (frozen install, drivelist rebuild, app build, node-pty spawn, backend boot on 3939) | logs/smoke-theia-19-03.log | 19 | 0, `  smoke-theia: PASS` |
| full `yarn build` (7 extensions + app) | logs/build-19-03.log | 9 | 0 |
| `--quick` (flake.nix staged) | logs/quick-19-03.log | 78 | 1 |
| live loop (5 rows) | logs/live-19-03.log | 78 | 0 |

The `--quick` run exits 1 because of the 4 known baseline reds. Its summary holds 118 PASS and 4 FAIL rows, all of them gui08: `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy` and `gui08-panorama-copy-self-test`. The R33 subtraction against docs/non-gui/quick-baseline.txt prints nothing.

The quick log's NG-086 line now reads `Node 24 (flake.nix nodejs_24) meets engines.node >=22`. `single-copy-deps` is still PASS at react 18.3.1.

## Live rows (Task 2)

| Row | Result | Wall seconds | R28 re-run |
|-----|--------|--------------|------------|
| first-boot-surface-fresh | PASS: main area [welcome], perspective browsing, telemetry off, 0 boot errors, forced ForcedRenderError reached logError and the counter | 10 | not needed |
| first-boot-surface-carried | PASS: `restored main area [view:welcome, http://127.0.0.1:42079/carried, view:disassembly-view-widget] equals the fixture's captured set`, not the R7 notice | 9 | not needed |
| side02-token-negative | PASS | 3 | not needed |
| side02-token-positive | PASS | 1 | not needed |
| verify-uri-roundtrip | PASS | 55 | not needed |

`PB_FIRST_BOOT_FIXTURE=$HOME/coding/Power-Browser-fixtures/phase19-carried-over` was exported for the loop. The loop ran every row regardless of earlier results, and none failed.

## Verification results

- **Task 1 `<verify>` chain:** passed (VERIFY_T1_OK).
  - It found commit 1 by its selector line: `4cf6806f…`.
  - Commit 1 touches only flake.nix, and flake.lock is unchanged in commit 1 and from commit 1 to HEAD.
  - The node version is 24.x, nodedir matches, and drivelist.node is present.
  - Both LONG logs end `PHASE19_EXIT=0`, NG-086 is PASS, and the R33 subtraction is empty.
- **Task 2 `<verify>` chain:** passed (VERIFY_T2_OK).
- **Acceptance criteria:** all met (see Recorded values).
- **pgrep:** clean before smoke-theia, the build and the live loop. Port 3000 was never touched, and PB_VERIFY_PORT stayed 3939.

## Observations for later plans

- **`yarn build` did not re-emit any extension lib.** It ran `tsc -b` in all seven extensions and each was already up to date, so no `lib/` file was rewritten (the same result as 19-01). tsc output does not depend on the Node version, so the libs the live tier serves are current. The app bundle was rebuilt (`[build/browser]` and `[build/node]`, 0 errors).
- **Which Node runs the sidecar in the live first-boot rows.** In those rows the browser spawns the sidecar with `node` from PATH (TheiaService.sys.mjs:493), because the dev build has no staged `objdir/dist/bin/node`. Outside a dev shell, PATH `node` on this host is `/nix/store/glcp73hg…-nodejs-24.19.0/bin/node`, which has the same version and ABI as the shell's node. The rows therefore exercised Node 24.19.0, but through the host's node and not the dev shell's.
- **A stale comment outside this plan's scope.** `scripts/smoke-theia.sh` still says "under the pinned Node 22" in its node-pty comment. Commit 1 is locked to flake.nix alone, so it was left for a later plan.

## Deviations from Plan

None in behaviour. The shellHook comment edit is the one the plan allowed ("Fix the shellHook comment only if a sentence in it is now false"). The decisions frontmatter gives the reason.

## Known Stubs

None.

## Threat Flags

None. The threats were mitigated as follows:
- **T-19-07:** flake.lock's sha256 was recorded before and after, and the verify chain compares flake.lock across commit 1 and from commit 1 to HEAD.
- **T-19-08:** side02-token-negative and side02-token-positive passed live.
- **T-19-09:** nodedir names nodejs-slim-24.19.0, derived from `node -p process.versions.node`, and drivelist.node exists.
- **T-19-SC:** the only install was smoke-theia's frozen install against the unchanged lock.

## Self-Check: PASSED

- FOUND: flake.nix contains `      nodejs = pkgs.nodejs_24;` and `yarn = pkgs.yarn.override { inherit nodejs; };`
- FOUND: 4cf6806 is an ancestor of HEAD
- FOUND: logs/smoke-theia-19-03.log, build-19-03.log, quick-19-03.log, live-19-03.log (git-ignored)
