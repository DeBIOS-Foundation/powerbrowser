#!/usr/bin/env bash
# D-74/D-77: the one documented command that moves the fork onto a new ESR
# tag. Composes scripts/fetch-upstream.sh (re-materialize + D-76 classifier)
# and scripts/apply-patches.sh (replay + D-75 non-vacuous per-patch
# assertion), then gates on scripts/check-patch-surface.sh before reporting
# success. It never reimplements the replay or the fail-loud behaviour --
# those live in the two composed scripts (D-74: upstream/ is fully
# disposable, patches/ is the single source of truth).
#
# The real (non-dry-run) path removes and re-clones upstream/, so per this
# plan's shared-state rule it is exercised locally only via --dry-run; its
# first real run is the CI dispatch (plan 03-06).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$REPO_ROOT/upstream"
REMOTE="https://github.com/mozilla-firefox/firefox.git"

DRY_RUN=0
NEW_TAG=""

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      NEW_TAG="${2:-}"
      shift 2 2>/dev/null || shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "rebase-upstream: FAIL -- unrecognized argument: $1" >&2
      echo "  usage: rebase-upstream.sh --tag <NEW_TAG> [--dry-run]" >&2
      exit 1
      ;;
  esac
done

if [ -z "$NEW_TAG" ]; then
  echo "rebase-upstream: FAIL -- usage: rebase-upstream.sh --tag <NEW_TAG> [--dry-run]" >&2
  exit 1
fi

# Echoed to stdout up front, on every path (success or failure): the
# requested tag drives every command this script prints or runs from here
# on, and it must never be silently substituted for the pinned default --
# see it named here even if step 1 below rejects it.
echo "rebase-upstream: target tag: $NEW_TAG"

# Step 1: verify the requested tag exists on the remote. Cheaper than
# discovering a typo after a 1.1 GB clone -- run in both real and dry-run
# modes.
if ! git ls-remote --tags "$REMOTE" "refs/tags/$NEW_TAG" | grep -q "refs/tags/$NEW_TAG"; then
  echo "rebase-upstream: FAIL -- tag $NEW_TAG does not exist on $REMOTE" >&2
  echo "  Check the exact tag name: git ls-remote --tags $REMOTE | grep $NEW_TAG" >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "rebase-upstream: --dry-run for tag $NEW_TAG"
  echo "  1. [done above] git ls-remote --tags $REMOTE refs/tags/$NEW_TAG -- confirmed present"
  echo "  2. rm -rf '$UPSTREAM_DIR' && TAG=$NEW_TAG '$REPO_ROOT/scripts/fetch-upstream.sh'"
  echo "  3. '$REPO_ROOT/scripts/apply-patches.sh'"
  echo "  4. '$REPO_ROOT/scripts/check-patch-surface.sh'"
  echo "  4b. node '$REPO_ROOT/scripts/scan-brand-residue.mjs' --except-hand-write  # D-18 permanent gate"
  echo "  5. TAG=$NEW_TAG '$REPO_ROOT/scripts/fetch-upstream.sh'  # re-check: fully-applied state at $NEW_TAG, not the pinned default"
  echo "  5b. readlink -f '$UPSTREAM_DIR/powerbrowser'  # must resolve to '$REPO_ROOT/powerbrowser' -- git-excluded, invisible to step 5's classifier otherwise"
  echo "  6. Operator follow-up (not run here): '$REPO_ROOT/scripts/toolchain-baseline.sh' under 'nix develop .#firefox', diffed against '$REPO_ROOT/toolchain-baseline.txt' (PITFALLS #2)"
  exit 0
fi

echo "rebase-upstream: removing $UPSTREAM_DIR and re-materializing at $NEW_TAG"
rm -rf "$UPSTREAM_DIR"
if ! TAG="$NEW_TAG" "$REPO_ROOT/scripts/fetch-upstream.sh"; then
  echo "rebase-upstream: FAIL -- fetch-upstream.sh could not materialize $NEW_TAG" >&2
  exit 1
fi

echo "rebase-upstream: replaying patch stack"
if ! "$REPO_ROOT/scripts/apply-patches.sh"; then
  echo "rebase-upstream: FAIL -- apply-patches.sh failed replaying patches/*.patch onto $NEW_TAG" >&2
  exit 1
fi

echo "rebase-upstream: checking patch surface"
if ! "$REPO_ROOT/scripts/check-patch-surface.sh"; then
  echo "rebase-upstream: FAIL -- check-patch-surface.sh rejected the replayed stack" >&2
  exit 1
fi

# D-18: the residual-brand scan is a PERMANENT gate from Phase 1 onward, not a
# one-shot migration check. It runs here because a rebase is the one routine
# operation that pulls in content nobody in this repo wrote, and a patch that
# replays cleanly can still reintroduce a stale brand string. Static and
# no-build, so it costs nothing next to the replay it follows.
#
# (Deliberately not spelling the old brand token in this comment: it lives in
# the scanned scope, so naming the literal here would make this file fail the
# very gate it invokes. The scan caught exactly that when this block was first
# written -- the inventory is the place that spells the tokens out.)
#
# --except-hand-write is the plan 01-03 hand-off and is REPORTED on every run,
# never silent. Drop the flag once 01-03 lands and the whole tree is clean.
echo "rebase-upstream: scanning for residual brand strings"
if ! node "$REPO_ROOT/scripts/scan-brand-residue.mjs" --except-hand-write; then
  echo "rebase-upstream: FAIL -- scan-brand-residue.mjs found residual brand strings after the replay" >&2
  exit 1
fi

echo "rebase-upstream: re-checking fully-applied state at $NEW_TAG"
if ! TAG="$NEW_TAG" "$REPO_ROOT/scripts/fetch-upstream.sh"; then
  echo "rebase-upstream: FAIL -- post-replay classifier did not report a fully-applied state at $NEW_TAG" >&2
  exit 1
fi

echo "rebase-upstream: asserting branding overlay resolves"
RESOLVED="$(readlink -f "$UPSTREAM_DIR/powerbrowser" 2>/dev/null || true)"
if [ "$RESOLVED" != "$REPO_ROOT/powerbrowser" ]; then
  echo "rebase-upstream: FAIL -- upstream/powerbrowser does not resolve to $REPO_ROOT/powerbrowser (got: ${RESOLVED:-<broken symlink>})" >&2
  echo "  The overlay path is git-excluded, so this is invisible to git status and to the classifier above --" >&2
  echo "  without this assertion a missing symlink would exit 0 here and fail later, deep in moz.build traversal." >&2
  exit 1
fi

echo "rebase-upstream: PASS -- upstream/ rebased onto $NEW_TAG, patch stack replayed and verified non-vacuous, branding overlay resolves"
echo "rebase-upstream: operator follow-up required -- run '$REPO_ROOT/scripts/toolchain-baseline.sh' under 'nix develop .#firefox' and diff its output against '$REPO_ROOT/toolchain-baseline.txt' (PITFALLS #2)"
