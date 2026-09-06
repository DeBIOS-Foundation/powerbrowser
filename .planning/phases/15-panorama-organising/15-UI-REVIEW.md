# Phase 15 — UI Review

**Audited:** 2026-09-06
**Baseline:** 15-UI-SPEC.md (approved design contract; inherits 13/14-UI-SPEC)
**Screenshots:** not captured — code-only audit (no dev server on ports 3000/5173/8080; no display available). All live-render checks are marked held-out, never passes.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All 27 contracted strings verbatim, but Close dialog renders "1 tab(s)" — singular/plural not exact |
| 2. Visuals | 3/4 | Hierarchy and labelled icon-buttons hold; resize grip is pointer-only with no tooltip |
| 3. Color | 3/4 | Accent disciplined to reserved uses, but Close Group confirm carries no destructive ink |
| 4. Typography | 4/4 | Exactly 3 sizes in contracted roles; 600 only in the three selection families |
| 5. Spacing | 4/4 | Ramp-only spacing; every fixed-geometry value exact; no arbitrary values |
| 6. Experience Design | 3/4 | Full state coverage statically; grip has no keyboard path; live backstops held-out |

**Overall: 20/24**

---

## Top 3 Priority Fixes

1. **Close Group confirm button carries no destructive ink** — user impact: the ONLY destructive action is visually indistinguishable from any benign stock confirm, weakening the "colour never sole carrier but always present" destructive idiom — concrete fix: add a dialog-scoped selector (e.g. `.pb-org-close-confirm .theia-dialog-button-primary { color: var(--color-danger, #ff848b); border-color: ... }`) applied via a class passed to the stock `ConfirmDialog`, or record an explicit UI-SPEC amendment deferring destructive ink with rationale (theia/extensions/modes/src/browser/organising-widget.ts:128-159, modes.css — zero `color-danger` references anywhere in Phase-15 sources).
2. **Resize grip is pointer-only (no focus, no keyboard resize)** — user impact: keyboard users cannot resize any group box, and the Focus contract ("every Phase-15 control shows a visible focus indicator") is breached for this control — concrete fix: give `.pb-org-box-resize` `tabIndex = 0`, `role="slider"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, arrow-key stepping (e.g. 8px, Shift 32px) driving the existing `persistResize` path, plus a `title="Resize group"` tooltip; add it to the `:focus-visible` selector list (organising-widget.ts:359-363, modes.css:307-320, 543-557).
3. **Close dialog count grammar ("Its 1 tab(s) will close too")** — user impact: singular group close reads with a plural-form wart in the highest-stakes dialog in the phase — concrete fix: in `closeGroupById`, branch the message (`count === 1 ? 'Its 1 tab will close too.' : ...`), update `EXPECTED_DIALOG_MSG` in scripts/verify-gui08-close-exactness.mjs to pin both forms, add a self-test plant for the singular drift (organising-widget.ts:138).

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**WARNING — singular/plural inexactness in the Close Group body.** UI-SPEC Copywriting Contract pins the body as `Close "{name}"? Its {N} tab(s) will close too. You can't undo this.` with an explicit `(singular/plural exact)` parenthetical (15-UI-SPEC.md:219). The implementation renders the literal `tab(s)` for every count (organising-widget.ts:138), so N=1 reads `Its 1 tab(s) will close too.` The close-exactness gate pins the same literal (`EXPECTED_DIALOG_MSG`, verify-gui08-close-exactness.mjs:52), so this is gate-verbatim but parenthetical-intent-unmet. Fix is Top Fix #3.

