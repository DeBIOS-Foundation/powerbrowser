---
sketch: 005
name: vscode-layout
question: "How should Coding mode lay out its shell, VS Code style?"
winner: "adopted into v1.5 (all four changes), Chris 2026-10-17"
tags: [layout, coding, chrome, SK-01]
---

# Sketch 005: VS Code Layout

## How to View

open .planning/sketches/005-vscode-layout/index.html

Switch between Proposed and Today, and read the numbered callouts against the legend.

## Verdict

Chris, 2026-10-17 (SK-01): adopted, all four changes, into the v1.5 milestone. The
ROADMAP Milestones list carries the milestone's name.

The four adopted changes, by the labels of the legend items the sketch marks as changes:

1. **One title row**: menubar, navigation, the address box, the right cluster and the
   window buttons share the top row.
2. **Centred address box**: the address pill is capped at about 38% of the row and
   centred, like the command centre; the space either side moves the window.
3. **Right cluster**: layout toggles (left sidebar, bottom panel, right sidebar,
   customize), account, settings.
4. **Activity icons across the top**: the activity bar runs horizontally above the
   Explorer, inside the sidebar column.

Item 3's own text leaves the mode toggle's placement open ("The mode toggle sits beside
the address box; placement open."). That question carries into v1.5 unresolved.

## Already true today

Sidebar columns, Tabs inside the editor group, Status bar, Window buttons (legend items 5-8).

## Scope

Coding only. Browsing and Organising keep today's layout, as the sketch's own scope line
states.

## Not in v1.4

Nothing under `theia/` is built from this sketch in v1.4. The Phase 24 UAT tests today's
layout.

## Palette

The page's light scaffolding colours (`--bg`, `--primary`, `--change`) colour the sketch
page and its callouts only. They never enter the PowerBrowser product tokens (23-UI-SPEC).
