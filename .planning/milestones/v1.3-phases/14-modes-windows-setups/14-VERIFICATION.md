---
phase: 14-modes-windows-setups
verified: 2026-10-19T04:43:03Z
pass: 1
scope: "retroactive, written in v1.4 Phase 23 plan 23-05 against the tree at HEAD 47fe50a; scores all 25 must_haves.truths of plans 14-01 to 14-05 under the four v1.3 Phase 14 success criteria on today's registry rows and the Phase 23 live logs; plans 14-04 and 14-05 have no SUMMARY"
status: human_needed
score: 17/25 must-haves verified
covered_files:
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-01-PLAN.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-01-SUMMARY.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-02-PLAN.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-02-SUMMARY.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-03-PLAN.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-03-SUMMARY.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-04-PLAN.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-05-PLAN.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-PROBE-DEPENDENT-WINDOWS.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md
  - .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md
  - powerbrowser/INTERNAL-APIS.md
  - powerbrowser/shell/GroupActorChild.sys.mjs
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
  - scripts/check-internals-boundary.sh
  - scripts/verify-backend-env-readers.mjs
  - scripts/verify-dependent-window-content.mjs
  - scripts/verify-group-channel.mjs
  - scripts/verify-gui09-setups-copy.mjs
  - scripts/verify-mode-switch-tabs-invariant.mjs
  - scripts/verify-mode-switch-tabs-live.mjs
  - scripts/verify-mode-toggle-commands.mjs
  - scripts/verify-name-cap-at-input-live.mjs
  - scripts/verify-name-cap-at-input.mjs
  - scripts/verify-ng-035-custom-mode-layout.mjs
  - scripts/verify-ng-036-setup-dock-layout.mjs
  - scripts/verify-panel-motion.mjs
  - scripts/verify-setup-roundtrip.mjs
  - scripts/verify-shell-error-copy.mjs
  - scripts/verify-strip-spike-verdict.mjs
  - theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts
  - theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
  - theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx
  - theia/extensions/modes/src/browser/capped-name-input.ts
  - theia/extensions/modes/src/browser/main-area-exemption.ts
  - theia/extensions/modes/src/browser/mode-descriptors.ts
  - theia/extensions/modes/src/browser/mode-service.ts
  - theia/extensions/modes/src/browser/setups-service.ts
  - theia/extensions/tab-uris/src/browser/browser-window-command.ts
  - theia/extensions/tab-uris/src/node/tab-query-service.ts
covered_digest: "v3:sha256:61ab77f5649a49846158efc06ee84863c4175fdf92864fec680c7bf28c5ca649"
behavior_unverified: 8
behavior_unverified_items:
  - truth: "User saves the current panel layout as a custom mode and picks it from the toggle menu beside shipped defaults (14-02)"
    test: "14-UAT test 5: Save as Mode, then open the toggle menu"
    expected: "The new mode is a row beside Coding / Browsing / Organising and selecting it restores the saved layout"
    why_human: "ng-035 saves and activates through the modes command; no check opens the toggle menu and selects the row"
  - truth: "Unreadable custom-mode data falls back to shipped Browsing with the contracted notice, never a blank shell (14-02)"
    test: "14-UAT test 5: corrupt the custom-mode store, relaunch"
    expected: "Browsing with the contracted notice, no blank shell"
    why_human: "The notice copy is gated (shell-error-copy-no-internals); the fallback path is not exercised by any row"
  - truth: "User saves the current windows, tabs, and mode under a typed name and restores it later with geometry, placement, and mode applied (14-03)"
    test: "14-UAT test 8"
    expected: "Restore reapplies window geometry, tab placement and the mode"
    why_human: "gui09-setup-roundtrip is a schema roundtrip and ng-036 checks the recorded dock layout; neither restores windows"
  - truth: "Restoring with missing tabs still completes on geometry plus mode with the contracted explanation (14-03)"
    test: "14-UAT test 8: close a saved tab, restore the setup"
    expected: "Geometry and mode applied, the contracted explanation shown"
    why_human: "Only the copy is gated (gui09-setups-copy)"
  - truth: "A dependent window hosts exactly one tab view with no IDE frame, and closing the core window ends the session with relaunch restoring the last setup (14-03)"
    test: "14-UAT test 7"
    expected: "One tab view, no second IDE frame; closing the core window ends the session; relaunch restores"
    why_human: "gui09-dependent-window-content is static; its live half has no recorded run"
  - truth: "A dependent whose tab closed elsewhere shows the contracted closed state with a window-only close (14-03)"
    test: "14-UAT test 7: close the tab in the core window"
    expected: "The dependent shows the closed state; its close closes only that window"
    why_human: "Closed-state copy is gated statically; the state transition is not exercised"
  - truth: "Deleting a setup is the only destructive action with the contracted confirmation and no undo (14-03)"
    test: "14-UAT test 8: Delete Setup"
    expected: "One danger-styled confirmation; no other setup action destroys data"
    why_human: "gui09-setups-copy proves one ConfirmDialog construction with the danger class; no row drives a delete"
  - truth: "Coding docks the Explorer on every activation, not only its first (14-04)"
    test: "G-14.1.1-13: enter Coding a second and third time"
    expected: "The Explorer is docked and expanded on the left every time"
    why_human: "No check asserts the Explorer's area after a second Coding visit; gui07-mode-switch-tabs-live asserts main and bottom survival only"
