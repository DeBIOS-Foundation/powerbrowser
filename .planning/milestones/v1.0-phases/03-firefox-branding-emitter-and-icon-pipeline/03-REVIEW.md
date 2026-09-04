---
phase: 03-firefox-branding-emitter-and-icon-pipeline
reviewed: 2026-09-04T06:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - scripts/generate.mjs
  - patches/010-powerbrowser-identity.patch
  - scripts/fetch-upstream.sh
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-branding-agreement.mjs
  - scripts/verify-icon-ihdr.mjs
  - scripts/verify-installer-schema.mjs
  - scripts/verify-platform.sh
  - scripts/lib/config-schema.json
  - configuration.toml
  - inventory/brand-tokens.json
  - docs/BUILD.md
  - .mozconfig
  - generated/identity.configure
findings:
  critical: 0
  warning: 7
  info: 5
  total: 12
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-09-04T06:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the Phase 03 (Firefox Branding Emitter and Icon Pipeline) source changes at standard depth, with attention to the four directed areas: (1) the include-hook carrier, (2) patch regen integrity, (3) preflight repoint correctness, (4) propagation-proof completeness.

The core mechanism is sound and live-verified: `emitIdentityConfigure` emits a two-line `imply_option` fragment, patch 010 carries only the `include("../identity.configure")` hook, the `upstream/identity.configure` symlink resolves, `generate --check` passes over all 46 targets, and all four static gates (preflight, agreement, icon-ihdr, installer-schema) pass on the current tree. Patch regen integrity is clean — `MOZ_APP_ID` retained as a context line, `+` lines contain only the two `False` flips and the hook, hunk counts balance — and the deviation-3 narrowing to 14 value-carrying surfaces was verified correct against the emitters (`.mozconfig` carries no display values, the tile manifest carries only `tile_color`, the identity carrier carries vendor/UA).

The findings are all in the verification and hardening layer around that mechanism, not in the mechanism's current output: half the new carrier (UA_NAME) has no positive static assertion anywhere, the patch's two behavioral `False` lines are asserted by no gate, the NSIS sink guard misses bare `$VAR` expansion, the new fragment's banner names a copy destination that does not exist and a gate that skips it, the overlay symlink has no self-test or existence check, the installer verifier reads the live manifest instead of its fixture root, and the fresh-clone story is incoherent (preflight now hard-fails where three sibling checks skip, justified by a false premise about `generate --check`, with the BUILD.md fresh-clone recipe missing the `generate` step entirely). No critical (ship-blocking) defects; seven warnings and five info items below, each with a concrete fix.

## Warnings

### WR-01: Preflight hard-fails on fresh clones where three sibling checks skip, on a false premise

**File:** `scripts/verify-branding-preflight.mjs:390-398`
**Issue:** Check 5 reads `generated/identity.configure` and calls `r.fail()` when it is absent. On a fresh clone `generated/` is gitignored and absent, so `--quick` is now red for "never generated" — the exact state that `generate --check` (`scripts/generate.mjs:2485-2504`, exits 0 with SKIP), `verify-branding-agreement.mjs:134-139`, `verify-icon-ihdr.mjs:241-246`, and `verify-installer-schema.mjs:297-302` all deliberately treat as SKIP-pass, each with a comment explaining that a gate red for a non-defect is a gate readers learn to skip. The 03-04 SUMMARY (line 152) justifies absent-means-fail as "matching generate-check's honest red" — but `generate --check` is not red there; it exits 0 (verified by code; the SKIP branch returns 0). The decision rests on a factually false premise. Compounding it, `docs/BUILD.md:560-567` ("Verifying a fresh clone") omits `node scripts/generate.mjs` entirely, so following the documented recipe leaves both symlinks (`upstream/identity.configure`, `powerbrowser/branding-generated`) dangling at `./mach configure` time. (Pre-existing context, not separately filed: the icon/installer `--self-test` rows already `process.exit(1)` when the live tree is absent instead of skipping, so the fresh-clone `--quick` story was already incoherent; this change extends the incoherence into a real check row.)
**Fix:** Scope the failure to the partial-tree defect and skip the never-generated state, mirroring the siblings:
```js
const generatedRoot = join(root, 'generated');
const identityConfigure = readText(root, 'generated/identity.configure');
if (identityConfigure === null && !existsSync(generatedRoot)) {
    // SKIP this sub-assertion: nothing has been generated yet (generate --check says the same).
} else if (identityConfigure === null) {
    r.fail('generated/identity.configure does not exist -- ... (run: node scripts/generate.mjs)');
} else if ...
```
and add the missing `node scripts/generate.mjs` step to the `docs/BUILD.md` fresh-clone recipe (before `./mach configure`), plus correct the SUMMARY premise.

