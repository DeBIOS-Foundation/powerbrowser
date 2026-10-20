# Phase 22: Panorama Worklist - Research

**Researched:** 2026-10-17 (HEAD `02ce825`, `main`; 22-UI-SPEC.md re-read after it changed on disk to `status: approved`)
**Domain:** One shared frontend group model read by two Theia extensions (strip filter, "+" membership), a deferred group close with Undo, a per-card close, a last-group guard, and the spec-derived gui08 checks that must move with them
**Confidence:** HIGH for code facts (every cited line was read this session; the four gui08 checks and their self-tests were run). MEDIUM for the recommended mechanisms, which no build or live run has exercised. LOW where tagged [ASSUMED].

## Summary

Everything Phase 22 needs already exists in the tree except three things: a group model that loads without Organising, a deferred close, and a card close control. `@powerbrowser/chrome-bar` already depends on `@powerbrowser/modes`, so the strip can inject the singleton `GroupModel` directly. The model has the reads W1 needs (`getActiveGroupId`, `getTabs`, `listUngrouped`, `keyOf`). The real gap is that `GroupModel.load()` has exactly one caller, `OrganisingWidget.initialize()`, and Organising is created lazily. In Browsing at launch the model is empty and a filter would have nothing to read. The model must load itself.

W4 needs **no schema change, no new actor kind and no edit to `closeGroupRows`**. The chrome-side writer is already the right commit: it is idempotent (`return "already-closed"`), closes the member tabs, clears membership and deletes the group in one transaction. What changes is *when* it is called: from the click to the end of the undo window. The closed group is hidden in the frontend for 15 s, as `15-PANORAMA-WORKLIST.md` W4 says ("a closed group is hidden, not destroyed; restore or commit after ~15s") and as sketch 004 does (`g.hidden = true`). Three facts constrain where that state lives: leaving Organising disposes the widget (`closeView`), so the timer and pending set must live on `GroupModel`; the strip's render loop rewrites `title.className` on every main-area widget, so the "hidden in every tab bar" class must be applied in that loop; and the quit flush (`onWillFlush`, awaited before the layout is stored) is where a pending close must commit so a quit inside the window closes the group for good (22-UI-SPEC A4).

The research report this file is built from proposed five behaviours that the approved 22-UI-SPEC contradicts. They are resolved below in favour of the UI-SPEC, with evidence (see "Conflicts resolved"). The most important one: committing pending closes when leaving Organising would close tabs as part of a mode switch, which is the invariant the modes design exists to prevent.

**Primary recommendation:** Seven sequential plans (no two can run in parallel; they share `group-model.ts`, `organising-widget.ts` and 15-UI-SPEC, and `workflow.use_worktrees` is false). Copy checkpoint and copy-check derivation first; then W1+W2 in one commit; then the last-group guard; then the deferred-close mechanism; then the Undo UI with the copy and all three gui08 check edits in one commit; then the card close; then the sweep and live confirmation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Chris's Panorama decisions (PAN-02, success criterion 1)
Recorded 2026-10-17, before any worklist code. Both are Chris's answers in chat, given
verbatim below:
- Decision 1, ungrouped tabs: "Loose allowed, shown in strip (Recommended)". Tabs may stay
  loose (not in any group), as shipped. While a group is active, the filtered strip shows
  the active group's tabs plus the loose tabs, so no tab ever disappears from the strip.
- Decision 2, strip filter scope: "Browsing only (Recommended)". The group filter applies
  only to the Browsing tab strip. Coding (Theia dock tab bars) and Organising are
  unchanged.

#### Locked
- W1 and W2 ship in one change. The strip shows the active group's tabs plus loose tabs
  in Browsing. A tab opened with "+" joins the active group when one is active, and is
  loose otherwise.
- The 15-UI-SPEC sentence "no contract below moves, filters, or re-skins the strip, and
  choosing a tab never hides other tabs" (around :24-26) is amended in the W1 commit.
- W4: Undo Close Group restores a closed group. The spec copy and both gui08 checks
  change in the same commit and pass. The chrome-side writer `closeGroupRows` is touched;
  research it first.
- W5: a card can be closed from the card itself.
- W11, first part: the last remaining group cannot be closed.
- Copy items held from Phase 21 for Chris's review in this phase:
  - The empty-canvas body still says "drag a tab onto the canvas to start one". That
    gesture no longer exists, because a drop on the canvas places the tab loose. New
    wording is user-facing copy and needs Chris's review.
  - 21-REVIEW WR-05: two shipped strings sit outside the copy contract, the resize grip's
    screen-reader value (`${w} by ${h} pixels`) and the card tooltip (`${title}\n${url}`).
    Add them to the contract or reword them. Chris's call.
  New user-facing strings are a checkpoint for Chris; follow the CLAUDE.md copy rule.
- Every check derives from the tree or 15-UI-SPEC (CLAUDE.md verification rule 2), with a
  planted-fault self-test.
- `--quick` must stay at 0 FAIL with an empty `docs/non-gui/quick-baseline.txt`.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000. Rebuild the
  sidecar before a live check.
- Never fork or patch Theia core.

### Claude's Discretion
Everything else, guided by the ROADMAP success criteria, 15-UI-SPEC,
`.planning/milestones/v1.3-phases/15-panorama-organising/15-PANORAMA-WORKLIST.md`, the
sketch findings and this phase's research.

### Deferred Ideas (OUT OF SCOPE)
None.

### Phase boundary (CONTEXT `<domain>`)
The user organises tabs by group from both the strip and the canvas: the strip follows the active group, a closed group can be restored, a card closes in place, and one group always remains (PAN-02..PAN-06; worklist items W1, W2, W4, W5, W11 first part). Phase 21 is complete: 15-UI-SPEC describes the shipped Panorama, both gui08 checks derive from it, and `--quick` is fully green with an empty baseline.

