# Phase 2: Configuration Manifest and Generator Core - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning

<domain>
## Phase Boundary

`configuration.toml` + `brand/` become the only rebrand inputs, and one generator (`scripts/generate.mjs`) turns them into the cheap build surfaces: the two branding env scripts (`branding/{dev,release}/configure.sh`), `.mozconfig`, and the two `.desktop` files, written under a single gitignored `generated/` root. The generator hard-fails on missing identity/legal keys, rejects basenames violating `^[a-z][a-z0-9-]{1,31}$`, merges cosmetic defaults through one code path with a per-key echo, and offers `--check` for staleness. Covers CFG-01..04 and GEN-04.

Out of this phase: the Firefox branding directory, icon rasterization, installer fields (Phase 3, GEN-01..03); Theia frontend config, extensions, telemetry (Phase 4); repointing `--with-branding` / patch hooks into `generated/` and upstream pins (Phase 5, MIG-05/CFG-06); `PB_CONFIG_DIR` external config (Phase 7, CFG-05).

</domain>

<decisions>
## Implementation Decisions

### Byte-identity targets
- **D-01:** The generator writes into `generated/` and a registered check **diffs each output against the Phase 1 hand-written file**. Build consumers (`--with-branding`, `.mozconfig`, desktop install) keep reading the hand-written copies in Phase 2. Repointing consumers into `generated/` is Phase 3/5 work, already flagged in ROADMAP as an unexecuted spike. — **Reversibility:** reversible — repointing later is additive.
- **D-02:** The target set is **exactly five files**: `powerbrowser/branding/dev/configure.sh`, `powerbrowser/branding/release/configure.sh`, `.mozconfig`, `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop`. `brand.ftl`/`brand.properties`, PNG icons, `firefox-branding.js`, `policies.json`, and `endpoint-allowlist.json` stay hand-written until Phases 3/4.
- **D-03:** The `configure.sh` files carry a comment reading "A COMPILED define, hand-written (plan 01-03)...". The emitter **reproduces those bytes verbatim first**; once the byte-identity check is green, a same-phase follow-up commit rewrites the comment in both hand-written files AND the emitter to a "generated from configuration.toml — do not edit" header, and the check must stay green against the new bytes. Order matters: proof before the target moves.
- **D-04:** The desktop files' absolute `Exec=` and `Icon=` paths (`/home/chris/coding/Power-Browser/...`) are **derived from the resolved repo root at generate time** plus the objdir and branding-variant names. On the reference host the output is byte-identical; on another clone it is correct for that clone. **No machine-specific value enters `configuration.toml`.**

### Defaults + merge
- **D-05:** **The repo-root `configuration.toml` IS the defaults layer.** It is Power Browser's complete brand and doubles as the defaults a downstream's file overlays (the overlay source arrives with `PB_CONFIG_DIR` in Phase 7; Phase 2 must still implement the two-layer merge and exercise it in tests). No separate `defaults.toml`. — **Reversibility:** costly — splitting later changes what every downstream's file is merged against.
- **D-06:** Before merging, the loader **masks `[identity]`, `[legal]`, and the vendor key out of the defaults layer**, so a downstream omitting them hits the hard-fail even though Power Browser's own file supplies values. The required-key list is **one schema table** consumed by both the masker and the validator.
- **D-07:** Merge is **recursive, key-level, at any depth**; a leaf set downstream wins; **arrays replace** the whole default array (no concatenation), so a downstream can drop a default entry.
- **D-08:** Every applied default is echoed as **one stderr line per key**: dotted path plus value (e.g. `default applied: theia.default_theme = "dark"`), sorted by key path, printed on every run including `--check`. Nothing is echoed for keys the downstream set.

### Validation failure UX
- **D-09:** Validation **collects all failures and reports them all**, one per line, then exits non-zero. Never fail-on-first.
- **D-10:** A required key counts as **unset when missing OR when its value is an empty/whitespace-only string**. `identity.vendor = ""` fails identically to an absent key.
- **D-11:** Failure message shape: file, dotted key path, offending value, the rule in plain words, and a fix hint. Example: `configuration.toml: identity.binary_name = "My Browser" does not match ^[a-z][a-z0-9-]{1,31}$ (lowercase letters, digits, hyphens; 2-32 chars; starts with a letter)`. **No stack traces, no internal variable names** — the 01-UI-SPEC no-internals copy rule applies to generator output too.
- **D-12:** **Unknown keys are a hard error** naming the key, on the same channel as missing keys. A typo like `[identiy]` cannot silently do nothing. Consequence accepted: every new key needs a schema entry first.

