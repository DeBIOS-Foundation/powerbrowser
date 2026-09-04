# Requirements — Power Browser v1.1 Hardening and SQL Tabs

(No GUI work, no SQL tabs this cycle — v1.1 is hardening-only per 2026-09-04
scoping. Backlog 999.1 SQL-browser-memory stays backlog; GUI-02/GUI-05 stay
deferred, with SQL tabs still preceding them when scheduled.)

## v1.1 Requirements

### Canonical Name (NAME)

- [ ] **NAME-01**: The canonical display form **PowerBrowser** is applied
      across all generated surfaces (`identity.display_name` →
      `PowerBrowser` in `configuration.toml`), every gate asserting the
      spaced form is re-pinned (generate `--self-test` byte-identity
      comparands, preflight `brand_display_expectations`,
      trademark-surface display-field scan, downstream fixtures), and the
      single-edit propagation proof is re-run live with a tier-3 Linux
      build re-verifying the built artifact surfaces

### Installer Builds (PKG)

- [ ] **PKG-01**: Windows (NSIS/MSIX) and macOS (DMG/`.icns`) installers are
      actually built on packaging hosts — Nix-built packaging tried first,
      agent-driven VMs as fallback — from the generated branding
      (branding.nsi, `.ico`/`.icns`, `wiz*.bmp`, dsstore, stubinstaller/,
      msix)
- [ ] **PKG-02**: The update story is self-hosted MAR updates under fork
      signing (no Mozilla phone-home, no dead updater); the per-OS
      install/uninstall matrix is the exit gate
- [ ] **PKG-03**: `docs/BUILD.md` documents the packaging procedure, and the
      WR-04 (reject bare `$VAR` in NSIS defines) + WR-07 (thread fixture
      `root` through the installer verifier) pre-fixes land before the
      first real-host build so the gates discriminate before binaries exist

### Extensions (EXT)

- [ ] **EXT-02**: npm and local-path extension source kinds ship — exact
      pins with integrity digests, fail-loud on mismatch — reusing the
      EXT-01 chain (pinned URL resolution for npm, hashable packed content
      for local-path, one `theiaPlugins`-fragment → copy-over → pin-verify
      path) with per-target `${targetPlatform}` resolution
- [ ] **EXT-03**: The WebExtensions declaration sibling ships via
      `ExtensionSettings` in the already-emitted
      `distribution/policies.json` (not `distribution/extensions/`), closing
      the STATE.md pending todo

### Crash Pipeline (TEL)

- [ ] **TEL-04**: A minimal Antenna-protocol crash collector ships
      (multipart POST, `upload_file_minidump`, `CrashID=` responses) with
      crash-ping/report separation and a PII/retention/throttle policy; the
      native reporter stays compiled out (`--disable-crashreporter`), and
      no Socorro self-host or `mini-breakpad-server` is adopted

### Release & Fixture Builds (BLD)

- [ ] **BLD-01**: A release `objdir-release` build passes with the
      release-variant verify rows green (WINDOWS #10)
- [ ] **BLD-02**: Tier-3 per-fixture builds pass (07 — adversarial Zebra et
      al. proven on real built artifacts, not schema alone)

### Upstream Uptake Drills (UPD)

- [ ] **UPD-03**: A live ESR rebase drill against the next ESR tag passes
      through the existing rebase/conflict tooling (05)
- [ ] **UPD-04**: A Theia re-pin proof passes with the token-gate backend
      intact (05)

### Hardening Fixes (SEC / SHELL)

- [ ] **SEC-02**: WINDOWS #13 is closed — the `registerWindowActor` hole in
      the internals-boundary guard
- [ ] **SHELL-01**: WINDOWS #14 is fixed — BiDi double-window /
      `contexts[0]` mis-resolution

#### Inherited Mozilla egress carve-out (Remote Settings)

Three Mozilla hosts are `allow`-dispositioned in
`powerbrowser/endpoint-allowlist.json` and are named here because
`verify-platform.sh --only allowlist-doc-consistency` requires every such host
to carry a documented reason in this project's own requirements, not only in
the allowlist file. They are one feature, not three decisions:

- **firefox.settings.services.mozilla.com** — Remote Settings itself. Gecko
  refuses a `services.settings.server` override outside Nightly, and the only
  alternative also disables CRLite certificate-revocation data, intermediate
  certificate preloading, and tracking-protection list updates. Turning it off
  is unacceptable for a substrate whose pitch is that it is a real browser.

- **content-signature-2.cdn.mozilla.net** — the content-signature certificate
  chain each downloaded Remote Settings collection is verified against. Part of
  the same feature; without it the data above is unauthenticated.

- **firefox-settings-attachments.cdn.mozilla.net** — Remote Settings' attachment
  CDN for large collection blobs, including CRLite's own data.

Full rationale, with the upstream source citations and the observed polling
cadence, lives in each host's `reason` field in
`powerbrowser/endpoint-allowlist.json`, which stays the single source of truth.
Repointing or disabling these per a downstream's manifest is TEL-03's job.

## Future Requirements

- **SQL-01**: SQL-backed tabs — every tab a SQL row (plus
  bookmarks/sessions exposure) on `TabUriRegistry` identity, promoted from
  backlog 999.1. Single chrome-side writer behind `PowerBrowserAPI` in its
  own SQLite file; sessionstore stays authoritative for restore; registry
  URIs are the join key. Next cycle, before any GUI work.
- **GUI-02**: The user can open and browse web pages inside Theia as tabs
  (URL-addressable `<xul:browser>`-backed tabs, not mini-browser). Deferred
  until after SQL-01.
- **GUI-05**: Unified tab strip where web pages and Theia editors are peers
  (chrome-owned tab model, mirror/proxy bridge). Deferred until after
  GUI-02.

## Out of Scope

- Any GUI tab-strip rendering or in-Theia browser tabs this cycle
- SQL tab store schema or query API this cycle (next cycle's work)
- Socorro self-host, `mini-breakpad-server`, or re-enabling the native
  crash reporter
- Cross-compiled macOS signing (DMG/signing needs macOS hosts or VMs)
- Databasise and the curated addon set — downstream compositions, never in
  the platform tree
- Forking/patching Theia core or modifying Gecko outside the patch stack —
  inherited hard rules
- Moving every conceivable Firefox pref into `configuration.toml` — the
  manifest covers identity, branding, telemetry, extensions, URLs, pins

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAME-01 | TBD | Pending |
| PKG-01 | TBD | Pending |
| PKG-02 | TBD | Pending |
| PKG-03 | TBD | Pending |
| EXT-02 | TBD | Pending |
| EXT-03 | TBD | Pending |
| TEL-04 | TBD | Pending |
| BLD-01 | TBD | Pending |
| BLD-02 | TBD | Pending |
| UPD-03 | TBD | Pending |
| UPD-04 | TBD | Pending |
| SEC-02 | TBD | Pending |
| SHELL-01 | TBD | Pending |