### WR-02: The UA_NAME half of the new carrier has no positive assertion anywhere

**File:** `scripts/verify-branding-preflight.mjs:390-398`
**Issue:** Check 5 asserts the hook, rejects re-hard-coded vendor/UA lines in the patch, and asserts the fragment's `MOZ_APP_VENDOR` line — but never asserts the fragment's `imply_option("MOZ_APP_UA_NAME", "Firefox")` line. Coverage of that line from every other instrument is also zero: `verify-generated-identity.mjs:186` skips rows with no `tracked` comparand (which is this row), `generate --check` emits the fragment with the same emitter so it agrees with itself by construction, the inventory `MOZ_APP_UA_NAME` row counts the token string (not the `"Firefox"` value), and `scripts/verify-branding-identity.mjs` contains no UA assertion at all (grep for `UA_NAME|userAgent|MOZ_APP_UA` returns nothing). The D-78 compat literal — load-bearing for UA/product-name byte-identity — can therefore be changed or dropped in the emitter while every gate stays green.
**Fix:** Add the vendor line's mirror image to check 5:
```js
} else if (!identityConfigure.includes(`imply_option("MOZ_APP_UA_NAME", "Firefox")`)) {
    r.fail(
        `generated/identity.configure does not pin MOZ_APP_UA_NAME to "Firefox" (D-78 compat literal). `
        + 'The User-Agent must stay byte-identical to upstream.',
    );
}
```
and extend the seventh self-test plant with a UA-line corruption case.

### WR-03: The patch's two behavioral lines are asserted by no gate

**File:** `patches/010-powerbrowser-identity.patch:10,15`
**Issue:** `+imply_option("MOZ_SERVICES_HEALTHREPORT", False)` and `+imply_option("MOZ_NORMANDY", False)` are privacy-relevant compiled defines, and the only content assertions on this patch anywhere are preflight's hook-presence and no-hard-code checks — neither touches these lines. A rebase (or regen) that silently flips either back to `True` passes `check-patch-surface` (file-type gate only), the dirt classifier (path gate only), `apply-patches --self-test` (mechanism gate only), and preflight. The strings occur in `scripts/generate.mjs` only inside a pref-file comment, which asserts nothing about the patch.
**Fix:** Assert both lines in preflight check 5 (it already owns "the patch's declared shape") alongside the hook assertion:
```js
for (const line of ['imply_option("MOZ_SERVICES_HEALTHREPORT", False)', 'imply_option("MOZ_NORMANDY", False)']) {
    if (!patch.includes(line)) {
        r.fail(`patches/010-powerbrowser-identity.patch no longer carries ${line} -- ...`);
    }
}
```
with a self-test plant flipping one to `True`.

### WR-04: NSIS sink guard misses bare `$VAR` expansion (only `${VAR}`)

**File:** `scripts/generate.mjs:614`
**Issue:** `NSIS_UNEMITTABLE = /"|\$\{|\r|\n|\0/` rejects dollar-brace but NSIS expands bare `$VAR` too (`$INSTDIR`, `$PROGRAMFILES`, …). The schema for `installer.support_url` (`scripts/lib/config-schema.json:83-89`, `^https://[^\s\x00-\x1f\x7f]+$`) admits `$`, so `https://example.org/$INSTDIR/x` passes validation and the sink guard, and is emitted into `!define URLInfoAbout`/`HelpLink` — expanding at installer-compile time into wrong links with exit 0. This is exactly the silent-wrong-output class the T-03-07 guard (and its `${HOME}` self-test probe) exists to stop, with one spelling left open.
**Fix:** Reject a bare dollar as well:
```js
const NSIS_UNEMITTABLE = /"|\$|\r|\n|\0/;
```
(NSIS has no legitimate `$` in these two URL defines; over-rejection risk is nil.) Add a `support_url = "https://example.org/$INSTDIR/x"` fixture/probe next to `probeHostileSupportUrl`.

