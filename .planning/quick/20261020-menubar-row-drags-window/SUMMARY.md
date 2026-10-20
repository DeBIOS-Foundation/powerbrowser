---
status: complete
date: 2026-10-20
---

# Empty menubar row drags the window

The menubar element is only as wide as its menus (ends after "Help"), so the
first drag row stopped there. `publishDragRegions` now spans the first row
across the whole top panel. Measured on the sidecar: handles 0-50px and
429px to the right edge in Coding. Commit c01f11d. Drag itself not tested by
Claude (cannot drive the real window).
