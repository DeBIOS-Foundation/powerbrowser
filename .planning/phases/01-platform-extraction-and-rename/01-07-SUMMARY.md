---
phase: 01-platform-extraction-and-rename
plan: 07
subsystem: shell-ux-and-phase-gate
status: complete
tags: [mig-04, gui-01, gui-03, accessibility, copywriting, verification, phase-gate]
requirements: [MIG-04, GUI-01, GUI-03]
completed: 2026-08-31

dependency_graph:
  requires:
    - "01-05 — GUI-01 as landed (window.open from the Theia frontend; no chrome-side command)"
    - "01-06 — the consolidated verifier's GUI-04 rows; GUI-02 descoped"
    - "objdir/dist/bin/powerbrowser — 01-04's build"
  provides:
    - "USER_MESSAGE — the single derivable source of user-facing error copy"
    - "TheiaService.getFailureDetails() — the one accessor behind both the diagnostics field rows and the POWERBROWSER_ERROR_DIAGNOSTICS sentinel"
    - "CLAUDE.md — this repo's project-instruction file"
    - "shell-error-copy-no-internals / shell-diagnostics-rows-populated — the MIG-04 copy gate"
    - "verify-platform.sh --gate — now a working one-command phase gate"
  affects:
    - "Phase 2's generator: every literal added here is hand-written, per the byte-identical acceptance test"
    - "Phase 6's VER-01 static scan: the identifier-form leak rule now covers JSX text nodes"

tech_stack:
  added: []
  patterns:
    - "derive-and-compare over hand-kept expectation lists, with a fault-planting --self-test"
    - "one accessor behind both a rendered surface and its machine-readable sentinel (D-119/D-120)"
    - "a two-run set-difference as the discriminator for a per-run absence assertion"

key_files:
  created:
    - CLAUDE.md
    - scripts/verify-shell-error-copy.mjs
    - .planning/phases/01-platform-extraction-and-rename/01-07-SUMMARY.md
  modified:
    - powerbrowser/shell/TheiaService.sys.mjs
    - powerbrowser/shell/powerbrowser.js
    - powerbrowser/shell/powerbrowser.css
    - scripts/verify-platform.sh
    - scripts/verify-branding.mjs
    - scripts/verify-branding-preflight.mjs
    - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
    - docs/BUILD.md
    - docs/CUSTOMIZE.md

decisions:
  - "User-facing error copy lives in one USER_MESSAGE table so a check can DERIVE it; nine failure paths collapse onto four sentences because the distinctions between them are diagnostic, not actionable"
  - "The POWERBROWSER_SHELL_ERROR sentinel gains no key; the diagnostics rows get their own POWERBROWSER_ERROR_DIAGNOSTICS line, so the existing exact-shape assertion keeps holding"
  - "The two objdir-release checks become named D-127 exclusions keyed on ledger entry 10 rather than being deleted, narrowed, or left to fail the gate silently"
  - "smoke-theia.sh is registered rather than left as a second command, closing the last full-suite superset gap"

metrics:
  duration: "~2h10m"
  completed: 2026-08-31
  tasks: 3
  commits: 7

actuals:
  tokens: 61000
  tasks: 3
  commits: 7
---

# Phase 1 Plan 7: Error Copy, Focus Indicator, CLAUDE.md, and the Phase Gate — Summary

Closed the two user-facing gaps a mechanical rename would have carried forward — internal
identifiers painted into full-screen error text, and three buttons with no keyboard focus
indicator — wrote this repo's own `CLAUDE.md` with the GUI rule rewritten so it no longer
contradicts the product, and ran the phase gate, which found and fixed three real defects on
the way to green.

**Gate result: `verify-platform.sh --gate` PASS-WITH-EXCLUSIONS at `c604c52` — 57/59 PASS,
2 named known-open exclusions, 286s.** Both manual verifications are **outstanding**, recorded
below and in the ledger, because this plan ran autonomously with no human present.

---

## What shipped

| Commit    | What                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `c3b5174` | Task 1 — user-facing error copy separated from diagnostic detail (MIG-04)    |
| `9d66488` | Task 2 — focus indicator, `CLAUDE.md`, documentation debrand                 |
| `8d10f86` | `smoke-theia.sh` registered — the last full-suite superset gap               |
| `91b64a4` | Gate fix 1 — transient `:3000` occupant; the two release-build exclusions    |
| `86007f3` | Gate fix 2 — welcome widget rendered the IDENTIFIER form as its product name |
| `c604c52` | Gate fix 3 — `--gate` hung forever whenever a check started the Theia app    |
| _(final)_ | Plan metadata                                                               |

### Task 1 — error copy (MIG-04)

