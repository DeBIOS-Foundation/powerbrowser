# Roadmap: Power Browser

## Milestones

- ✅ **v1.0 PowerBrowser** — Phases 1–7 (shipped 2026-09-04, override closeout — see `.planning/milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Hardening and SQL Tabs** — Phases 08–09 (shipped 2026-09-05, hardening-only — see `.planning/milestones/v1.1-ROADMAP.md`)
- ✅ **v1.2 Sign-off Closeout and SQL Store** — Phases 10–12 (shipped 2026-09-05, override closeout — see `.planning/milestones/v1.2-ROADMAP.md`)
- ✅ **v1.3 Browser GUI** — Phases 13–15, inserted 14.1 and 14.1.1, retired 16 (shipped 2026-09-06, verifications deferred — see `.planning/milestones/v1.3-ROADMAP.md`)
- ✅ **v1.4 Platform Updates and GUI Close-out** — Phases 17–25 (shipped 2026-10-19, override closeout: live UAT deferred by Chris under NG-089 — see `.planning/milestones/v1.4-ROADMAP.md`)
- 📋 **v1.5 Coding Workbench Layout** — sketch 005's VS Code layout for Coding mode, all four changes: one title row, centred address box, right cluster of layout toggles, activity icons across the top of the sidebar (SK-01, adopted 2026-10-17; Browsing and Organising unchanged)
- 📋 **Future** — GUI-05 unified tab strip, W6 canvas search, release and distribution (backlog 999.2), deferred seeds (bookmarks strip, per-tab close/mute, browser menu, gui-component-dnd, firefox-parity-tabs) (v1.5+)

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

<details>
<summary>✅ v1.3 Browser GUI (Phases 13–16) — SHIPPED 2026-09-06</summary>

- [x] Phase 13: Chrome Bar + Strip-Relocation Spike (5/5 plans, 13-04 and 13-05 gap closure) — completed 2026-09-06
- [x] Phase 14: Modes + Windows & Setups (4/5 plans; 14-05's code landed in d5b8dc1, its two checks were never written — gap G-14.1.1-10, closed by Phase 20 PLAT-02) — completed 2026-09-06
- [x] Phase 14.1: In-Theia Web Tabs (GUI-02) (INSERTED) (3/3 plans) — "+" opens a web tab inside the Theia shell's own tab strip
- [x] Phase 14.1.1: GUI Conformance Sweep (INSERTED) (16/16 plans, three passes) — every `fixable: yes` gap in `14.1.1-UAT.md` closed with a check that goes red without its fix
- [x] Phase 15: Panorama Organising (3/3 plans) — completed 2026-09-06
- [x] Phase 16: AI backend adapter - OpenCode (3/3 plans) — Retired 2026-09-28; code removed in Phase 17 (RM-01)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Chrome Bar + Strip-Relocation Spike | 5/5 | Complete | 2026-09-06 |
| 14. Modes + Windows & Setups | 3/3 | Complete | 2026-09-06 |
| 15. Panorama Organising | 3/3 | Complete | 2026-09-06 |

Phase 16 record: Retired 2026-09-28 under D2 (b): NG-041..NG-050 and NG-052..NG-062 are
dropped — the opencode adapter is retired for the PowerBrowser-Assistant
plugin, which is planned outside this tree. The adapter cuts fall with the
same decision (selectable `@Pi` / DSH backends, per-line comment-to-steer,
`/btw` ephemeral question, file-wide Supercomplete Tab-accept). Chris:
"Run them for me" (ledger/history/log.jsonl lines 310–330, one drop op per
row, each carrying that answer as its quote). NG-051
(`backend = "off"` starts no opencode process and no `/mcp` endpoint) was kept and built, then
dropped 2026-10-17 (c3929e9) when Phase 17 removed the adapter.
Goal (was): selectable `@OpenCode` backend in sidecar chat with staged
accept/reject review. Requirements (was): AI-01..AI-05, removed in v1.4.
Plans 16-01, 16-02, 16-03 executed.

Archive: `.planning/milestones/v1.3-ROADMAP.md` · Requirements: `.planning/milestones/v1.3-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.3-MILESTONE-AUDIT.md` · Phase directories: `.planning/milestones/v1.3-phases/` · Tag: `v1.3`. The v1.3 archive predates Phases 14.1 and 14.1.1; their full detail sections are in their phase directories and in `git show 41caf8f:.planning/ROADMAP.md`.

</details>

<details>
<summary>✅ v1.4 Platform Updates and GUI Close-out (Phases 17–25) — SHIPPED 2026-10-19 (override closeout)</summary>

- [x] Phase 17: OpenCode Removal (4/4 plans)
- [x] Phase 18: Firefox 153.5.0esr (3/3 plans)
- [x] Phase 19: Node 24, React 19, Theia 1.76.0 (8/8 plans)
- [x] Phase 20: Non-GUI Gaps (5/5 plans)
- [x] Phase 21: Panorama Spec and gui08 Checks (5/5 plans)
- [ ] Phase 22: Panorama Worklist (7/7 plans; live checks deferred under NG-089)
- [x] Phase 23: Modes Leftovers and Sketch 005 Verdict (5/5 plans)
- [ ] Phase 24: Live UAT Pass (5/6 plans; A01–A20 recorded, A18 failed; rest deferred by Chris, NG-089 → phase 26)
- [x] Phase 25: CI Green on Main (run 39340825244 green on 0efb116; NG-074 done)

Known gaps: UAT-01 (deferred), MODE-01 live half (A18), PAN-03..06 live checks (deferred); 12 defects for v1.5 in `.planning/milestones/v1.4-phases/24-live-uat-pass/24-GAPS.md`; Chris's remaining checks in `24-CHRIS-CHECKLIST.md` there.

Archive: `.planning/milestones/v1.4-ROADMAP.md` · Requirements: `.planning/milestones/v1.4-REQUIREMENTS.md` · Audit: `.planning/milestones/v1.4-MILESTONE-AUDIT.md` · Tag: `v1.4`

</details>

## Hard constraints (every phase)

- Never fork or patch Theia core — `@powerbrowser/*` extensions only; never modify Gecko outside the patch stack (hook-only patches)
- One verification driver `scripts/verify-platform.sh` — new checks land as registry rows with `--self-test`, never sibling drivers
- Single chrome-side SQLite writer; sessionstore stays restore authority; groups never sessionstore-coupled
- No `[features]`/`[modes]` manifest flags — modes are data with shipped defaults

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

### Phase 999.2: Release and distribution (BACKLOG)

Deferred here 2026-09-25 under D4 (a): NG-075..NG-082 (distribution work
that needs hosts, accounts or long builds outside this machine: Windows
MSIX, macOS DMG, install matrix and per-OS MAR hop, release pipeline,
update host, production crash-ingest host, per-fixture builds, Theia re-pin
to 1.75.0). Deferred here 2026-09-28: NG-074 (CI verify on main) and NG-084
(the five v1.2 human UAT sheets) move to Phase 15. Chris: "Run them for me"
for NG-075..NG-082 (ledger/history/log.jsonl lines 332–339) and "Defer all
the checks" for NG-074 and NG-084 (ledger/history/log.jsonl lines 364 and
366), each op carrying the quoted answer.

**Goal:** [Captured for future planning]
**Requirements:** TBD
**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)
