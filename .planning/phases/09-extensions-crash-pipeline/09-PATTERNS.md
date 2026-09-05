# Phase 09: Extensions + Crash Pipeline - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 13 new/modified
**Analogs found:** 11 / 13 (2 partial — no exact in-tree precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/generate.mjs` (extend: npm/local-path keys, resolver branches, webextensions emitter, TARGETS row) | config/generator | transform (manifest → fragments) | `scripts/generate.mjs` itself (`emitTheiaPlugins` lines 1607-1628, `validateExtensionElements` lines 593-693) | exact (in-place extension) |
| `scripts/lib/config-schema.json` (extend: new source kinds + `webextensions[]` keys) | config/schema | request-response (validate at generate time) | `scripts/lib/config-schema.json` itself (`extensions[].*` lines 199-231) | exact (in-place extension) |
| `scripts/verify-extension-pins.mjs` (extend: per-kind archive handling + npm/local-path self-test plants) | verifier/gate | CRUD (derive → compare → hash) | `scripts/verify-extension-pins.mjs` itself (whole file, 475 lines) | exact (in-place extension) |
| `scripts/verify-webextensions.mjs` (NEW) | verifier/gate | CRUD (derive → compare) | `scripts/verify-theia-endpoints.mjs` (290 lines) + `scripts/verify-telemetry.mjs` steps 1-2 (lines 75-145) | role-match |
| `scripts/crash-collector.mjs` (NEW) | service (ops tooling) | request-response (HTTP POST → store) | `scripts/verify-mar-update-hop.mjs` `buildUpdateXml`/`parseUpdateXml` (lines 101-120+) + `theia/extensions/telemetry/src/browser/telemetry-sender.ts` zero-dependency header (lines 1-24) | partial (no HTTP-server precedent in `scripts/`) |
| `scripts/verify-crash-collector.mjs` (NEW) | verifier/gate | request-response (contract test) | `scripts/verify-extension-pins.mjs` self-test (lines 298-464) + `scripts/verify-mar-update-hop.mjs` header + assertion plumbing (lines 69-87) | role-match |
| `powerbrowser/distribution/policies.json` (modify: + `ExtensionSettings`) | config (tracked consumer) | transform (generator copy-over target) | itself (lines 1-7, `AppUpdateURL` precedent) + `theia/applications/browser/package.json` `theiaPlugins` block pattern | role-match |
| `powerbrowser/endpoint-allowlist.json` (modify: + collector + `install_url` origins) | config (tracked allowlist) | CRUD (coverage set) | itself (`manifest`-marked entry shape, `toolkit.telemetry.server`/`breakpad.reportURL` pref expects lines 151-160) | exact (in-place extension) |
| `configuration.toml` (modify: npm/local-path entries, `[[webextensions]]`, `[urls].crash_report`) | config (manifest) | transform (source of all derivations) | itself (existing `[urls]`, `[telemetry]`, `[[extensions]]` keys) | exact (in-place extension) |
| `theia/extensions/telemetry/test/telemetry-sender.test.mjs` (extend: ping/report separation cases) | test | event-driven (level-gated send) | itself (239 lines) + `theia/extensions/telemetry/src/browser/telemetry-sender.ts` `levelAllowsEvent` (lines 76-80) | exact (in-place extension) |
| `scripts/verify-platform.sh` (modify: CHECKS rows) | config (registry) | batch (check dispatch) | itself (`extension-pins` rows lines 3984-3985, `theia-endpoints` rows lines 4075-4076, `mar-update-hop-self-test` row line 4106) | exact (in-place extension) |
| Tier-3 fixture matrix (BLD-02 per-fixture builds) | test/procedure | batch (build per fixture) | `scripts/verify-downstream-fixture.mjs` (lines 1-80 contract) + `docs/BUILD.md` packaging procedure + 08-05 drill-then-restore discipline | partial (procedure, not a file analog) |
| Re-pin runbook (UPD-04) | procedure/doc | batch (pin → resolve → compile → suite) | `scripts/verify-upstream-pins.mjs` Theia half steps 5-7 (lines 44-70) | role-match (contract exists; runbook writes the steps down) |

## Pattern Assignments

### `scripts/generate.mjs` (config/generator, transform)

**Analog:** itself — `EXTENSION_SOURCES` allowlist, `validateExtensionElements`, `openVsxFileUrl`/`emitTheiaPlugins`, `TARGETS` row, `assertEmittable` sink guard.

**Source-kind allowlist** (`scripts/generate.mjs` lines 457-458):

```js
/** The two `source` values EXT-01 implements. Anything else is a v2 kind (EXT-02) or a typo. */
const EXTENSION_SOURCES = Object.freeze(['openvsx', 'url']);
```

Copy: extend the frozen array to `['openvsx', 'url', 'npm', 'local-path']`. The `source is ... which this project does not implement` failure at lines 638-645 already enumerates the list from the const — update its trailing hint (`(npm, local paths) is a later phase` at line 642) since the later phase is now.

**Validation shape to extend** (`scripts/generate.mjs` lines 593-600, 637-661):

```js
function validateExtensionElements(doc) {
    const failures = [];
    const extensions = readPath(doc, 'extensions');
    if (!Array.isArray(extensions)) return failures;

    const labelOf = (entry, index) => (isTable(entry) && typeof entry.id === 'string' && entry.id !== ''
        ? `the [[extensions]] entry with id ${JSON.stringify(entry.id)}`
        : `the ${ordinal(index + 1)} [[extensions]] entry (no id stated)`);
```

```js
        // Conditional pins: the key the entry's own source demands.
        if (source === 'openvsx' && entry.version === undefined) {
            failures.push(
                `${label}: version ${UNSET_MARK} An Open VSX entry without an exact version would resolve to `
                + `whatever is latest, which is the unpinned behavior this setting forbids. Open ${MANIFEST_NAME}, `
                + `find that [[extensions]] entry, and pin version. Then run: ${RERUN}`,
            );
        }
        if (source === 'url' && entry.url === undefined) {
            ...
        }
```

Copy: add `npm` branch (`version` required, exact — never `latest`/range; resolution via `npm view <pkg>@<exact> dist.tarball dist.integrity`) and `local-path` branch (`path` required; absent/unpackable path fails naming the entry id, same shape as the missing-plugins-dir failure in `verify-extension-pins.mjs` lines 257-264). Per-key shape checks against `SCHEMA_KEYS` regexes (lines 663-690) extend to the new keys. Every failure names the entry id via `labelOf`.

**Resolver dispatch to extend** (`scripts/generate.mjs` lines 1568-1573, 1607-1619):

```js
export function openVsxFileUrl(entry) {
    const dot = entry.id.indexOf('.');
    const namespace = entry.id.slice(0, dot);
    const name = entry.id.slice(dot + 1);
    return `https://open-vsx.org/api/${namespace}/${name}/${entry.version}/file/${entry.id}-${entry.version}.vsix`;
}
```

```js
export function emitTheiaPlugins(config, variant) {
    void variant;
    const lines = ['{'];
    for (const entry of config.extensions ?? []) {
        if (typeof entry?.id !== 'string' || !entry.id.includes('.')
            || (entry.source !== 'openvsx' && entry.source !== 'url')) {
            report([...]);
        }
        const url = entry.source === 'openvsx' ? openVsxFileUrl(entry) : entry.url;
        lines.push(`  ${JSON.stringify(entry.id)}: ${JSON.stringify(url)},`);
    }
```

Copy: add `npmDistTarball(entry)` / `localPackSpec(entry)` resolver branches in the same dispatch position; emit `dist.tarball` verbatim as the `theiaPlugins` URL for npm; emit the packed-tgz path/URL for local-path. Emit `${targetPlatform}` through **verbatim, never expanded** (Pitfall 1). Extend the guard list alongside `EXTENSION_SOURCES` so the two cannot disagree. Keep the one-entry-per-line + trailing-comma-strip shape (lines 1621-1627) — the copy-over reads it with `JSON.parse`.

**Fragment rule** (`scripts/generate.mjs` lines 1581-1588): fragment under `generated/`, never the whole yarn-managed file; copy-over sets ONLY the owned block leaving siblings byte-identical; no tracked comparand row. The `ExtensionSettings` emitter follows the same rule: new `TARGETS` fragment row (e.g. `webextensions-settings.json`, no tracked comparand) + surgical copy setting ONLY the `ExtensionSettings` key in `policies.json`, preserving `AppUpdateURL`.

**TARGETS row shape** (`scripts/generate.mjs` lines 3033-3037):

```js
    Object.freeze({
        generated: 'theia-plugins.json',
        variant: 'dev',
        emit: emitTheiaPlugins,
    }),
```

Copy: append one frozen row per new fragment (`webextensions-settings.json` → `emitWebExtensionSettings`, and any crash-collector fragment if the collector needs manifest-derived config). No `tracked` key for yarn-managed or derived-only fragments — the byte-identity gate skips rows without one and the dedicated `verify-*.mjs` gate pins the tracked side.

**Sink guard on every emitted value** (`scripts/generate.mjs` lines 850-859):

```js
function assertEmittable(path, value) {
    if (typeof value !== 'string' || UNEMITTABLE.test(value)) {
        report([
            `${path} cannot be written into a build setting as it stands. A brand value may not `
            + 'contain a quote, a backslash, a dollar sign, a backtick, a tab or a line break. '
            + `Open ${MANIFEST_NAME}, correct it, then run: ${RERUN}`,
        ]);
    }
    return value;
}
```

Copy: pass every new manifest value (`install_url`, npm package/version, local path, crash_report URL) through `assertEmittable` at emission — rejection only, never escaping. `mozillaEndpointPrefs` (lines 2212-2229) already repoints `breakpad.reportURL` off `[urls].crash_report`; TEL-04 needs no new pref plumbing, only a stated value. `manifestEndpointSources` (lines 2247-2271) picks up `urls.crash_report` automatically — the collector host flows into allowlist coverage with zero extra code.

---

### `scripts/lib/config-schema.json` (config/schema, validation)

**Analog:** itself — `extensions[].*` block (lines 199-231).

**Existing keys to mirror** (`scripts/lib/config-schema.json` lines 199-231):

```json
    "extensions[].id": {
      "type": "string",
      "required": true,
      "regex": "^[a-z0-9][a-z0-9-]*\\.[a-z0-9][a-z0-9.-]*$",
      "regex_help": "a namespaced extension id: the publisher, a dot, then the extension name; ...",
      "regex_example": "acme.gadget"
    },
    "extensions[].source": { "type": "string", "required": true },
    "extensions[].version": {
      "type": "string",
      "required": false,
      "regex": "^[A-Za-z0-9][A-Za-z0-9._-]*$",
      "regex_help": "an exact pinned version, never a range or a floating tag; ...",
      "regex_example": "1.2.3"
    },
    "extensions[].url": {
      "type": "string",
      "required": false,
      "regex": "^https://[^\\s\\x00-\\x1f\\x7f]+$",
      ...
    },
    "extensions[].sha256": {
      "type": "string",
      "required": true,
      "regex": "^[0-9a-f]{64}$",
      ...
    }
```

Copy: keep `id`/`source`/`sha256` as-is. New keys follow the same four-field shape (`type`, `required`, `regex`, `regex_help`, `regex_example`): npm-kind package name + exact `version` reuse + `integrity` (SRI `sha512-…` shape); local-path `path` (relative-path regex in the `variants[].branding_dir` style, line 189: `^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$`); `webextensions[].*` table (`id` as add-on ID, `installation_mode` enum left to the validator like `telemetry.level` — no schema regex for enums by design, cf. `telemetry.level` line 146-149 with no regex, enforced by `validateTelemetry`), `install_url` (`^https://` or `^file:///` shape). Conditional-required logic (`version` required iff `openvsx`/`npm`, `url` iff `url`, `path` iff `local-path`) lives in `validateExtensionElements`, NOT in `required` flags — the header comment at line 2 (`$comment`) forbids a second key list, so the validator reads `SCHEMA_KEYS`, never its own copy.

---

### `scripts/verify-extension-pins.mjs` (verifier/gate, derive-compare-hash)

**Analog:** itself — the 3-step gate + `archiveSuffix` + self-test (whole file, 475 lines). Extend in place.

**Step structure to preserve** (header contract, lines 8-26; `archiveSuffix`, lines 101-106; sha256, lines 108-110):

```js
function archiveSuffix(url) {
    if (url.endsWith('tar.gz')) return '.tar.gz';
    if (url.endsWith('vsix')) return '.vsix';
    if (url.endsWith('theia')) return '.theia';
    return null;
}
```

Copy: npm-kind tarballs end in `.tgz`/`tar.gz` — extend `archiveSuffix` (or add a per-kind suffix resolver) so npm entries hash `<pluginsDir>/<id>.tar.gz`; local-path entries hash the packed tgz the download step keeps. Step 1 (fragment equality, lines 129-175) and step 2 (block equality, lines 206-236) are kind-agnostic — only the float guard (lines 243-253) needs a per-kind equivalent: for npm, tarball-URL equality against the URL recorded at pin time (exact-pin + review at pin time; hash alone does not stop a malicious newly-published version). Direct-URL precedent (lines 36-39: URL entries skip the version-segment rule; step-3 hash catches floats) is the model comment to mirror for kinds whose pin is hash-only.

**Self-test fixture idiom to extend** (`scripts/verify-extension-pins.mjs` lines 298-310, 392-432):

```js
function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), 'extension-pins-selftest-'));
    ...
        // A fully synthetic fixture: no network, no real extensions. Two
        // entries (one per source), packed archives of random bytes whose
        // pins are computed over those exact bytes, ...
        const bytesA = randomBytes(64);
```

Copy: add Plant 4 (npm-kind: floated tarball URL / `latest` resolution rejected naming the entry) and Plant 5 (local-path: absent path fails naming the entry; re-packed bytes hash to the pin). Synthetic Acme entries only (`acme.*`, `example.org` URLs) to stay sweep-clean per 05-02 precedent. Control-green-first is mandatory — every plant block starts from `writeFixture()` reset (lines 409, 432, 453).

---

### `scripts/verify-webextensions.mjs` (NEW verifier/gate, derive-compare)

**Analog:** `scripts/verify-theia-endpoints.mjs` (full file, 290 lines) — closest existing gate over a tracked JSON consumer with a manifest derivation; plus `scripts/verify-telemetry.mjs` lines 75-145 for the fragment+block two-step.

**Imports pattern** (`scripts/verify-theia-endpoints.mjs` line 61):

```js
import { emitEndpointHosts, manifestEndpointHosts, manifestEndpointSources, mozillaEndpointPrefs, resolveConfig } from './generate.mjs';
```

Copy: `import { emitWebExtensionSettings /* new emitter */, resolveConfig } from './generate.mjs';` — the gate derives through the generator's own emitter, never a kept copy.

**Arg-parsing + root constants** (`scripts/verify-theia-endpoints.mjs` lines 63-78):

```js
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-webextensions';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}

const MANIFEST_REL = 'configuration.toml';
const FRAGMENT_REL = 'generated/webextensions-settings.json';
const POLICY_REL = 'powerbrowser/distribution/policies.json';
const RERUN_GENERATE = 'node scripts/generate.mjs';
```

**Fresh-clone SKIP rule** (`scripts/verify-theia-endpoints.mjs` lines 105-120; also `scripts/verify-telemetry.mjs` lines 96-99):

```js
    if (!existsSync(fragmentBytes)) {
        skipped.push(`${FRAGMENT_REL} is absent (nothing generated in this copy yet) -- fragment equality unchecked; run ${RERUN_GENERATE} to cover it.`);
    } else {
```

Copy verbatim: absent `generated/` SKIPS the fragment half, never fails. The tracked `policies.json` is committed, so the `ExtensionSettings`-key equality half always runs (cf. `verify-telemetry.mjs` lines 124-142: block read, missing-block fails naming the key, drift fails naming key + both values, next step names the surgical copy-over).

**Allowlist leg** (same file, lines 141-149): for each `install_url` origin derived from the manifest, require presence in `endpoint-allowlist.json` hosts, failing NAMING the host. Stale-marked-entry check (lines 151-166) applies if the new rows carry `manifest` fields — planner decides; the pending-todo sketch (`hosts`-for-allowlist derived from the manifest) says derive, don't hand-keep.

**Self-test shape** (lines 204-284): green control on the unmutated tree first, then one plant per direction (drifted `ExtensionSettings` key → red naming the add-on id; absent allowlist origin → red naming the host; stale tracked key after entry removal → red naming the id), each asserting the failure names the defect. Exit `process.exit(selfTest())` vs `main()` dispatch at lines 286-290.

---

### `scripts/crash-collector.mjs` (NEW service, request-response)

**Analog (partial):** `scripts/verify-mar-update-hop.mjs` `buildUpdateXml`/`parseUpdateXml` single-source emission idiom (lines 101-120) + `theia/extensions/telemetry/src/browser/telemetry-sender.ts` zero-dependency precedent (lines 1-24). No HTTP-server precedent exists under `scripts/` — the contract surface below comes from RESEARCH.md §Code Examples (Antenna submission contract), not from the tree.

**Zero-dependency header to mirror** (`telemetry-sender.ts` lines 1-9):

```js
// DELIBERATELY ZERO-DEPENDENCY: this file imports nothing, so the unit
// suite (test/telemetry-sender.test.mjs) imports it straight from src/
// under plain node with no build, no browser and no install ...
// Erasable syntax only ...
```

Copy: `node:http` + `node:crypto` stdlib only, importable under plain node with no install. No new registry dependencies (RESEARCH.md legitimacy audit: none).

**Single-source format idiom to mirror** (`verify-mar-update-hop.mjs` lines 101-117):

```js
export function buildUpdateXml({ marBytes, marUrl, appVersion, platformVersion, buildID, displayVersion, updateType = 'minor' }) {
    const { hashValue, size } = marDigest(marBytes);
    return `<?xml version="1.0" encoding="UTF-8"?>\n`
        + `<updates>\n`
        ...
}
```

Copy: export pure functions for the contract surface (`parseMultipart`, `buildCrashIdResponse` → `` `CrashID=${uuid}` ``, `buildDiscardResponse` → `` `Discarded=${rule}` ``) so the contract gate tests them without sockets; the HTTP layer is a thin wrapper. Deterministic-by-construction discipline carries over: no timestamps/nonces in the response format; emit-twice byte-identity where applicable.

**Contract surface to implement** (RESEARCH.md §Code Examples — no tree source):

```js
// POST /submit, Content-Type: multipart/form-data; boundary=..., Content-Length set.
// Minidump part MUST be named `upload_file_minidump` (name, not filename).
// Accepted: HTTP 200 + body `CrashID=<uuid>`.
// Soft-reject (throttled): HTTP 200 + body `Discarded=<rule>`.
// Malformed: HTTP 400 + body `Discarded=<reason>` (e.g. malformed_no_annotations).
```

Plus: part-size caps + total-body cap (413 per Antenna precedent), non-multipart → 400 `malformed_wrong_content_type`, loopback bind by default, store scoped to its store dir, local CrashID record the `about:crashes` proof reads. **Do NOT prove via a native crash** — native reporter is compiled out (`.mozconfig:13` `--disable-crashreporter`); acceptance is synthetic-submit → `CrashID=` → local record. PII/retention/throttle policy is a written doc FIRST (Antenna `throttler.py` as model), code enforces stated rules. User-facing error strings: name "Power Browser", plain language, real next step; identifiers to diagnostics rows only (CLAUDE.md user-facing-copy rule).

---

### `scripts/verify-crash-collector.mjs` (NEW verifier/gate, contract test)

**Analog:** `scripts/verify-extension-pins.mjs` self-test (lines 296-464) for the plant→red-naming-the-defect idiom + `scripts/verify-mar-update-hop.mjs` lines 48-87 for `node:crypto` + reporter plumbing in a no-network gate.

**Assertion plumbing to copy** (`scripts/verify-mar-update-hop.mjs` lines 69-87; identical skeleton in `scripts/verify-installer-schema.mjs` lines 72-91):

```js
function makeReporter() {
    const failures = [];
    return {
        failures,
        fail(msg) { failures.push(msg); },
        eq(label, actual, expected, where) {
            if (actual === expected) return true;
            failures.push(
                `${label}: ${where} carries ${JSON.stringify(actual)} but must equal ` +
                `${JSON.stringify(expected)}`,
            );
            return false;
        },
    };
}
```

**Contract tests to write** (RESEARCH.md §Validation Architecture): well-formed multipart POST → 200 `CrashID=` (in-process, no sockets — call the exported parse/respond functions; spawn loopback HTTP only if the collector cannot be exercised in-process); malformed (missing `upload_file_minidump`, wrong content-type) → 400 `Discarded=<reason>`; over-cap body → 413; throttle rule hit → 200 `Discarded=<rule>`. Each plant asserts red naming the rule, control-green-first. Honestly `--quick`: `node:crypto` + text/bytes in mkdtemp, no build/browser/display/network (same honesty note as every gate header).

---

### `powerbrowser/distribution/policies.json` (tracked consumer, transform target)

**Analog:** itself (lines 1-7) + the `theiaPlugins` copy-over pattern.

```json
{
  "policies": {
    "AppUpdateURL": "https://updates.powerbrowser.org/update.xml",
    "DisableTelemetry": true,
    "DisableFirefoxStudies": true
  }
}
```

Copy: generator copy-over sets ONLY the `ExtensionSettings` key, leaving the three existing keys byte-identical (the `AppUpdateURL` precedent — MAR-hop gate reads `policies.AppUpdateURL` from this file, `verify-mar-update-hop.mjs` line 58 `POLICY_REL`). Emission shape per RESEARCH.md §Code Examples:

```json
{ "policies": {
    "ExtensionSettings": {
        "downstream-addon@example.org": {
            "installation_mode": "force_installed",
            "install_url": "https://addons.example.org/downstream-addon-1.2.3.xpi"
        }
    }
} }
```

`*` with `blocked` denies everything not listed; `force_installed`/`normal_installed` invalid for `*`. ESR signing note: `xpinstall.signatures.required=false` permits unsigned self-hosted XPIs — document, confirm against pinned ESR tag at plan time (MEDIUM confidence). Mechanism only, zero bundled extensions (REQUIREMENTS.md bar; pending-todo constraint). The welcome-widget discovery sketch in the pending todo is OUT of scope (no curated list, no widget edits).

---

### `powerbrowser/endpoint-allowlist.json` (tracked allowlist, coverage set)

**Analog:** itself — entry shape + manifest-driven pref expects.

**Host entry shape** (lines 24-28, the fork-update-host precedent — the closest analog for a new downstream-ops host):

```json
    {
      "host": "updates.powerbrowser.org",
      "disposition": "allow",
      "reason": "08-04 (PKG-02, T-08-04a): the fork's own update-descriptor host. ..."
    }
```

Copy: collector host entry (`allow`, loopback or stated `urls.crash_report` host with reason + `manifest: "urls.crash_report"` field so the staleness check in `verify-theia-endpoints.mjs` lines 151-166 tracks it); each `install_url` origin entry (with reason + `manifest` field naming the webextensions key, per the pending-todo hosts-for-allowlist sketch — derived from the manifest, never hand-kept). New hostnames/ids reviewed against `inventory/brand-tokens.json` classes; stage before trusting the residue scan.

**Pref-expect shape** (lines 156-160 — the crash pref this phase repoints):

```json
    {
      "name": "breakpad.reportURL",
      "expect": "",
      "reason": "TEL-03 (04-04) defence in depth: blanked so the crash-report path has nowhere to send even though the reporter itself is compiled out (--disable-crashreporter). ... Manifest-driven -- repointed to [urls].crash_report when stated; this expect tracks the shipped unstated key, and scripts/verify-theia-endpoints.mjs asserts it stays in sync with the manifest derivation."
    },
```

Copy: when `[urls].crash_report` is stated, this `expect` tracks the derived value — updated as the derivation, asserted by `verify-theia-endpoints.mjs` step 4 (lines 168-182), never edited to make the gate green.

---

### `configuration.toml` (manifest source, transform source)

**Analog:** itself — existing `[urls]`, `[telemetry]`, `[[extensions]]` declarations. New: `npm`/`local-path` `[[extensions]]` entries (exact pins + sha256, fail-loud), new `[[webextensions]]` table (id, installation_mode, install_url + hosts for allowlist derivation), stated `[urls].crash_report` pointing at the downstream collector. No tree read needed beyond the schema — the schema + validator own the shapes.

---

### `theia/extensions/telemetry/test/telemetry-sender.test.mjs` (test, event-driven)

**Analog:** itself (239 lines, plain-node, dependency-free) + sender `levelAllowsEvent` (`telemetry-sender.ts` lines 72-80):

```js
function normalizeLevel(raw: unknown): TelemetryLevel {
    return (TELEMETRY_LEVELS as readonly string[]).includes(raw as string) ? (raw as TelemetryLevel) : 'off';
}

export function levelAllowsEvent(level: TelemetryLevel, kind: TelemetryEventKind): boolean {
    if (level === 'off') return false;
    if (kind === 'error') return true;
    return level === 'all';
}
```

Copy: separation cases ride the existing suite — error event at level `crash` → admitted to the ping endpoint (telemetry pipeline); minidump bytes never enter the sender (report path is the Antenna collector). Unknown levels fail closed to `off` — new cases assert the closed default. Run via `verify-telemetry.mjs` step 4 (`runChild('suite', process.execPath, [TEST_REL])`, lines 167-175); discrimination proof idiom is `TELEMETRY_TEST_STUB=always-send` (lines 218-229). No second sender class.

---

### `scripts/verify-platform.sh` (registry, batch dispatch)

**Analog:** itself — the `extension-pins` / `telemetry` / `theia-endpoints` row pairs.

```sh
    "extension-pins|node $REPO_ROOT/scripts/verify-extension-pins.mjs"
    "extension-pins-self-test|node $REPO_ROOT/scripts/verify-extension-pins.mjs --self-test"
```

(`scripts/verify-platform.sh` lines 3984-3985; `telemetry` pair lines 4014-4015; `theia-endpoints` pair lines 4075-4076; `mar-update-hop-self-test` line 4106.)

Copy: append one `CHECKS` row pair per new gate (`webextensions`, `crash-collector`), each with the 10-20-line `# NEW (09-..)` comment naming what it asserts DIFFERENTLY from the rows above (the convention every pair follows) plus the honesty note (`--quick`: text/bytes off disk + mkdtemp; full `mar-update-hop`-style evidence rows are emphatically not `--quick`). Never a sibling driver (CLAUDE.md rule 8).

---

### Tier-3 fixture matrix — BLD-02 (procedure, batch)

**Analog (partial):** `scripts/verify-downstream-fixture.mjs` contract (lines 1-44) + `docs/BUILD.md` packaging procedure + 08-05 drill-then-restore / staged-unexecuted discipline. No exact file analog — this is a procedure run, not a new gate file.

```js
// CONTRACT. --source <committed-fixture-dir> [--expect-fail <substring>];
// --all --fixtures-root <dir> drives every committed fixture ...
// Per fixture the harness copies the source to a mkdtemp external dir
// (path-independence -- never generates from inside the repo), snapshots
// the platform generated/ tree hashes, then runs env PB_CONFIG_DIR=<stage>
// node scripts/generate.mjs in a child process.
```

(`scripts/verify-downstream-fixture.mjs` lines 9-18.)

Copy: per-fixture cells over the NEW source kinds on real built artifacts — one real pinned Open VSX entry + synthetic npm/local-path fixtures (Acme ids, `example.org` URLs) through download → hash → build; `nix develop .#theia` for yarn/download/build, `nix develop .#firefox` for Gecko. 08-05 host record (nix-linux reachable, pkg-win11/pkg-macos staged with operator unblocks) is re-read, not re-proven. `${targetPlatform}` per-target assertions run the download per target. Drill-then-restore: post-run tree hashes equal the snapshot.

---

### Re-pin runbook — UPD-04 (procedure, batch)

**Analog:** `scripts/verify-upstream-pins.mjs` Theia half, steps 5-7 (lines 44-70) — the enforcement contract the runbook executes against.

```js
// Theia half (05-03, CFG-06/UPD-02): theia_release agreement over three
// steps. ...
//  5. the manifest pin: upstreams.theia_release must be set and must be a
//     strict numeric triple ...
//  6. every @theia/* pin in theia/package.json resolutions and in every
//     member theia/applications/*/package.json and
//     theia/extensions/*/package.json ... equals the manifest
//     pin. The one exception is @theia/monaco-editor-core, excluded by
//     exact package name ...
//  7. every resolved @theia tarball stanza in theia/yarn.lock (same
//     exception) carries the manifest pin as its version. ...
```

Copy: runbook steps are RESEARCH.md §Code Examples "Theia re-pin procedure" verbatim (bump `upstreams.theia_release` → set every `@theia/*` pin → re-resolve `yarn.lock` → `nix develop .#theia` → `yarn install` → `tsc -b` every extension INCLUDING `@powerbrowser/token-gate` → all plain-node suites). Intactness = token-gate compiles + backend-contribution tests green at the new pin. Token-gate backend (`src/node/token-gate-backend-module.ts`, `parent-watchdog-backend-contribution.ts`) is the named proof artifact. Agreement proven by `verify-upstream-pins.mjs --self-test` + full row, never by eyeballing versions.

---

## Shared Patterns

### Assertion plumbing (every new `verify-*.mjs`)
**Source:** `scripts/verify-mar-update-hop.mjs` lines 69-87 (identical skeleton in `scripts/verify-installer-schema.mjs` lines 72-91; `makeReporter` variant in `scripts/verify-extension-pins.mjs` lines 82-88)
**Apply to:** `scripts/verify-webextensions.mjs`, `scripts/verify-crash-collector.mjs`
```js
function makeReporter() {
    const failures = [];
    return {
        failures,
        fail(msg) { failures.push(msg); },
        eq(label, actual, expected, where) {
            if (actual === expected) return true;
            failures.push(
                `${label}: ${where} carries ${JSON.stringify(actual)} but must equal ` +
                `${JSON.stringify(expected)}`,
            );
            return false;
        },
    };
}
```
Failures accumulate — one run reports every wrong file, not just the first. Every failure names the entry/host/id + both values + the next step (re-run command or surgical copy).

### CLI + root constants (every new script)
**Source:** `scripts/verify-theia-endpoints.mjs` lines 63-78
**Apply to:** `scripts/verify-webextensions.mjs`, `scripts/crash-collector.mjs` (arg shape as fits), `scripts/verify-crash-collector.mjs`
```js
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'verify-theia-endpoints';

const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
for (const a of args) {
    if (a !== '--self-test') {
        console.error(`${NAME}: FAIL -- unknown argument '${a}'`);
        process.exit(2);
    }
}
```
Unknown args exit 2. PASS/FAIL lines carry the `NAME` prefix: `PASS -- ...`, `FAIL -- N problem(s)` + `  - ` bullets, `--self-test PASS`.

### Derive-and-compare, never hand-kept lists
**Source:** `scripts/verify-extension-pins.mjs` line 127 (`JSON.parse(emitTheiaPlugins(config, { id: 'dev' }))`); `scripts/verify-theia-endpoints.mjs` lines 96-103
**Apply to:** all new/changed gates
```js
    const { failures: resolveFailures, config } = resolveConfig(join(root, MANIFEST_REL), undefined);
    if (resolveFailures.length > 0) {
        for (const f of resolveFailures) failures.push(`${MANIFEST_REL} is red, so the endpoint coverage proves nothing: ${f}`);
        return { failures, skipped };
    }
    const expectedHosts = manifestEndpointHosts(config);
```
Every expectation derived at check time from the manifest through the generator's own resolver/emitter. A manifest-red tree fails naming the manifest, never the pins.

### Self-test with control-green-first + planted faults both directions
**Source:** `scripts/verify-theia-endpoints.mjs` lines 204-217 (control), `scripts/verify-telemetry.mjs` lines 218-229 (stub discrimination)
**Apply to:** every new gate's `--self-test`
```js
    // Green control first: the unmutated tree proves nothing if red.
    const control = runChecks(REPO_ROOT);
    if (control.failures.length > 0) {
        complain('unmutated control', `is already red, so the plants below would mean nothing: ${control.failures.join(' | ')}`);
    } else {
        console.log(`  ok  unmutated control -> coverage green`);
    }
```
Fixtures in `mkdtempSync(join(tmpdir(), '<name>-selftest-'))`, synthetic Acme data only, `rmSync(dir, { recursive: true, force: true })` in `finally`. Each plant must go red NAMING the defect. New gates need plants in both directions (drifted-tracked-side AND drifted-fragment-side; absent-coverage AND stale-coverage).

### Fresh-clone SKIP (fragment gates)
**Source:** `scripts/verify-telemetry.mjs` lines 96-99
**Apply to:** `scripts/verify-webextensions.mjs`, extended `verify-extension-pins.mjs` kinds
```js
    const fragmentBytes = readBytes(root, FRAGMENT_REL);
    if (fragmentBytes === null) {
        skipped.push(`${FRAGMENT_REL} is absent (nothing generated in this copy yet) -- fragment equality unchecked; run ${RERUN_GENERATE} to cover it.`);
    } else {
```
`generated/` is gitignored — absent fragment SKIPS, never fails. Tracked consumer sides (package.json block, `policies.json` key) always run. (Contrast: `verify-mar-update-hop.mjs` FAILS on absent evidence — that gate's subject is a proof run, not generated output.)

### Copy-over: surgical key, siblings byte-identical
**Source:** `scripts/verify-telemetry.mjs` lines 138-142
**Apply to:** `theiaPlugins` npm/local-path entries, `ExtensionSettings` key, any new block
```js
        failures.push(`${APP_PKG_REL}'s ${BLOCK_KEY} block is ${JSON.stringify(block)} but ${MANIFEST_REL} emits ${JSON.stringify(expected)} -- stale output. Next step: copy the block from ${FRAGMENT_REL} (that key only; leave every sibling key byte-identical), then re-run this check.`);
```

### Error-copy shape (generator failures + gate messages)
**Source:** `scripts/generate.mjs` lines 639-644 (entry-naming + rerun); `scripts/verify-extension-pins.mjs` lines 284-289 (hash mismatch naming entry + both digests)
```js
            r.fail(
                `${rel} hashes to ${actual} but ${MANIFEST_REL} pins ${entry.sha256} for the entry with id ${JSON.stringify(entry.id)} -- `
                + `the bytes drifted (corrupted download, or the remote re-resolved a float). Next step: delete ${rel}, re-run the download step, `
                + `and if it stays red, re-bootstrap the pin (fetch the archive, sha256sum it, paste the digest into ${MANIFEST_REL}).`,
            );
```
User-facing strings name "Power Browser", plain language, real next step; no pref keys/sentinels/ports/raw exceptions (CLAUDE.md rule; `shell-error-copy-no-internals` enforced by pattern).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/crash-collector.mjs` HTTP layer | service | request-response | No HTTP-server precedent under `scripts/` — only the zero-dependency module idiom (telemetry-sender) and the single-source emission idiom (mar-update-hop) transfer; socket/multipart/throttle logic follows RESEARCH.md Antenna contract, not tree code |
| Tier-3 fixture matrix execution record | procedure | batch | `verify-downstream-fixture.mjs` covers the generate-level harness shape, but per-fixture real-artifact builds over new source kinds + per-target downloads have no static-gate analog — 08-05 SUMMARY discipline (drill-then-restore, staged-unexecuted cells) is the process precedent |

## Metadata

**Analog search scope:** `scripts/*.mjs`, `scripts/lib/config-schema.json`, `powerbrowser/distribution/policies.json`, `powerbrowser/endpoint-allowlist.json`, `theia/extensions/telemetry/{src,test}`, `scripts/verify-platform.sh` CHECKS, `.planning/todos/pending/`, `docs/BUILD.md`, `configuration.toml`
**Files scanned:** 15 (8 fully read, 5 targeted-range reads of `generate.mjs`/`verify-platform.sh`, 2 glob-verified)
**Pattern extraction date:** 2026-09-05
**Tracked-source gate:** every analog path above verified via `git ls-files` (non-empty = tracked); no mirror/install/runtime paths emitted
