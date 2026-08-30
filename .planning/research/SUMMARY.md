# Research Summary

**Project:** Power Browser — rebrandable Firefox-ESR + Theia platform
**Synthesized:** 2026-08-29
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

Power Browser has no existing "standard stack" to adopt — the only real prior art is Zen Browser's `surfer`, and the right move is to copy its *shape* (one manifest + generator) while rejecting its *implementation* (a 20-dependency CLI that owns the whole build). Nearly the entire stack already exists in the sourcerer tree; the net-new surface is three dependencies (`smol-toml`, `sharp`, and Nix's built-in `fromTOML`) plus roughly 400 lines of plain Node ESM. The architecture research converges on the same shape independently: `configuration.toml` + `brand/` as the only tracked inputs, a single Node generator that is the only TOML parser in the system, and one gitignored `generated/` root that every downstream build reads from — never committed, never hand-edited.

The critical risk is not "the build breaks," it is "the build succeeds and is silently wrong." Sourcerer's own history already produced three classes of silent failure: a blind rename that touches a load-bearing sort key or a DNS-derived contract ID, a verifier that reads the manifest instead of the built artifact and passes tautologically, and a residual-brand scan that is either noise (matches upstream Gecko's own `firefox*` files) or a false pass (substring-matched). All three recur as first-class pitfalls this project must design against from the schema stage forward, not discover after the generator exists.

The recommended approach is a strict seven-phase build order: (1) mechanical extract+rename with zero generator, proven by boot; (2) generator core with cheap emitters, proven byte-identical to phase 1's hand-written files; (3) Firefox branding emitter + icon pipeline; (4) Theia emitter (highest-unknown phase — untested `theiaPlugins`/Open VSX pinning); (5) de-configure the patches into hook-only form; (6) verification + docs; (7) Sourcerer reproduced as a downstream, the milestone's real acceptance test, gated by adversarial fixtures (space in name, non-square logo, missing required key) — not just the friendly Sourcerer config.

## Corrections Needed to PROJECT.md

These are contradictions between PROJECT.md's stated design and what FEATURES.md/PITFALLS.md found. The roadmapper and requirements phase should treat these as resolved-by-research, not open questions.

1. **`[telemetry] send-to-theia` toggle does not correspond to anything real.** FEATURES.md confirms Theia IDE ships zero telemetry and no upstream collector — "no setting or hidden switch that could activate any collection." Theia 1.74 only ships a *framework* (`telemetry.telemetryLevel`: `off|crash|error|all`, default off; `telemetry.filters`) with no shipped destination. **Fix:** replace the `send-to-theia` toggle with Theia's actual enum (`level = off|crash|error|all`) plus `endpoint`, and have Power Browser itself implement the one shipped destination.

2. **"Unset values fall back to Power Browser defaults" is a footgun for identity fields, not just a convenience.** PITFALLS.md (Pitfall 5) shows this literally means a downstream that forgets `[product] vendor` ships a build branded "Power Browser" — distributing under a mark that is not theirs, the exact failure the project exists to prevent. **Fix:** two-tier schema — identity/legal keys (`name`, `short_name`, `vendor`, `basename`, `binary_name`, `app_id`, `copyright_holder`) have no code-level default and hard-fail the generator when missing, naming the key; all other (cosmetic) keys may default silently but the generator must echo every default it applied at build time.

3. **"Grep for the platform name comes back empty" is not an achievable verification criterion.** Both FEATURES.md and PITFALLS.md (Pitfall 8) independently confirm this is already refuted in sourcerer's own `verify-branding-identity.mjs` header — a correctly branded build still ships dozens of files with `firefox` in the name (upstream feature files, `MOZ_APP_UA_NAME`, `-brand-product-name` compat strings). **Fix:** two-layer verification — Layer A (static, seconds): `generate --check` clean + a scoped literal-scan with an explicit include/exclude list, case-variant coverage, and a committed, reasoned allowlist. Layer B (runtime): the existing six/seven-surface exact-equality check against the *built artifact*, never against the manifest itself (Pitfall 6 — verifying TOML against generator output is tautological).

