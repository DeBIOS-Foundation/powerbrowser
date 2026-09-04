# Phase 1: Platform Extraction and Rename - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 7 net-new files/surfaces + 1 bulk-migration class (~124 tracked files)
**Analogs found:** 7 / 7 net-new (all analogs live OUTSIDE this repo, in `/home/chris/coding/sourcerer` @ `bce68bb468e4dc160da8c9e238e030a400b806f8`)

**Repo state:** Power-Browser is greenfield — `git ls-files` in this repo contains only `.planning/`. Every analog path below is an absolute path into the frozen sourcerer tree. Read them there.

---

## The two classes of file in this phase

**Class A — migrated files (~124 tracked files).** Their "analog" is *themselves*. The pattern is: copy verbatim, then apply the inventory-driven rename. No new pattern is being invented, and D-06 forbids restructuring during the rename. The planner does not need per-file pattern excerpts for these; it needs the rename staging order. They are not enumerated individually below.

**Class B — net-new files (7).** These have no self-analog. Each is mapped below to the closest existing file in the sourcerer tree that serves the same role and data flow.

---

## File Classification

| New file | Role | Data Flow | Closest Analog (absolute path) | Match Quality |
|---|---|---|---|---|
| `inventory/brand-tokens.json` | config / committed data | batch (script input) | `/home/chris/coding/sourcerer/sourcerer/endpoint-allowlist.json` | exact — same shape of contract (one committed JSON read by a verifier script as its only source of truth) |
| `scripts/scan-brand-residue.mjs` | test / static guard | batch scan over `git ls-files` | `/home/chris/coding/sourcerer/scripts/check-internals-boundary.sh` | exact — grep-class static scan, no build, self-test, non-vacuity assertion |
| `scripts/rename-brand.mjs` | utility (one-shot, rerunnable) | transform (file-I/O) | `/home/chris/coding/sourcerer/scripts/check-internals-boundary.sh` (scan half) + `/home/chris/coding/sourcerer/scripts/verify-branding.mjs` (Node CLI shape) | role-match — **no rename/codemod script exists anywhere in sourcerer.** This is genuinely new logic. |
| `scripts/verify-platform.sh` (D-21) | test / aggregator | request-response (per-check) | `/home/chris/coding/sourcerer/scripts/verify-phase-05.sh` | exact — this file IS the thing being consolidated |
| GUI-01: CLH extension in `powerbrowser/shell/PowerBrowserAPI.sys.mjs` | service / XPCOM component | event-driven (command line) | `/home/chris/coding/sourcerer/sourcerer/shell/SourcererAPI.sys.mjs:471-526` | exact — same class, being extended in place |
| GUI-02: `theia/extensions/tab-uris/src/browser/web-open-handler.ts` | provider (Theia `OpenHandler`) | request-response (URI → widget) | `/home/chris/coding/sourcerer/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:139-184` (`SourcererWebviewOpenHandler`) | exact — identical `getOrCreateWidget` + shell-attach shape |
| D-11 placeholder mark (SVG + 5 PNGs) | asset + TS constant | file-I/O | `/home/chris/coding/sourcerer/theia/extensions/branding/src/browser/sourcerer-mark.ts` | exact — inline SVG string + data URI export |

---

## Pattern Assignments

### `inventory/brand-tokens.json` (D-15) — committed data file

**Analog:** `/home/chris/coding/sourcerer/sourcerer/endpoint-allowlist.json`

The pattern worth copying is not the schema, it is the **`$comment` header that states the file's contract, its consumers, and its fail-closed rule**, and the rule that absence is a failure rather than silence. Lines 1-2:

```json
{
  "$comment": "BRAND-04 (D-83..D-88): the single machine-readable source of truth for every endpoint this build is allowed to contact ... Read directly by scripts/verify-endpoints.sh layers 1 and 3. D-85: any host observed at runtime that is absent from `hosts` ... is a FAILURE ... A host or pref absent from this file fails the check rather than being silently ignored.",
  "hosts": [
    {
      "host": "firefox.settings.services.mozilla.com",
      "disposition": "allow",
      "reason": "D-83: Remote Settings. services/settings/Utils.sys.mjs:52-84 refuses ..."
    },
```

