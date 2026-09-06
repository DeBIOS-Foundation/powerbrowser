---
id: SEED-001
status: dormant
planted: 2026-09-05
planted_during: v1.2 shipped; v1.3 Browser GUI (Phases 13-15) started concurrently
trigger_when: the next milestone scopes a first public release, per-OS installers on GitHub Releases, self-update, or crash/error/bug reporting
scope: Large, a full milestone (proposed Phases 13 to 21)
---

# SEED-001: Standard distribution, self-update from GitHub, and reports

## Why This Matters

A user must be able to download the installer for their OS from GitHub, install it, and receive later releases through the built-in updater. Maintainers must receive crash, error and bug reports. Today only a Linux tarball has ever been packaged, the packaged tarball does not contain the Theia sidecar or a Node runtime, the update policy file is never packaged so every shipped build would poll Mozilla, MARs are unsigned, the public repo is 168 commits and three tags behind this tree, and CI is red on GitHub. This seed records the verified state, the corrected goal list, the gaps, the telemetry design, the infrastructure and the decisions needed.

## When to Surface

**Trigger:** the next milestone scopes a first public release, per-OS installers on GitHub Releases, self-update, or crash/error/bug reporting.

This seed will surface during /gsd-new-milestone when the milestone scope matches. It supersedes the stale "Phase 08: Real installer builds" entry in .planning/NEXT-MILESTONE-INPUTS.md.

## Scope Estimate

**Large.** Nine dependency-ordered phases (13 to 21) are proposed below; the first public Linux release is reachable after Phases 13 to 17.

## Breadcrumbs

- docs/BUILD.md lines 687 to 1056 (packaging procedure, hosts, MAR hop, timings)
- powerbrowser/distribution/policies.json (AppUpdateURL that never ships)
- powerbrowser/endpoint-allowlist.json (single source of truth for outbound hosts)
- powerbrowser/shell/powerbrowser-sidecar.js (backendMain baked to the dev tree path)
- scripts/verify-mar-update-hop.mjs (buildUpdateXml, hop evidence contract)
- scripts/crash-collector.mjs, scripts/verify-crash-collector.mjs, docs/CRASH-POLICY.md
- scripts/generate.mjs (urls.update key read at 2592, telemetry emission, inkscape spawn at 2883)
- .github/workflows/verify.yml (red on GitHub: no inkscape on the runner)
- upstream/build/moz.build:95-97 (MOZ_APPUPDATE_HOST config lever), upstream/browser/installer/package-manifest.in:463-465 (distribution/ gated on BUILT_BY_MOZILLA)
- .planning/NEXT-MILESTONE-INPUTS.md (stale Phase 08 installer entry)

## Provenance

Produced 2026-09-05 by a 14-agent review: two tree readers, five lenses (fork standard practice, security and trust, project hard rules, telemetry/crash/bug reports, infrastructure and operations), one adversarial verifier per lens, a completeness critic and a synthesizer. 107 findings, 93 confirmed, 3 refuted, 11 critic findings unverified and labelled as such where used. Three headline findings were re-checked by hand in the tree: no sidecar in the packaged tarball, distribution/ not packaged, MOZ_APPUPDATE_HOST honoured from CONFIG.

## Intent

A user downloads the installer for their OS from GitHub, installs it, and receives later releases through the built-in updater from GitHub. Crash reports, error reports and bug reports reach the maintainers. The project owns GitHub (org DeBIOS-Foundation, Free plan, public repository), a Cloudflare account (Free plan) and powerbrowser.org. The shape must be the one every self-updating Gecko fork uses: tag-triggered builds, one GitHub Release per tag with stable asset names, a project-owned update origin serving per-target descriptors, MAR bytes on the Release, signed MARs, and package-manager listings after the first release.

## Current state

### Distribution

