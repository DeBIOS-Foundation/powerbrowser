---
phase: 04-theia-surface-branding-extensions-telemetry
plan: 02
subsystem: theia-extensions
tags: [theia, theiaPlugins, open-vsx, download-plugins, sha256, generator]

# Dependency graph
requires:
  - phase: 02-rebrand-inputs-and-generator
    provides: scripts/generate.mjs frozen TARGETS table, config-schema validation, D-07 array-replace
  - phase: 04-theia-surface-branding-extensions-telemetry
    provides: fragment-emitter pattern + surgical copy-over precedent (04-01)
provides:
  - "Declared-extensions pipeline: [[extensions]] schema + theiaPlugins emitter (generated/theia-plugins.json)"
  - "Build download step (theia download:plugins --packed, no --ignore-errors) + sha256 pin gate (verify-extension-pins.mjs)"
  - "Pin-bootstrapping procedure for 04-04/docs"
affects: [04-03, 04-04, theia-surface-branding-extensions-telemetry]

# Actuals — pairs with the plan's `estimate` to calibrate future estimates.
actuals:
  tokens: 13900
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: ["pin gate over packed plugin archives (block equality + version segments + sha256)"]

key-files:
  created: [scripts/verify-extension-pins.mjs, generated/theia-plugins.json]
  modified: [scripts/generate.mjs, scripts/lib/config-schema.json, scripts/verify-platform.sh, theia/applications/browser/package.json, configuration.toml]

key-decisions:
  - "PACKED downloads (D-04-02-01): stock default mode decompresses vsix into plugins/<id>/ dirs leaving no hashable artifact, so the build downloads with --packed and the gate hashes plugins/<id>.vsix"
  - "Empty manifest means NO block (strict): with zero entries the tracked package.json must carry no theiaPlugins key, so removing the last entry without removing the block goes red"
  - "Every extensions validation failure names the ENTRY id (dedicated validator; generic regex loop skips extensions[] paths to avoid double-reporting)"
  - "Publisher is everything up to the FIRST dot (id pattern keeps dots out of the publisher half)"

patterns-established:
  - "Pin gate triple: generated-fragment equality + tracked-block equality + version-segment float guard + sha256 over packed archives, all derived from the manifest at check time"

requirements-completed: []

# Coverage metadata — drives DETERMINISTIC UAT routing in verify-work.
coverage:
  - id: D1
    description: "Generator resolves one openvsx + one url entry to a theiaPlugins block with two exact URLs"
    requirement: "EXT-01"
    verification:
      - kind: unit
        ref: "scripts/generate.mjs --self-test (declared extensions resolve to exact versioned URLs; 3 entry-naming fault cases)"
        status: pass
      - kind: unit
        ref: "node scripts/generate.mjs --check (48 files incl. theia-plugins.json)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Unreachable/non-200 download URL fails loudly naming the entry id, without --ignore-errors"
    requirement: "EXT-01"
    verification:
      - kind: integration
        ref: "real theia download:plugins --packed against local 404: 'x acme.gone: failed to download with: 404' + 'Errors downloading some plugins' + exit 1 (observed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Corrupted archive byte, latest-floating URL, and drifted block each go red naming the entry"
    requirement: "EXT-01"
    verification:
      - kind: unit
        ref: "scripts/verify-extension-pins.mjs --self-test (3 plants + green control)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Packed plugins bundle into a built sidecar (theia build consumes plugins/<id>.vsix)"
    requirement: "EXT-01"
    verification: []
    human_judgment: true
    rationale: "Static gates prove the download lands byte-identical packed archives and the pin math, but no full theia build ran in this static pass — the app-bundle rebuild with a real entry is deferred to end-of-roadmap verification (see Deferred Live Drill)."

# Metrics
duration: 14min
completed: 2026-09-04
status: complete
---

# Phase 04 Plan 02: Declared Extensions Summary

