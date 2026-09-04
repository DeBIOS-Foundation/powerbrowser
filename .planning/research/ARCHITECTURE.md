# Architecture Research: v1.1 Hardening and SQL Tabs

**Domain:** Rebrandable browser platform (Gecko shell + Theia sidecar) — v1.1 delta on a shipped v1.0
**Researched:** 2026-09-04
**Confidence:** HIGH for as-is integration points (every claim derived from the tree at a pinned path); MEDIUM for to-be recommendations (inference from the v1.1 inputs against those constraints)
**Scope:** ONLY the four v1.1 features — installer builds, extension bundling, crash pipeline, SQL tab store — and how each lands on the existing generator / patch-stack / boundary-layer / TabUriRegistry / verify-platform.sh substrate. No GUI work (GUI-02/GUI-05 explicitly deferred until after SQL tabs).

**Confidence note (seam):** `gsd_run query classify-confidence` was consulted (`webfetch --verified` → LOW, `context7` → MEDIUM). Those tiers rank *fetched* sources. Every as-is claim below outranks them: it is derived from first-party tree reads (generator, schemas, verifiers, shell sources), each pinned to a file. To-be claims are MEDIUM because they are design inference, not executed work.

---

## 1. Standard Architecture (as v1.0 left it)

v1.1 adds surfaces; it does not add layers. The one diagram that matters is the generate-time fan-out plus the runtime supervision path:

```
                        configuration.toml + brand/
                        (ONLY rebrand inputs, CFG-01)
                                   │
                    ┌──────────────┴──────────────┐
                    │  scripts/generate.mjs       │
                    │  parse → reject-unknown →   │
                    │  mask → merge → validate →  │
                    │  emit → write (atomic:      │
                    │  nothing lands until every  │
                    │  check passes)              │
                    └──────────────┬──────────────┘
                    generated/ (gitignored, 52 TARGETS rows)
          ┌────────────┬───────────┴───────────┬─────────────┐
          ▼            ▼                       ▼             ▼
 Gecko build      Installer               Theia sidecar   Verification
 (via symlinks    fragments               build           (derived, never
 + 2 patch        (branding.nsi,           (theiaPlugins   hand-kept)
 hooks)           MSIX/plist/tile          block, telemetry
                  per variant)            + branding keys)

 RUNTIME (per launch, in-memory unless noted):
 Gecko shell ──supervises──▶ Node+Theia backend on 127.0.0.1
   │ PowerBrowserAPI.sys.mjs              │ token-gate (per-launch
   │ (SOLE Firefox-internal               │   cookie, stdin handoff)
   │  touchpoint)                         │ tab-uris / telemetry /
   └─ TheiaService.sys.mjs                │ branding / customize
      (consumer, NOT a                    ▼
       second boundary)              full-window swap (SHELL-05)
```

### Component responsibilities — with v1.1 disposition

