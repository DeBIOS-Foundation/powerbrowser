---
status: partial
phase: 14-modes-windows-setups
source: [14-01-SUMMARY.md, 14-02-SUMMARY.md, 14-03-SUMMARY.md, .planning/GUI-DEFECTS.md]
started: 2026-09-06T21:05:00Z
updated: 2026-09-06T21:05:00Z
---

## Current Test

number: 2
name: Content tabs survive every mode switch, including a mode's second visit
expected: |
  Switching modes never unmounts, closes, moves windows, or detaches a content tab — on the first visit to a mode and on every visit after it.
awaiting: live confirmation in Chris's window

## Tests

Phase 14 shipped with no UAT file. This one is created retroactively as the record
the gap entries below hang from, so the tests are written from the phase success
criteria in `ROADMAP.md` and the `must_haves.truths` of 14-01, 14-02 and 14-03 —
not from a conversational UAT run that never happened. Results are what is actually
known today: the four tests live testing broke are `issue`, the rest are `pending`
because nobody has driven them.

### 1. Mode switch reshapes panels per the contracted map
expected: Selecting Coding / Browsing / Organising applies the per-mode shell map at 14-UI-SPEC.md:225-228 — Coding shows the Explorer in a visible left panel and a visible bottom panel; Browsing and Organising hide all three side panels.
result: issue
gap: G-14-2, G-14-3
reason: "Two independent causes, both proven statically. The shipped segments never reached ModeService at all, so the contracted map was dead code; and even when reached, the Explorer dock call is a lookup that no-ops on a miss."

### 2. Content tabs survive every mode switch, including a mode's second visit
expected: No content tab unmounts, closes, moves windows, or detaches across a switch (14-UI-SPEC.md:232-233), and the status-bar chip re-asserts the count.
result: issue
gap: G-14-1
reason: "Stock restores the target mode's stale saved layout and Lumino unparents every widget absent from it. Conditional on a snapshot existing, so a first visit is safe and a second visit destroys — which is why every earlier check on this invariant, automated and human, could pass on a broken tree."

### 3. Tab strip stays top in every mode
expected: The strip does not move between shell areas; the per-mode change is side panels and main-area view only (14-UI-SPEC.md:222-223).
result: skipped
reason: "Ratified Variant-A fallback carried from Phase 13's RED verdict — the strip staying top IS the contract, so there is nothing here to fail. `.planning/GUI-DEFECTS.md` item 2 records a standing request to re-probe Variant B now that `diff-theia-core.sh` passes; that is a re-opened decision, not a Phase 14 defect."

### 4. Launch opens the shell in the launch mode with no blank shell
expected: A cold launch settles into Browsing with the layout attached, and no stock fallback warning about a missing saved layout.
result: issue
gap: G-14-4
reason: "`applyLaunchMode` was fired from `onStart`, which resolves before the shell is attached, so the launch switch snapshotted an empty pre-attach layout and left the restorer with nothing for the active mode."

### 5. Custom mode saves and appears beside the shipped defaults
expected: Saving the current panel layout as a named custom mode adds a toggle-menu row beside Coding / Browsing / Organising; unreadable custom data falls back to Browsing with the contracted notice, never a blank shell.
result: pending
reason: "Never exercised live. Custom-mode rows were the ONE path that already routed through the mode command, so they are the least likely of the mode paths to be broken — but 'least likely' is not an observation."

### 6. Organising shows its contracted slot with no Phase-15 surface
expected: The Organising main area renders the placeholder panel with a working Back to Browsing control and no canvas.
result: superseded
reason: "Phase 15 replaced the placeholder with the real Panorama canvas, so the Phase-14 contract for this slot no longer describes what ships. What the Organising area shows now is tested as test 9 and is broken — see G-14-5."

