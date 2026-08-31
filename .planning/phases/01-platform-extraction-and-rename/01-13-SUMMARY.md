---
phase: 01-platform-extraction-and-rename
plan: 13
subsystem: ui
tags: [gecko-chrome, error-handling, supervisor, verification-harness, user-facing-copy]

requires:
  - phase: 01-platform-extraction-and-rename
    provides: "01-11 made _hideError() the single route to the error element's visibility; 01-12 gated the background recovery probe on the recoverable classification and moved quit-observer registration ahead of every returnable branch"
provides:
  - "TheiaService._errorRecoverable — the painted error state's classification, with _errorShown's exact lifetime"
  - "A classification guard on retry(), the supervisor-side refusal a direct powerbrowserRetry() call cannot bypass"
  - "errorRetryButton.hidden mirrored from the classification at the show site only"
  - "USER_MESSAGE.couldNotStartUnrecoverable, and a reworded nodeMissing — no unrecoverable-reachable message names Retry"
  - "Registered scenario unrecoverable-classification-refuses-the-retry-click, plus four planted faults"
affects: [phase-02-rebrand-generator, gui-01, shell-error-contract]

actuals:
  tokens: 15809
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Classification stored with the painted state's lifetime, guarded in the supervisor, mirrored (never authored) in the DOM"
    - "A self-test fault anchored on a code SHAPE regex rather than a quoted prose string, so rewording cannot silently disarm the plant"

key-files:
  created: []
  modified:
    - powerbrowser/shell/TheiaService.sys.mjs
    - powerbrowser/shell/powerbrowser.js
    - scripts/verify-shell-error-contract.mjs
    - .planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md
    - .planning/WINDOWS.md

key-decisions:
  - "The refusal lives in TheiaService.retry(), not in the DOM: powerbrowserRetry() is a window global any chrome-privileged caller can invoke without touching the button, so a rendered state is presentation and never authority."
  - "The guard returns BEFORE _hideError(). That ordering is half the fix — it is what stops a refused click nulling _failureDetails and erasing the rows that identified the failure."
  - "two-consecutive-failing-retries-repaint was retargeted onto the RECOVERABLE class rather than retired. The repaint contract is a statement about the class that offers Retry; the unrecoverable class moved to the new scenario, and the two together assert the gate in both directions."
  - "Minted USER_MESSAGE.couldNotStartUnrecoverable, where 01-10 declined to mint a key. 01-10's reasoning (a new key must not invent a distinction the user cannot act on) stays correct for reportUnexpectedFailure; here the distinction IS the action, because one screen offers Retry and the other does not."
  - "POWERBROWSER_DECK_STATE gained no key for the Retry control's visibility. That is the named place a future tier-3 launch-level check would observe it; adding it now would be scaffolding for a check nobody is writing."

patterns-established:
  - "Two-directional gate: every refusal assertion is paired with a positive control on the opposite class, and the reverse-direction fault (refuse everything) is planted and required red."
  - "Self-test anchors match code shape, not prose. A mutation that produces an unchanged source fails its row, so an anchor quoting a log sentence rots the next time the wording improves."

requirements-completed: [MIG-04]

coverage:
  - id: D1
    description: "A Retry driven against an unrecoverable error state drives zero spawns and leaves the failure's diagnostic rows intact"
    requirement: MIG-04
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only shell-error-contract # scenario unrecoverable-classification-refuses-the-retry-click"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Retry control is hidden for the unrecoverable class and present for the recoverable one"
    requirement: MIG-04
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only shell-error-contract # elements.get('powerbrowser-error-retry').hidden, asserted in both scenarios"
        status: pass
    human_judgment: false
  - id: D3
    description: "No user-facing message reachable from an unrecoverable call site names the Retry control"
    requirement: MIG-04
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only shell-error-copy-no-internals"
        status: pass
      - kind: other
        ref: "derived assertion over the parsed USER_MESSAGE string values, scoped to keys reachable from an unrecoverable site"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every new assertion has a planted fault that drives it red naming the drift, in both directions"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only shell-error-contract-self-test # 9 faults + 1 clean control"
        status: pass
    human_judgment: false
  - id: D5
    description: "A human clicking Retry in a real launched window sees the control absent on an unrecoverable failure and present on a recoverable one, and the diagnostics rows survive"
    verification: []
    human_judgment: true
    rationale: "The node harness proves the supervisor/bootstrap contract and the spawn counts, not the pixels. Chrome-context Marionette is platform-blocked on Linux (WINDOWS.md ledger item 7), so no automated observation of the chrome document's rendered state exists on this platform."

