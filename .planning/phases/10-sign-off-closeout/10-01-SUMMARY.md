---
phase: 10-sign-off-closeout
plan: "01"
subsystem: sign-off
tags: [record-close, reconciliation, UAT-runbooks, verify-platform, gui04-registry-shape]

# Dependency graph
requires:
  - phase: 09-extensions-crash-pipeline
    provides: [live proofs for EXT-02/EXT-03/TEL-04/BLD-02/UPD-04 plus staged-with-unblock precedent]
  - phase: 08-installer-hardening-canonical-rename
    provides: [release build plus release-variant rows green, ledger 10 closed, MAR hop plus NSIS-on-Nix proofs]
provides:
  - GUI-04 record-close box with live gate re-run on the current tree
  - MIG-01, MIG-02, GEN-01 credit, GEN-03 credit, TEL-03 derivation record-close boxes with delta re-runs
  - 16-vs-15 count-reconciliation paragraph with three pointer lines
  - GUI-01/GUI-03 prior-evidence freshness check
affects: [10-02 live drills, 10-03 gates-green sweep]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 0
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [record-close box with cited evidence, staged-with-unblock runbook]

key-files:
  created: [.planning/phases/10-sign-off-closeout/10-01-SUMMARY.md, .planning/phases/10-sign-off-closeout/10-UAT.md]
  modified: []

key-decisions:
  - "Credit-don't-reprove: halves Phases 08/09 proved live close on record with evidence cited; only still-staged halves run"

requirements-completed: [MIG-01, MIG-02, GUI-04, GEN-01, GEN-03, TEL-03]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "GUI-04 record-close box with tracked archive pointers plus row ids plus dates plus live re-run outcome"
    requirement: "GUI-04"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only gui04-registry-shape#PASS 5 exported names, 4 public members"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only gui04-registry-shape-self-test#PASS 4 planted faults all went red"
        status: pass
    human_judgment: false
  - id: D2
    description: "MIG-01, MIG-02, GEN-01 credit, GEN-03 credit, TEL-03 derivation record-close boxes with archive cites plus delta re-runs"
    requirement: "MIG-01"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only scan-brand-residue#PASS no residual brand occurrence in 150 scanned files"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only branding-preflight#PASS every hand-written branding literal equals the inventory target"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only generate-check#PASS all 53 generated files match configuration.toml"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only generated-byte-identity#PASS 34 generated files byte-identical, generated/ untracked"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only installer-schema#PASS every installer fragment present and schema-complete"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only allowlist-schema#PASS 24 hosts, 28 prefs"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only allowlist-doc-consistency#PASS 3 Mozilla allow hosts documented in ROADMAP.md and REQUIREMENTS.md"
        status: pass
    human_judgment: false

# Metrics
duration: 0min
completed: 2026-09-05
status: complete
---

# Phase 10 Plan 01: Record-Close Tracer Summary

**Six record-close boxes with cited evidence plus the 16-vs-15 reconciliation plus five staged UAT sheets, --quick green**

## Performance

- **Duration:** see final task commit
- **Started:** 2026-09-05T17:58:08Z
- **Completed:** 2026-09-05
- **Tasks:** 3 of 3
- **Files modified:** 2

## Accomplishments
- GUI-04 record-close box complete with archive pointers, row ids, dates, and live re-run outcome on the current tree
- Five further boxes (MIG-01, MIG-02, GEN-01 credit, GEN-03 credit, TEL-03 derivation) each with archive pointers plus row ids plus dates plus live delta outcomes
- 16-vs-15 reconciliation recorded with three pointer lines, enumeration declared source of truth
- Five staged human UAT sheets (GUI-01, GUI-03, GEN-02, GEN-05, DOC-01) with exact runbooks, result pending, source human, no executor-filled signature
- `verify-platform.sh --quick` green on the final tree with no sibling driver created

## Record-Close Boxes

### GUI-04 — Bridge-landability statement (record-close, no new proof)