### 7. Dependent window hosts one tab with no second IDE frame
expected: A dependent window shows exactly one tab view; closing the core window ends the session; the next launch restores the setup; a dependent whose tab closed elsewhere shows the contracted closed state with a window-only close.
result: pending
reason: "Never exercised live. `verify-dependent-window-content.mjs` is green, but its live half was not run in this wave."

### 8. Named setups save and restore geometry, placement, and mode
expected: A setup saved under a typed name restores windows, tab placement, and mode; a restore with missing tabs still completes with the contracted explanation; delete is the only destructive action and carries its confirmation.
result: pending
reason: "Never exercised live. `verify-setup-roundtrip.mjs` is green on the schema roundtrip, which is not the same claim."

### 9. The Organising surface shows the user's own groups and tabs
expected: Organising renders the groups and tabs that exist in the store, or the contracted empty state when there are none.
result: issue
gap: G-14-5
reason: "Two stacked blindnesses, both unconditional: the backend reader read an environment key that had already been deleted out from under it, and the chrome-side write channel had never delivered a single event since it was built. Requirement owner is GUI-08 / Phase 15; recorded here because the investigation and the fix ride in this gap-closure wave."

### 10. New Tab adds a tab without spawning an OS window per click
expected: New Tab, suggestion activation, and typed address commits reuse one stock browser window and append a tab to it.
result: issue
gap: G-14-6
reason: "Every one of the three funnels into `window.open(url, '_blank')`, and the shell window carries no `nsIBrowserDOMWindow`, so each call mints a brand-new stock window. Requirement owner is GUI-06 / Phase 13 plus the GUI-02 deferral; recorded here because the fix rides in this wave."

## Summary

total: 10
passed: 0
issues: 4
pending: 3
skipped: 1
superseded: 1
blocked: 0

Note on the zero: no test in this file has been driven to a pass. That is a
statement about the UAT record, not about the phase — the phase's automated gates
were green throughout, which is precisely the finding G-14-1 turns on.

## Gaps

Status vocabulary used below, because these gaps were found and fixed in the same
working tree and the distinction matters:

- `in_tree` — the fix is written and static-verified, sits uncommitted in the
  working tree, and has never been observed running. This is NOT closed.
- `open` — no fix, or the fix is incomplete in a stated way.
- `deferred` — ratified deferral, not a defect to close here.

Nothing below is marked `resolved`. Per `.planning/GUI-DEFECTS.md`'s own rule,
nothing on this list counts as done until it is seen working in the real window.
Two live runs did happen in this wave and neither is that: one drove the shell to
read a command id and label, which says nothing about any gap here, and one
measured a stock startup warning as gone, which is recorded under G-14-4. Every
other claim below is static reading plus a typecheck plus the existing gates.

