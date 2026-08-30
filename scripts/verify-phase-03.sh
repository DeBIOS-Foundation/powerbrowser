#!/usr/bin/env bash
# scripts/verify-phase-03.sh
#
# The single aggregator for every Phase 3 check, modelled on
# scripts/verify-phase-02.sh: set -uo pipefail (deliberately not -e -- every
# check runs even if an earlier one failed), a CHECKS list later plans
# append to rather than forking a sibling driver, and a per-check PASS/FAIL
# summary table with a non-zero exit if anything failed.
#
# `--quick` runs only the checks that need no browser launch and no built
# tree: the patch surface guard, its self-test, the apply-patches
# self-test, the fetch-upstream self-test, the allowlist schema check, the
# allowlist doc-consistency check and its self-test, the
# branding-variant-divergence self-test (synthesises its own temp files,
# never touches objdir), and the .desktop/config.status string equalities
# (BRAND-01 surface 5, duplicated here in miniature rather than invoking
# verify-branding-identity.mjs's full six-surface run, since that run's
# about-support surface launches a real browser session -- exactly what
# --quick exists to avoid). `branding-variant-divergence` itself (the
# non-self-test half) reads from both `objdir/dist/bin/...` and
# `objdir-release/dist/bin/...`, requiring a full dev AND release build
# (see "Tiered rebuild loop", Tier 3) -- it runs only in full mode, never
# under --quick. No flag runs everything, including
# verify-branding-identity.mjs and verify-endpoints.sh.
#
# verify-endpoints.sh's layers 2 and 3 background a `sourcerer` process of
# their own (with their own split trap). Every external-script check runs
# under `setsid`, exactly like scripts/verify-phase-02.sh's own SERVER_PID
# pattern: since this script is non-interactive, job control is off and a
# plain `cmd &` would share THIS script's own process group with every
# descendant, including the browser verify-endpoints.sh backgrounds two
# layers deep -- killing only the immediate child PID on interrupt would
# leave that browser (and its content processes) orphaned, reparented and
# still running, because killing a parent process does not kill its
# children. `setsid` makes the external check the leader of its own new
# process group (PGID == its own PID), so `kill -- "-$PID"` on interrupt
# reaches the whole group -- the check script itself and everything it
# spawned -- in one signal, the same idiom verify-phase-02.sh's cleanup()
# already uses for its own backgrounded dev server.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

QUICK=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    *)
      echo "verify-phase-03: FAIL -- unknown argument '$arg'" >&2
      exit 1
      ;;
  esac
done

CURRENT_CHECK_PID=""
declare -a TEMP_PATHS=()
track_temp() { TEMP_PATHS+=("$1"); }
cleanup() {
  if [ -n "$CURRENT_CHECK_PID" ]; then
    kill -- "-$CURRENT_CHECK_PID" 2>/dev/null || kill "$CURRENT_CHECK_PID" 2>/dev/null || true
    wait "$CURRENT_CHECK_PID" 2>/dev/null || true
    CURRENT_CHECK_PID=""
  fi
  # allowlist-doc-consistency-self-test's planted-mutation temp allowlist
  # copy, registered via track_temp -- removed on every exit path (EXIT and
  # INT/TERM both invoke this same cleanup()) so an interrupted self-test
  # leaves no residue and never touches the real endpoint-allowlist.json.
  for p in "${TEMP_PATHS[@]:-}"; do
    [ -n "$p" ] && rm -f "$p"
  done
  TEMP_PATHS=()
}
# EXIT alone is not enough: bash resumes the rest of the script after a
# non-EXIT trap handler returns unless that handler exits itself
# (scripts/verify-phase-02.sh lines 50-58, quoted in 03-PATTERNS.md).
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM

# --- --quick's standalone .desktop/config.status equality check ---
check_desktop_entry_quick() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const repoRoot = process.argv[1];
    const desktopPath = path.join(repoRoot, "sourcerer", "sourcerer.desktop");
    const configStatusPath = path.join(repoRoot, "objdir", "config.status");

    if (!fs.existsSync(desktopPath)) {
      console.error(`check-desktop-entry-quick: FAIL -- ${desktopPath} does not exist`);
      process.exit(1);
    }
    if (!fs.existsSync(configStatusPath)) {
      console.error(`check-desktop-entry-quick: FAIL -- ${configStatusPath} does not exist`);
      process.exit(1);
    }

    const configText = fs.readFileSync(configStatusPath, "utf8");
    function readVar(name) {
      const re = new RegExp("\x27" + name + "\x27:\\s*\x27([^\x27]*)\x27");
      const m = configText.match(re);
      return m ? m[1] : undefined;
    }
    const expectedName = readVar("MOZ_APP_DISPLAYNAME");
    const expectedWmClass = readVar("MOZ_APP_REMOTINGNAME");

    const lines = fs.readFileSync(desktopPath, "utf8").split(/\r?\n/);
    const nameLine = lines.find(l => l.startsWith("Name="));
    const wmClassLine = lines.find(l => l.startsWith("StartupWMClass="));
    const name = nameLine !== undefined ? nameLine.slice("Name=".length) : undefined;
    const wmClass = wmClassLine !== undefined ? wmClassLine.slice("StartupWMClass=".length) : undefined;

    if (expectedName && expectedWmClass && name === expectedName && wmClass === expectedWmClass) {
      console.log(`check-desktop-entry-quick: PASS -- Name=${name}, StartupWMClass=${wmClass}`);
      process.exit(0);
    }
    console.error(`check-desktop-entry-quick: FAIL -- Name=${JSON.stringify(name)} (expected ${JSON.stringify(expectedName)}), StartupWMClass=${JSON.stringify(wmClass)} (expected ${JSON.stringify(expectedWmClass)})`);
    process.exit(1);
  ' "$REPO_ROOT"
}

# --- the allowlist schema check ---
check_allowlist_schema() {
  node -e '
    const fs = require("fs");
    const allowlistPath = process.argv[1];
    if (!fs.existsSync(allowlistPath)) {
      console.error(`allowlist-schema: FAIL -- ${allowlistPath} does not exist`);
      process.exit(1);
    }
    const a = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
    if (!Array.isArray(a.hosts) || !Array.isArray(a.prefs)) {
      console.error("allowlist-schema: FAIL -- hosts/prefs are not both arrays");
      process.exit(1);
    }
    for (const h of a.hosts) {
      if (!h.host || !["allow", "deny"].includes(h.disposition) || !h.reason) {
        console.error(`allowlist-schema: FAIL -- malformed host entry: ${JSON.stringify(h)}`);
        process.exit(1);
      }
    }
    for (const p of a.prefs) {
      if (!p.name || p.expect === undefined || !p.reason) {
        console.error(`allowlist-schema: FAIL -- malformed pref entry: ${JSON.stringify(p)}`);
        process.exit(1);
      }
    }
    console.log(`allowlist-schema: PASS -- ${a.hosts.length} host(s), ${a.prefs.length} pref(s)`);
  ' "$REPO_ROOT/sourcerer/endpoint-allowlist.json"
}

