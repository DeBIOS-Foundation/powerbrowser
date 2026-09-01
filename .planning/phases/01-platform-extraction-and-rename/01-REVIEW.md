---
phase: 01-platform-extraction-and-rename
reviewed: 2026-09-01T00:00:00Z
depth: standard
scope: >-
  gap-closure surface only, cumulative over two passes — pass 1 covered plans 01-18 and 01-19
  (diff e24f210^..d3a43ff), pass 2 covered plan 01-20 (diff d3a43ff..HEAD, commits 8d3e3ea and
  10dc32d). Nothing here re-reviews the other 17 plans of Phase 01.
files_reviewed: 8
files_reviewed_list:
  - powerbrowser/branding/dev/content/aboutDialog.css
  - powerbrowser/branding/dev/content/jar.mn
  - powerbrowser/branding/release/content/aboutDialog.css
  - powerbrowser/branding/release/content/jar.mn
  - powerbrowser/shell/powerbrowser.xhtml
  - scripts/verify-about-dialog-suppression.mjs
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-platform.sh
findings:
  critical: 1
  warning: 13
  info: 4
  total: 18
resolved_since_last_pass: 1
status: issues_found
---

# Phase 01: Code Review Report (gap-closure surface, cumulative)

**Reviewed:** 2026-09-01 (pass 2), 2026-08-31 (pass 1)
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Scope — read this before treating the result as a phase verdict

This report is cumulative over two incremental passes on the gap-closure work only:

- **Pass 1 (2026-08-31)** — plans 01-18 and 01-19, diff `e24f210^..d3a43ff`, seven files.
  It replaced the earlier full-phase report at commit `8364662`, which covered the other
  17 plans and remains readable in git history.
- **Pass 2 (2026-09-01)** — plan 01-20, diff `d3a43ff..HEAD` (commits `8d3e3ea`, `10dc32d`),
  which added `scripts/verify-about-dialog-suppression.mjs`, re-qualified the suppression
  selector in both branding stylesheets, and registered two rows in `verify-platform.sh`.

Nothing here re-reviews the other 17 plans, and a clean line in this report is not a clean
bill on Phase 01 as a whole. Pass 1 findings are preserved verbatim below with a status line
added; pass 2 findings are `CR-02` and `WR-09` through `WR-13`, plus `IN-03` and `IN-04`.

## Summary

**Pass 1** found one blocker (`CR-01`): plan 01-18's `#bottomBox > hbox { display: none }` hid
the whole About-dialog link row, taking the internal `about:license` disclosure down with the
two outbound mozilla.org links the UAT gap G-01-3 actually reported. Eight warnings and two
info items covered narrower CSS claims and hand-kept expectations in the new gates.

**Pass 2** confirms `CR-01` is fixed: the selector is now
`#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]`, both variants are still
byte-identical (`cmp` clean), and a probe of the real upstream markup shows the `about:license`
label surviving while both vendor links are reached. `scripts/verify-platform.sh --quick`
(25 checks), `--only about-dialog-suppression`, and `--only about-dialog-suppression-self-test`
all pass, and `node scripts/verify-about-dialog-suppression.mjs --self-test` prints a green
control plus four reds each naming its drift.

That green does not mean the new gate gates. **The single most important pass-2 finding
(`CR-02`) is that the checker cannot go red on the defect it was written for.** Deleting the
outbound selector entirely, or narrowing its `href^=` prefix so one vendor link re-appears,
both leave the check GREEN — verified by running `runChecks` against mutated copies of the
shipped stylesheets and the real upstream markup. The check asserts that suppression does not
*over-reach* onto `about:license`, and that no selector is stale; it never asserts that the
vendor links are *covered*. G-01-3 can therefore regress silently, which is the same
green-by-construction shape `deferred-items.md` rows 4, 9 and 10 record as a defect class.

Four further pass-2 warnings are of the same family: only the literal declaration
`display: none` is recognised, so a `visibility: hidden` or `opacity: 0` rule hiding
`about:license` passes green (`WR-09`); the `--self-test` fixture *is* a hand-kept list of
upstream ids and hrefs, which the file's own header explicitly denies (`WR-10`); the markup
parser never validates tag balance and mis-nests on any HTML void element (`WR-11`); the
module executes its whole check body on import and calls `process.exit`, so its four `export`ed
functions are unreachable to any consumer (`WR-12`); and three of the script's own stated
promises have no planted fault in `--self-test` (`WR-13`).

