---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-31T00:00:00Z
depth: standard
files_reviewed: 43
files_reviewed_list:
  - inventory/brand-tokens.json
  - scripts/scan-brand-residue.mjs
  - scripts/rename-brand.mjs
  - scripts/check-internals-boundary.sh
  - scripts/rebase-upstream.sh
  - .github/workflows/rebase-upstream.yml
  - powerbrowser/shell/TheiaService.sys.mjs
  - theia/extensions/token-gate/src/node/powerbrowser-env.ts
  - theia/applications/browser/package.json
  - .mozconfig
  - patches/010-powerbrowser-identity.patch
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-platform.sh
  - powerbrowser/branding/dev/locales/en-US/brand.ftl
  - powerbrowser/branding/release/locales/en-US/brand.ftl
  - powerbrowser/branding/dev/locales/en-US/brand.properties
  - powerbrowser/branding/release/locales/en-US/brand.properties
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/release/configure.sh
  - powerbrowser/branding/dev/content/aboutDialog.css
  - powerbrowser/branding/release/content/aboutDialog.css
  - powerbrowser/powerbrowser.desktop
  - powerbrowser/powerbrowser-release.desktop
  - powerbrowser/endpoint-allowlist.json
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts
  - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
  - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx
  - scripts/verify-branding-identity.mjs
  - powerbrowser/INTERNAL-APIS.md
  - patches/020-powerbrowser-shell.patch
  - theia/extensions/tab-uris/src/browser/browser-window-command.ts
  - scripts/verify-gui01-window.mjs
  - scripts/verify-gui01-command.mjs
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
  - powerbrowser/shell/powerbrowser.js
  - powerbrowser/shell/moz.build
  - theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts
  - scripts/lib/firefox-bidi.mjs
  - scripts/verify-shell-error-copy.mjs
  - powerbrowser/shell/powerbrowser.css
  - scripts/verify-branding.mjs
  - scripts/verify-start-path-recovery.mjs
  - scripts/verify-shell-error-contract.mjs
findings:
  critical: 2
  warning: 13
  info: 13
  total: 28
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-31
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found

## Summary

End-of-phase review over the union of `key-files` from all 13 plan summaries. This report
replaces the 01-11/01-12-scoped one; every carried-forward finding below was re-verified against
the current tree, most of them by planting a mutant and running the check with a clean control.
The working tree was left untouched (`git status --porcelain` empty at the end of the run).

**The previous CR-01 is genuinely closed.** 01-13's guard is real and it is in the right place:
`retry()` returns on `_errorRecoverable !== true` *before* `_hideError()`, so a refused click no
longer erases `_failureDetails`; `_errorRecoverable` is written inside `_showError`'s
false-to-true latch and cleared at `_hideError`'s single site, so it cannot outlive or
misdescribe the painted state; the presentation half (`errorRetryButton.hidden = !recoverable`)
is a mirror, not the authority, and `powerbrowser.css` declares no `display` on
`#powerbrowser-error-retry`, so the `[hidden]` UA rule actually takes effect. The new
`unrecoverable-classification-refuses-the-retry-click` scenario drives `powerbrowserRetry()`
directly rather than through the button, carries four vacuity guards, asserts three separate
facts, and has a reverse-direction plant (`guard made unconditional`) that stops the fix
degrading into "refuse every Retry". All four `verify-shell-error-contract` scenarios and both
`--self-test` suites are green on the current tree, and only two rows were appended to
`verify-platform.sh`'s single registry — no sibling driver was created.

What this review found instead is that the phase's static gates are weaker than their own
documentation claims, in two places that are provably load-bearing:

1. `shell-error-copy-no-internals` — the check CLAUDE.md names as the enforcement of the
   user-facing-copy rule "by pattern, not by a list of banned strings" — passes on a supervisor
   that paints a raw exception message at the user. Proven with a control.
2. `scan-brand-residue.mjs`, the "permanent gate" wired into `rebase-upstream.sh` and the CI
   workflow specifically to catch an ESR rebase reintroducing a brand token, cannot see the
   rebased tree at all: it iterates `git ls-files` and `upstream/` is in `.gitignore`.

Both are BLOCKER-tier here because CLAUDE.md's Verification section makes check honesty a
correctness property of this repo, not a nicety.

The two warnings the previous review proved with working mutants (WR-01, WR-02) are both still
open and were re-proven, not copied. Five supervisor-lifecycle warnings carry forward unchanged,
and one new one (WR-06) is the same class arriving from a direction none of the new checks look
at.

## Critical Issues

### CR-01: `verify-shell-error-copy.mjs`'s `.message` escape hatch admits a raw exception string into the user-facing error layer — all three static analyzers stay green

**File:** `scripts/verify-shell-error-copy.mjs:189-197`; `powerbrowser/shell/TheiaService.sys.mjs:1036`

**Issue:**
Rule (4) is the only thing standing between an arbitrary string and `#powerbrowser-error-message`:

```js
for (const m of src.matchAll(/this\._showError\(\s*([^,]+?)\s*,/g)) {
  const arg = m[1].trim();
  if (!/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\.message)$/.test(arg)) { … }
}
```

The second alternative admits **any** `<identifier>.message`. Its inline comment claims that is
safe — "a result object's `.message` (which the checks above prove is one)" — but the checks
above prove only that `message:` **property declaration** sites are `USER_MESSAGE` entries. They
say nothing about the identifier at a `_showError` **call** site. `err.message` matches.

Reproduced, with a control. I replaced `reportUnexpectedFailure`'s painted sentence:

```js
// TheiaService.sys.mjs:1036, mutated
this._showError(err.message, /* recoverable */ true, [
  ["Failed step", "starting the interface"],
  ["Error", text],
]);
```

Copied to `<tmp>/TheiaService.sys.mjs` (same basename — see IN-07) and run against all three
static analyzers, alongside an unmutated copy at the same path as the control:

| check | unmutated control | raw-`err.message` plant |
|---|---|---|
| `verify-shell-error-copy` | GREEN | **GREEN** |
| `verify-start-path-recovery` | GREEN | **GREEN** |
| `verify-shell-error-contract` | GREEN | **GREEN** |

