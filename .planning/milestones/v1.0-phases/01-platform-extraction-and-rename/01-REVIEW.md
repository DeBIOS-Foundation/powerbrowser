---
phase: 01-platform-extraction-and-rename
reviewed: 2026-09-01T21:05:00Z
depth: standard
scope: >-
  gap-closure surface only, cumulative over three passes — pass 1 covered plans 01-18 and 01-19
  (diff e24f210^..d3a43ff), pass 2 covered plan 01-20 (diff d3a43ff..HEAD at the time, commits
  8d3e3ea and 10dc32d), pass 3 covered plan 01-21 (diff b5fefe4..HEAD, commits dff4c63 and
  6e4875f). Nothing here re-reviews the other 17 plans of Phase 01.
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
  critical: 3
  warning: 16
  info: 8
  total: 27
resolved_since_last_pass: 3
status: issues_found
---

# Phase 01: Code Review Report (gap-closure surface, cumulative)

**Reviewed:** 2026-09-01 (pass 3), 2026-09-01 (pass 2), 2026-08-31 (pass 1)
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Scope — read this before treating the result as a phase verdict

This report is cumulative over three incremental passes on the gap-closure work only:

- **Pass 1 (2026-08-31)** — plans 01-18 and 01-19, diff `e24f210^..d3a43ff`, seven files.
  It replaced the earlier full-phase report at commit `8364662`, which covered the other
  17 plans and remains readable in git history.
- **Pass 2 (2026-09-01)** — plan 01-20, diff `d3a43ff..HEAD` (commits `8d3e3ea`, `10dc32d`),
  which added `scripts/verify-about-dialog-suppression.mjs`, re-qualified the suppression
  selector in both branding stylesheets, and registered two rows in `verify-platform.sh`.
- **Pass 3 (2026-09-01)** — plan 01-21, diff `b5fefe4..HEAD` (commits `dff4c63`, `6e4875f`),
  which added assertion 5 (coverage) to `scripts/verify-about-dialog-suppression.mjs`, two new
  `--self-test` fault rows and a fixture extension, and added `#communityExperimentalDesc` to
  the suppression list in both branding stylesheets. Three files, all already in scope.

Nothing here re-reviews the other 17 plans, and a clean line in this report is not a clean
bill on Phase 01 as a whole. Pass 1 and pass 2 findings are preserved verbatim below with a
status line added or updated; pass 3 findings are `CR-03`, `WR-14` through `WR-16`, and `IN-05`
through `IN-08`.

## Summary

**Pass 1** found one blocker (`CR-01`): plan 01-18's `#bottomBox > hbox { display: none }` hid
the whole About-dialog link row, taking the internal `about:license` disclosure down with the
two outbound mozilla.org links the UAT gap G-01-3 actually reported. Eight warnings and two
info items covered narrower CSS claims and hand-kept expectations in the new gates.

**Pass 2** confirmed `CR-01` fixed, and found `CR-02`: the newly registered gate could not go
red on the defect it was written for. Deleting the outbound selector, or narrowing its `href^=`
prefix, both left the check GREEN while UAT G-01-3 returned in full.

**Pass 3 confirms `CR-02` is genuinely closed, and `WR-08` and `WR-03` with it.** Assertion 5
derives the external-link set from the parsed upstream markup — `elements.filter((e) => e.href
!== null && /^https?:/i.test(e.href))` at `scripts/verify-about-dialog-suppression.mjs:318` —
with no host filter, no allowlist and no skip set anywhere in the file, and requires per-variant
coverage on the element or any ancestor. I re-ran both pass-2 mutations against a scratch root
holding the **real** upstream markup: the deletion now produces four reds and the narrowing two,
each naming the surviving href and the stylesheet. `--self-test` prints a green control plus six
planted faults, each red and each naming its drift (`exit 0`, transcript read directly). A walk
of the real markup with the checker's own `parseMarkup`/`matches` finds ten href-bearing
elements, six of them `http(s)`, and **all six now covered** — `#communityExperimentalDesc` was
added to both stylesheets, which remain byte-identical (`cmp` clean). `WR-08` is closed against
the code, not against the summary that claims it.

**That closure is real but it is not airtight, and pass 3's blocker is that the same
green-by-construction shape survives through a different vector.** `CR-03`: the left-hand side
of every assertion is collected by a flat brace-pair regex that discards all at-rule context.
Move the shipped suppression rule inside `@media print` — one wrapping line, zero selector edits
— and every vendor link renders in the dialog while the check exits **0** and prints
`PASS -- ... every external link in that markup is reached by a shipped selector in every
branding variant`. That sentence is then false, and it is the check's own summary line. The same
defect fires in the opposite polarity: a `@media print`-scoped `#bottomBox > hbox` rule, which
hides nothing on screen, produces two false `SUPPRESSES THE LICENCE DISCLOSURE` reds. Both were
reproduced against the real upstream markup.

Three further pass-3 warnings: fault row `(b)` is no longer an isolated staleness plant — it now
fires six failures across two assertion classes, and the purity property `WR-13` flagged as
"happens to hold today, nothing holds it" broke in this very change with nothing going red
(`WR-14`); the coverage failure message offers an escape hatch — "record the decision to leave it
visible" — that the checker has no mechanism to honour, so a link that must legitimately stay
visible reds the commit gate permanently (`WR-15`); and `WR-10`'s fixture coupling got **wider**,
not narrower, because the control now also asserts the real shipped selectors cover every
authored fixture *href*, and rows `(e)`/`(f)` hard-code upstream URLs in their `names` arrays
(`WR-16`).

