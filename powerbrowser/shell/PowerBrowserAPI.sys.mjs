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
  // SQL-01 (12-01): the tab-store writer's three reach-throughs. Sqlite
  // opens tabs.sqlite, PrivateBrowsingUtils filters private windows before
  // upsert, SessionStore sources quarantine rebuilds and the sweep.
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SessionStore: "resource:///modules/sessionstore/SessionStore.sys.mjs",
  // SQL-04 (12-02): read-only reach-throughs. PlacesUtils backs the
  // history, bookmark, and folder-listing readers (fetch and
  // getFolderContents only -- never a raw places file open); the
  // sessionstore projection reuses the SessionStore line above.
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

// Strong references to in-flight one-shot timers created by sleep(). See the
// comment in sleep() -- without this they can be garbage-collected before they
// fire and the awaiting promise never settles.
const pendingTimers = new Set();

// SQL-01 (12-01): v1 tab-store schema carried verbatim from SCHEMA.md. The
// roundtrip proof (scripts/verify-sql-store-roundtrip.mjs) extracts the text
// between the DDL markers at check time and fails distinctly when they are
// absent -- the DDL lives here once, never as a copy. No private, window,
// pinned, or credential-shaped column exists by construction.
const TAB_STORE_SCHEMA_HEAD = 1;
const TABS_STORE_V1_DDL = /* PB-SQL-TABS-DDL-START */ `CREATE TABLE tabs (
  uri         TEXT PRIMARY KEY CHECK(length(uri) > 0),
  url         TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  last_active INTEGER NOT NULL CHECK(last_active >= 0)
);

CREATE INDEX idx_tabs_last_active ON tabs (last_active);` /* PB-SQL-TABS-DDL-END */;

const TAB_STORE_FILE_NAME = "tabs.sqlite";

