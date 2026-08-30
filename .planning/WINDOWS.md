---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 8
total_count: 11
last_updated: 2026-08-30T22:00:29.678Z
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
  }
]
````
