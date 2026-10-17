---
phase: 19-node-24-react-19-theia-1-76-0
plan: 06
subsystem: verification and docs at Theia 1.76.0 (frozen reinstall, live first boot, backstops, full run, R33 baseline)
tags: [UPD-07, UPD-08, UPD-09, UPD-10, RM-02, NG-086, NG-074, NG-084, theia-1.76.0, full-run]
status: complete
requires: [19-05]
provides:
  - "19-FAILSET-1.76.txt: the full-run FAIL set at 1.76.0, five owned reds, derived from logs/full-19-06.log"
  - "first-boot-surface-carried no longer races the post-ready session restore"
  - "BUILD.md UPD-04 record and executed-bump record at 1.76.0; UPD-09 and the Phase 19 Needs Chris line reworded to the drop-and-add mechanism"
affects: [19-07]
tech-stack:
  added: []
  patterns:
    - "A live check that reads restored state waits for the product's own documented restore step, then compares; the comparison and failure text stay unchanged"
key-files:
  created:
    - .planning/phases/19-node-24-react-19-theia-1-76-0/19-FAILSET-1.76.txt
  modified:
    - scripts/verify-first-boot-surface.mjs
    - docs/BUILD.md
    - README.md
    - docs/non-gui/decisions.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - scripts/smoke-theia.sh
    - scripts/verify-platform.sh
    - scripts/lib/firefox-bidi.mjs
    - .planning/phases/19-node-24-react-19-theia-1-76-0/deferred-items.md
decisions:
  - "first-boot-surface-carried waits up to 20 s for the fixture's main-area set before it reads, because web tabs are restored by SetupsService.applyLastSession after 'ready' by design (measured: about 40 ms after 'ready')"
  - "The dropdown backstop opens the dropdown only after the pill has held still for 1 s, because at 1.76.0 the top panel settles about 0.5 s after the input is first visible"
  - "The dependent-theme backstop moves terminal t1, not a web tab, because web tabs are deliberately not ExtractableWidget"
metrics:
  duration: ~58m
  completed: 2026-10-17
  tasks: 2
  files: 11
estimate_ref: {tokens: 50000, tasks: 2}
actuals:
  tokens: 2924
  tasks: 2
  commits: 2
commits: 2
plan_head_before: ac3a9418d12f7cef5200b859534e9cce3b442e97
plan_head_after: c9baab676941b583b909fd40cdf3568084eaf0a5
---

# Phase 19 Plan 06: Theia 1.76.0 proven from the outside Summary

A frozen reinstall from scratch at 1.76.0 reproduces the committed lock byte for byte. Both config-dir modes pass the UPD-10 first-boot check, and both UI-SPEC visual backstops hold. The full `verify-platform.sh` run has 218 PASS and 5 FAIL, and all five FAILs are owned reds from the 153.5 set: the four gui08 rows (Phase 21) and ng074 (NG-074). All seven port-3000 rows that were "unmeasured" in Phase 18 now pass on 3939. The quick baseline is unchanged. The intermittent red in `first-boot-surface-carried` turned out to be a race in the check, not a product regression, and it is fixed.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Frozen reinstall, first boot in both modes, two visual backstops | dfef881 (deviation fix; the task itself is verification only) | scripts/verify-first-boot-surface.mjs |
| 2 | Full run, owned FAIL set, R33 baseline, docs | c9baab6 | 19-FAILSET-1.76.txt, REQUIREMENTS.md, ROADMAP.md, BUILD.md, README.md, decisions.md, smoke-theia.sh, verify-platform.sh, firefox-bidi.mjs |

## Task 1

**Frozen proof** (logs/frozen-19-06.log, 5 s, `PHASE19_EXIT=0`). The scratch copy held theia/package.json, theia/yarn.lock, the app manifest and all seven extension manifests. `yarn install --ignore-scripts --frozen-lockfile --prefer-offline` ran in the theia shell.

```
Done in 4.13s.
LOCK_CMP=identical
COPY_THEIA_CORE=1.76.0 PIN=1.76.0
```

**First boot at 1.76.0** (logs/live-19-06.log, `PHASE19_EXIT=0`, run after the fix below):

```
first-boot-surface-fresh: PASS -- main area [welcome], perspective browsing, telemetry level off, Settings shows the telemetry-preferences.ts description, 0 boot errors, forced ForcedRenderError reached logError and the counter
first-boot-surface-carried: PASS -- restored main area [view:welcome, http://127.0.0.1:42079/carried, view:disassembly-view-widget] equals the fixture's captured set, perspective browsing, telemetry level off, Settings shows the telemetry-preferences.ts description, 0 boot errors, forced ForcedRenderError reached logError and the counter
```

