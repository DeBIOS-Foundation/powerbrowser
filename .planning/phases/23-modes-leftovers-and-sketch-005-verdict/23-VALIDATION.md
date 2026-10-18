---
phase: "23"
slug: "modes-leftovers-and-sketch-005-verdict"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-17"
---

# Phase 23 — Validation Strategy

> Source: `23-RESEARCH.md` § Validation Architecture. Line numbers are at HEAD `02ce825`. Phase 22 runs first and moves `theia/` and `verify-platform.sh` lines; re-read them before editing. Rows marked (b, c) exist only if Chris picks G-32 option b or c at the 23-03 checkpoint.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `scripts/verify-platform.sh` registry (node checks); full-tier live rows over `scripts/lib/pb-relaunch.mjs` |
| **Config file** | the `CHECKS` array in `scripts/verify-platform.sh` (gui07/gui09 block near `:3781-3842` and `:3954-3985`; full-tier ng rows near `:4869-4916`) |
| **Quick run command** | `node scripts/verify-name-cap-at-input.mjs [--self-test]`, `node scripts/verify-panel-motion.mjs [--self-test]`, plus the existing touched checks run directly. All are read-only and safe while another plan works |
| **Full suite command** | `scripts/verify-platform.sh --quick` per wave (0 FAIL, empty `docs/non-gui/quick-baseline.txt`); the full `scripts/verify-platform.sh` at the phase gate (it carries the ng and live rows) |
| **Estimated runtime** | About 1 s per static script. About 60 s for `--quick`. Live rows take minutes each; ng-035/036 take 180 s to time out if their stubs are stale |

---

## Sampling Rate

- **After every task commit:**
  - Run the touched check scripts directly, with `--self-test`.
  - For TS edits, run `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build'`, and also `extensions/chrome-bar` under G-32 option b or c.
  - After `git add` of any new file, run `node scripts/scan-brand-residue.mjs`.
- **After every plan wave:**
  - The orchestrator runs `scripts/verify-platform.sh --quick` once; two plans never run it at the same time.
  - Re-run any red row alone with `--only`.
  - Then run `python3 scripts/phase-gate.py --root .`, which must print nothing.
- **Before `/gsd-verify-work`:**
  - checkpoints C1 (G-32), C2 (re-lock, if needed) and C3 (live runs);
  - the full `scripts/verify-platform.sh`;
  - `python3 scripts/phase-gate.py --root .` (no output).
- **Max feedback latency:** 1 s for the static scripts; about 60 s for `--quick`.

---

## Per-Requirement Verification Map