- Only Linux tarballs have ever been packaged (objdir/dist/powerbrowser-153.1.0.en-US.linux-x86_64.tar.xz, objdir-nplus1 for 153.1.1). No .exe, .dmg or .msix exists. .mozbuild/installer-proof/instgen/setup.exe is an NSIS compile proof over upstream stand-in artwork with no Windows Gecko build inside.
- The pinned tree cross-compiles Windows (taskcluster/kinds/build/windows.yml worker-type b-linux-docker-amd, get_vs.py with build/vs/vs2026.yaml) and macOS (build/macosx/cross-mozconfig.common, macosx.yml on b-linux-docker-amd, unify.sh for universal, dmg.py Linux branch) on Linux. docs/BUILD.md's packaging-hosts and MSIX/DMG sections state the opposite and are refuted.
- Every packaged artifact ships a shell with no Theia sidecar (spot-checked 2026-09-05): the tarball lists zero theia, node or sidecar entries; omni.ja carries only debugger.js, firefox.js and firefox-branding.js; powerbrowser/shell/powerbrowser-sidecar.js bakes backendMain to @POWERBROWSER_DEV_TREE@/theia/applications/browser/lib/backend/main.js (TOPSRCDIR + '/..') and nodePath to '' (system node). A packaged launch reaches the unrecoverable interface-files-missing layer. The Linux matrix 'launch' cell is a sleep plus a pid check and cannot see it. No registry row runs the packaged tree.
- theia/applications/browser/package.json legalNotices reads 'PowerBrowser Dev is not officially associated with Mozilla or its products.' (dev-variant fragment by design); the same Theia build would be staged into the release package.
- The checked-in Theia install carries linux-x64 native modules only (@esbuild/linux-x64, lib/backend/native/{drivelist.node,rg,watcher.node}).
- The command-line handler sets cmdLine.preventDefault and never reads a URL argument, while the NSIS installer registers `-osint -url "%1"` handlers and the desktop entry carries %u with x-scheme-handler/http.
- TheiaService resolves THEIA_CONFIG_DIR from XDG_CONFIG_HOME or HOME (HOME is unset on Windows); Theia state is shared by every install and both variants; the Gecko profile is per-install under ~/.debios/powerbrowser.
- The product version is the ESR version verbatim (153.1.0); configuration.toml has no version or revision key; MOZ_UP2026-09-05_CHANNEL is 'default'; MAR_CHANNEL_ID and ACCEPTED_MAR_CHANNEL_IDS are unset (the built update-settings.ini reads ACCEPTED_MAR_CHANNEL_IDS=None).
- The generated branding.nsi emits six defines; defines.nsi.in keeps AppName "Firefox", Software\Mozilla registry roots, MOZ_LAUNCHER_SUBKEY, CERTIFICATE_NAME "Mozilla Corporation", TELEMETRY_BASE_URL https://incoming.telemetry.mozilla.org/submit; installer.nsi calls SendPingIfApplicable at GUI end and on the silent path and carries AbortSurveyURL (kampyle.com); the built binary keys launcher state on SOFTWARE\DeBIOS\powerbrowser (LauncherRegistryInfo.cpp) while the uninstaller cleans Software\Mozilla\Firefox.
- en-US only at every layer; extensions.getAddons.langpacks.url is blanked.
- LICENSE is PolyForm Noncommercial 1.0.0 (GitHub: NOASSERTION); legal.license emits no bytes; no THIRD-PARTY-NOTICES exists.

### Update channel