`reportUnexpectedFailure` is the ONE terminal handler for every fire-and-forget promise root in
the shell, so `err.message` there is a `Subprocess` internal message, an `IOUtils` path error, or
a raw `NS_ERROR_*` string — exactly the "raw exception message" CLAUDE.md forbids, painted
full-screen at a user who has already hit a failure. `_pushLog`'s token redaction does not apply:
that redaction runs on the ring buffer and on `_failureDetails`, not on the `message` argument
handed to `powerbrowserShowError` and dumped verbatim onto the `POWERBROWSER_SHELL_ERROR`
sentinel line (`powerbrowser.js:117`), so a rejection whose text happened to embed the per-launch
token would also reach that channel.

Note the current shipped tree is clean on merits — every real call site passes a
`USER_MESSAGE`-derived value. This is a gate defect, and the gate is the only thing that keeps it
that way.

**Fix:** Make rule (4) resolve the object rather than trust the property name. The
result-object shape is already derivable — every legal `.message` argument is a local whose
`message:` site rule (2) has already validated, so bind the two together:

```js
// scripts/verify-shell-error-copy.mjs
// Derive the set of local bindings whose object literal carries a validated `message:`.
const resultBindings = new Set();
for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{[\s\S]{0,600}?message:\s*USER_MESSAGE\./g)) {
  resultBindings.add(m[1]);
}
// ...and the parameter names of methods that RETURN such a literal, for `resolved`/`result`.

for (const m of src.matchAll(/this\._showError\(\s*([^,]+?)\s*,/g)) {
  callSites += 1;
  const arg = m[1].trim();
  const dotted = /^([A-Za-z_$][\w$]*)\.message$/.exec(arg);
  const ok = /^USER_MESSAGE\.[A-Za-z_$][\w$]*$/.test(arg)
    || (dotted && resultBindings.has(dotted[1]));
  if (!ok) {
    fail(
      `this._showError() is called with \`${arg}\` -- only a USER_MESSAGE entry, or a local whose ` +
      `own \`message:\` this file has already resolved to the table, may paint the error layer. ` +
      `\`err.message\` is a RAW EXCEPTION STRING and is the leak this check exists to stop.`
    );
  }
}
```

Then add the plant to `--self-test` so the row can be seen going red:
`s.replace("this._showError(USER_MESSAGE.couldNotStart,", "this._showError(err.message,")`,
expecting the output to mention `RAW EXCEPTION STRING`. Without that row the fix is untested by
the same standard the rest of this file already meets.

### CR-02: the residual-brand gate wired into `rebase-upstream.sh` and the CI workflow cannot see the rebased tree — it scans `git ls-files`, and `upstream/` is gitignored

**File:** `scripts/rebase-upstream.sh:92-111`; `.github/workflows/rebase-upstream.yml:37-45`;
`scripts/scan-brand-residue.mjs:255-273` (`scopeFiles`); `.gitignore:20`

**Issue:**
`rebase-upstream.sh:92-101` states the purpose in as many words:

> "It runs here because a rebase is the one routine operation that pulls in content nobody in
> this repo wrote, and a patch that replays cleanly can still reintroduce a stale brand string."

`scopeFiles` builds its file set from `execFileSync('git', ['ls-files', '-z'], { cwd: REPO_ROOT })`.
`.gitignore:20` is `upstream/`. Measured on the current tree:

```
git ls-files | grep -c '^upstream/'   ->  0
scopeFiles(inv).length                ->  109
files under upstream/ in that set     ->  0
```

So the post-replay invocation at `rebase-upstream.sh:108` re-scans exactly the same 109 tracked
files the CI workflow already scanned at step 1 (`.github/workflows/rebase-upstream.yml:44-45`),
before the clone. Of those 109, the only ones a rebase can touch are `patches/*.patch` (2 files),
and a rebase does not rewrite patches — it replays them. The gate is therefore a guaranteed no-op
relative to the reason it is invoked there, and it will report PASS on a rebased tree carrying
brand residue throughout `upstream/`.

This is the same failure class CLAUDE.md's Verification rule 1 names ("never assert on the
absence of a log line unless you have proven the code under test emits it"): the assertion is
green by construction, so it can never go red for its stated cause. It also makes
`docs`/CLAUDE.md's claim that "an upstream rebase that reintroduces a brand token fails there
rather than in a release" false as written.

**Fix:** Give the scanner a second, explicit root for the untracked tree, and make the rebase
script use it. Keep `git ls-files` for the repo's own scope (it is right there — an unstaged file
is a real trap) and add a filesystem walk for a caller-supplied root:

```js
// scripts/scan-brand-residue.mjs
export function scopeFiles(inv, { chainFiles = null, extraRoot = null } = {}) {
  // ...existing git ls-files branch...
  if (extraRoot) {
    // Walk extraRoot on the FILESYSTEM (it is deliberately outside the index),
    // applying the same scope.exclude / binary_extensions filters.
    files = files.concat(walkFiles(extraRoot).map(p => relative(REPO_ROOT, p)).filter(keep));
  }
  return files.sort();
}
```

```sh
# scripts/rebase-upstream.sh -- replace the bare invocation at :108
if ! node "$REPO_ROOT/scripts/scan-brand-residue.mjs" --extra-root "$UPSTREAM_DIR"; then
```

and give the scanner a `--self-test` row that plants a brand token in a scratch directory passed
as `--extra-root` and requires the scan to name that path. If walking a 5.6 GB Gecko checkout is
too slow for the CI budget, scope `--extra-root` to the directories the patch stack actually
touches (`browser/moz.configure`, `browser/moz.build`, `browser/config/`) and say so — but a
cheaper honest scan is still worth more than a full one that reads nothing. What must not stay is
an invocation whose comment claims a coverage it structurally does not have.

## Warnings

### WR-01: derivation C's "exactly ONE visibility owner" set equality is still defeated by any write that does not go through the derived local binding — re-proven on the current tree

**File:** `scripts/verify-start-path-recovery.mjs:446-459` (`deriveErrorLayerVisibilityWriters`),
`:410-437`, `:466-509`

**Issue:** Carried forward from the previous review and re-verified, not copied.
`deriveErrorLayerVisibilityWriters` scans for one syntactic form through one identifier:

```js
new RegExp(`\\b${binding}\\.style\\.display\\s*=`, "g")
```

The doc block at `:35-53` claims the rule "goes red on an ADDITION (a third function blanks the
layer, which is exactly the pre-01-11 source)". Re-tested against the current tree by adding one
line to `powerbrowserRetry` — precisely the pre-01-11 defect, spelled differently:

```js
window.powerbrowserRetry = function powerbrowserRetry() {
  document.getElementById("powerbrowser-error").style.display = "none";
  TheiaService.retry().catch(err => TheiaService.reportUnexpectedFailure(err));
};
```

`verify-start-path-recovery` exits 0. `errorElement.hidden = true`,
`errorElement.classList.add(...)`, `errorElement.style.setProperty("display","none")` and any
aliasing local are equally invisible. 01-13 did not change this surface.

**Fix:** Derive the element id alongside the binding — it is in the initialiser the binding
already comes from — and treat every route to it as a writer, keeping the set equality:

```js
function deriveErrorLayerBinding(shellSrc, api) {
  // ...existing derivation of `binding`...
  const id = shellSrc.match(
    new RegExp(`${binding}\\s*=\\s*document\\.getElementById\\(\\s*["']([^"']+)["']`)
  )?.[1];
  return { binding, id, via: fnName, reason: null };
}

// deriveErrorLayerVisibilityWriters: scan for ALL of
//   <binding>.style.display =   |   <binding>.hidden =
//   <binding>.classList.        |   <binding>.style.setProperty(
//   document.getElementById("<id>")  anywhere outside the binding's own initialiser
```

Any occurrence of the element id outside the one initialiser is a second route by definition.
Add a `--self-test` row planting the `document.getElementById(...)` form specifically — that is
the spelling proven green above.

### WR-02: the error layer's CLEAR path emits no deck state, so nothing observes that the layer actually became hidden — a `powerbrowserHideError` that SHOWS the layer is green in both analyzers

**File:** `powerbrowser/shell/powerbrowser.js:122-125`; `scripts/verify-shell-error-contract.mjs:443-448`, `:526-548`

**Issue:** Carried forward and re-proven. `powerbrowserShowError` calls `dumpDeckState("error")`
(`:119`) — the file's own comment (`:34-45`) calls computed style "the only assertion available
on Linux that observes the chrome document's rendered state at all". `powerbrowserHideError`
calls nothing. Every assertion about the cleared state anywhere in the tree is therefore an
assertion that a `dump()` executed, not that the layer moved.

Re-tested on the current tree, one character changed:

```js
window.powerbrowserHideError = function powerbrowserHideError() {
  errorElement.style.display = "flex";   // was "none"
  dump(`POWERBROWSER_SHELL_ERROR_CLEARED ${JSON.stringify({})}\n`);
};
```

`verify-start-path-recovery` exits 0 (derivation C asks WHO writes, never WHAT) and
`verify-shell-error-contract` exits 0 (the CLEARED sentinel still appears in the stream in the
right position, and `runRefusalScenario`'s absence assertion is likewise satisfied). The
user-visible result is an error layer pinned over a recovered, healthy Theia UI with
`_errorShown` reading false — the same two-owners-of-one-fact drift 01-11 removed, arriving from
the other side. The harness's own `getComputedStyle` fake (`:411`) already supports the
assertion; it is simply never read.

**Fix:** Two lines, and they also make WR-01's mutant fail:

```js
// powerbrowser.js
window.powerbrowserHideError = function powerbrowserHideError() {
  errorElement.style.display = "none";
  dump(`POWERBROWSER_SHELL_ERROR_CLEARED ${JSON.stringify({})}\n`);
  dumpDeckState("error-cleared");
};
```

```js
// verify-shell-error-contract.mjs, inside the stream walk:
// after each ERROR sentinel the matching deck state must report error !== "none";
// after each CLEARED sentinel it must report error === "none".
```

That turns the five presence assertions into five assertions about the fact they stand for.

### WR-03: `_showError` latches `_errorShown`/`_errorRecoverable` before the DOM call and starts the probe after it — a throwing paint leaves the guard set with nothing painted and no probe

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1131-1150` (mirror at `:1153-1162`)

**Issue:** Carried forward; re-read against the current tree and unchanged by 01-13, which added
a second field inside the same latch and so widened the window rather than narrowing it:

```js
this._errorShown = true;                                   // latched
this._errorRecoverable = recoverable === true;             // latched
this._failureDetails = (details || []).map(...);
this._pushLog(...);
this._browserElement.ownerDocument.defaultView.powerbrowserShowError({...});  // can throw
if (recoverable) { this._startRecoveryProbe(); }           // never reached if it throws
```

`defaultView` is null on a window being torn down, and `powerbrowserShowError` dereferences
module-scope bindings of its own plus `TheiaService.getFailureDetails()` (`powerbrowser.js:118`,
a TDZ site — see IN-04). If that call throws: the guard reads "an error is on screen" while
nothing is; `_startRecoveryProbe()` is skipped so D-115's auto-dismiss never starts;
`_errorRecoverable` reads `true` for a paint that never happened, so a later `powerbrowserRetry()`
is *admitted* by 01-13's guard against a state nobody can see; and the rejection reaches
`reportUnexpectedFailure`, whose own `_showError` early-returns on the latched guard and paints
nothing. The session ends on the loading layer with no message, no Retry and no Details.

**Fix:** Make the effect precede the latch:

```js
_showError(message, recoverable, details) {
  if (this._errorShown) { return; }
  this._failureDetails = (details || []).map(([label, value]) => { ... });
  this._pushLog(`Showing error state (recoverable=${recoverable}): ${message}`);
  if (recoverable) { this._startRecoveryProbe(); }   // before the DOM call, not after
  try {
    this._browserElement.ownerDocument.defaultView.powerbrowserShowError({ reason: message, recoverable });
  } catch (err) {
    this._failureDetails = null;
    this._stopRecoveryProbe();
    this._fatal(`Failed to paint the error layer: ${err.message}`);
    throw err;                                       // guard NOT latched; the backstop can still try
  }
  this._errorShown = true;
  this._errorRecoverable = recoverable === true;
}
```

`verify-start-path-recovery`'s derivation C requires only that the guard field is set true
somewhere in the body, so this reordering keeps that rule green.

### WR-04: the quit-observer callback is a fifth untracked fire-and-forget promise root, and `stop()`'s detach is the one unguarded throw site in the method

**File:** `powerbrowser/shell/TheiaService.sys.mjs:205`, `:301-311`, `:1004-1009`;
`powerbrowser/shell/PowerBrowserAPI.sys.mjs:311-315`

**Issue:** Carried forward, re-verified unchanged. `PowerBrowserAPI.onQuitGranted(() => this.stop())`
invokes an `async` method and discards the promise. `reportUnexpectedFailure`'s doc block
(`:1004-1009`) enumerates "Four entry points onto this supervisor [that] are fire-and-forget
promise roots … Every one of them routes here." This is a fifth and it does not, so that comment
is now factually wrong about its own file. `assertTerminalHandlerCoverage` cannot see it: it
derives promise-returning calls from the *chrome bootstrap*, and this root lives inside the
supervisor.

`stop()`'s detach compounds it. `this._quitObserverOff()` (`:309`) calls
`Services.obs.removeObserver`, which throws `NS_ERROR_FAILURE` for an observer that is not
currently registered. Every other statement in `stop()` is inside a `try`; this one is not, and it
runs after two awaits, so a throw there escapes an already-fire-and-forget root.

Related: the comment at `:301-307` says "Removing an observer from inside its own notification is
safe here." The removal is *not* inside the notification — `stop()` awaits `killProcess` and
`removeStateFile` first, so it runs several microtask turns after `observe()` returned. The claim
describes a different code shape than the one written.

**Fix:**

```js
// TheiaService.sys.mjs:205
this._quitObserverOff = PowerBrowserAPI.onQuitGranted(() =>
  this.stop().catch(err => this._fatal(`Shutdown failed after quit was granted: ${err.message}`))
);

// TheiaService.sys.mjs:308-311
if (this._quitObserverOff) {
  const off = this._quitObserverOff;
  this._quitObserverOff = null;          // null BEFORE calling, so a throw cannot double-detach
  try { off(); } catch { /* not registered; nothing to detach */ }
}
```

Note the arrow body changes shape, and `verify-start-path-recovery`'s derivation E locates the
registration with
`/PowerBrowserAPI\.(\w+)\(\s*\(\s*\)\s*=>\s*this\.(\w+)\(\s*\)\s*\)/` — a bare
`() => this.stop()`. Widen that regex in the same commit or derivation E goes red as
"registers no boundary callback of the shape …", which is a false red on a correct fix.

### WR-05: a rejected `_recoveryProbeLoop` leaves `_recoveryProbeActive === true`, so D-115's auto-dismiss dies silently and can never be restarted

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1063-1072`