| Component | Owns today | v1.1 disposition |
|---|---|---|
| `configuration.toml` + `scripts/lib/config-schema.json` | Single rebrand input; schema is the one key list for unknown-rejection, masker, validator | **MODIFIED** — additive keys only: EXT-02 source kinds + pins, crash-pipeline keys (if any beyond existing `urls.crash_report`), NAME-01 `display_name` value change. No key may ever carry a write-target path (frozen target table owns all outputs) |
| `scripts/generate.mjs` (frozen `TARGETS`) | All derivation; sink guards (`assertEmittable`, `assertNsisEmittable`, `assertXmlEmittable`); `resolveConfig`/`emit*` exported for verifiers to derive expectations from | **MODIFIED** — new/changed emitters + resolver branches; every new emitter adds a `TARGETS` row so `--check` and every derive-and-compare gate cover it with no further edits |
| `generated/` | 52 emitted surfaces (branding, icons, installer fragments, identity carrier, `.mozconfig`, desktop entries, Theia fragments, pins) | **MODIFIED (output only)** — new fragments land here; never hand-edited, never committed |
| `patches/010-powerbrowser-identity.patch` | Single `include()` hook pulling `generated/identity.configure` into the Gecko build | **UNCHANGED** — installer/crash work must not grow a third patch; effects reach Gecko through generated files + the existing hook |
| `patches/020-powerbrowser-shell.patch` | Shell document selection; no longer overrides `BROWSER_CHROME_URL` (stock chrome reachable) | **UNCHANGED** |
| `powerbrowser/shell/PowerBrowserAPI.sys.mjs` | Sole anti-corruption layer; every touchpoint catalogued in `powerbrowser/INTERNAL-APIS.md`, enforced by `check-internals-boundary.sh --catalogue` | **UNCHANGED** — none of the four features needs a new Firefox internal. Any proposal that does is a design failure; reshape it |
| `powerbrowser/shell/TheiaService.sys.mjs` | Sidecar supervision (spawn → health-gate → cookie → swap; restart budgets; profile-scoped state file) | **UNCHANGED**, except it is the pattern donor for profile-scoped SQL-store paths (reuse `_profileStateKey` sanitization, do not reinvent) |
| `theia/extensions/tab-uris` (`TabUriRegistry`) | Stable tab-URI identity; 4 public members; exported shape is the `@powerbrowser/browser-bridge` contract (GUI-04) | **UNCHANGED SHAPE** — SQL store keys off its output; the registry gains no members. A deliberate contract change edits `EXPECTED`/`EXPECTED_MEMBERS` in `verify-registry-shape.mjs` in the same commit |
| `theia/extensions/telemetry` (`PowerBrowserTelemetrySender`) | Zero-dependency batching sender, fail-closed to `off`, config via `powerbrowserTelemetry` key + live preference | **MODIFIED (extended, not rewritten)** — TEL-04 crash events ride this sender; no second sender |
| `theia/applications/browser/package.json` | Composed sidecar; `theiaPlugins` block copied surgically from `generated/theia-plugins.json`; `download:plugins --packed` keeps hashable archives | **MODIFIED (block content only)** — EXT-02 entries arrive via the same copy-over; whole-file byte-identity stays out (yarn-managed) |
| `powerbrowser/endpoint-allowlist.json` | Single source of truth for allowed/denied hosts + manifest-driven pref expects | **MODIFIED (rows only)** — every new v1.1 host gets a row with reason + `manifest` field; `verify-theia-endpoints.mjs` + `verify-endpoints.sh` layers 1+3 stay green by construction |
| `scripts/verify-platform.sh` | One driver, one `CHECKS` registry; `--quick` = no build/browser/display; `--only` sampling; every check carries `--self-test` with planted faults in both directions | **MODIFIED (rows only)** — new v1.1 gates append registry rows; no sibling driver, ever |
| `docs/BUILD.md` | Measured build/tier/rebase/desktop-install procedure | **MODIFIED** — gains the installer-build procedure (currently missing per inputs) with attributed timings |

---

## 2. Recommended Project Structure (where v1.1 code lands)

No new top-level directories. Fewer files wins; each feature gets exactly one new home plus its gate:

```
configuration.toml                 # MODIFIED: EXT-02 keys, crash keys (if any), NAME-01 value
scripts/
  generate.mjs                     # MODIFIED: emitters + resolvers + TARGETS rows
  verify-sql-tab-store.mjs         # NEW: SQL roundtrip gate (mirrors verify-extension-pins.mjs shape)
  verify-installer-build.mjs       # NEW (or extend schema gate): real-packaging proof, full-mode only
  verify-installer-schema.mjs      # MODIFIED: WR-07 fix (thread root into readTileColor)
  verify-extension-pins.mjs        # MODIFIED: npm/local archive handling
theia/extensions/
  tab-store/                       # NEW: @powerbrowser/tab-store (backend sqlite + frontend service)
    src/browser/tab-store.ts       #    frontend service: URI-string keyed API over TabUriRegistry output
    src/node/sqlite-backing.ts     #    backend: node:sqlite access, profile-scoped DB file
    package.json                   #    @powerbrowser scope, NO new @theia/* deps
  tab-uris/src/browser/            # UNCHANGED (shape frozen)
  telemetry/src/browser/           # MODIFIED: crash-event call sites only
powerbrowser/
  endpoint-allowlist.json          # MODIFIED: rows for new hosts
  distribution/policies.json       # MODIFIED only if WebExtensions sibling needs install policy
generated/                         # MODIFIED output: theia-plugins.json, endpoint-hosts.json,
                                   #   theia-telemetry.json, installer fragments, NEW sqlThrottle? NO —
                                   #   SQL store path is fixed platform content, not a manifest key (§6)
docs/BUILD.md                      # MODIFIED: installer procedure
```

### Structure rationale

