# Fixture tier-3 build drills (UNEXECUTED) and acceptance mapping

Every drill below is **UNEXECUTED**. Static-plus-generate proof is this
phase's scope: the harness (`scripts/verify-downstream-fixture.mjs --all`,
5 fixtures, 210 assertions) proves each fixture at generate level, and a
live per-fixture build costs roughly an hour each (dev full build ~47m,
release full build ~47m per `docs/BUILD.md` timings). Nothing here is
claimed as proof — see T-07-07. Run these blocks verbatim when the build
phase spends that cost.

Conventions shared by all three blocks: the stage lives outside the repo at
a space-free path; `generated/` stays in the platform tree; every block ends
by regenerating the default tree and re-proving it fresh, so the platform is
neutral for the next block. The `nix develop .#firefox` / `mach build`
sequence follows `docs/REBRANDING.md` step 7 and `docs/BUILD.md` tiers.

## Drill 1 — sourcerer-equivalent (Northlight) — UNEXECUTED

```sh
STAGE=~/coding/northlight-drill
cp -r .planning/phases/07-sourcerer-as-downstream/fixtures/sourcerer-equivalent "$STAGE"
PB_CONFIG_DIR="$STAGE" node scripts/generate.mjs
PB_CONFIG_DIR="$STAGE" node scripts/generate.mjs --check
scripts/fetch-upstream.sh
nix develop .#firefox
cd upstream
MOZCONFIG=../.mozconfig ./mach build
cd ..
node scripts/verify-branding-identity.mjs --expect-brand-full-name "Northlight Browser Dev" --expect-display-name "Northlight Browser Dev"
test -x objdir/dist/bin/northlight && test ! -e objdir/dist/bin/firefox
grep -m1 '^Name=northlight-browser$' objdir/dist/bin/application.ini
grep -m1 '^Vendor=Northlight$' objdir/dist/bin/application.ini
node scripts/generate.mjs
node scripts/generate.mjs --check
scripts/verify-platform.sh --quick
```

Release-variant rows, once a release objdir exists (second ~47m build):

```sh
cd upstream
POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build
cd ..
node scripts/verify-branding-identity.mjs --variant release --expect-brand-full-name "Northlight Browser" --expect-display-name "Northlight Browser"
```

## Drill 2 — spaced-name (Cedar Falls) — UNEXECUTED

```sh
STAGE=~/coding/cedarfalls-drill
cp -r .planning/phases/07-sourcerer-as-downstream/fixtures/spaced-name "$STAGE"
PB_CONFIG_DIR="$STAGE" node scripts/generate.mjs
PB_CONFIG_DIR="$STAGE" node scripts/generate.mjs --check
scripts/fetch-upstream.sh
nix develop .#firefox
cd upstream
MOZCONFIG=../.mozconfig ./mach build
cd ..
node scripts/verify-branding-identity.mjs --expect-brand-full-name "Cedar Falls Browser Dev" --expect-display-name "Cedar Falls Browser Dev"
test -x objdir/dist/bin/cedar-falls && test ! -e objdir/dist/bin/firefox
grep -m1 '^Name=cedar-falls-browser$' objdir/dist/bin/application.ini
grep -m1 '^Vendor=CedarFalls$' objdir/dist/bin/application.ini
node scripts/generate.mjs
node scripts/generate.mjs --check
scripts/verify-platform.sh --quick
```

Release-variant rows, once a release objdir exists:

```sh
cd upstream
POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build
cd ..
node scripts/verify-branding-identity.mjs --variant release --expect-brand-full-name "Cedar Falls Browser" --expect-display-name "Cedar Falls Browser"
```

## Drill 3 — late-sort-name (Zebra) — UNEXECUTED

```sh
STAGE=~/coding/zebra-drill
cp -r .planning/phases/07-sourcerer-as-downstream/fixtures/late-sort-name "$STAGE"
PB_CONFIG_DIR="$STAGE" node scripts/generate.mjs
PB_CONFIG_DIR="$STAGE" node scripts/generate.mjs --check
scripts/fetch-upstream.sh
nix develop .#firefox
cd upstream
MOZCONFIG=../.mozconfig ./mach build
cd ..
node scripts/verify-branding-identity.mjs --expect-brand-full-name "Zebra Browser Dev" --expect-display-name "Zebra Browser Dev"
test -x objdir/dist/bin/zebra && test ! -e objdir/dist/bin/firefox
grep -m1 '^Name=zebra-browser$' objdir/dist/bin/application.ini
grep -m1 '^Vendor=Zebraworks$' objdir/dist/bin/application.ini
node scripts/generate.mjs
node scripts/generate.mjs --check
scripts/verify-platform.sh --quick
```

Release-variant rows, once a release objdir exists:

```sh
cd upstream
POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build
cd ..
node scripts/verify-branding-identity.mjs --variant release --expect-brand-full-name "Zebra Browser" --expect-display-name "Zebra Browser"
```

## Reading the identity output on a rebranded tree

The script derives two surfaces from the platform manifest with no
override flag, so on a fixture-built tree they report the rebrand delta
rather than going green — that delta is the proof, and the `test`/`grep`
lines above assert it directly:

- `application-ini` expects the platform `app_basename`/`vendor_machine`;
  the grep lines assert the artifact carries the staged fixture's instead.
- `executable` looks for a `powerbrowser` binary with no `firefox`
  remaining; the test line asserts the fixture-named binary with no
  `firefox` remaining instead.

The other four surfaces are brand-agnostic or overridden and go green:
`brand-full-name` and desktop-entry display name via the `--expect-*`
overrides, `runtime-identity` and `version` read live from the artifact
(application.ini plus `version_display.txt`, which no brand moves). If a
fixture build lays the desktop file outside the script's default path, the
script's `--desktop`/`--config-status` flags point at it.

## Milestone acceptance mapping (Phase 7, four ROADMAP criteria)

1. **`PB_CONFIG_DIR` at an external directory builds with zero platform
   edits** — 07-01 mechanism; 07-02 harness stages every fixture to a
   mkdtemp outside dir and restores the default tree hash-equal; this
   plan's guide section carried steps 2, 4, 8 against a scratch outside
   dir verbatim.
2. **Sourcerer-equivalent yields the branded product; Power Browser builds
   with it absent** — 07-02 evidence baseline (66 assertions, exact bytes
   per surface) plus the neutrality re-proof after every drive
   (`--quick` green, generate `--check` fresh, both tree scans green).
3. **Adversarial fixtures build-and-verify or fail naming their rule,
   never silently wrong** — 07-03 five-row matrix: three EXPECTED-PASS at
   66 assertions each, two EXPECTED-FAIL at 6 assertions each (square
   artwork, `identity.display_name`), generated/ snapshot-proven
   untouched on failure.
4. **Both layers pass for every fixture; nothing keyed to one config's
   values** — registered `verify-downstream-fixtures` rows (`--all`, 5
   fixtures, 210 assertions, all expectations derived per run through
   resolveConfig) plus `verify-manifest-literals.mjs` green in default
   mode after every fixture run plus `verify-branding-identity.mjs
   --self-test` green proving derivation is still manifest-driven.
