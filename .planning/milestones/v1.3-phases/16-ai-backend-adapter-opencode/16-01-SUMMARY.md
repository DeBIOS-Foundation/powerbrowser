---
phase: 16-ai-backend-adapter-opencode
plan: 01
subsystem: ai-backend
tags: [opencode, acp, theia, chat-agent, changeset, stdio-supervision]

# Dependency graph
requires:
  - phase: 14-modes-windows-setups
    provides: [composed extension pattern, verify-platform registry conventions]
provides:
  - Supervised `opencode acp` tracer with 1:1 chat-to-ACP session mapping
  - Gated intercept-then-record staging (stage-from-ask, accept/reject)
  - Mechanical tracer gate with mandatory live ACP probe
affects: [16-02 presets plus history, 16-03 bridge plus selection wiring]

# Actuals
actuals:
  tokens: 0
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: [@agentclientprotocol/sdk 1.4.0]
  patterns: [ACP stdio supervision with die-with-parent plus bounded restart, stage-from-ask Change Set emission, EXPECTED-set gate with live binary probe]

key-files:
  created:
    - theia/extensions/backend-opencode/src/node/opencode-acp-supervisor.ts
    - theia/extensions/backend-opencode/src/browser/opencode-chat-agent.ts
    - theia/extensions/backend-opencode/src/node/opencode-changeset-emitter.ts
    - theia/extensions/backend-opencode/src/common/opencode-service.ts
    - scripts/verify-opencode-tracer.mjs
  modified:
    - theia/extensions/backend-opencode/package.json
    - theia/package.json
    - theia/applications/browser/package.json
    - theia/yarn.lock
    - scripts/verify-platform.sh

key-decisions:
  - "Stage-from-ask then reject: live probe proved selected/once lets opencode 1.18.25 double-write disk, so approval cannot gate; edit asks stage from the ask diff and reply cancelled"
  - "Supervisor spawns with inherited (pre-scrubbed) env and reads secrets only via POWERBROWSER_ENV; zero process.env in the file"
  - "Probe authors its own opencode.json (edit:ask) in a mkdtemp cwd and never touches user configuration"

patterns-established:
  - "ACP client over NDJSON stdio with node builtins, SDK used for the protocol-version pin"
  - "Gate behavioral tests run against the compiled extension lib, not a reimplementation"
  - "Live-binary probe is mandatory: absent binary fails, unacted edit turns fail"

requirements-completed: [AI-01, AI-02, AI-04]

# Coverage metadata
coverage:
  - id: D1
    description: "@OpenCode chat round-trip with 1:1 session mapping over supervised ACP stdio"
    requirement: "AI-01"
    verification:
      - kind: e2e
        ref: "node scripts/verify-opencode-tracer.mjs (live probe: 4 prompts one sessionId, new chat new sessionId, no session/load)"
        status: pass
    human_judgment: false
  - id: D2
    description: "One-file gated review: stage with diff, accept writes exact bytes, reject leaves byte-identical, zero-edit creates no entry"
    requirement: "AI-02"
    verification:
      - kind: unit
        ref: "compiled emitter lib behavioral checks inside verify-opencode-tracer.mjs (accept/reject/stale/zero-edit exercised)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Extension-only packaging with no core edits and quick gate green"
    requirement: "AI-04"
    verification:
      - kind: other
        ref: "scripts/diff-theia-core.sh --quick plus scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false

# Metrics
duration: ~2h
completed: 2026-09-06
status: complete
---

# Phase 16 Plan 01: Supervised ACP Tracer Summary

**Selectable @OpenCode agent over a stdio-supervised `opencode acp` child with stage-from-ask gated review, enforced by a live-probe gate**

## Performance

- **Duration:** ~2h (includes empirical binary probing that reshaped the design)
- **Tasks:** 3 completed
- **Files modified:** 12 (7 ext skeleton/composition, 4 tracer impl, 2 gate)

## Accomplishments

- Extension skeleton composed per tab-uris pattern, building clean in the Nix theia shell
- End-to-end tracer: ChatAgent id `OpenCode`, JSON-RPC path `/services/opencode`, supervised child, stable per-chat backend session
- Gated one-file review with accept-exact/reject-identical/stale-refused/zero-edit-empty proven against shipped code
- Tracer gate green including the mandatory live probe (43s) and a four-plant self-test

## Task Commits

1. **Task 1: Extension skeleton plus sidecar composition** - `5318fea` (feat)
2. **Task 2: Supervised ACP tracer with gated one-file review** - `43eb400` (feat)
3. **Task 2 fix: stage-from-ask then reject (Rule 1)** - `c4fbdc5` (fix)
4. **Task 3: Tracer gate with mandatory live ACP probe** - `d2c4e70` (feat)

## Files Created/Modified

