---
phase: "20"
slug: "non-gui-gaps"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-17"
---

# Phase 20 — Validation Strategy

> Source: `20-RESEARCH.md` § Validation Architecture. Line numbers are at HEAD `5607e1b`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry (bash plus node/python checks) |
| **Config file** | the `CHECKS` array in `scripts/verify-platform.sh` (`--quick` `:3576-4578`; full-only `CHECKS+=` from `:4581`) |
| **Quick run command** | `scripts/verify-platform.sh --only <label>` |
| **Full suite command** | `scripts/verify-platform.sh --quick` with the R33 subtraction (`docs/non-gui/quick-baseline.txt`) per plan; the full `scripts/verify-platform.sh` at the phase gate (it carries `theia-fresh-clone-build`) |
| **Estimated runtime** | `--only` rows under 1 s, except `verify-downstream-fixtures` (about 30 s now, about 12-15 s after 20-01) and the fresh-clone rows (about 1.5-3 min each, timeout 1800 s) |

---

## Sampling Rate

- **After every task commit:** run the `--only` rows below for the files touched, then `node scripts/scan-brand-residue.mjs` after `git add` of any new file.
- **After every plan wave:**
  - Run `scripts/verify-platform.sh --quick`, subtract the 4 gui08 rows in `quick-baseline.txt`, and re-run any remaining red row alone (R28).
  - Then run `python3 scripts/phase-gate.py --root .`; it must exit 0 with no output.
  - Waves are sequential (one plan each), so no two `--quick` runs overlap.
- **Before `/gsd-verify-work`:**
  - the full `scripts/verify-platform.sh`;
  - `python3 scripts/plan-gate.py --root . --phase 20 --plans .planning/phases/20-non-gui-gaps`;
  - `python3 scripts/check-ledger.py --root .` and `python3 scripts/phase-gate.py --root .`, both exiting 0 with no output after Chris's re-lock.
- **Max feedback latency:** 30 s for `--quick` rows; 1800 s for the fresh-clone rows (full tier only).

---

## Per-Requirement Verification Map

