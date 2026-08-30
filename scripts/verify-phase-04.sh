#!/usr/bin/env bash
# scripts/verify-phase-04.sh
#
# The single aggregator for every Phase 4 check, modelled on
# scripts/verify-phase-03.sh: unofficial-mode error handling (deliberately
# no `-e`, only `-u` and `pipefail` -- every check runs even if an earlier
# one failed), a CHECKS array
# later tasks append to rather than forking a sibling driver, and a
# per-check PASS/FAIL summary table with a non-zero exit if anything
# failed. One verification script per phase, extended never sibling'd
# (04-PATTERNS.md).
#
# `--quick` runs only checks needing no browser launch and no built tree.
# Task 1 registers the two boundary-guard checks here, both quick. Task 2
# appends backend-facing checks (token gate, bind scope) outside the quick
# set -- they spawn the Node sidecar. Task 3 appends end-to-end checks
# (shell presence, paint ordering, kill-and-recover) outside the quick set
# -- they launch the built `objdir/dist/bin/powerbrowser` binary and reuse
# scripts/lib/firefox-bidi.mjs, never a second driver. Plan 04-05 appends a
# third quick check, internals-catalogue, covering SHELL-02's second half
# (every internal PowerBrowserAPI.sys.mjs reaches is catalogued in
# powerbrowser/INTERNAL-APIS.md) -- 10 checks total.
#
# Every external script invocation runs under `setsid`, exactly like
# scripts/verify-phase-02.sh's and scripts/verify-phase-03.sh's own
# pattern: this script is non-interactive so job control is off, and a
# plain `cmd &` would share this script's own process group with every
# descendant a check backgrounds -- setsid makes the check the leader of
# its own new process group so `kill -- "-$PID"` on interrupt reaches the
# whole group in one signal.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

QUICK=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    *)
      echo "verify-phase-04: FAIL -- unknown argument '$arg'" >&2
      exit 1
      ;;
  esac
done

CURRENT_CHECK_PID=""
BACKEND_SPAWN_PID=""
BROWSER_SPAWN_PID=""
declare -a TEMP_PATHS=()
track_temp() { TEMP_PATHS+=("$1"); }

# WINDOWS.md 11: one run-scoped throwaway config home for start_shell()'s
# launches, so this harness never litters the real $HOME/.config/powerbrowser
# with a sidecar-state-<profile>.json per mktemp profile. start_backend()'s
# own THEIA_CONFIG_DIR is left alone -- out of scope, see start_shell() below.
# Exported (not just passed to start_shell's own setsid env) so
# scripts/lib/firefox-bidi.mjs's own child_process.spawn -- inherited
# process.env, invoked from inline node scripts this script itself spawns --
# lands in the throwaway dir too. REAL_XDG_CONFIG_HOME preserves whatever
# the caller's shell had (possibly unset) BEFORE this export, so
# start_backend()'s own config_dir line -- explicitly out of scope -- keeps
# resolving against the real value, not the harness override.
REAL_XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-}"
HARNESS_CONFIG_HOME="$(mktemp -d)"; track_temp "$HARNESS_CONFIG_HOME"
export XDG_CONFIG_HOME="$HARNESS_CONFIG_HOME"
cleanup() {
  if [ -n "$CURRENT_CHECK_PID" ]; then
    kill -- "-$CURRENT_CHECK_PID" 2>/dev/null || kill "$CURRENT_CHECK_PID" 2>/dev/null || true
    wait "$CURRENT_CHECK_PID" 2>/dev/null || true
    CURRENT_CHECK_PID=""
  fi
  # Safety net for a check-function check (side02-*, side01-bind-scope) that
  # started the sidecar via start_backend() and got interrupted before its
  # own stop_backend() call -- setsid gives the sidecar its own process
  # group, so a plain SIGINT to this script's foreground group would
  # otherwise orphan it.
  if [ -n "$BACKEND_SPAWN_PID" ]; then
    kill -- "-$BACKEND_SPAWN_PID" 2>/dev/null || kill "$BACKEND_SPAWN_PID" 2>/dev/null || true
    wait "$BACKEND_SPAWN_PID" 2>/dev/null || true
    BACKEND_SPAWN_PID=""
  fi
  # Same safety net for a check that started the built browser binary via
  # start_shell() (shell05-paint-before-backend, side03-kill-and-recover).
  if [ -n "$BROWSER_SPAWN_PID" ]; then
    kill -- "-$BROWSER_SPAWN_PID" 2>/dev/null || kill "$BROWSER_SPAWN_PID" 2>/dev/null || true
    wait "$BROWSER_SPAWN_PID" 2>/dev/null || true
    BROWSER_SPAWN_PID=""
  fi
  # -rf (not -f): TEMP_PATHS also carries start_shell's throwaway profile
  # directories, not only plain temp files.
  for p in "${TEMP_PATHS[@]:-}"; do
    [ -n "$p" ] && rm -rf "$p"
  done
  TEMP_PATHS=()
}
# EXIT alone is not enough: bash resumes the rest of the script after a
# non-EXIT trap handler returns unless that handler exits itself
# (scripts/verify-phase-02.sh/03.sh's own documented reason for splitting
# this into two traps).
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