Pass 1's `WR-01`, `WR-02`, `WR-04` through `WR-07`, and pass 2's `WR-09` through `WR-13`, are all
still open in the tree.

## Critical Issues

### CR-01: The About-dialog suppression also removes the `about:license` disclosure link — RESOLVED by plan 01-20

**Status:** **Resolved.** `8d3e3ea` replaced the container selector with
`#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"]` in both byte-identical
variant stylesheets, which is the fix this finding proposed. Verified against the real markup:
the `about:license` label is not matched by any shipped selector, on itself or on any ancestor.
Re-verified in pass 3 after the `#communityExperimentalDesc` addition — still not matched.
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

### CR-02: The new gate cannot go red on the defect it was written for — RESOLVED by plan 01-21

**Status:** **Resolved.** `dff4c63` added assertion 5 at
`scripts/verify-about-dialog-suppression.mjs:399-423`. Verified against the code, not the
summary. Three independent probes:

| probe | pass-2 result | pass-3 result |
|---|---|---|
| control (shipped tree, real `upstream/` markup) | GREEN | GREEN |
| bottom-link compound deleted — UAT G-01-3 returns in full | **GREEN** | **RED, 4 failures** naming both surviving hrefs in both variants |
| `href^=` narrowed to `https://www.mozilla.org/about/legal` | **GREEN** | **RED, 2 failures** naming `https://www.mozilla.org/privacy/firefox/` |

The derivation is genuine: `external` is computed at
`scripts/verify-about-dialog-suppression.mjs:318` as `elements.filter((e) => e.href !== null &&
/^https?:/i.test(e.href))` over the parsed markup, with no host filter and no exemption
structure anywhere in the file. I grepped the module for any array, `Set`, or object of hrefs,
ids, or hosts outside `fixtureMarkup()` and found none. The per-variant placement inside the
`for (const rel of CSS_RELS)` loop is the stronger of the two shapes — my pass-2 fix sketch
proposed a union over both stylesheets, which would pass a link covered in dev but not in
release and has no `rel` to name; the executor's deviation from that sketch is an improvement,
and the sketch's `&& !e.href.startsWith('chrome:')` clause was correctly dropped as unreachable
under `^https?:`.

**Residual:** the coverage assertion is defeatable through an at-rule wrapper — see `CR-03`,
which is a distinct root cause in `parseSuppressionSelectors`, not a reopening of this finding.

**File:** `scripts/verify-about-dialog-suppression.mjs:399-423` (assertion 5, as landed)

**Issue (original):** `runChecks` performed four assertions — vacuity, grammar totality,
staleness, over-reach onto `about:license` — and nothing anywhere asserted that the outbound
vendor links **are** suppressed. The set of mozilla.org links was never derived, so the check
had no notion of coverage, and both mutations above restored the exact user-visible defect while
keeping every registered row green.

**Fix (applied):** derive the external set from the markup and require per-variant coverage, with
`--self-test` rows `(e)` and `(f)` planting the deletion and the narrowing.

### CR-03: The coverage assertion is defeated by any at-rule wrapper — `@media`-scoped suppression counts as coverage, and the check prints a false PASS

**File:** `scripts/verify-about-dialog-suppression.mjs:104-117` (`parseSuppressionSelectors`),
consumed at `scripts/verify-about-dialog-suppression.mjs:346`, with the false claim printed at
`scripts/verify-about-dialog-suppression.mjs:630` and asserted at
`scripts/verify-about-dialog-suppression.mjs:41-49`

**Issue:** The whole left-hand side of the check is built by one flat brace-pair regex:

```js
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rule = /([^{}]+)\{([^{}]*)\}/g;
```

`[^{}]` cannot cross a nested brace, so the regex silently skips over every at-rule prelude and
harvests the inner rules as if they were top-level. **The condition under which a rule applies is
discarded.** A selector inside `@media print`, `@media (prefers-contrast)`, `@supports`, or
`@layer` is collected as an unconditional suppression.

That is not hypothetical for this file: the shipped stylesheet already opens with
`@media not ((prefers-contrast) and (prefers-color-scheme: light)) { ... }`
(`powerbrowser/branding/dev/content/aboutDialog.css:5-21`), so the very next contrast or
color-scheme edit lands one brace away from the suppression rule, and Phase 2 will emit this file
from `configuration.toml` rather than hand-write it.

Reproduced against the **real** `upstream/browser/base/content/aboutDialog.xhtml`, both
polarities:

| stylesheet mutation | vendor links on screen? | licence link on screen? | check result |
|---|---|---|---|
| the entire shipped suppression rule wrapped in `@media print { ... }` — no selector edited | **yes, all six** | yes | **GREEN, exit 0** |
| `@media print { #bottomBox > hbox { display: none } }` appended — hides nothing on any screen | no | yes | **RED, 2 × `SUPPRESSES THE LICENCE DISCLOSURE`** |

