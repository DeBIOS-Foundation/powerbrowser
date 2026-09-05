# Phase 11 review-sign gate (11-03, SQL-02 + SQL-03)

Status: GATE GREEN — both design halves signed, static gates green on the
final tree, absence proofs recorded, Phase 12 handoff specified.
Design only: no store code exists; nothing executable crosses into Phase 12.

## 1. Recorded approvals

| Document | Reviewer | Date | Status |
|---|---|---|---|
| authority/SIGN-OFF.md (covers `authority/AUTHORITY.md`, six invariants, SQL-02) | Chris | 2026-09-05 | RECORDED — `STATUS: RECORDED`, verdict CONFIRMED per row |
| schema/SIGN-OFF.md (covers `schema/SCHEMA.md`, `schema/MIGRATIONS.md`, `fixtures/tabs-v1.sqlite`, `fixtures/exercise-migrations.mjs`, SQL-03) | Chris | 2026-09-05 | RECORDED — recorded approval with 9-item checklist, all PASS |

Both sign-off files carry RECORDED approvals on the final tree (re-confirmed
2026-09-05 during this gate: `grep -c RECORDED` → 2 hits authority/SIGN-OFF.md,
1 hit schema/SIGN-OFF.md). Threat T-11-15 (unsigned document advancing)
mitigated by this re-confirmation.

## 2. Static gates observed this session

- `scripts/verify-platform.sh --quick` → `verify-platform: PASS -- all checks
  passed` (exit 0). Covers the residue row over the staged record (T-11-16).
- `node scripts/verify-registry-shape.mjs` → `verify-registry-shape: PASS --
  5 exported names across 2 modules and 4 TabUriRegistry public members match
  the declared bridge contract` (exit 0). Frozen contract untouched by
  construction: neither design doc proposes a registry change.
- `bash scripts/check-internals-boundary.sh --catalogue` →
  `internals-catalogue: PASS` (exit 0). Zero new touchpoint rows:
  `powerbrowser/INTERNAL-APIS.md` last touched in plan 01-05, no staged or
  unstaged change; Phase 11 adds writer wrappers in no file (T-11-17).

## 3. Absence proofs (observed, not recollected)

SQLite-only engine surface: the raw `grep -rEi 'duckdb'` over the new doc
directories returns exactly two hits, both prior-research citation paths
(traceability, not surface):

- `authority/AUTHORITY.md:41` — `.planning/research/duckdb-vs-sqlite/VERDICT.md`
- `schema/SCHEMA.md:155` — `.planning/research/duckdb-vs-sqlite/03-INTEGRATION.md` §5

Refined engine-surface check (same scope, citation paths excluded) → NO MATCH;
import/require/connect patterns (`require('duckdb')`, `from 'duckdb'`,
`duckdb.connect`, `duckdb@`) → NO MATCH. Conclusion: no rejected-engine
surface exists; the engine paragraph in each doc names SQLite only.
Deviation note: the plan's literal `! grep -rEi 'duckdb'` leg over-matches
these two deliberate citations, so the gate records the raw result plus the
refined proof instead of deleting load-bearing traceability (Rule 1 fix on
the check, not the docs).

No manifest parameterization: `grep -r 'configuration.toml'` over
authority + schema → NO MATCH; `grep -rEi '\[features\]|\[sql\]'` over
authority + schema → NO MATCH. Filename `tabs.sqlite` and schema version
appear only as fixed platform content.

No GUI surface: proven by confinement, not by word search (the words
"window"/"menu" occur only inside the "No GUI surface" exclusion lines and
the pinned `PrivateBrowsingUtils.isWindowPrivate` detection symbol). Changed
files are confined to the phase directory — pasted listing (`git ls-files`):

