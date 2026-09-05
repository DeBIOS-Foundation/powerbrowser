# Phase 10: Sign-off Closeout - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 7 (5 new docs, 1 conditional modify, 1 conditional fixtures dir)
**Analogs found:** 7 / 7

All analog paths verified git-tracked via `git ls-files -- <path>` before naming (non-empty = tracked).
No `.claude/skills/` or `.agents/skills/` directory exists in this tree; project conventions taken from `CLAUDE.md`
(one driver/one registry, derive-don't-hand-keep, self-test twins, residual-brand scan, user-facing copy rule,
canonical `PowerBrowser` form, staged-unexecuted-never-green-without-logs).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/phases/10-sign-off-closeout/10-UAT.md` (new, 5 staged human sheets) | test (human runbook) | n/a (evidence docs, human-driven steps) | `.planning/milestones/v1.0-phases/04-theia-surface-branding-extensions-telemetry/04-UAT.md` | exact |
| `.planning/phases/10-sign-off-closeout/10-VERIFICATION.md` (new, phase gate record) | test (verification record) | n/a (evidence docs, batch re-runs) | `.planning/milestones/v1.1-phases/08-installer-hardening-canonical-rename/08-VERIFICATION.md` + `.planning/milestones/v1.1-phases/09-extensions-crash-pipeline/09-VERIFICATION.md` | exact |
| `.planning/phases/10-sign-off-closeout/10-01-SUMMARY.md` (new, record-close + reconciliation + runbooks) | docs (evidence record) | n/a (evidence docs) | `.planning/milestones/v1.1-phases/08-installer-hardening-canonical-rename/08-05-SUMMARY.md` | exact |
| `.planning/phases/10-sign-off-closeout/10-02-SUMMARY.md` (new, live drills) | docs (evidence record) | batch (gate re-runs) + request-response (sidecar/loopback drills) | `.planning/milestones/v1.1-phases/09-extensions-crash-pipeline/09-04-SUMMARY.md` | exact |
| `.planning/phases/10-sign-off-closeout/10-03-SUMMARY.md` (new, gates-green sweep + 15-box sign-off) | docs (evidence record) | batch (registry re-runs) | `.planning/milestones/v1.1-phases/08-installer-hardening-canonical-rename/08-05-SUMMARY.md` | role-match |
| `scripts/verify-platform.sh` (conditional modify — registry row ONLY if a drill discovers a genuinely new assertion) | config (check registry) | batch | self (modify in place, append row) | exact |
| `.planning/phases/10-sign-off-closeout/fixtures/` (conditional — ONLY if a drill needs a staged manifest) | test fixture | batch (generate-level cells) | `.planning/milestones/v1.1-phases/09-extensions-crash-pipeline/fixtures/npm-kind/configuration.toml` (+ siblings) | exact |

Live-drill evidence logs (`.mozbuild/` tier-3 logs, loopback transcripts) are **untracked by standing convention**
(gitignored proof spill, cf. 08-05-SUMMARY.md:150,174) — not classified as created files.

## Pattern Assignments

### `.planning/phases/10-sign-off-closeout/10-UAT.md` (test runbook, n/a docs)

**Analog:** `.planning/milestones/v1.0-phases/04-theia-surface-branding-extensions-telemetry/04-UAT.md`

**Frontmatter pattern** (lines 1-12):
```yaml
---
status: pending-human
phase: 04-theia-surface-branding-extensions-telemetry
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-VERIFICATION.md]
started: 2026-09-04T00:00:00Z
updated: 2026-09-04T00:00:00Z
executed_by: claude (static gates re-run live; graphical/browser-boot and app-bundle drills reserved for human hands)
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  gap_snapshot: "pending-human::scenarios=3"
---
```

**Core drill pattern — staged-with-unblock runbook** (lines 26-42, GEN-05 drill 2 — copy verbatim shape for all 5 Phase 10 sheets):
```markdown
### 2. Fixture rebrand + app-bundle build + live render drill

