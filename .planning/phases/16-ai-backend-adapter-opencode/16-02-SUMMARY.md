---
phase: 16-ai-backend-adapter-opencode
plan: 02
subsystem: ai-backend
tags: [opencode, presets, change-set, history, revert, gated-review]

# Dependency graph
requires:
  - phase: 16-ai-backend-adapter-opencode
    provides: [supervised ACP tracer with stage-from-ask gated review (16-01)]
provides:
  - Per-session gated/auto-accept preset defaulting to gated
  - Mandatory ordered history with working revert on both presets
  - Preset-plus-history gate with R3 backstop held out as STAGED
affects: [16-03 bridge plus selection wiring]

# Actuals
actuals:
  tokens: 19000
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: [@theia/ai-chat-ui 1.74.1 (extension dep; root resolutions already pinned)]
  patterns: [agent-driven apply-all for auto-accept (backend stays gated-always), fault-the-dependency gate self-tests, STAGED holdout with live rerun]

key-files:
  created:
    - theia/extensions/backend-opencode/src/browser/opencode-preset-commands.ts
    - theia/extensions/backend-opencode/src/browser/opencode-preset-contribution.ts
    - scripts/verify-opencode-presets.mjs
  modified:
    - theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts
    - theia/extensions/backend-opencode/src/node/opencode-changeset-emitter.ts
    - theia/extensions/backend-opencode/src/browser/opencode-chat-agent.ts
    - theia/extensions/backend-opencode/src/common/opencode-service.ts
    - theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts
    - scripts/verify-platform.sh

key-decisions:
  - "Auto-accept is agent-driven apply-all at turn end: the supervisor stays gated-always (stage plus reject), so the 16-01 double-write fix is untouched"
  - "Preset model lives in the pure commands file so the gate exercises the shipped store in plain node; the contribution owns only DOM-side wiring"
  - "History is written before disk in accept: history-write failure blocks the apply (historyWriteFailure guard)"
  - "R3 revert-under-concurrent-edits stays STAGED with a real --live-backstop driver, mirroring the soak --live precedent"

patterns-established:
  - "Preset selection in the frontend agent: backend never auto-applies, safe direction on any frontend/backend disagreement"
  - "Gate self-tests fault the instrument's dependency (stub lib overrides) for behavioral checks that cannot mutate source"
  - "Comment-stripped absence asserts for prohibition checks, so docs may name the forbidden APIs"

requirements-completed: [AI-02, AI-03]

# Coverage metadata
coverage:
  - id: D1
    description: "Per-session gated/auto-accept toggle defaulting to gated, surfaced in the chat header"
    requirement: "AI-03"
    verification:
      - kind: unit
        ref: "node scripts/verify-opencode-presets.mjs (default-gated plus explicit-action-only fixtures against compiled lib)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mandatory ordered history with working revert on both presets, supersede plus stale-refuse plus fallback"
    requirement: "AI-03"
    verification:
      - kind: unit
        ref: "node scripts/verify-opencode-presets.mjs (history/emission order, supersede, stale-refuse, historyWriteFailure, redaction, fallback, revert fixtures)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Gated staged review preserved on the extended emitter (16-01 contract intact)"
    requirement: "AI-02"
    verification:
      - kind: e2e
        ref: "node scripts/verify-opencode-tracer.mjs including mandatory live ACP probe, via scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false
  - id: D4
    description: "Revert-after-concurrent-external-edit end-to-end through live session surfaces"
    verification: []
    human_judgment: true
    rationale: "Held-out R3 backstop by plan design: engine half proven behaviorally, end-to-end needs the live driver (rerun: node scripts/verify-opencode-presets.mjs --live-backstop)"

# Metrics
duration: ~20min
completed: 2026-09-06
status: complete
---

# Phase 16 Plan 02: Presets Plus Mandatory History Summary

**Per-session gated/auto-accept toggle defaulting to gated, mandatory ordered history with revert on both presets, enforced by a preset gate with the R3 backstop held out**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-06T07:05:00Z (approx)
- **Completed:** 2026-09-06T07:24:00Z
- **Tasks:** 3 completed
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- Chat-header preset toggle: two labelless commands with named id consts,
  per-session store (gated default, explicit opt-in only, zero persistence),
  toolbar items scoped to ChatViewWidget.ID, static binds beside Task-01 binds
