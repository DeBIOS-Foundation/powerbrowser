---
status: complete
date: 2026-10-20
---

# Organising toolbar above the URL row

Chris asked that the address bar and its buttons stay in the same place in all
three modes. Organising put the URL row first and its toolbar under it; Browsing
and Coding put a row (strip, menubar) above it.

- `OrganisingWidget` now mounts its toolbar as top-panel row 0 while shown and
  removes it on hide/detach (`placeToolbar`).
- Toolbar is 33px, the strip's height; Organising's top panel is 33+40px.
- Drag regions list the toolbar as Organising's first row; the window-controls
  padding moved from the URL row to the toolbar.

Measured live on the standalone sidecar (:4000): URL row top 33px in Browsing
and Organising, 30px in Coding (menubar row, pre-existing); canvas at 73px.
`verify-platform.sh --quick` PASS.
