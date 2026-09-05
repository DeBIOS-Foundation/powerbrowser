---
phase: 08-installer-hardening-canonical-rename
plan: "05"
subsystem: installer
tags: [packaging-hosts, msix, dmg, mar, release-build, rebase-drill, verify-platform, branding-gate]

# Dependency graph
requires:
  - phase: 08-installer-hardening-canonical-rename
    provides: [08-04 updater enablement plus Linux MAR hop plus NSIS-on-Nix build proof]
provides:
  - Named packaging hosts with capability record (nix-linux reachable, pkg-win11 plus pkg-macos staged with unblocks)
  - Linux install matrix green with alongside-stock-Firefox proof plus re-proven hop
  - Fresh objdir-release build with release rows green and ledger 10 closed
  - Live ESR rebase drill to 153.2.0esr green with restore to the pinned tag
  - verify-branding.mjs NAME-01 re-scope (per-node token-boundary plus derived legal-notice exemption)
affects: [08-06 phase closeout, PKG-01 Windows/macOS proofs, rebase-adoption to 153.2.0esr, smoke-theia flake follow-up]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 6100
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [per-text-node token-boundary assertion, derived legal-notice exemption, drill-then-restore rebase discipline]

key-files:
  created: []
  modified: [docs/BUILD.md, scripts/verify-branding.mjs, .planning/WINDOWS.md]

key-decisions:
  - "Staged-unexecuted, never green without logs: pkg-win11/pkg-macos cells record exact errors plus operator unblocks"
  - "Drill then restore: the live rebase proves the path, the pin decides the tree; adoption is a separate task with rebuilds"
  - "Drill target 153.2.0esr (newest in-series tag); 155/156 are different trains, out of scope"
  - "verify-branding identifier assertion re-scoped per-node (textContent concatenation is not a leak); stock-identity exempts derived legal notices"
  - "smoke-theia gate-2 red left untouched: pass-fail-pass with no tree delta is transient, and the backend is out of this task's scope"

patterns-established:
  - "Per-text-node token-boundary assertion: TreeWalker SHOW_TEXT keeps node-boundary concatenation separable from single-node leaks"
  - "Derived legal-notice exemption: strip generator-owned notice strings read at check time before stock-identity scans"
  - "Drill-then-restore: run the live rebase for real, record evidence, restore the pinned tag through the same tooling so pin, tree, and proofs agree"

requirements-completed: [PKG-01, PKG-02, BLD-01, UPD-03]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "BUILD.md host-capability record names pkg-win11 and pkg-macos with versions, makensis 3.12, and reachable/staged-unexecuted states"
    requirement: "PKG-01"
    verification:
      - kind: unit
        ref: "task-1 automated grep chain#pkg-win11=2, pkg-macos=2, makensis 3.12, reachability states, numbered OS/SDK lines"
        status: pass
    human_judgment: true
    rationale: "Prose accuracy (provisioning errors, unblock commands) needs a human read; the grep chain proves shape, not truth"
  - id: D2
    description: "Linux install matrix green live: packaged-tarball install, headless launch, alongside stock Firefox with no collision, uninstall with empty home diff"
    requirement: "PKG-01"
    verification:
      - kind: integration
        ref: ".mozbuild/matrix/run-matrix.sh#MATRIX LINUX CELLS: ALL PASS (L1 install, L2 launch 25s, L3 20146-byte stock screenshot with fork alive, L4 no-residue)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Linux N (153.1.0) to N-plus-1 (153.1.1) hop re-proven with hash pins, buildID pairs, fork-server log, zero-Mozilla-host sift"
    requirement: "PKG-02"
    verification:
      - kind: integration
        ref: "scripts/verify-platform.sh --only mar-update-hop#PASS on current tree 2026-09-05"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only installer-build-proof#PASS on current tree 2026-09-05"
        status: pass
    human_judgment: false
  - id: D4
    description: "Windows and macOS matrix cells plus MSIX/DMG artifacts staged-unexecuted with exact errors and operator unblocks"
    requirement: "PKG-01"
    verification: []
    human_judgment: true
    rationale: "No provisioned host exists; cells must stay staged until pkg-win11/pkg-macos are built, and artifacts need real runs on those hosts"
  - id: D5
    description: "Fresh objdir-release build with release rows green and ledger 10 closed"
    requirement: "BLD-01"
    verification:
      - kind: unit
        ref: "mach build objdir-release#finished successfully in 54m40s, updater present, Name=powerbrowser Version=153.1.0 BuildID=20260904213953"
        status: pass
      - kind: integration
        ref: "node scripts/verify-branding-identity.mjs --variant release#all six surfaces PASS"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only branding-variant-divergence#PASS"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --gate#PASS with ledger-10 exclusions disarmed"
        status: pass
    human_judgment: false
  - id: D6
    description: "Live ESR rebase drill to FIREFOX_153_2_0esr_RELEASE green with pinned-tag restore"
    requirement: "UPD-03"
    verification:
      - kind: unit
        ref: "scripts/rebase-upstream.sh --tag FIREFOX_153_2_0esr_RELEASE#PASS (replay non-vacuous, surface clean, residue 146+460674, classifier fully-applied, overlay resolves)"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only installer-schema#PASS over the rebased tree"
        status: pass
      - kind: unit
        ref: "toolchain-baseline.sh diff#empty against committed baseline at the new tag"
        status: pass
    human_judgment: false
  - id: D7
    description: "verify-branding.mjs live gate re-scoped for NAME-01, green on all four surfaces"
    requirement: "NAME-01"
    verification:
      - kind: unit
        ref: "predicate demo#live nodes green, PowerBrowserDev/myPowerBrowser/PowerBrowserX leaks red, standalone display forms green"
        status: pass
      - kind: unit
        ref: "exemption demo#live about remainder clean after notice strip, stray Theia still red"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only verify-branding#PASS title, favicon, welcome, about"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --gate#PASS every registered check green"
        status: pass
    human_judgment: false

