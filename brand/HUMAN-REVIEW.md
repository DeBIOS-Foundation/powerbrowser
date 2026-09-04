# Brand human review record (06-03)

STATUS: SIGNED — the human review ritual below was performed and signed
2026-09-04 (see Confirmations recorded). The mechanical gate
(`scripts/verify-trademark-surface.mjs`, review-agreement section) proves
the file list on disk still equals the list recorded here; it does not
re-prove the human judgment. A new file added to `brand/` later fails
that gate until this record is re-recorded with a fresh sign-off.

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
| `brand/mark.svg` | Chris | 2026-09-04 | CONFIRMED |
| `brand/HUMAN-REVIEW.md` | Chris | 2026-09-04 | RECORD |

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
  strength of the primary texts above, the human ritual for the `brand/`
  artwork having been signed 2026-09-04.

## Sign-off 2026-09-04 (Chris)

- Opened `brand/mark.svg` and judged it by inspection: an original
  square dual-fill power-glyph mark (broken ring plus bar, arc and
  rectangle primitives, square `viewBox`, `#1a1a1a`/`#fff` fill pair) —
  no Mozilla, Eclipse, or other third-party mark in the artwork or in
  the file's comments/strings. Verdict: CONFIRMED.
- Downstream-mark remark (reviewer): the downstream project's crossed-lens
  mark belongs downstream, not to PowerBrowser; its incidental presence here
  would be tolerable for now, but none was found — the ten tracked rasters
  under `powerbrowser/branding/{dev,release}/` all read square `N×N` (the old
  downstream mark was 99×85.9 non-square), and the only downstream marks in
  the repo are the deliberate downstream-equivalent proof fixture and the
  allowed inventory mention.
