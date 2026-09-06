# Modes, Tabs & Panorama Organising

## Design Decisions

- Three shipped default modes — coding / browsing / organising —
  presented by a segmented toggle in the chrome bar (sketch 002
  winner: Variant B, strip relocates with the mode).
- **Tabs go with you in every mode.** Mode switches move, filter, or
  relocate everything else; no tab is closed, moved windows, or
  detached by a mode change. The status-bar tab-count chip asserts
  this on every switch.
- **Tab strip relocates with the mode**: top-bar browser style in
  browsing, IDE-docked in coding. Tabs persist; only the strip
  moves. This is custom layout-contribution work, not a config flip.
- Modes are customizable data with shipped defaults: users may save
  the current layout as a mode (002-C pattern folds into B's toggle
  as a menu). Modes are visibility + layout rules, never code forks.
- Organising mode is a freeform Panorama canvas, grounded in
  researcher passes over the real Firefox TabView code: pixel-free
  group boxes with header-drag move and corner resize, no
  snap/grid/auto-fit, zoom controls, drag-onto-empty-canvas
  auto-boxes a group, ungrouped tray along the bottom. Click a card
  to dive back to browsing on that tab.
- Canvas/Tree toggle: the tree is vertical stacked lists over the
  identical group data — a second view, never a second store.
  Canvas first, tree built from it. Kanban metaphor retired.
- Storage seam: SQL groups table (id, title, bounds, activeGroupId)
  + group_id on URI-keyed tab rows; canvas reads/writes only SQL,
  sessionstore stays restore-authoritative. Thumbnails map to PNG
  last-view snapshots. See
  `.planning/notes/browser-organising-panorama.md` for sources.

## CSS Patterns

- Dotted canvas: `radial-gradient(var(--color-border) 1px,
  transparent 1px)` at 22px grid (positioning guide only — groups
  never snap to it).
- Group boxes: surface fill, hairline border, `radius-md`,
  `shadow-md`; header grabs (`cursor: grab`), corner `◢` handle
  (`cursor: nwse-resize`); drop highlight swaps border to primary.
- Cards: raised fill, thumbnail block on top, mono URI caption.
- Unselected trailer: dashed-border tray for ungrouped tabs.

## HTML Structures

- Organising view: toolbar (search + Canvas/Tree toggle + zoom) →
  canvas wrap (relative) → inner (scaled) → absolute groups →
  ungrouped tray.
- Tree view: stacked group sections with indented lists under a
  hairline rule.
- Group element carries `data-g` (name); cards carry `data-u` (tab
  URI); canvas carries `data-canvas` for background-drop auto-box.

## What to Avoid

- Kanban board for organising: equivalent information density to a
  tree with none of Panorama's spatial memory; retired.
- Strip that never moves (002-A): cheapest but keeps browser tabs
  in IDE position; lost to B.
- Closing, moving, or detaching tabs on mode switch — the invariant
  violation this design exists to prevent.
- Coupling groups to sessionstore extData (Panorama's removal
  lesson): geometry + membership live in SQL, never in the session
  file.

## Origin
Synthesized from sketches: 002
Source files available in: sources/002-mode-toggle-tabs/