| Criterion | Plan | Wave | Check / command | Failing direction (must go red when…) | File Exists | Status |
|---|---|---|---|---|---|---|
| SC2: save paths cap at the input | 23-02 | 1 | `node scripts/verify-name-cap-at-input.mjs` | A save path calls `quickInput.input(`; it passes a literal or the other constant; `MODE_NAME_MAX`, `SETUP_NAME_MAX`, `GROUP_TITLE_MAX_CHARS` and the 14-UI-SPEC `:316`/`:360` cap disagree; the helper lacks `createInputBox`, `onDidChangeValue` or `.slice(0, max)`; any derivation is ZERO | ❌ W0 | ⬜ pending |
| SC2: name-cap plants | 23-02 | 1 | `node scripts/verify-name-cap-at-input.mjs --self-test` | The baseline is not green, or any of plants 1-8 is not red naming its drift: mode save reverted to `input(`, `60` literal at the setup call, `MODE_NAME_MAX` in setups, helper slice removed, `MODE_NAME_MAX = 61`, spec cap 80, `saveCurrentAsMode` renamed, extra `quickInput.input(` name prompt | ❌ W0 | ⬜ pending |
| SC2: copy unchanged | 23-02 | 1 | `scripts/verify-platform.sh --only gui09-setups-copy`, `--only shell-error-copy-no-internals`, each with `-self-test` | A contracted literal leaves the call-site `{ prompt, placeHolder }` object, or surplus copy appears | ✅ | ⬜ pending |
| SC2: commit backstop kept | 23-02 | 1 | `--only gui09-setup-roundtrip`, `--only gui09-setup-roundtrip-self-test` | `.slice(0, SETUP_NAME_MAX)` removed or the cap changed | ✅ | ⬜ pending |
| SC2: cut while typing, live | 23-02 | 1 | new name-cap live row, `PB_VERIFY_PORT=3939`, output quoted in the SUMMARY | Setting 70 characters on the Save as Mode or Save Setup field leaves a length other than 60, or the stored name is not the first 60 characters | ❌ W0 | ⬜ pending |
| SC2: save still works | 23-02 | 1 | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only ng-035-custom-mode-saves-layout`, `--only ng-036-setup-records-dock-layout` | Probe timeout (stub still targets `input`) or the saved layout is lost | ✅ (stub edit) | ⬜ pending |
| SC2: spec and planning wording | 23-02, 23-04 | 1 | `grep -n 'while typing' .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md` matches; `grep -n 'group name\|group-name' .planning/ROADMAP.md .planning/REQUIREMENTS.md` has no MODE-02 / criterion 2 hit | A spec or planning line still says "before commit" only, or still says "group name" | — (command) | ⬜ pending |
| SC3: decision taken | 23-03 | 1 | C1 checkpoint resume signal recorded in the 23-03 SUMMARY | Any motion code or 14-UI-SPEC motion line changed before C1 | — (checkpoint) | ⬜ pending |
| SC3: spec motion equals code | 23-03 | 2 | `node scripts/verify-panel-motion.mjs` | Spec Motion (`:198-200`) and the rebind's per-panel `expandDuration` disagree; panel keys differ from stock `DEFAULT_OPTIONS`; more than one `rebind(ApplicationShellOptions)`; (b, c) no reduced-motion guard; (c) no shrink before a collapse; ZERO derivation | ❌ W0 | ⬜ pending |
| SC3: motion plants | 23-03 | 2 | `node scripts/verify-panel-motion.mjs --self-test` | Any branch plant not red: (b, c) bottom `expandDuration` dropped, N=250 against a 200 spec, guard removed, second rebind, spec says instant while the code slides; (a) `expandDuration: 150` added; (c) left shrink removed; ZERO | ❌ W0 | ⬜ pending |
| SC3: visible motion (b, c) | 23-03 | 2 | motion live row, `PB_VERIFY_PORT=3939` | Browsing → Coding shows no intermediate left width, or the end width arrives later than N ms plus one frame; Coding → Browsing shows an intermediate width under b, or none under c; any intermediate width under reduced motion | ❌ W0 | ⬜ pending |
| SC3: switch invariant (c) | 23-03 | 2 | `--only gui07-mode-switch-tabs-invariant`, `--only gui07-mode-switch-tabs-invariant-self-test` | An unallowlisted `this.shell…` call on the switch path | ✅ | ⬜ pending |
| SC3: core untouched | 23-02, 23-03 | 1-2 | `--only diff-theia-core`; `git -C upstream diff` empty | Any core or upstream diff | ✅ | ⬜ pending |
| SC1: records current | 23-01 | 3 | `grep -n 'stays top' .planning/milestones/v1.3-phases/14-modes-windows-setups/14-UAT.md theia/extensions/modes/src/browser/mode-descriptors.ts` shows no current-claim line; `grep -n '^| 2 |' .planning/GUI-DEFECTS.md` shows `IN TREE`; `grep -n 'truth_correction' .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md` includes G-14.1.1-11; the 14.1.1-UAT and 14-UAT Summary counts equal a recount of the entries | A strip-stays-top claim remains as current; item 2 still `OPEN`; G-11 truth rewritten in place; a Summary count disagrees with the entries | — (command) | ⬜ pending |
| SC1: descriptor comment safe | 23-01 | 3 | `--only gui07-mode-toggle-commands`, `--only gui08-panorama-copy`, `--only gui07-mode-switch-tabs-invariant`, each with `-self-test` | The comment adds a `['…', 'left']` pair, an `id: '…'` literal or `textContent`, and a derivation or plant changes | ✅ | ⬜ pending |
| SC1: G-11 hand-off recorded | 23-01 | 3 | `grep -n 'Phase 24' .planning/GUI-DEFECTS.md .planning/milestones/v1.3-phases/14.1.1-gui-conformance-sweep/14.1.1-UAT.md` matches item 2 and G-14.1.1-11 | No hand-off recorded | — (command) | ⬜ pending |
| SC4: 14-VERIFICATION exists | 23-05 | 4 | `test -f .planning/milestones/v1.3-phases/14-modes-windows-setups/14-VERIFICATION.md`; `grep -q 'covered_digest: "v3:sha256:'` on it; its `status:` is one of `passed`, `gaps_found`, `human_needed` | Missing file, missing digest, or a hand-typed digest (no seam output quoted in the SUMMARY) | ❌ W0 | ⬜ pending |
| SC5: sketch committed and decided | 23-04 | 1 | `git ls-files --error-unmatch .planning/sketches/005-vscode-layout/index.html`; `grep -c '^| 005 |' .planning/sketches/MANIFEST.md` = 1; `grep -n 'v1.5' .planning/ROADMAP.md .planning/REQUIREMENTS.md .planning/PROJECT.md` names the milestone and SK-01; `git show --stat HEAD` for the sketch commit lists no foreign untracked file | Untracked sketch, no or duplicate row, no named v1.5 entry, or a foreign file in the commit | — (command) | ⬜ pending |
| Gate, every plan | all | — | `node scripts/scan-brand-residue.mjs` exits 0 after staging; `python3 scripts/phase-gate.py --root .` prints nothing; `--quick` 0 FAIL | Residue hit; `test file changed` (a locked check edited without re-lock); any FAIL row | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-name-cap-at-input.mjs` plus the `<label>` / `<label>-self-test` `--quick` rows beside `gui09-setup-roundtrip` (23-02).
- [ ] Name-cap live script plus 1 full-tier row (23-02). `git add` it before `scan-brand-residue`.
- [ ] Update the ng-035 / ng-036 stubs from `input` to the capped input box (23-02). Establish lock status first; if locked, the C2 re-lock follows the edit.
- [ ] `scripts/verify-panel-motion.mjs` plus 2 `--quick` rows (23-03, written after C1 for the chosen branch).
- [ ] Motion live script plus 1 full-tier row (23-03, options b and c only).

