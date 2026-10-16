# Phase 18: Firefox 153.5.0esr - Research

**Researched:** 2026-10-16
**Domain:** Gecko ESR re-pin in a patch-set repo (pin, replay, two tier-3 builds, full verification)
**Confidence:** HIGH for tree state, tag/commit identity, patch replay and the change sites. MEDIUM for build behaviour at 153.5 (no build has run at `223014c6b9`). LOW for "full verify-platform.sh passes" as literally worded (see Open Question 1).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Pin `FIREFOX_153_5_0esr_BUILD1`, commit `223014c6b9299ac9b035b4c50ea481e5c6de282c`;
  record the SHA in `docs/BUILD.md` (research SUMMARY "Disagreements", row 1).
- Patches are replayed, never text-edited. The five files the four patches touch
  have identical blob SHAs at 153.1 and 153.5 (STACK.md). If a patch fails to
  apply, regenerate it from a patched tree; never hand-edit a hunk.
- Budget two Gecko builds: the dev objdir and `objdir-release` (PITFALLS.md).
- `smoke-firefox.sh:41-42` derives the version from
  `upstream/browser/config/version_display.txt` instead of `153.1.0esr`.
- `mar-update-hop` evidence is labelled pre-153.5, not cited as a 153.5 proof.
- `rebase-upstream.yml` has never run and has no Nix: record it as unexercised
  (do not wrap it in Nix in this phase).
- Do not run `nix flake update`.

Phase boundary (CONTEXT `<domain>`): Phase 18 runs before Phase 17 in this autonomous run. It touches the Gecko pin, `upstream/`, `patches/`, `smoke-firefox.sh`, `fetch-upstream.sh`, `docs/BUILD.md`, `configuration.toml` line 104 and the `[upstreams]` pin. Do not touch `theia/`, the `[ai]` table, or OpenCode files.

### Claude's Discretion
Everything else, guided by ROADMAP success criteria, `.planning/research/STACK.md`,
`.planning/research/PITFALLS.md` and `docs/BUILD.md`.

### Deferred Ideas (OUT OF SCOPE)
Wrapping `rebase-upstream.yml` in Nix — later, if CI rebase drills are wanted.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPD-05 | Gecko is pinned to `FIREFOX_153_5_0esr_BUILD1` with its commit SHA recorded; the four patches replay unchanged; `smoke-firefox.sh` derives the version from the tree; the `fetch-upstream.sh` tag comment is corrected; the run-together line at `configuration.toml:104` is fixed. | Change-site table (Architecture Patterns, Pattern 1); tag/SHA verified by `git ls-remote`; patch blob identity verified; tag-literal sweep rule (Pitfall A); smoke-firefox derivation (Code Examples). |
| UPD-06 | Dev and release builds at 153.5 both succeed and the full `verify-platform.sh` run passes; MAR-hop evidence is labelled pre-153.5. | Build commands and the CLOBBER finding (Pitfall B); release-build env vars (Pitfall C); packaging step (Pitfall D); full-run red set (Open Question 1); mar-update-hop stays green on stale evidence (Pitfall E). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Never modify Gecko outside the patch stack. `upstream/` is never hand-edited; `git -C upstream diff` must contain only the patch-stack paths. [CITED: CLAUDE.md, hard rule 2]
- Patches are regenerated, never text-edited. A hand-edited hunk turns `git apply --3way` into a silent no-op. [CITED: CLAUDE.md]
- The residual-brand scan iterates `git ls-files`: **stage before trusting a green scan.** `inventory/brand-tokens.json` is the only file that may name the originating product. [CITED: CLAUDE.md]
- One verification driver, one registry (`scripts/verify-platform.sh`). Adding a check = one row; no sibling driver. [CITED: CLAUDE.md]
- Never assert on the absence of a log line you emit yourself; derive expectations from the tree, never a hand-kept list. [CITED: CLAUDE.md, Verification rules 1-2]
- Builds run inside `nix develop .#firefox`; `node` works outside a dev shell. [CITED: CLAUDE.md, Environment]
- Repo path must contain no space (`/home/chris/coding/Power-Browser` is compliant). [CITED: CLAUDE.md, hard rule 4]
- Memory rules that bind execution: another Claude session may commit to `main` (re-read STATE.md, commit with explicit paths, never `--amend`/`-a`/stash with foreign files staged); one fix at a time; chrome-JS edits need `-purgecaches`. [CITED: MEMORY.md index]

## Summary

The pin move is small and well mapped. `git ls-remote` today resolves both `FIREFOX_153_5_0esr_BUILD1` and `_RELEASE` to `223014c6b9299ac9b035b4c50ea481e5c6de282c`, and the 153.5 tree reports `153.5.0esr` / `153.5.0`. All five files the four patches touch have the same blob SHA at 153.1 (`468445e58d`, the current `upstream/` HEAD) and 153.5, and so does `aboutDialog.xhtml`, so the replay needs no patch change and the about-dialog fixture needs no re-derivation. The edits are: the manifest pin, a newline at `configuration.toml:104`, the workflow default, a comment in `fetch-upstream.sh`, a derived version in `smoke-firefox.sh:41-42`, and the SHA record in `docs/BUILD.md`. `node scripts/generate.mjs` rewrites only one git-ignored file (`generated/upstream-pins.env`). No tracked generated file changes.

The build half has three traps the milestone research did not list. (1) **CLOBBER:** `upstream/CLOBBER` differs between the tags, and Gecko's clobber check compares mtimes. A fresh clone makes the source CLOBBER newer than `objdir/CLOBBER` and `objdir-release/CLOBBER` (both 2026-09-04), and `mach build` returns 1 when AUTOCLOBBER is unset. Run `./mach clobber` for each objdir before its build. (2) **Release env:** the release objdir must be built with both `POWERBROWSER_OBJDIR=objdir-release` and `POWERBROWSER_BRANDING=powerbrowser/branding/release`. Without the second variable the `.mozconfig` default bakes dev branding into the release objdir. (3) **Packaging:** four full-set rows (`ng063`, `ng065`, `ng066`, `ng072`) look up `objdir/dist/<app>-<built Version>...tar.xz`. After the 153.5 build that file does not exist until `powerbrowser/packaging/package-linux.sh` runs again.

