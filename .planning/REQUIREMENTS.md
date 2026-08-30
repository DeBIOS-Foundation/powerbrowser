# Requirements — Power Browser v1

## v1 Requirements

### Migration & Debrand (MIG)

- [ ] **MIG-01**: Platform code is migrated from the sourcerer tree into this
      repo with `upstream/` re-fetched via script (never copied) and no
      objdirs copied
- [ ] **MIG-02**: A committed token-classification inventory (brand /
      identity / frozen / coincidental) exists before any rename is executed
- [ ] **MIG-03**: All internal identifiers are renamed to fixed platform
      names — `powerbrowser/` tree, `@powerbrowser/*` extension scope,
      `PowerBrowserAPI.sys.mjs`, `chrome://powerbrowser/` — and these never
      vary per downstream
- [ ] **MIG-04**: The renamed tree builds and boots on Linux under Power
      Browser branding (proven by the existing smoke tests)
- [ ] **MIG-05**: Brand values are removed from `patches/*.patch` (hook-only
      patches that `include()` generated files), preserving the 3-way-merge
      hash chain

### Configuration Manifest (CFG)

- [ ] **CFG-01**: A downstream author can define their entire brand in
      `configuration.toml` + a `brand/` assets folder and touch no other file
- [ ] **CFG-02**: Identity fields (vendor, app basename, binary name,
      remoting name) and legal fields are required — generation hard-fails
      with a clear message when any is unset
- [ ] **CFG-03**: Binary/basename fields are validated
      (`^[a-z][a-z0-9-]{1,31}$`) so no invalid `MOZ_APP_NAME` can be produced
- [ ] **CFG-04**: Cosmetic fields fall back to Power Browser defaults with a
      visible echo at generate time; the defaults are themselves a
      `configuration.toml` (one merge code path)
- [ ] **CFG-05**: A downstream can point the build at an external config dir
      (`PB_CONFIG_DIR`) so distributions like Sourcerer live in their own repo
- [ ] **CFG-06**: Upstream pins (Firefox ESR tag, Theia release) are declared
      in `configuration.toml` and consumed by the fetch/build scripts

### Brand Generator (GEN)

- [ ] **GEN-01**: A single generator script materializes the complete Firefox
      branding directory (brand.ftl / brand.properties / brand.dtd emitted
      atomically and cross-checked), `.mozconfig`, desktop files, and
      `generated/identity.configure` from `configuration.toml`
- [ ] **GEN-02**: The generator derives all required Linux icon sizes
      (16/32/48/64/128) from the source SVG/PNG in `brand/`
- [ ] **GEN-03**: The generator emits installer branding for Linux, Windows
      (NSIS/MSIX fields), and macOS (DMG/.icns fields) from
      `configuration.toml` so Power Browser installs anywhere Firefox
      installs; Linux output is build-verified in v1, Windows/macOS outputs
      are generated and schema-complete with builds verified when those
      packaging hosts land
- [ ] **GEN-04**: Generated output is never committed (single gitignored
      `generated/` root) and `generate --check` verifies freshness in CI
- [ ] **GEN-05**: Theia-side branding (welcome tab, about dialog, product
      name, logo, default theme) is applied via frontend config keys — no
      TypeScript recompile for a rebrand

### Browser GUI (GUI)

- [ ] **GUI-01**: The user can toggle away from Theia to proper web-browser
      UI and back — Power Browser is usable as an actual browser, not only a
      Theia host
- [ ] **GUI-02**: The user can open and browse web pages inside Theia as
      tabs (URL-addressable, per the inherited URI-scheme model)
- [ ] **GUI-03**: The GUI customization bridge (runtime CSS layer +
      dev-flagged privileged JS) ships as a platform feature so anyone can
      restyle/re-shape the GUI at runtime via Theia extensions — "vibe code
      your own browser" is the supported path, forking is not required
- [ ] **GUI-04**: Nothing in v1 welds Theia to full-window presentation; the
      future unified tab strip (mirror/proxy bridge) remains landable without
      rework

### Telemetry (TEL)

