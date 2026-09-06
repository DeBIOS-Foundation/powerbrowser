---
phase: distribution-stage-5-linux-release-pipeline-and-update-channel
plan: "01"
type: execute
wave: 4
depends_on: [release-identity, mar-signing-and-update-integrity, packaged-product-correctness-linux]
files_modified: [docs/RELEASING.md, .github/workflows/release.yml, scripts/verify-release-workflow.mjs, scripts/verify-update-channel-live.mjs, scripts/verify-mar-update-hop.mjs, scripts/verify-endpoints.sh, scripts/verify-platform.sh, powerbrowser/endpoint-allowlist.json]
autonomous: false
requirements: [DIST-02, DIST-03, UPD-05, UPD-06, UPD-07]
must_haves:
  truths:
    - "A tag matching the release pattern builds on legion and publishes one GitHub Release; a pull request never reaches the self-hosted runner (DIST-02)"
    - "Only the sign-and-upload job on the hosted runner holds secrets, id-token and attestations; the build job on legion holds none, and the repository still holds zero repository-level Actions secrets (DIST-02)"
    - "The baked eleven-segment update URL resolves at updates.powerbrowser.org to the per-channel per-BUILD_TARGET descriptor, probed live with a path carrying the escapes and parentheses a real client sends (DIST-03)"
    - "A real installed build checks for an update inside the observation window, resolves only allowlisted hosts, and the host it resolves for the descriptor equals the host baked into the application.ini beside the binary that was launched (UPD-05)"
    - "One real N to N+1 hop lands off the published Release: descriptor hash equals the MAR sha512, post-hop BuildID equals N+1 with appVersion not older, zero Mozilla hosts, signature and attestation both verify (UPD-06)"
    - "release.yml's final job fails the release when the live channel and the published Release disagree (UPD-07)"
  artifacts:
    - path: "docs/RELEASING.md"
      provides: "The release procedure, the derived update-origin facts, the runner module, the descriptor tree layout, the release-manifest bridge and the per-target release asset name table every later stage reads"
      contains: "## Release asset names"
    - path: ".github/workflows/release.yml"
      provides: "Tag-triggered build on legion plus gated sign-and-upload on a hosted runner, draft-then-publish under immutable releases"
      contains: "environment: release"
    - path: "scripts/verify-release-workflow.mjs"
      provides: "Static release-workflow gate with self-test (triggers, SHA pins, actions-policy admissibility, per-job permissions, derived asset set)"
      min_lines: 200
    - path: "scripts/verify-update-channel-live.mjs"
      provides: "UPD-07 live channel gate reading the build job's release-manifest.json, with self-test"
      min_lines: 180
    - path: "scripts/verify-mar-update-hop.mjs"
      provides: "served: release mode selecting the release assertion set over the loopback set"
      contains: "served"
    - path: "powerbrowser/endpoint-allowlist.json"
      provides: "github.com and release-assets.githubusercontent.com rows from a layer-3 observation plus the crash-reports deny row"
      contains: "release-assets.githubusercontent.com"
    - path: "scripts/verify-platform.sh"
      provides: "Four appended registry rows, three in the quick array and the live row in the full block"
      contains: "update-channel-live"
  key_links:
    - from: ".github/workflows/release.yml"
      to: "scripts/verify-update-channel-live.mjs"
      via: "the workflow's final job runs the live channel gate against the release it just published"
      pattern: "verify-update-channel-live"
    - from: "scripts/verify-update-channel-live.mjs"
      to: "release-manifest.json"
      via: "the gate derives the descriptor host, the eleven-segment path, the channel and the BUILD_TARGET set from the manifest the build job wrote out of the built tree, never from a literal and never from an objdir the hosted runner does not have"
      pattern: "--manifest"
    - from: ".github/workflows/release.yml"
      to: ".github/settings/actions-selected.json"
      via: "every uses: in the workflow is GitHub-owned or matches a tracked patterns_allowed entry, which the static gate derives from that body"
      pattern: "patterns_allowed"
    - from: "scripts/verify-endpoints.sh"
      to: "powerbrowser/endpoint-allowlist.json"
      via: "layer 3 forces the first update-check timer fire inside its window and holds every resolved host to the allowlist"
      pattern: "release-assets.githubusercontent.com"
    - from: "scripts/verify-mar-update-hop.mjs"
      to: ".mozbuild/mar-hop/hop.json"
      via: "served selects the release assertion set over the loopback set, including which evidence files are required"
      pattern: "served"
---

