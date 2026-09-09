# Panorama worklist — the changes, in order

**Written** 2026-09-09 · companion to `15-PANORAMA-GAP.md`

Each item names the files it touches. Ordered by dependency, not by size: W0
gates everything, and W1–W2 are what make Organising worth using at all.

Three decisions are needed before W1; they are at the end.

---

## W0 — The canvas must show the tabs that are open (blocker)

Everything below assumes the cards are the tabs. Today they are not
(`15-PANORAMA-GAP.md` §0). Three changes, one root cause each:

- **`theia/extensions/modes/src/browser/group-model.ts`** — the card list
  comes from the shell's open tabs (`WebTabWidget` instances in the main
  dock), joined to the store for group membership. The dock becomes the
  authority for *which tabs exist*; the store stays the authority for
  *groups, geometry, and membership*, which the dock cannot know.
- **`organising-widget.ts`** — re-render on `shell.onDidAddWidget` /
  `onDidRemoveWidget` / title change, and reload the store when Organising is
  entered rather than once in `@postConstruct`.
- **`organising-widget.ts:dive()`** — activate the in-shell `WebTabWidget`
  instead of `window.open(url, '_blank')`. This is what closes the loop where
  each card click opens a stock window whose tab becomes another card.

A live check belongs with this one: card set equals dock web-tab set, asserted
in the built browser, since no static gate can see it.

## W1 — The active group filters the tab strip

The point of Panorama (`GroupItems._updateTabBar`).

- **`theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`** —
  `mainTabs()` also filters by the active group.
- **New: a frontend membership reader** both the strip and Organising read,
  so neither owns a second copy of "which group is active and what is in it".
  `@powerbrowser/chrome-bar` already depends on `@powerbrowser/modes`, so it
  belongs in modes beside `GroupModel`.
- Needs **decision 2** below.

## W2 — A new tab lands in the active group

Today `setTabGroup` is called only from Organising's drop paths, so every tab
the `+` makes is ungrouped — which is why the tray fills up on its own.

- **`chrome-bar-widget.tsx`** and the web-tab creation path — assign the
  active group on create.
- **`organising-widget.ts`** — a `+` on each group box (`GroupItem.newTab`).

## W3 — Draw a group by dragging on empty canvas

- **`organising-widget.ts`** — `pointerdown` on `.pb-org-canvas` draws a live
  rubber band; release below ~30px is a click, not a group; the new group
  opens its rename. (`UI._createGroupItemOnDrag`.)

## W4 — Undo Close Group, replacing the confirm dialog

- **`group-model.ts`** — a closed group is hidden, not destroyed; restore or
  commit after ~15s.
- **`PowerBrowserAPI.sys.mjs:closeGroupRows`** — currently destroys
  immediately; the commit has to be what the timer fires, not what the click
  fires.
- **`15-UI-SPEC.md`** — the "you can't undo this" copy goes; Panorama needs no
  confirm dialog because the undo is the safety net.

## W5 — Per-card close button

- **`organising-widget.ts`** + `webTabClose` (`TabItem.close`).

## W6 — Search

- **`organising-widget.ts`** — any printable key opens the box; matches
  outline, the rest dim; Enter goes to the top match. (`search.js`.)

## W7 — Cards re-pack and scale with the group

Replaces the fixed-size flow layout in `.pb-org-box-cards`.

- **`organising-widget.ts`** + **`modes.css`** — pick the largest uniform card
  size that fits every child, re-packing live on resize. (`_gridArrange`.)

## W8 — Stacking and the expand tray

Depends on W7 — stacking is what happens when the grid can no longer fit.

- **`organising-widget.ts`** — fan into a stack with a count and an expand
  control; expanding opens an overlay tray; Esc collapses.
  (`shouldStack`, `_stackArrange`, `expand`, `collapse`.)

## W9 — Snapping, push-away, z-order

- **`organising-widget.ts`** — edge guides from every other group and the
  canvas, snapping within ~8px on move and resize; overlapping groups push
  apart on drop; the dragged group rises to the front.
  (`trench.js`, `Drag.snap`, `Item.pushAway`, `setZ`.)

Note from building the reference: the push-away must pick the cheapest
direction **that stays on the canvas**. Picking the cheapest unconditionally
and clamping at zero leaves the groups overlapped forever.

## W10 — Drop-space insertion, and card order is tab order

- **`organising-widget.ts`** — a gap opens at the insertion index while a card
  hovers a group, and the card lands there.
- **Store** — needs a per-membership order, which there is no column for
  today; reordering cards must also reorder the strip and vice versa.
  (`dropOptions.move`, `reorderTabItemsBasedOnTabOrder`.)

## W11 — Group cycling and the unclosable last group

- **`modes-commands.ts` / `panorama-commands.ts`** — Ctrl+` and Ctrl+Shift+`.
- **`organising-widget.ts`** — hide the close button when one group is left.

## W12 — Polish

Favicons on cards, active-card outline, spatial arrow navigation across
groups, Tab/Shift+Tab within a group, Esc semantics, zoom in/out transitions,
live thumbnails.

---

## Decisions needed

**1. Keep the Ungrouped tray?** Panorama has none — every tab is in exactly
one group, and a tab dragged onto bare canvas gets its own. Our 144px tray is
an addition. Keeping it means W2 has somewhere to put an unassigned tab;
dropping it means every tab always has a group. Both work; they are different
products.

**2. Does the strip filter in every mode, or only Browsing?** W1 filters the
Browsing strip. Coding's dock tab bar carries editors and terminals as well as
web tabs, so filtering it by tab group may be wrong there.

**3. Tabs in the store that are no longer open.** After W0 the store will
still hold rows for tabs that have been closed. Hide them, or show them as a
restore affordance ("closed tabs from this group")? Panorama has no such
concept — its model is only the open set.
