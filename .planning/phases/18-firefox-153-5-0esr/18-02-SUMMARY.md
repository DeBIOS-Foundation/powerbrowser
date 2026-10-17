---
phase: 18-firefox-153-5-0esr
plan: 02
subsystem: infra
tags: [gecko, esr, rebase, smoke-firefox, packaging, docs]

requires:
  - phase: 18
    provides: 18-01's 153.1 FAIL baseline and corrected tag comment
provides:
  - Gecko pinned to FIREFOX_153_5_0esr_BUILD1 at 223014c6b9299ac9b035b4c50ea481e5c6de282c, workflow mirror in step
  - upstream/ replayed at 153.5 with patches/ byte-unchanged
  - clobbered dev objdir built at 153.5.0 (binary reports DeBIOS powerbrowser 153.5.0esr)
  - one objdir/dist/powerbrowser-153.5.0.en-US.linux-x86_64.tar.xz
  - smoke-firefox.sh version expectation derived from upstream/browser/config/version_display.txt
  - docs/BUILD.md pin record, pre-153.5 MAR labels, unexercised-workflow note; README pin line
affects: [18-03, phase-21, phase-25]

actuals:
  tokens: 1900
  tasks: 2
  commits: 2
plan_head_before: 48fde21599319ddab3692280ac40f03ef465dcc7
plan_head_after: b6cf1557282bbaf57e13844f5a84673e85d19d29

tech-stack:
  added: []
  patterns:
    - "Version expectation read from the tree before the build; absent or empty file fails before a compile"

key-files:
  created: []
  modified:
    - configuration.toml
    - .github/workflows/rebase-upstream.yml
    - scripts/smoke-firefox.sh
    - docs/BUILD.md
    - README.md

key-decisions:
  - "smoke-firefox.sh puts 2>/dev/null before the < redirect, so an absent version file prints only the FAIL line (redirections run left to right)"
  - "The rebase workflow is registered and active (id 350520027) with zero runs; docs/BUILD.md records it as unexercised from the gh run list result on 2026-10-16"

requirements-completed: [UPD-05, UPD-06]

coverage:
  - id: D1
    description: "Pin, workflow mirror and generated fragment agree on FIREFOX_153_5_0esr_BUILD1; red observed after the manifest-only edit"
    requirement: "UPD-05"
    verification:
      - kind: other
        ref: "node scripts/verify-upstream-pins.mjs (FAIL then PASS)"
        status: pass
    human_judgment: false
  - id: D2
    description: "upstream/ at 223014c6, four patches replayed, patches/ unchanged"
    requirement: "UPD-05"
    verification:
      - kind: integration
        ref: "logs/rebase-153.5.log (PHASE18_EXIT=0); git diff --quiet HEAD -- patches/; fetch-upstream.sh accounted-for clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "Clobbered dev build at 153.5; smoke-firefox red with the old literal, green with the derived value"
    requirement: "UPD-06"
    verification:
      - kind: integration
        ref: "logs/dev-build-153.5.log (did not report 153.1.0esr); logs/smoke-153.5.log (PASS -- reports 153.5.0esr)"
        status: pass
    human_judgment: false
  - id: D4
    description: "One 153.5.0 Linux package; replay invariants and toolchain baseline hold; docs updated"
    requirement: "UPD-06"
    verification:
      - kind: integration
        ref: "logs/package-153.5.log; apply-patches --self-test; --only about-dialog-suppression; --only check-patch-surface; toolchain diff empty; --quick only gui08 red"
        status: pass
    human_judgment: false

duration: 53min
completed: 2026-10-17
status: complete
---

# Phase 18 Plan 02: 153.5 re-pin, dev build and package Summary

**Gecko is pinned to `FIREFOX_153_5_0esr_BUILD1` (`223014c6b9299ac9b035b4c50ea481e5c6de282c`). The four patches replayed byte-unchanged. A clobbered dev build reports `DeBIOS powerbrowser 153.5.0esr`, a 153.5.0 package exists, and smoke-firefox now compares against `version_display.txt` instead of a literal.**

## Performance

- **Duration:** 53 min
- **Started:** 2026-10-16T23:29:37Z
- **Completed:** 2026-10-17T00:22:37Z
- **Tasks:** 2
- **Files modified:** 5

## Run record