- [ ] **TEL-01**: `configuration.toml` declares telemetry level
      (off/crash/error/all — Theia's real enum, default off) and the
      downstream's own endpoint
- [ ] **TEL-02**: A full telemetry pipeline ships: a Theia-side sender that
      batches and retries event delivery to the configured endpoint, honoring
      the level setting; nothing is sent when level is off
- [ ] **TEL-03**: Configured telemetry/URL hosts flow into the generated
      endpoint allowlist so `verify-endpoints` passes for any downstream;
      Mozilla telemetry/crash endpoints are repointed or disabled per the
      manifest

### Extensions (EXT)

- [ ] **EXT-01**: A downstream can declare Theia extensions in
      `configuration.toml` with source (Open VSX id or direct URL) and pin;
      they are downloaded and bundled into the sidecar at build time

### Verification (VER)

- [ ] **VER-01**: A static brand-literal scan with a committed scope list and
      boundary-matched tokens fails the build on any configured brand value
      hardcoded outside the manifest; a stale allowlist entry also fails
- [ ] **VER-02**: Runtime verification checks the six branding surfaces by
      exact equality, reading expectations from `configuration.toml` — never
      from constants — so it passes for every correctly-configured downstream
- [ ] **VER-03**: Adversarial fixture configs (e.g. a downstream named
      "Zebra") build and verify correctly, proving nothing is accidentally
      keyed to Power Browser's or Sourcerer's values

### Upstream Uptake (UPD)

- [ ] **UPD-01**: A Firefox ESR point release is adopted by bumping the pin in
      `configuration.toml` and re-running fetch + patch apply, with the
      existing rebase/conflict tooling failing loudly on drift
- [ ] **UPD-02**: A Theia release is adopted by re-pinning; Theia core is
      never forked or patched

### Documentation & Downstream Proof (DOC)

- [ ] **DOC-01**: `docs/REBRANDING.md` walks a stranger through a complete
      rebrand — edit `configuration.toml`, drop in logos, build — with every
      field documented
- [ ] **DOC-02**: Sourcerer is reproduced as a pure downstream: its own
      `configuration.toml` + logo assets (its branding separate from Power
      Browser's) yield the Sourcerer-branded product with zero platform-file
      edits — the acceptance test for the whole milestone

## v2 Requirements (deferred)

- **GUI-05**: Unified tab strip where web pages and Theia editors are peers
  (chrome-owned tab model, mirror/proxy bridge)
- **PKG-01**: Windows and macOS installer builds verified on real packaging
  hosts (v1 generates their branding; builds follow)
- **EXT-02**: npm and local-path extension source kinds
- **TEL-04**: Crash-report pipeline beyond endpoint repointing

## Out of Scope

- Databasise and the curated addon set — downstream compositions, never in
  the platform tree
- Forking/patching Theia core or modifying Gecko — inherited hard rules
- Per-downstream internal identifiers — `chrome://powerbrowser/` etc. are
  fixed forever; only user-visible surfaces are configurable
- Moving every conceivable Firefox pref into `configuration.toml` —
  prefs/policies churn at a different cadence (LibreWolf precedent); the
  manifest covers identity, branding, telemetry, extensions, URLs, pins

## Traceability

All 31 v1 requirements map to exactly one phase. See `.planning/ROADMAP.md`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIG-01 | Phase 1 | Pending |
| MIG-02 | Phase 1 | Pending |
| MIG-03 | Phase 1 | Pending |
| MIG-04 | Phase 1 | Pending |
| GUI-01 | Phase 1 | Pending |
| GUI-02 | Phase 1 | Pending |
| GUI-03 | Phase 1 | Pending |
| GUI-04 | Phase 1 | Pending |
| CFG-01 | Phase 2 | Pending |
| CFG-02 | Phase 2 | Pending |
| CFG-03 | Phase 2 | Pending |
| CFG-04 | Phase 2 | Pending |
| GEN-04 | Phase 2 | Pending |
| GEN-01 | Phase 3 | Pending |
| GEN-02 | Phase 3 | Pending |
| GEN-03 | Phase 3 | Pending |
| GEN-05 | Phase 4 | Pending |
| EXT-01 | Phase 4 | Pending |
| TEL-01 | Phase 4 | Pending |
| TEL-02 | Phase 4 | Pending |
| TEL-03 | Phase 4 | Pending |
| MIG-05 | Phase 5 | Pending |
| CFG-06 | Phase 5 | Pending |
| UPD-01 | Phase 5 | Pending |
| UPD-02 | Phase 5 | Pending |
| VER-01 | Phase 6 | Pending |
| VER-02 | Phase 6 | Pending |
| DOC-01 | Phase 6 | Pending |
| CFG-05 | Phase 7 | Pending |
| VER-03 | Phase 7 | Pending |
| DOC-02 | Phase 7 | Pending |
