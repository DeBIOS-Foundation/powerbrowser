---
phase: 01-platform-extraction-and-rename
plan: 12
subsystem: shell-supervisor
tags: [error-state, recovery-probe, process-lifetime, verification, gap-closure, MIG-04, SEC-01]
status: complete

requires:
  - "01-11: `scripts/verify-shell-error-contract.mjs`, its Proxy-based fake `PowerBrowserAPI`, its bounded-drain helper and its two registry rows"
  - "01-10: `reportUnexpectedFailure` and the four fire-and-forget attachment points, one of which is the recovery probe's own root"
  - "01-09: `scripts/verify-start-path-recovery.mjs` and its derive-both-sides-and-compare doctrine"
  - "05-02: the SHELL-03 error layer, `_showError`'s `recoverable` argument, and D-115's background recovery probe"
provides:
  - "An unrecoverable classification gets no retry -- 01-VERIFICATION.md's failed truth 2d is closed"
  - "A recoverable one still auto-recovers, proven by a registered positive control, so the gate cannot be satisfied by never probing"
  - "The quit observer and `_stateFilePath` precede every branch that can reach a spawn -- 01-VERIFICATION.md's failed truth 2e is closed"
  - "`_quitObserverOff`: the observer's lifetime now matches the supervisor's rather than the application's"
  - "Derivation E: a tree-derived early-return window that goes red on ANY future return inserted ahead of the registration"
affects:
  - "powerbrowser/shell/TheiaService.sys.mjs (`start()`, `stop()`, `_showError()`, the per-launch field block)"
  - "scripts/verify-shell-error-contract.mjs (two new scenarios, two new self-test rows)"
  - "scripts/verify-start-path-recovery.mjs (derivation E, two new self-test rows)"
  - ".planning/WINDOWS.md (ledger entry 20)"

tech-stack:
  added: []
  patterns:
    - "Causal, not temporal, instrumentation: with a fake `sleep` that resolves immediately the supervisor's probe is a pure microtask loop that burns its whole sleep budget inside ONE microtask drain, so no `setImmediate` turn can read a counter 'at the moment the error appears'. Count instead what happened AFTER the code under test emitted its own error sentinel."
    - "A two-directional gate needs a registered positive control, and the control needs its own planted fault -- otherwise 'stop doing X everywhere' passes the negative half"
    - "Derive an ordering anchor by following the tree: the boundary registration is the call whose argument is an arrow into one of the object's own methods; that method's name then yields the shutdown body; the shutdown body's single-argument boundary call then yields the state-file field. No identifier is written down for the tree to agree with."

key-files:
  created: []
  modified:
    - powerbrowser/shell/TheiaService.sys.mjs
    - scripts/verify-shell-error-contract.mjs
    - scripts/verify-start-path-recovery.mjs
    - .planning/WINDOWS.md
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md

decisions:
  - "The gate is the `recoverable` parameter `_showError` already receives, NOT a new 'sidecar resolved' boolean. The verification offered the second flag as an alternative; it was rejected because a second source of truth for one fact is the shape of the defect, not its fix."
  - "The probe-gate instrument counts boundary spawn calls that occurred after the code under test emitted its own error sentinel -- causal rather than temporal. The plan's specified measurement (read the count 'at the moment the first error sentinel appears') is unobservable under an immediately-resolving fake sleep and produced a mis-driven red on the positive control."
  - "Both probe scenarios share ONE drain constant. The negative side's zero is only meaningful because the positive side proves the same drain is long enough for the probe to have run."
  - "Derivation E's anchors are located structurally by following the tree from the registration's own arrow body, so the rule carries no literal identifier -- and it therefore goes red on any early return inserted ahead of the registration, not only the settings-folder one this gap named."
  - "WINDOWS.md entry id is 20, not the plan's 19: plan 01-11 already recorded id 19."
  - "Ledger items 15 and 16 remain OPEN and unclaimed. Nothing here is a perceptual verification."

metrics:
  duration: ~30min
  completed: 2026-08-31

actuals:
  tokens: 16000
  tasks: 3
  commits: 3
---

# Phase 01 Plan 12: Probe Gate and Quit-Observer Ordering Summary

The recovery probe now respects the classification `_showError` was already being handed, and the
quit observer and state-file path are established before any branch of `start()` that can still end
in a spawned, healthy backend.

## What shipped

Two behavioural changes in the supervisor, both small, both previously invisible to every registered
check.

