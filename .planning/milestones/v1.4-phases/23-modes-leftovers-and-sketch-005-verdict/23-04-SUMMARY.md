---
phase: 23-modes-leftovers-and-sketch-005-verdict
plan: 04
subsystem: planning
tags: [sketch-005, SK-01, G-32, MODE-02, MODE-03, v1.5]
status: complete

requires:
  - phase: 22-panorama-worklist
    provides: the post-Phase-22 ROADMAP, REQUIREMENTS and PROJECT text this plan edits
provides:
  - sketch 005 tracked with its README verdict and MANIFEST row (SK-01, ROADMAP Phase 23 criterion 5)
  - Chris's G-32 answer on the ROADMAP Phase 23 Needs Chris line in the machine-read form 23-03 parses
  - the v1.5 Coding Workbench Layout milestone named in ROADMAP, REQUIREMENTS and PROJECT
  - the mode-or-setup-name wording in ROADMAP criterion 2 and REQUIREMENTS MODE-02
affects: [23-03, 23-01, 24-live-uat-pass, v1.5]

actuals:
  tokens: 6500
  tasks: 3
  commits: 2
plan_head_before: 8aa648deb309262f7708b9032f8aeb43ca62387b
plan_head_after: 985afa9e42c7482228d7a0ecda729a7e82dcae8b

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/sketches/005-vscode-layout/index.html
    - .planning/sketches/005-vscode-layout/README.md
  modified:
    - .planning/sketches/MANIFEST.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/PROJECT.md

key-decisions:
  - "G-32 (MODE-03): Chris chose option a, instant panels with 14-UI-SPEC amended to match, no code (Chris, 2026-10-18)"
  - "v1.5 milestone name: Coding Workbench Layout, taken as proposed by the orchestrator; Chris gave no name. It is a planning label, not product copy"

requirements-completed: [SK-01]
requirements-advanced: [MODE-02, MODE-03]
requirements-carried: [NG-074, NG-084]

duration: two sessions across the blocking G-32 checkpoint (Task 1 committed 2026-10-17, Task 3 committed 2026-10-18)
completed: 2026-10-18
---

# Phase 23 Plan 04: Sketch 005 Verdict and G-32 Decision Summary

Sketch 005 is committed with its adopt-into-v1.5 verdict and a MANIFEST row. Chris chose instant panels for G-32 (option a). The v1.4 records now name the v1.5 Coding Workbench Layout milestone and use the mode-or-setup-name wording.

## Chris's answers (Task 2)

- **G-32**, verbatim: "a". Option a is "Instant, spec amended": panels appear and disappear in one frame, reduced motion is identical, no code changes, and 14-UI-SPEC is reworded to say instant. Chris gave it in chat to the orchestrator on 2026-10-18, after he was shown options a, b, c and defer with no recommendation.
- **v1.5 name**: Chris gave none. The orchestrator took the proposed default "Coding Workbench Layout" under Chris's standing autonomous-mode instruction. It is recorded as "name taken as proposed by the orchestrator; Chris gave no name". The name is a planning label, not product copy.

ROADMAP Phase 23 Needs Chris line as committed:

> **Needs Chris**: G-23 decided 2026-10-17 (cut at 60 while typing, MODE-02); SK-01 decided 2026-10-17 (adopt all into v1.5 Coding Workbench Layout; name taken as proposed by the orchestrator, Chris gave no name); G-32 chosen by Chris 2026-10-18: a (instant, spec amended; MODE-03); open: live confirmation of the strip relocation (G-11, MODE-01), handed to the Phase 24 session

23-03's parser (`s/.*G-32 chosen by Chris [0-9-]*: \([abc]\).*/\1/p`) reads K=a from this line. I checked that against the committed line.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Sketch 005 committed with its README verdict and MANIFEST row | 68bf812 | 005-vscode-layout/index.html (byte for byte as found), 005-vscode-layout/README.md, MANIFEST.md |
| 2 | G-32 decision checkpoint (blocking-human) | none (decision) | none |
| 3 | v1.4 records: v1.5 milestone, G-32 answer, mode-or-setup-name wording | 985afa9 | ROADMAP.md, REQUIREMENTS.md, PROJECT.md |

## Verification

- Task 1 `<automated>` passed. The four legend items marked as changes are derived from the HTML, and each appears in the README. The commit holds exactly the three files. The brand scan exits 0, although it excludes `.planning/`, so this proves only that the scan ran.
- Task 2 `<verify>` passed on the post-Phase-22 tree before Chris was asked. One `rebind(ApplicationShellOptions)` exists, at chrome-bar-frontend-module.ts:53. No authored `expandDuration:`. The stock default is `expandDuration: 0`. The stock open is gated on `enableAnimation`. 14-UI-SPEC still says "slide".
- Task 3 `<automated>` passed. `plan-gate --check-scope` printed "scope check skipped (no locked scope ...)", which the verify accepts. `plan-gate --phase 23` printed "plan gate passed: 2/2 IDs cited (phase 23)".
- No `scripts/verify-platform.sh`, build or live check was run. The plan forbids them.

## Commit count

`git rev-list --count 8aa648d..HEAD` is 54, because Phase 22 and plan 23-02 committed on main in between. This plan made 2 of those commits (`--grep='(23-04)'`): 68bf812 and 985afa9. The SUMMARY commit follows them.

## Deviations from Plan

- The Needs Chris line carries the G-32 answer as `G-32 chosen by Chris 2026-10-18: a`, followed by the parenthetical "(instant, spec amended; MODE-03)". The SK-01 entry also records that the orchestrator took the v1.5 name. Both additions are on the coordinator's instruction, and neither breaks the fixed form.
- `requirements-completed` lists SK-01 only. This plan advances MODE-02 (wording) and MODE-03 (decision recorded), but 23-02, 23-03 and 23-01 close them. NG-074 and NG-084 stay deferred-approved and carried. No checkbox or traceability row was touched, as the plan requires.
- STATE.md was not edited, on the orchestrator's instruction.

## Known Stubs

None.

## Notes

- The sketch HTML heading reads "Power Browser Workbench Layout", two words. The plan requires the file committed unchanged, and the brand scan does not cover `.planning/`. All text this plan added writes "PowerBrowser" as one word.

## Self-Check: PASSED

- FOUND: .planning/sketches/005-vscode-layout/index.html, .planning/sketches/005-vscode-layout/README.md (tracked)
- FOUND: 68bf812, 985afa9 (ancestors of HEAD)
