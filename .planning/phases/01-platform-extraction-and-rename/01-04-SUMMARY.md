---
phase: 01-platform-extraction-and-rename
plan: 04
subsystem: build
tags: [patch-stack, blob-hash-chain, gecko-build, branding-artifact, mig-04, verification-registry]

requires: ["01-03"]
provides:
  - "`patches/010-powerbrowser-identity.patch` and `patches/020-powerbrowser-shell.patch` re-derived with a REAL 3-way-merge blob-hash chain: 3ea3d88b93..5923bbd547 chains into 5923bbd547..8e3e347ed7"
  - "`upstream/` materialized by `scripts/fetch-upstream.sh` from a shallow clone at `FIREFOX_153_1_0esr_RELEASE` — 677s, 5.6 G, never committed"
  - "`objdir/dist/bin/powerbrowser` — the first Power-Browser-branded binary this repo has ever produced (2830s dev build)"
  - "Two new labelled checks in `scripts/verify-platform.sh`: `verify-branding-identity-runtime-control` and `smoke-firefox`"
  - "`docs/BUILD.md` build-time table attributed per tree, with this run's row added and the stale `--version` claim corrected"
affects: [01-05, 01-06, 01-07, phase-02-generator, phase-05-patch-strip, phase-06-verification]

actuals:
  tokens: 1017
  tasks: 3
  commits: 3
  tokens_note: >-
    1,017 is chars/4 over the realized diff and is HONEST but badly
    under-describes the plan against its 70,000 estimate. This plan's cost was
    not authored bytes: it was an 11-minute 5.6 GB clone, a 47-minute Gecko
    compile, ~25 minutes of post-build verification runs, and reading roughly
    9,000 lines of existing scripts in order to establish what NOT to rewrite.
    Calibration lesson for future estimates: a plan whose deliverable is
    "prove the thing works" has a near-zero diff and a near-total wall clock,
    and a token estimate is the wrong unit for it.

tech-stack:
  added: []
  patterns:
    - "Proving a 3-way-merge chain by PRUNING the post-image blobs first — `git apply --3way` writes its post-image blob into the object DB, so a re-run on the same clone finds the intermediate blob it wrote last time and passes for the wrong reason"
    - "Reading `git apply`'s own stdout for the absence of `repository lacks the necessary blob` — the exit code is 0 in BOTH the real-3-way and the degraded direct-apply case, so only the message distinguishes them"
    - "Checking a claimed-stale artifact (`theia/yarn.lock`) rather than regenerating it on the plan's say-so — yarn v1 never records workspace-local packages, so the renamed scope left the lockfile byte-identical"
    - "Reusing an existing labelled check under its existing name instead of registering a plan-named alias for the same assertion"

key-files:
  created: []
  modified:
    - patches/010-powerbrowser-identity.patch
    - patches/020-powerbrowser-shell.patch
    - scripts/verify-platform.sh
    - docs/BUILD.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The end-to-end patch proof was run against a PRUNED pristine `upstream/` rather than a second `rm -rf upstream && fetch-upstream.sh`. Re-cloning 5.6 GB would have re-proven nothing (the fresh-clone path already ran once in this plan) while a `git prune --expire=now` after `git reset --hard` removes the post-image blobs a previous apply wrote — which is the ONLY thing that could have made the chain test pass vacuously."
  - "`theia/yarn.lock` was NOT regenerated. It contains zero `@powerbrowser/*` and zero `@sourcerer/*` entries: yarn v1 records no workspace-local package, so the 01-02 scope rename could not have touched it. `yarn install --frozen-lockfile` succeeds against it unchanged."
  - "Task 2's two checks were NOT registered under the plan's proposed names (`token-gate-rejects-unauthenticated` / `token-gate-accepts-minted-token`). `side02-token-negative` and `side02-token-positive` already exist, already run without the bypass, already assert exactly those two properties, and are already reachable by `--only`. Two labels for one assertion is a duplicate, not a gate."
  - "`smoke-firefox` IS registered in the full set even though it invokes `./mach build`. On an already-built tree that build is an incremental no-op and what the script actually asserts is post-build (no `mach bootstrap`, `--version` reports the pinned ESR)."
  - "The release variant was deliberately not built. Nothing in this plan reads `objdir-release/`, and a second ~47-minute compile for a number `03-05-SUMMARY.md` already bounds is the definition of a wasted build cycle."