- gap_id: G-14-1
  truth: "Content tabs never unmount, close, move windows, or detach across a mode switch"
  contract: "14-UI-SPEC.md:232-233 (the never-detach sentence) and :223 (only side panels and the main-area view change)"
  status: in_tree
  severity: critical
  test: 2
  reason: "Live testing showed main-area content tabs disappearing on a mode switch."
  root_cause: "Stock `@theia/core` `doSwitchPerspective` (theia/node_modules/@theia/core/lib/browser/perspective-service.js) saves the LIVE shell under the OLD perspective id at :126, then reads the TARGET perspective's stale snapshot at :131 and restores it at :135. `setLayoutData` reaches application-shell.js:727-729 `if (mainPanel) { this.mainPanel.restoreLayout(mainPanel) }`, and Lumino's `restoreLayout` (@lumino/widgets/dist/index.js:9564-9571) unparents every widget absent from the restored config. The teardown is CONDITIONAL on a snapshot existing for the target, so a mode's FIRST visit takes the additive `applyViewPlacements` branch and is safe; the second and every later visit restores a stale main area and unparents every tab opened since. Widgets are DETACHED (parent = null), not disposed."
  facets:
    - facet: "The destroyer was misidentified twice before this diagnosis"
      note: "`detachStrayWidgets` (perspective-service.js:136, :365) was blamed first; it walks ['left','right'] only and never touches the main area, so a fix aimed at it would have been a no-op. Poisoned snapshots were also said to persist across relaunches; they do not — the sidecar port is ephemeral, so the frontend's localStorage origin changes every launch. Both corrections are recorded in .planning/GUI-DEFECTS.md."
    - facet: "No gate in the tree could go red on this, and that is the second half of the gap"
      note: "`verify-mode-switch-tabs-invariant.mjs` scopes itself to five named function bodies in two of our own files with a receiver-scoped regex; moving a mutation one hop into a private helper SHRINKS its derived set and is reported as a benign dropped surface. It structurally cannot see inside stock Theia, where the whole defect lives. A product that destroyed a tab on every second mode switch shipped with that gate and the toggle gate both green."
  artifacts:
    - path: "theia/node_modules/@theia/core/lib/browser/perspective-service.js"
      issue: "doSwitchPerspective :126 saves live shell under the old id, :131 reads the target's stale snapshot, :135 restores it — stock, never to be edited (hard rule 1)"
    - path: "theia/extensions/modes/src/browser/main-area-exemption.ts"
      issue: "NEW — the exemption seam; chains every descriptor's onDeactivate/onActivate and strips mainPanel / mainPanelPinned / bottomPanel out of every saved layout before stock can restore one"
    - path: "theia/extensions/modes/src/browser/modes-frontend-module.ts"
      issue: "binds MainAreaExemption and its FrontendApplicationContribution ahead of ModeService's"
    - path: "scripts/verify-mode-switch-tabs-live.mjs"
      issue: "NEW — the behavioural half the text gates structurally cannot be: it drives a real frontend, walks modes so that every measured hop is a SECOND visit, and asserts the main- and bottom-area id sets as set equality in both directions plus isAttached held on the widget OBJECT rather than re-looked-up by id"
    - path: "scripts/verify-platform.sh"
      issue: "registry rows :4712-4713 register the live gate and its self-test in the FULL tier — correctly, since it needs the built browser, but that means --quick still cannot go red on this defect class
  landed:
    - "F1: main-area exemption at the descriptor deactivate seam, covering all switch paths from one hook because onDeactivate fires at :122-124 before the save at :126 and the read at :131, inside the switchInProgress lock. Deleting the whole `bottomPanel` key rather than `bottomPanel.config` is deliberate: `bottomPanel.pinned` and `.expanded` are read outside the config guard. The keep-set hole this opens — `collectWidgetIds` walks mainPanel.main to build the set that PROTECTS side-panel widgets from `detachStrayWidgets` — is closed by re-docking, in afterSwitch(), any widget that was side-docked at deactivate, was named in the stripped config, and is now unparented."
    - "The 'default' perspective has no descriptor and therefore no onDeactivate; that hole is closed from onDidInitializeLayout, which runs after ShellLayoutRestorer's setSavedLayout hydration."
  missing:
    - "RUN the live gate and its self-test against a built browser. Registration is not evidence: the rows exist, no recorded run of them does. The self-test matters more than the gate here — its 're-contaminated saved layout' plant reproduces the unfixed tree exactly, so if that plant does not go red the whole check is decoration."
    - "Observe a second visit to a mode with tabs open, in the real window."
    - "Accept that `--quick` remains blind to this class. The live row is full-tier by necessity, so the commit gate cannot hold this invariant and should not be read as though it does."
  behaviour_change: "Per-mode main-area arrangement is now deliberately NOT restored on a switch: which tabs are open and their order become global, not per mode. Bottom-panel CONTENT arrangement likewise. That is the point of the exemption and it matches 14-UI-SPEC.md:232-233, but it is visible to anyone who relied on per-mode tab sets."

