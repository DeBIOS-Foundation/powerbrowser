---
phase: 19-node-24-react-19-theia-1-76-0
verified: 2026-10-17T20:58:00Z
status: passed
score: 11/11 must-haves verified
covered_files:
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-01-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-01-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-02-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-02-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-03-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-03-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-04-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-04-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-05-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-05-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-06-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-06-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-07-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-07-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-08-PLAN.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-08-SUMMARY.md"
  - ".planning/phases/19-node-24-react-19-theia-1-76-0/19-FAILSET-1.76.txt"
  - "README.md"
  - "configuration.toml"
  - "docs/BUILD.md"
  - "docs/non-gui/decisions.md"
  - "docs/non-gui/quick-baseline.txt"
  - "flake.nix"
  - "powerbrowser/packaging/node-runtime.json"
  - "powerbrowser/shell/TheiaService.sys.mjs"
  - "scripts/lib/firefox-bidi.mjs"
  - "scripts/smoke-theia.sh"
  - "scripts/verify-first-boot-surface.mjs"
  - "scripts/verify-mode-switch-tabs-live.mjs"
  - "scripts/verify-ng-086-theia-react-node.mjs"
  - "scripts/verify-node-major-agreement.mjs"
  - "scripts/verify-platform.sh"
  - "scripts/verify-single-copy-deps.mjs"
  - "theia/applications/browser/package.json"
  - "theia/extensions/branding/package.json"
  - "theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts"
  - "theia/extensions/chrome-bar/package.json"
  - "theia/extensions/customize/package.json"
  - "theia/extensions/modes/package.json"
  - "theia/extensions/tab-uris/package.json"
  - "theia/extensions/telemetry/package.json"
  - "theia/extensions/telemetry/src/browser/telemetry-preferences.ts"
  - "theia/extensions/token-gate/package.json"
  - "theia/package.json"
  - "theia/yarn.lock"
covered_digest: "v3:sha256:bce31bd966b25e82f4d45feff5bf54b369b24c87668386b9a252f50bcddcc964"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "WR-01: the telemetry Settings text says only PowerBrowser telemetry is affected, but at 1.76 the same key also gates upstream and extension telemetry"
    addressed_in: "accepted (locked)"
    evidence: "The wording is locked by 19-UI-SPEC. Chris answered 'telemetry ok (Recommended)' (19-07-SUMMARY.md:72). The live first-boot-surface rows assert the shipped text, default off and resolved level off."
  - truth: "WR-04: the locked NG-086 check file has no self-test plant for six of its FAIL branches"
    addressed_in: "accepted (hash-locked file)"
    evidence: "The file is in check_locks since Chris's re-lock at e0fbf8b (5db8a80). Editing it needs a new re-lock. The ng086 row and its self-test both PASS (verifier run)."
  - truth: "WR-05: NG-086's Node check reads only flake.nix"
    addressed_in: "closed by node-major-agreement (19-08)"
    evidence: "The real risk is a packaged runtime major that differs from the flake. node-major-agreement compares flake.nix nodejs_24, node-runtime.json v24.19.0 and engines.node >=24. The row and its 7-case self-test PASS (verifier run)."
  - truth: "WR-06: there is no Node version probe at launch, so an older Node gets the generic start-failure message"
    addressed_in: "accepted / later work"
    evidence: "19-REVIEW-FIX.md:69-77. The packaged binary is now Node 24 (160652d), so the exposure is limited to a user-set pref or a node found on PATH. nodeMissing copy already asks for Node.js 24 (TheiaService.sys.mjs:43)."
  - truth: ".planning/codebase/STACK.md:24 still says Node.js 22"
    addressed_in: "next /gsd-map-codebase refresh"
    evidence: "deferred-items.md (From 19-06). A planning-only doc, not read by any check."
  - truth: "CLAUDE.md:145 names .planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md, which now lives under .planning/milestones/v1.0-phases/"
    addressed_in: "docs follow-up"
    evidence: "Stale path only. 2700e4c edited the file at its real location."
  - truth: "T-19-26: Chris did not report the optional README fingerprint cross-check of the Node release keyring"
    addressed_in: "accepted residual"
    evidence: "19-SECURITY.md:72 (threats_open: 0). The pin sha256 comes from Chris's gpgv 'Good signature' on SHASUMS256.txt (19-08-SUMMARY.md:49-55; logs/node-pin-19-08.log)."
