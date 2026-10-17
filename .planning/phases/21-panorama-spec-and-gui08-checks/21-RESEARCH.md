# Phase 21: Panorama Spec and gui08 Checks - Research

**Researched:** 2026-10-17 (HEAD `6d7f010`; Phase 20 plans 20-01 and 20-02 have landed, 20-03..20-05 are still executing in this checkout)
**Domain:** Re-pinning an archived UI contract to shipped code, spec-derived static checks, dead-code removal in one Lumino widget, the R33 quick baseline
**Confidence:** HIGH for code facts and the current failure text (every cited line was re-read or re-run this session). MEDIUM for check designs and plant failure texts, which no run has produced yet (marked [ASSUMED]).

## Summary

The shipped Panorama (commit `7b7a1f7`, unchanged in geometry at HEAD) has no ungrouped tray. Ungrouped tabs are loose cards drawn on the canvas, groups tile their cards and then stack them behind an "Expand" control, and the expanded stack closes with "Done". The archived 15-UI-SPEC still describes a 144px tray, 160×90 cards and a "Ungrouped" label. Both gui08 checks fail on that difference today (5 failures, the 4 rows in `docs/non-gui/quick-baseline.txt`).

The main finding: **neither check reads 15-UI-SPEC.** Both compare the tree against a hand-kept `EXPECTED` block inside the script (`verify-gui08-canvas-geometry.mjs:52-72`, `verify-gui08-panorama-copy.mjs:57-96`). `readSources()` in each (`:353-364`, `:220-241`) never opens the spec. Rewriting the spec alone changes nothing in either check's output, and editing only the `EXPECTED` blocks would turn the checks green without meeting success criterion 2 ("derive their expectations from 15-UI-SPEC"). Both checks need to be rewritten to parse the spec, on the pattern `verify-gui09-setups-copy.mjs` already uses for 14-UI-SPEC. Two smaller defects also need fixing: the panorama-copy self-test plant 2 targets a string that no longer exists, so that self-test can never pass, and the geometry tray clause passes only by accident and goes red as soon as PAN-07 deletes `.pb-org-tray`.

PAN-07 is mostly deletion: 4 dead CSS rules, about a dozen stale comments, the unreachable `dropCardOntoCard()` and its only callee `GroupModel.autoBox()`, and one unused local. Two items are behaviour gaps, not cleanup. Loose cards are not drawn when there are zero groups (`renderCanvas` returns at `organising-widget.ts:502-508` before `renderLoose()`). Loose cards 2..N cannot be reached by keyboard, because `moveCardFocus` scopes to the dead `.pb-org-tray-cards` selector (`:1908`). 21-UI-SPEC (A3, A5) asks for both to be fixed in this phase. No existing check sees either, because every gui08 row is static and ng-007 asserts only the model.

**Primary recommendation:** Four plans in three waves. 21-01 re-pins the spec in a parseable form. Then two file-disjoint plans run **in parallel**: 21-02 makes panorama-copy derive from the spec, and 21-03 makes canvas-geometry derive from the spec and does the PAN-07 code work in the same commits. 21-04 adds one live DOM check, runs the live proof with Chris, and derives the empty baseline after Phase 20 has finished.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- The shipped Panorama redesign (commit `7b7a1f7`) is the source of truth. 15-UI-SPEC
  (in the v1.3 milestone archive) is rewritten to describe it: canvas geometry, loose
  ungrouped cards, and the "Expand" / "Done" copy. The code is not changed to match the
  old spec.
- `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` keep deriving their
  expectations from 15-UI-SPEC (CLAUDE.md verification rule 2). Each `--self-test` must go
  red on each planted fault on a green tree.
- The 4 gui08 rows in `docs/non-gui/quick-baseline.txt` go green, and the baseline file
  becomes empty, by derivation, not by hand-editing.
- Stale tray code, comments and CSS are removed (PAN-07), and the canvas still shows
  ungrouped tabs as loose cards.
- User-facing copy follows the CLAUDE.md copy rule. "Expand" and "Done" are reviewed
  copy entering the declared contract; any other new string needs the same review.
- Live checks use `PB_VERIFY_PORT` (default 3939); never touch port 3000. Rebuild the
  sidecar before a live check.
- Never fork or patch Theia core.

### Claude's Discretion
Everything else, guided by the ROADMAP success criteria, the sketch findings
(`Skill("sketch-findings-Power-Browser")`), and this phase's research.

### Deferred Ideas (OUT OF SCOPE)
None.

### Phase boundary (CONTEXT `<domain>`)
Execution starts after Phase 20 completes; planning runs alongside it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAN-01 | 15-UI-SPEC describes the shipped Panorama redesign (commit `7b7a1f7`); `verify-gui08-canvas-geometry` and `verify-gui08-panorama-copy` derive from it and pass; the commit gate is green and `quick-baseline.txt` is empty. | Current failures reproduced. The spec-vs-shipped table, the parse form, both check rewrites and their plants, and the baseline derivation are below. 21-UI-SPEC is the content source for the rewrite |
| PAN-07 | The stale tray code, comments and CSS are removed. | Full remnant inventory from `git grep` over tracked files, with the reachability of each. The two behaviour gaps (zero groups, keyboard) and a live DOM check are below |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Never fork or patch Theia core.** Every edit is in `@powerbrowser/modes`, `@powerbrowser/tab-uris` (one comment) and `scripts/`.
- **Never modify Gecko outside the patch stack.** One optional comment-only edit in `powerbrowser/shell/PowerBrowserAPI.sys.mjs:1954` (the boundary file itself; no new import).
- **Design for the bridge.** Not touched. `TabUriRegistry` is not edited.
- **Repo path without a space.** Unchanged.
- **Theia is the default GUI.** Not affected.
- **The residue scan reads `git ls-files`.** Stage any new script (the 21-04 live check) before trusting `scan-brand-residue`.
- **One driver, one registry.** A new check is one row pair in `scripts/verify-platform.sh`, never a sibling driver.
- **Verification rules:** never assert the absence of a log line over your own emitter; derive the expectation and compare, never hand-keep it; every new or rewritten check has a `--self-test` whose plants each go red naming the drift.
- **User-facing copy:** no internal identifier in painted text. Only "Expand" and "Done" enter the contract; any other new string needs Chris's review (21-CONTEXT).
- **Builds run in `nix develop .#theia`.** `yarn` does not work outside it; `node` does (host `v24.19.0` [VERIFIED: `node -v`]).
- **Memory notes in force:** `concurrent-sessions-on-main` (commit by explicit path, no `-a`/`--amend`/stash); `one-fix-at-a-time-confirmed` (superseded for v1.4: take recommended options, stop only for ledger approvals, live checks or a push); `live-gui-debug-loop` (static gates cannot see DOM geometry); `chrome-js-startup-cache` (only relevant if a chrome `.js` changes; none does).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design contract (geometry, copy, retired copy) | `.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md` | 21-UI-SPEC (content source) | The checks parse it, so it is the single expectation source (rule 2) |
| Copy gate | `scripts/verify-gui08-panorama-copy.mjs` (static, `--quick`) | — | Reads widget/tree/commands/model sources plus the spec |
| Geometry gate | `scripts/verify-gui08-canvas-geometry.mjs` (static, `--quick`) | — | Reads widget, tiling, geometry, model, CSS, API, catalogue plus the spec |
| Loose-card rendering, keyboard scope | Browser tier: `organising-widget.ts` (`renderCanvas`, `renderLoose`, `moveCardFocus`) | `modes.css` | DOM-only behaviour; the model (`GroupModel.listUngrouped`) is already correct |
| Ungrouped data | `group-model.ts` `ungrouped` / `listUngrouped()`; node RPC `listUngroupedTabs` (`tab-query-service.ts`) | — | Live API; only the local `tray` names and comments change |
| DOM proof of loose cards | New full-tier live row over `scripts/lib/ng-a-live.mjs` | ng-007 (model-level, unchanged) | Static rows cannot see DOM |
| Commit gate | `scripts/verify-platform.sh --quick` minus `docs/non-gui/quick-baseline.txt` (R33) | `docs/non-gui/decisions.md:39-45` | The baseline is derived from a run, never typed |

