---
phase: 21-panorama-spec-and-gui08-checks
reviewed: 2026-10-18T00:19:29Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - scripts/lib/ui-spec.mjs
  - scripts/verify-gui08-canvas-geometry.mjs
  - scripts/verify-gui08-panorama-copy.mjs
  - scripts/verify-gui08-loose-cards-live.mjs
  - scripts/verify-platform.sh
  - theia/extensions/modes/src/browser/organising-widget.ts
  - theia/extensions/modes/src/browser/modes.css
  - theia/extensions/modes/src/browser/group-model.ts
  - powerbrowser/shell/PowerBrowserAPI.sys.mjs
findings:
  critical: 0
  warning: 8
  info: 6
  total: 14
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-10-18T00:19:29Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This review is static only, at HEAD `12c5916`. It covers the Phase 21 diff (`cabb60e..HEAD`) in the
nine key files, measured against the CLAUDE.md user-facing copy rule and the CLAUDE.md
verification rules. For `verify-platform.sh` only the Phase 21 rows and comments were reviewed.
For `PowerBrowserAPI.sys.mjs` only the one changed comment line was reviewed. Nothing was run:
no `verify-platform.sh`, no self-tests, no live row, no build.

The tray removal (R2/R3) is clean. `autoBox` and `dropCardOntoCard` have no remaining callers,
and the model's `tray`→`loose` rename changes no behaviour. No finding is a blocker. The main
problems:

- The A3 zero-group change places loose cards without accounting for the "No tab groups" panel,
  so in a short Organising host the cards cover the panel's copy and its New Group button.
- The spec-derived gates have blind spots that let real drift pass green: a Typography size
  masked by `.pb-modes-*` rules, a `\u`-escaped revival of retired copy, consts outside the
  supported grammar, and user-facing strings at sinks the enumeration does not list.
- The live row has no control for its geometry probes, and it does not restore its stubs if a
  probe throws.

## Warnings

### WR-01: Zero-group loose cards overlap the "No tab groups" panel in a short host

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:494-499, 525-527` (with `modes.css:668-678`)
**Issue:** On zero groups, `renderCanvas()` now appends the in-flow `.pb-org-empty` panel and then
calls `renderLoose()` (9db6371). `renderLoose()` places the loose line at
`canvasHost.clientHeight - LOOSE_H - LOOSE_MARGIN`. It does not consider the panel. The panel
(margin 24, padding 24, heading, two 24px gaps, a two-line body, the New Group button) ends about
210px below the canvas top. Its width is up to 480px, centred. So when `clientHeight` is below
about 342px, the loose line starts inside the panel's vertical extent. The absolutely positioned
cards come later in the DOM and paint over the body copy and the New Group button. The `.pb-org-canvas`
floor is `Math.max(320, clientHeight - 4)` (line 479), but the line is computed from
`clientHeight`, not from the floor. In a short host the cards therefore sit in the middle of the
canvas, not at its bottom. `gui08-loose-cards-live` asserts no overlap only at the one headless
window size, so this can pass the gate and still ship. A short host is realistic, for example a
bottom panel open or a small window.
**Fix:** Keep the line below the panel. Measure the panel after appending it and clamp the line:
```ts
// renderCanvas, zero-group branch
const empty = this.buildEmpty(/* … */);
this.canvasRoot.append(empty);
this.renderLoose(empty.offsetTop + empty.offsetHeight + LOOSE_MARGIN);

