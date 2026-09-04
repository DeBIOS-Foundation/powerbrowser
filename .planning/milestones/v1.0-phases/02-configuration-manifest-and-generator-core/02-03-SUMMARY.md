---
phase: 02-configuration-manifest-and-generator-core
plan: 03
subsystem: generator
tags: [generator, defaults-layer, mask, merge, provenance, self-test, CFG-01, CFG-02, CFG-04]
status: complete

requires:
  - "02-01 — scripts/generate.mjs's pipeline, scripts/lib/config-schema.json's required flag, the vendored parser"
provides:
  - "maskDefaults(layer, schemaKeys) — strips every schema-required key path from the defaults layer, so identity, legal and both vendor keys are un-inheritable (D-06)"
  - "mergeLayers(defaults, downstream) — recursive key-level merge returning the resolved value plus the dotted paths it defaulted; arrays are leaves and replace (D-07)"
  - "the default echo — one sorted stderr line per inherited default, on every run including --check (D-08)"
  - "scripts/generate.mjs --self-test — clean-baseline guard, frozen case table, per-case vacuity guard, counted PASS line; three cases landed, 02-06 appends the rest"
  - "resolveConfig(defaultsPath, downstreamPath) — the whole pipeline as a function that RETURNS failures, which is what makes planted-fault testing possible at all"
affects:
  - scripts/generate.mjs

tech-stack:
  added: []
  patterns:
    - "derive the mask list from the schema's required flag at call time rather than keeping a second list, so a newly-required key is masked the moment it is added"
    - "return provenance out of the merge instead of re-deriving it in a second traversal — a second traversal is a second source of truth that can disagree"
    - "make the pipeline a function that returns failures rather than exits, so a self-test can read what a planted fault produced"
    - "split the root manifest along the mask line so the project's own build exercises the same merge a downstream will, instead of leaving the merge exercised only by its own test"

key-files:
  created: []
  modified:
    - scripts/generate.mjs

decisions:
  - "Power Browser is its own downstream: the root manifest is split along the mask line — its optional keys are the defaults layer, its required keys are the downstream layer. The plan's literal 'downstream source is absent in every production call' is internally inconsistent with its own verify command, because masking the defaults and merging against an empty object removes identity.* from the resolved config and fails validation."
  - "maskDefaults and requiredLayer are two thin calls into one projectLayer traversal keyed on required-ness, rather than two separate walkers — the mask and its complement partition the same manifest and must never disagree about where the line is"
  - "An array is a leaf to the masker exactly as it is to the merge. No variants[] path is required today, and validate() already carries the same assumption in its path.includes('[]') skip; the assumption is stated in a comment at the masker rather than guarded, so all three readers of it stay consistent"
  - "The defaulted array carries paths only, not values; the echo reads each value back through the existing readPath. Recording the value too would be a second copy of a fact the resolved config already holds"
  - "Both CLI flags dispatch at the bottom of the file rather than at the top: --check has to echo the applied defaults on its way past (D-08) and --self-test has to run the same pipeline the default invocation runs, so neither can act before that pipeline is defined"
  - "--self-test landed here rather than in 02-06 as plan 02-01 projected: this plan's own action specifies the harness and three cases, and 02-06 appends the remaining cases to the table this plan froze"

metrics:
  duration: "~35m"
  completed: "2026-09-01"
  tasks: 2
  commits: 2

actuals:
  tokens: 6900
  tasks: 2
  commits: 2
---

# Phase 02 Plan 03: Mask, merge, and echo the defaults layer Summary

`configuration.toml` is now the defaults layer a downstream overlays — stripped of every required
key before it can be inherited, merged key-level at any depth with arrays replacing rather than
joining, and reporting on stderr exactly which four of Power Browser's cosmetic values any given
run fell back on.

## What Was Built

**The mask, and its complement.** `maskDefaults(layer, schemaKeys)` returns a copy of the defaults
layer with every schema-`required: true` dotted path removed — the ten identity, legal and vendor
keys. The list is derived from the schema flag at call time and exists nowhere else, so a key that
becomes required is masked the moment it is marked, with no edit to the masker. Removal is per key
path rather than per table, which is the whole point: a downstream that sets `identity.app_basename`
and omits `identity.binary_name` gets exactly the failure a downstream that omits `[identity]`
entirely gets. Tables left empty by the mask are dropped rather than kept as empty sections, so a
masked layer has no `identity` key at all rather than an `identity` the downstream's table still has
to win against.

`requiredLayer` is the complement, and both are one `projectLayer` traversal keyed on required-ness
— the mask and its complement partition the same manifest and cannot be allowed to disagree about
where the line falls.

**The merge, which reports its own provenance.** `mergeLayers(defaults, downstream)` returns
`{ value, defaulted }`. It recurses only where BOTH sides are tables; anything else the downstream
states wins and is never recorded, including a value that happens to equal the default. A default
table wholly absent downstream is descended against a frozen empty layer, so what gets recorded is
the leaf paths inside it (`theia.default_theme`) rather than the table's own path. An array is a
leaf, so a downstream array replaces the whole default array — the only way a downstream can DROP a
default entry, and the reason the array branch carries a comment naming D-07 and the self-test case
that goes red if someone "fixes" it. Accumulators are `Object.create(null)` and the three reserved
names are skipped by name, behind the unknown-setting gate that already refuses them (D-12).

