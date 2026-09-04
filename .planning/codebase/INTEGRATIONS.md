# External Integrations

**Analysis Date:** 2026-09-04

Single source of truth for network policy: `powerbrowser/endpoint-allowlist.json` (BRAND-04, D-83..D-88). Any host observed at runtime that is absent from its `hosts` array — or listed with disposition `deny` — fails `scripts/verify-endpoints.sh` (3 layers: installed-pref assertion, static pref/host cross-check, live 35 s capture against the built binary). Every `deny` below is an observed-or-default host that was deliberately closed, not an unused entry.

## APIs & External Services

**Mozilla services (waived — real-browser parity):**
- Remote Settings - `firefox.settings.services.mozilla.com` (`allow`) + signature chain `content-signature-2.cdn.mozilla.net` (`allow`) + attachment CDN `firefox-settings-attachments.cdn.mozilla.net` (`allow`)
  - Reason: CRLite revocation data, intermediate-cert preloading, tracking-protection lists (D-83). Poll cadence `services.settings.poll_interval = 86400`
  - Client: in-tree Gecko (`services/settings/Utils.sys.mjs`); no SDK, no key

**Google services (waived — security / DRM parity):**
- Safe Browsing v2 + v4 - `safebrowsing.google.com`, `safebrowsing.googleapis.com` (both `allow`, D-85; prefs `browser.safebrowsing.provider.google{,4}.*`)
- Widevine CDM flow - `edgedl.me.gvt1.com` (`allow`: CDM fetch from in-tree `widevinecdm.json`), `update.googleapis.com` (`allow`: Chromium-Omaha update check via `media.gmp-manager.chromium-update-url`), `www.google.com` + `dl.google.com` (`allow`: redirect targets of that check). D-86; no Mozilla host involved

**Mozilla/update/telemetry hosts (explicitly closed — all `deny`):**
- `aus5.mozilla.org` — AUS update host; updater compiled out (`--disable-updater` in `.mozconfig`), `media.gmp-manager.url` / `extensions.systemAddon.update.url` blanked in `powerbrowser/branding/{dev,release}/pref/firefox-branding.js`
- `normandy.cdn.mozilla.net` — Normandy/Shield compiled out (`MOZ_NORMANDY=False` in `patches/010-powerbrowser-identity.patch`); `app.normandy.enabled` / `app.shield.optoutstudies.enabled` also `false` (defence in depth)
- `incoming.telemetry.mozilla.org` — Telemetry compiled out (`MOZ_SERVICES_HEALTHREPORT=False` in `patches/010-powerbrowser-identity.patch`); `toolkit.telemetry.*`, `datareporting.*` prefs disabled/blanked; enterprise `powerbrowser/distribution/policies.json` sets `DisableTelemetry: true`, `DisableFirefoxStudies: true`, `DisableAppUpdate: true`
- `detectportal.firefox.com` — Captive-portal detection off (`network.captive-portal-service.enabled=false`, `captivedetect.canonicalURL=""`)
- `push.services.mozilla.com` — Web Push server URL blanked (`dom.push.serverURL=""`); the Push *API* (`dom.push.enabled`) stays on (fires only on explicit site request)
- `contile.services.mozilla.com` — Sponsored tiles off (`browser.topsites.contile.enabled=false` + `showSponsored*` prefs `false`)
- `location.services.mozilla.com` — Region lookup blanked (`browser.region.network.url=""`); geolocation provider API untouched (explicit-request only)
- `services.addons.mozilla.org` — AMO search/langpack/discovery/mapping closed (`extensions.getAddons.cache.enabled=false` master switch + five URL prefs blanked)
- `ciscobinary.openh264.org` — OpenH264 auto-download closed (`extensions.update.autoUpdateDefault=false`; `media.gmp-gmpopenh264.enabled=false` alone was proven insufficient — see `powerbrowser/branding/dev/pref/firefox-branding.js` ledger comment)
- `cloudflare-dns.com`, `example.org`, `ipv4only.arpa` — `NetworkConnectivityService` probes closed at the master switch (`network.connectivity-service.enabled=false`)
- `powerbrowser.org` — Own project link (rendered by `theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`) speculative-prefetch closed (`network.dns.disablePrefetch=true`); the link itself stays (explicit click is a user request)

**Extension registry:**
- Open VSX (`https://open-vsx.org`) - Theia extension host registry
  - Client: `@theia/ovsx-client` + `@theia/vsx-registry` (composed `1.74.1` deps of `@powerbrowser/tab-uris` and the browser app)
  - Wiring: `VSX_REGISTRY_URL=https://open-vsx.org` in the `start` script of `theia/applications/browser/package.json` (also set by `scripts/verify-platform.sh` smoke paths); `THEIA_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"`
  - Auth: none — public registry reads; no token or env var in tree