**Copy these three properties exactly:**
1. `$comment` naming both consumers (per D-15: the rename script AND the residual scan) and the fail-closed rule.
2. Every row carries a **`reason`** field citing file:line evidence — not a bare token list. Applied here: every `frozen`/`coincidental` classification must carry its D-08 / Pitfall-4 justification inline.
3. The consumer reads it by a single module-level constant path — `/home/chris/coding/sourcerer/scripts/verify-endpoints.sh:48`:
```bash
ALLOWLIST="$REPO_ROOT/sourcerer/endpoint-allowlist.json"
```

**Per-row fields required by the research ground truth** (not present in the analog, add them): `token`, `case_form`, `class` (brand-identifier / brand-display / identity / frozen / coincidental), `target`, `expected_count`, `expected_files[]`, `couples_with[]` (Pitfall 2), and per-site overrides for the ambiguous TitleCase form (Pitfall 1).

---

### `scripts/scan-brand-residue.mjs` (D-16) — static residual scan

**Analog:** `/home/chris/coding/sourcerer/scripts/check-internals-boundary.sh`

This file is explicitly described in its own header as an instance of a **named in-tree idiom** — copy the idiom, not the language. Lines 1-12:

```bash
#!/usr/bin/env bash
# scripts/check-internals-boundary.sh
#
# D-96/D-97: SHELL-02's boundary as an executable guard, not prose. Fails if
# ... Structured exactly like
# scripts/check-patch-surface.sh (D-97's named idiom): a scan function, a
# `--self-test` planting a violating fixture in `mktemp -d`, and a default
# path scanning the real tree.
```

**Idiom = three parts. All three are mandatory here.**

**1. The non-vacuity assertion — an empty scan set is a FAIL, with its own distinct message** (lines 102-105). This is D-17's "a nonzero exit alone is insufficient" already implemented:
```bash
  if [ "${#scanned[@]}" -eq 0 ]; then
    echo "check-internals-boundary: FAIL -- scanned file set under $dir is empty (excluding $BOUNDARY_FILE_BASENAME) -- an empty file set is not a clean boundary" >&2
    return 1
  fi
```

**2. Offense reporting names path:line:token, one row per offense** (lines 122-135) — this is exactly D-17's "the report must show *where* each token was found":
```bash
            if [ "$offense" -eq 1 ]; then
              count=$((count + 1))
              echo "  $f:$line_no: $pattern" >&2
            fi
  ...
  if [ "$count" -ne 0 ]; then
    echo "check-internals-boundary: FAIL -- $count forbidden-pattern offense(s) found under $dir" >&2
    return 1
  fi
```

**3. `--self-test` plants a fixture in `mktemp -d`, never a real repo file, and asserts the guard both rejects it AND names it** (lines 230-255):
```bash
run_self_test() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'find "$tmp" -delete' RETURN
  cat > "$tmp/planted-violation.sys.mjs" <<'EOF'
export function badFunction() {
  return Services.prefs.getBoolPref("some.pref", false);
}
EOF
  if scan_internals_boundary "$tmp" >/dev/null 2>"$tmp/self-test.err"; then
    echo "check-internals-boundary: --self-test FAIL -- planted violation was NOT rejected" >&2
    overall=1
  elif grep -q 'planted-violation.sys.mjs' "$tmp/self-test.err"; then
    echo "check-internals-boundary: --self-test PASS -- planted violation ... was correctly rejected"
  else
    echo "check-internals-boundary: --self-test FAIL -- rejected, but message doesn't name the planted path" >&2
```

**4. The self-test derives its victim from the code, never a hardcoded line number** (lines 264-282) — directly applicable to reconciling counts against the inventory:
```bash
    # Derive the line to remove from the code, never a hardcoded number: a
    # pinned line silently stops testing anything the moment an edit above it
    # shifts the file, and the mutation degrades into a no-op that always
    # "passes".
    ...
    # The mutation must actually remove something, or the test proves nothing.
    if cmp -s "$CATALOGUE_PATH" "$mutated"; then
      echo "... mutation removed no row for $victim; the catalogue self-test would be vacuous" >&2
```