# --- Task 2: backend-facing checks (SIDE-01, SIDE-02) -----------------------
#
# Every check below is expected to FAIL until plan 04-02 lands the
# @powerbrowser/token-gate extension: start_backend spawns the STOCK Theia
# backend (no token gate wired in yet), so POWERBROWSER_BACKEND_READY never
# appears in its log and every check that depends on it fails via the
# "backend never became ready" branch. That is the correct Wave 0 signal,
# not a broken harness (04-01-PLAN.md must_haves).
#
# start_backend/stop_backend set/clear a shared set of globals
# (BACKEND_TOKEN, BACKEND_PORT, BACKEND_PID, BACKEND_LOG, BACKEND_SPAWN_PID)
# rather than being passed around, mirroring this script's own CURRENT_CHECK_PID
# convention -- each check function calls start_backend, uses the globals,
# and always calls stop_backend before returning, on every path.
BACKEND_TOKEN=""
BACKEND_PORT=""
BACKEND_PID=""
BACKEND_LOG=""

# Spawns theia/applications/browser/lib/backend/main.js directly (D-101,
# Pitfall 2 -- never through the yarn/bash `theia start` wrapper, which
# would make kill() only reach a shell and orphan the real backend), inside
# `nix develop $REPO_ROOT#theia --command` so it gets the pinned Node 22.
# Binds --hostname 127.0.0.1 --port 0 (SIDE-01). Polls BACKEND_LOG for a
# `POWERBROWSER_BACKEND_READY {"port":N,"pid":N}` line for up to 90s. Returns
# 0 with BACKEND_TOKEN/BACKEND_PORT/BACKEND_PID/BACKEND_SPAWN_PID all set
# on success; on failure/timeout, prints the captured log and returns 1
# with BACKEND_SPAWN_PID left set so the caller's stop_backend still reaps
# whatever did spawn.
start_backend() {
  BACKEND_TOKEN="$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')"
  local log
  log="$(mktemp)"
  track_temp "$log"
  BACKEND_LOG="$log"

  local config_dir="${REAL_XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"
  mkdir -p "$config_dir"

  # -u: this is one of the three unsupervised callers the watchdog's marker
  # gate exists to protect. Run from a terminal inside a PowerBrowser instance,
  # an inherited POWERBROWSER_SUPERVISED would arm the watchdog in this backend,
  # which then self-terminates the moment its own stdin EOFs -- every check
  # below it failing for a reason that has nothing to do with Phase 4. The
  # dev bypass is cleared for the same reason: it must never be inherited
  # into a run that mints its own token.
  setsid env -u POWERBROWSER_SUPERVISED -u POWERBROWSER_TOKEN_DISABLE \
    POWERBROWSER_TOKEN="$BACKEND_TOKEN" \
    THEIA_CONFIG_DIR="$config_dir" \
    VSX_REGISTRY_URL="https://open-vsx.org" \
    nix develop "$REPO_ROOT#theia" --command \
    node "$REPO_ROOT/theia/applications/browser/lib/backend/main.js" --hostname 127.0.0.1 --port 0 \
    >"$log" 2>&1 &
  BACKEND_SPAWN_PID=$!

  local deadline=$((SECONDS + 90))
  local line json
  while [ "$SECONDS" -lt "$deadline" ]; do
    if line="$(grep -m1 '^POWERBROWSER_BACKEND_READY ' "$log" 2>/dev/null)"; then
      json="${line#POWERBROWSER_BACKEND_READY }"
      BACKEND_PORT="$(node -e 'try{const j=JSON.parse(process.argv[1]);if(typeof j.port==="number")console.log(j.port)}catch{}' "$json" 2>/dev/null)"
      BACKEND_PID="$(node -e 'try{const j=JSON.parse(process.argv[1]);if(typeof j.pid==="number")console.log(j.pid)}catch{}' "$json" 2>/dev/null)"
      if [ -n "$BACKEND_PORT" ] && [ -n "$BACKEND_PID" ]; then
        return 0
      fi
    fi
    if ! kill -0 "$BACKEND_SPAWN_PID" 2>/dev/null; then
      echo "start_backend: FAIL -- backend process exited before printing POWERBROWSER_BACKEND_READY; log:" >&2
      cat "$log" >&2
      return 1
    fi
    sleep 0.5
  done

  echo "start_backend: FAIL -- POWERBROWSER_BACKEND_READY did not appear within 90s; log:" >&2
  cat "$log" >&2
  return 1
}