overrides:
  - must_have: "User switches Coding / Browsing / Organising from the chrome-bar toggle and panels reshape with the strip staying top in every mode"
    reason: "The strip-stays-top clause was the Variant-A fallback. After the 13-01 spike re-probed GREEN, 14-UI-SPEC's binding constraint was amended to the Variant B relocation (14-UI-SPEC.md:22-28, per-mode table :256-260), built in 539ba36. The reshape half is carried by the 14-04 truths below."
    accepted_by: "Chris, 14-UI-SPEC binding constraint AMENDED 2026-09-08; GUI-DEFECTS item 2 is his defect statement (tabs should move between modes)"
    accepted_at: "2026-09-08"
  - must_have: "Every tab persists across every mode switch with the status-bar chip re-asserting the count"
    reason: "The tab-count chip was removed; the invariant is enforced by gui07-mode-switch-tabs-invariant and the live row instead (14-UI-SPEC.md:264-270). The tabs-persist half is VERIFIED by gui07-mode-switch-tabs-live."
    accepted_by: "Chris, owner decision recorded in 14-UI-SPEC.md:264 ('The tab-count chip is removed (owner decision, 2026-09-08)')"
    accepted_at: "2026-09-08"
  - must_have: "Organising shows the contracted placeholder slot with a working Back to Browsing control and no canvas surface"
    reason: "The placeholder was sequenced as Phase 14-only ahead of the GUI-08 Panorama canvas; Phase 15 shipped the canvas and the slot no longer exists (14-UI-SPEC.md:277-282 SUPERSEDED; 14-UAT test 6 result superseded)."
    accepted_by: "Chris, v1.3 ROADMAP Phase 15 (GUI-08); recorded SUPERSEDED in 14-UI-SPEC by plan 14.1.1-10"
    accepted_at: "2026-09-07"
  - must_have: "Mode switches slide panels within budget with tabs never unmounting and the chip re-asserting the count"
    reason: "Chris chose G-32 option a: side panels switch instantly, spec amended (14-UI-SPEC.md:197-198, :365; c86f432; modes-panel-motion PASS kind=a). The chip clause is the 2026-09-08 removal above. The tabs-never-unmount half is VERIFIED by gui07-mode-switch-tabs-live."
    accepted_by: "Chris, G-32 answer 'a' on the ROADMAP Phase 23 Needs Chris line (ROADMAP.md:315), recorded by 23-04 and applied by 23-03"
    accepted_at: "2026-10-18"
  - must_have: "New Tab, suggestion activation, and a typed address reuse one stock window and append a tab; only the first navigation opens a window"
    reason: "Superseded by GUI-02 in Phase 14.1: New Tab, typed addresses and suggestions open a web tab inside the shell (WebTabOpenHandler, 14.1-02), so no stock window is involved. The stock-tab path stays as the fallback in browser-window-command.ts:231."
    accepted_by: "Chris, GUI-DEFECTS item 1 (his defect statement: New Tab must add a tab inside the shell) and items 1 and 3 CONFIRMED by him in his window"
    accepted_at: "2026-09-07"
---

# Phase 14: Modes + Windows & Setups Verification Report

**Phase Goal:** The user switches modes that reshape the shell around invariant tabs, and works across core/dependent windows with named setups (v1.3-ROADMAP.md:80)
**Verified:** 2026-10-19T04:43:03Z (retroactive, v1.4 Phase 23 plan 23-05, HEAD `47fe50a`)
**Status:** human_needed