**Issue:** Carried forward, unchanged by 01-13.

```js
_startRecoveryProbe() {
  if (this._recoveryProbeActive) { return; }
  this._recoveryProbeActive = true;
  this._recoveryProbeLoop().catch(err => this.reportUnexpectedFailure(err));
}
```

`_recoveryProbeLoop` awaits `_restart()`, which awaits `_reap()`, `_spawnAndGate()` and
`PowerBrowserAPI.sleep`, and `_restart()` can throw through `_showError` (WR-03). If it rejects the
flag is never cleared, `_startRecoveryProbe()` refuses a replacement for the life of the session,
and `getState()` has no row for it either. The terminal handler is no help: the probe only runs
inside an error state, so `_errorShown` is true and `reportUnexpectedFailure`'s `_showError`
early-returns. The user is left in an error state whose auto-dismiss is dead, with no indication.
01-13 made this more consequential, not less: for the unrecoverable class the probe is
deliberately not started at all, so the recoverable class's probe is now the *only* automatic
recovery path there is.

**Fix:**

```js
this._recoveryProbeLoop().catch(err => {
  this._recoveryProbeActive = false;   // the flag must never outlive the loop it names
  this.reportUnexpectedFailure(err);
});
```

Apply the same shape at `:802` for `_healthLoop` (`this._healthy = false;` in the catch — see
WR-06), and add a `probeActive` row to `getState()` so the diagnostics layer can render it.

