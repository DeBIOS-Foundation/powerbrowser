---
phase: 13-chrome-bar-strip-relocation-spike
plan: 03
subsystem: chrome-bar
tags: [theia, gui-06, chrome-bar, commands, keybindings, suggestions, css-layer]

# Dependency graph
requires:
  - phase: 12-sql-tab-store
    provides: TabQueryService.searchByPrefix that the pill queries through the RPC proxy
  - phase: 13-chrome-bar-strip-relocation-spike
    provides: 13-01 RED verdict (Variant-A fallback, strip stays top) and 13-02 skeleton plus RPC pair plus suggestions/verdict gates
provides:
  - "Visible chrome bar: five commands, keybindings, widget with pill plus 8-row dropdown plus toggle plus chip, style layer, commands gate"
  - "gui06-chrome-bar-commands registry row with proven self-test (six new Phase-13 rows green)"
affects: [14-modes-and-strip]

# Actuals — same estimateTokens scale (chars/4 over realized diff)
actuals:
  tokens: 14000
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [opener-helper-two-step-routing, gate-scope-to-declared-ids, inheritance-over-unreferenceable-variable]

key-files:
  created:
    - theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts
    - theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts
    - theia/extensions/chrome-bar/src/browser/chrome-bar.css
    - scripts/verify-chrome-bar-commands.mjs
  modified:
    - theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx
    - theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts
    - theia/extensions/chrome-bar/package.json
    - scripts/verify-platform.sh

key-decisions:
  - "Opener routing uses getOpener plus handler.open (the open() helper's own two steps): OpenerService exposes no open method in 1.74.1, and the two-step form is what the suggestions gate's activation check recognises"
  - "Caption type delegates by inheritance: even naming the Theia code variable trips the plan's own no-typeface grep (the variable name contains the banned substring), so the mono distinction is deferred and the caption role stays size plus muted ink"
  - "Commands gate scopes the no-retype check to declared ids only: a prefix-wide literal ban false-positives on the status-bar element id in a different namespace"
  - "Active toggle segment carries accent INK (never fill): weight plus accent carry the state per the contrast contract"
  - "@theia/editor added as a pinned 1.74.1 dep (PATTERNS section 1 sanctions feature deps at the pin); stylesheet wired via a one-line widget import in task 3"

patterns-established:
  - "Gate-scope precision: a call-site discipline check must name the declared values it guards, never a namespace prefix -- neighbouring identifiers in the same dotted tree are different registrations"
  - "Mechanical-gate-first reading: when a grep gate and a prose action disagree on a variable reference, the mechanical gate is the contract and the prose gap is the documented deviation"

requirements-completed: [GUI-06]

# Coverage metadata — deterministic UAT routing
coverage:
  - id: D1
    description: "Top chrome bar with back, forward, reload, address pill, new tab, and mode toggle beside the tab strip"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "nix develop .#theia --command bash -c 'cd theia/extensions/chrome-bar && yarn build' (exit 0, all three tasks)"
        status: pass
      - kind: other
        ref: "scripts/verify-chrome-bar-commands.mjs plus --self-test (3 planted faults went red)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Back and forward with disabled-with-tooltip states; reload disabled with its tooltip"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "scripts/verify-chrome-bar-commands.mjs (enablement hooks derived from source)"
        status: pass
    human_judgment: true
    rationale: "Disabled visuals (dim plus retained tooltip, no layout shift) need a rendered bar to confirm"
  - id: D3
    description: "New tab opens through the stock-window channel with the blocked-popup path"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "scripts/verify-chrome-bar-commands.mjs (new-tab delegates to the imported window-command const)"
        status: pass
    human_judgment: true
    rationale: "A blocked popup taking the existing error path needs a live window-gesture test"
  - id: D4
    description: "Typing suggests up to 8 rows and activating one navigates; empty commits nothing, failures degrade to address commit"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "scripts/verify-chrome-bar-suggestions.mjs (STAGED backstop resolved: call site routes through OpenerService)"
        status: pass
    human_judgment: true
    rationale: "Suggestion activation navigating the current tab is the held-out backstop: needs a typed query in a live bar"
  - id: D5
    description: "Mode toggle selects in-memory with immediate visual state; no tab ever closed, moved, or detached"
    requirement: "GUI-06"
    verification: []
    human_judgment: true
    rationale: "Toggle immediacy (150ms visual state) and the tabs invariant across switches need live interaction"
  - id: D6
    description: "Bar styling is Theia-native with no second token system and no typeface literal"
    requirement: "GUI-06"
    verification:
      - kind: other
        ref: "task-3 verify grep (zero font-family occurrences) plus scripts/verify-platform.sh --quick green"
        status: pass
    human_judgment: true
    rationale: "Theia-native read (pill, dropdown, toggle against the theme) needs a rendered eye"