# --- allowlist-to-document consistency (03-VERIFICATION.md Gap 2) ---
#
# Shared inner helper: takes an allowlist path as its one argument, always
# reads the real ROADMAP.md/REQUIREMENTS.md (the documents Task 1 amended).
# Selects every allow-dispositioned mozilla.com/mozilla.net host and requires
# a whole-token occurrence of each in both documents. Whole-token matching is
# load-bearing: a plain substring search would let a documented host's own
# suffix (e.g. "cdn.mozilla.net" inside "content-signature-2.cdn.mozilla.net")
# pass vacuously, so the regex requires the character on each side of the
# match to be absent or outside the hostname character class
# (letters/digits/dot/hyphen). An empty filtered set is a FAIL, not a vacuous
# PASS. Output (host list order, violation order) is fully determined by the
# allowlist's own on-disk order plus a sort of the violation list, so two runs
# against unchanged input are byte-identical.
_allowlist_doc_consistency_impl() {
  local allowlist_path="$1"
  node -e '
    const fs = require("fs");
    const [allowlistPath, roadmapPath, requirementsPath] = process.argv.slice(1);
    const a = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
    const roadmap = fs.readFileSync(roadmapPath, "utf8");
    const requirements = fs.readFileSync(requirementsPath, "utf8");

    const hosts = (a.hosts || [])
      .filter(h => h.disposition === "allow" && /(^|\.)mozilla\.(com|net)$/i.test(h.host))
      .map(h => h.host);

    if (hosts.length === 0) {
      console.error(`allowlist-doc-consistency: FAIL -- filter matched no allow-dispositioned mozilla.com/mozilla.net host in ${allowlistPath}`);
      process.exit(1);
    }

    function hasWholeToken(text, host) {
      const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(^|[^A-Za-z0-9.-])" + escaped + "($|[^A-Za-z0-9.-])");
      return re.test(text);
    }

    const violations = [];
    let roadmapFound = 0, requirementsFound = 0;
    for (const host of hosts) {
      const inRoadmap = hasWholeToken(roadmap, host);
      const inRequirements = hasWholeToken(requirements, host);
      if (inRoadmap) roadmapFound++;
      if (inRequirements) requirementsFound++;
      if (!inRoadmap || !inRequirements) {
        const missing = [];
        if (!inRoadmap) missing.push("ROADMAP.md");
        if (!inRequirements) missing.push("REQUIREMENTS.md");
        violations.push(`${host}: missing from ${missing.join(", ")}`);
      }
    }
    violations.sort();

    if (violations.length > 0) {
      console.error(`allowlist-doc-consistency: FAIL -- ${hosts.length} Mozilla allow host(s) checked, ${violations.length} violation(s):`);
      for (const v of violations) console.error(`  ${v}`);
      process.exit(1);
    }

    console.log(`allowlist-doc-consistency: PASS -- ${hosts.length} Mozilla allow host(s) checked, found in both ROADMAP.md (${roadmapFound}) and REQUIREMENTS.md (${requirementsFound})`);
  ' "$allowlist_path" "$REPO_ROOT/.planning/ROADMAP.md" "$REPO_ROOT/.planning/REQUIREMENTS.md"
}

# Argument-free wrapper for the CHECKS array (see the dispatch guard below --
# a function-branch CHECKS entry must be a bare name, never a command carrying
# arguments).
check_allowlist_doc_consistency() {
  _allowlist_doc_consistency_impl "$REPO_ROOT/sourcerer/endpoint-allowlist.json"
}

# Plants a temp copy of the real allowlist carrying two additional allow
# entries -- one undocumented host, one that is a proper suffix of two
# genuinely-documented hosts (proving whole-token, not substring, matching --
# a bare substring search would let this second one pass vacuously) -- and
# requires the helper to reject both. Never writes to the real allowlist; the
# temp copy is registered with track_temp so the script's own trap-covered
# cleanup() removes it on every exit path, including an interrupt mid-test.
check_allowlist_doc_consistency_self_test() {
  local real="$REPO_ROOT/sourcerer/endpoint-allowlist.json"
  local tmp
  tmp="$(mktemp)"
  track_temp "$tmp"

  node -e '
    const fs = require("fs");
    const [realPath, outPath] = process.argv.slice(1);
    const a = JSON.parse(fs.readFileSync(realPath, "utf8"));
    a.hosts.push({
      host: "sourcerer-selftest-control.cdn.mozilla.net",
      disposition: "allow",
      reason: "allowlist-doc-consistency-self-test: undocumented host, must be rejected"
    });
    a.hosts.push({
      host: "cdn.mozilla.net",
      disposition: "allow",
      reason: "allowlist-doc-consistency-self-test: proper suffix of two documented hosts, must be rejected (proves whole-token matching)"
    });
    fs.writeFileSync(outPath, JSON.stringify(a, null, 2));
  ' "$real" "$tmp"

  local out
  if out="$(_allowlist_doc_consistency_impl "$tmp" 2>&1)"; then
    echo "allowlist-doc-consistency-self-test: FAIL -- planted undocumented/suffix hosts were NOT rejected" >&2
    echo "$out" >&2
    return 1
  fi

  if echo "$out" | grep -qF 'sourcerer-selftest-control.cdn.mozilla.net' \
     && echo "$out" | grep -qE '^  cdn\.mozilla\.net:'; then
    echo "allowlist-doc-consistency-self-test: PASS -- both planted hosts (undocumented control, suffix-adjacency) correctly rejected"
    return 0
  fi

  echo "allowlist-doc-consistency-self-test: FAIL -- rejected, but output doesn't name both planted hosts" >&2
  echo "$out" >&2
  return 1
}

