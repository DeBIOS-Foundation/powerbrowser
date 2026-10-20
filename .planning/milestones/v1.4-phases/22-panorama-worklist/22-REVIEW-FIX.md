---
phase: 22-panorama-worklist
fixed_at: 2026-10-18T17:20:00Z
review_path: .planning/phases/22-panorama-worklist/22-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 22: Code Review Fix Report

**Fixed at:** 2026-10-18T17:20:00Z
**Source review:** .planning/phases/22-panorama-worklist/22-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (CR-01, CR-02, WR-01..WR-06; Info findings were out of scope)
- Fixed: 8
- Skipped: 0
- Needs Chris re-lock: none. WR-04 was fixed in the unlocked helper, so the NG-006 hash is unchanged.
- Needs Chris copy review: one item, under WR-02. No copy was added.

## Fixed Issues

### CR-01: The address pill shows `view:powerbrowser.modes.organising` in Organising

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`
**Commit:** 6c9181b
**Applied fix:** `addressOf` now returns `''` for a widget in `TabStripWidget.MODE_SURFACES`. The pill shows its existing, reviewed placeholder ("Search or enter address") and not the factory id. No new copy. This is the internal-identifier removal case that the CLAUDE.md copy rule already decides. Other `view:` tabs (Explorer and the like) still show `view:<factory-id>`, as 14.1 UI-SPEC A6 contracts. That case is left for Chris to rule on, as the review asked.

### CR-02: The strip render overwrites `title.className` for every main-area widget

**Files modified:** `theia/extensions/chrome-bar/src/browser/tab-strip-widget.tsx`
**Commit:** 5fa873f
**Applied fix:** The render now removes and re-adds only `pb-strip-only` and `pb-group-closing`. All other classes in the string are kept, so `theia-mod-dirty`, `theia-mod-pinned` and `theia-mod-active` survive.

### WR-01: A failed close commit neither keeps the group hidden nor restores it

**Files modified:** `theia/extensions/modes/src/browser/group-model.ts`
**Commit:** 680534c
**Status:** fixed: requires human verification (failure-path logic, not exercised by any live row)
**Applied fix:**
- `restoreClosing` is idempotent: it inserts the group only if its id is absent.
- `commitClose` restores the group on the first failed write (22-UI-SPEC step 9) and rethrows. The `close:` slot stays, so the save-error Retry still applies.
- A Retry that lands removes the restored box, and clears the active id if it pointed at that box.

### WR-02: A failed "+" join leaves the tab in the group in memory

**Files modified:** `theia/extensions/modes/src/browser/group-model.ts`
**Commit:** 9bd258b
**Status:** fixed: requires human verification (failure-path logic)
**Applied fix:**
- On a thrown `moveCard`, `joinActiveGroup` calls the new `leaveLoose`. It puts the card back loose locally (A7: "the tab stays open and loose") and fires the change.
- `leaveLoose` also wraps the `card:` slot's write so that a Retry re-paints the join before it replays. A Retry that lands joins the tab. A Retry that fails reverts it loose through the slot's own revert.
- **Needs Chris copy review:** on-screen feedback in Browsing is still missing. The save-error bar is drawn only in Organising, so a failed "+" join in Browsing shows nothing. Reporting it there needs contracted copy, for example a status-bar notice. No copy was added, and 22-UI-SPEC was not edited.

### WR-03: Undo restores the group's activity only in memory

**Files modified:** `theia/extensions/modes/src/browser/group-model.ts`
**Commit:** 2eb1b7f
**Status:** fixed: requires human verification (state-handling logic)
**Applied fix:**
- New `activityWritten()` clears `wasActive` on every group still in its undo window.
- It is called from `setActiveGroup`'s apply and before `commitClose`'s hand-off write.
- Undo makes the group active again only if no activity write landed during the window. It still writes nothing, so check (d) of `verify-gui08-close-exactness` still holds.

### WR-04: `closeGroupCommitted` returns before the commit has finished

**Files modified:** `scripts/lib/ng-a-live.mjs`
**Commit:** 1f35f9c
**Applied fix:** After the undo window ends, the helper also waits, with a 60 s bound, until `hasPendingWrite` is false. That happens only after the `closeGroup` write and the member widget closes. Only the unlocked helper changed. The locked `verify-ng-006-close-group-closes-web-tabs.mjs` and its `A.sleep(1000)` are untouched.

### WR-05: The "+" join relies on an ordering between two channels

**Files modified:** `theia/extensions/modes/src/browser/group-model.ts`
**Commit:** 8e57e96
**Status:** fixed: requires human verification (race handling; the inverted order was not reproduced)
**Applied fix:**
- For a `web:` key whose join is refused with `unknown tab URI`, `joinActiveGroup` waits `JOIN_ROW_RETRY_MS` (500 ms) and retries `moveCard` once, starting from a fresh slot.
- A second failure leaves the tab loose, as in WR-02.
- Chrome's single writer is unchanged.

### WR-06: The copy gate's sink pass never extracts double-quoted literals

**Files modified:** `scripts/verify-gui08-panorama-copy.mjs`
**Commit:** e17793b
**Applied fix:**
- The sink literal regex now has a `"..."` alternative.
- The `setAttribute` arm accepts `['"]` around the attribute name.
- Two self-test plants were added: `x.title = "Planted words";` and `x.setAttribute("aria-label", "Planted label");`. Both go red as unreviewed copy.
- The gate is green on the tree (31 = 31), and the self-test passes with 16 plants.

## Verification

All gates ran in the **main checkout** at `/home/chris/coding/Power-Browser`, because `workflow.use_worktrees` is false. The results can be reproduced from that tree.

- **Type-check:** `tsc -p . --noEmit` was clean for `theia/extensions/chrome-bar` and `theia/extensions/modes` after each Theia edit. `node --check` passed for `ng-a-live.mjs`.
- **Sidecar rebuild:** `nix develop .#theia --command bash -c "cd theia && yarn build"` exited 0. The rebuilt `lib/` and `bundle.js` contain the new code.
- **Live rows on PB_VERIFY_PORT=3939:** `pan03-strip-group-live`, `pan04-undo-close-group-live`, `pan05-card-close-live` and `ng-006-close-group-closes-web-tabs` all PASS.
- **Dirty-tree override for the live rows:** they ran with `PB_NG_ALLOW_DIRTY=1`. The only tracked change in the tree was another session's `.planning/phases/22-panorama-worklist/22-VALIDATION.md`, which is not code. Every code change was committed before the runs.
- **Quick gate:** `scripts/verify-platform.sh --quick` reported 134 rows PASS and 0 FAIL ("all checks passed").

---

_Fixed: 2026-10-18T17:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
