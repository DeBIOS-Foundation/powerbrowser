# Phase 15: Panorama Organising - Research

**Researched:** 2026-09-06
**Domain:** Theia-widget freeform canvas + tree over SQL-persisted tab groups, single chrome-side writer
**Confidence:** HIGH (in-repo sources read line-verified; Firefox stock API read from pinned upstream tree)

## Summary

Phase 15 replaces the Phase-14 organising placeholder slot with a Panorama canvas plus a tree toggle over one in-memory group model, persisted in `tabs.sqlite` through the single chrome-side writer. All codebase anchors were read this session: the placeholder widget to replace, the modes/chrome-bar/tab-uris idioms to extend, the v1 writer schema + migration + quarantine precedent to copy, the second-writer gate that constrains every write-path choice, and the stock thumbnail service in the pinned upstream tree.

The write path is the one decision that shapes everything else. Theia runs in a remote `<browser type="content">` and today has exactly one Theia→chrome direction (`window.open`, candidate A). The Theia backend (Node) cannot open `tabs.sqlite` read-write — the second-writer gate fails any such line by design — so group mutations must cross the content→chrome boundary and land in new `PowerBrowserAPI` group methods beside `writeTabRow`. The sanctioned crossing is a JSWindowActor pair: pre-approved as the candidate-B fallback in 01-05, with the boundary guard already prepared for it (`registerWindowActor` sits in FORBIDDEN_PATTERNS so any use must live in the one boundary file plus a catalogue row — procedure documented in WINDOWS.md #13).

**Primary recommendation:** Plain-DOM absolutely-positioned canvas widget (extend the placeholder idiom, not React) + one v1→v2 forward migration adding the groups table and `tabs.group_id` + JSWindowActor write channel with optimistic UI and rollback + chrome-side PageThumbs last-view capture with the contracted text-only fallback as the guaranteed milestone surface. No new npm packages. Piles and type-anywhere search deferred.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Panorama research note (browser-organising-panorama.md) is the interaction authority: pixel-free boxes, header-drag move, corner resize, no snap/grid/auto-fit, semantic zoom, auto-box on canvas drop, piles only if cheap (defer otherwise), type-anywhere search only if cheap.
- Tree is vertical stacked lists over identical group data, never a second store. Kanban retired.
- SQL groups table (id, title, bounds, activeGroupId) + group_id on tab rows; canvas reads/writes via the single chrome-side writer path (Theia side must not open profile SQLite — second-writer gate goes red by design; route through existing readonly query API + writer extension point).
- Thumbnails: PNG last-view snapshots (tab-sql-substrate.md) — recognizable cards without live capture.
- Sketch 002 organising view is the visual reference; sketch-findings skill auto-loads.
- 14-02/14-03 organising placeholder slot is replaced by the real canvas in browsing/organising modes.

### Claude's Discretion

All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Standing autonomous instructions (STATE.md): nonstop by default — verification deferred until roadmap fully executed; plan-phase runs with --no-reversibility-gates; milestone audit gaps/tech debt accepted; cleanup dry-run approved if phase scratch only; halt only on blocker surviving 3 fix-and-retry attempts.

### Deferred Ideas (OUT OF SCOPE)

None — discuss phase skipped.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUI-08 | Freeform Panorama canvas (free drag, corner resize, auto-box on drop, zoom, ungrouped tray) + tree flip over identical group data; SQL groups table + `group_id` on URI-keyed rows; PNG last-view thumbnails; canvas reads/writes only SQL; sessionstore stays restore-authoritative | Canvas pattern + write channel + v2 schema + thumbnail path + verify rows, all below |

## Project Constraints (from CLAUDE.md)

1. Never fork or patch Theia core — `@powerbrowser/*` extensions only; canvas/tree are new contributions in `@powerbrowser/modes`, no new widget framework [VERIFIED: theia/extensions/modes/package.json:8-9 — `"@theia/core": "1.74.1"` pin, frontend-only `theiaExtensions` entry].
2. Never modify Gecko outside the patch stack — `upstream/` never hand-edited; new Firefox-internal touches (PageThumbs reach-through, actor registration) live in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` only, each with an `INTERNAL-APIS.md` catalogue row; `check-internals-boundary.sh` must stay green.
3. Design for the bridge — card keys are `TabUriRegistry.uriOf` / `browserTabKeyOf` opaque URI strings, never parsed; group rows reference them opaquely so `@powerbrowser/browser-bridge` stays landable.
4. No space in repo path — compliant (`/home/chris/coding/Power-Browser`).
5. Theia is default GUI; no custom browser chrome authored — canvas lives inside the organising main-area slot, never touches the tab strip (13-01 RED verdict still binds).
6. One driver, one registry — new checks append rows to `scripts/verify-platform.sh`, never sibling drivers; every new check derives expectations from the tree (never hand-kept lists) and ships a `--self-test` with planted faults going red.
7. Residual-brand scan must exit 0 — stage new files before trusting a green scan; never spell the originating product outside `inventory/brand-tokens.json`.
8. User-facing copy — product named "Power Browser", plain language, real on-screen next step, no internal identifiers (use the 15-UI-SPEC contracted strings verbatim).
9. Builds in Nix shells (`nix develop .#theia` for `tsc`/`yarn`); `--quick` gate before anything expensive.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Canvas drag/resize/zoom rendering | Theia frontend (modes extension widget) | — | Pure presentation over an in-memory model; no privileged API needed |
| Group model + canvas/tree parity | Theia frontend (injectable model service) | — | Both views render one model; flip never reloads per UI-SPEC |
| Group/tab reads | Theia backend (`TabQueryService` readonly handle, extended) | — | Existing sole-reader pattern; same line keeps `readonly: true` so the gate holds |
| Group writes + tab `group_id` writes | Chrome (`PowerBrowserAPI` new methods, single writer) | — | Second-writer invariant; Theia never opens the DB read-write |
| Theia→chrome mutation channel | JSWindowActor pair (new, boundary-file-owned) | — | Only sanctioned content→chrome crossing; candidate-B precedent |
| Thumbnail capture | Chrome (PageThumbs over stock tab browsers) | — | Requires privileged browser elements; Theia side only renders bytes/text |
| Restore authority | sessionstore (unchanged) | — | Bugzilla 1221050 lesson; groups never couple to extData |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@theia/core` widgets (`Widget`, `AbstractViewContribution`, `ConfirmDialog`, `OpenerService`) | 1.74.1 (existing pin) | Canvas/tree widget, close-group dialog, card dive | Only widget framework allowed; placeholder + chrome-bar prove both plain-`Widget` and `ReactWidget` idioms [VERIFIED: theia/extensions/modes/package.json:8] |
| `better-sqlite3` readonly handle | existing pin (tab-uris dep) | Extended `TabQueryService` group reads | Sole-reader pattern already gate-blessed [VERIFIED: theia/extensions/tab-uris/src/node/tab-query-service.ts:83 — `new Database(join(this.profileDir, TAB_QUERY_FILE_NAME), { readonly: true })`] |
| `Sqlite.sys.mjs` (mozStorage) | stock platform | Chrome-side v2 migration + group writes | v1 precedent: WAL pin, version guard, single transaction [VERIFIED: powerbrowser/shell/PowerBrowserAPI.sys.mjs:596-627] |
| `PageThumbs.captureToCanvas` | stock upstream (pinned tree) | Last-view snapshot capture | No new capture code; stock service draws any browser to a canvas [VERIFIED: upstream/toolkit/components/thumbnails/PageThumbs.sys.mjs:226-238] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `p-debounce` | ^2.1.0 (in-tree) | Debounce persisted drag writes / search-if-ever | Same 150ms precedent as chrome-bar pill queries and mode reload [VERIFIED: theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:111] |
| `node:sqlite` `DatabaseSync` | stdlib | Verify-script stage instruments on mkdtemp copies | Second-writer rule (c) carve-out keys on `mkdtempSync` marker in `scripts/` only [VERIFIED: scripts/verify-sql-store-second-writer.mjs:78-84] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain-DOM widget | `ReactWidget` (chrome-bar idiom) | React re-render per mousemove is churn for 60fps drag; direct DOM transform updates are cheaper. Chrome-bar uses React for event-rate UI (keystrokes), not pointer tracking. Use plain `Widget` like the placeholder. |
| JSWindowActor write channel | Theia-backend RPC + staging file swept by chrome | Two-hop, racy (poll/ack protocol to invent), failure semantics murky; actor gives request/response ack for the contracted rollback for free. |
| JSWindowActor write channel | `window.open`-style hack (candidate A shape) | One-way fire-and-forget with no ack and no payload discipline; cannot serve the save-error retry/rollback contract. |
| PageThumbs capture | Live per-card canvases (shipped Panorama's `captureToCanvas` live thumbs) | Live capture per visible card is the heaviest option and the research note already maps thumbnails to PNG last-view snapshots instead. |
| `thumbnail` bytes in `tabs.sqlite` | Files under profile dir referenced by path | Bytes keep one store, one migration, one quarantine unit, and serve through the existing readonly reader; file-per-thumb reintroduces orphan/GC bookkeeping. Cap size chrome-side (see Pitfalls). |

**Installation:**

```bash
# No new packages. Planner must assert this: canvas/tree/tray/cards build on @theia/core + in-tree p-debounce only (15-UI-SPEC Registry Safety).
```

**Version verification:** No new packages, so no registry lookup applies. Existing pins confirmed in-tree: `@theia/core 1.74.1` [VERIFIED: theia/extensions/modes/package.json:8-9], `p-debounce ^2.1.0` [VERIFIED: theia/extensions/modes/package.json:12].

## Package Legitimacy Audit

No external packages installed by this phase. Table intentionally empty — the UI-SPEC Registry Safety gate ("no drag library, canvas library, or component library may be added") is satisfied by construction.

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious SUS:** none.

## Architecture Patterns

### System Architecture Diagram

```text
User pointer/keyboard
        │
        ▼
┌─ OrganisingWidget (Theia frontend, @powerbrowser/modes) ──────────┐
│  toolbar [Canvas|Tree] New Group zoom │ error bar + Retry          │
│  ┌─ Canvas root ────────────────┐  ┌─ Tree root (hidden flip) ──┐  │
│  │ absolute group boxes (x,y,w,h│  │ stacked sections, same     │  │
│  │ header-drag / corner-resize  │  │ GroupModel order/members   │  │
│  │ cards 160px + 160×90 thumbs  │  │ rows 32px, no thumbs       │  │
│  └──────────────────────────────┘  └────────────────────────────┘  │
│  ┌─ Ungrouped tray (144px, always rendered) ───────────────────┐  │
│  GroupModel (single in-memory store; optimistic + rollback)      │  │
└───────────────────────────────────────────────────────────────────┘
        │ reads                          │ mutations (actor msgs)
        ▼                                ▼
┌─ Theia backend ──────────────┐  ┌─ Chrome ────────────────────────┐
│ TabQueryService (extended):  │  │ JSWindowActor parent →          │
│ listGroups/getGroupTabs over │  │ PowerBrowserAPI group methods → │
│ the ONE readonly handle      │  │ tabs.sqlite (single writer)     │
│ (tabs.sqlite, readonly:true) │  │ PageThumbs capture → thumbnail  │
└──────────────────────────────┘  │ sessionstore: restore authority │
                                  │ (read for rebuild only, never    │
                                  │  written with group state)       │
                                  └─────────────────────────────────┘
```

File-to-implementation mapping belongs in the plan, not the diagram. Expected shape: `organising-widget.ts` (replaces `organising-placeholder-widget.ts` behind the same `registerOrganisingSlot` seam), `group-model.ts` (frontend injectable), `group-service.ts` + `group-service-impl.ts` (JSON-RPC read path mirroring `CHROME_SUGGESTION_PATH`), actor child module + `PowerBrowserAPI` group methods, `organising.css` layer extension in `modes.css`.

### Recommended Project Structure

```text
theia/extensions/modes/src/browser/
├── organising-widget.ts       # REPLACES organising-placeholder-widget.ts; canvas+tree+tray roots, toolbar
├── group-model.ts             # single in-memory store; optimistic apply + rollback; active-group state
├── group-service.ts           # read contract (listGroups/getGroupTabs) + RPC path const (verify derives it)
├── mode-descriptors.ts        # UNCHANGED slot seam (open/close already shared)
└── modes.css                  # EXTEND one @layer block: canvas/boxes/cards/tray/tree (no new sheet)
theia/extensions/modes/src/node/  (or tab-uris node/)
├── group-service-impl.ts      # delegates to extended TabQueryService readonly handle
powerbrowser/shell/
├── PowerBrowserAPI.sys.mjs    # EXTEND: group DDL/migration + group write methods + actor registration (sole boundary)
└── GroupActorChild.sys.mjs    # NEW: content-side actor (message validation both directions)
```

### Pattern 1: Plain Widget + direct DOM transforms (canvas)

**What:** Extend the placeholder's plain-`Widget` idiom: build canvas DOM by hand (`data-canvas`, `data-g`, `data-u` hooks per the sketch reference), move boxes by setting `style.transform = translate(x,y)` on pointermove, resize via the corner handle updating w/h, zoom by scaling one inner layer (`transform: scale(z)`, range 25–200%). No Theia dock/canvas primitive exists for freeform 2D — Lumino layout is tiling and contradicts pixel-free positioning, so hand-rolled DOM (shipped Panorama's own `drag.js` + CSS transforms precedent) is the stock answer, not a workaround.
**When to use:** All canvas pointer interaction in this phase.
**Example:**

```typescript
// Source: sketch reference (references/modes-tabs-and-organising.md) + placeholder idiom
// (theia/extensions/modes/src/browser/organising-placeholder-widget.ts:22-52)
const box = document.createElement('div');
box.className = 'pb-org-box';
box.dataset.g = group.id;                       // group identity hook
box.style.transform = `translate(${g.x}px, ${g.y}px)`;
box.style.width = `${g.w}px`; box.style.height = `${g.h}px`;
header.addEventListener('pointerdown', e => { header.setPointerCapture(e.pointerId); /* track dx,dy; move only */ });
handle.addEventListener('pointerdown', e => { /* corner resize only; min 200×144 */ });
```

### Pattern 2: One model, two render roots (parity by construction)

**What:** A single frontend `GroupModel` (ordered groups + membership + activeGroupId) feeds both the canvas root and the tree root; the toggle flips visibility only — never reloads, never loses selection (UI-SPEC contract). Tree rows reuse the same rename/close/active affordances; no thumbnails in tree (contract, not a gap). Any canvas/tree mismatch is then a render bug in one file, never store divergence.
**When to use:** Every mutation path (drag-drop, rename, close, New Group, tray moves) applies to the model first, paints optimistically, then persists (Pattern 3).

### Pattern 3: Optimistic paint + actor ack + contracted rollback (write path)

**What:** Every drop paints immediately, sends one actor message (`moveGroup`/`resizeGroup`/`renameGroup`/`createGroup`/`closeGroup`/`setTabGroup`/`setActiveGroup`), and on nack/timeout shows the contracted save-error bar with Retry; Retry replays once, and on second failure reverts the painted change (UI-SPEC copy contract). Drag-move/resize streams are debounced (≈150ms, in-tree `p-debounce` precedent) with a final commit on pointerup; the chrome side validates every field (id shape, 60-char title cap, finite non-negative bounds, known tab URIs) because content is untrusted. Card dive (click/Enter opens tab) routes through the existing opener — never a new open path.
**When to use:** All canvas→SQL mutations. Reads stay on the existing readonly RPC idiom (`JsonRpcConnectionHandler` at a new path const, impl delegating to `TabQueryService` — mirror of `chrome-bar-backend-module.ts:18-25`).

### Pattern 4: v1→v2 forward migration + quarantine-not-delete (schema)

**What:** Copy the v1 migration shape exactly: `TAB_STORE_SCHEMA_HEAD 1→2`, marker-delimited DDL constant living once in `PowerBrowserAPI.sys.mjs` (verify derives it at check time, never a copy), `tableExists`/`indexExists` pre-checks, DDL + version bump in exactly one `executeTransaction`, newer-than-head refuses loudly leaving the file untouched [VERIFIED: powerbrowser/shell/PowerBrowserAPI.sys.mjs:622-660]. Corruption path copies `quarantineAndRebuildTabStore`: backup to `tabs.sqlite.corrupt-<N>`, remove live + sidecars, rebuild structure, re-seed tab rows from sessionstore (restore authority), group rows rebuild to empty-set-with-titles-dropped [ASSUMED — exact group reseed policy needs a plan-time decision; cheapest: groups rebuilt empty, tabs ungrouped, never invent membership]. Never nest transactions (CR-02: inner blocks behind outer until timeout, then outer rolls back) [VERIFIED: powerbrowser/shell/PowerBrowserAPI.sys.mjs:975-981].

### Anti-Patterns to Avoid

- **Theia-side SQLite write:** any `new Database(` under `theia/` without `readonly: true` on the same line fails the gate naming file:line; `DatabaseSync` outside `scripts/`+`mkdtempSync` instruments fails too [VERIFIED: scripts/verify-sql-store-second-writer.mjs:66-76]. Route every mutation through the actor.
- **Sessionstore-coupled group storage:** geometry + membership live in SQL only (Bugzilla 1221050 removal lesson). Never write group state into sessionstore extData, never read grouping from it.
- **React state per mousemove:** drag updates touch the DOM directly; model commits on pointerup/debounce. No per-frame `setState`.
- **Snap/grid/auto-fit/auto-size:** forbidden by the research note and UI-SPEC; overflow scrolls inside the box, never resizes it.
- **Second error surface:** store failures surface as the single E1/E9 bar (UI-SPEC dismissal); no per-card/per-box spinners or error glyphs.
- **Hand-kept expectation lists in verify scripts:** derive from the tree at check time (DDL markers, RPC path const, command ids, CSS hooks) and compare by set equality; every row gets `--self-test` with planted faults.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag/resize/zoom math | Pointer-event drag engine from scratch with snapping physics | `pointerdown/move/up` + `setPointerCapture` + CSS transforms (shipped Panorama `drag.js` precedent: hand-rolled `iQ` + transforms, no jQuery) | Only three gestures exist (header-move, corner-resize, card-drag); a library adds weight and snap opinions the spec forbids |
| Close-group confirmation | Custom modal | Stock Theia `ConfirmDialog` (setups-service deletes already use it [VERIFIED: theia/extensions/modes/src/browser/setups-service.ts:15]) | Contracted buttons/copy ride the stock dialog; focus/aria free |
| Group reads RPC | New transport | `JsonRpcConnectionHandler` path-const idiom (mirror `CHROME_SUGGESTION_PATH`) over the existing authenticated websocket | No new channel, no token-gate re-review [VERIFIED: theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts:18-25] |
| Thumbnail capture | Theia-side canvas draw or raw `drawWindow` | `PageThumbs.captureToCanvas(browser, canvas, {targetWidth…})` chrome-side | Stock, handles remote content async, pref-gated (`_prefEnabled`) [VERIFIED: upstream/toolkit/components/thumbnails/PageThumbs.sys.mjs:187-202, 226-238] |
| Total parsing of group store | Schema validator lib | Hand-rolled total parse (modes/setups precedent: unknown fields dropped, corrupt degrades to contracted empty state, never throws during startup) | Matches the two shipped services; no new dep; 60-char caps + empty-reverts-title rules live here |
| LIKE/substring search (if search ever ships) | Inline pattern concat | `escapeLikePattern` + bound params + explicit `ESCAPE '\'` (TabQueryService precedent) | Unescaped `%` degrades to full-table dump [VERIFIED: theia/extensions/tab-uris/src/node/tab-query-service.ts:43-45, 153-166] |

**Key insight:** Every hard problem in this phase already has a landed in-tree precedent (writer migration, readonly reader, RPC idiom, total parsing, optimistic chrome-bar queries). The plan's job is extension-point reuse, not invention — the only genuinely new mechanism is the actor pair, and even that follows a pre-approved, guard-prepared procedure.

## Common Pitfalls

### Pitfall 1: Second-writer gate goes red by design on the obvious implementation

**What goes wrong:** Canvas writes groups by opening `tabs.sqlite` from Theia (backend or, worse, frontend via a new Node API); gate fails naming the line; worse, WAL coordination breaks at runtime.
**Why it happens:** The readonly `TabQueryService` looks like the place to "just add a write method."
**How to avoid:** Reads extend `TabQueryService`; writes are actor messages to `PowerBrowserAPI` group methods only. The plan's first task ordering matters: actor + chrome methods land before any canvas mutation code so there is never a commit where the canvas writes directly.
**Warning signs:** Any diff touching `tab-query-service.ts` that adds a non-`SELECT` statement; any `new Database(`/`DatabaseSync(` outside `powerbrowser/shell/` + `scripts/` instruments.

### Pitfall 2: Transaction nesting deadlock in the v2 migration

**What goes wrong:** v2 migration calls `migrateTabStoreToV1`-style helper inside an outer `executeTransaction`; inner blocks until `TRANSACTIONS_TIMEOUT_MS`, outer rolls back — corrupt-looking store, startup degraded.
**Why it happens:** Copying the quarantine shape (migration + inserts) without its sequential-transaction discipline.
**How to avoid:** Migration runs first as its own top-level transaction; row work follows in a second one — sequential, never nested [VERIFIED: powerbrowser/shell/PowerBrowserAPI.sys.mjs:975-981].
**Warning signs:** `executeTransaction` appearing inside another `executeTransaction` callback in the diff.

### Pitfall 3: Actor registration ordering + boundary-guard hole

**What goes wrong:** Child actor messages arrive before the parent registers (lost first mutations), or `registerWindowActor` is called from a new file and the internals-boundary gate goes red (it is an unconditional FORBIDDEN_PATTERNS entry).
**Why it happens:** Registration site chosen for convenience (e.g., the actor file itself) instead of the boundary file; registration timed at first-use instead of startup.
**How to avoid:** `PowerBrowserAPI.registerGroupActor()` (sole `ChromeUtils.registerWindowActor` caller) invoked once from `TheiaService.start` before the swap (same site that calls `ensureTabStore` [VERIFIED: powerbrowser/shell/TheiaService.sys.mjs:269-281]); `INTERNAL-APIS.md` catalogue row + boundary-guard self-test plant in the same commit (WINDOWS.md #13 procedure). Content-side messages validated chrome-side (title cap, finite bounds, known URIs); oversized/malformed rejected loudly, never stored.
**Warning signs:** `registerWindowActor` string anywhere outside `PowerBrowserAPI.sys.mjs`; actor send before `POWERBROWSER_SHELL_SWAP`.

### Pitfall 4: Thumbnail capture jank on the tab-event hot path

**What goes wrong:** Capturing on every `TabSelect` (fires on each switch, including rapid Ctrl-Tab) stalls the UI thread or balloons the store with 60KB data-URLs per switch.
**Why it happens:** Capture wired into the existing trigger family without throttle, or full-scale capture instead of 160px-target capture.
**How to avoid:** Capture with `targetWidth` ≈ card width (160) and `preserveAspectRatio`, debounced/coalesced per tab (capture-on-settle, not on-event); size-cap the stored PNG chrome-side and drop (text fallback) over cap; capture failures are silent by contract (never a spinner/glyph). If the spike shows jank, milestone ships text-only with capture seeded later — UI-SPEC contracts both surfaces, so no spec change.
**Warning signs:** `captureToCanvas` called synchronously inside `onTabEvent`; unbounded `thumbnail` column growth in soak.

### Pitfall 5: Canvas/tree parity drift via a second model

**What goes wrong:** Tree gets its own fetch/cache; after a mutation or flip the views disagree; "mismatch" bugs filed against a phantom second store.
**Why it happens:** Tree built as a separate widget with its own service instead of a second render root over `GroupModel`.
**How to avoid:** One model class, two render functions, one file-owning widget; the parity verify row derives the shared import (single-model assertion) plus a backstop membership-equality check.
**Warning signs:** A second `fetchGroups`/`listGroups` call site outside the model; tree state surviving a model reset.

### Pitfall 6: Unstaged new files invisible to the gates

**What goes wrong:** Residual-brand scan and second-writer scan iterate `git ls-files`; a green run over unstaged canvas files proves nothing.
**Why it happens:** Both scans derive the tracked set (`git ls-files -z`) [VERIFIED: scripts/verify-sql-store-second-writer.mjs:107-111].
**How to avoid:** Stage new files before any scan; plan tasks order stage→scan→commit (14-02/14-03 precedent).

## Code Examples

### Group read RPC (mirror the suggestion idiom)

```typescript
// Source: theia/extensions/chrome-bar/src/browser/chrome-bar-suggestion-service.ts:14-23
// + theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts:18-25
/** JSON-RPC path the backend group handler serves on. */
export const GROUP_PATH = '/services/powerbrowser/groups';
export interface GroupService {
    listGroups(): Promise<GroupRow[]>;
    getGroupTabs(groupId: string): Promise<TabQueryRow[]>;
}
// backend module: bind impl + JsonRpcConnectionHandler at GROUP_PATH over the
// existing authenticated websocket — no new channel, no HTTP route.
```

### Actor message shape (new; validate both directions)

```typescript
// Planner contract (no in-tree precedent — candidate B was pre-approved, never built):
// child → parent: { kind: 'moveGroup'|'resizeGroup'|'renameGroup'|'createGroup'
//   |'closeGroup'|'setTabGroup'|'setActiveGroup', id: string, ...fields }
// parent → child: { ok: true } | { ok: false, reason: 'validation'|'store' }
// Chrome side validates: id non-empty, title trimmed + cut at 60 (empty reverts,
// never blank), bounds finite numbers ≥ 0 clamped to sane max, tab URIs known
// opaque strings. Loud errors naming method + id (writer loud-write convention).
```

### v2 DDL shape (lives once in PowerBrowserAPI.sys.mjs between markers)

```sql
-- Planner-owned DDL following the v1 marker idiom
-- (TABS_STORE_V1_DDL … PB-SQL-TABS-DDL-START/END [VERIFIED: powerbrowser/shell/PowerBrowserAPI.sys.mjs:48-55]):
CREATE TABLE groups (
  id          TEXT PRIMARY KEY CHECK(length(id) > 0),
  title       TEXT NOT NULL DEFAULT 'Untitled group',
  x           INTEGER NOT NULL DEFAULT 0 CHECK(x >= 0),
  y           INTEGER NOT NULL DEFAULT 0 CHECK(y >= 0),
  w           INTEGER NOT NULL DEFAULT 400 CHECK(w >= 200),
  h           INTEGER NOT NULL DEFAULT 300 CHECK(h >= 144),
  is_active   INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1))
);
CREATE INDEX idx_groups_active ON groups (is_active);
-- plus: ALTER TABLE tabs ADD COLUMN group_id TEXT NULL;
-- plus: CREATE INDEX idx_tabs_group ON tabs (group_id);
-- plus (thumbnails): ALTER TABLE tabs ADD COLUMN thumbnail TEXT NULL;
-- (size-capped PNG data-URL; NULL/absent ⇒ contracted text fallback)
```

### Thumbnail capture call (stock API, chrome-side)

```javascript
// Source: upstream/toolkit/components/thumbnails/PageThumbs.sys.mjs:226-238
await PageThumbs.captureToCanvas(aBrowser, aCanvas, {
  targetWidth: 160, preserveAspectRatio: true, backgroundColor: '#2b2a33',
});
// then canvas.toDataURL('image/png') → size-cap → UPDATE tabs SET thumbnail …
// card renders: title + URI block FIRST; <img> fills in only when bytes exist —
// never a broken-image glyph, never a spinner (15-UI-SPEC card contract).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Panorama membership in sessionstore extData (`tabview-tab`/`tabview-group`) | SQL groups table + `group_id`; sessionstore restore-only | This phase (Bugzilla 1221050 lesson) | Removal-safe; no hidden groups inside real session data |
| Live per-tab thumbnail canvases | PNG last-view snapshots, text-first fallback | This phase (tab-sql-substrate.md) | Recognizable cards without live-capture cost |
| Kanban board metaphor | Canvas-first + tree toggle over one model | 2026-09-06 (research note) | Spatial memory preserved; tree is a view, never a store |
| Strip-relocating modes (Variant B) | Strip stays top (13-01 RED verdict) | Phase 13 | Canvas must not move/filter/hide the strip; active-group never filters tabs |
| Dead `layout` blob in modes.json | Kept deliberately for this canvas (WR-10) | Phase 14 review | Planner may consult/consume it, but SQL groups are the authority — do not build a second store on the blob |

**Deprecated/outdated:**
- `OrganisingPlaceholderWidget` copy/heading/body ("Organising arrives next", "Back to Browsing") — retired, not reused; slot seam (`registerOrganisingSlot`) stays.
- Sessionstore extData grouping — never reintroduce.
- Theia-side SQLite writes of any shape — gate-forbidden.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JSWindowActor registration via `ChromeUtils.registerWindowActor` callable once from `TheiaService.start` before swap; child actor module loadable in the remote content process without a manifest/patch change | Architecture / Pitfall 3 | Medium — if registration needs manifest or patch-stack work, write-path plan gains a Gecko-side task; plan-time check: 30-min spike registering a hello actor in a dev build before canvas work starts |
| A2 | `PageThumbs.captureToCanvas` usable on stock-window tab browsers from `PowerBrowserAPI` (needs `PageThumbs` lazy-getter + catalogue row); per-capture cost acceptable at 160px target with settle-debounce | Thumbnails / Pitfall 4 | Low — fallback is contracted milestone behavior (text-only cards); spike measures one capture's ms + bytes, decides seed-now vs seed-later |
| A3 | Group reseed-on-quarantine policy (groups rebuilt empty, tabs ungrouped) acceptable | Architecture Pattern 4 | Low — corruption path is rare; confirm at plan time, one-line decision |
| A4 | 100+ cards need no virtualization (box-internal scroll + tray scroll absorb it; DOM count stays in the low hundreds) | Canvas Q1 | Low — UI-SPEC typical volume is 2–3 boxes × 2–4 cards; if a stress spike shows jank, cap rendered cards per box with "N more" affordance (copy needs UI-SPEC amendment) |
| A5 | Theia 1.74.1 `ConfirmDialog` + `JsonRpcConnectionHandler` + `AbstractViewContribution` APIs match the 14-02/13-02 usage shapes (no version drift — pins unchanged) | Patterns | Low — pins byte-identical since Phase 13; compile in `nix develop .#theia` catches drift in seconds |
| A6 | Single-row active-group storage (`is_active` column with writer-enforced exactly-one-active) vs separate meta table — planner picks; either satisfies "activeGroupId" | Schema | Low — internal choice, invisible to UI contract; enforce the invariant in one writer method either way |

## Open Questions

1. **Exact actor wire format + ack timeout**
   - What we know: request/response needed for rollback; chrome validates everything.
   - What's unclear: timeout value, coalescing of drag-stream messages vs last-write-wins.
   - Recommendation: 5s ack timeout (matches sidecar health-timeout scale); drag streams debounced 150ms with pointerup commit; planner locks numbers.

2. **Thumbnail seeding trigger set**
   - What we know: capture on TabSelect-leave + TabClose covers "last-view" with least work, reusing the existing trigger attach path.
   - What's unclear: whether background/idle capture is needed for tabs never visited this session.
   - Recommendation: milestone captures on leave/close only; older tabs show the contracted text fallback until visited. No idle-capture work this phase.

3. **Close Group exactness vs live tab close path**
   - What we know: confirming must close exactly that group's tabs; existing `removeTabRow` on `TabClose` keeps SQL consistent.
   - What's unclear: whether group-close drives stock `gBrowser.removeTab` per tab (chrome-side loop) or a bulk path.
   - Recommendation: chrome-side per-tab close loop through the stock tab container (same enumeration as `startTabStoreTriggers`), letting existing `TabClose` triggers do row cleanup; verify row asserts exactness.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `nix develop .#theia` (node/yarn/tsc) | Extension compile | ✓ (project standard) | Theia 1.74.1 pins | — |
| node (host) | Verify scripts (`--quick` gate) | ✓ | host node | — |
| Pinned `upstream/` checkout | PageThumbs API confirmation | ✓ (present in tree) | ESR pin per moz.build | — |
| Headed browser / display | Backstop interaction checks (drag/auto-box/parity/close) | ✗ (no display in this env) | — | Static halves in `--quick` + live halves reserved full-suite (14-03 precedent) |
| New npm packages | Nothing | — (forbidden) | — | — |

**Missing dependencies with no fallback:** none for `--quick`-grade work.
**Missing dependencies with fallback:** headed display — backstop rows ship as static-quick + reserved-live, honest per the 14-03 gate precedent.

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | `verify-platform.sh` registry rows (node `.mjs` gates, each with `--self-test`); `tsc -b` in `nix develop .#theia` |
| Config file | `scripts/verify-platform.sh` (append rows; never sibling drivers) |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh` (backstop live halves reserved full-suite) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GUI-08 | Canvas geometry: pixel-free bounds, header-drag move, corner-resize ≥200×144, zoom 25–200% | static derive + backstop | `verify-platform.sh --only gui08-canvas-geometry` (+ `--self-test`) | ❌ Wave 0 (new row + script) |
| GUI-08 | View parity: tree renders identical order/membership; flip keeps selection | static derive + backstop | `verify-platform.sh --only gui08-view-parity` | ❌ Wave 0 |
| GUI-08 | Close exactness: confirm closes exactly that group's tabs; cancel no-op; activity never on removed box | backstop | `verify-platform.sh --only gui08-close-exactness` | ❌ Wave 0 |
| GUI-08 | Persistence roundtrip: v1→v2 migration, group CRUD + `group_id` roundtrip, quarantine plant, newer-than-head refusal | unit (mkdtemp stage, `node:sqlite` carve-out) | `verify-platform.sh --only gui08-persistence-roundtrip` | ❌ Wave 0 |
| GUI-08 | Single-writer invariant holds (no new DB opens) | static scan | existing `sql-store-second-writer` (+ self-test) | ✅ exists |
| GUI-08 | Thumbnail fallback: no broken-img glyph / spinner; text-first paint | static derive + backstop | fold into canvas-geometry row or `gui08-thumbnail-fallback` | ❌ Wave 0 |
| GUI-08 | Internals boundary holds (PageThumbs + actor touchpoints catalogued) | static scan | existing `internals-boundary` (+ catalogue mode) | ✅ exists |

### Sampling Rate

- **Per task commit:** `scripts/verify-platform.sh --quick`
- **Per wave merge:** `scripts/verify-platform.sh --quick` + touched rows' `--self-test`
- **Phase gate:** Full suite green before `/gsd-verify-work` (deferred per nonstop rule; backstop live halves stay reserved, never silently passed)

### Wave 0 Gaps

- [ ] `scripts/verify-gui08-canvas-geometry.mjs` — derives canvas hooks (`data-canvas`/`data-g`/`data-u`), zoom range consts, min-size consts from widget + CSS sources at check time; set equality; 3-plant self-test
- [ ] `scripts/verify-gui08-view-parity.mjs` — derives single-model import shared by both render roots; backstop membership-equality reserved live
- [ ] `scripts/verify-gui08-close-exactness.mjs` — backstop (static half: dialog copy verbatim + exact command wiring derived from source)
- [ ] `scripts/verify-gui08-persistence-roundtrip.mjs` — mkdtemp-stage migration + CRUD + quarantine + downgrade-refusal; `node:sqlite` + `mkdtempSync` carve-out shape; N-plant self-test
- [ ] Five registry rows in `verify-platform.sh` beside the gui07/gui09 pairs with honesty comments (static-quick vs reserved-live)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth surface; group RPC rides the existing authenticated backend websocket; actor messages are same-profile content→chrome (validate, don't authenticate) |
| V3 Session Management | no | No session state added (last-session pointer untouched) |
| V4 Access Control | partial | Actor parent accepts only the six group message kinds from its own child actor; unknown kinds rejected |
| V5 Input Validation | yes | Chrome-side total validation of every actor field (60-char title cap with paste-cut parity, finite ≥0 bounds clamped, known opaque tab URIs); bound SQL params only; titles/URIs render as text nodes with ellipsis + tooltip (chrome-bar `textContent` precedent); LIKE-escape precedent if search ever ships |
| V6 Cryptography | no | No crypto; thumbnails are same-profile page pixels, never exfiltrated |

### Known Threat Patterns for Theia-widget + SQL + actor stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed actor message corrupts groups table | Tampering | Total validation chrome-side; loud reject; constraint CHECKs in DDL as second wall |
| Oversized thumbnail / title blows store or layout | Denial of service | Size-cap PNG bytes chrome-side (drop to text fallback over cap); 60-char title cap; box max-bounds clamp |
| Private-window tab leaks into groups/thumbnails | Information disclosure | Reuse the `PrivateBrowsingUtils.isWindowPrivate` skip at every capture/write site (v1 `writeTabRow` precedent); no private column exists to select on |
| Card title/URI markup injection | Spoofing (XSS) | Text nodes only, never `innerHTML` (chrome-bar threat-model precedent T-13-03-01) |
| Second SQLite writer corrupts profile DB | Denial of service / integrity | `sql-store-second-writer` gate stays green; actor is the only mutation path |

## Sources

### Primary (HIGH confidence)

- `theia/extensions/modes/src/browser/organising-placeholder-widget.ts:22-84` — slot to replace, contribution seam
- `theia/extensions/modes/src/browser/modes-frontend-module.ts:41-65` — static-bind voice (D-50); canvas binds beside placeholder point
- `theia/extensions/modes/src/browser/mode-descriptors.ts:60-80` — `registerOrganisingSlot` seam (unchanged)
- `theia/extensions/modes/src/browser/modes.css:22-171` — single-`@layer` style idiom to extend
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs:48-68, 596-660, 909-1025, 1059-1149` — v1 DDL markers, migration, quarantine, triggers
- `powerbrowser/shell/TheiaService.sys.mjs:261-281` — writer startup site (actor registration neighbor)
- `powerbrowser/shell/powerbrowser.js:287-302` + `powerbrowser.xhtml:48` — content→chrome today is `window.open` only; remote content browser
- `theia/extensions/tab-uris/src/node/tab-query-service.ts:47-83, 153-166` — readonly reader + LIKE-escape precedent
- `theia/extensions/chrome-bar/src/node/chrome-bar-backend-module.ts:18-25` + `chrome-bar-suggestion-service.ts:14-23` — RPC path-const idiom
- `scripts/verify-sql-store-second-writer.mjs:4-44, 66-84` — gate rules (a)/(b)/(c)
- `upstream/toolkit/components/thumbnails/PageThumbs.sys.mjs:187-202, 226-238` — `captureToBlob`/`captureToCanvas` signatures
- `theia/extensions/modes/src/browser/setups-service.ts:15, 68-69` — `ConfirmDialog` precedent; user-storage-never-SQLite rule
- `.planning/WINDOWS.md:30` (#13) — actor procedure (guard entry + catalogue in same commit)

### Secondary (MEDIUM confidence)

- `.planning/notes/browser-organising-panorama.md` — interaction authority (prior admitted research with SUMO/Bugzilla/FF44-code sources)
- `.planning/notes/tab-sql-substrate.md` — PNG last-view snapshot direction (ideation note, not a built spec)
- Sketch `references/modes-tabs-and-organising.md` + `sources/themes/default.css` — visual/structural reference (`data-g`/`data-u`/`data-canvas` hooks, tray shape)

### Tertiary (LOW confidence)

- None — every load-bearing claim above is tool-read this session. Web-only claims (Bugzilla numbers, Panorama history) are inherited from the committed research note, not re-verified here; they constrain interaction design only, not implementation correctness.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is an in-tree pin or stock platform file read this session; no new packages.
- Architecture: HIGH — writer/reader/RPC/shell-hosting mechanics all line-verified; actor path follows a documented pre-approved procedure with one spike (A1) to confirm registration mechanics.
- Pitfalls: HIGH — each names the exact gate/file/line that catches it.

**Research date:** 2026-09-06
**Valid until:** 30 days (stable domain: Theia 1.74.1 pins, ESR-pinned upstream, contracted UI-SPEC)