- **`tab-store` as a new `@powerbrowser/*` extension, not a `tab-uris` edit:** the registry's exported shape is a frozen bridge contract with a set-equality gate. A store living *beside* it (consuming its URI strings as opaque keys) keeps that gate green; a store living *inside* it turns every SQL helper into a contract negotiation.
- **`node:sqlite` (Node 22 built-in), not a new npm dependency:** the `theia` dev shell already pins Node ≥ 22 (`theia/package.json` engines). A native addon (`better-sqlite3`) drags node-gyp rebuilds into both the Theia build and the Gecko-link rpath story, plus a `yarn.lock` delta and a re-pin surface. The built-in module is the lazy rung that holds; reach for an addon only if measured write throughput demands it (mark that ceiling with a `ponytail:` comment at the call site).
- **No `[sql]` manifest section:** backlog 999.1's boundary note (ARCHITECTURE Anti-Pattern 6) is explicit — a downstream-needs-behavior change wants an extension point, not a `[features]` flag. The store is always present and empty until used. What *is* fixed platform content (DB filename, schema version) lives in the extension, not in `configuration.toml`.

---

## 3. Architectural Patterns (the four that govern v1.1)

### Pattern 1: Generator owns all derivation; verifiers derive, never restate

**What:** Every v1.1 surface flows `manifest → generate.mjs emitter → generated/ → tracked consumer`, and every gate computes its expectation by importing the generator (`resolveConfig`, `emitTheiaPlugins`, `manifestEndpointHosts`, `mozillaEndpointPrefs`) rather than keeping its own copy.
**When to use:** Every v1.1 feature without exception — installer defines (WR-07 is the violation that proves the rule: `readTileColor()` reads `REPO_ROOT` instead of its fixture `root`, so the gate can agree with the wrong file).
**Trade-offs:** Verifiers import generator internals, so generator refactors ripple. That coupling is deliberate: a gate that cannot drift from its emitter is worth more than a decoupled gate that can false-pass.

### Pattern 2: Derive-and-compare gates with two-direction self-tests

**What:** New checks follow `verify-registry-shape.mjs` / `verify-installer-schema.mjs`: actual set derived at check time, expected set written down once, compared as set equality (surplus AND missing both fail); `--self-test` plants one fault per direction and requires red naming the file and the value, with the unmutated control green first.
**When to use:** The SQL roundtrip gate, the EXT-02 pin gate extensions, the crash-pipeline agreement gate, the installer-build proof.
**Trade-offs:** More scaffolding per check than a probe list. Probe lists silently stop testing whatever they forget to list — 01-05 learned this the hard way, and the registry-shape header says so verbatim.

### Pattern 3: Extension composition, never core patch

**What:** EXT-02, TEL-04, and SQL tabs all land as `@powerbrowser/*` extensions plus generated fragments. The Gecko patch stack stays at two hook-only patches; `diff-theia-core.sh` stays green; Theia version moves happen only through the one-pin re-pin procedure (`verify-upstream-pins.mjs`).
**When to use:** Always — it is the project's hard rule, not a preference. A v1.1 plan that edits `theia/node_modules/@theia`, vendors Theia sources, or touches a compiled Gecko surface (`check-patch-surface.sh` suffix list) is rejected at design review, not at CI.

### Pattern 4: Registry identity as primary key; store is persistence, not presentation

**What:** The SQL store never invents tab identity. Row key = the canonical URI string `TabUriRegistry` already produces (`uriOf` → serialize; `parseName` on read). OpenHandlers, the frontend module bindings, and the bridge contract are untouched; the store is a new service that maps URI-string ↔ row.
**When to use:** Tabs (net-new schema), bookmarks/history (read `places.sqlite`, expose — never duplicate what upstream already stores in SQL), sessions (read `sessionstore` JSON, project into the same row shape — never rewrite the session file format).
**Trade-offs:** URI strings are longer keys than integer ids, and scheme coverage (`view:`/`terminal:`/output/webview/plugin/settings) must stay in sync with `existing-scheme-coverage.ts`. The alternative — a parallel id space with a mapping table — recreates exactly the identity-forking hazard D-46 documents. Pay the string-key cost.

```typescript
// Shape of the seam (illustrative, not committed API):
interface TabRow {
  uri: string;        // canonical TabUriRegistry serialization — THE primary key
  title: string | null;
  lastActive: number; // ms epoch; transport metadata, like the telemetry `at` field
  payload: string | null; // scheme-specific address remainder, never a secret
}
// The store exposes get/set/remove/list ordered by lastActive.
// It NEVER stores the sidecar token, cookie values, or profile paths
// (secret boundary — see Anti-Pattern 5).
```

