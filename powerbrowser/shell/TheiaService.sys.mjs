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
      this._showError(resolved.reason, /* recoverable */ false);
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
   * `{ ok, reason }` -- D-113: both failure classes here are unrecoverable
   * (a missing pref or an unresolvable Node can never fix itself on retry),
   * and this method is only ever called once, from start() -- never from
   * the restart path -- so they can only ever be the first launch's give-up
   * case.
   */
  async _resolveSidecar() {
    this._backendMain = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.backendMain", "");
    if (!this._backendMain) {
      const reason = "powerbrowser.sidecar.backendMain is unset -- cannot locate the Theia backend entry file.";
      this._fatal(reason);
      return { ok: false, reason };
    }
    if (!(await PowerBrowserAPI.pathExists(this._backendMain))) {
      const reason = `powerbrowser.sidecar.backendMain (${this._backendMain}) does not exist -- cannot locate the Theia backend entry file.`;
      this._fatal(reason);
      return { ok: false, reason };
    }

    const configured = PowerBrowserAPI.getStringPref("powerbrowser.sidecar.nodePath", "");
    this._nodePath = configured || (await PowerBrowserAPI.pathSearch("node"));
    if (!this._nodePath) {
      const reason = "Could not resolve a Node executable -- set powerbrowser.sidecar.nodePath or add node to PATH.";
      this._fatal(reason);
      return { ok: false, reason };
    }

    return { ok: true, reason: null };
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
   * `{ ok, recoverable, reason }` (SHELL-03/D-113) instead of a bare
   * boolean, so `_restart()`/`start()` can tell an unrecoverable failure
   * (backend entry file unresolvable, spawn() itself throwing, the pinned
   * port held by another process -- D-112) from a transient one (readiness
   * stream ended, readiness timeout, health-probe timeout) without
   * re-deriving the classification. `reason` is a short human-readable
   * string reused verbatim as the error layer's message.
   *
   * `firstSpawn: true` requests port 0 (SIDE-01) -- the only place a zero
   * port appears in this file. Every later call (Task 2's restart path)
   * passes the already-pinned `this._port`, because the already-loaded
   * Theia page reconnects to the origin it was loaded from (D-104).
   */
  async _spawnAndGate(firstSpawn) {
    const port = firstSpawn ? 0 : this._port;
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
      const reason = `Failed to spawn the backend: ${err.message}`;
      this._fatal(reason);
      return { ok: false, recoverable: false, reason };
    }
    this._proc = proc;

    if (this._shuttingDown) {
      await this._reap();
      return { ok: false, recoverable: false, reason: "Shutting down." };
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
      const reason = `Failed to hand the backend its token over stdin: ${err.message}`;
      this._fatal(reason);
      await this._reap();
      return { ok: false, recoverable: true, reason };
    }

    const pinnedPort = firstSpawn ? null : this._port;
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
        return { ok: false, recoverable: false, reason: err.message };
      }
      const reason = `Backend output stream ended before announcing readiness: ${err.message}`;
      this._fatal(reason);
      return { ok: false, recoverable: true, reason };
    }

    if (!ready) {
      const reason = `Backend did not announce POWERBROWSER_BACKEND_READY within ${startupTimeoutMs}ms.`;
      this._fatal(reason);
      return { ok: false, recoverable: true, reason };
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
      const reason = `Health probe on port ${this._port} never returned 200 within ${startupTimeoutMs}ms.`;
      this._fatal(reason);
      return { ok: false, recoverable: true, reason };
    }

    this._healthy = true;

    if (firstSpawn) {
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

    return { ok: true, recoverable: null, reason: null };
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
   * Per-attempt port choice: `this._port === null` means no spawn in this
   * browser session has EVER succeeded yet -- keep requesting port 0
   * (SIDE-01) until one does. Once `this._port` is pinned, every later
   * attempt here is a true D-104 respawn on that same port.
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
        const result = await this._spawnAndGate(this._port === null);
        if (result.ok) {
          this._hideError();
          return;
        }

        await this._reap();
        if (this._shuttingDown) {
          return;
        }

        if (!result.recoverable) {
          this._pushLog(`Giving up immediately -- unrecoverable: ${result.reason}`);
          this._showError(result.reason, false);
          return;
        }

        if (attempts >= giveUpAttempts || Date.now() >= deadline) {
          this._pushLog(
            `Giving up -- retry budget exhausted after ${attempts} attempt(s): ${result.reason}`
          );
          this._showError(result.reason, true);
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
   * `reason` is plain language naming what failed; `recoverable` is the
   * classification carried by the triggering `_spawnAndGate`/
   * `_resolveSidecar` result. Neither this nor the chrome layer's own
   * sentinel may ever include the per-launch token or any credential --
   * `reason` strings in this file are always static/derived-from-config
   * text, never `this._token`.
   */
  _showError(reason, recoverable) {
    if (this._errorShown) {
      return;
    }
    this._errorShown = true;
    this._pushLog(`Showing error state (recoverable=${recoverable}): ${reason}`);
    this._browserElement.ownerDocument.defaultView.powerbrowserShowError({ reason, recoverable });
    this._startRecoveryProbe();
  },

  /** Hides the error layer and stops the background recovery probe. */
  _hideError() {
    if (!this._errorShown) {
      return;
    }
    this._errorShown = false;
    this._stopRecoveryProbe();
    this._browserElement.ownerDocument.defaultView.powerbrowserHideError();
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
   */
  _swap() {
    if (this._swapped) {
      return;
    }
    this._swapped = true;
    this._browserElement.ownerDocument.defaultView.powerbrowserSwapToUrl(`http://127.0.0.1:${this._port}/`);
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