**Truth 2d — the ungated probe.** `_showError(message, recoverable, details)` received a
classification and called `_startRecoveryProbe()` regardless. D-115's probe IS the retry mechanism: it
re-enters `_restart()` on a timer. So the one class the supervisor's own D-113 comment calls
"unrecoverable by construction ... with no retry at all" — `_resolveSidecar()` failing, before
`_configDir` or `_stateFilePath` exist — drove a real process spawn every 15 seconds for the life of
the session, against unassigned state. The fix is the conditional the method's own argument always
supported.

**Truth 2e — the late observer.** `PowerBrowserAPI.onQuitGranted` was registered after the
settings-folder `ensureDirectory` try/catch. That catch classifies its failure `recoverable: true`,
so even after the probe gate lands it still probes — and a probe-driven spawn can go all the way
through the health gate to a completed swap. A launch that returned there would therefore have a live,
healthy, supervised backend with no quit observer and no state-file record: `stop()` never runs on
quit, so a Node process with the extension host's file access and terminal surface outlives the
browser still holding the token it was handed at spawn, and a crash leaves the next launch's
`_reapLeftover()` nothing to find. Fixing the gate narrows this; only the ordering closes it.
`_stateFilePath` and the registration now sit immediately after `_configDir`, and the unregister
function is retained as `_quitObserverOff` and detached by `stop()`.

## Verification

### Task 1 Step 3 — the asymmetric RED, verbatim

Both scenarios written, the gate NOT yet applied, one run:

```
verify-shell-error-contract: FAIL -- scenario unrecoverable-classification-starts-no-probe: the recovery probe ran for a failure the supervisor classified unrecoverable -- the boundary's spawn was called 50 time(s) after an error state whose recoverable flag was false. The supervisor's own D-113 comment calls this class unrecoverable by construction with no retry at all, so every one of those attempts is a process spawn against a _configDir and a _stateFilePath that were never assigned, repeating for the life of the session. (Probe still active: true; fake sleeps resolved: 51.)
```

Exit code 1, and **that is the only failure line on the run**. The positive control
`recoverable-classification-starts-the-probe` was GREEN on the same unfixed tree, which is the point:
the instrument discriminates rather than failing everything. Fifty spawns in a single drive is not a
rounding error — it is the probe running its whole sleep budget against a launch that had resolved
nothing.

### The first attempt at the positive control was mis-driven, and the plan said what to do about it

The plan specified reading the spawn count "at the moment the first error sentinel appears". Under the
fake `sleep`, which resolves immediately, `_recoveryProbeLoop` is a pure microtask loop — Node drains
the microtask queue completely before any macrotask, so the probe burns all 50 budgeted sleeps inside
one drain, before any `setImmediate` turn the harness could read a counter on. The first run therefore
showed the control red with "51 time(s) when the error state was painted and 51 time(s) after":
identical counts because both reads happened after everything had already run.

The plan's own instruction covers this — "if it is red the scenario is mis-driven rather than the code
being wrong" — so the measurement was replaced rather than accepted. The counter is now **causal**:
`state.countSpawn()` increments a second counter when, and only when, the recorded stream already
contains an error sentinel the code under test emitted. That reads the same fact with no dependence on
winning a race the harness cannot win.

### GREEN after the gate

```
verify-shell-error-contract: PASS -- scenario two-consecutive-failing-retries-repaint: a failing Retry repaints the error layer, twice over; scenario unrecoverable-classification-starts-no-probe: an unrecoverable classification drives no spawn at all; scenario recoverable-classification-starts-the-probe: a recoverable one still drives at least one
```

`--self-test`: 5 planted faults plus 1 clean control, all six rows behaved. The fifth plant, `the
recovery probe never started at all`, is the one that makes the gate honest — it removes the probe
entirely and requires the POSITIVE control to go red, so a "fix" that simply stopped probing
everywhere cannot pass.

### Task 2 — two independent reds, different clauses, different messages

**Step 2, the ordering, against the unreordered `start()`:**

```
verify-start-path-recovery: FAIL -- `start()` can return at byte 1017 of its own body -- BEFORE it has both registered the quit observer (`PowerBrowserAPI.onQuitGranted`) and derived `this._stateFilePath`. That branch is classified recoverable, so the background recovery probe still runs on it and can drive a spawn through the health gate to a completed swap: a live, healthy, supervised backend on a launch that has no quit observer and no state-file record. `stop()` never runs on quit, so a Node process with the extension host's file access and terminal surface outlives the browser still holding the token it was handed at spawn, and a crash on that launch leaves the next launch's leftover reap nothing to find. Source preceding that return:
        ...or", err.message],
                ],
              };
              this._showError(failed.message, failed.recoverable, failed.details);
```