`TheiaService` wrote pref keys, sentinel names, ports, timeouts and raw exception text straight
into `#powerbrowser-error-message` — the full-screen text a user reads once the pointer-driven
happy path has already failed. Nine failure paths now map onto the four sentences
`01-UI-SPEC.md`'s rewrite table specifies, held in a `USER_MESSAGE` table.

Every dropped identifier moved rather than disappeared: each failure path builds its own
`[label, value]` rows, so a path with no port contributes no port row instead of one reading
`Port: null`. The diagnostics layer's field rows and the new `POWERBROWSER_ERROR_DIAGNOSTICS`
sentinel both read the single `getFailureDetails()` accessor, so the rendered surface and the
machine-readable line cannot disagree.

`_fatal()` / `_pushLog()` keep the full diagnostic text unchanged — that is the log, and the
existing `shell03-*` checks match on it. `"Shutting down."` is not an error surface and stays
verbatim. The `POWERBROWSER_SHELL_ERROR` sentinel deliberately gains no key, so
`shell03-budget-exhausted-error`'s exact-shape assertion still holds.

### Task 2 — focus indicator, CLAUDE.md, docs

`:focus-visible` on all three shell buttons: `2px solid #e8e8e8`, `outline-offset: 2px`. Both
values were already declared — the accent, and the 4px spacing scale — so no colour and no
spacing value was introduced, and no brand hue was invented. It is a stylesheet rule because
the shell's CSP (`default-src chrome:`) drops an inline style silently.

Two overflow bounds went in alongside, from the spec's E2 edges: the error message gains
`overflow-wrap: anywhere` at its existing `40em` bound (never truncated — hiding the tail of an
error message hides the affordance it ends with), and the diagnostics field rows gain the same
plus a `60em` bound, because as of Task 1 those rows carry a resolved filesystem path.

`CLAUDE.md` carries the four inherited hard rules unchanged and **rewrites the fifth**. The
originating tree says Theia is the *only* GUI and no browser chrome exists; Power Browser's rule
is that Theia is the *default* GUI and stock browser chrome is *reachable*, while no *custom*
chrome is authored. It also records the three rules a future agent cannot infer: no generator in
Phase 1, the residual scan as a permanent gate, and never text-editing a patch.

`CUSTOMIZE.md` now names the renamed config directory explicitly for both layers, derived the
way `_resolveConfigDir()` derives it. `BUILD.md`'s example path is this repo's, and one
paragraph up front attributes every timing to tree, host, and pinned toolchain, and states why
they are carried forward rather than re-measured.

### Task 3 — the gate

Reconciling the registry against `01-VALIDATION.md`'s full-suite command found `smoke-theia.sh`
missing — the one member with no row. Registering it made the consolidated verifier a true
superset, and immediately exposed the first of three defects.

---

## Deviations from Plan

### GUI-02 — out of scope, as instructed

The plan file predates the 01-06 descope. Nothing GUI-02-dependent was implemented. No
web-tab, mini-browser, or frame-refusal work appears here, and `01-UI-SPEC.md`'s "GUI-02 escape
CTA" copy row was deliberately not authored — it would document a tab that does not exist.

### Auto-fixed issues

**1. [Rule 1 — Bug] `_assert_diag_capture` clobbered the registry's summary label**

- **Found during:** Task 1, on the new check's first run.
- **Issue:** a `while IFS=$'\t' read -r label value` loop in a new helper did not declare its
  loop variables local. Under bash's dynamic scoping that assigned into `run_own_checks()`'s own
  `local label` — the summary-row label — and every summary line printed as a bare `: PASS`.
- **Fix:** `local label value` in the helper.
- **Commit:** `c3b5174`

**2. [Rule 1 — Bug] `theia_app_up()` raced the previous check's teardown**

- **Found during:** Task 3, first full-suite run.
- **Issue:** registering `smoke-theia` turned a latent race into five deterministic FAILs.
  `smoke-theia.sh` boots its own backend on `:3000` and tears it down in an EXIT trap; the port
  is not released the instant the script returns, and `theia_app_up()` is called microseconds
  later by the very next row. All five reported "stale run" — which was the previous check still
  exiting. `gui01-command-registered`, the same wrapper further down, passed, which is what
  identified it as a race rather than a defect.
- **Fix:** an occupied port is waited out for up to 30s before being called stale — in
  `theia_app_up()` itself, the one function all five callers route through, not by settling one
  registry row. The guard's purpose is unchanged: an occupant still there after the wait is
  still a named FAIL.
- **Commit:** `91b64a4`

**3. [Rule 1 — Bug] The welcome widget rendered the IDENTIFIER form as its product name**

- **Found during:** Task 3, second run — only visible once fix 2 let `verify-branding` actually
  run.
