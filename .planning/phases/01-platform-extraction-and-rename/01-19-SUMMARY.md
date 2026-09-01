---
phase: 01-platform-extraction-and-rename
plan: 19
subsystem: branding
tags: [gecko, shell-chrome, window-title, verification, derived-file-sets]

requires:
  - phase: 01-platform-extraction-and-rename (plan 01-03)
    provides: inventory/brand-tokens.json brand_display_expectations — the third-source authority for which form belongs where
  - phase: 01-platform-extraction-and-rename (plan 01-04)
    provides: objdir/ — the built tree whose chrome symlink makes this a tier-1 (no-build) correction
  - phase: 01-platform-extraction-and-rename (plan 01-08)
    provides: verify-branding-preflight.mjs section 6's derived display-surface set — the pattern this plan extends rather than appends to
  - phase: 01-platform-extraction-and-rename (plan 01-18)
    provides: verify-branding-preflight.mjs section 9 and its fourth self-test plant — the on-disk state this plan builds on
provides:
  - The shell window's OS title bar and startup loading wordmark carry the ratified spaced display form
  - The display-surface leak scan reads the shell's chrome markup, derived from powerbrowser/shell/jar.mn at check time
  - _branding_variant_divergence_impl expects the shipped display values instead of the identifier form
affects: [phase 02 configuration-driven rebrand]

actuals:
  tokens: 63000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A packaging manifest read at check time as the source of a checker's file set, restricted by file class with the restriction justified in place"

key-files:
  created: []
  modified:
    - powerbrowser/shell/powerbrowser.xhtml
    - scripts/verify-platform.sh
    - scripts/verify-branding-preflight.mjs
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md

key-decisions:
  - "The stale expectation inside _branding_variant_divergence_impl is corrected here rather than deferred: it is the same truth (the identifier form never leaks into a display string) in the same phase, it is five literals and a comment, and left alone it would demand the wrong brandFullName the moment objdir-release exists."
  - "The shell markup set is DERIVED from powerbrowser/shell/jar.mn, not appended as a path. An appended path is what 01-07 did, what 01-08 replaced, and what let this leak survive the rename."
  - "The derivation is restricted to .xhtml/.html. The same manifest packages powerbrowser.js, PowerBrowserAPI.sys.mjs and TheiaService.sys.mjs, whose prose comments legitimately spell the identifier form followed by a space; widening would manufacture a false red."
  - "No new verify-platform.sh registry row. The work reaches --quick through the two branding-preflight rows that already exist."

requirements-completed: [MIG-03, MIG-04]

coverage:
  - id: D1
    description: "The chrome document <title> and the #powerbrowser-loading wordmark carry the spaced display form; every identifier occurrence is unchanged"
    requirement: MIG-03
    verification:
      - kind: unit
        ref: "01-19-PLAN.md Task 1 <automated> — title/wordmark counts 1, windowtype and chrome script URL intact, upstream/ clean"
        status: pass
      - kind: integration
        ref: "cmp objdir/dist/bin/browser/chrome/browser/content/powerbrowser/powerbrowser.xhtml powerbrowser/shell/powerbrowser.xhtml"
        status: pass
    human_judgment: true
    rationale: "Whether the OS title bar actually reads the spaced form is a perceptual fact. Chrome-context Marionette is platform-blocked on Linux (WINDOWS.md ledger item 7), so the only observer is a human launching the shell."
  - id: D2
    description: "_branding_variant_divergence_impl expects the shipped display values on both variants while still asserting the dev-vs-release suffix divergence"
    requirement: MIG-04
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only branding-variant-divergence-self-test — control green, both planted mutations red by name"
        status: pass
    human_judgment: false
  - id: D3
    description: "verify-branding-preflight.mjs section 6 derives the shell's packaged markup into the display-surface set, with a non-vacuity guard and a planted fault reproducing the pre-fix state"
    requirement: MIG-04
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only branding-preflight-self-test — control green, fifth plant REJECTED naming the file, line and text"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-31
status: complete
---

# Phase 01 Plan 19: Close G-01-25 — the shell window title bar Summary

**Two rendered strings in the shell's chrome document carried the compact identifier form and one of them was the literal Gecko hands the window manager for the window's whole lifetime — corrected, together with the same defect latent in a checker's own expectation, and closed at the class level by deriving the shell's packaged markup into the display-surface leak scan whose pattern already matched both literals.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3 of 3
- **Files modified:** 4

## Accomplishments

