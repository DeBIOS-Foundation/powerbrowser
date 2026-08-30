# Sourcerer

Sourcerer is a Firefox-ESR fork under its own branding, hosting Eclipse Theia
IDE. Version 4.0 ships Theia as the only GUI: the fork boots under the
Sourcerer name, supervises a bundled Theia backend on localhost, and presents
Theia full-window. The custom browser interface — a unified tab strip where
web pages and editors are peers — comes in later milestones, and v4.0 is built
so they land without rework.

**Status:** pre-build. This repository was reset to a clean slate on 2026-08-19.
Requirements live in [docs/PRODUCT-REQUIREMENTS.md](docs/PRODUCT-REQUIREMENTS.md);
the architecture is [docs/research/sourcerer-architecture.md](docs/research/sourcerer-architecture.md).

## What v4.0 is

- **R1 — Rebrand.** Application name, window title, icon, installer name, and
  Theia-side branding (welcome tab, about dialog).
- **R2 — Own build.** A Zen-style Firefox-ESR fork (pinned ESR tag + patches +
  our tree) with a bundled Node + Theia browser-target backend as a supervised
  localhost sidecar. Theia loads full-window as the sole GUI. Linux first.
- **R3 — Extension-based internals.** Theia-side additions are `@sourcerer/*`
  Theia extensions — Theia core is never forked or patched. Firefox-side code
  touches internals only through one anti-corruption layer.
- **R4 — Incremental growth.** Parts are added without rework of what came
  before; the future chrome-owned tab model must stay landable.
- **R4a — GUI customization bridge.** One Theia extension exposing a runtime
  CSS layer and a dev-flagged privileged JS layer. Changes nothing visually by
  default.
- **R4b — Every Theia tab has a URL.** All widget types (settings, terminals,
  chat views, …) become URI-addressable under their own schemes, opening
  through `OpenerService` — the reusable prerequisite for the future unified
  URL bar and tab strip.

Post-4.0 requirements — the unified tab strip, full GUI customization,
surfacing the inherited real-browser capabilities (Widevine DRM, WebExtensions,
site isolation), AI integration, extension distribution — are recorded in the
requirements document so the internals do not preclude them.

## Building

Two Nix dev shells build the two halves: `nix develop .#theia` for the
Theia sidecar, `nix develop .#firefox` for the Firefox-ESR fork. The repo
must live at a space-free path. See [docs/BUILD.md](docs/BUILD.md) for the
exact commands, measured durations, and a fresh-clone verification —
including the tiered rebuild loop, the compiled-file patch boundary, the
endpoint allowlist, and the rebase/desktop-install procedures.

## History

Versions 1.0–3.0 were a bespoke Tauri 2 + React desktop shell. That work is
frozen with its full git history at `/home/chris/Vibe Coding/Sourcerer-Archived`.
Nothing from it is a dependency of v4.0.

## License

PolyForm Noncommercial. See [LICENSE](LICENSE).