---

## 4. Data Flow (config keys → generated surfaces → packaging/upload)

| v1.1 feature | Manifest key(s) | Generated surface(s) | Consumed by | Upload/contact point |
|---|---|---|---|---|
| Installer branding (existing, hardened) | `[identity]` names, `[installer] support_url/tile_color`, `[product]` vendor | `generated/branding/<variant>/branding.nsi` (6 `!define`s), `firefox.VisualElementsManifest.xml`, `generated/installer/<variant>/AppxManifest-fields.xml`, `Info-plist-fields.xml` | Real NSIS/MSIX/DMG packagers on packaging hosts (PKG-01; v1 asserted schema only) | — (build-time only) |
| NAME-01 rename | `identity.display_name` → `PowerBrowser` | All of the above + `configure.sh`, `brand.ftl/properties`, Theia `applicationName`, legal notices | Single-edit propagation proof re-run; tier-3 Linux build re-verifies artifact surfaces; every gate asserting the spaced form re-pinned | — |
| Declared extensions (EXT-01 → EXT-02) | `[[extensions]]` id + source (`openvsx`/`url` + NEW `npm`/`local-path`) + pins | `generated/theia-plugins.json` (id → exact download URL map) | Copied surgically into `theia/applications/browser/package.json` `theiaPlugins`; `download:plugins --packed` fetches; `verify-extension-pins.mjs` step 3 hashes packed archives | Open VSX file URLs, verbatim URLs, npm registry tarballs, or local-path copies |
| WebExtensions sibling | NEW manifest declaration (recommend: `[[webextensions]]`-style section — name TBD in questioning) | NEW generated fragment (e.g. `generated/webextensions.json`) | Gecko install surface (`distribution/policies.json` `ExtensionSettings` or equivalent — confirm against ESR mechanism in phase research) | AMO/hosts as declared → each host needs an allowlist row |
| Telemetry endpoints (TEL-01..03, existing) | `[telemetry] level/endpoint`, `[urls.*]`, `[installer] support_url` | `generated/theia-telemetry.json`, `generated/endpoint-hosts.json`, branding `pref/firefox-branding.js` (`toolkit.telemetry.server`, `breakpad.reportURL` via `mozillaEndpointPrefs`) | Theia sender + Gecko prefs; `verify-theia-endpoints.mjs` steps 1–4 assert fragment equality, allowlist presence, marked-entry freshness, pref agreement | Downstream collector only; level `off` (shipped) sends nothing |
| Crash pipeline (TEL-04) | `urls.crash_report` (exists) + level `crash` (exists); NO new keys recommended unless a Socorro-compatible endpoint needs distinct shape | Same prefs as above (repoint, not new mechanism) + Theia `sendErrorData` call sites | `PowerBrowserTelemetrySender` (crash-kind events) + blanked-by-default `breakpad.reportURL` | Crash collector host → allowlist row with `manifest: urls.crash_report` |
| SQL tabs (999.1) | NONE (deliberate — §2 rationale) | NONE — schema + DB path are fixed platform content in `@powerbrowser/tab-store` | Theia backend service; profile-scoped DB file beside `THEIA_CONFIG_DIR` state | No network. Ever. (A store that phones home is a telemetry event wearing a trench coat.) |

Crash-pipeline note: `--disable-crashreporter` stays. TEL-04 "beyond endpoint repointing" is satisfied Theia-side (structured crash/error events through the existing sender at level `crash`, with the same batching/backoff/drop diagnostics) plus keeping the Gecko repoint derivation honest. Re-enabling the native reporter would recompile a subsystem the platform deliberately compiled out (D-84 class decision) and re-open the `incoming.telemetry.mozilla.org` / crash-stats surface the allowlist denies — that direction needs its own adversarial review, not a quiet flag flip. Flag TEL-04-native as the milestone's deep-research item if anyone proposes it.

---

## 5. Scaling Considerations

This milestone scales across *build matrix*, not users:

| Scale | What strains | Approach |
|---|---|---|
| 1 config × dev variant (today) | Nothing — current state | Keep `--quick` green in seconds; it is the commit gate |
| N downstream fixtures × 2 variants | Generator + fixture harness time | Fixture harness stays generate-only (`PB_CONFIG_DIR` per-command, tree hash-restored); tier-3 per-fixture builds stay staged, run on packaging hosts |
| dev + `objdir-release` × Linux/Windows/macOS packagers | Packaging-host access, signing, 47–54 min tier-3 builds each | Installer-build proof runs full-mode only (never `--quick`); `docs/BUILD.md` records per-host procedure + attributed timings; CROSS-COMPILE is not assumed — Windows NSIS/MSIX builds on Windows, DMG/icns on macOS |

**First bottleneck:** packaging-host availability (v1 never built an installer — every GEN-03 assertion is schema, not binary). **Second bottleneck:** tier-3 build queue once NAME-01 re-pinning + release rows + per-fixture builds all want the reference host.

---

## 6. Anti-Patterns (v1.1-specific; each bitten before or one edit away)

### Anti-Pattern 1: A third Gecko patch for installer/crash needs
**What people do:** Add `patches/030-*.patch` touching compiled or branding-adjacent Gecko sources because the generator "doesn't reach" there.
**Why it's wrong:** Every patch is tier-3 build cost forever plus rebase replay risk; the two existing hooks already reach every surface v1.1 needs (identity carrier include, generated branding dirs, pref files, mozconfig literals).
**Do this instead:** Extend the emitter + frozen `TARGETS`. If a surface genuinely cannot be reached from `generated/`, that is a phase-research finding with a named mechanism, not a patch drafted in an afternoon.

### Anti-Pattern 2: A `[features.sql_tabs]` (or any `[features]`) flag
**What people do:** Gate the store behind a manifest boolean.
**Why it's wrong:** Backlog 999.1 names this exact move as the bug, not the fix — a downstream needing different behavior needs an extension point, and a flag silently forks every downstream's tab semantics.
**Do this instead:** Store always present, empty until used. Downstream differentiation happens through `@powerbrowser/*` composition, the sanctioned mechanism.

### Anti-Pattern 3: Enriching the registry to serve the store
**What people do:** Add `getAllTabUris()`, `onTabChanged`, or persistence helpers to `TabUriRegistry` because "the store needs them."
**Why it's wrong:** Each addition mutates the frozen bridge contract and must survive `verify-registry-shape.mjs` set-equality review; presentation identity and persistence lifecycle are different axes and welding them recreates the full-window weld GUI-04 exists to prevent.
**Do this instead:** New service in `tab-store` subscribes to shell/widget events itself; the registry remains a pure identity function.

### Anti-Pattern 4: Bare `$VAR` in NSIS defines (WR-04, real, queued)
**What people do:** Trust `NSIS_UNEMITTABLE` (`/"\|\$\{\|\r\|\n\|\0/`) while the schema admits `$` — `https://example.org/$INSTDIR/x` emits silently and NSIS expands it at compile time.
**Why it's wrong:** Build-time variable injection from a brand string, with the developer's privileges on the packaging host.
**Do this instead:** Phase 08 pre-fix: reject bare `$` in `assertNsisEmittable` (keep `${` rejection), with a self-test plant proving red. Narrow, non-blocking, first.

### Anti-Pattern 5: Secrets or absolute paths in SQL rows
**What people do:** Persist the sidecar token, cookie values, or checkout-absolute paths alongside tab rows "for reconnection."
**Why it's wrong:** The token's secrecy is the only real barrier between co-resident processes and the backend (INTERNAL-APIS.md cookie row; `side04-token-not-in-environment` gate). A sqlite file is world-readable-by-uid and outlives the launch; absolute paths bake one checkout into every downstream (D-04).
**Do this instead:** Rows carry URI strings + cosmetic metadata only. Reconnection state stays per-launch in-memory, as today.

### Anti-Pattern 6: Verifier reads that bypass their own fixture (WR-07, real, queued)
**What people do:** Leave `readTileColor()` on `REPO_ROOT` while `runChecks(root)` drives fixtures — the shape of "gate agrees with the wrong file."
**Why it's wrong:** Latent false-green/false-red the first time any fixture diverges the manifest; it trains readers to distrust the gate.
**Do this instead:** Phase 08 pre-fix: thread `root` through, plant a divergent-manifest self-test case. Then apply the lesson as a review checklist to every new v1.1 gate: *does this check read anything outside `root`?*

---

## 7. Integration Points (exact seams per feature)

### 7a. Installer builds (PKG-01 + WR-04/WR-07 + NAME-01 + BUILD.md)

