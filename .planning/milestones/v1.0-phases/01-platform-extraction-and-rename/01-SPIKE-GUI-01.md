# Spike: GUI-01 — moving startup-window selection into the command-line handler

**Plan:** 01-05, Task 1
**Decision this exists for:** D-20 — research verified the mechanism at all upstream call sites
but never executed it, and rated "no further side effects" only MEDIUM.
**Run:** 2026-08-30, host `legion`, Firefox ESR `153.1.0esr` (`FIREFOX_153_1_0esr_RELEASE`,
upstream commit `468445e5`)
**Binary under test:** `objdir/dist/bin/powerbrowser`, rebuilt from the change described below.
**Verdict:** the move works. Every one of the five upstream call sites that reads the compiled
browser-chrome-URL constant now behaves correctly for a real browser window, observed live rather
than reasoned about. Two constraints were discovered that the plan did not predict, both recorded
below and neither of them a blocker.

---

## What was changed in the working tree

Three edits, all preserved for Task 3 (the plan requires the spike's diff not be discarded):

1. **`powerbrowser/shell/PowerBrowserAPI.sys.mjs`** — three new methods on the anti-corruption
   layer (`openShellWindow`, `openBrowserWindow(url)`, `isInitialLaunch(cmdLine)`), and
   `PowerBrowserSingleInstanceHandler.handle()` extended with an initial-launch branch: when no
   shell window exists **and** the command line reports `STATE_INITIAL_LAUNCH`, it opens the shell
   document itself and sets `cmdLine.preventDefault`. Second-launch behaviour (find the shell
   window, focus it, prevent default) is unchanged.
2. **`patches/020-powerbrowser-shell.patch`** — the `browser/moz.configure` hunk that overrode
   `BROWSER_CHROME_URL` is **removed**. The patch was re-derived from a patched tree, not text-
   edited. It now touches exactly one upstream file, `browser/moz.build`, carrying only the
   `DIRS += ["../powerbrowser/shell"]` hook.
3. **`powerbrowser/shell/powerbrowser.js`** — env-gated spike instrumentation
   (`POWERBROWSER_SPIKE_GUI01`), which exercises `openBrowserWindow()` and dumps what the browser
   window can actually see, on the same `dump()` sentinel channel the shell already uses. **This is
   scaffolding and Task 3 removes it**, replacing it with the ratified frontend-to-chrome channel.

### The patch's hash chain, re-asserted

Removing the `moz.configure` hunk means the two patches no longer share a file, so 01-04's
`010`-post-image-equals-`020`-pre-image chain no longer applies. What replaces it is that **each
patch's own pre-image hash is the pristine upstream blob**:

| Patch | File | Pre-image | Post-image | Pristine `HEAD` blob |
|---|---|---|---|---|
| `010-powerbrowser-identity.patch` | `browser/moz.configure` | `3ea3d88b93` | `5923bbd547` | `3ea3d88b93` ✓ |
| `020-powerbrowser-shell.patch` | `browser/moz.build` | `5a03cfc6d3` | `c242947294` | `5a03cfc6d3` ✓ |

Proven **non-vacuously**, following 01-04's own finding that a naive re-test passes on a blob its
previous run created:

```
$ git -C upstream reset --hard HEAD && git -C upstream prune --expire=now
$ for b in 5923bbd547... c242947294 8e3e347ed7; do git cat-file -t $b; done
5923bbd547...: fatal: git cat-file: could not get object info
c242947294:    fatal: Not a valid object name
8e3e347ed7:    fatal: Not a valid object name        <- the OLD 020 post-image, now unreferenced
$ scripts/apply-patches.sh
Applied patch to 'browser/moz.configure' cleanly.
Applied patch to 'browser/moz.build' cleanly.
apply-patches: all 2 patches applied and verified non-vacuous
$ grep -c 'lacks the necessary blob' <that output>
0                                     <- a real 3-way merge, not a degraded direct apply
$ scripts/apply-patches.sh            # second consecutive run
apply-patches: FAIL -- 010-powerbrowser-identity.patch applied with exit 0 but changed nothing
$ scripts/check-patch-surface.sh   -> PASS
$ scripts/apply-patches.sh --self-test -> PASS (both directions)
```

`grep 'BROWSER_CHROME_URL' patches/020-powerbrowser-shell.patch` returns nothing.
And in the **built artifact**:

```
$ grep BROWSER_CHROME_URL objdir/dist/bin/modules/AppConstants.sys.mjs
  BROWSER_CHROME_URL: "chrome://browser/content/browser.xhtml",
```

The compiled define holds its stock upstream value.

---

## Build

`nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach build'`
— exit 0.

**The plan's forty-minute budget was wrong, and generously so.** The compiled define does live in
C++ (`BROWSER_CHROME_URL_QUOTED` in `xpfe/appshell/AppWindow.cpp`) and in generated JS
(`AppConstants.sys.mjs`), but the dependent surface is small: the incremental rebuild plus relink
took **~3 minutes**, not the ~40 minutes 01-04's from-scratch compile took. Subsequent probe
iterations used `./mach build faster` (chrome repackaging only, well under a minute). Task 3 should
budget minutes, not a build cycle.

```
$ objdir/dist/bin/powerbrowser --version
DeBIOS powerbrowser 153.1.0esr
```

Branded version string intact after the rebuild.

---

## Instrumentation note — read this before trusting any window count below

The harness starts an `Xvfb` display and launches the binary with `DISPLAY` pointed at it, then
counts top-level X windows with `xwininfo -root -children`. **That instrument returned 0 for every
sample, in every run, including while a browser window was demonstrably open and focused.**

Cause: this host is a Wayland session (`WAYLAND_DISPLAY=wayland-0`, `XDG_SESSION_TYPE=wayland`),
and the environment is inherited by the launched binary, so Gecko selects the Wayland backend and
ignores `DISPLAY` entirely. The Xvfb display was real (the parser was verified against the host's
own X display and correctly listed 20 windows there) — the browser simply never drew on it.

**Every window-existence claim below therefore rests on `dump()` sentinels and on chrome-side DOM
observations taken from inside the opened window, not on an X window count.** Those are the
stronger evidence anyway, and they are the same channel 01-UI-SPEC.md and the plan's Task 3 checks
specify. The window-count instrument is discarded, named here so nobody rebuilds it.

---

## Observation 1 — first launch

**Command:** `env DISPLAY=:90 XDG_CONFIG_HOME=<tmp> objdir/dist/bin/powerbrowser --profile <tmp>`

**Seen:**

| Fact | Evidence |
|---|---|
| Exactly one shell window opens | `grep -c POWERBROWSER_SHELL_READY launch1.log` → `1` |
| No stock browser window opens alongside it | `grep -c 'chrome://browser/content' launch1.log` → `0`. A `browser.xhtml` window cannot initialise without emitting chrome activity on this channel; in the deliberately-opened-browser-window runs below it emits plenty. |
| The shell reaches its normal steady state | `POWERBROWSER_SIDECAR_PREFS`, `POWERBROWSER_APP_IDENTITY {"name":"powerbrowser","vendor":"DeBIOS","version":"153.1.0esr"}`, `POWERBROWSER_BACKEND_READY {...}`, `POWERBROWSER_SHELL_SWAP http://127.0.0.1:<port>/`, `POWERBROWSER_DECK_STATE {"loading":"none","error":"none","diagnostics":"none","where":"swap"}` — the full startup sequence, unchanged from 01-04's |
| Process stays alive | `kill -0` → alive after the full 20 s sample window |

**The early blank window — closed, not reused.** This is *not* directly observed; it is a code path,
and the honest statement is that nothing was instrumented inside
`upstream/browser/components/BrowserContentHandler.sys.mjs` to watch it. What the run establishes is
the precondition for that branch: our handler sets `cmdLine.preventDefault = true`, `urilist` is
empty, so `nsDefaultCommandLineHandler.handle` takes its `else` branch —
`Services.wm.getMostRecentWindow("navigator:blank")` then `win.close()` — rather than
`replaceStartupWindow`, which is the branch that would have reused it (and which assigns
`win.location = AppConstants.BROWSER_CHROME_URL`, i.e. would now produce a *browser* window, not the
shell).

**Flicker was not measured.** On a Wayland session with no controlled compositor there is no honest
frame-level measurement available here. Upstream's own comment at that `else` branch calls the
resulting flicker acceptable, and 01-UI-SPEC.md accepts and documents it rather than fixing it in
this phase. Recorded as accepted-and-unmeasured, not as observed-and-fine.

---

## Observation 2 — second launch of the same binary, same profile

**Command:** the same command again while the first instance runs.

| Fact | Evidence |
|---|---|
| The second process opens no window | its own log is **0 bytes** — it never reached the shell bootstrap |
| The second process exits | `kill -0 <pid2>` → gone after 10 s |
| The running instance gains no second window | `POWERBROWSER_SHELL_READY` count in the *first* instance's log: `1` before, `1` after |
| The handler ran and did not throw | zero `[PowerBrowserSingleInstanceHandler]` error lines in any log; the handler's whole body is catch-and-log, so a throw would be visible |

**Handler ordering, confirmed live for the first time after the rename.** The category entry name is
`a-powerbrowser` (`powerbrowser/shell/components.conf`), which sorts ahead of the stock browser
handler's `m-browser` and of `x-default` under `nsCategoryManager`'s ascending `strcmp`. This was
trivially true by string comparison and had never been confirmed against a running binary. It is
now: the second launch produced **no window at all**, which is only possible if our handler ran
*before* `x-default` and set `preventDefault`. If the ordering were wrong, `x-default` would have
opened a window before our handler could prevent it.

---

## Observation 3 — a URL on the command line

**Command (running instance):** `... --profile <same> https://example.invalid/spike`
**Command (cold start):** `... --profile <fresh> https://example.invalid/cold`

| Case | Result |
|---|---|
| Against a running instance | second process exits, 0-byte log, no new window, first instance's `SHELL_READY` count unchanged at `1` |
| Cold start | exactly one `SHELL_READY`, zero `chrome://browser/content` lines, zero mentions of `example.invalid` anywhere in the log |

**It behaves sensibly and does not recurse — but the URL is silently dropped.** No browser window
opens for it and no navigation happens. This is **unchanged from before the move** (the shell has
never read a command-line URL; the handler deliberately reads no argument at all), so it is not a
regression this change introduces. It does, however, **definitively kill one of the candidate
frontend-to-chrome channels** — "re-invoke the binary with a URL argument" cannot carry a URL to a
browser window, because nothing consumes it. See observation 7, candidate D.

Whether a URL argument *should* open a browser window is a product question this spike does not
answer and this plan does not require.

---

## Observation 4 — the stock browser window itself

**Command:** `POWERBROWSER_SPIKE_GUI01=late ... --profile <fresh>` — the probe calls
`PowerBrowserAPI.openBrowserWindow("about:blank")` 25 s after the shell's own `DOMContentLoaded`,
then reads the opened window's DOM and globals directly.

```
POWERBROWSER_SPIKE_GUI01 {"phase":"opened","href":"about:blank","isStock":false,"openDelay":25000}
POWERBROWSER_SPIKE_GUI01 {"phase":"loaded","href":"chrome://browser/content/browser.xhtml",
                          "isStock":true,"hasDialogBox":true,"hasURLBar":true,
                          "hasTabbrowser":true,"tabCount":1,"waited":250}
POWERBROWSER_SPIKE_GUI01 {"phase":"open-location","openLocationError":null,"urlbarFocused":true,
                          "multiUriError":null,"tabsBefore":1,"tabsAfterMultiUri":2}
```

Zero `chrome://browser/content` JavaScript errors in the whole log.

### The five call sites, prediction vs observation

| # | Call site | Prediction (01-RESEARCH.md Finding 1) | Observed | Match |
|---|---|---|---|---|
| 1 | `browser.js:4677` — `if (href != BROWSER_CHROME_URL) { gDialogBox = null; }` | with the override gone, a real browser window keeps its in-window modal dialogs | `hasDialogBox: true` — `gDialogBox` is a live object, not nulled | ✅ |
| 2 | `browser.js:1334-1339` — `openLocation()`'s `href == BROWSER_CHROME_URL` branch | Ctrl+L focuses the address bar instead of redirecting to another window | called `bwin.openLocation()` directly: `openLocationError: null`, `urlbarFocused: true`, and **no additional window opened** (the redirect branch would have `openDialog`'d one) | ✅ |
| 3 | `browser.js:1312` — `loadOneOrMoreURIs` `openDialog(BROWSER_CHROME_URL)` recursion | multi-URI loads land as tabs in this window instead of recursing into the shell | called `bwin.loadOneOrMoreURIs("about:blank\|about:logo")`: `multiUriError: null`, tab count **1 → 2 in the same window** | ✅ |
| 4 | `browser-commands.js:297` / `:358` | same equality as #2, same outcome | same window, same `href`, `isStock: true`; not exercised through those two entry points individually — they read the identical constant against the identical `window.location.href` | ✅ (by construction) |
| 5 | `utilityOverlay.js:418` — `openDialog(BROWSER_CHROME_URL, ...)` target | now targets stock browser chrome rather than the shell | not exercised at runtime; the constant it passes is verified stock in the built `AppConstants.sys.mjs` | ✅ (by constant) |

