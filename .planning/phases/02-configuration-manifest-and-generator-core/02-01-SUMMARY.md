---
phase: 02-configuration-manifest-and-generator-core
plan: 01
subsystem: generator
tags: [generator, configuration-manifest, toml, vendoring, tracer, CFG-01, CFG-02, CFG-03, GEN-04]
status: complete

requires: []
provides:
  - "configuration.toml at the repo root — the settings half of CFG-01's rebrand surface, and the Phase 7 defaults layer (D-05)"
  - "scripts/lib/toml.cjs — vendored smol-toml 1.8.0, the one TOML parser (D-13), self-contained with no install step"
  - "scripts/lib/config-schema.json — the one schema table; required:true IS the mask list (D-06)"
  - "scripts/generate.mjs — the parse/reject/validate/emit/write pipeline with one proven target"
  - "generated/ — git-ignored output root (GEN-04, D-16)"
affects:
  - .gitignore

tech-stack:
  added:
    - "smol-toml 1.8.0 (vendored as scripts/lib/toml.cjs, BSD-3-Clause, sha256 195ca51f…)"
  patterns:
    - "vendor a single self-contained CJS bundle under scripts/lib/ rather than npm-pinning it, so verify-platform.sh --quick keeps running on a fresh clone with no install, no network, and no dev shell"
    - "record provenance in a fixed-line-count header whose digest line names the strip offset, so a re-vendor is a mechanical replay rather than a judgement"
    - "reject unknown settings BEFORE any assignment, so a reserved key name never reaches an assignment and a misspelled section reports the misspelling rather than the keys it shadowed"
    - "collect every validation failure into one array and exit once, the shape verify-branding-preflight.mjs already uses"
    - "output paths live only in a frozen target array; no input value is ever joined into a write path"

key-files:
  created:
    - scripts/lib/toml.cjs
    - scripts/lib/toml.LICENSE
    - scripts/lib/config-schema.json
    - configuration.toml
    - scripts/generate.mjs
  modified:
    - .gitignore

decisions:
  - "smol-toml 1.8.0 is vendored, not npm-pinned: pinning would require npm ci before verify-platform.sh --quick could run at all, destroying the no-install property every existing --quick row depends on"
  - "The provenance header is exactly 22 lines and says so, and its digest line records the strip offset (tail -n +23) rather than a digest of the whole file — a digest of the file including its own header could never be reproduced from the tarball"
  - "display_name lives under [identity], not [product]: D-06 masks whole tables, so a downstream that omits it hard-fails instead of silently inheriting this project's mark"
  - "The vendor stays two settings (vendor_machine, vendor_display): the machine form is lowercased into the profile directory path with no space stripping, so collapsing them puts a space in a path against this repo's fourth hard rule"
  - "config-schema.json gained a regex_example field beyond the plan's four named per-key fields, because the plan's action requires each pattern failure to offer a concrete corrected example and the exact regex_help wording was fixed by the plan"
  - "isTable() identifies a table as an object that is neither an array nor a Date, not by a null prototype — smol-toml's tables inherit from a prototype-less base object rather than having a null prototype, so the prototype test silently classified every section as a scalar leaf"
  - "No test file was committed: the plan's <files> list carries none and CLAUDE.md forbids sibling verification drivers. The RED step ran from a scratchpad harness; the durable self-test is wired into generate.mjs --self-test in plan 02-06"

metrics:
  duration: "~30m (continuation dispatch; the Task 1 human checkpoint is not counted)"
  completed: "2026-09-01"
  tasks: 3
  commits: 2

actuals:
  tokens: 11900
  tasks: 3
  commits: 2
---

# Phase 02 Plan 01: Configuration manifest and generator core Summary

One brand setting now travels the whole path — `configuration.toml`, the vendored parser, the
schema table, the unknown-setting gate, the validator, the emitter, the writer — and lands as
bytes identical to the `configure.sh` plan 01-03 wrote by hand.

## What Was Built

