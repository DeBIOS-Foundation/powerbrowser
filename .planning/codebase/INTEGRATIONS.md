# External Integrations

**Analysis Date:** 2026-09-07

The governing artifact here is `powerbrowser/endpoint-allowlist.json` — the single machine-readable
source of truth for every host this build may contact and every pref that gates an unattended
callout. `scripts/verify-endpoints.sh` reads it directly (layers 1 and 3): a host observed at
runtime that is absent from the file, or present with disposition `deny`, is a failure; a pref whose
installed value differs from `expect` is a failure. Treat any new outbound call as requiring an
entry there first.

## APIs & External Services

**Allowed (disposition `allow`):**
- Mozilla Remote Settings — `firefox.settings.services.mozilla.com`, plus `content-signature-2.cdn.mozilla.net` and `firefox-settings-attachments.cdn.mozilla.net`. Kept on for CRLite revocation, intermediate preloading, tracking-protection lists. Poll interval 24h.
- Google Safe Browsing — `safebrowsing.google.com` (v2), `safebrowsing.googleapis.com` (v4). Deliberate waiver, not an inherited default.
- Widevine CDM — `edgedl.me.gvt1.com` (download), `update.googleapis.com` (Omaha update check), with `www.google.com` / `dl.google.com` as observed redirect targets. DRM stays working with no Mozilla host involved.
- Fork update service — `updates.powerbrowser.org`, serving `update.xml`. The only unattended callout the enabled updater may make.
- Theia sidecar loopback — `127.0.0.1`, exact-string match only. Architecture, not a concession: `powerbrowser/shell/TheiaService.sys.mjs` supervises the bundled Node backend there.

**Denied (present in the allowlist so an observation fails loudly):**
`aus5.mozilla.org`, `normandy.cdn.mozilla.net`, `incoming.telemetry.mozilla.org`,
`detectportal.firefox.com`, `push.services.mozilla.com`, `contile.services.mozilla.com`,
`location.services.mozilla.com`, `services.addons.mozilla.org`, `ciscobinary.openh264.org`,
`cloudflare-dns.com`, `example.org`, `ipv4only.arpa`, `powerbrowser.org` (DNS-prefetch of the
welcome-widget link, closed by `network.dns.disablePrefetch`).

Normandy and health-report telemetry are compiled out entirely by `imply_option` hunks in
`patches/010-powerbrowser-identity.patch`; the corresponding prefs are disabled as defence in depth.

**Extension marketplace:**
- Open VSX — `https://open-vsx.org`, set via `VSX_REGISTRY_URL` in `theia/applications/browser/package.json`'s `start` script. Extension pins would be declared in `configuration.toml` `[[extensions]]`; this project declares none, so `generated/theia-plugins.json` stays empty. `scripts/verify-extension-pins.mjs` guards it.

**AI backend (optional, off by default):**
- OpenCode over Agent Client Protocol — `@agentclientprotocol/sdk`, supervised as a local subprocess in `theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts`. Selected by `configuration.toml` `[ai] backend` (currently `"off"`, echoed to `generated/ai-backend.json`). Config in `opencode.json`. Checks: `scripts/verify-opencode-bridge.mjs`, `verify-opencode-presets.mjs`, `verify-opencode-tracer.mjs`.
- `@theia/ai-anthropic` and `@theia/ai-openai` ship as dependencies of the app but no provider credentials are configured in the tree.

## Data Storage

**Databases:**
- SQLite via `better-sqlite3` 13.0.3 — `tabs.sqlite` in the profile directory, opened **read-only** by `theia/extensions/tab-uris/src/node/tab-query-service.ts` (`TAB_QUERY_FILE_NAME`). The chrome side owns the writer; the sidecar is a reader. Location comes from `POWERBROWSER_PROFILE_DIR`. Guarded by `scripts/verify-sql-store-roundtrip.mjs`, `verify-sql-store-second-writer.mjs`, `verify-sql-store-soak.mjs`, `verify-sql-store-absence.mjs`.
- Gecko's own profile stores (places, prefs) reached only through `powerbrowser/shell/PowerBrowserAPI.sys.mjs`.

**File Storage:**
- Local filesystem only. User-scoped state goes through `@theia/userstorage` (`customize`, `modes` extensions) under `THEIA_CONFIG_DIR` = `${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser`.

**Caching:**
- sccache for Rust/C++ build artifacts. No runtime cache service.

## Authentication & Identity

**Auth Provider:**
- None external. The only auth boundary is the sidecar's own token gate: `@powerbrowser/token-gate`.
  - `theia/extensions/token-gate/src/node/powerbrowser-env.ts` snapshots every `POWERBROWSER_*` variable at module load and deletes it from `process.env`, so child processes and Theia's `EnvironmentUtils.mergeProcessEnv` never inherit it.
  - `token-gate-backend-contribution.ts` enforces the token on backend endpoints; `parent-watchdog-backend-contribution.ts` terminates the sidecar when the chrome parent dies.
  - Shared secret and port arrive as `POWERBROWSER_MCP_TOKEN` / `POWERBROWSER_MCP_PORT` (also surfaced as `OPENCODE_BRIDGE_ENV_TOKEN` / `OPENCODE_BRIDGE_ENV_PORT` for the AI bridge).
  - `POWERBROWSER_TOKEN_DISABLE=1` exists for standalone sidecar debugging only.
