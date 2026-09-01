---
phase: 01-platform-extraction-and-rename
reviewed: 2026-08-31T00:00:00Z
depth: standard
scope: gap-closure surface only (plans 01-18 and 01-19, diff e24f210^..HEAD)
files_reviewed: 7
files_reviewed_list:
  - powerbrowser/branding/dev/content/aboutDialog.css
  - powerbrowser/branding/dev/content/jar.mn
  - powerbrowser/branding/release/content/aboutDialog.css
  - powerbrowser/branding/release/content/jar.mn
  - powerbrowser/shell/powerbrowser.xhtml
  - scripts/verify-branding-preflight.mjs
  - scripts/verify-platform.sh
findings:
  critical: 1
  warning: 8
  info: 2
  total: 11
status: issues_found
---

# Phase 01: Code Review Report (gap-closure surface)

**Reviewed:** 2026-08-31
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Scope — read this before treating the result as a phase verdict

This report covers **only** the seven files changed by plans 01-18 and 01-19, the gap-closure
run whose diff is `e24f210^..HEAD`. It **replaces** the prior full-phase `01-REVIEW.md`
(commit `8364662`), which covered the other 17 plans. Nothing here re-reviews those 17 plans,
and a clean line in this report is not a clean bill on Phase 01 as a whole. The earlier report
remains readable in git history at `8364662`.

## Summary

Both gap closures do what they claim mechanically. `chrome://branding/content/aboutDialog.css`
is now packaged by both variants (the G-01-3 404), the shell chrome document spells the display
form in the two places that render (the G-01-25 title-bar leak), and each fix arrived with a
gate: preflight section 9 (packaging completeness, derived from the content directory) and
preflight section 6's shell-markup read set (derived from `powerbrowser/shell/jar.mn`). I ran
both — `node scripts/verify-branding-preflight.mjs --self-test`, five plants, all red by name;
`scripts/verify-platform.sh --quick`, 24 checks, all PASS. The `_branding_variant_divergence_impl`
literal fix does preserve the dev-vs-release divergence the function exists to assert
(`Power Browser Dev` ≠ `Power Browser`), and both mutation controls in its self-test still go
red — verified by running `--only branding-variant-divergence-self-test`.

That green does not reach the semantics of what shipped, and that is where the defects are.

The one blocker is in the About-dialog suppression: `#bottomBox > hbox` is the whole link row,
and one of the three links in it is `about:license`, not an outbound Mozilla URL. Suppressing
it removes the product's only in-UI route to the open-source licensing disclosure — a
consequence the file's own comment does not mention, because the comment reasons about the row
as "the stock outbound-link rows" when a third of it is not outbound.

The remaining warnings cluster into two classes. First, the CSS change is narrower than its
comments claim: it does not stop the wordmark 404 it blames itself for, it leaves an identical
vendor-name→mozilla.org sibling node unsuppressed, and hidden-but-`aria-describedby` text is
still announced. Second, the new gates carry hand-kept assumptions of exactly the kind
CLAUDE.md's verification rules forbid — the suppression selectors are an unguarded expectation
about upstream markup, the divergence check's expectations are still literals in a check that
never runs, and the new jar.mn parser only recognises one of the two legal jar.mn line shapes.

## Critical Issues

### CR-01: The About-dialog suppression also removes the `about:license` disclosure link

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:51-55` and
`powerbrowser/branding/release/content/aboutDialog.css:51-55`

**Issue:** The rule hides `#bottomBox > hbox` wholesale. `upstream/browser/base/content/aboutDialog.xhtml:139-143`
shows what is in that row:

```xhtml
<hbox pack="center">
  <label is="text-link" class="bottom-link" useoriginprincipal="true" href="about:license" data-l10n-id="bottomLinks-license"/>
  <label is="text-link" class="bottom-link" href="https://www.mozilla.org/about/legal/terms/firefox/" .../>
  <label is="text-link" class="bottom-link" href="https://www.mozilla.org/privacy/firefox/..." .../>
</hbox>
```

Two of the three are outbound mozilla.org URLs — the reported defect. The first is
`about:license`, an internal page and the **only** in-product path to the aggregated
open-source licence text for everything this build links. The file's comment characterises the
whole row as "Licensing Information, Terms of Use and Privacy Notice" and suppresses it as a
unit without noting that removing "Licensing Information" is a disclosure change rather than a
debranding change. `#trademark` was deliberately preserved for exactly this reason; the licence
link deserves the same treatment and did not get it. Nothing replaces it: there is no
Power-Browser-authored licence surface in this tree, and rule 5 forbids authoring browser
chrome, so the link is simply gone.

