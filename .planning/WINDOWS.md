---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 0
total_count: 6
last_updated: 2026-08-30T20:24:38.216Z
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
  }
]
````
