# Phase 1: Platform Extraction and Rename - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Sourcerer's platform code becomes a booting, browsable `powerbrowser/` tree in this repo under fixed platform identifiers, with every branding value a hand-written Power Browser literal — no generator involved. Covers MIG-01..04 and GUI-01..04. The configuration manifest, generator, and any generated branding belong to Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### Migration boundary
- **D-01:** Fresh snapshot import, not history import — copy the sourcerer working tree at one commit into this repo as a single "import platform tree from sourcerer@<sha>" commit recording provenance. No Sourcerer-branded git history enters the public platform repo. — **Reversibility:** one-way — once phases build on the snapshot, retrofitting filter-repo history would rewrite every subsequent commit.
- **D-02:** All four Theia sidecar extensions migrate and rename to `@powerbrowser/*`: `branding`, `customize`, `tab-uris`, **and `token-gate`**. Inspection confirmed token-gate is platform security (fail-closed backend auth token gate + parent watchdog coupled to the browser's `TheiaService.sys.mjs` supervision), not a Sourcerer feature.
- **D-03:** Non-code root items: `flake.nix`, `toolchain-baseline.txt`, and technical docs (`BUILD.md`, `CUSTOMIZE.md`, `URI-SCHEMES.md`) migrate and are debranded. Sourcerer's `logo/` directory and `docs/PRODUCT-REQUIREMENTS.md` stay downstream — they are Sourcerer's, not the platform's.
- **D-04:** The sourcerer repo is frozen — no development there at all — until Power Browser is ready; Sourcerer is then remade **on top of** Power Browser as a pure downstream (Phase 7). Not a reconciliation of two evolving trees. Snapshot SHA recorded in the import commit.

### Rename execution
- **D-05:** The rename is executed by a **committed, rerunnable script** that consumes the MIG-02 inventory as its input data and applies token-boundary replacements per case form. Reset → rerun until the diff is right; the script is auditable evidence the rename was mechanical.
- **D-06:** Staged commits, not one atomic commit: file/dir renames via `git mv` first (preserves rename detection), then content renames per token class/format, then coupled-format fixups (jar.mn, components.conf, moz.build). Each stage bisectable.
- **D-07:** Both patches (`010-sourcerer-identity.patch`, `020-sourcerer-shell.patch`) are fully renamed in Phase 1 — file names and content (identifiers plus hand-written "Power Browser" display literals) — and regenerated so they apply cleanly against re-fetched upstream with a valid 3-way-merge blob-hash chain. Phase 5 (MIG-05) later strips brand *values* into generated includes; Phase 1 only replaces Sourcerer literals with Power Browser literals.
- **D-08:** Historical Sourcerer planning citations in comments (decision IDs like D-98/SIDE-04, plan-file references like `05-01-PLAN.md`) stay **verbatim** as provenance, classified `frozen` in the inventory. Only brand tokens naming the product rename in comments.

### Brand identity values (hand-written in Phase 1)
- **D-09:** Display name **Power Browser**; vendor is the 501(c)(3) platform owner, **DeBIOS Foundation**. Replaces sourcerer's vendor "Deocracy". **Amended 2026-08-30** after research found the vendor string forms the profile path: `nsXREDirProvider.cpp:1621-1637` lowercases vendor and appName with no space stripping, so "DeBIOS Foundation" would yield `~/.config/debios foundation/powerbrowser/` — a space in a path, against this repo's hard no-spaces rule (Nix linker). Split machine-side from display-side:
  - `MOZ_APP_VENDOR` = **`DeBIOS`** — the compiled, path-forming value.
  - **`DeBIOS Foundation`** remains the display-side vendor string in branding files (about dialog, desktop entries, license/credits surfaces).
  - The residual-brand scan and `verify-branding-identity.mjs` must treat these as two distinct expected values, not one.
- **D-10:** App basename / binary / remoting name / StartupWMClass: **`powerbrowser`** — one word, matching the fixed internal identifiers (`chrome://powerbrowser/`, `@powerbrowser/*`) exactly. No hyphenated sixth case-variant.
- **D-11:** Logo: an original **placeholder geometric mark** created during Phase 1 (SVG source, rasterized to the needed PNG sizes). A real logo replaces the asset files later without structural change.
- **D-12:** Domain: **powerbrowser.org** — homepage/support/release-notes URLs hand-written against it; exact URL paths are researcher/planner discretion.
- **D-13:** Keep both dev and release presentation: "Power Browser Dev" desktop entry (local objdir builds) and "Power Browser" release entry, mirroring the existing `branding/dev` / release split.
- **D-14:** Default homepage and search engine: **keep stock defaults** — no custom homepage/search changes in Phase 1. Revisit when `[urls]` lands in Phase 2.

### Inventory & red scan
- **D-15:** The MIG-02 inventory is **one committed structured data file** (TOML or JSON — planner's pick): token, case form, classification (brand / identity / frozen / coincidental), format context. It is simultaneously the rename script's input AND the red scan's token source — one source of truth, no drift.
- **D-16:** The red scan is a **new standalone static script** (working name `scripts/scan-brand-residue`, final name planner's pick) reading tokens from the inventory with a committed scope list. Grep-class, no build required. It is a separate layer from the runtime `verify-branding*.mjs` verifiers and grows into VER-01 in Phase 6.
- **D-17:** "Demonstrably red" (success criterion 1) means **reconciled counts**: on the pre-rename tree, every inventoried brand/identity token is found where the inventory says, totals reconcile, and the run's report is committed in the phase dir as evidence. A nonzero exit alone is insufficient — it wouldn't catch an under-scanning scanner.
- **D-18:** After the rename turns it green, the scan becomes a **permanent gate** — it joins the verify/smoke script set immediately and must pass from Phase 1 onward. Residual Sourcerer strings can never re-enter.

### Post-research decisions (added 2026-08-30, after 01-RESEARCH.md)

- **D-19:** **GUI-01 and GUI-02 are net-new work in Phase 1, not migration.** Research disproved the earlier "the browser toggle already exists in sourcerer" premise three ways: sourcerer's CLAUDE.md hard rule ("Theia is the only GUI in v4.0. No custom browser chrome"), `sourcerer.xhtml`'s own header comment, and the absence of any `http:`/`https:` open handler or `browser-bridge` package. Both stay in Phase 1 and are planned as new features. Success criteria 3 and 4 are unchanged. — **Reversibility:** reversible — they could still be split into a later phase before execution starts.
- **D-20:** The GUI-01 approach gets a **spike task before the implementation task commits to it**. Research's mechanism (move startup-window selection out of patch `020`'s `BROWSER_CHROME_URL` override and into the already-registered `a-sourcerer` command-line handler, restoring stock chrome — working Ctrl+L, working modal dialogs) is verified at all four upstream call sites but never executed. The spike must confirm the side effects at the five call sites that read `BROWSER_CHROME_URL` directly before the plan hard-commits. Bonus if it holds: patch `020` becomes a pure hook patch, pre-paying part of Phase 5's MIG-05.
- **D-21:** `scripts/verify-phase-0{2,3,4,5}.sh` — **migrate the checks, consolidate the drivers.** Port the actual assertions into a single `scripts/verify-platform.sh`; drop the four per-phase driver shells. Keeps coverage while cutting ~247 occurrences (4 files) out of the rename surface.
- **D-22:** `@theia/mini-browser` is flagged `SUS` (`too-new`) by the package audit — the flag derives from v1.75.0's publish date, not the pinned 1.74.1, and the package is first-party Theia. A `checkpoint:human-verify` must precede installing it.

### Claude's Discretion
- Inventory file format (TOML vs JSON) and exact scan script name.
- URL paths under powerbrowser.org (support, release notes, etc.).
- Placeholder mark design.
- Rename script language/tooling and the exact staging of the per-class commits.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning (this repo)
- `.planning/PROJECT.md` — stream model, fixed-identifier decision, configuration.toml planned sections
- `.planning/REQUIREMENTS.md` — MIG-01..05, GUI-01..04 texts and traceability
- `.planning/ROADMAP.md` — Phase 1 success criteria and binding ordering constraints (scan red before rename; inventory before rename; no generator in Phase 1)

### Source tree (external — read-only, frozen)
- `/home/chris/coding/sourcerer/docs/PRODUCT-REQUIREMENTS.md` — the 2026-08-22 stream-model decision this project executes (stays downstream, does NOT migrate)
- `/home/chris/coding/sourcerer/docs/BUILD.md`, `docs/CUSTOMIZE.md`, `docs/URI-SCHEMES.md` — platform machinery docs (migrate + debrand)
- `/home/chris/coding/sourcerer/scripts/verify-branding-identity.mjs` — the six-surface exact-equality runtime verifier (renames in Phase 1; evolves in Phase 6, not now)
- `/home/chris/coding/sourcerer/patches/010-sourcerer-identity.patch`, `patches/020-sourcerer-shell.patch` — the full patch stack to rename and regenerate

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/fetch-upstream.sh`, `apply-patches.sh`, `rebase-upstream.sh` — the upstream re-fetch pipeline MIG-01 requires; migrates as-is (debranded)
- `scripts/smoke-firefox.sh`, `smoke-theia.sh` — the "existing smoke tests" MIG-04 cites as the boot proof
- `scripts/verify-*.mjs` + `scripts/lib/firefox-bidi.mjs` — runtime verification harness (WebDriver BiDi); rename only in Phase 1
- Theia extensions `branding`, `customize` (GUI-03 customize bridge), `tab-uris` (GUI-04 tab URI registry), `token-gate` (backend security) — **GUI-03 and GUI-04 are satisfied by these surviving migration.** ⚠ **Corrected 2026-08-30:** GUI-01 (browser-UI toggle) and GUI-02 (web pages as URL-addressable Theia tabs) are **not** covered by any existing extension — see D-19. `tab-uris` provides the `TabUriRegistry` contract GUI-02 will build on, but no `http:`/`https:` open handler exists.

### Established Patterns
- Zen-style layout: pinned `upstream/` + `patches/` + own tree + Theia sidecar; downstreams add, never patch
- Identity via patch: `MOZ_APP_VENDOR`/`MOZ_APP_UA_NAME` set in `010-*-identity.patch` on `browser/moz.configure`; UA name stays "Firefox", `MOZ_APP_ID` stays Firefox's
- Security rationale lives in comments citing decision IDs (D-98, SIDE-04) — classified `frozen`, preserved verbatim

### Integration Points
- **755 brand occurrences across 69 files** (measured 2026-08-30 over `git ls-files`, after D-03's exclusions — supersedes the earlier ~1,090 estimate). D-21's consolidation keeps another 247 occurrences across 4 files out of the surface. Six coupled reference formats (jar.mn, components.conf, moz.build, patch content, verifier regex, file/dir names) — the inventory must cover all six.
- **Three raw case forms, five replacement targets.** TitleCase `Sourcerer` is ambiguous between the display value (`Power Browser`, with a space) and the identifier value (`PowerBrowser`). Disambiguating per occurrence — not the raw count — is the phase's central hazard; the inventory's case-form field must record which target each TitleCase occurrence takes.
- `sourcerer/` own tree → `powerbrowser/`; `sourcerer.desktop` / `sourcerer-release.desktop` → powerbrowser equivalents
- Env vars (`SOURCERER_TOKEN`, `SOURCERER_SUPERVISED`, `SOURCERER_ENV` module) rename with the identity class

</code_context>

<specifics>
## Specific Ideas

- The import commit message must name the exact sourcerer SHA — it is the only provenance link once history is not imported.
- The rename script consuming the same data file the scan reads was chosen specifically so "what was scanned" and "what was renamed" cannot drift.

</specifics>

<deferred>
## Deferred Ideas

- Real Power Browser logo to replace the Phase 1 placeholder mark (any time; pure asset swap by Phase 2+)
- Custom default homepage/search (`powerbrowser.org`, engine choice) — revisit when `[urls]` lands in Phase 2

</deferred>

---

*Phase: 1-Platform Extraction and Rename*
*Context gathered: 2026-08-29*
