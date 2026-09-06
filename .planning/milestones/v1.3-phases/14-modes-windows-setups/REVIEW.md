---
phase: 14-modes-windows-setups
reviewed: 2026-09-06T07:30:00Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - theia/extensions/modes/package.json
  - theia/extensions/modes/tsconfig.json
  - theia/extensions/modes/src/browser/mode-descriptors.ts
  - theia/extensions/modes/src/browser/mode-service.ts
  - theia/extensions/modes/src/browser/modes-commands.ts
  - theia/extensions/modes/src/browser/modes-frontend-module.ts
  - theia/extensions/modes/src/browser/organising-placeholder-widget.ts
  - theia/extensions/modes/src/browser/modes.css
  - theia/extensions/modes/src/browser/setups-service.ts
  - theia/extensions/modes/src/browser/setups-commands.ts
  - theia/extensions/modes/src/browser/dependent-windows.ts
  - theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
  - theia/extensions/chrome-bar/package.json
  - theia/package.json
  - theia/applications/browser/package.json
  - scripts/verify-mode-toggle-commands.mjs
  - scripts/verify-mode-switch-tabs-invariant.mjs
  - scripts/verify-setup-roundtrip.mjs
  - scripts/verify-dependent-window-content.mjs
  - scripts/verify-platform.sh
findings:
  critical: 2
  warning: 11
  info: 7
  total: 20
status: findings
---

# Phase 14: Code Review Report

**Reviewed:** 2026-09-06T07:30:00Z
**Depth:** deep
**Files Reviewed:** 20
**Status:** findings

## Summary

Reviewed the full Phase 14 change surface (14-01 probe + shipped descriptors,
14-02 customs + placeholder + toggle rows, 14-03 setups + dependents) including
cross-boundary tracing into the installed stock Theia 1.74.1
(`perspective-service.js`, `shell-layout-restorer.js`, `secondary-window-handler.d.ts`,
`application-shell.d.ts`, `view-contribution.js`, `dialogs.js`) and empirical
proofs (forced `tsc -b` with `modes/lib` hidden; gate runs with the secondary
asset hidden). Two BLOCKERs, both proven, not inferred.

**Hard-rule verification (all hold):** `powerbrowser/` diff across the phase
range is empty (GREEN route intact — no Gecko change, `PowerBrowserAPI.sys.mjs`
+ `INTERNAL-APIS.md` byte-identical); `git -C upstream diff` clean; no lockfile
change (`theia/yarn.lock` untouched, `@theia/*` pinned at 1.74.1, `p-debounce`
caret is the pre-existing chrome-bar pin); no sibling verify drivers (only rows
appended to `scripts/verify-platform.sh`); no SQLite imports/writes anywhere in
the new tree (user-storage JSON only); no bare `[modes]` flag (grep clean, gate
green); no sessionstore references in new sources. The pre-existing
`diff-theia-core.sh` install-state drift was not re-examined per scope.

The dominant theme: the implementation assumes stock `switchPerspective`
**throws on unknown ids**. It does not — `doSwitchPerspective` returns silently
(`if (!descriptor) return;`, verified in
`theia/node_modules/@theia/core/lib/browser/shell/../perspective-service.js`).
`ModeService` is shielded by `resolveTarget`; `SetupsService.restoreSetup` is
not (CR-02). The second theme is build-graph ordering (CR-01).

## Critical Issues

### CR-01: Clean-tree build broken — chrome-bar builds before modes

**File:** `theia/package.json` (`build:extensions` script)
**Issue:** `build:extensions` runs `extensions/chrome-bar build` before
`extensions/modes build`, but `chrome-bar-widget.tsx:25-26` imports
`@powerbrowser/modes/lib/browser/modes-commands` and `.../mode-service`,
which resolve through the workspace symlink to `extensions/modes/lib` (built
output, gitignored). On any tree without a prior modes build (fresh clone,
`clean` + `build`), the chrome-bar step fails. Proven empirically:
with `modes/lib` hidden, `tsc -b theia/extensions/chrome-bar --force` exits 1
with `TS2307: Cannot find module '@powerbrowser/modes/lib/browser/modes-commands'`
and the same for `mode-service`. The phase's green builds masked this because
`modes` was always built by hand first (14-01/14-02 summaries). Incremental
`tsc -b` without `--force` also masks it (stale `.tsbuildinfo` skips the check).
**Fix:**
```diff
- "build:extensions": "... && yarn --cwd extensions/chrome-bar build && yarn --cwd extensions/modes build",
+ "build:extensions": "... && yarn --cwd extensions/modes build && yarn --cwd extensions/chrome-bar build",
```
Build `modes` before `chrome-bar` (dependency order). The application package
already builds after all extensions, so no other move is needed.

