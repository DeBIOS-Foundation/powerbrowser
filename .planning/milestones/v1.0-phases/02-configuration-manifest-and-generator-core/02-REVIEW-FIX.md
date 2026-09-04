---
phase: 02-configuration-manifest-and-generator-core
fixed_at: 2026-09-01T00:00:00Z
review_path: .planning/phases/02-configuration-manifest-and-generator-core/02-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-09-01
**Source review:** `.planning/phases/02-configuration-manifest-and-generator-core/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 15 (4 critical, 11 warning; `fix_scope: critical_warning`, so IN-01..IN-05 were not attempted)
- Fixed: 15
- Skipped: 0

**Where verification ran:** the **main checkout** at `/home/chris/coding/Power-Browser`.
`workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created and
every edit, gate run and commit happened on `main` directly. All numbers below are reproducible
from the tree as it stands.

**Gates run after the last fix:**
- `scripts/verify-platform.sh --quick` — **PASS**, 31 checks (29 before this session; WR-07 added two)
- `tsc --noEmit -p theia/extensions/branding/tsconfig.json` — clean
- Working tree carries no uncommitted source change

## Fixed Issues

### CR-01: Shell command injection from `identity.display_name`

**Files modified:** `scripts/generate.mjs`, `scripts/lib/config-schema.json`
**Commit:** `32c24fe`
**Applied fix:** Constrained at the schema *and* guarded at the sink, as the review required. Added
`regex`/`regex_help`/`regex_example` to `identity.display_name`, `product.vendor_display`,
`legal.copyright_holder`, `legal.trademark_notice` and `variants[].name_suffix`, so rejection
happens inside `validate()` alongside every other failure and the whole list is reported at once.
Added `assertEmittable`, applied at every interpolation in `emitConfigureSh` and `emitMozconfig`, so
a later schema edit that loosens a pattern cannot silently reopen the sink. It reports through
`report()` rather than throwing, so no stack trace reaches a reader. Also corrected the `TARGETS`
comment whose "no value is ever joined into a write path" claim the review called narrowly true and
broadly misleading — it now says the property is about write paths only and names the content-sink
guard.

Reproduced the review's payload before and after: `display_name = "Acme\"; touch
/tmp/pwned-by-generator; #"` now produces one validation failure naming `identity.display_name`.

Note on scope: `legal.license` is also unpatterned but reaches no sink today and the review did not
name it; left as-is deliberately rather than constraining a value with no consumer.

### CR-02: Desktop-entry key injection — a manifest value can override `Exec=`

**Files modified:** `scripts/generate.mjs`, `scripts/lib/config-schema.json`
**Commit:** `9831e2f`
**Applied fix:** `assertEmittable` (which already refuses `\r`, `\n`, `\t`, `\0`) now wraps every
value `emitDesktopEntry` interpolates. `variants[].branding_dir` and `variants[].objdir` gained the
relative-path pattern from the review, and `assertUnderRepo` resolves both against `REPO_ROOT` and
refuses anything that escapes it before an `Exec=` or `Icon=` line can name it.

Verified: `objdir = "../../../usr/bin"` and `display_name = "Acme\nExec=/bin/sh -c evil"` in one
manifest produce two validation failures and no output.

### CR-03: A partial `[[variants]]` table validates clean, emits `undefined`, then crashes

**Files modified:** `scripts/generate.mjs`, `scripts/lib/config-schema.json`
**Commit:** `4f1b624`
**Status:** fixed — **requires human verification** (validation-policy change)
**Applied fix:** Three parts.
1. `validateVariantElements` checks each array element against the required `variants[]` keys.
   It tests **presence**, not `isUnset`, because the release variant's `name_suffix` is legitimately
   `""` — that empty suffix is the whole reason the release display name is shorter than the dev
   one, and a trim-to-empty test would have rejected the shipping manifest. Whether a blank value is
   allowed is left to each key's `regex`, and `name_suffix`'s is the one that admits the empty
   string. This is a deliberate deviation from the review's literal `isUnset` snippet.