patterns-established:
  - "`git apply --3way` STAGES its result. `git checkout -- <path>` therefore restores the PATCHED content from the index, not the pristine content from HEAD — use `git reset --hard HEAD` (or `git checkout HEAD -- <path>`) when resetting a patched upstream tree."
  - "Never pipe a `verify-platform.sh --only <label>` invocation that can start a build into `head`. SIGPIPE kills the driver but the check is `setsid`'d, so a second compile can survive into the same objdir."

requirements-completed: [MIG-01, MIG-04]

coverage:
  - id: D1
    description: "Both patches carry a valid 3-way-merge blob-hash chain and apply non-vacuously to a freshly-fetched tree"
    requirement: "MIG-01"
    verification:
      - kind: integration
        ref: "010's post-image `5923bbd547` is byte-equal to 020's moz.configure pre-image; the node chain assertion from the plan's own verify block prints `hash chain intact`"
        status: pass
      - kind: integration
        ref: "from a `git reset --hard` + `git prune --expire=now` pristine tree (all three post-image blobs proven ABSENT first), `scripts/apply-patches.sh` prints three `Applied ... cleanly` lines with NO `repository lacks the necessary blob` fallback, and reports `all 2 patches applied and verified non-vacuous`"
        status: pass
      - kind: integration
        ref: "a second consecutive `scripts/apply-patches.sh` exits 1 and names `010-powerbrowser-identity.patch` (D-75 silent-no-op guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "`upstream/` is script-materialized at the pinned tag, never copied and never committed"
    requirement: "MIG-01"
    verification:
      - kind: integration
        ref: "`rm -rf upstream && scripts/fetch-upstream.sh` → shallow clone of mozilla-firefox/firefox at FIREFOX_153_1_0esr_RELEASE in 677s, 5.6 G; `git -C upstream rev-parse HEAD` == `refs/tags/FIREFOX_153_1_0esr_RELEASE^{commit}` (468445e5)"
        status: pass
      - kind: integration
        ref: "`git ls-files | grep -c '^upstream/'` → 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "The four-way coupling — symlink, git-exclude entry, patch DIRS path, mozconfig branding path — all name the renamed tree"
    verification:
      - kind: integration
        ref: "`upstream/powerbrowser` is a symlink resolving to this repo's `powerbrowser/`; `/powerbrowser` is present in `upstream/.git/info/exclude` (written by `ensure_branding_overlay` onto the fresh clone's own exclude file); 020's DIRS entry is `../powerbrowser/shell`; `.mozconfig` sets `--with-branding=powerbrowser/branding/dev`, which resolved through the symlink during a build that succeeded"
        status: pass
    human_judgment: false
  - id: D4
    description: "No patch touches a compiled Gecko path"
    verification:
      - kind: integration
        ref: "`scripts/check-patch-surface.sh` PASS over both re-derived patches; its `--self-test` still rejects a planted `.cpp` target"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Theia sidecar installs, compiles, spawns node-pty, and answers its health probe under the renamed scope"
    verification:
      - kind: integration
        ref: "`scripts/smoke-theia.sh` PASS — `yarn install --frozen-lockfile` clean, drivelist native rebuild produced its artifact, node-pty spawn proof returned PTY_PROOF_42, backend printed POWERBROWSER_BACKEND_READY and answered :3000"
        status: pass
      - kind: integration
        ref: "`yarn build:extensions` → four `tsc -b` invocations, exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The backend auth gate is fail-closed, proven by a positive control that does not use the test bypass"
    verification:
      - kind: integration
        ref: "`verify-platform.sh --only side02-token-negative` PASS — no cookie → 403 AND no Set-Cookie header leaked; the check's `start_backend` explicitly `env -u POWERBROWSER_TOKEN_DISABLE`s"
        status: pass
      - kind: integration
        ref: "`verify-platform.sh --only side02-token-positive` PASS — minted token → 200 with `{ok:true, pid:<number>}`; a gate that rejects everything would fail here"
        status: pass
    human_judgment: false
  - id: D7
    description: "A Power-Browser-branded application builds and boots on Linux (MIG-04)"
    requirement: "MIG-04"
    verification:
      - kind: integration
        ref: "`scripts/smoke-firefox.sh` PASS — full `./mach build` in 2830s, zero `mach bootstrap` invocations in the log, `./mach run --version` reports 153.1.0esr"
        status: pass
      - kind: integration
        ref: "`shell01-theia-is-the-window` and `shell05-paint-before-backend` both PASS against the launched binary; the `verify-endpoints.sh` launch log shows the loading layer, `POWERBROWSER_BACKEND_READY`, and `Replace loading indicator with ready workbench UI` — the swap sentinel"
        status: pass
      - kind: integration
        ref: "`desktop-entry-quick` PASS — first green run; its `objdir/config.status` prerequisite now exists"
        status: pass
    human_judgment: false
  - id: D8
    description: "All six branding surfaces equal their Power Browser values ON THE BUILT ARTIFACT, and the comparison is proven to discriminate"
    requirement: "MIG-04"
    verification:
      - kind: integration
        ref: "`node scripts/verify-branding-identity.mjs` → `PASS -- all six surfaces correct` (executable, application-ini, runtime-identity, brand-full-name, desktop-entry, version), every read from `objdir/dist/bin/`"
        status: pass
      - kind: integration
        ref: "`node scripts/verify-branding-identity.mjs --positive-control runtime-identity` exits 0 by correctly reporting FAILURE against the stock Firefox value — the comparison has teeth"
        status: pass
    human_judgment: false
  - id: D9
    description: "No unattended callout reaches a host absent from the endpoint allowlist"
    verification:
      - kind: integration
        ref: "`scripts/verify-endpoints.sh` PASS — all three layers, `layer 3 PASS -- all resolved hosts are allowlisted`, run against the built artifact"
        status: pass
    human_judgment: false

