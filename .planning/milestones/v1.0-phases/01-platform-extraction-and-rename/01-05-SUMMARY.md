---
phase: 01-platform-extraction-and-rename
plan: 05
subsystem: gecko-shell + theia-frontend + verification
tags: [gui-01, gui-04, startup-window, command-line-handler, window-open, patch-chain, verification]
status: complete

requires:
  - "01-04: a built, booting objdir/dist/bin/powerbrowser and the re-derived patch chain"
  - "01-04: scripts/verify-platform.sh as the single consolidated check driver"
provides:
  - "GUI-01: a palette-reachable 'Open Browser Window' command that opens stock Firefox chrome"
  - "GUI-04: startup-window selection in the command-line handler, not a compiled brand define"
  - "powerbrowser.open-browser-window command id, exported for plan 01-06's GUI-02 escape action"
  - "three registered GUI-01 checks in the consolidated verifier"
  - "withFirefoxPage stdout capture + top-level browsing-context enumeration"
affects:
  - "Phase 5 (MIG-05): 020-powerbrowser-shell.patch is now a hook-only patch with no brand value"
  - "Plan 01-06: GUI-02's frame-refusal escape action invokes the exported command id"

tech-stack:
  added: []
  patterns:
    - "frontend-to-chrome via bare window.open from content -- no privileged code, no new internals touchpoint"
    - "window existence asserted from BiDi's browsing-context tree, never from a log grep or an X window count"

key-files:
  created:
    - theia/extensions/tab-uris/src/browser/browser-window-command.ts
    - scripts/verify-gui01-window.mjs
    - scripts/verify-gui01-command.mjs
  modified:
    - powerbrowser/shell/PowerBrowserAPI.sys.mjs
    - powerbrowser/shell/powerbrowser.js
    - powerbrowser/shell/moz.build
    - powerbrowser/INTERNAL-APIS.md
    - patches/020-powerbrowser-shell.patch
    - theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts
    - scripts/lib/firefox-bidi.mjs
    - scripts/verify-platform.sh
    - docs/URI-SCHEMES.md
    - .planning/phases/01-platform-extraction-and-rename/01-SPIKE-GUI-01.md

decisions:
  - "Ratified land-as-spiked: the compiled BROWSER_CHROME_URL override is gone and startup-window selection lives in PowerBrowserSingleInstanceHandler"
  - "Ratified candidate A: window.open('_blank') from the Theia command handler is the frontend-to-chrome channel; the JSWindowActor fallback was NOT taken"
  - "The popup path is asserted by a registered check rather than trusted, because a blocked popup fails silently"
  - "Window existence is read from BiDi's browsing-context tree; the spike's log-grep and X-window instruments are both discarded as non-discriminating"
  - "A command-line URL opening a stock browser window is kept as desirable behaviour, not suppressed"

metrics:
  duration: ~50 min (continuation session; Task 1 ran previously)
  completed: 2026-08-31

actuals:
  tokens: 41000
  tasks: 3
  commits: 4
---

# Phase 01 Plan 05: Reach the Browser Window Summary

GUI-01 and GUI-04 land together: startup-window selection moved out of a compiled brand define and
into the command-line handler, and a palette-reachable Theia command now opens stock Firefox chrome
through a bare `window.open` — no privileged code, no new Firefox-internal touchpoint, and no new
catalogue row.

## What was built

**Task 1 (previous session, commits `56becff` and `50a610d`).** The D-20 spike: the handler gained an
initial-launch branch, patch `020` lost its `BROWSER_CHROME_URL` override hunk and was re-derived from
a patched tree, and all seven observations were recorded in `01-SPIKE-GUI-01.md` against a live build.

**Task 2 (commit `e18920e`).** The decision gate. Ratified **`land-as-spiked`** with **candidate A**
(`window.open(url, '_blank')` from the Theia command handler), with candidate B — the JSWindowActor
pair — pre-approved as a fallback only on an observed popup failure. The ratification, the five
constraints it binds onto Task 3, and the evidence that the fallback was not needed are recorded in
the spike report.

**Task 3 (commit `4074930`).**

- **Chrome side: nothing added, scaffolding removed.** The env-gated `POWERBROWSER_SPIKE_GUI01` block
  is gone from `powerbrowser.js`, replaced by a comment explaining why the ratified channel needs no
  chrome-side code: the shell window carries no `nsIBrowserDOMWindow`, so a content `window.open`
  falls through `nsWindowWatcher` to `nsAppStartup::CreateChromeWindow` →
  `AppWindow::CreateNewContentWindow`, which opens `BROWSER_CHROME_URL` — now stock upstream browser
  chrome, because patch `020` no longer overrides it.
