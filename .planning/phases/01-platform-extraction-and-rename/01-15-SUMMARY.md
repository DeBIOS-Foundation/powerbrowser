---
phase: 01-platform-extraction-and-rename
plan: 15
subsystem: verification
tags: [gap-closure, residual-brand-scan, rebase, extra-root, derive-and-compare, MIG-03]
status: complete

requires:
  - "scripts/scan-brand-residue.mjs (01-01..01-08) — the scanner whose file-set source is generalised"
  - "scripts/rebase-upstream.sh (03-04 era) — the post-replay call site being wired"
  - "inventory/brand-tokens.json — scope.exclude / binary_extensions / residue_probes, the one filter source"
  - "scripts/verify-platform.sh rows scan-brand-residue{,-self-test} — the registry rows this work rides"
provides:
  - "inScanScope(inv, relPath) — the one scope-filter predicate, now shared by both file-set sources"
  - "extraRootFiles(inv, root) — a filesystem walk outside the git index, symlink- and .git-excluding"
  - "--extra-root <dir> CLI mode on scan-brand-residue.mjs"
  - "unrecognized-argument rejection (exit 2) on scan-brand-residue.mjs"
  - "four --self-test rows: clean control, planted token outside the index, missing root, mistyped flag"
affects:
  - "every future ESR rebase — the post-replay scan now reads the tree the replay rewrote"
  - "any future call site that mistypes a flag: it now exits 2 instead of reporting a green tracked-tree PASS"

tech-stack:
  added: []
  patterns:
    - "one filter definition, two file-set sources (git ls-files; a caller-supplied filesystem root) — add-alongside, never replace"
    - "self-test rows that spawn the REAL CLI as a subprocess, so argument parsing and exit code are inside what is proven"
    - "clean control first, then the plant — the red must be attributable to the plant, not to the scan running alongside it"
    - "discrimination control against the pre-fix script at the plan's base commit"

key-files:
  created: []
  modified:
    - "scripts/scan-brand-residue.mjs"
    - "scripts/rebase-upstream.sh"
    - ".github/workflows/rebase-upstream.yml"
    - "docs/BUILD.md"
    - ".planning/phases/01-platform-extraction-and-rename/deferred-items.md"

decisions:
  - "The extra-root pass runs offences and unclaimed residue probes but NOT reconcile()/groundTruth() — D-17's census counts this repo's own migrating tree and cannot close over a foreign checkout, so reusing it would make the pass permanently red for an unrelated reason"
  - "Symlinks are skipped structurally, not by a hand-kept list: upstream/powerbrowser links back into this repo's powerbrowser/, so a link-following walk would rescan this tree through a second path"
  - "scope.exclude entries are repo-relative and therefore inert against a foreign checkout — accepted and intended; any content-based exclusion belongs in the inventory, never in the walker"
  - "[Rule 2] An unrecognized argument now exits 2. The pre-fix script dropped unknown flags silently, so a mistyped --extra-root would have reported PASS over 109 tracked files — CR-B's own failure class, one keystroke away"
  - "The backstop truth was MEASURED rather than deferred: 55 s over 463,930 files against the live 5.6 GB upstream/ checkout, exit 0, upstream diff empty afterwards"
  - "No new verify-platform.sh registry row, and none scans the live upstream/ — a row that skips when the git-ignored clone is absent is green by construction (deferred-items row 4's precedent)"

metrics:
  duration: ~35min
  tasks: 3
  files: 5
  commits: 3
  completed: 2026-08-31

actuals:
  tokens: 7400
  tasks: 3
  commits: 3
---

# Phase 01 Plan 15: `--extra-root` — Giving the Rebase Gate a Tree to Read Summary

`scan-brand-residue.mjs` now takes a filesystem root outside the git index, and
`rebase-upstream.sh` passes `$UPSTREAM_DIR` to it, so the post-replay invocation whose entire
stated purpose is re-checking the tree the rebase just rewrote can finally read that tree.

## What Was Built

**Task 1 — the mode and the wiring (commit `4fd1110`).**