stop_backend() {
  if [ -n "$BACKEND_SPAWN_PID" ]; then
    kill -- "-$BACKEND_SPAWN_PID" 2>/dev/null || kill "$BACKEND_SPAWN_PID" 2>/dev/null || true
    wait "$BACKEND_SPAWN_PID" 2>/dev/null || true
    BACKEND_SPAWN_PID=""
  fi
}

# Negative control (SIDE-02, Pitfall 1): a request with no cookie must be
# 403 AND must carry no Set-Cookie header at all -- a 403 that still leaks
# the stock theia-connection-token cookie is a FAIL, not just a status-code
# check.
check_side02_token_negative() {
  if ! start_backend; then
    echo "side02-token-negative: FAIL -- SIDE-02 -- backend never became ready, cannot test the token gate" >&2
    stop_backend
    return 1
  fi
  local headers status result=0
  headers="$(mktemp)"; track_temp "$headers"
  status="$(curl -sS -o /dev/null -w '%{http_code}' -D "$headers" "http://127.0.0.1:$BACKEND_PORT/powerbrowser/health")"
  if [ "$status" != "403" ]; then
    echo "side02-token-negative: FAIL -- SIDE-02 -- expected 403 without a token, got $status" >&2
    result=1
  fi
  if grep -qi '^Set-Cookie:' "$headers"; then
    echo "side02-token-negative: FAIL -- SIDE-02 -- 403 response leaked a Set-Cookie header:" >&2
    grep -i '^Set-Cookie:' "$headers" >&2
    result=1
  fi
  stop_backend
  return "$result"
}

# Paired positive control (D-68 idiom): the same route, with the token
# cookie, must be 200 with a JSON body carrying ok:true and a numeric pid
# (D-103 -- one request proves both liveness and enforcement).
check_side02_token_positive() {
  if ! start_backend; then
    echo "side02-token-positive: FAIL -- SIDE-02 -- backend never became ready, cannot test the token gate" >&2
    stop_backend
    return 1
  fi
  local body status result=0
  body="$(mktemp)"; track_temp "$body"
  status="$(curl -sS -o "$body" -w '%{http_code}' -b "POWERBROWSER_TOKEN=$BACKEND_TOKEN" "http://127.0.0.1:$BACKEND_PORT/powerbrowser/health")"
  if [ "$status" != "200" ]; then
    echo "side02-token-positive: FAIL -- SIDE-02 -- expected 200 with a valid token, got $status" >&2
    result=1
  elif ! node -e '
    const fs = require("fs");
    const b = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.exit(b.ok === true && typeof b.pid === "number" ? 0 : 1);
  ' "$body" 2>/dev/null; then
    echo "side02-token-positive: FAIL -- SIDE-02 -- 200 response body is not {ok:true, pid:<number>}: $(cat "$body")" >&2
    result=1
  fi
  stop_backend
  return "$result"
}

# D-98's clause that static assets and index.html are gated too (the stock
# Theia token does not do this -- it only enforces on WS upgrade and
# opt-in routes).
check_side02_index_gated() {
  if ! start_backend; then
    echo "side02-index-gated: FAIL -- SIDE-02 -- backend never became ready, cannot test the token gate" >&2
    stop_backend
    return 1
  fi
  local status_no status_yes result=0
  status_no="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$BACKEND_PORT/")"
  if [ "$status_no" != "403" ]; then
    echo "side02-index-gated: FAIL -- SIDE-02 -- expected 403 for / without a token, got $status_no" >&2
    result=1
  fi
  status_yes="$(curl -sS -o /dev/null -w '%{http_code}' -b "POWERBROWSER_TOKEN=$BACKEND_TOKEN" "http://127.0.0.1:$BACKEND_PORT/")"
  if [ "$status_yes" = "403" ]; then
    echo "side02-index-gated: FAIL -- SIDE-02 -- expected a non-403 for / with a valid token, still got 403" >&2
    result=1
  fi
  stop_backend
  return "$result"
}

