# Codebase Concerns

**Analysis Date:** 2026-09-04

## Tech Debt

**Phase 03 mid-flight — GEN-01/02/03 still open, default-env build red:**
- Issue: The Firefox branding emitter and icon pipeline is executing (plan 2 of 4 at last report). `GEN-01` (single generator materializes complete Firefox branding), `GEN-02`, `GEN-03` are pending. Per the recorded decision, `identity.configure` plus the tier-3 proof build are `03-04` scope and the default-env build stays red until `03-02` lands the PNG icon set. The tree does not currently produce a shippable branded artifact from a clean default path.
- Files: `scripts/generate.mjs`, `patches/010-powerbrowser-identity.patch`, `.mozconfig`, `.planning/phases/03-firefox-branding-emitter-and-icon-pipeline/03-02-PLAN.md`, `03-03-PLAN.md`, `03-04-PLAN.md`
- Impact: Any downstream or CI job that builds before `03-04` lands gets either a red build or an artifact under Power Browser's own identity surfaces.
- Fix approach: Finish the phase in plan order; `03-04`'s autoconf.mk-diff proof and single-edit propagation check are the exit criteria. Do not paper over the red with a hand-committed icon.

**Hand-maintained PNG rasters duplicated across dev/release:**
- Issue: Ten PNG rasters live hand-written under both `powerbrowser/branding/dev/` (`default16.png`, `default32.png`, `default48.png`, `default64.png`, `default128.png`) and `powerbrowser/branding/release/`. Only the vector mark has a single home (`brand/mark.svg`). The two variants can drift pixel-by-pixel with no check naming which file diverged until the `branding-variant-divergence` row runs — which itself is tier-3-gated and unrun (ledger 10).
- Files: `powerbrowser/branding/dev/default*.png`, `powerbrowser/branding/release/default*.png`, `brand/mark.svg`
- Impact: Silent dev/release icon divergence ships to users.
- Fix approach: Land the `03-02` icon pipeline (single-source raster generation from `brand/mark.svg`); until then, never edit one variant's PNG without copying to the other in the same commit.

