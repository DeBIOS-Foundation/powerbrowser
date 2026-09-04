---
phase: 01-platform-extraction-and-rename
plan: 02
subsystem: infra
tags: [migration, codemod, rename, gecko, firefox-esr, theia, xpcom, npm-workspaces, static-gate]

requires: ["01-01"]
provides:
  - Every branded file and directory moved under `git mv` in one pure-movement commit, so `git log --follow` resolves each file's history through the rename
  - Every internal identifier resolved in its fixed platform form — the `powerbrowser/` tree, the `@powerbrowser/*` npm scope, `PowerBrowserAPI.sys.mjs`, `chrome://powerbrowser/`, `POWERBROWSER_*` env vars, and the `a-powerbrowser` command-line-handler category
  - `scripts/rename-brand.mjs --scope-files` — contract-scoped staging that narrows the file set only, intersected with the ordinary scope so it cannot bypass `scope.exclude`
  - `scripts/scan-brand-residue.mjs --except-hand-write` — the D-18 gate's site-scoped hand-off to plan 01-03, reporting every held-back surface by file and class on each run
  - The residual-brand scan registered as a permanent gate in `scripts/rebase-upstream.sh` and the CI rebase workflow
affects: [01-03, 01-04, 01-05, 01-06, 01-07, phase-02-generator, phase-06-verification]

actuals:
  tokens: 160218
  tasks: 2
  commits: 9

tech-stack:
  added: []
  patterns:
    - "Staging a codemod by CONTRACT rather than by tier — the commit boundary follows the trust boundary, so no intermediate tree exists in which one half of a cross-tier contract is renamed and the other is not"
    - "A static gate's exception scoped by SITE, not by class — the exception set is computed by the very predicates the codemod obeys, so the gate's carve-out and the codemod's prohibition are one definition and cannot drift"
    - "Deriving the staging plan from committed inventory data (`stage`, `hand_write`) rather than a hand-kept list, then asserting the partition is a disjoint complete cover before running any stage"

key-files:
  created: []
  modified:
    - scripts/scan-brand-residue.mjs
    - scripts/rename-brand.mjs
    - scripts/rebase-upstream.sh
    - .github/workflows/rebase-upstream.yml
    - powerbrowser/shell/TheiaService.sys.mjs
    - theia/extensions/token-gate/src/node/powerbrowser-env.ts
    - theia/applications/browser/package.json
    - .mozconfig
    - patches/010-powerbrowser-identity.patch

key-decisions:
  - "The D-18 gate excepts hand-write SITES, not a class. The outstanding set spans two classes (Pitfall 1 leaves `brand-display` residue in the branding locales; Pitfall 4 leaves `brand-identifier` residue in the two `.desktop` files), so `--except-class brand-display` could never go green and `--except-class brand-identifier` would have gutted the gate."
  - "`excludedWholeFile`/`excludedLine` moved into `scan-brand-residue.mjs` and are re-exported by `rename-brand.mjs`. The scan is the lower-level module, so the other direction would be circular; one definition makes gate-exception and codemod-prohibition an identity rather than two lists that agree until someone edits one."
  - "The six cross-tier contract groups landed in ONE commit, not six. Their file sets overlap (TheiaService.sys.mjs alone carries four), and `--scope-files` narrows the file set only, so whichever group committed first would rename the others' sites in the shared files anyway."
  - "The npm scope is one indivisible contract group. `yarn install --frozen-lockfile` proved it by failing when `customize/package.json` was held back into a later stage while its `@sourcerer/tab-uris` dependency had already been renamed."
  - "`theia/yarn.lock` is NOT regenerated. Yarn v1 resolves workspace-local packages from the filesystem and never records them in the lock, so renaming a workspace package cannot invalidate it — verified, not assumed."
  - "Patch `index` blob-hash lines deliberately untouched; regenerated from a patched tree in plan 01-04, the only procedure that keeps the 3-way-merge chain valid."

patterns-established:
  - "A gate exception must REPORT what it holds back, by file and by class, on every single run — an exception that goes quiet is how it outlives the plan that owns it"
  - "Assert the stage partition is a disjoint complete cover of the offense set before running any stage; a file in two stages silently moves its last-touching commit away from its contract group and breaks the same-commit-hash assertion"

requirements-completed: [MIG-03, GUI-03]