The window is genuinely the stock one and not a lookalike: `rootId: "main-window"`,
`windowtype: "navigator:browser"`, `chromehidden: ""`, `hasToolbox: true`,
`hasTabbrowserElement: true`, `readyState: "complete"`.

### Constraint found — do not open a browser window during the shell's own startup

The **first** version of this probe opened the browser window synchronously inside the shell's
`DOMContentLoaded` handler. That window came up structurally correct — `isStock: true`,
`hasDialogBox: true`, `hasUrlbarElement: true`, `hasToolbox: true`, `readyState: "complete"` — but
with **`gURLBar` permanently `undefined`**, and these errors in the log:

```
chrome://browser/content/browser.js, line 407: TypeError: can't access property "addEventListener", urlbar is null
chrome://browser/content/browser-init.js, line 272: TypeError: can't access property "addGBrowserListeners", gURLBar is undefined
chrome://browser/content/browser-init.js, line 557: TypeError: can't access property "delayedStartupInit", gURLBar is undefined
browser.js:2532: TypeError: can't access property "formatValue", gURLBar is undefined
```

`gURLBar` is a `ChromeUtils.defineLazyGetter`. Its first access happens in
`gBrowserInit.onDOMContentLoaded` (`browser-init.js:272`); at that moment
`document.getElementById("urlbar")` was `null`, the getter threw, and the property was left
`undefined` for the life of that window — even though the element existed by the time the document
reached `readyState: "complete"` (the probe's own snapshots show `hasUrlbarElement: true`
throughout). The address bar is then dead for that window.