## Standard Stack

No packages are installed. Every check uses the Node standard library (`node:fs`, `node:path`, `node:url`), like its siblings.

| Tool | Version | Use | Evidence |
|------|---------|-----|----------|
| Node | v24.19.0 | All checks | [VERIFIED: `node -v`] |
| Python | 3.14.7 | `ledger-report.py`, `phase-gate.py` | [VERIFIED: `python3 --version`] |
| nix + `.#theia` | `/run/current-system/sw/bin/nix` | `tsc` build of `@powerbrowser/modes`, the sidecar `theia build` | [VERIFIED: `command -v nix`] |
| Built shell | `objdir/dist/bin/powerbrowser` present | ng-a-live rows | [VERIFIED: `ls`] |

## Package Legitimacy Audit

Not applicable: this phase installs no external package.

**Packages removed due to [SLOP]:** none. **Packages flagged [SUS]:** none.

## Current State (reproduced this session)

Both checks were run directly (they only call `readFileSync`/`readdirSync`):

```text
verify-gui08-canvas-geometry: FAIL -- 3 failure(s):
  theia/extensions/modes/src/browser/organising-widget.ts: canvas hook 'dataset.tray' underivable -- the data-canvas/data-g/data-u anchor drifted
  theia/extensions/modes/src/browser/modes.css: the 160px card width is gone -- the card contract drifted
  theia/extensions/modes/src/browser/modes.css: the 160x90 thumbnail box is gone
verify-gui08-panorama-copy: FAIL -- 2 failure(s):
  user-facing strings NOT in the declared contract (unreviewed copy): "Expand", "Done"
  declared contract strings are GONE (drifted or removed copy): "Ungrouped", "No ungrouped tabs — drag a tab here to ungroup it."
```

Both `--self-test` runs fail with "the unmodified tree is already red" [VERIFIED: run this session]. `docs/non-gui/quick-baseline.txt` is exactly these 4 lines, each ending in `\n` [VERIFIED: `od -c`]:

```
gui08-canvas-geometry
gui08-canvas-geometry-self-test
gui08-panorama-copy
gui08-panorama-copy-self-test
```

### What each check compares today (all hand-kept, none from the spec)

**panorama-copy** [VERIFIED: `scripts/verify-gui08-panorama-copy.mjs`, read in full]:
- `EXPECTED_COPY` (`:57-89`) holds 29 literals, including `'Ungrouped'`, `'No ungrouped tabs — drag a tab here to ungroup it.'`, the two close templates `'Close "${group.title}"? Its 1 tab will close too. You can\'t undo this.'` and `'Close "${group.title}"? Its ${count} tabs will close too. You can\'t undo this.'`, `'Group "${closed.name}" closed.'`, and the MECHANICAL entries `'Resize group'`, `'−'`, `'+'`, `'100%'`, `'×'`.
- `RETIRED_COPY` (`:92-96`): `'Organising arrives next'`, `'Back to Browsing'`, `'The freeform canvas for arranging tabs lands in the next update'`. It is a negated substring search over every modes `.ts` file plus the CSS and module (`:209-216`).
- `derivedCopy` (`:123-162`) collects literals at enumerated paint sites, and `checkStatic` set-compares them (`:194-200`).
- Self-test plant 2 (`:282-296`) replaces `caption.textContent = 'No ungrouped tabs…'`. That line no longer exists, so the plant reports "did not land" and the self-test can never pass, even on a green tree.

**canvas-geometry** [VERIFIED: `scripts/verify-gui08-canvas-geometry.mjs`, read in full]:
- Constants `:52-72`: `EXPECTED_ZOOM_MIN = 25`, `EXPECTED_ZOOM_MAX = 200`, `EXPECTED_ZOOM_RESET = 100`, `EXPECTED_BOX_MIN_W = 200`, `EXPECTED_BOX_MIN_H = 144`, `EXPECTED_TRAY_HEIGHT = 144`, `EXPECTED_CARD_WIDTH = 160`, `EXPECTED_THUMB_HEIGHT = 90`, `EXPECTED_CAPTURE_TARGET_WIDTH = 160`, `EXPECTED_CAPTURE_CAP = 102400`, plus the 5 command ids and the dialog/tooltip literals.
- The hook list `['dataset.canvas', 'dataset.tray', 'dataset.g', 'dataset.u']` (`:183`).
- The tray, card and thumbnail clauses (`:229-237`) are substring tests over the whole comment-stripped stylesheet, not scoped to a selector. The tray clause passes only by accident: `.pb-org-tray` is really `height: 132px` (`modes.css:538`), and `height: 144px` matches inside `min-height: 144px` (`:239`) and in `.pb-org-skeleton` (`:741`).
- Font sizes are hand-kept as 12/13/14 (`:313`), and 600 is allowed only on `is-active` selectors (`:318-327`).
- `BACKSTOPS` (`:78-84`) still lists card-onto-card auto-box, field auto-box and "dropping into the tray ungroups", all of which are removed behaviour.

### The precedent to copy

`scripts/verify-gui09-setups-copy.mjs` [VERIFIED: read `:75-135, 285-305, 415-430, 535-560`]:
- `SPEC_REL = '.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md'` (`:81`).
- `derivedSpecCopy` (`:293-305`) matches each table row with `/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/` and then collects `/\*\*"(.*?)"\*\*/g` from the second cell.
- `normaliseSlots` (`:133-135`) turns every `${…}` into `{name}`.
- An empty spec derivation fails as a broken instrument (`:425-427`).
- Self-test plant 2 deletes a spec row and requires red (`:545-549`).

The archived 15-UI-SPEC is a tracked file [VERIFIED: `git ls-files`]. Phase 20's `planning-paths` row (`scripts/verify-planning-paths.mjs`, `SCOPE = ['scripts/', '.github/']`) will therefore resolve a `SPEC_REL` literal pointing at it.

## Spec vs Shipped (the rewrite's content)

