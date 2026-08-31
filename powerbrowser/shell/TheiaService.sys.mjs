/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * D-96: TheiaService is a *consumer* of the PowerBrowserAPI boundary, not a
 * second one -- it imports nothing else. Supervises the Theia backend
 * sidecar: mint token -> resolve sidecar location -> spawn -> watch stdout
 * for the ready sentinel -> health-gate -> set cookie -> swap (Task 1);
 * steady-state health loop with pinned-port restart and backoff (Task 2);
 * bounded quit and the D-106 ring buffer accessors (Task 3). Every field
 * below is per-launch, in-memory state only (D-107) -- nothing here writes
 * a file.
 */

const { PowerBrowserAPI } = ChromeUtils.importESModule("chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs");

const HEALTH_PATH = "/powerbrowser/health";

/*
 * 01-UI-SPEC.md "Copywriting Contract": the ONLY strings that may ever reach
 * #powerbrowser-error-message. Every one names the product, states the problem
 * in plain language, and ends with a next step that is a real affordance on
 * screen (Retry or Details). No pref key, sentinel name, port, timeout or raw
 * exception text appears here -- those are diagnostic, not actionable, and
 * every one of them is carried instead as a labelled row in the diagnostics
 * layer (see `details` below and `getFailureDetails()`), so nothing is lost.
 *
 * Several distinct failure paths deliberately collapse onto the same sentence:
 * the distinction between "spawn() threw", "the stdin handshake failed" and
 * "the output stream died" is not a distinction a user can act on. The
 * diagnostics layer is what exists for it.
 *
 * This table is the check surface, not a convention: verify-shell-error-copy.mjs
 * derives these values FROM THIS FILE at check time, asserts each against an
 * internal-identifier pattern, and asserts that every `message:` site and every
 * `_showError(` first argument in this file resolves back to it -- declared and
 * referenced key sets compared as an equality, so an added leak, an ad-hoc
 * literal, a stale entry and a removed one all go red.
 */
const USER_MESSAGE = {
  interfaceFilesMissing: "Power Browser can't find its interface files. This build looks incomplete — reinstall, or open Details for the missing path.",
  nodeMissing: "Power Browser needs Node.js and couldn't find it. Install Node.js 22 or later, then choose Retry.",
  couldNotStart: "Power Browser couldn't start its interface. Choose Retry, or open Details to see the error.",
  didNotFinishStarting: "Power Browser's interface didn't finish starting. Choose Retry, or open Details if this keeps happening.",
};

// Discretionary constants (plan 04-04 recorded_decisions) -- no pref exists
// for these (04-03's powerbrowser-sidecar.js ships only the health/timeout/
// grace/log-buffer prefs), so they stay literal here.
const RESTART_BACKOFF_INITIAL_MS = 500;
const RESTART_BACKOFF_CAP_MS = 5000;
const CONSECUTIVE_FAILURES_THRESHOLD = 2;