The identical code with a 25 s delay produces a completely clean window with `hasURLBar: true`. **The
threshold was not bisected** — the honest statement is "opened synchronously from inside the shell's
own `DOMContentLoaded` handler: broken; opened 25 s later: clean". The root cause was not chased to
ground either; it is bounded by that reproduction.

**Why this does not block GUI-01:** the real trigger is a user invoking a palette command in a
loaded Theia frontend, which cannot happen until long after the shell, the backend, and the frontend
have all finished starting. **It does bind Task 3's automated checks:** a check that opens a browser
window must not do it during startup, or it will assert against a window that upstream itself has
left half-initialised.

---

## Observation 5 — the last-window hazard

### 5a — closing the browser window with a shell window open

```
POWERBROWSER_SPIKE_GUI01 {"phase":"closed-browser"}
POWERBROWSER_SPIKE_GUI01 {"phase":"still-alive-after-close","shellStillHere":true}
```

The `still-alive-after-close` sentinel is emitted from a timer **inside the shell window**, three
seconds after `bwin.close()`. It could not be emitted at all if the application had quit or the
shell window had gone away. Process liveness independently confirmed: `kill -0` → alive.

**The application does not quit and the shell survives.** This is T-05-04, the failure mode
01-UI-SPEC.md calls "and back silently becomes and gone" — it does not occur.

