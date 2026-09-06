# Requirements — Power Browser v1.3 Browser GUI

**Defined:** 2026-09-06
**Core Value:** A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo, and build their own branded, working web browser without touching any other file — then reshape its GUI through Theia extensions without forking the platform.

(v1.3 builds the Theia-hosted browser GUI only: chrome bar, mode-driven tabs, Panorama organising. No web-content rendering, no bridge work.)

## v1.3 Requirements

### Chrome bar — Phase 13+

- [ ] **GUI-06**: The user can navigate with a top chrome bar —
      back, forward, reload, address input with suggestions, new
      tab, mode toggle — living as a toolbar-like `@powerbrowser/*`
      contribution above or below the Theia toolbar (sketch 001
      winner: Variant A). Tab feel + navigation only: no bookmarks
      strip, no per-tab close/mute, no browser menu.

### Modes — Phase 13+

- [ ] **GUI-07**: The user can switch coding / browsing / organising
      modes (customizable, shipped defaults); the tab strip
      relocates per mode (sketch 002 winner: Variant B — top in
      browsing, IDE-docked in coding), side panels slide, and every
      tab persists across switches. **Entry criterion:
      strip-relocation spike goes green first** — prove a live tab
      strip moves shell areas without forking Theia core; if red,
      the strip stays top per Variant A and the modes still ship.

### Organising — Phase 13+

- [ ] **GUI-08**: The user can organise tabs on a freeform Panorama
      canvas — free drag, corner resize, auto-box on canvas drop,
      zoom, ungrouped tray — and flip to a tree over the identical
      group data. Groups persist in a SQL groups table
      (id, title, bounds, activeGroupId) + `group_id` on the
      URI-keyed tab rows; thumbnails are PNG last-view snapshots.
      Canvas reads/writes only SQL; sessionstore stays
      restore-authoritative (never repeat Panorama's extData
      coupling — Bugzilla 1221050).

### Windows & setups — Phase 13+

- [ ] **GUI-09**: The user gets core + dependent windows with named
      setups remembering geometry, tab placement, and mode; closing
      the core window kills the session and the next launch restores
      the setup. Sub-windows host tab content, never a second IDE
      frame.

### Carried (no new IDs — ride along, not build work)

- v1.2 doc-sync flips (SQL-01/SQL-03/SQL-04 boxes + traceability)
  and deferred verifications (`/gsd-verify-work 10/11/12`, 5 human
  UAT signatures staged)

### Inherited network egress (carried, not decided here)

The imported platform allows exactly three Mozilla hosts, all one feature —
Remote Settings (disabling it would also lose CRLite revocation,
intermediate preloading, and tracking-protection updates):
**firefox.settings.services.mozilla.com**,
**content-signature-2.cdn.mozilla.net**, and
**firefox-settings-attachments.cdn.mozilla.net**. Named here and in
ROADMAP.md because `verify-platform.sh`'s `allowlist-doc-consistency`
check requires every allow-dispositioned Mozilla host to be documented in
the project's own planning record.

## Future Requirements (v1.4+)

- **GUI-02**: In-Theia web tabs (`<xul:browser>`-backed). New-tab
  chrome in v1.3 opens with the stock-window escape until this lands.
- **GUI-05**: Unified tab strip (chrome-owned tab model,
  mirror/proxy bridge). Deferred behind v1.3 chrome/mode/organising.
- **Seeds**: deferred-browser-chrome (bookmarks strip, per-tab
  close/mute, browser menu), gui-component-dnd (drag-anywhere
  rearrange), firefox-parity-tabs (cross-window tear-off + tiles
  page) — each triggers off this milestone landing.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web-content rendering inside Theia this cycle | GUI-02 stays deferred; v1.3 is chrome + modes + organising over existing tab kinds |
| Mirror/proxy bridge or chrome-owned tab model | GUI-05 stays a later milestone |
| Second SQLite writer in any process | Corruption class; single chrome-side writer is invariant |
| New tables inside `places.sqlite` | Upstream-owned schema; every ESR rebase may migrate it |
| Sessionstore-coupled group storage | Panorama's removal lesson (Bugzilla 1221050); groups live in SQL |
| A `[features]` / `[modes]` manifest flag | Extension point, not a flag (ARCHITECTURE.md Anti-Pattern 6); modes are data with defaults |
| Forking/patching Theia core or modifying Gecko outside the patch stack | Inherited hard rules |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GUI-06 | Phase 13 | Pending |
| GUI-07 | Phase 14 (strip-relocation spike entry criterion runs as Phase 13 exit gate) | Pending |
| GUI-08 | Phase 15 | Pending |
| GUI-09 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 4 total (+ carried items)
- Mapped to phases: 4 (GUI-06→13, GUI-07→14, GUI-08→15, GUI-09→14)
- Unmapped: 0

---
*Requirements defined: 2026-09-06*
*Sources: sketch-findings-Power-Browser skill, browser-window-model.md, browser-organising-panorama.md, tab-sql-substrate.md*