### WR-05: The new fragment's banner names a copy destination that does not exist and a gate that skips it

**File:** `scripts/generate.mjs:679-684` (banner), `scripts/generate.mjs:2081-2085` (untracked row)
**Issue:** `generated/identity.configure` carries the shared `GENERATED_BANNER`, whose lines 2–3 instruct the reader to "copy the matching file out of generated/ over this one" — there is no tracked `identity.configure` to copy over (the TARGETS row deliberately has no `tracked`) — and whose line 4 promises "A disagreement reddens: … generated-byte-identity", but that gate explicitly skips untracked rows (`scripts/verify-generated-identity.mjs:186`, `if (target.tracked === undefined) continue`). Both recovery pointers on the new artifact are wrong: a reader chasing a fragment disagreement is sent to copy a file onto a nonexistent path and to watch a gate that cannot go red for it. The real gates are `generate --check` and preflight check 5.
**Fix:** Give the carrier its own banner (or parameterize the gate line), e.g.:
```js
'# To change it: edit configuration.toml, then run: node scripts/generate.mjs.',
'# There is no tracked copy of this file; it reaches the build through the',
'# upstream/identity.configure symlink (see scripts/fetch-upstream.sh).',
'# A disagreement reddens: scripts/verify-branding-preflight.mjs (check 5),',
'# and: node scripts/generate.mjs --check',
```

### WR-06: The identity overlay has no self-test and no existence gate; failure surfaces at configure time

**File:** `scripts/fetch-upstream.sh:112-150` (overlay), `scripts/fetch-upstream.sh:158-248` (self-test)
**Issue:** `ensure_branding_overlay` now creates the `upstream/identity.configure` symlink plus its git-exclude entry, but `run_self_test` still exercises only `classify_upstream_dirt` (four classifier cases) — no plant covers the new symlink lines. And no registered check asserts `upstream/identity.configure` exists and resolves: preflight reads `generated/identity.configure` (the target), never the `upstream/` link (the path the build actually includes). A regressed, deleted, or mis-pointed link therefore surfaces no earlier than `./mach configure` — past the cheap static tier the whole preflight architecture exists to stay inside.
**Fix:** (a) Extend `fetch-upstream.sh --self-test` with an overlay case in a throwaway dir pair asserting both symlinks resolve to the intended targets and both exclude entries are present/idempotent; (b) add a static assertion (preflight check 5 or a three-line `--quick` row) that `upstream/identity.configure` exists and `readlink`s to `generated/identity.configure` when `upstream/` is present, skipping when `upstream/` itself is absent (fresh clone without the 5.6G checkout must not go red).

### WR-07: Installer verifier reads the live manifest instead of its fixture root (latent wrong-input bug)

**File:** `scripts/verify-installer-schema.mjs:288-292`, `scripts/verify-installer-schema.mjs:351`
**Issue:** `runChecks(root)` is parameterized by root and the self-test drives it against a mkdtemp fixture — but `readTileColor()` ignores `root` and always parses `REPO_ROOT/configuration.toml`. The tile-state comparison (`checkTile`, line 351) therefore compares fixture fragments against the wrong manifest whenever the two differ. Harmless today only because the self-test mirrors the live tree (fragment and manifest agree by construction); the first future fixture that diverges the manifest will false-pass or false-fail with no indication the expectation came from the wrong file. A verifier that can read past its own fixture is a false-green waiting to happen.
**Fix:** Thread the root through:
```js
function readTileColor(root) {
    const manifest = parse(readFileSync(join(root, 'configuration.toml'), 'utf8'));
    ...
}
```
and update the call site (`const tileColor = readTileColor(root)`) and the self-test's `stated` read.

## Info

### IN-01: Sink-guard path names a schema key that does not exist

