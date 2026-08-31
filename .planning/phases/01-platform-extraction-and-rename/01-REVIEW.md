---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-30T00:00:00Z
depth: standard
files_reviewed: 46
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
  - theia/applications/browser/package.json
  - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts
  - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
  - theia/extensions/tab-uris/src/browser/browser-window-command.ts
  - theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts
  - theia/extensions/token-gate/src/node/powerbrowser-env.ts
findings:
  critical: 2
  warning: 10
  info: 9
  total: 21
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-30
**Depth:** standard (per-file analysis, language-specific checks)
**Files Reviewed:** 46
**Status:** issues_found

## Summary

This is a re-review superseding the review committed at `ec26437` (1 critical, 7 warnings,
5 info), which predated plans 01-07 and 01-08. Disposition of every earlier finding is stated
in "Prior review disposition" below rather than left implicit.

The verification substrate improved materially in 01-08 and the earlier critical finding is
genuinely closed — `reconcile()`'s condition 4 now sits above the post-rename branch split
(`scan-brand-residue.mjs:437-449`), `gateFailures()` is a single exported exit source
(`:534-543`), and the un-flagged registered path evaluates it (`:882-886`). The About dialog
now renders the display form and both guards that missed it were rebuilt to derive their
expectations (`verify-branding-preflight.mjs:352-390`, `verify-branding.mjs:90-103`).

The most serious defect this pass is not in the verification substrate but in the supervisor.
**`TheiaService._spawnAndGate` derives "is this the first spawn" from `this._port === null`,
but `this._port` is assigned before the health gate that can still fail** — so any failure after
the readiness sentinel permanently disables the cookie, the swap, and the health loop for the
rest of the browser session. The recovery probe then drives a *successful* respawn that paints
nothing: the user is left on the branded loading layer with a healthy backend, no error, no
Retry, and no Details. That is CR-01, and it is reachable with no user action at all.

CR-02 is the earlier WR-05/WR-06 pair, unfixed and re-classified upward: three "fail loudly"
paths still terminate as an unhandled promise rejection in chrome, producing the same silent
permanent loading screen. Two failures with the same total user-visible outcome and no
diagnostics is not a warning-tier defect.

Four earlier warnings and four earlier info items are still open verbatim and are re-reported
with their original IDs noted, because a finding nobody fixed is still a finding. Two earlier
findings (WR-02, WR-07) concern files outside this review's file list and are recorded as
out-of-scope rather than silently dropped.

Deliberate design decisions were checked against `CLAUDE.md` and are **not** reported: the
duplicated hand-written literals across `branding/{dev,release}`, the absence of a chrome-side
GUI-01 command, `TheiaService.sys.mjs` consuming the `PowerBrowserAPI` boundary, and the
`.desktop` files being hand-written are all ratified.

---

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: a failure after the readiness sentinel permanently disables the cookie, the swap, and the health loop — leaving a healthy backend behind a permanent loading screen

**File:** `powerbrowser/shell/TheiaService.sys.mjs:435-436`, `:596-597`, `:641-656`, `:760`

`_spawnAndGate(firstSpawn)` uses one boolean for two unrelated decisions:

```js
const port = firstSpawn ? 0 : this._port;          // :436  — which port to request
const pinnedPort = firstSpawn ? null : this._port; // :539
...
if (firstSpawn) {                                   // :641  — cookie + swap + health loop
  PowerBrowserAPI.setSessionCookie({ ... });
  this._swap();
  this._healthLoop();
} else {
  this._pushLog(`Recovered on port ${this._port}, pid ${this._pid}.`);
}
```

and `_restart()` derives it as `this._spawnAndGate(this._port === null)` (`:760`).

`this._port` is assigned at `:596`, **immediately after the readiness sentinel parses and before
`_pollUntilHealthy` runs at `:623`**. So an attempt that announces readiness and then fails the
health gate leaves `this._port` pinned while `_swapped` is still `false`, `_errorShown` is set,
and no cookie exists. Every subsequent attempt in that browser session computes
`firstSpawn === false` and takes the `else` branch.

**Concrete failure scenario, no user action required.**

1. First spawn binds, prints `POWERBROWSER_BACKEND_READY {port: N, ...}`. `this._port = N`.
2. `_pollUntilHealthy` never sees a 200 — the token gate answers 403 (a stdin-handshake race,
   an inherited `POWERBROWSER_TOKEN_DISABLE` misread, a token mismatch), or the backend is slow
   past `startupTimeoutMs`. Returns `{ok: false, recoverable: true, message: didNotFinishStarting}`.
3. `_restart()` gives up (or retries — either path reaches the same state) and calls
   `_showError(...)`, which calls `_startRecoveryProbe()` at `:876`.
4. `_recoveryProbeLoop` fires `_restart()` every `recoveryProbeIntervalMs` (default 15 s).
   The transient condition clears; a respawn succeeds.
5. `firstSpawn` is `false`. **No cookie is set. `_swap()` is never called. `_healthLoop()` never
   starts.** `_restart()` then calls `this._hideError()` at `:762`, which hides the error layer
   and reveals `#powerbrowser-loading` — never hidden, because only `powerbrowserSwapToUrl` hides
   it (`powerbrowser.js:75`).