expected: Fixture values (name, welcome/about texts, theme, logo, telemetry level/endpoint, one urls value, one real extension entry) flow manifest -> generate -> surgical blocks -> regenerated prefs -> built sidecar; welcome tab, about dialog, favicon and theme show the fixture with zero modified theia/**/src/**/*.ts; revert restores --check green.
result: pending
steps:

  - "Edit ONLY configuration.toml (display_name -> fixture, [theia] theme + welcome_text, [telemetry] level + endpoint, one [urls] value, one real [[extensions]] entry with bootstrapped pin) and swap brand/mark.svg for a square fixture SVG"
  - "node scripts/generate.mjs"
  - "Surgically apply the five blocks (applicationName, defaultTheme, powerbrowserBranding, powerbrowserTelemetry, theiaPlugins) into theia/applications/browser/package.json — keys only, siblings byte-identical"
  - "Copy the regenerated pref files over powerbrowser/branding/{dev,release}/pref/firefox-branding.js; add the fixture hosts to powerbrowser/endpoint-allowlist.json"
  - "nix develop .#theia --command bash -c \"cd theia && yarn build\""
  - "node scripts/verify-theia-branding.mjs && node scripts/verify-theia-endpoints.mjs (expect both PASS)"
  - "Start the app; open welcome + about: fixture name/texts/mark, fixture theme, favicon = fixture mark; preferences show the contributed telemetry level"
  - "Revert every fixture value, regenerate, restore package.json + pref files + allowlist; confirm --check green and git status clean"

source: human
coverage_id: GEN-05/live-render
```

**Summary/Gaps footer pattern** (lines 72-84):
```markdown
## Summary

total: 4
passed: 1
issues: 0
pending: 3
skipped: 0
blocked: 0
automated: 1

## Gaps

(none — automated evidence is green; drills 2-4 await human hands)
```

**What Phase 10 copies:** frontmatter with `status: pending-human` (or `testing` per 03-UAT.md:2 for single-scenario
sheets), `result: pending` + `steps:` + `source: human` + `coverage_id: <REQ-ID>/<half>` per drill, exact-command steps
reused verbatim from 04-UAT.md drills 2–4 (GEN-05/EXT-01/TEL-02), 01-UAT.md tests 2/6 (GUI-01/GUI-03), 03-UAT.md
scenario 1 (GEN-02 pixel), REBRANDING.md walkthrough (DOC-01). Cite 2026-09-01 human passes as *prior evidence inside
the sheet*, never as a signature (Pitfall 2). Deterministic UAT routing reads the `expected/result/evidence/steps`
shape — do not invent a new schema.

**Secondary analogs for the 5 sheets:**
- GUI-01 5 steps + GUI-03 3 steps wording: `.planning/WINDOWS.md` ledger items 15/16 `reason` fields (verified read
  this session) + `01-UAT.md:19-21` (GUI-01) and `01-UAT.md:40-44` (GUI-03):
```markdown
### 2. Open the Stock Browser Window (GUI-01)
expected: From the running Theia shell, invoke the "Open Browser Window" command. A stock Firefox-chrome browser window opens. The address bar takes keyboard focus and navigates a typed URL. An in-window modal (e.g. an alert from a page) appears rather than being suppressed. Closing the browser window returns you to the shell with the app still running. (5-step manual verification recorded as outstanding in 01-07; ledgered in WINDOWS.md.)
result: pass
```
- GEN-02 pixel sheet: `03-UAT.md:13-26` single-scenario shape (`expected: |` + `result: [pending]`).
- DOC-01 carry-test: `06-UAT.md:38-55` UAT-2/UAT-3 shape — **Prerequisite / Test (sh block) / Expected / Why human**
  quad, e.g. lines 40-54. DOC-01 runbook defines the stranger protocol (fresh clone → edit configuration.toml + logo
  → build → checklist), records it staged.

---

### `.planning/phases/10-sign-off-closeout/10-VERIFICATION.md` (test verification record, batch re-runs)

**Analog:** `.planning/milestones/v1.1-phases/08-installer-hardening-canonical-rename/08-VERIFICATION.md`
(secondary: `09-VERIFICATION.md` for staged-preamble + hard-rule compliance shapes)

**Frontmatter pattern** (08-VERIFICATION.md lines 1-18):
```yaml
---
phase: 08-installer-hardening-canonical-rename
verified: 2026-09-05T12:00:00Z
status: passed
score: 17/20 must-haves verified, 3 staged (plan-sanctioned), 0 failed
behavior_unverified: 0
overrides_applied: 0
staged:
  - truth: "MSIX and DMG artifacts are built on named real hosts, never on Linux"
    state: staged-unexecuted
    evidence: "docs/BUILD.md capability record names pkg-win11 + pkg-macos with exact provisioning errors and operator unblock commands; zero Linux MSIX/DMG attempts"
