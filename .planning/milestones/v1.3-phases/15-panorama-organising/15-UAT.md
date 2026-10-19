---
status: testing
phase: 15-panorama-organising
source: [15-UI-SPEC.md, 22-UI-SPEC.md, 22-VERIFICATION.md, 22-07-SUMMARY.md, 22-01-SUMMARY.md, 22-REVIEW-FIX.md]
started: 2026-10-19T06:16:32Z
updated: 2026-10-19T22:49:07Z
---

## Current Test

number: 1
name: React 19 runtime
expected: |
  This sheet's tests ran on the build named in Current Test build: (Theia 1.76.0, React 19.2.8, Node 24, Gecko 153.5.0esr), and no surface this sheet covers failed to paint or showed a runtime error.
awaiting: the Phase 24 live session
build: |
  Sidecar rebuilt by 24-04 on 2026-10-19 (build log date 2026-10-19T17:26:17Z,
  .planning/phases/24-live-uat-pass/logs/build-24-04.log, untracked) from HEAD
  612e0bf327b11bb72c4aab93bce847f980a6d6b9. `git status --porcelain --untracked-files=no --
  theia powerbrowser` was empty at build time: a clean tree.
  Theia (@theia/core) 1.76.0 and React 19.2.8, read from theia/node_modules/*/package.json;
  Node v24.19.0 from `nix develop .#theia --command node -v`; Gecko 153.5.0 from
  objdir/dist/bin/platform.ini Milestone= (BuildID 20261018083353, built after the last
  powerbrowser/ and patches/ commit, 0b6ae33).
  gui02-web-tab-live passed on this build with PB_VERIFY_PORT=3939
  (logs/web-tab-live-24-04.log, untracked).

## Tests

This sheet was written in Phase 24 (plan 24-02) for the Panorama Organising surface of Phase 15
and every Phase 22 item handed to the Phase 24 live session. Every result is pending; only Chris
sets a result. Citations: `15-UI-SPEC.md` is in this directory; `22-*` files are in
`.planning/phases/22-panorama-worklist/`. `launch:` names the session in the Phase 24 run order:
D is the desk session, A and B the two app launches, T a fault test whose route Chris picks at
the desk session.

Pre-step, before test 2: create the fresh profile first. Open about 8 or more web tabs with "+"
before any group exists, and keep Welcome open. Open one file editor and one terminal later.
Turn Theia auto-save (`afterDelay`) off before tests 22 and 23, or no save prompt appears.

### 1. React 19 runtime
contract: 24-CONTEXT (every sheet gets a React 19 runtime line); ROADMAP Phase 24 criterion 3
expected: This sheet's tests ran on the build named in Current Test build: (Theia 1.76.0, React 19.2.8, Node 24, Gecko 153.5.0esr), and no surface this sheet covers failed to paint or showed a runtime error.
evidence: partial, static only: `ng086-theia-react-node`, `single-copy-deps`; unverified live
launch: B (end of the launch, after this sheet's live tests)
result: pending

### 2. Empty canvas with loose cards
contract: 15-UI-SPEC.md:258-259, 127-128, 342-351, 286
expected: Heading "No tab groups", body "There are no tab groups yet — choose New Group, or drag across the canvas to draw one.", and a New Group action. Loose cards are 160×115 on a line 16px from the bottom, never under the panel. No tray.
evidence: partial: `gui08-loose-cards-live`; unverified live
launch: A
result: pass
reported: "The checks all look fine did you run the already?"
note: "Chris gave this line after the A01-A08 list; the orchestrator told him it had not run those checks, and counts the line as A01 to A08 ok."
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 3. Empty Tree, toggle, zoom hidden in Tree
contract: 15-UI-SPEC.md:254, 260, 302-304
expected: Segments "Canvas" then "Tree", the active one in accent ink at weight 600. Tree body "There are no tab groups yet — choose New Group to start one." The zoom cluster is hidden in Tree, not disabled.
evidence: partial, static: `gui08-panorama-copy`; unverified live
launch: A
result: pass
reported: "The checks all look fine did you run the already?"
note: "Chris gave this line after the A01-A08 list; the orchestrator told him it had not run those checks, and counts the line as A01 to A08 ok."
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 4. New Group and rename rules
contract: 15-UI-SPEC.md:119, 253, 277, 332-333
expected: New Group makes a 400×300 box at (24, 24) titled "Untitled group", title in edit mode, selected. Placeholder "Group name". Enter commits, Esc cancels; an empty commit reverts; the title caps at 60 characters and a paste is cut; duplicate names are allowed.
evidence: unverified live
launch: A
result: pending

### 5. Draw a group with a band
contract: 15-UI-SPEC.md:120, 355-358, 482
expected: A band of at least 30px on one axis creates "Untitled group" at that rectangle, floored at 200×144, title in edit mode. Enclosed loose cards show at 0.45 opacity and join on release. Esc cancels; a smaller band does nothing.
evidence: unverified live
launch: A
result: pending

### 6. Card drag
contract: 15-UI-SPEC.md:359-368, 483; 22-UI-SPEC.md:67 (A10)
expected: A drag starts after 4px; the ghost is at 0.9 opacity with a shadow, the source at 0.7. A slot shows over a group, and a drop joins at that index. A drop on empty canvas or a loose card leaves the card loose at the drop point; a drop elsewhere does nothing. Dragging the last card out dissolves the group.
evidence: unverified live
launch: A
result: pending

### 7. Move, eight grips, keyboard resize, push-away
contract: 15-UI-SPEC.md:316-321, 349, 273
expected: A header drag moves the box; the n and w grips move its origin; the floor is 200×144. The se grip is `role=slider` named "Resize group"; arrows resize 8px (Shift 32px); `aria-valuetext` reads "{w} by {h} pixels". Other boxes move 12px clear and the placed box stays.
evidence: unverified live
launch: A (three or more groups)
result: pending

### 8. Grid, stack, Expand panel
contract: 15-UI-SPEC.md:322-329, 262-263, 427
expected: One tile size per box. Below 84×60 per card the group stacks up to 5 cards, offset 4px, with a count and the "Expand" pill; only the front card takes the pointer. The panel shows the group title as heading, "Done", and cards at 220px that wrap and scroll; Done, Esc or the scrim closes it. A group never scrolls. Known gaps, not failures: no `role="dialog"`, and no focus move to Done (15-UI-SPEC.md:427).
evidence: unverified live
launch: A
result: pending

### 9. Loose pile overflow
contract: 15-UI-SPEC.md:151, 342-348
expected: Past the line's room, up to 4 cards form a pile, offset 4px, with a count; hidden pile cards take no pointer. With zero groups the canvas grows and the host scrolls.
evidence: partial: `gui08-loose-cards-live`; unverified live
launch: A
result: pass
reported: "The checks all look fine did you run the already?"
note: "Chris gave this line after the A01-A08 list; the orchestrator told him it had not run those checks, and counts the line as A01 to A08 ok."
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 10. Zoom
contract: 15-UI-SPEC.md:116-117, 255, 275, 307-309; 22-UI-SPEC.md:382
expected: Controls −, "{N}%", +, "100%"; tooltips "Zoom in", "Zoom out", "Reset zoom". Steps 25, 50, 75, 100, 125, 150, 200 over 0.15s; only the layer scales. At 25% the Undo control is about 8px tall, as designed (22-UI-SPEC.md:382).
evidence: unverified live
launch: A
result: pending

### 11. Tree parity
contract: 15-UI-SPEC.md:305-312, 484
expected: Canvas and Tree show the same groups, order and membership after every mutation and every flip; a flip never reloads or loses the active group. Sections show title, count and ×; rows are 32px with title and mono URI; loose cards are not in the tree.
evidence: partial, static: `gui08-view-parity`; unverified live
launch: A
result: pending

### 12. Card faces
contract: 15-UI-SPEC.md:132, 274, 397-401
expected: A card shows its PNG after the 700 ms settle, else a hatched panel with the title (3 lines), never a broken-image glyph. The URI shows only for a real address. The tooltip is the title, a line break, then the address. Overlaps 14.1.1-UAT test 6.
evidence: partial: `gui02-web-tab-live` step 5b; unverified live
launch: A
result: pass
reported: "The checks all look fine did you run the already?"
note: "Chris gave this line after the A01-A08 list; the orchestrator told him it had not run those checks, and counts the line as A01 to A08 ok."
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 13. Keyboard roving focus and rings
contract: 15-UI-SPEC.md:215-223, 419-421, 487
expected: One tab stop per scope (each group, the visible loose cards, the expanded list); arrows move, Enter opens. Focus rings are a 2px primary outline at a 2px offset.
evidence: partial: pan05 (g), `gui08-loose-cards-live`; unverified live
launch: A
result: pending

### 14. Active-group marking
contract: 15-UI-SPEC.md:198-200, 330-331
expected: A header or background click marks the group active with a muted border and title weight 600, on canvas and in the tree. Opening a tab marks its group. The mark is never accent.
evidence: unverified live
launch: A
result: pending

### 15. Open a tab from a card
contract: 15-UI-SPEC.md:369-372
expected: Double-click or Enter opens the tab; a single click does not. A page opens in Browsing; an editor or Welcome opens in Coding. The tab activates, or reopens through the opener; nothing else is closed, moved or detached.
evidence: partial: ng-008; unverified live
launch: A
result: pending

### 16. Strip follows the active group
contract: 14-UI-SPEC.md:22-26 (strip home, Variant B amendment); 15-UI-SPEC.md:331, 488-489; 22-UI-SPEC.md:243-266. 15-UI-SPEC.md:24-27, which says the strip stays top, is superseded by the 14-UI-SPEC amendment and is not the contract for the strip home (24-RESEARCH Q8; the spec is not edited).
expected: The Browsing strip shows the active group's tabs, the loose tabs and the current tab, in dock order; filtered tabs are hidden, not closed. It updates live after a drag, a band, a close, an undo and "+". With no active group it shows every tab. Coding dock bars are never filtered. An empty set shows only the current tab.
evidence: partial: pan03 (b)(c)(e); unverified live
launch: A
result: pending

### 17. "+" joins the active group
contract: 22-UI-SPEC.md:268-276
expected: With an active group, a new tab from "+" is a member: its card is at the grid end and the strip shows it. With no active group the new tab is loose.
evidence: partial: pan03 (a)(d); unverified live
launch: A
result: pending

### 18. Close Group closes at once and shows Undo
contract: 15-UI-SPEC.md:269-271, 373-379
expected: No dialog. The group's tabs leave every strip, bar and card set, and activity passes on. The status bar flashes "Group "{name}" closed." "Undo Close Group" appears centred in the group's bounds (canvas) or in the section's place (tree), focused, with the accessible name "Undo Close Group "{name}"".
evidence: partial: pan04 (a)(e)(g); unverified live
launch: A
result: pending

### 19. Undo restores
contract: 15-UI-SPEC.md:380-383, 485
expected: Click, Enter or Space restores the title, bounds, membership, order and tabs; overlapping boxes move clear. The group is active again only if it was. Focus moves to the restored title.
evidence: partial: pan04 (c)(g); unverified live
launch: A
result: pending

### 20. Timer commit
contract: 15-UI-SPEC.md:133-134, 384-386, 486
expected: After 15000 ms the control fades over 0.15s; the tabs close as closed-tab history; the box is gone. Focus on the control moves to "New Group".
evidence: partial: pan04 (d)(g), ng-006; unverified live
launch: A
result: pending

### 21. Several undo windows; mode or view switch
contract: 15-UI-SPEC.md:387-389
expected: Each closed group has its own control, timer and name. Switching mode or view keeps the window open.
evidence: partial: pan04 (b)(g); unverified live
launch: A
result: pending

### 22. Dirty editor in a closing group
contract: 15-UI-SPEC.md:390-391
expected: Theia's stock save prompt appears at the click or at the commit; unsaved changes are never discarded silently.
evidence: unverified live
launch: A (auto-save off)
result: pending

### 23. Card × and Delete
contract: 15-UI-SPEC.md:268, 404-417, 491
expected: A 24×24 × shows top-right on hover or focus over 0.15s and closes that tab; it never starts a drag. Delete does the same. A dirty editor prompts, and Cancel keeps both. The grid re-packs; an emptied group shows "Empty group — drag tabs here."; focus moves to the next card, the previous card, the title, or New Group. An expanded panel stays open until it is empty.
evidence: partial: pan05 (a)-(g); unverified live
launch: A (auto-save off)
result: pending

### 24. The last group stays
contract: 15-UI-SPEC.md:334-339, 490
expected: With one visible group there is no × on its box or section, and the title widens. A second group brings both × back. A group in its undo window does not count.
evidence: partial: pan04 (h); unverified live
launch: A
result: pending

### 25. WR-03: Undo after another group became active
contract: 22-REVIEW-FIX.md:59-67 (WR-03)
expected: Close the active group A (B becomes active), click C, then Undo A: A is restored and is not active; C stays active.
evidence: unverified live (22-REVIEW-FIX WR-03: requires human verification)
launch: A (three groups)
result: pending

### 26. Reload during an undo window acts as Undo
contract: 22-07-SUMMARY.md:129 (open question 2)
expected: A frontend reload during an undo window ends it as an Undo; the group comes back with its tabs.
evidence: unverified live; the reload route is 24-RESEARCH Q9
launch: A
result: pending

### 27. Live in your own window
contract: 22-07-SUMMARY.md:133 (item 4)
expected: In Organising, close a group, press Undo, then close a card with its ×. The same observation as tests 18, 19 and 23; record the same result.
evidence: unverified live
launch: A
result: pending

### 28. Quit inside an undo window (A4)
contract: 15-UI-SPEC.md:389; 22-UI-SPEC.md:61 (A4)
expected: Close a group and quit before 15 s. After the relaunch the group is gone for good: no empty box, no leftover loose cards. Recorded after the Launch B relaunch.
evidence: partial: pan04 (f); unverified live
launch: A then B
result: pending

### 29. Persistence and a filtered strip at launch
contract: 22-UI-SPEC.md:260-262
expected: Groups return with their bounds, titles, membership, order and active group; loose positions are kept. The Browsing strip is filtered from its first paint and never shows zero tabs.
evidence: partial: pan03 (f), ng-007; unverified live
launch: B
result: pending

### 30. A card for a closed tab reopens through the opener
contract: 15-UI-SPEC.md:371
expected: Double-click on a card for a closed tab reopens it on the card's own row; for an open tab it activates and opens nothing.
evidence: partial: ng-008; unverified live
launch: B
result: pending

### 31. Load error
contract: 15-UI-SPEC.md:264 (E11)
expected: "PowerBrowser couldn’t load your tab groups. Your tabs are unchanged — choose Retry." The strip stays unfiltered.
evidence: unverified live; no live row plants this fault
launch: T
result: skipped
reason: "deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)"
reported: "Q1: d"
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 32. WR-01: failed closeGroup write
contract: 15-UI-SPEC.md:265, 392-393; 22-REVIEW-FIX.md:39-47 (WR-01)
expected: After a failed closeGroup write the group comes back once, with "PowerBrowser couldn’t save your tab groups. The canvas shows your latest arrangement — choose Retry."; Retry closes the group.
evidence: unverified live (22-REVIEW-FIX WR-01: requires human verification)
launch: T
result: skipped
reason: "deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)"
reported: "Q1: d"
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 33. WR-02: failed "+" join
contract: 22-REVIEW-FIX.md:49-57 (WR-02)
expected: After a failed "+" join the tab stays open and loose. Organising shows the save-error bar and Retry; Browsing shows nothing (the copy decision is test 45).
evidence: unverified live (22-REVIEW-FIX WR-02: requires human verification)
launch: T
result: skipped
reason: "deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)"
reported: "Q1: d"
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 34. WR-05: join before chrome's web-tab row
contract: 22-REVIEW-FIX.md:75-83 (WR-05)
expected: A "+" join that arrives before chrome's web-tab row retries once after 500 ms and lands; a second failure leaves the tab loose. The reversed order "was not reproduced" (22-REVIEW-FIX WR-05).
evidence: unverified live (22-REVIEW-FIX WR-05: requires human verification)
launch: T
result: skipped
reason: "deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)"
reported: "Q1: d"
recorded: "2026-10-19, 24-04, from Chris's reply in 24-UAT-REPLIES.md"

### 35. Screenshots
contract: 22-VERIFICATION.md:52-54 (human item 1); 22-07-SUMMARY.md:115
expected: `logs/undo-window-22-07.png` shows one centred "Undo Close Group"; `logs/card-close-22-07.png` shows the focused card's × top-right over the preview. Both are untracked and were taken at 48025d3, before the review fixes. A pass means Chris accepts them as recorded; he may instead ask for fresh ones from Launch A.
evidence: the two PNGs in `.planning/phases/22-panorama-worklist/logs/`
launch: D
result: pass
reported: "D: ok (Recommended)"

### 36. Ratify A1: no Close Group dialog
contract: 22-UI-SPEC.md:58 (A1); 22-07-SUMMARY.md:117
expected: A pass means the recorded behaviour stands: × closes the group at once and Undo Close Group takes its place, with no dialog. Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 37. Ratify A2: 15 s, no discard ×
contract: 22-UI-SPEC.md:59 (A2); 22-07-SUMMARY.md:118
expected: A pass means the recorded behaviour stands: the undo window is 15000 ms and the Undo control has no discard ×. Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 38. Ratify A4: a quit inside the window closes the group
contract: 22-UI-SPEC.md:61 (A4); 22-07-SUMMARY.md:119
expected: A pass means the recorded behaviour stands: a group in its undo window at quit is closed for good (informed by test 28). Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D, after B
result: pending

### 39. Ratify A5: the current tab stays in the strip
contract: 22-UI-SPEC.md:62 (A5); 22-07-SUMMARY.md:120
expected: A pass means the recorded behaviour stands: the Browsing strip keeps the current tab even outside the active group (the alternative is that the active group follows the tab). Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 40. Ratify A7: "+" is the only joining path
contract: 22-UI-SPEC.md:64 (A7); 22-07-SUMMARY.md:121
expected: A pass means the recorded behaviour stands: "+" is the only path by which a new tab joins the active group. Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 41. Ratify A10: the last group dissolves on drag-out
contract: 22-UI-SPEC.md:67 (A10); 22-07-SUMMARY.md:122
expected: A pass means the recorded behaviour stands: the last remaining group still dissolves when its last card is dragged out (informed by test 6). Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pending

### 42. Ratify A11: no active-group label in the strip
contract: 22-UI-SPEC.md:68 (A11); 22-07-SUMMARY.md:123
expected: A pass means the recorded behaviour stands: the strip shows no label for the active group. Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 43. Ratify the "Group "{name}" closed." flash kept at the click
contract: 15-UI-SPEC.md:271; 22-07-SUMMARY.md:124
expected: A pass means the recorded behaviour stands: the status-bar flash "Group "{name}" closed." shows at the click, not at the commit. Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 44. Rule on the three 22-07 open questions
contract: 22-07-SUMMARY.md:127-130 (item 3); 22-VERIFICATION.md:58-60 (human item 3)
expected: A pass means all three stand as recorded: a split pane whose every tab is in a closing group keeps its own current tab; a reload during an undo window acts as Undo (observed in test 26); closeGroupRows is called unchanged. Any one Chris names as work becomes a gap.
evidence: unverified live
launch: D, after A
result: pending

### 45. WR-02 copy decision
contract: 24-CONTEXT (the WR-02 copy gap); 22-REVIEW-FIX.md:57 (WR-02); 22-VERIFICATION.md:64-66 (human item 5)
expected: A pass means Chris's answer stands: either he words a Browsing notice for a failed "+" join, or he accepts console-only reporting. Any copy comes only from his own words.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 46. C1 copy answers, items 1–7
contract: 22-01-SUMMARY.md:116-132 (Copy answers (C1))
expected: A pass means the seven C1 answers stand as recorded, or as Chris revises them in his own words. They were taken as the recommended set after "just contiune the planed work"; he worded none.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

### 47. Optional: CR-01, view:<factory-id> in the pill for non-mode view: tabs
contract: 22-REVIEW-FIX.md:27-31 (CR-01)
expected: A pass means Chris's ruling stands on whether non-mode `view:` tabs (Explorer and the like) keep showing `view:<factory-id>` in the address pill, as 14.1-UI-SPEC A6 contracts.
evidence: unverified live
launch: D
result: pass
reported: "D: ok (Recommended)"

## Summary

total: 47
passed: 14
issues: 0
pending: 29
skipped: 4
blocked: 0

## Gaps

None yet. Only an issue Chris reports opens a gap, with id `G-15-{test}`.
