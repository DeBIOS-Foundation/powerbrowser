---
phase: 02-configuration-manifest-and-generator-core
plan: 02
subsystem: branding
tags: [branding, rebrand-surface, path-refactor, verification-gate, CFG-01]
status: complete

requires: []
provides:
  - "brand/ at the repo root — the assets half of CFG-01's rebrand surface"
  - "brand/mark.svg — the single-source SVG mark all ten PNG rasters derive from, at its permanent home"
affects:
  - scripts/verify-branding-preflight.mjs
  - theia/extensions/branding/src/browser/powerbrowser-mark.ts

tech-stack:
  added: []
  patterns:
    - "git mv for asset relocation, so history records a rename rather than a delete-plus-add"
    - "move the asset and every reference to it in one commit, so no gate is red between commits"

key-files:
  created:
    - brand/mark.svg
  modified:
    - scripts/verify-branding-preflight.mjs
    - theia/extensions/branding/src/browser/powerbrowser-mark.ts

decisions:
  - "The mark's rebrand-surface home is brand/mark.svg; the ten PNG rasters stay hand-placed under powerbrowser/branding/{dev,release}/ until Phase 3's icon pipeline (D-16)"
  - "verify-branding-preflight.mjs keeps deriving expected values from inventory/brand-tokens.json's hand-authored brand_display_expectations and reads nothing from configuration.toml — that independence is the only thing stopping the gate from being a tautology (T-02-05)"
  - "CFG-01 is NOT marked complete by this plan: it is claimed by all five of 02-01..02-05, and this plan delivers only the brand/ assets half"

metrics:
  duration: "~12m"
  completed: "2026-09-01"
  tasks: 2
  commits: 1

actuals:
  tokens: 5200
  tasks: 2
  commits: 1
---

# Phase 02 Plan 02: Move the mark to brand/ Summary

Relocated the source SVG mark to `brand/mark.svg` and carried all nine of its in-tree
references with it in a single commit, creating the `brand/` assets folder that is the second
half of CFG-01's promised rebrand surface — with both preflight gates asserting exactly what
they asserted before, about a file that now lives somewhere else.

## What Was Built

`brand/` now exists at the repo root and holds `mark.svg`, moved byte-unchanged from
`powerbrowser/branding/mark.svg` via `git mv` (recorded at 100% rename similarity, 0 content
changes). Its single functional reader, `scripts/verify-branding-preflight.mjs`, follows it at
all eight string sites across two structurally separate locations: the section-7 mark block
(the explanatory comment, the `readText` call, and the five failure strings) and the
`--self-test` fixture copy list at line 633 — the second site the plan flagged as the one that
gets missed.

The preflight's expectation source is provably untouched. The staged diff of that file is 16
changed lines, every one of them a mark-path change: no expectation-source line, no new
assertion, no removed assertion. `grep -c 'configuration.toml'` over the file returns 0.

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | Move the mark to brand/ and carry its reader with it | `cc1f8b7` | `brand/mark.svg` (renamed), `scripts/verify-branding-preflight.mjs`, `theia/extensions/branding/src/browser/powerbrowser-mark.ts` |
| 2 | Prove the whole quick registry survived the move | — (read-only verification, no file changes) | none |

Task 2 is verification-only by design — its `<files>` list marks both entries read-only — so it
produced no commit. Its result is recorded below.

## The Reader Search (Task 2)

The plan's flagged assumption was that "three in-repo readers, all in one file" had been derived
from a grep, and a grep can miss a path built by concatenation. Re-derived across the whole tree
rather than trusted:

| Search | Scope | Result |
| ------ | ----- | ------ |
| `git grep -n 'branding/mark' -- .` | whole tree, **nothing excluded** — build files, Nix expressions, patches, Theia sources, CI workflows | 0 matches outside `.planning/` (37 matches inside `.planning/`, all planning prose describing the move) |
| `git grep -l 'branding/mark' -- . ':!.planning' ':!scripts/verify-branding-preflight.mjs'` | the plan's exact criterion | **0** |
| `git grep -n 'mark\.svg' -- . ':!.planning'` | any bare filename reference, which catches a path assembled by concatenation such as `${dir}/mark.svg` | 9 sites, all updated (8 in the preflight, 1 comment in `powerbrowser-mark.ts`). The 6 remaining hits are `about-wordmark.svg` / `firefox-wordmark.svg` in the two `content/jar.mn` and two `aboutDialog.css` files — unrelated Mozilla assets this tree deliberately does not ship. |
| `git grep -c 'mark.svg' -- inventory/brand-tokens.json` | the inventory | **no match** — confirmed, and the file was not edited |

**The count is zero.** The reader claim is now verified rather than assumed, and the concatenation
escape hatch was closed by searching the bare filename rather than the directory-qualified path.

The mark is referenced by exactly two registry rows, `branding-preflight` and
`branding-preflight-self-test` (`scripts/verify-platform.sh:3505-3506`), both of which invoke the
same script.

## Verification

All run post-commit:

