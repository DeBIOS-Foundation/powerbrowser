---
phase: 01
status: issues-found
critical: 1
warning: 7
info: 5
reviewed_files: 50
depth: standard
reviewed: 2026-08-30
---

# Phase 01: Code Review Report

**Depth:** standard (per-file analysis, language-specific checks)
**Scope:** the 50 source files authored or modified after the upstream snapshot import (`38a26f5`).
**Status:** issues-found

## Summary

Attention was weighted as the brief directed: the token gate, the rename/residue codemod pair, the
verification suite, `powerbrowser/shell/`, and the customize privileged-JS path.

The token gate's core invariants mostly hold. `timingSafeEqual` is length-pre-checked, the reject
path sets no header and calls no `next()`, and `unshift` genuinely front-inserts — Theia's
`BackendApplication#configure()` reads `earlyMiddleware.handlers` at line 145, *after* awaiting
`initialize()`, so the ordering claim in the comment is correct against the pinned `@theia/core`.
The `POWERBROWSER_ENV` capture-and-scrub is sound and `side04-token-not-in-environment` is one of
the better-built checks in the tree. The customize privileged-JS binding really is absent (not
merely guarded) when the flag is off.

The most serious defect is in the verification substrate, not the product: **the D-18 permanent
brand gate is structurally incapable of the check its own header says is the one that matters.**
That is CR-01 and it is demonstrated, not inferred. A second class of finding — three separate
gates that pass on inputs they exist to reject — follows the same pattern: WR-02 (a positive
control that is never registered), WR-03 (a regex escape hatch wide enough to admit the exact leak
being gated), WR-04 (an assertion present on one branding surface and absent on its twin, with the
twin currently shipping the wrong product name).

On the product side, the significant findings are a credential-scoping weakness in the token cookie
(WR-01) and an error-handling gap that turns three "fail loudly" paths into a silent permanent
loading screen (WR-05).

Pre-existing/inherited code is marked as such. Nothing here re-reports `WINDOWS.md` items except
where the ledger entry understates the defect, which is called out explicitly.

---

## Critical Issues

### CR-01: the D-18 brand gate cannot fail on an unclaimed probe hit, in either mode

**File:** `scripts/scan-brand-residue.mjs:435-461`, `scripts/scan-brand-residue.mjs:783-792`
**Also:** `scripts/verify-platform.sh:3241`, `scripts/rebase-upstream.sh:108`,
`.github/workflows/rebase-upstream.yml:45`

Two independent gaps compose into a gate that cannot go red for the reason it exists.

**Gap 1 — the registered gate never evaluates reconciliation at all.** `main()` computes `rec` at
line 771, prints its failures only when `--reconcile` was passed (line 778), and only lets them
affect the exit code inside `if (wantReconcile && ...)` at line 787. All three registered
invocations omit `--reconcile`. The exit code therefore depends solely on `offenses.length` —
occurrences claimed by an inventory row under the boundary matcher.

**Gap 2 — even with `--reconcile`, condition 4 is unreachable in the post-rename state.**
`reconcile()` computes `postRename = offensesOf(result).length === 0` (line 435) and, when true,
returns at line 460 after checking only the frozen/coincidental counts. `result.unclaimedProbes`
— populated at lines 326-335 by the deliberately-dumb, boundary-free, case-insensitive probe — is
**never read** on that branch. Conditions 1-4 are pushed only in the red branch below line 463, a
state the tree left permanently when the rename landed.

The file's own header (lines 22-29) is explicit that this is the load-bearing assertion:

> Condition 4 is the one that catches this file being wrong. ... A boundary bug (missing
> `sourcererPrivilegedJs`, say) leaves an unclaimed probe hit and fails condition 4 even though
> conditions 1-3 all agree with themselves.

**Concrete failure scenario.** An ESR rebase (or any commit) reintroduces a brand string in a form
no inventory row matches under `isBoundaryMatch` — `Sourcerers`, `resourcerer`, `SOURCERERX`, a
hyphenated or space-separated variant, or a new file that spells the token in a case form the
inventory does not carry. `claimOccurrences` claims nothing, `offensesOf()` is empty, the plain gate
prints `PASS` and exits 0. The probe hit that would name it is computed, stored, sorted, and
discarded. `rebase-upstream.sh` and the CI workflow both go green.

