---
phase: 23-modes-leftovers-and-sketch-005-verdict
plan: 05
subsystem: planning records (v1.3 archive)
status: complete
tags: [verification, phase-14, MODE-04, closing-gate]
requires: [23-01, 23-02, 23-03, 23-04]
provides:
  - "14-VERIFICATION.md for the archived Phase 14: 17/25 (12 verified, 5 owner overrides), 8 human_needed, status human_needed, seam digest"
  - "Phase 23 closing gate: --quick 136 PASS / 0 FAIL with an empty baseline; plan-gate, phase-gate, check-ledger silent or passing; NG-074 and NG-084 still carried"
affects: [24]
tech-stack:
  added: []
  patterns: ["retroactive verification scored on today's registry rows plus phase live logs; overrides only on dated owner decisions"]
key-files:
  created:
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md
  modified: []
decisions:
  - "14-05 truth 4 (New Tab reuses one stock window) is overridden on Chris's GUI-DEFECTS item 1 statement and his 2026-09-07 confirmation of items 1 and 3; this override is in addition to the four candidates the research named"
  - "Eight truths with present code but no exercising row are scored human_needed, not VERIFIED, and handed to Phase 24"
requirements: [MODE-04, NG-074, NG-084]
metrics:
  completed: 2026-10-19
  duration: 25min
  tasks: 2
estimate:
  tokens: 35000
  tasks: 2
actuals:
  tokens: 6500
  tasks: 2
  commits: 1
plan_head_before: 47fe50a426b8f338bec542455c8268fc891cf179
plan_head_after: 8d285a7e263692960c7ed514323e49c7500f60d9
---

# Phase 23 Plan 05: Retroactive 14-VERIFICATION and the Phase 23 closing gate Summary