2. All four `variants[].*` keys are `required: true`. The masker still treats the array as a leaf,
   which is a separate question from the required check: inheriting a whole variant table is the
   intended fallback (a variant is a build arrangement, not an identity), inheriting half of one is
   not. The `requiredPathsOf` comment that asserted the old assumption was rewritten.
3. `main()` is wrapped so an unexpected throw prints plain language instead of a stack trace.

The `downstream array shorter than default` self-test case used a partial variant and therefore
pinned the defect as the contract; it now uses a complete one-element table, and a new case plants a
variant missing `objdir` and requires a red naming it.

**Why human verification:** the presence-vs-`isUnset` split and the decision to leave the masker
alone are judgement calls about what a Phase-7 downstream may inherit. Both are argued in the code
comments; a reader should confirm the policy is the one intended.

### CR-04: `generate-check` makes `verify-platform.sh --quick` red on every fresh clone

**Files modified:** `scripts/generate.mjs`, `scripts/verify-platform.sh`
**Commit:** `7d917f2`
**Applied fix:** Took the review's first option — the absent-output case is now a SKIP that exits 0,
printed on stdout. Nothing goes unchecked: whether the emitters agree with the five hand-written
files is `generated-byte-identity`'s question and it reads nothing under `generated/` at all. The
`verify-platform.sh` registration comment, which asserted the opposite of the observed behaviour,
was rewritten to describe the skip.

The `absent generated directory` self-test case now asserts the **exit code** as well as the
message, through a named `ABSENT_EXIT_MARK` read by both the probe and the case. The two disagreed
for the whole life of the row and a message-only case could not see it. Proved discriminating by
planting `return 1` and watching the case go red.

**Not done — `--require-generated`:** the review offers it parenthetically for CI. Skipped as YAGNI:
`.github/workflows/rebase-upstream.yml` runs `node scripts/generate.mjs` before `--check`, and that
step exits non-zero on its own if generation fails, so the absent case is unreachable in CI and the
flag would have no caller.

### WR-01: A failing `writeTargets` leaves `generated/` half-written

**Files modified:** `scripts/generate.mjs`
**Commit:** `9be1ddd`
**Status:** fixed — **requires human verification** (atomicity is structural, not exercised end to end)
**Applied fix:** Resolve every variant and emit every body into memory first, `report()`, and only
then write — the shape the review proposed. `report()` exits before the first `writeFileSync`, so
every failure a target can raise (a missing variant, a value an emitter refuses) is raised while the
tree is untouched.

**Why human verification:** `writeTargets` is not exported, so driving a genuine partial-write
scenario end to end would have meant a throwaway repo copy. The property is visible by reading the
function — the write loop is unreachable while `failures` is non-empty — but it is not covered by a
planted-fault case. Adding one is a candidate for the next pass.

### WR-02: The `configure.sh` header gives an instruction that does not work

**Files modified:** `scripts/generate.mjs`, `powerbrowser/branding/dev/configure.sh`,
`powerbrowser/branding/release/configure.sh`
**Commit:** `f728927`
**Applied fix:** The header now names the copy step, which is the procedure that actually works in
Phase 2. Worded variant-agnostically ("copy the matching file out of `generated/` over this one")
rather than naming `generated/branding/dev/configure.sh`, because one emitter serves both variants
and naming a specific path would have meant plumbing the target's generated path into the emitter
for a comment. The emitter and both tracked comparands changed in the same commit, per the file's
own rule; `generated-byte-identity` re-run green.

### WR-03: Only two of the five generated targets carry the "do not edit" header

**Files modified:** `scripts/generate.mjs`, `.mozconfig`, `powerbrowser/powerbrowser.desktop`,
`powerbrowser/powerbrowser-release.desktop`
**Commit:** `75544df`
**Applied fix:** The four banner lines are now one shared `GENERATED_BANNER` constant used by all
three emitters, so the five files cannot drift into four wordings. `#` is a comment in all three
formats. Checked before writing that both `.desktop` parsers in this repo
(`verify-platform.sh:check_desktop_entry_quick` and `verify-branding-identity.mjs:parseDesktopFile`)
find their keys by prefix rather than by line number, so the leading comment block moves nothing
they read. All five tracked comparands updated in the same commit; full `--quick` re-run green.

