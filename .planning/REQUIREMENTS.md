# Requirements — Power Browser v1.2 Sign-off Closeout and SQL Store

**Defined:** 2026-09-05
**Core Value:** A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo, and build their own branded, working web browser without touching any other file — then reshape its GUI through Theia extensions without forking the platform.

(No GUI work this cycle — v1.2 is closeout + store-only per 2026-09-05 scoping. SQL GUI surface, GUI-02, GUI-05 deferred to v1.3+.)

## v1.2 Requirements

### Sign-off Closeout (existing v1 IDs) — Phase 10

Credit policy (decided 2026-09-05): halves that Phases 08/09 proved live close on record with evidence cited; only the still-staged halves run. Closeout covers every still-Open v1 ID, enumerated below (the v1.0 archive says 16; enumeration is the source of truth — Phase 10 reconciles the count).

- [x] **MIG-01** [credit]: Platform migration proof recorded from v1.0 tree + re-fetch history — formal sign-off, no new drill
- [x] **MIG-02** [record]: Token-inventory audit pass over the committed classification — sign-off that the box holds for audit
- [x] **GUI-01** [live]: Browser-window toggle manual UAT run (5 steps) and signed
- [x] **GUI-03** [live]: Customize-bridge perceptual restyle UAT run (3 steps) and signed
- [x] **GUI-04** [live]: Bridge-landability statement recorded against the green registry-shape gate
- [x] **GEN-01** [credit + delta]: Release-variant half credited to BLD-01; only emitter deltas since v1.0 re-proven
- [x] **GEN-02** [live human]: Icon pixel-look sign-off on real rasters
- [x] **GEN-03** [credit + delta]: Windows/macOS host-build half credited to PKG-01; only schema deltas re-proven
- [x] **GEN-05** [live human]: Theia welcome/about live render drill and signed
- [x] **EXT-01** [live]: Open VSX + URL declaration bundle+load drill on a real sidecar build
- [x] **TEL-01** [live]: Telemetry level + endpoint declaration live drill against the running sidecar
- [x] **TEL-02** [live]: Telemetry pipeline live delivery drill (batched, retrying, level-honoring; silence when off)
- [x] **TEL-03** [live]: Installed-binary allowlist layer proven (derivation already green statically)
- [x] **VER-01** [live]: Full-fleet brand-literal proof run with the fixture tier (now runnable per BLD-02)
- [x] **DOC-01** [live]: Stranger carry-test of REBRANDING.md recorded and formal sign-off

### SQL Store Design — Phase 11

- [ ] **SQL-02**: Authority/invariant table written and reviewed BEFORE schema — single chrome-side writer, sessionstore authoritative for restore, registry URIs as join key, Theia backend never opens profile SQLite, own-file rule
- [ ] **SQL-03**: Schema + migration plan reviewed — tabs table on URI PK, `schema_version`/`user_version` from day one, forward-only migrations exercised against fixture DBs, quarantine-not-delete corruption path, private-tab exclusion rule, fixed `tabs.sqlite` filename as platform content (not manifest)

### SQL Store Build — Phase 12

- [ ] **SQL-01**: Chrome-side writer ships — `Sqlite.sys.mjs` behind `PowerBrowserAPI.sys.mjs` (sole boundary, new INTERNAL-APIS.md rows), own `tabs.sqlite` in profile dir, sessionstore stays authoritative for restore, registry URIs are the join key
- [ ] **SQL-04**: Read paths ship — bookmarks/history exposed via Places APIs (never raw places writes), sessionstore read projection, query API on `@powerbrowser/tab-uris`, private-browsing exclusion with absence test (emitter-exercising, per the project's absence-assertion rule)
- [ ] **SQL-05**: Store gates green — second-writer negative scan (no profile-DB opens outside `powerbrowser/shell/`), interleaved tab+bookmark write soak with `PRAGMA integrity_check` clean, URI→row→restart→reopen roundtrip on a temp DB, registry-shape gate untouched, live ESR rebase drill over the new touchpoints

Engine (decided 2026-09-05, `.planning/research/duckdb-vs-sqlite/VERDICT.md`): SQLite. Gecko `Sqlite.sys.mjs` writes; Theia backend reads the dedicated file only via `better-sqlite3@13.0.3` (`readonly: true`); `node:sqlite` revisit at next Node re-pin. DuckDB rejected (process-sharing topology, OLTP mismatch, vendoring cost, format instability).

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

## Future Requirements (v1.3+)

- **SQL-GUI**: SQL GUI surface — tab data rendered and operable in the UI on the v1.2 store
- **GUI-02**: The user can open and browse web pages inside Theia as tabs
  (URL-addressable `<xul:browser>`-backed tabs, not mini-browser). Deferred
  until after the store + GUI surface.
- **GUI-05**: Unified tab strip where web pages and Theia editors are peers
  (chrome-owned tab model, mirror/proxy bridge). Deferred until after
  GUI-02.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Any GUI tab rendering or in-Theia browser tabs this cycle | v1.2 is closeout + store-only; GUI surface is v1.3+ |
| A second SQLite writer in any process | Corruption class (PITFALLS Pitfall 8); single chrome-side writer is invariant |
| New tables inside `places.sqlite` | Upstream-owned schema; every ESR rebase may migrate it |
| Replacing sessionstore as restore authority | Needs a dual-write + restore-parity proof first |
| A `[features]` / `[sql]` manifest flag | ARCHITECTURE.md Anti-Pattern 6 — extension point, not a flag |
| DuckDB as the tab store | Rejected 2026-09-05 (topology, workload, cost, format — see VERDICT.md) |
| Socorro self-host or re-enabling the native crash reporter | Standing v1 exclusion, unchanged |
| Databasise and the curated addon set | Downstream compositions, never in the platform tree |
| Forking/patching Theia core or modifying Gecko outside the patch stack | Inherited hard rules |
| Moving every conceivable Firefox pref into `configuration.toml` | Manifest covers identity, branding, telemetry, extensions, URLs, pins |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIG-01 | Phase 10 | Complete |
| MIG-02 | Phase 10 | Complete |
| GUI-01 | Phase 10 | Complete |
| GUI-03 | Phase 10 | Complete |
| GUI-04 | Phase 10 | Complete |
| GEN-01 | Phase 10 | Complete |
| GEN-02 | Phase 10 | Complete |
| GEN-03 | Phase 10 | Complete |
| GEN-05 | Phase 10 | Complete |
| EXT-01 | Phase 10 | Complete |
| TEL-01 | Phase 10 | Complete |
| TEL-02 | Phase 10 | Complete |
| TEL-03 | Phase 10 | Complete |
| VER-01 | Phase 10 | Complete |
| DOC-01 | Phase 10 | Complete |
| SQL-02 | Phase 11 | Pending |
| SQL-03 | Phase 11 | Pending |
| SQL-01 | Phase 12 | Pending |
| SQL-04 | Phase 12 | Pending |
| SQL-05 | Phase 12 | Pending |

**Coverage:**

- v1.2 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-05*
*Last updated: 2026-09-05 at v1.2 roadmap creation (Phases 10–12 mapped, 20/20 covered, all Pending)*