duration: 15min
completed: 2026-08-31
status: complete
---

# Phase 01 Plan 13: Gate the User-Driven Retry Route Summary

**The `recoverable` classification now reaches both the supervisor's own `retry()` entry point and the on-screen Retry control, so an unrecoverable failure is neither re-entered nor offered a control that would be refused — and the click that used to erase the failure's diagnostic rows no longer runs.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 of 3
- **Files modified:** 6

## Accomplishments

- **Closed gap `2d`'s second route.** 01-12 gated the background recovery-probe *timer* on `recoverable`. `retry()` was still unconditional, so the one class D-113 calls "unrecoverable by construction … with no retry at all" was re-entered by the single control the error screen offered — against `_configDir = null`, `_stateFilePath = null` and no registered quit observer — and `_hideError()` nulled `_failureDetails` on the way past. Both halves are now gated: `_errorRecoverable` in the supervisor (the authority) and `errorRetryButton.hidden` on the control (presentation).
- **Made the copy agree with the controls.** Minted `USER_MESSAGE.couldNotStartUnrecoverable` for `_spawnAndGate`'s two `recoverable: false` returns, and reworded `nodeMissing`. No message reachable from an unrecoverable call site names Retry any more.
- **Grew the registered gate from three scenarios to four and from five planted faults to nine**, with the new scenario observed red before the fix and each new assertion given a plant of its own — including the reverse-direction plant that refuses *every* Retry.

## Task Commits

1. **Task 1: The classification reaches the Retry affordance, end to end** — `1ca76cf` (fix, tracer/TDD)
2. **Task 2: The copy stops naming a control that is not on screen** — `67e30b5` (fix)
3. **Task 3: Prove each new assertion can go red, then make the record match** — `2c267d7` (test)

## The red observed before the fix

The plan requires this verbatim. `node scripts/verify-shell-error-contract.mjs` against the **unmodified** supervisor and bootstrap, with only the new scenario written, exited 1 with four failures — all four of the new assertions:

```
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: the Retry control is still on screen for a failure the supervisor classified unrecoverable -- `powerbrowser-error-retry`.hidden is undefined rather than true. A control the interface is designed to refuse is worse than no control: it consumes the user's one remaining idea about what to do
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: a Retry driven against an UNRECOVERABLE error state re-entered the spawn path -- the boundary's spawn was called 1 time(s) after the error state was painted. That branch returns before `_configDir`, `_stateFilePath` and the quit observer are ever assigned, so every one of those attempts starts a backend holding the per-launch token against unassigned state and unobserved by quit
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: the refused Retry destroyed the failure's diagnostic rows -- TheiaService.getFailureDetails() returned [["Preference","powerbrowser.sidecar.backendMain"],["Preference status","unset"]] before the call and [["Failed step","spawning the backend process"],["Error","harness: the platform refused to exec the backend"]] after it. The refusal must return BEFORE `_hideError()`, which nulls `_failureDetails`: a user action that did not resolve the failure must not discard the only evidence the user had left to act on or report
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: a `POWERBROWSER_SHELL_ERROR_CLEARED ` line was emitted across a Retry the supervisor must have refused -- the error layer was taken off the user's screen for a failure nothing was done about, leaving no message, no Retry and no Details
```

Note the third line: on the pre-fix tree the rows returned *after* the refused click were not merely erased — they had been **replaced** by the rows of a *second, different* failure ("spawning the backend process"), because the click had already driven a fresh spawn attempt against unassigned state.

## The four new planted faults, and the red each produced

One plant per new assertion, each required to go red naming its own drift.

**1. `the classification guard removed from retry() entirely`** — the pre-fix shape.

```
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: a Retry driven against an UNRECOVERABLE error state re-entered the spawn path -- the boundary's spawn was called 1 time(s) after the error state was painted. That branch returns before `_configDir`, `_stateFilePath` and the quit observer are ever assigned, so every one of those attempts starts a backend holding the per-launch token against unassigned state and unobserved by quit
```

**2. `the classification guard moved below the _hideError() call`** — the ordering fault. The spawn is still refused; the rows are destroyed on the way. This row is what makes the preserved-rows assertion provably red-able rather than a passenger.

```
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: the refused Retry destroyed the failure's diagnostic rows -- TheiaService.getFailureDetails() returned [["Preference","powerbrowser.sidecar.backendMain"],["Preference status","unset"]] before the call and [] after it. The refusal must return BEFORE `_hideError()`, which nulls `_failureDetails`: a user action that did not resolve the failure must not discard the only evidence the user had left to act on or report
```

