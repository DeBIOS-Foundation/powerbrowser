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
**Verdict: RED** — relocation mechanics proven live (6/6 moves resolve as
requested, identity preserved), but the zero-core-modification pillar is
unprovable by its ratified instrument: `diff-theia-core.sh --quick` is red on
pre-existing install-state drift (cause below), so the GUI-07 entry criterion
is not met. Fallback: strip stays top per Variant A; modes still ship.
Re-probe path is cheap (realign `node_modules`, re-run check + probe).

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

---

## Edge observations (Task 2): what separates a green move from a red one

### Requested-versus-resolved: no silent veto in either direction

Every `addWidget` call in the probe was followed by a `getAreaFor` readback
of the RESOLVED area, never the requested one (Pitfall 6 discipline). Verbatim
return-leg rows (PHASE3-MOVEBACK):

```json
"moves": [
  {"id": "welcome", "uriBefore": "view:welcome", "uriAfter": "view:welcome",
   "requested": "main", "resolved": "main", "sameInstance": true, "attached": true},
  {"id": "settings_widget", "uriBefore": "settings:", "uriAfter": "settings:",
   "requested": "main", "resolved": "main", "sameInstance": true, "attached": true},
  {"id": "keybindings.view.widget",
   "uriBefore": "view:keybindings.view.widget", "uriAfter": "view:keybindings.view.widget",
   "requested": "main", "resolved": "main", "sameInstance": true, "attached": true}
],
"selBefore": null, "selAfter": null
```

Return-leg main (verbatim): `welcome`, `keybindings.view.widget`,
`settings_widget` — all `resolved: main`, `attached: true`; bottom restored
to exactly `problems` + `t1`. Score across both legs: 6 requested, 6 resolved
as requested, 0 vetoes. A `WidgetAreaResolver` override forcing any widget
back into `main` would have been recorded as RED data with its cause, never a
silent pass (T-13-01-04) — none occurred.

### Move-back proves no one-way trip

The full main strip (`main: []` after the outbound leg) returned to `main`
with per-widget URI identity (`uriBefore` == `uriAfter` on all three return
rows) and instance identity (`sameInstance: true`). Relocation is reversible
through the same public call.

### Selection-versus-activation nuance

`currentWidget`/`activeWidget` were `null` before, during, and after every
leg. The pre-move `activateWidget('welcome')` resolved without error yet
moved neither pointer — in headless BiDi there is no focused window for focus
to stick to. Correction stated plainly: this probe proves selection is never
CLOBBERED (null preserved across 6 moves; nothing stole or dropped a
selection because none existed), not that a focused tab keeps focus across a
move. A focused-tab-keeps-focus assertion needs a headed session with real
activation and is Phase 14 scope if Phase 14 wants it; it is not claimed here.

### Ordering and focus constraints found

- **Ordering:** moved widgets append after existing bottom widgets in move
  order (`problems`, `keybindings.view.widget`, `settings_widget`, `welcome`,
  `t1`). Re-adding preserves relative move order but does not preserve the
  original main order against pre-existing bottom content — Phase 14 must set
  tab order explicitly if mode switches demand a specific strip sequence.
- **Focus:** no focus assertions are possible headless (see nuance above).
  Not a blocker: the spike question is relocation mechanics, and focus
  behavior ships with Phase 14's headed verification.

### Geometry sanity and overflow: held-out visual checks (backstop)

Zero/one/many-tab geometry in the relocated region and many-tab overflow
behavior cannot be observed headless — there is no rendered strip to inspect,
only the widget model. Per the plan they are stated as held-out checks,
never silent passes:

- backstop: zero, one, and many tabs keep strip geometry sane in the
  relocated region, matching top-region behaviour — held-out visual check,
  no explicit evidence in this probe.
- backstop: many-tab overflow in the relocated region scrolls rather than
  clipping or wrapping — held-out visual check, no explicit evidence in this
  probe.

### Live-move-only boundary

This spike asserts the LIVE move only. Persistence across reload (layout
restorer round-trip of relocated widgets) is Phase 14 scope: no observation
above asserts post-reload geometry, and none is smuggled into the verdict.

### The tabs invariant (holds in every outcome, including the fallback)

No tab closed, no window moved on, nothing detached — by any leg of this
probe or any reading of its verdict. Evidence: full-universe URI sets
byte-identical before/after (`uriSetEqual: true`, 13 URIs), `attached: true`
on every touched widget, `idCounts` all `1`, and the return leg restoring the
exact baseline layout (main 3, bottom 2, left 6, right 2). Under a RED verdict
the same invariant holds trivially stronger: nothing moves at all and the
strip stays top per Variant A.

---

## Constraints found (neither predicted nor blocking the fallback)

1. **Side views do not populate main.** View-container opens land in their
   contributions' default side areas; only editor-like views (`welcome`,
   `settings:`, keybindings) open as main-area tabs. Phase 14's Variant-B
   strip work must reckon with which widgets can actually live in the strip.
2. **Moved widgets append after existing bottom content in move order** (see
   edge section). A mode switch that demands a specific strip sequence must
   set tab order explicitly.
3. **Focus does not stick headless.** `activateWidget` resolves but
   `currentWidget`/`activeWidget` stay `null` over BiDi headless. A
   focused-tab-keeps-focus claim needs a headed session; unproven here.
