/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * D-89/D-94/SHELL-05: the chrome bootstrap for powerbrowser.xhtml. A classic
 * script (not a module) -- ES modules are reached from here via
 * ChromeUtils.importESModule, matching the Picture-in-Picture player
 * window's own pattern.
 *
 * The POWERBROWSER_SHELL_READY sentinel is written to stdout via dump() as
 * the very first thing this handler does, before any other bootstrap
 * work -- SHELL-05's ordering assertion (shell paints before backend
 * work is even attempted) can never be satisfied by accident.
 */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    dump("POWERBROWSER_SHELL_READY chrome://powerbrowser/content/powerbrowser.xhtml\n");

    const { PowerBrowserAPI } = ChromeUtils.importESModule("chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs");

    const browserElement = document.getElementById("powerbrowser-content");
    const loadingElement = document.getElementById("powerbrowser-loading");
    const errorElement = document.getElementById("powerbrowser-error");
    const errorMessageElement = document.getElementById("powerbrowser-error-message");
    const errorRetryButton = document.getElementById("powerbrowser-error-retry");
    const errorDiagnosticsButton = document.getElementById("powerbrowser-error-diagnostics");
    const diagnosticsElement = document.getElementById("powerbrowser-diagnostics");
    const diagnosticsFieldsElement = document.getElementById("powerbrowser-diagnostics-fields");
    const diagnosticsLogElement = document.getElementById("powerbrowser-diagnostics-log");
    const diagnosticsCloseButton = document.getElementById("powerbrowser-diagnostics-close");
    // The deck's RESOLVED visibility, on the same dump() sentinel channel as
    // everything else here. This is the only assertion available on Linux
    // that observes the chrome document's rendered state at all: BiDi's
    // browsingContext tree contains only the content <browser> (so a
    // screenshot or a #theia-app-shell query passes with Theia fully
    // occluded), and chrome-context Marionette is platform-blocked
    // (WINDOWS.md #7). Computed style is the right invariant because it
    // catches a dropped inline attribute AND a bad stylesheet rule -- the two
    // ways this deck has actually broken. Emitted from exactly two sites: the
    // swap (where all three layers must be gone) and the error (where one
    // must not be), which is enough for a negative assertion and its
    // positive control without touching any other path.
    const dumpDeckState = (where) =>
      dump(
        `POWERBROWSER_DECK_STATE ${JSON.stringify({
          loading: window.getComputedStyle(loadingElement).display,
          error: window.getComputedStyle(errorElement).display,
          diagnostics: window.getComputedStyle(diagnosticsElement).display,
          where,
        })}\n`
      );

    // WebDriver finds content browsing contexts through `win.gBrowser.tabs`
    // (remote/shared/TabManager.sys.mjs) and identifies each one by its
    // browser's `permanentKey` (remote/shared/NavigableManager.sys.mjs returns
    // a null context id without one). The shell is deliberately not Firefox
    // chrome and has no tabbrowser, so it presents its single browser through
    // that same shape -- also the seed of the chrome-owned tab model the
    // post-4.0 bridge needs.
    browserElement.permanentKey = PowerBrowserAPI.createPermanentKey();
    window.gBrowser = { tabs: [{ linkedBrowser: browserElement }] };

    // Exposed for plan 04-04's TheiaService.sys.mjs to call once the
    // backend is ready: navigates the content browser to the Theia
    // backend's URL and hides the branded loading layer. The navigation
    // itself goes through PowerBrowserAPI.loadURIInBrowser -- both
    // fixupAndLoadURIString and nodePrincipal are privileged chrome API and
    // belong behind the one boundary file, not here.
    window.powerbrowserSwapToUrl = function powerbrowserSwapToUrl(url) {
      dump(`POWERBROWSER_SHELL_SWAP ${url}\n`);
      PowerBrowserAPI.loadURIInBrowser(browserElement, url);
      loadingElement.style.display = "none";
      dumpDeckState("swap");
    };

    window.powerbrowserGetBrowser = function powerbrowserGetBrowser() {
      return browserElement;
    };

    // SHELL-03 (05-02): the error layer, reached by TheiaService exactly
    // the same way powerbrowserSwapToUrl is -- through this window's exposed
    // globals, never by touching browserElement's own location (D-114).
    // Neither the message text nor either sentinel may ever carry the
    // per-launch token or any credential; TheiaService's `reason` strings
    // are always static/derived-from-config text, never the token, and
    // `detail` here carries only `reason` and `recoverable`.
    window.powerbrowserShowError = function powerbrowserShowError(detail) {
      const { reason, recoverable } = detail;
      errorMessageElement.textContent = reason;
      errorElement.style.display = "flex";
      dump(`POWERBROWSER_SHELL_ERROR ${JSON.stringify({ reason, recoverable })}\n`);
      dumpDeckState("error");
    };

    window.powerbrowserHideError = function powerbrowserHideError() {
      errorElement.style.display = "none";
      dump(`POWERBROWSER_SHELL_ERROR_CLEARED ${JSON.stringify({})}\n`);
    };

    window.powerbrowserRetry = function powerbrowserRetry() {
      errorElement.style.display = "none";
      TheiaService.retry();
    };

    errorRetryButton.addEventListener("click", () => {
      window.powerbrowserRetry();
    });

    // SHELL-04 (05-03): the diagnostics layer, third member of the deck.
    // Snapshot-on-open only (D-118's recorded decision -- no live polling
    // loop), reached by the Ctrl+Alt+Shift+D chord below or this button.
    // Renders exactly the objects TheiaService's existing state/log
    // accessors return, plus the identity accessor -- no new data plumbing.
    // Every rendered value is a text node, never an assigned markup string, and
    // neither the rendered layer nor its sentinel ever carries the
    // per-launch token, a cookie value, or any other credential.
    //
    // Toggles: calling this while the layer is already visible hides it
    // instead, so the same chord opens and closes. A sentinel line is
    // written on EVERY call (open or close) -- the field values only,
    // never the log text itself.
    window.powerbrowserShowDiagnostics = function powerbrowserShowDiagnostics() {
      const state = TheiaService.getState();
      const log = TheiaService.getRecentLog();
      const identity = PowerBrowserAPI.getAppIdentity();
      const sentinel = {
        port: state.port,
        pid: state.pid,
        healthy: state.healthy,
        restartCount: state.restartCount,
        name: identity.name,
        vendor: identity.vendor,
        version: identity.version,
        logLines: log.length,
      };

      // Resolved value, not the inline one: the layer's hidden DEFAULT comes
      // from powerbrowser.css (the CSP drops a style attribute -- see that
      // file's header), so `.style.display` reads "" until the first CSSOM
      // write and `!== "none"` would report a never-opened layer as visible,
      // making the first chord press hide something already hidden.
      const wasVisible = window.getComputedStyle(diagnosticsElement).display !== "none";
      if (wasVisible) {
        diagnosticsElement.style.display = "none";
        dump(`POWERBROWSER_DIAGNOSTICS ${JSON.stringify(sentinel)}\n`);
        return;
      }

      diagnosticsFieldsElement.textContent = "";
      const rows = [
        ["Port", state.port],
        ["Process ID", state.pid],
        ["Health", state.healthy ? "healthy" : "unhealthy"],
        ["Restart count", state.restartCount],
        ["Name", identity.name],
        ["Vendor", identity.vendor],
        ["Version", identity.version],
      ];
      for (const [label, value] of rows) {
        const row = document.createElement("div");
        row.textContent = `${label}: ${value}`;
        diagnosticsFieldsElement.appendChild(row);
      }
      diagnosticsLogElement.textContent = log.join("\n");

      diagnosticsElement.style.display = "flex";
      dump(`POWERBROWSER_DIAGNOSTICS ${JSON.stringify(sentinel)}\n`);
    };

    window.powerbrowserHideDiagnostics = function powerbrowserHideDiagnostics() {
      diagnosticsElement.style.display = "none";
    };

    diagnosticsCloseButton.addEventListener("click", () => {
      window.powerbrowserHideDiagnostics();
    });

    errorDiagnosticsButton.addEventListener("click", () => {
      window.powerbrowserShowDiagnostics();
    });

    // Task 2 (04-03) proof-of-resolution: import PowerBrowserAPI.sys.mjs and
    // read back two sidecar prefs through it, emitting an additional
    // sentinel. Left in place -- plan 04-04 keeps it.
    const backendMain = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.backendMain", "");
    const nodePath = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.nodePath", "");
    dump(`POWERBROWSER_SIDECAR_PREFS backendMain=${backendMain} nodePath=${nodePath}\n`);

    // D-119/D-120 (05-03): the startup identity sentinel. Written once per
    // launch, from the SAME accessor the diagnostics layer's show global
    // reads, so the repointed branding-identity check (D-120) and the
    // rendered surface can never disagree. Deterministic and headless-safe
    // -- unlike the diagnostics sentinel above, this never depends on the
    // chord or a chrome driver.
    dump(`POWERBROWSER_APP_IDENTITY ${JSON.stringify(PowerBrowserAPI.getAppIdentity())}\n`);

    // 04-04: hand off to the backend supervisor. The shell-ready sentinel
    // above is already written -- nothing in this spawn path may run
    // before it.
    const { TheiaService } = ChromeUtils.importESModule("chrome://powerbrowser/content/TheiaService.sys.mjs");
    // Announce shell readiness the way Firefox's own chrome does, so WebDriver
    // will create a session against the shell window.
    PowerBrowserAPI.notifyStartupFinished(window);

    TheiaService.start(browserElement);

    // D-118: the diagnostics layer's reserved global chord, immune to a
    // focused content <browser> swallowing it -- the XUL <keyset>/<key
    // reserved="true"> mechanism Firefox's own global shortcuts (Ctrl+T,
    // Ctrl+L, ...) use, not a raw keydown listener (RESEARCH.md Pattern 6).
    // Research confirmed zero three-modifier chords are claimed anywhere in
    // the pinned Theia packages. The same chord closes the layer when it is
    // already open (powerbrowserShowDiagnostics's own toggle).
    const diagnosticsKeyset = document.createXULElement("keyset");
    const diagnosticsKey = document.createXULElement("key");
    diagnosticsKey.setAttribute("id", "powerbrowser-diagnostics-key");
    diagnosticsKey.setAttribute("modifiers", "accel,alt,shift");
    diagnosticsKey.setAttribute("key", "D");
    diagnosticsKey.setAttribute("reserved", "true");
    diagnosticsKey.addEventListener("command", () => {
      window.powerbrowserShowDiagnostics();
    });
    diagnosticsKeyset.appendChild(diagnosticsKey);
    document.documentElement.appendChild(diagnosticsKeyset);

    // ---- SPIKE SCAFFOLDING (01-05 Task 1, D-20) ----------------------------
    // Env-gated GUI-01 probe. Exercises PowerBrowserAPI.openBrowserWindow()
    // against the live build and dumps, on the same dump() sentinel channel
    // everything else here uses, what the five upstream call sites that read
    // the compiled browser-chrome-URL constant can now actually see. This is
    // spike instrumentation, not a feature: it is replaced in Task 3 by the
    // frontend-to-chrome channel the Task 2 checkpoint ratifies, and it does
    // nothing at all unless POWERBROWSER_SPIKE_GUI01 is set in the
    // environment. The stock constant is written out as a literal here rather
    // than read from AppConstants because AppConstants is on the
    // internals-boundary guard's forbidden list for every file except
    // PowerBrowserAPI.sys.mjs.
    const spikeMode = PowerBrowserAPI.getEnv("POWERBROWSER_SPIKE_GUI01");
    if (spikeMode) {
      const STOCK_CHROME_URL = "chrome://browser/content/browser.xhtml";
      const spike = (phase, extra) =>
        dump(`POWERBROWSER_SPIKE_GUI01 ${JSON.stringify({ phase, ...extra })}\n`);
      // `late` defers the open until well after startup has settled, to tell
      // "opening a browser window is broken" apart from "opening one DURING
      // the shell's own startup is too early".
      const openDelay = spikeMode === "late" || spikeMode === "lastwindow-late" ? 25000 : 0;
      window.setTimeout(() => runSpike(), openDelay);
      function runSpike() {
      try {
        const bwin = PowerBrowserAPI.openBrowserWindow("about:blank");
        spike("opened", { href: bwin.location.href, isStock: bwin.location.href === STOCK_CHROME_URL, openDelay });

        const snapshot = (phase, waited) => {
          const doc = bwin.document;
          const root = doc && doc.documentElement;
          spike(phase, {
            waited,
            href: bwin.location.href,
            isStock: bwin.location.href === STOCK_CHROME_URL,
            readyState: doc ? doc.readyState : null,
            rootId: root ? root.id : null,
            windowtype: root ? root.getAttribute("windowtype") : null,
            chromehidden: root ? root.getAttribute("chromehidden") : null,
            hasUrlbarElement: !!(doc && doc.getElementById("urlbar")),
            hasToolbox: !!(doc && doc.getElementById("navigator-toolbox")),
            hasTabbrowserElement: !!(doc && doc.getElementById("tabbrowser-tabpanels")),
            gURLBarType: typeof bwin.gURLBar,
            gBrowserType: typeof bwin.gBrowser,
            gDialogBoxType: typeof bwin.gDialogBox,
            hasBrowserCommands: typeof bwin.BrowserCommands,
          });
        };

        let waited = 0;
        const poll = window.setInterval(() => {
          waited += 250;
          if (waited % 2000 === 0) {
            snapshot("snapshot", waited);
          }
          if (!bwin.gURLBar && waited < 20000) {
            return;
          }
          window.clearInterval(poll);
          if (!bwin.gURLBar) {
            snapshot("timeout", waited);
            return;
          }

          // browser.js:4677 nulls gDialogBox when location.href !=
          // BROWSER_CHROME_URL -- a non-null gDialogBox is the in-window
          // modal-dialog capability. browser-commands.js:297 (openLocation)
          // is the address-bar-focus branch, browser.js:1312
          // (loadOneOrMoreURIs) is the multi-URI-recursion branch; both key
          // on the same equality.
          spike("loaded", {
            href: bwin.location.href,
            isStock: bwin.location.href === STOCK_CHROME_URL,
            hasDialogBox: bwin.gDialogBox !== null && bwin.gDialogBox !== undefined,
            hasURLBar: !!bwin.gURLBar,
            hasTabbrowser: !!(bwin.gBrowser && bwin.gBrowser.tabs),
            tabCount: bwin.gBrowser && bwin.gBrowser.tabs ? bwin.gBrowser.tabs.length : -1,
            waited,
          });

          // The live address-bar-focus test: openLocation() takes the
          // "not a browser window, redirect elsewhere" branch (opening a
          // whole extra window) unless the equality above holds.
          const tabsBefore = bwin.gBrowser.tabs.length;
          let openLocationError = null;
          try {
            bwin.openLocation();
          } catch (e) {
            openLocationError = String(e);
          }
          // browser.js:1312 loadOneOrMoreURIs: when the equality fails it
          // openDialog()s BROWSER_CHROME_URL -- i.e. recurses into whatever
          // the compiled define names. When it holds, it loads the URIs as
          // tabs in THIS window.
          let multiUriError = null;
          try {
            bwin.loadOneOrMoreURIs("about:blank|about:logo");
          } catch (e) {
            multiUriError = String(e);
          }
          window.setTimeout(() => {
            spike("open-location", {
              openLocationError,
              urlbarFocused: !!(bwin.gURLBar && bwin.gURLBar.focused),
              multiUriError,
              tabsBefore,
              tabsAfterMultiUri: bwin.gBrowser ? bwin.gBrowser.tabs.length : -1,
            });

            if (spikeMode === "lastwindow" || spikeMode === "lastwindow-late") {
              // Observation 5b: leave the browser window as the LAST window
              // by closing the shell first, then close it.
              spike("closing-shell-first", {});
              window.setTimeout(() => {
                bwin.close();
                spike("closed-browser-last", {});
              }, 1500);
              window.close();
              return;
            }

            bwin.close();
            spike("closed-browser", {});
            window.setTimeout(() => {
              spike("still-alive-after-close", { shellStillHere: true });
            }, 3000);
          }, 1000);
        }, 250);
      } catch (err) {
        spike("threw", { error: String(err) });
      }
      }
    }
    // ---- END SPIKE SCAFFOLDING -------------------------------------------
  },
  { once: true }
);
