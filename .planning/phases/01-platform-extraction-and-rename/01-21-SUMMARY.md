---
phase: 01-platform-extraction-and-rename
plan: 21
subsystem: verification
tags: [about-dialog, debranding, css-suppression, derive-and-compare, self-test, gap-closure]

# Dependency graph
requires:
  - phase: 01-20
    provides: "scripts/verify-about-dialog-suppression.mjs with four assertions, its --self-test harness and authored fixture, and the two registered verify-platform.sh rows (about-dialog-suppression, about-dialog-suppression-self-test)"
  - phase: 01-18
    provides: "the branding aboutDialog.css suppression rule and the jar.mn packaging line that makes it load"
provides:
  - "A fifth assertion in scripts/verify-about-dialog-suppression.mjs that derives every external http/https link from the parsed upstream markup at check time and requires per-variant coverage, failing with UNSUPPRESSED VENDOR LINK naming the surviving href and the stylesheet that misses it"
  - "Closure of 01-REVIEW.md WR-08: #communityExperimentalDesc suppressed in both byte-identical branding variants, the last external link the shipped selector set did not reach"
  - "Two planted-fault --self-test rows (selector deleted; selector href prefix narrowed) that run on every --quick invocation, taking the harness from four faults to six"
  - "A deferred-items.md record that states what the About-dialog gate covers and what it does not, why #communityExperimentalDesc was suppressed rather than exempted, and an explicit DEFER ruling on UAT G-01-25's optional item"
affects: [phase-02-configuration-driven-rebrand, esr-rebase, about-dialog-debranding]

actuals:
  tokens: 10339
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Derive-and-compare coverage: a set derived from the artifact under test at check time, compared per consumer variant rather than over a union, so the failure has a file to name"
    - "Polarity-split link policy: one singular must-survive constant (DISCLOSURE_HREF) alongside a derived plural must-be-suppressed set, deliberately not merged into one allow/deny table"

key-files:
  created: []
  modified:
    - scripts/verify-about-dialog-suppression.mjs
    - powerbrowser/branding/dev/content/aboutDialog.css
    - powerbrowser/branding/release/content/aboutDialog.css
    - .planning/phases/01-platform-extraction-and-rename/deferred-items.md

key-decisions:
  - "01-21: coverage is evaluated PER STYLESHEET VARIANT inside the existing CSS_RELS loop, not over CR-02's proposed allSelectors union — the union would pass a link covered in dev but not in release, and has no `rel` to name in the failure message"
  - "01-21: #communityExperimentalDesc was SUPPRESSED, not exempted — an exemption list, allowlist or skip set inside the checker is a hand-kept expectation that can only agree with the tree it was copied from (CLAUDE.md verification rule 2), and is also the larger diff"
  - "01-21: the external set is derived with no host filter — every http/https destination, not just mozilla.org — so an ESR rebase adding a link to a NEW host goes red through the same comparison"
  - "01-21: CR-02's proposed `&& !e.href.startsWith('chrome:')` clause was NOT carried over; it is unreachable under the `^https?:` test"
  - "01-21: the empty-external-set VACUOUS guard fails WITHOUT an early return, unlike the existing markup-wide guard — assertions 3 and 4 still have work to do over a link set that carries no external member, so returning would discard coverage this run can still provide"
  - "01-21: the singular DISCLOSURE_HREF constant stays alongside the derived plural set (add-alongside, not promote) — the two are opposite in polarity, and merging them requires the allow/deny table this plan's first prohibition forbids"
  - "01-21: UAT G-01-25's optional display-form registry row is DEFERRED by explicit decision and routed onto deferred-items row 12's inventory/brand-tokens.json route, rather than adding a second gate over a class that route will dissolve"

patterns-established:
  - "A coverage assertion is landed BEFORE the fix it requires, so its red is observed against the real tree — a coverage assertion never seen red has never been seen at all"
  - "A --self-test fixture coupled to the shipped selector list must gain a mirroring structure in the same change that adds a selector, or the unmutated control turns red and every planted fault below it proves nothing"

requirements-completed: [MIG-03, MIG-04]

