---
phase: 01-platform-extraction-and-rename
plan: 08
subsystem: verification-gates
tags: [gap-closure, branding, residual-scan, self-test, display-surface]
status: complete
gap_closure: true

requires:
  - "01-07: the welcome-widget display-form fix, whose bug class this plan generalises"
  - "01-03: the driver consolidation and the hand-written .desktop entries, both of which moved census numbers"
provides:
  - "a residual-brand gate whose exit code has one source and which is proven able to go red on the post-rename branch"
  - "a reconciled expected_count census in which the two scan modes agree on the same tree"
  - "a display-surface set derived from the tree rather than hand-kept"
  - "one shared display-form assertion applied to every runtime display surface"
affects:
  - scripts/scan-brand-residue.mjs
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-branding.mjs
  - scripts/verify-platform.sh
  - inventory/brand-tokens.json

tech-stack:
  added: []
  patterns:
    - "single-sourced gate decision as an exported pure function, callable from the self-test without a subprocess"
    - "expectation sets DERIVED from the tree at check time, never hand-appended"
    - "plant-and-require-red self-tests paired with an unplanted clean control"

key-files:
  created: []
  modified:
    - scripts/scan-brand-residue.mjs
    - inventory/brand-tokens.json
    - scripts/verify-platform.sh
    - scripts/verify-branding-preflight.mjs
    - scripts/verify-branding.mjs
    - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx
    - .planning/WINDOWS.md

decisions:
  - "The gate's non-zero exit is single-sourced through gateFailures(offenses, rec); reconciliation failures now fail the un-flagged run that all three registered call sites invoke"
  - "Condition 4's unclaimed-probe walk moved above reconcile()'s post-rename early return, making it reachable on the only branch this tree occupies"
  - "The -PLAN.md provenance count moved 21 -> 28 by ADDITION only (+2 driver consolidation, +5 INTERNAL-APIS.md catalogue rows); the six historical Sourcerer-era citations are byte-identical to the census-era set"
  - "The absolute-repo-root row is coincidental with expected_count 0, which activates the preflight's coincidental-zero assertion against that path returning"
  - "The preflight's display-surface set is derived by walking the branding extension's browser directory; the inventory-declared variant files and the Theia manifest stay explicitly named because their source is the inventory, not a directory"
  - "verify-branding.mjs reads the display literal and identifier form from the inventory at run time; neither appears as a string constant in the checker"
  - "Ledger items 15 and 16 stay OPEN -- no human was present, and no automated proxy was written for either perceptual walkthrough"

metrics:
  duration: ~25min
  completed: 2026-08-31
  tasks: 3
  commits: 2

actuals:
  tokens: 8655
  tasks: 3
  commits: 2
---

# Phase 01 Plan 08: Gap Closure — Residual-Brand Gate and About Dialog Display Literal Summary

Made the registered residual-brand gate able to fail on the branch this tree
permanently occupies, reconciled the four drifted census rows by name, and
corrected the About dialog's display literal behind two guards that were first
made to go red against that exact defect.

## What was built

Two defects of the same shape, which is why they were one plan: in both cases a
guard was written, wired, and registered, and then never proven able to go red,
so the green was an artefact of the instrument rather than a fact about the
product.

**The residual-brand gate.** `reconcile()`'s condition-4 walk — the scanner's
only defence against a brand string reappearing in a form no inventory row
matches — sat below the post-rename early return, so it was live only while the
rename was still outstanding and unreachable in the state this repo permanently
sits in. It now sits above the branch split. `main()`'s two independent
`return 1` sites collapsed into one exported pure function, `gateFailures()`;
the reconciliation exit had been guarded by `--reconcile`, which none of the
three registered call sites (`verify-platform.sh`, `rebase-upstream.sh`, the CI
workflow) passes. Reconciliation failures now print on every run, while the
`asserting ...` progress narration stays behind the flag.

**The census.** Four `expected_count` rows disagreed with the tree. Each was
reconciled by name with the tree change that moved it written into its own
`reason` field, never by copying the observed number.

