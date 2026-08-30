#!/usr/bin/env bash
# scripts/verify-phase-05.sh
#
# The single aggregator for every Phase 5 check, modelled on
# scripts/verify-phase-04.sh: unofficial-mode error handling (deliberately
# no `-e`, only `-u` and `pipefail` -- every check runs even if an earlier
# one failed), a CHECKS array later tasks append to rather than forking a
# sibling driver, and a per-check PASS/FAIL summary table with a non-zero
# exit if anything failed. One verification script per phase, extended
# never sibling'd (05-PATTERNS.md).
#
# `--quick` runs only checks needing no browser launch and no built tree.
# `--only <label>` runs exactly one named check and nothing else -- per-task
# sampling depends on it.
#
# Task 1 registers side04-sigkill-no-orphan and
# side04-unsupervised-backend-survives, both outside --quick (they launch
# the built objdir/dist/bin/sourcerer binary or spawn the Node backend
# directly). Task 2 appends side04-leftover-reaped and
# side04-stale-identity-not-signalled, also outside --quick.
#
# Every external script invocation runs under `setsid`, exactly like
# scripts/verify-phase-02.sh's/03.sh's/04.sh's own pattern: this script is
# non-interactive so job control is off, and a plain `cmd &` would share
# this script's own process group with every descendant a check
# backgrounds -- setsid makes the check the leader of its own new process
# group so `kill -- "-$PID"` on interrupt reaches the whole group in one
# signal.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

QUICK=0
ONLY=""
GATE=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --quick) QUICK=1; shift ;;
    --gate) GATE=1; shift ;;
    --only)
      if [ "$#" -lt 2 ]; then
        echo "verify-phase-05: FAIL -- --only requires a label argument" >&2
        exit 1
      fi
      ONLY="$2"
      shift 2
      ;;
    *)
      echo "verify-phase-05: FAIL -- unknown argument '$1'" >&2
      exit 1
      ;;
  esac
done

# --gate proves every phase gate green at one commit (D-127) -- it always
# runs this script's own FULL check set plus verify-phase-04.sh and
# verify-phase-03.sh in full. Combining it with --quick or --only would
# silently narrow "every phase gate" to a subset, contradicting the flag's
# own purpose, so the combination is a named, loud error rather than one
# flag winning silently.
if [ "$GATE" -eq 1 ] && { [ "$QUICK" -eq 1 ] || [ -n "$ONLY" ]; }; then
  echo "verify-phase-05: FAIL -- --gate cannot be combined with --quick or --only (rejected combination: --gate plus $([ "$QUICK" -eq 1 ] && echo -n '--quick'; [ "$QUICK" -eq 1 ] && [ -n "$ONLY" ] && echo -n ' and '; [ -n "$ONLY" ] && echo -n "--only $ONLY"))" >&2
  exit 1
fi

CURRENT_CHECK_PID=""
BACKEND_SPAWN_PID=""
BROWSER_SPAWN_PID=""
declare -a TEMP_PATHS=()
track_temp() { TEMP_PATHS+=("$1"); }

# WINDOWS.md 11: one run-scoped throwaway config home for every launch this
# script makes that doesn't explicitly override it (CR-01's plant_leftover
# still points its own launches at its own parent dir via
# VERIFY05_XDG_CONFIG_HOME). Without this, TheiaService._resolveConfigDir()
# falls through to the real $HOME/.config/sourcerer and litters it with one
# sidecar-state-<profile>.json per mktemp profile this harness ever used.
# Exported (not just passed to start_shell/start_shell_display's own setsid
# env) so scripts/lib/firefox-bidi.mjs's own child_process.spawn -- which
# inherits process.env by default and is invoked from inline node scripts
# this script itself spawns -- lands in the throwaway dir too; start_shell's
# explicit VERIFY05_XDG_CONFIG_HOME override still wins for its own launch.
HARNESS_CONFIG_HOME="$(mktemp -d)"; track_temp "$HARNESS_CONFIG_HOME"
export XDG_CONFIG_HOME="$HARNESS_CONFIG_HOME"
cleanup() {
  if [ -n "$CURRENT_CHECK_PID" ]; then
    kill -- "-$CURRENT_CHECK_PID" 2>/dev/null || kill "$CURRENT_CHECK_PID" 2>/dev/null || true
    wait "$CURRENT_CHECK_PID" 2>/dev/null || true
    CURRENT_CHECK_PID=""
  fi
  if [ -n "$BACKEND_SPAWN_PID" ]; then
    kill -- "-$BACKEND_SPAWN_PID" 2>/dev/null || kill "$BACKEND_SPAWN_PID" 2>/dev/null || true
    wait "$BACKEND_SPAWN_PID" 2>/dev/null || true
    BACKEND_SPAWN_PID=""
  fi
  if [ -n "$BROWSER_SPAWN_PID" ]; then
    kill -- "-$BROWSER_SPAWN_PID" 2>/dev/null || kill "$BROWSER_SPAWN_PID" 2>/dev/null || true
    wait "$BROWSER_SPAWN_PID" 2>/dev/null || true
    BROWSER_SPAWN_PID=""
  fi
  # -rf (not -f): TEMP_PATHS also carries throwaway profile/config directories.
  for p in "${TEMP_PATHS[@]:-}"; do
    [ -n "$p" ] && rm -rf "$p"
  done
  TEMP_PATHS=()
}
# EXIT alone is not enough: bash resumes the rest of the script after a
# non-EXIT trap handler returns unless that handler exits itself
# (scripts/verify-phase-02.sh/03.sh/04.sh's own documented reason for
# splitting this into two traps).
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

# --- shared helpers, ported from verify-phase-04.sh (one-self-contained-
# script-per-phase idiom -- never sourced from that file) ------------------

BROWSER_LOG=""
# Set by start_shell_display() to the DISPLAY value it actually used
# (existing $DISPLAY or a freshly-started Xvfb's), so a caller doing a
# manual second/third launch against the same display doesn't have to
# re-derive it.
DISPLAY_IN_USE=""

# Spawns the built binary headless with a throwaway profile, capturing its
# combined stdout+stderr to a track_temp-registered log file. Callers poll
# BROWSER_LOG for whatever sentinel they need; stop_shell() always tears the
# process (and setsid process group) down. A missing/non-executable binary
# is a named FAIL, not a skip.
#
# Optional $1: an explicit profile directory to launch against, instead of
# a fresh mktemp -d one -- mirrors start_shell_display()'s own optional
# profile parameter (05-04). CR-01's plant_leftover() needs this: the
# planted state file's name now carries a profile-scoped suffix
# (TheiaService._profileStateKey()), so the fixture must know the profile
# path BEFORE the launch, not receive whatever start_shell() would
# otherwise mint internally.
start_shell() {
  local profile_override="${1:-}"
  local bin="$REPO_ROOT/objdir/dist/bin/sourcerer"
  if [ ! -x "$bin" ]; then
    echo "start_shell: FAIL -- $bin does not exist or is not executable (run the Phase 1 Firefox build first)" >&2
    return 1
  fi
  local log profile
  log="$(mktemp)"; track_temp "$log"
  if [ -n "$profile_override" ]; then
    profile="$profile_override"
  else
    profile="$(mktemp -d)"; track_temp "$profile"
  fi
  BROWSER_LOG="$log"

  local -a env_args=(env "XDG_CONFIG_HOME=${VERIFY05_XDG_CONFIG_HOME:-$HARNESS_CONFIG_HOME}")
  if [ -n "${VERIFY05_USER_JS_PROFILE:-}" ]; then
    mkdir -p "$profile"
    cp "$VERIFY05_USER_JS_PROFILE" "$profile/user.js"
  fi

  setsid "${env_args[@]}" "$bin" --headless --profile "$profile" >"$log" 2>&1 &
  BROWSER_SPAWN_PID=$!
  return 0
}

stop_shell() {
  if [ -n "$BROWSER_SPAWN_PID" ]; then
    kill -- "-$BROWSER_SPAWN_PID" 2>/dev/null || kill "$BROWSER_SPAWN_PID" 2>/dev/null || true
    wait "$BROWSER_SPAWN_PID" 2>/dev/null || true
    BROWSER_SPAWN_PID=""
  fi
}

# Byte offset (not line number) of the first line beginning with the given
# literal prefix, or empty if absent. Tolerates the SourcererAPI.log()
# mirror prefix "[SourcererAPI] <level>: " exactly like verify-phase-04.sh's
# own helper.
first_byte_offset() {
  grep -abom1 -E "^(\\[SourcererAPI\\] [a-z]+: )?$1" "$2" 2>/dev/null | cut -d: -f1
}

# True (exit 0) when <log> contains a line beginning with the literal
# prefix <1>, tolerating the same "[SourcererAPI] <level>: " mirror prefix
# first_byte_offset does.
sentinel_present() {
  grep -qE "^(\\[SourcererAPI\\] [a-z]+: )?$1" "$2" 2>/dev/null
}

# Every pid announced by a SOURCERER_BACKEND_READY sentinel in <log>, oldest
# first, one per line.
backend_ready_pids() {
  sed -E 's/^\[SourcererAPI\] [a-z]+: //' "$1" 2>/dev/null \
    | grep -E '^SOURCERER_BACKEND_READY ' \
    | sed -E 's/^SOURCERER_BACKEND_READY //' \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const l of s.split("\n")){if(!l.trim())continue;try{const j=JSON.parse(l);if(typeof j.pid==="number")console.log(j.pid)}catch{}}})' 2>/dev/null
}

# The process group a pid belongs to; empty if the process is gone.
pgid_of() {
  ps -o pgid= -p "$1" 2>/dev/null | tr -d ' '
}

# Hermetic replacement for a machine-wide `pgrep -f 'backend/main.js'`:
# considers ONLY backends inside process groups this run created. A backend
# inherits its browser's process group (SourcererAPI's Subprocess does not
# setsid the child, so browser and backend report the same PGID -- verified
# live against a running instance) and keeps that group after the browser
# dies, so the group is a stable, run-scoped identity for exactly the orphan
# these checks hunt. An unscoped pattern match instead fails on any machine
# that has a Sourcerer open -- which is the state a phase-5 session itself
# leaves behind, making the gate unreproducible on a developer box.
# $1: comma-separated pgid list. Prints "pid cmdline" lines, one per match.
backends_in_groups() {
  pgrep -a -g "$1" -f 'backend/main\.js' 2>/dev/null || true
}

# --- Task 1 (05-02): harness-display-available -----------------------------
#
# Discriminator A (05-02-PLAN.md): a non-headless start_shell variant.
# gfxPlatform::IsHeadless() forces mDisableRemoteClient=true whenever
# MOZ_HEADLESS/--headless is set (05-RESEARCH.md Pitfall 1) -- start_shell()
# above launches headless, so it can never exercise a real paint or Firefox's
# native remoting protocol. This helper drops --headless and supplies a
# DISPLAY: an existing one first, else a freshly-started Xvfb on a free
# display number (resolved on demand via `nix build nixpkgs#xorg.xvfb` --
# none of this repo's dev shells carry an Xvfb binary, since neither the
# Theia nor the Firefox toolchain needs one). Returns 2 (distinct from every
# other helper's 1) specifically for "no display could be obtained at all",
# so the registered check can never silently skip or vacuously pass.
XVFB_SPAWN_PID=""
XVFB_DISPLAY_NUM=""

find_free_display_num() {
  local n
  for n in $(seq 90 199); do
    [ ! -e "/tmp/.X11-unix/X$n" ] && { echo "$n"; return 0; }
  done
  return 1
}

