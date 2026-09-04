---
phase: 01-platform-extraction-and-rename
plan: 20
subsystem: branding
tags: [debranding, about-dialog, verification, licence-disclosure, gap-closure]
status: complete

requires:
  - "01-18's packaged aboutDialog.css and its branding-preflight section 9 packaging assertion"
  - "upstream/browser/base/content/aboutDialog.xhtml (git-ignored clone, materialised by scripts/fetch-upstream.sh)"
  - "scripts/verify-platform.sh — the single check registry (D-21)"
provides:
  - "scripts/verify-about-dialog-suppression.mjs — derived-both-sides gate over the About dialog's suppression selectors"
  - "registry rows about-dialog-suppression (full set) and about-dialog-suppression-self-test (--quick)"
  - "an href-qualified bottom-row suppression selector that spares the about:license disclosure"
affects:
  - "powerbrowser/branding/{dev,release}/content/aboutDialog.css"
  - "scripts/verify-platform.sh --quick row count: 24 -> 25"
  - ".planning/WINDOWS.md open_count: 7 -> 5"

tech-stack:
  added: []
  patterns:
    - "derive both sides at check time and compare (CLAUDE.md verification rule 2), following verify-registry-shape.mjs and verify-shell-error-copy.mjs"
    - "green control first, then planted faults, each required red and each required to NAME its drift (verify-branding-preflight.mjs's selfTest shape)"
    - "hermetic self-test row in --quick, non-hermetic real-input row RE-TIERED into the full set with a comment saying re-tiered not excused (apply-patches-self-test's precedent)"

key-files:
  created:
    - scripts/verify-about-dialog-suppression.mjs
  modified:
    - powerbrowser/branding/dev/content/aboutDialog.css
    - powerbrowser/branding/release/content/aboutDialog.css
    - scripts/verify-platform.sh
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md
    - .planning/WINDOWS.md
    - .planning/REQUIREMENTS.md

decisions:
  - "Qualify the bottom-row selector by href prefix rather than by enumerating the two vendor links' ids — upstream gives those labels no ids, and an href-prefix test survives an upstream reordering of the row while an nth-child test would not."
  - "Assert reachability for about:license ONLY. #communityDesc stays suppressed despite containing an about:credits link: contributor credits are vendor content this product is correctly debranding, not a licence disclosure. Recorded as deferred-items row 11 (a-i) so it is not silently re-litigated."
  - "The self-test's upstream markup is authored, not copied from upstream/, so the --quick row needs no 1.1 GB clone. Fixture drift can only weaken the self-test, never the gate. Recorded as deferred-items row 11 (a-ii); route is re-derive at the first ESR bump."
  - "about-dialog-suppression sits in the full set's RE-TIERED block rather than --quick, because it reads the git-ignored clone. It fails loudly (naming the path and fetch-upstream.sh) rather than skipping when the clone is absent."

metrics:
  duration: ~35 min
  completed: 2026-09-01
  tasks: 3
  commits: 3

actuals:
  tokens: 16000
  tasks: 3
  commits: 3
---

# Phase 01 Plan 20: Close the about:license Suppression Gap — Summary

The About dialog's debranding rule was widened from a container to an href-qualified selector, so
the internal `about:license` disclosure link survives debranding while both `https://www.mozilla.org`
bottom links stay suppressed — and a registered, tree-derived check with four planted faults now
makes the previous state a red row instead of a silent one.

## What shipped

### Task 1 — the checker, then the fix (tracer, red-first)

`scripts/verify-about-dialog-suppression.mjs` was written and observed red against the unfixed tree
BEFORE either stylesheet was touched. Shipped function names, exactly as they went in:

| Name | Role |
|------|------|
| `parseSuppressionSelectors(css)` | comma-split selector list of every rule whose block carries `display: none`, block comments stripped first |
| `parseMarkup(xhtml)` | element tree (tag, id, classes, href, parent), with comments, XML decl, doctype and `#ifdef`/`#endif` lines removed |
| `parseSelector(text)` | compound + combinator parse; throws on anything outside the supported grammar |
| `matches(selector, el)` | right-to-left match over the ancestor chain |
| `runChecks(root)` | the four assertions, rooted at a directory so the self-test can pass a fixture |
| `selfTest()` | mkdtemp fixture, green control, four planted faults |

Internal helpers alongside them: `makeReporter`, `describe`, `tokenizeSelector`, `parseCompound`,
`matchCompound`, `fixtureMarkup`, `dropSuppressionRule`.

**Observed RED on the pre-fix tree, verbatim:**

```
verify-about-dialog-suppression: FAIL -- 2 problem(s) with the About dialog's suppression selectors
  - SUPPRESSES THE LICENCE DISCLOSURE: powerbrowser/branding/dev/content/aboutDialog.css's selector "#bottomBox > hbox" matches its ancestor <hbox>, which hides <label class="bottom-link" href="about:license">. That link is the product's only in-UI route to its aggregated open-source licence text (href="about:license") and must survive debranding. Qualify the selector so it reaches only the outbound vendor links.
  - SUPPRESSES THE LICENCE DISCLOSURE: powerbrowser/branding/release/content/aboutDialog.css's selector "#bottomBox > hbox" matches its ancestor <hbox>, which hides <label class="bottom-link" href="about:license">. That link is the product's only in-UI route to its aggregated open-source licence text (href="about:license") and must survive debranding. Qualify the selector so it reaches only the outbound vendor links.
```

