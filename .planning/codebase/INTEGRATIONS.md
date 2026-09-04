# External Integrations

**Analysis Date:** 2026-09-04

> Design intent: this product keeps the integration surface as small as physically possible for a real browser. The machine-readable contract is `powerbrowser/endpoint-allowlist.json` (BRAND-04, D-83..D-88): any host observed at runtime that is absent from `hosts`, or listed with disposition `deny`, FAILS `scripts/verify-endpoints.sh`. There is no SaaS backend of our own, no analytics, no auth provider, no database service, no webhook in either direction.

## APIs & External Services

**Mozilla services (waived, must stay working — substrate is a real browser):**
- Remote Settings - `firefox.settings.services.mozilla.com` (`allow`, `powerbrowser/endpoint-allowlist.json:4-8`; poll `services.settings.poll_interval = 86400`)
  - Signature chain CDN - `content-signature-2.cdn.mozilla.net` (`allow`)
  - Attachment CDN (e.g. CRLite blobs) - `firefox-settings-attachments.cdn.mozilla.net` (`allow`)
  - SDK/Client: Gecko in-tree (`services/settings/Utils.sys.mjs`); override refused off Nightly, so the allowlist waives rather than disables
  - Auth: none (anonymous read-only CDN + API)

**Google services (waived — Safe Browsing protection + Widevine DRM stay on, D-85/D-86):**
- Safe Browsing v2 - `safebrowsing.google.com` (`allow`, prefs `browser.safebrowsing.provider.google.*`)
- Safe Browsing v4 - `safebrowsing.googleapis.com` (`allow`, prefs `browser.safebrowsing.provider.google4.*`)
- Widevine CDM download - `edgedl.me.gvt1.com` (`allow`; in-tree `toolkit/content/gmp-sources/widevinecdm.json`, no Mozilla host involved; idle only since `media.eme.enabled` defaults false on Linux)
- Widevine Omaha update check - `update.googleapis.com` (`allow`, pref `media.gmp-manager.chromium-update-url`)
  - Redirect targets in the same flow - `www.google.com`, `dl.google.com` (`allow`; protocol redirect varies per run)

**Theia extension marketplace (user-initiated only):**
- Open VSX - `https://open-vsx.org`
  - SDK/Client: `@theia/ovsx-client` + `@theia/vsx-registry` (`theia/applications/browser/package.json:57,73`)
  - Wired in: start scripts pin `VSX_REGISTRY_URL=https://open-vsx.org` (`theia/applications/browser/package.json:84`, `scripts/verify-platform.sh:665,2917`)
  - Auth: none in-tree; extension install is an explicit user action, never an unattended callout (not in the endpoint allowlist because it never fires at startup)