### Design contract in force
`22-UI-SPEC.md` is `status: approved` (gsd-ui-checker, autonomous run, 2026-10-17). Its Interaction Contract, Copywriting Contract, Canvas Geometry additions and "15-UI-SPEC edits" table are the observable contract for this phase. Its assumptions A1-A12 each name who can overturn them; until Chris overturns one, plans follow it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAN-02 | Panorama decisions 1 (ungrouped tabs) and 2 (strip filter scope) are made by Chris and recorded. | Recorded in 22-CONTEXT.md and committed (`7cf50ce docs(22): context with Chris's Panorama decisions 1 and 2 (PAN-02)`). No code work; the verifier checks the commit precedes every worklist code commit |
| PAN-03 | The tab strip shows only the active group's tabs (W1), and a tab opened with "+" joins the active group (W2). | Model self-load, `showsInStrip` with the D1 loose rule and the A5 current-tab rule, `joinActiveGroup` on the New Tab command only (A7), strip wiring, 15-UI-SPEC amendments, live row |
| PAN-04 | The user can restore a closed group with Undo Close Group (W4). | Deferred close on the model (hide, 15 s timer, undo, commit through the unchanged `closeGroupRows`), all-modes tab hiding, current-tab steering, quit-flush commit, Undo control and command, dialog removal, the three gui08 check edits in one commit |
| PAN-05 | The user can close a card from the card itself (W5). | Card × through the tab's own close path, `closeTab` for not-open cards (the reader already drops closed rows), focus and tab-stop rules, live row |
| PAN-06 | The last remaining group cannot be closed (W11, first part). | `closable` count excluding pending groups, both × sites, model guard; last-card-out dissolve unchanged (A10) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Never fork or patch Theia core.** All edits are in `@powerbrowser/modes`, `@powerbrowser/chrome-bar` and `scripts/`. Theia's `ApplicationShell.closeWidget`, `ReactWidget` and Lumino `TabBar` are consumed, not edited.
- **Never modify Gecko outside the patch stack.** The recommended design edits nothing under `powerbrowser/shell/`. `closeGroupRows` stays as it is.
- **Design for the bridge.** `TabUriRegistry` is not edited; `scripts/verify-registry-shape.mjs` stays green by construction. The strip gains a reader, not a tab model of its own (`tab-strip-widget.tsx` header: "it adds no tab model of its own").
- **Repo path without a space.** Unchanged.
- **Theia is the default GUI; stock chrome reachable.** Not affected.
- **No generator; residue scan.** Stage every new check script before trusting `node scripts/scan-brand-residue.mjs` (it iterates `git ls-files`).
- **Patches are regenerated, never text-edited.** No patch is touched.
- **One driver, one registry.** Each new check is one row (plus `-self-test` row for static checks) in `scripts/verify-platform.sh`. No sibling driver.
- **Verification rules.** Never assert the absence of a log line over your own emitter. Derive and compare; do not hand-keep a list (the declared `EXPECTED_*` blocks in the gui08 checks are the documented exception, edited in the same commit as the contract change). Every new or rewritten check has planted faults that each go red naming the drift.
- **User-facing copy.** "PowerBrowser" where a product name is needed, plain language, a next step that is a real control, no internal identifier. Every new string is a Chris checkpoint (22-CONTEXT).
- **Environment.** Builds in `nix develop .#theia`; `yarn` does not work outside it. Port 3000 is Chris's container; live rows use `PB_VERIFY_PORT` (default 3939, `scripts/verify-platform.sh:62`).
- **Memory notes in force:** `concurrent-sessions-on-main` (commit by explicit path; no `-a`, `--amend` or stash with foreign files staged); `one-fix-at-a-time-confirmed` (superseded for v1.4: run autonomously, take recommended options, stop for ledger approvals, live checks or a push); `live-gui-debug-loop` (static gates cannot see DOM geometry or DI wiring); `chrome-js-startup-cache` (only if a chrome `.js` changes; the recommended design changes none).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Group membership, active group, pending closes, undo timer | Browser: `GroupModel` (`modes/src/browser/group-model.ts`, singleton) | — | One in-memory store for strip and canvas (UI-SPEC "Strip and canvas read one membership source"). The timer must outlive the Organising widget, which `closeView` disposes |
| Loading the model at startup | Browser: `GroupModel` as a `FrontendApplicationContribution` (`onDidInitializeLayout`, not awaited) | Node: `GroupQueryService` (`tab-query-service.ts`) | Today only Organising loads it |
| Strip filter (Browsing only) | Browser: `TabStripWidget.mainTabs()` (`chrome-bar`) | `GroupModel.showsInStrip()` | The strip is hidden outside Browsing (`chrome-bar-widget.tsx:859`), so D2 holds by placement |
| Hiding a pending-close group's tabs in every tab bar | Browser: the strip's render loop that already writes `title.className` | `chrome-bar.css` rule with no mode scope | That loop overwrites `title.className` on every main-area widget (`tab-strip-widget.tsx:551-554`) |
| "+" joins the active group | Browser: the New Tab command (`chrome-bar-commands.ts:146-153`) | `GroupModel.joinActiveGroup()` → existing `setTabGroup` writer | A7: the command is the only joining path |
| Group close commit | Gecko chrome: `PowerBrowserAPI.closeGroupRows` (unchanged) | `case "closeGroup":` arm (unchanged) | Already idempotent and exact |
| Quit inside the undo window | Browser: `ProfileStorageService.onWillFlush` listener on the model | `SetupsService.saveSession` skips pending keys | The flush runs before the layout is stored and while the backend still runs |
| Undo control, card ×, last-group guard | Browser: `organising-widget.ts`, `organising-tree.ts`, `modes.css` | `panorama-commands.ts` (new undo command, A12) | DOM-only |
| Copy, geometry and close contracts | `15-UI-SPEC.md` (v1.3 archive) | `scripts/lib/ui-spec.mjs` | The checks parse it |
| Persistence | `tabs.sqlite` via the existing writers | — | Schema head stays 6 |

## Standard Stack

No package is installed. Every change uses what the tree already has.

| Tool / API | Version | Use | Evidence |
|------------|---------|-----|----------|
| `@theia/core` | 1.76.0 | `ApplicationShell`, `ReactWidget`, `FrontendApplicationContribution`, `WaitUntilEvent` | [VERIFIED: `theia/node_modules/@theia/core/package.json` `"version": "1.76.0"`] |
| `@lumino/widgets` | 2.7.5 | `TabBar.Renderer.createTabClass` appends `title.className` | [VERIFIED: `theia/node_modules/@lumino/widgets/package.json`, `dist/index.js:9040-9044`] |
| `p-debounce` | already imported | Debounced model reload, as the widget does today | [VERIFIED: `organising-widget.ts:34` `import pDebounce from 'p-debounce';`] |
| Node | v24.19.0 | All checks | [VERIFIED: `node --version`] |
| Python | 3.14.7 | `ledger-report.py`, `phase-gate.py`, `size-gate.py` | [VERIFIED: `python3 --version`] |

## Package Legitimacy Audit

Not applicable: this phase installs no external package.

**Packages removed due to [SLOP] verdict:** none. **Packages flagged as suspicious [SUS]:** none.

## Current State (read this session)

### Dependency direction and the shared reader
- `@powerbrowser/chrome-bar` depends on `@powerbrowser/modes`; modes does not depend on chrome-bar. [VERIFIED: `theia/extensions/chrome-bar/package.json:7-8` `"@powerbrowser/tab-uris": "0.1.0"`, `"@powerbrowser/modes": "0.1.0"`; `modes/package.json:7` lists only `"@powerbrowser/tab-uris": "0.1.0"`]
- chrome-bar already imports from modes: `import { ModeService } from '@powerbrowser/modes/lib/browser/mode-service';` and `import { OrganisingWidget } from '@powerbrowser/modes/lib/browser/organising-widget';` [VERIFIED: `chrome-bar-widget.tsx:32-37`]
- `GroupModel` is a singleton: `bind(GroupModel).toSelf().inSingletonScope();` [VERIFIED: `modes-frontend-module.ts:83`]
- The reads exist: `listGroups()`, `getTabs(groupId)`, `listUngrouped()`, `getActiveGroupId()` [VERIFIED: `group-model.ts:238-252`], `keyOf(widget)` [VERIFIED: `:148-150`].
- `GroupQueryService` is a type-only import in the model: `import type { GroupQueryService } from '@powerbrowser/tab-uris/lib/browser/group-query-service';` [VERIFIED: `group-model.ts:23`]. The widget imports it as a value [VERIFIED: `organising-widget.ts:33`].
- **The blocker:** `load(reader, live)` [VERIFIED: `group-model.ts:263`] is called only from `OrganisingWidget.initialize()`: `await this.model.load(this.reader, this.liveTabs());` [VERIFIED: `organising-widget.ts:434-441`; `grep` of `theia/extensions/*/src` finds no other caller]. The widget reloads on shell add/remove only after it is attached (`:196-208`).
- **Gate constraint:** `gui08-view-parity` treats any modes-browser file other than `group-model.ts` that calls `.listGroups(`, `.getGroupTabs(` or `.listUngroupedTabs(` as a second reader: `const EXPECTED_MODEL_READERS = Object.freeze([WIDGET_REL]);` [VERIFIED: `scripts/verify-gui08-view-parity.mjs:48`, derivation `:76-92`]. It scans only `modes/src/browser`, so `tab-strip-widget.tsx` calling model methods is outside it; a new reader method must still live in `group-model.ts`.
- **Harness dependency:** `A.cardKey` calls `org.liveTabs.call(view)` with a substituted `shell` [VERIFIED: `scripts/lib/ng-a-live.mjs:254-265`], used by ng-001, ng-002, ng-004, ng-006, ng-007, ng-008 and gui08-loose-cards-live [VERIFIED: `grep -c cardKey scripts/*.mjs`]. `A.organising()` calls `org.initialize()` [VERIFIED: `:251`]. Both methods must stay on the widget.

### The strip
- `mainTabs()` = home-pane widgets minus stacked ones [VERIFIED: `tab-strip-widget.tsx:297-299`]; `homeWidgets()` excludes `MODE_SURFACES` [VERIFIED: `:291-294`].
- It re-renders on shell add, remove, current change, `mainPanel.onDidChangeCurrent` and `layoutModified` [VERIFIED: `:90-98`]. It has no `GroupModel` subscription today.
- The render loop writes every main-area widget's title class: `widget.title.className = home.includes(widget) && !this.stacked.has(widget) ? STRIP_ONLY_CLASS : '';` with `const STRIP_ONLY_CLASS = 'pb-strip-only';` [VERIFIED: `tab-strip-widget.tsx:551-554`, `:11`]. Any other class put on `title.className` is wiped by the next strip render.
- That loop runs while the strip is hidden: `ReactWidget.onUpdateRequest` renders with no visibility guard (`if (!this.isDisposed) { this.nodeRoot.render(...this.render()...) }`) and Lumino posts `update-request` unconditionally [VERIFIED: `@theia/core/lib/browser/widgets/react-widget.js:37-42`; `@lumino/widgets/dist/index.js:1076-1078, 1222-1225`].
- Theia's tab renderer keeps Lumino's `createTabClass`, which appends `data.title.className` [VERIFIED: `@theia/core/lib/browser/shell/tab-bars.js:241-242`; `@lumino/widgets/dist/index.js:9040-9044`].
- The strip-only class hides a dock-bar tab only in Browsing: `body[data-pb-mode="browsing"] .lm-TabBar-tab.pb-strip-only { display: none; }` [VERIFIED: `chrome-bar.css:452-454`].
- The strip is shown only in Browsing: `this.tabStrip.setHidden(modeId !== 'browsing');` [VERIFIED: `chrome-bar-widget.tsx:859`].

