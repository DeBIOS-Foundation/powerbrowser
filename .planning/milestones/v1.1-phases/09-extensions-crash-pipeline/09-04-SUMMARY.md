---
phase: 09-extensions-crash-pipeline
plan: 04
subsystem: extensions
tags: [theia-plugins, tier-3, openvsx, npm, local-path, targetPlatform, re-pin, token-gate]

# Dependency graph
requires:
  - phase: 09-extensions-crash-pipeline
    provides: [09-01 npm/local-path resolver branches plus pin-gate float guards, 09-03 derive-and-compare gate idiom]
  - phase: 08-installer-hardening-canonical-rename
    provides: [08-05 packaging-host capability record plus staged-unexecuted discipline plus drill-then-restore]
provides:
  - generate-level fixture cells over npm, local-path, and one real pinned Open VSX entry with hash-equal restore
  - tier-3 download hash build evidence on nix-linux over a staged five-entry manifest plus honest staged win/mac cells
  - Theia re-pin runbook with current-pin agreement proof and token-gate intactness, live 1.75.0 bump staged
affects: [downstream extension compositions, pkg-win11 and pkg-macos provisioning, future Theia re-pin adoption]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 7900
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [independent-oracle fixture assertion beside derive-and-compare gates, staged-window verify chains with durable subsets, loopback-twin synthetic downloads]

key-files:
  created: [.planning/phases/09-extensions-crash-pipeline/fixtures/npm-kind/configuration.toml, .planning/phases/09-extensions-crash-pipeline/fixtures/local-path-kind/configuration.toml, .planning/phases/09-extensions-crash-pipeline/fixtures/openvsx-pinned/configuration.toml]
  modified: [scripts/verify-downstream-fixture.mjs, scripts/verify-platform.sh, docs/BUILD.md]

key-decisions:
  - "Live npm cell uses real chart.js 4.5.1 tarball plus a loopback-served synthetic twin: the stock fetcher rejects .tgz, so synthetic-only would force a build-script deviation"
  - "Tarball kinds travel out of band (curl/pack plus place) by downloader capability read off the installed @theia/cli; vsix kinds ride the stock download, placeholder expansion included"
  - "Sidecar build is theia build direct over the assembled set; the full yarn build wrapper would re-run stock download over pack references and abort by design"
  - "Live Theia bump to 1.75.0 staged with operator unblock: adoption-scale rewrite no phase-09 requirement demands; agreement plus token-gate proven at the stated 1.74.1 pin"
  - "verify-upstream-pins.mjs untouched: steps 5-7 already enforce the UPD-04 contract, so the proof is running them, not editing them"
  - "Task-2 chain runs green in the staged window; the durable subset re-runs green post-restore; the placeholder leg is window-bound by the no-residue prohibition"

patterns-established:
  - "Staged drill twins take the drill prefix, never fixture ids: the absence sweep reads the staged manifest as platform truth, so a shared id goes red (caught live this plan)"
  - "Evidence paths share their line with the keyword that gates them, so the chain's log audit enforces every referenced log"

