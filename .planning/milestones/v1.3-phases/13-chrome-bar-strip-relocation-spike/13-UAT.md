---
status: partial
phase: 13-chrome-bar-strip-relocation-spike
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md]
started: 2026-09-06T18:20:42Z
updated: 2026-09-06T18:35:00Z
---

## Current Test

[testing paused — 5 items outstanding]

## Tests

### 1. Relocated-region geometry sanity (spike backstop)
expected: Zero, one, and many tabs keep strip geometry sane in the relocated region, matching top-region behaviour. Held-out visual check — needs a rendered strip. Under the RED Variant-A fallback the strip stays top, so reply skip if no relocated strip exists.
result: skipped
reason: "No relocated strip exists — RED verdict Variant-A fallback, strip stays top. User screenshot confirms top strip plus chrome bar, which is the correct fallback design."

### 2. Relocated-region overflow scrolls (spike backstop)
expected: Many-tab overflow in the relocated region scrolls rather than clipping or wrapping. Held-out visual check — needs a rendered strip.
result: skipped
reason: "Same as test 1 — no relocated region under the RED fallback; overflow behaviour stays Theia stock in the top strip."

### 3. Suggestion activation navigates (opener path)
expected: Activating a suggestion navigates through the existing opener path. Test in the full chrome bar (the widget landed in 13-03).
result: issue
reported: "well it does not work and is in the wrong locatioin and the functionality is not right. we have alot of fixing to do"
severity: major

### 4. Disabled nav states with tooltips
expected: Back and Forward render disabled (dimmed, tooltip retained) with no history in that direction; Reload renders disabled with its tooltip and no navigable current tab. Layout does not shift.
result: [pending]

### 5. New tab via stock-window channel
expected: New Tab opens through the stock-window channel; a blocked popup takes the existing browser-window-command error path, never a new dialog.
result: [pending]

### 6. Suggestions list plus activation behaviour
expected: Typing suggests up to 8 rows; activating one (Enter or click) navigates; committing empty is a no-op; provider failure degrades to a plain address commit with the contracted error row.
result: [pending]

### 7. Mode toggle immediate with tabs invariant
expected: Clicking a mode segment selects it with immediate visual state (150ms or less); no tab is ever closed, moved windows, or detached across switches. Segments read Coding / Browsing / Organising.
result: [pending]

### 8. Theia-native bar styling
expected: The bar reads Theia-native (pill, dropdown, toggle against the theme) with no second token system and no typeface literal. Accent appears only on pill focus ring, active-segment ink, and keyboard-highlighted suggestion wash.
result: [pending]

### 9. Live strip-relocation probe executed with identity evidence
expected: Live strip-relocation probe executed; 3 widgets main-to-bottom and back with identity evidence
result: pass
source: automated
coverage_id: 13-01-D1

### 10. GREEN/RED verdict recorded with Variant routing and blocking cause
expected: GREEN/RED verdict recorded with Variant routing and blocking cause
result: pass
source: automated
coverage_id: 13-01-D4

### 11. chrome-bar extension skeleton composed and building
expected: chrome-bar extension skeleton composed into the sidecar and building with frontend plus backend entries
result: pass
source: automated
coverage_id: 13-02-D1

### 12. Prefix search over RPC with escape and recency order
expected: Prefix search returns at most 8 recency-ordered rows with wildcard input escaped, served over the existing authenticated RPC channel
result: pass
source: automated
coverage_id: 13-02-D2

### 13. RED spike verdict with Variant-A routing enforced mechanically
expected: RED spike verdict with Variant-A routing enforced mechanically (parses, cause present, instrument agreement, upstream empty, no spike-shipped files)
result: pass
source: automated
coverage_id: 13-02-D4

### 14. Top chrome bar with navigation, pill, new tab, and mode toggle
expected: Top chrome bar with back, forward, reload, address pill, new tab, and mode toggle beside the tab strip
result: pass
source: automated
coverage_id: 13-03-D1

## Summary

total: 14
passed: 6
issues: 1
pending: 5
skipped: 2
blocked: 0

## Gaps

- gap_id: G-13-3
  truth: "Activating a suggestion navigates through the existing opener path"
  status: failed
  reason: "User reported: well it does not work and is in the wrong locatioin and the functionality is not right. we have alot of fixing to do"
  severity: major
  test: 3
  artifacts: []
  missing: []
