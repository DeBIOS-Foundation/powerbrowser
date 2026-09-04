---
phase: 01-platform-extraction-and-rename
plan: 11
subsystem: shell-supervisor
tags: [error-state, retry, verification, gap-closure, MIG-04, GUI-01]
status: complete

requires:
  - "01-10: the supervisor's single terminal handler (`reportUnexpectedFailure`) and its four attachment points"
  - "01-09: `scripts/verify-start-path-recovery.mjs` and its derive-both-sides-and-compare doctrine"
  - "05-02: the SHELL-03 error layer, `_showError`/`_hideError`, and the `_errorShown` repaint guard"
provides:
  - "A failing Retry repaints the error layer -- 01-VERIFICATION.md's failed truth 2c is closed"
  - "One visibility owner for the error layer, enforced by set equality between two tree derivations"
  - "`scripts/verify-shell-error-contract.mjs` -- a Node analyzer that drives the SHIPPED supervisor and SHIPPED chrome bootstrap in-process"
  - "Two new `--quick` registry rows: `shell-error-contract`, `shell-error-contract-self-test`"
affects:
  - "powerbrowser/shell/TheiaService.sys.mjs (`retry()`)"
  - "powerbrowser/shell/powerbrowser.js (`powerbrowserRetry`)"
  - "scripts/verify-start-path-recovery.mjs (static half, two new assertions)"
  - "scripts/verify-platform.sh (--quick registry, two rows)"

tech-stack:
  added: []
  patterns:
    - "Evaluate the shipped source rather than re-implement it: `await import()` with `globalThis.ChromeUtils` faked for the ES module, `node:vm` `createContext`/`runInContext` with the sandbox as its own `window` for the classic chrome script"
    - "Proxy-with-throwing-trap fake boundary: an unstubbed `PowerBrowserAPI.<name>` throws naming the method, so fake/real drift goes red instead of green"
    - "Sleep-budget parking: a fake `sleep` that resolves immediately would let the supervisor's recovery probe spin forever in the microtask queue and starve the event loop, so past a fixed budget it returns a promise that never settles"
    - "Structural pairing to locate a show/hide pair without naming it: the two methods that call an `ownerDocument.defaultView.<global>(` and guard on the SAME instance field, one setting it true and one false"

key-files:
  created:
    - scripts/verify-shell-error-contract.mjs
  modified:
    - powerbrowser/shell/TheiaService.sys.mjs
    - powerbrowser/shell/powerbrowser.js
    - scripts/verify-start-path-recovery.mjs
    - scripts/verify-platform.sh
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md

decisions:
  - "The error-state clear lives in `retry()`, not in `_restart()`: `_restart()` is also the recovery probe's own re-entry point and `_hideError()` calls `_stopRecoveryProbe()`, so clearing from inside `_restart()` would tear down the probe loop that is calling it"
  - "`deriveErrorLayerBinding` tries the SHOW global before the HIDE global, deviating from the plan's `(shellSrc, hideFnName)` signature -- deriving only from the hide global would make the plan's own removal-side fault row a derivation dead-end instead of a set-equality red"
  - "The analyzer claims no runtime counterpart in the full set; its perceptual half stays on the WINDOWS.md human record because chrome-context Marionette is platform-blocked on Linux (ledger item 7)"
  - "WINDOWS.md ledger item 15 is NOT closed or downgraded by this plan -- this is a Node-level contract check over shipped source, not a human clicking Retry in a real window"

metrics:
  duration: ~35min
  completed: 2026-08-31

actuals:
  tokens: 41000
  tasks: 2
  commits: 2
---

# Phase 01 Plan 11: Failing-Retry Error-Layer Repaint Summary

A failing Retry now repaints the error layer, because the error layer has exactly one visibility
owner: `TheiaService._hideError()`, reached through `retry()`, with `powerbrowserRetry` no longer
writing `style.display` behind the supervisor's back.

## What shipped

Two source lines of behaviour change and two checks that make the change hold.

