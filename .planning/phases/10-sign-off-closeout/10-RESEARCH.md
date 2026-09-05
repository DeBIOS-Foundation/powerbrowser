# Phase 10: Sign-off Closeout - Research

**Researched:** 2026-09-05
**Domain:** Formal sign-off closeout — record-close on prior live evidence + staged live drills and human UAT runbooks
**Confidence:** HIGH (all claims grounded in tree files read this session; --quick re-run green live)

## Summary

Phase 10 closes formal sign-off on the 15 carried v1 requirement IDs (MIG-01, MIG-02, GUI-01, GUI-03, GUI-04, GEN-01, GEN-02, GEN-03, GEN-05, EXT-01, TEL-01, TEL-02, TEL-03, VER-01, DOC-01). No new product code is expected: every requirement's implementation already exists and is statically green. The phase's work is (a) record-close boxes that cite prior live evidence from the v1.0 archive (Phases 1–7) and v1.1 archive (Phases 08–09), (b) live drills for the halves that are still staged (TEL-01, TEL-02, EXT-01, VER-01, plus delta re-proofs for GEN-01/GEN-03), and (c) human UAT sheets (GUI-01 5 steps, GUI-03 3 steps, GEN-02 icon pixel, GEN-05 render, DOC-01 carry-test) recorded as staged runbooks with exact commands under autonomous nonstop mode — not performed.

The single most load-bearing finding: the "16 vs 15" count discrepancy is self-contained in the project's own records. The v1.0 outcomes table enumerates exactly 15 `Open` rows [VERIFIED: .planning/milestones/v1.0-REQUIREMENTS.md:13-41], while the v1.0-ROADMAP closeout line and the STATE.md snapshot both say "16" yet the STATE.md parenthetical itself enumerates only 15 IDs [VERIFIED: .planning/STATE.md:313]. The reconciliation is therefore a one-paragraph record-close (the "16" label overcounts by one against its own enumeration; the 15-item enumeration is source of truth per REQUIREMENTS.md:12), not an investigation. The three v1.0 "Complete (static)" rows with staged live halves (UPD-01, UPD-02, VER-03) [VERIFIED: .planning/milestones/v1.0-REQUIREMENTS.md:37-38,43] were all closed live by v1.1 and must not be re-counted as a 16th item.

Second finding: the environment is unusually favorable for live drills. Both `objdir/` and `objdir-release/` contain built binaries [VERIFIED: bash probe 2026-09-05 — `objdir/dist/bin/powerbrowser` and `objdir-release/dist/bin/powerbrowser` both present], `theia/node_modules` is installed, `upstream/` is materialized, `.mozbuild/` holds the 08/09 tier-3 evidence logs (mar-hop, matrix, rebase-drill, release-build logs), and `scripts/verify-platform.sh --quick` was re-run green this session (all rows PASS). So VER-01's fixture tier (blocked in v1.0 for want of BLD-02, now proven by 09-04), TEL-03's installed-binary layer, and the sidecar-based drills (TEL-01, TEL-02, EXT-01) have no missing prerequisites on this tree — only a display and the Nix theia shell stand between the plan and green runs.

**Primary recommendation:** Three plans, tracer-first — (1) record-close + count reconciliation + UAT runbooks first, (2) live drills against the already-built tree, (3) final gates-green sweep with --quick and --only rows.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Credit policy: halves that Phases 08/09 proved live close on record with evidence cited; only the still-staged halves run.
- Success criteria: human UAT sheets signed (GUI-01 5 steps, GUI-03 3 steps, GEN-02 icon pixel, GEN-05 Theia render, DOC-01 stranger carry-test); live drills green (TEL-01, TEL-02, EXT-01, VER-01); record-close boxes cite prior live evidence (MIG-01, MIG-02, GEN-01, GEN-03, GUI-04, TEL-03); count reconciliation recorded (v1.0 archive "16" vs 15-item enumeration); verify-platform.sh --quick green with no sibling driver.
- Standing autonomous instructions (STATE.md): nonstop by default — verification deferred until roadmap fully executed; plan-phase runs with --no-reversibility-gates; milestone audit gaps/tech debt accepted; cleanup dry-run approved if phase scratch only; halt only on blocker surviving 3 fix-and-retry attempts.

### Claude's Discretion

All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)

None — discuss phase skipped.

## Phase Requirements

