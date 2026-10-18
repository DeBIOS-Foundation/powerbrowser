---
phase: 22-panorama-worklist
reviewed: 2026-10-18T16:28:22Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - theia/extensions/modes/src/browser/group-model.ts
  - theia/extensions/modes/src/browser/organising-widget.ts
  - theia/extensions/modes/src/browser/organising-tree.ts
  - theia/extensions/modes/src/browser/modes-frontend-module.ts
  - theia/extensions/modes/src/browser/modes.css
  - theia/extensions/modes/src/browser/panorama-commands.ts
  - theia/extensions/modes/src/browser/setups-service.ts
  - theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx
  - theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts
  - theia/extensions/chrome-bar/src/browser/chrome-bar.css
  - theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
  - scripts/lib/ng-a-live.mjs
  - scripts/verify-gui08-canvas-geometry.mjs
  - scripts/verify-gui08-close-exactness.mjs
  - scripts/verify-gui08-panorama-copy.mjs
  - scripts/verify-ng-006-close-group-closes-web-tabs.mjs
  - scripts/verify-pan03-strip-group-live.mjs
  - scripts/verify-pan04-undo-close-group-live.mjs
  - scripts/verify-pan05-card-close-live.mjs
  - scripts/verify-platform.sh
findings:
  critical: 2
  warning: 6
  info: 4
  total: 12
status: issues_found
---

# Phase 22: Code Review Report

**Reviewed:** 2026-10-18T16:28:22Z
**Depth:** standard
**Files Reviewed:** 20 (19 Phase 22 key-files, plus chrome-bar-widget.tsx, which was read for the address-bar question and is not a Phase 22 file)
**Status:** issues_found

## Summary

Scope: the Phase 22 diff `68bf812..HEAD` over the SUMMARY key-files. The review was static. Nothing was built, run or checked live.

The happy paths of PAN-03, PAN-04, PAN-05 and PAN-06 are consistent with their checks. The defects are in four places:

- the failure paths of the two new writers, `commitClose` and `joinActiveGroup`. Both depend on `persist` reverting only on the second failure, and that contradicts 22-UI-SPEC steps 9 and A7.
- the tab strip's `title.className` overwrite. Phase 22 rewrote that line and made it run on every GroupModel change. It wipes Theia's own dirty, pinned and active classes.
- the internal identifier in the address pill, which is older than Phase 22.
- one timing dependency in the NG-006 live check.

Tags used below: "locked: needs Chris re-lock" marks a finding whose fix would edit the hash-locked `verify-ng-006-close-group-closes-web-tabs.mjs`. Where the same fix can be made in an unlocked file, that file is named.

## Critical Issues

### CR-01: The address pill shows `view:powerbrowser.modes.organising` in Organising (older than Phase 22; this is the finding from the 22-04 screenshot)