### CR-02: Setup restore with unknown mode id silently keeps the wrong mode

**File:** `theia/extensions/modes/src/browser/setups-service.ts:393-401`
**Issue:** `restoreSetup` calls `await this.perspectives.switchPerspective(row.modeId)`
inside try/catch, falling back to `'browsing'` on throw. Stock Theia 1.74.1
never throws for an unknown id — `doSwitchPerspective` does
`if (!descriptor) return;` (silent no-op). `parseSetupRow` accepts any string
`modeId`, so a hand-edited/corrupt `setups.json` (or a setup referencing a
deleted custom whose descriptor happens to be gone) restores geometry + tabs,
silently keeps whatever mode was active, then records `currentSetup` and the
`lastSession` pointer as if the restore succeeded — no fallback, no notice.
The mode half of the setup contract does not apply and nothing says so.
`ModeService.activateMode` is not exposed because `resolveTarget` maps unknown
ids to `'browsing'` first; `restoreSetup` bypasses it by calling stock directly.
**Fix:**
```ts
const knownCustom = this.modes.getCustomModes().some(row => row.id === row.modeId);
const known = SHIPPED_MODES.some(d => d.id === row.modeId) || knownCustom;
try {
    await this.perspectives.switchPerspective(known ? row.modeId : 'browsing');
} catch {
    try { await this.perspectives.switchPerspective('browsing'); } catch { /* geometry and tabs still stand */ }
}
if (!known) {
    void this.flash(SETUP_GONE_TABS_NOTICE); // or a contracted mode-fallback notice
}
```
(Validate before switching; post-switch, optionally confirm via
`getActivePerspectiveId()`. `SHIPPED_MODES` is already imported.)

## Warnings

### WR-01: Shipped-collision guard in modes parsing is vacuous

**File:** `theia/extensions/modes/src/browser/mode-service.ts:122-125`
**Issue:** `parseModeStore` drops rows with `SHIPPED_IDS.has(id)`, but `id` is
always `custom-<slug>` while `SHIPPED_IDS` is `{'coding','browsing','organising'}` —
the predicate can never be true. The save path blocks shipped-colliding names
via label comparison (`isDuplicateName`), but a hand-edited `modes.json` with
`{"name": "Coding", ...}` loads as a second "Coding" row (`custom-coding`),
producing duplicate toggle labels the save path claims are impossible
("shipped-colliding names are duplicates").
**Fix:**
```ts
if (SHIPPED_MODES.some(d => d.label.toLowerCase() === name.toLowerCase()) || seen.has(id)) {
    continue;
}
```

### WR-02: Save-after-delete lands in the wrong mode

**File:** `theia/extensions/modes/src/browser/mode-service.ts:242-274`, `377-388`
**Issue:** `handleStoreDeleted` sets `droppedCustomIds` to all registered ids and
never clears it on the save path: `saveCurrentAsMode` calls `registerCustom`,
which early-returns because the stale id is still in `registeredCustomIds`
(stock never unregisters, so the descriptor lingers — harmless), but
`resolveTarget` then rejects the id because it is still in `droppedCustomIds`.
Sequence: save "Foo" → delete `modes.json` → save "Foo" again → flash says
`Mode "Foo" saved.` but `activateMode(custom-foo)` resolves to `'browsing'`.
(The 150 ms debounced file-watcher reload repairs `droppedCustomIds` afterwards,
but the landing has already happened.)
**Fix:** in `saveCurrentAsMode` after a successful write (or in `registerCustom`
on the non-early-return path and on re-save), delete the id from
`droppedCustomIds`:
```ts
this.droppedCustomIds.delete(customModeIdFor(name));
```

### WR-03: Save/delete write failures flash the restore-failure copy

