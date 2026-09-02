---
phase: 02-configuration-manifest-and-generator-core
plan: 04
subsystem: generator
tags: [generator, target-table, emitters, mozconfig, desktop-entry, byte-identity, check-mode, CFG-01, CFG-03, GEN-04]
status: complete

requires:
  - "02-01 — scripts/generate.mjs's pipeline, the frozen one-entry target table, the writer, the argument loop, REPO_ROOT derived from import.meta.url"
  - "02-03 — resolveConfig, the mask/merge, the default echo, and the --self-test harness whose three planted faults this plan preserves"
provides:
  - "the frozen five-entry target table — the single declaration the default run, --check, and plan 02-05's byte-identity gate all iterate"
  - "emitMozconfig(config, variant) — the eleven-line root .mozconfig, four manifest values, six toolchain lines deliberately literal"
  - "emitDesktopEntry(config, variant) — the nine-line freedesktop entry, absolute Exec and Icon derived from REPO_ROOT, one emitter for both variants"
  - "emitConfigureSh(config, variant) — renamed from emitDevConfigureSh; one emitter now serves dev and release, the difference being entirely name_suffix"
  - "writeTargets(config, root) — the writer parameterised on its output root, which is what lets --check reuse it against a temporary directory"
  - "checkTargets(config) — the real --check: mkdtemp emission, Buffer.compare, the absent-directory message, the stale report, the two-direction set equality, the non-vacuity guard"
  - "filesUnder(dir, prefix, out) and firstDifferingLine(a, b) — the recursive listing that sees a leftover at any depth, and the reporting-only line locator"
affects:
  - scripts/generate.mjs

tech-stack:
  added: []
  patterns:
    - "parameterise the writer on its output root so the check reuses the production writer against a temporary tree — two writers would let the checked bytes drift from the written ones"
    - "compare the emitted set against the on-disk set in BOTH directions, so a leftover from an emitter removed later goes red as loudly as a missing file"
    - "collect failure classes separately when their next steps differ — a next step that does not fix the condition it is offered for is worse than none"
    - "build shell-default expansion syntax by string concatenation, never by template interpolation, so the dollar-brace survives to the emitted bytes"
    - "one emitter per FILE FORMAT, parameterised by variant, rather than one emitter per output file — a per-file emitter lets two files that must differ in one line silently drift in others"

key-files:
  created: []
  modified:
    - scripts/generate.mjs

decisions:
  - "One emitter serves both configure.sh files and one serves both .desktop files, rather than a per-target emitter. The dev/release differences are entirely the variant's name_suffix, branding_dir and objdir; a second emitter would make the two files independently editable, which is precisely how they drift"
  - "The mozconfig emitter takes the dev variant not as an arbitrary default but because dev IS what an unset environment means there: the two shell-default expansions on lines 1 and 10 spell out the fallback when POWERBROWSER_OBJDIR and POWERBROWSER_BRANDING are unset, and those fallbacks are the dev values"
  - "The two shell-default expansion lines are built by string concatenation rather than template interpolation. A dollar-brace inside a JS template literal is JS interpolation; the shell syntax has to survive verbatim to the emitted bytes"
  - "Six of the mozconfig's eleven lines stay literal text (research assumption A3, recorded in a source comment): they are toolchain and feature flags, not rebrand inputs. Promoting one to a [build] key later costs one schema entry and one emitter line, so the cheap direction is to defer"
  - "The two generated .desktop filenames are fixed platform identifiers in Phase 2. Naming a downstream's entry after its own binary is GEN-03/Phase 3; doing it here would mean a manifest value chose a filename, which is the exact property the frozen table exists to prevent"
  - "--check reports stale and leftover as SEPARATE classes with separate next steps. Regenerating replaces a file that differs but never removes one that should not be there, so offering 'run the generator' for a leftover is a next step that does not fix what it is offered for (deviation, Rule 2)"
  - "checkTargets returns an exit code rather than calling process.exit, because process.exit does not run finally blocks and the temporary directory's cleanup would be skipped on every failure path"
  - "The line-level differ is a reporting aid computed only after Buffer.compare has already failed. Used as the check itself it would call two files identical when they differ in trailing whitespace or line endings — exactly the class of difference this phase's acceptance test is about"
  - "CFG-01 stays unchecked in REQUIREMENTS.md. Plans 02-01 through 02-05 all claim it and 02-05 owns the gate row that closes the last obligation; marking it here would mark it before its verification row exists"