| Step | Result |
|------|--------|
| ls-remote 153.5 (2026-10-16 23:29 UTC) | `_BUILD1` and `_RELEASE` both `223014c6b9299ac9b035b4c50ea481e5c6de282c` (precondition met) |
| ls-remote 153.4 | `_BUILD1` `f92008fc60401bb78216ce83704f6f58be94cc20`; `_BUILD3` and `_RELEASE` `508788b6f8314edb3c33905f6d56c3fe6b087670` |
| verify-upstream-pins after the manifest-only edit (SC1 red) | `generated/upstream-pins.env carries FIREFOX_ESR_TAG=FIREFOX_153_1_0esr_RELEASE but configuration.toml declares FIREFOX_153_5_0esr_BUILD1 -- stale output.` and `.github/workflows/rebase-upstream.yml mirrors FIREFOX_153_1_0esr_RELEASE but configuration.toml declares FIREFOX_153_5_0esr_BUILD1 -- the mirror drifted.` |
| generate.mjs | 54 files under generated/; no new tracked change; verify-upstream-pins PASS |
| fetch-upstream.sh before rebase (SC2 red) | `fetch-upstream: FAIL -- upstream/ HEAD (468445e58d3acc7e4e059be99856daff1f2ae8f1) is not FIREFOX_153_5_0esr_BUILD1`, exit 1 |
| rebase-upstream.sh | PASS, 340 s wall (clone 279 s); 4 patches applied non-vacuous; brand scan 365 files plus 460828 under upstream/ |
| After rebase | patches/ unchanged; HEAD 223014c6…; version_display.txt `153.5.0esr`; fetch-upstream reports accounted-for clean |
| mach clobber (dev) | 8 s; `objdir/dist/bin/application.ini` absent; `objdir-release` still `Version=153.1.0` |
| Dev build via old smoke-firefox | 2388 s wall (mach 2376 s), zero `mach bootstrap`, then `smoke-firefox: FAIL -- './mach run --version' did not report 153.1.0esr` (recorded red) |
| `--only smoke-firefox` with derived check | 20 s, `smoke-firefox: PASS -- reports 153.5.0esr (read from upstream/browser/config/version_display.txt)` |
| Replay invariants | apply-patches `--self-test` PASS; about-dialog-suppression PASS; check-patch-surface PASS; toolchain-baseline diff empty |
| package-linux.sh | 51 s, exit 0; one `objdir/dist/powerbrowser-153.5.0.en-US.linux-x86_64.tar.xz` (127913020 bytes) |
| `gh run list --workflow rebase-upstream.yml` (2026-10-16) | `[]`; `gh workflow list` shows `Rebase upstream  active  350520027` |
| `--quick` after each commit | only the four gui08 rows FAIL |

Deferred-items row 11 a-ii (re-derive the about-dialog fixture at the first ESR bump) is checked: `aboutDialog.xhtml` has the same blob at both tags (18-RESEARCH), and about-dialog-suppression passed on the 153.5 tree. The archived milestone file was not edited.

## Task Commits

1. **Task 1: End-to-end re-pin, dev variant** - `3cfc4cd` (feat)
2. **Task 2: Package 153.5, prove replay invariants, record the pin in docs** - `b6cf155` (docs)

## Files Created/Modified

- `configuration.toml` - `[upstreams] firefox_esr_tag = "FIREFOX_153_5_0esr_BUILD1"`
- `.github/workflows/rebase-upstream.yml` - input default mirrors the pin
- `scripts/smoke-firefox.sh` - `VERSION_FILE`/`EXPECTED_VERSION` read before the build, absent-or-empty guard, fixed-string match, PASS line names the version and its source
- `docs/BUILD.md` - `**Pinned ESR (Phase 18).**` paragraph, observed `--version` output, two `predates 153.5` labels, unexercised-workflow note
- `README.md` - status line names `FIREFOX_153_5_0esr_BUILD1`

## Decisions Made

- `2>/dev/null` sits before `< "$VERSION_FILE"` in the `tr` call. With the research snippet's order, the shell's own "No such file" error printed before the FAIL line, because the input redirect fails before stderr is redirected. Verified on a planted absent file and a whitespace-only file in a scratch copy; both exit 1 with only the FAIL line.
- The CI note quotes the `gh run list` result directly. `gh` is authenticated in this session (it was not in 18-01).

## Deviations from Plan

None. The plan executed as written. The redirect-order change above is a cosmetic fix inside the step-7 rewrite, not a scope change.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Ready for 18-03: release objdir clobber and build with both `POWERBROWSER_OBJDIR=objdir-release` and `POWERBROWSER_BRANDING=powerbrowser/branding/release`, then the full run against 18-FAILSET-153.1.txt.
- `objdir-release` is still at 153.1.0 and has not been clobbered.
- 18-01's preconditions for the full run still apply: port 3000 free, `.planning` state committed or `PB_NG_ALLOW_DIRTY=1`. `gh` is now authenticated, so ng074 can read CI.

---
*Phase: 18-firefox-153-5-0esr*
*Completed: 2026-10-17*

## Self-Check: PASSED
