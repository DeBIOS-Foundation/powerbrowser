---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-31T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - powerbrowser/shell/TheiaService.sys.mjs
  - powerbrowser/shell/powerbrowser.js
  - scripts/verify-platform.sh
  - scripts/verify-shell-error-contract.mjs
  - scripts/verify-start-path-recovery.mjs
findings:
  critical: 1
  warning: 5
  info: 6
  total: 12
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-31
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Scope is `git diff e49dd38..HEAD` over the five files touched by gap-closure plans 01-11 and
01-12 (~1500 insertions, mostly the two analyzers).

What the diff gets right, verified rather than assumed:

- Both analyzers and both `--self-test` runs are green on the current tree
  (`start-path-recovery`: 18 rows; `shell-error-contract`: 6 rows).
- 01-11's fix is real: `powerbrowserRetry` no longer writes `errorElement.style.display`, and
  `retry()` calls `_hideError()` before `_restart()`. Derivation D checks the ORDER, not just
  presence, which is the right assertion.
- 01-12's probe gate is honest in both directions. `unrecoverable-classification-starts-no-probe`
  and `recoverable-classification-starts-the-probe` share ONE `PROBE_DRAIN_TURNS`, and the
  instrument is a counter on the fake boundary's spawn stub — a call the supervisor made, not a
  line the harness printed. Fault plants 4 and 5 confirm each direction goes red. No absence
  assertion in either new analyzer is made over an emitter the check itself writes;
  `assertEmitters` proves both sentinel prefixes come from `dump(` sites in the file under test.