coverage:
  - id: D1
    description: "Every branded file and directory moved under `git mv` in one pure-movement commit, with history resolving through the rename"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "git log --follow --oneline -- patches/020-powerbrowser-shell.patch → resolves back through the rename to the import commit"
        status: pass
      - kind: integration
        ref: "test -d powerbrowser && test ! -e sourcerer → exit 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every cross-tier contract renamed on both sides in a single commit, verifiable by commit hash"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "git log -1 --format=%H on TheiaService.sys.mjs and powerbrowser-env.ts both → 1dc7fd90dd66577f1135ae6e627e7d8650bcd587"
        status: pass
      - kind: integration
        ref: "grep POWERBROWSER_TOKEN → matches on both the chrome side and the Node side"
        status: pass
    human_judgment: false
  - id: D3
    description: "All six coupled reference formats moved together, each asserted distinctly"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "moz.build DEFINES == the sidecar's @POWERBROWSER_DEV_TREE@ token; components.conf esModule == jar.mn == the file on disk; apply-patches.sh names 010-powerbrowser-identity.patch; Symbol.for('PowerBrowserPrivilegedJs') in both the export and verify-dev-flag-off.mjs; config-dir key in verify-customize-inert.mjs and docs/CUSTOMIZE.md; chrome://powerbrowser/ glob in check-internals-boundary.sh"
        status: pass
      - kind: integration
        ref: "check-internals-boundary.sh, --self-test and --catalogue all exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The residual scan is green for every class except the hand-write surfaces, and is registered as a permanent gate (D-18)"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "node scripts/scan-brand-residue.mjs --except-hand-write → exit 0, 102 files scanned, 31 held back and named by file and class"
        status: pass
      - kind: integration
        ref: "gate invoked in scripts/rebase-upstream.sh (step 4b) and as its own CI step in .github/workflows/rebase-upstream.yml"
        status: pass
    human_judgment: false
  - id: D5
    description: "The frozen and coincidental classes are untouched"
    verification:
      - kind: integration
        ref: "cid UUID 7539c85c-… unchanged; a-powerbrowser category; %content/branding/ Gecko slot; MOZ_APP_UA_NAME=Firefox; MOZ_APP_ID GUID; brand-product-name = Firefox; zero +/- on any `pref(` line in firefox-branding.js"
        status: pass
      - kind: manual_procedural
        ref: "grep -rn 'D-9[0-9]' powerbrowser/shell/ → D-91, D-94, D-96, D-98 citations intact verbatim"
        status: pass
    human_judgment: true
    rationale: "Whether a token in a comment names the product or cites history is a judgment about intent, not a property grep can settle (inherited from 01-01's D6)."
  - id: D6
    description: "The four @powerbrowser/* extensions compile"
    requirement: "GUI-03"
    verification:
      - kind: integration
        ref: "nix develop ..#theia --command npx tsc -b extensions/{branding,customize,tab-uris,token-gate} → exit 0"
        status: pass
      - kind: integration
        ref: "yarn install --frozen-lockfile resolves and links all four @powerbrowser/* workspaces; theia/yarn.lock bytes unchanged"
        status: pass
    human_judgment: false
  - id: D7
    description: "GUI-03 survives migration: the customize bridge reads from the renamed config directory and both customize verifiers point at the new path"
    requirement: "GUI-03"
    verification:
      - kind: integration
        ref: "verify-customize-inert.mjs's CONFIG_DIR join reads 'powerbrowser'; docs/CUSTOMIZE.md matches; Symbol.for('PowerBrowserPrivilegedJs') couple intact"
        status: pass
      - kind: integration
        ref: "verify-customize-inert.mjs / verify-dev-flag-off.mjs executed against a running build"
        status: deferred
    human_judgment: false

duration: ~2h25m (across two executor sessions)
completed: 2026-08-30
status: complete
---

# Phase 1 Plan 02: Execute the Rename Summary

**902 identifier occurrences across 58 files renamed by script in five contract-scoped commits on top of a pure-`git mv` movement stage, turning the residual-brand scan green and registering it as a permanent gate — with the gate's hand-off to plan 01-03 scoped by site rather than by class, because the outstanding set spans two token classes and no class exception could express it.**

## Performance

- **Duration:** ~2h25m across two executor sessions (first killed mid-Task-2 by an API rate limit)
- **Tasks:** 2
- **Commits:** 9 (2 from the first session, 7 from this one)
- **Files changed:** 61

## Accomplishments

