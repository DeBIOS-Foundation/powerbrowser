# Roadmap: Power Browser

## Milestones

- ✅ **v1.0 PowerBrowser** — Phases 1–7 (shipped 2026-09-04, override closeout — see `.planning/milestones/v1.0-ROADMAP.md`)
- ✅ **v1.1 Hardening and SQL Tabs** — Phases 08–09 (shipped 2026-09-05, hardening-only — see `.planning/milestones/v1.1-ROADMAP.md`)
- ✅ **v1.2 Sign-off Closeout and SQL Store** — Phases 10–12 (shipped 2026-09-05, override closeout — see `.planning/milestones/v1.2-ROADMAP.md`)
- 🔄 **v1.3 Browser GUI** — Phases 13–15 (active: Theia-hosted chrome bar, mode-driven tabs, Panorama organising on the v1.2 SQL store)
- 📋 **Future** — GUI-02 in-Theia web tabs, GUI-05 unified tab strip, deferred seeds (bookmarks strip, per-tab close/mute, browser menu, gui-component-dnd, firefox-parity-tabs) (v1.4+)

## Phases

- [x] **Phase 13: Chrome Bar + Strip-Relocation Spike** - Top chrome bar navigation shell; spike proves a live tab strip moves shell areas (GUI-06; enables GUI-07)
- [x] **Phase 14: Modes + Windows & Setups** - Mode-driven shell with relocating strip; core/dependent windows with named setups (GUI-07, GUI-09)
- [x] **Phase 15: Panorama Organising** - Freeform canvas + tree toggle over SQL-persisted groups (GUI-08)

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

## Phase Details

### Phase 13: Chrome Bar + Strip-Relocation Spike