The user is looking at a branded loading screen, forever, with a healthy backend on
`127.0.0.1:N`, no error text, no Retry button, no Details button, and no supervision. Clicking
Retry (`retry()` → `_restart()`) reproduces the same non-painting success. This is exactly the
outcome `01-UI-SPEC.md`'s copywriting contract exists to prevent, produced by the recovery
machinery that exists to prevent it.

The comment at `:724-727` states the intended invariant — "`this._port === null` means no spawn
in this browser session has EVER succeeded yet" — but the code assigns `this._port` on a spawn
that has *not* succeeded.

Lowering `powerbrowser.sidecar.startupTimeoutMs` below `giveUpWallclockMs` reaches step 5 inside
one `_restart()` call, without the recovery probe at all.

**Fix.** Split the two decisions. Port selection stays keyed on `this._port`; the one-time
cookie/swap/health-loop block keys on whether the swap has happened:

```js
// TheiaService.sys.mjs:641
// `_swapped` is the real "has the first spawn completed" flag: it is set only by
// _swap(), i.e. only on a spawn that passed the health gate. `this._port === null`
// is not — _port is pinned at :596, before the gate at :623 that can still fail.
if (!this._swapped) {
  PowerBrowserAPI.setSessionCookie({
    host: "127.0.0.1", path: "/", name: "POWERBROWSER_TOKEN", value: this._token,
  });
  this._swap();
  this._healthLoop();
} else {
  this._pushLog(`Recovered on port ${this._port}, pid ${this._pid}.`);
}
```

Leave `:436` and `:539` keyed on `firstSpawn` (i.e. `this._port === null`) — those are correct
as written; only the `:641` branch is wrong.

Add a registered check with a planted fault: force `_pollUntilHealthy` to fail once (a pref that
sets `healthTimeoutMs` to 1, or a fixture backend that binds but 403s its first N health
requests), then require that the shell still swaps — assert `POWERBROWSER_SHELL_SWAP` appears
and `POWERBROWSER_DECK_STATE` reports `loading: "none"`. Both sentinels already exist
(`powerbrowser.js:73`, `:46-54`), so this needs no new instrumentation.

---

#### CR-02: three "fail loudly" paths terminate as an unhandled rejection in chrome, producing the same silent permanent loading screen

**File:** `powerbrowser/shell/powerbrowser.js:231`; `powerbrowser/shell/TheiaService.sys.mjs:145`,
`:165`, `:642`; `powerbrowser/shell/PowerBrowserAPI.sys.mjs:178-182`, `:453-469`

*(Prior review WR-05 + WR-06, unfixed. Re-classified from Warning to Blocker: the user-visible
outcome is identical to CR-01 — a dead application with no message, no affordance and no
diagnostics — and the failing calls are the ones whose own comments promise the opposite.)*

`powerbrowser.js:231` is `TheiaService.start(browserElement);` — no `await`, no `.catch()`.
Trace the rejection path: `_restart()` wraps its loop in `try { ... } finally { ... }` with no
`catch` (`TheiaService.sys.mjs:742-794`), and `start()` does `await this._restart()` at `:174`.
Any throw outside the classified-result path propagates out of `start()` and becomes an
unhandled promise rejection in chrome, where nothing observes it.

Three reachable throwers, none in a `try`:

1. **`PowerBrowserAPI.ensureDirectory`** — `TheiaService.sys.mjs:145`, awaited bare. Rejects on
   EACCES/ENOSPC/EROFS for `$XDG_CONFIG_HOME/powerbrowser`.
2. **`PowerBrowserAPI.signalBarePid`** — reached from `_reapLeftover()` at `:349`, itself awaited
   bare at `:165`. See WR-03: `ctypes.open("libc.so.6")` sits *outside* the method's `try`, so its
   documented "never throws" contract (`PowerBrowserAPI.sys.mjs:451`) is false.
3. **`PowerBrowserAPI.setSessionCookie`** — `TheiaService.sys.mjs:642`, not in a `try`. Throws by
   design on a rejected cookie; its own comment says "Fail loudly instead"
   (`PowerBrowserAPI.sys.mjs:174-182`).

**Concrete failure scenario.** A `network.cookie.cookieBehavior` setting, an enterprise policy,
or a corrupt cookie store rejects the token cookie. `setSessionCookie` throws from inside
`_spawnAndGate`'s success block, *after* `this._healthy = true` and *before* `_swap()`.
`_restart()`'s `finally` clears `_restartInFlight` and re-throws; `start()` re-throws;
`powerbrowser.js` has no handler. `_showError` is never reached, `_healthLoop` never starts, the
loading layer is never hidden. Nothing is written to the error layer; the only trace is a console
rejection the user cannot see.

**Fix.** Give the fire-and-forget entry point a terminal handler, and wrap the two unguarded
platform calls so they return the same result shape every other failure in `_spawnAndGate`
returns:

```js
// powerbrowser.js:231
TheiaService.start(browserElement).catch(err => {
    PowerBrowserAPI.log("error", `[powerbrowser] TheiaService.start rejected: ${err}`);
    // Static, product-named, ends in an on-screen affordance -- the same contract
    // USER_MESSAGE entries satisfy. The raw `err` belongs in a diagnostics row, never here.
    window.powerbrowserShowError({
        reason: "Power Browser couldn't start its interface. Choose Retry, or open Details to see the error.",
        recoverable: true,
    });
});
```