- **Task 1 (pre-existing, verified not repeated):** every branded path moved under `git mv` in one pure-movement commit (`0b48ca2`), with the inventory repointed at the moved paths (`09b5a32`). `git log --follow` resolves each file's history through the rename.
- **902 replacements across 58 files**, every one applied by `scripts/rename-brand.mjs` from the committed inventory — no hand edit to any renamed site. Staged as a **disjoint complete cover**, asserted programmatically before any stage ran: 556 + 125 + 59 + 1 + 161 = 902.
- **Staged by contract, not by tier.** All six cross-tier contracts (`POWERBROWSER_TOKEN`, `_TOKEN_DISABLE`, `_TOKEN_COOKIE_NAME`, `_BACKEND_READY`, `_SUPERVISED`, `_APP_IDENTITY`) landed on the chrome side, the Node side, and the assertion side in a single commit `1dc7fd9`. The decisive check passes: `git log -1 --format=%H` on `TheiaService.sys.mjs` and on `powerbrowser-env.ts` return the same hash (T-02-01).
- **All six coupled reference formats moved together**, each separately asserted. Two of them were already *split* on arrival and are repaired here: the tracer had renamed `moz.build`'s `POWERBROWSER_DEV_TREE` define in 01-01 while the sidecar pref still expected `@SOURCERER_DEV_TREE@` (which preprocesses to an unsubstituted literal, not an error), and Task 1's `git mv` had invalidated the patch filename `apply-patches.sh` hardcoded.
- **The D-18 gate is green and registered.** `scan-brand-residue.mjs --except-hand-write` exits 0 over 102 files and is wired into `scripts/rebase-upstream.sh` (step 4b) and the CI rebase workflow — a rebase being the one routine operation that pulls in content nobody here wrote.
- **`tsc -b` passes over all four `@powerbrowser/*` extensions**, and `yarn install --frozen-lockfile` resolves and links all four workspaces.
- **Every frozen row survived:** the XPCOM cid UUID, the `a-` category prefix, Gecko's own `%content/branding/` slot, `MOZ_APP_UA_NAME=Firefox`, `MOZ_APP_ID`, the Firefox-compatibility brand literal, and every `pref()` KEY in the branding pref files (only comment text renamed — `git diff` shows zero `+`/`-` on any `pref(` line). The historical `D-9x` Sourcerer decision-ID citations are verbatim (D-08).

## Task Commits

| # | Commit | Message |
|---|--------|---------|
| 1 | `0b48ca2` | refactor: git mv every branded path — pure-movement stage *(prior session)* |
| 2 | `09b5a32` | chore: repoint the inventory at the moved paths *(prior session)* |
| 3 | `587e97a` | feat: stage the rename by contract and hand off the hand-write surfaces |
| 4 | `1dc7fd9` | refactor: rename the cross-tier contracts, both sides in one commit |
| 5 | `98c1e78` | refactor: move the npm scope to `@powerbrowser/*` in one commit |
| 6 | `7b89d89` | refactor: move all six coupled reference formats together |
| 7 | `d1b6c3b` | refactor: rename the vendor literal inside the patch bodies |
| 8 | `6a39b58` | refactor: rename the remaining prose, prefs and verifiers |
| 9 | `e093bab` | feat: register the residual-brand scan as a permanent gate (D-18) |

## Decisions Made

- **The gate excepts hand-write SITES, not a class.** This is the plan's one substantive design change and it is forced by evidence, not preference. See the deviation below.
- **One definition of the hand-write predicate.** `excludedWholeFile`/`excludedLine` now live in `scan-brand-residue.mjs` (the lower-level module — `rename-brand.mjs` already imports it, so the other direction would be circular) and are re-exported by `rename-brand.mjs`. The gate holds back exactly what the codemod is forbidden to touch, by calling the same code.
- **Six contract groups, one commit.** Their file sets overlap heavily, and `--scope-files` narrows the file set only (never the row set — the invariant 01-01 established so a staged run is never a weaker ruleset). One commit for the union satisfies the binding property more strictly than six could.
- **`theia/yarn.lock` untouched.** The plan instructed dropping `--frozen-lockfile` for one run because "the workspace package names changed". That premise does not hold for yarn v1, which never records workspace-local packages in the lock; the lock contains zero `sourcerer` occurrences. Verified rather than assumed.
- **Gate registered in the rebase chain, not in `verify-platform.sh`.** That consolidated driver does not exist yet and D-21 assigns it to a later plan; creating it here would claim another plan's deliverable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's gate command could never turn green — the hand-off must be scoped by site, not by class**