- Mandatory history on both presets: append order equals apply order,
  latest-supersedes (marked, never merged), stale-refuse preserving the
  proposal, historyWriteFailure blocking the apply, D-03 fallback recording
  without writing, working revert with concurrent-edit refusal
- Auto-accept writes without a click via agent turn-end apply-all while the
  supervisor stays gated-always, so the 16-01 double-write fix is untouched
- Preset gate green with five-plant self-test; R3 backstop STAGED with a
  real --live-backstop driver; full quick green including the 16-01 tracer

## Task Commits

1. **Task 1: Per-session preset toggle defaulting to gated** - `3cf30dc` (feat)
2. **Task 2: Mandatory history plus revert with ordering, supersede, conflict, and fallback** - `4b819be` (feat)
3. **Task 3: Preset gate plus R3 backstop held-out test** - `7b00184` (feat)
4. **Fixup: verified final states of preset files plus gate** - `ac017fe` (fix, Rule 1; see deviation 4)

## Files Created/Modified

- `theia/extensions/backend-opencode/src/browser/opencode-preset-commands.ts` - Preset ids, labelless commands, per-session store, session resolver (pure, node-loadable)
- `theia/extensions/backend-opencode/src/browser/opencode-preset-contribution.ts` - Command plus chat-header toolbar contributions
- `theia/extensions/backend-opencode/src/browser/backend-opencode-frontend-module.ts` - Static store/command/toolbar binds
- `theia/extensions/backend-opencode/src/node/opencode-changeset-emitter.ts` - History, supersede, stale-refuse, historyWriteFailure, revert, fallback
- `theia/extensions/backend-opencode/src/browser/opencode-chat-agent.ts` - Auto-accept apply-all plus history-aware revert (Rule 3)
- `theia/extensions/backend-opencode/src/common/opencode-service.ts` - revertApplied plus preset param plus NO_APPLIED_HISTORY (Rule 3)
- `theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts` - revertApplied pass-through (Rule 3)
- `theia/extensions/backend-opencode/package.json` - @theia/ai-chat-ui dep (resolutions already pinned; lockfile unchanged)
- `scripts/verify-opencode-presets.mjs` - Preset gate (862 lines)
- `scripts/verify-platform.sh` - `ai-opencode-presets` plus self-test rows

## Decisions Made

- Agent-driven auto-accept (turn-end apply-all) over supervisor routing:
  the supervisor never auto-applies, so approval still cannot gate disk the
  wrong way and the 16-01 stage-from-ask-then-reject fix stands untouched.
  Disagreement between frontend preset and backend defaults to the safe
  direction (staged, unwritten).
- Preset model in the pure commands file: the first compiled cut of the
  contribution pulled lumino DOM at require time, so the store, preset
  type, default const, and session resolver moved to the dependency-free
  commands module; the contribution keeps only browser wiring.
- History-before-disk in acceptStaged: the historyWriteFailure guard blocks
  the write when the record fails, so no edit ever lands without history.
- R3 backstop dual-mode: default prints STAGED plus the exact rerun and
  exits clean; --live-backstop runs the real one-hunk scenario (refusal
  plus clean restore) and fails naming drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Selection plus revert wiring needed three unlisted files**
- **Found during:** Task 2 (acceptance "auto-accept writes without click"
  and "working revert" are unreachable from the emitter alone)
- **Issue:** Plan files list the emitter only, but the preset has to select
  a path somewhere and revert has to cross the JSON-RPC channel. Smallest
  complete cut: chat agent (apply-all on auto-accept, history-aware
  revert), service interface (revertApplied, optional preset params,
  NO_APPLIED_HISTORY sentinel), supervisor (4-line pass-through).
- **Fix:** Agent reads its session preset after attachStagedElements and
  applies in turn order; element revert drops staged then reverts applied;
  supervisor passes revertApplied to the emitter unchanged.
- **Files modified:** opencode-chat-agent.ts, opencode-service.ts, opencode-acp-supervisor.ts
- **Verification:** Preset gate key-link asserts plus full quick green with
  the 16-01 tracer rows passing on the extended tree
- **Committed in:** 4b819be (part of task commit)

