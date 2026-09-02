---
phase: 02-configuration-manifest-and-generator-core
plan: 06
subsystem: verification
tags: [self-test, planted-faults, no-internals-copy, registry, ci, byte-identity, D-03, CFG-02, CFG-03, GEN-04]
status: complete

requires:
  - "02-03 — the --self-test harness, its clean-baseline guard, its per-case vacuity guard and its counted PASS line; the validator and its failure copy"
  - "02-04 — checkTargets and its three distinct outcomes; the frozen five-entry TARGETS table"
  - "02-05 — the byte-identity gate, whose GREEN against the ORIGINAL bytes was the precondition for this plan's header rewrite; the IS_MAIN guard and the named exports that let a child process import resolveConfig"
provides:
  - "nine --self-test cases in scripts/generate.mjs, each observed red naming its drift"
  - "internalsLeaked() — a cross-cutting predicate over EVERY case's output: no stack frame, no node: specifier, no absolute path to this project"
  - "parserIdiomLeaked() — the malformed case's extra rule: no parenthesised parser vocabulary, no caret diagram line, no leading-slash host path"
  - "checkTargets(config, root = OUTPUT_ROOT) — parameterised, so --self-test drives the gating function on a throwaway tree"
  - "UNSET_MARK — the required-setting phrase named once, so the unknown-key case reads it from the emitter rather than copying it"
  - "registry labels generate-check and generate-self-test in scripts/verify-platform.sh's --quick array"
  - "three run steps in .github/workflows/rebase-upstream.yml, ordered generate, then --check, then byte-identity"
  - "a three-line generated-from-manifest header, identical in the emitter and in both tracked branding configure.sh files"
affects:
  - scripts/generate.mjs
  - scripts/verify-platform.sh
  - .github/workflows/rebase-upstream.yml
  - powerbrowser/branding/dev/configure.sh
  - powerbrowser/branding/release/configure.sh

tech-stack:
  added: []
  patterns:
    - "a fault that cannot be planted without the pipeline collapsing is stronger evidence than one that can — the unknown-key ordering turned out to be structurally load-bearing, so the realistic drift had to be modelled as a TOLERANT check rather than as a removed early return"
    - "assert on what a caller would have SEEN, not on the exit code, when one function reports three distinct outcomes that all exit 1; capture the console and restore it in a finally"
    - "a case whose failure mode exits the process runs in a child, because the alternative is taking the self-test down with it"
    - "name the phrase an assertion depends on ONCE at its emitter, so rewording the message moves the assertion with it instead of quietly making the case unfalsifiable"
    - "a cross-cutting property of every case belongs in a predicate applied inside the loop, never as one more case — a tenth case could only ever check its own fixture"
    - "a probe reports instrument damage with a distinct sentinel (BROKEN), so 'planted nothing' can never be mistaken for 'passed'"

key-files:
  created: []
  modified:
    - scripts/generate.mjs
    - scripts/verify-platform.sh
    - .github/workflows/rebase-upstream.yml
    - powerbrowser/branding/dev/configure.sh
    - powerbrowser/branding/release/configure.sh

decisions:
  - "checkTargets took a `root` parameter rather than the self-test re-implementing the comparison. 02-05 established the rule and this plan inherited it: two comparison paths would let the proved thing and the run thing drift, so the three freshness cases point the GATING function at a mkdtemp tree they are free to corrupt. The five tracked files are never touched by a planted fault"
  - "The reported paths keep the `generated/` prefix whatever root the comparison was handed, because that prefix names the output surface a reader has to go and fix, not the directory the invocation happened to read"
  - "The malformed-manifest case runs in a CHILD process. An unparseable layer exits from inside loadLayer rather than returning failures — correct for a pipeline with no document to carry on with, and precisely why the case cannot run in-process. The child imports resolveConfig, which 02-05's IS_MAIN guard and named exports made possible"
  - "The `unknown key` case's notExpect phrase is read from UNSET_MARK at the emitter rather than spelled a second time in the case. A copied phrase would stay green through a reword of the message it is supposed to be excluding"
  - "The no-internals rule is a PREDICATE applied to every case's output inside the loop, not a tenth case. Written as a case it could only ever check the one fixture it happened to carry; written as a predicate it goes red on whichever of the nine leaked"
  - "The `absent generated directory` case asserts from both sides: the distinct message is present AND no target path is, with the five paths DERIVED from the frozen TARGETS table rather than hand-listed. A hand-kept copy of those five could only ever agree with the table it was copied from"
  - "generate-check's registry comment states plainly that it asserts IDEMPOTENCE and nothing more. On the only tree it ever sees — one where the generator has already run — that is the honest claim; whether the emitted bytes match the five hand-written files is the separate question generated-byte-identity answers without needing a prior generate at all"
  - "The three CI steps run generate, then --check, then byte-identity, with a comment in the workflow stating why. generated/ is git-ignored and every workflow run is a fresh clone, so a freshness check placed first would report five phantom stale paths on a tree with no defect — and a gate red for a non-defect is a gate its readers learn to skip"
  - "No ./mach build step was added to the workflow. Nothing this phase produces reaches the compiler: every build consumer still reads the hand-written files. A build step would cost forty-plus minutes and gate nothing new"
  - "The header rewrite was made ONLY after the byte-identity row was run and recorded green against the ORIGINAL bytes, at commit 94c47d1 with both tracked files unmodified. The emitter's three lines and both tracked files then changed in ONE commit, so no intermediate state has the emitter and the comparand disagreeing"
  - "The new header is instructions, not description: the file to edit instead, the command to re-run, and the registry label that reddens on a disagreement. It cites `generated-byte-identity`, which makes that label a citation surface in a shipped file — accepted, per this plan's flagged assumption 2, because naming the check is what makes the header actionable"
  - "`git add -A` from the plan's Task 3 verify command was NOT run. No file this phase created is untracked — every prior wave committed its own — so the residue scan already sees all 116 of them, and a blanket stage would have swept in unrelated working-tree changes the executor was told to leave alone"