# SIDE-01: the announced port must be bound to 127.0.0.1 only (never
# 0.0.0.0/[::]), and must be OS-assigned (port 0 requested), not the fixed
# stock default 3000.
check_side01_bind_scope() {
  if ! start_backend; then
    echo "side01-bind-scope: FAIL -- SIDE-01 -- backend never became ready, cannot inspect its bind scope" >&2
    stop_backend
    return 1
  fi
  local result=0 rows non_loopback_rows
  rows="$(ss -ltnH "sport = :$BACKEND_PORT" 2>/dev/null)"
  if [ -z "$rows" ]; then
    echo "side01-bind-scope: FAIL -- SIDE-01 -- ss found no listening socket on port $BACKEND_PORT" >&2
    result=1
  else
    non_loopback_rows="$(echo "$rows" | awk '{print $4}' | grep -vE '^127\.0\.0\.1:' || true)"
    if [ -n "$non_loopback_rows" ]; then
      echo "side01-bind-scope: FAIL -- SIDE-01 -- a listening row's local address is not 127.0.0.1:*: $non_loopback_rows" >&2
      result=1
    fi
    if echo "$rows" | awk '{print $4}' | grep -qE '^(0\.0\.0\.0:|\[::\]:)'; then
      echo "side01-bind-scope: FAIL -- SIDE-01 -- found a 0.0.0.0/[::] listening row: $rows" >&2
      result=1
    fi
  fi
  if [ "$BACKEND_PORT" = "3000" ]; then
    echo "side01-bind-scope: FAIL -- SIDE-01 -- announced port is the fixed default 3000, not OS-assigned" >&2
    result=1
  fi
  stop_backend
  return "$result"
}

# --- Task 3: end-to-end checks (SHELL-01, SHELL-05, SIDE-03) ----------------
#
# All three launch $REPO_ROOT/objdir/dist/bin/powerbrowser, the same binary
# scripts/lib/firefox-bidi.mjs targets by default (its FIREFOX_BIN export).
# shell05/side03 need the launched process's own stdout+stderr (to read the
# POWERBROWSER_SHELL_READY/POWERBROWSER_BACKEND_READY/POWERBROWSER_SHELL_SWAP
# sentinels) -- withFirefoxPage's spawn discards stdout, so those two use
# start_shell/stop_shell below (this script's own setsid + log-file
# capture, exactly like start_backend/stop_backend). shell01 needs real
# page evaluation (DOM presence of Theia's own shell) instead, so it is
# generated as a small temp .mjs runner that imports
# scripts/lib/firefox-bidi.mjs's withFirefoxPage/waitFor UNCHANGED
# (04-PATTERNS.md key_link) -- never a second driver, and never a
# persisted sibling file: the runner lives only under mktemp, registered
# with track_temp like every other self-test fixture in this file.
BROWSER_LOG=""

