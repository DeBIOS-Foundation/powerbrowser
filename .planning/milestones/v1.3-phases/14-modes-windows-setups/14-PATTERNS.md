# Phase 14: Modes + Windows & Setups — Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 6 pattern areas (mode host, layout idioms, persistence, dependent windows, gates, spike idiom)
**Analogs found:** 6 / 6 (all git-tracked; verified via `git ls-files`)

All analog paths below are git-TRACKED source (checked with `git ls-files`).
No mirror/untracked paths are named.

**Binding constraint (13-01 RED verdict, see §6):** the strip STAYS TOP in all
modes (Variant-A fallback). No Phase-14 work relocates the strip, moves widgets
between shell areas per mode, or re-probes relocation silently. Modes reshape
**panel visibility + main-area view only**.

---

## 1. chrome-bar extension — the host analog for mode toggle + status-bar chip + commands

**Closest analogs (all tracked):**

- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` (372 lines) — widget + toggle + chip (copy this)
- `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts` — command-per-action model (copy this)
- `theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts` — keybinding idiom (copy this)
- `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` — static-bind composition (copy this)
- `theia/extensions/chrome-bar/src/browser/chrome-bar.css` — single-`@layer` style sheet (copy this)

### What to copy

**Mode toggle (from `chrome-bar-widget.tsx` lines 59–60, 236–249, 339–351):**

```tsx
/** The three shipped mode defaults, in contracted order. */
static readonly MODES = ['Coding', 'Browsing', 'Organising'];
// ...
protected selectMode = (next: string) => (): void => {
    if (this.mode === next) { return; }
    const before = this.countTabs();
    this.mode = next;
    const after = this.countTabs();
    if (before !== after) {
        console.error(
            `[@powerbrowser/chrome-bar] tabs invariant broken by a mode switch: ${before} tabs before, ${after} after`
        );
    }
    this.publishTabCount();
};
// render: div.pb-chrome-bar-toggle[role=group][aria-label=Mode] > button.pb-chrome-bar-segment
//   .is-active + aria-pressed on the selected segment; segments keep fixed 96px width,
//   custom-mode names truncate with ellipsis + title tooltip (14-UI-SPEC).
```

- Phase 14 extends this: shipped `MODES` literal stays the fallback behind
  custom modes; custom modes append menu rows (same `.is-active` + 600 idiom),
  never mutate a shipped default in place. Toggle remains **selection state
  only**; shell consequences (panel visibility) are applied by the mode service
  beside it, never inside the click handler's render path.
- Corrupt custom-mode data falls back to shipped Browsing + the contracted
  fallback notice (14-UI-SPEC copy); never a blank shell.

**Tab-count chip (from `chrome-bar-widget.tsx` lines 216–234):**

```tsx
protected countTabs(): number {
    return this.shell.allTabBars.reduce((total, tabBar) => total + tabBar.titles.length, 0);
}
publishTabCount(): void {
    this.tabCount = this.countTabs();
    void this.statusBar.setElement('powerbrowser.chrome-bar.tab-count', {
        text: `${this.tabCount} tabs`,
        alignment: StatusBarAlignment.RIGHT,
    });
    this.update();
}
```

- The chip re-asserts the tabs invariant on **every** mode switch
  (`selectMode` → `publishTabCount`; mismatch is logged, never thrown, switch
  still lands). Phase 14 keeps this exact call shape; mode/setup restores that
  drop tabs still complete geometry + mode with the contracted explanation
  (14-UI-SPEC), never a half-applied silent state.
- Status-bar element id `'powerbrowser.chrome-bar.tab-count'` is a distinct
  registration from command ids — the commands gate (§5) must not trip on it.

**Command per action (from `chrome-bar-commands.ts` lines 17–21, 64–106):**

```typescript
export const CHROME_BAR_BACK_COMMAND_ID = 'powerbrowser.chrome-bar.back';
// New ids follow the same dotted namespace, e.g.
// 'powerbrowser.modes.save', 'powerbrowser.setups.save', ... — planner picks names.
commands.registerCommand(CHROME_BAR_BACK, {
    execute: () => this.navigation.back(),
    isEnabled: () => this.navigation.canGoBack(),
    isVisible: () => true,   // disabled-not-removed: dim with tooltip, never shift layout
});
```

- Export every id as a named const; widget/keybindings/gates import the const,
  never re-spell the string (`verify-chrome-bar-commands.mjs` fails re-spelled
  literals naming the file).
- Mode/setup destructive rules: mode switch is never destructive, never needs
  confirmation; **Delete Setup is the ONLY destructive action** with the
  contracted confirmation (14-UI-SPEC). Core-close has deliberately NO dialog.

**Composition (from `chrome-bar-frontend-module.ts` lines 22–33):** static binds
at module load (`toSelf` + `toService(CommandContribution|KeybindingContribution|
FrontendApplicationContribution)`); D-50 — a contribution bound after first
enumeration is permanently invisible. Mode/setup contributions bind the same way
in the same or a new `@powerbrowser/*` extension.

**Style layer (from `chrome-bar.css` lines 1–20):** one `@layer
powerbrowser-<id>` block, tokens from the sketch `default.css` only, typeface
delegated (`var(--theia-*)`), codicons only, focus `2px solid
var(--color-primary)` + `offset 2px`, motion `all 0.15s ease`, panel slide
≤200ms (instant under `prefers-reduced-motion`). Sheet sits **below** the
`customize.css` user layer. Accent only in the 4 reserved uses (14-UI-SPEC
adds the current-setup/mode row marker to Phase 13's three).

### What to avoid

- No `[features]`/`[modes]` manifest flags anywhere (14-UI-SPEC: modes are
  data with shipped defaults; custom modes save current layout as data).
- No strip relocation per mode (binding RED verdict) — see §6.
- No new npm packages; no new icon set; no `font-size`/`font-weight` literal
  outside the 14/13/12 contract; no second brand hue.
- No chrome-side command registration (CLAUDE.md rule 5 — absence is design).
- Never `bind()` a contribution lazily after startup (D-50).

---

## 2. View show/hide + layout idioms

**Closest analogs (all tracked):**

- `theia/extensions/tab-uris/src/browser/view-open-handler.ts` — bare-`OpenHandler` + delegate-to-contribution (copy this)
- `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` lines 93–132 — `WidgetManager.onDidCreateWidget` + mutable-field set instead of rebind (copy this)
- `theia/extensions/customize/src/browser/customize-css-contribution.ts` — `FrontendApplicationContribution.onStart` lifecycle (copy this)
- Theia library API (pinned `@theia/core@1.74.1`, consumed — never patched):
  `ApplicationShell.addWidget/activateWidget/revealWidget/closeWidget/getWidgetById/allTabBars`
  (`theia/node_modules/@theia/core/lib/browser/shell/application-shell.d.ts`
  lines 245, 323, 347, 417, 453, 490),
  `SidePanelHandler.expand(id?)/collapse()` (side-panel-handler.d.ts lines
  126, 130), `shell.leftPanelHandler/rightPanelHandler/bottomPanel`
  (application-shell.d.ts lines 104–114).

### What to copy

**Panel visibility per mode — the ONLY sanctioned move.** Modes call the public
handler API; nothing is re-added across areas, nothing is rebound:

```typescript
// Browsing/Organising: hide side panels; Coding: show Explorer (+ saved layout).
this.shell.leftPanelHandler.collapse();
this.shell.rightPanelHandler.collapse();
// show: leftPanelHandler.expand('explorer-view-container') — id optional (expands last-active/first).
```

- `expand`/`collapse` are the public side-panel surface; `bottomPanel` is a
  `TheiaDockPanel` (application-shell.d.ts line 104) — main-area placeholder
  swap (Organising slot, max-width 480px, synchronous paint, no spinner) goes
  through the existing open-handler routing, never `shell.addWidget` with a
  hardcoded area.
- **Open anything through the contribution's own path** (from
  `view-open-handler.ts` header lines 11–20, 58–77): bare `OpenHandler`
  delegating to `AbstractViewContribution.openView(...)` so placement comes
  from the contribution's own `defaultViewOptions`. Never `WidgetOpenHandler`
  (hardcodes `{area:'main'}`), never bare `getOrCreateWidget` + `activateWidget`
  on a never-attached widget (silently no-ops — lines 78–97 delegate to the
  real open path instead). `canHandle` returns 1000 or 0 on scheme alone, never
  negative (lines 41–51).
- **Constrain-without-rebind** (from `tab-uris-frontend-module.ts` lines
  93–132, the D-27 `isExtractable=false` block): to pin widget behavior,
  subscribe `WidgetManager.onDidCreateWidget` (+ fix pre-existing instances via
  `getWidgets(...)`) and set the plain mutable field. Never
  `rebind(ApplicationShell)`, never subclass-and-forward seven injected params
  across a Theia bump.

**Contribution lifecycle (from `customize-css-contribution.ts` lines 82–105):**

```typescript
onStart(): void {
    this.replaceStyleElement('');  // sync, present on first paint, no flash
    this.applyCss();               // fire-and-forget — NEVER awaited (boot-chain deadlock, header lines 55–65)
    this.fileService.onDidFilesChange(/* ... debounced 150ms ... */);
}
```

- Mode/setup contributions do sync-first-paint + fire-and-forget async load in
  `onStart`; awaiting a backend RPC/file read inside `onStart` re-enters the
  documented boot-chain deadlock. Debounce file-change reloads with the in-tree
  `p-debounce(..., 150)` pin (both customize-css-contribution.ts line 80 and
  chrome-bar-widget.tsx line 92 use it — no new dep).

### What to avoid

- No `shell.addWidget(widget, {area})` moves per mode — that is the relocation
  mechanics the RED verdict closed (13-SPIKE, Observations 1–2). Panel
  expand/collapse + main-area view selection only.
- No `rebind(ApplicationShell)`; no `WidgetOpenHandler`; no negative
  `canHandle`; no `getResourceUri` on a widget to make it addressable (lights
  up Save-As — 13-PATTERNS §3).
- No tab unmount/close/move-windows/detach on mode switch — status-bar chip
  asserts the invariant (§1). No tab loading state on switch.
- tabl order: if a mode demands a strip sequence, set it explicitly (spike
  constraint 2: re-added widgets append in move order) — but the strip itself
  stays top.

---

## 3. Persistence idioms — user-storage (modes) vs SQLite single-writer (setups NOT in SQLite)

**Closest analogs (all tracked):**

- `theia/extensions/customize/src/browser/customize-css-contribution.ts` + `customize-frontend-module.ts` — user-storage precedent (**copy for modes AND setups**)
- `theia/extensions/tab-uris/src/node/tab-query-service.ts` — readonly reader over `tabs.sqlite` (read-only pattern reference only)
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` lines 42–68, 596–627 — chrome-side single writer + WAL + version-guard migration (do NOT extend)
- `scripts/verify-sql-store-second-writer.mjs` — the gate that forbids a second writer (do NOT trip)