4. **Minor scope correction:** PROJECT.md's `configuration.toml` sketch has one `name` field implicitly feeding both display and machine identity. PITFALLS.md (Pitfall 3) shows `MOZ_APP_NAME = MOZ_APP_BASENAME.lower()` with zero sanitization in Gecko — a display name with a space produces a binary literally named `power browser`. **Fix:** three separate fields — `[product] name` (display, free text), `[identity] basename` (MOZ_APP_BASENAME — profile dir + remoting), `[identity] binary_name` (validated `^[a-z][a-z0-9-]{1,31}$`, hard-fail on violation, never silently sanitized).

## Key Findings

### Stack (Confidence: HIGH)

- Carry over the sourcerer stack unchanged: Firefox ESR `153.1.0esr`, Theia `1.74.1` (pin — do not bump in this milestone), Node 22 for the Theia toolchain (with the yarn-override fix for `drivelist`'s node-gyp), Yarn 1.22 classic, TypeScript `~5.9.3`, React 18.3.1, the existing Nix flake shells.
- Net-new dependencies, total: `smol-toml@1.8.0` (zero-dep TOML 1.0.0 parser — must be 1.0.0, not 1.1.0, to agree with `builtins.fromTOML`), `sharp@0.35.4` (SVG→PNG rasterization, no system library required), and Nix's built-in `fromTOML` (for `[upstreams]` pins only, at eval time).
- No templating engine — plain `${var}` substitution that throws on unknown keys. No `zod`/`ajv`/`commander`/`chalk` in the generator — every dependency is a thing a stranger's first `npm ci` can fail on.
- `sharp` pitfall: must rasterize at target density (`density: 72 * targetPx / intrinsicPx`), not resize-after-render, or small icons blur.

### Features (Confidence: MEDIUM — canonical artifacts read verbatim, but transport-graded LOW by the confidence seam)

- Table stakes (P1, must ship in v1): three-length display name (full/short/shorter), machine identity fields (appId, binaryName, remoting name, URI scheme, config-dir name, npm scope — separate surfaces, not derived from each other), generated Firefox branding directory (Linux subset only) with `--with-branding` wiring, icon set generated from one SVG, atomic generation of `brand.ftl`+`brand.properties`+`brand.dtd` together (a known defect class — they've silently disagreed before), Theia frontend config generation, enumerated verification reading the manifest (not hardcoded), URLs/legal/upstream-pins blocks, `REBRANDING.md`, Sourcerer-as-downstream proof.
- Deferred to v1.x: telemetry destination, multi-source-kind extensions (npm/local path), second-file-touched CI guard, build channel variants.
- Deferred to v2+: Windows/macOS branding assets, prefs/policies pointer, multi-brand matrix, published schema for third parties.
- Anti-features to explicitly avoid: runtime-reloadable config (branding is compiled in — Fluent bundle, `application.ini`, binary name), multi-brand matrix in one manifest, inline prefs/policies in `configuration.toml` (LibreWolf deliberately keeps these in a separate repo — different cadence, 100x the field count), unpinned extension fetch, GUI rebrand wizard (the manifest *is* the UI).

### Architecture (Confidence: HIGH for local-tree findings)

- Three governing findings: (1) debranding renames *user-visible product identity*, not internal symbols — `chrome://powerbrowser/`, `@powerbrowser/*`, pref branches, env-var prefixes stay fixed forever across every downstream, roughly halving the generator's real scope; (2) nothing generated is ever committed, nothing committed contains a brand literal — one gitignored `generated/` root; (3) the generator composes rather than templates everything — verbatim policy fragments (like the 150-line `pref/firefox-branding.js`) get concatenated with a small generated brand delta, never placeholder-ized wholesale.
- Six architectural patterns to apply: hook-only patches (patches add `include()`/`DIRS +=` lines only, never carry values), compose-don't-template, one parser one direction (Node generator is the only TOML consumer; Nix's `fromTOML` is a deliberate, narrow exception for `[upstreams]` pins only), the fixed/configurable split (Pattern 4's two-column list), config-directory indirection for downstream layering (`PB_CONFIG_DIR`, no forking/patching), and icon rasterization from one source SVG at generation time.
- Seven anti-patterns to actively avoid: templating patch files, renaming internal identifiers per downstream, committing generated files, making the generator a Nix derivation, three languages parsing the same TOML, `#ifdef`-ing downstream features into the platform, and the refuted grep-for-empty verification criterion.

### Pitfalls (Confidence: HIGH for sourcerer-tree-derived pitfalls; LOW for the two trademark items — web-sourced, not legal advice)

Top 5 critical pitfalls, ranked by how silently they fail:

1. **Blind `s/sourcerer/powerbrowser/g` rewrites non-brand tokens** — DNS-derived contract IDs, position-sensitive sort keys, `MOZ_APP_ID`, frozen Fluent compat strings (`-brand-product-name = Firefox`), MPL license text, schema key names. ~1,090 occurrences across 80 files, five case-variant forms. Prevention: a committed token-classification inventory (brand/identity/frozen/coincidental) as the rename phase's *first* task, not a review after.
2. **A TOML value feeding a position-sensitive sort key** — `components.conf`'s `"a-sourcerer"` category name sorts ahead of `"m-browser"` by `strcmp`; a downstream binary name starting with a later letter silently breaks single-instance activation with zero build failure. Prevention: keep the `a-` prefix literal in the template; add a generator-time `strcmp` assertion.
3. **`MOZ_APP_NAME = MOZ_APP_BASENAME.lower()`, unsanitized** — a display name with a space produces a binary with a space in it, cascading into `.desktop` `Exec=`, `StartupWMClass`, and profile-directory paths. Prevention: three separate schema fields (name/basename/binary_name), regex-validated, hard-fail not silent-sanitize.
4. **Silent patch no-op** (`git apply --3way` exits 0 on already-adopted content) **regresses if the non-vacuity assertion is dropped during extraction**, and **templating a `.patch` file from TOML invalidates its own blob-hash chain**, degrading `--3way` back into the exact silent-drop mode it exists to prevent. Prevention: never template a patch file; carry the hash-comparison assertion and its self-test forward verbatim.
5. **Unset TOML values silently default to Power Browser's own identity** — a downstream that forgets `vendor` ships a build saying "Power Browser" everywhere, distributing under a mark not theirs. Prevention: required-key hard-fail with no code-level default, defaults echoed at build time for the cosmetic majority.

Also load-bearing: tautological verification (Pitfall 6 — verify against the built artifact, never the manifest that produced it), vacuous parameterized checks (Pitfall 7 — one hardcoded path silently makes every variant but one untested), and the residual-scan scoping trap (Pitfall 8 — too wide hits `upstream/`/`objdir*/` and gets `|| true`'d, too narrow/substring-matched is a false pass).

## Implications for Roadmap

### Consolidated Phase Ordering

All three research files converge on the same shape; ARCHITECTURE.md's 7-step order is the spine, with PITFALLS.md's ordering constraints and FEATURES.md's dependency chain folded in as gates within/between phases.

| # | Phase | Delivers | Ordering rationale (why here, not earlier/later) |
|---|-------|----------|-----|
| 1 | **Extract + rename** (with residual-scan proven red *first*, as its own sub-step before the rename runs) | `powerbrowser/` tree, `@powerbrowser/*`, `PowerBrowserAPI.sys.mjs`, chrome package, pref branch, env vars; hardcoded "Power Browser" everywhere; boots | No generator yet — deliberately, so failures are unambiguous (pure rename, binary pass/fail). **Highest-risk phase** — PROJECT.md's plan-review-convergence flag is correct. Task 1 within this phase is the token-classification inventory (Pitfall 1) — it precedes the rename, it is not a review of it. Task 0 is proving the residual scan goes red on an untouched tree (Pitfall 8) — otherwise the rename's completion has no measure. |
| 2 | **Schema + generator core + cheap emitters** (env.sh, mozconfig, desktop) | TOML schema + defaults-merge; the required/optional identity split (Pitfalls 3, 5) | Free, total acceptance test: generated output must be byte-identical to what phase 1 wrote by hand. Requires phase 1 first. Schema-design decisions (binary_name validation, required-key hard-fail) belong here, not discovered inside the generator later. |
| 3 | **Firefox branding emitter + icon pipeline** | Both variants, all five PNGs, atomic `brand.ftl`+`brand.properties`+`brand.dtd`, composed pref file, moz.build/jar.mn/configure.sh | Same byte-identical proof; separated from phase 2 because it adds the `sharp` dependency and the dev/release variant delta — the two things most likely to need iteration. Icon rasterization gates the branding directory (FEATURES.md dependency chain). |
| 4 | **Theia emitter** | Generated app manifest, `brand.json`, `applicationName`, welcome/about/mark reads, `theiaPlugins` from `[extensions]` + `theia download:plugins` | Independent of phase 3 (Firefox half vs Theia half) — can run in parallel. Carries the most unknowns: `theiaPlugins`/Open VSX pin semantics are unexercised in this tree. |
| 5 | **De-configure the patches** | `imply_option` block moved into `generated/identity.configure`; patches become hook-only; `check-patch-surface.sh` extended | Must follow 2–3 — `generated/` and the `upstream/generated` symlink must exist before a patch can `include()` into them. Cheap once they do. |
| 6 | **Verification + docs** | `tools/verify.mjs` (Layer A: check-clean + scoped literal scan), retargeted `verify-branding-identity.mjs` (Layer B, artifact-based), endpoint allowlist wiring, `docs/REBRANDING.md` | The literal scan can only pass meaningfully once every surface is generated — running it earlier produces noise. Verifier's contract (Pitfall 6) depends on what the generator emits (a manifest of every file it wrote), so generator must precede this. |
| 7 | **Sourcerer as downstream** | `PB_CONFIG_DIR`, separate repo with only `configuration.toml`+`brand/`, Sourcerer-branded build from the untouched platform | The milestone's real acceptance test — proves the boundary rule. Must be last (needs 1–6 done) and **must be joined by adversarial fixtures** (name with a space, name starting with `z`, non-square logo, config missing a required key) — Sourcerer's own config is a friendly input the platform may have accidentally been built around. |

**Ordering constraints that cut across phases** (from PITFALLS.md, binding on the roadmap):
- Residual scan (P8) is written and proven red *before* the rename runs.
- Classification inventory (P1) precedes the rename, as its first task, same phase.
- Schema decisions (P3, P5) precede the generator — not discovered inside it.
- Generator precedes the verification rewrite (P6) — verifier needs the generator's file-manifest output.
- Sourcerer reproduction is last, and insufficient alone without adversarial fixtures.

### Research Flags

Phases needing `/gsd-plan-phase --research-phase <N>` during planning:

- **Phase 1 (Extract + rename)** — HIGH. ~1,090 occurrences, five case forms, six coupled reference formats (jar.mn, components.conf, moz.build, patch content, verifier regex). Needs its own deep pass on the token-classification inventory before any replacement runs.
- **Phase 4 (Theia emitter)** — HIGH. `theia download:plugins` / Open VSX pin semantics are completely unexercised in the current tree (no `theiaPlugins` block has ever existed here); whether a pin can be verified by hash is unknown.
- **Trademark/legal surface** (likely folded into phase 6 or its own gating item) — MEDIUM. Both Mozilla and Eclipse Foundation trademark findings in PITFALLS.md are LOW-confidence, web-sourced, and explicitly flagged as needing re-verification against primary policy text before the milestone gates on them. Also needs a named human-verification ritual (open every file in `brand/`, not judged by filename) recorded with reviewer and date.
- **Phase 3 (Firefox branding emitter)** — needs a narrow, early spike (not full research) to validate `--with-branding` pointing into a sibling `generated/` directory via the existing symlink mechanism — architecturally sound but never executed. Validate with a throwaway branding directory before building the full emitter.

Phases with well-documented patterns (skip deep research, treat as mechanical porting):
- **Phase 2 (schema + generator core)**, **Phase 5 (de-configure patches)**, **Phase 6 (verification mechanics, once phase 4's Theia unknowns are resolved)** — these are "porting, not discovery," per PITFALLS.md's own confidence assessment (LOW-effort ports of well-trodden sourcerer Phase 3 work).
- **Asset pipeline (icon rasterization)** — the `sharp`/density pitfall and the aspect-ratio distortion pitfall are both already fully characterized with concrete prevention steps.

### Open Questions to Resolve During Phase Research

Carried forward verbatim from the four research files — these are gaps, not settled facts, and should be treated as phase-research inputs rather than roadmap blockers:

1. **`MOZ_APP_VENDOR` configure behavior** — STACK.md flags that `imply_option("MOZ_APP_VENDOR", ...)` conflicts with an explicitly-set option, and `toolkit/moz.configure:103-106` `die()`s if no value is supplied at all. Needs a real `configure` run to confirm the generated-`.mozconfig` route (`mk_add_options "export MOZ_APP_VENDOR=..."`) actually works with the `imply_option` line dropped from the patch. Fallback: a templated patch (but see Pitfall 4 — templating patches is otherwise forbidden, so this specific exception needs explicit design).
2. **`--with-branding` out-of-tree path via the `upstream/generated` symlink** — architecturally sound (same mechanism already proven for `upstream/powerbrowser`), but never executed with a generated (not hand-written) branding directory. Validate early in phase 3 with a throwaway directory before building the full emitter.
3. **`moz.build`/`branding.nsi` exact contents and depth constraints** — the `../../../browser/branding/branding-common.mozbuild` include-depth is fixed by the symlink layout (ARCHITECTURE.md Pattern 3); confirm the generator never varies branding-directory nesting depth, only the variant name.
4. **Open VSX pin semantics** — whether a `[extensions]` entry can be pinned to an exact version and verified by hash is unverified in this tree; no `theiaPlugins` block has ever existed here. Core unknown for phase 4.
5. **`sharp` output determinism / 16px fidelity across versions** — assumed, not measured. If `--check`'s byte-diff proves flaky across `sharp` versions, the documented fallback is comparing decoded pixel data instead of raw PNG bytes. Also unresolved: whether incremental `mach build` removes the orphaned old-name binary when `MOZ_APP_NAME` changes (verify on the first branded build, do not assume).
6. **Both trademark findings (Mozilla and Eclipse Foundation)** are LOW-confidence web-sourced claims that shape phase-ordering risk but need re-verification against current primary policy text before any milestone gate depends on them.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against the live sourcerer tree, vendored Firefox ESR source, npm registry metadata, and a running Nix 2.34.8 instance. Empirically tested `builtins.fromTOML` behavior this session. |
| Features | MEDIUM | Canonical artifacts (surfer.json, Firefox branding directory listing, Theia telemetry docs, local verify scripts) read verbatim — high practical reliability — but the confidence seam grades all `websearch`/`webfetch` transport as LOW regardless of source authority. VSCodium/Chromium exact field names need re-verification against the real files before coding against them. |
| Architecture | HIGH | Everything derived from direct inspection of `/home/chris/coding/sourcerer` — actual files read, not descriptions. Zen Browser's `surfer` used only as corroboration that the shape is production-proven, never as a load-bearing claim. |
| Pitfalls | HIGH for tree-derived pitfalls (1–13, 15–22); MEDIUM for manifest-generation failure modes (5, 9 — no generator exists yet to observe, inferred from design + two real drift incidents); LOW for the two trademark items (14) — web-sourced, explicitly flagged as not legal advice. |

**Overall confidence: HIGH**, with two explicitly bounded gaps: no generator has been built yet (so generator-specific pitfalls are well-reasoned inference, not observation), and the trademark scope needs primary-source re-verification before any milestone gate depends on it. Both gaps are already flagged for phase-level research above and should not block roadmap creation.

## Sources

Aggregated from all four research files — see each file's own Sources section for full detail and per-claim confidence tiers. Primary sources of record:

- `/home/chris/coding/sourcerer` — full local tree read directly this session: `flake.nix`, `.mozconfig`, `patches/*.patch`, `sourcerer/branding/**`, `scripts/**`, `theia/**/package.json`, `theia/extensions/branding/src/**`, `.planning/phases/03-*`, `.planning/STATE.md`, `docs/PRODUCT-REQUIREMENTS.md`, `docs/BUILD.md`
- Vendored Firefox ESR 153.1.0 upstream source: `browser/branding/branding-common.mozbuild`, `browser/branding/unofficial/**`, `toolkit/moz.configure`, `js/moz.configure`, `toolkit/xre/nsAppRunner.cpp`, `xpcom/components/nsCategoryManager.cpp`, `widget/gtk/{nsAppShell,nsWindow}.cpp`
- npm registry metadata (smol-toml, sharp, @theia/core, typescript, TOML alternatives) — read directly, HIGH
- `product-details.mozilla.org` (Firefox ESR version data, 2026-08-29) — HIGH
- zen-browser/desktop `surfer.json`, zen-browser/surfer source — read verbatim, transport-graded LOW but practically HIGH (canonical GitHub raw content)
- Theia official docs (theia-ide.org — Data Usage and Telemetry, Extensions and Plugins) — HIGH practical reliability, LOW transport tier
- Mozilla and Eclipse Foundation trademark policy pages — LOW confidence, web search only, flagged for re-verification

---
*Research synthesis for: Power Browser — rebrandable Firefox-ESR + Theia platform*
*Synthesized: 2026-08-29*
