# Phase 14: Modes + Windows & Setups — Research

**Researched:** 2026-09-06
**Domain:** Theia 1.74.1 shell modes (perspectives), secondary windows, user-storage persistence
**Confidence:** HIGH (mechanisms verified against the pinned tree; two live behaviors flagged for probe)

## Summary

Phase 14 needs no new packages, no new transports, and no new persistence substrate. Theia 1.74.1 — the exact pinned version in `theia/package.json` — already ships the two hard mechanisms this phase looks like it must invent: a **`PerspectiveService`** (modes as registered descriptors with per-mode saved layouts, first-activation placement rules, and stock startup restore) and a **`SecondaryWindowHandler` + `DefaultSecondaryWindowService`** (single-widget dependent windows over a prebuilt `secondary-window.html` asset, with core-close-kills-dependents already implemented). Both are consumed as `@theia/core` APIs from a `@powerbrowser/*` extension, so the never-fork-core rule is satisfied by construction, and `scripts/diff-theia-core.sh` proves `theia/node_modules/@theia/*` matches the lockfile rather than a local edit.

Persistence for custom modes and named setups belongs in **user-storage JSON files** (`modes.json`, `setups.json` beside the `customize.css` precedent) — not in `tabs.sqlite`. The Theia frontend has no write channel to the chrome side (the JSWindowActor fallback was deliberately rejected at GUI-01 ratification), and the backend opening `tabs.sqlite` read-write would be a second writer, which `REQUIREMENTS.md` bars as a corruption class. Setup snapshots (geometry + tab URIs + mode) can be assembled entirely Theia-side and restored entirely Theia-side, so no chrome work is needed at all.

**Primary recommendation:** Register the three shipped modes as `PerspectiveDescriptor`s (Coding/Browsing/Organising) in the chrome-bar extension, persist customs + setups as user-storage JSON, host dependents with the stock secondary-window service, and gate the one load-bearing unknown — whether `window.open('secondary-window.html')` survives the shell's stock-chrome fallthrough — with a BiDi probe reusing the 13-01 harness before committing to the chrome-side fallback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 13-01 spike verdict RED is binding: Variant-A fallback. No relocation work in this phase.
- Modes are data with shipped defaults (coding/browsing/organising); custom modes save current layout.
- Tabs invariant across every switch (status-bar chip pattern from Phase 13).
- Core + dependents: sub-windows host tab content only; core-close-full-kill.
- Sketch findings skill auto-loads when building UI.

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
| GUI-07 | Coding/browsing/organising modes (customizable, shipped defaults); side panels slide; every tab persists across switches; strip stays top per RED verdict | PerspectiveService descriptors + `collapseAreas` + `switchPerspective`; tabs invariant via layout save/restore + `healLayoutData`; chip pattern already in chrome-bar widget |
| GUI-09 | Core + dependent windows with named setups (geometry, tab placement, mode); core-close kills session; next launch restores; sub-windows host tab content only | SecondaryWindowHandler dependents; setups.json + modes.json in user-storage; restore contribution ordered after core `restoreLayout`; core restorer + last-session applicator |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