- **Requirement:** GUI-04 — nothing in v1 welds Theia to full-window presentation; the future unified tab strip remains landable without rework.
- **Disposition:** record-close. The deliverable is a landability *statement* citing the green gate, not a new proof (10-RESEARCH.md:258-264).
- **Prior evidence (tracked archives):**
  - v1.0 outcomes table: `.planning/milestones/v1.0-REQUIREMENTS.md:20` — `GUI-04 | 1 | Open | Registry-shape assertion green; landability statement staged for audit`.
  - Gate source: `scripts/verify-registry-shape.mjs` (tracked) — actual surface DERIVED from the module's own TypeScript sources at check time and compared to the declared bridge contract as SET EQUALITY (`EXPECTED`: `tab-uri-registry.ts` exports `TabUriRegistry`; `view-factory-table.ts` exports `ViewFactoryTableRow`, `POWERBROWSER_VIEW_FACTORY_IDS`, `SETTINGS_WIDGET_FACTORY_ID`, `PLUGIN_VIEW_CONTAINER_FACTORY_ID`; `EXPECTED_MEMBERS`: `getViewContribution`, `parseName`, `createWidgetOptions`, `uriOf`); `--self-test` plants an addition and a removal in both directions.
  - Registry row region: `scripts/verify-platform.sh` `gui04-registry-shape` pair (comment block plus two rows), registered as honestly `--quick` (no build, no browser, no display, no network).
  - Registry sources (all tracked): `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` (header declares the exported shape the public interface `@powerbrowser/browser-bridge` consumes post-4.0), `theia/extensions/tab-uris/src/browser/view-factory-table.ts`.
  - v1.1 standing: `09-VERIFICATION.md` hard-rule compliance section (lines 159-167) re-affirms bridge-safe with no Theia presentation welding; no phase touched the registry contract since.
- **Live re-run on the current tree (2026-09-05, this session):**
  - `scripts/verify-platform.sh --only gui04-registry-shape` — PASS (`5 exported names across 2 modules and 4 TabUriRegistry public members match the declared bridge contract`; no surplus, no shortfall member named).
  - `scripts/verify-platform.sh --only gui04-registry-shape-self-test` — PASS (4 planted faults all went red naming `PLANTED_BRIDGE_LEAK`, `SETTINGS_WIDGET_FACTORY_ID`, `plantedBridgeMethod`, `uriOf`).
- **Outcome:** GUI-04 closes on record. The exported shape matches the declared bridge contract on the current tree and the gate discriminates in both directions.

## Remaining Boxes (STAGED — Task 2 owns them)

STAGED: MIG-01, MIG-02, GEN-01 credit half, GEN-03 credit half, TEL-03 derivation half, plus the 16-vs-15 count-reconciliation paragraph and the GUI-01/GUI-03 prior-evidence freshness check. Not gaps — explicitly routed to Task 2 by 10-01-PLAN.md.

## Task 2 Boxes

### MIG-01 — Platform migration proof (record-close, credit)

- **Requirement:** MIG-01 — platform code migrated from the sourcerer tree with `upstream/` re-fetched via script (never copied) and no objdirs copied.
- **Disposition:** record-close (credit). No new drill: the migration is a one-time historical fact, proven at the time and guarded since.
- **Prior evidence (tracked archives):**
  - v1.0 outcomes table: `.planning/milestones/v1.0-REQUIREMENTS.md:13` — `MIG-01 | 1 | Open | Tree migrated; upstream/ re-fetch via script proven, no copied objdirs — formal sign-off staged with tier-3 drills`.
  - Migration proof half: `01-UAT.md` tests 14–18 (all `result: pass`, 2026-09-01): test 14 platform-tree import commit (no `upstream/`, no objdir, no sourcerer remote), test 15 brand-token inventory classification, test 16 residual scan demonstrably red by reconciled counts, test 17 rename-script guards, test 18 chrome:// coupled-chain rename.
  - Tier-3 drill half: `01-UAT.md` tests 29–37 (all `result: pass`, 2026-09-01): test 29 patch blob-hash chain, test 30 `upstream/` script-materialized at the pinned tag, test 31 four-way coupling, test 32 no patch on a compiled Gecko path, test 33 sidecar healthy under renamed scope, test 34 backend auth gate fail-closed, test 35 branded application builds and boots (MIG-04), test 36 six branding surfaces, test 37 no unattended callout off the allowlist.
  - Re-fetch history standing: `08-VERIFICATION.md` backstop 08-01 P3 (verified 2026-09-05T12:00:00Z) — `git -C upstream diff HEAD --name-only` equals exactly the patch-010/020 target set with `check-patch-surface.sh` PASS re-run; `upstream/` remains script-materialized, never hand-edited.
