---
phase: 20-non-gui-gaps
verified: 2026-10-17T23:47:32Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - ".github/workflows/verify.yml"
  - ".planning/phases/20-non-gui-gaps/20-01-PLAN.md"
  - ".planning/phases/20-non-gui-gaps/20-01-SUMMARY.md"
  - ".planning/phases/20-non-gui-gaps/20-02-PLAN.md"
  - ".planning/phases/20-non-gui-gaps/20-02-SUMMARY.md"
  - ".planning/phases/20-non-gui-gaps/20-03-PLAN.md"
  - ".planning/phases/20-non-gui-gaps/20-03-SUMMARY.md"
  - ".planning/phases/20-non-gui-gaps/20-04-PLAN.md"
  - ".planning/phases/20-non-gui-gaps/20-04-SUMMARY.md"
  - ".planning/phases/20-non-gui-gaps/20-05-PLAN.md"
  - ".planning/phases/20-non-gui-gaps/20-05-SUMMARY.md"
  - "CLAUDE.md"
  - "docs/BUILD.md"
  - "docs/non-gui/decisions.md"
  - "docs/non-gui/quick-baseline.txt"
  - "scripts/fresh-clone-verify.py"
  - "scripts/generate.mjs"
  - "scripts/verify-dependent-window-content.mjs"
  - "scripts/verify-downstream-fixture.mjs"
  - "scripts/verify-group-channel.mjs"
  - "scripts/verify-ng-087-loose-position-across-restart.mjs"
  - "scripts/verify-ng-088-group-order-across-restart.mjs"
  - "scripts/verify-planning-paths.mjs"
  - "scripts/verify-platform.sh"
  - "scripts/verify-sql-store-soak.mjs"
  - "scripts/verify-strip-spike-verdict.mjs"
  - "scripts/verify-theia-fresh-clone-build.sh"
covered_digest: "v3:sha256:b716152ec1089f475a952e7f6fb14328b3de9edc6a2480d61abe01b1808fecbe"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "WR-06/WR-07/WR-08: the NG-087/NG-088 checks have an unbounded reader-SQL regex, leak their --at stage dir on a red run, and ignore unknown arguments"
    addressed_in: "needs Chris re-lock (hash-locked files)"
    evidence: "Both files are in check_locks at facaba2 (ledger v391); sha256 at HEAD equals the lock (3d001309..., 07ae8751...). 20-REVIEW-FIX.md skipped all three for that reason. The verifier's own --at b9412fa runs reproduced WR-07: ng087-at-* and ng088-at-* dirs were left in the TMPDIR it set. None changes a verdict today: both rows, both self-tests and both --at reds behave as recorded."
  - truth: "WR-05 residue: verify-strip-spike-verdict.mjs:76-95 and verify-dependent-window-content.mjs:60-81 keep a resolveRecord archive scan built from split join() arguments, which planning-paths cannot see"
    addressed_in: "Chris's decision (left open by 20-REVIEW-FIX.md)"
    evidence: "20-02-PLAN.md task 2 step 3 keeps resolveRecord on purpose. Its first branch reads the archived literal, which planning-paths resolves. On a miss it throws naming the path it looked for (strip-spike:94, dependent-window:78), so SC5's 'or the check fails naming the missing path' holds. planning-paths now states its contiguous-literal scope in its PASS line."
  - truth: "The fresh-clone build PASS is at b528590; Phase 21 commits c5812c9 and 0b6ae33 changed theia/extensions/modes and a comment in tab-query-service.ts after it"
    addressed_in: "next full-tier run / Phase 25 (NG-074, CI green on main)"
    evidence: "Phase 20's own code is unchanged in the Theia tree since b528590 (git diff b528590 HEAD -- theia/ lists only the two 21-02 commits). The row that would catch a regression exists and is full-tier. CI's identical step runs on push (Phase 25)."
  - truth: "IN-04: R33's clone-red list in decisions.md does not name group-channel and group-channel-self-test, which read upstream/ and so are red in a clone without upstream/"
    addressed_in: "docs follow-up"
    evidence: "Documentation only. Both rows PASS in this checkout."
  - truth: "Stale plant counts: GUI-DEFECTS.md item 13, the G-14.1.1-10 closed_by and 20-VALIDATION.md say 12 plants and 7 planning-paths cases; after 20-REVIEW-FIX the self-tests run 15 plants and 9 cases"
    addressed_in: "docs follow-up"
    evidence: "The verifier ran both self-tests: 'clean tree green, 15 plants red' and '9 cases'. The counts went up, so the records understate the coverage. They do not overstate it."
