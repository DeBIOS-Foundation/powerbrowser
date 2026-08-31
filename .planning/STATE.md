---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_phase_name: platform-extraction-and-rename
status: executing
stopped_at: Completed 01-13-PLAN.md
last_updated: "2026-08-31T21:53:07.049Z"
last_activity: 2026-08-31
last_activity_desc: Completed plan 01-13 (gap closure — user-driven Retry gate)
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 13
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-29)

**Core value:** A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo, and build their own branded, working web browser without touching any other file — then reshape its GUI through Theia extensions without forking the platform.
**Current focus:** Phase 01 — platform-extraction-and-rename

## Current Position

Phase: 01 (platform-extraction-and-rename) — EXECUTING
Plan: 13 of 13
Status: All plans executed — ready for phase verification
Last activity: 2026-08-31 — Completed plan 01-13 (gap closure — user-driven Retry gate)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 35min | 2 tasks | 116 files |
| Phase 01 P02 | 2h25m | 2 tasks | 61 files |
| Phase 01 P03 | ~18m | 3 tasks | 45 files |
| Phase 01 P04 | ~2h15m | 3 tasks | 5 files |
| Phase 01 P05 | 50m | 3 tasks | 13 files |
| Phase 01 P07 | 2h10m | 3 tasks | 12 files |
| Phase 01 P08 | ~25min | 3 tasks | 7 files |
| Phase 01 P09 | ~1h05m | 2 tasks | 3 files |
| Phase 01 P10 | ~40m | 3 tasks | 6 files |
| Phase 01 P11 | ~35min | 2 tasks | 6 files |
| Phase 01 P12 | ~30min | 3 tasks | 5 files |
| Phase 01 P13 | 15min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 1 ships with no generator — hand-written branding literals — so Phase 2's acceptance test is byte-identical generated output
- [Roadmap]: GUI requirements (GUI-01..04) fold into Phase 1; the customize bridge and browser toggle already exist in sourcerer, so their v1 requirement is surviving the migration as platform features
- [Roadmap]: Telemetry, extensions, and Theia branding consolidate into one Theia-surface phase (Phase 4) rather than three thin phases
- [Research]: `[telemetry] send-to-theia` replaced by Theia's real enum (off/crash/error/all) + endpoint — Theia ships no destination, Power Browser implements the only one
- [Research]: Identity/legal keys hard-fail with no code-level default; cosmetic keys default with a visible echo
- [Phase ?]: Inventory format is JSON (D-15 left it open) — zero dependencies, both consumers are Node
- [Phase ?]: The 01-01 tracer renames CONTENT only; every file/directory git mv stays in plan 01-02 per D-06
- [Phase ?]: MOZ_APP_BASENAME takes the one-word lowercase identifier 'powerbrowser' (D-10), so --with-app-basename and verify-branding-identity.mjs's application.ini expectation are class 'identity' and move together
- [Phase ?]: Per-site token classification uses file-scoped 'only_in' rows with context-anchored tokens in preference to line-pinned site_overrides
- [Phase ?]: Reconciliation condition 4 and the ground-truth check both use detectors independent of the boundary matcher, so the scan cannot pass by agreeing with itself (T-01-04)
- [Phase ?]: The D-18 gate excepts hand-write SITES not a class — the outstanding set spans brand-display (Pitfall 1) and brand-identifier (Pitfall 4), so no class exception can express the 01-03 hand-off
- [Phase ?]: The npm scope is one indivisible contract group — yarn install proved customize/package.json cannot be staged apart from its sibling dependency
- [Phase ?]: theia/yarn.lock needs no regeneration: yarn v1 never records workspace-local packages in the lock
- [Phase ?]: 01-03: D-18 gate carve-out dropped — bare scan-brand-residue exits 0, so --except-hand-write excepts nothing and is removed from both call sites
- [Phase ?]: 01-03: verify-branding-preflight.mjs derives expectations from a new inventory brand_display_expectations block, not from verify-branding-identity.mjs — the rename had written PowerBrowser Dev into that verifier's own expectation
- [Phase ?]: 01-03: the pre-rename census stays HISTORICAL, not rewritten — an all-zeros post-rename census is a vacuous duplicate of the plain gate and destroys the red-scan evidence
- [Phase ?]: 01-03: four per-phase drivers consolidated into scripts/verify-platform.sh; 45 labels ported with parity asserted programmatically before git rm
- [Phase ?]: 01-03: placeholder mark is the IEC 60417-5009 power glyph — a standard symbol, so non-derivation is answerable rather than a matter of opinion
- [Phase ?]: 01-04: patch chain proof runs against a blob-PRUNED pristine upstream/, not a second 5.6 GB clone -- git apply --3way writes its own post-image blob, so an unpruned re-test passes vacuously
- [Phase ?]: 01-04: theia/yarn.lock needs no regeneration -- yarn v1 records no workspace-local package, so the @powerbrowser scope rename left it byte-identical
- [Phase ?]: 01-04: MIG-04 closed on artifact evidence (smoke-firefox + smoke-theia PASS, six identity surfaces green with the runtime-identity positive control), not on plan frontmatter
- [Phase ?]: GUI-01 ratified land-as-spiked: startup-window selection lives in the command-line handler; BROWSER_CHROME_URL keeps its stock upstream value
- [Phase ?]: GUI-01 frontend-to-chrome channel is candidate A (window.open from the Theia command handler); the JSWindowActor fallback was not taken
- [Phase ?]: User-facing error copy lives in one derivable USER_MESSAGE table; nine failure paths collapse onto four sentences because their distinctions are diagnostic, not actionable
- [Phase ?]: Diagnostics rows and the POWERBROWSER_ERROR_DIAGNOSTICS sentinel read one getFailureDetails() accessor, so the rendered surface and the machine-readable line cannot disagree
- [Phase ?]: The two objdir-release checks are named --gate exclusions keyed on ledger entry 10 rather than deleted or narrowed
- [Phase ?]: smoke-theia.sh is a registry row: the consolidated verifier is now a true superset of the validation strategy's full-suite command
- [Phase ?]: 01-08: the residual-brand gate's non-zero exit is single-sourced through gateFailures(); reconciliation failures now fail the un-flagged run every registered call site invokes
- [Phase ?]: 01-08: condition 4's unclaimed-probe walk moved above reconcile()'s post-rename early return -- a defence unreachable in the state it guards is not a defence
- [Phase ?]: 01-08: the -PLAN.md provenance count moved 21->28 by ADDITION only (+2 driver consolidation, +5 INTERNAL-APIS.md catalogue rows); the six Sourcerer-era citations are byte-identical to the census-era set
- [Phase ?]: 01-08: the preflight's display-surface set is DERIVED by walking the branding extension's browser directory at check time; a zero-file walk is its own failure, not a clean run
- [Phase ?]: 01-08: verify-branding.mjs applies one shared assertDisplayForm() to both display surfaces, reading its expected values from the inventory rather than hard-coding them
- [Phase ?]: 01-08: ledger items 15 and 16 stay OPEN -- no human was present, and no automated proxy was written for either perceptual walkthrough
- [Phase ?]: 01-09: the one-time initialisation block and _restart()'s port choice are keyed on this._swapped -- the field _swap()'s own guard reads -- so 'port pinned' and 'spawn completed' stop being one condition
- [Phase ?]: 01-09: _spawnAndGate's parameter renamed firstSpawn -> beforeFirstSwap; keeping the old name while changing its meaning would re-encode the conflation in a name
- [Phase ?]: 01-09: D-104's pinned-port respawn invariant preserved only after a completed swap -- before one, nothing is loaded at that origin, so re-pinning had no beneficiary and a real D-112 cost
- [Phase ?]: 01-09: MIG-04 NOT marked complete -- the error-affordance half of the same gap is plan 01-10, and 034f857 already reverted one premature Complete
- [Phase ?]: 01-10: one public terminal handler (reportUnexpectedFailure) with four attachment points -- four promise roots have no shared root to guard, but there is exactly one place the outcome is decided
- [Phase ?]: 01-10: the two long-lived supervisor loops were attached too, a strict superset of the gap's missing: list -- same defect class, and leaving them would keep the bug alive on the path a mid-session outage takes
- [Phase ?]: 01-10: no USER_MESSAGE entry minted (4 before, 4 after) -- declared/referenced equality means a new key must be referenced, which for a generic backstop means inventing a distinction the user cannot act on
- [Phase ?]: 01-10: the leftover-reap site is guarded but deliberately NON-FATAL, a reasoned deviation from missing: item 3 -- failing a launch over a previous launch's stale pid would turn a cosmetic cleanup miss into the dead screen the guard exists to prevent
- [Phase ?]: 01-10: the session-cookie catch RETURNS before the navigation, so a launch whose credential was never minted never reaches the backend origin (T-01-08)
- [Phase ?]: 01-10: the terminal-handler coverage rule derives both sets from the tree (async declarations; bootstrap calls under the derived binding name) and treats an empty derivation as its own failure -- a rule with no call sites asserts nothing
- [Phase ?]: 01-11: the error-state clear lives in retry(), not _restart() -- _restart() is also the recovery probe's re-entry point and _hideError() stops that probe, so clearing there would tear down the loop calling it
- [Phase ?]: 01-11: the analyzer EVALUATES both shipped files (ChromeUtils-faked import + node:vm sandbox that is its own window) rather than re-implementing either; the drive is the bootstrap's own DOMContentLoaded handler
- [Phase ?]: 01-11: deriveErrorLayerBinding tries the SHOW global before the HIDE global -- deriving only from hide made the plan's own removal-side fault a derivation dead-end instead of a set-equality red
- [Phase ?]: 01-11: WINDOWS.md ledger item 15 stays OPEN -- a Node-level contract check over shipped source is not a human clicking Retry in a real window
- [Phase ?]: The recovery-probe gate is the recoverable flag _showError already receives, not a new sidecar-resolved boolean: a second source of truth for one fact is the defect's shape, not its fix
- [Phase ?]: A two-directional gate needs a registered positive control with its own planted fault, or 'stop doing X everywhere' passes the negative half
- [Phase ?]: Probe instrumentation is causal (spawns after the code-under-test's own error sentinel), not temporal: an immediately-resolving fake sleep makes the probe a pure microtask loop the harness cannot interleave with
- [Phase ?]: Refusal lives in TheiaService.retry(), not in the DOM — powerbrowserRetry() is a window global any chrome-privileged caller can invoke, so a rendered state is presentation and never authority
- [Phase ?]: The retry guard returns before _hideError(), so a refused click cannot null _failureDetails and erase the rows that identified the failure
- [Phase ?]: two-consecutive-failing-retries-repaint retargeted onto the recoverable class rather than retired; the unrecoverable class moved to the new scenario, and the two assert the gate in both directions
- [Phase ?]: Minted USER_MESSAGE.couldNotStartUnrecoverable where 01-10 declined to mint a key: here the distinction IS the action, because one screen offers Retry and the other does not
- [Phase ?]: POWERBROWSER_DECK_STATE gained no key for the Retry control's visibility — the named place a future tier-3 launch-level check would add one, rather than scaffolding for a check nobody is writing

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Rename blast radius — ~1,090 occurrences, 5 case forms, 6 coupled reference formats. Needs phase research + plan-review-convergence.
- [Phase 3]: `--with-branding` into a sibling `generated/` dir via symlink is architecturally sound but never executed. Also open: whether the generated-`.mozconfig` route works with `imply_option("MOZ_APP_VENDOR", ...)` dropped from the patch.
- [Phase 4]: `theia download:plugins` / Open VSX pin semantics unexercised in this tree; hash-verifiable pins unknown.
- [Phase 6]: Mozilla and Eclipse trademark findings are LOW-confidence web-sourced; re-verify against primary policy before gating.
- ~~[Spelling]~~ Resolved 2026-08-29: user confirmed "Sourcerer"; REQUIREMENTS.md and PROJECT.md normalized.
- MIG-04 is NOT complete: nothing has been built (objdir/ absent). 01-03 delivered its prerequisites only; plan 01-04 owns the build. Nine verify-platform.sh checks become runnable at that point.
- Phase 1's two manual verifications (GUI-01 browser-window toggle, 5 steps; GUI-03 visible runtime restyle, 3 steps) are UNPERFORMED -- 01-07 ran autonomously with no human. Recorded as open WINDOWS.md ledger entries.
- WINDOWS.md 18's named residual: no registered check drives a rejection out of either long-lived supervisor loop, so those two terminal handlers rest on the source-derived coverage rule rather than on a runtime red

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-31T21:52:35.714Z
Stopped at: Completed 01-13-PLAN.md
Resume file: None