### WR-04: `verify-generated-identity.mjs` silently accepts unknown arguments

**Files modified:** `scripts/verify-generated-identity.mjs`
**Commit:** `9c334f6`
**Applied fix:** Mirrors `generate.mjs`'s `rejectUnknownArguments`. `--selftest` now exits 1 naming
the argument instead of running the full check and printing PASS.

### WR-05: Unguarded `git ls-files` crashes with a stack trace

**Files modified:** `scripts/verify-generated-identity.mjs`
**Commit:** `484e10d`
**Applied fix:** Wrapped as the review proposed, and additionally **moved ahead of** the
`check-ignore` call with an early return. Running it second would have produced two failures for one
cause — "generated/ is not ignored by git" alongside the real message — sending the reader to
`.gitignore` for a problem that is not there. Verified by running the check with `git` absent from
`PATH`: one plain-language failure, no stack frame, no `node:` specifier, no repo path.

### WR-06: Regexes built from unescaped inventory values weaken two assertions

**Files modified:** `scripts/verify-branding-preflight.mjs`
**Commit:** `dc66dd2`
**Applied fix:** The vendor assertion never needed pattern semantics and is now a literal
`String.includes`. The display-surface leak scan does need them for its `[ "<]` terminator class, so
its interpolation goes through a new `escapeForRegExp`. Preflight and its self-test both green,
including the planted-identifier-leak case that exercises the escaped pattern.

### WR-07: The vendored parser's provenance digest is never machine-verified

**Files modified:** `scripts/verify-vendored-parser.mjs` (new), `scripts/verify-platform.sh`,
`scripts/lib/toml.cjs`
**Commit:** `497c31a`
**Applied fix:** New check registered as `vendored-parser-digest` and
`vendored-parser-digest-self-test` in the `--quick` set. Both sides derived: the expectation is read
out of the file's own header (`sha256:` and `Size:`), the digest is computed over the file's own
body, so a legitimate re-vendor updates the header and the check follows it. Five planted faults,
each required to go red. The `toml.cjs` header's `tail -n +23` incantation is replaced by a pointer
to the new check.

**One finding of its own, worth recording:** the body boundary was first written as the review
suggested — `text.indexOf('/*!')`. That is wrong for a reason the review could not have anticipated:
describing the rule in the `toml.cjs` header puts that token *in the header*, which moves the
boundary into the header and hashes the wrong bytes. The check went red on its own documentation.
The boundary is now the first line that is not a `//` comment, derived from the header's shape
rather than pinned to its length.

### WR-08: `variants[].id` is optional, duplicates silently accepted, first match wins

**Files modified:** `scripts/generate.mjs`, `scripts/lib/config-schema.json`
**Commit:** `5d66a3e`
**Status:** fixed — **requires human verification** (the orphan rule is a policy decision)
**Applied fix:** `validateVariantIds` reports duplicates and orphans by the id involved, deriving the
set of ids the project builds from the frozen `TARGETS` table rather than restating it.
`variants[].id` gained an identifier pattern (and is required as of CR-03). Two self-test cases plant
a duplicate and an orphan and require a red naming each.

**Why human verification:** rejecting an orphan id makes a downstream that declares a third
`[[variants]]` section for its own purposes a hard failure. In Phase 2 that section is genuinely
dead — `TARGETS` is frozen at dev and release — and the review asked for the rejection, so it is in.
If Phase 3's packaging surfaces ever consume a variant the generator does not emit for, this rule is
the first thing that will need revisiting.

### WR-09: Invoking the generator through a symlink is a silent no-op that exits 0

**Files modified:** `scripts/generate.mjs`
**Commit:** `b23dabe`
**Applied fix:** Both sides of the entry-point comparison are realpathed, wrapped so a nonexistent
`argv[1]` returns `false` rather than throwing. Verified end to end: `node <tmp>/gen-link.mjs
--check` (a symlink to `scripts/generate.mjs`) now runs the check. The import guard
`verify-generated-identity.mjs` depends on is unaffected — its self-test still passes, which is the
assertion that would have caught a regression there.