In the first row `parseSuppressionSelectors` returns the identical four selectors it returns on
the correct tree, so assertions 1–5 are all satisfied and the script prints:

```
PASS -- every shipped suppression selector matches upstream markup, every external link in that
markup is reached by a shipped selector in every branding variant, and none reaches the
about:license disclosure link
```

Every clause of that sentence is false. This is the same green-by-construction shape `CR-02`
named and `deferred-items.md` rows 4, 9 and 10 record as a defect class, reached through a
one-line CSS edit that touches no selector — which is precisely the edit a reviewer scanning the
selector list would wave through. The second row is the mirror image: a false red in the commit
gate on a stylesheet that hides nothing, which is a stoppage, not a weakening.

This also makes the header's central claim untrue as written. Lines 41-49 state "BOTH SIDES ARE
DERIVED AT CHECK TIME [...] The left side is whatever selectors the shipped stylesheets actually
declare `display: none` for". The left side is whatever selectors appear in a brace pair whose
body contains `display: none`, in any context or none.

**Fix:** the collector must either understand at-rule nesting or refuse to guess. Refusing is the
smaller, more honest change and matches this file's own "an unreadable selector is an unchecked
selector" stance for the selector grammar — extend that stance to the stylesheet grammar:

```js
export function parseSuppressionSelectors(css) {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    const unsupported = [];
    // Walk brace-balanced blocks so at-rule context is never discarded.
    let depth = 0, i = 0, preludeStart = 0;
    const stack = [];
    for (; i < stripped.length; i++) {
        const c = stripped[i];
        if (c === '{') {
            const prelude = stripped.slice(preludeStart, i).trim();
            stack.push(prelude);
            depth++;
            preludeStart = i + 1;
        } else if (c === '}') {
            const prelude = stack.pop();
            const body = stripped.slice(preludeStart, i);
            if (depth === stack.length + 1 && !prelude.startsWith('@') && /display\s*:\s*none/i.test(body)) {
                const conditional = stack.some((p) => p.startsWith('@'));
                if (conditional) unsupported.push(`${prelude} (inside ${stack.filter((p) => p.startsWith('@')).join(' / ')})`);
                else for (const s of prelude.split(',')) { const t = s.trim(); if (t) out.push(t); }
            }
            depth--;
            preludeStart = i + 1;
        }
    }
    return { selectors: out, unsupported };
}
```

and in `runChecks`, fail by name on every `unsupported` entry:

```js
const { selectors: raw, unsupported } = parseSuppressionSelectors(readFileSync(cssPath, 'utf8'));
for (const u of unsupported) {
    rep.fail(
        `CONDITIONAL SUPPRESSION: ${rel} declares \`display: none\` for ${JSON.stringify(u)} inside an ` +
        `at-rule. This checker evaluates no media or feature condition, so it cannot tell whether that ` +
        `rule applies when the dialog renders -- counting it as coverage would be a green that examined ` +
        `an inapplicable rule. Move the debranding suppression to top level, or extend this collector.`,
    );
}
```

Add a `--self-test` row planting exactly the first mutation above — the whole suppression rule
wrapped in `@media print` — and require the red to name both the at-rule and a surviving
`https://www.mozilla.org` href. Without that row this fix is unproven by the same standard
`CR-02` was judged against.

## Warnings

### WR-01: The suppressed copy is still in the dialog's accessible description

**Status:** open (pass 1; unchanged by 01-20 and 01-21). Re-checked in pass 3:
`upstream/browser/base/content/aboutDialog.xhtml:17` reads
`aria-describedby="version distribution distributionId communityDesc contributeDesc trademark"`.
`communityExperimentalDesc` is **not** in that list, so 01-21's added selector does not widen this
finding — but it does not narrow it either.

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

