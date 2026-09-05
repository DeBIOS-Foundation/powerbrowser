# Phase 08: Installer Hardening + Canonical Rename - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 16 (13 modified, 3 new)
**Analogs found:** 14 / 16

All analog paths verified git-tracked via `git ls-files -- <path>` before naming.
No `.claude/skills/` or `.agents/skills/` directory exists in this tree; project
conventions taken from `CLAUDE.md` (one driver/one registry, derive-don't-hand-keep,
self-test twins, residual-brand scan, user-facing copy rule).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/generate.mjs` (WR-04 guard + mozconfig flip) | generator | transform (manifest→artifacts) | self (modify in place) | exact |
| `scripts/verify-installer-schema.mjs` (WR-07 root thread) | verifier | request-response (check on disk) | self (modify in place) | exact |
| `scripts/verify-platform.sh` (new `installer-build-proof`, `mar-update-hop` rows) | config (check registry) | batch | self (modify in place) | exact |
| `docs/BUILD.md` (packaging procedure) | docs | n/a | self (modify in place) | exact |
| `powerbrowser/distribution/policies.json` (`AppUpdateURL`) | config | request-response (policy→client) | self (modify in place) | exact |
| `.mozconfig` (updater flags, regenerated) | config (generated) | batch (build input) | self (regenerate via generator) | exact |
| `configuration.toml` (NAME-01 one-line edit) | config | n/a | self (one-line edit) | exact |
| `inventory/brand-tokens.json` (re-pin expectations) | config | n/a | self (modify in place) | exact |
| `scripts/verify-branding-preflight.mjs` (re-pin plants/messages) | verifier | request-response | self (modify in place) | exact |
| `scripts/verify-branding.mjs` (comment/expectation) | verifier | request-response | self (modify in place) | exact |
| `scripts/check-internals-boundary.sh` (#13 `registerWindowActor`) | guard script | batch (static scan) | self (modify in place) | exact |
| `scripts/lib/firefox-bidi.mjs` (#14 URL-context selection) | utility (test harness) | request-response (BiDi) | self (modify in place) | exact |
| `powerbrowser/identity.configure.comparand` + tracked branding files | comparand (generated) | batch | self (regenerate, 02-04 precedent) | exact |
| NEW canonical-form downstream fixture `configuration.toml` | test fixture | n/a | `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/spaced-name/configuration.toml` | exact |
| NEW `verify-installer-build-proof` / `verify-mar-update-hop` check script(s) | verifier | batch + host/launch | `scripts/verify-installer-schema.mjs` + `scripts/verify-endpoints.sh` (layer 3) | role-match |
| `scripts/verify-trademark-surface.mjs` (anchored-exclusion audit only) | verifier | request-response | self (read-only audit) | exact |

## Pattern Assignments

### `scripts/generate.mjs` (generator, transform)

**Analog:** self — all edits copy the immediately surrounding emitter/guard idiom.

**Sink-guard pattern** (lines 873-889) — WR-04 extends this regex + message, nothing else:
```js
const NSIS_UNEMITTABLE = /"|\$\{|\r|\n|\0/;
function assertNsisEmittable(path, value) {
    if (typeof value !== 'string' || NSIS_UNEMITTABLE.test(value)) {
        report([
            `${path} cannot be written into a Windows installer setting as it stands. A brand value may not `
            + 'contain a double quote, a dollar-brace variable reference, or a line break. '
            + `Open ${MANIFEST_NAME}, correct it, then run: ${RERUN}`,
        ]);
    }
    return value;
}
```
Fix direction (RESEARCH-verified): reject any `$` not escaped as `$$`, covering
`$VAR` and `${VAR}` in one class; update the message's rule sentence to match.
Call sites to inherit the stricter guard for free: `emitBrandingNsi` lines
2811-2815 (`identity.display_name`, variant `name_suffix`, `product.vendor_display`)
and `installerSupportUrl` lines 2782-2790 (`installer.support_url`/`product.homepage`
fallback). NAME-01 value `PowerBrowser` contains no `$` — no interaction.

**Mozconfig emitter pattern** (lines 1164-1188) — updater flip lands here:
```js
function emitMozconfig(config, variant) {
    const objdir = assertEmittable(variantPath(variant, 'objdir'), variant.objdir);
    const lines = [
        ...GENERATED_BANNER,
        '',
        'mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-' + objdir + '}',
        'ac_add_options --enable-application=browser',
        'ac_add_options --disable-updater',   // <-- the line this phase flips
        ...
```
Per the lines 1151-1158 comment, the six literal lines stay literal unless promoted;
the disciplined form is flipping the literal (or promoting to an emitter line keyed
off a frozen default, never a manifest value — no new `[build]` table in scope),
then regenerating `.mozconfig` through the byte-identity gate (emitter + tracked
comparand change in one commit, 02-04 precedent). Cost: any flag change is a tier-3
full rebuild (~47-54 min).

**NSIS emitter pattern** (lines 2811-2830) — the six-define contract new work must not break:
```js
export function emitBrandingNsi(config, variant) {
    const base = assertNsisEmittable('identity.display_name', config.identity.display_name);
    const suffix = assertNsisEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix);
    ...
    const lines = [
        ...
        `!define BrandFullNameInternal "${base}${suffix}"`,
        `!define BrandFullName "${base}${suffix}"`,
        `!define CompanyName "${vendor}"`,
        `!define URLInfoAbout "${url}"`,
        `!define HelpLink "${url}"`,
        '!define Channel "unofficial"',
    ];
```

**TARGETS row pattern** (lines 3283-3287) — any new emitted fragment adds one frozen row;
no other registration is needed (the installer-schema gate derives from this table):
```js
    Object.freeze({
        generated: 'branding/dev/branding.nsi',
        variant: 'dev',
        emit: emitBrandingNsi,
    }),
```

**Self-test plant pattern** (lines 3904-3926) — WR-04's bare-`$VAR` plant mirrors
`probeHostileSupportUrl` exactly (mkdtemp + `case-nsis.toml` fixture + child process,
because `report()` exits and would take the self-test down in-process):
```js
function probeHostileSupportUrl() {
    const dir = mkdtempSync(join(tmpdir(), 'generate-selftest-nsis-'));
    try {
        const fixturePath = join(dir, 'case-nsis.toml');
        writeFileSync(
            fixturePath,
            `${FIXTURE_BASE}\n${FIXTURE_VARIANT}\n[installer]\nsupport_url = "https://example.org/\${HOME}/support"\n`,
            'utf8',
        );
        const child = spawnSync(process.execPath, [
            '--input-type=module',
            '-e',
            `import { resolveConfig, emitBrandingNsi } from ${JSON.stringify(import.meta.url)};`
            + `const r = resolveConfig(undefined, ${JSON.stringify(fixturePath)});`
            + `if (r.failures.length > 0) { console.log('UNEXPECTED-VALIDATE-RED'); process.exit(2); }`
            + `process.stdout.write(emitBrandingNsi(r.config, r.config.variants.find(v => v.id === 'dev')));`,
        ], { encoding: 'utf8' });
        if (child.status === 0) return [`${BROKEN} the hostile support_url emitted cleanly`];
        return `${child.stderr}${child.stdout}`.split('\n').filter(line => line !== '');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
```
New plant: same harness with `support_url = "https://example.org/$INSTDIR/x"`
(bare `$`, no brace) — must exit non-zero naming the key.

**NAME-01 re-pin sites in this file:**
- Line 222 error-message example: `display_name = "Power Browser"` → canonical form.
- Line 4530 self-test comparand: `also: ['brand.properties', 'Planted Drift', 'Power Browser Dev']`
  → `"PowerBrowser Dev"` (suffix unchanged, base moves — RESEARCH open question 4
  defaults to `"PowerBrowser Dev"`).

---

### `scripts/verify-installer-schema.mjs` (verifier, request-response)

**Analog:** self — WR-07 threads `root` through `readTileColor` + call sites.

**Hole site** (lines 287-292, 351, 443):
```js
function readTileColor() {
    const manifest = parse(readFileSync(join(REPO_ROOT, 'configuration.toml'), 'utf8'));
    const value = manifest.installer?.tile_color;
    return (typeof value === 'string' && value.trim() !== '') ? value : undefined;
}
```
Fixed form: `function readTileColor(root)` reading `join(root, 'configuration.toml')`;
update the `runChecks` call site (line 351 `const tileColor = readTileColor();`) and
self-test plant 3 (line 443 `const stated = readTileColor();`). Every other input to
`runChecks(root)` is already rooted at the fixture dir in `--self-test`.

**Check-function pattern** (lines 266-285) — new divergent-manifest plant asserts via
the existing `checkTile` polarity logic; no new assertion code needed:
```js
function checkTile(r, root, rel, tileColor) {
    ...
    const found = (text.match(/BackgroundColor="([^"]*)"/) || [])[1];
    if (tileColor === undefined) {
        if (found !== undefined) {
            r.fail(
                `${rel} carries BackgroundColor=${JSON.stringify(found)} but configuration.toml leaves `
                + 'installer.tile_color unset, so the line must be omitted. Next step: run: node scripts/generate.mjs',
            );
        }
    } else {
        r.eq('tile BackgroundColor', found ?? '(absent)', tileColor, rel);
    }
}
```
New plant shape: write a fixture `configuration.toml` *with* `tile_color` set into the
mkdtemp mirror dir against tile XML *without* `BackgroundColor` (and vice versa) —
must go red naming the file and state. Note: the current self-test `mirror()` only
copies `generated/` files, so the plant must also copy a fixture manifest into the
mirror dir (new step, modelled on the existing `mirror()` closure at lines 380-386).

**Reporter + entry-point pattern** (lines 76-90, 472-485) — the template for any NEW
verifier script (see "NEW check scripts" below):
```js
function makeReporter() {
    const failures = [];
    return {
        failures,
        fail(msg) { failures.push(msg); },
        eq(label, actual, expected, where) { ... },
    };
}
```
Entry: `runChecks(REPO_ROOT)` → SKIP when `generated/` absent (fresh clone), FAIL
listing every failure, else `PASS -- ...schema-complete and nothing else`. New
host-dependent rows FAIL (not skip) when their subject is absent — cite the
`about-dialog-suppression` precedent in `verify-platform.sh` lines 4132-4138.

---

### `scripts/verify-platform.sh` (check registry, batch)

**Analog:** self — append rows, never a sibling driver.

**Quick-row pattern** (lines 3917-3918) with the mandatory honesty comment above:
```bash
    "installer-schema|node $REPO_ROOT/scripts/verify-installer-schema.mjs"
    "installer-schema-self-test|node $REPO_ROOT/scripts/verify-installer-schema.mjs --self-test"
```
Convention: every check row is immediately followed by its `--self-test` twin row,
with a comment block stating why it honestly earns `--quick` (no build/browser/
display/network) — see lines 3908-3916. New self-test halves (`installer-build-proof`
fixture twin, `mar-update-hop` mock-MAR twin) ride `--quick`; the full rows do not.

**Full-mode row pattern** (lines 4144-4146) — host/build-dependent proofs go in the
full array alongside the release-gated rows:
```bash
      "branding-variant-divergence|check_branding_variant_divergence"
      "verify-branding-identity-dev|node $REPO_ROOT/scripts/verify-branding-identity.mjs"
      "verify-branding-identity-release|node $REPO_ROOT/scripts/verify-branding-identity.mjs --variant release"
```
New rows `installer-build-proof` and `mar-update-hop` follow this shape.
`--gate` exclusions are keyed on ledger ids (lines 4361-4373), never bare labels —
if the new rows need exclusions before hosts exist, add ledger entries first and key
on them (see `ledger_entry_is_open`, lines 4346-4350).

---

### `docs/BUILD.md` (docs)

**Analog:** self — append a packaging-procedure section; copy the attribution discipline.

**Attribution pattern** — every timing names tree+host+toolchain (D-73); the tier-3
section (lines ~347-376) harvests rather than re-runs and says which tree each row was
measured on. New packaging timings must do the same. **Already-canonical signal:**
the BRAND-06 section already documents `... — PowerBrowser Dev` and
`MOZ_APP_DISPLAYNAME` dev `"PowerBrowser Dev"` / release `"PowerBrowser"` — the
planner should treat that prose as the pinned target the inventory re-pin must agree
with, not as text to rewrite. Rebase procedure to extend with the installer-schema
green over the rebased tree: `scripts/rebase-upstream.sh --tag <NEW_TAG> [--dry-run]`
(section at line 534).

---

### `powerbrowser/distribution/policies.json` (config, request-response)

**Analog:** self — additive key only. Current content (7 lines):
```json
{
  "policies": {
    "DisableAppUpdate": true,
    "DisableTelemetry": true,
    "DisableFirefoxStudies": true
  }
}
```
PKB-02 adds `"AppUpdateURL": "<fork-update.xml-URL>"` under machine/computer scope.
Note the tension the planner must resolve: `DisableAppUpdate: true` (BRAND-04 layer-1
proof reads this file's effective prefs) contradicts a self-updating client — the
policy edit and the `verify-endpoints.sh` layer-1 expectation move together.
Whether this file is hand-edited or generator-emitted: no generator emitter owns it
today (no TARGETS row names it), so hand-edit is the established pattern unless the
planner deliberately adds an emitter row (in which case follow the TARGETS pattern
above and add a byte-identity comparand).

---

### `.mozconfig` + `powerbrowser/identity.configure.comparand` + tracked branding files (generated)

**Analog:** self — regenerated output, never hand-edited. Header is the contract:
```
# Generated from configuration.toml by scripts/generate.mjs -- do not edit here.
# To change it: edit configuration.toml, run: node scripts/generate.mjs, then copy the
# matching file out of generated/ over this one. Phase 2 does not write it in place.
```
Planner: emitter change + tracked comparand change land in one commit (02-04
header-rewrite precedent), proved by `generate --check` + byte-identity green.
Current updater line (`.mozconfig:8`): `ac_add_options --disable-updater`.

---

### `configuration.toml` + `inventory/brand-tokens.json` (NAME-01 pair)

**Analog:** self — one-line manifest edit plus hand-authored expectation re-pin.

- `configuration.toml:38`: `display_name = "Power Browser"` → `"PowerBrowser"`.
  Frozen (Pitfall 2/6): `app_basename`/`binary_name`/`remoting_name`
  (`powerbrowser`), `distribution_id`, `MOZ_APP_REMOTINGNAME`, `StartupWMClass`
  stay untouched; plan needs an identity-field freeze assertion + alongside-Firefox
  interleaved launch test.
- `inventory/brand-tokens.json` lines 75-96 `brand_display_expectations.variants`:
  dev `brand_full_name: "Power Browser Dev"` → `"PowerBrowser Dev"`,
  release `"Power Browser"` → `"PowerBrowser"` (and `brand_short_name`,
  `brand_shorter_name`, `brand_shortcut_name`, `app_display_name` in both variants).
  This block is the hand-authored expected-value source for the preflight — it is
  rewritten by hand, never derived, or the Pitfall-1 mechanical-pass failure mode
  returns. `identifier_form: "PowerBrowser"` (line 107, the value that must NEVER
  appear in a display string) needs a planner decision: after NAME-01 the canonical
  display *is* the identifier form, so the preflight's absence-assertion must be
  re-scoped, not just re-pinned.

---

### `scripts/verify-branding-preflight.mjs` + `scripts/verify-branding.mjs` (NAME-01 re-pin)

**Analog:** self. Preflight derives surfaces from the tree but takes expected values
from the inventory block above — re-pin its 18 `Power Browser` occurrences, e.g.
line 1241 plant `'-brand-full-name = Power Browser Dev'` and line 1344
`'<title>Power Browser</title>'`, following the file's own plant-then-require-red
shape (control-green-first, `readFileSync`+`replace`+`writeFileSync` into a scratch
copy, assert rejection names expected value — lines 1241-1257). `verify-branding.mjs`
line 204 comment pins `brand_short_name 'Power Browser'` — update comment +
expectation together (the file's own 01-07 lesson, recorded in its comment at lines
204-212, is that rewriting the expectation to the wrong form makes the check red for
a reason that is never the product's fault).

---

### `scripts/check-internals-boundary.sh` (#13, SEC-02)

**Analog:** self — one pattern line + one self-test plant.

**Pattern-list site** (lines 36-56):
```bash
FORBIDDEN_PATTERNS=(
  'Services.'
  ...
  'nodePrincipal'
  'fixupAndLoadURIString'
)
```
Fix: append `'ChromeUtils.registerWindowActor'` (obligation pre-written in
`scripts/verify-gui01-window.mjs:177-178`). Unconditional entry like `Services.`,
not conditional — no `chrome://powerbrowser/` exemption applies. Catalogue
consequence: zero `WindowActor` occurrences exist in `PowerBrowserAPI.sys.mjs` or
`INTERNAL-APIS.md` today, so no catalogue row is needed unless the fix surfaces one.

**Self-test plant pattern** (lines 237-255) — the new plant mirrors the `Services.` fixture:
```bash
  cat > "$tmp/planted-violation.sys.mjs" <<'EOF'
...
export function badFunction() {
  return Services.prefs.getBoolPref("some.pref", false);
}
EOF

  if scan_internals_boundary "$tmp" >/dev/null 2>"$tmp/self-test.err"; then
    echo "check-internals-boundary: --self-test FAIL -- planted violation was NOT rejected" >&2
    ...
  elif grep -q 'planted-violation.sys.mjs' "$tmp/self-test.err"; then
    echo "check-internals-boundary: --self-test PASS -- planted violation (planted-violation.sys.mjs, Services.) was correctly rejected"
```
New plant: fixture carrying `ChromeUtils.registerWindowActor(...)`, assert rejection
names the file and pattern.

---

### `scripts/lib/firefox-bidi.mjs` (#14, SHELL-01)

**Analog:** self — select by URL through the already-exported helper.

**Pin site** (lines 356-357) and existing helper (lines 379-382):
```js
        const tree = await client.send('browsingContext.getTree', {});
        const context = tree.result.contexts[0].context;
        ...
        const topLevelContexts = async () => {
            const tree = await client.send('browsingContext.getTree', {});
            return tree.result.contexts.map(c => ({ context: c.context, url: c.url }));
        };
```
Fixed direction (RESEARCH-verified): match the requested `url` against
`topLevelContexts()`, fall back to first context with a logged note when no URL was
passed. Root-cause context the planner needs: lines 282-289 document that any URL on
the command line opens a stock browser window IN ADDITION to the shell (upstream
`nsDefaultCommandLineHandler` takes the URI branch regardless of `preventDefault`),
so `contexts[0]` is the shell's Theia frontend, not the requested page. The four
`_run_app_check_mjs` callers that boot a dev app at localhost:3000 they then do not
read should pass `''` (no-URL launch) or assert against the matched context.
Module idiom (lines 1-60): zero-dependency, Node built-ins only (`node:child_process`,
`node:net`, global `WebSocket`); `withFirefoxPage` owns process hygiene (`finally`
kills + removes profile, SIGINT sets `exitCode` without `process.exit()`).

---

### NEW canonical-form downstream fixture (test fixture)

**Analog:** `.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/spaced-name/configuration.toml` (tracked).

Copy its shape verbatim: header comment stating TEST DATA + HOSTILITY + SHAPE,
`[product]`/`[identity]`/`[legal]`/`[installer]`/`[telemetry]`/`[upstreams]` sections
with every required key differing from the platform's and every other fixture's.
Invert the hostility: `display_name = "PowerBrowser"` (single token, no interior
space) — proves the no-space form emits cleanly through shell quoting, desktop
`Name=`, locale files, and NSIS defines. Keep `spaced-name` (`"Cedar Falls Browser"`)
as-is: it tests the mechanism, not the platform value. New fixture needs invented
names/URLs only (no real product, vendor, or trademark — per the spaced-name header).
The `verify-downstream-fixture.mjs` + `generate --check` overlay path (D-05 defaults
layer) exercises it with no new harness code.

---

### NEW `installer-build-proof` / `mar-update-hop` check script(s) (verifier, batch + host/launch)

**Analog (primary):** `scripts/verify-installer-schema.mjs` — copy its full skeleton:
imports (`node:fs`, `node:path`, `node:os`, `node:url`), `REPO_ROOT`/`NAME` constants,
`--self-test`-only arg parsing (lines 51-69), `makeReporter` fail-accumulate plumbing,
`runChecks(root)` with both-directions set comparison + non-vacuity failures, mkdtemp
mirror + control-green-first + one-plant-per-case self-test, SKIP-on-absent-subject
only where the subject is legitimately absent on a fresh clone.

**Analog (secondary, MAR hop only):** `scripts/verify-endpoints.sh` layer 3 (lines 1-60
header + `MOZ_LOG=nsHostResolver:5` anchored-`Resolving host` extraction) — the
zero-`*.mozilla.org`/`*.mozilla.net` negative proof reuses this exact log-sifting
shape during the N→N+1 hop. Pitfall guards the planner must encode (no new pattern
needed, all RESEARCH-derived): hop must be two distinct builds with distinct
versions/buildIDs (same-version loop is plumbing-only); assert `dist/bin/updater`
exists before any MAR test (`--disable-updater` left on = silent absence); set
`AppUpdateURL` under machine scope (`app.update.url` user-branch edits are silently
ignored, Bug 1468948). `update.xml` shape for the mock self-test fixture:
```xml
<updates>
  <update type="minor" displayVersion="…" appVersion="…" platformVersion="…" buildID="…">
    <patch type="complete" URL="http://127.0.0.1:8000/local_update.mar"
           hashFunction="sha512" hashValue="%HASH_VALUE%" size="%SIZE%"/>
  </update>
</updates>
```

---

### `scripts/verify-trademark-surface.mjs` (audit only)

**Analog:** self — no pattern change. Self-test fixture uses
`display_name = "Acme Browser"` (lines 387-390, spaced multi-word hostile shape);
that shape stays valid after NAME-01. Planner action is read-only: re-check anchored
exclusions referencing the old display value, nothing more.

---

## Shared Patterns

### Assertion-failure copy (applies to: every verifier edit, every new check)
**Sources:** `scripts/verify-installer-schema.mjs` lines 199-220; `scripts/generate.mjs` lines 880-889.
Every failure names the file, the expected-vs-actual values, and a next step that is
a real affordance (`Next step: run: node scripts/generate.mjs`). No internal
identifier in user-facing text per CLAUDE.md — but note the tension: after NAME-01
the product name *is* `PowerBrowser`, so copy-rule prose saying "Power Browser" must
be re-pinned wherever it names the product (BUILD.md BRAND-06 already uses the
spaceless form; inventory-backed messages follow the inventory).

### Self-test twin discipline (applies to: WR-04 plant, WR-07 plant, #13 plant, #14 assert, both new rows)
**Sources:** `scripts/verify-installer-schema.mjs` lines 370-400 (control-green-first);
`scripts/check-internals-boundary.sh` lines 262-282 (derive the mutation target from
the code, never a hardcoded line number); `scripts/verify-platform.sh` lines 3908-3916.
Control green first, then one plant per case, each required to go red *naming the file
and both values*. Derive plant targets at self-test time — a pinned line number
silently stops testing anything the moment an edit above it shifts the file.

### Derive, don't hand-keep (applies to: new rows, fixture, inventory re-pin)
**Sources:** `scripts/generate.mjs` TARGETS (lines 3277-3323); `scripts/verify-branding-identity.mjs`
VARIANTS comment + descriptor (lines 126-153 — structural paths only, all brand values
via `resolveConfig`); `scripts/verify-installer-schema.mjs` `expectedFragments()` (lines 127-129).
New checks derive expectations from TARGETS/generator/manifest at check time with
set-equality in both directions. `verify-branding-identity.mjs` needs **no NAME-01
re-pin** — it is the propagation control proving the single-edit claim.

### Sink-guard layering (applies to: generator edits, AppUpdateURL policy value)
**Sources:** `scripts/generate.mjs` lines 861-914 (`NSIS_UNEMITTABLE` + `XML_UNEMITTABLE`
+ `assertNsisEmittable`/`assertXmlEmittable` as defence-in-depth behind schema-regex
validation; CFG-03 rejection-only, never escaping). Any new emitted value (update URL
into policies, new installer fields) passes the matching sink guard on the way out.

### Registry mechanics (applies to: both new rows)
**Source:** `scripts/verify-platform.sh` lines 3917-3918, 4144-4160, 4361-4373.
`"label|command"` rows; self-test twin rides alongside in `--quick`; host-dependent
proofs live in the full array; `--gate` exclusions key on ledger ids, never labels.
Residual-brand scan stays green (`node scripts/scan-brand-residue.mjs` exit 0) —
stage new files before trusting a green scan, and NAME-01 changes the expected
*display value*, not the token set (no `brand-tokens.json` token-class change).

## No Analog Found

| File / Concern | Role | Data Flow | Reason |
|---|---|---|---|
| Static HTTPS host serving `update.xml` + MARs | infrastructure | file serving | No hosting surface exists in-tree; local fallback is `mach update serve` / `python3 -m http.server` (RESEARCH §Environment Availability) |
| Windows + macOS packaging hosts / VMs (provisioning) | infrastructure | batch (build) | No host exists yet; planner's first packaging plan names or provisions them. NSIS-on-Nix (`nix shell nixpkgs#nsis`) proceeds in parallel, never blocked on VMs |
| Production signing certs (MSIX Authenticode, DMG notarization) | procurement | n/a | Test-signing suffices for matrix proofs; cert choice is RESEARCH Open Question 1, explicitly out of phase |

## Metadata

**Analog search scope:** `scripts/` (generator, all verifiers, guards, `lib/`),
`inventory/`, `powerbrowser/distribution/`, repo-root configs, `docs/BUILD.md`,
`.planning/milestones/v1.0-phases/07-sourcerer-as-downstream/fixtures/`
**Files scanned:** 16 target files; ~12 analog files read (2 full, remainder targeted
non-overlapping ranges; no range re-read)
**Pattern extraction date:** 2026-09-04
