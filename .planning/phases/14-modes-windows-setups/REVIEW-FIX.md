---
phase: 14-modes-windows-setups
fixed_at: 2026-09-06T06:57:13Z
review_path: .planning/phases/14-modes-windows-setups/REVIEW.md
iteration: 1
findings_in_scope: 20
fixed: 11
skipped: 9
status: partial
---

# Phase 14: Code Review Fix Report

**Fixed at:** 2026-09-06T06:57:13Z
**Source review:** .planning/phases/14-modes-windows-setups/REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 20
- Fixed: 11
- Skipped: 9

**Verification location:** main checkout (`.planning/config.json`
`workflow.use_worktrees` is `false`, so no isolated worktree was created;
all gates ran against the tree as committed).

## Fixed Issues

### CR-01: Clean-tree build broken — chrome-bar builds before modes

**Files modified:** `theia/package.json`
**Commit:** d6afa0f
**Applied fix:** `build:extensions` now builds `extensions/modes` before
`extensions/chrome-bar` (dependency order; chrome-bar imports
`@powerbrowser/modes/lib/...` through the workspace symlink into
`modes/lib` build output). Reproduced before: with `modes/lib` hidden,
`tsc -b theia/extensions/chrome-bar --force` fails with `TS2307: Cannot
find module '@powerbrowser/modes/lib/browser/modes-commands'` and the same
for `mode-service`. Passing after: sequential `tsc -b modes` (with
`--force` — stale `.tsbuildinfo` otherwise masks the rebuild, as the
review notes) followed by `tsc -b chrome-bar --force` is clean, and the
reordered script now encodes that order for clean trees. Package JSON
parses; full `verify-platform.sh --quick` PASS.

### CR-02: Setup restore with unknown mode id silently keeps the wrong mode

