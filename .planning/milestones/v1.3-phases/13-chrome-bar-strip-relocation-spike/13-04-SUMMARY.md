---
phase: 13-chrome-bar-strip-relocation-spike
plan: 04
subsystem: browser-gui
tags: [chrome-bar, theia, opener-routing, stock-window-channel, suggestions, verify-gates]
requires:
  - phase: 13-chrome-bar-strip-relocation-spike/13-03
    provides: [chrome bar widget with opener commit, nav commands on editor service, contracted copy set]
provides:
  - Nav commands on one GUI-02-owned navigable-tab predicate (editor service removed)
  - Suggestion activation through row.url on the stock-window channel with scheme mapping and in-bar failures
  - Live tab-count chip on shell add/remove/current-change subscriptions
  - Activation gate asserting row-URL routing (STAGED retired) plus copy set covering the failure row
affects: [13-05-placement-ratification, gui06-uat-test-3, GUI-02-navigable-tabs]
actuals:
  tokens: 7996
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [shared navigable-tab predicate, scheme-dispatched commit routing, in-bar failure row with Enter retry]
key-files:
  created: []
  modified: [theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts, theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx, scripts/verify-chrome-bar-suggestions.mjs, scripts/verify-shell-error-copy.mjs]
key-decisions:
  - "Nav enablement reads one exported chromeBarHasNavigableTab (false, GUI-02-owned); GUI-02 flips the predicate, nothing else changes"
  - "http(s) row and typed URLs execute the imported stock-window const; view:/settings: keep two-step opener; non-address text surfaces the failure row with no search host minted"
  - "STAGED activation branch retired: zero routed call sites is a loud failure, never a held-out pass"
patterns-established:
  - "Commit routing: row.url into OPEN_BROWSER_WINDOW_COMMAND_ID; opaque row.uri survives only as the React list key"
  - "Commit failure is UI state (commitFailed flag + dropdown row), never console-only"
requirements-completed: [GUI-06]
coverage:
  - id: D1
    description: "Back, forward, reload share one exported navigable-tab predicate; no editor-service reference remains"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "node scripts/verify-chrome-bar-commands.mjs"
        status: pass
      - kind: other
        ref: "nix develop .#theia --command bash -c 'cd theia/extensions/chrome-bar && yarn build'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Suggestion activation navigates through row.url on the stock-window channel; typed commits follow the scheme mapping; failures surface in-bar"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "node scripts/verify-chrome-bar-suggestions.mjs"
        status: pass
      - kind: other
        ref: "node scripts/verify-chrome-bar-suggestions.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D3
    description: "Widget copy set covers the commit-failure string in JSX-escaped spelling; no internal identifier leaks"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "node scripts/verify-shell-error-copy.mjs"
        status: pass
      - kind: other
        ref: "node scripts/verify-shell-error-copy.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Live suggestion-activation navigation in a running sidecar (Enter/click opens the suggested address in a stock window)"
    requirement: "GUI-06"
    verification: []
    human_judgment: true
    rationale: "Gates assert the routing structurally from source; no live browser run executed activation. Owned by UAT test 3 (/gsd-verify-work 13)."
duration: not instrumented (spawn timestamp not captured; three build-plus-gate cycles in the Nix theia shell)
completed: 2026-09-06
status: complete
---

# Phase 13 Plan 04: G-13-3 Facets 1+3 Gap Closure Summary

**Suggestion activation navigates through row.url on the stock-window channel, nav controls sit honestly disabled on one GUI-02-owned predicate, and the gates prove the routing instead of passing vacuously**

## Performance

- **Duration:** not instrumented (spawn timestamp not captured)
- **Completed:** 2026-09-06
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Nav commands (back/forward/reload) read one exported `chromeBarHasNavigableTab` predicate returning false; the editor location-history service is fully removed from the chrome bar
- Suggestion rows commit `row.url` through the imported `OPEN_BROWSER_WINDOW_COMMAND_ID` const (http/https); view:/settings: rows keep two-step opener routing; the opaque `row.uri` survives only as the React list key
- Typed commits follow the contracted mapping: http(s) as-is, host-like text normalized with an `https` prefix, anything else surfaces the contracted in-bar failure row with Enter-to-retry; empty stays a no-op; no search-engine host minted anywhere
- Tab-count chip subscribes to shell `onDidAddWidget`, `onDidRemoveWidget`, and `onDidChangeCurrentWidget` — no mode switch required
- Activation gate rewritten to derive the new routing at check time (const import, row-url commit, no row-key feed, no bare `window.open`, negated engine-host list); STAGED branch retired; four plant-landed self-test proofs
- Copy set gains exactly the failure string in JSX-escaped spelling as a one-line diff; quick gate green; Theia core diff clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Nav commands on one shared navigable-tab predicate** - `cdd45f4` (fix)
2. **Task 2: Widget commit routing on row URL with in-bar failure surface plus live chip** - `79c538d` (fix)
3. **Task 3: Activation gate rewrite plus widget copy set extension** - `1f13f98` (fix)

