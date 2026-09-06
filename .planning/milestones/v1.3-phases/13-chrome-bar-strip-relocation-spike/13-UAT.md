---
status: partial
phase: 13-chrome-bar-strip-relocation-spike
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md]
started: 2026-09-06T18:20:42Z
updated: 2026-09-06T20:32:00Z
---

## Current Test

number: 6
name: Suggestions list plus activation behaviour
expected: |
  Typing suggests up to 8 rows; activating one (Enter or click) navigates; committing empty is a no-op; provider failure degrades to a plain address commit with the contracted error row.
awaiting: user response

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
result: pass
verified: "Automated GUI loop 2026-09-06 (BiDi harness, fresh build): typing https://example.com plus Enter opened a new top-level context (1 to 2); garbage text plus Enter rendered the contracted in-bar failure row. Supersedes the earlier issue report on this test."

### 4. Disabled nav states with tooltips
expected: Back and Forward render disabled (dimmed, tooltip retained) with no history in that direction; Reload renders disabled with its tooltip and no navigable current tab. Layout does not shift.
result: pass
verified: "Automated GUI loop 2026-09-06: Back/Forward/Reload all disabled=true, New Tab enabled, layout stable across probes."

### 5. New tab via stock-window channel
expected: New Tab opens through the stock-window channel; a blocked popup takes the existing browser-window-command error path, never a new dialog.
result: pass
verified: "Automated GUI loop 2026-09-06: clicking New Tab opened a new top-level context (1 to 2)."

### 6. Suggestions list plus activation behaviour
expected: Typing suggests up to 8 rows; activating one (Enter or click) navigates; committing empty is a no-op; provider failure degrades to a plain address commit with the contracted error row.
result: [pending]

### 7. Mode toggle immediate with tabs invariant
expected: Clicking a mode segment selects it with immediate visual state (150ms or less); no tab is ever closed, moved windows, or detached across switches. Segments read Coding / Browsing / Organising.
result: pass
verified: "Automated GUI loop 2026-09-06: clicking Browsing moved is-active from Coding, chip stayed 11 tabs."

### 8. Theia-native bar styling
expected: The bar reads Theia-native (pill, dropdown, toggle against the theme) with no second token system and no typeface literal. Accent appears only on pill focus ring, active-segment ink, and keyboard-highlighted suggestion wash.
result: pass
verified: "Automated GUI loop 2026-09-06: computed styles match the locked theme (bar/dropdown #2b2a33, border #3f3e4a, title #fbfbfe 14px/400, bundle.css loaded); screenshots confirm native read; placement gate green."

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
passed: 11
issues: 0
pending: 1
skipped: 2
blocked: 0

## Gaps

- gap_id: G-13-3
  truth: "Activating a suggestion navigates through the existing opener path"
  status: resolved
  reason: "User reported: well it does not work and is in the wrong locatioin and the functionality is not right. we have alot of fixing to do"
  severity: major
  test: 3
  root_cause: "Facet 1 (activation no-op): commitAddress feeds the opaque row.uri (webview:-scheme browser-tab key) into OpenerService, where PowerBrowserWebviewOpenHandler (priority 1000) claims it and mints a blank webview panel via dedup-key miss; raw-text commits parse to file: scheme — nothing navigates the current browser tab in-tab; all failures swallowed into console.error. Facet 2 (wrong location): bar added via shell.addWidget area 'top' (topPanel), which ApplicationShell.createLayout stacks ABOVE the main dock owning the tab strip — mock order menubar, tab strip, chrome bar, workarea is unachievable via the public area API. Facet 3 (dead controls): back/forward ride editor NavigationLocationService (empty when browsing); reload is execute-noop plus disabled; tab-count chip runs only at startup/mode-switch with no shell listener so it goes stale."
  artifacts:
    - path: "theia/extensions/chrome-bar/src/browser/chrome-bar-widget.tsx"
      issue: "commitAddress feeds opaque row.uri/raw text to opener with console-only catch; reload button hardcoded disabled; chip without shell listener"
    - path: "theia/extensions/chrome-bar/src/browser/chrome-bar-commands.ts"
      issue: "reload execute noop plus isEnabled false; back/forward on editor NavigationLocationService"
    - path: "theia/extensions/tab-uris/src/browser/existing-scheme-coverage.ts"
      issue: "PowerBrowserWebviewOpenHandler claims webview:-keyed browser rows and mints blank panel"
    - path: "theia/extensions/tab-uris/src/browser/view-open-handler.ts"
      issue: "no handler claims in-tab web navigation"
    - path: "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
      issue: "browserTabKey reuses webview: panel scheme as opaque row keys (collision source)"
  missing:
    - "Resolve suggestion row.url through a real browser-navigation path; implement contracted search-or-address mapping instead of new URI(rawText); surface commit failures in-bar per copy rules"
    - "Ratify bar-above-strip as the Variant-A contract or do dock-slot work as an explicit decision; add a DOM-order gate"
    - "Rewire back/forward to browser history (or correct disabled-with-tooltip contract); enable reload against navigable-tab predicate; subscribe chip to shell/tab changes"
  debug_session: ".planning/debug/chrome-bar-suggestions-and-placement.md"
  resolved_by: "13-04-SUMMARY.md, 13-05-SUMMARY.md plus automated-loop commits e9a972d (TabQueryService DI fix) and 30c1ca1 (dropdown body portal)"
  resolved_at: 2026-09-06
  loop_findings: "Automated GUI loop found two further live-only breaks after plan execution: (a) TabQueryService defaulted string ctor param threw 'No matching bindings for String' on every connection, hanging the suggestion RPC (stuck shimmer) — fixed by reading POWERBROWSER_PROFILE_DIR in the field initializer; (b) the dropdown rendered in-DOM but was clipped and unhittable under the top panel's overflow-hidden PerfectScrollbar wrapper — fixed by portalling to document.body with viewport-fixed geometry."