`scopeFiles()`'s two filter expressions were extracted into one exported predicate,
`inScanScope(inv, relPath)`, now called by both file-set sources. `extraRootFiles(inv, root)` walks
a caller-supplied root with `readdirSync(dir, { withFileTypes: true })`, returning sorted
root-relative paths that drop straight into the existing `scan(inv, { root, files })` call — a
second file set for the one scanner, not a second scanner. It skips every
`dirent.isSymbolicLink()` entry (because `upstream/powerbrowser` is a real symlink back into this
repo's `powerbrowser/`, so a link-following walk would rescan this tree through a second path and
could recurse) and never descends `.git`. An absent root, a non-directory root and an empty walk
each produce a hard FAIL naming the path.

`main()` gained `--extra-root <dir>`, parsed the same way `--scope-chain` and `--report` are, and
an extra-root pass that joins the same `gateFailures` list and the same single `return 1`. The pass
reports offences AND unclaimed residue probes as `<root>/<relative path>:<line>`; it deliberately
does not call `reconcile()` or `groundTruth()`, with the reason stated in a comment beside it.

`rebase-upstream.sh` passes `--extra-root "$UPSTREAM_DIR"` at both sites that name the command —
the real post-replay invocation (now line 117) and the `--dry-run` step-4b listing — and its
failure message names both trees so an operator reading a red line knows which one carries the
residue.

**Task 2 — the rows that make it go red (commit `2e89d12`).** Three `--self-test` rows that spawn
the real CLI via `execFileSync(process.execPath, [SELF, '--extra-root', dir], …)`, so the argument
parsing, the walk, the filters, the reporting and the exit code are all inside what is proven. Plus
a fourth row for the Rule-2 typo guard (see Deviations).

**Task 3 — the decisions in writing (commit `224cc6e`).** The CI workflow records why its step-1
scan stays a tracked-tree pre-check; `docs/BUILD.md` names the scan among the rebase's failure
points for both trees; ledger row 9 records both CR-A and CR-B closure with all four deliberate
NOT-dones.

## RED Evidence — the Discrimination Control, Verbatim

The pre-fix script is `scripts/scan-brand-residue.mjs` at `07200ee`, this plan's base commit,
copied into `scripts/` so its `REPO_ROOT` derivation resolves, and removed afterwards.

```
### discrimination control -- row 2's scenario, planted root: /tmp/tmp.Kb77ZZGUza
--- PRE-FIX script (07200ee, before this plan) ---
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s)
  exit=0  (plan predicted 2; actual is 0 -- see SUMMARY)
--- FIXED script (working tree) ---
  /tmp/tmp.Kb77ZZGUza/planted-outside-index.txt:1: sourcerer
scan-brand-residue: FAIL -- 1 residual brand occurrence(s) across 1 file(s) under --extra-root /tmp/tmp.Kb77ZZGUza
  exit=1  (expect 1)

### discrimination control -- row 3's scenario (nonexistent root)
--- PRE-FIX script ---
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s)
  exit=0
--- FIXED script ---
scan-brand-residue: FAIL -- --extra-root /tmp/tmp.Kb77ZZGUza/never-created does not exist or cannot be read -- an unreadable extra root is not a clean tree, and skipping it would make this pass green by construction
  exit=1
```

**The control is stronger than the plan predicted, and worse for the pre-fix tree.** The plan's
Task 2 criterion expected the pre-fix script to exit **2** with an unknown-argument error, proving
`--extra-root` did not exist. It exits **0**, printing a PASS line, because the pre-fix `main()`
ignored unrecognized arguments entirely. So the pre-fix behaviour was not merely "the flag is
unknown" — it was "the flag is accepted in appearance, a planted brand token sits in the directory
it was handed, and the gate announces the tree is clean." That is CR-B's exact shape, and it is why
Deviation 2 below exists.

## The Four New `--self-test` Rows — Verbatim

`node scripts/scan-brand-residue.mjs --self-test`, exit 0. All seven pre-existing rows still print
their own PASS line; none was removed, renamed, or weakened.

