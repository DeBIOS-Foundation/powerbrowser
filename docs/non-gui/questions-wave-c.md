# Wave C questions (NG-029 – NG-040)

No row is dropped, deferred or narrowed. Every row is planned in wave C's plan. The items below are ownership grants the plan needs, choices the plan made that you may want to change, and notes for the controller. Numbers match the references in the plan.

## Q1: Three existing gate scripts change with this wave's files (grant needed)

These `--quick` gates encode the current shape of files wave C owns. No wave's scope lists them. The plan edits each one in the task that changes the file it reads. Without these edits, that task's commit gate goes red:

- `scripts/verify-mode-switch-tabs-invariant.mjs`, Task 5 (NG-029). `DECLARED_LAYOUT_USES.switchPerspective` drops `setups-service.ts`, because setups now go through ModeService. The gate reports a declared caller that stopped calling as stale.
- `scripts/verify-setup-roundtrip.mjs`, Task 7 (NG-031) and Task 8 (NG-036). The label contract changes from "restore and dependent-open stay labelless" to four labels. `EXPECTED_WINDOW_FIELDS` gains `modeId` and `dock`.
- `scripts/verify-mode-toggle-commands.mjs`, Task 9 (NG-035). The gate now derives the shipped rules from the new `SHIPPED_MODE_RULES` table instead of the `ensureInArea('explorer-view-container', 'left')` literal and the `visibilityFor` body. One self-test plant is retargeted to the table.

A related choice: NG-031's two menu entries are registered from `SetupsCommandContribution.registerCommands` through an injected `MenuModelRegistry`. The usual way is a `MenuContribution`, which needs one bind line in `theia/extensions/modes/src/browser/modes-frontend-module.ts`. No wave owns that file. If you grant the line, Task 7 moves the two `registerMenuAction` calls into `registerMenus` and binds `MenuContribution` to the same class.

**To unblock:** confirm the three gate edits, and say whether to grant the `modes-frontend-module.ts` line.

## Q2: `PowerBrowserGroupParent.receiveMessage` (settled)

Settled by decisions.md R17. Waves B and C each add one branch; the second merge keeps both. The plan's Task 10 notes this.

## Q3: One new source file (confirm)

`theia/extensions/tab-uris/src/browser/profile-storage.ts` holds `ProfileStorageService`, the profile-scoped `StorageService` behind NG-033, and `ShellStateFlushContribution`, the frontend half of the quit flush. The bind lines go in `tab-uris-frontend-module.ts`, which wave C owns. The class could live inside that module file instead, but it is about 200 lines with its own concern.

**To unblock:** confirm the new file, or rule that it goes into `tab-uris-frontend-module.ts`.

## Q4: Catalogue line numbers after other waves' merges (controller procedure)

NG-040 turns `internals-catalogue` green and adds the reverse check: each row's line must hold the internal the row names. Every later edit above a catalogued line shifts rows. Examples are wave A's merge (its PowerBrowserAPI.sys.mjs edits), wave B's Tasks 7–8 and wave E's Tasks 13–14.

- `node scripts/verify-ng-040-internals-catalogue-lines.mjs --fix` renumbers shifted rows.
- It refuses a guess: two equally near candidate lines, or a row whose method no longer holds the internal.
- A new touchpoint still needs a row written by hand.

Wave B's plan already runs `--fix`. Wave A's Task 11 says the re-sync is wave C's.

**Proposal:** every merge that edits `PowerBrowserAPI.sys.mjs` after wave C's does two things in its merge commit. It runs `--fix`, and it adds rows for the lines `bash scripts/check-internals-boundary.sh --catalogue` names. Wave C runs `--fix` itself after pulling wave A (Task 12).

## Q5: TSV and test refs (settled)

Settled by decisions.md R1. The plan uses one check file per row, `scripts/verify-ng-NNN-<slug>.mjs`. It writes the three-field TSV with the test ref `scripts/verify-ng-NNN-<slug>.mjs::<label>`, and `node scripts/verify-ng-NNN-<slug>.mjs # <lane>` as the command.

## Q6: NG-031 copy (Chris may rename)

The two new strings are the command labels **"Restore Setup"** and **"Open Tab in Own Window"**. Both appear in the command palette and under View in the menu bar.

- "Restore Setup" matches the picker placeholder 14-UI-SPEC.md:223 already contracts.
- "Open Tab in Own Window" follows the contracted refusal "Power Browser can't open this tab in its own window."
- 14-UI-SPEC.md:233 says a palette label makes a retry clause true for that refusal, and asks for the clause to be restored in the spec row and in `setups-service.ts` together. `.planning/` is controller-only, and `gui09-setups-copy` compares the two. So the refusal string stays unchanged in this wave, and only its code comment records the point.

**To unblock:** approve or rename the two labels (a one-line change each). Choose whether the Task 12 doc sync adds the retry clause to the spec row and to the constant together.

## Q7: "The mode of each window" for dependent windows (NG-036)

Dependent windows host tab content only and have no mode of their own (notes/browser-window-model.md:30-32). The plan records `modeId` on every window row:

- the core window's row carries the active mode;
- each dependent's row carries `null`.

The restore applies the core window's mode.

**To unblock:** confirm this, or define what a dependent's mode should be.

## Q8: The live NG checks have no `--self-test` (CLAUDE.md "Verification")

CLAUDE.md asks every new check for a `--self-test` that plants faults. Wave C's two `--quick` checks meet that:

- ng-039 plants its own fixtures;
- ng-040 has a registered `--self-test` row.

The ten live checks (ng-029 – ng-038) have none. Their proof of red is each row's record-fail on the pre-build tree, and each build task names the call site the final reviewer deletes to see the check go red again (G6). A planted-fault mode for each would roughly double the wave's live-check time. Several of the faults are chrome-side, and a page-realm plant cannot reach chrome-side code.

**To unblock:** accept this, or ask for plant modes on named checks.

## Q9: NG-034 assumes wave A's names (for the Task 12 implementer)

Task 12 consumes these names from wave A's Task 2 Produces block:

- `WebTabOptions.key`
- `WebTabWidget.rowKey`
- `webTabOpen(theiaBrowser, actorRef, tabId, url, key?)`, whose row key is `key` or `'web:' + tabId`
- the `^web:[A-Za-z0-9_-]{1,64}$` key shape

Task 12 produces what wave A's Task 10 asks for (decisions.md R5):

- `SetupsService.applyLastSession()`, holding the saved session as `saved`
- `SetupsService.restoreWebTab({ rowKey, url, withHistory })`
- `SessionSnapshot.webTabs[]`, each with `{ rowKey, url, lastAccessed }`
- `SessionSnapshot.savedAt`, in ms
- `SetupsService.groupReader`

Task 12 opens restored tabs through `WidgetManager` with `WebTabOptions.key`. It does not use wave A's Task 4 opener option (`WebTabOpenerOptions.rowKey`), because that task may merge later than Task 2.

**Note:** if wave A's merged names differ, the Task 12 implementer uses wave A's and reports the difference. No decision is needed unless wave A changes its Task 2 contract.