**`[[extensions]]` entries resolve to exact pinned download URLs at generate time, download `--packed` in the build, and verify through a three-layer pin gate — with every failure naming the entry.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-04T06:20:36Z
- **Completed:** 2026-09-04T06:34:59Z
- **Tasks:** 3 of 3
- **Files modified:** 6 tracked + 1 generated (gitignored)

## Accomplishments

- Schema carries `extensions[].id/source/version/url/sha256`; the emitter builds the `theiaPlugins` map (versioned Open VSX file URL, verbatim direct URL) into `generated/theia-plugins.json` as a new frozen TARGETS row; unpinned, missourced, or malformed entries fail generate naming the entry id.
- The application build runs `theia download:plugins --packed` with no `--ignore-errors` before the app bundle step; failure propagates through the `&&` chain.
- New `scripts/verify-extension-pins.mjs` (--quick): fragment equality, block equality, Open VSX version-segment float guard, sha256 over packed archives — all derived from the manifest, with a 3-plant `--self-test`.
- Real-CLI observations (not code-reading): a 404 URL fails with `x acme.gone: failed to download with: 404` + exit 1; a 200 serves `plugins/acme.ok.vsix` byte-identical (sha256 matches).
- Full `verify-platform.sh --quick` green (39 checks), including a transient one-entry tree proving generate → surgical block apply (add-only diff) → pin check green → preflight green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema `[[extensions]]` + URL-resolution emitter** - `80ddf6c` (feat)
2. **Task 2: Build wiring: download (loud) + sha256 gate + docs** - `35fca78` (feat)
3. **Task 3: Registry + preflight coexistence** - `c98436d` (feat)

**Plan metadata:** pending final docs commit (this SUMMARY).

## Files Created/Modified

- `scripts/lib/config-schema.json` - Five `extensions[].*` keys: id (namespaced, required), source (required, allowlist-enforced in code), version/url (conditional pins), sha256 (required, 64-hex).
- `scripts/generate.mjs` - `validateExtensionElements` (entry-naming failures), `emitTheiaPlugins` + `openVsxFileUrl`, `theia-plugins.json` TARGETS row, empty-array carve-out, 5 new self-test cases (30 total).
- `generated/theia-plugins.json` - NEW (gitignored): `{}` on today's entry-free manifest.
- `theia/applications/browser/package.json` - `download:plugins` script (`theia download:plugins --packed`) wired into `build` via `&&`.
- `scripts/verify-extension-pins.mjs` - NEW: the three-layer pin gate + `--self-test` (synthetic fixture, green control, 3 plants).
- `scripts/verify-platform.sh` - `extension-pins` pair in the --quick table; generate fault enumeration 25 → 30.
- `configuration.toml` - Comment-only pointer documenting the `[[extensions]]` contract (no entries declared).

## Decisions Made

### D-04-02-01 (PACKED downloads — the plan's one gap)

Stock `theia download:plugins` in default mode **decompresses** every archive into `plugins/<id>/` directories (proven by reading `theia/node_modules/@theia/cli/lib/download-plugins.js`: `targetPath = pluginsDir/<id>` unpacked, `<id>.vsix` only when packed). The plan's sha256 gate assumes file artifacts, which only `--packed` provides — so the build downloads packed and the gate hashes `plugins/<id>.vsix` (filename derived from the entry id, confirmed by the live drill: `plugins/acme.ok.vsix`, bytes identical). Side benefit: extension-pack/dependency auto-resolution (`findLatestCompatibleExtension` — the unpinned behavior EXT-01 forbids) walks unpacked `package.json` files and finds nothing under packed, so no unpinned transitive download can sneak in. Consequence recorded for bootstrapping docs: declare transitive deps as explicit entries. Live proof that `theia build` consumes packed archives is the deferred drill below.

### D-04-02-02 (empty manifest means NO block — strict, not normalized)

With zero entries the tracked `package.json` must carry **no** `theiaPlugins` key (not even `{}`). An absent-vs-empty normalization would pass a stale block left behind by a removed last entry; strictness makes that removal go red. Matches today's tree (no block has ever existed here).