duration: ~2h15m
completed: 2026-08-30
status: complete
---

# Phase 1 Plan 04: Build and Prove the Branded Application Summary

**The patch stack's 3-way-merge chain was broken in a way no exit code reported — `git apply` printed `repository lacks the necessary blob` and silently degraded to direct application while still exiting 0 — and re-deriving it from a patched tree fixed it in three index lines; then a 47-minute Gecko build produced `objdir/dist/bin/powerbrowser`, whose six branding surfaces all read correct with the runtime-identity positive control green, which is what finally closes MIG-04 on evidence rather than on a plan's frontmatter.**

## Performance

- **Duration:** ~2h15m wall (677s clone + 2830s build + ~25m verification + ~20m authoring)
- **Tasks:** 3
- **Commits:** 3
- **Files changed:** 5 (0 created, 0 deleted)

## Accomplishments

- **The silent 3-way degradation was real and is now gone.** 01-02 rewrote the patch bodies' brand literals without recomputing the `index` blob hashes, so 010's post-image (`33098ee135`) and 020's moz.configure pre-image no longer described any blob that exists. `git apply --3way` printed `error: repository lacks the necessary blob to perform 3-way merge. Falling back to direct application...` **and exited 0.** Re-derived from a patched tree, the chain is now `3ea3d88b93..5923bbd547` → `5923bbd547..8e3e347ed7`, and all three hunks report `Applied ... cleanly` with no fallback line. Only the three `index` lines changed; every patch body byte, including the shell hunk's `D-89/D-92` decision-ID citations, is preserved verbatim.
- **The chain proof was made non-vacuous on purpose.** `git apply --3way` **writes its post-image blob into the object database**, so the intermediate blob a passing run needs is one a previous run already put there. A naive re-test on the same clone would have passed regardless of whether the chain was fixed. The proof therefore ran after `git reset --hard HEAD` **and** `git prune --expire=now`, with all three post-image blobs verified ABSENT (`fatal: Not a valid object name`) before the applier was invoked.
- **`objdir/dist/bin/powerbrowser` exists and is branded.** First full Power Browser compile: 2830s (~47m11s) on `legion`. All six identity surfaces PASS against the artifact — `application-ini` Name/Vendor, `runtime-identity` via the launched binary's sentinel, `brand-full-name` agreeing across `brand.ftl` and `brand.properties`, `desktop-entry`, `version`, and the executable/absent-`firefox` pair.
- **The comparison is proven to discriminate.** `--positive-control runtime-identity` swaps in the stock Firefox value and exits 0 only by reporting FAILURE. It did. A verifier that agrees with everything would have been indistinguishable from a green run without this.
- **Nothing reached an unlisted host.** `verify-endpoints.sh` PASS on all three layers against the launched build.
- **MIG-04 is closed, and MIG-01 with it.** Build + boot + branding, each with its own evidence line, listed above under coverage D7/D8. MIG-01's proof is that `upstream/` came from `scripts/fetch-upstream.sh` executing a real shallow clone in this session and remains absent from `git ls-files`.
- **Eight previously-unrunnable checks went green.** `apply-patches-self-test`, `desktop-entry-quick`, `verify-customize-inert`, `verify-dev-flag-off`, `shell01-theia-is-the-window`, `shell05-paint-before-backend`, plus the two new registrations. Seven `WINDOWS.md` entries closed.