**About-dialog debranding is CSS suppression, not DOM removal:**
- Issue: Stock About-dialog rows (donation, get-involved, licensing/terms/privacy links, `#communityDesc`, `#communityExperimentalDesc`, `about:credits` vendor content) are hidden by `display: none` rules in the branding stylesheets, not removed from the DOM. The suppressed nodes, hrefs, and link targets still ship in the binary. Deletion without a Gecko patch is impossible (the markup is upstream's), so this is a standing compromise, with DOM-level removal deferred to "only if UAT rejects hidden-not-removed."
- Files: `powerbrowser/branding/dev/content/aboutDialog.css`, `powerbrowser/branding/release/content/aboutDialog.css`, `scripts/verify-about-dialog-suppression.mjs`
- Impact: A user agent stylesheet, DOM inspector, or future upstream markup/restyle change can resurface vendor links. An ESR rebase that renames an About-dialog ID silently defeats one suppression rule (the per-variant link-coverage check in `scripts/verify-branding-preflight.mjs` is designed to go red here — trust it, and keep it wired into `--quick`).
- Fix approach: Keep the derived per-variant link-coverage comparison green across every rebase; revisit DOM removal only with fresh UAT evidence.

**Vendored TOML parser is a manual supply-chain pin:**
- Issue: `smol-toml` 1.8.0 is vendored as a single self-contained CJS file rather than an npm dependency, deliberately (so `scripts/verify-platform.sh --quick` runs without `npm ci`). Updates require a manual re-vendor; there is no lockfile or audit trail watching it for CVEs.
- Files: `scripts/lib/toml.cjs`, `scripts/lib/toml.LICENSE`, `scripts/verify-vendored-parser.mjs`
- Impact: Stale parser with a known vulnerability would sit unnoticed; conversely, an unverified re-vendor could change config parsing under the byte-identity gate.
- Fix approach: On re-vendor, keep the license file alongside and require `verify-vendored-parser` plus the full `--quick` run green in the same commit.

**`verify-platform.sh` is a 4,125-line single driver:**
- Issue: Consolidation was the right call (one registry, no sibling drivers), but `scripts/verify-platform.sh` is now over four thousand lines. Every new check appends another row, its dispatch, and its self-test wiring in one file.
- Files: `scripts/verify-platform.sh`
- Impact: Merge conflicts on parallel plans, slow navigation, growing temptation to bypass the registry with a sibling script (the exact failure the consolidation fixed).
- Fix approach: Keep the one-driver rule absolute; if the file becomes unmanageable, split sourced library files under `scripts/lib/` (as `scripts/lib/firefox-bidi.mjs` already is) — never a second driver.

**Setup-created overlay symlink is invisible build state:**
- Issue: The `--with-branding` overlay symlink `powerbrowser/branding-generated` → `../generated/branding` is created at setup time by `ensure_branding_overlay` (in `scripts/fetch-upstream.sh`), never committed, and gitignored. A fresh clone that skips that setup step fails at configure time with a confusing missing-branding error, not a named diagnostic.
- Files: `scripts/fetch-upstream.sh`, `powerbrowser/branding-generated`, `scripts/verify-branding-agreement.mjs`, `.gitignore`
- Impact: Fresh-clone and CI build failures that look like generator bugs but are missing setup state. Note the agreement checker deliberately SKIPs (green) when `generated/` is absent so fresh clones stay green — which also means a genuinely broken generator is silent until the CI-ordered `generate` → `--check` → byte-identity sequence runs.
- Fix approach: Make configure fail fast with a named message when the overlay is absent; never convert the SKIP into a FAIL (fresh-clone greenness is load-bearing per the `02-06` decision).

**EXT-02 bundled WebExtensions unscheduled:**
- Issue: Declaring bundled WebExtensions in `configuration.toml` (the WebExtension sibling of EXT-01) is acknowledged, barred from hard-coding the set itself in the tree (`REQUIREMENTS.md` Out of Scope), and not scheduled in any phase.
- Files: `configuration.toml`, `.planning/STATE.md` (Pending Todos)
- Impact: No mechanism story for the curated addon set; Phase 4 will arrive with no design to build on.
- Fix approach: Route through `/gsd-phase` triage before Phase 4 planning starts.

## Known Bugs

**Test-harness double-window defect — launch checks read the wrong context (ledger 14, OPEN):**
- Symptoms: Every `withFirefoxPage` caller in `scripts/lib/firefox-bidi.mjs` that passes a URL launches TWO windows (the shell plus a stock browser window for the URL argument), and `contexts[0]` resolves to the shell's own supervised Theia frontend rather than the requested URL.
- Files: `scripts/lib/firefox-bidi.mjs`
- Trigger: Any `_run_app_check_mjs` check that passes a URL (four checks boot a dev app at `localhost:3000` they then never read).
- Workaround: None — results from affected checks assert against the wrong page. Fix the driver before trusting any URL-scoped launch result, and re-run ledger 11's batch after the fix.

**~20 launch-lifecycle checks runnable but never run (ledger 11, OPEN):**
- Symptoms: The `side03-*`, `side04-*`, `side05-*`, `shell03-*`, `shell04-diagnostics-with-backend-down`, `cr01-*`, and `harness-display-available` rows became runnable with the `01-04` build but were never executed — no plan's verify block names them and each launches a real browser.
- Files: `scripts/verify-platform.sh`
- Trigger: N/A (unexercised, not failing).
- Workaround: None. This is the largest unverified surface in the tree; schedule a phase-gate run before any release claim.

**Tier-3 regression confirmations unrun after the 01-11 error-layer change (ledger 19, OPEN):**
- Symptoms: `shell03-budget-exhausted-error` and `shell03-auto-dismiss-on-selfheal` were not re-run against a repackaged binary after plan `01-11` changed the error layer's visible behavior. The ledger itself notes `shell03-auto-dismiss-on-selfheal` is the one that could genuinely move because its subject is the recoverable side of the re-gated probe.
- Files: `scripts/verify-platform.sh`, `powerbrowser/shell/TheiaService.sys.mjs`
- Trigger: Phase-gate tier-3 run.
- Workaround: None — treat the recoverable-side error behavior as unverified until re-run.

**Release-variant branding checks unrun — second 47-minute build declined (ledger 10, OPEN):**
- Symptoms: `verify-branding-identity-release` and `branding-variant-divergence` both read `objdir-release/dist/bin`; the second full release build was explicitly declined in `01-04-PLAN.md`. The release PNG/identity surfaces have never been verified.
- Files: `scripts/verify-platform.sh`, `scripts/verify-branding-identity.mjs`
- Trigger: First `objdir-release` build.
- Workaround: None. This compounds the hand-maintained release PNG debt above — the exact files least verified are the duplicated ones.

**Residual-brand scan blind to unstaged new files:**
- Symptoms: `scripts/scan-brand-residue.mjs` enumerates `git ls-files`, so a brand-token-bearing new file that is staged-but-uncommitted or untracked is invisible to the gate. A green scan over a dirty tree proves less than it appears to.
- Files: `scripts/scan-brand-residue.mjs`
- Trigger: Any commit workflow that runs the scan before `git add`.
- Workaround: Stage before trusting a green scan (documented in `CLAUDE.md`). Partial structural mitigation exists: `scripts/verify-branding-preflight.mjs` walks the branding extension directory on the filesystem, not the index — but only that directory plus inventory-declared variant files. A display surface authored anywhere else still rests on code review alone.

## Security Considerations

**Telemetry is compiled out AND pref-blanked — residual is the deliberate waiver set:**
- Risk: A build that phones Mozilla/Google unattended violates the platform's core promise.
- Files: `patches/010-powerbrowser-identity.patch` (`MOZ_SERVICES_HEALTHREPORT`, `MOZ_NORMANDY` imply_options), `powerbrowser/branding/dev/pref/firefox-branding.js`, `powerbrowser/endpoint-allowlist.json`, `scripts/verify-endpoints.sh`, `scripts/generate.mjs` (emitted prefs)
- Current mitigation: Three layers — compile-out of Normandy/health-report code paths, defence-in-depth blanking of `toolkit.telemetry.unified`/`toolkit.telemetry.server` and sibling prefs, and the machine-readable `powerbrowser/endpoint-allowlist.json` enforced by `scripts/verify-endpoints.sh` layers 1 (pref/host static) and 3 (35-second live capture). `incoming.telemetry.mozilla.org` is explicitly `deny`.
- Recommendations: The waiver set is the attack surface to re-audit on every ESR rebase: Remote Settings (`firefox.settings.services.mozilla.com` + two CDN hosts, `allow`), Google Safe Browsing v2+v4 (`allow`), Widevine (`edgedl.me.gvt1.com`, `allow`), loopback (`127.0.0.1`, `allow` — exact-string match only). Re-run layer 3 after each rebase; a newly observed host fails closed (absent-from-allowlist = failure), which is the correct default — do not "fix" a red by adding a waiver without a recorded D-decision. Known accepted trade-off: site-requested geolocation still attempts the deny-listed region host and fails; that is intentional until a phase owns location UX.

**Extension supply chain: Open VSX is the default registry with no hash-pinning story:**
- Risk: Any user-installed Theia/VS Code extension resolves at runtime from `https://open-vsx.org` (baked into the `start` script in `theia/applications/browser/package.json`) via `@theia/ovsx-client` / `@theia/vsx-registry` 1.74.1. `theia download:plugins` / Open VSX pin semantics are unexercised in this tree and hash-verifiable pins are unknown (recorded Phase 4 blocker). A compromised or squatted extension ID flows straight into the sidecar, which runs with the token-gate session cookie's authority.
- Files: `theia/applications/browser/package.json`, `theia/package.json`, `theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts`
- Current mitigation: Version pins in `theia/package.json`; curated-set mechanism (EXT-02) deliberately kept out of the tree.
- Recommendations: Phase 4 must define hash-pinned extension acquisition before any curated set ships; until then, document that installed extensions are fetched unverified and never bundle an extension by hand-copying it into the tree (that would bypass even version pinning and violate the no-vendoring rule).

**Sidecar token cookie is `Secure=false`, `SameSite=Lax` by necessity — loopback binding is the whole defence:**
- Risk: The session cookie minted by `PowerBrowserAPI.sys.mjs` (`D-99`) cannot be `Secure` (loopback HTTP would never send it) and cannot be `SameSite=Strict` (the shell's one swap is a cross-site top-level navigation from `chrome://powerbrowser/` to `http://127.0.0.1:PORT/`). Anyone who can reach the sidecar port with the cookie, or trick the browser into presenting it, inherits the session.
- Files: `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/shell/TheiaService.sys.mjs` (binds `--hostname 127.0.0.1`, health probes and swap URL all literal `127.0.0.1`)
- Current mitigation: Backend binds `127.0.0.1` only; DNS prefetch disabled (`network.dns.disablePrefetch`) so the `powerbrowser.org` welcome link is never resolved unattended; cookie catch returns before navigation so a launch whose credential was never minted never reaches the backend origin.
- Recommendations: Never change the bind hostname without a security review; add a registered check asserting `--hostname 127.0.0.1` and the absence of `0.0.0.0` in the supervisor source (same derive-and-compare style as the existing terminal-handler coverage rule). Treat any future remote-access feature as a new threat model, not a flag flip.

**Dev-flag privileged JS surface ships in the bundle, gated at runtime:**
- Risk: `powerbrowser-privileged-js.ts` hands `customize.js` the DI container, the application shell, and the tab registry when the dev flag is on. The code ships in all builds; only the flag gates it.
- Files: `theia/extensions/customize/src/browser/powerbrowser-privileged-js.ts`, `theia/extensions/customize/src/browser/customize-privileged-js-contribution.ts`, `scripts/verify-dev-flag-off.mjs`
- Current mitigation: `verify-dev-flag-off` proves the surface unbound with the flag off — but it is tier-3-gated (needs a built binary) and therefore not in the `--quick` commit gate.
- Recommendations: Keep the `Symbol.for` token contract byte-identical with what `verify-dev-flag-off.mjs` expects (a renamed key silently makes the proof assert nothing — the same failure class the `Symbol()` vs `Symbol.for` comment warns about). Consider a static `--quick` assertion that the contribution reads the flag before binding.

**Internals-boundary guard has a known hole (`registerWindowActor`, ledger 13, OPEN):**
- Risk: `ChromeUtils.registerWindowActor` is absent from `FORBIDDEN_PATTERNS` in `scripts/check-internals-boundary.sh`. The single-anti-corruption-layer rule (`powerbrowser/shell/PowerBrowserAPI.sys.mjs` only, catalogued in `powerbrowser/INTERNAL-APIS.md`) is unenforced for exactly the JSWindowActor pair that was the rejected candidate B of the GUI-01 spike.
- Files: `scripts/check-internals-boundary.sh`, `powerbrowser/INTERNAL-APIS.md`
- Current mitigation: Nothing in-tree uses it today (candidate B was not adopted) — latent, not exploited.
- Recommendations: Add the pattern in the same commit as any future actor-pair work; better, add it now as a tripwire (it should match nothing — a match is the red).

**`window.open` GUI-01 channel is an open-by-design chrome-spawning path:**
- Risk: The ratified GUI-01 design lets any Theia frontend code open a stock browser window via `window.open(url, '_blank')` from `theia/extensions/tab-uris/src/browser/browser-window-command.ts`, falling through to `AppWindow::CreateNewContentWindow`. That is a sanctioned escape hatch from the Theia sandbox to full chrome.
- Files: `theia/extensions/tab-uris/src/browser/browser-window-command.ts`, `patches/020-powerbrowser-shell.patch`
- Current mitigation: No chrome-side command is registered (absence is the ratified design); stock chrome is upstream's, not ours.
- Recommendations: When untrusted frontend content (marketplace extensions, loaded pages) enters the threat model in Phase 4, re-audit which callers can reach this command. No action while all frontend code is first-party.

## Performance Bottlenecks

**Tier-3 full build dominates every verification loop:**
- Problem: A full `./mach build` costs 47–54 minutes on the reference host (`legion`, 16 cores / 62 GB RAM, pinned toolchain in `toolchain-baseline.txt`); re-running the tier-3 rows alone is cited at ~eighty minutes in `docs/BUILD.md`. The release-variant checks need a *second* full build. This cost is why ledgers 10, 11, and 19 are open — verification is routinely deferred past the point where it would catch regressions.
- Files: `docs/BUILD.md`, `objdir/`, `upstream/` (5.6 GB checkout + ~14 GB `objdir/` peak; ~30 GB free required)
- Cause: Non-artifact Gecko compile; inherent to the patch-set architecture.
- Improvement path: Already partially built — `--quick` (seconds, no build/browser/display) is the commit gate; keep every check that can run without a binary in `--quick`. Do not erode that boundary by adding binary-dependent assertions to `--quick` rows. For the backlog, batch all tier-3-gated re-runs (ledgers 10, 11, 19, plus the `03-04` proof build) into one phase-gate session, not scattered per-plan builds.

**Brand-residue backstop scan is slow by design:**
- Problem: The `--extra-root` backstop truth walks 463,930 live `upstream/` files in ~55 s. Fine as a rebase-time check, too slow for the commit gate (which is why the commit gate uses the indexed `git ls-files` run — with the unstaged-file blindness documented above).
- Files: `scripts/scan-brand-residue.mjs`
- Cause: Filesystem walk over a 5.6 GB checkout.
- Improvement path: No change needed; keep the fast indexed run in `--quick`/rebase wiring and the slow truth as the periodic backstop. Do not "optimize" the backstop by scoping it down — its value is covering what `git ls-files` cannot name.

**Endpoint layer-3 capture window is load-bearing at 35 s:**
- Problem: `scripts/verify-endpoints.sh` layer 3 watches live traffic for 35 s because the AddonManager periodic update timer (`app.update.timerFirstInterval`, 30 s) never fires inside a shorter window — a 20 s capture once missed the AMO/langpack endpoints entirely and produced a false-clean allowlist.
- Files: `scripts/verify-endpoints.sh`, `powerbrowser/endpoint-allowlist.json`
- Cause: Upstream timer cadence, not our code.
- Improvement path: Never shorten the window to "speed up" verification; the constant encodes a measured upstream default with a comment trail. If layer 3 gets flaky in CI, extend — the failure mode of too-short is silent false-clean.

## Fragile Areas

**Patch stack vs ESR rebase — silent three-way no-op is the catastrophic mode:**
- Files: `patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`, `scripts/apply-patches.sh`, `scripts/check-patch-surface.sh`, `scripts/rebase-upstream.sh`
- Why fragile: Plain `git apply` exits 0 with a completely silent no-op on already-adopted content; a rebase that upstream has silently absorbed looks green while shipping stock behavior. This bit once already: regenerating patch `020` in `01-05` dropped a context line that was the second census site for `MOZ_APP_UA_NAME`/`MOZ_APP_ID`, and only the reconcile pass caught it.
- Safe modification: Never text-edit a hunk — regenerate from a patched tree so blob hashes recompute. The before/after `git hash-object` comparison in `apply-patches.sh` and the surface check are the guards; keep both, keep their `--self-test` rows red-proven, and treat any rebase where a patch "applies cleanly with no fuzz" as suspicious, not lucky.
- Test coverage: `apply-patches.sh --self-test` (needs `upstream/browser/moz.configure`; absent on fresh clones — pre-existing gap), `check-patch-surface.sh` in `--quick`.

**Supervisor error-state machine (`TheiaService.sys.mjs`) — fixed four times, still partially unproven:**
- Files: `powerbrowser/shell/TheiaService.sys.mjs`, `powerbrowser/shell/powerbrowser.js`, `scripts/verify-shell-error-contract.mjs`, `scripts/verify-start-path-recovery.mjs`
- Why fragile: Plans `01-09` through `01-13` each closed one route of the same defect class (state-keying conflation → missing terminal handler → repaint-guard/retry-wipes-diagnostics/unconditional probe/quit-observer ordering → user-driven retry on unrecoverable). Every fix was correct for its route; the class kept having another route. That history says the next route may still exist.
- Safe modification: Any change to `start()`, `retry()`, `_showError`/`_hideError`, or early-return placement must re-run both analyzers plus their `--self-test` suites (currently 5+1 and 16+2 planted faults). The start-path-recovery derivation catches *any* new early return before quit-observer registration structurally — do not narrow its window.
- Test coverage: Gaps acknowledged in-tree — no registered check drives a rejection out of either long-lived supervisor loop (`_healthLoop`, `_recoveryProbeLoop` mid-session faults have no external control); the behavioural half runs shipped sources under Node with faked `ChromeUtils`, so Gecko actually firing `quit-application-granted` on the retained observer is unproven, as are repaint pixels; `_stateFilePath` pointing into a possibly-nonexistent directory rests on reading `writeStateFile`'s non-fatal `try/catch`, not on a red. Chrome-context automation is platform-blocked on Linux, so these rest on the human record permanently.

**Space-in-path Nix breakage — environment, not code, and entirely unforgiving:**
- Files: `flake.nix` (`pkgs.mkShell` rpath via space-separated `NIX_LDFLAGS`), `docs/BUILD.md`, `.envrc` (`use flake`)
- Why fragile: A checkout at any path containing a space fails every native link step (Gecko compile and Theia `node-gyp` alike) with errors that point nowhere near the cause.
- Safe modification: Never "fix" this in-tree — it is a Nix/cc-wrapper property. Keep the `docs/BUILD.md` warning and the `CLAUDE.md` hard rule verbatim; the current path `/home/chris/coding/Power-Browser` is compliant.
- Test coverage: None possible cheaply; it is a documented precondition.

**Downstream-identity hard-fail is load-bearing and still unproven end to end:**
- Files: `configuration.toml`, `scripts/generate.mjs`, `scripts/verify-generated-identity.mjs`, `scripts/verify-branding-identity.mjs`
- Why fragile: The generator's core safety property — identity/legal keys hard-fail naming the key, cosmetic keys default with a visible echo, so no downstream can silently ship under Power Browser's brand — is enforced in code today but its Gecko-side proof (autoconf.mk diff, one-edit propagation, full branded build) is `03-04` scope. Until then the prohibition is asserted, not demonstrated.
- Safe modification: The root `configuration.toml` is its own downstream (split along the mask line, optional keys as defaults layer, required keys as downstream layer) precisely so the project's own build exercises the merge path — do not simplify this into two files. Keep `verify-branding-preflight.mjs` reading expectations from `inventory/brand-tokens.json`, never from `configuration.toml`, or the gate becomes a tautology.
- Test coverage: `verify-generated-identity.mjs`, byte-identity gate, `generate --self-test` (malformed-manifest case runs in a child process — do not inline it; it exits the process).

**Ledger and state bookkeeping drift:**
- Files: `.planning/WINDOWS.md`, `.planning/STATE.md`
- Why fragile: Two instances observed at analysis time — (1) `.planning/STATE.md` Blockers/Concerns still lists the two Phase 1 manual verifications (GUI-01 five steps, GUI-03 three steps) as UNPERFORMED from the autonomous `01-07` run, while `.planning/WINDOWS.md` entries 15/16 record live human UAT passes dated 2026-09-01 closing exactly those steps; (2) `.planning/WINDOWS.md`'s embedded JSON block still shows entries 15/16 as `"status": "open"` with `resolved_at: null` while its own table and `open_count: 5` say fixed. Any tooling or planner reading the stale copy miscounts open work or, worse, re-plans already-closed verification.
- Safe modification: Treat the WINDOWS.md table + `open_count` header as authoritative; refresh the STATE.md blockers and the embedded JSON snapshot in the same commit that next touches either file.
- Test coverage: None — this is process debt. The `/gsd-ship` gate reads `open_count`, so at least the blocking number is consistent today.

## Scaling Limits

**Single-user desktop substrate — no multi-tenancy headroom by design:**
- Current capacity: One sidecar backend per browser process, one pinned port per launch, single `127.0.0.1` origin. The supervisor's recovery probe spawns at most one process per probe interval (bounded, non-overlapping by construction).
- Limit: Concurrent sessions, remote access, or multi-window sidecars are outside the architecture; the `_swapped` one-time-initialisation keying assumes exactly one swap per session.
- Scaling path: Not applicable — horizontal scaling of this codebase means downstream rebrand builds, not runtime fan-out. The generator's per-downstream cost is one `generate` run plus one tier-3 build each.

**Upstream-tracking velocity:**
- Current capacity: Patch stack is two files, 49 lines total (`patches/010-powerbrowser-identity.patch`, `patches/020-powerbrowser-shell.patch`).
- Limit: Each ESR rebase replays the stack onto a new `upstream/`; every upstream refactor of the touched hunks is a manual regeneration cycle plus a full tier-3 proof build. The residual-brand scan is wired into `scripts/rebase-upstream.sh` and `.github/workflows/rebase-upstream.yml` so reintroduced tokens fail at rebase time.
- Scaling path: Keep the patch surface minimal (the `check-patch-surface.sh` guard exists for exactly this); resist the urge to reach more Firefox internals — each new touchpoint multiplies rebase cost and must be catalogued in `powerbrowser/INTERNAL-APIS.md`.

## Dependencies at Risk

**Pinned ESR Gecko (`upstream/`, gitignored 5.6 GB clone):**
- Risk: The entire shell targets one ESR tag fetched by `scripts/fetch-upstream.sh`. Security fixes arrive only via rebase; there is no automated upstream-CVE watch in-tree.
- Impact: Stale ESR = known-exploitable substrate under a "real browser" pitch.
- Migration plan: Rebase procedure (`scripts/rebase-upstream.sh` + `docs/BUILD.md` Phase 3 section when it lands) with the brand scan and endpoint layer-3 as rebase gates. No alternative substrate exists — this is the architecture.

**Theia 1.74.1 daily-drivable set (49 `@theia/*` packages):**
- Risk: Adopted by version re-pin only, never patched (`scripts/diff-theia-core.sh` enforces). A needed upstream Theia fix can only arrive as a version bump of all 49 packages, with `theia/yarn.lock` (yarn v1, workspace-local packages unrecorded by design) and `node-gyp` native rebuilds in tow.
- Impact: Theia-side security or compatibility fixes are all-or-nothing upgrades.
- Migration plan: Re-pin, `yarn install --ignore-scripts --frozen-lockfile`, rebuild, full smoke (`scripts/smoke-theia.sh` as a registry row). Never vendor the framework monorepo into this tree.

**Yarn v1 + Node via Nix flake:**
- Risk: `yarn` exists only inside `nix develop .#theia`; the lockfile semantics the tree relies on (workspace-local `@powerbrowser/*` packages byte-absent from the lock) are yarn-v1-specific. A yarn upgrade or npm migration silently changes what the lockfile guarantees.
- Impact: Non-reproducible Theia builds.
- Migration plan: None scheduled; treat the package manager as pinned infrastructure and record any change as an explicit decision.

**Trademark posture is LOW-confidence web research:**
- Risk: Mozilla and Eclipse Foundation trademark findings feeding Phase 6 gates are web-sourced, not verified against primary policy text (recorded in `.planning/ROADMAP.md` research row and `.planning/STATE.md` blockers). Gating branding work on them risks both false-pass (infringement) and false-fail (unnecessary rename churn).
- Impact: Release-blocking legal exposure or wasted rebrand effort.
- Migration plan: Re-verify against primary policy sources with a named human review of every file in `brand/` (reviewer + date recorded) before any gate depends on the findings.

## Missing Critical Features

**Telemetry destination (Phase 4 scope):**
- Problem: The `[telemetry] send-to-theia` concept was replaced by Theia's real enum (`off`/`crash`/`error`/`all`) plus an endpoint — but Theia ships no destination and Power Browser implements the only one. That implementation does not exist yet; telemetry currently only flows nowhere (compiled out on the Gecko side).
- Blocks: Any crash/error reporting story; the enum without a receiver is dead UI the moment a settings surface exposes it.

**Unified tab strip / mirror-proxy bridge (later milestone):**
- Problem: Theia must never be welded to full-window presentation; the chrome-owned tab model (`@powerbrowser/browser-bridge`) must stay landable without rework. Today that is a constraint, not code — enforced only by the `TabUriRegistry` exported-shape assertion (`scripts/verify-registry-shape.mjs`) and the GUI-04 requirement.
- Blocks: Nothing current — but every Theia extension contribution that assumes full-window presentation is a future rewrite. Review new contributions against GUI-04.

**Curated addon set mechanism (EXT-02):**
- Problem: See tech debt above — acknowledged, unscheduled, mechanism-only (the set itself never enters the tree).

## Test Coverage Gaps

**Launch-lifecycle batch (~20 checks, ledger 11) — High priority:**
- What's not tested in practice: Everything those rows cover — sidecar spawn/swap/recovery paths, shell error budgets, diagnostics-with-backend-down, harness display availability.
- Files: `scripts/verify-platform.sh` (`side03-*`, `side04-*`, `side05-*`, `shell03-*`, `shell04-*`, `cr01-*`)
- Risk: The supervisor paths with the richest defect history (four fix plans) are exactly the paths with no executed runtime coverage.
- Priority: High

**Release-variant identity/divergence (ledger 10) — High priority:**
- What's not tested: Release branding identity and dev/release divergence over real build output.
- Files: `scripts/verify-branding-identity.mjs` (release row), `scripts/verify-platform.sh` (`branding-variant-divergence`)
- Risk: The duplicated release PNGs and release-only branding files ship unverified.
- Priority: High

**Post-01-11 error-layer regression (ledger 19) — Medium priority:**
- What's not tested: Budget-exhausted and auto-dismiss-on-selfheal behavior against a binary containing the current error layer.
- Files: `scripts/verify-platform.sh` (`shell03-budget-exhausted-error`, `shell03-auto-dismiss-on-selfheal`)
- Risk: `shell03-auto-dismiss-on-selfheal` exercises the recoverable side of the re-gated probe — the side `01-12` changed.
- Priority: Medium

**Supervisor long-loop rejections and Gecko-native behavior — Medium priority, partially unclosable:**
- What's not tested: Rejections escaping from `_healthLoop`/`_recoveryProbeLoop` mid-session; real `quit-application-granted` firing the retained observer; repaint pixels; `_stateFilePath`-into-absent-dir behavior.
- Files: `powerbrowser/shell/TheiaService.sys.mjs`, `scripts/verify-shell-error-contract.mjs`, `scripts/verify-start-path-recovery.mjs`
- Risk: The next route of the defect class hides here if anywhere.
- Priority: Medium (with the permanent caveat that chrome-context automation is platform-blocked on Linux — the human record is the backstop, not a gap to automate away).

**Display surfaces outside the derived set — Low priority, by design:**
- What's not tested: A product-name-rendering file authored outside `theia/extensions/branding/src/browser/` and outside inventory-declared variant files is seen by no scan.
- Files: `scripts/verify-branding-preflight.mjs`, `scripts/scan-brand-residue.mjs`, `inventory/brand-tokens.json`
- Risk: Identifier-form leak through a novel surface location.
- Priority: Low (rests on code review; the preflight's zero-file-walk-is-failure and filesystem-not-index reads already closed the two demonstrated instances of this class).

**Extension-source pinning semantics — Low priority until Phase 4:**
- What's not tested: `theia download:plugins` behavior and hash verification of Open VSX artifacts in this tree's composition.
- Files: `theia/package.json`, `theia/applications/browser/package.json`
- Risk: Unverified extension bits entering the sidecar.
- Priority: Low (no curated set ships before Phase 4; becomes High the moment EXT-02 is scheduled).

---

*Concerns audit: 2026-09-04*
