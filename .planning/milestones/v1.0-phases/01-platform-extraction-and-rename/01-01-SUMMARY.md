---
phase: 01-platform-extraction-and-rename
plan: 01
subsystem: infra
tags: [migration, codemod, nodejs-esm, gecko, firefox-esr, theia, jar-mn, xpcom, branding]

requires: []
provides:
  - The Power Browser platform tree, imported as a fresh snapshot from sourcerer@bce68bb468e4dc160da8c9e238e030a400b806f8 under one provenance-recording commit
  - inventory/brand-tokens.json — 42 classified rows covering the complete migrating scope; the single machine-readable source of truth both the rename and the scan read
  - scripts/scan-brand-residue.mjs — the residual-brand scan, with reconciliation, per-site path:line:token reporting, a non-vacuity assertion, and a --self-test
  - scripts/rename-brand.mjs — the rerunnable inventory-driven rename executor, gated on unclassified rows, with a --self-test proving the boundary rule
  - 01-SCAN-RED-REPORT.md — committed reconciled evidence that the scan was demonstrably red before any bulk replacement ran
  - The chrome://powerbrowser/ coupled chain, renamed end-to-end through the script across all six coupled reference formats
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, phase-02-generator, phase-06-verification]

actuals:
  tokens: 311284
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Inventory-driven codemod — one committed JSON data file is simultaneously the rename executor's replacement plan and the residual scan's token source, so what is scanned and what is renamed cannot drift"
    - "Per-site token classification via file-scoped `only_in` rows that outrank the broad row for the same literal — the mechanism that resolves the ambiguous TitleCase form"
    - "Reconciled-counts evidence — a non-zero exit is not proof; an independent boundary-free probe plus an external ground-truth census are what catch an under-scanning scanner"

key-files:
  created:
    - inventory/brand-tokens.json
    - scripts/scan-brand-residue.mjs
    - scripts/rename-brand.mjs
    - .planning/phases/01-platform-extraction-and-rename/01-SCAN-RED-REPORT.md
  modified:
    - sourcerer/shell/jar.mn
    - sourcerer/shell/components.conf
    - sourcerer/shell/moz.build
    - patches/020-sourcerer-shell.patch
    - scripts/check-internals-boundary.sh

key-decisions:
  - "The tracer renames CONTENT only; every file/directory `git mv` stays in plan 01-02 per D-06, so the chain's coupled sites now read `chrome://powerbrowser/` while their paths are still `sourcerer/*`"
  - "Inventory format is JSON, not TOML (D-15 left the choice open) — Node reads it with zero dependencies and both consumers are Node"
  - "A chain is a declared FILE set (`chains.<name>.files`), and `--scope-chain` narrows the file set only; every inventory row stays active, so a chain run is the full ruleset restricted to those files rather than a second, weaker ruleset"
  - "Per-site classification uses `only_in` with a longer context-anchored token in preference to line-pinned `site_overrides` — a pinned line number silently stops meaning anything the moment an edit above it shifts the file"
  - "MOZ_APP_BASENAME takes the one-word lowercase identifier `powerbrowser` (D-10/SKELETON), not the TitleCase display name, so `--with-app-basename` and verify-branding-identity.mjs's application.ini expectation are classified `identity` and move together"
  - "scope.exclude covers `.planning/`, `inventory/` and the two rename scripts — the rename's own machinery necessarily spells out every token, so scanning it would be scanning the scan's own input"

patterns-established:
  - "Reconciliation condition 4 uses a deliberately different detector from the one it audits: a raw case-insensitive substring probe with no boundary rule, so a bug in the boundary matcher fails the check even when conditions 1-3 all agree with themselves"
  - "Ground-truth cross-check: the scan recounts the three raw case forms the same dumb way 01-RESEARCH.md counted them, and asserts observed + already-renamed + not-imported equals the researched total exactly — a deviation is reconciled by name, never absorbed"
  - "Every net-new script carries a --self-test that plants fixtures in `mktemp -d` and asserts the guard both rejects them AND names them, plus a non-vacuity assertion that treats an empty input as FAIL with its own distinct message"