```js
// TheiaService.sys.mjs:642 -- inside _spawnAndGate's firstSpawn block
try {
    PowerBrowserAPI.setSessionCookie({ host: "127.0.0.1", path: "/", name: "POWERBROWSER_TOKEN", value: this._token });
} catch (err) {
    this._fatal(`Failed to install the sidecar credential cookie: ${err.message}`);
    return {
        ok: false, recoverable: true, message: USER_MESSAGE.couldNotStart,
        details: [["Failed step", "installing the sidecar credential"], ["Error", err.message]],
    };
}
```

and wrap `:145` and `:165` in the same shape.

Note that the message literal in the `.catch()` above must be added to the `USER_MESSAGE` table
and referenced by key, or `verify-shell-error-copy.mjs` section (2)/(3) will correctly go red —
that is the intended interaction, not an obstacle.

---

### Warnings

#### WR-01: the backend credential is host-scoped, not port-scoped, and GUI-01 ships a browser that can navigate to another loopback port

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:152-183`

*(Prior review WR-01, unfixed and not recorded in `WINDOWS.md`.)*

`setSessionCookie` stores `POWERBROWSER_TOKEN` for host `127.0.0.1`, path `/`. Cookies carry no
port component (RFC 6265 §8.5), so this cookie is attached to a request for **any** port on
`127.0.0.1`. `SameSite=Lax` is documented at length (`:142-150`) as the setting that permits the
one cross-site top-level navigation the swap needs — but Lax permits *every* top-level GET
navigation, not just that one.

GUI-01 (`browser-window-command.ts:77`) now puts a stock browser window with a working address
bar in the user's hands, in the same profile and therefore the same cookie jar. A navigation to
`http://127.0.0.1:8080/` — a local dev server, a debug port, a language-server HTTP endpoint —
carries `Cookie: POWERBROWSER_TOKEN=<uuid>`. That value is the sole credential for a backend with
arbitrary filesystem read/write and terminal spawn on the user's account. It lands in that
service's access log at minimum.

`httpOnly: true` correctly blocks script read and `_pushLog`'s redaction (`TheiaService.sys.mjs:1062`)
is correct, so this is the remaining exposure route.

**Fix.** Serve the app from a per-launch random path prefix and set the cookie with
`path: '/<nonce>/'`, so it is not sent to a bare `/` on another port. Failing that, add an origin
check to the backend gate — reject when `req.headers.host` names a port other than the bound one —
which prevents *use* of a leaked token against this backend, and record the residual
leak-to-third-party risk as a `WINDOWS.md` entry rather than leaving it unrecorded.

#### WR-02: the error-copy gate still accepts `this._showError(err.message, ...)`, the exact leak it exists to stop

**File:** `scripts/verify-shell-error-copy.mjs:186`

*(Prior review WR-03, unfixed — line 186 is byte-identical to the reviewed version.)*

```js
if (!/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\.message)$/.test(arg)) {
```

The comment on the next line justifies the second alternative as "a result object's `.message`
(which the checks above prove is one)". The checks above prove no such thing: section (2)
(`:148-164`) validates only `message:` **property sites in object literals**. `err.message`,
`error.message`, `parsed.message` are not `message:` sites, are covered by nothing, and all match
`[A-Za-z_$][\w$]*\.message`.

Changing the retry-budget give-up at `TheiaService.sys.mjs:784` from
`this._showError(result.message, true, result.details)` to `this._showError(err.message, ...)`
paints a raw platform exception string full-screen at a user and this gate exits 0. That is
precisely the class CLAUDE.md's "User-facing copy" rule and MIG-04 forbid, and it is the gate
registered as `shell-error-copy-no-internals` (`verify-platform.sh:3292`) that admits it.

**Fix.** Restrict the escape hatch to the two identifiers the object-literal checks actually
cover, and add a seventh planted fault so the self-test proves the narrowing:

```js
// verify-shell-error-copy.mjs:186
if (!/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|(?:result|resolved)\.message)$/.test(arg)) {
```

```js
// FAULTS, verify-shell-error-copy.mjs:252
{
  name: "raw exception text passed to _showError via err.message",
  apply: s => s.replace("this._showError(result.message, true, result.details);",
                        "this._showError(err.message, true, result.details);"),
  expect: "this._showError() is called with",
},
```