export const TheiaService = {
  // Per-launch state (D-104): minted/resolved once, reused across every
  // restart within this browser session.
  _token: null,
  _port: null,
  _pid: null,
  _proc: null,
  _browserElement: null,
  _nodePath: null,
  _backendMain: null,
  _configDir: null,
  _swapped: false,
  _shuttingDown: false,

  // D-121's second guard layer: set before any other work in start(), so a
  // re-entrant call during the first launch's own asynchronous work (not
  // just a second, separate call) is also caught. Mirrors _shuttingDown's
  // early-return shape in stop().
  _started: false,

  // D-110: this project's first persistence -- a sidecar state file inside
  // _configDir, written on every successful spawn (first and respawn
  // alike) and removed on a clean stop. Derived once in start(), right
  // after _configDir is resolved.
  _stateFilePath: null,

  // Health-loop state (Task 2).
  _healthy: false,
  _restartCount: 0,

  // SHELL-03 (05-02) give-up/error-state fields.
  // _errorShown guards _showError/_hideError the same way _swapped guards
  // _swap() -- repeated calls for the same state paint once and emit one
  // sentinel. _restartInFlight is the single in-flight guard shared by
  // _restart() (health-loop-triggered and first-launch-retry give-up),
  // retry() and _recoveryProbe() -- whichever gets there first runs the
  // only spawn attempt; every other caller no-ops rather than racing a
  // second one.
  _errorShown: false,
  _restartInFlight: false,
  _recoveryProbeActive: false,

  // 01-07: the diagnostic identifiers the user-facing message deliberately
  // does NOT carry -- an array of [label, value] pairs belonging to the
  // failure that put the shell into the current error state, or null when
  // there is no error state. Built by the failure path itself (only the
  // identifiers that path actually has, so an absent port never becomes an
  // empty-labelled row) and read by BOTH the diagnostics layer's field rows
  // and the POWERBROWSER_ERROR_DIAGNOSTICS sentinel through the single
  // getFailureDetails() accessor below -- the D-119/D-120 shape, so the
  // rendered surface and the machine-readable line can never disagree.
  _failureDetails: null,

  // D-106 ring buffer: bounded, in-memory, mirrored to the console as each
  // line arrives (see _pushLog / _pumpOutput below).
  _log: [],

  /**
   * Launch sequence for the first spawn of this browser session: resolve
   * the sidecar, spawn it on port 0, wait for the ready sentinel and a
   * passing health probe, set the token cookie, then swap the browser
   * element onto the backend's URL. Window show never waited on this --
   * powerbrowser.js already wrote POWERBROWSER_SHELL_READY before calling here.
   */
  async start(browserElement) {
    // D-121: the supervisor's own idempotency guard -- refuses to start
    // twice even if some other path ever opens a second shell window. Set
    // before any other work, mirroring stop()'s _shuttingDown guard, so a
    // re-entrant call racing this same launch's own in-flight start() is
    // also caught, not just a later, separate call.
    if (this._started) {
      this._pushLog("start() called again while already started -- refusing to start a second time.");
      return;
    }
    this._started = true;

    this._browserElement = browserElement;
    this._token = crypto.randomUUID();

    const resolved = await this._resolveSidecar();
    if (!resolved.ok) {
      // D-113: backendMain unset/missing and an unresolvable Node can only
      // ever happen here (this method's own one-shot resolution step, never
      // the restart path) -- unrecoverable by construction, straight to the
      // error state with no retry at all.
      this._showError(resolved.message, /* recoverable */ false, resolved.details);
      return;
    }

    this._configDir = this._resolveConfigDir();
    await PowerBrowserAPI.ensureDirectory(this._configDir);
    // CR-01 fix (05-REVIEW.md): the state file name itself carries a
    // profile-scoped suffix -- _configDir stays exactly as before (it also
    // backs THEIA_CONFIG_DIR below, unrelated to this fix and out of
    // scope to relocate) so two instances under different --profile paths
    // can never share a state file, while the SAME profile launched twice
    // (SIDE-04's own crash-leftover scenario) always resolves the same
    // path.
    this._stateFilePath = `${this._configDir}/sidecar-state-${this._profileStateKey()}.json`;

    // D-105: observe the topic that fires once quit is final and can no
    // longer be cancelled -- beginning an irreversible shutdown under a
    // quit that gets aborted would kill a backend the user still wants.
    PowerBrowserAPI.onQuitGranted(() => this.stop());

    // SIDE-04: reap a verified leftover from a previous crashed launch
    // BEFORE this session's own first spawn -- a leftover recorded in the
    // state file is either signalled (verified identity) or discarded
    // (stale/absent/malformed), and either way this returns before any new
    // process exists that could be confused with the leftover.
    await this._reapLeftover();

    // SHELL-03: the very first spawn attempt is folded into _restart()'s
    // own bounded give-up loop (D-103 was Phase 4's indefinite-retry
    // default) rather than being a separate uncounted attempt outside the
    // budget -- `powerbrowser.sidecar.giveUpAttempts` is the TOTAL number of
    // spawn attempts this launch gets, first attempt included.
    // `_spawnAndGate`'s own success path (cookie + swap + health loop)
    // fires exactly once, on whichever attempt first succeeds.
    await this._restart();
  },

  /**
   * Normal quit (D-105), in order: stop the health loop (no restart can
   * begin after this), then signal and await the backend's exit via a
   * single bounded platform call -- never a hand-rolled timer around it.
   * Idempotent: a second call while the first is still in flight is a
   * no-op.
   */
  async stop() {
    if (this._shuttingDown) {
      return;
    }
    this._shuttingDown = true;

    if (this._proc && this._proc.exitCode == null) {
      const graceMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.killGraceMs", 3000);
      try {
        await PowerBrowserAPI.killProcess(this._proc, graceMs);
      } catch {
        // Already exited.
      }
    }
    this._proc = null;
    this._healthy = false;

    // D-110: a clean stop must leave nothing for the next startup's
    // _reapLeftover() to find -- a normal quit followed by a normal start
    // signals nothing.
    if (this._stateFilePath) {
      try {
        await PowerBrowserAPI.removeStateFile(this._stateFilePath);
      } catch {
        // Best-effort: removeStateFile already tolerates an absent file;
        // anything else here is not worth blocking shutdown over.
      }
    }
  },

  /** D-106: the buffered lines, newest last. Phase 5's diagnostics page reads this. */
  getRecentLog() {
    return this._log.slice();
  },

  /**
   * 01-07: the current error state's diagnostic identifiers as [label, value]
   * rows -- the pref key, the resolved path, the readiness sentinel, the health
   * probe's port, the elapsed timeout, the raw exception text. Empty when there
   * is no error state. The ONE source both the diagnostics layer's field rows
   * and the POWERBROWSER_ERROR_DIAGNOSTICS sentinel read, so a row that renders
   * is a row that was announced and vice versa.
   */
  getFailureDetails() {
    return this._failureDetails ? this._failureDetails.map(row => row.slice()) : [];
  },

  /** Current port, pid, health status and restart count. Phase 5's diagnostics page reads this too. */
  getState() {
    return {
      port: this._port,
      pid: this._pid,
      healthy: this._healthy,
      restartCount: this._restartCount,
    };
  },

  /**
   * Resolves the backend entry file and Node executable. Returns
   * `{ ok, message, details }` -- D-113: both failure classes here are
   * unrecoverable (a missing pref or an unresolvable Node can never fix itself
   * on retry), and this method is only ever called once, from start() -- never
   * from the restart path -- so they can only ever be the first launch's
   * give-up case.
   *
   * 01-07: `message` is the user-facing sentence (always a USER_MESSAGE value);
   * `details` carries the identifiers that sentence deliberately drops. The
   * `_fatal()` line above each return keeps the FULL diagnostic text -- that is
   * the log, not the user surface, and verify-platform.sh's own checks match on
   * it.
   */
  async _resolveSidecar() {
    this._backendMain = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.backendMain", "");
    if (!this._backendMain) {
      this._fatal("powerbrowser.sidecar.backendMain is unset -- cannot locate the Theia backend entry file.");
      return {
        ok: false,
        message: USER_MESSAGE.interfaceFilesMissing,
        details: [
          ["Preference", "powerbrowser.sidecar.backendMain"],
          ["Preference status", "unset"],
        ],
      };
    }
    if (!(await PowerBrowserAPI.pathExists(this._backendMain))) {
      this._fatal(`powerbrowser.sidecar.backendMain (${this._backendMain}) does not exist -- cannot locate the Theia backend entry file.`);
      return {
        ok: false,
        message: USER_MESSAGE.interfaceFilesMissing,
        details: [
          ["Preference", "powerbrowser.sidecar.backendMain"],
          ["Resolved path", this._backendMain],
          ["Preference status", "set, but the path does not exist"],
        ],
      };
    }

    const configured = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.nodePath", "");
    this._nodePath = configured || (await PowerBrowserAPI.pathSearch("node"));
    if (!this._nodePath) {
      this._fatal("Could not resolve a Node executable -- set powerbrowser.sidecar.nodePath or add node to PATH.");
      return {
        ok: false,
        message: USER_MESSAGE.nodeMissing,
        details: [
          ["Preference", "powerbrowser.sidecar.nodePath"],
          ["Preference status", "unset, and no `node` was found on PATH"],
        ],
      };
    }

    return { ok: true, message: null, details: null };
  },

  _resolveConfigDir() {
    const xdg = PowerBrowserAPI.getEnv("XDG_CONFIG_HOME");
    const home = PowerBrowserAPI.getEnv("HOME");
    const base = xdg || `${home}/.config`;
    return `${base}/powerbrowser`;
  },

  /**
   * CR-01 fix (05-REVIEW.md): a filesystem-safe key derived from this
   * launch's own profile directory (ProfD), used to suffix the state file
   * name so two PowerBrowser instances running under different `--profile`
   * paths never share one `sidecar-state.json` -- previously
   * `_resolveConfigDir()` was keyed only on `XDG_CONFIG_HOME`/`HOME`, so
   * every instance under the same OS user read and wrote the exact same
   * file regardless of profile, and a second instance's startup reap
   * (`_reapLeftover`) would verify-and-SIGTERM a FIRST instance's live,
   * healthy backend (its pid genuinely was alive with exactly matching
   * start ticks -- the identity check is sound, the shared file was not).
   * No hash needed: ProfD's own absolute path is already the identity
   * that matters, non-alphanumeric characters are simply replaced so it's
   * a valid filename component, and it stays human-readable in the
   * directory listing. Falls back to the literal string "default" (never
   * throws, never empty) when ProfD can't be read, so a `getProfileDir()`
   * failure degrades to the pre-fix single-file behaviour rather than
   * crashing startup.
   */
  _profileStateKey() {
    const profileDir = PowerBrowserAPI.getProfileDir();
    return profileDir ? profileDir.replace(/[^a-zA-Z0-9]+/g, "_") : "default";
  },

  /**
   * SIDE-04's startup half: verified-identity reap of a leftover backend
   * from a previous crashed launch, called from start() before this
   * session's first spawn. D-111: signals a recorded pid ONLY when its
   * live `/proc/<pid>/stat` start-time ticks match the state file's
   * recorded value EXACTLY (string equality) -- a mismatch means the
   * operating system has recycled that pid onto an unrelated process, and
   * this returns without ever calling signalBarePid, no escalation.
   *
   * SIDE-04 empty edge: an absent, zero-byte, or malformed state file
   * resolves via `PowerBrowserAPI.readStateFile` to `null` (never throws) --
   * this returns silently and start()'s normal spawn sequence proceeds
   * exactly as it does today.
   */
  async _reapLeftover() {
    const record = await PowerBrowserAPI.readStateFile(this._stateFilePath);
    if (!record || typeof record.pid !== "number") {
      return;
    }

    const alive = PowerBrowserAPI.signalBarePid(record.pid, /* signal 0: liveness only */ 0);
    if (!alive) {
      this._reapLog(`Leftover state file named pid ${record.pid}, already gone -- removing stale state file.`);
      await this._removeStateFileQuietly();
      return;
    }

    const observedTicks = await PowerBrowserAPI.readProcessStartTicks(record.pid);
    if (observedTicks === null || observedTicks !== record.startTicks) {
      // Recycled-pid footgun (D-111): pid is alive, but it is NOT the
      // process this project recorded. Never signal it.
      this._reapLog(
        `Leftover state file's pid ${record.pid} is alive but its start-time ticks MISMATCH ` +
          `(recorded ${record.startTicks}, observed ${observedTicks}) -- the pid has been recycled by the OS onto an unrelated process; not signalling it.`
      );
      await this._removeStateFileQuietly();
      return;
    }

    const SIGTERM = 15;
    const signalled = PowerBrowserAPI.signalBarePid(record.pid, SIGTERM);
    if (!signalled) {
      this._reapLog(`Leftover pid ${record.pid} (verified identity match) could not be signalled with SIGTERM.`);
      await this._removeStateFileQuietly();
      return;
    }

    // Brief bounded poll -- not a hard requirement for correctness (the
    // state file is removed either way below), just makes the reap
    // outcome observable in the log without an unbounded wait.
    const deadline = Date.now() + 3000;
    let stillAlive = PowerBrowserAPI.signalBarePid(record.pid, 0);
    while (stillAlive && Date.now() < deadline) {
      await PowerBrowserAPI.sleep(100);
      stillAlive = PowerBrowserAPI.signalBarePid(record.pid, 0);
    }

    if (stillAlive) {
      this._reapLog(`Leftover pid ${record.pid} (verified identity match) was signalled with SIGTERM but is still alive -- leaving it alone, no escalation.`);
    } else {
      this._reapLog(`Leftover pid ${record.pid} (verified identity match) was signalled with SIGTERM and is gone.`);
    }
    await this._removeStateFileQuietly();
  },

  /**
   * Ring buffer AND console/stdout, same dual-channel convention `_fatal`
   * already uses -- the reap decision must be independently observable
   * both from `getRecentLog()` (Phase 5's diagnostics page) and from the
   * process's own stdout (verify-platform.sh's automated controls read the
   * launch log directly, with no chrome-side access).
   */
  _reapLog(message) {
    this._pushLog(message);
    PowerBrowserAPI.log("log", `[TheiaService] ${message}`);
  },

  async _removeStateFileQuietly() {
    try {
      await PowerBrowserAPI.removeStateFile(this._stateFilePath);
    } catch {
      // Best-effort; removeStateFile already tolerates an absent file.
    }
  },

  /**
   * Spawns the backend and waits for it to become healthy. Returns
   * `{ ok, recoverable, message, details }` (SHELL-03/D-113) instead of a bare
   * boolean, so `_restart()`/`start()` can tell an unrecoverable failure
   * (backend entry file unresolvable, spawn() itself throwing, the pinned
   * port held by another process -- D-112) from a transient one (readiness
   * stream ended, readiness timeout, health-probe timeout) without
   * re-deriving the classification.
   *
   * 01-07: `message` is always a USER_MESSAGE value -- the user-facing sentence
   * the error layer paints verbatim -- and `details` carries the identifiers
   * that sentence drops (the readiness sentinel, the port, the timeout, the raw
   * exception text). Before 01-07 a single `reason` field was both, so the
   * error layer painted `POWERBROWSER_BACKEND_READY` and a millisecond count at
   * a user. The full diagnostic text still goes to `_fatal()` unchanged.
   *
   * `beforeFirstSwap: true` requests port 0 (SIDE-01) -- the only place a zero
   * port appears in this file. Every later call (Task 2's restart path)
   * passes the already-pinned `this._port`, because the already-loaded
   * Theia page reconnects to the origin it was loaded from (D-104).
   *
   * 01-09: this parameter was named `firstSpawn` and `_restart()` computed it
   * as `this._port === null`, which conflated "a port has been pinned" with "a
   * spawn has actually completed". A first spawn that announced readiness (so
   * a port WAS pinned) and then failed the health gate left every later,
   * successful respawn taking the `else` branch -- no cookie, no navigation,
   * no health loop -- stranding the user on the branded loading layer with a
   * healthy backend behind it (01-VERIFICATION.md's one FAILED must-have). It
   * is now keyed on `this._swapped`, the field that actually records
   * completion, and named for what it means. D-104's invariant is untouched
   * where it is load-bearing: every respawn AFTER a completed swap still
   * targets the pinned port, because that is the only state in which a loaded
   * page exists whose origin must hold still. Before a completed swap nothing
   * is loaded at that origin, so re-pinning it was a constraint with no
   * beneficiary and a real cost -- D-112 would classify a squatted pre-swap
   * port as unrecoverable and give up immediately.
   */
  async _spawnAndGate(beforeFirstSwap) {
    const port = beforeFirstSwap ? 0 : this._port;
    const args = [this._backendMain, "--hostname", "127.0.0.1", "--port", String(port)];
    // NO SECRET GOES IN HERE. `environment` becomes the child's
    // /proc/<pid>/environ, which is the exec-time snapshot: it is readable by
    // every same-uid process for the whole life of the backend, and nothing
    // the backend deletes from its own process.env rewrites it. On this
    // project's own target Yama's ptrace_scope=1 blocks /proc/<pid>/mem but
    // not environ, so the environment is the one place a credential stays
    // legible to a co-resident process. `this._token` is therefore handed over
    // the stdin pipe instead, immediately after the spawn below.
    //
    // The remaining POWERBROWSER_* variables are a one-way handshake into the
    // backend PROCESS, not something its children may see: the backend
    // captures and deletes every POWERBROWSER_*-prefixed key from its own
    // process.env at module load
    // (theia/extensions/token-gate/src/node/powerbrowser-env.ts), because Node
    // hands process.env to every child -- terminals, tasks, the plugin host
    // running third-party extensions. Do not add a POWERBROWSER_* key here
    // expecting a grandchild to read it, and do not add one carrying a secret
    // at all.
    const environment = {
      THEIA_CONFIG_DIR: this._configDir,
      VSX_REGISTRY_URL: "https://open-vsx.org",
      // SIDE-04 (05-01-PLAN.md): arms the backend's parent-death watchdog
      // (parent-watchdog-backend-contribution.ts). The watchdog is INERT
      // without this exact "1" -- three unsupervised callers depend on
      // staying inert when their own stdin closes/EOFs for unrelated
      // reasons: `yarn start`, `scripts/smoke-theia.sh`, and
      // verify-platform.sh's own start_backend (stdin redirected from
      // /dev/null). Only this supervisor's spawn sets it.
      POWERBROWSER_SUPERVISED: "1",
      // PowerBrowserAPI.spawnProcess uses environmentAppend:true, so the child
      // inherits this process's own environment and anything already exported
      // in the shell that launched the browser comes along. The token gate's
      // named dev bypass must therefore be cleared EXPLICITLY here: inherited,
      // it silently disables authentication on a backend that has arbitrary
      // file access and a terminal. The gate tests `=== "1"`, so an empty
      // value is off; the point is that the supervised path never depends on
      // the launching environment being clean. This clear is load-bearing
      // rather than belt-and-braces now that the backend captures the value
      // at module load: an inherited "1" would be captured before the scrub
      // and would disable the gate for that whole process lifetime.
      POWERBROWSER_TOKEN_DISABLE: "",
    };

    let proc;
    try {
      proc = await PowerBrowserAPI.spawnProcess({ command: this._nodePath, args, environment });
    } catch (err) {
      // D-113: the spawn() call itself throwing is unrecoverable -- a
      // platform-level failure to exec at all is never going to succeed on
      // an unconditional retry.
      this._fatal(`Failed to spawn the backend: ${err.message}`);
      return {
        ok: false,
        recoverable: false,
        message: USER_MESSAGE.couldNotStart,
        details: [
          ["Failed step", "spawning the backend process"],
          ["Error", err.message],
        ],
      };
    }
    this._proc = proc;

    if (this._shuttingDown) {
      await this._reap();
      // 01-UI-SPEC.md's rewrite table: "Shutting down." is NOT an error
      // surface and keeps its literal verbatim. It never reaches the error
      // layer -- `_restart()` returns at its own `_shuttingDown` check before
      // `_showError` -- so it carries no user-facing `message` at all rather
      // than a rewritten one, and stays exactly where it was.
      return { ok: false, recoverable: false, message: null, details: null, reason: "Shutting down." };
    }

    // The credential handshake (D-98), and the reason the environment object
    // above carries no token. One line, written once per spawn, on a pipe that
    // stays OPEN afterwards -- the backend's parent-death watchdog reads the
    // same fd for EOF, so closing it here would kill the backend on the spot.
    // powerbrowser-env.ts consumes exactly this line, byte-at-a-time up to the
    // newline, before the token gate decides whether to fail closed. D-104 is
    // unaffected: every respawn writes the SAME this._token, so the cookie
    // chrome minted on the first spawn keeps authenticating.
    try {
      await PowerBrowserAPI.writeStdinLine(proc, this._token);
    } catch (err) {
      // The backend is now blocked reading a line that will never arrive, and
      // would sit there until the startup timeout. Reap it and report instead:
      // recoverable, because a pipe write failing says nothing about whether
      // the next spawn will.
      this._fatal(`Failed to hand the backend its token over stdin: ${err.message}`);
      await this._reap();
      return {
        ok: false,
        recoverable: true,
        message: USER_MESSAGE.couldNotStart,
        details: [
          ["Failed step", "handing the backend its credential over stdin"],
          ["Error", err.message],
        ],
      };
    }

    const pinnedPort = beforeFirstSwap ? null : this._port;
    const readyPromise = this._pumpOutput(proc, pinnedPort);
    const startupTimeoutMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.startupTimeoutMs", 90000);

    let ready;
    try {
      ready = await Promise.race([
        readyPromise,
        PowerBrowserAPI.sleep(startupTimeoutMs).then(() => null),
      ]);
    } catch (err) {
      // D-112: `_pumpOutput` marks a pinned-port-conflict rejection with
      // `err.recoverable = false` (the port is held by another process --
      // never going to bind on an unconditional retry against the same
      // pinned port). Every other output-stream-ended rejection (a genuine
      // crash) is a transient, recoverable failure.
      if (err.recoverable === false) {
        // D-112's pinned-port conflict. `err.message` is the full diagnostic
        // sentence _pumpOutput already wrote through _fatal(); the ports it
        // names go to the rows, not to the user.
        return {
          ok: false,
          recoverable: false,
          message: USER_MESSAGE.couldNotStart,
          details: [
            ["Failed step", "reattaching to the port this session is pinned to"],
            ["Pinned port", this._port],
            ["Error", err.message],
          ],
        };
      }
      this._fatal(`Backend output stream ended before announcing readiness: ${err.message}`);
      return {
        ok: false,
        recoverable: true,
        message: USER_MESSAGE.couldNotStart,
        details: [
          ["Failed step", "waiting for the backend to announce readiness"],
          ["Error", err.message],
        ],
      };
    }

    if (!ready) {
      this._fatal(`Backend did not announce POWERBROWSER_BACKEND_READY within ${startupTimeoutMs}ms.`);
      return {
        ok: false,
        recoverable: true,
        message: USER_MESSAGE.didNotFinishStarting,
        details: [
          ["Failed step", "waiting for the backend's readiness announcement"],
          ["Readiness sentinel", "POWERBROWSER_BACKEND_READY"],
          ["Startup timeout", `${startupTimeoutMs}ms`],
        ],
      };
    }

    this._port = ready.port;
    this._pid = ready.pid;

    // D-110: record this spawn in the state file on EVERY successful spawn,
    // first and respawn alike -- a crash after a restart must still leave
    // an accurate record for the next startup's _reapLeftover() to find.
    // Read via PowerBrowserAPI.readProcessStartTicks (the same field-22
    // /proc/<pid>/stat reader _reapLeftover() uses to verify identity
    // later), so writer and reader always agree on format.
    const startTicks = await PowerBrowserAPI.readProcessStartTicks(this._pid);
    try {
      await PowerBrowserAPI.writeStateFile(this._stateFilePath, {
        pid: this._pid,
        port: this._port,
        startTicks,
        writtenAt: Date.now(),
      });
      this._pushLog(`Wrote sidecar state file for pid ${this._pid}, port ${this._port}.`);
    } catch (err) {
      // Not fatal to this launch -- SIDE-04's startup-cleanup half degrades
      // (a leftover from THIS run may go unreaped next time), but the
      // backend itself is healthy and should keep running.
      this._pushLog(`Failed to write sidecar state file: ${err.message}`);
    }

    const healthIntervalStartupMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.healthIntervalStartupMs", 250);
    const healthTimeoutMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.healthTimeoutMs", 4000);
    const healthy = await this._pollUntilHealthy(startupTimeoutMs, healthIntervalStartupMs, healthTimeoutMs);
    if (!healthy) {
      this._fatal(`Health probe on port ${this._port} never returned 200 within ${startupTimeoutMs}ms.`);
      return {
        ok: false,
        recoverable: true,
        message: USER_MESSAGE.didNotFinishStarting,
        details: [
          ["Failed step", "health-probing the backend"],
          ["Health probe port", this._port],
          ["Health probe path", HEALTH_PATH],
          ["Startup timeout", `${startupTimeoutMs}ms`],
        ],
      };
    }

    this._healthy = true;

    // 01-09: keyed on `this._swapped` -- the SAME field `_swap()`'s own
    // early-return guard reads -- so "a spawn has actually completed" is one
    // fact with one owner. Keying this on anything that merely records a port
    // having been pinned is the conflation that stranded a launch on the
    // loading layer after a transient health-gate failure.
    if (!this._swapped) {
      PowerBrowserAPI.setSessionCookie({
        host: "127.0.0.1",
        path: "/",
        name: "POWERBROWSER_TOKEN",
        value: this._token,
      });
      this._swap();
      // Fire-and-forget: the loop runs for the lifetime of this browser
      // session, checking _shuttingDown at every await point rather than
      // needing a cancelable timer handle (Task 3's stop() just flips
      // that flag).
      this._healthLoop();
    } else {
      this._pushLog(`Recovered on port ${this._port}, pid ${this._pid}.`);
    }

    return { ok: true, recoverable: null, message: null, details: null };
  },

  /**
   * Steady-state supervision for the lifetime of the browser session.
   * Each iteration sleeps the steady interval, then probes once (its own
   * bounded timeout, so a probe can never overlap the next one). Two
   * consecutive failures (not one -- a single slow response shouldn't
   * churn a healthy backend) trigger a restart; a restart resets the
   * failure count so the loop returns to steady-state polling once healthy
   * again.
   */
  async _healthLoop() {
    let consecutiveFailures = 0;

    while (!this._shuttingDown) {
      const steadyIntervalMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.healthIntervalSteadyMs", 5000);
      await PowerBrowserAPI.sleep(steadyIntervalMs);
      if (this._shuttingDown) {
        break;
      }

      const healthTimeoutMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.healthTimeoutMs", 4000);
      const ok = await this._probeHealth(healthTimeoutMs);
      if (this._shuttingDown) {
        break;
      }

      if (ok) {
        consecutiveFailures = 0;
        this._healthy = true;
        continue;
      }

      consecutiveFailures += 1;
      this._pushLog(`Health probe failed (${consecutiveFailures} consecutive).`);
      if (consecutiveFailures < CONSECUTIVE_FAILURES_THRESHOLD) {
        continue;
      }

      consecutiveFailures = 0;
      this._healthy = false;
      await this._restart();
    }
  },

  /**
   * Reaps whatever process handle currently exists and (re)spawns,
   * retrying with exponential backoff between failed attempts, until
   * EITHER a spawn's health probe passes, OR SHELL-03's split give-up rule
   * (D-113) ends the loop: an unrecoverable result (spawn() throwing, the
   * readiness stream classified unrecoverable -- D-112's stolen pinned
   * port) gives up immediately with no wait at all; a recoverable one keeps
   * retrying until the attempt cap or the wall-clock ceiling trips,
   * whichever comes first (`powerbrowser.sidecar.giveUpAttempts`/
   * `giveUpWallclockMs`). Either give-up path calls `_showError`; a
   * successful spawn calls `_hideError`.
   *
   * `giveUpAttempts` is the TOTAL number of spawn attempts this call gets,
   * the very first attempt included -- this is the single entry point for
   * every spawn after start()'s own resolve/reap-leftover step, whether
   * this is the first-ever launch or a later mid-session recovery, so
   * "six attempts" always means six, never six-plus-the-one-that-doesn't-
   * count. Both budget values are plain locals here, recomputed fresh on
   * every call, so a later outage always starts with a full budget.
   *
   * Per-attempt port choice: `this._swapped === false` means no spawn in this
   * browser session has ever COMPLETED yet -- keep requesting port 0 (SIDE-01)
   * until one does. Once a swap has completed, every later attempt here is a
   * true D-104 respawn on the pinned port, which is the only state in which a
   * loaded page exists whose origin must hold still. 01-09 moved this off
   * `this._port === null`: a port pinned by a spawn that then failed the
   * health gate is not a spawn that succeeded, and treating it as one made
   * every later respawn skip `_spawnAndGate`'s one-time initialisation.
   *
   * Idempotent/no-op re-entry (SHELL-03 concurrency edge): guarded by
   * `_restartInFlight`, shared with `retry()` and `_recoveryProbe()` --
   * whichever of start(), the health loop, a Retry click, or the
   * background probe gets here first runs the only spawn attempt in
   * flight; every other caller returns immediately without starting a
   * second one.
   */
  async _restart() {
    if (this._restartInFlight) {
      return;
    }
    this._restartInFlight = true;

    try {
      this._restartCount += 1;
      let backoffMs = RESTART_BACKOFF_INITIAL_MS;
      this._pushLog(`Restarting backend (attempt ${this._restartCount}).`);

      const giveUpAttempts = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.giveUpAttempts", 6);
      const giveUpWallclockMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.giveUpWallclockMs", 45000);
      const deadline = Date.now() + giveUpWallclockMs;
      let attempts = 0;

      await this._reap();

      for (;;) {
        if (this._shuttingDown) {
          return;
        }

        attempts += 1;
        const result = await this._spawnAndGate(!this._swapped);
        if (result.ok) {
          this._hideError();
          return;
        }

        await this._reap();
        if (this._shuttingDown) {
          return;
        }

        if (!result.recoverable) {
          // The LOG keeps the full diagnostic detail (this is the sink
          // verify-platform.sh's own checks read); the error layer gets the
          // user-facing sentence and the rows.
          this._pushLog(`Giving up immediately -- unrecoverable: ${this._detailSummary(result.details)}`);
          this._showError(result.message, false, result.details);
          return;
        }

        if (attempts >= giveUpAttempts || Date.now() >= deadline) {
          this._pushLog(
            `Giving up -- retry budget exhausted after ${attempts} attempt(s): ${this._detailSummary(result.details)}`
          );
          this._showError(result.message, true, result.details);
          return;
        }

        this._pushLog(`Respawn attempt failed; waiting ${backoffMs}ms before retrying.`);
        await PowerBrowserAPI.sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, RESTART_BACKOFF_CAP_MS);
      }
    } finally {
      this._restartInFlight = false;
    }
  },

  /**
   * D-115: public retry entry point for the error layer's Retry control.
   * Resets the give-up budget (both budget values are plain locals inside
   * `_restart()`, recomputed fresh on every call) and re-enters the exact
   * same restart path the health loop uses -- respawning on the pinned
   * port once one exists. Shares `_restartInFlight` with `_restart()`
   * itself and `_recoveryProbe()`, so a second Retry click (or a Retry
   * racing the background probe) while a spawn is already in flight is a
   * no-op, never a second spawn.
   */
  async retry() {
    await this._restart();
  },

  /**
   * D-115: a slow background probe, started when the error state is
   * entered (`_showError`) and stopped when it clears (`_hideError`). Fires
   * no sooner than `powerbrowser.sidecar.recoveryProbeIntervalMs` after
   * entering the error state, and takes the exact same recovery path Retry
   * does (`_restart()`, sharing its `_restartInFlight` guard) -- so a
   * backend whose failure condition has cleared on its own (D-112's port
   * squatter exiting, a transient condition resolving) is noticed and the
   * error layer auto-dismisses with no user action.
   */
  async _recoveryProbeLoop() {
    while (this._recoveryProbeActive && !this._shuttingDown) {
      const intervalMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.recoveryProbeIntervalMs", 15000);
      await PowerBrowserAPI.sleep(intervalMs);
      if (!this._recoveryProbeActive || this._shuttingDown) {
        return;
      }
      await this._restart();
    }
  },

  _startRecoveryProbe() {
    if (this._recoveryProbeActive) {
      return;
    }
    this._recoveryProbeActive = true;
    // Fire-and-forget, same convention as _healthLoop() -- lives for as
    // long as _recoveryProbeActive stays true, checked at every await point.
    this._recoveryProbeLoop();
  },

  _stopRecoveryProbe() {
    this._recoveryProbeActive = false;
  },

  /**
   * SHELL-03/D-114: signals the chrome document's error layer through the
   * browser element's owner window, exactly like `_swap()` -- never the
   * browser element's own location. Guarded by `_errorShown` so repeated
   * calls for the same state (e.g. the health loop giving up again while
   * already in the error state) paint once and emit one state change.
   *
   * `message` is one of the USER_MESSAGE values and nothing else -- plain
   * language, product-named, ending in an on-screen affordance.
   * `recoverable` is the classification carried by the triggering
   * `_spawnAndGate`/`_resolveSidecar` result. `details` is that result's
   * [label, value] rows, stashed for `getFailureDetails()` -- the ONLY route
   * by which an internal identifier reaches a surface at all.
   *
   * Neither this, the chrome layer's sentinel, nor a detail row may ever
   * include the per-launch token: `message` is a static literal, and every
   * detail value goes through the same `this._token` redaction `_pushLog`
   * applies, since an `err.message` is ultimately derived text.
   */
  _showError(message, recoverable, details) {
    if (this._errorShown) {
      return;
    }
    this._errorShown = true;
    this._failureDetails = (details || []).map(([label, value]) => {
      const text = String(value);
      return [label, this._token ? text.replaceAll(this._token, "[redacted]") : text];
    });
    this._pushLog(`Showing error state (recoverable=${recoverable}): ${message}`);
    this._browserElement.ownerDocument.defaultView.powerbrowserShowError({ reason: message, recoverable });
    this._startRecoveryProbe();
  },

  /** Hides the error layer and stops the background recovery probe. */
  _hideError() {
    if (!this._errorShown) {
      return;
    }
    this._errorShown = false;
    this._failureDetails = null;
    this._stopRecoveryProbe();
    this._browserElement.ownerDocument.defaultView.powerbrowserHideError();
  },

  /**
   * One-line rendering of a failure's detail rows, for the LOG only -- the
   * sink that keeps everything the user-facing sentence drops. Never reaches
   * the error layer.
   */
  _detailSummary(details) {
    return (details || []).map(([label, value]) => `${label}=${value}`).join("; ");
  },

  /** Kills the current process handle, if it's still alive, and clears it. */
  async _reap() {
    if (this._proc && this._proc.exitCode == null) {
      const graceMs = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.killGraceMs", 3000);
      try {
        await PowerBrowserAPI.killProcess(this._proc, graceMs);
      } catch {
        // Already exited, or the platform kill failed on an already-dead
        // handle -- nothing more to do either way.
      }
    }
    this._proc = null;
  },

  /**
   * Reads both output pipes in a loop for the lifetime of `proc`, pushing
   * every line into the ring buffer and mirroring it to the console. Keeps
   * running after the ready sentinel is found (the returned promise settles
   * once, but the pumps themselves are not stopped) so ongoing backend
   * output during the steady state and any later restart also lands in the
   * log. Resolves `{port, pid}` parsed from the POWERBROWSER_BACKEND_READY
   * line; rejects if both pipes close without ever finding it.
   *
   * `pinnedPort`, when non-null, is D-104's restart invariant: a
   * respawn's sentinel reporting a different port is a hard error, logged
   * loudly, never silently followed -- the loop keeps waiting rather than
   * resolving with the wrong port.
   */
  _pumpOutput(proc, pinnedPort) {
    let settled = false;
    let resolveReady;
    let rejectReady;
    const readyPromise = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    const handleLine = line => {
      this._pushLog(line);
      PowerBrowserAPI.log("log", line);

      if (settled || !line.startsWith("POWERBROWSER_BACKEND_READY")) {
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(line.slice("POWERBROWSER_BACKEND_READY".length).trim());
      } catch {
        return;
      }
      if (typeof parsed.port !== "number" || typeof parsed.pid !== "number") {
        return;
      }
      if (pinnedPort !== null && parsed.port !== pinnedPort) {
        // D-112: a respawn announcing a different port than the one this
        // browser session is pinned to means the pinned port is held by
        // something else -- unrecoverable, the already-loaded Theia page
        // can only ever reconnect to the pinned origin. Previously this
        // just logged and returned, leaving readyPromise pending forever
        // (the caller would silently wait out the full startup timeout and
        // misclassify this as a mere readiness timeout, a recoverable
        // failure). Reject it immediately instead, marked so
        // `_spawnAndGate` can classify it without re-deriving the reason.
        const reason = `Respawn reported port ${parsed.port}, but this browser session is pinned to port ${pinnedPort} -- refusing to follow a moved port (D-104); the pinned port is likely held by another process (D-112).`;
        this._fatal(reason);
        settled = true;
        const err = new Error(reason);
        err.recoverable = false;
        rejectReady(err);
        return;
      }
      settled = true;
      resolveReady(parsed);
    };

    const pump = async which => {
      let pending = "";
      for (;;) {
        let chunk;
        try {
          chunk = await PowerBrowserAPI.readPipeChunk(proc, which);
        } catch {
          break;
        }
        if (chunk === null) {
          break;
        }
        pending += chunk;
        let idx;
        while ((idx = pending.indexOf("\n")) !== -1) {
          handleLine(pending.slice(0, idx));
          pending = pending.slice(idx + 1);
        }
      }
      if (pending) {
        handleLine(pending);
      }
    };

    Promise.all([pump("stdout"), pump("stderr")]).then(() => {
      if (!settled) {
        rejectReady(new Error("backend output stream ended"));
      }
    });

    return readyPromise;
  },

  async _pollUntilHealthy(overallTimeoutMs, intervalMs, requestTimeoutMs) {
    const deadline = Date.now() + overallTimeoutMs;
    for (;;) {
      if (await this._probeHealth(requestTimeoutMs)) {
        return true;
      }
      if (Date.now() >= deadline) {
        return false;
      }
      await PowerBrowserAPI.sleep(intervalMs);
    }
  },

  _probeHealth(timeoutMs) {
    const url = `http://127.0.0.1:${this._port}${HEALTH_PATH}`;
    return PowerBrowserAPI.probeHealth(url, this._token, timeoutMs);
  },

  /**
   * Hides the loading layer and navigates the browser element exactly
   * once, via powerbrowser.js's own exposed function (reached through the
   * browser element's owner window, not a Firefox-internal import).
   *
   * 01-09: `_swapped` is set AFTER the navigation call returns, not before it.
   * This field is now what `_spawnAndGate`'s one-time initialisation block and
   * `_restart()`'s per-attempt port choice are both keyed on, so a flag that
   * could read true for a swap that threw would reintroduce the exact
   * conflation class this file was just cleaned of. The early-return guard
   * stays first, so the navigation still happens at most once.
   */
  _swap() {
    if (this._swapped) {
      return;
    }
    this._browserElement.ownerDocument.defaultView.powerbrowserSwapToUrl(`http://127.0.0.1:${this._port}/`);
    this._swapped = true;
  },

  _fatal(message) {
    this._pushLog(`FATAL: ${message}`);
    PowerBrowserAPI.log("error", `[TheiaService] ${message}`);
  },

  /**
   * Buffers one line, oldest dropped first, sized from
   * powerbrowser.sidecar.logBufferLines. Timestamped (Date.now(), not the raw
   * pipe text) so a restart's actual backoff gaps are independently
   * measurable from getRecentLog() alone -- the acceptance bar for the
   * backoff-is-observable check.
   */
  _pushLog(line) {
    const max = PowerBrowserAPI.getIntPref("powerbrowser.sidecar.logBufferLines", 500);
    // MED-02 / WINDOWS.md 10: the diagnostics ring buffer is in-app reachable
    // (SHELL-04), so a line carrying the per-launch token (it arrives on
    // every request as a Cookie header, and _pumpOutput copies stdout here
    // verbatim) must never buffer verbatim. The `this._token ?` guard is
    // load-bearing, not defensive: `_token` is null until start() mints it,
    // and `replaceAll(null, ...)` would match the literal string "null"
    // while `replaceAll("", ...)` splices the replacement between every
    // character of the line. Scope boundary: the sibling PowerBrowserAPI.log
    // mirror in _pumpOutput stays unredacted -- it goes to the browser's own
    // stdout, the same sink the text already came from, not a new surface.
    const safe = this._token ? line.replaceAll(this._token, "[redacted]") : line;
    this._log.push(`[${Date.now()}] ${safe}`);
    while (this._log.length > max) {
      this._log.shift();
    }
  },
};
