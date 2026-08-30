# Phase 1: Platform Extraction and Rename - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-29
**Phase:** 1-Platform Extraction and Rename
**Areas discussed:** Migration boundary, Rename execution, Brand identity values, Inventory & red scan

---

## Migration boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh snapshot | Copy files at one commit, single import commit recording sourcerer@<sha> provenance | ✓ |
| Full history import | git filter-repo the sourcerer history into this repo | |

**User's choice:** Fresh snapshot

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, migrate token-gate | All 4 Theia extensions migrate to @powerbrowser/* | ✓ |
| No, exclude it | Leave token-gate behind | |

**User's choice:** Yes, migrate
**Notes:** User had never heard of token-gate; Claude inspected it and reported it is the fail-closed Theia backend auth gate + parent watchdog (platform security tied to TheiaService.sys.mjs supervision). User then accepted migration.

| Option | Description | Selected |
|--------|-------------|----------|
| All but logo/ & PRD | flake.nix, toolchain baseline, technical docs migrate debranded; Sourcerer's logo/ and PRODUCT-REQUIREMENTS.md stay downstream | ✓ |
| Code only | Only scripts, patches, own tree, theia sidecar | |
| Everything, debrand in place | Copy whole root including logo/ and PRD | |

**User's choice:** All but logo/ & PRD

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze sourcerer | No platform-code changes in sourcerer after the snapshot | ✓ |
| Parallel development | Sourcerer keeps evolving; reconcile at Phase 7 | |
| Sourcerer dies | Abandon the repo entirely | |

**User's choice:** Freeze sourcerer
**Notes:** User clarified: Sourcerer is frozen and cannot be developed on at all until Power Browser is ready; Sourcerer will then be remade on top of Power Browser (as a downstream), not reconciled.

---

## Rename execution

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted + committed | Committed rename script consuming the MIG-02 inventory; rerunnable; auditable | ✓ |
| Scripted, throwaway | Same approach, script not committed | |
| Manual per classification | Hand-edit guided by the inventory | |

**User's choice:** Scripted + committed

| Option | Description | Selected |
|--------|-------------|----------|
| Staged commits | git mv first, then content per token class, then coupled-format fixups; bisectable | ✓ |
| One atomic commit | Single 'execute rename' commit | |

**User's choice:** Staged commits

| Option | Description | Selected |
|--------|-------------|----------|
| Full rename now | Patches renamed (names + content, hand-written Power Browser literals), regenerated with valid 3-way-merge hash chain | ✓ |
| Identifiers only | Leave display strings for Phase 5 (conflicts with success criterion 5) | |

**User's choice:** Full rename now

| Option | Description | Selected |
|--------|-------------|----------|
| Rename brand, keep refs | Brand tokens rename; decision IDs and plan citations stay verbatim as 'frozen' | ✓ |
| Scrub all references | Rewrite/delete comments citing sourcerer plans | |
| Rewrite as new docs | Migrate cited rationale into Power Browser docs | |

**User's choice:** Rename brand, keep refs

---

## Brand identity values

| Option | Description | Selected |
|--------|-------------|----------|
| Power Browser / DeBIOS Foundation | Matches the 501(c)(3) platform owner in PROJECT.md | ✓ |
| Power Browser / Deocracy | Keep sourcerer's vendor | |

**User's choice:** Power Browser / DeBIOS Foundation

| Option | Description | Selected |
|--------|-------------|----------|
| powerbrowser | One word, matches fixed internal identifiers | ✓ |
| power-browser | Hyphenated; would add a 6th case-variant | |

**User's choice:** powerbrowser

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder mark | Simple original geometric mark generated in Phase 1 | ✓ |
| Design real logo now | Pause for real logo design | |
| I have one | Existing logo | |

**User's choice:** Placeholder mark

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub repo URLs | Point at github.com/DeBIOS-Foundation/powerbrowser | |
| We have a domain | User-provided domain | ✓ |
| Neutral placeholders | example.invalid-style | |

**User's choice:** We have a domain — **powerbrowser.org**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both | 'Power Browser Dev' + 'Power Browser' release entries | ✓ |
| Release only | Single release entry | |

**User's choice:** Keep both
**Notes:** User first asked why a Dev entry exists; Claude explained it launches the local objdir build distinguishably from an installed release. User then accepted keeping both.

| Option | Description | Selected |
|--------|-------------|----------|
| powerbrowser.org + DuckDuckGo | Custom homepage + privacy-neutral search | |
| Keep whatever sourcerer has | Carry current defaults through the rename | |
| about:blank / Google | Neutral blank + Google | |

**User's choice:** Free-text: "None", then clarified "For now keep it default" — stock defaults untouched in Phase 1, revisit at Phase 2 `[urls]`.

---

## Inventory & red scan

| Option | Description | Selected |
|--------|-------------|----------|
| Structured data file | One committed machine-readable file; input to both rename script and scan | ✓ |
| Markdown table doc | Human doc; scan and script encode tokens separately | |
| Data + generated doc | Structured file + generated report | |

**User's choice:** Structured data file

| Option | Description | Selected |
|--------|-------------|----------|
| New standalone script | Static scan reading the inventory with committed scope list; seed of VER-01 | ✓ |
| Extend verify-branding-identity.mjs | Add static mode to the runtime verifier | |

**User's choice:** New standalone script

| Option | Description | Selected |
|--------|-------------|----------|
| Reconciled counts | Scan output cross-checked against inventory; report committed as evidence | ✓ |
| Nonzero exit + log | Simpler but wouldn't catch an under-scanning scanner | |

**User's choice:** Reconciled counts

| Option | Description | Selected |
|--------|-------------|----------|
| Permanent gate | Scan joins verify/smoke set immediately, must pass from Phase 1 onward | ✓ |
| One-off proof | Park until Phase 6 | |

**User's choice:** Permanent gate

---

## Claude's Discretion

- Inventory file format (TOML vs JSON) and exact scan script name
- URL paths under powerbrowser.org
- Placeholder mark design
- Rename script language/tooling and exact staging of per-class commits

## Deferred Ideas

- Real Power Browser logo to replace the placeholder mark
- Custom default homepage/search — Phase 2 `[urls]`
