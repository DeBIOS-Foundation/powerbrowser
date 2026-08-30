# Building PowerBrowser

This documents the commands that actually built and ran both halves of
PowerBrowser on the reference NixOS host, with the durations actually measured
there. It does not describe the patch-stack tree, artifact builds, or a
rebase procedure — those land in Phase 3.

## Prerequisites

- NixOS (or any host with Nix flakes enabled — `experimental-features =
  nix-command flakes`).
- ~30 GB free disk and 8 GB RAM for the Firefox half (a full non-artifact
  compile peaks around 14 G of `objdir/`, on top of the ~5.6 G `upstream/`
  checkout).
- **The repository must live at a path with no space character.**
  `pkgs.mkShell` appends an rpath to the space-separated `NIX_LDFLAGS`
  environment variable; a space in the checkout path makes the cc-wrapper
  split that variable on the space and every native link step fails. Both
  the Firefox compile and Theia's `node-gyp` native modules drive that same
  linker, so this is not a Firefox-only caveat — clone somewhere like
  `~/coding/powerbrowser`, never under a directory such as `~/My Projects`.

Nothing else needs installing by hand. Both `nix develop` shells below
supply their entire toolchain; there is no `mach bootstrap` step and no
separate Node/Yarn/Rust install (D-18).

## Theia half

The app composes the frozen 49-`@theia/*`-package daily-drivable set
(Phase 2 D-19) — 11 packages proved the build in Phase 1; every package
that was ever going to ship is now in the tree.

```
nix develop .#theia
cd theia
yarn install --ignore-scripts --frozen-lockfile
(cd node_modules/drivelist && node-gyp rebuild)
yarn build
yarn start
```

Then open **http://localhost:3000** (`127.0.0.1:3000`) — that is the port
`theia start` actually binds; do not assume it moved. `yarn start`
(`applications/browser`'s own script) also sets two environment variables
explicitly before invoking `theia start` — see "Environment variables the
start script sets", below.

Why `--ignore-scripts` plus one explicit rebuild, not a plain `yarn
install`: this was a deliberate decision, re-audited at 49 packages after
first being decided at 11 (Phase 1). **Re-run at 49 packages (Phase 2
Plan 04):** the transitive tree is now 1,058 packages deep (depth ≤ 3,
`@theia/plugin-ext` alone adds roughly 38 direct dependencies), of which
**7** carry an `install`/`preinstall`/`postinstall` script — `@parcel/
watcher`, `drivelist`, `esbuild`, `keytar`, `msgpackr-extract`, `node-pty`,
`puppeteer`. **`drivelist` remains the only load-bearing one** — version
12.0.2 ships no prebuilt binary, and `@theia/core` requires its compiled
`.node` at backend boot, unconditionally, on every target. The other six
are not load-bearing under `--ignore-scripts`:

- `node-pty`, `@parcel/watcher`, `msgpackr-extract` and `esbuild` each
  resolve their native binary through a platform-gated **optional
  dependency package** (e.g. `@esbuild/linux-x64`,
  `@parcel/watcher-linux-x64-glibc`) that Yarn Classic already installs
  for the matching host — the same mechanism `@vscode/ripgrep` uses (see
  below). Their own `install`/`postinstall` script is a fallback path for
  when no prebuilt platform package matches; it never runs here because
  one already did.
- `keytar` is Electron/OS-credential-store tooling; a browser-target app
  never loads it, matching Phase 1's original finding.
- `puppeteer` is `@theia/cli`'s own dependency (used by `theia test`, which
  this project never runs), and its postinstall would download a Chromium
  binary — exactly the class of unaudited network fetch `--ignore-scripts`
  exists to prevent.

Running every package's install script unaudited is unnecessary attack
surface; skipping the one script that is actually load-bearing breaks the
app at boot. Do not "simplify" this back to a bare `yarn install`.

If `yarn.lock` were absent you would drop `--frozen-lockfile`, but it is
committed, so every install reproduces the exact same tree.

