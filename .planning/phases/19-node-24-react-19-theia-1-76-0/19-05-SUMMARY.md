---
phase: 19-node-24-react-19-theia-1-76-0
plan: 05
subsystem: theia sidecar dependencies (Theia re-pin), branding, telemetry, shell copy
tags: [UPD-09, RM-02, UPD-10, NG-086, NG-082, theia-1.76.0, commit-3-of-3]
status: complete
requires: [19-04]
provides:
  - "commit 3 of 3: every @theia/* except monaco-editor-core at 1.76.0, RM-02, startupEditor none, initSchema telemetry registration, nodeMissing copy at Node 24, engines >=24"
  - "ledger row NG-086 (open, phase 19) with a check-fail recorded against the 1.74.1 install"
affects: [19-06, 19-07]
tech-stack:
  added: ["@theia/*@1.76.0 (56 packages)", "@theia/getting-started@1.76.0", "@theia/plugin-utils@1.76.0", "@theia/telemetry@1.76.0"]
  patterns:
    - "Order-independent preference registration: a contribution with no static schema whose initSchema awaits one microtask, then updateSchemaProperty or addSchema"
    - "Pins moved only by the docs/BUILD.md runbook mover; lock moved only by yarn"
key-files:
  created: []
  modified:
    - configuration.toml
    - theia/package.json
    - theia/yarn.lock
    - theia/applications/browser/package.json
    - theia/extensions/{branding,chrome-bar,customize,modes,tab-uris,telemetry,token-gate}/package.json
    - theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts
    - theia/extensions/telemetry/src/browser/telemetry-preferences.ts
    - powerbrowser/shell/TheiaService.sys.mjs
    - .planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-UI-SPEC.md
  deleted:
    - theia/extensions/branding/src/browser/powerbrowser-ai-layout-contribution.ts
decisions:
  - "Telemetry collision (UPD-10): telemetry.telemetryLevel is registered in initSchema (one microtask, then updateSchemaProperty with the full PowerBrowser property, or addSchema when the key is absent). Needs Chris's acknowledgement: UPD-10 names him as the decider."
  - "The app manifest version moved to 1.76.0 (research recommendation; it is the About dialog's Version line)"
  - "@powerbrowser/branding keeps its @theia/ai-ide dependency (now 1.76.0); its sources no longer import it"
metrics:
  duration: ~10m
  completed: 2026-10-17
  tasks: 3
  files: 17
estimate_ref: {tokens: 55000, tasks: 3}
actuals:
  tokens: 65832
  tasks: 3
  commits: 2
commits: 2
plan_head_before: 0d4f2c993e1a53a7401bf3d4e4f869f2e479c30f
plan_head_after: 2700e4c3e6b65fde1ed7350a1c2e87c95589a892
---

# Phase 19 Plan 05: Theia 1.76.0 with its AI framework stock (commit 3 of 3) Summary

Every `@theia/*` package except `@theia/monaco-editor-core` is now at 1.76.0. Theia's AI framework runs as upstream ships it: both D-22 overrides are gone, and the 12 `@theia/ai-*` packages are still composed. The Welcome page is held off by `workbench.startupEditor: "none"`. PowerBrowser's telemetry text now wins in any module order, because it is registered in `initSchema`. NG-086 recorded its red run before the install and is green after it. The quick gate shows only the 4 baseline gui08 reds.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Precondition: NG-082 removed by Chris | none (already committed as 0d4f2c9) | none |
| 2 | Add NG-086, point it at its check, move the manifest pin, record the red | 02864f8 | ledger/REQUIREMENTS.json, ledger/checksums.sha256, ledger/history/log.jsonl |
| 3 | Re-pin to 1.76.0 with RM-02, startupEditor, telemetry registration; commit 3 | 2700e4c | 16 files (see below) |

## Task 1: precondition (did not stop)

The checkpoint did not fire. `python3 scripts/ledger-report.py --root .` showed `NG-082  dropped  Theia is re-pinned to 1.75.0 (UPD-02, UPD-04)...`. Chris ran the removal in his own terminal, and the ledger files were already committed on main as `0d4f2c9 chore(19): record Chris's removal of the 1.75.0 Theia row`. No quote from Chris is recorded here, because no checkpoint was returned. The agent never ran the removal.

- `git status --porcelain -- ledger` printed nothing.
- `phase-gate.py` printed nothing.
- `plan gate passed: 2/2 IDs cited (phase 19)`.

## Task 2: NG-086 and its red

**Ledger versions:** 371 before, 375 after. The four entries are 372 `add`, 373 `set-status` (phase 19), 374 `set` (test_ref and code_ref) and 375 `check-fail`.