| ID | Disposition | Research Support |
|----|-------------|------------------|
| MIG-01 | record-close (credit) | 01-UAT tests 14–18, 29–37 all pass; upstream/ re-fetch via script proven; no new drill |
| MIG-02 | record-close (audit pass) | inventory/brand-tokens.json committed + reconciled; scan-brand-residue green (re-run this session); 01-UAT tests 12–13, 15–16 pass |
| GUI-01 | human UAT sheet (staged runbook) | 5 steps in WINDOWS.md ledger item 15 + 01-UAT test 2 (passed 2026-09-01 by a human — reusable as prior evidence; formal box re-signs); automated halves gui01-* registry rows (full-tier, built binary present) |
| GUI-03 | human UAT sheet (staged runbook) | 3 steps in WINDOWS.md ledger item 16 + 01-UAT test 6 (passed 2026-09-01); automatable halves verify-customize-inert + verify-dev-flag-off (--quick, green) |
| GUI-04 | record-close (statement vs green gate) | gui04-registry-shape + self-test rows (--quick, green this session); TabUriRegistry sources tracked |
| GEN-01 | credit + delta re-proof | BLD-01 release build + release-variant rows green (08-05, ledger 10 closed); delta = generate --check + generated-byte-identity green on current tree |
| GEN-02 | human UAT sheet (staged runbook) | icon-ihdr + self-test rows green (static exactness); 03-UAT 1-scenario pixel look still pending-human |
| GEN-03 | credit + delta re-proof | PKG-01 NSIS-on-Nix proven live (08-04), MSIX/DMG staged with unblocks (08-05); delta = installer-schema gate green on current tree |
| GEN-05 | human UAT sheet (staged runbook) | theia-branding + theia-endpoints gates green; 04-UAT drill 2 (fixture rebrand + build + live render) still pending-human |
| EXT-01 | live drill (runnable) | extension-pins gate + 09-01 resolver chain green; 04-UAT drill 3 steps; sidecar build path proven by 09-04 (theia build direct over assembled set) |
| TEL-01 | live drill (runnable) | TELEMETRY_LEVELS `['off','crash','error','all']` in telemetry-sender.ts; telemetry gate green; drill = declaration → generated prefs on running sidecar |
| TEL-02 | live drill (runnable) | Sender unit suite green; crash-collector loopback round-trip independently re-proven by 09 verifier; 04-UAT drill 4 steps |
| TEL-03 | record-close + live layer | allowlist-schema + allowlist-doc-consistency rows green; derivation green statically; installed-binary layer = verify-endpoints on built binary (binary present) |
| VER-01 | live drill (now runnable) | verify-manifest-literals static layer green; full-fleet fixture tier runnable per BLD-02 (verify-downstream-fixtures --all green this session) |
| DOC-01 | human UAT sheet (staged runbook) | docs/REBRANDING.md (375 lines) + verify-rebranding-docs gate green; stranger carry-test steps recorded, not run |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Record-close evidence boxes | Planning docs (`.planning/phases/10-*/`) | — | Sign-off artifacts, no runtime owner; must cite file/commit pointers, not prose claims |
| UAT runbook sheets | Planning docs | Human operator | 5 human items cannot be automated (chrome-context Marionette platform-blocked on Linux, WINDOWS.md ledger item 7); runbooks must carry exact commands |
| Live sidecar drills (TEL-01/02, EXT-01) | Theia backend + generated prefs | verify-platform.sh rows | Drills exercise `theia/` build output and `generated/` prefs; gates assert the outcome |
| Fleet proof (VER-01) | verify-platform.sh fixture tier | scripts/verify-downstream-fixture.mjs | BLD-02 made the tier runnable; the drill is running it, not building it |
| Gates-green close | scripts/verify-platform.sh (single registry) | — | One driver, one registry (CLAUDE.md); any new check is a registry row with --self-test, never a sibling driver |

## Standard Stack

No new libraries, frameworks, or tooling. This phase uses only what the tree already has.

### Core (already in tree, reused as-is)

| Tool | Version (observed this session) | Purpose | Why Standard |
|---------|-------------------------------|---------|--------------|
| `scripts/verify-platform.sh` | registry with ~60 quick + ~40 full rows | Single verification driver; `--quick` commit gate, `--only <label>` per-drill sampling | CLAUDE.md hard rule: one driver, one registry; sibling drivers were deleted in 01-03 and must not come back |
| `node` | `v24.19.0` [VERIFIED: bash probe] | Runs all `--quick` gates and drills that don't need a build | Host-available outside Nix shell |
| Built binaries | `objdir/dist/bin/powerbrowser` + `objdir-release/dist/bin/powerbrowser` both present [VERIFIED: bash probe] | Targets for full-tier rows (gui01-*, verify-endpoints, branding-identity) | Rebuilds cost ~47–54 min (docs/BUILD.md attributed timings); existing binaries make re-proof cheap |
| `theia/node_modules` | installed [VERIFIED: bash probe] | Sidecar build prerequisite for EXT-01/TEL drills | Avoids a fresh `yarn install` inside drills |
| `upstream/` | materialized [VERIFIED: bash probe] | Prerequisite for apply-patches-self-test / rebase-adjacent checks | 5.6 GB re-fetch avoided |

### Supporting (per-drill gates, all tracked — verified present via `git ls-files scripts/`)

| Script | Registry label(s) | Serves |
|--------|-------------------|--------|
| `scripts/verify-registry-shape.mjs` | `gui04-registry-shape` (+ self-test) | GUI-04 record-close |
| `scripts/verify-telemetry.mjs` | `telemetry` (+ self-test) | TEL-01/TEL-02 static halves |
| `scripts/verify-extension-pins.mjs` | `extension-pins` (+ self-test) | EXT-01 static half |
| `scripts/verify-downstream-fixture.mjs` | `verify-downstream-fixtures` (+ self-test) | VER-01 live fleet proof |
| `scripts/verify-manifest-literals.mjs` | `verify-manifest-literals` (+ self-test) | VER-01 static layer |
| `scripts/verify-rebranding-docs.mjs` | `verify-rebranding-docs` (+ self-test) | DOC-01 completeness half |
| `scripts/verify-icon-ihdr.mjs` | `icon-ihdr` (+ self-test) | GEN-02 static half |
| `scripts/verify-installer-schema.mjs` | `installer-schema` (+ self-test) | GEN-03 delta re-proof |
| `scripts/verify-theia-branding.mjs`, `verify-theia-endpoints.mjs` | `theia-branding`, `theia-endpoints` (+ self-tests) | GEN-05 static half |
| `scripts/verify-gui01-window.mjs`, `verify-gui01-command.mjs` (+ shell fns) | `gui01-browser-close-does-not-quit`, `gui01-single-shell-window`, `gui01-command-registered` | GUI-01 automated halves |
| `scripts/verify-endpoints.sh` | `verify-endpoints` (+ interrupt self-test) | TEL-03 installed-binary layer |
| `scripts/verify-branding-identity.mjs` | `verify-branding-identity-dev`, `-release`, runtime controls | GEN-01/GEN-02 built-artifact halves |
| `scripts/crash-collector.mjs` | `crash-collector` (+ self-test) | TEL-02 delivery target (loopback) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Staged runbooks for human UAT | Block the phase on a human | Rejected: autonomous nonstop is the standing instruction; human steps record as staged with exact runbooks, matching 08-05/09-04 precedent |
| Re-running tier-3 builds | Cite 08/09 evidence on disk | Re-run only if tree deltas since 08/09 touch the surface; `.mozbuild/` logs (mar-hop, matrix, rebase-drill, release-build-0805) are the citable artifacts |
| New closeout check scripts | Registry rows only | Any genuinely new assertion must land as a registry row with `--self-test` per CLAUDE.md; prefer `--only` runs of existing rows |