Pass 1's warnings are all still open in the tree. `WR-08` in particular is now empirically
confirmed: a walk of `upstream/browser/base/content/aboutDialog.xhtml` finds five
`https://www.mozilla.org` links, four covered by the shipped selectors and one — inside
`#communityExperimentalDesc` — still visible.

## Critical Issues

### CR-01: The About-dialog suppression also removes the `about:license` disclosure link — RESOLVED by plan 01-20

**Status:** **Resolved.** `8d3e3ea` replaced the container selector with
`#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]` in both byte-identical
variant stylesheets, which is the fix this finding proposed. Verified against the real markup:
the `about:license` label is not matched by any shipped selector, on itself or on any ancestor.
Retained here for the record; no further action.

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:51-55` and
`powerbrowser/branding/release/content/aboutDialog.css:51-55`

**Issue:** The rule hid `#bottomBox > hbox` wholesale.
`upstream/browser/base/content/aboutDialog.xhtml:139-143` shows what is in that row:

```xhtml
<hbox pack="center">
  <label is="text-link" class="bottom-link" useoriginprincipal="true" href="about:license" data-l10n-id="bottomLinks-license"/>
  <label is="text-link" class="bottom-link" href="https://www.mozilla.org/about/legal/terms/firefox/" .../>
  <label is="text-link" class="bottom-link" href="https://www.mozilla.org/privacy/firefox/..." .../>
</hbox>
```

Two of the three are outbound mozilla.org URLs — the reported defect. The first is
`about:license`, an internal page and the **only** in-product path to the aggregated
open-source licence text for everything this build links.

**Fix (applied):** suppress by target rather than by container.

### CR-02: The new gate cannot go red on the defect it was written for — the outbound links can be un-suppressed silently

**File:** `scripts/verify-about-dialog-suppression.mjs:269-371` (`runChecks`), with the claim
made at `scripts/verify-about-dialog-suppression.mjs:16-25`

**Issue:** The file's header states it closes two opposite failure modes, over-reach and
under-reach, and defines under-reach as "a selector matches nothing at all". That definition is
narrower than the defect surface. `runChecks` performs exactly four assertions:

1. the markup parsed to at least one `href` (vacuity, line 289–296);
2. every declared selector is inside the supported grammar (line 327–335);
3. every declared selector matches **something** (staleness, line 337–347);
4. no declared selector reaches `about:license` or any of its ancestors (line 349–366).

Nothing anywhere asserts that the outbound vendor links **are** suppressed. The set of
mozilla.org links in the dialog is never derived, so the check has no notion of coverage. I ran
`runChecks` against a temp root holding the real
`upstream/browser/base/content/aboutDialog.xhtml` and mutated copies of the shipped
stylesheets:

| mutation | result |
|---|---|
| control (shipped tree) | GREEN |
| third selector deleted, `#communityDesc, #contributeDesc` kept — **UAT G-01-3 returns in full** | **GREEN** |
| `href^="https://www.mozilla.org"` narrowed to `href^="https://www.mozilla.org/about/legal"` — Privacy Notice link re-appears | **GREEN** |

Both mutations restore the exact user-visible defect this phase's gap-closure exists to close,
and both keep every registered row green: `raw.length` is non-zero so assertion 1 does not
fire, the surviving selectors still match real elements so assertion 3 does not fire, and
nothing reaches `about:license` so assertion 4 does not fire. `--quick` stays green,
`--only about-dialog-suppression` stays green. The check that plan 01-20 registered to prevent
a silent regression of the About-dialog suppression is, for the regression that actually
matters, green by construction.

This also makes the second half of pass-1 `WR-03` unmet. `WR-03` asked for a derived comparison
that goes red on drift in the upstream markup; that half landed. The complementary half — that
the shipped selectors still *cover* what they were written to cover — did not.

**Fix:** derive the outbound set from the markup, not from the stylesheet (deriving it from the
stylesheet is circular and would pass through both mutations above). Add a fifth assertion to
`runChecks`, after the per-file loop, that collects every suppression selector from every
variant and requires each external link in the dialog to be reached by at least one of them:

