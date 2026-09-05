---
status: pending-human
phase: 10-sign-off-closeout
source: [10-01-SUMMARY.md]
started: 2026-09-05T00:00:00Z
updated: 2026-09-05T00:00:00Z
executed_by: claude (static gates re-run live; all five perceptual drills reserved for human hands)
audit_acknowledged:
  milestone: v1.2
  at: 2026-09-05
  gap_snapshot: "pending-human::scenarios=5"
---

## Current Test

[awaiting human — sheets 1-5 below]

## Tests

### 1. Open the Stock Browser Window (GUI-01)

expected: From the running Theia shell, invoke the "Open Browser Window" command. A stock Firefox-chrome browser window opens. The address bar takes keyboard focus and navigates a typed URL. An in-window modal (e.g. an alert from a page) appears rather than being suppressed. Closing the browser window returns you to the shell with the app still running. (5-step manual verification recorded as outstanding in 01-07; ledgered in WINDOWS.md.)
result: pending
steps:

  - "Launch objdir/dist/bin/powerbrowser from scratch; the Theia shell loads as the default GUI"
  - "From the running shell, invoke the palette command \"Open Browser Window\" (id powerbrowser.open-browser-window)"
  - "In the opened stock-chrome window: click the address bar, confirm it takes keyboard focus, type a URL, confirm it navigates"
  - "From a page, trigger an in-window modal (e.g. alert()); confirm it appears rather than being suppressed"
  - "Close the browser window; confirm you return to the shell with the app still running"

prior-evidence: "01-UAT.md test 2 (Open the Stock Browser Window, GUI-01), result pass, driven live by a human 2026-09-01; WINDOWS.md ledger item 15 closed on that record; freshness re-confirmed 2026-09-05 in 10-01-SUMMARY.md (no GUI-01 surface change since — cited, never a signature)"
automated: "gui01-command-registered re-run 2026-09-05, outcome recorded below; the human perceptual half above stays staged regardless"
source: human
coverage_id: GUI-01/browser-window-toggle
STAGED-awaiting-signature: no operator signature filled in; sign with name plus date when the five steps are driven live

### 2. Customize Bridge Live Restyle (GUI-03)

expected: With the dev flag on, editing customize.css restyles the shell without a rebuild. Deleting the file reverts the shell to stock styling. (The automatable halves are green; this perceptual claim is the outstanding half from 01-07/01-02 D7.)
result: pending
steps:

  - "Launch the app with the customize dev flag on"
  - "Write a visible rule (e.g. a red outline plus top-panel rule) into customize.css; confirm the shell restyles within ~1s with no rebuild"
  - "Delete customize.css; confirm the shell reverts to stock styling"

prior-evidence: "01-UAT.md test 6 (Customize Bridge Live Restyle, GUI-03), result pass, driven live 2026-09-01 (red outline plus top-panel rule appeared within ~1s of write, reverted on delete); WINDOWS.md ledger item 16 closed on that record; freshness re-confirmed 2026-09-05 in 10-01-SUMMARY.md (no customize-bridge source change since — cited, never a signature)"
automated: "verify-customize-inert plus verify-dev-flag-off re-run 2026-09-05, outcomes recorded below; the human perceptual half above stays staged regardless"
source: human
coverage_id: GUI-03/customize-restyle
STAGED-awaiting-signature: no operator signature filled in; sign with name plus date when the three steps are driven live

### 3. Icon Pixel Look on Real Rasters (GEN-02)

expected: The downstream mark renders at correct density in all three places and the title carries the suffixed display name (Power Browser Dev)
result: pending
steps:

  - "Launch objdir/dist/bin/powerbrowser on a graphical session"
  - "Inspect the window icon, the launcher/dock entry, and the desktop entry: the mark renders at correct density in all three places"
  - "Confirm the title carries the suffixed display name (Power Browser Dev)"

prior-evidence: "03-UAT.md scenario 1 (verbatim runbook source); rasters exact plus shipped in build per v1.0 outcomes table; icon-ihdr gate green (byte-slice equality to rasters) — static exactness proven, pixel look staged for human eyes"
automated: "icon-ihdr re-run 2026-09-05, outcome recorded below; the human pixel-judgment half above stays staged regardless"
source: human
coverage_id: GEN-02/icon-pixel
STAGED-awaiting-signature: no operator signature filled in; sign with name plus date after the graphical inspection

### 4. Fixture Rebrand Plus App-Bundle Build Plus Live Render Drill (GEN-05)

