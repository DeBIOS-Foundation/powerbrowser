---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-31T19:20:59Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - .github/workflows/rebase-upstream.yml
  - .mozconfig
  - CLAUDE.md
  - docs/BUILD.md
  - docs/CUSTOMIZE.md
  - docs/URI-SCHEMES.md
  - inventory/brand-tokens.json
  - patches/010-powerbrowser-identity.patch
  - patches/020-powerbrowser-shell.patch
  - powerbrowser/INTERNAL-APIS.md
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/dev/content/aboutDialog.css
  - powerbrowser/branding/dev/locales/en-US/brand.ftl
  - powerbrowser/branding/dev/locales/en-US/brand.properties
  - powerbrowser/branding/mark.svg
  - powerbrowser/branding/release/configure.sh
  - powerbrowser/branding/release/content/aboutDialog.css
  - powerbrowser/branding/release/locales/en-US/brand.ftl
  - powerbrowser/branding/release/locales/en-US/brand.properties
  - powerbrowser/endpoint-allowlist.json
  - powerbrowser/powerbrowser-release.desktop
  - powerbrowser/powerbrowser.desktop
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
  - powerbrowser/shell/TheiaService.sys.mjs
  - powerbrowser/shell/moz.build
  - powerbrowser/shell/powerbrowser.css
  - powerbrowser/shell/powerbrowser.js
  - scripts/check-internals-boundary.sh
  - scripts/lib/firefox-bidi.mjs
  - scripts/rebase-upstream.sh
  - scripts/rename-brand.mjs
  - scripts/scan-brand-residue.mjs
  - scripts/verify-branding-identity.mjs
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-branding.mjs
  - scripts/verify-gui01-command.mjs
  - scripts/verify-gui01-window.mjs
  - scripts/verify-platform.sh
  - scripts/verify-shell-error-copy.mjs
  - scripts/verify-start-path-recovery.mjs
  - theia/applications/browser/package.json
  - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts
  - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
  - theia/extensions/tab-uris/src/browser/browser-window-command.ts
  - theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts
  - theia/extensions/token-gate/src/node/powerbrowser-env.ts
findings:
  critical: 3
  warning: 14
  info: 6
  total: 23
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-31T19:20:59Z
**Depth:** standard
**Files Reviewed:** 47
**Status:** issues_found

## Summary

The supervisor (`TheiaService.sys.mjs`), the anti-corruption boundary
(`PowerBrowserAPI.sys.mjs`), the chrome bootstrap (`powerbrowser.js`), and the
verification harness were read in full. The branding literals, patches, desktop
entries, docs, and the workflow were read and cross-checked against
`inventory/brand-tokens.json`. `scripts/verify-platform.sh --quick` was run: all
22 registered quick checks are green, and every self-test row goes red on its
plant. The static gates work.

They do not, however, cover the thing that is actually broken. Phases 01-09 and
01-10 removed two ways for a launch to strand the user on the branded loading
layer with no message, no Retry, and no Details. **A third, deterministic route
to that same outcome is still present and is reached by the most obvious user
action available in the error state: clicking Retry.** Two further defects sit
on the same seam — the recovery probe is started on failure paths whose state
`start()` deliberately never initialised, producing an unbounded spawn loop and,
on one path, a backend with no quit observer.

Three findings are classified BLOCKER. The remaining fourteen WARNINGs are
concentrated in state-machine coupling in the supervisor, harness process
hygiene, and hardcoded developer-machine paths checked into a repo whose stated
purpose is rebrandability.

The verification registry is genuinely strong — derivation-not-expectation-list,
non-vacuity assertions, planted-fault self-tests. The gap is not in check
quality; it is that no check observes the DOM-vs-supervisor state agreement that
CR-01 breaks, because both the sentinel stream and the supervisor's own accessors
report the state the supervisor *believes* it is in.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Clicking Retry permanently destroys the error layer — the user is stranded with no message, no Retry, and no Details

**File:** `powerbrowser/shell/powerbrowser.js:121-124`, `powerbrowser/shell/TheiaService.sys.mjs:899-901`, `powerbrowser/shell/TheiaService.sys.mjs:1000-1012`

**Issue:**
`powerbrowserRetry()` hides the error layer by writing the DOM directly:

```js
window.powerbrowserRetry = function powerbrowserRetry() {
  errorElement.style.display = "none";          // DOM hidden
  TheiaService.retry().catch(err => TheiaService.reportUnexpectedFailure(err));
};
```

It never tells the supervisor. `TheiaService._errorShown` stays `true`, and
`_hideError()` — the only place `_errorShown` is ever reset — is called from
exactly one site, `_restart()`'s **success** path (line 854).

So on every Retry that does not succeed:

1. The DOM error layer is hidden by the click handler.
2. `retry()` → `_restart()` fails → `_showError(...)` → line 1001
   `if (this._errorShown) { return; }` → **early return, the layer never
   repaints.**

The user is left looking at `#powerbrowser-loading` (a bare dark screen) with no
message, no Retry control, and no Details control. That is byte-for-byte the
user-visible outcome 01-09 and 01-10 were written to eliminate
(01-VERIFICATION.md's FAILED must-have), reintroduced by a different route.

A second, worse variant: if the background recovery probe is mid-attempt when
Retry is clicked, `_restart()` returns immediately on the `_restartInFlight`
guard, so the click accomplishes nothing at all *and* still hid the layer.

`_startRecoveryProbe()` is idempotent, so the probe keeps running and may
eventually recover on its own — but only after N × `recoveryProbeIntervalMs`
(default 15 000 ms) with zero feedback and no way for the user to act. The
supervisor's own sentinel stream and `getFailureDetails()` both report the state
the supervisor believes it is in, which is why no registered check sees this.

**Fix:** the DOM must not be written from the bootstrap. Route the hide through
the supervisor so `_errorShown`, the recovery probe, and the DOM move as one
fact:

```js
// TheiaService.sys.mjs
async retry() {
  // Clears _errorShown, stops the background probe, and hides the layer
  // through the same window global _showError paints with, so a Retry that
  // fails can repaint. Without this the _errorShown guard in _showError()
  // swallows every subsequent paint for the life of the session.
  this._hideError();
  await this._restart();
},
```

```js
// powerbrowser.js
window.powerbrowserRetry = function powerbrowserRetry() {
  TheiaService.retry().catch(err => TheiaService.reportUnexpectedFailure(err));
};
```

Add a runtime row asserting that a failing Retry emits a **second**
`POWERBROWSER_SHELL_ERROR` sentinel (and a `POWERBROWSER_SHELL_ERROR_CLEARED`
between the two). The existing `shell03-budget-exhausted-error` row only ever
observes the first one, which is why this shipped green.

---

### CR-02: `_showError` starts the recovery probe on paths `start()` abandoned, driving an unbounded spawn loop against never-initialised state

**File:** `powerbrowser/shell/TheiaService.sys.mjs:134-142`, `powerbrowser/shell/TheiaService.sys.mjs:1011`, `powerbrowser/shell/TheiaService.sys.mjs:955-975`

**Issue:**
`start()`'s `_resolveSidecar()` failure branch returns at line 142, **before**
`this._configDir` (144), `this._stateFilePath` (176), and the quit observer (181)
are ever assigned. Its own comment states the intent explicitly:

> D-113: backendMain unset/missing and an unresolvable Node ... unrecoverable by
> construction, straight to the error state with **no retry at all**.

But `_showError()` unconditionally calls `_startRecoveryProbe()` at line 1011.
Fifteen seconds later `_recoveryProbeLoop` calls `_restart()`, which calls
`_spawnAndGate(true)` on a supervisor whose fields were never resolved:

- `this._backendMain` is `""` → `args[0]` is the empty string.
- `this._nodePath` is `null` (the `nodeMissing` class) → `Subprocess.call({command: null})`.
- `this._stateFilePath` is `null` → `IOUtils.writeJSON(null, ...)`.

In the `interfaceFilesMissing` class (backendMain unset, Node resolvable) the
spawn *succeeds* as a process: it runs `node "" --hostname 127.0.0.1 --port 0`,
which exits immediately. `_pumpOutput` rejects, the failure is classified
**recoverable**, and `_restart()` burns the full `giveUpAttempts` budget (6) with
exponential backoff — then `_showError` early-returns on the `_errorShown` guard,
the probe sleeps 15 s, and the whole cycle repeats **for the lifetime of the
browser session**. Every one of those attempts forks a process.

**Fix:** gate the probe on recoverability, and refuse to enter the spawn path
before resolution completed.

```js
_showError(message, recoverable, details) {
  if (this._errorShown) { return; }
  this._errorShown = true;
  this._failureDetails = /* ... unchanged ... */;
  this._pushLog(`Showing error state (recoverable=${recoverable}): ${message}`);
  this._browserElement.ownerDocument.defaultView.powerbrowserShowError({ reason: message, recoverable });
  // D-113: an unrecoverable resolve failure has nothing to probe for -- the
  // sidecar was never resolved, so _restart() would spawn against unset
  // fields. D-112's pinned-port squatter is the one unrecoverable class that
  // CAN self-heal; give it its own explicit opt-in rather than probing every
  // unrecoverable failure.
  if (recoverable || this._sidecarResolved) {
    this._startRecoveryProbe();
  }
},
```

Set `this._sidecarResolved = true` immediately after `_resolveSidecar()` returns
`ok`, and add an early return at the top of `_restart()`:

```js
if (!this._sidecarResolved) {
  this._pushLog("Refusing to spawn: the sidecar was never resolved for this launch.");
  return;
}
```

---

### CR-03: A backend can be brought up with no `quit-application-granted` observer, so it is never stopped on quit and leaves no state file

**File:** `powerbrowser/shell/TheiaService.sys.mjs:153-181`

**Issue:**
`PowerBrowserAPI.onQuitGranted(() => this.stop())` is registered at line 181 —
*after* the `ensureDirectory` try/catch that `return`s on failure (line 167).

That failure is classified `recoverable: true`, so `_showError` starts the
recovery probe (CR-02's mechanism), which calls `_restart()` → `_spawnAndGate()`.
Nothing in `_spawnAndGate` requires `_configDir` to exist — it is only passed as
the `THEIA_CONFIG_DIR` environment variable, and Theia creates it or tolerates
its absence. So the spawn can genuinely succeed, pass the health gate, set the
cookie, and swap.

The result is a live, healthy, supervised backend on a launch where:

- **no quit observer is registered**, so `stop()` never runs on browser quit;
- `this._stateFilePath` is `null`, so `writeStateFile(null, ...)` throws (caught
  and logged non-fatally at line 673) and no crash-leftover record exists for the
  next launch's `_reapLeftover()`.

The parent-death watchdog (`POWERBROWSER_SUPERVISED=1` + stdin EOF) is the only
thing left preventing an orphan, i.e. the belt is gone and only the braces
remain — on the exact failure class SIDE-04 exists for.

**Fix:** register the quit observer before any path that can return, and derive
the state file path before it too.

```js
    this._configDir = this._resolveConfigDir();
    this._stateFilePath = `${this._configDir}/sidecar-state-${this._profileStateKey()}.json`;
    // D-105: registered BEFORE the first early-returning step. Any path that
    // can end up with a spawned backend -- including the recovery probe
    // re-entering after ensureDirectory failed -- must be covered, or quit
    // leaves it running.
    PowerBrowserAPI.onQuitGranted(() => this.stop());

    try {
      await PowerBrowserAPI.ensureDirectory(this._configDir);
    } catch (err) {
      /* ... unchanged ... */
      return;
    }
```

Also keep the unregister function `onQuitGranted` returns (currently discarded)
so `stop()` can detach it.

---

## Warnings

### WR-01: `_showError`'s idempotency guard silently drops a *different* failure's message, recoverability, and diagnostics rows

**File:** `powerbrowser/shell/TheiaService.sys.mjs:1000-1008`

**Issue:** The guard is documented as covering "repeated calls for the same
state", but it is keyed on nothing about the state — only on "an error is
showing". A launch that first fails with a recoverable health-gate timeout
(`didNotFinishStarting`) and later, on a subsequent attempt, hits an
unrecoverable spawn failure (`couldNotStart`, `recoverable: false`) keeps
painting the *first* sentence and the *first* `_failureDetails` rows forever.
The diagnostics layer, the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel, and the
Retry affordance all then describe a failure that is no longer the current one.

**Fix:** compare before short-circuiting, and repaint on change:

```js
_showError(message, recoverable, details) {
  const next = JSON.stringify({ message, recoverable, details });
  if (this._errorShown && this._errorSignature === next) { return; }
  this._errorSignature = next;
  this._errorShown = true;
  // ...
}
```

### WR-02: `_profileStateKey()` produces an unbounded, non-injective filename component

**File:** `powerbrowser/shell/TheiaService.sys.mjs:363-366`

**Issue:** `profileDir.replace(/[^a-zA-Z0-9]+/g, "_")` embeds the *entire*
absolute ProfD path into the state file's name. Two failure modes:

1. **Length.** A profile under a long `TMPDIR` or a deeply nested path exceeds
   `NAME_MAX` (255 bytes) once `sidecar-state-` and `.json` are added.
   `writeStateFile` then throws, is caught non-fatally at line 673, and SIDE-04's
   crash-leftover reaping silently stops working for that profile — the exact
   degradation the try/catch's comment predicts, with no bound preventing it.
2. **Collisions.** The sanitization is not injective: `/tmp/a-b` and `/tmp/a/b`
   both map to `tmp_a_b`. Two instances under colliding profile paths share one
   state file, which reintroduces CR-01 from `05-REVIEW.md` — the second
   instance's startup reap verify-and-SIGTERMs the first's live backend.

**Fix:** hash instead of transliterate, and keep a short readable prefix.

```js
_profileStateKey() {
  const profileDir = PowerBrowserAPI.getProfileDir();
  if (!profileDir) { return "default"; }
  // Bounded and injective. The raw path is not a filename component: it has
  // no length bound and its sanitization collides (/a-b and /a/b both become
  // a_b), which is the shared-state-file bug CR-01 (05-REVIEW.md) fixed.
  const digest = PowerBrowserAPI.sha256Hex(profileDir);   // add to the boundary
  return `${profileDir.replace(/[^a-zA-Z0-9]+/g, "_").slice(-40)}-${digest.slice(0, 16)}`;
}
```

`scripts/verify-platform.sh`'s `profile_state_key()` (line 709) mirrors this
byte-for-byte and must be updated in the same commit.

### WR-03: `readTokenFromStdin` busy-spins with no backoff and no bound on `EAGAIN`

**File:** `theia/extensions/token-gate/src/node/powerbrowser-env.ts:91-103`

**Issue:** The `EAGAIN` branch `continue`s without sleeping and without
incrementing anything (`bytes.length` is unchanged because nothing was read). If
fd 0 is non-blocking and no data ever arrives, this spins a CPU core at 100% for
the entire startup-timeout window with nothing logged. The comment ("Retry
rather than fail: the supervisor's own startup timeout bounds the wait either
way") describes the *supervisor's* bound, not this loop's — this loop is
genuinely unbounded from inside the backend process.

**Fix:** bound the spin and yield between attempts.

```ts
const deadline = Date.now() + 30_000;
// ...
if ((err as NodeJS.ErrnoException).code === 'EAGAIN') {
    if (Date.now() > deadline) { return undefined; }
    // Yield rather than spin: a bare `continue` here pegs a core for the
    // whole startup-timeout window with nothing logged.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
    continue;
}
```

### WR-04: An empty stdin line yields an empty-string token, indistinguishable from a real one at this layer

**File:** `theia/extensions/token-gate/src/node/powerbrowser-env.ts:107-109`

**Issue:** `if (byte[0] === 0x0a) { return Buffer.from(bytes).toString('utf8'); }`
returns `""` when the very first byte is a newline. `captured.POWERBROWSER_TOKEN`
is then `""` rather than `undefined`, so the fail-closed decision downstream is
made on a value that *is present but empty*. The module's own contract is that
`undefined` fails the gate closed; `""` is a third state it does not model.

**Fix:**

```ts
if (byte[0] === 0x0a) {
    // An empty line is not a credential. Return undefined so the gate takes
    // the same fail-closed path a missing line takes -- "" is a third state
    // this module's contract does not model.
    return bytes.length > 0 ? Buffer.from(bytes).toString('utf8') : undefined;
}
```

### WR-05: `TheiaService` is referenced in the bootstrap 124 lines before its `const` declaration (TDZ hazard)

**File:** `powerbrowser/shell/powerbrowser.js:107`, `:123`, declared at `:231`

**Issue:** `powerbrowserShowError` (107) and `powerbrowserRetry` (123) both close
over `TheiaService`, declared with `const` at line 231 in the same block. This is
safe today only because nothing invokes those globals before the handler reaches
231. Any future reordering — an early `_showError` from a synchronous failure, a
listener that fires during bootstrap — throws `ReferenceError: Cannot access
'TheiaService' before initialization` **inside the error-painting path**, which
is the one path that must never itself fail.

**Fix:** hoist the `ChromeUtils.importESModule` for `TheiaService` to sit
alongside the `PowerBrowserAPI` import at line 22, before any global that uses it
is defined.

### WR-06: `captureScreenshot`'s SIGINT handler force-exits — the exact pattern CR-03 removed from its sibling

**File:** `scripts/lib/firefox-bidi.mjs:207-209`

**Issue:**

```js
sigintHandler = () => {
    cleanup().finally(() => process.exit(130));
};
```

`withFirefoxPage`'s handler (line 340) carries a long comment explaining why
`process.exit()` here is wrong — it races ahead of a caller's own `finally`
teardown — and uses `process.exitCode = 130` instead. The sibling function was
not updated. Its doc comment claims "Shares the same cleanup discipline as
`withFirefoxPage`", which is now false.

**Fix:** apply the same shape.

```js
sigintHandler = () => {
    process.exitCode = 130;
    cleanup();
};
```

### WR-07: `readRuntimeIdentity` SIGKILLs the browser and removes its profile without waiting for exit

**File:** `scripts/verify-branding-identity.mjs:405-411`

**Issue:**

```js
} finally {
    if (child && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
    }
    await rm(profileDir, { recursive: true, force: true });
}
```

No `await` on the child's exit before `rm`. A SIGKILLed Firefox's child processes
(content processes, the Theia backend) can still be writing into `profileDir`
while it is being removed, producing intermittent `ENOTEMPTY`/`ENOENT` and a
partially-deleted directory. `firefox-bidi.mjs`'s `cleanup()` gets this right
(SIGTERM, await exit with a 5 s SIGKILL escalation, then `rm`); this harness in
the same repo does not.

**Fix:** reuse the SIGTERM → await → SIGKILL → `rm` sequence from
`firefox-bidi.mjs:311-324`, or extract it as a shared helper.

### WR-08: The About dialog's repo link is a fake button with no keyboard handler

**File:** `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:37-42`

**Issue:**

```tsx
<a role='button' tabIndex={0}
   onClick={() => this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true })}>
```

`role='button'` plus `tabIndex={0}` makes it focusable and announces it as a
button, but there is no `onKeyDown`, so Enter and Space do nothing. A keyboard or
screen-reader user can reach it and cannot activate it. The sibling welcome
widget (`powerbrowser-welcome-widget.tsx:73`) gets this right by using a real
`href` with an `onClick` that calls `preventDefault()`.

**Fix:** match the welcome widget's shape.

```tsx
<a href={POWERBROWSER_REPO_URL}
   onClick={(e: React.SyntheticEvent) => {
       e.preventDefault();
       this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true });
   }}>
    {POWERBROWSER_REPO_URL}
</a>
```

### WR-09: Workspace trust is disabled and the app ships a development-mode bundle

**File:** `theia/applications/browser/package.json:16`, `:83`

**Issue:** Two settings in the shipping application package:

- `"security.workspace.trust.enabled": false` removes the trust prompt entirely.
  Any workspace the user opens runs its `.vscode/tasks.json`, debug adapters, and
  installed VS Code extensions with no gate — on a backend that
  `powerbrowser-env.ts`'s own header describes as having "arbitrary file access
  and a terminal". Combined with `VSX_REGISTRY_URL=https://open-vsx.org` this is
  a meaningful attack surface with no in-tree rationale (JSON carries no comment,
  and no doc explains the choice).
- `"build": "yarn -s rebuild && theia build --app-target=browser --mode development"`
  builds the default target unminified, with development React and full source
  maps.

**Fix:** if trust must stay off for Phase 1, record the decision in
`.planning/` and add a `$comment` sibling key naming it; otherwise remove the
override and let Theia's default apply. Add a `build:production` script with
`--mode production` for the release objdir path.

### WR-10: Developer-machine absolute paths checked into the repo

**File:** `powerbrowser/powerbrowser.desktop:3`, `:4`; `powerbrowser/powerbrowser-release.desktop:3`, `:4`; `inventory/brand-tokens.json` (`brand_display_expectations.repo_root`)

**Issue:** All four `.desktop` `Exec=`/`Icon=` values and the inventory's
`repo_root` hardcode `/home/chris/coding/Power-Browser`. `powerbrowser/shell/moz.build`
takes explicit care to avoid exactly this ("so the sidecar prefs carry an
absolute dev-tree path with **no hardcoded user path checked into the repo**"),
and the whole point of Phase 2 is that `configuration.toml` + `brand/` are the
only rebrand inputs. A single-developer home directory baked into five tracked
files contradicts both.

**Fix:** treat the `.desktop` files the way `moz.build` treats the sidecar prefs
— emit them at build time with the repo root substituted, or ship them with a
`@REPO_ROOT@` token and a documented install step. Derive `repo_root` in the
inventory consumers from `REPO_ROOT` (already computed in
`scan-brand-residue.mjs:101`) rather than storing it.

### WR-11: Live comment points at `scripts/verify-phase-05.sh`, a script CLAUDE.md forbids from existing

**File:** `powerbrowser/shell/powerbrowser.css:27`

**Issue:**

```
 * scripts/verify-phase-05.sh's shell-csp-inline-attrs check fails if you do.
```

That file does not exist (`ls scripts/verify-phase-*` → no match) and CLAUDE.md
states it "must not come back". The check is now the
`shell-csp-inline-attrs` row in `scripts/verify-platform.sh`. A reader following
this comment finds nothing and may reasonably conclude the guard is gone.

**Fix:** `scripts/verify-platform.sh --only shell-csp-inline-attrs`.

### WR-12: The internals catalogue is keyed on line numbers only, and never checks that the row describes the right API

**File:** `scripts/check-internals-boundary.sh:190-221`

**Issue:** `check_catalogue_consistency` asserts only that some line in
`INTERNAL-APIS.md` matches `PowerBrowserAPI\.sys\.mjs:<n>` for each occurrence
line `n`. Two consequences:

1. Inserting a line near the top of `PowerBrowserAPI.sys.mjs` shifts every
   occurrence number, so the check fails wholesale on an unrelated edit — the
   catalogue is maintained by line arithmetic rather than by content.
2. A row can be *present at the right line number while describing a completely
   different API*. Since it never compares the pattern or the method name, a
   moved touchpoint that happens to land on a catalogued line number passes.

The self-test's mutation is `grep -v "$victim"` where `$victim` is
`PowerBrowserAPI.sys.mjs:71` — unescaped, so the `.` are regex wildcards and the
mutation can remove more lines than intended.

**Fix:** key on the touchpoint rather than the line. Have
`catalogue_occurrence_lines` also emit the matched pattern and the enclosing
method name, and require the catalogue row to name both:

```sh
if ! grep -Fq "${base}:${line_no} ${pattern}" "$catalogue"; then
```

and use `grep -Fv -- "$victim"` in the self-test.

### WR-13: Probe indices are computed against `toLowerCase()` output but tested against an array indexed by the original text

**File:** `scripts/scan-brand-residue.mjs:324-335`

**Issue:**

```js
const lower = text.toLowerCase();
const starts = lineIndex(text);
// ...
let i = lower.indexOf(needle);
while (i !== -1) {
  if (!taken[i]) { /* report as unclaimed */ }
```

`taken` and `starts` are indexed against `text`; `i` is an offset into `lower`.
`String.prototype.toLowerCase` is not length-preserving for all inputs (U+0130
LATIN CAPITAL LETTER I WITH DOT ABOVE lowercases to two code units, among
others). One such character anywhere earlier in a scanned file shifts every
subsequent probe offset, so condition 4 — the one detector the header calls "the
one that catches this file being wrong" — reports the wrong `file:line` or reads
the wrong `taken[]` slot and misses a genuine unclaimed hit.

**Fix:** do the case-insensitive search without changing offsets.

```js
// Case-insensitive search that preserves offsets into `text`: toLowerCase()
// is not length-preserving (U+0130 lowercases to two code units), and `taken`
// and `starts` are both indexed against `text`.
const probeRe = new RegExp(probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
for (let m = probeRe.exec(text); m !== null; m = probeRe.exec(text)) {
  if (!taken[m.index]) {
    unclaimedProbes.push({ file, line: lineOf(starts, m.index), probe, text: m[0] });
  }
}
```

### WR-14: The permanent brand gate excludes the two files most likely to contain a real leak

**File:** `inventory/brand-tokens.json` (`scope.exclude`)

**Issue:** `scope.exclude` is
`[".planning/", "inventory/", "scripts/scan-brand-residue.mjs", "scripts/rename-brand.mjs"]`.
The two excluded scripts contain the old brand token in prose and in fixtures.
Nothing verifies that every occurrence in those two files is a *legitimate*
machinery use — a genuine leak introduced there is invisible to the gate CLAUDE.md
calls permanent. `git grep` confirms both files currently carry the literal.

**Fix:** replace the whole-file exclusion with the same site-scoped mechanism
`hand_write` already uses, or move the fixture strings into
`inventory/brand-tokens.json` (already excluded, and already declared as the one
place the token may be spelled) and have the two scripts read them from there —
which also removes the last hardcoded token literal from executable code.

## Info

### IN-01: `verify-gui01-command.mjs` reads the first `label:` in the source file

**File:** `scripts/verify-gui01-command.mjs:73`

**Issue:** `/label:\s*'([^']+)'/.exec(text)` takes the first match in
`browser-window-command.ts`. Adding a second `Command` constant above
`OPEN_BROWSER_WINDOW` silently repoints the assertion at the wrong label.
**Fix:** anchor on the constant: `/OPEN_BROWSER_WINDOW[^}]*label:\s*'([^']+)'/`.

### IN-02: `rename-brand.mjs` silently ignores `--scope-chain` when `--scope-files` is also given, then reports the chain anyway

**File:** `scripts/rename-brand.mjs:341`, `:349`

**Issue:** `run()` resolves `files ?? scopeFiles(...)`, so `files` wins and
`chain` is discarded — but line 349 still prints `for chain "${chain}"`. The
output claims a scope the run did not use. **Fix:** reject the combination in
`main()` the way `verify-platform.sh` rejects `--gate --quick`.

### IN-03: `verify-branding.mjs`'s coverage guard is unreachable

**File:** `scripts/verify-branding.mjs:242-249`

**Issue:** Every `surfacesRun.push()` is preceded by a throwing assertion inside
the same sequential callback, so any surface that "silently never ran" already
threw and rejected `main()`. `missing.length > 0` can never be true. **Fix:**
either move the pushes into the individual `check*` functions' own successful
returns (so a swallowed internal catch is detectable), or delete the guard rather
than leave a check that cannot fire.

### IN-04: `verify-platform.sh` dispatches registry commands via unquoted expansion

**File:** `scripts/verify-platform.sh` (runner, `setsid $cmd &`)

**Issue:** `setsid $cmd &` relies on word-splitting to turn
`node /abs/path/script.mjs --flag` into an argv, and is therefore also subject to
pathname expansion. It is correct only because CLAUDE.md hard rule 4 forbids a
space in the repo path and no registry entry contains a glob character. **Fix:**
store the command as a bash array per row, or `set -f` around the dispatch.

### IN-05: `freePort()` has a TOCTOU window

**File:** `scripts/lib/firefox-bidi.mjs:43-52`

**Issue:** The socket is closed before Firefox is spawned, so another process can
take the port. Manifests as an intermittent harness failure. **Fix:** retry the
launch once on a BiDi-listen failure, or pass `--remote-debugging-port=0` and
parse the port from the listening line (already parsed by `BIDI_LINE_RE`).

### IN-06: `is_comment_line` only recognises leading `//` and `*`, so a trailing comment is a false positive

**File:** `scripts/check-internals-boundary.sh:69-76`

**Issue:** `const x = 1; // reaches Services.prefs` is flagged as an offense.
Harmless today (the guard is green), but it pushes future authors toward
rewording comments rather than fixing code. **Fix:** strip a trailing `//` run
before pattern matching, guarding against `//` inside a string.
