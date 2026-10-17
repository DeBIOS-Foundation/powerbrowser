#!/usr/bin/env bash
# theia-fresh-clone-build (Phase 20, PLAT-01, G-14.1.1-9): a build from a clean
# checkout passes, including `yarn build:extensions`.
#
# It clones committed HEAD into a mkdtemp dir (scripts/fresh-clone-verify.py) and
# runs there the run: value of the CI step "Install and build the Theia workspace",
# read from .github/workflows/verify.yml at check time, so this row and CI cannot
# drift. `rm -rf lib && yarn build:extensions` is no proof: under `composite`,
# `tsc -b` trusts tsconfig.tsbuildinfo (outside lib/) and reports "up to date" over
# an empty lib/. A fresh clone has neither. The main checkout is never cleaned.
#
#   (default)          the row: FAIL on a TMPDIR with a space, FAIL on a missing
#                      step, PASS only on "fresh-clone-verify: ok".
#   --workflow FILE    read the step from FILE instead of verify.yml.
#   --self-test        cheap plants (TMPDIR space, step removed), then one clone:
#                      the CI build must be green, then --plant-in-clone.
#   --plant-in-clone   ONLY inside a fresh-clone-verify clone: P1-P3 each make
#                      `yarn build` fail naming its specifier. Rewrites tracked
#                      files and cleans every lib/, so it refuses (exit 3) anywhere
#                      else; files are restored from saved bytes, never by git.
set -u

NAME="theia-fresh-clone-build"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
SELF="$REPO_ROOT/scripts/verify-theia-fresh-clone-build.sh"
STEP="Install and build the Theia workspace"
WORKFLOW="$REPO_ROOT/.github/workflows/verify.yml"
MODE=default

while [ $# -gt 0 ]; do
  case "$1" in
    --workflow) WORKFLOW="${2:-}"; shift 2 ;;
    --self-test) MODE=self-test; shift ;;
    --plant-in-clone) MODE=plant; shift ;;
    *) echo "$NAME: FAIL -- unknown argument: $1"; exit 2 ;;
  esac
done

# The run: value on the line after `- name: $STEP`; empty when the step is missing
# or its run: is not a single-line plain value (a `|` / `>` block is refused).
extract_cmd() {
  awk -v step="$STEP" '
    found { if (match($0, /^[ \t]*run:[ \t]*/)) { v = substr($0, RLENGTH + 1); if (v != "|" && v != ">" && v != "") print v } exit }
    { line = $0; sub(/^[ \t]*-[ \t]+name:[ \t]*/, "", line); if (line != $0 && line == step) found = 1 }
  ' "$1" 2>/dev/null
}

run_default() {
  case "${TMPDIR:-/tmp}" in
    *" "*) echo "$NAME: FAIL -- TMPDIR contains a space (${TMPDIR}); nix's NIX_LDFLAGS splits on it (hard rule 4)"; return 1 ;;
  esac
  local cmd
  cmd="$(extract_cmd "$WORKFLOW")"
  if [ -z "$cmd" ]; then
    echo "$NAME: FAIL -- broken instrument: verify.yml has no single-line run: for \"$STEP\" ($WORKFLOW)"
    return 1
  fi
  local head out last start
  head="$(git -C "$REPO_ROOT" rev-parse HEAD)" || { echo "$NAME: FAIL -- cannot read HEAD"; return 1; }
  start=$SECONDS
  out="$(python3 "$REPO_ROOT/scripts/fresh-clone-verify.py" --repo "$REPO_ROOT" --commit "$head" --timeout 1800 --cmd "$cmd" 2>&1)"
  printf '%s\n' "$out"
  last="$(printf '%s\n' "$out" | tail -n 1)"
  if [ "$last" = "fresh-clone-verify: ok" ]; then
    echo "$NAME: PASS -- fresh clone of ${head:0:7} ran the CI install-and-build step (frozen install, drivelist, yarn build) in $((SECONDS - start))s"
    return 0
  fi
  echo "$NAME: FAIL -- fresh clone of ${head:0:7}: $last"
  return 1
}

# plant <n> <file> <old> <new> <expected text>: replace exactly one <old>, clean
# every extension, `yarn build` must fail naming <expected>, then restore bytes.
plant() {
  local n="$1" file="$2" old="$3" new="$4" want="$5" saved out rc
  saved="$(mktemp)"
  cp -p "$file" "$saved"
  if ! python3 - "$file" "$old" "$new" <<'PY'
import sys
path, old, new = sys.argv[1:]
text = open(path, encoding="utf-8").read()
if text.count(old) != 1:
    sys.exit(1)
open(path, "w", encoding="utf-8").write(text.replace(old, new))
PY
  then
    rm -f "$saved"; echo "plant P$n: FAIL -- anchor drifted in $file"; return 1
  fi
  if cmp -s "$file" "$saved"; then
    cp -p "$saved" "$file"; rm -f "$saved"; echo "plant P$n: FAIL -- anchor drifted in $file (text unchanged)"; return 1
  fi
  out="$(nix develop .#theia --command bash -c 'cd theia && for d in extensions/*/; do yarn --silent --cwd "$d" clean || exit 1; done && yarn build' 2>&1)"
  rc=$?
  cp -p "$saved" "$file"; rm -f "$saved"
  if [ "$rc" -eq 0 ]; then
    printf '%s\n' "$out" | tail -n 20
    echo "plant P$n: FAIL -- yarn build PASSED with the plant in $file (finding: the row cannot see this fault)"
    return 1
  fi
  if ! printf '%s\n' "$out" | grep -qF -- "$want"; then
    printf '%s\n' "$out" | tail -n 40
    echo "plant P$n: FAIL -- yarn build failed (exit $rc) but did not name $want"
    return 1
  fi
  echo "plant P$n: red naming $want"
}

