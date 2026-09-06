# Probe: GUI-09 — dependent-window routing (stock secondary window vs chrome-side fallback)

**Plan:** 14-01, Task 1 (live probe observations)
**Decision this exists for:** Which opener hosts dependent windows in plan 14-03 — the stock
`SecondaryWindowHandler` path (GREEN) or the chrome-side `Services.ww.openWindow` fallback through
the existing boundary file (RED). Gates 14-03's implementation order (RESEARCH Assumptions A1-A5,
Pitfall 1).
**Run:** 2026-09-06 (runs 1-4 below, all same day), host `legion`, Theia pin `1.74.1`
(`theia/applications/browser/package.json:4` version field, `@theia/core` `1.74.1`),
Firefox ESR `153.1.0esr` (`objdir/dist/bin/powerbrowser --version` prints
`DeBIOS powerbrowser 153.1.0esr`, observed this run).
**Binary under test:** `objdir/dist/bin/powerbrowser` (existing build, unrebuilt).
**App under test:** the supervised Theia sidecar the binary launches
(`theia/applications/browser/lib`, rebuilt once this plan — see Build).
**Probe composition (honest):** core + tab-uris + customize + branding + telemetry + token-gate.
`@powerbrowser/chrome-bar` sources are tracked but ABSENT from the running bundle: its
`theia/node_modules/@powerbrowser/chrome-bar` workspace link was never created (last
`yarn install` predates Phase 13), so the app build logs
`Cannot resolve package @powerbrowser/chrome-bar` and ships without it. Pre-existing
install-state drift, not probe-caused; carried as Constraint 1 into Task 2's composition wiring.
The routing question is extension-independent (shell-level `window.open` + stock core service),
so the instrument stands.

Verdict: GREEN — stock `moveWidgetToSecondaryWindow` hosts live terminal and editor widgets in
a real Theia secondary frame; no stock-chrome fallthrough, no popup block, no second IDE frame.
Plan 14-03 builds on the stock secondary-window path; the chrome-side fallback is not taken.

---

## What was changed in the working tree

No shipped-tree change. Scratch lives outside the shipped tree (deviation D-14-01-01: the runner
tool sandbox denies all external-directory writes, so the plan-literal `/tmp` pool path was
unreachable — every creation attempt denied — and the harness plus its file-editor pool lived at
untracked `.tmp-phase14-probe/` instead; same guarantees: outside `theia/` and `scripts/`, never
staged, removed at Task 1 closeout):

1. **`.tmp-phase14-probe/probe-dependent-windows.mjs`** (scratch, removed at closeout) — BiDi
   frontend-walk probe importing (not copying) `scripts/lib/firefox-bidi.mjs`'s `withFirefoxPage`.
   Six page-eval phases per session: ready-gated baseline snapshot; extraction of a live widget
   through `SecondaryWindowHandler.moveWidgetToSecondaryWindow` with stock
   opened/loaded/closed event taps; core geometry roundtrip; the 2x2 close matrix
   (close-dependent vs dispose-hosted, clean terminal vs dirty file editor); restore-order
   functional readback. Returns one JSON document; exit 0 on RED-route data, non-zero only when
   the harness itself cannot observe.
2. **`.tmp-phase14-probe/probe-close-geometry.mjs`** (scratch, removed at closeout) — run-4
   completion script: re-extraction with corrected secondary-ref stashing, secondary geometry
   roundtrip, Q1/Q3/Q4 with re-home observation.
3. **`diag-boot/diag-stdout/diag-head.mjs`** (scratch, removed at closeout) — boot-failure
   diagnostics for the drivelist repair below.
4. **Firefox temp profile** — `withFirefoxPage` creates it under the OS temp dir and removes it
   in a `finally` on every path. Outside the repo; no run touches the developer profile.
5. **One install-state repair inside `theia/node_modules` (documented, bit-identical):**
   `theia/node_modules/drivelist/build/Release/drivelist.node` restored by copying the build's
   own `theia/applications/browser/lib/backend/native/drivelist.node` (sha256 `aa72c26d…7067a`
   both copies). Without it the backend crashes at require time (see Instrumentation note) and
   NO probe can run. No `@theia/*` source touched; invisible to git (see Proofs).