### D-04-02-03 (entry-naming validator; generic loop skips `extensions[]`)

The generic regex loop can only name dotted paths, and `extensions[].sha256` does not say which of five entries is wrong — so `validateExtensionElements` owns all extension leaves (reading each pattern from its own schema entry, never restated) and the generic loop skips them: one value, one failure, naming the id (ordinal where the id itself is missing).

### D-04-02-04 (first-dot split; publisher half is dot-free)

The id pattern keeps dots out of the publisher half (`^[a-z0-9][a-z0-9-]*\.`), so the first dot is the namespace/name separator whatever the extension name carries. Matches Open VSX publisher naming.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] Duplicate-id rejection + generate-time archive-suffix check**
- **Found during:** Task 1 (validator design)
- **Issue:** Two entries sharing an id collapse to one map key — the loser is silently unpinned. A `url` not ending in `.vsix`/`.theia`/`.tar.gz` passes the schema but stock refuses it at build time (late failure after the download step).
- **Fix:** Duplicate ids fail generate naming the id (variant WR-08 precedent); non-archive `url` fails generate naming the entry. No new self-test cases for these two (the three plan-mandated faults each have one); covered by code + drill observation.
- **Verification:** Review of `validateExtensionElements`; full `--self-test` green.
- **Committed in:** `80ddf6c`

**2. [Rule 3 — Blocking] Empty-array carve-out in unknown-key rejection + validate guard**
- **Found during:** Task 1 (self-test: `extensions = []` rejected as unknown setting, then crashed the regex loop on a missing spec)
- **Issue:** D-07 drop-by-restating requires an explicitly emptied list to resolve; `collectLeaves` has no element to fold onto an `extensions[].*` path, so the bare path died in `rejectUnknown` — and once admitted, its spec-less leaf threw past `report()` into a stack trace.
- **Fix:** `rejectUnknown` admits an empty array where the schema declares `${path}[].*` keys (derived, not a list); the generic loop skips spec-less leaves with a comment.
- **Verification:** New holds-case `downstream empty extensions array resolves to no entries`; `--self-test` PASS (30 cases).
- **Committed in:** `80ddf6c`

---

**Total deviations:** 2 auto-fixed (1 missing-critical extension, 1 blocking)
**Impact on plan:** Both required for the plan's own guarantees (pin integrity, D-07 restatement). No scope creep: no npm/local-path kinds (EXT-02, still rejected), no `docs/REBRANDING.md` (Phase 6).

## Issues Encountered

- `spawnSync`-driven CLI drill hung with no output past `--- downloading plugins ---` (request never reached the local server; direct `fetch` and Theia `NodeRequestService` both returned 404 instantly in isolation). Re-ran with streaming `spawn` and the identical fixture completed in seconds — cause undetermined, possibly stdio/timeout interplay in the harness. The `spawn` observations stand (exit codes + artifact bytes captured); the two `spawnSync` attempts proved nothing and are not evidence.
- Preflight needed **no change**: it reads `applicationName` by regex and scans lines for identifier-form leaks, so a `theiaPlugins` block passes through untouched — proven by the transient drill (preflight PASS with the block present), not by reading the checker.

## Verification Results (static only — live drill deferred per autonomous run context)

| Check | Result |
|---|---|
| `generate --self-test` (30 cases incl. 5 new) | PASS |
| `node scripts/generate.mjs` (48 files) + `--check` | PASS |
| Real `theia download:plugins --packed` vs local 404 | FAIL as required: `x acme.gone: failed to download with: 404`, `Errors downloading some plugins`, exit 1 |
| Real `theia download:plugins --packed` vs local 200 | PASS: `plugins/acme.ok.vsix`, 128/128 bytes, sha256 matches |
| `verify-extension-pins.mjs` + `--self-test` (3 plants) | PASS (each plant red naming the entry) |
| Transient tree (1 real pinned entry "downloaded") | extension-pins PASS, preflight PASS, `--check` PASS; surgical apply an add-only 3-line diff |
| Per-plan reds: unpinned entry → generate exit 1 naming id; stock package.json + entries → pin check exit 1 naming id | Both observed red |
| `verify-platform.sh --only extension-pins[-self-test]` | PASS alone |
| `verify-platform.sh --quick` (39 checks) | PASS |
| Tree restored (`git status` clean on `configuration.toml`, `theia/`) | PASS |

