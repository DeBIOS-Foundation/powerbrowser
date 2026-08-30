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
| Telemetry configured in `configuration.toml` | Mirror Theia's model: endpoint field + send toggle (+ toggle to send to Theia upstream); default off | — Pending |
| Extensions declared in `configuration.toml` with sources | Each entry: id + source (Open VSX / npm / URL / local path) + pin | — Pending |
| Adversarial review enabled | plan_check + verifier on; /gsd-plan-review-convergence on risky phases (rename pass, generator) | — Pending |

## configuration.toml planned sections

[product] name, short name, vendor, version scheme, description, homepage ·
[assets] logo SVG/PNG, icon source, wordmark · [identity] app id, binary name,
installer name, npm scope, URI scheme prefix · [telemetry] enabled, endpoint,
send-to-theia toggle · [extensions] declared list with sources and pins ·
[urls] support, release notes, update check, crash report, default homepage,
default search · [legal] license, copyright holder, trademark notice ·
[theia] welcome/about text, logo, default theme · [upstreams] Firefox ESR tag,
Theia release pin · [build] channel, release/debug defaults.

Unset values fall back to Power Browser defaults.

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
- [ ] Verification script fails the build if any branding value is hardcoded
      outside the manifest (evolve existing `verify-branding*.mjs`)
- [ ] Telemetry endpoint + toggles wired through `configuration.toml`
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