6. **This record** — the only committed artifact of the task.

---

## Build

The lib tree was stale (chrome-bar sources Sep 5 21:39 newer than the app bundle Sep 5 01:52),
so per plan the sidecar was rebuilt in the Nix theia shell only (host shell has no `yarn` by
project rule; `node` works outside):

```
$ nix develop .#theia --command bash -c 'cd theia && yarn build'
$ tsc -b
$ yarn -s rebuild && yarn -s download:plugins && theia build --app-target=browser --mode development
native node modules are already rebuilt for browser
error: missing mandatory 'theiaPlugins' property.
Could not resolve package @powerbrowser/chrome-bar relative to /home/chris/coding/Power-Browser/theia/applications/browser/package.json
[build/browser] Build started
[build/browser] Finished with 0 errors in 2678ms.
[build/node] Build started
[build/node] Finished with 0 errors in 813ms.
Done in 14.98s.
```

Exit code 0. Wall time ~15 s (never a 40-minute Gecko build; Gecko untouched entirely).
The `Cannot resolve package @powerbrowser/chrome-bar` warning is Constraint 1 (missing workspace
link), not a build failure. `node --version` on the host: `v24.19.0`.

---

## Instrumentation note — read this before trusting any routing claim below

Four probe runs; runs 1-3 are superseded method, run 4 completes the matrix. Each misstep is
corrected in place with the reasoning left visible:

