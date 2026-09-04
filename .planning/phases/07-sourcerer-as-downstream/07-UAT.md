# Phase 7: Sourcerer as Downstream — UAT (human items)

All automated checks pass (harness `--all`: 5 fixtures, 210 assertions; full `--quick`:
all checks green; both tree scans green; default tree neutral).
These 3 items were deliberately staged, not executed, by plan 07-04 in
`fixtures/README.md`. Tier-3 builds are never run by verification — each live
build costs roughly an hour (dev full build ~47m per `docs/BUILD.md` timings).

Conventions shared by all three blocks (from `fixtures/README.md`): the stage
lives outside the repo at a space-free path; `generated/` stays in the platform
tree; every block ends by regenerating the default tree and re-proving it fresh,
so the platform is neutral for the next block. The `nix develop .#firefox` /
`mach build` sequence follows `docs/REBRANDING.md` step 7 and `docs/BUILD.md` tiers.

## UAT-1: sourcerer-equivalent (Northlight) live build + identity proof — UNEXECUTED

**Prerequisite:** `scripts/fetch-upstream.sh` network access; Nix `#firefox`
toolchain; ~1h build time. `objdir/` state will be replaced by the drill build.

**Test (run verbatim from the repo root):**

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

**Expected:** Prefixed generate + `--check` green; build succeeds; identity
script green on the four brand-agnostic/overridden surfaces with the two
derivation-by-design delta rows (`application-ini`, `executable`) reporting the
rebrand delta — the `test`/`grep` lines assert the artifact carries the staged
fixture values (`northlight` binary, `northlight-browser` name, `Northlight`
vendor) instead; closing default regenerate + `--check` + `--quick` all green.
**Why human:** Tier-3 build cost verification never spends; needs a packaging
host with network and Nix.

## UAT-2: spaced-name (Cedar Falls) live build + identity proof — UNEXECUTED

**Prerequisite:** Same as UAT-1 (run after UAT-1's closing regenerate, so the tree is neutral).

**Test (run verbatim from the repo root):**

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

**Expected:** Same shape as UAT-1 with the Cedar Falls values: spaced display
bytes survive exactly into the built artifact (`Cedar Falls Browser Dev`);
spaceless `CedarFalls` vendor holds the profile path safe; closing neutrality
green.
**Why human:** Same tier-3 reason; additionally proves hostile-but-valid spaced
values end to end on a live build, which no static check can.

## UAT-3: late-sort-name (Zebra) live build + identity proof — UNEXECUTED

**Prerequisite:** Same as UAT-1 (run after UAT-2's closing regenerate, so the tree is neutral).

**Test (run verbatim from the repo root):**

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

**Expected:** Same shape as UAT-1 with the Zebra values: post-`m-browser` sort
names build and verify with no alphabetical-position assumption anywhere;
closing neutrality green.
**Why human:** Same tier-3 reason; proves sort-position hostility end to end on
a live build.

---
*Sign off by recording date + result under each item. When all three are green, Phase 7 is closed in full.*