start_virtual_display() {
  local num
  num="$(find_free_display_num)" || return 2

  local xvfb_log
  xvfb_log="$(mktemp)"; track_temp "$xvfb_log"

  local xvfb_bin
  xvfb_bin="$(timeout 60 nix build --no-link --print-out-paths 'nixpkgs#xorg.xvfb' 2>>"$xvfb_log")/bin/Xvfb"
  if [ ! -x "$xvfb_bin" ]; then
    echo "start_virtual_display: FAIL -- Xvfb unavailable on this host (nix resolution failed); see $xvfb_log" >&2
    return 2
  fi

  setsid "$xvfb_bin" ":$num" -screen 0 1280x800x24 >"$xvfb_log" 2>&1 &
  XVFB_SPAWN_PID=$!

  local deadline=$((SECONDS + 10))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if [ -e "/tmp/.X11-unix/X$num" ]; then
      XVFB_DISPLAY_NUM="$num"
      return 0
    fi
    if ! kill -0 "$XVFB_SPAWN_PID" 2>/dev/null; then
      echo "start_virtual_display: FAIL -- Xvfb exited before creating its display socket; log:" >&2
      cat "$xvfb_log" >&2
      return 2
    fi
    sleep 0.2
  done
  echo "start_virtual_display: FAIL -- Xvfb did not create its display socket within 10s" >&2
  return 2
}

stop_virtual_display() {
  if [ -n "$XVFB_SPAWN_PID" ]; then
    kill -- "-$XVFB_SPAWN_PID" 2>/dev/null || kill "$XVFB_SPAWN_PID" 2>/dev/null || true
    wait "$XVFB_SPAWN_PID" 2>/dev/null || true
    XVFB_SPAWN_PID=""
  fi
  XVFB_DISPLAY_NUM=""
}

# The non-headless sibling of start_shell(): same log/profile capture and
# VERIFY05_USER_JS_PROFILE support, but launched against a real DISPLAY
# instead of --headless. Returns 1 for "binary missing" (matches
# start_shell()'s own convention) and 2 for "no display available at all"
# (start_virtual_display()'s propagated code) -- callers must not treat
# either as a skip.
#
# Optional $1: an explicit profile directory to launch against, instead of
# a fresh mktemp -d one. SIDE-05's second-launch checks need this -- two
# launches sharing the identical profile path is the entire mechanism
# under test (nsRemoteService keys remoting on the profile path,
# upstream/toolkit/xre/nsAppRunner.cpp:5342-5358), and the caller (not this
# helper) owns and track_temp's a profile that outlives any single launch.
start_shell_display() {
  local profile_override="${1:-}"
  local display_to_use=""
  if [ -n "${DISPLAY:-}" ]; then
    display_to_use="$DISPLAY"
  else
    start_virtual_display || return $?
    display_to_use=":$XVFB_DISPLAY_NUM"
  fi

  local bin="$REPO_ROOT/objdir/dist/bin/sourcerer"
  if [ ! -x "$bin" ]; then
    echo "start_shell_display: FAIL -- $bin does not exist or is not executable (run the Phase 1 Firefox build first)" >&2
    stop_virtual_display
    return 1
  fi
  local log profile
  log="$(mktemp)"; track_temp "$log"
  if [ -n "$profile_override" ]; then
    profile="$profile_override"
  else
    profile="$(mktemp -d)"; track_temp "$profile"
  fi
  BROWSER_LOG="$log"

  if [ -n "${VERIFY05_USER_JS_PROFILE:-}" ]; then
    mkdir -p "$profile"
    cp "$VERIFY05_USER_JS_PROFILE" "$profile/user.js"
  fi

  setsid env "DISPLAY=$display_to_use" "XDG_CONFIG_HOME=${VERIFY05_XDG_CONFIG_HOME:-$HARNESS_CONFIG_HOME}" "$bin" --profile "$profile" >"$log" 2>&1 &
  BROWSER_SPAWN_PID=$!
  DISPLAY_IN_USE="$display_to_use"
  return 0
}

stop_shell_display() {
  stop_shell
  stop_virtual_display
}

# Launches through start_shell_display(), asserts SOURCERER_SHELL_READY
# appears within a bounded poll, and stops it -- a display that cannot be
# obtained at all is a named FAIL (start_shell_display's propagated 1/2),
# never a skip and never a pass.
check_harness_display_available() {
  local rc
  start_shell_display
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "harness-display-available: FAIL -- SIDE-04 -- no usable display (neither an existing DISPLAY nor a resolvable Xvfb); see helper output above" >&2
    stop_shell_display
    return 1
  fi

  local deadline=$((SECONDS + 30))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_SHELL_READY' "$BROWSER_LOG" && { stop_shell_display; return 0; }
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "harness-display-available: FAIL -- browser process exited before SOURCERER_SHELL_READY appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell_display
      return 1
    fi
    sleep 0.5
  done
  echo "harness-display-available: FAIL -- SOURCERER_SHELL_READY did not appear within 30s; log:" >&2
  cat "$BROWSER_LOG" >&2
  stop_shell_display
  return 1
}

# --- Task 1: side04-sigkill-no-orphan / side04-unsupervised-backend-survives

# Poll /proc/<pid>/status's State: line for up to 15s, treating Z (zombie)
# as "as good as gone" (05-RESEARCH.md Pitfall 3 -- a recently-SIGKILLed
# child that hasn't been reaped yet still answers a bare-existence check).
# Returns 0 once the pid is gone or zombied, 1 on timeout.
#
# Reaps <pid> the instant it goes zombie, IF this script happens to be its
# real parent (plant_leftover's own `setsid sleep ... &`) -- `wait` on an
# already-terminated child returns immediately rather than blocking, so
# this never stalls. Without this, D-125's own planted process would sit
# as an unreaped zombie until this script's unplant_leftover() finally
# calls `wait` at cleanup time, and kill(pid,0) (SourcererAPI.signalBarePid's
# liveness re-check, same zombie-blind gotcha) would see it as "still
# alive" from the browser's side for however long that takes -- exactly
# the false-alive race this helper exists to avoid. `wait` on a pid this
# script did NOT fork (the SIGKILL-orphan check's real backend pid, a
# grandchild of the killed browser) harmlessly fails with "not a child of
# this shell"; `|| true` absorbs that.
wait_pid_gone_or_zombie() {
  local pid="$1" deadline=$((SECONDS + 15)) state
  while [ "$SECONDS" -lt "$deadline" ]; do
    if [ ! -e "/proc/$pid" ]; then
      return 0
    fi
    state="$(awk '/^State:/{print $2}' "/proc/$pid/status" 2>/dev/null)"
    if [ "$state" = "Z" ] || [ -z "$state" ]; then
      wait "$pid" 2>/dev/null || true
      return 0
    fi
    sleep 0.5
  done
  return 1
}

# D-125's headline check (SIDE-04). Launches the shell, reads the announced
# backend pid from the sentinel, asserts it is ALIVE (never pass vacuously
# on a launch that silently failed), SIGKILLs the browser process ALONE
# (never its process group -- the backend is a member of that same group,
# so a group kill would make the assertion prove nothing), then asserts
# both that the announced pid disappears within a bounded poll and that no
# process whose command line contains the backend entry file remains.
check_side04_sigkill_no_orphan() {
  if ! start_shell; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 60))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_BACKEND_READY ' "$BROWSER_LOG" && break
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- browser process exited before SOURCERER_BACKEND_READY appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell
      return 1
    fi
    sleep 0.5
  done
  if ! sentinel_present 'SOURCERER_BACKEND_READY ' "$BROWSER_LOG"; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- SOURCERER_BACKEND_READY did not appear within 60s; log:" >&2
    cat "$BROWSER_LOG" >&2
    stop_shell
    return 1
  fi

  local backend_pid
  backend_pid="$(backend_ready_pids "$BROWSER_LOG" | head -1)"
  if [ -z "$backend_pid" ]; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- could not read a pid from SOURCERER_BACKEND_READY in the browser log" >&2
    stop_shell
    return 1
  fi

  # Must be alive BEFORE the kill, or "no orphan found" passes vacuously on
  # a launch that silently failed.
  if [ ! -e "/proc/$backend_pid" ]; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- announced backend pid $backend_pid is not running before the kill; the check cannot prove anything" >&2
    stop_shell
    return 1
  fi

  # Read the group BEFORE the kill, while the process is known alive: after
  # the browser dies an orphan is reparented to init but keeps this group,
  # so it is the identity the post-kill scan matches on.
  local backend_pgid
  backend_pgid="$(pgid_of "$backend_pid")"
  if [ -z "$backend_pgid" ]; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- could not read the process group of backend pid $backend_pid before the kill" >&2
    stop_shell
    return 1
  fi

  local result=0

  # Signal the browser process alone. BROWSER_SPAWN_PID is the setsid
  # leader wrapping "$bin" directly (start_shell's exec chain has no
  # intermediate shell), so it IS the browser pid. Signal only that pid --
  # never "-$BROWSER_SPAWN_PID" (the process-group form) -- because the
  # backend is a member of the same setsid-created group and a group kill
  # would kill it directly, making the "the watchdog did it" assertion
  # vacuous.
  if ! kill -9 "$BROWSER_SPAWN_PID" 2>/dev/null; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- could not SIGKILL the browser pid $BROWSER_SPAWN_PID" >&2
    result=1
  fi

  if ! wait_pid_gone_or_zombie "$backend_pid"; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- backend pid $backend_pid was still alive 15s after SIGKILLing the browser alone" >&2
    result=1
  fi

  local orphans
  orphans="$(backends_in_groups "$backend_pgid")"
  if [ -n "$orphans" ]; then
    echo "side04-sigkill-no-orphan: FAIL -- SIDE-04 -- a process matching 'backend/main.js' from this launch's process group ($backend_pgid) is still running after the browser was SIGKILLed:" >&2
    printf '%s\n' "$orphans" >&2
    result=1
  fi

  BROWSER_SPAWN_PID=""
  wait "$backend_pid" 2>/dev/null || true
  return "$result"
}

# D-109's negative control: a backend started directly (no supervisor, no
# SOURCERER_SUPERVISED marker) with stdin redirected from /dev/null must
# NOT self-terminate. Proves the watchdog cannot break yarn start,
# smoke-theia.sh, or verify-phase-04.sh's own start_backend.
check_side04_unsupervised_backend_survives() {
  local token log result=0
  token="$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')"
  log="$(mktemp)"; track_temp "$log"

  # -u, not just the assignments below: this is the NEGATIVE control, so it
  # must supply the marker's absence rather than inherit it. A harness run
  # from a shell that exported SOURCERER_SUPERVISED (or the dev bypass) would
  # otherwise arm the very watchdog this check proves stays inert, and fail
  # for a reason that has nothing to do with the code under test.
  setsid env -u SOURCERER_SUPERVISED -u SOURCERER_TOKEN_DISABLE \
    SOURCERER_TOKEN="$token" \
    THEIA_CONFIG_DIR="$(mktemp -d)" \
    VSX_REGISTRY_URL="https://open-vsx.org" \
    nix develop "$REPO_ROOT#theia" --command \
    node "$REPO_ROOT/theia/applications/browser/lib/backend/main.js" --hostname 127.0.0.1 --port 0 \
    <"/dev/null" >"$log" 2>&1 &
  BACKEND_SPAWN_PID=$!

  sleep 3
  if ! kill -0 "$BACKEND_SPAWN_PID" 2>/dev/null; then
    echo "side04-unsupervised-backend-survives: FAIL -- SIDE-04 -- an unsupervised backend with /dev/null stdin exited within 3s; log:" >&2
    cat "$log" >&2
    result=1
  fi

  kill -- "-$BACKEND_SPAWN_PID" 2>/dev/null || kill "$BACKEND_SPAWN_PID" 2>/dev/null || true
  wait "$BACKEND_SPAWN_PID" 2>/dev/null || true
  BACKEND_SPAWN_PID=""
  return "$result"
}