# --- branding-variant-divergence (03-11-PLAN.md, closes BRAND-06's gap) ---
#
# Shared inner helper: takes four path arguments -- dev brand.properties,
# release brand.properties, dev branding pref file, release branding pref
# file -- so the self-test can point it at temp files without ever touching
# the real tree. Asserts all four of: (1) dev brandFullName == "Sourcerer
# Dev", (2) release brandFullName == "Sourcerer", (3) the dev pref file sets
# browser.tabs.inTitlebar to 0 via a pref() call, (4) the release pref file
# sets no value for that same pref name. A missing/unreadable input path is
# a FAIL naming that path, never a skip.
_branding_variant_divergence_impl() {
  local dev_properties="$1"
  local release_properties="$2"
  local dev_pref="$3"
  local release_pref="$4"
  node -e '
    const fs = require("fs");
    const [devPropPath, relPropPath, devPrefPath, relPrefPath] = process.argv.slice(1);

    function readPropsFullName(path) {
      if (!fs.existsSync(path)) {
        console.error(`branding-variant-divergence: FAIL -- ${path} does not exist`);
        process.exit(1);
      }
      let text;
      try {
        text = fs.readFileSync(path, "utf8");
      } catch (err) {
        console.error(`branding-variant-divergence: FAIL -- ${path} could not be read: ${err.message}`);
        process.exit(1);
      }
      // Selection and matching both operate on the TRIMMED line -- WR-01
      // (03-REVIEW.md) already fixed this exact selection-vs-matching
      // mismatch once in scripts/verify-branding-identity.mjs; do not
      // reintroduce it here.
      const line = text.split(/\r?\n/).find(l => l.trim().startsWith("brandFullName"));
      if (!line) {
        console.error(`branding-variant-divergence: FAIL -- ${path} has no brandFullName entry`);
        process.exit(1);
      }
      const trimmed = line.trim();
      const m = trimmed.match(/^brandFullName\s*=\s*(.*)$/);
      if (!m) {
        console.error(`branding-variant-divergence: FAIL -- ${path} brandFullName line has an unexpected shape: ${JSON.stringify(line)}`);
        process.exit(1);
      }
      // .properties values are unquoted -- trim trailing whitespace only,
      // compare with exact string equality, never includes/case-insensitive.
      return m[1].trim();
    }

    function readTitlebarPref(path) {
      if (!fs.existsSync(path)) {
        console.error(`branding-variant-divergence: FAIL -- ${path} does not exist`);
        process.exit(1);
      }
      let text;
      try {
        text = fs.readFileSync(path, "utf8");
      } catch (err) {
        console.error(`branding-variant-divergence: FAIL -- ${path} could not be read: ${err.message}`);
        process.exit(1);
      }
      for (const l of text.split(/\r?\n/)) {
        const trimmed = l.trim();
        // A mention inside a `//` line comment must not satisfy this --
        // skip such lines entirely rather than regex-matching them.
        if (trimmed.startsWith("//")) continue;
        const m = trimmed.match(/pref\(\s*"browser\.tabs\.inTitlebar"\s*,\s*([^)]+?)\s*\)/);
        if (m) return m[1].trim();
      }
      return undefined; // no pref() call sets this name at all
    }

    const devValue = readPropsFullName(devPropPath);
    const relValue = readPropsFullName(relPropPath);
    const devTitlebar = readTitlebarPref(devPrefPath);
    const relTitlebar = readTitlebarPref(relPrefPath);

    const failures = [];
    if (devValue !== "Sourcerer Dev") {
      failures.push(`dev brand.properties brandFullName=${JSON.stringify(devValue)} (expected "Sourcerer Dev") at ${devPropPath}`);
    }
    if (relValue !== "Sourcerer") {
      failures.push(`release brand.properties brandFullName=${JSON.stringify(relValue)} (expected "Sourcerer") at ${relPropPath}`);
    }
    if (devTitlebar !== "0") {
      failures.push(`dev pref file browser.tabs.inTitlebar=${JSON.stringify(devTitlebar)} (expected a pref() call setting 0) at ${devPrefPath}`);
    }
    if (relTitlebar !== undefined) {
      failures.push(`release pref file sets browser.tabs.inTitlebar=${JSON.stringify(relTitlebar)} (expected no pref() call for this name) at ${relPrefPath}`);
    }

    if (failures.length > 0) {
      for (const f of failures) console.error(`branding-variant-divergence: FAIL -- ${f}`);
      process.exit(1);
    }

    console.log(`branding-variant-divergence: PASS -- dev brand.properties brandFullName=${JSON.stringify(devValue)}, release brand.properties brandFullName=${JSON.stringify(relValue)}, dev titlebar pref=${JSON.stringify(devTitlebar)}, release titlebar pref=unset`);
  ' "$dev_properties" "$release_properties" "$dev_pref" "$release_pref"
}

