#!/usr/bin/env bash
# D-72/D-73: the artifact/patch-surface boundary as an executable guard, not
# prose. Fails if any patches/*.patch touches a compiled-file path -- this
# phase's entire Gecko patch surface is meant to be config-only (D-74).
#
# Target paths are read from each patch's own '+++ b/' header lines, never
# grepped from the patch body -- a body-grep would false-match a string that
# merely appears inside changed content.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Compiled-suffix set, from upstream/python/mozbuild/mozbuild/frontend/emitter.py:1126-1133.
COMPILED_SUFFIXES=(.c .cc .cxx .cpp .h .hh .hpp .inc .m .mm .rs .s .S .asm .webidl .idl .ipdl .ipdlh)

is_compiled_path() {
  local path="$1" suffix base
  base="$(basename -- "$path")"
  case "$base" in
    Cargo.*) return 0 ;;
  esac
  for suffix in "${COMPILED_SUFFIXES[@]}"; do
    case "$path" in
      *"$suffix") return 0 ;;
    esac
  done
  return 1
}

# Scans a patches/ directory for compiled-suffix target paths. Prints one
# "patch: path" line per offense to stdout and returns the offense count via
# exit code semantics (0 offenses -> return 0, >0 -> return 1); the empty-
# directory case is reported explicitly by the caller, not here.
scan_patch_surface() {
  local patches_dir="$1"
  local count=0
  shopt -s nullglob
  local patch_files=("$patches_dir"/*.patch)
  shopt -u nullglob

  if [ "${#patch_files[@]}" -eq 0 ]; then
    echo "check-patch-surface: FAIL -- $patches_dir contains no *.patch files (an empty stack is not a clean surface)" >&2
    return 1
  fi

  local p name path
  for p in "${patch_files[@]}"; do
    name="$(basename "$p")"
    while IFS= read -r path; do
      [ -z "$path" ] && continue
      if is_compiled_path "$path"; then
        count=$((count + 1))
        echo "  $name touches compiled path: $path" >&2
      fi
    done < <(grep -E '^\+\+\+ b/' "$p" | sed 's#^+++ b/##')
  done

  if [ "$count" -ne 0 ]; then
    echo "check-patch-surface: FAIL -- $count compiled-file patch target(s) found" >&2
    return 1
  fi

  return 0
}

# --self-test: plants a throwaway patch whose target is a compiled path in a
# mktemp -d directory (never touches the real patches/), and asserts the scan
# rejects it. This is D-73's acceptance check 1 -- a green run alone proves
# nothing; the control is what proves the scan can go red.
run_self_test() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'find "$tmp" -delete' RETURN

  cat > "$tmp/900-bad.patch" <<'EOF'
--- a/dom/base/nsGlobalWindowInner.cpp
+++ b/dom/base/nsGlobalWindowInner.cpp
@@ -1,3 +1,3 @@
-// old
+// new
 // context
EOF

  if scan_patch_surface "$tmp" >/dev/null 2>"$tmp/self-test.err"; then
    echo "check-patch-surface: --self-test FAIL -- planted compiled-file patch was NOT rejected" >&2
    cat "$tmp/self-test.err" >&2
    return 1
  fi

  if grep -q 'nsGlobalWindowInner.cpp' "$tmp/self-test.err"; then
    echo "check-patch-surface: --self-test PASS -- planted compiled-file patch (900-bad.patch, nsGlobalWindowInner.cpp) was correctly rejected"
    return 0
  fi

  echo "check-patch-surface: --self-test FAIL -- rejected, but message doesn't name the planted path" >&2
  cat "$tmp/self-test.err" >&2
  return 1
}

if [ "${1:-}" = "--self-test" ]; then
  run_self_test
  exit $?
fi

scan_patch_surface "$REPO_ROOT/patches"
echo "check-patch-surface: PASS -- no compiled-file target paths in $(ls "$REPO_ROOT"/patches/*.patch | wc -l) patch(es)"
