---
phase: 08-installer-hardening-canonical-rename
plan: "03"
subsystem: shell
tags: [internals-boundary, bidi, gui01, windows-ledger, verify-platform]

# Dependency graph
requires:
  - phase: 08-installer-hardening-canonical-rename
    provides: [08-01 hardened static gates plus canonical PowerBrowser tree this wave builds on]
provides:
  - SEC-02 registerWindowActor boundary closure with file-and-pattern self-test plant
  - SHELL-01 URL-matched BiDi context selection with live two-context proof
  - WINDOWS ledger entries 13 and 14 closed with gate evidence
affects: [08-04 packaging proofs, PKG-01 per-OS matrix, verify-work]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 9140
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [unconditional-privilege-pattern-plus-chrome-URL-plant, url-matched-context-selection-with-loud-mismatch, live-two-context-self-test-unregistered-from-quick]

key-files:
  created: []
  modified: [scripts/check-internals-boundary.sh, scripts/lib/firefox-bidi.mjs, scripts/verify-platform.sh, scripts/verify-branding.mjs, scripts/verify-customize-inert.mjs, scripts/verify-dev-flag-off.mjs, scripts/verify-uri-roundtrip.mjs, scripts/verify-gui01-command.mjs, .planning/WINDOWS.md]

key-decisions:
  - "BiDi self-test is live (two real headless launches), deliberately unregistered from verify-platform.sh so --quick never pays for a browser"
  - "URL-passed-but-unmatched throws naming URL and contexts seen; silent fallback to contexts[0] is the defect and is never the resolution"
  - "SHELL01 'about:blank' converted to bare launch: exact-match would be ambiguous between the shell placeholder and a stock window on the same URL"
  - "Caller [url] argv removed outright rather than ignored: honest CLI surface matching the gui01-window.mjs precedent"
  - "Plan verify label gui01-window matches no registry row (exact-match semantics); ran the rows the plan means instead"

patterns-established:
  - "Chrome-URL-carrying plant for unconditional patterns: the fixture names a chrome://powerbrowser/ module to prove the entry has no scheme exemption"
  - "Loud-mismatch context resolution: poll briefly for the exact URL, then throw naming what was seen -- the throw is the gate"
  - "Live-harness self-test without a registry row: invoked directly by the plan verify, never added to CHECKS, so the commit gate stays fast"