### Where "+" creates a tab
- The button runs `CHROME_BAR_NEW_TAB_COMMAND_ID` [VERIFIED: `chrome-bar-widget.tsx:691-697`], `'powerbrowser.chrome-bar.new-tab'` [VERIFIED: `chrome-bar-commands.ts:21`].
- The command: `const uri = new URI(EMPTY_PAGE_URL); const handler = await this.openerService.getOpener(uri); await handler.open(uri); focusAddressPill();` [VERIFIED: `chrome-bar-commands.ts:146-153`]. `open()` resolves to the `WebTabWidget` after `shell.addWidget` and `activateWidget` [VERIFIED: `web-tab.ts:665-677`].
- **No keybinding runs New Tab.** The only chrome-bar keybinding is `command: CHROME_BAR_FOCUS_ADDRESS_COMMAND_ID, keybinding: 'ctrlcmd+l'` [VERIFIED: `chrome-bar-keybindings.ts:22-24`; `grep` finds no other `CHROME_BAR_NEW_TAB` binding]. 22-UI-SPEC's "or its keybinding" names nothing that exists; the command is the join point either way.
- The row key: `this.rowKey = options.key ?? \`web:${options.id}\`;` [VERIFIED: `web-tab.ts:345`]. The row is written chrome-side in `webTabOpen` (`PowerBrowserAPI.writeTabRow({ uri: entry.uri, ... })`, fire-and-forget) [VERIFIED: `PowerBrowserAPI.sys.mjs:3295-3297`], dispatched from `onAfterAttach` [VERIFIED: `web-tab.ts:411`] before `open()` resolves.
- `setTabGroupId` refuses an unknown row: `throw new Error(\`setTabGroupId: unknown tab URI ${uri}\`);` [VERIFIED: `PowerBrowserAPI.sys.mjs:1772`]. `webTabOpen` and `setTabGroup` ride the same `PowerBrowserGroupRequest` channel [VERIFIED: `web-tab.ts:16-17, 66`; `group-actor-client.ts:18`]; `writeTabRow` and `setTabGroupId` each await `openTabStore()` once before their first statement [VERIFIED: `PowerBrowserAPI.sys.mjs:1566, 1768`]. That the two are processed in dispatch order is [ASSUMED]; ng-004 sleeps, so it does not prove it.
- A second new-tab path exists (an http(s) address committed with no web tab current, `chrome-bar-widget.tsx:296-299`). A7 keeps it loose.

### Persistence facts that decide the W4 and W5 mechanisms
- The group reader returns open rows only: `'SELECT uri, url, title, last_active, group_id, thumbnail, x, y, ord FROM tabs WHERE group_id = ? AND closed_at IS NULL ORDER BY ord IS NULL, ord, uri'` [VERIFIED: `theia/extensions/tab-uris/src/node/tab-query-service.ts:259`]; loose: `... WHERE group_id IS NULL AND closed_at IS NULL ...` [VERIFIED: `:270`]. **A row marked closed leaves its card on the next load.** The report's claim that a closed grouped tab "stays as a not-open card" is wrong: a not-open card (`open: false`, `group-model.ts:315-318`) is an open row whose tab is not in the shell.
- `closeTabRow`: `UPDATE tabs SET closed_at = :now WHERE uri = :uri AND closed_at IS NULL` [VERIFIED: `PowerBrowserAPI.sys.mjs:1595-1598`] (idempotent).
- `writeTabRow` revives a closed row: `... ON CONFLICT (uri) DO UPDATE SET ... closed_at=NULL` [VERIFIED: `:1569-1574`].
- `closeGroupRows(id)` [VERIFIED: `:1875-1916`]: unknown id `return "already-closed";` (`:1884`); per-member `PowerBrowserAPI.closeStockTabByUri(uri);`; one transaction `"UPDATE tabs SET group_id = NULL, closed_at = COALESCE(closed_at, :now) WHERE group_id = :id"` (`:1907`) and `DELETE FROM groups WHERE id = :id`. Reached only from `case "closeGroup":` → `await PowerBrowserAPI.closeGroupRows(data.id);` (`:2407-2408`).
- Schema head: `const TAB_STORE_SCHEMA_HEAD = 6;` [VERIFIED: `:50`]. The recommended design adds no column, so no migration and no NG-087-style ledger row.
- Groups can hold stock rows: ng-006 assigns a stock tab with `A.mutate({ kind: 'setTabGroup', uri: stock.uri, groupId })` [VERIFIED: `verify-ng-006-close-group-closes-web-tabs.mjs:30`]. The canvas never draws them (`group-model.ts:318` drops `stock:` cards). `closeGroupRows` closes them at commit.

### closeGroup today
- Model (`group-model.ts:617-646`): paints, then persists `client.mutate({ kind: 'closeGroup', id })` at once. Activity hands off locally: `this.activeGroupId = wasActive ? this.groups[0]?.id : this.activeGroupId;` (`:631`). Nothing writes `setActiveGroup`, so after a reload no group is active (existing defect).
- Widget (`organising-widget.ts:368-411`): builds the singular/plural body, opens `new ConfirmDialog({ title: 'Close Group', msg: closeMsg, ok: 'Close Group', cancel: 'Cancel' })` with class `pb-org-close-confirm`, then calls `model.closeGroup`, then closes each member widget (`this.widgetForTab(tab)?.close();`, NG-006), then `await this.flash(\`Group "${closed.name}" closed.\`);`.
- `widget.close()` on a dirty editor prompts: Theia replaces a saveable widget's `close` with `closeWithSaving` (`close: closeWithSaving,`) [VERIFIED: `@theia/core/lib/browser/saveable-service.js:189-198`]. `ApplicationShell.closeWidget(id)` awaits that prompt [VERIFIED: `application-shell.js:1546-1562`].

### Organising lifetime and the quit flush
- Leaving Organising disposes the widget: the slot's `close: () => { void this.closeView(); },` [VERIFIED: `organising-widget.ts:2098-2104`]. A timer or pending set held on the widget dies on every mode switch, so W4 state must live on `GroupModel` (22-UI-SPEC step 7: the window survives a mode switch).
- The quit flush runs `fireWillFlush()`, then `layoutRestorer.storeLayout(app)`, then `storage.save()`, then acknowledges [VERIFIED: `theia/extensions/tab-uris/src/browser/profile-storage.ts:295-307`], on `quit-application-granted` while the backend still runs [VERIFIED: `PowerBrowserAPI.sys.mjs:719-737`]. Listeners are bounded: `export const SHELL_STATE_WILL_FLUSH_TIMEOUT_MS = 2000;` [VERIFIED: `profile-storage.ts:44`].
- `WaitUntilEvent.fire` calls every listener synchronously, then awaits their promises [VERIFIED: `@theia/core/lib/common/event.js:319-346`]. `SetupsService` registers `this.profileStorage.onWillFlush(event => event.waitUntil(this.saveSession()));` [VERIFIED: `setups-service.ts:498`], and `saveSession` reads the shell's web tabs synchronously at entry [VERIFIED: `:533-544`]. Listener order between the model and `SetupsService` is not fixed by anything in the tree, so the session snapshot cannot rely on the model's listener running first.
- The launch restore reopens session web tabs on their own rows [VERIFIED: `setups-service.ts:556-573, 1368-1370`], and `writeTabRow` revives a closed row (`closed_at=NULL`). A pending-close web tab left in the session snapshot would therefore come back after a restart as a loose tab, which A4 forbids.

