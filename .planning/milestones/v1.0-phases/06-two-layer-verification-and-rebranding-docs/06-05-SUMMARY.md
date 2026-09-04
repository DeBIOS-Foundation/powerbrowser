---
phase: 06-two-layer-verification-and-rebranding-docs
plan: 05
subsystem: docs
tags: [doc-01, rebranding-guide, doc-coverage-gate, verify-platform]

# Dependency graph
requires:
  - phase: 06-two-layer-verification-and-rebranding-docs
    provides: 06-03 trademark basis (mandated Mozilla non-association wording, Eclipse attribution form, HUMAN-REVIEW.md ritual)
  - phase: 02-configuration-manifest-and-generator-core
    provides: configuration.toml manifest plus generate.mjs resolveConfig and config-schema.json
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: theia fragment emissions, telemetry levels, endpoint-hosts derivation the reference half documents
provides:
  - docs/REBRANDING.md stranger walkthrough plus every-field reference
  - verify-rebranding-docs coverage gate with planted-fault self-test and two registry rows
affects: [06-06-ci-wiring, downstream-rebrand]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 6700
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: [schema-derived-doc-coverage, exact-span-field-match, mutated-copy-self-test]

key-files:
  created: [docs/REBRANDING.md, scripts/verify-rebranding-docs.mjs]
  modified: [scripts/verify-platform.sh]

key-decisions:
  - "Field list derived from the schema JSON generate.mjs itself reads, not a second hand-kept list"
  - "Exact backtick-span match per field so product.homepage cannot cover urls.homepage"
  - "about:support pointer refused: the shell has no about-page reachability, so the guide points at the --profile launch path and supervisor state file instead"
  - "product.description, legal.license and legal.copyright_holder documented as validated-but-unemitted rather than inventing surfaces for them"

patterns-established:
  - "Schema-derived doc coverage: the gate reads the generator's known-setting table at check time, so a new setting without a guide row fails"
  - "Mutated-copy self-test: plants are string removals on the real guide through the same pure checkDocs function main uses"

