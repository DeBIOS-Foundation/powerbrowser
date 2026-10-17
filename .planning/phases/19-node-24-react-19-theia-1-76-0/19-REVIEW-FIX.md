---
phase: 19-node-24-react-19-theia-1-76-0
fixed_at: 2026-10-17T00:00:00Z
review_path: .planning/phases/19-node-24-react-19-theia-1-76-0/19-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 2
skipped: 5
status: partial
---

# Phase 19: Code Review Fix Report

**Fixed at:** 2026-10-17
**Source review:** .planning/phases/19-node-24-react-19-theia-1-76-0/19-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (1 Critical, 6 Warning; Info excluded by the default scope)
- Fixed: 2
- Skipped: 5. CR-01 needs Chris and its file belongs to the gap plan. WR-04 and WR-05 need Chris's re-lock. WR-01 and WR-06 need a decision from Chris.

## Fixed Issues

### WR-02: The first-boot-surface self-test has no plant for four of its assertions

**Files modified:** `scripts/verify-first-boot-surface.mjs`
**Commit:** ad45cb7
**Applied fix:** Added four plants to `selfTest()`:
- the fresh-mode seed missing from the main area (the regex requires a named id: `missing ["`)
- a wrong perspective
- schema-description drift while the DOM text stays correct
- enumDescriptions drift

`--self-test`: 17 plants red, clean control green.

### WR-03: single-copy-deps hard-codes the workspace groups instead of reading them from the tree

**Files modified:** `scripts/verify-single-copy-deps.mjs`
**Commit:** 33fddc7
**Applied fix:** The start directories now come from the `workspaces` field in `theia/package.json`. The check fails when that file cannot be read, or when a pattern is not `<dir>/*`. Two self-test cases were added: a duplicate `inversify` under a third group (`packages/*`), and an unexpandable pattern (`packages/**`). The header comment was updated to match. `--self-test`: 7 cases PASS. The live tree still passes, with one copy of each package.

## Skipped Issues

### CR-01: The packaged Node runtime is still Node 22, below the declared `engines.node >=24`

**File:** `powerbrowser/packaging/node-runtime.json:3-5`
**Reason:** Not auto-fixable. Chris picks the 24.x release and verifies its SHA-256. The gap plan 19-08 (`files_modified: [powerbrowser/packaging/node-runtime.json]`) owns this file, and the fixer is barred from editing it.
**Original issue:** `package-linux.sh` stages v22.23.2, but the workspace declares `engines.node >=24`.

### WR-01: The telemetry Settings text says PowerBrowser alone is affected, but the same key now gates upstream and extension telemetry

**File:** `theia/extensions/telemetry/src/browser/telemetry-preferences.ts:37-44`
**Reason:** Needs Chris. The description string is fixed verbatim by 19-UI-SPEC.md N3 (a "locked decision") and by the Copywriting Contract row. Rewording it changes a locked design contract. The identical `crash` and `error` texts are also accurate for PowerBrowser's own sender: `levelAllowsEvent` admits error events at every level except `off`. The two values differ only for extension hosts. So the rewrite is a copy decision, not a defect fix.
**Original issue:** The text understates the scope: `telemetry.telemetryLevel` also drives `vscode.env.isTelemetryEnabled` for installed extensions.

### WR-04: NG-086 self-test has no plant for six of its FAIL branches

**File:** `scripts/verify-ng-086-theia-react-node.mjs`
**Reason:** Needs Chris's re-lock. The file is hash-locked in the ledger `check_locks`, and the fixer is barred from editing it.
**Original issue:** Six FAIL branches have no planted self-test case: a missing package, zero or several `@theia/core` copies, zero or several `nodejs_NN` lines, an unset `theia_release`, an absent semver, and the member start dirs.

### WR-05: NG-086's Node check reads only flake.nix, misses the packaged runtime, and hard-codes the workspace groups

**File:** `scripts/verify-ng-086-theia-react-node.mjs:117, 167-184`
**Reason:** Needs Chris's re-lock. The file is hash-locked in the ledger `check_locks`. The fix also reads `node-runtime.json`, which would turn the row red until CR-01 lands.
**Original issue:** The Node major is derived only from `flake.nix`. `semver.intersects` is used where `satisfies` is needed. The workspace groups are hard-coded.

### WR-06: Raising the Node requirement adds no version gate, so an old Node gets the generic start-failure message

**File:** `powerbrowser/shell/TheiaService.sys.mjs:488-492`
**Reason:** Needs a decision from Chris, and live verification. The fix would:
- add a new user-facing error string (19-UI-SPEC says the phase adds none, and any new one needs a copy review)
- add a new subprocess probe through PowerBrowserAPI, with an INTERNAL-APIS.md catalogue entry
- add a spawn to every launch's boot path

This run allowed static checks only, so the chrome-side behaviour could not be verified. After CR-01 lands, the staged binary will be Node 24, and the gap is then limited to a user-set pref or a `node` found on PATH.
**Original issue:** The resolver accepts any `node` without checking its version, so an old Node fails with `couldNotStart` instead of the "Install Node.js 24" instruction.

## Verification

All gates ran in the main checkout (`workflow.use_worktrees: false`; no worktree was created).
- `python3 scripts/phase-gate.py --root .` was silent (exit 0) before the first edit, after each fix, and at the end.
- `scripts/verify-platform.sh --quick`: 218 PASS. The only 4 FAILs are the gui08 rows in docs/non-gui/quick-baseline.txt (`gui08-canvas-geometry`, its self-test, `gui08-panorama-copy`, its self-test).

---

_Fixed: 2026-10-17_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