coverage:
  - id: D1
    description: "A tree where any external link in upstream's About dialog is reached by no shipped suppression selector makes the checker exit non-zero, naming the href and the stylesheet — the exact mutation that exited 0 before this plan"
    requirement: MIG-03
    verification:
      - kind: integration
        ref: "scratch-root mutation: copy the script + real upstream markup + both stylesheets with the [href^=...] bottom-link compound and its preceding comma removed, then run the checker"
        status: pass
      - kind: unit
        ref: "node scripts/verify-about-dialog-suppression.mjs --self-test  (row (e) selector deleted; row (f) href prefix narrowed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The shipped tree is green: every shipped selector matches upstream markup, every external link is covered in every variant, and about:license is reached by no selector"
    requirement: MIG-03
    verification:
      - kind: integration
        ref: "node scripts/verify-about-dialog-suppression.mjs"
        status: pass
      - kind: unit
        ref: "node scripts/verify-about-dialog-suppression.mjs --self-test  (row (a) still red naming about:license)"
        status: pass
    human_judgment: false
  - id: D3
    description: "WR-08 closed — #communityExperimentalDesc added to the suppression list in both branding variants, which remain byte-identical"
    requirement: MIG-03
    verification:
      - kind: other
        ref: "cmp powerbrowser/branding/dev/content/aboutDialog.css powerbrowser/branding/release/content/aboutDialog.css"
        status: pass
      - kind: integration
        ref: "node scripts/scan-brand-residue.mjs (110 files, staged)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No registry row added and no sibling driver created — verify-platform.sh unmodified, --quick green at its existing 25 rows"
    requirement: MIG-04
    verification:
      - kind: integration
        ref: "bash scripts/verify-platform.sh --quick  (25 rows) ; git diff --stat scripts/verify-platform.sh (empty)"
        status: pass
      - kind: integration
        ref: "bash scripts/verify-platform.sh --only about-dialog-suppression ; --only about-dialog-suppression-self-test"
        status: pass
    human_judgment: false
  - id: D5
    description: "The deferred ledger states what the gate covers and does not, records the #communityExperimentalDesc decision with its reasoning, and rules explicitly on the G-01-25 optional item"
    requirement: MIG-04
    verification:
      - kind: other
        ref: "grep row 11(a) rewrite, (a-iii), extended (a-i)/(a-ii), and row 13 in deferred-items.md"
        status: pass
    human_judgment: false
  - id: D6
    description: "A repackaged binary's About dialog renders Licensing Information as the only visible bottom-row link, opens the aggregated open-source licence text when clicked, and shows no Terms of Use, Privacy Notice, community, contribute, or experimental-community row"
    requirement: MIG-04
    verification: []
    human_judgment: true
    rationale: "Requires ./mach build faster (tier 3, ~47-54 min) and a launched binary. The static gate proves selector logic against markup, never rendered pixels. Deferred to the phase gate per human_verify_mode: end-of-phase; carried in the plan as a `verification: backstop` truth."

duration: 12min
completed: 2026-09-01
status: complete
---

# Phase 01 Plan 21: About-Dialog Coverage Assertion Summary

**The About-dialog suppression gate can now go red on the regression it exists to prevent: a fifth assertion derives every external link from the upstream markup at check time and requires per-variant coverage, so deleting or narrowing the outbound selector — which exited 0 at HEAD — now fails by name with the surviving href and the stylesheet that misses it.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-01T20:26:55Z
- **Completed:** 2026-09-01T20:39:28Z
- **Tasks:** 3 of 3
- **Files modified:** 4
- **Commits:** 3

## Accomplishments

- **Assertion 5 (coverage) landed in `runChecks()`.** The set of external destinations is derived from the parsed markup — every element whose `href` matches `/^https?:/i`, with no host filter and no allowlist — and each must be reached by at least one selector this variant ships, on the element itself or on any ancestor. Evaluated inside the existing `for (const rel of CSS_RELS)` loop so the failure names the stylesheet.
- **A vacuity guard on the derived set.** A markup walk yielding zero external links fails with a `VACUOUS:` diagnosis rather than reporting universal coverage over an empty set.
- **WR-08 closed.** `#communityExperimentalDesc` — upstream's community blurb inside `<vbox id="experimental" hidden="true">`, dormant at the current ESR channel — was the one external link the shipped selector set did not reach. Added to the suppression list in both variants, which stay byte-identical.
- **The `--self-test` fixture repaired and extended.** `fixtureMarkup()` gained the `<vbox id="experimental">` structure (without it the unmutated control goes red on staleness); rows (e) and (f) plant the deletion and the narrowing, taking the harness from four planted faults to six.
- **Header comment and PASS line corrected.** Under-reach is now documented as two distinct shapes, and the PASS line states the coverage half it now proves.
- **The deferred ledger corrected** — row 11(a) scoped, (a-iii) added, (a-i)/(a-ii) extended, row 13 added.

## The two observed reds

The plan required these to be recorded verbatim, because a SUMMARY reporting only green rows re-creates the problem this plan closes.

### 1. Assertion 5's first run against the real tree (Task 1, Step 1)