**The About dialog.** Its product-name heading rendered `PowerBrowser`, the
space-less identifier form, as user-visible display text. Both guards that
should have caught it were changed first and observed red against it: the
preflight's display-surface set is now derived by walking the branding
extension's browser directory at check time rather than enumerating remembered
paths, and `verify-branding.mjs`'s About surface now carries the identical
display-form, identifier-leak, and stock-identity assertions its welcome sibling
carries, through one shared function reading its expected values from the
inventory.

## Task-by-task

### Task 1 — the gate and the census (commit `01d0ff3`)

Changes to `scripts/scan-brand-residue.mjs`, `inventory/brand-tokens.json`,
`scripts/verify-platform.sh`, `.planning/WINDOWS.md`, landed as one commit
because the plain scan is the first row of the commit gate: a commit carrying
the gating change without the census would be a commit whose own gate is
knowingly red.

**RED, recorded before the census was touched.** With only the `reconcile()` and
`main()` changes applied, `node scripts/scan-brand-residue.mjs` with no flags:

```
scan-brand-residue: held-back row "/home/chris/coding/sourcerer" (lower/coincidental): expected 4 occurrence(s), observed 0
scan-brand-residue: held-back row "MOZ_APP_UA_NAME" (literal/frozen): expected 2 occurrence(s), observed 1
scan-brand-residue: held-back row "MOZ_APP_ID" (literal/frozen): expected 2 occurrence(s), observed 1
scan-brand-residue: held-back row "-PLAN.md" (literal/frozen): expected 21 occurrence(s), observed 28
scan-brand-residue: FAIL -- 4 reconciliation failure(s)
EXIT=1
```

The same invocation on the same tree exited 0 immediately before the change.
That pair is the confirmation the acceptance criteria asked for regarding
`main()`'s reconciliation exit being behind `--reconcile`: putting it back
restores exactly the exit-0 baseline.

**RED by planted fault.** A new `--self-test` case builds a post-rename fixture
in `mktemp -d` (never a path inside this repo) whose inventory carries a single
frozen `Sourcerer` TitleCase row. The control file contains only a claimed
occurrence and is required to produce an empty `gateFailures()`; the planted file
appends the trailing-plural form, whose trailing lowercase character puts it
outside the row's right-boundary rule while leaving condition 4's
case-insensitive probe substring intact. That the plant is genuinely unclaimed is
asserted, not assumed. Output:

```
scan-brand-residue: --self-test PASS -- the same post-rename fixture WITHOUT the plant produced no gate failure (planted-postrename.txt), so the red below is caused by the plant and not by the fixture
scan-brand-residue: --self-test PASS -- an unclaimed trailing-plural form planted on a POST-RENAME fixture was rejected by the un-flagged gate path, naming planted-postrename.txt:2
```

**Discrimination confirmed by temporary reversion** (on a scratch copy outside
the repo, never in the tree): moving the condition-4 walk back below the
post-rename early return makes the new case fail, naming the drift —
`--self-test FAIL -- the planted unclaimed form did NOT fail the un-flagged gate:
gate=[], failures=[]`, exit 1.

**The four census rows, each justified by name:**

| row | was | now | the tree change that moved it |
|---|---:|---:|---|
| `/home/chris/coding/sourcerer` (lower/coincidental) | 4 | 0 | Plan 01-03 hand-wrote both `.desktop` entries, rewriting all four sites (`Exec=` and `Icon=` in each) to this repo's own root. Zero is load-bearing: the row stays coincidental-and-zero so the preflight's coincidental-zero assertion becomes active against the old path returning. |
| `MOZ_APP_UA_NAME` (literal/frozen) | 2 | 1 | The second site was never a define — it was a context line patch 020 happened to carry, dropped when 020 was regenerated during 01-05's browser-window work. `expected_files` now names only patch 010, which carries the real site. |
| `MOZ_APP_ID` (literal/frozen) | 2 | 1 | Same change, same reason. |
| `-PLAN.md` (literal/frozen) | 21 | 28 | Two additions, no deletions: **+2** from the 01-03 driver consolidation (`verify-phase-03/04/05.sh` carried 1+1+3 citations; `verify-platform.sh` now carries those same 5 ported verbatim plus 2 new 01-04 citations), and **+5** from `powerbrowser/INTERNAL-APIS.md` growing 6→11 when 01-05 catalogued its GUI-01 touchpoints. 21 + 2 + 5 = 28, closing by name. |