**5. Argument dispatch at the bottom, default = scan the real tree** (lines 300-311):
```bash
if [ "${1:-}" = "--self-test" ]; then
  run_self_test; exit $?
fi
if [ "${1:-}" = "--catalogue" ]; then
  check_catalogue_consistency "$CATALOGUE_PATH" "$CATALOGUE_TARGET"; exit $?
fi
scan_internals_boundary "$DEFAULT_SCAN_DIR"
echo "check-internals-boundary: PASS -- no forbidden Firefox-internal patterns found under $DEFAULT_SCAN_DIR"
```

**Deviation required:** RESEARCH.md rules out shell (Alternatives Considered) — write this in Node, using `execFileSync('git', ['ls-files'])` for scope per RESEARCH.md's Code Examples sketch. Port the idiom's structure, not the bash.

---

### `scripts/rename-brand.mjs` (D-05) — the rename executor

**No analog exists.** Sourcerer contains no codemod, no rename script, no sed-driver. This is the one genuinely net-new tooling file with no in-tree precedent, and the planner must not pretend otherwise.

Take from two places:

**Node CLI header convention** — `/home/chris/coding/sourcerer/scripts/verify-branding.mjs:1-35`. Note the pattern of a long header that documents *why the naive approach was rejected* and names the pinning risk:
```js
#!/usr/bin/env node
// scripts/verify-branding.mjs
//
// Headless proof that `@sourcerer/branding` is loaded by the running app ...
// -- Reflection note (same root cause as verify-uri-roundtrip.mjs's ...) --
// ... Pinned against inversify 6.2.2 (theia/node_modules/inversify); a future
// inversify bump renaming `_bindingDictionary` breaks this file first, not
// the feature it tests.
//
// Usage: node scripts/verify-branding.mjs [url]   (default http://localhost:3000)
//
// Later plans extend this same file rather than adding sibling scripts.
```

**Gate-on-unclassified behaviour** — the shape to copy is `check_catalogue_consistency`'s "every occurrence must have a row or FAIL, naming the missing rows" (`check-internals-boundary.sh:206-220`):
```bash
  local -a missing=()
  while IFS= read -r line_no; do
    if ! grep -Eq "${escaped_base}:${line_no}([^0-9]|\$)" "$catalogue"; then
      missing+=("$base:$line_no")
    fi
  done < <(catalogue_occurrence_lines "$target")
  if [ "${#missing[@]}" -ne 0 ]; then
    echo "internals-catalogue: FAIL -- ${#missing[@]} occurrence(s) with no catalogue row: ${missing[*]}" >&2
    return 1
  fi
```
Applied: **refuse to run while any inventoried occurrence is unclassified** (RESEARCH Pattern 3). The classification file is the gate, not documentation.

**Hard exclusions the script must not touch** (hand-write these instead, per Pitfall 1 and Pitfall 4): both `.desktop` files, and the six display surfaces (`brand.ftl` ×2, `brand.properties` ×2, `configure.sh` ×2, `package.json` `applicationName`).

---

### `scripts/verify-platform.sh` (D-21) — consolidated verifier driver

**Analog:** `/home/chris/coding/sourcerer/scripts/verify-phase-05.sh`

Port the driver skeleton and the assertions from all four `verify-phase-0{2,3,4,5}.sh`; drop the four per-phase shells.

**Header conventions and the deliberate `set` line** (lines 1-29):
```bash
#!/usr/bin/env bash
# scripts/verify-phase-05.sh
#
# The single aggregator for every Phase 5 check ... : unofficial-mode error
# handling (deliberately no `-e`, only `-u` and `pipefail` -- every check runs
# even if an earlier one failed), a CHECKS array later tasks append to rather
# than forking a sibling driver, and a per-check PASS/FAIL summary table with
# a non-zero exit if anything failed. One verification script per phase,
# extended never sibling'd.
#
# `--quick` runs only checks needing no browser launch and no built tree.
# `--only <label>` runs exactly one named check and nothing else ...
#
# Every external script invocation runs under `setsid` ... a plain `cmd &`
# would share this script's own process group with every descendant ...
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
```

