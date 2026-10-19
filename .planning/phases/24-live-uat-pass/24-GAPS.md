# Phase 24: defects found during the live UAT run (2026-10-19)

Sources: Chris's own run (A18) and two scripted headless passes over items Chris had not yet
run. The scripted passes are evidence, not UAT results: no sheet row is recorded from them.
For each scripted defect, a second agent tried to show it was a script mistake and could not.
Evidence lives in the session scratchpad (`uat-24/auto*`) and is not tracked.

Fixes are not in v1.4. Each line is a candidate gap for v1.5 planning.

## Seen by Chris

1. **A18, Organising with a split main area.** Organising opens as a tab inside one pane, and
   the other pane keeps its tabs. The Organising tab icon is a blank white square, and the
   group box is clipped at the right edge. Recorded as an issue on 14/3 and 14.1.1/11.
2. **Chrome-side errors in Chris's first launch log**:
   - `LinkHandlerParent.sys.mjs` lines 106 and 160: tab is null;
   - `TranslationsParent.sys.mjs` line 1574: tabBrowser is null;
   - at quit, `GroupActorChild.sys.mjs` line 81: actor 'PowerBrowserGroup' has been
     destroyed;
   - `[handleShellMessage] rejecting non-Theia-origin sender`;
   - a FaviconLoader NS_ERROR_NOT_AVAILABLE.

## Found by the scripted passes, confirmed by an independent re-check

3. **A21, custom mode loses its layout.** Choosing a saved custom mode hides the side panels
   and the menubar, even though the mode was saved from Coding with Explorer open.
   `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:854,863,918-919`
   (`ideDress = modeId === 'coding'`) overrides `mode-service.ts:386-389`. Whether the menubar
   rule should apply to custom modes is a spec question.
4. **B01, corrupt-mode notice is never seen.** `handleCorruptStore` switches to Browsing and
   then flashes the notice into the status bar, which Browsing hides, and the flash is removed
   after 4 s (`mode-service.ts:385,539-549,647-654`). The name in the notice is the lowercased
   id slug ("uat reading", not "UAT Reading") (`mode-service.ts:657-675`). Spec conflict:
   14-UI-SPEC.md:233 calls it a status-bar flash, but :33 says Browsing has no status bar.
5. **A25, card drop ignores the previewed slot.** A drop into a group always appends at the
   end. `finish()` clears `dropPreviewGroupId` and `dropPreviewIndex` before reading them
   (`organising-widget.ts:1806,1821-1843`).
6. **A27, the stack draws every card, and Esc does not close Expand.** The rule
   `.pb-org-card.is-tiled { display: flex }` (`modes.css:428`) beats `[hidden]`, so all 12
   cards draw where at most 5 should. Esc closes the Expand panel only while focus is inside
   the widget, and after a click focus is on `body`.
7. **A31 and A42, a header click does not activate a group.** A zero-distance header press
   re-renders the box before `click` fires (`organising-widget.ts:1421-1425,1606`). Clicking
   the box background and the tree headers both work.
8. **A40, focus is lost after deleting a group's last card.** Focus goes to the title, then
   the reload re-render about 120 ms later drops it to `body`
   (`organising-widget.ts:436-460`; `group-model.ts:219,256,589`).
9. **A44, a dependent window never shows its closed state.** Stock
   `SecondaryWindowHandler.onWidgetRemove` closes the window in the same tick that
   `dependent-windows.ts:93-96` renders "This tab is closed".
10. **A45 and B03, Restore Setup.** The main window's geometry is never applied:
    content-side `window.moveTo` and `resizeTo` are ignored by Gecko
    (`setups-service.ts:962-963`). Each restore also leaves the previous dependent window
    open and empty (`setups-service.ts:1224-1225`).
11. **B02, restored web tabs come back in reverse order** after a relaunch
    (`setups-service.ts:978-1011,1071-1121`, matching by the live `WebTabWidget.url`).
12. **B07, loose cards overlap group boxes.** Unplaced loose cards are laid out with no check
    against group rectangles, so a double-click can hit the wrong card
    (`organising-widget.ts:535-571`).

## Rejected on re-check (not defects)

- **A43:** web tabs are not reopened after a frontend reload. This is by design
  (`tab-uris-frontend-module.ts:109`, WEB_TAB_SESSION).
- **O07:** web tabs are present at relaunch because of the NG-032 session restore. The
  "no web tabs" clause belongs to A01.