## Task Commits

| # | Commit | Message |
|---|--------|---------|
| 1 | `abd23fd` | fix(01-04): re-derive both patches so the 3-way blob-hash chain is real |
| 2 | — | *(no commit — see "Task 2 changed nothing" below)* |
| 3 | `e8f40b4` | feat(01-04): build Gecko, prove the branded artifact, register the post-build checks |

Plus the plan-close metadata commit.

## Decisions Made

### The end-to-end proof used a pruned tree, not a second 5.6 GB clone

The plan's step 5 says `rm -rf upstream && scripts/fetch-upstream.sh && scripts/apply-patches.sh`. The fresh-clone path **did** run once in this plan — that is MIG-01's proof, and it created the symlink and appended `/powerbrowser` to a virgin exclude file, both verified. Running it a second time would have re-downloaded 5.6 GB to re-prove the same fact.

What the second run actually needed to establish is that the chain is real, and a re-clone is not even the strongest way to establish it. `git reset --hard HEAD` + `git prune --expire=now` removes exactly the blobs a previous `git apply --3way` wrote — the ones that could make the test pass for the wrong reason — and the absence of each was asserted by name before the applier ran. Strictly stronger evidence, at 1/50th the cost.

### `theia/yarn.lock` was not regenerated, because it was never stale

01-02 flagged it as possibly needing regeneration after the workspace scope rename. It does not: `grep -c '@powerbrowser' yarn.lock` → 0 and `grep -c '@sourcerer' yarn.lock` → 0. **Yarn v1 records no workspace-local package in the lockfile at all**, so a scope rename cannot touch it. `smoke-theia.sh` runs `yarn install --frozen-lockfile` and passed with the file byte-unchanged (`git status --short theia/` empty). Regenerating it on the plan's say-so would have produced a diff that asserted nothing and re-resolved 49 pinned Theia packages for no reason.

### Two labels for one assertion is a duplicate, not a gate

The plan asks for `token-gate-rejects-unauthenticated` and `token-gate-accepts-minted-token`. `verify-platform.sh` already carries `side02-token-negative` and `side02-token-positive`, which spawn the backend with `env -u POWERBROWSER_TOKEN_DISABLE` (so the bypass is provably not in play), assert 403-with-no-`Set-Cookie` and 200-with-`{ok:true,pid}` respectively, and are already reachable by `--only`. Both were run and both PASS. Adding aliases would have doubled the registry's row count for the same two assertions and made a future reader wonder which pair is authoritative.

### The release variant was not built

`verify-branding-identity-release` and `branding-variant-divergence` read `objdir-release/dist/bin`. Building it costs ~47 more minutes for a figure `03-05-SUMMARY.md` already measured and a branding split that lives entirely in display names and one title-bar pref. The plan says explicitly not to; recorded instead as an honest open `WINDOWS.md` entry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `docs/BUILD.md` claimed the binary reports `Mozilla Firefox 153.1.0esr`**

- **Found during:** Task 3, immediately after the first `--version` run.
- **Issue:** `docs/BUILD.md:171` carried a pre-rename measurement as a live claim about this tree's binary. It reports `DeBIOS powerbrowser 153.1.0esr`. The D-18 residual scan cannot catch this — `Mozilla` and `Firefox` are not inventory tokens — so the wrong claim would have sat in the build documentation indefinitely.
- **Fix:** corrected to the measured string, with the reason `Power Browser` correctly does *not* appear there (see plan correction 3 below) written next to it so the next reader does not "fix" it back.
- **Committed in:** `e8f40b4`

### Plan Corrections

**2. [Plan error] The plan's `--version` acceptance criterion is wrong, and contradicts its own sibling criterion**

The plan asserts:

> `objdir/dist/bin/powerbrowser --version` output contains `DeBIOS Power Browser` — the version surface concatenates the machine vendor and the display name