**Files modified:** `theia/extensions/modes/src/browser/setups-service.ts`, `scripts/verify-setup-roundtrip.mjs`, `.planning/phases/14-modes-windows-setups/14-UI-SPEC.md`
**Commit:** 56afd15
**Status:** fixed — requires human verification (restore-path logic; tiers 1–2 prove structure, not the fallback semantics)
**Applied fix:** `restoreSetup` pre-validates `row.modeId` against shipped
descriptor ids plus live custom ids (`getCustomModes()`, avoiding the
review snippet's shadowed `row => row.id === row.modeId` naming) and
switches to `'browsing'` when unknown, with a new contracted
`SETUP_MODE_FALLBACK_NOTICE` flash ("Power Browser restored this setup,
but its saved mode is no longer available. Browsing is shown instead.").
The stored id is never interpolated (custom ids are internal
identifiers). The string is pinned in the roundtrip gate's
`EXPECTED_STRINGS` and added to the UI-SPEC copy table in the same commit.
The existing double-try fallback and gone-tabs notice are unchanged; the
post-switch `getActivePerspectiveId()` confirmation (review's optional
half) was skipped as redundant with pre-validation. Modes tsc clean;
roundtrip gate + self-test + dependent-content gate + full `--quick` PASS.

### WR-01: Shipped-collision guard in modes parsing is vacuous

**Files modified:** `theia/extensions/modes/src/browser/mode-service.ts`
**Commit:** 3c31783
**Status:** fixed — requires human verification (parse-filter logic change: hand-edited rows naming a shipped mode now drop)
**Applied fix:** `parseModeStore` compares the row *name* against shipped
*labels* (case-insensitive, matching the save path's `isDuplicateName`
discipline) instead of comparing the `custom-<slug>` id against
`SHIPPED_IDS`. Slug-dedup via `seen` is unchanged. Modes tsc clean;
switch-invariant + toggle gates + full `--quick` PASS.

### WR-02: Save-after-delete lands in the wrong mode

**Files modified:** `theia/extensions/modes/src/browser/mode-service.ts`
**Commit:** 64f0a51
**Status:** fixed — requires human verification (sequence-dependent: save → delete store → re-save)
**Applied fix:** `saveCurrentAsMode` deletes the id from `droppedCustomIds`
after a successful write, before `registerCustom`, so the just-saved id
resolves instead of falling back to Browsing. Modes tsc clean;
switch-invariant gate + full `--quick` PASS.

### WR-05: Switch-invariant gate misses optional-chaining and helper-body mutations

**Files modified:** `scripts/verify-mode-switch-tabs-invariant.mjs`
**Commit:** 0a463c7
**Applied fix:** `switchCallsOf` regex now accepts `?.` at every hop
(`(?:\??\.[\w$]+)*\??\.`), proven equivalent on current bodies (identical
derivation to the old regex) and now deriving `?.` chains the old regex
missed entirely (3/3 synthetic `?.` bodies). Per the review's stated
alternative, helper-body coverage (`visibilityFor`/`resolveTarget`) was
resolved by narrowing the header claim to anchored bodies (adding them
would derive the read-only `isExpanded` and force an allowlist widening
for a non-mutation). Gate + self-test + full `--quick` PASS.

### WR-09: Mode-switch fallback path can reject into void callers

**Files modified:** `theia/extensions/modes/src/browser/mode-service.ts`
**Commit:** a8542b6
**Applied fix:** The `activateMode` catch now nests the Browsing fallback
switch in its own try/catch (last resort: shell keeps current layout, no
rejection reaches the void callers). No new derived call names — the
switch-invariant gate still passes unchanged. Modes tsc clean; gate +
`--quick` PASS (one `--quick` run in this window went red on an unrelated
row; immediate re-run green — see flake note below).

### IN-01: Registry throw skips the editor-URI fallback

**Files modified:** `theia/extensions/modes/src/browser/setups-service.ts`
**Commit:** 8c4d258
**Applied fix:** Removed the early `return undefined` in `tabUriOf`'s first
catch; a throwing registry lookup now falls through to the
`getResourceUri` fallback. Modes tsc clean; roundtrip gate + full
`--quick` PASS.

### IN-03: Dead `_reload` parameter and sync/async inconsistency

**Files modified:** `theia/extensions/modes/src/browser/setups-service.ts`
**Commit:** c159612
**Applied fix:** Dropped the unread `_reload` parameter from
`applyStoreText` and both call sites (`loadSetups`, `reloadSetups`). The
sync/async shape difference vs mode-service was left alone (both shapes
are correct for their callers). Modes tsc clean; roundtrip gate + full
`--quick` PASS.

### IN-04: Unguarded fire-and-forget promises beside guarded ones

**Files modified:** `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx`, `theia/extensions/modes/src/browser/mode-service.ts`
**Commit:** 25fca69
**Applied fix:** Attached `.catch(() => undefined)` (voided) to the three
floating promises: `publishTabCount`'s `setElement` and both
`SidePanelHandler.collapse()` calls in `activateMode` (`collapse():
Promise<void>` verified in stock d.ts; `expand()` is sync void and
correctly untouched, as is the already-awaited `collapsePanel`). No new
derived gate names. Both extensions tsc-clean; switch-invariant gate +
full `--quick` PASS.

### IN-05: Setup names interpolate raw into QuickPick labels

**Files modified:** `theia/extensions/modes/src/browser/setups-service.ts`
**Commit:** 88f2b0e
**Applied fix:** `pickSetup` renders `$(` as `(` for display only; the
stored name and row id stay verbatim so selection still resolves. Modes
tsc clean; roundtrip gate + `--quick` PASS (same unrelated-row flake
window as WR-09; isolated re-run green — see flake note).

### IN-06: Content gate's `setups.json` check is satisfied by prose

**Files modified:** `scripts/verify-dependent-window-content.mjs`
**Commit:** f4edddc
**Applied fix:** Added (not replaced, per the review's "in addition to")
snapshot-field pins: the gate now requires `snapshotWindows` and
`activeTab` in `setups-service.ts`, so deleting the snapshot code trips
the assertion (proven with a synthetic strip: both pins gone → red).
Baseline green; gate + self-test + full `--quick` PASS.

## Skipped Issues

### WR-03: Save/delete write failures flash the restore-failure copy

**File:** `theia/extensions/modes/src/browser/setups-service.ts:359`, `436`
**Reason:** Fix needs a brand-new contracted user-facing string (UI-SPEC
amendment + roundtrip-gate pin + checker sign-off); no correct existing
string exists to substitute, and inventing copy in a fixer bypasses the
copy contract. Deferred to human copy sign-off.
**Original issue:** Save/delete write failures flash
`SETUP_RESTORE_FAILURE` ("couldn't restore…") — wrong action, confusing
next step.

### WR-04: Dependent-open failure throws an internal-id-prefixed error at the user

**File:** `theia/extensions/modes/src/browser/setups-service.ts:452-461`
**Reason:** Fix changes command rejection semantics (throw → flash-resolve)
and needs a new contracted notice plus UI-SPEC/gate amendment; the throw
travels the command path rather than a rendered surface, so the
no-internals exposure is potential, not observed. Deferred to human.
**Original issue:** `openDependent` throws a `powerbrowser.setups…`-prefixed
message that can surface through stock error notification.

### WR-06: Roundtrip gate's JSON roundtrip half is tautological

**File:** `scripts/verify-setup-roundtrip.mjs:282-324`
**Reason:** Real fix requires extracting `parseSetupStore`/`parseSetupRow`
into a shared module importable by the gate (or a pinned replica) — a
refactor, not a one-line zero-risk change. The tree-coupled checks (the
`lastGoodSetups = []` reset grep, corrupt-degrades-to-empty path, empty
copy) stay as the load-bearing half.
**Original issue:** Derived-fixture roundtrip and `JSON.parse` throw prove
construction/language properties, not service behavior.

### WR-07: Dependent-content quick gate requires a prior build

**File:** `scripts/verify-dependent-window-content.mjs:48`, `136-155`
**Reason:** Restructuring the asset half (assert a build input, or move it
to the full suite) is gate surgery beyond one-line scope. Accepted with
documented prerequisite: on a fresh clone, run the Theia build
(`yarn build` in `theia/`, via `nix develop .#theia`) before trusting
`verify-platform.sh --quick` — the `gui09-dependent-window-content` row
reads gitignored `lib/` output and goes red until the app is built.
**Original issue:** `--quick` (documented "no build") fails on a fresh
clone until a full app build lands `secondary-window.html`.

### WR-08: Last-session pointer persisted fire-and-forget at shutdown

**File:** `theia/extensions/modes/src/browser/setups-service.ts:326-330`
**Reason:** Verified against stock source that the fix cannot work:
`FrontendApplication.stopContributions()` calls `contribution.onStop(this)`
synchronously in a loop without awaiting
(`theia/node_modules/@theia/core/lib/browser/frontend-application.js`),
and the contribution interface declares `onStop?(app): void` — making
`onStop` async would not land the write either. Eager persist already
covers save/restore/delete paths; the never-saved-session case stays
best-effort. Persist-on-every-mutation or drop-`onStop` need design
sign-off.
**Original issue:** `onStop` fires an async backend write during shutdown
that may never land, losing the relaunch pointer for unsaved sessions.

### WR-10: Custom layout snapshots are written but never read

**File:** `theia/extensions/modes/src/browser/mode-service.ts:261`, `306-312`
**Reason:** Removing the snapshot changes the persisted schema just before
Phase 15 (organising canvas) is slated to consume it — the 14-02 summary
records the blob as future-use, the parser keeps the field optional for
forward-compat, and per-mode blob cost is negligible at user scale. Keep
writing; wire-up belongs to Phase 15.
**Original issue:** Every saved mode carries a dead, potentially large
`layout` blob no code path reads.

### WR-11: Relaunch restore races customs registration

**File:** `theia/extensions/modes/src/browser/setups-service.ts:751-768`, `theia/extensions/modes/src/browser/mode-service.ts:354-363`
**Reason:** Real fix needs a cross-service readiness primitive (gate
`applyLastSession` on customs load) — coordination design, not a one-line
change. CR-02 in this report bounds the worst case: a not-yet-registered
custom id now falls back to Browsing with the contracted notice instead
of landing in a silent wrong mode. Remaining startup double-switch
flicker accepted as cosmetic.
**Original issue:** Uncoordinated `loadCustomModes` vs `applyLastSession`
can restore a custom mode before its descriptor registers (silent wrong
mode + possible double switch).

### IN-02: Overlapping status-bar flashes clobber each other

**File:** `theia/extensions/modes/src/browser/mode-service.ts:314-324`, `theia/extensions/modes/src/browser/setups-service.ts:696-706`
**Reason:** Fix needs notice-queue or per-flash timer discipline across two
services — beyond one-line scope for a cosmetic timing overlap;
last-write-wins is acceptable.
**Original issue:** One shared status-bar id plus a fixed 4 s removal timer
lets flashes erase each other early.

### IN-07: Opaque CSS self-import path

**File:** `theia/extensions/modes/src/browser/organising-placeholder-widget.ts:7`
**Reason:** Left as-is per the review itself: the `../../src/browser/`
idiom is shared bundler precedent with chrome-bar — do not fix one
without the other; consistency, not breakage.
**Original issue:** Self-directory CSS import reads like an error but
builds.

---

**Flake note (environmental, not fix-related):** three full `--quick` runs
in this window went red on rows outside the Phase 14 surface
(`verify-downstream-fixtures-self-test`, `verify-downstream-fixture`,
`branding-preflight`, `verify-upstream-pins`, `verify-theia-branding`,
`verify-theia-endpoints`) while the box carried load ~3.8 with concurrent
Phase-16 commits landing on the same branch. Every one of those rows
passes via `--only` in isolation, and the full `--quick` suite passes on
retry (final state: PASS). The working tree holds no uncommitted source
changes and no harness pollution (`git status` clean apart from
orchestrator `.planning/state.json` churn).

_Fixed: 2026-09-06T06:57:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