**Demonstrated on the current tree:**

```
$ node scripts/scan-brand-residue.mjs           ; echo $?
0
$ node scripts/scan-brand-residue.mjs --reconcile ; echo $?
scan-brand-residue: held-back row "/home/chris/coding/sourcerer" (lower/coincidental): expected 4 occurrence(s), observed 0
scan-brand-residue: held-back row "MOZ_APP_UA_NAME" (literal/frozen): expected 2, observed 1
scan-brand-residue: held-back row "MOZ_APP_ID" (literal/frozen): expected 2, observed 1
scan-brand-residue: held-back row "-PLAN.md" (literal/frozen): expected 21, observed 28
1
```

Four reconciliation failures exist right now and the registered gate is green over them.

**This is worse than `WINDOWS.md` item 6 records.** That entry says only that
"`--reconcile` no longer closes post-rename; its `expected_count` census describes the pre-rename
tree. Gate is the plain run." That framing treats the plain run as sufficient. It is not: gap 2
means condition 4 is dead in `--reconcile` too, so there is no mode of this script, today, in which
an unclaimed probe hit produces a non-zero exit. The ledger entry should be re-scoped or closed by
a fix.

**Fix** (two lines, both in `scan-brand-residue.mjs`):

```js
// 1. reconcile(): evaluate condition 4 on BOTH branches, before the postRename return.
if (postRename) {
    conditions.push('condition 4: no occurrence was found that the inventory does not account for');
    for (const u of result.unclaimedProbes) {
        failures.push(`condition 4: ${u.file}:${u.line}: "${u.text}" matched probe "${u.probe}" but no inventory row claimed it`);
    }
    // ... existing held-back-row checks ...
    return { postRename, conditions, failures };
}

// 2. main(): condition 4 is part of the gate, not an opt-in report.
if (rec.failures.length !== 0) {           // was: if (wantReconcile && rec.failures.length !== 0)
    console.error(`scan-brand-residue: FAIL -- ${rec.failures.length} reconciliation failure(s)`);
    return 1;
}
```

Fixing (2) alone will make the current tree red on the four stale `expected_count` rows above —
that is the point, and reconciling those four in `inventory/brand-tokens.json` is the work
`WINDOWS.md` item 6 was deferring. Add a `--self-test` fixture that plants `Sourcerers` (a form no
row matches) in a temp file and requires the *plain* run to go red.

---

## Warnings

### WR-01: the backend credential is host-scoped, not port-scoped, and GUI-01 ships a browser that can navigate to another loopback port

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:152-183`

`setSessionCookie` stores `POWERBROWSER_TOKEN` for host `127.0.0.1`, path `/`. Cookies carry no port
component (RFC 6265 §8.5), so this cookie is attached to a request for **any** port on `127.0.0.1`.
`SameSite=Lax` is documented at length (lines 141-150) as the setting that permits the one
cross-site top-level navigation the swap needs — but Lax permits *every* top-level GET navigation,
not just that one.

**Concrete failure scenario.** GUI-01 (`browser-window-command.ts`) puts a stock browser window
with a working address bar in the user's hands, in the same profile and therefore the same cookie
jar. The user (or a link, or an HTTP redirect from any page) navigates that window to
`http://127.0.0.1:8080/` — a local dev server, an Electron app's debug port, a language-server HTTP
endpoint, anything already listening. The request carries
`Cookie: POWERBROWSER_TOKEN=<uuid>`. That value is the sole credential for a backend with arbitrary
filesystem read/write and terminal spawn on the user's account. It lands in that service's access
log at minimum, and in a hostile listener's hands at worst.

`httpOnly: true` correctly blocks script read, and the redaction in `_pushLog` is correct, so this
is the one remaining exposure route. It is not in `WINDOWS.md`.

**Fix.** The cleanest option that keeps the cookie mechanism: serve the app from a per-launch random
path prefix and set the cookie with `path: '/<nonce>/'` so it is not sent to a bare `/` on another
port. Failing that, add an origin check to `gate()` — reject when `req.headers.host` names a port
other than `this.port` — which at least prevents *use* of a leaked token against this backend, and
document the residual leak-to-third-party risk as a `WINDOWS.md` entry rather than leaving it
unrecorded.

