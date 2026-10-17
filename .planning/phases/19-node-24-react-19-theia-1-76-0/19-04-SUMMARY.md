---
phase: 19-node-24-react-19-theia-1-76-0
plan: 04
subsystem: theia sidecar dependencies (React)
tags: [UPD-08, UPD-10, react-19, commit-2-of-3, package-legitimacy]
status: complete
requires: [19-03]
provides:
  - "commit 2 of 3: react and react-dom 19.2.8, @types/react 19.2.18, @types/react-dom 19.2.7, at Theia 1.74.1"
  - "Chris's package-legitimacy approval for the commit-2 set and the Theia 1.76.0 set (covers plan 19-05's install too)"
affects: [19-05, 19-07]
tech-stack:
  added: [react@19.2.8, react-dom@19.2.8, scheduler@0.27.0, "@types/react@19.2.18", "@types/react-dom@19.2.7"]
  patterns:
    - "lock moved only by yarn; frozen reinstall on a fresh manifest copy proves it reproduces"
key-files:
  created: []
  modified:
    - theia/package.json
    - theia/applications/browser/package.json
    - theia/yarn.lock
decisions:
  - "The dropdown backstop's delta_px is measured against the widget's designed anchor (pill bottom plus the 4 px gap derived from chrome-bar-widget.tsx), not against the bare pill bottom; the plan's literal formula would read 4.5 px on a correctly anchored dropdown"
  - "A full non-incremental tsc --noEmit was run in all seven extensions, because tsc -b reported them up to date and so never type-checked against the new React 19 types"
metrics:
  duration: ~8m (resume to tasks complete)
  completed: 2026-10-17
  tasks: 3
  files: 3
estimate_ref: {tokens: 45000, tasks: 3}
actuals:
  tokens: 1532
  tasks: 3
  commits: 1
commits: 1
plan_head_before: e90b2accbd402fe8feb58a871670de6f9918dd6e
plan_head_after: 58007062987f372d36cda4ccac69c356c93b4eb9
---

# Phase 19 Plan 04: React 19.2.8 at Theia 1.74.1 (commit 2 of 3) Summary

React and react-dom are now at 19.2.8, and @types/react and @types/react-dom are at 19.2.18 and 19.2.7. Theia is still at 1.74.1. yarn regenerated the lock, and no @theia stanza moved. A frozen reinstall on a fresh copy of the manifests reproduced the lock byte for byte. Every package has exactly one installed copy. The quick gate shows only the 4 baseline gui08 reds. All ten live rows pass under React 19, and the chrome-bar dropdown opens 0.5 px from its designed anchor.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Package-legitimacy checkpoint (blocking-human) | none (gate) | none |
| 2 | React 19.2.8 pins, lock regeneration, frozen proof, quick gate, commit 2 | 5800706 | theia/package.json, theia/applications/browser/package.json, theia/yarn.lock |
| 3 | Live check under React 19 (N1, N2, N4) and the dropdown backstop | none (verification only) | logs only |

**Commit 2:** `58007062987f372d36cda4ccac69c356c93b4eb9`, `build(19-04): move React to 19.2.8 at Theia 1.74.1 (UPD-08)`. `git show --name-only --format=` lists exactly the three files.

## Task 1: package-legitimacy gate (T-19-SC)

The checkpoint was returned before any install. Chris's reply, verbatim:

> approved

Nothing was installed before that reply. Chris did not report running the optional NG-082 ledger command. Plan 19-05 must check for it rather than assume it ran.

