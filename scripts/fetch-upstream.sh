#!/usr/bin/env bash
# D-04: the one documented command that materializes upstream/ from a clean
# checkout. Safely re-runnable -- if upstream/ already exists, verifies its
# HEAD is the pinned tag instead of re-cloning.
set -euo pipefail

TAG="${TAG:-FIREFOX_153_1_0esr_RELEASE}"
REMOTE="https://github.com/mozilla-firefox/firefox.git"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM_DIR="$REPO_ROOT/upstream"
PATCHES_DIR="$REPO_ROOT/patches"

# ---------------------------------------------------------------------------
# D-76 classifier. Gates on unexpected changes only: the two legal states of
# upstream/ are (1) pristine -- the pre-apply state a fresh clone is in, or
# (2) dirty in precisely the set of paths patches/*.patch touch, in both
# directions -- any unaccounted dirt (Gecko modified outside the patch stack)
# fails, and any patch whose target path is clean fails too (a patch that
# silently did not apply, the D-75 failure mode, caught a second time here).
# Shared by the real run and --self-test so the fixture exercises the exact
# logic the real tree is gated by.
# ---------------------------------------------------------------------------

# Prints the sorted, de-duplicated set of paths touched by every patch in
# $1 (a patches/ directory), read from each patch's own '+++ b/' lines.
patch_touched_paths() {
  local patches_dir="$1" p
  shopt -s nullglob
  local patch_files=("$patches_dir"/*.patch)
  shopt -u nullglob
  for p in "${patch_files[@]}"; do
    grep -E '^\+\+\+ b/' "$p" | sed 's#^+++ b/##'
  done | sort -u
}

# Classifies a git worktree's dirt against a patches/ directory.
# Args: <git_dir> <patches_dir> <label-for-messages>
# Prints PASS/FAIL context to stdout/stderr and returns 0 (legal state) or 1
# (illegal state -- unaccounted dirt and/or a missing patch).
classify_upstream_dirt() {
  local git_dir="$1" patches_dir="$2" label="$3"
  local actual expected

  # .mozbuild/ is Firefox build-tooling state (MOZBUILD_STATE_PATH, set by
  # flake.nix's firefox devShell to keep it repo-local rather than
  # ~/.mozbuild), created the first time any `./mach` command runs inside
  # upstream/ -- it is not Gecko source content, so it is excluded from
  # D-76's dirt scan the same way objdir/ is kept a sibling of upstream/
  # rather than inside it. Discovered live (04-03): a full `./mach build`
  # leaves it behind, which without this exclusion made a correct,
  # fully-patched tree read as "unaccounted dirt".
  actual="$(git -C "$git_dir" status --porcelain -- . ':!.mozbuild' 2>/dev/null | sed -E 's/^.{3}//' | sort -u)"

  if [ -z "$actual" ]; then
    echo "$label: pristine -- nothing to account for"
    return 0
  fi

  expected="$(patch_touched_paths "$patches_dir")"

  if [ "$actual" = "$expected" ]; then
    echo "$label: fully-applied -- dirt matches the patch stack exactly"
    return 0
  fi

  local ok=0
  local unaccounted
  unaccounted="$(comm -23 <(printf '%s\n' "$actual") <(printf '%s\n' "$expected") 2>/dev/null || true)"
  if [ -n "$unaccounted" ]; then
    ok=1
    echo "$label: FAIL -- $git_dir is dirty in paths no patch accounts for:" >&2
    while IFS= read -r path; do
      [ -z "$path" ] && continue
      echo "  $path" >&2
      echo "    git -C '$git_dir' checkout -- '$path'" >&2
    done <<< "$unaccounted"
  fi

  shopt -s nullglob
  local patch_files=("$patches_dir"/*.patch)
  shopt -u nullglob
  local p name touched f found
  for p in "${patch_files[@]}"; do
    name="$(basename "$p")"
    touched="$(grep -E '^\+\+\+ b/' "$p" | sed 's#^+++ b/##')"
    found=0
    for f in $touched; do
      if grep -qxF "$f" <<< "$actual"; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      ok=1
      echo "$label: FAIL -- $name's target path(s) are clean; it was not applied (or was silently dropped):" >&2
      for f in $touched; do
        echo "  $f" >&2
      done
      echo "    scripts/apply-patches.sh" >&2
    fi
  done

  [ "$ok" -eq 0 ]
}

# Idempotent: (re-)creates the branding overlay symlink and its git-exclude
# entry. Must survive `rm -rf upstream && fetch-upstream.sh` -- an absent
# symlink is invisible to `git status --porcelain` (it's excluded), so the
# classifier above would otherwise report the legal fully-applied state on a
# tree that cannot configure.
ensure_branding_overlay() {
  local git_dir="$1"
  ln -sfn ../powerbrowser "$git_dir/powerbrowser"
  local exclude_file="$git_dir/.git/info/exclude"
  if [ -f "$exclude_file" ] && ! grep -qxF '/powerbrowser' "$exclude_file"; then
    echo "/powerbrowser" >> "$exclude_file"
  elif [ ! -f "$exclude_file" ]; then
    echo "/powerbrowser" >> "$exclude_file"
  fi
}

# ---------------------------------------------------------------------------
# --self-test: exercises the classifier against a throwaway git repo, never
# the real upstream/. Exits 0 only if the pristine and fully-applied cases
# pass and the unaccounted-dirt and missing-patch cases fail with the right
# message.
# ---------------------------------------------------------------------------
run_self_test() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'find "$tmp" -delete' RETURN

  local repo="$tmp/repo" patches="$tmp/patches"
  mkdir -p "$repo" "$patches"
  git -C "$repo" init -q
  git -C "$repo" config user.email "test@example.invalid"
  git -C "$repo" config user.name "Test"
  printf 'one\ntwo\nthree\n' > "$repo/fileA"
  printf 'alpha\nbeta\n' > "$repo/fileB"
  git -C "$repo" add fileA fileB
  git -C "$repo" commit -q -m init

  # Fixture patch 1: touches fileA.
  cat > "$patches/010-a.patch" <<'EOF'
--- a/fileA
+++ b/fileA
@@ -1,3 +1,3 @@
 one
-two
+TWO
 three
EOF
  # Fixture patch 2: touches fileB.
  cat > "$patches/020-b.patch" <<'EOF'
--- a/fileB
+++ b/fileB
@@ -1,2 +1,2 @@
 alpha
-beta
+BETA
EOF

  local failures=0

  # Case 1: pristine.
  if classify_upstream_dirt "$repo" "$patches" "self-test/pristine" >/dev/null 2>&1; then
    echo "self-test: pristine PASS"
  else
    echo "self-test: pristine FAIL (expected PASS)" >&2
    failures=1
  fi

  # Case 2: fully-applied -- dirty both fileA and fileB to match the patch set.
  sed -i 's/two/TWO/' "$repo/fileA"
  sed -i 's/beta/BETA/' "$repo/fileB"
  if classify_upstream_dirt "$repo" "$patches" "self-test/fully-applied" >/dev/null 2>&1; then
    echo "self-test: fully-applied PASS"
  else
    echo "self-test: fully-applied FAIL (expected PASS)" >&2
    failures=1
  fi

  # Case 3: unaccounted dirt -- add an extra dirty file no patch touches.
  echo "extra" > "$repo/fileC"
  git -C "$repo" add fileC
  if classify_upstream_dirt "$repo" "$patches" "self-test/unaccounted-dirt" 2>"$tmp/unaccounted.err"; then
    echo "self-test: unaccounted-dirt FAIL (expected FAIL, got PASS)" >&2
    failures=1
  else
    if grep -q 'fileC' "$tmp/unaccounted.err" && grep -q 'checkout --' "$tmp/unaccounted.err"; then
      echo "self-test: unaccounted-dirt PASS (correctly rejected, names fileC + remediation)"
    else
      echo "self-test: unaccounted-dirt FAIL (rejected, but message missing fileC or remediation)" >&2
      cat "$tmp/unaccounted.err" >&2
      failures=1
    fi
  fi
  git -C "$repo" reset -q -- fileC
  rm -f "$repo/fileC"

  # Case 4: missing-patch -- revert fileB so patch 020-b's target is clean
  # while fileA stays dirty (so `actual` is non-empty, not "pristine").
  git -C "$repo" checkout -q -- fileB
  if classify_upstream_dirt "$repo" "$patches" "self-test/missing-patch" 2>"$tmp/missing.err"; then
    echo "self-test: missing-patch FAIL (expected FAIL, got PASS)" >&2
    failures=1
  else
    if grep -q '020-b.patch' "$tmp/missing.err"; then
      echo "self-test: missing-patch PASS (correctly rejected, names 020-b.patch)"
    else
      echo "self-test: missing-patch FAIL (rejected, but message doesn't name 020-b.patch)" >&2
      cat "$tmp/missing.err" >&2
      failures=1
    fi
  fi

  [ "$failures" -eq 0 ]
}

if [ "${1:-}" = "--self-test" ]; then
  run_self_test
  exit $?
fi

if [ -d "$UPSTREAM_DIR" ]; then
  # Compare commit hashes rather than `git describe --tags --exact-match`:
  # the mozilla-firefox/firefox mirror tags each ESR point release with both
  # a human-facing "_RELEASE" tag and a build-numbered "_BUILD1" tag pointing
  # at the identical commit, and `describe` breaks that tie non-deterministically
  # (observed picking BUILD1 over RELEASE on this exact commit). Resolving the
  # pinned tag's own ref and diffing commit hashes is unambiguous regardless of
  # how many other tags share that commit.
  if ! git -C "$UPSTREAM_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    echo "fetch-upstream: FAIL -- $UPSTREAM_DIR exists but is not a git checkout." >&2
    echo "  Most likely an interrupted clone. Remove it and re-run:" >&2
    echo "    rm -rf '$UPSTREAM_DIR' && '${BASH_SOURCE[0]}'" >&2
    exit 1
  fi

  HEAD_SHA="$(git -C "$UPSTREAM_DIR" rev-parse HEAD 2>/dev/null || true)"
  TAG_SHA="$(git -C "$UPSTREAM_DIR" rev-parse "refs/tags/$TAG^{commit}" 2>/dev/null || true)"

  if [ -z "$HEAD_SHA" ] || [ "$HEAD_SHA" != "$TAG_SHA" ]; then
    echo "fetch-upstream: FAIL -- upstream/ HEAD (${HEAD_SHA:-<unresolvable>}) is not $TAG (${TAG_SHA:-<tag not present>})." >&2
    echo "  Remove it and re-run to re-materialize at the pinned tag:" >&2
    echo "    rm -rf '$UPSTREAM_DIR' && '${BASH_SOURCE[0]}'" >&2
    exit 1
  fi

  # HEAD matching the tag is necessary but not sufficient: a modified working
  # tree must still be a *legitimate* modification -- either pristine, or
  # dirty in exactly the set of paths patches/*.patch touch (D-76). Anything
  # else is Gecko modified outside the patch stack, which CLAUDE.md forbids.
  if ! classify_upstream_dirt "$UPSTREAM_DIR" "$PATCHES_DIR" "fetch-upstream"; then
    exit 1
  fi

  ensure_branding_overlay "$UPSTREAM_DIR"

  echo "fetch-upstream: upstream/ already at $TAG and accounted-for clean, nothing to do"
  exit 0
fi

SECONDS=0
git clone --depth 1 --branch "$TAG" "$REMOTE" "$UPSTREAM_DIR"
ELAPSED=$SECONDS

ensure_branding_overlay "$UPSTREAM_DIR"

echo "fetch-upstream: cloned $TAG in ${ELAPSED}s"
du -sh "$UPSTREAM_DIR"
