---
phase: 02-configuration-manifest-and-generator-core
plan: 05
subsystem: verification
tags: [verification, byte-identity, self-test, planted-faults, registry, gitignore, main-guard, GEN-04, CFG-01]
status: complete

requires:
  - "02-01 — scripts/generate.mjs's pipeline, REPO_ROOT derived from import.meta.url, and the top-level CLI dispatch this plan puts behind a main guard"
  - "02-03 — resolveConfig, the mask/merge and the validated config the gate resolves before it emits anything"
  - "02-04 — the frozen five-entry target table, the three emitters, and firstDifferingLine's precedent as a reporting-only line locator"
provides:
  - "scripts/verify-generated-identity.mjs — GEN-04's byte-identity gate: mkdtemp emission, set equality against a frozen five-path EXPECTED, Buffer.compare against the TRACKED files, git-ignore and git-ls-files assertions, non-vacuity guard"
  - "compareAgainstTracked(targets, config) — the comparison, parameterised on its target table so the self-test drives the exact function that gates"
  - "the seven-case --self-test: five one-byte emitter drifts, one surplus target, one deleted target, behind a clean-baseline guard and a per-case mutation-landed guard"
  - "named exports from scripts/generate.mjs: TARGETS, resolveConfig (defaulting to the repo manifest), REPO_ROOT"
  - "IS_MAIN in scripts/generate.mjs — importing the generator now writes nothing, parses nothing and exits nothing"
  - "registry labels generated-byte-identity and generated-byte-identity-self-test in scripts/verify-platform.sh's --quick array"
affects:
  - scripts/generate.mjs
  - scripts/verify-platform.sh

tech-stack:
  added: []
  patterns:
    - "a gate emits its own comparand into mkdtemp and compares against TRACKED files, never against a git-ignored directory — a check that is red on a fresh clone for a non-defect is a check its readers learn to skip"
    - "parameterise the comparison on the thing being compared, so --self-test drives the same function the registry row drives; two comparison paths would let the proved thing and the run thing drift"
    - "plant self-test faults in the in-memory table, never on disk, when the on-disk files are the independent comparand the whole test rests on"
    - "a main guard is a prerequisite for importability, not a nicety — without it an import writes files, rejects the importer's flags as its own, and exits the process before the importer asserts anything"
    - "assert the mutation landed on every axis the check reads (count, path, and actual emitter OUTPUT), so a drift wrapper whose anchor moved reports vacuous instead of ok"

key-files:
  created:
    - scripts/verify-generated-identity.mjs
  modified:
    - scripts/generate.mjs
    - scripts/verify-platform.sh

decisions:
  - "The gate emits into its own mkdtempSync directory and compares against the five TRACKED files, never against generated/. generated/ is git-ignored, so a comparison against it would be red on every fresh clone and every CI runner for a reason that is not a defect — and the prohibition in this plan's frontmatter names exactly that as the thing that destroys a gate's credibility. Whether generated/ itself is stale is a different question with its own instrument, generate.mjs --check"
  - "The ACTUAL emitter set is derived from generate.mjs's imported frozen table at check time; only the five-path EXPECTED is hand-kept, and it carries the comment saying why one hand-kept list is permitted here. The two have independent sources so they can disagree, which is what lets the check go red on an emitter being ADDED as well as removed"
  - "resolveConfig's defaultsPath now defaults to MANIFEST_PATH rather than exporting a fourth symbol naming the manifest. The gate calls resolveConfig() with no argument, so the manifest filename is spelled in exactly one place and cannot drift between the generator and its gate"
  - "The argument-rejection loop moved from module scope into the main guard, alongside the two flag dispatches. Left at module scope it would kill `verify-generated-identity.mjs --self-test` at import time, complaining about an argument the generator never received — an importer's flags are not the generator's"
  - "git check-ignore is asked about `generated/` WITH the trailing slash. .gitignore's pattern is `/generated/`, which matches directories only, and git cannot tell a path is a directory when the directory does not exist. Asked about bare `generated` on a fresh clone, git answers 'not ignored' and the gate would be red on a clean tree — found by running the check on a tree with generated/ deleted, which is the acceptance criterion that exists for this class of bug (deviation, Rule 1)"
  - "The git-ignore and git-ls-files assertions ride inside the byte-identity check rather than in a third script, per the plan and per CLAUDE.md's one-driver-one-registry rule. They are the same claim from the other side: the tracked files are the source of truth, the generated ones are derived and disposable"
  - "The seven planted faults mutate the in-memory target table, never a file on disk. The five tracked files are the independent comparand Phase 1 wrote by hand for this exact test; a self-test that edited one — even temporarily, even restoring it — would be one interrupted run away from corrupting what it proves against"
  - "Non-vacuity is asserted BEFORE the set comparison, not after. An emission that produced zero files agrees with anything, so it fails as broken instrumentation rather than reporting a clean diff of nothing against nothing"
  - "Each case must produce a failure CONTAINING its expected path, not merely a non-empty failure list. A failure naming some other file would prove the check can go red, not that it goes red on the thing that actually drifted"
  - "CFG-01 is marked complete in REQUIREMENTS.md by this plan. 02-04-SUMMARY.md deferred it on the explicit ground that 02-05 owns the gate row closing its last obligation; that row is now registered and green"
  - "Registry labels are generated-byte-identity and generated-byte-identity-self-test, the names 02-RESEARCH.md's Phase Requirements to Test Map cites, not PATTERNS.md's shorter generated-identity. --only resolves against these labels, so they are a public citation surface and must not be renamed"