- In 19-04, the check printed two notices: `@theia/getting-started is not installed` and no `workbench.startupEditor` default. Neither prints now, because both expectations derive from the 1.76 tree. That means the `getting.started.widget` absence assertion, its positive control (the command opens the widget) and the `startupEditor === none` assertion all ran inside the judge, and all passed.
- The forced render error was logged 2x and counted 2x. The check requires at least 1 and never an exact count.

**Backstops:**

```
BACKSTOP dropdown-anchor trigger_bottom=68.5 dropdown_top=73 raw_gap_px=4.5 designed_gap_px=4 left_delta_px=0 delta_px=0.5
BACKSTOP dependent-theme core_bg=rgb(30,30,30) dependent_bg=rgb(30,30,30) match=yes
```

- **Dropdown** (logs/backstop-dropdown-19-06.log). As in 19-04, the delta is measured against the widget's designed anchor, `Math.round(pill.bottom + 4)`, which is derived from the source. The script also printed `BACKSTOP-SETTLE pill bottom 65.5 -> 68.5`; see deviation 2.
- **Dependent theme** (logs/backstop-theme-19-06.log):
  - `powerbrowser.setups.open-dependent` (id derived from setups-commands.ts) moved terminal `t1`.
  - A new `secondary-window.html` top-level context opened.
  - The active theme is `dark` (type `dark`).
  - Both bodies compute `rgb(30, 30, 30)`.

`git status --porcelain --untracked-files=no` printed nothing after the task, and `VERIFY_T1_OK` printed.

## Task 2

**Precondition.** `gh auth status` reported a login to github.com as ServerDestroyer (keyring), with scopes read:org, repo and workflow. Inside the row, though, ng074 still printed `could not read the verify.yml runs for main: To get started with GitHub CLI, please run: gh auth login`. The check's environment does not see the keyring login. The row is an owned red either way (NG-074).

**Full run** (logs/full-19-06.log):

| Field | Value |
|-------|-------|
| PHASE19_RUN_COMMIT | dfef881821be1c816461e0cfe46bee6169b90c30 |
| Wall time | 2327 s (Phase 18: 2456 s) |
| Totals | 218 PASS, 5 FAIL, `PHASE19_EXIT=1` |
| FAIL rows | gui08-canvas-geometry, gui08-canvas-geometry-self-test, gui08-panorama-copy, gui08-panorama-copy-self-test, ng074-ci-green-on-main |

**R28.** I re-ran each of the five alone (logs/r28-reruns-19-06.log), and each was red again. The gui08 rows report 3 and 2 failures, and their self-tests say "the unmodified tree is already red". ng074 hit the same gh prerequisite. All five are in the allowed set, so none is a regression from this phase.

**19-FAILSET-1.76.txt** was generated by a scratch script from the run log and the 153.5 owner file:

```
gui08-canvas-geometry	Phase 21
gui08-canvas-geometry-self-test	Phase 21
gui08-panorama-copy	Phase 21
gui08-panorama-copy-self-test	Phase 21
ng074-ci-green-on-main	NG-074 (Phase 25)
```

**Named rows, all PASS:** smoke-theia, diff-theia-core (`PASS -- zero changes inside @theia/*`), verify-branding, verify-uri-roundtrip, gui01-command-registered, gui02-web-tab-live, gui07-mode-switch-tabs-live and its self-test, ng067-frontend-errors-reach-telemetry, ng069-sidecar-egress, side02-token-negative, side02-token-positive, first-boot-surface-fresh and first-boot-surface-carried.

The seven port-3000 rows that were "unmeasured" in Phase 18 all pass now: diff-theia-core, gui01-command-registered, smoke-theia, verify-branding, verify-customize-inert, verify-dev-flag-off and verify-uri-roundtrip.

**Carry-forward 2 (gui07 with ai-first).** The row is green. The check derived `'ai-first' from theia/node_modules/@theia/ai-ide/lib/browser/ai-first-perspective-contribution.js` as an upstream perspective id, counted only for surplus. The registered perspectives were `default, ai-first, coding, browsing, organising`. The row printed `PASS -- 1 main-area and 2 bottom-area tab(s) survived every second-visit mode switch, attached`. The 19-05 prediction of a red did not hold, because 19-02 already derives upstream ids from node_modules. Its self-test passed too: each plant went red and the clean control stayed green.

