/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * D-96/D-97: the single anti-corruption layer. This is the ONLY file in
 * powerbrowser/ permitted to reach a Firefox internal (Services, Cc/Ci/Cr/Cu,
 * Subprocess, the cookie manager, quit observers) -- every method below is
 * a thin named wrapper with no policy of its own, so the audit surface at
 * the next ESR rebase is exactly this file. Every touchpoint is catalogued
 * in powerbrowser/INTERNAL-APIS.md (plan 04-05).
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Subprocess: "resource://gre/modules/Subprocess.sys.mjs",
  ctypes: "resource://gre/modules/ctypes.sys.mjs",
  // D-119 (05-03): MOZ_APP_VERSION_DISPLAY is a build-time preprocessor
  // substitution (config/version_display.txt), not a runtime API -- but
  // AppConstants is on the boundary guard's own forbidden-pattern list
  // (FORBIDDEN_PATTERNS), so it is reached here, in the one lazy-getter
  // block, rather than imported anywhere else.
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
});

// Strong references to in-flight one-shot timers created by sleep(). See the
// comment in sleep() -- without this they can be garbage-collected before they
// fire and the awaiting promise never settles.
const pendingTimers = new Set();

export const PowerBrowserAPI = Object.freeze({
  /**
   * Reads a string pref, returning `fallback` (never throwing) when the
   * pref is unset or holds a different type.
   */
  getStringPref(name, fallback) {
    try {
      return Services.prefs.getStringPref(name, fallback);
    } catch {
      return fallback;
    }
  },

  /**
   * Reads an int pref, returning `fallback` (never throwing) when the pref
   * is unset or holds a different type.
   */
  getIntPref(name, fallback) {
    try {
      return Services.prefs.getIntPref(name, fallback);
    } catch {
      return fallback;
    }
  },

  /** Reads an environment variable. */
  getEnv(name) {
    return Services.env.get(name);
  },

  /**
   * D-128 (CR-01 fix, 05-REVIEW.md): the absolute path of this launch's own
   * Firefox profile directory (`ProfD`), read straight off the platform's
   * directory service. Never throws: resolves "" on any failure, matching
   * getStringPref's never-throw convention -- a profile-key derivation that
   * can't read ProfD falls back to an unscoped default rather than crashing
   * startup (see TheiaService._profileStateKey).
   */
  getProfileDir() {
    try {
      return Services.dirsvc.get("ProfD", Ci.nsIFile).path;
    } catch {
      return "";
    }
  },

  /** Creates `path` and its parents if absent; a no-op if it already exists. */
  ensureDirectory(path) {
    return IOUtils.makeDirectory(path);
  },

  /**
   * Returns whether `path` exists, never throwing. D-113 (05-02): a
   * configured backend entry file that does not exist on disk is an
   * unrecoverable failure -- distinct from an unset pref -- and this is
   * how TheiaService tells the two apart before ever attempting a spawn.
   */
  pathExists(path) {
    return IOUtils.exists(path);
  },

  /**
   * D-119: the running application's identity -- brand name, vendor, and
   * display version -- read straight from the platform's own app-info
   * service and the build's display-version constant, never from a file
   * this project maintains itself. `name`/`vendor` are the exact values
   * `application.ini`'s Name=/Vendor= lines back (Services.appinfo wraps
   * XREAppData); `version` is the same MOZ_APP_VERSION_DISPLAY
   * preprocessor substitution (from upstream/browser/config/
   * version_display.txt) about:support's own version string uses. Both
   * the startup identity sentinel (powerbrowser.js) and the diagnostics
   * layer's show global read this SAME accessor, so the repointed D-120
   * branding check and the rendered surface can never disagree. Never
   * throws: any field that cannot be read resolves to an empty string
   * rather than throwing, matching getStringPref's convention -- one bad
   * field never blanks the other two.
   */
  getAppIdentity() {
    let name = "";
    let vendor = "";
    try {
      ({ name, vendor } = Services.appinfo);
    } catch {
      // name/vendor stay "".
    }
    let version = "";
    try {
      version = lazy.AppConstants.MOZ_APP_VERSION_DISPLAY;
    } catch {
      // version stays "".
    }
    return { name: name || "", vendor: vendor || "", version: version || "" };
  },

  /**
   * Resolves `command` against PATH, returning null (never throwing) when
   * it cannot be found.
   */
  async pathSearch(command) {
    try {
      return await lazy.Subprocess.pathSearch(command);
    } catch {
      return null;
    }
  },

  /**
   * Adds a session cookie for a plain-HTTP loopback host. D-99: secure is
   * always false -- the sidecar is loopback HTTP, and a secure cookie would
   * never be sent, silently defeating the whole mechanism.
   *
   * SameSite is Lax, not Strict, for the same class of reason: the shell's one
   * swap is a top-level navigation from `chrome://powerbrowser/...` to
   * `http://127.0.0.1:PORT/`, which is cross-site, and Strict withholds the
   * cookie on exactly that navigation -- the backend then answers the shell's
   * own first request with 403 Forbidden and Theia never loads. Lax still sends
   * it on that top-level GET while continuing to withhold it from cross-site
   * subresource loads and POSTs, so the gate keeps its actual purpose. Once the
   * page is on 127.0.0.1 every later request, including the WebSocket upgrade,
   * is same-site and unaffected.
   */
  setSessionCookie({ host, path, name, value }) {
    // aExpiry is honoured even for session cookies -- nsICookieManager.idl:
    // "expiry time will also be honored for session cookies; in this way, the
    // more restrictive of the two will take effect." A literal 0 is midnight
    // 1970-01-01, i.e. already expired, so the cookie is stored and then never
    // sent. Every in-tree caller passes a future stamp regardless of the
    // session flag; aIsSession=true is still what ends it at session end.
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    const validation = Services.cookies.add(
      host,
      path,
      name,
      value,
      /* aIsSecure */ false,
      /* aIsHttpOnly */ true,
      /* aIsSession */ true,
      /* aExpiry */ expiry,
      /* aOriginAttributes */ {},
      Ci.nsICookie.SAMESITE_LAX,
      Ci.nsICookie.SCHEME_HTTP,
      /* aIsPartitioned */ false
    );
    // add() reports a rejected cookie by returning a validation object rather
    // than throwing. Discarding it turns "the token gate is unreachable" into a
    // silent 403 at the far end of the swap, which is exactly how the expired
    // aExpiry above went unnoticed. Fail loudly instead.
    if (validation && validation.result !== Ci.nsICookieValidation.eOK) {
      throw new Error(
        `setSessionCookie: ${name} for ${host}${path} was rejected (${validation.result}): ${validation.errorString}`
      );
    }
  },

  /**
   * Spawns `command` with an explicit argument vector -- never through a
   * shell interpreter -- returning the process handle with stderr piped.
   * `environmentAppend: true` merges `environment` onto the parent
   * process's own environment (PATH, HOME, ...) rather than replacing it
   * outright -- the spawned Node backend and anything it shells out to
   * (a terminal, npm) still needs a normal environment, plus our overrides.
   */
  spawnProcess({ command, args, environment }) {
    return lazy.Subprocess.call({
      command,
      arguments: args,
      environment,
      environmentAppend: true,
      stderr: "pipe",
    });
  },

  /**
   * Writes one newline-terminated line to `proc`'s stdin pipe and leaves the
   * pipe OPEN. This is the credential channel: anything handed to
   * `spawnProcess`'s `environment` lands in the child's `/proc/<pid>/environ`,
   * which is the exec-time snapshot and stays readable by every same-uid
   * process for the life of that process no matter what the child later
   * deletes from its own `process.env`.
   *
   * Never close the pipe here. `Subprocess` always redirects a child's stdin
   * to a pipe on unix (`toolkit/modules/subprocess/subprocess_unix.worker.js`'s
   * `initPipes`), and the backend's parent-death watchdog treats EOF on this
   * exact fd as "the browser died" -- closing it after the write would
   * self-terminate the backend immediately.
   */
  writeStdinLine(proc, line) {
    return proc.stdin.write(`${line}\n`);
  },

  /**
   * Kills `proc`, waiting up to `graceMs` before escalating. A single call
   * to the platform's own kill(): it already sends SIGTERM, waits the
   * grace period, then SIGKILL -- do not hand-roll that sequence.
   */
  killProcess(proc, graceMs) {
    return proc.kill(graceMs);
  },

  /**
   * Reads the next available chunk of text from `proc`'s named output
   * pipe ("stdout" or "stderr"), resolving null at end of stream.
   */
  async readPipeChunk(proc, which) {
    const pipe = which === "stderr" ? proc.stderr : proc.stdout;
    const chunk = await pipe.readString();
    return chunk === "" ? null : chunk;
  },

  /**
   * Resolves after `ms` milliseconds. The window-global delay timer is not
   * available in a sys.mjs module's scope (confirmed against multiple
   * in-tree modules that either import Timer.sys.mjs or hand-roll it with
   * nsITimer) -- TheiaService may not import Timer.sys.mjs itself (D-96: it
   * imports nothing but this file), so the platform timer lives here
   * instead.
   */
  sleep(ms) {
    return new Promise(resolve => {
      const timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      // An nsITimer does NOT keep itself alive. Dropping the only reference
      // when this closure returns lets it be collected before it ever fires,
      // and the promise then never settles -- which silently stalls the
      // supervisor's health loop at its first await, so a dead backend is
      // never detected or restarted. Gecko's own Timer.sys.mjs keeps every
      // live timer in a module-level table (gTimerTable) for this exact
      // reason; hold the same kind of strong reference until it fires.
      pendingTimers.add(timer);
      // initWithCallback takes an nsITimerCallback, whose method is notify()
      // (nsITimer.idl:39-45). `observe` belongs to nsIObserver, which is what
      // the *other* initializer, init(), takes -- pass an {observe} object here
      // and the timer fires into nothing, so the promise never settles and
      // every awaiting caller stalls forever.
      timer.initWithCallback(
        {
          notify: () => {
            pendingTimers.delete(timer);
            resolve();
          },
        },
        ms,
        Ci.nsITimer.TYPE_ONE_SHOT
      );
    });
  },

  /**
   * GETs `url`, sending the sidecar token as a `Cookie` header. Used only
   * for the pre-cookie health probe (D-99: the real chrome-set cookie
   * doesn't exist until this probe first passes) and the steady-state
   * health loop.
   *
   * `fetch()`'s Headers object silently drops "Cookie" -- it's a forbidden
   * request-header name per the Fetch spec (dom/fetch/InternalHeaders.cpp),
   * and that check has no privileged-caller carve-out. `XMLHttpRequest`'s
   * `setRequestHeader` has exactly that carve-out for a system-principal
   * caller (dom/xhr/XMLHttpRequestMainThread.cpp: `isPrivilegedCaller`),
   * confirmed against the same escape hatch's use in-tree
   * (netwerk/test/unit/test_cookie_header.js's raw-channel equivalent).
   * Resolves `true` for a 200 response, `false` for anything else
   * (non-200, network error, or the request exceeding `timeoutMs`) --
   * never throws, so a caller never needs a try/catch around a probe.
   */
  probeHealth(url, token, timeoutMs) {
    return new Promise(resolve => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader("Cookie", `POWERBROWSER_TOKEN=${token}`);
      xhr.onload = () => resolve(xhr.status === 200);
      xhr.onerror = () => resolve(false);
      xhr.ontimeout = () => resolve(false);
      xhr.send();
    });
  },

  /**
   * Registers `callback` to fire once the quit decision is final and can
   * no longer be cancelled. Returns a function that unregisters it.
   */
  onQuitGranted(callback) {
    const observer = { observe: () => callback() };
    Services.obs.addObserver(observer, "quit-application-granted");
    return () => Services.obs.removeObserver(observer, "quit-application-granted");
  },

  /**
   * Mirrors one line to the browser console and to stdout, so the
   * supervisor's ring buffer and the verification harness read the same
   * stream.
   */
  log(level, message) {
    dump(`[PowerBrowserAPI] ${level}: ${message}\n`);
    const fn = typeof console[level] === "function" ? console[level] : console.log;
    fn(message);
  },

  /**
   * Announces that the shell window has finished initializing, by firing the
   * same observer topic Firefox's own chrome fires from
   * `browser/base/content/browser-init.js`. WebDriver's session.new blocks on
   * this topic (`remote/components/RemoteAgent.sys.mjs`), and the PowerBrowser
   * shell is deliberately not that chrome, so nothing else would ever fire it
   * and no automated check could drive the shell.
   */
  notifyStartupFinished(win) {
    Services.obs.notifyObservers(win, "browser-idle-startup-tasks-finished");
  },

  /**
   * Mints the `permanentKey` that WebDriver uses to identify a top-level
   * browsing context (`remote/shared/NavigableManager.sys.mjs` returns a null
   * context id for any browser without one). Firefox's tabbrowser assigns this
   * per `<browser>`; the shell has no tabbrowser, so it mints its own. Created
   * in the system global exactly as `tabbrowser.js` does, so the key stays
   * valid if something outlives the window.
   */
  createPermanentKey() {
    return new (Cu.getGlobalForObject(Services).Object)();
  },

  /**
   * Navigates `browserElement` to `url` with the shell document's own
   * principal as the triggering principal. Both halves are privileged chrome
   * API -- `ownerDocument.nodePrincipal` is the system principal because the
   * shell is loaded from chrome://, and `fixupAndLoadURIString` is a
   * <browser> method -- so they belong here rather than in powerbrowser.js.
   * Previously this lived in powerbrowser.js with a comment saying it avoided
   * PowerBrowserAPI "to dodge the boundary guard", which is precisely the hole
   * SHELL-02 exists to prevent: the guard's pattern list simply did not name
   * these two APIs, so a real internals touch sat outside the one file that
   * is supposed to hold them all, uncatalogued. Both patterns are in
   * FORBIDDEN_PATTERNS now, so that cannot recur silently.
   */
  loadURIInBrowser(browserElement, url) {
    browserElement.fixupAndLoadURIString(url, {
      triggeringPrincipal: browserElement.ownerDocument.nodePrincipal,
    });
  },

  /**
   * D-110: writes `value` as JSON to `path`, atomically -- IOUtils performs
   * a write-then-rename through the given temp path, so a crash mid-write
   * leaves at worst a stale/partial temp file and an untouched destination,
   * never a half-written state file.
   */
  writeStateFile(path, value) {
    return IOUtils.writeJSON(path, value, { tmpPath: `${path}.tmp` });
  },

  /**
   * Reads the state file's JSON, resolving `null` (never throwing) on any
   * failure -- absent file, malformed content, or a value that isn't an
   * object. Never-throw read convention, matching `getStringPref` above.
   */
  async readStateFile(path) {
    try {
      const value = await IOUtils.readJSON(path);
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  },

  /**
   * Removes the state file. `ignoreAbsent` defaults to true on
   * `IOUtils.remove`, so this needs no prior existence check -- a clean
   * stop's cleanup call is a no-op when there is nothing to remove.
   */
  removeStateFile(path) {
    return IOUtils.remove(path);
  },

  /**
   * D-111: reads `/proc/<pid>/stat` and returns field 22 (`starttime`,
   * clock ticks since boot per proc(5)) as a string, or `null` on any
   * failure. Field 2 (`comm`, the executable basename) is parenthesized
   * and may itself contain spaces or parentheses, so this locates the
   * LAST `)` in the line and slices two characters past it before
   * splitting the remainder on spaces -- splitting the whole line on the
   * first space misaligns every field after `comm` (05-RESEARCH.md
   * Pitfall 2). After that slice, field 22 overall is index 19 of the
   * remainder (fields 3.. counted from 0).
   */
  async readProcessStartTicks(pid) {
    try {
      // IOUtils.readUTF8() cannot be used here: it always sizes its read
      // buffer from the target's reported file size
      // (nsIFileRandomAccessStream::GetSize, an lstat-derived value), and
      // /proc/<pid>/stat, like every procfs file, reports st_size 0 -- a
      // size-0 buffer means it reads zero bytes and resolves an EMPTY
      // string with no error. Confirmed directly against this project's
      // own xpcshell (upstream/xpcom/ioutils/IOUtils.cpp:428-443,
      // IOUtils::ReadUTF8 calls ReadUTF8Sync -> ReadSync(..., Nothing{},
      // ...) unconditionally -- readUTF8's own ReadUTF8Options dictionary
      // has no maxBytes field at all (dom/chrome-webidl/IOUtils.webidl),
      // so passing one is silently ignored). IOUtils.read() (byte array,
      // ReadOptions.maxBytes) DOES honour an explicit maxBytes and reads
      // procfs correctly -- confirmed the same way. 4096 is far larger
      // than any real /proc/<pid>/stat line (all-digit and short-string
      // fields plus one parenthesized comm), including a comm value long
      // enough to contain spaces or parentheses.
      const bytes = await IOUtils.read(`/proc/${pid}/stat`, { maxBytes: 4096 });
      const text = new TextDecoder().decode(bytes);
      const afterComm = text.slice(text.lastIndexOf(")") + 2);
      const fields = afterComm.split(" ");
      return fields[19] ?? null;
    } catch {
      return null;
    }
  },

  /**
   * D-111: signals a bare pid -- one this process did not spawn via
   * Subprocess, and therefore has no `Process` object / `proc.kill()` for
   * (see `killProcess` above, which remains the correct call for an
   * already-spawned handle). `Subprocess.sys.mjs` has no API to signal a
   * pid it did not itself create, so this opens libc directly via
   * js-ctypes. Linux-only per CLAUDE.md -- no cross-platform branch.
   * Returns true only when the platform call itself returned 0; false on
   * ESRCH (already gone), EPERM, or any other failure -- never throws.
   */
  signalBarePid(pid, signal) {
    const libc = lazy.ctypes.open("libc.so.6");
    try {
      const kill = libc.declare(
        "kill",
        lazy.ctypes.default_abi,
        lazy.ctypes.int,
        lazy.ctypes.int,
        lazy.ctypes.int
      );
      return kill(pid, signal) === 0;
    } catch {
      return false;
    } finally {
      libc.close();
    }
  },

  /**
   * D-121/D-122: finds the shell's own already-open window, by the window
   * type `powerbrowser.xhtml`'s root element declares (`windowtype`). Returns
   * `null` (never throws) when none exists -- the first-launch case, where
   * the single-instance handler below must do nothing at all.
   */
  findShellWindow() {
    return Services.wm.getMostRecentWindow("powerbrowser:main");
  },

  /** Focuses an already-found shell window. */
  focusWindow(win) {
    win.focus();
  },

  /**
   * GUI-01 (01-05): opens the shell's own window. Called by the
   * single-instance handler below on the FIRST launch, which is what makes
   * the shell the startup window without the compiled BROWSER_CHROME_URL
   * override patch 020 used to carry. `null` args: the shell document reads
   * no `window.arguments` at all (powerbrowser.js), unlike upstream's
   * browser.xhtml.
   */
  openShellWindow() {
    return Services.ww.openWindow(
      null,
      "chrome://powerbrowser/content/powerbrowser.xhtml",
      "_blank",
      "chrome,dialog=no,all",
      null
    );
  },

  /**
   * GUI-01 (01-05): opens ONE stock upstream browser window -- the real
   * `chrome://browser/content/browser.xhtml`, with its own address bar, tab
   * strip, and in-window modal dialogs -- optionally loading `url`.
   *
   * The chrome URL is read from the build's own BROWSER_CHROME_URL constant
   * rather than hardcoded, so this opens whatever upstream considers the main
   * browser document. That is only correct because patch 020 no longer
   * overrides that define: upstream compares `window.location.href` against
   * this same constant in five places to decide "am I the main browser
   * window", and while the override was in place a real browser window lost
   * address-bar focus (browser.js openLocation), lost in-window modal dialogs
   * (browser.js gDialogBox), and recursed into the shell on a multi-URI load.
   *
   * `url` is wrapped in an nsISupportsString for the same reason upstream's
   * own `openBrowserWindow` does it: a bare string argument goes through
   * `loadOneOrMoreURIs`'s "|"-splitting path, so a URL containing a pipe
   * would be silently split into several loads.
   */
  openBrowserWindow(url) {
    const arg = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
    arg.data = url || "about:newtab";
    return Services.ww.openWindow(
      null,
      lazy.AppConstants.BROWSER_CHROME_URL,
      "_blank",
      "chrome,dialog=no,all",
      arg
    );
  },

  /**
   * True when `cmdLine` describes this process's own first launch, as
   * opposed to a remote handoff from a second launch of the same binary
   * against the same profile. The single-instance handler below branches on
   * it; the constant lives here because `Ci.` is forbidden everywhere else.
   */
  isInitialLaunch(cmdLine) {
    return cmdLine.state === Ci.nsICommandLine.STATE_INITIAL_LAUNCH;
  },
});