| Seam | Change | Gate |
|---|---|---|
| `generate.mjs` `assertNsisEmittable` + schema help text | WR-04: reject bare `$` | `generate --self-test` plant |
| `verify-installer-schema.mjs` `readTileColor` | WR-07: accept `root`, read fixture manifest | Existing `--self-test` + new divergent-manifest plant |
| `configuration.toml` `identity.display_name` | NAME-01 value → `PowerBrowser` | Re-pinned: `generate --self-test` comparands, `inventory/brand-tokens.json` `brand_display_expectations`, trademark-surface scan, downstream fixtures; propagation proof re-run live |
| Packaging hosts (new environment) | Real NSIS/MSIX + DMG/icns builds from `generated/` | NEW full-mode-only build-proof row (never `--quick`); `docs/BUILD.md` procedure with attributed timings |
| `verify-platform.sh` registry | Append rows only | `--only <label>` sampling per task, as today |

### 7b. Extensions + crash (EXT-02 + WebExtensions sibling + TEL-04)

| Seam | Change | Gate |
|---|---|---|
| Schema `extensions[].source` + `validateExtensionElements` | Admit `npm` + `local-path`; conditional pins per kind (npm: exact version + integrity digest; local-path: in-tree relative path + sha256 over bytes, resolved against asset root like `brand/mark.svg`) | `generate --self-test` per-kind fixtures |
| `emitTheiaPlugins` | Resolver branches: npm → registry tarball URL; local-path → staged copy + file URL or packed artifact path (decide in questioning; fail-loud on missing file) | Fragment equality via `verify-extension-pins.mjs` step 1 |
| `verify-extension-pins.mjs` step 3 | Archive handling per kind (npm tarball suffix, local copy hash) + keep the version-segment float guard for `openvsx`/`npm` | `--self-test` plants per kind (corrupt byte, floated version, drifted block) |
| `distribution/policies.json` + NEW `generated/webextensions.json` | WebExtensions declaration sibling (mechanism TBD in phase research against ESR policy surface) | NEW agreement gate mirroring the `theiaPlugins` block-equality pattern |
| `telemetry/*` call sites | Crash/error events via existing `sendErrorData`; level-`crash` admission already in `levelAllowsEvent` | `verify-telemetry.mjs` + unit suite (`test/telemetry-sender.test.mjs` pattern) |
| `endpoint-allowlist.json` | Rows for collector/crash hosts with `manifest` fields; pref expects track derivation | `verify-theia-endpoints.mjs` steps 2–4; `verify-endpoints.sh` layers 1+3 post-change |

### 7c. SQL tabs (999.1, before any GUI)

| Seam | Change | Gate |
|---|---|---|
| NEW `theia/extensions/tab-store` | Backend `node:sqlite` service + frontend URI-keyed API; DB file profile-scoped (reuse `_profileStateKey` sanitization via existing `PowerBrowserAPI.getProfileDir` consumer path — no new internal) | NEW `verify-sql-tab-store.mjs`: URI→row→restart→reopen roundtrip against temp DB (`--quick`-honest) |
| `TabUriRegistry` | NONE (keys consumed as opaque strings) | `verify-registry-shape.mjs` stays green untouched — the proof the bridge stayed landable |
| `places.sqlite` / `sessionstore` | READ paths only: bookmarks/history exposed, sessions projected; no format writes, no duplication of `places.sqlite` into a second SQL truth | Roundtrip gate asserts read-only (fixture DB hash unchanged) |
| `powerbrowser/shell/*` | NONE | `internals-catalogue` + `check-internals-boundary.sh` green untouched |
| GUI-02/GUI-05 | Explicitly NOT started; store lands with zero presentation changes | `verify-registry-shape.mjs` + `verify-customize-inert.mjs` as tripwires |

---

## 8. Suggested Build Order (dependency-driven)

