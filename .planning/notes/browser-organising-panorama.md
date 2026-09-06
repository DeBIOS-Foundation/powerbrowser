---
title: Organising mode as Panorama canvas
date: 2026-09-06
context: gsd-explore on Theia-hosted browser GUI; two gsd-phase-researcher passes over Firefox Panorama (TabView, FF4-45)
---

# Organising Mode as Panorama Canvas

Decided 2026-09-06 with Chris. Direction: copy Firefox Panorama's
freeform canvas, not a kanban board. Tree view is the secondary
toggle; canvas comes first and the tree reads the same group data.

## Research (admitted — with sources)

- Freeform canvas: one 2D surface; groups are free-floating named
  boxes. Dragging a tab into space and dropping a second tab onto it
  auto-draws the box. Move via edge strips; resize via handle.
  — archived SUMO "Use Tab Groups to organize a lot of tabs"
- No snap, no grid, no auto-fit: pixel-free positioning, groups never
  auto-size, manual resize only.
  — SUMO guide; Bugzilla 654721; MozillaWiki spatial-memory premise
- Zoom is semantic: entering/exiting animates (click a tab to dive
  in); resizing a group continuously scales its live thumbnails.
  — SUMO guide; DaniWeb FF4-beta contemporary report
- Piling: shrinking a group past a threshold stacks tabs into a pile
  with a preview peek. Typing anywhere searches; matches highlight.
  — SUMO guide
- One active group at a time: choosing a tab filters the strip to
  that group only; closing a group closes all its tabs.
  — SUMO guide
- Architecture: GroupItem kept children + bounds rect + title + id;
  membership lived in sessionstore extData (`tabview-tab` per tab,
  `tabview-group` per window). View ran in a chrome iframe with a
  hand-rolled `iQ` helper (no jQuery) + CSS transforms + bespoke
  drag.js. Thumbnails were live per-tab canvases via
  `gPageThumbnails.captureToCanvas`.
  — FF44 storage.js/tabitems.js/groupitems.js/iq.js via Spinellis
  sessionstore repro + Bugzilla 1221050
- Removal lesson: geometry + membership + UI state all lived in
  sessionstore extData, so removal meant stripping hidden groups out
  of real session data. We must NOT copy this coupling.
  — Bugzilla 1221050 parts 0-3

## Corrected (a primary source disagreed)

- Shipped Panorama used no jQuery: hand-rolled `iQ` + CSS transforms
  + bespoke drag.js.
  — FF44 iq.js header, tabview.html, browser-tabview.js:232

## Our seam (cleanest, from the code pass)

- SQL groups table (id, title, bounds, activeGroupId) + group_id on
  the URI-keyed tab rows. The Theia canvas reads/writes only SQL;
  sessionstore stays restore-authoritative.
- Thumbnails map to the PNG last-view snapshot idea already in
  tab-sql-substrate.md: recognizable cards without live capture.

## Mechanics to nail, in order

1. Drag-tab-onto-tab (or onto empty canvas) auto-boxes a group.
2. Free drag + corner-resize with live thumbnail scaling.
3. Semantic zoom (dive in/out), piles, type-anywhere search after.

## Tree toggle

- Tree is the same group data rendered as vertical stacked lists
  (top-to-bottom columns for wheel scrolling), never a second store.
- Kanban comparisons end here: the board metaphor is retired in
  favor of canvas-first, tree-second.
