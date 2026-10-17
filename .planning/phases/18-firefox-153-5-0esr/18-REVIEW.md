---
phase: 18-firefox-153-5-0esr
reviewed: 2026-10-16T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - .github/workflows/rebase-upstream.yml
  - README.md
  - configuration.toml
  - docs/BUILD.md
  - scripts/fetch-upstream.sh
  - scripts/smoke-firefox.sh
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-10-16
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Diff range `802f2f8..HEAD` over the six files. These items are correct:

- **Pin agreement.** `configuration.toml`, the workflow default, `generated/upstream-pins.env` and README all carry `FIREFOX_153_5_0esr_BUILD1`. `node scripts/verify-upstream-pins.mjs` exits 0 on the current tree.
- **fetch-upstream.sh comment.** It contains no `FIREFOX_<digit>` literal (grep is empty). It names tags by suffix only, and its 153.4 claim matches the 18-02 `ls-remote` record.
- **smoke-firefox.sh redirect order.** I ran this in a scratch directory. With an absent file, a whitespace-only file and a directory as input, `tr -d '[:space:]' 2>/dev/null < "$VERSION_FILE" || true` produces an empty string and prints no shell error under `set -euo pipefail`. The `-z` guard then fails before the compile. A CRLF file normalises to `153.5.0esr`. `version_display.txt` is the right source, because `--version` prints `MOZ_APP_VERSION_DISPLAY` (`153.5.0esr`), not `version.txt` (`153.5.0`).
- **MAR and workflow labels.** BUILD.md does not claim a 153.5 MAR hop or a workflow run. The MAR section and the matrix section both say the evidence predates 153.5. The CI note says the workflow is unexercised.

The defects are a lost gate property in smoke-firefox.sh and four doc statements that disagree with the evidence or with other text in BUILD.md.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: smoke-firefox no longer detects an `upstream/` that is not at the pin

**File:** `scripts/smoke-firefox.sh:24-31`, `scripts/smoke-firefox.sh:51-56` (and the registry comment at `scripts/verify-platform.sh:4679-4681`)

**Issue:** The expected version now comes from the tree that is being built. The check therefore confirms the build matches its own sources, but not that those sources are the pinned ESR. Suppose someone bumps `configuration.toml` and runs `generate.mjs` but does not rebase:
- `verify-upstream-pins` passes. It checks the manifest, the fragment, the workflow and fetch's default, not `upstream/` HEAD.
- `smoke-firefox` passes, because it reads the stale `version_display.txt`.
- `verify-branding-identity-*` passes. It derives its expectation from the same file (`verify-branding-identity.mjs:267`).
- No full-run row runs `fetch-upstream.sh` without `--self-test`.

The old `153.1.0esr` literal was the only assertion tied to the pin. 18-02 relied on it ("smoke-firefox red with the old literal"). The next bump has no such red.

The registry comment at `verify-platform.sh:4680-4681` ("reports the pinned ESR version") is now false.

**Fix:** Keep the derivation, and add the pin check that already exists. `fetch-upstream.sh` makes no network call when `upstream/` exists. It compares HEAD with the pinned tag's commit and runs the dirt classifier. Add this after the `.mozconfig` check:
```bash
# The version below is derived from upstream/; this proves upstream/ is the pin.
"$REPO_ROOT/scripts/fetch-upstream.sh" >/dev/null || {
  echo "smoke-firefox: FAIL -- upstream/ is not at the pinned ESR tag (see fetch-upstream output above)" >&2
  exit 1
}
```
Note that `fetch-upstream.sh` writes its FAIL lines to stderr, so they still show with stdout discarded.

### WR-02: BUILD.md attributes a 153.5 `--version` output to a pre-rename 153.1 build

**File:** `docs/BUILD.md:439-446`

**Issue:** The paragraph begins "Measured on the reference host". It describes the 3224 s first build (the D-11/D-12 era, pre-153.5). It now continues "The resulting binary reports **`DeBIOS powerbrowser 153.5.0esr`**". The binary from that measured build could not have reported 153.5. The edit moved the version string without moving the claim to the build that produced it. This is the "153.5 proof from pre-153.5 evidence" pattern in reverse: current output attached to an old measurement.

**Fix:** Separate the two claims:
```markdown
... peaking at 14 G of `objdir/`. ... At the current pin the binary reports
**`DeBIOS powerbrowser 153.5.0esr`** via `./mach run --version` (observed in
18-02 and 18-03, both objdirs) — `--version` concatenates ...
```

### WR-03: MAR prerequisites still say the current tree is version 153.1.0

**File:** `docs/BUILD.md:808-812`

**Issue:** The new paragraph at 802-806 says the hop predates 153.5. The text right after it still states, in present tense, "the task-1 rebuilt tree is version N (`objdir/dist/bin/application.ini`: `Version=153.1.0`)". Both objdirs now read `Version=153.5.0` (18-03). An operator who follows the steps as written would build an N-plus-1 of 153.1.1 against an N of 153.5.0. That is a downgrade, and the updater rejects it. The prerequisite text contradicts both the tree and the paragraph above it.

