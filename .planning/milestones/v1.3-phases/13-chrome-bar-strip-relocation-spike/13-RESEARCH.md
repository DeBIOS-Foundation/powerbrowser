# Phase 13: Chrome Bar + Strip-Relocation Spike - Research

**Researched:** 2026-09-06
**Domain:** Theia 1.74.1 shell contributions (top-area widget, commands, JSON-RPC suggestion service) + strip-relocation spike procedure
**Confidence:** HIGH

## Summary

Phase 13 builds GUI-06 (a top chrome bar: back/forward/reload, address input with suggestions, new tab, mode toggle) as a toolbar-like `@powerbrowser/*` contribution, and exits through the GUI-07 spike gate: a recorded GREEN/RED verdict on whether a live tab strip moves Theia shell areas without forking core. All research was done against the vendored Theia 1.74.1 sources in `theia/node_modules` and the existing `@powerbrowser/*` extensions — no external packages are needed, and the UI-SPEC already forbids adding any.

The investigation converges on one cheap composition that satisfies every constraint: a **new `theia/extensions/chrome-bar/` extension** whose bar widget is added to the **`'top'` shell area** via public `ApplicationShell.addWidget` (a plain Lumino `Panel` above the main dock — no core patch, no dock surgery). Back/Forward wire to the existing `NavigationLocationService.back()/forward()` with `canGoBack/canGoForward` driving the UI-SPEC's disabled states; Reload stays disabled until GUI-02 (Theia core ships no reload primitive for shell widgets); New Tab reuses the ratified candidate-A `window.open` channel by importing `OPEN_BROWSER_WINDOW_COMMAND_ID`, never re-spelling it. Suggestions come from **`tabs.sqlite` rows only**, served by finishing the STAGED `TabQueryService` (add a bound-parameter prefix search, land its first consumer over Theia's standard `JsonRpcConnectionHandler`/`WebSocketConnectionProvider.createProxy` RPC) — history/bookmark Places reads stay chrome-side point reads because no Theia-side path to Places exists and creating one would violate the single-writer and upstream-schema rules. The spike procedure moves live main-area widgets to another area with public shell APIs and asserts identity via `TabUriRegistry.uriOf` + `getAreaFor`, with `scripts/diff-theia-core.sh` clean as the green criterion.

**Primary recommendation:** New `@powerbrowser/chrome-bar` extension (frontend `top`-area widget + backend RPC module, zero new deps) + `TabQueryService.searchByPrefix` + JSON-RPC consumer + derive-and-compare verify rows; spike via public `addWidget` area moves with verdict in SUMMARY.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Sketch 001 winner A (top chrome bar, Firefox-like); the bar is called the **chrome bar**.
- Sketch 002 winner B (strip relocates per mode) PENDING the spike verdict — the spike decides, not preference.
- Design tokens: `.claude/skills/sketch-findings-Power-Browser/` (auto-loads when building UI).

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop by default — verification deferred until roadmap fully executed; plan-phase runs with --no-reversibility-gates; milestone audit gaps/tech debt accepted; cleanup dry-run approved if phase scratch only; halt only on blocker surviving 3 fix-and-retry attempts.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUI-06 | Top chrome bar (back/forward/reload, address input with suggestions, new tab, mode toggle) as toolbar-like `@powerbrowser/*` contribution above or below the Theia toolbar | Top-area widget pattern, command wiring table, suggestion-service design, CSS-layer conventions below |
| GUI-07 (spike gate only) | Strip-relocation spike verdict is this phase's exit gate (green → Variant B in Phase 14; red → Variant-A fallback) | Concrete spike procedure + verdict artifact shape + green/red criteria below |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

