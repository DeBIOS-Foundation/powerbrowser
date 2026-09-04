# Next milestone inputs (seed for `/gsd-new-milestone`)

Recorded 2026-09-04 by Chris. This file is the input brief for the v2
milestone cycle (questioning → research → requirements → roadmap). Nothing
here is executed work — it is the agreed starting point.

## 1. Product-name decision (authoritative, applies from v2)

- Canonical display form: **PowerBrowser**
- Accepted where the surface requires it: **Powerbrowser**, **powerbrowser**
  (identifiers, paths, binary names — already that form, unchanged)
- v1 shipped under the spaced form "Power Browser" (see milestone archive).
  The rename slice is: `identity.display_name` → `PowerBrowser` in
  `configuration.toml`, plus re-pinning every gate that asserts the spaced
  form (`generate --self-test` byte-identity comparands, preflight
  `brand_display_expectations` in `inventory/brand-tokens.json`,
  trademark-surface display-field scan, downstream fixtures).
- Single-edit propagation proof (Phase 3) must be re-run live against the
  new form; tier-3 Linux build re-verifies the built artifact surfaces.

## 2. Proposed v2 phase draft (dependency order)

- **Phase 08: Real installer builds (PKG-01)** — Windows NSIS/MSIX + macOS
  DMG/icns actually built on packaging hosts (v1 is schema-complete only).
  Pre-fix: WR-04 (reject bare `$VAR` in NSIS defines) + WR-07 (thread
  fixture `root` through installer verifier). Document the procedure in
  `docs/BUILD.md` (currently missing). Rename slice (§1) lands here or as
  its own plan — questioning to decide.
- **Phase 09: Extensions + crash pipeline (EXT-02, TEL-04)** — npm +
  local-path extension sources (pinned, fail-loud); WebExtensions
  declaration sibling (was STATE.md pending todo); crash-report pipeline
  beyond endpoint repointing.
- **Phase 10: In-Theia web tabs (GUI-02)** — URL-addressable tabs backed
  by `<xul:browser>`, not mini-browser (rejected: backend module + `vhost`
  + frame-refusal). Lands on the asserted `TabUriRegistry` shape (GUI-04).
- **Phase 11: Unified tab strip (GUI-05)** — web pages + editors as peers
  in a chrome-owned tab model (mirror/proxy bridge). Depends on Phase 10.

Explicitly out: 999.1 SQL-browser-memory stays backlog.

## 3. Carried from v1 (decide ride-along vs defer in questioning)

- Heavy drills still staged: release `objdir-release` build + release-variant
  rows (WINDOWS #10), tier-3 per-fixture builds (07), live ESR rebase drill
  (05), Theia re-pin proof (05).
- Code deviations: WINDOWS #13 (`registerWindowActor` hole in boundary
  guard), #14 (BiDi double-window / `contexts[0]` mis-resolution).
- Milestone close was an **override closeout**: 16 requirements unchecked
  (human/tier-3 batch), verifications `human_needed` — see MILESTONES.md
  Known Gaps.
