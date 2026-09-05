---
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  gap_snapshot: "unknown::scenarios=0"
---

# Phase 6: Two-Layer Verification and Rebranding Docs — UAT (human items)

All automated checks pass (`verify-platform.sh --quick`: 95 PASS, 0 FAIL; dev-variant six-surface run green).
These 4 items were deliberately staged, not executed, by plans 06-02/06-03/06-04/06-06. Tier-3 builds
and human artwork judgment are never run by verification.

## UAT-1: Trademark artwork ritual (06-03 checkpoint, DEFERRED)

**Prerequisite:** None — `brand/` currently holds `brand/mark.svg` (+ this record itself).

**Test:**

1. Open `brand/mark.svg` and judge it by inspection, not by filename: confirm it carries no
   third-party mark, logo, or wordmark of Mozilla, Eclipse, or any other owner, and that it is the
   original square dual-fill power-glyph mark described in `brand/HUMAN-REVIEW.md`.
2. Reply with your name, today's date, and CONFIRMED (or describe the finding).
3. The executor writes the name/date into `brand/HUMAN-REVIEW.md`, replacing all 3
   `TO-BE-SIGNED` placeholders, and re-runs:

```sh
node scripts/verify-trademark-surface.mjs
scripts/verify-platform.sh --quick
```

**Expected:** Record signed (zero `TO-BE-SIGNED` remaining); trademark gate + `--quick` still green.
The mechanical gate already fails on any new unlisted `brand/` file, so the deferral cannot silently widen.
**Why human:** Artwork inspection cannot be automated. Primary-source basis (Mozilla Trademark
Guidelines Open Source Project Guidelines; Eclipse Foundation Trademark Usage Policy v1.1.1
effective 2026-03-18, both confirmed 2026-09-04) is already recorded verbatim — only the look-and-sign remains.

## UAT-2: Release-variant six-surface live proof (VER-02 release half)

**Prerequisite:** A release build at `objdir-release/dist/bin/powerbrowser` (plus its `config.status`
and the release branding files). `objdir-release/` is absent on this tree; building it is tier-3
(~47–54 min reference) and out of scope for verification.

**Test:**

```sh
node scripts/verify-branding-identity.mjs --variant release
```

**Expected:** All six surfaces PASS with manifest-derived expectations (`Power Browser` without suffix,
release branding dir). Without the prerequisite the checker fails honestly naming the missing paths
(observed at plan time: brand-full-name PASS on the release locale files, desktop-entry + version
FAIL naming the absent `objdir-release/` paths) — that FAIL is the staged honest outcome, not a defect.
**Why human:** Needs a tier-3 release build verification never spends.

## UAT-3: CI-runtime drill (success criterion 4, runtime half)

**Prerequisite:** A fresh clone (so `generated/` is absent), `node` on PATH, no Nix.

**Test (replays exactly what the new workflow runs):**

```sh
node scripts/generate.mjs
node scripts/generate.mjs --check
scripts/verify-platform.sh --quick
```

**Expected:** All three green in that order (generate-first ordering is load-bearing: `--check` on a
fresh clone without generate reports missing targets, which is a non-defect red). Then confirm the
workflow itself went green on its first push/PR dispatch (`.github/workflows/verify.yml` was committed
but no dispatch was triggered by plan 06-06).
**Why human:** Verification ran the same three commands on the working tree (all green) but never
materialised a second checkout; only a fresh-clone run proves the CI path. Tier-3 rows stay local
drills per the workflow's exclusion comment (`verify-branding-identity` live drive beyond `--quick`,
`verify-endpoints` layers 2–3, full `verify-platform.sh` live-launch rows — each needs a built tree
and/or display).

## UAT-4: Legal-notice-aware `assertDisplayForm` in `verify-branding.mjs` (carried 06-04 follow-up)

**Prerequisite:** A built dev tree + display for the live-launch rows.

**Context:** `scripts/verify-branding.mjs` line 76 asserts `NO_STOCK_IDENTITY` (`/Theia|Eclipse/i`
absence) in About textContent. The 06-04 mandated Eclipse attribution sentence
("This product (powerbrowser.org) includes Eclipse Theia, a trademark of Eclipse Foundation AISBL.")
violates that assertion by design. The gate was deliberately left untouched — changing it needs a
browser build to validate.

**Test:** At verify-work with a runnable browser: subtract the three channel notices (derived from the
manifest through the emitter — the same source preflight section 11b uses) from the About text before
asserting `NO_STOCK_IDENTITY`, and extend its fault plants to prove a non-notice `Theia`/`Eclipse`
string still goes red.

**Expected:** Mandated sentence green; bare stock-identity strings still red.
**Why human:** Tier-3 runtime gate; cannot be validated without launching the built browser.

---
*Sign off by recording date + result under each item. When all four are green, Phase 6 is closed in full.*