**AI model providers (user-configured, nothing in tree):**
- Anthropic / OpenAI / MCP servers - Via composed `@theia/ai-anthropic`, `@theia/ai-openai`, `@theia/ai-mcp(-ui)`, `@theia/ai-chat(-ui)`, `@theia/ai-core(-ui)`, `@theia/ai-ide`, `@theia/ai-editor`, `@theia/ai-terminal`, `@theia/ai-code-completion` (all `1.74.1` in `theia/applications/browser/package.json`)
  - Auth: end-user API keys entered at runtime through Theia preferences; no provider key, endpoint override, or default model is committed anywhere (`inventory/brand-tokens.json` and `scripts/scan-brand-residue.mjs` would flag leaked tokens; never add one)
  - Note: `configuration.toml` plans `[telemetry]` level + endpoint and `[extensions]` declarations per `.planning/PROJECT.md`, but neither section exists in the manifest or `scripts/lib/config-schema.json` yet — no telemetry destination or extension-install pipeline is wired

**Source control / upstream:**
- `https://github.com/mozilla-firefox/firefox.git` - Gecko upstream remote, shallow-cloned at `FIREFOX_153_1_0esr_RELEASE` by `scripts/fetch-upstream.sh` (`TAG` env overrides). No auth (public HTTPS clone). `scripts/rebase-upstream.sh` + `.github/workflows/rebase-upstream.yml` replay `patches/*.patch` onto new tags
- `github.com` link target in the Theia welcome widget is a rendered hyperlink only (see `deny` entry above), not an API integration

## Data Storage

**Databases:**
- None. No SQLite/Postgres/IndexedDB integration is authored in this tree (Gecko-internal Places storage lives inside `upstream/` and is untouched by the patch stack). There is no ORM, migration tool, connection string, or `DATABASE_*` env var anywhere

**File Storage:**
- Local filesystem only. No S3/GCS/Azure integration, no upload SDK
  - Browser profile + Theia user data: `THEIA_CONFIG_DIR` (`~/.config/powerbrowser` by default) — created at startup in `theia/applications/browser/package.json` `start` script
  - Theia workspace files: served from the user's local checkout/directories via `@theia/filesystem` + `@theia/workspace`
  - Build inputs: `configuration.toml` + `brand/` (logos/icons); build outputs: `generated/` (gitignored), `objdir/` / `objdir-release/` (gitignored), `powerbrowser/branding/{dev,release}/` (tracked Phase-1 originals, the byte-identity comparand)
  - Upstream source: `upstream/` (gitignored ~5 GB checkout, re-materialized by `scripts/fetch-upstream.sh`, never hand-edited)

**Caching:**
- No runtime cache service (no Redis/Memcached/CDN integration)
- Build-only caches: `sccache` (`RUSTC_WRAPPER=sccache` in the `.#firefox` shell, `flake.nix`) for Gecko recompiles; Theia `theia rebuild:browser --cacheRoot ../..` for native modules. Neither is a product dependency

## Authentication & Identity

**Auth Provider:**
- None external. No OAuth/OIDC/SAML, no login page, no session store, no JWT issuer

**Internal loopback trust (not user auth):**
  - Implementation: per-spawn supervisor handshake between `powerbrowser/shell/TheiaService.sys.mjs` (Gecko side: mints token → resolves sidecar → spawns backend on port 0 → watches stdout sentinel → steady-state health loop with pinned-port restart/backoff) and `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` + `theia/extensions/token-gate/src/node/powerbrowser-env.ts` (Theia backend: `POWERBROWSER_SUPERVISED=1` arms parent-death watchdog; `POWERBROWSER_TOKEN` captured from the environment then deleted and replaced by the stdin-delivered value; every `POWERBROWSER_*` key swept from the IPC environment)
  - Transport: `http://127.0.0.1` loopback only — `127.0.0.1` is an explicit `allow` entry in `powerbrowser/endpoint-allowlist.json` (exact-string match, admits only that literal address). A build that cannot reach loopback has no GUI
  - Dev bypass: `POWERBROWSER_TOKEN_DISABLE` (named dev flag; `scripts/verify-dev-flag-off.mjs` + shipped `theia.frontend.config.powerbrowserPrivilegedJs: false` in `theia/applications/browser/package.json` assert it stays off in release)
  - Policy hardening adjacent to identity: `powerbrowser/distribution/policies.json` (`DisableAppUpdate`, `DisableTelemetry`, `DisableFirefoxStudies`)

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry/Datadog/Crashpad integration; Gecko crash reporter is compiled OUT (`--disable-crashreporter` in `.mozconfig`)

