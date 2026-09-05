---
status: diagnosed
trigger: "G-01-3 (UAT test 3, minor): In the firefox about it looks good but I would get rid of these links"
created: 2026-08-31T00:00:00Z
updated: 2026-08-31T00:00:00Z
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  status: diagnosed
---

## Current Focus

bug_class: Bohrbug (deterministic — links render on every open of Help > About)
hypothesis: CONFIRMED — links are hard-coded in stock upstream aboutDialog.xhtml markup; the only branding-side suppression channel (chrome://branding/content/aboutDialog.css) is dead because jar.mn does not package it
test: complete
expecting: n/a
next_action: return diagnosis (goal: find_root_cause_only)

reasoning_checkpoint:
  hypothesis: "The five links appear because (1) upstream aboutDialog.xhtml hard-codes them unconditionally AND (2) the branding CSS hook that could hide them (chrome://branding/content/aboutDialog.css) never loads, since powerbrowser/branding/{dev,release}/content/jar.mn deliberately omits aboutDialog.css from the chrome package"
  confirming_evidence:
    - "upstream/browser/base/content/aboutDialog.xhtml:131-133 and :139-142 contain the five hrefs verbatim (foundation.mozilla.org donate, mozilla.org/contribute, about:license, mozilla.org/about/legal/terms/firefox, mozilla.org/privacy/firefox)"
    - "Built tree confirms the dead hook: objdir/dist/bin/browser/chrome/browser.manifest registers 'content branding browser/content/branding/' and that directory contains ONLY icon{16,32,48,64,128}.png — no aboutDialog.css — so the <html:link href='chrome://branding/content/aboutDialog.css'> in aboutDialog.xhtml (linkset, lines 25-39) 404s silently"
    - "grep of patches/*.patch for aboutDialog|bottomLinks|helpus returns zero matches — no patch touches the dialog"
  falsification_test: "If the links were pref-driven, blanking a pref in firefox-branding.js would remove them — but the hrefs are literal attributes in the xhtml, no pref read is involved; if a patch produced them, grep of patches/ would match — it does not"
  fix_rationale: "Packaging the (already-existing, currently dead) branding aboutDialog.css and adding display:none rules removes the rows through the exact hook upstream provides to branding, with zero Gecko patch"
  blind_spots: "Did not launch the browser to visually re-confirm (UAT screenshot is the observation); did not verify release-branding build variant end-to-end (same jar.mn omission present, same mechanism)"
  candidate_causes:
    - "code (upstream): aboutDialog.xhtml hard-codes the five link elements unconditionally — no channel/branding ifdef guards them"
    - "config/packaging (this tree): jar.mn stub in both branding dirs omits aboutDialog.css, so the branding stylesheet hook is inert"
    - "data (prefs): firefox-branding.js — eliminated, links are not pref-driven"
  and_gate: "yes — both conditions must hold for the symptom: upstream ships the links AND the branding-side suppression channel is unpackaged. Fixing either side suppresses the rows; the packaging side is the one inside our rebrand surface"

## Symptoms

expected: About dialog shows only Power Browser naming, no Mozilla-destined links (truth G-01-3: "The About dialog carries only Power Browser user-facing text; no stock Mozilla outbound-link row survives in the rebranded dialog")
actual: About Power Browser Dev dialog shows links: "Make a donation", "get involved!", "Licensing Information", "Terms of Use", "Privacy Notice". Naming itself correct (About Power Browser Dev / DeBIOS Foundation / Extended Support Release 153.1.0esr). Verbatim user report: "In the firefox about it looks good but I would get rid of these links"
errors: None reported
reproduction: Launch objdir/dist/bin/powerbrowser, open Help > About
started: Discovered during UAT 2026-09-01; present since the About dialog rebrand landed (never suppressed)

## Eliminated

- hypothesis: The links are pref-driven and firefox-branding.js missed the relevant URL prefs
  evidence: All five hrefs are literal attributes in upstream/browser/base/content/aboutDialog.xhtml (131-133, 139-142); no pref read involved. firefox-branding.js already blanks ~20 endpoint prefs but none of these links consult a pref.
  timestamp: 2026-08-31
- hypothesis: An existing patch (010/020) touches the About dialog and reintroduced/left the links
  evidence: grep -i 'aboutDialog|bottomLinks|helpus' patches/*.patch → zero matches. Neither patch touches the dialog.
  timestamp: 2026-08-31
- hypothesis: aboutDialog.js shows/hides these rows conditionally (channel/pref) and the dev channel enables them
  evidence: upstream/browser/base/content/aboutDialog.js only toggles #experimental vs #communityDesc (lines 75-76) and the #release label (119); #contributeDesc and the #bottomBox link row are unconditional.
  timestamp: 2026-08-31

## Evidence

- timestamp: 2026-08-31
  checked: .planning/debug/knowledge-base.md
  found: No knowledge base exists yet
  implication: No known-pattern candidate; fresh investigation
- timestamp: 2026-08-31
  checked: upstream/browser/base/content/aboutDialog.xhtml
  found: |
    Five reported links, all hard-coded hrefs:
    - :132 "Make a donation" (helpus-donateLink) → https://foundation.mozilla.org/?form=firefox-about
    - :133 "get involved!" (helpus-getInvolvedLink) → https://www.mozilla.org/contribute/?...campaign=about-dialog
    - :140 "Licensing Information" (bottomLinks-license) → about:license (internal MPL license page, not outbound)
    - :141 "Terms of Use" (bottom-links-terms) → https://www.mozilla.org/about/legal/terms/firefox/
    - :142 "Privacy Notice" (bottom-links-privacy) → https://www.mozilla.org/privacy/firefox/?...campaign=about-dialog
    PLUS two unreported Mozilla-destined links in #communityDesc (:127-130): community-mozillaLink → https://www.mozilla.org/... rendered with label text "{ -vendor-short-name }" = "DeBIOS Foundation" (brand.ftl:21), and community-creditsLink → about:credits rendered as "global community". The dialog therefore shows a link LABELLED "DeBIOS Foundation" that NAVIGATES to mozilla.org.
  implication: Markup-level cause; prefs cannot suppress these
- timestamp: 2026-08-31
  checked: aboutDialog.xhtml linkset (lines 25-39)
  found: Third stylesheet link is chrome://branding/content/aboutDialog.css — upstream's designed hook for branding to restyle/suppress dialog content
  implication: A branding-CSS suppression path exists without any Gecko patch
- timestamp: 2026-08-31
  checked: powerbrowser/branding/{dev,release}/content/jar.mn + built chrome registration
  found: Both jar.mn stubs package ONLY the five icon PNGs; header comment says aboutDialog.css is "deliberately" not referenced ("out of Phase 3's scope" — a decision inherited from the originating product, now stale since Phase 1 added a real aboutDialog.css with Power Browser UI-SPEC colors to both branding dirs). Built tree confirms: objdir/dist/bin/browser/chrome/browser/content/branding/ contains only icons; browser.manifest registers the content branding package. chrome://branding/content/aboutDialog.css 404s silently.
  implication: The existing powerbrowser/branding/*/content/aboutDialog.css is DEAD CODE in the current build — its dark-neutral restyle (replacing Mozilla purple) is also not being applied. Fixing the packaging both activates the intended restyle and opens the link-suppression path.
- timestamp: 2026-08-31
  checked: powerbrowser/branding/dev/pref/firefox-branding.js
  found: Blanks startup/update/GMP/addons/push/region endpoint prefs; none correspond to the dialog links
  implication: Pref surface is irrelevant to this gap
- timestamp: 2026-08-31
  checked: .mozconfig + scripts/fetch-upstream.sh ensure_branding_overlay
  found: --with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding/dev}; upstream/powerbrowser is a git-excluded symlink to ../powerbrowser, so branding edits live entirely in this tree, outside the patch stack
  implication: jar.mn/CSS changes in powerbrowser/branding/ are NOT Gecko modifications — hard rule 2 is not implicated