# Metrics
duration: 3h50min wall (builds unattended; active work ~1h20m)
completed: 2026-09-05
status: complete
---

# Phase 08 Plan 05: Real Hosts, Matrix, Release, and Rebase Drill Summary

**Named packaging hosts with staged win/mac unblocks, a live-green Linux install matrix with alongside proof, a fresh 54-minute release build closing ledger 10, a green live rebase drill to 153.2.0esr with restore, and a NAME-01 re-scope of the live branding gate -- full --gate green.**

## Performance

- **Duration:** 3h50m wall (release build 54m40s, dev clobber rebuild ~26m, drill plus restore ~30m, three --gate runs ~16m total; active work ~1h20m)
- **Started:** 2026-09-05T03:25:00Z
- **Completed:** 2026-09-05T07:15:00Z
- **Tasks:** 3 completed
- **Files modified:** 3 tracked (docs/BUILD.md, scripts/verify-branding.mjs, .planning/WINDOWS.md) plus untracked proof tooling/logs under gitignored `.mozbuild/`

## Accomplishments
- BUILD.md names pkg-win11 and pkg-macos with required-spec versions, makensis 3.12 re-verified, and reachable/staged-unexecuted states; staged rows carry exact provisioning errors plus operator unblock commands, never silent skips
- Linux matrix cells ran live and green: packaged-tarball install (Vendor=DeBIOS, Name=powerbrowser, 153.1.0/20260904184538), 25s headless launch, stock-firefox-155 screenshot alongside the live fork build (no remoting/profile collision), uninstall with an empty home diff
- Release objdir-release built fresh with the same updater flag set as dev; both release rows green; ledger 10 closed (2 open / 19 fixed, machine-consistent)
- Live rebase drill to FIREFOX_153_2_0esr_RELEASE passed every script gate plus installer-schema over the rebased tree plus a clean toolchain-baseline diff; tree restored to the pinned tag so pin, tree, and proofs agree
- verify-branding.mjs re-scoped for the canonical name (per-text-node token-boundary identifier check plus derived legal-notice exemption) with both predicates proven red and green; full --gate green

## Task Commits

Each task was committed atomically:

1. **Task 1: Name and reach the packaging hosts with a capability record** - `ebb99d5` (docs)
2. **Task 2: Build MSIX and DMG on their hosts and run the per-OS matrix with update hops** - `0440818` (feat)
3. **Task 3: Pass the release build with release rows and run the ESR rebase drill** - `05ef20e` (feat)

**Plan metadata:** this close-out (docs: complete plan)