1. **Never fork or patch Theia core** — additions are `@powerbrowser/*` extensions; upstream adopted by re-pinning only. `scripts/diff-theia-core.sh` is the check. A change that "requires" a core edit must be reshaped. (Spike green criterion depends on this staying clean.)
2. **Never modify Gecko outside the patch stack** — `upstream/` never hand-edited; Firefox internals reachable only through `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in `powerbrowser/INTERNAL-APIS.md`, enforced by `scripts/check-internals-boundary.sh`. This phase needs **no new touchpoint**.
3. **Design for the bridge** — nothing may weld Theia to full-window presentation; `TabUriRegistry`'s exported shape is frozen (`scripts/verify-registry-shape.mjs`). Do not add public members to `TabUriRegistry` (put the key rule beside it, per `browser-tab-uri.ts` precedent).
4. **Repo path has no space** — `/home/chris/coding/Power-Browser` compliant; do not move.
5. **Theia is the default GUI; stock chrome reachable** — new-tab via candidate-A `window.open` channel; no custom browser chrome authored (no tab strip, toolbar, address bar, or menu of our own beyond the contracted chrome bar).
6. **One driver, one registry** — new checks are rows in `scripts/verify-platform.sh`, each with `--self-test`; never a sibling driver. Derive-and-compare, never hand-kept expectation lists (except the single frozen EXPECTED contract, edited visibly in-diff).
7. **User-facing copy** — no internal identifier in UI text; product named "Power Browser"; every error ends with a real on-screen next step. Exact strings are locked in 13-UI-SPEC.md Copywriting Contract — reuse verbatim.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Chrome-bar rendering (buttons, pill, dropdown, toggle) | Theia frontend (`@powerbrowser/chrome-bar` browser module) | — | Pure presentation over existing shell services; no backend rendering |
| Back/forward enablement + execution | Theia frontend (`NavigationLocationService`) | — | History stack already lives frontend-side in `@theia/editor` |
| Suggestion querying (prefix filter, recency order) | Theia backend (`TabQueryService` + new RPC binding) | — | Owns the only readonly handle on `tabs.sqlite`; frontend must not open sqlite directly |
| Tab-row writing, history/bookmark point reads | Gecko chrome (`PowerBrowserAPI.sys.mjs`) | — | Sole writer invariant; Places APIs exist only in chrome process |
| Address commit → open tab/view | Theia frontend (`OpenerService` + existing open handlers) | — | Existing `view:`/`terminal:`/`webview:` routing already resolves addresses |
| Strip relocation (spike) | Theia frontend (`ApplicationShell` public API) | — | Widget parenting is a shell concern; no backend or chrome involvement |
| Verdict + gates | `scripts/verify-platform.sh` registry rows | Phase SUMMARY/decision log | Verdict is a decision artifact, not UI; gates enforce it mechanically |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@theia/core` | 1.74.1 (pinned; 50 pins in `theia/package.json` resolutions) | `ApplicationShell`, `CommandContribution`, `KeybindingContribution`, `MenuContribution`, `OpenerService`, `StatusBar`, JSON-RPC (`ConnectionHandler`, `JsonRpcConnectionHandler`, `WebSocketConnectionProvider`) | The sidecar's only UI framework; every API below verified in the vendored tree [VERIFIED: theia/applications/browser/package.json:43-92] |
| `@theia/editor` | 1.74.1 (already composed) | `NavigationLocationService.back()/forward()/canGoBack()/canGoForward()` for bar Back/Forward | Only in-tree navigable-history stack; zero new surface [VERIFIED: theia/node_modules/@theia/editor/lib/browser/navigation/navigation-location-service.d.ts:54-68] |
| `better-sqlite3` | 13.0.3 (already a dep of `@powerbrowser/tab-uris`) | Readonly prefix search over `tabs.sqlite` | Already pinned for `TabQueryService`; new query is one more prepared statement, not a new dep [VERIFIED: theia/extensions/tab-uris/package.json:15] |
| `p-debounce` | ^2.1.0 (already a dep of `@powerbrowser/customize`) | Debounce suggestion queries (~150ms precedent) | In-tree precedent for exactly this absorption pattern [VERIFIED: theia/extensions/customize/package.json:12] |
| `react` / `react-dom` | 18.3.1 (already composed in app) | Bar widget + custom suggestion dropdown rendering | `.tsx` precedent in `@powerbrowser/branding` (`powerbrowser-welcome-widget.tsx`); UI-SPEC mandates `@theia/core` widgets + hand-built dropdown, no new framework [VERIFIED: theia/applications/browser/package.json:92-93] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@theia/filesystem` + `@theia/userstorage` | 1.74.1 | `UserStorageUri.resolve(...)` + `FileService` reads for any persisted bar/mode state | Only if the planner persists anything (mode selection is Phase 14 scope; default to in-memory) |
| codicons (Theia-shipped) | stock | `chevron-left/right`, `refresh`, `plus`, `lock` glyphs | UI-SPEC icon contract; no icon package [ASSUMED — UI-SPEC §Design System; codicon availability is Theia-stock behavior] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `'top'`-area widget | `TabBarToolbarContribution` items | REJECTED: toolbar items render inline per-widget in the tab-bar row (`ReactTabBarToolbarAction.render(widget)` [VERIFIED: theia/node_modules/@theia/core/lib/browser/shell/tab-bar-toolbar/tab-bar-toolbar-types.d.ts:76-82]) — no full-width address pill possible; items are per-active-widget, the bar must be global |
| `'top'`-area widget | Below-tab-strip insertion in main dock | REJECTED: no shell area exists between tab strip and content; would require `TheiaDockPanel` layout surgery that fights `shell-layout-restorer` (which persists only main/bottom/left/right [VERIFIED: theia/node_modules/@theia/core/lib/browser/shell/application-shell.d.ts:572-580]) — exactly the fork-risk the spike exists to avoid |
| JSON-RPC suggestion service | Express route / new HTTP endpoint | REJECTED: new network surface re-opens `verify-endpoints.sh` / token-gate review; RPC rides the existing authenticated websocket with no new surface |
| `tabs.sqlite`-only suggestions | New chrome→Theia history channel (actor/file-watch) | REJECTED for this phase: no channel exists; reading `places.sqlite` from the Theia backend would violate the single-writer invariant and the no-new-tables-in-`places.sqlite` out-of-scope rule [CITED: .planning/REQUIREMENTS.md:71-74] |
| New `@powerbrowser/chrome-bar` extension | Extend `@powerbrowser/tab-uris` | REJECTED: any new export/member on the registry side risks drifting the frozen bridge contract (`EXPECTED`/`EXPECTED_MEMBERS` [VERIFIED: scripts/verify-registry-shape.mjs:55-71]); a fresh extension keeps `gui04-registry-shape` green by construction |

**Installation:**
```bash
# Nothing to install. UI-SPEC Registry Safety: "no new packages" (checker PASS).
# Composition only: add "@powerbrowser/chrome-bar": "0.1.0" to theia/applications/browser/package.json
# dependencies (alphabetical, beside the four existing @powerbrowser/* pins) and the
# frontend+backend entries to theia/extensions/chrome-bar/package.json theiaExtensions —
# no app-file edit, per the tab-query-backend-module precedent.
```

**Version verification:** No registry lookup needed — every dependency above is already pinned in-tree (cited lines). `verify-extension-pins.mjs` already gates pin drift.

## Package Legitimacy Audit

> No external packages installed by this phase (UI-SPEC: `Tool: none`, "no component library may be added"). Gate run is therefore vacuous — recorded explicitly rather than skipped.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| *(none added)* | — | — | — | — | — | Approved (empty set) |
| `better-sqlite3@13.0.3` (reuse) | npm (already pinned) | established | high | github.com/WiseLibs/better-sqlite3 | OK (in-tree pin, prior phases) | Approved — no action |
| `p-debounce` (reuse) | npm (already pinned) | established | high | sindresorhus/p-debounce | OK (in-tree pin, prior phases) | Approved — no action |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User typing / clicks
        │
        ▼
┌─ chrome bar widget ─────────────────────────────┐  'top' area (theia-top-panel,
│ Back Forward Reload │ address pill │ NewTab │ ○○○ │  plain Lumino Panel above
└───┬──────┬──────┬─────┴──────┬───────┴───┬──────┬─┘  main dock; shell.addWidget)
    │      │      │            │           │      │
    │      │      │(disabled    │           │      └─► in-memory mode selection
    │      │      │ until      │           │          (persistence = Phase 14)
    │      │      │ GUI-02)    │           │
    │      ▼      │            ▼           ▼
    │ NavigationLocationService  OpenerService.open(uri)   window.open(url,'_blank')
    │ back()/forward()           existing view:/terminal:/  candidate-A stock-window
    │ canGoBack/canGoForward     webview: handlers          escape (reuse command id)
    │ (frontend, @theia/editor)  (frontend, tab-uris)       (frontend, tab-uris)
    │
    │  suggestions while typing (debounced)
    ▼
JSON-RPC proxy ──websocket (existing)──► JsonRpcConnectionHandler ──► TabQueryService
(frontend binding)                        (backend binding, NEW)        searchByPrefix (NEW stmt)
                                                                            │ readonly
                                                                            ▼
                                                                     tabs.sqlite (chrome-written)
```