# Argument-free wrapper for the CHECKS array -- feeds the four INSTALLED
# paths under objdir/dist/bin and objdir-release/dist/bin (symlinks into
# sourcerer/branding/<variant>/, D-70 tier 1), proving the divergence reaches
# a built tree, not just the repo-root source.
check_branding_variant_divergence() {
  _branding_variant_divergence_impl \
    "$REPO_ROOT/objdir/dist/bin/browser/chrome/en-US/locale/branding/brand.properties" \
    "$REPO_ROOT/objdir-release/dist/bin/browser/chrome/en-US/locale/branding/brand.properties" \
    "$REPO_ROOT/objdir/dist/bin/browser/defaults/preferences/firefox-branding.js" \
    "$REPO_ROOT/objdir-release/dist/bin/browser/defaults/preferences/firefox-branding.js"
}

# Synthesises its own known-good quartet into mktemp files (registered with
# track_temp -- the script's existing trap-covered cleanup() removes them on
# every exit path), asserts the comparator goes green on it, then re-runs it
# twice more -- once with the dev suffix stripped, once with the titlebar
# default also present in the release pref file -- requiring each mutation
# to be rejected by name (D-88: a working positive control in both
# directions). Synthesising rather than copying the repo's current files
# makes this self-test's verdict independent of whether Task 2 has run yet.
check_branding_variant_divergence_self_test() {
  local dev_props rel_props dev_pref rel_pref
  dev_props="$(mktemp)"; track_temp "$dev_props"
  rel_props="$(mktemp)"; track_temp "$rel_props"
  dev_pref="$(mktemp)"; track_temp "$dev_pref"
  rel_pref="$(mktemp)"; track_temp "$rel_pref"

  printf 'brandFullName=Sourcerer Dev\n' > "$dev_props"
  printf 'brandFullName=Sourcerer\n' > "$rel_props"
  printf 'pref("browser.tabs.inTitlebar", 0);\n' > "$dev_pref"
  printf '// release: no titlebar override\n' > "$rel_pref"

  local out
  if ! out="$(_branding_variant_divergence_impl "$dev_props" "$rel_props" "$dev_pref" "$rel_pref" 2>&1)"; then
    echo "branding-variant-divergence-self-test: FAIL -- synthesised correct quartet did not go green" >&2
    echo "$out" >&2
    return 1
  fi

  # Mutation 1: strip the dev suffix.
  local dev_props_bad
  dev_props_bad="$(mktemp)"; track_temp "$dev_props_bad"
  printf 'brandFullName=Sourcerer\n' > "$dev_props_bad"
  local out1
  if out1="$(_branding_variant_divergence_impl "$dev_props_bad" "$rel_props" "$dev_pref" "$rel_pref" 2>&1)"; then
    echo "branding-variant-divergence-self-test: FAIL -- planted properties-suffix mutation was NOT rejected" >&2
    echo "$out1" >&2
    return 1
  fi
  if ! echo "$out1" | grep -qF 'brand.properties'; then
    echo "branding-variant-divergence-self-test: FAIL -- properties mutation rejected, but output doesn't name the properties divergence" >&2
    echo "$out1" >&2
    return 1
  fi

  # Mutation 2: titlebar default copied into the release pref file too.
  local rel_pref_bad
  rel_pref_bad="$(mktemp)"; track_temp "$rel_pref_bad"
  printf 'pref("browser.tabs.inTitlebar", 0);\n' > "$rel_pref_bad"
  local out2
  if out2="$(_branding_variant_divergence_impl "$dev_props" "$rel_props" "$dev_pref" "$rel_pref_bad" 2>&1)"; then
    echo "branding-variant-divergence-self-test: FAIL -- planted titlebar mutation was NOT rejected" >&2
    echo "$out2" >&2
    return 1
  fi
  if ! echo "$out2" | grep -qF 'browser.tabs.inTitlebar'; then
    echo "branding-variant-divergence-self-test: FAIL -- titlebar mutation rejected, but output doesn't name the titlebar divergence" >&2
    echo "$out2" >&2
    return 1
  fi

  echo "branding-variant-divergence-self-test: PASS -- synthesised correct quartet went green; properties-suffix mutation and titlebar mutation both went red"
  return 0
}

