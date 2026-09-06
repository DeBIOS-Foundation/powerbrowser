---
phase: distribution-stage-9-listings-and-cadence
plan: "01"
type: execute
wave: 6
depends_on: [prerequisites-and-hardening, mar-signing-and-update-integrity, linux-release-pipeline-and-update-channel, windows-unsigned, macos-adhoc-signed]
files_modified: [.planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md, scripts/generate.mjs, powerbrowser/packaging/flathub/flatpak-manifest.json.comparand, powerbrowser/packaging/flathub/metainfo.xml.comparand, powerbrowser/packaging/flathub/policies.json.comparand, powerbrowser/packaging/flathub/desktop.comparand, scripts/verify-generated-identity.mjs, scripts/verify-manifest-literals.mjs, .github/workflows/release.yml, scripts/verify-listings.mjs, scripts/verify-platform.sh, docs/RELEASING.md, scripts/verify-releasing-maintenance.mjs]
autonomous: false
requirements: [DIST-04, DIST-05]
must_haves:
  truths:
    - "A live admission record decides per listing whether the unsigned installer and the extra-data package are admitted, and every later task in this plan branches on that record rather than on assumption"
    - "The Flathub sources are generator output with tracked comparands, so a brand edit reaches the listing through configuration.toml and never through a hand edit, and the one display literal a comparand carries is named in the manifest-literals allowlist in the same commit rather than left to redden the gate"
    - "A package-manager-owned install cannot self-update: the Flatpak carries DisableAppUpdate true, the surfaces a shipped install actually contains carry no update-disabling knob, and both halves are asserted with planted faults over a vocabulary derived from the tree"
    - "The winget identifier the workflow submits is derived from the manifest at check time and compared, so an identifier drift goes red before a release reaches the public catalogue"
    - "docs/RELEASING.md's maintenance section agrees with the automation it describes by derivation: workflow triggers, job ids and their order, the ESR pin, the tracked signing keys, the listing set and the deferral set all come from the tree at check time"
  artifacts:
    - path: ".planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md"
      provides: "Per-listing ADMIT/REFUSE/DEFER verdicts, the required project_license form, the desktop and icon naming rules, the deferral register and the measured runtime and glibc facts every later task routes on"
      contains: "Verdict-winget:"
    - path: "powerbrowser/packaging/flathub/flatpak-manifest.json.comparand"
      provides: "Tracked comparand of the emitted Flathub manifest under an ADMIT verdict: app id, runtime pin, extra-data tokens, desktop, icon, metainfo and policy installs"
      contains: "extra-data"
    - path: "powerbrowser/packaging/flathub/policies.json.comparand"
      provides: "Tracked comparand of the Flatpak-only enterprise policy that disables the updater"
      contains: "DisableAppUpdate"
    - path: "powerbrowser/packaging/flathub/metainfo.xml.comparand"
      provides: "Tracked comparand of the AppStream metainfo Flathub requires, carrying the SPDX project_license form the record recorded"
      contains: "content_rating"
    - path: "powerbrowser/packaging/flathub/desktop.comparand"
      provides: "Tracked comparand of the Flatpak-shaped desktop entry, whose Exec is the app command and whose Icon is the app id, with no repo-root token"
      contains: "Exec="
    - path: "scripts/verify-listings.mjs"
      provides: "Listing gate: app id agreement, licence form agreement, desktop and icon agreement, updater-disable split, token presence, winget identifier agreement, all derived, with self-test plants"
      min_lines: 220
    - path: "scripts/verify-releasing-maintenance.mjs"
      provides: "Doc-to-automation coupling for the maintenance section, derived from workflows, job order, manifest, tracked keys and the admission record's verdict, Resume and Deferred lines"
      min_lines: 180
    - path: "docs/RELEASING.md"
      provides: "Maintenance section: cadence, out-of-band security path, D-77 posture, key rotation, runner and Cloudflare upkeep, ESR train change, listings and deferrals"
      contains: "## Maintenance"
    - path: "scripts/verify-platform.sh"
      provides: "Four appended registry rows, two gates plus two self-tests, no sibling driver"
      contains: "listing-manifests"
  key_links:
    - from: "scripts/generate.mjs"
      to: "powerbrowser/packaging/flathub/flatpak-manifest.json.comparand"
      via: "one frozen TARGETS row per emitted Flathub file, each with a tracked comparand listed in verify-generated-identity.mjs EXPECTED"
      pattern: "flathub"
    - from: "scripts/generate.mjs"
      to: "scripts/verify-manifest-literals.mjs"
      via: "the metainfo comparand carries product.vendor_display, so one ALLOWLIST row keyed on that slot and that file lands in the same commit as the emitter"
      pattern: "metainfo.xml.comparand"
    - from: "scripts/verify-listings.mjs"
      to: ".planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md"
      via: "the listing set, the runtime pin and the accepted licence form are derived from the record's verdict and evidence lines; an empty derivation fails rather than passes"
      pattern: "Verdict-"
    - from: ".github/workflows/release.yml"
      to: "scripts/verify-listings.mjs"
      via: "the submission step exists only under an ADMIT verdict and must carry the derived winget identifier, and under a REFUSE verdict the gate requires no step and a Resume line, so the coupling holds on both branches"
      pattern: "Verdict-winget"
    - from: "scripts/verify-releasing-maintenance.mjs"
      to: ".github/workflows/release.yml"
      via: "workflow trigger keys and job ids derived by indentation scan and compared to the documented tables as set equality, with the last job id derived from job order and required as the documented liveness job"
      pattern: "jobs:"
    - from: "scripts/verify-platform.sh"
      to: "scripts/verify-listings.mjs"
      via: "registry row invokes the gate; the self-test row invokes it with --self-test"
      pattern: "listing-manifests"
---

<objective>
Land the two post-release surfaces: package-manager listings (DIST-04) and the maintenance cadence
that keeps them and the update channel alive (DIST-05). Order is admission first, then generated
sources, then automation, then the operator submissions, then the doc that describes all of it under
a gate that derives its expectations from the tree.

Purpose: the listing work rests on facts nobody in this tree has checked yet, whether an unsigned
Windows installer is admitted by the winget catalogue's validation, whether an extra-data Flatpak
under a non-OSI licence is admitted by Flathub with the sidecar's bundled Node running on the
freedesktop runtime, which project_license form that listing must carry, and which desktop-entry and
icon naming the Flathub linter enforces. Task 1 establishes all of them live and every later task
routes on the record. Nothing in this plan builds Gecko, edits upstream/, adds a Gecko patch, or
authors browser chrome.