1. **Never fork or patch Theia core** — additions are `@powerbrowser/*` extensions; upstream adopted by re-pinning only. Enforced by `scripts/diff-theia-core.sh`. Consequence: modes/dependents/setups must compose stock `@theia/core` APIs (PerspectiveService, SecondaryWindowHandler, FileService/user-storage); any design needing a core edit is reshaped, not patched.
2. **Never modify Gecko outside the patch stack** — `upstream/` never hand-edited; Firefox internals reachable only through `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, catalogued in `powerbrowser/INTERNAL-APIS.md`, enforced by `scripts/check-internals-boundary.sh`. Consequence: Phase 14 should need zero chrome-side changes; the only permitted chrome fallback (secondary-window opener) goes through the existing boundary file.
3. **Design for the bridge** — nothing welds Theia to full-window presentation; `TabUriRegistry`'s exported shape is asserted by `scripts/verify-registry-shape.mjs`. Consequence: setup tab-placement must reference opaque tab URIs (the registry key space), never widget instances or shell-internal ids.
4. **No space in repo path** — `/home/chris/coding/Power-Browser` compliant; probes/scratch must not live under a spaced path.
5. **Theia is default GUI; stock chrome reachable** — GUI-01's `window.open(url, '_blank')` → stock chrome path is load-bearing and constrains dependent-window choice (see Q3).
6. **One driver, one registry** — new checks are rows in `scripts/verify-platform.sh` with `--self-test`, derive-from-tree (never hand-kept expectation lists), never assert on absence of a self-emitted log line.
7. **User-facing copy** — no internal identifier in UI text; product named "Power Browser"; plain language + real on-screen next step. 14-UI-SPEC copy table is verbatim contract.
8. **Residual-brand scan is a permanent gate** — stage new files before trusting `scan-brand-residue`.
9. Builds run in Nix shells (`nix develop .#theia` for Theia work); `yarn` unavailable on host; full Gecko build is ~47–54 min — irrelevant here (no Gecko changes planned).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mode definitions + switching | Theia frontend (`@powerbrowser` extension) | — | Shell layout is frontend state; PerspectiveService owns per-mode layouts |
| Custom modes / setups persistence | Theia frontend (user-storage files) | — | Only tier that both produces and consumes the data; no write channel to chrome exists |
| Dependent window hosting | Theia frontend (secondary-window service) | — | Single-widget hosting without a second IDE frame is a frontend shell concern |
| Tab placement references | Theia frontend (registry URIs, read-only SQL) | Chrome writer (owns `tabs.sqlite` rows) | Placement *references* opaque URIs; row *writes* stay with the single chrome writer |
| Session end / relaunch restore | Theia frontend (restorer + applicator) | Chrome supervisor (process lifecycle) | Layout/mode/geometry restore is frontend state; process kill is the existing quit path |
| Launch geometry (core window frame) | OS window manager / shell `persist` | Theia applicator (secondary rects) | `powerbrowser.xhtml` already persists `screenX screenY width height sizemode` [VERIFIED: powerbrowser/shell/powerbrowser.xhtml:25]; setups record dependent rects verbatim per UI-SPEC |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@theia/core` PerspectiveService | 1.74.1 (pinned, stock upstream) | Mode descriptors, switching, per-mode layout save/restore | Ships in the pinned tree; `diff-theia-core.sh` proves `node_modules/@theia/*` matches lockfile integrity, not a local edit [CITED: scripts/diff-theia-core.sh stage 1 `yarn check --integrity`, stage 2 fresh-install `diff -rq`] |
| `@theia/core` SecondaryWindowHandler + DefaultSecondaryWindowService | 1.74.1 (pinned, stock upstream) | Dependent windows hosting exactly one extracted widget | Bound by default in core (`frontend-application-module.js:374` [CITED]); `secondary-window.html` generated and already built at `theia/applications/browser/lib/frontend/secondary-window.html` [CITED: file present] |
| `@theia/userstorage` UserStorageUri + `@theia/filesystem` FileService | 1.74.1 (pinned) | `modes.json` / `setups.json` persistence beside `customize.css` | In-tree precedent with documented boot-chain rules [VERIFIED: theia/extensions/customize/src/browser/customize-css-contribution.ts:1-145] |
| Existing `@powerbrowser/chrome-bar` toggle + tab-count chip | tree (Phase 13) | Mode switch affordance; tabs-invariant assertion | Toggle segments + `publishTabCount()` already shipped [VERIFIED: theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:60,227-249,366-370] |
| Existing `@powerbrowser/tab-uris` registry + readonly `TabQueryService` | tree (Phases 11–13) | Tab identity (opaque URIs); read-only placement validation | Single-writer invariant; Theia side never opens `tabs.sqlite` read-write [VERIFIED: theia/extensions/tab-uris/src/node/tab-query-service.ts:47-98] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ApplicationShell` collapse/expand + `getLayoutData`/`setLayoutData` | 1.74.1 | Panel application inside `onActivate`, layout snapshot for "save current layout as mode" | Only inside perspective hooks or setup applicator — never ad-hoc per-view surgery |
| `AbstractViewContribution` open/close | 1.74.1 | Organising placeholder show/hide; healing closed views on setup restore | Placeholder is one view contribution toggled by the Organising descriptor |
| `FrontendApplicationStateService` ('ready') | 1.74.1 | Ordering setup restore after core layout restore | Setup applicator trigger |
| `scripts/lib/firefox-bidi.mjs` `withFirefoxPage` | tree | Live probes (popup survival, tab-count oracle, geometry roundtrip) | Reuse 13-01 harness pattern; temp profile, removed in `finally` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PerspectiveService | Hand-rolled ModeService with rule table + collapse/expandPanel calls | Rejected: re-implements saved-layouts, healing, startup restore, and reset that core already ships and persists; every line is new verify surface for zero gain |
| user-storage JSON | New `tabs.sqlite` tables (`modes`, `setups`) via single writer | Rejected: Theia frontend has no write channel to chrome (JSWindowActor deliberately not implemented at GUI-01 ratification); backend writes = second writer = out-of-scope corruption class. See Q2 |
| user-storage JSON | `StorageService` (localStorage) for modes/setups | Rejected for the payload: origin-keyed (`http://127.0.0.1:PORT`), unreadable to node verify scripts without a browser; core already uses it for its own `perspective-layouts` key — ours must be file-inspectable. Acceptable only for the tiny active-mode pointer if ever needed |
| Theia secondary windows | Chrome shell windows (`Services.ww.openWindow` + `powerbrowser.xhtml`) | Rejected as primary: a second shell window boots a second full IDE frame (chrome bar, toggle, panels, status bar) — an explicit UI-SPEC violation ("never a second IDE frame"). Kept only as the opener fallback (same `secondary-window.html` asset, chrome-side `window.open`) if the popup probe fails |

**Installation:**

```bash
# No new packages. All APIs are in the pinned @theia/* 1.74.1 tree.
```

**Version verification:** `@theia/core` `1.74.1` confirmed in `theia/node_modules/@theia/core/package.json` (`"version": "1.74.1"`) matching all 50 `resolutions` pins in `theia/package.json` [CITED]. No registry lookup needed — nothing is added.

## Package Legitimacy Audit

No external packages are installed in this phase — all mechanisms are stock `@theia/*` 1.74.1 APIs already pinned in `theia/package.json`, plus in-tree `@powerbrowser/*` extensions. The legitimacy gate is skipped with reason (nothing to check); the supply-chain-relevant proof is `diff-theia-core.sh` (node_modules matches lockfile) and `verify-extension-pins.mjs` (existing registry row).

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
User gesture (chrome-bar toggle / command / setup list)
        │
        ▼
┌─ ModeService (@powerbrowser, frontend) ─────────────────┐
│  shipped descriptors: coding / browsing / organising     │
│  customs: built from user-storage modes.json at startup  │
│  current state mirrored to chrome-bar toggle segments    │
└───────┬──────────────────────────────────────────────────┘
        │ switchPerspective(id)   [stock @theia/core]
        ▼
┌─ PerspectiveService ────────────────────────────────────┐
│  saves current layout → restores target layout           │
│  (or viewPlacements+collapseAreas on first activation)   │
│  healLayoutData reopens shared widgets closed elsewhere  │
│  persists {activePerspectiveId, layouts} → StorageService│
│  key 'perspective-layouts' (core's own restore on boot)  │
└───────┬──────────────────────────────────────────────────┘
        │ panels slide ≤200ms / placeholder toggles
        ▼
  ApplicationShell (strip untouched, always top — RED binding)
        │  tabs never unmount; chip re-asserts count
        ▼
  StatusBar tab-count chip  ←→  TabUriRegistry (opaque URIs)

Dependent windows (GUI-09):
  moveWidgetToSecondaryWindow(widget) → window.open('secondary-window.html')
  → bare dock host, one widget, no IDE chrome
  → core unload closes dependents (stock shutdown listener)

Setups (GUI-09):
  snapshot: geometry (DOM) + tab URIs (registry/WidgetManager) + mode id
  → user-storage setups.json → restore applicator (post-ready)
```

File-to-implementation mapping belongs in the planner's task breakdown, not here; the natural homes are: mode descriptors + toggle wiring in `theia/extensions/chrome-bar/` (or a sibling `@powerbrowser/modes` extension per 13-PATTERNS.md skeleton precedent), setup snapshot/restore beside it, persistence helpers following the customize extension's FileService idiom.

### Recommended Project Structure

```
theia/extensions/<modes-host>/          # chrome-bar or new @powerbrowser/modes (planner picks)
├── src/browser/
│   ├── mode-descriptors.ts            # 3 shipped PerspectiveDescriptors (literals, never flags)
│   ├── mode-service.ts                # customs from modes.json + toggle bridge + fallback notice
│   ├── organising-placeholder-widget.ts  # main-area slot (Phase-15 canvas explicitly out)
│   ├── setups-service.ts              # setups.json snapshot / list / restore / delete
│   ├── dependent-windows.ts           # extract handling + tab-closed state + geometry record
│   └── modes.css                      # layered sheet (locked theme; customize.css overrides)
$THEIA_CONFIG_DIR/
├── modes.json                         # custom modes (user data, never shipped)
└── setups.json                        # named setups incl. last-session auto-restore pointer
```

### Pattern 1: Modes as PerspectiveDescriptors (never manifest flags)

**What:** Each mode is a `PerspectiveDescriptor` registered through `PerspectiveService.registerPerspective`, switched with `switchPerspective(id)`. Shipped defaults are static literals bound at module load; custom modes are descriptors constructed from `modes.json` rows and registered by a startup contribution.
**When to use:** All mode behavior — this replaces any hand-rolled rule table.
**Example:**

```typescript
// Source: theia/node_modules/@theia/core/lib/browser/perspective-service.d.ts (stock 1.74.1)
interface PerspectiveDescriptor {
    id: string;
    label: string;
    /** Widget/view-container ID → target shell area */
    viewPlacements: Map<string, ApplicationShell.Area>;
    /** Areas to collapse on first activation. User can re-expand freely. */
    chromeOptions?: PerspectiveChromeOptions; // { collapseAreas?: ('left'|'right'|'bottom')[] }
    primaryViews?: Partial<Record<ApplicationShell.Area, string>>;
    onActivate?(shell: ApplicationShell): void;
    onDeactivate?(shell: ApplicationShell): void;
}
// Registration + switching (runtime calls, not DI binds):
//   perspectiveService.registerPerspective({ id: 'browsing', label: 'Browsing',
//       viewPlacements: new Map(), chromeOptions: { collapseAreas: ['left','right','bottom'] } });
//   await perspectiveService.switchPerspective('coding');
// Stock commands (Experimental labels — prefer own commands per command-per-action pattern):
//   id: 'perspective.switch' / 'perspective.reset'  (perspective-service.js:62-67)
```

Per-mode shell map from 14-UI-SPEC binds directly: Browsing collapses all three side areas; Coding leaves Explorer visible (placements); Organising collapses all + `onActivate` shows the placeholder widget in main, `onDeactivate` hides it. The strip is never mentioned in any descriptor — RED binding holds structurally.

**Ordering (verified, load-bearing):** `FrontendApplication.start()` awaits `startContributions()` (all `onStart`) *before* `attachShell()` + `restoreLayout()` [CITED: frontend-application.js:59,62,169,178-180]. But the customize-css header documents a boot-chain deadlock when *awaiting* user-storage/backend reads inside `onStart` [VERIFIED: customize-css-contribution.ts:55-65]. Therefore: register the 3 shipped descriptors synchronously in `onStart`, return immediately; load `modes.json` after startup and register customs then; the setup applicator runs on state 'ready', after core's `restoreLayout()` (which persists under StorageService key `'perspective-layouts'` [CITED: shell-layout-restorer.js:55] and tolerates unknown active ids by falling back to default — our applicator then switches to the persisted custom id with zero race).

### Pattern 2: Custom modes + setups as user-storage JSON (customize precedent)

**What:** `modes.json` / `setups.json` addressed as `user-storage:` URIs, read with `(await fileService.read(uri)).value` + `.catch()` → fallback, watched via `fileService.onDidFilesChange` with ~150ms debounce, never created when absent.
**When to use:** All user-authored phase data.
**Example:**

```typescript
// Source idiom: theia/extensions/customize/src/browser/customize-css-contribution.ts:72,90-105
protected readonly modesUri = UserStorageUri.resolve('modes.json'); // beside 'customize.css'
const raw = (await this.fileService.read(this.modesUri)).value;    // .catch → shipped defaults
this.fileService.onDidFilesChange(e => { if (e.contains(this.modesUri)) this.debouncedReload(); });
```

Schema shape (planner finalizes; validation is hand-rolled total parsing — unknown fields dropped, corrupt file → shipped Browsing + contracted fallback notice, never a blank shell or a throw during startup).

### Pattern 3: Dependents via SecondaryWindowHandler (isExtractable precedent)

**What:** `secondaryWindowHandler.moveWidgetToSecondaryWindow(widget)`; mark IDE-frame widgets non-extractable exactly as the tree already does for chat.
**When to use:** Every dependent window; no other opener is primary.
**Example:**

```typescript
// Source precedent: theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts:109-132
widgetManager.onDidCreateWidget(({ factoryId, widget }) => {
    if (factoryId === ChatViewWidget.ID) { (widget as any).isExtractable = false; }
});
// Stock contract: theia/node_modules/@theia/core/lib/browser/widgets/extractable-widget.d.ts:8
//   isExtractable: boolean;
// Stock binding (no work): frontend-application-module.js:374
//   bind(SecondaryWindowHandler).toSelf().inSingletonScope();
```

Core-close-kills-dependents is stock (`registerShutdownListeners` closes all tracked secondary windows on main unload [CITED: default-secondary-window-service.js]). Tab-closed-elsewhere state and geometry recording subscribe to `onDidAddWidget`/`onDidRemoveWidget` [CITED: secondary-window-handler.d.ts:27-36].

### Anti-Patterns to Avoid

- **Hand-rolled mode rule table + manual collapse/expand calls:** duplicates saved-layouts, healing, persistence, and reset that PerspectiveService ships; every line is unverified surface. Register descriptors instead.
- **New `tabs.sqlite` tables for modes/setups:** second-writer corruption class (REQUIREMENTS.md Out of Scope); unreachable from the frontend without a new privileged channel. User-storage files instead.
- **Second shell window (`powerbrowser.xhtml`) as dependent:** boots a second full IDE frame — explicit UI-SPEC violation. Theia secondary window (bare dock host) instead.
- **Awaiting FileService/user-storage reads inside `onStart`:** boot-chain deadlock (customize-css header). Register shipped literals synchronously; load user data after startup.
- **`WidgetOpenHandler` subclass for setup restore:** hardcodes `area: 'main'`, misplacing panel views (same reason `ViewUriOpenHandler` is a bare OpenHandler [VERIFIED: view-open-handler.ts:11-20]). Restore via `AbstractViewContribution.openView` (area-aware) + perspective switch.
- **Menu-visibility-coupled assertions:** the top panel (chrome bar + toggle) hides with `window.menuBarVisibility` [VERIFIED: chrome-bar-widget.tsx:36-39]. No check ever asserts toggle/mode visibility while the menu is hidden.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mode switching + per-mode layouts | ModeService with rule table, manual panel calls | `PerspectiveService.switchPerspective` + descriptors | Saved layouts, first-activation placements, healing, reset, startup persistence already shipped and stored under `perspective-layouts` |
| Dependent window hosting | Custom popup/iframe host | `SecondaryWindowHandler.moveWidgetToSecondaryWindow` | Bare single-widget host, shutdown cascade, focus/restore events; prebuilt `secondary-window.html` in the shipped app |
| Layout snapshot/restore | Own serializer over shell internals | `ApplicationShell.getLayoutData/setLayoutData` + core `ShellLayoutRestorer` | Core owns the format and its migration chain; custom serialization drifts on every Theia re-pin |
| User-data persistence + hot reload | Own file watcher/poller | FileService + `UserStorageUri` + `onDidFilesChange` + `p-debounce` | Exact customize.css precedent incl. truncate-then-write and atomic-rename races |
| Opener/handler timing (late binds) | Static bind after first use | `registerLateOpenHandler` escape hatch | `ContributionProvider` caches on first enumeration (D-50); late static binds are permanently invisible |
| Tab identity in setups | Widget ids / shell paths | `TabUriRegistry` opaque URIs | Exported shape is the bridge API (`verify-registry-shape.mjs`); widget ids fork under dedup (D-46) |

**Key insight:** Phase 14 is a composition phase, not a construction phase. Both hard problems (stateful mode switching, out-of-shell widget hosting) are solved code in the pinned tree with in-tree usage precedents; the phase's real work is descriptors, JSON schemas, the toggle bridge, and verify rows.

## Common Pitfalls

### Pitfall 1: Popup fallthrough to stock chrome (load-bearing unknown)

**What goes wrong:** `DefaultSecondaryWindowService.createSecondaryWindow` opens the dependent with `window.open('secondary-window.html', name, 'popup=1,…')` [CITED: default-secondary-window-service.js:87-93]. In this shell the Theia frontend is remote content in `<xul:browser remote="true">` with no `nsIBrowserDOMWindow`, so content `window.open` falls through `nsWindowWatcher` → `CreateNewContentWindow` → stock `BROWSER_CHROME_URL` — the exact path GUI-01 exploits [VERIFIED: browser-window-command.ts:27-56]. The secondary frame may open as stock chrome (or be blocked for lack of user activation on drag-initiated extracts).
**Why it happens:** Shell architecture, not Theia behavior — stock Theia assumes a real browser tab host.
**How to avoid:** BiDi probe FIRST (plan Task 0): `moveWidgetToSecondaryWindow` on a live build, observe what opens. Fallback (only if red): chrome-side opener in `PowerBrowserAPI.sys.mjs` (catalogued `Services.ww.openWindow` precedent, `INTERNAL-APIS.md` browser-window row) loading the backend's `secondary-window.html` URL in a minimal chrome window — same asset, no new IDE frame, no new patch.
**Warning signs:** Probe shows `about:blank`/stock chrome instead of the extracted widget; `messageService.error` popup-blocked text in logs.

### Pitfall 2: `onStart`-awaited user-data reads deadlock boot

**What goes wrong:** Awaiting `FileService.read(user-storage:…)` inside `onStart` re-enters the boot chain (`UserStorageContribution.createProvider` awaits a backend RPC needing the post-`startContributions` connection).
**Why it happens:** `startContributions()` is awaited by `start()`; anything it awaits that needs the connection never resolves.
**How to avoid:** Synchronous shipped-descriptor registration in `onStart`; fire-and-forget/async-after-ready for `modes.json`/`setups.json` + applicator (customize-css `applyCss` pattern verbatim).
**Warning signs:** Sidecar hangs after "Start frontend contributions" with no shell attach; CPU-idle hang (not a crash).

### Pitfall 3: Custom active perspective lost across relaunch

**What goes wrong:** Core `restoreLayout` calls `setActivePerspectiveId(persistedId)`; unknown ids are rejected → silent fallback to default, and the user's custom mode never re-applies.
**Why it happens:** Custom descriptors register after startup (Pitfall 2's fix) while core restores during startup.
**How to avoid:** Setup/mode applicator (post-ready) reads the persisted active id (core StorageService `perspective-layouts` key) and `modes.json`, registers customs, then `switchPerspective` to the persisted id. Deterministic re-application, no race; one extra layout pass on custom-mode launches is accepted.
**Warning signs:** Relaunch always lands on default/Browsing despite a custom mode being active at close.

### Pitfall 4: Extracted-widget close/dispose asymmetry

**What goes wrong:** Closing the tab in core while extracted, or closing the dependent, disposes or strands the widget; restore shows a blank frame or drops the tab — violating both the tabs invariant and the contracted "This tab is closed" state.
**Why it happens:** Stock `restoreWidgets` on `pagehide` re-attaches to main; disposal in one window races the other.
**How to avoid:** Subscribe `onDidAddWidget`/`onDidRemoveWidget`; render the contracted closed-state (title + "Close Window", never blank) when the hosted widget disposes; never re-create a second copy. Probe the close-each-side matrix live (2×2: close in core / close dependent × dirty / clean).
**Warning signs:** Duplicate widget ids after dependent close; blank secondary window; tab missing from core after dependent closes.

### Pitfall 5: Geometry restore stranding windows off-screen

**What goes wrong:** Verbatim rect restore places dependents off-screen after display changes (UI-SPEC mandates verbatim restore, with a held-out overflow backstop).
**Why it happens:** Stored rect outlives the display configuration.
**How to avoid:** Restore verbatim per contract; clamp only to keep the rect reachable when the display cannot contain it (record the clamp as the documented backstop behavior, never silent). `window.moveTo/resizeTo` permission from chrome-hosted content is itself a probe item (cheap, same BiDi session as Pitfall 1).
**Warning signs:** Restored dependents unreachable; focus-return lands nowhere.

## Code Examples

Verified patterns from in-tree sources (values quoted verbatim; line refs are this-session reads):

### Register + switch a shipped mode

```typescript
// Descriptor shape: theia/node_modules/@theia/core/lib/browser/perspective-service.d.ts
import { PerspectiveService } from '@theia/core/lib/browser/perspective-service';

