# Roadmap: Power Browser

## Milestones

- ✅ **v1.0 PowerBrowser** — Phases 1–7 (shipped 2026-09-04, override closeout — see `.planning/milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Hardening and SQL Tabs** — Phases 08–09 (shipped 2026-09-05, hardening-only — see `.planning/milestones/v1.1-ROADMAP.md`)
- 🔄 **v1.2 Sign-off Closeout and SQL Store** — Phases 10–12 (active)
- 📋 **Future** — SQL GUI surface, GUI-02 in-Theia web tabs, GUI-05 unified tab strip (v1.3+)

## Phases

- [ ] **Phase 10: Sign-off Closeout** - Formal sign-off on the carried v1 requirements (~6 close on record, ~10 run live)
- [ ] **Phase 11: SQL Store Design** - Authority/invariant table + schema/migration plan reviewed before code
- [ ] **Phase 12: SQL Store Build** - Chrome-side SQLite writer, read paths, and store gates green

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

## Phase Details

### Phase 10: Sign-off Closeout

**Goal**: Every carried v1 requirement is formally signed off — halves Phases 08/09 proved live close on record with evidence cited, only the still-staged halves run
**Depends on**: Phase 09 (v1.1 shipped)
**Requirements**: MIG-01, MIG-02, GUI-01, GUI-03, GUI-04, GEN-01, GEN-02, GEN-03, GEN-05, EXT-01, TEL-01, TEL-02, TEL-03, VER-01, DOC-01
**Success Criteria** (what must be TRUE):

  1. Human UAT sheets are signed for the browser-window toggle run (GUI-01, 5 steps), the customize-bridge restyle run (GUI-03, 3 steps), the icon pixel look (GEN-02), the Theia welcome/about live render (GEN-05), and the REBRANDING.md stranger carry-test (DOC-01)
  2. Live drills run green for the telemetry declaration (TEL-01), telemetry pipeline delivery (TEL-02), Open VSX + URL bundle+load on a real sidecar build (EXT-01), and the full-fleet brand-literal proof on the now-runnable fixture tier (VER-01)
  3. Record-close boxes each cite their prior live evidence: platform migration proof (MIG-01), token-inventory audit (MIG-02), release-variant emitter deltas only (GEN-01), Windows/macOS schema deltas only (GEN-03), bridge-landability statement against the green registry-shape gate (GUI-04), installed-binary allowlist layer (TEL-03)
  4. The count reconciliation is recorded: the v1.0 archive's "16" against this milestone's 15-item enumeration, with the discrepancy explained, not silently renumbered
  5. `scripts/verify-platform.sh --quick` is green at closeout with no sibling driver created — any new check landed as a registry row with a `--self-test`

**Plans**: 3/3 plans executed

Plans:

- [x] 10-01-PLAN.md — Record-close tracer plus reconciliation plus five staged UAT runbooks
- [x] 10-02-PLAN.md — Live drills on the built tree with probe-first staging
- [x] 10-03-PLAN.md — Gates-green sweep plus 15-box sign-off assembly

### Phase 11: SQL Store Design

**Goal**: The store's authority rules and schema are written down and reviewed before any store code exists
**Depends on**: Phase 10
**Requirements**: SQL-02, SQL-03
**Success Criteria** (what must be TRUE):

  1. An authority/invariant table exists stating the single chrome-side writer, sessionstore authoritative for restore, registry URIs as the join key, Theia backend never opening profile SQLite, and the own-file rule — reviewed and signed before schema work
  2. A schema + migration plan exists showing the tabs table on URI primary key, `schema_version`/`user_version` from day one, forward-only migrations exercised against fixture DBs, a quarantine-not-delete corruption path, the private-tab exclusion rule, and the fixed `tabs.sqlite` filename as platform content (not manifest) — reviewed and signed
  3. SQLite is the only engine in the design (per `.planning/research/duckdb-vs-sqlite/VERDICT.md`); no DuckDB surface, no `[features]`/`[sql]` manifest flag (ARCHITECTURE.md Anti-Pattern 6), no GUI surface

**Plans**: TBD

### Phase 12: SQL Store Build

**Goal**: Tabs persist as SQL rows behind the platform boundary with read paths and green gates — no GUI surface
**Depends on**: Phase 11 (design reviewed before code)
**Requirements**: SQL-01, SQL-04, SQL-05
**Success Criteria** (what must be TRUE):

  1. Every tab is a SQL row written only by the chrome-side writer (`Sqlite.sys.mjs` behind `PowerBrowserAPI.sys.mjs`, the sole boundary, with new INTERNAL-APIS.md rows) into its own `tabs.sqlite` in the profile dir, while sessionstore stays authoritative for restore and registry URIs are the join key
  2. Bookmarks/history are exposed via Places APIs (never raw places writes), a sessionstore read projection and a query API on `@powerbrowser/tab-uris` answer reads, and private tabs are absent from the store under an emitter-exercising absence test (per the project's absence-assertion rule)
  3. The store gates are green: the second-writer negative scan finds no profile-DB opens outside `powerbrowser/shell/`, an interleaved tab+bookmark write soak ends with `PRAGMA integrity_check` clean, a URI→row→restart→reopen roundtrip passes on a temp DB, the registry-shape gate is untouched, and a live ESR rebase drill runs over the new touchpoints
  4. Theia backend reads the dedicated file only via `better-sqlite3@13.0.3` (`readonly: true`); Theia core is unpatched and no Gecko change lands outside the patch stack

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Sign-off Closeout | 3/3 | In Progress|  |
| 11. SQL Store Design | 0/0 | Not started | - |
| 12. SQL Store Build | 0/0 | Not started | - |

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
