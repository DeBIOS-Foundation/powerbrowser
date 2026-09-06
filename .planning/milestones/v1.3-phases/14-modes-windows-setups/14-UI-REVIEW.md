# Phase 14 — UI Review

**Audited:** 2026-09-06
**Baseline:** `.planning/phases/14-modes-windows-setups/14-UI-SPEC.md` (APPROVED, 2026-09-06; inherits 13-UI-SPEC)
**Screenshots:** not captured — no dev server on ports 3000/5173/8080; code-level audit only. All live-render checks are marked held-out, never passes.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Stored mode id leaks into setup row meta; save-failure flashes restore copy; one restore notice always overwrites the other |
| 2. Visuals | 2/4 | Dependent closed state is unclassed/unstyled DOM; setup current-marker not per row contract; placeholder + toggle rows solid |
| 3. Color | 3/4 | Accent reservation holds; current-setup marker has no accent expression; Delete destructive ink unimplemented (stock limit) |
| 4. Typography | 3/4 | Custom surfaces use only contracted 14/13px + one 600; setup rows + closed state delegate to stock/unstyled |
| 5. Spacing | 3/4 | Scale multiples hold; save-dialog frame geometry (12px/32px) not implemented on the QuickInput surface |
| 6. Experience Design | 2/4 | Save/restore/delete/fallback flows complete with gates; empty state is a transient flash; notice-overwrite bug; live checks held out |

**Overall: 15/24**

No BLOCKERs (nothing breaks task completion). Seven WARNINGs below. Held-out live checks (D2/D3/D5 in plan summaries, UI-SPEC backstop rows) are recorded as held-out, not passes.

---

## Top 3 Priority Fixes