**What `theia rebuild:browser` (invoked internally by `yarn build`)
actually prints, verified at 49 packages:** a single generic line, `native
node modules are already rebuilt for browser` — not a per-module skip
list. Reading `@theia/application-manager`'s `rebuild.js` explains why:
the command only does per-module work (backing up/reverting cached native
builds under a `.browser_modules` cache directory) when reverting a
previous **electron-target** rebuild. This project never builds an
electron target, so that cache is never populated and the command always
takes the trivial "already rebuilt" branch, at any package count. Correct
Phase 1's documented expectation here: the four-name list
(`native-keymap`, `find-git-repositories`, `drivelist`, `keytar`) was
never something this command literally prints for a browser-only app; it
described which native modules are *browser-inapplicable in principle*,
not the command's actual log output.

**`@vscode/ripgrep`** (first enters the tree here, via
`@theia/file-search`): at the pinned resolution (`1.18.0`) it has **no
scripts field at all**. It ships 12 `os`/`cpu`-gated platform binary
packages as `optionalDependencies` (e.g. `@vscode/ripgrep-linux-x64`), and
Yarn Classic already skips every one that doesn't match the host, so only
the matching package installs. **No install-time gate applies to
`@vscode/ripgrep`** — `--ignore-scripts` does nothing for it because there
is no script to skip. Do not add a no-op gate for it. If avoiding the
prebuilt `rg` binary blob is ever made policy, the only lever is a
post-install file swap of the resolved platform package (or the resolved
`rgPath` module output) for the Nix-store `rg` binary — `rgPath` is a
module-level constant import, not DI-injectable or preference-driven, so
there is no rebind seam. That is optional hardening, out of scope here.

**No bundled VS Code extensions.** The app ships `@theia/plugin-ext`,
`@theia/plugin-ext-vscode` and `@theia/vsx-registry` — the extension-host
machinery and the runtime installer — but no `theiaPlugins` manifest block
and no `theia download:plugins` step. A user installing extensions at
runtime through the Open VSX connection is the only plugin-acquisition
path this project needs; do not add a bundling step unless a future phase
decides to ship default extensions.

**Environment variables the `start` script sets.** `applications/browser`'s
`start` script exports two variables explicitly, rather than relying on
Theia's defaults, before invoking `theia start`:

- `VSX_REGISTRY_URL=https://open-vsx.org` — explicit so that repointing at
  PowerBrowser's own registry mirror (R9, post-4.0) is a config change, not a
  code change.