- The updater is compiled with --enable-unverified-updates (.mozconfig:8, emitted by generate.mjs:1414): MOZ_VERIFY_MAR_SIGNATURE is unset, so updater.cpp skips VerifySignature and VerifyProductInformation (channel match and downgrade check included), and DISABLE_UP2026-09-05R_AUTHENTICODE_CHECK is set. No fork MAR key exists (docs/BUILD.md 'Key-custody rung'). MARs are hash-pinned blobs; TLS is the only integrity.
- powerbrowser/distribution/policies.json (AppUpdateURL https://updates.powerbrowser.org/update.xml, a name that does not resolve) never ships: browser/installer/package-manifest.in:463-465 packages @RESPATH@/distribution/* only under BUILT_BY_MOZILLA, and the shipped tarball has zero distribution/ entries. application.ini bakes https://aus5.mozilla.org/update/6/... (allowlist deny). docs/BUILD.md documents a manual post-build copy.
- upstream/build/moz.build:95-96 prefers CONFIG["MOZ_APPUP2026-09-05_HOST"] when set; nothing sets it. generated/identity.configure (reached through patch 010) is the fork's configure fragment.
- The updater picks embedded certificates by MOZ_UP2026-09-05_CHANNEL (updater/moz.build:67-88): release_*.der for beta/release/esr, dep1/dep2 otherwise. MOZ_USE_NSS_FOR_MAR=1, so the verifier is `signmar -d <nssdb> -n <nick> -v`.
- On Windows the maintenance service builds by default when the updater is on; with DISABLE_UP2026-09-05R_AUTHENTICODE_CHECK it executes any updater.exe as LocalSystem on admin installs (registrycertificates.cpp:36-45, workmonitor.cpp:796-825).
- macOS elevated updates require subject.OU 43AQ936H96 (Mozilla's Team ID) in update-programs.configure:60-104.
- UpdateUtils.ABI has no universal suffix: BUILD_TARGET strings are Linux_x86_64-gcc3 (observed), WINNT_x86_64-msvc-x64, Darwin_aarch64-gcc3 and Darwin_x86_64-gcc3 (derived, not observed).
- scripts/verify-mar-update-hop.mjs proves a loopback hop only: it requires a fork server-access.log and a resolver hit for the descriptor host, requires policies.AppUpdateURL (:184-212), and exports buildUpdateXml (:109, complete patch only, no detailsURL) but accepts no argument other than --self-test.
- The generated branding prefs blank app.update.url.manual and app.update.url.details; app.releaseNotesURL is unset; the about-dialog fallback link throws on `new URL("")`.
- The update prompt (UpdateListener -> AppMenuNotifications -> panelUI.js in browser.xhtml) may never render in powerbrowser.xhtml, which has no PanelUI. Unverified.
- A GitHub release-asset download 302s github.com -> release-assets.githubusercontent.com (observed 2026-09-05); objects.githubusercontent.com is not in the chain.

### Repository and CI

- Local main is 168 commits ahead of origin/main; tags v1.0, v1.1, v1.2 are local only; the remote has zero tags and zero Releases.
- CI on origin/main is red at the 16-pixel icon step: verify.yml has no install step and generate.mjs shells out to inkscape while discarding its output. inkscape is absent from both flake shells and from BUILD.md and REBRANDING.md prerequisites; legion has it from the NixOS system profile (nixpkgs 1.4.4), which produced the tracked PNGs that the generated-byte-identity row compares.
- Live repository settings: no branch protection, zero rulesets, zero environments, zero secrets, allowed_actions 'all', sha_pinning_required false, org 2FA off, forking allowed, one collaborator. Both existing workflows pin actions by SHA and declare contents: read with persist-credentials: false.
- The org is on the Free plan: larger runners and additional runner groups need Team or Enterprise; environments with required reviewers and rulesets are available on public repositories.
- legion: 16 cores, 62 GB RAM, 931 GB free, about 55 min per Gecko build; sccache already configured (.mozconfig:14, flake.nix:62,85).
- rebase-upstream.yml is workflow_dispatch-only (D-77); the BUILD.md drill already rebased onto FIREFOX_153_2_0esr_RELEASE while the pin is FIREFOX_153_1_0esr_RELEASE.
- endpoint-allowlist.json: 24 hosts; no github.com, no crash-reports.mozilla.com; the aus5 reason claims 'self-hosted MAR under fork signing'; generate.mjs:2420-2427 and both generated branding pref files claim 'github.com stays a deny entry'.

### Telemetry, crash and bug reports

- configuration.toml [telemetry] level "off", endpoint unset; no [urls] table. validateTelemetry requires an endpoint only for non-off levels; emitTheiaTelemetry emits a set endpoint regardless of level; the frontend module fixes the endpoint at construction and reads the level per event from the telemetry.telemetryLevel preference with the manifest level as default.
- @powerbrowser/telemetry's sender is complete (queue 500, batch 20, 30 s flush, 3 retries, fail-closed levels) and has no producer: no window error or unhandledrejection listener, no backend hook, nothing calls sendErrorData; events carry {kind,name,data,at} with no version, buildID or OS; the preference copy promises 'uncaught errors'. TEL-02's live drill was a stubbed-fetch unit suite plus a scratch loopback post.
- Gecko: --disable-crashreporter; MOZ_CRASHREPORTER, MOZ_TELEMETRY_REPORTING, MOZ_SERVICES_HEALTHREPORT, MOZ_NORMANDY absent; about:crashes not registered; MOZ_CRASHREPORTER_URL defaults to https://crash-reports.mozilla.com in config.status; buildsymbols is a no-op without MOZ_CRASHREPORTER; dump_syms is on PATH in the nix firefox shell.
- breakpad.reportURL (from urls.crash_report) is the about:crashes view-link base, not the submit URL; the submit target is --with-crashreporter-url baked into application.ini's [Crash Reporter] ServerURL with a MOZ_CRASHREPORTER_URL runtime override. docs/REBRANDING.md:275 mislabels it.
- scripts/crash-collector.mjs is loopback-only by construction, and it keeps annotations by multipart part name while both Gecko submitters send all annotations as one 'extra' JSON part, so a real submission would store annotations {}. Its self-test only posts parts named after the allowlist.
- docs/CRASH-POLICY.md states network exposure 'needs token auth', which a public client cannot satisfy.
- No issue templates, no in-app bug-report affordance, no GitHub link (the welcome widget was retargeted to powerbrowser.org when the org did not exist), diagnostics layer has Details and Close only, no clipboard code. REQUIREMENTS.md:89 keeps 'Socorro self-host or re-enabling the native crash reporter' out of scope. No privacy statement exists.
- The Node sidecar is spawned with VSX_REGISTRY_URL=https://open-vsx.org and composes @theia/ai-anthropic, ai-openai and ai-mcp; verify-endpoints.sh layer 3 reads MOZ_LOG=nsHostResolver (Gecko only). Unverified whether Node egress is missed; no allowlist row exists for those hosts.

## Requirements (TL;DR)

- DIST-01: verify-platform.sh --quick is green on GitHub-hosted CI under the flake's inkscape; main and v1.0-v1.2 are pushed before release.yml exists.
- SEC-01: Release-tag ruleset (signed tags, restricted creation), main ruleset, org 2FA, actions policy with SHA pinning, `release` environment with a required reviewer, immutable releases; docs/RELEASING.md.
- REL-01: [product].revision plus the ESR version from [upstreams].firefox_esr_tag drive generated version files, --with-version-file-path, and release tags v<ESR>-<revision>; a quick row derives and compares tag, version files and update.xml and requires a strictly greater version than the last release tag.
- UPD-01: Channel key emits --enable-update-channel=release and MAR_CHANNEL_ID/ACCEPTED_MAR_CHANNEL_IDS = powerbrowser-release into the generated .mozconfig and `mach repackage mar --mar-channel-id`.
- UPD-02: [urls].update bakes MOZ_APPUP2026-09-05_HOST into application.ini through generated/identity.configure; policies.json no longer carries AppUpdateURL; the hop drill derives the URL from application.ini; the allowlist entry is manifest-marked.
- UPD-03: app.update.url.manual/details, app.releaseNotesURL(.aboutDialog) and descriptor detailsURL come from urls.homepage and urls.release_notes.
- SEC-02: Fork MAR key pair; DERs under brand/; hook-only patch on updater/moz.build; --enable-unverified-updates removed; every release MAR signed with signmar; a verification row with unsigned (19) and wrong-channel (22) plants.
- UPD-04: buildUpdateXml --emit writes one descriptor per BUILD_TARGET from the built artifacts, four targets from three MARs, idempotent.
- PKG-04: The Theia app and a pinned Node runtime are staged into the app directory; backendMain/nodePath resolve relative to the app directory; the sidecar pref file is packaged; packaged-launch and packaged-identity registry rows exist and the matrix driver is tracked.
- PKG-05: The release package's Theia About dialog carries release-variant legal notices.
- PKG-06: Theia state lives under the Gecko profile directory; matrix no-residue checks look at the real paths.
- PKG-07: A URL on the command line opens in the stock browser window.
- PKG-08: LICENSING.md and THIRD-PARTY-NOTICES.txt ship with every release.
- PKG-09: en-US only is stated and recorded.
- UPD-08: The update prompt claim is verified; if confirmed, the shell shows product-named 'Restart to update' copy with a working button.
- DIST-02: release.yml on release tags: build jobs on legion (read-only), sign-and-upload on a hosted runner under `release`; versioned and stable asset names; SHA256SUMS; source tarball; attestations; generated notes.
- DIST-03: Cloudflare Pages serves updates.powerbrowser.org (<channel>/<BUILD_TARGET>/update.xml plus the one-line _redirects mapping) and powerbrowser.org/download.
- UPD-05: Allowlist rows for github.com and release-assets.githubusercontent.com from a layer-3 observation; verify-endpoints forces an update check and asserts the baked host; a crash-reports.mozilla.com deny row.
- UPD-06: The real-release hop drill (served: release) proves hosts, hash, version, signature, channels-allowed and attestation, with fault plants.
- UPD-07: An update-channel-live row runs as release.yml's final job.
- PKG-10 to PKG-13, SEC-03: Windows cross toolchain shell, per-target mozconfig with --disable-maintenance-service, NSIS patch (literals, pings, registry namespace, artwork), win32 Theia build, VM matrix, Authenticode when the signing service exists.
- PKG-14 to PKG-16, SEC-04: macOS universal cross build and DMG on Linux, darwin Theia builds, rcodesign signing and notarization, Team ID patch, Mac matrix row.
- TEL-05: bug.yml, Report a Bug command, diagnostics Copy button.
- TEL-06: Frontend error hooks with version/buildID/OS, level off plus stated endpoint, Worker /events, loopback live-delivery row.
- TEL-07 (if the exclusion is retired): collector extra-part fix, [telemetry].crash_endpoint driving --enable-crashreporter/--with-crashreporter-url, Worker /submit to R2, symbols zip per release, stackwalk runbook, CRASH-POLICY.md rewrite.
- TEL-08: powerbrowser.org/privacy.
- DIST-04: winget, Homebrew cask and Flathub listings after the first release.
- DIST-05: One release per ESR point release with a documented out-of-band path.

## Corrections to the draft goals

- Items 1 and 2: fix CI first (pkgs.inkscape in both shells; verify.yml under install-nix-action plus `nix develop .#theia -c`; header comments rewritten; no inkscape stderr in the failure message), then push main and the three tags together, confirm green, then add release.yml on a pattern that excludes v1.x.
- Items 3 and 11: legion as an ephemeral self-hosted runner for build jobs only, tag and workflow_dispatch triggers, outside-collaborator approval on; hosted runner for the sign-and-upload job under `release`; item 11 dropped (sccache already configured; R2 backend only as hosted fallback note).
- Item 4: keep; add the .#firefox-win64 shell (clang-cl/lld-link, wine64, nsis, rust msvc std via fenix or rust-overlay), get_vs.py cache outside the repo, per-target mozconfig from the generator, --disable-maintenance-service on Windows, package steps in the same job, a win32-x64 Theia build and Node binary; MSIX out of scope.
- Item 5: one hook-only regenerated patch replacing the Mozilla literals with substitutions fed from a generated fragment (AppName, registry roots, launcher subkey, window classes, TELEMETRY_BASE_URL, AbortSurveyURL), removing both SendPingIfApplicable calls and the uninstaller ping; firefox64.ico from the existing ico encoder; three wizard .bmp files as brand/ inputs with byte-identity rows and ".bmp" in binary_extensions; Channel "unofficial" left alone; CERTIFICATE_* deferred to Authenticode; installer-build-proof greps the staged preprocessed .nsi sources (a compiled-exe grep never goes red).
- Item 6: runtime proof only; BUILD.md hosts rewrite; hop verifier gets a platform/evidence-dir argument; Windows no-residue is a registry diff; Linux no-residue paths corrected.
- Item 7: Azure Artifact Signing Basic as default (org US-located; no 3-year rule in current docs), commercial OV fallback, SignPath excluded by licence; sign inner PEs with jsign on Linux before NSIS; CERTIFICATE_* defines from the certificate; unsigned first release only with the maintenance service disabled.
- Item 8: asset set (exe, universal dmg, tar.xz, three MARs, source, SHA256SUMS, notices) under versioned and stable names; macOS cross-built on Linux and unified, not a macos runner; attestations; per-job permissions; environment gate.
- Item 9: no hand-kept version file; [product].revision plus ESR-derived version; --with-version-file-path via the symlink; tag v<ESR>-<revision>; derived quick row; MAR product-info block from the existing invocation.
- Item 10: Apple Developer Program; rcodesign via mach macos-sign on Linux; Team ID as a manifest key through identity.configure and a hook-only patch; never the generic-certs option.
- Item 12: MOZ_APPUP2026-09-05_HOST from [urls].update (no patch), policies.json AppUpdateURL removed, project-owned origin kept, per-target static descriptors behind one _redirects line, immutable MAR URLs, about-dialog links wired; channel set before the first release.
- Item 13: fix the two stale texts now; add observed hosts after the first real hop; force an update check in verify-endpoints; crash-reports.mozilla.com deny row; sidecar hosts once the layer-3 gap is confirmed.
- Item 14: buildUpdateXml stays; --emit CLI; four targets from three MARs; detailsURL; signed MARs first.
- Item 15: served: loopback | release in hop.json; release assertions and fault plants; N+1 is the previous release.
- Item 16: split; signing before the first release (Zen GHSA-qpj9-m8jc-mw6q precedent); process controls before release.yml exists.

## Gaps

Sidecar and Node staging into every package; per-platform Theia builds; packaged-launch and packaged-identity rows; release-variant Theia legal notices; the update prompt in the Theia shell (unverified); Theia state under the profile; URL-argument handling; fork version and release-tag pattern; SHA256SUMS; provenance attestations; secrets and key custody; maintenance service disabled while unsigned; installer telemetry ping and survey URL; Windows registry namespace; macOS Team ID; toolchain licence position; Linux format policy (tarball plus MAR only, Flatpak later with DisableAppUpdate); package-manager listings; cadence and the stale ESR pin; update-channel liveness row; release notes and download page; en-US scope; licence labelling and third-party notices; BUILD.md hosts rewrite; stale reason and comment texts; inkscape declared; the whole reports goal; the collector's extra-part bug; ROADMAP.md and REQUIREMENTS.md entries.

## Telemetry, crash and bug-report design

- Bug reports (now, no infrastructure): .github/ISSUE_TEMPLATE/bug.yml; a Report a Bug command in the branding extension opening the prefilled new-issue URL through windowService.openNewWindow external (stock window); a Copy button on the diagnostics layer (navigator.clipboard in the chrome document; PowerBrowserAPI only if a privileged helper is needed); one github.com allowlist row shared with the updater; installer.support_url unchanged.
- Error reports (Theia): window error and unhandledrejection listeners in @powerbrowser/telemetry calling sendErrorData with message, source basename, line, col; version, buildID and OS as the only enrichment, version and buildID via the POWERBROWSER_* spawn environment and one backend query (or omitted at first); no backend hook (the ring buffer already carries backend output); level off with the endpoint stated so the existing preference is the opt-in; allowlist row with manifest: "telemetry.endpoint" in the same commit; a registry row observing one POST from a running sidecar to a loopback endpoint.
- Native crash reports (after the first release, only if the exclusion is retired): [telemetry].crash_endpoint validated as an https origin without path; the generator emits --enable-crashreporter and --with-crashreporter-url when set and the current --disable-crashreporter literal when unset; the stock per-crash dialog is the consent UI (vendor name from brand.ftl; autoSubmit2 false; the data-notification infobar stays hidden because dataSubmissionEnabled is pinned false, observed in the stock window); `mach buildsymbols` output attached to the Release; minidump-stackwalk runbook; urls.crash_report stays unset and REBRANDING.md is corrected; collector 'extra' part parsed as JSON with a Gecko-shaped self-test plant.
- Receiver: one Cloudflare Worker at the crash origin with /submit (multipart validation, the collector's caps and vocabulary, annotation allowlist over the extra part, R2 objects with a 30-day lifecycle) and /events (D1 or R2 NDJSON); Cloudflare rate-limiting rule instead of in-process throttle; no token; Worker source outside upstream/ and theia/extensions; the loopback collector stays the contract twin. Variant B (forward to Sentry SaaS) only if a viewer and symbolication become worth a third-party processor.
- Rejected: Socorro self-host, mini-breakpad-server, self-hosted Sentry, @sentry/node in the backend, backend uncaught-exception hook, token auth on the crash endpoint, symbol server/viewer/processor, in-app form backend, usage telemetry or Gecko telemetry re-enablement, Cloudflare Health Checks, BugSplat.
- Reused: the sender and preference, validateTelemetry and emitTheiaTelemetry, manifestEndpointSources and verify-theia-endpoints, crash-collector.mjs constants and its verifier, CRASH-POLICY.md, mozillaEndpointPrefs, --with-crashreporter-url and MOZ_CRASHREPORTER_URL, crashreporter.ftl and brand.ftl, dump_syms and mach buildsymbols, the diagnostics layer, openNewWindow external, the POWERBROWSER_* environment block, USER_MESSAGE and shell-error-copy-no-internals, verify-endpoints layers, the Cloudflare account.

## Infrastructure

- GitHub (owned, USD 0): source, Releases, hosted runners for verify.yml and the sign-and-upload job, Issues, rulesets, environments, attestations.
- Cloudflare Free (owned, USD 0 within tiers): DNS and TLS; Pages for updates.powerbrowser.org (static descriptors plus _redirects) and powerbrowser.org/download and /privacy; Worker receiver; R2 (minidumps; optional sccache fallback); D1 (events). Pages caps assets at 25 MiB, so MARs stay on GitHub; Health Checks are not on Free.
- powerbrowser.org (owned).
- legion (owned, USD 0): ephemeral self-hosted runner via services.github-runners, sccache, drills.
- Flake additions (USD 0, not present): inkscape; .#firefox-win64 with clang-cl/lld-link, wine64, nsis, rust msvc target; cctools-port, macOS SDK, hfsplus/dmg tools, rcodesign; jsign; minidump-stackwalk.
- Fork MAR key pair (USD 0, not created): certutil and signmar in objdir/dist/bin.
- Windows 11 VM on legion (USD 0, staged; sudo unblock through /etc/nixos).
- Azure Artifact Signing Basic (about USD 10/month) or commercial OV (USD 200-400/yr); SignPath unavailable under PolyForm Noncommercial; figures to re-verify.
- Apple Developer Program (USD 99/yr).
- A Mac for the matrix row (borrowed or rented).
- Sentry SaaS free tier (optional, variant B only).

## User decisions

1. Build on legion (ephemeral runner) with signing on a hosted job under `release`; or a dedicated VM runner; or hosted runners only. Recommended: legion plus hosted signing.
2. MAR key custody: primary as a `release` environment secret, secondary offline. Recommended.
3. Windows signing: unsigned first release with the maintenance service disabled while applying for Azure Artifact Signing; then Azure; OV as fallback. Recommended: that order.
4. Apple Developer Program now (all three OSes in the first release) or defer macOS to a second release. Recommended: buy now if all three OSes are required.
5. Licence position for VS packages and the macOS SDK on Linux: accept Mozilla's practice and record it. Recommended.
6. Release role: the owner as sole tag creator and reviewer, org 2FA on; a second reviewer when one exists. Recommended.
7. Retire the native-reporter exclusion after the first release. Recommended: yes, with the stock opt-in dialog and no auto-submit.
8. Crash receiver variant A (Worker plus R2, manual stackwalk) versus B (Sentry SaaS). Recommended: A.
9. Default error-telemetry level: off (opt-in). Recommended.
10. Privacy retention and processors: 30 days, Cloudflare only. Recommended.
11. Daily liveness schedule (reverses D-77) versus the row as release.yml's final job. Recommended: keep D-77.
12. Version scheme: ESR version plus manifest revision. Recommended.
13. Bundled Node versus required system Node 22. Recommended: bundled.
14. Licence of distributed binaries: PolyForm for fork files plus LICENSING.md and notices, or change licence. Recommended: keep unless OSI status is wanted.
15. First-release locale: en-US only. Recommended.

## Proposed phases

Numbered as milestone-relative stages, not phase numbers. Phases 13 to 15
are already taken by v1.3 Browser GUI, which started while this review ran,
so this work is v1.4 or later and its phase numbers are assigned when the
milestone is created. The dependency order below is what matters.

- Stage 1: DIST-01, SEC-01, rebase to the current ESR point release.
- Stage 2: REL-01, UPD-01, UPD-02, UPD-03.
- Stage 3: SEC-02, UPD-04.
- Stage 4: PKG-04, PKG-05, PKG-06, PKG-07, PKG-08, PKG-09, UPD-08.
- Stage 5: DIST-02, DIST-03, UPD-05, UPD-06, UPD-07; first public release (Linux).
- Stage 6: PKG-10, PKG-11, PKG-12, PKG-13, SEC-03.
- Stage 7: PKG-14, PKG-15, SEC-04, PKG-16.
- Stage 8: TEL-05, TEL-06, TEL-07, TEL-08.
- Stage 9: DIST-04, DIST-05.

Independent of the release pipeline and startable at any time: TEL-05, TEL-06, the collector extra-part fix, TEL-08, PKG-07, PKG-09.

## Open questions

- Does the update prompt render anywhere in the Theia shell? (AppMenuNotifications has no consumer outside browser.xhtml; unverified.)
- Does verify-endpoints.sh layer 3 miss the Node sidecar's resolutions (open-vsx.org, AI provider hosts)? Unverified; if so, a backend-pid capture layer is needed.
- Windows and macOS BUILD_TARGET strings are derived from configure source, not observed; record them from the first real builds before fixing descriptor directory names.
- Does FINAL_TARGET_FILES accept a `../` path from powerbrowser/shell/moz.build for staging the sidecar (no upstream precedent)? Confirm with one build; otherwise a scripted pre-package step.
- Can the Nix firefox shell carry a rust toolchain with the x86_64-pc-windows-msvc target alongside the nixpkgs firefox inputsFrom without conflict?
- Does the Cloudflare Pages _redirects placeholder syntax cover the 11-segment path in one rule, or is a small Worker needed?
- Size of the MAR once the sidecar and Node ride in it (78 MB today for Gecko alone; lib/ is 144 MB without source maps).
- Azure Artifact Signing eligibility for the foundation as a legal entity (identity validation), and current prices for all signing options.
- Whether the external Flathub manifest must carry anything beyond DisableAppUpdate for the sidecar's Node runtime.

## Sources

- CLAUDE.md; .planning/PROJECT.md:63-64; .planning/REQUIREMENTS.md:24-26,70-89; .planning/ROADMAP.md:8,30-42; .planning/STATE.md:115; .planning/NEXT-MILESTONE-INPUTS.md; .planning/research/STACK.md, SUMMARY.md; .planning/milestones/v1.1-phases/09-extensions-crash-pipeline/09-RESEARCH.md, 09-CONTEXT.md; .planning/codebase/INTEGRATIONS.md
- configuration.toml; scripts/generate.mjs (494-495, 917-935, 1401-1424, 1738-1750, 1898-1905, 1992-2010, 2318-2366, 2420-2427, 2537-2598, 2870-3000, 3168-3186); generated/identity.configure; generated/theia-telemetry.json; generated/endpoint-hosts.json; .mozconfig
- powerbrowser/distribution/policies.json; powerbrowser/endpoint-allowlist.json; powerbrowser/branding/{dev,release}/pref/firefox-branding.js; powerbrowser/shell/{powerbrowser-sidecar.js, moz.build, TheiaService.sys.mjs, PowerBrowserAPI.sys.mjs, powerbrowser.js, powerbrowser.xhtml}; powerbrowser/packaging/version-nplus1/; inventory/brand-tokens.json
- scripts/verify-platform.sh (registry rows 3784, 4053-4054, 4114-4115, 4150-4171, 4197-4198, 4226-4227, 4332-4354); scripts/verify-mar-update-hop.mjs; scripts/verify-installer-build-proof.mjs; scripts/verify-endpoints.sh; scripts/verify-theia-endpoints.mjs; scripts/verify-webextensions.mjs; scripts/verify-generated-identity.mjs; scripts/check-patch-surface.sh; scripts/crash-collector.mjs; scripts/verify-crash-collector.mjs; scripts/smoke-firefox.sh; scripts/fetch-upstream.sh:134
- docs/BUILD.md (687-1056); docs/CRASH-POLICY.md; docs/REBRANDING.md:253-291; .github/workflows/{verify.yml, rebase-upstream.yml}; flake.nix; LICENSE
- theia/extensions/telemetry/src/browser/{telemetry-sender.ts, telemetry-preferences.ts, telemetry-frontend-module.ts}; theia/extensions/branding/src/browser/{powerbrowser-welcome-widget.tsx, powerbrowser-about-dialog.tsx, powerbrowser-branding-config.ts}; theia/applications/browser/package.json
- upstream/build/moz.build:95-97; upstream/build/application.ini.in:48-56; upstream/build/moz.configure/{update-programs.configure, init.configure:1024-1085,1194-1211, toolchain.configure:1478,2357-2366}; upstream/toolkit/moz.configure:3059-3066,3393-3404,3474-3507; upstream/toolkit/mozapps/update/{UpdateService.sys.mjs, UpdateListener.sys.mjs, updater/moz.build:15-88, updater/updater.cpp, updater/archivereader.cpp:119-165, common/registrycertificates.cpp}; upstream/toolkit/components/maintenanceservice/workmonitor.cpp:796-825; upstream/toolkit/modules/{UpdateUtils.sys.mjs, AppMenuNotifications.sys.mjs}; upstream/toolkit/crashreporter/{CrashSubmit.sys.mjs, CrashReports.sys.mjs, client/app/src/net/report.rs}; upstream/browser/installer/package-manifest.in:252-272,463-465; upstream/browser/installer/windows/nsis/{defines.nsi.in, installer.nsi, uninstaller.nsi, shared.nsh, telemetry.nsh, stub.nsh}; upstream/browser/base/content/{aboutDialog.js, aboutDialog-appUpdater.js}; upstream/browser/app/profile/firefox.js; upstream/toolkit/xre/LauncherRegistryInfo.cpp:147-148; upstream/toolkit/profile/nsToolkitProfileService.cpp; upstream/python/mozbuild/mozpack/dmg.py; upstream/python/mozbuild/mozbuild/repackaging/msix.py; upstream/python/mozbuild/mozbuild/mach_commands.py:2697-2706,3080-3474; upstream/taskcluster/kinds/build/{windows.yml, macosx.yml}; upstream/taskcluster/kinds/toolchain/{macos-sdk.yml, minidump-stackwalk.yml}; upstream/taskcluster/scripts/misc/{get_vs.py, unify.sh}; upstream/build/vs/vs2026.yaml; upstream/Makefile.in:129-150; upstream/config/rules.mk:652-655
- External (checked 2026-09-05): zen-browser/desktop workflows and scripts/mar_sign.sh; zen-browser/updates-server; GHSA-qpj9-m8jc-mw6q; Floorp and Mullvad latest release asset lists; flathub app.zen_browser.zen; microsoft/winget-pkgs Zen manifests; Homebrew cask zen and librewolf; GitHub Free-plan limits for larger runners, runner groups, environments, rulesets; Cloudflare Pages, R2, Workers and Health Checks limits; Azure Artifact Signing onboarding docs; curl redirect chain for a GitHub release asset.


## Appendix: the draft goal list the corrections refer to

Prerequisites: (1) push main and tags v1.0 to v1.2; (2) fix the red verify workflow; (3) choose the build runner.
Goal 1, Windows .exe: (4) Windows cross-compile on Linux; (5) make the NSIS installer shippable; (6) Windows VM matrix and hop proof; (7) Authenticode certificate.
Goal 2, installers per tag: (8) release.yml with Linux, Windows and macOS jobs and one upload job; (9) tracked version file matched to the tag; (10) macOS signing and notarization; (11) build caching.
Goal 3, self-update: (12) point AppUpdateURL at GitHub or Pages; (13) allow GitHub hosts in the allowlist; (14) upload MAR plus per-platform update.xml; (15) run the hop drill against a real Release; (16) protected tags, release environment, MAR signing later.
