---
phase: distribution-stage-1-prerequisites-and-hardening
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified: [powerbrowser/endpoint-allowlist.json, scripts/generate.mjs, powerbrowser/branding/dev/pref/firefox-branding.js, powerbrowser/branding/release/pref/firefox-branding.js, .github/settings/ruleset-release-tags.json, .github/settings/ruleset-release-tag-signatures.json, .github/settings/ruleset-main.json, .github/settings/environment-release.json, .github/settings/environment-release-tag-policy.json, .github/settings/actions-permissions.json, .github/settings/actions-selected.json, .github/settings/workflow-permissions.json, .github/settings/fork-pr-approval.json, docs/RELEASING.md, scripts/verify-repo-controls.mjs, scripts/verify-platform.sh, configuration.toml, .github/workflows/rebase-upstream.yml, scripts/smoke-firefox.sh, powerbrowser/packaging/version-nplus1/version.txt, powerbrowser/packaging/version-nplus1/version_display.txt, docs/BUILD.md]
autonomous: false
requirements: [DIST-01, SEC-01]
must_haves:
  truths:
    - "origin/main carries fb90e73, every local `v1.*` milestone tag exists on origin as a set equal to the local set, and verify.yml is green on GitHub for the pushed head before any release workflow exists"
    - "Release-pattern tags can be created, moved or deleted only by the organisation owner, and an unsigned release-pattern tag is refused at push time for every actor including the owner, proven by a planted unsigned push that is rejected"
    - "main cannot be force-pushed or deleted; only GitHub-owned, verified-creator and the explicitly listed actions run, pinned by full SHA, with a read-only default token; a release environment gated on the owner exists and accepts release tags only; releases are immutable before the first one exists"
    - "Every applied control is declared in a tracked JSON body under .github/settings/ and a registered verification row compares that directory against live GitHub state as set equality, so a widened policy or a deleted ruleset reddens after this plan is archived"
    - "The aus5.mozilla.org allowlist reason and the generator's github.com comment describe controls that exist today, and the tracked pref comparands are byte-identical to the regenerated output"
    - "The ESR pin is FIREFOX_153_2_0esr_RELEASE in the manifest, the workflow mirror and the materialised upstream/ tree, with the patch stack replayed non-vacuously and the toolchain baseline unchanged, and origin/main carries that commit with verify.yml green on it"
  artifacts:
    - path: "docs/RELEASING.md"
      provides: "Repository controls register naming every tracked body, secrets inventory, the seven unsigned-posture consequences, signing setup, immutable-release consequence for later stages"
      contains: "## Repository controls"
    - path: ".github/settings/ruleset-release-tag-signatures.json"
      provides: "The bypass-free signature ruleset that binds the owner as well, applied by gh api and read back by the verify"
      contains: "required_signatures"
    - path: ".github/settings/ruleset-release-tags.json"
      provides: "The creation, update, deletion and non-fast-forward restriction with the owner as the only bypass actor"
      contains: "OrganizationAdmin"
    - path: ".github/settings/environment-release.json"
      provides: "The release environment body with the owner as required reviewer"
      contains: "custom_branch_policies"
    - path: "scripts/verify-repo-controls.mjs"
      provides: "The permanent drift check between .github/settings/ and live GitHub state, with a network-free --self-test"
      min_lines: 120
    - path: "powerbrowser/endpoint-allowlist.json"
      provides: "aus5 reason naming the real state of MAR verification and where signing arrives"
      contains: "mar-signing-and-update-integrity"
    - path: "scripts/generate.mjs"
      provides: "github.com comment stating the absent-entry failure mode of verify-endpoints.sh layer 3"
      contains: "has no entry in"
    - path: "configuration.toml"
      provides: "The single ESR pin declaration"
      contains: "FIREFOX_153_2_0esr_RELEASE"
  key_links:
    - from: "configuration.toml"
      to: ".github/workflows/rebase-upstream.yml"
      via: "verify-upstream-pins asserts the workflow_dispatch default mirrors the manifest pin"
      pattern: "FIREFOX_153_2_0esr_RELEASE"
    - from: "scripts/generate.mjs"
      to: "powerbrowser/branding/dev/pref/firefox-branding.js"
      via: "the emitter writes generated/branding/dev/pref/firefox-branding.js and the tracked file is its byte-identity comparand, synced by copy"
      pattern: "has no entry in"
    - from: ".github/settings/ruleset-release-tag-signatures.json"
      to: "scripts/verify-repo-controls.mjs"
      via: "the check derives the expected rule and bypass sets from the tracked body and compares them against the live ruleset"
      pattern: "required_signatures"
    - from: "scripts/verify-repo-controls.mjs"
      to: "scripts/verify-platform.sh"
      via: "one registry row in the full set plus its network-free self-test row in the quick set"
      pattern: "repo-controls"
    - from: ".github/settings/ruleset-release-tags.json"
      to: "docs/RELEASING.md"
      via: "RELEASING.md carries the gh api command that applies each tracked body and the read-back that proves it"
      pattern: "ruleset-release-tags.json"
---

<objective>
Make the repository releasable: push the tree the public remote has never seen and prove verify.yml green on GitHub under the flake's inkscape (DIST-01), then put the process controls in place before any release workflow exists (SEC-01): a release-tag ruleset restricting creation to the owner, a separate bypass-free ruleset requiring signatures on those same tags, a main ruleset blocking force-push and deletion, organisation 2FA, a restricted actions policy with SHA pinning, a `release` environment gated on the owner and restricted to release tags, immutable releases, a read-only default token, and a secrets inventory. Every control is declared in a tracked JSON body and guarded afterwards by one registered verification row. Correct the two texts that claim controls this tree does not have, and move the ESR pin to the current point release with the drilled rebase flow.

Purpose: stage release-identity emits versions and tags against this pin; stage mar-signing-and-update-integrity puts the first secret into the environment this stage creates; stage linux-release-pipeline-and-update-channel adds release.yml, which triggers on the tag pattern this stage protects. Nothing here builds Gecko, touches the update mechanism, or authors a workflow.

Output: two corrected texts with comparands re-synced, origin at parity with green CI at the end of the stage, nine tracked settings documents applied and read back, one permanent drift check in the registry, docs/RELEASING.md, a signing setup proven by a verified tag and by a rejected unsigned one, and upstream/ at FIREFOX_153_2_0esr_RELEASE.
</objective>

<context>
@.planning/seeds/SEED-001-standard-distribution-updates-reports.md
@docs/BUILD.md
@CLAUDE.md
@.github/workflows/verify.yml
@.github/workflows/rebase-upstream.yml
@scripts/rebase-upstream.sh

Live state re-read on 2026-09-06 with `gh` 2.99.0 authenticated as ServerDestroyer (user id 51835244; token scopes read:org, repo, workflow), every value below from a read-only API call or the local tree:

- origin (https://github.com/DeBIOS-Foundation/powerbrowser.git) is 306 commits behind local main and the number keeps moving, because the concurrent v1.3 session commits into the same branch. The seed recorded 168 and the first draft of this plan recorded 215. No task keys on a count; task 2 pushes whatever main holds at push time and every read-back keys on origin/main's head. origin holds zero tags and zero releases; the last two verify.yml runs on origin/main (2026-09-04, heads 12016b6 and df0dd44) concluded failure. Local tags v1.0, v1.1, v1.2 are annotated and unsigned; v1.2 points at 3dcbea7, which predates fb90e73.
- Repository settings: rulesets `[]`; environments 0; secrets 0; `actions/permissions` = `{enabled: true, allowed_actions: "all", sha_pinning_required: false}`; `actions/permissions/workflow` = `{default_workflow_permissions: "read", can_approve_pull_request_reviews: false}` (already the target, so that control is applied for idempotence and proved by read-back); fork-PR approval `first_time_contributors`; immutable releases `{enabled: false, enforced_by_owner: false}`; org plan `free`, `two_factor_requirement_enabled: false`; `allow_forking: true`.
- `sha_pinning_required` is a field of `PUT /repos/{owner}/{repo}/actions/permissions`; the sub-path `/actions/permissions/sha-pinning-required` returns 404. Immutable releases: `GET|PUT|DELETE /repos/{owner}/{repo}/immutable-releases`, PUT takes no body and returns 204. Ruleset bypass actor `OrganizationAdmin` ignores `actor_id`. Ruleset fnmatch supports `[0-9]` character sets (negation is not supported). Deployment branch policies take `{name, type: "tag"}` with Ruby File.fnmatch semantics. `gh ruleset` only views (check, list, view); creation goes through `gh api`.
- **Ruleset bypass is per-ruleset, not per-rule.** An actor listed in `bypass_actors` is exempt from every rule in that ruleset. A single ruleset carrying both the creation restriction (whose whole purpose is a bypass for the owner) and `required_signatures` therefore requires signatures of nobody, because the only actor who can create a matching tag is the one exempted. That is why this plan applies two tag rulesets over the same ref pattern: `release-tags` with the owner bypass and the four restriction rules, and `release-tag-signatures` with an empty bypass and `required_signatures` alone. Task 4 plants the fault that proves the split works.
- Signing: git 2.54.0; no `gpg.format`, `user.signingkey`, `tag.gpgsign` or `commit.gpgsign` configured; `/home/chris/.ssh/id_ed25519.pub` exists. `git config --get user.email` is `christopher@colantuono.us` and `git for-each-ref --format='%(taggeremail)' refs/tags/v1.2` confirms that address is what a tag created here carries. GitHub reports `verification.reason == "valid"` only when the signing key is registered as a **signing** key AND the tagger address is a **verified** email on the same account; the current token scopes cannot read either list, so task 4 establishes both by operator step and proves them with a pushed tag.
- Toolchain from the locked flake (`flake.lock` nixpkgs ffb3c9b700e759be2ef13237c9d8f953b32a1e46): `nix eval --inputs-from . nixpkgs#inkscape.version` = 1.4.4, `nixpkgs#nodejs_22.version` = 22.23.2 (flake.nix:20 sets `nodejs = pkgs.nodejs_22`), `nixpkgs#firefox-esr-153-unwrapped.version` = 153.1.0esr. The nixos search index for nixos-unstable reports inkscape **1.4.3** and does not list firefox-esr-153-unwrapped; the lock is authoritative, and a `nix flake update` would move inkscape and break the tracked PNG byte identity (flake.nix:33-41 states this). Nothing in this plan updates the lock.
- Upstream: the newest 153 ESR tag on https://github.com/mozilla-firefox/firefox.git is FIREFOX_153_2_0esr_RELEASE. Local upstream/ HEAD is the 153_1_0 commit (`git -C upstream tag --points-at HEAD` prints FIREFOX_153_1_0esr_BUILD1 and FIREFOX_153_1_0esr_RELEASE), `upstream/config/milestone.txt` ends `153.1.0`, `upstream/powerbrowser` resolves to `../powerbrowser`, and `git -C upstream diff --quiet` holds while the index is dirty in exactly browser/moz.build and browser/moz.configure. The docs/BUILD.md rebase drill (08-05, BUILD.md:1044-1060) already replayed onto 153_2_0 with an empty toolchain-baseline diff and then restored the pin; this stage makes the move permanent. objdir/ lives at the repo root (`.mozconfig:6`), survives the re-clone, and is stale afterwards: a tier-3 rebuild (54m measured on legion, docs/BUILD.md packaging timings) precedes any full-mode row. This stage notes the cost and does not run the build; stage packaged-product-correctness-linux performs the first post-rebase build.
- Text defects confirmed: `powerbrowser/endpoint-allowlist.json:22` says "self-hosted MAR under fork signing" while `.mozconfig:8` carries `--enable-unverified-updates` and no fork key exists; `scripts/generate.mjs:2471-2472` and both tracked comparands (`powerbrowser/branding/{dev,release}/pref/firefox-branding.js:131`) say "github.com stays a `deny` entry in endpoint-allowlist.json" while `grep -n 'github.com' powerbrowser/endpoint-allowlist.json` is empty. `scripts/verify-endpoints.sh:454` prints "layer 3 FAIL -- unlisted or denied host(s) resolved", so an absent entry already fails a regression; the comment must say that instead. Upstream facts the rewritten aus5 reason states check out: `upstream/browser/installer/package-manifest.in:463-465` gates `@RESPATH@/distribution/*` on BUILT_BY_MOZILLA, and `upstream/build/moz.build:95-97` prefers `CONFIG["MOZ_APPUPDATE_HOST"]` over the aus5 default.
- The generator emits the github.com comment as an array of single-quoted lines about 58 characters wide (scripts/generate.mjs:2462-2473), so any assertion over that comment must be wrap-insensitive; task 1's verify flattens newlines before matching.
- Literal hazards for the new documents: `scripts/verify-manifest-literals.mjs` sweeps `git ls-files` for the multi-word display forms only (vendor display, the dev display composition, the trademark sentence), and its EXCLUDED/ALLOWLIST tables need no new row as long as docs/RELEASING.md refers to the organisation by its login `DeBIOS-Foundation` and to the product by its repository name. `scripts/verify-upstream-pins.mjs:152-159` sweeps scripts/, theia/, .github/ and the root toml/nix/mk files for `FIREFOX_<digit>` literals, so the new `.github/settings/*.json` and `scripts/verify-repo-controls.mjs` must carry none; they do not. The residual-brand scan and the literal check both iterate `git ls-files`, so every new file is staged before any scan.
- `scripts/smoke-firefox.sh:41` hard-codes `153.1.0esr`; after the rebase it would go red on the next full run for a non-defect. `powerbrowser/packaging/version-nplus1/` carries 153.1.1 / 153.1.1esr, older than the new N (153.2.0), which would make the docs/BUILD.md N-to-N-plus-1 procedure fail the client's newness check. `grep -rn 'version-nplus1' scripts/ .github/` is empty, so neither file is read by any registry row; both are corrected in task 6.
- Concurrency hazard, read-side only: `scripts/verify-platform.sh:2705` feeds `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` into the `allowlist-doc-consistency` row, which is in the `--quick` set that every task here ends with. Those two files belong to the concurrent v1.3 session. This plan writes nothing under `.planning/`. Task 1's own edit is outside that row's filter (aus5 is `deny` and `.org`), so no task can cause that red; if it goes red it belongs to the other session.
</context>

<tasks>

<task type="auto">
  <name>Correct the two stale control claims and re-sync the pref comparands</name>
  <reversibility rating="reversible">Two comment strings and one JSON reason; the comparand copy is repeatable from the generator.</reversibility>
  <read_first>
    - powerbrowser/endpoint-allowlist.json lines 19-27 (the aus5 deny entry and the updates.powerbrowser.org allow entry it pairs with)
    - scripts/generate.mjs lines 2462-2473 (the github.com prefetch comment block emitted into both branding pref files; the stale phrase is at 2471-2472)
    - scripts/generate.mjs lines 3568-3573 and 3610-3615 (the two comparand rows mapping generated/branding/<variant>/pref/firefox-branding.js to the tracked files)
    - .mozconfig lines 1-8 (the comparand-sync convention in the header comment; the --enable-unverified-updates literal)
    - scripts/verify-endpoints.sh lines 448-460 (layer 3's unlisted-host failure)
    - docs/BUILD.md lines 705-724 (key-custody rung: what is and is not verified today)
  </read_first>
  <files>powerbrowser/endpoint-allowlist.json, scripts/generate.mjs, powerbrowser/branding/dev/pref/firefox-branding.js, powerbrowser/branding/release/pref/firefox-branding.js</files>
  <action>Rewrite the aus5.mozilla.org reason so it states the present control set: the updater is compiled in since 08-04 with --enable-unverified-updates, so no MAR signature is verified yet and fork MAR signing arrives in stage mar-signing-and-update-integrity; the effective update URL is fork-controlled only where the AppUpdateURL policy file is installed by the docs/BUILD.md post-build copy, the distribution directory is not part of the packaged product (upstream/browser/installer/package-manifest.in:463-465 gates it on BUILT_BY_MOZILLA), and stage release-identity replaces the policy with MOZ_APPUPDATE_HOST baked from the manifest; keep the fail-loud sentence and the D-84/D-86 sentence unchanged. Rewrite the generator comment lines at 2471-2472 so they say github.com **has no entry in** endpoint-allowlist.json and that verify-endpoints.sh layer 3 fails on any resolved host the allowlist does not list, so a regression fails the check, with the github.com rows the updater needs arriving in stage linux-release-pipeline-and-update-channel from a layer-3 observation. Keep the line width of the neighbouring comment lines, and keep the five-word fragment `github.com has no entry in` contiguous on one emitted line so the artifact assertion is not defeated by wrapping; the "layer 3" and "fails" halves may wrap because the verify flattens newlines before matching. Regenerate inside the theia shell, copy generated/branding/dev/pref/firefox-branding.js and generated/branding/release/pref/firefox-branding.js over their tracked comparands (the .mozconfig header states this convention; never edit the tracked files by hand), run generate --check, stage the four files, run the quick gate, and commit as fix(dist-1): correct the aus5 reason and the github.com allowlist comment. Do not add a github.com entry and do not touch policies.json: both belong to later stages.</action>
  <verify>
    <automated>! grep -q 'self-hosted MAR under fork signing' powerbrowser/endpoint-allowlist.json && grep -q 'mar-signing-and-update-integrity' powerbrowser/endpoint-allowlist.json && ! grep -q 'stays a `deny` entry' scripts/generate.mjs powerbrowser/branding/dev/pref/firefox-branding.js powerbrowser/branding/release/pref/firefox-branding.js && for f in scripts/generate.mjs powerbrowser/branding/dev/pref/firefox-branding.js powerbrowser/branding/release/pref/firefox-branding.js; do grep -q 'github.com has no entry in' "$f" || exit 1; tr '\n' ' ' < "$f" | grep -q 'layer 3[[:space:][:punct:]]*fails' || exit 1; done && nix develop .#theia --command node scripts/generate.mjs && cmp -s generated/branding/dev/pref/firefox-branding.js powerbrowser/branding/dev/pref/firefox-branding.js && cmp -s generated/branding/release/pref/firefox-branding.js powerbrowser/branding/release/pref/firefox-branding.js && nix develop .#theia --command node scripts/generate.mjs --check && git add powerbrowser/endpoint-allowlist.json scripts/generate.mjs powerbrowser/branding/dev/pref/firefox-branding.js powerbrowser/branding/release/pref/firefox-branding.js && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>either stale phrase survives, the corrected comment does not carry the contiguous fragment or the layer-3 failure claim, the generator's output differs from a tracked comparand (a hand edit or a missed copy), generate --check reports drift, or the quick gate exits non-zero; or `allowlist-doc-consistency` goes red because the concurrent v1.3 session changed .planning/ROADMAP.md or .planning/REQUIREMENTS.md, which is triaged to that session and never to this stage</fails_when>
  </verify>
  <acceptance_criteria>
    - The aus5 reason names --enable-unverified-updates, the post-build policy copy, the BUILT_BY_MOZILLA packaging gate, and the two stages that change each fact
    - The github.com comment states that no entry exists and names the absent-entry failure mode plus the stage that adds the rows
    - Both tracked pref files are byte-identical to the generator's output and generate --check is green
    - Quick gate green with the four files staged
  </acceptance_criteria>
  <done>Every allowlist reason and generated comment describes a control that exists in this tree</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Push main and every milestone tag; prove verify.yml green on GitHub</name>
  <reversibility rating="costly">Publishes the whole local history and every `v1.*` tag to a public remote; after task 3 the main ruleset blocks any rewrite.</reversibility>
  <read_first>
    - .github/workflows/verify.yml lines 22-70 (`on: push:` with no ref filter, so a tag push also triggers it; the three nix develop steps)
    - docs/BUILD.md lines 38-48 (why generate.mjs must run inside .#theia)
    - .planning/seeds/SEED-001-standard-distribution-updates-reports.md lines 77-85 (repository and CI state the seed recorded)
  </read_first>
  <files>none (remote state only)</files>
  <action>Operator steps, in this order, from the repo root with task 1 committed on main: (1) `git fetch origin && git rev-list --count main..origin/main` must print 0 (fast-forward only; if it does not, stop and report, never force). (2) `git push origin main`. (3) `gh run watch --repo DeBIOS-Foundation/powerbrowser --exit-status "$(gh run list --repo DeBIOS-Foundation/powerbrowser --workflow=verify.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"` and wait for success; on failure read the failing step's log with `gh run view --repo DeBIOS-Foundation/powerbrowser --log-failed` and stop, because a red main run means fb90e73's local proof did not transfer and nothing below may proceed. (4) Push the milestone tags as a derived set, never as a typed list, because the concurrent v1.3 session may add one before this stage runs: `git push origin $(git tag -l 'v1.*' | tr '\n' ' ')`. Each of those tag pushes triggers verify.yml with the workflow file as of that tag's commit, which predates fb90e73 and carries no Nix step, so each is red for a known non-defect; they are not re-run, and task 3 records them in docs/RELEASING.md under Known red runs, counting whatever tag-triggered runs this push actually produced rather than fixing the number. Type "approved" once the main run is green and every `v1.*` tag is on origin.</action>
  <verify>
    <automated>git fetch -q origin main && git merge-base --is-ancestor fb90e73 origin/main && test "$(git tag -l 'v1.*' | sort | md5sum)" = "$(git ls-remote --tags origin | sed -n 's|.*refs/tags/\(v1\..*[^}]\)$|\1|p' | sort -u | md5sum)" && gh run list --repo DeBIOS-Foundation/powerbrowser --workflow=verify.yml --branch main --commit "$(git rev-parse origin/main)" --json conclusion --jq '.[0].conclusion' | grep -qx success</automated>
    <fails_when>origin/main does not contain fb90e73, the remote `v1.*` tag set differs from the local one in either direction (a tag not pushed, or one on origin that is not local), or the verify.yml run for origin/main's head did not conclude success</fails_when>
  </verify>
  <acceptance_criteria>
    - origin/main is a fast-forward of the previous origin/main and contains fb90e73
    - The verify.yml run for origin/main's head concluded success on a GitHub-hosted runner
    - The `v1.*` tag set on origin equals the local set, compared as set equality rather than counted against a literal; their red tag-triggered runs are understood and recorded in task 3
  </acceptance_criteria>
  <done>The public remote is the tree that will be released from, and CI is green on it before any release workflow exists</done>
  <resume-signal>Type "approved" when the main run is green and every `v1.*` tag is on origin, or describe the failure</resume-signal>
</task>

<task type="auto">
  <name>Apply the repository controls from tracked JSON and write docs/RELEASING.md</name>
  <reversibility rating="reversible">Every control is a REST resource that can be deleted or PUT back while no release exists; the JSON bodies are the record of what was applied.</reversibility>
  <read_first>
    - .github/workflows/verify.yml lines 44-52 (the two actions in use: actions/checkout at a full SHA, cachix/install-nix-action at a full SHA)
    - .github/workflows/rebase-upstream.yml lines 20-33 (workflow_dispatch input; the mirror the pins check covers)
    - scripts/verify-upstream-pins.mjs lines 148-165 (inScope sweeps .github/ for tag literals; the new JSON must carry none)
    - scripts/verify-manifest-literals.mjs lines 107-150 (excluded prefixes, excluded files and the allowlist; the new document must not need an entry)
    - docs/BUILD.md lines 697-724 and 1022-1060 (key-custody rung and rebase procedure, the two sections RELEASING.md cross-references)
  </read_first>
  <files>.github/settings/ruleset-release-tags.json, .github/settings/ruleset-release-tag-signatures.json, .github/settings/ruleset-main.json, .github/settings/environment-release.json, .github/settings/environment-release-tag-policy.json, .github/settings/actions-permissions.json, .github/settings/actions-selected.json, .github/settings/workflow-permissions.json, .github/settings/fork-pr-approval.json, docs/RELEASING.md</files>
  <action>Write the nine bodies exactly.

`ruleset-release-tags.json`: name `release-tags`, target `tag`, enforcement `active`, `bypass_actors` one entry `{actor_id: 1, actor_type: "OrganizationAdmin", bypass_mode: "always"}`, conditions `ref_name.include` `["refs/tags/v[0-9]*.[0-9]*.[0-9]*-[0-9]*"]` and `exclude` `[]`, rules `creation`, `update` with `parameters.update_allows_fetch_and_merge: false`, `deletion`, `non_fast_forward`. It carries **no** signature rule.

`ruleset-release-tag-signatures.json`: name `release-tag-signatures`, target `tag`, enforcement `active`, `bypass_actors` `[]`, the same `ref_name.include` pattern, rules the single `required_signatures`. The empty bypass is the whole point: an unsigned release-pattern tag is refused for the owner too, and task 4 plants that fault.

`ruleset-main.json`: name `main`, target `branch`, enforcement `active`, `bypass_actors` `[]` (the owner cannot force-push main either), conditions `ref_name.include` `["~DEFAULT_BRANCH"]`, rules `deletion` and `non_fast_forward`; a `pull_request` rule is deferred until a second contributor exists, stated in the document.

`environment-release.json`: `wait_timer` 0, `prevent_self_review` false (the owner is the sole tag creator and the sole reviewer by seed decision 6, so self-review must stay allowed), `reviewers` `[{type: "User", id: 51835244}]`, `deployment_branch_policy` `{protected_branches: false, custom_branch_policies: true}`.

`environment-release-tag-policy.json`: `{name: "v[0-9]*.[0-9]*.[0-9]*-[0-9]*", type: "tag"}`.

`actions-permissions.json`: `enabled` true, `allowed_actions` `selected`, `sha_pinning_required` true.

`actions-selected.json`: `github_owned_allowed` true, `verified_allowed` true, `patterns_allowed` `["cachix/install-nix-action@*"]` (explicit so the policy does not depend on the creator's marketplace verification).

`workflow-permissions.json`: `default_workflow_permissions` `read`, `can_approve_pull_request_reviews` false (already live; applied for idempotence).

`fork-pr-approval.json`: `approval_policy` `all_external_contributors`.

Apply with `R=DeBIOS-Foundation/powerbrowser`, every command spelled in full:

    gh api -X POST /repos/$R/rulesets --input .github/settings/ruleset-release-tags.json
    gh api -X POST /repos/$R/rulesets --input .github/settings/ruleset-release-tag-signatures.json
    gh api -X POST /repos/$R/rulesets --input .github/settings/ruleset-main.json
    gh api -X PUT  /repos/$R/environments/release --input .github/settings/environment-release.json
    gh api -X POST /repos/$R/environments/release/deployment-branch-policies --input .github/settings/environment-release-tag-policy.json
    gh api -X PUT  /repos/$R/actions/permissions --input .github/settings/actions-permissions.json
    gh api -X PUT  /repos/$R/actions/permissions/selected-actions --input .github/settings/actions-selected.json
    gh api -X PUT  /repos/$R/actions/permissions/workflow --input .github/settings/workflow-permissions.json
    gh api -X PUT  /repos/$R/actions/permissions/fork-pr-contributor-approval --input .github/settings/fork-pr-approval.json
    gh api -X PUT  /repos/$R/immutable-releases

The actions-permissions PUT must precede the selected-actions PUT, which 409s while `allowed_actions` is `all`. Three branches, each recorded in the document if taken: if the API rejects the `update` rule's `parameters` object on a tag target, drop the parameters object and keep the rule; if it rejects the `update` **rule** on a tag target, drop the rule from the tracked body as well, so the derived comparison follows automatically; if the deployment policy rejects the bracket pattern, use `v*.*.*-*` in both the policy body and the document.

Then re-run the latest main verify run under the new policy, spelled in full:

    gh run rerun --repo $R "$(gh run list --repo $R --workflow=verify.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"
    gh run watch --repo $R --exit-status "$(gh run list --repo $R --workflow=verify.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"

A red at Install Nix names an action the policy excludes and is fixed by adding a pattern to actions-selected.json and re-applying, never by widening `allowed_actions`.

Write docs/RELEASING.md with these sections in this order. **Release tag pattern**: `v<ESR>-<revision>`, example `v153.2.0-1`; milestone tags `v1.x` never release; the pattern string once, quoted from the ruleset. **Repository controls**: a table with one row per control naming, in its own column, the tracked JSON body's filename (every file under .github/settings/ must appear by basename, which the verify asserts by walking the directory), the apply command, the read-back command, and the date applied; two rows for the two tag rulesets, stating that the split exists because ruleset bypass is per-ruleset and a bypassed signature rule requires signatures of nobody; org 2FA appears as a row marked pending until task 4; the deferred `pull_request` rule on main appears as its own row. **Actions policy**: the two actions in use and how a new action is admitted (add a pattern to actions-selected.json, re-apply, commit). **Secrets inventory**: zero secrets and zero variables today; the MAR primary key arrives in stage mar-signing-and-update-integrity as a release-environment secret with the secondary offline; keys never reach the self-hosted runner, which stage linux-release-pipeline-and-update-channel provisions. **Deferred signing items**, written under the literal heading `## Deferred signing items` because it is the ONE deferral register in this document and stage listings-and-cadence extends this same section rather than adding a sibling table, its gate anchoring on this heading; one numbered line each, naming the consequence rather than only the missing credential: (1) no Authenticode or Azure Artifact Signing certificate, resumed in stage windows-unsigned; (2) the Windows mozconfig therefore carries `--disable-maintenance-service`, because that service would run updater.exe as LocalSystem with the Authenticode check compiled out; (3) no `CERTIFICATE_*` NSIS defines; (4) SmartScreen shows an unrecognised-app warning and the download page documents More info then Run anyway; (5) the macOS arm64 binary carries an ad-hoc signature only, because Apple Silicon refuses to launch an unsigned arm64 binary, and no Developer ID or notarization exists, resumed in stage macos-adhoc-signed; (6) the DMG therefore opens only through System Settings, Privacy and Security, Open Anyway on macOS 15 and later, and macOS self-update works only for user-writable install locations because the elevated helper stays pinned to Mozilla's Team ID 43AQ936H96; (7) the Homebrew cask requires notarization and is deferred to stage listings-and-cadence. **Known red runs**: the tag-triggered verify.yml runs task 2's push produced, one row each, counted from what that push actually triggered rather than fixed at a number, and why each is red. **Immutable releases consequence**: assets cannot change after publication, so release.yml must create a draft, upload every asset, then publish; owned by stage linux-release-pipeline-and-update-channel. **Toolchain pins**: the flake lock supplies inkscape 1.4.4 and the tracked PNGs are byte-compared against it while the nixos-unstable index carries 1.4.3, so a flake update is a deliberate change with a regenerate, never a routine bump.

Refer to the organisation only by its login `DeBIOS-Foundation` and to the product only by its repository name. Stage the ten files before any scan, run the quick gate, commit as feat(dist-1): repository controls from tracked JSON plus docs/RELEASING.md.</action>
  <verify>
    <automated>R=DeBIOS-Foundation/powerbrowser && for f in .github/settings/*.json; do python3 -m json.tool "$f" >/dev/null || exit 1; done && for n in release-tags release-tag-signatures main; do id=$(gh api /repos/$R/rulesets --jq ".[]|select(.name==\"$n\")|.id"); test -n "$id" || exit 1; test "$(gh api /repos/$R/rulesets/$id --jq '[.rules[].type]|sort|join(",")')" = "$(jq -r '[.rules[].type]|sort|join(",")' ".github/settings/ruleset-$n.json")" || exit 1; test "$(gh api /repos/$R/rulesets/$id --jq '[.bypass_actors[].actor_type]|sort|join(",")')" = "$(jq -r '[.bypass_actors[].actor_type]|sort|join(",")' ".github/settings/ruleset-$n.json")" || exit 1; test "$(gh api /repos/$R/rulesets/$id --jq .enforcement)" = "$(jq -r .enforcement ".github/settings/ruleset-$n.json")" || exit 1; done && test "$(gh api /repos/$R/actions/permissions --jq '[.allowed_actions,(.sha_pinning_required|tostring)]|join(",")')" = "$(jq -r '[.allowed_actions,(.sha_pinning_required|tostring)]|join(",")' .github/settings/actions-permissions.json)" && test "$(gh api /repos/$R/actions/permissions/selected-actions --jq '[.patterns_allowed[]]|sort|join(",")')" = "$(jq -r '[.patterns_allowed[]]|sort|join(",")' .github/settings/actions-selected.json)" && test "$(gh api /repos/$R/actions/permissions/workflow --jq .default_workflow_permissions)" = "$(jq -r .default_workflow_permissions .github/settings/workflow-permissions.json)" && test "$(gh api /repos/$R/actions/permissions/fork-pr-contributor-approval --jq .approval_policy)" = "$(jq -r .approval_policy .github/settings/fork-pr-approval.json)" && gh api /repos/$R/immutable-releases --jq .enabled | grep -qx true && test "$(gh api /repos/$R/environments/release --jq '[.protection_rules[]|select(.type=="required_reviewers")|.reviewers[].reviewer.id|tostring]|sort|join(",")')" = "$(jq -r '[.reviewers[].id|tostring]|sort|join(",")' .github/settings/environment-release.json)" && test "$(gh api /repos/$R/environments/release/deployment-branch-policies --jq '[.branch_policies[]|select(.type=="tag")|.name]|sort|join(",")')" = "$(jq -r '[.name]|join(",")' .github/settings/environment-release-tag-policy.json)" && gh api /repos/$R/actions/secrets --jq .total_count | grep -qx 0 && gh run list --repo $R --workflow=verify.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion' | grep -qx success && for s in 'Repository controls' 'Actions policy' 'Secrets inventory' 'Deferred signing items' 'Known red runs' 'Immutable releases' 'Toolchain pins'; do grep -q "^## $s" docs/RELEASING.md || exit 1; done && for f in .github/settings/*.json; do grep -qF "$(basename "$f")" docs/RELEASING.md || exit 1; done && for c in '--disable-maintenance-service' 'CERTIFICATE_' 'SmartScreen' 'ad-hoc' 'Open Anyway' '43AQ936H96' 'user-writable'; do grep -qF -- "$c" docs/RELEASING.md || exit 1; done && git add .github/settings docs/RELEASING.md && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>a JSON body is malformed, any of the three rulesets is absent or its live rule set, bypass-actor set or enforcement differs from its tracked body, the actions policy is not selected with SHA pinning and the tracked pattern set, the default token is not read, fork approval does not match the body, immutable releases are off, the release environment's reviewer set or tag-policy name differs from the tracked bodies, a secret exists, the latest main run under the new policy is not green, a required section is missing, a tracked body is not named in the controls table, any of the seven unsigned-posture consequences is unrecorded, or the quick gate exits non-zero; or `allowlist-doc-consistency` goes red because the concurrent v1.3 session changed .planning/ROADMAP.md or .planning/REQUIREMENTS.md, which is triaged to that session and never to this stage</fails_when>
  </verify>
  <acceptance_criteria>
    - Every control is declared in a tracked JSON body and its live state is compared against that body by derivation, not against a hand-typed expectation
    - The signature rule lives in a bypass-free ruleset, so it binds the owner
    - verify.yml reran green under allowed_actions selected with SHA pinning required
    - docs/RELEASING.md names every tracked body, the seven unsigned-posture consequences, the inventory, the known red runs, the immutable-release consequence and the toolchain pins, and names no display string
    - Quick gate green with all ten files staged
  </acceptance_criteria>
  <done>The repository's process controls exist before release.yml does, and the tree records exactly what was applied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Organisation 2FA, verified signing identity, and a planted unsigned-tag rejection</name>
  <reversibility rating="costly">Requiring 2FA removes non-compliant members from the organisation; the key registration and the local git config are reversible; the signed probe tag is outside the release pattern and the unsigned plant is never accepted by the remote.</reversibility>
  <read_first>
    - .github/settings/ruleset-release-tag-signatures.json (task 3; the bypass-free rule this task makes satisfiable and then plants against)
    - .github/settings/ruleset-release-tags.json (task 3; the pattern the plant must match)
    - docs/RELEASING.md (task 3; the pending 2FA row and the section this task appends)
    - .git/config (current absence of gpg.format, user.signingkey, tag.gpgsign)
  </read_first>
  <files>docs/RELEASING.md</files>
  <action>Operator steps: (1) On github.com, confirm two-factor authentication is enabled on the ServerDestroyer account (Settings, Password and authentication); enable it if not. (2) Settings, Emails: confirm `christopher@colantuono.us` is listed and **verified** on that account, because GitHub reports a signature as valid only when the tagger address is verified there as well as the key being registered; add and verify it if absent, or set `git config user.email` to an address that already is, and use whichever address the rest of this task and the document record. Every release tag will carry that address. (3) Organisation DeBIOS-Foundation, Settings, Authentication security: enable "Require two-factor authentication for everyone"; this is a UI-only setting (the organisation PATCH endpoint does not expose it) and it removes any member without 2FA, which today is nobody but the owner. (4) Account Settings, SSH and GPG keys, New SSH key with key type **Signing Key**, paste the contents of /home/chris/.ssh/id_ed25519.pub; an authentication-key registration of the same key does not count. (5) In the repo (local config, not global): `git config gpg.format ssh`, `git config user.signingkey /home/chris/.ssh/id_ed25519.pub` (absolute path, no tilde), `git config tag.gpgsign true`, `mkdir -p /home/chris/.config/git && printf '%s %s\n' "$(git config --get user.email)" "$(cut -d' ' -f1,2 /home/chris/.ssh/id_ed25519.pub)" >> /home/chris/.config/git/allowed_signers`, `git config gpg.ssh.allowedSignersFile /home/chris/.config/git/allowed_signers`. (6) `git tag -s signing-probe -m "SSH-signed probe tag outside the release pattern"`, `git tag -v signing-probe`, `git push origin signing-probe`. The name matches neither ruleset's pattern nor the environment policy, so no control fires and only verify.yml runs (green: the tree is post-fb90e73). (7) Plant the fault the split ruleset exists for: `git -c tag.gpgsign=false tag -a -m "unsigned release-pattern plant" v0.0.0-0` then `git push origin v0.0.0-0`. The push **must be rejected** by the release-tag-signatures ruleset. If it is instead accepted, `required_signatures` is not enforcing on tags, the SEC-01 control is not delivered: delete the remote tag with `git push origin :refs/tags/v0.0.0-0`, stop, and report; never widen a rule to get past it. Delete the local tag with `git tag -d v0.0.0-0` either way. (8) Append a **Signing setup** section to docs/RELEASING.md: the key's public fingerprint (`ssh-keygen -lf /home/chris/.ssh/id_ed25519.pub`), the tagger address every release tag will carry, the five config lines, the probe tag name and its API verification result, the planted `v0.0.0-0` rejection and the message GitHub returned, the rule that every release tag is created with `git tag -s` by the owner, and that `signing-probe` is deleted (`git push origin :refs/tags/signing-probe`) after the first release tag verifies in stage linux-release-pipeline-and-update-channel; flip the 2FA row from pending to applied with the date. Commit as docs(dist-1): signing setup, 2FA applied, unsigned-tag rejection proven. Type "approved" when the API reports the probe tag verified and the unsigned push was refused.</action>
  <verify>
    <automated>R=DeBIOS-Foundation/powerbrowser && gh api /orgs/DeBIOS-Foundation --jq .two_factor_requirement_enabled | grep -qx true && test "$(git config --get gpg.format)" = ssh && test "$(git config --get tag.gpgsign)" = true && test -r "$(git config --get user.signingkey)" && test -r "$(git config --get gpg.ssh.allowedSignersFile)" && git tag -v signing-probe >/dev/null 2>&1 && sha=$(gh api /repos/$R/git/ref/tags/signing-probe --jq .object.sha) && gh api /repos/$R/git/tags/$sha --jq '"\(.verification.verified),\(.verification.reason)"' | grep -qx 'true,valid' && { git tag -d v0.0.0-0 >/dev/null 2>&1 || true; } && git -c tag.gpgsign=false tag -a -m 'unsigned release-pattern plant' v0.0.0-0 && ! git push origin v0.0.0-0 >/dev/null 2>&1 && git tag -d v0.0.0-0 >/dev/null && grep -q '^## Signing setup' docs/RELEASING.md && grep -qF 'signing-probe' docs/RELEASING.md && grep -qF 'v0.0.0-0' docs/RELEASING.md && grep -qF "$(git config --get user.email)" docs/RELEASING.md && git add docs/RELEASING.md && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the organisation does not require 2FA, any of the four git settings is missing or points at an unreadable file, the local verification of the probe tag fails, GitHub reports the pushed probe tag unverified or with a reason other than valid, **the unsigned release-pattern tag push is accepted** (which means required_signatures is not enforcing and leaves a stray remote v0.0.0-0 the operator must delete), the document lacks the section or does not record the key, the address, the probe and the plant, or the quick gate exits non-zero; or `allowlist-doc-consistency` goes red because the concurrent v1.3 session changed .planning/ROADMAP.md or .planning/REQUIREMENTS.md, which is triaged to that session and never to this stage</fails_when>
  </verify>
  <acceptance_criteria>
    - The organisation requires 2FA and the read-back says so
    - A tag signed with the operator's key verifies locally and on GitHub with reason valid, which also proves the tagger address is verified on the account
    - An unsigned tag matching the release pattern is refused by the remote, and the assertion that proves it is re-runnable
    - The signing procedure, the tagger address, the plant result and the probe's retirement condition are recorded in docs/RELEASING.md
  </acceptance_criteria>
  <done>The release role can create a tag GitHub verifies, and cannot create one it does not</done>
  <resume-signal>Type "approved" when the probe tag shows verified on GitHub and the unsigned v0.0.0-0 push was rejected, or describe what blocked a step</resume-signal>
</task>

<task type="auto">
  <name>Register the settings-drift check so the controls stay proven after this plan</name>
  <reversibility rating="reversible">One new script and two registry rows; deleting both restores the previous driver exactly.</reversibility>
  <read_first>
    - scripts/verify-platform.sh lines 3556-3600 (the registry contract: `label|command` rows, the --quick array and what "honestly --quick" means)
    - scripts/verify-platform.sh lines 4452-4500 (the `if [ "$QUICK" -eq 0 ]` block and the RE-TIERED precedent for splitting a pair across tiers with a written reason)
    - scripts/verify-registry-shape.mjs (the derive-and-compare-as-set-equality idiom this check copies, and the shape of its --self-test)
    - .github/settings/*.json (task 3; the nine bodies this check reads)
    - docs/RELEASING.md (task 3; the read-back column this check replaces with a permanent instrument)
  </read_first>
  <files>scripts/verify-repo-controls.mjs, scripts/verify-platform.sh</files>
  <action>Write scripts/verify-repo-controls.mjs. It walks `.github/settings/*.json` off the filesystem, maps each basename to its GitHub resource, and asserts set equality in both directions between that directory and the map, so a body added without a map entry and a map entry whose body was deleted both go red naming the file. For each body it fetches the live resource with `gh api` and compares: for the three rulesets, `enforcement`, the sorted `rules[].type` set, and the sorted `bypass_actors[].actor_type` set; for the environment, the sorted required-reviewer id set and both `deployment_branch_policy` flags; for the tag policy, the sorted `{name,type}` set from the live deployment-branch-policies list; for each flat resource (`actions/permissions`, `actions/permissions/selected-actions`, `actions/permissions/workflow`, `actions/permissions/fork-pr-contributor-approval`), every key the tracked body declares, with arrays compared as sorted sets so a live addition reddens as loudly as a removal. It additionally asserts `immutable-releases.enabled` is true and that the repository holds zero Actions secrets, both stated in the header as controls with no body of their own. Every failure message names the file, the resource and the diverging field, and carries no token, no URL query and no local path (CLAUDE.md's no-internals rule applies to check output the same way it applies to shell copy). Live state is read through one `gh api` helper that a `--live-from <dir>` flag replaces with canned JSON files, which is the seam the self-test uses; the flag exists for the self-test and is documented as such.

Give it `--self-test`: it builds a mkdtemp fixture holding a copy of `.github/settings/` and a matching canned live directory, requires the unmutated control to pass first, then plants one mutation per case and requires each to go red naming the drift: a rule removed from a live ruleset, an extra `bypass_actors` entry on the live signature ruleset, `allowed_actions` widened to `all`, `sha_pinning_required` flipped to false, `immutable-releases.enabled` false, a reviewer id changed, a tracked body present with no live resource, and a live resource with no tracked body. The self-test touches no network.

Append exactly two rows to scripts/verify-platform.sh's registry. The self-test row goes in the `--quick` array with a one-line reason: it reads fixtures out of mkdtemp and needs no network, so it is honestly --quick and the fault plants run on every commit. The live row goes in the `if [ "$QUICK" -eq 0 ]` block with a one-line reason: it calls the GitHub API and needs an authenticated `gh`, which `--quick` promises not to need; it is registered in the full and `--gate` sets and reachable by `--only repo-controls`. A missing or unauthenticated `gh` is a FAIL naming the prerequisite, never a skip, because a security control that silently skips is not a control. The rows are:

    "repo-controls-self-test|node $REPO_ROOT/scripts/verify-repo-controls.mjs --self-test"   (quick array)
    "repo-controls|node $REPO_ROOT/scripts/verify-repo-controls.mjs"                          (full block)

Stage both files, run the quick gate, commit as feat(dist-1): register the repository-controls drift check.</action>
  <verify>
    <automated>grep -q 'repo-controls|node $REPO_ROOT/scripts/verify-repo-controls.mjs' scripts/verify-platform.sh && grep -q 'repo-controls-self-test|node $REPO_ROOT/scripts/verify-repo-controls.mjs --self-test' scripts/verify-platform.sh && test "$(grep -c 'verify-repo-controls.mjs' scripts/verify-platform.sh)" -ge 2 && node scripts/verify-repo-controls.mjs --self-test && scripts/verify-platform.sh --only repo-controls-self-test && scripts/verify-platform.sh --only repo-controls && git add scripts/verify-repo-controls.mjs scripts/verify-platform.sh && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>either registry row is absent or misspelled, the self-test does not go red on every planted mutation, `--only repo-controls-self-test` or `--only repo-controls` does not resolve (the label is not registered), the live comparison finds any field of any tracked body diverging from GitHub, or the quick gate exits non-zero; or `allowlist-doc-consistency` goes red because the concurrent v1.3 session changed .planning/ROADMAP.md or .planning/REQUIREMENTS.md, which is triaged to that session and never to this stage</fails_when>
  </verify>
  <acceptance_criteria>
    - One appended registry row plus its self-test row, no sibling driver
    - The expectation is derived from `.github/settings/` at check time and compared as set equality, so an added or removed body and an added or removed live field all redden
    - The self-test plants at least eight faults and requires each to go red naming the file and the field
    - `--quick` gained the network-free half only; the live half runs in the full and `--gate` sets
  </acceptance_criteria>
  <done>The tracked-JSON-to-live-settings boundary has a permanent instrument, not a one-shot read-back in an archived plan</done>
</task>

<task type="auto">
  <name>Rebase the ESR pin to FIREFOX_153_2_0esr_RELEASE and bring origin to parity</name>
  <reversibility rating="costly">Reverting is one manifest edit plus one mirror edit plus a re-run of the same script; the real cost is the tier-3 rebuild (54m) either direction.</reversibility>
  <read_first>
    - configuration.toml lines 96-108 ([upstreams] block and its comment: edit one value, regenerate, every consumer follows)
    - .github/workflows/rebase-upstream.yml lines 25-33 (the workflow_dispatch default mirror)
    - scripts/rebase-upstream.sh (whole file: tag validation, ls-remote existence check, rm -rf upstream, fetch, replay, surface check, residue scan with --extra-root, re-classify, overlay assertion, operator follow-up line)
    - scripts/verify-upstream-pins.mjs lines 10-40 (the four ESR agreement steps that must stay green)
    - docs/BUILD.md lines 770-800 (N-plus-1 prerequisites naming the version files) and 1022-1060 (rebase procedure and the 08-05 drill)
    - scripts/smoke-firefox.sh lines 8-12 and 38-46 (UPSTREAM_DIR and the hard-coded version grep)
    - scripts/toolchain-baseline.sh and toolchain-baseline.txt (three tool versions to stdout; runs inside the firefox shell)
  </read_first>
  <files>configuration.toml, .github/workflows/rebase-upstream.yml, scripts/smoke-firefox.sh, powerbrowser/packaging/version-nplus1/version.txt, powerbrowser/packaging/version-nplus1/version_display.txt, docs/BUILD.md</files>
  <action>Set configuration.toml `firefox_esr_tag` to `FIREFOX_153_2_0esr_RELEASE` and mirror the same literal into rebase-upstream.yml's input default (the pins check requires both). Regenerate inside the theia shell so generated/upstream-pins.env carries the new tag. Run `scripts/rebase-upstream.sh --tag FIREFOX_153_2_0esr_RELEASE` from the repo root: it removes upstream/, re-clones 1.1 GB at the tag, replays patches/ with the non-vacuous assertion, runs check-patch-surface, the residual-brand scan with `--extra-root upstream/`, the re-classification, and the overlay assertion, and fails by name at any of them; on any failure stop and report, never hand-edit upstream/ or a patch hunk. Run the operator follow-up the script names, from this session (no privilege needed): `nix develop .#firefox --command bash scripts/toolchain-baseline.sh | diff - toolchain-baseline.txt` must be empty; a non-empty diff is toolchain drift that needs its own decision and blocks the commit.

Replace the smoke-firefox literal with a value read at run time from `upstream/browser/config/version_display.txt` (trim whitespace, `grep -qF`) so the row derives its expectation from the tree instead of a hand-kept string. Set powerbrowser/packaging/version-nplus1/version.txt to `153.2.1` and version_display.txt to `153.2.1esr` so the test-only N-plus-1 stays strictly newer than the new N.

In docs/BUILD.md, add one dated paragraph after the 08-05 drill paragraph in "Rebase procedure and desktop install" recording that the pin moved to FIREFOX_153_2_0esr_RELEASE in this stage, that the toolchain-baseline diff was empty, that objdir/ is stale until the next tier-3 build (54m measured, packaging timings table), and that the first post-rebase build lands in stage packaged-product-correctness-linux. In the "MAR build and serve loop" prerequisites, **leave the 08-04 observed-evidence sentence intact** (it records that the task-1 rebuilt tree read `Version=153.1.0` and is a measurement, not a procedure) and add one dated successor sentence beside it stating that after this stage's pin move N is 153.2.0 and the N-plus-1 sources read 153.2.1 / 153.2.1esr; change no other recorded evidence row and no timing.

Stage the six files, run the pins check and the quick gate, then bring the remote to parity: `git push origin main`, followed by `gh run watch --repo DeBIOS-Foundation/powerbrowser --exit-status "$(gh run list --repo DeBIOS-Foundation/powerbrowser --workflow=verify.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')"`. The push is a fast-forward, which the main ruleset permits. This run is the only place `verify-upstream-pins` step 2 (manifest against workflow mirror) is exercised on GitHub at the new pin. Commit as chore(dist-1): rebase the ESR pin to FIREFOX_153_2_0esr_RELEASE before pushing. Do not run ./mach build in this stage.</action>
  <verify>
    <automated>grep -q '^firefox_esr_tag = "FIREFOX_153_2_0esr_RELEASE"' configuration.toml && grep -q 'default: FIREFOX_153_2_0esr_RELEASE' .github/workflows/rebase-upstream.yml && git -C upstream tag --points-at HEAD | grep -qx FIREFOX_153_2_0esr_RELEASE && test "$(tail -1 upstream/config/milestone.txt)" = 153.2.0 && git -C upstream diff --quiet && test "$(readlink -f upstream/powerbrowser)" = "$(pwd)/powerbrowser" && nix develop .#theia --command node scripts/generate.mjs && scripts/fetch-upstream.sh && node scripts/verify-upstream-pins.mjs && node scripts/verify-upstream-pins.mjs --self-test && ! grep -q '153\.1\.0esr' scripts/smoke-firefox.sh && grep -qF 'version_display.txt' scripts/smoke-firefox.sh && test "$(cat powerbrowser/packaging/version-nplus1/version.txt)" = 153.2.1 && test "$(cat powerbrowser/packaging/version-nplus1/version_display.txt)" = 153.2.1esr && grep -qF 'FIREFOX_153_2_0esr_RELEASE' docs/BUILD.md && grep -qF '153.2.1esr' docs/BUILD.md && grep -qF 'Version=153.1.0' docs/BUILD.md && nix develop .#firefox --command bash scripts/toolchain-baseline.sh | diff -q - toolchain-baseline.txt && git add configuration.toml .github/workflows/rebase-upstream.yml scripts/smoke-firefox.sh powerbrowser/packaging/version-nplus1/version.txt powerbrowser/packaging/version-nplus1/version_display.txt docs/BUILD.md && nix develop .#theia --command scripts/verify-platform.sh --quick && git fetch -q origin main && git merge-base --is-ancestor HEAD origin/main && gh run list --repo DeBIOS-Foundation/powerbrowser --workflow=verify.yml --branch main --commit "$(git rev-parse origin/main)" --json conclusion --jq '.[0].conclusion' | grep -qx success</automated>
    <fails_when>the manifest and the workflow mirror disagree or carry the old tag, upstream/ HEAD is not the 153_2_0 tag commit or its milestone is not 153.2.0, the worktree diff is non-empty (a patch applied outside the index or a hand edit), the overlay symlink does not resolve back to this repo, fetch-upstream's classifier does not report fully-applied at the new pin, the pins check or its self-test goes red, the smoke literal survives or the derived read is absent, the N-plus-1 files are not newer than N, docs/BUILD.md lacks the pin-move paragraph or the successor version sentence or has lost the 08-04 observed `Version=153.1.0` evidence, the toolchain baseline differs, the quick gate exits non-zero, the local head is not an ancestor of origin/main (the push did not land), or the verify.yml run for origin/main's head did not conclude success; or `allowlist-doc-consistency` goes red because the concurrent v1.3 session changed .planning/ROADMAP.md or .planning/REQUIREMENTS.md, which is triaged to that session and never to this stage</fails_when>
  </verify>
  <acceptance_criteria>
    - Manifest, workflow mirror, generated fragment and materialised upstream/ all agree on FIREFOX_153_2_0esr_RELEASE
    - Patch stack replayed non-vacuously with the surface check, residue scan and overlay assertion green
    - Toolchain baseline diff empty; smoke row derives its version; N-plus-1 test version exceeds the new N
    - BUILD.md records the pin move and the deferred tier-3 rebuild cost beside, not over, the 08-04 observed evidence
    - origin/main contains this stage's whole output and verify.yml is green on that head
  </acceptance_criteria>
  <done>The tree builds against the current ESR point release, every pin consumer follows the one manifest value, and the public remote carries the stage with CI green on it</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Local tree to origin | The pushes publish the whole local history, every `v1.*` milestone tag and this stage's own commits; from then on origin is the tree releases are cut from. |
| GitHub Actions token to repository | Workflows run with GITHUB_TOKEN; the actions policy decides which actions run and what the token may write. |
| Operator signing key to tag verification | GitHub verifies release tags against signing keys and verified addresses on the owner's account; the bypass-free ruleset refuses unverified tags for every actor. |
| Tracked JSON to live settings | Controls are declared in the tree and applied by API; drift between the two is detected only by the registered repo-controls row. |
| Mozilla remote to upstream/ | The rebase re-materialises 1.1 GB from a third-party remote at a tag name and replays the patch stack over it. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-DS1-01 | Tampering | release-pattern tag created, moved or deleted by a non-owner or by a workflow token | high | mitigate | release-tags ruleset: creation, update, deletion and non_fast_forward restricted to the OrganizationAdmin bypass; GITHUB_TOKEN is not a bypass actor. |
| T-DS1-02 | Tampering | an unsigned release-pattern tag accepted because the signature rule shares a ruleset with the owner's bypass | high | mitigate | required_signatures lives alone in release-tag-signatures.json with `bypass_actors: []`, so it binds the owner; task 4 plants an unsigned `v0.0.0-0` push and requires the remote to reject it, and the assertion is re-runnable. |
| T-DS1-03 | Tampering | main history rewritten or the branch deleted | medium | mitigate | main ruleset with an empty bypass list: deletion and non_fast_forward apply to the owner too; a pull_request rule is deferred until a second contributor exists and the deferral is written down. |
| T-DS1-04 | Elevation of privilege | a third-party action running with a writable token | medium | mitigate | allowed_actions selected (GitHub-owned, verified creators, one explicit cachix pattern), sha_pinning_required true, default_workflow_permissions read, fork PR approval all_external_contributors; verify.yml reran green under the policy. |
| T-DS1-05 | Spoofing | takeover of the sole releaser's account | high | mitigate | Organisation-wide 2FA requirement read back as true; signing key registered as a signing key and the tagger address verified, both proven by a pushed tag GitHub reports valid; the environment's required reviewer is that account. |
| T-DS1-06 | Tampering | published release assets replaced after publication | high | mitigate | Immutable releases enabled while zero releases exist; RELEASING.md tells stage linux-release-pipeline-and-update-channel to upload to a draft and publish last. |
| T-DS1-07 | Tampering | a control silently reverted after this plan is archived (a ruleset deleted, allowed_actions widened, immutable releases turned off) | high | mitigate | scripts/verify-repo-controls.mjs derives the expectation from `.github/settings/` at check time and compares live state as set equality in both directions; registered as one full-set row plus a network-free self-test row in --quick, with at least eight planted faults each required to go red naming the file and the field. |
| T-DS1-08 | Information disclosure | secrets present on a repository without controls | low | accept | Zero secrets today, inventoried and asserted zero by both task 3 and the registered check; the MAR primary key arrives in stage mar-signing-and-update-integrity as a release-environment secret with the secondary offline. |
| T-DS1-09 | Denial of service | the actions policy or a ruleset blocking the project's own workflow | low | mitigate | The policy is proven by a rerun of verify.yml before commit; tag and environment patterns exclude v1.x milestone tags and the signed probe tag by construction, and the `v0.0.0-0` plant is deleted in the same task. |
| T-DS1-SC | Tampering | upstream re-materialisation at the new tag | medium | mitigate | Tag existence checked by ls-remote before the clone, patch replay asserted non-vacuous, check-patch-surface, residual-brand scan with --extra-root over the replayed tree, re-classification, overlay assertion, toolchain-baseline diff empty; the remote is Mozilla's read-only mirror over HTTPS and no hunk is hand-edited. |
</threat_model>

<verification>
Two stale texts corrected with comparands byte-identical and generate --check green; origin/main contains fb90e73 with verify.yml green for its head and the local `v1.*` milestone tag set present on origin as set equality; nine tracked JSON bodies applied and compared field by field against live state by derivation from the bodies themselves, verify.yml green again under the restricted actions policy, zero secrets, docs/RELEASING.md naming every tracked body and all seven unsigned-posture consequences; organisation 2FA read back true, a pushed SSH-signed probe tag reported valid by GitHub, and an unsigned release-pattern tag push rejected; one appended registry row plus its network-free self-test row proving the settings-to-live boundary on every commit and every full run; manifest, workflow mirror, generated fragment and upstream/ agreeing on FIREFOX_153_2_0esr_RELEASE with the patch stack replayed, the toolchain baseline unchanged, the smoke row deriving its version, docs/BUILD.md recording the move beside its prior evidence, the quick gate green after every task, and origin/main carrying the finished stage with a green run on that head.
</verification>

<success_criteria>
The repository can be released from: the public remote is at parity with green CI at the end of the stage, every SEC-01 control is applied from a tracked body and guarded afterwards by a registered check that goes red on drift, the release role can create a tag GitHub verifies and cannot create one it does not, the tree's own texts claim only controls that exist, and the ESR pin is the current point release with the rebuild cost recorded rather than hidden.
</success_criteria>

<output>
Stage 1 slice: corrected allowlist reason and generator comment with synced comparands; origin at parity with green verify.yml both after the initial push and after the pin move; `.github/settings/` bodies for three rulesets, the release environment and its tag policy, the actions policy, workflow permissions and fork approval, applied and read back by derivation; immutable releases on; docs/RELEASING.md with the controls register naming every body, the secrets inventory, the seven unsigned-posture consequences, known red runs, the immutable-release consequence, toolchain pins and signing setup; organisation 2FA, a verified signing identity, and a proven rejection of an unsigned release-pattern tag; `repo-controls` and `repo-controls-self-test` in the one registry; ESR pin at FIREFOX_153_2_0esr_RELEASE. Stage release-identity starts from this pin and this document; stage mar-signing-and-update-integrity places the first secret in the release environment created here; stage linux-release-pipeline-and-update-channel adds release.yml on the tag pattern these two rulesets protect.
</output>
