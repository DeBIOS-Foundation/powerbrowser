# Power Browser

## What This Is

Power Browser is the open platform (middle stream) extracted from the Sourcerer
codebase: a Firefox-ESR fork hosting Eclipse Theia IDE, debranded and made
trivially rebrandable. Firefox ESR and Theia are the two upstreams; Power
Browser is the middle stream; Sourcerer (and anyone else's derivative) is a
downstream distribution.

The core deliverable is **one file — `configuration.toml`** — plus a `brand/`
assets folder, from which a build-time generator materializes every branding
and configuration surface: application name, window title, icons at all sizes,
installer name, desktop files, Theia welcome/about branding, telemetry
endpoints, declared extensions, URLs, and upstream pins. Anyone who copies the
repo edits that single file and owns a fully rebranded browser — the same role
`configuration.nix` plays for a NixOS machine.

## Core Value

A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo,
and build their own branded browser without touching any other file. If a
rebrand ever requires editing a second file, that is a bug.

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

(None yet — ship to validate)

### Active

- [ ] Platform code migrated from sourcerer and debranded: `powerbrowser/`
      tree, `@powerbrowser/*` extension scope, `PowerBrowserAPI.sys.mjs`
- [ ] `configuration.toml` + `brand/` assets folder exist at repo root and are
      the only files touched for a rebrand
- [ ] Build-time generator materializes all branding surfaces (Firefox
      branding dir, desktop files, installer name, icons, Theia welcome/about)
      from `configuration.toml`
- [ ] Two-layer verification: static scoped brand-literal scan (committed
      scope list, boundary-matched tokens, stale-allowlist-entry fails) +
      runtime six-surface exact-equality checks reading expectations from
      `configuration.toml` (evolve existing `verify-branding*.mjs`)
- [ ] Telemetry level + endpoint wired through `configuration.toml`
- [ ] Extension declarations (id + source + pin) installed into the Theia
      sidecar at build time
- [ ] `docs/REBRANDING.md` walks a stranger through a full rebrand
- [ ] Sourcerer reproduced as a downstream config: its own
      `configuration.toml` + logos yields the Sourcerer-branded product,
      proving the mechanism

### Out of Scope

- Custom browser GUI (tab strip, toolbar) — post-4.0 in the upstream plan,
  unchanged here
- Windows/macOS packaging — Linux first, as in sourcerer
- Databasise and the curated addon set — composed in downstream, never in the
  platform tree
- Moving every conceivable setting into `configuration.toml` in milestone 1 —
  the file grows toward "everything configurable" incrementally; branding,
  telemetry, extensions, URLs, and pins come first

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
*Last updated: 2026-08-29 after initialization*