run_plant() {
  local here tmp
  here="$(pwd -P)"
  tmp="$(cd "${TMPDIR:-/tmp}" 2>/dev/null && pwd -P)" || tmp=/nonexistent
  case "$here" in
    "$tmp"/fresh-clone-verify-*/clone) ;;
    *) echo "$NAME-self-test: REFUSED -- --plant-in-clone runs only at the root of a fresh-clone-verify clone under $tmp, not in $here"; return 3 ;;
  esac
  if [ "$REPO_ROOT" != "$here" ]; then
    echo "$NAME-self-test: REFUSED -- this script ($REPO_ROOT) is not the clone's own copy ($here)"; return 3
  fi
  plant 1 theia/package.json \
    'extensions/token-gate build && yarn --cwd extensions/tab-uris build' \
    'extensions/tab-uris build && yarn --cwd extensions/token-gate build' \
    '@powerbrowser/token-gate/lib/node/powerbrowser-env' || return 1
  plant 2 theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts \
    "import { injectable, inject } from '@theia/core/shared/inversify';" \
    "import { } from '@powerbrowser/tab-uris/lib/browser/browser-tab-uri';
import { injectable, inject } from '@theia/core/shared/inversify';" \
    '@powerbrowser/tab-uris/lib/browser/browser-tab-uri' || return 1
  plant 3 theia/extensions/tab-uris/src/browser/web-tab.ts \
    "'../../src/browser/web-tab.css'" \
    "'./web-tab.css'" \
    'web-tab.css' || return 1
  echo "$NAME-self-test: in-clone PASS -- baseline green, 3 plants red"
}

run_self_test() {
  local tag="$NAME-self-test" sp out wf cmd last
  # Cheap plant 1: a TMPDIR with a space must FAIL naming the space, before any clone.
  sp="$(mktemp -d "${TMPDIR:-/tmp}/pb fresh clone XXXXXX")" || { echo "$tag: FAIL -- cannot make a spaced TMPDIR"; return 1; }
  out="$(TMPDIR="$sp" bash "$SELF" 2>&1)"; rc=$?
  rmdir "$sp"
  if [ "$rc" -eq 0 ] || ! printf '%s\n' "$out" | grep -qF "$NAME: FAIL -- TMPDIR contains a space"; then
    printf '%s\n' "$out"; echo "$tag: FAIL -- a TMPDIR with a space did not go red"; return 1
  fi
  echo "plant TMPDIR-space: red"
  # Cheap plant 2: verify.yml without the step must give the broken-instrument FAIL.
  wf="$(mktemp)"
  awk -v step="$STEP" '{ l = $0; sub(/^[ \t]*-[ \t]+name:[ \t]*/, "", l); if (l != $0 && l == step) { getline; next } print }' "$WORKFLOW" > "$wf"
  out="$(bash "$SELF" --workflow "$wf" 2>&1)"; rc=$?
  rm -f "$wf"
  if [ "$rc" -eq 0 ] || ! printf '%s\n' "$out" | grep -qF "$NAME: FAIL -- broken instrument"; then
    printf '%s\n' "$out"; echo "$tag: FAIL -- a verify.yml without the step did not go red"; return 1
  fi
  echo "plant step-removed: red"
  # One clone: the CI build (baseline, must be green), then P1-P3 in the clone.
  cmd="$(extract_cmd "$WORKFLOW")"
  [ -n "$cmd" ] || { echo "$tag: FAIL -- broken instrument: no run: for \"$STEP\""; return 1; }
  out="$(python3 "$REPO_ROOT/scripts/fresh-clone-verify.py" --repo "$REPO_ROOT" --commit "$(git -C "$REPO_ROOT" rev-parse HEAD)" --timeout 3600 \
    --cmd "$cmd && bash scripts/verify-theia-fresh-clone-build.sh --plant-in-clone" 2>&1)"
  printf '%s\n' "$out"
  last="$(printf '%s\n' "$out" | tail -n 1)"
  if [ "$last" != "fresh-clone-verify: ok" ] || ! printf '%s\n' "$out" | grep -qx "$NAME-self-test: in-clone PASS -- baseline green, 3 plants red"; then
    echo "$tag: FAIL -- in-clone run: $last"; return 1
  fi
  echo "$tag: PASS -- TMPDIR and workflow guards red; baseline green; P1, P2, P3 red"
}

case "$MODE" in
  default) run_default ;;
  self-test) run_self_test ;;
  plant) run_plant ;;
esac