```js
// Assertion 5: coverage. Over-reach is not the only way to be wrong -- a
// selector that was deleted or narrowed leaves the vendor link on screen and
// every assertion above still passes. Derived from the markup, not the CSS.
const external = elements.filter(
    (e) => e.href !== null && /^https?:/i.test(e.href) && !e.href.startsWith('chrome:'),
);
if (external.length === 0) {
    rep.fail(`VACUOUS: ${MARKUP_REL} carries no external link at all; coverage proves nothing.`);
}
for (const el of external) {
    const covered = allSelectors.some((sel) => {
        for (let n = el; n; n = n.parent) if (matches(sel, n)) return true;
        return false;
    });
    if (!covered) {
        rep.fail(
            `UNSUPPRESSED VENDOR LINK: ${describe(el)} in ${MARKUP_REL} is reached by no shipped ` +
            `suppression selector, so it renders inside a Power-Browser-branded dialog.`,
        );
    }
}
```

Add a matching `--self-test` row that deletes the third selector from the fixture's copy of the
stylesheets and requires a red naming the surviving `https://www.mozilla.org` href.

Note that this assertion goes **red on the tree as it stands today**, naming the
`#communityExperimentalDesc` link — that is pass-1 `WR-08`, and it going red is the correct
outcome, not a reason to weaken the assertion. Either suppress that node (the `WR-08` fix) or
record an explicit, derived exemption list with the decision that created it; do not scope the
new assertion around it.

## Warnings

### WR-01: The suppressed copy is still in the dialog's accessible description

**Status:** open (pass 1; unchanged by 01-20).

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:63-67` and
`powerbrowser/branding/release/content/aboutDialog.css:63-67`

**Issue:** `upstream/browser/base/content/aboutDialog.xhtml:17` puts both suppressed nodes in
the dialog's description chain:

```xhtml
aria-describedby="version distribution distributionId communityDesc contributeDesc trademark"
```

Under the accessible-name-and-description algorithm, a node that is hidden but **directly
referenced** by `aria-labelledby`/`aria-describedby` is not skipped — the referenced-node
exception overrides the hidden-node rule. So a screen-reader user still hears the community
blurb (whose visible label is this product's vendor name pointing at mozilla.org) and the
donation copy that `display: none` was added to remove. The suppression is visual only.

**Fix:** CSS cannot reach this; `aria-describedby` is a literal attribute in upstream markup.
Either drop `communityDesc contributeDesc` from that attribute in the patch stack (a one-token
hunk in the same file the suppression already depends on), or record the residual explicitly in
the phase's deferred items so it is not mistaken for closed. Silently shipping "hidden, but
still announced" is the worse of the two.

### WR-02: Removing the `#rightBox` block does not stop the 404 its replacement comment blames it for

**Status:** open (pass 1; unchanged by 01-20 — re-verified against
`upstream/browser/base/content/aboutDialog.css:32-49`, which still sets the `background-image`).

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:23-31` and
`powerbrowser/branding/release/content/aboutDialog.css:23-31`

**Issue:** The comment says the deleted `padding-top: 64px` "would reserve an empty 64px band
above the version text for an image that 404s". The image request is not ours to delete —
upstream sets it:

```css
#rightBox {
  background-image: url("chrome://branding/content/about-wordmark.svg");
  background-size: 288px auto;
  margin-top: 20px;
  ...
}
```

That URL still resolves into our branding package, which correctly does not ship
`about-wordmark.svg`, so the chrome request still 404s on every About-dialog open — before this
change and after it. What actually changed is layout: upstream's `background-size: 288px auto`
and `margin-top: 20px` now apply unopposed, and `margin-inline: 30px` is gone, so the version
column loses its inset. The defect named in the comment is untouched and a small layout
regression was taken in exchange.

**Fix:** One declaration removes the broken request and makes the comment true, in both variants:

```css
/* This tree ships no wordmark (Phase 3's icon pipeline owns it), so cancel
   upstream's reference rather than only its positioning. */
#rightBox {
  background-image: none;
  margin-inline: 30px;
}
```

Drop `margin-inline` from that block only if losing the inset is intended.

### WR-03: The suppression selectors are a hand-kept expectation about upstream markup with no gate

**Status:** **partially resolved** by plan 01-20. The staleness half landed —
`scripts/verify-about-dialog-suppression.mjs` derives the selector list from the shipped CSS,
derives the element tree from the real upstream markup, and fails by name when a selector
matches nothing, with a `--self-test` row that plants exactly the id rename this finding
described. The coverage half did not land; see `CR-02`. Keep open until `CR-02` is closed.

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:63-67`,
`powerbrowser/branding/release/content/aboutDialog.css:63-67`;
`scripts/verify-platform.sh:3600, 3665`

