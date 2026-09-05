# Phase 09: Extensions + Crash Pipeline - Research

**Researched:** 2026-09-05
**Domain:** Theia extension source kinds (npm/local-path), Gecko WebExtension policy declaration, minimal crash collector (Antenna-protocol), tier-3 fixture builds, Theia re-pin
**Confidence:** MEDIUM-HIGH (in-tree mechanics HIGH — read from live tree this session; external protocol claims MEDIUM — official docs via web search, cross-checked)

## Summary

Phase 09 adds two new Theia-plugin source kinds (`npm`, `local-path`) into the EXT-01 chain that Phase 04 proved, declares Gecko WebExtensions through `ExtensionSettings` in the already-tracked `powerbrowser/distribution/policies.json`, and ships a minimal Antenna-protocol crash collector as downstream-runnable platform tooling. No new build-system dependencies and no new npm registry dependencies are required: the collector is a Node-stdlib HTTP server, npm resolution uses `npm view`/tarball fetch, and local-path packing uses `npm pack` or a plain tarball hash.

The in-tree extension points are exact and small. `scripts/generate.mjs` owns the whole chain: `EXTENSION_SOURCES` allowlist plus `validateExtensionElements()` (validation), `openVsxFileUrl()`/`emitTheiaPlugins()` (URL resolution → `generated/theia-plugins.json` fragment → copy-over of the `theiaPlugins` block into `theia/applications/browser/package.json`), and `scripts/verify-extension-pins.mjs` (fragment equality + version-segment float guard + sha256 over `--packed` archives). Both new kinds resolve *into* that same one-fragment path: npm resolves to a pinned tarball URL at generate time, local-path packs to a hashable archive whose bytes the pin covers. Per-target `${targetPlatform}` is a downloader-side placeholder the stock `theia download:plugins` already expands — the generator must emit it through verbatim, never expand it.

For crashes, the locked shape fits the tree cleanly: the native reporter stays compiled out (`--disable-crashreporter` in `.mozconfig`), `breakpad.reportURL` is already manifest-driven off `[urls].crash_report` through `mozillaEndpointPrefs()`, and the Theia side already separates error events (`sendErrorData`, admitted at level `crash`) from usage events. The collector only needs to speak the Antenna submission contract (multipart POST with `upload_file_minidump` → `CrashID=`), record IDs the way `about:crashes` expects, and carry the written PII/retention/throttle policy. The one acceptance-criterion trap: with the native reporter compiled out, Gecko records no CrashIDs itself, so the `about:crashes` half of the success criterion must be proven through the collector round-trip (submit → `CrashID=` → local record visible), not through a native crash.

**Primary recommendation:** Extend the EXT-01 chain in place (schema keys + resolver branches + per-kind pin-verify handling + registry rows), emit `ExtensionSettings` from the manifest into the tracked `policies.json`, build the collector as a zero-dependency Node script under `scripts/` with its own `verify-*.mjs` agreement gate, and ride the BLD-02/UPD-04 drills on the new source kinds exactly the way 08-05 ran drills on installer surfaces.

## User Constraints (from CONTEXT.md)

### Locked Decisions

Locked pre-decisions (milestone scoping + research):
- EXT-02 reuses the EXT-01 chain (one `theiaPlugins`-fragment → copy-over → pin-verify path): npm resolves to a pinned URL, local-path packs to hashable content. Exact pins + integrity digests, fail-loud.
- EXT-03 via `ExtensionSettings` in the already-emitted `distribution/policies.json` (not `distribution/extensions/`); closes the STATE.md pending todo (tagged resolves_phase: 9).
- TEL-04: minimal Antenna-protocol collector + crash-ping/report separation + PII/retention/throttle policy; native reporter stays compiled out (Phase 08 locked this; no Breakpad re-enablement, no Socorro, no mini-breakpad-server).
- BLD-02 tier-3 per-fixture builds run over the NEW source kinds on real built artifacts. UPD-04 Theia re-pin proof keeps token-gate intact.
- Nonstop autonomous defaults apply (see STATE.md standing instructions); plan with `--no-reversibility-gates`.

### Claude's Discretion

All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)