```
scan-brand-residue: --self-test PASS -- planted violation was correctly rejected and named: planted-violation.txt:1:sourcerer
scan-brand-residue: --self-test PASS -- boundary rule left `resourcerer` untouched and matched `sourcererPrivilegedJs`
scan-brand-residue: --self-test PASS -- condition 4 named the unclaimed probe hit in planted-boundary.txt
scan-brand-residue: --self-test PASS -- --except-hand-write held back 3 declared hand-write site(s) and still enforced 2 ordinary site(s), including line 2 of the line-scoped file
scan-brand-residue: --self-test PASS -- an empty scan set is reported as empty, not as clean
scan-brand-residue: --self-test PASS -- the same post-rename fixture WITHOUT the plant produced no gate failure (planted-postrename.txt), so the red below is caused by the plant and not by the fixture
scan-brand-residue: --self-test PASS -- an unclaimed trailing-plural form planted on a POST-RENAME fixture was rejected by the un-flagged gate path, naming planted-postrename.txt:2
scan-brand-residue: --self-test PASS -- --extra-root over a clean scratch root is a PASS control
scan-brand-residue: --self-test PASS -- --extra-root names a brand token planted outside the git index
scan-brand-residue: --self-test PASS -- --extra-root on a nonexistent directory fails loudly rather than skipping
scan-brand-residue: --self-test PASS -- a mistyped flag is rejected rather than silently ignored into a green run
```

`git status --porcelain` after the run shows no untracked entry from any fixture — all four scratch
roots live under `tmpdir()`, never inside the repo, so none is invisible-until-staged in the way
CLAUDE.md warns about.

## The Seven Ad-Hoc `--extra-root` Scenarios — Verbatim

```
### S0: no arguments (tracked tree unchanged)
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s)
exit=0

### S1: --extra-root over an EMPTY scratch root
scan-brand-residue: FAIL -- the --extra-root file set is empty for /tmp/tmp.dznRVLjx2C -- an empty file set is not a clean tree, it is a scan that ran over nothing
exit=1

### S2: --extra-root over a scratch root with a PLANTED token
  /tmp/tmp.zIp1FbZmkI/planted.txt:1: sourcerer
scan-brand-residue: FAIL -- 1 residual brand occurrence(s) across 1 file(s) under --extra-root /tmp/tmp.zIp1FbZmkI
exit=1

### S3: --extra-root over a scratch root with a TOKEN-FREE file
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/tmp.Ue6QGBSHVk
exit=0

### S4: --extra-root on a nonexistent path
scan-brand-residue: FAIL -- --extra-root /nonexistent/path/for/this/check does not exist or cannot be read -- an unreadable extra root is not a clean tree, and skipping it would make this pass green by construction
exit=1

### S5: --extra-root with no value
scan-brand-residue: FAIL -- --extra-root requires a directory
exit=2

### S6: symlink containment (A/link -> B, token planted under B)
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 1 file(s) under --extra-root /tmp/tmp.rwLHJIpfKq
exit=0
```

**S6 read carefully:** the PASS line reports `plus 1 file(s)` for root A, which contains
`plain.txt` and the symlink `A/link -> B`. B holds a file carrying a planted token. One file
scanned, exit 0 — the linked tree contributed nothing. Had the walk followed the link the count
would be 2 and the run would be red.

## The Backstop Truth, Measured Rather Than Deferred

The plan carried "a real rebase's post-replay scan completes within an acceptable wall-clock
budget" as a `backstop` truth, and ledger row 9 was specified to record it as unmeasured. `upstream/`
exists on this host, so it was measured instead:

```
5.6G    upstream
exit=0 wall=55s
scan-brand-residue: PASS -- no residual brand occurrence in 109 scanned file(s), plus 463930 file(s) under --extra-root /home/chris/coding/Power-Browser/upstream
```

55 seconds over 463,930 files in a live 5.6 GB Gecko checkout, exit 0, and no false hits from
either residue probe. That is negligible next to the 1.1 GB clone and patch replay it follows. It
also exercises the symlink skip and the `.git` skip against the real tree rather than a fixture.

`git -C upstream diff --stat` produced **no output** both before and after the walk. `upstream/` was
read only; the CLAUDE.md hard rule 2 invariant holds.

## Verification Results