| Check | Result |
| ----- | ------ |
| `test -f brand/mark.svg` / `test ! -e powerbrowser/branding/mark.svg` | PASS |
| `git diff --cached --stat -M` shows rename, 0 content change | PASS — `{powerbrowser/branding => brand}/mark.svg (100%)` |
| `grep -c 'brand/mark.svg' scripts/verify-branding-preflight.mjs` | 8 (expected 8) |
| `grep -c 'powerbrowser/branding/mark.svg' scripts/verify-branding-preflight.mjs` | 0 |
| `grep -c 'configuration.toml' scripts/verify-branding-preflight.mjs` | 0 |
| `node scripts/verify-branding-preflight.mjs` | PASS |
| `node scripts/verify-branding-preflight.mjs --self-test` | PASS — 5 planted faults, each red and each naming its drift |
| `node scripts/scan-brand-residue.mjs` | PASS — no residual brand occurrence in 110 scanned files |
| `scripts/verify-platform.sh --quick` | **PASS — all 25 rows green, exit 0** |

The move and the edits were staged before the residue scan was trusted, per the standing rule
that the scan derives its file set from `git ls-files` and an unstaged path change is invisible
to it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale doc pointer to the moved mark in `powerbrowser-mark.ts`**

- **Found during:** Task 1, while enumerating reference sites before editing.
- **Issue:** The plan enumerated eight sites, all inside `scripts/verify-branding-preflight.mjs`,
  and its `<files>` list named three files. A ninth reference exists at
  `theia/extensions/branding/src/browser/powerbrowser-mark.ts:10`: a comment stating the inlined
  `POWERBROWSER_MARK_SVG` literal is byte-identical to the `<svg>` element in
  `` `powerbrowser/branding/mark.svg` ``. The move would have left that pointer aimed at a path
  that no longer exists — and, more concretely, it would have failed Task 2's own automated
  verify, which asserts `git grep -l 'branding/mark'` returns nothing outside the preflight
  script.
- **Why this was not a halt:** the plan's flagged assumption instructs the executor to halt and
  report if the *reader* count comes back higher than one. This site is not a reader — it opens
  no file and performs no comparison. The functional "exactly one reader" claim held exactly as
  research derived it. What was found was a stale comment, so the scope did not widen: the same
  path rename, applied one line further.
- **Fix:** updated the comment to `` `brand/mark.svg` ``. Comment-only, one line. It cannot
  affect the preflight's drift assertion, which extracts the mark via the
  `/POWERBROWSER_MARK_SVG = \`([\s\S]*?)\`;/` regex over the template literal and never reads
  comments — confirmed by `branding-preflight` passing after the edit.
- **Files modified:** `theia/extensions/branding/src/browser/powerbrowser-mark.ts`
- **Commit:** `cc1f8b7`

### Scope Decisions

**CFG-01 was deliberately not marked complete.** The plan frontmatter lists
`requirements: [CFG-01]`, and the standing workflow marks such requirements complete at plan
close. That was skipped here: `grep -l 'CFG-01'` shows the requirement is claimed by all five of
`02-01` through `02-05`, and this plan delivers only the `brand/` assets half of the "one config
file plus one assets folder" promise. `configuration.toml` — the other half — is not yet in the
tree. Checking the box now would put a half-delivered requirement in the traceability table as
done. It should be marked complete by whichever plan closes the last CFG-01 obligation.

## Threat Mitigations Applied

| Threat ID | Disposition | How it was met |
| --------- | ----------- | -------------- |
| T-02-05 (Tampering — expectation source) | mitigated | The permitted diff was the mark path and nothing else. The preflight still reads `brand_display_expectations` from `inventory/brand-tokens.json`; `grep -c 'configuration.toml'` returns 0; the 16-line staged diff was inspected line by line and carries only path changes. |
| T-02-07 (Tampering — `--self-test` fixture list) | mitigated | The second site at line 633 was updated in the same commit. `--self-test` passes, planting 5 faults and going red on each for the reason it planted — not for a missing fixture file. |
| T-02-08 (Repudiation — rename recorded as delete-plus-add) | accepted, and met anyway | `git mv` was used; `git show --stat -M` reports `{powerbrowser/branding => brand}/mark.svg (100%)`. |

## Notes for Future Phases

- **Phase 3's icon pipeline** regenerates the ten PNG rasters from `brand/mark.svg`, not from any
  PNG. The rasters remain hand-placed under `powerbrowser/branding/{dev,release}/` until then, so
  `brand/` currently holds exactly one file. This is intended, not an incomplete move.
- **The next path move is cheap.** The reproducible zero above is the reason: search the bare
  filename (`mark\.svg`), not the directory-qualified path, and the concatenation blind spot the
  flagged assumption worried about is closed.
- **`brand/` is not gitignored** — confirmed via `git check-ignore`. Unlike the planned
  `generated/`, its contents are committed.

## Known Stubs

None. No placeholder values, no unwired data sources, no skipped tests, no unrun `<verify>` block.

## Self-Check: PASSED

- `brand/mark.svg` — FOUND (contains `viewBox`)
- `powerbrowser/branding/mark.svg` — correctly GONE
- `scripts/verify-branding-preflight.mjs` — FOUND, links to `brand/mark.svg`
- Commit `cc1f8b7` — FOUND in `git log`
