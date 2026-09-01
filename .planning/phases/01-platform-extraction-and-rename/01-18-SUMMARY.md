---
phase: 01-platform-extraction-and-rename
plan: 18
subsystem: branding
tags: [gecko, jar.mn, chrome-packaging, css, about-dialog, verification]

requires:
  - phase: 01-platform-extraction-and-rename (plan 01-03)
    provides: powerbrowser/branding/{dev,release}/content/aboutDialog.css — the dark-neutral restyle this plan finally activates
  - phase: 01-platform-extraction-and-rename (plan 01-04)
    provides: objdir/ — the built tree the tier-2 packaging step writes into
provides:
  - The branding chrome package now ships aboutDialog.css, so chrome://branding/content/aboutDialog.css resolves instead of 404ing silently
  - All six stock Mozilla-destined link surfaces in Help > About are suppressed through upstream's own branding-CSS hook, with zero Gecko patch
  - A bidirectional, tree-derived packaging-completeness assertion in the no-build commit gate
affects: [phase 02 configuration-driven rebrand, phase 03 icon pipeline]

actuals:
  tokens: 8090
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Chrome-resource packaging completeness asserted from a directory read at check time, in three directions (addition, removal, variant divergence)"

key-files:
  created: []
  modified:
    - powerbrowser/branding/dev/content/jar.mn
    - powerbrowser/branding/release/content/jar.mn
    - powerbrowser/branding/dev/content/aboutDialog.css
    - powerbrowser/branding/release/content/aboutDialog.css
    - scripts/verify-branding-preflight.mjs
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md

key-decisions:
  - "#communityDesc is suppressed with the five reported rows rather than deferred: it renders a link whose visible label is this product's own vendor name and whose target is mozilla.org — the reported defect in its worst instance."
  - "The wordmark-positioning block is REMOVED from both stylesheets rather than carried into a now-live file, because the asset it positions (chrome://branding/content/about-wordmark.svg) is unshipped and its 64px top padding would reserve an empty band above the version text for an image that 404s."
  - "Suppression is by CSS through upstream's branding linkset hook, not by a Gecko patch against aboutDialog.xhtml. upstream/ and patches/ are untouched."
  - "The packaging assertion reaches --quick through the two branding-preflight registry rows that already exist. No new registry row, no sibling driver."
  - "The assertion is scoped to the branding content directories and says why: powerbrowser/shell/ deliberately mixes chrome resources with non-chrome files, so the same rule there would need a hand-kept exclusion list."

patterns-established:
  - "Packaging-completeness: a chrome payload directory's resource set is derived by readdirSync at check time and reconciled against its jar.mn in both directions, plus a cross-variant destination-set equality."

requirements-completed: [MIG-03, MIG-04]

coverage:
  - id: D1
    description: "Both variants' content/jar.mn package aboutDialog.css into content/branding/, and the stale header comment claiming the omission was deliberate is corrected"
    requirement: MIG-03
    verification:
      - kind: integration
        ref: "test -f objdir/dist/bin/browser/chrome/browser/content/branding/aboutDialog.css && cmp with powerbrowser/branding/dev/content/aboutDialog.css"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only branding-preflight"
        status: pass
    human_judgment: false
  - id: D2
    description: "The three stock outbound-link containers (#communityDesc, #contributeDesc, #bottomBox > hbox) are hidden and the wordmark-positioning block is removed"
    requirement: MIG-03
    verification:
      - kind: unit
        ref: "grep assertions in 01-18-PLAN.md Task 1 <automated> (both variants, byte-identical, no rightBox)"
        status: pass
    human_judgment: true
    rationale: "Whether the rows are actually gone on screen, whether the dialog now reads dark-neutral, and whether an empty band survives above the version text are perceptual facts. Chrome-context Marionette is platform-blocked on Linux (WINDOWS.md ledger item 7), so the only observer is a human opening Help > About."
  - id: D3
    description: "verify-branding-preflight.mjs section 9 asserts branding chrome-resource packaging completeness in three directions from a directory read at check time, with a planted fault reproducing the pre-fix state"
    requirement: MIG-04
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only branding-preflight-self-test — control green, fourth plant REJECTED by name"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-08-31
status: complete
---