Phase 14 shipped without a verification report. This report scores the 25 `must_haves.truths`
of plans 14-01 to 14-05, read verbatim from their frontmatter, under the four v1.3 Phase 14
success criteria. Evidence is today's registry rows, run directly with `node` into
`.planning/phases/23-modes-leftovers-and-sketch-005-verdict/logs/evidence-23-05.log`
(each with and without `--self-test`, all exit 0), and the live PASS lines Phase 23 already
logged on the current build:

| Log | Row | Result |
|-----|-----|--------|
| `switch-live-23-03.log` (build-23-03, 2026-10-18) | `gui07-mode-switch-tabs-live` | PASS: "1 main-area and 2 bottom-area tab(s) survived every second-visit mode switch, attached" |
| `ng035-23-02.log` (build-23-02) | `ng-035-custom-mode-saves-layout` | PASS |
| `ng036-23-02.log` (build-23-02) | `ng-036-setup-records-dock-layout` | PASS |
| `name-cap-live-23-02.log` (build-23-02) | `modes-name-cap-at-input-live` | PASS |

The last behaviour change in `theia/` is 23-02 (built in build-23-02); 23-03 changed no
`theia/` file and 23-01 changed only a comment in `mode-descriptors.ts`. Under G-32 option a
there is no slide, so no `motion-live` log exists or is needed.

## Plans without a SUMMARY

- **14-04**: no SUMMARY; work landed in d5b8dc1 (2026-09-08, "feat(14): main-area exemption and the group-actor channel, recovered from 09-06") and the 14.1.1 plans.
- **14-05**: no SUMMARY; work landed in d5b8dc1 (2026-09-08) and the 14.1.1 plans.

Their truths are scored on today's evidence like the rest.

## Goal Achievement