**Verified clean (evidence, not trust):**
- Toggle order and labels: `Canvas` then `Tree` (organising-widget.ts:944-950); `New Group` CTA verbatim in toolbar and both empty states (organising-widget.ts:488, 956).
- Zoom tooltips `Zoom in` / `Zoom out` / `Reset zoom` with matched `aria-label`s (organising-widget.ts:968-985); level readout is a text caption, never the sole carrier (organising-widget.ts:210, 972).
- `Group name` placeholder + `aria-label` on rename input (organising-widget.ts:503-504); `Untitled group` default (group-model.ts:31).
- Empty canvas heading/body verbatim; empty tree heading/body verbatim (organising-widget.ts:237-242, 257-262) — canvas body names the canvas-drop gesture, tree body does not, exactly per contract.
- `Empty group — drag tabs here.` in both canvas boxes and tree sections (organising-widget.ts:351, organising-tree.ts:70).
- `Ungrouped` tray label + `No ungrouped tabs — drag a tab here to ungroup it.` caption (organising-widget.ts:276, 284).
- Both error bars name "Power Browser", state the problem in plain language, and end with a real on-screen `Retry` affordance (organising-widget.ts:993-1004); `Retry`/`Cancel` single-word secondaries are the checker-recorded non-blocking FLAG, contracted literally.
- `Close group` tooltip on both canvas and tree close buttons (organising-widget.ts:326, organising-tree.ts:56); `Group "{name}" closed.` status-bar flash (organising-widget.ts:152).
- Placeholder copy fully absent from all shipped sources (`Back to Browsing`, `arrives next`, `freeform canvas` — zero matches in widget/tree/CSS/commands/module); search correctly ships nothing (no `Search tabs` surface, per the cheap-or-deferred rule).
- No internal identifier in any user-facing string (gate no-internals shape check green); `textContent` only, zero `innerHTML` in phase sources.
- Rename rules wired: Enter commits / Esc cancels / blur commits with settled-guard so Esc-then-blur is a no-op (organising-widget.ts:513-542); 60-char cap via `maxLength` + paste clamp (organising-widget.ts:502, 507-511); empty-revert and duplicates-allowed live model-side (pinned by the persistence gate).

Live-render copy checks held-out (never passes): long group names wrapping (not truncating) inside the stock `ConfirmDialog` body; ellipsis + `title`-tooltip behaviour on cards/rows/box titles at real widths.

### Pillar 2: Visuals (3/4)

**WARNING — resize grip has no visual affordance beyond a CSS gradient and no tooltip.** The 16×16 hit area renders a `linear-gradient` triangle at `opacity: 0.6` (modes.css:307-320) with an `aria-label` that points at nothing focusable and no `title` tooltip, so pointer users get no hover text and the grip's discoverability rests entirely on position. Add `title="Resize group"` at minimum; full fix is Top Fix #2.

**WARNING (minor, accepted) — tree rows skip the canvas keyboard-travel idiom.** Every tree row sets `tabIndex = 0` with no arrow-key handler (organising-tree.ts:85-104), while canvas cards use roving tabindex with arrow travel (organising-widget.ts:871-886). A 50-tab group puts 50 stops in the tab order. Recorded as REVIEW IN-03 and explicitly deferred to a dedicated a11y pass — no contract breach (the "same affordances" list is active marker, rename, close, empty hint), but it ships as a real keyboard-UX asymmetry.

**Verified clean:**
- Focal anchor: canvas field with the active-group box (accent border + 600 title) as the anchor; tree sections mirror the same marker — matches the checker-recorded planner treatment (non-blocking FLAG, no explicit focal-point declaration in UI-SPEC).
- Icon-only buttons all paired: `×` close buttons carry matched `title` + `aria-label` in both views; `+`/`−`/`100%` zoom steps carry matched `aria-label`s. No orphaned glyph buttons.
- Hierarchy through size/weight/color: 14px titles vs 13px rows/cards vs 12px mono URI captions; 600 reserved to selection; surface → surface-raised hover only on tree rows; thumbnails carry no accent treatment.
- Text-first card paint with `img.onerror → remove()` guarantees no broken-image glyph (organising-widget.ts:381-389); snapshot-absent cards render title + URI alone.

Held-out (never passes without a headed shell): painted focal hierarchy, hover-wash visibility, drag `opacity: 0.7` tracking feel, drop-target outline timing.

### Pillar 3: Color (3/4)

