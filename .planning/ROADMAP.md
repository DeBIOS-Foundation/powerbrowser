# Roadmap: Power Browser

## Overview

Power Browser starts as a copy of the sourcerer platform tree and ends as a
platform a stranger can rebrand by editing one file. The journey has a
deliberate shape: first the tree is extracted and renamed to fixed platform
identifiers with **no generator at all** — branding values hand-written — so
that the rename either works or doesn't, with nothing else to blame. Then the
`configuration.toml` schema and generator arrive, and their acceptance test is
free: generated output must be byte-identical to the files Phase 1 wrote by
hand. From there the two emitter halves (Firefox branding + icons, Theia
branding + extensions + telemetry) fill in every remaining surface, the patch
stack is de-configured into hook-only form, verification is rebuilt to read
expectations from the manifest instead of constants, and finally Sourcerer is
reproduced as a pure downstream — the milestone's real acceptance test, gated
by adversarial fixtures so the platform can't have been accidentally built
around one friendly config.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Platform Extraction and Rename** - Sourcerer's platform code becomes a booting, browsable `powerbrowser/` tree with hand-written branding
- [ ] **Phase 2: Configuration Manifest and Generator Core** - `configuration.toml` + `brand/` become the only rebrand inputs, proven byte-identical to Phase 1
- [ ] **Phase 3: Firefox Branding Emitter and Icon Pipeline** - Every Gecko-side branding surface, icon, and installer field generated from the manifest
- [ ] **Phase 4: Theia Surface — Branding, Extensions, Telemetry** - Theia-side branding, declared extensions, and the telemetry pipeline driven by the manifest
- [ ] **Phase 5: Hook-Only Patches and Upstream Uptake** - Patches carry no brand values; an upstream release is adopted by editing one pin
- [ ] **Phase 6: Two-Layer Verification and Rebranding Docs** - The build proves its own branding correctness for any downstream, and a stranger has a guide
- [ ] **Phase 7: Sourcerer as Downstream** - An external config repo yields a fully branded product from an untouched platform tree

## Phase Details

### Phase 1: Platform Extraction and Rename

**Goal**: The Power Browser platform tree exists in this repo, builds, boots, and works as an actual web browser under fixed platform identifiers — with no generator involved
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: MIG-01, MIG-02, MIG-03, MIG-04, GUI-01, GUI-02, GUI-03, GUI-04
**Success Criteria** (what must be TRUE):

  1. A committed token-classification inventory (brand / identity / frozen / coincidental) exists, and the residual-brand scan is demonstrably red on the pre-rename tree — both before any replacement runs
  2. The repo builds from an `upstream/` re-fetched by script (no copied checkouts, no copied objdirs) and launches a Power-Browser-branded application on Linux that passes the existing smoke tests
  3. A user can toggle from Theia to proper browser UI and back, and open web pages as URL-addressable tabs inside Theia — with nothing welding Theia to full-window presentation, so the future unified tab strip stays landable
  4. A user can restyle and re-shape the GUI at runtime through a Theia extension using the customize bridge (runtime CSS layer + dev-flagged privileged JS), without forking the platform
  5. Internal identifiers resolve everywhere in their fixed platform form — `powerbrowser/` tree, `@powerbrowser/*` scope, `PowerBrowserAPI.sys.mjs`, `chrome://powerbrowser/` — and every branding value in the tree is a hand-written literal, not a generated one

**Plans**: 1/7 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Import the platform tree and prove the rename machinery on one coupled chain, then classify all 755 occurrences and commit the reconciled red-scan evidence

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — Execute the rename: `git mv` every branded path, then rewrite content staged by contract until the residual scan is green

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03-PLAN.md — Hand-write every display literal, create the original square placeholder mark, and build the pre-build preflight plus the consolidated verifier

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-04-PLAN.md — Walking skeleton far end: re-derive the patches, fetch upstream, build Gecko, and verify branding on the built artifact

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-05-PLAN.md — GUI-01: spike the command-line-handler startup-window move, ratify it, then land the browser-window toggle

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-06-PLAN.md — GUI-02: gated widget install, http/https open handler, frame-refusal carve-out, and the tab-URI registry shape assertion

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 01-07-PLAN.md — User-facing error copy, keyboard focus indicator, `CLAUDE.md`, and the full-suite phase gate

**UI hint**: yes
**Research**: recommended — ~1,090 occurrences across five case-variant forms and six coupled reference formats (jar.mn, components.conf, moz.build, patch content, verifier regex); the classification inventory needs its own deep pass. Highest-risk phase; plan-review-convergence applies. *(Research completed 2026-08-30: the real migrating surface measured 755 occurrences across 69 files; GUI-01 and GUI-02 found to be net-new work, not migration.)*

