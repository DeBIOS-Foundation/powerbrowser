---
status: complete
phase: 01-platform-extraction-and-rename
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md, 01-09-SUMMARY.md, 01-10-SUMMARY.md, 01-11-SUMMARY.md, 01-12-SUMMARY.md, 01-13-SUMMARY.md, 01-14-SUMMARY.md, 01-15-SUMMARY.md, 01-16-SUMMARY.md, 01-17-SUMMARY.md, 01-VERIFICATION.md]
started: 2026-09-01T01:17:53Z
updated: 2026-09-01T21:12:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running powerbrowser/sidecar processes and clear ephemeral state (temp state files, lock files). Launch objdir/dist/bin/powerbrowser from scratch. The Theia shell loads as the default GUI without errors, the sidecar spawns, and the shell becomes interactive (health probe passes — no error layer appears).
result: pass

### 2. Open the Stock Browser Window (GUI-01)
expected: From the running Theia shell, invoke the "Open Browser Window" command. A stock Firefox-chrome browser window opens. The address bar takes keyboard focus and navigates a typed URL. An in-window modal (e.g. an alert from a page) appears rather than being suppressed. Closing the browser window returns you to the shell with the app still running. (5-step manual verification recorded as outstanding in 01-07; ledgered in WINDOWS.md.)
result: pass

### 3. About Dialog Display Literal
expected: The About dialog names the product "Power Browser" (display form with a space). No "powerbrowser" identifier form, no Sourcerer or Mozilla naming, appears in the dialog's user-facing text.
result: pass
history: "Originally reported as an issue (severity minor): 'In the firefox about it looks good but I would get rid of these links — Make a donation / get involved! / Licensing Information / Terms of Use / Privacy Notice'. Tracked as G-01-3, closed by 01-18-PLAN.md, re-verified live on the repackaged binary by test 43 (2026-09-01)."
resolved_by: 01-18-PLAN.md

### 4. Desktop Entries and Icons
expected: Both desktop entries resolve inside this repo and their Icon= targets exist on disk as real image files.
result: pass
coverage_id: 01-03/D4

### 5. Placeholder Mark Provenance
expected: The placeholder mark is an original design — not a recolour, crop, or rearrangement of any existing mark (Sourcerer's or Mozilla's) — is square, dual-filled, and rasterized to all ten sizes. Artwork provenance is a legal boundary (T-03-01), so this needs human eyes.
result: pass
note: "User caveat: surface artwork is clean, but there may be residual art deeper in the tree somewhere (unconfirmed)."
coverage_id: 01-03/D5

### 6. Customize Bridge Live Restyle (GUI-03)
expected: With the dev flag on, editing customize.css restyles the shell without a rebuild. Deleting the file reverts the shell to stock styling. (The automatable halves are green; this perceptual claim is the outstanding half from 01-07/01-02 D7.)
result: pass
note: "Driven live 2026-09-01: red outline+top-panel rule appeared within ~1s of write, reverted on delete. Both halves confirmed by user."
coverage_id: 01-02/D7

### 7. Start-Failure Error Affordance
expected: Induce a start failure (e.g. temporarily rename the sidecar directory) and launch. An error layer appears naming "Power Browser", stating the problem in plain language with no internal identifiers (no pref keys, ports, sentinel names, or raw exception text), and the withheld details appear as labelled rows in the diagnostics layer.
result: pass
note: "Induced via user.js pref backendMain=/nonexistent path in scratch profile; interfaceFilesMissing copy + Details rows confirmed by user 2026-09-01."

### 8. Retry Classification in a Real Window
expected: On an unrecoverable failure the Retry control is absent; on a recoverable failure it is present. In both cases the diagnostics rows survive. (Node harness proves the contract, not the pixels — chrome-context Marionette is platform-blocked on Linux, so this is the human half of 01-13 D5.)
result: pass
note: "Both classes driven live 2026-09-01: unrecoverable (backendMain missing) showed no Retry; recoverable (dying node, couldNotStart) showed Retry + Details. Confirmed by user."
coverage_id: 01-13/D5

### 9. Failing Retry Repaints the Error Layer
expected: With a persistent recoverable failure, clicking Retry repeatedly repaints the error layer every time — message, Retry, and Details all return after each failed attempt. The screen never goes permanently blank.
result: pass
note: "Driven live 2026-09-01 against the dying-node fault; multiple Retry clicks each repainted the full error layer. Confirmed by user."