// renderLoose(minTop = 0)
const line = Math.max(minTop, height - LOOSE_H - LOOSE_MARGIN);
```
Also add a live assertion at a short window size, for example a host about 300px tall, to the
loose-cards row.

### WR-02: The empty-canvas body still names a gesture that no longer exists (known, deferred)

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:496` (contract: `15-UI-SPEC.md:246`, gap recorded at `15-UI-SPEC.md:365` and `21-UI-SPEC.md:411`)
**Issue:** "There are no tab groups yet — choose New Group, or drag a tab onto the canvas to start
one." After c5812c9 and the drop handler at lines 1711-1720, a tab dropped on the canvas is
placed loose (`dropCardOnField`). Only a rubber band starts a group. The CLAUDE.md copy rule
requires the next step to be a real affordance on screen, and half of this one is false. A3 makes
it worse: zero groups now paints the loose cards next to this sentence, so a user who follows it
moves a card and gets no group. The gap is recorded and held for Chris's Phase 22 copy edit, so
this is not a new decision. It is listed here because it is a live violation of a binding rule
in shipped copy.
**Fix:** In Phase 22, after Chris approves the wording, change the spec row and the literal
together. For example: "There are no tab groups yet — choose New Group, or draw a box around
tabs on the canvas to start one." `gui08-panorama-copy` carries the spec change through.

### WR-03: Typography size check is unscoped, so `.pb-modes-*` rules mask a missing Panorama size

**File:** `scripts/verify-gui08-canvas-geometry.mjs:276-283` (compare `:286`, and `15-UI-SPEC.md:152`)
**Issue:** The spec says the font sizes *under `.pb-org-*`* are exactly 12, 13 and 14. The check
collects every `font-size: Npx` in all of `modes.css`, and that includes the 14-UI-SPEC rules
`.pb-modes-custom-row` (13px, line 54) and `.pb-modes-dependent-closed-*` (14px, lines 93 and 100).
This has two effects:
- The "declared nowhere" direction cannot go red for 13px or 14px while those mode rules exist.
  Every Panorama 13px rule could be deleted and the check would stay green. The self-test plant
  `spec Typography 13px deleted` exercises only the surplus direction.
- A legitimate 14-UI-SPEC change (say a 16px mode heading) fails the Panorama gate and names
  15-UI-SPEC.

The weight check at line 286 is scoped to `.pb-org-` selectors, so the two halves already disagree
about scope.
**Fix:** Collect sizes over the same rule set as the weights:
```js
for (const m of cssSrc.matchAll(/(?<=^|[{};])\s*([^{};@]+?)\s*\{([^{}]*)\}/g)) {
    if (!m[1].replace(/\s+/g, ' ').split(',').some(s => s.trim().includes('.pb-org-'))) continue;
    for (const s of m[2].matchAll(/font-size:\s*(\d+)px/g)) sizes.add(Number(s[1]));
}
```
Then add a plant that deletes every `.pb-org-*` 13px declaration and requires the "declared
nowhere" line to go red.

### WR-04: Retired-copy search misses a `\u`-escaped revival

**File:** `scripts/verify-gui08-panorama-copy.mjs:173-178` (compare `:66-68`, `:257`)
**Issue:** The derived side unescapes `\uXXXX` before it compares (`unescapeUnicode`). The
retired-copy negated search, however, runs `sources[rel].includes(needle)` on raw source text,
where the needle holds a literal U+2014. A revival written as
`'No ungrouped tabs — drag a tab here to ungroup it.'` in TS source is therefore invisible
to it. That revival is caught only if it also sits at an enumerated paint site in
`organising-widget.ts` or `organising-tree.ts`, where set equality reports it as surplus. In any
other modes-browser file, which is exactly the case WR-05b added the directory scan for, it
passes. The self-test plant at line 257 is itself a JS string literal, so the planted text holds
the real em dash and never exercises the escaped spelling.
**Fix:** Search both spellings, and add a plant for the escaped spelling in a non-enumerated file:
```js
const unescaped = Object.fromEntries(shippedRels.map(rel => [rel, unescapeUnicode(sources[rel] ?? '')]));
const at = shippedRels.find(rel => (sources[rel] ?? '').includes(needle) || unescaped[rel].includes(needle));
```
For the plant, use `file: DESCRIPTORS_REL, swap(null, "x.textContent = 'No ungrouped tabs \\u2014 drag a tab here to ungroup it.';")`.

### WR-05: Copy derivation enumerates sinks by hand, and real user-facing strings sit outside it