**File:** `scripts/generate.mjs:968`
**Issue:** `assertEmittable('product.ua_name', 'Firefox')` reports failures against `product.ua_name`, but `scripts/lib/config-schema.json` defines no such key (grep count 0) — the UA name is a D-78 compat literal with no manifest setting. The guard can never fire on the constant `'Firefox'`, so impact is nil unless the literal is ever edited, at which point the message would send the reader to look for a setting that does not exist. Already disclosed as a watch item in 03-04-SUMMARY.md; filing so it is tracked as review debt rather than prose.
**Fix:** Use a path that cannot be mistaken for a setting, e.g. `assertEmittable('product.ua_name [D-78 compat literal, not a manifest setting]', 'Firefox')`, or add a one-line comment at the call site.

### IN-02: Patch no-hard-code gate is bypassable via single-quote form

**File:** `scripts/verify-branding-preflight.mjs:380-382`
**Issue:** The added-lines check matches `imply_option("MOZ_APP_VENDOR"` / `imply_option("MOZ_APP_UA_NAME"` with double quotes only. A re-hard-code spelled with single quotes (`imply_option('MOZ_APP_VENDOR', …)`) passes the gate. Moz.configure convention is double quotes and the current patch is clean, so this is robustness only.
**Fix:** Match the option name independent of quote style, e.g. test `l.includes('imply_option(') && (l.includes('MOZ_APP_VENDOR') || l.includes('MOZ_APP_UA_NAME'))` on `+` lines (excluding the `+++` header, which contains neither token).

### IN-03: `ln -sfn` without `--no-target-directory` in the overlay setup

**File:** `scripts/fetch-upstream.sh:113,126,138`
**Issue:** If any of the three targets ever exists as a real directory (hand-created, or left by an older plan revision), `ln -sfn src dir` silently creates the link *inside* the directory instead of replacing it, exiting 0 with a broken tree. `-n` covers symlink-to-directory but not real-directory. Self-inflicted and unlikely, but the failure is silent.
**Fix:** Add `-T` (`ln -sfnT …`) to all three overlay link commands so a directory at the target is a loud error instead of a silent nesting.

### IN-04: XML sink guard is imprecise in both directions

**File:** `scripts/generate.mjs:645`
**Issue:** `XML_UNEMITTABLE = /[&<>"\x00-\x1f\x7f]/` over-rejects `\t\n\r` (legal in XML 1.0 content) and under-rejects C1 controls `\x80-\x9f` (forbidden in XML 1.0 except `\x85`… precisely: `#x7F–#x84` and `#x86–#x9F` are illegal). Unreachable through a validated manifest — every value reaching an XML sink carries a schema regex over `[A-Za-z0-9 .'\-]` plus narrow extras — so this is defense-in-depth imprecision only.
**Fix:** If touched, align to the XML 1.0 illegal ranges (`\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F`) and drop the `\t\n\r` rejection into a separate shell-line concern where it belongs (it is already covered by `UNEMITTABLE`/`NSIS_UNEMITTABLE` at the relevant sinks).

### IN-05: Binary targets written with a text encoding argument

**File:** `scripts/generate.mjs:2411-2414`
**Issue:** `writeTargets` calls `writeFileSync(outPath, body, 'utf8')` for every target, including the ten PNG rasters and four ICO/ICNS containers whose bodies are Buffers. Node ignores `encoding` for Buffer data, so this is harmless today — but it misstates the contract: a future edit that coerces a body to string (or a reader that assumes text) inherits silent binary corruption. `checkTargets` already does the comparison correctly with encoding-less reads and `Buffer.compare`.
**Fix:** Branch on type at the write site:
```js
if (Buffer.isBuffer(body)) writeFileSync(outPath, body);
else writeFileSync(outPath, body, 'utf8');
```

---

_Verified clean (checked, no finding filed): patch regen integrity (MOZ_APP_ID retained as context line 21, `+` lines limited to the two `False` flips and the hook, hunk balanced 15/15, hook live in `upstream/browser/moz.configure:14`); 46-row TARGETS table (`generate --check` PASS, 46/46); propagation-set completeness for `display_name` (14 surfaces; `.mozconfig`, tile manifests, identity carrier, and icons correctly excluded by content); `.gitignore` coverage of `/generated/` and `/powerbrowser/branding-generated` (the tried-and-reverted tracked-symlink failure cannot recur via `git add -A`); inventory row moves with COUNT MOVED provenance._
_Reviewed: 2026-09-04T06:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