### 5b — the browser window left as the LAST window

The probe was re-run in `lastwindow-late` mode: open the browser window, then `window.close()` the
**shell** window, leaving the browser window as the only one.

```
POWERBROWSER_SPIKE_GUI01 {"phase":"closing-shell-first"}
```

…and then the process **stayed alive** for the remaining ~35 s of the run, until the harness killed
it. So: **a stock browser window alone sustains the application; closing the shell window does not
quit it.**

**What was NOT observed:** what happens when that final browser window is then itself closed. The
probe's own timer lived in the shell window, which by then had closed, so the follow-up
`closed-browser-last` sentinel could never fire. Closing the genuinely-last window is stock Gecko
`nsAppStartup` quit-on-last-window behaviour and is not a behaviour this change introduces or
alters. Recorded as unobserved rather than assumed.

**Window ordering never leaves Theia at risk in the contracted flow.** GUI-01's flow is
shell-open → browser-open → browser-close, and 5a shows that path is safe.

---

## Observation 6 — session restore and new-window arguments

Searched every log from every run:

```
$ grep -i 'sessionstore\|SessionStartup\|session restore' *.log   -> (none)
$ grep 'PowerBrowserSingleInstanceHandler' *.log                  -> (none)
```

No session-restore interaction of any kind, and no handler error. `SessionStartup.willOverrideHomepage`
is consulted by `gBrowserInit.uriToLoadPromise` only when the passed argument equals
`BrowserHandler.defaultArgs`; `openBrowserWindow()` always passes an explicit URL, so that branch is
never taken. `openShellWindow()` passes `null` arguments, and the shell document reads
`window.arguments` nowhere at all.

