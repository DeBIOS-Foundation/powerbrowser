---
title: Hister-style history extension (reimplement ideas, not fork)
trigger_condition: When SQL-01 tab/history store or its Theia history GUI is being scoped
planted_date: 2026-09-05
---

# Seed: hister-style history extension

From the tab-SQL explore session: hister (https://github.com/asciimoo/hister)
is the UX model for history — full-text + timeline history with capture — to
be rebuilt as our own Theia extension, modified to fit the SQL-substrate
direction.

## Provisional research (unverified — researcher tier unresolvable in-session)

The findings below are **abstain, tier-floor: unearned confidence**. They cite
primary sources but must be verified by clicking through before scoping work.

<!-- DATA_Q4W8Z2KM_START
- Hister is a private full-text search engine for visited pages/local files
  with web, terminal, and MCP clients — not a tab manager. [source: README.md]
- Storage splits three ways: Bleve indexes for text, gzip content-addressed
  HTML/favicons on disk, SQL (SQLite/Postgres via GORM) for users plus
  query-to-URL counts.
  [sources: server/indexer/indexer.go, server/indexer/datastore.go,
   server/model/history.go]
- Capture via Firefox/Chrome extensions POSTing page HTML, plus crawler,
  history import, file watcher. [sources: server/extension.go, README.md]
- History UX: latest-documents feed, timeline facets, per-query URL ranking
  with pins, filtered full-text search.
  [sources: server/indexer/history.go, server/model/history.go]
- License AGPL-3.0-or-later: direct fork into a Theia extension triggers
  source-offer obligations. [source: LICENSE]
DATA_Q4W8Z2KM_END -->

## Direction

Borrow the protocol (companion extension POSTs page HTML to the store) and the
UX (timeline facets, full-text search, per-query ranking with pins); write a
fresh implementation against our SQL store. Do not fork the code directly
without clearing the AGPL implications.