### 10. Clean Quit Leaves No Orphan Sidecar
expected: Quit the browser normally. The sidecar Node process terminates with it — no orphan node process survives the browser (check with ps after quit).
result: pass
note: "Window-close path verified 2026-09-01: main exited 0, sidecar node gone, no orphan backend. Theia File menu has no Quit entry — X button is the quit path."

### 11. Single Verification Driver
expected: scripts/verify-platform.sh is the one driver; no verify-phase-0*.sh siblings exist; every assertion from the four deleted per-phase drivers is preserved in its registry (D-21).
result: pass
note: "verify-platform.sh --quick ran live 2026-09-01: all checks PASS through the single driver; ls scripts/verify-phase-*.sh finds nothing."
coverage_id: 01-03/D7

### 12. Historical Sourcerer Citations Survive Verbatim
expected: Decision-ID and plan-file citations in migrated comments that cite Sourcerer history (rather than naming the product) survived the rename tracer verbatim (D-08 provenance). Judgment call: each frozen citation still reads as a historical citation, not as live product naming.
result: pass
note: "Zero literal Sourcerer tokens outside scan machinery; 28 -PLAN.md citations survive verbatim, scan-asserted. Confirmed by user 2026-09-01."
coverage_id: 01-01/D6

### 13. Frozen and Coincidental Token Classes Untouched
expected: Tokens classified frozen or coincidental in inventory/brand-tokens.json were not modified by the migration — each still reads as intended (historical citation or coincidental string), none was renamed or broken.
result: pass
note: "All 12 frozen/coincidental rows reviewed with user 2026-09-01; residue scan green at expected counts. Confirmed by user."
coverage_id: 01-02/D5

### 14. Platform tree import commit
expected: The platform tree exists in this repo as a single import commit naming the exact sourcerer SHA, with no upstream/, no objdir, no .mozbuild, and no sourcerer git remote
result: pass
source: automated
coverage_id: 01-01/D1

### 15. Brand-token inventory classification
expected: inventory/brand-tokens.json classifies every brand occurrence in the migrating scope into exactly one of the five classes, with no unclassified row and a reason on every frozen/coincidental row
result: pass
source: automated
coverage_id: 01-01/D2

### 16. Residual scan demonstrably red
expected: The residual scan is demonstrably red by reconciled counts, with the report committed as evidence
result: pass
source: automated
coverage_id: 01-01/D3

### 17. Rename script guards
expected: The rename script refuses to run on an unclassified inventory, honours the token boundary rule, and is a no-op on rerun
result: pass
source: automated
coverage_id: 01-01/D4

### 18. chrome:// coupled chain rename
expected: The chrome:// coupled chain went red → renamed → green through the script, with all six coupled reference formats moving together in one pass
result: pass
source: automated
coverage_id: 01-01/D5

### 19. Pure-movement git mv commit
expected: Every branded file and directory moved under git mv in one pure-movement commit, with history resolving through the rename
result: pass
source: automated
coverage_id: 01-02/D1

### 20. Cross-tier contracts renamed atomically
expected: Every cross-tier contract renamed on both sides in a single commit, verifiable by commit hash
result: pass
source: automated
coverage_id: 01-02/D2

### 21. Six coupled reference formats asserted
expected: All six coupled reference formats moved together, each asserted distinctly
result: pass
source: automated
coverage_id: 01-02/D3

### 22. Residual scan green and gated
expected: The residual scan is green for every class except the hand-write surfaces, and is registered as a permanent gate (D-18)
result: pass
source: automated
coverage_id: 01-02/D4