# --- Task 2: side04-leftover-reaped / side04-stale-identity-not-signalled

# /proc/<pid>/stat field 22 (starttime), via the last-')'-then-split rule
# (05-RESEARCH.md Pattern 2 / Pitfall 2) -- must match TheiaService's own
# reader exactly, since the two are compared for exact string equality.
read_start_ticks() {
  awk '{
    line=$0
    idx=match(line, /\)[^)]*$/)
    rest=substr(line, idx+2)
    n=split(rest, f, " ")
    print f[20]
  }' "/proc/$1/stat" 2>/dev/null
}

# Mirrors TheiaService._profileStateKey() (sourcerer/shell/
# TheiaService.sys.mjs) byte-for-byte: the CR-01 fix suffixes the sidecar
# state file's name with a sanitized form of the launch's own resolved
# profile directory path (Services.dirsvc.get("ProfD", ...).path), every
# run of non-alphanumeric characters collapsed to one "_". realpath first,
# since ProfD is the platform's own canonicalized path and a caller here
# might otherwise pass a path containing an as-yet-unresolved symlink
# component. Must match exactly, or plant_leftover()'s fixture and
# TheiaService's own reader resolve two different filenames and every
# SIDE-04 leftover-reap control below proves nothing.
profile_state_key() {
  local resolved
  resolved="$(realpath "$1")"
  printf '%s' "$resolved" | sed -E 's/[^a-zA-Z0-9]+/_/g'
}

# Plants a long-sleeping process under setsid and writes a state file into
# a throwaway config directory in the same JSON shape TheiaService writes
# (pid, port, startTicks, writtenAt), named with the exact profile-scoped
# suffix the real launch below will resolve. Sets PLANTED_PID/
# PLANTED_CONFIG_DIR/PLANTED_STATE_FILE/PLANTED_PROFILE_DIR for the caller
# -- the caller must pass PLANTED_PROFILE_DIR to start_shell() so the SAME
# profile path is what TheiaService actually resolves ProfD from.
PLANTED_PID=""
PLANTED_TICKS=""
PLANTED_CONFIG_DIR=""
PLANTED_STATE_FILE=""
PLANTED_PROFILE_DIR=""
plant_leftover() {
  local start_ticks="$1" # "" means read the real value; anything else overrides it (negative control)
  setsid sleep 300 &
  PLANTED_PID=$!
  # Let /proc/<pid>/stat settle before reading starttime.
  sleep 0.2

  local ticks
  if [ -n "$start_ticks" ]; then
    ticks="$start_ticks"
  else
    ticks="$(read_start_ticks "$PLANTED_PID")"
  fi
  PLANTED_TICKS="$ticks"

  local parent
  parent="$(mktemp -d)"; track_temp "$parent"
  PLANTED_CONFIG_DIR="$parent/sourcerer"
  mkdir -p "$PLANTED_CONFIG_DIR"

  PLANTED_PROFILE_DIR="$(mktemp -d)"; track_temp "$PLANTED_PROFILE_DIR"
  local profile_key
  profile_key="$(profile_state_key "$PLANTED_PROFILE_DIR")"
  PLANTED_STATE_FILE="$PLANTED_CONFIG_DIR/sidecar-state-${profile_key}.json"

  node -e '
    const fs = require("fs");
    const [, path, pid, ticks] = process.argv;
    fs.writeFileSync(path, JSON.stringify({
      pid: Number(pid), port: 65000, startTicks: ticks, writtenAt: Date.now()
    }));
  ' "$PLANTED_STATE_FILE" "$PLANTED_PID" "$ticks"

  export VERIFY05_XDG_CONFIG_HOME="$parent"
}

unplant_leftover() {
  if [ -n "$PLANTED_PID" ]; then
    kill -9 "$PLANTED_PID" 2>/dev/null || true
    wait "$PLANTED_PID" 2>/dev/null || true
    PLANTED_PID=""
  fi
  PLANTED_TICKS=""
  PLANTED_PROFILE_DIR=""
  unset VERIFY05_XDG_CONFIG_HOME
}

# D-125 positive control: a state file naming a real, verified-identity
# leftover must be reaped (SIGTERM'd and removed from the state file)
# before the next startup's first spawn.
check_side04_leftover_reaped() {
  plant_leftover ""
  local result=0

  if ! start_shell "$PLANTED_PROFILE_DIR"; then
    echo "side04-leftover-reaped: FAIL -- SIDE-04 -- could not launch the built binary" >&2
    unplant_leftover
    return 1
  fi

  if ! wait_pid_gone_or_zombie "$PLANTED_PID"; then
    echo "side04-leftover-reaped: FAIL -- SIDE-04 -- planted leftover pid $PLANTED_PID was still alive after startup; log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  fi

  # Compare startTicks, not pid: by the time this runs, TheiaService's own
  # first spawn has already written a NEW state-file record for the real
  # backend it just started, and Linux is free to recycle the
  # just-vacated PLANTED_PID onto that very process -- a raw pid substring
  # match would then false-positive on a perfectly healthy, unrelated
  # record. startTicks is what actually distinguishes "the same process"
  # from "a different process that happens to share a pid number", and is
  # exactly the identity signal D-111 itself relies on.
  #
  # Bounded settle poll, not a point-in-time read: _reapLeftover's own
  # internal poll (checking liveness every 100ms) and this script's
  # wait_pid_gone_or_zombie poll (checking every 500ms) run independently,
  # so a single read taken the instant wait_pid_gone_or_zombie returns can
  # race the browser's own removeStateFile()/re-write still landing.
  local settle_deadline=$((SECONDS + 10)) current_ticks=""
  while [ "$SECONDS" -lt "$settle_deadline" ]; do
    if [ -e "$PLANTED_STATE_FILE" ]; then
      current_ticks="$(node -e '
        try {
          const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
          if (typeof j.startTicks === "string") process.stdout.write(j.startTicks);
        } catch {}
      ' "$PLANTED_STATE_FILE" 2>/dev/null)"
    else
      current_ticks=""
    fi
    [ "$current_ticks" != "$PLANTED_TICKS" ] && break
    sleep 0.3
  done
  if [ -n "$current_ticks" ] && [ "$current_ticks" = "$PLANTED_TICKS" ]; then
    echo "side04-leftover-reaped: FAIL -- SIDE-04 -- state file still records the reaped leftover's own start ticks ($PLANTED_TICKS) after startup" >&2
    result=1
  fi

  stop_shell
  unplant_leftover
  return "$result"
}

# D-125 negative control: a state file whose recorded start-time ticks do
# NOT match the live process's actual start-time must NEVER be signalled
# (the recycled-pid footgun, D-111) -- the planted process must still be
# alive, and the launch log must carry the mismatch line (so the check
# cannot pass merely because the shell never reached the reap decision).
check_side04_stale_identity_not_signalled() {
  plant_leftover "999999999"
  local result=0

  if ! start_shell "$PLANTED_PROFILE_DIR"; then
    echo "side04-stale-identity-not-signalled: FAIL -- SIDE-04 -- could not launch the built binary" >&2
    unplant_leftover
    return 1
  fi

  # Give startup's reap decision time to run before asserting.
  local deadline=$((SECONDS + 20))
  while [ "$SECONDS" -lt "$deadline" ]; do
    grep -qi 'startTicks' "$BROWSER_LOG" 2>/dev/null && break
    sentinel_present 'SOURCERER_BACKEND_READY ' "$BROWSER_LOG" && break
    sleep 0.5
  done

  if ! kill -0 "$PLANTED_PID" 2>/dev/null; then
    echo "side04-stale-identity-not-signalled: FAIL -- SIDE-04 -- planted process with a MISMATCHED recorded start time was signalled (it is no longer alive)" >&2
    result=1
  fi

  if ! grep -qi 'mismatch\|recycled\|stale' "$BROWSER_LOG" 2>/dev/null; then
    echo "side04-stale-identity-not-signalled: FAIL -- SIDE-04 -- launch log carries no mismatch line -- cannot confirm the reap decision was actually reached; log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  fi

  stop_shell
  unplant_leftover
  return "$result"
}

# --- Task 3 (05-02): shell03-unrecoverable-immediate-error /
# shell03-budget-exhausted-error / shell03-auto-dismiss-on-selfheal --------
#
# All three drive the built binary headless via start_shell()/stop_shell()
# (Task 1's harness-display-available already proved --headless is not
# needed to exercise this chrome-JS-only surface -- no compositor/paint
# involvement, only stdout sentinels) with a VERIFY05_USER_JS_PROFILE
# forcing a fast give-up/recovery. A fourth check driving the Retry button
# itself does not exist: Task 1's Discriminator B (chrome-side Marionette
# automation) is blocked on Linux (moz:windowless is macOS-only --
# WINDOWS.md entry 7), so the Retry-button click is routed to the human
# record instead (05-02-SUMMARY.md), per the plan's own named fallback.

# D-125-style positive control: the unrecoverable case must show NO
# spawn-attempt-failure line at all, so this can never pass merely because
# the recoverable-failure detection also happens to fire zero times.
SPAWN_ATTEMPT_FAILURE_PATTERN='Backend output stream ended before announcing readiness|did not announce SOURCERER_BACKEND_READY within|Health probe on port .* never returned 200'

check_shell03_unrecoverable_immediate_error() {
  local user_js result=0
  user_js="$(mktemp)"; track_temp "$user_js"
  cat > "$user_js" <<'EOF'
user_pref("sourcerer.sidecar.backendMain", "/nonexistent/sourcerer-verify-05/main.js");
EOF

  export VERIFY05_USER_JS_PROFILE="$user_js"
  start_shell
  local start_rc=$?
  unset VERIFY05_USER_JS_PROFILE
  if [ "$start_rc" -ne 0 ]; then
    echo "shell03-unrecoverable-immediate-error: FAIL -- SHELL-03 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 15))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG" && break
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "shell03-unrecoverable-immediate-error: FAIL -- SHELL-03 -- browser exited before the error sentinel appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell
      return 1
    fi
    sleep 0.25
  done

  if ! sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG"; then
    echo "shell03-unrecoverable-immediate-error: FAIL -- SHELL-03 -- SOURCERER_SHELL_ERROR did not appear within 15s; log:" >&2
    cat "$BROWSER_LOG" >&2
    stop_shell
    return 1
  fi

  if sentinel_present 'SOURCERER_SHELL_SWAP ' "$BROWSER_LOG"; then
    echo "shell03-unrecoverable-immediate-error: FAIL -- SHELL-03 -- launch log carries a swap sentinel; an unrecoverable failure must never reach it" >&2
    result=1
  fi

  if grep -qE "$SPAWN_ATTEMPT_FAILURE_PATTERN" "$BROWSER_LOG"; then
    echo "shell03-unrecoverable-immediate-error: FAIL -- SHELL-03 -- launch log shows a spawn-attempt failure; an unrecoverable classification must give up before ever attempting a spawn" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  fi

  stop_shell
  return "$result"
}