**The echo.** One `console.error` line per inherited default, sorted lexicographically by dotted
path, rendered with `JSON.stringify` so a string is quoted and an array lands on one line. On every
run, including `--check`. A Phase-2 run prints four: `product.description`, `product.homepage`,
`theia.default_theme`, `variants`. It prints nothing matching `identity.` or `legal.`, because the
mask removed those before the merge could reach them. Both counts are now in the PASS line.

**The self-test.** `--self-test` is no longer a stub. It runs the pipeline over the unmodified
manifest first and bails with an explicit message if that is already red, then plants three fixtures
as TOML strings in a `mkdtempSync` directory removed in a `finally`, refusing any case whose fixture
is identical to the clean manifest. Two cases assert the failure output contains a named string; the
third asserts a predicate over the resolved config, and both shapes live in one table so the counted
PASS line covers every case.

| Case | What it pins | Goes red if |
|---|---|---|
| `whitespace identity value` | D-10 — an empty-ish value is not a value | the unset test stops trimming |
| `partial identity table` | the mask ORDERING | the mask is moved after the merge |
| `downstream array shorter than default` | D-07 array-replace | arrays are ever joined end to end |

The second case is the one that earns its place. The defaults layer carries `identity.binary_name`,
so if the mask ran on the merged result instead of on the defaults object, this fixture would
silently inherit it and the case would go green. A self-test whose only identity fault is a wholly
missing table cannot catch that.

## Verification

| Check | Result |
|---|---|
| `node scripts/generate.mjs` | PASS — 1 file written, 4 defaults applied |
| `cmp generated/branding/dev/configure.sh powerbrowser/branding/dev/configure.sh` | identical, no output |
| `node scripts/generate.mjs --self-test` | PASS — 3 planted faults, 3 `ok` lines |
| two consecutive runs, stderr compared with `cmp` | byte-identical |
| `grep -c 'default applied'` over stderr | 4 (≥ 3) |
| `sort -c -k3` over stderr | already ordered, no reordering |
| `grep -c 'identity\.'` over stderr | 0 |
| merge-shape probe (`Object.create(null)` present, `defaulted` present, no `concat(`) | `merge shape ok` |
| `scripts/verify-platform.sh --quick` | PASS — all rows |
| `node scripts/generate.mjs --check` | echoes 4 defaults, then its 02-04 stub line |

Both negative guards were exercised against a temporarily mutated tree and restored under a trap:

- A whitespace `legal.license` planted in `configuration.toml` made `--self-test` bail with
  `the unmodified configuration.toml is already red, so the planted-fault results below would mean
  nothing` and exit 1, rather than reporting its three cases as passing.
- Replacing case 1's fixture with the clean manifest text made `--self-test` fail that case as
  proving nothing, and exit 1, while the other two still reported `ok`.

All seven of Task 1's `<behavior>` rows were exercised under a RED-then-GREEN harness: **7 fail
before, 7 pass after**. The harness is a stripped, import-only copy of `generate.mjs` built in the
scratchpad by `sed`; nothing was added to the tree, per plan 02-01's precedent and CLAUDE.md's rule
against sibling verification drivers.

## TDD Gate Compliance

Both tasks carry `tdd="true"`. Both RED steps were real and ran first:

- **Task 1** — the seven-probe harness reported **0 pass / 7 fail** against the pre-Task-1 tree
  (`maskDefaults is not a function`), then **7 pass / 0 fail**.
- **Task 2** — `grep -c 'default applied'` returned 0 and `--self-test` printed
  `nothing was planted` and exited 0 vacuously, before the echo and the harness existed.

**No `test(...)` commit exists, and that is deliberate rather than a skipped gate**, on exactly the
grounds plan 02-01 recorded: the plan's `<files>` lists name no test file, and CLAUDE.md forbids
sibling verification drivers — a check in this tree is a row in `scripts/verify-platform.sh` or a
`--self-test` inside the thing it checks. This plan is where the durable form landed: three of
plan 02-01's eight behaviors are now pinned inside `generate.mjs --self-test`, and the remaining
five are 02-06's to append.

## Deviations from Plan

**1. [Rule 1 - Bug] Power Browser is its own downstream; the plan's "absent downstream" is
internally inconsistent**