It does not, and must not. `DumpVersion()` concatenates `MOZ_APP_VENDOR` with the app **basename** (`MOZ_APP_NAME`, set by `--with-app-basename=powerbrowser`), not `MOZ_APP_DISPLAYNAME`. Measured: `DeBIOS powerbrowser 153.1.0esr`. The plan's *own preceding criterion* — "the binary carries the fixed lowercase platform name" — says the same thing; the two criteria contradict each other and the `grep -E 'DeBIOS Power Browser [0-9]+'` verify line would fail on a correct build.

`scripts/verify-branding-identity.mjs`'s `version` surface expects exactly `DeBIOS powerbrowser 153.1.0esr`, derived from `application.ini` plus `version_display.txt`, and it PASSES. The display name is asserted where it actually lives — `brand-full-name` (`Power Browser Dev`, cross-checked between `brand.ftl` and `brand.properties`) and `desktop-entry` (`Name="Power Browser Dev"`). **No code change was warranted; the criterion was.** The doc now records why.

**3. [Plan error] The bypass-containment verify line cannot pass as written, and its intent already holds**

The plan's check is `test "$(grep -rl 'POWERBROWSER_TOKEN_DISABLE' ... | grep -vc 'token-gate')" -le 1`. Three files outside the token-gate extension reference the name:

| File | Why |
|---|---|
| `scripts/smoke-theia.sh` | sets the bypass — the sanctioned test-only use |
| `scripts/verify-platform.sh` | 5 references, all in checks that `env -u` it or document why |
| `powerbrowser/shell/TheiaService.sys.mjs:396` | sets it to `""` when spawning the backend |

The third is the interesting one, and it is the **opposite** of a production use: the supervisor explicitly clears the variable so an inherited `1` from the launching shell cannot be captured at the backend's module load and disable the gate for that process's whole lifetime. A production path that names the bypass in order to erase it is stronger than one that never mentions it. The criterion's intent — "no production code path *relies on* it" — holds; its literal arithmetic does not.

**4. [Plan gap] Two of the four post-build checks were already registered; two were not**

The plan's acceptance says all four post-build checks must be registered. `verify-branding-identity-dev` and `verify-endpoints` already were. `smoke-firefox` and a `runtime-identity` positive control were not — the only existing control was `verify-branding-identity-brand-ftl-control`, which exercises `brand-full-name` (a packaged-`.ftl` read), a different read path from `runtime-identity` (a launched-binary sentinel read) with its own independent way of agreeing with everything. Both added, both verified reachable by `--only`, with the unknown-label control still failing correctly.

### Process Notes

**5. [Self-inflicted, no damage] A `--only smoke-firefox` invocation was piped to `head` while the real build was running**

`head` closed the pipe, SIGPIPE killed the driver — but the driver `setsid`s external script checks, so a second `./mach build` into the same objdir could have survived. It did not (verified by process inspection: exactly one `smoke-firefox.sh` chain alive). Recorded as a pattern above because the failure mode is silent and the objdir corruption would have surfaced 40 minutes later.

---

**Total deviations:** 1 auto-fixed bug, 3 plan corrections, 1 process note.
**Impact on plan:** No scope creep, no task dropped. Task 2 produced no commit because the correct action was to verify three claims and change nothing.

## Task 2 changed nothing, deliberately

Task 2's `files_modified` is `theia/yarn.lock` and its action is "install, build, smoke, then add two positive controls". All four of its deliverables were already true:

| Deliverable | State found | Evidence |
|---|---|---|
| Sidecar installs/builds/boots | already green | `smoke-theia.sh` PASS |
| `tsc -b` over four extensions | already green | `yarn build:extensions`, exit 0 |
| `yarn.lock` regenerated | **not needed** | zero workspace-local entries; `--frozen-lockfile` clean; `git status` empty |
| Both positive controls registered | already registered | `side02-token-negative` / `side02-token-positive`, both PASS |

A commit here would have been a no-op commit or a churn diff. The evidence is recorded above under coverage D5/D6 instead.

## Issues Encountered

- **`git apply --3way` stages its result.** After an apply, `git checkout -- browser/moz.configure` restores the **patched** content from the index, not the pristine content from HEAD. The first reset attempt silently did nothing and the applier's D-75 guard fired on an "already applied" tree — which read as a chain failure when it was a reset failure. `git reset --hard HEAD` is the correct reset for a patched upstream tree.
- **A stale Theia backend on `:3000`** left over from a prior check's teardown made `verify-dev-flag-off` fail with `something is already listening on http://localhost:3000`. Not a defect — the guard is deliberate and exists so a leftover server cannot satisfy a health probe for a build that never booted. Killed and re-run: PASS.
- **`upstream/` is 5.6 G, not the 1.1 G several planning documents cite.** `docs/BUILD.md` already had the correct figure; the 1.1 G number appears in `WINDOWS.md`, `deferred-items.md` and the 01-03 summary. Not corrected there — those are historical records — but noted here so nobody sizes a disk budget off it.

