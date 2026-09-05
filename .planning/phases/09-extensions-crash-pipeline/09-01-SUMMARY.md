---
phase: 09-extensions-crash-pipeline
plan: 01
subsystem: extensions
tags: [theia-plugins, npm, local-path, pin-gate, fail-loud]

# Dependency graph
requires:
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: [EXT-01 one-fragment copy-over pin-verify chain, emitTheiaPlugins, verify-extension-pins gate]
  - phase: 08-installer-hardening-canonical-rename
    provides: [verify-platform.sh registry discipline, drill conventions]
provides:
  - npm and local-path source kinds end to end through schema, validation, resolution, fragment emission, and the pin gate
  - npm tarball-URL version-suffix float guard plus local-path absent-or-unpackable fail-loud check
  - downloader-placeholder verbatim-passthrough proof in the generator self-test
affects: [09-04 live download and tier-3 fixture builds, webextensions declaration, crash collector]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 11075
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns: [resolver-branch dispatch per source kind, sink-guarded resolver inputs, version-suffix float guard]

key-files:
  created: []
  modified: [scripts/generate.mjs, scripts/lib/config-schema.json, scripts/verify-extension-pins.mjs, docs/REBRANDING.md]

key-decisions:
  - "npm tarball URL composed in the conventional registry layout with the entry id as package name; registry confirmed authoritative at pin-bootstrap via npm view"
  - "local-path emits a packed-archive reference (<path>.tgz); the pin covers packed bytes only, never a directory listing"
  - "Sink guard applied to resolver inputs, never to emitted URLs, so the downloader placeholder survives verbatim"

patterns-established:
  - "Per-kind resolver branch in emitTheiaPlugins dispatch position with the entry-shape guard reading EXTENSION_SOURCES so the two cannot disagree"
  - "npm float control split in two: tarball-URL equality (block equality) plus -<version>.tgz suffix guard, each with its own red-naming plant"

requirements-completed: [EXT-02]

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Synthetic npm entry generates a pinned registry-tarball fragment line and floated latest/version-range inputs fail loud naming the entry"
    requirement: "EXT-02"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --self-test#npm extension entry with a floating latest version"
        status: pass
      - kind: unit
        ref: "node scripts/verify-extension-pins.mjs --self-test#npm float plant red naming acme.npmpack"
        status: pass
    human_judgment: false
  - id: D2
    description: "Synthetic local-path entry generates a packed-archive fragment line and an absent source folder fails the pin gate naming the entry"
    requirement: "EXT-02"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --self-test#declared extensions resolve to exact versioned URLs"
        status: pass
      - kind: unit
        ref: "node scripts/verify-extension-pins.mjs --self-test#local-absence plant red naming acme.localtool"
        status: pass
    human_judgment: false
  - id: D3
    description: "Target-placeholder URL reaches the emitted fragment byte-verbatim with no generator-host platform literal"
    requirement: "EXT-02"
    verification:
      - kind: unit
        ref: "node scripts/generate.mjs --self-test#target placeholder in a direct URL reaches the fragment verbatim"
        status: pass
    human_judgment: false
  - id: D4
    description: "Commit gate stays green over the extended chain"
    requirement: "EXT-02"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --quick#PASS all checks passed"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-09-05
status: complete
---

# Phase 09 Plan 01: Static EXT-02 Tracer Summary