#### WR-03: `signalBarePid`'s documented never-throw contract is false — `ctypes.open` is outside the `try`

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:453-469`

*(Prior review WR-06, unfixed.)*

```js
signalBarePid(pid, signal) {
    const libc = lazy.ctypes.open("libc.so.6");   // outside the try
    try { ... } catch { return false; } finally { libc.close(); }
}
```

The doc comment at `:451` says "never throws". `ctypes.open` is the one call in the method that
can fail for an environmental reason (a musl or otherwise non-glibc target, a hardened `ctypes`
policy) and it is the one call not covered. On such a host `_reapLeftover()`
(`TheiaService.sys.mjs:349`) throws on every launch that finds a state file, which — via CR-02's
missing handler — is a permanent loading screen rather than a degraded reap.

**Fix:**

```js
signalBarePid(pid, signal) {
    let libc;
    try {
        libc = lazy.ctypes.open("libc.so.6");
        const kill = libc.declare("kill", lazy.ctypes.default_abi, lazy.ctypes.int, lazy.ctypes.int, lazy.ctypes.int);
        return kill(pid, signal) === 0;
    } catch {
        return false;
    } finally {
        libc?.close();
    }
}
```

#### WR-04: the background recovery probe is started for *unrecoverable* failures, contradicting D-113's "no retry at all"

**File:** `powerbrowser/shell/TheiaService.sys.mjs:865-877`, `:821-830`, `:136-141`

`_showError` calls `_startRecoveryProbe()` unconditionally at `:876`, ignoring its own
`recoverable` argument. `_recoveryProbeLoop` then calls `_restart()` every
`recoveryProbeIntervalMs` (default 15 s) forever.

`start()`'s comment at `:136-139` states the intent for the unrecoverable class: "unrecoverable
by construction, straight to the error state with no retry at all". The code does the opposite.

**Concrete failure scenario.** `powerbrowser.sidecar.backendMain` is unset (a broken install).
`_resolveSidecar` returns `{ok: false, message: interfaceFilesMissing}`; `start()` calls
`_showError(msg, /* recoverable */ false, ...)`. The probe starts anyway and drives a
`_reap()` + `_spawnAndGate()` pair every 15 s for the life of the browser session — against a
`this._nodePath` that is `null` and a `this._backendMain` that is `""`, so every attempt is a
guaranteed `Subprocess.call` throw. `_restartCount` climbs without bound and the diagnostics
layer's "Restart count" row (`powerbrowser.js:178`) reports a number that measures nothing.

**Fix:** carry the classification through.

```js
// TheiaService.sys.mjs:876
// D-113: an unrecoverable failure cannot fix itself, so there is nothing for the
// probe to notice. Starting it anyway is an unbounded respawn loop against a
// condition that is by construction permanent.
if (recoverable) {
    this._startRecoveryProbe();
}
```

#### WR-05: `_errorShown` freezes `_failureDetails` at the first failure, so the diagnostics layer shows stale rows for a different error

**File:** `powerbrowser/shell/TheiaService.sys.mjs:865-877`

`_showError` returns early when `_errorShown` is already set (`:866-868`), *before* assigning
`this._failureDetails` at `:870`. So the second and every later failure in an error state is
dropped entirely: the painted sentence, the `POWERBROWSER_ERROR_DIAGNOSTICS` sentinel, and the
diagnostics field rows all keep describing the **first** failure.

**Concrete failure scenario.** First give-up is "health probe never returned 200" (rows: health
port, health path, startup timeout). The recovery probe retries; the backend now fails with
D-112's pinned-port conflict (rows: pinned port, the port-moved error). `_showError` no-ops.
A user who opens Details reads health-probe rows for a port-conflict failure, and the sentinel
line the automated checks read announces the wrong failure.

This defeats the stated `getFailureDetails()` guarantee (`:222-225`) that "a row that renders is
a row that was announced" — it renders a row that describes a state the shell is no longer in.

**Fix:** guard only the *paint*, not the state capture.

```js
_showError(message, recoverable, details) {
    this._failureDetails = (details || []).map(([label, value]) => {
        const text = String(value);
        return [label, this._token ? text.replaceAll(this._token, "[redacted]") : text];
    });
    this._pushLog(`Showing error state (recoverable=${recoverable}): ${message}`);
    if (this._errorShown) {
        return;  // already painted; the rows above are now current
    }
    this._errorShown = true;
    this._browserElement.ownerDocument.defaultView.powerbrowserShowError({ reason: message, recoverable });
    if (recoverable) { this._startRecoveryProbe(); }   // see WR-04
}
```

(The repaint-suppression this preserves is the reason `_errorShown` exists; only the row capture
moves above it.)

#### WR-06: the About dialog's repository link is focusable but not keyboard-activatable

**File:** `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:36-43`

```tsx
<a role='button' tabIndex={0}
   onClick={() => this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true })}>
```

`role='button'` plus `tabIndex={0}` puts the element in the tab order and announces it to a
screen reader as an activatable control, but the only handler is `onClick`. A keyboard user
tabs to it, presses Enter, and nothing happens. The welcome widget's sibling link is a real
anchor with an `href` (`powerbrowser-welcome-widget.tsx:73`) and does not have this problem, so
this is an asymmetry between two surfaces rendering the same URL — the same class of asymmetry
01-08 closed on the checking side.

The base class already ships the missing half: `@theia/core`'s `AboutDialog` declares
`doOpenExternalLinkEnter(e, url)` and `isEnterKey(e)` for exactly this pattern
(`@theia/core/lib/browser/about-dialog.d.ts`). Dropping `renderHeader()`/`renderExtensions()`
per D-35 also dropped their use.

This is a WCAG 2.1.1 (Keyboard) failure on a surface the project's own UI spec added a
`:focus-visible` outline for in 01-07 (`powerbrowser.css:208-213`) — the focus ring now leads
somewhere that cannot be activated.

**Fix** — use the base class's own helper rather than a new one:

```tsx
<a
    role='button'
    tabIndex={0}
    onClick={() => this.windowService.openNewWindow(POWERBROWSER_REPO_URL, { external: true })}
    onKeyDown={(e: React.KeyboardEvent) => this.doOpenExternalLinkEnter(e, POWERBROWSER_REPO_URL)}>
    {POWERBROWSER_REPO_URL}