**File:** `scripts/verify-gui08-panorama-copy.mjs:83-114`; escape example at `theia/extensions/modes/src/browser/organising-widget.ts:850`
**Issue:** The header (lines 18-20) says a surplus string is "unreviewed copy, reported BY NAME".
That holds only for the sinks the regexes list. Those regexes cover single-quoted `textContent`,
`title`, `placeholder` and `.label`, single-quoted `aria-label`, template-literal `flash`, and the
ConfirmDialog window. Shipped copy outside that list today:
`grip.setAttribute('aria-valuetext', \`${group.w} by ${group.h} pixels\`)`. Screen readers
announce this string. It is not in the Copywriting Contract, and it carries box bounds, which the
contract's copy rule names as an internal. The list also misses a single-quoted `flash('…')`, any
template-literal `textContent` or `title`, and `alt`. This is a hand-kept list of sinks, which is
the failure mode of verification rule 2 one level up.
**Fix:**
- Derive the sinks rather than listing them. One way is to match every `setAttribute('aria-*', …)`
  plus `textContent|title|placeholder|alt|label =` with any quote style, and allow-list only the
  computed forms (`String(...)`, a bare identifier).
- Add `aria-valuetext` to the contract, or rephrase it, through Chris.
- Add a plant that puts a new `aria-description` string in the widget and requires it to show as
  surplus.

### WR-06: "Every top-level numeric const has a row" silently skips consts outside the parser's grammar

**File:** `scripts/lib/ui-spec.mjs:126-135` (`topLevelNumericConsts`), used at `:217-222`
**Issue:** The spec (15-UI-SPEC lines 106-107) and the canvas-geometry header promise that every
top-level numeric const in the widget, tiling and geometry files has a row. The detector accepts
only `^(?:export )?const NAME = <expr>;` with single spaces, no type annotation, and `<expr>` limited
to a number, a numeric array, or `Math.round(a * b)`. Each of these is skipped, with no row
required:
- `const LOOSE_GAP: number = 12;`
- `const PILE_STEP = STACK_OFFSET * 2;`
- `const X = 0x10;`
- `const Y = 1_000;`
- `const Z = [..] as const;`
- `const W=4;`