### Decision: modes AND setups persist via user-storage JSON, never SQLite

```typescript
// From customize-css-contribution.ts lines 5, 72, 107–129:
import { UserStorageUri } from '@theia/userstorage/lib/browser/user-storage-uri';
// ...
protected readonly uri = UserStorageUri.resolve('customize.css');  // analog: 'modes.json' / 'setups.json'
// read: (await this.fileService.read(uri)).value with .catch()
//   first-ever failure → untouched default (shipped Browsing / "No saved setups" empty copy), never create the file
//   later failure → keep last-good content, leave DOM/state untouched, return (lines 118–125)
// reload: fileService.onDidFilesChange + event.contains(this.uri) + 150ms debounce (lines 90–104)
//   DELETED → deliberate absence: reset immediately (lines 96–99)
```

Why user-storage, not SQLite:

1. **Single-writer rule is absolute.** `PowerBrowserAPI` (`PowerBrowserAPI.sys.mjs`
   lines 65–68: module-level `tabStoreConn`, one writer only) is the sole
   read-write opener of `tabs.sqlite`; `verify-sql-store-second-writer.mjs`
   fails **naming file:line** any `openConnection`/`new Database(`/`new
   DatabaseSync(`/`openDatabase` outside `powerbrowser/shell/` except the one
   `readonly: true` literal on the same line (header rules (a)–(c), lines
   4–26). A Theia-side read-write SQLite store for modes/setups is a second
   writer by construction — the gate goes red by design.