**Fix:** Suppress by target rather than by container, which is both narrower and self-documenting.
In both variant stylesheets, replace the `#bottomBox > hbox` selector with:

```css
/* Only the outbound rows. about:license is an internal page and the product's
   only route to the aggregated open-source licence text -- it stays. */
#bottomBox > hbox > .bottom-link[href^="https://www.mozilla.org"] {
  display: none;
}
```

This keeps the row (and its `pack="center"` layout) with a single visible "Licensing
Information" link. If the row is genuinely meant to go, the licence page needs a replacement
affordance planned before it does — that is a decision, not a CSS detail.

## Warnings

### WR-01: The suppressed copy is still in the dialog's accessible description

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:51-55` and
`powerbrowser/branding/release/content/aboutDialog.css:51-55`

**Issue:** `upstream/browser/base/content/aboutDialog.xhtml:17` puts both suppressed nodes in
the dialog's description chain:

```xhtml
aria-describedby="version distribution distributionId communityDesc contributeDesc trademark"
```

Under the accessible-name-and-description algorithm, a node that is hidden but **directly
referenced** by `aria-labelledby`/`aria-describedby` is not skipped — the referenced-node
exception overrides the hidden-node rule. So a screen-reader user still hears the community
blurb (whose visible label is this product's vendor name pointing at mozilla.org) and the
donation copy that `display: none` was added to remove. The suppression is visual only, and the
comment's rationale ("its visible label is this product's own vendor name while its target is
mozilla.org — the reported defect in its worst instance") applies verbatim to the announced
text.

**Fix:** CSS cannot reach this; `aria-describedby` is a literal attribute in upstream markup.
Either drop `communityDesc contributeDesc` from that attribute in the patch stack (a one-token
hunk in the same file the suppression already depends on), or record the residual explicitly in
the phase's deferred items so it is not mistaken for closed. Silently shipping "hidden, but
still announced" is the worse of the two.

### WR-02: Removing the `#rightBox` block does not stop the 404 its replacement comment blames it for

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:23-31` and
`powerbrowser/branding/release/content/aboutDialog.css:23-31`

**Issue:** The comment says the deleted `padding-top: 64px` "would reserve an empty 64px band
above the version text for an image that 404s". The image request is not ours to delete —
`upstream/browser/base/content/aboutDialog.css:32-44` sets it:

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

**Fix:** One declaration removes the broken request and makes the comment true, at the same
place, in both variants:

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

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:51-55`,
`powerbrowser/branding/release/content/aboutDialog.css:51-55`;
`scripts/verify-platform.sh` (no corresponding check — `grep -rn aboutDialog scripts/` returns
only `verify-branding.mjs`'s Theia dialog and the preflight's own comments)

**Issue:** `#communityDesc`, `#contributeDesc` and `#bottomBox > hbox` are literals about a file
this repo does not own. An ESR rebase that renames an id, wraps the row in another box, or moves
the links makes every one of these rules a silent no-op: the CSS still parses, the check set
still passes, and the mozilla.org links come back on screen with nothing red. That is precisely
the failure mode 01-18 existed to close — a chrome resource that fails silently — reintroduced
one layer up, and the repo already has the machinery to catch it (`scripts/rebase-upstream.sh`
runs the static gates on every rebase).

**Fix:** Add one row to the registry backed by a derived comparison: parse the selector list out
of `powerbrowser/branding/*/content/aboutDialog.css` and require every id/selector it names to
resolve in `upstream/browser/base/content/aboutDialog.xhtml`, failing by name on the ones that
do not. Give it a `--self-test` that renames one id in a fixture copy of the upstream markup and
requires the check to go red naming that id.

### WR-04: The divergence check's expectations are still hand-kept, in a check that never runs

**File:** `scripts/verify-platform.sh:2763-2769`, `scripts/verify-platform.sh:2812-2813`,
`scripts/verify-platform.sh:2827`, `scripts/verify-platform.sh:3868`