21-UI-SPEC.md (draft, status `draft`, checker sign-off pending) already holds the full content to carry into 15-UI-SPEC: the Canvas Geometry table, Typography, Color, the Copywriting Contract, the Interaction Contract and the UI Considerations rows. The values below were re-checked against the tree this session.

| Spec claim (old 15-UI-SPEC) | Old line | Shipped at HEAD | Evidence |
|---|---|---|---|
| Card 160px wide, thumbnail 160×90 | 90-91, 304, 349 | Loose card 160 × `Math.round(160 × 0.72)` = 115; base card 220 wide with a 124px preview (expanded panel only); tiled cards sized by `fitTiles` | `organising-widget.ts:74-75`; `organising-tiling.ts:18,21,24-25` (`TILE_GAP = 8`, `TILE_ASPECT = 0.72`, `TILE_MIN_W = 84`, `TILE_MIN_H = Math.round(TILE_MIN_W * TILE_ASPECT)`); `modes.css:441-442` (`.pb-org-card { width: 220px;`), `:457-460` (`.pb-org-card-thumb { … height: 124px;`) [VERIFIED] |
| Ungrouped tray 144px, always rendered, "Ungrouped" label | 15, 95, 281-288 | No tray element. Loose cards are positioned on the canvas on a line `LOOSE_MARGIN` (16) above the bottom; overflow piles with `PILE_VISIBLE = 4` and a count | `organising-widget.ts:528-576`, `:72,77` [VERIFIED] |
| "Dropping into the tray ungroups"; card-onto-card auto-box | 262-265 | A drop on a group joins it; a drop on bare canvas places the card loose (`dropCardOnField`); a rubber band draws a group | `organising-widget.ts:1731-1738` [VERIFIED] |
| Resize from the bottom-right only | 94, 247 | 8 grips, `BOX_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']`; only `se` is the visible 16×16 `pb-org-box-resize` | `organising-widget.ts:93`; `modes.css:426-431` [VERIFIED] |
| Cards scroll inside the box | 249-251 | Cards never scroll: they tile, then stack (`STACK_VISIBLE = 5`, `STACK_OFFSET = 4`) with "Expand", closed by "Done" | `organising-widget.ts:70,96,664-750` [VERIFIED] |
| Card titles 13px | 117 | Tiled and loose card titles are 12px | `modes.css:568-572` [VERIFIED] |
| Two weights only | 108-112 | `.pb-org-expand-heading { … font-weight: 500;` | `modes.css:381-383` [VERIFIED] |
| Accent is `--color-primary` only | 140, 154 | The expander uses `var(--color-accent, #8ad4ff)`, a token in the locked sketch theme | `modes.css:334`; `sources/themes/default.css` `--color-accent: #8ad4ff;` [VERIFIED] |
| Copy: tray label, empty-tray caption | 210-211 | Gone. "Expand" (`:696`) and "Done" (`:730`) were added | [VERIFIED] |
| Search placeholder / no-match copy | 222 | Not shipped (no `Search tabs` under `modes/src`) | [CITED: Report A grep] |
| Apostrophes | 206-207 | The errors use U+2019 (`couldn’t`, `EXPECTED_COPY:72-73`); the dialog uses a straight `can't` (`organising-widget.ts:385-386`). The old spec writes a straight `couldn't` | [VERIFIED] |

## Architecture Patterns

### System Architecture Diagram

```
 15-UI-SPEC.md (archived, rewritten in 21-01)
   ├─ ## Canvas Geometry table ──────────────┐
   ├─ ## Typography table (sizes, weights) ──┤
   ├─ ## Copywriting Contract rows **"…"** ──┼──┐
   └─ ### Retired copy rows **"…"** ─────────┼──┤
                                             │  │
 theia/extensions/modes/src/browser/*.ts ────┤  │      powerbrowser/shell/PowerBrowserAPI.sys.mjs
 modes.css (comments stripped, per selector) ┤  │      (capture width, cap)
                                             ▼  ▼
                 verify-gui08-canvas-geometry   verify-gui08-panorama-copy
                 spec rows ⇄ tree consts/CSS    spec literals ⇄ painted literals (set equality)
                 + negated tray selectors       + negated retired literals
                 + zero-group / focus-scope     + no-internals shape
                          │                               │
                          └──────► verify-platform.sh --quick ◄──────┘
                                         │ FAIL set
                                         ▼
                 R33 pipeline (decisions.md:43-45) ─► quick-baseline.txt (0 bytes)

 Live (full tier, 21-04): built shell ─► ng-a-live ─► Organising ─► DOM:
   .pb-org-card.is-loose present (with and without groups), no .pb-org-tray,
   ArrowRight on loose card 1 focuses loose card 2
```

### Recommended plan split (3 waves; wave 2 runs two plans in parallel)

Parallelism is limited by two facts. First, 15-UI-SPEC is one file that both checks parse. Second, `use_worktrees: false`, so parallel plans share one checkout and must touch disjoint files and commit by explicit path. Writing the spec first unblocks two plans with disjoint file sets.

| Plan | Wave | Requirement | Files (exclusive to the plan) | Chris |
|------|------|-------------|-------------------------------|-------|
| **21-01** Re-pin 15-UI-SPEC | 1 | PAN-01 | `.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md` only | — |
| **21-02** panorama-copy derives from the spec | 2 (parallel) | PAN-01 | `scripts/verify-gui08-panorama-copy.mjs` only | — |
| **21-03** canvas-geometry derives from the spec, plus PAN-07 | 2 (parallel) | PAN-01, PAN-07 | `scripts/verify-gui08-canvas-geometry.mjs`, `theia/extensions/modes/src/browser/{modes.css, organising-widget.ts, group-model.ts}`, `theia/extensions/tab-uris/src/node/tab-query-service.ts` (comment), optional `powerbrowser/shell/PowerBrowserAPI.sys.mjs:1954` (comment) | — |
| **21-04** Live proof, gate, baseline | 3 | PAN-01, PAN-07 | new `scripts/verify-gui08-loose-cards-live.mjs`, 1 registry row in `scripts/verify-platform.sh` (full tier) plus the stale comment at the gui08 block, `docs/non-gui/quick-baseline.txt`, `docs/non-gui/decisions.md:39` | **blocking** (live run) |

Why this order:
- **21-01 first.** Both rewritten checks parse it. Before 21-02/21-03 land, neither check reads it, so committing the spec changes no check's output.
- **21-02 ‖ 21-03 are safe in parallel.** Their file sets are disjoint. 21-03's widget edits change no painted literal: R3 deletes only a `console.error` string, which is not a paint site, and R4/A5 add no copy. 21-02's self-test plants target `label: 'New Group'`, `expander.textContent = 'Expand';` and appended lines, none of which 21-03 touches. During the wave, each plan verifies by running its own check script directly (read-only, under 1 s). Neither runs `--quick`. The orchestrator runs `--quick` once after both land.
- **The tray CSS removal and the geometry check rewrite land in one commit (21-03).** If the CSS goes first, the geometry check gains a fourth failure. If the check goes first, its new negated tray assertion is red.
- **21-04 last, after Phase 20 has completed.** The R33 derivation takes the whole `--quick` FAIL set, which would include any Phase 20 row still red. A concurrent `--quick` is also exactly the PLAT-04 condition. The live check needs a committed tree (`assertCleanTree`, `scripts/lib/ng-a-live.mjs:57-65`) and a rebuilt sidecar.
- **Optional extra parallelism:** 21-01 touches only a planning doc and none of Phase 20's files, so it could run during Phase 20. CONTEXT says execution starts after Phase 20 completes, so this research does not recommend it unless Chris relaxes that.

