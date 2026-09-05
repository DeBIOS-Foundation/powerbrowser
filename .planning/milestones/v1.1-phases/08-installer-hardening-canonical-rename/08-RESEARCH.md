# Phase 08: Installer Hardening + Canonical Rename — Research

**Researched:** 2026-09-04
**Domain:** Firefox-ESR installer packaging (NSIS/MSIX/DMG), self-hosted MAR updates, canonical rename propagation, release builds, ESR rebase drill
**Confidence:** HIGH for tree-derived mechanics and rename inventory; MEDIUM for per-OS packaging-host specifics until a real host exists

## Summary

Phase 08 turns schema-complete installer fragments into real, self-updating branded installers and folds the NAME-01 canonical rename (`PowerBrowser`) in first, because every installer surface embeds the display name and verifying under the old form would double the packaging-host work. The local investigation grounds every unknown the phase brief named: the pinned `upstream/` checkout (tag `FIREFOX_153_1_0esr_RELEASE`) was read directly, not upstream main.

The update story has a hard prerequisite the planner must schedule first: `.mozconfig` currently carries `ac_add_options --disable-updater` (emitted literally by `emitMozconfig`), so no build in this tree can consume a MAR at all. Self-hosted MAR updates require flipping that line, enabling `--enable-unverified-updates` (verified to exist at `upstream/build/moz.configure/update-programs.configure:28`), building MARs with `tools/update-packaging/make_full_update.sh`, and pointing clients at a fork-hosted `update.xml` via the `AppUpdateURL` enterprise policy (verified present in the pinned tree's `policies-schema.json:139`). The official Firefox Source Docs "Setting Up An Update Server" page documents this exact flow end to end.

On packaging hosts, the split the brief hypothesized is confirmed: NSIS compilation is Nix-buildable on Linux (`makensis` ships in nixpkgs as `nsis@3.12` for `x86_64-linux`; the compiler is portable and Linux-pipeline use is routine), while MSIX requires `makeappx.exe`/`signtool.exe` from the Windows SDK (the pinned tree's own `msix.py` raises unless they resolve, wine invocation explicitly accommodated) and DMG creation shells out to macOS-only `hdiutil`/`SetFile` (the pinned tree's own `dmg.py`). So: Nix/Linux proves the NSIS path; a real Windows host/VM and a real macOS host/VM are required for MSIX and DMG respectively.

**Primary recommendation:** Order the phase as (1) WR-04 + WR-07 pre-fixes, (2) NAME-01 rename slice with gate re-pinning, (3) updater enablement + one local N→N+1 MAR hop on Linux as the update-story proof, (4) NSIS build on Nix/Linux, (5) MSIX + DMG on named real hosts/VMs with the per-OS install→launch→uninstall→no-residue matrix, (6) `objdir-release` build + release-variant rows + live ESR rebase drill as closing drills, with WINDOWS #13/#14 fixed alongside (both are one-line-class fixes with pre-written fix directions in-tree).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Locked pre-decisions (milestone scoping 2026-09-04):
- NAME-01 folded into this phase (not standalone): `identity.display_name` → `PowerBrowser`, gates re-pinned, propagation proof re-run live.
- Update story: self-hosted MAR updates under fork signing.
- Packaging hosts: Nix-built packaging tried first, agent-driven VMs fallback (Windows NSIS likely Nix-buildable on Linux; MSIX + macOS DMG need real hosts/VMs).
- WR-04 + WR-07 pre-fixes land before the first real-host build.
- Crash reporter stays compiled out (TEL-04 is Phase 09; no Breakpad re-enablement here).
- Nonstop autonomous defaults apply (see STATE.md standing instructions).

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAME-01 | `identity.display_name` → `PowerBrowser`; every spaced-form gate re-pinned; single-edit propagation proof re-run live with tier-3 Linux build | § NAME-01 Rename-Slice File Inventory — exact file/line list of every gate asserting the spaced form |
| PKG-01 | Windows (NSIS/MSIX) + macOS (DMG/`.icns`) installers actually built on packaging hosts from generated branding | § Standard Stack + § Environment Availability — Nix-NSIS first, real hosts for MSIX/DMG; `mach package` / `mach repackage` mechanics |
| PKG-02 | Self-hosted MAR updates under fork signing; per-OS install/uninstall matrix as exit gate | § Architecture Patterns (MAR pipeline) — `--enable-unverified-updates` + `make_full_update.sh` + `AppUpdateURL` policy, all verified in pinned tree |
| PKG-03 | `docs/BUILD.md` packaging procedure; WR-04 + WR-07 pre-fixes before first real-host build | § WR-04/WR-07 Pre-fix Specifics — exact regex site and function signature to change |
| BLD-01 | Release `objdir-release` build passes with release-variant rows green (WINDOWS #10) | § Release Build Procedure — env vars, cost (~47m), --gate exclusion keying |
| UPD-03 | Live ESR rebase drill against next ESR tag through existing tooling (05) | § ESR Rebase Drill — command, backstops, UNEXECUTED precedent |
| SEC-02 | WINDOWS #13 closed — `registerWindowActor` hole in internals-boundary guard | § WINDOWS #13/#14 Fix Directions — one-line fix + self-test shape |
| SHELL-01 | WINDOWS #14 fixed — BiDi double-window / `contexts[0]` mis-resolution | § WINDOWS #13/#14 Fix Directions — select-by-URL via existing `topLevelContexts` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Planner must reject any task violating these (all load-bearing for this phase):

1. **Never modify Gecko outside the patch stack.** `upstream/` is never hand-edited (`git -C upstream diff` stays empty). Enabler consequence: `--enable-unverified-updates` is a *mozconfig/build-flag* change (allowed — `.mozconfig` is generated output), NOT a Gecko source edit. If updater enablement ever seems to need an `upstream/` edit, reshape the approach.
2. **Patches are regenerated, never text-edited.** If PKG work needs a patch-stack change (e.g. a third patch), generate from a patched tree; `scripts/check-patch-surface.sh` guards the surface.
3. **One driver, one registry.** New gates (installer build-proof, MAR-hop proof, rename propagation) append rows to `scripts/verify-platform.sh` `CHECKS` — never a sibling driver. Installer build-proof rows are full-mode-only (need hosts/binaries); their `--self-test` halves ride in `--quick` like every other self-test.
4. **Derive, don't hand-keep.** New checks derive expectations from the tree/generator at check time with set-equality in both directions, and each carries a `--self-test` proving red both ways (control-green-first discipline).
5. **Residual-brand scan stays green.** `node scripts/scan-brand-residue.mjs` must exit 0; stage new files before trusting a green scan. NAME-01 changes the *expected display value*, not the token set — no inventory token-class change needed.
6. **No custom browser chrome; Theia is default GUI.** Installer work must not add chrome UI. The phase has no GUI scope.
7. **Builds run in Nix dev shells** (`nix develop .#firefox` for Gecko-side, `.#theia` for Node-side). `docs/BUILD.md` timings name tree+host+toolchain; new timings must do the same (D-73 forbids presenting inherited numbers as fresh measurements).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| NSIS/MSIX/DMG artifact production | Packaging host (Windows/macOS/Linux-Nix) | — | Compilers/packagers are host tools; nothing enters repo or flake |
| Branding fragment emission (`branding.nsi`, plist fields, appx fields) | Generator (`scripts/generate.mjs` + frozen `TARGETS`) | — | Single-manifest derivation; byte-identity + `--check` cover new emitters automatically |
| MAR build + update XML hosting | Build host + fork web host | — | `make_full_update.sh` output served as static files; no new repo service |
| Update-client configuration | Generated `distribution/policies.json` (`AppUpdateURL`) | — | Policy mechanism already emitted; updater enablement is build-flag + policy, not code |
| Installer/update verification | `verify-platform.sh` registry rows | — | One-driver rule; full-mode rows for host-dependent proofs |
| Canonical-name propagation | `configuration.toml` `[identity]` + generator emitters | All display gates | Single-edit claim: one manifest value fans out to every surface |

## Standard Stack

### Core (host tooling — nothing enters the repo or flake)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| NSIS (`makensis`) via nixpkgs `nsis` | 3.12 [CITED: github.com/NixOS/nixpkgs `pkgs/by-name/ns/nsis/package.nix`] | Compile `installer.nsi` → Windows `.exe` installer on Linux | The pinned upstream installer is NSIS (`upstream/browser/installer/windows/nsis/installer.nsi`, 1804 lines [VERIFIED: upstream tree]); nixpkgs builds `makensis` for `x86_64-linux` (`platforms = lib.platforms.unix`, `mainProgram = "makensis"` [CITED: mynixos.com/nixpkgs/package/nsis]); Linux-pipeline NSIS use is routine [CITED: websearch, docker `makensis` images]. 3.11 fixed CVE-2025-43715 (SYSTEM priv-esc); 3.12 fixes a second one [CITED: v1.1 STACK.md, cross-checked via nixpkgs pin] |
| Windows SDK (`makeappx.exe`, `signtool.exe`) on a real Windows host | Current SDK with the pinned ESR | MSIX pack + sign | The pinned tree's own packager raises without them: `raise ValueError("makeappx is required; set MAKEAPPX or WINDOWSSDKDIR or PATH")` [VERIFIED: upstream/python/mozbuild/mozbuild/repackaging/msix.py:737-740] and `signtool is required` [VERIFIED: same file:788-790]. Wine invocation is explicitly accommodated upstream but is a fallback, not the plan |
| macOS host tools (`hdiutil`, `SetFile`) on a real macOS host | macOS-bundled | DMG creation | The pinned tree's own `dmg.py` shells out to `hdiutil` [VERIFIED: upstream/python/mozbuild/mozpack/dmg.py:140,153] and `SetFile -a C` [VERIFIED: same file:39]. No Linux equivalent produces a blessed, Gatekeeper-clean DMG — REQUIREMENTS.md Out of Scope already bars cross-compiled macOS signing |
| Fork static file host (any HTTPS static host) | n/a | Serve `update.xml` + MARs | Update descriptors are static XML; MARs are static files. No new infrastructure to research |

### Supporting (already in tree / upstream machinery)

| Library / Mechanism | Version / Ref | Purpose | When to Use |
|---------------------|---------------|---------|-------------|
| `mach package` + `mach repackage [dmg\|pkg\|installer\|mar]` | Pinned ESR (`FIREFOX_153_1_0esr_RELEASE` [VERIFIED: `git -C upstream describe --tags` → `FIREFOX_153_1_0esr_BUILD1` + `FIREFOX_153_1_0esr_RELEASE`]) | Produce staged dist dir / repackaged artifacts | NSIS path: `mach package` then drive `installer.nsi` with generated `branding.nsi`; MAR path: `mach package` → `make_full_update.sh`; DMG/MSIX: `mach repackage` on the real host [CITED: upstream `mach_commands.py` repackage usage line; Firefox Source Docs] |
| `tools/update-packaging/make_full_update.sh` + `mar`/`mar.exe` from `dist/host/bin` | Pinned tree [VERIFIED: `upstream/tools/update-packaging/` contains `make_full_update.sh`, `make_incremental_update.sh`, `moz.build`] | Build complete MARs | Exact invocation documented in Firefox Source Docs (see Code Examples) |
| `AppUpdateURL` enterprise policy → generated `distribution/policies.json` | Present in pinned schema [VERIFIED: upstream/browser/components/enterprisepolicies/schemas/policies-schema.json:139 `"AppUpdateURL": { "$ref": "#/definitions/url" }`] and engine [VERIFIED: `Policies.sys.mjs` carries `AppUpdateURL:` at line 300] | Point clients at fork update server without touching `app.update.url` default-branch semantics | The sanctioned override: `app.update.url` intentionally only reads its default value (Bug 1468948 [CITED]), and the policy (Bug 1469943, shipped FF63/ESR60.2 [CITED]) is the supported bypass |
| `--enable-unverified-updates` mozconfig flag | Present at pinned tag [VERIFIED: upstream/build/moz.configure/update-programs.configure:28 `"--enable-unverified-updates"`; gating `MOZ_VERIFY_MAR_SIGNATURE` at lines 35-55] | Let fork builds consume locally-signed MARs | Required: fork cannot carry Mozilla's MAR signing key. Turner-off is `MOZ_VERIFY_MAR_SIGNATURE` ifdef'd through `updater.cpp`/`archivereader.cpp` [VERIFIED]. **Note:** flag name says "unverified" — release story should still sign MARs with a fork key and verify out-of-band (hash manifest); the flag only drops the Mozilla-key hard requirement |
| Existing generator emitters + `verify-installer-schema.mjs` | Tree HEAD | NSIS defines, Appx fields, plist fields, tile manifest | Extend, don't replace; WR-04/WR-07 harden them pre-build |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Self-hosted MAR (chosen, locked) | OS-package updates (deb/rpm) or no in-place updates | Locked by CONTEXT.md pre-decision; MAR reuses upstream machinery with zero new client code |
| `mach`-driven NSIS on Nix/Linux | Full Windows VM for everything | VM is the fallback; Nix path is cheaper and CI-able — but only for NSIS, never MSIX/DMG |
| Linux DMG tooling (`genisoimage`, `libdmg-hfsplus`) | Real macOS host | Unblessed DMGs fail Gatekeeper/notarization expectations; Out of Scope bars cross-compiled macOS signing — use the real host |
| Mozilla-key MAR signing | `--enable-unverified-updates` + fork-key signing + hash-pinned manifests | Mozilla's key is unobtainable by design (Source Docs: "you cannot really build an official MAR yourself" [CITED]); the flag is the documented fork path |

**Installation (packaging-host setup, not repo deps):**
```bash
# Linux/Nix NSIS path — add to a shell or run ad hoc (host tooling, never flake buildInputs for the repo itself):
nix shell nixpkgs#nsis --command makensis -VERSION
# Windows host: install NSIS 3.12 + Windows SDK (MAKEAPPX/SIGNTOOL via WINDOWSSDKDIR or PATH)
# macOS host: Xcode command-line tools (hdiutil/SetFile are system tools)
```

**Version verification:** `nsis@3.12` confirmed on nixpkgs nixos-unstable branch at research time [CITED: github.com/NixOS/nixpkgs `package.nix` showing `version = "3.12"`]. The ESR pin is `FIREFOX_153_1_0esr_RELEASE` [VERIFIED: upstream tag]. No npm/PyPI/crates packages are added by this phase (see Package Legitimacy Audit).

## Package Legitimacy Audit

> No external registry packages are installed by this phase. All packaging tooling is host-side (nixpkgs `nsis`, Windows SDK, macOS system tools) or already-vendored upstream machinery. The legitimacy-gate seam was exercised as a control (`better-sqlite3` → `OK`, 10.3M/wk) to prove the seam works; it governs Phase 09, not this one.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| *(none)* | — | — | No `npm install` / `pip install` / new flake inputs in Phase 08 scope |
| `nsis` (nixpkgs, `pkgs/by-name/ns/nsis/package.nix`, v3.12) | nixpkgs (source-built, not a registry blob) | OK-equivalent [CITED] | Approved as **host tooling only** — never a flake `buildInput` of the repo shells unless the planner wants a dedicated packaging shell; `nix shell nixpkgs#nsis` keeps it out of the committed toolchain |

**Packages removed due to SLOP:** none. **Flagged SUS:** none.

## Architecture Patterns

### System Architecture Diagram

```
configuration.toml [identity]/[installer]
        │  (single edit — NAME-01 changes one value here)
        ▼
scripts/generate.mjs ──TARGETS──▶ generated/branding/<variant>/{branding.nsi,*.xml,configure.sh,brand.*}
        │                                 generated/installer/<variant>/{AppxManifest-fields.xml,Info-plist-fields.xml}
        │  (≈ Mach package inputs)                      │
        ▼                                               ▼
  .mozconfig + identity.configure +              ┌──────┴──────────────────┐
  branding overlay ──▶ ./mach build ──▶         │   PACKAGING HOSTS       │
        │                  │                     │                         │
        │            dist/bin/powerbrowser        │ Linux/Nix: makensis     │
        │                  │                     │  installer.nsi +        │
        │                  ▼                     │  branding.nsi → .exe    │
        │            ./mach package               │                         │
        │                  │                     │ Windows host: MSIX      │
        │         ┌────────┴────────┐            │  (makeappx/signtool)    │
        │         ▼                 ▼            │                         │
        │   installer.nsi      make_full_        │ macOS host: DMG         │
        │   (+branding.nsi)    update.sh         │  (hdiutil)              │
        │         │                 │            └──────┬──────────────────┘
        │         ▼                 ▼                   │
        │   PowerBrowser-setup.exe  N.mar ──▶ static HTTPS host ──▶ update.xml
        │         │                 │                                    │
        │         ▼                 ▼                                    ▼
        └─▶ per-OS install→launch→uninstall matrix ◀── AppUpdateURL policy ── installed client
                                    │               (generated distribution/policies.json)
                                    ▼
                          one real N→N+1 MAR hop per OS (PKG-02 exit proof)
```

Reader trace: one manifest edit → generated fragments → build → package → per-host artifacts → matrix + update hop. The updater-enable flag flip (`--disable-updater` → removed + `--enable-unverified-updates`) sits on the `.mozconfig` arrow and requires a full tier-3 rebuild per changed flag.

### Recommended Project Structure

No new top-level structure. Additive rows only:

```
scripts/
├── generate.mjs              # MODIFIED: WR-04 bare-$VAR rejection in assertNsisEmittable
├── verify-installer-schema.mjs  # MODIFIED: WR-07 root-threading in readTileColor
├── verify-platform.sh        # MODIFIED: append build-proof + MAR-hop rows (full-mode) + self-tests (--quick)
docs/BUILD.md                  # MODIFIED: packaging procedure section with attributed timings
powerbrowser/distribution/policies.json  # MODIFIED (via generator or hand): AppUpdateURL
.mozconfig                     # REGENERATED: updater flags (via generator change, see below)
```

### Pattern 1: Updater enablement is a build-flag + policy change, not a code change

**What:** `emitMozconfig` currently emits the literal line `'ac_add_options --disable-updater'` [VERIFIED: scripts/generate.mjs:1177]. The six literal lines (application, updater, wasm-sandbox, libclang, crashreporter, ccache) are deliberately literal because "a brand never changes whether the crash reporter is built" [VERIFIED: scripts/generate.mjs:1150-1158 comment]. The updater flag is the one literal this phase must change — and per that same comment's own escape hatch ("promoting one to a key later is purely additive"), the disciplined form is a small additive step: flip the literal (or promote to an emitter line keyed off a frozen default, never a manifest value — no new `[build]` table is in scope) and regenerate `.mozconfig` through the byte-identity gate (emitter + tracked comparand change in one commit, per the 02-04 header-rewrite precedent in STATE.md).

**When to use:** PKG-02 mechanism work. **Cost:** any `.mozconfig` flag change is a tier-3 full rebuild (~47–54 min measured [CITED: docs/BUILD.md tier-3 table]).

### Pattern 2: Every new proof rides the existing registry with a `--self-test` twin

**What:** `installer-schema` + `installer-schema-self-test` already ride `--quick`; `verify-branding-identity-release` + `branding-variant-divergence` are full-mode rows reading `objdir-release/` with `--gate` exclusions keyed on ledger #10 [VERIFIED: scripts/verify-platform.sh:4363-4373]. New rows follow the identical shape: `installer-build-proof[-self-test]`, `mar-update-hop[-self-test]`, where the self-test runs on synthetic fixtures (mock `dist/` tree, mock MAR + `update.xml`) and the full row runs on real hosts.

### Anti-Patterns to Avoid

- **Hand-kept installer expectations:** any new check asserting on literal `branding.nsi` content instead of deriving from `TARGETS`/generator output. Derive-and-compare both directions (the `verify-installer-schema.mjs` set-equality precedent).
- **Text-editing a patch to "enable" something:** if updater/packaging work touches Gecko behavior, it goes through mozconfig/policy/generated prefs — never an `upstream/` edit, never a hand-edited hunk.
- **Proving the update story on the same build twice:** the N→N+1 hop must be two distinct builds (different `MOZ_PRODUCT_VERSION`/buildID); re-serving one MAR to itself proves the plumbing but not an upgrade. (The upstream debug script's self-update loop is explicitly a same-version test loop [CITED: Source Docs Debugging page] — fine for plumbing, insufficient for the exit gate.)
- **Bare `$VAR` in any NSIS define (WR-04):** expands to empty at compile time → installer that "succeeds" into nonsense paths. Generator-time rejection, not review.
- **Verifier reading the live manifest instead of its fixture root (WR-07):** gate agrees with the wrong file. Thread `root` through.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Windows installer authoring | Custom NSIS script | Upstream `installer.nsi` + generated `branding.nsi` six defines | 1804-line script with maintenance-service, uninstall, registry semantics; the fork's surface is the six `!define` values `verify-installer-schema.mjs` already asserts |
| MAR construction | Custom archive format | `make_full_update.sh` + tree-built `mar` binary | Signature envelope + `precomplete` semantics the updater verifies; hand-rolled MARs fail `MOZ_VERIFY_MAR_SIGNATURE` or the precomplete check |
| Update polling/scheduling | Custom update client | Gecko updater + `AppUpdateURL` policy | Staging, background tasks, maintenance-service elevation, cert pinning — all upstream machinery; the fork configures the URL, not the engine |
| DMG layout/blessing | `genisoimage` + hope | `mach repackage dmg` on a macOS host (`hdiutil`/`SetFile`) | Blessing, `.DS_Store` placement, code-signing alignment are host-toolchain behaviors |
| MSIX packaging/signing | Manual `zip` + `openssl` APPX | `mach repackage` / `msix.py` with Windows SDK `makeappx`+`signtool` | Manifest schema + signature format the OS enforces; `msix.py` already orchestrates both |
| Display-name propagation | Sed across the tree | `configuration.toml` edit + `generate.mjs` | Single-edit claim is the product; sed reintroduces Pitfall-1-class divergence between literals and gates |

**Key insight:** Every artifact in this phase is produced by upstream machinery fed with fork-generated inputs. The platform's job is correct *inputs* (six NSIS defines, plist/appx fields, update URL, MAR bytes) plus gates that discriminate — never parallel packaging tooling.

## WR-04 / WR-07 Pre-fix Specifics

Both sites were confirmed live in this tree (not just in review docs):

### WR-04: NSIS sink guard misses bare `$VAR`

- **Site:** `const NSIS_UNEMITTABLE = /"|\$\{|\r|\n|\0/;` [VERIFIED: scripts/generate.mjs:873] with `assertNsisEmittable(path, value)` at line 880-881.
- **Hole:** the character class rejects `"`, `${`, CR, LF, NUL — but a bare `$INSTDIR`/`$VAR` (no brace) passes. NSIS expands `$VAR` at compile time, so `https://example.org/$INSTDIR/x` (03-VERIFICATION.md's confirmed example) emits silently into a define and compiles into a wrong path/name [CITED: 03-VERIFICATION.md:139].
- **Fix direction:** extend the guard to reject a bare `$` followed by an NSIS-name character (i.e. `\$[A-Za-z_{]` — covering `$V` and `${V` in one class; keep `$$`? NSIS escapes literal `$` as `$$`, so the precise rule is: reject `$` not followed by `$`. None of the current manifest values contain `$`, so strictness is free). Add a `generate --self-test` plant mirroring the existing NSIS self-test harness at `scripts/generate.mjs:3905` (`generate-selftest-nsis-` mkdtemp + `case-nsis.toml` fixture) asserting the hostile `display_name`/`support_url` goes red.
- **Blast radius:** `assertNsisEmittable` guards `identity.display_name`, `name_suffix`, `product.vendor_display`, `installer.support_url`/`product.homepage` [VERIFIED: lines 2812-2815, 2782-2789]. NAME-01's new value `PowerBrowser` contains no `$` — no interaction.

### WR-07: Installer verifier reads the live manifest instead of its fixture root

- **Site:** `function readTileColor()` reads `join(REPO_ROOT, 'configuration.toml')` [VERIFIED: scripts/verify-installer-schema.mjs:288-292], while every other input to `runChecks(root)` is rooted at the `root` parameter (fixture dir in `--self-test`).
- **Hole:** the self-test mirrors the live tree, so a divergent fixture manifest (e.g. a downstream setting `installer.tile_color`) would be checked against the *live* manifest's tile state — latent false-green/false-red [CITED: 03-VERIFICATION.md:142].
- **Fix direction:** `readTileColor(root)` reading `join(root, 'configuration.toml')`; update the three call sites (`runChecks` + self-test plant 3, which currently reads the live manifest to decide which polarity to plant [VERIFIED: line 443 `const stated = readTileColor();`]). Add a divergent-manifest plant: fixture manifest *with* `tile_color` set against tile XML *without* `BackgroundColor` (and vice versa) must go red naming the file and state. ARCHITECTURE.md §7a already prescribes exactly this [CITED: v1.1 ARCHITECTURE.md:213-214].

## NAME-01 Rename-Slice File Inventory

`identity.display_name = "Power Browser"` → `"PowerBrowser"` [VERIFIED: configuration.toml:38]. The rename touches display strings only; `app_basename`/`binary_name`/`remoting_name` (`powerbrowser`), `MOZ_APP_REMOTINGNAME`, `StartupWMClass=powerbrowser`, `distribution_id` stay frozen — Pitfall 2 (profile/remoting collision) forbids touching them, and the plan needs an identity-field freeze assertion + alongside-Firefox interleaved launch test as exit criteria [CITED: v1.1 SUMMARY.md Pitfall 2].

### Gates asserting the spaced form (every one must be re-pinned)

| # | File | What asserts the spaced form | Re-pin action |
|---|------|------------------------------|---------------|
| 1 | `inventory/brand-tokens.json` `brand_display_expectations` block | Hand-authored expected values: `brand_full_name: "Power Browser Dev"` / `"Power Browser"`, `app_display_name`, `desktop_entry` etc. [VERIFIED: lines 75-96, quoted verbatim] | Rewrite dev `brand_full_name` → `"PowerBrowser Dev"`, release → `"PowerBrowser"` (suffix rule: base+suffix — confirm whether suffix stays `" Dev"`; NEXT-MILESTONE-INPUTS says canonical form is `PowerBrowser`, accepted identifier forms already spaceless) |
| 2 | `scripts/verify-branding-preflight.mjs` | 18 occurrences of `Power Browser` [VERIFIED: grep count]; plants and messages pin e.g. `'-brand-full-name = Power Browser Dev'` [VERIFIED: line 1241] and `'<title>Power Browser</title>'` [VERIFIED: line 1344] | Re-pin plants/messages to the canonical form; the script *derives surfaces* from the tree but its *expected values* come from the inventory block above, so #1 + this move together |
| 3 | `scripts/verify-branding.mjs` | Comment pinning `brand_short_name 'Power Browser'` [VERIFIED: line 204] | Update comment/expectation |
| 4 | `scripts/generate.mjs` `--self-test` | `also: ['brand.properties', 'Planted Drift', 'Power Browser Dev']` [VERIFIED: line 4530] + error-message example `display_name = "Power Browser"` [VERIFIED: line 222] | Re-pin comparand strings; error-message example should show the new canonical form |
| 5 | `scripts/verify-trademark-surface.mjs` | Display-field scan over manifest-derived surfaces; self-test fixture uses `display_name = "Acme Browser"` (spaced, multi-word — the hostile spacing shape) [VERIFIED: lines 387-390] | Fixture shape stays valid (still spaced multi-word); only the *platform-manifest* expectations move. Anchored exclusions referencing the old display value must be re-checked |
| 6 | Downstream fixtures (`07-sourcerer-as-downstream/fixtures/`) | `spaced-name` fixture (`display_name = "Cedar Falls Browser"`) proves multi-word spacing survives [VERIFIED: fixture file] | Keep as-is (it tests the *mechanism*, not the platform value); ADD a canonical-form fixture (`display_name = "PowerBrowser"`, single token, no interior space) proving the no-space form emits cleanly through shell quoting, desktop `Name=`, locale files, and NSIS defines |
| 7 | `scripts/verify-branding-identity.mjs` `VARIANTS` | Structural paths only — all brand *values* derive from `configuration.toml` via `resolveConfig` [VERIFIED: lines 130-138 comment + descriptor] | **No re-pin needed** — derives the new value automatically. Planner: this is the model; note it as the control proving propagation |
| 8 | `powerbrowser/identity.configure.comparand` + tracked branding files | Byte-identity comparands for `generate --self-test`/byte-identity gate | Regenerate from the emitter after the manifest edit (emitter + tracked files change in one commit, per the 02-04 header-rewrite precedent) |
| 9 | `docs/BUILD.md` | States dev title bar reads `... — PowerBrowser Dev`? No — currently documents `Power Browser Dev` windows title behavior [CITED: BUILD.md "Telling a dev build from a release build"] | Update prose + re-measured attribution stays (timings unaffected by rename) |

**Propagation proof (re-run live):** Phase 3's single-edit proof — edit `display_name`, run `generate.mjs`, `--check` + byte-identity green, tier-3 Linux build, then `verify-branding-identity.mjs` (both variants where buildable) + preflight + trademark-surface green on built artifact surfaces. The new-value risk is *under*-spacing bugs (a surface that splits on space or trims to empty is green today because every value has a space) — the plan should add a no-interior-space assertion or rely on the new canonical-form fixture (#6).

## Release Build Procedure (BLD-01 / WINDOWS #10)

- **Command** (attributed precedent [CITED: docs/BUILD.md tier-3 row #2]): `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build` — env names stay literal because "read by scripts and by the developer's shell, not by the generator" [VERIFIED: scripts/generate.mjs:1145-1146]. The emitted `.mozconfig` defaults resolve `${POWERBROWSER_OBJDIR:-objdir}` / `${POWERBROWSER_BRANDING:-powerbrowser/branding-generated/dev}` [VERIFIED: .mozconfig:6,15].
- **Cost:** ~47m (2822s measured on legion, pre-rename tree [CITED: BUILD.md]). A fresh measurement must be attributed as Power-Browser-tree + host + toolchain (D-73).
- **Gate effect:** the release build un-blocks the two `--gate` exclusions keyed on ledger #10 — `verify-branding-identity-release` and `branding-variant-divergence` [VERIFIED: scripts/verify-platform.sh:4363-4373] — which "become runnable, unchanged, the moment a release objdir exists."
- **Updater interaction:** if the updater-flag flip lands before this build, the release build should carry the same flags (one flag set per objdir via `config.status`; keep dev/release flag sets identical or record the delta).

## ESR Rebase Drill (UPD-03)

- **Command:** `scripts/rebase-upstream.sh --tag <NEW_TAG> [--dry-run]` [CITED: docs/BUILD.md]. Fails loudly on: unknown tag (pre-checked via `git ls-remote`), `fetch-upstream.sh` failure, `apply-patches.sh` replay failure incl. the non-vacuous per-patch assertion, `check-patch-surface.sh` rejection, residual-brand scan hits in either tree (tracked + `--extra-root upstream/`), branding-overlay symlink resolution [CITED: BUILD.md rebase section].
- **Precedent:** 05-04 staged it as UNEXECUTED "pending a next ESR tag" [CITED: STATE.md]; the drill executes when a tag newer than `FIREFOX_153_1_0esr_RELEASE` exists. Phase 08's installer/packaging surfaces are new rebase surface (NSIS defines reference no upstream content, but `installer.nsi` drift across ESR bumps can break the six-define contract — the drill must include an installer-schema green over the rebased tree).
- **CI note:** `.github/workflows/rebase-upstream.yml` is `workflow_dispatch`-only and never builds; the toolchain-baseline diff is a local operator follow-up under `nix develop .#firefox` [CITED: BUILD.md].

## WINDOWS #13 / #14 Fix Directions

### #13 (SEC-02): `registerWindowActor` hole in the internals-boundary guard — OPEN

- **Ledger:** "ChromeUtils.registerWindowActor is absent from FORBIDDEN_PATTERNS. Latent, not exploited: candidate B (the JSWindowActor pair) was NOT adopted in 01-05" [VERIFIED: WINDOWS.md:30].
- **Fix direction (pre-written in-tree):** `scripts/verify-gui01-window.mjs:177-178` states the obligation verbatim: adopting any JSWindowActor pair "obliges adding `ChromeUtils.registerWindowActor` to check-internals-boundary.sh's FORBIDDEN_PATTERNS." The fix is one pattern-line addition to `FORBIDDEN_PATTERNS` [VERIFIED: scripts/check-internals-boundary.sh:36-56] plus a catalogue-consistency consequence (any in-`PowerBrowserAPI.sys.mjs` occurrence needs an `INTERNAL-APIS.md` row — currently zero `WindowActor` occurrences in either file [VERIFIED: grep no-match]).
- **Gate shape:** extend `--self-test` with a planted `ChromeUtils.registerWindowActor(...)` fixture asserting rejection naming the file and pattern (mirrors the existing `Services.` plant [VERIFIED: lines 237-255]). ASVS mapping: V4 Access Control (privilege-boundary enforcement), V5 Input Validation (static allowlist-deny).

### #14 (SHELL-01): BiDi double-window / `contexts[0]` mis-resolution — OPEN

- **Ledger:** "Every withFirefoxPage caller that passes a URL launches TWO windows (the shell plus a stock browser window for the URL argument), and contexts[0] resolves to the shell's own supervised Theia frontend rather than the URL passed" [VERIFIED: WINDOWS.md:31]. Root cause documented in-code: upstream's `nsDefaultCommandLineHandler` takes the URI branch regardless of `preventDefault` [VERIFIED: scripts/lib/firefox-bidi.mjs:282-289].
- **Fix direction:** stop pinning `evaluate`/`screenshot` to `tree.result.contexts[0]` [VERIFIED: lines 356-357]; select the context by URL via the already-exported `topLevelContexts()` helper [VERIFIED: lines 379-382] (match the requested `url`, fall back to first context with a logged note when no URL was passed). The four `_run_app_check_mjs` callers that "boot a dev app at localhost:3000 they then do not read" should pass `''` (no-URL launch) or assert against the matched context.
- **Gate shape:** extend the BiDi harness or a caller check with a two-context session asserting the URL-bearing context is selected (positive control: single-context session still resolves). No new files — modify `firefox-bidi.mjs` + affected callers.

## Common Pitfalls

### Pitfall 1: Proving the updater against Mozilla's network
**What goes wrong:** `app.update.url` default still points at `aus5.mozilla.org`; a "green" update test actually updated from Mozilla (the policy-templates #655 thread documents exactly this: online machines pulled from Mozilla despite a custom URL misconfiguration [CITED]). **Why:** `app.update.url` only reads its default value; user-branch edits are silently ignored (Bug 1468948 [CITED]). **Avoid:** set `AppUpdateURL` policy under computer/machine scope, then prove the negative — packet/host-resolver log showing zero `*.mozilla.org`/`*.mozilla.net` update hosts during the hop (reuse the `verify-endpoints.sh` layer-3 pattern). **Warning signs:** update succeeds with no request in the fork server's access log.

### Pitfall 2: `--disable-updater` left on while testing MARs
**What goes wrong:** MAR staging silently absent; `make_full_update.sh` output has nothing to consume. **Why:** the flag compiles the updater out; it is not a pref. **Avoid:** assert `MOZ_UPDATER`-conditional code is compiled in (e.g. `dist/bin/updater` exists / `config.status` shows the flag) before any MAR test. **Warning signs:** no `updater` binary next to the build output.

### Pitfall 3: Same-version MAR "hop" accepted as the exit proof
**What goes wrong:** N→N self-update green, first real version bump fails (version-gated migration paths, `precomplete` staleness). **Avoid:** exit gate is two distinct builds with distinct versions/buildIDs; same-version loop is plumbing-only. **Warning signs:** `update.xml` `appVersion` equals the installed version.

### Pitfall 4: MSIX/DMG attempted from Linux
**What goes wrong:** days lost to `makeappx` under wine or unblessed-DMG workarounds. **Avoid:** planner puts MSIX/DMG on named real hosts from the start; Linux effort goes to NSIS only. The pinned tree's own error strings (`makeappx is required`, `hdiutil` subprocess calls) are the authority.

### Pitfall 5: Rename-then-package ordering inverted
**What goes wrong:** packaging proofs run under `Power Browser`, then NAME-01 invalidates every artifact and gate. **Avoid:** NAME-01 first (locked order §Summary). Every installer surface carries the display name (`BrandFullName`, `DisplayName`, `CFBundleName`, tile manifest).

### Pitfall 6: Profile/remoting collision with stock Firefox (alongside requirement)
**What goes wrong:** installer-tested browser steals the default profile or remote commands from stock Firefox. **Avoid:** freeze `remoting_name`/`app_basename`/`distribution_id`; exit matrix includes an alongside-stock-Firefox interleaved launch (install → launch both → uninstall → no residue). `MOZ_APP_REMOTINGNAME=powerbrowser` [VERIFIED: .mozconfig:16] and `StartupWMClass=powerbrowser` [VERIFIED: both .desktop files:13] are the pins.

### Pitfall 7: Release-only drift (titlebar pref, `brandFullName`)
**What goes wrong:** dev green, release misbranded — the exact class `branding-variant-divergence` exists for (dev `brandFullName="PowerBrowser Dev"` + `browser.tabs.inTitlebar=0` vs release bare + unset). **Avoid:** BLD-01 + both release rows green in the same phase; the new canonical values must satisfy the divergence check's both-directions comparison.

## Code Examples

Verified patterns (all sites read live this session; upstream paths are the pinned `FIREFOX_153_1_0esr_RELEASE` checkout):

### Build a complete MAR (Linux, fork signing)
```bash
# Source: Firefox Source Docs "Setting Up An Update Server" [CITED:
# https://firefox-source-docs.mozilla.org/toolkit/mozapps/update/docs/SettingUpAnUpdateServer.html]
# Prerequisites: mozconfig carries `ac_add_options --enable-unverified-updates`
# (flag verified at upstream/build/moz.configure/update-programs.configure:28),
# plus a full rebuild after changing it.

./mach package
touch "<objdir>/dist/firefox/precomplete"
MAR="<objdir>/dist/host/bin/mar.exe" MOZ_PRODUCT_VERSION=<version> MAR_CHANNEL_ID=<channel> \
  ./tools/update-packaging/make_full_update.sh <MAR-output-path> "<objdir>/dist/firefox"
```

### Serve the MAR and point a client at it (test loop)
```bash
# Source: same page + Debugging page (Local Build script) [CITED].
./mach update serve -v <MAR-output-path>   # serves update.xml redirecting at the MAR
```
```jsonc
// distribution/policies.json on the test install:
{ "policies": { "AppUpdateURL": "http://127.0.0.1:8000/update.xml" } }
```
```xml
<!-- update.xml shape (sha512 + size of the MAR) -->
<updates>
  <update type="minor" displayVersion="…" appVersion="…" platformVersion="…" buildID="…">
    <patch type="complete" URL="http://127.0.0.1:8000/local_update.mar"
           hashFunction="sha512" hashValue="%HASH_VALUE%" size="%SIZE%"/>
  </update>
</updates>
```

### WR-04 fix (generator sink guard)
```js
// Current (hole): scripts/generate.mjs:873
const NSIS_UNEMITTABLE = /"|\$\{|\r|\n|\0/;
// Fixed direction: reject any $ not escaped as $$ (NSIS literal-$ escape),
// covering $VAR and ${VAR} in one class:
const NSIS_UNEMITTABLE = /"|(?<!\$)\$(?!\$)|\r|\n|\0/;
```
```js
// Self-test plant shape (mirrors scripts/generate.mjs:3905 harness):
// fixture case-nsis.toml with support_url = "https://example.org/$INSTDIR/x" must exit non-zero naming the key.
```

### WR-07 fix (verifier root threading)
```js
// Current: scripts/verify-installer-schema.mjs:288-292
function readTileColor() {
    const manifest = parse(readFileSync(join(REPO_ROOT, 'configuration.toml'), 'utf8'));
    ...
}
// Fixed direction: thread the fixture root every other input already uses
function readTileColor(root) {
    const manifest = parse(readFileSync(join(root, 'configuration.toml'), 'utf8'));
    ...
}
```

### #13 fix (boundary guard)
```bash
# scripts/check-internals-boundary.sh FORBIDDEN_PATTERNS += one line:
  'ChromeUtils.registerWindowActor'
# plus a --self-test plant mirroring the Services. fixture (lines 237-255).
```

### #14 fix (BiDi context selection)
```js
// Current pin: scripts/lib/firefox-bidi.mjs:356-357
const context = tree.result.contexts[0].context;
// Fixed direction: select by requested URL through the existing helper (lines 379-382)
const tree = await client.send('browsingContext.getTree', {});
const match = url
  ? tree.result.contexts.find(c => c.url === url) ?? tree.result.contexts[0]
  : tree.result.contexts[0];
const context = match.context;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `verify-phase-0{2,3,4,5}.sh` drivers | `verify-platform.sh` single registry | 01-03 consolidation | New rows go in `CHECKS`; no sibling drivers |
| Updater compiled out, no story | Self-hosted MAR under fork signing (this phase) | v1.1 scoping 2026-09-04 | `--disable-updater` flips; `AppUpdateURL` policy; N→N+1 hop per OS |
| Spaced `Power Browser` display form | Canonical `PowerBrowser` (this phase) | NEXT-MILESTONE-INPUTS 2026-09-04 | Re-pin inventory + preflight + self-test comparands; add no-space fixture |
| `verify-branding-identity.mjs` hand-kept values | `VARIANTS` structural-only, values derived via `resolveConfig` (06-02) | Phase 06 | Identity checker needs no NAME-01 re-pin — the propagation control |
| Schema-complete installer fragments only | Real host-built installers (this phase) | v1.1 | NSIS on Nix/Linux; MSIX/DMG on real hosts |

**Deprecated/outdated:**
- Same-version MAR self-update loop as an exit proof: plumbing only, never the gate (Pitfall 3).
- `yarn upgrade --latest`-style float for host tools: NSIS version must be pinned/recorded like the Gecko toolchain baseline when the packaging procedure is written.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `makensis` from nixpkgs builds the pinned `installer.nsi` without Windows-only NSIS plugins | Standard Stack | MEDIUM: first Nix NSIS run may hit a missing plugin (`SKIPPLUGINS=all` in the nixpkgs build only affects building NSIS itself, not plugin *use* — but upstream `installer.nsi` may `!addplugindir` Windows DLLs; planner should make the first Nix compile a spike that reports the plugin set) [ASSUMED] |
| A2 | `mach repackage` at the pinned tag supports the same `[dmg\|pkg\|installer\|mar]` surface the docs describe | Standard Stack | LOW: usage string verified in pinned `mach_commands.py`; per-format breakage surfaces at first real-host run [CITED + ASSUMED] |
| A3 | One `AppUpdateURL` policy + `--enable-unverified-updates` is sufficient for the N→N+1 hop (no Balrog/AUS/CRL pinning surprises at ESR 153) | Architecture | MEDIUM: certificate-pinning of the update channel and background-task policy defaults are version-sensitive; first Linux hop is the falsification test [ASSUMED] |
| A4 | MSIX path needs only Windows SDK tools (no paid cert for unsigned/test-signed phase proofs) | Environment Availability | LOW: test-signing suffices for matrix proofs; production signing cert is a later procurement, flagged in Open Questions [ASSUMED] |
| A5 | No new Gecko patch needed for updater enablement (pure mozconfig + policy + prefs) | Architecture | MEDIUM: if `moz.configure` asserts against the fork's branding/identity at enable time, a patch-stack addition follows the regenerate-not-edit rule [ASSUMED] |

## Open Questions

1. **Production signing & notarization story (per-OS cert procurement)**
   - What we know: test-signing suffices for matrix proofs; SmartScreen/Gatekeeper friction for unsigned builds is documented industry-wide.
   - What's unclear: which cert (EV vs standard, Apple Developer ID) the project will procure, and whether MSIX goes to Store or sideload.
   - Recommendation: record as a decision with the same three-option shape as the update story (own cert + timestamping / unsigned with documented friction / OS-store distribution); do NOT procure in this phase — matrix proofs run test-signed.

2. **MAR signing key custody under `--enable-unverified-updates`**
   - What we know: the flag drops the Mozilla-key requirement; Source Docs frame it as the local-build path.
   - What's unclear: whether release MARs get a fork NSS key embedded or hash-pinned manifests over HTTPS.
   - Recommendation: planner picks the minimal defensible rung (fork key + HTTPS + hash-pinned `update.xml` generation script) and records it; full key-ceremony design is out of scope.

3. **Agent-driven VM availability and cost**
   - What we know: no packaging host exists yet (v1.1 synthesis gap); Windows + macOS hosts are required for MSIX/DMG and the per-OS matrix.
   - What's unclear: which VMs, who provisions, runtime cost.
   - Recommendation: first plan names the hosts (or the provisioning task) before any artifact task; NSIS-on-Nix proceeds in parallel, never blocked on VMs.

4. **Dev `name_suffix` under the canonical form**
   - What we know: today dev is `"Power Browser Dev"` (base + `" Dev"`); canonical base becomes `PowerBrowser`.
   - What's unclear: whether dev becomes `"PowerBrowser Dev"` (space before Dev) or `"PowerBrowserDev"`.
   - Recommendation: default to `"PowerBrowser Dev"` (suffix unchanged, only base moves) and pin it in the inventory rewrite; confirm in plan review since it multiplies across every display gate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `upstream/` at pinned tag | All packaging/MAR proofs | ✓ [VERIFIED: tag present, `FIREFOX_153_1_0esr_RELEASE`] | ESR 153.1 | `fetch-upstream.sh` re-materializes |
| `generated/` (fresh `generate.mjs` run) | Installer fragments | ✓ [VERIFIED: `generated/branding` + `generated/installer` exist] | — | `node scripts/generate.mjs` |
| NSIS/`makensis` on this host | PKG-01 NSIS path | ✗ (not installed; nixpkgs has 3.12) | 3.12 via `nix shell nixpkgs#nsis` | Provision in first packaging task |
| Windows host + SDK | MSIX build/sign + Windows matrix | ✗ | — | Agent-driven VM (no fallback — MSIX cannot build on Linux) |
| macOS host | DMG build + macOS matrix | ✗ | — | Agent-driven VM (no fallback — `hdiutil` is macOS-only) |
| Static HTTPS host | MAR/update.xml serving | ✗ | — | `mach update serve` / `python3 -m http.server` for local hops; production host later |
| `nix develop .#firefox` toolchain | Tier-3 builds (updater flip, release) | ✓ (precedent: all v1.0 builds) | Per `toolchain-baseline.txt` | — |
| Signing certs (prod) | Production installers | ✗ | — | Test-signing for phase proofs (Open Question 1) |

**Missing dependencies with no fallback:** Windows host, macOS host (both require provisioning; planner's first packaging plan must name them).
**Missing dependencies with fallback:** NSIS (`nix shell`), static host (local serve loop), prod certs (test-sign).

## Validation Architecture

> Included: `workflow.nyquist_validation` is `true` in `.planning/config.json` (absent would also mean enabled; here explicitly enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `verify-platform.sh` registry (bash + Node asserts, each with `--self-test` twin) + headless BiDi harness |
| Config file | `scripts/verify-platform.sh` (`CHECKS` array); no separate config |
| Quick run command | `scripts/verify-platform.sh --quick` (no build/browser/display; commit gate) |
| Full suite command | `scripts/verify-platform.sh` (needs builds, browser, display); `scripts/verify-platform.sh --gate` adds ledger-backed exclusions |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAME-01 | Canonical value on every display surface incl. built artifacts | unit (static) + tier-3 (runtime) | `verify-platform.sh --only branding-preflight` / `--only verify-branding-identity` (+ release variant after BLD-01) | ✅ verifiers exist; ❌ Wave 0: canonical-form fixture + re-pinned comparands |
| PKG-01 | NSIS compiles; MSIX/DMG build on real hosts | unit (schema, exists ✅) + manual/host (new) | `verify-platform.sh --only installer-schema` ✅; new `installer-build-proof` full-mode row ❌ Wave 0 | ❌ Wave 0: build-proof row + self-test |
| PKG-02 | N→N+1 MAR hop per OS, zero Mozilla update hosts | host/launch (new) | new `mar-update-hop` full-mode row + endpoints layer-3 negative proof ❌ Wave 0 | ❌ Wave 0 |
| PKG-03 | BUILD.md procedure; WR-04/WR-07 red-before-green | unit (self-tests) | `generate --self-test` (new bare-$ plant), `installer-schema-self-test` (new divergent-manifest plant) | ❌ Wave 0: both plants |
| BLD-01 | `objdir-release` build + release rows green | tier-3 build + unit | `verify-branding-identity-release`, `branding-variant-divergence` (exist ✅, blocked on build) | ✅ rows exist; ❌ the build itself |
| UPD-03 | Rebase drill green on next tag | operator drill | `rebase-upstream.sh --tag <NEW>` + full `--quick` over rebased tree + installer-schema | ✅ tooling exists; blocked on next ESR tag |
| SEC-02 | `registerWindowActor` outside boundary file fails | unit (static) | `check-internals-boundary.sh --self-test` (new plant) | ❌ Wave 0: one plant |
| SHELL-01 | URL-context selected, not `contexts[0]` | unit/launch | BiDi two-context selection assert (new) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `scripts/verify-platform.sh --quick`
- **Per wave merge:** full `scripts/verify-platform.sh` where hosts/builds exist; otherwise `--quick` + named staged drills
- **Phase gate:** per-OS matrix + MAR hop green before `/gsd-verify-work` (STATE.md standing instruction defers verification to roadmap end unless a real problem needs human help — record accordingly, keep going)

### Wave 0 Gaps
- [ ] Canonical-form downstream fixture (`display_name = "PowerBrowser"`) — covers NAME-01 no-space emission
- [ ] `generate --self-test` bare-`$VAR` plant (WR-04) — covers PKG-03
- [ ] `installer-schema --self-test` divergent-manifest plant (WR-07) — covers PKG-03
- [ ] `installer-build-proof` row + self-test (synthetic `dist/` fixture) — covers PKG-01
- [ ] `mar-update-hop` row + self-test (mock MAR + `update.xml`) — covers PKG-02
- [ ] `check-internals-boundary.sh --self-test` `registerWindowActor` plant — covers SEC-02
- [ ] BiDi URL-context selection assert — covers SHELL-01
- [ ] Named Windows + macOS packaging hosts (or provisioning task) — covers PKG-01/02 matrix

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No new auth surface (update channel integrity is V6/V10, not credential auth) |
| V3 Session Management | No | No session state touched |
| V4 Access Control | Yes | SEC-02: `registerWindowActor` added to `FORBIDDEN_PATTERNS` — chrome-privileged actor registration stays inside `PowerBrowserAPI.sys.mjs` with catalogue rows |
| V5 Input Validation | Yes | WR-04: generator-time rejection of NSIS-unemittable values (`$`, `"`, CR/LF/NUL); XML sink guard for plist/appx fields |
| V6 Cryptography | Yes | MAR signature verification posture (`--enable-unverified-updates` scope + fork-key/hash-pin decision); MSIX Authenticode test-sign vs prod cert; DMG signing/notarization decision |
| V10 Malicious Code / Update Integrity | Yes | PKG-02: MARs consumed only from fork `update.xml` via `AppUpdateURL`; `update.xml` hash-pinned generation; zero-Mozilla-host negative proof |

### Known Threat Patterns for NSIS/MAR stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious update server (MAR substitution) | Tampering / Spoofing | Fork-key MAR signing + HTTPS + hash-pinned manifests; `AppUpdateURL` machine-scope policy so user-profile malware can't repoint it |
| Installer define injection (`$VAR`, quotes, newlines) | Tampering | WR-04 sink guard at emission; schema gate asserts non-empty defines |
| Maintenance-service cert pin staleness | Elevation of privilege | Record pin story with the signing decision; re-verify on each ESR rebase (drill includes installer-schema green) |
| Unsigned-installer SmartScreen/Gatekeeper bypass training | Social engineering | Document expected publisher/friction in BUILD.md procedure; prod-cert decision tracked (Open Question 1) |
| Profile/remoting hijack via alongside install | Spoofing | Frozen identity fields + alongside-Firefox interleaved matrix test (Pitfall 6) |

## Sources

### Primary (HIGH confidence — authoritative source + live-tree confirmation)
- Pinned `upstream/` checkout at `FIREFOX_153_1_0esr_RELEASE` — `browser/installer/windows/nsis/installer.nsi` + `defines.nsi.in`, `tools/update-packaging/`, `build/moz.configure/update-programs.configure:28-55`, `python/mozbuild/mozbuild/repackaging/{msix,dmg,installer,mar}.py`, `python/mozbuild/mozpack/dmg.py`, `mach_commands.py` repackage usage, `policies-schema.json:139` + `Policies.sys.mjs:300` (`AppUpdateURL`) — read directly this session
- Firefox Source Docs: "Setting Up An Update Server" + "Application Update Debugging" (MAR build/serve/policy flow, `mach update serve`, `make_full_update.sh` invocation)
- Local tree: `scripts/generate.mjs` (NSIS guard :873, emitters :2782-2930, TARGETS :2960+, mozconfig emitter :1169-1190, self-test :3905+), `scripts/verify-installer-schema.mjs` (WR-07 site :288-292), `scripts/check-internals-boundary.sh` (FORBIDDEN_PATTERNS :36-56), `scripts/lib/firefox-bidi.mjs` (:282-289, :356-382), `scripts/verify-platform.sh` (:4363-4373 gate exclusions), `configuration.toml:38`, `inventory/brand-tokens.json:73-109`, `.mozconfig:8`, `docs/BUILD.md` (tier-3 table, rebase procedure), `WINDOWS.md:30-31`, `NEXT-MILESTONE-INPUTS.md`, v1.1 `SUMMARY.md`/`ARCHITECTURE.md`/`PITFALLS.md`/`STACK.md`/`FEATURES.md`, `03-REVIEW.md` + `03-VERIFICATION.md` (WR-04/WR-07 substance)

### Secondary (MEDIUM confidence — official project sources via web)
- nixpkgs `pkgs/by-name/ns/nsis/package.nix` (nsis 3.12, unix platforms, `makensis` mainProgram) + mynixos package page — via WebSearch [CITED]
- Bugzilla Bug 1468948 (`app.update.url` default-branch-only semantics) + Bug 1469943 (`AppUpdateURL` policy, FF63/ESR60.2) — via WebSearch [CITED]
- Mozilla `policy-templates` #655 (custom-update-URL operational thread: machine-scope requirement, full-MAR guidance) — via WebSearch [CITED]

### Tertiary (LOW confidence)
- None relied upon. Every load-bearing claim is tree-verified or officially documented; the five residual unknowns are fenced in the Assumptions Log with falsification tests (first Nix NSIS compile, first Linux MAR hop) rather than asserted.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — NSIS-in-nixpkgs and MSIX/DMG host requirements both confirmed against the pinned tree's own code paths plus official docs; only per-host versions await provisioning
- Architecture: HIGH (as-is: every path read live) / MEDIUM (to-be: updater-flag flip + MAR hop unexecuted — flagged as the phase's first falsification test)
- Pitfalls: HIGH — tree-derived sites with exact line refs; web sources cross-checked against tree behavior
- NAME-01 inventory: HIGH — every gate enumerated with file:line and current pinned value quoted verbatim
- WINDOWS #13/#14: HIGH — fix directions pre-written in-tree (`verify-gui01-window.mjs:177-178`, `firefox-bidi.mjs` helper already exported)

**Research date:** 2026-09-04
**Valid until:** ~30 days (ESR 153 line + NSIS 3.12 are slow-moving; re-check nixpkgs `nsis` version and the ESR tag list if planning slips past the next ESR release)