## Known Stubs

None. Every surface this plan touched carries a measured value.

## Deferred Items

Recorded in `.planning/WINDOWS.md` as two new `unrun-verify` entries:

- `verify-branding-identity-release` and `branding-variant-divergence` need an `objdir-release/`, i.e. a second ~47-minute build this plan explicitly declined to spend.
- The ~20 launch-lifecycle checks (`side03-*`, `side04-*`, `side05-*`, `shell03-*`, `shell04-diagnostics-with-backend-down`, `cr01-*`, `harness-display-available`) became **runnable** with this build but were not run — none is named by this plan's verify blocks and each launches a real browser. Not blocked; unexercised.

**Seven ledger entries closed:** 1 and 2 (the unestablished GitHub org — verified gone from the tree, only a historical narrative sentence in the inventory remains), 3 and 8 (`apply-patches --self-test`, which now runs and passes both ways), 4 and 5 (`verify-customize-inert`, `verify-dev-flag-off` — both run, both PASS), 7 (its stated cause, an absent `objdir/`, is gone; replaced by the two honest entries above), and 9 (MIG-04).

Entry 6 (`scan-brand-residue --reconcile`'s historical census) is left open — 01-03 made a deliberate decision to keep that census historical, and it is theirs to close or waive.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or schema at a trust boundary.

Every mitigation in the plan's threat model landed with evidence:

- **T-04-01 (silent 3-way no-op):** the threat was **live in the repo** — `git apply` was degrading to direct application on 020's moz.configure hunk while exiting 0. Chain re-derived, asserted by string equality, proven from a blob-pruned pristine tree, and the second-apply guard confirmed firing by name.
- **T-04-02 (compiled patch path):** `check-patch-surface.sh` PASS over both re-derived patches; its self-test still rejects a planted `.cpp`.
- **T-04-03 (upstream clone integrity):** cloned at `FIREFOX_153_1_0esr_RELEASE` from the canonical mirror; HEAD hash equals the tag's commit hash (`468445e5`); `git ls-files` carries nothing under `upstream/`.
- **T-04-04 (backend auth gate):** both positive controls run **without** the bypass and both PASS; the negative control additionally asserts no `Set-Cookie` leaked on the 403.
- **T-04-05 (unattended callout):** `verify-endpoints.sh` PASS against the built artifact, fail-closed allowlist, layer 3 clean.
- **T-04-06 (verifier tautology):** the identity verifier reads `objdir/dist/bin/` only, and `--positive-control runtime-identity` proves the comparison discriminates.
- **T-04-SC (supply chain):** no package-manager install occurred. `yarn install --frozen-lockfile` resolved only already-pinned packages against an unchanged lockfile.

## Next Phase Readiness

Plans 01-05 through 01-07 inherit:

- A **built, branded, booting binary** at `objdir/dist/bin/powerbrowser`, and with it ~29 checks in `verify-platform.sh` that go from unrunnable to runnable. `--only <label>` is the way to exercise them one at a time rather than paying for the full set.
- A **materialized `upstream/`** at the pinned tag with both patches applied and the four-way coupling verified. `scripts/fetch-upstream.sh` now no-ops on it; **do not `rm -rf upstream`** without budgeting 11 minutes and 5.6 GB.
- A **real patch chain**, which is the precondition Phase 5's MIG-05 patch-strip work depends on: it can only preserve a chain that is valid to begin with.
- `--quick` still 15/15 green and the bare D-18 scan still exit 0 over the whole tree, with all of this plan's changes staged.

---
*Phase: 01-platform-extraction-and-rename*
*Completed: 2026-08-30*

## Self-Check: PASSED

All five modified files are present on disk, `objdir/dist/bin/powerbrowser` exists and is executable, and both task commits (`abd23fd`, `e8f40b4`) resolve in `git log`. The bare D-18 gate — `node scripts/scan-brand-residue.mjs`, no flags — exits 0 with every change of this plan **staged**, which is the only state in which that scan sees them (it iterates `git ls-files`).