- timestamp: 2026-08-31
  checked: scripts/verify-endpoints.sh scope
  found: It resolves PREF-defined endpoints from the built defaults and compares against an expect list; hard-coded user-clicked hrefs in chrome markup are outside its scope
  implication: The endpoint allowlist gate neither catches nor blocks these links; no gate currently covers user-facing outbound hrefs in chrome markup

## Resolution

root_cause: |
  Two contributing conditions (AND-gate):
  1. upstream/browser/base/content/aboutDialog.xhtml hard-codes the link rows unconditionally — #contributeDesc (:131-133, donate/get-involved) and the #bottomBox hbox (:139-142, license/terms/privacy) — with Mozilla-destined literal hrefs; labels come from upstream aboutDialog.ftl (helpus, bottomLinks-license, bottom-links-terms, bottom-links-privacy). #communityDesc (:127-130) additionally renders a mozilla.org link labelled "DeBIOS Foundation" and an about:credits link labelled "global community".
  2. The branding-side suppression channel is inert: aboutDialog.xhtml links chrome://branding/content/aboutDialog.css, but powerbrowser/branding/{dev,release}/content/jar.mn (stale "Phase 3 scope" stub) packages only icons, so the aboutDialog.css that exists in both branding dirs never ships and never loads.

fix: (not applied — goal find_root_cause_only) Suggested direction recorded below for /gsd-plan-phase --gaps.
verification:
files_changed: []

## Suggested Fix Direction (for planner)

Minimal, entirely inside powerbrowser/ (no Gecko patch, no patch-stack change):

1. Add `content/branding/aboutDialog.css (aboutDialog.css)` to BOTH powerbrowser/branding/dev/content/jar.mn and powerbrowser/branding/release/content/jar.mn; update each stub's stale "deliberately does not reference aboutDialog.css" comment.
2. Append suppression rules to both aboutDialog.css files: `#contributeDesc, #bottomBox > hbox { display: none; }` — and decide on `#communityDesc` (its "DeBIOS Foundation" label links to mozilla.org; either hide the row or accept until a Phase-2 string/markup decision).
3. Side effect (desirable): the dark-neutral restyle already written in those css files finally applies.

Planner decisions to surface:

- "Licensing Information" targets internal about:license (MPL attribution), not Mozilla outbound; user asked to remove it anyway — hiding the row is user-requested, and about:license stays reachable by URL, so MPL notice obligations are unaffected.
- If the G-01-3 truth is read as requiring the DOM rows GONE (not hidden), the heavier path is a new regenerated patch (e.g. 030) deleting the rows from aboutDialog.xhtml — only take that if hidden-not-removed fails UAT.
- Verification hook: extend a --quick check (or verify-branding.mjs) to assert chrome://branding/content/aboutDialog.css is packaged, since its silent-404 failure mode is what let the dead CSS go unnoticed. Remember: scan-brand-residue iterates git ls-files — stage new files before trusting a green scan.