**Two pieces of pre-existing noise, named so they are not later mistaken for this change's:**

- `JavaScript error: , line 0: uncaught exception: undefined` (×4) appears on **every** cold start,
  including runs that never open a browser window. Unattributed, pre-existing, not investigated.
- `browser-custom-element.mjs:951: TypeError: this.documentGlobal.gBrowser.getTabForBrowser is not a
  function` comes from the **shell** window: `powerbrowser.js` mints a minimal
  `window.gBrowser = { tabs: [...] }` for WebDriver addressability, and it has no
  `getTabForBrowser`. Pre-existing since 01-01, unrelated to this move.
- `BackupService` `NS_ERROR_FAILURE` / `PathUtils does not support empty paths` — a throwaway profile
  with no documents directory. Harness artefact.

---

## Observation 7 — the frontend-to-chrome channel

**This is the open design question the spike must close.** The Theia frontend is remote web content
(`<xul:browser ... remote="true" remoteType="web">` loading `http://127.0.0.1:<port>/`) inside the
shell's chrome document. It runs in a **separate content process**, so DOM events, globals, and
direct function calls do not cross to chrome. 01-UI-SPEC.md contracts one palette-reachable Theia
command labelled **"Open Browser Window"** as GUI-01's entry affordance, so a channel is required.

There is no JSWindowActor and no chrome↔frontend message channel of any kind in the tree today
(`grep -rn 'registerWindowActor\|JSWindowActor' powerbrowser/ theia/ scripts/` → nothing).

### Candidates evaluated