### WR-06: a rejection under `_healthLoop` permanently ends steady-state supervision and leaves `getState().healthy` stale-true — the recovery probe restores the UI but never the loop

**File:** `powerbrowser/shell/TheiaService.sys.mjs:755`, `:762-805`, `:819-851`, `:332-339`;
`powerbrowser/shell/powerbrowser.js:203`

**Issue:** New. `_healthLoop()` is started exactly once, inside `_spawnAndGate`'s
`if (!this._swapped)` one-time block (`:802`), and its terminal handler only reports:

```js
this._healthLoop().catch(err => this.reportUnexpectedFailure(err));
```

Nothing restarts it. Two reachable rejection paths: `await this._restart()` at `:849` can throw
through `_showError`'s DOM call (WR-03), and `_swap()`'s `powerbrowserSwapToUrl` can throw on a
respawn. Once the loop is gone:

- `_healthy` was last set `true` at `:755` and is never revisited, so `getState().healthy` reports
  `true` forever. `powerbrowser.js:203` renders that verbatim as the diagnostics layer's
  `Health: healthy` row — a healthy verdict from a supervisor that stopped supervising.
- `reportUnexpectedFailure` paints `couldNotStart` with `recoverable: true`, which starts the
  recovery probe. When the probe's `_restart()` succeeds, `_spawnAndGate` takes the `else` branch
  (`_swapped` is already true) and logs `Recovered on port …` **without** restarting
  `_healthLoop`. So the user sees the error layer auto-dismiss onto a working UI, and the backend
  is unmonitored for the rest of the session — a crash after that point is never detected or
  restarted.

No registered check observes this: `shell-error-contract`'s scenarios all terminate in the error
state, and `start-path-recovery`'s derivations assert where `_healthLoop()` is *called*, never
that it survives.

**Fix:** Give the loop the same self-clearing catch WR-05 needs, and re-arm it on recovery:

```js
// _spawnAndGate's one-time block
this._startHealthLoop();

// new, replacing both raw call sites
_startHealthLoop() {
  if (this._healthLoopActive) { return; }
  this._healthLoopActive = true;
  this._healthLoop().catch(err => {
    this._healthLoopActive = false;
    this._healthy = false;              // never leave a stale healthy verdict behind
    this.reportUnexpectedFailure(err);
  });
}
```

