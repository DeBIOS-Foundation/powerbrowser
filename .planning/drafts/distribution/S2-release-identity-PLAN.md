---
phase: distribution-stage-2-release-identity
plan: "01"
type: execute
wave: 2
depends_on: ["prerequisites-and-hardening"]
files_modified: [.planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md, configuration.toml, scripts/lib/config-schema.json, scripts/generate.mjs, .mozconfig, powerbrowser/identity.configure.comparand, powerbrowser/branding/dev/pref/firefox-branding.js, powerbrowser/branding/release/pref/firefox-branding.js, powerbrowser/packaging/version/version.txt, powerbrowser/packaging/version/version_display.txt, scripts/verify-generated-identity.mjs, powerbrowser/endpoint-allowlist.json, docs/REBRANDING.md, powerbrowser/distribution/policies.json, scripts/verify-mar-update-hop.mjs, docs/BUILD.md, scripts/smoke-firefox.sh, scripts/verify-branding-identity.mjs, scripts/verify-release-identity.mjs, scripts/verify-platform.sh]
autonomous: true
requirements: [REL-01, UPD-01, UPD-02, UPD-03]
must_haves:
  truths:
    - "The release identity (ESR version, revision, display version, tag, update channel, MAR channel id) derives from configuration.toml through one exported function and reaches the build only through generated surfaces with tracked comparands"
    - "The built application.ini bakes the fork update host from [urls].update; no policies.json is needed for a shipped install to poll the fork origin"
    - "A release tag, the version files and any committed update.xml cannot disagree without the --quick gate naming the drift"
    - "The about-dialog manual-update link resolves to a stated manifest URL instead of throwing on an empty string, and the release-notes links render instead of staying hidden"
    - "Every registered check that reads a built tree stays green through this stage without a second tier-3 build: the version expectation is read from the same objdir's config.status, so the unrebuilt release objdir is never compared against a source file it predates"
  artifacts:
    - path: ".planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md"
      provides: "Live configure-level verdict for the four levers (version file path through the symlink, update channel, MAR channel env, MOZ_APPUPDATE_HOST)"
      contains: "Verdict:"
    - path: "powerbrowser/packaging/version/version_display.txt"
      provides: "Tracked comparand of the emitted display version, ESR from upstream/config/milestone.txt plus the manifest revision"
      contains: "-1"
    - path: "powerbrowser/identity.configure.comparand"
      provides: "Frozen emission carrying the baked update host"
      contains: "MOZ_APPUPDATE_HOST"
    - path: ".mozconfig"
      provides: "Tracked copy of the emitted mozconfig with the channel, version-file and MAR-channel lines"
      contains: "--with-version-file-path="
    - path: "scripts/verify-release-identity.mjs"
      provides: "REL-01 --quick gate with self-test plants"
      min_lines: 120
    - path: "scripts/verify-mar-update-hop.mjs"
      provides: "Hop gate whose static half reads the built application.ini instead of policies.json"
      contains: "application.ini"
    - path: "scripts/verify-platform.sh"
      provides: "release-identity row plus its self-test row"
      contains: "release-identity"
  key_links:
    - from: "configuration.toml"
      to: "scripts/generate.mjs"
      via: "releaseIdentity(config) parses upstreams.firefox_esr_tag and product.revision into version, display version, tag and MAR channel id"
      pattern: "releaseIdentity"
    - from: "scripts/generate.mjs"
      to: ".mozconfig"
      via: "emitMozconfig's shared half (mozconfigSharedLines) writes --enable-update-channel, --with-version-file-path and the two MAR channel exports; the tracked file is the copy-over comparand and the per-target tails two later stages add inherit every one of those lines"
      pattern: "enable-update-channel"
    - from: "scripts/generate.mjs"
      to: "powerbrowser/identity.configure.comparand"
      via: "emitIdentityConfigure writes set_config MOZ_APPUPDATE_HOST from the host of urls.update"
      pattern: "MOZ_APPUPDATE_HOST"
    - from: "scripts/verify-mar-update-hop.mjs"
      to: "objdir/dist/bin/application.ini"
      via: "static half reads the [AppUpdate] URL line and compares its host with the manifest host"
      pattern: "AppUpdate"
    - from: "scripts/verify-branding-identity.mjs"
      to: "objdir/config.status"
      via: "the version and runtime-identity surfaces read MOZ_APP_VERSION_DISPLAY from the variant's own config.status, so each objdir is compared with the configure run that built it"
      pattern: "MOZ_APP_VERSION_DISPLAY"
    - from: "scripts/verify-platform.sh"
      to: "scripts/verify-release-identity.mjs"
      via: "registry row invokes the gate; the self-test row invokes it with --self-test"
      pattern: "release-identity"
---

<objective>
Bake the release identity into the build through the generator and prove every lever at the configure level before spending a tier-3 rebuild on it: a manifest revision and update channel drive generated version files, four new mozconfig lines, a baked update host in the identity carrier, and four about-dialog URL prefs; the update policy file stops carrying AppUpdateURL; the hop gate reads the built application.ini; and one new --quick row ties the release tag, the version files and any committed descriptor together.

Purpose: stage 3 (mar-signing-and-update-integrity) signs MARs for a channel and embeds keys in a slot that this stage fixes; stage 5 (linux-release-pipeline-and-update-channel) tags releases whose name this stage derives and serves descriptors whose host this stage bakes. Nothing here touches patches/ or upstream/: every change is a manifest key, an emitter, a comparand, a gate, or a document.

Output: probe record, generator changes with copy-over comparands, reshaped hop gate, release-identity gate with self-test, one batched dev rebuild proving the baked values.
</objective>

<context>
@.planning/seeds/SEED-001-standard-distribution-updates-reports.md
@CLAUDE.md
@docs/BUILD.md
@docs/REBRANDING.md
@configuration.toml
@scripts/generate.mjs
@scripts/verify-mar-update-hop.mjs
@scripts/verify-generated-identity.mjs
@scripts/verify-branding-identity.mjs
@powerbrowser/endpoint-allowlist.json
</context>

<tasks>

