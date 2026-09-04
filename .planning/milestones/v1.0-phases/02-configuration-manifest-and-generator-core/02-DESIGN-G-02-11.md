# Design decision: closing G-02-11 and G-02-12

G-02-11: byte-identity is a false RED everywhere but this machine.
G-02-12: branding-preflight is a false GREEN everywhere, including where the
tracked `.desktop` entry is broken. One root cause: an absolute checkout path
baked into tracked files and into the expectations that check them. The
17-agent panel recorded in `02-UAT.md` ranked option 1 first but never saw
option 4, and wrote that it "should be scored against option 1 before
implementation, not assumed better or worse." This file is that scoring. It
carries a RECOMMENDATION only. The ratified choice is recorded after the
blocking-human checkpoint, in task 3.

## The two options

`option-1-quotient` changes the gate, not the files. `Buffer.compare` still
runs first and still decides in `scripts/verify-generated-identity.mjs`
`compareAgainstTracked`; only after it has failed, an exported helper
`sameFileAtADifferentRoot(wantText, haveText, emittedRoot)` asks whether the
tracked bytes are the same bytes at a different absolute root, by splitting
the emitted output on the root it just emitted at, escaping the fragments into
an anchored regex with `([^\n]*)` holes, and requiring every capture to be one
identical absolute string. It adds the helper plus its call site, rebuilds the
preflight's `wantExec`/`wantIcon` in `scripts/verify-branding-preflight.mjs`
from the live `root` argument instead of `exp.repo_root`, and deletes the
`repo_root` key from `inventory/brand-tokens.json`.

`option-4-placeholder` changes the files, not the gate. The tracked
`.desktop` files stop carrying an absolute path and carry the token
`@POWERBROWSER_REPO_ROOT@` instead, substituted at install time.
`emitDesktopEntry` in `scripts/generate.mjs` builds `Exec=`/`Icon=` from the
token plus the variant's relative paths; the byte comparison stays exact with
no normalisation; the preflight builds its expectation from the token and
gains a no-absolute-path-outside-the-token assertion; the `repo_root` key is
deleted exactly as in option 1; and `docs/BUILD.md` documents the
substitution step.

## Scorecard

| option | lens | verdict | evidence |
|---|---|---|---|
| `option-1-quotient` | `hides-drift` | `serious` | `.planning/phases/02-configuration-manifest-and-generator-core/02-UAT.md:156-167` — the panel executed the helper against a post-Phase-3 shape and got GREEN on an emitter that had dropped the variant objdir; the three-line shared-prefix closure quoted in this plan's `design_inputs` is what moves this row off `fatal`, and it fails safe by going red on a clone rather than green. |
| `option-1-quotient` | `honesty` | `serious` | The byte-for-byte claim is written in three places that must move in one commit: `scripts/verify-generated-identity.mjs:3-5` (docblock), `scripts/verify-platform.sh:3623-3626` (registry comment saying every planted case goes red — false once one case must stay green), and `GENERATED_BANNER` at `scripts/generate.mjs:601-606` (names the wrong reddening row once the preflight owns root disagreements). |
| `option-1-quotient` | `portability` | `serious` | `powerbrowser/powerbrowser.desktop:7-8` names this machine's absolute path, so at any other checkout the tracked entry is honestly wrong there: byte-identity goes green via the quotient but `scripts/verify-branding-preflight.mjs:256-260` rebuilt from live root goes red, and `scripts/verify-platform.sh --quick` stays non-zero on a fresh clone — the gate works everywhere yet G-02-11's green-clone truth is not restored. |
| `option-1-quotient` | `rules` | `serious` | `.planning/phases/02-configuration-manifest-and-generator-core/02-UAT.md:175-178` — the helper as proposed ACCEPTS a space-bearing root, which CLAUDE.md hard rule 4 forbids and nothing else in `scripts/` catches; and the proposed PASS line prints the author's absolute home directory on a CI runner, against the no-internals copy rule — both closable in the same change per this plan's `branch_specs`. |
| `option-4-placeholder` | `hides-drift` | `pass` | No relaxation exists to absorb drift: `scripts/verify-generated-identity.mjs` keeps `Buffer.compare` as the whole assertion, so a one-byte emitter drift goes red at every checkout; the preflight's new no-absolute-path-outside-the-token assertion in `scripts/verify-branding-preflight.mjs` is the drift this branch can still catch, keeping the row discriminating in the other direction. |
| `option-4-placeholder` | `honesty` | `pass` | The byte-for-byte claim stays true everywhere it is written — `scripts/verify-generated-identity.mjs:3-5`, `scripts/verify-platform.sh:3627`, `scripts/generate.mjs:601-606` — because the comparison stays exact; the only prose that moves is the self-test registry comment gaining `one case stays green`, a one-line fix in the same change, not a claim about the gate going false. |
| `option-4-placeholder` | `portability` | `pass` | With no absolute literal on either side of either comparison, both `scripts/verify-platform.sh:3505` (`branding-preflight`) and `scripts/verify-platform.sh:3627` (`generated-byte-identity`) exit 0 at an arbitrary checkout path, including a CI runner — the fix holds wherever the tree lands. |
| `option-4-placeholder` | `rules` | `pass` | A placeholder token in a tracked file passes `node scripts/scan-brand-residue.mjs`: `.mozconfig:6` and `.mozconfig:15` already carry the literals `POWERBROWSER_OBJDIR` and `POWERBROWSER_BRANDING` and the scan exits 0 today, so the `POWERBROWSER_`-prefixed token introduces no new residue class; no path is interpolated so the space-bearing-root hole cannot arise, and no path is captured so no PASS/FAIL line can print one. |