**Issue:** `#communityDesc`, `#contributeDesc` and the bottom-row compound are literals about a
file this repo does not own. An ESR rebase that renames an id, wraps the row in another box, or
moves the links makes every one of these rules a silent no-op.

**Fix:** as landed for staleness; extend per `CR-02` for coverage.

### WR-04: The divergence check's expectations are still hand-kept, in a check that never runs

**Status:** open (pass 1; unchanged by 01-20).

**File:** `scripts/verify-platform.sh:2763-2769`, `scripts/verify-platform.sh:2812-2813`,
`scripts/verify-platform.sh:2827`, `scripts/verify-platform.sh:3868`

**Issue:** 01-19 corrected `"PowerBrowser Dev"`/`"PowerBrowser"` to `"Power Browser Dev"`/
`"Power Browser"` in four places, but left them as literals inside the check. CLAUDE.md's
verification rule 2 is explicit: *derive from the tree and compare; do not hand-keep an
expectation list*. `inventory/brand-tokens.json`'s
`brand_display_expectations.variants.*.brand_full_name` already carries both values and is what
`verify-branding-preflight.mjs` compares against.

The drift mattered because nothing could catch it. `branding-variant-divergence` reads
`objdir-release/dist/bin/...`, which does not exist (the declined ~47m release build), and it is
therefore excluded via ledger entry 10. Its self-test exercises synthesised temp files, so it
goes green on any pair of literals that happen to be internally consistent.

**Fix:** Read the two expected values from the inventory inside the node block, e.g. pass
`brand_display_expectations.variants.dev.brand_full_name` and `.release.brand_full_name` as two
further argv entries from `check_branding_variant_divergence`, and have the self-test pass its
own synthesised pair so it stays independent of the tree. The dev-vs-release **divergence**
assertion (dev carries a suffix release does not) is the part worth keeping literal.

### WR-05: The new jar.mn parser recognises only one of the two legal manifest line shapes

**Status:** open (pass 1; unchanged by 01-20).

**File:** `scripts/verify-branding-preflight.mjs:566-571`

**Issue:**

```js
const m = raw.split('#')[0].trim().match(/^(\S+)\s+\((\S+)\)$/);
if (m) entries.push({ destination: m[1], source: m[2] });
```

A jar.mn entry may legally omit the parenthesised source when destination and source paths
coincide — and that is the dominant form in the manifests this checker is modelled on.
`upstream/browser/branding/official/content/jar.mn` uses it for eleven of its seventeen entries,
including, exactly, `content/branding/aboutDialog.css`. Such a line matches nothing here, so it
lands in neither `sources`, `entries`, nor `packagedDestinations`: (a) a correctly packaged
resource is reported as *not packaged* and the check goes red on a good tree; (b) that source's
existence is never validated; (c) the divergence comparison sees a truncated destination set on
one side and can fire spuriously.

**Fix:** Accept both shapes and keep the non-vacuity property:

```js
const line = raw.split('#')[0].trim();
if (!line || line.endsWith(':') || line.startsWith('%')) continue;
const paren = line.match(/^(\S+)\s+\((\S+)\)$/);
if (paren) entries.push({ destination: paren[1], source: paren[2] });
else if (/^\S+$/.test(line)) entries.push({ destination: line, source: line.replace(/^content\/branding\//, '') });
```

### WR-06: The shell-markup non-vacuity guard counts manifest entries, not readable files

**Status:** open (pass 1; unchanged by 01-20).

**File:** `scripts/verify-branding-preflight.mjs:413-428` and `437-439`

**Issue:** `shellMarkup` is built from `jar.mn` text alone, and the emptiness guard tests
`shellMarkup.length === 0`. The leak loop then does `const text = readText(root, rel); if (text
=== null) continue;`. So if `powerbrowser/shell/jar.mn` ships a markup file that has been
renamed or deleted, `shellMarkup.length` is still 1, the guard stays green, `readText` returns
null, and the scan reads **zero lines** while reporting a clean run. The sibling idiom the
comment cites, `shell-csp-inline-attrs` (`scripts/verify-platform.sh:2295-2300`), explicitly
fails with "jar.mn ships '$rel' but ... does not exist"; the copy is weaker than the original.