**WARNING — destructive token entirely unused; Close Group confirm is stock-styled.** UI-SPEC reserves `#ff848b` (`--color-danger`) for "Close Group confirmation only — confirm button + dialog warning marker" and requires the `Close Group` button "in destructive ink" (15-UI-SPEC.md:142, 219). Zero references to `color-danger`/`#ff848b` exist in modes.css, organising-widget.ts, or organising-tree.ts; the stock `ConfirmDialog` renders the confirm in the primary treatment (15-02 SUMMARY admits this: "no severity API exists and global CSS would bleed"). The copy + confirmation-step carriers hold, so colour-as-sole-carrier is not violated — but the contracted destructive-ink surface is unmet. Fix is Top Fix #1.

**Verified clean (9 accent sites, all inside reserved uses 5–7 + focus idiom):**
- Active toggle segment ink + 600, never fill (modes.css:155-158).
- Active-group border + title 600 in both views (modes.css:247-253, 424-448).
- Drag-target outlines: box, card, canvas (`outline`, contracted), tray edge (modes.css:255-257, 322-325, 352-354, 386-388).
- Focus idiom `outline: 2px solid var(--color-primary); outline-offset: 2px` on 12 selectors covering every focusable Phase-15 control except the (unfocusable) grip (modes.css:543-557).
- No accent fill anywhere; no second brand hue; every hex literal appears only as a `var(--token, #fallback)` fallback matching the locked sketch token, never as a bare value; `--color-success` correctly untouched.
- 60/30/10 painted-area split: **held-out** — cannot be measured without a headed render (dominant canvas/tree background, secondary boxes/tray/toolbar, accent as pinpoints reads correctly in code, but area proportion is a live-render check, never a pass here).

### Pillar 4: Typography (4/4)

**Finding (positive — the contract is fully met, verified by enumeration):** exactly three `font-size` values exist in the Phase-15 sheet — 12px (7 rules), 13px (6), 14px (8) — each in its contracted role: 14px/1.5 body (box titles, tree titles, empty heading/body, error text, rename input), 13px/1.4 label (card titles, tree row titles, toggle segments, zoom steps, close glyphs), 12px/1.5 caption in `--theia-code-font-family` mono for URI captions plus tray label/empty caption, tree count, zoom readout. `font-weight: 600` appears at modes.css:156 (active toggle), :252 (active box title), :447 (active tree title) — exactly the three selection families; the fourth occurrence (:94, dependent-closed heading) is a Phase-14-carried surface outside this phase's scope. Zero `font-size`/`font-weight` literals in any Phase-15 `.ts` file; zero `font-family` literals in `@powerbrowser/*` (delegation + system fallbacks only); long titles/URIs ellipsise with full text in `title` tooltips in all four text sites (canvas title/URI, tree row title/URI, box title, tree title).

### Pillar 5: Spacing (4/4)

