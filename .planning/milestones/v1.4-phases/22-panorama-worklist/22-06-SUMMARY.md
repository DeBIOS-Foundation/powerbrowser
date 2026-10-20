---
phase: 22-panorama-worklist
plan: 06
subsystem: ui
tags: [theia, panorama, card-close, group-model, live-check]
status: complete
completed: 2026-10-18

requires:
  - phase: 22-panorama-worklist
    provides: 22-05 last-group guard, 22-04 undo window, 22-01 C1 copy answers (item 3 "Close tab")
provides:
  - GroupModel.closeCard (open tab through ApplicationShell.closeWidget; not-open card through the closeTab mutation)
  - the card x (.pb-org-card-close) and the Delete key on a focused card
  - OrganisingWidget.render keeps a focused card focused across a rebuild
  - 15-UI-SPEC card-close rows (geometry, copy, Cards, Color, Focus, Motion, E13)
  - full-tier live row pan05-card-close-live with two in-run probe controls
affects: [22-07, panorama]

plan_head_before: cc1984d454a251635bd98329059fe61a0fd70cc6
plan_head_after: c23a79ba039a043ae7463e27cca6998bbb367891

actuals:
  tokens: 12016    # chars/4 over the diff cc1984d..c23a79b (48065 chars)
  tasks: 2
  commits: 7       # git rev-list --count cc1984d..c23a79b

key-files:
  created:
    - scripts/verify-pan05-card-close-live.mjs
  modified:
    - theia/extensions/modes/src/browser/group-model.ts
    - theia/extensions/modes/src/browser/organising-widget.ts
    - theia/extensions/modes/src/browser/modes.css
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
    - scripts/verify-platform.sh

key-decisions:
  - "closeCard decides open versus not open by whether a main-panel widget carries the card's key; a card with no widget closes through closeTab only when its open flag is false"
  - "render() restores focus to the card that had it, so the reload after a tab's removal does not drop keyboard focus to the document body"
  - "pan05 reads the card x's focus rule from the loaded CSSOM: the harness window never has system focus, so :focus cannot match there; the hover half is driven with trusted BiDi input"
---

# Phase 22 Plan 06: Close a tab from its Panorama card Summary

**Each card that takes the pointer has a 24 × 24 round × at its top right, labelled "Close tab", and Delete on a focused card does the same. An open tab closes through Theia's own close, so a dirty editor shows the stock save prompt and Cancel keeps it. A card whose tab is not open marks its row closed. A group emptied this way stays. pan05 shows all of this live, with both probe controls turning red.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | a8118f6 | feat(22-06): close a tab from its Panorama card with × or Delete (PAN-05) |
| 1 | d2f5525 | test(22-06): add the live card-close row with in-run probe controls (PAN-05) |
| 1 | 13ba87b | fix(22-06): a focused card keeps focus across a re-render, so a keyboard close leaves focus on the next card (PAN-05) |
| 1 | 49b8a85 | fix(22-06): pan05 reads the editor's text model through its document and names a missing one (PAN-05) |
| 1 | db15312 | fix(22-06): pan05 gives the card keyboard focus before it reads the x's opacity (PAN-05) |
| 1 | f7199cc | fix(22-06): pan05 shows the card x under a trusted hover and reads the focus rule from the CSSOM (PAN-05) |
| 1 | c23a79b | fix(22-06): pan05 prints its (g) detail line again (PAN-05) |
| 2 | none | checks only; the logs are git-ignored |

`git show --stat --format= a8118f6` lists exactly the four code and spec files: 15-UI-SPEC.md, group-model.ts, modes.css and organising-widget.ts. d2f5525 lists exactly the script and the registry. The spec and modes.css were last changed in the same commit, a8118f6.

## What changed

- **group-model.ts:** `closeCard(client, tab)`.
  - Open tab: `await this.shell.closeWidget(widget.id)`. If the widget is still alive afterwards (the prompt was cancelled), it returns false and changes nothing. Otherwise it removes the card locally.
  - Not-open card: `persist('closeTab:' + uri, …)`, with a revert that re-inserts the card at its old index.
  - No `setTabGroup` write and no `dissolveGroup` call.
- **organising-widget.ts:**
  - `buildCard` appends a `button.pb-org-card-close` with `tabIndex = -1`, the text "×", and "Close tab" as both `title` and `aria-label`. pointerdown, click and dblclick stop propagation.
  - The card's keydown handles Delete.
  - `closeCardFrom` notes the next or previous card in the scope before the close. After a keyboard close it focuses that card, or else the box title (group) or New Group (loose). It closes the expanded-stack panel when its last card goes.
  - `cardScope` and `focusCard` are new helpers. `render()` now restores focus to a focused card after the rebuild.
