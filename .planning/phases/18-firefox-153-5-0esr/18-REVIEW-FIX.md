---
phase: 18-firefox-153-5-0esr
fixed_at: 2026-10-16T00:00:00Z
review_path: .planning/phases/18-firefox-153-5-0esr/18-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-10-16
**Source review:** .planning/phases/18-firefox-153-5-0esr/18-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01 to WR-05; Info findings out of scope)
- Fixed: 5
- Skipped: 0

`workflow.use_worktrees` is `false`, so all edits and commits were made in the main checkout. No worktree was created.

## Fixed Issues

### WR-01: smoke-firefox no longer detects an `upstream/` that is not at the pin

**Files modified:** `scripts/smoke-firefox.sh`, `scripts/verify-platform.sh`
**Commit:** 01d92d4
**Applied fix:** After the `.mozconfig` check and before the version read and the build, smoke-firefox now runs `env -u TAG scripts/fetch-upstream.sh >/dev/null` and exits 1 on non-zero. fetch-upstream makes no network call when `upstream/` exists. It compares HEAD with the pinned tag's commit and runs the dirt classifier. TAG is unset so an exported rebase target cannot stand in for the pin. The registry comment now says the version check compares against `version_display.txt`, and that the pin is proved by the fetch-upstream precheck.

**Failing direction proved without a build.** A scratch fixture held copies of both scripts, a git `upstream/` with tag `PIN_TAG`, `generated/upstream-pins.env` naming it, and a stub `nix` on PATH that prints `NIX_REACHED` and exits 99:
- A, HEAD at the pin tag: the precheck passes and the stub `nix` is reached (exit 99).
- B, HEAD one commit past the pin tag, with `version_display.txt` changed (the WR-01 scenario): `fetch-upstream: FAIL -- upstream/ HEAD (37f3c58...) is not PIN_TAG (17cce41...)`, then `smoke-firefox: FAIL -- upstream/ is not at the pinned ESR tag`. Exit 1, and `nix` is never reached.
- C, as B with `TAG=OTHER` exported, where OTHER is HEAD's tag: same FAIL and exit 1. The TAG unset works.
- Real tree: `scripts/fetch-upstream.sh` exits 0 (`already at FIREFOX_153_5_0esr_BUILD1 and accounted-for clean`), HEAD `223014c6b9299ac9b035b4c50ea481e5c6de282c`.
- `bash -n` passes on both changed scripts.

### WR-02: BUILD.md attributes a 153.5 `--version` output to a pre-rename 153.1 build

**Files modified:** `docs/BUILD.md`
**Commit:** 8075360
**Applied fix:** The paragraph now states that the measured 3224 s build predates 153.5. It attributes `DeBIOS powerbrowser 153.5.0esr` to the current pin, observed in 18-02 and 18-03 on both objdirs (18-03-SUMMARY lines 85-86). The string `powerbrowser 153.5.0esr` that the 18-02 plan check greps for is kept.

### WR-03: MAR prerequisites still say the current tree is version 153.1.0

**Files modified:** `docs/BUILD.md`
**Commit:** 657657b
**Applied fix:** The prerequisite now dates `Version=153.1.0` to the recorded 08-04 hop. It states that the current tree reads `Version=153.5.0`, so `version-nplus1/` must be bumped above it before a re-run (backlog 999.2).

### WR-04: The CI note understates the workflow's generate step and contradicts BUILD.md:47-48

**Files modified:** `docs/BUILD.md`
**Commit:** de37088
**Applied fix:** The CI note now says the generate step runs bare `node scripts/generate.mjs` on a runner with no inkscape, so the first dispatch is expected to fail at that step, before the rebase. It also notes that wrapping the workflow in Nix is deferred (18-CONTEXT). The review proposed one pointer at BUILD.md:47-48. That would have been wrong, because `verify.yml` does run generate inside `nix develop .#theia` (verify.yml:67, :70). The sentence now names `verify.yml` as running the commands the same way, and says `rebase-upstream.yml` does not, with a pointer to the CI note. The workflow itself was not changed (locked). No new backlog item was written. 18-CONTEXT's Deferred section already records "Wrapping `rebase-upstream.yml` in Nix".

### WR-05: "The commit SHA is the identity" is documented but nothing enforces it

**Files modified:** `docs/BUILD.md`
**Commit:** 2e810ea
**Applied fix:** This fix rewords the docs. No SHA gate was added. "So the commit SHA is the identity" was replaced with text saying the SHA is the identity recorded at adoption and no gate checks it. It names the consumers that resolve the tag name: `configuration.toml`, `fetch-upstream.sh` and `rebase-upstream.sh`, the last of which only runs `ls-remote` on the tag. It also states the consequence: a re-pointed tag would pass every gate.

**Why no gate:** a SHA gate does not fit in one or two lines. Reading the SHA from BUILD.md prose would be fragile, and it would be a hand-kept expectation, which CLAUDE.md's verification rule 2 forbids. The proper gate needs three changes: a `[upstreams]` manifest field, a generator emission, and a `fetch-upstream.sh` comparison. verify-upstream-pins would also have to learn the new field. That is a follow-up candidate, not part of this fix.

## Verification

All gates ran in the main checkout, `/home/chris/coding/Power-Browser`, after the five commits:
- `node scripts/verify-upstream-pins.mjs`: PASS, exit 0
- `node scripts/generate.mjs --check`: PASS, 54 files match, exit 0
- `node scripts/scan-brand-residue.mjs`: PASS, 365 files, exit 0. Every changed file was committed, and so tracked, at scan time.
- `scripts/verify-platform.sh --quick`: exit 1. The FAIL rows are exactly `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy` and `gui08-panorama-copy-self-test` (Phase 21).
- No Gecko build was run, `patches/` was not touched, and `nix flake update` was not run.

---

_Fixed: 2026-10-16_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