## Files Created/Modified
- `docs/BUILD.md` - Host-capability section (task 1), per-OS matrix with hop evidence (task 2), release timing row plus live-drill outcome (task 3)
- `scripts/verify-branding.mjs` - NAME-01 re-scope: per-text-node token-boundary identifier assertion plus derived legal-notice exemption for the stock-identity assertion (task 3, Rules 1+3)
- `.planning/WINDOWS.md` - Ledger 10 closed with gate evidence (table plus JSON plus counts 2 open / 19 fixed, consistency-parsed)
- `.mozbuild/matrix/run-matrix.sh` - Created (untracked proof tooling): Linux install/launch/alongside/uninstall driver
- `.mozbuild/release-build-0805.log`, `.mozbuild/dev-rebuild-0805.log`, `.mozbuild/rebase-drill-0805.log`, `.mozbuild/rebase-restore-0805.log`, `.mozbuild/gate-0805*.log`, `.mozbuild/matrix/*` - Untracked proof evidence (gitignored, same standing as 08-04's drive-hop.py)

## Decisions Made
- Staged-unexecuted, never green without logs: with no reachable Windows/macOS guest, every win/mac cell records the exact provisioning error plus the operator unblock command per the plan's falsification branch. No MSIX/DMG attempt from Linux (the pinned tree's own makeappx/hdiutil requirements are the authority).
- Drill then restore: the live rebase proves the UPD-03 path, but the pin decides the tree. Adopting 153.2.0esr (pin move plus full tier-3 rebuilds of every objdir) is a future rebase-adoption task, not part of a drill -- restoring keeps the release proof, the hop evidence, and all gates valid.
- Drill target 153.2.0esr: newest tag in the 153 ESR series newer than the pinned 153_1_0esr_RELEASE (verified via ls-remote). The 155/156 tags are different release trains, out of scope for this drill.
- verify-branding identifier assertion re-scoped per text node: raw textContent flattens sibling nodes separator-free ("PowerBrowser"+"Version 1.74.1" reads as one token), so only a single text node adjoining the identifier to alphanumerics is a leak. Follows the inventory's own identifier_form_reason principle.
- Stock-identity assertion exempts derived legal notices: the 06-04 Eclipse attribution is required legal copy; the exemption strips the exact generated notice strings at check time, so notice edits follow automatically and stray Theia/Eclipse text still goes red.
- smoke-theia gate-2 red left untouched: PASS (gate 1), FAIL (gate 2, null-address FATAL), PASS (standalone minutes later) with zero tree delta to theia/ is transient by the operational definition. The backend boot path is outside this task's causation and scope; recorded as a follow-up, not fixed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Matrix driver leaked the fork LD_LIBRARY_PATH into the stock-firefox launch**
- **Found during:** Task 2 (first alongside run: stock `libxul.so` refused the fork `libnss3.so`, `NSS_3.126 not found`)
- **Issue:** The driver exported the staged-prefix LD_LIBRARY_PATH for the fork binary; the stock invocation inherited it and loaded the wrong NSS.
- **Fix:** Stock launch runs under `env -u LD_LIBRARY_PATH`. Test-side only, no product change.
- **Files modified:** .mozbuild/matrix/run-matrix.sh (untracked)
- **Verification:** Alongside cell green on re-run (20146-byte stock screenshot, fork still alive)
- **Committed in:** n/a (untracked proof tooling; procedure recorded in BUILD.md)

**2. [Rule 3 - Blocking] Stock firefox 155 requires a pre-created --profile dir**
- **Found during:** Task 2 (second alongside run: `Could not find profile folder`)
- **Issue:** The profile dirs were removed at driver start and never recreated; the fork base auto-creates, stock 155 does not.
- **Fix:** Both test profiles pre-created with mkdir -p. Test-side only.
- **Files modified:** .mozbuild/matrix/run-matrix.sh (untracked)
- **Verification:** Full matrix ALL PASS on re-run plus empty home diff
- **Committed in:** n/a (untracked proof tooling)

**3. [Rule 1 - Bug] verify-branding.mjs identifier assertion jointly unsatisfiable post-NAME-01**
- **Found during:** Task 3 (first --gate: welcome widget red carrying the legitimate display value)
- **Issue:** `assertDisplayForm` required the text to both include DISPLAY_FORM and exclude IDENTIFIER_FORM, but both are now "PowerBrowser" -- red on every correct tree. Deferred twice (08-01, 08-02) pending a plan that runs the live Theia check; this plan does.
- **Fix:** Per-text-node token-boundary check via TreeWalker SHOW_TEXT (node concatenation passes, single-node adjoining goes red). Predicate proven: live nodes green; PowerBrowserDev, myPowerBrowser, PowerBrowserX red.
- **Files modified:** scripts/verify-branding.mjs
- **Verification:** Live row PASS on all four surfaces; full --gate green
- **Committed in:** 05ef20e

**4. [Rule 1 - Bug] verify-branding.mjs stock-identity assertion contradicts required legal copy**
- **Found during:** Task 3 (second live run: about dialog red on the 06-04 Eclipse attribution notice)
- **Issue:** The blanket /Theia|Eclipse/i absence has been unsatisfiable since 06-04 added the Eclipse attribution as required legal copy. Same deferred re-scope, same function.
- **Fix:** Strip the exact legal-notice strings read at check time from generated/theia-branding.json before the scan. Proven: live remainder clean, stray "Built with Theia" still red.
- **Files modified:** scripts/verify-branding.mjs
- **Verification:** Live row PASS; full --gate green
- **Committed in:** 05ef20e

