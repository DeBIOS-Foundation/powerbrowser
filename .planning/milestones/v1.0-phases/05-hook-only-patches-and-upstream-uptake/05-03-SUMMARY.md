---
phase: 05-hook-only-patches-and-upstream-uptake
plan: "03"
subsystem: patches
tags: [theia-pin, upstream-pins, pin-agreement, generate, re-pin, CFG-06, UPD-02]

# Dependency graph
requires:
  - phase: 05-hook-only-patches-and-upstream-uptake
    provides: 05-02 single-sourced ESR pin, verify-upstream-pins.mjs ESR half, registry rows, Acme-fixture precedent
provides:
  - Single-sourced Theia pin ([upstreams] theia_release + schema + validation)
  - Full-tree Theia agreement check (resolutions, members, lockfile) with planted-fault self-test
  - One-pin Theia re-pin procedure in docs/BUILD.md
affects: [05-04]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 7217
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [manifest-derived set-equality over package pins, line-wise yarn v1 lockfile stanza parsing, runtime-derived neighbour pins in self-tests]

key-files:
  created: []
  modified:
    - configuration.toml
    - scripts/lib/config-schema.json
    - scripts/generate.mjs
    - scripts/verify-upstream-pins.mjs
    - scripts/verify-extension-pins.mjs
    - docs/BUILD.md

key-decisions:
  - "theia_release is schema-required (masked from defaults): a downstream states its own Theia release, never inherits this project's"
  - "Fixture value is 0.0.0: shape-valid, obviously a fixture, can never be a real release"
  - "Generator emits nothing new (GEN-04): package.json files are committed build input, so the check enforces and the manifest declares"
  - "Lockfile asserts the stanza version only: header ranges and transitive constraint lines are upstream-authored, not our declarations"
  - "App's own version 1.74.1 stays out of the check: it is not a @theia/* pin, it is a convention mirror nothing consumes"
  - "No new registry rows: the extended script rides the two rows 05-02 registered"

patterns-established:
  - "Pin agreement by parsing committed inputs: resolutions, member manifests and lockfile stanzas read at check time, set-equality both directions, every drift names its file"

requirements-completed: [CFG-06, UPD-02]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Theia pin declared once in configuration.toml with schema validation and generator enforcement"
    requirement: "CFG-06"
    verification:
      - kind: other
        ref: "node scripts/generate.mjs --check (52 files, green)"
        status: pass
      - kind: other
        ref: "node scripts/generate.mjs --self-test (39 cases green)"
        status: pass
      - kind: other
        ref: "unset-pin probe fails naming upstreams.theia_release; 1.74-shape probe fails naming the triple rule"
        status: pass
    human_judgment: false
  - id: D2
    description: "Agreement check green on shipped tree, red on both Theia planted faults, ESR plants still red"
    requirement: "UPD-02"
    verification:
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs (Theia pin 1.74.1 across resolutions, 6 members, lockfile)"
        status: pass
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs --self-test (4 plants red naming the file)"
        status: pass
    human_judgment: false
  - id: D3
    description: "One-pin re-pin procedure documented as exact commands; core-untouched posture preserved"
    requirement: "UPD-02"
    verification:
      - kind: other
        ref: "procedure pin-apply step dry-run: 7 files clean, zero writes; JSON round-trip identical on sampled files"
        status: pass
      - kind: other
        ref: "bash scripts/diff-theia-core.sh --quick (yarn absent outside nix shell)"
        status: unknown
    human_judgment: true
    rationale: "The core-untouched proof needs yarn from nix develop .#theia; no automated run was possible in this environment, so a human must see the green run"
  - id: D4
    description: "Full static gate set green with no new rows"
    requirement: "CFG-06"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick (81 PASS, 0 FAIL)"
        status: pass
      - kind: other
        ref: "node scripts/scan-brand-residue.mjs via --quick (PASS, procedure prose carries no brand token)"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-09-04
status: complete
---

# Phase 05 Plan 03: Single-Source Theia Pin Summary

**Theia release declared once as `theia_release = "1.74.1"`, enforced by a manifest-derived agreement check over resolutions, all six member manifests and the lockfile, with the re-pin procedure documented and never touching core**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-04T08:25:40Z
- **Completed:** 2026-09-04T08:34:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `[upstreams] theia_release` in the manifest (live pin 1.74.1, unbumped), schema-required numeric triple, validated by the generator's existing required/shape loops
- `verify-upstream-pins.mjs` Theia half: resolutions plus every member `applications/*/package.json` and `extensions/*/package.json` (all four dep blocks) plus every `@theia` lockfile stanza version must equal the manifest pin, `@theia/monaco-editor-core` excluded by exact name everywhere
- Self-test grows two in-memory Theia plants (patch-bumped member pin, drifted lockfile stanza); all four plants go red naming the file, clean tree is the control
- `docs/BUILD.md` carries the one-pin re-pin procedure as exact commands (manifest edit, manifest-driven pin apply, `yarn install --ignore-scripts`, generate, verify, full diff-theia-core) plus the never-do list
- Full `--quick` green: 81 PASS, 0 FAIL, with the two existing pin rows covering both halves

## Task Commits

Each task was committed atomically:

1. **Task 1: Declare theia_release and extend the agreement check over the Theia tree** - `783c002` (feat)
2. **Task 2: Document the one-pin re-pin procedure and prove core untouched** - `6c04960` (docs)

**Plan metadata:** final docs commit follows (gsd-tools query commit)

