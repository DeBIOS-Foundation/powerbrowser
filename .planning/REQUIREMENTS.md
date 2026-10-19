# Requirements — Power Browser v1.4 Platform Updates and GUI Close-out

**Defined:** 2026-10-16
**Core Value:** A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo, and build their own branded, working web browser without touching any other file — then reshape its GUI through Theia extensions without forking the platform.

(v1.4 removes OpenCode, moves Firefox and Theia to current upstream, closes the
remaining non-GUI gaps, then finishes the v1.3 GUI leftovers one step at a time.
Non-GUI first, then GUI (Chris, 2026-10-15). The v1.3 text is archived in
`.planning/milestones/v1.3-REQUIREMENTS.md`. Research: `.planning/research/SUMMARY.md`.)

## v1.4 Requirements

### Removal

- [x] **RM-01**: OpenCode is gone from the tree: `theia/extensions/backend-opencode`,
      the `[ai]` manifest key, its schema entry and generator emitter, the four
      OpenCode/NG-051 verify scripts, their registry rows, and the docs.
      `generate --check` reports 53 targets. AI-01..05 are removed from the
      requirements. The NG-051 ledger amend is approved by Chris before the commit.
- [x] **RM-02**: Theia's AI framework runs as upstream ships it: both D-22
      overrides are removed from `@powerbrowser/branding`; the 12 `@theia/ai-*`
      packages stay composed and unmodified (Chris, 2026-10-16: "Theia AI should
      remain as stock, and we will work with it later").

### Upstream updates

- [x] **UPD-05**: Gecko is pinned to `FIREFOX_153_5_0esr_BUILD1` with its commit
      SHA recorded; the four patches replay unchanged; `smoke-firefox.sh` derives
      the version from the tree; the `fetch-upstream.sh` tag comment is corrected;
      the run-together line at `configuration.toml:104` is fixed.
- [x] **UPD-06**: Dev and release builds at 153.5 both succeed and the full
      `verify-platform.sh` run passes; MAR-hop evidence is labelled pre-153.5.
- [x] **UPD-07**: The `.#theia` dev shell runs Node 24, with only `flake.nix`
      changed and `flake.lock` untouched (supersedes D-16).
- [x] **UPD-08**: React is 19.2.8 with exactly one installed copy each of react,
      react-dom, `@types/react`, `@types/react-dom` and inversify, enforced by a
      new `--quick` check with a planted-duplicate self-test.
- [x] **UPD-09**: Every `@theia/*` package (except `@theia/monaco-editor-core`) is
      1.76.0 and `diff-theia-core.sh` passes. The Theia ledger row is replaced,
      per Chris's 2026-10-17 decision ("Drop it, add a new row"): Chris drops
      NG-082 (the 1.75.0 row) himself; the agent adds
      NG-086 (Theia 1.76.0 + React 19 + Node 24), records its failing run and
      closes it with evidence; Chris re-locks the check hashes.
- [x] **UPD-10**: A live sidecar check at 1.76 passes on a fresh and on a
      carried-over config dir: only the PowerBrowser welcome opens (no Theia
      Welcome page), `view:` URIs open, and the token-gate rows pass live. The
      `telemetry.telemetryLevel` collision is decided by Chris and recorded.

### Platform gaps

- [x] **PLAT-01**: A build from a clean checkout passes (G-14.1.1-9).
- [x] **PLAT-02**: The group channel has a `--quick` check with a planted-fault
      self-test (G-14.1.1-10; the checks 14-05 planned and never wrote).
- [x] **PLAT-03**: The schema v3/v4 work has ledger rows, approved by Chris.
- [x] **PLAT-04**: `generate-check` is closed as not reproducible with the
      passing runs recorded, or reproduced and fixed.
- [x] **PLAT-05**: Every verify-script path into `.planning/phases/` resolves to
      its archived location, or the check fails loudly.

### Panorama (finishes GUI-08)

- [x] **PAN-01**: 15-UI-SPEC describes the shipped Panorama redesign (commit
      `7b7a1f7`); `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy`
      derive from it and pass; the commit gate is green and `quick-baseline.txt`
      is empty.
- [x] **PAN-02**: Panorama decisions 1 (ungrouped tabs) and 2 (strip filter
      scope) are made by Chris and recorded.
- [ ] **PAN-03**: The tab strip shows only the active group's tabs (W1), and a
      tab opened with "+" joins the active group (W2).
- [ ] **PAN-04**: The user can restore a closed group with Undo Close Group (W4).
- [ ] **PAN-05**: The user can close a card from the card itself (W5).
- [ ] **PAN-06**: The last remaining group cannot be closed (W11, first part).
- [x] **PAN-07**: The stale tray code, comments and CSS are removed.

### Modes and windows (finishes GUI-07)

- [x] **MODE-01**: The Variant B records are current (UAT entry, GUI-DEFECTS
      item 2, GUI-07 box, `mode-descriptors.ts` comment, 14-UAT test 3), and
      Chris confirms the strip relocation live (G-11).
- [x] **MODE-02**: The 60-character mode- and setup-name cap behaviour is decided by Chris
      and applied (G-23).
- [x] **MODE-03**: Side panels slide or switch instantly as Chris decides, and
      14-UI-SPEC matches (G-32).
- [x] **MODE-04**: 14-VERIFICATION is written.

### Verification

- [x] **SK-01**: The sketch 005 (VS Code layout) verdict is recorded before UAT.
- [ ] **UAT-01**: A Phase 15 UAT sheet exists; the 10, 13, 14, 14.1, 14.1.1 and
      15 sheets have no pending result, including a React 19 runtime line (NG-084).
- [x] **CI-01**: CI is green on the pushed `main` (NG-074).

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

## Future Requirements (v1.5+)

- **W6**: Type-anywhere search on the Panorama canvas (Chris, 2026-10-16).
- **W11 keys**: Keys to cycle between groups.
- **v1.5 Coding Workbench Layout (SK-01, adopted by Chris 2026-10-17)**: build sketch 005's VS Code layout for Coding mode, all four changes: one title row, centred address box, right cluster of layout toggles, activity icons across the top of the sidebar. The mode toggle's placement (item 3) is still open. Browsing and Organising keep today's layout.
- **GUI-05**: Unified tab strip (chrome-owned tab model, mirror/proxy bridge).
- **Seeds**: deferred-browser-chrome, gui-component-dnd, firefox-parity-tabs.
- **Release and distribution**: backlog 999.2 (NG-075..NG-081), SEED-001.

## Out of Scope

| Feature | Reason |
|---------|--------|
| DSH and any AI-assistant integration | DSH is a separate project (Chris, 2026-10-16) |
| OpenCode or any other AI backend adapter | Retired 2026-09-28; removed in v1.4 (RM-01) |
| Customising Theia's AI framework | Stays stock until a later milestone takes it up (RM-02) |
| Chrome-owned tab model / unified tab strip | GUI-05 stays a later milestone |
| Second SQLite writer in any process | Corruption class; single chrome-side writer is invariant |
| New tables inside `places.sqlite` | Upstream-owned schema; every ESR rebase may migrate it |
| Sessionstore-coupled group storage | Panorama's removal lesson (Bugzilla 1221050); groups live in SQL |
| A `[features]` / `[modes]` manifest flag | Extension point, not a flag (ARCHITECTURE.md Anti-Pattern 6) |
| Forking/patching Theia core or modifying Gecko outside the patch stack | Inherited hard rules |
| `nix flake update` during the Node 24 move | Would also move inkscape and break the byte-identity check |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RM-01 | Phase 17 | Complete |
| RM-02 | Phase 19 | Complete |
| UPD-05 | Phase 18 | Complete |
| UPD-06 | Phase 18 | Complete |
| UPD-07 | Phase 19 | Complete |
| UPD-08 | Phase 19 | Complete |
| UPD-09 | Phase 19 | Complete |
| UPD-10 | Phase 19 | Complete |
| PLAT-01 | Phase 20 | Complete |
| PLAT-02 | Phase 20 | Complete |
| PLAT-03 | Phase 20 | Complete |
| PLAT-04 | Phase 20 | Complete |
| PLAT-05 | Phase 20 | Complete |
| PAN-01 | Phase 21 | Complete |
| PAN-02 | Phase 22 | Complete |
| PAN-03 | Phase 22 | Implemented; live checks deferred (NG-089, phase 26) |
| PAN-04 | Phase 22 | Implemented; live checks deferred (NG-089, phase 26) |
| PAN-05 | Phase 22 | Implemented; live checks deferred (NG-089, phase 26) |
| PAN-06 | Phase 22 | Implemented; live checks deferred (NG-089, phase 26) |
| PAN-07 | Phase 21 | Complete |
| MODE-01 | Phase 23 | Complete (records); live G-11 failed at A18, see 24-GAPS.md |
| MODE-02 | Phase 23 | Complete |
| MODE-03 | Phase 23 | Complete |
| MODE-04 | Phase 23 | Complete |
| SK-01 | Phase 23 | Complete |
| UAT-01 | Phase 24 | Deferred: NG-089 deferred-approved, phase 26 |
| CI-01 | Phase 25 | Complete |

**Coverage:**

- v1.4 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-10-16*
*Traceability filled: 2026-10-16 (v1.4 roadmap, Phases 17–25)*
*Sources: .planning/HANDOFF-plan-reorg.md, .planning/research/SUMMARY.md*