requirements-completed: [BLD-02, UPD-04]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Generate-level fixture cells over npm, local-path, and one real pinned Open VSX entry pass with post-run tree hashes equal to the snapshot"
    requirement: "BLD-02"
    verification:
      - kind: unit
        ref: "node scripts/verify-downstream-fixture.mjs --all --fixtures-root <09-fixtures>#3 fixtures, 198 assertions PASS"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only verify-downstream-fixtures#PASS over both roots"
        status: pass
      - kind: unit
        ref: "node scripts/verify-downstream-fixture.mjs --self-test#14 planted cases PASS"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reachable-host download plus hash plus sidecar build cells green on nix-linux with evidence logs on disk"
    requirement: "BLD-02"
    verification:
      - kind: integration
        ref: ".mozbuild/0904/download-stock.log#stock fetch of both vsix entries, placeholder expanded"
        status: pass
      - kind: integration
        ref: ".mozbuild/0904/plugins-hashes.log#all five archives hash to staged pins"
        status: pass
      - kind: integration
        ref: "node scripts/verify-extension-pins.mjs over staged set#PASS fragment plus block plus suffix plus hashes"
        status: pass
      - kind: integration
        ref: ".mozbuild/0904/build-sidecar.log#theia build 0 errors on both targets"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unreachable-host build and install cells recorded staged-unexecuted with exact errors and operator unblocks"
    requirement: "BLD-02"
    verification: []
    human_judgment: true
    rationale: "No provisioned Windows or macOS host exists; the rows can only go green when pkg-win11/pkg-macos are provisioned and the procedure re-runs there"
  - id: D4
    description: "Theia re-pin agreement holds at the stated 1.74.1 pin with the token-gate backend compiling and its suites green, runbook recorded, live 1.75.0 bump staged"
    requirement: "UPD-04"
    verification:
      - kind: unit
        ref: "node scripts/verify-upstream-pins.mjs --self-test#4 planted faults red naming the file"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only verify-upstream-pins#PASS"
        status: pass
      - kind: unit
        ref: "tsc -b theia/extensions/token-gate#exit 0, no errors"
        status: pass
      - kind: unit
        ref: "node theia/extensions/telemetry/test/telemetry-sender.test.mjs#SUITE PASS 9/9"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --quick#PASS all checks passed"
        status: pass
    human_judgment: false

# Metrics
duration: 32min
completed: 2026-09-05
status: complete
---

# Phase 09 Plan 04: Tier-3 Fixture Matrix and Re-pin Proof Summary

**Five-entry staged manifest proves every extension source kind on real nix-linux artifacts (stock vsix download with placeholder expansion, per-target hashes, pin re-proof green, sidecar build 0 errors), win/mac cells honestly staged, and the Theia re-pin agreement holds at 1.74.1 with the token gate intact — tracked tree restored byte-identical.**

## Performance

- **Duration:** 32 min (tier-3 cells live: downloads plus incremental sidecar build; no 47-minute Gecko spend — the Theia sidecar compiles in seconds incremental)
- **Started:** 2026-09-05T08:29:00Z
- **Completed:** 2026-09-05T09:01:36Z
- **Tasks:** 3
- **Files modified:** 9 tracked (3 fixture manifests plus 3 mark.svg plus harness plus registry row plus BUILD.md) with gitignored proof evidence under .mozbuild/0904/

## Accomplishments
- Three committed 09 fixture cells (synthetic npm, synthetic local-path, real akamud.vscode-theme-onedark 2.3.0 with the true registry-byte sha256) pass through the harness `--all` mode with post-run hashes equal to the snapshot
- Harness gains an independent per-kind download-map oracle over `generated/theia-plugins.json` (stated separately from the generator resolvers, so a resolver regression goes red) with drift/missing/stale plants in `--self-test`
- Live nix-linux drill over a staged five-entry manifest: stock download of both vsix entries with `${targetPlatform}` expanded to linux-x64, per-target bytes plus hashes for linux-x64/win32-x64/darwin-arm64, all five archives hash-matched to staged pins, pin gate green over the staged set, sidecar `theia build` 0 errors on both targets
- Win/mac build-plus-install cells staged-unexecuted with the re-read 08-05 provisioning errors plus operator unblocks; tracked tree restored byte-identical (backups, regenerate, `--check` fresh, `git status` clean)
- Re-pin runbook extended with the token-gate intactness step; agreement proven at `theia_release = "1.74.1"` (self-test plus full row), token-gate `tsc -b` clean with telemetry suite 9/9, live bump to 1.75.0 recorded staged with unblock

## Task Commits

Each task was committed atomically:

