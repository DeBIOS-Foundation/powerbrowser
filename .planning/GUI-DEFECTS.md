# GUI defect list — v1.3 live-window findings

Working list, maintained one item at a time. Raised 2026-09-06 from live testing of the
built browser plus a 16-agent read-only investigation. Each item is fixed and **confirmed
on Chris's screen** before the next is started.

Status values: `OPEN` · `IN PROGRESS` · `IN TREE` (code landed, not confirmed live) ·
`CONFIRMED` (Chris verified in his window) · `DEFERRED`.

Items 5–10 are marked `IN TREE` deliberately: the code is written and the bundle rebuilt,
but nothing on this list counts as done until it is seen working in the real window.
Static gates cannot confirm any of it.

---

## Visible to Chris, still broken

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | New Tab does not add a tab **inside the shell** — it opens a separate browser window | CONFIRMED | **CONFIRMED by Chris 2026-09-07** in his own window after the 14.1-03 checkpoint (two live defects found there, items 21 and 22, fixed in `1203209` first): web tabs open in the strip with the globe icon, the page fills the tab body, the pill follows the active tab and link clicks, mode switches keep the tab. GUI-02, Phase 14.1 (plans 01–03). `scripts/verify-web-tab-live.mjs` drives the built shell headless: "+" adds one main-area web tab, a typed address renders as a chrome-owned overlay aligned to the placeholder within 1 CSS px, the tab survives Coding → Browsing → Organising → Browsing → Coding realigned after every hop, a second address navigates the same overlay in place, and close removes it — zero `window.open` calls. **step 1 CONFIRMED 2026-09-06** (overlay renders `example.com` in the shell window). |
| 2 | Tabs do not move between modes | OPEN | Variant B. Phase 13 spike proved the mechanics live (6/6 moves, identity preserved, reversible). Ruled RED only because `diff-theia-core.sh` was red on pre-existing install drift — **that instrument now passes**, so the re-probe can reopen it. |
| 3 | New Tab spawns a *new* OS window on every click | CONFIRMED | **CONFIRMED by Chris 2026-09-07** — no OS window opened across "+", typed addresses, link clicks, the mode walk and close. The chrome bar's "+" now opens the empty page through `WebTabOpenHandler` (14.1-02); the live check counts `window.open` calls in the page realm and asserts zero across "+", two typed commits, the mode walk and close, with the bridge gate (`gui02-web-tab-bridge`) banning any stock-window reach from the chrome bar at commit time. |
| 4 | Organising / Panorama is near-empty | OPEN | Both blockers cleared (items 9 and 10), and the chrome-side writer now receives rows from in-shell overlays: every web-tab navigation writes/removes a `tabs.sqlite` row keyed by page URL (14.1-01), and 14.1-03's live check reads that row back through the backend reader after the two fixes in items 18 and 19 below. Real rows now flow: at the 14.1-03 checkpoint Organising showed the open web tabs (Chris did not report otherwise). Still OPEN until the canvas is confirmed complete in Chris's window. |

## Fixed in the tree, unconfirmed in the window