### Card close affordance and last-group sites
- No card close exists. `buildCard` (`organising-widget.ts:866-934`) wires `dblclick` → `dive`, `keydown` Enter/arrows, and `pointerdown` → `beginCardDrag` (`:932`).
- Sketch 004 reference: `close.className = 'card-close'; close.textContent = '×'; close.title = 'Close tab';` with `e.stopPropagation()` [VERIFIED: `.planning/sketches/004-panorama-reference/index.html:526-529`].
- Canvas × [VERIFIED: `organising-widget.ts:799-810`]: `close.title = 'Close group';`, `close.setAttribute('aria-label', 'Close group');`, `close.dataset.command = PANORAMA_CLOSE_GROUP_COMMAND_ID;`. Tree × [VERIFIED: `organising-tree.ts:51-62`], built unconditionally. `TreeSectionHooks` [VERIFIED: `organising-tree.ts:24-33`].
- `dissolveEmptied` [VERIFIED: `organising-widget.ts:1836-1843`] dissolves a box left empty by a drag.
- The close command ends in `OrganisingCommandHandler.closeGroup` → `this.widget()?.closeGroupById(id)` [VERIFIED: `organising-widget.ts:2126-2130`]; it does nothing when Organising is not open.
- Panorama's `getUnclosableGroupItemId` counts only non-hidden groups and applies only with pinned tabs [CITED: hg-edge.mozilla.org FIREFOX_44_0_RELEASE groupitems.js, via the research report]; PAN-06 makes the rule unconditional.

### Copy
- Empty canvas body: `'There are no tab groups yet — choose New Group, or drag a tab onto the canvas to start one.'` [VERIFIED: `organising-widget.ts:494-497`].
- WR-05 strings: `grip.setAttribute('aria-valuetext', \`${group.w} by ${group.h} pixels\`);` [VERIFIED: `organising-widget.ts:856`] and `card.title = tab.url ? \`${tab.title}\n${tab.url}\` : tab.title;` [VERIFIED: `:874`].
- The copy check sees only single-quoted sinks: `textContent\s*=\s*'...'`, `\btitle\s*=\s*'...'`, `setAttribute\('aria-label',\s*'([^']+)'\)`, `placeholder`, `buildEmpty`, `buildBar`, `.label`, `widgetName`, the dialog block, `flash(\`...\`)`, command labels and `UNTITLED_GROUP_TITLE` [VERIFIED: `scripts/verify-gui08-panorama-copy.mjs:76-113`]. Template-literal `setAttribute`, `title =` and `textContent =` sinks are invisible to it.
- The normaliser is already generic: `s.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[A-Za-z]+\}/g, '{}')` [VERIFIED: `scripts/lib/ui-spec.mjs:67-69`]. 22-UI-SPEC's sentence that it "today maps only `${group.title}`, `${closed.name}` and `${count}`" is inaccurate: `{w}`, `{h}`, `{title}`, `{url}` already normalise. What is missing is the sink derivation, and a spec form for the line break (the derived source text keeps `\n` as two characters, so a spec literal `**"{title}\n{url}"**` written with a literal backslash-n compares equal) [VERIFIED by reading `pushAll`/`unescapeUnicode`, `:66-74`, which unescape only `\uXXXX`].
- The retired search is a raw substring scan over every modes-browser `.ts`, the CSS and the module: `for (const needle of retired) { ... (sources[rel] ?? '').includes(needle) || unescaped[rel].includes(needle) ...` [VERIFIED: `verify-gui08-panorama-copy.mjs:174-181`]. A retired literal with a `{name}` slot never matches source that spells `${group.title}`, so it is inert as a search.
- The 15-UI-SPEC copy rule names bounds among the internals: "no pref key, sentinel, port, table name, `group_id`, bounds, URI-scheme internals or raw exception text" [VERIFIED: `15-UI-SPEC.md:229-230`].

### The geometry check
- Const rows resolve across every code source passed in, including `group-model.ts` [VERIFIED: `verify-gui08-canvas-geometry.mjs:45, 168-171`; `scripts/lib/ui-spec.mjs:183-194` `codeTexts` = every non-CSS source]. Only `organising-widget.ts`, `organising-tiling.ts` and `organising-geometry.ts` must give every top-level numeric const a row (`canvasRels`). A `UNDO_CLOSE_MS` const in `group-model.ts` is compared through its row and needs no other exemption.
- It hand-keeps the command registry and the dialog copy: `const EXPECTED_COMMAND_IDS = Object.freeze([ 'powerbrowser.panorama.new-group', 'powerbrowser.panorama.close-group', 'powerbrowser.panorama.show-canvas', 'powerbrowser.panorama.show-tree', 'powerbrowser.panorama.retry-save', ]);`, `const EXPECTED_CLOSE_DIALOG_TITLE = "title: 'Close Group'";`, `const EXPECTED_CLOSE_DIALOG_OK = "ok: 'Close Group'";`, `const EXPECTED_CLOSE_TOOLTIP = "= 'Close group'";` [VERIFIED: `:55-65`]; the dialog assertion is at `:252-254` and the tooltip one at `:255-258`; one backstop names the dialog (`'confirming Close Group closes exactly that group tabs; cancel changes nothing'`, `:75`). Exactly one `label:` is allowed in `panorama-commands.ts` (`:249`).

### The close-exactness check
- Hand-kept: `EXPECTED_DIALOG_TITLE = 'Close Group'`, `EXPECTED_DIALOG_MSG_ONE`, `EXPECTED_DIALOG_MSG_MANY`, `EXPECTED_DIALOG_OK = 'Close Group'`, `EXPECTED_DIALOG_CANCEL = 'Cancel'`, `EXPECTED_CLOSE_KIND = "kind: 'closeGroup'"`, `EXPECTED_DISPATCH_ARM = 'case "closeGroup":'`, `EXPECTED_CLOSE_CALL = 'closeGroupRows(data.id)'` [VERIFIED: `scripts/verify-gui08-close-exactness.mjs:51-62`]. It requires the `ConfirmDialog` block, the `if (!confirmed)` guard before `closeGroup(this.actor`, `async closeGroup(` and `this.groups[0]?.id` in the model, and the chrome-side strings [VERIFIED: `:143-236`]. W4 breaks every widget-side assertion; the chrome-side ones stay true.

### Gates run this session (read-only, all exit 0)
- `verify-gui08-close-exactness`: "PASS -- contracted dialog, cancel-first ordering, exact close wiring"; self-test "all five fault directions went red".
- `verify-gui08-panorama-copy`: "PASS -- 29 painted strings equal the 29 literals of the 15-UI-SPEC Copywriting Contract; 4 retired literals absent"; self-test "10 planted faults went red".
- `verify-gui08-view-parity`: PASS; self-test "all four fault directions went red".
- `verify-gui08-canvas-geometry`: "PASS -- 18 const rows and 7 CSS rows equal 15-UI-SPEC Canvas Geometry"; self-test "15 planted faults went red".
- `docs/non-gui/quick-baseline.txt` is 0 bytes [VERIFIED: `wc -c`].

## Conflicts resolved

The research report and the approved 22-UI-SPEC disagree in eight places. Each is resolved by evidence; where the report's option remains reasonable it is listed for Chris (C2), not planned.

