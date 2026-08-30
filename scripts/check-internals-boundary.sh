#!/usr/bin/env bash
# scripts/check-internals-boundary.sh
#
# D-96/D-97: SHELL-02's boundary as an executable guard, not prose. Fails if
# any file under the scanned directory imports a Firefox internal outside
# `SourcererAPI.sys.mjs` -- D-96 defines "Firefox internal" maximally:
# `Services.*`, `Cc`/`Ci`/`Cr`/`Cu`/XPCOM constructors, `AppConstants`, and
# `ChromeUtils.import`/`ChromeUtils.defineESModuleGetters` of anything
# outside `chrome://sourcerer/`. Structured exactly like
# scripts/check-patch-surface.sh (D-97's named idiom): a scan function, a
# `--self-test` planting a violating fixture in `mktemp -d`, and a default
# path scanning the real tree.
#
# Default scan target is `sourcerer/shell/` -- the directory the phase's own
# artifact manifest (04-01-PLAN.md, 04-PATTERNS.md) names as the only home
# for boundary-relevant chrome code (`sourcerer.xhtml`, `SourcererAPI.sys.mjs`,
# `TheiaService.sys.mjs`). NOT the whole `sourcerer/` tree: prior phases
# already ship `sourcerer/branding/*/pref/firefox-branding.js` (pref-list
# data, matched by the `*.js` glob but containing no forbidden pattern) --
# scanning the whole tree would make this check start non-vacuous and green
# before any shell code exists, defeating Wave 0's red-by-design requirement
# (04-01-PLAN.md must_haves: "every phase-behaviour check reads FAIL" at the
# end of Wave 0). Scoping to the directory this phase actually populates
# keeps both the non-vacuity assertion and the red-by-design signal honest.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_SCAN_DIR="$REPO_ROOT/sourcerer/shell"

# The one file exempt from every forbidden pattern below (D-96/D-97).
BOUNDARY_FILE_BASENAME="SourcererAPI.sys.mjs"

# Forbidden pattern set, D-96 verbatim. The two ChromeUtils.* entries are
# conditional (see is_conditional_pattern below); every other entry is an
# unconditional offense wherever it appears on a non-comment line.
FORBIDDEN_PATTERNS=(
  'Services.'
  'Cc['
  'Cc.'
  'Ci.'
  'Cr.'
  'Cu.'
  'Components.classes'
  'Components.interfaces'
  'AppConstants'
  'ChromeUtils.import'
  'ChromeUtils.defineESModuleGetters'
  # Privileged chrome API that is not Services/Cc/Ci-shaped and so slipped the
  # list above: sourcerer.js reached for both directly, with a comment saying
  # it did so to avoid SourcererAPI -- a real internals touch living outside
  # the one boundary file and absent from the catalogue, while this guard
  # reported PASS. That is exactly the hole SHELL-02 exists to close, so the
  # names are enumerated here rather than left to the Services. prefix.
  'nodePrincipal'
  'fixupAndLoadURIString'
)

is_conditional_pattern() {
  case "$1" in
    'ChromeUtils.import'|'ChromeUtils.defineESModuleGetters') return 0 ;;
    *) return 1 ;;
  esac
}

# True when the line's first non-whitespace characters are a JS line
# comment (`//`) or a block-comment continuation marker (`*`) -- so a
# header comment explaining this very rule (or a JSDoc continuation line)
# cannot flag itself.
is_comment_line() {
  local line="$1"
  local trimmed="${line#"${line%%[![:space:]]*}"}"
  case "$trimmed" in
    //*|'*'*) return 0 ;;
    *) return 1 ;;
  esac
}