metrics:
  duration: "~30m"
  completed: "2026-09-01"
  tasks: 2
  commits: 2

actuals:
  tokens: 10100
  tasks: 2
  commits: 2
---

# Phase 02 Plan 04: Expand the target table and make --check honest Summary

All five Phase 1 build surfaces are now produced from `configuration.toml` alone and are
byte-identical to the files that were written by hand, and `--check` distinguishes fresh from
stale from absent from cluttered without writing a byte under `generated/`.

## What Was Built

**The frozen five-entry target table.** It grew from one entry to five: the root `.mozconfig`,
both branding `configure.sh` files, and both `.desktop` files. Every entry carries a generated
path, a tracked path, a variant id and an emitter, and **both paths in every entry are string
literals**. No manifest value is joined into a write path anywhere in the file — a variant
contributes `objdir` and `branding_dir` as emitted *content* (an `Icon=` line, a shell-default
expansion), never as a write target. That is what structurally prevents a config key directing a
write outside `generated/` (T-02-02, GEN-04), and it is why the variant schema carries no
output-filename key: there is nowhere for one to be honoured.

**The mozconfig emitter.** Eleven lines. Four values come from the manifest — the
`--with-app-basename` argument, the `--with-distribution-id` argument, the exported
`MOZ_APP_REMOTINGNAME`, and, inside the two shell-default expansions, the dev variant's `objdir`
and `branding_dir`. The two expansion lines are built by string concatenation rather than template
interpolation, because a dollar-brace inside a JS template literal is JS interpolation and the
shell syntax has to reach the emitted bytes intact. Six lines are literal toolchain flags, with the
reasoning recorded in a source comment so a later reader knows it was decided rather than
overlooked.

**The desktop-entry emitter.** Nine lines per variant, one emitter for both. `Exec` and `Icon`
carry an absolute path built from `REPO_ROOT` — which this file derives from its own location, not
from `process.cwd()` and not from a manifest key. That is D-04 held in both directions: no
machine-specific value enters `configuration.toml`, and the emitted bytes do not depend on where
the generator was invoked from.

**`emitDevConfigureSh` became `emitConfigureSh`.** One emitter now serves dev and release. The two
files differ in exactly one line and that difference is entirely the variant's `name_suffix`, whose
release value is the empty string. If they ever differ by anything else, the emitter is wrong and a
second emitter would be the wrong repair.

**The real `--check`.** It emits a fresh comparand into a unique `mkdtempSync` directory removed in
a `finally`, byte-compares with `Buffer.compare`, and **writes nothing under `generated/`**. A
check that regenerates in place and then compares cannot tell "was already fresh" from "I just made
it fresh"; the uniqueness of the directory is what makes two concurrent invocations safe where a
fixed temp path would have them overwrite each other's comparand (T-02-12). It reuses
`writeTargets`, now parameterised on its output root, so the checked bytes cannot drift from the
written ones.

Four outcomes, each with its own message:

| State | Behaviour |
|-------|-----------|
| fresh | exit 0, one PASS line counting the files compared |
| stale / missing | exit 1, each path on its own indented line with the first differing line number |
| `generated/` absent | exit 1, its own single message; the five target paths are **not** listed |
| leftover file | exit 1 naming it, via set equality run in both directions |

The absent case is separated deliberately (Pitfall 1): `generated/` is git-ignored, so every fresh
clone and every CI run starts there. Reporting it as five stale files reads as five problems and
sends the reader hunting a drift that does not exist.

The set comparison runs in **both** directions. A per-target loop alone sees a file that is missing
or wrong but is blind to one that should no longer exist, so an emitter deleted later would leave
its output behind forever with nothing to notice.

A **non-vacuity guard** fails a comparison whose comparand is empty, rather than reporting a clean
diff of nothing against nothing — the same instrument-integrity rule `verify-registry-shape.mjs`
carries.

## Verification Performed

