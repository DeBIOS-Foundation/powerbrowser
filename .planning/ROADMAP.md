# Roadmap: Power Browser

## Milestones

- ✅ **v1.0 PowerBrowser** — Phases 1–7 (shipped 2026-09-04, override closeout — see `.planning/milestones/v1.0-ROADMAP.md`)
- 🚧 **v1.1 Hardening and SQL Tabs** — Phases 08–09 (hardening-only: no GUI, no SQL tabs this cycle — roadmap awaiting approval)
- 📋 **Future** — SQL-backed tabs (SQL-01, promoted from backlog 999.1) then GUI tabs (GUI-02/GUI-05)

## Phases

<details>
<summary>✅ v1.0 PowerBrowser (Phases 1–7) — SHIPPED 2026-09-04</summary>

- [x] Phase 1: Platform Extraction and Rename (21/21 plans)
- [x] Phase 2: Configuration Manifest and Generator Core (9/9 plans)
- [x] Phase 3: Firefox Branding Emitter and Icon Pipeline (4/4 plans)
- [x] Phase 4: Theia Surface — Branding, Extensions, Telemetry (4/4 plans)
- [x] Phase 5: Hook-Only Patches and Upstream Uptake (4/4 plans)
- [x] Phase 6: Two-Layer Verification and Rebranding Docs (6/6 plans)
- [x] Phase 7: Sourcerer as Downstream (4/4 plans)

Archive: `.planning/milestones/v1.0-ROADMAP.md` · Requirements: `.planning/milestones/v1.0-REQUIREMENTS.md` · Tag: `v1.0`

</details>

- [ ] **Phase 08: Installer Hardening + Canonical Rename** - Real Windows/macOS installers, self-hosted MAR updates, canonical PowerBrowser name, release build
- [ ] **Phase 09: Extensions + Crash Pipeline** - npm/local-path extension sources, WebExtensions policy, minimal crash collector, tier-3 fixtures

## Phase Details

<details>
<summary>✅ v1.0 phase details — archived</summary>

See `.planning/milestones/v1.0-ROADMAP.md`.

</details>

### Phase 08: Installer Hardening + Canonical Rename

**Goal**: Downstreams ship real, self-updating branded installers under the canonical PowerBrowser name
**Depends on**: v1.0 (Phases 1–7)
**Requirements**: NAME-01, PKG-01, PKG-02, PKG-03, BLD-01, UPD-03, SEC-02, SHELL-01
**Success Criteria** (what must be TRUE):

  1. A builder following the docs/BUILD.md packaging procedure produces working Windows (NSIS/MSIX) and macOS (DMG) installers from the generated branding on real packaging hosts (Nix-built packaging first, agent-driven VMs as fallback)
  2. A user installing either package gets a browser carrying the canonical PowerBrowser name on every branded surface, running side by side with stock Firefox with no profile or remoting collisions
  3. The per-OS install → launch → uninstall → no-residue matrix is green, and the recorded update story (self-hosted MAR updates under fork signing, no Mozilla phone-home) proves one real N→N+1 hop per OS
  4. A release objdir-release build passes with the release-variant verify rows green, and the live ESR rebase drill passes through the existing rebase and conflict tooling
  5. WINDOWS #13 (registerWindowActor boundary hole) and #14 (BiDi double-window) are closed with their gates green

**Plans**: 5 plans

Plans:
**Wave 1**

- [ ] 08-01-PLAN.md — WR-04 + WR-07 pre-fixes plus NAME-01 rename slice through byte-identity (tracer)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 08-02-PLAN.md — NAME-01 propagation completion: gate re-pins, canonical fixture, proof
- [ ] 08-03-PLAN.md — WINDOWS #13 boundary guard plus #14 BiDi context fix

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 08-04-PLAN.md — Updater enablement, Linux MAR hop, NSIS on Nix, registry rows, procedure

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 08-05-PLAN.md — MSIX/DMG on named hosts, per-OS matrix, release build, rebase drill

### Phase 09: Extensions + Crash Pipeline

**Goal**: Downstreams declare npm/local-path extensions and crashes reach their own collector
**Depends on**: Phase 08
**Requirements**: EXT-02, EXT-03, TEL-04, BLD-02, UPD-04
**Success Criteria** (what must be TRUE):

  1. A downstream declaring npm and local-path extension entries gets exact-pinned, integrity-verified installs that fail loud on mismatch, proven per target platform including offline-from-vendor packaging
  2. Declared WebExtensions land through ExtensionSettings in the already-emitted distribution/policies.json with the agreement gate green
  3. A crashing browser build submits through the minimal Antenna-protocol collector (multipart POST with upload_file_minidump, CrashID returned, about:crashes lists the crash) under the written PII/retention/throttle policy, with the native reporter still compiled out
  4. Tier-3 per-fixture builds pass over the new source kinds on real built artifacts, and the Theia re-pin proof passes with the token-gate backend intact

**Plans**: TBD

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 08. Installer Hardening + Canonical Rename | 0/0 | Not started | - |
| 09. Extensions + Crash Pipeline | 0/0 | Not started | - |

## Inherited network egress (carried through the migration, not decided here)

The imported platform allows exactly three Mozilla hosts, all one feature —
Remote Settings, which cannot be disabled without also losing CRLite
certificate revocation, intermediate certificate preloading, and
tracking-protection updates: **firefox.settings.services.mozilla.com**,
**content-signature-2.cdn.mozilla.net**, and
**firefox-settings-attachments.cdn.mozilla.net**. They are named here and in
REQUIREMENTS.md because `verify-platform.sh`'s `allowlist-doc-consistency`
check requires every allow-dispositioned Mozilla host to be documented in this
project's own planning record rather than only inside the allowlist file — an
allow entry nobody had to write down is one nobody has to defend. Repointing
them per a downstream's manifest is Phase 4's TEL-03.

---

## Backlog

### Phase 999.1: SQL-browser-memory (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Make every tab a SQL row, alongside bookmarks, sessions, and anything else that
can live in SQL.

**Not Databasise.** Databasise is a separate project and will not be in Power
Browser. The out-of-scope line naming Databasise says nothing about whether
this item is in scope — the two were conflated once and must not be again.

**The seam that already exists.** `TabUriRegistry` gives tabs stable URI
identity (the GUI-04 declared bridge interface). Stable tab identity is the
property this would build on, and most browsers do not have it.

**Three migrations, not one:**

- Bookmarks / history — already SQL upstream (`places.sqlite`); expose and
  extend rather than build

- Sessions — `sessionstore` is compressed JSON, not SQL
- Theia workbench layout — separate again
- Tabs — the only layer where the schema would be net-new

**Boundary to respect if this is ever planned:** ARCHITECTURE.md Anti-Pattern 6
— if a downstream needs to change platform behaviour, the platform needs an
extension point; adding a `[features]` flag is the bug, not the fix.

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)