// SQL-01 (12-01): sweep bounds. The reconciliation sweep caps its per-run
// writes so a pathological session state cannot stall the observer, and
// prunes rows closed longer than the retention window.
const TAB_STORE_SWEEP_MAX_WRITES = 500;
const TAB_STORE_CLOSED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// SQL-01 (12-01): the single chrome-side tab-store connection. Module-level
// (never a property on the frozen PowerBrowserAPI object -- assignment to a
// frozen object throws), one writer only.
let tabStoreConn = null;

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
   * SQL-01 (12-01): the row key for a stock browser tab. One line: the
   * `webview:` scheme spelling from existing-scheme-coverage plus the tab
   * URL spec, bound opaquely and never parsed chrome-side. The same one-line
   * rule lives in theia/extensions/tab-uris/src/browser/browser-tab-uri.ts;
   * the roundtrip proof asserts both spell the same scheme.
   */
  browserTabKey(urlSpec) {
    return "webview:" + urlSpec;
  },

  /**
   * SQL-01 (12-01): opens the single chrome-side tab-store connection.
   * Relative `tabs.sqlite` resolves against ProfD by construction, so the
   * own-file rule needs no hand-rolled path join. WAL is pinned OUTSIDE any
   * transaction (journal_mode is immutable inside one -- a silent no-op),
   * with a journal_mode read-back assert rather than an assumption. Version
   * guard: zero or stale runs the forward migration in one transaction with
   * tableExists/indexExists pre-checks; newer-than-head refuses loudly,
   * leaving the file untouched. Loud-write convention: throws naming the
   * method and cause, never masks a failure as success.
   */
  async openTabStore() {
    if (tabStoreConn) {
      return tabStoreConn;
    }
    const conn = await lazy.Sqlite.openConnection({ path: TAB_STORE_FILE_NAME });
    const modeRows = await conn.execute("PRAGMA journal_mode=WAL;");
    const mode = modeRows.length ? modeRows[0].getString(0) : "";
    if (mode !== "wal") {
      try {
        await conn.close();
      } catch {
        // Close is best-effort here; the pin failure below is the error.
      }
      throw new Error(`openTabStore: journal_mode pin failed (got ${mode})`);
    }
    const schemaVersion = await conn.getSchemaVersion();
    if (schemaVersion > TAB_STORE_SCHEMA_HEAD) {
      try {
        await conn.close();
      } catch {
        // Close is best-effort here; the refusal below is the error.
      }
      throw new Error(
        `openTabStore: refusing downgrade: user_version=${schemaVersion} is newer than chain head ${TAB_STORE_SCHEMA_HEAD}`
      );
    }
    if (schemaVersion < TAB_STORE_SCHEMA_HEAD) {
      await PowerBrowserAPI.migrateTabStoreToV1(conn);
    }
    tabStoreConn = conn;
    return conn;
  },

  /**
   * SQL-01 (12-01): the single forward migration (v0/stale to v1). Pre-checks
   * run first; the DDL statements (split from the marker-delimited constant,
   * never a copy) plus the version bump run inside exactly one
   * executeTransaction. A database whose work is already done is a no-op
   * success that only stamps the version.
   */
  async migrateTabStoreToV1(conn) {
    const statements = TABS_STORE_V1_DDL.split(";")
      .map(s => s.trim())
      .filter(Boolean);
    const createTable = statements.find(s => /^create table\b/i.test(s));
    const createIndex = statements.find(s => /^create index\b/i.test(s));
    if (!createTable || !createIndex) {
      throw new Error("migrateTabStoreToV1: DDL marker content missing CREATE TABLE or CREATE INDEX");
    }
    const tableDone = await conn.tableExists("tabs");
    const indexDone = await conn.indexExists("idx_tabs_last_active");
    if (tableDone && indexDone) {
      await conn.setSchemaVersion(TAB_STORE_SCHEMA_HEAD);
      return;
    }
    await conn.executeTransaction(async () => {
      if (!tableDone) {
        await conn.execute(createTable);
      }
      if (!indexDone) {
        await conn.execute(createIndex);
      }
      await conn.setSchemaVersion(TAB_STORE_SCHEMA_HEAD);
    });
  },

  /**
   * SQL-01 (12-01): the single write path. The PrivateBrowsingUtils private-
   * window check runs BEFORE the upsert -- a private tab never reaches SQL,
   * and no private column exists to select on (exclusion total). Every value
   * crosses as a bound parameter, never interpolated. Constraint violations
   * throw naming the method and URI.
   */
  async writeTabRow({ uri, url, title, lastActive, chromeWin }) {
    if (chromeWin && lazy.PrivateBrowsingUtils.isWindowPrivate(chromeWin)) {
      return "skipped-private";
    }
    const conn = await PowerBrowserAPI.openTabStore();
    try {
      await conn.executeCached(
        `INSERT INTO tabs (uri, url, title, last_active) VALUES (:uri, :url, :title, :last_active)
         ON CONFLICT (uri) DO UPDATE SET url=excluded.url, title=excluded.title, last_active=excluded.last_active`,
        { uri, url, title: title ?? "", last_active: lastActive ?? Date.now() }
      );
    } catch (err) {
      throw new Error(`writeTabRow: upsert failed for ${uri}: ${err && err.message ? err.message : err}`);
    }
    return "written";
  },

  /**
   * SQL-01 (12-01): removes one row by opaque URI key. Bound parameter, loud
   * errors.
   */
  async removeTabRow(uri) {
    const conn = await PowerBrowserAPI.openTabStore();
    await conn.execute("DELETE FROM tabs WHERE uri = :uri", { uri });
  },

  /**
   * SQL-01 (12-01): point read by opaque URI key. Never-throw read
   * convention: resolves null on any failure, matching getStringPref above.
   */
  async readTabRow(uri) {
    try {
      const conn = await PowerBrowserAPI.openTabStore();
      const rows = await conn.execute(
        "SELECT uri, url, title, last_active FROM tabs WHERE uri = :uri",
        { uri }
      );
      if (!rows.length) {
        return null;
      }
      return {
        uri: rows[0].getString(0),
        url: rows[0].getString(1),
        title: rows[0].getString(2),
        last_active: rows[0].getInt64(3),
      };
    } catch {
      return null;
    }
  },

  /**
   * SQL-01 (12-01): lists all rows in URI order. Never-throw: resolves [] on
   * any failure.
   */
  async listTabRows() {
    try {
      const conn = await PowerBrowserAPI.openTabStore();
      const rows = await conn.execute("SELECT uri, url, title, last_active FROM tabs ORDER BY uri");
      return rows.map(row => ({
        uri: row.getString(0),
        url: row.getString(1),
        title: row.getString(2),
        last_active: row.getInt64(3),
      }));
    } catch {
      return [];
    }
  },

  /**
   * SQL-04 (12-02): history point read via the History fetch API keyed by
   * URL. Never-throw read convention: resolves null when the page is
   * unknown or Places is unreachable. Platform API only -- no raw places
   * file access, and the projected fields carry no credential or secret.
   */
  async readHistoryEntry(url) {
    try {
      const info = await lazy.PlacesUtils.history.fetch(url);
      if (!info) {
        return null;
      }
      return {
        url: info.url ?? url,
        title: info.title ?? "",
      };
    } catch {
      return null;
    }
  },

  /**
   * SQL-04 (12-02): bookmark point read via the Bookmarks fetch API keyed
   * by URL. The fetch resolves an object, an array, or null; the first
   * item wins. Never throws: resolves null on any failure.
   */
  async readBookmarkByUrl(url) {
    try {
      const found = await lazy.PlacesUtils.bookmarks.fetch({ url });
      const item = Array.isArray(found) ? found[0] : found;
      if (!item) {
        return null;
      }
      return {
        guid: item.guid ?? "",
        title: item.title ?? "",
        url: item.url ?? url,
      };
    } catch {
      return null;
    }
  },

  /**
   * SQL-04 (12-02): bookmark folder listing via getFolderContents.
   * Enumerates the open result root's children into guid/title/url rows
   * and always closes the container again. Never throws: resolves [] on
   * any failure.
   */
  listBookmarkFolder(folderGuid) {
    try {
      const root = lazy.PlacesUtils.getFolderContents(folderGuid, false, false).root;
      const rows = [];
      try {
        const count = root.childCount;
        for (let i = 0; i < count; i++) {
          const node = root.getChild(i);
          rows.push({
            guid: node.bookmarkGuid ?? "",
            title: node.title ?? "",
            url: node.uri ?? "",
          });
        }
      } finally {
        root.containerOpen = false;
      }
      return rows;
    } catch {
      return [];
    }
  },

  /**
   * SQL-04 (12-02): sessionstore read projection for consumers. Delegates
   * to the 12-01 parser -- the single JSON-string parse -- so the rebuild
   * source, the sweep input, and this read surface can never disagree on
   * shape. Tab address/title fields only, never credentials.
   */
  projectSessionStoreTabs() {
    return PowerBrowserAPI.parseSessionStoreTabRows();
  },

  /**
   * SQL-01 (12-01): bounded closed-retention prune. Deletes rows whose URI is
   * absent from the live set AND whose last_active predates the cutoff, so a
   * transiently-missing open tab is never pruned by identity alone. Bound
   * parameters throughout; an empty live set still prunes only before the
   * cutoff. Loud errors.
   */
  async pruneClosedTabRows(openUris, activeSince) {
    const conn = await PowerBrowserAPI.openTabStore();
    const live = [...new Set(openUris)];
    if (live.length) {
      const placeholders = live.map((_, i) => `:live${i}`).join(", ");
      const params = { cutoff: activeSince };
      live.forEach((uri, i) => {
        params[`live${i}`] = uri;
      });
      await conn.execute(
        `DELETE FROM tabs WHERE last_active < :cutoff AND uri NOT IN (${placeholders})`,
        params
      );
    } else {
      await conn.execute("DELETE FROM tabs WHERE last_active < :cutoff", { cutoff: activeSince });
    }
  },

  /**
   * SQL-01 (12-01): startup integrity tripwire. Keying is exact: the result
   * must be a single row with the value 'ok' and nothing else. An unopenable
   * file counts as tripped. Never throws -- answers true/false only.
   */
  async checkTabStoreIntegrity() {
    try {
      const conn = await PowerBrowserAPI.openTabStore();
      const rows = await conn.execute("PRAGMA quick_check");
      return rows.length === 1 && rows[0].getString(0) === "ok";
    } catch {
      return false;
    }
  },

  /**
   * SQL-01 (12-01): shapes the quarantine rebuild source from the restore
   * authority. SessionStore.getBrowserState returns a JSON STRING, so this
   * parses it; each open entry becomes a row keyed by the one-line
   * browserTabKey rule. Never throws -- a missing or malformed state rebuilds
   * zero rows rather than crashing startup.
   */
  parseSessionStoreTabRows() {
    try {
      const state = JSON.parse(lazy.SessionStore.getBrowserState());
      const now = Date.now();
      const rows = [];
      for (const win of state.windows ?? []) {
        // CR-01 (12-CODE-REVIEW.md): getBrowserState includes private
        // windows (upstream filters them only on save/close paths, never in
        // getCurrentState), so the store-side skip lives here -- the single
        // parse every consumer (sweep, quarantine rebuild, read projection)
        // routes through. No private-marker column exists to filter on later.
        if (win.isPrivate) {
          continue;
        }
        for (const tab of win.tabs ?? []) {
          const entry = tab.entries?.[tab.index - 1];
          if (!entry || !entry.url) {
            continue;
          }
          rows.push({
            uri: PowerBrowserAPI.browserTabKey(entry.url),
            url: entry.url,
            title: entry.title ?? "",
            last_active: now,
          });
        }
      }
      return rows;
    } catch {
      return [];
    }
  },

  /**
   * SQL-01 (12-01): quarantine, not delete. Copies the tripped file to the
   * next free corrupt-suffixed name (N = max existing suffix + 1, starting at
   * 1 -- never reuse a suffix) via backupToFile, removes dependent sidecar
   * state (-wal, -shm, -journal), then rebuilds the live rows FROM the
   * sessionstore restore authority inside exactly one transaction. The corrupt
   * copy is never deleted. Continues degraded with the rebuilt file.
   */
  async quarantineAndRebuildTabStore(restoreRows) {
    const profileDir = PowerBrowserAPI.getProfileDir();
    // IN-03 (12-CODE-REVIEW.md): getProfileDir resolves "" on any failure,
    // which would anchor forensics at the filesystem root. Refuse before
    // touching anything so the caller degrades cleanly.
    if (!profileDir) {
      throw new Error("quarantineAndRebuildTabStore: unknown profile dir");
    }
    const livePath = `${profileDir}/${TAB_STORE_FILE_NAME}`;
    let next = 0;
    try {
      const children = await IOUtils.getChildren(profileDir);
      for (const child of children) {
        const base = child.slice(child.lastIndexOf("/") + 1);
        const match = /^tabs\.sqlite\.corrupt-(\d+)$/.exec(base);
        if (match) {
          next = Math.max(next, Number(match[1]));
        }
      }
    } catch {
      next = 0;
    }
    const corruptPath = `${livePath}.corrupt-${next + 1}`;
    // Quarantine-not-delete invariant: the live file below is removed only
    // after forensics land at corruptPath. Without an open connection there
    // is no backupToFile source, so refusing here beats deleting the only
    // copy.
    if (!tabStoreConn) {
      throw new Error("quarantineAndRebuildTabStore: no open store to quarantine");
    }
    try {
      await tabStoreConn.backupToFile(corruptPath);
    } catch (err) {
      throw new Error(`quarantineAndRebuildTabStore: backupToFile failed: ${err && err.message ? err.message : err}`);
    }
    try {
      await tabStoreConn.close();
    } catch {
      // Close is best-effort; the rebuild below reopens.
    }
    tabStoreConn = null;
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      try {
        await IOUtils.remove(`${livePath}${suffix}`, { ignoreAbsent: true });
      } catch {
        // Sidecar removal is best-effort; a missing sidecar is the goal.
      }
    }
    // CR-03 (12-CODE-REVIEW.md): the backup above preserved forensics at
    // corruptPath, so the tripped live file is removed BEFORE reopening --
    // reopening it would run the migration's tableExists/indexExists
    // pre-checks against a corrupt-but-readable file (no-op success stamping
    // the version) and land live rows in the tripped file. This matches the
    // roundtrip proof's delete-then-rebuild procedure. Removal is
    // load-bearing, never best-effort: a failure throws into degraded.
    await IOUtils.remove(livePath);
    const conn = await lazy.Sqlite.openConnection({ path: TAB_STORE_FILE_NAME });
    await conn.execute("PRAGMA journal_mode=WAL;");
    // CR-02 (12-CODE-REVIEW.md): migrateTabStoreToV1 runs its own
    // executeTransaction, and upstream forbids nesting them (the inner call
    // blocks behind the outer until TRANSACTIONS_TIMEOUT_MS, then the outer
    // rolls back). So the migration runs first as its own top-level
    // transaction and the row inserts follow in a second one -- sequential,
    // never nested.
    await PowerBrowserAPI.migrateTabStoreToV1(conn);
    await conn.executeTransaction(async () => {
      for (const row of restoreRows) {
        await conn.execute(
          `INSERT INTO tabs (uri, url, title, last_active) VALUES (:uri, :url, :title, :last_active)
           ON CONFLICT (uri) DO UPDATE SET url=excluded.url, title=excluded.title, last_active=excluded.last_active`,
          { uri: row.uri, url: row.url, title: row.title, last_active: row.last_active }
        );
      }
    });
    tabStoreConn = conn;
    return corruptPath;
  },

  /**
   * SQL-01 (12-01): startup orchestration. Opens the store (running the
   * version guard), fires the tripwire, and on any trip quarantines and
   * rebuilds from sessionstore before continuing degraded. Resolves
   * 'ready' | 'rebuilt' | 'degraded' -- never throws, so startup never
   * stalls on the store.
   */
  async ensureTabStore() {
    try {
      await PowerBrowserAPI.openTabStore();
    } catch (err) {
      PowerBrowserAPI.log("error", `[ensureTabStore] open failed: ${err && err.message ? err.message : err}`);
      return "degraded";
    }
    let ok = false;
    try {
      const conn = await PowerBrowserAPI.openTabStore();
      const rows = await conn.execute("PRAGMA quick_check");
      ok = rows.length === 1 && rows[0].getString(0) === "ok";
    } catch {
      ok = false;
    }
    if (ok) {
      return "ready";
    }
    try {
      const restoreRows = PowerBrowserAPI.parseSessionStoreTabRows();
      await PowerBrowserAPI.quarantineAndRebuildTabStore(restoreRows);
      return "rebuilt";
    } catch (err) {
      PowerBrowserAPI.log("error", `[ensureTabStore] rebuild failed: ${err && err.message ? err.message : err}`);
      return "degraded";
    }
  },

  /**
   * SQL-01 (12-01): bounded reconciliation sweep. Diffs the sessionstore
   * browser state against store rows: upserts missing rows (capped at
   * TAB_STORE_SWEEP_MAX_WRITES per run) and prunes rows absent from the live
   * set before the retention cutoff. This sweep is also what makes the
   * roundtrip gate deterministic. Loud errors propagate to the caller.
   */
  async sweepTabStoreFromSessionStore() {
    const live = PowerBrowserAPI.parseSessionStoreTabRows();
    const liveUris = live.map(row => row.uri);
    for (const row of live.slice(0, TAB_STORE_SWEEP_MAX_WRITES)) {
      await PowerBrowserAPI.writeTabRow({
        uri: row.uri,
        url: row.url,
        title: row.title,
        lastActive: row.last_active,
      });
    }
    await PowerBrowserAPI.pruneClosedTabRows(liveUris, Date.now() - TAB_STORE_CLOSED_RETENTION_MS);
  },

  /**
   * SQL-01 (12-01): live triggers, chrome-observable only. Attaches the
   * TabOpen, TabClose, TabSelect, and TabAttrModified family on every stock
   * browser window's tab container (enumerated via the window service; the
   * shell window carries no tab browser, so it never matches), each calling
   * the write or remove wrapper keyed by the one-line browserTabKey rule,
   * plus a sessionstore-state-write-complete observer running the bounded
   * reconciliation sweep. No Theia-to-chrome channel is created and no actor
   * is registered. Returns a stop function removing every listener and
   * observer added here.
   */
  startTabStoreTriggers() {
    const TAB_STORE_EVENTS = ["TabOpen", "TabClose", "TabSelect", "TabAttrModified"];
    const attached = [];
    const onTabEvent = event => {
      try {
        const tab = event.target;
        const browser = tab && tab.linkedBrowser;
        const spec = browser && browser.currentURI && browser.currentURI.spec;
        if (!spec) {
          return;
        }
        const uri = PowerBrowserAPI.browserTabKey(spec);
        if (event.type === "TabClose") {
          PowerBrowserAPI.removeTabRow(uri).catch(err => {
            PowerBrowserAPI.log("error", `[tab-store-trigger] remove failed: ${err && err.message ? err.message : err}`);
          });
          return;
        }
        PowerBrowserAPI.writeTabRow({
          uri,
          url: spec,
          title: (tab && tab.label) || "",
          chromeWin: tab && tab.ownerDocument && tab.ownerDocument.defaultView,
        }).catch(err => {
          PowerBrowserAPI.log("error", `[tab-store-trigger] write failed: ${err && err.message ? err.message : err}`);
        });
      } catch (err) {
        PowerBrowserAPI.log("error", `[tab-store-trigger] ${err && err.message ? err.message : err}`);
      }
    };
    const stockWindows = Services.wm.getEnumerator("navigator:browser");
    while (stockWindows.hasMoreElements()) {
      const win = stockWindows.getNext();
      const container = win.gBrowser && win.gBrowser.tabContainer;
      if (!container) {
        continue;
      }
      for (const name of TAB_STORE_EVENTS) {
        container.addEventListener(name, onTabEvent);
        attached.push([container, name]);
      }
    }
    const sweepObserver = {
      observe: () => {
        PowerBrowserAPI.sweepTabStoreFromSessionStore().catch(err => {
          PowerBrowserAPI.log("error", `[tab-store-sweep] ${err && err.message ? err.message : err}`);
        });
      },
    };
    Services.obs.addObserver(sweepObserver, "sessionstore-state-write-complete");
    return () => {
      for (const [container, name] of attached) {
        try {
          container.removeEventListener(name, onTabEvent);
        } catch {
          // Listener removal is best-effort on teardown.
        }
      }
      try {
        Services.obs.removeObserver(sweepObserver, "sessionstore-state-write-complete");
      } catch {
        // Observer removal is best-effort on teardown.
      }
    };
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
