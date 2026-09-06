---
phase: distribution-stage-4-packaged-product-correctness-linux
plan: "01"
type: execute
wave: 3
depends_on: [release-identity]
files_modified: [.planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md, flake.nix, powerbrowser/packaging/node-runtime.json, powerbrowser/endpoint-allowlist.json, scripts/verify-endpoints.sh, docs/BUILD.md, scripts/stage-sidecar.sh, scripts/emit-third-party-notices.mjs, patches/040-powerbrowser-package.patch, powerbrowser/shell/moz.build, powerbrowser/shell/powerbrowser-sidecar.js, powerbrowser/shell/TheiaService.sys.mjs, powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/shell/powerbrowser.js, powerbrowser/shell/powerbrowser.xhtml, powerbrowser/shell/powerbrowser.css, powerbrowser/INTERNAL-APIS.md, scripts/generate.mjs, theia/applications/browser/package.json, LICENSING.md, scripts/verify-branding-identity.mjs, scripts/verify-packaged-launch.mjs, scripts/verify-packaged-identity.mjs, scripts/run-install-matrix.sh, scripts/verify-platform.sh]
autonomous: false
requirements: [PKG-04, PKG-05, PKG-06, PKG-07, PKG-08, PKG-09, UPD-08]
must_haves:
  truths:
    - "A packaged tarball extracted to a fresh prefix launches, reaches the Theia shell, and never falls through to the interface-files-missing layer"
    - "The packaged tree carries its own Theia app, its own Node binary, and the sidecar pref file inside the packaged omni.ja; nothing resolves to the developer's checkout or to a system Node"
    - "The release package's About dialog carries no dev-variant string, proven against the staged package.json under objdir-release rather than the tracked one"
    - "Theia state is written under the Gecko profile directory, and the no-residue matrix looks at paths derived from the packaged application.ini rather than at two wrong literals"
    - "A URL handed to the binary on the command line opens in a stock browser window on the initial launch and on a handoff to a running instance, instead of being discarded"
    - "Whether the stock restart-to-update prompt can render in the Theia shell is decided by evidence, and the shell offers a working restart affordance under its own registry row when it cannot"
    - "Licence and third-party-notice files ship inside every package, asserted in the packaged tree, and en-US is recorded as the only shipped locale"
    - "objdir-release is rebuilt in this stage under the release-identity mozconfig with signature verification compiled in, so the next stage derives the update host, BUILD_TARGET and channel from a release objdir that no longer bakes a Mozilla host"
  artifacts:
    - path: ".planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md"
      provides: "Three ratified verdicts: the staging mechanism, whether the update prompt can render in the shell, and whether the bundled backend needs node_modules at runtime"
      contains: "Verdict 3:"
    - path: "scripts/stage-sidecar.sh"
      provides: "The pre-package staging step over one objdir: Theia lib without source maps, staged app package.json, the pinned Node binary, Node's LICENSE, LICENSING.md and THIRD-PARTY-NOTICES.txt"
      min_lines: 80
    - path: "patches/040-powerbrowser-package.patch"
      provides: "Regenerated hook-only package-manifest.in patch packaging the sidecar pref file and the staged sidecar tree"
      contains: "package-manifest.in"
    - path: "scripts/emit-third-party-notices.mjs"
      provides: "THIRD-PARTY-NOTICES.txt derived from the installed dependency tree at build time"
      min_lines: 60
    - path: "LICENSING.md"
      provides: "The shipped licence position: fork files, Gecko, Theia, Node"
      contains: "EPL-2.0"
    - path: "scripts/verify-packaged-launch.mjs"
      provides: "Packaged-tree launch gate on a fresh profile requiring both product markers and in-prefix resolution, with a self-test that removes the staged backend"
      min_lines: 120
    - path: "scripts/verify-packaged-identity.mjs"
      provides: "Packaged-identity gate over application.ini and the staged Theia package.json, with a dev-suffix plant"
      min_lines: 100
    - path: "scripts/run-install-matrix.sh"
      provides: "Tracked OS-parameterised install/launch/coexistence/no-residue driver with derived residue paths and a PATH-resolved stock binary"
      min_lines: 100
    - path: "scripts/verify-platform.sh"
      provides: "Registry rows for the packaged launch, packaged identity, install matrix and update-ready layer, each with its self-test row"
      contains: "packaged-launch"
  key_links:
    - from: "powerbrowser/shell/TheiaService.sys.mjs"
      to: "scripts/stage-sidecar.sh"
      via: "the supervisor resolves the staged backend and Node relative to the application directory the staging step writes into, never by a second literal"
      pattern: "getAppDir"
    - from: "patches/040-powerbrowser-package.patch"
      to: "powerbrowser/shell/powerbrowser-sidecar.js"
      via: "the packaged manifest line is what puts the preprocessed sidecar pref file into the packaged omni.ja"
      pattern: "powerbrowser-sidecar.js"
    - from: "scripts/verify-platform.sh"
      to: "scripts/verify-packaged-launch.mjs"
      via: "registry row invokes the packaged-launch gate; its self-test row invokes it with --self-test"
      pattern: "packaged-launch"
    - from: "powerbrowser/shell/PowerBrowserAPI.sys.mjs"
      to: "powerbrowser/INTERNAL-APIS.md"
      via: "each new internals touchpoint lands with its catalogue row in the same commit, and every catalogue row below the insertion is renumbered in that commit, enforced by check-internals-boundary.sh --catalogue"
      pattern: "GreD"
---

<objective>
Turn the packaged artifact into a working product on Linux. Today `objdir/dist/powerbrowser/` and the
`.tar.xz` beside it carry no Theia app, no Node runtime and no sidecar pref file, and
`powerbrowser/shell/powerbrowser-sidecar.js` bakes `backendMain` to
`@POWERBROWSER_DEV_TREE@/theia/applications/browser/lib/backend/main.js` with `nodePath` empty
(`powerbrowser/shell/moz.build` defines `POWERBROWSER_DEV_TREE` as `TOPSRCDIR + "/.."`), so an extracted
package reaches `USER_MESSAGE.interfaceFilesMissing` at `TheiaService.sys.mjs:419` and stops. This plan
stages the app and a pinned Node beside the binary, resolves both against the application directory,
packages the pref file through one regenerated patch, moves Theia state under the Gecko profile, makes a
command-line URL open a stock browser window on both handler branches, ships the licence and notice files,
and puts a packaged launch, a packaged identity, the install matrix and the update-ready layer under
registry rows that go red when the staging regresses.

Purpose: everything the release pipeline in stage 5 uploads is produced by `mach package` on this tree. A
tarball that cannot start its own interface is not a release candidate, and no later stage re-checks it.
Output: probe record with three verdicts, staging step plus one regenerated package patch, app-directory
resolution, profile-scoped Theia state, URL argument handling on both branches, variant-free legal notice,
licence and notice files, shell-side update-ready layer, four new registry row pairs and a tracked matrix
driver.