<task type="auto">
  <name>Configure-level probe of the four levers with a GREEN/RED record</name>
  <reversibility rating="reversible">Scratch mozconfig and objdir under .mozbuild/ (git-ignored) removed at closeout; generated/identity.configure restored by re-running the generator; the record is a decision artifact.</reversibility>
  <read_first>
    - upstream/build/moz.configure/init.configure, the `--with-version-file-path` option block (line 1023 today) and the `def milestone(` function below it (1060): the path is joined with `build_env.topsrcdir` at 1076-1081 and a missing file `break`s out of the loop silently, so a wrong path falls back to browser/config/version.txt with no error; `app_version`/`app_version_display` are `versions[3]`/`versions[-1]` at 1105-1108; `is_esr=app_version_display.endswith("esr")` at 1151 with set_config MOZ_ESR at 1179; the `--enable-update-channel` option at 1196 and `set_config("MOZ_UPDATE_CHANNEL", update_channel)` at 1210, lowercased
    - upstream/build/moz.configure/update-programs.configure, the MAR_CHANNEL_ID and ACCEPTED_MAR_CHANNEL_IDS `option(env=...)` declarations (111-125); the second is comma-joined
    - upstream/build/moz.build lines 95-97 (`appini_defines["MOZ_APPUPDATE_HOST"]` defaults to aus5.mozilla.org and is overridden from CONFIG when set), line 25 (`DEFINES["ACCEPTED_MAR_CHANNEL_IDS"]`) and line 120 (update-settings.ini staged); upstream/build/application.ini.in line 54 (`[AppUpdate]`) and 55 (the URL template interpolating `@MOZ_APPUPDATE_HOST@`)
    - upstream/toolkit/mozapps/update/updater/moz.build: `if CONFIG["MOZ_UPDATE_CHANNEL"] in ("beta", "release", "esr")` selects release_primary.der (line 68) and release_secondary.der; the `else` branch selects dep1.der/dep2.der (line 84)
    - upstream/toolkit/moz.configure, the MOZ_APP_REMOTINGNAME default block: an explicit value wins over the channel-derived default, so the channel change cannot rename the remoting name
    - upstream/python/mozbuild/mozbuild/configure/options.py, `ConflictingOptionError`: a second `--with-version-file-path` value in one mozconfig raises
    - .mozconfig line 15 (`--with-branding=${POWERBROWSER_BRANDING:-powerbrowser/branding-generated/dev}`, the RELATIVE path that already resolves through the upstream/powerbrowser symlink) and line 16 (`mk_add_options "export MOZ_APP_REMOTINGNAME=powerbrowser"`, the export form that reaches an `option(env=...)` value; objdir/config.status carries the resolved subst)
    - scripts/fetch-upstream.sh, the line that creates the `upstream/powerbrowser` symlink; `ls -la upstream/powerbrowser` confirms it points at `../powerbrowser`
    - powerbrowser/packaging/version-nplus1/version.txt and version_display.txt, the tracked test files this probe uses as its resolution tracer. Stage prerequisites-and-hardening task 6 rewrote both to stay strictly newer than the rebased ESR, so read their contents at probe time and never retype them
    - upstream/toolkit/mozapps/update/UpdateService.sys.mjs, `updateIsAtLeastAsOldAsCurrentVersion`: a same-version update is offered when the buildID differs, which is what makes a revision-only bump of the same ESR updatable
    - docs/BUILD.md lines 781-801 (how the N+1 proof used --with-version-file-path with an absolute path in an untracked scratch mozconfig)
  </read_first>
  <files>.planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md</files>
  <action>Prove the four configure-level claims live in one `./mach configure` before any tracked file changes. Write `.mozbuild/stage2-probe.mozconfig` as the tracked .mozconfig plus four lines: `ac_add_options --enable-update-channel=release`, `ac_add_options --with-version-file-path=powerbrowser/packaging/version-nplus1` (the tracked test files, so a resolved path reads `$NP` where `NP=$(cat powerbrowser/packaging/version-nplus1/version_display.txt)` and a silent fallback reads `$(tail -1 upstream/config/milestone.txt)esr`), `mk_add_options "export MAR_CHANNEL_ID=powerbrowser-release"`, `mk_add_options "export ACCEPTED_MAR_CHANNEL_IDS=powerbrowser-release"`.

Append `set_config("MOZ_APPUPDATE_HOST", "updates.powerbrowser.org")` to generated/identity.configure. This is a hand edit of a generated file, which the Phase 2 contract forbids; it is taken here as a deliberate, scoped, restored deviation and is not precedent. The reason it is worth taking: the point of this task is to prove the lever BEFORE an emitter exists to write it, and generated/ is git-ignored, so the deviation cannot reach a commit. The `finally` re-runs `node scripts/generate.mjs` and the task verify re-runs `node scripts/generate.mjs --check`, so a forgotten restore goes red rather than silent.

Inside `nix develop .#firefox` with cwd upstream/ run `MOZCONFIG=../.mozbuild/stage2-probe.mozconfig POWERBROWSER_OBJDIR=.mozbuild/stage2-probe-objdir ./mach configure`, then read `.mozbuild/stage2-probe-objdir/config.status` and record the substs MOZ_APP_VERSION, MOZ_APP_VERSION_DISPLAY, MOZ_UPDATE_CHANNEL, MAR_CHANNEL_ID, ACCEPTED_MAR_CHANNEL_IDS, MOZ_APPUPDATE_HOST, MOZ_APP_REMOTINGNAME and whether MOZ_ESR is present.

Derive both expectations from the tree before reading the substs, never from a typed version: `NP=$(cat powerbrowser/packaging/version-nplus1/version_display.txt)` is the resolved-path expectation and `ESR=$(tail -1 upstream/config/milestone.txt)` gives the silent-fallback value `${ESR}esr`. Verdict GREEN requires MOZ_APP_VERSION_DISPLAY equal to `$NP` (the relative path resolved through the upstream/powerbrowser symlink, the same symlink --with-branding already relies on), MOZ_UPDATE_CHANNEL release, both MAR substs powerbrowser-release, MOZ_APPUPDATE_HOST updates.powerbrowser.org, MOZ_APP_REMOTINGNAME powerbrowser. Branch on the version subst: GREEN routes task 2 to the relative path `powerbrowser/packaging/version`; RED (`${ESR}esr`, the silent fallback) routes task 2 to `../powerbrowser/packaging/version`, which milestone() joins with topsrcdir without the symlink, and the record states which one shipped. A RED on any other subst stops the stage and names the lever.

Write the record imitating the 13-SPIKE section structure (header, what changed, the exact command, observations with the substs pasted verbatim, constraints, verdict line, cleanup proofs): one line `Verdict: GREEN` or `Verdict: RED`, one line `Expected MOZ_APP_VERSION_DISPLAY: <the value of $NP read from the tree>` so the verify can compare the record against powerbrowser/packaging/version-nplus1/version_display.txt rather than against a literal, the routing it selects on its own line as `Routed version-file path: <path>`, the observed MOZ_ESR consequence (a display version not ending in "esr" clears MOZ_ESR at init.configure:1151/1179; consumers are aboutDialog.js, toolkit/components/search/SearchUtils.sys.mjs, toolkit/modules/RustSharedRemoteSettingsService.sys.mjs and toolkit/components/enterprisepolicies/EnterprisePoliciesParent.sys.mjs, all of which then read the channel as "release", consistent with --enable-update-channel=release), and the ConflictingOptionError note for the N+1 scratch mozconfig. Remove the probe objdir and mozconfig, regenerate, and prove a clean tree. Commit as docs(distribution-S2): record configure-lever probe.</action>
  <verify>
    <automated>git add .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && grep -q '^Verdict: \(GREEN\|RED\)$' .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && grep -q '^Routed version-file path: ' .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && grep -qxF "Expected MOZ_APP_VERSION_DISPLAY: $(cat powerbrowser/packaging/version-nplus1/version_display.txt)" .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && grep -q 'MOZ_APP_VERSION_DISPLAY' .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && grep -q 'MOZ_APPUPDATE_HOST' .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && grep -q 'ACCEPTED_MAR_CHANNEL_IDS' .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md && test ! -e .mozbuild/stage2-probe-objdir && test ! -e .mozbuild/stage2-probe.mozconfig && git -C upstream diff --quiet && test -z "$(git status --porcelain -- scripts/ powerbrowser/ configuration.toml .mozconfig | head -5)" && node scripts/generate.mjs --check && scripts/verify-platform.sh --quick</automated>
    <fails_when>record missing, verdict or routing line malformed, the recorded expectation disagrees with powerbrowser/packaging/version-nplus1/version_display.txt (a retyped version instead of a derived one), any recorded subst absent, probe scratch left on disk, upstream diff non-empty, any shipped-tree file changed by the probe, generated/ stale after the restore, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Record carries the pasted config.status substs for all six values plus the remoting name and the MOZ_ESR observation
    - One-line verdict plus a separate line naming the version-file path it routes task 2 to
    - The generated-file deviation is named in the record as scoped and restored, with the restore proven
    - Scratch removed, generated/identity.configure restored, upstream diff empty
  </acceptance_criteria>
  <done>Every configure lever this stage depends on is proven live at configure cost, not rebuild cost</done>