D-08 provenance is intact and was verified rather than assumed: the six
Sourcerer-era citations in `INTERNAL-APIS.md` (05-01 ×1, 05-03 ×3, 05-04 ×2) are
byte-identical to the census-era set. Nothing was renumbered or deleted.

**GREEN after the correction.** `node scripts/scan-brand-residue.mjs` exits 0 and
`node scripts/scan-brand-residue.mjs --reconcile` exits 0 on the identical tree —
the disagreement 01-VERIFICATION.md reproduced is gone.

One registry row was appended to `run_own_checks()`'s quick set,
`scan-brand-residue-self-test`; the label appears exactly once and no sibling
driver was created. No file inside the scanned scope gained a plan citation
written as a full filename, so the reconciliation stayed green after the registry
edit.

### Task 2 — the About dialog and its guards (commit `e21f319`)

**RED against the real defect, static, recorded before the literal was
corrected.** With only the derived enumeration applied:

```
verify-branding-preflight: FAIL -- 1 branding literal(s) disagree with inventory/brand-tokens.json
  - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:34 leaks the IDENTIFIER form "PowerBrowser" into a display surface: "<h3>PowerBrowser</h3>". The display form has a space.
EXIT=1
```

**RED against the real defect, runtime, recorded before the literal was
corrected.** With only the shared assertion applied, the failure names the
*about* surface, not the welcome one:

```
verify-branding: FAIL -- about dialog textContent missing the display form "Power Browser": "PowerBrowserVersion 1.74.1https://powerbrowser.org/"
verify-platform: FAIL -- see summary above
EXIT=1
```

**RED by planted fault.** The preflight's self-test now copies the whole branding
browser directory into its fixture (it previously carried one file from it, so
the derived walk would have been exercised vacuously) and plants the identifier
form as a JSX text node in the About dialog's copy:

```
verify-branding-preflight: --self-test -- planted the identifier form in theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx and it was REJECTED by the DERIVED surface walk: ...:34 leaks the IDENTIFIER form "PowerBrowser" into a display surface: "<h3>PowerBrowser</h3>"
```

The unmutated control was green and the two pre-existing cases (planted branding
term, emptied brand-display row set) still pass.

**The derived set was proven to behave both ways.** A scratch `.tsx` dropped into
the branding browser directory containing the identifier form was rejected by
name with the script unedited, then deleted before committing. A walk yielding
zero source files produces its own distinct failure — `theia/extensions/branding/src/browser/ yielded ZERO TypeScript source files, so the display-surface leak scan checked nothing. An empty derived set is a failure, not a clean run.` — rather than a clean pass.

**GREEN after the correction.** `node scripts/verify-branding-preflight.mjs` exits
0, and `scripts/verify-platform.sh --only verify-branding` exits 0 with a PASS
line for each of the four expected surfaces (title, favicon, welcome, about),
asserted against the live DOM over BiDi.

The JSX diff is one text node — `1 insertion(+), 1 deletion(-)`. The
`ad-container` class, the 48×48 mark with its `prefers-color-scheme` dual fill,
the version line and the repository anchor are untouched (D-35, D-36, UI-SPEC
E7). The rendered repository URL is all-lowercase, confirmed at runtime rather
than assumed, so the case-sensitive identifier-form assertion does not collide
with it.

`verify-branding.mjs` now carries no display literal as a string constant:
`DISPLAY_FORM` and `IDENTIFIER_FORM` are read from
`inventory/brand-tokens.json`'s `brand_display_expectations` at run time, and the
`document.title` expectation reads from the same source rather than its former
hard-coded value.

### Task 3 — re-proof and the two perceptual walkthroughs

| gate | result |
|---|---|
| `scripts/verify-platform.sh --quick` | exit 0, 20 PASS rows, 0 FAIL |
| `node scripts/scan-brand-residue.mjs` | exit 0 |
| `node scripts/scan-brand-residue.mjs --reconcile` | exit 0 — the two modes agree on the same tree |
| `node scripts/scan-brand-residue.mjs --self-test` | exit 0, having planted a fault and required rejection |
| `node scripts/verify-branding-preflight.mjs --self-test` | exit 0, three planted faults each rejected |

