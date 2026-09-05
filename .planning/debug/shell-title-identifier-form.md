---
status: diagnosed
trigger: "G-01-25 (UAT test 25, deliverable 01-03 D2): Theia shell main window title bar reads 'PowerBrowser' (identifier form, no space) instead of 'Power Browser'"
created: 2026-08-31T00:00:00Z
updated: 2026-08-31T00:00:00Z
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  status: diagnosed
---

## Current Focus

bug_class: Bohrbug (deterministic — the wrong title shows on every launch)
hypothesis: CONFIRMED — the shell window title is the static hand-written literal `<title>PowerBrowser</title>` in the chrome document powerbrowser/shell/powerbrowser.xhtml (line 30), which uses the identifier form instead of the display form. Nothing overwrites it at runtime.
test: complete
expecting: n/a
next_action: none — diagnosis returned to orchestrator (goal: find_root_cause_only)

reasoning_checkpoint:
  hypothesis: "The OS title bar shows 'PowerBrowser' because the chrome shell document powerbrowser/shell/powerbrowser.xhtml line 30 hard-codes <title>PowerBrowser</title> (identifier form), and no runtime path replaces that title — the shell JS never touches document.title and the root <html> element carries no content-title-tracking attribute, so Theia's own (correct) document.title inside the remote <xul:browser> never propagates to the window."
  confirming_evidence:
    - "powerbrowser/shell/powerbrowser.xhtml:30 contains <title>PowerBrowser</title> — directly read"
    - "grep -i title over powerbrowser/shell/powerbrowser.js and powerbrowser-sidecar.js returns zero hits — no dynamic title update exists"
    - "Root <html> element attributes are windowtype/scrolling/width/height/persist only — no titlemodifier/contenttitlesetting, so AppWindow keeps the chrome document's static title"
    - "theia/applications/browser/package.json:13 reads applicationName: 'Power Browser' (correct) — the Theia-side value the UAT note suspected is NOT the source"
  falsification_test: "Change line 30's literal to any sentinel string and relaunch: if the title bar shows the sentinel, the chrome <title> is the source (it must, given no other writer exists); if the title bar still showed 'PowerBrowser', another writer would exist and this hypothesis would be wrong."
  fix_rationale: "Correcting the literal at the single point that feeds the title bar fixes the surface itself, not a symptom; per the Phase 1 rule 'every branding value is a hand-written literal', the literal is the intended mechanism and it was simply written in the wrong form."
  blind_spots: "Not runtime-verified in this session (no launch performed); confidence rests on static reading of the full title chain plus the UAT screenshot matching the literal exactly. Also did not audit OS window-manager class (StartupWMClass) — that surface is covered by verify-branding-identity.mjs and passed."
  candidate_causes:
    - "code: static identifier-form literal in chrome document title (CONFIRMED)"
    - "config: theia/applications/browser/package.json applicationName wrong (ELIMINATED — value is 'Power Browser')"
    - "environment/build: stale generated bundle baking an old name into the content document.title (RULED OUT as mechanism — content title never reaches the titlebar in this window; bundle.js contains only class identifiers like PowerBrowserWelcomeWidget, no display-string title)"
  and_gate: "no — the wrong literal is sufficient alone. The absence of content-title propagation is ratified design context (the chrome-owned deck/window model), not a co-cause; with a correct literal the title bar is correct."

## Symptoms

<!-- prefilled from UAT gap G-01-25; IMMUTABLE -->

expected: Main shell window title bar reads "Power Browser" (or a title containing the spaced display form). Truth: display name reads "Power Browser" with a space on every user-facing surface; the identifier form never leaks into a display string.
actual: Theia shell main window title bar reads "PowerBrowser" — identifier form, no space. Gecko-side About dialog and other branding surfaces are correct.
errors: none
reproduction: Launch objdir/dist/bin/powerbrowser; look at the window title bar of the Theia shell window.
started: Discovered during live UAT 2026-09-01 (screenshot). The automated tree-side display-name check (01-03 D2) passed.

## Eliminated