**The CHECKS registry — the exact mechanism D-21's consolidation needs** (lines 1858-1888):
```bash
run_own_checks() {
  # Each entry: "label|command...". Later tasks append here, never as a
  # sibling driver script.
  local -a CHECKS=(
    "shell-csp-inline-attrs|check_shell_csp_inline_attrs"
    "shell04-log-redacts-token|check_shell04_log_redacts_token"
  )
  if [ "$QUICK" -eq 0 ]; then
    CHECKS+=(
      "side04-sigkill-no-orphan|check_side04_sigkill_no_orphan"
      ...
    )
  fi
```

**Per-check failure messages name the requirement ID and why a clean result would prove nothing** (lines 1837-1845) — copy this discipline verbatim:
```bash
  if [ -z "$kids" ]; then
    echo "side04-token-not-in-environment: FAIL -- SIDE-04 -- backend pid $backend_pid had no children at all; nothing was scanned, so a clean result would prove nothing" >&2
```

`--quick` / `--only <label>` / `--gate` argument parsing is at lines 33-52; reuse it as-is. Register the D-18 residual scan as a `--quick` check (needs no build).

---

### GUI-01: extend the command-line handler in `powerbrowser/shell/PowerBrowserAPI.sys.mjs`

**Analog:** `/home/chris/coding/sourcerer/sourcerer/shell/SourcererAPI.sys.mjs:471-526` — the same class, edited in place.

**Existing window lookup** (lines 471-484). Note the window type string is a brand token coupled to `sourcerer.xhtml`'s root `windowtype` attribute:
```js
  /**
   * D-121/D-122: finds the shell's own already-open window, by the window
   * type `sourcerer.xhtml`'s root element declares (`windowtype`). Returns
   * `null` (never throws) when none exists -- the first-launch case, where
   * the single-instance handler below must do nothing at all.
   */
  findShellWindow() {
    return Services.wm.getMostRecentWindow("sourcerer:main");
  },

  /** Focuses an already-found shell window. */
  focusWindow(win) {
    win.focus();
  },
```

**The handler as it stands** (lines 509-526) — the current behaviour is "do nothing on first launch"; GUI-01's change is to add the `STATE_INITIAL_LAUNCH` branch:
```js
export class SourcererSingleInstanceHandler {
  QueryInterface = ChromeUtils.generateQI([Ci.nsICommandLineHandler]);

  helpInfo = "";

  handle(cmdLine) {
    try {
      const win = SourcererAPI.findShellWindow();
      if (!win) {
        return;
      }
      SourcererAPI.focusWindow(win);
      cmdLine.preventDefault = true;
    } catch (err) {
      SourcererAPI.log("error", `[SourcererSingleInstanceHandler] ${err}`);
    }
  }
}
```

**Two load-bearing constraints from the analog's own doc comment (lines 487-508) — carry them forward:**
- This class lives in `PowerBrowserAPI.sys.mjs` and nowhere else, because `Ci.`/`ChromeUtils.generateQI` are patterns `check-internals-boundary.sh` forbids in every other file under `powerbrowser/shell/` (D-96/D-97). A new sibling module for GUI-01 would fail the boundary guard.
- `handle()` catches and logs; a thrown error would break the platform's handler enumeration for every handler after this one.

**Target shape** is RESEARCH.md's `PowerBrowserSingleInstanceHandler` (01-RESEARCH.md:558-578). Per D-20 this is spike-gated: the spike must confirm the five `BROWSER_CHROME_URL` call sites before the implementation task commits.

---

### GUI-02: `theia/extensions/tab-uris/src/browser/web-open-handler.ts`

**Analog:** `/home/chris/coding/sourcerer/theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts:139-184` (`SourcererWebviewOpenHandler`) — closest by data flow (URI → `getOrCreateWidget` → attach → activate). Secondary: `terminal-open-handler.ts` (whole file, 76 lines) for the bare-`OpenHandler`-not-`WidgetOpenHandler` rationale.

**Core pattern — copy this structure exactly** (`existing-scheme-coverage.ts:139-176`):
```ts
@injectable()
export class SourcererWebviewOpenHandler implements OpenHandler {

    readonly id = 'sourcerer.webview-uri-open-handler';

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    canHandle(uri: URI): number {
        return uri.scheme === 'webview' ? 1000 : 0;
    }

    async open(uri: URI): Promise<WebviewWidget> {
        const widget = ... await this.widgetManager.getOrCreateWidget<WebviewWidget>(WebviewWidget.FACTORY_ID, identifier);
        if (!widget) { throw new Error(`sourcerer.webview-uri-open-handler: no open webview panel with id '${identifier.id}' -- ...`); }
        if (!widget.isAttached) {
            this.shell.addWidget(widget, { area: 'main' });
        }
        await this.shell.activateWidget(widget.id);
        return widget;
    }
}
```

