---
status: pending-human
phase: 04-theia-surface-branding-extensions-telemetry
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-VERIFICATION.md]
started: 2026-09-04T00:00:00Z
updated: 2026-09-04T00:00:00Z
executed_by: claude (static gates re-run live; graphical/browser-boot and app-bundle drills reserved for human hands)
audit_acknowledged:
  milestone: v1.1
  at: 2026-09-05
  gap_snapshot: "pending-human::scenarios=3"
---

## Current Test

[awaiting human — drills 1-3 below]

## Tests

### 1. Static gates all green (automated, done)

expected: `generate --check` (52/52), the four Phase-4 gates, telemetry suite 5/5, and full `--quick` all pass on the shipped manifest.
result: pass
evidence: "Re-ran live 2026-09-04: --check PASS 52/52; verify-theia-branding PASS; verify-theia-endpoints PASS; verify-extension-pins PASS; verify-telemetry PASS; telemetry-sender.test.mjs SUITE PASS 5/5; verify-platform.sh --quick PASS incl. all 8 Phase-4 rows; shipped fragments carry applicationName/defaultTheme, off/null telemetry, {} plugins, [powerbrowser.org] hosts; release firefox-branding.js blanks toolkit.telemetry.server + breakpad.reportURL; no --ignore-errors in the download path; zero debt markers in phase-4 sources."

### 2. Fixture rebrand + app-bundle build + live render drill

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

source: human
coverage_id: GEN-05/live-render

### 3. Declared-extension download + bundle + load drill

expected: "plugins/<id>.vsix lands byte-identical (sha256 = pin); verify-extension-pins.mjs PASS; the built sidecar loads the extension and it contributes; an unreachable-URL entry fails the build step naming the entry id."
result: pending
steps:

  - "With the real [[extensions]] entry from drill 2 in place: nix develop .#theia --command bash -c \"cd theia && yarn download:plugins\""
  - "node scripts/verify-extension-pins.mjs (expect PASS)"
  - "Complete the yarn build, start the app, confirm the extension loads and contributes"
  - "Point one entry at an unreachable URL; confirm the build step fails naming the entry id; revert"

source: human
coverage_id: EXT-01/bundle-load

### 4. Telemetry live-delivery drill + full gate

expected: "Level off produces zero POSTs at the collector; crash/error/all deliver exactly the paths their level admits with batching and retry visible; scripts/verify-platform.sh --gate green (incl. verify-endpoints layer 1 with repointed prefs on the built binary)."
result: pending
steps:

  - "Set [telemetry] level = \"all\", endpoint = local collector URL; node scripts/generate.mjs; surgical apply of powerbrowserTelemetry"
  - "Start the app; exercise usage + error paths at each of the four levels (off, crash, error, all); inspect collector traffic"
  - "scripts/verify-platform.sh --gate (expect green)"
  - "Revert the fixture, regenerate, restore package.json"

source: human
coverage_id: TEL-02/TEL-03/live-delivery

## Summary

total: 4
passed: 1
issues: 0
pending: 3
skipped: 0
blocked: 0
automated: 1

## Gaps

(none — automated evidence is green; drills 2-4 await human hands)