- **Issue:** `powerbrowser-welcome-widget.tsx` rendered `<h1>PowerBrowser</h1>` — no space —
  and `verify-branding.mjs` had been renamed to expect exactly that. `inventory/brand-tokens.json`
  records `PowerBrowser` as "the value that must NEVER appear in a display string". This is
  Pitfall 1 as written in that file's own comment: a mechanical pass rewrote both the literal
  and the expectation that checks it, so the two agreed, the wrong product name shipped, and
  only the hand-authored inventory disagreed. `document.title` was separately red for the same
  reason in reverse — `applicationName` was hand-written correctly as `Power Browser` while its
  verifier expected the identifier form.
- **Fix:** the heading is the display form; `verify-branding.mjs` expects `Power Browser` on
  both surfaces and now *also* asserts the identifier form is absent from the welcome text
  entirely — the old check would have been satisfied by either value. And the hole that let it
  through: the preflight's display-surface list did not include the widget, and its leak pattern
  required the identifier form to be followed by a space or a quote, so `PowerBrowser<` (a JSX
  text node closing its tag) matched nothing. Both closed; `<` is a safe third terminator because
  every legitimate use of the identifier form continues into an identifier while every rendered
  one ends. Verified by planting the old heading back — the preflight names file, line, and value.
- **Commit:** `86007f3`

**4. [Rule 3 — Blocking] `--gate` hung forever whenever a check started the Theia app**

- **Found during:** Task 3 — twice, before it was diagnosed rather than assumed transient.
- **Issue:** `run_gate_mode()` ran `run_own_checks 2>&1 | tee "$log"`. Bash runs each pipeline
  stage in a subshell, so (a) `theia_app_up()`'s `SERVER_PID=$!` was assigned in a child and
  `cleanup()`, running from the parent's EXIT trap, saw it empty and never killed the app; and
  (b) that surviving app inherited the subshell's stdout — the pipe to `tee` — so `tee` never
  reached EOF and the pipeline never completed. All 61 rows printed, then nothing. Latent since
  the 01-03 consolidation; this is the first plan to run `--gate` to completion on a tree with a
  built binary.
- **Fix:** redirect to a file and `cat` it. `run_own_checks` runs in the main shell again, so
  `SERVER_PID` is visible to cleanup, and a regular-file fd inherited by a background process
  blocks nothing. Only live streaming is given up.
- **Commit:** `c604c52`

### Deliberate additions beyond the plan's letter

- **`smoke-theia` registered** (`8d10f86`) — the plan asked me to confirm the verifier is a true
  superset and add anything missing. Exactly one thing was.
- **Two `--gate` exclusions** (`91b64a4`) — `verify-branding-identity-release` and
  `branding-variant-divergence` read `objdir-release/`, the second ~47-minute release build
  `01-04-PLAN.md` explicitly declined. Each fails with `objdir-release/... does not exist` and
  nothing else. Recorded as named exclusions keyed on ledger entry 10 rather than being deleted,
  narrowed, or left to fail — the exclusion stops applying the instant that entry is closed.

---

## Phase gate result

`scripts/verify-platform.sh --gate` at `c604c52`: **PASS-WITH-EXCLUSIONS**, 286s.

- **57 of 59 registered checks PASS.**
- **2 EXCLUDED (known-open, WINDOWS.md ledger 10):** `branding-variant-divergence`,
  `verify-branding-identity-release` — both blocked solely on an absent `objdir-release/`.
- **0 unexplained failures.**

A plain `scripts/verify-platform.sh` (no arguments) exits **1** on exactly those two rows. That
is the honest state: the plan's acceptance asked for a PASS row on every registered check, and
two cannot be green until a release build exists. They are reported here as a gap, not ticked.

### Every check in the validation strategy's full-suite command is now a labelled row

| Validation-strategy script         | Registry label(s)                                                                                        | Result       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------ |
| `scripts/smoke-theia.sh`           | `smoke-theia`                                                                                              | PASS (added) |
| `scripts/smoke-firefox.sh`         | `smoke-firefox`                                                                                            | PASS         |
| `verify-branding-identity.mjs`     | `verify-branding-identity-dev`, `-release`, `-brand-ftl-control`, `-runtime-control`                       | 3 PASS, 1 excluded |
| `verify-branding.mjs`              | `verify-branding`                                                                                           | PASS         |
| `scripts/verify-endpoints.sh`      | `verify-endpoints`, `verify-endpoints-interrupt-self-test`                                                 | PASS         |
| `verify-uri-roundtrip.mjs`         | `verify-uri-roundtrip`                                                                                      | PASS         |
| `verify-customize-inert.mjs`       | `verify-customize-inert`                                                                                    | PASS         |
| `verify-dev-flag-off.mjs`          | `verify-dev-flag-off`                                                                                       | PASS         |

Plus the plan's named extras, all PASS: the branding preflight and its self-test, the
patch-surface guard and its self-test, the internals-boundary guard with its self-test and
catalogue mode, the fetch and apply self-tests, and the residual scan with no class excluded.

