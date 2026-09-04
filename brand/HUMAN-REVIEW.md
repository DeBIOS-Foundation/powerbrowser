# Brand human review record (06-03)

STATUS: DRAFT — the review ritual below is fully prepared but the human
sign-off itself is DEFERRED to end-of-roadmap (standing instruction for
this autonomous run). Every `TO-BE-SIGNED` placeholder below is an
unsigned field, not a signed one. The mechanical gate
(`scripts/verify-trademark-surface.mjs`, review-agreement section) proves
the file list on disk still equals the list recorded here; it does not
prove a human has signed. Do not treat this record as complete until a
reviewer name and date replace every placeholder.

## Procedure

For every file listed under `brand/` (derived by listing the directory at
review time — currently `brand/mark.svg` only; see the table):

1. Open the file and judge it by inspection, not by filename. A new file
   added to `brand/` later is covered by the same ritual: the mechanical
   gate fails on any unlisted `brand/` file until this record is
   re-recorded, so an addition cannot slip in unsigned.
2. Confirm the file carries no third-party mark, logo, or wordmark — of
   Mozilla, of Eclipse, or of any other owner. Look at the artwork and at
   every comment and string inside the file.
3. For `brand/mark.svg` specifically, confirm the mark is an original
   square dual-fill mark: a power-glyph construction (broken ring plus
   bar) from arc and rectangle primitives, on a square `viewBox`, with the
   two-value fill pair (`#1a1a1a` on light, `#fff` on dark) — not a
   recolour, crop, trace, or rearrangement of any third-party mark.
4. `brand/HUMAN-REVIEW.md` (this record) lists itself in the table below
   with verdict RECORD: it carries no artwork, only the procedure, the
   primary-source basis, and the sign-offs. It is listed so the reviewed
   set stays closed — the mechanical gate requires set equality between
   this table and the directory, and a record that does not list itself
   could never agree with the directory that holds it.

Reply with your name, today's date, and either CONFIRMED or a finding.
The executor writes the name and date into the table, replacing the
placeholders.

## Reviewed files

| File | Reviewer | Date | Verdict |
| ---- | -------- | ---- | ------- |
| `brand/mark.svg` | TO-BE-SIGNED | TO-BE-SIGNED | TO-BE-SIGNED |
| `brand/HUMAN-REVIEW.md` | TO-BE-SIGNED | TO-BE-SIGNED | RECORD |

## Primary-source basis

The LOW-confidence web-sourced trademark findings were re-checked
against the primary policy texts below at plan time (no network needed
at execution). This section records that basis verbatim.

- Mozilla Trademark Guidelines, Open Source Project Guidelines, at
  https://www.mozilla.org/en-US/foundation/trademarks/policy/:
  modified code must carry its own unique identity; it must not use
  Mozilla marks in its user-facing name or branding; the sanctioned
  framing is words-only "based on Mozilla technology" plus an equally
  prominent "not officially associated" statement. Confirmed 2026-09-04.
- Eclipse Foundation Trademark Usage Policy v1.1.1, effective
  2026-03-18: project names such as Theia are Eclipse Project
  Trademarks; they must not be incorporated into the product name; the
  first and most prominent reference per page reads "Eclipse Theia"; an
  attribution sentence of the form "[marks] are trademarks of Eclipse
  Foundation AISBL" is required. Confirmed 2026-09-04.

## Confirmations recorded

- Power Browser incorporates neither the Mozilla marks nor the Eclipse
  Project Trademarks in its name, its binary, or its identifiers.
- The LOW-confidence flag on the two cited findings is lifted on the
  strength of the primary texts above, subject to the human ritual
  (still DEFERRED) confirming the `brand/` artwork itself is clean.