- `THEIA_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/powerbrowser"`, with a
  `mkdir -p` run first — Theia never creates the config directory on this
  branch, and an absent directory leaves the config-dir file watch stuck in
  a 500 ms `fs.stat` poll loop with no hot reload (load-bearing for the
  customization layer's hot reload).

Phase 2 owns both only for `yarn watch`/`yarn start`. Phase 4's Firefox
supervisor takes over setting both permanently on the sidecar spawn.

**Measured on the reference host, re-measured at 49 packages (Phase 2 Plan
04):** a cold run (`node_modules` absent, Yarn's own package cache already
warm from repeated installs earlier this session — not a network-cold
measurement) of the full sequence above (install + drivelist rebuild +
build + boot, via `scripts/smoke-theia.sh`) took **23.4s**; a warm run
(`node_modules` present, `--frozen-lockfile`, no dependency changes)
took **18.1s**. Both numbers moved up from Phase 1's 11-package figures
(70s cold, 11.9s warm) — expected, given `@theia/plugin-ext` alone adds
roughly 38 direct dependencies to resolve, link and bundle. The cold
figure here is not directly comparable to Phase 1's: Phase 1's 70s
included real network package fetches on a cold cache, while this run's
Yarn package cache was already warm from this session's prior installs.
Treat 23.4s as a lower bound for a genuinely cold-cache cold run, not as
the number a first-time contributor should expect.

## Firefox half

```
./scripts/fetch-upstream.sh
nix develop .#firefox
cd upstream
MOZCONFIG=../.mozconfig ./mach build
MOZCONFIG=../.mozconfig ./mach run
```

`scripts/fetch-upstream.sh` runs directly from the repo root — it only
needs `git`, which the host already provides, so it is not run inside
either `nix develop` shell. It is safely re-runnable: if `upstream/`
already exists at the pinned tag it no-ops instead of re-cloning.

**Measured on the reference host:** the clone took 438s and produced a
5.6 G `upstream/` tree. A full non-artifact `./mach build` (the phase's
acceptance proof — this is not an artifact build, see D-11/D-12) took
3224s (~54 minutes) wall time on 16 cores / 62 GB RAM, peaking at 14 G of
`objdir/`. Expect similar order-of-magnitude numbers; do not be surprised
if a first-time contributor's build takes an hour. The resulting binary
reports `Mozilla Firefox 153.1.0esr` via `./mach run --version`.

`nix develop .#firefox` supplies the entire compiler toolchain (clang,
rustc, cargo, cbindgen) matched to what nixpkgs itself builds this exact
Firefox version with — there is no separate toolchain setup step to run
before `./mach build`.

## Tiered rebuild loop (D-70, D-73)

BUILD-04 is not "run a full compile every time" — it is three tiers, each
with a distinct rebuild cost, selected by what kind of file changed. All
three timings below were **re-measured on this host (`legion`), 2026-08-22**
— none are carried over from research or from a prior phase (D-73 exists
precisely because Phase 2 once carried forward a `docs/BUILD.md` "measured"
figure that was never measured). Where a re-measured figure differs from a
number research or planning inherited, that is stated explicitly here, not
silently replaced.

### Tier 1 — no build (`./mach run`)

For any file that is a **symlink from `objdir/dist/bin` into `upstream/`** —
every `.js`, `.ftl`, and branding PNG — editing the source and re-running is
free: `./mach run` is registered `category="post-build"` and never builds.

Research recorded 7450 of 7784 `objdir/dist/bin` entries as such symlinks.
Re-measured this session (files + symlinks only, directories excluded from
both counts, via `find objdir/dist/bin -type f -o -type l` and
`find objdir/dist/bin -type l -exec readlink -f {} \;` filtered to paths
under `upstream/`): **7163 of 7766** — fewer in both the numerator and the
denominator than the inherited figure. This build actually has that ratio,
not the quoted one; the difference is plausibly the branding/pref/policy
files plans `03-01`/`03-03`/`03-05` added since research ran, but the new
count is reported as measured, not reconciled against a guess.

Verified live: edited `upstream/toolkit/components/thumbnails/PageThumbs.worker.js`
(a `.js` file `objdir/dist/bin/modules/PageThumbs.worker.js` symlinks to),
confirmed the appended line was visible through the symlink with zero build
step, then restored the file to its exact original content (`md5sum` matched
before and after the edit). Timed the tier's cost:

```
MOZCONFIG=../.mozconfig ./mach run --version
```

(run inside `nix develop .#firefox`, cwd `upstream/`) — **1.05s** wall
(mach's own per-process timer printed `0:00.73`; the wrapper's stopwatch,
which also includes shell-entry overhead, measured 1052ms). Measured 2026-08-22
on `legion`.

After restoring the edited file, `git -C upstream status --porcelain` and a
fresh `bash scripts/fetch-upstream.sh` (exit 0) confirmed the tree returned to
exactly the expected-dirt state `scripts/fetch-upstream.sh` accepts — no
residual tier-1 edit.

### Tier 2 — `./mach build faster`

For a **preprocessed frontend file** — one `moz.build` compiles via `PP_FILES`
rather than installing as a plain symlink — a build is required, but only the
fast, non-compiling `faster` tier. Forced this by updating a real preprocessed
file's modification time only, changing no content:

```
touch upstream/browser/base/content/browser.xhtml
```

(`browser/base/content/browser.xhtml`, the canonical preprocessed
browser-window document, is the file this tier is measured against.) `touch`
changes no content — `git -C upstream diff --stat -- browser/base/content/browser.xhtml`
stayed empty before and after every run below, so CLAUDE.md's
never-modify-Gecko rule is not touched by this measurement, only its
modification time is. Timed:

```
MOZCONFIG=../.mozconfig ./mach build faster
```

(inside `nix develop .#firefox`, cwd `upstream/`), run twice (re-`touch`ing
before each), since the first run after a cold objdir is not representative —
it also pays mach's own one-time "build" virtualenv-site creation cost.
Invocation 1 (cold, includes that one-time cost): mach-reported wall time 20s.
Invocation 2 (warm): mach-reported wall time **1.84s** (`0:01.84` marker); a
third warm run confirmed **1.83s**. Both measured 2026-08-22 on `legion`. The
warm figure — **1.84s** — is the one to use for this tier, not the 2.55s
research inherited: D-73 forbids carrying that number forward, and the two are
close but not the same measurement.

### Tier 3 — full `./mach build`

Trigger: a change to a **compiled define** — in this repo that means editing
`patches/010-powerbrowser-identity.patch` (the one Gecko patch hunk this phase
carries) or adding a `--with-*`/`--enable-*` option to `.mozconfig`. Neither
happened as part of this measurement task; the phase's build budget is
exactly two full builds, both already spent by the two compiled-define
changes below, harvested here rather than re-run:

| Build | Command | Wall time | sccache hit rate | Source |
|---|---|---|---|---|
| #1 (dev, `objdir/`) | `MOZCONFIG=../.mozconfig ./mach build` | **2368s (~39m28s)** | not recoverable — the sccache server that ran this build had already recycled by the time its stats were checked in the same session (`03-01-SUMMARY.md`, "Issues Encountered") | `03-01-SUMMARY.md` |
| #2 (release, `objdir-release/`) | `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding/release MOZCONFIG=../.mozconfig ./mach build` | **2822s (~47m2s)** | **0.14%** — 5648 new sccache requests this build's delta, 5043 executed, 7 hits, 5022 misses | `03-05-SUMMARY.md` |

Neither build is re-run here — doing so would spend a third full compile,
which this phase's stated build-cycle budget does not allow; both figures are
taken verbatim, with their exact commands, from the SUMMARY that actually ran
them. Both builds were measured 2026-08-21 on `legion`: build #1 per
`03-01-SUMMARY.md`, build #2 per `03-05-SUMMARY.md`.

### The three tiers, at a glance

| Tier | Example file in this tree | Command | Measured cost |
|---|---|---|---|
| 1 — no build | `objdir/dist/bin/modules/PageThumbs.worker.js` (symlink into `upstream/toolkit/components/thumbnails/PageThumbs.worker.js`) | `MOZCONFIG=../.mozconfig ./mach run --version` | 1.05s (2026-08-22, `legion`) |
| 2 — `./mach build faster` | `upstream/browser/base/content/browser.xhtml` (preprocessed) | `MOZCONFIG=../.mozconfig ./mach build faster` | 1.84s warm (2026-08-22, `legion`) |
| 3 — full `./mach build` | `patches/010-powerbrowser-identity.patch` (or any `--with-*`/`--enable-*` `.mozconfig` option) | `MOZCONFIG=../.mozconfig ./mach build` | 2368s / 2822s (2026-08-21, `legion`) |

**A file that is neither symlinked into `dist/bin` nor preprocessed falls
through to tier 3** — a full `./mach build` — because there is no faster path
the build system exposes for it; the tier a file belongs to is a property of
how `moz.build` installs it (`FINAL_TARGET_FILES` symlink vs. `PP_FILES`
preprocessing vs. a compiled source the linker consumes), not a menu choice.

**Accepted cost, per D-70:** a clean clone has no minutes-to-runnable path —
the first build is always a full compile (tier 3, ~54 minutes per the
original research estimate; this phase's own two full builds ran 2368s and
2822s). Artifact builds cannot produce a renamed binary (C-1: `MOZ_APP_NAME`
is a compiled define and the Taskcluster job configuration hardcodes
`product="firefox"`), so there is no faster path to a first, PowerBrowser-branded
binary than tier 3.

## The compiled-file boundary (D-72)

`scripts/check-patch-surface.sh` is the single source of truth for which file
types a patch in `patches/*.patch` may touch. It rejects any patch whose
target path ends in one of the compiled suffixes drawn from
`upstream/python/mozbuild/mozbuild/frontend/emitter.py:1126-1133` — `.c .cc
.cxx .cpp .h .hh .hpp .inc .m .mm .rs .s .S .asm .webidl .idl .ipdl .ipdlh`,
plus any `Cargo.*` file — reading each patch's own `+++ b/` header lines, never
grepping the patch body (a body-grep would false-match a string that merely
appears inside changed content).

Two invocations:

```
bash scripts/check-patch-surface.sh              # scans patches/, exits 1 on any offense
bash scripts/check-patch-surface.sh --self-test   # plants a throwaway compiled-file patch in a mktemp dir and asserts it IS rejected
```

**Tier consequence:** a patch that touches a compiled file means every
subsequent rebuild is tier 3 (a full `./mach build`, ~2368-2822s measured
above) — there is no tier-1/tier-2 path for a change the linker has to see.
This is the entire reason the phase's one Gecko patch
(`patches/010-powerbrowser-identity.patch`) is confined to a single hunk in
`browser/moz.configure`, a config file, not a compiled source.

Deliberately **not created**: `powerbrowser/ARTIFACT-BOUNDARY.md` (the name
presumes artifact builds, which D-70 replaced with the tiered loop — this
section of `docs/BUILD.md` is the boundary's home instead) and
`powerbrowser/INTERNAL-APIS.md` (that catalogues `PowerBrowserAPI.sys.mjs`
touchpoints, none of which exist until Phase 4).

## Endpoints and the one carve-out (D-83–D-88)

`powerbrowser/endpoint-allowlist.json` is the single machine-readable source of
truth for every host and pref this build's network/telemetry surface is
allowed to touch, read directly by `scripts/verify-endpoints.sh`'s layers 1
and 3. Any host observed at runtime absent from this file, or any host in it
with disposition `deny`, is a failure — Mozilla or not (D-85).

**The one carve-out, stated plainly:** `firefox.settings.services.mozilla.com`
(Remote Settings) stays on. Its polling cadence is
`services.settings.poll_interval` = **86400 seconds (24 hours)**
(`modules/libpref/init/all.js:1745`) — not the shorter, sometimes-quoted
figure of 21600 seconds, which belongs to `app.normandy.run_interval_seconds`,
a subsystem this phase compiles out (`imply_option("MOZ_NORMANDY", False)`)
and is therefore moot. The reason
Remote Settings cannot simply be turned off: `services/settings/Utils.sys.mjs:52-84`
refuses any `services.settings.server` override off Nightly, and the only
alternative, the `DisableRemoteSettingsAndAcceptSecurityConsequences` policy,
also stops CRLite certificate-revocation data, intermediate-certificate
preloading, and tracking-protection list updates — unacceptable on a substrate
whose entire pitch is that it is a real browser.

Every host in `powerbrowser/endpoint-allowlist.json` with disposition `allow`,
and why:

| Host | Reason |
|---|---|
| `firefox.settings.services.mozilla.com` | D-83: Remote Settings, the carve-out above |
| `content-signature-2.cdn.mozilla.net` | D-83, same feature: content-signature certificate-chain verification for Remote Settings collections |
| `firefox-settings-attachments.cdn.mozilla.net` | D-83, same feature: Remote Settings' attachment CDN (CRLite's own data, one of D-83's own reasons to keep Remote Settings on) |
| `edgedl.me.gvt1.com` | D-86: Google's Widevine CDM download host — DRM stays working, no Mozilla host involved; `media.eme.enabled` defaults false on Linux so this costs nothing unattended |
| `safebrowsing.google.com` | D-85: Google Safe Browsing v2 API — deliberate waiver, malware/phishing protection stays on |
| `safebrowsing.googleapis.com` | D-85: Google Safe Browsing v4 API — same waiver as v2 |
| `update.googleapis.com` | D-86 extension: Widevine's Chromium-Omaha update-check host, fired by the same periodic AddonManager timer regardless of `media.eme.enabled` — corrects C-4's premise that Widevine is fully idle-gated (it is idle-gated for the EME-toggle path, not this periodic path) |
| `www.google.com` | D-86 extension: the Omaha check's own redirect target, observed immediately after `update.googleapis.com` in the same session |
| `dl.google.com` | D-86 extension: a second real redirect target in the same Widevine Omaha update-check flow, surfaced during this plan's own phase-gate close-out run — the redirect response names a different Google-owned download host between runs; same waiver category as `www.google.com`, not a new concern |

The three proof layers and their positive-control forms:

```
bash scripts/verify-endpoints.sh --layer 1                     # static pref grep
bash scripts/verify-endpoints.sh --layer 1 --positive-control   # restores a stock URL, must go red

bash scripts/verify-endpoints.sh --layer 2                     # exact-path strace on $HOME/.mozilla/firefox
bash scripts/verify-endpoints.sh --layer 2 --positive-control   # sandboxed $HOME with a real .mozilla/firefox dir, must go red

bash scripts/verify-endpoints.sh --layer 3                     # MOZ_LOG=nsHostResolver:5, 35s capture window
bash scripts/verify-endpoints.sh --layer 3 --positive-control   # re-enables OpenH264, must go red
```

`distribution/policies.json` install command, verbatim as run in
`03-03-SUMMARY.md` (a full rebuild does not produce this file, and a clobbered
objdir loses it — it must be re-copied after any clobber):

```
mkdir -p objdir/dist/bin/distribution
cp powerbrowser/distribution/policies.json objdir/dist/bin/distribution/policies.json
```

## Telling a dev build from a release build (BRAND-06)

What a person actually sees, side by side on a real desktop session: the dev
variant paints a real window title bar, reading the page title followed by
the suffixed brand name from its own `brand.ftl` (`... — PowerBrowser Dev`); the
release variant paints no title bar at all and keeps drawing tabs-in-titlebar
(client-side decorations), the same as it always did.

The two variants diverge in exactly three places:

1. `configure.sh`'s `MOZ_APP_DISPLAYNAME` (dev: "PowerBrowser Dev", release:
   "PowerBrowser") — this was already correct and machine-verified before this
   gap closed; it was never the problem.
2. The `brand.ftl` / `brand.properties` pair, per variant. `brand.ftl`'s
   `-brand-full-name` already diverged correctly; `brand.properties`'s
   `brandFullName` did not (03-REVIEW.md WR-01) — both now read the same
   suffixed/unsuffixed value within each variant.
3. The dev-only `browser.tabs.inTitlebar` default (`powerbrowser/branding/dev/
   pref/firefox-branding.js`, value `0`) — the release tree carries no such
   default, and that absence is what makes the two variants differ in window
   shape, not just in string content.

The icon sets also still differ (dev's `default*.png` carry a small
corner-badge overlay the release set does not), but the badge alone was
found insufficient for at-a-glance distinguishability on 2026-08-22 (a few
pixels at 16-32px) — this gap closure did not re-badge the icons; it added
the title-bar divergence as the primary, unambiguous cue instead.

`scripts/verify-phase-03.sh`'s `branding-variant-divergence` check is the
machine gate for both of the divergences this fix added (properties string,
titlebar default); its self-test proves it goes red if either is removed.
It cannot verify the perceptual claim itself — "tellable apart at a
glance" is a human judgment, recorded in `03-MANUAL-VERIFICATION.md`.

`branding-variant-divergence` reads the installed `brand.properties` and
`firefox-branding.js` under both `objdir/dist/bin/...` and
`objdir-release/dist/bin/...`, so it needs a full dev build **and** a full
release build (`POWERBROWSER_OBJDIR=objdir-release ... ./mach build`, Tier 3)
already in place — it runs only under `scripts/verify-phase-03.sh`'s full
mode, never under `--quick`. `--quick` still runs the check's self-test
(synthetic temp files, no build required).

All of these files (`brand.properties`, `firefox-branding.js`) are symlinked
into `dist/bin` (D-70 tier 1), so editing them and re-running needs no
rebuild.

## Rebase procedure and desktop install (D-74, D-77)

One documented command moves the fork onto a new ESR tag:

```
scripts/rebase-upstream.sh --tag <NEW_TAG> [--dry-run]
```

It fails loudly, by name, at any of: the requested tag not existing on the
remote (checked via `git ls-remote` before any clone), `fetch-upstream.sh`
failing to re-materialize `upstream/` at the new tag,
`apply-patches.sh` failing to replay `patches/*.patch` (including D-75's
non-vacuous per-patch assertion — a patch that applies as a silent no-op is a
failure, by name), `check-patch-surface.sh` rejecting the replayed stack, or
the git-excluded branding-overlay symlink (`upstream/powerbrowser`) failing to
resolve back to this repo's `powerbrowser/` directory after the rebase.

**CI story:** `.github/workflows/rebase-upstream.yml` is `workflow_dispatch`-only
(no `schedule:` — the ~4-weekly ESR cadence is a standing post-v4.0 operational
item, not a Phase 3 deliverable) and runs the same replay off this machine, on
a GitHub-hosted runner. **Nix and the Gecko build are deliberately out of
scope for this workflow**: the Nix Gecko toolchain closure does not fit a
standard GitHub-hosted runner alongside a multi-gigabyte Gecko working tree,
so the workflow only exercises `rebase-upstream.sh`'s clone/replay/verify
sequence — it never runs `./mach build`. Consequently, the
`scripts/toolchain-baseline.sh` diff against the committed
`toolchain-baseline.txt` that PITFALLS #2 requires after every ESR rebase is a
**local operator follow-up**, run under `nix develop .#firefox` after a
successful CI replay — not a CI step, because the toolchain that produces it
only exists in the `firefox` devShell this workflow does not enter.

**Desktop install (local dev testing).** `powerbrowser/powerbrowser.desktop` (dev)
and `powerbrowser/powerbrowser-release.desktop` (release) install at the user-scope
path:

```
~/.local/share/applications/powerbrowser.desktop
~/.local/share/applications/powerbrowser-release.desktop
```

Both `Exec=` and `Icon=` in each file are **absolute paths** into this
machine's `objdir*`/branding tree — they must be repointed at the new paths
before either file works on another machine or after this repo moves. After
any later change to either file's `Exec=` or `StartupWMClass=`, re-register
with:

```
update-desktop-database ~/.local/share/applications
```

`update-desktop-database` is **not currently installed on this host** — that
follow-up needs the package (nixpkgs `desktop-file-utils`) added to a dev
shell before it can be run; neither `.desktop` file has been installed here
yet, so this has not blocked anything so far.

## Toolchain baseline

Phase 3's rebase procedure (BUILD-03) starts by diffing the toolchain the
`firefox` shell resolves today against the committed baseline:

```
diff <(nix develop .#firefox --command bash scripts/toolchain-baseline.sh) toolchain-baseline.txt
```

A non-empty diff means the pinned `nixpkgs` revision now resolves to a
different `rustc`, `cargo`, or `cbindgen` version than the committed
`toolchain-baseline.txt` — the FFI-drift signal the project's pitfalls
research calls out as something to re-check on every ESR rebase, not just
once. To regenerate the baseline file itself (only do this deliberately,
as part of a reviewed rebase):

```
nix develop .#firefox --command bash scripts/toolchain-baseline.sh > toolchain-baseline.txt
```

## Verifying a fresh clone

This is the check that proves the commands above are complete — that
nothing in them depends on tribal knowledge left over in a working tree
that has been iterated on directly.

```
git clone . <fresh-space-free-path>
cd <fresh-space-free-path>
./scripts/fetch-upstream.sh
./scripts/smoke-theia.sh
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach configure'
diff <(nix develop .#firefox --command bash scripts/toolchain-baseline.sh) toolchain-baseline.txt
```

The Firefox step above uses `./mach configure` as a **fast proxy**, not as
an equivalent. Configure covers most of the toolchain-detection path
(rustc, cargo, cbindgen, the WASM-sandboxing opt-out, libclang discovery)
in about a minute, so it is the right routine check.

Be clear about what it does not cover. Of the three toolchain defects
found while building this phase, one — nixpkgs' bintools-wrapper
exporting `AS`/`LD`/etc., which broke `moz.configure`'s assembler flag
routing — surfaced only **during compilation**, on the first `.s` file
(NSPR's `os_Linux_x86_64.s`), long after configure had succeeded. A
configure-only check would have passed straight over it. Treat a green
configure as "the documented setup is probably complete", not as proof
that a fresh clone builds.

The full check has been run once, end to end, on a genuinely fresh clone:

```
git clone . <fresh-space-free-path>
cd <fresh-space-free-path>
./scripts/fetch-upstream.sh                                     # 554s, 5.6G
./scripts/smoke-theia.sh                                        # 14s, PASS
nix develop .#firefox --command bash -c 'cd upstream && MOZCONFIG=../.mozconfig ./mach build'
```

Result: exit 0 in 3641s (~61 min), 14G objdir, zero `mach bootstrap`
invocations, `objdir/dist/bin/firefox --version` reporting
`Mozilla Firefox 153.1.0esr`, and `git status` clean in both the repo and
`upstream/`. Re-run the full build rather than just configure whenever
anything in `flake.nix`, `.mozconfig`, or the toolchain pin changes.

Any command that a fresh clone needs but this document does not list is
treated as a documentation failure, not a footnote — it gets added here
and re-verified, not just noted in a summary.