1. **Phase 08 — Installer hardening + NAME-01 (first).** WR-04/WR-07 pre-fixes *before* any real packaging run (gates must discriminate before binaries exist). NAME-01 rides here because every installer surface carries the display name — renaming after packaging proofs would invalidate them. `docs/BUILD.md` procedure written alongside the first green packaging-host run, not after. Carry-overs that fit naturally: `objdir-release` build + release-variant rows (WINDOWS #10), tier-3 per-fixture builds.
2. **Phase 09 — Extensions + crash (second).** Builds on the hardened generator/verification loop from 08 (new source kinds reuse the exact emitter→fragment→block→hash pipeline EXT-01 proved). Crash work is mostly agreement plumbing (prefs + allowlist + sender call sites), so it pairs cheaply with the extension resolver work; both touch `endpoint-allowlist.json` and should land under one allowlist review. Carry-overs: Theia re-pin proof (touches the same `package.json` composition), live ESR rebase drill.
3. **Phase 10 — SQL tabs (third, still no GUI).** Depends on a stable registry (untouched by 08/09 by construction) and on the verification discipline 08/09 exercise (its gate is the most behaviorally novel). Landing persistence before any presentation is the whole point of the PROJECT.md ordering: GUI-02/GUI-05 then build on rows, not on wishes.
4. **WINDOWS #13 (`registerWindowActor` boundary hole) + #14 (BiDi double-window) alongside 08–09,** not 10: both are shell/boundary deviations, and the boundary must be airtight before a persistence layer starts keying user data off chrome-adjacent identity.

**Research flags:** TEL-04-native (re-enabling any compiled crash subsystem) needs adversarial review before design — default to the Theia-side sender. WebExtensions install mechanism needs ESR-surface verification (policy vs addon-install API) before the manifest section is named. SQL read paths into `places.sqlite`/`sessionstore` need version-sensitivity notes (what ESR rebase can break them) — cheap to record, expensive to rediscover.

---

## Sources

First-party tree reads (all at v1.0 tag + v1.1 inputs; paths relative to repo root):

- `.planning/PROJECT.md` (v1.1 goals, config sections, SQL-01 promotion), `.planning/NEXT-MILESTONE-INPUTS.md` (phases 08–11 draft, WR-04/WR-07 pre-fixes, rename slice), `.planning/ROADMAP.md` + `.planning/milestones/v1.0-ROADMAP.md` (backlog 999.1 analysis, debt ledger)
- `configuration.toml`, `scripts/lib/config-schema.json` (single schema table), `scripts/generate.mjs` (pipeline order, `emitTheiaPlugins`, `emitTheiaTelemetry`, `manifestEndpointHosts/Sources`, `mozillaEndpointPrefs`, `emitMozconfig` `--disable-crashreporter`, TARGETS table)
- `scripts/verify-installer-schema.mjs` (schema-only scope, `readTileColor` WR-07 site), `scripts/verify-extension-pins.mjs` (`--packed` rationale, 3-step pin gate), `scripts/verify-theia-endpoints.mjs` (4-step coverage gate), `scripts/verify-registry-shape.mjs` (GUI-04 set-equality contract, 4 members + 5 exports), `scripts/verify-platform.sh` (one-registry rule, `--quick` honesty, harness helpers)
- `powerbrowser/shell/PowerBrowserAPI.sys.mjs` + `powerbrowser/INTERNAL-APIS.md` (boundary catalogue incl. cookie/token, quit-observer, navigation rows; session-store deliberately untouched D-107/D-108), `powerbrowser/shell/TheiaService.sys.mjs` (consumer-only, profile-scoped state key), `powerbrowser/endpoint-allowlist.json`, `generated/endpoint-hosts.json`, `generated/theia-plugins.json`, `generated/theia-telemetry.json`
- `theia/extensions/tab-uris/src/browser/{tab-uri-registry,tab-uris-frontend-module,browser-window-command}.ts` (registry shape, `window.open` chrome channel, `isExtractable=false` tab-model constraint), `theia/extensions/telemetry/src/browser/{telemetry-sender,telemetry-frontend-module}.ts` (fail-closed batching sender), `theia/applications/browser/package.json` (build + `download:plugins --packed` + start env), `theia/package.json` (engines, resolutions)
- `.planning/milestones/v1.0-phases/03-firefox-branding-emitter-and-icon-pipeline/03-REVIEW.md` + `03-VERIFICATION.md` (WR-04/WR-07 substance), `docs/BUILD.md` (tiered loop, missing installer procedure), `docs/REBRANDING.md` (key→surface table)

No web sources consulted: for a delta-on-own-tree question the tree is the authoritative source, and no v1.1 decision above depends on upstream API currency beyond the re-pin/rebase drills already owned by existing gates.

---
*Architecture research for: Power Browser v1.1 (installer hardening, extensions/crash pipelines, SQL tabs)*
*Researched: 2026-09-04*