**Goal**: The user navigates with a top chrome bar, and strip-relocation feasibility is proven with the fallback decided
**Depends on**: Phase 12 (v1.2 SQL store shipped — tab rows and registry URIs are the identity substrate)
**Requirements**: GUI-06
**Enables**: GUI-07 strip-relocation spike entry criterion (mapped to Phase 14 — the spike verdict is this phase's exit gate)
**Success Criteria** (what must be TRUE):

  1. User sees a top chrome bar — back, forward, reload, address input, new tab, mode toggle — as a toolbar-like `@powerbrowser/*` contribution above or below the Theia toolbar (sketch 001 winner: Variant A), styled as a native Theia citizen per the sketch-findings theme
  2. User can go back/forward, reload the current tab, and open a new tab from the bar (new-tab opens via the stock-window escape until GUI-02; tab feel + navigation only — no bookmarks strip, no per-tab close/mute, no browser menu)
  3. User gets address-input suggestions while typing and activating one navigates
  4. Strip-relocation spike verdict is recorded: a live tab strip moves Theia shell areas without forking Theia core (green → Variant B strip work proceeds in Phase 14; red → Variant-A fallback, strip stays top, modes still ship)

**Plans**: 5/5 plans executed + 2 gap-closure plans (G-13-3)

Plans:

- [x] 13-01-PLAN.md — Strip-relocation spike with GREEN/RED verdict record
- [x] 13-02-PLAN.md — Chrome-bar skeleton, prefix search over RPC, suggestions plus verdict gates
- [x] 13-03-PLAN.md — Chrome-bar widget, styling, and commands gate
- [x] 13-04-PLAN.md — Gap closure: row-URL commit routing, honest nav controls, live chip, rewritten activation gate
- [x] 13-05-PLAN.md — Gap closure: bar-above-strip ratification plus DOM-order placement gate

**UI hint**: yes

### Phase 14: Modes + Windows & Setups

**Goal**: The user switches modes that reshape the shell around invariant tabs, and works across core/dependent windows with named setups
**Depends on**: Phase 13 (chrome bar hosts the mode toggle; spike verdict fixes Variant B vs Variant-A fallback)
**Requirements**: GUI-07, GUI-09
**Success Criteria** (what must be TRUE):

  1. User can switch coding / browsing / organising modes from shipped defaults, customise them, and save layouts as modes — modes are data with defaults, never a `[features]`/`[modes]` manifest flag
  2. Tab strip relocates per mode (top in browsing, IDE-docked in coding per sketch 002 winner Variant B — or stays top under the Variant-A fallback) with sliding side panels, and every tab persists across switches
  3. User can open dependent windows hosting tab content, never a second IDE frame; closing the core window kills the session and the next launch restores the setup
  4. User can save, name, and restore setups remembering geometry, tab placement, and mode

**Plans**: 3/3 plans executed + 2 gap-closure plans (G-14-1 … G-14-8)

Plans:

- [x] 14-01-PLAN.md — Window-routing probe with GREEN/RED record, modes tracer with shipped descriptors, bridged toggle, defaults gate
- [x] 14-02-PLAN.md — Modes full: customs with fallback, organising placeholder, toggle rows, style layer, invariant gate
- [x] 14-03-PLAN.md — Dependents per probe verdict plus named setups with relaunch restore, roundtrip and content gates
- [ ] 14-04-PLAN.md — Gap closure: main-area exemption at the deactivate seam, toggle routed through the mode command, Explorer dock, launch order, behavioural second-visit gate
- [ ] 14-05-PLAN.md — Gap closure: backend reads the captured environment, group channel delivers, one stock window for new tab, two class gates, catalogue green

**UI hint**: yes

### Phase 14.1: In-Theia Web Tabs (GUI-02) (INSERTED)

**Goal**: The chrome-bar "+" opens a web page tab inside the Theia shell's own tab strip. The page is rendered by a chrome-owned `<xul:browser>` overlay kept aligned with a Theia placeholder widget through a two-way bridge (Theia sends geometry, visibility, close; chrome sends URL, title, loading state, back/forward availability); the tab follows every mode switch; the address pill shows and navigates the active tab's URL. Chris reversed the 2026-08-30 GUI-02 deferral on 2026-09-06; step 1 (an overlay rendering a page inside the shell window over the live frontend) was confirmed live the same day.
**Depends on**: Phase 14 (main-area exemption keeps content tabs alive across mode switches; the group channel delivers). Phase 15's Organising surface needs this phase for real tab data.
**Requirements**: GUI-02
**Success Criteria** (what must be TRUE):

  1. Clicking "+" adds a tab to the shell's main-area tab strip and a web page renders inside that tab's bounds — no separate OS window opens for "+", typed addresses, or suggestion activation
  2. The web tab survives every mode switch (Coding, Browsing, Organising, and a mode's second visit) and follows the layout each mode gives it; the overlay tracks the placeholder on resize, tab switch, panel slide, hide, and close
  3. Every tab has a URI via `TabUriRegistry` (web tabs use their page URL); the address pill shows the active tab's address, a typed address navigates the active web tab (or opens one when the active tab is not a web tab), and page navigations report URL, title, loading state, and back/forward availability back to the pill and nav buttons
  4. Each web tab writes its uri/url/title row to the chrome-side tab store on open, navigate, and close, so Organising and named setups see real tabs
  5. Firefox internals stay behind `PowerBrowserAPI.sys.mjs`, Theia core is untouched, and a `--quick` gate plus a live-frontend check go red on each of the above when a fault is planted

**Plans**: 3 plans

Plans:

- [ ] 14.1-01-PLAN.md — Overlay bridge tracer (open handler → placeholder → geometry → chrome-owned overlay) plus chrome host expansion (progress listener, pushes, store rows, nav kinds, embedder wall, orphan cleanup, reserved Ctrl+L) and widget states/occlusion/keyboard
- [ ] 14.1-02-PLAN.md — Chrome bar and registry rewiring: uriOf page-URL branch, navigable-tab predicate flipped, New Tab/commit/suggestion routed to the in-shell web tab, pill bound to the active tab and state pushes, suggestions gate retargeted, URI-SCHEMES section
- [ ] 14.1-03-PLAN.md — gui02-web-tab-bridge --quick gate and gui02-web-tab-live BiDi check (New Tab, typed commit, ≤1px alignment, five-hop mode walk, pill/uriOf/Back, store row, close) with self-tests and registry rows; ends on Chris's blocking confirmation in his window

**UI hint**: yes

### Phase 15: Panorama Organising

**Goal**: The user organises tabs spatially on a freeform canvas and hierarchically in a tree, over SQL-persisted groups
**Depends on**: Phase 14 (organising mode hosts the canvas/tree surface)
**Requirements**: GUI-08
**Success Criteria** (what must be TRUE):

  1. User can drag tabs freely on the Panorama canvas, resize groups by corner, drop canvas items to auto-box, zoom, and see the ungrouped tray
  2. User can flip between canvas and tree over the identical group data
  3. Groups persist across restart in a SQL groups table (id, title, bounds, activeGroupId) + `group_id` on the URI-keyed tab rows, written only by the single chrome-side writer; the canvas reads/writes only SQL and sessionstore stays restore-authoritative (never sessionstore-coupled — Bugzilla 1221050)
  4. Tab thumbnails render as PNG last-view snapshots

**Plans**: TBD

- [x] 15-01-PLAN.md
- [x] 15-02-PLAN.md
- [x] 15-03-PLAN.md

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Chrome Bar + Strip-Relocation Spike | 5/5 | In Progress|  |
| 14. Modes + Windows & Setups | 3/3 | Complete | 2026-09-06 |
| 15. Panorama Organising | 3/3 | Complete | 2026-09-06 |

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

### Phase 16: AI backend adapter - OpenCode

**Goal:** Selectable `@OpenCode` backend in sidecar chat with staged accept/reject review (AI-01..AI-05)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Depends on:** Phase 15
**Plans:** 3/3 plans executed

Plans:

- [x] 16-01-PLAN.md
- [x] 16-02-PLAN.md
- [x] 16-03-PLAN.md

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