1. **Task 1: Generate-level fixture matrix over the new source kinds** - `da168d4` (feat)
2. **Task 2: Tier-3 real-artifact cells plus staged host records** - `eb95524` (feat)
3. **Task 3: Re-pin runbook plus agreement proof with token-gate intact** - `38e39e3` (feat)

## Files Created/Modified
- `.planning/phases/09-extensions-crash-pipeline/fixtures/npm-kind/configuration.toml` - Synthetic npm cell (acme.npmpack 2.4.1, valid-shape pins) plus brand mark (created)
- `.planning/phases/09-extensions-crash-pipeline/fixtures/local-path-kind/configuration.toml` - Synthetic local-path cell (acme.localtool, path-only, no bytes) plus brand mark (created)
- `.planning/phases/09-extensions-crash-pipeline/fixtures/openvsx-pinned/configuration.toml` - Real pinned cell (akamud.vscode-theme-onedark 2.3.0, true byte sha256) plus brand mark (created)
- `scripts/verify-downstream-fixture.mjs` - `expectedExtensionUrl`/`checkExtensionFragment` oracle wired into every drive plus 5 new self-test plants (modified)
- `scripts/verify-platform.sh` - `verify-downstream-fixtures` row drives the 09 root via the same glob idiom, failing when either drive fails (modified)
- `docs/BUILD.md` - Extension tier-3 drill section (matrix, per-target evidence, staged rows, verbatim transcript) plus re-pin runbook step 6 and UPD-04 proof record (modified)
- `.mozbuild/0904/` - Gitignored proof evidence: fetched archives (akamud, three rust-analyzer targets, chart.js, synthetic packs), download/build logs, hash record, staged fragment, drill backups (untracked, on disk)

## Decisions Made
- Live npm cell uses the real chart.js 4.5.1 tarball AND a loopback-served synthetic twin: probing the installed `@theia/cli` fetcher showed `.tgz` URLs are an unsupported file type there, so a synthetic-only npm cell would force a build-script deviation (`--ignore-errors` or block surgery). The real immutable tarball keeps every stock fetch byte-honest; the loopback twin keeps the plan's synthetic-shape proof without depending on third-party availability. Registry 404s for both synthetic ids recorded so no real package name is shadowed.
- Tarball kinds travel out of band (curl over HTTPS, loopback HTTP for the twin, `npm pack` for local-path) into the `.tar.gz` slots the pin gate hashes; vsix kinds ride the stock download. This split is read off downloader capability, not invented — the pin gate's `.tgz`-to-`.tar.gz` mapping already anticipates the placement.
- Sidecar build is `theia build` direct over the assembled plus verified set: the full `yarn build` wrapper re-runs stock download over the whole block and aborts on pack references by the design above. Rebuild step skipped (native modules prebuilt; extensions are runtime-loaded data the compiler never reads). Incremental 4.9s wall with 0 errors on both targets, quoted exactly, no inflation.
- Live Theia bump to newest-stable 1.75.0 staged, not executed: a minor-line re-pin rewrites every framework pin plus lockfile plus reinstall plus full recompile, with real breakage risk no phase-09 requirement demands — and the tree's own runbook says not to perform it speculatively. Agreement plus token-gate proven at the stated 1.74.1 pin instead.
- `scripts/verify-upstream-pins.mjs` left untouched: steps 5-7 already enforce the UPD-04 contract, so the proof is running them, not editing them.
- Task-2 chain semantics: the full `&&` chain runs green in the staged window (placeholder leg needs the staged fragment/block); the durable subset re-runs green post-restore. The placeholder's durable proof is the saved staged fragment plus the committed fixture manifests plus the generator self-test — tier-3 cells are re-drillable by the recorded procedure, never by re-reading reverted output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Staged drill ids collided with fixture ids and the harness went red**
- **Found during:** Task 2 (first `--quick` leg in the staged window)
- **Issue:** The staged drill entries reused the fixture ids (`acme.npmpack`, `acme.localtool`). The downstream-fixture absence sweep reads the staged manifest as platform truth, so the npm-kind fixture's own emitted lines were flagged as un-echoed platform values (`extensions[3].id`, `extensions[3].version`). The local-path cell passed only by comma-position luck (last entry, E1-exempt line) — same defect, latent.
- **Fix:** Renamed the staged twins with the drill prefix (`acme.drillpack` 2.4.2, `acme.drilltool` under `extensions/acme-drill`), re-packed, re-pinned, re-staged, re-drilled end to end (fresh downloads, hashes, pin re-proof, rebuild). Fixture ids unchanged.
- **Files modified:** docs/BUILD.md (drill section names the reason), staged-only files (restored)
- **Verification:** `--quick` PASS in-window, full task-2 chain PASS in-window
- **Committed in:** eb95524 (task commit; the collision and rename are recorded in BUILD.md)