**3. `the Retry control's hidden mirror removed from powerbrowserShowError`** — proves the presentation half is asserted independently of the supervisor half.

```
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-refuses-the-retry-click: the Retry control is still on screen for a failure the supervisor classified unrecoverable -- `powerbrowser-error-retry`.hidden is undefined rather than true. A control the interface is designed to refuse is worse than no control: it consumes the user's one remaining idea about what to do
```

**4. `the classification guard made unconditional, so every Retry is refused`** — the reverse direction, caught by the retargeted repaint scenario. A "fix" that simply refused every Retry would satisfy rows 1–3 and turn every transient failure into a permanent error state.

```
verify-shell-error-contract: FAIL -- scenario two-consecutive-failing-retries-repaint: no POWERBROWSER_SHELL_ERROR_CLEARED was emitted after the first failing Retry; no second POWERBROWSER_SHELL_ERROR was emitted -- the error layer never came back. Expected ["POWERBROWSER_SHELL_ERROR","POWERBROWSER_SHELL_ERROR_CLEARED","POWERBROWSER_SHELL_ERROR","POWERBROWSER_SHELL_ERROR_CLEARED","POWERBROWSER_SHELL_ERROR"] but observed ["POWERBROWSER_SHELL_ERROR"]. The consequence is the whole point of this check: the user is looking at a screen the click handler blanked, with no message, no Retry and no Details, for the rest of the session. (Stale recovery probe still active after the first Retry: true.)
```

## Files Created/Modified

- `powerbrowser/shell/TheiaService.sys.mjs` — new `_errorRecoverable` field; written inside `_showError`'s latch, cleared in `_hideError`, read only in `retry()`'s guard; `USER_MESSAGE.couldNotStartUnrecoverable` minted and `nodeMissing` reworded; `_showError`'s 01-12 doc block gained an appended paragraph (existing citations untouched, per D-08).
- `powerbrowser/shell/powerbrowser.js` — `errorRetryButton.hidden = !recoverable` inside `powerbrowserShowError`, at the show site only. No reset in `powerbrowserHideError`: one writer for one fact.
- `scripts/verify-shell-error-contract.mjs` — `elements` returned from `loadShippedSources`; `RECOVERABLE_DRIVE` / `UNRECOVERABLE_DRIVE` extracted and shared; `two-consecutive-failing-retries-repaint` retargeted with a classification vacuity guard and a Retry-present positive control; new `unrecoverable-classification-refuses-the-retry-click`; four new `SOURCE_FAULTS` rows.
- `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md` — Error-copy rewrite table updated to the strings the tree ships (both verified byte-identical against the parsed table), plus the rule this gap taught.
- `.planning/WINDOWS.md` — ledger row 21, marked fixed. Scopes row 20 to the timer route.
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — row 8, chaining to item 7 rather than contradicting it.

**No registry row was added to `scripts/verify-platform.sh`.** The existing `shell-error-contract` row already runs this file; appending a sibling driver or a duplicate row is what that registry exists to prevent.

## Verification

| Check | Result |
|---|---|
| `--only shell-error-contract` | PASS, PASS line naming all **four** scenarios |
| `--only shell-error-contract-self-test` | PASS — **9 planted faults + 1 clean control**, every row red-naming-the-drift, no "did not apply" row |
| `--only shell-error-copy-no-internals` and its self-test | PASS (6 faults) |
| `--quick` | PASS, **24/24**, no fewer rows than before this plan |
| `node scripts/scan-brand-residue.mjs` | exit 0 (run with every changed file staged) |
| `windows status` | total 20 → 21, open unchanged at 7, fixed 13 → 14; markdown row and JSON mirror both present and agreeing |

### Derived source assertions (Task 1)

- `_errorRecoverable` assigned in exactly `["_showError","_hideError"]`, read in exactly `["retry"]` — derived per-method-body, not by whole-file grep.
- In `retry()`, the guard's `return` is at character offset **223**, the `_hideError()` call at **241**. The ordering that preserves the rows holds.
- `errorRetryButton.hidden` assigned **1** time file-wide, **1** of which is inside `powerbrowserShowError`.
- The declaration block for `#powerbrowser-error-retry` (scoped to that one selector, not the file) declares **no** `display` property, so nothing can defeat the `hidden` attribute. `#powerbrowser-error-message` keeps `max-width: 40em` and `overflow-wrap: anywhere`, so the lengthened unrecoverable-class copy wraps rather than truncating.