**5. [Rule 3 - Blocking] Drill/restore cycle clobbered the dev objdir**
- **Found during:** Task 3 (first --gate: smoke-firefox red, "CLOBBER file has been updated")
- **Issue:** rm -rf plus re-clone changed every upstream mtime twice, invalidating objdir/ incrementals. Direct consequence of the plan-ordered drill, not a product defect.
- **Fix:** Sanctioned `touch objdir/CLOBBER` plus full dev rebuild (finished successfully in ~26m, fresh BuildID=20260904233400). Note: an early rebuild attempt exited on the clobber guard while a self-matching `pgrep -f "mach build"` falsely reported it running -- repolled with a self-excluding pattern.
- **Files modified:** none tracked (objdir/ is build spill)
- **Verification:** smoke-firefox PASS; release rows unaffected (read-only over objdir-release)
- **Committed in:** n/a (build artifact, no tracked change)

---

**Total deviations:** 5 auto-fixed (2 bug, 3 blocking-class including test-harness pair)
**Impact on plan:** All required for the plan's own gates to hold. No scope creep beyond the deferred live-gate re-scope the plan's --gate verify demanded; no product surface changed except the checker; no VM provisioned; no production signing touched.

## Issues Encountered
- `pgrep -f "mach build"` self-matches the polling command line and reported a dead build as running for ~25 min. Repoll with `pgrep -f "[m]ach build"`. Minor time loss, no consequence (the clobber refusal is fail-loud).
- A concurrent `956c906 docs: capture tab-SQL exploration` commit landed mid-plan; task commits stack on top cleanly (disjoint files). Noted so the file list above is not confused with it.
- smoke-theia flaked once across three runs (PASS in gate 1, null-address FATAL in gate 2, PASS standalone): transient, pre-existing, out of scope -- left untouched, recorded as a follow-up below.

## User Setup Required
None - no external service configuration required. (`updates.powerbrowser.org` still does not resolve; hops serve over loopback. Production signing certs explicitly not procured per T-08-05a.)

## Known Stubs
None - no stubs introduced. Changed hunks checked for TODO/FIXME/placeholder patterns; no matches. The staged matrix cells are explicit staged-unexecuted records with unblocks, not stubs.

## Threat Flags
None - no new trust-boundary surface beyond the plan's register: host evidence plus matrix logs land in T-08-05a (accept, test-sign posture recorded in BUILD.md); the Linux hop re-proof lands in T-08-05b (mitigate, same fork-key plus hash-pin plus zero-Mozilla-host evidence); the drill lands in T-08-05c (mitigate, residue scans both trees plus installer-schema green plus clean toolchain diff); no registry installs ran (T-08-SC).

## Follow-ups for Later Plans (not blockers)
- Provision pkg-win11 (privileged operator: NAT network, domain from the verified 2026-03-07 media, unattended install, guest agent plus SDK 10.0 plus NSIS 3.12, Windows dist build) and pkg-macos (real Mac or lawful VM with Xcode CLT); then run the staged MSIX/DMG builds, per-OS matrix cells, and per-OS hops. Exact commands and evidence live in the BUILD.md capability record.
- Adopting FIREFOX_153_2_0esr_RELEASE (pin move plus full tier-3 rebuilds of objdir, objdir-nplus1, objdir-release) is a rebase-adoption task, not a drill rerun -- the drill log is `.mozbuild/rebase-drill-0805.log`.
- smoke-theia flaked once (null-address FATAL in gate 2, green alone minutes later with no tree delta). If it recurs, the backend's onStart-vs-listen ordering under `applications/browser start` (vs the root `yarn start` theia_app_up uses) is the place to look; consider printing the bind error alongside the FATAL.
- Production signing and notarization (RESEARCH open question 1) stays the later decision; matrix proofs will run test-signed per the recorded posture.
- `updates.powerbrowser.org` needs real static hosting before any non-loopback hop.

## Next Phase Readiness
- Release tree proven with both release rows green and ledger 10 closed; the --gate exclusions for entry 10 are disarmed by the ledger flip itself.
- Update story proven per reachable OS with hash-pinned descriptors and the zero-Mozilla-host sift; per-OS expansion waits only on hosts.
- Rebase path drilled live end to end with a clean toolchain signal; the next ESR tag in-series can ride the same command.
- No blockers. No human-verification items raised by this plan (all checkpoints auto-approved; no blocking-human gates hit -- staged cells are the plan's own falsification branch, not checkpoints).

## Self-Check: PASSED
- Files: `docs/BUILD.md` (capability plus matrix plus drill sections), `scripts/verify-branding.mjs` (re-scope), `.planning/WINDOWS.md` (10 fixed, counts 2/19/21) all present
- Commits: `ebb99d5`, `0440818`, `05ef20e` all in `git log`
- Verifies: task-1 grep chain green, both proof rows green (twice), matrix ALL PASS, release rows green, drill PASS, `--gate` green

---
*Phase: 08-installer-hardening-canonical-rename*
*Completed: 2026-09-05*