- **Corrected the title bar at its single sufficient cause.** `powerbrowser/shell/powerbrowser.xhtml`'s `<title>` is static; the shell JS never writes a title, the root element opts into no content-title tracking, and Theia's own correct `document.title` stays inside the remote `<xul:browser>`. One literal is the whole chain, so one edit is the whole fix.
- **Corrected the same leak in the loading layer.** `#powerbrowser-loading`'s wordmark is the file's only other rendered string and carried the same form. `01-UI-SPEC.md` describes the wordmark only as text in the loading layer; it never ratified a compact variant.
- **Left every identifier occurrence alone.** `windowtype="powerbrowser:main"`, the element ids, the `chrome://powerbrowser/content/` stylesheet and script URLs, and the module filenames are identifiers. The boundary rule: the compact form is legitimate wherever it continues into an identifier and wrong wherever it ends a rendered string.
- **Corrected the same defect class where it was latent in a checker.** `_branding_variant_divergence_impl` compared each variant's installed `brandFullName` against a hand-written expectation spelling the compact form, while both `brand.properties` ship the spaced form. That check reads `objdir-release/`, which does not exist, so it is a named `--gate` exclusion on WINDOWS.md ledger entry 10 and has never run. Left alone it would, the day a release objdir exists, demand the wrong display string or invite someone to "fix" a correct shipped value.
- **Closed the detection gap by derivation.** The preflight's section-6 leak pattern (`PowerBrowser` followed by a space, quote or `<`) already matched both offending literals exactly. Nothing went red because the file was never read. Section 6 now derives the shell's packaged markup from `powerbrowser/shell/jar.mn` at check time, so a second chrome document is covered the day it ships.
- **Confirmed the correction is live with no build.** `objdir/dist/bin/browser/chrome/browser/content/powerbrowser/powerbrowser.xhtml` is a symlink into the source tree (BUILD.md tier 1). `cmp` against the source is clean and the installed path carries the spaced form.

## Task Commits

1. **Task 1: Correct the two shell display literals and the stale checker expectation** — `00378c0` (fix)
2. **Task 2: Derive the shell's chrome markup into the display-surface leak scan** — `3428c0d` (test)
3. **Task 3: Confirm the correction reaches the shipped product** — `9112503` (docs)

## Files Created/Modified

- `powerbrowser/shell/powerbrowser.xhtml` — `<title>Power Browser</title>` and `<div id="powerbrowser-loading">Power Browser</div>`; nothing else touched
- `scripts/verify-platform.sh` — `_branding_variant_divergence_impl`'s two expected values and the two failure messages that quote them, the explanatory comment above the function, and the three synthesised fixture writes in `check_branding_variant_divergence_self_test` (dev, release, and the suffix-stripping mutation)
- `scripts/verify-branding-preflight.mjs` — section 6's derived shell-markup contribution with its non-vacuity guard and the markup restriction justified in place; the self-test fixture now copies `powerbrowser/shell/jar.mn` and `powerbrowser.xhtml`; a fifth plant reverting the chrome document title
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — row 12

## Decisions Made

See `key-decisions` in the frontmatter. The one worth restating: **the fix is a read set, not a pattern.** The leak regex written in 01-03 would have caught `<title>PowerBrowser</title>` on the day it was written. What failed was the enumeration of what to read — twice now, in 01-07 and again here. Both times the answer was to derive the set from something the tree already maintains (a directory in 01-08, a packaging manifest here) rather than to remember one more path.

The restriction to markup is the other half of that judgement and it is deliberate rather than lazy: `powerbrowser.js`, `PowerBrowserAPI.sys.mjs` and `TheiaService.sys.mjs` are packaged by the same manifest and their prose comments legitimately spell the identifier form followed by a space. A scan that reddened on those would be switched off within a week, and a switched-off checker catches nothing at all.

## Deviations from Plan

None — the plan executed exactly as written. Every `<automated>` block passed on its first run, and no auto-fix rule was invoked.

## Issues Encountered

**Verified that changing the two literals does not disturb `inventory/brand-tokens.json`'s count rows.** Those rows carry *pre-rename* occurrence counts of the originating product's tokens, which is what `scan-brand-residue.mjs` reconciles against; they say nothing about how many times the new brand's identifier form appears. `scan-brand-residue` stayed PASS after each task.

**The installed path resolves through two symlinks, not one.** `objdir/dist/bin/.../powerbrowser.xhtml` → `upstream/powerbrowser/shell/powerbrowser.xhtml`, and `upstream/powerbrowser` is itself a link back into this repo. `cmp` against the source is clean, so the chain terminates where BUILD.md's tier-1 row says it does.

## Known Stubs

None.

## Verification

- `bash scripts/verify-platform.sh --quick` → **PASS**, all 24 rows, run after each of the three tasks.
- `branding-variant-divergence-self-test` → PASS: synthesised correct quartet green, both planted mutations red by name.
- `branding-preflight` → PASS. `branding-preflight-self-test` → PASS with the unmutated control green and the new fifth plant rejected by name: *"powerbrowser/shell/powerbrowser.xhtml:30 leaks the IDENTIFIER form \"PowerBrowser\" into a display surface: \"<title>PowerBrowser</title>\". The display form has a space."*
- `git -C upstream diff` empty; no patch regenerated; no build run.
- `cmp objdir/dist/bin/browser/chrome/browser/content/powerbrowser/powerbrowser.xhtml powerbrowser/shell/powerbrowser.xhtml` → identical, and the installed path greps 1 for the spaced title.

## Pending Human Verification

Deferred to end-of-phase UAT. Launch `objdir/dist/bin/powerbrowser` and confirm in order:

1. The OS window title bar of the shell window reads **Power Browser** — spaced, not run together. This is the reported gap.
2. During startup, the loading layer's wordmark also reads **Power Browser**. It flashes briefly; launching with the sidecar unavailable holds it on screen.
3. Regression check for 01-18: open Help > About and confirm the stock link rows are still absent and the dialog is still dark-neutral.

## Self-Check: PASSED

- `powerbrowser/shell/powerbrowser.xhtml` — FOUND
- `scripts/verify-platform.sh` — FOUND
- `scripts/verify-branding-preflight.mjs` — FOUND
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — FOUND (row 12)
- commits `00378c0`, `3428c0d`, `9112503` — FOUND
