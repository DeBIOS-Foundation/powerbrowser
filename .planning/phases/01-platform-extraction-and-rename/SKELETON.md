# Walking Skeleton — Power Browser

**Phase:** 1
**Generated:** 2026-08-30

## Capability Proven End-to-End

A user runs `objdir/dist/bin/powerbrowser` on Linux and gets a **Power Browser**-branded
application window that loads a real web page — built from an `upstream/` that a script
re-fetched (never copied), patched by a 3-way-merge-verified patch stack, with every branding
value a hand-written literal and **no generator anywhere in the tree**.

The skeleton is not one plan. It spans Plans 01→04:

| Plan | Skeleton contribution |
|---|---|
| 01-01 | The platform tree exists in this repo; the rename machinery is proven end-to-end on one coupled chain |
| 01-02 | Every internal identifier resolves in its fixed platform form; the residual scan is green |
| 01-03 | Every user-visible branding literal is hand-written and cross-checked before the build |
| 01-04 | `upstream/` re-fetched → patched → **built** → launched → branded, loading a web page |

Plans 05–07 are expansion slices on top of this skeleton (GUI-01, GUI-02, user-facing copy).

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Substrate | Firefox ESR `153.1.0esr`, tag `FIREFOX_153_1_0esr_RELEASE`, `--depth 1` clone into gitignored `upstream/` | Zen-style patch-set repo. Inherited from sourcerer, migrating unchanged. `upstream/` is never committed and never copied (MIG-01). |
| Own-tree layout | `powerbrowser/` at repo root, reached from inside Gecko via a git-excluded `upstream/powerbrowser` symlink | Gecko is never modified. Every chrome-side file lives outside `upstream/`. The symlink is a four-way coupling (fetch script, `.git/info/exclude`, patch `020`, `.mozconfig`). |
| Patch discipline | Two patches only, `010-powerbrowser-identity.patch` + `020-powerbrowser-shell.patch`, chained by blob hash (`010`'s post-image is `020`'s pre-image) | `git apply --3way` degrades into a silent no-op when the `index` hashes are invalid. Patches are re-derived from a patched tree, never text-edited. |
| Identity tier | Compiled defines: `MOZ_APP_VENDOR=DeBIOS`, `MOZ_APP_BASENAME/REMOTINGNAME=powerbrowser`, `MOZ_APP_DISPLAYNAME="Power Browser"` | Product identity is a compile-time property in Gecko. Artifact builds cannot produce a renamed binary; tier-3 `./mach build` is the only path. |
| Fixed internal identifiers | `powerbrowser/` tree · `@powerbrowser/*` npm scope · `PowerBrowserAPI.sys.mjs` · `chrome://powerbrowser/` · `POWERBROWSER_*` env vars · `@powerbrowser.org/single-instance-clh;1` · category `a-powerbrowser` · window type `powerbrowser:main` | These never vary per downstream (MIG-03). Only user-visible surfaces become configurable in Phase 2+. |
| Anti-corruption layer | One file — `powerbrowser/shell/PowerBrowserAPI.sys.mjs` — is the sole toucher of Firefox internals; every touch catalogued in `powerbrowser/INTERNAL-APIS.md`, enforced by `scripts/check-internals-boundary.sh` | Inherited hard rule. A second module using `Ci.` / `ChromeUtils` under `powerbrowser/shell/` fails the boundary guard. |
| Sidecar | Eclipse Theia `1.74.1` consumed as npm dependencies; four `@powerbrowser/*` extensions (`branding`, `customize`, `tab-uris`, `token-gate`) compose the app | Theia core is never forked or patched. Adopting a Theia release is a re-pin. |
| Startup window | Chosen by the `a-powerbrowser` `nsICommandLineHandler`, not by a compiled `BROWSER_CHROME_URL` override (Plan 05, spike-gated per D-20) | `BROWSER_CHROME_URL` is upstream's "am I the main browser window" identity test in five places. Overriding it structurally degrades any real browser window (no Ctrl+L, no modal dialogs) and welds Theia to full-window presentation (GUI-04). |
| Toolchain | Nix flakes, `flake.lock` migrated **verbatim** (nixpkgs rev `ffb3c9b700e759be2ef13237c9d8f953b32a1e46`); two devShells (`.#firefox`, `.#theia`) | Verbatim migration is what makes MIG-01 reproducible. Do not re-lock in Phase 1. |
| Test posture | No test framework. Self-contained, self-testing bash + Node ESM scripts under `scripts/` | Inherited and deliberate. Every script carries a `--self-test` that plants a fixture and asserts the guard both rejects it and names it. Phase 6 rewrites verification; Phase 1 carries it across intact with new names. |
| Branding source | **Hand-written literals only.** No generator, no `configuration.toml`, no `generated/` directory | Binding roadmap constraint: Phase 2's acceptance test is that generated output is byte-identical to what Phase 1 wrote by hand. A generator in Phase 1 destroys that test. |
| Repo path | `/home/chris/coding/Power-Browser` — must contain no space character | `pkgs.mkShell` appends an rpath to space-separated `NIX_LDFLAGS`; a space makes the cc-wrapper split on it and every native link step fails. This is also why `MOZ_APP_VENDOR` is `DeBIOS` and not `DeBIOS Foundation` (the vendor string forms the profile path, lowercased, unstripped). |

