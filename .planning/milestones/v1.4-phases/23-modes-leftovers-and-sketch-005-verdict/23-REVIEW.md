---
phase: 23-modes-leftovers-and-sketch-005-verdict
reviewed: 2026-10-19T04:53:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - theia/extensions/modes/src/browser/capped-name-input.ts
  - theia/extensions/modes/src/browser/mode-service.ts
  - theia/extensions/modes/src/browser/setups-service.ts
  - theia/extensions/modes/src/browser/mode-descriptors.ts
  - scripts/verify-name-cap-at-input.mjs
  - scripts/verify-name-cap-at-input-live.mjs
  - scripts/verify-panel-motion.mjs
  - scripts/verify-ng-035-custom-mode-layout.mjs
  - scripts/verify-ng-036-setup-dock-layout.mjs
  - scripts/verify-platform.sh
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-10-19T04:53:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Scope came from the 23-0x SUMMARY key-files. The source and script changes are in 23-02 (8b7f484, ea5301d, 58fa9cb) and 23-03 (c86f432). 23-01 changed only a comment in `mode-descriptors.ts`. 23-04 and 23-05 changed only `.planning` records. The 14-UI-SPEC rule text changed in ea5301d and c86f432 and was checked against the code. Only the `verify-platform.sh` rows those commits added were reviewed (lines 3835-3844, 3855-3859, 4955-4959). The review was static only: nothing was run, built, or tested live.

The shipped behaviour is correct for the two current callers. `inputCappedName` matches stock `input()` for `{ prompt, placeHolder }`. The commit-time `.trim().slice(0, MAX)` backstop is still in place. The rebind leaves `expandDuration` at the stock value, which is 0, so side panels switch instantly as the amended spec says. No critical issues were found.

The real defects are in the instruments. `modes-panel-motion` reads the stock `expandDuration` values and then throws them away, so a Theia re-pin that makes panels slide would still pass as kind=a. `modes-name-cap-at-input` compares only the first cap number on each spec line. The helper's signature also claims more than the helper does. Two 14-UI-SPEC sentences describe the paste cut differently from what the code does.

ng-035 and ng-036 are hash-locked. Every finding on them is marked **locked: needs Chris re-lock**.

## Warnings

### WR-01: modes-panel-motion reads the stock expandDuration and then ignores it, so a re-pin can slide panels while the check stays green

**File:** `scripts/verify-panel-motion.mjs:175-177, 204, 257-261`
**Issue:** The rebind at `theia/extensions/chrome-bar/src/browser/chrome-bar-frontend-module.ts:53-57` sets only `expandThreshold`. Its own comment says `expandDuration` "keep[s] its framework values". That is how stock behaves: `application-shell.js:209-217` spreads `DEFAULT_OPTIONS.<panel>` under the rebind. When a panel has no `expandDuration`, `deriveCode` sets `ms = 0` (line 204). `stockPanelKeys` parses the stock `expandDuration` into `keys[...]` (line 177), but `analyse` compares only the key names (lines 258-260) and never the values. Suppose a Theia re-pin changes stock `DEFAULT_OPTIONS.leftPanel.expandDuration` from 0 to, say, 150. Panels would then slide, and the check would still report `kind=a` and PASS. The upgrade path in CLAUDE.md rule 1 (re-pin a version) is the one this check does not cover. It also breaks the project rule "derive from the tree and compare": the stock half is derived and then dropped.
**Fix:** Default an absent duration to the stock value, and add a self-test plant for it:
```js
// deriveCode needs the stock map: deriveCode(tree, failures, stock)
let ms = stock[m[1]] ?? NaN;   // absent => inherited from DEFAULT_OPTIONS, per the rebind's own comment
let guarded = ms === 0;        // a non-zero inherited stock duration has no reduced-motion guard
if (Number.isNaN(ms)) failures.push(`${m[1]} has no expandDuration and stock declares none (broken instrument)`);
...
// self-test plant 9: tree.stock with "expandDuration: 0" -> "expandDuration: 150" on leftPanel, expect 'no kind' or 'guard'
```

### WR-02: inputCappedName accepts InputOptions but uses only prompt and placeHolder

