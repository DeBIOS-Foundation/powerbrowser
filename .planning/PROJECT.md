# Power Browser

## What This Is

Power Browser is the open platform (middle stream) extracted from the Sourcerer
codebase: a Firefox-ESR fork hosting Eclipse Theia IDE that is **an actual web
browser** — the user can toggle between Theia and proper browser UI, and browse
the web inside Theia — debranded and made trivially rebrandable. Firefox ESR
and Theia are the two upstreams; Power Browser is the middle stream; Sourcerer
(and anyone else's derivative) is a downstream distribution.

Two core deliverables:

1. **One file — `configuration.toml`** — plus a `brand/` assets folder, from
   which a build-time generator materializes every branding and configuration
   surface: application name, window title, icons, installer branding for
   Linux/Windows/macOS (Firefox's packaging machinery is why the fork exists —
   Power Browser installs anywhere Firefox installs), desktop files, Theia
   welcome/about branding, telemetry, declared extensions, URLs, and upstream
   pins. The same role `configuration.nix` plays for a NixOS machine.
2. **A vibe-codeable GUI**: Theia extensions are the sanctioned mechanism for
   reshaping the browser's GUI — the customize bridge (runtime CSS +
   dev-flagged JS) and URL-addressable tabs inherited from sourcerer are
   platform features, so anyone can code their own browser chrome/setup
   without forking the platform.

## Core Value

A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo,
and build their own branded, working web browser without touching any other
file — then reshape its GUI through Theia extensions without forking the
platform. If a rebrand ever requires editing a second file, that is a bug.

## Context

- Source of platform code: `/home/chris/coding/sourcerer` (Deocracy/Sourcerer),
  a Zen-style fork: `upstream/` (pinned ESR tag) + `patches/` + own tree +
  Theia sidecar (`@sourcerer/*` extensions, never forking Theia core).
- The stream model was decided 2026-08-22 in sourcerer's
  `docs/PRODUCT-REQUIREMENTS.md`: Power Browser is the platform
  (`DeBIOS-Foundation/powerbrowser`, public, 501(c)(3)-owned); Sourcerer stays
  a downstream at `Deocracy/Sourcerer`. Platform names take the platform's
  name: `@powerbrowser/*`, `PowerBrowserAPI.sys.mjs`. This project executes
  that migration.
- Boundary rule inherited: downstreams add, never patch. Power Browser must
  build and ship with Sourcerer absent from the tree.
- Mozilla trademark rules make rebranding mandatory for any distributed
  Firefox fork, so the single-file rebrand is load-bearing for downstreams.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `configuration.toml` (TOML) as the single rebrand/config file | Human-editable by non-developers; Nix reads it natively (`builtins.fromTOML`); Node/Theia side reads it trivially | — Pending |
| Copy sourcerer tree then debrand (not fresh port) | Most of that tree is already platform code per the stream-model doc | — Pending |
| Re-fetch `upstream/` via `fetch-upstream.sh`; never copy objdirs | Multi-GB checkouts are reproducible from the pinned tag | — Pending |
| Telemetry configured in `configuration.toml` | Theia ships no telemetry destination — expose Theia's real `telemetry.telemetryLevel` enum (off/crash/error/all, default off) + downstream's own endpoint; Power Browser implements the destination | — Pending |
| Internal identifiers fixed, only user-visible surfaces configurable | `chrome://powerbrowser/`, `@powerbrowser/*`, pref branches, API names stay constant for every downstream; halves generator scope, keeps patches brand-free (exception: app basename/remoting name must vary to avoid profile collisions) | — Pending |
| Identity fields required, no silent fallback | A downstream omitting `vendor` must hard-fail, not ship under Power Browser's mark; cosmetic fields default with an echo | — Pending |
| Extensions declared in `configuration.toml` with sources | Each entry: id + source (Open VSX / npm / URL / local path) + pin | — Pending |
| Adversarial review enabled | plan_check + verifier on; /gsd-plan-review-convergence on risky phases (rename pass, generator) | — Pending |
| Autonomous nonstop default | every `/gsd-autonomous` runs without human pauses (verify→defer+continue, gaps→one retry then defer+continue, audit→accept, cleanup→approve, plan with `--no-reversibility-gates`); only a 3-retry-exhausted blocker halts `needs_human` | — Decided 2026-09-04 |
| Self-hosted MAR rung: HTTPS-only interim | updater flipped with `--enable-unverified-updates`; docs claim only TLS (no code signature verified) until a fork-signing rung lands | — Decided Phase 08 |
| NSIS-on-Nix proven, MSIX/DMG need real hosts | makensis 3.12 builds setup.exe on Linux; Windows SDK + hdiutil are host-bound, staged with operator unblocks | — Decided Phase 08 |
| Antenna collector stdlib-only, throttle on success only | failed (500) store writes must not consume throttle budget; CrashID only after durable write | — Decided Phase 09 |
| ExtensionSettings over extensions-dir | declared WebExtensions land via policy `force_installed`/`install_url`; curated set stays out of the tree | — Decided Phase 09 |
| Canonical product name from v2: **PowerBrowser** (accepted variants **Powerbrowser** / **powerbrowser** for identifier-class surfaces) | v1 shipped the spaced display form "Power Browser" across generated surfaces; the canonical form + re-pinned gates land as v2 NAME-01 so the v1 archive stays faithful to what was verified | — Decided 2026-09-04 |
| v1.2 scope: sign-off closeout + SQL store only, SQL GUI deferred | v1.2 closes formal sign-off on the 16 Open v1 requirements then ships the SQL-01 store/DB layer with no GUI surface; SQL GUI, GUI-02, and GUI-05 move to v1.3+ so the milestone stays shippable | — Decided 2026-09-05 |

