---
phase: 05-hook-only-patches-and-upstream-uptake
plan: "01"
subsystem: patches
tags: [moz.configure, patch-stack, generate, check-patch-surface, byte-identity, MIG-05]

# Dependency graph
requires:
  - phase: 03-firefox-branding-emitter-and-icon-pipeline
    provides: generated/identity.configure emitter and include-hook patch shape
  - phase: 01-platform-extraction-and-rename
    provides: verify-platform.sh registry, residual-brand gate, preflight check 5
provides:
  - Hook-only 010 patch (include + comments, no value literals)
  - Manifest-derived brand-value scan with planted-fault self-test
  - Byte-identity comparand gating the relocated fragment lines
affects: [05-02, 05-03, 05-04]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 6056
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [manifest-derived value set with path-aware boundaries, tracked comparand for untracked generated artifacts]

key-files:
  created:
    - powerbrowser/identity.configure.comparand
  modified:
    - patches/010-powerbrowser-identity.patch
    - scripts/generate.mjs
    - scripts/check-patch-surface.sh
    - scripts/verify-generated-identity.mjs
    - scripts/verify-platform.sh
    - inventory/brand-tokens.json

key-decisions:
  - "MOZ_APP_ID GUID stays as untouched stock context: the audit proved it was never a patch-carried +line, so relocating it would be churn with a second source for one fact"
  - "Deleted stock True lines are replaced by pointer comments rather than restored: the fragment is the single source, with no rely on later-imply_option-wins ordering"
  - "Brand-value boundaries treat / . - as identifier continuations so hook paths (DIRS) stay green while quoted values go red"
  - "Relocated fragment gated by a tracked byte-identity comparand (auto drift-plant row), not a preflight string assertion"
  - "Residue-scan count moves recorded in inventory with rationale (UA_NAME 4->5, APP_ID 2->4) per the 01-08/03-04 precedent"

patterns-established:
  - "Manifest-derived scan set: required identity/product/legal strings read via the vendored parser at check time, so a rebrand moves the scan with it"
  - "Tracked comparand for untracked generated files: frozen emission bytes committed once, drift goes red naming the file"

requirements-completed: [MIG-05]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "010 patch is include-hook plus comments only; 020 proven hook-only by audit"
    requirement: "MIG-05"
    verification:
      - kind: automated_ui
        ref: "bash scripts/apply-patches.sh --self-test"
        status: pass
      - kind: other
        ref: "grep -E '^[+]' patches/*.patch (added-line audit: comments + include/DIRS only)"
        status: pass
    human_judgment: false
  - id: D2
    description: "identity.configure emitter carries the relocated telemetry-policy lines as fixed platform content"
    requirement: "MIG-05"
    verification:
      - kind: other
        ref: "node scripts/generate.mjs --check"
        status: pass
      - kind: other
        ref: "node scripts/verify-generated-identity.mjs (34 files byte-identical)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Brand-value mode rejects a planted display-name offender by name and passes the shipped stack"
    requirement: "MIG-05"
    verification:
      - kind: other
        ref: "bash scripts/check-patch-surface.sh --self-test"
        status: pass
    human_judgment: false
  - id: D4
    description: "New registry rows green; full static gate set green"
    requirement: "MIG-05"
    verification:
      - kind: other
        ref: "scripts/verify-platform.sh --quick (75 PASS, 0 FAIL)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-04
status: complete
---

# Phase 05 Plan 01: Hook-Only Patches Summary

**010 stripped to include-hook plus comments with its telemetry values relocated into the generated fragment, guarded by a manifest-derived brand-value scan and a byte-identity comparand**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-04T07:50:46Z
- **Completed:** 2026-09-04T08:02:49Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- 010 patch regenerated from the patched tree via git diff: +lines are comments plus the single include hook; the two hardcoded False lines are gone
- generated/identity.configure emitter carries the relocated lines as FIXED platform content (no new manifest keys), with the fixed-vs-configured ruling recorded in the emitter comment
- check-patch-surface.sh gained a brand-value mode that derives its set from configuration.toml at check time, with planted-fault self-test rows and the shipped stack as clean control
- Relocated fragment lines byte-identity gated through a tracked comparand, with an automatic one-byte-drift plant row
- Full static gate set green: verify-platform.sh --quick 75 PASS, 0 FAIL

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit the stack and relocate 010's value literals into generated/** - `3a2dc27` (refactor)
2. **Task 2: Give check-patch-surface.sh a brand-value mode with self-test** - `517df41` (feat)
3. **Task 3: Register rows and run the static gate set** - `fb6aa09` (feat)

**Plan metadata:** final docs commit follows (gsd-tools query commit)

## Files Created/Modified
- `patches/010-powerbrowser-identity.patch` - Hook-only identity patch: -3 value lines (2x True, VENDOR Mozilla), +comments + include; APP_ID untouched stock context
- `scripts/generate.mjs` - emitIdentityConfigure emits the two fixed telemetry lines, carrier banner per WR-05, ruling comment; TARGETS row gains tracked comparand
- `powerbrowser/identity.configure.comparand` - NEW: frozen emission bytes, byte-identity comparand (not a build input)
- `scripts/check-patch-surface.sh` - Brand-value mode (--brand-values), brand self-test (--self-test-brand), unknown-arg rejection
- `scripts/verify-generated-identity.mjs` - EXPECTED +1 with comparand paragraph; prose updated for the one declared exception
- `scripts/verify-platform.sh` - check-patch-surface-brand-values + self-test rows
- `inventory/brand-tokens.json` - UA_NAME 4->5, APP_ID 2->4 with COUNT MOVED rationale (not in plan files_modified; required by the permanent gate)

