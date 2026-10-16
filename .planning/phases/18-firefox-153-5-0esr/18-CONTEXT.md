# Phase 18: Firefox 153.5.0esr - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

PowerBrowser builds on Gecko 153.5.0esr and passes the full verification run on
both build variants (UPD-05, UPD-06). See ROADMAP.md Phase 18 success criteria.

Run order note: Phase 18 is executed before Phase 17 in this autonomous run.
Phase 17 waits on a ledger line only Chris can type (NG-051); Phase 18 touches
no file Phase 17 touches (Gecko pin, upstream/, patches/, smoke-firefox.sh,
fetch-upstream.sh, docs/BUILD.md, configuration.toml line 104 and the
`[upstream]` pin). Do not touch theia/, the `[ai]` table, or OpenCode files.

</domain>

<decisions>
## Implementation Decisions

### Locked (from research and the approved roadmap)
- Pin `FIREFOX_153_5_0esr_BUILD1`, commit `223014c6b9299ac9b035b4c50ea481e5c6de282c`;
  record the SHA in `docs/BUILD.md` (research SUMMARY "Disagreements", row 1).
- Patches are replayed, never text-edited. The five files the four patches touch
  have identical blob SHAs at 153.1 and 153.5 (STACK.md). If a patch fails to
  apply, regenerate it from a patched tree; never hand-edit a hunk.
- Budget two Gecko builds: the dev objdir and `objdir-release` (PITFALLS.md).
- `smoke-firefox.sh:41-42` derives the version from
  `upstream/browser/config/version_display.txt` instead of `153.1.0esr`.
- `mar-update-hop` evidence is labelled pre-153.5, not cited as a 153.5 proof.
- `rebase-upstream.yml` has never run and has no Nix: record it as unexercised
  (do not wrap it in Nix in this phase).
- Do not run `nix flake update`.
- **Criterion 4 reading (autonomous run, research recommendation, 2026-10-16):**
  "full `verify-platform.sh` passes" means: a full baseline run at 153.1 is
  taken before the rebase; at 153.5 no row is newly red; every version-sensitive
  row is green; each remaining red row is named against its owning phase or
  ledger ID (the four `gui08` rows → Phase 21; `ng074-ci-green-on-main` →
  Phase 25). No human checkpoint for this reading (Chris: stop only when no
  recommendation exists); it is reported in the phase summary.
- Plans cite ledger IDs NG-074 and NG-084 (required by `plan-gate.py --phase 18`).
- Build traps from 18-RESEARCH.md are mandatory: `./mach clobber` on each
  objdir before its build; release build sets both
  `POWERBROWSER_OBJDIR=objdir-release` and
  `POWERBROWSER_BRANDING=powerbrowser/branding/release`; run
  `package-linux.sh` after the dev build. Builds and full runs go to the
  background with a tee'd log, one at a time, never in parallel.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria, `.planning/research/STACK.md`,
`.planning/research/PITFALLS.md` and `docs/BUILD.md`.

</decisions>

<code_context>
## Existing Code Insights

- `scripts/fetch-upstream.sh:276-282` tag comment is wrong (claims `_BUILD1` and
  `_RELEASE` always share a commit; at 153.4 RELEASE was BUILD3).
- `configuration.toml:104` has a lost newline ("tag this# project").
- `.github/workflows/rebase-upstream.yml:33` mirrors the pin.
- Gecko builds run inside `nix develop .#firefox`; a full `./mach build` is
  about 47-54 minutes. The 2026-10-15 trial tested commit `f617beaded`, not
  `223014c6b9`; do not cite it as evidence.

</code_context>

<specifics>
## Specific Ideas

Research: `.planning/research/STACK.md` (Firefox section),
`.planning/research/PITFALLS.md` (pitfalls 1, 2, 3, 14).

</specifics>

<deferred>
## Deferred Ideas

Wrapping `rebase-upstream.yml` in Nix — later, if CI rebase drills are wanted.

</deferred>