**The defect.** `powerbrowserRetry` hid the error layer with a direct `errorElement.style.display =
"none"` and then called `TheiaService.retry()`, which was `await this._restart()` and never cleared
`_errorShown`. So on the FIRST Retry that did not succeed, the DOM was already blank and
`_showError`'s `if (this._errorShown) { return; }` guard swallowed every subsequent repaint for the
life of the session: no message, no Retry, no Details, forever. `_hideError()` never running also
meant the stale recovery probe from the original failure stayed live with zero on-screen feedback.

**The fix.** `retry()` calls `this._hideError()` before `await this._restart()`.
`powerbrowserRetry`'s only statement is now the guarded `TheiaService.retry()` call.

**Task 1 — `scripts/verify-shell-error-contract.mjs`** (new, registered). It does not re-implement
either file and does not text-transform either file. The supervisor is `await import()`ed with
`globalThis.ChromeUtils` faked (so its own top-level `ChromeUtils.importESModule` resolves against a
fake `PowerBrowserAPI` with no edit), and the chrome bootstrap is run through `node:vm` against a
sandbox that is also its own `window`. Firing the bootstrap's captured `DOMContentLoaded` handler IS
the drive — the handler calls `TheiaService.start()` itself, so the entry point stays under test
rather than under simulation. Scenario `two-consecutive-failing-retries-repaint` requires the
error-family sentinel stream to read, in order: `POWERBROWSER_SHELL_ERROR`,
`POWERBROWSER_SHELL_ERROR_CLEARED`, `POWERBROWSER_SHELL_ERROR`, `POWERBROWSER_SHELL_ERROR_CLEARED`,
`POWERBROWSER_SHELL_ERROR`. Five presence assertions, never an absence assertion, and both prefixes
are proven to be emitted by `dump(` call sites in the file under test before any scenario runs.

**Task 2 — two derived assertions on `scripts/verify-start-path-recovery.mjs`'s static half**, riding
the already-registered `start-path-recovery` row rather than minting a second one. Derivation C is
set equality between the supervisor's DECLARED error-layer API (the show/hide pair, located
structurally by their shared guard field — `_swap()` has the show shape and no partner, which is what
disambiguates it) and the set of bootstrap functions that actually write that element's
`style.display`. Derivation D is `retry()`'s shape: it must clear before it restarts, and must contain
no `_spawnAndGate(` call of its own so `_restart()` stays the single spawn entry point.

## Verification

### The RED output from Task 1 Step 2, verbatim

Captured on the UNCHANGED sources, with the analyzer written and neither source edit applied:

```
verify-shell-error-contract: FAIL -- scenario two-consecutive-failing-retries-repaint: no POWERBROWSER_SHELL_ERROR_CLEARED was emitted after the first failing Retry; no second POWERBROWSER_SHELL_ERROR was emitted -- the error layer never came back. Expected ["POWERBROWSER_SHELL_ERROR","POWERBROWSER_SHELL_ERROR_CLEARED","POWERBROWSER_SHELL_ERROR","POWERBROWSER_SHELL_ERROR_CLEARED","POWERBROWSER_SHELL_ERROR"] but observed ["POWERBROWSER_SHELL_ERROR"]. The consequence is the whole point of this check: the user is looking at a screen the click handler blanked, with no message, no Retry and no Details, for the rest of the session. (Stale recovery probe still active after the first Retry: true.)
```

Exit code 1.

### The stale recovery probe on that RED run

**Still active: `true`.** The analyzer reads `TheiaService._recoveryProbeActive` immediately after the
first Retry and reports it in the failure text. This is the second half of the defect and it was
confirmed rather than assumed: because `_stopRecoveryProbe()` is only reachable through
`_hideError()`, the probe from the ORIGINAL failure was still driving restarts invisibly after the
user had clicked Retry. On the post-fix tree the same field reads `false` at that point.

### GREEN, after the two-line fix

```
verify-shell-error-contract: PASS -- scenario two-consecutive-failing-retries-repaint: a failing Retry repaints the error layer, twice over, driven against the shipped supervisor (…/TheiaService.sys.mjs) and the shipped chrome bootstrap (…/powerbrowser.js)
```