**File:** `theia/extensions/modes/src/browser/capped-name-input.ts:2, 5, 9-10`
**Issue:** The parameter is typed `InputOptions`, and the header says "QuickInputController.input()'s shape plus the cut". The body forwards only `prompt` and `placeHolder`. It silently drops `title`, `value`, `valueSelection`, `password`, `ignoreFocusOut` and `validateInput`, all of which stock `input()` honours. The type checker would accept a later caller that passes `{ value: oldName }` (a rename) or `validateInput`, and that caller would get an empty, unvalidated field with no error. The `modes-name-cap-at-input` check requires every name prompt in the modes sources to go through this helper (verify-name-cap-at-input.mjs:167-175). The next prompt that needs one of the dropped options is therefore forced onto the helper, and it will break there without any warning.
**Fix:** Narrow the type to what the helper does, and correct the comment:
```ts
export function inputCappedName(quickInput: QuickInputService, options: Pick<InputOptions, 'prompt' | 'placeHolder'>, max: number): Promise<string | undefined> {
```
The other option is to forward `title`, `value` (cut to `max`), `valueSelection` and `ignoreFocusOut` as stock does.

### WR-03: modes-name-cap-at-input checks only the first cap number on each spec line

**File:** `scripts/verify-name-cap-at-input.mjs:111-116`
**Issue:** `/(\d+) characters/.exec(text)` reads one number per rule line. Each amended line states the cap twice. 14-UI-SPEC:314 says "capped at 60 characters while typing; pasted text is cut to its first 60 characters". 14-UI-SPEC:273 says "holds at most 60 characters ... cut to its first 60." (the second number has no "characters" after it). 14-UI-SPEC:358 says "holds at most 60 characters ... cut at the cap". If "first 60" is changed to "first 80" on line 273 or 314, the spec contradicts itself and the check stays green. The PASS line still says "the three 14-UI-SPEC rule lines are one cap". This is the hand-picked partial derivation that the project's "derive and compare" rule is meant to prevent.
**Fix:** Collect every cap number in each rule line, and add a self-test plant that changes only the second number:
```js
const nums = [...text.matchAll(/\b(?:at most|capped at|first)\s+(\d+)\b/g)].map(m => Number(m[1]));
if (!nums.length) failures.push(`${label} in ${SPEC_REL} names no cap`);
nums.forEach((n, k) => values.push([`${label} #${k + 1}`, n]));
// plant 10: SPEC 'cut to its first 60.' -> 'cut to its first 80.'  expect /caps disagree: .*custom-modes bullet #2 = 80/
```

### WR-04: 14-UI-SPEC says pasted text is cut, but the code cuts the field's combined value and drops existing text

**File:** `.planning/milestones/v1.3-phases/14-modes-windows-setups/14-UI-SPEC.md:273, 314` vs `theia/extensions/modes/src/browser/capped-name-input.ts:12-16`
**Issue:** The spec says "pasted text is cut to its first 60 [characters]". The code runs `value.slice(0, max)` on the whole field after the change. Example: the field holds 50 characters, the caret is at position 0, and the user pastes 20 characters. The result is the 20 pasted characters plus the first 40 original characters. The paste is kept, and the user's last 10 typed characters are deleted with no message (A4). 23-UI-SPEC A1 states the real rule correctly ("the first 60 characters of what the field would otherwise contain"). The binding contract, 14-UI-SPEC, does not, and the E2 row at :358 is vague about it. A reviewer reading 14-UI-SPEC would expect the typed text to survive. The caret jump to the end, recorded only as a `shortcut:` comment, is also missing from 14-UI-SPEC.
**Fix:** Replace the 14-UI-SPEC wording at :273 and :314 with A1's wording: "the field never holds more than 60 characters; after any typed or pasted change it keeps the first 60 characters of the result, and the caret moves to the end". The other option is to change the code so it cuts the inserted text rather than the tail. That option is a Chris decision under A1.

## Info

### IN-01: ng-035 and ng-036 report a broken answer path as an uncaught probe exception, not a named error (locked: needs Chris re-lock)

**File:** `scripts/verify-ng-035-custom-mode-layout.mjs:153-156`, `scripts/verify-ng-036-setup-dock-layout.mjs:115-118`
**Issue:** Three failure modes give poor diagnostics:
- The result of `await until(() => nameField().value === ..., 2000)` is discarded, so a timeout goes on to accept whatever the field holds.
- `nameField().value` inside the predicate throws a TypeError if the field closes.
- `get('MonacoQuickInputImplementation')` has no guard. The live row `verify-name-cap-at-input-live.mjs:65-76` guards the same call and falls back to keydown Enter.

Each of these turns into a raw exception or a misleading `saved: null`, not the `{ error: ... }` shape the scripts use everywhere else. The rows pass today. Only diagnostics are affected.
**Fix:** `if (!(await until(() => nameField()?.value === 'NG035 Saved', 2000))) return { error: 'the name field did not hold the answer' };`, and wrap the `get(...)` in the same try and fallback the live row uses. Both files are hash-locked, so this needs Chris's re-lock.

### IN-02: the quick-input field locator and accept path are copied into three scripts (two locked)

**File:** `scripts/verify-name-cap-at-input-live.mjs:46-47, 65-76`; `scripts/verify-ng-035-custom-mode-layout.mjs:147-148`; `scripts/verify-ng-036-setup-dock-layout.mjs:109-110`
**Issue:** The selector `.quick-input-widget .quick-input-box input` and the accept call are copied three times. If a Theia re-pin renames the class, all three break separately.
**Fix:** Move a `answerQuickInput(text)` probe snippet into `scripts/lib/pb-relaunch.mjs` the next time the ng files are re-locked (locked: needs Chris re-lock for the ng half).

### IN-03: modes-panel-motion cannot see CSS transitions on the shell panels

**File:** `scripts/verify-panel-motion.mjs:183-247`
**Issue:** The code half reads only `expandDuration` and `shell.resize(0, …)`. A rule such as `transition: width .2s` on `#theia-left-content-panel` would animate the panels while the check reports kind=a. No such rule exists today: grep of `theia/extensions/*/src` finds transitions only on chrome-bar and modes controls.
**Fix:** Add a CSS scan for `transition`/`animation` on selectors that match the left, right and bottom content panels or `.lm-SplitPanel-child`, and fail under kind=a.