expected: Fixture values (name, welcome/about texts, theme, logo, telemetry level/endpoint, one urls value, one real extension entry) flow manifest -> generate -> surgical blocks -> regenerated prefs -> built sidecar; welcome tab, about dialog, favicon and theme show the fixture with zero modified theia/**/src/**/*.ts; revert restores --check green.
result: pending
steps:

  - "Edit ONLY configuration.toml (display_name -> fixture, [theia] theme + welcome_text, [telemetry] level + endpoint, one [urls] value, one real [[extensions]] entry with bootstrapped pin) and swap brand/mark.svg for a square fixture SVG"
  - "node scripts/generate.mjs"
  - "Surgically apply the five blocks (applicationName, defaultTheme, powerbrowserBranding, powerbrowserTelemetry, theiaPlugins) into theia/applications/browser/package.json — keys only, siblings byte-identical"
  - "Copy the regenerated pref files over powerbrowser/branding/{dev,release}/pref/firefox-branding.js; add the fixture hosts to powerbrowser/endpoint-allowlist.json"
  - "nix develop .#theia --command bash -c \"cd theia && yarn build\""
  - "node scripts/verify-theia-branding.mjs && node scripts/verify-theia-endpoints.mjs (expect both PASS)"
  - "Start the app; open welcome + about: fixture name/texts/mark, fixture theme, favicon = fixture mark; preferences show the contributed telemetry level"
  - "Revert every fixture value, regenerate, restore package.json + pref files + allowlist; confirm --check green and git status clean"

prior-evidence: "04-UAT.md drill 2 (verbatim runbook source, GEN-05/live-render); theia-branding plus theia-endpoints gates green on the shipped manifest — static halves proven, live render staged for human hands"
automated: "theia-branding plus theia-endpoints re-run 2026-09-05, outcomes recorded below; the human render-judgment half above stays staged regardless"
source: human
coverage_id: GEN-05/live-render
STAGED-awaiting-signature: no operator signature filled in; sign with name plus date after the live render drill

### 5. Stranger Carry-Test of REBRANDING.md (DOC-01)

expected: A stranger carrying only docs/REBRANDING.md completes a full rebrand — fresh clone, manifest edit plus logo drop-in, generate, tier-3 build, checklist — with every field documented and every load-bearing command pasteable from a code span.
result: pending
steps:

  - "Prerequisite: a fresh clone (so generated/ is absent), node on PATH, plus the tier-3 toolchain for the build step"
  - "Follow docs/REBRANDING.md section Walkthrough: clone to branded build in order: Clone; Generate first with node scripts/generate.mjs; Fetch the upstream checkout; Edit configuration.toml (every field per the Reference section); Read the rebrand surface map; Drop in the logo; Build (tier 3, roughly an hour); Verify with node scripts/generate.mjs --check plus scripts/verify-platform.sh --quick"
  - "Record where the guide stranded you, if anywhere: which step, which exact command output, what was missing"

prior-evidence: "docs/REBRANDING.md (375 lines, walkthrough plus per-field reference plus downstream obligations); verify-rebranding-docs gate green — schema-derived field coverage plus load-bearing command spans proven, stranger run staged (never run by the executor)"
automated: "verify-rebranding-docs re-run 2026-09-05, outcome recorded below; the human carry-test half above stays staged regardless"
source: human
coverage_id: DOC-01/stranger-carry-test
STAGED-awaiting-signature: no operator signature filled in; sign with name plus date after the stranger run is recorded

## Automatable-Half Outcomes (re-run 2026-09-05, beside the staged halves, never merged into a pass)

| Sheet | Gate | Outcome |
|-------|------|---------|
| GUI-01 | gui01-command-registered | PASS re-run 2026-09-05 |
| GUI-03 | verify-customize-inert | PASS re-run 2026-09-05 (state 1 absent == state 2 empty; state 1 != state 3 styled) |
| GUI-03 | verify-dev-flag-off | PASS re-run 2026-09-05 |
| GEN-02 | icon-ihdr | PASS re-run 2026-09-05 |
| GEN-05 | theia-branding | PASS re-run 2026-09-05 |
| GEN-05 | theia-endpoints | PASS re-run 2026-09-05 |
| DOC-01 | verify-rebranding-docs | PASS re-run 2026-09-05 |

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0
automated: 0

## Gaps

(staged — all five sheets await human hands; automatable halves re-run green beside them, never as signatures)