### WR-10: The mark's dual fill keys off the OS theme, not the shell theme

**Files modified:** `theia/extensions/branding/src/browser/powerbrowser-mark.ts`,
`theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx`,
`theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx`,
`scripts/verify-branding-preflight.mjs`
**Commit:** `989c60f`
**Status:** fixed — **requires human verification** (visual; not confirmed in a running shell)
**Applied fix:** Took the review's first option. `powerBrowserMarkInline(size)` is **derived** from
`POWERBROWSER_MARK_SVG` — the string already asserted byte-equal to `brand/mark.svg` — by dropping
the OS-driven `<style>` block and resolving the fill through `currentColor`, so the geometry stays
single-source. The two in-shell consumers render it inline (`dangerouslySetInnerHTML` with an
`eslint-disable-next-line react/no-danger`, matching Theia's own convention for the same situation)
because an `<img>` is a separate document and inherits nothing. `width`/`height` are injected
because an inline `<svg>` carrying only a viewBox falls back to 300x150. The favicon keeps the
OS-driven data URI, which is correct for it.

The preflight's section 7 now asserts the split per consumer **from both sides**. The positive half
alone does not discriminate, and that was found by planting the fault rather than by reasoning about
it: swapping a render site back to the OS-driven variant leaves its `import` in place, so "the file
mentions the right name" stays true while the rendered mark is wrong. Two planted faults confirmed
red — a render site reverted, and the inline export un-exported.

**Why human verification:** `tsc --noEmit` on the branding extension is clean and the preflight is
green, but nothing here boots Theia. Someone should open the about dialog and the welcome widget on
a **light-mode OS** and confirm the mark is visible, and switch the Theia theme light↔dark and
confirm it follows.

### WR-11: The rebase workflow's generator gates run only before the rebase

**Files modified:** `.github/workflows/rebase-upstream.yml`
**Commit:** `feb897c`
**Applied fix:** Took both halves of the review's "either/or". The pre-replay steps stay and their
comment now says what they actually assert — pre-replay cleanliness, a fail-fast on the same
justification the residual-brand scan above it is given — and a second
`verify-generated-identity.mjs` invocation after `Rebase onto requested tag` makes the post-replay
observation the original comment promised. Red before means the tree arrived broken, red after means
the replay broke it, and those send a reader to different places. YAML parses; step order verified
programmatically (8 steps, byte-identity now at index 7 after the rebase at index 6).

## Skipped Issues

None.

## Out of scope

IN-01 through IN-05 were not attempted: `fix_scope` is `critical_warning`. IN-02 (`sectionOf`'s
array-path branch is unreachable) is now **more** unreachable, not less — CR-03's per-element
validation builds its own message rather than calling `sectionOf`, so the `.replace('[]', '')` there
is still dead. IN-04 (the three byte-duplicated identifier schema entries) got worse rather than
better: CR-01 and CR-02 added four more entries sharing two patterns between them, so the
`pattern_ref` consolidation it proposes now has seven call sites rather than three.

## Follow-ups a later pass should consider

1. **WR-01 has no planted-fault case.** The atomicity is structural but unexercised. Exporting
   `writeTargets`, or driving it through `checkTargets` against a manifest missing one variant,
   would give it one.
2. **IN-04 is now a bigger duplication than the review measured.** Worth doing before Phase 3 adds
   more emitters and more constrained keys.
3. **`assertEmittable` and `assertUnderRepo` exit through `report()`, which exits the process.**
   That is correct for the CLI and awkward for an importer; `verify-generated-identity.mjs` calls
   the emitters directly, so a value that passes `validate()` but trips a sink guard would take that
   check down rather than reddening it. Unreachable today (every sink value carries a pattern), but
   it is the kind of coupling that stops being unreachable.

---

_Fixed: 2026-09-01_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
