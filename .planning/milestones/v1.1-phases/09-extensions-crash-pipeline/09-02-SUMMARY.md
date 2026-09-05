---
phase: 09-extensions-crash-pipeline
plan: 02
subsystem: crash-reporting
tags: [antenna, crash-collector, telemetry, node-stdlib, multipart, allowlist]

# Dependency graph
requires:
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: [PowerBrowserTelemetrySender level gate, verify-telemetry gate with stub discrimination]
  - phase: 08-installer-hardening-canonical-rename
    provides: [verify-platform.sh registry discipline, mar-update-hop assertion plumbing and self-test idiom]
provides:
  - stdlib-only Antenna-protocol crash collector with pure contract surface
  - collector contract gate with discriminating self-test plus written PII/retention/throttle policy
  - crash-ping versus crash-report separation cases in the telemetry suite
affects: [09-03 webextensions declaration, 09-04 live drills, downstream collector deployment, about:crashes surface work]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 11234
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-contract-surface plus thin-HTTP-wrapper, policy-doc as reviewable source pinned by gate literals]

key-files:
  created: [scripts/crash-collector.mjs, scripts/verify-crash-collector.mjs, docs/CRASH-POLICY.md]
  modified: [theia/extensions/telemetry/test/telemetry-sender.test.mjs, scripts/verify-platform.sh]

key-decisions:
  - "Single oversized_body reason (413) for all three ingestion caps; two malformed classes (400) plus throttle soft-reject (200) plus store-unavailable (500)"
  - "Throttle checked after parse and only accepted submits consume budget, so malformed floods cannot mask as throttled and rejections stay diagnostic"
  - "Gate main mode pins the policy doc against code-exported literals (code is source, doc is comparand); self-test runs handleSubmit in-process with no sockets"
  - "Suite asserts the report path from the collector's own exports (MINIDUMP_PART_NAME plus response shapes), never a kept copy"

patterns-established:
  - "Contract gate imports the exported pure functions (parseMultipart and builders) so gate and server share one verdict"
  - "Store-empty assertion after every rejection plant so no plant passes vacuously"

requirements-completed: [TEL-04]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "stdlib-only Antenna crash collector with importable pure contract surface and bounded loopback ingestion"
    requirement: "TEL-04"
    verification:
      - kind: unit
        ref: "node --check scripts/crash-collector.mjs + CONTRACT_EXPORTS_OK smoke (parseMultipart, buildCrashIdResponse, buildDiscardResponse)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Contract gate with control-green-first self-test pinning accept, malformed, oversized, and throttle directions"
    requirement: "TEL-04"
    verification:
      - kind: unit
        ref: "node scripts/verify-crash-collector.mjs --self-test#control GREEN plus 5 plants REJECTED naming their rule"
        status: pass
    human_judgment: false
  - id: D3
    description: "Written PII/retention/throttle policy stating allowlist, 30-day deletion, throttle rules, and ping/report routing"
    requirement: "TEL-04"
    verification:
      - kind: unit
        ref: "node scripts/verify-crash-collector.mjs#policy states every code-exported literal"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ping/report separation cases plus registry rows plus loopback submit-to-record round-trip"
    requirement: "TEL-04"
    verification:
      - kind: unit
        ref: "node theia/extensions/telemetry/test/telemetry-sender.test.mjs#SUITE PASS 9/9 with stub run red on off-sends-nothing"
        status: pass
      - kind: unit
        ref: "node scripts/verify-telemetry.mjs --self-test#3 planted faults behaved as pinned"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --quick#crash-collector and crash-collector-self-test PASS, all checks passed"
        status: pass
      - kind: integration
        ref: "one-off loopback proof: FormData POST to 127.0.0.1 ephemeral port answered 200 CrashID plus matching .dmp/.json record (transcript below)"
        status: pass
    human_judgment: false

# Metrics
duration: 6min
completed: 2026-09-05
status: complete
---

# Phase 09 Plan 02: Crash Collector Summary

**Minimal Antenna-protocol crash collector (stdlib-only, loopback-bound) with a discriminating contract gate, a written PII/retention/throttle policy, and ping/report separation cases — loopback round-trip proven.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-05T08:00:59Z
- **Completed:** 2026-09-05T08:06:25Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Collector answers the Antenna contract over loopback: well-formed multipart yields `CrashID=`, malformed and over-cap inputs get their documented answers, throttled submits stay on the success status with the soft-reject body
- Contract gate pins behavior in-process (byte fixtures, temp dir, no sockets) with control-green-first and five red-naming plants, and pins the policy doc against code-exported literals
- Policy doc states the 7-field annotation allowlist, the 30-day deletion sweep, the 60-per-60s throttle rule, and the ping-versus-report routing
- Telemetry suite at 9/9 with four new separation cases; stub discrimination intact; registry carries the collector gate pair; one loopback round-trip shows a CrashID response and a matching store record