# Spawns the built binary headless with a throwaway profile, capturing its
# combined stdout+stderr to a track_temp-registered log file. Callers poll
# BROWSER_LOG for whatever sentinel they need; stop_shell() always tears
# the process (and setsid process group) down. A missing/non-executable
# binary is a named FAIL, not a skip (mirrors firefox-bidi.mjs's own
# existsSync guard).
start_shell() {
  local bin="$REPO_ROOT/objdir/dist/bin/powerbrowser"
  if [ ! -x "$bin" ]; then
    echo "start_shell: FAIL -- $bin does not exist or is not executable (run the Phase 1 Firefox build first)" >&2
    return 1
  fi
  local log profile
  log="$(mktemp)"; track_temp "$log"
  profile="$(mktemp -d)"; track_temp "$profile"
  BROWSER_LOG="$log"

  setsid env "XDG_CONFIG_HOME=$HARNESS_CONFIG_HOME" "$bin" --headless --profile "$profile" >"$log" 2>&1 &
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

# Byte offset (not line number -- SHELL-05's own contract) of the first
# line beginning with the given literal prefix, or empty if absent.
# The shell's own sentinels reach stdout unprefixed via dump(), but the
# backend's are mirrored through PowerBrowserAPI.log(), which prefixes them with
# "[PowerBrowserAPI] <level>: ". Accept either form, still anchored to line start
# so a sentinel *named* inside a prose log line (e.g. the "did not announce
# POWERBROWSER_BACKEND_READY within ..." fatal) can never be mistaken for the
# real thing. Byte offsets stay line-start in both cases, so the ordering
# assertions below compare like with like.
first_byte_offset() {
  grep -abom1 -E "^(\\[PowerBrowserAPI\\] [a-z]+: )?$1" "$2" 2>/dev/null | cut -d: -f1
}

# Every pid announced by a POWERBROWSER_BACKEND_READY sentinel in <log>, oldest
# first, one per line. Tolerates the PowerBrowserAPI.log() mirror prefix exactly
# as first_byte_offset does.
backend_ready_pids() {
  sed -E 's/^\[PowerBrowserAPI\] [a-z]+: //' "$1" 2>/dev/null \
    | grep -E '^POWERBROWSER_BACKEND_READY ' \
    | sed -E 's/^POWERBROWSER_BACKEND_READY //' \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const l of s.split("\n")){if(!l.trim())continue;try{const j=JSON.parse(l);if(typeof j.pid==="number")console.log(j.pid)}catch{}}})' 2>/dev/null
}

# The port announced alongside <pid> in <log>.
backend_ready_port_for_pid() {
  sed -E 's/^\[PowerBrowserAPI\] [a-z]+: //' "$1" 2>/dev/null \
    | grep -E '^POWERBROWSER_BACKEND_READY ' \
    | sed -E 's/^POWERBROWSER_BACKEND_READY //' \
    | node -e 'let s="";const want=Number(process.argv[1]);process.stdin.on("data",d=>s+=d).on("end",()=>{for(const l of s.split("\n")){if(!l.trim())continue;try{const j=JSON.parse(l);if(j.pid===want&&typeof j.port==="number"){console.log(j.port);return}}catch{}}})' "$2" 2>/dev/null
}

# SHELL-05: window show must never wait on backend readiness. The shell-
# ready sentinel must appear strictly before the backend-ready sentinel,
# and the shell-swap sentinel after both. Also the Pitfall 4 residual-risk
# smoke check: zero occurrences of "gBrowser is undefined" in the log.
check_shell05_paint_before_backend() {
  if ! start_shell; then
    echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 60))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if grep -q '^POWERBROWSER_SHELL_SWAP ' "$BROWSER_LOG" 2>/dev/null; then
      break
    fi
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      break
    fi
    sleep 0.5
  done

  local result=0 shell_off backend_off swap_off
  shell_off="$(first_byte_offset 'POWERBROWSER_SHELL_READY ' "$BROWSER_LOG")"
  backend_off="$(first_byte_offset 'POWERBROWSER_BACKEND_READY ' "$BROWSER_LOG")"
  swap_off="$(first_byte_offset 'POWERBROWSER_SHELL_SWAP ' "$BROWSER_LOG")"

  if [ -z "$shell_off" ] || [ -z "$backend_off" ] || [ -z "$swap_off" ]; then
    echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- one or more of POWERBROWSER_SHELL_READY/POWERBROWSER_BACKEND_READY/POWERBROWSER_SHELL_SWAP never appeared within 60s; log:" >&2
    cat "$BROWSER_LOG" >&2
    result=1
  else
    if [ "$shell_off" -ge "$backend_off" ]; then
      echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- POWERBROWSER_SHELL_READY (byte $shell_off) did not appear strictly before POWERBROWSER_BACKEND_READY (byte $backend_off)" >&2
      result=1
    fi
    if [ "$swap_off" -le "$backend_off" ] || [ "$swap_off" -le "$shell_off" ]; then
      echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- POWERBROWSER_SHELL_SWAP (byte $swap_off) did not appear after both READY sentinels (shell $shell_off, backend $backend_off)" >&2
      result=1
    fi
  fi

  if grep -q 'gBrowser is undefined' "$BROWSER_LOG" 2>/dev/null; then
    echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- log contains 'gBrowser is undefined' (Pitfall 4 residual-risk check)" >&2
    result=1
  fi

  # "Theia is the only GUI" is not proven by the swap sentinel: the swap
  # genuinely happened in the build where BOTH deck overlays painted on top
  # of it (a CSP-dropped style attribute -- see powerbrowser.css's header), and
  # every DOM/screenshot assertion in this file targets the CONTENT browsing
  # context, which stays perfectly healthy underneath an occluding chrome
  # overlay. The shell's own POWERBROWSER_DECK_STATE sentinel reports resolved
  # visibility from inside the chrome document, the one place that can see
  # it. Positive control lives in verify-phase-05.sh's
  # shell03-budget-exhausted-error, so this "none" can never pass vacuously.
  if [ -n "$swap_off" ]; then
    local deck_off deck_line
    deck_off="$(grep -abo -E '^(\[PowerBrowserAPI\] [a-z]+: )?POWERBROWSER_DECK_STATE ' "$BROWSER_LOG" 2>/dev/null | awk -F: -v s="$swap_off" '$1 > s { print $1; exit }')"
    if [ -z "$deck_off" ]; then
      echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- no POWERBROWSER_DECK_STATE sentinel after the swap (byte $swap_off); overlay occlusion is unproven; log:" >&2
      cat "$BROWSER_LOG" >&2
      result=1
    else
      deck_line="$(tail -c +$((deck_off + 1)) "$BROWSER_LOG" | head -1)"
      if ! grep -q '"loading":"none","error":"none","diagnostics":"none"' <<<"$deck_line"; then
        echo "shell05-paint-before-backend: FAIL -- SHELL-05 -- a deck overlay is painted over the swapped-in Theia: $deck_line" >&2
        result=1
      fi
    fi
  fi

  stop_shell
  return "$result"
}