- **Boot failure (before run 1):** the first probe invocation timed out at 180 s with the shell
  stuck on `about:blank`. `diag-stdout` captured the shell log: the Theia backend crashed at
  require time with `Error: Cannot find module 'drivelist/build/Release/drivelist.node'`
  (verbatim head in run logs; crash line `theia/applications/browser/lib/backend/main.js:24`
  rethrows the failed require of the inlined `bindings` shim at `main.js:189767-189768`),
  and `theia/node_modules/drivelist/build/` was never compiled in this tree. Fix (Rule 3,
  blocking): copied the build's own `lib/backend/native/drivelist.node` into place; `node -e
  require(...)` prints `DRIVELIST_LOADS_OK`; backend boots. Bit-identical copies (sha256 above);
  no registry package, no source edit. The 13-01 probe predates whatever removed the compiled
  binding; the removal itself is not attributed here.
- **Run 1 (discarded method):** snapshotted at `attached_shell` — main still empty, welcome
  absent — so the routing phase concluded against a widget that did not exist yet. Lesson
  recorded, not retried: snapshot nothing until `FrontendApplicationStateService.state`
  reads `ready` (which implies startContributions + attachShell + initializeLayout/restoreLayout
  ran, `frontend-application.js:59-69`).
- **Run 2 (routing mis-aimed, kept as constraint):** extracted `welcome`. Silent no-op:
  `moveThrew: null`, no secondary, widget unmoved, no new context. Root cause found in run 3
  (below): views are not extractable — `welcome` carries no `isExtractable` field, and the stock
  handler refuses with `logger.error('Widget is not extractable.')` and no throw
  (`secondary-window-handler.js:132-135`). `JSON.stringify` drops `undefined`, which is why the
  field went missing from run-2 output — recorded here so the next reader does not re-chase it.
- **Run 3 (canonical routing + editor, void Q1/Q3):** membership scan first (welcome: field
  absent; t1 terminal: `isExtractable === true`), then t1 extraction GREEN, file-editor open +
  dirty + extraction GREEN. But `window.__probeSecondary` was stashed only on the synchronous
  readback — `widget.secondaryWindow` is assigned in the popup's `load` handler
  (`secondary-window-handler.js:143-151`), so the stash was empty and Q1/Q3 closed nothing
  (`secondaryClosedBefore: 'NOREF'`, `closeCalled: false`). Q2 (dispose-hosted) and all routing
  observations are valid; Q1/Q3 rerun in run 4 with settle-time stashing.
- **Run-3 harness bugs corrected visibly:** `TabUriRegistry.uriOf` returns a URI object, not a
  string (normalized with in-page `.toString()` — hence `uriType: 'object'` beside every
  `view:*`/`terminal:*` string); `monaco` is not a window global (`NO_MONACO_GLOBAL` both
  tries — dirty route switched to a pool-file editor via the URI constructor stolen from a live
  `uriOf()` result); one sync-IIFE-with-`await` SyntaxError and one self-inflicted dropped
  backtick, both fixed before any observation run.
- **Run 4 (matrix completion):** settle-time stash, secondary geometry, Q1/Q3/Q4, restore-order
  re-verification. All green-data or honestly held-out below.
- **Discarded instrument:** none beyond the above — headless BiDi is the read path throughout
  (Xvfb already discarded for cause on this Wayland host per 01-SPIKE-GUI-01.md).

---

## Observation 1 — baseline: ready shell, welcome in main, chrome-bar absent from bundle

**Command:** `node .tmp-phase14-probe/probe-dependent-windows.mjs` (run 3; launch args inside
`withFirefoxPage`: `powerbrowser --headless --profile <tmpdir> --remote-debugging-port=<free>
--remote-allow-hosts 127.0.0.1 --remote-allow-system-access`, empty URL per WINDOWS 14 so the
shell opens alone).

**Seen (verbatim, run-3 baseline core):**

```json
"href": "http://127.0.0.1:36975/", "state": "ready", "tabBars": 4, "chromeBar": null,
"main": [{"id": "welcome", "uri": "view:welcome", "area": "main", "attached": true}],
"bottom": [{"id": "problems", ...}, {"id": "t1", "uri": "terminal:t1", "area": "bottom", "attached": true}]
```

Left holds six view-containers, right holds outline + chat, top holds icon + menubar.
`performance.getEntriesByType('measure')` returns `[]` — the `measure()` helper leaves no
performance entries; ordering evidence stays source-cited + functional (Observation 6).

| Fact | Evidence |
|---|---|
| Fresh shell boots to `ready` with welcome in main | `state: ready`, `welcome` `resolved: main`, `attached: true` (run 2, run 4 restoreOrder verbatim) |
| A live extractable terminal exists without gestures | `t1` → `terminal:t1`, bottom, attached |
| chrome-bar absent from the running bundle | `chromeBar: null` (baseline) + `chromeBarPresent: false` (restoreOrder, runs 2-4) — Constraint 1 |

---

## Observation 2 — membership rule: only `isExtractable === true` widgets move

**Seen (verbatim, run-3 routing membership scan):**

```json
"membership": [
  {"id": "welcome", "present": true, "area": "main", "hasField": false, "value": "absent"},
  {"id": "t1", "present": true, "area": "bottom", "hasField": true, "value": true}
]
```

Stock mechanism (`theia/node_modules/@theia/core/lib/browser/widgets/extractable-widget.js:23`):
`widget instanceof Widget && 'isExtractable' in widget && widget.isExtractable === true`.
Setters in-tree: `editor-widget.js:27` (`this.isExtractable = true`), terminal impl, chat-view.
The ChatView precedent pins IDE-frame widgets non-extractable; 14-03 inverts the membership for
exactly the tab-content kinds (Pattern §4) — the rule above is the live proof the gate exists.

---

## Observation 3 — routing (terminal): stock secondary frame hosts the live widget

**Command:** same probe invocation (routing phase: subscribe opened/loaded/closed, then
`SecondaryWindowHandler.moveWidgetToSecondaryWindow(t1)`).

**Seen (verbatim, run-3 routingSettled + contextsAfterExtract):**

```json
"widgetSettled": {"id": "t1", "uri": "terminal:t1", "area": "secondaryWindow", "attached": true},
"hasSecondaryWindow": true,
"secondaryHref": "http://127.0.0.1:43373/secondary-window.html",
"secondaryClosed": false,
"widgetHostPresent": true, "widgetHostChildren": 1,
"widgetHostText": "bash  Follow link (ctrl + click)WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.xterm-dom-renderer-owner-1 .xterm-rows span {...",
"secondaryTitle": "bash — Welcome - PowerBrowser",
"events": [{"ev": "opened", ...}, {"ev": "loaded", ...}]
```

```json
"contextsAfterExtract": [
  {"context": "5327ac4a-...", "url": "http://127.0.0.1:43373/"},
  {"context": "0d703976-...", "url": "http://127.0.0.1:43373/secondary-window.html"}
]
```

| Fact | Evidence |
|---|---|
| A dependent opens through the stock path | `opened` + `loaded` events; a NEW top-level context carrying `secondary-window.html` (same backend origin — not stock chrome, not `about:blank`) |
| The widget moves, live, into the bare dock | `area: secondaryWindow`, `attached: true`; `widget-host` present with 1 child holding live xterm content |
| Window title follows the stock contract | `bash — Welcome - PowerBrowser` (`widget.title.label — document.title`, `secondary-window-handler.js:145-148`) |
| No popup block, no throw | `moveThrew: null`; handler never reached its `messageService.error` null-window branch |

Run 4 re-confirmed independently (new port `45491`, fresh `opened`/`loaded` pair).

---

## Observation 4 — routing (editor, dirty): same stock path, dirty marker in the title

File-editor pool opened via the `file:` URI (`editor-preview-widget` opener id verbatim);
`textEditorModel.setValue` dirtied it (`saveableDirty: true`, `editorDocDirty: true`,
`titleClass: " theia-mod-dirty"` — all verbatim). Extraction:

```json
"widgetSettled": {"id": "code-editor-opener:file:///home/chris/coding/Power-Browser/.tmp-phase14-probe/pool/dirty.txt:5928472480984483",
  "uri": "undefined", "uriType": "null", "area": "secondaryWindow", "attached": true},
