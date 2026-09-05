---
title: Tab-SQL substrate exploration
date: 2026-09-05
context: gsd-explore on SQL-backed tabs + GUI requirements; next-cycle ideation, out of scope for v1.1 hardening
---

# Tab-SQL substrate exploration

Source: Socratic explore session (2026-09-05). Status: ideation only — no
requirements changed; SQL-01 stays future, GUI-02/GUI-05 stay deferred behind it.

## Motivation (researcher workflow)

Heavy-tab researchers need: organize many tabs, keep history of what each tab
was, switch between workflows (e.g. finance day vs project research) with
instant restore, survive crashes without losing tab state. Bookmarks are too
slow and manual for this.

## Decisions and leanings from the session

- **Session model stays open, not baked in.** The user often does not know a
  new session started. The platform must support manual named workflows,
  automatic grouping, and hybrids — extreme flexibility so any GUI/setup can
  be built on top. No single session semantic goes in the platform.
- **SQL is a user-queryable substrate, not an internal store.** Users (and
  MCPs) can read and modify it. Schema stability and documentation are
  requirements, not nice-to-haves.
- **Age is a first-class column.** Restore fidelity depends on session age:
  ~5 minutes means full live state (as if tabs never left); older sessions
  degrade gracefully. Exact tiers are configurable, not fixed.
- **Restore behavior is a setting, and settings live in the same SQL.**
- **Proposed anchors (unchanged):** `TabUriRegistry` URIs as join key,
  single chrome-side writer behind `PowerBrowserAPI`, sessionstore stays
  authoritative for restore, own SQLite file, encrypted database.
- **Tab states:** add a PNG last-view snapshot state so a tab is recognizable
  after its cache expires; optional full saved-page capture.
- **Aging/cleanup (CCleaner-like) is explicitly later work**, but the schema
  must record content age from day one so cleanup is possible.
- **Ordering holds:** SQL-01 before any GUI work (GUI-02, then GUI-05).

## Deferred explicitly

- MCP access to history (separate matter, noted not this task).
- Cleanup tooling, telemetry/extension live drills — other tracks.