Trace the primary use case: user types in pill → debounced RPC `searchByPrefix` → up-to-8 `{uri,title,url}` rows ordered by recency → Enter/click → `OpenerService.open(new URI(uri))` → existing open handler reveals the tab. Back works the moment any editor navigation location exists; otherwise the button renders disabled-with-tooltip per contract.

### Recommended Project Structure

```
theia/extensions/chrome-bar/
├── package.json                  # name @powerbrowser/chrome-bar 0.1.0; deps: @theia/core (+filesystem/userstorage only if persisting); theiaExtensions frontend+backend
├── tsconfig.json                 # copy tab-uris tsconfig (CommonJS, ES2017, jsx react, decorators)
└── src/
    ├── browser/
    │   ├── chrome-bar-frontend-module.ts   # ContainerModule: widget, contributions, RPC proxy factory
    │   ├── chrome-bar-widget.tsx           # React widget: buttons, pill, dropdown, toggle (40px, full-bleed)
    │   ├── chrome-bar-commands.ts          # CommandContribution: stable powerbrowser.chrome-* ids + labels (UI-SPEC copy verbatim)
    │   ├── chrome-bar-keybindings.ts       # KeybindingContribution: Ctrl+L / Cmd+L focus + select
    │   ├── chrome-bar-suggestion-service.ts# Frontend interface + proxy token (searchByPrefix contract)
    │   └── chrome-bar.css                  # CSS layer: sketch tokens, --theia-* delegation, no font-family literal
    └── node/
        ├── chrome-bar-backend-module.ts    # ContainerModule: ConnectionHandler → JsonRpcConnectionHandler(path, () => TabQueryService-ish)
        └── chrome-bar-suggestion-service-impl.ts # Backend impl delegating to TabQueryService.searchByPrefix
```

New files also expected: `theia/extensions/tab-uris/src/node/tab-query-service.ts` (+`searchByPrefix` method — body-only change, no new exports, registry-shape gate unaffected), `scripts/verify-chrome-bar-*.mjs` (2–3 new checks), `scripts/verify-platform.sh` (+rows), phase SUMMARY verdict entry.

### Pattern 1: Top-area bar widget via FrontendApplicationContribution
**What:** A `Widget` (React) added once at startup to area `'top'` — the plain `Panel` (`theia-top-panel`) stacked above the side areas in the box layout. Not tracked for current/active state (documented behavior).
**When to use:** This phase — the only full-width, above-the-toolbar, core-patch-free slot.
**Why cheapest:** `'top'` is a declared `ApplicationShell.Area` — `"Area = 'main' | 'top' | 'left' | 'right' | 'bottom' | 'secondaryWindow'"` [VERIFIED: theia/node_modules/@theia/core/lib/browser/shell/application-shell.d.ts:506]; `addWidget(widget, options?: Readonly<ApplicationShell.WidgetOptions>)` with `area?: Area` [VERIFIED: application-shell.d.ts:245 + 542-559]; the top panel is `new Panel()` holding the main menu [VERIFIED: theia/node_modules/@theia/core/lib/browser/shell/application-shell.js:574-579] assembled as `[topPanel, sideAreas, statusBar]` top-to-bottom [VERIFIED: application-shell.js:621].
**Coupling to handle:** the whole top panel hides with `window.menuBarVisibility` (`setTopPanelVisibility` hides `this.topPanel`) — observed via tool [VERIFIED: application-shell.js:300-302]. Mitigation: keep menu visible by default (mock order includes menubar) and never assert bar visibility independent of panel visibility; document as Pitfall 1.

### Pattern 2: Commands + keybindings, statically bound
**What:** `CommandContribution.registerCommands` + `KeybindingContribution.registerKeybindings`, bound in the frontend `ContainerModule` at load (the D-50 rule: late-bound contributions are permanently invisible after first enumeration — precedent `BrowserWindowCommandContribution` [CITED: theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:83-91]).
**When to use:** All six bar actions (back/forward/reload/new-tab/focus-address + three mode-select commands or one parameterized command).
**Example:**
```typescript
// Source: vendored @theia/core 1.74.1 — CommandContribution / KeybindingContribution shapes
// theia/node_modules/@theia/core/lib/common/command.d.ts:81,
// theia/node_modules/@theia/core/lib/browser/keybinding.d.ts:44,
// in-tree binding precedent: tab-uris-frontend-module.ts:90-91
bind(ChromeBarCommandContribution).toSelf().inSingletonScope();
bind(CommandContribution).toService(ChromeBarCommandContribution);
bind(KeybindingContribution).toService(ChromeBarKeybindingContribution);
```

