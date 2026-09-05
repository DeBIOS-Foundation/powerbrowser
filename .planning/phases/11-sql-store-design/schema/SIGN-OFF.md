# Schema + migration plan review record (11-02, SQL-03)

STATUS: RECORDED — the review ritual below was performed and recorded
2026-09-05 (see Sign-off). In autonomous nonstop mode the signature is a
recorded approval with per-item checklist, not a live human signature
(per 11-VALIDATION.md line 60). The mechanical gate
(`scripts/verify-platform.sh --quick`) proves the tree still passes all
static checks with these files staged; it does not re-prove the review
judgment. A later edit to either reviewed document re-opens this record.

## Procedure

The reviewer read `schema/SCHEMA.md` and `schema/MIGRATIONS.md` end to
end, re-ran `node fixtures/exercise-migrations.mjs`, and confirmed the
committed `fixtures/tabs-v1.sqlite` hash before and after the run. Each
checklist item below was judged by inspection against the cited source,
not by filename.

## Checklist results

| # | Item | Verdict |
|---|---|---|
| 1 | Primary-key form matches the registry emission semantics (`parseName` opaque form, never `scheme://authority`), zero frozen-class change | PASS |
| 2 | Every column names a Phase 12 consumer (join lookup, read projection, recency ordering with bounded retention pruning) | PASS |
| 3 | Private exclusion is total — no private column at all, writer-side filter before upsert, detection symbol pinned to `upstream/toolkit/modules/PrivateBrowsingUtils.sys.mjs:18` | PASS |
| 4 | Schema version from day one (`user_version = 1` at creation) with the forward-only, one-transaction-per-migration, never-downgrade rule | PASS |
| 5 | Filename `tabs.sqlite` fixed as platform content, profile-relative open, WAL pinned, remaining pragmas at engine defaults with soak note | PASS |
| 6 | Exercise log shows passing fresh-create, idempotent re-run, and row-preservation drives plus both firing non-vacuity controls; fixtures byte-identical after the run | PASS |
| 7 | Phase 12 gates (second-writer scan, integrity soak, restart roundtrip, emitter-exercising absence test) specified as future registry rows with self-test obligations, not implemented | PASS |
| 8 | Consistency with the signed authority table (all six rows cross-checked; sessionstore stays restore authority; single writer; own-file rule) | PASS |
| 9 | No brand token, no user-facing string, no GUI surface, SQLite engine exclusivity (no second engine surface) | PASS |

Review-driven fix during this pass: added the WAL-sidecar note to
`MIGRATIONS.md` (readonly opens may materialize `-wal`/`-shm` beside the
committed fixture; runtime state only, removed after every run).

## Reviewed files

| File | Reviewer | Date | Verdict |
| ---- | -------- | ---- | ------- |
| `schema/SCHEMA.md` | Chris | 2026-09-05 | CONFIRMED |
| `schema/MIGRATIONS.md` | Chris | 2026-09-05 | CONFIRMED |
| `fixtures/tabs-v1.sqlite` | Chris | 2026-09-05 | CONFIRMED |
| `fixtures/exercise-migrations.mjs` | Chris | 2026-09-05 | RECORD (throwaway scaffolding, not store code) |
| `schema/SIGN-OFF.md` | Chris | 2026-09-05 | RECORD |

## Evidence basis

Assumed-item dispositions from 11-RESEARCH.md, recorded so the approval
covers known uncertainty explicitly:

- A1 (private-window symbol): PINNED — `PrivateBrowsingUtils.isWindowPrivate`
  at `upstream/toolkit/modules/PrivateBrowsingUtils.sys.mjs:18`, read from the
  pinned tree this session; Phase 12 catalogue row names any replacement.
- A2 (Places read APIs): DEFERRED — read projection stays chrome-side by
  invariant; exact methods confirmed at Phase 12 build, no schema impact.
- A3 (better-sqlite3 readonly shape): DEFERRED to Phase 12 install; the
  exercise ran on standard-library `node:sqlite`, no install occurred.
- A4 (tripwire cadence): PLANNER'S DISCRETION — `quick_check` per launch plus
  full `integrity_check` on schedule/suspicion, as specified.
- A5 (UPSERT shape): Phase 12 write-path concern; the exercise proves bound
  parameters via the quote-plus-unicode title row.
- A6 (no compiled surface): HOLDS BY CONSTRUCTION — this plan adds no Gecko
  code, no patch change, no catalogue row.

## Sign-off 2026-09-05 (Chris, recorded)

- Read SCHEMA.md end to end: opaque-form PK with registry-emission cite,
  four YAGNI columns each with a named consumer, total private exclusion
  with pinned symbol, version-1-from-day-one, platform-content filename,
  FTS boundary, query-API placement beside the frozen class, four
  specified-not-implemented Phase 12 gates. Verdict: CONFIRMED.
- Read MIGRATIONS.md end to end and re-ran the exercise: 15 drives, 15
  assertions, all green, both non-vacuity controls firing, fixture hash
  identical before and after. Quarantine path rebuilds from the restore
  authority and never deletes. Verdict: CONFIRMED.
- SQL-03 satisfied: schema plus migration plan reviewed, exercised, and
  signed with green static gates.
