---
phase: 01-platform-extraction-and-rename
verified: 2026-08-31T02:27:05Z
status: gaps_found
score: 3/7 must-haves verified (2 partial — automated half only, human halves open; 2 failed)
behavior_unverified: 0
overrides_applied: 0
re_verification: No — initial verification
gaps:
  - truth: "Every branding value in the tree is a hand-written literal, and the space-less identifier form never leaks into a display string (01-03-PLAN.md must-have; Success Criterion 5)"
    status: failed
    reason: >
      theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:34 renders
      `<h3>PowerBrowser</h3>` — the IDENTIFIER form, no space — as user-facing display text.
      inventory/brand-tokens.json's brand_display_expectations fixes every display value to
      "Power Browser" (with the space). This is the exact Pitfall-1 class of bug that was
      found and fixed in the welcome widget in 01-07 (commit 86007f3) but was never applied
      to the About dialog. Independently confirmed by reading the file (not merely cited from
      01-REVIEW.md's WR-04) and by running `node scripts/verify-branding.mjs`, which prints
      "PASS about" — the check does not catch this leak because `checkAbout()` in
      verify-branding.mjs omits the identifier-leak assertion that `checkWelcome()` carries
      (01-REVIEW.md WR-04, still unfixed — no commit since the review, `ec26437`, touches
      either file).
    artifacts:
      - path: "theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx"
        issue: "Line 34 renders the identifier form 'PowerBrowser' instead of the display form 'Power Browser'"
      - path: "scripts/verify-branding.mjs"
        issue: "checkAbout() (lines 127-141) lacks the NO_STOCK_IDENTITY-style assertion checkWelcome() carries, so it cannot detect this class of leak"
    missing:
      - "Change powerbrowser-about-dialog.tsx:34 to '<h3>Power Browser</h3>'"
      - "Add the identifier-leak assertion to verify-branding.mjs's checkAbout(), matching checkWelcome()'s pattern, so the gap cannot silently reopen"
  - truth: "scripts/scan-brand-residue.mjs is registered in the verify script set so residual brand strings can never re-enter (01-02-PLAN.md must-have; underlies MIG-03 and Success Criterion 1)"
    status: failed
    reason: >
      The registered gate (used by scripts/verify-platform.sh, scripts/rebase-upstream.sh, and
      .github/workflows/rebase-upstream.yml — all three omit --reconcile) evaluates exit status
      from offenses.length alone: occurrences an inventory row explicitly claims. It never reads
      result.unclaimedProbes, the deliberately-dumb boundary-free probe that is the scanner's
      only defense against a brand string reappearing in a form no inventory row matches (e.g.
      "Sourcerers", "resourcerer"). Independently reproduced: `node scripts/scan-brand-residue.mjs`
      exits 0; `node scripts/scan-brand-residue.mjs --reconcile` exits 1 with 4 reconciliation
      failures on the tree as it stands today. Documented in 01-REVIEW.md as CR-01 (critical,
      unfixed — the review commit ec26437 is HEAD, nothing after it touches
      scan-brand-residue.mjs) and understates WINDOWS.md ledger item 6, which frames the plain
      run as an adequate gate. It is not: even --reconcile cannot fail on an unclaimed probe hit
      in the post-rename branch (reconcile() returns at line 460 before the only consumer of
      unclaimedProbes at line 496).
    artifacts:
      - path: "scripts/scan-brand-residue.mjs"
        issue: "reconcile() returns at line 460 without evaluating condition 4 (unclaimed probes) on the post-rename branch; main() gates rec.failures behind --reconcile (line 787) which no registered caller passes"
    missing:
      - "reconcile(): evaluate condition 4 (walk result.unclaimedProbes) on both branches, before the postRename early return"
      - "main(): treat rec.failures as part of the gate unconditionally, not only when --reconcile was passed"
      - "Reconcile the 4 currently-failing expected_count rows in inventory/brand-tokens.json once the gate is fixed (WINDOWS.md item 6's deferred work)"
      - "Add a --self-test fixture that plants an unclaimed form (e.g. 'Sourcerers') and requires the plain run to go red"
human_verification:
  - test: "GUI-01 — launch the app, toggle to the browser window, confirm the address bar takes keyboard focus and navigates a typed URL, confirm an in-window modal appears, close the window and confirm the shell returns with the app still running"
    expected: "All five steps succeed; the toggle behaves as a real browser window with no Theia chrome"
    why_human: "BiDi cannot see chrome contexts on Linux and chrome-context Marionette is platform-blocked (WINDOWS.md ledger 7). 01-07 executed autonomously with no human present, so none of these five steps was performed. Automated coverage (gui01-single-shell-window, gui01-browser-close-does-not-quit, gui01-command-registered, gui04-registry-shape) is green and unaffected."
  - test: "GUI-03 — with the dev flag on, edit customize.css and confirm the shell visibly restyles without a rebuild; delete it and confirm the shell reverts"
    expected: "The runtime CSS layer visibly applies and un-applies without any rebuild"
    why_human: "Perceptual/visual outcome; the automated checks (verify-customize-inert, verify-dev-flag-off) only prove inertness of an absent stylesheet and flag-gating of the privileged JS binding — neither exercises the visible-restyle claim. 01-07 executed autonomously with no human present."
---

# Phase 1: Platform Extraction and Rename Verification Report

**Phase Goal:** The Power Browser platform tree exists in this repo, builds, boots, and works as an
actual web browser under fixed platform identifiers — with no generator involved

**Verified:** 2026-08-31T02:27:05Z
**Status:** gaps_found
**Re-verification:** No — initial verification

**Scope note:** Requirements verified against REQUIREMENTS.md as amended 2026-08-30: MIG-01, MIG-02,
MIG-03, MIG-04, GUI-01, GUI-03, GUI-04, SEC-01. GUI-02 was deferred to v2 at the D-22 gate (01-06) —
not scored here, not orphaned; ROADMAP.md's success criterion 3 was amended in the same change to
drop its GUI-02 clause. SEC-01 is new (added 2026-08-30), satisfied by pre-existing
`theia/extensions/token-gate` code that no Phase 1 plan declared as its own — verified directly
against REQUIREMENTS.md's stated invariants rather than plan frontmatter.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Committed token-classification inventory exists; residual scan demonstrably red on the pre-rename tree, both before any replacement ran | ✓ VERIFIED | `inventory/brand-tokens.json` carries 44 rows across all 5 declared classes (`brand-identifier`, `brand-display`, `identity`, `frozen`, `coincidental`), zero unclassified. `.planning/phases/01-platform-extraction-and-rename/01-SCAN-RED-REPORT.md` is committed (1133 lines) as the pre-rename red-scan evidence, predating the rename commits in `git log`. |
| 2 | SC2 — Repo builds from a script-refetched `upstream/` (no copied checkout/objdir) and launches a Power-Browser-branded app on Linux passing the smoke tests | ✓ VERIFIED | `upstream/` is gitignored (`.gitignore:20`). `scripts/fetch-upstream.sh --self-test` → 4/4 self-tests PASS. `scripts/apply-patches.sh --self-test` → both self-tests PASS (fresh apply succeeds, re-apply correctly rejected by name). Built artifact exists: `objdir/dist/bin/powerbrowser` (2.4MB executable). `PowerBrowserAPI.sys.mjs` is present inside the built chrome package (`objdir/dist/bin/browser/chrome/browser/content/powerbrowser/`), proving the rename reached the artifact, not just source. |
| 3 | SC3 — User can toggle Theia → browser UI and back; nothing welds Theia to full-window presentation; `TabUriRegistry`'s exported shape stays landable | ◐ PARTIAL | Automated half green: `gui04-registry-shape` and its self-test PASS (`verify-platform.sh --quick`); `browser-window-command.ts` calls `PowerBrowserAPI.openBrowserWindow()`, wired end to end. **Perceptual half (address bar takes focus and navigates, in-window modal appears, window close returns to shell) was never performed** — see Human Verification. |
| 4 | SC4 — User can restyle/re-shape the GUI at runtime through the customize bridge without forking the platform | ◐ PARTIAL | Automated half green: `verify-customize-inert` and `verify-dev-flag-off` PASS in `--quick`. `customize-frontend-module.ts` gates the privileged-JS binding behind an `if`, provably absent with the flag off, not merely guarded. **Visible-restyle half was never performed** — see Human Verification. |
| 5 | SC5 — Internal identifiers resolve everywhere in fixed platform form; every branding value in the tree is a hand-written literal | ✗ FAILED (partial) | Internal identifiers confirmed present and correct: `powerbrowser/` tree, `@powerbrowser/*` scope (4 packages), `PowerBrowserAPI.sys.mjs`, `chrome://powerbrowser/` (4 files). **But** the About dialog renders the identifier form `PowerBrowser` (no space) as display text — see Gaps. |
| 6 | SEC-01 — Backend is unreachable without a per-launch credential; fails closed, not open | ✓ VERIFIED | Read `token-gate-backend-contribution.ts` directly: no token configured → `process.exit(78)` before `listen()` (lines 51-64); non-loopback bind → `process.exit(78)` (lines 100-106); gate `unshift`s ahead of `earlyMiddleware.handlers` so it runs before Theia's own cookie middleware (line 73, confirmed correct against `@theia/core`'s `configure()` ordering by 01-REVIEW.md's independent trace). Matches REQUIREMENTS.md's three concrete SEC-01 invariants exactly. |
| 7 | Residual brand strings can never re-enter — the registered scan gate fails when an unclaimed occurrence appears (01-02-PLAN.md must-have, underlies MIG-03) | ✗ FAILED | Reproduced directly: `node scripts/scan-brand-residue.mjs` exits 0; `node scripts/scan-brand-residue.mjs --reconcile` exits 1 with 4 reconciliation failures on the identical tree. The registered gate (no plan, CI workflow, or rebase script passes `--reconcile`) cannot detect an unclaimed-form regression in either mode — see Gaps (CR-01). |

**Score:** 3/7 truths fully verified, 2 partial (automated half only — human verification open), 2 failed

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `inventory/brand-tokens.json` | Token-classification source of truth | ✓ VERIFIED | 44 rows, 5 classes, 0 unclassified |
| `scripts/scan-brand-residue.mjs` | Residual-brand scan with reconciliation | ⚠️ WIRED BUT DEFECTIVE | Exists, registered, runs — but its `--reconcile` condition-4 check (the one gating unclaimed occurrences) is unreachable on the post-rename branch (CR-01) |
| `scripts/rename-brand.mjs` | Rerunnable inventory-driven rename | ✓ VERIFIED | Present, self-test path exercised per 01-01-SUMMARY.md |
| `powerbrowser/shell/PowerBrowserAPI.sys.mjs` | Anti-corruption layer; single-instance handler; browser-window opener | ✓ VERIFIED | `openBrowserWindow`, `STATE_INITIAL_LAUNCH`, `PowerBrowserSingleInstanceHandler` all present and reached from `objdir/dist/bin/browser/chrome/...` |
| `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` | Fail-closed backend credential gate | ✓ VERIFIED | Read directly; matches SEC-01's three stated invariants |
| `theia/extensions/tab-uris/src/browser/browser-window-command.ts` | Palette command bridging Theia frontend to chrome | ✓ VERIFIED | Calls `PowerBrowserAPI.openBrowserWindow()` |
| `theia/extensions/customize/src/browser/*` | Runtime CSS layer + dev-flagged privileged JS bridge | ✓ VERIFIED | `customize-frontend-module.ts`, `powerbrowser-privileged-js.ts`, `customize-css-contribution.ts`, `customize-privileged-js-contribution.ts` all present |
| `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` | Hand-written About dialog display literal | ✗ WRONG LITERAL | Renders `PowerBrowser` (identifier form), not `Power Browser` (display form) |
| `CLAUDE.md` | Project-instruction file with inherited hard rules + rewritten GUI rule | ✓ VERIFIED | Present at repo root (01-07 deliverable) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/scan-brand-residue.mjs` | `inventory/brand-tokens.json` | reads inventory as sole token source | ✓ WIRED | Confirmed by scan output (`107 scanned file(s)`) |
| `patches/020-powerbrowser-shell.patch` | `powerbrowser/shell/moz.build` | relative `DIRS` path through the symlink | ✓ WIRED | Build succeeded and produced the artifact; `apply-patches.sh --self-test` PASS |
| `theia/extensions/tab-uris/src/browser/browser-window-command.ts` | `powerbrowser/shell/PowerBrowserAPI.sys.mjs` | frontend→chrome channel | ✓ WIRED | `execute: (url?: string) => this.openBrowserWindow(url)` calls into the API |
| `objdir/dist/bin/powerbrowser` (built artifact) | `powerbrowser/branding/dev/locales/en-US/brand.ftl` (source) | identity verifier reads the built artifact | ✓ WIRED | `PowerBrowserAPI.sys.mjs` present inside built chrome package; 01-04-SUMMARY documents `verify-branding-identity.mjs` PASS with discriminating positive control against this artifact |
| `scripts/verify-platform.sh` / `rebase-upstream.sh` / CI workflow | `scan-brand-residue.mjs`'s reconciliation (`--reconcile`) | registered gate invocation | ✗ NOT WIRED | None of the three registered call sites pass `--reconcile`; condition 4 (unclaimed-probe gating) is never evaluated by the gate that runs in practice |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Residual-brand scan is currently clean (plain mode) | `node scripts/scan-brand-residue.mjs` | `PASS -- no residual brand occurrence in 107 scanned file(s)`, exit 0 | ✓ PASS |
| Residual-brand scan's reconciliation mode surfaces real drift | `node scripts/scan-brand-residue.mjs --reconcile` | `FAIL -- 4 reconciliation failure(s)`, exit 1 | ✗ FAIL (confirms CR-01 — the mode that would catch drift is not the one that gates) |
| Quick verification suite (19 checks, no build) | `scripts/verify-platform.sh --quick` | `PASS -- all checks passed`, exit 0 | ✓ PASS |
| Upstream fetch/apply self-tests | `scripts/fetch-upstream.sh --self-test`, `scripts/apply-patches.sh --self-test` | Both 4-case and 2-case self-tests PASS | ✓ PASS |
| Internals boundary guard | `scripts/check-internals-boundary.sh` | `PASS -- no forbidden Firefox-internal patterns found` | ✓ PASS |
| Branding check catches the identifier-leak class it claims to | `node scripts/verify-branding.mjs` | `PASS about` despite the confirmed literal leak at `powerbrowser-about-dialog.tsx:34` | ✗ FAIL (confirms WR-04 — the check does not discriminate on the About surface) |
| `@powerbrowser/*` scope present in all 4 extension manifests | `grep '"name": "@powerbrowser' theia/*/*/package.json` | 4 matches (branding, customize, token-gate, tab-uris) | ✓ PASS |
| `chrome://powerbrowser/` and `PowerBrowserAPI.sys.mjs` present in tree and build | file search | Present in `powerbrowser/shell/` source and `objdir/dist/bin/browser/chrome/...` build output | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MIG-01 | 01-01, 01-04 | Migrated via script-refetched `upstream/`, no copied objdirs | ✓ SATISFIED | fetch/apply self-tests PASS, gitignored `upstream/`, built artifact exists |
| MIG-02 | 01-01 | Committed token-classification inventory before rename | ✓ SATISFIED | `inventory/brand-tokens.json` fully classified, `01-SCAN-RED-REPORT.md` committed |
| MIG-03 | 01-01, 01-02, 01-03 | Internal identifiers in fixed platform form everywhere | ⚠️ SATISFIED WITH A REGRESSION HOLE | Identifiers themselves confirmed correct; but the "residual strings can never re-enter" guarantee is false (CR-01) |
| MIG-04 | 01-03, 01-04, 01-07 | Renamed tree builds and boots under Power Browser branding | ✓ SATISFIED (with one display-literal defect logged separately) | Build/boot/smoke evidence in 01-04-SUMMARY; six identity surfaces PASS with discriminating positive control |
| GUI-01 | 01-05, 01-07 | Toggle Theia ↔ browser UI | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | `gui01-*` checks PASS; 5-step manual walkthrough not performed (WINDOWS.md #15) |
| GUI-03 | 01-02, 01-07 | Runtime GUI customization bridge | ◐ SATISFIED (automated) / NEEDS HUMAN (perceptual) | `verify-customize-inert`, `verify-dev-flag-off` PASS; 3-step manual walkthrough not performed (WINDOWS.md #16) |
| GUI-04 | 01-06 | `TabUriRegistry` exported shape stays landable | ✓ SATISFIED | `gui04-registry-shape` + self-test PASS |
| SEC-01 | (none — pre-existing code, requirement added 2026-08-30) | Backend fail-closed on missing credential / non-loopback bind, ahead of framework middleware | ✓ SATISFIED | Verified directly against `token-gate-backend-contribution.ts`; matches all three stated invariants |

No orphaned requirements: all 8 phase-1 requirement IDs (MIG-01..04, GUI-01, GUI-03, GUI-04, SEC-01) are accounted for above. GUI-02 is correctly absent from this table — deferred to v2 at the D-22 gate (2026-08-30), REQUIREMENTS.md and ROADMAP.md both amended in the same change, not orphaned.

### Anti-Patterns Found

None. `grep -rn -E "TBD|FIXME|XXX"` over `powerbrowser/shell`, `theia/extensions/{token-gate,tab-uris,customize,branding}/src`, and the phase's core verification scripts returned zero matches. No stub, placeholder, or hardcoded-empty pattern found in phase-authored files (consistent with every SUMMARY.md's "Known Stubs: None").

### Code Review Findings (01-REVIEW.md) — independently re-verified, not re-derived

01-REVIEW.md (committed at `ec26437`, HEAD) found 1 critical + 7 warnings + 5 info. I independently reproduced the critical (CR-01) and one warning (WR-04) against the live tree — both are promoted to gaps above because they falsify specific must-have truths, not merely code-quality concerns. The remaining warnings (WR-01 cookie port-scoping, WR-02 missing positive control, WR-03 error-copy regex escape hatch, WR-05 unhandled-rejection paths, WR-06 `signalBarePid` throw contract, WR-07 `onStart` address-read race) are real findings but do not falsify a specific Phase 1 must-have truth on the current tree — they describe latent risk or narrower gate weaknesses. They are not re-litigated here; see 01-REVIEW.md for full detail and fixes. No commit since `ec26437` addresses any of them.

## Human Verification Required

### 1. GUI-01 — browser-window toggle, full perceptual walkthrough

**Test:** Launch the app; open a browser window (palette command or shell UI); confirm the address
bar takes keyboard focus and navigates a typed URL; confirm an in-window modal (e.g. a JS `alert`)
appears rather than being suppressed; close the window and confirm the shell returns with the app
still running.
**Expected:** All five steps succeed exactly as a stock browser window would behave.
**Why human:** BiDi cannot see chrome contexts on Linux; chrome-context Marionette is
platform-blocked. Recorded as WINDOWS.md ledger items 15 (blocker, open).

### 2. GUI-03 — customize bridge, visible restyle

**Test:** With the dev flag on, edit `customize.css` and confirm the shell visibly restyles without
a rebuild; delete the file and confirm the shell reverts.
**Expected:** The runtime CSS layer applies and un-applies visibly.
**Why human:** Perceptual outcome; automated checks only prove inertness (absent stylesheet ==
empty stylesheet) and flag-gating (privileged JS binding absent with flag off), not the visible
effect itself. Recorded as WINDOWS.md ledger item 16 (open).

## Gaps Summary

Two must-have truths are FAILED on independent inspection of the live tree, both already
documented in 01-REVIEW.md and reproduced here rather than trusted from the summary narrative:

1. **The About dialog displays the identifier form `PowerBrowser` instead of `Power Browser`**
   (`theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx:34`), and the branding
   check that should catch this class of leak (`verify-branding.mjs`'s `checkAbout()`) does not
   carry the assertion its sibling `checkWelcome()` does — so it passes green over a real,
   user-visible defect. This is the same bug class already found and fixed once in the welcome
   widget during 01-07; the fix was not generalized to the About dialog.

2. **The registered residual-brand-scan gate cannot fail on an unclaimed occurrence in either of
   its modes** — reproduced directly (`--reconcile` surfaces 4 real reconciliation failures on
   the current tree; the plain, registered mode does not see them). This falsifies the plan's own
   "residual brand strings can never re-enter" claim for `scan-brand-residue.mjs`'s registered
   configuration. `WINDOWS.md` item 6 understates this — the fix is two lines in
   `scan-brand-residue.mjs`, documented in 01-REVIEW.md's CR-01.

Both are small, well-scoped fixes (a one-line JSX change plus a matching assertion; a two-line
gating fix in one script) but they are real, currently-true defects on the tree as it stands, not
speculative risk. They block a clean pass on this phase's own must-have truths.

Separately, two success criteria (3 and 4) have their perceptual/manual halves un-performed because
01-05 through 01-07 executed autonomously with no human present. This is accurately reflected in
`WINDOWS.md` (ledger items 15, 16) and `01-VALIDATION.md`'s Manual-Only table, and is not a
newly-discovered gap — it is carried forward here as required human verification.

---

_Verified: 2026-08-31T02:27:05Z_
_Verifier: Claude (gsd-verifier)_