const browsing = {
    id: 'browsing', label: 'Browsing',           // labels: 'Coding' | 'Browsing' | 'Organising'
    viewPlacements: new Map(),                    // UI-SPEC order for toggle segments
    chromeOptions: { collapseAreas: ['left', 'right', 'bottom'] },
};
perspectives.registerPerspective(browsing);
await perspectives.switchPerspective('browsing');
perspectives.onDidChangePerspective(id => toggle.setActive(id)); // re-assert chip
```

### Snapshot current layout as a custom mode (save path)

```typescript
// Layout snapshot: application-shell.d.ts:206 `getLayoutData(): ApplicationShell.LayoutData`
const layout = shell.getLayoutData();
const custom = { name, mode: { panels: { left: shell.isExpanded('left'), /* … */ },
    placements: [...], layout } };               // 'left' | 'right' | 'bottom' are the
await fileService.write(UserStorageUri.resolve('modes.json'), JSON.stringify(store));
// side areas: application-shell.d.ts:509-512 `isSideArea` — collapse/expand only these
```

### Extract a tab into a dependent window

```typescript
// Precedent + binding: tab-uris-frontend-module.ts:109-132, frontend-application-module.js:374
import { SecondaryWindowHandler } from '@theia/core/lib/browser/secondary-window-handler';
secondaryWindowHandler.moveWidgetToSecondaryWindow(widget as ExtractableWidget);
// Non-extractable marking (ChatViewWidget precedent): widget.isExtractable = false;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled mode rule table + manual `collapsePanel` calls (13-RESEARCH-era assumption) | Stock `PerspectiveService` descriptors + `switchPerspective` | Theia 1.74.1 (pinned tree; integrity-proved by `diff-theia-core.sh`) | Phase 14 needs no mode-switching machinery — only descriptors, JSON, and the toggle bridge |
| Modes imagined as `[modes]` manifest flags | Modes are data (descriptors + JSON) | REQUIREMENTS.md Out-of-Scope bar + UI-SPEC contract | No config-schema/generator work; `configuration.toml` untouched |
| Setups assumed to need `tabs.sqlite` tables via single writer | Setups as user-storage JSON assembled/restored Theia-side | This research (Q2/Q4) | Zero chrome-side changes; zero migration chain; node-testable schemas |
| Strip relocation per mode (Variant B) | Strip stays top in all modes (Variant A) | 13-01 spike verdict RED (binding) | No strip-area code anywhere in Phase 14; descriptors never name the strip |