and call `this._startHealthLoop();` from `_spawnAndGate`'s `else` (recovered) branch too, so a
respawn that lands after the loop died puts supervision back. Add `healthLoopActive` to
`getState()`, and add a `shell-error-contract` scenario that drives a `_healthLoop` rejection and
asserts `TheiaService.getState().healthy === false` afterwards — the one honest observation
available, since the flag is what the rendered surface reads.

### WR-07: `verify-branding-preflight.mjs`'s display-leak regex misses single-quoted literals, which is the dominant string form in the TypeScript sources it walks

**File:** `scripts/verify-branding-preflight.mjs:373-408`

**Issue:** New. Section 6's terminator class is `[ "<]`:

```js
const leak = new RegExp(`${exp.identifier_form}[ "<]`);
```

01-08 correctly replaced the hand-kept file list with a derived walk of
`theia/extensions/branding/src/browser/`. But every string literal in that directory is
single-quoted (`'Welcome'`, `'https://powerbrowser.org/'`, `'welcome'`), and `'` is not in the
class. So the derived walk reaches the file and the pattern declines to fire.

Reproduced against the real tree. I changed one line in the welcome widget:

```ts
this.title.label = 'PowerBrowser';   // was 'Welcome' -- this is the rendered tab label
```

`node scripts/verify-branding-preflight.mjs` → `PASS -- every hand-written branding literal
equals the inventory's declared target`. That is the identifier form rendered as user-visible
product identity, which is the exact defect class 01-07/01-08 closed on `<h3>` and left open on
every quoted string beside it. (Tree restored; `git status --porcelain` empty.)

**Fix:** Widen the terminator class to every character a string or expression can end on, and
keep the "continues into an identifier is legitimate" rule by excluding identifier characters
rather than enumerating terminators:

```js
// Legitimate uses (PowerBrowserAPI, PowerBrowserWelcomeWidget, PowerBrowserPrivilegedJs) all
// continue into an identifier character. Every illegitimate one ends. Assert the negative.
const leak = new RegExp(`${exp.identifier_form}(?![A-Za-z0-9_$])`);
```

That subsumes the current class and catches `'PowerBrowser'`, `` `PowerBrowser` ``,
`PowerBrowser}`, `PowerBrowser)` and end-of-line. Add a `--self-test` plant for the
single-quoted form specifically — the existing About-dialog plant uses `<h3>`, which the current
regex already catches, so it does not exercise this.

### WR-08: `check-internals-boundary.sh --catalogue` is coverage-only, not set equality, and a prose cross-reference satisfies coverage

**File:** `scripts/check-internals-boundary.sh:190-221`; `powerbrowser/INTERNAL-APIS.md:22-48`

**Issue:** New. `check_catalogue_consistency` derives every forbidden-pattern occurrence line from
`PowerBrowserAPI.sys.mjs` and requires each to have a matching row:

```sh
if ! grep -Eq "${escaped_base}:${line_no}([^0-9]|\$)" "$catalogue"; then
```

Two consequences the file's own "Consistency" section (`INTERNAL-APIS.md:56-65`) claims are
covered and are not:

1. **No staleness direction.** A touchpoint deleted from `PowerBrowserAPI.sys.mjs` leaves its
   catalogue row behind, and the check stays green. CLAUDE.md's rule is explicit that a check must
   "derive from the tree and compare … as set equality, so [it goes] red on an addition *and* a
   removal". This one is a subset test in one direction only. The reverse is what stops the
   catalogue accumulating threat notes for internals the boundary no longer touches — which is
   the whole reason the catalogue exists as the ESR-rebase audit surface.
2. **A prose mention counts as a row.** The `grep` runs over the whole file, so any
   `PowerBrowserAPI.sys.mjs:<n>` inside a Threat Notes cell satisfies coverage for line `n`.
   `INTERNAL-APIS.md:41` ("Same navigation row as `PowerBrowserAPI.sys.mjs:366` above"), `:44`
   ("See `PowerBrowserAPI.sys.mjs:526` below") and several others are exactly that shape. Today
   they happen to name lines that also have real rows; a future prose reference to a line that
   does not is an unnoticed uncatalogued touchpoint.

**Fix:** Parse rows structurally and compare both directions:

```sh
# One row = one table line whose second column is `<basename>:<line>`.
catalogue_rows() {
  awk -F'|' '/^\|/ { gsub(/[` ]/,"",$3); if ($3 ~ /:[0-9]+$/) print $3 }' "$1"
}

declared="$(catalogue_rows "$catalogue" | sed "s|^.*:|$base:|" | sort -u)"
observed="$(catalogue_occurrence_lines "$target" | sed "s|^|$base:|" | sort -u)"
comm -13 <(echo "$declared") <(echo "$observed")   # uncatalogued occurrences
comm -23 <(echo "$declared") <(echo "$observed")   # stale rows -- currently unchecked
```

Restricting the match to column 2 also closes the prose-satisfies-coverage hole. Add a
`--self-test` row that plants a stale row (a `file:line` with no occurrence) and requires it to go
red naming that row; the existing self-test only plants a removal.

### WR-09: `openBrowserWindow` hands a caller-supplied URL straight to `window.open` with no scheme check, and its failure message leads with the raw command id

**File:** `theia/extensions/tab-uris/src/browser/browser-window-command.ts:60-85`

**Issue:** New, two problems in eight lines.

```ts
commands.registerCommand(OPEN_BROWSER_WINDOW, {
    execute: (url?: string) => this.openBrowserWindow(url),
});
…
const opened = window.open(url ?? '', '_blank');
```

1. **No scheme validation.** `execute` is reachable from any code that can call
   `commandRegistry.executeCommand('powerbrowser.open-browser-window', <string>)` — which includes
   every installed VS Code extension running in Theia's plugin host, and (per plan 01-06) a
   per-tab escape action whose URL comes from a tab model. `window.open('javascript:…')` and
   `window.open('data:text/html,…')` both execute in the frontend's own `http://127.0.0.1:<port>`
   origin — the origin the token cookie authenticates, on a backend `INTERNAL-APIS.md:22` itself
   records as "an arbitrary-execution surface reachable the moment the page loads" (D-29). The
   whole point of GUI-01 is opening *stock browser chrome*; nothing about that requires accepting
   a script URL.