## Stack Touched in Phase 1

- [ ] **Project scaffold** — the platform tree imported as a fresh snapshot from `sourcerer@bce68bb468e4dc160da8c9e238e030a400b806f8`, plus `flake.nix`/`flake.lock`, `.mozconfig`, `toolchain-baseline.txt`, and the `scripts/` guard set (Plan 01)
- [ ] **Routing** — the `a-powerbrowser` command-line handler and the `chrome://powerbrowser/` chrome package registered through `jar.mn` + `components.conf` + `moz.build` (Plan 02); the Theia-side URI-scheme registry (`TabUriRegistry`) surviving unchanged (Plan 06)
- [ ] **Real read AND real write** — `scripts/fetch-upstream.sh` writes a fresh `upstream/` clone and the `upstream/powerbrowser` symlink + `.git/info/exclude` entry; `scripts/apply-patches.sh` reads back every `+++ b/` blob hash to prove the patch was non-vacuous (Plan 04)
- [ ] **UI wired to the backend** — the shell window paints its loading layer, `TheiaService.sys.mjs` spawns the Node backend with `POWERBROWSER_TOKEN`, waits for the `POWERBROWSER_BACKEND_READY` stdout sentinel, health-probes port 3000, sets the token cookie, and swaps the remote `<browser>` to the Theia frontend (Plan 04)
- [ ] **Deployment** — documented local full-stack run: `nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach build'` then `objdir/dist/bin/powerbrowser`, verified by `scripts/smoke-firefox.sh` + `scripts/smoke-theia.sh` + `node scripts/verify-branding-identity.mjs` (Plan 04)

## Out of Scope (Deferred to Later Slices)

Explicit, so no later phase re-litigates Phase 1's minimalism:

- **Any generator, any `configuration.toml`, any `generated/` directory** — Phase 2. Phase 1 hand-writes every branding value on purpose.
- **Icon rasterization pipeline, installer branding for Windows/macOS** — Phase 3 (GEN-02, GEN-03). Phase 1 hand-produces five PNGs from one SVG.
- **Theia-side branding driven by frontend config keys, declared extensions, telemetry** — Phase 4.
- **Stripping brand *values* out of `patches/*.patch` into `include()` hooks** — Phase 5 (MIG-05). Phase 1 only swaps Sourcerer literals for Power Browser literals inside the patches.
- **The boundary-matched static brand-literal scan as a general downstream gate** — Phase 6 (VER-01). Phase 1's `scan-brand-residue.mjs` is scoped to Sourcerer residue only.
- **`PB_CONFIG_DIR`, external config repos, adversarial fixtures** — Phase 7.
- **Unified tab strip / chrome-owned tab model / `@powerbrowser/browser-bridge`** — v2 (GUI-05). Phase 1 only guarantees nothing welds Theia to full-window presentation (GUI-04).
- **A real logo** — D-11 ships an original placeholder geometric mark; the real one is a pure asset swap.
- **Custom default homepage and search engine** — D-14 keeps stock Firefox defaults; revisit when `[urls]` lands in Phase 2.
- **Custom browser chrome of any kind** — no tab strip, toolbar, or address bar is authored. GUI-01 opens a *stock* `browser.xhtml`.

## Subsequent Slice Plan

Each later phase adds one vertical slice without altering the decisions above:

- **Phase 2** — a downstream author expresses their whole brand in `configuration.toml` + `brand/`, and the generator reproduces Phase 1's hand-written files byte-for-byte.
- **Phase 3** — every Gecko-side branding surface (branding dir, five icon sizes, installer fields) is materialized from the manifest.
- **Phase 4** — every Theia-side surface (welcome, about, product name, logo, theme, extensions, telemetry) is driven by the manifest with no TypeScript recompile.
- **Phase 5** — patches carry no brand values; adopting an upstream ESR release is one pin edit.
- **Phase 6** — the build proves its own branding correctness for any downstream, and a stranger has `docs/REBRANDING.md`.
- **Phase 7** — Sourcerer is reproduced as a pure downstream from its own repo, alongside adversarial fixtures.