**Installation:** None. No packages installed by this phase.

**Version verification:** Not applicable — no new packages. (`better-sqlite3@13.0.3` belongs to Phase 12 scope, not this phase.)

## Package Legitimacy Audit

No external packages are installed or recommended by this phase. All work uses scripts and binaries already in the tree. Audit table intentionally empty — there is nothing to approve, flag, or remove.

**Packages removed due to SLOP verdict:** none (no packages evaluated).
**Packages flagged as suspicious SUS:** none.

## Architecture Patterns

### System Architecture Diagram

Phase 10 has no runtime data flow — it is an evidence-closure phase. Its "architecture" is the evidence chain:

```
v1.0 archive (Phases 1-7)          v1.1 archive (Phases 08-09)          Phase 10 (this phase)
 UNIT: static gates green            UNIT: static gates green            RECORD-CLOSE: cite both,
   |  human/tier-3 halves staged       |  live proofs on disk              only staged halves run
   v                                   v                                   v
MIG-01/02, GUI-01/03/04,           BLD-01 (release), BLD-02 (fixtures),  10-01 record-close boxes
GEN-01/02/03/05, EXT-01,           UPD-03 (rebase drill), UPD-04         10-02 live drills
TEL-01/02/03, VER-01, DOC-01       (re-pin), PKG-01/02/03, NAME-01  -->  10-03 gates-green sweep
   (01-UAT/04-UAT/03-UAT/                                   |
    06-UAT sheets +                                        v
    WINDOWS ledger 15/16)                          .mozbuild/ logs +
                                                   08/09-VERIFICATION.md
                                                   (passed, staged items
                                                    explicitly listed)
```

A reader traces any requirement from its ID → its Phase 10 disposition table row above → the cited evidence file → the live log or gate output.

### Recommended Project Structure

Closeout artifacts live in the phase directory only:

```
.planning/phases/10-sign-off-closeout/
├── 10-CONTEXT.md        # exists (auto-generated, discuss skipped)
├── 10-RESEARCH.md       # this file
├── 10-0X-PLAN.md        # planner output (2-4 plans)
├── 10-0X-SUMMARY.md     # per-plan evidence record
├── 10-UAT.md            # staged human runbook sheets (5 items, exact commands)
├── 10-VERIFICATION.md   # verifier record at phase end
└── fixtures/            # ONLY if a drill needs a staged manifest (09-04 precedent:
                         #   drill prefix, never fixture ids — absence sweep reads
                         #   staged manifest as truth)
```

Do not create sibling verify scripts, new top-level docs, or phase scratch outside this directory (cleanup dry-run approval covers phase scratch only).

### Pattern 1: Record-close box with cited evidence (not prose assertion)

**What:** Each record-close requirement gets a box naming the requirement, the disposition (credit/record/credit+delta), the exact prior evidence (file path + test/row identifier + date/commit where available), and what — if anything — was re-run on the current tree.
**When to use:** MIG-01, MIG-02, GUI-04, TEL-03, and the credit halves of GEN-01/GEN-03.
**Example:** "GEN-01 release-variant half — CREDITED to BLD-01: 08-VERIFICATION.md truth #19 (release rows green, ledger 10 closed) + `objdir-release/dist/bin/powerbrowser` present on current tree; DELTA re-proven: `node scripts/generate.mjs --check` PASS + `--only generated-byte-identity` PASS re-run 2026-09-05."

### Pattern 2: Staged-with-unblock runbook (08-05/09-04 precedent)

**What:** Anything not runnable here is recorded as staged with (a) the exact command sequence, (b) the blocking condition or missing prerequisite, and (c) the operator unblock — never marked green without logs ("staged-unexecuted, never green without logs" [VERIFIED: 08-05-SUMMARY.md key-decisions]).
**When to use:** All 5 human UAT sheets in autonomous mode; any live drill whose prerequisite (display, Nix theia shell) is absent at run time.

### Anti-Patterns to Avoid

