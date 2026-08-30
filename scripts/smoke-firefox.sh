#!/usr/bin/env bash
# Wave 0 gate for BUILD-02.
#
# WARNING: this runs a full Gecko compile and takes HOURS. It is manual-only
# per 01-VALIDATION.md, never a per-commit gate.
#
# Run from the repo root, no arguments.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$REPO_ROOT/upstream"
MOZCONFIG_FILE="$REPO_ROOT/.mozconfig"

if [ ! -d "$UPSTREAM_DIR" ]; then
  echo "smoke-firefox: FAIL -- $UPSTREAM_DIR does not exist (run scripts/fetch-upstream.sh first)" >&2
  exit 1
fi

if [ ! -f "$MOZCONFIG_FILE" ]; then
  echo "smoke-firefox: FAIL -- $MOZCONFIG_FILE does not exist" >&2
  exit 1
fi

LOG_DIR="$REPO_ROOT/.mozbuild"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/smoke-firefox-build.log"

nix develop "$REPO_ROOT#firefox" --command bash -c "
  set -euo pipefail
  cd '$UPSTREAM_DIR'
  MOZCONFIG='$MOZCONFIG_FILE' ./mach build 2>&1 | tee '$LOG_FILE'
"

BOOTSTRAP_COUNT="$(grep -cE 'mach[[:space:]]+bootstrap' "$LOG_FILE" || true)"
if [ "$BOOTSTRAP_COUNT" -ne 0 ]; then
  echo "smoke-firefox: FAIL -- build log invoked 'mach bootstrap' ($BOOTSTRAP_COUNT times), which D-18 forbids" >&2
  exit 1
fi

VERSION_OUTPUT="$(nix develop "$REPO_ROOT#firefox" --command bash -c "cd '$UPSTREAM_DIR' && MOZCONFIG='$MOZCONFIG_FILE' ./mach run --version")"
if ! echo "$VERSION_OUTPUT" | grep -q '153.1.0esr'; then
  echo "smoke-firefox: FAIL -- './mach run --version' did not report 153.1.0esr" >&2
  exit 1
fi

echo "smoke-firefox: PASS"