Phase 14 now has a verification report scoring all 25 plan truths under the four v1.3 criteria
(17/25: 12 verified on today's rows and Phase 23 live logs, 5 overridden on dated decisions by
Chris, 8 handed to Chris's Phase 24 pass). Phase 23 closes with `--quick` at 136 PASS / 0 FAIL
and every ledger gate silent.

## Task 1: 14-VERIFICATION.md (commit `8d285a7`)

Evidence: `logs/evidence-23-05.log` (untracked). The run covered `verify-mode-toggle-commands`,
`verify-mode-switch-tabs-invariant`, `verify-strip-spike-verdict`, `verify-setup-roundtrip`,
`verify-gui09-setups-copy`, `verify-dependent-window-content`, `verify-name-cap-at-input` and
`verify-panel-motion`, plus `verify-backend-env-readers`, `verify-group-channel` and
`verify-shell-error-copy`, each with and without `--self-test`, and then
`check-internals-boundary.sh --catalogue`. Every run exited 0. The live evidence comes from
existing Phase 23 logs: `switch-live-23-03.log`, `ng035-23-02.log`, `ng036-23-02.log` and
`name-cap-live-23-02.log`, all PASS with `PHASE23_EXIT=0`. No `motion-live` log exists, because
option a has no slide to measure.

**Score:** `score: 17/25 must-haves verified`. The denominator 25 is derived from the five plans
(4 + 5 + 5 + 5 + 6). Status `human_needed`, `behavior_unverified: 8`.

**Overrides (each with its owner record):**

| Truth | accepted_by | accepted_at |
|-------|-------------|-------------|
| 14-01: "...panels reshape with the strip staying top in every mode" | Chris, 14-UI-SPEC binding constraint AMENDED 2026-09-08; GUI-DEFECTS item 2 is his defect statement | 2026-09-08 |
| 14-01: "Every tab persists ... with the status-bar chip re-asserting the count" | Chris, 14-UI-SPEC.md:264 "The tab-count chip is removed (owner decision, 2026-09-08)" | 2026-09-08 |
| 14-02: "Organising shows the contracted placeholder slot ..." | Chris, v1.3 ROADMAP Phase 15 (GUI-08); recorded SUPERSEDED in 14-UI-SPEC by 14.1.1-10 | 2026-09-07 |
| 14-02: "Mode switches slide panels within budget ..." | Chris, G-32 answer "a" on ROADMAP.md:315, recorded by 23-04, applied by 23-03 (c86f432) | 2026-10-18 |
| 14-05: "New Tab, suggestion activation, and a typed address reuse one stock window ..." | Chris, GUI-DEFECTS item 1 (his statement) and items 1 and 3 CONFIRMED by him | 2026-09-07 |

**Plans without a SUMMARY:** 14-04 and 14-05 are recorded as "no SUMMARY; work landed in d5b8dc1
(2026-09-08) and the 14.1.1 plans".

**Gap map:** G-14-1 → G-14.1.1-1, G-14-2 → G-14.1.1-2, G-14-3 → G-14.1.1-13, G-14-5 → G-14.1.1-14,
G-14-4/-6/-7 → G-14.1.1-27 (records), G-14-8 → G-14.1.1-25 (fixed). The UAT's `closed_by` cites
`973608f`, which does not resolve in this repository; the commit that actually closed it here is
`6562412`. The report records both.

**Handed to Phase 24:** 14-UAT tests 3, 5, 7 and 8; G-14.1.1-1, G-14.1.1-11 and G-14.1.1-13.

**Seam raw output** (`node ~/.claude/gsd-core/bin/gsd-tools.cjs query verification.fingerprint .planning/milestones/v1.3-phases/14-modes-windows-setups <31 cited files>`):

```json
{
  "covered_files": [
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-01-PLAN.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-01-SUMMARY.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-02-PLAN.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-02-SUMMARY.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-03-PLAN.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-03-SUMMARY.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-04-PLAN.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-05-PLAN.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md",
    ".planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md",
    "powerbrowser/INTERNAL-APIS.md",
    "powerbrowser/shell/GroupActorChild.sys.mjs",
    "powerbrowser/shell/PowerBrowserAPI.sys.mjs",
    "scripts/check-internals-boundary.sh",
    "scripts/verify-backend-env-readers.mjs",
    "scripts/verify-dependent-window-content.mjs",
    "scripts/verify-group-channel.mjs",
    "scripts/verify-gui09-setups-copy.mjs",
    "scripts/verify-mode-switch-tabs-invariant.mjs",
    "scripts/verify-mode-switch-tabs-live.mjs",
    "scripts/verify-mode-toggle-commands.mjs",
    "scripts/verify-name-cap-at-input-live.mjs",
    "scripts/verify-name-cap-at-input.mjs",
    "scripts/verify-ng-035-custom-mode-layout.mjs",
    "scripts/verify-ng-036-setup-dock-layout.mjs",
    "scripts/verify-panel-motion.mjs",
    "scripts/verify-setup-roundtrip.mjs",
    "scripts/verify-shell-error-copy.mjs",
    "scripts/verify-strip-spike-verdict.mjs",
    "theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts",
    "theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx",
    "theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx",
    "theia/extensions/modes/src/browser/capped-name-input.ts",
    "theia/extensions/modes/src/browser/main-area-exemption.ts",
    "theia/extensions/modes/src/browser/mode-descriptors.ts",
    "theia/extensions/modes/src/browser/mode-service.ts",
    "theia/extensions/modes/src/browser/setups-service.ts",
    "theia/extensions/tab-uris/src/browser/browser-window-command.ts",
    "theia/extensions/tab-uris/src/node/tab-query-service.ts"
  ],
  "covered_digest": "v3:sha256:617b930e08ff4afc4e91cd8b43b25c8aed8955bb3f722c1698b499ac35e298eb"
}
```

Task 1's `<automated>` verify was run after the commit and exited 0. That run re-derives the
digest from the report's own `covered_files`, re-checks the 25-truth denominator, and confirms
that every gap id, every pending test and every named evidence row is present, and that
phase-gate prints nothing. `git show --stat --format= 8d285a7` lists only the report.

## Task 2: Phase 23 closing gate (no commit; `logs/quick-23-05.log` untracked)

- `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --quick` ran once, alone, in the background. Its log ends `verify-platform: PASS -- all checks passed`, `PHASE23_WALL_SECONDS=67`, `PHASE23_EXIT=0`. The summary block has **136 PASS, 0 FAIL**, and every named row is PASS: modes-name-cap-at-input (+self-test), modes-panel-motion (+self-test), gui07-mode-toggle-commands, gui07-mode-switch-tabs-invariant, gui09-setups-copy, gui09-setup-roundtrip, shell-error-copy-no-internals, allowlist-doc-consistency, scan-brand-residue and planning-paths.
- `docs/non-gui/quick-baseline.txt` exists and is empty.
- `python3 scripts/plan-gate.py --root . --phase 23 --plans .planning/phases/23-modes-leftovers-and-sketch-005-verdict`: `plan gate passed: 2/2 IDs cited (phase 23)`
- `python3 scripts/phase-gate.py --root .`: no output, exit 0
- `python3 scripts/check-ledger.py --root .`: no output, exit 0
- `python3 scripts/ledger-report.py --root .`:
  - `NG-074  deferred-approved  The CI verify workflow passes on main. Evidence: no passing run since 2026-09-04  owner=chris phase=15 age=20d`
  - `NG-084  deferred-approved  The five v1.2 human UAT sheets are signed. Evidence: 10-UAT.md:57, 73, 94.  owner=chris phase=15 age=20d`
- `node scripts/scan-brand-residue.mjs`: `scan-brand-residue: PASS -- no residual brand occurrence in 364 scanned file(s)`
- Task 2's `<automated>` verify exited 0. No tracked file under theia, scripts, milestones, ROADMAP, REQUIREMENTS, PROJECT, GUI-DEFECTS or sketches is left uncommitted.

### Phase 23 commits (`git log --format='%H %s' --grep='(23-0'`, plus the `docs(23)` commits)

```
8d285a7e263692960c7ed514323e49c7500f60d9 docs(23-05): write the retroactive 14-VERIFICATION for the archived Phase 14 (MODE-04)
47fe50a426b8f338bec542455c8268fc891cf179 docs(23-01): complete the Variant B records and G-23/G-32 closure plan (MODE-01, MODE-02, MODE-03)
41643cbbe7acdc38f89cdf10fd6bc8eb5d15b769 docs(23-01): close G-23 and G-32 on the 23-02 and 23-03 commits and recount the 14.1.1-UAT summary (MODE-02, MODE-03)
36eaa293d9259ca675e794def6883fc95a88f17c docs(23-01): bring the five Variant B records current and hand G-11 to Phase 24 (MODE-01)
87d57fed71cf37645bb1cf06fa839ef6c3150734 docs(23-03): complete the side-panel motion plan (G-32 option a, MODE-03)
c86f432b7d3063b22ddced37d69213d21117c538 docs(23-03): side panels switch instantly per Chris's G-32 choice; 14-UI-SPEC amended and modes-panel-motion added (MODE-03)
e56fc03b8196f864b90f77c281998344312dedeb docs(23-04): complete the sketch 005 verdict and G-32 decision plan
985afa9e42c7482228d7a0ecda729a7e82dcae8b docs(23-04): record the v1.5 milestone, Chris's G-32 answer and the mode-or-setup-name wording (SK-01, MODE-02, MODE-03)
47f4c61c604bd168a1e37f53e1b12a097ec38f42 docs(23-02): complete the name-cap-at-input plan (G-23, MODE-02)
58fa9cb5a53d0961901f6bce82a7d3cb77f3b39c test(23-02): ng-035 and ng-036 answer the capped name input instead of stubbing quickInput.input (G-23)
ea5301d6249d672db05d650e16bcc3f9f6a346a0 test(23-02): 14-UI-SPEC states the cut-while-typing name rule, and modes-name-cap-at-input derives it (G-23)
8b7f4847aa145a7d3c7abe71053e8f3be04722ad feat(23-02): cut Save as Mode and Save Setup names at 60 while typing, with a live row (G-23, MODE-02)
68bf812d426e1f217f57745bc74e99080659f963 docs(23-04): commit sketch 005 with its MANIFEST row and the adopt-into-v1.5 verdict (SK-01)
62d6846c4396ec60029db83c0662b89052557abb docs(23): plan 23-04 complete
2d839dfd119eb923bbfb778317148130a836826a docs(23): plan 23-02 complete
02ce825435af999be30619b8add92cf0142e0a01 docs(23): context with Chris's G-23 and sketch 005 decisions; G-32 open
```

### End-of-phase checks for Chris (end-of-phase, nothing blocking)

1. Save as Mode and Save Setup: type more than 60 characters, then press Enter. The field stops at 60, the caret sits at the end, and the 60-character name is saved (G-23; the caret behaviour is 23-UI-SPEC A1).
2. Side panels on a Browsing → Coding → Browsing round trip switch instantly, as you chose for G-32 (option a).
3. For the Phase 24 session: check the strip homes per mode (G-11; 14-UAT test 3; 14.1.1 tests 11, 23 and 32), then move GUI-DEFECTS item 2 to CONFIRMED and tick the GUI-07 and MODE-01 boxes. Also 14-UAT tests 5, 7 and 8, G-14.1.1-1 and G-14.1.1-13 from 14-VERIFICATION.
4. Optional: rename the v1.5 milestone ("Coding Workbench Layout") if that is not the name you want.

## Deviations from Plan

**1. [Rule 2 - Correctness] A fifth override beyond the research's four candidates**
- **Found during:** Task 1, step 3 (re-reading every plan truth)
- **Issue:** 14-05 truth 4 describes appending to a stock window. GUI-02 replaced that path with in-shell web tabs, and Chris confirmed the result.
- **Fix:** Recorded as an override on Chris's own record: GUI-DEFECTS item 1, which is his statement, and his confirmation of items 1 and 3 on 2026-09-07. Scoring the truth ✗ FAILED would have misreported a superseded contract.
- **Commit:** `8d285a7`

**2. [Rule 1 - Accuracy] The G-14-8 successor's commit hash does not resolve**
- **Found during:** Task 1, step 5
- **Issue:** `973608f`, cited by 14.1.1-UAT `closed_by` and by the plan, is not an object in this repository.
- **Fix:** The report cites `973608f` as recorded and names `6562412`, the commit here that closed G-14.1.1-25.

**3. Extra evidence rows:** `verify-backend-env-readers`, `verify-group-channel`, `verify-shell-error-copy` and `check-internals-boundary.sh --catalogue` were added to the evidence log, because the 14-05 and 14-02 truths could not be scored without them. They were read-only runs.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: .planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md (tracked, matches HEAD)
- FOUND: 8d285a7 is an ancestor of HEAD
- FOUND: .planning/phases/23-modes-leftovers-and-sketch-005-verdict/logs/evidence-23-05.log and quick-23-05.log (untracked by design)