| Check | Result |
|---|---|
| `node scripts/scan-brand-residue.mjs` | PASS — exit 0, **109 scanned file(s)**, the count measured at plan time; tracked-tree path behaviourally untouched |
| `node scripts/scan-brand-residue.mjs --self-test` | PASS — 11 rows, all seven pre-existing plus the four new |
| Seven ad-hoc `--extra-root` scenarios | All as specified above (S0–S6) |
| Symlink containment (S6) | PASS — linked tree contributed nothing |
| Discrimination control, both scenarios | PASS — pre-fix exit 0 with a PASS line, fixed exit 1 naming the path |
| `node scripts/scan-brand-residue.mjs --reconcile` | exit 0 — no regression |
| `node scripts/scan-brand-residue.mjs --except-hand-write` | exit 0 — no regression |
| `scripts/verify-platform.sh --only scan-brand-residue` | PASS |
| `scripts/verify-platform.sh --only scan-brand-residue-self-test` | PASS |
| `scripts/verify-platform.sh --quick` | PASS — all 24 rows, no regression |
| `bash scripts/rebase-upstream.sh --tag FIREFOX_153_1_0esr_RELEASE --dry-run` | exit 0; step-4b names `--extra-root "$UPSTREAM_DIR"` |
| `grep -c -- '--extra-root' scripts/rebase-upstream.sh` | 4 (≥2 required); both command-bearing sites carry it — line 66 (`4b.` echo) and line 117 (the `node …` invocation) |
| `git -C upstream diff --stat` | empty, before and after the live walk |
| `grep -rn 'scan-brand-residue' scripts/verify-platform.sh` | exactly the two pre-existing rows — no third row, no sibling driver |
| `grep -c 'run: node scripts/scan-brand-residue.mjs' .github/workflows/rebase-upstream.yml` | 1 — unchanged, no second scan step |
| `grep -c -- '--extra-root' .github/workflows/rebase-upstream.yml` | 3 — all inside the decision comment |
| `grep -c '^\| 9 \|' deferred-items.md` | 1 |
| `grep -c '^\| [0-9]' deferred-items.md` | 9 — eight pre-existing plus the new one |
| `git diff --stat deferred-items.md` | 1 insertion, 0 deletions — no row rewritten or renumbered |

The real (non-dry-run) `rebase-upstream.sh` path was **not** run: it removes and re-clones a 1.1 GB
tree, and the script's own header records that it is exercised locally via `--dry-run` only. Its
first real run is a CI dispatch. The `--extra-root` half of that path was exercised directly
against the live `upstream/` instead, which is the part this plan changed.

## Deviations from Plan

**1. [Rule 3 — Blocking] The pre-fix discrimination control exits 0, not 2**

- **Found during:** Task 1, before any edit (captured as RED evidence)
- **Issue:** Task 2's acceptance criterion states the pre-fix script "must exit **2** with an
  unknown-argument or missing-flag error — proving `--extra-root` did not exist." The pre-fix
  `main()` performed no argument validation at all, so it silently ignored `--extra-root` and its
  value and exited **0** with `PASS -- no residual brand occurrence in 109 scanned file(s)`.
- **Fix:** the criterion's intent — "a row that behaves identically under both is not evidence" —
  is satisfied and then some: exit 0 with a PASS line under the pre-fix script versus exit 1 naming
  the planted path under the fixed one. Both scenarios are recorded verbatim above. The criterion's
  literal `exit 2` prediction is recorded as wrong rather than engineered around.
- **Files modified:** none — this is an evidence-recording deviation.
- **Commit:** evidence carried in `2e89d12`'s message and here.

**2. [Rule 2 — Missing critical functionality] `main()` now rejects an unrecognized argument**

- **Found during:** Task 2, as a direct consequence of Deviation 1
- **Issue:** because unknown flags were dropped silently, a typo at any call site —
  `--extra-roots "$UPSTREAM_DIR"` in `rebase-upstream.sh`, say — would have produced a green
  tracked-tree PASS while the caller believed a second tree had been scanned. That is exactly the
  green-by-construction failure class this plan exists to close, reachable by one keystroke, and
  leaving it would have made the new mode's wiring unverifiable by inspection.