2. **Internal identifier leading a user-facing string.** The thrown message begins
   `` `${OPEN_BROWSER_WINDOW_COMMAND_ID}: …` `` and its "next step" is a developer instruction
   ("invoke the command directly from the command palette … rather than from a script or a delayed
   handler"). Theia surfaces a rejected command execution to the user. CLAUDE.md's copy rule —
   name the product, plain language, end on a real on-screen affordance — is not scoped to the
   Gecko shell, and this is a user-facing failure path in a reviewed file.

**Fix:**

```ts
const ALLOWED_SCHEMES = ['http:', 'https:', 'about:'];

protected openBrowserWindow(url?: string): void {
    const target = url ?? 'about:blank';
    let scheme: string;
    try {
        scheme = new URL(target, 'about:blank').protocol;
    } catch {
        throw new Error('Power Browser could not open that address because it is not a valid URL. Check the address and try again.');
    }
    if (!ALLOWED_SCHEMES.includes(scheme)) {
        throw new Error('Power Browser can only open web addresses in a browser window. Try an http:// or https:// address.');
    }
    if (!window.open(target, '_blank')) {
        throw new Error('Power Browser could not open a browser window. Choose "Open Browser Window" from the command palette again — opening one needs a keypress or a click.');
    }
}
```

`scripts/verify-gui01-command.mjs` derives the id and label from this file and is unaffected.

### WR-10: `firefox-bidi.mjs`'s `evaluate()` ignores BiDi's exception result shape, so every page-side throw surfaces as an opaque harness TypeError

**File:** `scripts/lib/firefox-bidi.mjs:352-359`

**Issue:** New.

```js
const evaluate = async expression => {
    const result = await client.send('script.evaluate', { expression, target: { context }, awaitPromise: true });
    return result.result.result.value;
};
```

WebDriver BiDi's `script.evaluate` returns either `EvaluateResultSuccess {type:"success", result,
realm}` or `EvaluateResultException {type:"exception", exceptionDetails, realm}`. The exception
form has no `result` key, so `result.result.result.value` throws
`TypeError: Cannot read properties of undefined (reading 'value')`.

This is not hypothetical for the checks in scope. `verify-branding.mjs:106-111`'s first
`evaluate` calls `__getByName(window.theia.container, 'PowerBrowserWelcomeViewContribution')`
with no in-page try/catch, and `__getByName` throws `DI binding not found for identifier name: …`
by design. An operator who breaks that binding sees the TypeError, not the message the harness
author wrote. `verify-gui01-command.mjs`'s `REGISTRY_READY` and `verify-gui01-window.mjs`'s
`evaluate('1 + 1')` are in the same position.

**Fix:**

```js
const evaluate = async expression => {
    const { result } = await client.send('script.evaluate', {
        expression, target: { context }, awaitPromise: true,
    });
    if (result.type === 'exception') {
        const d = result.exceptionDetails ?? {};
        throw new Error(
            `script.evaluate threw in the page: ${d.text ?? JSON.stringify(d)} ` +
            `(line ${d.lineNumber}, column ${d.columnNumber}) for expression: ${expression}`
        );
    }
    return result.result.value;
};
```

`waitFor` treats a throw as fatal rather than as falsy, which is correct — a genuinely throwing
predicate should not be polled 150 times before reporting a timeout.

### WR-11: the About dialog's repo link is a `role="button"` anchor with no keyboard activation handler

**File:** `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:36-43`

**Issue:** New.

```tsx
<a
    role='button'
    tabIndex={0}
    onClick={() => this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true })}>
    {POWERBROWSER_REPO_URL}
</a>
```

`tabIndex={0}` makes it reachable by Tab, but an `<a>` with no `href` has no default activation
behaviour: Enter and Space fire nothing, and `role="button"` promises the opposite. A keyboard
user can focus the only interactive element in the dialog and cannot operate it — WCAG 2.1.1
(Keyboard). The sibling welcome widget (`powerbrowser-welcome-widget.tsx:73`) gets this right with
a real `href` plus `preventDefault()` in the handler, so the two surfaces disagree on the same
affordance. `powerbrowser.css:208-213` records that this project already treats the keyboard path
on error/identity surfaces as a defect worth fixing.

**Fix:** Use the same shape as the welcome widget rather than a second mechanism:

```tsx
<a
    href={POWERBROWSER_REPO_URL}
    onClick={(e: React.SyntheticEvent) => {
        e.preventDefault();
        this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true });
    }}>
    {POWERBROWSER_REPO_URL}