- Checks: `scripts/verify-theia-endpoints.mjs`, `verify-backend-env-readers.mjs`, `verify-endpoints.sh`.

## Monitoring & Observability

**Error Tracking:**
- Gecko crash reporter is compiled out (`--disable-crashreporter` in `.mozconfig`); `breakpad.reportURL` is blanked. In-repo crash handling is `scripts/crash-collector.mjs` with policy in `docs/CRASH-POLICY.md`, verified by `scripts/verify-crash-collector.mjs`.
- Shell errors surface through `POWERBROWSER_SHELL_ERROR` / `POWERBROWSER_ERROR_DIAGNOSTICS` into the diagnostics layer; copy is constrained by `scripts/verify-shell-error-copy.mjs` and `verify-shell-error-contract.mjs`.

**Telemetry:**
- `@powerbrowser/telemetry` (`telemetry-sender.ts`, `telemetry-logger.ts`, `telemetry-preferences.ts`). Levels: `off | crash | error | all`, from `configuration.toml` `[telemetry]`. Currently `level = "off"` with `endpoint` unset — nothing leaves the application, and an enabled level with no endpoint fails the generate. Derived into `generated/theia-telemetry.json` and the app's `powerbrowserTelemetry` frontend config. Checked by `scripts/verify-telemetry.mjs`.
- Mozilla telemetry is denied at host, pref, and compile level (`DisableTelemetry` policy, `toolkit.telemetry.server` blanked, `MOZ_SERVICES_HEALTHREPORT` compiled out).

**Logs:**
- Theia's `ILogger` / `@theia/output` channels; stderr from the shell supervisor.

## CI/CD & Deployment

**CI Pipeline:**
- GitHub Actions:
  - `.github/workflows/verify.yml` — every push and PR: `generate`, `generate --check`, then the whole `--quick` table via `scripts/verify-platform.sh`. Uses the `.#theia` Nix shell (required for the pinned inkscape). `contents: read`, `persist-credentials: false`.
  - `.github/workflows/rebase-upstream.yml` — mirrors the ESR pin and reruns `scripts/scan-brand-residue.mjs` so a rebase that reintroduces a brand token fails there.
- No tier-3 Gecko build in CI.

**Hosting / Distribution:**
- Self-hosted MAR updates from `https://updates.powerbrowser.org/update.xml`, set by the enterprise policy in `powerbrowser/distribution/policies.json` (which `getUpdateURL` prefers over the baked `application.ini` URL). Verified hop-by-hop with zero Mozilla resolutions by `scripts/verify-mar-update-hop.mjs`.
- Installer inputs generated into `generated/installer/`; `scripts/verify-installer-schema.mjs` and `verify-installer-build-proof.mjs` gate them. Process in `docs/RELEASING.md`.
- Desktop entries: `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop`.

## Environment Configuration

**Required at runtime (set by the chrome shell for the sidecar):**
- `POWERBROWSER_MCP_PORT`, `POWERBROWSER_MCP_TOKEN` — sidecar endpoint and gate token
- `POWERBROWSER_PROFILE_DIR` — profile root, where `tabs.sqlite` lives
- `POWERBROWSER_SIDECAR_PREFS`, `POWERBROWSER_MODES_JSON`, `POWERBROWSER_DECK_STATE`, `POWERBROWSER_APP_IDENTITY`, `POWERBROWSER_MARK_SVG` / `POWERBROWSER_MARK_DATA_URI`
- `THEIA_CONFIG_DIR`, `VSX_REGISTRY_URL` — set by the app `start` script

**Build-time:**
- `POWERBROWSER_OBJDIR`, `POWERBROWSER_BRANDING` (consumed by `.mozconfig`), `MOZCONFIG`, `MOZBUILD_STATE_PATH`, `RUSTC_WRAPPER`, `LIBCLANG_PATH`
- `TAG` / `FIREFOX_ESR_TAG` — overrides or supplies the ESR pin to `scripts/fetch-upstream.sh`

**Secrets location:**
- No `.env` file and no committed secrets. The only secret is the per-launch sidecar token, generated at runtime and never written to the tree. CI uses no repository secrets in `verify.yml`.

## Webhooks & Callbacks

**Incoming:**
- None over the network. The only inbound surface is the loopback sidecar HTTP/WebSocket endpoint on `127.0.0.1`, token-gated by `@powerbrowser/token-gate`.

**Outgoing:**
- None authored by this project. Every outbound call is either an inherited Gecko service listed in `powerbrowser/endpoint-allowlist.json`, or the telemetry sender when a `[telemetry] endpoint` is configured (unset here).

---

*Integration audit: 2026-09-07*