Second, smaller gap: `/\(([^)]+\.x?html)\)/g` covers `.html` and `.xhtml` only, while the
sibling covers `xhtml|html|xul|js|mjs`.

**Fix:**

```js
for (const rel of shellMarkup) {
    if (!existsSync(join(root, rel))) {
        r.fail(`${SHELL_DIR}/jar.mn packages ${rel}, but that file does not exist -- the display-surface leak scan would skip it silently`);
    }
}
```

and widen the extension alternation to `\.(?:x?html|xul)` to match the idiom being copied.

### WR-07: Packaging completeness treats any directory entry as a chrome resource

**Status:** open (pass 1; unchanged by 01-20).

**File:** `scripts/verify-branding-preflight.mjs:534`, `541-545`

**Issue:** `readdirSync` is called without `withFileTypes`, and everything except `jar.mn` and
`moz.build` is asserted to be a packaged chrome resource. A subdirectory under `content/`, a
`README.md`, an editor backup, or a `.gitkeep` therefore produces a false "is a chrome resource
that ... does not package" failure with no resolution except adding a nonsense packaging line or
growing a hand-kept exclusion set the comment specifically says it will not keep.

**Fix:**

```js
resources = readdirSync(join(root, contentRel), { withFileTypes: true })
    .filter((d) => d.isFile() && !CONTENT_BUILD_INPUTS.has(d.name))
    .map((d) => d.name)
    .sort();
```

### WR-08: The identical vendor-name→mozilla.org link in `#communityExperimentalDesc` is not suppressed

**Status:** open (pass 1), and now **empirically confirmed**. Walking the real
`upstream/browser/base/content/aboutDialog.xhtml` with the new checker's own `parseMarkup` and
`matches` finds five `https://www.mozilla.org` links; four are reached by a shipped selector and
one is not:

```
VISIBLE https://www.mozilla.org/?utm_source=firefox-browser...
        label < description#communityExperimentalDesc < vbox#experimental < vbox#detailsBox
        < vbox#rightBox < hbox#clientBox < html:div#aboutDialogContainer < window#aboutDialog
```

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:63-67` and
`powerbrowser/branding/release/content/aboutDialog.css:63-67`

**Issue:** `upstream/browser/base/content/aboutDialog.xhtml:120-125` carries a second copy of
the suppressed node — same vendor-name label, same mozilla.org target, the defect the comment
calls "the reported defect in its worst instance" — and it is not in the selector list.
`upstream/browser/base/content/aboutDialog.js:67-76` unhides `#experimental` (and hides
`#communityDesc` in its place) whenever `Services.appinfo.version` matches `/a\d+$/`. It is
inert today only because `upstream/browser/config/version.txt` reads `153.1.0` with no alpha
suffix. Any move onto a nightly-style version string re-exposes the exact link that was just
suppressed.

**Fix:** Add it to the same rule and say why in the comment:

```css
#communityDesc,
#communityExperimentalDesc,   /* the nightly-channel twin of the above; inert at ESR versions, live the moment the version string carries an alpha suffix */
#contributeDesc,
```

Closing this and closing `CR-02` are the same work: `CR-02`'s coverage assertion names this
exact element as its first red.

### WR-09: The disclosure guard recognises only the literal `display: none`, so any other hiding mechanism bypasses it

**File:** `scripts/verify-about-dialog-suppression.mjs:90-103`
(`parseSuppressionSelectors`), consumed at `scripts/verify-about-dialog-suppression.mjs:316`

**Issue:** The left-hand side of every assertion is built by
`if (!/display\s*:\s*none/i.test(m[2])) continue;` — a rule is "a suppression" if and only if
its declaration block contains that one property/value pair. Every other way CSS hides an
element is invisible to the check, including the ones that hide it just as completely. Verified
against the real upstream markup:

| stylesheet mutation | licence link on screen? | check result |
|---|---|---|
| `#bottomBox > hbox { visibility: hidden }` added, `display:none` rule left on the two `Desc` ids | invisible | **GREEN** |
| `#bottomBox > hbox > .bottom-link[href^="about:"] { opacity: 0 }` appended | invisible | **GREEN** |

