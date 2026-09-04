# Codebase Concerns

**Analysis Date:** 2026-09-04

## Tech Debt

**Uncommitted working tree (03-02 icon pipeline WIP):**
- Issue: The working tree is dirty mid-phase. `scripts/generate.mjs` carries ~+340/-17 uncommitted lines (the GEN-02 raster step: `rasterizeIcons`, `iconSourceFailures`, `ICON_SIZES`, `MARK_SVG_REL`), plus uncommitted edits to `scripts/verify-generated-identity.mjs` (5→33 targets) and `scripts/verify-platform.sh` (seventeen-fault prose). The old `.planning/codebase/*.md` set shows as deleted, and `.planning/phases/01-platform-extraction-and-rename/01-VERIFICATION.md` was flipped `human_needed`→`passed` without a commit. None of this is lost, but the next session must reconcile (commit or revert) before trusting any gate output — byte-identity results measured now reflect uncommitted TARGETS rows.
- Files: `scripts/generate.mjs`, `scripts/verify-generated-identity.mjs`, `scripts/verify-platform.sh`, `.planning/phases/01-platform-extraction-and-rename/01-VERIFICATION.md`
- Impact: Any `--quick` or byte-identity run until commit is against uncommitted expectations; a `git stash` or careless checkout silently drops the icon pipeline.
- Fix approach: Finish 03-02 task 1 (commit per-task atomically per the phase's own convention), or `git stash` deliberately. Never run the tier-3 build proof from a dirty tree.

**Generator monolith growth:**
- Issue: `scripts/generate.mjs` is already 2694 committed lines (~3000 with the uncommitted icon step) and is the single file for every emitter (shell, desktop, mozconfig, locale, layout, icons, and soon installer fields). Each phase appends another section plus frozen TARGETS rows plus self-test cases. There is no module split because the byte-identity gate and `--self-test` conventions assume one file.
- Files: `scripts/generate.mjs`
- Impact: Merge conflicts on every parallel phase (3 and 4 both touch it); review burden per plan grows; one syntax error disables all 33 targets.
- Fix approach: Accept until Phase 5; if split, keep `TARGETS` and the banner in one module and move emitter families behind the same function signature, with the identity gate unchanged.

**Single-driver verifier scale:**
- Issue: `scripts/verify-platform.sh` is 4126 lines and every new check means appending a row plus a shell function in the same file. The registry pattern is deliberate (CLAUDE.md one-driver rule), but shell is doing work (BiDi orchestration, planted-fault extraction) at the edge of what stays readable.
- Files: `scripts/verify-platform.sh`
- Impact: Slow to navigate; a quoting bug in one row can break `--quick` for all rows.
- Fix approach: No split allowed by project rule; keep functions small and keep per-check logic in the `.mjs` siblings (`scripts/verify-*.mjs`) with the `.sh` row as a thin invocation.

**Patch 010 still carries brand values (MIG-05 scope):**
- Issue: `patches/010-powerbrowser-identity.patch` hardcodes `imply_option("MOZ_APP_VENDOR", "DeBIOS")` and `imply_option("MOZ_APP_UA_NAME", "Firefox")`. Patch 020 is already hook-only, but 010 is not — Phase 5 must de-configure it into an `include()` of `generated/identity.configure`, which does not exist yet (03-04 scope, GEN-01 still open).
- Files: `patches/010-powerbrowser-identity.patch`
- Impact: Every ESR rebase replays literal brand values through a three-way merge; a downstream rebrand today still requires patch context to stay valid.
- Fix approach: 03-04 emits `generated/identity.configure`; Phase 5 regenerates 010 as hook-only. Do not hand-edit the hunk (patch hashes degrade to silent no-ops — regenerate via `scripts/check-patch-surface.sh` + `apply-patches.sh` flow).

**Upstream pins not yet in the manifest (CFG-06):**
- Issue: The Firefox ESR tag and Theia release pin live in `scripts/fetch-upstream.sh`, `flake.nix` (`firefox-esr-153-unwrapped`, `nodejs_22`), and `theia/package.json` (`@theia/*@1.74.1`), not in `configuration.toml`. Single-pin uptake is Phase 5 work.
- Files: `scripts/fetch-upstream.sh`, `flake.nix`, `theia/package.json`
- Impact: Version strings can drift across files today with no gate to catch it.
- Fix approach: Phase 5 moves pins into `[upstreams]` and makes fetch/build scripts consume them; add a pin-consistency registry row at that time.

**Placeholder mark still shipped:**
- Issue: `brand/mark.svg` is the IEC 60417-5009 power glyph placeholder (D-11), and the ten tracked PNG rasters under `powerbrowser/branding/{dev,release}/` are derived from it. The icon pipeline (03-02) faithfully reproduces placeholder bytes — correct mechanism, placeholder content.
- Files: `brand/mark.svg`, `powerbrowser/branding/dev/default*.png`, `powerbrowser/branding/release/default*.png`
- Impact: None on gates; the shipped icon is not a real product mark. A downstream replacing it exercises the squareness rule for the first time with real artwork.
- Fix approach: Real logo arrives with branding work; keep the non-square hard-fail (never letterbox silently).

## Known Bugs

**Default-env build is red until 03-02 lands (expected, tracked):**
- Symptoms: `smoke-firefox` FAILs on `FINAL_TARGET_FILES default128.png` because the default `--with-branding` dir is now the generated tree, which has no PNG rasters yet. `branding-variant-divergence` and `verify-branding-identity-release` fail on missing `objdir-release/dist`.
- Files: `generated/branding/dev/` (no `default*.png` committed path yet — rasters exist only in uncommitted TARGETS), `.mozconfig`
- Trigger: Any `mach build` or full `verify-platform.sh` run on the default tree before 03-02 commits.
- Workaround: 03-01 proved both variants configure exit-0 with scratch-copied current PNGs; `--quick` is the commit gate and is green. Do not gate anything on a default build before 03-02 lands.

**BiDi harness double-window (WINDOWS.md 14, open):**
- Symptoms: Every `withFirefoxPage` caller that passes a URL launches TWO windows (shell plus a stock browser window for the URL arg), and `contexts[0]` resolves to the shell's supervised Theia frontend rather than the passed URL. The four `_run_app_check_mjs` checks boot a dev app at `localhost:3000` they then do not read.
- Files: `scripts/lib/firefox-bidi.mjs`
- Trigger: Any harness check passing a URL argument.
- Workaround: Checks currently pass despite the extra window; fix when a check needs to actually read the URL content.

**Unrun launch-lifecycle checks (WINDOWS.md 11, 19 — open):**
- Symptoms: ~20 launch-lifecycle checks (`side03-*`, `side04-*`, `side05-*`, `shell03-*`, `cr01-*`, `harness-display-available`) became runnable with 01-04's build but were never run; `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` were not re-run after 01-11 changed error-layer behavior.
- Files: `scripts/verify-platform.sh`
- Trigger: Full-suite runs requiring a display, a launched browser, and ~47–54 min tier-3 builds.
- Workaround: None needed pre-gate; schedule before milestone close. Neither deferred check clicks Retry, so neither is expected to move — but "expected" is not "observed."

**Release objdir never built (WINDOWS.md 10, open):**
- Symptoms: `verify-branding-identity-release` and `branding-variant-divergence` have never run — both read `objdir-release/dist/bin`, i.e. a second full ~47 min release build that was explicitly declined.
- Files: `scripts/verify-platform.sh`, `scripts/verify-branding-identity.mjs`
- Trigger: Any release-variant verification.
- Workaround: Runnable the moment a release objdir exists; schedule one release build before milestone close.

## Security Considerations

**Internals-boundary guard has a known hole (WINDOWS.md 13, open):**
- Risk: `ChromeUtils.registerWindowActor` is absent from `FORBIDDEN_PATTERNS` in `scripts/check-internals-boundary.sh`. A future JSWindowActor pair (the rejected GUI-01 candidate B) would add a second Firefox-internal touchpoint outside `powerbrowser/shell/PowerBrowserAPI.sys.mjs` while the guard reports PASS.
- Files: `scripts/check-internals-boundary.sh`, `powerbrowser/INTERNAL-APIS.md`
- Current mitigation: Nothing in-tree uses it (candidate B was not adopted), so the hole is latent, not exploited. The catalogue (`powerbrowser/INTERNAL-APIS.md`, 65 lines) is the human-readable half.
- Recommendations: Any commit introducing an actor pair must add the pattern in the same commit — record this in the plan's acceptance criteria when that work is ever proposed.

**Customize privileged-JS surface (dev-flag gated):**
- Risk: `theia/extensions/customize/src/browser/powerbrowser-privileged-js.ts` hands `customize.js` the DI container, the application shell, and the tab-URI registry when the dev flag is on. That is arbitrary-code-execution-by-design behind a flag — correct for "vibe-code your own browser," but the flag is the entire security boundary.
- Files: `theia/extensions/customize/src/browser/powerbrowser-privileged-js.ts`, `scripts/verify-dev-flag-off.mjs`, `scripts/verify-customize-inert.mjs`
- Current mitigation: `verify-dev-flag-off` and `verify-customize-inert` prove the surface is inert with the flag off; GUI-03 perceptual half confirmed by live UAT 2026-09-01.
- Recommendations: Never widen the `PowerBrowserPrivilegedJsSurface` without a matching gate assertion; the `Symbol.for` registry key must keep matching `scripts/verify-dev-flag-off.mjs` exactly (documented in the source header).

**Token-gate is the whole SEC-01 boundary:**
- Risk: The Theia backend has filesystem and process-spawn access in the same process tree as untrusted web content. `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts` (per-launch credential, loopback-only, fail-closed, ahead of framework middleware) is the single control.
- Files: `theia/extensions/token-gate/src/node/`
- Current mitigation: Satisfied and recorded; parent-watchdog contribution reaps orphans.
- Recommendations: Any change to backend composition (Phase 4 extensions!) must re-prove SEC-01 — EXT-01 entries add backend modules, which is exactly the `mini-browser`/`vhost` pattern rejected at the D-22 gate. Vet each declared extension's backend surface before bundling.

**Generator sink-injection guards must grow with each emitter:**
- Risk: `configure.sh` is sourced by the build, `.desktop` `Exec=`/`Icon=` are line-oriented, and 03-03 adds NSIS (`!define` quotes, `${}`) plus XML/plist (`&<>"`) sinks. Each sink has its own metacharacters; the schema regex is the primary guard and `assertEmittable`/`UNEMITTABLE` the sink-side backstop (see `scripts/generate.mjs:596` and `scripts/lib/config-schema.json`).
- Files: `scripts/generate.mjs`, `scripts/lib/config-schema.json`
- Current mitigation: Phase 2 pattern (reject, never escape) with hostile-value self-test cases; 03-02 keeps the invariant structurally (no manifest value ever joined into the inkscape argv — fixed literal `brand/mark.svg`, frozen `ICON_SIZES`).
- Recommendations: Every 03-03 schema key that reaches NSIS/XML/shell needs both a `regex` and a sink assertion plus a hostile self-test case (quotes, `${}`, `&<>`, trailing spaces, newlines). A silent-escape fix is a vulnerability, not a cleanup — reject loudly.

**Mozilla egress carve-out awaits TEL-03:**
- Risk: Three Mozilla hosts stay `allow` in `powerbrowser/endpoint-allowlist.json` (Remote Settings + signature CDN + attachments CDN) because disabling them also kills CRLite revocation data. Mozilla telemetry/crash endpoints are `deny` today, but per-downstream repointing is Phase 4 scope.
- Files: `powerbrowser/endpoint-allowlist.json`, `scripts/verify-endpoints.sh`
- Current mitigation: `allowlist-doc-consistency` forces every allow entry to carry a written reason in REQUIREMENTS.md, not just the JSON.
- Recommendations: TEL-03 must make these manifest-driven; until then any downstream ships Mozilla-bound polling with only a documented reason as cover.

**Squareness check parses text, not pixels:**
- Risk: `iconSourceFailuresForText` (uncommitted, `scripts/generate.mjs`) accepts artwork on the strength of a `viewBox` regex. An SVG with a square viewBox but non-square `width`/`height` attributes, or square canvas with off-center content, passes the rule and ships a visually wrong icon set. A missing viewBox fails closed (good), but a lying viewBox passes.
- Files: `scripts/generate.mjs` (`iconSourceFailuresForText`), `brand/mark.svg`
- Current mitigation: IHDR-exact output assertion catches size errors, not aesthetic ones; GEN-02's visual judgement is an explicit manual verification.
- Recommendations: Keep the text check as the fast fail, but the 03-04 tier-3 proof should include a human look at the built icon (already planned as manual-only). Consider asserting `width`/`height` attributes agree with the viewBox when present.

## Performance Bottlenecks

**Tier-3 Gecko build (~47–54 min, 13 GB objdir):**
- Problem: A full `./mach build` takes 2830s wall on the reference host (`docs/BUILD.md` timings, tree/host/toolchain named). `objdir/` is 13 GB, `upstream/` 5.6 GB. This cost shapes everything: release-objdir checks unrun, launch checks unexercised, re-verification deferred to phase gates.
- Files: `objdir/` (gitignored), `docs/BUILD.md` (tiered loop: tier 1 `./mach run`, tier 2 `build faster` ~1.84s warm, tier 3 full)
- Cause: Gecko.
- Improvement path: None available — the tiered loop in `docs/BUILD.md` is the mitigation. Keep `--quick` (~10s, no build/browser/display/network) as the commit gate; schedule exactly one tier-3 build per phase per the validation strategy.

**Residual-brand backstop scan (55s over 463,930 files):**
- Problem: The `--extra-root` backstop walk over the live 5.6 GB `upstream/` takes ~55s. It runs in `rebase-upstream.sh` post-replay and CI, not in `--quick`, but a developer running it casually pays nearly a minute.
- Files: `scripts/scan-brand-residue.mjs`, `scripts/rebase-upstream.sh`
- Cause: Full-tree walk outside the git index by design (that is what makes it independent).
- Improvement path: None — speed would come from narrowing scope, which is exactly what the check must not do. Keep it out of `--quick`.

**Inkscape raster determinism pinned to one host version:**
- Problem: The byte-identity gate compares emitted PNGs against Phase 1 rasters produced by inkscape 1.4.4 on this host. A different inkscape version (or different freetype/harfbuzz underneath) can emit different bytes for the same SVG, turning the gate red on every machine but this one.
- Files: `scripts/generate.mjs` (`rasterizeIcons` via `spawnSync('inkscape', ...)`), `powerbrowser/branding/*/default*.png` (comparands)
- Cause: Raster output is toolchain-version-sensitive; the acceptance test is byte equality.
- Improvement path: If a second host goes red, record the version matrix in `docs/BUILD.md` and either pin inkscape in `flake.nix` (`#firefox` shell) or relax the gate to IHDR-exact + perceptual hash for PNGs while keeping byte-identity for text. Do not silently re-baseline the comparands.

## Fragile Areas

**TheiaService.sys.mjs supervisor (1349 lines, five defect waves):**
- Files: `powerbrowser/shell/TheiaService.sys.mjs`, `powerbrowser/shell/powerbrowser.js`, `powerbrowser/shell/PowerBrowserAPI.sys.mjs`
- Why fragile: The launch/supervision path has shipped five consecutive defect classes (state-keying conflation, missing terminal handler, Retry-erases-error-layer, unconditional recovery probe, user-driven unrecoverable re-entry — WINDOWS.md 18/20/21), each found by verification or review rather than by a registered check, each green through full suites. The file concentrates one-time init, port pinning, health loops, recovery probes, error painting, retry gating, and quit observation in one object with cross-cutting `_swapped`/`_errorShown`/`_errorRecoverable` flags.
- Safe modification: Touch one route per plan; extend `scripts/verify-shell-error-contract.mjs` scenarios (in-process harness driving the shipped files) and `scripts/verify-start-path-recovery.mjs` derived rules in the same commit; observe red-before-green per the project's planted-fault discipline.
- Test coverage: Strongest in the repo for what it covers — but the residual gap is structural: **no registered check drives a rejection out of either long-lived supervisor loop** (`_healthLoop`, `_recoveryProbeLoop`), so terminal-handler coverage for those two roots rests on the source-derived rule, not a runtime red (WINDOWS.md 18 residual).

**Overlay-symlink + moz.build depth pin:**
- Files: `powerbrowser/branding-generated` (setup-created, gitignored), `scripts/fetch-upstream.sh` (`ensure_branding_overlay`), `.mozconfig` (line 15 `--with-branding` spelling), `scripts/generate.mjs` (depth-3 documentation)
- Why fragile: The `--with-branding` VALUE must sit exactly 3 levels under topsrcdir because the branding `moz.build` does a `../../../` include — proven twice by red configures in-session (direct `../generated` path rejected by the sandbox; one-level-deeper link escapes topsrcdir). A tracked symlink variant was tried and reverted because the residue scan reads it as EISDIR and fails.
- Safe modification: Never commit the symlink; never move the branding dir depth; `ensure_branding_overlay` is idempotent and proven — re-run it rather than hand-creating links. If the link is missing, `configure` fails, not the build — the failure is loud, which is the good news.
- Test coverage: Real `mach configure` exit-0 + `MOZ_BRANDING_DIRECTORY` grep for both variants (03-01 proof); no registry row runs configure (too heavy for `--quick` by design).

**Byte-identity EXPECTED lists are hand-kept in two files:**
- Files: `scripts/generate.mjs` (frozen `TARGETS`), `scripts/verify-generated-identity.mjs` (`EXPECTED` + provenance comments)
- Why fragile: Adding TARGETS rows without extending EXPECTED goes red as surplus (03-01 deviation 1 — the plan's own "no further wiring" note was wrong). The set-equality comparison in both directions is what saves this from silent drift, but every emitter plan must remember the two-file dance.
- Safe modification: Follow the 03-01 precedent — new rows carry `NEW (xx-yy)` provenance, count prose updated in both scripts, gate run before commit.
- Test coverage: `generated-byte-identity` + `generate-self-test` (17 planted faults with the uncommitted icon cases) both in `--quick`.

**Residue scan vs symlinks (EISDIR):**
- Files: `scripts/scan-brand-residue.mjs`, `inventory/brand-tokens.json`
- Why fragile: The scan follows `git ls-files`; a tracked symlink into gitignored `generated/` fails the gate as EISDIR. Today's answer (setup-created links, gitignored) works but relies on every future contributor knowing not to `git add` the overlay. The `--extra-root` mode additionally skips symlinks structurally (else `upstream/powerbrowser` → repo root rescans the tree through a second path).
- Safe modification: Keep both symlinks gitignored (`/generated/`, `/powerbrowser/branding-generated` in `.gitignore`); if the scan ever reports EISDIR, the fix is untracking the link, not touching the scanner.
- Test coverage: `--self-test` hermetic rows (clean/planted/missing-root) plus chmod-000 unreadable-file row (fails loudly as root by design).

**About-dialog suppression selectors:**
- Files: `powerbrowser/branding/{dev,release}/content/aboutDialog.css`, `scripts/verify-about-dialog-suppression.mjs`
- Why fragile: Suppression is CSS `display:none` over upstream markup the project does not own — an ESR rebase that renames an element id or adds a fourth outbound link silently restores vendor content or breaks the build respectively. The 01-18→01-21 arc (bare container killed the internal `about:license` disclosure; union-vs-per-variant coverage hole) shows how many ways this breaks.
- Safe modification: The checker derives selectors from shipped stylesheets and the element tree from upstream markup at check time, per-variant, with `DISCLOSURE_HREF` as the must-survive control — extend it, don't bypass it. `rebase-upstream.sh` runs the scan post-replay; watch its output on every uptake.
- Test coverage: Four planted faults (deletion, narrowing, disclosure-reach, empty-match) proven red; `rebase-upstream.sh` + CI wired.

## Scaling Limits

**Disk and host assumptions:**
- Current capacity: Working tree needs ~20 GB (`upstream/` 5.6 GB + `objdir/` 13 GB + Theia `node_modules`) on a path with no space character (Nix `NIX_LDFLAGS` splits on spaces — `/home/chris/coding/Power-Browser` is compliant).
- Limit: A second `objdir-release/` doubles the build dir; fresh-clone onboarding requires `fetch-upstream.sh` (multi-GB fetch) + `yarn install` + a 47+ min build before any launch check runs.
- Scaling path: No change planned; `docs/BUILD.md` documents the tiers. CI cannot reasonably run tier-3 per commit.

**Node version skew:**
- Current capacity: Flake pins `nodejs_22` for both shells; host `node` here reports v24.19.0. `scripts/generate.mjs` and all verifiers run on the host node today.
- Limit: A Node-version-sensitive behavior (e.g. `node:util` parse, TOML vendored parser `scripts/lib/toml.cjs`) could pass here and fail in the shell or vice versa.
- Scaling path: Run `verify-platform.sh --quick` inside `nix develop .#theia` before milestone close to confirm no skew; consider a node-version assertion row if skew ever bites.

## Dependencies at Risk

**Theia 1.74.1 (49 `@theia/*` packages + 4 `@powerbrowser/*` extensions):**
- Risk: Theia core is consumed as npm deps, never forked — but Phase 4 adds manifest-declared Open VSX downloads (`theia download:plugins` semantics unexercised; hash-verifiable pins unknown per ROADMAP research note). Each bundled extension is new backend/frontend surface against the SEC-01 boundary (see token-gate note above).
- Impact: A malicious or compromised Open VSX entry bundled at build time runs inside the sidecar with backend access.
- Migration plan: Phase 4 must define pin semantics (hash-verified, fail-loud on unpinned/unreachable) before any non-trivial extension list; re-audit backend modules per entry (`vhost`/filesystem-style surfaces are reject-signals per the D-22 precedent).

**Gecko ESR 153 (5.6 GB `upstream/`, never hand-edited):**
- Risk: Every rebase replays the patch stack and re-derives suppression/allowlist expectations from upstream markup. `git -C upstream diff` staying empty is the invariant; `scripts/rebase-upstream.sh` + `apply-patches.sh --self-test` (blob-pruned pristine check against vacuous pass) is the machinery.
- Impact: An ESR point release that restructures `browser/` markup or `moz.configure` can break patches, suppression selectors, and the `--with-branding` depth pin simultaneously (UPD-01 is the acceptance test).
- Migration plan: Phase 5 (hook-only patches, one-pin uptake). Until then, never adopt an ESR bump without the full rebase tooling run.

**Vendored TOML parser (`scripts/lib/toml.cjs`, smol-toml 1.8.0, single file):**
- Risk: Vendored to keep `--quick` dependency-free (npm pin would require `npm ci` before the gate runs). A TOML spec edge (multiline strings, dotted keys, array-of-tables) the vendored parser mishandles becomes a config-parsing divergence with no upstream update path except re-vendoring.
- Impact: Low today — `scripts/verify-vendored-parser.mjs` gates it; the manifest schema stays within basic tables/strings/arrays by convention.
- Migration plan: Re-vendor on any TOML feature need; never hand-patch the vendored file without updating `scripts/lib/toml.LICENSE` provenance.

## Missing Critical Features

**Phase 3 remainder (GEN-02 second half, GEN-03, GEN-01 close):**
- Problem: PNG rasters are emitted only in the uncommitted tree; `scripts/verify-icon-ihdr.mjs` (100-line plan artifact) does not exist; ICO/ICNS writers are unwritten; Windows NSIS/MSIX + macOS DMG/icns emitters are 03-03 scope; `generated/identity.configure` + patch-010 regen + tier-3 artifact proof are 03-04 scope. GEN-01/02/03 all read Pending in REQUIREMENTS.md.
- Blocks: Linux build-verified branding (criterion 1–2), single-edit propagation proof (criterion 4), and everything downstream of `generated/` layout stability (Phase 5 hook-only patches).

**Phase 4 Theia surface (GEN-05, EXT-01, TEL-01..03):**
- Problem: No Theia-side branding from manifest keys (rebrand still needs TS recompile for welcome/about strings), no declared-extension pipeline, no telemetry sender — and Theia ships no destination, so Power Browser implements the only one.
- Blocks: The "no TypeScript recompile for a rebrand" criterion and the entire downstream-extension story. Highest-unknown phase per research (Open VSX pin semantics).

**Phase 5–7 (MIG-05, CFG-06, UPD-01/02, VER-01..03, DOC-01/02, CFG-05):**
- Problem: `docs/REBRANDING.md` does not exist (`docs/` holds `BUILD.md`, `CUSTOMIZE.md`, `URI-SCHEMES.md` only); `PB_CONFIG_DIR` is a comment in `scripts/generate.mjs:170`, not code; adversarial fixtures ("Zebra" excursion) unbuilt; Sourcerer-as-downstream unattempted; trademark findings still low-confidence web sources needing primary-policy re-verification with named human review of `brand/` (Phase 6 research note).
- Blocks: Milestone acceptance — the stranger-rebrand core value is unproven end to end until Phase 7.

## Test Coverage Gaps

**No Tier-3 proof since the branding-dir switch:**
- What's not tested: Everything that reads the built artifact after 03-01 changed what `--with-branding` points at. `smoke-firefox`, `verify-branding-identity.mjs` (six surfaces + positive control), and all launch-lifecycle checks predate the overlay wiring.
- Files: `scripts/smoke-firefox.sh`, `scripts/verify-branding-identity.mjs`, `scripts/verify-platform.sh`
- Risk: The tree is green on static gates and red-or-unrun on every runtime gate — exactly the posture 01-04's build closed last time. A wiring defect that only manifests in a packaged build (missing `FINAL_TARGET_FILES`, jar.mn packaging slip) is invisible until the tier-3 run.
- Priority: High — one full build + artifact verification closes it; owned by 03-04.

**Windows/macOS installer outputs unverifiable in v1:**
- What's not tested: NSIS/MSIX/plist/tile emitters get schema-completeness checks only; no packaging host exists (deferred to v2 PKG-01).
- Files: (03-03 scope — emitters unwritten)
- Risk: Schema-complete ≠ installable; a malformed installer field ships silently until a Windows/macOS host exists.
- Priority: Medium — sink-guard self-tests plus hostile fixtures are the v1 backstop; record the build-verification deferral explicitly in 03-03's summary as was done for the release objdir.

**Display-surface scan boundary:**
- What's not tested: `verify-branding-preflight.mjs` derives display surfaces by walking `theia/extensions/branding/src/browser/` — a surface authored outside that directory and outside inventory-declared variant files is invisible to the scan and rests on code review (01-08 residual, WINDOWS.md 17 reason).
- Files: `scripts/verify-branding-preflight.mjs`, `theia/extensions/branding/src/browser/`
- Risk: A new Theia extension rendering the product name in identifier form passes all gates.
- Priority: Medium — Phase 4 (which adds Theia-surface emitters and possibly new brand-rendering files) must extend the walk or the inventory, not rely on reviewers remembering.

**No framework test runner (deliberate):**
- What's not tested: There is no jest/vitest/mocha anywhere — per-script `--self-test` fault planting registered as `verify-platform.sh` rows is the entire automated strategy, by design (CLAUDE.md one-driver rule, 03-VALIDATION.md).
- Files: `scripts/verify-platform.sh` (registry), each `scripts/verify-*.mjs` (`--self-test`)
- Risk: Cross-script interaction bugs (e.g. TARGETS↔EXPECTED↔inventory triple drift) are caught only where a set-equality comparison was explicitly written; uncovered interactions stay uncovered without a coverage tool to say so.
- Priority: Low — the planted-fault discipline (every row proven red before green) is a stronger guarantee than a runner would add; just keep enforcing it for every new row.

---

*Concerns audit: 2026-09-04*