### WR-02: `verify-dev-flag-off` is registered without its positive control, so the CUST-02 check cannot discriminate

**File:** `scripts/verify-dev-flag-off.mjs:26-36`, `scripts/verify-platform.sh:256,3306`

The script's own header states the problem outright:

> a script that can only ever report "not bound" would pass vacuously against an app that never
> defined the token at all ... `--expect-bound` is what catches that gap; Plan 05 must run it.

`verify-platform.sh:256` registers `check_verify_dev_flag_off() { _run_app_check_mjs
verify-dev-flag-off.mjs; }` — default mode only. There is no `--expect-bound` row anywhere in the
registry. Contrast `verify-branding-identity`, which *does* register two `--positive-control` rows
(lines 3338, 3345), so the pattern was understood and simply not applied here.

**Concrete failure scenario.** Someone renames the DI token in `powerbrowser-privileged-js.ts` from
`Symbol.for('PowerBrowserPrivilegedJs')` to anything else, or deletes
`@powerbrowser/customize` from the composition, or `window.theia.container` stops being the
container the contribution binds into. In every case `isBound(...)` returns `false`,
`verify-dev-flag-off` prints PASS, and CUST-02 is asserted by an instrument that has stopped
measuring anything.

**Fix.** Add the paired row, exactly as the branding-identity checks do:

```sh
"verify-dev-flag-off|check_verify_dev_flag_off"
"verify-dev-flag-off-positive-control|check_verify_dev_flag_off_expect_bound"
```

with a wrapper that starts the app from a `powerbrowserPrivilegedJs: true` build and passes
`--expect-bound`. If a second build is too expensive to register in the full set, the minimum
honest alternative is a `--self-test` that evaluates a known-bound token
(e.g. `Symbol.for('CommandRegistry')`-adjacent) and requires `true` — proving the evaluation channel
discriminates at all.

### WR-03: the error-copy gate accepts `this._showError(err.message, ...)`, the exact leak it exists to stop

**File:** `scripts/verify-shell-error-copy.mjs:186`

```js
if (!/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*\.message)$/.test(arg)) {
```

The comment on the next line justifies the second alternative as "a result object's `.message`
(which the checks above prove is one)". The checks above prove no such thing: section (2) validates
only `message:` **property sites in object literals**. `err.message`, `error.message`,
`parsed.message` — none of those are `message:` sites, so none are covered, and all four match
`[A-Za-z_$][\w$]*\.message`.

**Concrete failure scenario, verified empirically.** Copy `TheiaService.sys.mjs`, change the
retry-budget give-up at line 784 from `this._showError(result.message, true, result.details)` to
`this._showError(err.message, true, result.details)` — a raw platform exception string painted
full-screen at a user — and run the gate:

```
$ node scripts/verify-shell-error-copy.mjs --file /tmp/t.mjs
verify-shell-error-copy: PASS -- no internal identifier can reach the error layer
$ echo $?
0
```

That is precisely the class of string CLAUDE.md's "User-facing copy" rule and MIG-04 forbid, and the
static gate registered as `shell-error-copy-no-internals` passes it.

**Fix.** Restrict the escape hatch to the two identifiers whose `.message` the object-literal checks
actually cover, and add a seventh planted fault so the self-test proves it:

```js
if (!/^(?:USER_MESSAGE\.[A-Za-z_$][\w$]*|(?:result|resolved)\.message)$/.test(arg)) {
```

```js
{
  name: "raw exception text passed to _showError via err.message",
  apply: s => s.replace("this._showError(result.message, true, result.details);",
                        "this._showError(err.message, true, result.details);"),
  expect: "this._showError() is called with",
},
```

### WR-04: the About dialog ships the identifier form `PowerBrowser` as user-facing display text, and its check omits the assertion that would catch it

**File:** `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:34`
**Also:** `scripts/verify-branding.mjs:127-141`

```tsx
<h3>PowerBrowser</h3>
```

`inventory/brand-tokens.json`'s `brand_display_expectations` fixes every display value to
`Power Browser` (with the space) for both variants. `powerbrowser-welcome-widget.tsx:63-70` carries
a long comment explaining that this exact bug shipped once already — the mechanical rename rewrote
both the heading and the expectation that checked it — and that the widget was corrected to
`<h1>Power Browser</h1>` in 01-07. The About dialog was not.

