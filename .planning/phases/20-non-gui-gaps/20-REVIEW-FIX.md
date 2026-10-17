---
phase: 20-non-gui-gaps
fixed_at: 2026-10-17T23:41:01Z
review_path: .planning/phases/20-non-gui-gaps/20-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 5
skipped: 3
status: partial
---

# Phase 20: Code Review Fix Report

**Fixed at:** 2026-10-17T23:41:01Z
**Source review:** .planning/phases/20-non-gui-gaps/20-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (0 critical, 8 warning; Info excluded by scope)
- Fixed: 5
- Skipped: 3 (all hash-locked: needs Chris re-lock)

## Fixed Issues

### WR-01: `--workflow` with no value loops forever

**Files modified:** `scripts/verify-theia-fresh-clone-build.sh`
**Commit:** 14d0fc3
**Applied fix:** `--workflow` now requires a second argument. A trailing `--workflow` prints `FAIL -- --workflow needs a file` and exits 2. Checked: `bash -n` passes, and `--workflow` as the last argument exits 2 at once.

### WR-02: `--out` accepts an empty or in-repo path and reports a write error as manifest advice

**Files modified:** `scripts/generate.mjs`
**Commit:** 9d3f3d5
**Applied fix:** `rejectUnknownArguments` refuses `--out ''`. It also refuses any `--out` that resolves to the project root or inside it, including `generated/`. The review allowed `generated/`; this fix refuses it too, because no caller uses it and `--check` would see leftovers. The write loop in `writeTargets` now catches filesystem errors and prints its own message, which says files written before the failure are left in place. Checked: `--out ''`, `--out .` and `--out upstream/x` exit 1 with the new text. An out-of-tree `--out` writes 53 files. A read-only target prints the filesystem message. `generate --check` passes.

### WR-04: `stripComments` treats `/*` inside a line comment or string as a block start

**Files modified:** `scripts/verify-group-channel.mjs`
**Commit:** 8194cf0
**Applied fix:** The regex stripper is replaced by a scanner that skips text inside quotes and handles backslash escapes. Added plant 13: `'image/*'` placed before a window dispatch must go red as `not document.dispatchEvent`. Checked: the clean-tree stats are the same as the previous version (7 sites, 5 files), and the self-test passes. The other copies of the same regex in `verify-web-tab-bridge.mjs` and about 12 other scripts were not changed.

### WR-03: group-channel skips a file that imports the event-name constant (false green)

**Files modified:** `scripts/verify-group-channel.mjs`
**Commit:** 463d57b
**Applied fix:** The check builds a map of every `export const X = '<value>'` in the frontend. For each file, an `import { X [as Y] }` whose X is in that map now counts in `bindings(name)` and in `namesRequest`. The self-test supports `add` plants, which are new in-memory files. Added plant 14 (an imported request name dispatched on `window`) and plant 15 (an imported, aliased response name listened on `document`). Checked: the clean tree is still green with the same stats, and all 15 plants go red.
**Status:** fixed: requires human verification. Imports are matched by identifier, not by resolved module path; a code comment marks this as a shortcut.

### WR-05: planning-paths does not see every planning-tree literal it claims to check

**Files modified:** `scripts/verify-planning-paths.mjs`
**Commit:** 177e222
**Applied fix:** `LITERAL` now also matches `v*` version globs and a leading `*` phase segment. The tree has none of either today, so no new red. Added self-test cases "version glob matching 2" and "leading phase glob matching 0", plus a clean `v*` control. The header and the PASS line now say that coverage is contiguous literals only, and that paths built from separate `join()` arguments are not seen. Checked: the row passes (12 references), and the self-test passes 9 cases.
**Status:** fixed: requires human verification. The review gave two options and this fix narrows the claim. The two split-join `resolveRecord` archive fallbacks are still there: `scripts/verify-strip-spike-verdict.mjs:76-95` and `scripts/verify-dependent-window-content.mjs:60-81`. Making this row flag them would turn both red, and removing them changes two other rows, so that is left to a decision.

## Skipped Issues

### WR-06: NG-087/NG-088 reader-SQL lookup runs past its method

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:41-47`, `scripts/verify-ng-088-group-order-across-restart.mjs:45-51`
**Reason:** needs Chris re-lock. Both files are hash-locked in `check_locks`.
**Original issue:** The unbounded lazy regex can read the next method's `prepare(...)` and fail with a misleading exit 1 instead of exit 2.

### WR-07: NG-087/NG-088 `--at` leaks its stage dir on every red run

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:212-224`, `scripts/verify-ng-088-group-order-across-restart.mjs:197-209`
**Reason:** needs Chris re-lock. Both files are hash-locked in `check_locks`.
**Original issue:** `process.exit(1)` inside the `try` skips the `finally`, so each failing `--at` run leaves an `ng087-at-*` or `ng088-at-*` temp dir.

### WR-08: NG-087/NG-088 ignore unknown arguments

**File:** `scripts/verify-ng-087-loose-position-across-restart.mjs:190-211`, `scripts/verify-ng-088-group-order-across-restart.mjs:175-196`
**Reason:** needs Chris re-lock. Both files are hash-locked in `check_locks`.
**Original issue:** A mistyped flag falls through to the tree check and PASSes.

## Verification

- **Where the gates ran:** in the main checkout `/home/chris/coding/Power-Browser` (`workflow.use_worktrees` is false, so no worktree was used).
- `scripts/verify-platform.sh --quick`: exit 1. 128 rows PASS, 4 rows FAIL: `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy`, `gui08-panorama-copy-self-test`. This is the same set as `docs/non-gui/quick-baseline.txt`, so Phase 21 wave 1 has not yet changed the gui08 rows.
- `node scripts/scan-brand-residue.mjs`: PASS (356 files).
- `python3 scripts/phase-gate.py --root .`: no output, exit 0.

---

_Fixed: 2026-10-17T23:41:01Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