- **Found during:** Task 2, before running any rename stage (the prior session flagged this as an unfinished suspicion; it is confirmed here on evidence).
- **Issue:** The plan's `<verify>` and acceptance criterion both specify `scan-brand-residue.mjs --except-class brand-display`. Measured against the real tree, the 933 offenses partition as **25 `brand-display`** occurrences (Pitfall 1: the branding locales, `configure.sh`, the LICENSE notice) **plus 6 `brand-identifier`** occurrences in the two `.desktop` files (Pitfall 4: `Exec=/home/chris/coding/sourcerer/objdir/dist/bin/sourcerer` carries three tokens on one line with three different correct targets). The outstanding set spans **two classes**, so `--except-class brand-display` leaves the six `.desktop` sites failing and the gate can never go green — while `--except-class brand-identifier` would except the 899 sites this plan exists to rename, gutting the gate entirely.
- **Fix:** Replaced `--except-class` with `--except-hand-write`, which holds back exactly the sites `rename-brand.mjs` is forbidden to touch by calling its own `excludedWholeFile`/`excludedLine` predicates. Site-scoping keeps every other class-and-site combination fully enforced: a stray `brand-identifier` anywhere outside a declared hand-write surface still fails. The partition is exact — **902 enforced** (precisely the replacement count 01-01's dry-run measured) and **31 held back** across the 10 declared surfaces, each named with its count and both classes reported on every run.
- **Files modified:** `scripts/scan-brand-residue.mjs`, `scripts/rename-brand.mjs`
- **Verification:** new self-test case asserts the exception has teeth — it holds back the declared whole-file and line-scoped sites and *nothing else*, keeping an ordinary identifier site and line 2 of a line-scoped file enforced.
- **Committed in:** `587e97a`

**2. [Rule 3 - Blocking] The npm scope cannot be split across stages**

- **Found during:** Task 2, stage 2.
- **Issue:** The first cut of the partition placed `theia/extensions/customize/package.json` in the coupled-formats stage (on the theory its privileged-JS symbol tied it there). `yarn install --frozen-lockfile` refuted it immediately: `Couldn't find package "@sourcerer/tab-uris@0.1.0" required by "@sourcerer/customize@0.1.0"`. That file declares its own name **and** depends on a sibling package, so holding it back renamed the sibling out from under it — Pitfall 3's split-contract hazard in package-name form.
- **Fix:** Moved it into the npm-scope stage with the rest of the scope. Its privileged-JS symbol couple is unaffected — that key lives in the customize *src* files and `verify-dev-flag-off.mjs`, not in `package.json`.
- **Verification:** `yarn install --frozen-lockfile` now clears resolution and links all four `@powerbrowser/*` workspaces; `tsc -b` exits 0.
- **Committed in:** `98c1e78`

**3. [Rule 1 - Bug] The gate caught the commit that registered it**

- **Found during:** Task 2, post-registration verification.
- **Issue:** The explanatory comment written into `scripts/rebase-upstream.sh` used the old brand token literally ("can still reintroduce a Sourcerer string"). `rebase-upstream.sh` is inside the scanned scope, so the gate went red on line 95 — a commit that failed the very gate it was registering, and a broken bisect point.
- **Fix:** Reworded the comment to avoid the literal and added a note recording *why* it must not be spelled there (the inventory is the one place that spells the tokens out). Folded into the registration commit by amend rather than left as an intermediate red state.
- **Verification:** gate exit 0 after the amend.
- **Committed in:** `e093bab`

**4. [Rule 1 - Bug] The plan's `@theia/*` pin count is off by one**

- **Found during:** Task 2, stage 2.
- **Issue:** The acceptance criterion asserts `resolutions` carries **49** `@theia/*` pins and exits non-zero otherwise. The actual count is **50**, both now and at the import commit `38a26f5`.
- **Fix:** None needed in the tree. The binding property is that the pins are *untouched*, and `theia/package.json` is byte-identical to the import commit (`git diff 38a26f5 -- theia/package.json` is empty) — strictly stronger evidence than a count. Recorded here so 01-03+ does not re-derive it. Same class of error as 01-01's deviation #2.

---

**Total deviations:** 4 auto-fixed (1 blocking, 3 bugs — two in the plan's own acceptance criteria).
**Impact on plan:** No scope creep. Deviation 1 is the only design change and it strengthens the gate; deviations 2 and 3 were caught by the plan's own verification steps doing their job.

## Issues Encountered

- **`--reconcile` no longer closes, by construction.** The reconcile mode's `expected_count` census and `ground_truth` arithmetic describe the *pre-rename* tree — that is what made 01-01's committed `01-SCAN-RED-REPORT.md` checkable. Post-rename it reports 36 condition failures and a −896 ground-truth deviation. This is red-state evidence tooling that has served its purpose, **not** the gate: D-18's gate is the plain run, which is what the plan's `<verify>`, the rebase chain, and CI all invoke. Deliberately not rewritten here — plan 01-03 lands the final hand-write renames and can set the terminal census once, rather than this plan setting it and 01-03 setting it again. Tracked below.

## Known Stubs

None. Every surface this plan owns is fully renamed and the gate proves it.

The 31 held-back occurrences are **not stubs** — they are the designed hand-off to plan 01-03, declared in the inventory's `hand_write` block, reported by name and count on every gate run, and structurally impossible for the codemod to touch.

## Deferred Items

- **`--reconcile`'s post-rename census** (see above). Owner: plan 01-03, together with dropping `--except-hand-write` from the gate once the hand-write surfaces land.
- **`scripts/apply-patches.sh --self-test` cannot run in this environment.** It needs `upstream/browser/moz.configure` to derive its fixture, and `upstream/` has never existed in this repo (01-01 asserted its absence; it is a 1.1 GB clone materialized by `fetch-upstream.sh`). Confirmed pre-existing and rename-independent: the identical guard exists at the pre-plan commit `09b5a32`. The rename-owned half **is** repaired — the self-test now names `010-powerbrowser-identity.patch`, the file that exists. `fetch-upstream.sh --self-test` and `check-patch-surface.sh` both pass.
- **`verify-customize-inert.mjs` and `verify-dev-flag-off.mjs` could not be executed** — both need a built binary at `objdir/dist/bin/powerbrowser` (a full Gecko build, Tier 3, ~40 min, not this plan's step). Their static half is verified: the config-dir key and the privileged-JS symbol couple both moved. Their failure message itself names `objdir/dist/bin/powerbrowser` — the renamed basename — which is incidental evidence the identity couple landed.
- **`yarn install` exits non-zero after resolution** on puppeteer's postinstall, which wants a `tar` binary the dev shell does not put on PATH. Pre-existing environment gap in a transitive dependency; resolution, workspace linking, and `tsc -b` all succeed.
- Inherited from 01-01 and still open: the `https://github.com/DeBIOS/PowerBrowser` URL is unconfirmed — the DeBIOS Foundation GitHub org is not established, and D-12 establishes only the `powerbrowser.org` domain.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or schema at a trust boundary was introduced.

Both trust boundaries in the plan's threat model are mitigated as designed:

- **T-02-01 (chrome → Node, EoP):** every cross-tier env var and sentinel landed on both sides in commit `1dc7fd9`, asserted by matching commit hashes. The token-disable bypass remains test-only, referenced from `smoke-theia.sh` alone.
- **T-02-02 (internals-boundary allowlist, EoP):** the `chrome://powerbrowser/` glob names the new package **and** `--self-test` still goes red on a planted offense and on a catalogue with one row removed — proving the guard kept its teeth rather than being silently widened.
- **T-02-03 (contract-id spoofing):** `@powerbrowser.org/single-instance-clh;1`, a DNS name the foundation establishes (D-12), never a `.dev` domain nobody owns.
- **T-02-04 (frozen-token tampering):** every frozen row asserted present and unchanged.
- **T-02-SC (supply chain):** no dependency added; `yarn install` resolved only already-pinned packages and the lockfile bytes are unchanged.

## Next Phase Readiness

Ready for plan 01-03 (the hand-write surfaces). It inherits:

- A tree in which every *identifier* is in its final platform form, so 01-03 only writes display prose.
- An exact, machine-reported worklist: 31 occurrences across 10 files, printed by the gate on every run with per-file counts.
- A gate already wired into the rebase chain and CI. 01-03's completion step is to drop `--except-hand-write` from both call sites; the gate itself announces when that is possible ("nothing; every hand-write surface is already clean, so --except-hand-write can be dropped from the gate").
- The `.desktop` files are the Pitfall 4 case and need three *different* targets on one `Exec=`/`Icon=` line: the repo root (`/home/chris/coding/Power-Browser`, `coincidental`), the tree directory, and the binary basename.

**Note on `actuals.tokens`:** 160,218 is chars/4 over the 61 files this plan changed, on the same scale as the plan's 95,000 estimate. The figure overstates authored work — the great majority of those bytes are pre-existing file content that a scripted single-token substitution passed through, and the genuinely authored surface (the two script changes and the gate registration) is roughly 12,000 on the same scale. Reported unrounded so future estimates calibrate on it, with the caveat that a codemod plan's diff size is a poor proxy for its cost.

---
*Phase: 01-platform-extraction-and-rename*
*Completed: 2026-08-30*

## Self-Check: PASSED

All ten commits resolve in `git log` and every file this plan claims to have created or renamed into existence is present on disk.