# Scans <dir> for forbidden-pattern offenses. Prints one "path:line:
# pattern" row per offense to stderr. Returns 0 with zero offenses, 1
# otherwise -- including the non-vacuity case (empty scan set), reported
# with its own distinct message so a caller can tell "clean" from "nothing
# was scanned" (SHELL-02's empty edge, per 04-01-PLAN.md must_haves).
scan_internals_boundary() {
  local dir="$1"
  local count=0
  local -a files=()

  if [ -d "$dir" ]; then
    while IFS= read -r -d '' f; do
      files+=("$f")
    done < <(find "$dir" -type f \( -name '*.sys.mjs' -o -name '*.mjs' -o -name '*.js' -o -name '*.xhtml' \) -print0)
  fi

  local -a scanned=()
  local f base
  for f in "${files[@]}"; do
    base="$(basename -- "$f")"
    [ "$base" = "$BOUNDARY_FILE_BASENAME" ] && continue
    scanned+=("$f")
  done

  if [ "${#scanned[@]}" -eq 0 ]; then
    echo "check-internals-boundary: FAIL -- scanned file set under $dir is empty (excluding $BOUNDARY_FILE_BASENAME) -- an empty file set is not a clean boundary" >&2
    return 1
  fi

  local line_no line pattern offense
  for f in "${scanned[@]}"; do
    line_no=0
    while IFS= read -r line || [ -n "$line" ]; do
      line_no=$((line_no + 1))
      is_comment_line "$line" && continue
      for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        case "$line" in
          *"$pattern"*)
            offense=1
            if is_conditional_pattern "$pattern"; then
              case "$line" in
                *'chrome://sourcerer/'*) offense=0 ;;
              esac
            fi
            if [ "$offense" -eq 1 ]; then
              count=$((count + 1))
              echo "  $f:$line_no: $pattern" >&2
            fi
            ;;
        esac
      done
    done < "$f"
  done

  if [ "$count" -ne 0 ]; then
    echo "check-internals-boundary: FAIL -- $count forbidden-pattern offense(s) found under $dir" >&2
    return 1
  fi

  return 0
}

# --- Catalogue consistency (04-05, SHELL-02's second half) -----------------
#
# SHELL-02 has two halves: nothing outside SourcererAPI.sys.mjs imports a
# Firefox internal (the scan above), and every internal that file DOES
# import is catalogued in sourcerer/INTERNAL-APIS.md. This mode scans
# SourcererAPI.sys.mjs itself -- normally excluded above by
# BOUNDARY_FILE_BASENAME -- with the exact same FORBIDDEN_PATTERNS/
# is_conditional_pattern/is_comment_line logic, so the rule is written once
# and the catalogue is derived from the code rather than maintained beside
# it.
CATALOGUE_PATH="$REPO_ROOT/sourcerer/INTERNAL-APIS.md"
CATALOGUE_TARGET="$REPO_ROOT/sourcerer/shell/SourcererAPI.sys.mjs"

# Prints one distinct line number per output line for every forbidden-
# pattern occurrence in <file>. Two offending patterns on the same line
# (e.g. Cc[...]/Ci. on one nsITimer construction) collapse to one line
# number -- one catalogue row covers both, matching the doc's own
# "one row = one touchpoint" grain.
catalogue_occurrence_lines() {
  local file="$1"
  local line_no line pattern offense
  local -A seen=()
  line_no=0
  while IFS= read -r line || [ -n "$line" ]; do
    line_no=$((line_no + 1))
    is_comment_line "$line" && continue
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
      case "$line" in
        *"$pattern"*)
          offense=1
          if is_conditional_pattern "$pattern"; then
            case "$line" in
              *'chrome://sourcerer/'*) offense=0 ;;
            esac
          fi
          if [ "$offense" -eq 1 ] && [ -z "${seen[$line_no]:-}" ]; then
            seen[$line_no]=1
            echo "$line_no"
          fi
          ;;
      esac
    done
  done < "$file"
}

# Fails when any occurrence line in <target> has no matching
# "<basename>:<line>" row in <catalogue>, naming the uncatalogued
# file:line. <catalogue>/<target> are parameters, not the module-level
# defaults, so --self-test can point this at scratch copies without ever
# touching the real files.
check_catalogue_consistency() {
  local catalogue="$1"
  local target="$2"
  local base escaped_base
  base="$(basename -- "$target")"
  escaped_base="${base//./\\.}"

  if [ ! -f "$catalogue" ]; then
    echo "internals-catalogue: FAIL -- $catalogue does not exist" >&2
    return 1
  fi
  if [ ! -f "$target" ]; then
    echo "internals-catalogue: FAIL -- $target does not exist" >&2
    return 1
  fi

  local -a missing=()
  local line_no
  while IFS= read -r line_no; do
    if ! grep -Eq "${escaped_base}:${line_no}([^0-9]|\$)" "$catalogue"; then
      missing+=("$base:$line_no")
    fi
  done < <(catalogue_occurrence_lines "$target")

  if [ "${#missing[@]}" -ne 0 ]; then
    echo "internals-catalogue: FAIL -- ${#missing[@]} occurrence(s) with no catalogue row: ${missing[*]}" >&2
    return 1
  fi

  echo "internals-catalogue: PASS -- every forbidden-pattern occurrence in $target has a catalogue row in $catalogue"
  return 0
}