## Deferred Live Drill (for end-of-roadmap verification)

Not run in this plan (no app-bundle build in the autonomous static pass). Exact drill:

```sh
# 1. Declare one small real extension (Open VSX id + exact version + bootstrapped pin):
#    [[extensions]] id = "<ns>.<name>" source = "openvsx" version = "<v>" sha256 = "<digest>"
node scripts/generate.mjs   # expect generated/theia-plugins.json -> exact versioned file URL
# 2. Surgical apply: set theiaPlugins in theia/applications/browser/package.json from the fragment (keys only)
nix develop .#theia --command bash -c "cd theia && yarn download:plugins"  # expect plugins/<ns.name>.vsix
node scripts/verify-extension-pins.mjs  # expect PASS
nix develop .#theia --command bash -c "cd theia && yarn build"  # packed-consumption proof
# 3. Start the app, confirm the extension loads and contributes
# 4. Revert the entry, regenerate, remove the block + archive
```

## Pin-Bootstrapping Procedure (for 04-04/docs → `docs/REBRANDING.md`; Phase 6 writes that file)

```sh
# 1. Pick the extension on Open VSX and fix an EXACT version (never "latest").
# 2. Fetch the archive bytes WITHOUT unpacking:
curl -sSL -o /tmp/entry.vsix 'https://open-vsx.org/api/<ns>/<name>/<version>/file/<ns.name>-<version>.vsix'
#    (direct-URL source: curl the vendor's archive link instead)
# 3. Pin the bytes:
sha256sum /tmp/entry.vsix   # 64 lowercase hex digits
# 4. Declare it in configuration.toml:
#    [[extensions]]
#    id = "<ns>.<name>"        # publisher dot name
#    source = "openvsx"         # or "url" + url = "https://..."
#    version = "<version>"      # openvsx only; exact, never a range
#    sha256 = "<digest>"        # always required
# 5. node scripts/generate.mjs, then copy ONLY the theiaPlugins block into
#    theia/applications/browser/package.json (leave every sibling byte-identical).
# 6. Download (theia dev shell): yarn --cwd theia download:plugins
# 7. node scripts/verify-extension-pins.mjs  # must be green
# Notes: transitive deps are NOT auto-resolved under packed downloads — declare
# each one as its own entry. Re-pin by repeating 2-3 whenever the version changes.
```

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: build-time-network | theia/applications/browser/package.json | `build` now fetches arbitrary https bytes (manifest-declared URLs) into the sidecar; pins + `--packed` + no `--ignore-errors` bound it, but a malicious manifest URL is a supply-chain input — Phase 7 downstreams inherit this trust |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 04-03/04-04 build on D-04-02-01: the `theiaPlugins` block is a second brand-owned region of the application `package.json` alongside 04-01's `applicationName` fragment; any future emitter touching that file must preserve both blocks.
- 04-04 carries the bootstrapping procedure above into `docs/REBRANDING.md` (Phase 6 writes the file).
- The deferred live drill above is the one unverified half of this plan; run it at end-of-roadmap verification before declaring EXT-01 green (hence `requirements-completed: []`).

## Self-Check: PASSED

- Created files found: `scripts/verify-extension-pins.mjs`, `generated/theia-plugins.json`.
- Task commits present: `80ddf6c`, `35fca78`, `c98436d` (all in `git log`).
- Working tree: `configuration.toml` + `theia/` clean; `generated/theia-plugins.json` = `{}` matching the entry-free manifest.

---
*Phase: 04-theia-surface-branding-extensions-telemetry*
*Completed: 2026-09-04*