- **Live re-run on the current tree (2026-09-05, this session):** none required beyond the commit gate — the credit policy forbids re-proving the migration; the `scan-brand-residue` row re-run under MIG-02 (PASS, 150 files) confirms the renamed tree still holds.
- **Outcome:** MIG-01 closes on record.

### MIG-02 — Token-inventory audit (record-close, audit pass)

- **Requirement:** MIG-02 — a committed token-classification inventory exists before any rename is executed.
- **Disposition:** record-close (audit pass). The box holds for audit: the classification is committed and the reconciling gate is green.
- **Prior evidence (tracked archives):**
  - v1.0 outcomes table: `.planning/milestones/v1.0-REQUIREMENTS.md:14` — `MIG-02 | 1 | Open | Token inventory committed and reconciled; carried as process evidence, box left for audit pass`.
  - Classification: `inventory/brand-tokens.json` (tracked) — per-site classification with `only_in` rows plus the hand-authored `brand_display_expectations` block (`dev` `PowerBrowser Dev`, `release` `PowerBrowser`); the only tree file permitted to name the originating product.
  - Canonical display name: `configuration.toml` `[identity]` `display_name = "PowerBrowser"` — the single-token form re-pinned by 08-01/08-02 (`08-VERIFICATION.md` truths #3–#8, verified 2026-09-05T12:00:00Z).
  - Audit halves: `01-UAT.md` tests 12–13 plus 15–16 (all `result: pass`, 2026-09-01): tests 12–13 historical Sourcerer citations verbatim plus frozen/coincidental rows untouched; tests 15–16 inventory classification plus reconciled red scan.
- **Live re-run on the current tree (2026-09-05, this session):**
  - `scripts/verify-platform.sh --only scan-brand-residue` — PASS (no residual brand occurrence in 150 scanned files).
  - `scripts/verify-platform.sh --only branding-preflight` — PASS (every hand-written branding literal equals the inventory's declared target).
- **Outcome:** MIG-02 closes on record.

### GEN-01 — Release-variant half credited to BLD-01, emitter deltas re-proven (credit + delta)

- **Requirement:** GEN-01 — a single generator script materializes the complete Firefox branding directory plus `.mozconfig`, desktop files, and `generated/identity.configure` from `configuration.toml`.
- **Disposition:** credit + delta. The release-variant half is CREDITED to BLD-01; only emitter deltas since v1.0 are re-proven here.
- **Prior evidence (tracked archives):**
  - v1.0 outcomes table: `.planning/milestones/v1.0-REQUIREMENTS.md:27` — `GEN-01 | 3 | Open | Emitter + carrier + tier-3 dev build green; release-variant half staged`.
  - Credit half: `08-VERIFICATION.md` truth #19 (verified 2026-09-05T12:00:00Z) — release `objdir-release` build passes with release-variant rows green (`branding-variant-divergence` PASS re-run on the current tree; six-surface release identity PASS with `brandFullName` `PowerBrowser`); WINDOWS.md ledger item 10 reads `fixed`.
  - Emitter half standing: `08-VERIFICATION.md` truths #3–#4 — `configuration.toml:38` carries `display_name = "PowerBrowser"` with `generate --check` 52 files PASS at that time.
- **Delta re-run on the current tree (2026-09-05, this session):**
  - `scripts/verify-platform.sh --only generate-check` — PASS (all 53 generated files match `configuration.toml`; 53 vs the 08-cited 52 is the 09-03 `webextensions-settings.json` TARGETS row, a tracked addition, not drift).
  - `scripts/verify-platform.sh --only generated-byte-identity` — PASS (34 generated files byte-identical to their hand-written counterparts, `generated/` untracked).
- **Outcome:** GEN-01 release-variant half credited; emitter delta re-proven on the current tree.

### GEN-03 — Host-build half credited to PKG-01, schema deltas re-proven (credit + delta)

- **Requirement:** GEN-03 — the generator emits installer branding for Linux, Windows (NSIS/MSIX fields), and macOS (DMG/.icns fields) from `configuration.toml`.
- **Disposition:** credit + delta. The Windows/macOS host-build half is CREDITED to PKG-01; only schema deltas are re-proven here.
- **Prior evidence (tracked archives):**
  - v1.0 outcomes table: `.planning/milestones/v1.0-REQUIREMENTS.md:29` — `GEN-03 | 3 | Open | 8 fragments schema-complete + Linux build-verified; Windows/macOS host builds are v2 PKG-01 by requirement text`.
  - Credit half: `08-VERIFICATION.md` truth #14 (verified 2026-09-05T12:00:00Z) — makensis 3.12 on Nix compiles the upstream installer script with generated branding (`installer-build-proof` PASS re-run); Windows MSIX / macOS DMG cells are plan-sanctioned staged-unexecuted with operator unblocks (staged truths #16–#18, explicitly not gaps), so there is no staged half for Phase 10 to run.
  - Schema half standing: `08-VERIFICATION.md` truth #2 — the installer verifier checks a fixture-manifest root via `readTileColor(root)`, never the live tree.
- **Delta re-run on the current tree (2026-09-05, this session):**
  - `scripts/verify-platform.sh --only installer-schema` — PASS (every installer fragment present and schema-complete).
- **Outcome:** GEN-03 host-build half credited; schema delta re-proven on the current tree.

### TEL-03 — Allowlist derivation half (record-close + live layer split)

- **Requirement:** TEL-03 — telemetry/URL hosts flow into the generated endpoint allowlist; Mozilla telemetry/crash endpoints repointed or disabled per the manifest.
- **Disposition:** record-close for the derivation half (this plan); the installed-binary layer (`verify-endpoints` on the built binary) is a 10-02 live drill, not re-proven here.
- **Prior evidence (tracked archives):**
  - v1.0 outcomes table: `.planning/milestones/v1.0-REQUIREMENTS.md:34` — `TEL-03 | 4 | Open | Allowlist derivation + Mozilla pref repointing green; installed-binary layer staged`.
  - Derivation standing: `allowlist-schema` + `allowlist-doc-consistency` registry rows (both `--quick`-honest, no build, no browser, no display); the three Mozilla `allow` hosts (Remote Settings, content-signature chain, attachments CDN) carry documented reasons in REQUIREMENTS.md and ROADMAP.md, which the consistency gate asserts.
- **Delta re-run on the current tree (2026-09-05, this session):**
  - `scripts/verify-platform.sh --only allowlist-schema` — PASS (24 hosts, 28 prefs, both arrays well-formed).
  - `scripts/verify-platform.sh --only allowlist-doc-consistency` — PASS (3 Mozilla allow hosts checked, found in both ROADMAP.md and REQUIREMENTS.md).
- **Outcome:** TEL-03 derivation half closes on record; the installed-binary layer stays routed to the 10-02 live drill.

## Count Reconciliation (16-vs-15)

The v1.0 archive says "16" in two places, but every enumeration it carries counts 15:

1. The v1.0 outcomes table (`.planning/milestones/v1.0-REQUIREMENTS.md:13-41`) enumerates exactly 15 `Open` rows: MIG-01, MIG-02, GUI-01, GUI-03, GUI-04, GEN-01, GEN-02, GEN-03, GEN-05, EXT-01, TEL-01, TEL-02, TEL-03, VER-01, DOC-01. Counted, not estimated: 2 MIG + 3 GUI + 4 GEN + 1 EXT + 3 TEL + 1 VER + 1 DOC = 15.
2. The closeout line (`.planning/milestones/v1.0-ROADMAP.md:7` — "16/31 requirements unchecked") and the STATE.md snapshot (`.planning/STATE.md:313` — "16 unchecked requirements (GEN-01/02/03/05, TEL-01..03, EXT-01, VER-01, DOC-01, MIG-01/02, GUI-01/03/04)") both say 16, yet the STATE.md parenthetical itself enumerates only 15 IDs: GEN-01/02/03/05 (4) + TEL-01..03 (3) + EXT-01 (1) + VER-01 (1) + DOC-01 (1) + MIG-01/02 (2) + GUI-01/03/04 (3) = 15.
3. The enumeration is the source of truth per the credit-policy line (`.planning/REQUIREMENTS.md:12` — "the v1.0 archive says 16; enumeration is the source of truth — Phase 10 reconciles the count"). The three v1.0 `Complete (static)` rows — UPD-01, UPD-02 (`.planning/milestones/v1.0-REQUIREMENTS.md:37-38`), VER-03 (`:43`) — were all closed live by v1.1 (rebase drill per STATE.md:311, re-pin proof per STATE.md:312, tier-3 per-fixture builds per STATE.md:310) and are never re-counted as a 16th item.

**Reconciliation:** the "16" label overcounts its own 15-item enumeration by one. The 15-item enumeration is the source of truth. No investigation, no renumbering — this paragraph is the record.

## GUI-01/GUI-03 Prior-Evidence Freshness Check

The 2026-09-01 01-UAT human passes for GUI-01 (test 2) and GUI-03 (test 6) remain valid prior evidence:

- `git log --since=2026-09-01 -- theia/extensions/tab-uris/src/browser/browser-window-command.ts powerbrowser/shell/PowerBrowserAPI.sys.mjs` — empty. The GUI-01 affordance source (`OPEN_BROWSER_WINDOW_COMMAND_ID`, `window.open(url,'_blank')` channel) and every boundary browser-window row are untouched since the human pass.
- `git log --since=2026-09-01 -- theia/extensions/customize/` — empty. The customize-bridge sources (CSS contribution, privileged-JS contribution, frontend module) are untouched since the human pass.
- `git log --since=2026-09-01 -- powerbrowser/shell/` names exactly two commits, `bb92d6e` (08-01 canonical rename) and `00378c0` (01-19 shell title-bar display form), each touching only `powerbrowser/shell/powerbrowser.xhtml` (2-line display literals). Neither the 5-step window-toggle walkthrough nor the 3-step restyle walkthrough depends on the shell title literal.
- WINDOWS.md ledger items 15 (GUI-01 five steps) and 16 (GUI-03 three steps) read `fixed` with the 2026-09-01 human record as the closing evidence.

**Freshness verdict:** no GUI-01/GUI-03 functional surface changed since 2026-09-01; the prior evidence stands and is cited inside the Task 3 sheets, never as a signature.

## Task Commits

1. **Task 1: End-to-end record-close slice — GUI-04 landability box** - `36c5031` (docs)
2. **Task 2: Remaining record-close boxes plus count reconciliation** - `8377903` (docs)
3. **Task 3: Five staged human UAT runbook sheets** - `e4d7bb5` (docs)

## Files Created/Modified
- `.planning/phases/10-sign-off-closeout/10-01-SUMMARY.md` - six record-close boxes plus reconciliation plus freshness check (this file)
- `.planning/phases/10-sign-off-closeout/10-UAT.md` - five staged human UAT runbook sheets with automatable-half outcomes

## Decisions Made
- Credit-don't-reprove: the tracer re-runs only the gui04 rows live and cites the archives for the rest; no tier-3 rebuild, no re-proof of what 08/09 proved.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Tracer routing proven; Task 2 replicates the box pattern to the five remaining boxes plus reconciliation.

## Self-Check: PASSED

- Files: 10-UAT.md FOUND, 10-01-SUMMARY.md FOUND
- Commits: 36c5031, 8377903, e4d7bb5 all FOUND in git log
- Verifies: gui04 pair, seven record-close delta rows, seven automatable-half rows, sheet-shape counts (coverage_id 5, result pending 5, STAGED-awaiting-signature 5), --quick green — all observed PASS this session

---
*Phase: 10-sign-off-closeout*
*Completed: 2026-09-05*