**Status:** open (pass 1; unchanged by 01-20 and 01-21 — re-verified against
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

### WR-03: The suppression selectors are a hand-kept expectation about upstream markup with no gate — RESOLVED by plans 01-20 and 01-21

**Status:** **Resolved.** Pass 2 recorded the staleness half as landed and said "keep open until
`CR-02` is closed". `CR-02` is now closed by plan 01-21 and the coverage half is landed and
proven red on both the deletion and the narrowing mutation. Both halves are derived at check time
from the tree — the selector list out of the shipped CSS, the element tree out of the real
upstream markup — and the comparison goes red on an addition (a new external link upstream adds)
as well as on a removal (a selector deleted or narrowed). Note that `CR-03` limits how much of the
stylesheet the derivation can see; that is a defect in the collector, not a reopening of this
finding.

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:72-77`,
`powerbrowser/branding/release/content/aboutDialog.css:72-77`;
`scripts/verify-platform.sh:3600, 3665`

**Issue:** `#communityDesc`, `#contributeDesc` and the bottom-row compound are literals about a
file this repo does not own. An ESR rebase that renames an id, wraps the row in another box, or
moves the links makes every one of these rules a silent no-op.

**Fix (applied):** staleness in 01-20, coverage in 01-21.

### WR-04: The divergence check's expectations are still hand-kept, in a check that never runs

**Status:** open (pass 1; unchanged by 01-20 and 01-21).

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

**Status:** open (pass 1; unchanged by 01-20 and 01-21).

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

**Status:** open (pass 1; unchanged by 01-20 and 01-21).

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

**Status:** open (pass 1; unchanged by 01-20 and 01-21).

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

### WR-08: The identical vendor-name→mozilla.org link in `#communityExperimentalDesc` is not suppressed — RESOLVED by plan 01-21

**Status:** **Resolved.** Verified against the code, not the summary. `dff4c63`/`6e4875f` added
`#communityExperimentalDesc` to the comma-separated suppression list at
`powerbrowser/branding/dev/content/aboutDialog.css:73` and
`powerbrowser/branding/release/content/aboutDialog.css:73`; `cmp` reports the two files
byte-identical. Re-walking the real `upstream/browser/base/content/aboutDialog.xhtml` with the
checker's own `parseMarkup`/`parseSelector`/`matches` now yields:

```
COVERED  https://www.mozilla.org/?utm_source=firefox-browser&#38;...   #communityExperimentalDesc
COVERED  about:credits                                                #communityExperimentalDesc
COVERED  https://www.mozilla.org/?utm_source=firefox-browser&#38;...   #communityDesc
COVERED  about:credits                                                #communityDesc
COVERED  https://foundation.mozilla.org/?form=firefox-about           #contributeDesc
COVERED  https://www.mozilla.org/contribute/?utm_source=...           #contributeDesc
visible  about:license                                                (correctly untouched)
COVERED  https://www.mozilla.org/about/legal/terms/firefox/           #bottomBox > hbox > .bottom-link[href^=...]
COVERED  https://www.mozilla.org/privacy/firefox/?utm_source=...      #bottomBox > hbox > .bottom-link[href^=...]
```

All six external links covered; the licence disclosure untouched. The resolution took the
suppression route rather than an exemption list, which is what this finding and `CR-02` both
asked for. Retained for the record; no further action. Note `WR-01` is unaffected —
`communityExperimentalDesc` is not in the dialog's `aria-describedby`.

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:73` and
`powerbrowser/branding/release/content/aboutDialog.css:73`

**Issue:** `upstream/browser/base/content/aboutDialog.xhtml:120-125` carries a second copy of
the suppressed node — same vendor-name label, same mozilla.org target — and it was not in the
selector list. `upstream/browser/base/content/aboutDialog.js:75-76` unhides `#experimental` (and
hides `#communityDesc` in its place) whenever the version string carries an alpha suffix. It is
inert today only because `upstream/browser/config/version.txt` reads `153.1.0`.

**Fix (applied):** added to the same rule, with the reasoning recorded in the stylesheet comment.

### WR-09: The disclosure guard recognises only the literal `display: none`, so any other hiding mechanism bypasses it

**Status:** open (pass 2; unchanged by 01-21, and now load-bearing on a second assertion).
01-21 built assertion 5's coverage half on the same collector, so the same blind spot now also
produces a **false green on coverage**, not only a false green on over-reach: a stylesheet that
suppresses the vendor rows with `visibility: hidden` instead of `display: none` reports every
external link as uncovered (a false red), and one that hides the licence link with
`visibility: hidden` reports it as preserved (a false green). See `CR-03` for the structurally
adjacent defect in the same function.

**File:** `scripts/verify-about-dialog-suppression.mjs:104-117`
(`parseSuppressionSelectors`), consumed at `scripts/verify-about-dialog-suppression.mjs:346`

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

Adjust the vacuity message at line 351 and the PASS line at 630 to say "hiding declarations"
rather than "`display: none` selectors", and add a `--self-test` row planting a
`visibility: hidden` container rule that must go red naming `about:license`. Fold this into the
`CR-03` rewrite of `parseSuppressionSelectors` — the two fixes touch the same function.

### WR-10: The `--self-test` fixture is a hand-kept list of upstream ids and hrefs, and the header denies that it is

**Status:** open (pass 2), and **widened** by 01-21 — see `WR-16`.

**File:** `scripts/verify-about-dialog-suppression.mjs:41-49` (the claim),
`scripts/verify-about-dialog-suppression.mjs:440-471` (`fixtureMarkup`),
`scripts/verify-about-dialog-suppression.mjs:584-591` (the control assertion)

**Issue:** The header states, without qualification:

> This file hand-keeps no list of expected ids, selectors, or hrefs [...] The only authored
> markup in this file is the --self-test fixture, which is a fault-planting harness rather than
> an expectation.

`fixtureMarkup()` hand-keeps `communityDesc`, `communityExperimentalDesc`, `experimental`,
`warningDesc`, `contributeDesc`, `bottomBox`, `trademark`, `bottom-link`, `about:license`,
`about:credits`, and five `mozilla.org` hrefs. It is not merely a harness, because the control at
line 584 asserts `runChecks(dir).failures.length === 0` — i.e. it asserts that the **real shipped
selectors** match the **authored fixture**. That is an expectation about upstream ids in exactly
the shape CLAUDE.md verification rule 2 forbids, running in `--quick`, the commit gate.