The real planning risk is success criterion 4. A full `verify-platform.sh` run cannot exit 0 at this commit for reasons outside Phase 18. The four `gui08` rows are red now in `--quick` (Phase 21), and `ng074-ci-green-on-main` is red because no CI run exists at HEAD and the last three runs on `main` failed (NG-074, Phase 25). `--gate` excuses neither, because WINDOWS.md entries 5 and 10 are `fixed`. The plan should take a full baseline run at 153.1 before the rebase and define pass as "no new red at 153.5, every version-sensitive row green, every remaining red named against its owning ledger ID or phase". Chris should confirm that definition (checkpoint).

**Primary recommendation:** Three plans. (01) Pin edits plus a 153.1 full baseline run, no build. (02) `rebase-upstream.sh --tag FIREFOX_153_5_0esr_BUILD1`, clobber, dev build, derived smoke version, package. (03) Clobber and release build, full run compared against the baseline, docs and MAR label. Run every build in the background with a `tee`'d log, one build at a time.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ESR pin declaration | Manifest (`configuration.toml [upstreams]`) | Generator (`generated/upstream-pins.env`) | One declaration; `fetch-upstream.sh` sources the fragment; `verify-upstream-pins.mjs` enforces agreement |
| Upstream materialisation + replay | Scripts (`rebase-upstream.sh` → `fetch-upstream.sh` + `apply-patches.sh` + `check-patch-surface.sh` + brand scan) | — | D-74: `upstream/` disposable, `patches/` the source of truth |
| Gecko compile | Nix `.#firefox` dev shell + mach | sccache | Builds never run in the host shell |
| Version expectation in checks | Tree (`upstream/browser/config/version_display.txt`, `upstream/config/milestone.txt`) | Built `application.ini` | Verification rule 2: derive, never hand-keep |
| Release-variant identity | `objdir-release/` + tracked `powerbrowser/branding/release` | `verify-branding-identity.mjs --variant release` | Separate artefact, separate build |
| Package-based rows | `objdir/dist/*.tar.xz` from `package-linux.sh` | `scripts/lib/built-tree.mjs` | Package name is derived from the built Version |
| CI mirror | `.github/workflows/rebase-upstream.yml` input default | `verify-upstream-pins.mjs` step 2 | Literal mirror, equality-checked; workflow never run |

## Standard Stack

No new libraries. Phase 18 changes a pin and rebuilds.

| Component | Version | Purpose | Evidence |
|-----------|---------|---------|----------|
| Firefox ESR | `FIREFOX_153_5_0esr_BUILD1` = `223014c6b9299ac9b035b4c50ea481e5c6de282c` | Gecko substrate | [VERIFIED: `git ls-remote --tags https://github.com/mozilla-firefox/firefox.git`, this session: `223014c6b9299ac9b035b4c50ea481e5c6de282c	refs/tags/FIREFOX_153_5_0esr_BUILD1` and the same SHA for `_RELEASE`; `468445e58d3acc7e4e059be99856daff1f2ae8f1` for both 153.1 tags] |
| 153.5 version files | `version_display.txt` = `153.5.0esr`, `version.txt` = `153.5.0`, `config/milestone.txt` = `153.5.0` | Expected values for derived checks | [VERIFIED: GitHub contents API at `223014c6b9`, this session] |
| Rust toolchain (locked) | rustc 1.97.1, cargo 1.97.0, cbindgen 0.29.4 | Gecko build | [VERIFIED: `toolchain-baseline.txt` read this session]; `MINIMUM_RUST_VERSION = "1.90.0"` [VERIFIED: `upstream/python/mozboot/mozboot/util.py:16`]; `util.py`, `toolchain.configure`, `bindgen.configure`, `node.configure` same blob at both tags, `rust.configure` differs [VERIFIED: GitHub contents API vs `git -C upstream rev-parse HEAD:<path>`] |
| inkscape (host) | 1.4.4 | `node scripts/generate.mjs` raster step | [VERIFIED: `inkscape --version` on host, this session]. It matches the flake pin, so generating on the host is safe. |

**Installation:** none.

## Package Legitimacy Audit

Not applicable. Phase 18 installs no external package (npm, PyPI or crates). The Gecko source comes from the `mozilla-firefox/firefox` remote that `scripts/fetch-upstream.sh:7` already names.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
configuration.toml [upstreams].firefox_esr_tag
        │  node scripts/generate.mjs
        ▼