2. **The readonly reader is tabs-shaped.** `TabQueryService`
   (`tab-query-service.ts` lines 51–98: lazy readonly open, missing file →
   empty answers, never throws) serves the chrome writer's four-field tab
   projection over `tabs.sqlite`. Modes (visibility/layout rules) and setups
   (geometry + tab URIs + mode) are Theia-owned UI state, not chrome-observed
   tab rows — wrong table, wrong owner, wrong process.
3. **User-storage is the in-tree precedent for exactly this.** `customize.css`
   lives at `user-storage:/user/customize.css` beside `settings.json`
   (customize-css-contribution.ts header D-54), read via `FileService` with no
   backend contribution, no express route, no new transport. `modes.json` /
   `setups.json` (planner picks names) follow the same file: sync empty
   default on first paint → fire-and-forget real read → `onDidFilesChange`
   hot reload → keep-last-good on mid-save races → atomic write via the file
   service (never truncate-then-read-your-own-write).
4. **Validation discipline mirrors the reader:** corrupt custom-mode data →
   shipped Browsing fallback + contracted notice (14-UI-SPEC); restore with
   gone tabs → drop them, still complete geometry + mode with the contracted
   "some tabs no longer exist" explanation; failure leaves current
   windows/tabs untouched. Never-throw reads (`getByUri` → `undefined`,
   `listByRecency` → `[]`, lines 101–139) are the model — surfaces degrade to
   contracted copy, never exceptions in user-facing paths.

