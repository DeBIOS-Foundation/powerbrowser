#!/usr/bin/env bash
# scripts/verify-phase-02.sh
#
# Sequencing driver for every phase-02 check. Owns the app's lifecycle so no
# individual check has to: optionally builds, starts `theia start` in the
# background, polls for the port (never sleeps a fixed constant), runs every
# check in order, and always kills the app in a `trap` -- on the pass path,
# the fail path, and on interrupt. Later plans append their own checks to
# the CHECKS list below rather than adding a sibling driver.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEIA_DIR="$REPO_ROOT/theia"
APP_URL="http://localhost:3000"
DO_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --build) DO_BUILD=1 ;;
    *)
      echo "verify-phase-02: FAIL -- unknown argument '$arg' (only --build is accepted)" >&2
      exit 1
      ;;
  esac
done

if [ "$DO_BUILD" -eq 1 ]; then
  echo "verify-phase-02: building..."
  if ! nix develop "$REPO_ROOT#theia" --command bash -c "cd '$THEIA_DIR' && yarn build"; then
    echo "verify-phase-02: FAIL -- build failed" >&2
    exit 1
  fi
fi

if curl -sf "$APP_URL" >/dev/null 2>&1; then
  echo "verify-phase-02: FAIL -- something is already listening on $APP_URL (stale run?). Kill it and re-run." >&2
  exit 1
fi

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    # yarn does not exec-replace itself running a package script, so the
    # Node backend actually holding the port is a grandchild of the tracked
    # PID -- signal the whole process group (smoke-theia.sh's pattern).
    kill -- "-$SERVER_PID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
# EXIT alone is not enough: bash resumes the *rest of the script* after a
# non-EXIT trap handler returns, unless that handler explicitly exits -- so
# INT/TERM must each call `exit` themselves. Discovered live: a bare
# `trap cleanup EXIT INT TERM` let a SIGINT delivered early (before
# SERVER_PID was even assigned) run cleanup() as a no-op and then continue
# straight through the rest of the script as if uninterrupted, leaving the
# backend it eventually started orphaned on :3000 with no further chance to
# clean it up. `exit` here still fires the EXIT trap once more afterwards
# (harmless -- cleanup is idempotent against an empty/already-dead PID).
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

echo "verify-phase-02: starting theia start..."
# Phase 4's @powerbrowser/token-gate extension gates the backend on
# POWERBROWSER_TOKEN; this dev loop drives it unauthenticated (including from a
# cookie-less browser session), so it opts out via the named bypass. The
# supervised PowerBrowser path never sets this.
setsid env POWERBROWSER_TOKEN_DISABLE=1 nix develop "$REPO_ROOT#theia" --command yarn --cwd "$THEIA_DIR" start &
SERVER_PID=$!

DEADLINE=$((SECONDS + 60))
until curl -sf "$APP_URL" >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$DEADLINE" ]; then
    echo "verify-phase-02: FAIL -- $APP_URL did not answer within 60s" >&2
    exit 1
  fi
  sleep 1
done
echo "verify-phase-02: app is up at $APP_URL"

# Each entry: "label|command..." -- later plans append here, not as a
# sibling driver script. diff-theia-core.sh needs `yarn` on PATH, which the
# plain host shell does not provide (D-69 confirmed `node` and
# objdir/dist/bin/firefox both work outside nix develop; yarn does not), so
# only that one check runs through the theia dev shell.
declare -a CHECKS=(
  "diff-theia-core|nix develop \"$REPO_ROOT#theia\" --command bash $REPO_ROOT/scripts/diff-theia-core.sh"
  "verify-branding|node $REPO_ROOT/scripts/verify-branding.mjs $APP_URL"
  "verify-customize-inert|node $REPO_ROOT/scripts/verify-customize-inert.mjs $APP_URL"
  "verify-dev-flag-off|node $REPO_ROOT/scripts/verify-dev-flag-off.mjs $APP_URL"
  "verify-uri-roundtrip|node $REPO_ROOT/scripts/verify-uri-roundtrip.mjs $APP_URL"
)

FAILED=0
declare -a SUMMARY=()

for entry in "${CHECKS[@]}"; do
  label="${entry%%|*}"
  cmd="${entry#*|}"
  echo "verify-phase-02: running $label..."
  if eval "$cmd"; then
    SUMMARY+=("$label: PASS")
  else
    SUMMARY+=("$label: FAIL")
    FAILED=1
  fi
done

echo ""
echo "verify-phase-02: summary"
for line in "${SUMMARY[@]}"; do
  echo "  $line"
done

if [ "$FAILED" -eq 0 ]; then
  echo "verify-phase-02: PASS -- all checks passed"
  exit 0
else
  echo "verify-phase-02: FAIL -- see summary above" >&2
  exit 1
fi
