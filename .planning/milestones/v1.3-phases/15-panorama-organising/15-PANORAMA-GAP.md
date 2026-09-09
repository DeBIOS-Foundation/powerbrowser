# Panorama gap analysis — what Organising is missing

**Written** 2026-09-09 · **Owner decision pending**

Derived from the Firefox 44 `browser/components/tabview/` source (`ui.js`,
`groupitems.js`, `tabitems.js`, `drag.js`, `trench.js`, `search.js`,
`items.js`, `tabview.properties`), fetched at `FIREFOX_44_0_RELEASE` — the
last release before Panorama was removed in Firefox 45. Every row below names
the function that implements it, so a claim here is checkable rather than
remembered.

The live counterpart is `.planning/sketches/004-panorama-reference/index.html`
— a working low-fidelity Panorama with all of it implemented. Open it and the
behaviour is on screen instead of on paper.

---

## 0. The defect that comes first: the cards are not the tabs

Reported 2026-09-09: *"organising is not the same cards as the tabs"*. Three
independent causes, all confirmed in the tree.

**(a) The canvas is a snapshot, never refreshed.**
`OrganisingWidget.init()` (`@postConstruct`) calls `initialize()` → `model.load(reader)`
exactly once, at widget construction. Nothing reloads it when Organising is
entered. Whatever the store held the first time Organising opened is what the
canvas shows for the rest of the session.

**(b) The store records stock-window tabs, which are not Theia tabs.**
`PowerBrowserAPI.startTabStoreTriggers` attaches `TabOpen`/`TabClose`/`TabSelect`/
`TabAttrModified` to the tab container of **every** `navigator:browser` window,
and `sweepTabStoreFromSessionStore` writes a row for every tab sessionstore
knows about. In-shell web tabs write rows too (`webTabOpen`'s
`onLocationChange`), so the table is the union of two populations, and only
one of them is in the strip.

This is self-feeding through the current `dive()`: clicking a card calls
`window.open(url, '_blank')`, which opens a **stock** browser window; that
window's tab is then written as a row; that row becomes another card with no
Theia tab behind it. Every click on a card adds a card.

**(c) Rows outlive their tabs.**
`pruneClosedTabRows` deletes a row only when it is absent from the live set
**and** older than `TAB_STORE_CLOSED_RETENTION_MS` (7 days). A tab closed while
the shell was not running keeps its card for a week.

**What that means for the fix.** `tabs.sqlite` is a *tab history with group
membership*, not a live tab list. Panorama's model is the opposite: `GroupItems`
holds exactly the window's open tabs, and `TabItems.link`/`unlink` keep it in
step with `gBrowser`. Closing the gap means the Organising model is fed by the
open-tab set (the Theia dock plus whatever chrome owns), with the store used
only for the group geometry and membership that the dock cannot know. This is
the same seam GUI-04's chrome-owned tab model is for, so it should be settled
before more Panorama surface is built on top of a source that does not match.

---

## 1. Census

`have` = in Organising today. `part` = present but different. `gap` = absent.

### Group lifecycle

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| have | New Group button | `GroupItems.newGroup` | |
| **gap** | **Draw a group by dragging a rectangle on empty canvas** | `UI._createGroupItemOnDrag` | Live rubber band, minimum size, name focused on release. Our only creation paths are the button and an auto-box on drop. |
| part | Close group | `GroupItem.close` | Ours asks an irreversible confirm dialog. |
| **gap** | **Undo Close Group** | `_createUndoButton`, `setupFadeAwayUndoButtonTimer`, `closeHidden`, `_fadeAwayUndoButton` | The group is *hidden*, not destroyed; an Undo button sits in its bounds for ~15s, with a discard × to end it early. This is why Panorama needs no confirm dialog, and it is strictly better than the dialog we shipped. |
| **gap** | **The last remaining group has no close button** | `getUnclosableGroupItemId`, `updateGroupCloseButtons` | You cannot close yourself out of every group. |
| have | Empty group dissolves | `closeIfEmpty` | Ours is `dissolveEmptied`. |
| part | Rename | `setTitle`, `focusTitle` | Panorama: single click, placeholder "Name this tab group". Ours: double click, default "Untitled group". |

### Group geometry

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| have | Move by title bar | `setBounds` + `_addHandlers` | |
| have | Resize by corner grip | `setResizable` | |
| **gap** | **Snapping to other groups' edges and to the window** | `trench.js`, `Drag.snap`, `Drag.snapToEdge` | Groups project "trenches" — guide lines from each edge — and a dragged or resized group snaps to them. Without it, a hand-arranged canvas never lines up. |
| **gap** | **Overlapping groups push each other apart** | `Item.pushAway` (`items.js`) | |
| **gap** | Dragged group rises to the front | `setZ` | |
| have | Minimum size | `calcValidSize` | |