- hypothesis: "The Theia frontend applicationName carries the identifier form and Gecko shows it as the window title" (the UAT gap note's own suspicion)
  evidence: theia/applications/browser/package.json:13 reads '"applicationName": "Power Browser"' — spaced, correct. Additionally, Theia's document.title lives inside the remote <xul:browser id="powerbrowser-content"> and cannot reach the OS title bar: the chrome root element has no content-title-tracking attribute and no shell JS mirrors content titles.
  timestamp: 2026-08-31

- hypothesis: "A @powerbrowser extension sets document.title with the identifier form"
  evidence: grep for document.title/applicationName across theia/extensions/ found no extension writing document.title; the only PowerBrowser strings in extensions and in the built bundle are code identifiers (class names like PowerBrowserWelcomeWidget), not display strings feeding a title.
  timestamp: 2026-08-31

## Evidence

- timestamp: 2026-08-31
  checked: .planning/debug/knowledge-base.md
  found: Knowledge base empty — no prior matching pattern.
  implication: No known-pattern hypothesis; fresh investigation.

- timestamp: 2026-08-31
  checked: theia/applications/browser/package.json line 13
  found: '"applicationName": "Power Browser"' — spaced display form, correct.
  implication: The declared Theia config value is NOT the leak source.

- timestamp: 2026-08-31
  checked: powerbrowser/shell/powerbrowser.xhtml (full file read)
  found: "Line 30: <title>PowerBrowser</title> — identifier form in the chrome document title. Line 36: <div id=\"powerbrowser-loading\">PowerBrowser</div> — the loading-layer wordmark also carries the identifier form. Root <html> element has only windowtype/scrolling/width/height/persist attributes — no title-tracking opt-in. The Theia UI loads inside <xul:browser id=\"powerbrowser-content\" primary=\"true\" remote=\"true\">."
  implication: The chrome document's static <title> is what AppWindow gives the window manager; with no propagation wiring and no JS writer, it is the title for the window's whole lifetime. Line 36 is a second, same-class display-string leak in the same file (visible during the startup loading layer).

- timestamp: 2026-08-31
  checked: powerbrowser/shell/powerbrowser.js and powerbrowser-sidecar.js (grep -i title)
  found: Zero matches — no code updates the window or document title.
  implication: The static literal is never corrected at runtime; confirms the mechanism.

- timestamp: 2026-08-31
  checked: scripts/verify-branding-identity.mjs (the 01-03 D2 display-name check)
  found: It asserts an enumerated set of surfaces — application.ini Name/Vendor, VERSION display, .desktop Name/StartupWMClass, brand.ftl -brand-full-name, brand.properties brandFullName, config.status variables. powerbrowser/shell/powerbrowser.xhtml is not in its read set, and no registered check asserts the runtime window title of the shell window.
  implication: Explains why 01-03 D2 passed while the surface is wrong — the leaking surface is outside every existing check's read set.

- timestamp: 2026-08-31
  checked: Why scan-brand-residue.mjs cannot catch this class
  found: The residue scan hunts the originating product's tokens (inventory/brand-tokens.json). "PowerBrowser" is the NEW brand's identifier form and is legitimate in code identifiers (class names, chrome:// URLs, windowtype="powerbrowser:main", filenames) — it is only wrong inside user-facing display strings.
  implication: No existing gate distinguishes identifier-form vs display-form of the new brand in user-facing text; this class of leak is currently uncovered.

- timestamp: 2026-08-31
  checked: 01-UI-SPEC.md copy rules (line 212) and wordmark spec
  found: "every user-facing string names the product as 'Power Browser'" — spaced. The spec never ratifies a compact "PowerBrowser" wordmark; the loading layer is described only as "the wordmark is text in the loading layer".
  implication: Both line 30 (title) and line 36 (loading wordmark) violate the ratified copy contract; the title bar is the reported gap, the wordmark is an adjacent surface the fix plan should include.

## Resolution

root_cause: "powerbrowser/shell/powerbrowser.xhtml:30 hard-codes the chrome shell document title as the identifier form — <title>PowerBrowser</title> — and that static literal is what Gecko's AppWindow hands the window manager. No runtime path corrects it: the shell JS never writes a title, the root element has no content-title-tracking attribute, and Theia's (correct) document.title stays inside the remote <xul:browser>. Same-class secondary surface: line 36's loading-layer wordmark also reads 'PowerBrowser'."
fix: ""  # not applied — goal: find_root_cause_only
verification: ""
files_changed: []

why_not_caught: "verify-branding-identity.mjs (01-03 D2) reads an enumerated file set (application.ini, .desktop, brand.ftl, brand.properties, config.status) that does not include powerbrowser/shell/powerbrowser.xhtml, and no check asserts the shell window's runtime title. scan-brand-residue.mjs is scoped to the originating product's tokens, so the new brand's identifier form is invisible to it by design."
fix_belongs: "In-tree literal in powerbrowser/shell/powerbrowser.xhtml (lines 30 and 36) — NOT Theia config (already correct) and NOT an extension. Optionally one new registry row in scripts/verify-platform.sh asserting the display form in the shell chrome document's user-facing text nodes (derive-and-compare with a --self-test, per verification rules)."