The reason it went unnoticed is a gate asymmetry in the same commit's check.
`verify-branding.mjs::checkWelcome` runs three assertions (lines 91-99): contains `Power Browser`,
does **not** contain `PowerBrowser`, does not match `/Theia|Eclipse/i`. `checkAbout` (lines 127-141)
runs only the last of those, plus `/@theia\//` and an anchor-href check. The identifier-leak
assertion — the one that exists specifically for Pitfall 1 — is absent from the About branch.

**Concrete failure scenario:** a user opens Help → About and reads a product name the project's own
inventory declares must never appear in a display string. `verify-branding` prints
`PASS about`.

**Fix.** Correct the source and close the gate asymmetry in the same commit:

```tsx
<h3>Power Browser</h3>
```

```js
// verify-branding.mjs, in checkAbout(), alongside the existing NO_STOCK_IDENTITY test:
if (!text.includes('Power Browser')) {
    throw new Error(`about dialog textContent missing "Power Browser": ${JSON.stringify(text)}`);
}
if (/PowerBrowser/.test(text)) {
    throw new Error(`about dialog textContent leaks the IDENTIFIER form "PowerBrowser": ${JSON.stringify(text)}`);
}
```

### WR-05: three "fail loudly" paths become an unhandled rejection and a permanent loading screen

**File:** `powerbrowser/shell/powerbrowser.js:231`; `powerbrowser/shell/TheiaService.sys.mjs:642,736-795`

`powerbrowser.js:231` calls `TheiaService.start(browserElement)` with no `await` and no `.catch()`.
Trace the rejection path: `_restart()` wraps its loop in `try { ... } finally { ... }` with **no
`catch`** (lines 742-794), and `start()` does `await this._restart()` (line 174). So any throw
inside `_spawnAndGate` that is not on the classified-result path propagates all the way out and
becomes an unhandled promise rejection in chrome.

Three reachable throwers:

1. `PowerBrowserAPI.setSessionCookie` (`TheiaService.sys.mjs:642`, not in a `try`) throws by design
   on a rejected cookie — its own comment says "Fail loudly instead" (`PowerBrowserAPI.sys.mjs:174-182`).
2. `PowerBrowserAPI.signalBarePid` can throw — see WR-06 — from `_reapLeftover()` (line 349), which
   `start()` awaits at line 165 with no guard.
3. `PowerBrowserAPI.ensureDirectory` (line 145) rejects on a permission or ENOSPC failure.

**Concrete failure scenario.** Cookie policy rejects the token cookie (a `network.cookie.cookieBehavior`
setting, an enterprise policy, a corrupt cookie store). `setSessionCookie` throws. `_swap()` is never
reached, `_showError` is never reached, `_healthLoop` never starts. The user is left staring at the
branded loading layer forever, with no message, no Retry, and no Details — the exact outcome
01-UI-SPEC.md's copywriting contract exists to prevent, produced by the code that claims to prevent it.
Nothing is written to the error layer; the only trace is a console rejection.

**Fix.** Give the fire-and-forget entry point a terminal handler, and wrap the two unguarded
platform calls:

```js
// powerbrowser.js:231
TheiaService.start(browserElement).catch(err => {
    PowerBrowserAPI.log("error", `[powerbrowser] TheiaService.start rejected: ${err}`);
    window.powerbrowserShowError({ reason: /* USER_MESSAGE.couldNotStart */ ..., recoverable: true });
});
```

and in `_spawnAndGate`, put `setSessionCookie` in a `try` that returns the same
`{ ok: false, recoverable: true, message: USER_MESSAGE.couldNotStart, details: [...] }` shape every
other failure in that method returns.

### WR-06: `signalBarePid`'s documented never-throw contract is false — `ctypes.open` is outside the `try`

**File:** `powerbrowser/shell/PowerBrowserAPI.sys.mjs:453-469`

```js
signalBarePid(pid, signal) {
    const libc = lazy.ctypes.open("libc.so.6");   // <-- outside the try
    try { ... } catch { return false; } finally { libc.close(); }
}
```

