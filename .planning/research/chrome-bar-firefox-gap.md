# Chrome bar vs Firefox: gap list

Produced 2026-10-20 by a 9-agent workflow (run wf_27cf0d5d-344): per-area Firefox inventory from `upstream/` (pinned ESR), compared with the chrome bar as built; completeness critic added 20 items, verdict check overturned 12. Line numbers come from the agents and were not re-checked one by one.

**Chrome bar vs Firefox:** after merging duplicates across areas and applying the verdict corrections, we have 20 features, 31 are partial and 123 are missing. 14 Firefox features do not apply to Power Browser.

Tags: **[API]** means a new PowerBrowserAPI touchpoint plus a row in INTERNAL-APIS.md. **[wall]** means widening a scheme wall, which is a security decision. **[patch?]** means it may need a patch-stack change.

**Already have**
- Back and Forward buttons. They are enabled from the pushed canGoBack/canGoForward and call browser.goBack()/goForward().
- Reload button. It also reopens a lost view in the same click.
- New Tab button. It opens about:blank in the active Panorama group.
- Ctrl+L focus address, from Theia focus and from page focus. A reserved key is at [/home/chris/coding/Power-Browser/powerbrowser/shell/powerbrowser.js](powerbrowser/shell/powerbrowser.js):324-331.
- Address entry for http(s) URLs and dotted hostnames. Loading uses fixupAndLoadURIString.
- The address pill follows the current tab. Escape reverts to the committed address.
- Suggestions dropdown: open tabs plus Places matches, 150 ms debounce, arrow keys, error states.
- Page title as the tab label.
- Loading spinner on the tab icon.
- Mode toggle: Coding, Browsing, Organising and custom modes.
- Browsing tab strip: activate, close, drag to the dock to split, stack pseudo-tab.
- Coding layout controls: panel toggles, Accounts, Manage gear.
- Side panel view icons across the top.
- Side panels do not open when a drag reaches the window edge.
- Custom title bar: drag regions and minimize/maximize/close.
- Enter/Space on the placeholder moves keyboard focus into the page.
- Theia popups hide the page overlay while they are open (occlusion list).
- Open Browser Window, palette only (the GUI-01 escape hatch).
- Save Page Copy, palette only.
- Backspace does not navigate, which matches Firefox's default.

**To add**

**Navigation buttons**
- Stop: reload turns into Stop while loading — new webTabStop kind calling the existing browser.stop(); icon swaps on the pushed loading flag (bridge+chrome, S)
- Hard reload (Shift+click, Ctrl+Shift+R, Ctrl+F5) — bypassCache flag on webTabReload calling reloadWithFlags [API] (bridge+chrome, S)
- Back/Forward history menu (right-click or long-press) — webTabHistory and webTabGotoIndex kinds over sessionHistory, which is already used at :767; rendered as an .lm-Menu (bridge+chrome, M)
- Home button and Alt+Home — Theia preference, navigates over the existing webTabNavigate (theia-only, S)
- New-tab page (partial) — Theia widget with top sites from searchPlaces; showing about:newtab instead needs [wall] (theia-only, M)
- Shortcut text in button tooltips (partial) — built from KeybindingRegistry (theia-only, S)
- Middle-click or modifier-click Back/Reload opens a duplicate tab — webTabDuplicate kind through restoreWebTabHistory (bridge+chrome, M)
- Toolbar context menu — MenuPath through ContextMenuRenderer (theia-only, M)
- Drop a link on New Tab, middle-click to paste and go — onDrop/onAuxClick (theia-only, S)
- Overflow chevron for buttons that do not fit — ResizeObserver plus .lm-Menu (theia-only, M)
- Toolbar item visibility and order — a Theia layout preference, not CustomizableUI (theia-only, L)