### 23. Four @powerbrowser/* extensions compile
expected: The four @powerbrowser/* extensions compile
result: pass
source: automated
coverage_id: 01-02/D6

### 24. No generator — hand-written literals only
expected: Every branding value in the tree is a hand-written literal; no generator, no configuration.toml, no generated/ directory
result: pass
source: automated
coverage_id: 01-03/D1

### 25. Display name with space everywhere
expected: The display name reads "Power Browser" with a space on every user-facing surface and the identifier form never leaks into a display string
result: pass
source: automated
coverage_id: 01-03/D2
note: "Live UAT observation contradicts this on one runtime surface — see gap G-01-25: the Theia shell window title bar reads 'PowerBrowser' (identifier form, no space)."

### 26. Vendor split DeBIOS / DeBIOS Foundation
expected: The vendor split is machine-side DeBIOS and display-side DeBIOS Foundation, treated as two distinct expected values
result: pass
source: automated
coverage_id: 01-03/D3

### 27. Static gates in no-build check set
expected: The two cheap static gates run in the no-build check set
result: pass
source: automated
coverage_id: 01-03/D6

### 28. No Mozilla brand colour in branding dir
expected: No Mozilla brand colour survives inside Power Browser's branding directory
result: pass
source: automated
coverage_id: 01-03/D8

### 29. Patch blob-hash chain valid
expected: Both patches carry a valid 3-way-merge blob-hash chain and apply non-vacuously to a freshly-fetched tree
result: pass
source: automated
coverage_id: 01-04/D1

### 30. upstream/ script-materialized only
expected: upstream/ is script-materialized at the pinned tag, never copied and never committed
result: pass
source: automated
coverage_id: 01-04/D2

### 31. Four-way coupling names renamed tree
expected: The four-way coupling — symlink, git-exclude entry, patch DIRS path, mozconfig branding path — all name the renamed tree
result: pass
source: automated
coverage_id: 01-04/D3

### 32. No patch touches compiled Gecko path
expected: No patch touches a compiled Gecko path
result: pass
source: automated
coverage_id: 01-04/D4

### 33. Sidecar healthy under renamed scope
expected: The Theia sidecar installs, compiles, spawns node-pty, and answers its health probe under the renamed scope
result: pass
source: automated
coverage_id: 01-04/D5

### 34. Backend auth gate fail-closed
expected: The backend auth gate is fail-closed, proven by a positive control that does not use the test bypass
result: pass
source: automated
coverage_id: 01-04/D6

### 35. Branded application builds and boots (MIG-04)
expected: A Power-Browser-branded application builds and boots on Linux (MIG-04)
result: pass
source: automated
coverage_id: 01-04/D7

### 36. Six branding surfaces on built artifact
expected: All six branding surfaces equal their Power Browser values on the built artifact, and the comparison is proven to discriminate
result: pass
source: automated
coverage_id: 01-04/D8

### 37. No unattended callout off allowlist
expected: No unattended callout reaches a host absent from the endpoint allowlist
result: pass
source: automated
coverage_id: 01-04/D9

### 38. Unrecoverable Retry drives zero spawns
expected: A Retry driven against an unrecoverable error state drives zero spawns and leaves the failure's diagnostic rows intact
result: pass
source: automated
coverage_id: 01-13/D1

### 39. Retry control class-gated
expected: The Retry control is hidden for the unrecoverable class and present for the recoverable one
result: pass
source: automated
coverage_id: 01-13/D2

### 40. Unrecoverable copy never names Retry
expected: No user-facing message reachable from an unrecoverable call site names the Retry control
result: pass
source: automated
coverage_id: 01-13/D3

### 41. Planted faults drive assertions red
expected: Every new assertion has a planted fault that drives it red naming the drift, in both directions
result: pass
source: automated
coverage_id: 01-13/D4

### 42. Tier-3 regression re-confirmation on a repackaged binary
expected: Re-run `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` against a repackaged binary (`./mach build faster`). Neither check moves, since neither clicks Retry (WINDOWS.md ledger item 19).
result: pass
note: "Repackaged 2026-09-01 via `MOZCONFIG=../.mozconfig ./mach build faster` (17s); packaged chrome confirmed live (branding aboutDialog.css symlinked to source). Both checks re-run against the repackaged binary: shell03-budget-exhausted-error PASS, shell03-auto-dismiss-on-selfheal PASS. Neither moved."
source: 01-VERIFICATION.md (re-verification 2026-09-01, human_verification item 1)

### 43. About-dialog backstop on a repackaged binary
expected: The repackaged binary's About dialog renders "Licensing Information" as the only visible bottom-row link; clicking it opens the aggregated open-source licence text; no Terms of Use, Privacy Notice, community, contribute, or experimental-community row is present, including the newly suppressed `#communityExperimentalDesc` row (01-21 backstop truth, MIG-04).
result: pass
note: "Confirmed by user 2026-09-01 against the repackaged binary: Licensing Information is the only visible bottom-row link, it opens the aggregated licence text, and no Terms of Use / Privacy Notice / community / contribute / experimental-community row remains."
source: 01-VERIFICATION.md (re-verification 2026-09-01, human_verification item 2)

## Summary

total: 43
passed: 43
issues: 0
pending: 0
skipped: 0
gaps: 0 open  # G-01-3 resolved by 01-18, G-01-25 resolved by 01-19

## Gaps

- gap_id: G-01-3
  truth: "The About dialog carries only Power Browser user-facing text; no stock Mozilla outbound-link row (Make a donation / get involved! / Licensing Information / Terms of Use / Privacy Notice) survives in the rebranded dialog"
  status: resolved
  resolved_by: 01-18-PLAN.md
  resolved_at: 2026-09-01
  reason: "User reported: naming is correct (About Power Browser Dev, DeBIOS Foundation) but the stock Mozilla community/donation and licensing/terms/privacy links are still present and should be removed"
  severity: minor
  test: 3
  root_cause: "AND-gate of two conditions: (1) upstream aboutDialog.xhtml hard-codes all the link rows as literal hrefs (contributeDesc lines 131-133, bottomBox hbox 139-142; plus unreported communityDesc 127-130 whose 'DeBIOS Foundation'-labelled link navigates to mozilla.org) — no pref consulted, so firefox-branding.js cannot suppress them; (2) the branding suppression channel is inert: chrome://branding/content/aboutDialog.css is referenced by the dialog but powerbrowser/branding/{dev,release}/content/jar.mn are stale stubs packaging only icon PNGs, so the existing aboutDialog.css never ships (silent chrome 404, confirmed in built tree)."
  artifacts:
    - path: "powerbrowser/branding/dev/content/jar.mn"
      issue: "stub omits aboutDialog.css from the chrome package (same in release/) — the branding CSS hook is dead"
    - path: "powerbrowser/branding/dev/content/aboutDialog.css"
      issue: "exists and carries the intended restyle but never loads; contains no link-suppression rules (same in release/)"
  missing:
    - "Add content/branding/aboutDialog.css to both jar.mn files (fixes the dead hook; the intended dark restyle finally applies)"
    - "Append '#contributeDesc, #bottomBox > hbox { display: none; }' to both aboutDialog.css files; decide whether #communityDesc hides too"
    - "Add a --quick assertion that chrome://branding/content/aboutDialog.css is packaged (silent 404 masked the dead CSS)"
  debug_session: .planning/debug/about-dialog-stock-links.md

- gap_id: G-01-25
  truth: "The display name reads 'Power Browser' with a space on every user-facing surface and the identifier form never leaks into a display string (01-03 D2)"
  status: resolved
  resolved_by: 01-19-PLAN.md
  resolved_at: 2026-09-01
  reason: "Observed during live UAT (screenshot, 2026-09-01): the Theia shell main window title bar reads 'PowerBrowser' — identifier form, no space. Likely the Theia frontend applicationName rather than Gecko branding, so the tree-side automated check did not catch it."
  severity: major
  test: 25
  root_cause: "powerbrowser/shell/powerbrowser.xhtml:30 hard-codes <title>PowerBrowser</title> (identifier form); line 36's loading wordmark repeats it. No runtime writer corrects it, and Theia's correct document.title ('Power Browser', applicationName is already right) stays inside the remote <xul:browser>. verify-branding-identity.mjs's enumerated surface set does not include the shell XHTML, and scan-brand-residue hunts old-brand tokens only, so no gate covers new-brand display-form leaks in shell chrome."
  artifacts:
    - path: "powerbrowser/shell/powerbrowser.xhtml"
      issue: "line 30 <title> and line 36 loading wordmark use identifier form 'PowerBrowser' in user-facing display strings"
    - path: "scripts/verify-branding-identity.mjs"
      issue: "not wrong, but its read set has no coverage of shell chrome display strings — why the leak went undetected"
  missing:
    - "Correct both literals in powerbrowser.xhtml to 'Power Browser' (in-tree shell file; no Theia fork, no Gecko patch)"
    - "Optionally add a verify-platform.sh registry row asserting the display form in shell chrome user-facing text nodes, with --self-test"
  debug_session: .planning/debug/shell-title-identifier-form.md

## Notes

- Coverage blocks: 01-02 D7, 01-03 D4, 01-03 D7 carry a malformed `verification[].status`
  value ("must be one of pass, fail, unknown"). Fail-safe applied — all three kept as human
  checkpoints (tests 6, 4, 11). Fix the status values in those SUMMARYs when convenient.
- Tests 14–41 are deterministically covered by passing automated checks (coverage blocks in
  01-01/01-02/01-03/01-04/01-13 SUMMARYs) and are not presented for manual testing.
- Automated UI verification skipped: no Playwright MCP in session, and chrome-context
  automation is platform-blocked on Linux (WINDOWS.md ledger 7). Manual checkpoints only.
- 01-VERIFICATION.md status is gaps_found (Truth 7 — copy-safety gate defeatable — still
  open). UAT can complete, but phase advancement stays blocked until that verification passes.