---

### 21-01: the 15-UI-SPEC rewrite (form rules)

Content comes from 21-UI-SPEC. The form must be parseable by heading and row, like 14-UI-SPEC:

1. **Keep the file path and the `##` headings** (`Spacing Scale`, `Typography`, `Color`, `Copywriting Contract`, `Interaction Contract`, `UI Considerations`, `Provenance`). Add a `## Canvas Geometry` section, replacing the "Fixed geometry" paragraph (old `:90-96`). Add a Provenance line saying the contract was re-pinned in Phase 21 to `7b7a1f7` at HEAD.
2. **Geometry table, machine rows.** The check parses only rows whose Key cell is one or more SCREAMING_CASE identifiers (joined by ` × `), and CSS rows whose Key cell is a `` `selector` property `` pair. Numbers are read from the Value cell **before the first `(`**, so prose in parentheses is ignored (`3 (resolves to 100%)` → `[3]`). Rows that are neither form are prose and are not compared. Recommended machine rows:
   - **Consts:** `ZOOM_STEPS`, `DEFAULT_ZOOM_INDEX`, `GROUP_BOX_MIN_W × GROUP_BOX_MIN_H`, `GROUP_DRAW_MIN`, `CARD_DRAG_THRESHOLD`, `PUSH_GAP`, `TILE_GAP`, `TILE_ASPECT`, `TILE_MIN_W × TILE_MIN_H`, `LOOSE_W × LOOSE_H`, `LOOSE_MARGIN`, `PILE_VISIBLE`, `STACK_VISIBLE`, `STACK_OFFSET`, `targetWidth`, `TAB_THUMBNAIL_CAPTURE_MAX_CHARS`.
   - **CSS:** `` `.pb-org-card` width `` 220, `` `.pb-org-card-thumb` height `` 124, `` `.pb-org-box` min-width `` 200, `` `.pb-org-box` min-height `` 144, `` `.pb-org-box-resize` width `` 16, `` `.pb-org-box-resize` height `` 16.

   This splits 21-UI-SPEC's two-value CSS rows ("Base card", "Resize handle") into one row per property. 21-UI-SPEC A1 allows a simpler parse form. Values verified at HEAD are listed in "Spec vs Shipped" and below.
3. **Copywriting Contract:**
   - Write **one** contract table of `| Element | Copy |` rows with every literal bolded as `**"…"**`.
   - Write a separate `### Retired copy` table. Its bolded literals are the negated search.
   - Do not carry over 21-UI-SPEC's "Entering / Leaving / Unchanged" split. That is change-log framing for this phase; the archived contract states only the current state.
4. **Exact characters:**
   - Write the em dash U+2014, `couldn’t` with U+2019, the straight `can't` in the dialog, `−` U+2212 and `×` U+00D7, exactly as painted.
   - Write slots as `{name}` and `{N}`.
   - Write the two close bodies as two separate literals (singular and plural).
5. **Retired table contents:** `**"No ungrouped tabs — drag a tab here to ungroup it."**` plus the three placeholder strings from `RETIRED_COPY`. The bare word "Ungrouped" goes in **plain text, not bold**: a bolded `Ungrouped` would make the negated search hit `listUngrouped` in `group-model.ts:246` and go red for ever (Pitfall 2).
6. **Mechanical glyphs get a contract row** ("Mechanical labels and glyphs": `**"Resize group"**`, `**"−"**`, `**"+"**`, `**"100%"**`, `**"×"**`), plus `**"Organising"**` (widget label). This leaves no hand-kept list in the copy check.
7. **Interaction Contract and UI Considerations:**
   - Replace "Ungrouped tray" with "Loose cards".
   - Replace the auto-box drop matrix with the shipped gestures (draw a band to create a group, drop on a group to join, drop on the field to go loose).
   - Replace the corner-only resize with 8 grips, and the scroll rule with tile then stack.
   - Fix the Typography caption row and the contrast sentence that names "Ungrouped".
   - Replace rows E4 and E2 overflow (old `:346, 353-356`).
   - These are prose, but they must not contradict the parsed rows.

### 21-02: panorama-copy derives from the spec

- Add `SPEC_REL = '.planning/milestones/v1.3-phases/15-panorama-organising/15-UI-SPEC.md'` and read it in `readSources()`.
- Replace `EXPECTED_COPY` with a parse of the `## Copywriting Contract` section. Collect the bolded literals of every table row up to the next `## `, excluding rows under `### Retired copy`. Use the gui09 regexes.
- Replace `RETIRED_COPY` with the bolded literals of the `### Retired copy` table.
- Normalise slots on both sides to one token: code `\$\{[^}]*\}` → `{}`, spec `\{[^}]+\}` → `{}`. This makes `${group.title}` / `${closed.name}` / `${count}` and `{name}` / `{N}` compare equal. Do **not** normalise apostrophes (Pitfall 3).
- Add separate broken-instrument failures for an empty contract derivation and an empty retired derivation (gui09 `:425-427` precedent).
- The self-test plants, each red naming the drift:
  1. `label: 'New Group'` → `'New group'` (existing).
  2. **Retargeted:** delete `expander.textContent = 'Expand';` (`organising-widget.ts:696`) → red naming "Expand" as GONE.
  3. Appended `hint.textContent = 'Organising arrives next';` (existing).
  4. The `mode-descriptors.ts` revival (existing).
  5. **Spec side:** delete the Done row from the spec → red naming "Done" as unreviewed.
  6. **Spec side:** reword `**"Retry"**` in the spec → red with both a surplus and a missing name.
  7. **Spec side:** strip the `## Copywriting Contract` heading → red as ZERO derivation.
  8. **Retired revival:** append `caption.textContent = 'No ungrouped tabs — drag a tab here to ungroup it.';` to the widget → red naming the retired literal.

  Without a spec-side plant there is no evidence that the check reads the spec.
- Update the header (`:4-24`) and the `PASS` line.
- The registry rows stay as they are (`gui08-panorama-copy`, `gui08-panorama-copy-self-test`; at `verify-platform.sh:3915-3916` on `6d7f010`, and moving while Phase 20 edits the file).

### 21-03: canvas-geometry derives from the spec, plus PAN-07