| Criterion | Plan | Check / command | Failing direction (must go red when…) | File Exists | Status |
|---|---|---|---|---|---|
| PLAT-04 A: pre-fix sequential passes recorded | 20-01 | Run `--only generate-check` ×3 and `--only verify-downstream-fixtures` ×1 in the host shell and again in `nix develop .#theia`, before the edit | — (a record; quote rc and assertion counts in the SUMMARY) | ✅ | ⬜ pending |
| PLAT-04 A: rasters immune to the bus | 20-01 | `--only generate-self-test` (new `concurrent-raster` case) | Removing `DBUS_SESSION_BUS_ADDRESS: 'disabled:'` from `RASTER_ENV`, or a planted env with the host bus address, goes red naming "inkscape would join the session bus". Any of the 18 concurrent exports fails | ✅ extend | ⬜ pending |
| PLAT-04 A: bytes unchanged | 20-01 | `--only generate-check`, `--only generated-byte-identity` | Any raster byte differs from the tracked rasters | ✅ | ⬜ pending |
| PLAT-04 B: harness never writes `generated/` | 20-01 | `--only verify-downstream-fixtures-self-test` | `runGenerate` without an out dir does not throw ("shared generated/ tree"). A copied tree run with `--out` leaves `<copy>/generated` present. The positive control (without `--out`) leaves it absent | ✅ extend | ⬜ pending |
| PLAT-04 B: fixtures still assert | 20-01 | `--only verify-downstream-fixtures` | The assertion count ≠ 268 + 198, or any fixture fails | ✅ | ⬜ pending |
| PLAT-04 B: live isolation | 20-01 | A read-only sampler on `generated/branding/dev/configure.sh` every 0.3 s while `--only verify-downstream-fixtures` runs | The sampler sees any string other than `PowerBrowser Dev` | — (command) | ⬜ pending |
| PLAT-05: references resolve | 20-02 | `--only planning-paths` | Any `.planning/phases/…` or `.planning/milestones/v*-phases/…` literal in tracked `scripts/` or `.github/` resolves to 0 tracked paths, or a glob matches ≠ 1. Also red on **zero** references found. Before the repoint it is red on exactly the 5 sites | ❌ W0 | ⬜ pending |
| PLAT-05: plants | 20-02 | `--only planning-paths-self-test` | Plants 1-6 (untracked literal, 0-match glob, 2-match glob, wrong milestone, empty set, mixed file) are not each red naming the path, or the clean control (plant 7) goes red | ❌ W0 | ⬜ pending |
| PLAT-05: repointed readers still work | 20-02 | `--only sql-store-soak`, `--only gui07-strip-spike-verdict`, `--only gui07-strip-spike-verdict-self-test`, `--only gui09-dependent-window-content`, `--only gui09-dependent-window-content-self-test`, `--only verify-downstream-fixtures` | A missing fixture or record after the fallbacks are deleted | ✅ | ⬜ pending |
| PLAT-05: no live literal remains | 20-02 | `git grep -n '\.planning/phases/' -- scripts .github` prints nothing | Any line printed | — (command) | ⬜ pending |
| PLAT-02: channel contract | 20-03 | `--only group-channel` (PASS line reports 7 sites, 5 files) | `wantUntrusted: true` missing or false. The child URI scheme is not in the upstream-derived child set, or `jar.mn` lacks the alias or the packaged basename. A dispatch is not `document.dispatchEvent` or lacks `bubbles: true`. The reply `detail` is not the `win.wrappedJSObject.JSON.parse(JSON.stringify(` round trip. A frontend literal is not a child DOM name. A response listener is not on `window` (D6). Any derivation is ZERO | ❌ W0 | ⬜ pending |
| PLAT-02: plants | 20-03 | `--only group-channel-self-test` | The clean tree is not green, or any of plants 1-12 is not red naming its drift. A plant that modifies nothing reports "anchor drifted" | ❌ W0 | ⬜ pending |
| PLAT-02: paperwork | 20-03 | The 14.1.1-UAT G-14.1.1-10 entry shows `status: fixed` with `closed_by`; `GUI-DEFECTS.md` item 13 is no longer `OPEN`; `FEATURES.md` no longer says `cloneInto` on the reply | Any of the three unchanged | — (grep) | ⬜ pending |
| PLAT-03: texts accepted first | 20-04 | Blocking checkpoint before `add`; Chris's reply quoted in the SUMMARY | `add` runs before acceptance | — (manual) | ⬜ pending |
| PLAT-03: v3 behaviour | 20-04 | `--only ng-087-loose-position-across-restart`, `--only ng-087-loose-position-across-restart-self-test` | A loose position is lost across restart and re-track, or the reader SQL derived from `tab-query-service.ts` does not return it. Self-test plants (a)-(d) are not each red | ❌ W0 | ⬜ pending |
| PLAT-03: v4 behaviour | 20-04 | `--only ng-088-group-order-across-restart`, `--only ng-088-group-order-across-restart-self-test` | The returned order ≠ the order set by hand. Self-test plants (a)-(c) are not each red | ❌ W0 | ⬜ pending |
| PLAT-03: honest red | 20-04 | `node scripts/verify-ng-087-loose-position-across-restart.mjs --at b9412fa260d425deb3fb9a08c82a5b4ba39a8800` (and the 088 equivalent) exits ≠ 0. Then one plain `grep` of the ledger history log finds `unknown kind setTabPosition` / `unknown kind setGroupOrder` | The `--at` run exits 0, or the recorded output is a `git show` failure rather than the unknown-kind refusal | ❌ W0 | ⬜ pending |
| PLAT-03: ledger healthy | 20-04, 20-05 | `python3 scripts/check-ledger.py --root .`; `python3 scripts/phase-gate.py --root .` (exit 0, no output); `python3 scripts/ledger-report.py --root .` shows NG-087 and NG-088 `done` | Any output line (`check never failed`, `recorded failure is stale`, `test file changed`), or a row not `done` | ✅ | ⬜ pending |
| PLAT-03: Chris's lock | 20-05 | After C2: a plain `grep -c verify-ng-08[78] ledger/REQUIREMENTS.json` ≥ 2 (both files in `check_locks`), and the phase gate is clean | Lock missing either file | — (manual + grep) | ⬜ pending |
| PLAT-01: static order | 20-05 | `--only theia-build-order`, `--only theia-build-order-self-test` | A backward `@powerbrowser` edge in `theia/package.json:69` | ✅ | ⬜ pending |
| PLAT-01: evidence run at final HEAD | 20-05 | `python3 scripts/fresh-clone-verify.py --repo /home/chris/coding/Power-Browser --commit "$(git rev-parse HEAD)" --timeout 1800 --cmd "<verify.yml:83 run: value>"` prints `fresh-clone-verify: ok`. Output saved under `logs/` with the key lines quoted in VERIFICATION | A clone or checkout failure, a non-zero frozen install, drivelist or `yarn build`, or a timeout | ✅ helper | ⬜ pending |
| PLAT-01: regression row | 20-05 | `--only theia-fresh-clone-build` (full tier, **not** in `--quick`) | Any of the above. Also: the verify.yml step is missing (distinct broken-instrument message), or `TMPDIR` contains a space | ❌ W0 | ⬜ pending |
| PLAT-01: row can go red | 20-05 | `--only theia-fresh-clone-build-self-test` | The baseline build is not green, or P1 (token-gate/tab-uris swapped), P2 (lib-only import) or P3 (CSS path) does not fail naming its specifier | ❌ W0 | ⬜ pending |
| PLAT-01: gap record | 20-05 | G-14.1.1-9 flipped to `fixed`, with `closed_by` naming `cd8c4c1`, `b991b2d`, `32b144d` and `4ce6f34` (each resolves with `git cat-file -t`) and the evidence run; `FEATURES.md:38-41` chain description corrected to 7 entries | A non-resolving hash remains | — (git) | ⬜ pending |
| BUILD.md `-purgecaches` | 20-05 | `grep -n -- '-purgecaches' docs/BUILD.md` finds a line in the Tier 1 section saying that edits to `powerbrowser/shell/*.js` need `rm -rf objdir/tmp/profile-default/startupCache` and `-purgecaches` | No match | — (grep) | ⬜ pending |
| Gate, every plan | all | `--quick` FAIL set minus `quick-baseline.txt` is empty; `node scripts/scan-brand-residue.mjs` exits 0 after staging | A new red row; residue count drift | ✅ | ⬜ pending |
| Ledger citations | all | `python3 scripts/plan-gate.py --root . --phase 20 --plans .planning/phases/20-non-gui-gaps` | NG-074 or NG-084 not cited (and NG-087/088 while open) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-planning-paths.mjs` plus 2 `--quick` rows before `)` at `verify-platform.sh:4578`. This covers PLAT-05. Register the rows in the same commit as the five repoints.
- [ ] `scripts/verify-group-channel.mjs` plus 2 `--quick` rows after `verify-platform.sh:3768`. This covers PLAT-02.
- [ ] `scripts/verify-ng-087-loose-position-across-restart.mjs` and `scripts/verify-ng-088-group-order-across-restart.mjs`, each with `--at <rev>` and `--self-test`, plus 4 `--quick` rows beside ng-016/019/020. This covers PLAT-03. Commit them before `record-fail`, and never edit them afterwards.
- [ ] `scripts/verify-theia-fresh-clone-build.sh` plus 2 full-tier rows inside `if [ "$QUICK" -eq 0 ]`. This covers PLAT-01.
- [ ] A `concurrent-raster` case in `generate.mjs --self-test` and two plants in `verify-downstream-fixture.mjs --self-test`. These cover PLAT-04.

`quick-baseline.txt` does not change: every new row passes at HEAD, and the 4 gui08 rows stay red until Phase 21.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Row texts and the red-against-`b9412fa` method accepted | PLAT-03 | `add` fixes the text permanently, and no agent command edits it | Blocking checkpoint at 20-04 Task 1. Chris replies with acceptance or with edited text |
| Check hashes re-locked | PLAT-03 | `lock-checks` is blocked for the agent by `.claude/hooks/ledger-verify-hook.py` | Chris runs, in his own terminal:<br>`cd /home/chris/coding/Power-Browser`<br>`python3 scripts/ledger-amend.py --root . lock-checks --commit <H>`<br>and replies `relocked` |
| CLAUDE.md:145 dangling path (optional) | PLAT-05 (adjacent) | A project-instructions edit; outside the `planning-paths` scope | Chris approves or makes the edit to `.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/01-UI-SPEC.md` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s for `--quick` rows (fresh-clone rows are full tier only)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