Output: an admission record with per-listing verdicts and a deferral register, four
generator-emitted Flathub sources with tracked comparands, a winget submission step gated on the
verdict, the operator's first submissions, and docs/RELEASING.md's maintenance section with a
derived doc-to-automation gate.

Listing-home call: the Flathub sources are generator output under powerbrowser/packaging/flathub/,
not hand-written files. Rationale: the metainfo carries product.vendor_display, the app id and the
licence form are transformations of manifest keys, and the desktop entry carries the binary name and
the app id, so every one of these files must move when configuration.toml moves. The generator
already owns every other file that carries those values, and the identity-carrier comparand (MIG-05,
scripts/verify-generated-identity.mjs:127) is the precedent for a tracked comparand whose original
was the emission itself. This choice does not avoid a manifest-literals allowlist entry and the
earlier draft was wrong to claim it did: product.vendor_display is multi-word, so
scripts/verify-manifest-literals.mjs deriveLiterals keeps it, and its scope is `git ls-files` minus
prefixes that do not include powerbrowser/packaging/, so the tracked metainfo comparand is scanned
exactly as a hand-written file would be. One ALLOWLIST row keyed on the slot
product.vendor_display and the metainfo comparand path lands in the same commit as the emitter. Only
one row is needed: the release variant's display composition is a single token and derives no
literal, and the metainfo carries no trademark notice. legal.license is not a derived literal at
all, so it needs no row.

Winget-identifier call: no new configuration.toml key. The Flatpak app id is derived from
product.homepage's host reversed plus identity.display_name, and the winget identifier from
product.vendor_machine plus identity.display_name. Both are transformations of keys the manifest
already requires, and the Flathub rule that the id's domain be one the developer controls is exactly
what product.homepage records. A new key would also cost a schema row and a docs/REBRANDING.md row,
because scripts/verify-rebranding-docs.mjs derives its documented-field list from
scripts/lib/config-schema.json.
</objective>

<context>
@.planning/seeds/SEED-001-standard-distribution-updates-reports.md
@docs/BUILD.md
@docs/RELEASING.md
@configuration.toml
@powerbrowser/distribution/policies.json
@powerbrowser/endpoint-allowlist.json
</context>

<tasks>