</a>
```

`verify-branding.mjs:186-192` asserts the dialog contains no `eclipse-theia` anchor; adding an
`href` to our own URL does not affect it.

### WR-12: workspace trust is disabled in the shipped Theia application config, on a backend the project's own catalogue calls an arbitrary-execution surface

**File:** `theia/applications/browser/package.json:14-16`

**Issue:** New.

```json
"preferences": {
  "security.workspace.trust.enabled": false
}
```

Workspace trust is the upstream mechanism that withholds extension activation, task execution and
debug-adapter launch until the user vouches for a folder. `powerbrowser/INTERNAL-APIS.md:22`
records D-29 in the opposite direction: `@theia/ai-terminal`'s backend `ShellExecutionServer`
calls `spawn(command, [], { shell: true })` with **no permission logic**, "all approval machinery
is frontend-only", and "the sidecar's per-launch token gate … is the sole guard against reaching
that surface from off-host". The token gate is an *off-host* control. Workspace trust is the
*on-host* one, and this line removes it: opening an untrusted repository in Power Browser
activates its `.vscode` tasks and workspace-recommended extensions with no prompt.

There may be a deliberate decision behind this (a single-user local IDE with no untrusted-folder
story in v4.0), but it is not recorded in this file, in `INTERNAL-APIS.md`, or in CLAUDE.md, and
a security default silently inverted in a manifest is not a recorded decision.

**Fix:** Either restore the upstream default —

```json
"preferences": {
  "security.workspace.trust.enabled": true
}
```

— or, if it must stay off, record it the way every other threat disposition in this repo is
recorded: a row in `powerbrowser/endpoint-allowlist.json`'s sibling discipline or a named
`Deliberately not touched` entry in `powerbrowser/INTERNAL-APIS.md:50-54`, stating what replaces
it. An undocumented `false` is the shape that survives a rebase unexamined.

### WR-13: `readTokenFromStdin` busy-spins without bound on `EAGAIN`

**File:** `theia/extensions/token-gate/src/node/powerbrowser-env.ts:88-113`

**Issue:** New.

```ts
while (bytes.length <= 512) {
    try { count = fs.readSync(0, byte, 0, 1, null); }
    catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EAGAIN') { continue; }
        return undefined;
    }
    …
}
```

`continue` on `EAGAIN` does not advance `bytes.length`, so the loop condition never changes: a
non-blocking fd 0 produces an unbounded 100%-CPU spin at module load, before the HTTP server
binds. The comment argues "the supervisor's own startup timeout bounds the wait either way" —
that bounds when the *supervisor* gives up, not when this process stops spinning; the supervisor's
`_reap()` is what eventually kills it, up to 90 s later (`powerbrowser.sidecar.startupTimeoutMs`
default). The three unsupervised callers (`yarn start`, `scripts/smoke-theia.sh`,
`verify-platform.sh`'s `start_backend`) never enter this branch, so it would surface only under
the supervisor, as an unexplained slow start.

Separately, `bytes.length <= 512` accepts 513 bytes before giving up; the token is a 36-character
UUID.

**Fix:** Bound the retries and sleep between them:

```ts
const DEADLINE = Date.now() + 30_000;
…
if ((err as NodeJS.ErrnoException).code === 'EAGAIN') {
    if (Date.now() > DEADLINE) { return undefined; }   // fails the gate closed
    try { fs.readSync(0, byte, 0, 0, null); } catch { /* yield */ }
    continue;
}
```

or, simpler and preferable, set the fd blocking once up front rather than retrying per byte. Use
`bytes.length < 512` for the length bound.

## Info

### IN-01: `verify-shell-error-contract.mjs`'s older fault plants are hand-kept, indentation-exact source literals

**File:** `scripts/verify-shell-error-contract.mjs:846-914`
**Issue:** Five of the nine `SOURCE_FAULTS` rows still mutate by exact string with exact leading
whitespace, e.g. `"    this._hideError();\n    await this._restart();"` and
`"    if (recoverable) {\n      this._startRecoveryProbe();\n    }"`. 01-13's own two new rows
correctly moved to shape-matching regexes (`RETRY_GUARD_RE`, `RETRY_GUARD_ORDER_RE`) with a
comment explaining exactly why — the older rows did not follow. They fail loudly via the
`mutated === original` check rather than silently, so this is not a soundness defect, but a
formatting pass turns five rows into a maintenance stop.
**Fix:** Convert the remaining five to the same shape-matching regex form the 01-13 rows use.

### IN-02: `withTimeout` neither clears its timer nor cancels the losing scenario

**File:** `scripts/verify-shell-error-contract.mjs:1082-1099`
**Issue:** Four 20-second `setTimeout` handles are created and never cleared; only the explicit
`process.exit()` at the bottom stops the process lingering. More importantly a timed-out scenario
is not cancelled — it keeps running and can `fail()` after the verdict has been formed, producing
a report that names a scenario the harness already gave up on.
**Fix:** `const t = setTimeout(...); await Promise.race([...]); clearTimeout(t);` and pass an
abort flag the scenario checks at its own await points.

### IN-03: `globalThis.ChromeUtils` is installed by `loadShippedSources` and never restored

**File:** `scripts/verify-shell-error-contract.mjs:370`
**Issue:** Four scenarios in one process now share one global, each overwriting it before its own
`import()`. Correct only because every supervisor module instance captures the API at top-level
evaluation. A supervisor that ever imported lazily would silently bind to a later scenario's fake,
and the failure would look like a code defect.
**Fix:** Save and restore around each load, or set it once from a per-scenario dispatch keyed on
the cache-busting tag.

### IN-04: the chrome bootstrap references `TheiaService` above its `const` declaration, from inside the error-paint path

**File:** `powerbrowser/shell/powerbrowser.js:118`, `:143`, `:164-165`, `:208`; declared at `:251`
**Issue:** Pre-existing. `powerbrowserShowError`, `powerbrowserRetry` and
`powerbrowserShowDiagnostics` are installed on `window` at `:102`/`:142`/`:163` and close over a
`const` declared at `:251`. Unreachable today (all are invoked only after `TheiaService.start()`
at `:266`), but the TDZ `ReferenceError` would be thrown from inside `powerbrowserShowError` —
the one path that must never throw, and the path WR-03 shows latches a guard before it.
**Fix:** Move the `ChromeUtils.importESModule(... TheiaService.sys.mjs)` above the
`window.powerbrowser*` assignments. Nothing in the SHELL-05 ordering contract depends on its
current position — only the `dump()` at `:20` does.

### IN-05: `_hideError()` nulls `_failureDetails`, so a *successful* Retry still erases the failure's diagnostics

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1158`
**Issue:** 01-13 fixed the refused-click half of this. The admitted half remains: once a Retry
that the supervisor allows through clears the error state, `getFailureDetails()` returns `[]` and
the diagnostics layer renders only the steady-state rows. If the retry succeeds, the identifiers
of the failure that prompted it are unrecoverable from the UI. The ring buffer still has the
`_fatal` line, so nothing is lost from the log — but the rendered surface loses it.
**Fix:** Keep a `_lastFailureDetails` alongside, or have `_hideError()` prepend a
`["Last cleared failure", …]` marker rather than nulling.

### IN-06: derivation E's window scan is a raw `\breturn\b` regex over source text

**File:** `scripts/verify-start-path-recovery.mjs:623`, `:706`
**Issue:** `body.slice(windowStart, windowEnd).search(/\breturn\b/)` runs over comment-stripped
but otherwise raw source. `stripComments` (`:143-149`) deliberately does not strip trailing `//`
comments, so a trailing comment containing the bare word `return`, a string literal containing it,
or a legitimate `return` inside a nested arrow placed in that window all produce a false red. The
window is currently ~30 lines wide, so the risk is small — but a gate that goes red on correct
code is a gate that gets bypassed.
**Fix:** Restrict the match to statement position (`/^\s*return\b/m`) or name the limitation in
the failure message.