- **`PowerBrowserAPI.sys.mjs` was deliberately not touched.** Task 1 already added and catalogued
  `openShellWindow`, `openBrowserWindow(url)` and `isInitialLaunch(cmdLine)`. The internals catalogue
  is keyed on line numbers, so an unnecessary edit would have churned every row below it for no gain.
  `openBrowserWindow` stays as candidate B's landing point and as the API the spike drove observation 4
  through.
- **Theia side:** `browser-window-command.ts` exports `OPEN_BROWSER_WINDOW_COMMAND_ID`
  (`powerbrowser.open-browser-window`) and a contribution registering the UI-SPEC's contracted label
  **"Open Browser Window"**, bound statically in the frontend module for the D-50 contribution-caching
  reason the open handlers are. A blocked popup returns `null` rather than throwing, so the null is
  turned into an error naming the contribution and what to do instead.
- **Three registered checks**, all in the consolidated verifier, none opening a browser window during
  shell startup (the spike's binding constraint):

  | Label | Asserts |
  |---|---|
  | `gui01-single-shell-window` | Exactly one `POWERBROWSER_SHELL_READY` on first launch; the second launch against the same profile exits, the first survives, and the count is still 1 |
  | `gui01-browser-close-does-not-quit` | A bare launch produces exactly one top-level browsing context (the shell alone); `window.open` from the real Theia origin is **not popup-blocked**; a new context carrying the exact URL appears; the SHELL_READY count stays 1 (so it is stock chrome, not a second shell); closing it removes the context and leaves the application answering and alive (T-05-04) |
  | `gui01-command-registered` | The exported command id is in the live frontend's `CommandRegistry`, is in `registry.commands` (which is what the palette enumerates), and carries the UI-SPEC's exact label |

- **`docs/URI-SCHEMES.md`** gains a "browser-window destination" section carrying the id and label
  verbatim from the source, plus the accepted startup flicker as documented behaviour.

## Verification

| Check | Result |
|---|---|
| `grep 'BROWSER_CHROME_URL' patches/020-powerbrowser-shell.patch` | 0 matches |
| Patch chain, non-vacuous (`reset --hard` + `prune --expire=now`, then apply) | both patches applied cleanly and reported non-vacuous; second consecutive run failed by name |
| `check-patch-surface.sh`, `apply-patches.sh --self-test` | PASS |
| `check-internals-boundary.sh`, `--catalogue`, `--self-test` | PASS (self-test still goes red on a planted offense and on a removed catalogue row) |
| `tsc -b extensions/tab-uris` | exit 0 |
| `mach build` + `smoke-firefox.sh` | exit 0 / PASS (~3 min incremental, not the plan's ~40 — the spike's corrected budget held) |
| `yarn build` (Theia) | 0 errors; command id present in the frontend bundle |
| `verify-platform.sh --only gui01-single-shell-window` | PASS |
| `verify-platform.sh --only gui01-browser-close-does-not-quit` | PASS |
| `verify-platform.sh --only gui01-command-registered` | PASS |
| `node scripts/verify-branding-identity.mjs` | PASS — all six surfaces |
| `scripts/verify-endpoints.sh` | PASS — all resolved hosts allowlisted after the change |
| `verify-platform.sh --quick` (15 static checks) | PASS |
| `node scripts/scan-brand-residue.mjs` | PASS, 101 files, exit 0 |

`objdir/dist/bin/powerbrowser --version` still reports `DeBIOS powerbrowser 153.1.0esr`.

## Deviations from Plan

### 1. [Rule 1 — Bug] Two spike observations rested on a non-discriminating instrument

**Found during:** Task 3, while proving the first-launch window-composition assertion could go red.

**Issue.** `01-SPIKE-GUI-01.md` observations 1 and 3 both inferred "no browser window opened" from the
absence of `chrome://browser/content` lines in the launch log, on the stated premise that "a
`browser.xhtml` window cannot initialise without emitting chrome activity on this channel". That
premise is false: those lines came from **the spike's own instrumentation**, which dumped the opened
window's `href`. Nothing upstream writes them. Measured live: a run that demonstrably opened a stock
browser window logged **zero** such lines. Had this shipped, `gui01-single-shell-window` would have
carried a green assertion that could never go red — a broken window in the check suite itself.

**Consequence for observation 3.** "A command-line URL is silently dropped" is also **false**. A URL
argument opens a stock browser window carrying that URL, in addition to the shell:
`nsDefaultCommandLineHandler` gates only its **no-URI** branch on `cmdLine.preventDefault`, and takes
the URI branch regardless. Verified directly — launching with `about:license` produces a second
top-level browsing context at exactly that URL.

**Fix.** The log-grep assertion was removed from `gui01-single-shell-window` rather than left in, and
window composition moved to `gui01-browser-close-does-not-quit`, which reads BiDi's browsing-context
tree — the instrument that does carry the signal, and which is demonstrably discriminating in both
directions (1 context on a bare launch, 2 with a URL argument, 2 after `window.open`). The spike
report gained a "Correction" section stating both errors plainly rather than editing them away.

**Kept, not suppressed:** `powerbrowser https://example.com` opening a real browser window on that
URL is what a browser should do, costs no code, and does not touch GUI-01's contract or the truth
"first launch opens exactly one shell window" (that launch takes no URL argument).

**Files:** `scripts/verify-platform.sh`, `scripts/verify-gui01-window.mjs`,
`scripts/lib/firefox-bidi.mjs`, `01-SPIKE-GUI-01.md`. **Commit:** `4074930`.

### 2. [Rule 3 — Blocking] `verify-gui01-command.mjs` read the command registry before it was populated

**Found during:** Task 3, first run of `gui01-command-registered` — it failed reporting the command
absent from a registry holding **one** command.

**Issue.** `window.theia.container` exists long before contributions are enumerated: Theia builds the
container first and runs each `FrontendApplicationContribution.onStart` afterwards, which is where
`CommandRegistry` enumerates its `CommandContribution`s. Waiting only for the container therefore
reads an unpopulated registry, and the check reported the wrong cause.

**Fix.** The check now waits for `#theia-app-shell` and then for the registry to hold more than one
command, and its non-vacuity guard rejects `total <= 1` **by name** ("its contributions were never
enumerated") so that timing failure can never again be reported as an absent command. Confirmed
directly against the live frontend: 1020 commands, `getCommand(...)` truthy.

**Files:** `scripts/verify-gui01-command.mjs`. **Commit:** `4074930`.

### 3. [Rule 3 — Blocking] `withFirefoxPage` could not launch without a URL argument

**Found during:** Task 3, as a direct consequence of deviation 1.

**Issue.** Every `withFirefoxPage` launch passes a URL on the command line, which — per deviation 1 —
opens a stock browser window of its own. The "the shell opened alone" assertion is impossible from
such a launch, because the baseline already has two contexts.

**Fix.** An empty `url` now means "no URL argument at all", with the reason recorded at the spawn
site. No existing caller passes an empty url, so no behaviour changed for anything else.

**Files:** `scripts/lib/firefox-bidi.mjs`. **Commit:** `4074930`.

### 4. [Scope] `PowerBrowserAPI.sys.mjs` and `theia/extensions/tab-uris/package.json` not modified

Both are listed in the plan's `files_modified`. Task 1 had already made every chrome-side change the
plan asked for, and the catalogue is line-number keyed, so a cosmetic edit would have churned rows for
nothing. `package.json` already depends on `@theia/core@1.74.1`, which is all the new command needs,
and no new dependency was introduced — so nothing was added to a file that did not need it.

## Was the pre-approved fallback taken?

**No.** Candidate B (the JSWindowActor pair) is not implemented, so
`ChromeUtils.registerWindowActor` was correspondingly **not** added to
`check-internals-boundary.sh`'s `FORBIDDEN_PATTERNS` — that addition is owed only by the fallback.
The popup path was exercised live before it was written into a check: from
`http://127.0.0.1:<port>/` inside the shell's remote `<browser>`, with **no** user activation,
`window.open` returned a live window (never `null`, which is what a blocked popup returns), and a new
top-level context carrying the exact URL appeared. The registered check
`gui01-browser-close-does-not-quit` is now what goes red if that ever changes, and its failure message
names candidate B and the guard-pattern obligation that comes with it.

The latent gap in the boundary guard is recorded in `.planning/WINDOWS.md` so no future actor pair can
land without closing it.

## Threat Flags

None. The change introduces no new network endpoint, no new auth path, and no new file access. The
ratified channel adds no privileged surface at all: `window.open` is stock platform machinery, which
is what closes T-05-01 (it works with the privileged-JS development flag off because it uses no
privileged code) and T-05-02 (no new Firefox-internal touchpoint, no new catalogue row).
`verify-endpoints.sh` was re-run deliberately after the change per T-05-03 and still passes.
T-05-04 gained a permanent check; T-05-05 was confirmed live in the spike.

## Known Stubs

None. The spike scaffolding tracked as ledger entry 12 is removed and that entry is marked fixed.

## Deferred Issues

Two entries were appended to `.planning/WINDOWS.md`:

- `ChromeUtils.registerWindowActor` is absent from `FORBIDDEN_PATTERNS`. Latent, not exploited —
  nothing in-tree uses it, because the fallback was not adopted.
- Every `withFirefoxPage` caller that passes a URL launches two windows, and `contexts[0]` resolves to
  the shell's own supervised Theia frontend rather than the URL passed — so the four
  `_run_app_check_mjs` checks boot a dev app at `localhost:3000` they then do not read. Pre-existing
  and unrelated to this change (out of scope), but now understood and recorded rather than mysterious.

## Self-Check: PASSED

All three created files exist on disk; all four commits (`56becff`, `50a610d`, `e18920e`, `4074930`)
resolve in `git log`.