<task type="auto">
  <name>Listing-admission probe with per-listing verdicts, licence and naming rules, and the measured runtime floor</name>
  <reversibility rating="reversible">Scratch downloads and extractions are removed in a finally; the record is a decision artifact, not shipped code.</reversibility>
  <read_first>
    - .planning/milestones/v1.3-phases/13-chrome-bar-strip-relocation-spike/13-SPIKE-STRIP-RELOCATION.md (whole file, 400 lines: header block, what-changed, observations, constraints, summary table, artefacts, ratification, proofs; imitate this structure, and note that this record's verdict, evidence and deferral lines are unbolded and start at line start so a gate can parse them)
    - .planning/seeds/SEED-001-standard-distribution-updates-reports.md lines 126 to 127 (DIST-04, DIST-05), line 148 (the listings gap), line 220 (the open question this task closes)
    - docs/BUILD.md lines 1009 to 1017 (the attributed packaging-timings table, the only wall times this stage may cite) and lines 1022 to 1063 (the rebase procedure, the 08-05 live drill, and the CI story that states the no-schedule posture)
    - powerbrowser/distribution/policies.json (whole file, four keys: AppUpdateURL, DisableTelemetry, DisableFirefoxStudies, ExtensionSettings, and no DisableAppUpdate)
    - powerbrowser/powerbrowser-release.desktop (whole file: the release desktop entry is a development entry, Exec and Icon both carry an unsubstituted @POWERBROWSER_REPO_ROOT@ and point into objdir-release, so it is not installable and the Flatpak needs its own emitted entry)
    - configuration.toml lines 32 to 45 (product.vendor_display, product.description, product.homepage, identity.display_name, identity.binary_name, legal.license)
    - upstream/browser/installer/package-manifest.in line 463 (`#if defined(BUILT_BY_MOZILLA)` gating `@RESPATH@/distribution/*`, so no fork build packages distribution/ and the Flatpak must install its own)
    - upstream/toolkit/components/enterprisepolicies/EnterprisePoliciesParent.sys.mjs lines 640 to 665 (XREAppDist plus POLICIES_FILENAME is the app-dir lookup the Flatpak install writes into) and lines 60 to 64 (shouldIgnoreLocalPolicies is Nightly-and-automation only, so a release build reads the file)
    - upstream/browser/components/enterprisepolicies/Policies.sys.mjs lines 947 to 953 (DisableAppUpdate calls disallowFeature("appUpdate"))
  </read_first>
  <files>.planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md</files>
  <action>Establish the admission facts live and record them, taking nothing from this plan's prose as established. For winget: read the catalogue repository's current contribution and validation policy and its manifest schema, and decide whether an installer with no Authenticode signature is admitted, whether automated validation flags or blocks it, and what the client shows the installing user; the release-identity stage fixed the installer as unsigned, so this verdict is the whole routing decision for tasks 3 and 4. For Flathub: read the current submission requirements and decide whether an extra-data module carrying the project's own release tarball is admitted under a non-OSI licence, which metainfo elements are mandatory, which project_license form the validator and the linter accept for a licence that is not OSI approved, whether the external-data checker is the sanctioned per-release bump path, which org.freedesktop.Platform branch is current, and what the linter requires of the installed desktop entry, its filename, its Icon value and the metainfo launchable. Record the accepted project_license form verbatim on its own line and the desktop, icon and launchable naming rules as their own evidence block, because task 2's emitters are written against them. For Homebrew: read the cask requirements far enough to cite the notarization rule and record DEFER with the stage slug that resumes it. Then measure the runtime floor rather than assuming it: download the published Linux release asset from the release the linux-release-pipeline-and-update-channel stage cut, extract it into an mkdtemp directory removed in a finally, locate the bundled Node by reading the packaged sidecar preference file's powerbrowser.sidecar.nodePath value rather than by guessing a path, read the maximum GLIBC_ symbol version the binary requires with readelf, and compare it against the glibc the recorded runtime branch ships. Write the record in the 13-SPIKE structure, with one unbolded verdict line per listing at line start in the exact form `Verdict-<listing>: ADMIT` or `REFUSE` or `DEFER`, one `Runtime: <id> <branch>` line, one `Node-glibc: required X.Y, runtime X.Y, verdict OK|FAIL` line, one `License-form: <value>` line carrying the project_license string the validator accepts, a `Resume:` line for every non-ADMIT verdict naming the stage slug that picks it up, and one `Deferred: <item> -> <stage-slug>` line for every deferral the project's unsigned posture carries into a later signing stage, at minimum Windows Authenticode signing, Apple notarization, and the borrowed-Mac install matrix that gates the macOS asset. Put the verbatim evidence plus the retrieval date behind every claim. Every downloaded byte lives under an untracked tmp-prefixed directory removed at closeout; nothing is staged outside the record. Commit as docs(09-01): record listing-admission verdicts. Finish with the quick gate green.</action>
  <verify>
    <automated>git add .planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md && R=.planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md && grep -Eq '^Verdict-winget: (ADMIT|REFUSE|DEFER)$' "$R" && grep -Eq '^Verdict-flathub: (ADMIT|REFUSE|DEFER)$' "$R" && grep -Eq '^Verdict-homebrew: (ADMIT|REFUSE|DEFER)$' "$R" && grep -Eq '^Runtime: [A-Za-z0-9._]+ [0-9]+\.[0-9]+$' "$R" && grep -Eq '^Node-glibc: required [0-9]+\.[0-9]+, runtime [0-9]+\.[0-9]+, verdict (OK|FAIL)$' "$R" && grep -Eq '^License-form: [A-Za-z0-9][A-Za-z0-9.+-]*(=\S+)?$' "$R" && test "$(grep -cE '^Verdict-[a-z]+: (REFUSE|DEFER)$' "$R")" -eq "$(grep -cE '^Resume: ' "$R")" && test "$(grep -cE '^Deferred: .+ -> [a-z0-9-]+$' "$R")" -ge 3 && git -C upstream diff --quiet && test -z "$(git status --porcelain scripts/ powerbrowser/ theia/ | head -5)" && scripts/verify-platform.sh --quick</automated>
    <fails_when>a verdict line is missing or malformed, the runtime, glibc or licence-form measurement is absent, a REFUSE or DEFER verdict carries no Resume pointer, fewer than three Deferred lines name a resuming stage slug, the probe stages a file outside the record, upstream/ is dirty, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Three verdict lines parse at line start, each with dated evidence and a source citation
    - The accepted project_license form and the desktop, icon and launchable naming rules are recorded verbatim as the emitters' inputs
    - Runtime branch and the bundled Node's measured glibc requirement are recorded from the published asset, not derived from prose
    - Every REFUSE or DEFER verdict carries a Resume line, and every unsigned-posture deferral carries a Deferred line naming the stage slug that picks it up
    - Scratch removed, nothing staged under scripts/, powerbrowser/ or theia/, upstream/ diff empty
  </acceptance_criteria>
  <done>Listing routing is decided by live evidence, and tasks 2 through 5 have a machine-readable branch to read</done>
</task>

<task type="auto">
  <name>Flathub sources emitted by the generator with tracked comparands and one allowlist row</name>
  <reversibility rating="costly">The app id and the four generated basenames are addressed by the gate, the workflow and the submission; renaming after submission means a new Flathub application, so the id is fixed here.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md (Verdict-flathub, the Runtime line, the License-form line, the mandatory metainfo elements, the desktop and icon naming rules, the sanctioned bump path)
    - scripts/generate.mjs lines 3350 to 3420 (the write-path comment, the GEN-03 note that naming an installed desktop entry belongs to a packaging surface, the frozen TARGETS table, the row shape, and the identity-carrier comment explaining a tracked comparand whose original is the emission)
    - scripts/generate.mjs line 2638 (the urls table read through `take`, the shape a new derived value follows) and the whole-file text emitter above TARGETS nearest in shape, copied for voice rather than restated
    - scripts/generate.mjs line 3981 (resolveConfig, the exported resolver every gate imports rather than restating)
    - scripts/verify-generated-identity.mjs lines 74 to 128 (EXPECTED, and the comparand contract: on a red the emitter changes, never the comparand)
    - scripts/verify-manifest-literals.mjs lines 107 to 152 (EXCLUDED_PREFIXES, EXCLUDED_FILES and the ALLOWLIST row shape keyed on slot plus file plus a one-line reason) and the deriveLiterals function (product.vendor_display is kept because it carries whitespace; legal.license is not derived at all)
    - configuration.toml (whole file: product.homepage, product.vendor_display, product.description, identity.display_name, identity.binary_name, legal.license, the two variants and their name_suffix)
    - powerbrowser/powerbrowser-release.desktop (whole file: the development entry this emitter must not reuse, and the key order and MimeType line to copy for voice)
    - upstream/browser/installer/package-manifest.in line 463 (why the Flatpak installs its own distribution/policies.json)
  </read_first>
  <files>scripts/generate.mjs, powerbrowser/packaging/flathub/flatpak-manifest.json.comparand, powerbrowser/packaging/flathub/metainfo.xml.comparand, powerbrowser/packaging/flathub/policies.json.comparand, powerbrowser/packaging/flathub/desktop.comparand, scripts/verify-generated-identity.mjs, scripts/verify-manifest-literals.mjs</files>
  <action>Branch on the record first. When Verdict-flathub is not ADMIT, add no emitter, no comparand, no EXPECTED entry and no allowlist row, leave the record's Resume line as the only carrier, and go to task 3. When it is ADMIT, add four emitters and four frozen TARGETS rows, changing no manifest key and no schema row.
Derive the Flatpak app id inside the generator as product.homepage's host with its labels reversed, joined to identity.display_name, and fail the generate naming product.homepage when the host carries fewer than two labels. Derive the AppStream summary as the text before the first colon in product.description, trimmed, and fail the generate naming product.description when the result exceeds the AppStream summary length or ends in a period. Derive project_license from legal.license by replacing each run of whitespace with a single hyphen, and fail the generate naming legal.license when the result does not match the SPDX identifier grammar (an identifier of letters, digits, dot, plus and hyphen, or a LicenseRef- form); the gate in task 3 is what compares the emitted value against the form the record recorded as accepted, so the generator never reads a planning file. Each of these three failures tells the operator which manifest key to fix rather than shipping an invalid listing.
Emit generated/flathub-manifest.json as JSON, not YAML: this tree vendors exactly one parser under scripts/lib (toml.cjs) and no YAML parser, so JSON keeps the gate on stdlib. The manifest carries the app id, the runtime and sdk identifiers with the branch the record names, the command wrapping identity.binary_name, the finish-args the shell and sidecar need, one extra-data module whose url, sha256 and size are the substitution tokens @RELEASE_TARBALL_URL@, @RELEASE_TARBALL_SHA256@ and @RELEASE_TARBALL_SIZE@ in the tree's existing @TOKEN@ idiom, the x-checker-data block the record names as the sanctioned bump path, and build-commands that unpack into the app prefix, install the generated Flatpak desktop entry as <app-id>.desktop, install the generated 128 pixel release icon under the app id's basename, install the metainfo as <app-id>.metainfo.xml, and install policies.json into the app directory's distribution/ subdirectory.
Emit generated/flathub-desktop.desktop as a Flatpak-shaped entry, never a copy of powerbrowser/powerbrowser-release.desktop, which is a development entry carrying @POWERBROWSER_REPO_ROOT@ in both Exec and Icon: Exec is identity.binary_name with the %u argument and no path and no token, Icon is the app id, Name is the release variant display name, and StartupWMClass, Type, Terminal, Categories and MimeType follow the tracked release entry's values and key order. Fail the generate naming the emitter when the emitted text still matches the @TOKEN@ pattern.
Emit generated/flathub-metainfo.xml with the id, the release-variant display name, the derived summary, the description paragraph from product.description, the developer name from product.vendor_display, the derived project_license, the homepage url, a launchable of type desktop-id naming <app-id>.desktop, an oars content_rating element, and one release element whose version and date are the tokens @RELEASE_VERSION@ and @RELEASE_DATE@.
Emit generated/flathub-policies.json as the single-key object whose policies.DisableAppUpdate is true and which carries no other key, because a package-manager-owned install must not self-update and package-manifest.in line 463 means no fork build packages this file itself.
Add one frozen TARGETS row per emitted file, each with its tracked comparand under powerbrowser/packaging/flathub/, each carrying a comment in the identity-carrier voice stating that the comparand is a frozen copy of the emission and never a build input, and add the four comparand paths to EXPECTED in scripts/verify-generated-identity.mjs in the same commit. In the same commit append one row to ALLOWLIST in scripts/verify-manifest-literals.mjs, `{ slot: 'product.vendor_display', file: 'powerbrowser/packaging/flathub/metainfo.xml.comparand', reason: 'AppStream developer name owned by the manifest; the comparand is a frozen copy of the emission' }`, because the comparand is tracked and powerbrowser/packaging/ matches no exclusion prefix, so without the row that gate reddens on this task's own output. Add no second row: the release display composition is a single token and derives no literal, and the metainfo carries no trademark notice. Stage all seven files before any scan. Commit as feat(09-01): generate the Flathub listing sources. Finish with the quick gate green.</action>
  <verify>
    <automated>R=.planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md; if grep -q '^Verdict-flathub: ADMIT$' "$R"; then node scripts/generate.mjs && node scripts/generate.mjs --check && node -e "const fs=require('node:fs');const j=JSON.parse(fs.readFileSync('generated/flathub-policies.json','utf8'));const k=Object.keys(j.policies||{});if(j.policies?.DisableAppUpdate!==true||k.length!==1){console.error('flathub policy is not the single DisableAppUpdate key');process.exit(1);}" && node -e "const fs=require('node:fs');JSON.parse(fs.readFileSync('generated/flathub-manifest.json','utf8'));const d=fs.readFileSync('generated/flathub-desktop.desktop','utf8');if(/@[A-Z0-9_]+@/.test(d)){console.error('flathub desktop entry carries an unsubstituted token');process.exit(1);}" && git add powerbrowser/packaging/flathub scripts/generate.mjs scripts/verify-generated-identity.mjs scripts/verify-manifest-literals.mjs && node scripts/verify-generated-identity.mjs && node scripts/verify-generated-identity.mjs --self-test && node scripts/verify-manifest-literals.mjs && node scripts/verify-manifest-literals.mjs --self-test && node scripts/scan-brand-residue.mjs; else test ! -e powerbrowser/packaging/flathub && grep -q '^Resume: ' "$R"; fi && scripts/verify-platform.sh --quick</automated>
    <fails_when>the generator is not idempotent, an emitted file is not valid JSON, the desktop entry still carries a substitution token, the Flatpak policy carries anything but the single DisableAppUpdate key set true, a comparand drifts from its emission, the metainfo comparand's display literal has no allowlist row, the residue scan finds a token, a Flathub file exists under a non-ADMIT verdict, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Four emitters, four frozen TARGETS rows, four EXPECTED entries and one ALLOWLIST row land in one commit with no manifest or schema change
    - The app id, the summary and the project_license form are derived from existing keys, each with a named failure telling the operator which key cannot yield a valid value
    - The emitted desktop entry carries no repo-root token, its Exec is the app command and its Icon is the app id, and the metainfo launchable names it
    - The extra-data source and the release element carry substitution tokens, never a real url, checksum, size, version or date
    - The Flatpak policy is exactly one key and the shipped powerbrowser/distribution/policies.json is untouched
    - Under a non-ADMIT flathub verdict nothing is emitted and the record's Resume line is the only carrier
  </acceptance_criteria>
  <done>The listing sources are rebrand inputs like every other derived surface, a hand edit to any of them goes red, and the one display literal they carry is declared rather than discovered by a red gate</done>
</task>

<task type="auto">
  <name>Winget submission step on the verdict branch plus the listings gate</name>
  <reversibility rating="reversible">The workflow job is additive and gated; the gate is a new script plus two registry rows.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md (the winget and flathub verdicts this task branches on, the License-form line, and the Resume pointers if a verdict is not ADMIT)
    - .github/workflows/release.yml (whole file, from the linux-release-pipeline-and-update-channel stage: the tag trigger, the release environment gate, the job graph, the asset names, the SHA256SUMS step, the liveness job that must stay last)
    - .github/workflows/verify.yml lines 1 to 30 and .github/workflows/rebase-upstream.yml lines 1 to 25 (the header-comment voice, the SHA-pinned action posture, the D-77 note that no schedule key exists)
    - powerbrowser/endpoint-allowlist.json (the 24 tracked hosts; github.com and release-assets.githubusercontent.com are absent today and arrive as UPD-05 rows in the linux-release-pipeline-and-update-channel stage)
    - scripts/verify-rebranding-docs.mjs lines 1 to 70 (the derive-then-compare gate idiom, the REQUIRED_COMMANDS shape, the non-vacuity messages, the self-test contract)
    - scripts/verify-manifest-literals.mjs lines 83 to 90 (importing resolveConfig from generate.mjs rather than restating the resolver)
    - scripts/verify-upstream-pins.mjs lines 95 to 175 (reading a workflow as text, listTracked as the scope source, the named-failure style)
    - scripts/verify-platform.sh lines 3620 to 3650 (the registry row idiom label|command, the honesty comment each row carries, the self-test row beside every gate)
    - powerbrowser/branding/dev/pref/firefox-branding.js lines 20 to 30 and powerbrowser/branding/release/pref/firefox-branding.js lines 20 to 30 (app.update.url.manual and app.update.url.details, the tracked app.update prefs that reach omni.ja, so the updater-disable derivation names what it scanned)
    - upstream/browser/components/enterprisepolicies/Policies.sys.mjs lines 947 to 953 (the DisableAppUpdate key name the derivation reads out of the policy table)
    - upstream/browser/installer/package-manifest.in line 463 (why the shipped half reads the branding prefs and not powerbrowser/distribution/policies.json)
  </read_first>
  <files>.github/workflows/release.yml, scripts/verify-listings.mjs, scripts/verify-platform.sh</files>
  <action>Branch on the record. When Verdict-winget is ADMIT, append one job to release.yml that needs the upload job, runs on ubuntu-latest under the release environment, triggers only on the release tag pattern the workflow already declares, downloads the winget manifest tool as a release binary pinned by version and sha256, and submits the update with the identifier, the version derived from the tag and the installer asset url, taking the token from the release environment rather than a repository secret and echoing no secret value. State the endpoint dependency explicitly in the job's header comment and honour it: the download host must be one the linux-release-pipeline-and-update-channel stage's UPD-05 rows already recorded (github.com plus the release-assets host the observed 302 resolves to); if the observed redirect target differs from what UPD-05 recorded, the new host gets its own allowlist row with a written reason derived from a layer-3 observation before this job lands. When the verdict is REFUSE, append no job and leave the record's Resume line as the only carrier, so the tree never contains a submission path the catalogue would reject.
Write scripts/verify-listings.mjs deriving every expectation at check time and keeping no list: the listing set from the record's verdict lines with an empty derivation failing distinctly; the Flatpak app id, the winget identifier and the project_license form from configuration.toml through generate.mjs's own resolveConfig, imported and never restated, compared against the emitted app id in the manifest comparand, against the identifier literal in the workflow, and against the record's License-form line; the runtime identifier and branch in the manifest comparand compared against the record's Runtime line; the desktop comparand required to carry no @TOKEN@ occurrence, an Exec that is the binary name with no path, and an Icon equal to the app id, with the metainfo comparand's launchable required to name <app-id>.desktop; the manifest and metainfo comparands required to carry each of the five substitution tokens, each named in its own failure; the Flatpak policy comparand required to parse with policies.DisableAppUpdate true and no sibling key; and the updater-disable split proved in both directions over a vocabulary derived from the tree rather than listed here, namely the DisableAppUpdate key name read out of the policy table in upstream/browser/components/enterprisepolicies/Policies.sys.mjs and the app.update.* preference names read out of the two tracked branding pref files, requiring that vocabulary present and enabling in the Flatpak policy comparand and absent as a disabling value from the surfaces a shipped install actually carries, which are those two branding pref files, since package-manifest.in line 463 means powerbrowser/distribution/policies.json never reaches a fork package and a plant there would prove nothing about a shipped install. Gate the flathub half on the derived flathub verdict so a non-ADMIT verdict requires the comparands absent and a Resume line rather than failing on missing files, and gate the winget half on the derived winget verdict so ADMIT requires the step with the exact identifier and REFUSE requires no step at all and a Resume line.
Give it a --self-test over mkdtemp fixtures that goes green unplanted first and then requires each of these to go red naming the drift: an app id drift, a runtime branch drift, a project_license drift away from the recorded form, a repo-root token planted into the desktop comparand, an Icon drift away from the app id, DisableAppUpdate flipped to false, an app.update disabling pref planted into a branding pref fixture, one substitution token removed, an identifier drift in the workflow copy, a submission step present under a REFUSE verdict, and a verdict line removed. Append two registry rows beside the generator rows with honesty comments stating the row is text reads only, creating no sibling driver. Stage the three files before any scan. Commit as feat(09-01): listing gate and winget submission step. Finish with the script green, its self-test green, both new rows green through the single-gate runner, and the quick gate green.</action>
  <verify>
    <automated>git add .github/workflows/release.yml scripts/verify-listings.mjs scripts/verify-platform.sh && node --check scripts/verify-listings.mjs && node scripts/verify-listings.mjs && node scripts/verify-listings.mjs --self-test && scripts/verify-platform.sh --only listing-manifests && scripts/verify-platform.sh --only listing-manifests-self-test && scripts/verify-platform.sh --only generated-byte-identity && scripts/verify-platform.sh --only verify-manifest-literals && scripts/verify-platform.sh --only scan-brand-residue && scripts/verify-platform.sh --quick</automated>
    <fails_when>the gate exits non-zero on the unmodified tree, any planted fault fails to go red naming the drift, the workflow carries an identifier that differs from the derived one, a submission step exists under a REFUSE verdict, a Flathub comparand exists under a non-ADMIT verdict, a sampled guard row fails, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - The workflow half matches the recorded verdict exactly, with the token read from the release environment, never echoed, and the download host covered by an allowlist row with a written reason
    - Every expectation in the gate is derived at check time, with a distinct non-vacuity failure per derivation
    - The updater-disable split is asserted in both directions over a tree-derived vocabulary, and the plant lands in a surface a shipped install actually contains
    - Two registry rows appended to the one driver, self-test green first on the unplanted control
  </acceptance_criteria>
  <done>An identifier drift, a licence-form drift, a policy flip or a token loss cannot reach a public catalogue without a red row naming it</done>
</task>

<task type="checkpoint:human-verify">
  <name>Operator submissions, token custody and the recorded listing state</name>
  <reversibility rating="one-way">A published catalogue entry and an accepted Flathub application id are public and effectively permanent; a withdrawn listing leaves the id burned.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md (the verdicts, the License-form line, the mandatory metainfo elements, the desktop and icon rules, the submission checklist the record captured)
    - powerbrowser/packaging/flathub/flatpak-manifest.json.comparand, powerbrowser/packaging/flathub/metainfo.xml.comparand, powerbrowser/packaging/flathub/policies.json.comparand, powerbrowser/packaging/flathub/desktop.comparand (the exact bytes to submit after substitution)
    - docs/RELEASING.md (the release procedure the earlier stages wrote, and the place the listing rows land)
    - scripts/verify-listings.mjs (what the gate will require of the state this task records)
  </read_first>
  <files>docs/RELEASING.md</files>
  <action>These steps need the owner's own accounts, identity and secret custody, and no agent may perform them. Perform them in this order and record each result.
1. If Verdict-flathub is ADMIT: regenerate the sources with `node scripts/generate.mjs` and copy the four files out of generated/ into a scratch submission directory, renaming flathub-manifest.json to `<app-id>.json`, flathub-metainfo.xml to `<app-id>.metainfo.xml`, flathub-desktop.desktop to `<app-id>.desktop`, and flathub-policies.json to `policies.json`, where `<app-id>` is the id the gate derives. If the verdict is not ADMIT, skip steps 1 to 4 and confirm the record's Resume line names the stage that resumes it.
2. Substitute the five tokens from the published release. The asset filename is not guessed and is not asked for: docs/RELEASING.md's `## Release asset names` table (stage linux-release-pipeline-and-update-channel task 1) states the generation rule and carries the filled Linux row, and stages windows-unsigned and macos-adhoc-signed filled theirs. Take @RELEASE_TARBALL_URL@ from that row's versioned name under the immutable `/releases/download/&lt;tag&gt;/` form, @RELEASE_TARBALL_SHA256@ and @RELEASE_TARBALL_SIZE@ from the release's SHA256SUMS and the asset listing, and @RELEASE_VERSION@ and @RELEASE_DATE@ from the tag and its date. Confirm no @ token survives in any of the four files before submitting.
3. Optionally pre-check locally before opening the PR: `nix shell nixpkgs#appstream --command appstreamcli validate <app-id>.metainfo.xml` (appstream 1.1.2 in nixpkgs unstable), and a full build with `nix shell nixpkgs#flatpak-builder` (flatpak-builder 1.4.4 in nixpkgs unstable), which additionally needs `services.flatpak.enable = true` in /etc/nixos applied through `pkexec bash -c 'export PATH=/run/current-system/sw/bin:/run/wrappers/bin:$PATH; nrs "enable flatpak for listing build proof"'`. This is optional because the Flathub build service builds the submission PR itself; if you skip it, expect to iterate on the PR.
4. Open the Flathub submission PR from your own account against the Flathub submission repository on a branch named for the app id, complete the submission checklist, and record the PR url and the build url the service reports.
5. If Verdict-winget is ADMIT: fork the catalogue repository, create the first manifest set once with `nix shell nixpkgs#komac --command komac new` (komac 2.16.0 in nixpkgs unstable) or the vendor's own creator tool, accept the catalogue's contribution agreement under your account, open the PR, and record its url. If the verdict is REFUSE, do nothing here and confirm the record's Resume line names the stage that resumes it.
6. If Verdict-winget is ADMIT: create a fine-grained personal access token scoped to your fork of the catalogue repository only, with contents write and pull-requests write, no other repository and no organisation scope, and store it as a secret named WINGET_TOKEN in the release environment of the project repository, never as a repository-wide secret. Record the secret name and its expiry date in the doc, never the value.
7. Homebrew: take no action, and confirm the deferral row names the stage slug that resumes it once notarization exists.
8. Add a Listings table to docs/RELEASING.md with one row per listing carrying the listing name, a state of submitted, shipped or deferred, and a pointer that is the PR url for a submitted or shipped row and a stage slug for a deferred row. Every listing whose verdict is ADMIT gets a submitted or shipped row carrying its PR url; every other listing gets a deferred row carrying the stage slug from its Resume line.
Commit as docs(09-01): record listing submissions and token custody.</action>
  <verify>
    <automated>git add docs/RELEASING.md && node scripts/verify-listings.mjs && R=.planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md && for u in $(grep -oE 'https://github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/pull/[0-9]+' docs/RELEASING.md); do gh pr view "$u" --json state >/dev/null || exit 1; done && for l in $(grep -E '^Verdict-[a-z]+: ADMIT$' "$R" | sed -E 's/^Verdict-(.*): ADMIT$/\1/'); do grep -E "^\| *$l *\| *(submitted|shipped) *\|" docs/RELEASING.md | grep -qE 'https://github\.com/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/pull/[0-9]+' || { echo "listing $l is ADMIT but has no submitted or shipped row carrying a PR url"; exit 1; }; done && for l in $(grep -E '^Verdict-[a-z]+: (REFUSE|DEFER)$' "$R" | sed -E 's/^Verdict-(.*): (REFUSE|DEFER)$/\1/'); do grep -Eq "^\| *$l *\| *deferred *\|" docs/RELEASING.md || { echo "listing $l is not ADMIT but has no deferred row"; exit 1; }; done && if grep -q '^Verdict-winget: ADMIT$' "$R"; then gh api "repos/DeBIOS-Foundation/powerbrowser/environments/release/secrets" --jq '.secrets[].name' | grep -qx WINGET_TOKEN || exit 1; fi && ! grep -q '@RELEASE_' docs/RELEASING.md && scripts/verify-platform.sh --quick</automated>
    <fails_when>a recorded PR url does not resolve, an ADMIT listing has no submitted or shipped row carrying a live PR url, a non-ADMIT listing has no deferred row, the winget token is absent from the release environment while the verdict is ADMIT, an unsubstituted token was pasted into the doc, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Every listing has a row whose state and pointer match both the record's verdict and what the operator actually did
    - Every ADMIT listing carries a PR url that resolves live, so a run in which nothing was submitted cannot pass
    - The catalogue token exists only as a release-environment secret, scoped to one fork, with its expiry recorded and its value nowhere
    - No substitution token reached a submitted file or the doc
  </acceptance_criteria>
  <done>The first submissions exist under the owner's identity and the tree records their state mechanically</done>
</task>

<task type="auto">
  <name>Maintenance section in docs/RELEASING.md with a derived doc-to-automation gate</name>
  <reversibility rating="reversible">Documentation plus one gate script and two registry rows.</reversibility>
  <read_first>
    - docs/RELEASING.md (whole file: the release procedure, the repository-controls register, the ruleset and environment posture, the listings table task 4 added) and in particular its `## Deferred signing items` section, written by stage prerequisites-and-hardening task 3 with seven numbered consequences. That section is the ONE deferral register in this document; this task extends it and creates no sibling table, so the two gates cannot drift apart while both stay green
    - docs/BUILD.md lines 1009 to 1017 (the attributed packaging-timings table: 33m44s updater-flag-flip rebuild, 54m N-plus-1 fresh build, 54m40s release build; these are the only wall times the cadence section may cite) and lines 1022 to 1063 (the rebase procedure, the 08-05 live drill, and the CI story that states the no-schedule posture)
    - .github/workflows/rebase-upstream.yml lines 1 to 18 (the D-77 statement in its own voice, to restate rather than reinvent)
    - .github/workflows/release.yml (job ids, their order, and the tag pattern the gate derives)
    - configuration.toml [upstreams] firefox_esr_tag (the pin the cadence section cites)
    - .planning/drafts/distribution/S9-PROBE-LISTING-ADMISSION.md (the verdict, Resume and Deferred lines the gate derives the listing and deferral sets from)
    - scripts/verify-rebranding-docs.mjs (whole file, 252 lines: the derivation from scripts/lib/config-schema.json, the code-span matching rule, REQUIRED_COMMANDS, the four non-vacuity messages, the self-test that mutates scratch copies of the real guide)
    - scripts/verify-platform.sh lines 3630 to 3644 (the verify-rebranding-docs row pair this new pair sits beside)
  </read_first>
  <files>docs/RELEASING.md, scripts/verify-releasing-maintenance.mjs, scripts/verify-platform.sh</files>
  <action>Write a `## Maintenance` section covering seven subsections and nothing else. Cadence: one release per ESR point release, roughly every four weeks plus out-of-cycle security releases, each costing one rebase drill through scripts/rebase-upstream.sh plus one build per target on the reference host, citing the attributed wall times from the docs/BUILD.md packaging-timings table rather than new numbers, and naming the current pin from configuration.toml. Out-of-band security path: the same pipeline with the review shortened to the release environment's single required reviewer, tagged as soon as the rebase drill is green, with the liveness job still last. Schedule posture: D-77 is kept, no workflow carries a schedule key, the update-channel liveness row runs as release.yml's final job named by its job id, and a daily schedule remains an owner decision that has not been taken. Key rotation: promote the secondary signing key to primary, generate a new secondary, ship one release carrying both DERs so an install on either key can verify, then retire the old primary, naming each tracked DER file and the verification rows that prove a signed and a planted-unsigned MAR. Runner upkeep: the ephemeral self-hosted runner service on the reference host, the NixOS rebuild idiom that maintains it, disk headroom for the objdirs the release builds need, and the sccache posture. Cloudflare upkeep: the Pages project serving the per-channel descriptors, the redirect rule mapping the baked update path, the DNS records, and the free-tier caps that keep MAR bytes on the release assets. ESR train change: roughly every twelve months, a major rebase with the whole patch stack re-proven and the toolchain baseline diffed. Listings and deferrals: keep task 4's Listings table, and extend the EXISTING `## Deferred signing items` section stage prerequisites-and-hardening wrote rather than adding a sibling Deferrals table. Append the listing-specific rows to that one section in the same numbered shape its seven consequences use, each naming the deferred item and the stage slug that resumes it. The Windows Authenticode, Apple notarization and Homebrew cask facts already live there as consequences 1, 5 and 7 and are not restated; a listing row that duplicates one of them is the drift this consolidation exists to prevent.
Then write scripts/verify-releasing-maintenance.mjs in the verify-rebranding-docs idiom, deriving every expectation at check time: the workflow-to-trigger map from every file under .github/workflows by a top-level indentation scan, compared to the documented trigger table as set equality in both directions so an added schedule key and a removed trigger both go red; the job ids of release.yml, each required in the doc as a code span, plus the last job id derived from the order the ids appear under the jobs key and required as the job the schedule-posture subsection names as the liveness job, so a reordering that moves it away from last goes red rather than leaving the claim unchecked; the ESR pin from configuration.toml and the release-tag pattern from release.yml, each required as a code span; the tracked DER basenames from git ls-files, each required in the rotation subsection, with an empty set failing by name as a missing prerequisite from the mar-signing-and-update-integrity stage rather than passing; the listing set from the admission record's verdict lines, each requiring one table row with a state of submitted, shipped or deferred and a deferred row requiring a stage-slug pointer; the deferral set as the UNION of the seven numbered consequences already in docs/RELEASING.md's `## Deferred signing items` section and the admission record's Resume and Deferred lines, compared as set equality against the rows that section actually carries, so a dropped consequence and an unrecorded listing deferral both go red and neither register can drift from the other; an empty deferral derivation fails by name; and a small required-command list in the precedent's shape covering the rebase script, the full gate invocation, the generator check and the signing tool. Every derivation fails distinctly when empty.
Give it a --self-test over scratch copies that goes green unplanted first and then requires each of these to go red naming the drift: a schedule key planted into a fixture workflow, a documented trigger removed, a job id removed from the doc, the fixture job order changed so the documented liveness job is no longer last, a DER basename removed, a listing row removed, a deferred row stripped of its pointer, a row removed from `## Deferred signing items` for an item the record defers, one of the seven original consequences deleted from that section, a sibling deferrals table added alongside it, and a required command removed. Append two registry rows beside the verify-rebranding-docs pair with honesty comments. Stage the three files before any scan. Commit as docs(09-01): release maintenance section with derived doc gate. Finish with the script green, its self-test green, both rows green through the single-gate runner, and the quick gate green.</action>
  <verify>
    <automated>git add docs/RELEASING.md scripts/verify-releasing-maintenance.mjs scripts/verify-platform.sh && node --check scripts/verify-releasing-maintenance.mjs && node scripts/verify-releasing-maintenance.mjs && node scripts/verify-releasing-maintenance.mjs --self-test && scripts/verify-platform.sh --only releasing-maintenance && scripts/verify-platform.sh --only releasing-maintenance-self-test && scripts/verify-platform.sh --only listing-manifests && scripts/verify-platform.sh --only verify-rebranding-docs && grep -Eq '^## Maintenance' docs/RELEASING.md && grep -Eq '^## Deferred signing items' docs/RELEASING.md && test "$(grep -c '^## Deferred signing items' docs/RELEASING.md)" -eq 1 && scripts/verify-platform.sh --quick</automated>
    <fails_when>the doc gate exits non-zero on the unmodified tree, any planted fault fails to go red naming the drift, the maintenance heading is absent, the `## Deferred signing items` heading is absent or appears more than once (a sibling register was created instead of extending the one stage prerequisites-and-hardening wrote), a sampled guard row fails, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Seven subsections present, each citing tree-derived values and the attributed timings from the packaging-timings table rather than new numbers
    - Trigger table, job ids, job order, pin, tag pattern, DER basenames, listing rows and deferral rows all derived and compared, red on addition and removal
    - The documented liveness job is checked against the derived last job id, so the ordering claim cannot go stale
    - There is exactly one deferral register, `## Deferred signing items`, and the gate compares it as set equality against the union of stage prerequisites-and-hardening's seven consequences and the admission record's Resume and Deferred lines
    - Deferred rows carry stage-slug pointers, an empty DER derivation fails by name rather than passing, and an empty deferral derivation does the same
    - Two registry rows appended to the one driver with self-test green first on the unplanted control
  </acceptance_criteria>
  <done>The maintenance procedure cannot drift from the automation it describes without a red row naming the drift</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Public catalogue to installing user | A third-party index serves an installer this project built; the catalogue, not this project, controls what the user sees before install. |
| Flatpak sandbox to update mechanism | A package-manager-owned install must not replace its own bytes; the boundary is enforced by the policy file the Flatpak installs into the app directory. |
| Release environment secret to submission job | The catalogue token lives only in the release environment and reaches one gated job on a hosted runner; the self-hosted build host never sees it. |
| Admission record to automation | A text record written from live evidence is the branch condition for a workflow job and two gates; it is read as data, never executed. |
| Substitution tokens to submitted bytes | The tracked comparands carry tokens, never real urls or checksums; substitution happens once, outside the tree, at submission. |
| Manifest values to a public listing | Display name, vendor, licence and homepage reach a third-party catalogue through generator output and tracked comparands, so a brand edit cannot land in a listing without passing the byte-identity and literal gates. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-09-01-01 | Elevation of privilege | package-manager install self-updating over its own bytes | high | mitigate | The Flatpak installs distribution/policies.json with DisableAppUpdate true into the app directory the policy reader uses, and the gate asserts that key true with no sibling key while proving no update-disabling knob appears in the branding pref files a shipped install actually contains; the vocabulary for both halves is derived from the policy table and the tracked pref files, and both halves carry planted faults. |
| T-09-01-02 | Spoofing | a listing pointing at bytes this project did not publish | high | mitigate | The extra-data source carries substitution tokens in the tree, filled once from the release's own SHA256SUMS and the immutable asset url, pinned by sha256 and size at install time; the checkpoint's verify fails if any token reached the doc unsubstituted. |
| T-09-01-03 | Tampering | catalogue token reused beyond one fork | high | mitigate | Fine-grained token scoped to the fork of the catalogue repository with contents and pull-requests write only, stored as a release-environment secret, never repository-wide, value never recorded and never echoed by the job. |
| T-09-01-04 | Tampering | identifier, app id or licence drift between manifest, workflow and catalogue | medium | mitigate | All three are derived from configuration.toml through the generator's own resolver at check time and compared to the emitted manifest, the workflow literal and the admission record's recorded accepted form; a drift is red before a release runs. |
| T-09-01-05 | Repudiation | a listing whose submission nobody can trace | low | mitigate | Every listing has a row with a state and a pointer that is a live PR url or a stage slug; the checkpoint requires a live PR url for every ADMIT listing and a deferred row for every other, and the doc gate derives the listing set from the admission record so a listing without a row is red. |
| T-09-01-06 | Denial of Service | a missed ESR security release leaving users on a vulnerable build | medium | mitigate | The maintenance section fixes one release per ESR point release plus an out-of-band path, and the gate ties the documented triggers, job ids and job order to the workflows so the liveness job cannot silently leave the pipeline or stop being last. |
| T-09-01-07 | Information disclosure | secret material in workflow logs | medium | mitigate | The submission job reads the token from the release environment and passes it to the tool without echoing; no step prints the secret and no secret is written to the doc. |
| T-09-01-08 | Spoofing | an installed listing entry that cannot launch or that borrows another application's icon | medium | mitigate | The desktop entry is emitted for the Flatpak rather than copied from the development entry, its Exec is the app command with no repo-root token, its Icon is the app id, and the gate asserts all three plus the metainfo launchable naming the same basename. |
| T-09-01-SC | Tampering | supply chain of the submission tooling | medium | mitigate | No new registry package and no new npm dependency; the submission tool is a release binary pinned by version and sha256 from a host recorded in the endpoint allowlist with a written reason, the runtime is pinned by branch, and the nixpkgs tools named for the operator's optional pre-check are recorded with their versions (komac 2.16.0, appstream 1.1.2, flatpak-builder 1.4.4, all nixpkgs unstable). |
</threat_model>

<verification>
Admission record carries three parsable verdicts plus the accepted licence form, the naming rules, the measured runtime and glibc facts and at least three deferral lines, each with dated evidence; the generator emits the four Flathub sources idempotently and byte-identically to their tracked comparands with the residue and literal scans green and the one allowlist row in the same commit; the listing gate and its self-test are green with every plant going red naming the drift; the workflow half matches the recorded verdict exactly; the submissions resolve live for every ADMIT listing and the token exists only in the release environment; the maintenance section is green under a gate that derives triggers, job ids, job order, the pin, the tag pattern, the tracked keys, the listing set and the deferral set from the tree; four new registry rows are green through the single driver and the quick gate is green.
</verification>

<success_criteria>
A user can install from a package manager without the install ever self-updating, and the project has a written cadence whose every claim about its own automation is checked by derivation rather than by reading.
</success_criteria>

<output>
Stage 9 slice: listing-admission verdicts with a licence form, naming rules and a deferral register; generator-emitted Flathub sources with comparands and one declared allowlist row; a verdict-gated winget submission step; the first operator submissions with scoped token custody; and docs/RELEASING.md's maintenance section under a derived doc-to-automation gate.
</output>