- **Re-proving what 08/09 proved live:** The credit policy exists to prevent this. A plan task that re-runs the MAR hop or the release build "for completeness" spends ~1 h and proves nothing new — cite, don't redo.
- **Silent renumbering of the count:** The reconciliation must explain the "16" (label overcounts its own 15-item enumeration), not just write "15" everywhere going forward.
- **Marking human UAT pass without a human:** 01-UAT tests 2 and 6 record genuine 2026-09-01 human passes — reusable as prior evidence, but a *new* formal sign-off signature in autonomous mode is staged, not signed.
- **Asserting on absence of log lines / hand-kept expectation lists:** Standing CLAUDE.md check rules; any new registry row (none expected) needs `--self-test` with planted faults and derived expectations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-requirement proof scripts | New shell/node check files | `--only <existing-label>` runs + SUMMARY citations | The registry already covers every Phase 10 surface; a new script is a sibling driver in miniature |
| UAT tracking format | New sheet schema | Existing UAT.md shape (expected/result/evidence/steps, cf. 04-UAT.md drills 2–4) | Deterministic UAT routing and audit tooling read that shape |
| Evidence log storage | New log directories | `.mozbuild/` convention + phase SUMMARYs | 08/09 evidence is already there; consistency lets the auditor find things |
| Requirement-ID bookkeeping | Renamed/merged IDs | The 15 v1 IDs verbatim | REQUIREMENTS.md traceability table maps them 1:1 to Phase 10; renaming breaks the chain |

**Key insight:** Phase 10's failure mode is *process invention* — building new machinery to prove things that already have proved machinery. Every surface has a gate, a UAT sheet slot, or an archived proof. The plan's job is routing, not construction.

## Common Pitfalls

### Pitfall 1: Re-counting v1.1's staged host-bound cells as Phase 10 scope

**What goes wrong:** MSIX/DMG builds, per-OS matrix cells, and the 1.75.0 re-pin adoption get pulled into Phase 10 as "still staged."
**Why it happens:** 08/09-VERIFICATION.md each list staged items, and a careless read treats all staged items as open requirements.
**How to avoid:** Those staged cells belong to PKG-01/BLD-02/UPD-04 success criteria that the verifiers explicitly marked *passed with plan-sanctioned staged items, not gaps* [VERIFIED: 08-VERIFICATION.md score line; 09-VERIFICATION.md staged preamble]. Phase 10 covers only the 15 enumerated v1 IDs. GEN-03's Windows/macOS half is credited to PKG-01 with that exact scoping.
**Warning signs:** A plan task mentioning pkg-win11, pkg-macos, MSIX, DMG, or Theia 1.75.0.

### Pitfall 2: Treating 01-UAT human passes as signatures

**What goes wrong:** GUI-01/GUI-03 boxes marked "signed" citing 2026-09-01 passes.
**Why it happens:** 01-UAT.md tests 2 and 6 genuinely read `result: pass` with human-driven notes.
**How to avoid:** Those passes are *prior evidence* that drastically de-risks the formal sign-off, but the Phase 10 success criterion is "UAT sheets are signed" for *this* closeout. In autonomous mode: cite the 2026-09-01 record inside the sheet, attach the fresh 5-step/3-step runbook, mark staged-awaiting-signature. Do not backdate a signature.
**Warning signs:** Any sheet with a signature line filled in by the executor rather than the operator.

### Pitfall 3: Heavy-build surprise (tier-3 costs)

**What goes wrong:** A drill casually triggers `./mach build` or `yarn build` and burns 47–54 min, or invalidates the existing `objdir` state a later drill depends on.
**Why it happens:** EXT-01/TEL drills need a sidecar build; GEN-01 delta=https://github.com intuition says "rebuild to be sure."
**How to avoid:** Binaries exist in both objdirs; `theia/node_modules` is installed. Prefer `--check`/gate re-runs and the 09-04 path (theia build direct over an assembled set, not the full yarn wrapper). If a rebuild is genuinely needed, it is a Wave-0-style scheduled task with attributed timing, per docs/BUILD.md discipline — never a mid-plan surprise.
**Warning signs:** A task action containing `mach build`, `yarn build`, or `download:plugins` without a stated duration and a fallback.

### Pitfall 4: Display-less live-drill failure misread as product failure

**What goes wrong:** A drill needing a real window (GUI-01 automated rows, verify-endpoints layers 2–3, sidecar launch rows) fails headless and gets recorded as a product regression.
**Why it happens:** This environment's display availability was not probed this session; several full-tier rows need one (`harness-display-available` exists precisely as the pre-check).
**How to avoid:** Every live-drill task opens with the display/Nix-shell availability probe and stages-with-unblock on absence. A red caused by missing display is environment evidence, staged — never a product verdict.
**Warning signs:** FAIL lines naming `DISPLAY`, `X connection`, `nix develop`, or missing `upstream/` paths.

### Pitfall 5: NAME-01 canonical-form drift in new prose

**What goes wrong:** New closeout prose writes the spaced "Power Browser" where the canonical single-token form is now required, or vice versa in user-facing copy.
**Why it happens:** v1 shipped the spaced display form; Phase 08 re-pinned gates to canonical `PowerBrowser` (configuration.toml:38 `display_name = "PowerBrowser"` [VERIFIED: bash probe]).
**How to avoid:** Prose about identifiers/canonical name uses `PowerBrowser`; user-facing copy keeps the spaced form per 01-UI-SPEC.md. When in doubt, run `--only branding-preflight` — it derives expectations from inventory/brand-tokens.json:77-81 and will catch drift.
**Warning signs:** Any new literal of either form in a non-prose file; preflight going red.

## Code Examples

Verified patterns from the tree (all files below confirmed tracked via `git ls-files` this session):

### GUI-01 automated halves (full-tier rows, built binary present)