**Check rewrite** (`scripts/verify-gui08-canvas-geometry.mjs`):
- Read `SPEC_REL`, and add `organising-tiling.ts` and `organising-geometry.ts` to `readSources()`.
- **Const rows:** for each machine row, find `(?:export )?const NAME = <number|[list]>` in the readable sources and compare it with the spec numbers.
  - `LOOSE_H` and `TILE_MIN_H` are `Math.round(A * B)` [VERIFIED: `organising-widget.ts:75`, `organising-tiling.ts:25`]. Evaluate exactly that one form from the already-derived consts. Any other form reports "underivable".
  - `targetWidth: 160` (`PowerBrowserAPI.sys.mjs`, existing needle) and `TAB_THUMBNAIL_CAPTURE_MAX_CHARS = 102400` keep their existing needles, but take their numbers from the spec rows.
- **CSS rows:** add `ruleBody(css, selector)`, which returns the body of the rule whose selector list is exactly that selector, and compare the property inside it. This removes the "min-height satisfies height" accident.
- **Zoom:** min, max and the reset (`ZOOM_STEPS[DEFAULT_ZOOM_INDEX]`) are taken from the spec rows instead of constants.
- **Hooks:** drop `'dataset.tray'` from `:183`.
- **Negated tray assertion:** red if any `.pb-org-tray` selector exists in the comment-stripped CSS, or if `dataset.tray` or `pb-org-tray` appears in the widget. This puts PAN-07 into the gate. It is a source-text search over the code under test, not a log-line absence.
- **Typography:** derive the allowed font sizes (`14px`, `13px`, `12px`) and weights (`400`, `600`) from the spec Typography table instead of `:313`. Add a weight-set check, which goes red on today's `font-weight: 500` until R5 lands, giving the change a failing direction. Keep the "600 only on `is-active`" rule.
- **R4/A5 source-shape assertions:**
  - The zero-groups branch of `renderCanvas` reaches `renderLoose()`.
  - `moveCardFocus`'s scope covers group cards, `.pb-org-expand-cards` and loose cards.

  Both are red at HEAD.
- **Kept in the script as declared contract**, with that stated in the header: `EXPECTED_COMMAND_IDS`, the one labelled command, and the "close tooltip in both canvas and tree" count check. See Open Question 1.
- **BACKSTOPS** (`:78-84`): replace the three removed-behaviour entries with draw-a-group, join or place, and keyboard reach, as in 21-UI-SPEC "UI Considerations".
- Update the header `:4-21` and the `PASS` line.
- **Self-test plants**, each red naming the drift:
  1. `dataset.canvas` (existing).
  2. `ZOOM_STEPS` 200 → 250 (existing).
  3. `label: 'New Group'` (existing).
  4. **Spec value:** `LOOSE_W × LOOSE_H` 160 → 170 → red naming `LOOSE_W`.
  5. **Source value:** `TILE_GAP = 8` → 10 in `organising-tiling.ts` → red naming `TILE_GAP`.
  6. **Spec row deleted:** the `TILE_GAP` row → red as an undeclared/underivable row, never a pass.
  7. **Scoping:** move `height: 124px` from `.pb-org-card-thumb` into a new `.pb-org-x` rule → red.
  8. **Tray revival:** append `.pb-org-tray { height: 144px; }` → red.
  9. **Weight:** add `font-weight: 500` to a `.pb-org-*` rule → red.
  10. **Zero groups:** remove the `renderLoose()` call from the zero-group branch → red.
  11. **Focus scope:** restore `'.pb-org-box-cards, .pb-org-tray-cards'` → red.

**PAN-07 code edits** (behaviour-neutral unless named):

| File | Edit | Evidence |
|------|------|----------|
| `modes.css` | Delete `.pb-org-tray` (536-543), `.pb-org-tray-label` (545-547), `.pb-org-tray-cards` (554-557), `.pb-org-tray-empty` (608-612) and the tray comment block (526-535). Move the "Positioned, not flowed" comment (549-553) onto `.pb-org-card.is-loose`. Remove the duplicated band-target comment (598). Fix the prose at 25 and 126, and the "auto-box target carries the reserved accent outline" comment at 494-495 | [VERIFIED: `modes.css:520-615`, `:486-500`] |
| `modes.css` | **R5:** `.pb-org-expand-heading` `font-weight: 500` → `400` (`:383`) | 21-UI-SPEC A4 [VERIFIED: line] |
| `organising-widget.ts` | Header comment `:8-9`, `:13`, `:18-23` (tray, auto-box matrix, HTML5 DnD and accent outline are all stale: line 872 says "No `draggable`"). Comments at `:453` and `:1728-1729`. Unused `const targetCard` (`:1713`, its only occurrence). Delete `dropCardOntoCard()` (`:1812-1841` with its JSDoc; zero callers) | [VERIFIED: `git grep dropCardOntoCard` → definition only; no `extends OrganisingWidget`] |
| `organising-widget.ts` | **R4:** in `renderCanvas`, call `this.renderLoose()` in the zero-group branch after the empty panel (`:502-508`) | 21-UI-SPEC A3 |
| `organising-widget.ts` | **A5:** `moveCardFocus` (`:1903-1922`). The scope is `card.closest('.pb-org-box-cards, .pb-org-expand-cards')`, or `this.canvasRoot` for an `is-loose` card. Candidates are `.pb-org-card` excluding `[hidden]` (for the canvas, the direct `.pb-org-card.is-loose` children). Rewrite the doc comment | [VERIFIED: `.pb-org-expand-cards` at `:733`; hidden pile/stack cards at `:561`, `:679`] |
| `group-model.ts` | Delete `autoBox()` (`:486-536`). Its only caller is `dropCardOntoCard`, and it writes only `createGroup` plus the membership writes, so no write kind becomes unused. Delete the orphan JSDoc `:539-543`. Rename the locals `trayRows`/`tray` to `looseRows`/`loose`, and fix the comments at `:255`, `:321`, `:540`, `:823-824` | [VERIFIED: `git grep autoBox` → model and widget only; `autobox:` persist key at `:530` only] |
| `group-model.ts` | **Keep** `ungrouped`, `listUngrouped()` and the RPC name `listUngroupedTabs` | Used by `organising-widget.ts:529`, `verify-gui08-view-parity`, ng-007, ng-012, ng-014 [VERIFIED: `git grep`] |
| `tab-query-service.ts` | Comment `:263-267` ("tray listing", "always-rendered Ungrouped tray") | [VERIFIED] |
| `PowerBrowserAPI.sys.mjs` | Optional comment `:1954` ("match the tray"). Comment only, so no `-purgecaches` is needed | [VERIFIED] |

**Do not edit:**
- `scripts/verify-ng-012-*.mjs`, `scripts/verify-ng-014-*.mjs`. They use `tray:` as a result key. These are ledger check files, likely hash-locked (Pitfall 5).
- `docs/non-gui/plans/*`, `docs/non-gui/questions-wave-*.md`. They are historical records.
- The sketch `sources/002-*`. It is a design record.

**TypeScript proof per task:** `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build'`. It writes only the git-ignored `lib/`. `tsconfig` has no `noUnusedLocals` [VERIFIED: `theia/extensions/modes/tsconfig.json`], so a leftover unused local does not fail the build. Review by reading.

### 21-04: live proof, gate, baseline