</a>
```

#### WR-07: the display-surface leak scan's terminator set misses `'`, backtick, `>` and end-of-line

**File:** `scripts/verify-branding-preflight.mjs:397`

```js
const leak = new RegExp(`${exp.identifier_form}[ "<]`);
```

The comment at `:391-396` reasons that "the identifier form's legitimate uses all continue into
an identifier; its illegitimate ones all end" — correct — but then enumerates only three of the
ways a string ends in this tree's actual source languages. Not covered:

- `'PowerBrowser'` — a single-quoted TS/TSX string literal. `.ts`/`.tsx` files are the *derived*
  half of `displaySurfaces` (`:371-390`), and this repo's TS style uses single quotes throughout
  (`browser-window-command.ts:14`, `powerbrowser-welcome-widget.tsx:16`).
- `` `PowerBrowser` `` — a template literal.
- `<h3>PowerBrowser</h3>` is caught (`<` terminator), but `{'PowerBrowser'}` and
  `title.label = 'PowerBrowser'` are not.
- `PowerBrowser` at end of line, or followed by `.`/`,`/`)`.

So the exact defect 01-08 fixed (`<h3>PowerBrowser</h3>`) is caught, but its nearest sibling —
the same identifier in a single-quoted string assigned to a rendered label — is not. The
self-test's second plant (`:578`) plants only the JSX-text-node form, so the gap is not exercised.

**Fix.** Invert the rule: match the identifier form when the *next* character is not an
identifier character, which is what the comment actually describes.

```js
// The identifier form's legitimate uses all CONTINUE into an identifier
// (PowerBrowserAPI, PowerBrowserWelcomeWidget); its illegitimate ones all END.
// Enumerating terminators can only ever cover the ones someone remembered --
// `'PowerBrowser'` and `` `PowerBrowser` `` were both missed. Negate the
// continuation instead, which is closed by construction.
const leak = new RegExp(`${exp.identifier_form}(?![A-Za-z0-9_$])`);
```

and add a third plant to the self-test that uses the single-quoted form in a `.tsx` file,
required to go red.

#### WR-08: the browser-window command throws a raw `Error` naming an internal command id from a user-invoked handler

**File:** `theia/extensions/tab-uris/src/browser/browser-window-command.ts:76-85`

```ts
throw new Error(
    `${OPEN_BROWSER_WINDOW_COMMAND_ID}: the browser window was blocked and did not open -- ` +
    'invoke the command directly from the command palette ...'
);
```

Two problems in one statement.

1. **It leaks an internal identifier into text a user may see.** `powerbrowser.open-browser-window`
   is a dotted three-segment key — precisely the shape `verify-shell-error-copy.mjs`'s
   `DOTTED_KEY` pattern (`:58`) exists to reject, and precisely what CLAUDE.md's "no internal
   identifier may appear in user-facing text" forbids. That gate only reads
   `TheiaService.sys.mjs` (`verify-shell-error-copy.mjs:51`), so this surface is unguarded.
2. **The failure is not reliably surfaced at all.** `execute` returns `void` and throws
   synchronously into `CommandRegistry.executeCommand`'s promise. Depending on the invocation
   path, the user sees either a Theia error toast carrying the internal id, or nothing but a
   console rejection — which is the "dead headline feature, not a visible defect" outcome
   `verify-gui01-window.mjs:10-17` was written to prevent. The doc comment claims the null "is
   turned into an error naming this contribution and what to do instead", but naming the
   *contribution* is the part that should not reach a user.

**Fix.** Surface it through Theia's own message service with product-named copy, keep the
identifier in the log:

```ts
@inject(MessageService) protected readonly messages: MessageService;