### Pattern 3: First TabQueryService consumer over standard JSON-RPC
**What:** Backend `bind(ConnectionHandler).toDynamicValue(ctx => new JsonRpcConnectionHandler(PATH, () => ctx.container.get(SuggestionService)))`; frontend proxy via `WebSocketConnectionProvider.createProxy`. All three symbols verified in the pinned tree: `ConnectionHandler` unique symbol [VERIFIED: theia/node_modules/@theia/core/lib/common/messaging/handler.d.ts:3]; `JsonRpcConnectionHandler` / `JsonRpcProxyFactory` classes [VERIFIED: theia/node_modules/@theia/core/lib/common/messaging/proxy-factory.d.ts:174-179]; `createProxy<T>(container, path, arg?)` static + instance [VERIFIED: theia/node_modules/@theia/core/lib/browser/messaging/ws-connection-provider.d.ts:9-12].
**When to use:** The suggestion path — and it simultaneously un-STAGES `TabQueryService` (bound, no consumer, "do not cite it as the query-API delivery until that consumer exists" [VERIFIED: theia/extensions/tab-uris/src/node/tab-query-service.ts:1-27]).
**New query to add** (body-only, no new exports): `searchByPrefix(prefix: string, limit: number): TabQueryRow[]` — `SELECT uri,url,title,last_active FROM tabs WHERE url LIKE :q ESCAPE '\' OR title LIKE :q ESCAPE '\' ORDER BY last_active DESC LIMIT :n` with `:q` bound (caller escapes `\`, `%`, `_`), mirroring the existing `listByRecency` ordering contract (recency serves UI reads; chrome `listTabRows` orders by URI for sweep set-equality [VERIFIED: tab-query-service.ts:117-134]). Never-throw convention (`[]` on failure) inherited from all three existing methods.

### Pattern 4: Status-bar tab-count chip via StatusBar.setElement
**What:** `StatusBar.setElement(id, entry: StatusBarEntry)` with `StatusBarAlignment` [VERIFIED: theia/node_modules/@theia/core/lib/browser/status-bar/status-bar.d.ts:26 + status-bar-types.d.ts:4-55] asserting the tabs invariant on every mode switch (sketch pattern, UI-SPEC bar-placement section). Entry text = plain count, no internals.
**When to use:** Phase 13 (chip is the invariant assertion the spike's "selection intact" claim leans on).

### Anti-Patterns to Avoid
- **Moving the tab bar instead of the widgets (spike):** `TabBar` instances belong to dock layouts; relocate by re-adding *widgets* to another area via `shell.addWidget(widget, {area})` and asserting with `getAreaFor` [VERIFIED: application-shell.d.ts:426] / `getTabBarFor` [VERIFIED: application-shell.d.ts:439] / `allTabBars` [VERIFIED: application-shell.d.ts:453]. Touching `mainPanel`/`topPanel` internals directly is core-structure surgery without a core patch — the failure this spike exists to rule out.
- **Re-spelling the browser-window command id:** import `OPEN_BROWSER_WINDOW_COMMAND_ID` (`'powerbrowser.open-browser-window'` [VERIFIED: theia/extensions/tab-uris/src/browser/browser-window-command.ts:14]) — the verify row reads the same export, so a copy drifts silently.
- **Adding public members to TabUriRegistry:** the bridge contract asserts `getViewContribution, parseName, createWidgetOptions, uriOf` by set equality — an addition goes red [VERIFIED: scripts/verify-registry-shape.mjs:66-71 + checkShape]. Suggestion plumbing lives in the new extension.
- **Hand-kept expectation lists in new checks:** derive actuals from the tree at check time (registry-shape and shell-error-copy precedent, CLAUDE.md rule 2); every new check ships `--self-test` with planted-addition AND planted-removal faults.
- **Asserting on the absence of a log line** (CLAUDE.md rule 1) — prove the emitter belongs to code under test or assert on positive artifacts (command present, widget present, verdict file parses).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Back/forward history stack | Custom navigation stack in the bar | `NavigationLocationService.back()/forward()`, `canGoBack()/canGoForward()` | Stack, pointer, dedup, and recently-closed already implemented and tested upstream (`navigation-location-service.spec.*` ships in-tree) |
| Command enablement plumbing | Manual disabled-state bookkeeping | Command `isEnabled` + toolbar `onDidChange` re-render (`RenderedToolbarAction`/`ReactTabBarToolbarAction.onDidChange` [VERIFIED: tab-bar-toolbar-types.d.ts:36-46]) | The registry already re-renders on change events; hand state desyncs from `canGoBack` |
| Frontend↔backend transport | Express route, raw websocket, file-polling | `JsonRpcConnectionHandler` + `createProxy` over the existing authenticated channel | No new network surface, no token-gate re-review, no `verify-endpoints.sh` fallout |
| Suggestion debounce | Timer utils in the widget | `p-debounce` (already pinned; 150ms precedent absorbs duplicate file events [CITED: customize-css-contribution.ts:49-51]) | Same duplicate-event absorption problem the CSS layer already solved |
| Dropdown a11y | Custom focus manager | Roving active-descendant + contracted `:focus-visible` outline (UI-SPEC Color/Focus) on a plain listbox | Contract already specifies the pattern; a second focus system fights shell focus tracking (top-area widgets are untracked by design) |
| URL→tab resolution | New addressability scheme | `OpenerService.open(new URI(...))` through existing `view:`/`terminal:`/`webview:` handlers + `browserTabKeyOf` (`'webview:' + urlSpec` [VERIFIED: theia/extensions/tab-uris/src/browser/browser-tab-uri.ts:26-28]) | UI-SPEC forbids inventing a scheme; empty commit is a no-op |
| CSS cascade vs user layer | `!important` arms race | Extension CSS layer ordered under the `customize.css` re-append-last pattern (`replaceStyleElement` appends fresh element last [VERIFIED: theia/extensions/customize/src/browser/customize-css-contribution.ts:131-144]) | User layer must keep winning; position, not specificity, decides |

**Key insight:** Every hard problem in this phase (history, transport, URI routing, cascade order, command visibility) already has a landed, gated in-tree answer. The phase's novel work is deliberately thin: one widget, one RPC path string, one SQL statement, one spike script, three verify rows.

## Common Pitfalls

### Pitfall 1: Top panel hides with the menu bar
**What goes wrong:** `window.menuBarVisibility` set to hidden hides the entire `theia-top-panel` — chrome bar vanishes with the menu.
**Why it happens:** Visibility is per-panel, not per-widget (`setTopPanelVisibility` hides `this.topPanel` wholesale [VERIFIED: application-shell.js:300-302]).
**How to avoid:** Keep the menu visible by default (mock order menubar→…→workarea assumes it); never write a check asserting bar visibility while menu hidden; note the coupling in the bar widget header.
**Warning signs:** Manual test with compact menu mode; any plan text promising "bar visible independent of menu".

### Pitfall 2: Suggesting from Places instead of tabs.sqlite
**What goes wrong:** Plan proposes `History.fetch` prefix search or reading `places.sqlite` from the Theia backend for "richer" suggestions.
**Why it happens:** Chrome-side point reads (`readHistoryEntry(url)`, `readBookmarkByUrl(url)`, `listBookmarkFolder(guid)` — exact-key only [VERIFIED: PowerBrowserAPI.sys.mjs:749/769/792]) look like a search API; they are not. `History.fetch` is keyed by exact URL [VERIFIED: PowerBrowserAPI.sys.mjs:743-762]; bookmark fetch resolves object/array/null first-item-wins [VERIFIED: PowerBrowserAPI.sys.mjs:769-784].
**How to avoid:** Suggestions = `tabs.sqlite` `{uri,url,title}` rows via `searchByPrefix` only. Places stays chrome-side point reads (projected `{url,title}` / `{guid,title,url}` — never credentials [VERIFIED: PowerBrowserAPI.sys.mjs:753-759, 775-780]).
**Warning signs:** Any new `PlacesUtils` import outside `PowerBrowserAPI.sys.mjs` (internals-boundary check goes red); any Theia-backend open of `places.sqlite` (single-writer violation).

### Pitfall 3: LIKE wildcard injection in prefix search
**What goes wrong:** User types `%` or `_` and the suggestion query degrades to a full-table dump (or `_` matches everything one-char-off).
**Why it happens:** `LIKE :q` binds the *value* safely (no SQL injection — bound params throughout is the writer's standing discipline [VERIFIED: PowerBrowserAPI.sys.mjs:675-679]) but `%`/`_`/`\` remain wildcards inside the pattern.
**How to avoid:** Escape `\`→`\\`, `%`→`\%`, `_`→`\_` before wrapping in `%…%`, with explicit `ESCAPE '\'` clause; cap with `LIMIT :n` (UI cap is 8 rows).
**Warning signs:** Search method without an ESCAPE clause; string-interpolated SQL anywhere near the reader.

### Pitfall 4: D-50 late binding makes contributions invisible
**What goes wrong:** Bar commands/palette entries compile, bind, and never appear.
**Why it happens:** `ContributionProvider.getContributions()` caches on first call and drops the container reference — anything bound after first enumeration (including via `registerLateOpenHandler`-style paths, which exist only for `OpenHandler`) is permanently invisible [CITED: tab-uris-frontend-module.ts:14-28, 83-91].
**How to avoid:** Static `bind(...).toService(...)` in the frontend `ContainerModule` at load for `CommandContribution`, `KeybindingContribution`, `MenuContribution`, `FrontendApplicationContribution` — no runtime registration.
**Warning signs:** Dynamic `bind` after `onStart`; palette entry missing while unit-level registration "looks right".

### Pitfall 5: Spike moves widgets but breaks identity
**What goes wrong:** Strip "moves" but selection is lost, widgets duplicate, or URIs fork (two widgets, one address).
**Why it happens:** Re-creating widgets in the target area instead of re-parenting live ones; or passing `{}` options where the native path passes nothing, forking `WidgetManager` dedup keys (the D-46 hazard documented on `createWidgetOptions` [CITED: tab-uri-registry.ts:98-112]).
**How to avoid:** Move = `shell.addWidget(sameWidgetInstance, {area})` only; assert `TabUriRegistry.uriOf(widget)` identical before/after and `shell.getAreaFor` reads the new area; assert no duplicate ids via `getWidgetById`.
**Warning signs:** `getOrCreateWidget`/`createWidget` anywhere in spike code; options objects constructed by hand.

### Pitfall 6: WidgetAreaResolver silently vetoes the spike move
**What goes wrong:** `addWidget(widget, {area:'bottom'})` lands back in `main`.
**Why it happens:** `addWidget` resolves through `widgetAreaResolver.resolveArea(widget.id, requestedArea)` before placing [VERIFIED: application-shell.js:805-806] — a resolver entry can override any request.
**How to avoid:** Spike asserts the *resolved* area (`getAreaFor` after the move), not the requested one; a resolver-forced placement is a RED data point with cause, not a silent pass.
**Warning signs:** Test asserts the call didn't throw instead of asserting where the widget actually lives.

### Pitfall 7: Layout restorer fights relocation persistence
**What goes wrong:** Relocated strip snaps back on reload, or the chrome bar never reappears.
**Why it happens:** `LayoutData` persists main/bottom/left/right only — the top area is not in the persisted shape [VERIFIED: application-shell.d.ts:572-580], so the bar must be re-added every `onStart` (fine), while relocated widgets *are* restored (good for Phase 14, but the spike must distinguish "move works" from "move persists").
**How to avoid:** Spike asserts the live move only; persistence across reload is Phase 14 scope. Bar widget `onStart`-adds unconditionally (idempotent: check `getWidgetById` first).
**Warning signs:** Spike script asserting post-reload geometry; bar added twice (duplicate DOM ids).

## Code Examples

### Top-area widget registration (spike + bar share this call)
```typescript
// Source: vendored @theia/core 1.74.1 — ApplicationShell.addWidget + Area
// theia/node_modules/@theia/core/lib/browser/shell/application-shell.d.ts:245,506
import { ApplicationShell, FrontendApplicationContribution } from '@theia/core/lib/browser';

export class ChromeBarContribution implements FrontendApplicationContribution {
    constructor(private readonly shell: ApplicationShell) {}
    async onStart(): Promise<void> {
        if (!this.shell.getWidgetById(ChromeBarWidget.ID)) {
            await this.shell.addWidget(new ChromeBarWidget(), { area: 'top' });
        }
    }
}
```

### Back/Forward wired to the existing history stack
```typescript
// Source: vendored @theia/editor 1.74.1
// theia/node_modules/@theia/editor/lib/browser/navigation/navigation-location-service.d.ts:54-68
commands.registerCommand(CHROME_GO_BACK, {
    execute: () => navigationLocationService.back(),
    isEnabled: () => navigationLocationService.canGoBack(),
    // isVisible stays true while disabled: "Disabled is styled, never removed" (UI-SPEC)
});
```

### Suggestion RPC contract (frontend token + backend binding shape)
```typescript
// Source: vendored @theia/core 1.74.1 messaging + in-tree TabQueryRow projection
// theia/node_modules/@theia/core/lib/common/messaging/handler.d.ts:3
// theia/node_modules/@theia/core/lib/common/messaging/proxy-factory.d.ts:174
// theia/extensions/tab-uris/src/node/tab-query-service.ts:34-40
export const CHROME_SUGGESTION_PATH = '/services/powerbrowser/chrome-suggestions';
export interface ChromeSuggestionService {
    searchByPrefix(prefix: string, limit: number): Promise<TabQueryRow[]>; // TabQueryRow {uri,url,title,last_active}
}
// backend module: bind(ConnectionHandler).toDynamicValue(ctx =>
//     new JsonRpcConnectionHandler(CHROME_SUGGESTION_PATH, () => ctx.container.get(ChromeSuggestionServiceImpl)));
// frontend module: bind(ChromeSuggestionService).toDynamicValue(ctx =>
//     WebSocketConnectionProvider.createProxy(ctx.container, CHROME_SUGGESTION_PATH)).inSingletonScope();
```

### Address commit through existing URI routing (no new scheme)
```typescript
// Source: in-tree open-handler precedent + browser-tab key rule
// theia/extensions/tab-uris/src/browser/view-open-handler.ts:53-56
// theia/extensions/tab-uris/src/browser/browser-tab-uri.ts:26-28
async commitAddress(raw: string): Promise<void> {
    const text = raw.trim();
    if (!text) { return; } // empty commit is a no-op (UI-SPEC)
    await this.openerService.open(new URI(text)); // view:/terminal:/webview: routing decides
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No Theia-side tab query path | `TabQueryService` readonly reader, **STAGED** (bound, no consumer) | Phase 12 (12-02) | This phase lands the first consumer + `searchByPrefix`; until then "do not cite it as the query-API delivery" [VERIFIED: tab-query-service.ts:1-27] |
| Chrome history/bookmark access absent | Point reads `readHistoryEntry`/`readBookmarkByUrl`/`listBookmarkFolder` via `PlacesUtils` fetch APIs | Phase 12 (12-02) | Exact-key reads only — no prefix search exists chrome-side; suggestions must not depend on one [VERIFIED: PowerBrowserAPI.sys.mjs:743-817] |
| `listTabRows` URI-ordered (sweep set-equality) | `listByRecency` recency-ordered (UI reads) — one order per consumer | Phase 12 (IN-02) | `searchByPrefix` follows the UI side: recency order, capped [VERIFIED: tab-query-service.ts:117-134] |
| New-tab via palette-only command | Same command reused from the bar (import id, add toolbar wiring) | GUI-01 (01-05) | No new channel; blocked-popup error path already exists [VERIFIED: browser-window-command.ts:57-86] |
| Four verify drivers | One `verify-platform.sh` registry; rows appended with `--self-test` | Phase 1 (01-03) | New rows follow the registry-shape / gui01-command file shapes, never new drivers |

**Deprecated/outdated:**
- `WidgetOpenHandler` base for URI opens: hardcodes `area: 'main'`, would misplace panel views — use `AbstractViewContribution.openView` delegation per `ViewUriOpenHandler` header (relevant if address commit ever opens `view:` URIs directly rather than via `OpenerService`).
- `TabBarToolbarContribution` for the bar itself: structurally per-widget inline, not a global bar (see Alternatives Considered). Still the right API for *future* per-tab overflow items — not this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Codicons `chevron-left/right`, `refresh`, `plus`, `lock` exist under those names in Theia 1.74.1's shipped set [ASSUMED] | Standard Stack | Wrong glyph names render blank buttons; mitigate by resolving names against the vendored codicon CSS at plan time (cheap grep) |
| A2 | `OpenerService.open(new URI(webview-url))` from the bar resolves through existing handlers for address-like input without a new `OpenHandler` [ASSUMED] | Code Examples | If raw-URL URIs hit `defaultHandlerPriority` fallthrough, planner adds a narrow chrome-bar `OpenHandler` (priority ≤500, static bind) mapping URL text → `browserTabKeyOf` + stock-window escape; UI-SPEC's "existing tab-URI rules" still hold |
| A3 | `Ctrl+L`/`Cmd+L` free in the browser app's keybinding map (no core conflict requiring `when`-clause scoping) [ASSUMED] | Architecture Patterns P2 | Collision would need a `when` clause or chord; planner checks `keybindingRegistry` at implementation and scopes if red |
| A4 | `better-sqlite3` `LIKE … ESCAPE` + bound `LIMIT` parameter behave per standard SQLite on 13.0.3 [ASSUMED] | Pattern 3 | Low risk (long-stable SQLite + engine); covered by the new check's `--self-test` with `%`/`_` fixtures |
| A5 | BiDi-driven live checks (à la `verify-gui01-command.mjs`, inversify 6.2.2 `_bindingDictionary` walk) remain viable for the chrome-bar command/suggestion rows [ASSUMED] | Validation Architecture | If the frontend internals drifted, rows fall back to static derive-and-compare (command ids from source) + explicit manual UAT; same degradation 01-05 survived |

## Open Questions (RESOLVED)

1. **Reload semantics pre-GUI-02 (RESOLVED: reload stays disabled)**
   - What we know: Theia core ships no reload primitive for shell widgets (verified: no back/forward/reload command surface outside tree-model internals and `NavigationLocationService`, which has no reload). UI-SPEC contracts a disabled Reload "with no navigable current tab".
   - What's unclear: Whether "navigable current tab" will ever be true before GUI-02 web tabs (e.g., mini-browser preview widgets with their own reload).
   - Recommendation: Register `powerbrowser.chrome-reload` now with `isEnabled: () => false` and the contracted tooltip; enablement predicate is Phase 14/GUI-02 scope. Planner records this as the Variant-A-compatible default.
   - Outcome: RESOLVED — 13-04 Task 1 lands back, forward, and reload disabled on the single shared chromeBarHasNavigableTab predicate returning false; enablement stays GUI-02 scope.

2. **Bar above vs below the Theia toolbar (RESOLVED: bar above the strip)**
   - What we know: `'top'`-area placement lands the bar below the menubar but above the main dock's tab strip and its per-tab toolbars — i.e., *above* the Theia toolbar. Below-tab-strip placement has no shell area and is rejected above.
   - What's unclear: Nothing technical — this is the aesthetic call UI-SPEC explicitly grants the planner (Variant A permits either).
   - Recommendation: Take `'top'` (above). The sketch mock order (tabstrip→navbar) is acknowledged as mock-level; UI-SPEC's placement paragraph overrides with planner discretion.
   - Outcome: RESOLVED — 13-05 Task 1 ratifies bar-above-strip as the Variant-A contract with the never-fork-core reason recorded, and 13-05 Task 2 asserts it with a DOM-order placement gate.

3. **Mode-toggle persistence (RESOLVED: in-memory toggle)**
   - What we know: Custom names/persistence are Phase 14 scope (UI-SPEC defers); `user-storage:` + `FileService` precedent exists if needed.
   - What's unclear: Whether Phase 13's toggle should persist the *selection* across reloads or reset to a default.
   - Recommendation: In-memory selection defaulting to the first segment ("Coding"); persistence rides Phase 14's modes-data work. One-line planner decision.
   - Outcome: RESOLVED — toggle stays in-memory defaulting to the first segment; persistence rides Phase 14 modes-data scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | All verify scripts, Theia build | ✓ (observed: repo scripts run under node; vendored tree present) | — (planner runs `node --version` at plan time) | — |
| `@theia/*` 1.74.1 vendored sources | API verification (done this session) | ✓ | 1.74.1 [VERIFIED: theia/applications/browser/package.json:43-92] | — |
| `yarn` (nix `#theia` shell) | Extension build | ✓ via `nix develop .#theia` (project rule; `yarn` does not work outside) | — | No host-shell build — plan tasks must enter the dev shell |
| Firefox ESR + `tabs.sqlite` writer | Live suggestion/roundtrip rows | ✓ (Phase 12 shipped writer; rows present post-launch) | — | Static rows stay green without it; live rows need a headed/headless launch per existing harness |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — the phase is core-patch-free and package-free by contract.

## Validation Architecture

> nyquist_validation is enabled (`.planning/config.json` has no `false`); security_enforcement absent (= enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (static `.mjs` derive-and-compare + BiDi live rows) — no mocha/jest/vitest in this tree's own extensions (verified: no test files, no runner deps in extension package.jsons) |
| Config file | `scripts/verify-platform.sh` CHECKS array (≈line 3640+) |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh --only <label>` per task; full `scripts/verify-platform.sh` per wave |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUI-06 | Bar commands registered with contracted ids+labels | live (BiDi CommandRegistry read, gui01-command shape) | `scripts/verify-platform.sh --only gui06-chrome-bar-commands` | ❌ Wave 0 (new `verify-chrome-bar-commands.mjs` + row) |
| GUI-06 | Prefix search returns ≤8 recency-ordered rows; `%`/`_` escaped | static (`--self-test` fixtures) + live RPC call | `scripts/verify-platform.sh --only gui06-suggestion-search` | ❌ Wave 0 (new `verify-chrome-bar-suggestions.mjs` + row) |
| GUI-06 | Activating a suggestion navigates (UI-SPEC backstop) | live backstop (held-out wired test) | `--only gui06-suggestion-activates` | ❌ Wave 0 (same script, backstop statement; no silent pass) |
| GUI-07 gate | Spike verdict file parses GREEN/RED+cause; GREEN ⇒ core diff clean + identity intact | static derive-and-compare on verdict artifact + `diff-theia-core.sh` | `scripts/verify-platform.sh --only gui07-spike-verdict` | ❌ Wave 0 (new `verify-strip-spike-verdict.mjs` + row) |
| GUI-04 (guard) | Registry shape unchanged | existing static | `--only gui04-registry-shape` | ✅ exists |
| Hard rule | No new Firefox-internal touchpoint | existing static | `--only internals-catalogue` | ✅ exists |
| Hard rule | No Theia-core modification | existing static | `scripts/diff-theia-core.sh` (row per registry) | ✅ exists |

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick`
- **Per wave merge:** quick + the three new `--only` rows
- **Phase gate:** Full suite green before `/gsd-verify-work` (deferred per standing nonstop rule — record, keep going)

### Wave 0 Gaps
- [ ] `scripts/verify-chrome-bar-commands.mjs` (+ `--self-test`: planted id removal / label drift / duplicate id) — covers GUI-06 registration
- [ ] `scripts/verify-chrome-bar-suggestions.mjs` (+ `--self-test`: planted unescaped-wildcard fixture, limit breach) — covers GUI-06 search + activation backstop
- [ ] `scripts/verify-strip-spike-verdict.mjs` (+ `--self-test`: malformed verdict, GREEN-with-dirty-core-diff) — covers GUI-07 gate
- [ ] Three registry rows in `scripts/verify-platform.sh` CHECKS array (+ three `-self-test` rows)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (new) | Unchanged: sidecar token gate (`token-gate`, `side04-token-not-in-environment` row); RPC rides the existing authenticated channel, mints nothing |
| V3 Session Management | no | No session state added (mode selection in-memory; no cookie/token handling) |
| V4 Access Control | no | No new principal or capability; bar executes caller's own commands |
| V5 Input Validation | **yes** | Address text → `URI` parse + existing handlers only (never `eval`/shell); search input → bound `LIKE` with wildcard escaping (Pitfall 3); empty commit no-op |
| V6 Cryptography | no | No crypto; never hand-roll (nothing to roll) |

### Known Threat Patterns for Theia-extension + readonly-sqlite stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| LIKE-wildcard dumping via `%`/`_` in suggestion input | Information disclosure | Escape wildcards + `ESCAPE` clause + `LIMIT` cap (Pitfall 3) |
| Credential leak through suggestion rows | Information disclosure | Rows project `{uri,url,title,last_active}` only — the writer never stores secrets and Places projections carry address/title only [VERIFIED: PowerBrowserAPI.sys.mjs:753-759]; never add columns to the projection without review |
| Second writer on `tabs.sqlite` | Tampering (corruption class, REQUIREMENTS out-of-scope) | Reader opens readonly + asserts `db.readonly` (existing guard [VERIFIED: tab-query-service.ts:78-86]); chrome `PowerBrowserAPI` stays sole writer |
| New privileged channel to chrome | Elevation of privilege | No new channel: candidate-A `window.open` reuse, JSON-RPC over existing transport, zero `PowerBrowserAPI` additions → `internals-catalogue` stays green by construction |
| User CSS/JS injection via bar | Tampering | Bar renders suggestion titles as text (never `innerHTML`); styling via CSS layer, not inline styles; privileged-JS flag untouched |

## Sources

### Primary (HIGH confidence)
- Vendored `@theia/core@1.74.1` + `@theia/editor@1.74.1` `.d.ts`/`.js` in `theia/node_modules` (shell areas, toolbar registry/types, messaging, navigation service, status bar) — read this session, lines cited
- In-tree sources read this session: `tab-uris-frontend-module.ts`, `tab-uri-registry.ts`, `browser-window-command.ts`, `browser-tab-uri.ts`, `view-open-handler.ts` (partial), `customize-frontend-module.ts`, `customize-css-contribution.ts`, `tab-query-service.ts`, `tab-query-backend-module.ts`, `tab-uris`/`customize`/`branding`/`browser-app` `package.json`s, `PowerBrowserAPI.sys.mjs` (SQL-01/SQL-04 region), `INTERNAL-APIS.md`, `verify-registry-shape.mjs`, `verify-gui01-command.mjs` (partial), `verify-platform.sh` (registry region), ROADMAP Phase 13 entry
- Locked contracts: `13-CONTEXT.md`, `13-UI-SPEC.md`, `REQUIREMENTS.md` GUI-06/GUI-07, sketch `references/chrome-bar-and-navigation.md`

### Secondary (MEDIUM confidence)
- None — no external lookup was needed (zero new packages, all APIs vendored)

### Tertiary (LOW confidence)
- A1–A5 in Assumptions Log (codicon names, raw-URL opener routing, keybinding conflicts, LIKE ESCAPE portability, BiDi harness reuse) — each tagged `[ASSUMED]` with a cheap plan-time check

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every API verified in the pinned vendored tree; no new packages per locked UI-SPEC
- Architecture: HIGH — contribution points, RPC shape, and shell areas read from exact-version sources; two alternatives rejected on structural (not preferential) grounds
- Pitfalls: HIGH — four of seven grounded in code already read (visibility coupling, D-50, dedup fork, resolver override); three are contract/gap analysis marked accordingly
- Spike procedure: MEDIUM — move/assert APIs verified, but the live move itself is unexecuted by definition (that execution IS the phase's exit gate)

**Research date:** 2026-09-06
**Valid until:** 30 days (stable: Theia 1.74.1 pinned; contracts locked) — re-verify only if the ESR/Theia pin moves