**Deprecated/outdated:**
- Variant-B strip work: closed by RED verdict; the re-probe runway (realign node_modules, re-run) may reopen it only as a recorded decision, never as silent scope.
- `WidgetOpenHandler` subclassing for opens: hardcodes main area — bare `OpenHandler` + contribution `openView` instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong | Cheap plan-time check |
|---|-------|---------|---------------|----------------------|
| A1 | `window.open('secondary-window.html', popup-features)` from Theia content loads a Theia secondary frame (vs stock-chrome fallthrough / popup block) | Q3, Pitfall 1 | High — decides primary vs chrome-side fallback | BiDi probe reusing 13-01 `withFirefoxPage`: extract a widget live, observe URL + content (plan Task 0, gates dependent-window tasks) |
| A2 | `window.moveTo/resizeTo` permitted for core + secondary windows (setup geometry restore) | Q4, Pitfall 5 | Medium — verbatim geometry restore needs it | Same BiDi session: move/resize, read back `screenX/outerWidth` |
| A3 | `secondary-window.html` hosts a bare dock (no chrome bar/toggle/panels/status/strip) matching the dependent contract | Q3 | Medium — extra bars = contract violation | Read built `theia/applications/browser/lib/frontend/secondary-window.html` (static, seconds) |
| A4 | Closing the hosted tab in core leaves the dependent handleable (dispose event observable → contracted closed-state renderable) | Pitfall 4 | Medium — custom close-state work size | Live 2×2 close matrix in the A1 probe session |
| A5 | Core `restoreLayout` ordering (post-`attachShell`, after all `onStart`) holds in the shipped app composition | Pattern 1 | Medium — applicator timing | Already read in `frontend-application.js:59-180`; re-confirm by log order in the probe session (`>>> Restoring the layout state...` after contributions) |
| A6 | `PerspectiveService` label/ordering APIs suffice for the chrome-bar toggle (segment order, custom entries, active marker) without the stock Experimental commands | Pattern 1 | Low — toggle already owns its segments | Static: `getRegisteredPerspectives()` + `onDidChangePerspective` drive existing `MODES` rendering |
| A7 | No new Firefox-internal touchpoint even for the fallback opener (existing `Services.ww.openWindow` catalogue row covers a new URL argument) | Q3 fallback | Low — catalogue amendment at most | `check-internals-boundary.sh --catalogue` after drafting the fallback; amend `INTERNAL-APIS.md` row, no new import |

