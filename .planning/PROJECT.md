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
| Canonical product name from v2: **PowerBrowser** (accepted variants **Powerbrowser** / **powerbrowser** for identifier-class surfaces) | v1 shipped the spaced display form "Power Browser" across generated surfaces; the canonical form + re-pinned gates land as v2 NAME-01 so the v1 archive stays faithful to what was verified | — Decided 2026-09-04 |

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

### Active

- [ ] Formal sign-off on generator surfaces (GEN-01, GEN-02, GEN-03) and Theia
      surface (GEN-05) pending the human/tier-3 half (pixel look, render
      drill, release build)
- [ ] Telemetry and extension live drills (TEL-01..03, EXT-01) pending
      collector-backed runs
- [ ] VER-01 fleet proof and DOC-01 formal sign-off pending fixture-build tier
- [ ] **NAME-01**: canonical display form **PowerBrowser** applied across all
      generated surfaces with gates re-pinned (v2)
- [ ] **PKG-01**: Windows/macOS installer builds verified on real packaging
      hosts (v2)
- [ ] **EXT-02**: npm and local-path extension source kinds (v2)
- [ ] **TEL-04**: crash-report pipeline beyond endpoint repointing (v2)
- [ ] **GUI-02**: in-Theia web tabs via `<xul:browser>`; **GUI-05**: unified
      tab strip — DEFERRED (no GUI work in v1.1 per 2026-09-04 scoping;
      SQL tabs still precede them when scheduled)

### Out of Scope

- Unified tab strip where web pages and editors are peers — the mirror/proxy
  bridge stays a later milestone, as in the upstream plan; v1's browser access
  is the toggle + browsing inside Theia
- Databasise and the curated addon set — composed in downstream, never in the
  platform tree
- Moving every conceivable setting into `configuration.toml` in milestone 1 —
  the file grows toward "everything configurable" incrementally
- npm and local-path extension source kinds — Open VSX + URL cover v1

## Current State (v1.0 shipped 2026-09-04)

v1.0 PowerBrowser is archived (override closeout):
`.planning/milestones/v1.0-ROADMAP.md`,
`.planning/milestones/v1.0-REQUIREMENTS.md`, tag `v1.0`. All 52 plans
executed; `--quick` 95 PASS; 19/19 launch-lifecycle checks green on the dev
binary; trademark ritual signed. Known gaps carried to v2: human-eyes drills
(icon pixel look, welcome/about render drill), heavy-machine drills (release
build, per-fixture tier-3 builds, live ESR rebase, Theia re-pin), WINDOWS
#13/#14. v1 shipped the spaced display form "Power Browser"; the canonical
**PowerBrowser** form lands in v2 (NAME-01).

## Next Milestone Goals

v2 (inputs frozen in `.planning/NEXT-MILESTONE-INPUTS.md`): NAME-01 rename
slice, PKG-01 real installer builds (+ WR-04/WR-07 hardening), EXT-02 +
TEL-04, GUI-02 in-Theia tabs, GUI-05 unified tab strip. Backlog 999.1
SQL-browser-memory stays backlog.

## Current Milestone: v1.1 Hardening and SQL Tabs

**Goal:** Harden real installer builds and the extensions/crash pipelines,
and promote SQL-backed tabs — no GUI work this cycle.

**Target features:**
- Real installer builds (PKG-01) on packaging hosts (+ WR-04/WR-07
  hardening, `docs/BUILD.md` procedure), with the NAME-01 canonical
  **PowerBrowser** rename slice folded in and gates re-pinned.
  Self-hosted MAR updates (fork signing); Nix-built Windows/macOS
  packaging tried first, agent-driven VMs as fallback
- Extensions + crash pipeline (EXT-02 npm/local-path sources, pinned and
  fail-loud, plus the WebExtensions declaration sibling; TEL-04 minimal
  crash collector, reporter stays compiled out)
- v1 carry-overs ride along: release `objdir-release` build, tier-3
  per-fixture builds, live ESR rebase drill, Theia re-pin proof, WINDOWS
  #13 (`registerWindowActor` boundary hole) and #14 (BiDi double-window)

No GUI work and no SQL tabs this cycle: GUI-02/GUI-05 stay deferred, and
backlog 999.1 SQL-browser-memory stays backlog (confirmed 2026-09-04 —
v1.1 is hardening-only).

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
*Last updated: 2026-09-04 — v1.1 Hardening and SQL Tabs started (NAME-01 folded into installer work; GUI deferred until after SQL tabs)*