**Plan metadata:** `2457cfc` (docs: 13-04/13-05 gap-closure plans, pre-existing)

## Files Created/Modified

- `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts` - dropped editor-service import/injection/calls; added exported `chromeBarHasNavigableTab` (false, GUI-02-owned); all three nav commands share it for `isEnabled` with `isVisible` pinned true; back/forward execute guarded resolving no-ops
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` - `commitRow` (row.url) + `commitText` (scheme/host/other mapping) + `openCommittedUrl` (stock-window const vs two-step opener) + `showCommitFailure` (in-bar row, Enter retries); nav buttons bind the shared predicate; chip subscribes to three shell events
- `scripts/verify-chrome-bar-suggestions.mjs` - activation check derives const import, row-url commit, no row-key feed (key stripped first), no bare `window.open`, no engine-host literal and no query-param search pattern across all chrome-bar browser sources; empty derivation fails as broken instrument; zero routed sites fails loudly; self-test reworked to green-first plus four plant-landed proofs
- `scripts/verify-shell-error-copy.mjs` - `EXPECTED_WIDGET_COPY` gains exactly `Power Browser couldn&apos;t open that address. Press Enter to try again.`

## Decisions Made

- One exported predicate, not per-command enablement: back/forward/reload can never disagree about navigability, and GUI-02 flips one function when the first navigable tab type ships (`chromeBarHasNavigableTab` doc records the ownership)
- No `NavigationLocationService` name spelled anywhere in the commands source — the task-1 verify counts non-comment lines containing it, so even a comment mention would fail the gate
- Failure copy reuses the existing dropdown footer (`Enter opens the address · Esc closes suggestions`) so the copy addition is exactly one new string, not two
- Engine-host negated list kept small and frozen (`google.com`, `bing.com`, `duckduckgo.com`, `search.yahoo.com`, `yandex` x2, `startpage.com`, `ecosia.org`, `search.brave.com`, `mojeek.com`) plus a `[?&](q|query)=|search\?` pattern — adding a host is a deliberate diff-visible contract change
- No `verify-platform.sh` registry change: both scripts ride their existing rows per the plan

## Deviations from Plan

None - plan executed exactly as written. (One self-correction during task 3: the first copy-set edit altered the preceding line's indent, producing a 2+/1- diff instead of the contracted one-line diff; fixed before committing. Not a plan deviation — the committed diff is the specified one-line addition.)

## Issues Encountered

- `scripts/diff-theia-core.sh` fails outside a Nix shell (`yarn: command not found` — `yarn` only exists in `. #theia`); re-ran inside `nix develop .#theia` → PASS, zero changes inside `@theia/*`
- Expected mid-plan red: after task 2, `verify-shell-error-copy` failed naming the new failure string (copy set extension is task 3's job); resolved by task 3 as sequenced

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Facets 1 and 3 of G-13-3 are closed; facet 2 (bar-above-strip ratification + placement gate) is plan 13-05, which also carries GUI-06 — the `requirements-completed: [GUI-06]` above covers this plan's facets, not the full requirement
- 13-05 task 1 extends the widget header note and appends the commit-failure row to the UI-SPEC Copywriting Contract; this plan deliberately touched neither, so no merge friction
- Live-activation proof (coverage D4) stays with UAT test 3 via `/gsd-verify-work 13`

---
*Phase: 13-chrome-bar-strip-relocation-spike*
*Completed: 2026-09-06*

## Self-Check: PASSED

- All four modified files exist on disk; the SUMMARY file exists at `.planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-04-SUMMARY.md`
- All three task commits resolve: `cdd45f4`, `79c538d`, `1f13f98` present in `git log`
- No new stubs introduced (remaining TODO/placeholder hits are pre-existing contracted copy)
- No threat-model surface beyond the plan's register (row-URL→stock-window and typed-text→address mapping are T-13-04-01..04, all mitigated as specified)