- **Fix:** `main()` walks `argv` against `KNOWN_FLAGS` / `FLAGS_TAKING_A_VALUE` and returns 2 naming
  the offending argument. Eight lines, matching `rebase-upstream.sh`'s own `*) unrecognized
  argument` idiom. A fourth `--self-test` row (`a mistyped flag is rejected rather than silently
  ignored into a green run`) asserts it, per CLAUDE.md's rule that a new check plants a fault and
  requires it to go red. All four executable call sites were enumerated first
  (`verify-platform.sh` ×2, `rebase-upstream.sh`, the CI workflow) and every one passes only known
  flags; the bare, `--reconcile` and `--except-hand-write` invocations were re-run green afterwards.
- **Files modified:** `scripts/scan-brand-residue.mjs`
- **Commit:** `2e89d12`

**3. [Rule 3 — Blocking] `grep -c 'extraRootFiles'` returns 2, not the ≥3 the plan predicted**

- **Found during:** Task 2 verification
- **Issue:** Task 1's criterion expects at least three occurrences — "the export, the `main()` call,
  and the Task 2 self-test usage once that lands." But Task 2's own action requires the self-test
  rows to spawn the real CLI as a subprocess "rather than calling `scan()` directly," because
  CR-B's `missing[]` names a token *passed as* `--extra-root`. A subprocess row cannot reference
  `extraRootFiles` by name. The two instructions are mutually exclusive as written.
- **Fix:** Task 2's action was followed and the grep count left at 2. Padding it with a decorative
  mention would satisfy the number while weakening the evidence. The walker is exercised
  end-to-end through the CLI by all four new rows, which is the stronger coverage the criterion was
  reaching for.
- **Files modified:** none.
- **Commit:** n/a

**4. [Improvement] Ledger row 9's "Route to" records a measurement instead of its absence**

- **Found during:** Task 1
- **Issue:** the plan specifies row 9's route-to should state "that no measurement exists yet" for
  the walk's wall-clock cost over a real Gecko tree, and carries it as a `backstop` truth.
  `upstream/` is present on this host, so the measurement was cheap and available.
- **Fix:** it was measured — 55 s, 463,930 files, exit 0, `git -C upstream diff` empty — and row 9
  records the figure with its scope limits (one host, one ESR tag, a checkout that had not just
  been rebased) rather than recording that nothing is known. The inventory-not-the-walker rule for
  any future content-based exclusion is preserved verbatim.
- **Files modified:** `.planning/phases/01-platform-extraction-and-rename/deferred-items.md`
- **Commit:** `224cc6e`

**5. [Process] The tracer feedback gate was satisfied automatically rather than by a human checkpoint**

- **Found during:** end of Task 1
- **Issue:** auto mode is off (`workflow.auto_advance` and `workflow._auto_chain_active` both
  `false`), which normally fires a `checkpoint:human-verify` after a `type="tracer"` task. Task 1's
  `<verify>` contains only an `<automated>` element — three chained CLI commands — and the
  checkpoint protocol is explicit that users never run CLI commands and that a human checkpoint
  must present a real on-screen affordance. There is no human affordance in this tracer; nothing
  here paints. Plan 01-14 recorded the identical situation.
- **Fix:** the tracer's `<verify>` was run end-to-end and passed (exit 0), together with all seven
  ad-hoc scenarios and both halves of the discrimination control, before any work on Task 2 began.
  No checkpoint was emitted.
- **Impact:** none on the artifact; recorded so the decision is visible rather than silent.

## Requirements

- **MIG-03** — the "cannot regress via rebase" half, which `01-VERIFICATION.md` named as the
  specific subject of CR-B, now holds: the post-replay invocation reads the replayed tree.
  CLAUDE.md's stated guarantee is true as written for the first time.
- **MIG-01, MIG-02, MIG-04** — the rename gate that guards the migration is strengthened, not
  changed in behaviour over the tracked tree (same 109 files, same verdict).

The remaining IDs on the plan's `requirements` field (GUI-01, GUI-03, GUI-04, SEC-01) are carried
per the phase contract and are unaffected by this plan; SEC-01 was closed by 01-14.

## Known Stubs

None. No stub, placeholder, skipped test, or unrun `<verify>` was introduced. Every `<verify>`
block in all three tasks was executed and is recorded above.

## Threat Flags

None beyond the plan's own register. `T-01-15-01` (the post-replay gate that could not read the
replayed tree) was this plan's subject and is mitigated and proven red-capable.
`T-01-15-02` (symlink handling) is mitigated and asserted by S6 and by the live walk.
`T-01-15-03` (wall-clock cost over a real tree) is measured at 55 s rather than left as a residual.
`T-01-15-05` (self-test evidence that proves nothing) is mitigated by the clean control row and by
the discrimination control against the pre-fix script.
`T-01-15-06` (reuse of `reconcile()`/`groundTruth()` on a foreign checkout) is mitigated by
deliberate omission with the reason stated in a comment.

The one new surface this plan introduces — `--extra-root` making an arbitrary filesystem path a
recursive read root — is the plan's `T-01-15-04`, dispositioned `accept`: output is
`path:line:token` for inventory-token matches only, never file contents, in a local dev tool with
no privilege boundary.

## Self-Check: PASSED

All five modified files exist on disk. All three commit hashes resolve in `git log`:
`4fd1110`, `2e89d12`, `224cc6e`.