metrics:
  duration: "~35m"
  completed: "2026-09-01"
  tasks: 3
  commits: 3

actuals:
  tokens: 7392
  tasks: 3
  commits: 3
---

# Phase 02 Plan 06: Prove the failure modes, register the gates, move the target Summary

The generator's nine failure modes have each been watched going red naming their drift, all four
of the phase's gates run in the commit hook and in CI in an order where each asserts something
true, and the two files Phase 1 wrote by hand now say they are generated — the proof having been
established against the original bytes first.

## What shipped

**`scripts/generate.mjs` — the fault table, three to nine.** Six new cases:

| Case | What it plants | What it requires |
|---|---|---|
| `missing required key` | `identity.display_name`'s line deleted | red naming `identity.display_name` |
| `invalid basename` | `binary_name = "two words"` | red naming `identity.binary_name` AND the length bounds in words, AND `generated/` unchanged |
| `unknown key` | `[identity]` misspelt `[identiy]` | red naming `identiy`, and NOT carrying the missing-key phrase |
| `stale generated output` | one byte appended to a generated `.mozconfig` in a throwaway tree | red naming that path |
| `absent generated directory` | a root that does not exist | the distinct absent message, and none of the five target paths |
| `malformed manifest` | an unterminated section header, read by a child process | red naming the manifest and a line number, with no parser idiom |

Plus a **cross-cutting predicate**, applied to every case's output inside the loop rather than as a
tenth case: no stack-trace frame, no `node:` module specifier, no absolute path to this project.
That moves CLAUDE.md's no-internals copy rule from a reviewer's memory into a check.

Three supporting changes made those cases possible: `checkTargets` is parameterised on its output
root (so the self-test drives the gating function, not a copy of it); `capture()` collects the
console, because one function reports three distinct outcomes that all exit 1 and an exit code
cannot tell them apart; and `UNSET_MARK` names the required-setting phrase once at its emitter, so
the `unknown key` case reads it rather than copying it.

**`scripts/verify-platform.sh`.** Two rows appended beside 02-05's pair — `generate-check` and
`generate-self-test` — with an adjacent comment in the house style. Four generator rows total, all
in `--quick`. No sibling driver: `ls scripts/verify-phase-*.sh` finds nothing.

**`.github/workflows/rebase-upstream.yml`.** Three new `run:` steps after the residue scan, ordered
generate → `--check` → byte-identity, under a comment stating why that order and not the other.

**The two branding `configure.sh` files.** Their hand-written comment block is replaced, in the same
commit as the emitter's, by:

```
# Generated from configuration.toml by scripts/generate.mjs -- do not edit here.
# To change it, edit configuration.toml and run: node scripts/generate.mjs
# A disagreement reddens: scripts/verify-platform.sh --only generated-byte-identity
```

Lines 1–4 and the `MOZ_APP_DISPLAYNAME` define are byte-unchanged in both files.

## D-03: the proof preceded the move

Recorded explicitly, because the ordering is the whole point of this plan.

At commit `94c47d1`, with `git diff HEAD -- powerbrowser/branding/` empty — both tracked files
carrying their **original** bytes — `scripts/verify-platform.sh --only generated-byte-identity` was
run and **exited 0**. Their sha256 at that moment:

```
6c499617f0579bc4224a5979ad609023d8563706443ac77dc4167d3ec828520b  powerbrowser/branding/dev/configure.sh
8b8671e76519a19b6bcbbc4f36d509162903ff1f0cc2b9778d65bd7b312db2e9  powerbrowser/branding/release/configure.sh
```

