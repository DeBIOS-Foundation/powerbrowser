#!/usr/bin/env bash
# scripts/diff-theia-core.sh
#
# Criterion 2 proof: "zero changes inside theia/node_modules/@theia/*".
# Re-runnable in Phase 3+ and in CI (D-68) -- takes no arguments beyond
# --quick, assumes only a completed `yarn install` in theia/, and never
# mutates the repo tree.
#
# Two stages, cheapest first (02-RESEARCH.md Sec 5):
#   Stage 1 (always runs): `yarn check --integrity` -- verifies every
#     installed package's on-disk content hash against yarn.lock's recorded
#     `integrity` field. Catches a manual edit inside node_modules at zero
#     install cost. Does NOT catch a hand-edited yarn.lock pointing at a
#     forged tarball -- that needs stage 2.
#   Stage 2 (authoritative, skipped under --quick): copy theia/package.json
#     and theia/yarn.lock into a fresh mktemp dir, `yarn install
#     --ignore-scripts --frozen-lockfile` there, then `diff -rq` the repo's
#     theia/node_modules/@theia against the temp tree's node_modules/@theia.
#     Cleaned up via `trap` so an interrupted run leaves nothing behind.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THEIA_DIR="$REPO_ROOT/theia"
QUICK=0

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    *)
      echo "diff-theia-core: FAIL -- unknown argument '$arg' (only --quick is accepted)" >&2
      exit 1
      ;;
  esac
done

if [ ! -d "$THEIA_DIR/node_modules/@theia" ]; then
  echo "diff-theia-core: FAIL -- $THEIA_DIR/node_modules/@theia does not exist (run yarn install in theia/ first)" >&2
  exit 1
fi

cd "$THEIA_DIR"

echo "diff-theia-core: stage 1 -- yarn check --integrity"
# --ignore-scripts must match the flag `yarn install` was run with (Phase 1's
# audited install sequence, docs/BUILD.md): yarn records install flags in
# node_modules/.yarn-integrity and `yarn check` fails with an unrelated-looking
# "Flags don't match" error if the check's own flags don't echo them back.
if ! yarn check --integrity --ignore-scripts; then
  echo "diff-theia-core: FAIL -- yarn check --integrity reported a mismatch (see output above)" >&2
  exit 1
fi

if [ "$QUICK" -eq 1 ]; then
  echo "diff-theia-core: PASS -- zero changes inside @theia/* (--quick: stage 1 only)"
  exit 0
fi

echo "diff-theia-core: stage 2 -- fresh-resolve diff"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cp "$THEIA_DIR/package.json" "$THEIA_DIR/yarn.lock" "$TMP_DIR/"
# The root manifest declares no @theia/* dependencies itself -- they are
# declared by the applications/*, extensions/* workspace members. Copying
# only the root package.json resolves nothing (proven: an empty
# node_modules/@theia). So copy each workspace member's package.json into a
# matching subdirectory too; their combined dependency graph plus the
# `resolutions` block and the committed lockfile is what actually determines
# the @theia/* versions installed at the hoisted root node_modules/.
for member_pkg in "$THEIA_DIR"/applications/*/package.json "$THEIA_DIR"/extensions/*/package.json; do
  [ -f "$member_pkg" ] || continue
  rel="${member_pkg#"$THEIA_DIR"/}"
  mkdir -p "$TMP_DIR/$(dirname "$rel")"
  cp "$member_pkg" "$TMP_DIR/$rel"
done
(
  cd "$TMP_DIR"
  yarn install --ignore-scripts --frozen-lockfile
)

if [ ! -d "$TMP_DIR/node_modules/@theia" ]; then
  echo "diff-theia-core: FAIL -- fresh resolve produced no node_modules/@theia at all" >&2
  exit 1
fi

DIFF_OUTPUT="$(diff -rq "$THEIA_DIR/node_modules/@theia" "$TMP_DIR/node_modules/@theia" || true)"
if [ -z "$DIFF_OUTPUT" ]; then
  echo "diff-theia-core: PASS -- zero changes inside @theia/*"
  exit 0
else
  echo "diff-theia-core: FAIL -- differences found inside @theia/*:" >&2
  echo "$DIFF_OUTPUT" >&2
  exit 1
fi