<objective>
Ship the first public release on Linux and turn the update channel on. Three pieces land together
because none of them is provable alone: the tag-to-Release pipeline (DIST-02), the project-owned
update origin the shipped binary already bakes (DIST-03), and the three proofs that the channel is
real rather than configured (UPD-05 host observation, UPD-06 hop off the published Release, UPD-07
liveness as the pipeline's own final job).

Purpose: after this plan a user downloads a Linux tarball from GitHub Releases, and the build they
install fetches its next release from infrastructure this project controls, with the MAR signature
verification stage mar-signing-and-update-integrity turned on doing real work.
Output: release.yml, docs/RELEASING.md, two new gates with four registry rows, three allowlist rows,
a release-mode hop drill, and one published Release.
</objective>

<context>
@.planning/seeds/SEED-001-standard-distribution-updates-reports.md
@docs/BUILD.md
@docs/RELEASING.md
@.github/workflows/verify.yml
@powerbrowser/endpoint-allowlist.json
@scripts/verify-mar-update-hop.mjs

Live state re-read on 2026-09-06 against the pinned tree, the built objdirs and the live GitHub API
with `gh` 2.99.0. Every value below came from a read, not from the seed:

- The release objdir arrives at this stage already rebuilt. Stage packaged-product-correctness-linux task 7
  owns that rebuild (release variant, roughly 55 minutes, recorded beside the existing objdir-release row in
  the packaging-timings table), and this stage performs no build of its own: every objdir-release read below
  assumes that rebuild landed. The state recorded here is the pre-rebuild one, kept because it is what makes
  each assertion discriminating.
- `objdir-release/dist/bin/application.ini` still bakes, before that rebuild,
  `URL=https://aus5.mozilla.org/update/6/%PRODUCT%/.../update.xml`, and
  `generated/identity.configure` emits only MOZ_APP_VENDOR, MOZ_APP_UA_NAME, MOZ_SERVICES_HEALTHREPORT
  and MOZ_NORMANDY. `upstream/build/moz.build:97-99` defaults the appini define to `aus5.mozilla.org`
  and overrides it only from `CONFIG["MOZ_APPUPDATE_HOST"]`. Baking the manifest host is UPD-02,
  owned by stage release-identity, which is therefore in `depends_on`: without it task 1 is red on
  its first assertion and nothing below can run. There is no `[urls]` table in configuration.toml today.
- The path after `/update/6/` is eleven segments (ten substitutions plus `update.xml`), measured:
  `sed -n 's|^URL=https://[^/]*/update/6/||p' objdir-release/dist/bin/application.ini | tr / '\n' | wc -l`
  prints 11. `objdir-release/config.status` carries `'OS_TARGET': 'Linux'`,
  `'TARGET_XPCOM_ABI': '"x86_64-gcc3"'` (note the embedded double quotes, which the `tr -d` in the
  verifies strips) and `'MOZ_UPDATE_CHANNEL': 'default'`; joined, the BUILD_TARGET is
  `Linux_x86_64-gcc3`, matching the observed value the seed recorded.
- The real client path segments are not sanitised. `upstream/toolkit/modules/UpdateUtils.sys.mjs:1073-1126`
  builds OS_VERSION as sysinfo name plus version, then appends `" (" + secondaryLibrary + ")"` on
  every non-Windows platform, then `encodeURIComponent`, which leaves `(` and `)` unescaped: on Linux
  the segment looks like `Linux%206.18.49%20(GTK%203.24.49)`. SYSTEM_CAPABILITIES is
  `getSystemCapabilities()` (:937-939), `"ISET:" + instructionSet + ",MEM:" + memoryMB`, which encodes
  to `ISET%3ASSE4_2%2CMEM%3A63456`. A probe built from `default` literals would not exercise the
  matching question it exists to settle.
- Cloudflare documentation, re-read this session: `_redirects` supports placeholders
  (`:[A-Za-z]\w*`, matching every character except the path delimiter `/`) and 200 proxying to a
  relative path on the same site; a file is capped at 100 dynamic redirects with a 1000-character
  limit per declaration; a destination may carry a fragment. The rule this plan ships carries **ten**
  placeholders over the **eleven**-segment path, well inside both caps.
- `scripts/verify-mar-update-hop.mjs:241-250` fails a hop when `hop.n.version === hop.nplus1.version`
  **or** the build IDs match. The ratified version scheme keeps appVersion at the ESR version and puts
  the revision in the tag and display version, so N (the stage packaged-product-correctness-linux
  package) and N+1 (the first Release) share appVersion by construction. Upstream itself does not treat
  that as a non-upgrade: `upstream/toolkit/mozapps/update/UpdateService.sys.mjs:1954-1963`
  (`updateIsAtLeastAsOldAs`) refuses an offer only when the version comparison is zero **and** the
  build IDs are equal. Task 7 therefore gives the release mode a distinct-buildID requirement plus a
  not-older appVersion requirement, and leaves the loopback mode's distinct-version rule untouched.
- The same file's loopback assertion set cannot hold for a release hop: :216 requires
  `server-access.log` among the evidence files and :300-305 requires GET lines in it for the descriptor
  and a `.mar`. A release hop is served by Cloudflare Pages and GitHub's asset host and produces no
  fork access log. `served` therefore selects an assertion set, including which evidence files are
  required, rather than adding to one.
- `scripts/verify-endpoints.sh:46-47` hard-wires `BIN_DIR="$REPO_ROOT/objdir/dist/bin"` with no
  override, and layer 3 launches `$BIN_DIR/powerbrowser`. The baked-host assertion therefore reads
  `$BIN_DIR/application.ini`, beside the binary it launched, so the comparison is self-consistent
  whichever objdir is current.
- The two preferences docs/BUILD.md's loopback drill used to force a check do not move the first
  timer fire. `app.update.background.force` is read only by
  `upstream/toolkit/mozapps/update/BackgroundUpdate.sys.mjs:135,511,558` and
  `BackgroundTask_backgroundupdate.sys.mjs:77`, all inside the `--backgroundtask backgroundupdate`
  path, which docs/BUILD.md already records as unregistered on Linux. `app.update.interval` cannot
  shorten the first fire: `upstream/toolkit/components/timermanager/UpdateTimerManager.sys.mjs:186`
  initialises `lastUpdateTime` to 0 so `lastUpdateTime + interval` is always in the past for a fresh
  profile. The lever that does move it is `app.update.timerFirstInterval` (:97-101,
  `Math.max(getIntPref(..., 30000), minFirstInterval)` with `minFirstInterval = 10000` at :77), and
  `nsUpdateService.manifest:1` registers the update check under the `update-timer` category as
  `background-update-timer`, which :274-288 fires alongside every other due consumer in the same
  notify pass. Ten seconds is the floor; layer 3's existing 35-second window then carries 25 seconds
  of margin instead of five.
- Live repository API, read this session: `actions/permissions/fork-pr-contributor-approval` returns
  `{"approval_policy":"first_time_contributors"}`; `actions/permissions/fork-pr-workflows` returns
  404 (it is the private-repository object and carries no `approval_policy`). `actions/secrets`
  `total_count` is 0, and stage prerequisites-and-hardening's `repo-controls` row asserts it stays 0,
  because the MAR key is an **environment** secret. Any assertion expecting a repository-level secret
  would contradict a permanent gate.
- `.github/settings/actions-selected.json`, written by stage prerequisites-and-hardening, sets
  `github_owned_allowed: true`, `verified_allowed: true` and `patterns_allowed:
  ["cachix/install-nix-action@*"]`, under `allowed_actions: selected` with `sha_pinning_required: true`.
  Every `actions/*` action this workflow needs (checkout, upload-artifact, download-artifact,
  attest-build-provenance) is GitHub-owned and therefore already admitted; nothing in this plan needs
  to widen that body. The static gate asserts admissibility by deriving it from the body, so a future
  third-party action added to the workflow reddens rather than failing at run time.
- The release tag pattern is fixed by stage prerequisites-and-hardening's two rulesets and the
  release environment's deployment branch policy: `v[0-9]*.[0-9]*.[0-9]*-[0-9]*`. Immutable releases
  are on, and that stage's docs/RELEASING.md already records the consequence this plan implements:
  assets cannot change after publication, so the workflow creates a draft, uploads every asset, then
  publishes.
- The nixpkgs facts, checked against the nixos MCP on unstable and against the flake's own pinned
  nixpkgs (`/nix/store/c5cbz5j...-source/nixos/modules/services/continuous-integration/github-runner`):
  `github-runner` 2.333.1, `gh` 2.89.0, `nix` 2.31.4; legion's system profile carries `gh` 2.99.0,
  which has `gh attestation verify`. Every option the module block names exists in the pinned module:
  `tokenFile` options.nix:66, `extraLabels` :325, `replace` :346, `extraPackages` :356, `ephemeral`
  :392, plus `enable`, `url`, `name`, `tokenType`. `count` defaults to 1 (options.nix:214-217) and
  service.nix:88 sets `svcName = "github-runner-${name}"` with the bare name kept at count 1, so the
  unit is `github-runner-powerbrowser-release.service`. service.nix:403-409 puts the tokenFile on the
  service's `InaccessiblePaths`, so the runner process cannot read the PAT it was configured from.
- `/home/chris/coding/powerbrowser-website` holds exactly `index.html` and `README.md`. The download
  section is an in-page anchor, `index.html:328` `<section id="download" ...>`. There is no `/download`
  route and no `_redirects` file, so a probe of `https://powerbrowser.org/download` fails today for a
  reason that has nothing to do with this plan's work.
- The build-host allowlist policy is settled before this stage runs and is not UPD-05's to decide. Stage
  packaged-product-correctness-linux task 2 added a `scope` field to `powerbrowser/endpoint-allowlist.json`
  (`build` or `runtime`, absent meaning `runtime`), made `allowlist_host_allowed` refuse to match a `build`
  row, and added `nodejs.org` as the first such row. UPD-05 here is therefore only about hosts a launched
  build actually resolves, which is what all three verify-endpoints layers observe; task 7 adds rows for
  exactly those and touches neither the field nor the function.
- `objdir/config.status` and `objdir-release/config.status` both carry
  `'MOZ_CRASHREPORTER_URL': 'https://crash-reports.mozilla.com'` while `.mozconfig:13` carries
  `--disable-crashreporter`. UPD-05 as seeded also asks for that deny row, and no other stage claims
  it, so task 7 adds it.
- Literal hazards for the new files: `scripts/verify-upstream-pins.mjs` sweeps `.github/` and
  `scripts/` for `FIREFOX_<digit>` literals, so release.yml and both new gates must carry none;
  `scripts/verify-manifest-literals.mjs` sweeps for the multi-word display forms, which none of these
  files needs. The residual-brand scan and both sweeps iterate `git ls-files`, so every new file is
  staged before any scan.
- Concurrency: this plan writes nothing under `.planning/`. `scripts/verify-platform.sh:2705` feeds
  `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` into `allowlist-doc-consistency`, which the
  quick gate at the end of every task runs; those two files belong to the concurrent v1.3 session and
  a red there is triaged to that session, never to this stage.
</context>

<tasks>

<task type="auto">
  <name>Derive the update-origin facts from the built tree and write the release procedure</name>
  <reversibility rating="reversible">One document plus derived values read back by every later task; nothing built or published yet.</reversibility>
  <read_first>
    - upstream/build/application.ini.in lines 53-56 (the baked [AppUpdate] URL template and its ten substitutions)
    - upstream/build/moz.build lines 96-99 (MOZ_APPUPDATE_HOST default aus5.mozilla.org, CONFIG override preferred)
    - upstream/toolkit/modules/UpdateUtils.sys.mjs lines 88-92, 937-939 and 1052-1126 (BUILD_TARGET is appinfo.OS plus ABI; SYSTEM_CAPABILITIES and OS_VERSION are the two segments that carry escapes and parentheses)
    - docs/BUILD.md lines 762-900 (the loopback MAR build, serve and hop procedure this stage promotes to a real channel)
    - docs/RELEASING.md as stage prerequisites-and-hardening left it (SEC-01 wrote the process-control half, including the immutable-releases consequence and the release tag pattern; this task appends the procedure half)
    - .github/settings/actions-selected.json (github_owned_allowed true plus the one pattern; the admissibility rule the next task's gate derives from)
  </read_first>
  <files>docs/RELEASING.md</files>
  <action>Derive, never assert. Read objdir-release/dist/bin/application.ini for the baked [AppUpdate] URL and split it into host plus path; read objdir-release/config.status for OS_TARGET, TARGET_XPCOM_ABI and MOZ_UPDATE_CHANNEL, joining the first two with an underscore to get the BUILD_TARGET directory name. The verify requires the baked host to be the manifest host and to appear in generated/identity.configure. That is not a branch: it is the assertion that stage release-identity landed. A red there means UPD-02 is unmet and the fix is that dependency, not a change here; do not add a stop path that records the gap and passes anyway, because a task whose verify is red is not done.

Write docs/RELEASING.md's procedure half from the derived values only: the observed baked host and the eleven path segments after /update/6/; the observed BUILD_TARGET and channel, each recorded with the tree, host and toolchain that produced it in the BUILD.md attribution style; the descriptor tree layout &lt;channel&gt;/&lt;BUILD_TARGET&gt;/update.xml and the single `_redirects` rule that maps the baked path onto it, stated as ten placeholders over the eleven-segment path; the decision that descriptors live in a dedicated public repository DeBIOS-Foundation/powerbrowser-updates rather than the website repository, with the reason stated (a Pages project serves one asset tree, so putting the descriptors in the website repository would apply the update `_redirects` rule to powerbrowser.org as well, redeploy the marketing site on every release, and widen the release job's write token from one small repository to the public site); the versioned and stable asset name pairs, written as a TABLE headed `## Release asset names` with one row per target giving the target key, the versioned form and the stable form, plus the generation rule stated once above it (`&lt;app_basename&gt;-&lt;version&gt;.&lt;target-token&gt;.&lt;ext&gt;` for the versioned form and `&lt;app_basename&gt;-&lt;target-token&gt;.&lt;ext&gt;` for the stable form, with `&lt;version&gt;` the tag minus its leading `v` and `&lt;target-token&gt;` the lowercase OS-and-arch token this stage observed, `linux-x86_64` here). The Linux row is filled from this tree; the Windows and macOS rows are present with their target keys and an explicit `pending stage windows-unsigned` / `pending stage macos-adhoc-signed` marker in place of names, so the two later stages fill a row that already exists rather than inventing a convention, and stage listings-and-cadence reads the table instead of asking. Name the fixed assets that carry no target in the same table's footnote: SHA256SUMS, LICENSING.md and THIRD-PARTY-NOTICES.txt; the rule that a descriptor's patch URL is always the versioned immutable /releases/download/&lt;tag&gt;/ form and never the latest-download form; the draft-then-publish order the immutable-releases consequence already recorded in this document requires; the release-manifest.json bridge (what the build job writes out of the built tree, and that it is the only thing the live channel gate reads, because the hosted final job has no objdir); and the services.github-runners module block the next task applies. Name no value this task did not read out of the tree. Stage the file before any scan, commit as docs(dist-05): release procedure and derived update-origin facts.</action>
  <verify>
    <automated>git add docs/RELEASING.md && BAKED=$(sed -n 's|^URL=https://\([^/]*\)/update/6/.*|\1|p' objdir-release/dist/bin/application.ini) && test -n "$BAKED" && test "$BAKED" != aus5.mozilla.org && grep -qF "$BAKED" generated/identity.configure && test "$(sed -n 's|^URL=https://[^/]*/update/6/||p' objdir-release/dist/bin/application.ini | tr / '\n' | wc -l)" -eq 11 && OS=$(grep -m1 OS_TARGET objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && ABI=$(grep -m1 TARGET_XPCOM_ABI objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && CH=$(grep -m1 MOZ_UPDATE_CHANNEL objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && grep -qF "${OS}_${ABI}" docs/RELEASING.md && grep -qF "$BAKED" docs/RELEASING.md && grep -qF "${CH}/${OS}_${ABI}/update.xml" docs/RELEASING.md && grep -qF "powerbrowser-updates" docs/RELEASING.md && grep -qF "services.github-runners" docs/RELEASING.md && grep -qF "release-manifest.json" docs/RELEASING.md && grep -qF "releases/download/" docs/RELEASING.md && grep -qF '## Release asset names' docs/RELEASING.md && grep -qE '\|.*linux-x86_64.*\|' docs/RELEASING.md && grep -qF 'pending stage windows-unsigned' docs/RELEASING.md && grep -qF 'pending stage macos-adhoc-signed' docs/RELEASING.md && node scripts/scan-brand-residue.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the built application.ini still bakes aus5.mozilla.org or a host absent from generated/identity.configure (stage release-identity did not land), the path is not eleven segments, the asset-name table is absent, carries no filled Linux row, or does not mark the two later targets as pending, the document names a BUILD_TARGET, channel, descriptor path or host the tree does not produce, the descriptor-repository decision or the release-manifest bridge is unrecorded, the brand scan finds residue, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Every fact in docs/RELEASING.md is read out of objdir-release, not written from the seed
    - The asset-name table states the generation rule once and carries a filled Linux row plus two rows marked pending, so the later target stages and stage listings-and-cadence read a name instead of inventing one
    - The baked host equals the manifest host and the path is the eleven-segment shape
    - BUILD_TARGET and channel are derived and attributed to the tree, host and toolchain that produced them
    - The descriptor-repository decision, the immutable-releases draft-then-publish order and the release-manifest bridge are recorded before any infrastructure exists
  </acceptance_criteria>
  <done>The facts the pipeline depends on are derived and written</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Register legion as an ephemeral self-hosted runner and set the outside-collaborator gate</name>
  <reversibility rating="costly">Removing the runner needs a second /etc/nixos change and a GitHub de-registration; the PAT is long-lived custody the operator now holds.</reversibility>
  <read_first>
    - docs/RELEASING.md (the module block task 1 wrote, and the secrets inventory stage prerequisites-and-hardening wrote)
    - CLAUDE.md, section Environment (nix develop .#firefox and .#theia are the only build shells) and section NixOS System Config in the global instructions (the pkexec nrs flow)
    - .github/workflows/verify.yml lines 30-46 (the contents: read plus persist-credentials: false token posture every job in this repo inherits)
  </read_first>
  <files></files>
  <action>Operator steps, in order. (1) On github.com create a fine-grained personal access token scoped to the single repository DeBIOS-Foundation/powerbrowser with Read and Write access to repository self-hosted runners and no other permission. (2) Write it with no trailing newline to a root-owned file: `pkexec bash -c 'install -d -m 0700 /var/lib/secrets; printf %s "&lt;token&gt;" &gt; /var/lib/secrets/github-runner-pat; chmod 0600 /var/lib/secrets/github-runner-pat'`. (3) Add to /etc/nixos/configuration.nix, every option verified against the pinned module: `services.github-runners.powerbrowser-release = { enable = true; url = "https://github.com/DeBIOS-Foundation/powerbrowser"; tokenFile = "/var/lib/secrets/github-runner-pat"; tokenType = "access"; ephemeral = true; replace = true; name = "legion"; extraLabels = [ "legion" ]; extraPackages = with pkgs; [ git gh nix ]; };` (github-runner 2.333.1, gh 2.89.0 and nix 2.31.4 in nixpkgs unstable; legion's system profile carries gh 2.99.0, which also has `gh attestation verify`). Two properties are load-bearing and both are module behaviour, not hope: `ephemeral = true` de-registers the runner after one job and wipes the state directory on the next start, so no job inherits another job's tree or environment; and the module places `tokenFile` on the service's `InaccessiblePaths`, so the runner process cannot read the PAT it was configured from. `count` defaults to 1, so the unit is `github-runner-powerbrowser-release.service`. (4) Apply through the documented flow: `pkexec bash -c 'export PATH=/run/current-system/sw/bin:/run/wrappers/bin:$PATH; nrs "feat: legion ephemeral github runner for powerbrowser release builds"'`. (5) In repository Settings &gt; Actions &gt; General set Fork pull request workflows from outside collaborators to Require approval for all external contributors, and update `.github/settings/fork-pr-approval.json` only if its `approval_policy` is not already `all_external_contributors` (stage prerequisites-and-hardening set it there; this step is a read-back, not a second application). (6) Confirm the `release` environment still carries a required reviewer and that the MAR key from stage mar-signing-and-update-integrity is an **environment** secret. Do not put any secret on legion, and do not create a repository-level Actions secret: the repo-controls row asserts that count stays zero.</action>
  <verify>
    <automated>R=DeBIOS-Foundation/powerbrowser && systemctl is-enabled github-runner-powerbrowser-release.service | grep -qx enabled && pkexec stat -c '%U %a' /var/lib/secrets/github-runner-pat | grep -qx 'root 600' && gh api repos/$R/actions/runners --jq '[.runners[] | select(.status=="online") | .labels[].name]' | grep -q '"legion"' && test "$(gh api repos/$R/actions/permissions/fork-pr-contributor-approval --jq .approval_policy)" = all_external_contributors && test "$(gh api repos/$R/environments/release --jq '[.protection_rules[] | select(.type=="required_reviewers")] | length')" -ge 1 && test "$(gh api repos/$R/actions/secrets --jq .total_count)" -eq 0 && test "$(gh api repos/$R/environments/release/secrets --jq .total_count)" -ge 1 && nix develop .#theia --command scripts/verify-platform.sh --only repo-controls</automated>
    <fails_when>the unit is not enabled, the PAT file is not root-owned mode 0600, no online runner carries the legion label, the outside-collaborator approval policy is not all_external_contributors, the release environment carries no required reviewer or no secret, a repository-level Actions secret exists, or the settings-drift row from stage prerequisites-and-hardening reddens</fails_when>
  </verify>
  <acceptance_criteria>
    - An online runner labelled legion is registered against the repository and its unit is ephemeral
    - The PAT file is root-owned mode 0600 and is on the service's InaccessiblePaths, so the runner user cannot read it
    - Outside-collaborator workflow runs require approval and the tracked settings body still matches live state
    - The release environment carries a required reviewer and the only secrets are environment secrets
  </acceptance_criteria>
  <done>legion answers as an ephemeral runner and the repository gate is on</done>
</task>

<task type="auto">
  <name>release.yml plus the static release-workflow gate</name>
  <reversibility rating="costly">The workflow's job split, permission map and asset names are addressed by the descriptor emitter, the download page and the live gate; renaming an asset breaks the stable download URL a shipped build already resolves.</reversibility>
  <read_first>
    - .github/workflows/verify.yml (whole file: the SHA-pin, permissions and nix develop precedents this workflow follows)
    - .github/workflows/rebase-upstream.yml lines 20-50 (workflow_dispatch input shape and the token posture comment)
    - .github/settings/actions-selected.json and .github/settings/actions-permissions.json (github_owned_allowed plus the pattern list, under allowed_actions selected with sha_pinning_required true; the admissibility rule the gate derives)
    - docs/RELEASING.md (task 1: asset name pairs, descriptor layout, immutable patch URL rule, draft-then-publish order, release-manifest.json contents; and the release tag pattern stage prerequisites-and-hardening fixed)
    - docs/BUILD.md lines 800-860 (mach package, precomplete, make_full_update.sh and the MAR_CHANNEL_ID handling the build job reuses)
    - scripts/verify-mode-toggle-commands.mjs (the derive-then-set-equality gate skeleton with plant-landed self-test asserts)
  </read_first>
  <files>.github/workflows/release.yml, scripts/verify-release-workflow.mjs, scripts/verify-platform.sh</files>
  <action>Write .github/workflows/release.yml. Triggers: push tags matching `v[0-9]*.[0-9]*.[0-9]*-[0-9]*` plus workflow_dispatch; never pull_request. That is the same pattern the two tag rulesets and the release environment's deployment branch policy carry, and it never matches any `v1.*` milestone tag, which is the set `git tag -l 'v1.*'` returns rather than a fixed list of three or four.

Build job `build-linux`: `runs-on: [self-hosted, legion]`, `permissions: contents: read` only, no `environment:`, and no `secrets.` reference anywhere in it. Steps run inside `nix develop .#firefox` for the Gecko build, package and MAR emission and inside `nix develop .#theia` for the sidecar staging. Its last step writes `release-manifest.json` out of the built tree and never from literals: the baked [AppUpdate] URL from `dist/bin/application.ini`, the [App] Version and BuildID from the same file, OS_TARGET, TARGET_XPCOM_ABI and MOZ_UPDATE_CHANNEL from `config.status`, the joined BUILD_TARGET, and the on-disk filenames of the packaged tarball and the MAR. That file is the bridge the final job reads, and it is the reason the live gate needs no objdir on the hosted runner. Upload it with the tarball, the MAR, and `dist/bin/application.ini` through actions/upload-artifact.

Sign-and-upload job `sign-upload`: `runs-on: ubuntu-latest`, `needs: build-linux`, `environment: release`, `permissions: contents: write` plus `id-token: write` plus `attestations: write`, and it is the only job carrying those three. It downloads the artifacts, including the `mar-tools` artifact the build job uploaded, and does every signing step through the tracked scripts rather than through inline signmar calls, all inside `nix develop .#theia` because those binaries request the flake-pinned /nix/store glibc interpreter and nixpkgs has no `signmar` package at all: it decodes the `MAR_SIGNING_P12_B64` environment secret into a RAM-backed file and the `MAR_SIGNING_P12_PASSWORD` secret into a password file, runs `bash scripts/sign-mar.sh sign --nick mar-primary --p12 &lt;that file&gt; --p12-password-file &lt;that file&gt;` over every MAR, then `bash scripts/sign-mar.sh verify --cert brand/mar-primary.der` over every signed MAR BEFORE any upload (the tracked certificate is the independent comparand proving the secret's key is the one clients embed), then writes SHA256SUMS over the whole asset set, attaches LICENSING.md, THIRD-PARTY-NOTICES.txt and a source tarball, and names every asset under both a versioned and a stable form as docs/RELEASING.md records. Because immutable releases are on, it creates the release as a **draft** carrying every asset in one call, `gh release create "$TAG" --draft --generate-notes &lt;every asset&gt;`, runs actions/attest-build-provenance over the release artifacts, emits one descriptor per BUILD_TARGET with `node scripts/build-update-xml.mjs --emit`, passing `--channel` the `MOZ_UPDATE_CHANNEL` value recorded in `release-manifest.json` (the update channel and the `%CHANNEL%` path segment, never the MAR channel id), and commits the descriptor tree to DeBIOS-Foundation/powerbrowser-updates with the repository-scoped token, and only then publishes with `gh release edit "$TAG" --draft=false`. Attaching an asset to an already-published immutable release is refused, which is why the draft exists.

Final job `channel-live`: `needs: sign-upload`, `runs-on: ubuntu-latest`, `permissions: contents: read`, downloads the build artifact for `release-manifest.json`, and runs `node scripts/verify-update-channel-live.mjs --manifest &lt;downloaded path&gt;` against the release just published.

Every `uses:` is pinned by a 40-character commit SHA with the version in a trailing comment, resolved with `gh api repos/&lt;owner&gt;/&lt;action&gt;/git/ref/tags/&lt;tag&gt;` at authoring time; invent no SHA. Keep every action GitHub-owned (`actions/*`) or already covered by `.github/settings/actions-selected.json`, because the repository's actions policy is `selected` and a third-party action outside that body cannot run.

Then write scripts/verify-release-workflow.mjs. It derives every expectation from the tree at check time and compares as set equality, so an addition and a removal both go red naming the drift: the uploaded asset base names from configuration.toml's [identity] app_basename plus the tag shape docs/RELEASING.md records plus the fixed notices, SHA256SUMS and source-tarball names, never a hand-kept list; and the admissible action set from `.github/settings/actions-selected.json`'s `github_owned_allowed` flag and `patterns_allowed` entries. It asserts that no trigger is pull_request, that the tag pattern matches `v&lt;ESR&gt;-1` for the ESR the tree is pinned at (`v153.2.0-1` after stage prerequisites-and-hardening) and matches no member of the set `git tag -l 'v1.*'` returns at check time, never a hand-kept list of milestone tags, that every `uses:` value is a 40-hex SHA, that every `uses:` is admissible under the derived action set, that `id-token`, `attestations` and `contents: write` each appear on exactly one job and that job carries `environment: release`, that no job whose `runs-on` carries the legion label references `secrets.` at all, that the draft creation precedes the publish step, that the final job invokes verify-update-channel-live.mjs with a `--manifest` argument; and that the sign job invokes each of `scripts/sign-mar.sh sign --nick mar-primary`, `scripts/sign-mar.sh verify --cert brand/mar-primary.der` and `scripts/build-update-xml.mjs --emit`, in that order, and names both `MAR_SIGNING_P12_B64` and `MAR_SIGNING_P12_PASSWORD`, so a rename in either plan reddens here rather than at a release. Give it a `--self-test` that is green first then plants, each required to go red naming the drift: an unpinned action, an added pull_request trigger, `id-token: write` moved onto the legion job, a secret reference in the legion job, a dropped asset name, a third-party action absent from the tracked patterns_allowed body, a verify invocation removed from between the sign and the upload, and a renamed signing secret.

Both rows are honestly quick: the gate reads tracked YAML and tracked JSON only, with no build, browser, display or network. Append the full row and its self-test row to the quick `CHECKS=(` array (opened at scripts/verify-platform.sh:3572) beside an existing static pair, with honesty comments. No sibling driver. Stage all three files before any scan, commit as feat(dist-05): release workflow and its static gate.</action>
  <verify>
    <automated>git add .github/workflows/release.yml scripts/verify-release-workflow.mjs scripts/verify-platform.sh && node --check scripts/verify-release-workflow.mjs && node scripts/verify-release-workflow.mjs && node scripts/verify-release-workflow.mjs --self-test && nix develop .#theia --command scripts/verify-platform.sh --only release-workflow && nix develop .#theia --command scripts/verify-platform.sh --only release-workflow-self-test && ! grep -q 'pull_request' .github/workflows/release.yml && grep -q 'environment: release' .github/workflows/release.yml && grep -qF -- '--draft' .github/workflows/release.yml && grep -qF -- '--draft=false' .github/workflows/release.yml && grep -qF -- '--manifest' .github/workflows/release.yml && grep -qF 'scripts/sign-mar.sh sign --nick mar-primary' .github/workflows/release.yml && grep -qF 'scripts/sign-mar.sh verify --cert brand/mar-primary.der' .github/workflows/release.yml && grep -qF 'scripts/build-update-xml.mjs --emit' .github/workflows/release.yml && grep -qF 'MAR_SIGNING_P12_B64' .github/workflows/release.yml && grep -qF 'MAR_SIGNING_P12_PASSWORD' .github/workflows/release.yml && test "$(grep -cE 'uses:[[:space:]]+[^[:space:]]+@[0-9a-f]{40}' .github/workflows/release.yml)" -eq "$(grep -cE '^[[:space:]]*uses:' .github/workflows/release.yml)" && test "$(grep -c 'id-token: write' .github/workflows/release.yml)" -eq 1 && test "$(grep -c 'attestations: write' .github/workflows/release.yml)" -eq 1 && ! grep -qE 'FIREFOX_[0-9]' .github/workflows/release.yml scripts/verify-release-workflow.mjs && node scripts/scan-brand-residue.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the sign job does not invoke sign-mar.sh sign, sign-mar.sh verify against the tracked certificate before any upload, or build-update-xml.mjs --emit, or does not name both signing secrets, a pull_request trigger exists, any action is unpinned or pinned by tag or is inadmissible under the tracked actions policy, id-token or attestations appears on more than one job, a legion job names a secret, the draft-then-publish order is absent, the final job is called without a manifest path, a FIREFOX_ tag literal reaches a swept directory, the gate is red on the unmodified tree, any of the six plants fails to go red naming the drift, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Tag and workflow_dispatch are the only triggers and the pattern never matches a milestone tag
    - The build job on legion holds contents: read, no environment and no secret reference
    - Exactly one job holds id-token, attestations and contents: write, and it is the release-environment job
    - The asset set and the admissible action set are both derived from tracked bodies and compared as set equality, with plants proving both directions
    - The release is created as a draft carrying every asset and published only after attestation, as immutable releases require
  </acceptance_criteria>
  <done>The pipeline exists and its shape is enforced mechanically before it has ever run</done>
</task>

<task type="auto">
  <name>The update-channel-live gate (UPD-07)</name>
  <reversibility rating="reversible">One script plus two registry rows; the workflow already calls it by name.</reversibility>
  <read_first>
    - scripts/verify-mar-update-hop.mjs lines 100-175 (buildUpdateXml and parseUpdateXml, the one descriptor shape this gate parses)
    - docs/RELEASING.md (descriptor tree layout, the versioned patch-URL rule, and what release-manifest.json carries)
    - scripts/verify-platform.sh line 4282 (the mar-update-hop-self-test row inside the quick CHECKS=( array opened at 3572) and line 4547 (the mar-update-hop full row inside the CHECKS+=( block opened at 4453, whose header comment says the row lives in the full set) -- the pair is 265 lines apart in two different arrays, and this gate splits the same way
    - scripts/verify-crash-collector.mjs lines 190-230 (a self-test that stands up a fixture in mkdtemp, the twin pattern for the honestly-quick half)
  </read_first>
  <files>scripts/verify-update-channel-live.mjs, scripts/verify-platform.sh</files>
  <action>Write the live channel gate. It takes `--manifest &lt;path&gt;` and derives everything from that file, which release.yml's build job wrote out of the built tree: the descriptor host and the eleven-segment path template from the recorded baked [AppUpdate] URL, the channel from the recorded MOZ_UPDATE_CHANNEL, and the BUILD_TARGET set from the manifest's per-target entries. It hand-keeps nothing and reads no objdir, because the job that runs it is on a hosted runner that has none. It compares the manifest's BUILD_TARGET set against the descriptor directories present under the channel at the live origin as set equality, so a target with no descriptor and a descriptor with no target both go red naming the drift; the manifest also carries each target's asset filenames, which is what makes that comparison mechanical rather than a name-to-target table.

For each target it fetches the update.xml through the baked path (exercising the `_redirects` rule, not the underlying file path), parses it with the imported parseUpdateXml, HEADs the patch URL and requires the Content-Length to equal the descriptor size, GETs the MAR and requires its sha512 to equal the descriptor hashValue, requires the patch URL to be https and to be the versioned immutable /releases/download/&lt;tag&gt;/ form rather than the latest-download form, and compares appVersion and buildID against the latest Release read through `gh release view --json`. Absent evidence fails naming the missing piece; it never skips green. Every failure message names the file, the target and the diverging value and carries no token, no URL query and no local path.

Give it a `--self-test` that stands up a manifest, a static descriptor tree and a local server in mkdtemp, green first, then plants each required to go red naming the drift: a wrong hashValue, a missing target descriptor file, a 404 MAR URL, a size mismatch, and a latest-download patch URL. The self-test is honestly quick: node:crypto, text files in mkdtemp and a loopback server, with no build, browser, display or public network.

Append the full row `update-channel-live` to the `CHECKS+=(` full block at scripts/verify-platform.sh:4453, beside the mar-update-hop row, with a comment saying it needs a published Release, a resolving update origin and a manifest from a real build and therefore lives in the full set; append `update-channel-live-self-test` to the quick `CHECKS=(` array at :3572 beside the mar-update-hop self-test row. Stage both files before any scan, commit as feat(dist-05): update-channel-live gate.</action>
  <verify>
    <automated>git add scripts/verify-update-channel-live.mjs scripts/verify-platform.sh && node --check scripts/verify-update-channel-live.mjs && node scripts/verify-update-channel-live.mjs --self-test && nix develop .#theia --command scripts/verify-platform.sh --only update-channel-live-self-test && grep -q 'update-channel-live|' scripts/verify-platform.sh && grep -q 'verify-update-channel-live' .github/workflows/release.yml && grep -q 'parseUpdateXml' scripts/verify-update-channel-live.mjs && grep -qF -- '--manifest' scripts/verify-update-channel-live.mjs && ! grep -q 'Linux_x86_64-gcc3' scripts/verify-update-channel-live.mjs && ! grep -q 'objdir' scripts/verify-update-channel-live.mjs && ! grep -qE 'FIREFOX_[0-9]' scripts/verify-update-channel-live.mjs && node scripts/scan-brand-residue.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the self-test is not green first, any of the five plants fails to go red naming the drift, the script hand-keeps a BUILD_TARGET literal or reads an objdir path the hosted job does not have, the manifest argument is absent, the workflow does not call the gate, the live row is missing from the registry, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Descriptor host, path, channel and target set are all derived from the build job's manifest and the published Release, never from an objdir and never from a literal
    - Descriptor size and sha512 are checked against the served MAR bytes, not against the descriptor's own claim
    - A latest-download patch URL is red: descriptors pin immutable versioned URLs
    - Five plants each go red naming the drift; the self-test half is honestly quick and the live half is in the full block
  </acceptance_criteria>
  <done>The channel has a gate that goes red when it drifts from the Release</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Stand up updates.powerbrowser.org and the download page</name>
  <reversibility rating="costly">A DNS name and a Pages project shipped builds will resolve for their lifetime; the _redirects contract is what every installed client depends on.</reversibility>
  <read_first>
    - docs/RELEASING.md (descriptor tree layout, the _redirects rule and the descriptor-repository decision)
    - powerbrowser/endpoint-allowlist.json lines 25-29 (the updates.powerbrowser.org row, written before the host existed)
    - upstream/toolkit/modules/UpdateUtils.sys.mjs lines 937-939 and 1073-1126 (the two segments the probe must reproduce: SYSTEM_CAPABILITIES encodes to ISET%3A...%2CMEM%3A..., and OS_VERSION carries a percent-escaped space plus literal parentheses on Linux)
    - the download section of the website repository's index.html at /home/chris/coding/powerbrowser-website, line 328 (id="download"; the site is a single index.html with no /download route and no _redirects file today)
  </read_first>
  <files></files>
  <action>Operator steps, in order. (1) Create the public repository DeBIOS-Foundation/powerbrowser-updates containing a root `_redirects` file and a placeholder descriptor at `release/Linux_x86_64-gcc3/update.xml` whose body is the two-line no-update document `&lt;?xml version="1.0" encoding="UTF-8"?&gt;` then `&lt;updates&gt;&lt;/updates&gt;`. The placeholder is not decoration: git cannot commit an empty directory, and an empty `updates` element is exactly what an update origin returns when it has nothing to offer, so the tree is correct before the first release rather than broken. The single rule, with ten placeholders over the eleven-segment path and a 200 proxy: `/update/6/:product/:version/:buildid/:target/:locale/:channel/:osversion/:syscaps/:dist/:distversion/update.xml /:channel/:target/update.xml 200`. Cloudflare documents placeholders and 200 proxying to a relative path as supported, with a file cap of 100 dynamic redirects and 1000 characters per declaration, so one rule is well inside the limits. (2) Cloudflare dashboard: Workers and Pages, create a Pages project connected to that repository, empty build command, output directory `/`. (3) Add updates.powerbrowser.org as a custom domain on that project, which writes the CNAME in the powerbrowser.org zone. (4) Probe the rule live with a path built from the built tree's own template rather than sanitised literals: substitute each token as the client formats it, including an OS_VERSION segment carrying a percent-escaped space and literal parentheses and a SYSTEM_CAPABILITIES segment carrying `%3A` and `%2C`. BRANCH: if the probe does not return the placeholder descriptor because a placeholder does not match an escaped segment or the ten-placeholder rule over the eleven-segment path is rejected, replace the rule with a minimal `_worker.js` on the same Pages project that splits the path and serves &lt;channel&gt;/&lt;target&gt;/update.xml, and record which mechanism shipped in docs/RELEASING.md. Do not proceed on an unprobed rule. Task 7's drill later captures the URL the client actually formatted from `CheckerService:getUpdateURL - update URL:` under `app.update.log=true` (upstream/toolkit/mozapps/update/UpdateService.sys.mjs:5500), which confirms the probe shape against a real request. (5) Create a fine-grained PAT with Contents write on powerbrowser-updates only, and store it as the `release` environment secret the upload job reads; never as a repository secret. (6) In the website repository, fill the `#download` section: OS detection linking the stable asset names read out of docs/RELEASING.md's `## Release asset names` table, and the statement that the first releases are en-US only and Linux only. Write the Windows SmartScreen and macOS Gatekeeper notes as explicit PLACEHOLDERS, marked as such in an HTML comment beside each, so the unsigned posture is never hidden and is never mistaken for final copy: stage windows-unsigned replaces the Windows note with the verbatim text from its own tracked copy document, and stage macos-adhoc-signed replaces the macOS note from docs/MACOS-DISTRIBUTION.md, each under its own registered copy gate. Neither placeholder is the asserted copy for its platform; the only copy this stage asserts live is its own Linux text. Add a one-line `_redirects` file carrying `/download /#download 302` so the documented URL is real on a single-page site; Cloudflare documents a fragment in a redirect destination. Deploy powerbrowser.org through its own Pages project.</action>
  <verify>
    <automated>BAKED=$(sed -n 's|^URL=https://\([^/]*\)/update/6/.*|\1|p' objdir-release/dist/bin/application.ini) && OS=$(grep -m1 OS_TARGET objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && ABI=$(grep -m1 TARGET_XPCOM_ABI objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && CH=$(grep -m1 MOZ_UPDATE_CHANNEL objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && OSV='Linux%206.18.49%20(GTK%203.24.49)' && CAP='ISET%3ASSE4_2%2CMEM%3A63456' && PROBE="https://$BAKED/update/6/powerbrowser/0/0/${OS}_${ABI}/en-US/$CH/$OSV/$CAP/default/default/update.xml" && MISS="https://$BAKED/update/6/powerbrowser/0/0/NoSuchTarget/en-US/$CH/$OSV/$CAP/default/default/update.xml" && test "$(curl -s -o /dev/null -w '%{http_code}' "$PROBE")" = 200 && curl -fsS "$PROBE" | grep -q '<updates>' && test "$(curl -s -o /dev/null -w '%{http_code}' "$MISS")" = 404 && curl -fsSL https://powerbrowser.org/download | grep -q 'linux-x86_64' && curl -fsSL https://powerbrowser.org/download | grep -qi 'en-US' && curl -fsSL https://powerbrowser.org/download | grep -qi 'unsigned' && grep -qF "$BAKED" powerbrowser/endpoint-allowlist.json && grep -qF "$BAKED" docs/RELEASING.md</automated>
    <fails_when>the exact eleven-segment path a shipped build requests, escapes and parentheses included, does not return 200 with an updates document at the live origin; an unknown BUILD_TARGET does not return 404 (a placeholder that matched too greedily would serve another target's descriptor); the download URL does not resolve or does not link the stable Linux asset, state the locale scope and state the unsigned posture; or the descriptor host is absent from the allowlist or from the procedure document</fails_when>
  </verify>
  <acceptance_criteria>
    - The exact path a shipped build requests returns the descriptor, probed live with real segment shapes, not assumed from documentation
    - An unknown BUILD_TARGET returns 404 rather than resolving to some other target's descriptor
    - Whichever mechanism shipped, rule or Worker, is recorded in docs/RELEASING.md
    - The download URL resolves, links stable asset names, and states the Linux-only, en-US-only, unsigned scope
  </acceptance_criteria>
  <done>The origin a shipped build already bakes now answers, and the download page is live</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Cut the first public Linux release</name>
  <reversibility rating="irreversible">A published Release is downloaded and a descriptor is offered to every installed client; a tag can be deleted but a fetched MAR cannot be recalled.</reversibility>
  <read_first>
    - docs/RELEASING.md (the whole procedure, including the tag shape v&lt;ESR&gt;-&lt;revision&gt; and the draft-then-publish order)
    - .github/workflows/release.yml (the job order and the approval point)
    - scripts/verify-update-channel-live.mjs (what the final job will assert, and that it reads release-manifest.json)
  </read_first>
  <files></files>
  <action>Operator steps, in order. (1) Confirm the manifest revision and the pinned ESR tag agree with the tag about to be created and that no earlier release tag is greater. (2) Create and push the signed tag v&lt;ESR&gt;-1 on the current ESR point release, for example v153.2.0-1, with `git tag -s` as stage prerequisites-and-hardening's signing setup requires; the bypass-free signature ruleset refuses an unsigned tag on this pattern, and every `v1.*` milestone tag must remain unmatched by the workflow pattern. (3) Watch the build job on legion; a full Gecko build is roughly 55 minutes on this host, so budget the wall time rather than assuming a fast run. (4) When the run reaches the sign-and-upload job it pauses on the `release` environment reviewer: review the artifact list and the diff of the descriptor commit before approving, because approving is the only point at which the MAR key is used. (5) After the run completes, confirm the Release is published rather than draft and that the descriptor commit landed in powerbrowser-updates. (6) Do not announce or list the release anywhere until the next task's hop drill is green; package-manager listings belong to stage listings-and-cadence.</action>
  <verify>
    <automated>R=DeBIOS-Foundation/powerbrowser && TAG=$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*-[0-9]*') && test -n "$TAG" && gh release view "$TAG" --repo $R --json isDraft --jq .isDraft | grep -qx false && A=$(gh release view "$TAG" --repo $R --json assets --jq '.assets[].name') && grep -q 'SHA256SUMS' <<< "$A" && grep -q 'LICENSING.md' <<< "$A" && grep -q 'THIRD-PARTY-NOTICES.txt' <<< "$A" && grep -qE 'linux-x86_64[.]tar[.]xz$' <<< "$A" && grep -qE '[.]mar$' <<< "$A" && mkdir -p .mozbuild/release-proof && gh release download "$TAG" --repo $R --pattern '*.mar' --dir .mozbuild/release-proof --clobber && for m in .mozbuild/release-proof/*.mar; do gh attestation verify "$m" --repo $R || exit 1; done && BAKED=$(sed -n 's|^URL=https://\([^/]*\)/update/6/.*|\1|p' objdir-release/dist/bin/application.ini) && OS=$(grep -m1 OS_TARGET objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && ABI=$(grep -m1 TARGET_XPCOM_ABI objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && CH=$(grep -m1 MOZ_UPDATE_CHANNEL objdir-release/config.status | tr -d ",'\" " | cut -d: -f2) && curl -fsS "https://$BAKED/update/6/powerbrowser/0/0/${OS}_${ABI}/en-US/$CH/Linux%206.18.49%20(GTK%203.24.49)/ISET%3ASSE4_2%2CMEM%3A63456/default/default/update.xml" | grep -q '<patch type="complete"' && node scripts/verify-update-channel-live.mjs --manifest objdir-release/release-manifest.json && nix develop .#theia --command scripts/verify-platform.sh --only update-channel-live</automated>
    <fails_when>no release tag exists, the Release is a draft, any of SHA256SUMS, LICENSING.md, THIRD-PARTY-NOTICES.txt, the tarball or the MAR is missing, any published MAR's provenance attestation does not verify, the live descriptor still carries no complete patch after the descriptor commit, or the live channel disagrees with the Release</fails_when>
  </verify>
  <acceptance_criteria>
    - One published, non-draft Release carries the full asset set under versioned and stable names
    - Every published MAR's build provenance verifies against this repository, checked one artifact at a time
    - The placeholder descriptor has been replaced by a real one carrying a complete patch at the baked path
    - The live channel gate is green against the release just published, driven by the build's own manifest
  </acceptance_criteria>
  <done>The first public Linux release is published and the channel agrees with it</done>
</task>

<task type="auto">
  <name>Release-mode hop drill plus the observed allowlist rows (UPD-06, UPD-05)</name>
  <reversibility rating="costly">The hop verifier gains a second assertion set every later platform reuses; allowlist rows are the single source of truth every endpoint layer reads.</reversibility>
  <read_first>
    - scripts/verify-mar-update-hop.mjs lines 193-320 (runChecks: the static URL half, the four-file evidence requirement at :216, the distinct-version rule at :241-250, and the server-access.log assertions at :300-305 that a release hop cannot satisfy)
    - upstream/toolkit/mozapps/update/UpdateService.sys.mjs lines 1954-1963 (updateIsAtLeastAsOldAs refuses an offer only when the version comparison is zero AND the build IDs are equal, which is why a same-appVersion distinct-buildID release hop is a real upgrade)
    - upstream/toolkit/components/timermanager/UpdateTimerManager.sys.mjs lines 74-101 and 178-288 (minFirstInterval 10000, app.update.timerFirstInterval as the only lever on the first fire, lastUpdateTime 0 making every consumer due, and callbacksToFire notifying all due consumers in one pass)
    - upstream/toolkit/mozapps/update/nsUpdateService.manifest line 1 (the update check is the background-update-timer consumer of that category)
    - .mozbuild/mar-hop/hop.json (the loopback evidence shape this task extends with served)
    - scripts/verify-endpoints.sh lines 46-47 and 354-448 (BIN_DIR hard-wired to objdir, layer 3's launch, its 35-second window, the anchored Resolving host sift, the controlled-probe requirement, and the any-violation positive control at :435-448)
    - powerbrowser/endpoint-allowlist.json lines 20-29 (the aus5 row as stage prerequisites-and-hardening rewrote it, and the updates host row; the reason style to follow)
    - docs/BUILD.md lines 862-930 (the hop drive procedure and the pending-window polling note)
  </read_first>
  <files>scripts/verify-mar-update-hop.mjs, scripts/verify-endpoints.sh, powerbrowser/endpoint-allowlist.json, scripts/verify-platform.sh</files>
  <action>Run one drill that produces the evidence for both requirements, then encode what it observed. Install the packaged build stage packaged-product-correctness-linux produced as N, point nothing at loopback, and let the client's own update timer reach the live channel; capture `MOZ_LOG=nsHostResolver:5` plus `app.update.log=true` across the whole check-download-stage-apply cycle, so the resolver hosts and the URL the client formatted are both on record. Record hop.json with a new key `served: "release"` alongside the existing keys.

Then extend scripts/verify-mar-update-hop.mjs so `served` **selects** an assertion set rather than adding to one. An absent or unknown value fails naming the key rather than defaulting. `served: "loopback"` keeps today's behaviour byte for byte, including the four-file evidence list with `server-access.log` and the two GET assertions over it. `served: "release"` requires `hop.json`, `update.xml`, `client-resolver.log` and the named MAR, and requires no access log, because the descriptor is served by Cloudflare Pages and the MAR by GitHub's asset host and no fork server exists in that path. The release set additionally requires: the descriptor host and the MAR host both present in the resolver log; the downloaded MAR's sha512 equal to the descriptor hashValue; the patch URL https; zero `*.mozilla.org` and `*.mozilla.net` hosts; `signmar -v` passing against the shipped key; `gh attestation verify` passing on the MAR; and, in place of the loopback set's distinct-version rule, distinct build IDs with an appVersion that is not older. That substitution is not a relaxation: the ratified version scheme keeps appVersion at the ESR version, and upstream's own `updateIsAtLeastAsOldAs` refuses an offer only when the versions compare equal **and** the build IDs match, so a same-appVersion distinct-buildID hop is exactly what the client treats as an upgrade. Extend the existing self-test with release-mode plants, each required to go red naming the drift: an unsigned MAR, a wrong-channel MAR, a mismatched sha512, an http patch URL, a resolver log missing the MAR host, and a same-buildID hop.

Next, take the host set the drill actually observed and add exactly the rows it justifies to powerbrowser/endpoint-allowlist.json, each with a reason naming the updater and the observation, expected to be github.com and release-assets.githubusercontent.com; add no host the drill did not resolve. Note in the github.com row's reason that stage reports-bug-error-crash later extends this same row with the prefilled bug-report path and a `manifest: urls.issues` key: the two reasons are cumulative on one row, not alternatives, and that stage must preserve this updater observation alongside its own. Add the crash-reports.mozilla.com `deny` row UPD-05 also asks for, with a reason naming the fact it guards: `.mozconfig:13` carries `--disable-crashreporter` while `objdir/config.status` and `objdir-release/config.status` both still carry `MOZ_CRASHREPORTER_URL: https://crash-reports.mozilla.com`, so a build that re-enabled the reporter without the manifest endpoint would resolve Mozilla's collector, and the deny row makes that fail loudly; stage reports-bug-error-crash is where the endpoint becomes a manifest key and where this row's reason gains the layer-1 `[Crash Reporter] ServerURL` assertion; that stage extends this row and must not create a second one. Confirm the aus5 row's reason names the baked MOZ_APPUPDATE_HOST rather than the retired AppUpdateURL policy mechanism, and correct it if stage release-identity left it describing the policy.

Finally extend scripts/verify-endpoints.sh layer 3 so its observation window forces the check rather than waiting on chance. Write a `user.js` into the throwaway profile setting `app.update.timerFirstInterval` to 10000, the module's own floor, and `app.update.log` true; do not use `app.update.background.force` or `app.update.interval`, neither of which moves the first fire. Keep the 35-second window, which then carries 25 seconds of margin rather than five. Assert that the host resolved for the descriptor equals the host baked into `$BIN_DIR/application.ini` -- the application.ini beside the binary layer 3 actually launches, so the comparison is self-consistent whichever objdir is current -- and fail naming both the observed host and the expected baked host, so a build that reverted to Mozilla's default reddens on the value rather than on absence. State in the header that layer 3 runs the dev objdir and therefore requires an objdir rebuilt since stage release-identity; a stale one resolves aus5, which is already a `deny` row, so the failure is loud rather than silent. The existing positive control succeeds on any violation and so cannot distinguish a planted OpenH264 fault from a planted host fault: add a second, distinct control that plants only the baked-host fault by pointing the launched tree's application.ini at a different host, and require the failure message to name the observed host and the expected baked host. Stage every file before any scan, commit as feat(dist-05): release-mode hop drill and observed update hosts.</action>
  <verify>
    <automated>git add scripts/verify-mar-update-hop.mjs scripts/verify-endpoints.sh powerbrowser/endpoint-allowlist.json scripts/verify-platform.sh && node --check scripts/verify-mar-update-hop.mjs && bash -n scripts/verify-endpoints.sh && jq -e '[.hosts[].host] | index("github.com") and index("release-assets.githubusercontent.com") and index("crash-reports.mozilla.com")' powerbrowser/endpoint-allowlist.json && jq -e '[.hosts[] | select(.host=="github.com" or .host=="release-assets.githubusercontent.com") | select(.disposition=="allow") | select(.reason | test("updat"))] | length == 2' powerbrowser/endpoint-allowlist.json && jq -e '[.hosts[] | select(.host=="crash-reports.mozilla.com") | select(.disposition=="deny")] | length == 1' powerbrowser/endpoint-allowlist.json && jq -e '[.hosts[] | select(.host=="aus5.mozilla.org") | select(.reason | test("MOZ_APPUPDATE_HOST"))] | length == 1' powerbrowser/endpoint-allowlist.json && jq -e '.served == "release"' .mozbuild/mar-hop/hop.json && grep -q 'app.update.timerFirstInterval' scripts/verify-endpoints.sh && ! grep -q 'app.update.background.force' scripts/verify-endpoints.sh && node scripts/verify-mar-update-hop.mjs --self-test && node scripts/verify-mar-update-hop.mjs && nix develop .#theia --command scripts/verify-platform.sh --only mar-update-hop && nix develop .#theia --command scripts/verify-platform.sh --only mar-update-hop-self-test && bash scripts/verify-endpoints.sh --layer 3 && bash scripts/verify-endpoints.sh --layer 3 --positive-control && node scripts/scan-brand-residue.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>hop.json does not declare served: release, the release assertion set is not exercised or still demands a fork access log, any release-mode plant fails to go red naming the drift, a host the drill resolved is absent from the allowlist or present with disposition deny, the crash-reports deny row or the corrected aus5 reason is missing, layer 3 still names a pref that cannot move the first timer fire, layer 3 passes without observing the baked host, either positive control does not go red, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - One hop off the published Release lands on N+1 with distinct build IDs, a not-older appVersion, matching sha512, an https patch URL and zero Mozilla hosts
    - The MAR's signature and its build provenance both verify during the drill
    - served selects the assertion set, so the loopback set keeps its access-log evidence and the release set never demands one
    - Every allowlist row added is justified by a host the drill actually resolved, plus the crash-reports deny row UPD-05 names
    - Layer 3 forces the first timer fire with the pref that actually moves it and asserts the baked host by value, with a distinct control for that fault going red
  </acceptance_criteria>
  <done>The channel is proven end to end from a real install to a real Release</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Tag push to build runner | A pushed tag causes legion to check out and compile whatever that ref carries. |
| Build artifact to signing job | Artifacts cross from an unprivileged self-hosted host into the only job holding the MAR key. |
| Release job to descriptor repository | The upload job writes the descriptor tree with a token scoped to a repository outside this tree. |
| Update origin to installed client | Descriptor bytes served from Cloudflare Pages steer every installed updater. |
| Release asset host to updater | MAR bytes arrive over a 302 from github.com to a third-party asset host. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-D5-01-01 | Tampering | untrusted ref reaching the self-hosted runner | high | mitigate | Triggers are tag and workflow_dispatch only, on the same pattern the two tag rulesets protect; outside-collaborator runs require approval; the workflow gate plants a pull_request trigger and requires red. |
| T-D5-01-02 | Elevation of privilege | job-to-job residue on legion | high | mitigate | ephemeral = true de-registers after one job and wipes the state directory, and the module places the PAT on the service's InaccessiblePaths; no secret is stored on legion and the repository holds zero repository-level Actions secrets; the gate plants a secret reference in the legion job. |
| T-D5-01-03 | Information disclosure | OIDC token minted on a self-hosted host | high | mitigate | id-token and attestations exist on the hosted release-environment job only; the gate plants id-token on the legion job and requires red. |
| T-D5-01-04 | Spoofing | forged descriptor pointing the updater at another MAR | high | mitigate | MAR signature verification from stage mar-signing-and-update-integrity is on; the live gate compares descriptor size and sha512 against the served bytes; the hop drill runs signmar -v and gh attestation verify. |
| T-D5-01-05 | Tampering | an asset replaced after publication | medium | mitigate | Immutable releases are on and the workflow creates a draft, attaches every asset, then publishes; descriptor patch URLs are the versioned immutable release-download form, never latest-download, and the live gate plants a latest-download URL. |
| T-D5-01-06 | Denial of service | a stale, missing or 404 descriptor silently stops updates | medium | mitigate | update-channel-live runs as release.yml's final job with missing-target, wrong-hash, size-mismatch and 404-MAR plants; an unknown BUILD_TARGET must return 404 rather than another target's descriptor, probed live at task 5. |
| T-D5-01-07 | Repudiation | which build produced a published MAR | medium | mitigate | actions/attest-build-provenance on the upload job; task 6 verifies every published MAR one artifact at a time, and the hop drill verifies the attestation as part of the release assertion set. |
| T-D5-01-08 | Elevation of privilege | the descriptor-repository token reaching the marketing site or the product repository | medium | mitigate | Descriptors live in a dedicated repository, so the write token is fine-grained to Contents on powerbrowser-updates alone and is a release-environment secret gated on a reviewer; the decision and its reason are recorded in docs/RELEASING.md before the infrastructure exists. |
| T-D5-01-SC | Tampering | third-party actions in the release path | high | mitigate | Every uses: pinned by 40-hex SHA with the version in a comment, under a repository policy of allowed_actions selected with sha_pinning_required; the gate derives admissibility from .github/settings/actions-selected.json and plants both an unpinned action and an inadmissible third-party one. |
</threat_model>

<verification>
Facts derived from objdir-release rather than asserted, with the manifest host proving stage
release-identity landed; release-workflow gate and self-test green with six plants landing;
update-channel-live self-test green with five plants landing and the live row green against the
published Release from the build's own manifest; the baked eleven-segment path probed live at the
origin with real escapes and parentheses, and an unknown target returning 404; one published
non-draft Release with the full asset set and a per-artifact verifying attestation; a release-mode
hop landing on N+1 with distinct build IDs, signature, attestation, matching sha512 and zero Mozilla
hosts; layer 3 forcing the first timer fire with app.update.timerFirstInterval and asserting the
baked host by value with a distinct control red; brand scan green; quick green.
</verification>

<success_criteria>
A user downloads the Linux tarball from GitHub Releases and the build they install fetches its next
release from updates.powerbrowser.org with signature verification on, and every one of those claims
is held by a gate that goes red when it stops being true.
</success_criteria>

<output>
Stage windows-unsigned and stage macos-adhoc-signed add their BUILD_TARGET descriptor directories,
their asset pairs and their download-page notes to the pipeline this plan built, and their build jobs
extend the same release-manifest.json the live gate reads; stage reports-bug-error-crash attaches the
reporting surfaces to the same Release and turns the crash-reports deny row into a manifest-driven
endpoint; stage listings-and-cadence takes the first release as the input to package-manager listings
and the per-ESR-point-release cadence.
</output>