### Derived source assertions (Task 2)

- Declared keys (**5**): `interfaceFilesMissing, nodeMissing, couldNotStart, couldNotStartUnrecoverable, didNotFinishStarting`. Referenced keys: the same **5**. Declared-not-referenced: none. Referenced-not-declared: none — the minted key closes both sets.
- Keys reachable from a call site classifying its failure unrecoverable: `couldNotStartUnrecoverable, interfaceFilesMissing, nodeMissing`. **None of their string values names the Retry control** — asserted over the *parsed string values only*, so a comment or doc block discussing the control can neither satisfy nor invalidate the check.
- `01-UI-SPEC.md` carries both changed values byte-identically.

## Decisions Made

See `key-decisions` in the frontmatter. The one worth restating: **the DOM is never read as authority.** The new scenario calls `powerbrowserRetry()` directly rather than through the button, precisely so that a fix which only hid the control cannot pass it — and the harness's fake `addEventListener` is a no-op anyway, so the element's own state is the only honest observation of the presentation half.

## Deviations from Plan

**1. [Rule 1 — factual correction] The plan's reachability audit undercounted `couldNotStart`'s recoverable sites by one.**

- **Found during:** Task 2, confirming the audit against the file as the plan instructs ("confirm it against the file rather than assuming it").
- **Issue:** The plan states `couldNotStart` is reachable from "four recoverable sites (the settings-folder branch, the stdin-handshake failure, the readiness-stream failure and `reportUnexpectedFailure`)". The file has **five**: four `return { recoverable: true, message: USER_MESSAGE.couldNotStart }` sites (`start()`'s settings-folder branch, the stdin handshake, the readiness stream, and a fourth in `_spawnAndGate`'s health-gate path) plus `reportUnexpectedFailure`'s direct `_showError` call.
- **Fix:** None needed in code — the plan's *target state* was correct and is what shipped. The two **unrecoverable** sites are exactly the two named (D-113 spawn-throw, D-112 pinned-port conflict), and only those two were repointed. Recorded here so the audit on the record matches the tree.
- **Verification:** the derived key-reachability assertion above.

**2. [Rule 2 — check robustness] The two new guard-fault anchors match the guard's shape, not its log sentence.**

- **Found during:** Task 3.
- **Issue:** The plan says to anchor every mutation on text copied from the post-Task-1 file. Copied literally, the guard-removal and guard-reordering plants would have to quote the refusal's prose log line byte-for-byte. A mutation producing an unchanged source is reported as "the fault did not apply" and fails its row — so a prose anchor is an anchor that silently rots the next time that sentence is improved, in a file whose whole discipline is that a check must go red for the right reason.
- **Fix:** `RETRY_GUARD_RE` / `RETRY_GUARD_ORDER_RE` match the guard's structure — the condition, its six-space body, its four-space closing brace — and the reordering plant is a `$2$1` swap against the `_hideError()` line. Both are still anchored on post-Task-1 text; they are just anchored on the part of it that is code.
- **Verification:** both rows report "red, naming the drift"; no row reports "the fault did not apply".

---

**Total deviations:** 2 auto-fixed (1× Rule 1, 1× Rule 2). No architectural change; no Rule 4 escalation.

## Known Stubs

None. No hardcoded empty value, placeholder string, TODO or FIXME was introduced by this plan.

## Residual — what this does NOT prove

**The node harness proves the supervisor/bootstrap contract and the spawn counts, not the pixels.** Every assertion in `verify-shell-error-contract.mjs` runs the shipped sources under Node against a faked `PowerBrowserAPI`, not under Gecko. It proves the classification-to-affordance wiring, the spawn counts, the preserved diagnostic rows and the sentinel ordering; it does not prove that a hidden button is actually unpainted on screen. The perceptual half — a human launching the built binary with the backend-entry preference unset, seeing Details and **no** Retry, pressing Ctrl+Alt+Shift+D and finding the failure's rows still present, then confirming Retry *is* offered on a recoverable failure — stays on the `WINDOWS.md` human record alongside ledger items 15 and 16, because chrome-context Marionette is platform-blocked on Linux (ledger item 7). This is the same residual 01-11 and 01-12 each recorded, and it is why D5 above carries `human_judgment: true`.

## Self-Check: PASSED

- All six modified files present on disk.
- All three task commits found in `git log`: `1ca76cf`, `67e30b5`, `2c267d7`.
