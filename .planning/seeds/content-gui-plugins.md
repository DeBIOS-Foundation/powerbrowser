---
title: Modular content-consumption GUI plugins
trigger_condition: When GUI phases (GUI-02/GUI-05) or Theia extension work is being scoped
planted_date: 2026-09-05
---

# Seed: modular content-consumption GUI plugins

Tangent captured from the tab-SQL explore session — related to the modular-GUI
picture, not to the tab store itself.

The GUI must stay fully agnostic so people build and share their own browsing
surfaces as Theia extensions (`@powerbrowser/*`, never Theia core patches).
One user may want video and news consumed a particular way; a plugin (e.g.
"news buddy") scrapes their sources and assembles their preferred format.

When GUI work starts, scope should include: what extension points a
content-style plugin needs (page fetch/extract, custom views, scheduling),
and one reference plugin proving the path. Vibe-coding makes this load-bearing:
users will want to build their own browser GUI without forking the platform.