Both reproduce the substance of `CR-01` — the `about:license` disclosure unreachable in the UI —
while the script prints
`PASS -- ... none reaches the about:license disclosure link`. That sentence is then false, and
it is the check's own summary line.

**Fix:** collect on the *effect*, not on one declaration. Widen the predicate and name the
declaration in the failure message so a red is still actionable:

```js
const HIDING = /(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden|opacity\s*:\s*0(?:\.0+)?(?:\s|;|$))/i;
```

Adjust the vacuity message at line 320 and the PASS line at 528 to say "hiding declarations"
rather than "`display: none` selectors", and add a `--self-test` row planting a
`visibility: hidden` container rule that must go red naming `about:license`.

### WR-10: The `--self-test` fixture is a hand-kept list of upstream ids and hrefs, and the header denies that it is

**File:** `scripts/verify-about-dialog-suppression.mjs:27-35` (the claim),
`scripts/verify-about-dialog-suppression.mjs:384-408` (`fixtureMarkup`),
`scripts/verify-about-dialog-suppression.mjs:482-489` (the control assertion)

**Issue:** The header states, without qualification:

> This file hand-keeps no list of expected ids, selectors, or hrefs [...] The only authored
> markup in this file is the --self-test fixture, which is a fault-planting harness rather than
> an expectation.

`fixtureMarkup()` hand-keeps `communityDesc`, `contributeDesc`, `bottomBox`, `bottom-link`,
`about:license`, `about:credits`, and four `mozilla.org` hrefs. It is not merely a harness,
because the control at line 482 asserts `runChecks(dir).failures.length === 0` — i.e. it asserts
that the **real shipped selectors** match the **authored fixture**. That is an expectation about
upstream ids in exactly the shape CLAUDE.md verification rule 2 forbids, running in `--quick`,
the commit gate.

`deferred-items.md` row 11(a-ii) records the ceiling and argues "fixture drift can only weaken
the self-test, never the gate". That is true in one direction and false in the other. On an ESR
rebase that renames a container, the correct sequence is: `about-dialog-suppression` goes red
(good), an author updates the stylesheets to the new ids, the real-markup gate goes green — and
`about-dialog-suppression-self-test` now goes **red in `--quick`** on a correct tree, because
the fixture still carries the old ids. A false red in the commit gate is not a weakening, it is
a stoppage, and the recorded mitigation ("re-derive the fixture at the first ESR bump") is a
manual step with no check behind it.

**Fix:** stop asserting the real CSS against the authored fixture. Two options, either is
sufficient:

1. Make the self-test's stylesheets synthetic too — author a minimal CSS alongside
   `fixtureMarkup()` so the hermetic row tests the *instrument* end-to-end with no coupling to
   the shipped tree, exactly as `WR-04` recommends for `branding-variant-divergence`.
2. Keep the real CSS but add a drift detector to the **non-hermetic** row: parse
   `fixtureMarkup()`, and require every id and `href` it declares to also appear in the real
   `upstream/` markup, failing by name on the ones that do not. That makes fixture drift a red
   in the full run instead of a silent ceiling, and costs about ten lines.

Then correct the header: it may claim the *assertions* hand-keep no expectation, which is true;
it may not claim the file does.

### WR-11: The markup parser never validates tag balance and mis-nests on HTML void elements

**File:** `scripts/verify-about-dialog-suppression.mjs:110-147` (`parseMarkup`)

**Issue:** The parser maintains an explicit `stack` and derives every `parent` link from it, but:

- `if (closing) { stack.pop(); continue; }` at line 125–128 pops without comparing the closing
  tag name to the stack top, so a mismatched or stray close silently re-parents everything after
  it. `Array.prototype.pop` on an empty array is a no-op, so an extra close cannot even crash.
- `selfClosing` is decided solely by a trailing `/` (line 129). An HTML void element written
  without one — `<br>`, `<hr>`, `<img>`, `<input>`, all legal in the `html:` namespace upstream
  already uses for `<html:div>`, `<html:link>` — is pushed and never popped.
- Nothing asserts `stack.length === 0` at the end, which is the one-line check that would catch
  every case above.

Reproduced: injecting `<html:br>` before `<vbox id="bottomBox">` in the real markup re-parents
the row —

```
label < hbox < vbox#bottomBox < html:br < html:div#aboutDialogContainer < window#aboutDialog
```