**Finding (positive with one trivial observation):** every spacing value sits on the declared ramp — gaps 4/8px, paddings 12/16/24px and `8px 16px` / `12px 16px` / `4px 12px` compositions, `gap: 24px` empty-state rhythm, `gap: 16px` error-bar padding. Fixed geometry is exact against the prescriptive table: card 160px, thumbnail 160×90 `cover`, box minimum 200×144 (enforced live in `apply()` and floored in the model consts), tray 144px fixed, resize handle 16×16, toolbar hit areas 32px, tree rows 32px min-height, `radius-sm` 4px on all ten rounded surfaces, 1px `var(--color-border)` hairlines throughout. Box positions are user pixels with no snap/grid arithmetic. Zero arbitrary-value patterns in TS or CSS. Observation only: `.pb-org-zoom-readout` carries `min-width: 44px` (a width, not spacing; non-ramp but harmless and outside the spacing scale's jurisdiction).

### Pillar 6: Experience Design (3/4)

**WARNING — resize has no keyboard path at all.** Move has pointer-capture + Esc-cancel + debounced persist; resize mirrors it for pointer users — but with the grip unfocusable there is no keyboard-initiated resize, violating the spirit of "same affordances" geometry control for keyboard users. Folded into Top Fix #2.

**WARNING (minor, accepted limitation) — Close dialog tab count can paint stale.** Per REVIEW IN-06 (accepted, no code change): the model loads once at startup with no chrome→Theia invalidation, so tabs opened/closed in stock windows afterwards leave the dialog's `{count}` and dead cards drifting from the authoritative chrome rows until reload. No corruption follows (chrome is authoritative at close time), but the destructive dialog can name a wrong N. Filed as a 15-04/15-05 consideration; noted here so the acceptance sticks to the UX surface, not just the code review.

**Verified clean (state coverage, traced to code):**
- Loading: skeleton boxes (`aria-hidden`, surface fill, no shimmer/spinner) until first data; empty-vs-populated decided after load (organising-widget.ts:226-234); tree paints from the same model with no second loading surface, per the dismissal.
- Error: load-error bar and save-error bar with `Retry` replay-then-revert discipline (organising-widget.ts:215-219, 993-1059); `renderBars` logic traced correct in all four load/fail combinations.
- Empty: all four contracted states (canvas, tree, tray, zero-card box) always render their drop/copy targets; the tray never disappears.
- Destructive: header × opens the contracted confirmation; cancel returns before any mutation (organising-widget.ts:146-148); activity passes to the next box or none (model-side); closing the last box lands on the empty-canvas copy.
- Non-destructive by default: toggle flip is visibility-only with selection and New Group draft preserved; Esc cancels move/resize/card-drags with nothing persisted; zoom cluster is hidden (not disabled) in tree view so no dead control ever shows.
- Roving tabindex + arrow travel on canvas/tray cards; Enter dives via the stock opener without moving anything.

**Held-out backstops (never passes without a headed shell):** auto-box four-gesture matrix, canvas/tree order-and-membership parity after every mutation and flip, confirm-closes-exact-tabs / cancel-no-op / activity-never-on-removed-box, drag feel and ≤150ms drop/zoom timing, `prefers-reduced-motion` instant rendering. Static halves are gate-pinned (5 gui08 gates + self-tests green); the live halves correctly await 15-05 headed proof.

---

## Registry Safety

Not applicable — `components.json` absent (`Tool: none` by checker-ratified standing rationale); no new npm packages across the phase range (zero `package.json`/`yarn.lock` touches, per REVIEW hard-rule verification); canvas/tree/tray/cards/toolbar are hand-built Theia contributions on existing `@theia/*` pins. No third-party blocks installed, nothing to `view`/`diff`.

---

## Files Audited

- theia/extensions/modes/src/browser/organising-widget.ts (1120 lines — toolbar/toggle/zoom, canvas boxes/cards, tray, rename, gestures, drop matrix, error bars, focus)
- theia/extensions/modes/src/browser/organising-tree.ts (106 lines — sections, rows, identical confirmation wiring)
- theia/extensions/modes/src/browser/modes.css (575 lines — full Phase-15 surface: toolbar, boxes, cards, tray, tree, empty, rename, skeleton, focus, reduced-motion)
- theia/extensions/modes/src/browser/panorama-commands.ts (83 lines — command consts, `New Group` label verbatim, toggle/retry labelless)
- theia/extensions/modes/src/browser/group-model.ts (lines 1-120 read; consts `GROUP_TITLE_MAX_CHARS`, `GROUP_BOX_MIN_W/H`, `UNTITLED_GROUP_TITLE` — rename cap/default-title sources)
- .planning/phases/15-panorama-organising/15-UI-SPEC.md (design contract)
- .planning/phases/15-panorama-organising/15-01/02/03-SUMMARY.md + PLANs (what was built vs intended)
- .planning/phases/15-panorama-organising/REVIEW.md + REVIEW-FIX.md (code-review context; UX-relevant items IN-03/IN-06 re-surfaced above as UX findings, not duplicates)
- scripts/verify-gui08-close-exactness.mjs:52, scripts/verify-gui08-panorama-copy.mjs:72-79 (gate-pinned verbatim strings cross-checked against sources)
