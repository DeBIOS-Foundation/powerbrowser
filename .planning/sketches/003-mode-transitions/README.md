---
sketch: 003
name: mode-transitions
question: "What should the mode buttons actually do, and where do the tabs live in each mode?"
winner: "pending — Chris to judge"
tags: [modes, tabs, strip-relocation, GUI-07]
---

# Sketch 003: Mode Transitions

## Why this exists

Sketch 002 picked Variant B — "strip relocates with the mode" — and 002's own
findings retired Variant A with the line *"Strip that never moves (002-A):
cheapest but keeps browser tabs in IDE position; lost to B."*

What ships today is Variant A. `mode-service.ts:240-277` changes side-panel
visibility and nothing else; the UAT's evidence line for G-14.1.1-11 reads
**"No code relocates the strip."** Chris looked at the built mode buttons on
2026-09-08 and said they were "not doing any of the functions that were
discussed for the build." He is describing this gap.

## How to View

open .planning/sketches/003-mode-transitions/index.html

Click the three segments. Two tabs stay open throughout.

## The rule this sketch is built on

Chris, 2026-09-08, correcting the first draft:

> "the tabs never change and the URL bar always stays in place — what happens
> is the location of the tabs changes between the three different modes."

So there are exactly two constants and one variable:

- **Constant — the URL row.** Back / forward / reload / address field / `+` /
  mode toggle. Present and identical in all three modes. It never hides and
  never loses a control. (The first draft hid it in Coding, per sketch 002's
  "nav row hidden in B"; that is overruled — Coding keeps the URL and the `+`.)
- **Constant — the tabs.** Same tabs across every switch.
- **Variable — where the tabs live.** Three homes, one per mode.

## The three homes

- **Browsing → the very top.** A full-width strip above the URL row, in the
  title-bar position Firefox and Chrome use. Panels hidden, page maximised.
- **Coding → docked in the editor area.** The strip leaves the top and
  reappears as editor tabs above the content, beside Explorer and over the
  terminal. URL row unchanged.
- **Organising → the Panorama canvas.** Firefox's old Panorama: every tab is a
  thumbnail card inside a group box, dragged by its header, resized by the `◢`
  corner, no snapping. Ungrouped tabs wait in the dashed tray. Canvas/Tree
  toggle and zoom sit top-right. Clicking a card dives back to Browsing on that
  tab.

## Measured baseline (what ships, 2026-09-08)

Driven live against the sidecar at `127.0.0.1:4000`:

| | Browsing | Coding |
|---|---|---|
| chrome bar | y=30, w=2048 | y=30, w=2048 — unchanged |
| tab strip | x=48, y=72 | x=391, y=72 — shifts right only |
| left panel | 48px (icon rail) | 391px (Explorer) |
| bottom panel | hidden | visible |

The strip never changes shell area. Organising opens one placeholder tab
titled "Organising" — no canvas, no cards.

## What to Look For

- Does the strip changing home read as clarifying, or as the window
  rearranging itself under you? That was 002's open question and it still
  decides this.
- The strip cross-fades between homes (0.15s) rather than animating across the
  window. Right call, or does the movement need to be visible?
- In Browsing the top strip adds a row, so everything below it sits one row
  lower than in Coding. The URL row keeps its contents and order either way,
  but it is not pixel-identical between modes. Worth confirming that is what
  "stays in place" means.

## Decisions taken during the sketch (Chris, 2026-09-08)

1. **Coding keeps the URL bar and the `+`.** Overrules sketch 002's "Coding
   starts with the nav row hidden in B (IDE state)".
2. **Browsing puts the tabs at the very top**, Firefox/Chrome title-bar
   position — not pills beside the address field.
3. **Browsing and Organising drop the IDE furniture**: no menubar, no left
   icon rail, no status bar. Browsing is a browser; Organising is a
   full-screen canvas. **Coding is the only mode that keeps them.** The CSS is
   scoped by exclusion (`:not([data-mode="coding"])`) so a fourth mode has to
   opt in to the furniture rather than inherit it from a selector nobody
   updated.
4. **The tab-count chip is removed everywhere** — URL row and status bar both.
   Consequence to carry: 14-UI-SPEC.md:236 makes that chip the visible
   assertion that a mode switch never loses a tab ("the status-bar tab-count
   chip re-asserts the invariant on every switch"). The invariant still holds;
   its on-screen proof no longer exists. If this sketch becomes the design,
   that line needs amending or the invariant needs another home.

## Implementation status (2026-09-08)

**Landed:**

- `7f001b2` — the spike-verdict gate's core instrument never ran (127 on every
  tree), so its zero-core pillar asserted nothing in either direction. Fixed.
- `9a72c91` — spike re-probed **GREEN**, routing to Variant B. Both pillars
  measured on today's tree: `diff-theia-core.sh --quick` exit 0, and 6/6 live
  moves through `shell.addWidget(widget, {area})` with identity preserved.
  GUI-07's entry criterion is met.
- `3cefed6` — 14-UI-SPEC amended: the strip relocates per mode, Browsing and
  Organising drop the IDE furniture, the URL row and the tabs are invariant,
  the tab-count chip is removed.

**Written but NOT committed — `chip-removal.patch` beside this file.**

Removes the tab-count chip from `chrome-bar-widget.tsx` (field, `publishTabCount`,
the `<span>`, the `StatusBar` injection and its four subscriptions), its CSS
rule, and its entry in `verify-shell-error-copy.mjs`. Typechecks clean; the
copy gate and its self-test pass.

It is not committed because `scripts/verify-mode-switch-tabs-invariant.mjs`
declares `publishTabCount` as a switch-path anchor and `setElement` as
allowlisted surface, and the gate requires that contract to change in the SAME
commit. That file currently carries 328 uncommitted lines from a concurrent
session, so `git add` on it would sweep their work into this commit.

To land it: once the tree is clean, `git apply` the patch, then delete
`'setElement'` from `EXPECTED_SWITCH_CALLS` and the `publishTabCount` anchor
entry from the switch-path list, and commit the four files together.

**Not started — needs `mode-service.ts`, also contested:** the strip
relocation itself, the per-mode DOM marker the furniture CSS needs (no
per-mode class exists on the shell today — verified live), and the Browsing /
Organising furniture stripping.