### Tab layout inside a group

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| part | Cards laid out inside the group | `_gridArrange` | Panorama picks the largest uniform card size that fits **every** child and re-packs live on resize. Ours are fixed-size cards that wrap and overflow. |
| **gap** | **Stacking when the group is too small** | `shouldStack`, `_stackArrange`, `_freezeItemSize` | Cards fan into a stack with a count badge instead of overflowing. |
| **gap** | **Expand a stacked group** | `showExpandControl`, `expand`, `collapse` | An expand control opens an overlay tray with every card at full size; Esc collapses. |
| **gap** | **Drop-space opens at the insertion point** | `dropOptions.move` + the drop-space timer | Dragging over a group opens a gap where the card would land, so you choose the position, not just the group. |
| **gap** | **Card order is tab order, both directions** | `reorderTabItemsBasedOnTabOrder`, `reorderTabsBasedOnTabItemOrder` | Reordering cards reorders the strip and vice versa. |

### The card itself

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| part | Click a card opens that tab | `TabItem.zoomIn` | Panorama zooms the thumbnail to full window and leaves Panorama into that tab. Ours calls `window.open` and opens a **stock browser window** — the defect above. |
| **gap** | Entering Panorama animates out of the current tab | `TabItem.zoomOut` | Cosmetic, but it is what makes the canvas read as "the tabs pulled back". |
| **gap** | **Per-card close button** | `TabItem.close` | |
| **gap** | Favicon on the card | `TabUtils.faviconURLOf` | Ours shows title + URL text. |
| **gap** | The active tab is outlined | `makeActive`, `makeDeactive` | |
| part | Thumbnails | `updateCanvas`, `showCachedData`, heartbeat | Ours are static snapshots from the store; Panorama repaints live and falls back to a cached bitmap for unloaded tabs. |
| n/a | Pinned tabs leave the canvas | `handleTabPin`, `handleTabUnpin` | We have no pinning. |
| n/a | App-tab favicon tray down every group's left edge | `addAppTab`, `adjustAppTabTray`, `arrangeAppTab` | Same reason. |

### Groups and the tab strip

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| **gap** | **The strip shows only the active group's tabs** | `setActiveGroupItem`, `GroupItems._updateTabBar` | **This is the point of Panorama.** Grouping means nothing if the strip still lists everything; that is what makes a group a workspace rather than a folder. Ours lists every tab in every group. |
| **gap** | **Ctrl+` / Ctrl+Shift+` switch to the next / previous group** | `getNextGroupItemTab` | |
| **gap** | **A new tab opens inside the active group** | `GroupItems.newTab` | Our `+` makes an ungrouped tab. |
| **gap** | **Each group has its own `+`** | `GroupItem.newTab` | |
| **gap** | Closing the active tab selects the next one in the same group | `_onChildClose`, `_makeClosestTabActive` | |

### Search

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| **gap** | **Type anything to search; matches highlight, the rest dim; Enter goes to the top match** | `search.js` — `Search.ensureShown`, `TabMatcher`, `_scorePatternMatch` | Scored, not a substring filter. |
| n/a | "Tabs from other windows" result section | `matchedTabsFromOtherWindows` | |

### Keyboard

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| part | Arrow keys | `UI._setTabViewFrameKeyHandlers` | Panorama moves to the nearest card in that direction **across groups**. Ours cycles within one group only. |
| part | Enter | same | Zooms into the active card, or makes a tab if the group is empty. |
| **gap** | Esc collapses an expanded stack, else exits | same | |
| **gap** | Tab / Shift+Tab cycles within the active group | same | |

### Persistence

| | Behaviour | Panorama source | Notes |
|---|---|---|---|
| have | Groups and membership survive restart | `getStorageData`, `save`, `load`, `reconstitute`, `storageSanity` | Ours is `tabs.sqlite`; the shape is comparable. |

---

## 2. What to do, in order

**First, and before anything else is built:** fix the model source (§0). Every
row below assumes the canvas shows the tabs that are actually open. Building
more Panorama on a stale union of two tab populations multiplies the defect.

**Tier 1 — Panorama's actual value proposition.** Without these it is a
diagram of tabs, not a way of working with them.

1. Active group filters the tab strip.
2. New tab lands in the active group; per-group `+`.
3. Draw a group by dragging on empty canvas.
4. Undo Close Group, replacing the irreversible confirm dialog.
5. Per-card close button.
6. Search.

**Tier 2 — the difference between usable and pleasant.**

7. Grid arrange that re-packs and scales on resize.
8. Stacking plus the expand tray.
9. Snapping (trenches) and push-away.
10. Drop-space at the insertion point; card order is tab order.
11. Ctrl+` group cycling; the last group is unclosable.

**Tier 3 — polish.**

12. Zoom in / zoom out transitions, active-card outline, favicons.
13. Spatial arrow navigation, Tab cycling, Esc semantics.
14. Live thumbnails.

## 3. One decision the census forces

**Panorama has no "Ungrouped" tray.** Every tab is in exactly one group; a tab
dragged onto bare canvas immediately gets a group of its own, and an emptied
group disappears. Our 144px tray is an addition, not a Panorama feature.

It is defensible — it gives a drop target with a stable position, which bare
canvas does not — but it is the one place where "a copy of Firefox's Panorama"
and what is built diverge by design rather than by omission. The reference
sketch implements Panorama's behaviour (no tray) so the two can be compared
directly before the call is made.