```sh
# Source: scripts/verify-platform.sh registry (gui01-* rows, full set)
scripts/verify-platform.sh --only gui01-single-shell-window
scripts/verify-platform.sh --only gui01-browser-close-does-not-quit
scripts/verify-platform.sh --only gui01-command-registered
```

GUI-01's chrome-side affordance is `openBrowserWindow` behind the boundary (`PowerBrowserAPI.sys.mjs:524-528`, catalogued in INTERNAL-APIS.md "Browser-window row") [VERIFIED: powerbrowser/INTERNAL-APIS.md — browser-window rows at :524-:528 read this session], reached from the Theia frontend command in `theia/extensions/tab-uris/src/browser/browser-window-command.ts` (tracked). No chrome-side command is registered — ratified design per CLAUDE.md rule 5, not an omission.

### TEL-01/TEL-02 drill core (level enum + sender properties)

```typescript
// Source: theia/extensions/telemetry/src/browser/telemetry-sender.ts:37 (read this session)
export const TELEMETRY_LEVELS = ['off', 'crash', 'error', 'all'] as const;
```

Sender contract the drill relies on: `off` drops before queueing (nothing enqueued, nothing sent); unrecognized level fails closed to off; never throws out of a telemetry path; bounded queue. Unit suite: `theia/extensions/telemetry/test/telemetry-sender.test.mjs`. Live delivery target: loopback `scripts/crash-collector.mjs` round-trip (verifier independently re-proved 200 + CrashID + matching store record in 09-VERIFICATION.md).

### VER-01 fleet proof (now runnable per BLD-02)

```sh
# Source: 09-04-SUMMARY.md + registry; --quick subset re-ran green this session
scripts/verify-platform.sh --only verify-downstream-fixtures
node scripts/verify-downstream-fixture.mjs --all --fixtures-root <phase-fixtures>
scripts/verify-platform.sh --only verify-manifest-literals   # VER-01 static layer
```

v1.0 staged this for want of tier-3 per-fixture builds; 09-04 proved the tier (harness `--all`, 198 assertions over 3 fixtures + tier-3 nix-linux logs in `.mozbuild/0904/`). The Phase 10 drill runs the same chain over the current tree — no new harness work.

### GUI-04 record-close (statement against green gate)

```sh
scripts/verify-platform.sh --only gui04-registry-shape   # green this session via --quick
```

`TabUriRegistry` exported shape asserted by `scripts/verify-registry-shape.mjs`; registry sources (`theia/extensions/tab-uris/src/browser/tab-uri-registry.ts` etc.) all tracked. The deliverable is a landability *statement* citing the green gate, not a new proof.

## State of the Art

| Old Approach (v1.0 closeout) | Current Approach (Phase 10) | When Changed | Impact |
|------------------------------|-----------------------------|--------------|--------|
| 16 requirements "unchecked," all drills staged | 15 enumerated IDs; most staged halves proven live by 08/09 | 2026-09-05 (v1.1 shipped) | Only genuinely-staged halves run; rest close on record |
| Fixture tier unrunnable (no BLD-02) | Tier-3 per-fixture builds proven (09-04) | 2026-09-05 | VER-01 fleet proof is runnable, not staged |
| Release-variant rows need tier-3 build | `objdir-release/` built, rows green, ledger 10 closed (08-05) | 2026-09-05 | GEN-01 release half credits; delta-only re-proof |
| Live rebase / re-pin staged (needs next tag / Nix shell) | Both ran live: UPD-03 (08-05, drill-then-restore to pinned tag), UPD-04 (09-04, agreement + token-gate at 1.74.1) | 2026-09-05 | UPD-01/02 static-completes stay closed; not Phase 10 scope |
| Spaced display form on gates | Canonical `PowerBrowser` re-pinned (NAME-01, 08-01/08-02) | 2026-09-05 | New prose must respect the canonical form (Pitfall 5) |
| verify-branding.mjs vs Eclipse attribution open (06-UAT-4) | Resolved: notices subtracted before NO_STOCK_IDENTITY assert (`scripts/verify-branding.mjs:102-161`, read this session) | Phase 08 (08-05 re-scope) | One less carried item; do not re-open |

**Deprecated/outdated:**
- v1.0-ROADMAP's "16/31 unchecked" line: superseded by the 15-item enumeration (REQUIREMENTS.md:12 declares enumeration source of truth). Record the reconciliation; don't propagate "16."
- 04-UAT drills 2–4 `pending` states: still the correct runbook source for GEN-05/EXT-01/TEL-02 steps — reuse verbatim, don't rewrite.

## Prior Live Evidence Inventory (what 08/09 proved — cite, don't redo)

