# Roadmap: Power Browser

## Milestones

- ✅ **v1.0 PowerBrowser** — Phases 1–7 (shipped 2026-09-04, override closeout — see `.planning/milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Hardening and SQL Tabs** — Phases 08–09 (shipped 2026-09-05, hardening-only — see `.planning/milestones/v1.1-ROADMAP.md`)
- ✅ **v1.2 Sign-off Closeout and SQL Store** — Phases 10–12 (shipped 2026-09-05, override closeout — see `.planning/milestones/v1.2-ROADMAP.md`)
- 📋 **Future** — SQL GUI surface, GUI-02 in-Theia web tabs, GUI-05 unified tab strip (v1.3+)

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

<details>
<summary>✅ v1.1 Hardening and SQL Tabs (Phases 08–09) — SHIPPED 2026-09-05</summary>

- [x] Phase 08: Installer Hardening + Canonical Rename (5/5 plans)
- [x] Phase 09: Extensions + Crash Pipeline (4/4 plans)

Archive: `.planning/milestones/v1.1-ROADMAP.md` · Requirements: `.planning/milestones/v1.1-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.1-MILESTONE-AUDIT.md` · Tag: `v1.1`

</details>

<details>
<summary>✅ v1.2 Sign-off Closeout and SQL Store (Phases 10–12) — SHIPPED 2026-09-05</summary>

- [x] Phase 10: Sign-off Closeout (3/3 plans) — completed 2026-09-05
- [x] Phase 11: SQL Store Design (3/3 plans) — completed 2026-09-05
- [x] Phase 12: SQL Store Build (3/3 plans) — completed 2026-09-05

Archive: `.planning/milestones/v1.2-ROADMAP.md` · Requirements: `.planning/milestones/v1.2-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.2-MILESTONE-AUDIT.md` · Tag: `v1.2`

</details>

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