/**
 * D-121/D-123/D-124: the single-instance command-line handler, registered
 * via `powerbrowser/shell/components.conf` under the `command-line-handler`
 * category, entry name `a-powerbrowser` (sorts ahead of the stock browser
 * handler's `m-browser`, and far ahead of `x-default`, the handler that
 * actually opens a window -- see components.conf's own comment). Exported
 * from this file rather than a sibling module because it needs
 * `ChromeUtils.generateQI`/`Ci.nsICommandLineHandler`, both `Ci.`-pattern
 * touches the boundary guard forbids everywhere else under
 * `powerbrowser/shell/` (D-96/D-97).
 *
 * Behaviour (D-123/D-124, extended by 01-05 for GUI-01): look up the
 * existing shell window. If one is found -- a second launch of the same
 * binary against the same profile -- focus it and set `preventDefault`,
 * ignoring every command-line argument: never read one, never open a
 * window.
 *
 * If none is found AND this is the process's own initial launch, open the
 * shell document here and set `preventDefault`. This is startup-window
 * selection, and it lives here rather than in the compiled
 * BROWSER_CHROME_URL define patch 020 used to override (01-05, D-20): the
 * stock default handler
 * (upstream/browser/components/BrowserContentHandler.sys.mjs) gates its own
 * `openBrowserWindow` call on `!cmdLine.preventDefault`, so setting it is
 * what stops a second, stock window from also opening. Its `else` branch
 * then closes the early `navigator:blank` window, which is the brief
 * startup flicker upstream's own comment there calls acceptable and which
 * 01-UI-SPEC.md accepts and documents rather than fixes.
 *
 * If none is found and this is NOT the initial launch -- a remote handoff
 * that arrived before or without a shell window -- do nothing at all;
 * preventing the default here would leave that launch with no window.
 *
 * A thrown error is caught and logged rather than left to propagate into
 * the platform's own handler enumeration, which would otherwise break every
 * handler still due to run after this one.
 */
export class PowerBrowserSingleInstanceHandler {
  QueryInterface = ChromeUtils.generateQI([Ci.nsICommandLineHandler]);

  helpInfo = "";

  handle(cmdLine) {
    try {
      const win = PowerBrowserAPI.findShellWindow();
      if (win) {
        PowerBrowserAPI.focusWindow(win);
        cmdLine.preventDefault = true;
        return;
      }
      if (!PowerBrowserAPI.isInitialLaunch(cmdLine)) {
        return;
      }
      PowerBrowserAPI.openShellWindow();
      cmdLine.preventDefault = true;
    } catch (err) {
      PowerBrowserAPI.log("error", `[PowerBrowserSingleInstanceHandler] ${err}`);
    }
  }
}