---

**Total deviations:** 1 auto-fixed (1 bug, found by the project's own gate — the harness earned its keep)
**Impact on plan:** Drill-identity rename only; no scope creep, no product change, no new packages. The remaining adaptations (real-npm-plus-twin, out-of-band split, theia-build-direct, staged bump) are drill-design decisions within the plan's staged-with-evidence discipline, documented above.

## Issues Encountered
- `curl` without `-L` silently wrote a 0-byte file on the first Open VSX fetch (302 to the CDN host); retried with `-L` and verified zip magic plus byte count before pinning. Scratch evidence only.
- A schematic transcript line (`@<target>.vsix` placeholder path) leaked a non-existent file into the chain's log audit; rewrote it to the real archive name and joined evidence paths onto their keyword lines so the audit enforces all six logs. Caught by running the chain's own extraction before the chain.
- The first harness `--self-test` run after the oracle edit is what it is (14/14 green, no issue); noting it only because the plant count moved 9 to 14.
- The tool environment blocks process-kill commands and writes outside the workspace: scratch lived in `.mozbuild/0904/` (gitignored proof dir) throughout, and the loopback server exited with its shell (port verified closed post-drill).

## User Setup Required
None - no external service configuration required. (Operator provisioning of pkg-win11/pkg-macos and the future 1.75.0 adoption are staged follow-ups with unblocks in BUILD.md, not setup for this plan.)

## Next Phase Readiness
- BLD-02 done for extensions: generate-level cells plus reachable-host real-artifact proof plus staged host rows. The win32-x64 and darwin-arm64 vsix pins are already documented for their hosts' future green runs.
- UPD-04 done at the current pin: the next tag (1.75.0 observed) rides runbook steps 1-6 verbatim with the `monaco-editor-core` exception kept.
- Follow-up (not blockers): a pack-aware download wrapper so the full `yarn build` covers tarball kinds; provisioning pkg-win11/pkg-macos; Theia 1.75.0 adoption.
- No blockers. STATE.md and ROADMAP.md untouched per orchestrator ownership.

---
*Phase: 09-extensions-crash-pipeline*
*Completed: 2026-09-05*

## Self-Check: PASSED
- All seven created/modified files exist on disk (3 fixture manifests plus 3 marks plus harness plus registry row plus BUILD.md plus this SUMMARY).
- All three task commits exist (`da168d4`, `eb95524`, `38e39e3`).
- Task verify chains re-run green: task 1 (harness self-test 14/14, both `--only` rows incl. 3 new cells at 198 assertions); task 2 (full `&&` chain green in the staged window, durable subset green post-restore); task 3 (agreement self-test plus row, token-gate tsc, telemetry 9/9, runbook greps, `--quick`).
- Stub scan clean over changed hunks; threat surface inside the plan's T-09-10/11/12 register (registry bytes hashed to pins, no framework source edits, staged cells carry errors plus unblocks), so no Threat Flags section.
- STATE.md and ROADMAP.md untouched (orchestrator-owned; pre-existing modifications left alone).