No full-suite or Gecko rebuild was spent: both defects were static, neither
touches a compiled Gecko path, and the full gate was already green at the phase
gate in the prior plan.

**Both perceptual walkthroughs remain OPEN.** No human was present for this
execution, so ledger items 15 (GUI-01, five steps) and 16 (GUI-03, three steps)
were not performed and were not closed. No automated proxy was written for
either — both are platform-blocked on Linux (BiDi cannot see chrome contexts,
chrome-context automation is blocked), and an automated check that cannot observe
the perceptual outcome produces a green nobody earned, which removes the only
surface that would have surfaced the gap again. This task added no registry row,
verifiable in the registry diff.

The six code-review warnings outside this plan's scope are untouched and
`01-REVIEW.md` was not edited.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] The Theia frontend bundle had to be rebuilt before the runtime GREEN could be observed**

- **Found during:** Task 2, after correcting the display literal.
- **Issue:** `scripts/verify-platform.sh --only verify-branding` continued to
  report the About dialog rendering the identifier form after the TSX fix. The
  dev app serves a compiled bundle; the source change was not in it, so the
  runtime check was reading a stale artefact and would have reported a red that
  was not a fact about the tree.
- **Fix:** rebuilt the branding extension and the browser application inside the
  Theia dev shell (`nix develop .#theia --command yarn --cwd extensions/branding
  build`, then the same for `applications/browser`). Both exited 0 with no
  errors, after which the runtime check went green on all four surfaces.
- **Files modified:** none tracked — build output only, all of it gitignored;
  `git status --short` showed no new untracked artefacts.
- **Commit:** `e21f319` (no separate commit; nothing tracked changed).

**2. [Rule 2 — Missing critical functionality] WINDOWS.md ledger item 17 closed**

- **Found during:** Task 2.
- **Issue:** item 17 records exactly the defect this task fixed — that the
  preflight's display-surface list was hand-kept, and that the omission is what
  let the welcome widget render the identifier form through the whole rename. The
  plan's task list named only item 6 for closure. Leaving 17 open after its
  underlying work was actually done is the mirror of the prohibition against
  closing an item whose work is not done: it makes the ledger disagree with the
  tree in the other direction.
- **Fix:** closed with a resolution naming what changed and, explicitly, what did
  **not**: a display surface authored outside the enumerated directory and
  outside the inventory-declared variant files is still not reached by the leak
  scan and rests on code review. That residual is recorded as this plan's
  backstop truth, not as a closed gap.
- **Files modified:** `.planning/WINDOWS.md`
- **Commit:** `e21f319`

### Structural deviation

**Task 3 produced no commit of its own.** Its work is a re-proof over the whole
tree plus a decision not to close two ledger items, and its own acceptance
criteria require that it add no registry row and close nothing without a recorded
walkthrough. There was therefore nothing to commit. Two commits for three tasks
is the honest count, and it is recorded as such in `actuals` rather than padded
with an empty commit.

## Known Stubs

None. No stub, placeholder, or hardcoded empty value was introduced. The one
piece of deliberately unfinished business is the two perceptual walkthroughs,
which are ledger items rather than stubs and are carried forward open by design.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or schema change
at a trust boundary was introduced. Every change is to an existing first-party
script, one inventory file, or one JSX text node; no package-manager install
occurred and no dependency was added to either workspace.

## Requirements

- **MIG-03** — the registered residual-brand gate now fails on an unclaimed
  occurrence in its plain, un-flagged mode, proven by a fault-planting self-test
  with a clean control, and the census reconciles against the real tree with
  every moved number justified by name (D-08, D-17, D-18).
- **MIG-04** — the About dialog renders the hand-written display form, and both
  the static and runtime checks that guard it were observed red against that
  exact defect before it was fixed (D-35, Success Criterion 5).

## Self-Check: PASSED

All modified files verified present on disk and both commits verified present in
`git log`.