- gap_id: G-14-2
  truth: "The chrome-bar mode toggle applies the contracted per-mode shell map"
  contract: "14-UI-SPEC.md:225-228 (the per-mode shell map) — the whole table was unreachable for the three shipped modes"
  status: in_tree
  severity: critical
  test: 1
  reason: "Coding mode showed no Theia view at all."
  root_cause: "`chrome-bar-widget.tsx:371` (pre-fix) called `this.perspectives.switchPerspective(next.toLowerCase())` directly for the three shipped segments, while only custom-mode rows routed through `MODES_ACTIVATE_COMMAND_ID`. Everything a mode contracts — the panel map at mode-service.ts:230-252, `visibilityFor()` at :312-321, the organising slot — sits AFTER the switch call inside `activateMode`, so the direct call reached none of it. The contracted panel map was dead code for Coding, Browsing and Organising from the day it was written."
  artifacts:
    - path: "theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx"
      issue: "selectMode bypassed ModeService; rerouted to executeCommand(MODES_ACTIVATE_COMMAND_ID, id), the exact shape selectCustomMode already used"
    - path: "scripts/verify-mode-toggle-commands.mjs"
      issue: "hard-required the literal 'switchPerspective' in the widget, so the reroute made a green gate go red; rewritten to derive the toggle's channel from the anchored selectMode body"
  landed:
    - "F2: the reroute. Without it F1 does not fix the Coding symptom — F1 stops the teardown, F2 is what makes the mode map run at all."
    - "The gate that hard-required the old spelling was rewritten in the same wave rather than papered over with a cosmetic mention, which would have been green-by-construction."
  missing:
    - "Observe Coding docking the Explorer and the bottom panel in the real window."

- gap_id: G-14-3
  truth: "Coding docks the Explorer in a visible left panel on every activation, not only the first"
  contract: "14-UI-SPEC.md:227 — Coding, left panel visible (Explorer)"
  status: in_tree
  severity: major
  test: 1
  reason: "Coding showed no Theia view even once the switch was routed correctly."
  root_cause: "`leftPanelHandler.expand('explorer-view-container')` (mode-service.ts:234, pre-fix) cannot dock anything. `side-panel-handler.js:282-289` is a pure `find` over the widgets ALREADY in the left dock; a miss returns undefined having done nothing. The only code that ADDS the view is stock `applyViewPlacements` (perspective-service.js:151-193), which runs on a mode's FIRST activation only. Once Coding carried a saved layout without the Explorer, nothing in the tree could put it back."
  artifacts:
    - path: "theia/extensions/modes/src/browser/mode-service.ts"
      issue: "expand() with no add path; `ensureInArea` added ahead of it"
  landed:
    - "F3: `ensureInArea(id, area)` resolves the widget through WidgetManager, returns early only on `widget.isAttached && shell.getAreaFor(widget) === area`, and adds it otherwise."
    - "The obvious guard was rejected on evidence: `if (this.shell.getWidgetById(id)) return` is UNSOUND here — `getWidgetById` resolves against a FocusTracker (application-shell.js:1923-1929) that RETAINS a detached widget until disposal, so in the exact failure case it returns early and does nothing."
  missing:
    - "Observe the Explorer docking on a second and third visit to Coding."
  behaviour_change: "`ensureInArea` can MOVE the Explorer view from the main area back into the left dock if a user dragged it there. That is what stock `applyViewPlacements` does on a first activation, and it names only the Explorer container, never a content tab — but it is a move, and the mode-service header now carries that exception explicitly."