The fix: `#bottomBox > hbox` became
`#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]` in
`powerbrowser/branding/release/content/aboutDialog.css`, whose comment block was rewritten to describe
the row as MIXED rather than outbound and to state that the licence link stays visible and why. The
dev variant was copied from release, so `cmp` is clean (D-13). `#communityDesc` and `#contributeDesc`
were left exactly as they were.

Post-fix: `verify-about-dialog-suppression: PASS -- every shipped suppression selector matches
upstream markup and none reaches the about:license disclosure link`.

**The four self-test fault-row labels, as printed:**

- `(a) internal-link suppression -- the pre-fix 01-18 selector, restored` — red naming `about:license` and `#bottomBox > hbox`
- `(b) stale selector -- upstream renames the bottom-row container` — red with `STALE` naming the qualified selector
- `(c) empty derived selector set -- the suppression rule stops shipping` — red with `VACUOUS`/`ZERO`
- `(d) missing premise -- upstream drops the licence disclosure link` — red with `MISSING PREMISE`

Each is preceded by the green control line (`control: the unmutated fixture is GREEN`), so a red after
a plant is plant-caused rather than incidental.

### Task 2 — two registry rows, one driver

`about-dialog-suppression-self-test` appended to the `--quick` array (hermetic: mkdtemp fixture, no
build, no browser, no display, no `upstream/`). `about-dialog-suppression` appended to the full set's
RE-TIERED block immediately after `apply-patches-self-test`, with a comment in the same voice: it reads
the git-ignored clone, so it cannot honestly claim `--quick`'s promises; it is re-tiered rather than
excused; it fails loudly rather than skipping when the clone is absent; `--only` reaches it.

`git diff --stat scripts/verify-platform.sh` → 32 insertions, 0 deletions. No new driver, no new
function, no sibling script.

**`--quick` row count: 24 before, 25 after.**

### Task 3 — the record

- `deferred-items.md` row 11 half (a) rewritten to record the defect that existed rather than only the
  risk that might: the shipped selector removed the internal `about:license` link; 01-VERIFICATION.md
  Truth 9 and 01-REVIEW.md CR-01 found it independently; plan 01-20 and the `about-dialog-suppression`
  row closed it, and that row's staleness assertion also covers the future-ESR-rebase risk the original
  row recorded. Two NOT-dones added with reasons and routes (`about:credits` scope; authored fixture).
  Half (b) — the unshipped wordmark — is byte-unchanged.
- `.planning/WINDOWS.md` rows 15 and 16 moved from `open` to `fixed`, each citing 01-UAT.md tests 2 and
  6 respectively and their 2026-09-01 user confirmation, with `resolved_at` filled in the table's
  existing format. Row 19 still reads `open`. Counts: `open_count` 7 → 5, `fixed_count` 14 → 16.
- `.planning/REQUIREMENTS.md` line 19 ticked to `- [x] **MIG-04**`, matching the traceability row at
  line 263 that already read Complete. One changed line; the inline evidence comment untouched.

## Verification results

| # | Command | Result |
|---|---------|--------|
| 1 | `node scripts/verify-about-dialog-suppression.mjs` | exit 0 |
| 2 | `node scripts/verify-about-dialog-suppression.mjs --self-test` | exit 0 — green control + 4 planted faults, each red and naming its drift |
| 3 | `cmp powerbrowser/branding/{dev,release}/content/aboutDialog.css` | exit 0 |
| 4 | `bash scripts/verify-platform.sh --only about-dialog-suppression` | exit 0 |
| 4b | `bash scripts/verify-platform.sh --only about-dialog-suppression-self-test` | exit 0 |
| 5 | `bash scripts/verify-platform.sh --quick` | exit 0, **25** PASS rows |
| 6 | `node scripts/scan-brand-residue.mjs` (new script staged) | exit 0, 110 files scanned |
| 7 | `git -C upstream diff --stat` | empty |

Also checked: `grep -c` of the exact qualified selector returns 1 in each variant.

Not run, deliberately: `scripts/verify-platform.sh --gate` reaches the incremental `./mach build` path
(~47–54 min); nothing in this plan changes a build input (`jar.mn`, `moz.build` and the patch stack are
untouched — only a CSS selector body and a comment).

## Deviations from Plan

None — plan executed as written. No auto-fixes were needed; the checker went red exactly where the plan
predicted and green after the single selector change.

## Human verification outstanding

The backstop truth — that a repackaged binary's About dialog renders `Licensing Information` as the only
bottom-row link and that clicking it opens the aggregated open-source licence text, with no Terms of Use
or Privacy Notice row present — needs `./mach build faster` and a launched binary. **Not verified here.**
This is `human_needed`, not a silent pass. The static gate proves the selector cannot reach the licence
link in upstream's markup; it does not prove the pixels.

## Known Stubs

None.

## Threat Flags

None. The plan's threat register is fully addressed: T-01-20-01 (information disclosure) is the defect
fixed by the qualified selector and regression-locked by assertion 4 with fault row (a); T-01-20-02
(upstream rename → silent no-op) is assertion 3 with fault row (b); T-01-20-03 (spoofing) keeps its
suppression rather than relaxing it. T-01-20-04 and T-01-20-SC were accepted without mitigation and
nothing in the execution changed that — the script imports only `node:fs`, `node:path`, `node:os`, and
no manifest or lockfile changed.

## Self-Check: PASSED

- `scripts/verify-about-dialog-suppression.mjs` — FOUND
- `powerbrowser/branding/dev/content/aboutDialog.css` — FOUND
- `powerbrowser/branding/release/content/aboutDialog.css` — FOUND
- commit `8d3e3ea` (Task 1) — FOUND
- commit `10dc32d` (Task 2) — FOUND
- commit `6eef7bc` (Task 3) — FOUND
