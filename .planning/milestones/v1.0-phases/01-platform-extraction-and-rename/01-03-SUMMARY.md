---
phase: 01-platform-extraction-and-rename
plan: 03
subsystem: infra
tags: [branding, hand-write, display-literals, placeholder-mark, verification-driver, static-gate, anti-tautology]

requires: ["01-02"]
provides:
  - Every display literal hand-written from the inventory's declared targets — six branding surfaces, both `.desktop` entries, the Theia `applicationName`, and the LICENSE notice
  - The D-18 residual-brand gate running with NO exception at both call sites; `node scripts/scan-brand-residue.mjs` (bare) exits 0 over the whole tree
  - `powerbrowser/branding/mark.svg` — one original square source mark, plus the ten rasters and the Theia inline/data-URI twin derived from it
  - `scripts/verify-branding-preflight.mjs` — a no-build cross-check whose expected values come from a third source neither the rename nor the hand-write produced, with `--self-test`
  - `scripts/verify-platform.sh` — the single verification driver: 48 labelled checks, `--quick` / `--only <label>` / `--gate` / `--build`
  - `inventory/brand-tokens.json` gains `brand_display_expectations` (the preflight's expected-value source) and two `coincidental` rows for the replaced Mozilla brand colours
affects: [01-04, 01-05, 01-06, 01-07, phase-02-generator, phase-03-emitter, phase-06-verification]

actuals:
  tokens: 116410
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Deriving a verifier's expectations from a source NEITHER the value nor the verifier was produced from — two sources agreeing prove nothing when one pass wrote both"
    - "A self-test that asserts its UNMUTATED fixture is green before planting the mutation — a plant that reddens an already-red fixture proves nothing"
    - "Re-tiering a check to the tier that honestly describes its prerequisites, rather than excusing it — a --quick set containing a build-dependent check is not a gate, it is a constant"
    - "Consolidating N drivers by proving label and check-function parity programmatically against the files being deleted, in the same commit that deletes them"

key-files:
  created:
    - powerbrowser/branding/mark.svg
    - scripts/verify-branding-preflight.mjs
    - scripts/verify-platform.sh
  modified:
    - inventory/brand-tokens.json
    - powerbrowser/branding/dev/locales/en-US/brand.ftl
    - powerbrowser/branding/release/locales/en-US/brand.ftl
    - powerbrowser/branding/dev/locales/en-US/brand.properties
    - powerbrowser/branding/release/locales/en-US/brand.properties
    - powerbrowser/branding/dev/configure.sh
    - powerbrowser/branding/release/configure.sh
    - powerbrowser/branding/dev/content/aboutDialog.css
    - powerbrowser/branding/release/content/aboutDialog.css
    - powerbrowser/powerbrowser.desktop
    - powerbrowser/powerbrowser-release.desktop
    - powerbrowser/endpoint-allowlist.json
    - theia/applications/browser/package.json
    - theia/extensions/branding/src/browser/powerbrowser-mark.ts
    - theia/extensions/branding/src/browser/powerbrowser-welcome-widget.tsx
    - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx
    - scripts/verify-branding-identity.mjs
    - scripts/rebase-upstream.sh
    - .github/workflows/rebase-upstream.yml
    - LICENSE
    - docs/BUILD.md
    - powerbrowser/INTERNAL-APIS.md
  deleted:
    - scripts/verify-phase-02.sh
    - scripts/verify-phase-03.sh
    - scripts/verify-phase-04.sh
    - scripts/verify-phase-05.sh

key-decisions:
  - "The D-18 gate's `--except-hand-write` carve-out is DROPPED at both call sites. The bare scan exits 0, so the flag excepted nothing — and a carve-out that has stopped carving anything out is indistinguishable from one quietly hiding residue."
  - "The preflight's expected values come from a NEW `brand_display_expectations` block in the inventory, hand-authored from the recorded identity decisions. Reusing verify-branding-identity.mjs's VARIANTS descriptor would have been circular: the rename wrote it, and it was wrong."
  - "The pre-rename census is marked HISTORICAL, not rewritten. Post-rename every count is zero by construction, so a rewritten census asserts nothing the plain gate does not, while destroying the record of what the pre-rename tree contained."
  - "`desktop-entry-quick` and `apply-patches-self-test` re-tiered out of `--quick`. Both depend on something `--quick` promises not to need (a built tree; a 1.1 GB clone), so `--quick` could never be green on a fresh checkout and carried no information."
  - "The three allow-listed Mozilla hosts are now documented in this project's own ROADMAP.md and REQUIREMENTS.md. An allow entry nobody had to write down is one nobody has to defend."
  - "`POWERBROWSER_REPO_URL` retargeted from a github.com org the foundation has never established to `https://powerbrowser.org/`, closing an open item inherited from 01-01."
  - "The placeholder mark is the IEC 60417-5009 power glyph built from arc and rect primitives — a standard symbol, not a brand, and provably not derived from any existing mark."

patterns-established:
  - "Run the residual-brand gate against a STAGED tree. It iterates `git ls-files`, so a new file that is not yet staged is invisible to it — which is how a commit can register a gate and fail it at the same time."
  - "When a consolidation deletes source files, assert parity programmatically against those files in the same working tree, before `git rm` — afterwards the evidence is gone"

requirements-completed: [MIG-03]
requirements-advanced: [MIG-04]
requirements-note: "The plan's frontmatter declared MIG-04, but MIG-04 requires the tree to BUILD AND BOOT and nothing has been built — objdir/ does not exist. This plan delivered its prerequisites only. MIG-04 is left unchecked in REQUIREMENTS.md and is plan 01-04's to close. See Deviation 6."

coverage:
  - id: D1
    description: "Every branding value in the tree is a hand-written literal; no generator, no configuration.toml, no generated/ directory"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "git ls-files | grep -E 'configuration\\.toml|(^|/)generated/' → empty"
        status: pass
      - kind: integration
        ref: "no script under scripts/ emits a branding file; every value in branding/ was written by hand in commit cc2de65"
        status: pass
    human_judgment: false
  - id: D2
    description: "The display name reads `Power Browser` with a space on every user-facing surface and the identifier form never leaks into a display string"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "grep -rE 'PowerBrowser[ \"]' powerbrowser/branding/ powerbrowser/*.desktop theia/applications/browser/package.json → empty"
        status: pass
      - kind: integration
        ref: "verify-branding-preflight.mjs check 6 asserts the identifier form's absence line-by-line from all nine display surfaces; --self-test proves it goes red on a plant"
        status: pass
    human_judgment: false
  - id: D3
    description: "The vendor split is machine-side `DeBIOS` and display-side `DeBIOS Foundation`, treated as two distinct expected values"
    requirement: "MIG-03"
    verification:
      - kind: integration
        ref: "preflight check 5 asserts the two inventory values differ, that patches/010 sets MOZ_APP_VENDOR=DeBIOS, and that both brand.ftl files carry `-vendor-short-name = DeBIOS Foundation`"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both desktop entries resolve inside this repo and their Icon targets exist"
    requirement: "MIG-04"
    verification:
      - kind: integration
        ref: "preflight check 3 asserts Name/Exec/Icon/StartupWMClass against the inventory, `existsSync` on each Icon target, and the presence of both scheme handlers"
        status: pass
      - kind: integration
        ref: "Exec target existence — objdir/dist/bin/powerbrowser does not exist until plan 01-04 builds it (accepted residual, T-03-04)"
        status: deferred
    human_judgment: false
  - id: D5
    description: "The placeholder mark is original, square, dual-filled, and rasterized to all ten sizes"
    verification:
      - kind: integration
        ref: "viewBox=\"0 0 128 128\"; a `<defs><style>` with #1a1a1a default and #fff under prefers-color-scheme: dark; no text/tspan; only those two hexes in the file"
        status: pass
      - kind: integration
        ref: "PNG IHDR read on all ten rasters → each exactly its nominal square size"
        status: pass
      - kind: manual_procedural
        ref: "Named review of all 31 files under both branding directories, every one opened (the ten PNGs viewed as images) — see 'Non-derivative review record' below"
        status: pass
    human_judgment: true
    rationale: "Whether a mark is a recolour, crop, or rearrangement of another mark is a judgment about visual derivation that no grep settles. Artwork provenance is a legal boundary (T-03-01), so the record names who looked and at what."
  - id: D6
    description: "The two cheap static gates run in the no-build check set"
    requirement: "MIG-04"
    verification:
      - kind: integration
        ref: "verify-platform.sh --quick → 15/15 PASS in seconds, including scan-brand-residue, branding-preflight and branding-preflight-self-test"
        status: pass
      - kind: integration
        ref: "node scripts/verify-branding-preflight.mjs --self-test → exit 0; rejection names the file and both disagreeing values"
        status: pass
    human_judgment: false
  - id: D7
    description: "One verification driver exists; the four per-phase drivers are gone with every assertion preserved (D-21)"
    verification:
      - kind: integration
        ref: "programmatic parity assertion run against the four drivers before `git rm`: 45 distinct labels in, 45 out, zero lost; zero check_* / _impl functions defined in a deleted driver and missing from verify-platform.sh"
        status: pass
      - kind: integration
        ref: "--only verified on 5 distinct labels (4 ported, 1 new), each running exactly one check; unknown label, unknown flag, and --gate+--quick all exit 1"
        status: pass
      - kind: integration
        ref: "the 31 full-set checks — they need a built tree, a launched browser, or a display"
        status: deferred
    human_judgment: false
  - id: D8
    description: "No Mozilla brand colour survives inside Power Browser's branding directory"
    verification:
      - kind: integration
        ref: "grep -r '#130829' and 'hsla(235' under powerbrowser/branding/ → both empty; both files carry #1a1a1a and rgba(17, 17, 17, 0.5)"
        status: pass
      - kind: integration
        ref: "two coincidental inventory rows with expected_count 0; preflight check 8 asserts their continued absence, so a rebase reintroducing them is caught by name"
        status: pass
    human_judgment: false

duration: ~18m
completed: 2026-08-30
status: complete
---

# Phase 1 Plan 03: Hand-Write the Branding Surfaces Summary

**The 31 occurrences no token-boundary rule could safely rewrite are hand-written from the inventory's declared targets, the D-18 gate now runs with no exception at all, and the four per-phase verification drivers collapse into one `verify-platform.sh` with all 45 labels intact — guarded by a new preflight whose expectations come from a source neither the rename nor the hand-write produced, which is the only reason it could catch that the rename had already written the wrong expectation into the identity verifier.**

## Performance

- **Duration:** ~18m
- **Tasks:** 3
- **Commits:** 4
- **Files changed:** 45 (3 created, 4 deleted)

## Accomplishments

- **The bare scan is green.** `node scripts/scan-brand-residue.mjs`, no flags, exits 0 over 101 files. All 31 held-back occurrences across 10 files are resolved, and `--except-hand-write` is gone from `scripts/rebase-upstream.sh` and the CI workflow. **The D-18 gate now has no soft spots.**
- **The tautology was real, and the preflight caught it.** `scripts/verify-branding-identity.mjs`'s `VARIANTS` descriptor expected `PowerBrowser Dev` — the space-less *identifier* form — because the 01-02 rename pass rewrote the expectation alongside the value. Nothing in the tree disagreed with it. This is not the hypothetical Pitfall 1 describes; it is Pitfall 1 having already happened, sitting in the repo, waiting for a forty-minute build to surface as a wrongly-titled window.
- **The mark is one square source, ten rasters, and one Theia twin.** `powerbrowser/branding/mark.svg` at `viewBox="0 0 128 128"`, the IEC 60417-5009 power glyph built from an arc and a rect. Ten PNGs rendered from it at target density, every one verified square by reading its PNG IHDR. The two Theia widgets lost their `64×56` / `48×42` magic numbers — artifacts of the old mark's 99×85.9 aspect with no other justification.
- **`mark.svg` and `powerbrowser-mark.ts` are now provably the same asset.** The preflight asserts byte equality between the SVG's `<svg>` line and the module's `POWERBROWSER_MARK_SVG` string. Nothing else in the tree would notice them drifting: the module keeps compiling, and the window icon and the tab-strip favicon just quietly stop being the same mark.
- **45 labels in, 45 labels out.** The consolidation's parity was asserted programmatically against the four driver files *before* `git rm` removed them — afterwards the evidence would have been gone. Zero labels lost, zero check functions dropped. Git tracks `verify-platform.sh` as a rename of `verify-phase-05.sh` (whose skeleton it is), so `git log --follow` resolves through it.
- **`--quick` is a usable commit gate for the first time.** 15/15 PASS in seconds. It was permanently red before, on the same rows, every run.
- **Two Mozilla brand colour values are out of our branding directory** and recorded as `coincidental` inventory rows with `expected_count: 0`, so a rebase reintroducing them fails by name rather than being rediscovered in Phase 6.
- **An inherited open item closed:** `POWERBROWSER_REPO_URL` pointed at `github.com/DeBIOS/PowerBrowser`, an org the foundation has never established — a namespace a third party could register and then be linked to from the welcome screen. Retargeted at `https://powerbrowser.org/`, the one host D-12 actually fixes, with the endpoint allowlist row moved with it.

## Task Commits

| # | Commit | Message |
|---|--------|---------|
| 1 | `cc2de65` | feat(01-03): hand-write every display literal the codemod was forbidden to touch |
| 2 | `a17870f` | feat(01-03): drop the D-18 gate's hand-write carve-out — the bare scan is green |
| 3 | `a0f1585` | feat(01-03): original square placeholder mark, ten rasters, square render sizes |
| 4 | `92702c9` | feat(01-03): branding preflight + consolidate four drivers into verify-platform.sh |

Commits 3 and 4 were each amended once, to fold in a fix for a residual brand literal the new file itself introduced (see Deviation 1). Amended rather than fixed forward so no commit in this range is red on the gate it registers — the same discipline 01-02 applied to its own instance of this.

## Decisions Made

### The gate's carve-out is gone, not kept

01-02 handed over `--except-hand-write` with an explicit instruction to drop it once the hand-write surfaces landed. They landed; the bare scan exits 0; **the flag is removed from both call sites.** Leaving it would have been free and invisible, which is exactly the problem: a carve-out that excepts nothing looks identical to one quietly hiding residue, and the next reader has no way to tell which they are looking at.

### The preflight's expectations come from a third source, deliberately

The obvious implementation reads `verify-branding-identity.mjs`'s `VARIANTS` descriptor and compares the branding files against it. That is circular, and the circularity is not academic — **that descriptor was wrong when this plan started.** The rename pass wrote `PowerBrowser Dev` into it, the same pass that wrote the branding files, and the two agreed with each other about a value that was wrong.

So `inventory/brand-tokens.json` gains a `brand_display_expectations` block, hand-authored from the recorded identity decisions (D-09 amended, D-10, D-12, D-13). `rename-brand.mjs` is hard-excluded from every `brand-display` row by class and from every hand-write surface by site, so it has never written a byte of it. The preflight compares the branding files *and* the identity verifier's descriptor against that block. Two sources agreeing prove nothing when one pass wrote both; three, one of which no pass writes, is evidence.

### The pre-rename census stays historical

01-02 deferred this call. `--reconcile`'s census and `ground_truth` arithmetic describe the tree at the import commit, which is what made `01-SCAN-RED-REPORT.md` checkable — a red scan reconciled against an independently-grepped outside number is evidence, whereas a non-zero exit alone is not, because an under-scanning scanner also exits non-zero (D-17).

Rewriting it to the post-rename tree was considered and **rejected**: post-rename every count is zero by construction, so the rewritten census would assert nothing the plain gate does not already assert, while destroying the only record of what the pre-rename tree contained. An all-zeros census is a vacuous duplicate of a gate that already works. The block is now marked `census_status: HISTORICAL` with that reasoning in it, so the next reader does not misread `--reconcile`'s 36 condition failures as a live defect.

### The mark is a standard symbol, not an invention

The IEC 60417-5009 power glyph: a broken ring and a bar. It is a standard, in universal public use, not anyone's brand. That makes the non-derivation question trivially answerable rather than a matter of opinion, which is the right property for a placeholder whose whole job is to be replaced. No brand hue was invented — `#1a1a1a` is the shell's dominant neutral and `#fff` its ink — keeping the tree's zero-invented-colours property so Phase 3's emitter has nothing extra to generate and Phase 6's scan nothing extra to police.

### Two checks re-tiered; one red left red

`desktop-entry-quick` reads `objdir/config.status` and `apply-patches-self-test` needs the 1.1 GB `upstream/` clone. Both sat in a `--quick` set that promises neither, so `--quick` failed identically on every fresh checkout and told you nothing. Both moved to the full set, where `--only` also reaches them — strictly more reach, since `verify-phase-03.sh` had registered `desktop-entry-quick` *only* under `--quick`, making it unreachable in a full run.

`allowlist-doc-consistency` was **not** re-tiered, because it needs no build and its red was real: three Mozilla hosts allow-dispositioned in `endpoint-allowlist.json` and documented nowhere in this project's own planning record. Fixed by documenting them rather than by moving the check.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Two commits failed the very gate this plan tightened**

- **Found during:** Task 3 verification, twice — once after Task 2 and once after Task 3.
- **Issue:** `powerbrowser/branding/mark.svg`, `powerbrowser-mark.ts`, `scripts/verify-platform.sh` and `scripts/verify-branding-preflight.mjs` each explained the mark's non-derivation or the consolidation's rationale by *naming the upstream project*. All four are inside the D-18 scan's scope, so the scan went red on files whose entire purpose is to describe why the rename happened.
- **Root cause of the second instance, which is the interesting one:** the scan iterates `git ls-files`. `verify-platform.sh` and `verify-branding-preflight.mjs` were still **untracked** when I ran the gate, so the scan could not see them and reported PASS. Staging them made both red. **A green scan over an unstaged tree is not a green scan.**
- **Fix:** reworded all four to say "the upstream project", each carrying a note that the inventory is the one place that spells the token — the same resolution 01-02 reached for `rebase-upstream.sh`. Folded into the owning commits by amend, so no commit in this range is red.
- **Verification:** bare scan PASS over 101 files with everything staged.
- **Committed in:** `a0f1585`, `92702c9` (both amended)

**2. [Rule 2 — Missing critical functionality] Three allow-listed Mozilla hosts were documented nowhere**

- **Found during:** Task 3, first `verify-platform.sh --quick` run.
- **Issue:** `allowlist-doc-consistency` requires every `allow`-dispositioned `mozilla.com`/`mozilla.net` host in `powerbrowser/endpoint-allowlist.json` to be named in this repo's `.planning/ROADMAP.md` **and** `.planning/REQUIREMENTS.md`. Three were not: `firefox.settings.services.mozilla.com`, `content-signature-2.cdn.mozilla.net`, `firefox-settings-attachments.cdn.mozilla.net`. The check reads *this* project's planning docs; the upstream project's own docs had carried them, and those were never imported (D-03).
- **Why this is Rule 2 and not scope creep:** the property is that no Mozilla egress host is allow-listed without a documented reason in the project's requirements. Three were. That is a live governance gap at a trust boundary, and the reasons already existed verbatim in the allowlist file.
- **Fix:** an "Inherited Mozilla egress carve-out" subsection in `REQUIREMENTS.md` under TEL and a matching section in `ROADMAP.md`, naming all three, stating that they are one feature (Remote Settings, which cannot be disabled without also losing CRLite certificate revocation, intermediate certificate preloading and tracking-protection updates), and pointing at the allowlist as the single source of truth for the full rationale.
- **Verification:** `allowlist-doc-consistency` PASS; its self-test still rejects both planted hosts, so the check kept its teeth rather than being widened.
- **Committed in:** `92702c9`

**3. [Rule 1 — Bug] `--quick` could never be green, on any tree**

- **Found during:** Task 3, first `--quick` run. Confirmed pre-existing by running `verify-phase-03.sh --quick` at this plan's parent commit: identical failures.
- **Issue:** `desktop-entry-quick` reads `objdir/config.status` and `apply-patches-self-test` reads `upstream/browser/moz.configure`. Neither exists on a fresh checkout, and `--quick`'s contract is explicitly "no build, no browser launch, no display". A gate whose output is the same two red rows on every run carries no information, and a plan success criterion required `--quick` to exit 0.
- **Fix:** both moved to the full set, with the reasoning recorded inline at the registry. Neither is excused — both still run, and `--only <label>` reaches each.
- **Committed in:** `92702c9`

### Plan Corrections

**4. [Plan error] `.mozconfig` does not set `MOZ_APP_VENDOR`, and never did**

The plan's action and acceptance criterion both assert "`.mozconfig` sets `MOZ_APP_VENDOR` to `DeBIOS`". `MOZ_APP_VENDOR` is set by `patches/010-powerbrowser-identity.patch:20` (`imply_option("MOZ_APP_VENDOR", "DeBIOS")`), which the 01-02 rename already moved. The `.mozconfig` half of the criterion — basename, distribution id, branding dir — was likewise already correct from 01-02. No change was needed in the tree; the preflight asserts the vendor at its **real** site. Same class of error as 01-02's deviation 4 and 01-01's deviation 2: an acceptance criterion naming the wrong file.

**5. [Plan gap] `LICENSE` is not in the plan's `files_modified`, but is in the hand-write set**

`LICENSE:133` carries two of the 31 held-back occurrences — the vendor and product halves of the MPL "Required Notice" line — and the inventory's `hand_write.line_contains` block explicitly assigns it to this plan. The plan's Task 1 action never mentions it and its `files_modified` omits it. Written anyway (`Copyright DeBIOS Foundation (Power Browser)`), because the plan's stated goal state is a green bare scan and that is unreachable without it. A token-wise rename would have produced "DeBIOS Foundation Institute Corporation", which is not a legal entity — the exact reason it was held back.

**6. [Plan error, corrected in state] MIG-04 is declared in this plan's frontmatter but is NOT complete**

The plan's `requirements: [MIG-03, MIG-04]` caused the state machinery to check MIG-04 off. MIG-04 reads "the renamed tree **builds and boots** on Linux under Power Browser branding (proven by the existing smoke tests)". Nothing has been built — `objdir/` does not exist and this plan never invoked a compiler. Marking it complete would be a claim with no evidence behind it, and a later audit reading REQUIREMENTS.md would find a satisfied requirement that nothing satisfies.

**Reverted to unchecked**, with an inline note recording what 01-03 actually delivered (working desktop entries, correct compiled display literals, the pre-build preflight — MIG-04's *prerequisites*) and that plan 01-04 owns the build. The traceability row now reads "In progress" rather than "Complete". Recorded as a blocker in STATE.md. **MIG-03 is genuinely complete and stays checked.**

**7. [Environment] `file(1)` is not on `PATH` in this shell**

Two of the plan's `<verify>` blocks call `file -b` to assert raster dimensions. The binary does not exist here. Replaced with a Node reader that parses the PNG IHDR chunk directly — a strictly stronger check, since it reads the actual encoded dimensions rather than trusting a magic database.

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical functionality), 4 plan corrections.
**Impact on plan:** No scope creep. Deviation 1 is self-inflicted and caught by the plan's own gate; deviations 2 and 3 are inherited defects the consolidation surfaced by putting every check in one table for the first time.

## Non-derivative review record (T-03-01)

Every file under both branding directories was **opened**, not judged by filename — 31 files, including all ten PNG rasters viewed as images.

- **Reviewer:** Claude Opus 5, executing plan 01-03 as the GSD plan executor
- **Date:** 2026-08-30
- **Scope:** all 31 files under `powerbrowser/branding/` (both variants plus `mark.svg`)
- **Method:** every text file read in full; the ten PNGs rendered and viewed; `dev` and `release` diffed pairwise (all six shared text files byte-identical, the two `pref/firefox-branding.js` differing only by the dev-only `browser.tabs.inTitlebar` block and its rationale)
- **Findings:** no image, colour, or brand-asset reference in either `firefox-branding.js`; `content/jar.mn` deliberately packages only the five `default*.png` and explicitly does *not* reference `about.png`, `about-logo*`, `about-wordmark.svg`, `firefox-wordmark.svg`, `document.ico` or `document_pdf.svg`, all of which are Mozilla marks; the only artwork in either directory is the ten rasters, all derived from `mark.svg`; `mark.svg` contains exactly two hex values, both already present in the shell, and no text or tspan element
- **Verdict:** no derivative or third-party artwork present

⚠ **This is an agent's review, not a human counter-signature.** Artwork provenance is a legal boundary, and an agent asserting non-derivation does not settle a legal question. The mark is the IEC 60417-5009 power glyph — a standard symbol in universal public use, constructed here from arc and rect primitives — which makes the question about as easy as it can be made, but a human sign-off before any release is still owed.

## Issues Encountered

- **The residual scan is invisible to unstaged files.** It iterates `git ls-files`. This is correct behaviour (it is how the scan excludes `upstream/`, `objdir/`, `node_modules/` and every other ignored path — the half of Pitfall 7 that would otherwise drown it in Gecko's own thousands of Firefox-named files), but it means a new file can pass the gate and then fail it the moment it is staged. Recorded as a pattern above.

## Known Stubs

None. Every surface this plan owns carries a real value.

The one thing that does not yet resolve is each `.desktop` entry's `Exec` target, `objdir{,-release}/dist/bin/powerbrowser` — the binary plan 01-04 builds. That is the accepted residual the plan's own threat model records as T-03-04, not a stub: the path is asserted correct, the `Icon` target beside it is asserted to exist, and nothing about it is placeholder content.

## Deferred Items

Appended to `deferred-items.md` as entries 4–6. In brief:

- `apply-patches-self-test` needs the git-ignored 1.1 GB `upstream/` clone; pre-existing, rename-independent, re-tiered out of `--quick`.
- `desktop-entry-quick` needs a built tree; first green run comes with plan 01-04's build.
- The ten rasters are byte-identical between `dev` and `release` by construction; a visually distinct variant icon would need a second source SVG, not a post-process.

Also outstanding, and **now closed**: entry 1 (the unconfirmed `github.com/DeBIOS/PowerBrowser` URL) — retargeted at `https://powerbrowser.org/` in `cc2de65`, with the endpoint allowlist row and the inventory's own note moved with it.

Still deferred from 01-02 and untouched here: `verify-customize-inert.mjs` and `verify-dev-flag-off.mjs` need a built binary; `yarn install` exits non-zero on puppeteer's postinstall wanting a `tar` binary the dev shell does not provide (resolution, workspace linking and `tsc -b` all succeed).

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or schema at a trust boundary was introduced. One existing egress surface was **narrowed**: the welcome widget's link moved off a github.com org nobody owns onto the project's own domain.

Every mitigation in the plan's threat model landed:

- **T-03-01 (mark provenance):** original standard-symbol geometry, square viewBox, no text element, no new hex, plus the named review recorded above.
- **T-03-02 (residual Mozilla brand colour):** both values replaced with the shell's neutrals and recorded as `coincidental` inventory rows with `expected_count: 0`, which the preflight enforces on every run.
- **T-03-03 (verifier tautology):** the preflight derives its expectations from `brand_display_expectations`, a block no pass writes; `--self-test` proves the unmutated fixture green, then plants the space-less form and asserts the rejection names the file and both values; a separate plant proves an emptied row set fails distinctly rather than passing having checked nothing. **The threat was live in the repo when this plan started, and this is what found it.**
- **T-03-04 (broken desktop entry):** both absolute paths asserted inside this repo, both `Icon` targets asserted present on disk. Accepted residual unchanged: the `Exec` binary arrives with plan 01-04.
- **T-03-05 (profile path from vendor):** the split is enforced, and the preflight fails if the two inventory values are ever made equal.
- **T-03-SC (supply chain):** no package-manager install occurred. Rasterization used `inkscape`, already present.

## Next Phase Readiness

Ready for plan 01-04 (the build). It inherits:

- A tree with **no residual brand string anywhere**, gated with no exception in the rebase chain, in CI, and as a registered check in `verify-platform.sh`.
- Two static gates that run in seconds before the ~39-minute build, so a wrong branding literal costs a second rather than a build cycle. Run `scripts/verify-platform.sh --quick` before starting one.
- One driver with 48 labelled checks. Nine of them (`desktop-entry-quick`, `branding-variant-divergence`, the three `verify-branding-identity-*`, `shell01-theia-is-the-window`, `shell05-paint-before-backend`, `side03-kill-and-recover`, and the `side04-*` family) go from unrunnable to runnable the moment `objdir/dist/bin/powerbrowser` exists. **`--only <label>` is the tool for exercising them one at a time** rather than paying for the full set.
- `powerbrowser/branding/mark.svg` as the single source for all ten rasters — Phase 3's icon pipeline regenerates from it rather than from any PNG.

**Note on `actuals.tokens`:** 116,410 is chars/4 over the 32 text files this plan changed, the same scale as the plan's 85,000 estimate. As in 01-02, the figure overstates authored work: `verify-platform.sh` alone is 3,148 lines, the large majority of which is text sliced verbatim out of four files being deleted in the same commit, and several other entries changed by a single-line `sed`. Genuinely authored surface is roughly 35,000 on the same scale — the preflight, the driver's preamble/registry/gate, `mark.svg`, the inventory's new block, and the hand-written literals. Reported unrounded so future estimates calibrate on the real number, with the caveat attached.

---
*Phase: 01-platform-extraction-and-rename*
*Completed: 2026-08-30*

## Self-Check: PASSED

All three created files are present on disk (`powerbrowser/branding/mark.svg`, `scripts/verify-branding-preflight.mjs`, `scripts/verify-platform.sh`), all four commits resolve in `git log`, and all four deleted drivers are gone from both the working tree and the index.
