# Phase 3: Firefox Branding Emitter and Icon Pipeline - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 9 (3 modify, 3 new verify-side, 3 generated-surface groups)
**Analogs found:** 6 / 9 (3 with no in-tree analog — planner uses RESEARCH.md snippets)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/generate.mjs` (extend: ftl/properties/identity/installer/icon emitters + TARGETS rows) | generator | transform + file-I/O + batch | self (`scripts/generate.mjs`) | exact |
| `scripts/lib/config-schema.json` (add `[installer]` keys) | config/schema | transform | self (`scripts/lib/config-schema.json`) | exact |
| New verify script(s) (branding-dir agreement, icon IHDR, installer schema) | test/verify | file-I/O + transform | `scripts/verify-branding-preflight.mjs` | exact |
| `scripts/verify-platform.sh` (append registry rows) | config/registry | batch | self, rows at lines 3631-3672 | exact |
| `patches/010-powerbrowser-identity.patch` (regenerate: de-configure vendor lines) | patch/config | transform | `patches/010-powerbrowser-identity.patch` + `scripts/fetch-upstream.sh` `ensure_branding_overlay` (lines 112-121) | role-match |
| `configuration.toml` (new `[installer]` keys) | config | transform | self (`configuration.toml`) | exact |
| ICO/ICNS pure-Node writers (new functions in `generate.mjs`) | utility | transform (binary) | none — closest partial: `Buffer.compare` usage in `generate.mjs:1028`, `verify-generated-identity.mjs:171` | no analog |
| NSIS/MSIX/Info.plist/VisualElementsManifest field emitters (new functions) | generator | transform | none tracked (upstream sources are untracked — see gate note) | no analog |
| inkscape spawn + PNG IHDR reader (new functions) | utility | batch + file-I/O | partial: `spawnSync` import + child pattern in `generate.mjs:58,1269-1285`; IHDR pattern lives only in `.planning` prose (01-03-SUMMARY), no tracked code | partial |

**Tracked-source gate:** every analog path above was verified with `git ls-files` (non-empty = tracked). `git ls-files -- upstream/` prints **nothing** — `upstream/` is untracked in this repo, so planner must treat RESEARCH.md's `upstream/...` citations as read-only references, never as edit targets or analog paths. No mirror paths are emitted anywhere in this file.

## Pattern Assignments

### `scripts/generate.mjs` — extend (generator, transform + file-I/O + batch)

**Analog:** self — `scripts/generate.mjs` (1600 lines; read fully this session, single pass).

**Pipeline order — DO NOT reorder** (lines 14-31, load-bearing):
Parse → reject-unknown → mask → merge → validate → emit → write. New `[installer]` keys flow through the existing `SCHEMA_KEYS` table with zero pipeline changes; only `config-schema.json` grows.

**New emitter shape — copy `emitConfigureSh`** (lines 671-685):
```js
function emitConfigureSh(config, variant) {
    const lines = [
        '# This Source Code Form is subject to the terms of the Mozilla Public',
        '# License, v. 2.0. If a copy of the MPL was not distributed with this',
        '# file, You can obtain one at http://mozilla.org/MPL/2.0/.',
        '',
        ...GENERATED_BANNER,
        `MOZ_APP_DISPLAYNAME="${assertEmittable('identity.display_name', config.identity.display_name)}`
        + `${assertEmittable(variantPath(variant, 'name_suffix'), variant.name_suffix)}"`,
    ];
    return lines.join('\n') + '\n';
}
```
Rules for every new emitter (`emitBrandFtl`, `emitBrandProperties`, `emitIdentityConfigure`, `emitBrandingNsi`, `emitAppxManifest`, `emitInfoPlist`, `emitVisualElementsManifest`):
- One function parameterized by `variant` — never one emitter per variant. Dev/release `brand.ftl` differ in exactly one line (`-brand-full-name`, line 11) and `brand.properties` in exactly one line (`brandFullName`, line 11); the difference is `variant.name_suffix` only (RESEARCH Pattern 1, verified against `powerbrowser/branding/dev` vs `release`).
- `brand.ftl` terms `-brand-shorter-name` / `-brand-short-name` / `-brand-shortcut-name` carry the BASE name; only `-brand-full-name` carries base + suffix. `-brand-product-name` stays literal `Firefox` (D-78); `-vendor-short-name` comes from `product.vendor_display`. Source comparand: `powerbrowser/branding/dev/locales/en-US/brand.ftl` lines 8-22.
- Join with literal `'\n'`, never platform line endings (line 669 comment).
- Every manifest value passes `assertEmittable` at interpolation (lines 575-584); new sinks (NSIS `"`, `${}`; XML `&<>"`) need the `UNEMITTABLE` guard extended per sink (line 556: `const UNEMITTABLE = /["`$\\\r\n\t\0]/;`).

**Frozen target table — new rows here, nowhere else** (lines 830-861):
```js
export const TARGETS = Object.freeze([
    Object.freeze({
        generated: 'branding/dev/configure.sh',
        tracked: 'powerbrowser/branding/dev/configure.sh',
        variant: 'dev',
        emit: emitConfigureSh,
    }),
    // ... new rows: generated 'branding/dev/locales/en-US/brand.ftl' etc.
]);
```
Both paths are string literals — no manifest value may select a write path (lines 814-816 comment). `generated/` targets that replace tracked hand-written files keep the `tracked:` comparand so `verify-generated-identity.mjs` covers them automatically. Brand-literal layout files with no brand values (`moz.build`, `jar.mn`, `locales/moz.build`, `content/jar.mn`) are emitted as literals copied from the tracked originals: `powerbrowser/branding/dev/moz.build` (11 lines), `powerbrowser/branding/dev/content/jar.mn` (20 lines), `powerbrowser/branding/dev/locales/jar.mn` (12 lines), `powerbrowser/branding/dev/locales/moz.build` (5 lines: `JAR_MANIFESTS += ["jar.mn"]`). Per RESEARCH Pitfall 6, `pref/firefox-branding.js` stays hand-written (no brand values in it — only the dev-only `browser.tabs.inTitlebar` block at lines 166-188 differs by design).

**Two-pass write — emit-all-then-write** (lines 878-908, `writeTargets`):
Emit every target to memory first (validation incl. ftl↔properties agreement happens here, while the tree is untouched), `report(failures)`, then `mkdirSync(dirname(outPath), { recursive: true }); writeFileSync(outPath, body, 'utf8')`. No tmp+rename analog exists in-tree — the atomicity half of RESEARCH Pattern 2 (`writeFileSync(tmpPath)` + `renameSync`) is new code; the two-pass ordering above is the half to preserve.

**`--check` / `--self-test` conventions:** `checkTargets(config, root)` (lines 976-1058) emits to `mkdtempSync` and compares both directions (stale + extra), with the absent-`generated/` SKIP at lines 977-996. Self-test uses `FIXTURE_BASE`/`FIXTURE_VARIANT` fixtures (lines 1119-1150), `capture()` console collector (lines 1168-1181), `BROKEN` vacuous-guard sentinel (line 1184), and the `INTERNAL_MARKERS` no-internals assertion (lines 1296-1300: no `at ` stack frames, no `node:` specifiers, no `REPO_ROOT`). New emitter cases follow this shape; `resolveConfig` (lines 1075-1094) is the shared entry importers use.

**`spawnSync` precedent for the inkscape call** (line 58 import; lines 1269-1285 `probeMalformedManifest` child pattern):
```js
import { spawnSync } from 'node:child_process';
const child = spawnSync(process.execPath, [...], { encoding: 'utf8' });
```
Inkscape invocation shape per RESEARCH: `inkscape brand/mark.svg --export-filename=<out> -w <N> -h <N>` for N in 16/32/48/64/128. Squareness pre-check: `brand/mark.svg` line 34 carries single-line `<svg … viewBox="0 0 128 128">` — parse `viewBox` at generate time, hard-fail on non-square (RESEARCH Pitfall 5). PNG dimension check reads IHDR width/height as big-endian uint32 at bytes 16..24 — no tracked code analog (01-03 pattern survives only in `.planning` prose); write it fresh with `readFileSync` + `readUInt32BE`.

**Shared header constants to reuse:** `GENERATED_BANNER` (lines 602-607), `REPO_ROOT` derivation from `import.meta.url` (line 66), `variantPath(variant, key)` dotted-path helper (lines 610-612), `DESKTOP_ROOT_TOKEN` (line 752), `firstDifferingLine` reporting aid (lines 935-942), `filesUnder` recursive lister (lines 918-925).

---

### `scripts/lib/config-schema.json` — extend (config/schema, transform)

**Analog:** self — `scripts/lib/config-schema.json` (112 lines; read fully).

**Key-entry shape to copy** (lines 26-32):
```json
"identity.display_name": {
  "type": "string",
  "required": true,
  "regex": "^[A-Za-z0-9][A-Za-z0-9 .'-]{0,63}$",
  "regex_help": "letters, digits, spaces, dots, apostrophes and hyphens only; 1 to 64 characters; must start with a letter or digit",
  "regex_example": "Acme Browser"
},
```
Rules: `required: true` IS the mask list (D-06 — a required key can never be silently inherited; see `generate.mjs` lines 268-270). New `[installer]` keys need `regex` + `regex_help` + `regex_example` whenever they reach a sink (shell/NSIS/XML); installer CompanyName/URL keys are required, `channel` defaults to `"unofficial"`, tile color defaults to the shell neutral (RESEARCH Open Question 2 — planner proposes, user confirms). Array-of-tables keys use the `variants[].key` dotted form (lines 83-110). **Never** add a second key list anywhere — this file is the single source for unknown-key rejection, masker, and validator (file's own `$comment`).

---

### New verify script(s) (test/verify, file-I/O + transform)

**Analog:** `scripts/verify-branding-preflight.mjs` (tracked; sections 1-9 + `--self-test` read this session).

**File skeleton to copy** (lines 42-65):
```js
import { readFileSync, existsSync, mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-branding-preflight';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(1);
    }
}
```
**Check-body conventions to copy:**
- Accumulating reporter, not throwing: `makeReporter()` with `fail`/`eq` (lines 72-86) — one run reports every wrong literal. `eq(label, actual, expected, where)` names the file and BOTH values (lines 77-84).
- `readText(root, rel)` returns null on absent (lines 88-92); absent inputs are failures, never skips.
- Term readers are small regex helpers over file text: `ftlTerm` (lines 114-117), `propTerm` (lines 120-123), `shellAssign` (lines 126-129), `desktopKey` (lines 132-135). New agreement check reuses `ftlTerm`/`propTerm` (`-brand-full-name` vs `brandFullName`) — the exact-equality pattern `verify-branding-identity.mjs` surface 4 already implements (`checkBrandFullName`, lines 458-480).
- Derive expected sets from the tree, compare as set equality: content-dir walk vs `jar.mn` packaging lines, both directions plus cross-variant divergence (lines 649-727, section 9). New branding-dir agreement check copies this three-direction shape: (a) every file under `generated/branding/<variant>/` packaged/expected, (b) every referenced file exists, (c) dev vs release destination sets equal.
- Non-vacuity: an empty derived set is a FAILURE (lines 660-668). Inventory values interpolated into RegExp go through `escapeForRegExp` (lines 109-111).
- `--self-test` (lines 735+): mirror the real tree into `mkdtempSync`, assert the unmutated control is GREEN first (lines 797-802), then plant one mutation per case and require red naming file + both values. Fixture copy list pattern at lines 741-775 (explicit file list + whole-directory walk for derived sets).

**Icon IHDR check placement:** new verify script or a section in the agreement script — reads the five `default{16,32,48,64,128}.png` per variant, asserts IHDR dimensions exactly N×N. No tracked reader analog; byte offsets 16..24, `readUInt32BE`.

**Installer schema check:** asserts NSIS `!define` lines / AppxManifest XML / Info.plist / VisualElementsManifest fragments are present and well-formed against the manifest values. Hostile-value cases (quotes, `${}`, `&<>`) go in `generate.mjs --self-test`, not here.

---

### `scripts/verify-platform.sh` — append rows (config/registry, batch)

**Analog:** self — registry rows at lines 3631-3672 (read this session).

**Row shape to copy** (lines 3631-3632, 3671-3672):
```bash
"generated-byte-identity|node $REPO_ROOT/scripts/verify-generated-identity.mjs"
"generated-byte-identity-self-test|node $REPO_ROOT/scripts/verify-generated-identity.mjs --self-test"
...
"generate-check|node $REPO_ROOT/scripts/generate.mjs --check"
"generate-self-test|node $REPO_ROOT/scripts/generate.mjs --self-test"
```
Rules: append rows to the `CHECKS` array in `run_own_checks()` (line 3489) — never create a sibling driver (file header, lines 52-54). New rows: `branding-dir-agreement`, `branding-dir-agreement-self-test`, `icon-ihdr`, `icon-ihdr-self-test` (or folded into one script with one row-pair), `installer-schema`, `installer-schema-self-test`. Every check row rides with its `--self-test` row (file-wide convention). Honestly `--quick`: new rows read text/PNG bytes off disk only — no build, no browser, no display. Each row gets the `NEW (03-…)` provenance comment block the 02-05/02-06 rows carry (lines 3604-3630).

---

### `patches/010-powerbrowser-identity.patch` — regenerate (patch/config, transform)

**Analog:** `patches/010-powerbrowser-identity.patch` (tracked, 24 lines; read fully) + `scripts/fetch-upstream.sh` `ensure_branding_overlay` (lines 112-121, tracked).

**Current patch shape** (lines 19-22 — the lines Phase 3 de-configures):
```diff
-imply_option("MOZ_APP_VENDOR", "Mozilla")
+imply_option("MOZ_APP_VENDOR", "DeBIOS")
+imply_option("MOZ_APP_UA_NAME", "Firefox")
 imply_option("MOZ_APP_ID", "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}")
```
Rule: patches are regenerated from a patched tree, never text-edited (CLAUDE.md). The `MOZ_APP_VENDOR`/`MOZ_APP_UA_NAME` hard-codes move into `generated/identity.configure` (+ a hook `include()` from `browser/moz.configure`) or into generated `.mozconfig` `export` lines — the spike decides which carrier (RESEARCH Pitfalls 1/3, Assumptions A4/A5). After switching, force `./mach configure` (not incremental) and diff `objdir/config/autoconf.mk` `MOZ_APP_VENDOR`/`MOZ_APP_DISPLAYNAME`/`MOZ_BRANDING_DIRECTORY` lines.

**Symlink-fallback precedent** (`fetch-upstream.sh` lines 112-121):
```bash
ensure_branding_overlay() {
  local git_dir="$1"
  ln -sfn ../powerbrowser "$git_dir/powerbrowser"
  ...
}
```
Today's `--with-branding=powerbrowser/branding/dev` resolves only through the `upstream/powerbrowser -> ../powerbrowser` symlink this creates. If the spike finds `--with-branding=../generated/branding/dev` (outside topsrcdir) rejected, the fallback is the identical mechanism: a topsrcdir-internal symlink (e.g. `powerbrowser/branding-generated -> ../../generated/branding`). Note `.mozconfig` line 15 carries the current flag spelling: `ac_add_options --with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding/dev}`.

---

### `configuration.toml` — extend (config, transform)

**Analog:** self — `configuration.toml` (67 lines; read fully).

New `[installer]` table follows the existing section shape (`[product]` lines 31-35, `[identity]` lines 37-42). Placement notes in the header (lines 15-29) show the convention: required-ness is documented inline with the *reason* (inheritance hazard). Machine-form vs display-form split stays: installer CompanyName reuses `product.vendor_display`, never a second vendor string (RESEARCH Pattern 4).

## Shared Patterns

### Byte-identity assertion
**Source:** `scripts/verify-generated-identity.mjs` lines 165-176; `scripts/generate.mjs` lines 1026-1031
**Apply to:** new agreement check, `--check` extension
```js
const want = readFileSync(join(dir, rel));
const have = readFileSync(join(root, rel));
if (Buffer.compare(want, have) !== 0) {
    const at = firstDifferingLine(have.toString('utf8'), want.toString('utf8'));
    stale.push(`generated/${rel} -- differs, from line ${at}`);
}
```
Assertion is `Buffer.compare` (byte-level); line differ is a reporting aid only — never the check itself.

### Derived-set vs declared-set comparison
**Source:** `scripts/verify-generated-identity.mjs` lines 81-88 (`diff` → `surplus`/`missing`); `scripts/generate.mjs` lines 463-488 (`validateVariantIds` derives built ids from `TARGETS`)
**Apply to:** branding-dir agreement check, installer schema check, EXPECTED-list updates
```js
function diff(actual, expected) {
    const a = new Set(actual);
    const e = new Set(expected);
    return {
        surplus: [...a].filter(p => !e.has(p)),
        missing: [...e].filter(p => !a.has(p)),
    };
}
```
Derive the actual set from the generator's frozen table / the directory at check time; never hand-keep both sides.

### User-facing copy (no internals)
**Source:** `scripts/generate.mjs` lines 575-584 (`assertEmittable`), 1589-1600 (top-level catch); `scripts/verify-generated-identity.mjs` lines 386-404 (`checkNoCheckoutPath`)
**Apply to:** all new emitters, icon-step failures, spike-adjacent messages
Every failure names the TOML dotted path, states the rule in plain words, ends with a real next step (`node scripts/generate.mjs`). No stack trace, no `node:` specifier, no checkout path, no pref key / port / raw exception. New sink guards (NSIS/XML) report through `report()` in the same shape.

### Check-row + self-test pairing
**Source:** `scripts/verify-platform.sh` lines 3505-3506, 3631-3632, 3671-3672; `scripts/check-patch-surface.sh` lines 66-80 (throwaway-dir self-test)
**Apply to:** every new registry row
Self-tests plant faults in `mkdtemp` fixtures or in-memory tables — never on the real tree (tracked branding files are the independent comparand; cf. `verify-generated-identity.mjs` lines 313-322).

### Patch-surface guard
**Source:** `scripts/check-patch-surface.sh` lines 46-56 (targets read from `+++ b/` headers, never body-grep)
**Apply to:** regenerated patch 010
The de-configured patch must still touch only config paths; `check-patch-surface` stays green unchanged.

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md §Code Examples patterns instead):

| File / Function | Role | Data Flow | Reason |
|---|---|---|---|
| ICO writer (`emitFirefoxIco`, ~40-line header + 16-byte entries over PNG payloads) | utility | binary transform | No binary-format writer exists in-tree; closest is `Buffer` usage (`Buffer.compare`, `Buffer.concat` at `generate.mjs:1217`) — byte ops only, no container precedent |
| ICNS writer | utility | binary transform | Same as ICO; `png2icns` absent, flake addition rejected — pure-Node writer per RESEARCH Alternatives |
| `emitBrandingNsi` / `emitAppxManifest` / `emitInfoPlist` / `emitVisualElementsManifest` field bodies | generator | transform | Field layouts live in untracked `upstream/browser/{branding/official/branding.nsi,installer/windows/msix/AppxManifest.xml.in,app/macbuild/Contents/Info.plist.in}` — RESEARCH §Code Examples carries the verified excerpts; copy those, not live-tree reads, so the plan survives an ESR rebase |
| PNG IHDR dimension reader | utility | file-I/O | 01-03 pattern survives only as prose; no tracked implementation (wide grep over `scripts/` for `IHDR|readUInt32BE|inkscape` is clean) |
| tmp+rename atomic-write half | utility | file-I/O | `writeTargets` does direct `writeFileSync`; the `writeFileSync(tmp)+renameSync` half is new (RESEARCH Atomic emit example) |

## Metadata

**Analog search scope:** `scripts/`, `scripts/lib/`, `powerbrowser/branding/{dev,release}/`, `brand/`, `patches/`, repo root (`.mozconfig`, `configuration.toml`), `.planning/` (prose-only hits, not analogs)
**Files scanned:** ~20 (`generate.mjs` 1600 lines + `verify-branding-preflight.mjs` 900+ lines + `verify-generated-identity.mjs` 501 lines + `verify-branding-identity.mjs` 604 lines + `verify-platform.sh` registry slice + schema/manifest/branding-dir files); stopped at 6 strong analogs per early-stopping rule
**Git-track verification:** `git ls-files` run over all 16 analog paths — all tracked; `git ls-files -- upstream/` empty (untracked, reference-only)
**Pattern extraction date:** 2026-09-04