**The parser, with provenance a re-vendor can replay.** `scripts/lib/toml.cjs` is
`smol-toml@1.8.0`'s `dist/index.cjs`, obtained by `npm pack` and verified at sha256
`195ca51fc784617d361af3697756a896518e45bec4e35976baec2dffd656cb8f` / 22907 bytes twice: once in
the unpacked tarball before the copy, once in the tree after it. A 22-line header records the
package and version, the digest, the licence and where its text lives, and the exact `npm pack`
command — and it states the strip offset (`tail -n +23`) so the recorded digest stays checkable
against a file the header is now part of. `scripts/lib/toml.LICENSE` retains the BSD-3-Clause
notice. There is no root `package.json` and no `node_modules/`: that absence is the point, and
it is why `scripts/verify-platform.sh --quick` still runs on a fresh clone with no network.

**The manifest.** `configuration.toml` carries Power Browser's complete identity across
`[product]`, `[identity]`, `[legal]`, `[theia]`, and a two-element `[[variants]]` array, every
value hand-copied from the inventory's `brand_display_expectations` block. Nothing reads the
inventory at run time and nothing points `verify-branding-preflight.mjs` at the manifest — that
independence is the only thing keeping the preflight from agreeing with itself. Both placement
notes the plan asked for are header comments in the file: why `display_name` sits under
`[identity]`, and why the vendor is two settings and must stay two.

**The schema.** `scripts/lib/config-schema.json` is one `keys` table of dotted paths, read by
the unknown-setting check and the validator alike; neither carries its own list. `required: true`
is simultaneously D-06's mask list — the ten required keys are every key under `identity.` and
`legal.` plus the two vendor halves. Four keys carry patterns with a plain-language `regex_help`
sentence and a valid example.

**The generator.** `scripts/generate.mjs` (325 lines) runs parse → reject-unknown → validate →
emit → write, and the order is the design. Unknown-setting rejection precedes every assignment,
so `__proto__`, `constructor`, and `prototype` are refused by name as well as by the schema and
never reach a computed key. Validation collects every failure and exits once. Nothing is written
under `generated/` unless every check has passed. The single frozen target emits the dev
`configure.sh` — MPL boilerplate and the 01-03 comment as literal text, `MOZ_APP_DISPLAYNAME`
built from `identity.display_name` plus the variant's `name_suffix`, joined with a literal
newline so a Windows host cannot break byte-identity.

**The output root.** `.gitignore` gained a commented, root-anchored `/generated/` block in the
house style of the adjacent Theia block — the one that carries its own comment because an
unanchored pattern nearly swallowed `scripts/lib/`.

## Verification

| Check | Result |
|---|---|
| `node scripts/generate.mjs` | PASS — 1 file written |
| `cmp generated/branding/dev/configure.sh powerbrowser/branding/dev/configure.sh` | identical, no output |
| `git check-ignore -q generated/branding/dev/configure.sh` | exit 0; `git ls-files generated/` prints nothing |
| `node scripts/scan-brand-residue.mjs` (all five new files staged) | PASS — 115 files scanned |
| `scripts/verify-platform.sh --quick` | PASS — all 25 rows, both `branding-preflight` rows unchanged |
| body digest with header stripped | `195ca51f…`, 22907 bytes |
| `grep -c` for `process.cwd()`, `os.EOL`, `normalize(`, `e.message` | 0, 0, 0, 0 |
| `brand-tokens.json` outside comment lines in generate.mjs | 0 |

All eight `<behavior>` rows were exercised: byte-identity; deleted key; three-space key; a
`binary_name` containing a space (named, quoted, rule in words, nothing written); `[identiy]`
reported as an unknown setting and never as a missing one; a `__proto__` table refused with
`Object.prototype` left clean; three faults in one run; and a malformed manifest reported by
file and line with no caret diagram, no parser class name, and no stack trace.

## TDD Gate Compliance

Task 3 carried `tdd="true"`. The RED step was real and ran first: a scratchpad harness exercising
all eight behaviors reported **8 failures / 1 pass** before `scripts/generate.mjs` existed, and
**0 failures / 9 passes** after. The one pre-existing pass was the probe asserting the vendored
parser does not pollute `Object.prototype` — a property of Task 2's commit, legitimately already
green.

**No `test(...)` commit exists, and that is deliberate rather than a skipped gate.** The plan's
`<files>` list for Task 3 names three files, none of them a test, and CLAUDE.md forbids creating
a sibling verification driver — a check in this tree is a row in `scripts/verify-platform.sh`.
The plan explicitly stubs `--self-test` in this task and wires it in plan 02-06, which is where
the durable form of these eight behaviors belongs. Committing a throwaway harness to satisfy the
commit-shape rule would have created exactly the sibling driver the project prohibits. Recorded
in the ledger as an unrun-verify so plan 02-06 inherits it rather than rediscovering it.