**If this table is empty:** n/a — seven assumptions above, all with a named check; A1 gates dependent-window implementation order.

## Open Questions

1. **New extension vs extend chrome-bar for modes/setups UI?**
   - What we know: 13-PATTERNS.md gives a copy-verbatim new-extension skeleton (telemetry package.json + tab-uris tsconfig + composition points in `theia/applications/browser/package.json` and root `build:extensions`); chrome-bar already owns the toggle, chip, commands pattern, and CSS layer.
   - What's unclear: planner's size call — toggle bridge + descriptors fit naturally in chrome-bar; setups list/dialogs/placeholder may warrant `@powerbrowser/modes`.
   - Recommendation: planner decides by task count; either way reuse the skeleton + command-per-action + static-binds-at-load idioms, and append the `build:extensions` list by hand.

2. **Exact setups.json schema (multi-window record, per-window active tab, last-session pointer)?**
   - What we know: UI-SPEC fixes the row contract (`{Mode} · {N} window(s) · {M} tab(s)`, 60-char cap, no overwrite) and restore semantics (verbatim geometry, drop-gone tabs, never half-applied unexplained).
   - What's unclear: field names and the last-session auto-restore pointer shape.
   - Recommendation: planner fixes names; verify row asserts schema roundtrip + corrupt-file fallback, deriving the field set from the schema source at check time.

