---
phase: 24-live-uat-pass
plan: 02
subsystem: uat-records
status: complete
tags: [uat, react-19, panorama, sheets]
requires: []
provides:
  - "15-UAT.md: the Phase 15 UAT sheet, 47 pending tests, React 19 first"
  - "A React 19 runtime test (pending) on sheets 10, 13, 14, 14.1 and 14.1.1"
  - "15 dated expected_note annotations on superseded expectations"
affects: [24-03, 24-04, 24-05, scripts/verify-ng-089-uat-sheets.mjs]
tech-stack:
  added: []
  patterns: ["expected_note line beside an unchanged expected line", "React 19 test appended last so no test number moves"]
key-files:
  created:
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md
  modified:
    - .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md
    - .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md
    - .planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
decisions:
  - "Inner quotes inside each expected_note are single quotes, so the note keeps one pair of double-quote delimiters; quoted copy characters are unchanged"
  - "14.1/10 and 14.1.1/42 expected lines name no chip; their notes say the chip clause comes from 14.1-VERIFICATION.md:71 (and 14.1.1/42's fixable line), not from the expected line"
  - "Fault tests 15/31-34 carry launch T; Chris picks the route (24-RESEARCH Q1) at the desk session"
metrics:
  duration: "about 10 min"
  completed: 2026-10-19
estimate:
  tokens: 60000
  tasks: 2
actuals:
  tokens: 6849
  tasks: 2
  commits: 3
plan_head_before: ee8af17357de66cb1ee07b06e4935b05b478496c
plan_head_after: 2ff2ea4150db4f4297ad40feddfe0120d8e44664
---

# Phase 24 Plan 02: UAT sheet preparation Summary

This plan wrote the Phase 15 UAT sheet: 47 tests, all pending, with React 19 runtime as test 1. It also added a pending React 19 runtime test as the last test of sheets 10, 13, 14, 14.1 and 14.1.1, put 15 dated `expected_note` lines on expectations the shipped contract has superseded, and recounted every Summary. No result was written, changed or removed.

`actuals.commits: 3` is `git rev-list --count` from `plan_head_before`. That range includes 9aa0bbb, which is a 24-01 commit from the same wave. This plan's own commits are 5c7d223 and 2ff2ea4. `actuals.tokens` is chars/4 over the new sheet plus the lines added to the five sheets.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Phase 15 sheet, 47 pending tests, React 19 first | 5c7d223 | 15-UAT.md |
| 2 | React 19 test on five sheets, stale notes, recounts | 2ff2ea4 | 10, 13, 14, 14.1, 14.1.1 UAT sheets |

Both tasks' `<automated>` verify blocks were run verbatim after their commit. Both passed (`TASK1-VERIFY-PASS`, `TASK2-VERIFY-PASS`). The brand-residue scan exited 0 with each change staged. No `verify-platform.sh` run and no build was done here, because 24-01 owns the wave's driver run.

**Tracer gate (Task 1):** auto mode, automated-only `<verify>`. The re-run passed, and the plan expanded to Task 2.

## 15-UAT tests and launch letters

D = desk session, A and B = the two launches, T = a fault test whose route Chris picks at D.

1. React 19 runtime — B (end)
2. Empty canvas with loose cards — A
3. Empty Tree, toggle, zoom hidden in Tree — A
4. New Group and rename rules — A
5. Draw a group with a band — A
6. Card drag — A
7. Move, eight grips, keyboard resize, push-away — A (three or more groups)
8. Grid, stack, Expand panel — A
9. Loose pile overflow — A
10. Zoom — A
11. Tree parity — A
12. Card faces — A
13. Keyboard roving focus and rings — A
14. Active-group marking — A
15. Open a tab from a card — A
16. Strip follows the active group — A (cites 14-UI-SPEC.md:22-26 for the strip home; 15-UI-SPEC.md:24-27 noted as superseded)
17. "+" joins the active group — A
18. Close Group closes at once and shows Undo — A
19. Undo restores — A
20. Timer commit — A
21. Several undo windows; mode or view switch — A
22. Dirty editor in a closing group — A (auto-save off)
23. Card × and Delete — A (auto-save off)
24. The last group stays — A
25. WR-03: Undo after another group became active — A (three groups)
26. Reload during an undo window acts as Undo — A
27. Live in your own window — A
28. Quit inside an undo window (A4) — A then B
29. Persistence and a filtered strip at launch — B
30. A card for a closed tab reopens through the opener — B
31. Load error — T
32. WR-01: failed closeGroup write — T
33. WR-02: failed "+" join — T
34. WR-05: join before chrome's web-tab row — T
35. Screenshots — D
36. Ratify A1: no Close Group dialog — D
37. Ratify A2: 15 s, no discard × — D
38. Ratify A4: a quit inside the window closes the group — D, after B
39. Ratify A5: the current tab stays in the strip — D
40. Ratify A7: "+" is the only joining path — D
41. Ratify A10: the last group dissolves on drag-out — D
42. Ratify A11: no active-group label in the strip — D
43. Ratify the "Group "{name}" closed." flash kept at the click — D
44. Rule on the three 22-07 open questions — D, after A
45. WR-02 copy decision — D
46. C1 copy answers, items 1–7 — D
47. Optional: CR-01, view:<factory-id> in the pill for non-mode view: tabs — D

## expected_note lines (each "Chris accepts or rewords this at the desk session.")

