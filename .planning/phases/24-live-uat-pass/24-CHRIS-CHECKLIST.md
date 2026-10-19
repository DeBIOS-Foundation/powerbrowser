# Chris's remaining GUI checks (Phase 24, deferred to his own time)

Chris chose this on 2026-10-19: "OK finish up what is left I want to do the GUI checks when
everthing is done on my own time I just want a list".

Done already: A01-A20. A18 failed on its Organising half; see 24-GAPS.md item 1.
Full wording of every item is in 24-UAT-SCRIPT.md. Reply per item with `ok` or what you saw,
and the results get recorded on the sheets.

⚠ marks an item where a scripted run already found a defect (24-GAPS.md). Check whether you
see the same thing.

## Before you start

Use a fresh profile and config folder:

```sh
cd /home/chris/coding/Power-Browser
mkdir -p ~/pb-uat/profile ~/pb-uat/config
XDG_CONFIG_HOME=$HOME/pb-uat/config objdir/dist/bin/powerbrowser --profile $HOME/pb-uat/profile --no-remote -purgecaches
```

Open about 8 web tabs first; several items need them. Turn auto-save off before A23
(Preferences, Files: Auto Save, off).

## Session A (one launch)

- A21 ⚠ Save as Mode in Coding: a new mode button appears. Choose it later: does your
  layout come back, including Explorer? Keep this mode active until A48.
- A22: Save as Mode name: typing or pasting stops at 60 characters, with no message.
- A23: New Group: a 400×300 box titled "Untitled group". Try Enter, Esc, an empty name, a
  long name and a duplicate name.
- A24: Drag across empty canvas: a group is made around the cards. Esc cancels; a tiny drag
  does nothing.
- A25 ⚠ Drag cards into a group at a chosen spot: does the card land at the spot shown?
- A26: Move a group by its header; resize it with the grips and with arrow keys.
- A27 ⚠ Shrink a group of 6 or more cards until it stacks: at most 5 cards show. Use
  Expand, then Done, Esc and a click outside.
- A28: Zoom: −, +, the percentage, 100%, and their tooltips.
- A29: Canvas and Tree always show the same groups.
- A30: Tab and the arrow keys move around the canvas; Enter opens a card.
- A31 ⚠ Click a group's header: the group is marked active (bold title).
- A32: Double-click a card to open its tab; a single click does nothing.
- A33: With an active group, the Browsing strip shows only that group's tabs plus the loose
  tabs.
- A34: "+" with an active group: the new tab joins that group.
- A35: Close a group with its ×. An "Undo Close Group" button appears where it was.
- A36: Undo with a click, then with Enter, then with Space: the group comes back.
- A37: Wait 15 s after closing a group: the undo button fades and the group is gone.
- A38: Close two groups: each gets its own undo button.
- A39: A group holding an unsaved file: closing it asks you to save.
- A40 ⚠ A card's × closes its tab. Delete on a card does the same. Watch where focus goes
  after a group's last card.
- A41: With one group left, it has no ×.
- A42: Close active group A, click C, undo A: C stays active.
- A43: Close a group, then run Close Workspace inside 15 s: the group comes back.
- A44 ⚠ Coding, "Open Tab in Own Window", then close that tab from the main window: does the
  window show "This tab is closed", or does it just vanish?
- A45 ⚠ Save Setup, change things, Restore Setup, Delete Setup. Keep one setup. Does the
  window size come back? Are empty windows left behind?
- A46: Save Setup name: stops at 60 characters.
- A47: Do this in Coding. Make the status bar magenta:
  `printf '#theia-statusBar { background-color: #e5007d !important; }\n' > ~/pb-uat/config/powerbrowser/customize.css`.
  Then `rm ~/pb-uat/config/powerbrowser/customize.css` and it returns to normal.
- A48: Last: keep a dependent window open and your custom mode active, close a group, and
  within 15 s close the main window.

## Between A and B (app closed)

```sh
F=~/pb-uat/config/powerbrowser/modes.json; test -s "$F" && printf 'not json {\n' > "$F" && echo corrupted
```

## Session B (relaunch with the same command)

- B01 ⚠ The app opens in Browsing, not blank. Do you see "PowerBrowser couldn't load the
  "{name}" mode. Browsing is shown instead."? The scripted run says you won't.
- B02 ⚠ Your windows and tabs come back. Are the tabs in the same order?
- B03 ⚠ Restore Setup on the setup you kept in A45.
- B04: The group closed during A48 is gone for good.
- B05: Ruling: a group in its undo window at quit stays closed. Keep (`ok`) or overturn?
- B06: The other groups came back with their sizes, names and members, and the strip is
  filtered from the start.
- B07 ⚠ Double-click a card whose tab is closed: it reopens. Do this on an open one too.
- B08: Ruling: the last group still disappears when its last card is dragged out. Keep or
  overturn?
- B09: Ruling on the three 22-07 open questions. Keep all three, or name the ones to change.
- B10: React 19 line: no screen failed to draw or showed an error, across everything above.

## Session C (needs a build from Claude first)

- C01: The rebrand drill. Ask Claude to prepare the test-branded build (plan 24-05). Then
  check its welcome tab, About dialog, icon and theme.

## Not GUI (terminal)

- Approve the NG-089 deferral with the command Claude gives you.
- Push `main` (Phase 25).