"secondaryHref": "http://127.0.0.1:45491/secondary-window.html",
"widgetHostPresent": true, "widgetHostChildren": 1,
"widgetHostText": "dirty.txt  home  chris  coding  Power-Browser  .tmp-phase14-probe  pool  dirty.txt123probe seed line// probe-dirty",
"secondaryTitle": "dirty.txt — ● dirty.txt - PowerBrowser"
```

A second fresh context carried `secondary-window.html`; `opened`+`loaded` fired again. The `●`
dirty marker rides into the dependent title. **Constraint 2:** `TabUriRegistry.uriOf` returns
`undefined` for file editors (`uri: "undefined"`, `uriType: "null"`) — the registry covers
view/terminal/settings widgets only, so setup tab-placement for file tabs needs another identity
(14-02/14-03 bridge input, not a verdict blocker).

---

## Observation 5 — geometry: moveTo/resizeTo are silently ignored headless

**Seen (verbatim, run-4 geometry phase):**

```json
"secondaryBefore": {"x": 0, "y": 20, "w": 1229, "h": 691},
"moveThrew": null, "resizeThrew": null,
"secondaryAfter": {"x": 0, "y": 20, "w": 1229, "h": 691},
"coreBefore": {"x": 0, "y": 0, "w": 1280, "h": 768},
"coreMoveThrew": null, "coreResizeThrew": null,
"coreAfter": {"x": 0, "y": 0, "w": 1280, "h": 768}
```

`sec.moveTo(420, 190)` + `sec.resizeTo(700, 500)` and the core `moveTo(120, 90)` +
`resizeTo(1100, 750)` all no-throw, all no-effect. A2 answer: the permission model is
headless-unprovable (no window manager to honor placement); UI-SPEC's verbatim-restore +
clamp-backstop contract stands unchanged, and a headed session must confirm placement before
14-03 relies on it. No evidence of a permission denial — only of headless no-op.

---

## Observation 6 — close matrix: dependents close cleanly, widgets re-home, dirty is saved

Matrix definition (shared-model reading, stated plainly): close-dependent = `secondary.close()`
(window destroyed, model must survive); close-in-core = `widget.dispose()` while hosted (model
destroyed, window fate observed). All cells verbatim from run 4 (Q2 clean-dispose from run 3):

| Cell | Action | Observed |
|---|---|---|
| Q1 clean x close-dependent | `sec.close()` on hosted t1 | t1 back in `bottom`, attached; secondary `closed: true`; context gone; single `closed` event |
| Q2 clean x dispose-hosted | `t1.dispose()` while hosted (run 3) | `disposed: true`; secondary `closed: true`, `href: ""`, host emptied (`hostText: ""`); context gone |
| Q3 dirty x close-dependent | `sec.close()` on hosted dirty editor | editor back in `main`, attached; secondary closed, context gone; **`widgetSaveableDirty: false`** — the dirty content reached disk (pool file holds `// probe-dirty` verbatim) |
| Q4 dirty x dispose-hosted | re-extract, then `widget.dispose()` | `disposed: true`; `widgetInShell: false`; secondary closed, context gone; title retained without the `●` marker |