- `theia/extensions/backend-opencode/*` - Extension (package, tsconfig, 2 modules, service, supervisor, agent, emitter)
- `theia/package.json` - build:extensions clause
- `theia/applications/browser/package.json` - composition dependency line
- `theia/yarn.lock` - workspace plus SDK pin
- `scripts/verify-opencode-tracer.mjs` - Tracer gate (657 lines)
- `scripts/verify-platform.sh` - `ai-opencode-tracer` plus self-test rows

## Decisions Made

- Stage-from-ask then reject (see deviations): the only gating point that holds on 1.18.25
- Inherited (pre-scrubbed) spawn env plus POWERBROWSER_ENV-only reads: no secret or watchdog marker can reach the child
- Probe self-containment: own mkdtemp cwd plus own opencode.json; user config never read or written (also respects the user's opencode permission rules, which deny external reads of its config paths)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Approval double-write: stage-from-ask then reject**
- **Found during:** Task 3 live probing (before the gate was written)
- **Issue:** Replying `selected/once` to an edit ask makes opencode 1.18.25 write the file to disk itself after the delegated `fs/write_text_file` returns. The planned approve-then-stage path would have written disk pre-accept, violating R2. The ask itself already carries the full diff, and replying `cancelled` ends the turn normally with disk untouched (both proven live).
- **Fix:** Emitter stages from the ask diff payload and returns `reject`; supervisor extracts toolCall kind/content and passes staging context; `writeTextFile` kept as an idempotent safety net. Resolves research open unknown #1 (core double-writes: yes).
- **Files modified:** opencode-changeset-emitter.ts, opencode-acp-supervisor.ts
- **Verification:** Behavioral checks against compiled lib (ask stages plus rejects with no disk write; accept writes exact bytes) plus live-probe cancelled-ask assertion
- **Committed in:** c4fbdc5

**2. [Rule 3 - Blocking] package.json plus lockfile updated in Task 2**
- **Found during:** Task 2 (supervisor needs WorkspaceServer for the workspace-root handoff)
- **Issue:** `@theia/workspace` was not in the Task 1 dependency set; its resolutions pin pre-exists so no root manifest change was needed, but the install had to re-run.
- **Fix:** Added the dep line, re-ran `yarn install --ignore-scripts`, staged package.json plus yarn.lock with the six task files
- **Committed in:** 43eb400

**3. [Rule 3 - Blocking] Stale `generated/` tree regenerated (pre-existing)**
- **Found during:** Task 2 verification (`verify-platform.sh --quick` red on generate/telemetry/branding rows)
- **Issue:** `generated/` (gitignored) dated Sep 5 disagreed with `configuration.toml`; stale output, untouched by this plan. Fixture post-restore checks cascaded red from it.
- **Fix:** Ran `node scripts/generate.mjs` (mechanical regeneration, no source change); full quick green after
- **Committed in:** n/a (gitignored output)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** Deviation 1 is the load-bearing correctness fix of this plan; 2-3 are mechanical. No scope creep: no presets, history UI, /mcp endpoint, or configuration.toml selection added.

## Issues Encountered

- Full `--quick` flakes twice on rows that pass standalone (`verify-downstream-fixtures`, `verify-upstream-pins`); both green on re-run and on the final full pass. A concurrent phase-14 agent is committing in the same tree (visible in git log), which plausibly explains transient cross-row interference. No action taken beyond re-running to green.
- The user's opencode permission rules deny external reads of its config paths; the probe was designed to never need them (own config in mkdtemp).

## Threat Flags

None beyond the register: T-16-01-01 (clamp plus behavioral test), T-16-01-02 (redact plus behavioral test), T-16-01-03 (no host-env reads, inherited pre-scrubbed env), T-16-01-04 (die-with-parent plus bounded restart plus exit 78), T-16-01-SC (sole registry add is the pinned ACP SDK 1.4.0; legitimacy: version confirmed via npm registry metadata, `npm view` 1.4.0, installed bytes used by the build and the probe).

## User Setup Required

None - no external service configuration required. The live probe uses the already-installed `opencode` 1.18.25 and its existing login; no keys were handled.

## Next Phase Readiness

- Plan 16-02 (presets plus history) builds on: permission-verdict log, staged-entry queue with status lifecycle, `handlePermissionResponse` stub on the service
- Plan 16-03 (bridge plus selection) builds on: per-spawn child env site (currently inherit-only), workspace-root resolution, serve-attach fallback comment
- Open contract note for 16-02: auto-accept preset cannot mean "reply selected" on 1.18.25 (double-write bypasses review AND history ordering); it must mean stage-then-immediately-apply with history write, or a pinned-binary behavior change

---
*Phase: 16-ai-backend-adapter-opencode plan 01*
*Completed: 2026-09-06*

## Self-Check: PASSED

- All created files exist on disk; all four commits resolve in git log
- `node scripts/verify-opencode-tracer.mjs` PASS, `--self-test` PASS
- Sampled rows `ai-opencode-tracer` / `ai-opencode-tracer-self-test` PASS
- `scripts/diff-theia-core.sh --quick` PASS, path space-free, `scripts/verify-platform.sh --quick` PASS
