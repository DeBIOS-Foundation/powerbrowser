# Phase 24 UAT script

One ordered script for every pending row on the six UAT sheets (10, 13, 14, 14.1, 14.1.1, 15),
plus the four issue rows 14-VERIFICATION hands to this phase (14.1.1/1, 14.1.1/13, 14/1, 14/2).
Written by 24-03 Task 1, 2026-10-19. Only Chris records a result: the agent writes a result only
from his reply, kept word for word in `24-UAT-REPLIES.md`.

How to read the tables:

- **Item** is the number you reply with. The letter is the session; `A07` may be typed `7` or `07`
  on the `A:` line.
- **Rows** names every sheet test the observation settles, as `{sheet}/{test}`. One observation is
  recorded on every row it names. `-` means a ruling with no sheet row.
- **You should see** quotes the sheet's `expected:` line. Where 24-02 put an `expected_note` on a
  row, the note says which clause the shipped contract has replaced; D11 decides whether the notes
  become the expectation.

Sheets: `10` = `.planning/milestones/v1.2-phases/10-sign-off-closeout/10-UAT.md`; the others are
under `.planning/milestones/v1.3-phases/` (`13-chrome-bar-strip-relocation-spike`,
`14-modes-windows-setups`, `14.1-in-theia-web-tabs-gui-02`, `14.1.1-gui-conformance-sweep`,
`15-panorama-organising`).

Order: D (desk, no app), then A (Launch A, with T inside it if Route T is `t`, and O alongside),
then the corruption step, then B (Launch B), then C (Launch C, last), and X (outside any launch).

## Session D: desk, no app

The desk session runs first and alone: its two route choices decide what 24-04 prepares for
Launch A. `ok` on the `D:` line means every "ok means" cell below stands.