# SIDE-03: kill the backend the chrome side spawned and assert TheiaService
# recovers it on the SAME port with a DIFFERENT pid (D-104 -- a fresh port
# would break the already-loaded page's reconnect), without the browser
# process itself ever exiting.
#
# Known limitation (documented, not silently assumed): D-99's chrome-set
# token cookie is not observable to a bash/curl driver with no chrome-side
# access -- reading it would need a WebDriver BiDi storage.getCookies call,
# which scripts/lib/firefox-bidi.mjs does not currently export (adding it
# would touch the "reused unchanged" file this phase's own key_link
# forbids touching). This check proves the pid/port half of D-104 (the
# actually load-bearing half -- a fresh port silently breaks reconnect)
# against the currently-ungated health route. The cookie-continuity half
# is deferred to whichever future task extends firefox-bidi.mjs's exported
# surface with cookie access; recorded here rather than asserted falsely.
check_side03_kill_and_recover() {
  if ! start_shell; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- could not launch the built binary" >&2
    return 1
  fi

  local deadline=$((SECONDS + 60)) result=0
  while [ "$SECONDS" -lt "$deadline" ]; do
    grep -q '^POWERBROWSER_SHELL_SWAP ' "$BROWSER_LOG" 2>/dev/null && break
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "side03-kill-and-recover: FAIL -- SIDE-03 -- browser process exited before POWERBROWSER_SHELL_SWAP appeared; log:" >&2
      cat "$BROWSER_LOG" >&2
      stop_shell
      return 1
    fi
    sleep 0.5
  done
  if ! grep -q '^POWERBROWSER_SHELL_SWAP ' "$BROWSER_LOG" 2>/dev/null; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- POWERBROWSER_SHELL_SWAP did not appear within 60s; log:" >&2
    cat "$BROWSER_LOG" >&2
    stop_shell
    return 1
  fi

  local ready_line json port
  # Same PowerBrowserAPI.log() prefix as first_byte_offset() above: in the browser
  # log this sentinel is mirrored, not raw. Strip any prefix before parsing.
  ready_line="$(grep -m1 -E '^(\[PowerBrowserAPI\] [a-z]+: )?POWERBROWSER_BACKEND_READY ' "$BROWSER_LOG" 2>/dev/null | sed -E 's/^\[PowerBrowserAPI\] [a-z]+: //')"
  if [ -z "$ready_line" ]; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- POWERBROWSER_BACKEND_READY never appeared, cannot recover the port" >&2
    stop_shell
    return 1
  fi
  json="${ready_line#POWERBROWSER_BACKEND_READY }"
  port="$(node -e 'try{const j=JSON.parse(process.argv[1]);if(typeof j.port==="number")console.log(j.port)}catch{}' "$json" 2>/dev/null)"
  if [ -z "$port" ]; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- could not parse a port out of POWERBROWSER_BACKEND_READY's JSON" >&2
    stop_shell
    return 1
  fi

  # D-99's chrome-minted token gates EVERY backend route including
  # /powerbrowser/health, and a bash/curl driver has no chrome-side access to it,
  # so the health endpoint is unreadable from here (403, no body). The
  # supervisor's own POWERBROWSER_BACKEND_READY sentinel carries the same
  # {port,pid} pair and needs no token, so read both generations from the
  # browser log instead. This asserts strictly more than the old health probe
  # did: it proves the supervisor itself observed the respawn, not merely that
  # something is listening on the port.
  local pid1
  pid1="$(backend_ready_pids "$BROWSER_LOG" | head -1)"
  if [ -z "$pid1" ]; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- could not read a pid from POWERBROWSER_BACKEND_READY in the browser log" >&2
    stop_shell
    return 1
  fi

  kill -9 "$pid1" 2>/dev/null || true

  local recover_deadline=$((SECONDS + 60)) pid2="" port2=""
  while [ "$SECONDS" -lt "$recover_deadline" ]; do
    # A respawn announces a fresh sentinel; take the newest one that is not pid1.
    pid2="$(backend_ready_pids "$BROWSER_LOG" | grep -vx "$pid1" | tail -1)"
    if [ -n "$pid2" ]; then
      port2="$(backend_ready_port_for_pid "$BROWSER_LOG" "$pid2")"
      break
    fi
    if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
      echo "side03-kill-and-recover: FAIL -- SIDE-03 -- browser process exited during the recovery wait" >&2
      result=1
      break
    fi
    sleep 0.5
  done

  if [ -z "$pid2" ] && [ "$result" -eq 0 ]; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- no POWERBROWSER_BACKEND_READY with a pid different from $pid1 appeared within 60s of killing it" >&2
    result=1
  fi

  # D-104's load-bearing half: the respawn MUST reuse the same port, or the
  # already-loaded page's reconnect silently breaks.
  if [ -n "$pid2" ] && [ "$port2" != "$port" ]; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- respawn (pid $pid2) came back on port $port2, not the pinned port $port (D-104)" >&2
    result=1
  fi

  if ! kill -0 "$BROWSER_SPAWN_PID" 2>/dev/null; then
    echo "side03-kill-and-recover: FAIL -- SIDE-03 -- browser process itself exited during the check" >&2
    result=1
  fi

  stop_shell
  return "$result"
}