- `_restart()` remains the single spawn entry point (derivation D's `_spawnAndGate(` check), so
  `_restartInFlight` still serializes Retry against the health loop and the probe.
- Derivation E is genuinely derived, not enumerated. I planted an arbitrary unrelated early
  return (`if (!this._configDir) { return; }`) immediately before the registration and it went
  red naming the byte offset — it is not keyed on the settings-folder branch the gap named.
- Only two rows were appended to `verify-platform.sh`'s single registry; no sibling driver was
  created.

What it gets wrong: the 01-12 fix closes the timer-driven half of an unretryable-class re-entry
and leaves the user-driven half (the Retry button) wide open, which is the one Critical below.
Separately, both new checks assert on sentinel EMISSION rather than on the layer's resolved
visibility, and I have two working mutants that reintroduce 01-11's exact defect class while
both checks stay green.

## Critical Issues

### CR-01: `recoverable: false` gates the background probe but not the Retry button, so the unretryable class is still re-entered — by the user, with the same unassigned state

**File:** `powerbrowser/shell/TheiaService.sys.mjs:143-151`, `:955-958`, `:1079-1093`;
`powerbrowser/shell/powerbrowser.js:102-109`, `:131-137`;
`powerbrowser/shell/powerbrowser.xhtml:39`

**Issue:**
01-12's own doc block (TheiaService.sys.mjs:1052-1072) states the defect precisely: for the
`_resolveSidecar` class the supervisor "returns before `_configDir` and `_stateFilePath` exist,
so every probe-driven respawn there was spawning against unassigned state". The gate stops the
timer. It does not stop the user.

`powerbrowserShowError` destructures `recoverable` and forwards it to the sentinel only
(powerbrowser.js:103-106). It never touches `errorRetryButton`, which is unconditionally present
and enabled (powerbrowser.xhtml:39; powerbrowser.css has no `[disabled]`/hidden rule for it). So
on an unrecoverable `_resolveSidecar` failure the user is looking at a live Retry control, and
clicking it runs `retry()` → `_hideError()` → `_restart()` → `_spawnAndGate()` with
`_nodePath === null`, `_backendMain === "" | <nonexistent path>`, `_configDir === null`,
`_stateFilePath === null`, and **no quit observer registered** (registration is at
TheiaService.sys.mjs:186, after this branch's `return` at :150).

Three concrete consequences, in order of severity:

1. **The message promises an affordance that cannot work.** `USER_MESSAGE.nodeMissing` (:43)
   reads "Install Node.js 22 or later, then choose Retry." `_resolveSidecar()` is called from
   exactly one place — `start()` at :143 — and `start()` is permanently `_started`-guarded
   (:134-138). Nothing ever re-runs the PATH search. The user can install Node 22 and press
   Retry forever; `this._nodePath` stays null. This violates CLAUDE.md's user-facing-copy rule
   ("ends with a next step that is a real affordance on screen") in the one direction that
   matters — the affordance is on screen and is inert.
2. **Retry destroys the diagnostic that identified the problem.** `_hideError()` nulls
   `_failureDetails` (:1101); the subsequent `spawnProcess` rejection repaints with
   `USER_MESSAGE.couldNotStart` plus `["Error", <Subprocess internal message>]`. The accurate
   rows — `["Preference", "powerbrowser.sidecar.nodePath"]`,
   `["Preference status", "unset, and no node was found on PATH"]` — are gone from the
   diagnostics layer for the rest of the session. The diagnostics layer exists precisely to
   carry what the sentence drops; one Retry click empties it.
3. **Latent backend leak.** `_restart()` on this path can reach `spawnProcess` with no quit
   observer registered and `writeStateFile(null, …)`. Today it cannot actually spawn
   (`Subprocess.call({command: null})` rejects, and `environment` carries a null
   `THEIA_CONFIG_DIR`), so no process escapes — but that is an accident of `_nodePath` being
   null, not a guard. Any future change that gives `_spawnAndGate` a usable fallback command
   turns this into exactly the outlive-the-browser leak derivation E was written to prevent.

The `shell-error-contract` analyzer cannot see this: its `unrecoverable-classification-starts-no-probe`
scenario asserts on `state.spawnsAfterError` and never calls `sandbox.powerbrowserRetry()`. The
repaint scenario does click Retry, but drives the *recoverable* spawn-throws class.

**Fix:** Pick one of two; do not ship neither.

Option A — make the classification reach the DOM, which is where the affordance lives:

```js
// powerbrowser.js
window.powerbrowserShowError = function powerbrowserShowError(detail) {
  const { reason, recoverable } = detail;
  errorMessageElement.textContent = reason;
  errorRetryButton.hidden = !recoverable;   // the affordance follows the classification
  errorElement.style.display = "flex";
  ...
};
```

and reword `USER_MESSAGE.nodeMissing` so its next step is the one that remains on screen
(Details / reinstall), since Retry is no longer offered for it. Add a `recoverable` guard to
`retry()` as defence in depth:

```js
// TheiaService.sys.mjs
async retry() {
  if (this._errorRecoverable === false) { return; }   // set alongside _errorShown in _showError
  this._hideError();
  await this._restart();
}
```

Option B — make Retry honour the sentence it is advertised under, by re-running the one-shot
resolution when it has never succeeded:

```js
async retry() {
  this._hideError();
  if (!this._nodePath || !this._backendMain) {
    const resolved = await this._resolveSidecar();
    if (!resolved.ok) {
      this._showError(resolved.message, false, resolved.details);
      return;
    }
    this._configDir = this._resolveConfigDir();
    this._stateFilePath = `${this._configDir}/sidecar-state-${this._profileStateKey()}.json`;
    this._quitObserverOff ??= PowerBrowserAPI.onQuitGranted(() => this.stop());
    // ...and ensureDirectory, guarded as start() guards it
  }
  await this._restart();
}
```

Whichever is chosen, add the missing scenario to `verify-shell-error-contract.mjs`: drive the
unset-`backendMain` branch (the `SCENARIO_NO_PROBE` fixture already does), then call
`sandbox.powerbrowserRetry()` and assert `state.spawnsAfterError === 0` — the same instrument,
the same honest counter, over the user-driven path instead of the timer-driven one.

## Warnings

### WR-01: derivation C's "exactly ONE visibility owner" set equality is defeated by any write that does not use the derived local binding — proven with a working mutant

**File:** `scripts/verify-start-path-recovery.mjs:446-464` (`deriveErrorLayerVisibilityWriters`),
`:410-444` (`deriveErrorLayerBinding`), `:466-514`

**Issue:** `deriveErrorLayerVisibilityWriters` searches for the literal
`` new RegExp(`\\b${binding}\\.style\\.display\\s*=`) `` — one syntactic form, through one
identifier. The doc block (`:35-52`) claims the rule "goes red on an ADDITION (a third function
blanks the layer, which is exactly the pre-01-11 source)". It does not, for any spelling other
than the derived binding.

Reproduced. I added this single line to `powerbrowserRetry`, which is precisely the pre-01-11
defect written a different way:

```js
document.getElementById("powerbrowser-error").style.display = "none";
TheiaService.retry().catch(err => TheiaService.reportUnexpectedFailure(err));
```

`verify-start-path-recovery` exits 0 and `verify-shell-error-contract` exits 0. Both remain green.
`errorElement.hidden = true`, `errorElement.classList.add("hidden")`,
`errorElement.style.setProperty("display", "none")` and any aliasing local are equally invisible.

The second analyzer cannot compensate because its stream assertion reads the CLEARED/ERROR
sentinels, which `powerbrowserHideError` and `powerbrowserShowError` emit unconditionally —
independent of whether the element actually moved (see WR-02).

**Fix:** Derive the element ID as well as the binding (it is right there in the initialiser) and
match every route to it, then keep the set equality:

```js
function deriveErrorLayerBinding(shellSrc, api) {
  // ...existing derivation of `binding`...
  const id = shellSrc.match(new RegExp(`${binding}\\s*=\\s*document\\.getElementById\\(\\s*["']([^"']+)["']`))?.[1];
  return { binding, id, via: fnName, reason: null };
}

// then, in deriveErrorLayerVisibilityWriters, scan for ALL of:
//   <binding>.style.display =
//   <binding>.hidden =
//   <binding>.classList.
//   <binding>.style.setProperty(
//   document.getElementById("<id>")  ...anywhere outside the binding's own initialiser
```

Any occurrence of the element ID string outside the one initialiser is a second route by
definition, and that single extra check closes the whole class rather than one spelling of it.
Add a self-test row planting the `document.getElementById(...)` form specifically — it is the
one I proved green.

### WR-02: the error layer's CLEAR path emits no deck-state, so nothing anywhere observes that the layer actually became hidden — a `powerbrowserHideError` that shows the layer is green in both checks

**File:** `powerbrowser/shell/powerbrowser.js:111-114`; `scripts/verify-shell-error-contract.mjs:381-402`

**Issue:** `powerbrowserShowError` calls `dumpDeckState("error")` (:108) — the file's own comment
(:34-45) calls computed style "the only assertion available on Linux that observes the chrome
document's rendered state at all". `powerbrowserHideError` calls nothing. Consequently every
assertion about the cleared state anywhere in the tree is an assertion about a `dump()` call
having executed, not about the layer having moved.

Reproduced. Changing one character in `powerbrowserHideError`:

```js
window.powerbrowserHideError = function powerbrowserHideError() {
  errorElement.style.display = "flex";   // was "none"
  dump(`POWERBROWSER_SHELL_ERROR_CLEARED ${JSON.stringify({})}\n`);
};
```

`verify-start-path-recovery` exits 0 (derivation C only asks WHO writes, never WHAT) and
`verify-shell-error-contract` exits 0 (the CLEARED sentinel still appears in the stream in the
right position). The user-visible result is an error layer permanently pinned over a recovered,
healthy Theia UI — with the supervisor's `_errorShown` reading false, which is the same
two-owners-of-one-fact drift 01-11 was written to remove, arriving from the other side.

**Fix:** Two lines, and they make WR-01's mutant fail too:

```js
// powerbrowser.js
window.powerbrowserHideError = function powerbrowserHideError() {
  errorElement.style.display = "none";
  dump(`POWERBROWSER_SHELL_ERROR_CLEARED ${JSON.stringify({})}\n`);
  dumpDeckState("error-cleared");
};
```

```js
// verify-shell-error-contract.mjs, inside runScenario's stream walk:
// after each ERROR sentinel, the matching deck state must report error !== "none";
// after each CLEARED sentinel, it must report error === "none".
// The harness's own getComputedStyle fake (el.style.display || "none") already
// supports this — it is simply not read.
```

That turns the five presence assertions into five assertions about the fact they stand for,
which is what the check claims to be doing.

### WR-03: `_showError` latches `_errorShown` and populates `_failureDetails` before the DOM call, and starts the probe after it — a throwing paint leaves the guard set with nothing painted and no probe

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1079-1093` (and the mirror at `:1096-1104`)

**Issue:**

```js
this._errorShown = true;                                     // latched
this._failureDetails = (details || []).map(...);
this._pushLog(...);
this._browserElement.ownerDocument.defaultView.powerbrowserShowError({...});  // can throw
if (recoverable) { this._startRecoveryProbe(); }             // never reached if it throws
```

`defaultView` is null on a window being torn down, and `powerbrowserShowError` dereferences
module-scope bindings of its own. If that call throws: the guard reads "an error is on screen"
while nothing is on screen; `_startRecoveryProbe()` is skipped so D-115's auto-dismiss never
starts; and the rejection reaches `reportUnexpectedFailure`, whose own `_showError` immediately
early-returns on the latched guard (`:1080-1082`) and paints nothing. The session ends on the
loading layer with no message, no Retry and no Details — byte for byte the outcome 01-10 and
01-11 were both closing.

`_hideError()` has the mirror-image ordering (state cleared first, DOM call last), which is
self-correcting only by luck: the escaping rejection reaches `reportUnexpectedFailure` with
`_errorShown` already false, so it repaints.

**Fix:** Make the effect precede the latch, or make the latch unconditional on the effect:

```js
_showError(message, recoverable, details) {
  if (this._errorShown) { return; }
  this._failureDetails = (details || []).map(([label, value]) => { ... });
  this._pushLog(`Showing error state (recoverable=${recoverable}): ${message}`);
  if (recoverable) { this._startRecoveryProbe(); }   // before the DOM call, not after
  try {
    this._browserElement.ownerDocument.defaultView.powerbrowserShowError({ reason: message, recoverable });
    this._errorShown = true;
  } catch (err) {
    this._failureDetails = null;
    this._fatal(`Failed to paint the error layer: ${err.message}`);
    throw err;   // the guard is NOT latched, so reportUnexpectedFailure can still try
  }
}
```

### WR-04: the quit-observer callback is a fifth untracked fire-and-forget promise root, and 01-12 added an unguarded throw site inside it

**File:** `powerbrowser/shell/TheiaService.sys.mjs:186`, `:289-292`;
`powerbrowser/shell/PowerBrowserAPI.sys.mjs:311-315`

**Issue:** `PowerBrowserAPI.onQuitGranted(() => this.stop())` invokes an `async` method and
discards the promise. `reportUnexpectedFailure`'s doc block (`:960-1000`) enumerates "Four entry
points onto this supervisor [that] are fire-and-forget promise roots with no shared root to
guard … Every one of them routes here." This is a fifth, and it does not. The comment is now
factually wrong about the file it documents.

01-12 made this materially worse by adding a new throw site inside `stop()`:
`this._quitObserverOff()` (`:290`) calls `Services.obs.removeObserver`, which throws
`NS_ERROR_FAILURE` when the observer is not currently registered. Every other statement in
`stop()` is inside a `try`; this one is not. `assertTerminalHandlerCoverage` cannot see it — it
derives promise-returning supervisor calls from the *chrome bootstrap*, and this root is inside
the supervisor.

Related: the detach comment (`:282-288`) says "Removing an observer from inside its own
notification is safe here." The removal is not inside the notification — `stop()` awaits
`killProcess` and `removeStateFile` first, so the observer runs several microtask turns after
`observe()` returned. The claim is true of a different code shape than the one written.

**Fix:** Guard the throw site, and give the root a handler that does not paint an error during
quit:

```js
// TheiaService.sys.mjs :186
this._quitObserverOff = PowerBrowserAPI.onQuitGranted(() =>
  this.stop().catch(err => this._fatal(`Shutdown failed after quit was granted: ${err.message}`))
);

// TheiaService.sys.mjs :289-292
if (this._quitObserverOff) {
  const off = this._quitObserverOff;
  this._quitObserverOff = null;
  try { off(); } catch { /* not registered; nothing to detach */ }
}
```

Note the reorder: nulling before calling makes a re-entrant `stop()` unable to double-detach even
if the call throws. Then correct the `:282-288` comment to describe the actual (post-await)
timing.

### WR-05: a rejected `_recoveryProbeLoop` leaves `_recoveryProbeActive === true`, so D-115's auto-dismiss dies silently and cannot be restarted

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1023-1032` (and the same shape at `:783`)

**Issue:**

```js
_startRecoveryProbe() {
  if (this._recoveryProbeActive) { return; }
  this._recoveryProbeActive = true;
  this._recoveryProbeLoop().catch(err => this.reportUnexpectedFailure(err));
}
```

If `_recoveryProbeLoop()` rejects (it awaits `_restart()`, which awaits `_reap()`,
`_spawnAndGate()` and `PowerBrowserAPI.sleep`), the flag is never cleared. `_startRecoveryProbe()`
then refuses to start a replacement forever, and `getState()`/the diagnostics layer have no row
for it either. The terminal handler is no help: the probe only runs inside an error state, so
`_errorShown` is true and `reportUnexpectedFailure`'s `_showError` early-returns — nothing is
painted and nothing is logged beyond the `_fatal` line. The user is left in an error state whose
auto-dismiss is dead, with no indication.

The probe's lifecycle is 01-12's whole subject, which puts this in scope.

**Fix:**

```js
this._recoveryProbeLoop().catch(err => {
  this._recoveryProbeActive = false;   // the flag must never outlive the loop it names
  this.reportUnexpectedFailure(err);
});
```

Apply the same shape at `:783` for `_healthLoop` (`this._healthy = false;` in the catch), and
consider a `probeActive` row in `getState()` so the diagnostics layer can show it.

## Info

### IN-01: `verify-shell-error-contract.mjs`'s fault plants are hand-kept, indentation-exact source literals

**File:** `scripts/verify-shell-error-contract.mjs:624-690`
**Issue:** Every `SOURCE_FAULTS` row mutates by exact string, e.g.
`"    this._hideError();\n    await this._restart();"` and
`"    if (recoverable) {\n      this._startRecoveryProbe();\n    }"`. These are expectations of
the tree's *formatting*, which CLAUDE.md's derive-and-compare rule is aimed at. They fail loudly
via the `mutated === original` check rather than silently, so this is not a soundness defect —
but a prettier run turns all five rows into a maintenance stop.
**Fix:** Take the same `ctx` approach `verify-start-path-recovery.mjs`'s new rows now use
(`fault.apply(original, { supervisorSrc, shellSrc })`) and derive the method and field names
from the tree, or anchor on a regex tolerant of whitespace.

### IN-02: `withTimeout` neither clears its timer nor cancels the losing scenario

**File:** `scripts/verify-shell-error-contract.mjs:808-818`
**Issue:** Three 20-second `setTimeout` handles are created and never cleared; only the explicit
`process.exit()` at the bottom keeps the process from lingering. More importantly, a timed-out
scenario is not cancelled — it keeps running and can `fail()` after the verdict has been formed,
producing a report that names a scenario the harness already gave up on.
**Fix:** `const t = setTimeout(...); await Promise.race([...]); clearTimeout(t);` and pass an
abort flag the scenario checks at its own await points.

### IN-03: `globalThis.ChromeUtils` is installed by `loadShippedSources` and never restored

**File:** `scripts/verify-shell-error-contract.mjs:314`
**Issue:** Three scenarios in one process share one global, each overwriting it before its own
`import()`. Correct today only because every supervisor module instance captures the API at
top-level evaluation. A supervisor that ever imported lazily would silently bind to a later
scenario's fake, and the failure would look like a code defect.
**Fix:** Save and restore around each load, or set it once from a per-scenario dispatch keyed on
the cache-busting tag.

### IN-04: the chrome bootstrap references `TheiaService` above its `const` declaration

**File:** `powerbrowser/shell/powerbrowser.js:107`, `:132`, declared at `:240`
**Issue:** Pre-existing, outside the diff. `powerbrowserShowError` and `powerbrowserRetry` are
installed on `window` at :102/:131 and close over a `const` in the same block scope declared at
:240. Unreachable today (both are only invoked after `TheiaService.start()` at :255), but the
TDZ `ReferenceError` would be thrown from inside the error-paint path — the one path that must
never throw, and the one WR-03 shows latches a guard before it.
**Fix:** Move the `ChromeUtils.importESModule(... TheiaService.sys.mjs)` above the
`window.powerbrowser*` assignments. Nothing in the SHELL-05 ordering contract depends on its
current position — only the `dump()` at :20 does.

### IN-05: `_hideError()` nulls `_failureDetails`, so a successful Retry erases the last failure's diagnostics entirely

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1101`
**Issue:** The diagnostics layer exists to keep what the user-facing sentence drops. Once
`retry()` clears the error state, `getFailureDetails()` returns `[]` and the diagnostics layer
renders only the steady-state rows. If the retry succeeds, the identifiers of the failure that
prompted it are unrecoverable from the UI. The ring buffer still has the `_fatal` line, so
nothing is lost from the log — but the rendered surface loses it.
**Fix:** Keep a `_lastFailureDetails` alongside, or have `_hideError()` prepend a
`["Last cleared failure", ...]` marker rather than nulling.

### IN-06: derivation E's window scan is a raw `\breturn\b` regex over source text

**File:** `scripts/verify-start-path-recovery.mjs:706`
**Issue:** `body.slice(windowStart, windowEnd).search(/\breturn\b/)` runs over comment-stripped
but otherwise raw source. `stripComments` (`:143-149`) deliberately does not strip trailing `//`
comments, so a trailing comment containing the bare word `return`, a string literal containing
it, or a legitimate `return` inside a nested arrow/callback placed in that window all produce a
false red. The window is currently two statements wide, so the risk is small — but a gate that
goes red on correct code is a gate that gets bypassed.
**Fix:** Either restrict the match to statement position (`/^\s*return\b/m`) or note the
limitation in the failure message so the reader knows to check for a nested function before
rearranging `start()`.

---

_Reviewed: 2026-08-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