Write path: atomic write through `FileService` (the `writeStateFile`
write-then-rename precedent, `PowerBrowserAPI.sys.mjs` lines 410–418, is the
chrome-side shape — Theia side uses the file service, never a new backend
endpoint). Cap setup/mode names at 60 chars, cut pasted overflow at the cap
before commit; empty commit → contracted empty-name error, never a silent
no-op or partial write; duplicates → contracted duplicate error, no overwrite
offer (14-UI-SPEC).

### What to avoid

- No new SQLite file, no new table in `tabs.sqlite`, no Theia-side
  read-write opener of any profile database (second-writer gate).
- No new backend module / express route / WebSocket path for modes/setups
  (the suggestion-service RPC at `CHROME_SUGGESTION_PATH` exists for tab
  search, not UI state — do not generalize it).
- No `[features]`/`[modes]` manifest flags; no new npm packages.
- Never create the file to represent defaults — absence IS the default
  (D-61); an empty state has provably zero effect.

---

## 4. Dependent windows — secondary-window + shell-window precedents

**Closest analogs (all tracked):**

- `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` lines 93–132 — `isExtractable=false` block (**copy the technique, invert the membership**)
- `theia/extensions/tab-uris/src/browser/browser-window-command.ts` — `window.open(url,'_blank')` candidate-A channel (**copy for dependents IF headless-proven; else chrome channel**)
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` lines 510–572 + 1162–1221 — `findShellWindow`/`openShellWindow`/`openBrowserWindow` + single-instance handler (**copy the shape, new windowtype**)
- Theia library API (pinned, consumed — never patched): `SecondaryWindowService.createSecondaryWindow(widget,
  shell)` + `onWindowOpened/onWindowLoaded/onWindowClosed` + auto-close when
  the Theia instance closes (`secondary-window-service.d.ts`); `SecondaryWindowHandler.moveWidgetToSecondaryWindow(widget:
  ExtractableWidget)` (secondary-window-handler.d.ts lines 54–57).

### What to copy

**Containment without a second IDE frame.** Two candidate mechanisms, in
preference order — the spike idiom (§6) decides between them if both are live:

1. **Theia secondary windows (preferred if the hosted view qualifies).**
   `SecondaryWindowService.createSecondaryWindow` creates a window that
   **closes automatically when the Theia instance closes** — the
   core-close-full-kill half for free. Gate membership with the D-27
   technique: `WidgetManager.onDidCreateWidget` + mutable `isExtractable`
   field. The ChatView precedent sets `isExtractable=false` to KEEP a widget
   home; dependents need the inverse — exactly one tab-content widget type
   extractable, everything else (chrome bar, toggle, side panels, status bar,
   tab strip) pinned non-extractable so a dependent can never grow an IDE
   frame. `onWindowLoaded` (not `onWindowOpened` — document still
   `about:blank` at open) is where dependent document adjustments land;
   `onWindowClosed` returns focus to the core window and destroys nothing.
2. **`window.open` candidate-A channel (fallback, GUI-01-proven).** From
   `browser-window-command.ts` lines 56–85: plain `window.open(url, '_blank')`
   crosses the content→chrome boundary on stock machinery (shell carries no
   `nsIBrowserDOMWindow` → `AppWindow::CreateNewContentWindow` opens
   `BROWSER_CHROME_URL`); `null` return → the existing thrown error with the
   palette/user-activation guidance, never a new dialog. For dependents the
   URL is the tab's existing addressable URI through the tab-URI handlers —
   never a new scheme, never a second IDE URL.

**Chrome-side shape (if a chrome assist is needed):** mirror
`findShellWindow`/`openShellWindow`/`openBrowserWindow`
(`PowerBrowserAPI.sys.mjs` lines 516–572) — thin named wrappers over
`Services.wm`/`Services.ww`, windowtype-looked-up (`powerbrowser:main`
precedent, line 517), `null` args, `chrome,dialog=no,all`. Dependent windows
get their own windowtype (planner names it); the single-instance handler
(lines 1199–1221: focus-existing → `preventDefault`, else open-shell-once)
stays shell-only — dependents never enter that path. **Any new chrome method
is catalogued in `powerbrowser/INTERNAL-APIS.md`** (`check-internals-boundary.sh`
`--catalogue`); a second file importing a Firefox internal is the failure the
boundary exists to prevent.

**Dependent content rules (14-UI-SPEC, enforced by construction):** one tab's
content view + its title only; no chrome bar, toggle, panels, status bar,
strip. Tab stays a core-model tab (tabs invariant holds across windows).
Tab-closed-elsewhere → contracted "This tab is closed" + "Close Window"
(closes only that dependent). Core-close → dependents die with it, no dialog;
relaunch restores the last setup automatically; relaunch failure rides the
existing 01 shell error path — no replacement error UI.

### What to avoid

- Never a second IDE frame: no duplicated shell, no duplicated chrome bar /
  toggle / status bar in a dependent (membership gate above makes it
  structural, not reviewed-per-window).
- Never move the tab out of the core model into the dependent (invariant
  breach — the chip in §1 keeps asserting it).
- No JSWindowActor pair unless the `window.open` path is observed blocked
  (candidate-B discipline from 13-PATTERNS §6: pre-approved fallback only on
  live failure; adopting it obliges the `FORBIDDEN_PATTERNS` entry + catalog).
- No startup-opened dependent (GUI-01 observation-4 constraint: startup-opened
  windows break `gURLBar`) — user-gesture time only; geometry restores on
  relaunch through the setup path, not through startup opens.
- No custom window-manager animation (14-UI-SPEC Motion); no new dialog/toast
  for blocked popups (existing throw path).

---

## 5. Derive-and-compare gate idiom — mode/setup rows

**Closest analogs (all tracked):**

- `scripts/verify-registry-shape.mjs` — the shape to imitate line-for-line (copy this)
- `scripts/verify-chrome-bar-commands.mjs` — id-derivation + call-site const discipline (copy this)
- `scripts/verify-strip-spike-verdict.mjs` — verdict-parse + instrument-agreement + shipped-tree-derivation (copy techniques as needed)
- `scripts/verify-platform.sh` lines 3688–3689, 3698–3699, 3723–3724 — the **only** registration point (two rows per check)

### What to copy

**Structure** (from `verify-registry-shape.mjs` lines 41–63, 73–126, 139–155, 179–250):

1. **One hand-kept `EXPECTED` const** — the declared contract (shipped mode
   defaults in order; setup-row shape; command ids). Editing it IS the
   deliberate-change process (visible in the diff).
2. **Actual set DERIVED at check time** from the tree (source regex like
   `exportedNamesOf` lines 74–81 / `derivedIdsOf` in commands-gate lines
   65–71; JSON defaults read from disk) — never a second hand-kept list.
3. **Set-equality `diff` both directions** (lines 119–126): surplus (unreviewed
   mode/command/row) and missing (dead toggle segment, dropped default)
   reported **by name**.
4. **Non-vacuity guards**: zero derived members fails as *"broken
   instrument"*, never passes as clean (lines 139–143; commands-gate lines
   88–91).
5. **`--self-test` with planted faults both directions**: baseline-green-first
   control, planted addition + removal, each plant asserted to have landed,
   each required to go red **naming** the drift (registry-shape plants 4;
   commands-gate plants 3: id removal, label drift, duplicate id).
6. **Honestly `--quick`**: text sources only — no build, no browser, no
   display, no network. Say so in the header.
7. **Failure messages name the fix** (registry-shape lines 258–260).

**Candidate new rows for Phase 14** (planner picks; all static/`--quick`-eligible):

- Mode-command registry shape: expected mode/setup command ids derived vs.
  extension sources as set equality (mirrors `verify-chrome-bar-commands.mjs`
  incl. the call-site const-import discipline — widget/mode-service must
  import id consts, never re-spell strings).
- Shipped-mode defaults shape: `MODES` literal derived from the widget/mode
  source vs. EXPECTED `['Coding','Browsing','Organising']` + order assertion
  (surplus = unreviewed default; missing/reordered = broken toggle contract).
- Setup/mode-row copy gate (optional): contracted user-facing strings derived
  from sources vs. EXPECTED literals (mirrors the commands-gate label
  assertion, lines 104–119) — or extend `verify-shell-error-copy.mjs`
  pattern coverage if that harness fits better than a new file.

**Registration** — append two rows per check to `CHECKS` in
`scripts/verify-platform.sh` beside the `gui06-chrome-bar-*` pair (lines
3698–3711):

```bash
"gui07-modes-<what>|node $REPO_ROOT/scripts/verify-modes-<what>.mjs"
"gui07-modes-<what>-self-test|node $REPO_ROOT/scripts/verify-modes-<what>.mjs --self-test"
```

### What to avoid

- Never a sibling driver (`verify-phase-*.sh` deleted, *"must not come back"*).
- Never assert on the **absence of a log line** unless proven emitted by the
  code under test (CLAUDE.md rule 1).
- Never hand-keep the expectation the check compares (rule 2) — derive, then
  compare as set equality, red on addition AND removal.
- Never read compiled `lib/` artifacts — read TypeScript sources (+ JSON
  defaults files where the contract lives in data).
- Never ship a check without its `--self-test` row.

---

## 6. Spike / decision-record idiom

**Closest analogs (all tracked):**

- `.planning/phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md` (400 lines, verdict **RED** — binding on this phase)
- `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-SPIKE-GUI-01.md` (487 lines — structure model)

### The binding verdict (do not re-litigate)

`13-SPIKE-STRIP-RELOCATION.md` lines 16–21: **Verdict: RED** — relocation
mechanics proven live (6/6 moves resolve, identity preserved) but the
zero-core-modification pillar is unprovable by its ratified instrument
(`diff-theia-core.sh --quick` red on pre-existing install-state drift), so the
GUI-07 entry criterion is not met. **Fallback: strip stays top per Variant A;
modes still ship.** `verify-strip-spike-verdict.mjs` enforces this mechanically
(§5): RED must carry a cause, route to Variant A, paste the FAIL output, keep
`git -C upstream diff` empty and the shipped tree clean.

Phase-14 consequences: any work predicated on relocation is out. The re-probe
runway (realign `node_modules`, re-run) may reopen Variant B **only as a
recorded decision, not as silent scope** — a re-probe writes a new spike
record + verdict-gate update in the same commit; no Phase-14 plan touches
strip position on a green re-probe it has not recorded.

### Structure to imitate (for any probe this phase needs)

| Spike section | What it contains | Phase-14 equivalent |
|---|---|---|
| Title + header block (01-SPIKE lines 1–12) | Plan/Task, Decision ref, Run (host, date, pins), Binary/app under test, one-line **Verdict** | Same; Theia pin `1.74.1`, ESR tag, `objdir/dist/bin/powerbrowser` |
| What was changed (13-SPIKE lines 25–50) | Enumerated edits, scaffolding named as scaffolding, shipped-tree-clean proof | Same; probe harness = untracked scratch (`.tmp-*/`), never staged, removed at closeout |
| Build (lines 55–74) | Command, exit code, timing vs. budget | Same; Theia builds are seconds-scale, never a Gecko build |
| Instrumentation note (lines 80–104) | Discarded instruments named with cause; harness bugs corrected visibly | Same (headless BiDi is the read path; Xvfb already discarded for cause) |
| Observations 1..N | Numbered, prediction-vs-observed + verbatim evidence | e.g. secondary-window open/host/close, mode-switch tab counts, setup save/restore round-trip |
| Constraints found | Neither predicted nor blocking, recorded anyway | e.g. focus-does-not-stick-headless, ordering appends, geometry held-out |
| Summary table | Question → Answer, one row per plan question | GREEN/RED routing per question |
| Artefacts | Harness = scratch, not committed; verdict committed | Same — pasted verbatim evidence is why removal loses nothing |
| Correction | Wrong inferences corrected in place, reasoning visible | Same discipline |
| Ratification | Land-as-spiked / fallback gate table, binding constraints, guard check | Same — name the `verify-platform.sh` row that guards it |
| Proofs | `diff-theia-core.sh --quick` output, `git -C upstream diff` empty, shipped-tree clean | Same three proofs, every probe |

Likely Phase-14 probes (planner confirms; each gets a record only if it
touches a decision): dependent-window mechanism choice (§4 candidates 1
vs 2); headed focused-tab-keeps-focus across mode switch (held out of the
13 spike as headless-unprovable — 13-SPIKE lines 236–245); setup restore
geometry fidelity (zero/one/many dependents, overlap-collapse,
off-screen stranding — 14-UI-SPEC backstop rows).

### What to avoid

- No probe writes under `theia/` or `scripts/` (verdict gate fails naming the
  file — `verify-strip-spike-verdict.mjs` lines 117–141, `spikeAddedPaths`).
- No Gecko touch (`git -C upstream diff` empty); never hand-edit a patch hunk
  (regenerate from a patched tree).
- No package-manager installs inside a probe plan (T-13-01-SC precedent) —
  realignment is its own recorded step.
- Verdict is a decision artifact, not user-facing copy (no UI-SPEC copy rules
  apply to it) — but every user-facing string the probe's *feature* adds
  follows the copy contract (product named "Power Browser", plain language,
  real on-screen next step, zero internal identifiers).

---

## Shared patterns (apply to every Phase 14 plan)

- **User-facing copy** — "Power Browser", plain-language problem, next step
  that is a real on-screen affordance, zero internal identifiers. Source:
  CLAUDE.md + 14-UI-SPEC Copywriting Contract (exact literals:
  "Save Setup", "Save as Mode", "No saved setups", "Organising arrives
  next", "This tab is closed", Delete Setup confirmation; core-close has
  none deliberately). Diagnostics rows carry what copy omits.
- **No-internals boundary** — Firefox internals only via
  `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in
  `powerbrowser/INTERNAL-APIS.md`; enforced by
  `scripts/check-internals-boundary.sh` (`--self-test`, `--catalogue`).
  Theia side adds no second boundary file.