---
```

**Core truths-table pattern** (lines 29-54) — Phase 10 has 15 requirement rows instead of 20, same columns:
```markdown
| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A bare dollar-variable in an installer-bound manifest value fails generation naming the key (08-01) | ✓ VERIFIED | Re-ran `node scripts/generate.mjs --self-test`: PASS, 45 plants. `hasBareDollar` at scripts/generate.mjs:891, guard at :899 |
...
**Score:** 17/20 truths verified, 3 staged (plan-sanctioned falsification branches), 0 failed
```

**Behavioral spot-checks pattern** (lines 121-145) — every row is a re-ran command + observed result, never prose:
```markdown
| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full static gate green | `scripts/verify-platform.sh --quick` | PASS, all rows | ✓ PASS |
| MAR hop live (Linux) | `scripts/verify-platform.sh --only mar-update-hop` | PASS | ✓ PASS |
```

**Staged-not-gap pattern** (lines 56-71 + 09-VERIFICATION.md lines 9-19) — copy the explicit routing language:
```markdown
### Staged Items (plan-sanctioned, not gaps)

Items not yet met but explicitly routed by plan 08-05's falsification criterion
(unreachable named VMs → record exact error + unblock, mark staged-unexecuted, never green-without-logs).
```
09-VERIFICATION.md frontmatter `staged:` entries carry `item / reason / evidence` triples plus a `coverage_note`
for artifact-state edges — copy that triple shape for Phase 10's deferred human signatures.

**Hard-rule compliance pattern** (09-VERIFICATION.md lines 159-167) — Phase 10 MUST include this section:
```markdown
### Hard-Rule Compliance (per CLAUDE.md)

- No Theia-core patch: only tree-owned `theia/extensions/telemetry/test/` touched; re-pin is pins + lockfile only. ✓
- No Gecko off-stack edit: `upstream/` + `patches/` diff empty; internals boundary untouched. ✓
- Bridge-safe: no Theia presentation welding in this phase. ✓
- No sibling drivers: all new gates ride `verify-platform.sh` registry rows with `--self-test` twins. ✓
```

**What Phase 10 copies:** frontmatter score line, truths table (15 rows, one per v1 ID, `✓ VERIFIED` with re-run
evidence vs `STAGED` with plan-sanctioned reason), Required Artifacts table (lines 73-93 pattern:
`| Artifact | Expected | Status | Details |` with `✓ EXISTS + SUBSTANTIVE + WIRED` verdicts + file:line pointers),
Key Link Verification, Requirements Coverage, spot-checks re-run live, verification metadata footer (lines 244-254).

---

### `.planning/phases/10-sign-off-closeout/10-01-SUMMARY.md` (docs evidence record, n/a)

**Analog:** `.planning/milestones/v1.1-phases/08-installer-hardening-canonical-rename/08-05-SUMMARY.md`

**Frontmatter pattern** (lines 1-47) — copy the whole block shape, Phase 10 values differ:
```yaml
---
phase: 08-installer-hardening-canonical-rename
plan: "05"
subsystem: installer
tags: [packaging-hosts, msix, dmg, mar, release-build, rebase-drill, verify-platform, branding-gate]