`#bottomBox`'s parent is now the `<br>`. The immediate consequence is a false red: any child
combinator crossing that point stops matching and assertion 3 reports `STALE` on a stylesheet
that is correct. It is a false red today rather than a false green only because the shipped
selectors happen not to cross the corrupted boundary; the parser gives no reason for that to
keep holding.

**Fix:** make the mis-parse loud instead of silent. In `parseMarkup`, track the tag name on the
stack and return the imbalance; in `runChecks`, treat it as a FAIL beside the vacuity guard:

```js
if (closing) {
    const top = stack[stack.length - 1];
    if (!top || top.tag !== name) unbalanced.push(`</${name}> closes <${top ? top.tag : 'nothing'}>`);
    else stack.pop();
    continue;
}
...
if (stack.length || unbalanced.length) {
    rep.fail(`${MARKUP_REL} did not parse as balanced markup (${...}); every parent link below it is unreliable, so this is a FAIL rather than a best-effort walk.`);
    return rep;
}
```

Add `VOID_TAGS` (`br`, `hr`, `img`, `input`, `meta`, `link`, `area`, `base`, `col`, `embed`,
`source`, `track`, `wbr`, each also matched under an `html:` prefix) to the `selfClosing` test.

### WR-12: The module runs its whole check body on import, so its four exports are unreachable

**File:** `scripts/verify-about-dialog-suppression.mjs:90`, `110`, `223`, `257` (the exports)
and `scripts/verify-about-dialog-suppression.mjs:520-529` (the unguarded main body)

**Issue:** `parseSuppressionSelectors`, `parseMarkup`, `parseSelector` and `matches` are
`export`ed, but lines 520–529 execute unconditionally at module scope and end in
`process.exit(0)` or `process.exit(1)`. Any `import { matches } from './verify-about-dialog-suppression.mjs'`
therefore runs the full check against `REPO_ROOT` and terminates the importing process before a
single line of the consumer runs — observed directly: importing the module to walk the markup
printed the check's own PASS line and exited 0.

Two costs. The exports are dead surface that reads as a reusable selector library and is not
one. More importantly, the failure mode is precisely the one this file's header argues against:
a future check that imports `matches` to reuse the engine gets `exit(0)` — a green that examined
nothing, produced by the file that exists to prevent greens that examined nothing.

**Fix:** guard the entry point, which is the standard idiom and keeps `--self-test` working:

```js
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    if (SELF_TEST) selfTest();
    const result = runChecks(REPO_ROOT);
    ...
}
```

Also export `runChecks` (currently exported) *and* nothing else, or drop the exports entirely if
no consumer is intended — an unusable export is worse than no export.

### WR-13: Three of the script's own stated promises have no planted fault in `--self-test`

**File:** `scripts/verify-about-dialog-suppression.mjs:438-475` (the `rows` table), against the
promises at `scripts/verify-about-dialog-suppression.mjs:37-41`, `159-166`, and `310-315`

**Issue:** CLAUDE.md requires a new check to "plant faults and require each one to go red naming
the drift". The four rows cover over-reach (a), staleness (b), vacuity (c) and missing premise
(d). Three assertions the file explicitly promises are never planted:

1. **Grammar totality** (line 159–166: "A selector this parser cannot read must never be
   silently skipped"). Nothing plants an unsupported selector. I confirmed manually that
   `#communityDesc:not(.x)` does go red — but that evidence lives in this review, not in the
   repository, which is the arrangement the rule exists to prevent.
2. **Missing markup is a FAIL, never a skip** (line 37–41, the promise the header makes most
   emphatically, and line 277–284 where it is implemented). No row deletes
   `upstream/browser/base/content/aboutDialog.xhtml` from the fixture root. Since this branch
   `return`s early, a regression here would suppress every other assertion at once.
3. **Missing stylesheet** (line 312–315). No row deletes one variant's CSS. This is the branch
   that would fire if a Phase 2 rebrand pipeline renames a variant directory.

Additionally, no row asserts anything about the *number* of failures, so a plant that goes red
for a second, unintended reason is indistinguishable from one that goes red correctly. `(a)`
through `(d)` happen to be independent today — I traced each against the fixture and each
produces exactly one failure class — but nothing in the harness holds that property.

**Fix:** add three rows and tighten the assertion:

```js
{ label: '(e) unsupported selector -- the grammar must name it, never skip it',
  plant() { for (const rel of CSS_RELS) write(rel, readFileSync(join(dir, rel), 'utf8').replace('#communityDesc,', '#communityDesc:not(.x),')); },
  names: ['outside the grammar', '#communityDesc:not(.x)'] },
{ label: '(f) missing upstream markup -- FAIL, never skip',
  plant() { rmSync(join(dir, MARKUP_REL)); },
  names: ['is missing under', 'fetch-upstream.sh'] },
{ label: '(g) missing variant stylesheet',
  plant() { rmSync(join(dir, CSS_RELS[1])); },
  names: [CSS_RELS[1], 'cannot be derived'] },
```

and give each row an expected failure count, checked alongside `names`, so an unintended second
red is itself a self-test failure.

## Info

### IN-01: The scanner fixture still spells the identifier form as rendered text

**Status:** open (pass 1; unchanged by 01-20).

**File:** `scripts/verify-platform.sh:2278`

**Issue:** The `shell-csp-inline-attrs` self-test fixture contains
`<div id="powerbrowser-loading">PowerBrowser</div>`. It is a fixture reproducing pre-fix markup,
so it is not shipped and not user-facing — but with 01-19 landed it is the last rendered-text
spelling of the compact form in the tree, and `scripts/` is outside the preflight's display
surface set. The risk is copy-back.

**Fix:** Change the fixture line to `Power Browser`, or add a one-line comment marking it as a
deliberate pre-fix reproduction.

### IN-02: Nothing asserts the two variant stylesheets stay identical

**Status:** open (pass 1). 01-20 edited both stylesheets and they remain byte-identical
(`cmp` clean), but the property is still enforced only by the plan's own `<automated>` line, not
by a registered row.

**File:** `powerbrowser/branding/dev/content/aboutDialog.css`,
`powerbrowser/branding/release/content/aboutDialog.css`,
`scripts/verify-branding-preflight.mjs:597-612`

**Issue:** Section 9(c) compares only the set of packaged **destination names**. Content
divergence, and a manifest that packages the right destination from a different source, both
pass. `branding-variant-divergence` compares `brand.properties` and the titlebar pref only.
`verify-about-dialog-suppression.mjs` checks both variants but independently, so a selector
edited in one and not the other passes as long as each is individually valid.

**Fix:** In 9(c), compare `destination → sha256(source contents)` maps rather than destination
sets, excluding the entries whose divergence is deliberate.

### IN-03: `dropSuppressionRule` and `parseSuppressionSelectors` disagree about what a rule is

**File:** `scripts/verify-about-dialog-suppression.mjs:412-418`

**Issue:** `parseSuppressionSelectors` strips block comments before looking for `display: none`
(line 91) — deliberately, because "this stylesheet's own comment block quotes several"
selectors. `dropSuppressionRule`, the fault-(c) plant helper, searches the raw text with
`css.indexOf('display: none')` and slices between the surrounding `}` characters, with no
comment stripping at all. The two halves therefore have different notions of where the rule is.
Today they coincide because no comment contains that literal; the moment one does — and the
stylesheet's comments already quote selectors verbatim — plant (c) cuts a different span. It
would fail loudly rather than silently (a plant that leaves a `display: none` rule intact
reports "was NOT rejected"), so this is an obstacle to future maintenance rather than a hole.

**Fix:** have `dropSuppressionRule` operate on the same comment-stripped view, or locate the rule
via `parseSuppressionSelectors`' own regex so the two cannot drift.

### IN-04: The stylesheet comment mis-describes the branding hook's position in the linkset

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:39-40` and
`powerbrowser/branding/release/content/aboutDialog.css:39-40`

**Issue:** "this stylesheet is the third and last entry in that file's linkset".
`upstream/browser/base/content/aboutDialog.xhtml:25-38` shows the `<linkset>` holds five
entries: three `rel="stylesheet"` links, of which `chrome://branding/content/aboutDialog.css` is
indeed the third, followed by two `rel="localization"` links. It is the last *stylesheet*, not
the last entry. Predates 01-20 (unchanged context in the diff), but it is load-bearing prose —
the claim is what justifies treating this file as the override hook.

**Fix:** "the third and last *stylesheet* in that file's linkset".

---

_Reviewed: 2026-09-01 (pass 2, plan 01-20), 2026-08-31 (pass 1, plans 01-18/01-19)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