### The phase's five success criteria, mapped

| # | Criterion | Proven by | Status |
|---|-----------|-----------|--------|
| 1 | Inventory committed; residual scan demonstrably red on the pre-rename tree, both before any replacement | `scan-brand-residue` (green now) + `allowlist-schema` + the committed red-scan evidence in `01-SCAN-RED-REPORT.md` from 01-01 | ✅ — the "red before" half is a committed artifact, not a runnable check at this commit, by construction |
| 2 | Builds from a script-refetched `upstream/`; launches a branded app on Linux passing the smoke tests | `fetch-upstream-self-test`, `smoke-firefox`, `smoke-theia`, `verify-branding-identity-dev`, `verify-branding-identity-runtime-control`, `desktop-entry-quick` | ✅ |
| 3 | Toggle Theia → browser UI and back; nothing welds Theia to full-window presentation | `gui01-single-shell-window`, `gui01-browser-close-does-not-quit`, `gui01-command-registered`, `gui04-registry-shape` + self-test | ⚠️ automated half green; **the address-bar/navigate half is manual-only and NOT performed** |
| 4 | Runtime GUI restyle through the customize bridge without forking | `verify-customize-inert`, `verify-dev-flag-off`, `verify-branding` | ⚠️ inertness and flag-gating green; **the visible-restyle half is manual-only and NOT performed** |
| 5 | Internal identifiers in fixed platform form; every branding value hand-written | `scan-brand-residue`, `branding-preflight` + self-test, `internals-boundary` + self-test + catalogue, `check-patch-surface` + self-test, `verify-uri-roundtrip`, `shell-error-copy-no-internals` + self-test | ✅ |

No criterion is unmapped. Criteria 3 and 4 each have one perceptual half that no check on this
platform reaches, which is exactly what `01-VALIDATION.md` routes to its Manual-Only table.

---

## Manual verifications — NOT PERFORMED

Both are recorded as open ledger entries. **This is a gap, not a pass.**

**GUI-01, browser-window toggle — 5 steps, all outstanding.** Launch the app; open a browser
window; confirm the address bar takes keyboard focus and navigates a typed URL; confirm an
in-window modal appears rather than being suppressed; close the window and confirm the shell
returns with the app still running. Automation cannot substitute: BiDi cannot see chrome
contexts on Linux and chrome-context Marionette is platform-blocked (ledger 7). This plan ran
autonomously with no human present, so no step was performed.

**GUI-03, customize bridge — 3 steps, all outstanding.** With the dev flag on, edit
`customize.css` and confirm the shell restyles without a rebuild; delete it; confirm the shell
reverts. Its automatable halves are green — `verify-customize-inert` proves an absent stylesheet
renders identically to an empty one, `verify-dev-flag-off` proves the privileged binding is
absent with the flag off — but neither is the perceptual claim.

Two rows in `.planning/WINDOWS.md` carry these, so the ship gate sees them.

---

## Known Stubs

None. No stub, placeholder, or hardcoded empty value was introduced.

## Threat Flags

None. The plan's `<threat_model>` dispositions all landed:

- **T-07-01** (info disclosure via error text) — mitigated. Identifiers moved to a layer reached
  deliberately, and `shell-error-copy-no-internals` prevents a future path reintroducing the leak
  by pattern rather than by literal.
- **T-07-02** (privileged script) — `verify-dev-flag-off` is registered and green.
- **T-07-03** (runtime stylesheet) — accepted, unchanged.
- **T-07-04** (verification passing vacuously after the rewrite) — this was the real one, and it
  bit in the neighbouring form: `verify-branding.mjs` had been renamed to agree with a wrong
  literal. Caught, fixed, and the preflight hole that hid it closed.
- **T-07-SC** — no package-manager install occurred.

Detail rows carry the same `this._token` redaction `_pushLog` applies, since an `err.message` is
derived text.

---

## Self-Check: PASSED

Created files:

- FOUND: `CLAUDE.md`
- FOUND: `scripts/verify-shell-error-copy.mjs`
- FOUND: `.planning/phases/01-platform-extraction-and-rename/01-07-SUMMARY.md`

Commits (all present in `git log`):

- FOUND: `c3b5174`, `9d66488`, `8d10f86`, `91b64a4`, `86007f3`, `c604c52`

Claims re-verified rather than asserted:

- `node scripts/scan-brand-residue.mjs` → exit 0, 107 files, no class excluded
- `scripts/verify-platform.sh --quick` → 19/19 PASS
- `scripts/verify-platform.sh --gate` → PASS-WITH-EXCLUSIONS, 57/59, at `c604c52`
- `node scripts/verify-shell-error-copy.mjs --self-test` → 6/6 planted faults red, each naming
  the drift
- The preflight's new leak rule → planted the old `<h1>PowerBrowser</h1>` back; it went red
  naming file, line, and value