| Proof | Evidence pointer | Closes which Phase 10 half |
|-------|------------------|----------------------------|
| Canonical rename + gates re-pinned | 08-01/08-02 SUMMARYs; `--only branding-preflight` green; `configuration.toml:38` | NAME-01 context for all record-close boxes (form expectations) |
| WINDOWS #13/#14 closed | 08-03 SUMMARY; `--only internals-boundary` green; WINDOWS.md rows fixed | Boundary context for GUI-01 sign-off (nohole behind the window affordance) |
| Linux MAR N→N+1 hop, zero Mozilla hosts | 08-04 SUMMARY; `--only mar-update-hop` green; `.mozbuild/mar-hop/`, hop.json 153.1.0→153.1.1 | PKG-02 (not Phase 10 scope — listed so plans don't re-run it) |
| NSIS-on-Nix compile proof | 08-04 SUMMARY; `--only installer-build-proof` green (makensis 3.12) | GEN-03 Linux half (credit) |
| Release build + release-variant rows green, ledger 10 closed | 08-05 SUMMARY; `objdir-release/` present; 08-VERIFICATION.md #19 | GEN-01 release half (credit) |
| Live ESR rebase drill-then-restore (153.2.0esr) | 08-05 SUMMARY; `.mozbuild/rebase-drill-0805.log` | UPD-01 live half (already closed — not Phase 10 scope) |
| npm/local-path resolver + pin gates | 09-01 SUMMARY; extension-pins self-test plants red-naming | EXT-01 static half |
| Crash collector loopback round-trip (verifier-independent) | 09-02 SUMMARY; 09-VERIFICATION.md behavioral spot-checks (200 + CrashID + store match) | TEL-02 delivery-target half |
| WebExtensions ExtensionSettings agreement gate | 09-03 SUMMARY; `--only webextensions` green | EXT-03 (not Phase 10 scope — context only) |
| Tier-3 fixture matrix + re-pin agreement at 1.74.1 | 09-04 SUMMARY; `.mozbuild/0904/` logs; harness 198 assertions | BLD-02 (makes VER-01 runnable); UPD-04 (closed) |
| 08 phase verification `passed` (17/20, 3 plan-sanctioned staged) | 08-VERIFICATION.md | Staged items are wins/mac-host-bound, explicitly not gaps |
| 09 phase verification `passed` (16/16, staged listed) | 09-VERIFICATION.md | Same — staged items explicitly not gaps |
| GUI-01/GUI-03 human passes 2026-09-01 | 01-UAT.md tests 2, 6; WINDOWS.md items 15, 16 (fixed) | Prior evidence inside GUI-01/GUI-03 sheets (not signatures) |
| Trademark ritual signed (Chris, 2026-09-04) | PROJECT.md validated list; `brand/HUMAN-REVIEW.md` 0 TO-BE-SIGNED [VERIFIED: bash probe] | GEN-02 context (mark itself approved; pixel render still staged) |

## What Still Needs Live Runs vs Record-Close

**Record-close on current tree (cheap `--only` re-runs + citation, no display/build):**
MIG-01, MIG-02 (scan-brand-residue green re-run this session), GUI-04 (registry-shape green), GEN-01 delta (generate --check + byte-identity), GEN-03 delta (installer-schema), TEL-03 derivation half (allowlist rows) + count reconciliation paragraph.

**Live runs against the built tree (need display and/or Nix theia shell; stage-with-unblock if absent):**
TEL-01 (declaration drill on running sidecar), TEL-02 (pipeline delivery per 04-UAT drill 4), EXT-01 (bundle+load per 04-UAT drill 3 via the 09-04 sidecar-build path), VER-01 (fixture-tier run per BLD-02 chain), TEL-03 installed-binary layer (verify-endpoints on built binary), GUI-01 automated gui01-* rows (built binary + display).

**Human-only, staged runbooks in autonomous mode (exact commands, no execution):**
GUI-01 5 steps (WINDOWS.md item 15 wording + 01-UAT test 2), GUI-03 3 steps (item 16 + 01-UAT test 6), GEN-02 pixel look (03-UAT scenario 1 verbatim), GEN-05 render (04-UAT drill 2 verbatim), DOC-01 carry-test (REBRANDING.md walkthrough + verify-rebranding-docs gate; runbook states the stranger protocol and records it unrun).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `objdir/` + `objdir-release/` binaries are fresh enough that gate re-runs on them are honest (no tree delta since 08-05 invalidates them) | Environment Availability | Medium — planner should add a staleness task (git log since 08-05 vs touched surfaces; rebuild only on delta) |
| A2 | Display + Nix theia shell are available at execution time for live drills | Environment Availability | Medium — every live-drill task must probe first and stage-with-unblock; never record environment-red as product-red |
| A3 | The "16" overcount is a label error, not a missing 16th requirement (all three "Complete (static)" v1.0 rows were closed live by v1.1) | Summary / Reconciliation | Low — enumeration is declared source of truth; plan task verifies by diffing the v1.0 outcomes table against v1.1 requirement closures |
| A4 | 01-UAT 2026-09-01 human passes remain valid prior evidence (no GUI-01/GUI-03 surface changed since) | Evidence Inventory | Low — plan task confirms via git log on `browser-window-command.ts`, `PowerBrowserAPI.sys.mjs` openBrowserWindow rows, and customize-bridge sources |

## Open Questions

1. **Does any tree delta since 08-05 invalidate the built objdirs for drill purposes?**
   - What we know: Binaries exist in both objdirs; 08-05 built them; commits since are docs/planning (v1.1 closeout + v1.2 roadmap).
   - What's unclear: Whether any commit after the 08-05 build touched a compiled surface.
   - Recommendation: First task of the live-drill plan diffs `git log` since the build logs' timestamps against compiled surfaces; rebuild only on delta.

2. **Is a display available for full-tier rows at execution time?**
   - What we know: `harness-display-available` row exists as the pre-check; this research session did not probe display.
   - What's unclear: Headless vs headed execution environment.
   - Recommendation: Probe-first in every live-drill task; stage-with-unblock on absence.

3. **Should DOC-01's stranger carry-test runbook nominate a specific stranger/protocol?**
   - What we know: REBRANDING.md is 375 lines with a rebranding-docs coverage gate green; 04-UAT never defined the stranger protocol.
   - What's unclear: Who counts as a stranger and what "recorded" means (transcript? checklist?).
   - Recommendation: Runbook defines the protocol (fresh clone → edit configuration.toml + logo → build → checklist), records it staged; human executes later.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | All --quick gates | ✓ (probed) | v24.19.0 | — |
| `objdir/dist/bin/powerbrowser` | Full-tier rows (gui01-*, endpoints, identity) | ✓ (present) | — | Rebuild per docs/BUILD.md (~47–54 min) |
| `objdir-release/dist/bin/powerbrowser` | GEN-01 release-half citation | ✓ (present) | — | Rebuild (tier-3, scheduled) |
| `theia/node_modules` | EXT-01/TEL sidecar drills | ✓ (installed) | — | `nix develop .#theia` yarn install |
| `upstream/` checkout | apply-patches-self-test, rebase-adjacent checks | ✓ (materialized) | — | `scripts/fetch-upstream.sh` (multi-GB) |
| `.mozbuild/` tier-3 evidence | Record-close citations | ✓ (logs on disk) | — | — |
| `yarn` (Nix theia shell) | Sidecar build drills | Unprobed [ASSUMED available via `nix develop .#theia`] | — | Stage-with-unblock per 09-04 precedent |
| Display (headed session) | Window/launch rows | Unprobed | — | `harness-display-available` pre-check; stage-with-unblock |
| pkg-win11 / pkg-macos hosts | Nothing in Phase 10 scope | ✗ (staged per 08-05, out of scope) | — | Not needed — excluded by Pitfall 1 |

**Missing dependencies with no fallback:** None in scope.
**Missing dependencies with fallback:** Display and Nix shell — fallback is staged-with-unblock runbooks (established 08-05/09-04 discipline).

`--quick` baseline re-run this session: **PASS, all checks passed** (full row list observed incl. scan-brand-residue, branding-preflight, verify-manifest-literals, verify-trademark-surface, verify-rebranding-docs, internals-boundary, gui04-registry-shape, shell-error-copy-no-internals, generated-byte-identity, generate-check, icon-ihdr, installer-schema, extension-pins, telemetry, theia-branding, theia-endpoints, verify-downstream-fixtures, mar-update-hop-self-test, installer-build-proof-self-test, crash-collector, webextensions).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (single driver; rows are node .mjs gates with `--self-test` + shell functions) |
| Config file | `scripts/verify-platform.sh` CHECKS arrays (quick set + full set); labels are the contract for `--only` |
| Quick run command | `scripts/verify-platform.sh --quick` |
| Full suite command | `scripts/verify-platform.sh` (needs built tree + display; tier-3 costs apply) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIG-01 | Migration proof on record | record (cite) | `scripts/verify-platform.sh --quick` (residue scan row) | ✅ (01-UAT.md archived proof) |
| MIG-02 | Inventory audit holds | record (cite) | `--only scan-brand-residue` + self-test | ✅ |
| GUI-01 | Toggle UAT signed | human runbook (staged) + automated rows | `--only gui01-single-shell-window` etc. (full-tier) | ✅ runbook source: WINDOWS.md:15, 01-UAT test 2 |
| GUI-03 | Restyle UAT signed | human runbook (staged) + automated rows | `--only verify-customize-inert`, `--only verify-dev-flag-off` | ✅ runbook source: WINDOWS.md:16, 01-UAT test 6 |
| GUI-04 | Landability statement | record (cite green gate) | `--only gui04-registry-shape` | ✅ |
| GEN-01 | Emitter deltas re-proven | automated | `--only generate-check`, `--only generated-byte-identity` | ✅ |
| GEN-02 | Icon pixel signed | human runbook (staged) + automated rows | `--only icon-ihdr` | ✅ runbook source: 03-UAT scenario 1 |
| GEN-03 | Schema deltas re-proven | automated | `--only installer-schema` | ✅ |
| GEN-05 | Render drill signed | human runbook (staged) + automated rows | `--only theia-branding`, `--only theia-endpoints` | ✅ runbook source: 04-UAT drill 2 |
| EXT-01 | Bundle+load drill green | live drill | `--only extension-pins` + sidecar build path (09-04) | ✅ runbook source: 04-UAT drill 3 |
| TEL-01 | Declaration drill green | live drill | `--only telemetry` + running-sidecar declaration steps | ✅ |
| TEL-02 | Delivery drill green | live drill | sender suite + loopback collector round-trip | ✅ runbook source: 04-UAT drill 4 |
| TEL-03 | Allowlist layer proven | record + live layer | `--only allowlist-schema`, `--only allowlist-doc-consistency`, `verify-endpoints` (full-tier) | ✅ |
| VER-01 | Fleet proof green | live drill | `--only verify-downstream-fixtures`, `--only verify-manifest-literals` | ✅ (runnable per BLD-02) |
| DOC-01 | Carry-test signed | human runbook (staged) + automated row | `--only verify-rebranding-docs` | ✅ runbook source: docs/REBRANDING.md |

### Sampling Rate

- **Per task commit:** `scripts/verify-platform.sh --quick`
- **Per wave merge:** `scripts/verify-platform.sh --quick` + affected `--only` rows
- **Phase gate:** `--quick` green + all cited `--only` rows green before `/gsd-verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new gates, fixtures (unless a drill needs a staged manifest — 09-04 drill-prefix rule applies), or framework installs needed. (If a live drill discovers a genuinely new assertion, it lands as a registry row with `--self-test` per CLAUDE.md — the plan should budget for that possibility without assuming it.)

## Security Domain

Phase 10 writes no product code and changes no trust boundary; the security posture is *asserted unchanged*, with two citation points relevant to sign-off sheets:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No new work | Token-gate (SEC-01, v1.0) untouched — cited, not re-proven |
| V3 Session Management | No new work | Per-launch session cookie (PowerBrowserAPI.setSessionCookie) untouched |
| V4 Access Control | No new work | Internals boundary (`internals-boundary` + `internals-catalogue` rows green this session) |
| V5 Input Validation | No new work | Generator guards (WR-04 sink guard etc.) untouched |
| V6 Cryptography | No new work | MAR fork-signing rung (PKG-02) documented HTTPS-only interim — cited as standing decision, not re-litigated |

### Known Threat Patterns for this phase (process threats, not product threats)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Signing off on green-by-absence (empty check set, missing prereq PASS) | Tampering (evidence) | Registry fails loud on empty set [VERIFIED: verify-platform.sh empty-set guard read this session]; drills FAIL naming missing prereqs (08-05 discipline) |
| Backdating human signatures in autonomous mode | Repudiation | Staged-with-runbook pattern; signatures only by operator |
| Re-proving (and thereby risking) stable security surfaces | Tampering | Credit policy — cite 08/09 proofs; touch nothing |

## Recommended Plan Decomposition (for planner)

Three plans, tracer-first, waves sequential (each cites the previous):

1. **10-01 — Record-close tracer + reconciliation + UAT runbooks.** Count-reconciliation paragraph (16-vs-15 with the three pointer lines); record-close boxes for MIG-01, MIG-02, GUI-04, TEL-03-derivation, GEN-01-credit, GEN-03-credit; five UAT runbook sheets written to 10-UAT.md (GUI-01, GUI-03, GEN-02, GEN-05, DOC-01) marked staged with exact commands and prior-evidence citations; `--quick` green recorded. No display, no build, no Nix — runnable anywhere.
2. **10-02 — Live drills on the built tree.** GEN-01/GEN-03 delta re-proofs; VER-01 fixture-tier run; TEL-01 declaration drill; TEL-02 delivery drill (loopback collector); EXT-01 bundle+load on real sidecar build (09-04 path); TEL-03 installed-binary layer (verify-endpoints); GUI-01 automated rows. Opens with display + Nix-shell + objdir-staleness probes (Open Questions 1–2); anything unrunnable stages with unblocks.
3. **10-03 — Gates-green sweep + phase close.** Re-run `--quick` + every cited `--only` row on the final tree; confirm no sibling driver created and no new check without `--self-test`; assemble the 15-box sign-off record; record deferred human signatures as the explicit carry list for `/gsd-verify-work`.

## Sources

### Primary (HIGH confidence — files read this session)

- `.planning/REQUIREMENTS.md` — 15-item Phase 10 enumeration + credit policy (REQUIREMENTS.md:12-28)
- `.planning/milestones/v1.0-REQUIREMENTS.md` — outcomes table: 15 Open rows, 3 Complete (static) (lines 13-43)
- `.planning/STATE.md:313` — "16 unchecked" snapshot whose own parenthetical enumerates 15
- `.planning/ROADMAP.md` Phase 10 section — goal, 15 requirements, 5 success criteria
- `scripts/verify-platform.sh` — registry structure, ~60 quick + ~40 full labels, empty-set guard (read + label-grepped)
- `powerbrowser/INTERNAL-APIS.md` — boundary catalogue incl. GUI-01 browser-window rows
- `theia/extensions/telemetry/src/browser/telemetry-sender.ts:1-40` — level enum + sender contract
- `scripts/verify-branding.mjs:102-161` — Eclipse-notice-aware assertion (06-UAT-4 resolved)
- `scripts/verify-platform.sh --quick` — re-run live 2026-09-05: PASS all checks
- `configuration.toml:38` (`display_name = "PowerBrowser"`), `inventory/brand-tokens.json:74-81` (canonical expectations)
- `brand/HUMAN-REVIEW.md` (0 TO-BE-SIGNED), `docs/REBRANDING.md` (375 lines)
- 08/09 SUMMARYs + 08/09-VERIFICATION.md (both `passed`, staged items explicitly not gaps)
- 01-UAT.md (tests 2, 6 human passes 2026-09-01), 04-UAT.md (drills 2–4 runbook source), 03-UAT.md (pixel scenario), 06-UAT.md (all four items resolved/staged with known owners)
- `.planning/WINDOWS.md` (open_count 2, items 15/16 fixed with 2026-09-01 human evidence)

### Secondary (MEDIUM confidence — project records referenced but not re-verified live)

- `.mozbuild/` tier-3 evidence logs (listed, not opened: mar-hop, matrix, rebase-drill-0805, release-build-0805)
- docs/BUILD.md packaging procedure + host-capability record (cited via 08-04/08-05/09-04 SUMMARYs, not re-read)
- 08-05 claim "ledger 10 closed" for BLD-01 release rows (cited via SUMMARY + 08-VERIFICATION #19)

### Tertiary (LOW confidence)

- None. Every material claim above is tree-grounded. Environment items marked [ASSUMED] (yarn/display availability) are probed, not trusted, by the plan.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing new; every gate/file probed present and several re-run green
- Architecture: HIGH — closeout evidence chain fully mapped to files, rows, and archive pointers
- Pitfalls: HIGH — all five pitfalls are named instances of shipped mistakes with in-tree precedent

**Research date:** 2026-09-05
**Valid until:** 30 days (stable domain — closeout references pinned archives; only objdir staleness decays, covered by Open Question 1)
