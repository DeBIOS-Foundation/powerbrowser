# Stack Research: v1.1 Hardening and SQL Tabs

**Domain:** Stack additions for Power Browser v1.1 — Windows/macOS installer builds, npm/local-path/WebExtension extension sources, crash-report pipeline, SQL-backed tabs
**Researched:** 2026-09-04
**Confidence:** HIGH (versions verified against npm registry, Mozilla source docs, and release feeds this session; integration points read from the live tree)

---

## Verdict

v1.1 needs **two new npm dependencies total** (`better-sqlite3`, `@sentry/node`) and **zero new build-system dependencies**. Everything else is host tooling on the packaging machines (NSIS, Windows SDK, `hdiutil`/`iconutil`) or machinery already in the tree (`mach repackage`, `Sqlite.sys.mjs`, `policies.json`, `theia download:plugins --packed`).

The shape of every addition follows the existing seams: the generator emits, `verify-platform.sh` asserts, the `PowerBrowserAPI.sys.mjs` boundary stays the single internals touchpoint. Anything that would add a second boundary, a second SQLite writer, or a second packaging system is rejected below.

---

## Recommended Stack

### Core Technologies (inherited — carry over, do not re-decide)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Firefox ESR | `153.2.0` (re-pin tag `FIREFOX_153_2_0esr_RELEASE` via UPD-01/02 drill) | Browser substrate + all packaging machinery | 153 is the current ESR branch (153.0esr 2026-07-21, 153.2.0 2026-09-01, Mozilla official). The tree pins `FIREFOX_153_1_0esr_RELEASE`; the one-minor re-pin rides the existing uptake tooling, it is not a stack decision. **Confidence: HIGH** |
| Eclipse Theia | stay on **`1.74.1`** | Sidecar | Still the latest stable tag on GitHub (v1.74.1, 2026-08-06; 1.74.x is the 2026-08 community release). 1.75.0 has a release-plan date of 2026-08-27 but is not marked latest; a Theia bump inside a hardening milestone makes every failure ambiguous. The Theia re-pin proof rides along as a carried drill, not a version change. **Confidence: HIGH** |
| Node.js 22 + yarn 1.22 classic + TS ~5.9.3 + React 18.3.1 | unchanged | Sidecar toolchain | Per v1 research; `node:sqlite`'s status (below) is the reason Node stays at 22 rather than chasing 24. **Confidence: HIGH** |
| `smol-toml` | **`1.8.0`** (latest; Snyk confirms 1.8.0 current) | Manifest parsing | Carry over. Note: upstream now advertises TOML 1.1.0 compliance — the manifest must stay on the TOML **1.0.0 subset** (`builtins.fromTOML` is 1.0-only and errors on dates), so never write 1.1-only syntax into `configuration.toml`. Also: 1.6.1+ fixes Snyk uncontrolled-recursion advisories, another reason to take 1.8.0. **Confidence: HIGH** |
| `sharp` | **`0.35.4`** (2026-08-26, latest) | Icon rasterization | Carry over. Now also feeds the macOS `.iconset` PNG set (16→1024 incl. `@2x`) that `iconutil`/`png2icns` assembles into `.icns`. **Confidence: HIGH** |

### NEW (1): SQL-backed tabs — two access paths, one writer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **`Sqlite.sys.mjs`** (`resource://gre/modules/Sqlite.sys.mjs`) | ships in ESR 153 (in-tree, ~70 KB) | Gecko chrome-side SQLite: the new tabs store + exposing places | This is Mozilla's own promise-based wrapper over mozStorage — `Sqlite.openConnection()` / `openDatabaseWithFileURL`, prepared statements, transactions. It is what `Bookmarks.sys.mjs`, `History.sys.mjs`, and every first-party consumer already sits on. Zero new dependencies, profile-dir-aware, WAL-capable, and it keeps crash-report filenames controllable via the explicit `TelemetryFilename` parameter (the module header carries a privacy warning: pass a fixed name like `tabs.sqlite`, never a per-origin filename). New-tab schema is a **new `tabs.sqlite`** in the profile dir — never new tables inside `places.sqlite` (upstream-owned schema; a rebase that migrates places would collide with us). Bookmarks/history are **exposed via the async `Bookmarks.sys.mjs` / `History.sys.mjs` APIs**, not raw SQL against places internals. **Confidence: HIGH** (module confirmed present on mozilla-central/main; Places-on-SQLite architecture per Firefox Source Docs) |
| **`better-sqlite3`** | **`13.0.3`** (2026-08-05, latest stable; MIT) | Theia Node-backend SQLite reads | The fastest synchronous SQLite driver for Node (~9,800 dependents, weekly releases, actively maintained). Synchronous API matches the backend's low-concurrency tab-query path and mirrors `node:sqlite`'s shape, so a future stdlib migration is mechanical. Prebuilds cover Node 22 (`NODE_MODULE_VERSION` 127); if a prebuild is ever missing, the `theia` dev shell already carries the fallback toolchain (`python3`, `gnumake`, `pkg-config`, node-gyp-bin on PATH — the `drivelist` precedent). Open the DB **`readonly: true`** from the backend. **Confidence: HIGH** |