**Address bar input**
- Search fallback for non-URL text — searchSubmission store kind over Services.search [API]; first re-rule 13-UI-SPEC "no new addressability scheme" (mixed, S)
- URL fixup for localhost, localhost:4000, host:port (partial; a current bug) — fix typedAddressTargetOf, or add a fixupUri kind over URIFixup [API] (mixed, S)
- Switch to Tab (partial; today it navigates the current tab and creates a duplicate) — activateWidget on the existing widget (theia-only, S)
- Select all on the first click (partial) (theia-only, S)
- IME composition guard: no commit while composing (theia-only, S)
- Search engine suggestions — searchSuggestions kind over SearchSuggestionController [API] (mixed, M)
- Inline autofill — autofill kind (moz_origins) plus setSelectionRange (mixed, M)
- Default search engine picker — listSearchEngines and setDefaultSearchEngine [API] (mixed, M)
- Alt+Enter, Ctrl+click or middle-click opens in a new tab — pass `where` to WebTabOpenHandler.openUrl (theia-only, S)
- Shift+Enter opens in the stock window (corrected to missing) — OPEN_BROWSER_WINDOW with a url (theia-only, S)
- Row favicons, type icons and action text — carry `bookmarked` and the row source; favicon data URI [API] (mixed, S)
- Top sites on empty focus — topSites kind (mixed, S)
- Remove a history row (Shift+Del) — removeHistoryEntry, the first Places write [API] (mixed, S)
- Typed text kept per tab (partial) — WeakMap per widget (theia-only, S)
- Tab, PageUp/PageDown and URL preview in result navigation, plus aria-activedescendant (partial) (theia-only, S)
- Ranking by input history (partial) — recordInputHistory write [API] (bridge+chrome, M)
- Engine aliases and search-mode chip — listSearchEngines (mixed, M)
- One-off engine buttons and switcher (mixed, M)
- Pill context menu with Paste & Go — MenuPath plus a readClipboardText kind [API] (mixed, M)
- Placeholder names the default engine (partial) (theia-only, S)
- Ctrl+Enter adds www. and .com (theia-only, S)
- Bookmark keywords — resolveKeyword kind [API] (bridge+chrome, S)
- Restrict tokens (^ * % ? # $) — `restrict` field on searchPlaces (mixed, S)
- Drag and drop a URL onto the bar (theia-only, S)
- Go arrow button (theia-only, S)
- Clipboard URL suggestion — readClipboardText [API]; needs a privacy decision (mixed, S)
- Quick actions, calculator, unit conversion, tab-to-search, tab-group rows — Theia row sources, or urlbarQuery (theia-only, S each)
- "Clear history" style intervention rows — wait on the Places write (mixed, S)
- Search the selected page text — depends on the page context menu (mixed, M)
- Private-window search (corrected to missing) — depends on private browsing (bridge+chrome, L)
- Semantic history and AI chat rows — product decision; the assistant is a separate project (bridge+chrome, L)

**Site identity and URL display**
- Real security lock, replacing the "starts with https://" string test — NOTIFY_SECURITY plus a securityState field in the state push [API] (bridge+chrome, M)
- "Not Secure" label on http pages (theia-only, S)
- Clear cookies and site data — webTabClearSiteData over SiteDataManager [API] (bridge+chrome, S)
- Site information panel — webTabSiteInfo kind [API] (bridge+chrome, L)
- Site permissions panel — webTabSetPermission over SitePermissions [API] (bridge+chrome, M)
- Permission icons in the identity box — permission summary in the push [API] (bridge+chrome, M)
- URL trimming and domain highlighting (partial) — trim only after "Not Secure" exists; baseDomain from Gecko eTLD [API] (bridge+chrome, S)
- IDN/punycode display (partial) — displaySpec field via nsIIDNService [API] (bridge+chrome, S)
- Mixed-content states — falls out of securityState (bridge+chrome, S)
- Connection security subview (bridge+chrome, M)
- Certificate viewer — rendered in Theia from the cert chain, which keeps the wall unchanged (bridge+chrome, M)
- Tracking-protection shield — NOTIFY_CONTENT_BLOCKING [API] (bridge+chrome, M)
- Protections panel, ETP exception per site [API] (bridge+chrome, L)
- Popup-blocked indicator (bridge+chrome, M)
- Autoplay-blocked indicator (bridge+chrome, S)
- HTTPS-Only per-site toggle [API] (bridge+chrome, S)
- Remove certificate exception [API] (bridge+chrome, S)
- Revert (x) button in the pill (partial) (theia-only, S)
- Split-view button (partial) (theia-only, S)
- Page actions menu: Copy Link, Email Link (theia-only, S)
- Container indicator — depends on containers (bridge+chrome, M)
- Private browsing indicator — depends on private mode; product decision (mixed, XL)

**Page prompts and shell furniture** (no item in this area works in a web tab today)
- Permission doorhangers: camera, mic, location, notifications. Today these are silently denied. Needs a PopupNotifications-compatible shim on the shell window plus a doorhanger push and a doorhangerAction kind [API] (bridge+chrome, XL)
- alert/confirm/prompt, beforeunload, HTTP auth dialogs — live check first, then relay to Theia dialogs [API] (bridge+chrome, L)
- Page right-click context menu — forward the ContextMenu actor message to a Theia menu [API] (bridge+chrome, L)
- target=_blank and window.open open a web tab instead of a stock window — nsIBrowserDOMWindow on the shell window, keyed by opener, keeping GUI-01 [API] (bridge+chrome, L)
- New tab opens next to its opener; closing it reselects the opener — needs the opener id from the item above (mixed, S)
- Form autocomplete popup (form history, logins) — PopupAutoComplete in powerbrowser.xhtml plus the autocompletepopup attribute (bridge+chrome, M)
- Link-hover status panel — nsIXULBrowserWindow.setOverLink push [API] (bridge+chrome, M)
- Per-tab notification bars (hung script, protocol handler, popup blocked) — one generic notification kind [API] (bridge+chrome, L)
- Password save/update doorhanger — on the shim (bridge+chrome, L)
- title/alt tooltips over page content — `<tooltip page="true">` in powerbrowser.xhtml (bridge+chrome, S)
- Camera/mic/screen sharing indicators — webrtcUI state [API] (bridge+chrome, M)
- WebAuthn/passkey and FedCM prompts — on the shim (bridge+chrome, L)
- Add-on install prompts — send them to the stock window (bridge+chrome, M)

**Page tools**
- Find in page (Ctrl+F, F3, highlight all, match count) — webTabFind/webTabFindClose over browser.finder plus a result push [API]. The bar shrinks the page rect rather than hiding the page (bridge+chrome, L)
- Zoom (Ctrl+plus/minus/0, % chip) — webTabZoom over fullZoom plus a zoom field in the push [API]; per-site memory adds M (bridge+chrome, M)
- Print — webTabPrint with the system print dialog [API] (bridge+chrome, M)
- Downloads button and panel — first check what an overlay download does today, then a Downloads.getList push plus action kinds [API] (bridge+chrome, L)
- Favicons on the tab, strip and pill (partial) — favicon field in the push [API] (bridge+chrome, M)
- Tab audio indicator and mute (Ctrl+M) — DOMAudioPlayback listener plus webTabMute [API] (bridge+chrome, M)
- Window fullscreen (F11) — reserved key, window.fullScreen, push so Theia collapses the top panel (bridge+chrome, M)
- Page-requested fullscreen (video) and pointer-lock banner — DOMFullscreen relay, overlay covers the window [API] (bridge+chrome, L)
- Save page: menu entry and Ctrl+S on web tabs (partial); a Save As picker adds M (mixed, S)
- Developer tools for the page — openStockTab now (S), or a toolbox window for the overlay [API] (bridge+chrome, L)
- Cut/copy/paste/undo routed to a focused web tab (partial) — webTabEditCommand [API] (bridge+chrome, M)
- Reader view (F9) — isArticle in the push; load about:reader chrome-side [API] (bridge+chrome, M)
- Crashed-tab indicator and reload — oop-browser-crashed listener [API] (bridge+chrome, S)
- View page source (Ctrl+U) — openStockTab view-source: [wall] (bridge+chrome, S)
- Screenshot (corrected to missing) — drawSnapshot or captureShellRegion behind a user command (bridge+chrome, M)
- Translations — check Remote Settings first [API] (bridge+chrome, L)
- Picture-in-Picture — probe first; PictureInPicture.sys.mjs uses gBrowser [API] [patch?] (bridge+chrome, M)
- Page info dialog [API] (bridge+chrome, M)
- Unload (discard) tab (bridge+chrome, M)
- Touchpad swipe back/forward and pinch zoom [API] (bridge+chrome, M)
- Text encoding repair, page style, caret browsing (F7) [API] (bridge+chrome, S each)

**Bookmarks and history**
- Bookmark star and Ctrl+D (corrected to missing) — addBookmark/removeBookmark store kinds [API] (mixed, M)
- Edit-bookmark popover: name, folder (mixed, M)
- Reopen closed tab (Ctrl+Shift+T) — closed rows plus shellArmWebTabHistory (mixed, M)
- Clear recent history (Ctrl+Shift+Del) — Sanitizer kind that also clears tabs.sqlite closed rows [API] (bridge+chrome, M)
- History menu: recently closed tabs, recent history (partial) (mixed, M)
- Bookmarks toolbar (Ctrl+Shift+B) — listBookmarkFolder('toolbar'); live refresh needs a Places observer push [API] (mixed, L)
- Bookmarks and History side views (partial) — needs a queryHistory kind [API] (mixed, L)
- Library window — openLibrary opens the stock places.xhtml [API] (bridge+chrome, S)
- Bookmark Tab, Bookmark All Tabs — on the addBookmark kind (mixed, S)

**App menu and windows**
- Hamburger menu button in every mode; Browsing has no menu at all today (theia-only, S)
- Quit (Ctrl+Q) (partial) — quitApplication kind wrapping the existing method (bridge+chrome, S)
- Settings (partial) — add about:preferences to openStockTab [wall] (bridge+chrome, S)
- Passwords — about:logins in openStockTab [wall] (bridge+chrome, S)
- Add-ons manager — about:addons in openStockTab [wall] (bridge+chrome, S)
- New private window (Ctrl+Shift+P) — stock window opened private [API] (bridge+chrome, M)
- New window (Ctrl+N) (partial) — maps to the stock window (S); a second shell window is XL (mixed, S)
- Browser menus in the Theia menubar (partial) (theia-only, M)
- Help submenu: diagnostics, about:support, help URLs from configuration.toml (partial) (mixed, M)
- Task manager — about:processes [wall] (bridge+chrome, S)
- Warn on close with many tabs (theia-only, S)
- Import from another browser, work offline [API] (mixed, M)
- Update banner — blocked until a release and update host exist [API] (bridge+chrome, L)
- Profiles [API] (bridge+chrome, L)
- Containers — usercontextid on webTabOpen [API] (bridge+chrome, L)
- WebExtension toolbar buttons and puzzle menu [API] [patch?] (patch-stack, XL)

**Keyboard shortcuts** (each one is a relay row plus a Theia keybinding with a when-clause)
- Ctrl+T new tab; check the clash with Theia's ctrlcmd+t (bridge+chrome, S)
- Ctrl+W close tab (corrected to missing; Theia binds Alt+W) (bridge+chrome, S)
- F5 / Ctrl+R reload (corrected to missing); scope to web tabs because F5 is debug in Coding (bridge+chrome, S)
- Alt+Left / Alt+Right, plus mouse buttons 4/5 (corrected to missing) (bridge+chrome, S)
- Ctrl+Tab from page focus, cycling the strip's visible list (partial) (bridge+chrome, S)
- Alt+D focus address (bridge+chrome, S)
- F6 / Shift+F6 to move between pill and page (bridge+chrome, S)
- Alt+1..9 select tab (bridge+chrome, S)
- Ctrl+PageUp/PageDown select tab; Ctrl+Shift+PageUp/PageDown move tab (mixed, M)
- Ctrl+K search; needs search fallback and a when-clause for Theia chords (mixed, M)

**Tab strip**
- Tab context menu on the strip (partial) (theia-only, S)
- Close Others/Left/Right/Duplicates with a confirm (partial) (theia-only, S)
- Drag to reorder within the strip (corrected to missing) — drop index plus setTabPosition (theia-only, M)
- Middle-click closes a tab; double-click empty strip opens a new tab (theia-only, S)
- Overflow scrolling and List All Tabs (theia-only, M)
- Duplicate Tab — openUrl; full history via webTabDuplicate (mixed, S)
- Move to Group, New Group (partial) (theia-only, S)
- Reload Tab, New Tab menu items (theia-only, S)
- Pin tabs: compact and persisted (partial) (mixed, M)
- Drop a link onto the strip (theia-only, M)
- Move to Start/End, move to the stock window (partial) (mixed, M)
- Multiselect and bulk actions (theia-only, M)
- Hover preview card (partial) (theia-only, M)
- Split-view menu items (partial) (theia-only, S)
- Attention dot for a background title change (mixed, S)

**Not applicable**
- Mozilla account / Sync button and menu banner — Mozilla-branded service; a rebrand needs its own backend
- Synced (remote) tabs in results — depends on Sync
- Send Tab to Device — depends on Sync
- Firefox Suggest (sponsored, weather, Merino) — Mozilla-hosted services
- CFR recommendation pill — Mozilla messaging
- Report Broken Site — Mozilla webcompat service; a configurable report URL is possible instead
- Taskbar Tabs — Windows only, and there is no Windows build
- AI window toggle — the Theia shell is the window model
- AI chats history — Theia AI chat has its own history view
- Customize Toolbar (CustomizableUI) — it customises browser.xhtml chrome, which we do not author
- about: page results in the bar — deliberate scheme wall
- Recently closed windows / reopen window — there is one shell window
- Close the window with the last tab — the Theia shell persists
- Separate search bar widget — Firefox hides it by default; the pill's search mode covers it

Product decisions still open: private browsing, containers, WebExtensions and Sync.

**Shared groundwork**
- **Wider state push.** Add securityState, zoom, favicon, audible/muted, displaySpec, baseDomain, isArticle and crashed to webTabPush ([/home/chris/coding/Power-Browser/powerbrowser/shell/PowerBrowserAPI.sys.mjs](powerbrowser/shell/PowerBrowserAPI.sys.mjs):3385) and WebTabState ([/home/chris/coding/Power-Browser/theia/extensions/tab-uris/src/browser/web-tab.ts](theia/extensions/tab-uris/src/browser/web-tab.ts):150). Unblocks: lock, Not Secure, trimming, IDN, zoom chip, favicons, audio, reader view, crashed tab.
- **Page-focus shortcut relay.** One `{kind:'shortcut', id}` push fed by a table of reserved keys in [/home/chris/coding/Power-Browser/powerbrowser/shell/powerbrowser.js](powerbrowser/shell/powerbrowser.js):297-331, generalising focusAddress. Unblocks every shortcut row, Ctrl+Shift+T, Ctrl+D, F11 and the find/zoom/print keys.
- **Web-tab action kinds.** Add them beside the existing cases in handleGroupMutation (PowerBrowserAPI.sys.mjs:2467-2530), behind the webTabIdIsValid check, and update the verify-web-tab-bridge.mjs gate. Unblocks: stop, hard reload, history menu, zoom, find, print, mute, edit commands, duplicate, unload.
- **Popover/menu primitive.** Popups portaled as .pb-chrome-bar-dropdown (BLOCKING_LAYER_SELECTOR, web-tab.ts:99), plus the MenuPath/ContextMenuRenderer pattern from [/home/chris/coding/Power-Browser/theia/extensions/chrome-bar/src/browser/layout-controls-widget.tsx](theia/extensions/chrome-bar/src/browser/layout-controls-widget.tsx):81-130. Unblocks: app menu, site and permission panels, bookmark editor, downloads panel, history menus, tab context menu. The find bar is the exception: it shrinks the page rect instead of hiding the page.
- **Places-write policy and store kinds.** Re-rule the read-only Places row in [/home/chris/coding/Power-Browser/powerbrowser/INTERNAL-APIS.md](powerbrowser/INTERNAL-APIS.md):36. Unblocks: star, bookmark editor, bookmarks toolbar, remove history row, input-history ranking, clear history.
- **Search area in PowerBrowserAPI.** Services.search for submission, engines and suggestions, or a spike of headless UrlbarProvidersManager.startQuery behind one urlbarQuery kind. Unblocks: search fallback, suggestions, engine picker, aliases, one-offs, autofill, keywords, calculator, unit conversion, tab-to-search.
- **Shell-window furniture shims, built in PowerBrowserAPI.** PopupNotifications, nsIBrowserDOMWindow, setOverLink, a notification box, the prompt relay, context-menu actor forwarding, and autocomplete/tooltip elements in powerbrowser.xhtml. Unblocks: all doorhangers, passwords, window.open-to-tab, status panel, page context menu, form autofill.
- **openStockTab allow-list decision.** Settle it once at PowerBrowserAPI.sys.mjs:1108-1110. Unblocks: about:preferences, logins, addons, processes, support, and view-source.

**Recommended first batch:**
1. Search fallback and the localhost/host:port fixup. The bar is labelled as a search box but cannot search, and it cannot open dev URLs.
2. The shortcut relay with Ctrl+T/W/R and Alt+Left/Right.
3. Stop and hard reload. Both use existing internals and are S.
4. Real security state with "Not Secure". The current lock is misleading.
5. The hamburger menu button, which every later menu item needs.

All are S–M. Most of them build the shared groundwork, so later items get cheaper.

Counts are approximate because merged rows can be cut differently. I did not re-check any line numbers or claims against the code; everything comes from the earlier inventory and correction data.