**2. [Rule 3 - Blocking] @theia/ai-chat-ui dep for ChatViewWidget.ID**
- **Found during:** Task 1 (toolbar must target the chat header honestly,
  not via a hand-kept widget-id string)
- **Issue:** ChatViewWidget.ID lives in @theia/ai-chat-ui, not a current dep.
- **Fix:** Added the exact-1.74.1 dep line (tab-uris precedent; root
  resolutions already pinned, so yarn.lock is unchanged); contribution
  references ChatViewWidget.ID, and the gate derives the expected id from
  the installed tree at check time.
- **Files modified:** theia/extensions/backend-opencode/package.json
- **Verification:** Extension builds in the Nix theia shell; integrity sync
- **Committed in:** 3cf30dc (part of task commit)

**3. [Rule 1 - Bug] Gate Write truncated mid-payload; shared-root fixture collision**
- **Found during:** Task 3 (gate authoring and first run)
- **Issue:** (a) The single-Write gate file truncated at line 365, leaving
  a literal truncation marker; (b) the emission-order fixture reused
  filenames whose bytes a prior fixture had already applied, tripping
  zero-edit silence and staging nothing.
- **Fix:** (a) Removed the marker and rebuilt the remainder incrementally
  in five sentinel edits; (b) gave the emission fixture dedicated filenames.
- **Files modified:** scripts/verify-opencode-presets.mjs
- **Verification:** node --check plus gate, self-test, and live-backstop green
- **Committed in:** 7b00184 (part of task commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bug)
**Impact on plan:** All four required for the acceptance criteria; no scope
creep: no /mcp endpoint, no selection wiring, no history widget (all 16-03).

**4. [Rule 1 - Bug] Index/worktree split left two task commits stale**
- **Found during:** Post-commit tree check before the docs commit (staged
  `git status` showed the Task-1 and gate files still modified)
- **Issue:** `git commit` records the index, not the working tree, and two
  follow-up edit rounds were never re-staged: 3cf30dc holds the
  pre-restructure Task-1 sources (self-consistent, built green at the
  time), and 7b00184 holds the gate script truncated mid-rebuild (fails
  `node --check`). The verified-green tree existed only in the working
  tree. 4b819be was checked and is complete.
- **Fix:** Staged the exact verified working tree and committed as ac017fe
  (new commit, never amend); re-proved build, gate, self-test, and full
  quick on the committed state afterward.
- **Files modified:** opencode-preset-commands.ts,
  opencode-preset-contribution.ts, backend-opencode-frontend-module.ts,
  scripts/verify-opencode-presets.mjs (staging only, no new edits)
- **Verification:** Full `verify-platform.sh --quick` green after ac017fe,
  including both tracer and both preset rows
- **Committed in:** ac017fe

## Issues Encountered

- Full `--quick` shares the tree with a concurrent phase-15 docs agent
  (visible in git log); all three full passes in this plan went green first
  try. No flakes observed this wave.
- `scripts/diff-theia-core.sh --quick` must run through `nix develop
  .#theia` (yarn lives there only); bare invocation fails on stage 1.
  Same for `yarn install`: it must run with cwd `theia/`, not the repo root.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 16-03 (bridge plus selection) builds on: preset store per-session
  ids, history entries tagged by preset and via-path, `recordExternalApply`
  fallback for backend-side writes, supervisor pass-through shape
- Open contract note for 16-03: auto-accept immediacy is turn-end, not
  per-edit streaming; a delegated write arriving after the turn closes
  stages safely-unapplied under auto-accept (safe direction, surfaced on
  next accept, never silent disk write)
- Held-out R3 backstop rerun: `node scripts/verify-opencode-presets.mjs
  --live-backstop` (currently passing on demand)

---
*Phase: 16-ai-backend-adapter-opencode plan 02*
*Completed: 2026-09-06*

## Self-Check: PASSED

- All created files exist on disk; all three commits resolve in git log
- `node scripts/verify-opencode-presets.mjs` PASS (STAGED backstop + PASS)
- `--self-test` PASS (all five plants red), `--live-backstop` PASS
- Sampled rows `ai-opencode-presets` / `ai-opencode-presets-self-test` PASS
- `scripts/diff-theia-core.sh --quick` PASS, path space-free,
  `scripts/verify-platform.sh --quick` PASS (tracer rows included)