`--self-test`: 1 clean control + 3 planted faults, all four rows behaved as required. The third plant
(`_hideError()` no longer clearing the repaint guard`) goes red naming *the missing second ERROR
specifically* rather than the missing CLEARED, which is what proves the check discriminates the
repaint guard from the DOM write.

### The verbatim red from Task 2's hand-proof against the REAL tree

The direct `style.display` write was temporarily re-inserted into `powerbrowserRetry` in the working
tree (not a temp copy), the checker run, and the change then reverted with `git checkout --`:

```
verify-start-path-recovery: FAIL -- powerbrowserRetry writes the error layer's visibility from outside the supervisor's own show/hide pair (declared API: powerbrowserShowError, powerbrowserHideError; observed writers: powerbrowserShowError, powerbrowserHideError, powerbrowserRetry) -- a second owner makes the DOM and the supervisor's `_errorShown` flag disagree, which is what left a failed Retry on a blank screen with no message, no Retry and no Details for the rest of the session
```

Exit code 1. Post-revert the same command exits 0. Note that every identifier in that message is
*derived*: `grep -v` over comment lines finds zero occurrences of `powerbrowserShowError`,
`powerbrowserHideError` or `powerbrowser-error` in the checker.

### `--quick` PASS count, before and after

| | Rows | Result |
|---|---|---|
| Before this plan (baseline, pre-edit) | 22 | `verify-platform: PASS -- all checks passed` |
| After this plan (new files staged) | 24 | `verify-platform: PASS -- all checks passed` |

The two added rows are `shell-error-contract` and `shell-error-contract-self-test`.
`start-path-recovery`'s own self-test grew from 13 rows to **16** (14 planted faults + 2 clean
controls) without adding a registry row.

`git add -A` was run BEFORE each `--quick` invocation. This is load-bearing, not hygiene:
`scan-brand-residue` iterates `git ls-files`, so an unstaged new analyzer is invisible to it and its
green would have been false.

### Other gates

- `scripts/verify-platform.sh --only shell-error-contract` → exit 0; `--only
  shell-error-contract-self-test` → exit 0.
- `grep -c 'shell-error-contract' scripts/verify-platform.sh` → 2 (two rows, no third driver; the
  provenance comment deliberately avoids the token so the count stays exact).
- `grep -c 'start-path-recovery' scripts/verify-platform.sh` → 5, unchanged.
- Code-line count of `errorElement.style.display` in `powerbrowser.js` → 2, not 3. Inside
  `powerbrowserRetry`'s body → 0.
- `check-internals-boundary` → PASS (registered row). No new `PowerBrowserAPI` method, no new
  Firefox-internal touchpoint, so `INTERNAL-APIS.md` gained no row.
- `git -C upstream diff` empty; `git status --porcelain upstream theia` empty.
- No generator, no template, no derive-at-build-time helper: no branding value was touched at all.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] The fake `PowerBrowserAPI` needed three methods the plan's stub list omitted**
- **Found during:** Task 1, first run of the analyzer
- **Issue:** The plan enumerated the stub table from the SUPERVISOR's reach. The chrome bootstrap
  reaches the boundary too, and its `DOMContentLoaded` handler calls `createPermanentKey()`,
  `getAppIdentity()` and `notifyStartupFinished()`. The Proxy's throwing trap surfaced each by name,
  which is exactly what that trap is for.
- **Fix:** Added the three to the stub table, grouped under a comment saying they are reached by the
  bootstrap rather than the supervisor.
- **Files modified:** `scripts/verify-shell-error-contract.mjs`
- **Commit:** fe5ea88

**2. [Rule 1 - Design bug in the plan] `deriveErrorLayerBinding` derives from the SHOW global first, not only the HIDE global**
- **Found during:** Task 2, while writing the removal-side self-test row
- **Issue:** The plan specified `deriveErrorLayerBinding(shellSrc, hideFnName)` — derive the element
  binding out of the hide function's body — and then specified a self-test row that REMOVES the
  `.style.display` write from that same hide function, expecting "the removal side of the same set
  equality to go red". Those two are incompatible: with the write removed, the derivation itself
  yields nothing and the run dies at a derivation-failure message before the set equality is ever
  evaluated. The rule would have been one-directional in practice while claiming not to be.
- **Fix:** The derivation tries the show global and then the hide global, returning the first that
  writes an element's `.style.display`, and fails only when NEITHER does. Removing the write from
  either side now reaches the set equality and goes red on the `missing` branch naming the global
  that stopped writing. Both directions are genuinely covered.
- **Files modified:** `scripts/verify-start-path-recovery.mjs`
- **Commit:** 9cd4e9a

**3. [Rule 3 - Blocking] The fake `sleep` needed a hard park, not just a counter**
- **Found during:** Task 1
- **Issue:** With `sleep` resolving immediately, `_recoveryProbeLoop` is a pure microtask loop. Node
  drains the microtask queue completely before any macrotask, so the drive would have starved
  `setImmediate` forever and hung the `--quick` gate.
- **Fix:** Past a fixed budget of resolutions the fake `sleep` returns a promise that never settles,
  which parks every supervisor loop for good. The plan called for this; recording it because the
  reason is non-obvious and the next person to touch the harness needs it. A wall-clock race is the
  second belt.
- **Files modified:** `scripts/verify-shell-error-contract.mjs`
- **Commit:** fe5ea88

**4. [Bookkeeping] `deferred-items.md` item 7 marked RESOLVED**
- **Issue:** Item 7's route read "A follow-up plan; needs a runtime check that drives two consecutive
  failing retries". That is this plan, and the registered check drives two. Leaving the row open
  would be a false record.
- **Fix:** Route column rewritten to name plan 01-11 and the `shell-error-contract` row.
- **Commit:** (with this SUMMARY)

### Plan arithmetic reconciled, not edited

Task 2's acceptance criterion says the self-test header must report "14 planted faults plus 2 clean
controls", then parenthesises "13 pre-existing fault rows plus the 3 added here is 16". The tree had
**11** pre-existing fault rows (6 `SOURCE_FAULTS` + 5 `LOG_FAULTS`), so 11 + 3 = 14 faults, + 2
controls = 16 rows. The header now reads `planting 14 fault(s) plus 2 clean controls` and the PASS
line reads `all 16 self-test rows`, which satisfies both the first clause and the stated total. The
criterion said to reconcile rather than edit the number; the number was already right and the
parenthetical's "13" was the slip.

## Known Stubs

None. No hardcoded empty value, placeholder string, or unwired data source was introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary.
The analyzer reads two source files and writes only to `mkdtemp` scratch; it imports no chrome module
and installs no package (Node built-ins only: `node:fs`, `node:path`, `node:os`, `node:url`,
`node:vm`, `node:child_process`).

## What stays open, deliberately

- **WINDOWS.md ledger item 15 is NOT closed.** This is a Node-level contract check over shipped
  source, not a human clicking Retry in a real window. Closing or downgrading that row on the
  strength of this check would record a perceptual verification nobody performed. The plan named this
  as a prohibition and it is honoured.
- **The `<human-check>` is unperformed.** Launch the built app with a deliberately broken
  `powerbrowser.sidecar.backendMain`, wait for the error layer, click Retry twice, confirm a
  product-named message with a working Retry and a working Details control is back on screen after
  each failure. Chrome-context Marionette is platform-blocked on Linux (ledger item 7), which is the
  same fallback 05-02-SUMMARY.md already recorded for the Retry button.
- **One tier-3 regression confirmation belongs at the phase gate, not in a task.** The fix changes the
  error layer's visible behaviour, so `shell03-budget-exhausted-error` and
  `shell03-auto-dismiss-on-selfheal` should be re-run once against a repackaged binary (`./mach build
  faster`, a chrome-JS repackage in minutes, not the ~47–54 minute full compile). Neither check clicks
  Retry, so neither is expected to move; the run exists to prove that.

## Self-Check: PASSED

- `scripts/verify-shell-error-contract.mjs` — FOUND
- `powerbrowser/shell/TheiaService.sys.mjs` — FOUND
- `powerbrowser/shell/powerbrowser.js` — FOUND
- `scripts/verify-start-path-recovery.mjs` — FOUND
- `scripts/verify-platform.sh` — FOUND
- Commit `fe5ea88` — FOUND
- Commit `9cd4e9a` — FOUND