---

# Phase 20: Non-GUI Gaps Verification Report

**Phase Goal:** The remaining non-GUI gaps are closed on the final dependency set, each by a check that can go red or by a recorded result
**Verified:** 2026-10-17T23:47:32Z
**Status:** passed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PLAT-01: a build from a clean checkout passes, including `yarn build:extensions` (G-14.1.1-9) | VERIFIED (recorded result, row not re-run by instruction) | logs/fresh-clone-20-05.log: a `git clone` of b528590 into `fresh-clone-verify-*` ran the verify.yml:83 run: value. The log shows frozen install, drivelist `gyp info ok`, the 7-entry `build:extensions` chain (7 `tsc -b` lines, ending in chrome-bar), `theia build --app-target=browser`, then `fresh-clone-verify: ok`, `theia-fresh-clone-build: PASS`, `PHASE20_EXIT=0`. scripts/fresh-clone-verify.py clones into a mkdtemp, runs `sh -c` there, kills the process group on timeout and removes the clone. The clone has no `lib/` and no tsbuildinfo, so `tsc -b` cannot report a stale "up to date" |
| 2 | The PLAT-01 row can go red and cannot drift from CI | VERIFIED | The script reads the step "Install and build the Theia workspace" from verify.yml at check time (`extract_cmd`). Verifier ran the cheap guards at HEAD: a spaced TMPDIR gives `FAIL -- TMPDIR contains a space` (exit 1); `--workflow /dev/null` gives `FAIL -- broken instrument: verify.yml has no single-line run:` (exit 1); a trailing `--workflow` gives `FAIL -- --workflow needs a file` (exit 2, the WR-01 fix). logs/fresh-clone-self-test-20-05.log: the TMPDIR and step-removed plants are red; in-clone baseline green; P1 red naming `@powerbrowser/token-gate/lib/node/powerbrowser-env`, P2 red naming `@powerbrowser/tab-uris/lib/browser/browser-tab-uri`, P3 red naming `web-tab.css`. Registry :4925-4926 is in the full-tier `CHECKS+=` block, not in `--quick` |
| 3 | SC2 / PLAT-02: a `--quick` group-channel row exists, and its self-test goes red on each planted fault (G-14.1.1-10) | VERIFIED | Registry :3768-3769 (inside the `--quick` array). Verifier `--only group-channel`: PASS, "7 dispatch sites in 5 frontend files, 2 child CustomEvents, request PowerBrowserGroupRequest, wantUntrusted set, child scheme resource in upstream set {moz-src, resource}". Verifier `--only group-channel-self-test`: PASS, "clean tree green, 15 plants red" (the 12 planned plants plus 13-15 from WR-03/WR-04). The allowed schemes come from upstream DesktopActorRegistry.sys.mjs at check time. gsd verify.key-links 2/2 |
| 4 | G-14.1.1-10 is closed in every record | VERIFIED | 14.1.1-UAT.md: G-14.1.1-10 `status: fixed`, closed_by fd29ac9 and 7f6f732 (both resolve with `git cat-file -t` = commit). GUI-DEFECTS.md item 13 is CONFIRMED FIXED with its reproducer. FEATURES.md:61 now reads "there is no `cloneInto`" |
| 5 | SC3 / PLAT-03: the schema v3/v4 work has ledger rows carrying Chris's approval, and the ledger checksums pass | VERIFIED | `ledger-report.py`: NG-087 done, NG-088 done; 88 rows, done=55, deferred-approved=9, dropped=24, due=0. History v379-v390: add, test_ref, `check-fail` (exit 1, "unknown kind setTabPosition" / "unknown kind setGroupOrder", head b3e8883), evidence, done. Chris's acceptance before the add: "accept" (20-04-SUMMARY "Chris's acceptance"). Chris's lock: v391 `lock-checks` at facaba2, his pasted command quoted in 20-05-SUMMARY "Checkpoint replies", committed in 44e44fb. check_locks (REQUIREMENTS.json:1210-1211) hashes equal `sha256sum` of both files at HEAD. Each check file has exactly one commit (b3e8883). `check-ledger.py` and `phase-gate.py` print nothing; the session hook reports `checksums ok (ledger_version 391)`. `plan-gate.py --phase 20`: "plan gate passed: 2/2 IDs cited" |
| 6 | NG-087 and NG-088 pass at HEAD and are honestly red against the pre-v3 writer | VERIFIED | Verifier `--only` runs: ng-087 PASS (loose terminal keeps (40, 60); loose web row keeps (300, 200) as closed-tab history and gets it back), its self-test "4 plants red"; ng-088 PASS (hand order [b, web, a] from the getGroupTabs SQL), its self-test "3 plants red". Verifier `--at b9412fa260d4...`: both exit 1 on "handleGroupMutation: unknown kind setTabPosition" / "setGroupOrder", the writer's refusal, not a git-show failure. These are the same outputs the ledger recorded |
| 7 | SC4 / PLAT-04 cause A: inkscape children never join the session bus | VERIFIED | generate.mjs:2926 `RASTER_ENV = Object.freeze({ ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' })`. There is exactly one `spawnSync('inkscape'` (:2991), and it passes `env: RASTER_ENV` (:2996). `rasterBusFailures` (:2971-2975) checks both the env value and the spawn site's own text. `generate-self-test` PASS in the verifier's `--quick`; 20-01-SUMMARY quotes the four `concurrent-raster` cases, including 18 concurrent exports at 32x32 |
| 8 | SC4 / PLAT-04 cause B: the fixture harness never reads or writes `generated/` | VERIFIED | verify-downstream-fixture.mjs:185 throws "runGenerate needs a private out dir -- ... shared generated/ tree"; :191 passes `--out outDir` to every child. `git grep "REPO_ROOT, 'generated'"` over the harness prints nothing. Self-test cases `shared-tree-refused` (:680) and `out-dir-isolation` (:700). logs/sampler-pre-20-01.log saw six different MOZ_APP_DISPLAYNAME values in generated/branding/dev/configure.sh during a fixture run; sampler-post saw only "PowerBrowser Dev". logs/conc-20-01.log: `PHASE20_CONC_EXIT=0` for all four rows started together. R28 in decisions.md:80 records both causes and the fix |
| 9 | SC4: passing runs are recorded in the host shell and in `.#theia`, before and after | VERIFIED | logs/pre-host-generate-check-{1,2,3}, pre-theia-generate-check-{1,2,3}, post-host-*, post-theia-* and the four fixture logs all end in PASS. The concurrent-red pre-host logs are kept under `-concurrent-red` names, which is the reproduction. Verifier `--only generate-check`: PASS, "all 53 generated file(s) match configuration.toml" |
| 10 | SC5 / PLAT-05: every verify-script path into the planning tree resolves to its archived location, or the check fails naming the missing path | VERIFIED | `git grep -n '\.planning/phases/' -- scripts .github` prints nothing. Verifier `--only planning-paths`: PASS, "12 references in 166 tracked files ... resolve". Its self-test: "9 cases". logs/planning-paths-pre-20-02.log shows the row red on exactly the five live-phase literals, each named as file:line. The fallback blocks in verify-platform.sh and the soak script are deleted (743bb59). The remaining `resolveRecord` scans throw naming the path they looked for (see Deferred) |
| 11 | docs/BUILD.md Tier 1 carries the startup-cache rule, and CLAUDE.md names the archived 01-UI-SPEC | VERIFIED | BUILD.md:513-526, directly before "### Tier 2": "Chrome-side JS needs a startup-cache purge, or the edit silently does not run", followed by `rm -rf objdir/tmp/profile-default/startupCache` and `MOZ_PURGE_CACHES=1 ./objdir/dist/bin/powerbrowser -purgecaches`. CLAUDE.md now cites `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-UI-SPEC.md` (258b276, Chris: "claude-md ok (Recommended)") |
| 12 | G-14.1.1-9 is closed in every record with resolving hashes | VERIFIED | 14.1.1-UAT.md: `status: fixed`; closed_by names cd8c4c1, b991b2d, 32b144d, 4ce6f34 and "theia-fresh-clone-build PASS at b528590". All five resolve with `git cat-file -t`. GUI-DEFECTS.md item 11 is CONFIRMED FIXED and states what the PASS does and does not assert. FEATURES.md:39 describes the chain ending in chrome-bar |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Deferred Items

