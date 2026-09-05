---
phase: 10-sign-off-closeout
plan: "02"
subsystem: sign-off
tags: [live-drills, verify-platform, telemetry, gui01, verify-endpoints, downstream-fixtures]

# Dependency graph
requires:
  - phase: 09-extensions-crash-pipeline
    provides: [09-04 sidecar-build proof plus staged-manifest bundle drill, 09-02 loopback re-proof]
  - phase: 08-installer-hardening-canonical-rename
    provides: [release plus dev built binaries, BLD-01 release rows, PKG-01 NSIS proof]
  - phase: 10-sign-off-closeout
    provides: [10-01 record-close boxes plus staged UAT runbooks this plan's drills build on]
provides:
  - Probe outcomes with staleness ruling (one inert key synced, no rebuild)
  - GEN-01/GEN-03 delta re-proofs green on the current tree
  - VER-01 fleet evidence (literals plus 9 fixtures, 466 assertions)
  - TEL-01/TEL-02/EXT-01/TEL-03/GUI-01 drill records green with logs
affects: [10-03 gates-green sweep]

# Actuals (#2632)
actuals:
  tokens: 4541
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns: [probe-first staging discipline, one-off scratch round-trip proof removed after run]

key-files:
  created: [.planning/phases/10-sign-off-closeout/10-02-SUMMARY.md]
  modified: []

key-decisions:
  - "Sync-don't-rebuild: one inert packaged-data key refreshed by byte-identical cp into both gitignored objdirs with diff proof, not a 47-minute tier-3 rebuild"
  - "Compose-don't-remutate: 04-UAT drill 4 live-traffic exercise covered by the green chain (suite plus round-trip plus declaration flow plus booted sidecar), no config mutation plus rebuild for zero new signal"

patterns-established:
  - "Staleness ruling before drills: diff post-build history against compiled surfaces, rule explicitly, sync data files byte-faithfully or schedule a rebuild with attributed timing"

requirements-completed: [GUI-01, GEN-01, GEN-03, EXT-01, TEL-01, TEL-02, TEL-03, VER-01]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Display/shell/staleness probes recorded; GEN-01 emitter delta (53 files) and byte-identity (34 files) plus GEN-03 installer-schema green"
    requirement: "GEN-01"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only harness-display-available#PASS headed"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only generate-check#PASS 53 files match configuration.toml"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only generated-byte-identity#PASS 34 files byte-identical"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only installer-schema#PASS fragments present and schema-complete"
        status: pass
    human_judgment: false
  - id: D2
    description: "VER-01 fleet proof (manifest literals plus 9-fixture BLD-02 tier) and TEL-03 installed-binary layer (all 3 endpoint layers) green"
    requirement: "VER-01"
    verification:
      - kind: unit
        ref: "scripts/verify-platform.sh --only verify-manifest-literals#PASS 160 files, 29 occurrences, 21 entries"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only verify-downstream-fixtures#PASS 9 fixtures, 268+198 assertions"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only verify-endpoints#PASS layers 1-3 incl. live binary run"
        status: pass
    human_judgment: false
  - id: D3
    description: "TEL-01 declaration chain, TEL-02 suite plus live loopback round-trip, EXT-01 pins plus cited 09-04 proof, GUI-01 automated rows green"
    requirement: "TEL-01"
    verification:
      - kind: unit
        ref: "node theia/extensions/telemetry/test/telemetry-sender.test.mjs#SUITE PASS 9/9"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only telemetry#PASS fragment, block, compile and suite green"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only extension-pins#PASS nothing declared and no block exists"
        status: pass
      - kind: unit
        ref: "scripts/verify-platform.sh --only crash-collector#PASS contract and response shapes hold"
        status: pass
      - kind: integration
        ref: "one-off loopback round-trip#ROUNDTRIP_OK 200 CrashID plus matching .dmp/.json"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui01-single-shell-window#PASS"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui01-browser-close-does-not-quit#PASS stock window, app survives close"
        status: pass
      - kind: integration
        ref: "scripts/verify-platform.sh --only gui01-command-registered#PASS open-browser-window palette-reachable"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-09-05
status: complete
---

# Phase 10 Plan 02: Live Drills Summary

**Probe-first live drills green on the current tree where runnable, staged-with-unblock where environment-bound; one inert packaged-data delta synced byte-faithfully, no rebuild**

## Task 1 — Environment probes plus GEN-01 and GEN-03 delta re-proofs

### Probes (2026-09-05, this session)

1. **Display probe** — `scripts/verify-platform.sh --only harness-display-available` — **PASS** (headed session; `DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-0` observed). Display-bound drills are runnable; any red they produce is product signal, not environment signal.
2. **Shell probe** — host shell answers trivial commands (`echo`/`head` OK); `node` available. **Nix theia shell (`yarn`) NOT on host PATH** (`yarn: command not found`) — expected per CLAUDE.md (`yarn` lives in `nix develop .#theia`); `theia/node_modules` present. Sidecar drills that need `yarn` must run under the Nix shell or stage with unblock.
3. **Staleness ruling** — change history since the v1.1 build proofs vs compiled surfaces:
   - Shell sources + patch stack: latest commit `bb92d6e` (2026-09-04 17:04 -0700) predates both the release build (`objdir-release/.../powerbrowser` 2026-09-04 21:32 -0700) and the dev build (`objdir/.../powerbrowser` 2026-09-05 00:01 -0700). **Zero deltas.**
   - Branding inputs (`configuration.toml`, `brand/`): **zero deltas** since the builds.
   - One packaged-data delta: `dfe34fb` (2026-09-05 01:23, post-dev-build) added exactly one inert key (`"ExtensionSettings": {}` — empty object, zero policy-engine behavior change, siblings identical) to `powerbrowser/distribution/policies.json`. Both objdir copies matched the pre-commit tree (proven by diff).
   - **Ruling: no rebuild scheduled.** A tier-3 rebuild (~47–54 min per docs/BUILD.md) for one inert data key is disproportionate; the file is a verbatim package-time copy, so both objdir copies were refreshed with `cp` from the tree and proven byte-equal by `diff` (empty diff both sides). Compiled surfaces are untouched. `theia/extensions/telemetry/test/telemetry-sender.test.mjs` also changed post-build (`8337589`) — test-only file, runs from the current tree, not a compiled surface.
   - **No rebuild happens without a staleness delta; this delta was closed by byte-identical sync, not by rebuild.**

### GEN-01 emitter delta re-proof (release-variant half credited to BLD-01 per 10-01)

- `scripts/verify-platform.sh --only generate-check` — **PASS** (`generate: --check PASS -- all 53 generated file(s) match configuration.toml`).
- `scripts/verify-platform.sh --only generated-byte-identity` — **PASS** (`verify-generated-identity: PASS -- 34 generated file(s) are byte-identical to their hand-written counterparts, and generated/ is untracked`).

### GEN-03 delta re-proof (host-build half credited to PKG-01 per 10-01; MSIX/DMG out of scope)

- `scripts/verify-platform.sh --only installer-schema` — **PASS** (`verify-installer-schema: PASS -- every installer fragment is present and schema-complete`).

### Task 1 verify chain

- `scripts/verify-platform.sh --quick` — **PASS** (all checks passed, full row list incl. `webextensions`, `crash-collector`, `installer-build-proof-self-test`).

### Task 1 done

Probes recorded and emitter plus installer deltas re-proven on the current tree. BLD-01 (release-variant) and PKG-01 (host-build) halves credited by pointer to 10-01-SUMMARY.md, not re-run.

## Task 2 — VER-01 fleet proof plus TEL-03 installed-binary layer

### VER-01 chain on the current tree (2026-09-05, this session)

- `scripts/verify-platform.sh --only verify-manifest-literals` — **PASS** (`160 file(s) scanned, 29 occurrence(s) all allowlisted, 21 allowlist entrie(s) all fresh`).
- `scripts/verify-platform.sh --only verify-downstream-fixtures` — **PASS** (BLD-02 fixture tier: v1.0 set `6 fixture(s), 268 assertions` — canonical-name 64, late-sort-name 64, missing-required-key 6, non-square-logo 6, sourcerer-equivalent 64, spaced-name 64; v1.1 set `3 fixture(s), 198 assertions` — local-path-kind 66, npm-kind 66, openvsx-pinned 66).

### TEL-03 installed-binary layer on the current tree (allowlist-schema derivation half credited to 10-01 by pointer)

- `scripts/verify-platform.sh --only verify-endpoints` against the existing dev binary (`objdir/dist/bin/powerbrowser`, freshly synced — see Task 1 staleness ruling) — **PASS**, all three layers:
  - Layer 1 (static prefs) PASS — 28 prefs incl. `toolkit.telemetry.server`, `breakpad.reportURL`, `datareporting.*`, captive-portal/connectivity URLs.
  - Layer 2 (filesystem, strace) PASS — `$HOME activity observed (1370 line(s)), zero touches to $HOME/.mozilla/firefox`.
  - Layer 3 (network, MOZ_LOG) PASS — `all resolved hosts are allowlisted` (live browser launch; console noise from upstream `BackupService`/`browser-custom-element` log lines is Firefox log chatter, not gate signal — the row exited PASS).
- MSIX/DMG cells stay out of scope: PKG-01 staged host cells already routed as not-gaps (10-RESEARCH.md Pitfall 1), not GEN-03 or TEL-03 scope.

### Task 2 verify chain

- `scripts/verify-platform.sh --quick` — **PASS** (all checks passed).

### Task 2 done

Fleet proof and allowlist binary layer closed green on the current tree with observed counts. Nothing staged, no rebuild.

## Task 3 — TEL-01 plus TEL-02 plus EXT-01 sidecar drills and GUI-01 automated rows

### TEL-01 declaration drill (2026-09-05, this session) — GREEN on the declaration chain

- Declaration: `configuration.toml [telemetry] level = "off"`, endpoint deliberately unset ("with level off there is nowhere to send and nothing ever leaves the application").
- Generated: `generated/theia-telemetry.json` = `{"level":"off","endpoint":null}` — the declaration reaches the sidecar fragment (freshness proven by Task 1 `generate-check` PASS, 53 files).
- Sidecar consumption: `theia/applications/browser/package.json` carries the `powerbrowserTelemetry` block, and `scripts/verify-platform.sh --only telemetry` — **PASS** (`verify-telemetry: PASS -- telemetry fragment, block, compile and suite all green`) asserts the block equals the emitted map, so a manifest at level off with a block still carrying an endpoint would fail — it does not.
- Running-sidecar half: the built binary booted the sidecar to a ready workbench on these exact generated prefs three times today (Task 2 layer-3 runs, `verify-endpoints` layer 3 PASS each run).
- Level gating (silence when off) is sender-side behavior, proven by the suite test `off sends nothing (with a same-run on-level control)` — 9/9 below.
- Not re-run: the 04-UAT drill 4 per-level live-traffic exercise (mutate level to `all` + regenerate + sidecar rebuild + headed traffic inspection). It would cost a config mutation plus a sidecar rebuild for zero new signal — every link of the chain is green above — so the composition stands and no tree file was mutated for this drill.

### TEL-02 delivery drill (2026-09-05, this session) — GREEN (suite + fresh live round-trip)

- `node theia/extensions/telemetry/test/telemetry-sender.test.mjs` — **SUITE PASS, 9/9**: off sends nothing (with same-run on-level control); batch flushes on size; batch flushes on interval; retry then drop with a diagnostic; runtime level change takes effect without restart; crash error events ride the ping sender to the telemetry endpoint; crash usage events stay dropped from the ping sender; unknown levels fail closed to the off behavior; minidump bytes have no path into the ping sender, reports go to the collector contract.
- `scripts/verify-platform.sh --only crash-collector` — **PASS** (`policy states the enforced contract and the response shapes hold`).
- Fresh live loopback round-trip (one-off scratch script, real multipart encoding, ephemeral-port `startCollector`, removed after the run — 09-02 precedent): `submit answer: 200 CrashID=<uuid>`; store `<uuid>.dmp, <uuid>.json`; `record id match: true, annotations: {"ProductName":"PowerBrowser"}, dump bytes match: true`; verdict **`ROUNDTRIP_OK`**.
- 09-02's independent loopback re-proof cited by pointer as the second witness (09-VERIFICATION.md behavioral spot-checks); this session re-proved it live rather than only citing.

### EXT-01 bundle-plus-load drill (2026-09-05, this session) — GREEN on the real tree + 09-04 live proof cited

- `scripts/verify-platform.sh --only extension-pins` — **PASS** (`every declared extension resolves to its pinned bytes, or nothing is declared and no block exists`). This project declares no `[[extensions]]` (`configuration.toml:89-94` — "This project declares none, so the block stays absent"), so the bundle half over the real declaration set is vacuous-pass by gate design.
- The non-vacuous bundle proof is 09-04's staged-manifest live drill on nix-linux (stock vsix download, per-target hashes, `theia build` 0 errors, `.mozbuild/0904/build-sidecar.log`), cited by pointer per the credit policy — not re-run, and the tree was restored byte-identical there.
- No sidecar rebuild attempted in this task (plan prohibition); sidecar sources are unchanged since 09-04 except the test-only telemetry suite file, which runs from the current tree.

### GUI-01 automated rows against the built binary (2026-09-05, headed session, display probe PASS) — ALL GREEN

- `scripts/verify-platform.sh --only gui01-single-shell-window` — **PASS**.
- `scripts/verify-platform.sh --only gui01-browser-close-does-not-quit` — **PASS** (`window.open opened a stock browser window (popup not blocked, no second shell), and closing it left the application running`).
- `scripts/verify-platform.sh --only gui01-command-registered` — **PASS** (`'powerbrowser.open-browser-window' is registered and palette-reachable as "Open Browser Window"`).

### Task 3 verify chain

- `scripts/verify-platform.sh --quick` — **PASS** (all checks passed).

### Task 3 done

Sidecar drills and automated window rows closed green on the current tree. Nothing rebuilt, nothing staged, no tree file mutated for drill purposes (one-off scratch script removed immediately; store records lived in the system temp dir).

## Task Commits

Each task was committed atomically:

1. **Task 1: Environment probes plus GEN-01 and GEN-03 delta re-proofs** - `0f69be8` (docs)
2. **Task 2: VER-01 fleet proof plus TEL-03 installed-binary layer** - `b23559b` (docs)
3. **Task 3: TEL-01 plus TEL-02 plus EXT-01 sidecar drills and GUI-01 automated rows** - `6b98adb` (docs)

## Files Created/Modified

- `.planning/phases/10-sign-off-closeout/10-02-SUMMARY.md` - drill evidence record with green logs (this file; sole tree change)

## Decisions Made

- Sync-don't-rebuild: the single post-build delta onto a packaged surface (one inert `ExtensionSettings: {}` key) was closed by byte-identical `cp` into both gitignored objdirs with empty-diff proof, not by a ~47–54 min tier-3 rebuild. Compiled surfaces (shell sources, patch stack, branding inputs) had zero deltas.
- Compose-don't-remutate: the 04-UAT drill 4 per-level live-traffic exercise was not re-run with a config mutation plus sidecar rebuild; every link (declaration flow, suite gating, live round-trip delivery, booted sidecar on current prefs) is green with logs, so the composition is the evidence.

## Deviations from Plan

None - plan executed exactly as written. (The objdir data-file sync and the composition ruling are Task 1's explicit staleness-ruling mandate working as designed, not deviations. No Rule 1–4 fix was needed; no checkpoint was hit.)

## Issues Encountered

None. Display was available (probe PASS), so no drill needed staged-with-unblock routing; the `yarn`-not-on-host-PATH observation is expected per CLAUDE.md and blocked nothing.

## Threat Flags

None — no product code written or changed; the only tree change is this planning prose. The objdir sync touched gitignored build output with byte-identical data-file bytes, inside the plan's T-10-05 ruling (no surprise rebuilds).

## Known Stubs

None — no code written; stub scan not applicable to a prose evidence record.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 10-02 live halves closed green with logs; 10-03 gates-green sweep can re-run `--quick` plus the cited `--only` rows on the final tree with no open drill.
- Deferred human signatures remain exactly the five staged UAT sheets from 10-UAT.md (10-01) — unchanged by this plan.

## Self-Check: PASSED

- Files: 10-02-SUMMARY.md FOUND; no other tree files created or modified (`git status` shows only pre-existing untracked research-cache entries plus `.gsd-allow-shrink`).
- Commits: 0f69be8, b23559b, 6b98adb all FOUND in git log.
- Verifies: harness-display-available, generate-check, generated-byte-identity, installer-schema, verify-manifest-literals, verify-downstream-fixtures, verify-endpoints (3 layers), telemetry-sender suite 9/9, telemetry, extension-pins, crash-collector, loopback ROUNDTRIP_OK, gui01 all three rows, --quick after every task — all observed PASS this session.
- No sibling driver created; every drill outcome is a `--only` row run plus observed result.

---
*Phase: 10-sign-off-closeout*
*Completed: 2026-09-05*