1. **New live row** `scripts/verify-gui08-loose-cards-live.mjs`, built on `runCheck`/`withShellQuit`/`newProfile` from `scripts/lib/ng-a-live.mjs`, in the same shape as ng-007. It is registered as one full-tier row next to ng-007/ng-008 (`verify-platform.sh:4802-4803` on `6d7f010`; re-read the line first). The scenario:
   - Open 3 terminal tabs with **no group**, then `A.organising()`. Assert `.pb-org-empty` and 3 `.pb-org-canvas .pb-org-card.is-loose` are present (R4).
   - Assert `document.querySelector('[class*="pb-org-tray"]') === null`.
   - Focus the first loose card, dispatch an `ArrowRight` `keydown`, and assert `document.activeElement` is a different `.is-loose` card (A5).
   - Create a group with `A.model().createGroup(A.actor(), …)` and re-assert the loose cards (with-group state).
2. **Do not extend ng-007** (Report B's suggestion). NG-007 is a `done` ledger row, and its check file is very likely in `check_locks`, so an edit would make `phase-gate.py` print "test file changed" and need Chris's `lock-checks` (Pitfall 5).
3. **Failing direction for the live row.** The current bundle `theia/applications/browser/lib/frontend/bundle.js` (built 2026-10-17 13:40) contains `pb-org-expander` once and `pb-org-tray-cards` once [VERIFIED: `grep -c`]. It is therefore the pre-fix redesign. In the live checkpoint:
   - Run the new row against that bundle **before** rebuilding. Expect it to go red on the zero-group and keyboard assertions [ASSUMED until run].
   - Then rebuild and re-run green.
   - Quote both outputs in the SUMMARY.

   ng-a-live rows have no `--self-test` (ng-007, ng-008); this red/green pair is the substitute, and the SUMMARY must say so.
4. **Rebuild the sidecar** (the binary loads `@POWERBROWSER_DEV_TREE@/theia/applications/browser/lib/backend/main.js`, `powerbrowser/shell/powerbrowser-sidecar.js:19` [VERIFIED]):
   `nix develop .#theia --command bash -c 'cd theia && yarn --cwd extensions/modes build && yarn --cwd applications/browser theia build --app-target=browser --mode development'` (the app half is `docs/BUILD.md:419` [VERIFIED]). No chrome JS changes, so no `-purgecaches`.
5. **Rows to run with `PB_VERIFY_PORT=3939`:**
   - `--only` for `gui08-canvas-geometry`, `gui08-canvas-geometry-self-test`, `gui08-panorama-copy`, `gui08-panorama-copy-self-test`, `gui08-view-parity`, `gui08-close-exactness`;
   - `ng-007-shell-tabs-keep-group-across-restart`, `ng-008-panorama-card-reopens-through-opener`;
   - the new live row;
   - then `--quick`.
6. **Baseline.** Run `--quick` once, alone, after Phase 20 has finished, into `.planning/phases/21-panorama-spec-and-gui08-checks/logs/quick-21-04.log`. Derive the baseline with the R33 pipeline (`decisions.md:43-45` [VERIFIED]), using plain `sort`, into `docs/non-gui/quick-baseline.txt`. The 17-04 method is at `.planning/phases/17-opencode-removal/17-04-PLAN.md:107` [VERIFIED].
   - The result must be 0 bytes. If any label is derived, stop and report it: it is a real red, not something to absorb into the baseline.
   - **Keep the file; do not delete it.** Every wave gate pipes into `comm -13 docs/non-gui/quick-baseline.txt -`. An empty file makes that print every FAIL, which is the intended strict gate.
7. **Docs.** `decisions.md:39` says the baseline lists "the gui08 rows Phase 21 owns". Change it to say the baseline is empty at its Phase 21 refresh. Change nothing else in the wave record. Also fix the registry comment "zoom/min/tray/card consts" (`verify-platform.sh:3885` on `6d7f010`).

### Anti-Patterns to Avoid
- **Editing only `EXPECTED_COPY` and the constants.** The checks go green but still do not derive from the spec, so criterion 2 and the locked decision are not met.
- **A bolded `Ungrouped` in the retired table.** The search goes permanently red on `listUngrouped`.
- **Typing an empty baseline** (`: > file`). The locked decision requires derivation, and the derivation is the evidence.
- **Point-in-phase literals.** Neither check may reference `.planning/phases/21-…`. That path moves at the v1.4 closeout, and `planning-paths` will go red.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spec table parse | A new markdown parser | gui09's row regex plus `**"…"**` extraction (`verify-gui09-setups-copy.mjs:293-305`) | Already proven on 14-UI-SPEC; one idiom across the gui gates |
| Live shell harness | A new launcher | `scripts/lib/ng-a-live.mjs` (`runCheck`, `withShellQuit`, `newProfile`, `A.organising`) | Handles profile, quit budget, ports and the clean-tree guard |
| Baseline refresh | Hand edit | The R33 pipeline at `decisions.md:43-45` | Same `sort` builds and reads the file |
| Constant evaluation | `eval` of TS source | Literal regex plus exactly one `Math.round(A * B)` form | `eval` would run code; anything else is reported as underivable |

## Runtime State Inventory

The phase deletes CSS classes and dead methods. It renames no persisted key.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `tabs.sqlite` loose positions (`x`, `y`) and group rows. Not renamed; read through the unchanged `listUngroupedTabs` | None |
| Live service config | None. No external service carries Panorama class names | None, verified by `git grep pb-org-tray` (only `modes.css` and the widget selector) |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `theia/extensions/modes/lib/` and `theia/applications/browser/lib/frontend/bundle.js` still carry the old selector until rebuilt | Rebuild before the live run (21-04 step 4) |

## Common Pitfalls

### Pitfall 1: green checks that still do not read the spec
**What goes wrong:** the spec is rewritten and the `EXPECTED` blocks are edited; everything passes.
**How to avoid:** spec-side plants (21-02 plants 5-7, 21-03 plants 4 and 6). If deleting a spec row does not go red, the check is not reading the spec.

### Pitfall 2: "Ungrouped" substring
`listUngrouped` (`group-model.ts:246`) and `listUngroupedTabs` (`:282`) contain "Ungrouped". Keep the bare word out of the bolded retired literals. If "Ungrouped" returns as painted copy, set equality reports it as a surplus string.

### Pitfall 3: apostrophes and dashes
The code paints `couldn’t` (U+2019) in the error bars and a straight `can't` in the dialog. The em dashes are U+2014, and the zoom-out glyph is U+2212, not a hyphen. A normalising compare would hide a real copy change. Write the exact characters in the spec, and unescape `\uXXXX` in the code (the existing `unescapeUnicode`).

### Pitfall 4: the tray clause passes by accident
`height: 144px` is a substring of `min-height: 144px`. Every CSS assertion in the rewrite must be scoped to a rule body (plant 7 proves it).

### Pitfall 5: locked ledger check files
Phase 20 research (A7) records that `check_locks` names `scripts/verify-ng-0NN-*.mjs` files. The lock list was not read here, because the ledger may be read only through `ledger-report.py`, and that does not print locks. Editing ng-007, ng-012 or ng-014 would therefore likely print `test file changed` from `phase-gate.py` and need Chris's `lock-checks`. Put the live assertions in a new file instead. Run `python3 scripts/phase-gate.py --root .` after each plan; it must print nothing.

### Pitfall 6: concurrent runs with Phase 20 or between the wave 2 plans
`--quick` writes logs and runs the generator rows. Inside wave 2, run only `node scripts/verify-gui08-*.mjs` (read-only). Run `--quick` once per wave, from the orchestrator, after Phase 20 is complete.

### Pitfall 7: the live run needs a committed tree and a rebuilt bundle
`assertCleanTree` refuses tracked changes unless `PB_NG_ALLOW_DIRTY=1` (`ng-a-live.mjs:57-65` [VERIFIED]). Commit, then rebuild, then run. A stale bundle makes a red run look like a code defect.

### Pitfall 8: the zero-group empty panel and loose cards may overlap
Nothing measured shows where `buildEmpty`'s panel sits relative to the loose line (`line = height - LOOSE_H - LOOSE_MARGIN`). A screenshot in the live checkpoint is the only proof (memory: `screenshot-pb-on-kde-wayland`) [ASSUMED: no overlap].

### Pitfall 9: unstaged new script
The new live check is invisible to `scan-brand-residue` until `git add` (CLAUDE.md).

### Pitfall 10: R33 after the baseline is empty
After 21-04 the subtraction prints every red row. Phase 22+ plans that relied on the gui08 rows being subtracted will see them only if they regress, which is the intended behaviour.

## Code Examples

### Spec copy derivation (shape of gui09, scoped to the 15-UI-SPEC sections)
```javascript
// Source: scripts/verify-gui09-setups-copy.mjs:293-305 (adapted)
function specSection(src, heading) {
    const at = src.indexOf(`\n## ${heading}\n`);
    if (at < 0) return '';
    const next = src.indexOf('\n## ', at + 1);
    return src.slice(at, next < 0 ? undefined : next);
}
function boldedLiterals(section) {
    const out = [];
    for (const line of section.split('\n')) {
        const row = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
        if (!row) continue;
        for (const m of row[2].matchAll(/\*\*"(.*?)"\*\*/g)) out.push(m[1]);
    }
    return out;
}
// Contract = Copywriting Contract section minus its "### Retired copy" part.
const slot = s => s.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[A-Za-z]+\}/g, '{}');
```

### Rule-scoped CSS lookup
```javascript
/** Body of the rule whose selector is exactly `selector` (comments already stripped). */
function ruleBody(css, selector) {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`).exec(css);
    return m ? m[1] : null;
}
```

### Registry row (shape of the neighbours at `verify-platform.sh:4802-4803`)
```bash
      "gui08-loose-cards-live|node $REPO_ROOT/scripts/verify-gui08-loose-cards-live.mjs"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ungrouped tray (144px strip) | Loose cards on the canvas | `7b7a1f7` | The spec and both checks are out of date |
| Cards scroll inside a box | Tile, then stack with Expand/Done | `7b7a1f7` | New copy and geometry rows |
| Card-onto-card auto-box | Draw a band; a field drop goes loose | `7b7a1f7` | `dropCardOntoCard` and `autoBox` are dead |
| Hand-kept `EXPECTED` blocks | Spec-derived (this phase) | Phase 21 | Spec edits become the review surface |

## Chris Touchpoints

| # | When | What | Blocking |
|---|------|------|----------|
| C1 | 21-04, after the code commits | The live run on his display: the new row before and after the rebuild, ng-007, ng-008, and a screenshot of the zero-group canvas (Pitfall 8). Memory `one-fix-at-a-time-confirmed` says to stop for live checks | **yes** |
| C2 | End-of-phase verify (`human_verify_mode: end-of-phase`) | Ratify or overturn the 21-UI-SPEC assumptions: A2 (`--color-accent` on Expand; muted active-group border), A3/R4 (loose cards with zero groups), A4/R5 (heading 500 → 400), A5 (keyboard scopes). If A3 is overturned, criterion 4 is recorded as holding only with at least one group | no |
| C3 | Optional | `.claude/skills/sketch-findings-Power-Browser/references/modes-tabs-and-organising.md:22,42,48` still prescribes the ungrouped tray, and this skill auto-loads during UI work. Approve a 3-line update or leave it as the design history | no |
| C4 | Note only | No ledger approval is expected: PAN-01/PAN-07 are GSD requirements, and no ledger check file is edited | no |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The ng-0NN check files (ng-007, ng-012, ng-014) are in `check_locks` | Pitfall 5, 21-04 | If not locked, extending ng-007 would also work; the new file is still correct |
| A2 | The live row goes red on the current bundle for the zero-group and keyboard assertions | 21-04 step 3 | If green, the bundle is not pre-fix. Rebuild from `HEAD~` of the fix to get the red |
| A3 | The empty panel and the zero-group loose line do not overlap | Pitfall 8 | Needs a CSS adjustment (layout only, no copy) |
| A4 | Plant failure texts match the names given | 21-02, 21-03 plants | Adjust the regex after the first run. Low |
| A5 | Synthetic `keydown` on a focused card reaches the card's listener in the shell | 21-04 | Use `A.run` with real focus. The listener is a plain `addEventListener('keydown')` (`organising-widget.ts:923`); the only node-level `keydown` listener (`:183-188`) handles Escape alone |

## Open Questions

1. **Command ids and the labelled command in canvas-geometry.**
   - What we know: they have no 15-UI-SPEC home. 21-UI-SPEC names them only in its No-Regression table.
   - Recommendation: keep `EXPECTED_COMMAND_IDS` and `label: 'New Group'` as the check's declared registry contract, and say so in the header. The geometry, typography and copy derive from the spec, which is what PAN-01 names. The alternative is a parsed `## Command Registry` table in 15-UI-SPEC, at about 15 lines of extra parse.
2. **A3 (zero-group loose cards) versus Phase 22 decision 1.** Report B would defer it, because PAN-02 decision 1 may require every tab to be in a group. 21-UI-SPEC and criterion 4 ("the canvas still shows ungrouped tabs as loose cards") support fixing it now. Recommendation: fix it (one call), and let C2 overturn it. Phase 22 revisits the state either way.
3. **Expanded-stack keyboard.** A5 covers `.pb-org-expand-cards`. The live row asserts only loose cards. The static assertion covers the selector. Add a live expanded-stack assertion only if the planner wants it; it needs a box small enough to stack.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | all checks | ✓ | v24.19.0 | — |
| nix `.#theia` | `tsc`, sidecar rebuild | ✓ | `/run/current-system/sw/bin/nix` | — |
| python3 | `phase-gate.py`, `ledger-report.py` | ✓ | 3.14.7 | — |
| Built shell | live rows | ✓ | `objdir/dist/bin/powerbrowser` | — |
| Display / KDE session | live rows, screenshot | Chris's session | — | Blocking checkpoint C1 |
| Port 3000 | — | Chris's container | — | Never used; `PB_VERIFY_PORT=3939` |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `scripts/verify-platform.sh` registry (node checks); live rows over `scripts/lib/ng-a-live.mjs` |
| Config file | the `CHECKS` array in `scripts/verify-platform.sh` (gui08 block near `:3880-3916`, full-tier ng rows near `:4802`, on `6d7f010`) |
| Quick run command | `node scripts/verify-gui08-canvas-geometry.mjs [--self-test]`, `node scripts/verify-gui08-panorama-copy.mjs [--self-test]` (read-only, under 1 s) |
| Commit gate | `scripts/verify-platform.sh --quick` with the R33 subtraction |
| Full suite command | `scripts/verify-platform.sh` (carries the live rows) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Failing direction | File Exists? |
|--------|----------|-----------|-------------------|-------------------|-------------|
| PAN-01 | Spec copy equals painted copy | static | `node scripts/verify-gui08-panorama-copy.mjs` | Surplus or missing literal; ZERO derivation from the spec | ✅ rewrite |
| PAN-01 | Copy plants | static | `node scripts/verify-gui08-panorama-copy.mjs --self-test` | Any of plants 1-8 not red naming its drift | ✅ rewrite |
| PAN-01 | Spec geometry equals tree | static | `node scripts/verify-gui08-canvas-geometry.mjs` | Any row value ≠ the source const or rule-scoped CSS; underivable row | ✅ rewrite |
| PAN-01 | Geometry plants | static | `node scripts/verify-gui08-canvas-geometry.mjs --self-test` | Any of plants 1-11 not red | ✅ rewrite |
| PAN-01 | Commit gate green, baseline empty | gate | R33 pipeline over `--quick`; `test ! -s docs/non-gui/quick-baseline.txt` | Any FAIL row; non-empty file | ✅ |
| PAN-07 | No tray selector, hook or class | static | canvas-geometry negated assertion; `git grep -n -i 'pb-org-tray\|dataset\.tray' -- theia` prints nothing | Any match | ✅ rewrite |
| PAN-07 | Dead code gone | static | `git grep -n 'dropCardOntoCard\|autoBox' -- theia scripts` prints nothing | Any match | — (command) |
| PAN-07 | Loose cards render (zero and some groups), keyboard reach | live | `PB_VERIFY_PORT=3939 scripts/verify-platform.sh --only gui08-loose-cards-live` | No `.is-loose` card; a `pb-org-tray*` element; focus does not move | ❌ W0 |
| PAN-07 | Model unchanged | live | `--only ng-007-shell-tabs-keep-group-across-restart`, `--only ng-008-panorama-card-reopens-through-opener` | Position or membership lost | ✅ |
| both | No regression | static | `--only gui08-view-parity`, `--only gui08-close-exactness`, `--only gui08-persistence-roundtrip` (each with `-self-test`) | Any red | ✅ |
| both | Ledger untouched | ledger | `python3 scripts/phase-gate.py --root .` prints nothing | Any line | ✅ |

### Sampling Rate
- **Per task commit:** the two `node scripts/verify-gui08-*.mjs` runs (and their `--self-test`) for the files touched. For TS edits, the `yarn --cwd extensions/modes build` in `.#theia`. `node scripts/scan-brand-residue.mjs` after staging.
- **Per wave:** one `--quick` with the R33 subtraction, then `python3 scripts/phase-gate.py --root .`. This is run once by the orchestrator, never by two plans at once.
- **Phase gate:** the 21-04 live checkpoint, the derived empty baseline, then the full `scripts/verify-platform.sh`.

### Wave 0 Gaps
- [ ] `scripts/verify-gui08-loose-cards-live.mjs` plus 1 full-tier row (21-04)
- [ ] Spec-reading rewrites of both gui08 checks with the new plants (21-02, 21-03). The files exist; the behaviour does not

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4/V6 | no | — |
| V5 Output encoding | yes, unchanged | Names render through `textContent`, never `innerHTML` (`organising-widget.ts` header). No new paint site |
| V7 Error messages | yes | The copy rule: no internal identifier in painted text; `internalsOf` in panorama-copy stays |

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| Internal identifier leaks into copy | Information disclosure | `internalsOf` shape check over the derived set (unchanged) |
| A check that cannot go red | Repudiation of the gate | Spec-side and source-side plants on a green baseline |

## Sources

### Primary (HIGH: read or run this session)
- `scripts/verify-gui08-panorama-copy.mjs` (full), `scripts/verify-gui08-canvas-geometry.mjs` (full), `scripts/verify-gui09-setups-copy.mjs:75-135, 285-305, 415-430, 535-560`, `scripts/verify-planning-paths.mjs:1-40`, `scripts/phase-gate.py:100-165`, `scripts/lib/ng-a-live.mjs:55-66` plus the export list, `scripts/verify-ng-007-*.mjs` (full).
- `theia/extensions/modes/src/browser/organising-widget.ts` (`:1-30, 64-99, 385-386, 448-580, 596-760, 864-935, 1705-1745, 1814-1840, 1900-1925`), `group-model.ts` (`:30-37, 246, 255-350, 373-395, 480-548, 823-824`), `organising-tiling.ts:15-30`, `organising-geometry.ts:26`, `modes.css` (`:25, 126, 228-239, 381-383, 426-462, 486-500, 520-615, 741`), `theia/extensions/modes/tsconfig.json`.
- The archived `15-UI-SPEC.md` (headings, `:85-130, 190-224`), `21-UI-SPEC.md` (full), `21-CONTEXT.md`, ROADMAP Phase 21, REQUIREMENTS PAN-01/PAN-07, `docs/non-gui/decisions.md:30-50, 85`, `17-04-PLAN.md:100-112`, `docs/BUILD.md:419`, the sketch-findings reference and `default.css`.
- Runs: both gui08 checks and their self-tests; `od -c` of the baseline; `git grep` sweeps (`tray`, `dropCardOntoCard`, `autoBox`, `Ungrouped`, `quick-baseline`, `15-UI-SPEC`); `git log 7b7a1f7~1..HEAD -- theia/extensions/modes/src`; `ledger-report.py`; a bundle `grep -c`.

### Secondary (MEDIUM)
- Report A and Report B (2026-10-17 research agents) for claims not re-run here: the scratchpad simulation of the gui09 parser over the old spec, the "Search tabs" absence, and `git diff 7b7a1f7 HEAD -- modes.css` being empty.

### Not used
- The codebase-memory graph. This agent had no loader for the deferred graph tools. Every caller claim rests on `git grep` over tracked files plus reading the call sites.

## Metadata

**Confidence breakdown:**
- Code facts and line numbers: HIGH (re-read at `6d7f010`). Registry line numbers will move while Phase 20 edits `verify-platform.sh`; re-read them before editing.
- Check designs: MEDIUM. They follow the gui09 pattern but have not been run.
- Live behaviour: MEDIUM-LOW until C1 (A2, A3, A5).

**Research date:** 2026-10-17
**Valid until:** Phase 22 starts (W4 edits the same copy contract).