# Each entry: "label|command...". Later plans append here, not as a sibling
# driver script.
declare -a CHECKS=(
  "check-patch-surface|bash $REPO_ROOT/scripts/check-patch-surface.sh"
  "check-patch-surface-self-test|bash $REPO_ROOT/scripts/check-patch-surface.sh --self-test"
  "apply-patches-self-test|bash $REPO_ROOT/scripts/apply-patches.sh --self-test"
  "fetch-upstream-self-test|bash $REPO_ROOT/scripts/fetch-upstream.sh --self-test"
  "allowlist-schema|check_allowlist_schema"
  "allowlist-doc-consistency|check_allowlist_doc_consistency"
  "allowlist-doc-consistency-self-test|check_allowlist_doc_consistency_self_test"
  "branding-variant-divergence-self-test|check_branding_variant_divergence_self_test"
)

if [ "$QUICK" -eq 1 ]; then
  CHECKS+=("desktop-entry-quick|check_desktop_entry_quick")
else
  CHECKS+=(
    "branding-variant-divergence|check_branding_variant_divergence"
    "verify-branding-identity-dev|node $REPO_ROOT/scripts/verify-branding-identity.mjs"
    "verify-branding-identity-release|node $REPO_ROOT/scripts/verify-branding-identity.mjs --variant release"
    "verify-branding-identity-brand-ftl-control|node $REPO_ROOT/scripts/verify-branding-identity.mjs --variant release --positive-control brand-full-name"
    "verify-endpoints|bash $REPO_ROOT/scripts/verify-endpoints.sh"
    "verify-endpoints-interrupt-self-test|bash $REPO_ROOT/scripts/verify-endpoints.sh --interrupt-self-test"
  )
fi

FAILED=0
declare -a SUMMARY=()

for entry in "${CHECKS[@]}"; do
  label="${entry%%|*}"
  cmd="${entry#*|}"
  echo "verify-phase-03: running $label..."
  # External bash/node script invocations get their own process group via
  # setsid, so an interrupt's group-kill in cleanup() can reach whatever
  # they background (verify-endpoints.sh's own sourcerer child, two layers
  # deep). Plain function calls (allowlist-schema, desktop-entry-quick) are
  # synchronous, spawn no children of their own, and run inline -- no
  # process-group indirection needed or possible for a shell function.
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
      # Every entry that reaches this branch is a bare, argument-free shell
      # function name (WR-02: `eval "$cmd"` is the wrong tool for a
      # statically-known function name). Call it directly. A future CHECKS
      # entry that needs arguments must add a wrapper function, not smuggle
      # a command string here -- guard against that loudly rather than
      # silently mis-invoking it.
      if [[ "$cmd" == *[[:space:]]* ]]; then
        echo "verify-phase-03: FAIL -- check '$label' has a non-function-name command ('$cmd'); add a wrapper function instead" >&2
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
echo "verify-phase-03: summary"
for line in "${SUMMARY[@]}"; do
  echo "  $line"
done

if [ "$FAILED" -eq 0 ]; then
  echo "verify-phase-03: PASS -- all checks passed"
  exit 0
else
  echo "verify-phase-03: FAIL -- see summary above" >&2
  exit 1
fi