## Files Created/Modified
- `configuration.toml` - New `theia_release = "1.74.1"` under `[upstreams]` with the two-pin section comment
- `scripts/lib/config-schema.json` - `upstreams.theia_release`: required, `^[0-9]+\.[0-9]+\.[0-9]+$`, example `9.9.9`
- `scripts/generate.mjs` - FIXTURE_BASE carries `theia_release = "0.0.0"`; no new TARGETS row (52 targets unchanged, GEN-04)
- `scripts/verify-upstream-pins.mjs` - Theia half: steps 5-7, stanza parser, two self-test plants, shared tracked-set derivation
- `scripts/verify-extension-pins.mjs` - Synthetic fixture states the new required key (Rule 3 fix, see deviations)
- `docs/BUILD.md` - One-pin re-pin procedure subsection with validated commands and the never-do list

## Decisions Made
- Pin is schema-`required: true`, so D-06 masking strips it from the defaults layer exactly like the ESR tag: a downstream that omits `[upstreams]` hard-fails rather than silently composing Power Browser's Theia release. A pin is identity-class, not a cosmetic default.
- Fixture value `0.0.0`: the numeric-triple equivalent of 05-02's `ACME_1_2_3esr_RELEASE` — shape-valid, obviously a fixture, and can never collide with a real Theia release the way a plausible triple could.
- The generator emits no new fragment: `package.json` files are committed build input, so rewriting them from the generator would break the GEN-04 boundary. The manifest declares, this check enforces. Target count stays 52 in every count comment.
- The lockfile assertion covers the stanza `version` field only. Header ranges mirror the request and transitive constraint lines are upstream-authored tarball content; asserting either would conflate our declarations with upstream's.
- The application manifest's own `"version": "1.74.1"` is out of the check: it is not a `@theia/*` pin but the app's own version mirroring the release by Theia-app convention, consumed by nothing as a pin. The re-pin procedure leaves it.
- No `verify-platform.sh` change: the plan's files_modified listed it conditionally ("add distinct --only labels only if the script exposes them"), and the Theia half rides the two rows 05-02 registered — both proven green with the extended script (`--only` runs pass).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extension-pins synthetic fixture went red on the new required key**
- **Found during:** Task 1 (post-edit `--quick` row verification)
- **Issue:** `verify-extension-pins.mjs --self-test` builds a full synthetic manifest with an `[upstreams]` section carrying only the ESR tag; the new required key made its green control red (`upstreams.theia_release is not set`), same failure class as 05-02 deviation 1
- **Fix:** Added `theia_release = "0.0.0"` to the synthetic manifest — the zero triple keeps it obviously a fixture
- **Files modified:** scripts/verify-extension-pins.mjs
- **Verification:** Its `--self-test` and main check both PASS again
- **Committed in:** 783c002 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the plan's own done criteria (green `--quick`). No scope creep: no behavior change, fixture-only edit. Telemetry/branding/endpoints checkers needed nothing — their checks resolve the shipped manifest and inherit the new section.

## Issues Encountered
- `yarn` is unavailable outside `nix develop .#theia`, so `diff-theia-core.sh --quick` cannot run here (stage 1 shells out to `yarn check --integrity`). `theia/node_modules/@theia` IS present (49 packages), so this is a toolchain-presence gap, not a missing-install gap. Recorded as open verification below; no install attempted per the static-only hard rule.

## Single-Source Proof (plan verification item 3)
- `theia_release` as a key is declared once: `configuration.toml:108` (authoritative). Every other occurrence is schema shape (`config-schema.json`), a `0.0.0` fixture (`generate.mjs`, `verify-extension-pins.mjs`), doc prose (`BUILD.md`, placeholder `<new-triple>`), or the checker reading the dotted path at check time. No second declaration.
- The version string `1.74.1` appears in exactly: `configuration.toml` (declaration), the seven package manifests (`@theia/*` pins plus the app's own convention-mirror version), `theia/yarn.lock` (resolved tarballs), and prose citations that nothing consumes (source-read notes in `generate.mjs`, `verify-platform.sh`, two extension sources, one inventory reason). The neighbor `1.74.2` appears nowhere tracked — both self-test plants derive it at runtime.
- Nothing else in the tree states the release independently.

## Known Stubs
None - stub-pattern grep over the full plan diff is clean.

## Threat Flags
None - no new network endpoints, auth paths, file-access patterns, or schema changes at trust boundaries. T-05-06 mitigated: manifest-derived set-equality over resolutions, members and lockfile fails naming the file in either drift direction, with the monaco exception keyed on the exact package name. T-05-05 posture unchanged: committed lockfile with integrity hashes untouched by this plan; stage-1/stage-2 proof is the open item below, not a new gap.

## Open Verification
- `bash scripts/diff-theia-core.sh --quick` (stage 1) and full stage 2: BLOCKED on toolchain, not on tree state. Requires `yarn` from `nix develop .#theia`. Next step when a shell is available: `bash scripts/diff-theia-core.sh` (full) — the fresh install it performs doubles as the re-pin procedure's step-5 proof shape.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CFG-06 complete (ESR half 05-02, Theia half here); UPD-02 complete structurally — a release is adopted by editing one pin and running the documented sequence, with core neither forked nor patched
- The live bump drill (05-04) runs through this wiring: edit one pin, apply, re-resolve, regenerate, verify
- Blocker: none for planning; the diff-theia-core green run belongs to the first environment with yarn (05-04's live drill covers it structurally)

## Self-Check: PASSED
- All modified files exist on disk (manifest section, schema key, fixture lines, checker steps, procedure subsection).
- All task commits exist: 783c002, 6c04960.

---
*Phase: 05-hook-only-patches-and-upstream-uptake*
*Completed: 2026-09-04*
