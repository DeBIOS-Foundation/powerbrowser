---
schema_version: 1
open_count: 8
waived_count: 0
fixed_count: 9
total_count: 17
last_updated: 2026-08-31T02:09:52.011Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | sourcerer/endpoint-allowlist.json | 82 | GitHub org URL becomes https://github.com/DeBIOS/PowerBrowser under the mechanical vendor rename; the DeBIOS Foundation's actual GitHub org is not established (D-12 fixes only the domain). Must be confirmed before release. | fixed |  | 2026-08-30T17:53:27.054Z | 2026-08-30T22:00:12.411Z |
| 2 | 01 | deviation | theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx | 13 | SOURCERER_REPO_URL points at github.com/Deocracy/Sourcerer; same unestablished-org problem as endpoint-allowlist.json:82. | fixed |  | 2026-08-30T17:53:27.157Z | 2026-08-30T22:00:12.510Z |
| 3 | 01 | unrun-verify | scripts/apply-patches.sh |  | apply-patches.sh --self-test cannot run: needs upstream/browser/moz.configure and upstream/ has never been materialized (pre-existing, rename-independent) | fixed |  | 2026-08-30T20:24:37.919Z | 2026-08-30T22:00:12.608Z |
| 4 | 01 | unrun-verify | scripts/verify-customize-inert.mjs |  | verify-customize-inert.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build) | fixed |  | 2026-08-30T20:24:38.018Z | 2026-08-30T22:00:12.714Z |
| 5 | 01 | unrun-verify | scripts/verify-dev-flag-off.mjs |  | verify-dev-flag-off.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build) | fixed |  | 2026-08-30T20:24:38.116Z | 2026-08-30T22:00:12.816Z |
| 6 | 01 | deviation | inventory/brand-tokens.json |  | scan-brand-residue.mjs --reconcile no longer closes post-rename; its expected_count census describes the pre-rename tree. Gate is the plain run. Terminal census owned by plan 01-03. | open |  | 2026-08-30T20:24:38.216Z |  |
| 7 | 01 | unrun-verify | scripts/verify-platform.sh |  | 31 of verify-platform.sh's 48 checks could not run: they need a built tree, a launched browser, or a display. objdir/ does not exist yet (plan 01-04). | fixed |  | 2026-08-30T20:49:13.526Z | 2026-08-30T22:00:29.468Z |
| 8 | 01 | unrun-verify | scripts/verify-platform.sh |  | apply-patches-self-test cannot run: it derives its fixture from upstream/browser/moz.configure and upstream/ is a git-ignored 1.1 GB clone absent on a fresh checkout. Pre-existing, rename-independent. | fixed |  | 2026-08-30T20:49:13.628Z | 2026-08-30T22:00:12.915Z |
| 9 | 01 | deviation | .planning/REQUIREMENTS.md |  | MIG-04 was auto-checked from plan 01-03's frontmatter but nothing has been built; reverted to unchecked. Plan 01-04 owns the build that closes it. | fixed |  | 2026-08-30T20:49:13.723Z | 2026-08-30T22:00:13.014Z |
| 10 | 01 | unrun-verify | scripts/verify-platform.sh |  | verify-branding-identity-release and branding-variant-divergence still unrun: both read objdir-release/dist/bin, i.e. a second full ~47m release build that 01-04-PLAN.md explicitly declined to spend. Runnable the moment a release objdir exists. | open |  | 2026-08-30T22:00:29.574Z |  |
| 11 | 01 | unrun-verify | scripts/verify-platform.sh |  | The ~20 launch-lifecycle checks (side03-*, side04-*, side05-*, shell03-*, shell04-diagnostics-with-backend-down, cr01-*, harness-display-available) became RUNNABLE with 01-04's build but were not run: none is named by 01-04-PLAN.md's verify blocks and each launches a real browser. Not blocked -- unexercised. | open |  | 2026-08-30T22:00:29.678Z |  |
| 12 | 01 | stub | powerbrowser/shell/powerbrowser.js |  | Env-gated POWERBROWSER_SPIKE_GUI01 instrumentation left in the shell bootstrap by plan 01-05 Task 1; it is spike scaffolding and Task 3 of the same plan removes it | fixed |  | 2026-08-30T23:38:09.088Z | 2026-08-31T00:39:32.952Z |
| 13 | 01 | deviation | scripts/check-internals-boundary.sh |  | ChromeUtils.registerWindowActor is absent from FORBIDDEN_PATTERNS. Latent, not exploited: candidate B (the JSWindowActor pair) was NOT adopted in 01-05, so nothing in-tree uses it. Any future actor pair must add it in the same commit or the boundary guard has a hole. | open |  | 2026-08-31T00:39:33.061Z |  |
| 14 | 01 | deviation | scripts/lib/firefox-bidi.mjs |  | Every withFirefoxPage caller that passes a URL launches TWO windows (the shell plus a stock browser window for the URL argument), and contexts[0] resolves to the shell's own supervised Theia frontend rather than the URL passed. Pre-existing, unrelated to 01-05's change: the four _run_app_check_mjs checks boot a dev app at localhost:3000 they then do not read. | open |  | 2026-08-31T00:39:33.163Z |  |
| 15 | 01 | unrun-verify | .planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md |  | GUI-01 manual browser-window verification not performed: 01-07 executed autonomously with no human present. Five steps outstanding (launch app; open a browser window; address bar takes keyboard focus and navigates a typed URL; an in-window modal appears; closing the window returns the shell with the app still running). Automation cannot substitute -- BiDi cannot see chrome contexts on Linux (ledger 7). | open |  | 2026-08-31T02:09:45.801Z |  |
| 16 | 01 | unrun-verify | .planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md |  | GUI-03 manual customize-bridge verification not performed: 01-07 executed autonomously with no human present. Three steps outstanding (with the dev flag on, edit customize.css and see the shell restyle without a rebuild; delete it; see the shell revert). Its automatable halves -- inertness and flag-gating -- are green (verify-customize-inert, verify-dev-flag-off); only the perceptual half is open. | open |  | 2026-08-31T02:09:45.906Z |  |
| 17 | 01 | deviation | scripts/verify-branding-preflight.mjs |  | The preflight's display-surface list is HAND-KEPT, and that omission is exactly what let the welcome widget render the identifier form through the whole rename (fixed in 01-07 by adding the file). The list should derive the set of display surfaces from the tree rather than enumerate it; until then, any new file that renders the product name must be added here by hand or the leak class returns. | open |  | 2026-08-31T02:09:52.011Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": "sourcerer/endpoint-allowlist.json",
    "line": 82,
    "description": "GitHub org URL becomes https://github.com/DeBIOS/PowerBrowser under the mechanical vendor rename; the DeBIOS Foundation's actual GitHub org is not established (D-12 fixes only the domain). Must be confirmed before release.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T17:53:27.054Z",
    "resolved_at": "2026-08-30T22:00:12.411Z"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx",
    "line": 13,
    "description": "SOURCERER_REPO_URL points at github.com/Deocracy/Sourcerer; same unestablished-org problem as endpoint-allowlist.json:82.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T17:53:27.157Z",
    "resolved_at": "2026-08-30T22:00:12.510Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/apply-patches.sh",
    "line": null,
    "description": "apply-patches.sh --self-test cannot run: needs upstream/browser/moz.configure and upstream/ has never been materialized (pre-existing, rename-independent)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:37.919Z",
    "resolved_at": "2026-08-30T22:00:12.608Z"
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-customize-inert.mjs",
    "line": null,
    "description": "verify-customize-inert.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.018Z",
    "resolved_at": "2026-08-30T22:00:12.714Z"
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-dev-flag-off.mjs",
    "line": null,
    "description": "verify-dev-flag-off.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.116Z",
    "resolved_at": "2026-08-30T22:00:12.816Z"
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "01",
    "file": "inventory/brand-tokens.json",
    "line": null,
    "description": "scan-brand-residue.mjs --reconcile no longer closes post-rename; its expected_count census describes the pre-rename tree. Gate is the plain run. Terminal census owned by plan 01-03.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.216Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "31 of verify-platform.sh's 48 checks could not run: they need a built tree, a launched browser, or a display. objdir/ does not exist yet (plan 01-04).",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.526Z",
    "resolved_at": "2026-08-30T22:00:29.468Z"
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "apply-patches-self-test cannot run: it derives its fixture from upstream/browser/moz.configure and upstream/ is a git-ignored 1.1 GB clone absent on a fresh checkout. Pre-existing, rename-independent.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.628Z",
    "resolved_at": "2026-08-30T22:00:12.915Z"
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "MIG-04 was auto-checked from plan 01-03's frontmatter but nothing has been built; reverted to unchecked. Plan 01-04 owns the build that closes it.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.723Z",
    "resolved_at": "2026-08-30T22:00:13.014Z"
  },
  {
    "id": 10,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "verify-branding-identity-release and branding-variant-divergence still unrun: both read objdir-release/dist/bin, i.e. a second full ~47m release build that 01-04-PLAN.md explicitly declined to spend. Runnable the moment a release objdir exists.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T22:00:29.574Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "The ~20 launch-lifecycle checks (side03-*, side04-*, side05-*, shell03-*, shell04-diagnostics-with-backend-down, cr01-*, harness-display-available) became RUNNABLE with 01-04's build but were not run: none is named by 01-04-PLAN.md's verify blocks and each launches a real browser. Not blocked -- unexercised.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T22:00:29.678Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "stub",
    "phase": "01",
    "file": "powerbrowser/shell/powerbrowser.js",
    "line": null,
    "description": "Env-gated POWERBROWSER_SPIKE_GUI01 instrumentation left in the shell bootstrap by plan 01-05 Task 1; it is spike scaffolding and Task 3 of the same plan removes it",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-30T23:38:09.088Z",
    "resolved_at": "2026-08-31T00:39:32.952Z"
  },
  {
    "id": 13,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/check-internals-boundary.sh",
    "line": null,
    "description": "ChromeUtils.registerWindowActor is absent from FORBIDDEN_PATTERNS. Latent, not exploited: candidate B (the JSWindowActor pair) was NOT adopted in 01-05, so nothing in-tree uses it. Any future actor pair must add it in the same commit or the boundary guard has a hole.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T00:39:33.061Z",
    "resolved_at": null
  },
  {
    "id": 14,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/lib/firefox-bidi.mjs",
    "line": null,
    "description": "Every withFirefoxPage caller that passes a URL launches TWO windows (the shell plus a stock browser window for the URL argument), and contexts[0] resolves to the shell's own supervised Theia frontend rather than the URL passed. Pre-existing, unrelated to 01-05's change: the four _run_app_check_mjs checks boot a dev app at localhost:3000 they then do not read.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T00:39:33.163Z",
    "resolved_at": null
  },
  {
    "id": 15,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md",
    "line": null,
    "description": "GUI-01 manual browser-window verification not performed: 01-07 executed autonomously with no human present. Five steps outstanding (launch app; open a browser window; address bar takes keyboard focus and navigates a typed URL; an in-window modal appears; closing the window returns the shell with the app still running). Automation cannot substitute -- BiDi cannot see chrome contexts on Linux (ledger 7).",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T02:09:45.801Z",
    "resolved_at": null
  },
  {
    "id": 16,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".planning/phases/01-platform-extraction-and-rename/01-VALIDATION.md",
    "line": null,
    "description": "GUI-03 manual customize-bridge verification not performed: 01-07 executed autonomously with no human present. Three steps outstanding (with the dev flag on, edit customize.css and see the shell restyle without a rebuild; delete it; see the shell revert). Its automatable halves -- inertness and flag-gating -- are green (verify-customize-inert, verify-dev-flag-off); only the perceptual half is open.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T02:09:45.906Z",
    "resolved_at": null
  },
  {
    "id": 17,
    "kind": "deviation",
    "phase": "01",
    "file": "scripts/verify-branding-preflight.mjs",
    "line": null,
    "description": "The preflight's display-surface list is HAND-KEPT, and that omission is exactly what let the welcome widget render the identifier form through the whole rename (fixed in 01-07 by adding the file). The list should derive the set of display surfaces from the tree rather than enumerate it; until then, any new file that renders the product name must be added here by hand or the leak class returns.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-31T02:09:52.011Z",
    "resolved_at": null
  }
]
````
