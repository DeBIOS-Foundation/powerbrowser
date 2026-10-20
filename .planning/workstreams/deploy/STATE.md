---
gsd_state_version: "1.0"
milestone: v1.6
milestone_name: Deployment setup
status: planning
last_updated: "2026-10-20T21:00:00.000Z"
last_activity: 2026-10-20
progress:
  total_phases: 19
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-20)

**Core value:** A stranger can clone Power Browser, edit `configuration.toml`, drop in a logo, and build their own branded, working web browser without touching any other file, then reshape its GUI through Theia extensions without forking the platform.
**Current focus:** Phase 40: Release identity, ESR pin and patch regeneration (A)

## Current Position

Phase: 40 (1 of 19: Phases 40–58) — Release identity, ESR pin and patch regeneration (A)
Plan: — (not planned yet)
Status: Ready to plan
Last activity: 2026-10-20 — Roadmap created (19 phases, 152/152 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Progress

**Phases Complete:** 0 of 19
**Current Plan:** N/A

## Performance Metrics

**Velocity:**
- Total plans completed: 0

*Updated after each plan completion*

## Accumulated Context

### Decisions

Owner decisions 1–22 of 2026-10-20 are recorded in `.planning/workstreams/deploy/REQUIREMENTS.md` (Owner Decisions). Roadmap decisions:

- Phases follow SEED-002 letters A–L; A, C, D, E and F span several phases (A: 40–43, C: 45–46, D: 47–48, E: 49–50, F: 51–52).
- Backlog Phase 999.2 "Release and distribution" in main's ROADMAP.md is superseded by this milestone (main's file not edited from this workstream).
- AUTO-08 (generate inside `nix develop .#theia`, no `tag` default) is in Phase 40 after DIST-06, so the first dispatched `rebase-upstream.yml` run can go green (ARCHITECTURE R1; SUMMARY A1).
- GH-10: Phase 41 creates `powerbrowser-updates` and the Homebrew tap repo empty, so `repo-controls` can read back the bot App installation; Phases 47 and 56 fill them.
- Live observations that need a real GitHub Release (UPD-15 asset hosts; sweep runner, channel and download rows) are Phase 50 criterion 5.

### Pending Todos

- Owner, now: request the D-U-N-S number; create the Cloudflare account with 2FA.

### Blockers/Concerns

- Phase 43 exit test is calendar-bound: the first ESR 153 point release after the train lands (153.7 on 2026-11-10, else 153.8 on 2026-11-24, and so on); 153.6 (2026-10-27) is out of reach.
- FIX-10 (Phase 52) must be proven before 2027-05-27; ESR 175.x must ship before 153.27 (2027-09-07).

## Session Continuity

**Stopped At:** Roadmap created; next is `/gsd-plan-phase 40`
**Resume File:** None

## Milestone Context

- Scope: `.planning/seeds/SEED-002-deployment-setup.md` phases A–L, plus two additions approved 2026-10-20: a release-and-maintenance orchestrator (`release-train.yml` started by the Worker cron, one tracking issue per release) and Claude Code Action fixer steps that open PRs for review and never merge, approve, or touch signing keys.
- Runs as workstream `deploy` on branch `workspace/deploy`, created with `--no-migrate`; main's flat planning (v1.5 Chrome Bar Firefox Parity) is untouched.
- Research for this milestone lives in `.planning/research/v1.6-deploy/` (the research dir is shared with v1.5).
- Roadmap: `.planning/workstreams/deploy/ROADMAP.md` (Phases 40–58).