requirements-completed: [MIG-01, MIG-02, MIG-03]

coverage:
  - id: D1
    description: "The platform tree exists in this repo as a single import commit naming the exact sourcerer SHA, with no upstream/, no objdir, no .mozbuild, and no sourcerer git remote"
    requirement: "MIG-01"
    verification:
      - kind: integration
        ref: "test ! -e upstream && test ! -e objdir && test ! -e objdir-release && test ! -e .mozbuild"
        status: pass
      - kind: integration
        ref: "git log --format=%H --grep='bce68bb468e4dc160da8c9e238e030a400b806f8' | wc -l  → 1"
        status: pass
      - kind: integration
        ref: "git remote -v  → empty (no Deocracy, no Sourcerer remote)"
        status: pass
    human_judgment: false
  - id: D2
    description: "inventory/brand-tokens.json classifies every brand occurrence in the migrating scope into exactly one of the five classes, with no unclassified row and a reason on every frozen/coincidental row"
    requirement: "MIG-02"
    verification:
      - kind: unit
        ref: "node -e '...tokens.filter(t=>!CLASSES.includes(t.class))...'  → 42 classified rows, zero unclassified"
        status: pass
      - kind: unit
        ref: "node scripts/scan-brand-residue.mjs --reconcile  → condition 4 reports zero unclaimed probe hits over 102 files"
        status: pass
    human_judgment: false
  - id: D3
    description: "The residual scan is demonstrably red by reconciled counts, with the report committed as evidence"
    requirement: "MIG-02"
    verification:
      - kind: integration
        ref: "node scripts/scan-brand-residue.mjs --reconcile --report .planning/phases/01-platform-extraction-and-rename/01-SCAN-RED-REPORT.md  → exit 1, 933 offenses, all four conditions asserted by name, zero failures"
        status: pass
      - kind: integration
        ref: "ground-truth arithmetic: 928 observed + 57 tracer-renamed + 17 not-imported = 1002 = 755 migrating + 247 phase-verifier (01-RESEARCH.md)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The rename script refuses to run on an unclassified inventory, honours the token boundary rule, and is a no-op on rerun"
    requirement: "MIG-03"
    verification:
      - kind: unit
        ref: "node scripts/rename-brand.mjs --self-test  → resourcerer untouched, sourcererPrivilegedJs renamed, unclassified row named, empty inventory rejected, empty scope rejected, rerun no-op"
        status: pass
      - kind: integration
        ref: "node scripts/rename-brand.mjs --scope-chain chrome-package && git diff --quiet -- patches scripts sourcerer inventory  → zero-byte diff"
        status: pass
    human_judgment: false
  - id: D5
    description: "The chrome:// coupled chain went red → renamed → green through the script, with all six coupled reference formats moving together in one pass"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "node scripts/scan-brand-residue.mjs --scope-chain chrome-package --reconcile  → exit 1 with 57 path:line:token rows before, exit 0 after"
        status: pass
      - kind: integration
        ref: "grep -c '^   content/powerbrowser/' sourcerer/shell/jar.mn → 5; grep -q 'chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs' sourcerer/shell/components.conf → 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Historical Sourcerer decision-ID and plan-file citations in migrated comments survived the tracer verbatim (D-08 provenance)"
    verification:
      - kind: manual_procedural
        ref: "grep over the five renamed files: D-89, D-92, D-96/D-97, D-121/D-122/D-123, SHELL-01, SHELL-02, 04-01-PLAN.md all intact; only brand tokens naming the product changed"
        status: pass
    human_judgment: true
    rationale: "Whether a token in a comment 'names the product' versus 'cites history' is a judgment about intent, not a property a grep can settle. The frozen -PLAN.md row asserts the citations' count, but a reviewer should read the five files' diffs once."