# SHELL-01: builds a temp .mjs runner (never a persisted repo file) that
# imports withFirefoxPage/waitFor from scripts/lib/firefox-bidi.mjs
# unchanged. Asserts the top-level content context's URL starts with
# http://127.0.0.1: and that Theia's own application shell, a menu bar and
# a status bar are all present after a bounded 60s poll -- never a point-
# in-time assertion (02-LEARNINGS). Paired with a static assertion that
# powerbrowser/shell/powerbrowser.xhtml adds no custom chrome (zero occurrences
# of tabbrowser/nav-bar/toolbarbutton/urlbar).
SHELL01_MJS=""
if [ "$QUICK" -eq 0 ]; then
  SHELL01_MJS="$(mktemp --suffix=.mjs)"
  track_temp "$SHELL01_MJS"
  cat > "$SHELL01_MJS" <<MJSEOF
import { withFirefoxPage } from '$REPO_ROOT/scripts/lib/firefox-bidi.mjs';
import { readFileSync, existsSync } from 'node:fs';

const xhtmlPath = '$REPO_ROOT/powerbrowser/shell/powerbrowser.xhtml';
const forbidden = ['tabbrowser', 'nav-bar', 'toolbarbutton', 'urlbar'];
let ok = true;

if (!existsSync(xhtmlPath)) {
  console.error(\`shell01-theia-is-the-window: FAIL -- SHELL-01 -- \${xhtmlPath} does not exist yet\`);
  ok = false;
} else {
  const text = readFileSync(xhtmlPath, 'utf8');
  for (const term of forbidden) {
    if (text.includes(term)) {
      console.error(\`shell01-theia-is-the-window: FAIL -- SHELL-01 -- \${xhtmlPath} contains forbidden custom-chrome string '\${term}'\`);
      ok = false;
    }
  }
}

try {
  await withFirefoxPage('about:blank', async ({ evaluate, waitFor }) => {
    // SHELL-05 requires the shell to paint BEFORE the backend is ready, so the
    // swap to the Theia URL is necessarily asynchronous and the first context
    // URL seen here is the shell's own about:blank placeholder. Poll for the
    // swap rather than sampling once (02-LEARNINGS: never a point-in-time
    // assertion); the assertion itself is unchanged -- the top-level content
    // context must end up on the loopback backend.
    try {
      await waitFor('location.href.startsWith("http://127.0.0.1:")', { timeoutMs: 60000 });
    } catch {
      // fall through to report the actual URL below
    }
    const contextUrl = await evaluate('location.href');
    if (typeof contextUrl !== 'string' || !contextUrl.startsWith('http://127.0.0.1:')) {
      console.error(\`shell01-theia-is-the-window: FAIL -- SHELL-01 -- top-level context URL '\${contextUrl}' does not start with http://127.0.0.1:\`);
      ok = false;
    }
    // Selectors verified against the pinned Theia v1.74.1 DOM, not guessed:
    // 1.74 renders on Lumino, so the menu bar is \`#theia:menubar\` with classes
    // \`lm-Widget lm-MenuBar\` -- the PhosphorJS-era \`.p-MenuBar\` and a
    // \`.theia-menubar\` class do not exist -- and the status bar is the id
    // \`#theia-statusBar\`, not a class of that name.
    await waitFor('!!document.querySelector("#theia-app-shell")', { timeoutMs: 60000 });
    await waitFor('!!document.querySelector("#theia-app-shell .lm-MenuBar")', { timeoutMs: 60000 });
    await waitFor('!!document.querySelector("#theia-statusBar")', { timeoutMs: 60000 });
  });
} catch (err) {
  console.error(\`shell01-theia-is-the-window: FAIL -- SHELL-01 -- \${err.message}\`);
  ok = false;
}

if (!ok) process.exitCode = 1;
else console.log('shell01-theia-is-the-window: PASS');
process.exit(process.exitCode || 0);
MJSEOF
fi

# Each entry: "label|command...". Later tasks append here, never as a
# sibling driver script.
declare -a CHECKS=(
  "internals-boundary-self-test|bash $REPO_ROOT/scripts/check-internals-boundary.sh --self-test"
  "internals-boundary|bash $REPO_ROOT/scripts/check-internals-boundary.sh"
  "internals-catalogue|bash $REPO_ROOT/scripts/check-internals-boundary.sh --catalogue"
)

if [ "$QUICK" -eq 0 ]; then
  CHECKS+=(
    "side02-token-negative|check_side02_token_negative"
    "side02-token-positive|check_side02_token_positive"
    "side02-index-gated|check_side02_index_gated"
    "side01-bind-scope|check_side01_bind_scope"
    "shell01-theia-is-the-window|node $SHELL01_MJS"
    "shell05-paint-before-backend|check_shell05_paint_before_backend"
    "side03-kill-and-recover|check_side03_kill_and_recover"
  )
fi

FAILED=0
declare -a SUMMARY=()

for entry in "${CHECKS[@]}"; do
  label="${entry%%|*}"
  cmd="${entry#*|}"
  echo "verify-phase-04: running $label..."
  case "$cmd" in
    bash\ */*|node\ */*)
      setsid $cmd &
      CURRENT_CHECK_PID=$!
      if wait "$CURRENT_CHECK_PID"; then
        SUMMARY+=("$label: PASS")
      else
        SUMMARY+=("$label: FAIL")
        FAILED=1
      fi
      CURRENT_CHECK_PID=""
      ;;
    *)
      # Every entry reaching this branch must be a bare, argument-free
      # shell function name -- a command string with arguments needs its
      # own wrapper function instead (mirrors verify-phase-03.sh WR-02).
      if [[ "$cmd" == *[[:space:]]* ]]; then
        echo "verify-phase-04: FAIL -- check '$label' has a non-function-name command ('$cmd'); add a wrapper function instead" >&2
        SUMMARY+=("$label: FAIL")
        FAILED=1
      elif "$cmd"; then
        SUMMARY+=("$label: PASS")
      else
        SUMMARY+=("$label: FAIL")
        FAILED=1
      fi
      ;;
  esac
done

echo ""
echo "verify-phase-04: summary"
for line in "${SUMMARY[@]}"; do
  echo "  $line"
done

if [ "$FAILED" -eq 0 ]; then
  echo "verify-phase-04: PASS -- all checks passed"
  exit 0
else
  echo "verify-phase-04: FAIL -- see summary above" >&2
  exit 1
fi