</task>

<task type="auto">
  <name>Release identity through the generator with tracked comparands</name>
  <reversibility rating="costly">Manifest keys, emitted mozconfig lines and the version-file directory are addressed by stages 3, 4 and 5 and by three gates; renaming touches each consumer, and the mozconfig lines force a tier-3 rebuild (task 5) either way.</reversibility>
  <read_first>
    - scripts/generate.mjs, anchored on symbols (line numbers are today's and drift): `const SCHEMA_KEYS` (187), `function isUnset` (457), `function assertEmittable` (1059), `function validateTelemetry` (920, the dedicated-validator idiom), `function validate(` (966, whose generic loop knows type "string" only), `function emitMozconfig` (1404) with the `--enable-unverified-updates` line inside it (1417, which stays for stage 3 to remove), `function emitIdentityConfigure` (1504, which emits `imply_option` lines today), the static `pref("app.update.url.manual", "");` and `.details` blanks inside `FIREFOX_BRANDING_BASE_LINES` (2365-2366), `const DYNAMIC_PREF_ANCHOR` (2549), `export function mozillaEndpointPrefs` (2583, the one derivation two gates share, returning two entries today), `export function manifestEndpointSources` (2618, whose hand-kept key list is `['release_notes', 'update', 'crash_report', 'homepage', 'search']`), `export function emitUpstreamPins` (2698) and `const TAG_NAME_PATTERN` (2697) for the tag refusal copy to imitate, `function emitFirefoxBrandingJs` (2719, the splice), `export const TARGETS` (3362, rows with tracked comparands), `export function resolveConfig(defaultsPath = MANIFEST_PATH, downstreamPath)` (3981, which is what lets a self-test resolve a fixture manifest), `const FIXTURE_BASE` (4046, which states every required key), and the self-test case shapes below it (expect and probe/holds/resolved)
    - scripts/lib/config-schema.json: every entry is type "string"; the `keys.urls.*` entries are all `required: false` and carry the https regex
    - scripts/check-patch-surface.sh, the brand-value derivation loop (119-129): it takes required STRING keys of [identity], [product] and [legal] only and skips any non-string value, so an integer revision never enters the brand-value set and a channel under a new [update] table never does either
    - scripts/verify-generated-identity.mjs: `const EXPECTED` (74), the one hand-kept contract list, and the "thirty-three" banner comment (lines 4, 12, 18, 43) whose count changes
    - scripts/verify-theia-endpoints.mjs `runChecks`: check 2 requires every manifest host to be PRESENT in the hosts array (disposition is not consulted), check 3 requires a `"manifest"` field to name a key the manifest still states and to match that key's current host (the field is one dotted key per entry, so two keys sharing a host cannot both be marked), check 4 requires every pref `mozillaEndpointPrefs` returns to have a prefs entry whose `expect` equals the derived value
    - powerbrowser/endpoint-allowlist.json: the `aus5.mozilla.org` deny entry and the `updates.powerbrowser.org` allow entry, the `powerbrowser.org` deny entry (denied because of DNS prefetch of a rendered link, explicitly the allow-the-capability/deny-the-unattended-callout distinction), and the prefs array shape (name, expect, reason). No entry carries a `manifest` field today; the two reasons that name manifest-driven prefs are toolkit.telemetry.server and breakpad.reportURL
    - docs/REBRANDING.md `### [product]` (240), `### [urls] -- update and info endpoints (all optional)` (275) and `### [upstreams]` (305); scripts/verify-rebranding-docs.mjs requires every schema key to appear as inline code or a heading
    - upstream/browser/base/content/aboutDialog.js, the release-notes block: the link is rendered only when `app.releaseNotesURL.aboutDialog` is not PREF_INVALID AND its formatted value is not "about:blank". The pref is absent today, so the link is HIDDEN, not dead. upstream/browser/base/content/aboutDialog-appUpdater.js: `new URL(Services.urlFormatter.formatURLPref("app.update.url.manual"))` inside a try, so today's blank pref throws and leaves the manual and failed-update links dead. Those two cases are different and the copy must say so
    - upstream/browser/config/version.txt and version_display.txt (a bare single line, no comment); powerbrowser/packaging/version-nplus1/ copies that shape
    - .planning/drafts/distribution/S2-PROBE-CONFIGURE-LEVERS.md (task 1 verdict and the routed path)
  </read_first>
  <files>configuration.toml, scripts/lib/config-schema.json, scripts/generate.mjs, .mozconfig, powerbrowser/identity.configure.comparand, powerbrowser/branding/dev/pref/firefox-branding.js, powerbrowser/branding/release/pref/firefox-branding.js, powerbrowser/packaging/version/version.txt, powerbrowser/packaging/version/version_display.txt, scripts/verify-generated-identity.mjs, powerbrowser/endpoint-allowlist.json, docs/REBRANDING.md</files>
  <action>Manifest: add `revision = 1` under [product] (a TOML integer), a new `[update]` table with `channel = "release"`, and a new `[urls]` table stating `update = "https://updates.powerbrowser.org"`, `download = "https://powerbrowser.org/download"` and `release_notes = "https://powerbrowser.org/releases"`, each with a comment in the manifest's voice naming the surface it reaches. `urls.download` is a NEW key rather than a reuse of `urls.homepage`: homepage is documented as the product site, and app.update.url.manual is the page a user lands on when self-update failed, so a downstream that set homepage to its site root would ship a manual-update link to a page with no download. urls.homepage is not stated by this stage and keeps its current meaning.

Schema: `product.revision` as type "integer", required, minimum 1, with help text; `update.channel` as type "string", required, regex `^[a-z][a-z0-9-]{0,31}$` (configure lowercases the value; the updater's key slot for "release" is release_primary.der/release_secondary.der per updater/moz.build, the value stage 3 keys its hook-only patch off); `urls.download` as type "string", optional, same https regex as its siblings. Add one integer branch to validate()'s generic loop (Number.isInteger and at least the minimum, failure copy naming the dotted path and "a whole number of 1 or more, written without quotes"). Add `download` to manifestEndpointSources' key list so its host is covered like every other stated URL.

Export `releaseIdentity(config)` returning esrVersion (parsed from upstreams.firefox_esr_tag with `^[A-Za-z]+_(\d+)_(\d+)_(\d+)esr_RELEASE$`, refusing any other shape naming the key in the emitUpstreamPins style), revision, displayVersion `<esr>-<revision>`, tag `v<displayVersion>`, channel, and marChannelId `<identity.app_basename>-<update.channel>`. Every emitter and gate below derives from it; none restates it.

Split emitMozconfig before adding a line to it, because two later stages emit per-target mozconfigs and must not each invent a mechanism. Rewrite it as a shared line builder plus a per-target tail, the builder taking a target suffix that concatenates onto the objdir value (`${POWERBROWSER_OBJDIR:-objdir<suffix>}`), so the Linux emission under an empty suffix stays byte-identical to the tracked `.mozconfig` and a cross build can never clobber the Linux objdir. Every line this task adds goes in the SHARED half, which is what lets stage mar-signing-and-update-integrity drop `--enable-unverified-updates` in one place and have every target follow. Tracked per-target comparands live at `powerbrowser/packaging/mozconfig-<target>`, one location for the whole plan set; this stage emits no per-target file and adds no such row, it only makes the next two stages a tail plus a TARGETS row each. Name the shared half `mozconfigSharedLines` so both later stages call the same symbol.

Emitters: `emitVersionTxt` and `emitVersionDisplayTxt` write one bare line plus newline (milestone() reads the last line; the shape matches upstream/browser/config byte for byte). emitMozconfig gains `ac_add_options --enable-update-channel=<channel>`, `ac_add_options --with-version-file-path=<path task 1 routed>` (a fixed literal carrying no manifest value), `mk_add_options "export MAR_CHANNEL_ID=<marChannelId>"` and `mk_add_options "export ACCEPTED_MAR_CHANNEL_IDS=<marChannelId>"` (the export form .mozconfig line 16 already uses for an option(env=...) value), with the emitter comment updated and --enable-unverified-updates left in place. emitIdentityConfigure gains `set_config("MOZ_APPUPDATE_HOST", "<hostname of urls.update>")` when urls.update is stated and nothing when it is unset (the stock aus5 host then stands and the allowlist deny entry catches it at layer 3, the existing fail-loud path), with the banner naming the new line; set_config with a literal string is the upstream idiom (upstream/moz.configure carries `set_config("WASM_OBJ_SUFFIX", "wasm")`), and nothing else in the pinned tree set_configs MOZ_APPUPDATE_HOST, so there is no duplicate. mozillaEndpointPrefs returns six entries, adding app.update.url.manual from urls.download ("" when unset), app.update.url.details from urls.release_notes ("" when unset), app.releaseNotesURL and app.releaseNotesURL.aboutDialog from urls.release_notes ("about:blank" when unset, the value aboutDialog.js already treats as "no link"), all through assertEmittable; the two static blank lines plus their comment leave FIREFOX_BRANDING_BASE_LINES.

TARGETS gains two rows: generated packaging/version/version.txt with tracked powerbrowser/packaging/version/version.txt and the display twin, both on the dev variant.

Self-test: FIXTURE_BASE states `revision = 1` and the `[update]` channel; new red cases for a revision written as text, a revision of 0, a channel carrying a space, and an ESR tag from which no version derives (`ACME_1_2_3_RELEASE`); one control case that the fixture derives 1.2.3, 1.2.3-1, v1.2.3-1 and acme-browser-release and that the emitted mozconfig carries the four lines.

Run the generator and copy over: generated/.mozconfig to .mozconfig, generated/identity.configure to powerbrowser/identity.configure.comparand, generated/branding/dev/pref/firefox-branding.js and the release twin to their tracked paths, generated/packaging/version/* to powerbrowser/packaging/version/. Add the two version rows to EXPECTED in verify-generated-identity.mjs and correct its count comment in all four places the old count is spelled.

Allowlist: add four prefs entries (name, expect equal to the shipped manifest value, reason stating the manifest key and that the stock unofficial values pointed at nightly.mozilla.org); mark the updates.powerbrowser.org entry with `"manifest": "urls.update"` and rewrite its reason (the host is baked into application.ini through MOZ_APPUPDATE_HOST from generated/identity.configure, upstream/build/moz.build lines 95-97, no policy involved); rewrite the aus5 reason (a resolution now means a build whose configure did not carry the fork host, never a missing policy); extend the powerbrowser.org reason to name urls.download and urls.release_notes as click-only destinations that keep it a deny entry for exactly the reason already recorded there, and leave it unmarked because the `manifest` field holds one dotted key and two keys now share that host.

REBRANDING.md: rows for `product.revision` and `urls.download`, a new `[update]` section with `update.channel`, and Reaches cells for `urls.update` (MOZ_APPUPDATE_HOST), `urls.download` (app.update.url.manual) and `urls.release_notes` (app.update.url.details, app.releaseNotesURL, app.releaseNotesURL.aboutDialog, descriptor detailsURL). Stage every file before any scan. Commit as feat(distribution-S2): release identity, update channel and baked host through the generator.</action>
  <verify>
    <automated>ESR=$(tail -1 upstream/config/milestone.txt) && git add configuration.toml scripts/lib/config-schema.json scripts/generate.mjs .mozconfig powerbrowser/identity.configure.comparand powerbrowser/branding/dev/pref/firefox-branding.js powerbrowser/branding/release/pref/firefox-branding.js powerbrowser/packaging/version/version.txt powerbrowser/packaging/version/version_display.txt scripts/verify-generated-identity.mjs powerbrowser/endpoint-allowlist.json docs/REBRANDING.md && node scripts/generate.mjs && node scripts/generate.mjs --check && node scripts/generate.mjs --self-test && grep -q 'mozconfigSharedLines' scripts/generate.mjs && node scripts/verify-generated-identity.mjs && node scripts/verify-generated-identity.mjs --self-test && node scripts/verify-theia-endpoints.mjs && node scripts/verify-rebranding-docs.mjs && test "$(cat powerbrowser/packaging/version/version.txt)" = "$ESR" && test "$(cat powerbrowser/packaging/version/version_display.txt)" = "$ESR-1" && grep -q '^ac_add_options --enable-update-channel=release$' .mozconfig && grep -q 'with-version-file-path=' .mozconfig && grep -q 'export MAR_CHANNEL_ID=powerbrowser-release' .mozconfig && grep -q 'export ACCEPTED_MAR_CHANNEL_IDS=powerbrowser-release' .mozconfig && grep -q '^set_config("MOZ_APPUPDATE_HOST", "updates.powerbrowser.org")$' powerbrowser/identity.configure.comparand && grep -q 'pref("app.update.url.manual", "https://powerbrowser.org/download");' powerbrowser/branding/release/pref/firefox-branding.js && grep -q 'pref("app.releaseNotesURL.aboutDialog", "https://powerbrowser.org/releases");' powerbrowser/branding/dev/pref/firefox-branding.js && node -e 'const a=JSON.parse(require("fs").readFileSync("powerbrowser/endpoint-allowlist.json","utf8"));const u=a.hosts.find(h=>h.host==="updates.powerbrowser.org");if(!u||u.manifest!=="urls.update")process.exit(1);for(const n of ["app.update.url.manual","app.update.url.details","app.releaseNotesURL","app.releaseNotesURL.aboutDialog"]){if(!a.prefs.find(p=>p.name===n))process.exit(1)}' && bash scripts/check-patch-surface.sh && scripts/verify-platform.sh --quick</automated>
    <fails_when>the generator or any of its self-test plants fails, the emitted bytes differ from a tracked comparand, a derived pref lacks its allowlist expect, a schema key is undocumented, any emitted value is absent from its tracked surface, the manifest mark is missing, the patch-surface scan finds a brand value, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - One exported derivation feeds version files, mozconfig lines, the identity carrier and the six prefs; no second literal of the version, tag or channel exists in scripts/ outside the manifest and the comparands
    - The emitted --with-version-file-path value equals the path task 1's record routed, and the acceptance note in the commit message states which branch shipped
    - Two new tracked comparands under powerbrowser/packaging/version/ match upstream's bare-line shape and the byte-identity gate covers them
    - Every derived pref has an allowlist expect equal to the derivation, updates.powerbrowser.org is manifest-marked, and powerbrowser.org's reason names both keys that now land on it
    - Generator self-test goes red on a text revision, a zero revision, a malformed channel and a version-less tag, and green on the control
  </acceptance_criteria>
  <done>configuration.toml is the only place the revision, channel and update host are stated, and every derived surface has its comparand and its --check coverage</done>
</task>

<task type="auto">
  <name>Policy file, hop gate, branding gate and documents follow the baked host</name>
  <reversibility rating="reversible">Text and gate changes only; the AppUpdateURL key can be restored from history if the baked host is ever reverted.</reversibility>
  <read_first>
    - scripts/verify-mar-update-hop.mjs: `const POLICY_REL` (58), `const args = process.argv.slice(2)` and `const SELF_TEST` (60-61, parsed at module load, so any importer invoked with its own flags either runs this file's self-test or exits 2), `export function buildUpdateXml` (109), `export function parseUpdateXml` (120), `function readPolicyUrl` (177-191), `function runChecks(root)` and its static half (193-212), the `const genArgs` fresh-emission block (267), the self-test mirror with its policies write (330-370, the write at 344), `if (SELF_TEST) selfTest();` (495) and `const INVOKED_DIRECTLY` with its guard (500-515). The 495 dispatch running ABOVE the 500 guard is the trap
    - upstream/toolkit/mozapps/update/UpdateService.sys.mjs: `attr.name == "detailsURL"` read from the descriptor (2384-2385), the fallback to `PREF_APP_UPDATE_URL_DETAILS` when the descriptor supplies none (2440-2448), and `getUpdateURL` preferring the AppUpdateURL policy over `Services.appinfo.updateURL` (5453-5475)
    - upstream/build/application.ini.in lines 54-55 (the `[AppUpdate]` section and the URL line the static half now parses)
    - scripts/verify-webextensions.mjs: it pins ONLY policies.json's ExtensionSettings key and requires every sibling key to stay byte-identical, so deleting AppUpdateURL is safe and deleting anything else is not
    - powerbrowser/distribution/policies.json (four keys today: AppUpdateURL, DisableTelemetry, DisableFirefoxStudies, ExtensionSettings)
    - docs/BUILD.md: the layer-3 install command block at 642-649, the updater-enablement and key-custody text at 705-740, the "Two baked-in facts" block at 741-755 (whose claim that "no mozconfig lever can change it" this stage refutes), the "Policy install (REQUIRED post-build step)" section at 756-771, the N+1 scratch-mozconfig step at 781-801, `MAR_CHANNEL_ID=default` and its rationale at 815-840, the step-5 loopback test policies.json at 866-873 (which STAYS), the packaging-matrix Linux row at 996 (which records a past observation "per the post-build step"), and line 418's claim that the binary reports `DeBIOS powerbrowser 153.1.0esr`
    - docs/BUILD.md line 1170 and scripts/lib/firefox-bidi.mjs line 11: both name `153.1.0esr` as the version of STOCK `objdir/dist/bin/firefox` / `Mozilla Firefox`, which does not change. They must survive this task untouched, which is why the residue assertion below is scoped rather than a blanket grep
    - scripts/verify-branding-identity.mjs: `const VERSION_DISPLAY_PATH` (267, pointing at upstream/browser/config/version_display.txt), `function readVersionDisplay` (295) and `function readConfigStatusVar(path, name)` (302, already used for MOZ_APP_DISPLAYNAME and MOZ_APP_REMOTINGNAME), `const CONFIG_STATUS_PATH = configStatusOverride || variant.configStatus` (266) with the variant table above it (objdir/config.status for dev, objdir-release/config.status for release), the two readVersionDisplay call sites in `checkRuntimeIdentity` (462) and `checkVersion` (545), the header comments describing surface 3 (line 31, whose pasted sentinel example carries the old version) and surface 6 (76-78, which cites the upstream path)
    - scripts/verify-platform.sh registry rows `verify-branding-identity-dev` (4520), `verify-branding-identity-release` (4521) and `branding-variant-divergence` (4519); and the GATE_KNOWN_OPEN_EXCLUSIONS block (4781-4793) whose two entries are keyed on WINDOWS.md ledger entry 10, which is `"status": "fixed"` (objdir-release was built 2026-09-05 and both rows PASS), so the exclusions no longer apply and a red in either row now fails --gate outright
    - scripts/smoke-firefox.sh lines 41-42, the --version grep. Stage prerequisites-and-hardening task 6 already replaced the hand-kept literal there with a value read at run time from `upstream/browser/config/version_display.txt`; this task repoints that read at the fork's own version file
    - upstream/python/mozbuild/mozbuild/configure/options.py, `ConflictingOptionError`: a repeated option value in one mozconfig raises
  </read_first>
  <files>powerbrowser/distribution/policies.json, scripts/verify-mar-update-hop.mjs, scripts/verify-branding-identity.mjs, docs/BUILD.md, scripts/smoke-firefox.sh</files>
  <action>policies.json: delete the AppUpdateURL key and nothing else; DisableTelemetry, DisableFirefoxStudies and ExtensionSettings stay byte-identical because verify-webextensions.mjs pins that file.

Hop gate: move the argv parsing and the self-test dispatch under INVOKED_DIRECTLY so an importer's flags are never this file's. Replace POLICY_REL, readPolicyUrl and the static half with `readBakedUpdateUrl(root)` reading `<root>/<POWERBROWSER_OBJDIR or objdir>/dist/bin/application.ini`, parsing the `[AppUpdate]` `URL=` line, failing by name when the file is absent (next step: build per docs/BUILD.md), and asserting scheme https, host equal to the manifest host, and not a Mozilla host. runChecks takes expectedHost; main derives it as the hostname of `resolveConfig().config.urls.update` imported from ./generate.mjs. State the unset branch explicitly: when urls.update is unset the static half FAILS by name, naming `urls.update` in configuration.toml and the aus5.mozilla.org deny entry in powerbrowser/endpoint-allowlist.json as the fail-loud path that stands in its place, and never constructs a URL from undefined. urls.update is optional in the schema and unstated in the tree before task 2, so this is the current shape of the tree, not a hypothetical.

Give buildUpdateXml an optional detailsURL emitted as a `detailsURL` attribute on the update element when provided, teach parseUpdateXml to return it, and let genArgs read hop.detailsURL when present so the 08-04 loopback evidence stays byte-valid. Rewrite the header: the effective URL is baked, the test prefix's policies.json is only the loopback override (served: loopback), stage 5 adds served: release. Self-test: the mirror writes objdir/dist/bin/application.ini with the fork host instead of policies.json and passes a detailsURL; add three plants, application.ini absent (red naming the build), application.ini host aus5.mozilla.org (red naming the host and the file), and a fixture manifest with urls.update unset (red naming urls.update and the allowlist, not a thrown TypeError); keep the existing plants and the literal-IP carve-out.

Branding gate: repoint the version expectation from the source file to the variant's own build. Delete `VERSION_DISPLAY_PATH` and `readVersionDisplay`, and at both call sites read `readConfigStatusVar(CONFIG_STATUS_PATH, 'MOZ_APP_VERSION_DISPLAY')`, the same reader and the same variant-derived path the desktop-entry and brand-full-name surfaces already use for MOZ_APP_DISPLAYNAME and MOZ_APP_REMOTINGNAME. This is the fix for the one way this stage could leave a registered row permanently red: the display version stops being the upstream `<ESR>esr` shape, only the dev objdir is rebuilt (task 5), and objdir-release is not rebuilt until stage 4 packages from it, so a source-file expectation would compare the release binary against a version its configure never saw and ledger entry 10 is closed, meaning no exclusion would excuse it. Reading each objdir's own config.status keeps both rows green with no second tier-3 build and does not weaken the surface: it still catches a binary whose reported version disagrees with the configure that produced it (a stale relink or the silent milestone() fallback), and the source-of-truth comparison it gives up is what task 4's release-identity row and task 5's config.status assertions now carry. Update the header comment for surface 6 to name config.status instead of upstream/browser/config/version_display.txt, and update the pasted sentinel example in the surface-3 comment so it no longer records a version this tree will not produce.

docs/BUILD.md: delete both policy copy blocks (642-649 and the 756-771 section); rewrite 741-755 to state the host is baked from [urls].update through generated/identity.configure (upstream/build/moz.build lines 95-97) and that the policy is used only as the loopback override in the test prefix; correct line 418 to the display version this tree now produces (`DeBIOS powerbrowser <ESR>-1`, with `<ESR>` the value of `tail -1 upstream/config/milestone.txt` at the time of writing, spelled out in the doc), leaving the surrounding explanation of vendor-plus-basename concatenation intact; add one clause to the packaging-matrix Linux row at 996 marking its policy install as the pre-REL-01 mechanism the row was observed under, so a deleted section is not cited as current procedure; in the N+1 procedure state that the scratch mozconfig REPLACES the tracked --with-version-file-path line (a second value raises ConflictingOptionError) and that N+1 is revision+1 of the same ESR (display `<ESR>-2`, app version unchanged, offered because the client compares buildID when versions tie); replace MAR_CHANNEL_ID=default with powerbrowser-release and its rationale (the manifest-derived id, now in ACCEPTED_MAR_CHANNEL_IDS); note the four new mozconfig lines under updater enablement.

smoke-firefox.sh: grep for the content of powerbrowser/packaging/version/version_display.txt instead of the literal, and name that file in the failure message. This row is in the full set, not --quick, and it runs its own incremental `./mach build`, so between this task and task 5 it is the one registered row that reports the old version; task 5 closes that window and re-runs it.

Commit as feat(distribution-S2): hop gate reads the baked update host; policy loses AppUpdateURL.</action>
  <verify>
    <automated>git add powerbrowser/distribution/policies.json scripts/verify-mar-update-hop.mjs scripts/verify-branding-identity.mjs docs/BUILD.md scripts/smoke-firefox.sh && node --check scripts/verify-mar-update-hop.mjs && node --check scripts/verify-branding-identity.mjs && node scripts/verify-mar-update-hop.mjs --self-test && node --input-type=module -e "import('./scripts/verify-mar-update-hop.mjs').then(m => { if (typeof m.parseUpdateXml !== 'function' || typeof m.buildUpdateXml !== 'function') process.exit(1); })" -- --self-test --bogus && node scripts/verify-webextensions.mjs && ! grep -q 'AppUpdateURL' powerbrowser/distribution/policies.json && ! grep -q 'cp powerbrowser/distribution/policies.json' docs/BUILD.md && ! grep -q 'MAR_CHANNEL_ID=default' docs/BUILD.md && grep -q 'ConflictingOptionError' docs/BUILD.md && ! grep -rn 'DeBIOS[^|]*153\.1\.0esr' docs/ scripts/ && ! grep -q '153\.1\.0esr' scripts/smoke-firefox.sh && ! grep -q '153\.1\.0esr' scripts/verify-branding-identity.mjs && grep -q 'Mozilla Firefox 153\.1\.0esr' docs/BUILD.md && grep -q 'packaging/version/version_display.txt' scripts/smoke-firefox.sh && ! grep -q 'browser/config/version_display.txt' scripts/verify-branding-identity.mjs && grep -q "readConfigStatusVar(CONFIG_STATUS_PATH, 'MOZ_APP_VERSION_DISPLAY')" scripts/verify-branding-identity.mjs && scripts/verify-platform.sh --only mar-update-hop-self-test && scripts/verify-platform.sh --only verify-branding-identity-dev && scripts/verify-platform.sh --only verify-branding-identity-release && scripts/verify-platform.sh --only branding-variant-divergence && scripts/verify-platform.sh --quick</automated>
    <fails_when>the reshaped self-test or any plant fails, importing the hop module with foreign flags runs its self-test or exits, the policy still carries AppUpdateURL, a copy step or the default MAR channel survives in BUILD.md, a fork-version literal survives in docs/ or scripts/, the stock-Firefox reference was collaterally rewritten, either branding-identity row or the divergence row goes red on the un-rebuilt objdirs, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Static half derives the expected host from the built application.ini and the manifest, never from a policy file, and fails by name rather than throwing when urls.update is unset
    - Descriptor carries detailsURL when given and existing evidence stays byte-valid
    - Import guard covers argv; three new plants go red naming the build, the host and the unset key
    - Both branding-identity rows and branding-variant-divergence stay green against the objdirs as they stand, with no second tier-3 build
    - BUILD.md carries no post-build policy step, states the replace-line rule and the revision+1 N+1 shape, and its two stock-Firefox version references are untouched
  </acceptance_criteria>
  <done>No shipped install depends on a file the package never carries; the gate, the branding surfaces and the documents describe the baked mechanism, and no registered row is left permanently red</done>
</task>

<task type="auto">
  <name>REL-01 release-identity gate with self-test and registry rows</name>
  <reversibility rating="reversible">One script and two registry rows; removal is one revert.</reversibility>
  <read_first>
    - scripts/verify-generated-identity.mjs (whole file: EXPECTED versus derived set, self-test planted in memory, the no-checkout-path assertion, unknown-argument refusal)
    - scripts/verify-platform.sh: `run_own_checks()` and its `local -a CHECKS=(` registry array (3572) with the honesty-comment idiom that states why each row is --quick; the `generated-byte-identity` and `generated-byte-identity-self-test` pair (3916-3917) the new rows sit beside; `generate-check` (3978)
    - scripts/generate.mjs `releaseIdentity` and `resolveConfig(defaultsPath, downstreamPath)` (task 2; resolveConfig takes a manifest path, which is what lets the self-test resolve a fixture manifest)
    - scripts/verify-mar-update-hop.mjs `parseUpdateXml` (task 3; importable now that argv parsing sits under the direct-invocation guard)
    - .github/workflows/verify.yml, the actions/checkout step (43-46): no fetch-depth and no fetch-tags, so on CI the tag half of this gate sees an empty tag list
    - The tree as it stands: `git tag -l` returns v1.0, v1.1, v1.2, v1.3, none matching the release pattern, and `git ls-files -- '*update.xml'` is empty. Checks 2, 3 and 4 therefore assert nothing outside the self-test today and must each print a named line saying so; only check 1 is load-bearing on this tree, which is why check 1 is unconditional
  </read_first>
  <files>scripts/verify-release-identity.mjs, scripts/verify-platform.sh</files>
  <action>Write scripts/verify-release-identity.mjs with a runChecks(root, config) that derives everything from releaseIdentity(config) and compares: (1) powerbrowser/packaging/version/version.txt equals esrVersion and version_display.txt equals displayVersion, both read from root, always applied so the gate is never vacuous; (2) every tracked descriptor from `git ls-files -- '*update.xml'` parses through parseUpdateXml with appVersion equal to esrVersion and displayVersion equal to displayVersion, the count printed and zero stated by name; (3) release tags matching `^v(\d+)\.(\d+)\.(\d+)-(\d+)$` from `git tag -l` that do not point at HEAD (`git tag --points-at HEAD`) must each compare strictly lower than (esr triple, revision), and an empty set prints one named line stating first release or a checkout without tags; (4) `git describe --exact-match --tags --match 'v[0-9]*.[0-9]*.[0-9]*-[0-9]*' HEAD` succeeding requires the tag to equal the derived tag, failing prints `SKIP -- HEAD carries no release tag` and the exit code follows (1) to (3) alone. Refuse unknown arguments like its siblings and never print this checkout's absolute path.

Self-test in a mkdtemp git repository (git init, a local user identity, one commit) with a fixture manifest resolved through resolveConfig(fixturePath) and fixture version files: control green with HEAD tagged at the derived tag and an older release tag present; then plants each required to go red naming the drift: version_display.txt off by one revision, version.txt carrying a different ESR, HEAD tagged one revision above the derivation, a release tag equal to the derivation left on an older commit (not strictly greater), a tracked update.xml whose appVersion differs; then the untagged-HEAD polarity case that must stay green and print the SKIP line by name.

Append two rows beside generated-byte-identity with the honesty comment (git plumbing plus text files; no build, no browser, no display, no network) and a note that stage 5's release workflow must check out with tags for check (3) to see prior releases, while verify.yml's shallow checkout reaches the named empty-set line. Commit as feat(distribution-S2): release-identity gate.</action>
  <verify>
    <automated>git add scripts/verify-release-identity.mjs scripts/verify-platform.sh && node --check scripts/verify-release-identity.mjs && node scripts/verify-release-identity.mjs && node scripts/verify-release-identity.mjs --self-test && ! node scripts/verify-release-identity.mjs --selftest && scripts/verify-platform.sh --only release-identity && scripts/verify-platform.sh --only release-identity-self-test && scripts/verify-platform.sh --only generated-byte-identity && scripts/verify-platform.sh --quick</automated>
    <fails_when>the gate exits non-zero on the unmodified tree, any self-test plant fails to go red naming its drift, the untagged polarity case goes red, a misspelled flag is accepted, either registry row is absent, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Expectations derive from the manifest and the tree at check time; the only literal is the tag pattern
    - Five red plants plus one green polarity case; every empty set and every skip is printed by name, never silent
    - Two rows appended, no sibling driver
  </acceptance_criteria>
  <done>A tag, the version files and any committed descriptor cannot disagree without the commit gate saying which one drifted</done>
</task>

<task type="auto">
  <name>Batched dev rebuild proving the baked identity in the built tree</name>
  <reversibility rating="reversible">objdir/ is git-ignored build output; the timings row is a document line.</reversibility>
  <read_first>
    - docs/BUILD.md "Packaging timings (attributed: tree plus host plus toolchain)" table at 1009: every row's wall-time column cites the mach log path it was measured from (`.mozbuild/task1-updater-rebuild.log`, `.mozbuild/task2-nplus1-build.log`, `.mozbuild/release-build-0805.log`), which is the shape the new row must copy, and the updater-enablement section task 3 rewrote
    - upstream/build/moz.build line 25 (`DEFINES["ACCEPTED_MAR_CHANNEL_IDS"]`) and line 120 (update-settings.ini staged into dist/bin) and upstream/browser/app/profile/channel-prefs.js (app.update.channel from MOZ_UPDATE_CHANNEL)
    - scripts/smoke-firefox.sh (task 3 derived expectation; it runs its own incremental `./mach build` before `./mach run --version`) and scripts/verify-endpoints.sh layer 1 (installed pref file against the allowlist expects)
    - scripts/verify-mar-update-hop.mjs (task 3: the static half reads objdir/dist/bin/application.ini; the evidence half reads .mozbuild/mar-hop/)
    - scripts/verify-branding-identity.mjs (task 3: the version expectation now comes from objdir/config.status, so the dev row must be re-run against the rebuilt objdir)
  </read_first>
  <files>docs/BUILD.md</files>
  <action>All mozconfig changes of this stage landed in task 2, so one rebuild covers them (stage 3 rebuilds again when it removes --enable-unverified-updates and adds the key patch; that is the second and last rebuild before packaging, and objdir-release is not rebuilt here because task 3 made the branding rows read each objdir's own config.status, so the unrebuilt release tree stays green until stage 4 packages from it).

Inside `nix develop .#firefox` with cwd upstream/ run `./mach configure` then `./mach build` for the dev objdir in the background (about 55 minutes on legion per the timings table), logging mach wall time to `.mozbuild/stage2-rebuild.log`.

Then assert on the built tree, deriving the ESR version as `ESR=$(tail -1 upstream/config/milestone.txt)` rather than typing it (stage prerequisites-and-hardening moved the pin, so a typed version is a false red): objdir/config.status substs MOZ_APP_VERSION `$ESR`, MOZ_APP_VERSION_DISPLAY `$ESR-1`, MOZ_UPDATE_CHANNEL release, MAR_CHANNEL_ID and ACCEPTED_MAR_CHANNEL_IDS powerbrowser-release, MOZ_APPUPDATE_HOST updates.powerbrowser.org; objdir/dist/bin/application.ini `Version=$ESR` and an `[AppUpdate]` URL beginning `https://updates.powerbrowser.org/update/6/`; objdir/dist/bin/update-settings.ini ACCEPTED_MAR_CHANNEL_IDS=powerbrowser-release; channel-prefs.js carrying "release"; `./mach run --version` reporting `$ESR-1` through smoke-firefox.sh; verify-branding-identity-dev green against the rebuilt objdir; layer 1 of verify-endpoints.sh green on the installed pref file with the four URL prefs; the full mar-update-hop row green (static half on the rebuilt application.ini, evidence half on the existing loopback evidence under .mozbuild/mar-hop/).

Append one attributed row to the packaging-timings table naming this tree state, the host and the toolchain, with the wall time citing `.mozbuild/stage2-rebuild.log` in the same column shape the three existing rows use, and record the observed MOZ_ESR absence in the updater-enablement text as the consequence of the display-version shape. Commit as docs(distribution-S2): rebuilt with release identity; timings.</action>
  <verify>
    <automated>ESR=$(tail -1 upstream/config/milestone.txt) && git add docs/BUILD.md && grep -q "'MOZ_APP_VERSION_DISPLAY': '$ESR-1'" objdir/config.status && grep -q "'MOZ_UPDATE_CHANNEL': 'release'" objdir/config.status && grep -q "'ACCEPTED_MAR_CHANNEL_IDS': 'powerbrowser-release'" objdir/config.status && grep -q "'MOZ_APPUPDATE_HOST': 'updates.powerbrowser.org'" objdir/config.status && grep -q '^Version='"$ESR"'$' objdir/dist/bin/application.ini && grep -q '^URL=https://updates.powerbrowser.org/update/6/' objdir/dist/bin/application.ini && grep -q '^ACCEPTED_MAR_CHANNEL_IDS=powerbrowser-release$' objdir/dist/bin/update-settings.ini && grep -q '"release"' objdir/dist/bin/defaults/pref/channel-prefs.js && bash scripts/verify-endpoints.sh --layer 1 && scripts/verify-platform.sh --only smoke-firefox && scripts/verify-platform.sh --only verify-branding-identity-dev && scripts/verify-platform.sh --only mar-update-hop && grep -q 'stage2-rebuild.log' docs/BUILD.md && scripts/verify-platform.sh --quick</automated>
    <fails_when>any subst or installed file carries the stock value (the silent version-file fallback, a missed export, or a stale objdir), the binary reports a different display version, the branding dev row disagrees with the rebuilt config.status, layer 1 disagrees with the allowlist expects, the hop row fails on the rebuilt tree, the timings row or its log citation is missing, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Built tree carries the derived version, display version, channel, MAR channel id and update host in every file that consumes them
    - All three live rows that read the built tree (smoke-firefox, verify-branding-identity-dev, mar-update-hop) are green on it
    - One attributed timings row added, citing its own mach log the way the existing rows do; no inherited number presented as fresh
  </acceptance_criteria>
  <done>The stage's claims are proven in a built tree, not only at configure level, at the cost of one batched rebuild</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Manifest to build surfaces | configuration.toml values reach a sourced mozconfig, a configure fragment executed in the configure sandbox, and default pref files; each interpolation passes the schema regex and assertEmittable. |
| Git tags to release identity | Tag names are read from the local repository and compared with the manifest derivation; a shallow clone hides tags. |
| Built application.ini to the update origin | The baked host is the only origin a shipped install polls; TLS to the fork host is the transport trust until stage 3 restores MAR signature verification. |
| Allowlist to observed hosts | Manifest hosts must be covered and marked; the deny entry for aus5 catches a build whose configure lost the fork host, and the deny entry for powerbrowser.org keeps the two new click destinations out of the unattended-callout set. |
| Built objdir to the gate that reads it | Each variant's assertions are read from that variant's own config.status, so a tree built from an older manifest is compared with the configure that produced it rather than with a source file it predates. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-S2-01 | Tampering | build baked with the stock aus5 host (stale objdir, missed set_config) | high | mitigate | Hop gate static half compares the built application.ini host with the manifest host; verify-endpoints layer 3 keeps aus5 as a deny entry; task 5 asserts the subst and the installed file. |
| T-S2-02 | Spoofing | a release tag naming a version the build does not carry | high | mitigate | release-identity row requires the HEAD tag to equal the derived tag, version files to equal the derivation, and every committed descriptor to agree; stage 5's workflow runs it with tags fetched. |
| T-S2-03 | Tampering | version file path falling back silently to upstream's version (milestone() breaks out on a missing file) | medium | mitigate | Task 1 probes the resolution live with the tracked N-plus-1 test files, comparing against their contents rather than a typed version; task 5 asserts MOZ_APP_VERSION_DISPLAY and the binary's --version on the rebuilt tree; the branding version surface compares the binary with its own config.status, so a stale relink after a correct configure is also caught. |
| T-S2-04 | Elevation of privilege | manifest value injected into the sourced mozconfig or the configure sandbox | medium | mitigate | Schema regexes on channel and URLs, the integer type on revision, assertEmittable on every interpolation, and the fixed literal for the version-file path; generator self-test plants a malformed channel and a text revision. |
| T-S2-05 | Repudiation | a MAR built for one channel accepted by another once verification returns | medium | mitigate | MAR_CHANNEL_ID and ACCEPTED_MAR_CHANNEL_IDS derive from one identity function and land in update-settings.ini, asserted in task 5; stage 3 adds the planted wrong-channel row. |
| T-S2-06 | Information disclosure | the two new powerbrowser.org URLs turning into unattended callouts | low | mitigate | Both are click destinations only (aboutDialog-appUpdater renders the manual link on the failure path; UpdateService reads detailsURL for a user-opened page). powerbrowser.org stays a deny entry, so any resolution of it is still a layer-3 failure, and the reason names the two new keys. |
| T-S2-07 | Denial of service | release-notes and manual-update links pointing at paths that do not resolve yet | low | accept | The two powerbrowser.org paths are stated now and served by stage 5's Pages deploy; until then they are ordinary 404s on a page the user reaches by click, never an unattended callout. |
| T-S2-SC | Tampering | npm/pip/cargo installs | low | mitigate | No new package of any kind; every script uses node built-ins and git. |
</threat_model>

<verification>
Probe record with a verdict, a routed path and pasted substs; generator, byte-identity, theia-endpoints, rebranding-docs and patch-surface gates green after the copy-over; hop self-test green with the three new plants; both branding-identity rows and branding-variant-divergence green on the objdirs as they stand after the branding-gate repoint; release-identity gate plus self-test green with the untagged polarity case; rebuilt dev tree carrying every derived value with smoke-firefox, verify-branding-identity-dev, layer 1 and mar-update-hop green; quick gate green after every task; upstream diff empty throughout.
</verification>

<success_criteria>
configuration.toml is the only place the revision, channel and update host are stated; every derived surface has a tracked comparand and --check coverage; a shipped install polls the fork origin from its baked application.ini without a policy file; the about-dialog manual-update and release-notes links resolve to stated URLs; the --quick gate names any disagreement between a release tag, the version files and a committed descriptor; and no registered check is left red or excused by a closed ledger entry at stage close.
</success_criteria>

<output>
Stage 2 delivers the release identity every later stage consumes: stage 3 signs MARs for channel powerbrowser-release and embeds keys in the release_*.der slot; stage 4 packages a tree whose version files and prefs are generated, and rebuilds objdir-release for that packaging; stage 5 tags v&lt;ESR&gt;-1 (v153.2.0-1 at the pin stage prerequisites-and-hardening leaves), serves updates.powerbrowser.org and powerbrowser.org/download and /releases, and runs release-identity with tags fetched.
</output>