**File:** `theia/extensions/modes/src/browser/setups-service.ts:359`, `436`
**Issue:** Both `saveCurrentAsSetup` and `deleteSetup` flash
`SETUP_RESTORE_FAILURE` ("Power Browser **couldn't restore** this setup…")
when their *write* fails. A user whose save just failed is told a restore
failed — wrong action, confusing next step ("delete the setup and save a new
one" after a save failure). 14-UI-SPEC defines save/delete labels, empty-name
and duplicate errors, and the restore-failure error, but no save-failure string,
so there is currently no correct string to use.
**Fix:** Add a contracted save-failure string to 14-UI-SPEC
(e.g. "Power Browser couldn't save this setup. Your windows and tabs are
unchanged — try again."), use it in both catch paths, and pin it in
`EXPECTED_STRINGS` in `scripts/verify-setup-roundtrip.mjs`.

### WR-04: Dependent-open failure throws an internal-id-prefixed error at the user

**File:** `theia/extensions/modes/src/browser/setups-service.ts:452-461`
**Issue:** `openDependent` throws
`'powerbrowser.setups.open-dependent: this tab cannot open…'` when the widget is
not extractable. Thrown command rejections can surface through the stock error
notification, putting a dotted command id (exactly what the no-internals copy
rule bans from user-facing text) in front of the user. No copy gate scans
`setups-service.ts` for dotted/all-caps leaks (`verify-shell-error-copy.mjs`
covers only mode-service/modes-commands/placeholder/widget), so this class is
unchecked for all four setups strings. It is also the only failure path in the
phase that throws instead of flashing a contracted notice.
**Fix:** flash a contracted notice (added to UI-SPEC + roundtrip gate) instead
of throwing, and never prefix user-facing text with the command id:
```ts
void this.flash('Power Browser can't open this tab in a dependent window. Choose a tab with hosted content and try again.');
return;
```

### WR-05: Switch-invariant gate misses optional-chaining and helper-body mutations

**File:** `scripts/verify-mode-switch-tabs-invariant.mjs:137-146`
**Issue:** `switchCallsOf` matches `this.(shell|perspectives|statusBar)[\w.]*.(\w+)\(`.
The `[\w.]*` segment cannot cross `?.`, so `this.shell.activeWidget?.close()`
or `this.shell.leftPanelHandler?.collapse()` on a switch path evades derivation
entirely. Second, only the five anchored function bodies are scanned —
`visibilityFor` and `resolveTarget`, both called from `activateMode` and both
touching `this.shell`, are not. The gate's headline claim ("no switch path can
close, move, or detach a tab without going red") overstates what it proves.
**Fix:** allow optional chaining in the call regex (`\??\.` at each hop) and add
`visibilityFor`/`resolveTarget` (and any future `activateMode` callee) to
`SWITCH_FUNCTIONS`, or narrow the header claim to anchored bodies.

### WR-06: Roundtrip gate's JSON roundtrip half is tautological

**File:** `scripts/verify-setup-roundtrip.mjs:282-324`
**Issue:** The "derived roundtrip" builds a fixture from the derived field names
out of JSON-safe literals, serializes it, and requires it to survive — true by
construction for any field set, so it can never go red on a real regression.
Likewise `JSON.parse('{bogus setups')` throwing proves the language throws, not
that the service degrades corrupt input to the empty state (the only
tree-coupled check in that block is the `lastGoodSetups = []` grep). These
bullets lend the gate assurance it does not provide.
**Fix:** exercise the service's own total parser instead of `JSON.parse` —
extract `parseSetupStore`/`parseSetupRow`/`parseSetupWindow` to a shared
`.ts` module importable by the gate (or replicate the parser in the gate and
pin equivalence), with corrupt/duplicate/gone-tab fixtures that must degrade
exactly as contracted.

### WR-07: Dependent-content quick gate requires a prior build

**File:** `scripts/verify-dependent-window-content.mjs:48`, `136-155`
**Issue:** The static half asserts on
`theia/applications/browser/lib/frontend/secondary-window.html`, which is
gitignored build output (`git check-ignore` confirms). Proven: with only that
file renamed away, the gate FAILs ("missing … absent"). On a fresh clone
`verify-platform.sh --quick` — documented as "no build, no browser, no display"
— goes red until a full app build runs. A `--quick` gate must not depend on
build artifacts.
**Fix:** assert the secondary-frame shape against a build input instead
(the stock template/carrier in `@theia/core`, or the app's static config that
produces it), or move the asset half out of the `--quick` row into the full
suite with the live half.

### WR-08: Last-session pointer persisted fire-and-forget at shutdown

**File:** `theia/extensions/modes/src/browser/setups-service.ts:326-330`
**Issue:** `onStop(): void { void this.persistLastSession(this.currentSetup); }`
fires an async backend write during shutdown without awaiting it; if the frontend
tears down first, the pointer never lands and relaunch silently skips the
last-session restore. `saveCurrentAsSetup`/`restoreSetup` already persist the
pointer eagerly, so `onStop` covers only the never-saved/never-restored session —
the exact case most likely to be lost.
**Fix:** make `onStop` return the promise if the framework awaits contributions
(`async onStop(): Promise<void> { await this.persistLastSession(...); }` —
verify against `FrontendApplication` shutdown semantics), otherwise persist the
pointer eagerly on setup-list mutations too, or drop `onStop` and document that
only explicitly saved/restored setups become the relaunch pointer.

### WR-09: Mode-switch fallback path can reject into void callers

**File:** `theia/extensions/modes/src/browser/mode-service.ts:203-209`, `415-423`
**Issue:** In `activateMode`'s catch, `await this.perspectives.switchPerspective('browsing')`
is unguarded — if it rejects, the rejection propagates to callers that invoked
it as `void` (`handleCorruptStore` via `applyStoreText:393`, the command
`execute` in `modes-commands.ts:35`, the placeholder Back control is guarded).
Stock rarely rejects today, but the fallback exists precisely for the day stock
misbehaves, and it is the fallback that is unprotected.
**Fix:**
```ts
} catch {
    try {
        await this.perspectives.switchPerspective('browsing');
    } catch { /* last resort: shell keeps current layout, notices already flashed */ }
    closeOrganisingSlot();
    return;
}
```

### WR-10: Custom layout snapshots are written but never read

**File:** `theia/extensions/modes/src/browser/mode-service.ts:261`, `306-312`
**Issue:** Every `saveCurrentAsMode` persists `layout: this.snapshotLayout()`
(a full `getLayoutData()` blob) into `modes.json`, but no code path — activate,
restore, reapply, setups — ever reads `CustomModeSnapshot.layout`. Each saved
mode carries a dead, potentially large blob; a reader auditing the schema will
assume layout restore works when switching customs does panel-flags only. (The
14-02 summary calls it "available to the setups restore path" — i.e. future.)
**Fix:** stop snapshotting until Phase 15 consumes it (keep the field optional
in the parser for forward-compat), or wire layout apply into `activateMode`
for customs with a contracted fallback when inflate fails.

### WR-11: Relaunch restore races customs registration

**File:** `theia/extensions/modes/src/browser/setups-service.ts:751-768`,
`theia/extensions/modes/src/browser/mode-service.ts:354-363`
**Issue:** `ModeService.loadCustomModes` (fire-and-forget in `onStart`) and
`SetupsService.applyLastSession` (on `ready`) are uncoordinated. If the setups
applicator wins the race, `restoreSetup` switches to a custom mode id whose
descriptor is not yet registered — combined with CR-02's silent no-op, the
restore lands in an arbitrary mode with no fallback and no notice, and
`reapplyPersistedMode` may then yank the mode a second time (double switch,
startup flicker). Converges only when the modes load happens to finish first.
**Fix:** gate `applyLastSession` on customs readiness (e.g. await a promise the
`ModeService` exposes that resolves after the first load/apply cycle), or have
`restoreSetup` defer unknown-mode restores until customs settle, then re-resolve.

## Info

### IN-01: Registry throw skips the editor-URI fallback

**File:** `theia/extensions/modes/src/browser/setups-service.ts:524-543`
**Issue:** In `tabUriOf`, if `this.tabUris.uriOf(widget)` throws, the catch
returns `undefined` instead of falling through to the `getResourceUri`
fallback, so one throwing registry lookup loses a tab that the editor path
could have identified. (`uriOf` returns `undefined` rather than throwing for
unowned widgets per its contract, so this is strictly a robustness nit.)
**Fix:** remove the early `return undefined` in the first catch and let control
reach the navigable fallback.

### IN-02: Overlapping status-bar flashes clobber each other

**File:** `theia/extensions/modes/src/browser/mode-service.ts:314-324`,
`theia/extensions/modes/src/browser/setups-service.ts:696-706`
**Issue:** Every `flash` reuses one status-bar id with a 4 s removal timer.
`applyStoreText` flashes once per bad row (only the last survives), and any two
flashes within 4 s let the first timer erase the second message early.
**Fix:** serialize notices (queue) or reset the timer per flash (store the
timeout handle, `clearTimeout` on re-flash).

### IN-03: Dead `_reload` parameter and sync/async inconsistency

**File:** `theia/extensions/modes/src/browser/setups-service.ts:737`
**Issue:** `applyStoreText(raw, _reload)` takes a flag both call sites pass but
the body never reads; `handleStoreDeleted` is sync in setups-service but async
in mode-service for identical work. Harmless; remove the parameter or use it
(e.g. skip `currentSetup` clearing on boot-load vs reload).
**Fix:** drop `_reload`, or branch on it with a comment.

### IN-04: Unguarded fire-and-forget promises beside guarded ones

**File:** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx:246-253`, `theia/extensions/modes/src/browser/mode-service.ts:211-225`
**Issue:** `publishTabCount` does `void setElement(...)` with no catch while
sibling `flash` wraps the same call in try/catch; `activateMode` awaits
`collapsePanel`/`collapse()` inconsistently (`expandPanel` returns void by stock
contract — correct as-is; the two `SidePanelHandler.collapse()` promises float).
Stock rarely rejects, but one unhandled rejection during shutdown/teardown is
noise in exactly the logs used for diagnosis.
**Fix:** add `.catch(() => undefined)` (with a comment) to the three
fire-and-forget sites, matching `flash`'s discipline.

### IN-05: Setup names interpolate raw into QuickPick labels

**File:** `theia/extensions/modes/src/browser/setups-service.ts:685-694`
**Issue:** `pickSetup` builds labels as `` `$(check) ${row.name}` ``. A setup
name containing `$(icon)` renders a stock icon in the list (names are the
user's own data, so this is cosmetic spoofing at most, not privilege-relevant).
**Fix:** strip/escape `$(...)` sequences in `listRows` display names (keep the
stored name verbatim).

### IN-06: Content gate's `setups.json` check is satisfied by prose

**File:** `scripts/verify-dependent-window-content.mjs:132-134`,
`theia/extensions/modes/src/browser/dependent-windows.ts:15-16`
**Issue:** The gate requires `dependentsSrc.includes('setups.json')` as proof
that "dependent rects and hosted tab URIs are recorded for verbatim restore",
but the only occurrence in `dependent-windows.ts` is a doc comment — deleting
the snapshot code in `setups-service.ts` would not trip this assertion. The
check pins a comment, not the contract.
**Fix:** assert the snapshot fields from `setups-service.ts` (rect + tab-URI
capture in `snapshotWindows`) instead of, or in addition to, the string's
presence in the dependents file.

### IN-07: Opaque CSS self-import path

**File:** `theia/extensions/modes/src/browser/organising-placeholder-widget.ts:7`
**Issue:** `import '../../src/browser/modes.css'` from inside `src/browser/`
resolves back into its own directory and builds, but reads like an error; the
chrome-bar file uses the same idiom (pre-existing precedent), so this is
consistency, not breakage.
**Fix:** prefer `./modes.css` with a comment citing the bundler precedent, or
leave as-is — do not "fix" one without the other.

---

## Structural Findings (fallow)

None provided — no `<structural_findings>` block was passed with this review.
Substrate checks were performed inline instead: import graph is acyclic
(`chrome-bar → modes → tab-uris`; nothing depends back), `powerbrowser/` and
`upstream/` diffs are empty across the phase range, lockfiles are untouched,
and all four new gates plus their self-tests pass on the built tree.

---

_Reviewed: 2026-09-06T07:30:00Z_
_Reviewer: Muse Spark (gsd-code-reviewer)_
_Depth: deep_
