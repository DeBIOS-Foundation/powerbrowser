# Authority table review record (11-01, SQL-02)

STATUS: DRAFT — awaiting review. The procedure below was performed against
`AUTHORITY.md`; no approval is recorded yet (see Signature).

## Procedure

For the file listed under Reviewed files:

1. Read each invariant row end to end and confirm it states the SQL-02 rule
   it claims: single chrome-side writer (1), sessionstore restore authority
   (2), registry-URI join key (3), backend-never-opens-profile-databases
   (4), own-file rule (5), token-never-in-SQL (6).
2. Confirm every row names its Phase 12 enforcement (scan, gate, or review)
   so doc and gates cannot drift apart.
3. Confirm the prose carries no originating-product brand token — only the
   allowed names appear (Power Browser, upstream, Firefox, Mozilla, Theia,
   SQLite); "upstream"/"originating product" wording elsewhere is fine.
4. Confirm the engine is SQLite only with no rejected-engine surface
   anywhere in the doc.
5. Confirm no manifest or configuration key is introduced: filename and
   schema version appear only as fixed platform content.
6. Confirm no GUI surface: no window, strip, toolbar, address bar, menu, or
   user-facing string is authorized anywhere.
7. Confirm no internal identifier leaks into user-facing prose (this record
   and `AUTHORITY.md` carry no user-facing strings by construction).
8. Record the assumed inputs below as pinned-or-deferred with the procedure
   that settles each one; the approval covers the stated uncertainty
   explicitly, not silently.

## Reviewed files

| File | Reviewer | Date | Verdict |
| ---- | -------- | ---- | ------- |
| `authority/AUTHORITY.md` | (pending) | (pending) | DRAFT |
| `authority/SIGN-OFF.md` | (pending) | (pending) | RECORD |

## Evidence basis

LOW-confidence inputs re-checked or explicitly deferred at review time:

- A1 (private-window detection symbol): DEFERRED to plan 11-02 — pinned by
  reading the pinned upstream tree, never from memory; the Phase 12
  catalogue row names the file and line.
- A2 (history/bookmark read paths): DEFERRED to plan 11-02 — exact methods
  confirmed against the pinned tree before the schema doc cites them.
- A3 (readonly-reader call shape): DEFERRED to Phase 12 build — confirmed
  against the reader package docs at build time; version and legitimacy
  already verified at research time.
- A4 (integrity tripwire cadence): DEFERRED to planner discretion in plan
  11-02 — either cadence is safe; both pragmas verified.
- A5 (write-through statement shape): DEFERRED to plan 11-02 — confirmed
  against the vendored engine version before the schema doc cites it.
- A6 (no new compiled surface): PINNED — the writer import is JS-only inside
  the excluded boundary file, so no build target changes by construction.

## Checklist results

| Item | Result |
| ---- | ------ |
| Six invariants present, each naming Phase 12 enforcement | (pending) |
| No brand token in either file | (pending) |
| Engine SQLite only, no rejected-engine surface | (pending) |
| No manifest or configuration keys | (pending) |
| No GUI surface | (pending) |
| No internal identifier in user-facing prose | (pending) |
| Assumed inputs recorded as pinned-or-deferred | recorded above |

## Signature

(empty — approval recorded by Task 2)
