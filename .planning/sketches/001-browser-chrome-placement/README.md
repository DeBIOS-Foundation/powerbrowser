---
sketch: 001
name: browser-chrome-placement
question: "Where does the browser chrome bar live?"
winner: "A"
tags: [layout, chrome, navigation]
---

# Sketch 001: Browser Chrome Placement

## Design Question

Where does the browser chrome bar (back / forward / reload, address
input, new tab, mode toggle) live in the Theia window?

## How to View

open .planning/sketches/001-browser-chrome-placement/index.html

## Variants

- **A: Top bar** — Tab strip on top, nav row beneath. Firefox-like.
  Path of least resistance: existing tab bars + a toolbar contribution.
- **B: Floating address** — No permanent nav row; a chip opens a
  centered floating bar. Maximum content space.
- **C: Side strip** — Tabs + nav stacked vertically. Frees vertical
  space; titles never truncate.

## What to Look For

- Which placement keeps tab feel (switch, reorder by drag, new tab)
  and navigation (back/forward/reload/address) closest to hand.
- Mode toggle position per variant; switching modes hides the fake
  Explorer panel but keeps all tabs — that filtering behavior is the
  subject of sketch 002.
- Deliberately absent per MVP scope: no per-tab close buttons, no
  bookmarks strip, no browser menu.