| Item | Rows | Ruling | ok means |
|---|---|---|---|
| D01 | 15/35 | Open `.planning/phases/22-panorama-worklist/logs/undo-window-22-07.png` and `card-close-22-07.png` in the same folder. Both are untracked and were taken at 48025d3, before the 22 review fixes. | You accept them as recorded: one centred "Undo Close Group" in the group's place, and the focused card's × top-right over the preview. To ask for fresh ones from Launch A instead, fail this item and say so. |
| D02 | 15/36 | A1: no Close Group dialog. | The recorded behaviour stands: × closes the group at once and Undo Close Group takes its place, with no dialog. |
| D03 | 15/37 | A2: 15 s, no discard ×. | The recorded behaviour stands: the undo window is 15000 ms and the Undo control has no discard ×. |
| D04 | 15/39 | A5: the current tab stays in the strip. | The recorded behaviour stands: the Browsing strip keeps the current tab even outside the active group (the alternative is that the active group follows the tab). |
| D05 | 15/40 | A7: "+" is the only joining path. | The recorded behaviour stands: "+" is the only path by which a new tab joins the active group. |
| D06 | 15/42 | A11: no active-group label in the strip. | The recorded behaviour stands: the strip shows no label for the active group. |
| D07 | 15/43 | The status-bar flash "Group "{name}" closed." is kept at the click. | The recorded behaviour stands: the flash shows at the click, not at the commit. |
| D08 | 15/45 | WR-02: a failed "+" join in Browsing shows nothing on screen (the tab stays open and loose; Organising shows the save-error bar and Retry). | Console-only reporting stands for a failed "+" join in Browsing. A Browsing notice is worded only by you: fail this item and write the notice in your own words. |
| D09 | 15/46 | The seven C1 copy answers (22-01-SUMMARY "Copy answers (C1)"), taken as the recommended set after "just contiune the planed work"; you worded none. 1 Undo control label: "Undo Close Group". 2 Undo control accessible name and tooltip: Undo Close Group "{name}". 3 Card close control tooltip and accessible name: "Close tab". 4 Empty-canvas body: "There are no tab groups yet — choose New Group, or drag across the canvas to draw one." 5 Resize grip's accessible value: "{w} by {h} pixels". 6 Card tooltip: the tab's title, a line break, then its address; just the title when there is no address. 7 Zoom readout: "{N}%". | The seven answers stand as recorded. To change one, fail this item, name the C1 item number and write the new wording in your own words. |
| D10 | 15/47 | CR-01 (optional): non-mode `view:` tabs (Explorer and the like) show `view:<factory-id>` in the address pill, as 14.1-UI-SPEC A6 contracts. Mode surfaces already show the placeholder (fix 6c9181b). | The pill keeps showing `view:<factory-id>` for non-mode `view:` tabs. |
| D11 | - | The 15 `expected_note` lines 24-02 added: 10/2, 10/3, 13/6, 14/2, 14.1/1, 14.1.1/33, 14.1/2, 14.1.1/34, 14.1/3, 14.1.1/35, 14.1/5, 14.1.1/37, 14.1/10, 14.1.1/42, 14.1.1/1. Each names a clause of its `expected:` line that the shipped contract has replaced (24-02-SUMMARY lists them). | Every note becomes the expectation for its row, so the live sessions judge against the shipped contract and not the retired clause. To reword one, fail this item and name the row. |
| D12 | - | The React 19 runtime wording on all six sheets (10/6, 13/15, 14/11, 14.1/11, 14.1.1/49, 15/1): "This sheet's tests ran on the build named in Current Test build: (Theia 1.76.0, React 19.2.8, Node 24, Gecko 153.5.0esr), and no surface this sheet covers failed to paint or showed a runtime error." Nothing in the app shows the React version, so "a runtime error" means visible breakage or an error in the frontend console. | The wording stands, the same on every sheet. To reword it, fail this item and write the new line; it replaces the `expected:` line on all six sheets. |
| D13 | - | The v1.5 milestone name, taken as "Coding Workbench Layout" by the orchestrator; you gave no name (ROADMAP Phase 23 Needs Chris line). | The name "Coding Workbench Layout" stays and is recorded as confirmed by you. To rename it, fail this item and write the name; it replaces the old one in ROADMAP, REQUIREMENTS and PROJECT in your exact spelling. |
| D14 | - | The 15 sheet's strip test (15/16) cites 14-UI-SPEC.md:22-26 for the strip home; 15-UI-SPEC.md:24-27 still says the strip stays top, which predates the Variant B amendment. | The 15 sheet cites 14-UI-SPEC for the strip home, and 15-UI-SPEC lines 24-27 stay unedited in this phase. |

## Session A: Launch A

Fresh profile, throwaway config dir, `-purgecaches`, graphical session. Use the launch command
24-04 writes under Prepared paths. Do the items in table order. A01 and A02 come before any click:
a carried profile restores web tabs (NG-032) and hides 14.1/7's startup half. Session O rows fall in
the same walk; their place is given in the O table.