requirements-completed: [DOC-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Stranger walkthrough runs clone to branded build with paste-able commands (prerequisites, generate-first ordering, fetch, config edit, logo contract, generate --check, tier-3 pointer, --quick plus six-surface identity proof)"
    requirement: "DOC-01"
    verification:
      - kind: manual_procedural
        ref: "stranger-read task 3: every command and path confirmed against the tree"
        status: pass
    human_judgment: true
    rationale: "A reader with no prior knowledge of the tree following the guide end to end is a human walkthrough by definition; automation pins every command and path it names instead"
  - id: D2
    description: "Every configuration.toml field documented; an undocumented field or missing walkthrough command fails the gate naming it"
    requirement: "DOC-01"
    verification:
      - kind: unit
        ref: "scripts/verify-rebranding-docs.mjs#PASS 35/35 fields, 4 commands"
        status: pass
      - kind: unit
        ref: "scripts/verify-rebranding-docs.mjs --self-test#field-removal and command-removal plants red naming each"
        status: pass
    human_judgment: false
  - id: D3
    description: "Downstream trademark, profile-migration, and fixed-identifier obligations stated in the guide"
    requirement: "DOC-01"
    verification:
      - kind: unit
        ref: "scripts/verify-rebranding-docs.mjs#obligation sections carry their field and command anchors (35/35 PASS)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No byte-identical generator surface changed; full --quick table stays green with the two new rows"
    requirement: "DOC-01"
    verification:
      - kind: manual_procedural
        ref: "scripts/verify-platform.sh --quick (60 PASS rows, all checks passed)"
        status: pass
    human_judgment: false

# Metrics
duration: 30min
completed: 2026-09-04
status: complete
---

# Phase 6 Plan 05: Rebranding Docs and Coverage Gate Summary

**Stranger walkthrough plus 35-field reference in `docs/REBRANDING.md`, pinned by a schema-derived coverage gate with two registry rows, full `--quick` green**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-04T09:35:00Z (approx)
- **Completed:** 2026-09-04T10:05:00Z (approx)
- **Tasks:** 3 auto complete
- **Files modified:** 3

## Accomplishments
- `docs/REBRANDING.md` (299 lines): numbered clone-to-branded-build walkthrough with paste-able commands plus a reference table over all 35 schema fields grouped by section (required vs defaulted, omission behavior with generate-time echo, reached surfaces)
- `scripts/verify-rebranding-docs.mjs` (252 lines): honestly `--quick` static gate deriving the field list from the generator's schema table at check time, exact-span field match, code-span command pins, three distinct non-vacuity failures, `--self-test` with field-removal and command-removal plants
- Two registry rows (`verify-rebranding-docs`, `verify-rebranding-docs-self-test`) proven via `--only`, then the full `--quick` set green
- Stranger-read confirmations logged below; two genuine gaps fixed in place with the gate re-run green

## Task Commits

Each task was committed atomically (tasks 1 and 3 share one file, so they share one commit):

1. **Tasks 1+3: Write and stranger-read docs/REBRANDING.md** - `ac527d5` (docs; includes the two task-3 gap fixes below)
2. **Task 2: Land the doc-coverage gate and register it** - `5fb1029` (feat)

**Plan metadata:** covered by the task commits above (no separate docs commit; SUMMARY commit follows)

## Files Created/Modified
- `docs/REBRANDING.md` - Walkthrough half (prerequisites with shell map, generate-first ordering, fetch, config edit, vendor-split and fixed-identifier map, logo contract, tier-3 pointer, `--quick` plus six-surface proof) and reference half (35 rows across 9 section tables) plus downstream obligations
- `scripts/verify-rebranding-docs.mjs` - Coverage gate: `checkDocs` pure function, `resolveConfig` manifest-red short-circuit, `codeSpans`/headings matchers, mutated-copy self-test
- `scripts/verify-platform.sh` - Two registry rows with the 06-05 comment block beside the other static rows

## Decisions Made
- Field list derived from `scripts/lib/config-schema.json` — the exact file `generate.mjs` reads as `SCHEMA_KEYS` — plus the generator's own `resolveConfig` import for the manifest-red short-circuit, so the checker references `generate.mjs` and keeps no second list
- Exact backtick-span match per dotted path: `product.homepage` cannot cover `urls.homepage`, and a longer span carrying the path as substring does not count
- `product.description`, `legal.license`, `legal.copyright_holder` documented honestly as validated-but-unemitted (grep over `generate.mjs` shows no emitter consumer) rather than inventing surfaces for them
- Task-3 `about:support` pointer refused: `verify-branding-identity.mjs` records the shell has no about-page reachability, so the profile-migration step points at the `--profile` launch path and the supervisor state file instead

## Deviations from Plan

None - plan executed exactly as written. (Task 3's two in-place gap fixes are planned work under "fix real gaps in place", not deviations.)

## Issues Encountered

- **Stranger-read gap 1 (fixed):** profile-migration step pointed at the built browser's support page for the current profile directory, but the shell has no about-page reachability (recorded in `verify-branding-identity.mjs`). Rewrote the locator to the `--profile` launch path plus `sidecar-state-<profile>.json`; gate re-run green.
- **Stranger-read gap 2 (fixed):** walkthrough named only the Gecko tier-3 build while "branded build" of the whole product includes the Theia sidecar rebuild. Added the `nix develop .#theia` / `yarn build` pointer at `docs/BUILD.md`; gate re-run green (new spans collide with no schema key and remove no required command).
- No stubs introduced; no new network/auth/file-access surface. The guide is prose, the gate reads text files only.

## Stranger-Read Confirmations (Task 3 log)

- Every walkthrough command resolves: `node scripts/generate.mjs`, `node scripts/generate.mjs --check`, `scripts/fetch-upstream.sh`, `nix develop .#firefox` / `.#theia`, `MOZCONFIG=../.mozconfig ./mach build`, `scripts/verify-platform.sh --quick`, `node scripts/verify-branding-identity.mjs` — all exist with the flags shown
- Generate-first ordering is real: `fetch-upstream.sh` sources `generated/upstream-pins.env` and fails naming the generate re-run without it
- Fetch cost "5.6 GB, roughly 7–11 minutes" matches `docs/BUILD.md` (438s/677s clones, 5.6 G tree)
- Logo contract matches the preflight pins: square `viewBox="0 0 128 128"`, dual-fill theme rule, one-line `<svg>` byte-equal to `POWERBROWSER_MARK_SVG`
- Six surfaces named match `verify-branding-identity.mjs`: executable, application-ini, runtime-identity, brand-full-name, desktop-entry, version
- All 35 reference rows match `config-schema.json` keys; required flags, defaults, and surface claims verified against `generate.mjs` emitters (identity.configure, locale, mozconfig, desktop, NSIS/Appx/plist/tile fragments, theia fragments, endpoint hosts, upstream pins, plugins map)
- No step assumes `.planning/` or prior-phase knowledge; the guide names the product as Power Browser throughout and never spells the originating-product token (residue scan green over 139 files with the new files staged)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 06-06 CI wiring consumes the new registry labels (`verify-rebranding-docs` and its self-test) like every other row
- The deferred 06-03 human artwork ritual is referenced by the guide's obligations (`brand/HUMAN-REVIEW.md` sign-off) and unaffected
- D1 human walkthrough stays end-of-roadmap per the standing verification-deferral instruction

## Self-Check: PASSED
- `docs/REBRANDING.md` FOUND (299 lines, min 200); `scripts/verify-rebranding-docs.mjs` FOUND (252 lines, min 80); `scripts/verify-platform.sh` contains `verify-rebranding-docs` (2 rows plus comment block)
- Commits `ac527d5`, `5fb1029` FOUND in log, no deletions in either
- `verify-rebranding-docs` PASS (35/35, 4 commands); `--self-test` PASS (2 plants); `--only` both rows PASS; full `--quick` PASS (60 PASS rows, all checks passed); `scan-brand-residue` PASS (139 files, new files staged)

---
*Phase: 06-two-layer-verification-and-rebranding-docs*
*Completed: 2026-09-04*