## Environment Availability

Live-probe dependencies (static work needs only node + the Theia shell):

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Built sidecar (`theia/applications/browser/lib` + `secondary-window.html`) | A1/A2/A4 probes | ✓ (observed) | Theia 1.74.1 | Rebuild via `nix develop .#theia` (`tsc -b`, seconds-scale incremental) |
| PowerBrowser binary (`objdir/dist/bin/powerbrowser`) | BiDi probes | ✓ (13-01 ran it) | ESR 153.1.0esr build | Existing build reused, no rebuild (Gecko untouched) |
| `scripts/lib/firefox-bidi.mjs` harness | All live probes | ✓ (13-01 precedent) | tree | Same temp-profile/finally pattern |
| `yarn` in Nix theia shell | Extension builds | ✓ (host has none by rule) | 1.22.22 | `nix develop .#theia --command` |
| node (host) | Verify scripts, probes | ✓ | v24.19.0 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — all probe tooling is the 13-01 precedent rerun.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `tsc -b` (typecheck/build) + `scripts/verify-platform.sh` registry rows with `--self-test`; live BiDi probes for window behavior |
| Config file | `theia/extensions/*/tsconfig.json` (copied verbatim per 13-PATTERNS.md); no unit-test framework in extensions (no `*.spec.ts`, no jest/vitest configs — only `@theia/test` resolution pin) |
| Quick run command | `yarn --cwd extensions/<x> build` then `scripts/verify-platform.sh --quick` (no build/browser/display) |
| Full suite command | `scripts/smoke-theia.sh` then `scripts/verify-platform.sh` (live rows: tab-count oracle, popup survival, geometry roundtrip) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUI-07 | Mode switch preserves all tabs | static (no close/dispose/detach on switch path) + live oracle | `verify-platform.sh --only gui07-mode-switch-tabs-invariant` (+ BiDi count before/after) | ❌ Wave 0 |
| GUI-07 | Shipped descriptors match toggle (ids/order), no strip-area code | static derive-and-compare | `verify-platform.sh --only gui07-mode-toggle-commands` | ❌ Wave 0 |
| GUI-07 | Corrupt custom mode → Browsing + contracted notice | static roundtrip w/ planted corrupt fixture | part of toggle-commands `--self-test` | ❌ Wave 0 |
| GUI-09 | Setup save/restore roundtrip incl. corrupt + gone-tabs semantics | node JSON roundtrip | `verify-platform.sh --only gui09-setup-roundtrip` | ❌ Wave 0 |
| GUI-09 | Dependent hosts one tab view, no IDE chrome; tab-closed state | live BiDi (+ static asset presence) | `verify-platform.sh --only gui09-dependent-window-content` (full-suite only; static half in `--quick`) | ❌ Wave 0 |
| GUI-09 | New copy carries no internal identifiers | static pattern scan over new sources | new row or extended `shell-error-copy-no-internals` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** extension `tsc -b` + `verify-platform.sh --quick`
- **Per wave merge:** `--quick` green on the merged tree
- **Phase gate:** Full suite green before `/gsd-verify-work` (standing nonstop rule: deferred until roadmap executed — recorded, not run)