duration: 35min
completed: 2026-08-30
status: complete
---

# Phase 1 Plan 01: Platform Import and Rename Machinery Summary

**The sourcerer platform tree landed in this repo as one provenance-recording snapshot commit, and the inventory-driven rename machinery was proven end-to-end on the `chrome://sourcerer/` coupled chain — six coupled reference formats moving together, red → renamed → green, with a reconciled red-scan report committed as evidence for the remaining 933 occurrences.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-30T10:25Z (approx; first commit 10:30:14-07:00)
- **Completed:** 2026-08-30T10:50:39-07:00
- **Tasks:** 2
- **Files modified:** 116 (112 imported verbatim + 4 authored)

## Accomplishments

- **112 files imported** from `sourcerer@bce68bb468e4dc160da8c9e238e030a400b806f8` via `git archive <sha> | tar -x` — an archive of the tracked tree only, so no ignored path, no `.env`, no `upstream/.git` and no history could ride along (T-01-01). `upstream/`, `objdir/`, `objdir-release/`, `.mozbuild/` and every `node_modules/` are verified **absent from the working tree**, not merely ignored, and `git remote -v` names no sourcerer remote.
- **`inventory/brand-tokens.json`** classifies the complete migrating scope in 42 rows: seven distinct tokens (the three `sourcerer` case forms, both vendor forms, `sourcerer.dev`, and the absolute repo root), thirteen `brand-display` rows carving the display surfaces out of the 311 lexically identical TitleCase occurrences, ten held-back `frozen`/`coincidental` rows each citing file:line evidence, six cross-tier contract rows carrying a `stage`, and nine rows carrying `couples_with` across all six coupled reference formats.
- **`scripts/scan-brand-residue.mjs`** ports `check-internals-boundary.sh`'s named in-tree idiom to Node: `git ls-files` scope, one `path:line:token` row per offense sorted by path then line (two runs are byte-identical, verified with `cmp`), a non-vacuity assertion that FAILS on an empty scan set with its own distinct message, `--reconcile`, `--report`, `--scope-chain`, and a `--self-test`.
- **`scripts/rename-brand.mjs`** applies the inventory as its only replacement plan, imports the scanner's matcher rather than carrying a second copy, refuses to run while any row is unclassified or the inventory is empty, and rebuilds each file in one pass from its claimed spans so a rerun is provably a no-op.
- **The tracer chain went red → renamed → green through the script.** 57 replacements across 5 files, no hand edit. All six coupled formats moved together: the chrome package name and six `jar.mn` registration lines, `components.conf`'s `esModule` and `constructor`, `moz.build`'s `DEFINES`/`JS_PREFERENCE_PP_FILES` wiring, `patches/020`'s `DIRS` entry and `BROWSER_CHROME_URL` override, and both `*'chrome://powerbrowser/'*` allowlist globs in `check-internals-boundary.sh` — where a missed rename would have silently *widened* the boundary guard rather than failing it.
- **The full-tree scan is demonstrably RED by reconciled counts**, and the arithmetic closes against a number this tooling never wrote: 928 observed + 57 tracer-renamed + 17 in the two `CLAUDE.md` files the import deliberately left downstream = **1002 = 755 migrating + 247 phase-verifier occurrences**, exactly matching 01-RESEARCH.md's grep census of the sourcerer tree.

## Task Commits

1. **Task 1a: Snapshot import** — `38a26f5` (chore)
2. **Task 1b: Seed the inventory with the chrome:// chain** — `c3ffb7d` (feat)
3. **Task 1c: The scan and the rename executor** — `f1f3580` (feat)
4. **Task 1c: Rename the chain through the script** — `8a87080` (refactor)
5. **Task 2: Classify the full scope, commit the red evidence** — `12a78c9` (feat)

## Files Created/Modified

