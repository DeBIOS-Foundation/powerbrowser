---
title: Browser window model decisions
date: 2026-09-05
context: gsd-explore on Theia-hosted browser GUI, Firefox-parity tabs
---

# Browser Window Model Decisions

Explored 2026-09-05 with Chris. Status: decided, feeds MVP GUI scope.

## Core + dependents

- One core Theia window owns the backend session and all tab identity.
- Sub-windows are dependents: host full tab content, closable freely.
- Core close is a full kill of PowerBrowser. Every sub-window dies with
  it; next launch restores from the remembered layout. No orphan
  windows, no reattach flow, no warn dialog.
- Close is delete-rows-for-session; launch is read-setup-and-reopen-by-URI.

## Why not independent windows

- v1.2 store invariant is a single chrome-side writer. Two independent
  windows means two frontends negotiating tab ownership mid-drag.
- Core + dependents keeps one WidgetManager, one backend, one token.
- Matches Theia's existing secondary-window shape (main instance owns,
  secondaries auto-close, widgets move back on secondary close).

## Known gap

- A sub-window hosts tab content plus its tab bar, not a second full IDE
  frame (no duplicate activity bar, menus, palette). "Full GUI
  functionality" per window kind still needs scoping in design.
- Theia secondary windows open via `window.open`, which PowerBrowser's
  GUI-01 channel currently routes to stock browser chrome. Secondary
  windows need explicit routing work before they open Theia.

## Setups

- Layouts + window positions persist across restarts as named setups
  that can be flipped between.
- A setup records: window geometry, which tab URIs live in which
  window, and which mode (coding / browsing / organising) each window
  is in.
## Mode rules (decided 2026-09-05)

- **Tabs go with you in every mode.** Mode switches may rearrange,
  hide, or relocate everything else, but no tab is closed, moved
  windows, or detached by a mode change. Organising mode exists to
  manage tabs, never to purge them.
- **Tab strip position follows the mode.** Browsing mode puts tabs on
  the top bar the way every web browser has; coding mode puts tabs
  where a coding platform puts them. The strip moves, the tabs persist.
- **Modes are user-customizable with shipped defaults.** Defaults
  cover the majority (coding / browsing / organising); users may
  define their own modes as visibility + layout rules. Modes are data,
  not code forks.
- **Panels slide VS Code-style.** Left/right panels collapse and slide
  with a toggle in every mode.
- **Full Firefox-style rearrange (drag panels and buttons anywhere)**
  is later work — see the gui-component-dnd seed. Wire-up first.

## MVP scope (tab feel + navigation only)

- In: tab strip with reorder/split/move inside the window, back,
  forward, reload, address input, new tab, mode toggle.
- The browser toolbar is called the **chrome bar**: a toolbar-like
  contribution placed above or below the Theia toolbar (sketch 001
  winner: Variant A top bar).
- Backlog (see seeds): bookmarks strip, per-tab close/mute, browser
  menu, tear-off drag, cross-window drop, tiles page.