None of these breaks the goal. Each was checked against the tree.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | WR-06/07/08 in the NG-087/088 checks | Chris re-lock | Files are hash-locked. WR-07's stage-dir leak was reproduced by the verifier |
| 2 | Split-join `resolveRecord` archive scans (WR-05 residue) | Chris's decision | Kept by plan. They fail loudly naming the path |
| 3 | Fresh-clone PASS predates the two 21-02 Theia commits | Next full run / Phase 25 (NG-074) | Phase 20's Theia code is unchanged since b528590 |
| 4 | R33 clone-red list lacks the group-channel rows (IN-04) | Docs follow-up | Doc only |
| 5 | 12 plants / 7 cases in three records, now 15 / 9 | Docs follow-up | Understates the coverage |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/generate.mjs` | RASTER_ENV, `--out`, concurrent-raster self-test | VERIFIED | gsd verify.artifacts 3/3 for 20-01. WR-02 refuses an empty or in-project `--out` (9d3f3d5) |
| `scripts/verify-downstream-fixture.mjs` | Private-dir harness plus two plants | VERIFIED | Truth 8 |
| `docs/non-gui/decisions.md` | R28 with both causes and the fix | VERIFIED | :80 |
| `scripts/verify-planning-paths.mjs` | Derived row plus self-test | VERIFIED | Registry :4595-4596. PASS / 9 cases |
| `scripts/verify-group-channel.mjs` | D0-D6 plus plant self-test | VERIFIED | Registry :3768-3769. PASS / 15 plants |
| `scripts/verify-ng-087-loose-position-across-restart.mjs` | v3 check with `--at` and self-test | VERIFIED | Registry :3881-3882. Locked |
| `scripts/verify-ng-088-group-order-across-restart.mjs` | v4 check with `--at` and self-test | VERIFIED | Registry :3883-3884. Locked |
| `ledger/REQUIREMENTS.json` | NG-087/088 done, check_locks | VERIFIED | Read through ledger-report and one plain grep only |
| `scripts/verify-theia-fresh-clone-build.sh` | Full-tier row, self-test, plant mode | VERIFIED | Registry :4925-4926 (full tier only) |
| `docs/BUILD.md` | `-purgecaches` line | VERIFIED | :520 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| generate.mjs iconPngBytes | inkscape | `env: RASTER_ENV` | WIRED | The gsd tool could not parse a symbol in `from:`. Checked by hand: one spawn site, :2991-2996 |
| verify-downstream-fixture.mjs runGenerate | generate.mjs `--out` | argv | WIRED | :185 throws without a dir, :191 passes it |
| verify-planning-paths.mjs | `git ls-files -z` | scan input and resolution target | WIRED | gsd 1/1 |
| verify-group-channel.mjs | upstream DesktopActorRegistry.sys.mjs, extension sources | derivation at check time | WIRED | gsd 2/2 |
| ng-087 / ng-088 checks | tab-store-fakes `freshApi`, tab-query-service.ts getGroupTabs | real writer, reader SQL parsed at check time | WIRED | gsd 2/2. The rows PASS at HEAD after 21-02's comment edit in tab-query-service.ts |
| fresh-clone script | verify.yml step, fresh-clone-verify.py | run: value read at check time | WIRED | gsd 2/2 |
| all `--quick` rows | verify-platform.sh `--quick` | registry | WIRED | All 16 phase-20 `--quick` rows appear PASS in the verifier's `--quick` summary |

### Data-Flow Trace (Level 4)

Not applicable. The phase adds checks and records. It renders no dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Commit gate | `scripts/verify-platform.sh --quick` (once) | 128 PASS. FAIL set = gui08-canvas-geometry, -self-test, gui08-panorama-copy, -self-test. `comm -13` against quick-baseline.txt is empty | PASS (baseline) |
| Generator check | `--only generate-check` | PASS, 53 files | PASS |
| Planning paths | `--only planning-paths` (+ self-test) | PASS, 12 refs / PASS, 9 cases | PASS |
| Group channel | `--only group-channel` (+ self-test) | PASS, 7 sites in 5 files / PASS, 15 plants | PASS |
| NG-087 | `--only ng-087-...` (+ self-test), `--at b9412fa` | PASS / 4 plants red / exit 1, unknown kind setTabPosition | PASS |
| NG-088 | `--only ng-088-...` (+ self-test), `--at b9412fa` | PASS / 3 plants red / exit 1, unknown kind setGroupOrder | PASS |
| Node majors | `--only node-major-agreement` (+ self-test) | PASS (24 / v24.19.0 / >=24) / 7 cases | PASS |
| Fresh-clone cheap guards | spaced TMPDIR, `--workflow /dev/null`, trailing `--workflow` | exit 1 / 1 / 2 with their messages | PASS |
| Fresh-clone build | full-tier row | Not run (instruction). logs/fresh-clone-20-05.log and fresh-clone-self-test-20-05.log: exit 0 | PASS (recorded) |
| Ledger | `check-ledger.py`, `phase-gate.py --root .` | no output, exit 0 | PASS |
| Plan gate | `plan-gate.py --phase 20 --plans ...` | plan gate passed: 2/2 IDs cited | PASS |
| Brand residue | `node scripts/scan-brand-residue.mjs` | PASS, 356 files | PASS |

### Probe Execution

Not applicable. The phase declares no `scripts/*/tests/probe-*.sh`. Its verification is the registry rows above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAT-01 | 20-05 | A build from a clean checkout passes (G-14.1.1-9) | SATISFIED | Truths 1, 2, 12 |
| PLAT-02 | 20-03 | Group-channel `--quick` check with a planted-fault self-test (G-14.1.1-10) | SATISFIED | Truths 3, 4 |
| PLAT-03 | 20-04, 20-05 | Schema v3/v4 ledger rows, approved by Chris | SATISFIED | Truths 5, 6 |
| PLAT-04 | 20-01 | `generate-check` reproduced and fixed, passing runs recorded | SATISFIED | Truths 7, 8, 9 |
| PLAT-05 | 20-02 | Every verify-script planning path resolves to its archive, or fails loudly | SATISFIED | Truth 10 |

No orphaned requirements. NG-074 and NG-084 are cited by every plan for the plan gate and stay deferred-approved (owner chris, phase 15), as each plan's `ledger_note` says. REQUIREMENTS.md still shows PLAT-01..05 as `[ ]` / Pending. Marking them is the phase-close step, so this is not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (all phase-modified scripts and docs) | - | TBD/FIXME/XXX/TODO/HACK | - | None found, including in the phase's added lines of verify-platform.sh |
| `scripts/verify-ng-08{7,8}-*.mjs` | `--at` path | `process.exit(1)` inside `try` skips `finally` (WR-07) | Info | Reproduced: one stage dir per red run. Locked file. Deferred item 1 |
| `docs/BUILD.md` | 519 | `rm` targets the `mach run` profile while the launch line uses the default profile (IN-05) | Info | `-purgecaches` and `MOZ_PURGE_CACHES=1` still do the purge, so the rule holds |
| `scripts/generate.mjs` | 2932 | Raster-bus guard matches only the `spawnSync('inkscape'` spelling (IN-01) | Info | One spawn site today. The self-test spawn at :4745 inherits RASTER_ENV from its parent |
| `.planning/research/FEATURES.md` | Acceptance bullet | Still mentions deleting every `lib/` (20-05-SUMMARY "Not covered") | Info | Planning doc |

### Human Verification Required

None. Chris's required actions are on record. He accepted the NG-087/088 texts and the red-against-b9412fa method ("accept", 20-04-SUMMARY). He ran the lock in his own terminal (his pasted command, 20-05-SUMMARY; ledger v391; commit 44e44fb). He chose "claude-md ok (Recommended)". 20-REVIEW-FIX.md marks WR-03 and WR-05 as "requires human verification". The verifier ran both self-tests (15 plants red, 9 cases), so the fixes behave as described. The open WR-05 choice is a design decision, recorded under Deferred, and not a check on this phase's goal.

### Gaps Summary

No gaps. Each of the five non-GUI gaps is closed by a check that can go red, by a recorded result, or by both:

- PLAT-04: reproduced (sampler, concurrent-red logs), fixed for both causes, and guarded by self-tests. Passing runs are recorded in both shells.
- PLAT-05: the planning-paths row and its self-test.
- PLAT-02: the group-channel row and a self-test with 15 plants.
- PLAT-03: two ledger rows, each red against b9412fa and green at HEAD, accepted and locked by Chris.
- PLAT-01: the fresh-clone build row. It PASSED at b528590, and its self-test is red on all five plants.

The verifier's `--quick` FAIL set equals the baseline.

Verifier leftovers, all in the scratchpad: `at-tmp/ng087-at-LE6Hfu` and `at-tmp/ng088-at-IEzO4u` (the WR-07 leak), `quick-verifier-20.log`, `fails.txt`, `gsdrun.sh`. Under /tmp/nix-shell.aDyem4, `nix-develop-3667574-*`, `nix-develop-3667668-*`, `nix-shell.UYnijD` and `nix-shell.DWruij` appeared during this run. They may come from the `--quick` dev-shell rows or from another session.

---

_Verified: 2026-10-17T23:47:32Z_
_Verifier: Claude (gsd-verifier)_