4. **Geometry/overflow are held-out backstop checks** (see edge section) —
   unobservable without a rendered strip.
5. **Core-diff instrument needs install-state realignment** (see proofs).
   Pre-existing drift, not probe-caused; blocks any GREEN until fixed.

## Summary table — one row per spike question

| Spike question | Answer |
|---|---|
| Does a live strip move shell areas through public `ApplicationShell` API only? | YES — 3/3 main→bottom + 3/3 bottom→main, same instances, `{area}` option only, no core patch, no rebind, no panel surgery |
| Is zero Theia-core modification proven by the ratified instrument? | NO (this run) — `diff-theia-core.sh --quick` exits 1 on pre-existing install-state drift; file-tampering evidence: none, but the instrument cannot go green as run. Blocking cause, named below. |
| Is tab identity preserved across the move? | YES — per-widget `uriOf` equality, full-universe set equality (13/13), instance identity, no duplicates; selection intact-vacuous with cause named |
| **Routing** | **RED → Variant-A fallback: strip stays top, modes still ship (Phase 14). Relocation mechanics banked above for a cheap re-probe after realignment.** |

## Artefacts

Probe harness (`.tmp-phase13-spike/probe-strip-move.mjs`, `evidence.json`,
`probe-run*.log`) was scratch, never staged, never committed, and is removed
at closeout (`test ! -e` on the scratch path post-removal). The deciding
evidence is pasted verbatim in Observations 1–2 and the edge section above;
that paste-out is why removal loses nothing. The committed artefacts of this
plan are this record and the Task/SUMMARY commits. Verdict is a decision
artifact, not user-facing copy — no UI-SPEC copy rules apply to it.

## Correction

Run 2's `uriSetEqual: false` was a harness comparison bug (main-only-before
vs all-areas-after), corrected by run 3's full-universe comparison (`true`,
13/13 byte-identical). The misreading is corrected in place here with the
reasoning visible; no observation was rewritten to hide it.

## Ratification

| Gate question | Answer |
|---|---|
| Land as spiked (Variant B strip work in Phase 14)? | NO — entry criterion not met: zero-core pillar unproven by its instrument |
| Fallback taken? | YES — Variant A: strip stays top; modes still ship in Phase 14 |
| Constraints binding Phase 14 | 1–4 above (strip population, explicit tab order, headed focus proof if wanted, geometry/overflow backstop checks) plus 5 (realign install state, then the cheap re-probe can reopen Variant B) |
| Guard | Plan 13-02's gui07 verdict-registry row parses this record's `Verdict: RED` line and routes Phase 14 to Variant A |

## Proofs

Zero core modification — `diff-theia-core.sh` output pasted (RED, cause
named; this is the blocking cause, not a silent pass). Routed through the
Nix theia shell per project rule (host shell has no `yarn`):

```
$ nix develop .#theia --command bash scripts/diff-theia-core.sh --quick
diff-theia-core: stage 1 -- yarn check --integrity
yarn check v1.22.22
warning Integrity check: Flags don't match
error Integrity check failed
error Found 1 errors.
diff-theia-core: FAIL -- yarn check --integrity reported a mismatch (see output above)
```

Exit 1. One fix-and-retry diagnostic (read-only, no install per T-13-01-SC),
run from `theia/`:

```
$ nix develop .#theia --command bash -c 'yarn check --integrity'
yarn check v1.22.22
warning Integrity check: Top level patterns don't match
error Integrity check failed
```

Cause (pre-existing, predates this plan — no plan action writes under
`theia/node_modules`): the installed `node_modules` (`.yarn-integrity`
flags `[]`, written 2026-09-05) no longer matches the current manifests
(`theia/yarn.lock` last committed in 12-02 `1b7bf88`; check demands
`--ignore-scripts` echo + top-level pattern agreement). Diagnosis: install-
state drift, not observed tampering — corroborated by (a) zero tracked
modifications under `theia/`/`scripts/` (see below), (b) no `@theia/*` file
newer than the install (nothing written during the 2026-09-06 probe window),
(c) the probe's only file writes being this record, scratch harness/logs,
and `tsc -b` outputs under `theia/extensions/tab-uris/lib` (build outputs,
not `@theia/*`). Repair (reinstall per `docs/BUILD.md` flags, then re-probe)
is out of scope: T-13-01-SC forbids package-manager installs in this plan,
and reinstalling would prove a different tree than the one probed.

No Gecko touch:

```
$ git -C upstream diff --quiet && echo UPSTREAM_DIFF_EMPTY
UPSTREAM_DIFF_EMPTY
```

Shipped tree clean (no tracked modification under `theia/` or `scripts/`
from this plan; `??` untracked excluded per plan):

```
$ git status --porcelain theia/ scripts/ | grep -v '^??' | test $(wc -l) -eq 0 && echo SHIPPED_TREE_CLEAN
SHIPPED_TREE_CLEAN
```

Scratch removed at closeout; the plan-literal `/tmp/phase13-spike` path was
never created (runner tool sandbox denies all external-directory writes —
see D-13-01-01 in What-changed; the actual scratch path removal is asserted
in the Task 3 verify).
