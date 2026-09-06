---
title: Full Firefox parity tabs on the SQL store
trigger_condition: MVP chrome lands and the SQL tab store is green
planted_date: 2026-09-05
---

# Seed: Full Firefox Parity Tabs

Tear-off drag + cross-window drop + new-tab tiles page, built on the
v1.2 SQL tab store (tabs as rows keyed on TabUriRegistry URIs).

- Drag carries a URI string; the store is the shared truth both
  windows read. Drop target reopens by URI and marks it active in its
  window.
- Tiles page falls out of cross-surface queries: open tabs ⋈ history ⋈
  bookmarks on URL, ranked by frecency.
- Not carried by the row: live page state (scroll, form text,
  back-stack) still lives in the widget/sessionstore.

Plant trigger: the MVP chrome has landed and the Phase 11/12 store
(SQL-01..05) is built and gated green. True `<xul:browser>`-backed web
tabs (GUI-02) are the renderer prerequisite for web content; do not
build parity chrome over iframe-only tabs and call it done.