The doc comment two lines above says "Returns true only when the platform call itself returned 0;
false on ESRCH (already gone), EPERM, or any other failure — **never throws**." `ctypes.open` is the
one call in the method that can fail for an environmental reason (a musl or otherwise non-glibc
target, a hardened `ctypes` policy) and it is the one call not covered.

**Concrete failure scenario.** On a host where `libc.so.6` is not resolvable, `_reapLeftover()`
(`TheiaService.sys.mjs:349`) throws on every launch that finds a state file, which — via WR-05's
missing `catch` — turns into a permanent loading screen rather than a degraded reap.

**Fix:** move the `open` inside the `try`, and guard the `finally`:

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

### WR-07: the token gate's `onStart` reads `server.address()` before the bind completes; a first-in-order registration would exit 78 at every startup

**File:** `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:85-93`

`BackendApplication#start()` calls `server.listen(port, hostname, cb)` at
`@theia/core/lib/node/backend-application.js:217` and then enters the `onStart` loop at line 226
**in the same synchronous tick**. `measureContribution` → `stopwatch.startAsync` invokes the
computation synchronously (`stopwatch.js:60`: `const result = await computation();` — the call is
evaluated before the `await`). Node does not complete the bind synchronously even for a numeric
address; verified on the pinned runtime:

```
$ node -e 's=require("http").createServer();s.listen(0,"127.0.0.1",()=>{});
           console.log("sync:", s.address()); Promise.resolve().then(()=>console.log("microtask:", s.address()))'
sync: null
microtask: { address: '127.0.0.1', family: 'IPv4', port: 36975 }
```

So the **first** contribution in `contributionsProvider` order with an `onStart` sees
`server.address() === null`. For `PowerBrowserTokenGateContribution` that is the branch at line 87,
which writes `FATAL -- could not determine the bound address (got null)` and calls
`process.exit(78)` — the backend never starts, and the diagnostic names the wrong cause.

Today this is masked: `@theia/core`'s own contributions are registered ahead of the extension
module, and their first `await` drains the tick that completes the bind. It is a latent
order-dependent hard failure, triggered by a container-module reordering, a Theia bump, or the gate
being bound earlier for any reason.

Secondary, in the same method: the SIDE-01 loopback check runs *after* `listen()` has already bound
and started accepting. The comment ("Refusing to announce readiness") is honest, but the phase brief
describes the invariant as "refuses a non-loopback bind" — it is a post-bind abort with a live
socket in the window before `process.exit`. The token gate is still enforcing during that window, so
the exposure is bounded, but the invariant as stated is stronger than the code.

**Fix:** wait for the socket to be listening before reading its address.

```ts
async onStart(server: http.Server | https.Server): Promise<void> {
    if (!server.listening) {
        await new Promise<void>(resolve => server.once('listening', () => resolve()));
    }
    const address = server.address();
    ...
}
```

---

## Info

### IN-01: unbounded busy-retry on `EAGAIN` in the stdin token read

**File:** `theia/extensions/token-gate/src/node/powerbrowser-env.ts:96-99`

```js
if ((err as NodeJS.ErrnoException).code === 'EAGAIN') {
    continue;   // bytes.length does not change, so the loop condition never advances
}
```

If fd 0 is ever non-blocking when this module loads, this spins a core at 100% with no deadline. The
comment's justification ("the supervisor's own startup timeout bounds the wait either way") is
correct on the only path that reaches this code (`POWERBROWSER_SUPERVISED === '1'`), which is why
this is Info rather than a Warning — but a `Date.now()` deadline of a few seconds, returning
`undefined` (which fails the gate closed, the desired outcome), costs two lines and removes the
dependence on an external actor.

### IN-02: the SIDE-01 bind-scope check hard-codes the hostname it is testing

**File:** `scripts/verify-platform.sh:2665` (`start_backend`), `:2784` (`check_side01_bind_scope`)