- **Found during:** Task 1, wiring `resolveConfig`
- **Issue:** The action states the downstream source "is absent in every production call" and that
  the merge runs "with an empty downstream object". Masking the defaults layer and merging it under
  an empty object removes every required key from the resolved config, so `identity.display_name`
  is undefined, validation fails with ten unset-key errors, and `node scripts/generate.mjs` exits 1
  — contradicting the plan's own `<verify>` command, which runs `node scripts/generate.mjs && cmp
  …`, and its acceptance criterion that byte-identity survives. The alternative reading — passing
  the raw manifest as the downstream layer — resolves correctly but defaults nothing, contradicting
  the criterion that at least three defaults are echoed.
- **Fix:** The root manifest is split along the mask line. Its optional keys are the defaults layer
  (`maskDefaults`), its required keys are the downstream layer (`requiredLayer`). Their union is the
  manifest, so byte-identity holds; the echo names exactly the four optional keys and no required
  one; and there is still exactly one merge code path. It is also strictly stronger than the plan's
  intent: this project's own build now exercises the same merge a downstream will, rather than
  leaving that merge exercised only by its own test — which was the fate flagged in the plan's first
  `<flagged_assumptions>` entry.
- **Files modified:** `scripts/generate.mjs`
- **Commit:** 8d70145

**2. [Rule 3 - Blocking] The pipeline had to become a function that returns rather than exits**

- **Found during:** Task 2, writing the harness
- **Issue:** The tracer ran as top-level statements calling `report()`, which `process.exit(1)`s on
  the first failing manifest. A self-test that plants a fault cannot read what that fault produced
  if reading it kills the process.
- **Fix:** `resolveConfig(defaultsPath, downstreamPath)` returns `{ failures, config, defaulted }`.
  Only the two conditions a self-test can never provoke — a missing file and an unparseable one —
  still exit from inside `loadLayer`. `report()` is unchanged and is called by the run section.
- **Files modified:** `scripts/generate.mjs`
- **Commit:** ff46172

**3. Process deviation — an unrelated pre-staged file rode along in the first commit, and was
repaired**

`.planning/phases/01-platform-extraction-and-rename/01-LEARNINGS.md` was staged before execution
began by an earlier workflow. The first `git commit` used `-m` without a pathspec and swept it into
the Task 1 commit. Repaired by `git reset --soft` back to `50f9fc9` (the branch has no remote and no
upstream, so nothing was published), restoring `01-LEARNINGS.md` to its original staged-but-
uncommitted state and re-creating both commits from their saved blobs with an explicit
`-- scripts/generate.mjs` pathspec. The two commits carry identical trees and messages to the
originals under new hashes; the originals remain in the reflog. Final commit hashes are `8d70145`
and `ff46172`; the pre-repair `bfa324f` and `818d0b7` are abandoned.

## Authentication Gates

None.

## Human Checkpoints

None — both tasks are `type="auto"` and the plan carries no checkpoint.

## Known Stubs

| File | Stub | Why it is intentional |
|---|---|---|
| `scripts/generate.mjs` | `--check` prints one line and compares nothing | The plan states the compare mode arrives in plan 02-04. It now resolves the config and echoes its defaults on the way past, per D-08, so only the comparison itself is absent. |

Neither the mask, the merge, the echo nor the self-test is stubbed. No stub blocks this plan's goal.

## Deferred Items

- `scripts/generate.mjs` is not yet a row in `scripts/verify-platform.sh`, so `--self-test` and the
  byte-identity check run only when invoked by hand. The plan does not ask for the row and its
  acceptance criteria require only that `--quick` stays green; registering it belongs with the
  remaining targets in 02-04/02-06. Logged in this phase's `deferred-items.md` rather than in
  `.planning/WINDOWS.md`, whose frontmatter counts are inconsistent and which `gsd-tools windows
  append` currently refuses to write.

## Threat Flags

None. All four `mitigate` dispositions in the plan's register were implemented as written:

- **T-02-04** — the mask is applied to the defaults layer object and its call site is textually
  before the `mergeLayers` call; the `partial identity table` case pins the ordering.
- **T-02-01** — unknown-setting rejection still runs over BOTH layers before the merge; the merge's
  accumulators are null-prototype and skip the three reserved names by name. A `__proto__` fixture
  leaves `Object.prototype` clean.
- **T-02-09** — the echo prints a dotted key path and a manifest value and nothing else: no
  filesystem path, no host name, no parser diagnostic.
- **T-02-10** — the array branch carries the D-07 comment naming what array-replace buys, and the
  `downstream array shorter than default` case is what actually goes red.

No new security-relevant surface was introduced. No network endpoint, no auth path, no schema change
at a trust boundary; the only new file access is `mkdtempSync` under the OS temp directory, removed
in a `finally`, reached only by `--self-test`.

## Requirements

- **CFG-01** — advanced, not complete: still claimed by all of 02-01..02-05.
- **CFG-02** — already complete; this plan strengthens it. Identity, vendor and legal values can no
  longer be inherited under ANY combination of set and unset keys, including the partial case.
- **CFG-04** — **complete.** Cosmetic settings fall back to Power Browser's own
  `configuration.toml`, which IS the defaults layer, through exactly one merge path; every applied
  default is echoed once, sorted, on every run; nothing is echoed for a downstream-set key, even one
  whose value equals the default.

## Self-Check: PASSED

- `scripts/generate.mjs` exists on disk, 630 lines, and contains `maskDefaults`, `mergeLayers`,
  `Object.create(null)` and no `concat(`.
- Both commits are present in `git log`: `8d70145` (mask and merge) and `ff46172` (echo and
  self-test). The abandoned pre-repair hashes `bfa324f` and `818d0b7` are deliberately NOT claimed.