### IN-04: the comments name a live row that does not exist

**File:** `scripts/verify-panel-motion.mjs:30`, `scripts/verify-platform.sh:3841-3842`
**Issue:** Both comments name `modes-panel-motion-live` as "the live half under a slide". No such script or registry row exists, and nothing requires one if the answer later changes to b or c.
**Fix:** Under kind b or c, fail when the registry has no `modes-panel-motion-live` row. The alternative is to write the comment as "to be added if b or c is ever chosen".

### IN-05: the cut counts UTF-16 code units and can split a surrogate pair

**File:** `theia/extensions/modes/src/browser/capped-name-input.ts:14`
**Issue:** If an emoji starts at index 59, `value.slice(0, 60)` leaves a lone high surrogate. The field shows a replacement glyph, and the backstop then stores that name as-is. `customModeIdFor` slugs it out, so nothing crashes. This matches the existing backstop and group rename.
**Fix:** If Chris cares, cut on code points in the helper and in both backstops (`Array.from(value).slice(0, max).join('')`). Otherwise add one line to the existing `shortcut:` comment.

### IN-06: the raw `.input(` scan is line-based, and stripComments has known blind spots

**File:** `scripts/verify-name-cap-at-input.mjs:37-41, 169-171`; `scripts/verify-panel-motion.mjs:65-87, 210`
**Issue:**
- The `.input(` scan misses a call split across lines (`this.quickInput\n    .input(`) and an aliased receiver.
- `code()` strips `//` inside string literals unless a `:` comes right before it.
- `stripComments` in verify-panel-motion.mjs does not recognise regex literals. 23-03-SUMMARY already records this.
- `new RegExp(\`const\\s+${raw}…\`)` at :210 interpolates `raw` without escaping it.

None of these causes a wrong result on today's tree.
**Fix:** Run the `.input(` regex over the whole comment-stripped file with `\s*` across newlines. Escape `raw` (`raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`).

---

_Reviewed: 2026-10-19T04:53:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