metrics:
  duration: "~25m"
  completed: "2026-09-01"
  tasks: 2
  commits: 2

actuals:
  tokens: 5900
  tasks: 2
  commits: 2
---

# Phase 02 Plan 05: The byte-identity gate Summary

The generator's output is now proven byte-for-byte identical to the five build surfaces Phase 1
wrote by hand, by a registered check that needs no prior generate and whose seven planted faults
have each been observed going red naming the drift.

## What shipped

**`scripts/verify-generated-identity.mjs` (345 lines).** Four assertions in one row:

1. **Set equality on the emitter set.** `EXPECTED` is a frozen array of the five tracked paths and
   is the one hand-kept list in the file, carrying the comment explaining why one is permitted. The
   actual set is derived from `generate.mjs`'s imported frozen `TARGETS` table, so the two have
   independent sources and can disagree — a sixth emitter added without declaring it is reported as
   a surplus by path, and a declared file whose emitter was deleted is reported as missing by path.
2. **Emission into `mkdtempSync`**, removed in a `finally`. Nothing under `generated/` is read or
   written.
3. **`Buffer.compare` against the tracked counterpart** in the repo, with `firstDifferingLine` used
   only to say *where* after the byte assertion has already failed.
4. **`git check-ignore` and `git ls-files`** on `generated/` — GEN-04's other half, riding on this
   row rather than in a third script.

A non-vacuity guard runs before the set comparison: an emission that produced zero files fails as
broken instrumentation. The failure banner states that the five hand-written files are the
independent comparand and are not edited to make the check green.

**`scripts/generate.mjs`.** An `IS_MAIN` guard comparing the resolved `process.argv[1]` against the
resolved module path; the CLI body moved into `main()`; named exports of `TARGETS`, `resolveConfig`
and `REPO_ROOT`. `resolveConfig`'s first parameter now defaults to the repo manifest, so the gate
calls it with no argument and the manifest filename lives in one place. The argument-rejection loop
moved inside the guard.

**`scripts/verify-platform.sh`.** Two rows appended to the `--quick` array with an adjacent comment
in the house style. No sibling driver; `ls scripts/verify-phase-*.sh` finds nothing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `git check-ignore` answered "not ignored" on a tree with no `generated/`**