## configuration.toml planned sections

[product] display name, vendor, version scheme, description, homepage ·
[identity] app basename, binary name (validated `^[a-z][a-z0-9-]{1,31}$`),
installer name, remoting name — REQUIRED, hard-fail if unset ·
[assets] logo SVG/PNG, icon source (generator derives the 5 Linux PNG sizes),
wordmark · [telemetry] level enum (off/crash/error/all, default off) + endpoint
(flows into generated endpoint allowlist) · [extensions] declared list with
sources (Open VSX/npm/URL/path) and pins · [urls] support, release notes,
update check, crash report, default homepage, default search ·
[legal] license, copyright holder, trademark notice — REQUIRED ·
[theia] welcome/about text, logo, default theme · [upstreams] Firefox ESR tag,
Theia release pin · [build] channel, release/debug defaults.

Identity and legal keys are required (hard build failure if unset — a
downstream must never silently ship under Power Browser's mark). Cosmetic keys
fall back to Power Browser defaults with a visible echo at generate time.
Internal identifiers (`chrome://powerbrowser/`, `@powerbrowser/*`, pref
branches, `PowerBrowserAPI`) are fixed and never configurable.

## Requirements

### Validated

- [x] `configuration.toml` + `brand/` assets folder exist at repo root and are
      the only files touched for a rebrand — Validated in Phase 2: Configuration
      Manifest and Generator Core (CFG-01..04, GEN-04; generator reproduces the five
      Phase 1 hand-written build surfaces byte-for-byte, gated by
      `generated-byte-identity` in `scripts/verify-platform.sh --quick`) — v1.0
- [x] Internal identifiers fixed everywhere (`powerbrowser/` tree,
      `@powerbrowser/*`, `PowerBrowserAPI.sys.mjs`, `chrome://powerbrowser/`)
      — MIG-03 — v1.0
- [x] Renamed tree builds and boots on Linux with six branding surfaces green
      on the built artifact — MIG-04 — v1.0
- [x] Hook-only patch stack preserving the 3-way-merge hash chain — MIG-05 — v1.0
- [x] Upstream pins declared once in `configuration.toml` and consumed by
      fetch/build scripts; ESR/Theia uptake tooling with red-capable drift
      classes — CFG-06, UPD-01/02 (live drills staged) — v1.0
- [x] Runtime verification by exact equality from manifest expectations
      (VER-02) and adversarial fixture configs proving no single-config
      keying (VER-03) — v1.0
- [x] External-config builds (`PB_CONFIG_DIR`) with Sourcerer reproduced as a
      pure downstream from an untouched tree — CFG-05, DOC-02 — v1.0
- [x] Theia backend credential-gated and fail-closed via `token-gate` — SEC-01 — v1.0
- [x] Trademark human ritual signed (Chris, 2026-09-04, CONFIRMED) with the
      mechanical gate green — v1.0
- [x] Canonical display form **PowerBrowser** applied across all generated
      surfaces with gates re-pinned and propagation proof re-run live —
      NAME-01 — Phase 08
- [x] Real installer builds: NSIS proven on Nix, updater flipped to
      self-hosted MAR with a real Linux N→N+1 hop, `docs/BUILD.md`
      procedure written, WR-04/WR-07 pre-fixes landed — PKG-01/02/03
      (Windows MSIX + macOS DMG cells staged-unexecuted with recorded
      provisioning errors + operator unblocks in 08-05) — Phase 08
- [x] Release `objdir-release` build + release-variant rows green; live ESR
      rebase drill passed — BLD-01, UPD-03 — Phase 08
- [x] WINDOWS #13 (`registerWindowActor` boundary hole) and #14 (BiDi
      double-window) closed with green gates — SEC-02, SHELL-01 — Phase 08