`deferred-items.md` row 11(a-ii) records the ceiling and argues "fixture drift can only weaken
the self-test, never the gate". That is true in one direction and false in the other. On an ESR
rebase that renames a container, the correct sequence is: `about-dialog-suppression` goes red
(good), an author updates the stylesheets to the new ids, the real-markup gate goes green — and
`about-dialog-suppression-self-test` now goes **red in `--quick`** on a correct tree, because
the fixture still carries the old ids. A false red in the commit gate is not a weakening, it is
a stoppage, and the recorded mitigation ("re-derive the fixture at the first ESR bump") is a
manual step with no check behind it.

01-21 confirmed this empirically without recording it as such: the SUMMARY's "Issues Encountered"
notes that adding `#communityExperimentalDesc` to the stylesheets turned the control red on
staleness, requiring a same-change fixture edit. That is this finding firing, in the commit gate,
on a correct tree — treated as an expected trap rather than as the recorded ceiling coming due.

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

**Status:** open (pass 2; unchanged by 01-21).

**File:** `scripts/verify-about-dialog-suppression.mjs:124-161` (`parseMarkup`)

**Issue:** The parser maintains an explicit `stack` and derives every `parent` link from it, but:

- `if (closing) { stack.pop(); continue; }` at line 139–142 pops without comparing the closing
  tag name to the stack top, so a mismatched or stray close silently re-parents everything after
  it. `Array.prototype.pop` on an empty array is a no-op, so an extra close cannot even crash.
- `selfClosing` is decided solely by a trailing `/` (line 143). An HTML void element written
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
that is correct. With 01-21's assertion 5 in place the blast radius grew — a mis-parse now also
detaches links from the ancestors that cover them, so the same injection produces spurious
`UNSUPPRESSED VENDOR LINK` reds on a correct stylesheet.

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

**Status:** open (pass 2; unchanged by 01-21, which added no guard).

**File:** `scripts/verify-about-dialog-suppression.mjs:104`, `124`, `237`, `271`, `287` (the
exports) and `scripts/verify-about-dialog-suppression.mjs:622-631` (the unguarded main body)

**Issue:** `parseSuppressionSelectors`, `parseMarkup`, `parseSelector`, `matches` and `runChecks`
are `export`ed, but lines 622–631 execute unconditionally at module scope and end in
`process.exit(0)` or `process.exit(1)`. Any `import { matches } from './verify-about-dialog-suppression.mjs'`
therefore runs the full check against `REPO_ROOT` and terminates the importing process before a
single line of the consumer runs — observed directly in both pass 2 and pass 3: to gather the
coverage evidence in this report I had to strip the trailing main body into a scratch copy,
because importing the module as shipped prints the check's own PASS line and exits.

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

### WR-13: Several of the script's own stated promises still have no planted fault in `--self-test`

**Status:** open (pass 2). 01-21 added two rows, `(e)` and `(f)`, but neither covers any of the
three gaps this finding names; both cover the new assertion 5 instead. The sub-point about
failure counts has since been materially violated — see `WR-14`.

**File:** `scripts/verify-about-dialog-suppression.mjs:501-577` (the `rows` table), against the
promises at `scripts/verify-about-dialog-suppression.mjs:51-55`, `173-180`, and `340-344`

**Issue:** CLAUDE.md requires a new check to "plant faults and require each one to go red naming
the drift". The six rows cover over-reach (a), staleness (b), vacuity (c), missing premise (d),
coverage-by-deletion (e) and coverage-by-narrowing (f). Three assertions the file explicitly
promises are still never planted:

1. **Grammar totality** (line 173–180: "A selector this parser cannot read must never be
   silently skipped"). Nothing plants an unsupported selector. I confirmed manually that
   `#communityDesc:not(.x)` does go red — but that evidence lives in this review, not in the
   repository, which is the arrangement the rule exists to prevent.
2. **Missing markup is a FAIL, never a skip** (line 51–55, the promise the header makes most
   emphatically, and line 290–298 where it is implemented). No row deletes
   `upstream/browser/base/content/aboutDialog.xhtml` from the fixture root. Since this branch
   `return`s early, a regression here would suppress every other assertion at once.
3. **Missing stylesheet** (line 341–344). No row deletes one variant's CSS. This is the branch
   that would fire if a Phase 2 rebrand pipeline renames a variant directory.

A fourth is now owed by 01-21: the **external-set VACUOUS branch** (line 319–326) is a new
assertion with no planted fault. Its sibling — the `links` vacuity branch — has one via row (c);
this one does not.

**Fix:** add four rows and tighten the assertion:

```js
{ label: '(g) unsupported selector -- the grammar must name it, never skip it',
  plant() { for (const rel of CSS_RELS) write(rel, readFileSync(join(dir, rel), 'utf8').replace('#communityDesc,', '#communityDesc:not(.x),')); },
  names: ['outside the grammar', '#communityDesc:not(.x)'] },
{ label: '(h) missing upstream markup -- FAIL, never skip',
  plant() { rmSync(join(dir, MARKUP_REL)); },
  names: ['is missing under', 'fetch-upstream.sh'] },
{ label: '(i) missing variant stylesheet',
  plant() { rmSync(join(dir, CSS_RELS[1])); },
  names: [CSS_RELS[1], 'cannot be derived'] },
{ label: '(j) no external link left in the markup -- coverage over an empty set',
  plant() { write(MARKUP_REL, fixtureMarkup().replace(/https:\/\/[^"]*/g, 'about:blank')); },
  names: ['VACUOUS', 'http/https destination'] },
```

and give each row an expected failure count and class, checked alongside `names`, so an
unintended second red is itself a self-test failure.

### WR-14: Fault row `(b)` is no longer an isolated staleness plant — it now fires six failures across two assertion classes, and nothing went red when that happened

**File:** `scripts/verify-about-dialog-suppression.mjs:515-521` (row `(b)`),
`scripts/verify-about-dialog-suppression.mjs:598-608` (the assertion over a planted row)

**Issue:** Row `(b)` renames `bottomBox` throughout the fixture to plant a staleness fault. With
assertion 5 landed, that single rename now also detaches the two bottom-row vendor links from the
only selector that covered them, so the row fires **both** assertion classes. Measured by running
each row's `plant()` against the fixture and counting `rep.failures`:

| row | failures | classes fired |
|---|---|---|
| control | 0 | — |
| (a) | 2 | `SUPPRESSES THE LICENCE DISCLOSURE` |
| **(b)** | **6** | **`STALE` ×2 + `UNSUPPRESSED VENDOR LINK` ×4** |
| (c) | 2 | `VACUOUS` |
| (d) | 1 | `MISSING PREMISE` |
| (e) | 4 | `UNSUPPRESSED VENDOR LINK` |
| (f) | 2 | `UNSUPPRESSED VENDOR LINK` |

Every other row fires exactly one class. `(b)` is the only impure one, and it became impure in
this change. The harness cannot see it: the assertion at line 598 is
`row.names.filter((n) => !all.includes(n))` over the joined failure text, so a row that goes red
for two reasons is indistinguishable from one that goes red for the intended reason. `WR-13`
recorded the missing count assertion as a latent risk with the note "`(a)` through `(d)` happen
to be independent today — nothing in the harness holds that property"; one plan later the
property is gone and the self-test still prints `PASS`.

The cost is not theoretical. Row `(b)` is the only proof that assertion 3 gates. Its red is now
dominated by four coverage failures, and `console.log(... planted.failures[0])` at line 607 prints
whichever fires first. A future change that weakens assertion 3 while leaving assertion 5 intact
would keep row `(b)` red; it survives today only because `'STALE'` happens to be in its `names`
array, not because the harness enforces class isolation.

**Fix:** make each row declare what it expects and check it, so drift in fault independence is
itself a red:

```js
// rows gain: expect: { count: 2, classes: ['STALE'] }
const classes = [...new Set(planted.failures.map((f) => f.split(':')[0].trim()))].sort();
if (planted.failures.length !== row.expect.count ||
    classes.join('|') !== [...row.expect.classes].sort().join('|')) {
    console.error(
        `${NAME}: --self-test FAIL -- fault ${row.label} went red, but with ${planted.failures.length} ` +
        `failure(s) in classes [${classes}] rather than the ${row.expect.count} in [${row.expect.classes}] ` +
        `it is written to isolate. A plant that trips a second assertion no longer proves the one it targets.`,
    );
    ok = false;
}
```

Then re-scope row `(b)` so it isolates staleness: rename a container that no external link depends
on for coverage, or rename `bottomBox` **and** add a fixture-local selector so the bottom links
stay covered. Either keeps the plant honest.

### WR-15: The coverage failure message offers an escape hatch the checker has no mechanism to honour

**File:** `scripts/verify-about-dialog-suppression.mjs:415-422`

**Issue:** The `UNSUPPRESSED VENDOR LINK` message reads:

> Suppress it by adding a selector, **or record the decision to leave it visible** -- never scope
> this assertion around it with an exemption list [...]

Only the first branch clears the red. There is no mechanism — no annotation, no `deferred-items.md`
read, no anything — by which "recording the decision" makes the check pass, and the same sentence
forbids building one. So the message names two remedies of which exactly one works, and the
non-working one is the one a reader reaches for when suppression is the wrong answer.

That case is not hypothetical. The derived set is *every* `http/https` destination with no host
filter — deliberately, so a new-host link goes red through the same comparison (a good property).
But it means any external link this product would legitimately keep — a support URL, a
jurisdictionally required legal link, a Power-Browser-owned destination added in Phase 2 — reds
`about-dialog-suppression` permanently the day it appears, with the only sanctioned resolution
being to hide it. The commit gate would then be un-passable without either hiding a link the
product wants visible or editing the assertion under a message that forbids editing the assertion.

**Fix:** either build the escape hatch or stop advertising it. Building it without a hand-kept
list is possible, because the decision can be derived from the artifact under test rather than
authored in the checker — for example, require a link the product intends to keep to carry the
product's own host, and derive that host from `inventory/brand-tokens.json` (already the single
source of truth for brand values) rather than from a literal in this file:

```js
// Derived, not hand-kept: a destination on the product's own host is not a vendor link.
const OWN_HOSTS = new Set(
    Object.values(JSON.parse(readFileSync(join(root, 'inventory/brand-tokens.json'), 'utf8')).hosts ?? {}),
);
```

If that is out of scope for Phase 1 — a defensible call — then delete the "or record the decision
to leave it visible" clause and say plainly that the only resolution is a selector, so the message
does not describe an affordance that is not on screen (CLAUDE.md's user-facing-copy rule applied to
developer copy, which this file already follows elsewhere).