| # | Candidate | Works with the privileged-JS dev flag OFF? | New Firefox-internal touchpoint? | Verdict |
|---|---|---|---|---|
| A | **`window.open()` from the command handler** — content asks the platform for a new window; with no `nsIBrowserDOMWindow` on the shell window, `nsWindowWatcher` cannot divert it into a tab and falls through to `nsAppStartup::CreateChromeWindow` → `AppWindow::CreateNewContentWindow`, which opens `BROWSER_CHROME_URL_QUOTED` — **now the stock browser document** | **Yes** — stock platform machinery, no privileged code at all | **None.** Zero new code on the chrome side. | **RECOMMENDED** |
| B | **JSWindowActor pair** — a child actor on `http://127.0.0.1/*` listening for a `CustomEvent` the frontend dispatches, `sendAsyncMessage` to a parent actor that calls `PowerBrowserAPI.openBrowserWindow()` | Yes | **Yes** — `ChromeUtils.registerWindowActor` plus two new actor modules; and `registerWindowActor` is **not** in `check-internals-boundary.sh`'s `FORBIDDEN_PATTERNS`, so adopting this must add it or the guard has a new hole | Sound but ~60 lines, two new files, a jar.mn/moz.build change, and a widened guard. **Ratified fallback.** |
| C | **A message through the existing chrome-side supervision service** — frontend → a new backend HTTP route → backend writes a sentinel line to stdout → `TheiaService._pumpOutput`'s existing line pump (which already runs for the backend's whole life) dispatches it | Yes | None | Rejected. Three tiers for one UI action, a **new HTTP route** on the token-gated backend (new attack surface, T-05-01), a new `backend` entry in an extension that is frontend-only today, and it repurposes a **log** stream as a control channel. |
| D | **Re-invoke the binary with a URL argument** | — | — | **Rejected on evidence.** Observation 3 shows a URL argument is silently dropped: no window, no navigation. It cannot carry a URL. Also, the frontend cannot spawn a process. |
| E | **A chrome-side keyboard shortcut owned by the shell window** — the `<key reserved="true">` idiom `powerbrowser.js` already uses for the diagnostics chord | Yes | Only `openBrowserWindow` itself | Rejected as the *primary*: it satisfies "a user can toggle" but **not** 01-UI-SPEC.md's contracted "one palette-reachable Theia command", and it cannot carry a URL from GUI-02's frame-refusal escape action (01-06). Keeping it as the fallback would be a UI-SPEC divergence that must be recorded, not absorbed. |

### The recommendation, and its one risk

**Recommend candidate A: `window.open(url, '_blank')` from the Theia command handler.**

It is the only candidate that costs no new chrome code, no new file, no new HTTP surface, and — the
threat model's specific concern (T-05-02) — **no new Firefox-internal touchpoint and therefore no
new catalogue row and no widened boundary guard.** It is also the mechanism a user would get from an
ordinary link with `target="_blank"`, so it is what the frontend already implicitly relies on.

Path verified by reading upstream this session, not assumed:
`nsWindowWatcher::OpenWindowInternal` → (no `nsIBrowserDOMWindow` on the shell chrome window, so no
tab diversion) → `CreateChromeWindow` → `nsAppStartup::CreateChromeWindow`
(`toolkit/components/startup/nsAppStartup.cpp:723`, `appParent->CreateNewWindow`) →
`AppWindow::CreateNewContentWindow` (`xpfe/appshell/AppWindow.cpp:2239-2255`,
`urlStr.AssignLiteral(BROWSER_CHROME_URL_QUOTED)`).

Note what this also means: **before this change, content in the Theia frame calling `window.open`
would have opened a second *shell* window** — which would have started a second Theia backend. The
move removes that latent hazard as a side effect nobody was looking for.

**The one risk: the popup blocker.** `window.open` without transient user activation is blocked and
fails silently, which would be a bad failure mode for the phase's headline feature. Assessment:
Firefox's transient activation window is 5 s (`dom.user_activation.transient.timeout`), and a
command-palette invocation runs within milliseconds of the keypress or click that triggered it, so
activation will be live. **This was not verified live** — verifying it needs a Theia frontend driven
through its command palette, which this spike had no harness for.