| # | Item | Status | Evidence |
|---|---|---|---|
| 5 | Mode switch destroyed main-area content tabs | IN TREE | Stock `setLayoutData` restored a stale per-mode snapshot → Lumino unparented every absent widget. Fixed by a main-area exemption at the descriptor deactivate seam. Violated 14-UI-SPEC.md:223, :232-233. |
| 6 | Coding segment bypassed `ModeService` entirely | IN TREE | `chrome-bar-widget.tsx:371` called `switchPerspective` raw, so the whole contracted panel map was dead code for the three shipped modes. Rerouted through `MODES_ACTIVATE_COMMAND_ID`. |
| 7 | Explorer never docked in Coding | IN TREE | `leftPanelHandler.expand(id)` is a pure lookup that no-ops on a miss; only stock `applyViewPlacements` could add it, and only on first activation. Added `ensureInArea`. |
| 8 | Launch race blanked the shell on cold start | CONFIRMED | `applyLaunchMode` ran before `attachShell`. Moved to `onDidInitializeLayout`. The stock warning `No saved layout for perspective 'browsing'` is measured **gone** (0 occurrences). |
| 9 | Panorama reader blind to its own profile dir | IN TREE | `token-gate` deletes every `POWERBROWSER_*` key from `process.env` 31 modules before tab-uris loads, so `TabQueryService` read `''` and every group query returned `[]` unconditionally. |
| 10 | Group write channel dead since 15-01 — **five** independent defects | CONFIRMED FIXED | The channel had never once worked. Each of these alone is fatal, and they masked each other; all five are fixed and the round trip now returns `ok=true` live. See the breakdown below. **Regressed after the confirmation** by the replacement of defect 5's `Cu.cloneInto` with a `win.JSON.parse` round trip — see item 17. |
| 17 | Chrome → content replies and pushes never delivered (regression of item 10 defect 5) | IN TREE | Found by 14.1-03's live check: every awaited request timed out (`lostView`, commit-failure row), no state push ever reached the pill, and the GUI-08 group writes would time out into the save-error bar. Cause: through the actor child's Xray on the content window, `win.JSON.parse` is not callable (`win.JSON.parse is not a function`, measured with DOM markers), so `sendResponse` and `receiveMessage` threw on every call. Fixed in `GroupActorChild.sys.mjs` with the content window's own `JSON.parse` reached through `wrappedJSObject` (no privileged helper). Needs the startup-cache purge in Chris's window. |
| 18 | Backend tab-row reader blind while the browser runs (`SQLITE_BUSY`) | IN TREE | mozStorage opens `tabs.sqlite` in EXCLUSIVE locking mode by default; a WAL writer in that mode keeps the index in heap (no `-shm`), so `TabQueryService`'s readonly handle got `SQLITE_BUSY` on every query and served `[]`. Fixed in `openTabStore` with `openNotExclusive: true`; the live check reads the row back. Explains why item 4 read "1 tab" only with the browser closed. |
| 19 | Backend tab-row reader cannot load `better-sqlite3` inside the bundle | IN TREE | `theia build` bundles the backend with esbuild; bundled, `better-sqlite3`'s wrapper resolves its native binding relative to the bundle (`lib/build/Release/better_sqlite3.node`, never present), `new Database` threw, and the reader swallowed it — `[]` on every launch since 13-02, for suggestions and Panorama alike. Fixed by marking `better-sqlite3` external in the app's now-tracked `esbuild.mjs`. Sibling of item 11 (clean-build class). |
| 20 | Suggestion dropdown re-opened over the page after Enter | IN TREE | A query debounced by the last keystroke and still outstanding at Enter completed after the commit and re-opened the dropdown; the web tab's occlusion term then hid the overlay (page invisible, geometry stale). Fixed in `chrome-bar-widget.tsx`: closing the dropdown on user intent invalidates in-flight queries and a query may only open it for text typed since (`dropdownArmed`). |
| 21 | Pill never followed the page — typed text stayed, link clicks did not update the address | CONFIRMED FIXED | Found by Chris at the 14.1-03 checkpoint (steps 2/3). The chrome bar keyed its web-tab binding on the focus-derived `shell.currentWidget`; a web tab's placeholder is covered by the overlay and never receives DOM focus ("+" focuses the pill; a click lands in the overlay), so the bar never subscribed to state pushes. The live check had masked it with a synthetic focus event on the placeholder. Fixed in `1203209`: the bar follows `shell.mainPanel.onDidChangeCurrent` (the strip's selected tab), seeded from `mainPanel.currentTitle`. Confirmed by Chris 2026-09-07. |
| 22 | File (editor) tab showed an empty pill | CONFIRMED FIXED | Found by Chris at the 14.1-03 checkpoint. `TabUriRegistry.uriOf` deliberately does not cover editors (Theia Navigatables per docs/URI-SCHEMES.md). Fixed in `1203209`: `addressOf` falls back to `NavigatableWidget.getUri(widget)`. Confirmed by Chris 2026-09-07. |

## Repo problems, invisible to Chris