- [x] npm + local-path extension sources (exact pins, integrity digests,
      fail-loud) reusing the EXT-01 chain — EXT-02 — Phase 09
- [x] WebExtensions declaration via `ExtensionSettings` in
      `distribution/policies.json` (mechanism only, no bundled set) —
      EXT-03 — Phase 09
- [x] Minimal Antenna-protocol crash collector with ping/report split and
      PII/retention/throttle policy; native reporter stays compiled out —
      TEL-04 — Phase 09
- [x] Tier-3 per-fixture builds over the new source kinds; Theia re-pin
      proof with token-gate intact — BLD-02, UPD-04 — Phase 09

### Active (v1.2)

- [ ] Formal sign-off closeout on the 16 Open v1 requirements —
      migration/inventory (MIG-01, MIG-02), GUI survivals (GUI-01, GUI-03,
      GUI-04), generator surfaces (GEN-01, GEN-02, GEN-03, GEN-05),
      telemetry/extension live drills (TEL-01..03, EXT-01), fleet proof
      (VER-01), rebranding doc (DOC-01)
- [ ] **SQL-01 store/DB layer only**: every tab a SQL row on
      `TabUriRegistry` identity (plus bookmarks/sessions exposure) — single
      chrome-side writer behind `PowerBrowserAPI` in its own SQLite file;
      sessionstore stays authoritative for restore; registry URIs are the
      join key. No GUI surface this milestone.

### Out of Scope

- SQL GUI surface, GUI-02 in-Theia web tabs, GUI-05 unified tab strip —
      deferred to v1.3+ per 2026-09-05 scoping (v1.2 is store-only)
- Unified tab strip where web pages and editors are peers — the mirror/proxy
  bridge stays a later milestone, as in the upstream plan; current browser
  access is the toggle + browsing inside Theia
- Databasise and the curated addon set — composed in downstream, never in the
  platform tree
- Moving every conceivable setting into `configuration.toml` in milestone 1 —
  the file grows toward "everything configurable" incrementally

## Current State (v1.1 shipped 2026-09-05)

v1.1 Hardening is archived:
`.planning/milestones/v1.1-ROADMAP.md`,
`.planning/milestones/v1.1-REQUIREMENTS.md`,
`.planning/milestones/v1.1-MILESTONE-AUDIT.md`, tag `v1.1`. Phases 08–09
(9/9 plans) executed: NAME-01 canonical **PowerBrowser**, PKG-01/02/03
real installers + self-hosted MAR + `docs/BUILD.md`, BLD-01/02 release +
per-fixture builds, UPD-03/04 live rebase + re-pin proofs, SEC-02/SHELL-01
WINDOWS #13/#14 closures, EXT-02/03 npm/local-path + WebExtensions policy,
TEL-04 crash collector. Carried to v1.2: formal sign-off on the 16 Open v1
requirements still staged (human/tier-3 halves).

## Current Milestone: v1.2 Sign-off Closeout + SQL Store

**Goal:** Close formal sign-off on the v1 carry-overs and ship the SQL-01
tab-store/DB layer with no GUI surface.

**Target features:**
- Sign-off closeout: MIG-01/02, GUI-01/03/04 survivals, GEN-01/02/03/05,
  TEL-01..03 + EXT-01 live drills, VER-01 fleet proof, DOC-01 stranger
  carry-test — every box checked with live evidence.
- SQL-01 store: tabs as SQL rows on `TabUriRegistry` identity
  (bookmarks/sessions exposure alongside); single chrome-side writer behind
  `PowerBrowserAPI` in its own SQLite file; sessionstore stays authoritative
  for restore; registry URIs are the join key. Boundary per ARCHITECTURE.md
  Anti-Pattern 6: extension point, not a `[features]` flag.

No GUI work this cycle: SQL GUI surface, GUI-02, and GUI-05 stay deferred
to v1.3+ (confirmed 2026-09-05 — v1.2 is closeout + store-only).

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-05 at v1.2 start (sign-off closeout + SQL store scope)*