Only then did the emitter's three lines and both tracked files change, together, in commit
`7f9d3d8`. The check is green against the new bytes. At no point did an edit to a tracked file make
a red check green.

## Every planted fault, observed red

Each new case was neutered or its subject drifted in a **copy** of `generate.mjs`, and the
self-test's response recorded. The real `generate.mjs` was never left in a faulted state; the two
manifest experiments restored `configuration.toml` and `git status` confirmed it clean afterwards.

| Fault planted | What the self-test said |
|---|---|
| the stale probe writes the file back unchanged | `'stale generated output' planted no fault at all: planted-fault instrument broken -- the planted byte did not land in .mozconfig` |
| the parse-failure copy reaches for the caught error's own message | `'malformed manifest' leaked a caret diagram line into what a reader sees` — the leaked text carried `incomplete key-value: cannot find end of key` and a bare `^` |
| the unknown-key check made TOLERANT (skip unknown leaves) | `'unknown key' did not go red naming identiy; got: identity.display_name is not set…` — five failures naming correctly-spelled keys, which is exactly the wrong-place-to-look failure this case exists to catch |
| the absent-directory outcome collapsed into the stale one | `'absent generated directory' did not go red naming nothing has been generated…; got: 5 file(s) under generated/ do not match` — all five paths listed |
| a case's fixture set identical to the clean manifest | `'missing required key' plants a fixture identical to configuration.toml; the case proves nothing` |
| a host path interpolated into a failure line | `'whitespace identity value' leaked this machine's path to the project into what a reader sees` |
| the real `configuration.toml` broken (`binary_name = "   "`) | `--self-test FAIL -- the unmodified configuration.toml is already red, so the planted-fault results below would mean nothing` |

One finding worth recording: **the unknown-key ordering could not be drifted by simply removing the
early return.** Deleting it crashes `validate()` outright, because the pipeline downstream of that
return genuinely assumes no unknown key survives. The realistic drift had to be modelled as a
*tolerant* check — two small, plausible edits — and under that model the case fires on both halves
of its assertion at once. A property that cannot be broken without the program collapsing is
stronger than one guarded only by a test, and the case still earns its place by pinning the
message a tolerant refactor would produce.

## Verification

| What was run | Result |
|---|---|
| `node scripts/generate.mjs --self-test` | PASS, exactly **9** `ok` lines, PASS line naming 9 |
| `grep -c 'e\.message' scripts/generate.mjs` | 0 |
| `node scripts/generate.mjs` / `--check` | 5 files written / `--check PASS` |
| `node scripts/verify-generated-identity.mjs` and `--self-test` | PASS / PASS |
| `--only generate-check`, `--only generate-self-test` | PASS, each summary naming its label verbatim |
| `--only generated-byte-identity`, `--only generated-byte-identity-self-test` | PASS / PASS |
| `grep -c 'node $REPO_ROOT/scripts/(generate\|verify-generated-identity).mjs'` | 4 |
| CI step order (byte offsets of the three commands) | `[4930, 5018, 5144]` — sorted |
| `grep 'mach build' .github/workflows/rebase-upstream.yml` | 2 hits, both **comments** stating the workflow does not run one; no invocation |
| `ls scripts/verify-phase-*.sh` | nothing |
| `cmp generated/branding/{dev,release}/configure.sh` vs the tracked files | 0 / 0, after the rewrite |
| both tracked files: line count, lines 1–4 vs `HEAD`, define vs `HEAD` | 8 / unchanged / unchanged |
| `grep -c 'configuration.toml'` in each tracked file | 2, 2 |
| `grep -c 'hand-written (plan 01-03)'` in each | 0, 0 |
| `node scripts/verify-branding-preflight.mjs` and `--self-test` | PASS / PASS |
| `node scripts/scan-brand-residue.mjs` (staged) | PASS, 116 files |
| `scripts/verify-platform.sh --quick` | **PASS — all checks passed** |

No `./mach build` was run.

### Human-check, both halves

*The header reads as instructions a stranger could follow.* It names the file to edit instead
(`configuration.toml`), the command to re-run (`node scripts/generate.mjs`), and the check that
catches a disagreement (`scripts/verify-platform.sh --only generated-byte-identity`). No pref key,
port, timeout or raw exception text — the only identifiers are two file paths and one registry
label, each a real affordance.

*The invalid-value message reads like documentation, not like a parser.* Run against a manifest with
`binary_name = "Power Browser"`:

```
generate: FAIL -- 1 problem(s) in configuration.toml
  - identity.binary_name is "Power Browser", which is not allowed here. Write it as lowercase
    letters, digits and hyphens only; 2 to 32 characters; must start with a letter. Allowed form:
    ^[a-z][a-z0-9-]{1,31}$ . A valid value looks like "acme-browser". Correct it in
    configuration.toml, then run: node scripts/generate.mjs
```

It names the key, quotes what was written, states the rule in words, offers a value that would work,
and ends with the command to re-run. `configuration.toml` was restored and `git status` confirmed
clean.

## Deviations from Plan

**1. [Rule 3 — Blocking] `git add -A` from Task 3's verify command was not run**

- **Found during:** Task 3, before the residue scan.
- **Issue:** the plan's verify chains `git add -A` on the premise that five files this phase created
  are untracked and therefore invisible to a scan that iterates `git ls-files`. That premise no
  longer holds — every prior wave committed its own files, and
  `git ls-files --others --exclude-standard` outside `.planning/` returns nothing. Running it would
  have staged unrelated working-tree changes (a modified `01-VERIFICATION.md`, `.gsd/`,
  `.planning/state.json`) that this executor was instructed to leave untouched.
- **Fix:** staged this task's three files by explicit pathspec, then ran the scan. It reported 116
  files — the same count 02-05 recorded — so nothing was invisible to it.
- **Files modified:** none beyond the task's own.
- **Commit:** `7f9d3d8`

No architectural deviations. No authentication gates. No auto-fix attempts were consumed on bugs:
every one of the three tasks passed its verify on the first run.

## Requirements

- **CFG-02** — already complete; this plan supplies the planted fault that proves a missing required
  key goes red naming the key.
- **CFG-03** — already complete; the `invalid basename` case adds the half that was previously
  claimed rather than shown: the value is rejected *and* nothing is written.
- **GEN-04** — already complete; this plan adds its CI placement and the freshness half.

All five of the phase's requirements were already marked complete in `REQUIREMENTS.md` by earlier
waves; nothing needed marking here.

## TDD Gate Compliance

Task 1 carries `tdd="true"`. As in 02-05, this repo has no test framework and the plan forbids
adding one — the fault-planting `--self-test` *is* the test. The gate sequence for this plan is a
single `test(...)` commit, because the machinery under test (`resolveConfig`, `checkTargets`, the
failure copy) already existed from waves 1–4 and this task added only cases against it. RED was
established for each case by planting its fault in a copy and observing the named red before the
commit landed; the table above is that record.

## Known Stubs

None. No hardcoded empty values, no placeholder text, no unwired data path. `checkTargets`' new
`root` parameter has a real second caller (`probeStaleOutput` and `probeAbsentOutput`), so it is not
dead flexibility.

## Threat Flags

None. The one new external interaction is `spawnSync(process.execPath, ['--input-type=module',
'-e', …])` in `probeMalformedManifest`: no shell, an argument array, and the only interpolated
values are `import.meta.url` and a `mkdtempSync` path, both `JSON.stringify`-quoted. It runs only
under `--self-test`.

Threat register dispositions from this plan's `<threat_model>`, all `mitigate`, all delivered:
T-02-18 (vacuous self-test) — nine faults each observed red, plus the clean-baseline guard, the
per-probe `BROKEN` sentinel and the cross-cutting predicate; T-02-03 (copy leaking internals) —
`parserIdiomLeaked` plus `internalsLeaked`; T-02-19 (editing the comparand) — the D-03 section above
records the green against the original bytes and the single commit; T-02-20 (CI red for a
non-defect) — the ordered steps and their comment.

## Notes for the phase gate

- Phase-wide registry labels now: `generate-check`, `generate-self-test`, `generated-byte-identity`,
  `generated-byte-identity-self-test`. All four are `--quick`, and all four are cited by name in
  documents or — in the case of `generated-byte-identity` — in two shipped tracked files. Treat them
  as non-renameable.
- `.planning/WINDOWS.md`'s frontmatter counts are still inconsistent and `gsd-tools windows append`
  still refuses to write. Nothing from this plan needed logging: no stub, no skipped test, no unrun
  `<verify>`.
- Flagged assumption 1 stands unmitigated and accepted: nothing in this repo installs the `.desktop`
  files, so a hand-installed copy is stale relative to `generated/`. Every consumer still reads the
  hand-written files (D-01); this becomes live when Phase 3 or 5 repoints them.

## Self-Check: PASSED

- `scripts/generate.mjs` — FOUND
- `scripts/verify-platform.sh` — FOUND
- `.github/workflows/rebase-upstream.yml` — FOUND
- `powerbrowser/branding/dev/configure.sh` — FOUND
- `powerbrowser/branding/release/configure.sh` — FOUND
- commit `01af0fd` — FOUND
- commit `94c47d1` — FOUND
- commit `7f9d3d8` — FOUND