Any new script cites only tracked `.planning/milestones/…` paths, never `.planning/phases/23-…` (`planning-paths`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| G-32 decision (C1) | MODE-03 | Chris's call, with no recommendation | 23-03 task 1: present the 23-UI-SPEC Motion rows a, b and c with the 23-RESEARCH facts (linear, every open, no slide before `ready`, reduced motion read at startup, the `applyStripHome` hide under c). Chris replies `a`, `b N` or `c N` |
| Re-lock of ng-035/036 (C2) | MODE-02 | Ledger approval; the agent never runs the lock | Only if the files are in `check_locks`. After the stub commit, Chris runs `python3 scripts/ledger-amend.py --root . lock-checks --commit <hash>` in his terminal; `phase-gate.py` then prints nothing |
| Live runs (C3) | MODE-02, MODE-03 | Live rows launch the shell (memory `one-fix-at-a-time-confirmed`) | Commit, rebuild the sidecar, run the name-cap live row, ng-035 and ng-036 (and under b or c the motion row) with `PB_VERIFY_PORT=3939`; quote outputs in the SUMMARY |
| Caret and Enter after a cut | MODE-02 | 23-UI-SPEC backstop (keyboard) | In the C3 session: type past 60, then press Enter; the 60-character name saves |
| Motion looks right (b, c) | MODE-03 | Visual judgement | In the C3 session, on a Browsing → Coding → Browsing round trip, Chris confirms the slide (and reduced motion, if the pref can be set) |
| Strip relocation live (G-11) | MODE-01 | Handed to Phase 24 (CONTEXT) | Phase 24 session: Chris confirms the three strip homes and the split-pane Browsing case, then sets 14-UAT test 3 and 14.1.1 test 11, flips GUI-DEFECTS item 2 to `CONFIRMED`, and the GUI-07 and MODE-01 boxes |
| v1.5 milestone name | SK-01 | Name taken from the brief, not from Chris | Non-blocking: Chris renames it if wrong |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60 s for static rows (live rows are full tier only)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