# D-113's recoverable-budget-exhausted path: a backend that fails every
# time it is spawned, under a lowered attempt cap, must produce EXACTLY
# that many respawn attempts before giving up -- neither fewer (budget not
# honoured) nor more (budget not enforced).
check_shell03_budget_exhausted_error() {
  local crasher_dir crasher user_js result=0
  crasher_dir="$(mktemp -d)"; track_temp "$crasher_dir"
  crasher="$crasher_dir/main.js"
  echo 'process.exit(1);' > "$crasher"

  user_js="$(mktemp)"; track_temp "$user_js"
  cat > "$user_js" <<EOF
user_pref("sourcerer.sidecar.backendMain", "$crasher");
user_pref("sourcerer.sidecar.giveUpAttempts", 2);
EOF

  export VERIFY05_USER_JS_PROFILE="$user_js"
  start_shell
  local start_rc=$?
  unset VERIFY05_USER_JS_PROFILE
  if [ "$start_rc" -ne 0 ]; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 30))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG" && break
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- browser exited before the error sentinel appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell
      return 1
    fi
    sleep 0.5
  done

  if ! sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG"; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- SOURCERER_SHELL_ERROR did not appear within 30s; log:" >&2
    cat "$BROWSER_LOG" >&2
    stop_shell
    return 1
  fi

  # Every failed spawn attempt logs one "output stream ended" fatal line
  # via SourcererAPI.log(), which Firefox's own console mirror duplicates
  # onto a second stdout line (dump() + console.error(), the established
  # SourcererAPI.log() shape) -- divide by 2 for the true attempt count.
  local raw_lines attempt_count
  raw_lines="$(grep -cE "$SPAWN_ATTEMPT_FAILURE_PATTERN" "$BROWSER_LOG")"
  attempt_count=$((raw_lines / 2))
  if [ "$attempt_count" -ne 2 ]; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- expected exactly 2 respawn attempts (giveUpAttempts=2), observed $attempt_count ($raw_lines raw log lines); log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  fi

  # Exactly one error sentinel even though the give-up path here is
  # reached only once per launch -- guards _showError's _errorShown flag
  # against re-painting/re-emitting for the same state.
  local error_sentinel_count
  error_sentinel_count="$(grep -c 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG")"
  if [ "$error_sentinel_count" -ne 1 ]; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- expected exactly one SOURCERER_SHELL_ERROR sentinel, found $error_sentinel_count" >&2
    result=1
  fi

  # The sentinel's JSON must carry only reason + classification -- never
  # the per-launch token or any other key.
  if ! grep -qE '^SOURCERER_SHELL_ERROR \{"reason":"[^"]*","recoverable":(true|false)\}$' "$BROWSER_LOG"; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- SOURCERER_SHELL_ERROR sentinel JSON does not match the expected {reason, recoverable} shape" >&2
    result=1
  fi
  if grep 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG" | grep -qi 'SOURCERER_TOKEN'; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- an error sentinel line mentions the token environment-variable name" >&2
    result=1
  fi

  # Positive control for verify-phase-04.sh's shell05 deck-state assertion:
  # that check demands all three layers resolve to "none" after the swap, and
  # a sentinel that reported "none" unconditionally (or a getComputedStyle
  # that does not work headless) would satisfy it forever. This run really
  # does put the error layer up, so its deck-state line must NOT say "none".
  local deck_error_line
  deck_error_line="$(sed -E 's/^\[SourcererAPI\] [a-z]+: //' "$BROWSER_LOG" | grep -E '^SOURCERER_DECK_STATE .*"where":"error"' | head -1)"
  if [ -z "$deck_error_line" ]; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- no SOURCERER_DECK_STATE sentinel accompanied the error sentinel" >&2
    result=1
  elif grep -q '"error":"none"' <<<"$deck_error_line"; then
    echo "shell03-budget-exhausted-error: FAIL -- SHELL-03 -- the error layer reports display:none while its own error sentinel was just written: $deck_error_line" >&2
    result=1
  fi

  stop_shell
  return "$result"
}

# D-115's auto-dismiss path, driven as a genuinely MID-SESSION outage (not
# a first-launch failure): the backend succeeds once (one swap sentinel),
# then crashes on its own a few seconds later; the health loop detects it,
# the single-attempt respawn budget is immediately exhausted (error shown),
# and the background recovery probe's next respawn succeeds -- clearing the
# error with no input ever sent to the window.
check_shell03_auto_dismiss_on_selfheal() {
  local wrap_dir marker real_main user_js result=0
  wrap_dir="$(mktemp -d)"; track_temp "$wrap_dir"
  marker="$wrap_dir/count"
  echo 0 > "$marker"
  real_main="$REPO_ROOT/theia/applications/browser/lib/backend/main.js"
  cat > "$wrap_dir/main.js" <<EOF
const fs = require('fs');
const marker = '$marker';
let n = parseInt(fs.readFileSync(marker, 'utf8'), 10);
n += 1;
fs.writeFileSync(marker, String(n));
// Attempt 1: start normally, then self-destruct a few seconds in --
// simulates a real mid-session crash of an already-healthy backend.
// Attempt 2 (the health loop's own single-budget respawn): crash
// immediately, forcing the give-up/error-shown path.
// Attempt 3+ (the recovery probe's respawn): succeed cleanly.
if (n === 2) {
  process.exit(1);
}
if (n === 1) {
  setTimeout(() => process.exit(1), 3000);
}
require('$real_main');
EOF

  user_js="$(mktemp)"; track_temp "$user_js"
  cat > "$user_js" <<EOF
user_pref("sourcerer.sidecar.backendMain", "$wrap_dir/main.js");
user_pref("sourcerer.sidecar.giveUpAttempts", 1);
user_pref("sourcerer.sidecar.healthIntervalSteadyMs", 1000);
user_pref("sourcerer.sidecar.recoveryProbeIntervalMs", 2000);
EOF

  export VERIFY05_USER_JS_PROFILE="$user_js"
  start_shell
  local start_rc=$?
  unset VERIFY05_USER_JS_PROFILE
  if [ "$start_rc" -ne 0 ]; then
    echo "shell03-auto-dismiss-on-selfheal: FAIL -- SHELL-03 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 40))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_SHELL_ERROR_CLEARED' "$BROWSER_LOG" && break
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "shell03-auto-dismiss-on-selfheal: FAIL -- SHELL-03 -- browser exited before the cleared sentinel appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell
      return 1
    fi
    sleep 0.5
  done

  if ! sentinel_present 'SOURCERER_SHELL_ERROR_CLEARED' "$BROWSER_LOG"; then
    echo "shell03-auto-dismiss-on-selfheal: FAIL -- SHELL-03 -- SOURCERER_SHELL_ERROR_CLEARED did not appear within 40s (no input was ever sent to the window); log:" >&2
    cat "$BROWSER_LOG" >&2
    stop_shell
    return 1
  fi

  if ! sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG"; then
    echo "shell03-auto-dismiss-on-selfheal: FAIL -- SHELL-03 -- cleared sentinel appeared without ever showing the error sentinel first -- this run proves nothing" >&2
    result=1
  fi

  # Mid-session invariant (D-114): the content browser's location never
  # changes while the error layer is visible -- exactly one swap sentinel
  # across the whole session (the original successful launch), never a
  # second one for the recovery.
  local swap_count
  swap_count="$(grep -c 'SOURCERER_SHELL_SWAP ' "$BROWSER_LOG")"
  if [ "$swap_count" -ne 1 ]; then
    echo "shell03-auto-dismiss-on-selfheal: FAIL -- SHELL-03 -- expected exactly one swap sentinel across the whole session, found $swap_count; log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  fi

  stop_shell
  return "$result"
}

# --- Task 2 (05-03): shell04-diagnostics-with-backend-down -----------------
#
# SHELL-04's risky edge (this plan's flagged_assumption): the diagnostics
# surface must answer while the backend is dead, not just while it is
# healthy. Launches with backendMain pointed at a nonexistent path (same
# unrecoverable-immediate shape as shell03-unrecoverable-immediate-error --
# no backend spawn is ever attempted, so there is genuinely no backend at
# all), then asserts what this repo can automate without chrome-context
# driving:
#
#   1. The startup identity sentinel (SOURCERER_APP_IDENTITY) is present
#      with all three fields populated -- written unconditionally, right
#      after the sidecar prefs sentinel and BEFORE TheiaService.start(), so
#      it can never depend on a live backend. This is the fully-automated
#      half of "the surface is alive precisely when the backend is not."
#   2. The error layer's details control is present and enabled in the
#      shipped markup (sourcerer.xhtml has no `disabled` attribute on
#      #sourcerer-error-diagnostics) -- the plan's own named fallback for
#      when no chrome-context driver exists.
#
# What this check does NOT do, and why: opening the diagnostics layer
# itself (the chord, or clicking the Details control) is chrome-context
# automation, and Discriminator B (05-02-PLAN.md Task 1, WINDOWS.md #7)
# found that blocked on Linux -- capabilities.alwaysMatch['moz:windowless']
# is silently ignored outside AppInfo.isMac, so WebDriver:NewSession can
# never create a session against the shell's own windowtype="sourcerer:main"
# chrome window. scripts/lib/firefox-marionette.mjs does not exist (05-02
# confirmed it cannot). With no driver, this check cannot click the Details
# control or evaluate the show global, so it cannot produce a live
# SOURCERER_DIAGNOSTICS sentinel to read the rendered health/port/pid
# fields from. That gap is routed to the human record (05-03-SUMMARY.md),
# exactly as 05-02 routed the Retry-button click -- not fabricated as a
# pass.
check_shell04_diagnostics_with_backend_down() {
  local user_js result=0
  user_js="$(mktemp)"; track_temp "$user_js"
  cat > "$user_js" <<'EOF'
user_pref("sourcerer.sidecar.backendMain", "/nonexistent/sourcerer-verify-05/shell04-main.js");
EOF

  export VERIFY05_USER_JS_PROFILE="$user_js"
  start_shell
  local start_rc=$?
  unset VERIFY05_USER_JS_PROFILE
  if [ "$start_rc" -ne 0 ]; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 15))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG" && break
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- browser exited before the error sentinel appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell
      return 1
    fi
    sleep 0.25
  done

  if ! sentinel_present 'SOURCERER_SHELL_ERROR ' "$BROWSER_LOG"; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- SOURCERER_SHELL_ERROR did not appear within 15s (no backend was ever supposed to exist); log:" >&2
    cat "$BROWSER_LOG" >&2
    stop_shell
    return 1
  fi

  # There is genuinely no backend in this run -- confirm the unrecoverable
  # classification, so a later assertion can never be read as "it happened
  # to recover before we checked."
  if ! grep -qE '^(\[SourcererAPI\] [a-z]+: )?SOURCERER_SHELL_ERROR \{"reason":"[^"]*","recoverable":false\}$' "$BROWSER_LOG"; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- error sentinel is not classified recoverable:false; this run does not prove 'no backend at all'; log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  fi

  # Identity half: alive independent of the backend, fully automated.
  local identity_line
  identity_line="$(grep -E '^(\[SourcererAPI\] [a-z]+: )?SOURCERER_APP_IDENTITY ' "$BROWSER_LOG" | head -1 | sed -E 's/^(\[SourcererAPI\] [a-z]+: )?SOURCERER_APP_IDENTITY //')"
  if [ -z "$identity_line" ]; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- no SOURCERER_APP_IDENTITY sentinel with the backend unreachable; log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  elif ! node -e '
    let s = "";
    process.stdin.on("data", d => (s += d)).on("end", () => {
      let j;
      try { j = JSON.parse(s); } catch { process.exit(1); }
      if (typeof j.name === "string" && j.name && typeof j.vendor === "string" && j.vendor && typeof j.version === "string" && j.version) {
        process.exit(0);
      }
      process.exit(1);
    });
  ' <<<"$identity_line"; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- SOURCERER_APP_IDENTITY sentinel is not populated ($identity_line)" >&2
    result=1
  fi

  stop_shell

  # Fallback half (no chrome-context driver in this repo -- WINDOWS.md #7):
  # the details control is present and enabled in the shipped markup.
  local xhtml="$REPO_ROOT/sourcerer/shell/sourcerer.xhtml"
  if ! grep -q 'id="sourcerer-error-diagnostics"' "$xhtml"; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- #sourcerer-error-diagnostics is not present in sourcerer.xhtml" >&2
    result=1
  elif grep 'id="sourcerer-error-diagnostics"' "$xhtml" | grep -q 'disabled'; then
    echo "shell04-diagnostics-with-backend-down: FAIL -- SHELL-04 -- #sourcerer-error-diagnostics still carries a disabled attribute" >&2
    result=1
  fi

  echo "shell04-diagnostics-with-backend-down: NOTE -- chrome-context driving (the chord, the Details click, and reading the live SOURCERER_DIAGNOSTICS sentinel) is routed to the human record, per WINDOWS.md #7 / Discriminator B; see 05-03-SUMMARY.md" >&2

  return "$result"
}