**Conventions to copy:**
- `readonly id = '<scope>.<scheme>-uri-open-handler'` → `'powerbrowser.web-uri-open-handler'`.
- `canHandle` returns **1000 or 0, synchronously, on scheme alone** — stated as a rule at `terminal-open-handler.ts:40-44` ("same D-45 rule as ViewUriOpenHandler").
- Property injection (`@inject`), never constructor injection.
- Errors thrown from `open()` are prefixed with the handler id and tell the user what to do instead.

**Binding — `tab-uris-frontend-module.ts:74-80`.** Two-line static bind, plus a comment naming the D-50 caching hazard (`tab-uris-frontend-module.ts:31-36`):
```ts
    // Registered as a static open-handler binding at module load -- the
    // ordinary path, reached by `DefaultOpenerService`'s
    // `ContributionProvider<OpenHandler>` before its first `getContributions()`
    // call caches. `registerLateOpenHandler` above is the escape hatch ...
    bind(SourcererWebviewOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(SourcererWebviewOpenHandler);
```

**Carve-out entry — mandatory, per RESEARCH Finding 2.** Append a fifth frozen entry to `CARVE_OUTS` (`existing-scheme-coverage.ts:194-220`), matching this exact shape and tone (documented degradation, never engineered around):
```ts
export const CARVE_OUTS: ReadonlyArray<{ readonly name: string, readonly reason: string }> = Object.freeze([
    {
        name: 'output',
        reason: "@theia/output's widget is a singleton whose content swaps per channel -- output:A and output:B resolve to the same tab (factory id 'outputView').",
    },
    ...
]);
```
New entry: `name: 'http/https'`, reason naming `X-Frame-Options`/`frame-ancestors`. The header comment (lines 186-191) states why this array exists — `docs/URI-SCHEMES.md` and `scripts/verify-uri-roundtrip.mjs` are checked against **identical wording rather than drifting copies**. So the same wording goes into `docs/URI-SCHEMES.md`.

**Dependency addition** — `theia/extensions/tab-uris/package.json` (whole file, 29 lines) is the analog. Add `"@theia/mini-browser": "1.74.1"` to `dependencies`, alongside the eight already pinned at `1.74.1`, and to `theia/package.json`'s `resolutions`. **D-22: `checkpoint:human-verify` before the install.** A2 in the assumptions log also requires reading the installed package's source before writing `MiniBrowser.FACTORY_ID`.

---

### D-11 placeholder mark

**Analog:** `/home/chris/coding/sourcerer/theia/extensions/branding/src/browser/sourcerer-mark.ts` (whole file, 15 lines).

Two exports and a header explaining every design choice, including the dark-mode handling that must be reproduced:
```ts
export const SOURCERER_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99 85.9"><defs><style>.a{fill:#1a1a1a;}@media (prefers-color-scheme: dark){.a{fill:#fff;}}</style></defs>...</svg>`;

export const SOURCERER_MARK_DATA_URI = `data:image/svg+xml,${encodeURIComponent(SOURCERER_MARK_SVG)}`;
```
The header records the rationale: a single-fill SVG is invisible against a light tab strip, so the `<defs><style>` block carries a dark default plus a `prefers-color-scheme: dark` override, and `#1a1a1a` is "a neutral dark, not a chosen brand colour." The placeholder mark must carry the same two-value fill pattern.

**Binary counterparts:** `/home/chris/coding/sourcerer/sourcerer/branding/{dev,release}/default{16,32,48,64,128}.png` — ten files that keep their names and get new content.

---

## Shared Patterns

### Hand-written display literals (Pitfall 1 — the phase's central hazard)

**Sources:**
- `/home/chris/coding/sourcerer/sourcerer/branding/dev/locales/en-US/brand.ftl` (whole file, 15 lines)
- `/home/chris/coding/sourcerer/sourcerer/branding/dev/configure.sh` (whole file, 5 lines)

**Apply to:** all six display surfaces. These are excluded from the rename script and written by hand.

