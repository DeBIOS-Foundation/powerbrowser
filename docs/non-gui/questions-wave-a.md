# Wave A: questions and requests

All 20 rows (NG-001 to NG-020) are planned; none is dropped, deferred or narrowed. The items below are preconditions and rulings that the plan needs from the controller or from you. Each one names what it blocks and what unblocks it.

**Status (decisions.md, 2026-09-25):**
- Answered: Q1 by R2 (ownership granted), Q2 by R3 (done in main as `f4818a0`), Q3 by R4 (the controller adds the pointers at merge), Q4 by R5, Q5 by R6 (the rulings stand), Q7 by R1 (one check file per row, and the three-field TSV), Q8 by R7 (fixture taken).
- Open: Q6.
- Wave A's plan now follows R1–R7 and R18.

## Q1: Ownership extensions (controller)

The regions below are outside wave A's list in G11, and no other wave owns them. The plan marks each step that edits one with **(Q1)**. Please confirm wave A may edit them.

1. **`theia/extensions/modes/src/browser/organising-widget.ts` :49, :259, :336–356** (the import, `scheduleShellCapture`'s key line, `liveTabs()`).
   - Why: these build the card key that `dive()` and the close-group code consume. Under NG-001 the key must be `GroupModel.keyOf(widget)`, or Panorama loses every web tab's row the moment Task 2 lands.
   - Blocks: Task 2 (NG-001).
2. **`theia/extensions/modes/src/browser/group-actor-client.ts` :25–36** (the `GroupMutation` union).
   - Why: this is the wire type of `handleGroupMutation`, which wave A owns. Tasks 2 and 7 add `trackTab`, `closeTab` and `touchTab`.
   - Blocks: Tasks 2 and 7 (NG-001, NG-005, NG-009).
3. **`theia/extensions/tab-uris/src/browser/group-query-service.ts` :18–23** (one method, `getSettings`).
   - Why: wave C's restore path reads the settings through this proxy.
   - Blocks: Task 7 (NG-011).
4. **`scripts/verify-chrome-bar-suggestions.mjs` `seedFixture`** (add a `closed_at` column to the scratch table).
   - Why: `searchByPrefix` must skip closed rows, or `gui02-web-tab-live` finds a closed tab's row. The quick check runs the tree's own SQL on a v1-shaped fixture, and that fixture has no such column.
   - Blocks: Task 2's commit gate.
5. **`scripts/verify-gui08-close-exactness.mjs` :222–224** (one expectation).
   - Why: Close Group now keeps member rows as closed history (an UPDATE) instead of deleting them. The check pins the DELETE text.
   - Blocks: Task 5 (NG-006).
6. **`powerbrowser/shell/PowerBrowserAPI.sys.mjs` :45–109** (DDL markers, `TAB_STORE_SCHEMA_HEAD`, store constants).
   - Why: G11 lists this range for no wave, and wave C's :135–208 does not reach it. Tasks 2, 6 and 7 add constants and helpers here and edit nothing in :135–208.
   - Blocks: Tasks 2, 6, 7.
7. **Delete `theia/extensions/tab-uris/src/browser/browser-tab-uri.ts`**.
   - Why: it states the old key rule, and its one importer, TabQueryService, stops importing it in Task 2.
   - Fallback: if the deletion is refused, the file stays as dead code, and wave B's NG-027 reader cleanup can remove it.

Optional (no plan step depends on it): rename `removeTabRow` to `releaseTabRow` at its one caller outside G11, `webTabClose` (:2638). Its old name now overstates what it does; it only stamps `last_active`.

## Q2: Prerequisite P1 in `scripts/lib/firefox-bidi.mjs` (controller; wave C needs the same)

The restart checks (NG-007, NG-008, NG-011, NG-017) need two changes to `withFirefoxPage`:

- A `profileDir` option: a caller-owned profile that is used as given and never removed.
- `applyProfileOverrides` must append to `user.js` instead of overwriting it, so the check's own prefs survive in the clone lane.

The exact diff is in wave A's plan, under "Prerequisite P1". It is a controller change in main, like the program's Task 4. If wave A and wave C each made it, their clones would conflict.

Blocks: Task 1 Step 13 (the live runs), and every live row after that.

## Q3: Pointer lines in the v1.2 schema docs (controller; `.planning/` is yours)

NG-019 asks for SCHEMA.md and MIGRATIONS.md to document every version up to the head. Wave A writes the current schema to `docs/TAB-STORE.md`. Please add this line directly under the title of both `.planning/milestones/v1.2-phases/11-sql-store-design/schema/SCHEMA.md` and `.../MIGRATIONS.md`:

> Current schema, v1 to head, with the row-key rule and retention: see `docs/TAB-STORE.md`. This file keeps the v1 design record.

The `ng-019-tab-store-doc` check requires the string `docs/TAB-STORE.md` in both files. It stays red until the line is in main, so add it before running NG-019's check at merge.

## Q4: NG-011's restore path is in wave C's code (Task 10, `Needs: wave-c`)

"The restore path reads them" means: the launch restore of the last session's web tabs honours `restore_behaviour`, `restore_live_minutes` and `restore_url_days`. That restore is wave C's code, built by its rows for saving the session at quit and restoring web tabs across a restart.

Wave A provides three things:

- the settings table,
- `GroupQueryService.getSettings()`,
- `planWebTabRestore(settings, savedTabs, quitAt)` in `group-model.ts`.

To unblock Task 10, wave C needs to:

- name its launch-restore entry point and its per-web-tab restore call;
- record, per saved web tab, its row key (`WebTabWidget.rowKey`), URL and last-accessed time, plus the save time;
- reopen each tab with the opener option `rowKey`, restoring back/forward history only when `withHistory` is true.

The `ng-011-settings-table-read` check stays red until then. Its part A (the table and the reader) passes after wave A's Task 7.

## Q5: Rulings the plan takes (confirm or change)

1. **The meaning of "the tab's stable registry URI" (NG-001).**
   - Editors, terminals and views are keyed by their registry address (`terminal:t1`, `view:welcome`, `file:///…`).
   - A web tab's registry address is its page URL, and a stock tab has no registry address. Neither is stable, so both get a minted identity: `web:<id>` and `stock:<stamp>-<n>`. These are store keys, not typeable addresses.
   - docs/URI-SCHEMES.md's rule 4 (no minted discriminator in an address) is unchanged, because a row key is not an address.
2. **Settings defaults.** `closed_retention_days` 7 (today's constant), `integrity_check_minutes` 1440, `restore_behaviour` `session`, `restore_live_minutes` 5 (from notes/tab-sql-substrate.md), `restore_url_days` 30.
3. **Panorama cards for tabs that are not open (NG-008).** Grouped tabs whose row is open or restorable get such cards. The Ungrouped tray still lists only open tabs, so it does not fill with every tab a profile has seen. Stock tabs are never cards.
4. **Rows for editors, terminals and views.** They are written the first time the tab is organised (grouped or placed), not when it opens, so address-bar suggestions and history stay web-only. For such a tab, `created_at` is therefore the time it was first organised.
5. **What counts as closing.** A quit or a frontend reload never closes a row: the tabs stay restorable, and grouped ones stay as cards. Only a user's close marks a row closed.

## Q6: Session restore with the shell as the startup window (NG-017)

NG-017's restart relaunches on the same profile with `browser.startup.page = 3`. It then opens a stock window through the shell's `openStockTab`, expecting sessionstore to restore the saved stock tabs into that first stock window. That has not been observed yet, because the shell, not a stock window, is the startup window.

Task 8 Step 3 verifies it first. If sessionstore does not restore, the implementer records what happened here and builds NG-020. NG-017 then needs your ruling on how a restart restores stock windows: for example, whether the shell reopens the last session's stock windows at launch, which would be wave C's code.

## Q7: Heads-up for the controller's recording loop (program Task 8)

Two points about the recording loop:

- `ledger-amend.py record-fail` hashes the file named by the part of `test_ref` before `::`. With `--test-ref "scripts/verify-platform.sh --only <label>"`, `check_key()` resolves that whole string as a path and fails with "check not found". `--test-ref "scripts/verify-platform.sh::<label>"` names the registry file and keeps the label.
- `docs/non-gui/checks-wave-a.tsv` carries each check's tier as a trailing shell comment in the command column, for example `scripts/verify-platform.sh --only ng-001-one-key-rule  # live-main`. A fourth column would reach `bash -c` as extra arguments.

## Q8: Real-profile fixture (Review Focus: an existing profile). Answered by R7.

The copy must be taken before any build containing wave A's Task 2 runs on that profile, because that build migrates the profile to v5. The controller took it before any such build: `~/coding/Power-Browser-fixtures/real-profile-tabs-2026-09-25.sqlite` (schema v4, 6 tabs, 5 groups, 0 grouped), outside the repo and never committed.

NG-015's check, `scripts/verify-ng-015-real-migration-from-every-version.mjs`, reads the fixture through `PB_REAL_PROFILE_FIXTURE`. When the variable is unset, the check prints a notice and skips that one fixture. It always runs the fixtures for v1 to v4 built from the writer's own DDL, and the committed phase-11 `tabs-v1.sqlite`. It copies each store into a throwaway stage before the browser opens it.