**Fix:** Date the values:
```markdown
Prerequisites: the task-1 rebuilt tree is version N (at the recorded 08-04
hop, `objdir/dist/bin/application.ini` read `Version=153.1.0`; the current
tree reads `Version=153.5.0`, so `version-nplus1/` must be bumped above it
first, backlog 999.2); ...
```

### WR-04: The CI note understates the workflow's generate step and contradicts BUILD.md:47-48

**File:** `docs/BUILD.md:1143-1144`, `docs/BUILD.md:47-48`, `.github/workflows/rebase-upstream.yml:86-93`

**Issue:** The new note says "Its generate step runs outside Nix, so inkscape is not pinned there." The actual problem is worse:
- `generate.mjs` calls `spawnSync('inkscape', ...)` (`scripts/generate.mjs:2956`) and fails when the call fails.
- The workflow runs bare `node scripts/generate.mjs` on `ubuntu-latest` and installs nothing.
- inkscape is not part of the GitHub-hosted Ubuntu image.

So the first dispatch is expected to fail at "Generate the derived build surfaces". This happens before the rebase step, so the workflow cannot pass in its current form. "Unexercised" is accurate but leaves this out.

BUILD.md:47-48 also says "CI runs them the same way" (inside `nix develop .#theia`). That is false for this workflow, and the new note sits about 1100 lines from it without fixing it. The phase moved the workflow default to the new pin and documented the workflow, but did not record that it cannot reach its rebase step.

**Fix:** State the blocker plainly in the CI note: "Its generate step runs bare `node scripts/generate.mjs` on a runner with no inkscape, so the first dispatch is expected to fail at that step, before the rebase." In BUILD.md:47-48, replace "and CI runs them the same way" with a pointer to that note. Wrapping the workflow in Nix stays out of scope (locked in 18-CONTEXT). Record it as a backlog item instead.

### WR-05: "The commit SHA is the identity" is documented but nothing enforces it

**File:** `docs/BUILD.md:1115-1121`, `configuration.toml:115`, `scripts/fetch-upstream.sh:296-304`

**Issue:** BUILD.md concludes that "tag names alone are not identity ... so the commit SHA is the identity". The SHA `223014c6...` exists only in prose. Every consumer resolves the tag name:
- `configuration.toml` pins only the tag.
- `fetch-upstream.sh` clones `--branch "$TAG"` and compares HEAD with whatever that tag resolves to locally.
- `rebase-upstream.sh` validates the tag with `ls-remote` but not its SHA.

If the mirror re-points `_BUILD1`, a fresh clone gets the new commit and every gate passes. The pin is a `_BUILD1` tag, and the same paragraph shows that at 153.4 `_BUILD1` was not the released commit. That pattern makes the gap more likely to matter at a future bump than it would be with `_RELEASE`. The doc states a property that the tree does not have.

**Fix:** Do one of the following:
- Reword: "the SHA recorded here is the identity at adoption; no gate checks it."
- Or, smaller than it looks: add `firefox_esr_commit = "223014c6..."` to `[upstreams]`, have generate emit it, and have `fetch-upstream.sh` compare `HEAD_SHA` against it as well as against `TAG_SHA`.

## Info

### IN-01: The 08-05 drill paragraph still calls 153.1 "the pinned" tag

**File:** `docs/BUILD.md:1096-1112`

**Issue:** "newer than the pinned `FIREFOX_153_1_0esr_RELEASE`" and "Adopting 153.2.0esr is a future rebase-adoption task" are written in present tense. The next paragraph names a different pin, so the reader sees two "pinned" tags in a row.

**Fix:** Change to "the then-pinned" and "(superseded: Phase 18 adopted 153.5)".

### IN-02: The PASS line hardcodes the version-file path instead of using `$VERSION_FILE`

**File:** `scripts/smoke-firefox.sh:56`

**Issue:** The FAIL lines print `$VERSION_FILE`, but the PASS line spells the path as a literal. If the path changes, the PASS message drifts silently.

**Fix:** Use `${VERSION_FILE#"$REPO_ROOT"/}`.

### IN-03: The version match is an unanchored substring over all `mach run` stdout

**File:** `scripts/smoke-firefox.sh:51`

**Issue:** `grep -qF -- "$EXPECTED_VERSION"` passes if the string appears on any line `mach` prints, not only on the `--version` line. The old check had the same weakness, and the empty-string case is guarded. This is a low risk.

**Fix:** Match the line shape, e.g. `grep -qE -- " ${EXPECTED_VERSION//./\\.}\$"`.

### IN-04: The workflow header comment is stale against the new BUILD.md record

**File:** `.github/workflows/rebase-upstream.yml:15-18`

**Issue:** The comment says "origin/master has zero registered workflows" and "The first real dispatch is plan 03-06's job". BUILD.md now records that the workflow is registered and active on `main` and has zero runs.

**Fix:** Replace the comment with a one-line pointer to the BUILD.md CI note.

---

_Reviewed: 2026-10-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