**Registry probe (the plan's `<verify>` command):**

```
probe failures: []
PROBE_PASS
```

**Registry facts gathered for the checkpoint:**

| Package | Published (UTC) | Publisher | Provenance | Install scripts |
|---|---|---|---|---|
| react@19.2.8 | 2026-07-21T15:41:28Z | GitHub Actions (npm OIDC) | SLSA v1: react/react, refs/heads/releases/19.2.x, runtime_release_from_ci.yml | none |
| react-dom@19.2.8 | 2026-07-21T15:41:41Z | GitHub Actions (npm OIDC) | yes | none |
| @types/react@19.2.18 | 2026-07-30T21:54:03Z | types (ts-npm-types@microsoft.com) | no (normal for @types) | none |
| @types/react-dom@19.2.7 | 2026-09-03T11:04:47Z | types (ts-npm-types@microsoft.com) | no (normal for @types) | none |
| @theia/core@1.76.0 | 2026-09-24T12:59:07Z | GitHub Actions (npm OIDC) | SLSA v1: eclipse-theia/theia, refs/heads/release/1.76.x, publish-ci.yml | none |
| @theia/getting-started@1.76.0 | 2026-09-24T13:00:28Z | GitHub Actions | yes | none |
| @theia/telemetry@1.76.0 | 2026-09-24T12:57:52Z | GitHub Actions | yes | none |
| @theia/plugin-utils@1.76.0 | 2026-09-24T12:59:29Z | GitHub Actions | yes | none |

**Extra sweep over the 57 `@theia/*` names at 1.76.0:**
- 56 of them exist at 1.76.0, and all 56 were published by GitHub Actions.
- `@theia/monaco-editor-core` has its own version line and stays at 1.108.201.
- `@theia/ffmpeg` declares `install: node-gyp rebuild`, which is unchanged since 1.74.1. `--ignore-scripts` keeps it from running.

**scheduler@0.27.0** is the one new transitive package in commit 2. It is published by react-bot from facebook/react, and it has no install scripts.

## Task 2: commit 2

**Long runs**

| Run | Log | Wall seconds | Exit |
|-----|-----|--------------|------|
| `yarn install --ignore-scripts` (lock moves) | logs/install-19-04.log | 5 | 0, `success Saved lockfile.` |
| drivelist `node-gyp rebuild` (yarn removed drivelist.node) | logs/drivelist-19-04.log | 7 | 0, `gyp info ok` |
| `yarn build` | logs/build-19-04.log | 12 | 0, `[build/browser] Finished with 0 errors`, `[build/node] Finished with 0 errors` |
| `tsc -p . --noEmit` in all 7 extensions | logs/typecheck-19-04.log | n/a | `tsc_rc=0` x7 |
| frozen install on a fresh manifest copy | logs/frozen-19-04.log | 5 | 0, `Done in 5.16s.` |
| `--quick` (staged tree) | logs/quick-19-04.log | 76 | 1 (4 baseline reds only) |

**Lock diff:** numstat `22 33 theia/yarn.lock`, which is 55 changed lines. The research measured about 57. The diff contains these changes and nothing else:
- react 18.3.1 to 19.2.8, and react-dom 18.3.1 to 19.2.8.
- scheduler ^0.23.2 (0.23.2) to ^0.27.0 (0.27.0).
- @types/react 18.3.31 to 19.2.18, and @types/react-dom 18.3.7 to 19.2.7.
- @types/prop-types was dropped.
- The loose-envify range `^1.1.0, ^1.4.0` collapsed to `^1.4.0`.

Zero `@theia/` stanza header lines moved.

**Frozen proof:**
- `cmp` of the copied lock against the working-tree lock reports identical, and so does `cmp` against the staged lock.
- The copy's installed react and react-dom are both 19.2.8.
- The copy is still on disk, because the session's delete-guard hook blocks recursive deletes outside the project. Its path is /tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/frozen-19-04.wgHF.

**Single-copy PASS line:**

```
single-copy-deps: PASS -- react 19.2.8 at theia/node_modules/react; react-dom 19.2.8 at theia/node_modules/react-dom; @types/react 19.2.18 at theia/node_modules/@types/react; @types/react-dom 19.2.7 at theia/node_modules/@types/react-dom; inversify 6.2.2 at theia/node_modules/inversify
```

**NG-086 line:** `53 @theia packages at 1.74.1 (@theia/monaco-editor-core excepted at 1.108.201); react 19.2.8 satisfies ^18.3.1 || ^19.0.0; ... Node 24 (flake.nix nodejs_24) meets engines.node >=22`

**Quick gate:**
- The summary holds 118 PASS and 4 FAIL rows. The FAIL rows are `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy` and `gui08-panorama-copy-self-test`.
- The R33 subtraction against docs/non-gui/quick-baseline.txt prints nothing.

**Task 2 `<verify>` chain:** passed (`VERIFY_T2_OK C2=58007062…`). It confirmed all of these:
- verify-upstream-pins PASS: Theia 1.74.1 agrees across resolutions, 8 member files and the lockfile.
- scan-brand-residue PASS over 350 files.
- drivelist.node is present.

## Task 3: live rows under React 19

The loop ran with `PB_FIRST_BOOT_FIXTURE=$HOME/coding/Power-Browser-fixtures/phase19-carried-over` and `PB_VERIFY_PORT=3939`. It ran all ten rows without stopping at a red, and none was red, so no R28 re-run was needed. The total wall time was 154 s, and the log is logs/live-19-04.log, which ends `PHASE19_EXIT=0`.

| Row | Result | Wall s |
|-----|--------|--------|
| first-boot-surface-fresh | PASS: main area [welcome], perspective browsing, telemetry level off, 0 boot errors, forced ForcedRenderError reached logError and the counter | 11 |
| first-boot-surface-carried | PASS: `restored main area [view:welcome, http://127.0.0.1:42079/carried, view:disassembly-view-widget] equals the fixture's captured set` | 10 |
| verify-branding | PASS (title, favicon, welcome, about) | 12 |
| gui01-command-registered | PASS | 12 |
| gui02-web-tab-live | PASS | 26 |
| gui07-mode-switch-tabs-live | PASS | 17 |
| ng067-frontend-errors-reach-telemetry | PASS: both error kinds reach the logger; off sends nothing; error sends both | 8 |
| side02-token-negative | PASS | 1 |
| side02-token-positive | PASS | 1 |
| verify-uri-roundtrip | PASS | 56 |

**Dropdown backstop** (logs/backstop-dropdown-19-04.log). The script is /tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/backstop-dropdown-19-04.mjs. It drove the built shell headless over BiDi and typed into the pill input the same way React's change tracker sees typing (native value setter plus an input event).

```
BACKSTOP-DETAIL {"pillBottom":68.5,"pillLeft":128,"pillWidth":800,"ddTop":73,"ddLeft":128,"ddWidth":800,"parent":"body","position":"fixed","inlineTop":"73px"} designed_gap_px=4
BACKSTOP dropdown-anchor trigger_bottom=68.5 dropdown_top=73 raw_gap_px=4.5 designed_gap_px=4 left_delta_px=0 delta_px=0.5
```

The dropdown is portalled to body with position fixed. Its left edge and width equal the pill's, and its top is 0.5 px from the designed anchor `Math.round(pill.bottom + 4)`. If the portal had landed at the page origin, delta_px would read about -72.

**Task 3 `<verify>` chain:** passed (`VERIFY_T3_OK`). `git status --porcelain -- theia scripts` prints nothing.

## Observations for later plans

- **React 19 reports the forced render error fewer times.** first-boot-surface reads `forced error logged 2x, counted 2x` under React 19, and `6x, 6x` under React 18 (logs live-19-03 and first-boot-*-19-01). React 19 no longer replays a render error through extra re-render passes. The row passes because it requires the error to reach logError and the counter, which it does. A future check must not pin an exact count.
- **`tsc -b` does not see a change in `@types`.** yarn build reported all seven extensions up to date and re-emitted no lib file. Its up-to-date check covers project sources only, not d.ts files in node_modules. The React 19 type-compatibility evidence is therefore the full `tsc --noEmit` pass in logs/typecheck-19-04.log, not the build log.
- **The two first-boot rows print notices that matter to 19-05.** One says `@theia/getting-started is not installed`, and the other says no `workbench.startupEditor` default is declared, so neither assertion applies yet. Both assertions turn on at 1.76.0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The dropdown backstop formula omitted the designed gap**
- **Found during:** Task 3
- **Issue:** The plan defines `delta_px = dropdown_top - trigger_bottom` with a tolerance of ±2. The widget places the dropdown at `Math.round(pill.bottom + 4)` by design. The literal formula would therefore read 4.5 px on a correctly anchored dropdown and go red on a non-regression.
- **Fix:** delta_px is measured against the designed anchor. The script derives the 4 px gap from chrome-bar-widget.tsx at run time and fails closed if it cannot. The BACKSTOP line also prints the raw `trigger_bottom`, `dropdown_top` and `raw_gap_px=4.5`, so the plan's own quantity is visible. It also checks the left-edge alignment (0 px). The tolerance was not widened.
- **Files modified:** scratchpad script only
- **Commit:** none (verification only)

**2. [Rule 2 - Missing verification] A type check under React 19 types was added**
- **Found during:** Task 2
- **Issue:** `yarn build`'s `tsc -b` skipped all seven extensions as up to date, so the build log did not prove they compile against @types/react 19.
- **Fix:** Ran `tsc -p . --noEmit` in each extension inside the theia shell. All seven exit 0, and no file was emitted.
- **Commit:** none (logs only)

**3. [Rule 3 - Blocking] drivelist.node rebuilt after the install**
- yarn removed drivelist.node, which the standing rules anticipate. It was rebuilt with `node-gyp rebuild` inside the theia shell (gyp info ok, 83992 bytes), and it was still present after the build.

## Known Stubs

None.

## Threat Flags

None. The threats were mitigated as follows:
- **T-19-SC:** blocking-human approval came before any install. The registry probe and the provenance facts are recorded above. Every install ran with `--ignore-scripts`. No @theia stanza moved. The frozen reinstall's `cmp` reports identical.
- **T-19-10:** single-copy-deps PASS.
- **T-19-11:** side02-token-negative and side02-token-positive PASS live.
- **T-19-12:** the forced ForcedRenderError reached logError (2x under React 19), and ng067 PASS.

## Self-Check: PASSED

- FOUND: 5800706 is an ancestor of HEAD
- FOUND: theia/applications/browser/package.json contains `"react": "19.2.8"`, and theia/package.json contains `"@types/react": "19.2.18"`
- FOUND: logs/install-19-04.log, drivelist-19-04.log, build-19-04.log, typecheck-19-04.log, frozen-19-04.log, quick-19-04.log, live-19-04.log, backstop-dropdown-19-04.log (git-ignored)