### Runtime + CLI shape
- **D-13:** The generator is **Node (`scripts/generate.mjs`) with exactly one TOML parser dependency**, pinned in a root `package.json` or vendored under `scripts/lib/`. Node 24 has no built-in TOML parser (verified: `util.parseToml` undefined). Runs outside a dev shell like the other Node gates. Parser choice and vendoring form are researcher's pick.
- **D-14:** CLI: `scripts/generate.mjs [--check] [--self-test]`. Default run writes `generated/`. `--check` regenerates to a temp dir, diffs against `generated/`, exits 1 naming the stale paths. `--self-test` plants faults (missing vendor, invalid basename, unknown key, empty-string identity value, stale output) and requires each to go red naming the drift, per the repo's gate convention.
- **D-15:** Freshness joins `scripts/verify-platform.sh` as **two `--quick` registry rows**: one runs `generate.mjs --check`; one runs the byte-identity diff of `generated/` against the five Phase 1 files. Both also run in `.github/workflows/rebase-upstream.yml`. Appended rows only — no sibling driver.
- **D-16:** Layout: **`brand/` at repo root holds `mark.svg` from Phase 2** (moved from `powerbrowser/branding/mark.svg`); the ten PNG rasters stay hand-placed in `powerbrowser/branding/{dev,release}/` until Phase 3's icon pipeline. **`generated/` at repo root, added to `.gitignore`**; nothing under it is ever committed.

### Claude's Discretion
- TOML parser package and whether it is vendored or npm-pinned (D-13).
- Exact schema table representation (JSON vs JS module) and the section list `configuration.toml` carries in Phase 2 — at minimum the keys the five target files consume ([product], [identity], [legal], the dev/release variant selector, objdir names) plus whatever PROJECT.md's planned sections need as placeholders for hard-fail/default behaviour.
- How the dev/release variant pair is expressed (two variant tables vs one table plus a variant list).
- Whether `generated/` carries a committed `.gitkeep`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning (this repo)
- `.planning/PROJECT.md` — "configuration.toml planned sections" (the full intended schema), fixed-identifier decision, identity/legal hard-fail rule
- `.planning/REQUIREMENTS.md` — CFG-01..06, GEN-01..05 texts; CFG-05/06 and GEN-01..03/05 are explicitly later phases
- `.planning/ROADMAP.md` §Phase 2 — the five success criteria; §Phase 3 research note on `--with-branding` into `generated/` (the reason D-01 does not repoint consumers)
- `.planning/phases/01-platform-extraction-and-rename/01-CONTEXT.md` — D-09 (vendor split `DeBIOS` / `DeBIOS Foundation`), D-10 (`powerbrowser` one-word identifiers), D-13 (dev/release presentation split), D-14 (stock homepage/search kept)
- `.planning/phases/01-platform-extraction-and-rename/01-LEARNINGS.md` — "No generator in Phase 1" rationale; JSON-over-TOML zero-dependency reasoning for the inventory
- `.planning/phases/01-platform-extraction-and-rename/01-UI-SPEC.md` — no-internals copy rule, applied to generator error output (D-11)
- `CLAUDE.md` — verification rules: one driver/one registry; derive-and-compare, never hand-kept lists; every check gets a `--self-test`; residual-brand scan iterates `git ls-files` (a new unstaged file is invisible to it)

### The five byte-identity targets (read verbatim; these are the spec for the emitters)
- `powerbrowser/branding/dev/configure.sh` — `MOZ_APP_DISPLAYNAME="Power Browser Dev"` plus MPL header and the hand-written comment (D-03)
- `powerbrowser/branding/release/configure.sh` — `MOZ_APP_DISPLAYNAME="Power Browser"`
- `.mozconfig` — `--with-app-basename=powerbrowser`, `--with-distribution-id=org.debios`, `MOZ_APP_REMOTINGNAME=powerbrowser`, `${POWERBROWSER_OBJDIR:-objdir}`, `${POWERBROWSER_BRANDING:-powerbrowser/branding/dev}`
- `powerbrowser/powerbrowser.desktop`, `powerbrowser/powerbrowser-release.desktop` — absolute Exec/Icon paths (D-04), `StartupWMClass=powerbrowser`, `Categories=Development;IDE;`