- `add --id NG-086` accepted the ID, so no other session had taken it.
- test_ref is `scripts/verify-ng-086-theia-react-node.mjs::ng086-theia-react-node`, and code_ref is `configuration.toml [upstreams] theia_release`.
- configuration.toml was changed to `theia_release = "1.76.0"` while the install was still 1.74.1. The check then exited 1 with 53 FAIL lines, one for each installed @theia package.
- `record-fail` exited 0. The ledger's `check-fail` entry has `exit: 1`, `head: 0d4f2c99…` and `sha256: 9e206806…`. Its output tail reads:

```
ng086-theia-react-node: FAIL -- @theia/vsx-registry is installed at 1.74.1 (theia/node_modules/@theia/vsx-registry), but configuration.toml upstreams.theia_release is 1.76.0
ng086-theia-react-node: FAIL -- @theia/workspace is installed at 1.74.1 (theia/node_modules/@theia/workspace), but configuration.toml upstreams.theia_release is 1.76.0
```

- The ledger commit is `02864f8 chore(19): add the Theia 1.76.0 row NG-086 and record its failing run`, and it holds exactly the three ledger files.
- The Task 2 `<verify>` chain passed. It reported `plan gate passed: 3/3 IDs cited (phase 19)`, and phase-gate printed nothing.
- `scripts/verify-ng-086-theia-react-node.mjs` was never edited. `git diff --quiet HEAD` on it holds, and its only commit is 85d80a5 (19-02).

## Task 3: commit 3

**Commit 3:** `2700e4c3e6b65fde1ed7350a1c2e87c95589a892`, `build(19-05): re-pin Theia to 1.76.0 with its AI framework stock (UPD-09, RM-02)`. It has 16 files, 859 insertions and 2749 deletions. Every file is configuration.toml, under theia/, the shell file or its 01-UI-SPEC row.

**Mover output** (docs/BUILD.md step 2, run verbatim; `NEW=1.76.0` was read from the manifest):

```
moved theia/package.json
moved theia/applications/browser/package.json
moved theia/extensions/branding/package.json
moved theia/extensions/chrome-bar/package.json
moved theia/extensions/customize/package.json
moved theia/extensions/modes/package.json
moved theia/extensions/tab-uris/package.json
moved theia/extensions/telemetry/package.json
moved theia/extensions/token-gate/package.json
```

None of the moved lines is `@theia/monaco-editor-core`. It stays at 1.108.201.

**Edits outside the mover:**
- `theia/package.json`: `engines.node` changed from `>=22` to `>=24`.
- `theia/applications/browser/package.json`: `version` changed to `1.76.0`, and `"workbench.startupEditor": "none"` was added after `security.workspace.trust.enabled`.
- The `nodeMissing` entry in powerbrowser/shell/TheiaService.sys.mjs now reads: **"PowerBrowser needs Node.js and couldn't find it. Install Node.js 24 or later and open PowerBrowser again, or open Details for where it looked."** Its first sentence is byte-identical. The 01-UI-SPEC.md:204 row quotes the same text.
- **RM-02:** `git rm` removed powerbrowser-ai-layout-contribution.ts. The frontend module lost both `@theia/ai-ide` imports, the import of the deleted file, and the D-22 comment with its two guarded rebind blocks. The AboutDialog rebind is kept and still uses `isBound` and `rebind`.
- **Kept on purpose:** branding/package.json keeps `"@theia/ai-ide": "1.76.0"`. The orchestrator said to keep it unless it was needed. The mover moved its pin.
- **Telemetry:** see "Telemetry mechanism" below.

**Long runs**

| Run | Log | Wall s | Exit |
|-----|-----|--------|------|
| `yarn install --ignore-scripts` | logs/install-19-05.log | 31 | 0, `success Saved lockfile.` |
| drivelist `node-gyp rebuild` (yarn removed drivelist.node) | logs/drivelist-19-05.log | 7 | 0, `gyp info ok`, 83992 bytes |
| branding `yarn clean`, then `yarn build` | logs/build-19-05.log | 18 | 0, `[build/browser] Finished with 0 errors`, `[build/node] Finished with 0 errors` |
| `tsc -p . --noEmit` in all 7 extensions | logs/typecheck-19-05.log | n/a | `tsc_rc=0` x7 |
| `--quick` (staged tree) | logs/quick-19-05.log | 68 | 1 (4 baseline reds only) |
| live rows (fresh, carried, ng067) | logs/live-19-05.log | 32 | see below |
| carried re-run | logs/live-carried-rerun-19-05.log | 12 | 0 |