### Phase 2: Configuration Manifest and Generator Core

**Goal**: A downstream author can express their entire brand in `configuration.toml` + `brand/`, and one generator turns it into the cheap build surfaces
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, GEN-04
**Success Criteria** (what must be TRUE):

  1. Running the generator against Power Browser's own `configuration.toml` reproduces Phase 1's hand-written env script, `.mozconfig`, and desktop files byte-for-byte — and those files are no longer edited by hand
  2. Generation hard-fails and names the offending key when any identity field (vendor, app basename, binary name, remoting name) or legal field is unset — no build can proceed under Power Browser's mark by omission
  3. A basename or binary name violating `^[a-z][a-z0-9-]{1,31}$` is rejected at generate time with a clear message, never silently sanitized into an invalid `MOZ_APP_NAME`
  4. Cosmetic fields left unset fall back to Power Browser defaults that are themselves a `configuration.toml` (one merge code path), with every applied default echoed at generate time
  5. Everything the generator writes lands under a single gitignored `generated/` root, nothing generated is committed, and `generate --check` fails when that output is stale

**Plans**: TBD

### Phase 3: Firefox Branding Emitter and Icon Pipeline

**Goal**: Every Gecko-side branding surface — branding directory, icon set, installer fields — is materialized from the manifest
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: GEN-01, GEN-02, GEN-03
**Success Criteria** (what must be TRUE):

  1. The generator emits a complete Firefox branding directory with `brand.ftl`, `brand.properties`, and `brand.dtd` written atomically and cross-checked for agreement, plus `generated/identity.configure`, and a Linux build wired via `--with-branding` produces the correctly branded application
  2. All five Linux icon sizes (16/32/48/64/128) are rasterized at target density from the single source SVG/PNG in `brand/`, and the built application shows the downstream's icon in the launcher, window, and desktop entry
  3. Installer branding for Linux, Windows (NSIS/MSIX fields), and macOS (DMG/.icns fields) is emitted and schema-complete from `configuration.toml`, with the Linux output build-verified
  4. Changing the display name in `configuration.toml` and regenerating changes every Gecko-side branding surface, with no second file edited

**Plans**: TBD
**Research**: spike — validate `--with-branding` pointing into a sibling `generated/` directory through the existing symlink mechanism with a throwaway branding dir before building the full emitter. Open question: whether the generated-`.mozconfig` route works with the `imply_option("MOZ_APP_VENDOR", ...)` line dropped from the patch.

### Phase 4: Theia Surface — Branding, Extensions, Telemetry

**Goal**: Everything on the Theia side — product branding, declared extensions, telemetry delivery — is driven by `configuration.toml` with no TypeScript recompile for a rebrand
**Mode:** mvp
**Depends on**: Phase 2 (parallelizable with Phase 3)
**Requirements**: GEN-05, EXT-01, TEL-01, TEL-02, TEL-03
**Success Criteria** (what must be TRUE):

  1. Welcome tab, about dialog, product name, logo, and default theme display the downstream's branding from generated frontend config keys alone — a rebrand triggers no TypeScript recompile
  2. Extensions declared in `configuration.toml` with an Open VSX id or direct URL plus a pin are downloaded and bundled into the sidecar at build time; an unpinned or unreachable entry fails the build loudly
  3. With telemetry level `off` (the default) nothing leaves the application; with a level set, the Theia-side sender batches and retries delivery to the configured endpoint and honors the level (off / crash / error / all)
  4. Configured telemetry and URL hosts appear in the generated endpoint allowlist so `verify-endpoints` passes for an arbitrary downstream, and Mozilla's telemetry and crash endpoints are repointed or disabled per the manifest

**Plans**: TBD
**UI hint**: yes
**Research**: recommended — `theia download:plugins` and Open VSX pin semantics are entirely unexercised in this tree (no `theiaPlugins` block has ever existed here); whether a pin can be hash-verified is unknown. Highest-unknown phase.

### Phase 5: Hook-Only Patches and Upstream Uptake

**Goal**: The patch stack carries no brand values, and adopting an upstream release means editing one pin
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MIG-05, CFG-06, UPD-01, UPD-02
**Success Criteria** (what must be TRUE):

  1. No `patches/*.patch` contains a configured brand value — each patch only adds `include()` / `DIRS +=` hooks pointing into `generated/` — and every patch still applies with its 3-way-merge blob-hash chain intact, with the non-vacuity assertion still firing on a silent no-op
  2. Firefox ESR and Theia pins are declared once in `configuration.toml` and consumed by the fetch and build scripts; no version string is duplicated anywhere else in the tree
  3. Bumping the ESR pin and re-running fetch + patch apply produces a working branded build, and the rebase/conflict tooling fails loudly on drift rather than proceeding
  4. Bumping the Theia pin re-pins the sidecar with Theia core neither forked nor patched