- **10/2:** "2026-10-19 24-02: the dev-flag clause ('With the dev flag on', step 1 'customize dev flag on') no longer matches the shipped contract: the customize.css layer needs no flag and is read whenever the file exists; `powerbrowserPrivilegedJs` gates only the customize.js layer (docs/CUSTOMIZE.md:3-5, :67-68)."
- **10/3:** "2026-10-19 24-02: the suffixed display name, written with a space between the two words, no longer matches the shipped contract: the tree's display name is `PowerBrowser` (configuration.toml:38) with name_suffix ' Dev' (configuration.toml:59), so the title reads PowerBrowser Dev (powerbrowser/branding/dev/configure.sh:9)."
- **13/6:** "2026-10-19 24-02: the matching and provider-failure clauses no longer match the shipped contract: matching is by substring over address and title, not by prefix (theia/extensions/tab-uris/src/node/tab-query-service.ts:222-238); the error row appears only when the open-tab reader throws, while a history or bookmark failure only logs and the open tabs still show (theia/extensions/chrome-bar/src/browser/chrome-bar-places-suggestions.ts:24-28)."
- **14/2:** "2026-10-19 24-02: the clause 'the status-bar chip re-asserts the count' no longer matches the shipped contract: the tab-count chip was removed (commit b85b846, per the amended 14-UI-SPEC); the tab-survival half stands."
- **14.1/1 and 14.1.1/33:** "2026-10-19 24-02: the honoured-sender clause ('only the primary Theia frame is honoured') no longer matches the shipped contract in full: the wall also requires embeddedByShell, the shell window's own content browser, because stock tabbrowser also sets primary (NG-038; powerbrowser/shell/PowerBrowserAPI.sys.mjs:325-336)."
- **14.1/2 and 14.1.1/34:** "2026-10-19 24-02: the 'one store row' clause no longer matches the shipped contract: two tabs on one URL are two store rows keyed `web:<id>` (NG-003; docs/URI-SCHEMES.md:253-257). What Chris can see is two Organising cards and one suggestion row."
- **14.1/3:** "2026-10-19 24-02: the '≤200ms mode-switch slide' clause no longer matches the shipped contract: panels switch instantly on a mode switch (G-32 a; 14.1.1-UAT test 32), so no slide exists to watch; only the splitter-drag half is observable." (14.1.1/35 has the same text, citing "test 32".)
- **14.1/5 and 14.1.1/37:** "2026-10-19 24-02: the lost-view copy as quoted no longer matches the shipped contract: the code and 14.1-UI-SPEC read 'PowerBrowser can't show this page right now. Choose Reload to try again, or close this tab.' (theia/extensions/tab-uris/src/browser/web-tab.ts:72; 14.1-UI-SPEC.md:242)."
- **14.1/10:** "2026-10-19 24-02: the tab-count chip clause this test carries from its source ('the status-bar chip equals the number of main-area tabs', 14.1-VERIFICATION.md:71, :316) no longer matches the shipped contract: the chip was removed (commit b85b846, per the amended 14-UI-SPEC). The expected line names no chip; only strip scrolling and the current-overlay paint are observable."
- **14.1.1/42:** "2026-10-19 24-02: the chip-count half named in this test's fixable line (and in its source, 14.1-VERIFICATION.md:71) no longer matches the shipped contract: the tab-count chip was removed (commit b85b846, per the amended 14-UI-SPEC). Only strip scrolling and the current-overlay paint are observable."
- **14.1.1/1:** "2026-10-19 24-02: the clause 'the chip count is unchanged after every hop' no longer matches the shipped contract: the tab-count chip was removed (commit b85b846, per the amended 14-UI-SPEC); the tab-survival half stands."

## Recounted Summary blocks

- **10:** total 6, passed 0, issues 0, pending 6, skipped 0, blocked 0, automated 0 (automated left as it was)
- **13:** total 15, passed 11, issues 0, pending 2, skipped 2, blocked 0
- **14:** total 11, passed 0, issues 5, pending 5, skipped 0, superseded 1, blocked 0
- **14.1:** total 11, passed 0, issues 0, pending 11, skipped 0, blocked 0
- **14.1.1:** total 49, passed 0, issues 32, pending 17, skipped 0, blocked 0. The prose now reads "needs-chris 9 (… 35, 49, …)" and ends with a dated sentence saying Phase 24 added test 49.
- **15:** total 47, passed 0, issues 0, pending 47, skipped 0, blocked 0

Each sheet's `updated:` timestamp was set, and its `status:` was left as it was.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 14.1/10 and 14.1.1/42 stale-note wording**
- **Found during:** Task 2
- **Issue:** The plan says the tab-count chip clause no longer applies, but neither test's `expected:` line names a chip. The chip appears in 14.1-VERIFICATION.md:71 and :316, and in 14.1.1/42's `fixable:` line. A note claiming an expected clause would have been wrong.
- **Fix:** Each note names the real location of the chip clause and states that the expected line names no chip.
- **Files modified:** 14.1-UAT.md, 14.1.1-UAT.md
- **Commit:** 2ff2ea4

**2. [Rule 2 - Clarity] 10/6 `scope:` line**
- **Found during:** Task 2
- **Issue:** 24-RESEARCH ("The React 19 runtime line") says the 10 sheet's React 19 line covers tests 1-3 only, because tests 4 and 5 run in later sessions. The test's fixed `expected:` wording does not say this.
- **Fix:** Added one `scope:` line to 10/6, plus a `reason:` line to 14/11 in that sheet's own style. `expected:` is unchanged.
- **Commit:** 2ff2ea4

## Threat Flags

None. This plan changed planning files only.

## Known Stubs

None. Every pending result is intentional: Chris records results in 24-03 to 24-05.

## Self-Check: PASSED

- FOUND: .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md (tracked)
- FOUND: 5c7d223, 2ff2ea4 (ancestors of HEAD)
- Task 1 and Task 2 `<automated>` verify: both pass at 2ff2ea4