| # | Report proposed | 22-UI-SPEC says | Resolution | Evidence |
|---|-----------------|-----------------|------------|----------|
| R1 | Leaving Organising commits pending closes (Panorama `hideTabView`) | Step 7: switching mode or view does not end the window | **UI-SPEC.** Committing on leave closes the group's tabs during a mode switch | 14-UI-SPEC invariant "Switching modes still never closes, moves or detaches a tab" (quoted in 22-UI-SPEC No-Regression); sketch findings "What to Avoid: Closing, moving, or detaching tabs on mode switch"; the slot `close` callback runs on the switch path (`organising-widget.ts:2101-2103`) |
| R2 | Quit inside the window keeps the group | A4: quit commits; never restored, no empty box, no loose leftovers | **UI-SPEC**, via a quit-flush commit plus a session-snapshot filter | `profile-storage.ts:295-307` (flush before `storeLayout`); `setups-service.ts:498, 533-544` (snapshot read synchronously); `writeTabRow` revives closed rows (`PowerBrowserAPI.sys.mjs:1574`) |
| R3 | Active group follows the current tab in Browsing (`followTab`) | A5: strip shows active + loose + current tab; activation does not change the active group except the card-open path | **UI-SPEC** (A5 is Chris's to overturn) | `dive` already activates the card's group (`organising-widget.ts` `dive` → `activateGroup`) |
| R4 | A Discard × with "Discard closed group"; optional "{N} tabs hidden" | A2: no discard ×; Out of Scope lists it | **UI-SPEC.** Neither string enters the contract | 22-UI-SPEC A2, Out of Scope |
| R5 | `dissolveEmptied` returns early on the last group | A10: dissolving the last group by last-card-out is unchanged | **UI-SPEC** | 22-UI-SPEC A10; W11 names the close button only |
| R6 | Card × clears membership (`setTabGroup(uri, null)`), then `dissolveEmptied` | A8: the tab's own close path; a not-open card gets `closeTab`; an emptied group stays | **UI-SPEC.** No membership write is needed | The reader drops closed rows (`tab-query-service.ts:259`), so `closeTab` alone removes the card |
| R7 | Drop the `Group "{name}" closed.` flash | Unchanged: keep it at the click | **UI-SPEC** | 22-UI-SPEC "Unchanged" and step 2 |
| R8 | "Both gui08 checks" (SC3) = panorama-copy + close-exactness; const `UNDO_CLOSE_GROUP_MS` | Checks that change: panorama-copy, canvas-geometry and close-exactness; const `UNDO_CLOSE_MS` | **All three change in the W4 UI commit**; "both" means canvas-geometry and panorama-copy, as everywhere in Phase 21. Name the const `UNDO_CLOSE_MS` | REQUIREMENTS PAN-01 ("`verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` derive from it"); 22-CONTEXT `<domain>` ("both gui08 checks derive from it"); canvas-geometry asserts the dialog copy (`:252-254`) so it must change too |

Where the report and the UI-SPEC agree (model-owned load not awaited at boot, `liveTabs` delegated not moved, the reader on `GroupModel`, "+" joins on the command only, the timer on the model, `closeGroupRows` unchanged, tab stops), the report's design is kept.

The empty-canvas body has two candidate wordings, both needing Chris: 22-UI-SPEC "There are no tab groups yet — choose New Group, or drag across the canvas to draw one." and the 21-REVIEW-FIX candidate "…or draw a box around tabs on the canvas to start one." Present both at C1; the UI-SPEC wording is the default.

## Architecture Patterns

### System Architecture Diagram

```
 startup ──► GroupModel.onDidInitializeLayout (not awaited)
               │  subscribe shell add/remove ──► debounced reload()
               ▼
          reload(): GroupQueryService (node, tabs.sqlite reader) + model.liveTabs(main panel)
               │        └─ skips groups in `closing`; keeps their members claimed
               ▼
          GroupModel state: groups, members, ungrouped, activeGroupId, closing{id → timer, snapshot}
               │ onDidChange
     ┌─────────┼─────────────────────────────┬───────────────────────────────┐
     ▼         ▼                             ▼                               ▼
 TabStripWidget.render()            OrganisingWidget.render()        current-tab steering
   mainTabs ∩ showsInStrip()          canvas / tree / undo control     (current widget pending?
   title.className = strip-only        card × / last-group ×            → activate a visible one)
     | pending-close class
     ▼
 dock tab bars (Lumino createTabClass) ── CSS: pending class hidden in every mode

 "+" ─► New Tab command ─► WebTabOpenHandler.open ─► widget ─► GroupModel.joinActiveGroup
                                     │ webTabOpen (row write, chrome)      │ setTabGroup + setGroupOrder
                                     ▼                                     ▼
                              PowerBrowserGroupRequest channel ──► handleGroupMutation ──► tabs.sqlite

 × on a group ─► GroupModel.closeGroup: hide, local hand-off, flash, start UNDO_CLOSE_MS timer
     ├─ Undo ─────────────► unhide (nothing was written)
     ├─ timer ────────────► commitClose: closeGroup mutation (closeGroupRows), setActiveGroup(next),
     │                       close member widgets
     └─ quit flush ───────► commitClose for every pending id; saveSession skips pending keys

 × on a card / Delete ─► open: widget.close() (stock save prompt) ─► closeTab (row closed)
                        not open: closeTab mutation ─► card gone (reader drops closed rows)
```

### Recommended plan split (sequential; every plan touches shared files)

| Plan | Content | Commit rule |
|------|---------|-------------|
| 22-01 | **Copy checkpoint (blocking, Chris)** for every new string, then broaden the copy-check sink derivation (WR-05), land the chosen empty-canvas body and the WR-05 rows (or rewording), retire the old body | The derivation and the contract rows land together so the gate is never red |
| 22-02 | W1 + W2: model self-load, `liveTabs` on the model with a delegating widget method, `showsInStrip`, `joinActiveGroup`, strip wiring, New Tab command, 15-UI-SPEC `:24-26`, the active-group bullet ("Active-group state never filters or hides the tab strip.", `:309`), the Deferred row item; live row `pan03-strip-group-live` | One commit for code (L1) |
| 22-03 | W11 part 1: `closable` (excluding pending once W4 lands; plain count before), canvas and tree × omitted, `TreeSectionHooks` gains the flag, model and command guard; spec bullet; close-exactness and view-parity stay green | — |
| 22-04 | W4 mechanism: `closing` map, `UNDO_CLOSE_MS` timer, `undoCloseGroup`, `commitClose` (the existing write plus `setActiveGroup(next)` plus the member-close loop moved from the widget), `load()` skipping pending ids, the all-modes hidden class in the strip loop plus CSS, current-tab steering, the `onWillFlush` commit, the `saveSession` filter. The dialog still opens in this plan; no copy changes | Static rows stay green: the model still contains `kind: 'closeGroup'` and `this.groups[0]?.id`, the widget still calls `closeGroup(this.actor` after the guard |
| 22-05 | W4 UI: delete the dialog and `.pb-org-close-confirm`, the Undo control on canvas and tree, `PANORAMA_UNDO_CLOSE_GROUP_COMMAND_ID` (A12), focus moves, 15-UI-SPEC edits (Color, Copywriting, Retired, Gestures, Canvas Geometry `UNDO_CLOSE_MS` and `.pb-org-undo` rows, UI Considerations), **and** the panorama-copy, canvas-geometry and close-exactness edits; ng-006 and `ng-a-live` (`confirmDialog` → a helper that presses × and waits or commits); live row `pan04-undo-close-group-live` | **SC3: spec copy and all three gui08 checks in one commit, passing** |
| 22-06 | W5: card × (`tabindex = -1`), Delete key, `closeCard` on the model, CSS rows `.pb-org-card-close` width/height, Cards section, live row `pan05-card-close-live` | — |
| 22-07 | `--quick` sweep (0 FAIL, empty baseline), rebuild, live rows on `PB_VERIFY_PORT`, Chris live confirmation, ratification items | — |

Check each plan against `python3 scripts/size-gate.py` (`MAX_ITEMS = 20`, `MAX_LINES = 500` [VERIFIED: `scripts/size-gate.py`]). 22-05 is the largest; if it exceeds the gate, move the ng-006/ng-a-live edit and the live row into a follow-up plan, but keep the spec and the three static checks in one commit.

### Pattern 1: the model loads itself (22-02)
**What:** `GroupModel` becomes a `FrontendApplicationContribution`. In `onDidInitializeLayout`, without awaiting, it subscribes to `shell.onDidAddWidget` / `onDidRemoveWidget` → a debounced `reload()` and calls `reload()` once. `reload()` is `this.load(this.reader, this.liveTabs(...))` with `GroupQueryService` now injected as a value.
**Why not `onStart` and not awaited:** `modes-frontend-module.ts:1-11` documents that awaiting a backend read in `onStart` re-enters a boot-chain deadlock; `organising-widget.ts:185-195` documents that touching the shell during layout restore hung startup.
**Widget:** `liveTabs()` stays on the widget and returns `this.model.liveTabs([...this.shell.mainPanel.widgets()].filter(w => w !== this))`, so `A.cardKey`'s `shell` substitution keeps working. `initialize()` stays (ng-a-live calls it). The widget's own add/remove reload subscription goes; `holdTheMainArea` stays.
**Excluded ids:** the model's `liveTabs` must exclude the Organising widget (id `powerbrowser.modes.organising`, `OrganisingWidget.ID`); the model cannot import the widget (cycle), so pass the filtered list or compare the id string.

### Pattern 2: one strip predicate on the model (22-02, 22-04)
```typescript
// group-model.ts -- shape only; names are the planner's.
showsInStrip(widget: Widget, current: Widget | undefined): boolean {
    const key = this.keyOf(widget);
    if (this.isClosingKey(key)) return false;                      // A3: pending close, shown nowhere
    if (!this.loaded || this.loadFailed || !this.activeGroupId) return true; // A6
    if (widget === current) return true;                           // A5
    const group = this.groupOfKey(key);                            // visible groups only
    return group === undefined || group === this.activeGroupId;    // D1: loose shows
}
```
The strip calls it from `mainTabs()` and subscribes `this.groups.onDidChange(() => this.update())` in `init`. A key the model has never seen (a tab seconds old) is loose and shows, so the strip never paints zero tabs.

### Pattern 3: hiding a pending group's tabs in every bar (22-04)
In the same render loop that writes `STRIP_ONLY_CLASS`, append a second class for pending-close widgets (the loop already visits every main-area widget and runs while the strip is hidden). One unscoped CSS rule hides it in every mode: `.lm-TabBar-tab.<pending-class> { display: none; }`. Writing `title.className` anywhere else is wiped by the next strip render (`tab-strip-widget.tsx:551-554`).
**Steering:** a hidden tab must not be the current widget of a pane. On `shell.onDidChangeCurrentWidget` and on every pending-set change, if a tab bar's current title belongs to a pending widget, select another non-pending title in that bar. `activateWidget` and `TabBar.currentTitle` are not `*LayoutData` or perspective methods, so the gui07 vocabulary gate stays green.

### Pattern 4: deferred close with commit on timer and on quit (22-04)
```typescript
// group-model.ts -- shape only.
export const UNDO_CLOSE_MS = 15000;   // 15-UI-SPEC Canvas Geometry row (Source: group-model.ts)

closeGroup(id)        // guard: visible groups > 1 (PAN-06); hide id; local hand-off to groups[0];
                      // remember { index, wasActive, members }; start the timer; fire change. No write.
undoCloseGroup(id)    // clear the timer; unhide at the old index; restore activity if it was active. No write.
commitClose(id)       // persist { kind: 'closeGroup', id } (closeGroupRows, unchanged);
                      // setActiveGroup(next) when one remains (fixes the :631 defect);
                      // close the member widgets (loop moved from organising-widget.ts:401-403).
```
Register `profileStorage.onWillFlush(e => e.waitUntil(this.commitAllClosing()))`, and make `SetupsService.saveSession` skip any web tab whose `rowKey` the model reports pending. With the filter, a quit inside the window never restores the group's web tabs even if the commit write misses the 2000 ms bound; with the commit, the rows are closed and the group row is gone. The member-close loop at flush time also removes Theia widgets before `storeLayout` runs.
A failed commit write reverts per the existing `persist` discipline (save-error bar, Retry), as 22-UI-SPEC step 9 requires.

### Pattern 5: "+" joins the active group (22-02)
```typescript
// chrome-bar-commands.ts New Tab command -- shape only.
const widget = await handler.open(uri);
if (widget instanceof Widget) { await this.groups.joinActiveGroup(widget); }
focusAddressPill();
```
`joinActiveGroup(widget)`: return when no active group (D1); insert the card locally if the model has not seen it; `moveCard(actor, key, activeGroupId)` (appends at the end, writes `setTabGroup` then `setGroupOrder`); on failure the tab stays open and loose behind the existing save-error bar (22-UI-SPEC). After the write resolves, trigger `reload()` once, so a debounced load that ran before the write landed cannot leave the card loose (Pitfall 4).

### Pattern 6: card close (22-06)
- × built in `buildCard`: `tabIndex = -1`, `stopPropagation` on `pointerdown`, `click` and `dblclick` (A9; the strip's close does the same).
- Open card: `widgetForTab(tab)?.close()` (the stock save prompt for a dirty editor, A8); the web tab sends `closeTab` itself (`web-tab.ts:444-450`); a Theia tab with a row sends it on disposal (`watchClose`, `group-model.ts:188-201`). Remove the card locally only once the widget is disposed, so a cancelled save prompt keeps the card.
- Not-open card (`open: false`): `persist(... actor.mutate({ kind: 'closeTab', uri }))` with local removal and a revert that re-inserts at the old index.
- Do not call `dissolveEmptied` (A8). Do not write `setTabGroup(uri, null)` (R6).

### Anti-Patterns to Avoid
- **A second reader file in `modes/src/browser`.** `gui08-view-parity` fails it. Put every new read on `GroupModel`.
- **Moving `liveTabs` or `initialize` off the widget.** Every `cardKey` live row breaks.
- **Committing a close on the mode-switch path** (R1).
- **Writing `title.className` outside the strip's loop.** The next strip render erases it.
- **A tabbable × in a card.** Breaks the one-tab-stop-per-scope contract (15-UI-SPEC Cards, probed by gui08-loose-cards-live).
- **Retiring "Close Group".** It is a substring of "Undo Close Group", so the substring search would always fail (22-UI-SPEC "Leaving the contract").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Closing a group's rows | A new chrome-side commit or tombstone column | `closeGroupRows` via the existing `closeGroup` kind | Already idempotent, exact and checked by close-exactness |
| Save prompt on a dirty editor | A custom dirty check | `widget.close()` / `ApplicationShell.closeWidget` | Theia's `closeWithSaving` replaces `close` on saveable widgets |
| Quit-time write | A new quit observer or chrome hook | `ProfileStorageService.onWillFlush` | The flush already runs before `storeLayout` with the backend alive |
| Reload debounce | A custom timer | `pDebounce` as the widget uses | Same coalescing behaviour |
| Hiding tabs in dock bars | DOM queries over `.lm-TabBar-tab` | `title.className` plus a CSS rule, written in the strip loop | Lumino renders the class on every bar |
| Spec parsing in checks | New regexes per check | `scripts/lib/ui-spec.mjs` (`copyContract`, `geometryRows`, `normaliseSlots`) | One parse for both checks |

## Common Pitfalls

### Pitfall 1: the model is never loaded in Browsing
**What goes wrong:** the filter silently shows every tab. **How to avoid:** Pattern 1. **Warning sign:** `A.model().isLoaded` false in Browsing on a fresh launch.

### Pitfall 2: the harness depends on `liveTabs` and `initialize` living on the widget
Delegate; do not move. Run one `cardKey` row (ng-004) after 22-02.

### Pitfall 3: view-parity's single-reader rule
A new modes-browser file calling `.listGroups(` fails. `setups-service.ts` must query the model through a non-reader method (for example `isClosingKey`), not `listGroups()`.

### Pitfall 4: races between reloads and writes
"+" opens a widget (shell add → debounced reload) and then writes membership. A load that reads the store before `setTabGroup` lands repaints the card loose, and no later event reloads. Reload after the join write resolves. The row-before-membership order on the channel is [ASSUMED]; `pan03` must join with **no sleep** to prove it. Fallback if it races: carry the group id in `webTabOpen`, which changes the channel and `verify-group-channel`.

### Pitfall 5: reload during an undo window
`load()` rebuilds `groups` from the store, which still holds the pending group. Filter pending ids after members are claimed, so their tabs neither reappear as a box nor fall into the loose set. A frontend reload loses the in-memory window; the group comes back with its tabs (equivalent to Undo). 22-UI-SPEC does not cover reloads; record it.

### Pitfall 6: retired-copy needles
Slot-bearing retired literals (`Close "{name}"? …`) never match source. Add the slot-free fragment **"You can't undo this."** to the Retired copy table so the retirement is actually searched. Do not retire "Close Group" or "Cancel" (22-UI-SPEC).

### Pitfall 7: canvas-geometry rules
A new top-level numeric const in `organising-widget.ts`, `-tiling.ts` or `-geometry.ts` needs a row (plant "derived const without a row"). New `.pb-org-*` font sizes must be 12, 13 or 14 px, weights 400 or 600 (600 only on `is-active` selectors, `verify-gui08-canvas-geometry.mjs:295`). A CSS row needs exactly one declaration of the property in the rule whose whole selector is that class (`ui-spec.mjs` `ruleBodies`). `!important` fails.

### Pitfall 8: the hand-kept command registry
Adding `powerbrowser.panorama.undo-close-group` fails canvas-geometry until `EXPECTED_COMMAND_IDS` gains it in the same commit. The command must stay labelless (exactly one `label:` in `panorama-commands.ts`). Add it to `PANORAMA_COMMAND_IDS` and `PanoramaCommandHandler` too.

### Pitfall 9: gui07 invariant
Do not detach or re-add widgets for undo, and do not call any `*LayoutData` or perspective method in modes or chrome-bar (`verify-mode-switch-tabs-invariant.mjs:25-36`).

### Pitfall 10: a hidden current tab
If a pending widget is the current widget of a pane, its page shows with no tab. Pattern 3 steering. Edge: a split pane whose every tab is pending; select nothing there or leave the pane to the dock's own handling, and assert it in pan04.

### Pitfall 11: dirty editors at commit
The member-close loop runs at the timer, possibly in another mode, and a dirty editor prompts then (22-UI-SPEC step 8 allows the commit). At quit, a prompt inside the flush may hold it to the 2000 ms bound; the `saveSession` filter covers web tabs, but a dirty editor that stays open is stored in the layout and reopens loose. [ASSUMED]; check in pan04 only if feasible, otherwise record.

### Pitfall 12: unstaged new scripts and registry rows
Stage `pan03`/`pan04`/`pan05` before `scan-brand-residue`; register each row once. Live rows need a committed tree (`assertCleanTree`) and a rebuilt sidecar.

### Pitfall 13: locked check files
`phase-gate.py` reports `test file changed` for a check file pinned in the ledger's `check_locks` (`scripts/phase-gate.py:106-160`). Whether `verify-ng-006-*.mjs` or `scripts/lib/ng-a-live.mjs` is pinned could not be read (ledger readable only through `ledger-report.py`, which does not list locks). [ASSUMED] at least ng-006 is pinned; run `python3 scripts/phase-gate.py --root .` after the edit and, if it prints, route the change through `scripts/ledger-amend.py` with Chris.

## Code Examples

### Copy-sink derivation, broadened (22-01)
```javascript
// verify-gui08-panorama-copy.mjs -- shape only. Every quote style, ternary branches included;
// bare identifiers and member reads (tab.title, tab.url) are values, not copy.
const SINK = /(?:textContent|\btitle|placeholder|alt|\.label)\s*=\s*([^;\n]+)|setAttribute\('aria-[a-z]+',\s*([^)\n]+)\)/g;
for (const m of src.matchAll(SINK)) {
    for (const lit of (m[1] ?? m[2]).matchAll(/'((?:[^'\\\n]|\\.)*)'|`([^`]*)`/g)) {
        const text = lit[1] ?? lit[2];
        if (text && !/^\$\{[^}]*\}$/.test(text)) out.push(unescapeUnicode(text)); // pure-slot templates are values
    }
}
```
Plants to add: an `aria-description` literal added (surplus), a template `textContent` added (surplus), the grip `aria-valuetext` reworded (surplus/missing pair). Keep the existing 10.

### Registry rows (shape of the neighbours)
```bash
    "gui08-close-exactness|node $REPO_ROOT/scripts/verify-gui08-close-exactness.mjs"            # verify-platform.sh:3928, quick
      "ng-006-close-group-closes-web-tabs|node $REPO_ROOT/scripts/verify-ng-006-close-group-closes-web-tabs.mjs"  # :4826, full tier