**Issue:** 01-19 corrected `"PowerBrowser Dev"`/`"PowerBrowser"` to `"Power Browser Dev"`/
`"Power Browser"` in four places, but left them as literals inside the check. CLAUDE.md's
verification rule 2 is explicit: *derive from the tree and compare; do not hand-keep an
expectation list*. `inventory/brand-tokens.json`'s `brand_display_expectations.variants.*.brand_full_name`
already carries both values, is hand-authored from the recorded decisions, and is what
`verify-branding-preflight.mjs` compares against — this check could read it and stop being a
second, drifting copy.

The drift mattered because nothing could catch it. `branding-variant-divergence` reads
`objdir-release/dist/bin/...`, which does not exist (the declined ~47m release build), and it is
therefore excluded via ledger entry 10 at line 3868. Its self-test exercises synthesised temp
files, so it goes green on any pair of literals that happen to be internally consistent. The
wrong expectation could sit there indefinitely — and did. Correcting the literals restores the
value but not the property; the next rename reproduces the same drift.

**Fix:** Read the two expected values from the inventory inside the node block, e.g. pass
`brand_display_expectations.variants.dev.brand_full_name` and `.release.brand_full_name` as two
further argv entries from `check_branding_variant_divergence`, and have the self-test pass its
own synthesised pair so it stays independent of the tree. The dev-vs-release **divergence**
assertion (dev carries a suffix release does not) is the part worth keeping literal.

### WR-05: The new jar.mn parser recognises only one of the two legal manifest line shapes

**File:** `scripts/verify-branding-preflight.mjs:566-571`

**Issue:**

```js
const m = raw.split('#')[0].trim().match(/^(\S+)\s+\((\S+)\)$/);
if (m) entries.push({ destination: m[1], source: m[2] });
```

A jar.mn entry may legally omit the parenthesised source when destination and source paths
coincide — and that is the dominant form in the manifests this checker is modelled on.
`upstream/browser/branding/official/content/jar.mn` uses it for eleven of its seventeen entries,
including, exactly:

```
  content/branding/aboutDialog.css
```

Such a line matches nothing here, so it lands in neither `sources`, `entries`, nor
`packagedDestinations`. Consequences, in order of severity: (a) direction (a) reports a
correctly packaged resource as *not packaged* and the check goes red on a good tree — and it
would have done so if 01-18 had written the packaging line the way upstream writes it;
(b) direction (b) never validates that source's existence; (c) the divergence comparison sees a
truncated destination set on one side and can fire spuriously. A checker that goes red on
correct input gets switched off, which the file's own section-6 comment already argues.

**Fix:** Accept both shapes and keep the non-vacuity property:

```js
const line = raw.split('#')[0].trim();
if (!line || line.endsWith(':') || line.startsWith('%')) continue;
const paren = line.match(/^(\S+)\s+\((\S+)\)$/);
if (paren) entries.push({ destination: paren[1], source: paren[2] });
else if (/^\S+$/.test(line)) entries.push({ destination: line, source: line.replace(/^content\/branding\//, '') });
```

Adjust the shorthand's source derivation to whatever this tree's convention is, but do not leave
a legal line silently unparsed.

### WR-06: The shell-markup non-vacuity guard counts manifest entries, not readable files

**File:** `scripts/verify-branding-preflight.mjs:413-428` and `437-439`

**Issue:** `shellMarkup` is built from `jar.mn` text alone, and the emptiness guard tests
`shellMarkup.length === 0`. The leak loop then does:

```js
const text = readText(root, rel);
if (text === null) continue;
```

So if `powerbrowser/shell/jar.mn` ships a markup file that has been renamed or deleted,
`shellMarkup.length` is still 1, the guard stays green, `readText` returns null, and the scan
reads **zero lines** while reporting a clean run — the vacuous pass the surrounding comment
claims to have closed. The sibling idiom the comment cites does not have this hole:
`shell-csp-inline-attrs` (`scripts/verify-platform.sh:2295-2300`) explicitly fails with
"jar.mn ships '$rel' but ... does not exist". The copy is weaker than the original.

Second, smaller gap in the same derivation: `/\(([^)]+\.x?html)\)/g` covers `.html` and `.xhtml`
only, while the sibling covers `xhtml|html|xul|js|mjs`. A `.xul` chrome document would be
packaged and unscanned.

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

**File:** `scripts/verify-branding-preflight.mjs:534`, `541-545`