| # | Item | Status | Notes |
|---|---|---|---|
| 11 | Clean build breaks | OPEN | `build:extensions` is a hand-ordered `&&` chain; tab-uris now builds before token-gate but imports from it, and `theia/**/lib/` is gitignored. Only works locally because token-gate/lib already existed. |
| 12 | No gate for the `process.env.POWERBROWSER_*` class of bug | OPEN | Should derive the set of backend files reading those keys directly and require it to equal exactly `{powerbrowser-env.ts}`. |
| 13 | No gate for the group channel | OPEN | `wantUntrusted` can silently regress and every other assertion still passes green. |
| 14 | Stale line reference in INTERNAL-APIS.md | OPEN | `PowerBrowserAPI.sys.mjs:817` → actually `:1643`. Not an enforced row, so nothing fails. |
| 15 | 15-RESEARCH / 15-REVIEW record a now-false assumption | OPEN | They assume the GUI-08 write channel works. It never did (item 10). |
| 16 | Nothing committed | OPEN | Working tree carries all of the above. Another session may also be committing here — commit with explicit paths. |
| 23 | Every overlay creation logs `TypeError: this.documentGlobal.gBrowser.getTabForBrowser is not a function` | OPEN | From browser-custom-element.mjs:951 (also LinkHandlerParent / ContextMenuParent): the shell's stand-in `window.gBrowser` in `powerbrowser.js` has only `tabs`. One-line fix: add `getTabForBrowser() { return null; }` to the stand-in. Seen in the 14.1-03 checkpoint launch log; harmless to the page but noisy. |
| 24 | Two web tabs (`wt1`, `wt2`) created at startup on the first launch after the automated runs | OPEN | Source not identified; setup restore reported nothing to restore. Seen once in the 14.1-03 checkpoint launch log. Reproduce before fixing. |
| 25 | Live check's headless focus accommodation hid item 21 | OPEN | `verify-web-tab-live.mjs` dispatches a synthetic focus event on the placeholder, which made the focus-keyed binding look correct. With the strip-selection binding the pill assertion no longer depends on it; remove the accommodation so a regression to focus-keyed binding goes red. |

---

## Item 10 in full — the five defects in the 15-01 group write channel

Found 2026-09-06 while building GUI-02 step 2, which needed this channel. The channel
had **never worked once since it was written**. Five independent faults, each fatal
alone; the first masked the rest, so fixing any one in isolation changed nothing —
which is why it read as correct code.

1. **Actor child on a `chrome://` URI.** `GROUP_ACTOR_CHILD_MODULE` was
   `chrome://powerbrowser/content/GroupActorChild.sys.mjs`. A JSWindowActor **child**
   loads in the **content process**, where a chrome package is not loadable: every
   launch logged `Failed to load chrome://powerbrowser/content/GroupActorChild.sys.mjs`
   and the child silently never ran. Not one upstream actor child uses `chrome://` —
   they are all `resource:///actors/*` or `moz-src:///` (DesktopActorRegistry.sys.mjs).
   Fixed by adding a `resource powerbrowser` alias in `shell/jar.mn` and pointing the
   child at `resource://powerbrowser/GroupActorChild.sys.mjs`. The parent stays on
   `chrome://` — it only ever loads in the parent process, which is why the parent
   half always worked and hid this.
2. **Missing `wantUntrusted: true`.** The frontend is web content, so its events are
   untrusted, and the actor registration path defaults the flag to false.
3. **Dispatched on `window`, not `document`.** Actor `events` listeners are installed
   on the **window root** (`JSActorService::RegisterChromeEventTarget` →
   `RegisterListenersFor`, "Register event listeners on the newly added Window Root").
4. **Event did not bubble.** With `bubbles:false` the propagation path never reaches
   that root. Upstream's equivalent is
   `document.dispatchEvent(new CustomEvent("AboutLoginsInit", { bubbles: true }))`
   (aboutLogins.mjs:296) — both halves of 3 and 4 together.
5. **Reply detail not cloned into content.** `sendResponse` handed content an object
   from the privileged scope; through Xrays the frontend saw no properties, so
   `detail.requestId` was undefined, the correlator dropped every reply as malformed,
   and each mutation waited out its full 5s ack timeout **even when chrome had already
   applied the write**. Fixed with `Cu.cloneInto`, the same hop upstream clones at
   (WebChannelChild.sys.mjs:69, RemotePageChild.sys.mjs:103).

Live proof: `probe result ok=true armed=true`, with the chrome side logging
`CHILD_MODULE_LOADED` → `CHILD_EVENT` → `MUT kind=…` → `RECV` in order.

**Consequence for item 4:** Panorama's emptiness had *two* causes, not one. Item 9 blinded
the reader; this blinded the writer. Both are now fixed.

## Corrections made to earlier diagnoses

Recorded because both were confidently wrong and would have misdirected a fix:

- **`detachStrayWidgets` was blamed for the tab loss.** It walks `['left','right']` only and never
  touches the main area. The real destroyer is `setLayoutData` → `mainPanel.restoreLayout` →
  Lumino unparenting. A fix aimed at `detachStrayWidgets` would have been a no-op.
- **Strip relocation was called impossible under the never-fork-core rule.** It is not. The spike
  proved the mechanics with zero core touch; only the *instrument* proving that was red.
- **Poisoned snapshots were said to persist across launches.** They do not — the sidecar port is
  ephemeral, so the frontend's `localStorage` origin changes every launch. The teardown was a
  within-session bug only.