**Single-writer rule (load-bearing): Gecko owns `tabs.sqlite`; the Theia backend never writes.** SQLite locking plus Firefox's own profile lock make two writers a corruption story. The backend opens read-only for queries (search, diagnostics) and all mutations go through `PowerBrowserAPI.sys.mjs` → chrome-side `Sqlite.sys.mjs` connection. Tab identity keys are `TabUriRegistry` URIs (the GUI-04 stable-identity seam) — the URI is the primary key, so the later mirror/proxy bridge joins on identity rather than rowids. Schema carries a `schema_version` table from day one; migrations live in the chrome-side module, catalogued as new `INTERNAL-APIS.md` rows (every `Services.dirsvc`/`Sqlite` touch enters through the boundary file, per `check-internals-boundary.sh`).

### NEW (2): Installer builds — host tools, no new tree deps

| Tool | Version | Purpose | Why Recommended |
|------|---------|---------|-----------------|
| **NSIS** (Windows packaging host) | **`3.12`** (2026-04-19; floor 3.11) | Stub + full Windows installers | Firefox builds its own installers from in-tree `browser/installer/windows/nsis/` via `mach build installer` / `mach package` — the generator's job is only correct `branding.nsi` defines (the six `!define` names `verify-installer-schema.mjs` already asserts). 3.11 fixed CVE-2025-43715 (privilege escalation when installers run as SYSTEM); 3.12 fixes a second SYSTEM priv-esc plus macOS-cross build fixes. v1's WR-04 (reject bare `$VAR` in NSIS defines) is exactly the hardening this needs. NSIS installs on the Windows host only; nothing enters the repo or flake. **Confidence: HIGH** |
| **Windows SDK `MAKEAPPX`/`SIGNTOOL`** (Windows packaging host) **or** Mozilla `msix-packaging` fork toolchain (Linux cross path) | Windows SDK 10+ / `mach artifact toolchain --from-build linux64-msix-packaging` | MSIX repackaging | `mach repackage msix [--unsigned] [--sign]` is the entire MSIX pipeline (per Firefox Source Docs): it repackages the `mach package` ZIP, is branding-aware (channel-specific paths — which is why the generator's identity keys feed it), and handles self-signed test certs itself. Unsigned packages install on Win11 with the OID path (`Add-AppxPackage -AllowUnsigned`, admin). No npm/MSIX-SDK dependency — the MSIX format's proprietary bits (`resources.pri` via `makepri.exe`) are why you use Mozilla's tooling, not a third-party packager. **Confidence: HIGH** |
| **`hdiutil` + `iconutil`** (macOS packaging host) | preinstalled on macOS | DMG creation + `.icns` assembly | Mozilla's own note: DMGs are built with `hdiutil` on macOS hosts (Linux automation uses `libdmg-hfsplus`; lzma compression since FF136 needs macOS ≥10.15 semantics). `iconutil -c icns firefox.iconset` is Mozilla's documented icon path (`UpdatingMacIcons` source doc). sharp emits the PNG set (16→1024 + `@2x`); the mac host assembles. Nothing enters the repo. **Confidence: HIGH** |
| **`libicns` `png2icns`** (nixpkgs, Linux-side fallback) | **`0.8.1`** (1024px support; LGPL) | `.icns` assembly without a Mac host | Only if v1.1 wants a Linux-generated icns for smoke/verify purposes — real DMGs still build on the Mac host. `pkgs.libicns` provides it; it is a one-line flake addition, not an npm dep. Prefer host `iconutil` for shippable artifacts. **Confidence: MEDIUM** (format support verified; pin the "host iconutil is canonical" rule so Linux icns never ships) |

### NEW (3): Extension sources — manifest kinds, no new tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **npm-source Theia extensions** = exact-pinned `dependencies` + `resolutions` in `theia/applications/browser/package.json` | yarn 1.22 (existing) | EXT-02 npm kind | A Theia extension *is* an npm package exposing `ContainerModule`s, consumed as a compile-time dependency — there is no plugin-runtime install step to build. So "npm source" needs no new tooling: the generator maps `[[extensions]] source="npm"` entries to exact-pinned deps, the existing `resolutions` table forces the `@theia/*` pairing, `yarn.lock` freezes transitive closure, and `verify-extension-pins.mjs` grows a step-2 rule (every npm entry's installed version equals its pin — a floated range goes red the same way a floated Open VSX URL does today). **Confidence: HIGH** |
| **local-path extensions** = `file:` deps or `theia/extensions/*` workspace members | yarn 1.22 workspaces (existing) | EXT-02 local-path kind | Same mechanism as the five `@powerbrowser/*` extensions already in the tree. Fail-loud = the generator resolves the path at generate time (missing dir = hard fail, same class as WR-07's fixture-root threading) and the verifier asserts the workspace member builds. **Confidence: HIGH** |
| **`ExtensionSettings` in `powerbrowser/distribution/policies.json`** | ESR 153 policy schema | WebExtensions declaration sibling | The tree already ships `powerbrowser/distribution/policies.json` — the documented enterprise path (`distribution/` + `distribution/extensions/<id>.xpi` bundling, or `force_installed`/`normal_installed` + `install_url`). ESR 153 even makes `install_url` optional for AMO-hosted extensions and adds `runtime_blocked_hosts`/`blocked_permissions`. The generator emits this block from `[[extensions]]` webext entries, so the "sibling" is one manifest section rendered twice (Theia `theiaPlugins` + Firefox `ExtensionSettings`), pinned and fail-loud through the same verifier. **Confidence: HIGH** |

### NEW (4): Crash-report pipeline — Sentry, not Socorro

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **`@sentry/node`** | **`10.73.0`** (latest, 2026-09-03; MIT; Node ≥18) | Theia-backend crash + error capture (TEL-04 client side) | The sidecar is a Node backend — its crashes are JS exceptions and native aborts, both of which the Sentry Node SDK captures with breadcrumbs, release/channel annotations, and offline-queued retry upload. Wire it behind the existing `[telemetry]` level gate: level `off` (default) = `Sentry.init` never runs (fail-closed, consistent with the token-gate posture); `crash`/`error`/`all` map to `tracesSampleRate`/`beforeSend` filtering; the `[telemetry] endpoint` becomes the DSN. Theia 1.74's own `@theia/telemetry` (`TelemetrySink`) is the in-extension seam — contribute a Sentry sink rather than inventing a reporting module. **Confidence: HIGH** |
| **Self-hosted Sentry** | **`26.8.0`** (2026-08-17; docker-compose) | Downstream-operated collector (TEL-04 server side) | Socorro is explicitly out: its README states it is Mozilla-centric with **no capacity for external users**, and it drags Postgres/Kafka/Elasticsearch-class infrastructure. `electron/mini-breakpad-server` is archived (Dec 2022, CoffeeScript, unmaintained) — do not adopt. Self-hosted Sentry is the maintained single-`install.sh` collector a downstream can actually operate; SaaS Sentry is the zero-ops alternative. Either way the platform only ever carries the DSN key, never collector infra. **Confidence: MEDIUM-HIGH** (SDK/client choice HIGH; collector-operability MEDIUM — needs the TEL-04 live drill against a real collector) |
| Gecko minidumps | no change in v1.1 (reporter stays compiled out) | deliberate deferral | `breakpad.reportURL` repointing (TEL-03, already manifest-driven) is the only Gecko-side crash key in v1.1. Re-enabling `--enable-crashreporter` + a minidump upload/consent UI is a separate milestone's worth of privacy surface (consent prompt, `about:crashes`, symbolication pipeline) — TEL-04's "beyond endpoint repointing" is satisfied by the Sentry sidecar pipeline + the documented minidump follow-up, not by half-enabling Breakpad. **Confidence: HIGH** |

---

## Installation

```bash
# Theia workspace additions (exact pins; resolutions table keeps @theia/* paired)
# In theia/applications/browser/package.json or the workspace root:
yarn add --exact better-sqlite3@13.0.3
yarn add --exact @sentry/node@10.73.0

# No new root/generator dependencies.
# smol-toml stays 1.8.0 (do NOT downgrade: <1.6.1 has Snyk recursion advisories).
# sharp stays 0.35.4.

# Windows packaging host (PKG-01 procedure for docs/BUILD.md)
#   - NSIS 3.12  (https://nsis.sourceforge.io/Download)
#   - Windows SDK 10+ (MAKEAPPX, SIGNTOOL, makepri.exe) — MSIX path only
#   - then: mach package  →  mach repackage msix --unsigned  (test)
#     or:   mach build installer  (NSIS stub+full)

# macOS packaging host
#   - Xcode CLT only (hdiutil + iconutil are preinstalled)
#   - sharp PNG set → *.iconset/ → iconutil -c icns → mach package (DMG)

# Crash collector (downstream-operated, never in this repo)
#   - Self-hosted Sentry 26.8.0 install.sh, or SaaS Sentry DSN
#   - DSN lands in [telemetry] endpoint only
```

### Flake notes

- `theia` shell: no new inputs required for `better-sqlite3` prebuilds on x86_64-linux; the existing `python3` + `gnumake` + `pkg-config` + node-gyp-bin PATH already covers a source fallback rebuild (same path `drivelist` uses). If aarch64 packaging hosts appear, re-verify prebuild availability there.
- Optional: `pkgs.libicns` only if a Linux-side `png2icns` smoke check is wanted. Never required for shippable DMGs.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `Sqlite.sys.mjs` (chrome JS) | Raw `mozIStorageConnection` / `Services.storage` | Never in new code — `Sqlite.sys.mjs` *is* the mozStorage wrapper with the promise API, telemetry-filename hygiene, and shutdown blocking. Raw connections bypass all three. |
| `Sqlite.sys.mjs` + new `tabs.sqlite` | New tables in `places.sqlite` | Never — places is upstream-owned; every ESR rebase may migrate it. Our schema lives in our file. |
| `better-sqlite3@13.0.3` | `node:sqlite` (stdlib) | When it graduates stable on the pinned Node line. Today it is **Stability 1.2 / Release Candidate** (Node 25.7+; still flagged experimental on Node 22, unflagged only since 22.13 but API still shifting — `column()`, session tracking, and `location()` all landed mid-22.x). A platform surface cannot pin a moving API. Revisit at the next Node re-pin; the call shapes are deliberately similar so the swap is small. |
| `better-sqlite3@13.0.3` | `node-sqlite3` / `sqlite3` npm | Never — async-callback API, slower, heavier native surface, no advantage for a single-reader backend. |
| `better-sqlite3@13.0.3` | `sql.js` (WASM SQLite) | Only if the backend ever had to run where native modules cannot load. It can (the shell already builds `drivelist` native) — WASM would add a ~MB blob and synchronous-fs quirks for zero benefit. |
| `@sentry/node` + self-hosted Sentry | Self-hosted **Socorro** | Never — upstream explicitly declines external support; the stack (Antenna collector + processor + Postgres + ES + S3) is an ops team, not a downstream affordance. |
| `@sentry/node` | `electron/mini-breakpad-server` | Never — archived by Electron Dec 2022, CoffeeScript, no symbolication pipeline. Listed here only because Socorro's own README still names it. |
| `@sentry/node` | `wk8/sentry_breakpad` bridge | If v1.1 later re-enables the Gecko reporter and needs minidumps forwarded into Sentry — that is the documented escape hatch, not the starting point. |
| `mach repackage msix` + Windows SDK | Third-party MSIX packagers / Electron builders | Never — they cannot reproduce Mozilla's branding-aware `resources.pri`/manifest handling; `electron-builder` in particular would be a second packaging system alongside `mach`. |
| Host `iconutil` (macOS) | `libicns png2icns` for shippable icns | Only as a Linux smoke-check fallback. Shippable `.icns` comes from Apple's own tool on the Mac host (Mozilla's documented path). |
| Hand-rolled manifest validation (existing key table) | `zod`/`ajv` for new `[[extensions]]` kinds | If `configuration.toml` grows past ~50 keys. The new source kinds are three enum values + existing pin/sha fields — the key table covers them with better error messages to non-developers. |
| No ORM anywhere | Drizzle / TypeORM / Prisma / Sequelize | Never for this schema — one `tabs` table plus a version row, accessed from *two different runtimes* (Gecko JS, Node) no ORM spans. An ORM would be a third schema description disagreeing with the other two. Hand-written SQL in `PowerBrowserAPI` + one backend reader module, both asserting `schema_version`. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `node:sqlite` on Node 22 | Still experimental/RC on the pinned line; API shifted across 22.x minors (session API in .12, TypedArray bindings in .14, `columns()`/timeout in .16). A platform that pins exact versions cannot build on a moving stdlib surface | `better-sqlite3@13.0.3`; revisit at next Node re-pin |
| Socorro self-host | Explicitly unsupported for non-Mozilla use; multi-service ops burden no downstream will run | Self-hosted Sentry 26.8.0 or SaaS Sentry; DSN-only in tree |
| `mini-breakpad-server` | Archived, unmaintained since 2022 | Same as above |
| Any ORM | Cannot span Gecko/Node runtimes; triples schema descriptions for a single-table store | Hand SQL + `schema_version` assertion both sides |
| Second SQLite writer (backend writes to `tabs.sqlite`) | Lock contention + Firefox profile-lock corruption story | Backend opens `readonly: true`; all writes via `PowerBrowserAPI` |
| New tables in `places.sqlite` | Upstream-owned schema; rebase migrations collide | Own `tabs.sqlite` in profile dir |
| `sql.js` | WASM weight + sync-fs quirks with no payoff where native modules already build | `better-sqlite3` |
| Electron packagers / third-party MSIX tools | Second packaging system; cannot do Mozilla's branding-aware MSIX bits | `mach build installer` / `mach repackage msix` on packaging hosts |
| Re-enabling `--enable-crashreporter` in v1.1 | Opens consent/UI/symbolication surface (prompt, `about:crashes`, minidump retention) that dwarfs the milestone | Sentry sidecar pipeline now; Gecko reporter as a later milestone |
| New GUI frameworks / tab-strip UI libs | Explicitly out of scope — no GUI work until after SQL tabs (GUI-02/GUI-05 deferred) | `TabUriRegistry` URI identity as the data seam; UI later |
| `typescript@7.x`, Theia bump, yarn Berry/pnpm | Per v1 research — unrelated risk inside a hardening milestone | Current pins (TS ~5.9.3, Theia 1.74.1, yarn 1.22) |
| TOML 1.1-only syntax in `configuration.toml` | `builtins.fromTOML` is 1.0.0 and hard-fails on dates/new syntax; smol-toml 1.8 accepts 1.1, so the two readers would disagree | TOML 1.0 subset only; quote all dates as strings |

---

## Integration Points (existing tree)

| New capability | Manifest key | Generator emitter | Verifier row | Boundary note |
|----------------|--------------|-------------------|--------------|---------------|
| NSIS hardening (WR-04) | `[installer]` (+ quoting rules) | `branding.nsi` define quoting — reject bare `$VAR` | extend `verify-installer-schema.mjs` (self-test plants a bare `$VAR`) | none (build-time text) |
| Fixture root threading (WR-07) | — | installer verifier takes fixture `root` | extend `verify-installer-schema.mjs` | none |
| DMG/icns inputs | `[installer]` support_url + sharp PNG set | `.iconset/` file set under `generated/` | extend icon-output checker sizes → 16…1024+`@2x` | none |
| npm extension kind | `[[extensions]] source="npm"` | exact dep + `resolutions` entry in browser `package.json` | extend `verify-extension-pins.mjs` step 2 (installed version == pin) | none |
| local-path kind | `[[extensions]] source="path"` | `file:` dep / workspace member | generate-time existence hard-fail + build assertion | none |
| WebExtensions sibling | `[[extensions]]` webext entries | `powerbrowser/distribution/policies.json` `ExtensionSettings` | new policy-shape row (set equality from manifest, like tile manifest) | none |
| Sidecar crash pipeline | `[telemetry]` level + endpoint (DSN) | Sentry DSN into backend config; `Sentry.init` gated on level ≠ off | extend `verify-telemetry.mjs` (off ⇒ no init call reachable; endpoint ⇒ DSN agreement) | DSN is config, not an internal |
| SQL tabs store | (no new manifest keys — fixed `tabs.sqlite` name) | none (runtime file, not generated) | **new** `verify-sql-tabs-shape.mjs`: schema set-equality (`tabs` cols, `schema_version`) + URI-PK assertion | new `INTERNAL-APIS.md` rows: `Sqlite.sys.mjs` import + `Services.dirsvc` profile path, both inside `PowerBrowserAPI.sys.mjs` only |
| NAME-01 rename slice | `[identity] display_name → PowerBrowser` | re-run single-edit propagation; re-pin byte-identity comparands | re-pin `generated-byte-identity`, `brand_display_expectations`, trademark-surface scan | none |

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `better-sqlite3@13.0.3` | Node 22 (`NODE_MODULE_VERSION` 127) | v13 line supports 22.x/24.x; prebuilds cover x64. Source fallback uses the existing theia-shell node-gyp path |
| `better-sqlite3` (backend, readonly) | Gecko `Sqlite.sys.mjs` (writer) + WAL | Reader never blocks the writer; never open read-write outside the chrome module |
| `@sentry/node@10.73.0` | Node ≥18; Theia backend on Node 22 | Init once, before other imports (`--import` / first-line), DSN from `[telemetry] endpoint` only |
| `@theia/telemetry` (1.74.1, in-tree) | `@sentry/node` sink | Contribute `TelemetrySink`; do not fork telemetry |
| NSIS 3.12 output | Win10/11 installer hosts | Floor 3.11 (CVE-2025-43715); 3.12 also fixes SYSTEM priv-esc follow-up |
| `mach repackage msix --unsigned` | Win11 (OID path, admin install) | Signed MSIX needs the downstream's own cert + `--publisher` match; platform never ships a cert |
| `smol-toml@1.8.0` | `builtins.fromTOML` (Nix) | Agreement holds **only** on the TOML 1.0 subset — no dates, no 1.1-only syntax |
| `sharp@0.35.4` | Node ≥20.9 (Node-API v9) | Generator floor stays Node 20.9+, unchanged |
| ESR 153 `ExtensionSettings` | `policies.json` (UTF-8, `distribution/`) | `install_url` optional for AMO-hosted (new in 153); `runtime_blocked_hosts`, `blocked_permissions` available |

---

## Sources

- npm registry metadata: `better-sqlite3` 13.0.3 (2026-08-05), `@sentry/node` 10.73.0 (2026-09-03), `smol-toml` 1.8.0, `sharp` 0.35.4 — **HIGH**
- Node.js docs (`nodejs.org/api/sqlite`): `node:sqlite` added v22.5.0, unflagged v22.13.0 but Stability 1.2 Release Candidate — **HIGH** (why: not stable on pinned line)
- Firefox Source Docs: MSIX packaging (`mach repackage msix`, MAKEAPPX/SIGNTOOL/`WINDOWSSDKDIR` lookup, `linux64-msix-packaging` toolchain), Windows installer kinds (stub/full/MSI/MSIX), macOS DMG lzma + `libdmg-hfsplus`, `UpdatingMacIcons` (`iconutil -c icns`) — **HIGH**
- NSIS 3.12 release notes (SourceForge, 2026-04-19) + CVE-2025-43715 fix in 3.11 — **HIGH**
- Firefox ESR release notes: 153.0esr (2026-07-21), 153.2.0 (2026-09-01); whattrainisitnow ESR schedule — **HIGH**
- Theia GitHub releases (v1.74.1 latest, 2026-08-06) + theia-ide `package.json` (`@theia/cli` 1.73.1, `theiaPlugins`/`theiaPluginsDir` mechanism) + `@theia/cli` README (plugin download properties) — **HIGH**
- Firefox Source Docs Places architecture (places.sqlite via mozStorage; `Bookmarks.sys.mjs`/`History.sys.mjs` async APIs) + searchfox `toolkit/modules/Sqlite.sys.mjs` header (TelemetryFilename privacy warning) — **HIGH**
- Socorro README ("Mozilla-specific… no capacity to support external users"; alternatives list) + `electron/mini-breakpad-server` archived Dec 2022 — **HIGH** (why: not Socorro/mini-breakpad)
- getsentry/self-hosted 26.8.0 (2026-08-17) — **MEDIUM-HIGH**
- Firefox enterprise docs: `ExtensionSettings` reference (ESR 153 fields), `policies.json` locations, `distribution/extensions/<id>.xpi` bundling — **HIGH**
- libicns 0.8.1 (`png2icns`, 1024px support; man page + MacPorts) — **MEDIUM** (fallback role only)
- Local tree: `scripts/verify-installer-schema.mjs` (schema-complete-only contract, PKG-01 handoff comment), `scripts/verify-extension-pins.mjs` (`--packed` archive-hash design), `powerbrowser/distribution/policies.json`, `powerbrowser/INTERNAL-APIS.md` (D-107/D-108: session store deliberately untouched, ground kept clean for the SQL store), `powerbrowser/endpoint-allowlist.json` (`breakpad.reportURL` TEL-03 wiring) — **HIGH**

---

*Stack research for: v1.1 Hardening and SQL Tabs (PKG-01, EXT-02, TEL-04, SQL-01)*
*Researched: 2026-09-04*
