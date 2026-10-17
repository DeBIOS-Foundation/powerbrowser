---
phase: "19"
slug: "node-24-react-19-theia-1-76-0"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-17"
---

# Phase 19 — Validation Strategy

> Source: `19-RESEARCH.md` § Validation Architecture (copied verbatim below). Status per row is tracked in the verification map; this file is updated by validate-phase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (bash plus node check scripts) |
| Config file | registry array at `scripts/verify-platform.sh:3573-4867` |
| Quick run command | `scripts/verify-platform.sh --quick` (the commit gate, with the R33 subtraction in `docs/non-gui/decisions.md:39-47`) |
| Single row | `scripts/verify-platform.sh --only <label>` |
| Full suite command | `scripts/verify-platform.sh` (run before `/gsd-verify-work`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction (must go red when…) | File Exists? |
|--------|----------|-----------|-------------------|------|------|
| UPD-07 | Shell is Node 24, lock untouched | smoke | `nix develop .#theia --command node -v` → `v24.19.0`; `git diff --quiet HEAD~1 -- flake.lock`; `--only smoke-theia` | `nodejs_22` left in `flake.nix:20`; any `flake.lock` byte change; node-pty spawn fails | ✅ smoke-theia |
| UPD-07 | drivelist built for Node 24 | smoke | `grep '"nodedir"' theia/node_modules/drivelist/build/config.gypi` contains `nodejs-slim-24.19.0` | A Node 22 build left in place | ✅ (command) |
| UPD-08 | One copy each of 5 packages | unit (`--quick`) | `--only single-copy-deps`, `--only single-copy-deps-self-test` | A planted nested `react` copy, a missing package, an absent `node_modules`; a symlinked duplicate must **not** count | ❌ Wave 0 |
| UPD-08 | React 19.2.8 installed | static | NG-082 check assertion 2, or `node -p "require('./theia/node_modules/react/package.json').version"` | 18.3.1 still installed | ❌ Wave 0 |
| UPD-09 | Pins agree at 1.76.0 | static (`--quick`) | `--only verify-upstream-pins` + `-self-test` | A member at 1.74.1; a lock stanza drift | ✅ |
| UPD-09 | Installed closure = manifest pin | static | NG-082 check | Manifest at 1.76.0 while installed 1.74.1 (the record-fail moment) | ❌ Wave 0 |
| UPD-09 | Core untouched | integration | `--only diff-theia-core` | Any byte under `node_modules/@theia` differs from a fresh resolve | ✅ |
| RM-02 | No D-22 override; ai-* stock | static | `! git ls-files theia/extensions/branding \| xargs grep -l "ai-ide"`; `--only theia-build-order`; `--only gui07-mode-switch-tabs-live` | The file or either rebind remains; the `@theia/ai-*` set differs from HEAD's 12; `ai-first` unaccounted | ✅ / gui07 needs edit |
| UPD-10 | Fresh: only `welcome`, `startupEditor` none, no getting.started | live | new first-boot row (fresh mode) | Main area ≠ `['welcome']`; positive control: getting-started command does not produce the widget | ❌ Wave 0 |
| UPD-10 | Carried-over: persisted layout restored, no Welcome added | live | same row (carried mode, fixture env var) | Main-area set ≠ fixture's persisted set; `getting.started.widget` present | ❌ Wave 0 |
| UPD-10 | Settings shows PowerBrowser telemetry copy | live | same row (N3) | Description ≠ the string read from `telemetry-preferences.ts` (the unfixed tree gives "Controls the level of telemetry.") | ❌ Wave 0 |
| UPD-10 | React 19 render errors reach capture | live | same row (N4) | The forced `ForcedRenderError` is not seen by `logError` | ❌ Wave 0 |
| UPD-10 | `view:` URIs open | live | `--only verify-uri-roundtrip` (covers `ai-configuration`, `verify-uri-roundtrip.mjs:104`) | Factory id renamed | ✅ |
| UPD-10 | Token gate live | live | `--only side02-token-negative`, `--only side02-token-positive` | 200 without a token / 403 with one | ✅ |
| N2 | Authored widgets render | live | `--only verify-branding`, `--only gui01-command-registered`, `--only gui02-web-tab-live`, `--only gui07-mode-switch-tabs-live`, `--only ng067-frontend-errors-reach-telemetry` | Empty widget / missing version / no capture | ✅ |
| N2 backstop | Dropdown anchor, dependent-window dark theme | manual | gsd-browser / KWin screenshot (memory notes) | Dropdown at origin; light secondary window | manual-only: DOM geometry and theme are not asserted by any row |

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick` with the R33 subtraction (empty output passes).
- **Per locked commit:** `--quick`, then `yarn build`, then the new first-boot row (fresh), `smoke-theia`, `side02-token-*` and `verify-uri-roundtrip`.
- **Phase gate:** full `scripts/verify-platform.sh`, the first-boot row in both modes, `python3 scripts/plan-gate.py --root . --phase 19 --plans <phase dir>`, `python3 scripts/phase-gate.py --root .`, and `node scripts/scan-brand-residue.mjs` after staging.

### Wave 0 Gaps
- [ ] `scripts/verify-single-copy-deps.mjs` (+ `--self-test`), covering UPD-08
- [ ] First-boot live check (fresh and carried-over modes, N1/N3/N4, with positive controls), covering UPD-10. It must be a new file because ng067 is locked
- [ ] The carried-over fixture captured on the pre-bump tree, outside the repo, read through an env var
- [ ] `scripts/verify-ng-082-<slug>.mjs` (+ self-test), covering UPD-09/NG-082. Write it **before** commit 3's pin edits
- [ ] `verify-mode-switch-tabs-live.mjs` upstream-perspective derivation, which must land in commit 3

**quick-baseline.txt (R33):** today it holds the 4 gui08 rows, and Phase 17 measured 114 PASS / 4 FAIL. With the placements above, no committed state adds a red `--quick` row: single-copy passes at every step, and the NG-082 check turns red and green inside commit 3's working tree. Refresh the file only if the measured FAIL set differs after commit 3. If it is unchanged, record "unchanged at the Phase 19 refresh" in `decisions.md:39`, following the Phase 17 wording precedent.

## Recommended plan split (≤ 20 items, ≤ 500 lines each; `size-gate.py`)

1. **19-01 Checks first (tracer).** Write the single-copy row and self-test, the first-boot live check and self-test, and the NG-082 check file (not yet registered as a ledger test_ref). Capture the carried-over fixture on the pristine tree. Run the first-boot check fresh and carried-over at **baseline**: it must pass, which proves the instrument works before anything moves. Commit 0 is checks only. Cite NG-074 and NG-084.
2. **19-02 Commit 1: Node 24.** Edit `flake.nix` only; `cmp flake.lock`; `node -v`; smoke-theia (it rebuilds drivelist; verify `nodedir`); `yarn build`; `--quick`; first-boot fresh.
3. **19-03 Commit 2: React 19 @ 1.74.1.** `checkpoint:human-verify` (SUS recency), edit two manifests, install, drivelist, build, frozen re-install, `--quick` (single-copy green on React 19), live N1/N2/N4 (N3 passes trivially at 1.74.1).
4. **19-04 Commit 3: Theia 1.76.0.** `checkpoint:human-verify`. NG-082: settle the open question with Chris, then `set-status open`, `set --test-ref`, edit `configuration.toml:116`, `record-fail`. Then the runbook mover, engines, app version, `startupEditor`, RM-02 deletion plus stale lib cleanup, telemetry `initSchema`, the gui07 check fix and the false comments (telemetry header, `verify-mode-switch-tabs-live.mjs:50-57`). Install, drivelist, build, frozen re-install, `verify-upstream-pins`, `diff-theia-core`, `--quick`, scan after staging. One commit.
5. **19-05 Live verification and close-out (docs commit).** First-boot row fresh and carried-over, `side02-token-*`, `verify-uri-roundtrip`, `gui07-mode-switch-tabs-live`, `ng067`, `ng069-sidecar-egress`, the manual dropdown and dependent-window backstops, then the full `verify-platform.sh`. NG-082: `set --evidence` and `set-status done`. Update `docs/BUILD.md:268-286` and `README.md:87`, decide quick-baseline, and write SUMMARY records (telemetry mechanism and evidence, the app version choice, the `theia-ide.org` deviation, NG-082 path).