**Issue:** `readdirSync` is called without `withFileTypes`, and everything except `jar.mn` and
`moz.build` is asserted to be a packaged chrome resource. A subdirectory under `content/`, a
`README.md`, an editor backup, or a `.gitkeep` therefore produces a false
"is a chrome resource that ... does not package" failure with no way to resolve it except adding
a nonsense packaging line or growing the hand-kept exclusion set the comment specifically says
it will not keep. The scope note two paragraphs above ("`powerbrowser/shell/` deliberately mixes
chrome resources with non-chrome files, so applying the same rule there would need a hand-kept
exclusion list") shows the author saw the hazard and then left the branding side sensitive to it
anyway.

**Fix:** Filter to regular files and to plausible chrome resource extensions, which keeps the set
derived while removing the false-red surface:

```js
resources = readdirSync(join(root, contentRel), { withFileTypes: true })
    .filter((d) => d.isFile() && !CONTENT_BUILD_INPUTS.has(d.name))
    .map((d) => d.name)
    .sort();
```

If a subdirectory of chrome resources is ever legitimate, recurse instead of ignoring — but do
not keep counting directories as files.

### WR-08: The identical vendor-name→mozilla.org link in `#communityExperimentalDesc` is not suppressed

**File:** `powerbrowser/branding/dev/content/aboutDialog.css:51-55` and
`powerbrowser/branding/release/content/aboutDialog.css:51-55`

**Issue:** `upstream/browser/base/content/aboutDialog.xhtml:120-125` carries a second copy of the
suppressed node:

```xhtml
<vbox id="experimental" hidden="true">
  <description class="text-blurb" id="communityExperimentalDesc" data-l10n-id="community-exp">
    <label is="text-link" href="https://www.mozilla.org/?utm_source=firefox-browser..." data-l10n-name="community-exp-mozillaLink"/>
```

Same vendor-name label, same mozilla.org target — the defect the comment calls "the reported
defect in its worst instance" — and it is not in the selector list.
`upstream/browser/base/content/aboutDialog.js:67-76` unhides `#experimental` (and hides
`#communityDesc` in its place) whenever `Services.appinfo.version` matches `/a\d+$/`. It is
inert today only because `upstream/browser/config/version.txt` reads `153.1.0` with no alpha
suffix. Any move onto a nightly-style version string re-exposes the exact link that was just
suppressed, in the branch where the suppression is bypassed by design.

**Fix:** Add it to the same rule and say why in the comment:

```css
#communityDesc,
#communityExperimentalDesc,   /* the nightly-channel twin of the above; inert at ESR versions, live the moment the version string carries an alpha suffix */
#contributeDesc,
```

## Info

### IN-01: The scanner fixture still spells the identifier form as rendered text

**File:** `scripts/verify-platform.sh:2278`

**Issue:** The `shell-csp-inline-attrs` self-test fixture contains
`<div id="powerbrowser-loading">PowerBrowser</div>`. It is a fixture reproducing pre-fix markup,
so it is not shipped and not user-facing — but with 01-19 landed it is the last rendered-text
spelling of the compact form in the tree, and `scripts/` is outside the preflight's display
surface set (recorded deliberately in `9112503`). The risk is copy-back: it reads as the shell's
markup and would reintroduce the leak if pasted.

**Fix:** Change the fixture line to `Power Browser` — it is decoy content for an inline-attribute
scan and nothing about the fixture's purpose depends on the string — or add a one-line comment
marking it as a deliberate pre-fix reproduction.

### IN-02: Nothing asserts the two variant stylesheets stay identical

**File:** `powerbrowser/branding/dev/content/aboutDialog.css`,
`powerbrowser/branding/release/content/aboutDialog.css`,
`scripts/verify-branding-preflight.mjs:597-612`

**Issue:** The two files are byte-identical and the divergence comment at 609 states that is by
design, but section 9(c) compares only the set of packaged **destination names**. Content
divergence, and a manifest that packages the right destination from a different source, both
pass. `branding-variant-divergence` compares `brand.properties` and the titlebar pref only. So
an edit applied to one variant's stylesheet and not the other — the exact "fix one variant,
forget the other" risk 9(c) names — is undetected.

**Fix:** In 9(c), compare `destination → sha256(source contents)` maps rather than destination
sets, excluding the entries whose divergence is deliberate. That keeps the check derived and
makes it catch the case its own comment describes.

---

_Reviewed: 2026-08-31_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
