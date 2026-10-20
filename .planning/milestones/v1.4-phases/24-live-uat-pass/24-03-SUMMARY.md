---
phase: 24-live-uat-pass
plan: 03
subsystem: uat-records
status: complete
tags: [uat, desk-session, routes, panorama]
requires: [24-02]
provides:
  - "24-UAT-SCRIPT.md: the ordered Phase 24 script, 89 items over sessions D, A, T, O, B, C, X, with the item-to-row map"
  - "24-UAT-REPLIES.md: Chris's desk replies, verbatim, including the withdrawn first Q1 reason"
  - "Desk results on the 15 sheet (10 rows pass), D11 rulings on the 15 expected_note lines, Route T: d, Route X: defer"
affects: [24-04, 24-05, 24-06, scripts/verify-ng-089-uat-sheets.mjs]
tech-stack:
  added: []
  patterns: ["one observation, every row it settles, on one script item", "expected_note_ruling line under each expected_note"]
key-files:
  created:
    - .planning/phases/24-live-uat-pass/24-UAT-SCRIPT.md
    - .planning/phases/24-live-uat-pass/24-UAT-REPLIES.md
  modified:
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UAT.md
    - .planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md
    - .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-UAT.md
    - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md
    - .planning/milestones/v1.3-phases/14.1-in-theia-web-tabs-gui-02/14.1-UAT.md
    - .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md
    - .planning/ROADMAP.md
decisions:
  - "15/26 sits in Session A, not T: the composed @theia/workspace Close Workspace command reloads the frontend on screen (enabled only with a folder open; untried as the 15/26 trigger)"
  - "15/27 is listed on the items for 15/18, 15/19 and 15/23, since it is the same observation as all three"
  - "Desk reported line is Chris's whole D selection, \"D: ok (Recommended)\""
metrics:
  duration: "about 1 h wall, including the two checkpoint round trips"
  completed: 2026-10-19
estimate:
  tokens: 50000
  tasks: 3
actuals:
  tokens: 9600
  tasks: 3
  commits: 2
plan_head_before: 8db7363cdecb4fd8b48fd22312596b57e199dccf
plan_head_after: 4e84271add3cc7e2bb1259b3c72c04d4a44e8088
---

# Phase 24 Plan 03: Ordered UAT script and desk session Summary

This plan wrote one ordered UAT script that maps every pending row on the six sheets (plus the four handed-over issue rows) to a numbered item. It then put the desk session to Chris and recorded his answers. He passed all 14 desk rulings, chose Route T `d` and Route X `defer`, and confirmed the v1.5 name "Coding Workbench Layout". The first Q1 reason he was shown was factually wrong. It was withdrawn and both routes were asked again; the record carries the corrected reasons.

`actuals.tokens` is chars/4 over the lines this plan added (38,580 chars). `actuals.commits` is `git rev-list --count 8db7363..4e84271`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Ordered script, sessions D to X, reply format, routes | 8621cf3 | 24-UAT-SCRIPT.md |
| 2 | Desk session (checkpoint, blocking-human) | none | none |
| 3 | Record desk results, routes, D11 rulings, D13 name | 4e84271 | 24-UAT-REPLIES.md, 24-UAT-SCRIPT.md, six UAT sheets, ROADMAP.md |

Task 1 `<verify>`: "script ok: 89 items, 99 rows", passed after the commit. Tracer gate: the re-run passed, and the plan expanded. Task 2's pre-checkpoint `<verify>` passed: no desk row had a result, both routes were open, and NG-089's check was red (exit 1). Task 3's `<verify>` result is under Verification below.

## Items per session

- D (desk): 14
- A (Launch A): 48
- T (driver items): 8
- O (non-pending rows in the walk): 7
- B (Launch B): 10
- C (GEN-05 drill): 1
- X (carry-test): 1

T items, and why each needs a driver (no on-screen action triggers it):

- T01 13/6: the error row appears only when the open-tab reader throws.
- T02 14.1/1 = 14.1.1/33: a webTab* request has to come from inside an overlay.
- T03 14.1/4 = 14.1.1/36: the frontend never re-issues an open, and never sends a request for an unknown tab.
- T04 14.1/5 = 14.1.1/37, lost-view half: needs a dropped overlay.
- T05 15/31: needs a failed tab-group read.
- T06 15/32: needs a failed closeGroup write (WR-01).
- T07 15/33: needs a failed "+" join (WR-02).
- T08 15/34: needs a join that arrives before chrome's web-tab row (WR-05 race).