**Synthetic npm plus local-path entries generate pinned theiaPlugins lines, floated and absent inputs fail loud naming the entry, and the downloader placeholder passes through verbatim — zero network, commit gate green.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-05T07:49:19Z
- **Completed:** 2026-09-05T07:57:57Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Four-kind `EXTENSION_SOURCES` allowlist with npm exact-pin (`latest` + range rejection) and local-path presence branches, every failure naming the entry id
- `npmDistTarballUrl` and `localPackRef` resolvers in the emit dispatch with sink-guarded inputs; entry-shape guard reads the same allowlist const
- Pin gate extended in place: `.tgz`-to-`.tar.gz` suffix mapping, npm `-<version>.tgz` float guard, local-path absent-or-unpackable failure; 7 self-test plants all red-naming with control-green-first
- Generator self-test at 53 cases proving the four exact URLs, placeholder verbatim passthrough, and per-key malformed rejection

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end synthetic npm plus local-path slice through schema, resolver, and pin gate** - `3c63cc9` (feat)
2. **Task 2: Schema key shapes for npm integrity and local-path plus webextensions-ready conditional logic** - `7726324` (feat)
3. **Task 3: Pin-gate plants for npm float and local-path absence with byte-identity held** - `d3d14a8` (feat)

**Plan metadata:** `{summary-commit}` (docs: complete plan)

## Files Created/Modified
- `scripts/lib/config-schema.json` - `extensions[].integrity` (SRI sha512 shape) and `extensions[].path` (relative-path shape) keys
- `scripts/generate.mjs` - four-kind allowlist, npm/local-path conditional-pin branches, two resolvers, extended fixture block plus 8 new discriminator cases and the placeholder control
- `scripts/verify-extension-pins.mjs` - suffix mapping, npm float guard, local-path absence check, four-entry fixture plus 4 new plants (npm float, local absence, npm hash, npm drift)
- `docs/REBRANDING.md` - reference rows for the two new schema keys (Rule 3 fix: the derived docs-coverage gate failed without them)

## Decisions Made
- npm tarball URL composed in the conventional registry layout (`https://registry.npmjs.org/<id>/-/<id>-<version>.tgz`) with the entry id as the package name; the registry stays authoritative at pin-bootstrap time via `npm view dist.tarball/dist.integrity`, and scoped packages (unspellable in the id shape) stay out of scope for this tracer.
- Local-path emits `<path>.tgz` as its packed-archive reference; the pin covers packed bytes only, satisfying the no-raw-directory-listing prohibition without a tar writer in the gate.
- Sink guard applied to resolver inputs (id/version/path, all `$`-free by schema shape), never to emitted URLs — guarding a URL would reject the legitimate `${targetPlatform}` placeholder.
- `configuration.toml` left untouched: its `[[extensions]]` comment block now under-describes the four kinds, but the file is outside this plan's file list and plan 09-04 owns live entries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added REBRANDING.md rows for the two new schema keys**
- **Found during:** Task 1 (tracer slice verification via `--quick`)
- **Issue:** `verify-rebranding-docs` derives its expectation from the schema at check time: 2 new keys with no doc rows went red (`FAIL -- 2 problem(s) across 37 schema field(s)`), failing the task's `--quick` verify leg
- **Fix:** Added `integrity` and `path` reference rows and updated the `source`/`version`/`url` rows to the four-kind behavior
- **Files modified:** docs/REBRANDING.md
- **Verification:** `scripts/verify-platform.sh --quick` PASS, `--only verify-rebranding-docs` PASS
- **Committed in:** 3c63cc9 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Gate-imposed doc sync, no scope creep. No new packages, no network touched.

## Issues Encountered
- None beyond the docs-gate sync above (resolved inline, first attempt).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tracer slice proven statically; plan 09-04 can run the same resolver code live (registry `npm view` confirmation, per-target downloads, tier-3 fixture builds).
- Open (known, out of scope): proxy-moved npm tarballs outside the conventional layout would trip the suffix guard — pin-time `npm view` confirmation is the documented control.

## Self-Check: PASSED
- All four modified files exist on disk.
- All three task commits plus this metadata commit exist (`git log --oneline` shows `3c63cc9`, `7726324`, `d3d14a8`).
- Task verify lines re-run green on the final tree: generate self-test (53 cases PASS), pin self-test (7 plants REJECTED + PASS), `--quick` PASS, `--check` PASS, `--only extension-pins-self-test` PASS.

---
*Phase: 09-extensions-crash-pipeline*
*Completed: 2026-09-05*
