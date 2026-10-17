---
phase: 21-panorama-spec-and-gui08-checks
plan: 01
subsystem: verification
tags: [panorama, ui-spec, gui08, parse, docs]
status: complete
requires:
  - phase: 20-non-gui-gaps
    provides: "Phase 20 complete (20-05-SUMMARY.md present)"
provides:
  - "scripts/lib/ui-spec.mjs: the one UI-SPEC parse for both gui08 checks (specSection, tableRows, boldLiterals, copyContract, normaliseSlots, geometryRows, typography, stripCssComments, ruleBodies, topLevelNumericConsts, resolveConst, geometryDiff)"
  - "15-UI-SPEC re-pinned to the shipped Panorama redesign 7b7a1f7 (PAN-01 criterion 1)"
affects: [21-03, 21-04, 21-05]
tech-stack:
  added: []
  patterns:
    - "Spec machine rows by Key shape: identifiers joined by ' × ' are const rows, a backticked selector plus a property is a CSS row, anything else is prose"
    - "Value numbers are read before the first '(' so explanation lives in parentheses"
    - "CSS lookup is scoped to rules whose whole selector list equals the selector (min-height never matches height)"
key-files:
  created:
    - scripts/lib/ui-spec.mjs
  modified:
    - .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
decisions:
  - "The Copywriting Contract is one Element | Copy table plus a '### Retired copy' table; the bare word Ungrouped stays plain text in the Retired table so the negated search cannot hit listUngrouped"
  - "resolveConst falls back to a 'name: <number>' property only when no const definition exists, which is how targetWidth in PowerBrowserAPI.sys.mjs resolves"
  - "Checker Sign-Off keeps the 2026-09-06 approval and states that the re-pinned file was not re-run through gsd-ui-checker"
metrics:
  duration: "about 25 min"
  completed: 2026-10-17
estimate:
  tokens: 40000
  tasks: 2
actuals:
  tokens: 17800
  tasks: 2
  commits: 2
plan_head_before: 0b6ae33c15b48e63fb1fa6359eaff3e3996e5616
plan_head_after: e0ea7932cab777d27a9aadb2d5a2453de64d068d
---

# Phase 21 Plan 01: 15-UI-SPEC re-pin and shared parse module Summary

15-UI-SPEC now describes the Panorama that shipped in `7b7a1f7`: a Canvas Geometry table of 18 const rows and 7 CSS rows, the 12/13/14 typography, one copy contract that includes "Expand" and "Done", and a Retired copy table. `scripts/lib/ui-spec.mjs` parses those sections for both gui08 checks, and its `geometryDiff` returns no failures against the tree. Three planted drifts each fail and name the drift.

## Results

- Task 1 verify (re-run after both commits): `21-01 parse form: PASS -- 18 const rows, 7 CSS rows, 29 contract literals, 4 retired`
- Planted drift messages:
  - `row 'LOOSE_W × LOOSE_H': LOOSE_W is 160 in the tree, the spec says 170`
  - `undeclared canvas constant TILE_GAP (theia/extensions/modes/src/browser/organising-tiling.ts)`
  - `` row '`.pb-org-card-thumb` height': .pb-org-card-thumb height is '125px' in theia/extensions/modes/src/browser/modes.css, the spec says 124px ``
  - With the heading stripped, the result is `Canvas Geometry has ZERO const rows -- broken instrument` and the same for CSS rows
- Task 2 verify: exit 0. Outside the Retired copy table there is no tray, auto-box, 160×90, 144px tall or Search tabs text. Provenance names the Phase 21 re-pin to `7b7a1f7`. All ten `##` headings are present and E4 is loose cards. The parse still holds.
- `node scripts/scan-brand-residue.mjs`: exit 0, run with the files staged. `python3 scripts/phase-gate.py --root .`: printed nothing after each commit.
- `git show --stat` lists two files for 38d0893 and one file (the spec) for e0ea793.
- This plan ran no `scripts/verify-platform.sh`, as the wave rules require.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 (tracer) parse module and machine sections | 38d0893 | scripts/lib/ui-spec.mjs, 15-UI-SPEC.md |
| 2 rest of the spec re-pinned | e0ea793 | 15-UI-SPEC.md |

`git rev-list --count 0b6ae33..HEAD` returns 3 because 21-02's 89a2b20 landed between the two task commits. Only the 2 commits listed above belong to 21-01, and `git log --grep='(21-01)'` over that range returns 2.

## Deviations from Plan

None. The plan was executed as written. Notes on wording:

- The interaction heading is now `## Interaction Contract`. The old suffix "(GUI-08, net-new)" was dropped because it framed the section as a change.
- 21-UI-SPEC A3 / R4 state that loose cards show when there are zero groups. The contract carries that as a stated requirement, without the 21-UI-SPEC remark "HEAD does not do this yet". The code for it lands later in this phase, and 21-05 proves it live.
- To avoid naming a removed mechanism, the card-drag reason reads "native drag and drop does not run inside the remote `<xul:browser>`" and not "HTML5 DnD". The card-on-loose-card case is stated as present behaviour: the card lands on the field.
- Zoom and Tree subsections were kept from the old spec where they still hold: the 25-200% range, the transform-only scaling, and tree sections over 32px rows. They agree with the 21-UI-SPEC geometry and E5 rows.
- The 21-UI-SPEC "Required changes" and "No-Regression Surfaces" tables were not carried, because they are change-log and phase-gate material, not contract. The `BACKSTOPS` paragraph was left out for the same reason.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: scripts/lib/ui-spec.mjs
- FOUND: .planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md
- FOUND: 38d0893, e0ea793 (both ancestors of HEAD)