**File:** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:410-423`. The text comes from `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts:180-181`.

**Issue:** When the Organising surface becomes the current main-area widget, `onCurrentWidgetChanged`, then `syncAddressFromWidget`, then `addressOf(widget)` runs. The widget is not a `WebTabWidget`, so `addressOf` returns `this.tabUris.uriOf(widget)?.toString(true)`. `uriOf` returns `new URI('view:' + factoryId)` for any id in the view-contribution index. `OrganisingContribution` (`organising-widget.ts:2241-2244`) registers `widgetId: 'powerbrowser.modes.organising'`, so the pill reads `view:powerbrowser.modes.organising`. That is a factory id, which is an internal identifier, shown in user-facing UI. It breaks the CLAUDE.md copy rule.

**Origin:** This is not a Phase 22 regression. `addressOf` falling back to the registry URI dates from `c584430` (14.1-02, 2026-09-06), widened by `dee17d2` (14.1-03). The `powerbrowser.modes.organising` view id dates from `3c7d2a1` (14-02). `git diff 68bf812 HEAD` does not touch `chrome-bar-widget.tsx` or `tab-uri-registry.ts`. The code already treats Organising as "a mode, not a tab": see `TabStripWidget.MODE_SURFACES` and the Organising skip in `GroupModel.liveTabs`. The pill is the one surface that does not.

**Fix:** A mode surface has no address. Return the empty string so the pill shows its placeholder, "Search or enter address":
```tsx
protected addressOf(widget: Widget | undefined): string {
    if (!widget || TabStripWidget.MODE_SURFACES.includes(widget.id)) {
        return '';
    }
    ...
```
For other `view:` tabs (Explorer and the like), the pill still shows `view:<factory-id>`, which the 14.1 UI-SPEC (A6, "any other tab's registry URI string") contracts. Whether that is allowed under the copy rule is a ruling for Chris and needs a spec amendment. Do not widen this fix into that case without the ruling.

### CR-02: The strip render overwrites `title.className` for every main-area widget, which wipes Theia's `theia-mod-dirty`, `theia-mod-pinned` and `theia-mod-active`

**File:** `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx:564-568`, and its new trigger at `:105`.

**Issue:** `widget.title.className = [stripOnly, closing].filter(Boolean).join(' ')` replaces the whole class string. Theia keeps its own state in that string:
- `saveable.js:238-240` appends ` theia-mod-dirty`.
- `application-shell.js:719/737` appends ` theia-mod-pinned`.
- `application-shell.js:1054` appends ` theia-mod-active`.

The next strip render erases all three. That causes three problems:
- A dirty editor loses its unsaved marker in the dock bar. This matters in Coding mode and for the PAN-05 step (d) editor.
- `getPinnedMainWidgets()` (`application-shell.js:647`) reads the pinned state back from `className` when the layout is stored, so a pinned tab is saved unpinned. Its `title.closable` stays `false`, so the tab is left with neither a close button nor a pin marker.
- The focused-area marker is cleared.

The overwrite has existed since `7b7a1f7`. Phase 22 rewrote the line (`4fcf4b2`) and added `this.groups.onDidChange(() => this.update())`, so it now also runs on every model change: every reload, close, undo and card move.

**Fix:** Change only the two classes this strip owns:
```tsx
const own = new Set([STRIP_ONLY_CLASS, GROUP_CLOSING_CLASS]);
const kept = widget.title.className.split(' ').filter(c => c && !own.has(c));
if (stripOnly) kept.push(STRIP_ONLY_CLASS);
if (closing) kept.push(GROUP_CLOSING_CLASS);
widget.title.className = kept.join(' ');
```

## Warnings

### WR-01: A failed close commit neither keeps the group hidden nor restores it, and a second failure can duplicate the box

**File:** `theia/extensions/modes/src/browser/group-model.ts:862-885`, and `restoreClosing` at `:844-856`.

**Issue:** `commitClose` passes `apply = () => this.closing.delete(id)` to `persist`, and `persist` runs `apply` before the write. If the `closeGroup` mutate fails once, `persist` does not revert (`attempts` is 1), and the timer's `.catch` only logs. The group is then in neither `closing` nor `groups`. Its tabs, whose widgets are still open, reappear in the strip and in the dock bars because `isClosingKey` is now false. The box is gone and there is no Undo control. The next `reload` (any widget add or remove) reads the group back from the store as a normal visible box. If Retry then fails as well, `retryPending` calls `revert`, which is `restoreClosing(entry)`. That inserts `entry.group` into `this.groups` again without checking for its id, so two boxes with the same `data-g` are painted.

22-UI-SPEC step 9 says "a failed restore or commit write reverts the painted change". The code does that on neither the first failure nor the second.

**Fix:** Make `restoreClosing` idempotent, and restore the group on the first commit failure:
```ts
private restoreClosing(entry: ClosingGroup): void {
    if (!this.groups.some(g => g.id === entry.group.id)) {
        const at = Math.min(entry.index, this.groups.length);
        this.groups = [...this.groups.slice(0, at), entry.group, ...this.groups.slice(at)];
    }
    ...
}
// in commitClose: try { await this.persist(...) } catch (e) { this.restoreClosing(entry); this.changeEmitter.fire(); throw e; }
```
The save-error bar still shows, because the `close:id` slot stays in `pendingWrites`.

### WR-02: A failed "+" join leaves the tab in the group in memory, and its save-error bar is not on screen in Browsing

**File:** `theia/extensions/modes/src/browser/group-model.ts:301-317`, `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts:155-163`.

**Issue:** `joinActiveGroup` runs `moveCard`, which runs `persist`. On the first failure, the `apply` (the card moved into the active group) is not reverted, so `locateCard` and `showsInStrip` treat the tab as a group member while the store has it loose. 22-UI-SPEC A7 says "the tab stays open and loose". The chrome-bar command catches the error and only logs it. The save-error bar is drawn only by `OrganisingWidget.renderBars`, and the user pressed "+" in Browsing, so nothing on screen reports the failure. The membership is corrected only when a later reload happens to re-read the store, and the `card:<uri>` slot then still offers a Retry that would join it after all.

**Fix:** In `joinActiveGroup`, on a thrown `moveCard`, put the card back loose locally (`removeCardLocal` then `insertCardLocal(card, null)`, then fire the change emitter) before rethrowing. For on-screen feedback in Browsing, use the existing status-bar notice path, which needs contracted copy. If no copy is approved, record the gap in 22-UI-SPEC rather than leave it silent.

### WR-03: Undo restores the group's activity only in memory, and the next reload overrides it

**File:** `theia/extensions/modes/src/browser/group-model.ts:844-856`.

**Issue:** The sequence is:
1. Close active group A. The hand-off to `groups[0]` happens in memory only.
2. Inside the window, the user activates group C. That is persisted through `setActiveGroup`.
3. The user presses Undo. `restoreClosing` sets `activeGroupId = A` in memory and writes nothing.

The store still marks C active, so the next `load` sets `storeActive = C`, and the active group, with the Browsing strip's filter, switches from A to C without any user action. Step 4 of the spec ("active again only if it was active when closed") holds only until the next reload.

**Fix:** Restore activity in memory only when the store still marks A active, that is, when nothing was written in between. Otherwise either leave the current active group alone, or persist `setActiveGroup(A)` on undo. The first is simpler and writes nothing, which keeps check (d) of `verify-gui08-close-exactness` ("Undo writes nothing") true.

### WR-04: `closeGroupCommitted` returns before the commit has finished, so NG-006 depends on a fixed 1 s sleep (locked: needs Chris re-lock if fixed in ng-006 itself)

**File:** `scripts/lib/ng-a-live.mjs:269-275`, `scripts/verify-ng-006-close-group-closes-web-tabs.mjs:38-43`.

**Issue:** The helper waits for `!isClosing(id)`. `isClosing` turns false in `commitClose`'s `persist` apply, which runs before `client.mutate({ kind: 'closeGroup' })` is sent. The member widgets are closed only after that mutate resolves (`group-model.ts:874-879`). NG-006 then does `A.sleep(1000)` and asserts that no member widget is still open. On a loaded host where `closeGroupRows` plus the stock-tab close takes more than 1 s, NG-006 fails while the product is correct. The pan04 `committed()` probe avoids this by also waiting on `alive(ws) === 0`.

**Fix:** Change only the helper, which is not hash-locked, so the ng-006 hash is unaffected. `persist` deletes the slot after the write and the widget-close loop:
```js
for (i = 0; i < 600 && (A.model().isClosing(id) || A.model().hasPendingWrite); i++) await A.sleep(100);
if (A.model().isClosing(id) || A.model().hasPendingWrite) throw new Error('the Close Group commit never finished');
```
Editing the `A.sleep(1000)` in ng-006 instead is the locked path: locked: needs Chris re-lock.

### WR-05: The "+" join relies on an ordering between two channels that the code does not guarantee

**File:** `theia/extensions/modes/src/browser/group-model.ts:301-317`. Chrome side: `powerbrowser/shell/PowerBrowserAPI.sys.mjs:3297`, `:1764-1773`.

**Issue:** The row for a new web tab is written by `webTabOpen`, fire-and-forget (`writeTabRow(...).catch(...)`, not awaited), in reply to a request on the web-tab channel. `joinActiveGroup` sends `setTabGroup` straight away over the group actor. `setTabGroupId` throws `unknown tab URI` when the row is not there yet. pan03 step (d) passes, which shows the usual ordering. No code enforces it. When the order inverts, WR-02 applies: the join fails silently in Browsing.

**Fix:** For a `web:` key, wait for the row before the membership write, for example by polling the reader for the key with a bound. Or retry `moveCard` once when the error is `unknown tab URI`. Either keeps the single chrome-side writer.

### WR-06: The copy gate's sink pass claims "any quote style" but never extracts double-quoted literals

**File:** `scripts/verify-gui08-panorama-copy.mjs:81-87, 113`.

**Issue:** The doc comment says "every text sink, any quote style". The literal extractor matches only `'...'` and backtick literals, and the `setAttribute` arm of `SINK` matches only a single-quoted attribute name. Two consequences:
- `close.title = "Close tab now"` would be invisible to the gate. Unreviewed copy would pass as a set-equality PASS.
- A double-quoted retired string would also escape the surplus side.

The self-test plants only single-quoted and template cases, so it cannot catch this.

**Fix:** Add a `"((?:[^"\\\n]|\\.)*)"` alternative to the literal regex, and `['"]` around the attribute names in `SINK`. Add a self-test plant `x.title = "Planted words";` that must go red as unreviewed copy.

## Info

### IN-01: The id `'powerbrowser.modes.organising'` is spelled out three more times

**File:** `theia/extensions/modes/src/browser/group-model.ts:269, 895`; `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx:265`.

**Issue:** Besides `OrganisingWidget.ID`, the string literal appears three more times, which is how CR-01 kept being missed. **Fix:** Export one const from a leaf module with no widget import (for example `mode-descriptors.ts`), import it in all four places, and use it in the CR-01 fix.

### IN-02: The PAN-04 session-snapshot filter holds only because of listener registration order

**File:** `theia/extensions/modes/src/browser/setups-service.ts:546`, `group-model.ts:222`.

**Issue:** `commitClose` clears `closing` synchronously, at the start of the quit flush. The `isClosingKey` filter in `saveSession` works only because `SetupsService.onStart` registers its `onWillFlush` listener before `GroupModel.onDidInitializeLayout` does, and because `saveSession` reads the widgets before its first `await`. The comment ("even if the flush commit misses its bound") claims more than the code guarantees. **Fix:** State the ordering dependency in the comment. A sturdier option is for `commitAllClosing` to keep `closing` populated until each write lands, which is also the WR-01 fix.

### IN-03: Two close-exactness anchors are not scoped to the method they describe

**File:** `scripts/verify-gui08-close-exactness.mjs:226-229, 210-219`.

**Issue:**
- Check (f) searches for `this.groups[0]?.id` anywhere in `group-model.ts`, not inside `closeGroup`.
- Check (d) looks for `.mutate(` only in the body of `undoCloseGroup`, not in `restoreClosing`, which `undoCloseGroup` delegates to.

A hand-off moved out of `closeGroup`, or a write added to `restoreClosing`, stays green. **Fix:** Scope (f) with `methodBody(modelSrc, 'async closeGroup(')`, and run the (d) `.mutate(` test over `restoreClosing`'s body as well. Add one plant for each.

### IN-04: A bar whose only tabs are pending keeps showing the hidden tab's content

**File:** `theia/extensions/modes/src/browser/group-model.ts:231-250`.

**Issue:** `steerFromClosing` skips a bar with no non-pending title, so its tab header is hidden by `.pb-group-closing` while the widget body stays on screen for up to 15 s. This is recorded as research Open Question 1. It is noted here because it contradicts A3 ("shown nowhere"). **Fix:** None required now. Track it as an open item rather than treat it as resolved.

---

_Reviewed: 2026-10-18T16:28:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