**Lock numstat:** `707 2550 theia/yarn.lock`. Research measured +729/-2583.
- **New package names:** no non-`@theia` package name in the new lock is absent from the 1.74.1 lock. The 48 non-@theia stanza changes all move the version of a package that was already present: acorn, ajv, b4a, bare-fs, body-parser, commander, dompurify, @electron/rebuild, esbuild, esbuild-plugins-node-modules-polyfill, escalade, find-up, graceful-fs, hasown, iconv-lite, ieee754, js-tokens, js-yaml, @lumino/commands, @lumino/dragdrop, @lumino/messaging, @lumino/properties, make-dir, markdown-it, markdown-it-anchor, markdown-it-emoji, mermaid, mime, minimatch, mocha, @modelcontextprotocol/sdk, multer, onetime, openai, @parcel/watcher, qs, readable-stream, semver, signal-exit, streamx, supports-color, tar-stream, @types/markdown-it, @types/semver, undici, util-deprecate, vscode-languageserver-textdocument, ws.
- **Removed:** 230 package names left the lock, most of them from the babel and webpack toolchain.
- **New @theia names:** getting-started, plugin-utils and telemetry, as the research predicted.

**Results of the `<verify>` chain** (`VERIFY_T3_OK C3=2700e4c3…`):
- **NG-086 PASS line:** `ng086-theia-react-node: PASS -- 56 @theia packages at 1.76.0 (@theia/monaco-editor-core excepted at 1.108.201); react 19.2.8 satisfies ^19.0.0; react-dom 19.2.8 satisfies ^19.0.0; @types/react 19.2.18 satisfies ^19.0.0; @types/react-dom 19.2.7 satisfies ^19.0.0; Node 24 (flake.nix nodejs_24) meets engines.node >=24`. This takes NG-086 from its recorded red to green.
- `single-copy-deps: PASS`: react 19.2.8, react-dom 19.2.8, @types/react 19.2.18, @types/react-dom 19.2.7 and inversify 6.2.2 each have one copy.
- `verify-upstream-pins: PASS -- … the Theia pin 1.76.0 agrees across resolutions, 8 member files and the lockfile`. Its `--self-test` also passed, with 4 planted faults going red.
- `verify-theia-build-order: PASS`. The token-gate `tsc -b` exited 0. The telemetry sender suite printed `SUITE PASS -- 9/9`.
- `verify-shell-error-copy` and its `--self-test` passed.
- `ai-set: PASS -- theia/applications/browser/package.json dependencies: 12 @theia/ai-* entries unchanged`, and `ai-set: PASS -- theia/package.json resolutions: 12 @theia/ai-* entries unchanged`.
- The branding sources contain no ai-ide, ai-layout or override name, and `lib/browser/powerbrowser-ai-layout-contribution.js` is gone.
- `node scripts/generate.mjs` ran with `generate: PASS -- 53 file(s)`. The tracked `git status` did not change.
- `scan-brand-residue: PASS -- … 349 scanned file(s)`, run on the staged tree.
- **Quick gate:** 118 PASS. The 4 FAIL rows are `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy` and `gui08-panorama-copy-self-test`. The R33 subtraction against docs/non-gui/quick-baseline.txt printed nothing.
- After the commit, `git status --porcelain -- theia configuration.toml powerbrowser/shell/TheiaService.sys.mjs` printed nothing.

## Live telemetry assertion (beyond the plan, on PB_VERIFY_PORT=3939)

The plan defers the live UPD-10 rows to 19-06. Three of them were run here because the telemetry registration changed in this commit. Each was run with `scripts/verify-platform.sh --only <row>`.

| Row | Result |
|-----|--------|
| first-boot-surface-fresh | PASS: `main area [welcome], perspective browsing, telemetry level off, Settings shows the telemetry-preferences.ts description, 0 boot errors, forced ForcedRenderError reached logError and the counter` |
| first-boot-surface-carried | FAIL on run 1 (web tab missing from the restored main area), then PASS on the re-run: `restored main area [view:welcome, http://127.0.0.1:42079/carried, view:disassembly-view-widget] equals the fixture's captured set, …, telemetry level off, Settings shows the telemetry-preferences.ts description` |
| ng067-frontend-errors-reach-telemetry | PASS: `both error kinds reach the logger; off sends nothing; error sends both` |

- At 1.76.0, the 19-04 notices (`@theia/getting-started is not installed`, and no startupEditor default) no longer print. The getting-started widget-absence assertion, its positive control and the `workbench.startupEditor === none` assertion are all active and green.
- The fresh main area is `[welcome]` alone, so Theia's Welcome page did not open.
- The forced render error was logged 2x and counted 2x, the same as at React 19 in 19-04.
- The wrapper's `PHASE19_EXIT=0` in logs/live-19-05.log is not meaningful, because the loop never assigned `rc`. Use the per-row `ROW_EXIT` lines instead.

