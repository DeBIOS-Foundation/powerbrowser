---
status: complete
date: 2026-10-20
---

# Side panel view icons across the top (sketch 005 item 4)

`TopTabsSidePanelHandler` (rebound over Theia's `SidePanelHandler` from the
chrome-bar module) lays each side out as one 35px header row -- view icons left
to right, the view's actions at the right end, no title text -- over the view.
The 48px rail and its foot menus are gone: the gear was already in the title
row, and the account button moved there (shown while an account provider is
registered, as the rail's was). A collapsed side is hidden outright; the mode
code's two rail-hiding call sites keep a collapsed side hidden in Coding.

Layout toggles now read open state from panel visibility, because stock
`isExpanded` is false during the expand animation.

Sidecar (fresh profile, Explorer only on the left): header 35px, actions at
the right end, view at y=107; left collapse hides the side and the main area
moves to x=0, reopen restores 367px; bottom toggle 140px <-> 0 with the icon
tracking; Browsing hides both sides, Coding restores them.

shortcut: overflowing view icons are clipped, not moved to a menu.