- gap_id: G-14-4
  truth: "A cold launch settles into the launch mode with the layout attached"
  contract: "14-UI-SPEC.md:226 — Browsing is the launch default"
  status: in_tree
  severity: major
  test: 4
  reason: "Cold start showed a blank shell and stock logged a fallback warning about no saved layout for the launch mode."
  root_cause: "`void this.applyLaunchMode()` from `onStart` (mode-service.ts:195, pre-fix) returns immediately. `frontend-application.js` awaits `startContributions()`, THEN `attachShell()`, THEN `initializeLayout()` at :66 — so the launch switch resolved BEFORE the shell was attached, snapshotting an empty pre-attach layout under 'default' and leaving the active perspective with no saved layout by the time the restorer ran."
  artifacts:
    - path: "theia/extensions/modes/src/browser/mode-service.ts"
      issue: "launch switch fired from onStart; moved to onDidInitializeLayout, which fires at frontend-application.js:68 strictly after initializeLayout at :66 and is awaited before 'ready'"
  landed:
    - "F4: `onDidInitializeLayout()` returns `applyLaunchMode()`. Returning rather than voiding is deliberate — stock awaits it, so the launch mode settles before 'ready' and before `SetupsService.applyLastSession`, which is why `reachedState('ready')` was rejected as the hook."
  missing:
    - "Chris's own confirmation on a cold launch."
  note: "This is the only one of the six with any recorded live measurement: `.planning/GUI-DEFECTS.md` item 8 records the stock fallback warning as measured gone (0 occurrences) after a rebuild. That is a session record from this wave, not a UAT observation, and the same file lists the item under 'fixed in the tree, unconfirmed in the window'. Treated here as in_tree accordingly."

- gap_id: G-14-5
  truth: "The Organising surface shows the groups and tabs that exist, or the contracted empty state"
  contract: "GUI-08 (Phase 15) — recorded here because the diagnosis and both fixes ride in this gap-closure wave; Phase 15's own UAT should carry the user-facing confirmation"
  status: in_tree
  severity: major
  test: 9
  reason: "Panorama was empty. Two stacked causes, neither of which is the empty-state contract working correctly."
  facets:
    - facet: "Facet 1 — the backend reader was blind to its own profile directory"
      root_cause: "`powerbrowser-env.ts:66-72` captures every POWERBROWSER_* key and DELETES it out of `process.env` at module load. That module is reached from `src-gen/backend/server.js:64`, thirty-one loads before tab-uris' backend module at :95. `tab-query-service.ts:86` (pre-fix) read `process.env.POWERBROWSER_PROFILE_DIR` in its constructor, so the profile dir was '', `openIfNeeded()` returned null, and `listGroups()` / `getGroupTabs()` / `listUngroupedTabs()` each returned [] unconditionally, forever. `powerbrowser-env.ts:129-131` states the rule this violated verbatim."
      landed: "F8: the reader now goes through token-gate's captured-env accessor. Proven by executing a replay of the real module order, with the scrub asserted as a precondition first so it cannot pass green by accident."
    - facet: "Facet 2 — the group write channel had never delivered an event"
      root_cause: "`registerGroupActor` registered the PowerBrowserGroup actor's event entry without `wantUntrusted: true`. `JSWindowActorProtocol.cpp:130-133` defaults that to false and `EventListenerManager.h:277-280` drops an untrusted event for such a listener; the Theia frontend is web content, so every event it dispatched was untrusted and silently discarded. The channel has been inert since 15-01, and every group mutation waited out its ack timeout instead."
      landed: "F9 carried the flag as a prerequisite — the new-tab work is impossible without it. This is a code-reading result, not an observed one: the finding is from the Gecko C++ plus the upstream precedent, and no agent watched an event fail to arrive."
  artifacts:
    - path: "theia/extensions/tab-uris/src/node/tab-query-service.ts"
      issue: "read process.env after the scrub; now reads POWERBROWSER_ENV"
    - path: "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
      issue: "registerGroupActor events entry lacked wantUntrusted: true"
  missing:
    - "A derive-and-compare gate for the class, not the site: enumerate every file under theia/extensions/*/src/node, derive the set that reads a POWERBROWSER_* key straight off process.env, and require it to equal exactly {powerbrowser-env.ts} — red on an addition AND on a removal, with a --self-test planting each, failing as a broken instrument on an empty derivation. Without it the next backend reader reintroduces this silently."
    - "A gate asserting the actor's events entry carries wantUntrusted: true. Without it the channel can go inert again while every other assertion stays green — which is exactly how it stayed inert for a whole phase."
    - "The store itself holds 0 group rows and 1 tab row, because the chrome-side writer attaches only to navigator:browser windows (PowerBrowserAPI.sys.mjs:1849, :1857 pre-fix numbering). So even with both facets fixed, Organising shows the contracted empty state plus at most one card until GUI-02 lands. Anyone verifying on screen should expect that and not read it as the fix having failed."
    - "`15-RESEARCH.md` and `15-REVIEW.md` both assume the GUI-08 write channel works. It never did. Someone owning those documents should record the correction."