protected openBrowserWindow(url?: string): void {
    if (!window.open(url ?? '', '_blank')) {
        console.error(`${OPEN_BROWSER_WINDOW_COMMAND_ID}: window.open returned null (popup blocked)`);
        this.messages.error(
            "Power Browser couldn't open a browser window because the window was blocked. " +
            'Choose Open Browser Window from the command palette to try again.'
        );
    }
}
```

#### WR-09: the token read busy-spins a core with no deadline on `EAGAIN`

**File:** `theia/extensions/token-gate/src/node/powerbrowser-env.ts:91-101`

*(Prior review IN-01, unfixed. Raised from Info: an unbounded 100%-CPU spin with no exit
condition is a robustness defect, not a style one.)*

```js
while (bytes.length <= 512) {
    ...
    if ((err as NodeJS.ErrnoException).code === 'EAGAIN') {
        continue;   // bytes.length does not change, so the loop condition never advances
    }
```

If fd 0 is ever non-blocking when this module loads, this spins a core at 100% forever. The
comment's justification — "the supervisor's own startup timeout bounds the wait either way" — is
about the *supervisor's* deadline, not this process's: the supervisor gives up and paints an
error while the backend process keeps burning a core until the user quits the browser. Making
correctness depend on an external actor's timeout is the dependency the module's own header
argues against everywhere else.

**Fix:**

```ts
const deadline = Date.now() + 5000;
while (bytes.length <= 512) {
    ...
    if ((err as NodeJS.ErrnoException).code === 'EAGAIN') {
        if (Date.now() >= deadline) { return undefined; }   // fails the gate CLOSED
        continue;
    }
```

#### WR-10: condition 4's probe indexes `taken[]` and `lineOf()` with offsets from a lower-cased copy that is not length-preserving

**File:** `scripts/scan-brand-residue.mjs:324-335`

```js
const lower = text.toLowerCase();
const starts = lineIndex(text);          // offsets into `text`
...
let i = lower.indexOf(needle);           // offset into `lower`
while (i !== -1) {
    if (!taken[i]) {                     // `taken` is indexed against `text`
        unclaimedProbes.push({ file, line: lineOf(starts, i), probe, text: text.slice(i, i + needle.length) });
    }
```

`String.prototype.toLowerCase` is not length-preserving: `'İ'.toLowerCase().length === 2`
(U+0130 → U+0069 U+0307). Any such character earlier in a file shifts every subsequent index in
`lower` relative to `text`, after which `taken[i]` consults the wrong byte, `lineOf(starts, i)`
reports the wrong line, and `text.slice(i, i + needle.length)` quotes the wrong substring.

Both directions are wrong and both are bad: a claimed occurrence can be reported as an unclaimed
condition-4 failure (a red the maintainer cannot reproduce, on a gate CLAUDE.md declares
permanent and wires into `rebase-upstream.sh` and CI), or a genuinely unclaimed occurrence can be
masked by a `taken` byte that belongs to a different span — the exact silent miss condition 4
exists to prevent.

Low probability today, but an ESR rebase pulls in content nobody in this repo wrote, which is the
one routine operation that could introduce such a character, and it is also the one operation
this gate is wired into.

**Fix.** Do the case folding per-candidate against the original string rather than on a
re-encoded copy:

```js
// Case-insensitive search that never leaves `text`'s own index space: toLowerCase()
// is NOT length-preserving (U+0130 lowercases to two code units), so an offset taken
// from a lowercased copy misaligns `taken[]`, `lineOf()` and the quoted text.
for (const probe of probes) {
    const n = probe.length;
    for (let i = 0; i + n <= text.length; i++) {
        if (text.slice(i, i + n).toLowerCase() !== probe.toLowerCase()) continue;
        if (!taken[i]) {
            unclaimedProbes.push({ file, line: lineOf(starts, i), probe, text: text.slice(i, i + n) });
        }
    }
}
```

Give it a `--self-test` fixture whose text contains `İ` ahead of a planted unclaimed form and
require the failure to name the correct line.

---

### Info

#### IN-01: `scopeFiles` prefix-matches `scope.exclude` with no path-boundary rule

**File:** `scripts/scan-brand-residue.mjs:262`

*(Prior review IN-05, unfixed.)*

```js
!exclude.some((x) => p === x || p.startsWith(x))
```

Two of the four current entries are exact file paths (`scripts/scan-brand-residue.mjs`,
`scripts/rename-brand.mjs`), so a future `scripts/rename-brand.mjs.orig` or a directory entry
written without a trailing slash silently drops files from the permanent gate's scope.

**Fix:** `p === x || p.startsWith(x.endsWith('/') ? x : x + '/')`.

#### IN-02: `verify-gui01-command.mjs` derives the expected label from the first `label:` in the file

**File:** `scripts/verify-gui01-command.mjs:73`

*(Prior review IN-04, unfixed.)*

`/label:\s*'([^']+)'/.exec(text)` takes the first match in `browser-window-command.ts`. Today
there is exactly one. A second command, or an options object with a `label:` above it, silently
starts asserting the wrong string.

**Fix:** anchor on the declaration, as the id regex at `:72` already does —
`/OPEN_BROWSER_WINDOW\s*:\s*Command\s*=\s*\{[\s\S]*?label:\s*'([^']+)'/`.

#### IN-03: the SIDE-01 bind-scope check hard-codes the hostname it is testing

**File:** `scripts/verify-platform.sh:2666` (`start_backend`)

*(Prior review IN-02, unfixed.)*

`start_backend` launches the backend with a literal `--hostname 127.0.0.1`, so the check proves
only that Node honours that flag. It cannot detect a regression in the argument vector
`TheiaService._spawnAndGate` actually builds (`TheiaService.sys.mjs:437`) — dropping `--hostname`
there leaves this check green. Deriving the args from `TheiaService.sys.mjs` at check time, the
way `verify-shell-error-copy.mjs` derives its expectations, would close it.

#### IN-04: the environment-leak scan covers only direct children

**File:** `scripts/verify-platform.sh:2187`, `:2196`

*(Prior review IN-03, unfixed.)* `pgrep -P` enumerates direct children only. A terminal
`ShellProcess`'s own children and anything the plugin host forks are grandchildren and are never
scanned. `pgrep -g` against the backend's process group would widen coverage for a few lines.

#### IN-05: `evaluate()` dereferences a success-shaped BiDi result unconditionally

**File:** `scripts/lib/firefox-bidi.mjs:359-366`

```js
return result.result.result.value;
```

When the page-side expression throws, `script.evaluate` returns `{type: 'exception',
exceptionDetails: {...}}` with no `result` key, so this raises
`TypeError: Cannot read properties of undefined (reading 'value')` and the page's actual error
text is discarded. Every check built on this driver (`verify-branding.mjs`,
`verify-gui01-command.mjs`, `verify-gui01-window.mjs`) then fails with a message that names
neither the file nor the cause.

**Fix:**

```js
const r = result.result;
if (r.type === 'exception') {
    throw new Error(`script.evaluate threw in the page: ${r.exceptionDetails?.text ?? JSON.stringify(r.exceptionDetails)}\n  expression: ${expression}`);
}
return r.result.value;
```

#### IN-06: the catalogue self-test's mutation lacks the digit boundary its real check has

**File:** `scripts/check-internals-boundary.sh:277`

`grep -v "$victim"` removes every catalogue line *containing* `PowerBrowserAPI.sys.mjs:<N>` as a
substring, so mutating for line `38` also removes rows for `380`, `381`, … . The real check at
`:209` correctly guards the boundary with `([^0-9]|$)`; the mutation that exercises it does not,
so the fixture is over-mutated and the assertion is weaker than it reads. Reuse the same
anchored pattern: `grep -Ev "${escaped_base}:${victim_line}([^0-9]|\$)"`.

#### IN-07: `rebase-upstream.sh` treats the tag as both a glob and a regex, and pipes into `grep -q` under `pipefail`

**File:** `scripts/rebase-upstream.sh:54`

```sh
if ! git ls-remote --tags "$REMOTE" "refs/tags/$NEW_TAG" | grep -q "refs/tags/$NEW_TAG"; then
```

Three latent issues in one line: `git ls-remote`'s ref argument is a *glob*, so
`--tag 'FIREFOX_*'` passes this existence check and is then handed verbatim to
`fetch-upstream.sh`; the same value is a *basic regex* to `grep`, so a tag containing `.` or `[`
can match a different ref; and under `set -o pipefail`, `grep -q`'s early exit can SIGPIPE `git`
(141) and report an existing tag as missing. Replace with
`git ls-remote --exit-code --tags "$REMOTE" "refs/tags/$NEW_TAG" >/dev/null`.

#### IN-08: `readTokenFromStdin` consumes 513 bytes before giving up, past the line boundary its own doc forbids

**File:** `theia/extensions/token-gate/src/node/powerbrowser-env.ts:91-112`

The doc at `:76-78` states "nothing may be consumed past the line the supervisor wrote", because
the parent-death watchdog reads the same fd for EOF. On the over-long-line path the loop reads
513 bytes and returns `undefined` having consumed all of them. Unreachable with a UUID token, but
the invariant the comment declares is not the one the code enforces. Stopping the loop before the
read (`while (bytes.length < 512)`) at least bounds it to the documented budget.

#### IN-09: `onQuitGranted`'s unregister function is discarded; `--scope-files` silently overrides `--scope-chain`

**File:** `powerbrowser/shell/TheiaService.sys.mjs:158`; `scripts/rename-brand.mjs:341`

Two small ones. `PowerBrowserAPI.onQuitGranted(() => this.stop())` throws away the returned
unregister closure (`PowerBrowserAPI.sys.mjs:314`), so the observer outlives every path that
might want it gone; harmless at one-per-session but the API exists for a reason.

In `rename-brand.mjs:341`, `run(inv, { chain, dryRun, files })` resolves `files ?? scopeFiles(...)`
(`:164`), so passing both `--scope-chain` and `--scope-files` silently ignores the chain rather
than rejecting the combination — the same "a typo that quietly rewrites nothing looks exactly
like a completed stage" failure the `--scope-files` intersection at `:327-337` was written to
prevent.

---

## Prior review disposition

Every finding from `ec26437` is accounted for.

| Prior ID | Status | Where |
|---|---|---|
| CR-01 — D-18 brand gate cannot go red | **CLOSED** | `scan-brand-residue.mjs:437-449` (condition 4 above the split), `:534-543` (`gateFailures`), `:882-886` (single un-flagged exit), `:737-794` (post-rename plant-and-require-red self-test), registered at `verify-platform.sh:3251` |
| WR-01 — token cookie host-scoped, not port-scoped | **OPEN** | re-reported as WR-01 |
| WR-02 — `verify-dev-flag-off` registered without `--expect-bound` | **OUT OF SCOPE** | `scripts/verify-dev-flag-off.mjs` is not in this review's file list; not re-verified |
| WR-03 — error-copy gate accepts `err.message` | **OPEN** | re-reported as WR-02 |
| WR-04 — About dialog ships `PowerBrowser`; check asymmetry | **CLOSED** | `powerbrowser-about-dialog.tsx:34` now `<h3>Power Browser</h3>`; `verify-branding.mjs:90-103` `assertDisplayForm()` shared by both surfaces and sourced from `inventory/brand-tokens.json` at `:52-57`; preflight display-surface set derived at `verify-branding-preflight.mjs:371-390` with a non-vacuity guard and a plant at `:566-588` |
| WR-05 — unhandled rejection → permanent loading screen | **OPEN, escalated** | re-reported as CR-02 |
| WR-06 — `signalBarePid` throws from `ctypes.open` | **OPEN** | re-reported as WR-03 |
| WR-07 — `onStart` reads `server.address()` before bind | **OUT OF SCOPE** | `token-gate-backend-contribution.ts` is not in this review's file list; not re-verified |
| IN-01 — EAGAIN busy-retry | **OPEN, escalated** | re-reported as WR-09 |
| IN-02 — SIDE-01 hard-codes the hostname | **OPEN** | re-reported as IN-03 |
| IN-03 — env-leak scan sees direct children only | **OPEN** | re-reported as IN-04 |
| IN-04 — first `label:` in the file | **OPEN** | re-reported as IN-02 |
| IN-05 — `scope.exclude` prefix has no boundary | **OPEN** | re-reported as IN-01 |

---

## Verified sound (checked this pass, no finding)

Recorded so a later reader does not re-derive these.

- **The residual-brand gate is now genuinely able to go red.** `reconcile()` pushes condition 4
  before the `postRename` early return, the post-rename branch also asserts held-back-row counts
  with an explicit `checked === 0` non-vacuity failure (`:471-473`), and the self-test's control
  run (`:761-770`) proves the plant causes the red rather than the fixture. The census rows now
  reconcile: `MOZ_APP_UA_NAME`/`MOZ_APP_ID` at 1, `-PLAN.md` at 28, the repo-root row at 0.
- **`rename-brand.mjs`'s one-pass rewrite.** Claims are index-ascending and non-overlapping
  (`claimOccurrences` sorts by index at `scan-brand-residue.mjs:247` and `taken[]` prevents
  re-claiming), the cursor advances by the *source* token length, and skipped claims correctly
  leave the original text in the next slice. The rerun-is-a-no-op property holds.
- **`--scope-files` cannot escape `scope.exclude`.** `rename-brand.mjs:327-337` intersects the
  requested list with `scopeFiles(inv)` and rejects, by name, any path outside it.
- **`assertDisplayForm` is genuinely shared.** Both `checkWelcome` (`verify-branding.mjs:135`)
  and `checkAbout` (`:166`) route through it, and `DISPLAY_FORM`/`IDENTIFIER_FORM` are read from
  the inventory at run time (`:52-57`) — no display literal remains as a string constant in the
  checker. `document.title`'s expectation reads from the same source (`:211`).
- **The preflight's derived surface walk fails closed.** A zero-file walk is an explicit failure
  (`verify-branding-preflight.mjs:381-389`), not a clean run, and the self-test copies the whole
  branding browser directory (`:512-515`) so the derived half is exercised non-vacuously.
- **`spawnProcess`** uses an explicit argument vector through `Subprocess.call`
  (`PowerBrowserAPI.sys.mjs:193-201`) — never a shell interpreter, no command-injection surface.
  The environment object at `TheiaService.sys.mjs:456-479` carries no secret and explicitly
  clears `POWERBROWSER_TOKEN_DISABLE`.
- **`readProcessStartTicks`** correctly slices past the *last* `)` before splitting
  (`PowerBrowserAPI.sys.mjs:435`), so a `comm` containing spaces or parentheses does not
  misalign field 22; `IOUtils.read` with an explicit `maxBytes` is the correct procfs reader.
- **Token redaction.** `_pushLog` (`TheiaService.sys.mjs:1062`) and `_showError`'s detail mapping
  (`:870-873`) both redact `this._token`, and the `this._token ?` guard correctly avoids
  `replaceAll(null, ...)` / `replaceAll("", ...)`.
- **`_reapLeftover`'s recycled-pid guard.** String-equality on start-time ticks with an early
  return and no escalation on mismatch (`:356-366`) is sound; the profile-scoped state file key
  (`:324-327`) correctly prevents two `--profile` instances sharing one record.
- **The mark and its Theia twin are byte-identical** and both carry the square viewBox and the
  `prefers-color-scheme` dual fill the preflight asserts (`verify-branding-preflight.mjs:435-452`).
- **`check-internals-boundary.sh`** correctly fails on an empty scan set (`:102-105`), derives the
  catalogue victim line from the code rather than hardcoding it (`:266-274`), and asserts the
  mutation actually removed something (`:279-282`).
- **`powerbrowser.css`'s hidden defaults and focus ring** live in the stylesheet rather than in
  style attributes, which is correct under the shell's `default-src chrome:` CSP; the
  `:focus-visible` outline (`:208-213`) uses only values already declared in the file.
- **`.desktop` entries** carry both `x-scheme-handler/http` and `x-scheme-handler/https` and match
  the inventory's `repo_root`/`objdir`/`app_basename` composition exactly, as the preflight
  asserts. The hardcoded `/home/chris/coding/Power-Browser` prefix is the ratified Phase 1
  hand-written literal and Phase 2's `configuration.toml` input, not a defect.

---

_Reviewed: 2026-08-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