# Phase 01 Plan 18: Close G-01-3 — the stock About-dialog link rows Summary

**Packaged the branding stylesheet that had been dead since 01-03, which both suppressed all six stock Mozilla-destined About-dialog link surfaces through upstream's own branding hook and, as a side effect, made the dark-neutral restyle live for the first time — with a tree-derived packaging-completeness assertion added to `--quick` so a resource can never again sit beside a manifest that forgot it.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 3 of 3
- **Files modified:** 6

## Accomplishments

- **Closed the AND-gate on the branding side.** `powerbrowser/branding/{dev,release}/content/jar.mn` now carry `content/branding/aboutDialog.css (aboutDialog.css)`. The stylesheet is the third and last entry in `upstream/browser/base/content/aboutDialog.xhtml`'s linkset, so it wins at equal specificity; suppressing the rows needed no Gecko patch and `git -C upstream diff` stayed empty throughout.
- **Suppressed six link surfaces, not five.** `#contributeDesc` (Make a donation, get involved!) and `#bottomBox > hbox` (Licensing Information, Terms of Use, Privacy Notice) are the reported five. `#communityDesc` — unreported — renders a link labelled with this product's own vendor name that navigates to mozilla.org, and went with them. `#trademark` is `#bottomBox`'s other child and is untouched.
- **Removed the wordmark-positioning block.** It set `padding-top: 64px` for an image loaded from an asset this tree does not ship. Inert while the file was unpackaged; an empty 64px band the moment it loaded.
- **Added the class fix.** `scripts/verify-branding-preflight.mjs` section 9 reads each variant's `content/` directory at check time and asserts (a) every resource has a packaging line, (b) every manifest source still exists, (c) both variants package the same destination set. A zero-yield directory is a failure, not a clean run.
- **Proved the resource ships.** `./mach build faster` (tier 2, ~10s wall) installed `objdir/dist/bin/browser/chrome/browser/content/branding/aboutDialog.css` as a symlink into the source tree — so every later edit to the stylesheet's *content* is live with no build at all.

## Task Commits

1. **Task 1: Package the branding stylesheet and suppress the stock link rows** — `e24f210` (fix)
2. **Task 2: Assert branding chrome-resource packaging completeness, derived from the tree** — `be07357` (test)
3. **Task 3: Prove the resource ships, then look at the dialog** — `12fe471` (docs)

## Files Created/Modified