```
New live rows go beside `gui08-loose-cards-live` (`:4834`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Model loaded only by Organising | Model loads itself at layout init | Phase 22 (22-02) | The strip can filter from launch |
| Strip never filtered (13-01 RED: "STAYS TOP … never hides other tabs") | Browsing strip shows active + loose + current | Phase 22, amended by 22-CONTEXT L2 | 15-UI-SPEC `:24-26` and the `:309` bullet change |
| Close Group behind a destructive confirm, committed on click | × hides for 15 s, Undo, commit on timer or quit | Phase 22 (W4) | `--color-danger` leaves Panorama; three gui08 checks change |
| Panorama commits hidden groups on `hideTabView` | Commit on timer and quit only | Phase 22 (R1) | Mode switches never close tabs |

## Chris Touchpoints

| # | When | What | Blocking |
|---|------|------|----------|
| C1 | 22-01, first task | Copy: **"Undo Close Group"**, **"Undo Close Group "{name}""**, **"Close tab"**, the empty-canvas body (UI-SPEC wording or the 21-REVIEW-FIX candidate), WR-05 **"{w} by {h} pixels"** (adding it needs the 15-UI-SPEC "bounds" rule read as allowing the user's own box size) and **"{title}"** + line break + **"{url}"**, each add-verbatim or reword | yes |
| C2 | End-of-phase verify | Ratify or overturn the UI-SPEC assumptions where the report differed: A2 (15 s, no discard ×), A4 (quit commits), A5 (current tab shown; the alternative is the active group following the tab), A7 ("+" is the only joining path), A10 (last-card-out still dissolves the last group), A11 (no active-group label), and the flash kept | no |
| C3 | 22-07 | Live run on his display: pan03/pan04/pan05, ng-004, ng-006, ng-007, ng-008, gui02-web-tab-live, gui07-mode-switch-tabs-live, gui08-loose-cards-live | yes |
| C4 | If `phase-gate.py` prints after the ng-006 / ng-a-live edit | A `scripts/ledger-amend.py` approval. The NG-006 row text begins "Close Group closes the group's in-shell web tabs as well as its stock tabs, as i…" (truncated by `ledger-report.py`); the check's header says "as its dialog says", which W4 makes untrue, so the row text may need an amend too | yes, if it fires |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `webTabOpen`'s row write is processed before the following `setTabGroup` on the same channel | Current State, Pitfall 4 | "+" join fails with "unknown tab URI"; carry the group id in `webTabOpen` instead |
| A2 | Binding `GroupModel` as a `FrontendApplicationContribution` does not reintroduce the boot deadlock, given it never awaits in `onStart` | Pattern 1 | Frontend hangs at startup; move the first `reload()` to `onDidInitializeLayout` only (already the recommendation) or to the first strip `onAfterShow` |
| A3 | Setting `title.className` re-renders every Lumino tab bar holding that title | Pattern 3 | Hidden class shows late; force `update()` on the bars |
| A4 | Current-tab steering through `TabBar.currentTitle` / `activateWidget` covers split panes | Pattern 3, Pitfall 10 | A page shows with no tab after leaving Organising |
| A5 | Group actor writes issued inside the quit flush complete within the 2000 ms listener bound | Pattern 4 | Group survives a quit with not-open cards (no tabs restored, thanks to the snapshot filter); A4 partially unmet |
| A6 | A dirty editor's save prompt during commit or quit behaves as described in Pitfall 11 | Pitfall 11 | Editor reopens loose after restart |
| A7 | `verify-ng-006-*.mjs` (and possibly `ng-a-live.mjs`) is pinned in `check_locks` | Pitfall 13 | If unpinned, no ledger step is needed |
| A8 | The planner-chosen names (`showsInStrip`, `joinActiveGroup`, `commitClose`, `pan03`/`pan04`/`pan05`) are free | Patterns | Rename; no behaviour change |

## Open Questions

1. **Split panes during an undo window.** What we know: hiding uses tab-bar classes; Lumino keeps a current title per bar. What's unclear: the right state for a pane whose every tab is pending. Recommendation: steer to any non-pending widget in the main area; assert the home pane only; record the rest.
2. **Frontend reload during the window.** It ends the window as an Undo (Pitfall 5). Recommendation: accept and record; 22-UI-SPEC is silent.
3. **CONTEXT "closeGroupRows is touched".** Research found no edit needed; the writer becomes what the timer fires (ROADMAP Research line: "W4 touches the chrome-side writer `closeGroupRows`"). Recommendation: no change to `PowerBrowserAPI.sys.mjs`; close-exactness keeps every chrome-side assertion unchanged, which proves it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | all checks | ✓ | v24.19.0 | — |
| nix `.#theia` | `tsc`, sidecar rebuild | ✓ | `/run/current-system/sw/bin/nix` | — |
| python3 | `phase-gate.py`, `size-gate.py`, `ledger-report.py` | ✓ | 3.14.7 | — |
| Built shell | live rows | ✓ | `objdir/dist/bin/powerbrowser` (2026-10-17 11:39) | — |
| Display session | live rows | Chris's session | — | Blocking checkpoint C3 |
| Port 3000 | — | Chris's container | — | Never used; `PB_VERIFY_PORT=3939` |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (node checks); live rows over `scripts/lib/ng-a-live.mjs` |
| Config file | the `CHECKS` array in `scripts/verify-platform.sh` (gui08 static block `:3904-3941`; full-tier ng and gui08 live rows `:4824-4834`; gui02/gui07 live `:4869-4900`, at `02ce825`) |
| Quick run command | `node scripts/verify-gui08-{panorama-copy,canvas-geometry,close-exactness,view-parity}.mjs [--self-test]` (read-only, under 1 s each) |
| Commit gate | `scripts/verify-platform.sh --quick`, 0 FAIL, `docs/non-gui/quick-baseline.txt` empty |
| Full suite command | `scripts/verify-platform.sh` (carries the live rows) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction | File Exists? |
|--------|----------|-----------|-------------------|-------------------|-------------|
| PAN-02 | Decisions recorded before worklist code | doc | `git log --format=%h -1 -- .planning/phases/22-panorama-worklist/22-CONTEXT.md` precedes the first 22-02 code commit (`git merge-base --is-ancestor`) | A worklist code commit older than the CONTEXT commit | ✅ |
| PAN-03 | Strip = active + loose + current in Browsing; "+" joins with no sleep; Coding bars list every tab; no active group → unfiltered, "+" loose | live | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only pan03-strip-group-live` | Filtered tab listed, loose tab hidden, "+" card loose or row `group_id` not the active group, a Coding bar missing a tab | ❌ W0 |
| PAN-03 | No second reader; liveTabs delegation | static | `--only gui08-view-parity` and `-self-test` | A modes-browser reader outside the model/widget | ✅ |
| PAN-03 | No regression on New Tab and row keys | live | `--only gui02-web-tab-live`, `--only ng-004-new-tab-row-unknown-uri-error`, `--only ng-007-…`, `--only ng-008-…`, `--only gui08-loose-cards-live` | Any red | ✅ |
| PAN-04 | No dialog; commit fires from the timer and the flush, not the click; undo clears the timer; last-group guard; chrome writer unchanged | static | `node scripts/verify-gui08-close-exactness.mjs` and `--self-test` (rewrite) | `ConfirmDialog` back; `kind: 'closeGroup'` inside `closeGroup(` again; `commitClosing` gone from the flush listener; guard removed; `already-closed` → throw | ✅ rewrite |
| PAN-04 | Copy contract and retired set | static | `node scripts/verify-gui08-panorama-copy.mjs` and `--self-test` | Surplus or missing literal; a retired literal in source | ✅ edit |
| PAN-04 | `UNDO_CLOSE_MS` and `.pb-org-undo` rows, undo command id, dialog assertions gone | static | `node scripts/verify-gui08-canvas-geometry.mjs` and `--self-test` | Row value drift; undeclared command id; label count ≠ 1 | ✅ edit |
| PAN-04 | × closes at once; undo restores title, bounds, membership, order and tabs; timer commits; quit commits; mode switch keeps the window; tabs hidden in Coding bars during the window | live | `--only pan04-undo-close-group-live` | Any of these | ❌ W0 |
| PAN-04 | Tabs and stock tab closed after the window; no open member rows | live | `--only ng-006-close-group-closes-web-tabs` (edited) | Widgets, overlays or stock tab still open; open member rows | ✅ edit |
| PAN-04 | Mode switch never closes tabs | live + static | `--only gui07-mode-switch-tabs-live`, `--only gui07-mode-switch-tabs-invariant` (+ self-tests) | Any red | ✅ |
| PAN-05 | × and Delete close exactly that tab; not-open card gone; group emptied stays; one tab stop per scope; press never starts a drag | live | `--only pan05-card-close-live`, `--only gui08-loose-cards-live` | Card persists, extra tab stop, drag starts, group dissolved | ❌ W0 |
| PAN-05 | `.pb-org-card-close` 24 × 24 rows; type sizes | static | `node scripts/verify-gui08-canvas-geometry.mjs` | Row drift; font size outside 12/13/14 | ✅ edit |
| PAN-06 | One visible group → no × on canvas or tree; command no-op | live + static | `--only pan04-undo-close-group-live` (last-group step); close-exactness guard plant | × present with one group; guard removed | ❌ W0 / ✅ |
| all | Commit gate | gate | `scripts/verify-platform.sh --quick` | Any FAIL; non-empty baseline | ✅ |
| all | Ledger untouched or amended with approval | ledger | `python3 scripts/phase-gate.py --root .` prints nothing | Any line | ✅ |

### Sampling Rate
- **Per task commit:** the gui08 scripts (and `--self-test`) for the files touched; for TS edits `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build && yarn --cwd extensions/chrome-bar build'`; `node scripts/scan-brand-residue.mjs` after `git add`.
- **Per wave:** one `scripts/verify-platform.sh --quick` (run by the orchestrator only), then `python3 scripts/phase-gate.py --root .`.
- **Phase gate:** rebuild the sidecar, the live rows on `PB_VERIFY_PORT`, Chris's confirmation (C3), the full `scripts/verify-platform.sh`.

### Wave 0 Gaps
- [ ] `scripts/verify-pan03-strip-group-live.mjs` plus 1 full-tier row (22-02)
- [ ] `scripts/verify-pan04-undo-close-group-live.mjs` plus 1 full-tier row (22-05)
- [ ] `scripts/verify-pan05-card-close-live.mjs` plus 1 full-tier row (22-06)
- [ ] Broadened copy-sink derivation and its plants (22-01)
- [ ] close-exactness rewrite and canvas-geometry edits with plants (22-05)
- [ ] `ng-a-live.mjs` helper replacing `confirmDialog` (22-05)

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4/V6 | no | — |
| V5 Output encoding | yes | Group titles and tab titles render through `textContent` or `setAttribute`, never `innerHTML` (`organising-tree.ts` header, `organising-widget.ts` cards). The Undo accessible name carries the group title through `setAttribute('aria-label', …)` |
| V7 Error messages | yes | Copy rule; `internalsOf` in panorama-copy runs over the broadened derived set |
| V12/actor origin | yes, unchanged | `handleGroupMutation` rejects non-Theia senders (`PowerBrowserAPI.sys.mjs:2316`); no new actor kind, so `verify-group-channel` is unchanged |

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Internal identifier in new copy (row key in an aria label) | Information disclosure | Broadened sink derivation plus `internalsOf` |
| Lost user data on close (dirty editor, quit inside the window) | Tampering / loss | Stock save prompt; quit-flush commit; session-snapshot filter |
| A check that cannot go red | Repudiation | Planted faults on a green baseline for every rewritten check |

## Sources

### Primary (HIGH: read or run this session)
- `theia/extensions/modes/src/browser/group-model.ts` (full); `organising-widget.ts` (`:22-80, 185-225, 288-445, 485-500, 790-940, 1825-1850, 1930-1940, 2085-2143`); `organising-tree.ts` (full); `panorama-commands.ts` (full); `modes-frontend-module.ts` (full); `setups-service.ts` (`:485-575`); `modes.css` (`:745-800`).
- `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx` (`:60-130, 270-310, 530-570`); `chrome-bar-commands.ts:140-158`; `chrome-bar-widget.tsx` (`:28-40, 290-300, 688-698, 855-862`); `chrome-bar-keybindings.ts`; `chrome-bar.css:440-460`; both `package.json` files.
- `theia/extensions/tab-uris/src/browser/web-tab.ts` (`:335-460, 655-678`); `profile-storage.ts` (`:44-46, 250-320`); `group-actor-client.ts` (`:1-40`); `src/node/tab-query-service.ts:259, 270`.
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` (`:40-60, 680-740, 1506-1530, 1562-1670, 1730-1930, 2260-2465, 3285-3302`).
- `@theia/core` 1.76.0 `react-widget.js`, `tab-bars.js`, `application-shell.js:1546-1562`, `saveable-service.js:189-198`, `common/event.js:319-346`; `@lumino/widgets` 2.7.5 `dist/index.js`.
- Checks: `verify-gui08-close-exactness.mjs` (full), `verify-gui08-canvas-geometry.mjs` (full), `verify-gui08-panorama-copy.mjs:30-200`, `verify-gui08-view-parity.mjs:40-150`, `verify-ng-006-*.mjs` (full), `scripts/lib/ng-a-live.mjs:195-290`, `scripts/lib/ui-spec.mjs` (full), `verify-mode-switch-tabs-invariant.mjs:1-60, 120-148`, `verify-gui09-setups-copy.mjs:388-410`, `scripts/size-gate.py` header, `scripts/phase-gate.py` lock handling.
- Docs: 22-CONTEXT.md, 22-UI-SPEC.md (approved revision), ROADMAP Phase 22, REQUIREMENTS PAN-01..PAN-07, 15-UI-SPEC.md (`:18-30, 100-150, 167-275, 292-372, 451-480`), 15-PANORAMA-WORKLIST.md W1-W5, W11, the sketch-findings skill, sketch 004 (`index.html:170-182, 520-560, 633-652`), 21-RESEARCH.md and 21-VALIDATION.md (form).
- Runs: the four gui08 checks and self-tests; `wc -c docs/non-gui/quick-baseline.txt`; `python3 scripts/ledger-report.py --root .`.

### Secondary (MEDIUM)
- The 2026-10-17 research report (W1+W2, W4, W5, W11 part 1) for the Firefox 44 Panorama citations (`groupitems.js`, `ui.js`, `tabview.properties`), which were not re-fetched here.

### Not used
- The codebase-memory graph: its tools are deferred and no loader was available to this agent. Caller claims rest on `grep` over `theia/extensions/*/src` and `scripts/` plus reading the call sites.

## Metadata

**Confidence breakdown:**
- Code facts and line numbers: HIGH (read at `02ce825`). Registry line numbers move whenever `verify-platform.sh` is edited; re-read before editing.
- Mechanisms (self-load, hiding, steering, flush commit): MEDIUM. Each rests on verified framework behaviour but none has run.
- Live behaviour (channel order, steering in splits, dirty editors at quit): LOW until C3.

**Research date:** 2026-10-17
**Valid until:** the first 22-02 commit changes `group-model.ts`, or 30 days.