```text
.planning/phases/11-sql-store-design/11-01-PLAN.md
.planning/phases/11-sql-store-design/11-01-SUMMARY.md
.planning/phases/11-sql-store-design/11-02-PLAN.md
.planning/phases/11-sql-store-design/11-03-PLAN.md
.planning/phases/11-sql-store-design/11-CONTEXT.md
.planning/phases/11-sql-store-design/11-PATTERNS.md
.planning/phases/11-sql-store-design/11-RESEARCH.md
.planning/phases/11-sql-store-design/11-VALIDATION.md
.planning/phases/11-sql-store-design/authority/AUTHORITY.md
.planning/phases/11-sql-store-design/authority/SIGN-OFF.md
.planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs
.planning/phases/11-sql-store-design/fixtures/tabs-v1.sqlite
.planning/phases/11-sql-store-design/schema/MIGRATIONS.md
.planning/phases/11-sql-store-design/schema/SCHEMA.md
.planning/phases/11-sql-store-design/schema/SIGN-OFF.md
```

`git status --short -- powerbrowser/ theia/ upstream/ patches/ scripts/`
→ empty. No Theia touch, no Gecko touch, no patch-stack change.

## 4. Exercise re-run (observed)

`node .planning/phases/11-sql-store-design/fixtures/exercise-migrations.mjs`
→ `PASS -- 15 drives, 15 assertions`, fixture sha256
`9daab2d5b09a5b843d1fdecba0410346b0b5969a6d16cd2a35ff67f4f2e7e73f`
unchanged. Both non-vacuity controls fired (`tamper-tripwire-fires`,
`stale-version-advances`); the firing drives for T-11-13 are present in the
log. The validation-strategy file (`11-VALIDATION.md`) is left untouched.

## 5. Requirements trace

| Requirement | Satisfied by | Gate evidence |
|---|---|---|
| SQL-02 authority table written + reviewed before schema | `authority/AUTHORITY.md` + `authority/SIGN-OFF.md` | RECORDED approval §1; ordering held (11-01 signed before 11-02) |
| SQL-03 schema + migration plan reviewed | `schema/SCHEMA.md` + `schema/MIGRATIONS.md` + `schema/SIGN-OFF.md` + `fixtures/tabs-v1.sqlite` + `fixtures/exercise-migrations.mjs` | RECORDED approval §1; 15/15 exercise §4 |

## 6. Phase 12 handoff (specified, not implemented)

Promoting any of these to `verify-platform.sh` registry rows is Phase 12's
decision; each carries a `--self-test` obligation planting faults in both
directions (T-11-14). Specified in `schema/SCHEMA.md` "Phase 12
registry-row specification":

1. Second-writer scan — no profile-database opens outside
   `powerbrowser/shell/`; fails naming the uncatalogued file-colon-line.
2. Integrity soak — startup `quick_check` tripwire plus scheduled full
   `integrity_check` against fixture and live-shape databases.
3. Restart roundtrip — URI → row → restart → reopen asserts the restored set
   equals sessionstore, with the store agreeing (authority row 2).
4. Emitter-exercising absence test — real private-window tab events through
   the real writer path, then asserts no private rows exist (the one absence
   assertion this design permits; emitter is proven to be the code under test).

Reader install (pre-cleared, no new gate): `better-sqlite3@13.0.3`, opened
readonly on the dedicated file only; legitimacy verified at research time
(~10.4M weekly downloads, no postinstall). Install belongs to Phase 12.

Live rebase drill: run over the new writer touchpoints once Phase 12 lands
its catalogue rows, proving the patch surface and boundary still hold.

## 7. Closeout

CLOSED 2026-09-05 — final sweep on the final tree: quick gate PASS,
registry-shape PASS, catalogue PASS, both RECORDED approvals confirmed,
manifest-key absence and refined engine-surface absence clean. Design-only
confirmation: zero new files outside the planning record (committed surface
confined to the phase-directory listing in §3; no powerbrowser/, theia/,
upstream/, patches/, or scripts/ change). SQL-02 and SQL-03 close; Phase 12
starts from this signed design via the §6 handoff.