```
-brand-shorter-name = Sourcerer
-brand-short-name = Sourcerer
-brand-shortcut-name = Sourcerer
-brand-full-name = Sourcerer Dev
# This brand name can be used in messages where the product name needs to
# remain unchanged across different versions (Nightly, Beta, etc.). Kept at
# Firefox (not Sourcerer) per D-78: a small set of "requires Firefox"
# compatibility strings interpolate this term, and byte-identical UA/product
# naming is the same rationale D-78 already applied to the User-Agent.
-brand-product-name = Firefox
-vendor-short-name = Deocracy
trademarkInfo = { " " }
```
```sh
MOZ_APP_DISPLAYNAME="Sourcerer Dev"
```

**Targets:** `Power Browser` / `Power Browser Dev` (with the space). `-brand-product-name = Firefox` is **frozen** (D-78 — the comment migrates verbatim per D-08). `-vendor-short-name` → `DeBIOS Foundation` (display side, D-09 amended), while `MOZ_APP_VENDOR` → `DeBIOS` (path-forming side). The residual scan must treat these as two distinct expected values.

### `.desktop` files — hand-write, never script

**Source:** `/home/chris/coding/sourcerer/sourcerer/sourcerer.desktop` (whole file, 9 lines)
**Apply to:** both `powerbrowser/powerbrowser.desktop` and `powerbrowser/powerbrowser-release.desktop`

```ini
[Desktop Entry]
Name=Sourcerer Dev
Exec=/home/chris/coding/sourcerer/objdir/dist/bin/sourcerer %u
Icon=/home/chris/coding/sourcerer/sourcerer/branding/dev/default128.png
Terminal=false
Type=Application
Categories=Development;IDE;
StartupWMClass=sourcerer
MimeType=text/html;text/xml;application/xhtml+xml;...;x-scheme-handler/http;x-scheme-handler/https;
```

Three `sourcerer` tokens on the `Icon=` line with three different correct targets (repo root → `Power-Browser`, tree dir → `powerbrowser`, filename unchanged). `Name=` takes the display form (`Power Browser Dev`, with a space); `StartupWMClass=` takes the identifier form (`powerbrowser`). The `MimeType=` line already registers `x-scheme-handler/http`/`https` — relevant to GUI-01, unchanged.

### Comment discipline (D-08, applies to every migrated file)

Every analog read this session carries block comments that cite decision IDs (`D-96/D-97`, `D-121/D-122`, `D-51 carve-out 4`, `SIDE-04`) and explain *why the naive approach was rejected*. These citations are `frozen` — they migrate verbatim and are not renamed. Only brand tokens naming the product change. New Phase 1 code should carry the same style of comment, citing this project's own decision IDs.

### Path constant convention (every shell script)

**Source:** `check-internals-boundary.sh:27`, `verify-phase-05.sh:31`, `verify-endpoints.sh:48` — all three identical:
```bash
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/rename-brand.mjs` | utility | transform | No codemod, rename, or bulk-edit script exists anywhere in the sourcerer tree. Structural conventions borrowed from `check-internals-boundary.sh` and `verify-branding.mjs`, but the transform logic itself is new. RESEARCH.md's "Alternatives Considered" explicitly rules out the `sed`/`git grep | xargs` shape. |
| GUI-02 mini-browser integration specifics | provider | request-response | `@theia/mini-browser` is not installed in the sourcerer tree, so `MiniBrowser.FACTORY_ID` and its options shape have no in-repo analog (assumption A2). The handler *shell* has an exact analog (above); the widget-creation call does not. Planner must gate on reading the installed package source. |
| `powerbrowser/branding/{dev,release}/default*.png` content | asset | file-I/O | New original artwork (D-11). Only the file names and the SVG-with-dark-mode-fill convention carry over. |

---

## Metadata

**Analog search scope:** `/home/chris/coding/sourcerer` @ `bce68bb468e4dc160da8c9e238e030a400b806f8` — `git ls-files` (124 tracked files excluding `.planning/`), full listing enumerated. `/home/chris/coding/Power-Browser` confirmed to contain no source code.
**Files scanned:** 124 listed; 12 read in whole or in targeted part.
**Pattern extraction date:** 2026-08-30
