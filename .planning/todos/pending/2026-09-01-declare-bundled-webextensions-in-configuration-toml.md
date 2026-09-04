---
created: 2026-09-02T00:36:47.892Z
title: Declare bundled WebExtensions in configuration.toml
area: tooling
severity: minor
resolves_phase: 9
files:
  - .planning/REQUIREMENTS.md:243
  - .planning/REQUIREMENTS.md:170-172
  - configuration.toml
  - powerbrowser/distribution/policies.json
  - powerbrowser/endpoint-allowlist.json
  - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
---

## Problem

Power Browser ships no WebExtensions and has no mechanism to declare any. The
originating idea was "a folder of extensions shipped with the browser so people
can see the power of them", starting with hister (https://github.com/asciimoo/hister,
AGPLv3) — a local private search engine that indexes the full text of pages you
visit.

That request as literally stated is **already out of scope**:

> `.planning/REQUIREMENTS.md:243` — "Databasise and the curated addon set —
> downstream compositions, never in the platform tree"

But the *mechanism* is not out of scope, and the project already has its exact
sibling. EXT-01 (`REQUIREMENTS.md:170-172`, Phase 4) does this for the other
extension type:

> A downstream can declare **Theia extensions** in `configuration.toml` with
> source (Open VSX id or direct URL) and pin; they are downloaded and bundled
> into the sidecar at build time.

So the split that resolves the conflict: the **mechanism** is platform work (a
WebExtension sibling of EXT-01, would be a new EXT-02), and the **list** is
data living in `configuration.toml`'s defaults layer (D-05), which downstreams
overlay. Nothing is vendored into the tree — matching how `upstream/` is fetched
by script and `generated/` is gitignored.

Four constraints found while scoping this, each of which would otherwise be
discovered late:

1. **AMO is deliberately dead in this build.** `extensions.getAddons.cache.enabled`
   is false and `services.addons.mozilla.org` is `deny` in
   `powerbrowser/endpoint-allowlist.json`. Hister's own quickstart step ("install
   from addons.mozilla.org") cannot work here. `policies.json` `ExtensionSettings`
   with a local `install_url` is the only sanctioned install path — and
   `powerbrowser/distribution/policies.json` already exists, currently carrying
   only three `Disable*` keys.

2. **The endpoint allowlist is the real recurring cost.** Every bundled
   extension's runtime hosts need an entry with a reason, or
   `scripts/verify-endpoints.sh` goes red. This is per-extension, forever, and is
   the main argument for keeping the shipped list small.

3. **Discovery cannot be browser chrome.** `CLAUDE.md` hard rule 5 — no custom
   browser chrome is authored, and that is the Milestone 2 boundary. The only
   legal surface for "see the power of them" is the Theia side, most naturally
   `powerbrowser-welcome-widget.tsx`.

4. **Licensing is per-extension.** Hister is AGPLv3 against this repo's
   PolyForm Noncommercial. An unmodified bundled xpi is aggregation; forking one
   triggers publication obligations.

## Solution

TBD — not scheduled. Sketch only:

- New requirement EXT-02 beside EXT-01, landing in Phase 4 ("Theia Surface —
  Branding, Extensions, Telemetry") or a later phase, since it is the same
  declare/pin/fetch-at-build shape.
- `[[webextensions]]` array-of-tables in `configuration.toml`: id, source URL,
  pin, checksum, plus the hosts it needs so the allowlist entry can be generated
  rather than hand-kept (matches CLAUDE.md's derive-don't-enumerate rule).
- Generator emits `ExtensionSettings` into `powerbrowser/distribution/policies.json`
  and the corresponding `hosts` rows into `powerbrowser/endpoint-allowlist.json`.
- Discovery: a section in the Theia welcome widget listing what shipped and why.

Separate and much cheaper, if hister specifically is the actual want: run
`hister listen` as a user daemon and sideload its xpi by hand. No platform work
at all. A `@powerbrowser/hister` Theia **backend** extension could later supervise
the binary — `theia/extensions/token-gate/` is the existing pattern, and its
`parent-watchdog-backend-contribution.ts` already solves dies-with-the-browser.
Retrieval comes free either way: hister serves MCP at `POST /mcp` and
`@theia/ai-mcp` is already a dependency (`theia/package.json:17-18`).
