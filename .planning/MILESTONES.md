# Milestones

## v1.0 PowerBrowser — SHIPPED 2026-09-04 (override closeout)

- **Phases:** 7 (1–7) | **Plans:** 52/52 executed | **Tasks:** ~140 (from phase summaries)
- **Git:** 326 commits (68 `feat(`), 352 files, +93,852/−34 · 2026-08-22 → 2026-09-04 · tag `v1.0`
- **Archives:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`
- **Closeout type:** override_closeout. No milestone audit file; all phase verifications `human_needed` (static checks green, human/tier-3 drills staged); 16/31 requirements unchecked (deferred verification batch, not missing code).
- **Known verification overrides:** launch-lifecycle batch (WINDOWS #11 + #19, 19/19 green on dev binary, run 2026-09-04 by executor); trademark ritual signed (Chris, 2026-09-04, CONFIRMED).

Shipped: a booting, browsable PowerBrowser tree rebrandable through
`configuration.toml` + `brand/` alone — byte-identical generator core,
Gecko + Theia branding emitters, hook-only patches, two-layer verification
in CI, and Sourcerer reproduced as a pure downstream.

Known gaps (carried to v2, see `.planning/NEXT-MILESTONE-INPUTS.md` §3):
human-eyes drills (03 icon pixel look, 04 welcome/about render drill);
heavy-machine drills (release build + release-variant rows, per-fixture
tier-3 builds, live ESR rebase, Theia re-pin proof); WINDOWS #13
(registerWindowActor boundary hole), #14 (BiDi double-window).

Deviations from the standard close workflow:
- `.planning/REQUIREMENTS.md` was NOT removed via `git rm`: deleting it
  turns `allowlist-doc-consistency` (a `--quick` gate requiring the three
  inherited Mozilla egress hosts in both ROADMAP.md and REQUIREMENTS.md)
  red with no replacement until `/gsd-new-milestone` writes the v2 file.
  The v1 content is preserved verbatim in the archive above; new-milestone
  overwrites the live file. Tree stays green at the tag.
- Phase directories were left in place (equivalent to
  `--no-archive-phases`): the v1.0-ROADMAP archive carries the phase
  record, and the raw execution history remains browsable.