## Known Stubs

| File | Stub | Why it is intentional |
|---|---|---|
| `scripts/generate.mjs` | `--check` prints one line and exits 0 | The plan states the compare mode arrives in plan 02-04. The flag is accepted now so the argument surface is settled before callers exist. |
| `scripts/generate.mjs` | `--self-test` prints one line and exits 0 | The plan states the self-test arrives in plan 02-06, after byte-identity is green. This is where the eight behavior rows land durably. |

Neither stub blocks this plan's goal: the tracer's claim is byte-identity from the default
invocation, and that is met.

## Deviations from Plan

**1. [Rule 3 - Blocking] `isTable()` classified every section as a scalar leaf**

- **Found during:** Task 3, first GREEN run
- **Issue:** The table test was written as `Object.getPrototypeOf(value) === null`, following the
  observation that the parser returns prototype-less objects. It does not: smol-toml's tables
  inherit from a base object that itself has a null prototype, so `getPrototypeOf` returns that
  base rather than `null`. Every top-level section was therefore treated as a leaf and reported
  as an unknown setting, and the generator rejected its own manifest with five failures.
- **Fix:** Identify a table as an object that is neither an array nor a `Date`, excluding the
  parser's `Date` subclass by name so a date's own properties are never walked as settings.
- **Files modified:** `scripts/generate.mjs`
- **Commit:** 2764b3c

**2. [Rule 2 - Missing functionality] `regex_example` added to the schema shape**

- **Found during:** Task 3, authoring the validator
- **Issue:** The plan's action requires each pattern failure to "offer a concrete corrected
  example" while also fixing the exact `regex_help` wording, and the plan's artifact list names
  only `type`, `required`, `regex`, `regex_help`. There was nowhere for the example to live.
- **Fix:** One additional optional per-key field, `regex_example`, on the four keys carrying a
  pattern. No consumer requires it.
- **Files modified:** `scripts/lib/config-schema.json`
- **Commit:** 2764b3c

**3. Manifest variants pointed at by temporary substitution, not a new flag**

The acceptance criteria describe "pointing the generator at" mutated copies of the manifest,
but the plan permits exactly two arguments and neither names a path. Rather than invent a
manifest-path flag or environment variable this phase has no other caller for, the behavior
harness swaps `configuration.toml` for a mutated copy, runs, asserts, and restores under a trap.
The observable behavior is identical and no unrequested CLI surface was added.

## Authentication Gates

None.

## Human Checkpoints

**Task 1 — package legitimacy (`gate="blocking-human"`): approved by the human.** The research
seam returned a `SUS` / `too-new` verdict on `smol-toml`, traced to the seam keying on the latest
release date rather than the package creation date. The human independently confirmed the npm
page, the GitHub repository, the sha256 digest `195ca51f…`, and the 22907-byte size, and replied
"approved — digest matches". Not auto-approved; `workflow.auto_advance` does not reach a package
legitimacy gate. No third-party byte entered the tree before that reply.

## Threat Flags

None. The three `mitigate` dispositions in the plan's register were each implemented as written:
T-02-SC by the human gate plus the twice-checked digest plus the no-install vendoring form;
T-02-01 by unknown-setting rejection running before any assignment and the three reserved names
refused by name; T-02-02 by the frozen target array being the only source of a write path;
T-02-03 by re-emitting the parse failure from the error's structured `line` and `column` alone.

## Requirements

- **CFG-01** — advanced, not complete: this plan delivers the settings half of the rebrand
  surface and one generated surface; the requirement is claimed by all five of 02-01..02-05.
- **CFG-02** — the required-and-blank test, the unknown-setting gate, and the no-internals
  failure copy are all in place and exercised.
- **CFG-03** — the vendor stays split and a machine vendor containing whitespace is rejected
  naming the key and stating the rule.
- **GEN-04** — `generated/` is ignored at the repo root and holds nothing tracked.

## Self-Check: PASSED

All five created files exist on disk. Both commits are present in `git log`: `aedb563`
(vendoring, provenance, ignore entry) and `2764b3c` (manifest, schema, generator).