**Plans**: TBD

### Phase 6: Two-Layer Verification and Rebranding Docs

**Goal**: The build proves its own branding correctness for any downstream, and a stranger has a document that carries them through a full rebrand
**Mode:** mvp
**Depends on**: Phase 4, Phase 5
**Requirements**: VER-01, VER-02, DOC-01
**Success Criteria** (what must be TRUE):

  1. A static scan with a committed scope list and boundary-matched (not substring-matched) tokens fails the build when any configured brand value is hardcoded outside the manifest — and also fails when an allowlist entry has gone stale
  2. Runtime verification checks the six branding surfaces by exact equality against the **built artifact**, reading expectations from `configuration.toml` rather than from constants, and fails when any surface disagrees
  3. `docs/REBRANDING.md` documents every `configuration.toml` field and walks a first-time reader from clone to branded build with no prior knowledge of the tree
  4. Both verification layers plus `generate --check` run in CI and pass on Power Browser's own build

**Plans**: TBD
**Research**: verify — the Mozilla and Eclipse Foundation trademark findings are LOW-confidence and web-sourced; re-check against primary policy text before any gate depends on them, and record the named human review of every file in `brand/` (opened, not judged by filename) with reviewer and date.

### Phase 7: Sourcerer as Downstream

**Goal**: A stranger's config, living in their own repo, produces their fully branded browser from an untouched platform tree
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: CFG-05, VER-03, DOC-02
**Success Criteria** (what must be TRUE):

  1. Pointing `PB_CONFIG_DIR` at an external directory builds from that config with zero edits inside the platform repo
  2. Sourcerer's own `configuration.toml` and logo assets — its branding entirely separate from Power Browser's, in its own repo — yield the Sourcerer-branded product, and Power Browser still builds and ships with Sourcerer absent from the tree
  3. Adversarial fixture configs (display name containing a space, name sorting after `m-browser`, non-square logo, missing required key) each either build and verify correctly or fail with the intended clear error — none silently produce a wrong build
  4. Both verification layers pass for every fixture, proving nothing in the platform is keyed to Power Browser's or Sourcerer's own values

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

Phases 3 and 4 are independent (Gecko half vs Theia half) and may run in
parallel once Phase 2 lands. Phase 5 requires Phase 3's `generated/` layout.
Phase 6 requires both emitter halves so the literal scan is meaningful rather
than noisy.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Extraction and Rename | 1/7 | In Progress|  |
| 2. Configuration Manifest and Generator Core | 0/TBD | Not started | - |
| 3. Firefox Branding Emitter and Icon Pipeline | 0/TBD | Not started | - |
| 4. Theia Surface — Branding, Extensions, Telemetry | 0/TBD | Not started | - |
| 5. Hook-Only Patches and Upstream Uptake | 0/TBD | Not started | - |
| 6. Two-Layer Verification and Rebranding Docs | 0/TBD | Not started | - |
| 7. Sourcerer as Downstream | 0/TBD | Not started | - |

## Coverage

All 31 v1 requirements map to exactly one phase each.

| Phase | Requirements |
|-------|--------------|
| 1 | MIG-01, MIG-02, MIG-03, MIG-04, GUI-01, GUI-02, GUI-03, GUI-04 |
| 2 | CFG-01, CFG-02, CFG-03, CFG-04, GEN-04 |
| 3 | GEN-01, GEN-02, GEN-03 |
| 4 | GEN-05, EXT-01, TEL-01, TEL-02, TEL-03 |
| 5 | MIG-05, CFG-06, UPD-01, UPD-02 |
| 6 | VER-01, VER-02, DOC-01 |
| 7 | CFG-05, VER-03, DOC-02 |

## Ordering Constraints (binding, from research)

- The residual-brand scan is written and proven red **before** the rename runs (Phase 1, task 0).
- The token-classification inventory precedes the rename as its first task, not as a review of it (MIG-02 before MIG-03).
- Phase 1 ships with **no generator** — hand-written branding files — so the generator phase's acceptance test is byte-identical output.
- Schema decisions (required-key hard-fail, binary-name validation) are made in Phase 2, not discovered inside a later emitter.
- Patch de-configuration follows generator existence — a patch can only `include()` into `generated/` once it exists.
- Verification is rewritten after the generator, because the verifier's contract depends on the generator's file manifest, and must read the built artifact, never the manifest that produced it.
- Sourcerer-as-downstream is last and is insufficient alone — adversarial fixtures ship alongside it.