- `powerbrowser/branding/dev/content/jar.mn` — packages `aboutDialog.css`; header comment corrected (it claimed the omission was deliberate and out of a prior phase's scope, which stopped being true in 01-03)
- `powerbrowser/branding/release/content/jar.mn` — byte-identical to dev
- `powerbrowser/branding/dev/content/aboutDialog.css` — `display: none` for the three stock containers; wordmark-positioning block removed; `@media` colour rules and `#bottomBox` padding kept
- `powerbrowser/branding/release/content/aboutDialog.css` — byte-identical to dev
- `scripts/verify-branding-preflight.mjs` — section 9 (packaging completeness, three directions) and the fourth `--self-test` plant; fixture copy list widened to both manifests and all five icons
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — row 11

## Decisions Made

See `key-decisions` in the frontmatter. The one worth restating: the suppression is **hidden-not-removed**. Deleting the elements requires a regenerated Gecko patch against `aboutDialog.xhtml`, which the debug session ratified as the heavier path to take only if hidden-not-removed fails UAT. The residual risk, recorded in deferred-items row 11, is that a future ESR rebase renaming those container ids silently un-hides the rows — and the new packaging assertion does **not** catch that case, because packaging is intact in it and only the selectors have gone stale.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Task 1's own `<automated>` verify contradicted its `<action>`**

- **Found during:** Task 1
- **Issue:** The action said to leave a comment in place of the removed block "recording that the block is removed", and the natural wording spells `#rightBox`. The verify asserts `grep -q 'rightBox' … && exit 1` — absence of the identifier. Written as instructed, the task could not pass its own gate.
- **Fix:** The replacement comment says "The wordmark-positioning block that used to sit here is removed" and records everything the action asked for — why (the asset is unshipped), what would happen if kept (a 64px empty band above the version text), and that Phase 3's icon pipeline owns the wordmark and the block returns with it — without spelling the identifier.
- **Files modified:** `powerbrowser/branding/{dev,release}/content/aboutDialog.css`
- **Verification:** Task 1's `<automated>` block now passes in full.
- **Committed in:** `e24f210`

---

**Total deviations:** 1 auto-fixed (1 × Rule 3).
**Impact on plan:** None on scope. The must-have artifact ("the `#rightBox` block removed with a comment naming Phase 3's icon pipeline as the wordmark's owner") is satisfied in substance; only the comment's wording changed to satisfy the plan's own absence assertion.

## Issues Encountered

**Checked whether `#experimental` needed suppressing too, and it does not.** `upstream/browser/base/content/aboutDialog.js:74-76` un-hides `#experimental` and hides `#communityDesc` only when `Services.appinfo.version` matches `/a\d+$/` — i.e. nightly. This tree builds `153.1.0esr`, so `#communityExperimentalDesc` (which carries the same two mozilla.org links) stays `hidden="true"` and is not a live surface. No extra selector was added; adding one would have been unrequested scope on a container that cannot render here.

## Known Stubs

None.

## Verification

- `bash scripts/verify-platform.sh --quick` → **PASS**, all 24 rows, run after each of the three tasks.
- `branding-preflight` → PASS. `branding-preflight-self-test` → PASS, with the unmutated control green first and the new fourth plant rejected by name: *"powerbrowser/branding/dev/content/aboutDialog.css is a chrome resource that powerbrowser/branding/dev/content/jar.mn does not package."*
- `git -C upstream diff` empty; `git diff -- patches/` empty.
- `diff` between the dev and release variants of both `content/jar.mn` and `content/aboutDialog.css` → byte-identical.
- `objdir/dist/bin/browser/chrome/browser/content/branding/aboutDialog.css` exists and `cmp`s clean against `powerbrowser/branding/dev/content/aboutDialog.css`.

## Pending Human Verification

Deferred to end-of-phase UAT (`human_verify_mode: end-of-phase`). Launch `objdir/dist/bin/powerbrowser`, open Help > About, and confirm in order:

1. None of the five reported rows is present: Make a donation, get involved!, Licensing Information, Terms of Use, Privacy Notice.
2. The community blurb is also gone — the sentence whose vendor-name link pointed at mozilla.org. This was **not** in the report; it was suppressed with the five because the label is this product's vendor name and the target was another vendor's site. If you want that sentence back, say so and it returns with only its links removed.
3. The naming is still correct: the dialog names Power Browser, the version line reads normally, and the trademark line at the bottom is still there.
4. The dialog is dark-neutral rather than purple — the restyle that shipped dead in 01-03 and is live for the first time.
5. There is **no** empty band above the version text where a wordmark would sit.

If (1) or (2) shows a surviving row, the fallback is already identified: the three bottom labels each carry class `bottom-link`, and hiding those directly replaces the `#bottomBox > hbox` type selector. That edit needs no build — the installed resource is a symlink into the source tree.

## Self-Check: PASSED

- `powerbrowser/branding/dev/content/jar.mn` — FOUND
- `powerbrowser/branding/release/content/jar.mn` — FOUND
- `powerbrowser/branding/dev/content/aboutDialog.css` — FOUND
- `powerbrowser/branding/release/content/aboutDialog.css` — FOUND
- `scripts/verify-branding-preflight.mjs` — FOUND
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — FOUND (row 11)
- `objdir/dist/bin/browser/chrome/browser/content/branding/aboutDialog.css` — FOUND
- commits `e24f210`, `be07357`, `12fe471` — FOUND