# --- MED-02 / WINDOWS.md 10: shell04-log-redacts-token ----------------------
#
# Behavioral (not a grep) proof that TheiaService._pushLog scrubs the
# per-launch token before buffering a line into the SHELL-04 diagnostics ring
# buffer. Imports the shipped module directly under plain node after
# stubbing its one chrome dependency (ChromeUtils.importESModule), then
# drives _pushLog on a bare receiver -- no browser, no display, no built
# tree needed.
check_shell04_log_redacts_token() {
  local shipped="$REPO_ROOT/sourcerer/shell/TheiaService.sys.mjs"
  local out result=0
  out="$(SHIPPED_THEIA_SERVICE="$shipped" node --input-type=module -e '
    globalThis.ChromeUtils = { importESModule: () => ({ SourcererAPI: { getIntPref: (_k, d) => d } }) };
    const { TheiaService } = await import(process.env.SHIPPED_THEIA_SERVICE);

    if (typeof TheiaService._pushLog !== "function") {
      console.error("FAIL -- TheiaService._pushLog is not a function (renamed or removed)");
      process.exit(1);
    }

    // (a) real token, real line -- token must not survive, and a redaction
    // marker must be present.
    {
      const receiver = { _token: "TOK-11111111", _log: [] };
      TheiaService._pushLog.call(receiver, "Cookie: sourcerer-token=TOK-11111111");
      const entry = receiver._log[receiver._log.length - 1];
      if (receiver._log.length !== 1) {
        console.error("FAIL -- case (a): expected exactly one buffered entry, got " + receiver._log.length);
        process.exit(1);
      }
      if (entry.includes("TOK-11111111")) {
        console.error("FAIL -- case (a): token survived unredacted: " + entry);
        process.exit(1);
      }
      if (!entry.includes("[redacted]")) {
        console.error("FAIL -- case (a): no redaction marker in: " + entry);
        process.exit(1);
      }
    }

    // (b) null token -- must not throw, line must survive unchanged.
    {
      const receiver = { _token: null, _log: [] };
      const line = "an ordinary log line";
      TheiaService._pushLog.call(receiver, line);
      const entry = receiver._log[receiver._log.length - 1];
      if (receiver._log.length !== 1) {
        console.error("FAIL -- case (b): expected exactly one buffered entry, got " + receiver._log.length);
        process.exit(1);
      }
      if (!entry.endsWith(line)) {
        console.error("FAIL -- case (b): null-token line was altered: " + entry);
        process.exit(1);
      }
    }

    // (c) empty-string token -- the splicing-bug case. replaceAll("", X)
    // would splice X between every character.
    {
      const receiver = { _token: "", _log: [] };
      const line = "an ordinary log line";
      TheiaService._pushLog.call(receiver, line);
      const entry = receiver._log[receiver._log.length - 1];
      if (receiver._log.length !== 1) {
        console.error("FAIL -- case (c): expected exactly one buffered entry, got " + receiver._log.length);
        process.exit(1);
      }
      if (!entry.endsWith(line)) {
        console.error("FAIL -- case (c): empty-token line was spliced/altered: " + entry);
        process.exit(1);
      }
    }

    console.log("PASS");
  ' 2>&1)" || result=1

  if [ "$result" -ne 0 ] || ! grep -q "^PASS$" <<<"$out"; then
    echo "shell04-log-redacts-token: FAIL -- MED-02 -- $out" >&2
    return 1
  fi
  return 0
}

# --- Task 2 (05-04): side05-second-launch-focuses / side05-no-second-backend
#
# SIDE-05: a second launch against the SAME profile must focus the already-
# open window (never a second one) and never spawn a second backend --
# never headless (05-RESEARCH.md Pitfall 1: gfxPlatform::IsHeadless()
# disables Firefox's native remoting protocol outright, the entire
# mechanism this requirement depends on), and both launches share one
# profile directory because nsRemoteService keys remoting on the profile
# path (upstream/toolkit/xre/nsAppRunner.cpp:5342-5358) -- two different
# profiles would never remote into each other and the check would prove
# nothing. Both checks assert the first launch actually reached readiness
# before drawing any conclusion, so neither can pass vacuously against a
# launch that silently failed.

# Launches the shell twice against ONE shared profile (bare, then with a
# file-path argument -- D-123/D-124's "arguments are ignored" truth), and
# asserts each time: the second process exits (never runs on as an
# independent instance), the first process is still running, and exactly
# one SOURCERER_SHELL_READY sentinel exists in the first process's own log
# (a second window opening would paint and announce its own readiness
# through the SAME process's stdout, since remoting delivers the second
# launch's command line into the first process in-process -- never a
# second OS process's own separate log).
check_side05_second_launch_focuses() {
  local bin profile result=0
  bin="$REPO_ROOT/objdir/dist/bin/sourcerer"
  if [ ! -x "$bin" ]; then
    echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- $bin does not exist or is not executable (run the Phase 1 Firefox build first)" >&2
    return 1
  fi

  profile="$(mktemp -d)"; track_temp "$profile"

  local rc
  start_shell_display "$profile"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- could not launch the first instance (no usable display or missing binary)" >&2
    return "$rc"
  fi
  local first_log="$BROWSER_LOG"
  local first_pid="$BROWSER_SPAWN_PID"
  local display_to_use="$DISPLAY_IN_USE"

  local deadline=$((SECONDS + 60))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_BACKEND_READY ' "$first_log" && break
    if ! kill -0 "$first_pid" 2>/dev/null; then
      echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- first launch exited before SOURCERER_BACKEND_READY appeared; log:" >&2
      cat "$first_log" >&2
      stop_shell_display
      return 1
    fi
    sleep 0.5
  done
  if ! sentinel_present 'SOURCERER_BACKEND_READY ' "$first_log"; then
    echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- SOURCERER_BACKEND_READY did not appear within 60s; log:" >&2
    cat "$first_log" >&2
    stop_shell_display
    return 1
  fi

  local round arg_path
  arg_path="$profile/side05-argument-does-not-matter.txt"
  for round in bare argument; do
    local second_log second_rc
    second_log="$(mktemp)"; track_temp "$second_log"

    if [ "$round" = "bare" ]; then
      timeout 30 env "DISPLAY=$display_to_use" "$bin" --profile "$profile" >"$second_log" 2>&1
    else
      timeout 30 env "DISPLAY=$display_to_use" "$bin" --profile "$profile" "$arg_path" >"$second_log" 2>&1
    fi
    second_rc=$?

    if [ "$second_rc" -eq 124 ]; then
      echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- second launch ($round) against the same profile did not exit within 30s -- ran on as an independent instance; log:" >&2
      cat "$second_log" >&2
      result=1
    fi

    if ! kill -0 "$first_pid" 2>/dev/null; then
      echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- first instance is no longer running after the second launch ($round)" >&2
      result=1
    fi

    local ready_count
    ready_count="$(grep -c 'SOURCERER_SHELL_READY' "$first_log")"
    if [ "$ready_count" -ne 1 ]; then
      echo "side05-second-launch-focuses: FAIL -- SIDE-05 -- expected exactly one SOURCERER_SHELL_READY in the first process's log after the second launch ($round), found $ready_count -- a second window opened; log:" >&2
      cat "$first_log" >&2
      result=1
    fi
  done

  stop_shell_display
  return "$result"
}