## Telemetry mechanism (for Chris's acknowledgement, UPD-10)

`bindTelemetryPreferences` now binds a `PreferenceContribution` that has no `schema` field. Its `initSchema(service)` does three things:
1. It awaits `Promise.resolve()`. Every contribution's synchronous `addSchema` runs in one `forEach` before any `initSchema` continuation, so this registration always runs last.
2. If `service.getSchemaProperty('telemetry.telemetryLevel')` exists, it calls `updateSchemaProperty` with the full PowerBrowser property. At 1.76.0, @theia/telemetry, pulled in by @theia/plugin-ext, registers that key. Passing the full property keeps the default at `off` and fires no spurious default-change event.
3. If the key is absent, as in a tree without @theia/telemetry, it calls `addSchema(TelemetryPreferenceSchema)`.

The `TelemetryPreferences` proxy now uses `TelemetryPreferenceSchema` directly. The `TELEMETRY_LEVEL_PREFERENCE` export line is byte-identical, which matters because the locked ng067 check reads it by regex. The header comment was rewritten so that it is true at 1.76. **This is an autonomous decision recorded under the CONTEXT lock, and Chris should acknowledge it.**

## Observations for later plans

- **gui07-mode-switch-tabs-live is expected to go red now** (Research Pitfall 3). RM-02 lets `@theia/ai-ide` register the `ai-first` perspective, and no `@powerbrowser` source accounts for it. That row was not run here. The fix to `scripts/verify-mode-switch-tabs-live.mjs` belongs to 19-06, whose truths require the row to pass.
- **first-boot-surface-carried is intermittent at 1.76.0.** It was red once and green once, and this is logged in deferred-items.md. 19-06 should find the root cause if it repeats.
- `yarn install` printed a new unmet-peer warning, `@theia/ai-mcp > @modelcontextprotocol/sdk@1.32.1` wants `zod@^3.25 || ^4.0`. Per the research anti-pattern, the peer log is not a criterion. Build, typecheck and live rows are green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drivelist.node rebuilt after the install**
- yarn removed drivelist.node, which the standing rules anticipate. It was rebuilt with `node-gyp rebuild` inside the theia shell (gyp info ok, 83992 bytes). It was still present after the build.

**2. [Rule 2 - Missing verification] Full type check of all seven extensions against the 1.76.0 types**
- `yarn build`'s `tsc -b` does not re-check extensions whose own sources did not change when node_modules d.ts files change (19-04 observation). `tsc -p . --noEmit` was run in each extension inside the theia shell. All seven exit 0, and nothing was emitted (logs/typecheck-19-05.log).

**3. [Scope addition] Live first-boot and ng067 rows run in 19-05**
- These rows are not in the plan's verify. They were run because the orchestrator's success criteria ask for the live telemetry assertion. No code changed as a result.

No file outside the plan's `files_modified` was changed, except deferred-items.md, which got two notes.

## Known Stubs

None.

## Threat Flags

None. Mitigations as specified:
- **T-19-SC:** Chris's 19-04 approval came before the install. The install ran with `--ignore-scripts`, and the pins came from the mover. No new non-@theia package name entered the lock (list above).
- **T-19-13:** `startupEditor: none` is set, and the fresh and carried main areas exclude `getting.started.widget`, with its positive control active.
- **T-19-14:** the full property is passed, and the default stays `off`. The live rows read `telemetry level off` and show the file's description, and ng067 confirms that level off sends nothing.
- **T-19-15:** commit 3 touches only configuration.toml, theia/, the shell file and its UI-SPEC row. No file under theia/node_modules was edited. diff-theia-core runs in 19-06.
- **T-19-16:** Chris ran the removal. The agent ran only add, set-status, set and record-fail, each alone, with an explicit `--id`.

## Self-Check: PASSED

- FOUND: 02864f8 and 2700e4c are ancestors of HEAD.
- FOUND: configuration.toml has `theia_release = "1.76.0"`, the app manifest has `"workbench.startupEditor": "none"`, and telemetry-preferences.ts contains `initSchema`.
- FOUND (git-ignored): logs/install-19-05.log, drivelist-19-05.log, build-19-05.log, typecheck-19-05.log, quick-19-05.log, live-19-05.log, live-carried-rerun-19-05.log.
- `git rev-list --count 0d4f2c99..2700e4c3` = 2, which matches `commits: 2`.