# Metrics
duration: ~10min
completed: 2026-09-06
status: complete
---

# Phase 13 Plan 03: Chrome-Bar Presentation Summary

**Top chrome bar shipped: five contracted commands with keybindings, pill with debounced 8-row suggestions plus toggle plus chip, one CSS layer on locked sketch tokens, and a commands gate with proven self-test beside the gui04 pair.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-06T04:11:14Z
- **Completed:** 2026-09-06T04:21:12Z
- **Tasks:** 3/3
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- Five scope-prefixed commands (`powerbrowser.chrome-bar.back/forward/reload/new-tab/focus-address`)
  with contracted labels on the four visible actions and none on the focus-only command; back/forward
  follow the history-service hooks with visibility pinned true, reload registered disabled (Phase 14
  scope), new-tab delegating to the imported window-command const on the existing blocked path.
- `Ctrl+L` plus `Cmd+L` keybindings against the imported focus const, all binds static at module load.
- Widget on the top slot (idempotent add, menu-coupling note in header): pill with lock glyph on
  secure contexts, debounced RPC dropdown capped at 8 scrolling rows with title-over-caption,
  contracted footer/empty/failure copy, text-only rows, full keyboard map (arrows, Enter, two-stage
  Esc), opener commit with no-op empty and no replacement error surface; three-segment toggle with
  in-memory selection defaulting to Coding; plain-count chip in-bar plus status-bar, asserting the
  tabs invariant on every switch.
- The 13-02 suggestions gate's STAGED activation backstop resolved with no gate modification: the
  commit call site routes through `OpenerService.getOpener` plus `handler.open` and the gate now
  reports routed instead of STAGED.
- One `@layer` stylesheet (237 lines) on locked sketch tokens with fallbacks: 40px full-bleed row,
  pill/dropdown geometry, three type sizes with semibold reserved for the active segment, focus
  outlines, motion baseline, accent in exactly the three reserved uses (pill ring, active-segment
  ink, highlight wash), pill-shrinks-first narrow behaviour, layered-under-unlayered cascade so
  user CSS keeps winning; zero `font-family` occurrences, no second hue.
- `verify-chrome-bar-commands.mjs` (224 lines): derived ids as set equality against one EXPECTED
  const, four verbatim labels plus the labelless focus assertion, duplicate-id detection, call-site
  const-import discipline, empty-derivation failure; self-test plants id removal, label drift, and
  duplicate id (all red naming the drift). Two registry rows beside the gui04 pair, no sibling driver.

## Task Commits

Each task was committed atomically:

1. **Task 1: Commands, keybindings, widget shell** - `181775e` (feat)
2. **Task 2: Address pill with suggestions, toggle, chip** - `281de71` (feat)
3. **Task 3: Style layer plus commands gate** - `8ba1340` (feat)

**Plan metadata:** this SUMMARY commit follows (docs).

## Files Created/Modified