### IN-07: `--file <path>` silently poisons `verify-start-path-recovery` for any basename other than `TheiaService.sys.mjs`

**File:** `scripts/verify-start-path-recovery.mjs:275-293`, `:771`
**Issue:** Found while reviewing. `assertTerminalHandlerCoverage` derives the bootstrap's import
statement from the supervisor's own *basename*
(`deriveSupervisorBinding(shellSrc, basename(supervisorPath))`), so pointing `--file` at a copy
named anything else always fails with "could not find the chrome bootstrap's
`ChromeUtils.importESModule(... <name>)` statement". Every other assertion in the run is then
noise. The `--self-test` is unaffected (it writes to `TheiaService.sys.mjs` in its temp dir), but
an operator bisecting by hand gets a red that has nothing to do with their mutation — I hit this
myself and briefly mis-scored a plant because of it.
**Fix:** Fall back to matching any `ChromeUtils.importESModule` whose URL ends in `.sys.mjs` and
whose destructured binding is called on an `async` method of the supervisor, or emit a distinct
message naming the basename mismatch as the cause rather than as a bootstrap defect.

### IN-08: `verify-gui01-command.mjs` derives the label from the file's *first* `label:` occurrence

**File:** `scripts/verify-gui01-command.mjs:73`
**Issue:** `/label:\s*'([^']+)'/.exec(text)` takes the first match anywhere in
`browser-window-command.ts`. Correct today because there is exactly one `Command` in the file;
plan 01-06 adds a second affordance ("Open in browser window", explicitly a different label per
`:16-21`), and if it lands in this file the check silently starts asserting the wrong string.
**Fix:** Anchor the label to the same declaration the id comes from:
`/OPEN_BROWSER_WINDOW[^=]*=\s*\{[\s\S]*?label:\s*'([^']+)'/`.

### IN-09: `scopeFiles` excludes by unanchored `startsWith`

**File:** `scripts/scan-brand-residue.mjs:262-264`
**Issue:** `!exclude.some((x) => p === x || p.startsWith(x))` treats every exclude entry as a raw
prefix. The current list is safe (`".planning/"`, `"inventory/"` end in `/`; the two script paths
are exact), but an entry like `"docs"` would silently exclude `docsomething.md`, and an entry
like `"scripts/scan"` would exclude every future `scripts/scan-*.mjs`. On a permanent gate, an
over-broad exclusion is invisible.
**Fix:** `p === x || p.startsWith(x.endsWith('/') ? x : `${x}/`)`.

### IN-10: `_spawnAndGate` can write the state file after `stop()` has already removed it

**File:** `powerbrowser/shell/TheiaService.sys.mjs:617-625`, `:721-735`; `:292-299`
**Issue:** `_spawnAndGate` checks `_shuttingDown` immediately after spawn and never again before
`writeStateFile` at `:723`, which sits behind two awaits (`readProcessStartTicks`, then the write
itself). A `stop()` racing those awaits runs its own `removeStateFile` first, so the launch leaves
a state file naming a pid `stop()` just killed. Harmless in practice — the next launch's
`_reapLeftover` finds the pid gone and removes the stale file, and D-111's tick check blocks a
signal if the pid was recycled — but it defeats D-110's stated invariant that "a normal quit
followed by a normal start signals nothing".
**Fix:** Re-check `if (this._shuttingDown) { return …; }` immediately before the `writeStateFile`
call, or have `stop()` await `_restartInFlight` settling before its removal.

### IN-11: `_reapLeftover` passes an unvalidated `record.pid` to `kill(2)`

**File:** `powerbrowser/shell/TheiaService.sys.mjs:443-449`; `powerbrowser/shell/PowerBrowserAPI.sys.mjs:453-469`
**Issue:** The only validation is `typeof record.pid !== "number"`. `record` comes from a JSON
file under `$XDG_CONFIG_HOME/powerbrowser/`, and `kill(0, sig)` targets the caller's whole process
group while `kill(-1, sig)` targets every process the user can signal. Today this cannot escalate:
the liveness probe uses signal 0, and `readProcessStartTicks(0 | -1)` reads a `/proc/<pid>/stat`
that does not exist, resolves `null`, and the tick mismatch returns before `SIGTERM`. So the
defense is one derived value away rather than a guard.
**Fix:** One line, at the top of `_reapLeftover`:
`if (!Number.isInteger(record.pid) || record.pid <= 1) { await this._removeStateFileQuietly(); return; }`

### IN-12: the preflight's anti-tautology cross-check covers only `brandFullName`

**File:** `scripts/verify-branding-preflight.mjs:271-300`; `scripts/verify-branding-identity.mjs:126-143`
**Issue:** Section 4 exists to stop `verify-branding-identity.mjs`'s hand-written `VARIANTS`
descriptor agreeing with a wrongly-renamed tree. It reads one field per variant
(`brandFullName`) plus the machine vendor. The descriptor also pins `bin`, `desktop`,
`configStatus`, `brandFtl` and `brandProperties` paths, all of which the inventory declares
(`objdir`, `desktop_entry`, `branding_dir`, `app_basename`) and none of which are compared. A
rename pass that rewrote a path in both places would still agree with itself.
**Fix:** Compare every descriptor field that has an inventory counterpart, in the same loop.

### IN-13: the desktop entries hardcode an absolute developer path

**File:** `powerbrowser/powerbrowser.desktop:3-4`; `powerbrowser/powerbrowser-release.desktop:3-4`
**Issue:** `Exec=/home/chris/coding/Power-Browser/objdir/dist/bin/powerbrowser %u` and the
matching `Icon=` are checked in verbatim, and the preflight asserts them against the inventory's
own `repo_root: "/home/chris/coding/Power-Browser"`. That is internally consistent and is the
right call for Phase 1's no-generator rule, but it means the two files are unusable on any other
machine and the inventory carries one contributor's home directory as a checked expectation.
**Fix:** No change in Phase 1 — the literal is the point. Record it as an explicit Phase 2 input
so `configuration.toml` supplies `repo_root` rather than the inventory, and so the byte-identical
acceptance test knows this is a machine-scoped value rather than a brand one.

---

_Reviewed: 2026-08-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