`start_backend` launches the backend with a literal `--hostname 127.0.0.1`, so
`check_side01_bind_scope` proves only that Node honours that flag. It cannot detect a regression in
the argument vector `TheiaService._spawnAndGate` actually builds
(`TheiaService.sys.mjs:437`) — dropping `--hostname` there would leave this check green.
Impact is low (Theia's `DEFAULT_HOST` is `localhost`, also loopback) but the check does not assert
what its label implies. Deriving the args from `TheiaService.sys.mjs` at check time, the way
`verify-shell-error-copy.mjs` derives its expectations, would close it.

### IN-03: the environment-leak scan covers only direct children

**File:** `scripts/verify-platform.sh:2189,2201` (`pgrep -P "$backend_pid"`)

`pgrep -P` enumerates direct children only. A terminal `ShellProcess`'s own children, and anything
the plugin host forks, are grandchildren and are never scanned. The check is otherwise the
best-constructed one in the suite (its canary self-test genuinely discriminates). `pgrep -g` against
the backend's process group, or a recursive walk, would widen coverage for a few lines.

### IN-04: `verify-gui01-command.mjs` derives the expected label from the first `label:` in the file

**File:** `scripts/verify-gui01-command.mjs:73`

`/label:\s*'([^']+)'/.exec(text)` takes the first match in `browser-window-command.ts`. Today there
is exactly one. If a second command or an options object with a `label:` is ever added above it, the
check silently starts asserting the wrong string — a drift the file's own header says it exists to
prevent. Anchoring on the `OPEN_BROWSER_WINDOW` declaration (as the id regex already does) removes
the ordering dependence.

### IN-05: `scopeFiles` prefix-matching of `scope.exclude` has no path-boundary rule

**File:** `scripts/scan-brand-residue.mjs:261-263`

```js
!exclude.some((x) => p === x || p.startsWith(x))
```

A bare `startsWith` means an exclude entry `inventory` would also exclude `inventory-notes.md`. All
four current entries are either directory prefixes with a trailing `/` or exact file paths, so this
is latent, not live. Requiring `p === x || p.startsWith(x.endsWith('/') ? x : x + '/')` makes it
safe against a future entry written without the slash.

---

## Verified sound (checked, no finding)

Recorded so a later reader does not re-derive these:

- **Middleware ordering.** `earlyMiddleware.handlers` is iterated in `configure()` at
  `backend-application.js:145`, after `await this.initialize()`. The `unshift` in
  `token-gate-backend-contribution.ts:73` therefore does run ahead of the stock cookie middleware, as
  claimed. `initialize()` runs under `Promise.all`, but the gate's `initialize` is fully synchronous,
  so the front-insert lands before any handler is registered.
- **Fail-closed on an unset token.** `initialize()` runs inside `configure()`, which
  `BackendApplication#init()` invokes before `start()` ever calls `listen()`. `process.exit(78)`
  before the socket binds is correct.
- **`timingSafeEqual` usage.** Length is pre-checked (line 161), so the call cannot throw; the
  length side channel is inherent and irrelevant for a fixed-length UUID.
- **The dev bypass.** `POWERBROWSER_TOKEN_DISABLE` is tested `=== '1'`, and
  `TheiaService._spawnAndGate` clears it explicitly (`TheiaService.sys.mjs:478`) rather than relying
  on the launching shell being clean. The `onStart` loopback guard is *not* gated on `this.disabled`,
  so even a bypassed gate still refuses a non-loopback bind.
- **`rename-brand.mjs`'s one-pass rewrite.** Claims are index-ascending and non-overlapping, the
  cursor advances by the *source* token length, and skipped claims correctly leave the original text
  in the next slice. The re-run-is-a-no-op property holds.
- **`verify-registry-shape.mjs` and `verify-shell-error-copy.mjs`'s self-tests** genuinely plant
  faults and require each to go red naming the drift, including a "did the mutation actually land"
  guard. These are the model the rest of the suite should follow.
- **`check_side04_token_not_in_environment`** carries a live canary through the identical chain, so
  a scanner that cannot see anything fails rather than passing vacuously.
- **`customize-frontend-module.ts`'s dev gate** skips the bindings entirely inside a plain `if`, so
  `isBound(...)` is provably false with the flag off — the CUST-02 claim is structurally true, not a
  runtime no-op. (The check that proves it is the weak part; see WR-02.)
- **`spawnProcess`** uses an explicit argument vector through `Subprocess.call`, never a shell
  interpreter — no command-injection surface.
- **`readProcessStartTicks`** correctly slices past the last `)` before splitting, so a `comm`
  containing spaces or parentheses does not misalign field 22.

---

_Reviewed: 2026-08-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