**Carry-forward 1 (carried intermittency).** The row was red on the first run of the 19-06 live loop, the same signature as in 19-05. I did not keep re-running it until it went green. I investigated instead (deviation 1). After the fix, it passed in the live loop and in the full run. Before the fix, I ran the check 7 times in 19-06. It failed on 1 of them: the first run of the session, directly after the fresh row through `verify-platform.sh --only`. It passed on the other 6: 4 runs alone and 2 fresh-then-carried pairs. Three separate timeline replays, which are not the check, also showed the web tab present. Across 19-05 and 19-06 that makes 2 reds in 9 runs.

**Quick tier** (logs/quick-19-06.log, 68 s). There are 118 PASS and 4 FAIL, the gui08 rows. The R33 pipeline output `cmp`-equals docs/non-gui/quick-baseline.txt, so that file was left unchanged. decisions.md:39 now says the list was unchanged at the Phase 19 refresh, after the Theia 1.76.0 re-pin. After the docs edits I re-ran it on the staged tree (logs/quick-19-06-post-docs.log), and it again equals the baseline.

**Docs commit c9baab6:**
- **BUILD.md:**
  - The UPD-04 proof record is now the record at `theia_release = "1.76.0"`:
    - verify-upstream-pins `--self-test` PASS, with 4 planted faults red, and the row PASS across 8 member files;
    - the token-gate `tsc -b` exit 0 and the telemetry suite 9/9, both from 19-05;
    - diff-theia-core PASS at dfef881;
    - commit 3 is 2700e4c.
  - The "staged, not executed" paragraph is now "Live bump executed (Phase 19)", naming commit 1 4cf6806, commit 2 5800706 and commit 3 2700e4c.
  - I also corrected the runbook intro's "No re-pin has been performed under this procedure yet", which is no longer true.
  - The dated drill records are untouched.
- **README.md:87** names Theia 1.76.0.
- **REQUIREMENTS.md UPD-09:** the second sentence was replaced with the drop-and-add text, which quotes "Drop it, add a new row". The checkbox is unchanged and the indent is kept.
- **ROADMAP.md, Phase 19 "Needs Chris":** its first half now reads "dropping the 1.75.0 row NG-082 in his own terminal (CONTEXT 2026-10-17: "Drop it, add a new row"), then re-locking the check hashes once NG-086 is closed". The telemetry half is kept.
- **Comment-only fixes:** smoke-theia.sh:59, verify-platform.sh:2973 and firefox-bidi.mjs:5 now say Node 24 (`nodejs_24`).
- The Task 2 `<verify>` chain printed `VERIFY_T2_OK`, and `scan-brand-residue: PASS`.

**Notes the plan asks for:**
- **ng063-packaged-launch PASS is not 1.76 evidence.** It launches the Phase 18 package, which was built before the bump.
- **The packaged Node pin is still open.** powerbrowser/packaging/node-runtime.json still pins the packaged Node at v22.23.2. That is unchanged by design, and nothing is decided here. 19-07's checkpoint asks Chris to accept or defer it, with "defer to the release phase (999.2)" recommended, and 19-07's SUMMARY quotes his answer.
- **Clones that need a reinstall when they next pull:** ~/coding/Power-Browser-ng-* (none exist on disk at this time) and ~/gsd-workspaces/pba/Power-Browser (present).
- **No ledger change was made in this plan.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] first-boot-surface-carried raced the product's post-ready session restore**
- **Found during:** Task 1, step 2 (red on the first live run, the same signature as 19-05 run 1)
- **Issue:** The check read the main area as soon as `FrontendApplicationStateService` reached `ready`. Web tabs come back from `SetupsService.applyLastSession`, which by design runs after `ready` (setups-service.ts onStart: `reachedState('ready').then(() => this.applyLastSession())`).
- **Evidence:** A tight-poll timeline (logs/carried-timeline2-19-06.log) recorded the sequence in both runs:
  - `initialized_layout` showed `["view:welcome","view:disassembly-view-widget"]`;
  - `ready` showed the same set, which is exactly the failing observation;
  - about 40 ms later, `ready` showed `["view:welcome","http://127.0.0.1:42079/carried","view:disassembly-view-widget"]`.