# D-125's invariant assertion, paired with its own positive control. Does
# its own two-launch-same-profile session (not a reuse of the previous
# check's state -- --only must be able to run this alone) and asserts:
# exactly one SOURCERER_BACKEND_READY sentinel across both launches, the
# announced backend pid unchanged, and exactly one live process matching
# 'backend/main.js' among this run's own process groups. Then a THIRD
# launch against a DIFFERENT profile must
# start its own window and its own backend -- proving the guard is scoped
# to the profile, not simply "second launches never work at all."
check_side05_no_second_backend() {
  local bin profile result=0
  bin="$REPO_ROOT/objdir/dist/bin/sourcerer"
  if [ ! -x "$bin" ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- $bin does not exist or is not executable (run the Phase 1 Firefox build first)" >&2
    return 1
  fi

  profile="$(mktemp -d)"; track_temp "$profile"

  local rc
  start_shell_display "$profile"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- could not launch the first instance (no usable display or missing binary)" >&2
    return "$rc"
  fi
  local first_log="$BROWSER_LOG"
  local first_pid="$BROWSER_SPAWN_PID"
  local display_to_use="$DISPLAY_IN_USE"

  local deadline=$((SECONDS + 60))
  while [ "$SECONDS" -lt "$deadline" ]; do
    sentinel_present 'SOURCERER_BACKEND_READY ' "$first_log" && break
    if ! kill -0 "$first_pid" 2>/dev/null; then
      echo "side05-no-second-backend: FAIL -- SIDE-05 -- first launch exited before SOURCERER_BACKEND_READY appeared; log:" >&2
      cat "$first_log" >&2
      stop_shell_display
      return 1
    fi
    sleep 0.5
  done
  if ! sentinel_present 'SOURCERER_BACKEND_READY ' "$first_log"; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- SOURCERER_BACKEND_READY did not appear within 60s; log:" >&2
    cat "$first_log" >&2
    stop_shell_display
    return 1
  fi

  local first_backend_pid
  first_backend_pid="$(backend_ready_pids "$first_log" | head -1)"
  if [ -z "$first_backend_pid" ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- could not read a pid from SOURCERER_BACKEND_READY in the first process's log" >&2
    stop_shell_display
    return 1
  fi

  local second_log second_rc
  second_log="$(mktemp)"; track_temp "$second_log"
  timeout 30 env "DISPLAY=$display_to_use" "$bin" --profile "$profile" >"$second_log" 2>&1
  second_rc=$?
  if [ "$second_rc" -eq 124 ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- second launch against the same profile did not exit within 30s; log:" >&2
    cat "$second_log" >&2
    result=1
  fi

  local ready_pids_after ready_count
  ready_pids_after="$(backend_ready_pids "$first_log")"
  ready_count="$(printf '%s\n' "$ready_pids_after" | grep -c .)"
  if [ "$ready_count" -ne 1 ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- expected exactly one SOURCERER_BACKEND_READY sentinel across both launches, found $ready_count; log:" >&2
    cat "$first_log" >&2
    result=1
  fi
  if [ "$(printf '%s\n' "$ready_pids_after" | head -1)" != "$first_backend_pid" ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- announced backend pid changed across the session (was $first_backend_pid)" >&2
    result=1
  fi

  # Two groups make up this check's world: the first launch's own group
  # (start_shell_display setsid's it, so its backend and any orphan of that
  # backend live there), and this script's group, where a backend spawned by
  # the SECOND launch would land -- that launch runs in the foreground and
  # so inherits the harness's group. A backend outside both belongs to some
  # other Sourcerer on the machine and is not this check's business.
  local scope_pgids backends backend_proc_count
  scope_pgids="$(pgid_of "$first_backend_pid"),$(pgid_of $$)"
  backends="$(backends_in_groups "$scope_pgids")"
  backend_proc_count="$(printf '%s' "$backends" | grep -c . || true)"
  if [ "$backend_proc_count" -ne 1 ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- expected exactly one process matching 'backend/main.js' in this run's process groups ($scope_pgids) while the session is up, found $backend_proc_count:" >&2
    printf '%s\n' "$backends" >&2
    result=1
  fi

  stop_shell_display

  # D-125's positive control: a DIFFERENT profile must get its own window
  # and its own backend.
  local control_profile
  control_profile="$(mktemp -d)"; track_temp "$control_profile"
  start_shell_display "$control_profile"
  local control_rc=$?
  if [ "$control_rc" -ne 0 ]; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- positive control (different profile) could not launch" >&2
    return 1
  fi
  local control_log="$BROWSER_LOG"
  local control_pid="$BROWSER_SPAWN_PID"

  local control_deadline=$((SECONDS + 60))
  while [ "$SECONDS" -lt "$control_deadline" ]; do
    sentinel_present 'SOURCERER_BACKEND_READY ' "$control_log" && break
    if ! kill -0 "$control_pid" 2>/dev/null; then
      echo "side05-no-second-backend: FAIL -- SIDE-05 -- positive control exited before SOURCERER_BACKEND_READY appeared; log:" >&2
      cat "$control_log" >&2
      stop_shell_display
      return 1
    fi
    sleep 0.5
  done
  if ! sentinel_present 'SOURCERER_BACKEND_READY ' "$control_log"; then
    echo "side05-no-second-backend: FAIL -- SIDE-05 -- positive control (different profile) never announced its own backend -- the guard is not profile-scoped, it broke second launches globally; log:" >&2
    cat "$control_log" >&2
    result=1
  else
    local control_backend_pid
    control_backend_pid="$(backend_ready_pids "$control_log" | head -1)"
    if [ -z "$control_backend_pid" ] || [ "$control_backend_pid" = "$first_backend_pid" ]; then
      echo "side05-no-second-backend: FAIL -- SIDE-05 -- positive control did not announce a distinct backend pid of its own ($control_backend_pid)" >&2
      result=1
    fi
  fi

  stop_shell_display
  return "$result"
}

# --- CR-01 regression (05-REVIEW.md): the sidecar state file must be
# profile-scoped -----------------------------------------------------------
#
# The bug this guards against: TheiaService._resolveConfigDir()/
# _stateFilePath were keyed only on XDG_CONFIG_HOME/HOME, with no profile
# component -- every instance under the same OS user shared one
# sidecar-state.json. A second instance's startup reap (_reapLeftover,
# D-111's verified-identity check) would then find a FIRST, still-healthy
# instance's backend pid in that shared file, confirm its live start ticks
# matched exactly (they genuinely did -- the identity check itself was
# sound, only its scope was wrong), and SIGTERM it.
#
# Unlike side05-no-second-backend (which always stops the first instance
# before starting a different-profile control -- SIDE-05's own timing gap
# that let CR-01 through Phase 5's own review), this check keeps instance A
# RUNNING and launches instance B under a genuinely different profile while
# A is still alive, then asserts A's backend survived B's entire startup
# (including B's own _reapLeftover pass, already run by the time B
# announces its own SOURCERER_BACKEND_READY). Reuses start_shell_display
# (never headless -- SIDE-05's own display requirement applies equally
# here, since this is the same nsRemoteService-adjacent profile-keyed
# machinery) for both launches; no new launch scaffolding.
check_cr01_different_profile_backend_survives() {
  local profile_a profile_b result=0
  profile_a="$(mktemp -d)"; track_temp "$profile_a"
  profile_b="$(mktemp -d)"; track_temp "$profile_b"

  # Whether *we* end up owning the Xvfb this check starts (so cleanup below
  # is the one place that tears it down) vs. an already-real $DISPLAY this
  # check must never touch.
  local had_display=0
  [ -n "${DISPLAY:-}" ] && had_display=1
  local prev_display="${DISPLAY:-}"

  local rc
  start_shell_display "$profile_a"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- could not launch instance A (no usable display or missing binary)" >&2
    return "$rc"
  fi
  local log_a="$BROWSER_LOG"
  local pid_a="$BROWSER_SPAWN_PID"
  local display_to_use="$DISPLAY_IN_USE"
  # This check tracks pid_a/pid_b itself (two concurrent instances, not
  # one) -- clear the shared global so a second start_shell_display() call
  # below for instance B doesn't leave the trap-driven cleanup() confused
  # about which pid is which; this function kills both explicitly itself.
  BROWSER_SPAWN_PID=""

  local pid_b="" log_b=""

  local a_deadline=$((SECONDS + 60)) a_ready=0
  while [ "$SECONDS" -lt "$a_deadline" ]; do
    if sentinel_present 'SOURCERER_BACKEND_READY ' "$log_a"; then
      a_ready=1
      break
    fi
    if ! kill -0 "$pid_a" 2>/dev/null; then
      break
    fi
    sleep 0.5
  done
  if [ "$a_ready" -ne 1 ]; then
    echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- instance A never announced SOURCERER_BACKEND_READY within 60s; log:" >&2
    cat "$log_a" >&2
    result=1
  fi

  local backend_pid_a=""
  if [ "$a_ready" -eq 1 ]; then
    backend_pid_a="$(backend_ready_pids "$log_a" | head -1)"
    # Must be alive BEFORE instance B launches, or "still alive afterward"
    # proves nothing (D-125's own established discipline for this class of
    # check).
    if [ -z "$backend_pid_a" ] || [ ! -e "/proc/$backend_pid_a" ]; then
      echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- instance A's announced backend pid is not running before instance B launches; the check cannot prove anything" >&2
      result=1
      backend_pid_a=""
    fi
  fi

  if [ -n "$backend_pid_a" ]; then
    # Reuse instance A's exact display for B (the `-n "${DISPLAY:-}"`
    # branch in start_shell_display), rather than spinning a second Xvfb --
    # CR-01 is about profile scoping, not display plumbing.
    export DISPLAY="$display_to_use"
    start_shell_display "$profile_b"
    rc=$?
    if [ "$rc" -ne 0 ]; then
      echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- could not launch instance B under a different profile" >&2
      result=1
    else
      log_b="$BROWSER_LOG"
      pid_b="$BROWSER_SPAWN_PID"
      BROWSER_SPAWN_PID=""

      local b_deadline=$((SECONDS + 60)) b_ready=0
      while [ "$SECONDS" -lt "$b_deadline" ]; do
        if sentinel_present 'SOURCERER_BACKEND_READY ' "$log_b"; then
          b_ready=1
          break
        fi
        if ! kill -0 "$pid_b" 2>/dev/null; then
          break
        fi
        sleep 0.5
      done
      if [ "$b_ready" -ne 1 ]; then
        echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- instance B never announced SOURCERER_BACKEND_READY within 60s; log:" >&2
        cat "$log_b" >&2
        result=1
      fi

      # The headline assertion: by the time B has announced its own
      # SOURCERER_BACKEND_READY, B's start() has already run _reapLeftover()
      # (called before B's own first spawn attempt) -- pre-fix, that reap
      # read the SHARED state file, found A's still-healthy pid, and
      # SIGTERM'd it.
      if [ ! -e "/proc/$backend_pid_a" ]; then
        echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- instance A's backend (pid $backend_pid_a) was killed by instance B's startup under a DIFFERENT profile -- the sidecar state file is not profile-scoped; log A:" >&2
        cat "$log_a" >&2
        echo "cr01-different-profile-backend-survives: log B:" >&2
        cat "$log_b" >&2
        result=1
      fi

      # A second, narrower invariant: B must announce its OWN distinct
      # backend pid, never A's -- catches a scoping bug that merely
      # deduplicates spawns rather than one that kills the other instance.
      local backend_pid_b
      backend_pid_b="$(backend_ready_pids "$log_b" | head -1)"
      if [ -n "$backend_pid_b" ] && [ "$backend_pid_b" = "$backend_pid_a" ]; then
        echo "cr01-different-profile-backend-survives: FAIL -- CR-01 -- instance B announced the SAME backend pid as instance A ($backend_pid_a) -- two different profiles must never share a backend" >&2
        result=1
      fi
    fi
  fi

  if [ -n "$pid_b" ]; then
    kill -- "-$pid_b" 2>/dev/null || kill "$pid_b" 2>/dev/null || true
    wait "$pid_b" 2>/dev/null || true
  fi
  if [ -n "$pid_a" ]; then
    kill -- "-$pid_a" 2>/dev/null || kill "$pid_a" 2>/dev/null || true
    wait "$pid_a" 2>/dev/null || true
  fi
  if [ "$had_display" -eq 0 ]; then
    stop_virtual_display
  fi
  if [ -n "$prev_display" ]; then
    export DISPLAY="$prev_display"
  else
    unset DISPLAY
  fi

  return "$result"
}

# --- shell-csp-inline-attrs -------------------------------------------------
#
# sourcerer.xhtml declares `default-src chrome:` with no 'unsafe-inline', and
# Gecko applies that policy to inline style/event-handler ATTRIBUTES too:
# nsStyledElement::ParseStyleAttribute calls nsStyleUtil::CSPAllowsInlineStyle,
# whose STYLE_SRC_ATTR lookup falls back to default-src, and simply never
# builds the declaration. Phase 5 hid both deck overlays with
# `style="display:none;"`; the attributes were inert, so their `display: flex`
# base rules won and both overlays painted over a healthy Theia at every
# startup. Gecko logs NOTHING to stdout/stderr when it drops the declaration
# (only nsIConsoleService, reachable via MOZ_LOG=PageMessages:5), so no
# launch-log grep can catch this -- verified live against the pre-fix build.
# Static markup is the only place it is observable for free.
#
# `setAttribute("style"|"on...")` in the shipped scripts is banned for the
# same reason: it routes through the same CSP-checked attribute-parse path.
# CSSOM writes (`el.style.display = ...`) are deliberately NOT banned -- they
# never touch attribute parsing and are how the shell legitimately shows a
# layer.
#
# Prints "  file:line: reason" per offense on stderr; 0 clean, 1 offenses,
# 2 nothing was scanned (a clean sweep of an empty file list is not a pass).
scan_inline_attrs() {
  node -e '
    const fs = require("fs");
    const files = process.argv.slice(1);
    if (!files.length) { process.exit(2); }
    let bad = 0;
    for (const f of files) {
      let src;
      try { src = fs.readFileSync(f, "utf8"); } catch { console.error(`  ${f}: unreadable`); bad++; continue; }
      // Blank comments before matching (preserving newlines, so the reported
      // line numbers stay exact) -- a comment explaining this very rule, or
      // the header comment in sourcerer.css, must not flag itself.
      const blank = (m) => m.replace(/[^\n]/g, " ");
      src = src.replace(/<!--[\s\S]*?-->/g, blank).replace(/\/\*[\s\S]*?\*\//g, blank);
      // Branch on extension: the markup attribute pattern applied to a script
      // false-positives on ordinary identifiers (`once`, `only`, ...).
      const re = /\.(xhtml|html|xul)$/i.test(f)
        ? /[\s"\x27](style|on[a-z]+)\s*=\s*["\x27]/gi
        : /setAttribute\s*\(\s*["\x27](style|on[a-z]+)["\x27]/gi;
      let m;
      while ((m = re.exec(src)) !== null) {
        console.error(`  ${f}:${src.slice(0, m.index).split("\n").length}: inline ${m[1]}= attribute`);
        bad++;
      }
    }
    process.exit(bad ? 1 : 0);
  ' "$@"
}

check_shell_csp_inline_attrs() {
  local shell_dir xhtml result=0
  shell_dir="$REPO_ROOT/sourcerer/shell"
  xhtml="$shell_dir/sourcerer.xhtml"

  # The policy is the whole justification for the ban. If it ever goes away,
  # or gains 'unsafe-inline', that is a decision to argue explicitly -- not
  # something this check should quietly start tolerating.
  local csp_line
  csp_line="$(grep -i 'http-equiv="Content-Security-Policy"' "$xhtml")"
  if [ -z "$csp_line" ]; then
    echo "shell-csp-inline-attrs: FAIL -- sourcerer.xhtml no longer declares a Content-Security-Policy meta" >&2
    result=1
  elif grep -qi 'unsafe-inline' <<<"$csp_line"; then
    echo "shell-csp-inline-attrs: FAIL -- the shell CSP was loosened with 'unsafe-inline' ($csp_line); re-argue this check rather than weakening the policy" >&2
    result=1
  fi

  # Self-test first: a scanner that silently matched nothing would report a
  # clean tree forever. The fixture reproduces the pre-fix markup verbatim
  # plus one planted handler, and a comment decoy that must NOT be counted --
  # so "exactly 2", never "at least 1".
  local fixture_dir fixture rc rows
  fixture_dir="$(mktemp -d)"; track_temp "$fixture_dir"
  fixture="$fixture_dir/fixture.xhtml"
  cat > "$fixture" <<'EOF'
<!-- decoy: style="display:none;" inside a comment must not be flagged -->
<div id="sourcerer-error" style="display:none;"></div>
<button id="sourcerer-error-retry" onclick="sourcererRetry()">Retry</button>
<div id="sourcerer-loading">Sourcerer</div>
EOF
  rows="$(scan_inline_attrs "$fixture" 2>&1 >/dev/null)"
  rc=$?
  if [ "$rc" -ne 1 ] || [ "$(grep -c . <<<"$rows")" -ne 2 ]; then
    echo "shell-csp-inline-attrs: FAIL -- self-test: the scanner did not report exactly 2 offenses on the known-bad fixture (rc=$rc):" >&2
    echo "$rows" >&2
    result=1
  fi

  # Scan every markup/script file jar.mn actually ships -- derived, never
  # hardcoded, so a file added to the package is covered the day it lands.
  local -a files=()
  local rel
  while read -r rel; do
    [ -z "$rel" ] && continue
    if [ ! -f "$shell_dir/$rel" ]; then
      echo "shell-csp-inline-attrs: FAIL -- jar.mn ships '$rel' but $shell_dir/$rel does not exist" >&2
      result=1
      continue
    fi
    files+=("$shell_dir/$rel")
  done < <(sed -E 's/#.*//' "$shell_dir/jar.mn" | grep -oE '\(([^)]+\.(xhtml|html|xul|js|mjs))\)' | tr -d '()')

  if [ "${#files[@]}" -eq 0 ]; then
    echo "shell-csp-inline-attrs: FAIL -- parsed zero shippable files out of $shell_dir/jar.mn; nothing was scanned" >&2
    return 1
  fi

  if ! scan_inline_attrs "${files[@]}"; then
    echo "shell-csp-inline-attrs: FAIL -- the shipped chrome surface contains inline attributes the CSP silently drops (see rows above); put the state in sourcerer.css or set it from JS via the CSSOM instead" >&2
    result=1
  fi

  return "$result"
}

# --- SIDE-04 addendum: the supervisor handshake must not leak the token ----
#
# Two separate exposures of TheiaService._spawnAndGate's handshake, asserted
# together because a fix for either one alone leaves the credential reachable.
#
#   A. THE BACKEND'S OWN /proc/<pid>/environ. This is the exec-time snapshot.
#      It is NOT rewritten by `delete process.env.X` (glibc's unsetenv edits
#      the pointer array, never the original stack region), it stays readable
#      by every same-uid process for the whole life of the backend, and with
#      Yama's ptrace_scope=1 -- the setting on this project's own target --
#      /proc/<pid>/mem is unreadable while this file is not. So it is the one
#      place a credential in the environment stays legible to a co-resident
#      process: one `tr '\0' '\n' < /proc/<backend>/environ` from any process
#      the user runs recovers it, and that recovered value authenticates. The
#      only fix is not putting the token in the environment at all, which is
#      why the supervisor writes it on the backend's stdin pipe instead
#      (SourcererAPI.writeStdinLine -> sourcerer-env.ts's readTokenFromStdin).
#      SOURCERER_TOKEN must therefore be absent here entirely.
#      SOURCERER_SUPERVISED is expected to be present -- it is a marker, not a
#      secret -- so only the token is asserted.
#
#   B. EVERY CHILD'S environ. Node's process.env is inherited by every child
#      the backend spawns, and a child's environ is built fresh from the
#      parent's LIVE process.env at fork/exec -- which is what makes a child
#      the only witness for the module-load scrub in sourcerer-env.ts.
#      Without that scrub SOURCERER_SUPERVISED reaches every IDE terminal,
#      task, debug adapter and the plugin host running third-party
#      extensions, so a NESTED backend (`yarn start`, smoke-theia.sh,
#      verify-phase-04.sh) arms a watchdog nobody supervises and dies on its
#      own stdin EOF. The backend forks a parcel filesystem-watcher IPC child
#      unconditionally at startup (@theia/filesystem's
#      filesystem-backend-module.js, `env: process.env`), with no frontend and
#      no workspace, so a child reliably exists to scan; a terminal
#      ShellProcess -- the exact mergeProcessEnv path from the defect --
#      appears too whenever one is open, which is why the scan covers every
#      child rather than one named process.
#
# Both are asserted from OUTSIDE the process, on a real supervised launch,
# because the only in-process alternative is trusting the code under test.
#
# The VERIFY05_LEAK_CANARY export IS this check's self-test, and it runs on
# every invocation rather than behind a flag: it rides the identical chain
# (harness -> browser -> spawnProcess environmentAppend:true -> backend
# process.env -> fork) through the identical loop, grep and procfs read, and
# differs only in its name. It must be found in the backend's own environ
# (self-test for A) and in a child's (self-test for B). A scanner that cannot
# see a variable that IS there proves nothing by failing to see the one that
# should not be, so its absence is a FAIL, never a vacuous pass. Same for "no
# children" and "no readable environ".
#
# SOURCERER_SHELL_SWAP is the positive control for the replacement channel: it
# is only ever printed after _pollUntilHealthy got a 200 from
# /sourcerer/health, and that probe authenticates with the token. A backend
# that never received the stdin line exits 78 and never reaches it, so a
# passing scan cannot be bought by simply never delivering a token.
#
# On its own this check is satisfiable by never setting SOURCERER_SUPERVISED
# at all, which would silently disarm the dies-with-the-browser watchdog. It
# is only meaningful alongside side04-sigkill-no-orphan and
# side04-unsupervised-backend-survives, which prove the marker still arms and
# still stays inert.
check_side04_token_not_in_environment() {
  local result=0
  local canary="verify05-canary-$$-${RANDOM}"
  export VERIFY05_LEAK_CANARY="$canary"

  if ! start_shell; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- could not launch the shell" >&2
    unset VERIFY05_LEAK_CANARY
    return 1
  fi
  local log="$BROWSER_LOG"

  local deadline=$((SECONDS + 90)) backend_pid=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    backend_pid="$(backend_ready_pids "$log" | tail -n1)"
    [ -n "$backend_pid" ] && break
    kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null || break
    sleep 0.5
  done
  if [ -z "$backend_pid" ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- the backend never announced SOURCERER_BACKEND_READY within 90s; last 30 log lines:" >&2
    tail -30 "$log" >&2
    stop_shell
    unset VERIFY05_LEAK_CANARY
    return 1
  fi

  # Positive control for the stdin credential channel (see the header): the
  # swap is printed only after a token-authenticated 200 from
  # /sourcerer/health.
  local swap_deadline=$((SECONDS + 60)) swapped=0
  while [ "$SECONDS" -lt "$swap_deadline" ]; do
    if grep -q '^SOURCERER_SHELL_SWAP ' "$log"; then
      swapped=1
      break
    fi
    kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null || break
    sleep 0.5
  done
  if [ "$swapped" -eq 0 ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- the shell never printed SOURCERER_SHELL_SWAP, so the token handed over stdin never authenticated a health probe; an environ scan that finds no token would only mean no token was ever delivered. Last 30 log lines:" >&2
    tail -30 "$log" >&2
    result=1
  fi

  # Exposure A: the backend's own exec-time environment snapshot.
  local backend_env
  backend_env="$(tr '\0' '\n' < "/proc/$backend_pid/environ" 2>/dev/null)"
  if [ -z "$backend_env" ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- backend pid $backend_pid has no readable /proc/<pid>/environ; nothing was scanned, so a clean result would prove nothing" >&2
    result=1
  elif ! grep -qxF "VERIFY05_LEAK_CANARY=$canary" <<<"$backend_env"; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- self-test: VERIFY05_LEAK_CANARY was exported into this harness but is absent from backend pid $backend_pid's own /proc/<pid>/environ, so the harness -> browser -> spawnProcess chain this scan reads is broken and a clean scan means nothing" >&2
    result=1
  elif grep -q '^SOURCERER_TOKEN=' <<<"$backend_env"; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- backend pid $backend_pid carries SOURCERER_TOKEN= in its OWN /proc/<pid>/environ. That file is the exec-time snapshot: no process.env delete rewrites it, and it stays readable by every same-uid process for the life of the backend. Hand the token over the stdin pipe instead (SourcererAPI.writeStdinLine)" >&2
    result=1
  fi

  # Exposure B: every child's environment, built from the backend's LIVE
  # process.env at fork/exec.
  local kids="" kid_deadline=$((SECONDS + 20))
  while [ "$SECONDS" -lt "$kid_deadline" ]; do
    kids="$(pgrep -P "$backend_pid" 2>/dev/null)"
    [ -n "$kids" ] && break
    sleep 0.5
  done
  if [ -n "$kids" ]; then
    # The watcher fork lands within a second of readiness; a terminal
    # ShellProcess can land later. Re-enumerate after a settle window so the
    # scan covers whatever else appeared, instead of only the first child.
    sleep 5
    kids="$(pgrep -P "$backend_pid" 2>/dev/null)"
  fi

  local read_any=0 saw_canary=0 kid env_dump cmd var
  for kid in $kids; do
    env_dump="$(tr '\0' '\n' < "/proc/$kid/environ" 2>/dev/null)"
    [ -z "$env_dump" ] && continue
    read_any=1
    cmd="$(tr '\0' ' ' < "/proc/$kid/cmdline" 2>/dev/null | cut -c1-100)"
    if grep -qxF "VERIFY05_LEAK_CANARY=$canary" <<<"$env_dump"; then
      saw_canary=1
    fi
    # The trailing '=' anchors each name: without it SOURCERER_TOKEN would
    # also match a SOURCERER_TOKEN_DISABLE line and misattribute the leak.
    for var in SOURCERER_TOKEN SOURCERER_SUPERVISED SOURCERER_TOKEN_DISABLE; do
      if grep -q "^$var=" <<<"$env_dump"; then
        echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- backend child pid $kid ($cmd) inherited $var from the backend's process.env" >&2
        result=1
      fi
    done
  done

  if [ -z "$kids" ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- backend pid $backend_pid had no children at all; nothing was scanned, so a clean result would prove nothing" >&2
    result=1
  elif [ "$read_any" -eq 0 ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- no child of backend pid $backend_pid had a readable /proc/<pid>/environ; nothing was scanned" >&2
    result=1
  elif [ "$saw_canary" -eq 0 ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- self-test: VERIFY05_LEAK_CANARY was exported into this harness but reached no backend child, so the harness -> browser -> backend -> child environment chain this check probes is broken and a clean scan means nothing" >&2
    result=1
  fi

  stop_shell
  unset VERIFY05_LEAK_CANARY
  return "$result"
}

# Runs this script's own CHECKS (respecting QUICK/ONLY exactly as before),
# prints the per-check PASS/FAIL summary table, and RETURNS (not exits) the
# aggregate result -- factored out of the former top-level script body so
# --gate mode (below) can call it as "this phase's own section" without a
# second process. Normal (non-gate) invocation calls this once and exits on
# its return value, unchanged from the prior behaviour.
run_own_checks() {
  # Each entry: "label|command...". Later tasks append here, never as a
  # sibling driver script.
  # Registered OUTSIDE the --quick guard: it needs no browser, no display and
  # no built tree, runs in milliseconds, and --quick would otherwise iterate
  # an empty array and print "PASS -- all checks passed" having asserted
  # nothing at all.
  local -a CHECKS=(
    "shell-csp-inline-attrs|check_shell_csp_inline_attrs"
    "shell04-log-redacts-token|check_shell04_log_redacts_token"
  )

  if [ "$QUICK" -eq 0 ]; then
    CHECKS+=(
      "side04-sigkill-no-orphan|check_side04_sigkill_no_orphan"
      "side04-unsupervised-backend-survives|check_side04_unsupervised_backend_survives"
      "side04-leftover-reaped|check_side04_leftover_reaped"
      "side04-stale-identity-not-signalled|check_side04_stale_identity_not_signalled"
      "harness-display-available|check_harness_display_available"
      "shell03-unrecoverable-immediate-error|check_shell03_unrecoverable_immediate_error"
      "shell03-budget-exhausted-error|check_shell03_budget_exhausted_error"
      "shell03-auto-dismiss-on-selfheal|check_shell03_auto_dismiss_on_selfheal"
      "shell04-diagnostics-with-backend-down|check_shell04_diagnostics_with_backend_down"
      "side05-second-launch-focuses|check_side05_second_launch_focuses"
      "side05-no-second-backend|check_side05_no_second_backend"
      "cr01-different-profile-backend-survives|check_cr01_different_profile_backend_survives"
      "side04-token-not-in-environment|check_side04_token_not_in_environment"
    )
  fi

  if [ -n "$ONLY" ]; then
    local -a FILTERED=()
    local ONLY_FOUND=0
    for entry in "${CHECKS[@]}"; do
      local label="${entry%%|*}"
      if [ "$label" = "$ONLY" ]; then
        FILTERED+=("$entry")
        ONLY_FOUND=1
      fi
    done
    if [ "$ONLY_FOUND" -eq 0 ]; then
      echo "verify-phase-05: FAIL -- unknown --only label '$ONLY'" >&2
      return 1
    fi
    CHECKS=("${FILTERED[@]}")
  fi

  local FAILED=0
  local -a SUMMARY=()

  for entry in "${CHECKS[@]}"; do
    local label="${entry%%|*}"
    local cmd="${entry#*|}"
    echo "verify-phase-05: running $label..."
    # Every check here is a bare, argument-free shell function name -- the
    # function itself is responsible for using setsid on whatever it spawns
    # (start_shell/start_backend already do). setsid cannot exec a shell
    # function directly (it needs an executable file), so the function is
    # called directly, mirroring verify-phase-04.sh's own bare-function-name
    # branch.
    if [[ "$cmd" == *[[:space:]]* ]]; then
      echo "verify-phase-05: FAIL -- check '$label' has a non-function-name command ('$cmd'); add a wrapper function instead" >&2
      SUMMARY+=("$label: FAIL")
      FAILED=1
      continue
    fi
    if "$cmd"; then
      SUMMARY+=("$label: PASS")
    else
      SUMMARY+=("$label: FAIL")
      FAILED=1
    fi
  done

  echo ""
  echo "verify-phase-05: summary"
  for line in "${SUMMARY[@]}"; do
    echo "  $line"
  done

  if [ "$FAILED" -eq 0 ]; then
    echo "verify-phase-05: PASS -- all checks passed"
    return 0
  else
    echo "verify-phase-05: FAIL -- see summary above" >&2
    return 1
  fi
}

# --- --gate mode (D-127, 05-05-PLAN.md Task 1) ------------------------------
#
# Reads the broken-windows ledger's own JSON block (the fenced array at the
# bottom of .planning/WINDOWS.md -- the markdown table above it is the
# human-readable mirror of the same data, not a second source of truth) and
# prints the named entry's current status. Exits 2 (distinct from 0/1, never
# treated as a plain pass/fail) if the ledger or the entry cannot be read at
# all, so a malformed/missing ledger can never be silently read as "open".
ledger_entry_status() {
  local id="$1"
  local windows_md="$REPO_ROOT/.planning/WINDOWS.md"
  node -e '
    const fs = require("fs");
    const path = process.argv[1];
    const id = Number(process.argv[2]);
    let text;
    try { text = fs.readFileSync(path, "utf8"); } catch { process.exit(2); }
    const m = text.match(/````json\n([\s\S]*?)\n````/);
    if (!m) { process.exit(2); }
    let arr;
    try { arr = JSON.parse(m[1]); } catch { process.exit(2); }
    const entry = arr.find((e) => e.id === id);
    if (!entry || typeof entry.status !== "string") { process.exit(2); }
    process.stdout.write(entry.status);
  ' "$windows_md" "$id"
}

# True (exit 0) only when ledger entry <id> is still status "open". A
# "fixed" or "waived" entry (or an unreadable ledger) returns false -- the
# exclusion this backs must stop applying the instant the entry stops being
# open, per D-127's own recorded guard.
ledger_entry_is_open() {
  local id="$1" status
  status="$(ledger_entry_status "$id")" || return 1
  [ "$status" = "open" ]
}

# Runs an external phase script (verify-phase-04.sh / verify-phase-03.sh)
# to completion under setsid (same process-group discipline every other
# external invocation in this file already uses), capturing its combined
# output to a track_temp-registered log and its exit status. Prints the
# captured output so a human reading --gate's own output sees exactly what
# that script printed, not a paraphrase.
GATE_LAST_LOG=""
GATE_LAST_RC=0
run_external_phase_script() {
  local script_path="$1"
  local log
  log="$(mktemp)"; track_temp "$log"
  setsid bash "$script_path" >"$log" 2>&1 &
  CURRENT_CHECK_PID=$!
  local rc=0
  wait "$CURRENT_CHECK_PID" || rc=$?
  CURRENT_CHECK_PID=""
  cat "$log"
  GATE_LAST_LOG="$log"
  GATE_LAST_RC="$rc"
}

# Failing-check labels are read off the target script's OWN printed summary
# lines ("  <label>: FAIL") rather than by re-deriving or re-running
# anything -- exactly the "extract, don't reimplement" instruction the plan
# gives.
extract_failed_labels() {
  grep -E '^  [A-Za-z0-9_.-]+: FAIL$' "$1" | sed -E 's/^  ([A-Za-z0-9_.-]+): FAIL$/\1/'
}

# The known-open exclusion list (D-127): exactly one entry today. Keyed on
# the broken-windows ledger id, never on a bare assertion -- see
# ledger_entry_is_open above. label|ledger_id|reason
declare -a GATE_KNOWN_OPEN_EXCLUSIONS=(
  "verify-endpoints|5|Gecko resolves 3 hosts absent from the BRAND-04 allowlist once the shell actually works (127.0.0.1 the Theia sidecar, ciscobinary.openh264.org the GMP manager, github.com the Theia frontend) -- not a code defect, needs a product/privacy decision this phase's scope explicitly excludes (05-CONTEXT.md <deferred>)"
)

run_gate_mode() {
  local gate_start="$SECONDS"
  local commit
  commit="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo "unknown")"
  echo "verify-phase-05: --gate -- commit $commit"
  echo "verify-phase-05: --gate -- proving verify-phase-05.sh + verify-phase-04.sh + verify-phase-03.sh all green at this one commit (D-127)"
  echo ""

  local overall_failed=0

  echo "=== Section 1/3: verify-phase-05.sh (this script's own full check set) ==="
  local phase5_rc=0
  run_own_checks || phase5_rc=$?
  if [ "$phase5_rc" -ne 0 ]; then
    overall_failed=1
    echo "--- Phase 5 section: FAIL ---"
  else
    echo "--- Phase 5 section: PASS ---"
  fi
  echo ""

  echo "=== Section 2/3: scripts/verify-phase-04.sh (full run) ==="
  run_external_phase_script "$REPO_ROOT/scripts/verify-phase-04.sh"
  local phase4_log="$GATE_LAST_LOG" phase4_rc="$GATE_LAST_RC"
  if [ "$phase4_rc" -ne 0 ]; then
    overall_failed=1
    echo "--- Phase 4 section: FAIL -- failing checks:"
    extract_failed_labels "$phase4_log" | sed 's/^/    /'
    echo "--- Phase 4 section: FAIL ---"
  else
    echo "--- Phase 4 section: PASS ---"
  fi
  echo ""

  echo "=== Section 3/3: scripts/verify-phase-03.sh (full run) ==="
  run_external_phase_script "$REPO_ROOT/scripts/verify-phase-03.sh"
  local phase3_log="$GATE_LAST_LOG" phase3_rc="$GATE_LAST_RC"
  local phase3_section_failed=0
  local excluded_count=0
  if [ "$phase3_rc" -ne 0 ]; then
    while IFS= read -r label; do
      [ -z "$label" ] && continue
      local excused=0
      local matched_known_exclusion=0
      local excl_entry
      for excl_entry in "${GATE_KNOWN_OPEN_EXCLUSIONS[@]}"; do
        local excl_label="${excl_entry%%|*}"
        local rest="${excl_entry#*|}"
        local excl_ledger_id="${rest%%|*}"
        local excl_reason="${rest#*|}"
        if [ "$label" = "$excl_label" ]; then
          matched_known_exclusion=1
          if ledger_entry_is_open "$excl_ledger_id"; then
            echo "  EXCLUDED (known-open): $label -- WINDOWS.md ledger entry $excl_ledger_id -- $excl_reason"
            excused=1
            excluded_count=$((excluded_count + 1))
          else
            echo "  FAIL (exclusion no longer applies): $label -- WINDOWS.md ledger entry $excl_ledger_id is no longer 'open' (fixed or waived); this check must be green now, not silently excused" >&2
            phase3_section_failed=1
          fi
          break
        fi
      done
      if [ "$excused" -ne 1 ] && [ "$matched_known_exclusion" -ne 1 ]; then
        echo "  FAIL (not excluded): $label" >&2
        phase3_section_failed=1
      fi
    done < <(extract_failed_labels "$phase3_log")
  fi
  if [ "$phase3_section_failed" -eq 1 ]; then
    overall_failed=1
    echo "--- Phase 3 section: FAIL ---"
  elif [ "$phase3_rc" -ne 0 ] && [ "$excluded_count" -gt 0 ]; then
    echo "--- Phase 3 section: PASS-WITH-EXCLUSIONS ($excluded_count named known-open exclusion(s)) ---"
  else
    echo "--- Phase 3 section: PASS ---"
  fi
  echo ""

  local gate_elapsed=$((SECONDS - gate_start))
  echo "verify-phase-05: --gate -- total runtime ${gate_elapsed}s"

  if [ "$overall_failed" -eq 0 ]; then
    echo "verify-phase-05: --gate PASS -- commit $commit -- every phase gate is green at this commit"
    return 0
  else
    echo "verify-phase-05: --gate FAIL -- commit $commit -- see section output above" >&2
    return 1
  fi
}

if [ "$GATE" -eq 1 ]; then
  run_gate_mode
  exit $?
else
  run_own_checks
  exit $?
fi