## The fresh-clone criterion

At a checkout whose absolute path is not this machine's, once BOTH gaps are
closed — reasoned from the two `--quick` rows at `scripts/verify-platform.sh:3505`
(`branding-preflight`) and `scripts/verify-platform.sh:3627`
(`generated-byte-identity`):

- `option-1-quotient`: `no`. Byte-identity exits 0 via the quotient, but the
  tracked `.desktop` still names this machine's path, which is genuinely wrong
  at the foreign checkout — so `branding-preflight` exits 1 and
  `scripts/verify-platform.sh --quick` is non-zero on a fresh clone, for a
  true reason instead of a false one.
- `option-4-placeholder`: `yes`. There is no absolute literal left to be
  wrong, so both rows exit 0 and `scripts/verify-platform.sh --quick` is green
  — which is G-02-11's failed truth restored rather than reinterpreted.

## What each option costs

`option-4-placeholder`: (a) the tracked `.desktop` entry is no longer
directly usable — a packager must substitute the token before installing, and
that step has to be documented (the `docs/BUILD.md` subsection this plan's
branch B specifies) and is a new way to get it wrong; (b) the preflight can no
longer compare against a real absolute path, so its Pitfall 4 check narrows
from "the entry names the right absolute target" to "the entry carries no
absolute target at all" (`scripts/verify-branding-preflight.mjs` can still
reject a planted absolute, but can no longer confirm the right one).

`option-1-quotient`: a tracked `.desktop` is honestly red at any checkout but
this one, and that keeps `scripts/verify-platform.sh --quick` — the documented
commit gate — non-zero on every fresh clone until someone regenerates and
overwrites tracked files, which dirties the tree relative to upstream and is
exactly the first experience a stranger cloning the repo would have.

## Recommendation

`option-4-placeholder`. G-02-11's failed truth is that `--quick` runs green
on a clean clone, and option 4 is the only one of the two that restores it
literally rather than reinterpreting a still-red gate as honest. It keeps the
byte gate's core virtue — exact comparison with no normalisation logic in a
gate whose whole value is that it does none — and it dissolves G-02-12
outright instead of repairing a tautology into a live check. The accepted
costs are the documented substitution step and the narrowed preflight, both
bounded and written down; the unaudited-by-the-panel risk is met by plan
02-08's relocated-checkout tracer proof, which compares observed exit codes
against the expectations recorded with the ratified choice rather than
assuming any of them.

## Verdict

ratified: option-4-placeholder

### Why

The `portability` lens decided it: only option 4 restores `--quick` green on
a fresh clone, which is G-02-11's failed truth stated verbatim. The `honesty`
lens confirmed it: the byte-for-byte claim stays true everywhere it is
written, with no normalisation logic added to a gate whose value is doing
none. The accepted costs are the install-time substitution step documented in
`docs/BUILD.md` and the preflight narrowing from "right absolute target" to
"no absolute target".

## Expected behaviour at a foreign checkout

foreign_checkout_byte_identity_exit: 0
foreign_checkout_preflight_exit: 0
foreign_checkout_quick_exit: 0

Byte-identity is 0 because closing G-02-11 is exactly the claim that row stops
being red for a non-defect, and under the placeholder design the emitted bytes
carry no checkout-specific content at all. Preflight is 0 because there is no
absolute literal left on either side of the desktop comparison to be wrong at
a foreign checkout. Quick is 0 because no `--quick` row is red there.

## Relationship to D-04

D-04 (`02-CONTEXT.md`) says the desktop absolute paths are derived from the
resolved repo root at generate time, that on the reference host the output is
byte-identical, that on another clone it is correct for that clone, and that
no machine-specific value enters `configuration.toml`. The ratified option
keeps D-04's binding half — no machine-specific value enters the manifest —
while amending its mechanism: the emitted bytes carry
`@POWERBROWSER_REPO_ROOT@` rather than a resolved absolute path, and the
"correct for that clone" property is delivered by the documented substitution
step instead of by the emitter. This is an amendment to a locked decision,
authorised by the operator at the blocking-human checkpoint in 02-07 task 2,
recorded here so a later reader does not find D-04 contradicted with no record
of who changed it.