- **Fix:** In carried mode, the probe now waits up to 20 s for the main-area addresses to equal the fixture's set, compared the way judge() compares them. Then it reads as before.
  - judge(), the comparison and the failure text are unchanged.
  - A restore that never completes still reads after the timeout, and judge() still reports the missing tab.
  - `--self-test` still passes: 13 plants red, clean control green.
  - The file is not sha-locked.
- **Files modified:** scripts/verify-first-boot-surface.mjs (8 lines added)
- **Commit:** dfef881

**2. [Rule 1 - Bug] The dropdown backstop measured before the top panel settled**
- **Found during:** Task 1, step 3. The 19-04 script read `delta_px=-2.5` with an inline top of 70 px.
- **Issue:** At 1.76.0 the top panel grows from 72 to 73 px, and the pill moves from 65.5 to 68.5 px, in the first ~0.5 s after the input is visible (logs/dropdown-diag-19-06.log). The script opened the dropdown inside that window. The dropdown derives its geometry at render time, so it kept the pre-settle position.
- **Fix:** I wrote a new scratch script, backstop-dropdown-19-06.mjs. It waits until the pill has held still for 1 s, then runs the 19-04 measurement unchanged. The tolerance was not widened. When the dropdown was opened after settle, a second keystroke and a 2 s wait both measured 73 px, which shows the anchoring is correct.
- **Pre-existing behaviour, logged in deferred-items.md:** the dropdown does not follow a pill that moves while it is open.
- **Files modified:** scratchpad only
- **Commit:** none

**3. [Rule 3 - Blocking] The dependent-theme backstop moves a terminal, not a web tab**
- **Found during:** Task 1, step 3
- **Issue:** The plan says to open a web tab and move it with "the command from dependent-windows.ts".
  - dependent-windows.ts registers no command.
  - Web tabs are deliberately not `ExtractableWidget` (web-tab.ts header).
  - `SetupsService.openDependent` throws `SETUP_DEPENDENT_UNSUPPORTED` for anything that is not extractable.
  - The UI-SPEC row (19-UI-SPEC.md:169, :228) is about a moved, extractable tab.
- **Fix:** The script moves the first-boot terminal `t1` through `powerbrowser.setups.open-dependent`. 14-PROBE run 3 had already found `t1` extractable. The comparison is the plan's: `getComputedStyle(document.body).backgroundColor` in both windows.
- **Files modified:** scratchpad only
- **Commit:** none

**4. [Rule 2 - Doc accuracy] BUILD.md runbook intro said "No re-pin has been performed under this procedure yet"**
- **Fix:** It now names Phase 19's re-pin. The sentence sits in the same section as the record the plan rewrites.
- **Commit:** c9baab6

### Not done as written

- **The frozen-proof scratch copy was not removed.** A PreToolUse hook blocks recursive deletes outside the project. The copy remains at /tmp/nix-shell.aDyem4/claude-1000/-home-chris-coding-Power-Browser/00a95695-3390-43d6-be13-e032e495c46a/scratchpad/frozen-19-06.vrkO, inside the session scratchpad. Earlier copies (`frozen`, `frozen-19-04.wgHF`) are also there.
- **The `.planning/codebase/STACK.md:24` "Node.js 22" line is not in this plan's file list.** It is logged in deferred-items.md, as the orchestrator directed.

## Known Stubs

None.

## Threat Flags

None. The mitigations ran as planned:
- **T-19-17:** side02-token-negative and side02-token-positive PASS.
- **T-19-18:** ng069-sidecar-egress PASS, theia-endpoints is green in `--quick`, and ng067 PASS.
- **T-19-19:** both files were derived by pipeline and compared with `cmp` and set equality.
- **T-19-20:** diff-theia-core PASS.
- **T-19-SC:** the only install was the frozen `--ignore-scripts` reinstall into a scratch copy.

## Self-Check: PASSED

- FOUND: .planning/phases/19-node-24-react-19-theia-1-76-0/19-FAILSET-1.76.txt (tracked)
- FOUND: dfef881 and c9baab6 are ancestors of HEAD
- FOUND (git-ignored): logs/frozen-19-06.log, live-19-06.log, backstop-dropdown-19-06.log, backstop-theme-19-06.log, full-19-06.log, quick-19-06.log, r28-reruns-19-06.log, carried-timeline-19-06.log, carried-timeline2-19-06.log, dropdown-diag-19-06.log, quick-19-06-post-docs.log
- `git rev-list --count ac3a941..c9baab6` = 2, which matches `commits: 2`. The SUMMARY commit follows.