**Build-time only (never contacted at runtime by the shipped product):**
- npm/yarn registry - `yarn install --frozen-lockfile` reproduces `theia/yarn.lock` (1,058-package transitive tree at 49 `@theia/*` packages, `docs/BUILD.md`); `--ignore-scripts` + one explicit `node-gyp rebuild` of `drivelist` keeps unaudited install scripts (parcel/watcher, keytar, puppeteer's Chromium fetch) from running
- GitHub - `https://github.com/mozilla-firefox/firefox.git` cloned by `scripts/fetch-upstream.sh` at pinned tag `FIREFOX_153_1_0esr_RELEASE`; GitHub API is never called; rebase CI (`rebase-upstream.yml`) only runs `scripts/rebase-upstream.sh` clone/replay/verify
- Nixpkgs binary cache (implicit via `nix develop`; pinned in `flake.lock`)
- OS DNS only as side effect - speculative prefetch of the in-product `https://powerbrowser.org/` welcome link is killed via `network.dns.disablePrefetch = true` rather than removing the link (`powerbrowser/endpoint-allowlist.json:80-83`)

**Explicitly disabled (deny-listed, gated by compile flag and/or blanked pref in `powerbrowser/branding/{dev,release}/pref/firefox-branding.js`):**
- `aus5.mozilla.org` (update service; `--disable-updater` compiled), `normandy.cdn.mozilla.net` (`MOZ_NORMANDY=False` compiled out), `incoming.telemetry.mozilla.org` (`MOZ_SERVICES_HEALTHREPORT=False` compiled out + `toolkit.telemetry.*`/`datareporting.*` prefs), `detectportal.firefox.com` (captive portal off), `push.services.mozilla.com` (`dom.push.serverURL` blanked; API surface left), `contile.services.mozilla.com` (sponsored tiles off), `location.services.mozilla.com` (`browser.region.network.url` blanked), `services.addons.mozilla.org` (`extensions.getAddons.cache.enabled=false`), `ciscobinary.openh264.org` (`extensions.update.autoUpdateDefault=false`), `cloudflare-dns.com` / `example.org` / `ipv4only.arpa` (`network.connectivity-service.enabled=false`)

## Data Storage

**Databases:**
- None. No SQLite/Postgres/IndexedDB service is provisioned or contacted; the "future unified SQL store" (SEED-001) is explicitly dormant and the session store is deliberately untouched (`powerbrowser/INTERNAL-APIS.md:50-54`).
  - Connection: not applicable
  - Client: not applicable

**File Storage:**
- Local filesystem only. Supervisor state is per-launch + in-memory (D-107: port, PID, token, log ring buffer never touch disk from `TheiaService` itself).
- The one persisted file is the sidecar state record `<configDir>/sidecar-state-<profileKey>.json` (`powerbrowser/shell/TheiaService.sys.mjs:189`), where `_resolveConfigDir()` (`powerbrowser/shell/TheiaService.sys.mjs:398`) prefers `$XDG_CONFIG_HOME/powerbrowser` and falls back to `$HOME/.config/powerbrowser`; the profile key suffix (from `PowerBrowserAPI.getProfileDir`, `powerbrowser/shell/PowerBrowserAPI.sys.mjs:71`) keeps two `--profile` instances from reaping each other's backends.
- Theia user/plugin data lives under `THEIA_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"` (start script, `theia/applications/browser/package.json:84`); the verify harness redirects this to a throwaway dir (`scripts/verify-platform.sh`, `HARNESS_CONFIG_HOME`).
- No S3/GCS/remote bucket; no file-upload endpoint.

**Caching:**
- None at runtime (no Redis/Memcached/CDN in the product path). Build-time caches only: `objdir/` + `objdir-release/` (Gecko), `theia/**/node_modules/`, esbuild incremental state, `sccache` (`RUSTC_WRAPPER=sccache`, `flake.nix:85`).

## Authentication & Identity

**Auth Provider:**
- None (no OAuth/OIDC/SAML, no user accounts). Trust boundary is machine-local: anything that can reach loopback `127.0.0.1:3000` is one `Origin`-less request away from the backend (D-66), so a per-launch secret is the whole gate.
  - Implementation: `TheiaService` mints a random token per launch → hands it to the backend over the **stdin pipe** (`writeStdinLine`, never the spawn environment — `/proc/<pid>/environ` is same-uid readable for process lifetime) → backend `@powerbrowser/token-gate` (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`) front-inserts (`unshift`) an Express `EarlyExpressMiddleware` gate ahead of the stock Theia connection-token middleware, rejecting every plain-HTTP route and WebSocket upgrade without the token; shell sets the matching `POWERBROWSER_TOKEN` session cookie via `PowerBrowserAPI.setSessionCookie` (`Services.cookies.add`, `SameSite=Lax` — Strict would drop it on the chrome→loopback top-level navigation — `SCHEME_HTTP` for loopback-HTTP, `powerbrowser/shell/PowerBrowserAPI.sys.mjs:160-178`).
  - Fail-closed: missing token exits the backend with code 78, never a pass-through; `POWERBROWSER_TOKEN_DISABLE=1` dev bypass exists for `scripts/smoke-theia.sh` / `scripts/verify-platform.sh` only and prints a WARNING (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:32-48`).
  - Asserted by: `side02-token-negative/positive`, `side02-index-gated`, `side04-token-not-in-environment` checks in `scripts/verify-platform.sh`.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog/Crashlytics; crash reporter compiled out via `--disable-crashreporter` in `.mozconfig:13`).