| Item | Rows | Do this | You should see |
|---|---|---|---|
| A01 | 14.1/7 14.1.1/39 | Before any click, look at the strip. | Startup half: "a fresh launch starts with no web tabs unless a setup restores them (defect item 24)." |
| A02 | 10/3 | Before any click, look at the window icon, the taskbar or task switcher, and the launcher entry, and read the window title. | "The downstream mark renders at correct density in all three places and the title carries the suffixed display name (Power Browser Dev)". Per the 24-02 note (D11), the title reads PowerBrowser Dev. |
| A03 | 14.1/7 14.1.1/39 | Click "+" twice. Then open about 8 web tabs on real pages (this also gives history for A09), and keep Welcome open. | "Clicking "+" twice gives two "New Tab" tabs, each with its own empty state". |
| A04 | 15/2 | Switch to Organising, with no group made yet, Canvas view. | "Heading "No tab groups", body "There are no tab groups yet — choose New Group, or drag across the canvas to draw one.", and a New Group action. Loose cards are 160×115 on a line 16px from the bottom, never under the panel. No tray." |
| A05 | 15/3 | Flip to Tree, then back. | "Segments "Canvas" then "Tree", the active one in accent ink at weight 600. Tree body "There are no tab groups yet — choose New Group to start one." The zoom cluster is hidden in Tree, not disabled." |
| A06 | 15/9 | Canvas, still no group: look at the loose line with all your tabs. | "Past the line's room, up to 4 cards form a pile, offset 4px, with a count; hidden pile cards take no pointer. With zero groups the canvas grows and the host scrolls." |
| A07 | 15/12 | Look at the card faces, wait past the settle, hover a card. | "A card shows its PNG after the 700 ms settle, else a hatched panel with the title (3 lines), never a broken-image glyph. The URI shows only for a real address. The tooltip is the title, a line break, then the address." |
| A08 | 10/1 | Back to Browsing. Run "Open Browser Window" from the command palette; type a URL in its address bar; open a page alert; close that window. | "A stock Firefox-chrome browser window opens. The address bar takes keyboard focus and navigates a typed URL. An in-window modal (e.g. an alert from a page) appears rather than being suppressed. Closing the browser window returns you to the shell with the app still running." |
| A09 | 13/6 | Type part of a visited address or title in the pill; activate a row with Enter, then another with a click; commit an empty pill. | "Typing suggests up to 8 rows; activating one (Enter or click) navigates; committing empty is a no-op". Matching is by substring over address and title (24-02 note). The provider-failure clause is T01. |
| A10 | 14.1/6 14.1.1/38 | Make Welcome or an editor the current tab, type an address in the pill, press Enter. | "With an editor or view tab active, typing an address and pressing Enter opens a new web tab for it rather than navigating nothing." |
| A11 | 14.1/2 14.1.1/34 | Open one address in two web tabs; look at both; check Organising; close one. | "Opening the same address in two web tabs gives two overlays, both rendering ... closing one leaves the other intact." Per the 24-02 note: two Organising cards and one suggestion row. |
| A12 | 14.1/8 14.1.1/40 | Open the retitling fixture page from Prepared paths; start editing the pill before it retitles; then press Esc. | "While an address is being edited in the pill, a state push from the page (title or URL change) does not overwrite the edit; Esc restores the committed address." |
| A13 | 14.1/5 14.1.1/37 | Open the slow fixture page from Prepared paths and switch mode while it is still loading; come back. | In-flight half: "switching mode while a page is still loading finishes the load in place." The lost-view half is T04. |
| A14 | 14.1/9 14.1.1/41 | With a web tab current, open the command palette, a Theia dialog, and a menu, closing each. | "Opening the command palette, a Theia dialog, or a menu hides the page under it within a frame and restores it on close; the dropdown case is already confirmed." |
| A15 | 14.1/3 14.1.1/35 | With a web tab current beside a panel, drag the panel splitter back and forth. | "Dragging a panel splitter ... keeps the page attached to the tab body with no persisting misalignment and no white flash." Only the splitter half is observable (24-02 note). |
| A16 | 14.1/10 14.1.1/42 | Open web tabs until the strip overflows (15 or more), in Browsing; scroll the strip. | "Opening enough web tabs to overflow the strip gives stock strip scrolling; only the current tab's page paints, every other overlay is hidden." |
| A17 | 14.1.1/32 | Browsing, then Coding, then Browsing. | "Side panels switch instantly on a mode switch, with no animation (Chris, G-32, 2026-10-18); panels and the strip change at once; tabs never unmount, so there is no tab loading state on switch." |
| A18 | 14/3 14.1.1/11 | G-11. With two web tabs open, split the main area, then go Browsing, Coding, Organising, Browsing. | "The tab strip changes home per mode. Browsing: the strip sits at the very top, above the URL row; with a split main area each pane shows its own tab bar under the URL row and the strip still lists the leftmost pane's tabs. Coding: the dock's own tab bars in the editor area carry the tabs. Organising: the Panorama canvas, with no strip. No tab is lost or duplicated across Browsing → Coding → Browsing." (14/3 adds: "No tab is closed, moved to another window or detached across a switch.") |
| A19 | 14.1.1/1 14/2 | With web tabs, an editor and a view open, visit each mode twice. | "No main-area tab (web tab, editor, view) disappears on any switch, first visit or second". 14/2: "No content tab unmounts, closes, moves windows, or detaches across a switch". The chip clause is retired (24-02 note). |
| A20 | 14.1.1/13 14/1 | Enter Coding three times, once of them from Organising. | "Every switch into Coding — first, second, after Organising — shows the Explorer docked and expanded on the left." 14/1: "Coding shows the Explorer in a visible left panel and a visible bottom panel; Browsing and Organising hide all three side panels." |
| A21 | 14/5 14.1.1/16 | Arrange the panels, run "Save as Mode", name it, then switch away and choose its toggle row. | Save half: "Saving the current panel layout as a named custom mode adds a toggle row beside Coding / Browsing / Organising with the active one in accent ink + 600". Choosing it restores the layout. The fallback half is B01. Keep this custom mode active at the quit. |
| A22 | 14.1.1/23 | Run "Save as Mode" again; type more than 60 characters, then paste a long name; press Enter. | Mode field: "the Save as Mode and Save Setup fields never hold more than 60 characters: typed and pasted overflow is cut while typing, with no message, and Enter saves the 60-character name." The Save Setup field is A46. |
| A23 | 15/4 | Turn Theia auto-save off first (Preferences, Files: Auto Save, off). In Organising, choose New Group; try Enter, Esc, an empty commit, a long typed and a pasted name, a duplicate name. | "New Group makes a 400×300 box at (24, 24) titled "Untitled group", title in edit mode, selected. Placeholder "Group name". Enter commits, Esc cancels; an empty commit reverts; the title caps at 60 characters and a paste is cut; duplicate names are allowed." |
| A24 | 15/5 | Drag a band across empty canvas around some loose cards; try Esc mid-band; try a tiny band. | "A band of at least 30px on one axis creates "Untitled group" at that rectangle, floored at 200×144, title in edit mode. Enclosed loose cards show at 0.45 opacity and join on release. Esc cancels; a smaller band does nothing." |
| A25 | 15/6 | Drag cards into a group, onto empty canvas, onto a loose card, elsewhere; drag a group's last card out. | "A drag starts after 4px; the ghost is at 0.9 opacity with a shadow, the source at 0.7. A slot shows over a group, and a drop joins at that index. A drop on empty canvas or a loose card leaves the card loose at the drop point; a drop elsewhere does nothing. Dragging the last card out dissolves the group." (Informs B08.) |
| A26 | 15/7 | With three or more groups: drag a header, use each grip, focus the se grip and use arrows and Shift+arrows; drop one box onto another. | "A header drag moves the box; the n and w grips move its origin; the floor is 200×144. The se grip is `role=slider` named "Resize group"; arrows resize 8px (Shift 32px); `aria-valuetext` reads "{w} by {h} pixels". Other boxes move 12px clear and the placed box stays." |
| A27 | 15/8 | Shrink a group with six or more cards until it stacks; open Expand; close it with Done, then Esc, then the scrim. | "One tile size per box. Below 84×60 per card the group stacks up to 5 cards, offset 4px, with a count and the "Expand" pill; only the front card takes the pointer. The panel shows the group title as heading, "Done", and cards at 220px that wrap and scroll; Done, Esc or the scrim closes it. A group never scrolls. Known gaps, not failures: no `role="dialog"`, and no focus move to Done (15-UI-SPEC.md:427)." |
| A28 | 15/10 | Use −, +, the readout and "100%"; hover each. | "Controls −, "{N}%", +, "100%"; tooltips "Zoom in", "Zoom out", "Reset zoom". Steps 25, 50, 75, 100, 125, 150, 200 over 0.15s; only the layer scales. At 25% the Undo control is about 8px tall, as designed (22-UI-SPEC.md:382)." |
| A29 | 15/11 | After each change above, flip Canvas and Tree. | "Canvas and Tree show the same groups, order and membership after every mutation and every flip; a flip never reloads or loses the active group. Sections show title, count and ×; rows are 32px with title and mono URI; loose cards are not in the tree." |
| A30 | 15/13 | Tab into the canvas; use arrows and Enter in a group, the loose cards and an expanded list. | "One tab stop per scope (each group, the visible loose cards, the expanded list); arrows move, Enter opens. Focus rings are a 2px primary outline at a 2px offset." |
| A31 | 15/14 | Click a group header, then a group background; open a tab from another group. | "A header or background click marks the group active with a muted border and title weight 600, on canvas and in the tree. Opening a tab marks its group. The mark is never accent." |
| A32 | 15/15 | Single-click a card, then double-click it, then Enter on another; try a page card and a Welcome or editor card. | "Double-click or Enter opens the tab; a single click does not. A page opens in Browsing; an editor or Welcome opens in Coding. The tab activates, or reopens through the opener; nothing else is closed, moved or detached." |
| A33 | 15/16 | With an active group, look at the Browsing strip; repeat after a drag, a band, a close, an undo and "+"; clear the active group; look at Coding's dock bars. | "The Browsing strip shows the active group's tabs, the loose tabs and the current tab, in dock order; filtered tabs are hidden, not closed. It updates live after a drag, a band, a close, an undo and "+". With no active group it shows every tab. Coding dock bars are never filtered. An empty set shows only the current tab." |
| A34 | 15/17 | Click "+" with an active group, then with none. | "With an active group, a new tab from "+" is a member: its card is at the grid end and the strip shows it. With no active group the new tab is loose." |
| A35 | 15/18 15/27 | In Organising, close a group with its ×, on canvas and once in Tree. | "No dialog. The group's tabs leave every strip, bar and card set, and activity passes on. The status bar flashes "Group "{name}" closed." "Undo Close Group" appears centred in the group's bounds (canvas) or in the section's place (tree), focused, with the accessible name "Undo Close Group "{name}""." |
| A36 | 15/19 15/27 | Undo with a click, then Enter, then Space on other closes. | "Click, Enter or Space restores the title, bounds, membership, order and tabs; overlapping boxes move clear. The group is active again only if it was. Focus moves to the restored title." |
| A37 | 15/20 | Close a group and wait 15 s with focus on Undo. | "After 15000 ms the control fades over 0.15s; the tabs close as closed-tab history; the box is gone. Focus on the control moves to "New Group"." |
| A38 | 15/21 | Close two groups; switch mode and back, and flip view, inside the window. | "Each closed group has its own control, timer and name. Switching mode or view keeps the window open." |
| A39 | 15/22 | Auto-save off. Edit a file without saving, put its tab in a group, close the group; also let one commit. | "Theia's stock save prompt appears at the click or at the commit; unsaved changes are never discarded silently." |
| A40 | 15/23 15/27 | Hover or focus a card and use its ×; use Delete on another; try a dirty editor card and Cancel; empty a group; do it inside an expanded panel. | "A 24×24 × shows top-right on hover or focus over 0.15s and closes that tab; it never starts a drag. Delete does the same. A dirty editor prompts, and Cancel keeps both. The grid re-packs; an emptied group shows "Empty group — drag tabs here."; focus moves to the next card, the previous card, the title, or New Group. An expanded panel stays open until it is empty." |
| A41 | 15/24 | Close groups until one is visible; add a second; close one so it sits in its undo window. | "With one visible group there is no × on its box or section, and the title widens. A second group brings both × back. A group in its undo window does not count." |
| A42 | 15/25 | Three groups A, B, C with A active: close A, click C, then Undo A. | "Close the active group A (B becomes active), click C, then Undo A: A is restored and is not active; C stays active." |
| A43 | 15/26 | Close a group, then inside the 15 s run "Close Workspace" from the command palette. It is enabled only when a folder is open (open one first with Open Folder, before closing the group); it reloads the frontend (`@theia/workspace` workspace-service close) and closes the folder. Not yet tried as a trigger for this test. | "A frontend reload during an undo window ends it as an Undo; the group comes back with its tabs." (Informs B09.) |
| A44 | 14/7 14.1.1/17 | Switch to Coding with an editor or terminal tab; run "Open Tab in Own Window" on it; open a web tab's context menu; then close that tab from the core window. | "A dependent window shows exactly one tab view; the tab context menu offers no move for a web tab; a dependent whose tab closed elsewhere shows the contracted closed state and its close closes only that window". The closed state reads "This tab is closed" with "Close Window". |
| A45 | 14/8 14.1.1/18 | Run "Save Setup" with a typed name; move windows and switch mode; run "Restore Setup"; close a saved tab, Restore again; run "Delete Setup". Then save one setup again and keep it for B. | "A setup saved under a typed name restores windows, tab placement (web tabs come back as in-shell tabs), and mode; a restore with missing tabs completes with the "some tabs no longer exist" explanation; delete is the only destructive action and carries its confirmation." The notice reads "PowerBrowser restored this setup, but some tabs no longer exist. Geometry and mode are applied." Delete shows one "Delete Setup" confirmation in destructive ink. |
| A46 | 14.1.1/23 | In "Save Setup", type more than 60 characters, then paste a long name; press Enter. | Setup field: "the Save as Mode and Save Setup fields never hold more than 60 characters: typed and pasted overflow is cut while typing, with no message, and Enter saves the 60-character name." |
| A47 | 10/2 | Run the customize command from Prepared paths to write `customize.css`; look at the shell; delete the file; look again. | "editing customize.css restyles the shell without a rebuild. Deleting the file reverts the shell to stock styling." The dev-flag clause is retired (24-02 note). |
| A48 | 14/7 14.1.1/17 | Quit, last: keep a dependent window open and the custom mode from A21 active; close a group in Organising; within 15 s close the core window. If that does not fit in 15 s, quit twice (one extra relaunch) and say so. | "closing the core window ends the session" (14/7); "closing the core window closes dependents" (14.1.1/17), with no confirmation. The closed group is checked in B04. |