---

# Phase 19: Node 24, React 19, Theia 1.76.0 Verification Report

**Phase Goal:** The sidecar runs Theia 1.76.0 with React 19 on Node 24, with Theia's AI framework as upstream ships it, and each step is checked live before the next
**Verified:** 2026-10-17T20:58:00Z
**Status:** passed
**Re-verification:** No (initial verification)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: three commits land in order: Node 24 (flake.nix only, flake.lock byte-unchanged, `.#theia` reports Node 24), then React 19.2.8 at Theia 1.74.1, then Theia 1.76.0. Each is followed by `--quick` and a live sidecar start | VERIFIED | `git merge-base --is-ancestor` confirms 4cf6806 < 5800706 < 2700e4c < 160652d. 4cf6806 touches only flake.nix (`nodejs_22` to `nodejs_24`). `git log -- flake.lock` has only the import commit 38a26f5. The verifier ran `nix develop .#theia --command node --version`: `v24.19.0`. 5800706 changes react/react-dom 18.3.1 to 19.2.8 and @types 19.2.18/19.2.7, and leaves 50 `"1.74.1"` pins in the app manifest. For each commit, logs/quick-19-0{3,4,5}.log FAIL sets `comm -13` against quick-baseline.txt print nothing, and logs/live-19-0{3,4,5}.log hold live first-boot rows (the 19-05 carried red is truth 4) |
| 2 | SC2a / UPD-09: every `@theia/*` except monaco-editor-core is 1.76.0, and diff-theia-core.sh passes | VERIFIED | Verifier `--only ng086-theia-react-node` PASS: "56 @theia packages at 1.76.0 (@theia/monaco-editor-core excepted at 1.108.201)". A grep of every theia manifest finds no `@theia/*` pin other than 1.76.0, except monaco at 1.108.201. Verifier `--only diff-theia-core` ran both stages: "stage 2 -- fresh-resolve diff ... PASS -- zero changes inside @theia/*" |
| 3 | SC2b / UPD-08: a `--quick` row finds exactly one installed copy each of react, react-dom, @types/react, @types/react-dom and inversify, and its self-test goes red naming the package when a duplicate is planted | VERIFIED | Verifier `--only single-copy-deps` PASS: one copy each (react 19.2.8, react-dom 19.2.8, @types/react 19.2.18, @types/react-dom 19.2.7, inversify 6.2.2). The self-test (7 cases) PASS. The 'nested duplicate' case requires the line `-- react: 2 ` with both paths. The 'third workspace group' case requires `-- inversify: 2 `. Both rows are in the `--quick` summary |
| 4 | SC3 / UPD-10: a live sidecar on a fresh and on a carried-over config dir opens only the PowerBrowser welcome (no Theia Welcome), opens `view:` URIs, and passes `side02-token-*` live | VERIFIED | logs/full-19-06.log at dfef881: `first-boot-surface-fresh: PASS -- main area [welcome]`, `first-boot-surface-carried: PASS -- restored main area [view:welcome, http://127.0.0.1:42079/carried, view:disassembly-view-widget]`, `side02-token-negative/positive: PASS`, `verify-uri-roundtrip: PASS` for 21 `view:` ids. `@theia/getting-started` 1.76.0 is composed (src-gen index.js:142), so the widget-absence assertion runs with its positive control. Fresh confirmation: the verifier re-ran `--only first-boot-surface-fresh` on PB_VERIFY_PORT 3939: PASS. Since dfef881 the only changes to the live checks are self-test plants and comments (`git diff dfef881 HEAD -- scripts`). The 19-05 intermittent carried red was root-caused as the check reading before `applyLastSession`. dfef881 adds a bounded wait and leaves the comparison unchanged |
| 5 | SC4 / RM-02: `@powerbrowser/branding` contains neither D-22 override; the 12 `@theia/ai-*` packages are composed at 1.76.0 and unmodified | VERIFIED | 2700e4c deletes powerbrowser-ai-layout-contribution.ts and both guarded rebinds (AIFirstPerspectiveContribution, AIAgentConfigurationViewContribution). No `@theia/ai-` import remains in branding/src. The built bundle.js contains 0 occurrences of either PowerBrowser override class. Both theia/package.json and the app manifest list the 12 ai-* packages at 1.76.0, and the 12 installed node_modules/@theia/ai-* report 1.76.0. diff-theia-core stage 2 proves them byte-unmodified |
| 6 | SC5: the NG-082 amend and Chris's telemetry decision are recorded, and quick-baseline.txt is refreshed | VERIFIED | `ledger-report.py`: `NG-082 dropped` (0d4f2c9, recorded as Chris's removal; 19-05-SUMMARY:64). Telemetry: 19-07-SUMMARY:72 quotes "telemetry ok (Recommended)". quick-baseline.txt was re-derived by the R33 pipeline. It `cmp`-equals logs/quick-19-06.log and logs/quick-19-06-post-docs.log, so the plan's rule left it unchanged. decisions.md:39 records "unchanged at the Phase 19 refresh, after the Theia 1.76.0 re-pin" |
| 7 | UPD-09 ledger lifecycle: NG-086 added, its red recorded, closed with evidence, and the check hashes re-locked by Chris; phase-gate silent | VERIFIED | Commits 02864f8 (added, check-fail recorded with configuration.toml at 1.76.0 and the install at 1.74.1), e0fbf8b (closed, evidence 2700e4c + full run dfef881) and 5db8a80 (Chris's lock-checks at e0fbf8b, quoted in 19-07-SUMMARY:66). `ledger-report.py`: `NG-086 done`, 86 rows done=53 deferred-approved=9 dropped=24 due=0. The verifier ran `phase-gate.py --root .`: no output, exit 0. The ledger was read only through ledger-report |
| 8 | UPD-07 (gap closure 19-08): the packaged Node runtime is Node 24, with its sha256 from Chris's GPG-verified SHASUMS256.txt, and a `--quick` row keeps the packaged, flake and engines majors in agreement | VERIFIED | node-runtime.json: linux-x64 v24.19.0, sha256 14b342e7...409647. That equals logs/node-pin-19-08.log's SHASUMS line and the `gpgv: Good signature` line quoted in 19-08-SUMMARY:49-55. Chris's "node-runtime accept" is at 19-07-SUMMARY:78. Verifier `--only node-major-agreement` PASS ("flake.nix nodejs_24; ... v24.19.0; ... engines.node >=24") and its self-test PASS (7 cases). logs/ng063/ng065/ng072-19-08.log all PASS on the rebuilt package ("reached a ready workbench on its own Theia and Node") |
| 9 | The full run at 1.76.0 has only owned reds | VERIFIED | logs/full-19-06.log: `PHASE19_RUN_COMMIT=dfef881...`, 218 rows PASS, 5 FAIL. The verifier re-derived the FAIL labels, and they equal 19-FAILSET-1.76.txt exactly: 4 gui08 rows (Phase 21) and ng074-ci-green-on-main (NG-074, Phase 25) |
| 10 | Telemetry: PowerBrowser's `telemetry.telemetryLevel` text and default win in any module order, with no Theia code patched | VERIFIED | telemetry-preferences.ts:65-70 registers through `initSchema` and then `updateSchemaProperty`, with no static `schema`, and the default stays `off`. Both live first-boot rows assert "telemetry level off, Settings shows the telemetry-preferences.ts description" (full run and the verifier re-run). diff-theia-core PASS |
| 11 | Commit 3 side changes: `workbench.startupEditor: none`, app version 1.76.0, `engines.node >=24`, nodeMissing copy asks for Node.js 24 | VERIFIED | theia/applications/browser/package.json:4 version 1.76.0, :21 `"workbench.startupEditor": "none"`. theia/package.json:61 `"node": ">=24"`. TheiaService.sys.mjs:43 nodeMissing reads "...Install Node.js 24 or later and open PowerBrowser again, or open Details for where it looked." `shell-error-copy-no-internals` PASS in `--quick` |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Deferred Items

Each item the orchestrator routed was checked against the tree. None breaks the goal.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | WR-01 telemetry Settings wording | accepted (UI-SPEC lock) | Chris: "telemetry ok (Recommended)" |
| 2 | WR-04 NG-086 self-test plants | accepted (hash-locked file) | Row and self-test PASS. Editing needs a new re-lock |
| 3 | WR-05 NG-086 reads only flake.nix | closed by node-major-agreement | Verifier PASS, row and self-test |
| 4 | WR-06 no launch-time Node probe | accepted / later | Packaged Node is 24. nodeMissing copy names 24 |
| 5 | STACK.md:24 says Node 22 | next map-codebase refresh | Planning doc only |
| 6 | CLAUDE.md:145 stale UI-SPEC path | docs follow-up | File is under .planning/milestones/v1.0-phases/ |
| 7 | T-19-26 README fingerprint cross-check | accepted residual | 19-SECURITY threats_open: 0. gpgv Good signature on record |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `flake.nix` | `nodejs_24`, yarn overridden onto it | VERIFIED | Only file in 4cf6806. The dev shell prints v24.19.0 |
| `theia/package.json`, `theia/applications/browser/package.json` | @theia 1.76.0, React 19.2.8, engines >=24, startupEditor none | VERIFIED | See truths 2, 5, 11 |
| `theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts` | No D-22 rebinds | VERIFIED | ai-layout file deleted; no ai-* import |
| `theia/extensions/telemetry/src/browser/telemetry-preferences.ts` | initSchema registration | VERIFIED | Truth 10 |
| `powerbrowser/packaging/node-runtime.json` | v24.19.0 with the GPG-verified sha256 | VERIFIED | Truth 8 |
| `scripts/verify-single-copy-deps.mjs` | `--quick` row and planted-duplicate self-test | VERIFIED | Registry :4562-4563, PASS |
| `scripts/verify-ng-086-theia-react-node.mjs` | NG-086 check, locked | VERIFIED | Registry :4570-4571, PASS, in check_locks |
| `scripts/verify-node-major-agreement.mjs` | Packaged/flake/engines major agreement | VERIFIED | Registry :4576-4577, PASS |
| `scripts/verify-first-boot-surface.mjs` | Live fresh/carried first-boot check plus self-test | VERIFIED | Registry :4555, :4896, :4899. Live PASS (verifier re-run, fresh) |
| `19-FAILSET-1.76.txt` | Owned FAIL set of the full run | VERIFIED | 5 rows, all owned, equals the log |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| single-copy-deps / ng086 / node-major-agreement | verify-platform.sh `--quick` | registry rows | WIRED | All six rows (with self-tests) appear PASS in the verifier's `--quick` summary |
| first-boot-surface-fresh/-carried | verify-platform.sh full tier | registry rows :4896, :4899 | WIRED | Ran in full-19-06 and in the verifier's `--only` re-run |
| NG-086 ledger row | verify-ng-086-theia-react-node.mjs | test_ref plus check_locks | WIRED | ledger-report `done`. The phase-gate is silent |
| node-runtime.json | packaged tree | package-linux.sh, NG-063 | WIRED | ng063-packaged-launch PASS on the rebuilt package (19-08) |
| telemetry-preferences.ts initSchema | Settings UI | PreferenceSchemaService | WIRED | The live row asserts the Settings description and the level |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Commit gate | `scripts/verify-platform.sh --quick` | 119 PASS. FAIL: the 4 baseline gui08 rows plus `verify-downstream-fixtures` (see Anti-Patterns: transient). Isolated re-run green | PASS (baseline) |
| Theia/React/Node pins | `--only ng086-theia-react-node` (+ self-test) | PASS / PASS | PASS |
| Single copy | `--only single-copy-deps` (+ self-test) | PASS / PASS (7 cases) | PASS |
| Node majors agree | `--only node-major-agreement` (+ self-test) | PASS / PASS (7 cases) | PASS |
| Upstream pins | `--only verify-upstream-pins` (+ self-test) | PASS / PASS | PASS |
| Build order | `--only theia-build-order` (+ self-test) | PASS / PASS | PASS |
| Theia core unmodified | `--only diff-theia-core` | Both stages, PASS | PASS |
| Live first boot, fresh | `PB_VERIFY_PORT=3939 --only first-boot-surface-fresh` | PASS -- main area [welcome], perspective browsing, telemetry off, 0 boot errors | PASS |
| Dev shell Node | `nix develop .#theia --command node --version` | v24.19.0 | PASS |
| Ledger gate | `python3 scripts/phase-gate.py --root .` | no output, exit 0 | PASS |

### Probe Execution

Not applicable. The phase declares no `scripts/*/tests/probe-*.sh`. Its verification is the registry rows above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RM-02 | 19-05 | AI framework stock: both D-22 overrides removed, 12 ai-* composed and unmodified | SATISFIED | Truth 5 |
| UPD-07 | 19-03, 19-08 | `.#theia` runs Node 24, flake.nix only, flake.lock untouched | SATISFIED | Truths 1, 8 |
| UPD-08 | 19-02, 19-04 | React 19.2.8 with single copies, enforced by a `--quick` row with a planted-duplicate self-test | SATISFIED | Truths 1, 3 |
| UPD-09 | 19-02, 19-05, 19-07 | @theia 1.76.0, diff-theia-core passes, NG-082 dropped by Chris, NG-086 added/red/closed, re-locked | SATISFIED | Truths 2, 6, 7 |
| UPD-10 | 19-01, 19-06, 19-07 | Live fresh and carried checks pass; telemetry collision decided by Chris | SATISFIED | Truths 4, 6, 10 |

No orphaned requirements. REQUIREMENTS.md still shows the five as `[ ]` / Pending. Marking them complete is the phase-close step, so this is not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (all phase-modified files) | - | TBD/FIXME/XXX/TODO/HACK | - | None found |
| `scripts/verify-platform.sh` row `verify-downstream-fixtures` | - | Red once in the verifier's `--quick` run (3/6 fixtures: "restored generated/ hashes differ from the pre-fixture snapshot"). Green on the immediate `--only` re-run (268 assertions) and in quick-19-06-post-docs and quick-19-08. The tree was clean before and after, and HEAD did not move | Info | Phase 19 did not touch the generator or the fixtures. The row writes into the shared tree, so a concurrent `--quick` from another agent or session can race it. Worth a look if it repeats |
| `theia/extensions/tab-uris/src/browser/tab-uris-frontend-module.ts` | 130-166 | Sets `isExtractable = false` on `ChatViewWidget` (D-27, inherited from the import 38a26f5) | Info | This is not a D-22 override, it is not in branding, and no @theia package is modified, so RM-02 as worded holds. It is a tab-model (GUI-04) constraint on a stock AI widget. Chris may want to confirm it fits "Theia AI should remain as stock" |
| `19-07-SUMMARY.md` | Open-gap facts | Claims "all extension manifests declare `engines.node >=24`" | Info | Only theia/package.json declares `engines.node`, and no extension manifest does. The goal is unaffected, because node-major-agreement and ng086 read the root manifest |
| `theia/extensions/branding/package.json` | 7 | Still depends on `@theia/ai-ide` 1.76.0 with no import left in branding/src | Info | Harmless. The package is composed by the app manifest anyway |

### Human Verification Required

None. Chris's required actions (the NG-082 removal, the re-lock, the telemetry decision, the Node-runtime choice and its gpgv step) are on record in commits 0d4f2c9/5db8a80 and quoted in 19-04/19-07/19-08 SUMMARYs ("approved", "telemetry ok (Recommended)", "node-runtime accept", the gpgv output).

### Gaps Summary

No gaps. On Node 24 (dev shell v24.19.0; packaged runtime v24.19.0 from a GPG-verified sum), the sidecar runs Theia 1.76.0 with React 19.2.8, single copies of the shared packages, and an unmodified, fully composed AI framework. Each of the three ordered product commits was followed by `--quick` and a live start. The fresh and carried first-boot surfaces, `view:` URIs and token-gate rows passed live. The verifier re-confirmed the fresh first boot itself. The ledger closed cleanly. The only observed oddity, a transient `verify-downstream-fixtures` red, is outside the phase's surface and did not reproduce.

---

_Verified: 2026-10-17T20:58:00Z_
_Verifier: Claude (gsd-verifier)_
