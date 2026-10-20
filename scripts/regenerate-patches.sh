#!/usr/bin/env bash
# AUTO-10: "patches are regenerated, never text-edited" (CLAUDE.md) as a gate.
#
# A hunk body edited by hand without recomputing its blob hashes degrades
# `git apply --3way` into a silent no-op. --check re-derives every tracked
# patch from the applied upstream/ and byte-compares it, so a hand edit goes
# red naming the patch.
#
# The diff is taken against HEAD, not the worktree alone: apply-patches.sh's
# --3way stages its result into the index, so a worktree-only diff is empty.
# Output bytes are pinned: user/system git config off, abbrev 10, myers, no
# external diff, no textconv, no color. Never --full-index (the tracked
# patches carry 10-character abbreviations).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$REPO_ROOT/upstream"
PATCHES_DIR="$REPO_ROOT/patches"

usage() {
  echo "usage: regenerate-patches.sh --check [--upstream <dir>] [--patches <dir>]" >&2
}

fail() {
  echo "regenerate-patches: FAIL -- $1" >&2
  [ -n "${2:-}" ] && echo "  Next step: $2" >&2
  exit 1
}

# Prints the patch's own '+++ b/' target paths, in file order.
patch_paths() {
  grep -E '^\+\+\+ b/' "$1" | sed 's#^+++ b/##' || true
}

# Prints the regeneration of one tracked patch on stdout. Shared by every mode
# and by --self-test, so the fixture exercises the exact logic the real tree
# is gated by.
regenerate_one() {
  local p="$1" paths
  paths="$(patch_paths "$p")"
  # shellcheck disable=SC2086 # one path per line, none contains a space
  GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 git -C "$UPSTREAM_DIR" -c core.abbrev=10 \
    diff --no-ext-diff --no-color --no-textconv --diff-algorithm=myers --abbrev=10 HEAD -- $paths
}

# Validates the inputs every mode depends on and fills the global patch_files
# array in sorted filename order.
preflight() {
  if [ ! -d "$UPSTREAM_DIR" ] || ! git -C "$UPSTREAM_DIR" rev-parse --verify -q HEAD >/dev/null 2>&1; then
    fail "$UPSTREAM_DIR is absent or not a git checkout" \
      "bash scripts/fetch-upstream.sh && bash scripts/apply-patches.sh"
  fi

  shopt -s nullglob
  patch_files=("$PATCHES_DIR"/*.patch)
  shopt -u nullglob
  [ "${#patch_files[@]}" -gt 0 ] || fail "$PATCHES_DIR contains no *.patch files"

  local p name path
  declare -A owner=()
  for p in "${patch_files[@]}"; do
    name="$(basename "$p")"
    [ -n "$(patch_paths "$p")" ] || fail "$name has no '+++ b/' target path"
    while IFS= read -r path; do
      if [ -n "${owner[$path]:-}" ]; then
        fail "${owner[$path]} and $name both name $path; regeneration cannot split one file's hunks between two patches" \
          "move every hunk for $path into one patch"
      fi
      owner[$path]="$name"
    done < <(patch_paths "$p")
  done
}

run_check() {
  preflight
  local p name
  tmp="$(mktemp -d)" # global: the EXIT trap runs after this function's locals are gone
  trap 'rm -rf "$tmp"' EXIT
  for p in "${patch_files[@]}"; do
    name="$(basename "$p")"
    regenerate_one "$p" > "$tmp/$name"
    [ -s "$tmp/$name" ] || fail "regenerating $name produced nothing: upstream/ is pristine or unpatched" \
      "bash scripts/apply-patches.sh"
    if ! cmp -s "$tmp/$name" "$p"; then
      fail "$name differs from its regeneration from upstream/: a hunk was edited by hand, or upstream/ is not the applied pin. Next step: regenerate it with bash scripts/regenerate-patches.sh from a correctly patched upstream/."
    fi
  done
  echo "regenerate-patches: PASS -- ${#patch_files[@]} patch(es) equal their regeneration from upstream/"
}

MODE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) MODE=check; shift ;;
    --upstream) [ $# -ge 2 ] || { usage; exit 2; }; UPSTREAM_DIR="$2"; shift 2 ;;
    --patches) [ $# -ge 2 ] || { usage; exit 2; }; PATCHES_DIR="$2"; shift 2 ;;
    *) usage; exit 2 ;;
  esac
done

case "$MODE" in
  check) run_check ;;
  *) usage; exit 2 ;;
esac