generated/upstream-pins.env (git-ignored)  ──►  scripts/verify-upstream-pins.mjs ◄── .github/workflows/rebase-upstream.yml (default: literal mirror)
        │  (TAG default)                                 ▲ step 3: fetch-upstream.sh must carry NO tag literal
        ▼                                                │ step 4: no tag literal in scripts/ theia/ .github/ root *.toml/*.nix/*.mk
scripts/rebase-upstream.sh --tag <T>
   ├─ git ls-remote (tag exists?) ──no──► FAIL
   ├─ rm -rf upstream/ ; TAG=<T> fetch-upstream.sh  (shallow clone, overlay symlinks)
   ├─ apply-patches.sh (git apply --3way + before/after blob assertion)
   ├─ check-patch-surface.sh
   ├─ scan-brand-residue.mjs --extra-root upstream/
   ├─ TAG=<T> fetch-upstream.sh (classifier: fully-applied)
   └─ readlink upstream/powerbrowser
        ▼
upstream/ @ 223014c6b9 (patched)
        │  nix develop .#firefox: ./mach clobber ; ./mach build
        ├──► objdir/          (dev:    default .mozconfig env)         ──► package-linux.sh ──► objdir/dist/powerbrowser-153.5.0...tar.xz
        └──► objdir-release/  (release: POWERBROWSER_OBJDIR + POWERBROWSER_BRANDING)
        ▼
scripts/verify-platform.sh (full)  ── version rows derive from upstream/ ── compare FAIL set to 153.1 baseline
```

### Pattern 1: Change sites (verified this session)

| File:line | Current text | Change | Evidence |
|-----------|--------------|--------|----------|
| `configuration.toml:114` | `firefox_esr_tag = "FIREFOX_153_1_0esr_RELEASE"` | `firefox_esr_tag = "FIREFOX_153_5_0esr_BUILD1"` (becomes line 115 after the :104 split) | [VERIFIED: configuration.toml:113-115 read: `[upstreams]` / `firefox_esr_tag = "FIREFOX_153_1_0esr_RELEASE"` / `theia_release = "1.74.1"`]. The table is `[upstreams]` (plural), not `[upstream]`. |
| `configuration.toml:104` | `# Upstream pins (UPD-01, UPD-02). firefox_esr_tag is the one ESR tag this# project builds against: scripts/fetch-upstream.sh clones it,` | Split after `tag this` → next line starts `# project builds against: ...` | [VERIFIED: configuration.toml:104 read]. Comment-only; TOML parse unaffected. |
| `.github/workflows/rebase-upstream.yml:33` | `        default: FIREFOX_153_1_0esr_RELEASE` | `        default: FIREFOX_153_5_0esr_BUILD1` | [VERIFIED: rebase-upstream.yml:33 read]. `verify-upstream-pins.mjs` requires **exactly one** tag literal in this file (`found.length !== 1` fails) [VERIFIED: scripts/verify-upstream-pins.mjs step 2]. |
| `scripts/fetch-upstream.sh:276-282` | "...tags each ESR point release with both a human-facing "_RELEASE" tag and a build-numbered "_BUILD1" tag pointing at the identical commit..." | Rewrite: the mirror tags each point release with `_RELEASE` and one or more `_BUILD<n>` tags, which **can** differ in commit (at 153.4 RELEASE sat on BUILD3's commit, not BUILD1's); comparing commit hashes stays correct either way. **Write no `FIREFOX_<digit>` string.** | [VERIFIED: fetch-upstream.sh:276-282 read]; 153.4 divergence [CITED: .planning/research/STACK.md:104, PITFALLS.md Pitfall 1 — not re-run this session] |
| `scripts/smoke-firefox.sh:40-44` | `grep -q '153.1.0esr'` / message naming `153.1.0esr` | Derive expected from `upstream/browser/config/version_display.txt`; fail on absent/empty; fixed-string match; PASS line names the derived value | [VERIFIED: smoke-firefox.sh:40-46 read]. Precedent: `readVersionDisplay` throws on absent or empty [VERIFIED: scripts/verify-branding-identity.mjs:295-300]. |
| `docs/BUILD.md` "Rebase procedure" (§ at `:1064`) | no 153.5 record | Add a pin record: tag, commit `223014c6b9299ac9b035b4c50ea481e5c6de282c`, the date both tags were seen equal, the 153.4 counter-example, and the measured build times | [VERIFIED: docs/BUILD.md:1064-1105 read]. `docs/` is outside the tag-literal sweep scope, so the tag may be spelled there [VERIFIED: verify-upstream-pins.mjs `inScope` :152-159]. |
| `docs/BUILD.md:446` | "The resulting binary reports **`DeBIOS powerbrowser 153.1.0esr`**" | Update to the observed 153.5 output once the build has produced it | [VERIFIED: read] |
| `docs/BUILD.md` "CI story" (`~:1105`) | says the workflow runs the replay on a hosted runner | Add: never dispatched (`gh run list --workflow rebase-upstream.yml` empty on 2026-10-16); generate step has no Nix, so no pinned inkscape; the 153.5 rebase ran locally; unexercised | [VERIFIED: `gh run list` returned no runs, this session] |
| `docs/BUILD.md` MAR loop (`:797-924`) and matrix row `:1038` | 153.1.0 → 153.1.1 hop evidence | Label "evidence predates 153.5 (N = 153.1.0); not re-run at 153.5" | [VERIFIED: docs/BUILD.md:800-803 read; `.mozbuild/mar-hop/hop.json` `"n": {"version": "153.1.0"...}`] |
| `README.md:87` | `Pinned to Firefox ESR 153 (\`FIREFOX_153_1_0esr_RELEASE\`)` | Update to the new tag (README is outside the sweep, but it is a present-tense false claim after the move) | [VERIFIED: README.md:86-87 read] |
| `patches/*.patch` | — | **No change.** `git diff --exit-code -- patches/` must be empty. | Blob identity verified (below) |

Optional, Pitfall 17 class (dated observations): `scripts/lib/firefox-bidi.mjs:9-11` ("settled live 2026-08-20 ... 153.1.0esr") and `scripts/verify-branding-identity.mjs:31` ("confirmed live this session: ...153.1.0esr"). Both are dated records of a past run. Leave them unchanged. They contain no `FIREFOX_<digit>` literal, so no gate depends on them.

### Pattern 2: Patch replay with no change (verified)

| Patched file | Blob at 153.1 (`upstream/` HEAD) | Blob at 153.5 (`223014c6b9`) | Patch `index` pre-image |
|---|---|---|---|
| `browser/moz.build` | `5a03cfc6d3f8…` | `5a03cfc6d3f8…` | `5a03cfc6d3` |
| `browser/moz.configure` | `3ea3d88b9360…` | `3ea3d88b9360…` | `3ea3d88b93` |
| `browser/installer/windows/nsis/defines.nsi.in` | `a9bf2d67ce52…` | `a9bf2d67ce52…` | `a9bf2d67ce` |
| `browser/installer/windows/nsis/installer.nsi` | `785e5ccfba55…` | `785e5ccfba55…` | `785e5ccfba` |
| `toolkit/mozapps/update/updater/moz.build` | `7e362df573ab…` | `7e362df573ab…` | `7e362df573` |
| `browser/base/content/aboutDialog.xhtml` (not patched; about-dialog fixture source) | `3ffd464b960a…` | `3ffd464b960a…` | — |

[VERIFIED: `gh api repos/mozilla-firefox/firefox/contents/<path>?ref=223014c6b9…` vs `git -C upstream rev-parse HEAD:<path>`, and `grep '^index' patches/*.patch`, this session]

Consequences: `apply-patches.sh` applies with the pre-images matching exactly. The before/after hash assertion (`scripts/apply-patches.sh:35-58`) still applies. The deferred item "re-derive the self-test fixture at the first ESR bump" (`.planning/milestones/v1.0-phases/01-platform-extraction-and-rename/deferred-items.md:17`, row 11 a-ii) can be recorded as checked: the source markup is unchanged.

Other upstream inputs read by checks, compared across the tags [VERIFIED: same method]:
- SAME: `toolkit/content/widgets/browser-custom-element.mjs`, `browser/actors/LinkHandlerParent.sys.mjs` (shell-gbrowser-standin); `toolkit/crashreporter/client/app/src/net/report.rs` (ng068); `toolkit/modules/Sqlite.sys.mjs` (tab-store-offline); `toolkit/mozapps/update/common/updatererrors.h`, `toolkit/xre/nsUpdateDriver.cpp`, `tools/update-packaging/make_full_update.sh` (ng065); the whole `browser/installer/windows/nsis/` directory listing (ng066, installer-schema).
- DIFF: `browser/actors/ContextMenuParent.sys.mjs`. The only change is `copyCanvasImage(...)` → `canvasToBlob(...)` on the actor. No `gBrowser.` call was added or removed, so `shell-gbrowser-standin`'s derived member set does not change [VERIFIED: diff of both versions, this session].
- Prediction: `--quick` after the rebase has the same FAIL set as now (the four `gui08` rows).

### Pattern 3: Exact command sequence

Run from `/home/chris/coding/Power-Browser`. Each `nix develop` build line runs in the **background** with its log captured, because the executor's foreground Bash limit is 10 minutes and a build takes 50 or more.

```bash
# --- Plan 01: pin edits (no build) --------------------------------------------
git ls-remote --tags https://github.com/mozilla-firefox/firefox.git 'refs/tags/FIREFOX_153_5_0esr_*'
#   expect BUILD1 and RELEASE both = 223014c6b9299ac9b035b4c50ea481e5c6de282c; paste into docs/BUILD.md
# (optional but recommended) 153.1 full baseline, BEFORE any edit:
scripts/verify-platform.sh 2>&1 | tee .mozbuild/phase18-full-153.1.log      # background; record FAIL set B
# edit configuration.toml (:104 split, pin), rebase-upstream.yml:33, fetch-upstream.sh:276-282, docs/BUILD.md
node scripts/generate.mjs                       # rewrites generated/upstream-pins.env only (git-ignored)
node scripts/verify-upstream-pins.mjs           # PASS
node scripts/generate.mjs --check               # PASS
git add <explicit paths> && node scripts/scan-brand-residue.mjs
scripts/verify-platform.sh --quick              # FAIL set == the four gui08 rows
# NOTE: at this point scripts/fetch-upstream.sh (no TAG) FAILS: upstream/ HEAD is 153.1, pin is 153.5. Expected.

# --- Plan 02: rebase + dev build ---------------------------------------------
scripts/rebase-upstream.sh --tag FIREFOX_153_5_0esr_BUILD1 2>&1 | tee .mozbuild/rebase-153.5.log   # ~10-12 min (clone 554-677 s + ~55 s scan)
git diff --exit-code -- patches/                                # empty
test "$(git -C upstream rev-parse HEAD)" = 223014c6b9299ac9b035b4c50ea481e5c6de282c
cat upstream/browser/config/version_display.txt                 # 153.5.0esr
scripts/fetch-upstream.sh                                       # now PASS (pin == tree), "accounted-for clean"
diff <(nix develop .#firefox --command bash scripts/toolchain-baseline.sh) toolchain-baseline.txt   # empty
bash scripts/apply-patches.sh --self-test
scripts/verify-platform.sh --only about-dialog-suppression
scripts/verify-platform.sh --quick                              # same four gui08 reds
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach clobber'
bash scripts/smoke-firefox.sh 2>&1 | tee .mozbuild/phase18-dev-build.log    # background, ~50 min
#   with the OLD literal still in place, this FAILS at the version step: the red direction, recorded
# edit smoke-firefox.sh:40-44 (derive)
scripts/verify-platform.sh --only smoke-firefox                 # incremental no-op build, then PASS naming 153.5.0esr
nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh   # objdir/dist/powerbrowser-153.5.0.en-US.linux-x86_64.tar.xz

# --- Plan 03: release build + full run ---------------------------------------
scripts/verify-platform.sh --only verify-branding-identity-release   # FAILS (binary 153.1 vs tree 153.5): red direction
nix develop .#firefox --command bash -c 'cd upstream && POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach clobber'
nix develop .#firefox --command bash -c 'cd upstream && POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build' 2>&1 | tee .mozbuild/phase18-release-build.log   # background, ~55 min
grep -E '^(Name|Version|BuildID)=' objdir/dist/bin/application.ini objdir-release/dist/bin/application.ini   # Version=153.5.0 in both
objdir/dist/bin/powerbrowser --version; objdir-release/dist/bin/powerbrowser --version   # ... 153.5.0esr
scripts/verify-platform.sh 2>&1 | tee .mozbuild/phase18-full-153.5.log    # background; compare FAIL set A with B
```

Command provenance: the release build line is the precedent at [VERIFIED: docs/BUILD.md:556 row #2: `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build`]; the existing release objdir was configured with `--with-branding=powerbrowser/branding/release` [VERIFIED: objdir-release/config.status:395]; `.mozconfig` reads `MOZ_OBJDIR=@TOPSRCDIR@/../${POWERBROWSER_OBJDIR:-objdir}` and `--with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding-generated/dev}` [VERIFIED: .mozconfig:6,15]; packaging command [VERIFIED: powerbrowser/packaging/package-linux.sh:11 and scripts/lib/built-tree.mjs:27]; the dev-build-via-smoke precedent [VERIFIED: docs/BUILD.md:557 row #3].

### Pattern 4: Generator after the pin change

`node scripts/generate.mjs` must re-run, or `fetch-upstream.sh` keeps sourcing the old tag and `verify-upstream-pins` step 1 fails as stale. The only pin-derived target is `generated/upstream-pins.env` (`FIREFOX_ESR_TAG=<tag>`). It has no tracked comparand, so `generated-byte-identity` is unaffected and no tracked file changes [VERIFIED: scripts/generate.mjs:2722-2736 and the target row at :3501-3511; `.gitignore:49` `/generated/`]. `rebase-upstream.sh --tag` passes `TAG=` explicitly, so the replay itself does not depend on the fragment [VERIFIED: rebase-upstream.sh:109, :157]. The plain `scripts/fetch-upstream.sh` re-check and CI do depend on it.

### Anti-Patterns to Avoid
- **Editing a `.patch` to "refresh" it for 153.5.** The blobs are identical; any edit is pure risk. Gate: `git diff --exit-code -- patches/`.
- **Writing a tag literal in `scripts/`, `theia/`, `.github/` (other than the one workflow default) or a root `.toml/.nix/.mk`.** The `fetch-upstream.sh` comment fix is the most likely place for this mistake. `verify-upstream-pins` steps 3/4 fail on `FIREFOX_[0-9]...` [VERIFIED: verify-upstream-pins.mjs:115 `const TAG_LITERAL = /FIREFOX_[0-9][A-Za-z0-9._-]*/g;`].
- **Writing `-PLAN.md` in any edited tracked file.** The brand inventory's frozen `-PLAN.md` row counts exactly 49 occurrences across 10 named files, so a new citation in `docs/BUILD.md`, `smoke-firefox.sh` or `fetch-upstream.sh` turns `scan-brand-residue` red [VERIFIED: inventory/brand-tokens.json `"token":"-PLAN.md" ... "expected_count":49`].
- **Running the two Gecko builds in parallel.** They share 16 cores and the sccache server, and a red result then cannot be attributed to one build. Run them one after the other.
- **Calling `--gate` the fix for known reds.** The exclusions key on WINDOWS.md entries 5 and 10, which are `fixed`. `--gate` turns their rows into "exclusion no longer applies" FAILs and excuses nothing else [VERIFIED: verify-platform.sh:5044-5056 and the run_gate_mode logic; WINDOWS.md JSON statuses read this session: 11 and 19 open, all others fixed].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Moving `upstream/` to a tag | manual `git clone`/`git apply` | `scripts/rebase-upstream.sh --tag` | Composes the tag-existence check, the classifier, the non-vacuous apply, the patch surface, the brand scan with `--extra-root` and the overlay assertion |
| Version expectation in smoke | a new literal `153.5.0esr` | read `upstream/browser/config/version_display.txt` | A literal is a hand-kept list (Verification rule 2), and it would go red again at 153.6 |
| Pin agreement | new grep in a plan | `node scripts/verify-upstream-pins.mjs` (`--quick` row) | Already covers fragment, workflow mirror, fetch default and the literal sweep |
| Stale-objdir detection | new check | `verify-branding-identity-{dev,release}` `version` surface | Already derives `--version` from the tree [VERIFIED: verify-branding-identity.mjs:545-548] |
| Clobber decision | deleting `objdir/` with `rm -rf` | `./mach clobber` with the same env as the build | Uses mach's own `remove_objdir`; cannot hit the wrong objdir if the env matches |

## Runtime State Inventory

(A re-pin is a migration of the Gecko substrate. Every category is answered.)

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `.mozbuild/mar-hop/` holds hop evidence N=153.1.0 → N+1=153.1.1 [VERIFIED: hop.json read]. `verify-mar-update-hop.mjs` reads that evidence and PASSes today [VERIFIED: ran this session]. `objdir/tmp/profile-default` (dev `mach run` profile) is deleted by `mach clobber`. | Label the MAR evidence pre-153.5 (docs + VERIFICATION). No data migration. Re-creating the dev profile is automatic. |
| Live service config | GitHub Actions: `rebase-upstream.yml` input default (in git); `verify.yml` fetches at the pin on the next push. No CI state outside git. | Code edit only (workflow default). |
| OS-registered state | None. No `.desktop` file is installed (`docs/BUILD.md` says neither has been installed on this host). | None. |
| Secrets/env vars | `POWERBROWSER_OBJDIR`, `POWERBROWSER_BRANDING` are read by `.mozconfig` [VERIFIED: .mozconfig:6,15]; `MOZBUILD_STATE_PATH` = `<repo>/.mozbuild` [VERIFIED: flake.nix:83]. Names unchanged. | Pass both POWERBROWSER_* vars on the release clobber and build commands. |
| Build artifacts | `objdir/` (Version 153.1.0, BuildID 20260928142802), `objdir-release/` (153.1.0, 20260904213953), `objdir-nplus1/` (153.1.1), `objdir/dist/powerbrowser-153.1.0.en-US.linux-x86_64.tar.xz`, `powerbrowser/packaging/version-nplus1/version.txt` = `153.1.1` [VERIFIED: application.ini reads, ls, this session]. `objdir-nplus1` is read by no check [VERIFIED: `git grep objdir-nplus1 -- scripts` empty]. | Clobber and rebuild `objdir` and `objdir-release`; re-package. Leave `objdir-nplus1` and `version-nplus1/` untouched, but note in docs that a future hop re-run needs an N+1 above 153.5.0 (backlog 999.2). |

## Common Pitfalls

### Pitfall A: The comment fix plants a tag literal
**What goes wrong:** Rewriting `fetch-upstream.sh:276-282` with a real example such as "BUILD1 vs RELEASE at FIREFOX_153_4_…" turns `verify-upstream-pins` red, because step 3 forbids any tag literal in that script.
**How to avoid:** Describe the tags by suffix only (`_RELEASE`, `_BUILD<n>`). Keep the full example in `docs/BUILD.md`, which is outside the sweep. Run `node scripts/verify-upstream-pins.mjs` after the edit.
**Warning signs:** `... carries its own tag literal ...` naming `scripts/fetch-upstream.sh`.

### Pitfall B: `mach build` stops on CLOBBER after the re-clone
**What goes wrong:** `upstream/CLOBBER` differs between the tags (153.1 blob `21a6cdd46c`, last line `Merge day clobber 2026-07-20`; 153.5 blob `08cc3f184d`, `Merge day clobber 2026-09-24`) [VERIFIED: GitHub API + local read]. `Clobberer.clobber_needed()` returns true when the source CLOBBER mtime is newer than `<objdir>/CLOBBER` [VERIFIED: upstream/python/mozbuild/mozbuild/controller/clobber.py:62-78], and `mach build` returns 1 when a clobber is needed and AUTOCLOBBER is unset [VERIFIED: upstream/python/mozbuild/mozbuild/controller/building.py:1332-1333 and :2086-2112]. A fresh clone gives the source file a new mtime, while `objdir/CLOBBER` and `objdir-release/CLOBBER` both date from 2026-09-04 [VERIFIED: ls --full-time].
**How to avoid:** Run `./mach clobber` for each objdir, with the same `POWERBROWSER_OBJDIR`/`POWERBROWSER_BRANDING` env, before its build. That makes both builds deterministic full builds, which is what the time budget assumes.
**Caveat:** the 08-05 dev rebuild after a re-clone logged "Clobber not needed" (`.mozbuild/dev-rebuild-0805.log:5`). The mtime state at that time cannot be reconstructed. Clobbering explicitly avoids depending on it.
**Warning signs:** `The CLOBBER file has been updated, indicating that an incremental build since your last build will probably not work.` in the build log within the first second.

### Pitfall C: The release objdir is built with dev branding
**What goes wrong:** Running only `POWERBROWSER_OBJDIR=objdir-release ./mach build` lets `.mozconfig` default `--with-branding` to `powerbrowser/branding-generated/dev`. The release objdir then carries dev identity, and `verify-branding-identity-release` / `branding-variant-divergence` go red, or pass on the wrong surface.
**How to avoid:** Set both variables on the clobber and build commands (Pattern 3). Afterwards check `grep with-branding objdir-release/config.status`, which should show `powerbrowser/branding/release`.

### Pitfall D: Package-reading rows go red after the dev rebuild
**What goes wrong:** `packagePath()` requires exactly one `objdir/dist/*-<built Version>.en-US.linux-x86_64.tar.xz` [VERIFIED: scripts/lib/built-tree.mjs:22-29]. After the 153.5 build the built Version is `153.5.0` and only the `153.1.0` tarball exists (or none, after the clobber). `ng063-packaged-launch`, `ng065-mar-signature-enforced`, `ng066-nsis-branding-no-ping` and `ng072-policies-packaged-webextension` import that helper [VERIFIED: grep this session].
**How to avoid:** Run `nix develop .#firefox --command bash powerbrowser/packaging/package-linux.sh` after the dev build and before the full run. It requires `theia/applications/browser/lib/backend/main.js`, which exists (built 2026-09-27) [VERIFIED: ls].

### Pitfall E: `mar-update-hop` stays green on 153.1 evidence
**What goes wrong:** The row re-verifies `.mozbuild/mar-hop/` (N=153.1.0, N+1=153.1.1) and PASSes. It never compares the evidence with the current tree [VERIFIED: ran PASS this session; EVIDENCE_DIR at verify-mar-update-hop.mjs].
**How to avoid:** In the phase verification and in `docs/BUILD.md`, state: "mar-update-hop PASS re-verifies evidence that predates 153.5 (hop.json n.version 153.1.0 vs built Version 153.5.0); not a 153.5 proof; re-run belongs to 999.2". Do not change the check (CONTEXT locks "labelled", not "re-run").

### Pitfall F: The full run cannot exit 0 at this commit
See Open Question 1. The known reds are the four `gui08` rows (red in `--quick` today [VERIFIED: ran this session]) and `ng074-ci-green-on-main` (red: "no verify.yml run exists for main at 333da74…" [VERIFIED: ran this session]; the last three `main` runs ended in `failure` [VERIFIED: gh run list]).

### Pitfall G: The stale objdir-release masks or mimics failures in the window between builds
Between the dev and release builds, `objdir-release` is 153.1 while `upstream/` is 153.5. Launching the 153.1 binary on a profile a 153.5 binary has used triggers downgrade protection [CITED: PITFALLS.md Pitfall 11]. The verify rows use mktemp profiles, so they are not affected. Do not run a full verify in that window; use it only for the deliberate red demonstration of `verify-branding-identity-release`.

### Pitfall H: Concurrency
`git worktree list` shows `/home/chris/gsd-workspaces/pba/Power-Browser` on `workspace/pba`. It has no `upstream/` or objdir, so rebasing main's `upstream/` cannot break it [VERIFIED: ls]. `.worktree-lock` names this session (`00a95695-…`); `.planning/milestone.lock` names a dead pid (stale) [VERIFIED]. No `mach`, sccache or sidecar process was running at research time. The full run's `smoke-theia` row runs `yarn install --frozen-lockfile` and rebuilds drivelist, which mutates `theia/node_modules` [VERIFIED: verify-platform.sh:4600-4613 comment]. Check `git status` and running processes before each build and before the full run, and commit with explicit paths.

## Code Examples

### smoke-firefox.sh version step (derive, guard, fixed-string)
```bash
# Source pattern: scripts/verify-branding-identity.mjs:295-300 (readVersionDisplay: absent -> error, empty -> error)
VERSION_FILE="$UPSTREAM_DIR/browser/config/version_display.txt"
EXPECTED_VERSION="$(tr -d '[:space:]' < "$VERSION_FILE" 2>/dev/null || true)"
if [ -z "$EXPECTED_VERSION" ]; then
  echo "smoke-firefox: FAIL -- $VERSION_FILE is absent or empty, so there is no version to compare against" >&2
  exit 1
fi
VERSION_OUTPUT="$(nix develop "$REPO_ROOT#firefox" --command bash -c "cd '$UPSTREAM_DIR' && MOZCONFIG='$MOZCONFIG_FILE' ./mach run --version")"
if ! printf '%s\n' "$VERSION_OUTPUT" | grep -qF -- "$EXPECTED_VERSION"; then
  echo "smoke-firefox: FAIL -- './mach run --version' did not report $EXPECTED_VERSION (read from $VERSION_FILE)" >&2
  exit 1
fi
echo "smoke-firefox: PASS -- reports $EXPECTED_VERSION (read from upstream/browser/config/version_display.txt)"
```
The empty guard matters: `grep -qF ''` matches every line, so an empty expected value would make the check pass without comparing anything.

### fetch-upstream.sh:276-282 replacement comment (no tag literal)
```bash
  # Compare commit hashes rather than `git describe --tags --exact-match`:
  # the mirror tags each ESR point release with a "_RELEASE" tag and one or
  # more build-numbered "_BUILD<n>" tags. They usually share a commit, but not
  # always -- at the 153.4 point release RELEASE sat on BUILD3's commit, not
  # BUILD1's -- and `describe` breaks a shared-commit tie non-deterministically.
  # Resolving the pinned tag's own ref and diffing commit hashes is correct in
  # both cases, however many other tags share that commit.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pin `_RELEASE` tags | Pin `_BUILD1` and record the commit SHA in `docs/BUILD.md` | This phase (PROJECT.md / SUMMARY disagreement row 1) | Tag names alone can diverge (153.4); the SHA is the identity |
| Hard-coded smoke version | Version derived from `version_display.txt` | This phase | The smoke row survives later ESR bumps |
| `--gate` exclusions for the absent release objdir | Real release objdir; exclusions no longer apply (WINDOWS #10 fixed) | v1.1 08-05 | Plan for real green on the release rows, not exclusions |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dev build ≈ 50 min and release build ≈ 55 min after a clobber at 153.5 (based on 153.1 measurements of 47-54 min) | Summary, Pattern 3 | Schedule only; the background run plus log handles longer times |
| A2 | A full `verify-platform.sh` run (218 rows: 118 shared + 100 full-only) takes roughly 20-60 min; the last recorded full `--gate` was 105 rows in 323 s on 2026-09-05 | Open Question 1 | Schedule; run in the background |
| A3 | No new full-set red appears at 153.5 beyond those already red at 153.1 (only `ContextMenuParent.sys.mjs` differs among the inputs checks read) | Pattern 2 | A new red needs triage; the baseline run is what makes it attributable |
| A4 | The 153.4 BUILD1/RELEASE divergence (`f92008fc60` vs `508788b6f8`) is cited from STACK.md, not re-run this session | Pattern 1, comment text | Comment wording only |
| A5 | Live rows have a usable display in the executor's environment (`DISPLAY=:0`, Wayland session present at research time) | Validation | Live rows go red for an environmental reason |

## Open Questions

1. **What does "a full `verify-platform.sh` run passes" mean at this commit?**
   - What we know: the full run includes the four `gui08` rows (red now; Phase 21) and `ng074-ci-green-on-main` (red; NG-074, Phase 25, needs Chris to push). `--gate` excuses neither. Phase 17 has not run, so `ng051-backend-off` and `ai-opencode-held` are still registered (backend off; expected green). No full run has been recorded since 2026-09-05, when the registry had 105 rows; it now has 218.
   - What's unclear: whether other live rows have gone red since 2026-09-28 for reasons unrelated to Gecko.
   - Recommendation: Plan 01 runs a full baseline at 153.1 (existing objdirs) and records the FAIL set B. Plan 03's pass condition is: FAIL set at 153.5 ⊆ B; each row in B is named with its owning phase or ledger ID (gui08 → Phase 21; ng074 → NG-074 / Phase 25); and every version-sensitive row PASSes (`smoke-firefox`, `verify-branding-identity-dev`, `-release`, `-brand-ftl-control`, `-runtime-control`, `branding-variant-divergence`, `installer-build-proof`, `about-dialog-suppression`, `apply-patches-self-test`, `ng063`, `ng064`, `ng065`, `ng066`, `ng072`, `desktop-entry-quick`). Add a `checkpoint:human-verify` so Chris accepts this reading of SC4 (human_verify_mode is end-of-phase). If the baseline shows an unexplained red, triage it before the rebase so it is not blamed on 153.5.

2. **Plan gate requires NG-074 and NG-084 citations.**
   - What we know: `python3 scripts/plan-gate.py --root . --phase 18 --plans <dir>` fails with `NG-074: due but not cited in any plan (phase 18)` and the same for NG-084, because both are `deferred-approved` with phase 15 ≤ 18 [VERIFIED: probe with a dummy plan this session; citing both → `plan gate passed: 2/2 IDs cited (phase 18)`]. No ledger row cites UPD-05/UPD-06 or any check this phase edits [VERIFIED: `python3 scripts/ledger-report.py --root .`, 85 rows].
   - Recommendation: cite NG-074 in the plan that owns the full run (its row is a known red there) and NG-084 with one line ("UAT sheets, Phase 24, not touched here"). `--check-scope` is skipped (no locked scope).

3. **Should the full-run comparison become a registry feature?** No. It is a one-time phase comparison, so a log diff in the plan is enough. Adding a baseline mechanism to the driver would be scope creep.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| nix (`nix develop .#firefox`) | Gecko builds, toolchain baseline, packaging | ✓ | `/run/current-system/sw/bin/nix` | — |
| Network to github.com | `rebase-upstream.sh` (ls-remote + ~5.6 GB shallow clone) | ✓ | ls-remote and API calls succeeded | — |
| `gh` CLI | ng074 row, run-list evidence | ✓ | authenticated | — |
| inkscape | `node scripts/generate.mjs` | ✓ (host) | 1.4.4 | `nix develop .#theia` (pins 1.4.4) |
| makensis | `installer-build-proof`, `ng066` | ✗ on PATH | — | Checks call `nix shell nixpkgs#nsis` themselves [VERIFIED: verify-installer-build-proof.mjs:118-122] |
| sccache | builds (`--with-ccache=sccache`) | ✓ | 0.17.0 | — |
| Display | live full-set rows | ✓ at research time | `DISPLAY=:0`, Wayland | `xvfb-run` on PATH |
| Disk | two clobbered objdirs (~13-15 GB each) + 5.6 GB clone | ✓ | 493 GB free on /home | — |
| CPU/RAM | builds | ✓ | 16 cores, 62 GB | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** makensis (the checks fall back to `nix shell` automatically).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` (bash driver, one registry) + standalone node/bash checks |
| Config file | none (registry inside the driver) |
| Quick run command | `scripts/verify-platform.sh --quick` (seconds; today FAIL = 4 gui08 rows) |
| Single check | `scripts/verify-platform.sh --only <label>` |
| Full suite command | `scripts/verify-platform.sh` (218 rows; needs both objdirs, the package, a display, network) |

### Phase Requirements → Test Map
| Req / SC | Behavior | Test Type | Automated Command | Failing direction (must be seen red) |
|----------|----------|-----------|-------------------|--------------------------------------|
| UPD-05 / SC1 | Manifest, fragment, workflow mirror and fetch default agree; no stray literal | static | `node scripts/verify-upstream-pins.mjs` | After editing only `configuration.toml` (before `generate` and before the workflow edit), it FAILs naming `generated/upstream-pins.env` (stale) and the workflow (mirror drifted). `--self-test` also plants these. |
| UPD-05 / SC1 | SHA recorded | static | `grep -c 223014c6b9299ac9b035b4c50ea481e5c6de282c docs/BUILD.md` ≥ 1 | 0 before the docs edit |
| UPD-05 / SC1 | Comment no longer claims BUILD1 = RELEASE always | static | `! grep -q 'at the identical commit' scripts/fetch-upstream.sh` plus `verify-upstream-pins` PASS | Current text matches `at the identical commit` (line 279) |
| UPD-05 / SC1 | `:104` split | static | `! grep -q 'this# project' configuration.toml && node scripts/generate.mjs --check` | grep hits today |
| UPD-05 / SC2 | Replay with patches byte-unchanged; tree at the SHA | integration | `scripts/rebase-upstream.sh --tag FIREFOX_153_5_0esr_BUILD1` exit 0; `git diff --exit-code -- patches/`; `test "$(git -C upstream rev-parse HEAD)" = 223014c6b9299ac9b035b4c50ea481e5c6de282c` | Before the rebase and after the pin edit, `scripts/fetch-upstream.sh` FAILs "upstream/ HEAD (468445e5…) is not FIREFOX_153_5_0esr_BUILD1"; `apply-patches.sh --self-test` covers the silent no-op case |
| UPD-05 / SC2 | Patch application non-vacuous; About-dialog selectors still match | integration | `bash scripts/apply-patches.sh --self-test`; `scripts/verify-platform.sh --only about-dialog-suppression`; `--only check-patch-surface` | Self-tests plant the faults (existing) |
| UPD-05 / SC2 | Smoke reports a tree-derived version | build | `scripts/verify-platform.sh --only smoke-firefox` → `PASS -- reports 153.5.0esr (read from ...)` | Dev build with the OLD literal FAILs "did not report 153.1.0esr": keep the literal through the first build to record it |
| UPD-06 / SC3 | Both objdirs at 153.5 | build | `grep -h '^Version=' objdir/dist/bin/application.ini objdir-release/dist/bin/application.ini` = `153.5.0` ×2; both `--version` end `153.5.0esr`; `--only verify-branding-identity-dev`, `--only verify-branding-identity-release` | Between the builds, `--only verify-branding-identity-release` FAILs (binary 153.1.0esr vs tree 153.5.0esr) |
| UPD-06 / SC3 | Release objdir carries release branding | static | `grep -c 'with-branding=powerbrowser/branding/release' objdir-release/config.status` ≥ 1; `--only branding-variant-divergence` | `branding-variant-divergence-self-test` (quick) plants the fault |
| UPD-06 / SC3 | No `mach bootstrap`; toolchain unchanged | build | inside smoke-firefox (bootstrap count); `diff <(nix develop .#firefox --command bash scripts/toolchain-baseline.sh) toolchain-baseline.txt` empty | — (existing assertions) |
| UPD-06 / SC4 | Full run: no new red; version rows green | e2e | `scripts/verify-platform.sh` full, FAIL set compared with the 153.1 baseline log | Package rows FAIL before `package-linux.sh` ("expected exactly one objdir/dist/*-153.5.0...") |
| UPD-06 / SC4 | MAR evidence labelled pre-153.5 | static + doc | `node -e` comparing `.mozbuild/mar-hop/hop.json` `n.version` (153.1.0) with `objdir/dist/bin/application.ini` Version (153.5.0) → differs; the label is present in docs/BUILD.md and VERIFICATION | `mar-update-hop` itself stays PASS; the comparison is the evidence that it is stale |
| Constraint | Brand scan over staged files | static | `git add <paths> && node scripts/scan-brand-residue.mjs` | A `-PLAN.md` written into an edited file moves the frozen count of 49 |

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick` (FAIL set must equal the four gui08 rows) + `node scripts/verify-upstream-pins.mjs` + staged brand scan.
- **Per wave merge:** the `--only` rows named in the map for that wave.
- **Phase gate:** the full run compared with the 153.1 baseline, before `/gsd-verify-work`.

### Wave 0 Gaps
None. Every check exists. The only script change is the `smoke-firefox.sh` version step, and its red direction is produced by the build order rather than by a new self-test.

## Security Domain

`security_enforcement` is absent from `.planning/config.json`, so it is treated as enabled.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (tag name) | `rebase-upstream.sh` rejects non-`[A-Za-z0-9._-]+` tags before `rm -rf` and checks remote existence [VERIFIED: rebase-upstream.sh:60-87] |
| V6 Cryptography | no change | MAR signing posture unchanged (`MOZ_VERIFY_MAR_SIGNATURE`, ng065 row) |
| V14 Configuration / supply chain | yes | Pin by tag **and** recorded commit SHA; assert `git -C upstream rev-parse HEAD` equals the recorded SHA after the clone |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mozilla tag re-pointed after the pin (tags are lightweight; `ls-remote` showed no peeled `^{}` lines) | Tampering | Record the SHA; manual HEAD == SHA assertion in the plan. `fetch-upstream.sh` compares only with the tag inside the clone, which cannot detect a re-pointed tag. Do not add an automated SHA gate in this phase: no requirement asks for it, so it would be scope creep. |
| Upstream content reintroducing a brand string | Tampering | `scan-brand-residue.mjs --extra-root upstream` inside `rebase-upstream.sh` |
| Gecko modified outside the patch stack | Tampering | `fetch-upstream.sh` D-76 classifier + `check-patch-surface.sh` |

## Sources

### Primary (HIGH confidence)
- Files read this session: `scripts/fetch-upstream.sh`, `scripts/rebase-upstream.sh`, `scripts/apply-patches.sh:1-60`, `scripts/smoke-firefox.sh`, `scripts/verify-upstream-pins.mjs` (header, :115-175, :250-340), `scripts/verify-platform.sh` (:1-130, :4600-4917, :5044-5149), `scripts/lib/built-tree.mjs`, `scripts/verify-mar-update-hop.mjs:1-80`, `scripts/verify-branding-identity.mjs` (:25-80, :147-151, :267, :295-300, :545-548), `scripts/plan-gate.py`, `scripts/size-gate.py:1-40`, `.mozconfig`, `configuration.toml:90-125`, `.github/workflows/rebase-upstream.yml`, `docs/BUILD.md` (:428-450, :550-575, :679-730, :795-805, :1064-1230), `upstream/python/mozbuild/mozbuild/controller/clobber.py`, `upstream/python/mozbuild/mozbuild/controller/building.py:1328-1340, 1915-1935, 2076-2115`.
- Commands run this session: `git ls-remote` (tags), `gh api` contents/compare at `223014c6b9` (blob SHAs, version files, CLOBBER, NSIS listing, ContextMenuParent diff), `scripts/verify-platform.sh --quick`, `node scripts/verify-mar-update-hop.mjs`, `node scripts/verify-ng-074-ci-main.mjs`, `gh run list`, `python3 scripts/ledger-report.py --root .`, `python3 scripts/plan-gate.py` probes, objdir `application.ini` reads.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` section D, `PITFALLS.md` Pitfalls 1-3, 11, 14, 17; `SUMMARY.md` (the 153.4 tag divergence and 10-15 trial details are cited from there, not re-run).

### Tertiary (LOW confidence)
- Build and full-run durations (A1, A2).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Tags, SHAs, version files and toolchain inputs were verified against the remote this session.
- Architecture: HIGH. Every change site and command was read in the tree.
- Pitfalls: HIGH for CLOBBER (source read), release env, packaging and literal sweep; MEDIUM for whether the full run shows only the predicted reds.

**Research date:** 2026-10-16
**Valid until:** 2026-11-15, or the next esr153 point release, whichever comes first. Re-run `git ls-remote` before the pin edit regardless.