requirements-completed: [SEC-02, SHELL-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "ChromeUtils.registerWindowActor outside the boundary file fails the guard naming file and pattern"
    requirement: "SEC-02"
    verification:
      - kind: unit
        ref: "bash scripts/check-internals-boundary.sh --self-test#actor plant naming file and pattern"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only internals-boundary"
        status: pass
    human_judgment: false
  - id: D2
    description: "BiDi evaluate and screenshot run against the URL-bearing context; bare launches still resolve the single shell context"
    requirement: "SHELL-01"
    verification:
      - kind: unit
        ref: "node scripts/lib/firefox-bidi.mjs --self-test#two-context session plus single-context control"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui01-browser-close-does-not-quit"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui01-command-registered"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only shell01-theia-is-the-window"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --quick"
        status: pass
    human_judgment: false

# Metrics
duration: 17min
completed: 2026-09-05
status: complete
---

# Phase 08 Plan 03: WINDOWS 13/14 Hardening Close-Out Summary

**registerWindowActor boundary guard with a file-and-pattern plant plus URL-matched BiDi context selection with live two-context proof -- ledger 13 and 14 closed, single-touchpoint invariant holds.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-05T00:16:24Z
- **Completed:** 2026-09-05T00:33:44Z
- **Tasks:** 2 completed
- **Files modified:** 9

## Accomplishments
- `ChromeUtils.registerWindowActor` is an unconditional forbidden pattern; a plant carrying a chrome-scheme module URL is rejected naming file and pattern, proving there is no scheme exemption
- `withFirefoxPage` selects the URL-bearing context through `topLevelContexts` (bounded poll, loud throw on mismatch); all five `_run_app_check_mjs` callers plus the SHELL01 runner launch bare since they read the shell
- New live `firefox-bidi --self-test`: two-context session proves evaluate+screenshot hit the URL context, single-context control proves bare launches still resolve
- Ledger entries 13 and 14 flipped to fixed with gate evidence; ledger machine surface reconciled and consistent (3 open, 18 fixed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Close 13: forbid registerWindowActor outside the boundary with a self-test plant** - `8cb2acd` (fix)
2. **Task 2: Fix 14: select the BiDi context by URL and align the app-check callers** - `674f871` (fix)

**Plan metadata:** this close-out (docs: complete plan)

## Files Created/Modified
- `scripts/check-internals-boundary.sh` - Unconditional `registerWindowActor` pattern entry plus actor-registration self-test plant asserting file and pattern
- `scripts/lib/firefox-bidi.mjs` - `resolveUrlContext` selection, logged first-context note on bare launches, live `--self-test` (two-context assertion + single-context control)
- `scripts/verify-branding.mjs` - Bare launch; `[url]` argv removed, usage re-pinned
- `scripts/verify-customize-inert.mjs` - Bare launch; unused `url` const removed
- `scripts/verify-dev-flag-off.mjs` - Bare launch; `[url]` argv and HELP row removed (`--expect-bound` parsing intact)
- `scripts/verify-uri-roundtrip.mjs` - Bare launch; `[url]` argv and HELP row removed (`--scheme` parsing intact)
- `scripts/verify-gui01-command.mjs` - Bare launch; `[url]` argv and HELP row removed
- `scripts/verify-platform.sh` - SHELL01 inline runner converted from `'about:blank'` to bare launch with rationale comment
- `.planning/WINDOWS.md` - Entries 13 and 14 closed with gate evidence; entries 15/16 JSON reconciled with the rendered table

## Decisions Made
- BiDi self-test is live, not synthetic: two real headless launches prove evaluate/screenshot targeting against genuine contexts. It needs the built binary like every other live check and is deliberately NOT registered in `verify-platform.sh`, so `--quick` never pays for a browser launch.
- URL-passed-but-unmatched throws (naming the requested URL and every context seen) instead of falling back: silent fallback to `contexts[0]` is the WINDOWS-14 defect, so it can never be the resolution path. Safe in-tree because no caller passes a URL anymore.
- SHELL01's `'about:blank'` became a bare launch: exact-match against `about:blank` would be ambiguous between the shell's own placeholder and a stock window on the same URL, making evaluate's target depend on window-registration order. Bare launch leaves exactly one context.
- Caller `[url]` parameters removed outright (usage text included) rather than accepted-but-ignored, matching the `verify-gui01-window.mjs` precedent which takes no URL. `_run_app_check_mjs` still passes `$APP_URL`; it is now inert for these five scripts (follow-up below).
- The plan's `--only gui01-window` matches no registry row (`--only` is exact-match; the rows are `gui01-single-shell-window`, `gui01-browser-close-does-not-quit`, `gui01-command-registered`). Ran the rows the plan means: the `verify-gui01-window.mjs` row plus the two rows covering the edited callers (deviation 2).
- Added `--self-test` to `firefox-bidi.mjs` despite `artifacts_produced` saying "no new CLI flags": the task's own `<verify>` invokes that exact command, so the flag is required; read the "no new flags" line as product-CLI scope -- harness `--self-test` flags are the tree-wide idiom every other checker follows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] WINDOWS.md JSON block drifted from its rendered table for entries 15/16**
- **Found during:** Task 1 (ledger flip: consistency check before commit)
- **Issue:** The machine-read JSON fence still had entries 15/16 `open`, while the rendered table and frontmatter counts marked them `fixed` since the 2026-09-01 live user verification. The ledger loader validates counts against the JSON block, so the file was already tool-malformed before this plan touched it.
- **Fix:** Copied the table's status/reason/resolved_at for 15/16 into the JSON block verbatim (zero invention); frontmatter counts then reconcile. Verified with a count-recompute parse.
- **Files modified:** .planning/WINDOWS.md
- **Verification:** Ledger-consistency parse: 4 open / 17 fixed after task 1, 3 open / 18 fixed after task 2
- **Committed in:** 8cb2acd (part of task commit)

**2. [Rule 3 - Blocking] Plan verify label `gui01-window` matches no registry row**
- **Found during:** Task 2 (verify step)
- **Issue:** `scripts/verify-platform.sh --only gui01-window` exits 1 with "unknown --only label" -- `--only` is exact-match and no such label exists. The intent is unambiguous: the row driving `verify-gui01-window.mjs`.
- **Fix:** Ran `gui01-browser-close-does-not-quit` (the `verify-gui01-window.mjs` row, the live two-context BiDi proof) plus `gui01-command-registered` and `shell01-theia-is-the-window` (the rows covering the edited callers). All PASS.
- **Files modified:** none
- **Verification:** All three rows report PASS; recorded here so a re-run does not trip on the label
- **Committed in:** n/a (verification adaptation, no code change)

**3. [Rule 1 - Bug] SHELL01 `'about:blank'` launch left evaluate's target ordering-dependent under the new matcher**
- **Found during:** Task 2 (caller alignment review)
- **Issue:** The SHELL01 inline runner passed `'about:blank'` -- the same URL the shell itself starts at. Under exact-URL matching, the target would be whichever of the shell placeholder or the stock window registered first. Previously harmless (`contexts[0]` happened to be the shell); under the fix, nondeterministic.
- **Fix:** Bare launch (`''`) with a rationale comment in the heredoc. The check asserts the shell's own swap, so one context is exactly its subject.
- **Files modified:** scripts/verify-platform.sh
- **Verification:** `scripts/verify-platform.sh --only shell01-theia-is-the-window` PASS
- **Committed in:** 674f871 (part of task commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All three required for the plan's own gates to hold (ledger machine-validity, runnable live verify, deterministic context targeting). No GUI scope, no new verify rows, no product surface.

## Issues Encountered
- Scratch proof outside the repo was blocked by the runtime permission rule (`/tmp` writes denied); the red-before-green discrimination proof for the actor plant was done instead by asserting zero old-pattern matches in the fixture text (all 13 legacy patterns: 0 hits), which with the new-pattern-only offense line is the complete argument.
- A mid-edit slip replaced `waitFor`'s doc comment with the new helper's; caught immediately by diff review and restored -- final diff shows a pure insertion.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - no stubs introduced. Changed hunks checked for TODO/FIXME/placeholder patterns; no matches.

## Threat Flags
None - no new trust-boundary surface. The guard addition lands inside threat T-08-13 as its stated mitigation; the BiDi change lands inside T-08-14 (test-harness-only, zero new imports, launch semantics and process hygiene untouched). No registry installs ran in this plan.

## Follow-ups for Later Plans (not blockers)
- `_run_app_check_mjs` in `scripts/verify-platform.sh` still passes `$APP_URL` to the five scripts, which now ignore positional args. Harmless (same shape as the bare `verify-gui01-window.mjs` invocation), but a later touch could stop passing it or repurpose the wrapper comment.
- `artifacts_produced` in 08-03-PLAN.md says "no new CLI flags" while the task `<verify>` requires `firefox-bidi.mjs --self-test`; recorded as plan-text imprecision under Decisions, not a defect in either direction.
- The plan's `--only gui01-window` label (deviation 2) should be corrected to `gui01-browser-close-does-not-quit` if the plan file is ever re-issued.

## Next Phase Readiness
- Boundary guard discriminates on the new privilege class with plant proof; catalogue consistency green with zero new touchpoints.
- Every in-tree BiDi caller launches bare; URL-targeted evaluation is available (and fail-loud) for future callers that genuinely read a URL page.
- Ready for 08-04 packaging proofs and the PKG-01 matrix without re-proving the harness layer.
- No blockers. No human-verification items raised by this plan (all checkpoints auto-approved; no blocking-human gates hit).

## Self-Check: PASSED

---
*Phase: 08-installer-hardening-canonical-rename*
*Completed: 2026-09-05*