### Wave 0 Gaps

- [ ] `scripts/verify-mode-toggle-commands.mjs` (+ registry rows, `--self-test` planting id/order drift, corrupt-mode fixture, strip-area reference)
- [ ] `scripts/verify-mode-switch-tabs-invariant.mjs` (+ registry rows; static half `--quick`, BiDi oracle full-suite)
- [ ] `scripts/verify-setup-roundtrip.mjs` (+ registry rows over `setups.json` schema source)
- [ ] `scripts/verify-dependent-window-content.mjs` (+ registry rows; static asset + `isExtractable` derivation `--quick`, live extraction full-suite)
- [ ] Copy-no-internals coverage for new sources (new row or derived extension of `verify-shell-error-copy.mjs`)
- [ ] A1/A2/A4 BiDi probe reusing 13-01 harness (plan Task 0 — gates dependent-window task order, scratch under `.tmp-*/`, removed at closeout)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth surface; suggestion/backend channel unchanged |
| V3 Session Management | no | No session semantics added (last-session pointer is local UI state, not a session token) |
| V4 Access Control | no | User's own local files; no multi-principal boundary |
| V5 Input Validation | yes | Total parsing of `modes.json`/`setups.json` (drop unknown, corrupt → shipped default + contracted notice, never throw at startup); setup-name cap (60) + empty/duplicate rejection per UI-SPEC; LIKE-style injection n/a (no SQL written) |
| V6 Cryptography | no | None — no secrets, tokens, or crypto in this phase |