- **modes.css:**
  - `.pb-org-card-close`: absolute, 4px from the top and right, 24 × 24, radius 9999px, the frozen `rgba(0, 0, 0, 0.72)` fill, `--color-text`, 13px/400, opacity 0 with a 0.15s fade.
  - It is shown on `.pb-org-card:hover` and `:focus-visible`, and hidden on stacked or piled back cards.
  - `.pb-org-card` gains `position: relative`, and the reduced-motion list gains `.pb-org-card-close`. No new hex value, no `!important`.
- **15-UI-SPEC:**
  - Canvas Geometry: the two `.pb-org-card-close` 24 px rows and a description row for the position.
  - Frozen translucencies: the card × background.
  - Focus: the × is not focusable, and a focused card shows it.
  - Motion: the fade, and `.pb-org-card-close` in the reduced-motion list.
  - Copywriting: the "Card close control" row, **"Close tab"** (C1 item 3).
  - Cards: the ×, Delete, the close path, the emptied-group rule and the focus rule.
  - UI Considerations: E13 and the five rows. The recount is 40 covered and 10 backstop.
  - Provenance Deferred: "per-card close (Phase 22)" is deleted. It was the only Phase 22 item left in that clause.
- **verify-platform.sh:** `pan05-card-close-live` is registered directly after `pan04-undo-close-group-live`, in the full tier.

The painted label is "Close tab", character for character Chris's 22-01 answer 3.

## Evidence

**Static checks at a8118f6, and again after 13ba87b:**
- canvas-geometry: PASS, "20 const rows and 10 CSS rows equal 15-UI-SPEC Canvas Geometry".
- panorama-copy: PASS, "31 painted strings equal the 31 literals".
- view-parity: PASS.
- close-exactness: PASS.
- Each of the four self-tests is also green, and so is the mode-switch invariant.
- `scan-brand-residue`: PASS over 360 files, with the new script staged first.

**Live runs** (logs under `.planning/phases/22-panorama-worklist/logs/`, untracked, `PB_VERIFY_PORT=3939`):

| Log | Run at | Exit | Wall time |
|-----|--------|------|-----------|
| build-22-06 | 49b8a85 (after the last theia commit 13ba87b) | 0 | 11 s |
| pan05-22-06 | c23a79b | 0 (`  pan05-card-close-live: PASS`) | 22 s |
| ng008-22-06 | c23a79b | 0 (`  ng-008-panorama-card-reopens-through-opener: PASS`) | 25 s |
| loose-22-06 | c23a79b | 0 (`  gui08-loose-cards-live: PASS`) | 11 s |
| quick-22-06 | c23a79b | 0, 132 PASS, 0 FAIL, `verify-platform: PASS -- all checks passed` | 54 s |
| pan04-22-06 (extra, render() changed) | c23a79b | 0 (`  pan04-undo-close-group-live: PASS`, 5 probe controls red) | 81 s |

Earlier attempts are kept as `build-22-06-t1` and `pan05-22-06-t1` to `-t4`; see Deviations. `docs/non-gui/quick-baseline.txt` is still 0 bytes. `python3 scripts/phase-gate.py --root .` printed nothing after each commit.

pan05 detail lines, verbatim from `pan05-22-06.log`:
- `pan05-card-close-live: (a) x on /a: widget disposed, no dialog, page gone, row [{"uri":"web:wt-hci5ab-1","url":"http://127.0.0.1:32867/a","group_id":"group-mvdz6ph2-d8qn","closed_at":1792337022411}]; G is [web:wt-hci5ab-2, terminal:pan05-t, file:///tmp/nix-shell.aDyem4/pan05-LbqsEw/pan05.txt] with every widget alive; after a reload no card`
- `pan05-card-close-live: (b) x on /c: a press and 10 px move made no ghost and no drag, /c stays at index 0; a double click left the current widget and the organising mode unchanged`
- `pan05-card-close-live: (c) Delete on the focused terminal card: disposed, focus on file:///tmp/nix-shell.aDyem4/pan05-LbqsEw/pan05.txt (next in [web:wt-hci5ab-2, terminal:pan05-t, file:///tmp/nix-shell.aDyem4/pan05-LbqsEw/pan05.txt])`
- `pan05-card-close-live: (d) dirty editor (auto-save was afterDelay, set off): x opened "Do you want to save the changes you made to pan05.txt?"; Cancel kept the card, the editor and its unsaved text, the file unchanged`
- `pan05-card-close-live: (e) not-open card (open false): x marked its row closed [{"uri":"terminal:pan05-gone","url":"","group_id":"group-mvdz6phc-iquj","closed_at":1792337025379}]; after a reload no card and no widget`
- `pan05-card-close-live: (f) G2 emptied by the x: still listed, 0 cards, shows the empty-group hint; the closes wrote no setTabGroup/setGroupOrder/dissolveGroup/closeGroup mutation`
- `pan05-card-close-live: (g) tab stops group 1, loose 1; 3 card x, 0 tabbable; /c's x at opacity 0 idle and 1 under a trusted hover; the loaded stylesheet shows it on focus-visible (true) and hover (true); document.hasFocus() is false, so focus is read from the CSSOM`
- `pan05-card-close-live: probe controls: 2 planted page faults each turned their probe red`
- `verify-pan05-card-close-live: PASS`