- gap_id: G-14-6
  truth: "New Tab, suggestion activation, and typed address commits open a tab, not an OS window each"
  contract: "GUI-06 (Phase 13) plus the GUI-02 deferral — recorded here because the fix rides in this wave"
  status: in_tree
  severity: major
  test: 10
  reason: "Three navigations produced three separate browser windows."
  root_cause: "`chrome-bar-widget.tsx:217-224` `openCommittedUrl` is the shared sink for all three, and every one funnels into `window.open(url, '_blank')` in `browser-window-command.ts`. The shell window carries no `nsIBrowserDOMWindow`, so `nsWindowWatcher` cannot divert the call into a tab and falls through to `AppWindow::CreateNewContentWindow`, which opens a whole stock window — by design, that is how GUI-01 works. The rationale comment at browser-window-command.ts:31-33 claiming the frontend cannot dispatch a DOM event chrome would see went STALE in 15-01, when the PowerBrowserGroup actor pair landed."
  artifacts:
    - path: "theia/extensions/tab-uris/src/browser/browser-window-command.ts"
      issue: "single sink; now tries the chrome channel first and falls back to the unchanged window.open path"
    - path: "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
      issue: "new openStockTab(url) plus its handleGroupMutation case, riding the existing actor pair and its origin wall"
    - path: "powerbrowser/shell/GroupActorChild.sys.mjs"
      issue: "preventDefault after a successful sendQuery, giving the frontend a synchronous 'chrome took this' answer"
    - path: "powerbrowser/INTERNAL-APIS.md"
      issue: "new catalogue row for Services.wm.getMostRecentWindow; nine existing rows renumbered for the line shift"
  landed:
    - "F9: `openStockTab` appends to the most recent stock window via `gBrowser.addWebTab` and falls back to opening one window when none exists, so the FIRST navigation is unchanged GUI-01 behaviour."
    - "The scheme allowlist is not caution theatre: `PowerBrowserAPI.openBrowserWindow` had no caller anywhere, and `loadOneOrMoreURIs` defaults its triggering principal to the SYSTEM principal. Routing a content-supplied URL there would have been new exposure, so only http/https plus about:newtab pass, and `addWebTab` mints a null principal."
  missing:
    - "The new path has NEVER RUN. `GroupActorChild.sys.mjs` is in jar.mn but was absent from the installed build, and the served frontend is a webpack bundle the TypeScript change had not reached. `.planning/GUI-DEFECTS.md` item 3 records a later tier-2 `mach build faster` that packaged the actor child; still never verified live."
    - "A gate comparing the three literal spellings of the request event name (browser-window-command.ts, modes/group-actor-client.ts, GroupActorChild.sys.mjs) and the two spellings of the message kind, as set equality with an empty derivation failing as a broken instrument. The package dependency direction (modes depends on tab-uris) makes importing one canonical const impossible without closing a cycle, so a gate is the only thing that can hold them together."
  behaviour_change: "Window selection is by recency only, so a private stock window can be the target of a New Tab. Content goes INTO private, never out, so it is not a leak — but it is a visible choice, marked in the source with GUI-04 as the upgrade path. Separately, a malformed-but-http URL that makes `addWebTab` throw now produces silence instead of a window that fails to navigate, because the frontend has already been preventDefault'd by then."