### Criterion 1: switch coding / browsing / organising from shipped defaults, customise them, save layouts as modes; modes are data, never a manifest flag

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 1 | 14-01 | User switches Coding / Browsing / Organising from the chrome-bar toggle and panels reshape with the strip staying top in every mode | PASSED (override) | Override: strip-stays-top superseded by the Variant B amendment, accepted by Chris on 2026-09-08. Toggle switching: `gui07-mode-toggle-commands` PASS |
| 2 | 14-01 | Shipped mode defaults are enforced mechanically against the toggle | ✓ VERIFIED | `gui07-mode-toggle-commands` PASS: "3 shipped modes agree across the descriptors, the switch path and the toggle (order, ids, labels, placements, collapse)"; self-test: all planted faults red |
| 3 | 14-02 | User saves the current panel layout as a custom mode and picks it from the toggle menu beside shipped defaults | ⚠️ human_needed | `ng-035-custom-mode-saves-layout` PASS (Save as Mode writes views and furniture; the row applies through the modes command); `modes-name-cap-at-input-live` PASS (the name input cuts at 60). The toggle-menu row is not asserted: 14-UAT test 5 |
| 4 | 14-02 | Unreadable custom-mode data falls back to shipped Browsing with the contracted notice, never a blank shell | ⚠️ human_needed | Notice copy gated by `shell-error-copy-no-internals` PASS (`verify-shell-error-copy.mjs`, 4 modes-copy plants red); fallback not exercised: 14-UAT test 5 |
| 5 | 14-02 | Every new user-facing string follows the contracted copy with no internal identifier | ✓ VERIFIED | `shell-error-copy-no-internals` PASS + self-test (15 and 4 plants red); `gui09-setups-copy` PASS ("18 painted setups strings ... match 18 contracted literals as set equality, no internals in copy"); `gui09-setup-roundtrip` PASS (contracted labels and copy) |
| 6 | 14-04 | The three shipped toggle segments reach ModeService, so the contracted per-mode shell map runs for them instead of being dead code | ✓ VERIFIED | `gui07-mode-toggle-commands` PASS: "the toggle activates modes through the mode command" (derived from the anchored `selectMode` body) |
| 7 | 14-04 | Coding docks the Explorer on every activation, not only its first | ⚠️ human_needed | `ensureInArea('explorer-view-container', 'left')` in `mode-service.ts`; no row asserts the Explorer's area after a second visit (G-14.1.1-13) |
| 8 | 14-04 | The launch mode is applied after the shell layout is initialised, so no cold launch restores against an unattached shell | ✓ VERIFIED | `mode-service.ts:306-307` `onDidInitializeLayout(): Promise<void> { return this.applyLaunchMode(); }` at HEAD; GUI-DEFECTS item 8 CONFIRMED (stock "No saved layout" warning measured gone, confirmed in Chris's window) |

### Criterion 2 (as amended): the tab strip relocates per mode (Variant B, 539ba36), side panels as Chris chose for G-32 (instant), every tab persists across switches

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 9 | 14-01 | Every tab persists across every mode switch with the status-bar chip re-asserting the count | PASSED (override) | Override: chip removed, accepted by Chris on 2026-09-08. Tabs persist: `gui07-mode-switch-tabs-live` PASS (switch-live-23-03.log); `gui07-mode-switch-tabs-invariant` PASS ("8 allowlisted switch calls and 2 mode commands match the declared contract") + self-test |
| 10 | 14-01 | A live probe record proves whether dependent windows open through the stock secondary-window path or need the chrome-side fallback | ✓ VERIFIED | `14-PROBE-DEPENDENT-WINDOWS.md:24` "Verdict: GREEN — stock `moveWidgetToSecondaryWindow` hosts live terminal and editor widgets" (runs 1-4, 2026-09-06); `gui09-dependent-window-content` PASS ("stock-path timing match the declared contract") |
| 11 | 14-02 | Organising shows the contracted placeholder slot with a working Back to Browsing control and no canvas surface | PASSED (override) | Override: replaced by the Phase 15 canvas, accepted by Chris (v1.3 ROADMAP Phase 15) on 2026-09-07 |
| 12 | 14-02 | Mode switches slide panels within budget with tabs never unmounting and the chip re-asserting the count | PASSED (override) | Override: G-32 option a, accepted by Chris on 2026-10-18; `modes-panel-motion` PASS "kind=a" + self-test (9 plants red). Tabs never unmount: `gui07-mode-switch-tabs-live` PASS |
| 13 | 14-04 | A mode's second visit leaves every main-area and bottom-area content tab attached, with no tab lost and none conjured | ✓ VERIFIED | `gui07-mode-switch-tabs-live` PASS (switch-live-23-03.log, every measured hop a second visit, set equality both directions, `isAttached` on the widget object); `main-area-exemption.ts` at HEAD |
| 14 | 14-04 | The invariant is proven BEHAVIOURALLY by a check that drives a real frontend, because no text gate in this tree can see the defect | ✓ VERIFIED | `gui07-mode-switch-tabs-live` and its self-test are registered in the full tier (`verify-platform.sh:4908-4909`); the row drove the built browser on build-23-03 and passed |

Strip relocation itself: `gui07-strip-spike-verdict` PASS ("spike verdict parses ..., routes to a Variant, and agrees with the core-diff instrument"); `chrome-bar-widget.tsx` `applyStripHome` places the strip per mode. No row asserts where the strip sits; that is Chris's live look (14-UAT test 3, G-14.1.1-11).

### Criterion 3: dependent windows hosting tab content, never a second IDE frame; closing the core window ends the session; the next launch restores the setup

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 15 | 14-03 | A dependent window hosts exactly one tab view with no IDE frame, and closing the core window ends the session with relaunch restoring the last setup | ⚠️ human_needed | `gui09-dependent-window-content` PASS + self-test (secondary asset, membership pins); no live run: 14-UAT test 7 |
| 16 | 14-03 | A dependent whose tab closed elsewhere shows the contracted closed state with a window-only close | ⚠️ human_needed | `gui09-dependent-window-content` PASS (closed-state copy); transition not exercised: 14-UAT test 7 |
| 17 | 14-05 | The backend reads its profile directory through the captured-environment accessor, so group and tab queries stop serving an empty answer unconditionally | ✓ VERIFIED | `backend-env-readers` PASS: "env touchers {theia/extensions/token-gate/src/node/powerbrowser-env.ts} equal the 1-entry allowlist; zero direct prefixed reads" (covers `tab-query-service.ts`) |
| 18 | 14-05 | No backend file other than the capture module reads a product-prefixed key off process.env, and a check derives that set from the tree rather than keeping a list | ✓ VERIFIED | `backend-env-readers` PASS over 13 derived backend files; self-test: every plant red, both anti-vacuity guards fail distinctly |
| 19 | 14-05 | The chrome-side actor accepts the frontend's untrusted events, so the group channel delivers for the first time since it was built | ✓ VERIFIED | `group-channel` PASS: "wantUntrusted set"; GUI-DEFECTS item 10 CONFIRMED FIXED (live round trip `ok=true`) |
| 20 | 14-05 | New Tab, suggestion activation, and a typed address reuse one stock window and append a tab; only the first navigation opens a window | PASSED (override) | Override: superseded by GUI-02 in-shell web tabs, accepted by Chris on 2026-09-07 (GUI-DEFECTS items 1 and 3 CONFIRMED: "no OS window opened across '+', typed addresses, link clicks, the mode walk and close") |
| 21 | 14-05 | The wire names shared by the frontend, the actor child and the chrome handler are compared as one derived set, and the untrusted-events flag is asserted, because either can regress silently while every other check stays green | ✓ VERIFIED | `group-channel` PASS ("7 dispatch sites in 5 frontend files, 2 child CustomEvents, request PowerBrowserGroupRequest, wantUntrusted set"); self-test: 15 plants red |
| 22 | 14-05 | The internals catalogue is green: every privileged occurrence carries a row | ✓ VERIFIED | `internals-catalogue` PASS for `PowerBrowserAPI.sys.mjs` and `GroupActorChild.sys.mjs` (`check-internals-boundary.sh --catalogue`) |

### Criterion 4: save, name and restore setups remembering geometry, tab placement and mode

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 23 | 14-03 | User saves the current windows, tabs, and mode under a typed name and restores it later with geometry, placement, and mode applied | ⚠️ human_needed | `gui09-setup-roundtrip` PASS ("setups schema, 4 command ids, contracted labels and copy, cap, and JSON roundtrip"); `ng-036-setup-records-dock-layout` PASS (the setup records the dock layout); `modes-name-cap-at-input-live` PASS (Save Setup name cut at 60). Restore not observed: 14-UAT test 8 |
| 24 | 14-03 | Restoring with missing tabs still completes on geometry plus mode with the contracted explanation, leaving nothing half-applied unexplained | ⚠️ human_needed | `gui09-setups-copy` PASS (explanation copy); path not exercised: 14-UAT test 8 |
| 25 | 14-03 | Deleting a setup is the only destructive action with the contracted confirmation and no undo | ⚠️ human_needed | `gui09-setups-copy` PASS: "1 ConfirmDialog construction(s) each with a danger-scoped class"; no row drives a delete: 14-UAT test 8 |

**Score:** 17/25 (12 ✓ VERIFIED + 5 PASSED (override)); 8 ⚠️ human_needed, 0 ✗ FAILED.

## Overrides

Each override names a decision Chris made, with its record and date. No override rests on the
verifier's judgement.

| Truth | Decision | Record | Date |
|-------|----------|--------|------|
| 14-01 truth 1 (strip stays top) | Variant B relocation after the 13-01 GREEN re-probe | 14-UI-SPEC.md:22-28, :251-260; 539ba36 | 2026-09-08 |
| 14-01 truth 2 (chip re-asserts the count) | Tab-count chip removed | 14-UI-SPEC.md:264-270 | 2026-09-08 |
| 14-02 truth 3 (Organising placeholder slot) | Placeholder replaced by the Phase 15 Panorama canvas | v1.3 ROADMAP Phase 15; 14-UI-SPEC.md:277-282 (14.1.1-10); 14-UAT test 6 | 2026-09-07 |
| 14-02 truth 4 (panels slide; chip) | G-32 option a, instant panels with the spec amended; chip as above | ROADMAP.md:315; 14-UI-SPEC.md:197-198; c86f432 | 2026-10-18 |
| 14-05 truth 4 (New Tab reuses a stock window) | New Tab adds a tab inside the shell (GUI-02, Phase 14.1) | GUI-DEFECTS items 1 and 3, CONFIRMED by Chris | 2026-09-07 |

## Gap Map (14-UAT G-14-1 to G-14-8)

| Gap | 14-UAT status | 14.1.1 successor | Status today |
|-----|---------------|------------------|--------------|
| G-14-1 (tabs survive every switch) | in_tree | G-14.1.1-1 (in_tree, needs-chris) | Fixed at HEAD (`main-area-exemption.ts`, d5b8dc1); `gui07-mode-switch-tabs-live` PASS 2026-10-18; GUI-DEFECTS item 5 IN TREE; Chris's look handed to Phase 24 |
| G-14-2 (toggle applies the shell map) | in_tree | G-14.1.1-2 (in_tree, needs-chris) | Fixed at HEAD; `gui07-mode-toggle-commands` PASS; GUI-DEFECTS item 6 IN TREE |
| G-14-3 (Explorer docks every activation) | in_tree | G-14.1.1-13 (in_tree, needs-chris) | Fixed at HEAD (`ensureInArea`); no row; GUI-DEFECTS item 7 IN TREE |
| G-14-4 (cold launch settles) | in_tree | G-14.1.1-27 (records, open) | Confirmed: GUI-DEFECTS item 8 CONFIRMED |
| G-14-5 (Organising shows real groups and tabs) | in_tree | G-14.1.1-14 (open, needs-chris) | Both facets fixed: `backend-env-readers` and `group-channel` PASS, GUI-DEFECTS item 10 CONFIRMED FIXED; the surface (item 4) stays OPEN under GUI-08 |
| G-14-6 (New Tab opens a tab, not a window) | in_tree | G-14.1.1-27 (records, open) | Closed by Phase 14.1: GUI-DEFECTS items 1 and 3 CONFIRMED 2026-09-07 |
| G-14-7 (web content inside a Theia tab) | deferred | G-14.1.1-27 (records, open) | Superseded: GUI-02 delivered in Phase 14.1 (item 1 CONFIRMED) |
| G-14-8 (internals catalogue green) | open | G-14.1.1-25 (fixed) | Fixed in 973608f per the 14.1.1-UAT `closed_by`; that hash does not resolve in this repository, where the closing commit is `6562412` (2026-09-07, "docs(14.1.1-05): close G-14.1.1-25"); `internals-catalogue` PASS today |

The 14-UAT gap entries themselves still read in_tree / open / deferred; correcting them is
G-14.1.1-27, which this report does not edit.

## Human Verification Required

Status is `human_needed`. Handed to the Phase 24 live UAT session:

### 1. 14-UAT test 3: tab strip relocates per mode (Variant B)
**Test:** Browsing → Coding → Organising → Browsing with two web tabs and a split main area.
**Expected:** Browsing: strip at the very top above the URL row. Coding: the dock's own tab bars in the editor area. Organising: the Panorama canvas, no strip. No tab closed, moved windows or detached.
**Why human:** No row asserts where the strip sits (G-11).

### 2. 14-UAT test 5: custom mode saves and appears beside the shipped defaults
**Test:** Save as Mode with a name; open the toggle menu; select it. Then make the custom-mode data unreadable and relaunch.
**Expected:** The row sits beside the three shipped modes and restores the layout; unreadable data opens Browsing with the contracted notice.
**Why human:** ng-035 drives the command, not the menu; the fallback is not exercised.

### 3. 14-UAT test 7: dependent window hosts one tab
**Test:** Move a tab to a dependent window; close that tab in the core window; then close the core window and relaunch.
**Expected:** One tab view, no IDE frame; the closed state with a window-only close; the session ends and relaunch restores the setup.
**Why human:** The dependent-window gate is static.

### 4. 14-UAT test 8: named setups save and restore
**Test:** Save Setup with two windows in Coding; move windows and switch mode; Restore Setup; close a saved tab and restore again; Delete Setup.
**Expected:** Geometry, tab placement and mode restored; the missing-tab explanation shown; delete asks for one danger-styled confirmation.
**Why human:** The roundtrip row checks the schema, not a restore.

### 5. G-14.1.1-1: tabs survive a second visit, in Chris's window
**Test:** Open tabs, visit each mode twice.
**Expected:** No main-area or bottom-area tab disappears.
**Why human:** `gui07-mode-switch-tabs-live` passes headless; GUI-DEFECTS counts nothing done until seen in the real window.

### 6. G-14.1.1-11: the strip homes are the ratified reading
**Test:** Same walk as item 1.
**Expected:** The three homes in 14-UI-SPEC.md:256-260; GUI-DEFECTS item 2 then moves to CONFIRMED.
**Why human:** Owner confirmation of the relocation.

### 7. G-14.1.1-13: Explorer docks on every Coding visit
**Test:** Enter Coding three times, passing through Organising once.
**Expected:** The Explorer is docked and expanded on the left every time.
**Why human:** No row checks it.

## Gaps Summary

No ✗ FAILED truth. Eight truths need Chris's live look (above); none blocks Phase 23.

## Verification Metadata

**Verification approach:** goal-backward from the four v1.3 Phase 14 success criteria
**Must-haves source:** `must_haves.truths` of 14-01 (4), 14-02 (5), 14-03 (5), 14-04 (5), 14-05 (6) = 25
**Automated checks:** 11 scripts run with and without `--self-test` plus `internals-catalogue`, all PASS (evidence-23-05.log); 4 live rows PASS in the Phase 23 logs
**Human checks required:** 7 (four 14-UAT tests, three 14.1.1 gaps)

---
*Verified: 2026-10-19T04:43:03Z*
*Verifier: Claude (gsd-executor, plan 23-05)*