Both probe controls turned red:
- Every × set to `tabIndex = 0`: (g) went red.
- The closeTab write swallowed for `terminal:pan05-gone2`: after a reload the card was back.

**Task 2:** `gui08-loose-cards-live` keyboard line: `gui08-loose-cards-live: keyboard: ArrowRight moved focus view:welcome -> terminal:gui08-loose-a across 4 visible loose cards, 1 tab stop`.

**Screenshot** `logs/card-close-22-06.png` (untracked): the Organising canvas at 100%.
- Two "Untitled group" boxes. The left one holds the "page c" card, whose top-right corner shows the round dark × over the green preview, because the pointer is over the card.
- The right group shows "Empty group — drag tabs here."
- The loose line at the bottom holds the "Welcome" and "page l" cards, with no × visible.
- Neither group header × is affected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Keyboard focus was lost after a keyboard close**
- **Found during:** Task 1, first pan05 run (`pan05-22-06-t1.log`, step c)
- **Issue:** After Delete, `closeCardFrom` focused the next card. Removing the widget then scheduled a model reload, and that reload rebuilt every card, which moved focus to the document body.
- **Fix:** `render()` now records a focused card's key and refocuses the rebuilt card, as it already did for the Undo control. `focusCard` makes that card the scope's one tab stop.
- **Files modified:** organising-widget.ts
- **Commit:** 13ba87b. pan04, loose-cards and ng-008 were re-run green after it.

**2. [Rule 3 - Blocking] canvas-geometry reads the scope selectors from moveCardFocus's body**
- **Found during:** Task 1, static checks
- **Issue:** I first moved the scope rule into a `cardScope` helper. canvas-geometry then failed, because it requires the three scope selectors in `moveCardFocus` itself.
- **Fix:** `moveCardFocus` keeps its own body unchanged, and `cardScope` repeats the same rule. A comment on `cardScope` names the reason.
- **Commit:** a8118f6 (before the commit)

**3. [Rule 1 - Bug in the new check] pan05 step (d) read the editor through `getControl()`**
- **Issue:** That call threw in the page (`pan05-22-06-t1.log`).
- **Fix:** It now reads `editor.document.textEditorModel`, and a missing model is named as a setup failure.
- **Commit:** 49b8a85

**4. [Harness limit] Card focus cannot be observed live**
- **Issue:** The harness window never has system focus: `document.hasFocus()` is false. A scratch experiment confirmed that neither `focus()`, `focus({ focusVisible: true })` nor a trusted BiDi key press makes a card match `:focus` or `:focus-visible` (`pan05-22-06-t2.log`, `-t3.log`).
- **Fix:** Probe (g) now does three things:
  - requires the × to be at opacity 0 when idle;
  - requires it at opacity 1 under a trusted BiDi pointer hover;
  - requires the loaded CSSOM to carry both the `:focus-visible` rule and the `:hover` rule that show it.

  The focus half is therefore proven to be in the bundle, but not rendered. The screenshot shows the hover state, not a focused card.
- **Commits:** db15312, f7199cc. f7199cc dropped the (g) detail line, and c23a79b restored it (`pan05-22-06-t4.log` passed without that line).

### Plan-adjacent choices

- **Auto-save off for step (d).** Theia's browser default for `files.autoSave` is `afterDelay`. With that default, Theia's own close saves a dirty editor and shows no prompt, which loses nothing. pan05 sets the in-memory `SaveableService.autoSave` to `off` for step (d) and restores it afterwards; no preference file is written. With auto-save on, a card × behaves exactly like the strip × and saves.
- **Step (f) reuses (e).** G2's only cards are the two not-open rows. Closing them is "G2's last card", so (f) checks G2 after (e) and the probe control's real close.
- **Membership spy.** pan05 wraps `A.actor().mutate` and requires that no close sends setTabGroup, setGroupOrder, dissolveGroup or closeGroup. The plan's truth "no membership write is made" is therefore probed, not only read from the code.

## Notes for the verifier

- **Ledger:** no ledger file and no hash-locked check file was touched. NG-074 and NG-084 are cited in `requirements` only, as the plan's `ledger_note` says.
- **STATE.md, ROADMAP.md and REQUIREMENTS.md:** not edited, per the run's operational constraints.
- **Known race, not new:** the reload scheduled by a widget's removal can run before the web tab's own closeTab lands. The card would then reappear as a not-open card until the next reload. The strip's × has the same path. It did not occur in any pan05 run.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/verify-pan05-card-close-live.mjs, logs/card-close-22-06.png (untracked)
- FOUND: a8118f6, d2f5525, 13ba87b, 49b8a85, db15312, f7199cc, c23a79b (each an ancestor of HEAD)
- Task 1 and Task 2 `<verify>` blocks: both print their PASS marker.