The skip is silent: no failure, no count. The `spec row deleted` plant uses the plain form only.
This is a false-green path in the completeness half of the gate.
**Fix:** Detect top-level SCREAMING_CASE consts broadly and fail on any whose expression cannot be
classified, instead of dropping it:
```js
for (const m of src.matchAll(/^(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*([^;\n]+);/gm)) {
    const expr = m[2].trim();
    if (/^['"`]/.test(expr) || /^\[\s*['"]/.test(expr)) continue;       // string / string list
    out.set(m[1], expr);                                               // resolveConst reports unsupported forms
}
```
Then add a plant `const PILE_STEP = STACK_OFFSET * 2;` that must go red as undeclared or
unsupported.

### WR-07: Live row's geometry probes have no control, and the probe controls are not restored on a throw

**File:** `scripts/verify-gui08-loose-cards-live.mjs:83-95, 106-109, 130-151, 165-182`
**Issue:** The three in-run controls cover only `renderLoose`, `moveCardFocus` and the tray probe.
The `overlaps`, `outside`, `looseDom === looseModel` and every one-group assertion have no planted
fault showing they can go red. `outside`/`overlaps` returning `[]` is an absence assertion over
rectangles this script computes (CLAUDE.md verification rule 1). The `flat` guard proves the
elements have area. It does not prove that the comparison can fail. The history (0256597 red,
then 81c5952) shows `outside` was red once, but the check itself does not encode that. Two more
gaps:
- The one-group state never checks that loose cards stay clear of the new `.pb-org-box`, though
  the `renderLoose` doc (line 512) promises that nothing overlaps them.
- In the controls block, a throw from `org.render()` while `renderLoose` or `moveCardFocus` is
  stubbed leaves the stub installed. That state carries into block (e), so a failure there would
  be reported against the wrong cause.

**Fix:**
- Add a control that shifts one loose card out of the host box (`card.style.top = '-500px'`) and
  requires `outside()` to report it. Add another that moves one card onto `.pb-org-empty` and
  requires `overlaps` to report it.
- In block (e), add a box-versus-loose overlap probe.
- Wrap each stub in `try { … } finally { delete org.renderLoose; delete org.moveCardFocus; org.render(); }`.

### WR-08: Held-out backstop text contradicts the A5 focus contract

**File:** `scripts/verify-gui08-canvas-geometry.mjs:74` (compare `theia/extensions/modes/src/browser/organising-widget.ts:536-553, 1875`, and `21-UI-SPEC.md:362-363`)
**Issue:** The backstop the gate prints as HELD-OUT says "every loose and expanded-stack card is
reachable by Tab plus arrows". The spec it is meant to back says "visible loose cards … hidden pile
cards skipped", and `moveCardFocus` filters `!candidate.hidden`. With more unplaced loose tabs than
`room - 1 + PILE_VISIBLE`, the extra tabs are `hidden` and cannot be reached by keyboard (or by
pointer) on the canvas. A live verifier who checks the printed statement will record either a false
red or a quietly narrowed pass.
**Fix:** Make the backstop say what the spec says ("every visible loose card and every
expanded-stack card …; hidden pile cards are reached through the tree view"), or close the gap by
making the pile count focusable so it opens the overflow.

## Info

### IN-01: Unused `fail()` helpers

**File:** `scripts/verify-gui08-canvas-geometry.mjs:79-81`, `scripts/verify-gui08-panorama-copy.mjs:52-54`
**Issue:** Neither script calls `fail()`.
**Fix:** Delete both.

### IN-02: `is-drop-target` is removed but never added (tray-era residue missed by R2)

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:1775-1776`
**Issue:** No code adds the class and no CSS styles it. It is left over from the card-onto-card
target outline that this phase deleted together with its comment (modes.css:497-498).
**Fix:** Drop `.is-drop-target` from the selector and from the `remove()` call.

### IN-03: `ui-spec.mjs` has no self-test of its own, and six exports have no outside caller

**File:** `scripts/lib/ui-spec.mjs:18, 35, 50, 114, 129, 156`
**Issue:** `specSection`, `tableRows`, `boldLiterals`, `ruleBodies`, `topLevelNumericConsts` and
`resolveConst` are exported but used only inside the module. A parse change is checked only
through whichever consumer plants happen to touch it. WR-06 is one path that neither consumer
covers.
**Fix:** Make the internal-only helpers module-private, or give the module a `--self-test`
covering the edge forms: CRLF headings, `|` inside a literal, an escaped const form.

### IN-04: The 320px canvas floor is hand-kept twice and is not compared

**File:** `theia/extensions/modes/src/browser/organising-widget.ts:479`, `theia/extensions/modes/src/browser/modes.css:233`
**Issue:** "Canvas minimum height" is a prose row, so a change to one copy of 320 leaves the
other unchanged, with no check to notice. WR-01 depends on the same value.
**Fix:** Name it (`const CANVAS_MIN_H = 320;`) so that it gets a const row, and add a CSS row
for `.pb-org-canvas` `min-height`.

### IN-05: Slot normalisation erases slot identity, and the dialog windows are fixed character spans

**File:** `scripts/lib/ui-spec.mjs:68-70`, `scripts/verify-gui08-panorama-copy.mjs:97, 105`
**Issue:** `Group "${count}" closed.` normalises to the same string as `Group "{name}" closed.`
The ConfirmDialog derivation reads only 800 characters after `new ConfirmDialog({` and 600
before it. Both failures are fail-closed, but the limits are undocumented magic numbers.
**Fix:** Use `braceBlock` for the dialog span. Optionally compare slot counts per literal.

### IN-06: Registry comment line overruns the wrap

**File:** `scripts/verify-platform.sh:3901`
**Issue:** One comment line is about 108 columns long, while the comments around it wrap at about 78.
**Fix:** Re-wrap the line.

---

_Reviewed: 2026-10-18T00:19:29Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