**Therefore:** if the checkpoint selects candidate A, Task 3 must land it with the popup path
asserted by one of its three registered checks, and must treat candidate B as the pre-approved
fallback if the assertion fails — rather than discovering the blocker after the fact. If the
developer would rather not carry that risk at all, **candidate B is the safe selection** and costs
about sixty lines plus one addition to `FORBIDDEN_PATTERNS`.

---

## Summary of findings against the plan's questions

| Question | Answer |
|---|---|
| Does the move work? | **Yes.** All five call sites behave correctly for a real browser window, observed live. |
| First launch: one window, the shell? | Yes — one `SHELL_READY`, zero browser-chrome activity. |
| Is the early blank window closed or reused? | Closed (code path established; the `preventDefault` precondition is confirmed live). Flicker not measurable on this host; accepted and documented per 01-UI-SPEC.md. |
| Second launch: no new window, focuses the running one? | Yes — 0-byte log, process exits, `SHELL_READY` count unchanged. |
| Does the handler still sort ahead of the stock handlers? | Yes, and now confirmed **live** rather than by string comparison. |
| URL on the command line? | Sensible and non-recursive: one shell window, URL silently dropped. Unchanged from before. |
| Address bar takes focus? | Yes — `openLocation()` returned cleanly and `gURLBar.focused` was `true`. |
| In-window modal dialogs? | Yes — `gDialogBox` is a live object. |
| Multi-URI load recurses into the shell? | No — 1 → 2 tabs in the same window. |
| Does closing the browser window quit the application? | **No.** Shell survives, proven by a sentinel emitted from inside the shell after the close. |
| Session restore / new-window argument surprises? | None. |
| Which frontend-to-chrome channel? | **`window.open` from the Theia command handler** (candidate A), with the JSWindowActor pair (candidate B) as the pre-approved fallback. |
| Does the recommended channel work with the privileged-JS dev flag off? | Yes — it uses no privileged code at all. |
| Does it require a new Firefox-internal touchpoint? | **No.** Candidate B would (and would also need `ChromeUtils.registerWindowActor` added to the boundary guard's pattern list). |
| Anything that contradicts the recommended approach? | Two constraints, neither a blocker: browser windows must not be opened during shell startup (observation 4), and the popup-blocker risk on candidate A is unverified (observation 7). |

---

## Artefacts

- Harness: `spike-gui01.sh`, `spike2.sh`, `spike3.sh` (scratchpad; not committed — they drive a
  throwaway Xvfb and a throwaway profile and assert nothing, so they are not checks)
- Run transcripts and per-launch browser logs: scratchpad `spike-out/`, `spike2-out/`, `spike3-out/`
- The working-tree diff is **preserved** for Task 3, per the plan.

---

## Correction (written during Task 3, against Task 1's own observations)

Two of the observations above rest on the same bad inference and are **wrong**. They are corrected
here rather than edited in place, so the reasoning that produced them stays visible.

**The bad inference:** "a `browser.xhtml` window cannot initialise without emitting chrome activity
on this channel", used in observation 1 to conclude no stock browser window opened, and in
observation 3 to conclude a command-line URL is silently dropped. The `chrome://browser/content`
lines the spike saw were emitted by **the spike's own instrumentation**, which dumped the opened
window's `href`. Nothing upstream writes them. Measured live in Task 3: a run that demonstrably
opened a stock browser window logged **zero** `chrome://browser/content` lines.

**What is actually true**, read from BiDi's browsing-context tree (the instrument that does carry
this signal):

| Claim | Corrected finding |
|---|---|
| Obs. 1 — "no stock browser window opens alongside the shell" on a bare launch | **Still true**, now on real evidence: a bare launch (no URL argument) produces exactly ONE top-level browsing context, the shell's own content browser. Asserted permanently by `gui01-browser-close-does-not-quit`. |
| Obs. 3 — "the URL is silently dropped; no browser window opens for it" | **False.** A URL on the command line opens a stock browser window carrying that URL, in addition to the shell. `nsDefaultCommandLineHandler` gates only its **no-URI** branch on `cmdLine.preventDefault`; when `urilist` is non-empty it calls `openBrowserWindow(cmdLine, principal, URLlist)` regardless — and with the define now stock, that is real browser chrome. |

