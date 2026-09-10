---
title: PBA order of events — steps, postponed items, doc map, phase changes, isolation
date: 2026-09-10
context: gsd-explore follow-on to pba-plugin-shipping-design.md; the seed for the v1.4 PBA milestone intake
---

# Order of events

1. **Dream pass.** One explore session on everything PBA could do. Output: the milestone
   goal and a ranked possibility list. It decides which slice below goes first.
2. **Milestone intake.** New milestone v1.4 PBA in the `pba` workstream: requirements
   (PBA-01 onward, AI-04 restated), the research ledger items from the design note.
3. **Plugin API + chat bridge.** `@powerbrowser/plugin-api`: namespace, streaming chat
   proxy with the citation content type reserved from day one, MCP endpoint handoff, typed
   package, `docs/assistant/ARCHITECTURE.md`. Retire the opencode adapter; keep the token
   gate, the MCP endpoint, the Change Set staging logic.
4. **PBA .vsix skeleton.** Host shim, DSH launcher, registration into Theia's native chat,
   `[[extensions]]` pin, the native-UI button that opens DSH's UI as an in-Theia web tab,
   `docs/assistant/SHIPPING.md`. First end-to-end: chat with DSH inside Power Browser.
5. **Tool catalogue slice 1.** Browser-memory reads over the existing readonly reader plus
   workspace writes. No new permissions. Derived catalogue doc.
6. **Citations end-to-end.** DSH emits, the renderer shows hover sources, a click opens
   the tab through the first chrome-side action tool and the minimal permission model.
7. **Deep research.** Page-driving tools, the full permission model, the untrusted-content
   marker.
8. **Bundled skills and MCPs.** What ships in the bundled tier and which third-party
   servers to include. Plus the `docs/CUSTOMIZE.md` addition. Last.

Power Browser's own tools are infrastructure and arrive with steps 5–7; step 8 is about
how the assistant uses them and what else to bundle.

# Postponed

- **The store beyond a self-hosted Open VSX.** Decided 2026-09-10: self-host Open VSX for
  starters. Anything else (curation, auto-update push) waits. Ties to the release +
  auto-update goal whose update host was unresolved on 2026-09-05.
- **Any GUI beyond Theia's** chat, agent picker, and Change Sets.
- **App-tab tool manifests.** Reserve the provider field; decide the convention when the
  first app tab exists.

# Documentation map (which step writes which doc)

| Document | Kind | Written in |
|---|---|---|
| `.planning/notes/pba-plugin-shipping-design.md` | planning input | done 2026-09-10 |
| `.planning/notes/pba-order-of-events.md` | planning input | done 2026-09-10 |
| `.planning/research/questions.md` entries | planning input | done 2026-09-10 |
| PROJECT.md milestone section + PBA requirements | planning input | step 2 (new-milestone, `--ws pba`) |
| `docs/assistant/ARCHITECTURE.md` | integration | step 3; replaces `docs/ai-opencode-adapter.md` |
| Plugin API reference (derived from the d.ts, verify row) | integration | step 3 |
| `docs/assistant/SHIPPING.md` (build the .vsix, pin, self-hosted Open VSX publish/update) | build and ship | step 4 |
| Tool catalogue (derived from registrations, verify row) | integration | step 5 |
| `docs/CUSTOMIZE.md` addition (user skills/MCPs, updating PBA) | build and ship | step 8 |
| DSH spec | DSH side | lives with DSH, seeded from the plugin API types |

# Phase changes

Applied in the `pba` workstream's own ROADMAP/REQUIREMENTS, not on main, so the 14.1.1
work in the main checkout is never touched. They reach main with the merge.

- Phase 16 — mark superseded by PBA; record the carried assets (token gate, `/mcp`
  endpoint, Change Set staging).
- Phase 999.1 SQL-browser-memory — promote out of backlog: it is the browser-memory
  prerequisite (step 5) and the citation join key (step 6).
- Backlog add: Self-hosted Open VSX registry (postponed store work beyond the first host).
- Backlog add: App-tab tool manifest.
- Backlog add: PBA custom GUI.
- AI-04 — restate: backends are plugins over the Power Browser plugin API.
- New phases for steps 3–8, numbered by the milestone flow.

# Isolation (set up 2026-09-10)

- Workspace: `/home/chris/gsd-workspaces/pba/Power-Browser`, a git worktree on branch
  `workspace/pba` from main at the commit carrying these notes. No space in the path
  (hard rule 4).
- Workstream: `pba` (`.planning/workstreams/pba/`), so STATE/ROADMAP/REQUIREMENTS for PBA
  live apart from main's.
- The worktree has no `upstream/` or `objdir/`: PBA's first steps are Theia-only and the
  sidecar runs standalone on :4000 (see the live-GUI debug loop). Quick checks that read
  a built tree (`desktop-entry-quick`) will not run there; run them on main before merge.
- Resume: open a session in the worktree and run `/gsd-new-milestone v1.4 PBA --ws pba`
  (first time) or `/gsd-resume-work --ws pba` after.