## Chris's replies (24-UAT-REPLIES.md, verbatim)

Desk session, first answer, given through the session's question prompt. The "(Recommended)" labels were the orchestrator's:

```text
D: ok (Recommended)
All 14 stand as recorded. Each one keeps what is built, tested and green.

d: skip, already proven (Recommended)
Recorded as skipped. Reason: the pan04/pan05 live checks plant each fault in code and saw it go red, and the static self-tests cover the rest.

defer: no second person (Recommended)
Recorded as deferred, with the reason 'no second person available this milestone'.

Run Launches A and B (Recommended)
```

**Q1 correction.** The first Q1 reason was factually wrong:
- pan04 and pan05 plant only probe controls (stubs that prove each probe can go red).
- They plant none of the T faults. 22-VERIFICATION.md:63 says "No live row plants these failures".

The executor reported this. The orchestrator told Chris, withdrew the recommended labels, and asked Q1 and Q2 again with no recommendation. Chris asked for the orchestrator's view and got it, framed as his call. His reply in chat, verbatim:

```text
Q1: d
Q2: defer
```

He accepted these reasons:
- Q1: "deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)"
- Q2: "deferred follow-up: no second person available this milestone"

The D line was unaffected and stands.

## What was recorded

- **15 sheet:** tests 35, 36, 37, 39, 40, 42, 43, 45, 46 and 47 now read `result: pass` with `reported: "D: ok (Recommended)"`. Summary: passed 10, pending 37.
- **D11:** an `expected_note_ruling: "2026-10-19, Chris: D: ok (Recommended)"` line now sits under all 15 `expected_note` lines: 10 (2), 13 (1), 14 (1), 14.1 (5), 14.1.1 (6).
- **D12, D14:** passed with `ok`. Nothing changed: the six React 19 lines stay identical, and 15-UI-SPEC is unedited.
- **D13:** ROADMAP.md:315 now reads "name confirmed by Chris 2026-10-19". REQUIREMENTS and PROJECT already carried "v1.5 Coding Workbench Layout". The orchestrator lifted its no-ROADMAP constraint for this one line.
- **Routes:**
  - `Route T: d (Chris, 2026-10-19) deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)`
  - `Route X: defer (Chris, 2026-10-19) deferred follow-up: no second person available this milestone`
  - 24-04 and 24-05 record the T and X rows from these lines.
- **Gaps opened:** none. Chris overturned no ruling.
- **Also kept for 24-04:** Chris chose "Run Launches A and B".

## Verification

- **Task 3 `<verify>`:** run verbatim after 4e84271, with this output:
  - "records ok: 14 items, sessions D"
  - `TASK3-VERIFY-PASS`
- **`--quick`:** `logs/quick-24-03.log` (untracked).
  - Result: 137 PASS, 0 FAIL, 56 s wall, `PHASE24_EXIT=0`.
  - `docs/non-gui/quick-baseline.txt` is still empty.
- **Scope check:** "scope check skipped (no locked scope ...)".
- **Brand-residue scan:** PASS with the files staged.
- **Record commit:** `git show --stat` for 4e84271 lists exactly the nine files this task changed.
- **NG-089:** its check still exits 1. Launches A and B, the T and X rows, and C are still to come in 24-04 and 24-05.

## Deviations from Plan

**1. [Rule 1 - Bug] The first Q1 reason was withdrawn and asked again**
- **Found during:** Task 3
- **Issue:** The Q1 option shown to Chris carried a false evidence claim and "(Recommended)" labels. The plan forbids marking a route option as recommended (T-24-09).
- **Fix:** The executor stopped and reported it. The orchestrator re-asked both routes with no recommendation. The replies file keeps the first section, with a dated withdrawal note, and adds a new section with the corrected reply.
- **Commit:** 4e84271

**2. Staging denied once**
- The first record attempt was one compound Bash call, and the permission classifier denied it ("Modify Shared Resources"). Nothing ran. On the orchestrator's instruction, each step then ran as its own command, and all of them passed.

**3. ROADMAP edit**
- The orchestrator's standing constraint said not to edit ROADMAP.md. Plan Task 3 (D13) requires one line there. The orchestrator lifted the constraint for that line only. STATE.md was not touched, and no state or roadmap tooling was run.

## Known Stubs

None.

## Threat Flags

None. Only planning files changed.

## Self-Check: PASSED

- FOUND: 24-UAT-SCRIPT.md, 24-UAT-REPLIES.md (tracked)
- FOUND: 8621cf3, 4e84271 (ancestors of HEAD)