The quoted source identifies the settings-folder branch, and every identifier in the message —
`PowerBrowserAPI.onQuitGranted`, `this._stateFilePath`, `stop()` — is derived, not written into the
checker.

**Step 4, the retention, observed separately with the reorder already applied and the boundary's
return value still discarded:**

```
verify-start-path-recovery: FAIL -- `start()` discards the unregister function `PowerBrowserAPI.onQuitGranted` returns -- the observer's lifetime is then the application's rather than this supervisor's, and nothing can ever detach it
```

Two clauses, two reds, two fixes. One red covering both would have left the second unproven.

### Ordering, after the fix

```
153:    this._configDir = this._resolveConfigDir();
170:    this._stateFilePath = `${this._configDir}/sidecar-state-${this._profileStateKey()}.json`;
186:    this._quitObserverOff = PowerBrowserAPI.onQuitGranted(() => this.stop());
197:      await PowerBrowserAPI.ensureDirectory(this._configDir);
231:      await this._reapLeftover();
243:    await this._restart();
```

`grep -c '_quitObserverOff'` → 5 (comment, field declaration, assignment, and two references in
`stop()`).

### `--quick` PASS count

**24/24, unchanged.** This plan added no registry row; both analyzers ride rows that already existed.

| | Rows | Result |
|---|---|---|
| Before this plan | 24 | `verify-platform: PASS -- all checks passed` |
| After this plan | 24 | `verify-platform: PASS -- all checks passed` |

`git add -A` was run before every `--quick` invocation, because `scan-brand-residue` iterates
`git ls-files` and an unstaged file is invisible to it.

Self-test totals: `shell-error-contract-self-test` 5 faults + 1 control = 6 rows;
`start-path-recovery-self-test` 16 faults + 2 controls = 18 rows.

### Other gates

- `scripts/check-internals-boundary.sh` → exit 0. `powerbrowser/INTERNAL-APIS.md` unchanged:
  `onQuitGranted` is a pre-existing boundary method that already returned an unregister function, so
  no new Firefox-internal touchpoint was reached and no catalogue row is owed.
- No second classification flag: `git diff --unified=0 TheiaService.sys.mjs | grep '^+' | grep -c ': false,'` → 0.
- `git -C upstream diff` empty; `git status --porcelain upstream theia` empty.
- `.planning/REQUIREMENTS.md` untouched — marking MIG-04 or SEC-01 complete is the verifier's call on
  the next pass, not this plan's.
- No generator, no template, no derive-at-build-time helper; no branding value touched.

## The reasoned consequence of the reorder

Recorded here as the plan asked, as a consequence rather than a deviation. With the observer
registered earlier, a launch that returns at the settings-folder branch will now run `stop()` on quit,
where before it would not have. That path has no process and a `_stateFilePath` pointing into a folder
that may not exist. `stop()`'s kill is skipped because `_proc` is null; its `removeStateFile` call is
already inside a `try`/`catch` whose comment states the boundary tolerates an absent file; and the new
`_quitObserverOff` detach is guarded on the field being present. No new failure mode.

The symmetrical case — a probe-driven spawn on that same branch reaching `writeStateFile` with a
settings folder that could not be created — is recorded as an **accepted** threat (T-01-12-04) rather
than a closed one. `writeStateFile`'s call site in `_spawnAndGate` is already inside a try/catch that
logs and continues, and `readStateFile` already resolves to null for an absent or malformed file, so
the reorder introduces no new unguarded throw. But no registered check drives that combination, so it
rests on reading those two guards, not on a red.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 - Bug in the plan's specified measurement] The positive control's spawn count is read causally, not at a moment in time**
- **Found during:** Task 1, Step 3, the first RED run
- **Issue:** The plan said to "record the `spawnProcess` call count at the moment the first error
  sentinel appears, then drain the probe interval, then assert the count has strictly INCREASED".
  That moment is not observable. The fake `sleep` resolves immediately, making
  `_recoveryProbeLoop` a pure microtask loop; Node drains microtasks completely before any macrotask,
  so the probe exhausts its 50-sleep budget inside the first drain and both reads return 51. The
  control went red on the unfixed tree, which the plan explicitly says means the scenario is
  mis-driven.
- **Fix:** A second counter, `spawnsAfterError`, incremented by the boundary's own spawn stub only
  when the recorded stream already contains an error sentinel emitted by the code under test. Both
  scenarios now assert on it (`=== 0` and `>= 1`). The measurement is causal, so it is correct
  regardless of when the harness gets a turn.
