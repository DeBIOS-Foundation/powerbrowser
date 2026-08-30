---
schema_version: 1
open_count: 9
waived_count: 0
fixed_count: 0
total_count: 9
last_updated: 2026-08-30T20:49:13.723Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | sourcerer/endpoint-allowlist.json | 82 | GitHub org URL becomes https://github.com/DeBIOS/PowerBrowser under the mechanical vendor rename; the DeBIOS Foundation's actual GitHub org is not established (D-12 fixes only the domain). Must be confirmed before release. | open |  | 2026-08-30T17:53:27.054Z |  |
| 2 | 01 | deviation | theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx | 13 | SOURCERER_REPO_URL points at github.com/Deocracy/Sourcerer; same unestablished-org problem as endpoint-allowlist.json:82. | open |  | 2026-08-30T17:53:27.157Z |  |
| 3 | 01 | unrun-verify | scripts/apply-patches.sh |  | apply-patches.sh --self-test cannot run: needs upstream/browser/moz.configure and upstream/ has never been materialized (pre-existing, rename-independent) | open |  | 2026-08-30T20:24:37.919Z |  |
| 4 | 01 | unrun-verify | scripts/verify-customize-inert.mjs |  | verify-customize-inert.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build) | open |  | 2026-08-30T20:24:38.018Z |  |
| 5 | 01 | unrun-verify | scripts/verify-dev-flag-off.mjs |  | verify-dev-flag-off.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build) | open |  | 2026-08-30T20:24:38.116Z |  |
| 6 | 01 | deviation | inventory/brand-tokens.json |  | scan-brand-residue.mjs --reconcile no longer closes post-rename; its expected_count census describes the pre-rename tree. Gate is the plain run. Terminal census owned by plan 01-03. | open |  | 2026-08-30T20:24:38.216Z |  |
| 7 | 01 | unrun-verify | scripts/verify-platform.sh |  | 31 of verify-platform.sh's 48 checks could not run: they need a built tree, a launched browser, or a display. objdir/ does not exist yet (plan 01-04). | open |  | 2026-08-30T20:49:13.526Z |  |
| 8 | 01 | unrun-verify | scripts/verify-platform.sh |  | apply-patches-self-test cannot run: it derives its fixture from upstream/browser/moz.configure and upstream/ is a git-ignored 1.1 GB clone absent on a fresh checkout. Pre-existing, rename-independent. | open |  | 2026-08-30T20:49:13.628Z |  |
| 9 | 01 | deviation | .planning/REQUIREMENTS.md |  | MIG-04 was auto-checked from plan 01-03's frontmatter but nothing has been built; reverted to unchecked. Plan 01-04 owns the build that closes it. | open |  | 2026-08-30T20:49:13.723Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": "sourcerer/endpoint-allowlist.json",
    "line": 82,
    "description": "GitHub org URL becomes https://github.com/DeBIOS/PowerBrowser under the mechanical vendor rename; the DeBIOS Foundation's actual GitHub org is not established (D-12 fixes only the domain). Must be confirmed before release.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T17:53:27.054Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "01",
    "file": "theia/extensions/branding/src/browser/sourcerer-welcome-widget.tsx",
    "line": 13,
    "description": "SOURCERER_REPO_URL points at github.com/Deocracy/Sourcerer; same unestablished-org problem as endpoint-allowlist.json:82.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T17:53:27.157Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/apply-patches.sh",
    "line": null,
    "description": "apply-patches.sh --self-test cannot run: needs upstream/browser/moz.configure and upstream/ has never been materialized (pre-existing, rename-independent)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:37.919Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-customize-inert.mjs",
    "line": null,
    "description": "verify-customize-inert.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.018Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-dev-flag-off.mjs",
    "line": null,
    "description": "verify-dev-flag-off.mjs unrun: needs a built binary at objdir/dist/bin/powerbrowser (Tier 3 Gecko build)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:24:38.116Z",
    "resolved_at": null
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
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.526Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "scripts/verify-platform.sh",
    "line": null,
    "description": "apply-patches-self-test cannot run: it derives its fixture from upstream/browser/moz.configure and upstream/ is a git-ignored 1.1 GB clone absent on a fresh checkout. Pre-existing, rename-independent.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.628Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": ".planning/REQUIREMENTS.md",
    "line": null,
    "description": "MIG-04 was auto-checked from plan 01-03's frontmatter but nothing has been built; reverted to unchecked. Plan 01-04 owns the build that closes it.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-30T20:49:13.723Z",
    "resolved_at": null
  }
]
````