## Task Commits

Each task was committed atomically:

1. **Task 1: Collector with pure contract surface and bounded ingestion** - `c089a51` (feat)
2. **Task 2: Contract gate plus written PII retention throttle policy** - `2fb63b6` (feat)
3. **Task 3: Ping report separation cases plus registry rows plus loopback round-trip** - `9fac5f1` (feat)

## Files Created/Modified
- `scripts/crash-collector.mjs` - stdlib-only Antenna collector: parseMultipart/buildCrashIdResponse/buildDiscardResponse/handleSubmit pure surface plus thin loopback HTTP wrapper (created)
- `scripts/verify-crash-collector.mjs` - contract gate: policy-literal agreement plus in-process self-test (created)
- `docs/CRASH-POLICY.md` - written allowlist/retention/throttle/routing policy with operator runbook (created)
- `theia/extensions/telemetry/test/telemetry-sender.test.mjs` - four separation cases (crash error admitted to ping endpoint, crash usage dropped, unknown levels fail closed, minidump has no sender path with report path from collector contract) (modified)
- `scripts/verify-platform.sh` - crash-collector gate plus self-test CHECKS pair with per-pair comment (modified)

## Decisions Made
- Single `oversized_body` reason (413) for all three ingestion caps (part count, part size, total body); two malformed classes (400); throttle soft-reject on 200; store-unavailable on 500. One reason per verdict class keeps the wire vocabulary minimal and the gate's plant-per-direction mapping exact.
- Throttle is checked after parsing and only accepted submits consume budget, so a malformed flood answers 400 (diagnostic) rather than masking as throttled, and rejections never touch the store.
- Gate main mode derives expectations from the collector's exports and checks the policy doc states each literal (code is source, doc is comparand) — a policy edit that drops a literal goes red naming it.
- The suite imports `MINIDUMP_PART_NAME` and the response builders from the collector rather than keeping its own copy, so the report-path assertion cannot drift from the contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Narrowed the sender-surface assertion in the new minidump case**
- **Found during:** Task 3 (suite run after adding the four separation cases)
- **Issue:** The new case asserted exact prototype set equality (`constructor, dispose, flush, sendErrorData, sendEventData`), but TypeScript `protected` helpers (`enqueue`, `sendNext`, `diagnostic`, `sendInflight`) are plain prototype members at runtime, so the suite went red on the assertion rather than on a real report path
- **Fix:** Assert the meaningful separation claim instead — no prototype member matches minidump/upload/dump/report — keeping the transport (JSON POSTs only) and collector-contract halves unchanged
- **Files modified:** theia/extensions/telemetry/test/telemetry-sender.test.mjs
- **Verification:** Suite 9/9 green; stub run still red on the off-sends-nothing assertion
- **Committed in:** 9fac5f1 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-precision fix only; no scope change, no new packages, no network touched.

## Issues Encountered
- One-off round-trip proof script checked the bound URL against the prefix `http://127.0.0.1/` but the URL carries an ephemeral port (`http://127.0.0.1:PORT/submit`); fixed the prefix to `http://127.0.0.1:` and the proof passed. Scratch script only, never committed.
- Temp probe files had to live inside the repo (workspace-scoped file writes); removed immediately after each run. No residue left behind.

## Loopback Round-Trip Evidence

One synthetic multipart submit (real FormData encoding, not a hand-built fixture) against an ephemeral-port loopback instance:

- bound: `http://127.0.0.1:40633/submit`
- submit answer: `200 CrashID=6182d6e8-21e7-4ded-bc4e-18a9913e780b`
- store files: `<uuid>.dmp, <uuid>.json` — record id match: true, annotations `{"ProductName":"PowerBrowser"}`, dump bytes match: true
- verdict: `ROUNDTRIP_OK`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Collector, gate, policy, and separation cases are green under `--quick`; plan 09-03 (webextensions declaration) and live-drill plans can build on the TEL-04 half without rework.
- No blockers. Native reporter path untouched (no Gecko patch surface added); no Socorro or mini-breakpad-server introduced.

## Self-Check: PASSED
- All five created/modified files exist on disk.
- All three task commits exist (`c089a51`, `2fb63b6`, `9fac5f1`).
- Task verify lines re-run green on the final tree: collector `--check` + export smoke, crash-collector self-test (control + 5 plants) and main gate, telemetry suite 9/9 plus telemetry self-test, `--quick` PASS including both new rows, `--only` reachable for both new labels.
- Stub scan clean (no TODO/FIXME/placeholder or empty-value stubs in new code); threat surface fully inside the plan's T-09-04/05/06 register, so no Threat Flags section.

---
*Phase: 09-extensions-crash-pipeline*
*Completed: 2026-09-05*