- **One driver, one registry** — `scripts/verify-platform.sh`; `--quick` is
  the commit gate; new checks are rows + self-test rows.
- **No fork / no patch-stack escape** — Theia consumed as pinned
  `@theia/*@1.74.1` deps (`diff-theia-core.sh`); Gecko touched only via
  `patches/` regeneration (`check-patch-surface.sh`, `apply-patches.sh
  --self-test`).
- **Residual-brand scan still gates** — stage new files before trusting a
  green scan (`git ls-files` iteration); originating-product token only in
  `inventory/brand-tokens.json`.

## No analog found

| Need | Role | Data flow | Reason / substitute |
|---|---|---|---|
| Named-setup save/restore of geometry + tabs + mode | service | CRUD over local JSON | No setup store exists. Follow §3 user-storage idiom (customize.css precedent); geometry recorded verbatim, restored verbatim (14-UI-SPEC Spacing exception). |
| Mode visibility/layout rule engine | service | request-response | No rule engine exists. Toggle + chip host is §1; panel actuation is §2 `expand`/`collapse`; shipped defaults are literals with custom modes as data (§3). |
| Dependent-window tab-content host | contribution | event-driven | No dependent host exists (only the GUI-01 stock-chrome opener + chat `isExtractable=false` pin). Follow §4 candidates in order; probe per §6 if both live. |
| Organising canvas | view | — | Explicitly Phase-15 scope. This phase contracts only the placeholder slot (14-UI-SPEC). No analog sought. |

## Metadata

**Analog search scope:** `theia/extensions/chrome-bar/src/{browser,node}/*`,
`theia/extensions/tab-uris/src/{browser,node}/*`,
`theia/extensions/customize/src/browser/*`, `powerbrowser/shell/PowerBrowserAPI.sys.mjs`,
`scripts/verify-{registry-shape,chrome-bar-commands,strip-spike-verdict,sql-store-second-writer}.mjs`,
`scripts/verify-platform.sh` CHECKS registry, `scripts/diff-theia-core.sh`,
`.planning/phases/13-chrome-bar-strip-relocation-spike/{13-PATTERNS,13-SPIKE-STRIP-RELOCATION}.md`,
`.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-SPIKE-GUI-01.md`,
`theia/node_modules/@theia/core/lib/browser/{secondary-window-handler,shell/application-shell,shell/side-panel-handler,window/secondary-window-service}.d.ts`,
14-CONTEXT.md + 14-UI-SPEC.md.
**Files read:** 12 source/config/script files + 13-PATTERNS.md + 13-SPIKE record + CONTEXT/UI-SPEC.
**Pattern extraction date:** 2026-09-06