With assertion 5 added and no stylesheet change yet, `node scripts/verify-about-dialog-suppression.mjs` exited **1** with 2 problems — one per variant:

```
verify-about-dialog-suppression: FAIL -- 2 problem(s) with the About dialog's suppression selectors
  - UNSUPPRESSED VENDOR LINK: <label href="https://www.mozilla.org/?utm_source=firefox-browser&#38;utm_medium=firefox-desktop&#38;utm_campaign=about-dialog"> in upstream/browser/base/content/aboutDialog.xhtml is reached by NO suppression selector in powerbrowser/branding/dev/content/aboutDialog.css. The link renders inside a Power-Browser-branded dialog, offering an outbound destination this product does not own. Suppress it by adding a selector, or record the decision to leave it visible -- never scope this assertion around it with an exemption list, which would be a hand-kept expectation that can only agree with the tree it was copied from.
```

That is the `#communityExperimentalDesc` link — 01-REVIEW.md's WR-08, confirmed empirically rather than taken from the plan's table.

### 2. The scratch-root deletion mutation (Task 1, load-bearing criterion)

A scratch root carrying the script, the real upstream markup, and both stylesheets with the `[href^=...]` bottom-link compound and its preceding comma removed — restoring UAT G-01-3 in full. **This exact command exited 0 at HEAD before this plan.** It now exits **1** with 4 problems:

```
verify-about-dialog-suppression: FAIL -- 4 problem(s) with the About dialog's suppression selectors
  - UNSUPPRESSED VENDOR LINK: <label class="bottom-link" href="https://www.mozilla.org/about/legal/terms/firefox/"> in upstream/browser/base/content/aboutDialog.xhtml is reached by NO suppression selector in powerbrowser/branding/dev/content/aboutDialog.css. ...
  - UNSUPPRESSED VENDOR LINK: <label class="bottom-link" href="https://www.mozilla.org/privacy/firefox/?..."> ... in powerbrowser/branding/dev/content/aboutDialog.css. ...
  (and the same two against powerbrowser/branding/release/content/aboutDialog.css)
```

Both the Terms of Use and the Privacy Notice link are named, in both variants. This is the single check that distinguishes a closed gap from a reopened one.

### 3. Both new self-test rows, on every `--quick` run

```
fault (e) outbound selector deleted -- UAT G-01-3 restored in full ... was REJECTED naming the drift:
  UNSUPPRESSED VENDOR LINK: <label class="bottom-link" href="https://www.mozilla.org/about/legal/terms/firefox/"> ...
fault (f) outbound selector narrowed -- the href prefix stops reaching the Privacy Notice link ... was REJECTED naming the drift:
  UNSUPPRESSED VENDOR LINK: <label class="bottom-link" href="https://www.mozilla.org/privacy/firefox/"> ...
```

Row (f) is the shape only assertion 5 can catch: the selector still exists, still parses, and still matches the Terms of Use link, so assertions 1, 2 and 3 all stay silent.

## Verification Results

Run in the plan's stated order. All static — no build, no browser, no display, no network.

| # | Check | Result |
|---|-------|--------|
| 1 | `node scripts/verify-about-dialog-suppression.mjs` | exit **0** |
| 2 | `--self-test` | exit **0**, green control + **6** faults each REJECTED naming its drift |
| 3 | scratch-root deletion mutation | exit **1**; stderr carries `UNSUPPRESSED VENDOR LINK`, `https://www.mozilla.org/about/legal/terms/firefox/`, and `powerbrowser/branding/dev/content/aboutDialog.css` |
| 4 | `cmp` dev vs release `aboutDialog.css` | no output — byte-identical |
| 5 | `node scripts/scan-brand-residue.mjs` (staged) | exit **0**, 110 scanned files |
| 6 | `bash scripts/verify-platform.sh --quick` | exit **0**, **25** rows — unchanged count |
| 7 | `--only about-dialog-suppression` / `--only about-dialog-suppression-self-test` | both exit **0** |
| 8 | `git diff --stat scripts/verify-platform.sh` / `git -C upstream diff --stat` | both empty |

Task-level acceptance criteria all pass, including: the selector list carries exactly the four required comma-separated entries in one `display: none` rule; `runChecks()` contains no href string literal at all (the derivation is a regex over the parsed markup, and `DISCLOSURE_HREF` stays module-level); and no array, `Set`, or object of exempt or expected hrefs, ids, or hosts exists anywhere outside `fixtureMarkup()`.

## Deviations from Plan

Two, both measurement-method corrections rather than implementation changes. No Rule 4 (architectural) situation arose.