### Known Threat Patterns for Theia-frontend + user-storage JSON

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed user JSON crashes startup / blanks shell | Tampering / DoS (self) | Never-throw load: `.catch()` → defaults; corrupt custom → Browsing fallback + status-bar notice; validate geometry numbers before `moveTo` (NaN/Infinity rejected) |
| Popup-blocked or misrouted dependent leaks a half-state | Information / DoS | Null-window → existing error path wording (plain language, next step); never a second copy of the tab; blocked-popup error names the gesture requirement (GUI-01 precedent) |
| Secondary-window postMessage spoofing | Spoofing | Stock Theia `fromMain`/`fromSecondary` markers + same-origin backend pages; no new message channel authored — keep it that way |
| Setup restore resurrecting private-context tabs | Information disclosure | Tab URIs re-open through the existing opener; private tabs never had `tabs.sqlite` rows (writer filters) — restore drops URIs that no longer resolve instead of forcing them |

## Sources

### Primary (HIGH confidence)

- Pinned tree `theia/node_modules/@theia/core@1.74.1`: `perspective-service.d.ts/.js`, `secondary-window-handler.d.ts/.js`, `window/default-secondary-window-service.js`, `window/secondary-window-service.js`, `shell/application-shell.d.ts`, `shell/shell-layout-restorer.js`, `browser/frontend-application-module.js:374`, `browser/frontend-application.js:59-180`, `widgets/extractable-widget.d.ts:8`
- In-tree sources (Read this session): `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`, `chrome-bar-commands.ts`, `chrome-bar-frontend-module.ts`; `theia/extensions/tab-uris/src/browser/{browser-window-command,tab-uri-registry,tab-uris-frontend-module,view-open-handler}.ts`; `tab-query-service.ts`; `theia/extensions/customize/src/browser/customize-{frontend-module,css-contribution}.ts`; `powerbrowser/shell/PowerBrowserAPI.sys.mjs:40-81,580-709`; `scripts/diff-theia-core.sh`, `scripts/verify-platform.sh` registry
- Built asset: `theia/applications/browser/lib/frontend/secondary-window.html` (present)
- 13-01 spike record `13-SPIKE-STRIP-RELOCATION.md` (RED verdict, probe harness, environment versions)

### Secondary (MEDIUM confidence)

- 14-UI-SPEC.md / 13-UI-SPEC.md contracts (authoritative for UI, cited for mechanism precedents)
- 13-PATTERNS.md extension-skeleton precedent; `powerbrowser/INTERNAL-APIS.md` boundary catalogue

### Tertiary (LOW confidence)

- None relied upon — every mechanism claim is tree-read. The seven A-items are explicitly marked unknowns with probes, not tertiary sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — every API read in the pinned tree; versions match pins; integrity proved by existing script.
- Architecture: HIGH — composition of shipped mechanisms with in-tree precedents; ordering verified in `frontend-application.js`.
- Pitfalls: HIGH for static pitfalls (deadlock, fallback, late-bind); MEDIUM for window-routing (A1 probe decides) — flagged honestly, gated as plan Task 0.

**Research date:** 2026-09-06
**Valid until:** 30 days (stable domain: pinned Theia APIs + in-tree precedents; re-check only if Theia re-pinned or 13-01 re-probe flips the verdict)