1. **Setup row meta leaks the stored mode id** (`theia/extensions/modes/src/browser/setups-service.ts:572-579`) — `modeLabelFor()` falls back to `return custom?.name ?? modeId`, so a setup whose mode was deleted renders meta like `custom-my-layout · 1 window · 2 tabs`. The contract is explicit: "the stored id is never shown" (UI-SPEC Copywriting Contract, mode-fallback row) and no internal identifier may appear in user-facing text (CLAUDE.md). User impact: internal slug syntax exposed in the setups list. Fix: fall back to the shipped Browsing label (mirroring the restore path's Browsing fallback) or a plain-language literal such as `Unknown mode`, e.g. `return custom?.name ?? 'Browsing';` — never the raw id.
2. **Restore drops one contracted explanation when tabs are gone AND mode is unknown** (`setups-service.ts:419-424`) — gone-tabs notice and mode-fallback notice are flashed to the same status-bar element (`powerbrowser.setups.notice`) in sequence, so the second `flash()` overwrites the first and the user never sees one of the two contracted explanations. User impact: silent loss of a required restore explanation. Fix: combine into a single flash when both fire (one sentence covering dropped tabs + Browsing fallback), or sequence the second flash after the 4s timeout clears the first.
3. **Dependent closed state is unstyled author DOM** (`theia/extensions/modes/src/browser/dependent-windows.ts:146-172`) — `renderClosedState()` appends bare divs and a bare button (no classes, no layout, no type roles, no spacing, no `:focus-visible` rule) to the secondary document. Functionally correct (never a blank frame, idempotent marker, window-only close), but none of the contracted presentation applies: Body 14px/1.5, centred slot rhythm, or the focus idiom the contract requires on every Phase-14 control including "dependent-window close". User impact: the error state renders in UA/stock fallback styling. Fix: add `pb-modes-dependent-closed*` classes reusing the placeholder slot pattern (centred, max-width, 14px heading/body, stock button class + contracted focus outline), in `modes.css` below the user layer.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**Method:** verbatim grep of every contracted literal against `theia/extensions/modes/src` + `chrome-bar` sources; Table in UI-SPEC Copywriting Contract as oracle.

**Present verbatim (verified):** Organising heading/body/button (`organising-placeholder-widget.ts:39,42,46`); dependent closed trio (`dependent-windows.ts:49,52,55`); `Save Setup` / `Save as Mode` command labels (`setups-commands.ts:21-29`, `modes-commands.ts:22-25`); setup dialog title/placeholder, empty-name error, duplicate-name error, empty heading/body (`setups-service.ts:94-109`); restore-failure error (line 112, modulo TS `\'` escaping); mode-fallback + corrupt-mode notices (`setups-service.ts:129`, `mode-service.ts:420,436` — both match `"Power Browser couldn't load/restored … Browsing is shown instead."`); saved confirmations (`Mode "${name}" saved.` / `Setup "${name}" saved.`); Delete Setup title/body/buttons (`setups-service.ts:438-442` — `Delete Setup` / `Delete "{name}"? You can't undo this.` / `Delete` / `Cancel`); core-close has no dialog ✓ (`onStop` persists silently, `setups-service.ts:335-339`).

**WARNING-1 — stored id shown in user-facing meta.** `modeLabelFor()` (`setups-service.ts:572-579`) returns the raw `modeId` when it matches neither shipped nor custom ids. That string feeds `listRows()` meta (`setups-service.ts:481-488`) shown as the quick-pick row description. Violates "the stored id is never shown" + the no-internal-identifiers rule. See fix #1.

**WARNING-2 — internal identifier in a user-visible thrown error.** `openDependent()` (`setups-service.ts:470-479`) throws `new Error('powerbrowser.setups.open-dependent: this tab cannot open …')`. Thrown command errors surface in Theia error notifications — user-facing text carrying the internal command id as a prefix. Fix: throw (or better, flash + return, matching the mode/setups flash idiom) plain language with the real next step and no id prefix, e.g. `This tab can't open in a dependent window — choose a tab with hosted content (a terminal or an editor) and try again.` Keep the id in a `console.error` + diagnostics row, not the message.

**WARNING-3 — save failure flashes the restore-failure copy.** `saveCurrentAsSetup()` catch (`setups-service.ts:367-370`) flashes `SETUP_RESTORE_FAILURE` ("couldn't **restore** this setup … delete the setup and save a new one") when the **save** write fails — wrong operation named, and the prescribed next step is nonsense for a setup that was never saved. Fix: add a save-failure literal in the established voice (`Power Browser couldn't save this setup. Your windows and tabs are unchanged — try again.`) and flash that; the mode side already does this correctly (`mode-service.ts:278`).

**WARNING-4 — notice overwrite (also Pillar 6).** See fix #2. Additionally, `handleCorruptStore()` (`mode-service.ts:430-438`) falls back silently when no custom name is known — acceptable (the contracted notice requires a `{name}` interpolation), but log the silent path via `console.error` so the fallback is diagnosable; currently only the named path flashes.

**Observation (not a defect):** mode save prompt (`Save as Mode` / `Mode name`), mode empty/duplicate errors, mode save-failure copy, and `Restore Setup` / `Delete Setup` quick-pick placeholders are extra-contract (UI-SPEC tables only the setup shape; planner fixed the mode shape per RESEARCH OQ2). They mirror the contracted voice consistently — no action.

### Pillar 2: Visuals (2/4)

**Method:** component structure + hierarchy indicators in `modes.css`, `organising-placeholder-widget.ts`, `dependent-windows.ts`, `chrome-bar-widget.tsx` custom rows; no screenshots (held out).

**Passing:** placeholder slot is one centred static panel, max-width 480px, single stock button routing to Browsing via imported const (`organising-placeholder-widget.ts:29-52`) — matches the slot contract exactly, no canvas-shaped surface. Toggle custom rows append after shipped segments with `title` tooltips, single `.is-active` marker, internal horizontal scroll past the 320px cap without shifting bar layout (`chrome-bar-widget.tsx:434-450`, `modes.css:86-93`). Ellipsis holds via the inherited `pb-chrome-bar-segment` class (96px + `overflow:hidden;text-overflow:ellipsis`, `chrome-bar.css:198-203`). Icon-only buttons carry `aria-label`s (carried Phase-13 pattern, `chrome-bar-widget.tsx:373-421`). Strip is named in no descriptor ✓ (`mode-descriptors.ts` — RED binding honored).

**WARNING-5 — dependent closed state has no visual design.** See fix #3. It is also the only Phase-14 surface with zero hierarchy differentiation (heading/body/button are indistinguishable divs).

**WARNING-6 — current-setup marker does not meet the row contract on the chosen host.** The contract binds any host: current row carries "accent-ink check glyph (or 2px left rule) plus 600 on the row name". The quick-pick implementation (`setups-service.ts:698-719`) prefixes `$(check)` to the label — a monochrome stock codicon, not accent ink, with no 600 name. Stock quick-pick cannot express either half of the marker, so the host choice silently drops the selection-state encoding (muted ink alone must never carry selection per the Contrast section). Fix (pick one): (a) switch the setups list to a small view/widget host where the contracted marker + 600 can be expressed in `modes.css`; or (b) keep quick-pick and record a UI-SPEC exception noting the `$(check)` prefix + `current` ordering as the degraded marker, with 600/accent deferred to a future list host. (b) is the cheap honest path; silence is not.

**Held out (never passes):** focal-point declaration (UI-SPEC checker FLAG, non-blocking); zero/one/many dependent geometry + focus return; dependent open paint without blank flash; placeholder synchronous paint in a live shell; custom-row listing against a real `modes.json`. The summaries' D2/D3/D5 deferrals are the correct call — they stay open.

### Pillar 3: Color (3/4)

**Method:** token grep over `modes.css`; accent-use inventory vs the exhaustive 4-item reserved list; hardcoded-color scan.

**Passing:** every painted rule uses `var(--color-*, <locked-value>)` with fallbacks byte-equal to the locked sketch theme (`#1c1b22/#2b2a33/#3f3e4a/#fbfbfe/#00a6f5`) — the Phase-13 fallback idiom, not a fork. No `font-family` literal (gate-verified). Accent appears only in the contracted focus idiom (`modes.css:77-80,102-105`) and the inherited active-segment ink + 600 (`chrome-bar.css:225-228`, which custom rows reuse — the planner's single choice of marker, never both). No accent fill anywhere; placeholder Back control correctly left to the stock Theia button theme. No second hue. Muted ink never sole-carries selection on custom rows (600 + accent ink ride along).

**WARNING (minor) — Delete destructive ink unimplemented.** Contract: Delete Setup confirm's Delete button renders in destructive ink (`#ff848b`). Implementation uses stock `ConfirmDialog` with `ok: 'Delete'` (`setups-service.ts:437-442`); stock `ConfirmDialog` exposes no danger/destructive option (verified: no `danger`/`destructive` in `@theia/core` dialogs typings), and no `className` is passed. Colour-as-non-sole-carrier still holds (label + confirmation step), but the contracted ink is absent. Fix: pass a custom class to the dialog's ok control and add a `.pb-modes-delete-confirm` rule setting `color: var(--color-danger, #ff848b)` + contracted focus outline; if stock `ConfirmDialog` cannot take the class, record a UI-SPEC exception (label + step carry the semantics).

**Contributes to WARNING-6:** the `$(check)` current marker has no accent expression (see Pillar 2).

### Pillar 4: Typography (3/4)

**Method:** size/weight inventory in `modes.css` vs the 3-size/2-weight delegation table.

**Passing:** `modes.css` declares exactly `14px` (heading/body), `13px` (custom rows), and one `600` (placeholder heading at 14px — the contracted "never display type" ceiling). Line heights 1.5/1.4 match Body/Label roles. Zero `font-size`/`font-weight` literals outside the three contracted sizes. Shipped segments unchanged at 13px/400↔600. No literal typeface stack (mechanical gate green).

**WARNING (minor) — two surfaces carry no contracted type roles.** Setup list rows (contract: name 14px over meta 12px muted) render in stock quick-pick type — the 12px Caption role appears nowhere in `modes.css`, so the meta-line role is unverified against the contract on the chosen host. Dependent closed-state nodes (`dependent-windows.ts:157-167`) are unclassed, so heading/body/button inherit whatever the secondary document gives them rather than the contracted 14px roles. Fix with #3 (closed state) and WARNING-6's host decision (setup rows): either express the roles in CSS on a real host or record the stock-delegation exception in UI-SPEC. Note: the contract's Typography table references a "placeholder footnote" Caption use, but the Copywriting Contract defines no footnote — spec-side dangling reference, not an implementation fault; no footnote should be added.

### Pillar 5: Spacing (3/4)

**Method:** spacing-value inventory in `modes.css` vs the declared ramp (xs 4 / sm 8 / md-gap 12 / md 16 / lg 24 / xl 32, all multiples of 4).

**Passing:** slot `max-width: 480px` ✓; vertical rhythm `gap: 24px` + `padding: 24px` (lg) ✓; host padding `16px` (md) ✓; menu gap `4px` (xs) ✓; hairlines `1px var(--color-border)` ✓; `radius-sm 4px` ✓; `radius-full 9999px` untouched (carried exception); custom rows inherit the 32px segment hit area (xl) ✓. No arbitrary Tailwind-style values; `320px` menu cap and `304px`-style constants are multiples of 4 and planner's-choice caps (the contract fixes scroll behavior, not the cap value). Geometry clamp constants in TS are runtime OS pixels — the declared Spacing exception covers them.

**WARNING (minor) — save-dialog frame geometry not implemented on the chosen surface.** Contract Fixed geometry: "Save dialogs use the Theia stock dialog frame with content padding 12px; the name input is 32px tall." Both save surfaces are stock `QuickInput` single-field prompts (`mode-service.ts:254`, `setups-service.ts:343`), not the stock dialog frame — so the 12px/32px geometry has no expression anywhere. The quick-pick host is within the planner's call for lists, but the dialog-frame sentence is prescriptive about the save surface. Fix (pick one): (a) rebuild save as a stock `Dialog`/`ConfirmDialog`-family form expressing the 12px/32px geometry; or (b) amend the UI-SPEC geometry row to name QuickInput as the save surface with its stock geometry. No `p-/m-/gap-` violations exist beyond this host/contract mismatch.

### Pillar 6: Experience Design (2/4)

**Method:** state-coverage scan (loading/error/empty/disabled/destructive) + interaction-contract trace; live behavior held out.

**Passing:** no tab loading state on switch by construction (tabs never unmount; allowlist gate green); placeholder paints synchronously with no spinner/skeleton/failure state ✓; corrupt modes → Browsing + notice, never blank ✓; corrupt setups → empty state, never throw ✓; gone-tabs restore completes on geometry + mode with explanation ✓; restore failure leaves session untouched ✓; delete is the sole destructive action with contracted confirmation and no undo, clearing the marker without touching the screen ✓; core-close has no dialog with last-session auto-save + ready-ordered re-apply ✓; dependent focus returns to core on close and destroys nothing ✓; orphan/double-close idempotence via marker ✓; chip re-asserts the invariant on every perspective change ✓; blocked popups reuse the existing throw path with no new dialog ✓; no custom window animation ✓.

**WARNING-7 — zero-setups empty state is a 4-second status flash, not a rendered state.** `pickSetup()` (`setups-service.ts:698-703`) flashes `No saved setups — <body>` to the shared notice element and never opens the list. The probe row requires "Zero setups render the contracted 'No saved setups' copy" — a transient flash on an element shared with every other notice technically emits the copy but provides no persistent, re-readable empty state and is indistinguishable in weight from a confirmation. Fix: open the quick-pick with a single disabled item carrying the empty heading/body (stock `showQuickPick` supports non-pickable rows), or route the empty case through a small dialog surface; keep the flash as well if desired.

**WARNING-4 (recap) — notice overwrite loses a contracted explanation.** See fix #2.

**Held out (never passes):** headed tab-count oracle across switches; save-dialog flow; corrupt-file fallback flash; custom-row listing; placeholder paint; dependent extraction paint, verbatim geometry, close-matrix focus return; multi-dependent overlap/off-screen behavior; activation backstop ("restoring a setup applies geometry + placement + mode" — static halves green, live half reserved full-suite). The gate architecture (static quick halves + `--live` citing the GREEN probe record) is the honest contracted posture — it stays open until a headed session.

---

## Files Audited

- `theia/extensions/modes/src/browser/modes.css` (118 lines — slot, custom rows, focus, reduced motion)
- `theia/extensions/modes/src/browser/organising-placeholder-widget.ts` (contracted slot + Back control)
- `theia/extensions/modes/src/browser/mode-descriptors.ts` (shipped literals, RED-bounded shell map, slot seam)
- `theia/extensions/modes/src/browser/mode-service.ts` (customs, save path, fallback, switch path)
- `theia/extensions/modes/src/browser/modes-commands.ts` (2 command ids + labels)
- `theia/extensions/modes/src/browser/setups-service.ts` (snapshot/restore/delete/applicator, list surface)
- `theia/extensions/modes/src/browser/setups-commands.ts` (4 command ids + labels)
- `theia/extensions/modes/src/browser/dependent-windows.ts` (membership pin, closed state, focus return)
- `theia/extensions/modes/src/browser/modes-frontend-module.ts` (static binds)
- `theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx` (toggle bridge + custom rows, delta vs 14-01)
- `theia/extensions/chrome-bar/src/browser/chrome-bar.css` (segment/marker/focus geometry — read-only reference, Phase-13 owned)
- `14-UI-SPEC.md`, `14-01/02/03-PLAN.md`, `14-01/02/03-SUMMARY.md`, `14-PATTERNS.md`, `14-CONTEXT.md`

Registry audit skipped: no `components.json`; UI-SPEC declares `Tool: none` with no third-party registries, and all three plan summaries confirm zero new packages (pinned in-tree specs only).

---

## Remediation Order

1. `modeLabelFor` fallback (WARNING-1) — one-line, copy-contract violation.
2. Restore double-flash combine/sequence (WARNING-4) — small, error-path correctness.
3. Dependent closed-state classes + CSS (fix #3, WARNING-5) — half-day, new `pb-modes-dependent-closed*` rules.
4. Save-failure literal (WARNING-3) + thrown-error reword (WARNING-2) — one-line each, same commit as (1).
5. Empty-state surface (WARNING-7) + current-marker host decision (WARNING-6) + Delete ink (Pillar 3) + dialog-frame geometry (Pillar 5) — each is a host-or-exception decision; cheapest honest path is UI-SPEC exception amendments, dearest is a real list/dialog host. Batch as one 14-04 closeout task.
6. Headed session: run the held-out checks (placeholder paint, tab-count oracle, dependent paint/geometry/close-matrix, restore activation) and close D2/D3/D5.