## Decisions Made
- MOZ_APP_ID GUID NOT relocated: the mandated classification audit proved it rides the hunk as a context line (`git show HEAD:browser/moz.configure` already carries the GUID; the patch never changed it). The plan's "known value literal" premise was wrong for this line; moving it would delete a stock line only to re-add the identical value elsewhere. Recorded in the emitter comment (also correcting the 03-04 "stays patch-carried" sentence) and here.
- Deleted True lines replaced by pointer comments rather than restored-to-True: restoring would rely on later-imply_option-wins ordering to let the fragment override; deletion makes the fragment the single source with no ordering dependence.
- Path-aware boundaries (`/ . -` join identifiers): hook paths such as `DIRS += ["../powerbrowser/shell"]` carry the tree name as path segments and must stay green, while a quoted planted value goes red. The manifest set therefore keeps binary/basename strings per the plan's parenthetical; the "tree name" exclusion holds effectively for hook paths.
- Comparand over preflight assertion for the relocated lines: only the byte-identity gate compares emission bytes against a frozen declaration, and the drift-plant row comes free via the existing flatMap. A preflight `includes()` assertion would be a second, weaker content check.
- Adopted 03-REVIEW WR-05 (carrier banner) as part of the emitter edit since the shared banner's recovery pointers were wrong for this file; left WR-02/WR-03 (preflight assertions) untouched as 03-phase review debt outside this plan's scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Upstream index held a stale third variant; reset path-scoped to pristine for regeneration**
- **Found during:** Task 1 (010 regeneration)
- **Issue:** `git -C upstream checkout -- browser/moz.configure` restored a STAGED variant (VENDOR/UA inlined, no include hook) instead of pristine: the index had drifted content staged before this plan began (arrival state was `MM`). The `index` line of a regenerated patch must name the pristine blob or the 3-way chain breaks.
- **Fix:** Set the index entry for that one path to the pristine blob (`update-index --cacheinfo`, hash verified equal to `rev-parse HEAD:`), derived the patch via `git diff`, and left the tree with worktree=new-fixture over index=pristine. Classifier confirms fully-applied; arrival dirt is superseded, not preserved.
- **Files modified:** upstream/ working tree only (transient fixture, ends fully-applied)
- **Verification:** index before-hash `3ea3d88b93` equals pristine; scratch-repo apply is byte-identical; fetch classifier fully-applied
- **Committed in:** 3a2dc27 (patch file carries the derived bytes)

**2. [Rule 3 - Blocking] Residue-scan held-back counts moved by legitimate new occurrences**
- **Found during:** Task 3 (--quick run)
- **Issue:** scan-brand-residue went red: UA_NAME 4->5 (new comparand pins the compat literal) and APP_ID 2->4 (two new comment lines documenting the context-line exclusion). Its self-test PASS control went red for the same reason. This is the control working, not a leak.
- **Fix:** Moved both counts in inventory/brand-tokens.json with COUNT MOVED rationale + expected_files additions, per the 01-08/03-04 precedent. Not in the plan's files_modified, but the permanent gate cannot stay red.
- **Files modified:** inventory/brand-tokens.json
- **Verification:** scan-brand-residue PASS (133 files), --self-test PASS, full --quick 75/0
- **Committed in:** fb6aa09

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both required to meet the plan's own done criteria (honest blob hashes; green permanent gate). No scope creep: preflight untouched, no schema change (config-schema.json needed nothing -- no new manifest keys by design), endpoint-allowlist reason prose left for its owning phase (see below).

## Issues Encountered
- `/tmp` writes denied by environment policy (including /tmp/opencode); used a workspace-local `.tmp-0501/` scratch dir, removed before committing. The scripts' own mktemp usage is unaffected (runtime behavior, already established).
- Second `git apply --3way` of the new patch exits 0 in a scratch repo; confirmed via blob-hash equality that it is the D-75 silent no-op the assertion rejects by name (apply-patches --self-test proves it on the new patch).

## Known Stubs
None - stub-pattern grep over all created/modified files is clean.

## Threat Flags
None - no new network endpoints, auth paths, file-access patterns, or schema changes. T-05-01 mitigated (regenerated via git diff, blob chain verified pristine->fixture, non-vacuity proven on the new patch); T-05-02 mitigated (set derived from configuration.toml via vendored parser, planted-fault self-test proves red).

## Deferred / Follow-up Notes
- `powerbrowser/endpoint-allowlist.json` reason strings still say the False lines live "in the browser/moz.configure hunk"; they now live in generated/identity.configure via the 010 hook. Prose only, no gate reads it (verified allowlist-doc-consistency scope); left for the allowlist's owning phase.
- 03-REVIEW WR-02/WR-03 (preflight UA_NAME + behavioral-line assertions) remain open review debt; this plan gates the same lines through byte-identity instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MIG-05 statically proven: no +line in the stack carries a downstream-varying value; live rebase proof belongs to plan 05-04.
- Pins single-sourcing (05-02/05-03) can build on the hook-only stack.

## Self-Check: PASSED
- All created files exist on disk (patch, emitter, comparand, guard, registry rows, inventory).
- All task commits exist: 3a2dc27, 517df41, fb6aa09.

---
*Phase: 05-hook-only-patches-and-upstream-uptake*
*Completed: 2026-09-04*
