# Spike: GUI-07 — strip relocation between Theia shell areas

**Plan:** 13-01, Task 1 (live probe observations)
**Decision this exists for:** GUI-07 entry criterion — prove a live tab strip
moves Theia shell areas without forking Theia core (green routes Phase 14 to
Variant B strip work; red keeps the strip top per Variant A and modes still
ship). Sketch 002 winner B is PENDING this verdict by committed direction.
**Run:** 2026-09-06, host `legion`, Theia pin `1.74.1`
(`theia/applications/browser/package.json:4` version field, `@theia/core`
`1.74.1` at line 59), Firefox ESR `153.1.0esr`
(`objdir/dist/bin/powerbrowser --version` prints
`DeBIOS powerbrowser 153.1.0esr`, observed this run).
**Binary under test:** `objdir/dist/bin/powerbrowser` (existing build, unrebuilt).
**App under test:** the supervised Theia sidecar the binary launches
(`theia/applications/browser/lib`, reused as built).
**Verdict:** TBD in Task 3 (observations below are the evidence it will cite).

---

## What was changed in the working tree

No shipped-tree change. The probe's only artifact is scratch scaffolding
outside the shipped tree (deviation D-13-01-01: the runner tool sandbox
denies all external-directory writes, so the plan-literal `/tmp/phase13-spike`
was unreachable — every creation attempt denied — and the harness lived at
untracked `.tmp-phase13-spike/` instead; same guarantees: outside `theia/` and
`scripts/`, never staged, removed at Task 3 closeout):

1. **`.tmp-phase13-spike/probe-strip-move.mjs`** (scratch, removed Task 3) —
   BiDi frontend-walk probe importing (not copying)
   `scripts/lib/firefox-bidi.mjs`'s `withFirefoxPage`. Three page-eval phases:
   baseline snapshot + native-path view opens; main-to-bottom moves by
   re-adding the SAME widget instances with `{area:'bottom'}` only (no widget
   created, nothing rebound, no panel internals touched); move-back to main.
   Identity oracle per move: `TabUriRegistry.uriOf` before/after,
   `ApplicationShell.getAreaFor` resolved readback, `getWidgetById` instance
   identity, full-area URI-set equality, `currentWidget`/`activeWidget`
   before/after.
2. **Firefox temp profile** — `withFirefoxPage` creates it under the OS temp
   dir and removes it in a `finally` on every path (success, assertion throw,
   SIGINT). Outside the repo and outside any home directory; no run touches
   the developer profile (T-13-01-01).
3. **This record** — the only committed artifact of the plan.

`test ! -e theia/extensions/chrome-bar` holds: no extension was scaffolded.

---

## Build

Existing built app reused rather than rebuilt, per plan. One build-state
proof inside the Nix theia shell only (host shell has no `yarn` by project
rule; `node` works outside):

```
$ nix develop .#theia --command bash -c 'yarn --cwd extensions/tab-uris build'
warning: Git tree '/home/chris/coding/Power-Browser' is dirty
PowerBrowser theia shell ready. Next: cd theia && yarn install && yarn build && yarn start
1.22.22
yarn run v1.22.22
$ tsc -b
Done in 1.69s.
```

Exit code 0. Wall time ~3 s (`tsc -b` incremental no-op in 1.69 s), i.e. the
tree was already built — no rebuild, seconds-scale as the plan budgets (never
a 40-minute Gecko build; Gecko untouched entirely). Compiled
`theia/extensions/tab-uris/lib/browser/tab-uri-registry.js` present.
`node --version` on the host: `v24.19.0`.

---

## Instrumentation note — read this before trusting any URI-set claim below

Three probe runs; runs 1–2 are superseded method, run 3 is canonical. Each
misstep is corrected in place with the reasoning left visible:

- **Run 1 (discarded method, kept as constraint):** opened
  `view:welcome`, `view:explorer-view-container`,
  `view:search-view-container` through `OpenerService`. Only `welcome`
  landed in `main`; the two view-containers landed in `left` (their
  contributions' default areas). Main held a single uri-bearing widget, below
  the 2–3 the plan requires. Lesson recorded, not retried: side-container
  views do not populate `main` — editor-like views do.
- **Run 2 (complete but miscompared):** opened `settings:` and
  `view:keybindings.view.widget`, both landed in `main` (3 movable widgets);
  all moves resolved as requested with per-widget URI identity. But its
  `uriSetEqual` compared main-only-before against all-areas-after and
  reported `false` on identical universes — a harness comparison bug, never a
  probe finding. Corrected in run 3 by comparing full-area sets on both sides.
- **Run 3 (canonical):** run-2 candidates plus a pre-move
  `shell.activateWidget('welcome')` to make the selection evidence
  non-vacuous. Headless focus did not stick (`current`/`active` stayed
  `null`) — recorded verbatim in Observation 2; the selection claim below is
  intact-but-vacuous with its cause named, not inflated.
- **Discarded instrument:** none beyond the above — no Xvfb window counting
  was attempted (01-SPIKE-GUI-01.md already discarded it for cause on this
  Wayland host; headless BiDi is the read path throughout).

---

## Observation 1 — baseline: main holds one widget; side views do not populate main

**Command:**
`node .tmp-phase13-spike/probe-strip-move.mjs` (run 3; launch args inside
`withFirefoxPage`: `powerbrowser --headless --profile <tmpdir> --remote-debugging-port=<free> --remote-allow-hosts 127.0.0.1 --remote-allow-system-access`, empty URL per WINDOWS 14 so the shell opens alone).

**Seen (verbatim, PHASE1-BASELINE core):**

```json
"mainsBefore": [{"id": "welcome", "uri": "view:welcome"}],
"opened": [
  {"candidate": "settings:", "widgetId": "settings_widget", "attached": true},
  {"candidate": "view:keybindings.view.widget", "widgetId": "keybindings.view.widget", "attached": true}
],
"currentWidget": null, "activeWidget": null, "currentTabArea": null, "tabBars": 4
```

Main after opens (verbatim snapshot rows):

```json
"main": [
  {"id": "welcome", "uri": "view:welcome", "resolved": "main", "attached": true},
  {"id": "settings_widget", "uri": "settings:", "resolved": "main", "attached": true},
  {"id": "keybindings.view.widget", "uri": "view:keybindings.view.widget", "resolved": "main", "attached": true}
]
```

| Fact | Evidence |
|---|---|
| Fresh shell opens with exactly one main-area widget | `mainsBefore` is `[{"id":"welcome","uri":"view:welcome"}]` — the branding welcome view (its contribution pins `area: 'main'`) |
| Side-container views never enter main through the native open path | run 1: `explorer-view-container` and `search-view-container` resolved to `left` (run-3 snapshot still shows all six side views in `left`, two in `right`) |
| `settings:` and keybindings open as main-area tabs with registry URIs | `settings_widget` → `settings:`, `keybindings.view.widget` → `view:keybindings.view.widget`, both `resolved: main`, `attached: true` |
| No selection exists to preserve yet | `currentWidget`, `activeWidget`, `currentTabArea` all `null` — nothing focused in a headless launch with no gestures |
| Every widget id is unique across all areas | `idCounts` — all 13 entries `1` (full map in run-3 `evidence.json`) |

---

## Observation 2 — moves: three live main-area widgets re-added to bottom, identity preserved

**Command:** same probe invocation (PHASE2-MOVE page-eval: for each of
`["welcome", "settings_widget", "keybindings.view.widget"]`,
`await shell.addWidget(shell.getWidgetById(id), {area: 'bottom'})` — same
instance, area option only).

**Seen (verbatim moves array):**

```json
"moves": [
  {"id": "welcome", "uriBefore": "view:welcome", "areaBefore": "main",
   "requested": "bottom", "resolved": "bottom",
   "uriAfter": "view:welcome", "sameInstance": true, "attached": true},
  {"id": "settings_widget", "uriBefore": "settings:", "areaBefore": "main",
   "requested": "bottom", "resolved": "bottom",
   "uriAfter": "settings:", "sameInstance": true, "attached": true},
  {"id": "keybindings.view.widget", "uriBefore": "view:keybindings.view.widget", "areaBefore": "main",
   "requested": "bottom", "resolved": "bottom",
   "uriAfter": "view:keybindings.view.widget", "sameInstance": true, "attached": true}
],
"activated": {"id": "welcome", "current": null, "active": null},
"selBefore": null, "selAfter": null, "actBefore": null, "actAfter": null,
"urisBefore": ["settings:", "terminal:t1", "view:chat-view-widget", "view:debug",
  "view:explorer-view-container", "view:keybindings.view.widget", "view:outline-view",
  "view:problems", "view:scm-view-container", "view:search-view-container",
  "view:test-view-container", "view:vsx-extensions-view-container", "view:welcome"],
"urisAfterAll": ["settings:", "terminal:t1", "view:chat-view-widget", "view:debug",
  "view:explorer-view-container", "view:keybindings.view.widget", "view:outline-view",
  "view:problems", "view:scm-view-container", "view:search-view-container",
  "view:test-view-container", "view:vsx-extensions-view-container", "view:welcome"],
"uriSetEqual": true
```

Post-move bottom (verbatim): `problems`, `keybindings.view.widget`,
`settings_widget`, `welcome`, `t1` — all `resolved: bottom`,
`attached: true`; `main: []` — the whole main strip relocated, nothing left
behind. `idCounts` all `1`: no duplicate widget id anywhere.

| Fact | Evidence |
|---|---|
| No resolver veto on any move | `requested: bottom` → `resolved: bottom` on all three (a forced placement back into `main` would be RED data per T-13-01-04; none occurred) |
| Tab identity survives: same registry URIs | `uriBefore` == `uriAfter` per widget AND full-universe `uriSetEqual: true` (13 URIs, sorted, byte-identical) |
| No widget recreated, no duplicate | `sameInstance: true` (`getWidgetById` returns the moved instance), `idCounts` all `1` |
| Selection intact (vacuous, cause named) | `selBefore`/`selAfter`/`actBefore`/`actAfter` all `null`; pre-move `activateWidget('welcome')` resolved yet `current`/`active` stayed `null` — headless focus does not stick, so no selection existed to lose. Not inflated into a focus-preservation claim. |
| Move is live and attached | `attached: true` on every moved widget after the move |

---

## Observation 3 — move-back: relocation is not a one-way trip (held for Task 2 edge section)

PHASE3-MOVEBACK ran in the same probe invocation; its verdict-relevant rows
(requested-versus-resolved readback on the return leg, selection nuance) are
recorded in the Task 2 edge-observations extension, not rewritten here.