**Between A and B:** with the app closed, Chris runs the corruption command 24-04 writes under
Prepared paths. It corrupts the custom-mode file for B01; 24-04 confirms the file's path after
Launch A before Chris runs it.

## Session T: driver items

Inside Launch A, only when Route T is `t`. No on-screen action can trigger these. With `t`, each
trigger is a Browser Toolbox console snippet that 24-04 writes under Prepared paths; you run it
and watch. With `d`, every T item is recorded skipped with your reason. With `g`, the rows stay
pending until a headed driver lands as gap work.

| Item | Rows | Do this | You should see |
|---|---|---|---|
| T01 | 13/6 | Run the T01 snippet (the open-tab reader throws), then type in the pill. | Provider-failure clause: "provider failure degrades to a plain address commit with the contracted error row." Per the 24-02 note, the error row appears only when the open-tab reader throws. The rest of 13/6 is A09. |
| T02 | 14.1/1 14.1.1/33 | Run the T02 snippet: a webTab* request sent from a page inside a web tab. | "A page loaded inside a web tab cannot issue webTab* requests ... An attempt from inside an overlay is refused and logged, never acted on." The wall also requires embeddedByShell (24-02 note). |
| T03 | 14.1/4 14.1.1/36 | Run the T03 snippet: re-issue an open for an open tab, then a request for an unknown tab. | "Re-issuing an open for an already-open tab reports already-open without a second overlay; a request for an unknown tab reports unknown-tab and the widget shows the lost-view state." |
| T04 | 14.1/5 14.1.1/37 | Run the T04 snippet (drops a tab's overlay); choose Reload. | Lost-view half: "PowerBrowser can't show this page right now. Choose Reload to try again, or close this tab." and Reload recovers it (copy per the 24-02 note). The in-flight half is A13. |
| T05 | 15/31 | Run the T05 snippet (the tab-group read fails), then open Organising. | "PowerBrowser couldn’t load your tab groups. Your tabs are unchanged — choose Retry." The strip stays unfiltered. |
| T06 | 15/32 | Run the T06 snippet (the next closeGroup write fails), close a group, then choose Retry. | "After a failed closeGroup write the group comes back once, with "PowerBrowser couldn’t save your tab groups. The canvas shows your latest arrangement — choose Retry."; Retry closes the group." |
| T07 | 15/33 | Run the T07 snippet (the next "+" join fails), click "+" with an active group in Browsing, then open Organising. | "After a failed "+" join the tab stays open and loose. Organising shows the save-error bar and Retry; Browsing shows nothing (the copy decision is test 45)." |
| T08 | 15/34 | Run the T08 snippet (the join arrives before chrome's web-tab row), click "+" with an active group; then the second-failure variant. | "A "+" join that arrives before chrome's web-tab row retries once after 500 ms and lands; a second failure leaves the tab loose." |

## Session O: also in the walk

These rows already hold a result (`issue` or `skipped`). They cost nothing extra in the walk. An
O item is recorded only if you report on it; an `O:` line is optional.

| Item | Rows | Do this | You should see |
|---|---|---|---|
| O01 | 13/1 | During A18 (its skip reason, "No relocated strip exists", is false since Variant B shipped in 539ba36): look at the per-pane bars and Coding's dock bars with zero, one and many tabs. | "Zero, one, and many tabs keep strip geometry sane in the relocated region, matching top-region behaviour." |
| O02 | 13/2 | During A16 and A18: overflow a relocated bar. | "Many-tab overflow in the relocated region scrolls rather than clipping or wrapping." |
| O03 | 14.1.1/2 | During A18 to A20. | "Coding shows the Explorer in a visible left panel and a visible bottom panel; Browsing and Organising hide all three side panels; Organising shows the Panorama surface in the main area." |
| O04 | 14.1.1/3 | During A08 to A16: navigate, use Back and Forward. | "Every request from the Theia frame is acknowledged, every navigation pushes URL/title/loading/back-forward to the pill and nav buttons, and no group write waits out its 5 s timeout." |
| O05 | 14.1.1/14 | During A04 to A07, and again once groups exist. | "Opening Organising renders every open web tab as a card (ungrouped tray or its group), with drag, corner resize, auto-box on drop, zoom, and the tree flip over the same data — or the contracted empty state when there are none." |
| O06 | 14.1.1/15 | At A01 and A02 (cold start), then the first Coding and Organising clicks, then Ctrl+L. | "The chrome bar spans the full window width at 40 px on its own row under the menubar and above the strip, does not drift; a cold start opens in Browsing with the toggle showing Browsing; clicking Coding from launch enters Coding; Organising renders the Panorama surface; Ctrl+L focuses the pill." |
| O07 | 14.1.1/5 | At B, after the relaunch: look at the restored tabs, click "+" twice. | "A launch shows no web tabs unless a setup restores them (GUI-DEFECTS item 24); two "+" clicks give two distinct tabs each bound to its own overlay." |

## Session B: Launch B

Same profile, relaunched with the launch command from Prepared paths, after the corruption step.

| Item | Rows | Do this | You should see |
|---|---|---|---|
| B01 | 14/5 14.1.1/16 | Look at the shell as it opens. | Fallback half: "unreadable custom data falls back to Browsing with the contracted notice, never a blank shell." The notice reads "PowerBrowser couldn't load the "{name}" mode. Browsing is shown instead." |
| B02 | 14/7 14.1.1/17 | Look at the windows and tabs. | Restore half: "the next launch restores the setup." |
| B03 | 14/8 14.1.1/18 | Run "Restore Setup" on the setup kept in A45. | Restore half: "A setup saved under a typed name restores windows, tab placement (web tabs come back as in-shell tabs), and mode". |
| B04 | 15/28 | Open Organising and look for the group closed during the A48 quit. | "After the relaunch the group is gone for good: no empty box, no leftover loose cards." |
| B05 | 15/38 | Ratify A4, now that B04 is seen. | "A pass means the recorded behaviour stands: a group in its undo window at quit is closed for good (informed by test 28). Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`." |
| B06 | 15/29 | Look at the groups, then the Browsing strip from its first paint. | "Groups return with their bounds, titles, membership, order and active group; loose positions are kept. The Browsing strip is filtered from its first paint and never shows zero tabs." |
| B07 | 15/30 | Double-click a card whose tab is closed, then one whose tab is open. | "Double-click on a card for a closed tab reopens it on the card's own row; for an open tab it activates and opens nothing." |
| B08 | 15/41 | Ratify A10, informed by A25. | "A pass means the recorded behaviour stands: the last remaining group still dissolves when its last card is dragged out (informed by test 6). Overturned, it becomes a gap for `/gsd-plan-phase 22 --gaps`." |
| B09 | 15/44 | Rule on the three 22-07 open questions, informed by A43. | "A pass means all three stand as recorded: a split pane whose every tab is in a closing group keeps its own current tab; a reload during an undo window acts as Undo (observed in test 26); closeGroupRows is called unchanged. Any one Chris names as work becomes a gap." |
| B10 | 10/6 13/15 14/11 14.1/11 14.1.1/49 15/1 | Last: the React 19 runtime line, once, for all six sheets (the 10 sheet's line covers 10/1 to 10/3). | "This sheet's tests ran on the build named in Current Test build: (Theia 1.76.0, React 19.2.8, Node 24, Gecko 153.5.0esr), and no surface this sheet covers failed to paint or showed a runtime error." |

## Session C: Launch C, last

24-05 prepares the drill. It edits tracked files, so `--quick` is red until the revert; nothing is
committed while it is red.

| Item | Rows | Do this | You should see |
|---|---|---|---|
| C01 | 10/4 | Launch the drill build 24-05 prepares; look at the welcome tab, the about dialog, the favicon and the theme. | "Fixture values (name, welcome/about texts, theme, logo, telemetry level/endpoint, one urls value, one real extension entry) flow manifest -> generate -> surgical blocks -> regenerated prefs -> built sidecar; welcome tab, about dialog, favicon and theme show the fixture with zero modified theia/**/src/**/*.ts; revert restores --check green." |

## Session X: outside any launch

| Item | Rows | Do this | You should see |
|---|---|---|---|
| X01 | 10/5 | The person Route X names follows only `docs/REBRANDING.md` on a fresh clone at a path with no space. | "A stranger carrying only docs/REBRANDING.md completes a full rebrand — fresh clone, manifest edit plus logo drop-in, generate, tier-3 build, checklist — with every field documented and every load-bearing command pasteable from a code span." |

## Reply format

One line per session:

    A: ok
    A: 07 {note}; 12 {note}; rest ok
    A: 19 skip {reason}; rest ok

- An item number may be typed as `7` or `07`.
- Start a skip reason with "deferred follow-up:" to make the skip non-blocking for the GSD audit.
- A failed item becomes a gap for `/gsd-plan-phase 24 --gaps`; nothing is fixed in place.
- A copy change goes in the note in your own words, and the gap plan applies it exactly as
  written.
- A row owned by several items reads pass only if every owning item passed, issue if any failed,
  and skipped otherwise.
- Route choices are one line each: `Q1: ...` and `Q2: ...`.

## Routes

**Q1, driver items (Session T).** The options:

- `t`: the agent writes each T trigger as a Browser Toolbox console snippet and sets the two
  devtools prefs (`devtools.chrome.enabled`, `devtools.debugger.remote-enabled`) in the throwaway
  profile only. The built tree carries devtools: `objdir/dist/bin/browser/chrome/devtools` and
  `devtools-startup` are present (listed 2026-10-19). Reaching the Theia frame from the Toolbox is
  untested here.
- `d {reason}`: every T item is recorded skipped with your reason.
- `g`: the live launcher (`scripts/lib/firefox-bidi.mjs`) is headless only, so a run you can watch
  needs a headed launcher. That becomes gap work, and the T rows stay pending until it lands.

Route T: d (Chris, 2026-10-19) deferred follow-up: no on-screen trigger; needs fault-injection tooling (v1.5)

**Q2, the 10/5 carry-test (Session X).** The options:

- `run {who}`: a person other than its author follows only `docs/REBRANDING.md` on a fresh clone at
  a path with no space. The tier-3 build takes about 47-54 minutes.
- `defer {reason}`.
- `blocked {reason}`.

Route X: defer (Chris, 2026-10-19) deferred follow-up: no second person available this milestone

## Prepared paths

24-04 writes the launch, fixture-server, corruption and customize commands here (and the T
snippets if Route T is `t`), each starting with `cd /home/chris/coding/Power-Browser`.