**Logs:**
- In-process only: supervisor ring buffer (`powerbrowser.sidecar.logBufferLines` = 500, `powerbrowser/shell/TheiaService.sys.mjs:1332`), chrome `dump()` readiness sentinels (`POWERBROWSER_SHELL_READY/SWAP`, needs `browser.dom.window.dump.enabled=true` in `powerbrowser/shell/powerbrowser-sidecar.js`), user-facing strings restricted to the copy table in `powerbrowser/shell/TheiaService.sys.mjs:18-44` with identifiers in the labelled diagnostics layer (`getFailureDetails()`), enforced by `scripts/verify-shell-error-copy.mjs`.
- No log shipper; verification output is the `verify-platform.sh` summary table.

## CI/CD & Deployment

**Hosting:**
- No hosted environment. Product is a locally-built desktop app (Linux first): Gecko binary + supervised sidecar. Desktop entries emitted by the generator (`generated/powerbrowser.desktop`, `generated/powerbrowser-release.desktop`).

**CI Pipeline:**
- GitHub Actions, one workflow: `.github/workflows/rebase-upstream.yml` (`workflow_dispatch` only, `contents: read` + `persist-credentials: false`; runs the residual-brand scan then `scripts/rebase-upstream.sh` clone/replay/verify — never `./mach build`, never deploys).
- Commit gate is local: `scripts/verify-platform.sh --quick` (no build/browser/display, seconds); full run builds + launches real binaries; `--gate` adds the `WINDOWS.md` known-open exclusions. Adding a check = one row in the `CHECKS` registry, never a new driver.

## Environment Configuration

**Required env vars:**
- Build/dev: `LIBCLANG_PATH` (consumed by `.mozconfig:10`), `MOZBUILD_STATE_PATH` (set repo-local by `flake.nix:68`), `RUSTC_WRAPPER=sccache` (`flake.nix:85`); `POWERBROWSER_OBJDIR` / `POWERBROWSER_BRANDING` select the release variant at build time (`.mozconfig:6,15`)
- Runtime: `XDG_CONFIG_HOME` (sidecar state + `THEIA_CONFIG_DIR` resolution), `VSX_REGISTRY_URL=https://open-vsx.org` (set by the start script, not required from the user), `POWERBROWSER_TOKEN*` (plumbed supervisor→backend over stdin; never set by hand except `POWERBROWSER_TOKEN_DISABLE=1` in the harness)
- `PATH`-resolved at spawn: `node` (unless `powerbrowser.sidecar.nodePath` pref set), system `inkscape` (generator icon step only)

**Secrets location:**
- There are none to store: no API keys, tokens, or credentials exist in the tree (`.env*` absent; `.envrc` is literally `use flake`). The only secret in the system is the per-launch sidecar token, which lives in memory + the session cookie for one process lifetime and is never written to disk, env, or logs. Theia AI providers (`@theia/ai-anthropic`, `@theia/ai-openai`) ship with no keys configured.

## Webhooks & Callbacks

**Incoming:**
- None. The sole local HTTP surface is the sidecar backend on loopback, and its only bespoke route `GET /powerbrowser/health` (`theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts:82`, polled by `TheiaService._pollUntilHealthy`, `powerbrowser/shell/TheiaService.sys.mjs:739`) sits behind the token gate — it is a supervisor health probe, not a webhook, and receives no third-party callbacks.

**Outgoing:**
- None initiated by first-party code. The only network egress is the platform's own: the waived Mozilla/Google safety/DRM hosts above plus explicit user actions (typed navigation, clicked links incl. the welcome `POWERBROWSER_REPO_URL`, Open VSX installs, geolocation-gated `geo.provider.network.url` left intact). No telemetry/reporting endpoint is ever called (compiled out + blanked prefs, layer-3 live-capture verified by `scripts/verify-endpoints.sh`).

---

*Integration audit: 2026-09-04*
