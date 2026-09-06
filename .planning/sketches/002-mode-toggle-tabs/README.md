---
sketch: 002
name: mode-toggle-tabs
question: "How do coding / browsing / organising modes present tabs?"
winner: "B"
tags: [modes, tabs, filtering]
---

# Sketch 002: Mode Toggle + Tabs

## Design Question

How do the coding / browsing / organising modes present tabs, given
the locked rules: tabs go with you in every mode, the strip may move,
everything else may change?

## How to View

open .planning/sketches/002-mode-toggle-tabs/index.html

## Variants

- **A: Segmented toggle** — Modes filter side panels only; the strip
  never moves. Cheapest: pure visibility rules.
- **B: Strip relocates** — Browsing puts tabs on the top bar;
  coding docks the strip IDE-style. Tabs persist, only the strip
  moves. Custom layout work.
- **C: Custom modes** — Modes are data: shipped defaults plus
  "Save current layout as mode". Strip stays top; panels filter per
  rule.

## What to Look For

- The tab count chip: switching modes never changes it. That is the
  invariant being asserted.
- Organising mode is a freeform Panorama canvas in every variant,
  grounded in two researcher passes over the real TabView code
  (see browser-organising-panorama.md): pixel-free group boxes with
  header-drag move and corner resize, no snap/grid/auto-fit, zoom
  controls, drag-onto-empty-canvas auto-boxes a group, ungrouped
  tray along the bottom. Canvas/Tree toggle flips to a vertical
  tree over the identical group data — never a second store.
- Search filters cards across groups in both views.
- Coding starts with the nav row hidden in B (IDE state); browsing
  reveals it. Feel whether the strip jumping position is clarifying
  or disorients.