### Adjacent identity source (not a target, but must agree)
- `patches/010-powerbrowser-identity.patch` — `imply_option("MOZ_APP_VENDOR", "DeBIOS")` stays in the patch until Phase 5; the generator's vendor value must match it and `verify-branding-identity.mjs` must keep passing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-platform.sh` — the single registry; D-15's two rows append here. Existing `--quick` rows show the label/exit-code convention.
- `scripts/verify-branding-preflight.mjs` — already cross-checks `configure.sh`'s `MOZ_APP_DISPLAYNAME` against the inventory before a build; after Phase 2 the generator becomes a second producer of that value and the preflight should keep passing unchanged.
- `scripts/scan-brand-residue.mjs` — permanent gate; `configuration.toml` and `generated/` contents must not spell the originating product's tokens. `generated/` is gitignored so the scan (which walks `git ls-files`) never sees it; `configuration.toml` and `brand/` are tracked and will be scanned.
- `inventory/brand-tokens.json` — precedent for a committed structured data file consumed by two tools; the schema table (D-06) follows the same one-source pattern.
- `scripts/lib/firefox-bidi.mjs` — precedent for hand-written shared code under `scripts/lib/`, the candidate home for a vendored TOML parser (D-13).

### Established Patterns
- Every gate has a `--self-test` that plants faults and requires each to go red naming the drift (CLAUDE.md). D-14 follows it.
- Derive from the tree and compare; never a hand-kept expectation list. The byte-identity check should enumerate the target set from one declared table and compare content, going red on an added or removed target.
- Zero non-Theia dependencies so far; D-13 admits exactly one, deliberately.
- All Node scripts run outside a dev shell; only `yarn` needs `nix develop .#theia`.

### Integration Points
- `.gitignore` gains `generated/`.
- `.github/workflows/rebase-upstream.yml` gains the two new rows (D-15).
- **`verify-branding-preflight.mjs` lines ~462-477 read `powerbrowser/branding/mark.svg` by path** — moving it to `brand/mark.svg` (D-16) requires updating that path in the same plan, or the preflight goes red.
- `powerbrowser/branding/{dev,release}/configure.sh` comment rewrite (D-03 step 2) touches two hand-written files; the inventory's `brand_display_expectations` block is unaffected because only the comment changes.
- The dev/release pair (D-13 in Phase 1) means every emitter runs twice per generate; the variant selector is the one non-brand input the generator needs.

</code_context>

<specifics>
## Specific Ideas

- Byte-identity is the acceptance test, so the emitters are written **to** the five files, not designed and then compared. Read the targets first.
- The masking rule (D-06) is what makes "root file is the defaults" safe: without it, a downstream that omits `[identity]` would silently inherit Power Browser's mark, which is the exact failure CFG-02 exists to prevent.
- Error lines are for a stranger doing a rebrand for the first time; they should read like `configuration.toml` documentation, not like a parser.

</specifics>

<deferred>
## Deferred Ideas

- Emitting `brand.ftl` / `brand.properties` from the manifest — Phase 3 (GEN-01), offered and declined for Phase 2.
- Emitting `powerbrowser/endpoint-allowlist.json` from `[urls]`/`[telemetry]` hosts — Phase 4 criterion 4, offered and declined for Phase 2.
- Repointing `.mozconfig` / `--with-branding` / desktop install into `generated/` and deleting the hand-written copies — Phase 3/5, after the `--with-branding`-into-`generated/` spike.
- Real Power Browser logo replacing the placeholder mark — any time, asset swap only (carried from Phase 1).
- Custom default homepage/search via `[urls]` — carried from Phase 1 D-14; `[urls]` keys may exist in the schema in Phase 2 but drive no output until Phase 4.

</deferred>

---

*Phase: 2-Configuration Manifest and Generator Core*
*Context gathered: 2026-09-01*