- gap_id: G-14-7
  truth: "Web content renders inside a Theia tab"
  contract: "GUI-02 — explicitly out of scope for v1.3 (REQUIREMENTS.md 'Out of Scope': web-content rendering inside Theia stays deferred; the mirror/proxy bridge is GUI-05, a later milestone)"
  status: deferred
  severity: major
  test: 10
  reason: "Recorded so that the New Tab work in G-14-6 is not mistaken for closing this. It is not, and no plan in this wave attempts it."
  detail: "Ratified at a human gate on 2026-08-30 and re-deferred at every milestone since. It needs the mirror/proxy bridge and is scoped as Phase 10+11 of the next milestone. G-14-6 closes the window spam, which is a separate and much smaller thing: tabs still live in a stock browser window, not in the Theia shell. Hard rule 3 (design for the bridge) is why this stays landable without rework."
  missing:
    - "Nothing to close here. This entry exists to keep the deferral visible next to a fix that touches the same click."
  in_flight: "An untracked spike is running against this at `theia/extensions/modes/src/browser/gui02-overlay-spike.ts` — step 2 of a decomposition recorded in `.planning/GUI-DEFECTS.md` item 1, reporting the main area's rect to chrome so an overlay browser can track the Theia layout. It is env-gated off by default and states in its own header that it is deleted at ratification. A spike deciding whether GUI-02 is buildable does not lift the deferral, and nothing in the two gap-closure plans below depends on it."

- gap_id: G-14-8
  truth: "The internals boundary catalogue names every privileged touchpoint, and the gate that proves it is green"
  contract: "Hard rule 2 — Firefox internals are reached through one anti-corruption layer with every touchpoint catalogued in powerbrowser/INTERNAL-APIS.md, enforced by scripts/check-internals-boundary.sh"
  status: open
  severity: major
  test: null
  reason: "Discovered while writing this record, not by the investigation: `internals-catalogue` is RED in the working tree right now, and it is a --quick row, so it blocks the commit gate for every fix above."
  root_cause: "Catalogue rows are keyed by LINE NUMBER. This wave inserted lines into PowerBrowserAPI.sys.mjs above every row in the 1900+ band, so seven rows point at the wrong lines and the gate reports seven uncatalogued occurrences. No new privileged reach was introduced — the drift is pure renumbering, confirmed by reading each reported line. The affected rows are the tab-store trigger family (Services.wm.getEnumerator, three Services.obs.addObserver/removeObserver pairs) and the single-instance handler pair."
  moving_target: "The line numbers moved again DURING the writing of this file (1950 → 1954 within one minute), because another session is editing PowerBrowserAPI.sys.mjs concurrently. Renumbering by hand is therefore not a fix that stays fixed for as long as this wave is in flight; it has to be redone as the last edit before the commit."
  artifacts:
    - path: "powerbrowser/INTERNAL-APIS.md"
      issue: "seven line-keyed rows stale; the gate names each uncatalogued occurrence"
    - path: "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
      issue: "source of the line shift; not itself at fault"
  missing:
    - "Renumber the seven rows against the final file, as the last edit before the commit, and re-run `check-internals-boundary.sh --catalogue`."
    - "One separately-stale row is already on record and is NOT part of this seven: PowerBrowserAPI.sys.mjs:817 for `SessionStore.getBrowserState`, which the F9 agent found already wrong before touching anything (the method is at :1643 in that agent's numbering). It carries no forbidden pattern, so the gate does not fail on it and it has been silently wrong for some time."
    - "The deeper problem is the keying, not the seven rows: a line-number-keyed catalogue is a merge-conflict magnet and goes stale on every insertion above it. Whether to re-key rows on a stable anchor — the enclosing function name, which the gate already reports — is a decision for whoever owns the boundary script, and is deliberately NOT taken here."