- `inventory/brand-tokens.json` — the rename's single source of truth: 42 classified rows plus `scope`, `chains`, `hand_write` and `ground_truth` blocks
- `scripts/scan-brand-residue.mjs` — residual-brand scan, reconciliation, evidence report, self-test
- `scripts/rename-brand.mjs` — rerunnable inventory-driven rename executor, self-test
- `.planning/phases/01-platform-extraction-and-rename/01-SCAN-RED-REPORT.md` — the committed red evidence
- `sourcerer/shell/jar.mn`, `components.conf`, `moz.build`, `patches/020-sourcerer-shell.patch`, `scripts/check-internals-boundary.sh` — the tracer chain, renamed by script
- 112 imported platform files (`sourcerer/`, `theia/`, `scripts/`, `patches/`, `docs/`, `.mozconfig`, `flake.nix`, `flake.lock`, `toolchain-baseline.txt`, `LICENSE`, `.github/workflows/rebase-upstream.yml`)

## Decisions Made

- **The tracer renames content, not paths.** The plan's own "Artifacts this phase produces" section assigns the `sourcerer/` → `powerbrowser/` `git mv` to plan 01-02, and D-06 stages `git mv` separately so rename detection survives. The chain's coupled sites therefore now read `chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs` while the files still live at `sourcerer/shell/*`. 01-02 makes the disk match.
- **JSON over TOML** for the inventory (D-15 left it to the planner): zero dependencies, and both consumers are Node.
- **`--scope-chain` narrows the file set only.** An earlier draft also narrowed the *row* set, which would have made a chain run a second, weaker ruleset. It is now `chains.<name>.files` with every row active.
- **`only_in` over `site_overrides`.** Both are supported and both are gate-checked, but per-site classification is expressed with a file-scoped row carrying a longer context-anchored token (`--with-app-basename=Sourcerer`, `stockControl ? 'Firefox' : 'Sourcerer'`) rather than a pinned line number, which stops meaning anything the moment an edit above it shifts the file — the same lesson `check-internals-boundary.sh`'s own self-test comment records.
- **`MOZ_APP_BASENAME` is `powerbrowser`, not `PowerBrowser`.** D-10 and SKELETON fix the basename/remoting/WMClass identifier at the one-word lowercase form. `.mozconfig`'s `--with-app-basename` and `verify-branding-identity.mjs`'s `application.ini` Name expectation are classified `identity` and carry each other in `couples_with`.
- **Reconciliation condition 4 does not reuse the boundary matcher.** It re-scans with `scope.residue_probes` — a raw case-insensitive substring with no boundary rule — and requires every probe hit to land inside a claimed span. Reusing the matcher would have made the condition audit itself.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's acceptance criteria name post-`git mv` paths that plan 01-02 owns**