| Fact | Evidence |
|---|---|
| Closing a dependent destroys nothing | Q1/Q3: widget re-homed to its `previousArea` (bottom/main respectively), attached, contexts back to exactly the pre-extract set |
| Disposing a hosted widget closes its dependent | Q2/Q4: `closed: true`, context removed — no stranded blank frame in the dispose path |
| Dirty content is preserved across dependent close | Q3: disk holds the dirty line; re-homed widget clean. Mechanism (save-on-close vs autoSave) not isolated — 14-03 must not assume unsaved-dirty survives as dirty |
| Double-`closed` variance (run 3 Q2: two `closed` events 3 ms apart; run 4: single) | pasted in run logs; 14-03 close handling must be idempotent |

---

## Observation 7 — restore order: contributions before layout, functionally confirmed

Static (source-cited, pasted): `frontend-application.js:59-69` awaits `startContributions()`
(all `onStart`) before `attachShell()` + `initializeLayout()`; `shell-layout-restorer.js:148`
logs `>>> Restoring the layout state...` inside the post-attach restore. Live functional
corroboration (verbatim, run-4 restoreOrder): `appState: "ready"`, `welcome` in main attached,
tab-uris contribution resolvable (`tabUrisExtPresent: true` runs 2-3). The exact temporal log
line is not capturable post-hoc headless (console history unavailable to a late-attaching BiDi
client) — stated, not smuggled: ordering stands on the cited sequence + the ready-state
implication, matching A5's already-read status in RESEARCH.

A3 static (seconds, seconds to re-verify): the built
`theia/applications/browser/lib/frontend/secondary-window.html` is a bare dock — `widget-host`
div, one stylesheet link, no chrome bar, no toggle, no panels, no status bar, no strip — matching
the dependent content contract structurally.

---

## Constraints found (neither predicted nor blocking the GREEN route)

1. **chrome-bar workspace link missing** (see header): `@powerbrowser/chrome-bar` absent from the
   running bundle. Pre-existing install-state drift; Task 2 must realign (`yarn install` links
   the new modes package anyway) and re-verify composition. The routing verdict is
   extension-independent.
2. **`user-storage:` URIs do not open in editors**: `getOpener` resolves (`editor-preview-widget`)
   but `open('user-storage:/user/settings.json')` throws `'...' is invalid` (both tries verbatim).
   Modes/setups JSON must travel via FileService (customize precedent), never the opener — input
   to 14-02's persistence tasks.
3. **`uriOf` gap for file editors** (Observation 4): setup tab-placement cannot key file tabs off
   the registry alone — 14-02/14-03 bridge input.
4. **Core-diff instrument needs install-state realignment** (see Proofs): same stage-1 signature
   as 13-SPIKE constraint 5. Pre-existing drift, not probe-caused; blocks no GREEN here because
   the routing instrument is BiDi contexts, not the diff — stated explicitly so no future reader
   mistakes this GREEN for a zero-core proof.
5. **Geometry + focused-tab focus are headed-held-out** (Observation 5; focus never sticks
   headless per 13-SPIKE constraint 3, re-observed: selection reads stayed null throughout).

## Summary table — one row per probe question

| Probe question | Answer |
|---|---|
| Does `moveWidgetToSecondaryWindow` open a working Theia secondary frame (vs stock-chrome fallthrough / popup block)? | YES — terminal and dirty editor both hosted with live content, correct titles, fresh `secondary-window.html` contexts (Obs 3-4) |
| Is zero Theia-core modification proven by the ratified instrument? | NO (this run) — `diff-theia-core.sh --quick` red on pre-existing install-state drift; file-tampering evidence: none (see Proofs). Does not block the routing verdict; recorded as Constraint 4 |
| Is tab identity preserved across extract / re-home? | YES — per-widget URI equality (`terminal:t1` throughout), `previousArea` re-home, attached throughout; editors keyed by widget id given Constraint 3 |
| Is geometry placeable via moveTo/resizeTo? | UNPROVEN headless (silent no-op, no denial) — headed confirmation required; verbatim-restore contract unchanged |
| Does the close matrix lose data? | NO OBSERVED LOSS — dependents close to re-home; dispose closes the dependent; dirty content reaches disk (Obs 6) |
| Does layout restore follow contributions? | YES functionally (`ready` + welcome homed + contributions resolvable; log line source-cited) |
| **Routing** | **GREEN → plan 14-03 builds dependents on the stock secondary-window path. No chrome-side opener, no catalogue amendment, no new patch.** |