# --self-test: plants one fixture module carrying exactly one unconditional
# forbidden pattern in a mktemp -d directory (never a real repo file), and
# asserts scan_internals_boundary rejects it AND names the planted path.
# D-68 idiom: a negative assertion without a demonstrated-red control proves
# nothing. Also plants a mutated scratch copy of the real catalogue with one
# row removed and asserts check_catalogue_consistency rejects it and names
# the missing row -- never mutates the real sourcerer/INTERNAL-APIS.md.
run_self_test() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'find "$tmp" -delete' RETURN

  local overall=0

  cat > "$tmp/planted-violation.sys.mjs" <<'EOF'
// planted-violation.sys.mjs -- check-internals-boundary.sh --self-test
// fixture. One unconditional forbidden pattern below, deliberately.
export function badFunction() {
  return Services.prefs.getBoolPref("some.pref", false);
}
EOF

  if scan_internals_boundary "$tmp" >/dev/null 2>"$tmp/self-test.err"; then
    echo "check-internals-boundary: --self-test FAIL -- planted violation was NOT rejected" >&2
    cat "$tmp/self-test.err" >&2
    overall=1
  elif grep -q 'planted-violation.sys.mjs' "$tmp/self-test.err"; then
    echo "check-internals-boundary: --self-test PASS -- planted violation (planted-violation.sys.mjs, Services.) was correctly rejected"
  else
    echo "check-internals-boundary: --self-test FAIL -- rejected, but message doesn't name the planted path" >&2
    cat "$tmp/self-test.err" >&2
    overall=1
  fi

  local mutated="$tmp/INTERNAL-APIS-mutated.md"
  if [ ! -f "$CATALOGUE_PATH" ]; then
    echo "check-internals-boundary: --self-test FAIL -- $CATALOGUE_PATH does not exist, cannot run the catalogue self-test" >&2
    overall=1
  else
    # Derive the line to remove from the code, never a hardcoded number: a
    # pinned line silently stops testing anything the moment an edit above it
    # shifts the file, and the mutation degrades into a no-op that always
    # "passes". Take the first real occurrence the guard itself reports.
    local victim_line victim
    # Collect fully, then take the first line: piping into `head -1` closes the
    # pipe early and kills the producing function with SIGPIPE (exit 141).
    victim_line="$(catalogue_occurrence_lines "$CATALOGUE_TARGET")"
    victim_line="${victim_line%%$'\n'*}"
    if [ -z "$victim_line" ]; then
      echo "check-internals-boundary: --self-test FAIL -- no forbidden-pattern occurrence found in $CATALOGUE_TARGET to mutate" >&2
      return 1
    fi
    victim="$(basename -- "$CATALOGUE_TARGET"):$victim_line"

    grep -v "$victim" "$CATALOGUE_PATH" > "$mutated"
    # The mutation must actually remove something, or the test proves nothing.
    if cmp -s "$CATALOGUE_PATH" "$mutated"; then
      echo "check-internals-boundary: --self-test FAIL -- mutation removed no row for $victim; the catalogue self-test would be vacuous" >&2
      return 1
    fi
    local out
    if out="$(check_catalogue_consistency "$mutated" "$CATALOGUE_TARGET" 2>&1)"; then
      echo "check-internals-boundary: --self-test FAIL -- catalogue mutated copy with $victim's row removed was NOT rejected" >&2
      echo "$out" >&2
      overall=1
    elif echo "$out" | grep -q "$victim"; then
      echo "check-internals-boundary: --self-test PASS -- catalogue mutation (removed row for $victim) was correctly rejected"
    else
      echo "check-internals-boundary: --self-test FAIL -- catalogue mutation rejected, but message doesn't name the removed row" >&2
      echo "$out" >&2
      overall=1
    fi
  fi

  return "$overall"
}

if [ "${1:-}" = "--self-test" ]; then
  run_self_test
  exit $?
fi

if [ "${1:-}" = "--catalogue" ]; then
  check_catalogue_consistency "$CATALOGUE_PATH" "$CATALOGUE_TARGET"
  exit $?
fi

scan_internals_boundary "$DEFAULT_SCAN_DIR"
echo "check-internals-boundary: PASS -- no forbidden Firefox-internal patterns found under $DEFAULT_SCAN_DIR"
