---
gsd_state_version: 1.0
milestone: v1.6
current_phase: 40
current_phase_name: Release identity, ESR pin and patch regeneration (A)
current_plan: 4
status: executing
stopped_at: Completed 40-04-PLAN.md
last_updated: "2026-10-21T00:17:03.834Z"
last_activity: 2026-10-20
last_activity_desc: Phase 40 execution started
state_head: c1a30451e94b8764d11d25df17f97ef3dbb05493
progress:
  total_phases: 19
  completed_phases: 0
  total_plans: 8
  completed_plans: 4
milestone_name: Deployment setup
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-20)

**Core value:** A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo, and build their own branded, working web browser without touching any other file, then reshape its GUI through Theia extensions without forking the platform.
**Current focus:** Phase 40 — Release identity, ESR pin and patch regeneration (A)

## Current Position

Phase: 40 (Release identity, ESR pin and patch regeneration (A)) — EXECUTING
Plan: 5 of 8
Status: Ready to execute
Last activity: 2026-10-20 — Phase 40 execution started

Progress: [░░░░░░░░░░] 0%

## Progress

**Phases Complete:** 0 of 19
**Current Plan:** 4

## Performance Metrics

**Velocity:**

- Total plans completed: 0

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 40 P01 | 15min | 2 tasks | 6 files |
| Phase 40 P02 | 15min | 2 tasks | 3 files |
| Phase 40 P03 | 25min | 3 tasks | 23 files |
| Phase 40 P04 | 8min | 2 tasks | 14 files |

## Accumulated Context

### Decisions

Owner decisions 1–22 of 2026-10-20 are recorded in `.planning/workstreams/deploy/REQUIREMENTS.md` (Owner Decisions). Roadmap decisions:

- Phases follow SEED-002 letters A–L; A, C, D, E and F span several phases (A: 40–43, C: 45–46, D: 47–48, E: 49–50, F: 51–52).
- Backlog Phase 999.2 "Release and distribution" in main's ROADMAP.md is superseded by this milestone (main's file not edited from this workstream).
- AUTO-08 (generate inside `nix develop .#theia`, no `tag` default) is in Phase 40 after DIST-06, so the first dispatched `rebase-upstream.yml` run can go green (ARCHITECTURE R1; SUMMARY A1).
- GH-10: Phase 41 creates `powerbrowser-updates` and the Homebrew tap repo empty, so `repo-controls` can read back the bot App installation; Phases 47 and 56 fill them.
- Live observations that need a real GitHub Release (UPD-15 asset hosts; sweep runner, channel and download rows) are Phase 50 criterion 5.
- The kit plan gate runs as `python3 scripts/plan-gate.py --root . --phase N --plans <dir> --stream deploy` in this workstream (owner choice 2026-10-20, commit 8d9a429): main's ledger rows (e.g. NG-089, phase 26) use main's phase numbers and are not due against phases 40+. Any v1.6 ledger row must carry `"stream": "deploy"`.
- Phase 40: update channel stays `default` / `powerbrowser-default`; `product.revision` is a TOML integer; push and first `rebase-upstream.yml` dispatch are the owner's 40-08 Task 3 checkpoint, which also carries the About-dialog result.
- [Phase 40]: 40-01: rebase-upstream.yml carries no tag at all (no input default); verify-upstream-pins sweeps it like any other file and asserts both triggers, no default, and Nix-wrapped generator steps
- [Phase 40]: 40-02: regenerate-patches.sh write mode validates every regeneration before any rename, so a refusal leaves the whole stack byte-identical
- [Phase 40]: product.revision is a TOML integer (required, >=1); release key v<ESR>-<revision> via releaseIdentity(); version files are release metadata, never a Gecko build input
- [Phase 40]: Update channel default, MAR channel id powerbrowser-default, from one exported generator constant UPDATE_CHANNEL (UPD-11)
- [Phase 40]: configuration.toml [urls] update (MOZ_APPUPDATE_HOST) is the only update URL source; policies.json carries no AppUpdateURL (UPD-12)

### Pending Todos

- Owner, now: request the D-U-N-S number; create the Cloudflare account with 2FA.

### Blockers/Concerns

- Phase 43 exit test is calendar-bound: the first ESR 153 point release after the train lands (153.7 on 2026-11-10, else 153.8 on 2026-11-24, and so on); 153.6 (2026-10-27) is out of reach.
- FIX-10 (Phase 52) must be proven before 2027-05-27; ESR 175.x must ship before 153.27 (2027-09-07).

## Session Continuity

**Last session:** 2026-10-21T00:17:03.813Z

**Stopped At:** Completed 40-04-PLAN.md
**Resume File:** None

## Milestone Context

- Scope: `.planning/seeds/SEED-002-deployment-setup.md` phases A–L, plus two additions approved 2026-10-20: a release-and-maintenance orchestrator (`release-train.yml` started by the Worker cron, one tracking issue per release) and Claude Code Action fixer steps that open PRs for review and never merge, approve, or touch signing keys.
- Runs as workstream `deploy` on branch `workspace/deploy`, created with `--no-migrate`; main's flat planning (v1.5 Chrome Bar Firefox Parity) is untouched.
- Research for this milestone lives in `.planning/research/v1.6-deploy/` (the research dir is shared with v1.5).
- Roadmap: `.planning/workstreams/deploy/ROADMAP.md` (Phases 40–58).