**Logs:**
- Gecko side: `nsIConsoleService` + `MOZ_LOG` (e.g. `MOZ_LOG=PageMessages:5` referenced in `scripts/verify-platform.sh`); shell failures surface through `TheiaService.sys.mjs` user-facing error copy (Retry/Details screen — identifiers stay in the diagnostics layer per `scripts/verify-shell-error-copy.mjs`, never in user text)
- Theia side: `@theia/output` channel + `@theia/console` (composed framework packages); backend stdout watched by the supervisor for the ready sentinel
- Build/verify: `scripts/verify-platform.sh` registry (every check has `--self-test` fault-injection proving it goes red); `scripts/verify-endpoints.sh` 3-layer network gate; no log aggregator or dashboard

## CI/CD & Deployment

**Hosting:**
- No hosted target. The product is a locally installed desktop application produced by Gecko packaging (the reason the ESR patch-set model exists — Firefox's installer machinery). Linux install surface: `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop` (generated from `configuration.toml`; `Exec`/`Icon` absolute paths use the `@POWERBROWSER_REPO_ROOT@` token substituted at install time per `docs/BUILD.md`)

**CI Pipeline:**
- `.github/workflows/rebase-upstream.yml` — `workflow_dispatch`-only (deliberately no `schedule:`), `permissions: contents: read` + `persist-credentials: false`. Exercises `scripts/rebase-upstream.sh` clone/replay/verify only; NEVER runs `./mach build` (Nix Gecko closure does not fit a hosted runner). Post-rebase `scripts/toolchain-baseline.sh` diff is a local operator step under `nix develop .#firefox`
- Commit gate is local, not CI: `scripts/verify-platform.sh --quick` (brand-residue scan via `scripts/scan-brand-residue.mjs` over `git ls-files` scoped by `inventory/brand-tokens.json`, generated-byte-identity, registry shape, shell-error copy/contract, GUI-01, customize-inert, dev-flag-off, endpoints layer 1–2). No lint/test/deploy workflow exists yet

## Environment Configuration

**Required env vars (build/dev shells, not secrets):**
- `TAG` — optional override of the `FIREFOX_153_1_0esr_RELEASE` pin in `scripts/fetch-upstream.sh`
- `MOZCONFIG`, `MOZBUILD_STATE_PATH` (repo-local `.mozbuild/`), `LIBCLANG_PATH`, `RUSTC_WRAPPER=sccache` — set by the `.#firefox` shell hook in `flake.nix` (plus `CC`/`CXX` = clang; bare `AS`/`LD`/`NM`/`AR`/… unset so `moz.configure` detection wins)
- `POWERBROWSER_OBJDIR`, `POWERBROWSER_BRANDING` — release-build overrides for the dev defaults baked into `.mozconfig`
- `VSX_REGISTRY_URL`, `THEIA_CONFIG_DIR` / `XDG_CONFIG_HOME` — Theia runtime (see above)
- `POWERBROWSER_SUPERVISED`, `POWERBROWSER_TOKEN`, `POWERBROWSER_TOKEN_DISABLE` — sidecar handshake (see above)

**Secrets location:**
- There are no secrets. No `.env` consumption, no credential files, no private keys, no cloud service-account files exist in the tree (by design — the residual-brand scan and the committed-file model would surface them). Forbidden-file classes from the mapping contract (`.env*`, `credentials*`, `*.pem/*.key`, `serviceAccountKey.json`, etc.) were not created. AI provider keys are runtime user input only and must never be committed

## Webhooks & Callbacks

**Incoming:**
- None. No HTTP server is exposed beyond the loopback Theia backend (spawned per browser session on port 0, token-gated, parent-supervised — not a webhook receiver). No GitHub webhook drives CI (rebase workflow is `workflow_dispatch`-only)

**Outgoing:**
- None as webhooks. The only unattended network callouts are the Gecko-level ones enumerated under "APIs & External Services" (Remote Settings poll, Safe Browsing list updates, Widevine update check, speculative DNS prefetch — the last now disabled). All are allow/deny-gated by `powerbrowser/endpoint-allowlist.json` + `scripts/verify-endpoints.sh`, not by webhook configuration. There is no analytics, telemetry-upload, crash-report-upload, or update-ping callback in the shipped configuration (update URLs blanked, telemetry server blanked, crash reporter compiled out)

---

*Integration audit: 2026-09-04*