Staging-mechanism call (resolves the seed's open question on `FINAL_TARGET_FILES`): decided by task 1, not
here. The tree gives a strong prior in one direction that the task must confirm or refute: `DIRS +=
["../powerbrowser/shell"]` at line 21 of `patches/020-powerbrowser-shell.patch` proves a `../` path is
accepted for `DIRS`, but `SourcePath.__new__` (`upstream/python/mozbuild/mozbuild/frontend/context.py`
lines 916 to 934) joins against the context srcdir with no directory-recursion facility, `theia/` has no
symlink into `upstream/` the way `powerbrowser/` does (`upstream/powerbrowser -> ../powerbrowser` exists;
`upstream/theia` does not), and a `moz.build` entry would make `./mach build` depend on the Theia app
having been built first. The staged tree measures 146 MB over 31 non-map files
(`du -sh --exclude='*.map' theia/applications/browser/lib`; 14 `.map` files bring the directory to 371 MB),
which a scripted step copies in one pass. `powerbrowser/shell/moz.build` sits in `files_modified` only for
the branch where verdict 1 selects the `FINAL_TARGET_FILES` route; if the scripted step wins, that file is
left unmodified and the plan touches one file fewer.
</objective>

<context>
@.planning/seeds/SEED-001-standard-distribution-updates-reports.md
@docs/BUILD.md
@CLAUDE.md
@powerbrowser/INTERNAL-APIS.md
@configuration.toml
</context>

<tasks>

<task type="auto">
  <name>Probe: staging mechanism, update-prompt reachability, and backend self-containment</name>
  <reversibility rating="reversible">Scratch staging removed at closeout; the record is a decision artifact, not shipped code.</reversibility>
  <read_first>
    - upstream/python/mozbuild/mozbuild/frontend/context.py lines 855-948 (Path and SourcePath resolution rules; SourcePath.__new__ joins against the context srcdir and offers no recursion facility)
    - upstream/browser/installer/package-manifest.in lines 12-18 (the file format: `*` is the recursive wildcard) and 269-280 (the Default Preferences block, with `@RESPATH@/browser/defaults/settings` as the in-tree precedent for a bare directory entry)
    - upstream/browser/installer/package-manifest.in lines 20-31 (`@BINPATH@` is the main binary's directory, `@RESPATH@` equals it everywhere except macOS; which token each staged entry uses is part of verdict 1 because stage 7 inherits the choice)
    - upstream/toolkit/mozapps/installer/packager.mk lines 24-43 (stage-package invocation, DIST and MOZ_PKG_DIR arguments)
    - patches/020-powerbrowser-shell.patch (whole file: the `../` DIRS precedent at line 21 and the hook-only patch voice to imitate)
    - upstream/toolkit/mozapps/update/UpdateListener.sys.mjs lines 500-525 (the update-staged and update-downloaded cases) and 220-275 (showUpdateNotification)
    - upstream/toolkit/modules/AppMenuNotifications.sys.mjs lines 58-90 and 182-184 (showNotification and the single `appMenu-notifications` notification it fires)
    - upstream/browser/components/customizableui/content/panelUI.js lines 63 and 326, and upstream/browser/base/content/browser.js line 165 (the sole observer of that topic, and the sole document that loads it)
    - powerbrowser/shell/powerbrowser.xhtml (whole file: the shell document loads powerbrowser.js at line 32 and nothing else)
    - theia/applications/browser/gen-esbuild.node.mjs (whole file: `bundle: true`, `external: ['electron']`, `assetNames: 'native/[name]'` and the copy plugin, the claim verdict 3 tests)
    - .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md (whole file: the record structure to imitate)
  </read_first>
  <files>.planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md</files>
  <action>Answer three questions with evidence before any code depends on them.

Question 1, the staging mechanism: copy the built Theia lib tree and a scratch Node binary into
`objdir/dist/bin/theia` and `objdir/dist/bin/node` under an untracked scratch directory, add the candidate
manifest lines to a scratch copy of `upstream/browser/installer/package-manifest.in`, run `./mach package`
inside `nix develop .#firefox`, and record verbatim whether a bare directory entry expands recursively into
`objdir/dist/powerbrowser/`, whether the wildcard form is needed instead, whether the packager reports
unpackaged or broken-symlink errors, and whether a following `./mach build faster` purges the staged files
out of `dist/bin` through the install manifest. Record which of `@BINPATH@` and `@RESPATH@` each entry
uses. Then attempt the `FINAL_TARGET_FILES` route from `powerbrowser/shell/moz.build` with one
`../..`-relative entry and record the exact configure or build error, or its success. Restore the pinned
manifest and leave `git -C upstream diff` empty (the pinned tree's expected dirt is staged, not unstaged:
`git -C upstream status --porcelain` reads `M browser/moz.build` and `M browser/moz.configure` with both
in the index, and the probe must return it to exactly that). Verdict 1 names one mechanism and the reason,
states the ordering constraint the chosen mechanism imposes on `mach build`, the staging step and
`mach package`, and names the two manifest tokens.

Question 2, the update prompt: derive statically from the pinned tree which documents observe
`appMenu-notifications` and which documents load `panelUI.js`, then prove the derivation live by launching
the built binary twice on throwaway profiles, once with only the shell window and once with a stock browser
window opened through the GUI-01 path, notifying the `update-staged` topic in each and recording what
renders. The stock window is the positive control: a claim that nothing renders in the shell is worth
nothing without a paired observation of the same notification rendering somewhere. **Record the exact
mechanism used to reach a chrome observer from outside the process, verbatim, because task 7's
update-ready row reuses it; if no mechanism reaches one, say so in the verdict, since that decides whether
that row's live half exists at all or whether the row is static over the registration, the copy and the
banner element with the live half recorded as deferred.** Verdict 2 states, in one line, whether the
prompt can reach the shell, and separately whether it reaches an open stock browser window, because the
second half changes what the layer in task 6 must do.

Question 3, backend self-containment: the staged set, the 146 MB figure and the MAR size all rest on the
claim that the bundled backend needs no `node_modules` at runtime. Test it rather than assert it: move
`theia/node_modules` aside, run `node theia/applications/browser/lib/backend/main.js` with the same
arguments and environment `TheiaService.sys.mjs` spawns it with (`TheiaService.sys.mjs:603` for the
argument vector, lines 620-655 for the environment block), and record verbatim whether it reaches
`POWERBROWSER_BACKEND_READY` or throws a module-resolution error naming what it wanted. Restore
`theia/node_modules` in a `finally`. Verdict 3 states what the staged set must contain and gives the
measured size of exactly that set; task 3's staged list follows from this observation rather than
preceding it.

Write the record imitating the 13-SPIKE section structure, with every observation carrying its verbatim
evidence, remove the scratch, and commit as docs(dist-4): record staging, update-prompt and
self-containment verdicts. Finish with the quick gate green.</action>
  <verify>
    <automated>git add .planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md && test "$(grep -cE '^Verdict [123]: ' .planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md)" -eq 3 && git -C upstream diff --quiet && test "$(git -C upstream status --porcelain | wc -l)" -eq 2 && test -z "$(git status --porcelain patches/ powerbrowser/ scripts/ theia/ | head -5)" && test -d theia/node_modules && scripts/verify-platform.sh --quick</automated>
    <fails_when>any of the three verdict lines is missing or malformed, the upstream checkout carries unstaged changes or more than the two expected dirt entries, the probe stages a file into the shipped tree, theia/node_modules was left moved aside, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Verdict 1 names one staging mechanism, its ordering constraint, the two manifest path tokens, and the observed failure or success of the rejected route
    - Verdict 2 answers the shell question and the stock-window question separately, each with live evidence and a positive control, and records the topic-notification mechanism verbatim or its absence
    - Verdict 3 states whether the bundled backend runs with node_modules absent, with the verbatim run output, and gives the measured size of the staged set
    - upstream/ carries no unstaged change and exactly its two expected staged entries; no shipped-tree file staged by the probe
  </acceptance_criteria>
  <done>Tasks 3, 6 and 7 build on measured facts rather than on the seed's open questions</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Node runtime pin under operator key trust, and the licence position</name>
  <reversibility rating="costly">The pinned runtime reaches every shipped package; changing it later is a re-release, not an edit.</reversibility>
  <read_first>
    - flake.nix lines 14-21 (the single-Node rule: `nodejs = pkgs.nodejs_22` and the yarn override built against it; the pin below must reuse this binding, never a second literal)
    - docs/BUILD.md line 271 (the drilled record: the theia dev shell carries node v22.23.2 and yarn 1.22.22)
    - docs/BUILD.md "Key-custody rung" section (the existing custody voice to imitate)
    - scripts/verify-endpoints.sh lines 10-35 (layers 1, 2 and 3 all instrument the launched Gecko process; none can observe a nix build-time fetch, which is why a build host needs a row that layer 3 refuses to match rather than an ordinary allow row) and lines 340-352 (`allowlist_host_allowed`, whose only discriminator today is the disposition string)
    - powerbrowser/endpoint-allowlist.json: the `$comment` rule and the `host` / `disposition` / `reason` row shape; every row today is a runtime row and none carries a scope key
    - .planning/seeds/SEED-001-standard-distribution-updates-reports.md lines 187-188 (user decision 13, bundled Node; decision 14, licence of distributed binaries)
    - LICENSE (the fork's PolyForm Noncommercial 1.0.0 text, unchanged by this plan)
  </read_first>
  <files>flake.nix, powerbrowser/packaging/node-runtime.json, powerbrowser/endpoint-allowlist.json, scripts/verify-endpoints.sh, docs/BUILD.md</files>
  <action>The version is derived, never typed. The nixos package index reports `nodejs_22` at 22.22.2 for
unstable HEAD, but this tree pins nixpkgs by rev in flake.lock and resolves 22.23.2, which is also what
docs/BUILD.md line 271 recorded from a live drill. Any literal written into the flake or into a check would
therefore be wrong today and would go stale silently on the next pin move.

Operator steps, in order, on legion. (1) Read the version this tree actually builds against:
`nix develop .#theia --command node --version`. Every step below uses that value; do not substitute a
number from this document. (2) Import the Node release signing keys from the public keyserver into a
throwaway keyring and confirm each fingerprint against the Node project's published key list; record the
fingerprints used. (3) Download `SHASUMS256.txt` and `SHASUMS256.txt.asc` for that exact release, run
`gpg --verify` against the imported keyring, and paste the verification output into the record. (4) Read
the `node-v<version>-linux-x64.tar.xz` line out of the verified `SHASUMS256.txt` and keep the sha256 in the
hex form that file uses; nix accepts a bare hex `sha256` in `fetchurl`, and hex is also what a
`sha256sum` on a downloaded runtime produces, which is how the two later target stages check theirs. (5) Create `powerbrowser/packaging/node-runtime.json` as the tracked per-target Node runtime pin, one row
per target key, and write the `linux-x64` row from steps 1 and 4: `{"linux-x64": {"version": "<the version
step 1 read, without the leading v>", "sha256": "<the 64-character hex sha256 from step 4>", "url":
"https://nodejs.org/dist/v<version>/node-v<version>-linux-x64.tar.xz"}}`. This file is the single source of truth for the shipped
runtime on every target; stages windows-unsigned and macos-adhoc-signed append their `win32-x64`,
`darwin-arm64` and `darwin-x64` rows to it and no second pin file is created anywhere. Then add one output
to flake.nix that reads that file rather than carrying a hash inline, built from the existing `nodejs`
binding so the version and URL follow the toolchain automatically:
`nodePin = (builtins.fromJSON (builtins.readFile ./powerbrowser/packaging/node-runtime.json))."linux-x64";`
then `packages.x86_64-linux.nodeDist = pkgs.fetchurl { url = nodePin.url; sha256 = nodePin.sha256; };`, with an
assertion that `nodePin.version == nodejs.version` so the tracked pin and the toolchain Node can never
diverge, and a comment stating that a pin move makes the fetch fail on the stale hash rather than silently
shipping a mismatched runtime. (6) Append a `### Shipped licences and
runtime provenance` section to docs/BUILD.md ratifying the licence position: the fork's own files stay
PolyForm Noncommercial 1.0.0, the Gecko sources stay MPL-2.0, the Theia dependencies stay EPL-2.0, the
Node runtime stays MIT (the nixos index reports `nodejs_22` under the MIT License), Node's own LICENSE
ships beside the staged binary, and the fingerprints from step 2 plus the SRI hash from step 4 are recorded
there as the provenance of the shipped runtime. (7) Define the build-versus-runtime discriminator in the allowlist, here, because this is the earliest
stage that needs it and three later stages add build hosts under it. Add a `scope` field to the row shape
whose value is `build` or `runtime`, absent meaning `runtime` so every existing row keeps exactly the meaning
it has today; document the field and that default in the file's `$comment`; and make `allowlist_host_allowed`
in `scripts/verify-endpoints.sh` refuse to match a row whose scope is `build`, so a runtime resolution of a
toolchain download host stays a layer-3 failure instead of being silently permitted. Then add `nodejs.org`
as the first `scope: "build"` row, `allow`, with a reason naming the SRI pin in
`powerbrowser/packaging/node-runtime.json` as the integrity mechanism and stating that no
`verify-endpoints.sh` layer can observe a nix build-time fetch, which is why the row is scoped rather than
omitted. This supersedes the earlier position that a build host gets no row at all: record that supersession
as one sentence in the provenance section, naming the scope field as what made a row honest, so a reader of
the older text is not left with a contradiction. Stages windows-unsigned and macos-adhoc-signed add their
build hosts under this same field and assert the discriminator rather than defining it.

This is the one step in the plan that no agent may perform: trusting a signing key is a human decision, and
every user who installs a release executes this binary.</action>
  <verify>
    <automated>V="$(nix develop .#theia --command node --version)" && grep -q 'nodeDist' flake.nix && grep -q 'nodejs.version' flake.nix && grep -q 'node-runtime.json' flake.nix && ! grep -qF "$(node -e "process.stdout.write(require('./powerbrowser/packaging/node-runtime.json')['linux-x64'].sha256)")" flake.nix && node -e "const p=require('./powerbrowser/packaging/node-runtime.json');const r=p['linux-x64'];if(!r||!r.version||!/^[0-9a-f]{64}$/.test(r.sha256)||!/^https:\/\/nodejs\.org\//.test(r.url))process.exit(1);if(!r.url.includes(r.version))process.exit(1)" && test "$(node -e "process.stdout.write('v'+require('./powerbrowser/packaging/node-runtime.json')['linux-x64'].version)")" = "$V" && node -e "const a=require('./powerbrowser/endpoint-allowlist.json');const r=a.hosts.find(h=>h.host==='nodejs.org');if(!r||r.scope!=='build'||r.disposition!=='allow'||!r.reason||r.reason.length<80)process.exit(1);if(!/scope/.test(a['\$comment']))process.exit(1);if(a.hosts.some(h=>h.scope!==undefined&&h.scope!=='build'&&h.scope!=='runtime'))process.exit(1)" && bash -n scripts/verify-endpoints.sh && grep -q 'scope' scripts/verify-endpoints.sh && grep -q '"build"' scripts/verify-endpoints.sh && grep -qE '^### Shipped licences and runtime provenance' docs/BUILD.md && grep -qE 'Node runtime.*MIT' docs/BUILD.md && grep -qE 'EPL-2\.0' docs/BUILD.md && grep -qE 'MPL-2\.0' docs/BUILD.md && grep -qE 'PolyForm' docs/BUILD.md && grep -qF "${V#v}" docs/BUILD.md && P="$(nix build .#nodeDist --no-link --print-out-paths)" && rm -rf .mozbuild/nodecheck && mkdir -p .mozbuild/nodecheck && tar -xf "$P" -C .mozbuild/nodecheck --strip-components=2 --wildcards '*/bin/node' && test "$(.mozbuild/nodecheck/node --version)" = "$V" && rm -rf .mozbuild/nodecheck && git add flake.nix docs/BUILD.md && scripts/verify-platform.sh --quick</automated>
    <fails_when>the tracked pin file is absent or its linux-x64 row lacks a version, a hex sha256 or a nodejs.org URL naming that version, the flake still carries an inline hash instead of reading the pin file, the pin version disagrees with the dev shell's Node, the nodejs.org row is missing or is not scoped build, the `$comment` does not document the scope field, verify-endpoints.sh has no scope discriminator or does not name the build value, the flake carries no pinned Node output or builds its URL from a literal instead of the toolchain binding, the fetch does not reproduce the recorded hash (nix fails the build), the archive carries no bin/node, the extracted binary reports a version other than the one the theia dev shell resolves, the provenance section is absent or does not name all four licences and the resolved version, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - The pinned Node version equals the toolchain Node the native modules were built against, and equality is asserted by comparison against the dev shell rather than against a literal in any file
    - The hex sha256 lives in powerbrowser/packaging/node-runtime.json, comes from a GPG-verified SHASUMS256.txt, is read by flake.nix rather than duplicated, and the fingerprints are recorded in docs/BUILD.md
    - The allowlist carries a machine-readable `scope` field defaulting to runtime, layer 3 refuses to match a build-scope row, and nodejs.org is the first row that uses it
    - `nix build .#nodeDist` reproduces the pin, which is what makes a substituted tarball fail loudly
    - The provenance section names all four licences, the Node LICENSE placement, and the build-time-fetch endpoint decision, recording the no-row position as superseded by the scope field
  </acceptance_criteria>
  <done>The runtime every user executes is pinned to bytes a human verified, and the licence position is written down before anything ships</done>
  <resume-signal>Type "approved" once `nix build .#nodeDist` reproduces the hash and the provenance section is written, or describe what blocked a step</resume-signal>
</task>

<task type="auto">
  <name>Stage the Theia app, Node and the notice files into both objdirs and into the package</name>
  <reversibility rating="costly">The staged layout is addressed by the resolution code, the registry rows and the matrix driver; renaming a staged directory touches each of them.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md (verdict 1 and its ordering constraint; verdict 3 and the staged set it fixes)
    - theia/applications/browser/gen-esbuild.node.mjs (whole file: the bundle options behind verdict 3)
    - theia/applications/browser/package.json lines 1-40 (the staged app package.json shape, including the theia.frontend.config block the identity row reads)
    - upstream/browser/installer/package-manifest.in lines 269-280 (insertion point for the pref-file line, beside firefox.js and firefox-branding.js)
    - docs/BUILD.md packaging procedure steps 2 and 3 (mach package, precomplete, the make_full_update.sh invocation whose input directory is the staged app dir)
    - docs/BUILD.md line 812 and the Packaging timings table (the 78654141-byte MAR figure the new measurement sits beside)
    - scripts/verify-branding-identity.mjs lines 148-154 (the release variant reads objdir-release/dist/bin, which is why both objdirs are staged here and not four tasks later)
    - CLAUDE.md "Patches are regenerated, never text-edited"
  </read_first>
  <files>scripts/stage-sidecar.sh, scripts/emit-third-party-notices.mjs, LICENSING.md, patches/040-powerbrowser-package.patch, powerbrowser/shell/moz.build, docs/BUILD.md</files>
  <action>Write `scripts/stage-sidecar.sh` as the pre-package step verdict 1 selected. It takes the objdir as
its one argument, fails loudly by name on a missing Theia lib tree, a missing pinned Node, or a missing
objdir, and copies into that objdir's application directory: the built
`theia/applications/browser/lib` tree with every `*.map` excluded, the built app `package.json`, the
`plugins` directory only when it holds anything (it is empty today), the `bin/node` binary extracted from
the flake's pinned `nodeDist` output, Node's own LICENSE beside it under a name that says which component
it belongs to, plus `LICENSING.md` and the generated `THIRD-PARTY-NOTICES.txt`. Whatever verdict 3
recorded as additionally required is copied too, or its absence is what verdict 3 licensed. The step is
idempotent: a second run over an already-staged tree produces an identical layout, and it never copies a
source map, so the staged tree stays at the measured 146 MB of code rather than the 371 MB the lib
directory holds with maps.

Run it over **both** objdirs. `objdir-release/dist/bin` exists (ledger entry 10 closed on 2026-09-05 when
plan 08-05 built it) and is where `verify-branding-identity --variant release` reads every per-variant
surface, so a release descriptor extended in task 7 to read the staged package.json has nothing to read
unless this task stages it. No release build is needed: staging is a copy into an existing tree.

Write `scripts/emit-third-party-notices.mjs` to derive the notices from the installed dependency tree at
build time, walking `theia/node_modules` for each package's name, version, declared licence and licence
text, sorting by package name so the output is byte-stable across runs, and failing by name on a dependency
that declares no licence rather than omitting it. Write `LICENSING.md` from the position task 2 ratified.

Regenerate `patches/040-powerbrowser-package.patch` from a patched checkout, never by editing hunk text.
The number is 040, not 030: stage 3 (mar-signing-and-update-integrity) claims
`patches/030-powerbrowser-mar-certificates.patch` in the same wave, and `apply-patches.sh` replays in
zero-padded numeric glob order, so a collision would be a stack conflict rather than a cosmetic clash. The
patch adds `@RESPATH@/browser/@PREF_DIR@/powerbrowser-sidecar.js` beside the two existing pref-file lines,
and the entries verdict 1 selected for the staged tree and the runtime under the tokens verdict 1 named.
Keep it hook-only in the sense `check-patch-surface.sh` enforces, adding no configuration-derived brand
value, exactly as patch 020 is. After regenerating, `git -C upstream add` the modified file so the
checkout returns to the staged-dirt state the stack expects and `git -C upstream diff` stays empty.

The packaged pref file lands **inside `browser/omni.ja`**, not as a loose file: `objdir/dist/powerbrowser/browser/`
holds exactly `chrome` and `omni.ja`, and the three lines package-manifest.in already names
(`debugger.js`, `firefox.js`, `firefox-branding.js`) appear in that archive under
`defaults/preferences/`. Every assertion about the packaged pref file reads the archive.

Document the staging step in docs/BUILD.md's packaging procedure between `mach package` and the MAR emit,
in the order verdict 1 requires, and record the measured staged size, tarball size and MAR size beside the
existing 78654141-byte figure so stage 5 plans its uploads against real numbers rather than the Gecko-only
ones. Stage every new file before any scan, then commit as feat(dist-4): stage the Theia app, Node and
notices into the package.</action>
  <verify>
    <automated>git add scripts/stage-sidecar.sh scripts/emit-third-party-notices.mjs LICENSING.md patches/040-powerbrowser-package.patch powerbrowser/shell/moz.build docs/BUILD.md && bash -n scripts/stage-sidecar.sh && node --check scripts/emit-third-party-notices.mjs && bash scripts/check-patch-surface.sh && bash scripts/apply-patches.sh --self-test && git -C upstream diff --quiet && node scripts/scan-brand-residue.mjs && bash scripts/stage-sidecar.sh objdir && find objdir/dist/bin/theia objdir/dist/bin/node -type f | sort | sha256sum > .mozbuild/stage-a.txt && bash scripts/stage-sidecar.sh objdir && find objdir/dist/bin/theia objdir/dist/bin/node -type f | sort | sha256sum > .mozbuild/stage-b.txt && cmp .mozbuild/stage-a.txt .mozbuild/stage-b.txt && bash scripts/stage-sidecar.sh objdir-release && test -f objdir-release/dist/bin/theia/package.json && test -f objdir/dist/bin/theia/lib/backend/main.js && test -x objdir/dist/bin/node && test -z "$(find objdir/dist/bin/theia -name '*.map' -print -quit)" && nix develop .#firefox --command bash -c "cd upstream && MOZCONFIG=../.mozconfig ./mach package" && test -f objdir/dist/powerbrowser/theia/lib/backend/main.js && test -x objdir/dist/powerbrowser/node && test -f objdir/dist/powerbrowser/THIRD-PARTY-NOTICES.txt && test -f objdir/dist/powerbrowser/LICENSING.md && test -n "$(find objdir/dist/powerbrowser -maxdepth 2 -iname '*LICENSE*' -print -quit)" && python3 -c 'import sys,zipfile; sys.exit(0 if "defaults/preferences/powerbrowser-sidecar.js" in zipfile.ZipFile("objdir/dist/powerbrowser/browser/omni.ja").namelist() else 1)' && scripts/verify-platform.sh --quick</automated>
    <fails_when>the staging step is not idempotent, a source map reaches the staged tree, objdir-release carries no staged app package.json, the patch surface or brand scan rejects the new patch, the patch replays as a silent no-op, the upstream checkout is left with an unstaged change, or the packaged application directory is missing the Theia backend entry, the Node binary, Node's LICENSE, LICENSING.md, THIRD-PARTY-NOTICES.txt, or the sidecar pref file inside its omni.ja</fails_when>
  </verify>
  <acceptance_criteria>
    - The packaged application directory carries the backend entry, the frontend bundle, the native module directory, the Node binary, Node's LICENSE, LICENSING.md and THIRD-PARTY-NOTICES.txt, and no source map
    - Both objdir and objdir-release carry a staged Theia app, so the release identity surface task 7 extends has something to read
    - The package patch is numbered 040, regenerated, hook-only, and replays non-vacuously under apply-patches --self-test with upstream/ left at its expected staged dirt
    - The sidecar pref file is asserted inside the packaged omni.ja, which is the only place the packager puts a pref file
    - docs/BUILD.md records the staging step in its required order plus the measured staged, tarball and MAR sizes
  </acceptance_criteria>
  <done>An extracted package contains every file the sidecar needs, and the packaging procedure says how it got there</done>
</task>

<task type="auto">
  <name>Resolve the backend and Node against the application directory, scope Theia state to the profile, and open a command-line URL on both handler branches</name>
  <reversibility rating="costly">The resolution order and the state-file location are observed by three registry rows and by the matrix driver; a later change moves user data.</reversibility>
  <read_first>
    - powerbrowser/shell/TheiaService.sys.mjs lines 405-445 (_resolveSidecar: the backendMain and nodePath resolution with their two USER_MESSAGE branches and diagnostics rows), 448-478 (_resolveConfigDir and _profileStateKey with the CR-01 rationale), 178-195 (where _configDir and _stateFilePath are set), 620-655 (the spawn environment block, THEIA_CONFIG_DIR at 623 and POWERBROWSER_PROFILE_DIR at 652)
    - powerbrowser/shell/TheiaService.sys.mjs lines 41-56 (the USER_MESSAGE table and the rule that a new key must buy a distinct next step)
    - powerbrowser/shell/PowerBrowserAPI.sys.mjs lines 194-209 (getProfileDir: the Services.dirsvc never-throw pattern to imitate), 640-668 (openBrowserWindow and its nsISupportsString wrapping), 1910-1981 (isInitialLaunch and PowerBrowserSingleInstanceHandler, whose remote-handoff branch returns at line 1970 before reading any argument)
    - powerbrowser/INTERNAL-APIS.md line 38 (the Services.dirsvc.get / Ci.nsIFile row for getProfileDir) and the two single-instance-handler rows whose text states the handler never reads an argument
    - powerbrowser/shell/powerbrowser-sidecar.js (whole file: the preprocessed dev-tree default and the comment explaining why no user path is checked in)
    - upstream/xpcom/io/nsDirectoryServiceDefs.h line 56 (`#define NS_GRE_DIR "GreD"`, the key getAppDir reads)
    - upstream/browser/components/BrowserContentHandler.sys.mjs lines 1635-1663 (how the stock handler reads `-url`, and that `-osint` is Windows-only)
    - upstream/toolkit/xre/nsXREDirProvider.cpp lines 1340-1352 (vendor and app name lowercased into the profile root, which is what makes the real path ~/.debios/powerbrowser)
    - scripts/verify-shell-error-copy.mjs lines 81-130 (the ALL-CAPS and dotted-key patterns any new or edited copy must pass; the table is parsed, so an edited sentence needs no second file changed)
    - scripts/check-internals-boundary.sh lines 199-228 (check_catalogue_consistency matches each occurrence by absolute line number)
  </read_first>
  <files>powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/shell/TheiaService.sys.mjs, powerbrowser/INTERNAL-APIS.md, powerbrowser/shell/powerbrowser-sidecar.js</files>
  <action>Add one accessor to the boundary file, `getAppDir()`, reading `Services.dirsvc.get("GreD", Ci.nsIFile).path`
through the same never-throw shape `getProfileDir()` uses, and catalogue it in INTERNAL-APIS.md in the same
commit. One key, not two: `GreD` is the resources directory, which on Linux is the application directory
and on macOS is `Contents/Resources`, so putting both the staged Theia tree and the staged Node binary
under it keeps one accessor, one catalogue row and one resolution rule when stage 7 packages a bundle.
**Inserting a method into PowerBrowserAPI.sys.mjs renumbers every catalogued occurrence below the insertion
point**: the catalogue carries 42 rows keyed to absolute line numbers in that file, the highest at 1960,
and `check-internals-boundary.sh --catalogue` compares each derived occurrence line against the catalogue
text. Renumber every affected row in the same commit and let that check name any drift; prefer the lowest
insertion point that still reads naturally so the renumber is as small as it can be.

In TheiaService, resolve the backend entry as: the `backendMain` pref when its value names a file that
exists, otherwise the staged path relative to the application directory; and resolve Node as: the
`nodePath` pref when set and executable, otherwise the staged binary under the application directory,
otherwise the existing PATH search. The dev-tree default in powerbrowser-sidecar.js stays exactly as it is,
so a developer's checkout keeps winning on a dev run and a packaged install with no checkout falls through
to its own staged copy; update that file's header comment to say so.

Both failure branches keep pointing at a table sentence with the attempted paths as labelled diagnostics
rows, which is where an internal path belongs. `interfaceFilesMissing` is already correct for the bundled
posture and stays verbatim. `nodeMissing` is not: it currently reads "Power Browser needs Node.js and
couldn't find it. Install Node.js 22 or later and open Power Browser again, or open Details for where it
looked." Once the runtime ships inside the package, reaching that branch means the package is damaged, and
the stated next step cannot repair it. Rewrite the sentence for the bundled posture: name the product, say
the runtime it needs is missing or damaged, and end at reinstalling, which is the affordance that actually
works. One edited literal, no new key: the copy gate parses the table and derives its expectations, so no
second file changes, and the sentence must still carry no ALL-CAPS token and no dotted key of three or more
segments.

Move `_resolveConfigDir()` to return a directory under the profile directory, keeping the existing
environment-derived path only as the fallback for a profile directory that cannot be read, so
`THEIA_CONFIG_DIR` and the supervisor state file follow the profile that already scopes them and two
installs stop sharing Theia state. Record in that function's comment that the fallback path is not
derivable from `application.ini` and therefore sits outside the residue set the matrix asserts in task 7,
so a later reader does not mistake its absence from that set for an oversight. Leave `_profileStateKey()`
in place: the state file name is asserted by the existing reap checks and renaming it buys nothing.

In `PowerBrowserSingleInstanceHandler.handle`, read the URL argument **before** the branch and hand it to
`PowerBrowserAPI.openBrowserWindow(url)` on both paths. The remote-handoff branch is the one the desktop
entry's `%u` and the installer's `-osint -url` registration actually hit whenever an instance is already
running, and today it returns at line 1970 having read nothing. Take the `-url` flag parameter first and a
bare first argument second, pass the string through unresolved so the stock window's own fixup decides what
it means, and keep `preventDefault` set on both paths exactly as it is now so no second stock window opens
by the default handler's own path. Amend the two single-instance-handler rows in INTERNAL-APIS.md, whose
text currently states the handler never reads a command-line argument, to state what it now reads and that
the only privileged operation it reaches is the already-catalogued `openBrowserWindow`. No new patch: every
change is in the fork's own files. Stage everything, then commit as feat(dist-4): resolve the sidecar
against the app dir, scope Theia state to the profile, open a command-line URL.</action>
  <verify>
    <automated>git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/TheiaService.sys.mjs powerbrowser/INTERNAL-APIS.md powerbrowser/shell/powerbrowser-sidecar.js && node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && node --check powerbrowser/shell/TheiaService.sys.mjs && grep -q 'getAppDir' powerbrowser/shell/PowerBrowserAPI.sys.mjs && grep -q 'getAppDir' powerbrowser/INTERNAL-APIS.md && ! grep -q 'Install Node.js 22 or later' powerbrowser/shell/TheiaService.sys.mjs && bash scripts/check-internals-boundary.sh --self-test && bash scripts/check-internals-boundary.sh && bash scripts/check-internals-boundary.sh --catalogue && node scripts/verify-shell-error-copy.mjs && node scripts/verify-shell-error-copy.mjs --self-test && node scripts/verify-shell-error-contract.mjs && node scripts/scan-brand-residue.mjs && git -C upstream diff --quiet && scripts/verify-platform.sh --quick</automated>
    <fails_when>a new internals touch is uncatalogued or a renumbered catalogue row disagrees with the file, a new internals touch reaches a second file, the bundled-posture rewrite of the node message was skipped, an internal identifier appears in user-facing copy, the upstream checkout is modified, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - The backend and Node resolve against the application directory through one catalogued GreD accessor, with the dev-tree pref still winning on a developer run
    - Every catalogue row below the insertion point is renumbered in the same commit and check-internals-boundary --catalogue is green
    - The node failure sentence states the bundled-posture problem and a next step the user can take; both branches carry the attempted paths as diagnostics rows only
    - Theia's config directory and the supervisor state file live under the profile directory, with the old path kept only as an unreadable-profile fallback and its exclusion from the residue set written at the code
    - A URL argument reaches openBrowserWindow on the initial-launch branch and on the remote-handoff branch, with the catalogue rows amended in the same commit
  </acceptance_criteria>
  <done>The packaged shell can find its own interface, and stops discarding the URL the desktop entry hands it</done>
</task>

<task type="auto">
  <name>Make the Theia app variant-free and record the single locale</name>
  <reversibility rating="reversible">One emitter line plus a regenerated fragment; reverting restores the per-variant sentence.</reversibility>
  <read_first>
    - scripts/generate.mjs lines 1623-1631 (MOZILLA_NON_ASSOCIATION_TAIL, named once) and 1663-1684 (emitLegalNotices, where the Mozilla sentence composes display_name with the variant name_suffix at line 1667)
    - scripts/generate.mjs lines 1738-1770 (emitTheiaBranding and its fragment contract), 3449-3461 (the TARGETS row for theia-branding.json, variant dev), 4990-5000 (the generator self-test's expected notices, which hardcode the dev composition "Acme Browser Dev is not officially associated ...")
    - generated/theia-branding.json and theia/applications/browser/package.json lines 26-34 (the tracked powerbrowserBranding block carrying the dev sentence)
    - scripts/verify-trademark-surface.mjs lines 155-160 (the exclusion is the emitter-fixed tail imported from the generator, not the whole sentence, so dropping the suffix keeps that gate green)
    - scripts/verify-theia-branding.mjs lines 62-70 (the fragment and tracked-block contract this change moves)
    - configuration.toml lines 37-38 and 57-66 (display_name, and the two variants' name_suffix: " Dev" and "")
    - objdir/dist/package_name.txt (the packaged locale token this task records)
  </read_first>
  <files>scripts/generate.mjs, theia/applications/browser/package.json, docs/BUILD.md</files>
  <action>Establish first, by grepping the built frontend bundle, that the only variant-dependent string in the
whole Theia app is the Mozilla non-association sentence: `theia/applications/browser/lib/frontend/bundle.js`
carries two occurrences of the dev composition today and the frontend config's `applicationName` is already
the bare display name. Then take the smaller of the scope's two options and drop the variant suffix from
that sentence, so `emitLegalNotices` composes it from the display name alone; the release variant's
`name_suffix` is `""` (configuration.toml line 65), so the emitted sentence is byte-identical to what the
release composition would have produced. Remove the now-unused `variant` parameter and its argument at the
single call site rather than leaving a dead parameter behind.

This is the option the tree argues for: the alternative emits a second per-variant fragment and requires a
second full Theia app build, a second staged tree of the same 146 MB, and a swap of the tracked
package.json between builds, to change one sentence that names the product rather than the build channel.
Record that reasoning in the emitter comment so a later reader does not re-add the suffix.

Regenerate the fragment, copy the `powerbrowserBranding` block over into the tracked app package.json
exactly as the existing copy-over rule prescribes, update the generator's own self-test expectation (the
fixture triple at generate.mjs line 4997 still reads the dev composition and `generate-self-test` is a
`--quick` row, so a stale expectation goes red immediately), and rebuild the Theia app so the bundle
carries the new sentence.

Record en-US as the only shipped locale in docs/BUILD.md's packaging procedure under a line of the exact
form `Shipped locale: <token>`, deriving the token from the packaged artifact's own name rather than
restating a constant, and say plainly that a second locale is a later release. A bare grep for the token
would pass on the existing tarball filename at docs/BUILD.md line 996, which is why the assertion is
anchored to that line form. **PKG-09's download-page half is not this task's**: the download page is stage
5's DIST-03 surface, and the requirement is not complete on the documentation half alone; say so in one
sentence beside the record so the pointer exists where a reader will look. Stage everything, then commit as
feat(dist-4): variant-free legal notice and single-locale record.</action>
  <verify>
    <automated>git add scripts/generate.mjs theia/applications/browser/package.json docs/BUILD.md && node scripts/generate.mjs && node scripts/generate.mjs --check && node scripts/generate.mjs --self-test && node scripts/verify-theia-branding.mjs && node scripts/verify-theia-branding.mjs --self-test && node scripts/verify-trademark-surface.mjs && node scripts/scan-brand-residue.mjs && ! grep -q 'PowerBrowser Dev' theia/applications/browser/package.json && ! grep -q 'PowerBrowser Dev' generated/theia-branding.json && nix develop .#theia --command bash -c "cd theia && yarn build" && ! grep -q 'PowerBrowser Dev' theia/applications/browser/lib/frontend/bundle.js && L="$(sed -E 's/.*\.([A-Za-z]+-[A-Za-z]+)\.linux.*/\1/' objdir/dist/package_name.txt)" && grep -qE "^Shipped locale: ${L}\b" docs/BUILD.md && scripts/verify-platform.sh --quick</automated>
    <fails_when>generate --check reports drift, the generator self-test still expects the dev composition, the branding or trademark gate goes red, the dev composition survives in the tracked package.json, the emitted fragment or the built bundle, or docs/BUILD.md carries no `Shipped locale:` line naming the token derived from the packaged artifact</fails_when>
  </verify>
  <acceptance_criteria>
    - The Mozilla non-association sentence names the product without a build-channel suffix, with the reasoning recorded at the emitter and the unused variant parameter removed
    - The tracked block, the emitted fragment and the built bundle all agree, proven by the branding gate and by a grep of the bundle
    - One Theia app build serves both variants, stated as the reason the second fragment was not created
    - The shipped locale is recorded from the packaged artifact's own token on an anchored line, with the download-page half pointed at stage 5
  </acceptance_criteria>
  <done>The release package can no longer carry a dev string in its About dialog, and it took one emitter line rather than a second app build</done>
</task>

<task type="auto">
  <name>Shell-side update-ready layer, routed by the probe verdict</name>
  <reversibility rating="reversible">One overlay element, one supervisor observer and two boundary methods; removing them restores the current behaviour.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md (verdict 2, both halves, plus the recorded topic-notification mechanism or its absence)
    - upstream/toolkit/mozapps/update/UpdateService.sys.mjs lines 5179 and 7316 (the update-staged and update-downloaded notifications, subject and data)
    - upstream/toolkit/mozapps/update/UpdateListener.sys.mjs lines 161-176 (requestRestart: the cancellable quit-application-requested courtesy notification, then eAttemptQuit combined with eRestart)
    - powerbrowser/shell/TheiaService.sys.mjs lines 41-56 (the USER_MESSAGE table and the rule that a new key must buy a distinct next step), line 92 (the _quitObserverOff field), line 211 (where the quit observer is registered) and lines 358-360 (where it is unsubscribed) for the observer-lifetime idiom
    - powerbrowser/shell/PowerBrowserAPI.sys.mjs lines 440-450 (onQuitGranted: the add-observer plus returned-unsubscribe shape to imitate)
    - powerbrowser/shell/powerbrowser.xhtml and powerbrowser/shell/powerbrowser.css lines 60-125 (the error layer's markup and overlay styling to imitate for a slim banner)
    - powerbrowser/shell/powerbrowser.js lines 30-125 (the show and hide globals, the dump sentinel channel, and the error-layer control wiring)
    - scripts/verify-shell-error-copy.mjs lines 55-72 (the enumerated user-facing sites and the set-equality contract the new copy joins)
    - scripts/check-internals-boundary.sh lines 199-228 (the same absolute-line-number catalogue matching task 4 already renumbered against)
  </read_first>
  <files>powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/shell/TheiaService.sys.mjs, powerbrowser/shell/powerbrowser.js, powerbrowser/shell/powerbrowser.xhtml, powerbrowser/shell/powerbrowser.css, powerbrowser/INTERNAL-APIS.md</files>
  <action>Branch on verdict 2. If it confirms that the stock prompt cannot render while the shell is the only
window, add the smallest layer that closes the gap: one boundary method observing the update-staged and
update-downloaded topics and returning its own unsubscribe, one boundary method performing the restart the
same way the stock listener does (the cancellable courtesy notification first, then the combined
attempt-quit and restart), both catalogued in INTERNAL-APIS.md in the same commit and **with every
catalogue row below each insertion renumbered in that same commit**, for the reason task 4 already carries.
The supervisor subscribes for its own lifetime and unsubscribes where it already unsubscribes from the quit
observer. One new USER_MESSAGE key whose sentence names the product, states that a new version is ready,
and ends at the button on screen. One slim overlay element in the shell document styled like the existing
error layer with a single Restart button, and one `dump()` sentinel written when the banner is painted, on
the same channel the shell's other sentinels use, so task 7's row has a product-code emitter to require
rather than an absence to assert. The banner sits above the swapped content browser exactly as the error
and diagnostics layers already do, so it is reachable after the swap, which is the only time it matters.

If verdict 2 refutes the claim, do not build the layer: record in the probe file where the prompt does
appear and what makes it reachable, add only the documentation, and note there that task 7's update-ready
row pair is not created, so its verify skips those two labels by the verdict guard that task already
carries.

In either branch, if verdict 2 found that an open stock browser window does render the stock notification,
say so in the shell layer's own comment, because two affordances for one event is a thing a later reader
will otherwise take for a bug. The new copy carries no pref key, no topic name and no timeout, and the
diagnostics layer keeps carrying whatever the message does not. Stage everything, then commit as
feat(dist-4): shell-side update-ready layer.</action>
  <verify>
    <automated>git add powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/shell/TheiaService.sys.mjs powerbrowser/shell/powerbrowser.js powerbrowser/shell/powerbrowser.xhtml powerbrowser/shell/powerbrowser.css powerbrowser/INTERNAL-APIS.md && node --check powerbrowser/shell/PowerBrowserAPI.sys.mjs && node --check powerbrowser/shell/TheiaService.sys.mjs && node --check powerbrowser/shell/powerbrowser.js && bash scripts/check-internals-boundary.sh && bash scripts/check-internals-boundary.sh --catalogue && node scripts/verify-shell-error-copy.mjs && node scripts/verify-shell-error-copy.mjs --self-test && node scripts/verify-shell-error-contract.mjs && node scripts/scan-brand-residue.mjs && if grep -qE '^Verdict 2: confirmed' .planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md; then grep -q 'update-staged' powerbrowser/shell/PowerBrowserAPI.sys.mjs && grep -q 'update-downloaded' powerbrowser/shell/PowerBrowserAPI.sys.mjs; fi && git -C upstream diff --quiet && scripts/verify-platform.sh --quick</automated>
    <fails_when>a new internals touch is uncatalogued or a renumbered row disagrees with the file, the confirming verdict left no observer for either update topic in the boundary file, the new user-facing sentence carries an internal identifier, the shell error contract regresses, the upstream checkout is modified, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - The implementation branch matches verdict 2, with the refuting branch documenting rather than building and saying so where task 7's guard reads it
    - Observer registration and the restart call are the only new internals touches, both catalogued and renumbered in the same commit
    - The copy states the product, the situation and the affordance, and passes the copy gate by pattern
    - The banner reuses the existing overlay idiom and writes its own product-code sentinel, which is what makes task 7's row an assertion rather than an observation of its own harness
  </acceptance_criteria>
  <done>A staged update is visible and actionable in the interface the user actually has open, and task 7 registers the row pair that keeps it that way</done>
</task>

<task type="auto">
  <name>Repackage, then land the packaged-launch, packaged-identity, install-matrix and update-ready row pairs</name>
  <reversibility rating="reversible">Check internals sit behind stable row labels; reworking a gate touches one script.</reversibility>
  <read_first>
    - scripts/verify-platform.sh lines 420-430 (the backend-ready pid extraction helper), 565-600 (the sentinel wait idiom), 3550-3572 (the registry header and its one-row rule), 4517-4530 (the branding-identity rows and the launch rows this pair sits beside), 4780-4792 (the ledger-keyed exclusion block, whose entry-10 rows are closed and must not be re-added)
    - .mozbuild/matrix/run-matrix.sh (whole file: the untracked Linux cells to promote, the LD_LIBRARY_PATH note, the `env -u LD_LIBRARY_PATH` fix for the stock launch at line 43, the host-absolute `/run/current-system/sw/bin/firefox` on that same line, and the two wrong residue paths at line 64)
    - powerbrowser/shell/powerbrowser.js line 73 (POWERBROWSER_SHELL_SWAP, the shell-side product marker the launch row requires; line 20's POWERBROWSER_SHELL_READY is the same sentinel channel but is not one of the two required markers), lines 238 and 246 (the sidecar-prefs and app-identity sentinels)
    - theia/extensions/token-gate/src/node/token-gate-backend-contribution.ts line 137 (POWERBROWSER_BACKEND_READY, written by the backend itself: the second required marker)
    - scripts/verify-branding-identity.mjs lines 126-160 (the per-variant descriptor table the staged-package assertion extends) and 239-272 (variant selection and the override flags)
    - powerbrowser/shell/powerbrowser-sidecar.js (the dump pref, without which neither shell marker reaches stdout, which is why packaging that file and proving the launch are one interlock; the packaged copy lives inside browser/omni.ja, so a launch that reaches the markers is also proof the pref file was packaged)
    - docs/BUILD.md lines 478-500 (tier 2, `./mach build faster`, the tier the shell edits in tasks 4 and 6 need) and the per-OS install matrix section (the cell vocabulary and the staged-unexecuted convention to preserve)
  </read_first>
  <files>scripts/verify-packaged-launch.mjs, scripts/verify-packaged-identity.mjs, scripts/run-install-matrix.sh, scripts/verify-branding-identity.mjs, scripts/verify-platform.sh, docs/BUILD.md</files>
  <action>Rebuild the release variant first, then repackage. This stage owns the objdir-release rebuild: it is
the last stage before linux-release-pipeline-and-update-channel, which reads objdir-release and performs no
build of its own, and it already schedules tier-3 time. Measured on the tree today, `objdir-release/config.status`
carries `'MOZ_UPDATE_CHANNEL': 'default'`, a display version of the stock `<ESR>esr` shape and
`--enable-unverified-updates`, and `objdir-release/dist/bin/application.ini` bakes `aus5.mozilla.org`: that
objdir predates release-identity's mozconfig emission and mar-signing-and-update-integrity's flag removal, so
every fact the next stage derives from it would be a stock one until it is rebuilt. Inside `nix develop .#firefox`
with cwd upstream/ run, with `POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding-generated/release
MOZCONFIG=../.mozconfig` in the environment, `./mach configure` and then `./mach build`: roughly 55 minutes on
legion (the existing release-build row in the packaging-timings table measured 54m40s). Log mach wall time to
`.mozbuild/stage4-release-rebuild.log` and append one attributed row beside the existing objdir-release row in
that table naming this tree state, the host and the toolchain. The four levers release-identity and
mar-signing-and-update-integrity added reach this objdir through the same shared `.mozconfig`, which is why
only the two environment variables differ from the dev invocation.

Then repackage the dev variant. Task 3 produced the only package in this plan, and tasks 4, 5 and 6
have since invalidated it: tasks 4 and 6 edited jar.mn-packaged chrome sources and the preprocessed
`powerbrowser-sidecar.js`, which reach a package only through a build, and task 5 rebuilt the Theia lib
tree the staging step copied. None of them touches `.mozconfig`, so for the dev objdir the tier-2
`./mach build faster` is sufficient and no tier-3 rebuild is owed there. Run, in the order verdict 1 fixed:
`./mach build faster`, then `scripts/stage-sidecar.sh objdir` and `scripts/stage-sidecar.sh objdir-release`
(both after the release build, so the release rebuild cannot overwrite a freshly staged sidecar), then
`./mach package`.

Write the packaged-launch gate: extract the packaged tarball into a temporary prefix, launch the extracted
binary headless on a fresh profile with the library path the packaged tree needs, and require both product
markers, the backend-ready line the backend writes and the shell-swap line the shell document writes,
within the supervisor's own startup budget. Both emitters are product code at the two lines named above,
which is what makes requiring them an assertion rather than an observation of the harness. It also requires
the packaged launch to resolve its backend and Node inside the prefix, read from the sidecar-prefs
sentinel, so a launch that quietly reached the developer's checkout fails rather than passing. Its
self-test removes the staged backend from a copy of the prefix and requires the run to go red naming the
missing interface files, with the unmutated control green first.

Write the packaged-identity gate: derive every expected value at check time and compare, never from a kept
list, asserting that the packaged `application.ini` Name, Version and BuildID agree with the built objdir
the package came from, and that the staged Theia app package.json's applicationName and legalNotices agree
with the release variant's expected composition derived through the generator's own resolver. Its self-test
plants the dev suffix into a copy of the staged package.json and requires red naming the drift.

Extend `scripts/verify-branding-identity.mjs` so the release descriptor also reads the staged package.json
under `objdir-release/dist/bin`, which task 3 populated and which is the surface that would otherwise let a
release package ship a dev About dialog while every existing surface stayed green.

Promote the matrix driver to `scripts/run-install-matrix.sh`, parameterised by OS with the Linux cells live
and the other two cells staged-unexecuted with their unblocks preserved. Two fixes the untracked script
needs on the way in. First, the stock binary: resolve it through a PATH lookup with a named failure when it
is absent, never the host-absolute `/run/current-system/sw/bin/firefox`, so the row states its prerequisite
instead of being green only on legion; keep the `env -u LD_LIBRARY_PATH` fix and the pre-created profiles.
Second, the residue half: run the launch under a scratch HOME with no explicit profile argument so the
product creates its real default paths, derive the expected residue set from the packaged `application.ini`
Vendor and Name lowercased the way `nsXREDirProvider.cpp` lowercases them, never from the two wrong
literals `~/.powerbrowser` and `~/.mozilla` the untracked script carries, require the derived set to appear
while the product runs, and require it gone after uninstall. Include the pre-change binary as the positive
control for the Theia state directory, so the assertion that it no longer appears under the
environment-derived path is one that has been observed going red. Its self-test plants a residue directory
under the scratch HOME after uninstall and requires red naming it.

Append four row pairs to the registry, each beside the checks it belongs with, each with its honesty
comment, creating no sibling driver: `packaged-launch`, `packaged-identity`, `install-matrix-linux` and
`update-ready-layer`, plus a `-self-test` row for each. The update-ready pair derives the two observed
topics from UpdateService's own notify sites in the pinned tree and requires the shell layer to observe
exactly that set, requires the USER_MESSAGE key, the banner element and its button to exist and agree, and
drives the live notification and requires the banner sentinel when verdict 2 recorded a working mechanism;
its self-test plants a removed observer, a dropped button and a drifted topic and requires each to go red
naming the drift. The pair exists only on the confirming branch of verdict 2, which is why the verify below
reads the verdict before invoking it. Update docs/BUILD.md's matrix section to cite the tracked driver and
to replace the two wrong residue literals in the Linux no-residue cell with the derived paths. Stage
everything, then commit as feat(dist-4): packaged-launch and packaged-identity rows with a tracked install
matrix.</action>
  <verify>
    <automated>nix develop .#firefox --command bash -c "cd upstream && export POWERBROWSER_OBJDIR=objdir-release POWERBROWSER_BRANDING=powerbrowser/branding-generated/release MOZCONFIG=../.mozconfig && ./mach configure && ./mach build" && grep -q "'MOZ_UPDATE_CHANNEL': 'release'" objdir-release/config.status && grep -q "'MOZ_VERIFY_MAR_SIGNATURE': '1'" objdir-release/config.status && grep -q "'MOZ_APPUPDATE_HOST'" objdir-release/config.status && ! grep -q 'enable-unverified-updates' objdir-release/config.status && ! grep -q 'aus5.mozilla.org' objdir-release/dist/bin/application.ini && grep -q '^URL=https://' objdir-release/dist/bin/application.ini && grep -qF 'stage4-release-rebuild.log' docs/BUILD.md && nix develop .#firefox --command bash -c "cd upstream && MOZCONFIG=../.mozconfig ./mach build faster" && bash scripts/stage-sidecar.sh objdir && bash scripts/stage-sidecar.sh objdir-release && nix develop .#firefox --command bash -c "cd upstream && MOZCONFIG=../.mozconfig ./mach package" && git add scripts/verify-packaged-launch.mjs scripts/verify-packaged-identity.mjs scripts/run-install-matrix.sh scripts/verify-branding-identity.mjs scripts/verify-platform.sh docs/BUILD.md && node --check scripts/verify-packaged-launch.mjs && node --check scripts/verify-packaged-identity.mjs && bash -n scripts/run-install-matrix.sh && ! grep -q '/run/current-system' scripts/run-install-matrix.sh && ! grep -qE '~/\.(powerbrowser|mozilla)\b' scripts/run-install-matrix.sh && scripts/verify-platform.sh --only packaged-launch && scripts/verify-platform.sh --only packaged-launch-self-test && scripts/verify-platform.sh --only packaged-identity && scripts/verify-platform.sh --only packaged-identity-self-test && scripts/verify-platform.sh --only install-matrix-linux && scripts/verify-platform.sh --only install-matrix-linux-self-test && if grep -qE '^Verdict 2: confirmed' .planning/drafts/distribution/S4-PROBE-PACKAGING-AND-UPDATE-PROMPT.md; then scripts/verify-platform.sh --only update-ready-layer && scripts/verify-platform.sh --only update-ready-layer-self-test; fi && scripts/verify-platform.sh --only verify-branding-identity-release && node scripts/scan-brand-residue.mjs && scripts/verify-platform.sh --quick</automated>
    <fails_when>the release rebuild leaves objdir-release on the stock update channel, with signature verification still compiled out, or still baking aus5.mozilla.org (a rebuild that did not happen, or a mozconfig lever that did not reach the release variant), the release timings row or its log citation is missing, the repackage sequence fails, either new gate passes without its markers, a self-test plant fails to go red naming the drift, a new label is unreachable through --only, the matrix driver still carries a host-absolute stock binary path or either wrong residue literal, the matrix reports residue at the derived paths after uninstall, the release branding-identity row cannot read the staged package.json, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - objdir-release is rebuilt under this stage's mozconfig and carries the release update channel, MOZ_VERIFY_MAR_SIGNATURE and the manifest update host, with the wall time recorded in the packaging-timings table
    - The gates run against a package rebuilt, restaged and repackaged after tasks 4, 5 and 6, in the order verdict 1 fixed, with no tier-3 rebuild of the dev objdir
    - The packaged-launch row requires two product markers and in-prefix resolution, with a staged-backend plant proving it discriminates
    - The packaged-identity row derives every expectation at check time and goes red on the planted dev suffix
    - The release branding-identity variant reads the staged package.json under objdir-release as well as the tracked one
    - The matrix driver is tracked, OS-parameterised, resolves the stock binary by PATH, and checks residue at paths derived from the packaged application.ini under a scratch HOME with a demonstrated-red control
    - Four row pairs exist, or three plus a recorded refutation, and every created label is reachable through --only
  </acceptance_criteria>
  <done>A regression that empties the package, reintroduces the dev string, or drops the restart affordance is caught by a row rather than by a user</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| nodejs.org to the shipped package | A third-party binary enters the product at build time and executes on every user's machine. |
| The dependency tree to the notice file | Licence text is read from installed packages and redistributed as the project's own notices. |
| Packaged application directory to the supervisor | The backend entry and the Node runtime are located by path resolution inside the install prefix. |
| Command line to the stock browser window | An operating-system-supplied URL reaches a real browser window through the boundary file, on both handler branches. |
| Update service to the shell overlay | A platform observer notification drives a restart affordance in chrome. |
| Gecko profile directory to Theia state | Sidecar configuration and supervisor state move under per-profile storage. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-S4-01 | Tampering | substituted Node tarball shipped to every user | high | mitigate | The pin is an SRI hash read out of a GPG-verified SHASUMS256.txt by the operator, recorded with the signing fingerprints in docs/BUILD.md, and reproduced by `nix build`; a substituted archive fails the fetch rather than reaching a package. |
| T-S4-02 | Spoofing | a shipped runtime that is not the one the native modules were built against | medium | mitigate | The flake builds the download URL from the same `nodejs` binding the dev shells use, and the check compares the extracted binary's `--version` against `nix develop .#theia --command node --version` rather than against a literal, so a nixpkgs pin move goes red instead of shipping a mismatch. |
| T-S4-03 | Elevation of privilege | staged Node resolved from an attacker-writable location | high | mitigate | Node is resolved from the application directory read off the platform directory service (`GreD`), never from PATH, whenever the staged binary exists; the PATH search stays only as the last fallback for a build with no staged runtime. |
| T-S4-04 | Tampering | a backend entry resolved outside the install prefix | high | mitigate | The packaged-launch row reads the resolved paths from the shell's own sidecar-prefs sentinel and fails a run that reached anything outside the extracted prefix. |
| T-S4-05 | Information disclosure | Theia state shared between installs and variants under one user | medium | mitigate | The configuration directory and the supervisor state file move under the Gecko profile directory, and the matrix driver asserts the derived residue set under a scratch HOME with a demonstrated-red control; the environment-derived fallback's exclusion from that set is written at the code that keeps it. |
| T-S4-06 | Spoofing | a release package presenting dev-variant identity | medium | mitigate | The Mozilla sentence loses its build-channel suffix so one app build is correct for both variants, and the packaged-identity row plus the extended release branding-identity surface both read the staged package.json under objdir-release. |
| T-S4-07 | Elevation of privilege | a command-line URL widening what the handler can reach | medium | mitigate | Both handler branches pass an unresolved string to the already-catalogued openBrowserWindow, whose catalogue row records that it accepts a URL and a request to open a window and nothing else; no chrome document, feature string or script parameter is added, and preventDefault stays set on both paths. |
| T-S4-08 | Denial of service | a restart affordance quitting the browser at the wrong moment | medium | mitigate | The restart path imitates the stock listener: the cancellable courtesy notification first, the combined attempt-quit and restart second, driven only by the platform's own staged and downloaded topics, with the observed topic set derived from UpdateService's own notify sites by the update-ready row. |
| T-S4-09 | Tampering | licence text fabricated or omitted in the shipped notices | medium | mitigate | Notices are derived from the installed dependency tree at build time, sorted for byte stability, a dependency declaring no licence fails the emitter by name rather than being dropped, and all three files are asserted in the packaged tree rather than in the staging directory. |
| T-S4-10 | Tampering | a hand-edited Gecko patch applying as a silent no-op | medium | mitigate | Patch 040 (numbered clear of stage 3's 030) is regenerated from a patched checkout and proven non-vacuous by apply-patches --self-test alongside check-patch-surface, with upstream/ returned to its expected staged dirt. |
| T-S4-SC | Tampering | npm, pip or cargo installs | medium | mitigate | No new registry package: the notices emitter reads the already-installed tree with node builtins, and the staged app is the existing build output. |
</threat_model>

<verification>
All three probe verdicts are recorded with verbatim evidence and a positive control; the Node pin
reproduces under `nix build` from a GPG-verified hash and matches the dev shell's own node; the staging
step is idempotent over both objdirs and produces a package whose application directory carries the Theia
backend, the frontend bundle, the native modules, the Node binary, the licence and notice files, and whose
omni.ja carries the sidecar pref file; the regenerated package patch passes the patch surface and replays
non-vacuously with the upstream checkout at its expected staged dirt; the packaged launch reaches both
product markers on a fresh profile and resolves entirely inside its own prefix; the packaged identity and
the extended release branding-identity surface agree on the staged package.json under objdir-release; the
built frontend bundle carries no dev-variant string; Theia state lands under the profile and the matrix
driver finds no residue at the derived paths after uninstall; a URL argument opens a stock browser window
on both handler branches; the internals catalogue covers every new touchpoint and every renumbered row; the
copy gate passes by pattern; every new registry row and its self-test row are reachable through --only;
quick green.
</verification>

<success_criteria>
A user who extracts the Linux tarball on a machine with no developer checkout and no system Node launches
Power Browser and gets the Theia interface, with the licence and notice files beside the binary, Theia
state under their profile, a URL from the desktop entry opening a real browser window whether or not an
instance is already running, and a visible way to restart into a staged update.
</success_criteria>

<output>
Stage 4 entry and completion slice for Linux: the package becomes a working product, and the four registry
row pairs that keep it one. Stage 5 uploads this artifact and serves its updates; stages 6 and 7 repeat
this staging for their own targets against the OS-parameterised matrix driver this plan tracks.
</output>