| Check | Result |
|-------|--------|
| Five `cmp` against the tracked Phase 1 files | all exit 0, no output |
| `find generated -type f \| wc -l` | 5 |
| `tail -c1 \| od -An -tx1` on each | `0a` for all five |
| Carriage returns under `generated/` | none |
| Run from `/tmp` with an absolute script path | identical sha256 set; output lands at the repo root, not in `/tmp` |
| `grep -c 'os.EOL' scripts/generate.mjs` | 0 |
| `grep -c 'repo_root' configuration.toml` | 0 |
| Idempotence: two full runs | byte-identical sha256 set |
| `--check` after a clean generate | exit 0 |
| One byte appended to `generated/.mozconfig` | exit 1, names `generated/.mozconfig` and no other target (`grep -c 'configure.sh'` = 0) |
| `generated/` deleted | exit 1, `grep -c 'mozconfig'` = 0 — the distinct message, not a five-path list |
| `touch generated/leftover.txt` | exit 1 naming `generated/leftover.txt` |
| sha256 set of `generated/` across every `--check` | unchanged — the mode writes nothing there |
| `--check` stderr | carries the same four `default applied` lines a default run produces (D-08) |
| `mkdtempSync` result removed in a `finally`; no fixed temp path literal | confirmed, `grep` for a `/tmp` literal returns none |
| `node scripts/generate.mjs --self-test` | PASS, 3 planted faults, all still behaving as pinned |
| `scripts/verify-platform.sh --quick` | PASS — all checks |

No `./mach build` was run. D-01 keeps every build consumer on the hand-written files, so nothing
under `generated/` reaches the compiler in this phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] The leftover-file next step did not fix the condition it was offered for**

- **Found during:** Task 2, on reading the first emitted failure transcript.
- **Issue:** The first implementation reported stale files and leftover files in one list under one
  next step — "run the generator". That is accurate for a file whose bytes differ and **wrong** for
  a leftover: regenerating replaces a wrong file but never removes a stray one, so the reader is
  told to run a command that leaves the reported problem exactly where it was. CLAUDE.md's
  user-facing copy rule requires every message to end with a next step that is a real affordance.
- **Fix:** The two classes are collected into separate arrays and each prints its own next step —
  regenerate for stale, delete or move for a leftover. The banner still counts both together.
- **Files modified:** `scripts/generate.mjs`
- **Commit:** `832bf93`

No other deviations. Both tasks executed as written.

## Known Stubs

None. Every emitter produces its complete target and every `--check` branch is exercised by the
plan's verify chain.

## Threat Flags

None. This plan added no network endpoint, no auth path and no schema change at a trust boundary.
The three threats the plan registered are all mitigated as specified: both target paths are
literals (T-02-02); `MOZ_APP_DISPLAYNAME` is emitted inside double quotes and the three bare
mozconfig arguments are each regex-gated by the schema to characters carrying no shell meaning
(T-02-11); and `--check` was verified to leave the sha256 set of `generated/` unchanged across
every invocation, with the non-vacuity guard in place (T-02-12). T-02-13 remains accepted as
recorded — the absolute host path in the emitted `Exec` and `Icon` lines is required content in a
git-ignored file, not user-facing error copy.

## Requirements

- **CFG-03** — already marked complete in 02-01; the mozconfig emitter consumes the same
  regex-gated basename fields and adds no new validation surface.
- **GEN-04** — already marked complete; this plan makes it real rather than promised: every output
  path is a literal in one frozen table, and `--check` is now a discriminating instrument that has
  been seen to go red on each of stale, absent, and cluttered.
- **CFG-01** — deliberately left unchecked. Plans 02-01 through 02-05 all claim it and 02-05 owns
  the `verify-platform.sh` row that closes the last obligation. Marking it here would mark it
  before its verification row exists.

## Notes for Later Plans

- **02-05** adds the byte-identity row to `scripts/verify-platform.sh`. It must emit into its own
  `mkdtempSync` and diff against the five **tracked** files, not against `generated/` — a row that
  depends on `generated/` existing is red on every fresh clone (Pitfall 1). The five entries it
  needs are already in `TARGETS`, each carrying its tracked path; iterate that array rather than
  restating the list.
- **02-06** rewrites the hand-written comment currently reproduced verbatim inside
  `emitConfigureSh` (D-03). That rewrite is only safe once 02-05's byte-identity row is green,
  because the row is what will notice if the rewrite changes anything else.
- The plan's flagged assumption 1 (a deliberate `git add -f generated/`) is unchanged and remains an
  accepted residual: 02-05's `git ls-files generated/` assertion catches a forced add after the
  fact but does not prevent one.

## Self-Check: PASSED

Both commits (`9e3e706`, `832bf93`) are present in `git log`, and both files this plan
touches — `scripts/generate.mjs` and this summary — exist on disk.