**1. [Rule 3 - Blocking] Task 1's `UNSUPPRESSED VENDOR LINK` occurrence-count criterion is a Task-1-time gate, not an invariant**

- **Found during:** Task 2
- **Issue:** Task 1's acceptance criterion requires the tag to appear exactly twice (the `rep.fail` message and the header comment). Task 2 then mandates two `--self-test` rows whose `names` arrays each contain the same literal, taking the count to 4. The two criteria cannot both hold at the end of the plan.
- **Resolution:** The criterion was verified at Task 1's gate, where it printed exactly `2`, and is understood as a Task-1-time gate. No code was changed to force a count of 2 at plan end — introducing a shared constant to keep the literal singular would have made the self-test rows assert against a value derived from the code under test, which is weaker than asserting the literal.
- **Files modified:** none (analysis only)
- **Commit:** n/a

**2. [Rule 3 - Blocking] `grep -c` cannot express Task 3's "at least 3" criterion against a single-line table row**

- **Found during:** Task 3
- **Issue:** The criterion `grep -c 'communityExperimentalDesc' deferred-items.md` prints `at least 3`. `deferred-items.md` is a markdown table with one row per line, and all three records — (a-iii), the extended (a-i), and the extended (a-ii) — live inside row 11, which is a single line. `grep -c` counts matching *lines*, so it prints `1` no matter how many records exist.
- **Resolution:** Measured with `grep -o 'communityExperimentalDesc' ... | wc -l`, which counts occurrences and prints **3**. All three records exist as specified; only the measurement command was substituted.
- **Files modified:** none (measurement only)
- **Commit:** n/a

**Total deviations:** 2 auto-fixed (2 × Rule 3 - blocking measurement corrections). **Impact:** None on shipped behaviour. Both are plan-artifact issues surfaced during execution; every substantive acceptance criterion was met as written.

## Authentication Gates

None.

## Known Stubs

None. No stub, placeholder, TODO, skipped test, or unrun `<verify>` was introduced or left behind. Every `<verify>` command in all three tasks was executed and its real exit code recorded above.

## Threat Flags

None. The plan's threat register (T-01-21-01 through -05, plus T-01-21-SC) is fully discharged as written: no new network endpoint, no auth path, no file-access pattern, and no schema change at a trust boundary was introduced. No package-manager install ran.

## Issues Encountered

None blocking. One expected trap was hit exactly as the plan predicted and resolved within the same task: adding `#communityExperimentalDesc` to the stylesheets made the `--self-test` control go red on staleness (`restore()` pairs the REAL shipped stylesheets with the AUTHORED `fixtureMarkup()`), which was repaired by adding the mirroring `<vbox id="experimental">` structure to the fixture in Task 1 Step 3.

## What Was Deliberately Not Done

- **No registry row, no new CLI flag, no new file, no new export, no sibling driver.** The two rows 01-20 registered already reach this script; the gap closed inside the script the registry already points at.
- **No exemption list, allowlist, skip set, or host filter** anywhere in the checker. The only way to leave a link uncovered is to change the derived set, which goes red.
- **01-REVIEW.md's WR-09, WR-11 and WR-12 remain open** — none is in `01-VERIFICATION.md`'s `missing[]`, none blocks the coverage assertion, and this run was explicitly not to widen scope.
- **The G-01-25 optional registry row is DEFERRED by decision**, recorded as `deferred-items.md` row 13 with its reason and its route onto row 12's `inventory/brand-tokens.json` route.
- **The repackaged-binary pixel check is not performed** — tier-3 build work, carried as coverage entry D6 with `human_judgment: true` and deferred to the phase gate.

## Self-Check: PASSED

- `scripts/verify-about-dialog-suppression.mjs` — FOUND, modified
- `powerbrowser/branding/dev/content/aboutDialog.css` — FOUND, modified
- `powerbrowser/branding/release/content/aboutDialog.css` — FOUND, modified
- `.planning/phases/01-platform-extraction-and-rename/deferred-items.md` — FOUND, modified
- Commit `dff4c63` — FOUND
- Commit `6e4875f` — FOUND
- Commit `a5104f0` — FOUND

## Next Phase Readiness

Phase 01's 21st and final plan. The gap `01-VERIFICATION.md` re-opened on its third pass is closed and proven closed by an observed red. `scripts/verify-platform.sh --quick` is green at 25 rows and `git -C upstream diff` is empty.

Ready for `/gsd-verify-work 01` — noting that the two `human_verification` items from `01-VERIFICATION.md` (the tier-3 regression re-confirmation on WINDOWS.md ledger item 19, and the repackaged-binary About-dialog pixel check recorded here as D6) both require `./mach build faster` and a launched binary, and remain open.