- **Found during:** Task 1, on the first run of the acceptance criterion that deletes `generated/`.
- **Issue:** `.gitignore`'s pattern is `/generated/`, which matches directories only. `git
  check-ignore -- generated` cannot tell the path is a directory when the directory does not exist,
  so it exits 1 and the gate reported "generated/ is not ignored by git" — red on a clean tree, and
  red for exactly the reason this plan's prohibition names as fatal to a gate's credibility. It
  passed on the first local run only because `generated/` happened to exist from an earlier session.
- **Fix:** ask about `` `${OUTPUT_DIR_NAME}/` `` with the trailing slash, with a comment stating the
  trailing slash is load-bearing and why. Verified: `generated`→1, `generated/`→0 on a tree with the
  directory absent.
- **Files modified:** `scripts/verify-generated-identity.mjs`
- **Commit:** 4587cd0

**2. [Rule 3 - Blocking] The module-scope argument loop killed the importer**

- **Found during:** Task 1A, anticipated while reading `generate.mjs`'s head.
- **Issue:** `generate.mjs` validated `process.argv` at module scope, so importing it from a script
  invoked with any flag the generator does not accept would `process.exit(1)` at import time,
  blaming the generator for the importer's argument.
- **Fix:** moved the loop into `rejectUnknownArguments()`, called from `main()` behind `IS_MAIN`.
  `node scripts/generate.mjs --bogus` still exits 1 naming the argument.
- **Files modified:** `scripts/generate.mjs`
- **Commit:** 4587cd0

No architectural deviations. No authentication gates.

## Verification

Every acceptance criterion in both tasks was run. The two that prove the instrument discriminates
were run destructively and reverted:

| What was run | Result |
|---|---|
| `rm -rf generated && node scripts/verify-generated-identity.mjs` | PASS, and `generated/` was not created |
| generate, snapshot sha256 set, re-run the gate, re-snapshot | PASS, set unchanged |
| `node scripts/verify-generated-identity.mjs --self-test` | PASS, exactly 7 `ok` lines, PASS line naming 7 |
| Appended one byte to the tracked `.mozconfig`, ran `--self-test` | Bailed with the already-red-baseline message naming `.mozconfig` line 13; file restored, `git diff` clean |
| Copy of the script with the five drift cases neutered to `targets: TARGETS` | Each reported **vacuous**, exit 1; copy deleted |
| `node scripts/generate.mjs`, `--check`, `--self-test`, `--bogus` | 5 files written / PASS / PASS / exit 1 naming the argument |
| `node -e "import('./scripts/generate.mjs')…"` | `TARGETS 5, resolveConfig function, REPO_ROOT string`, no file written, no exit |
| `scripts/verify-platform.sh --only generated-byte-identity` | PASS, summary names the label verbatim |
| `scripts/verify-platform.sh --only generated-byte-identity-self-test` | PASS |
| `ls scripts/verify-phase-*.sh` | nothing — no sibling driver |
| `scripts/verify-platform.sh --quick` | PASS, all checks, with both new rows green |
| `node scripts/scan-brand-residue.mjs` after staging | PASS, 116 files |

No `./mach build` was run.

## TDD Gate Compliance

Both tasks carry `tdd="true"`. This repo has no test framework and the plan explicitly forbids
adding one — the fault-planting `--self-test` *is* the test, and it is registered as its own row.
The gate sequence is therefore `feat` (the instrument) then `test` (the seven planted faults that
prove it discriminates), which inverts the RED/GREEN order. That inversion is inherent to a
self-test that drives the very function it is proving: there is nothing to plant a fault in until
the comparison exists. Both negative cases were nonetheless *observed* red before the `test` commit
landed, which is the property RED exists to establish.

## Requirements

- **GEN-04** — already complete; this plan supplies its mechanical proof.
- **CFG-01** — marked complete. 02-04-SUMMARY.md deferred it on the explicit ground that 02-05 owns
  the gate row closing its last obligation. That row is registered and green.

## Known Stubs

None. No hardcoded empty values, no placeholder text, no unwired data paths.

## Threat Flags

None. No new network endpoint, auth path, or schema change at a trust boundary. The two `git`
invocations use `execFileSync` with an argument array and no shell, and `--` separates the path
argument from the flags.

## Notes for the next plan (02-06)

- The byte-identity row is green, which is the precondition 02-04 and this plan both recorded for
  rewriting the emitted comment blocks. From here, changing an emitted byte deliberately means
  changing the tracked file and the emitter in the same commit — the gate will name any file where
  only one of the two moved.
- `generate.mjs` is now importable. Anything 02-06 needs from it should be a named export plus a
  line in the gate's rationale, not a re-implementation.
- `.planning/WINDOWS.md` frontmatter counts are still inconsistent and `gsd-tools windows append`
  still refuses to write. Nothing needed logging from this plan.

## Self-Check: PASSED

- `scripts/verify-generated-identity.mjs` — FOUND
- `scripts/generate.mjs` — FOUND
- `scripts/verify-platform.sh` — FOUND
- commit `4587cd0` — FOUND
- commit `c25fb75` — FOUND