- `theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts` - Five ids plus contracted labels, history/disabled/new-tab/focus wiring
- `theia/extensions/chrome-bar/src/browser/chrome-bar-keybindings.ts` - Ctrl/Cmd+L to the focus const
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` - Bar shell (t1), suggestions/toggle/chip (t2), stylesheet import (t3 wiring)
- `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts` - 13-02 proxy bind plus five static 13-03 binds
- `theia/extensions/chrome-bar/package.json` - Pinned `@theia/editor` feature dep for the history service
- `theia/extensions/chrome-bar/src/browser/chrome-bar.css` - One layer on locked tokens under the user layer
- `scripts/verify-chrome-bar-commands.mjs` - Commands gate with self-test
- `scripts/verify-platform.sh` - Two rows beside the gui04 pair with honesty comments

## Decisions Made

- **Two-step opener routing.** `OpenerService` in 1.74.1 exposes `getOpener`/`getOpeners`, not `open`
  (the free `open()` helper does getOpener plus handler.open). The widget mirrors those two steps
  exactly -- identical routing -- and the form is what the 13-02 gate's activation check recognises,
  resolving its STAGED backstop with no gate edit.
- **Caption type by inheritance.** The plan's action asks for the code typeface variable while its
  own grep gate bans the `font-family` substring the variable name contains. The mechanical gate is
  the contract: captions keep the 12px/muted-ink role and inherit theme type; the mono distinction
  is deferred, documented in the sheet.
- **Gate scoped to declared ids.** First gate draft banned any `powerbrowser.chrome-bar.*` literal
  at call sites and went red on the correct tree (the status-bar element id). The check now names
  each declared command id literally -- neighbouring namespaces no longer trip it.
- **Active segment is accent ink, never fill.** Planner's pick of the exclusive-or; 600 stays
  reserved for that one use.
- **No new packages.** The only dependency delta is the in-tree `@theia/editor` pin; debounce
  reuses the exact `^2.1.0` spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pinned @theia/editor feature dep**
- **Found during:** Task 1 authoring (commands import the history service)
- **Issue:** Plan files list omits package.json, but PATTERNS section 1 sanctions pinned
  `@theia/*` feature deps and the build needs the import resolvable as a declared dep.
- **Fix:** Added `"@theia/editor": "1.74.1"`, staged with the task.
- **Verification:** `yarn build` exit 0, quick green.
- **Committed in:** `181775e`

**2. [Rule 1 - Bug] Opener call shape corrected to the 1.74.1 API**
- **Found during:** Task 2 verify (`tsc` red: `Property 'open' does not exist on type 'OpenerService'`)
- **Issue:** RESEARCH's address-commit example calls `openerService.open(...)`, which the pinned
  tree does not expose.
- **Fix:** `getOpener(uri)` plus `handler.open(uri)` -- the free helper's own two steps.
- **Verification:** `yarn build` exit 0; suggestions gate reports routed, not STAGED.
- **Committed in:** `281de71`

**3. [Rule 2 - Missing critical] Stylesheet import wiring**
- **Found during:** Task 3 authoring (css file unreachable without an import; esbuild css loader plus
  side-effect import is the tree's own pattern)
- **Issue:** Plan assigns the import to neither task 1 nor task 3 explicitly, but an unwired
  stylesheet ships dead.
- **Fix:** One-line `import './chrome-bar.css'` in the widget, staged with task 3.
- **Verification:** Extension builds with the import; quick green.
- **Committed in:** `8ba1340`

**4. [Rule 1 - Bug] Commands-gate literal scope narrowed to declared ids**
- **Found during:** Task 3 verify (first gate run red on the correct tree)
- **Issue:** Prefix-wide literal ban false-positived on the status-bar element id.
- **Fix:** Per-declared-id literal assertions plus a comment naming the neighbour namespaces.
- **Verification:** Gate plus self-test green; all three plants discriminate.
- **Committed in:** `8ba1340`

**5. [Rule 2 - Missing critical] Caption typeface deferred to inheritance**
- **Found during:** Task 3 verify (plan's own `font-family` grep trips on the variable name)
- **Issue:** Prose action (reference the code variable) vs mechanical gate (zero substring
  occurrences) disagree; the gate governs.
- **Fix:** Size-plus-ink caption role, inheritance, rationale comment in the sheet.
- **Verification:** CSS grep gate passes; quick green.
- **Committed in:** `8ba1340`

---

**Total deviations:** 5 auto-fixed (2 blocking, 2 bug, 1 missing-critical)
**Impact on plan:** All five preserve plan intent with every gate honest -- no scope creep, no gate weakened, no shipped-tree extra.

## Issues Encountered

- None beyond the deviations above. One fix-and-retry was spent on the opener shape (deviation 2);
  no task needed a second. Pre-existing reds untouched: none observed -- quick was green at every
  task boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 consumes: the bar (commands, widget, styling all green), the RED verdict routing
  (strip stays top per Variant A, modes still ship), and six green Phase-13 rows. The reload
  enablement predicate, custom mode names/persistence, and shell-relocation consequences are all
  recorded Phase-14 scope with their contracts (disabled reload, fixed segment widths, deferred
  consequences) already in place.
- Live-interaction UAT (D2-D6 human_judgment items: disabled visuals, blocked popup path,
  activation navigation, toggle immediacy plus invariant, Theia-native read) is deferred per the
  standing nonstop rule until roadmap verification.

## Self-Check: PASSED

- All 4 created files exist (commands, keybindings, css, gate script); all 4 modified files carry
  the plan's edits (widget, frontend module, package.json, verify-platform.sh)
- All 3 task commits present (`181775e`, `281de71`, `8ba1340`)
- Gate script exceeds 60 lines (224); CSS exceeds 40 lines (237); two registry rows resolve
  through `--only`; no sibling driver created
- Widget carries all nine contracted class hooks; five exported command ids with four contracted
  labels and one labelless focus command; no stub patterns, no Firefox internals, no new packages

---
*Phase: 13-chrome-bar-strip-relocation-spike*
*Completed: 2026-09-06*