- **Files modified:** `scripts/verify-shell-error-contract.mjs`
- **Commit:** e0a287c

**2. [Rule 3 - Blocking] The ledger entry id is 20, not 19**
- **Found during:** Task 3
- **Issue:** The plan specified `id` 19 for the new WINDOWS.md entry. Plan 01-11 had already appended
  id 19 (the tier-3 regression confirmations it left unrun). Writing a second 19 would have produced a
  duplicate key in a ledger that is keyed by id.
- **Fix:** Appended as id 20 via `gsd-tools windows append`, so the id allocation, the counts in the
  frontmatter and both on-disk representations stay consistent. Task 3's verification command was
  adjusted to the same id.
- **Files modified:** `.planning/WINDOWS.md`
- **Commit:** 2705c6c

**3. [Rule 3 - Blocking] WINDOWS.md is a markdown table plus a JSON block, not bare JSON**
- **Found during:** Task 3
- **Issue:** The plan's `<verify>` command slices the file from its first `[` to its last `]` and
  parses that as JSON. The first `[` occurs inside prose in the markdown table, so the slice never
  parses. The file's real shape is YAML frontmatter, a markdown table, and a fenced ` ```json ` block
  carrying the same records.
- **Fix:** The validation slices from the `[` that follows the fence opener instead. The `reason` was
  written into BOTH representations so they cannot disagree.
- **Files modified:** `.planning/WINDOWS.md`
- **Commit:** 2705c6c

### Bookkeeping reconciled, not edited

Task 2's acceptance criterion says the self-test must report "18 planted faults plus 2 clean controls
(13 original, 3 from plan 01-11, 2 here)". The tree carries **16** fault rows (11 pre-existing + 3
from 01-11 + 2 here) and 2 controls, for **18 rows** total — the same arithmetic slip 01-11 recorded,
where the stated total is right and the breakdown double-counts. The header reads `planting 16
fault(s) plus 2 clean controls` and the PASS line reads `all 18 self-test rows`, which satisfies the
criterion's total.

Deferred item 7 was already marked RESOLVED by plan 01-11's own bookkeeping deviation. Its route cell
was extended to name the analyzer file (`scripts/verify-shell-error-contract.mjs`) alongside the
registry row, and to point at ledger 20's residual paragraph for the perceptual half that stays open.

## Known Stubs

None. No hardcoded empty value, placeholder string, or unwired data source was introduced.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary.
No package was installed; both analyzers use only Node built-ins already imported by the scripts they
extend.

## What stays open, deliberately

- **The Gecko-side half is unproven by these checks.** The behavioural scenarios run the shipped
  sources under Node against a faked `PowerBrowserAPI`. They prove the classification-to-probe wiring
  and the spawn counts; they do not prove that Gecko's `quit-application-granted` topic actually fires
  the retained observer in a real quit. Recorded as a backstop truth and in ledger 20's `RESIDUAL, NOT
  CLOSED` paragraph.
- **WINDOWS.md ledger items 15 and 16 remain open**, byte-identical to their pre-task content.
  Nothing here is a perceptual verification.
- **The `<human-check>` is unperformed.** With `powerbrowser.sidecar.backendMain` deliberately unset,
  launch the built app, sit on the error layer for a minute, and confirm with `pgrep -fa node` that no
  backend is spawned in that time. Then with a working configuration, launch, quit from the
  application menu, and confirm the backend is gone and no `sidecar-state-*.json` remains.
- **Two tier-3 regression confirmations belong at the phase gate** (already ledger item 19).
  `shell03-unrecoverable-immediate-error`'s subject is exactly the classification this gate reads, and
  `shell03-auto-dismiss-on-selfheal`'s subject is exactly the probe it must not break. The second is
  the one that could genuinely move; if it goes red, the gate is wrong, not the check. A `./mach build
  faster` chrome-JS repackage is minutes, not the ~47–54 minute full compile.

## Self-Check: PASSED

- `powerbrowser/shell/TheiaService.sys.mjs` — FOUND
- `scripts/verify-shell-error-contract.mjs` — FOUND
- `scripts/verify-start-path-recovery.mjs` — FOUND
- `.planning/WINDOWS.md` — FOUND (entry 20, status `fixed`, residual paragraph present)
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — FOUND
- Commit `e0a287c` — FOUND
- Commit `6ee0e94` — FOUND
- Commit `2705c6c` — FOUND