## Artefacts

Probe harness (`.tmp-phase14-probe/probe-*.mjs`, `diag-*.mjs`, `evidence*.json`, `probe-run*.log`,
`pool/`) was scratch, never staged, never committed, and is removed at closeout
(`test ! -e` on the scratch path post-removal; verify step asserts nothing staged under
`theia/` or `scripts/`). The deciding evidence is pasted verbatim in Observations 1-7; that
paste-out is why removal loses nothing. The committed artefacts of this task are this record
and its commit. Verdict is a decision artifact, not user-facing copy — no UI-SPEC copy rules
apply to it.

## Correction

Run 1's attached_shell snapshot, run 2's welcome-extraction mis-aim (views are not
extractable), run 3's NOREF Q1/Q3 (secondaryWindow assigned on popup load, not synchronously),
and the sync-IIFE/dropped-backtick harness syntax errors are each corrected in place above with
the reasoning visible; no observation was rewritten to hide a misstep. Run 2's missing
`isExtractable` field is a `JSON.stringify`-drops-`undefined` artifact, named so it is not
re-investigated.

## Ratification

| Gate question | Answer |
|---|---|
| Land the chrome-side opener fallback in 14-03? | NO — GREEN routes 14-03 to the stock secondary-window path |
| Catalogue amendment / new patch for dependents? | NO — zero chrome-side changes; `INTERNAL-APIS.md` untouched |
| Constraints binding 14-02/14-03 | 1-5 above (composition realignment, FileService-only JSON, file-tab identity, diff-instrument drift, headed geometry/focus proof) |
| Guard | This record's `Verdict: GREEN` line routes 14-03; any re-probe writes a new record in the same commit discipline |

## Proofs

Zero core modification — `diff-theia-core.sh` output pasted (RED, cause named; pre-existing
install-state drift, same stage-1 signature as 13-SPIKE — this probe's GREEN does not rest on
it, see Constraint 4). Routed through the Nix theia shell per project rule:

```
$ nix develop .#theia --command bash scripts/diff-theia-core.sh --quick
diff-theia-core: stage 1 -- yarn check --integrity
yarn check v1.22.22
warning Integrity check: Flags don't match
error Integrity check failed
error Found 1 errors.
diff-theia-core: FAIL -- yarn check --integrity reported a mismatch (see output above)
```

Read-only diagnostic (no install per the probe-install bar): `yarn check --integrity` reports
`Top level patterns don't match` — the installed `node_modules` predates the tracked manifests
(chrome-bar workspace member unlinked). Diagnosis: install-state drift, not observed tampering —
corroborated by (a) zero tracked modifications under `theia/`/`scripts/` (see below), (b) the
only `theia/` write this plan being the bit-identical drivelist binding restore (sha256
`aa72c26d1690cd7cbcfc1762d00b2a5822ae7ad09cb838faff1a04b13e7067a9` both copies) plus `tsc -b`
outputs under `theia/*/lib` and the `theia build` outputs under
`theia/applications/browser/lib` (build outputs, gitignored, not `@theia/*`).

No Gecko touch:

```
$ git -C upstream diff --quiet && echo UPSTREAM_DIFF_EMPTY
UPSTREAM_DIFF_EMPTY
```

Shipped tree clean (no tracked modification under `theia/` or `scripts/` from this plan;
`??` untracked excluded per plan):

```
$ git status --porcelain theia/ scripts/ | grep -v '^??' | test $(wc -l) -eq 0 && echo SHIPPED_TREE_CLEAN
SHIPPED_TREE_CLEAN
```

Scratch removed at closeout; no `/tmp` path was ever created (sandbox denies external writes —
see D-14-01-01 in What-changed; removal asserted in the task verify).