- **Found during:** Task 1 (tracer chain verification)
- **Issue:** Task 1's acceptance criteria assert on `powerbrowser/shell/jar.mn` and `powerbrowser/shell/components.conf`, but the same plan's "Artifacts this phase produces" section states `sourcerer/` is "renamed to `powerbrowser/` in plan 01-02", 01-02's own frontmatter lists `powerbrowser/` under `files_modified`, and Task 1's `<files>` list names `sourcerer/`. Executing the directory move here would have half-renamed the tree (`.mozconfig`'s `--with-branding=sourcerer/branding/dev` would have gone stale) and collided with 01-02.
- **Fix:** Honoured the binding `must_haves` truth — "the chrome://sourcerer/ coupled chain **renames end-to-end through the script**", which is a content property — and verified the same assertions against the pre-`git mv` paths. `jar.mn` now names `PowerBrowserAPI.sys.mjs` and five `content/powerbrowser/` registration lines; `components.conf`'s `esModule` reads `chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs`.
- **Files modified:** none beyond the planned chain
- **Verification:** `grep -c '^   content/powerbrowser/' sourcerer/shell/jar.mn` → 5; `grep -q 'chrome://powerbrowser/content/PowerBrowserAPI.sys.mjs' sourcerer/shell/components.conf` → 0
- **Committed in:** `8a87080`

**2. [Rule 1 - Bug] The acceptance criterion `grep -c 'content/powerbrowser/' … → 5` is off by one**

- **Found during:** Task 1 (tracer chain verification)
- **Issue:** `grep -c` counts matching *lines*, and the `%  content powerbrowser %content/powerbrowser/` package-declaration line contains the string too, so the literal command returns 6, not 5. The criterion is counting the five file-registration lines.
- **Fix:** Verified both readings and recorded both. `grep -c 'content/powerbrowser/' sourcerer/shell/jar.mn` → 6 (all six registration lines, which is the coupled-chain property that matters); `grep -c '^   content/powerbrowser/' sourcerer/shell/jar.mn` → 5 (the five file lines the criterion meant).
- **Files modified:** none
- **Verification:** both greps run above
- **Committed in:** n/a (verification-only)

**3. [Rule 2 - Missing Critical] `LICENSE:133` is a display surface the plan's hand-write list omits**

- **Found during:** Task 2 (classifying the vendor token)
- **Issue:** `LICENSE:133` reads `Required Notice: Copyright Deocracy Institute Corporation (Sourcerer)` — the MPL Exhibit B notice, a legal-entity name. A mechanical pass produces "DeBIOS Foundation Institute Corporation", which is not a legal entity, and the plan's `brand-display` list names only the nine branding/desktop/package.json surfaces.
- **Fix:** Added two `brand-display` rows scoped to `LICENSE` (`Sourcerer` → `Power Browser`, `Deocracy` → `DeBIOS Foundation`) and a `hand_write.line_contains` entry anchored on `Required Notice:`, so the rename script cannot touch the line and plan 01-03 rewrites it whole.
- **Files modified:** `inventory/brand-tokens.json`
- **Verification:** `node scripts/rename-brand.mjs --dry-run` reports no replacement on `LICENSE`
- **Committed in:** `12a78c9`

**4. [Rule 2 - Missing Critical] Added a ground-truth reconciliation the plan implies but does not specify a mechanism for**

- **Found during:** Task 2 (producing the red report)
- **Issue:** The plan requires the report's totals to match "research's measured ground truth of 755 occurrences" with "any deviation reconciled in the inventory rather than absorbed", but nothing in the four D-17 conditions compares against a source outside this repo's own tooling — and the tracer had already removed 57 occurrences, so a naive comparison would have shown 928 against 755 and invited exactly the fudge the plan forbids.
- **Fix:** Added a `ground_truth` block to the inventory (research's census, the tracer's 57, and the 17 occurrences in the two `CLAUDE.md` files the import left downstream, each named with its reason) and a named assertion in `--reconcile` that recounts the three raw case forms *the same dumb way research counted them* — plain case-sensitive substring, no rows, no boundary rule — and fails unless the arithmetic closes exactly.
- **Files modified:** `inventory/brand-tokens.json`, `scripts/scan-brand-residue.mjs`
- **Verification:** `928 + 57 + 17 = 1002 = 755 + 247`, asserted on every `--reconcile` run and printed as a table in the committed report
- **Committed in:** `12a78c9`

**5. [Rule 3 - Blocking] The seeded chain schema could not express per-site classification**

- **Found during:** Task 2 (extending to the full scope)
- **Issue:** Task 1's rows are keyed by `(token, case_form, class)`, so the twelve-plus `brand-display` rows Task 2 requires — all of them the same nine characters `Sourcerer` — collided into one row and could not carry different targets.
- **Fix:** Added `only_in` (a row scoped to named files, outranking the broad row for the same literal) and moved chain scope from a per-row `chain` field to a top-level `chains.<name>.files` declaration. Both scripts updated together in one commit so no intermediate commit has a script that cannot read the inventory.
- **Files modified:** `scripts/scan-brand-residue.mjs`, `scripts/rename-brand.mjs`, `inventory/brand-tokens.json`
- **Verification:** both `--self-test`s still pass; chain reconcile green; full-tree reconcile red with zero condition failures
- **Committed in:** `12a78c9`

---

**Total deviations:** 5 auto-fixed (2 blocking, 2 missing-critical, 1 bug in an acceptance criterion)
**Impact on plan:** All five were necessary for correctness. No scope creep: the tracer's diff is the six coupled formats and nothing else, and no file outside the plan's `<files>` list was touched.

## Issues Encountered

- **The tracer rename shifts the red report's baseline.** Task 2's report is produced *after* the tracer removed 57 occurrences, so the tree can never again show research's 755/1002 directly. Rather than absorb the gap, the report reconciles it line by line in a "Ground-truth reconciliation" table and the scan fails if the arithmetic stops closing.
- **Two `.planning/` files (`STATE.md`, `config.json`) were already dirty when this executor started** and are unrelated to this plan; they were left alone and are not in any commit here.

## Known Stubs

None. Every artifact this plan produces is fully wired: the inventory is read by both scripts, both scripts self-test, and the report is generated by the committed scanner rather than hand-written.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema at a trust boundary was introduced. The two trust boundaries the plan's threat model names are both mitigated as planned: the import is `git archive` of the tracked tree only (T-01-01) and the rename is gated on a fully classified inventory with a zero-diff rerun requirement (T-01-02).

## Deferred Items

- **The DeBIOS Foundation's GitHub organisation is not established.** `sourcerer/endpoint-allowlist.json:82` and `theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx:13` carry `https://github.com/Deocracy/Sourcerer`, which the mechanical vendor rename turns into `https://github.com/DeBIOS/PowerBrowser`. D-12 establishes only the `powerbrowser.org` domain. Recorded in the `Deocracy` row's `reason`; the URL must be confirmed before any release.
- **`grep -c 'content/powerbrowser/' … → 5`** should read `6`, or be re-anchored on the five file-registration lines, if plan 01-02 reuses the criterion.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Ready for plan 01-02 (wave 2). It inherits:

- A fully classified inventory with zero unclassified rows, so `rename-brand.mjs` will run rather than refuse.
- A dry-run already measured: **902 replacements across 58 files**, with every hand-write surface untouched and `package.json`'s `applicationName` correctly skipped while its seven identifier occurrences are renamed.
- Six `stage`-tagged cross-tier contracts, so 01-02 can commit by *contract* rather than by tier and avoid Pitfall 3's silent 403.
- The `git mv` list is research's, not the inventory's — the inventory drives content only. 01-02 owns the file and directory moves, including making `sourcerer/shell/SourcererAPI.sys.mjs` match the `PowerBrowserAPI.sys.mjs` name `jar.mn` and `components.conf` already reference.
- After 01-02's pass the scan will still be RED on the ~31 `brand-display` occurrences plan 01-03 hand-writes; that is the designed hand-off, and matches 01-02's own must_have ("exits 0 over the whole tree except the hand-write surfaces plan 01-03 owns").

**Note on `actuals.tokens`:** 311,284 is chars/4 over all 116 changed files, and ~273,000 of it is the verbatim snapshot import — 112 files copied by `git archive | tar -x` with zero authored characters. The authored surface (the inventory, both scripts, the report) is ~38,000 on the same scale. The plan estimated 85,000. The raw figure is reported unrounded so future estimates can calibrate on it, but a snapshot-import plan is not comparable to an authoring plan and should not be used as a scaling precedent.

---
*Phase: 01-platform-extraction-and-rename*
*Completed: 2026-08-30*

## Self-Check: PASSED

All five created artifacts exist on disk and all five task commits resolve in `git log`.