None — discuss phase skipped.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXT-02 | npm and local-path extension source kinds ship — exact pins with integrity digests, fail-loud on mismatch — reusing the EXT-01 chain, with per-target `${targetPlatform}` resolution | EXT-01 chain mapped end-to-end (§Architecture Patterns); npm `dist.tarball`/`dist.integrity` resolution + `npm pack` for local-path (§Standard Stack, §Code Examples); `${targetPlatform}` passthrough rule (§Common Pitfalls #1) |
| EXT-03 | WebExtensions declaration via `ExtensionSettings` in the already-emitted `distribution/policies.json`, closing the STATE.md pending todo | `ExtensionSettings` schema + `install_url` forms incl. `file:///` (§Standard Stack, §Code Examples); ESR signing carve-out (§Common Pitfalls #2); pending-todo constraints (allowlist cost, no curated list) (§Architecture Patterns) |
| TEL-04 | Minimal Antenna-protocol collector (multipart POST, `upload_file_minidump`, `CrashID=` responses) with crash-ping/report separation + PII/retention/throttle policy; native reporter stays compiled out; no Socorro/`mini-breakpad-server` | Antenna submission contract (§Standard Stack, §Code Examples); crash-ping vs report separation (§Architecture Patterns); `breakpad.reportURL` derivation already in tree (§Architecture Patterns); `about:crashes` trap (§Common Pitfalls #3) |
| BLD-02 | Tier-3 per-fixture builds pass over the new source kinds on real built artifacts | 08-05 drill-then-restore + staged-unexecuted discipline (§State of the Art); per-fixture extension matrix shape (§Validation Architecture) |
| UPD-04 | Theia re-pin proof passes with the token-gate backend intact | Re-pin agreement surface in `verify-upstream-pins.mjs` steps 5–7 (§Architecture Patterns); token-gate module shape (§Standard Stack) |

## Project Constraints (from CLAUDE.md)

1. **Never fork or patch Theia core** — new work composes as `@powerbrowser/*` extensions; upstream adopted by re-pinning only. Relevant to UPD-04: the re-pin touches pins, never framework source.
2. **Never modify Gecko outside the patch stack** — `upstream/` fetched by script, never hand-edited; Firefox internals only through `powerbrowser/shell/PowerBrowserAPI.sys.mjs`. The collector and policy work touch no Gecko code at all.
3. **Design for the bridge** — nothing in this phase touches `TabUriRegistry` or presentation; no NEW coupling to full-window presentation allowed.
4. **Repo path contains no space** — holds (`/home/chris/coding/Power-Browser`).
5. **Theia is the default GUI; stock chrome reachable; no custom browser chrome authored** — no GUI work in this phase; the welcome-widget discovery sketch in the pending todo is NOT in scope (no curated list, no widget edits for discovery).
6. **Residual-brand scan is a permanent gate** — any new file must be staged before trusting a green scan; new tokens (collector hostnames, extension ids) must not collide with brand-token classes.
7. **Patches regenerated, never text-edited** — this phase should need zero patch changes; if one seems needed, reshape the change.
8. **One driver, one registry** — every new gate is a row in `scripts/verify-platform.sh` `CHECKS`, never a sibling driver. New checks derive expectations from the tree and carry `--self-test` with planted faults in both directions.
9. **No internal identifiers in user-facing text** — collector error strings name "Power Browser", plain language, real next step; identifiers go to diagnostics rows.
10. **Builds in Nix dev shells** — `nix develop .#theia` for yarn/download/build work; `nix develop .#firefox` for tier-3 Gecko builds. `yarn` does not work outside the shell.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Theia plugin resolution + pinning (EXT-02) | Build tooling (generator + scripts) | — | Pure generate-time derivation; no runtime tier involved |
| WebExtension declaration (EXT-03) | Build tooling (generator → policies.json) | Gecko runtime (policy engine installs/updates) | Generator owns bytes; Firefox policy engine owns install behavior |
| Crash report ingestion (TEL-04 collector) | Downstream ops tooling (`scripts/`, runs beside deployment) | Theia sidecar (error events via existing sender) | Collector is server-side infra, same status as `scripts/`; client side reuses the existing sender |
| Crash-ping vs report separation | Theia sidecar (sender level gate) + collector (throttle/store policy) | — | Ping path already exists; report path is the new collector contract |
| Tier-3 fixture builds (BLD-02) | Build hosts (nix-linux reachable; pkg-win11/pkg-macos staged) | — | Proving on real artifacts, per 08-05 discipline |
| Theia re-pin (UPD-04) | Build tooling (manifest pin → resolutions → lockfile) | Theia sidecar (token-gate backend must stay green) | Pin agreement enforced statically; intactness proven by compile + suite |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Stock `theia download:plugins` + `theiaPlugins` block | `@theia/cli` 1.74.1 (pinned) | Download + bundle declared plugins into the sidecar build | The only supported plugin-download path; `--packed` keeps hashable archives; `${targetPlatform}` placeholder is its native per-target mechanism [VERIFIED: theia/applications/browser/package.json scripts; CITED: https://github.com/eclipse-theia/theia/blob/master/dev-packages/cli/README.md] |
| Node stdlib (`node:http`, `node:crypto`) | Node ≥22 (engines) | Minimal Antenna-protocol collector | Zero new dependencies; multipart parse + sha handling is small and fully testable under plain node, matching the telemetry sender's zero-dependency precedent [VERIFIED: theia/extensions/telemetry/src/browser/telemetry-sender.ts header] |
| Firefox `ExtensionSettings` enterprise policy | Pinned ESR 153 line | Declare force/auto-installed WebExtensions | The Mozilla-recommended enterprise install mechanism; lives in the already-tracked `distribution/policies.json` [CITED: https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/] |
| npm registry metadata (`dist.tarball`, `dist.integrity`) | npm CLI on host | Resolve npm-kind entries to pinned URL + SRI digest | Registry-authoritative exact-version resolution; `EINTEGRITY` fail-loud semantics are the model for the pin-verify step [CITED: https://docs.npmjs.com/cli/v8/commands/npm-view] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `npm pack` | npm CLI on host | Pack a local-path directory into a hashable `.tgz` at generate/verify time | For `local-path` entries: hash the packed bytes, not the directory listing |
| Open VSX registry file API | open-vsx.org | Pinned `.vsix` download URLs | `openvsx` source kind only; URL shape already implemented in `openVsxFileUrl()` |
| `sha256sum` / `node:crypto` | host / stdlib | Digest computation for pins | Bootstrap pins (`fetch archive → sha256 → paste into manifest`) and verifier hashing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node-stdlib collector | `mini-breakpad-server` | Archived upstream; adopts a second codebase for a ~100-line contract — rejected by locked decision |
| Node-stdlib collector | Full Socorro self-host | Socorro declines external users at v1.1 scale; revisit only on crash-volume evidence (SUMMARY.md defer list) |
| `ExtensionSettings` in `policies.json` | `distribution/extensions/` sideload dir | Rejected by locked decision; the extensions-dir path also bypasses update/pin semantics the policy gives for free |
| npm-kind via committed tarball | Registry resolve at generate time | Committing tarballs bloats the tree and duplicates the vendor; offline-from-vendor proof covers the disconnected case instead |

**Installation:** No new packages. `npm install [nothing]` — this phase adds zero registry dependencies.

**Version verification:** No new registry dependencies to verify. Existing pins reconfirmed in-tree: `@theia/*` `1.74.1` throughout `theia/package.json` resolutions [VERIFIED: theia/package.json], `firefox_esr_tag = "FIREFOX_153_1_0esr_RELEASE"` [VERIFIED: configuration.toml:107], `theia_release = "1.74.1"` [VERIFIED: configuration.toml:108].

## Package Legitimacy Audit

No external packages are installed by this phase. The collector is Node-stdlib-only by design (matching the telemetry sender's zero-dependency precedent); npm-kind resolution shells out to the host npm CLI rather than adding an npm-API dependency; `npm pack` is host tooling, not a tree dependency.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| *(none)* | — | — | No new registry dependencies recommended |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious SUS:** none.

*Note for planner: if execution discovers a need for a registry dependency (e.g. an XPI-signing helper), run the Package Legitimacy Gate then — do not assume.*

## Architecture Patterns

### System Architecture Diagram

```
configuration.toml [[extensions]] (openvsx | url | npm | local-path)
        │
        ▼
scripts/generate.mjs ── validate ──► resolve to URL ──► generated/theia-plugins.json
   (EXTENSION_SOURCES,                                        (one URL per entry;
    validateExtensionElements,                                ${targetPlatform} passed
    openVsxFileUrl + npm/local branches)                      through verbatim)
        │                                                              │
        │ copy-over (surgical, siblings byte-identical)                │ fragment equality
        ▼                                                              ▼
theia/applications/browser/package.json          scripts/verify-extension-pins.mjs
  theiaPlugins block                                        (block equality +
        │                                                    version-segment float guard +
        ▼                                                    sha256 over --packed archives)
yarn download:plugins --packed ──► plugins/<id>.<suffix> ──► theia build

configuration.toml [[webextensions]] (NEW)
        │
        ▼
generate.mjs ──► ExtensionSettings fragment ──► powerbrowser/distribution/policies.json
        │                                              (tracked; AppUpdateURL precedent)
        ▼
new verify-webextensions agreement gate ──► allowlist hosts for install_url origins

Gecko runtime (reporter COMPILED OUT)          Theia sidecar (existing sender)
  crash → no native report;                      sendErrorData at level crash ──►
  breakpad.reportURL repointed                   endpoint (telemetry pipeline = pings)
  to [urls].crash_report (prefs)                       │
                                                       │ minidump-capable client /
                                                       │ manual submit path
                                                       ▼
                                              minimal Antenna collector (scripts/)
                                              POST /submit multipart ──► CrashID=
                                              ──► local store + about:crashes record
```

### Recommended Project Structure

New/changed files follow existing homes — no new top-level dirs:

```
scripts/
├── generate.mjs                  # + npm/local-path schema keys, resolver branches, webextensions emitter, TARGETS rows
├── lib/config-schema.json        # + extensions[].source npm|local-path keys, webextensions table keys
├── verify-extension-pins.mjs     # + per-kind archive handling (npm tgz, packed local tgz)
├── verify-webextensions.mjs      # NEW: policies.json agreement gate (names extension id)
├── crash-collector.mjs           # NEW: minimal Antenna collector (stdlib only)
└── verify-crash-collector.mjs    # NEW: contract tests (multipart → CrashID=, throttle, malformed → 400)
powerbrowser/distribution/
└── policies.json                 # + ExtensionSettings (generated from manifest, tracked)
powerbrowser/endpoint-allowlist.json  # + collector host + install_url origins (with reasons)
theia/applications/browser/
└── plugins/                      # + per-kind packed artifacts (gitignored build output)
```

### Pattern 1: One fragment → copy-over → pin-verify (EXT-01 chain, reuse as-is)

**What:** Every manifest-owned value that lands in a yarn-managed or tracked consumer file goes through three steps: (1) generator emits a fragment under `generated/`, (2) a surgical copy sets ONLY the owned key/block leaving siblings byte-identical, (3) a dedicated `verify-*.mjs` gate asserts fragment equality + consumer-block equality + byte-level pin proof. Whole-file byte-identity is deliberately NOT used for yarn-managed files [VERIFIED: scripts/generate.mjs:1581-1593].
**When to use:** EXT-02 new kinds (same `theia-plugins.json` fragment, new resolver branches), EXT-03 (`ExtensionSettings` into tracked `policies.json` — copy-over sets only that key, preserving the `AppUpdateURL` precedent [VERIFIED: powerbrowser/distribution/policies.json:1-7]).
**Example:**
```js
// Source: scripts/generate.mjs:1607-1628 (emitTheiaPlugins — resolver dispatch shape to extend)
export function emitTheiaPlugins(config, variant) {
    void variant;
    const lines = ['{'];
    for (const entry of config.extensions ?? []) {
        // ... entry-shape guard ...
        const url = entry.source === 'openvsx' ? openVsxFileUrl(entry) : entry.url;
        lines.push(`  ${JSON.stringify(entry.id)}: ${JSON.stringify(url)},`);
    }
    // ...
}
```

### Pattern 2: Derive-and-compare gates with planted-fault self-tests

**What:** Every gate derives expectations at check time from the manifest through the generator's own resolver/emitter — never a kept copy — and proves discrimination with `--self-test` plants that must go red naming the defect (corrupted byte → names entry + both digests; floated URL → version-segment rule; drifted block → names entry + both URLs) [VERIFIED: scripts/verify-extension-pins.mjs:8-50,298-464]. Fresh-clone rule: absent `generated/` SKIPS the fragment half, never fails [VERIFIED: scripts/verify-telemetry.mjs:96-99].
**When to use:** The new webextensions gate, the crash-collector contract gate, and every per-kind extension of the pin gate.

### Pattern 3: Manifest-driven Gecko pref repoint (already built for crash)

**What:** `mozillaEndpointPrefs()` is the single source for `toolkit.telemetry.server` (from `[telemetry]` level+endpoint) and `breakpad.reportURL` (from `[urls].crash_report`, blank when unstated), spliced into the branding pref file at an anchor and asserted against the allowlist by `verify-theia-endpoints.mjs` step 4 [VERIFIED: scripts/generate.mjs:2212-2229; scripts/verify-theia-endpoints.mjs:33-39]. TEL-04 needs NO new pref plumbing — only a stated `urls.crash_report` pointing at the downstream collector.
**When to use:** TEL-04 client half; the collector host additionally flows through `manifestEndpointSources()` → allowlist coverage automatically once stated [VERIFIED: scripts/generate.mjs:2247-2271].

### Pattern 4: Level-gated sender with crash admission (ping/report split point)

**What:** `levelAllowsEvent`: `off` drops everything, `error`/`crash` admit the error path only, `all` admits usage+error; unknown levels fail closed to `off` [VERIFIED: telemetry-sender.ts `levelAllowsEvent`]. Crash-pings ride the existing JSON batch sender to the telemetry endpoint; crash *reports* (minidumps) go to the Antenna collector. The two destinations and two payload shapes are the separation — no second sender class.
**When to use:** TEL-04; document the routing (error event → ping; minidump submit → report) in the PII/retention/throttle policy.

### Anti-Patterns to Avoid

- **Second packaging system for new kinds:** resolving npm/local-path anywhere but `emitTheiaPlugins()` forks the chain. One resolver, one fragment.
- **Expanding `${targetPlatform}` at generate time:** it is a downloader-side placeholder for the machine that runs the download; expanding it pins one platform's bytes under a universal pin. Emit verbatim; assert per-target by running the download on (or for) each target.
- **Hand-kept expectation lists in new gates:** derive from manifest → generator at check time; a list copied from the tree can only agree with the tree.
- **New verify driver scripts outside `verify-platform.sh`:** append `CHECKS` rows (pattern at [VERIFIED: scripts/verify-platform.sh:3984-4015] for the extension-pins/telemetry row pairs with `-self-test` companions).
- **Curated extension list in the tree:** REQUIREMENTS.md bars Databasise and the curated addon set from the platform tree — mechanism only, zero bundled extensions. The pending todo's `hosts`-for-allowlist sketch is the one piece to adopt (derive allowlist rows from the manifest rather than hand-keeping).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Crash ingestion protocol | Custom JSON crash API | Antenna submission contract (multipart + `upload_file_minidump` + `CrashID=`) | Any Breakpad-compatible client (including a future re-enabled native reporter) speaks it; custom shape orphans the ecosystem and `about:crashes` tooling [CITED: https://socorro.readthedocs.io/en/latest/spec_crashreport.html] |
| Extension auto-install/update on Gecko | Sideload dir + custom updater | `ExtensionSettings` (`force_installed`/`normal_installed` + `install_url`) | Version-change-triggered update/reinstall is built into the policy engine; a custom updater re-implements signature, update-check, and rollback semantics [CITED: https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/] |
| VSIX download URLs | URL scraper / HTML parse of open-vsx.org | `openVsxFileUrl()` template + registry `/{ns}/{ext}/{targetPlatform}/{version}` routes | Stable API shape with live examples; scraping breaks on markup changes and cannot express targetPlatform [CITED: https://open-vsx.org/swagger-ui/index.html] |
| npm tarball resolution | Hand-built `registry.npmjs.org/-/…` URLs | `npm view <pkg>@<version> dist.tarball dist.integrity` | Registry is authoritative for tarball location + SRI hash; scoped registries and proxies move tarballs [CITED: https://docs.npmjs.com/cli/v8/commands/npm-view] |
| Telemetry batching/retry sender | Second sender for crash pings | Existing `PowerBrowserTelemetrySender` (`sendErrorData` at level `crash`) | Already unit-tested with discrimination proof; a second sender doubles the exfiltration surface to audit |
| Throttle/retention policy | Code-only behavior | Written policy doc + collector-enforced throttle rules (Antenna `throttler.py` as model) | Reviewable, auditable; code behavior drifts without a stated policy [CITED: https://github.com/mozilla-services/antenna/blob/main/antenna/throttler.py] |

**Key insight:** Every hard problem in this phase (pinning without a lockfile, per-target binaries, crash ingestion, auto-update) already has an upstream mechanism with documented semantics. The platform's job is manifest-shaped declaration + derivation + agreement gates over those mechanisms — never a parallel implementation.

## Common Pitfalls

### Pitfall 1: Expanding `${targetPlatform}` at generate time

**What goes wrong:** Generator resolves the placeholder to the *generator host's* platform (e.g. `linux-x64`), emitting a platform-specific URL under a universal pin. Other targets download wrong-arch binaries or fail hash checks.
**Why it happens:** The placeholder looks like a variable to substitute; the in-tree `openVsxFileUrl()` builds fully-concrete URLs, inviting the same treatment.
**How to avoid:** Emit `${targetPlatform}` verbatim in `theiaPlugins` values for target-specific entries (the stock downloader expands it — its only supported placeholder [CITED: https://github.com/eclipse-theia/theia/blob/master/dev-packages/cli/README.md]); the pin covers the *per-target resolved bytes*, so the verifier must hash per target (target-qualified archive names: `id@target.suffix`, matching the `namespace.name-version@target.vsix` file convention [CITED: https://github.com/eclipse-openvsx/openvsx/blob/master/cli/README.md]).
**Warning signs:** A `theiaPlugins` URL containing a literal `linux-x64`/`win32-x64` that came from the generator rather than the manifest.

### Pitfall 2: Assuming self-hosted XPIs need AMO signing

**What goes wrong:** EXT-03 design stalls on "how do downstreams sign their XPIs" or drifts toward shipping AMO-hosted-only extensions, reintroducing the dead-AMO dependency the tree deliberately killed (`services.addons.mozilla.org` is `deny` [VERIFIED: powerbrowser/endpoint-allowlist.json:104-108]).
**Why it happens:** Release-channel Firefox requires signing; the ESR exception is version-channel-specific and easy to miss.
**How to avoid:** This tree builds on ESR, where `xpinstall.signatures.required=false` permits unsigned installs — document it as the downstream mechanism for self-hosted `install_url` XPIs, with AMO unlisted-signed as the alternative for stricter postures [CITED: https://extensionworkshop.com/documentation/enterprise/enterprise-distribution/]. *Confirm against the pinned ESR tag at plan time (MEDIUM confidence — version-sensitive).*
**Warning signs:** Any plan text requiring AMO publication for EXT-03 entries.

### Pitfall 3: Proving `about:crashes` with a native crash

**What goes wrong:** Acceptance test crashes the browser and expects the crash in `about:crashes` — but the native reporter is compiled out (`ac_add_options --disable-crashreporter` [VERIFIED: .mozconfig:13]), so no CrashID is ever recorded locally and the test fails for a reason unrelated to the collector.
**Why it happens:** The success criterion names `about:crashes` without distinguishing who records the ID.
**How to avoid:** Prove the loop through the collector: submit a synthetic minidump multipart POST → parse `CrashID=` → assert the ID lands in the local record the `about:crashes` surface reads. The native-reporter path stays out of scope by locked decision.
**Warning signs:** Tier-3 plans containing "crash the browser, open about:crashes" without a collector-submit step first.

### Pitfall 4: Floating npm pins via `latest` or ranges

**What goes wrong:** npm-kind entry resolves `latest` at download time; next month's build bundles different bytes that fail the sha256 — or worse, silently pass if the pin was "re-bootstrapped" without review.
**Why it happens:** `npm view` defaults to `latest`; ranges (`^1.2.0`) feel idiomatic.
**How to avoid:** Exact version required (mirror the `openvsx` conditional-pin rule: `version` required when source demands it [VERIFIED: scripts/generate.mjs:648-654]); resolution command pins the version first (`npm view <pkg>@<exact> dist.tarball dist.integrity`); the float guard equivalent for npm is tarball-URL equality against the resolved URL recorded at pin time. Integrity hash alone does not protect against a malicious newly-published version — the control is exact-pin + review at pin time, not hash math [CITED: https://www.systemshardening.com/articles/cicd/npm-lockfile-integrity-security/].
**Warning signs:** Any manifest value containing `latest`, `^`, `~`, `>=`, or `*` in an npm-kind entry.

### Pitfall 5: Hashing a directory instead of packed bytes for local-path

**What goes wrong:** Pin taken over `find … | xargs sha256sum` or file mtimes; a rebuild on another machine (different timestamps, file order) produces different bytes and the pin fails spuriously — or passes vacuously while content drifts.
**Why it happens:** Directories have no canonical byte form.
**How to avoid:** `npm pack` (or deterministic tarball build) at generate/verify time; the pin covers the packed archive bytes, exactly like `--packed` `.vsix` archives in EXT-01 [VERIFIED: scripts/verify-extension-pins.mjs:27-34]. Fail loud on absent path (same shape as the missing-plugins-dir failure [VERIFIED: scripts/verify-extension-pins.mjs:257-264]).
**Warning signs:** A local-path pin procedure that does not name a packing step.

### Pitfall 6: No-lockfile drift on Open VSX (Theia proposal closed unimplemented)

**What goes wrong:** Plan assumes a lockfile mechanism exists for `theiaPlugins` and designs around it, or assumes `version` pin alone guarantees byte stability.
**Why it happens:** npm-trained instinct says "pin + lockfile"; Theia has no lockfile for plugins.
**How to avoid:** The in-tree answer is already built: exact version in the URL *plus* out-of-band sha256 over the downloaded bytes, enforced at verify time (steps 2+3 of the pin gate). New kinds inherit this dual control; document that registry-side republishing under the same version is caught by the hash, not the version string.
**Warning signs:** Design text mentioning a theiaPlugins lockfile as if it exists.

## Code Examples

### Antenna-protocol minimal collector (contract surface)

```js
// Contract: https://socorro.readthedocs.io/en/latest/spec_crashreport.html
// POST /submit, Content-Type: multipart/form-data; boundary=..., Content-Length set.
// Minidump part MUST be named `upload_file_minidump` (name, not filename):
//   Content-Disposition: form-data; name="upload_file_minidump"; filename="<uuid>.dmp"
//   Content-Type: application/octet-stream
// Annotations: one part per annotation, or a single JSON part named `extra`.
// Accepted: HTTP 200 + body `CrashID=<uuid>`  (e.g. CrashID=bp-d101d046-...)
// Soft-reject (throttled): HTTP 200 + body `Discarded=<rule>` (client may retry)
// Malformed: HTTP 400 + body `Discarded=<reason>` (e.g. malformed_no_annotations)
```

### ExtensionSettings emission (policies.json shape)

```json
// Source: https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/
// Emitted under { "policies": { "ExtensionSettings": { ... } } } in
// powerbrowser/distribution/policies.json (tracked; copy-over sets ONLY
// the ExtensionSettings key, preserving AppUpdateURL).
{ "policies": {
    "AppUpdateURL": "https://updates.powerbrowser.org/update.xml",
    "ExtensionSettings": {
        "downstream-addon@example.org": {
            "installation_mode": "force_installed",
            "install_url": "https://addons.example.org/downstream-addon-1.2.3.xpi"
        },
        "local-tool@example.org": {
            "installation_mode": "normal_installed",
            "install_url": "file:///opt/downstream/extensions/local-tool.xpi"
        }
    }
} }
// Notes: force_installed/normal_installed are invalid for the "*" default;
// "*" with "blocked" denies everything not explicitly listed; updates fire
// when the XPI's internal version changes. FF153+: install_url optional for
// AMO-hosted (resolves latest by ID) — but AMO is deny-listed in this tree,
// so downstreams always state install_url.
```

### npm-kind resolve-to-pinned-URL (generate-time)

```bash
# Exact pin first, then read registry-authoritative tarball + integrity:
PKG="acme-theia-tool"; VER="2.4.1"
npm view "${PKG}@${VER}" dist.tarball dist.integrity
# Emit dist.tarball verbatim as the theiaPlugins URL; record dist.integrity
# alongside sha256 in the manifest pin set. Fail loud if the resolved URL
# differs from a previously recorded one (float guard, npm analogue of the
# /<version>/ segment rule in verify-extension-pins.mjs step 2).
```

### local-path pack-to-hash (generate/verify-time)

```bash
# Pack the directory to canonical bytes, then pin the digest:
npm pack ./extensions/acme-local --pack-destination "$(mktemp -d)"
sha256sum acme-local-*.tgz
# The manifest pin covers the packed tgz bytes; the verifier re-packs (or
# re-hashes the packed artifact the download step keeps) and compares.
# Absent path or unpackable dir fails naming the entry id (fail-loud).
```

### Theia re-pin procedure (UPD-04 — in-tree agreement surface)

```
# Source: scripts/verify-upstream-pins.mjs steps 5-7 (the enforcement contract).
# 1. Bump upstreams.theia_release in configuration.toml (strict numeric triple).
# 2. Set every @theia/* pin in theia/package.json resolutions + every member
#    theia/applications/*/package.json and theia/extensions/*/package.json
#    (deps, devDeps, peerDeps, optionalDeps) to the manifest pin.
#    Exception by exact name only: @theia/monaco-editor-core (upstream monaco line).
# 3. Re-resolve theia/yarn.lock so every @theia tarball stanza version == pin.
# 4. nix develop .#theia → yarn install → tsc -b every extension INCLUDING
#    @powerbrowser/token-gate (src/node/token-gate-backend-module.ts,
#    parent-watchdog-backend-contribution.ts) → run all plain-node suites.
# Intactness = token-gate compiles + its backend contribution tests green at the new pin.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `distribution/extensions/` sideload dir for bundled add-ons | `ExtensionSettings` policy (`force_installed` + `install_url`) | Policy engine since FF69; FF152+ force-installed always auto-update; FF153 `install_url` optional for AMO | Version-triggered update/reinstall built in; sideload dirs bypass pin/update semantics [CITED: firefox-admin-docs ExtensionSettings] |
| Whole Socorro self-host for crash ingestion | Antenna-only minimal collector (assign ID + S3/SQS) | Antenna split from Socorro (2016); Socorro declines external users at small scale | v1.1 ships the ~100-line contract surface, never the processor/webapp [CITED: https://github.com/mozilla-services/antenna] |
| `latest`-floating plugin URLs | Exact version + out-of-band sha256 (in-tree EXT-01 gate) | Phase 04 (04-02) in this tree | Registry republishing caught by hash; no Theia lockfile exists or is coming |
| Unpacked plugin dirs as build input | `--packed` archives as the hashed artifact | Phase 04 (04-02) in this tree | Hash needs bytes; stock default decompresses and leaves nothing to hash [VERIFIED: application package.json `download:plugins` script] |
| Terminal "drills phase" for carry-overs | Drills ride inside the phase that needs them (08-05 precedent) | 08-05: drill-then-restore rebase, staged-unexecuted host cells with exact errors + unblocks | BLD-02/UPD-04 land in Phase 09 plans, not a follow-up |

**Deprecated/outdated:**
- `mini-breakpad-server` for crash collection: archived upstream; locked out by CONTEXT.md.
- AMO as extension source for this tree: `services.addons.mozilla.org` deny-listed; `extensions.getAddons.cache.enabled=false`. Downstream XPIs come from stated `install_url`s, never AMO discovery.
- Theia `theiaPlugins` lockfile proposal: closed unimplemented — the dual version+sha256 control is the mechanism, not a placeholder for one.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ESR 153 honors `xpinstall.signatures.required=false` for unsigned self-hosted XPIs (MEDIUM — official docs state ESR exception but not per-version) | Pitfall 2 | EXT-03 downstreams forced onto AMO signing; confirm against pinned tag in planning |
| A2 | Open VSX serves target-specific files at `.../file/<id>-<version>@<target>.vsix` for all pinned entries (MEDIUM — ovsx CLI README states the format; per-extension support varies) | Pitfall 1 | Per-target assertions need per-extension probing at plan time |
| A3 | `about:crashes` reads locally recorded CrashIDs that a collector round-trip can write without the native reporter (MEDIUM — standard client behavior, unverified in this tree with reporter compiled out) | Pitfall 3 | Acceptance test needs redesign if the surface requires native-reporter records |
| A4 | `npm pack` output is byte-stable enough across machines for pin comparison, or the verifier re-packs in one controlled step (LOW — tarball metadata embeds timestamps) | Pitfall 5 | Spurious pin failures; mitigate with deterministic pack flags or hash-of-extracted-content canonical form |
| A5 | No new registry/npm dependencies needed (LOW — contingent on execution not discovering a gap, e.g. XPI tooling) | Standard Stack | Planner must gate any discovered install behind legitimacy check + human-verify |

## Open Questions

1. **Where exactly does the `ExtensionSettings` copy-over land?**
   - What we know: `policies.json` is tracked and hand-written today (3 keys); the MAR-hop gate reads `policies.AppUpdateURL` from it; generator output lands only under `generated/` per GEN-04.
   - What's unclear: New `TARGETS` fragment row (`webextensions-settings.json`, no tracked comparand, following the theiaPlugins pattern) vs full-file generation with tracked comparand (policies.json is plain JSON, not yarn-managed, so byte-identity is viable).
   - Recommendation: Planner picks the fragment pattern for consistency with the other four manifest→tracked flows; the webextensions agreement gate pins the tracked side either way.

2. **Does the collector need to serve `about:crashes` content or only record IDs?**
   - What we know: `about:crashes` is a Gecko surface reading local crash records; native reporter compiled out writes none.
   - What's unclear: Whether the acceptance criterion means "IDs visible in about:crashes" (needs client-side record writing) or "collector returns CrashID= and stores the report" (server-only proof).
   - Recommendation: Plan for the server-only proof plus a documented client record step; confirm the surface behavior against the pinned ESR during planning (see A3).

3. **Which concrete npm/local-path entries prove BLD-02?**
   - What we know: Fixtures use shape-valid synthetic entries (Acme pins) to stay sweep-clean per 05-02 precedent.
   - What's unclear: Whether tier-3 needs one real Open VSX entry per kind or synthetic fixtures suffice on real built artifacts.
   - Recommendation: One real pinned Open VSX entry + synthetic npm/local-path fixtures through the full download→hash→build path; planner decides per host cost.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | Collector, gates, suites | ✓ | v24.19.0 | — |
| npm | npm-kind resolution, `npm pack` | ✓ | bundled w/ node | — |
| python3 | misc scripts | ✓ | present | — |
| curl | tarball/XPI fetch | ✓ | present | — |
| sha256sum / openssl | pin bootstrap + verify | ✓ | present | `node:crypto` one-liner |
| yarn | theia install / download:plugins / build | ✗ (host shell) | — | `nix develop .#theia` (project rule; `yarn` never on host) |
| Tier-3 build shells | BLD-02 real-artifact proofs | staged | — | 08-05 host record: nix-linux reachable, pkg-win11/pkg-macos staged with operator unblocks |
| Packaging hosts | per-target `${targetPlatform}` assertions | staged | makensis 3.12 (Nix) | Same 08-05 record; Linux assertions runnable now |

**Missing dependencies with no fallback:**
- None for planning and static gates; tier-3 cells depend on the 08-05 host record, which the planner must re-read rather than re-prove.

**Missing dependencies with fallback:**
- yarn on host → `nix develop .#theia` (mandatory project rule, not optional).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Plain-node suites + `tsc -b` + `verify-*.mjs --self-test` (no jest/vitest/mocha anywhere in theia/ — confirmed by grep over extension package.jsons) |
| Config file | none — see Wave 0 (convention is per-check `.mjs` + `verify-platform.sh` `CHECKS` rows) |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh` (tier-3 rows) / `--only <label>` per-task sampling |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| EXT-02 | npm entry resolves to pinned tarball URL; float fails naming entry | unit (gate self-test) | `node scripts/verify-extension-pins.mjs --self-test` | ✅ gate exists; ❌ Wave 0: npm-kind plants |
| EXT-02 | local-path packs to pinned bytes; absent path fails naming entry | unit (gate self-test) | `node scripts/verify-extension-pins.mjs --self-test` | ❌ Wave 0: local-path plants |
| EXT-02 | per-target `${targetPlatform}` passthrough + per-target hashes | integration (download per target) | `yarn --cwd theia download:plugins` per target + pin gate | ❌ Wave 0: target matrix |
| EXT-03 | `ExtensionSettings` fragment == manifest; tracked key == fragment | unit (new gate + self-test) | `node scripts/verify-webextensions.mjs --self-test` | ❌ Wave 0: new gate file + registry rows |
| EXT-03 | install_url origins covered in allowlist | unit | `node scripts/verify-theia-endpoints.mjs --self-test` | ✅ gate exists (extends via manifest sources) |
| TEL-04 | multipart POST → `CrashID=`; malformed → 400 `Discarded=`; throttle → 200 `Discarded=` | unit (plain-node, no network) | `node scripts/verify-crash-collector.mjs --self-test` | ❌ Wave 0: collector + contract gate |
| TEL-04 | crash-ping/report separation (error→ping, minidump→report) | unit | `node theia/extensions/telemetry/test/telemetry-sender.test.mjs` (extend) | ✅ suite exists; ❌ Wave 0: separation cases |
| BLD-02 | per-fixture tier-3 builds over new source kinds | tier-3 build | `nix develop .#theia` build + `nix develop .#firefox` build per fixture | ❌ Wave 0: fixture matrix plan |
| UPD-04 | Theia re-pin agreement + token-gate intact | unit + build | `node scripts/verify-upstream-pins.mjs --self-test` + `tsc -b` all extensions | ✅ gate exists; ❌ Wave 0: re-pin runbook |

### Sampling Rate

- **Per task commit:** `scripts/verify-platform.sh --quick`
- **Per wave merge:** `scripts/verify-platform.sh --only <new-label>` for each new gate + `--quick`
- **Phase gate:** Full suite green before `/gsd-verify-work` (deferred per standing instruction until roadmap fully executed)

### Wave 0 Gaps

- [ ] `scripts/verify-webextensions.mjs` (+ `--self-test` with planted faults both directions) — covers EXT-03
- [ ] `scripts/crash-collector.mjs` + `scripts/verify-crash-collector.mjs` — covers TEL-04
- [ ] npm-kind + local-path self-test plants in `verify-extension-pins.mjs` — covers EXT-02
- [ ] Crash-ping/report separation cases in `telemetry-sender.test.mjs` — covers TEL-04 client half
- [ ] Tier-3 fixture matrix over new source kinds + Theia re-pin runbook — covers BLD-02 + UPD-04
- [ ] `verify-platform.sh` `CHECKS` rows for each new gate with `-self-test` companions — covers all

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Partial | Collector binds loopback by default; any network exposure needs token auth (token-gate `parent-watchdog` pattern is the in-tree precedent) |
| V3 Session Management | No | No sessions; crash submission is unauthenticated localhost POST by design |
| V4 Access Control | Yes | `ExtensionSettings` `installation_mode` is the access policy for Gecko add-ons (`blocked` default + explicit allow/force list); collector filesystem writes scoped to its store dir |
| V5 Input Validation | Yes | Schema `regex` + `validateExtensionElements()` + sink guards (`assertEmittable`) on every manifest value; multipart parser on the collector must cap part sizes/counts and reject non-multipart with 400 `malformed_wrong_content_type` |
| V6 Cryptography | Partial | sha256 pins (integrity, not secrecy); collector serves HTTPS only when exposed — schema `^https://` pattern is the existing control for stated URLs |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious newly-published npm version under a valid pin lineage | Tampering | Exact pin + human review at pin time; hash verifies bytes-against-record, never record-against-truth |
| Registry republishes same version with different bytes | Tampering | sha256 over downloaded bytes at verify time (dual version+hash control) |
| Oversized/gzip-bomb minidump POST | Denial of service | Part-size caps, total-body cap (413 per Antenna precedent), throttle rules with `Discarded=` soft-rejects |
| PII in crash annotations (paths, URLs, form data) | Information disclosure | Written PII/retention/throttle policy BEFORE go-live; annotation allowlist, no full-dump retention, bounded retention with deletion |
| Unsigned XPI sideloaded outside policy | Elevation of privilege | `ExtensionSettings` deny-by-default (`"*": blocked`) + `install_sources` scoping; ESR signing exception documented, not silent |
| Unstaged new file invisible to residue scan | Information disclosure (brand leak) | Stage before trusting green scan (CLAUDE.md trap #1); new hostnames/ids reviewed against `inventory/brand-tokens.json` classes |

## Sources

### Primary (HIGH confidence — read from live tree this session)

- `scripts/generate.mjs` — `EXTENSION_SOURCES` (`openvsx`,`url`) :458 [VERIFIED: scripts/generate.mjs:457-458]; `TELEMETRY_LEVELS` :461; `EXTENSION_ARCHIVE_SUFFIXES` (`.vsix`,`.theia`,`.tar.gz`) :477; `openVsxFileUrl()` template :1568-1573; `emitTheiaPlugins()` :1607-1628; `mozillaEndpointPrefs()` :2212-2229; `manifestEndpointSources()` :2247-2271; `TARGETS` fragment rows :3033-3084; conditional-pin validation :648-661
- `scripts/verify-extension-pins.mjs` — 3-step gate (fragment equality, block equality + version-segment float guard, sha256 over packed archives) + `archiveSuffix()` + self-test plants [VERIFIED: scripts/verify-extension-pins.mjs:8-50,96-106,298-464]
- `scripts/verify-theia-endpoints.mjs` — allowlist coverage + marked-entry staleness + pref agreement, steps 1–4 [VERIFIED: scripts/verify-theia-endpoints.mjs:10-54]
- `scripts/verify-telemetry.mjs` + `theia/extensions/telemetry/` — fragment/block/compile/suite gate; zero-dependency batching sender; `levelAllowsEvent` split; `TELEMETRY_TEST_STUB=always-send` discrimination proof
- `scripts/verify-upstream-pins.mjs` — ESR 4-step + Theia 3-step agreement (steps 5–7 are the UPD-04 contract) [VERIFIED: scripts/verify-upstream-pins.mjs:10-71]
- `configuration.toml` — `[telemetry] level="off"`, no `[extensions]`, `[upstreams]` pins [VERIFIED: configuration.toml:86-108]
- `powerbrowser/distribution/policies.json` — tracked, 3 keys (`AppUpdateURL`, `DisableTelemetry`, `DisableFirefoxStudies`)
- `powerbrowser/endpoint-allowlist.json` — AMO deny, `breakpad.reportURL`/`toolkit.telemetry.server` manifest-driven expects, `updates.powerbrowser.org` allow
- `.mozconfig:13` — `ac_add_options --disable-crashreporter` (native reporter compiled out)
- `theia/applications/browser/package.json` — `download:plugins: theia download:plugins --packed`, `powerbrowserTelemetry {level: off, endpoint: null}`
- `.planning/phases/08-installer-hardening-canonical-rename/08-05-SUMMARY.md` — drill-then-restore, staged-unexecuted host discipline
- `.planning/todos/pending/2026-09-01-declare-bundled-webextensions-in-configuration-toml.md` — EXT-03 mechanism/data split, allowlist-cost warning, no-curated-list bar

### Secondary (MEDIUM confidence — official docs, web-fetched and cross-checked)

- [CITED: https://socorro.readthedocs.io/en/latest/spec_crashreport.html] — Antenna submission contract (multipart, `upload_file_minidump`, `CrashID=`/`Discarded=`, 400 reasons)
- [CITED: https://antenna.readthedocs.io/ + https://github.com/mozilla-services/antenna] — collector scope (ID + timestamps + S3/SQS, throttler rules)
- [CITED: https://firefox-admin-docs.mozilla.org/reference/policies/extensionsettings/] — `installation_mode` values, `install_url` (https + `file:///`, FF153 AMO-optional), `policies.json` shape
- [CITED: https://github.com/eclipse-theia/theia/blob/master/dev-packages/cli/README.md] — `theiaPlugins`/`theiaPluginsDir`/`theiaPluginsExcludeIds`, `${targetPlatform}` as the only placeholder
- [CITED: https://open-vsx.org/swagger-ui/index.html + live `.../api/.../file/...vsix` URL examples] — versioned file URL shape (matches in-tree template byte-for-byte in structure)
- [CITED: https://github.com/eclipse-openvsx/openvsx/blob/master/cli/README.md] — `@target` file convention for platform-specific extensions
- [CITED: https://extensionworkshop.com/documentation/enterprise/enterprise-distribution/] — ESR unsigned-install exception via `xpinstall.signatures.required`
- [CITED: https://docs.npmjs.com/cli/v8/commands/npm-view + https://www.systemshardening.com/articles/cicd/npm-lockfile-integrity-security/] — `dist.tarball`/`dist.integrity` resolution; integrity-vs-malicious-version limits

### Tertiary (LOW confidence)

- A4 (`npm pack` byte-stability across machines) — flagged for a deterministic-pack decision at plan time.
- Per-OS `${targetPlatform}` value strings beyond `win32-x64`/`linux-x64`/`darwin-arm64` — needed only when the target matrix names macOS/ARM cells; derive from the stock downloader at execution time.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH — in-tree chain fully mapped from live reads; Antenna/ExtensionSettings/Theia-CLI claims from current official docs, cross-checked against in-tree usage.
- Architecture: HIGH (as-is) / MEDIUM (to-be) — every as-is claim read from pinned tree paths; to-be layout (new kinds as resolver branches, collector as `scripts/` tooling) is design inference, not executed work.
- Pitfalls: HIGH for tree-derived (floats, target expansion, about:crashes trap); MEDIUM for version-sensitive externals (ESR signing, `@target` URL coverage) — each flagged to plan-time confirmation.

**Research date:** 2026-09-05
**Valid until:** 2026-10-05 (stable domain; re-confirm ESR-version-sensitive claims — A1, A3 — against the pinned tag if the ESR pin moves first)