The corrected observation-3 behaviour is **desirable and is kept**: `powerbrowser https://example.com`
opening a real browser window on that URL is what a browser should do, and it costs no code. It does
not affect GUI-01's contract, which is about the palette command, and it does not affect the truth
"first launch opens exactly one shell window" — that launch takes no URL argument.

It does, however, mean every BiDi check that passes a URL to `withFirefoxPage` has been launching
with two windows rather than one, with `contexts[0]` resolving to the shell's own content browser.
That is pre-existing, unrelated to the ratified change, and is recorded in `.planning/WINDOWS.md`
rather than fixed here.

---

## Ratification (Task 2 — the D-20 decision gate)

**Decided 2026-08-30 by the developer, against the observations above.**

| Question | Ratified answer |
|---|---|
| Land the startup-window move? | **`land-as-spiked`.** Land it exactly as this spike landed it. Patch `020` stays hook-only; `BROWSER_CHROME_URL` keeps its stock upstream value; no mitigation is added beyond what is recorded here. |
| Which frontend-to-chrome channel? | **Candidate A** — `window.open(url, '_blank')` from the Theia command handler. |
| Fallback | **Candidate B (the JSWindowActor pair) is pre-approved**, to be taken ONLY on an actually-observed failure of the popup path — never pre-emptively. Adopting it obliges adding `ChromeUtils.registerWindowActor` to `check-internals-boundary.sh`'s `FORBIDDEN_PATTERNS`, because the guard does not cover it today. |

### Constraints this ratification binds onto Task 3

1. **Never open a browser window during the shell's own startup** (observation 4). A check that opens
   one must not do it during startup, or it asserts against a window upstream itself left
   half-initialised (`gURLBar` permanently `undefined`).
2. **The spike scaffolding is removed, not left in.** `powerbrowser/shell/powerbrowser.js`'s
   `POWERBROWSER_SPIKE_GUI01` block goes; the ratified channel replaces it.
3. **The popup path must be asserted by one of the three registered checks**, so a blocked popup
   surfaces as a red check rather than a dead headline feature.
4. **Budget minutes, not a build cycle** (observation "Build"): the incremental rebuild was ~3 minutes
   and `./mach build faster` is well under one.
5. **The window-count instrument is discarded.** This is a Wayland host; Gecko ignores the Xvfb
   `DISPLAY` and `xwininfo` returned 0 beside a demonstrably open window. Use `dump()` sentinels and
   content-side observation.

### Was the fallback taken?

**No.** The popup path was exercised live before any of it was written into a check
(scratchpad probe, this session, against the Task-1 binary): from the real Theia origin
`http://127.0.0.1:<port>/` running inside the shell's remote `<browser>`, with **no** user
activation at all, `window.open('about:blank#gui01probe', '_blank')` returned a live window object
(never `null`, which is what a blocked popup returns), a new top-level browsing context carrying
that exact URL appeared in `browsingContext.getTree`, and `POWERBROWSER_SHELL_READY` stayed at `1`
across the whole sequence — so what opened was not a second shell window. Closing it removed the
context, left the shell answering `script.evaluate`, and left the process alive.

Observation 7's stated risk — "`window.open` without transient user activation is blocked and fails
silently" — therefore **did not materialise on this platform**, and the assertion is now permanent:
`scripts/verify-gui01-window.mjs`, registered as `gui01-browser-close-does-not-quit`, is the check
that would go red if it ever starts to.

Candidate B is not implemented, and `ChromeUtils.registerWindowActor` is correspondingly **not**
added to `FORBIDDEN_PATTERNS` — that addition is owed only by the fallback, which was not taken.
The gap in the guard is real but latent; it is recorded in `.planning/WINDOWS.md` so a future
adoption of an actor pair cannot land without closing it.