### WR-16: 01-21 widened `WR-10`'s fixture coupling from ids to ids *and* hrefs, and hard-coded upstream URLs into two self-test assertions

**File:** `scripts/verify-about-dialog-suppression.mjs:440-471` (`fixtureMarkup`),
`scripts/verify-about-dialog-suppression.mjs:492-495` (`restore`),
`scripts/verify-about-dialog-suppression.mjs:554-558` and `575` (the `names` arrays)

**Issue:** `restore()` pairs the **real shipped stylesheets** with the **authored fixture**, and
the control requires zero failures. Before 01-21 that coupling ran through ids and class names
only. Assertion 5 extends it to hrefs: every `http/https` value in `fixtureMarkup()` must now also
be covered by the real selector set, so the fixture must track the shipped
`[href^="https://www.mozilla.org"]` prefix as well as the container ids. The commit-gate false-red
surface grew, in the change that was meant to strengthen the gate.

Rows `(e)` and `(f)` then hard-code upstream URLs directly into their `names` arrays —
`'https://www.mozilla.org/about/legal/terms/firefox/'` at line 556 and
`'https://www.mozilla.org/privacy/firefox/'` at line 575 — and row `(f)`'s `plant()` hard-codes the
shipped prefix `https://www.mozilla.org` in its regex at line 570. Three literals about a file this
repo does not own, in the commit gate, in a file whose header says it hand-keeps none.

Both rows do fail *loudly* if their regex stops matching (the plant becomes a no-op, the control-
equal tree yields zero failures, and the harness reports "was NOT rejected"), so this is a
maintenance and honesty problem rather than a hole — but it is exactly the maintenance problem
`WR-10` predicted, one plan earlier than expected.

Row `(e)`'s `names` also includes the bare string `'aboutDialog.css'`, which is the tail of both
variant paths and of nothing else in the message. It cannot distinguish the dev stylesheet from
the release one, so the criterion "the failure names the stylesheet" is asserted by a string that
would match either. `CSS_RELS[0]` is the value that actually tests the claim.

**Fix:** apply `WR-10` option 1 — author a minimal synthetic stylesheet beside `fixtureMarkup()` so
the hermetic row has no coupling to the shipped tree at all, and derive the plant regexes from that
synthetic CSS rather than from the shipped prefix. Independently and cheaply, replace
`'aboutDialog.css'` in row `(e)`'s `names` with `CSS_RELS[0]`.

## Info

### IN-01: The scanner fixture still spells the identifier form as rendered text

**Status:** open (pass 1; unchanged by 01-20 and 01-21).

**File:** `scripts/verify-platform.sh:2278`

**Issue:** The `shell-csp-inline-attrs` self-test fixture contains
`<div id="powerbrowser-loading">PowerBrowser</div>`. It is a fixture reproducing pre-fix markup,
so it is not shipped and not user-facing — but with 01-19 landed it is the last rendered-text
spelling of the compact form in the tree, and `scripts/` is outside the preflight's display
surface set. The risk is copy-back.

**Fix:** Change the fixture line to `Power Browser`, or add a one-line comment marking it as a
deliberate pre-fix reproduction.

### IN-02: Nothing asserts the two variant stylesheets stay identical

**Status:** open (pass 1). 01-20 and 01-21 both edited the two stylesheets and they remain
byte-identical (`cmp` clean, re-verified in pass 3), but the property is still enforced only by
each plan's own `<automated>` line, not by a registered row. Two consecutive plans have now
relied on hand-run `cmp`.

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

**Status:** open (pass 2; unchanged by 01-21, and now sharper — `CR-03`'s fix, if taken, makes
the two implementations diverge further).

**File:** `scripts/verify-about-dialog-suppression.mjs:475-481`

**Issue:** `parseSuppressionSelectors` strips block comments before looking for `display: none`
(line 105) — deliberately, because "this stylesheet's own comment block quotes several"
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

**Status:** open (pass 2; unchanged by 01-21). The same wrong claim is repeated in
`powerbrowser/branding/dev/content/jar.mn:6-7` ("the third entry of its linkset"), so the fix is
two files, not one.

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:39-40` and
`powerbrowser/branding/release/content/aboutDialog.css:39-40`

**Issue:** "this stylesheet is the third and last entry in that file's linkset".
`upstream/browser/base/content/aboutDialog.xhtml:25-38` shows the `<linkset>` holds five
entries: three `rel="stylesheet"` links, of which `chrome://branding/content/aboutDialog.css` is
indeed the third, followed by two `rel="localization"` links. It is the last *stylesheet*, not
the last entry. Predates 01-20, but it is load-bearing prose — the claim is what justifies
treating this file as the override hook.

**Fix:** "the third and last *stylesheet* in that file's linkset".

### IN-05: Assertion 1's non-vacuity guard is satisfied by the linkset's own stylesheet references, so it can effectively never fire

**File:** `scripts/verify-about-dialog-suppression.mjs:303-310`

**Issue:** The guard is `elements.filter((e) => e.href !== null)` and fails when that is empty,
described in the comment as "a markup walk that found no links has proven nothing about which
links survive". But `href` in this markup is not only a link attribute — the `<linkset>` uses it
for stylesheet and localization references. Walking the real file:

```
chrome://global/skin/global.css       <- <html:link rel="stylesheet">
chrome://browser/content/aboutDialog.css
chrome://branding/content/aboutDialog.css
branding/brand.ftl                    <- <html:link rel="localization">
browser/aboutDialog.ftl
... then the six external links and about:license
```

Five of the ten href-bearing elements are resource references. So `links.length` stays at five
even if every content link in the dialog disappears, and the guard that reads "found no links"
cannot fire while the stylesheet the check itself depends on is still linked.

It is harmless today because 01-21's external-set guard at line 319–326 catches the real vacuity
case and does so with a much better diagnosis. But the older guard now reads as protection it
does not provide, and it `return`s early — so if it ever *did* fire it would suppress the better
guard below it.

**Fix:** either restrict it to what it means, or delete it as superseded:

```js
const links = elements.filter((e) => e.href !== null && e.tag !== 'html:link' && e.tag !== 'link');
```

### IN-06: `parseMarkup` never decodes XML character references, so `href` values carry raw entities

**File:** `scripts/verify-about-dialog-suppression.mjs:145-149` (attribute extraction),
`scripts/verify-about-dialog-suppression.mjs:265` (`startsWith` prefix test),
`scripts/verify-about-dialog-suppression.mjs:165-171` (`describe`)

**Issue:** Upstream writes `&#38;` for `&` in every `utm_`-bearing href. The attribute regex
captures the raw attribute text with no entity decoding, so `el.href` is
`https://www.mozilla.org/?utm_source=firefox-browser&#38;utm_medium=...` rather than the URL the
browser resolves. Two consequences:

1. `describe()` prints the encoded form in every failure message — visible in the SUMMARY's own
   recorded red — so a developer copying the href out of a failure gets a string that is not the
   destination.
2. `matchCompound`'s `el.href.startsWith(compound.attribute.value)` compares against the encoded
   form. A `[href^=...]` prefix long enough to reach an escaped character would silently never
   match, producing a false `STALE` and a false `UNSUPPRESSED VENDOR LINK`. The shipped prefix is
   host-level so it is unaffected today; `WR-15`'s narrowing fault `(f)` shows how easily a longer
   prefix is written.

**Fix:** decode the standard set where the attribute is captured — three lines, no dependency:

```js
const decode = (s) => s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n]));
attrs[a[1]] = decode(a[2] !== undefined ? a[2] : a[3]);
```

### IN-07: The external set silently excludes protocol-relative and non-`http(s)` outbound schemes

**File:** `scripts/verify-about-dialog-suppression.mjs:318`

**Issue:** `external` is `/^https?:/i.test(e.href)`. A protocol-relative `//example.com/x`, a
`mailto:`, or a `ftp:` destination is not in the derived set and is therefore never required to be
covered. Symmetrically, internal `about:` pages other than `about:license` sit in a blind spot:
they are neither protected by assertion 4 nor required by assertion 5, so a selector that hides
`about:credits` or `about:rights` produces no signal in either direction. None of these forms is
present in the current markup — this is a note about what the derived set's boundary is, not a
live defect — but the header's framing ("the set is every http/https destination the dialog
carries, so an ESR rebase that adds a link to a NEW host is caught") reads broader than the code.

**Fix:** widen the test to "any scheme that leaves the product", or state the boundary in the
comment at line 312–317 so the next reader does not over-trust it:

```js
const external = elements.filter((e) => e.href !== null && !/^(?:about|chrome|resource|jar):/i.test(e.href) && !/^[a-z]+\.ftl$/i.test(e.href));
```

### IN-08: The packaged stylesheet is now 60 comment lines to 17 declaration lines, and cites planning-artifact identifiers that ship in `omni.ja`

**File:** `powerbrowser/branding/dev/content/aboutDialog.css` and
`powerbrowser/branding/release/content/aboutDialog.css` (whole file; the block added by 01-21 is
lines 48-56)

**Issue:** `jar.mn:20` packages this file as `content/branding/aboutDialog.css`, so its full text
ships inside the built `omni.ja`. It is now 77 lines of which 60 are comment prose, and 01-21 added
nine more that cite `01-REVIEW.md WR-08, CR-02` alongside the existing `01-VERIFICATION.md Truth 9,
01-REVIEW.md CR-01`. Each gap-closure pass has added a paragraph and a pair of artifact IDs.

CLAUDE.md's no-internal-identifiers rule governs *user-facing text*, and a CSS comment is never
rendered, so this is not a violation. But planning-artifact IDs are the least durable references in
the tree — `.planning/` is archived at milestone completion — and they are shipping to end users'
installed files, in a file Phase 2 is about to generate from `configuration.toml`, where a
60-line comment block becomes 60 lines of template.

**Fix:** keep the *reasoning* in the stylesheet (it is genuinely load-bearing — the mixed bottom row
is not obvious) and move the *provenance* out. One line replaces both citation clusters:

```css
/* Rationale and the history behind the qualified form: see
   scripts/verify-about-dialog-suppression.mjs, which gates every claim made here. */
```

---

_Reviewed: 2026-09-01 (pass 3, plan 01-21), 2026-09-01 (pass 2, plan 01-20), 2026-08-31 (pass 1, plans 01-18/01-19)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