# Dependency graph
requires:
  - phase: 08-installer-hardening-canonical-rename
    provides: [08-04 updater enablement plus Linux MAR hop plus NSIS-on-Nix build proof]
provides:
  - Named packaging hosts with capability record (nix-linux reachable, pkg-win11 plus pkg-macos staged with unblocks)
affects: [08-06 phase closeout, PKG-01 Windows/macOS proofs, rebase-adoption to 153.2.0esr, smoke-theia flake follow-up]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 6100
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [per-text-node token-boundary assertion, derived legal-notice exemption, drill-then-restore rebase discipline]

key-files:
  created: []
  modified: [docs/BUILD.md, scripts/verify-branding.mjs, .planning/WINDOWS.md]

key-decisions:
  - "Staged-unexecuted, never green without logs: pkg-win11/pkg-macos cells record exact errors plus operator unblocks"

requirements-completed: [PKG-01, PKG-02, BLD-01, UPD-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "BUILD.md host-capability record names pkg-win11 and pkg-macos with versions, makensis 3.12, and reachable/staged-unexecuted states"
    requirement: "PKG-01"
    verification:
      - kind: unit
        ref: "task-1 automated grep chain#pkg-win11=2, pkg-macos=2, makensis 3.12, reachability states, numbered OS/SDK lines"
        status: pass
    human_judgment: true
    rationale: "Prose accuracy (provisioning errors, unblock commands) needs a human read; the grep chain proves shape, not truth"
```

**Body pattern** (lines 140-267): `## Performance` (duration/tasks/wall attribution) → `## Accomplishments` →
`## Task Commits` (atomic, one line per task with hash + kind) → `## Files Created/Modified` →
`## Decisions Made` → `## Deviations from Plan / ### Auto-fixed Issues` (Found during / Issue / Fix / Files modified /
Verification / Committed in) → `## Issues Encountered` → `## Follow-ups` → `## Next Phase Readiness` →
`## Self-Check: PASSED` (files + commits + verifies triple).

**Record-close box content pattern for 10-01** (per RESEARCH Pattern 1): each box names requirement + disposition +
exact prior evidence (file path + test/row id + date/commit) + what was re-run on the current tree, e.g.:
`"GEN-01 release-variant half — CREDITED to BLD-01: 08-VERIFICATION.md truth #19 (release rows green, ledger 10
closed) + objdir-release/dist/bin/powerbrowser present on current tree; DELTA re-proven: node scripts/generate.mjs
--check PASS + --only generated-byte-identity PASS re-run 2026-09-05."`

**Count-reconciliation paragraph pattern:** cite the three pointer lines, explain don't renumber —
v1.0-REQUIREMENTS.md:13-41 enumerates exactly 15 `Open` rows; v1.0-ROADMAP closeout line + STATE.md:313 say "16"
while the STATE.md parenthetical itself enumerates only 15 IDs; REQUIREMENTS.md:12 declares the enumeration source
of truth; the three v1.0 `Complete (static)` rows (UPD-01, UPD-02, VER-03 at v1.0-REQUIREMENTS.md:37-38,43) were
closed live by v1.1 and must not be re-counted as a 16th item.

---

### `.planning/phases/10-sign-off-closeout/10-02-SUMMARY.md` (docs evidence record, batch + request-response)

**Analog:** `.planning/milestones/v1.1-phases/09-extensions-crash-pipeline/09-04-SUMMARY.md`

**Same frontmatter + body skeleton as 10-01 above** (lines 1-113: requires/provides/affects, actuals, tech-stack,
key-files with `created:` fixture manifests, key-decisions, patterns-established, requirements-completed, coverage
with `verification: [{kind, ref, status}]` + `human_judgment`).

**Drill-evidence citation pattern to copy** (lines 65-81, D2 block — every log on the same line as its gating keyword):
```yaml
  - id: D2
    description: "Reachable-host download plus hash plus sidecar build cells green on nix-linux with evidence logs on disk"
    requirement: "BLD-02"
    verification:
      - kind: integration
        ref: ".mozbuild/0904/download-stock.log#stock fetch of both vsix entries, placeholder expanded"
        status: pass
      - kind: integration
        ref: ".mozbuild/0904/plugins-hashes.log#all five archives hash to staged pins"
        status: pass
      - kind: integration
        ref: ".mozbuild/0904/build-sidecar.log#theia build 0 errors on both targets"
        status: pass
    human_judgment: false
```

**Staged-cell pattern to copy** (lines 82-87):
```yaml
  - id: D3
    description: "Unreachable-host build and install cells recorded staged-unexecuted with exact errors and operator unblocks"
    requirement: "BLD-02"
    verification: []
    human_judgment: true
    rationale: "No provisioned Windows or macOS host exists; the rows can only go green when pkg-win11/pkg-macos are provisioned and the procedure re-runs there"
```

**Drill-design decision pattern to copy** (lines 152-157): record *why* the drill takes its path
(09-04 examples: real-npm-plus-loopback-twin, out-of-band tarball split, `theia build` direct over assembled set
instead of the full `yarn build` wrapper, staged 1.75.0 bump). Phase 10 equivalents: 09-04 sidecar-build path for
EXT-01, loopback `crash-collector.mjs` round-trip for TEL-02, `--all` fixture-tier chain for VER-01, display/Nix-shell
probe-first with stage-with-unblock fallback.

**Deviations pattern to copy** (lines 159-174): `[Rule N - class]` + Found during / Issue / Fix / Files modified /
Verification / Committed in; total-deviations rollup line. 09-04's one deviation is the drill-prefix rule itself —
see Shared Patterns.

---

### `.planning/phases/10-sign-off-closeout/10-03-SUMMARY.md` (docs evidence record, batch)

**Analog:** `08-05-SUMMARY.md` body skeleton (same as 10-01) + `08-VERIFICATION.md:121-145` spot-check table for the
sweep record.

**Content:** re-run `scripts/verify-platform.sh --quick` + every cited `--only` row on the final tree; confirm no
sibling driver created and no new check without `--self-test`; assemble the 15-box sign-off record; record deferred
human signatures as the explicit carry list for `/gsd-verify-work`. Task commits stay atomic; Self-Check lists
files + commits + verifies.

---

### `scripts/verify-platform.sh` (conditional modify — config registry, batch)

**Analog:** self — append rows, never a sibling driver (`scripts/verify-platform.sh:52-54`).

**Registry-append pattern** (lines 4025-4033, telemetry pair — copy comment + row-pair shape):
```bash
    # Both are honestly --quick, with one named SKIP each for trees that
    # have never generated or never installed: an absent fragment skips
    # the fragment half (generate-check's own rule), and an absent theia
    # install skips the tsc half (the suite needs neither). No build, no
    # browser, no display, no network.
    "telemetry|node $REPO_ROOT/scripts/verify-telemetry.mjs"
    "telemetry-self-test|node $REPO_ROOT/scripts/verify-telemetry.mjs --self-test"
```

**Per-drill sampling pattern** (lines 71-77 + 4392-4407):
```bash
    --only)
      if [ "$#" -lt 2 ]; then
        echo "verify-platform: FAIL -- --only requires a label argument" >&2
        exit 1
      fi
```
```sh
scripts/verify-platform.sh --only telemetry
scripts/verify-platform.sh --only gui04-registry-shape
scripts/verify-platform.sh --only verify-downstream-fixtures
scripts/verify-platform.sh --only verify-manifest-literals
```

**Empty-set guard pattern** (lines 4384-4390 — never remove, never weaken):
```bash
  if [ "${#CHECKS[@]}" -eq 0 ]; then
    echo "verify-platform: FAIL -- the check set is EMPTY, so nothing was scanned. A clean result from an empty set proves nothing; this is a registry bug, not a pass." >&2
    return 1
  fi
```

**Expectation:** no new rows (RESEARCH: "If a live drill discovers a genuinely new assertion, it lands as a registry
row with `--self-test` per CLAUDE.md — budget the possibility without assuming it"). Any new row needs the
`--self-test` twin + honestly-`--quick` comment + derived-expectations discipline (see Shared Patterns).

---

### `.planning/phases/10-sign-off-closeout/fixtures/` (conditional — test fixture, batch)

**Analog:** `.planning/milestones/v1.1-phases/09-extensions-crash-pipeline/fixtures/npm-kind/configuration.toml`
(+ `local-path-kind/`, `openvsx-pinned/` siblings; each `configuration.toml` + `brand/mark.svg`).

**Harness-drive pattern** (`scripts/verify-downstream-fixture.mjs:1-18` header):
```
// --all --fixtures-root <dir> drives every committed fixture (required by
// plan 07-04); --self-test proves the assertions discriminate. --all takes no
// default root on purpose: the phase path spells a residue probe, and no
// in-scope file may carry that token (the scanners' scope excludes
// .planning/, so callers pass the root as argv instead).
```
```sh
node scripts/verify-downstream-fixture.mjs --all --fixtures-root <phase-fixtures>
scripts/verify-platform.sh --only verify-downstream-fixtures
```

**Expectation:** only if a drill needs a staged manifest (09-04 precedent). Otherwise no fixtures dir at all.

---

## Shared Patterns

### Staged-with-unblock (applies to: 10-UAT.md, 10-02-SUMMARY.md, 10-VERIFICATION.md staged section)

**Source:** `08-05-SUMMARY.md:35-40` key-decisions + `09-04-SUMMARY.md:82-87` D3 block
```yaml
key-decisions:
  - "Staged-unexecuted, never green without logs: pkg-win11/pkg-macos cells record exact errors plus operator unblocks"
  - "Drill then restore: the live rebase proves the path, the pin decides the tree; adoption is a separate task with rebuilds"
```
Rule: anything not runnable here records (a) the exact command sequence, (b) the blocking condition, (c) the
operator unblock — never marked green without logs. Display/Nix-shell absence is environment evidence (staged),
never a product verdict. Every live-drill task opens with the `harness-display-available` pre-check + objdir
staleness probe (RESEARCH Open Questions 1–2).

### Derive-don't-hand-keep + self-test twins (applies to: any new registry row; citation discipline for all boxes)

**Sources:** `scripts/verify-registry-shape.mjs:15-34` + `scripts/verify-telemetry.mjs:197-262` +
`scripts/verify-rebranding-docs.mjs:8-28`
```js
// verify-registry-shape.mjs:23-30 — the rule statement to quote, not paraphrase:
 // * So the actual surface is DERIVED from the module's own source at check
 // * time and compared to the expected surface as a SET EQUALITY. That
 // * discriminates in both directions: an addition is a surplus, a removal is a
 // * shortfall, and both are reported by name. `--self-test` proves exactly
 // * that against a planted addition and a planted removal, rather than
 // * trusting it
```
```js
// verify-telemetry.mjs:88-94 — expectation derived at check time through the generator's own emitter:
    let expected;
    try {
        expected = JSON.parse(emitTheiaTelemetry(config, { id: 'dev' }));
```
```js
// verify-rebranding-docs.mjs:10-17 — schema-derived field list, never a kept copy:
 //  1. The documented-field list is the generator's own known-setting schema
 //     table -- scripts/lib/config-schema.json, the exact file
 //     scripts/generate.mjs reads as SCHEMA_KEYS and the same table that
 //     rejects unknown settings. A second hand-kept field list here would be
 //     the defect
```
Rule: expectations derive from the tree at check time and compare as set equality (go red on addition *and*
removal); every gate carries `--self-test` with planted faults that must go red naming the drift, control-green-first.
Never assert on the absence of a log line unless the emitter is proven (CLAUDE.md verification rules).

### Single registry, per-task sampling (applies to: all live-drill + sweep tasks)

**Source:** `scripts/verify-platform.sh:31-41` flags + `:52-54` append rule
```bash
# Adding a check means appending one row to the registry near the bottom of this
# file. It does NOT mean creating a sibling driver. That rule is the entire
# reason this consolidation was necessary.
```
```sh
scripts/verify-platform.sh --quick          # no build, no browser, no display — the commit gate
scripts/verify-platform.sh --only <label>   # exactly one check
scripts/verify-platform.sh                  # everything
scripts/verify-platform.sh --gate           # everything, plus the WINDOWS.md known-open exclusions
```
Sampling: per-task commit `--quick`; per-wave merge `--quick` + affected `--only` rows; phase gate `--quick` green +
all cited `--only` rows green before `/gsd-verify-work`. Phase 10 per-surface rows: `scan-brand-residue`,
`branding-preflight`, `generate-check`, `generated-byte-identity`, `gui04-registry-shape`, `telemetry`,
`extension-pins`, `theia-branding`, `theia-endpoints`, `icon-ihdr`, `installer-schema`, `verify-manifest-literals`,
`verify-rebranding-docs`, `verify-downstream-fixtures`, `mar-update-hop`, `installer-build-proof`,
`crash-collector`, `webextensions`, `verify-endpoints` (full-tier), `gui01-*` (full-tier).

### Telemetry drill contract (applies to: TEL-01/TEL-02 live drills in 10-02)

**Source:** `theia/extensions/telemetry/src/browser/telemetry-sender.ts:26-27,72-80,178-201`
```typescript
export const TELEMETRY_LEVELS = ['off', 'crash', 'error', 'all'] as const;
```
```typescript
function normalizeLevel(raw: unknown): TelemetryLevel {
    return (TELEMETRY_LEVELS as readonly string[]).includes(raw as string) ? (raw as TelemetryLevel) : 'off';
}

export function levelAllowsEvent(level: TelemetryLevel, kind: TelemetryEventKind): boolean {
    if (level === 'off') return false;
    if (kind === 'error') return true;
    return level === 'all';
}
```
Drill relies on: `off` drops before queueing; unrecognized level fails closed to off; never throws out of a telemetry
path; bounded queue (`maxQueueEvents` default 500). Unit suite `theia/extensions/telemetry/test/telemetry-sender.test.mjs`
(plain-node, zero-dependency). Live delivery target: loopback `scripts/crash-collector.mjs` round-trip —
`SUBMIT_PATH = '/submit'`, `MINIDUMP_PART_NAME = 'upload_file_minidump'` (crash-collector.mjs:54-57), verifier
independently re-proved 200 + CrashID + matching store record (09-VERIFICATION.md truths 5–8).

### Extension drill contract (applies to: EXT-01 live drill in 10-02)

**Source:** `scripts/verify-extension-pins.mjs:8-28` (three expectations derived at check time via `emitTheiaPlugins` +
`resolveConfig`, `generate.mjs:68` import) + `09-04-SUMMARY.md:152-157` drill-design decisions.
Pipeline order: fragment equality → block equality + version-segment rule → per-entry packed-archive sha256 naming the
entry id. Sidecar build is `theia build` direct over the assembled set (full `yarn build` wrapper re-runs stock
download and aborts on pack references by design). Staged drill twins take the drill prefix, never fixture ids
(09-04 deviation 1: shared id trips the absence sweep).

### Branding-literal proof contract (applies to: GEN-01/GEN-02/GEN-03 deltas + GUI-04 record-close in 10-01/10-02)

**Sources:** `scripts/verify-icon-ihdr.mjs:1-34` + `scripts/verify-rebranding-docs.mjs:1-34` +
`scripts/verify-registry-shape.mjs:47-71` + `theia/extensions/tab-uris/src/browser/browser-window-command.ts:14-25`
- GEN-01 delta: `node scripts/generate.mjs --check` + `--only generated-byte-identity` (52 files match);
  canonical form `display_name = "PowerBrowser"` (`configuration.toml:38`), expectations in
  `inventory/brand-tokens.json:77-81`, preflight derives from them.
- GEN-02 static half: `verify-icon-ihdr` reads PNG signature + IHDR per raster, ICO/ICNS container walk
  (byte-slice equality to rasters); pixel look stays human (03-UAT scenario 1 verbatim).
- GEN-03 delta: `--only installer-schema` (fixture-manifest root, `readTileColor(root)`).
- GUI-04 record-close: `--only gui04-registry-shape`; `EXPECTED_MEMBERS = ['getViewContribution','parseName',
  'createWidgetOptions','uriOf']` (registry-shape.mjs:66-71). Deliverable is a landability *statement* citing the
  green gate, not a new proof.
- GUI-01 affordance (no chrome-side command — ratified design, CLAUDE.md rule 5):
  `OPEN_BROWSER_WINDOW_COMMAND_ID = 'powerbrowser.open-browser-window'` (browser-window-command.ts:14),
  channel is `window.open(url,'_blank')` → `AppWindow::CreateNewContentWindow` → `BROWSER_CHROME_URL`.
- DOC-01 completeness half: `--only verify-rebranding-docs` (schema-derived field list + walkthrough command spans).

### Credit-don't-reprove + prose-form discipline (applies to: all record-close boxes + all new prose)

Credit policy: halves Phases 08/09 proved live close on record with evidence cited (08/09-VERIFICATION.md both
`passed`, staged items explicitly not gaps); only still-staged halves run. Re-running the MAR hop or release build
"for completeness" spends ~1 h and proves nothing — cite, don't redo. New prose: identifiers/canonical name use
`PowerBrowser`; user-facing copy keeps the spaced form per 01-UI-SPEC.md; no internal identifier in user-facing text
(pref key, sentinel, port, timeout, raw exception); every user-facing error names "Power Browser" + plain problem +
real on-screen next step. Residual-brand scan (`node scripts/scan-brand-residue.mjs`, staged-before-trust) must stay
green.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none — all Phase 10 files have exact analogs) | — | — | Phase 10 invents no machinery: every surface has a gate, a UAT sheet slot, or an archived proof (RESEARCH "routing, not construction"). The only arguably-novel paragraph (16-vs-15 reconciliation) is a record-close citing three in-tree pointers, not a new pattern. |

Live-drill runtime surfaces needing display/Nix shell have no *static* analog by definition — but their procedural
analogs exist: 09-04 tier-3 drill transcript (BUILD.md drill section + `.mozbuild/0904/` logs) for the drill path,
and the staged-with-unblock pattern above for the fallback. No RESEARCH.md-only fallback needed.

## Metadata

**Analog search scope:** `.planning/milestones/v1.0-phases/{01,03,04,06}/`, `.planning/milestones/v1.1-phases/{08,09}/`,
`scripts/verify-*.mjs`, `scripts/verify-platform.sh`, `scripts/crash-collector.mjs`,
`theia/extensions/telemetry/`, `theia/extensions/tab-uris/src/browser/`, `.planning/WINDOWS.md`,
`.planning/milestones/v1.0-REQUIREMENTS.md`
**Files scanned:** 20+ (4 UAT sheets, 2 phase VERIFICATIONs, 2 plan SUMMARYs, 1 prior PATTERNS, registry + 8 gates,
sender + suite, collector, window command, WINDOWS ledger, v1.0 outcomes table)
**Pattern extraction date:** 2026-09-05
