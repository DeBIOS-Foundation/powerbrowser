---
phase: distribution-stage-8-reports-bug-error-crash
plan: "01"
type: execute
wave: 6
depends_on: ["release-identity", "linux-release-pipeline-and-update-channel"]
files_modified: [.planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md, .planning/drafts/distribution/S8-OPERATOR-RECORD.md, configuration.toml, scripts/lib/config-schema.json, scripts/generate.mjs, docs/REBRANDING.md, .github/ISSUE_TEMPLATE/bug.yml, theia/extensions/branding/package.json, theia/extensions/branding/src/browser/powerbrowser-branding-config.ts, theia/extensions/branding/src/browser/powerbrowser-report-bug-contribution.ts, theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts, theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx, theia/extensions/telemetry/src/browser/telemetry-enrichment.ts, theia/extensions/telemetry/src/browser/telemetry-error-hooks.ts, theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts, theia/extensions/telemetry/src/browser/telemetry-sender.ts, theia/applications/browser/package.json, scripts/verify-bug-report-affordance.mjs, powerbrowser/shell/powerbrowser.xhtml, powerbrowser/shell/powerbrowser.js, powerbrowser/shell/powerbrowser.css, powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/INTERNAL-APIS.md, scripts/verify-shell-error-copy.mjs, scripts/verify-manifest-literals.mjs, docs/PRIVACY.md, worker/events-worker.mjs, worker/wrangler.toml, scripts/verify-events-worker.mjs, powerbrowser/endpoint-allowlist.json, scripts/verify-telemetry.mjs, scripts/verify-telemetry-live-delivery.mjs, scripts/verify-platform.sh]
autonomous: false
requirements: [TEL-05, TEL-06, TEL-07, TEL-08]
must_haves:
  truths:
    - "A user reaches a prefilled bug report from the Help menu and the About dialog, it opens in a stock browser window with no custom chrome authored, and its target host is a manifest value rather than a literal in a .ts file"
    - "A user copies the diagnostics layer to the clipboard with one button whose label carries no internal identifier, proven by a derived scope over the shell document that did not exist before this plan"
    - "An uncaught error or unhandled rejection in the Theia frontend reaches the existing sender with message, source basename, line, column, and no enrichment outside the admitted set"
    - "Shipped telemetry level is off with a real endpoint stated, so the existing preference is a working opt-in and nothing leaves the application until a user changes it"
    - "One registry row observes a real POST at a loopback endpoint from a running sidecar, which the TEL-02 drill never did, and leaves neither the tracked application package.json nor the built frontend bundle pointing at the drill"
    - "The receiving Worker rejects oversized, malformed and over-rate submissions before it writes anything, holds no secret, and its contract is asserted by a gate that plants faults"
    - "A published privacy statement names what is sent, when, for how long, and by whom, the About dialog links it, and it passes the manifest-literal gate through a declared allowlist row rather than by avoiding the vendor name"
    - "Native crash reporting stays compiled out until the owner retires the standing exclusion in writing"
  artifacts:
    - path: ".planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md"
      provides: "GREEN/RED verdicts for the five substrate claims this stage is built on, two measured live and three read from the tree"
      contains: "P1 verdict:"
    - path: "configuration.toml"
      provides: "The issue-tracker manifest key that makes the bug-report target a rebrand input rather than a compiled literal"
      contains: "issues ="
    - path: ".github/ISSUE_TEMPLATE/bug.yml"
      provides: "GitHub issue form with the six contracted field ids"
      contains: "diagnostics"
    - path: "theia/extensions/branding/src/browser/powerbrowser-report-bug-contribution.ts"
      provides: "Report a Bug command, Help-menu entry, prefilled new-issue URL builder over the manifest-owned issues URL"
      min_lines: 70
    - path: "scripts/verify-bug-report-affordance.mjs"
      provides: "Derived agreement between the prefill parameters and the template field ids, plus origin and path agreement with the manifest key, with self-test plants"
      min_lines: 110
    - path: "powerbrowser/shell/powerbrowser.xhtml"
      provides: "Copy button on the diagnostics layer beside Close"
      contains: "powerbrowser-diagnostics-copy"
    - path: "scripts/verify-shell-error-copy.mjs"
      provides: "Shell-document copy scope: shape test over every button label and text node in powerbrowser.xhtml"
      contains: "powerbrowser.xhtml"
    - path: "docs/PRIVACY.md"
      provides: "The reviewable source for the published privacy statement: fields, trigger, 30-day retention, Cloudflare as sole processor, no account and no install id"
      min_lines: 40
    - path: "worker/events-worker.mjs"
      provides: "POST /events receiver with size caps, batch caps, field allowlist, no token"
      min_lines: 90
    - path: "worker/wrangler.toml"
      provides: "Worker deploy descriptor with the D1 binding, the route, and the pinned wrangler version in its runbook comments"
      contains: "d1_databases"
    - path: "scripts/verify-events-worker.mjs"
      provides: "Worker contract gate driving the module's fetch handler with synthetic Requests, with self-test plants"
      min_lines: 90
    - path: "theia/extensions/telemetry/src/browser/telemetry-enrichment.ts"
      provides: "The bounded enrichment set, the OS bucket, and their single derivation site, consumed by both the bug-report prefill and the error hooks"
      min_lines: 40
    - path: "theia/extensions/telemetry/src/browser/telemetry-error-hooks.ts"
      provides: "window error and unhandledrejection listeners calling sendErrorData"
      min_lines: 50
    - path: "scripts/verify-telemetry-live-delivery.mjs"
      provides: "Live loopback delivery drill plus its analyzer self-test"
      min_lines: 110
    - path: "scripts/verify-platform.sh"
      provides: "Three appended registry checks and their three self-test rows, six rows in total"
      contains: "events-worker"
  key_links:
    - from: "configuration.toml"
      to: "theia/extensions/branding/src/browser/powerbrowser-report-bug-contribution.ts"
      via: "urls.issues reaches the contribution through emitTheiaBranding's issuesUrl key and readBrandingConfig; the gate asserts the built URL's origin equals the manifest host and its path is the new-issue path"
      pattern: "issuesUrl"
    - from: "theia/extensions/branding/src/browser/powerbrowser-report-bug-contribution.ts"
      to: ".github/ISSUE_TEMPLATE/bug.yml"
      via: "the gate derives the prefill parameter names from the contribution source and the field ids from the template, and requires the first to be a subset of the second"
      pattern: "template=bug.yml"
    - from: "theia/extensions/telemetry/src/browser/telemetry-enrichment.ts"
      to: "theia/extensions/branding/src/browser/powerbrowser-report-bug-contribution.ts"
      via: "the bug prefill and the error payload read the SAME exported OS bucket across a declared workspace dependency, the idiom theia/extensions/modes/package.json already uses for @powerbrowser/tab-uris"
      pattern: "@powerbrowser/telemetry"
    - from: "theia/extensions/telemetry/src/browser/telemetry-error-hooks.ts"
      to: "theia/extensions/telemetry/src/browser/telemetry-sender.ts"
      via: "hooks call the existing sendErrorData; no second transport, no second queue, no second level read"
      pattern: "sendErrorData"
    - from: "configuration.toml"
      to: "powerbrowser/endpoint-allowlist.json"
      via: "the events host and the issues host each arrive as a hosts entry marked with its dotted manifest key, which verify-theia-endpoints step 3 asserts is neither missing nor stale"
      pattern: "telemetry.endpoint"
    - from: "scripts/verify-platform.sh"
      to: "scripts/verify-telemetry-live-delivery.mjs"
      via: "full-set row drives the live drill against a running sidecar; quick row drives the analyzer self-test over captured fixtures"
      pattern: "tel06-error-delivery-live"
    - from: "theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx"
      to: "docs/PRIVACY.md"
      via: "the dialog renders a privacy link resolved against the manifest-owned support host; the doc is the reviewable source the published page copies"
      pattern: "/privacy"
---

<objective>
Land the reports surface end to end with no new transport and no new chrome: a GitHub issue form plus a Report a Bug command whose target is a manifest key, a Copy button on the diagnostics layer, frontend error hooks feeding the sender that already exists, a public receiver at the events origin, and a published privacy statement. Native crash reporting stays behind the standing exclusion and is written as a separated sub-plan that only executes if the owner retires it.

Purpose: every other stage in this set moves bytes to users. This one is the only path back. Two of the five facts it rests on were asserted in the seed and cannot be settled by reading, so the first task measures those two, records the other three from the tree, and routes the rest.

Output: probe record with five verdicts, an issue-tracker manifest key, issue form and bug command with a derived agreement gate, diagnostics Copy button with the shell copy scope closed, events Worker with a contract gate, error hooks with bounded enrichment and a live loopback delivery row, privacy source doc and About link, operator record for the Cloudflare deployment, the two TEL-06 deferrals and the crash gate decision.

Three calls resolved here rather than left to the executor:

**The bug-report target is a new manifest key, not a literal.** `powerbrowserBranding.repoUrl` cannot carry it: `scripts/generate.mjs:1746` sets it from `installer.support_url`, which is `https://powerbrowser.org` (`configuration.toml:76`), and the compiled fallback `POWERBROWSER_REPO_URL` (`powerbrowser-welcome-widget.tsx:25`) is the same host. A builder over `repoUrl` emits `https://powerbrowser.org/issues/new`, which is not a new-issue URL. Hard-coding the repository in the `.ts` contribution would break the Phase-2 contract, because a downstream could not repoint its own issue tracker. So this plan adds `[urls].issues` with its schema entry, its emitter, its comparand, its `manifestEndpointSources` row and its allowlist entry: the same three-part shape task 5 uses for `telemetry.endpoint`.

**Worker source lives in a NEW top-level `worker/` directory in THIS repository**, not in the website repository. The receiver is the network twin of `scripts/crash-collector.mjs`, whose caps, rejection vocabulary and retention window are stated in `docs/CRASH-POLICY.md` and pinned by a gate; a gate can only compare the two when one `git ls-files` sees both. The residual-brand scan, the verify registry and code review are all scoped to this repository, so a receiver in the website repository would ship outside every gate this project owns. The website repository is one `index.html` intended for Cloudflare Pages, and a Worker is a different deploy product with a different descriptor, so it is not a Pages asset either. The privacy PAGE is a Pages asset and does belong there, which is why this plan authors `docs/PRIVACY.md` as the reviewable source and leaves publication to the operator task, the same split `docs/CRASH-POLICY.md` already uses.

**Event store is D1, not R2 NDJSON.** The only consumer is a maintainer asking which errors are recurring, which is one SQL statement against D1 and a list-plus-download-plus-parse job against R2. One `INSERT` per event is inside the free write tier for a stream that ships at level off by default. R2 stays reserved for the crash minidumps in the gated sub-plan, where the payload is binary and SQL buys nothing.
</objective>

<context>
@.planning/seeds/SEED-001-standard-distribution-updates-reports.md
@docs/CRASH-POLICY.md
@docs/BUILD.md
@configuration.toml
@powerbrowser/endpoint-allowlist.json
@theia/extensions/telemetry/src/browser/telemetry-sender.ts
@theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts
@powerbrowser/shell/powerbrowser.js
@scripts/verify-shell-error-copy.mjs

Tree state re-read on 2026-09-06, every value below from a read of this checkout:

- `powerbrowserBranding.repoUrl` is `installer.support_url` with `product.homepage` as the fallback (`scripts/generate.mjs:1746-1748`), and `configuration.toml:76` states `https://powerbrowser.org`. The only occurrence of the organisation login outside `.planning/` and `upstream/` is `README.md:97`. No manifest key names the repository, which is why task 2 adds one.
- `manifestEndpointSources` (`scripts/generate.mjs:2618-2642`) takes `telemetry.endpoint`, `urls.{release_notes,update,crash_report,homepage,search}` and `installer.support_url`. Stage release-identity adds `download`. A new `urls.issues` needs a row in that list or its host is not covered.
- `powerbrowser/endpoint-allowlist.json` holds 24 hosts and 28 prefs today; no host carries a `manifest` field and there is no `github.com` entry at any disposition. Stage release-identity marks `updates.powerbrowser.org` with `urls.update`, so by this wave step 3 of `verify-theia-endpoints.mjs` is already armed and this stage adds the second and third marked entries rather than the first.
- `scripts/generate.mjs:2471-2473` and both tracked branding pref comparands still say github.com "stays a `deny` entry"; stage prerequisites-and-hardening rewrites that text. This plan asserts the end state (`github.com` present, `allow`) rather than re-editing the comment.
- `mozillaEndpointPrefs` (`scripts/generate.mjs:2583-2600`) resolves `toolkit.telemetry.server` to `''` whenever the level is `off` **or** the endpoint is unset, so stating an endpoint at level off leaves the Gecko pref blank and the Gecko telemetry path gains nothing.
- `scripts/verify-manifest-literals.mjs` derives its literal set from the manifest at check time (multi-word forms only: the per-variant display composition, `product.vendor_display` = `DeBIOS Foundation`, `legal.trademark_notice`) and sweeps `git ls-files` minus four prefixes (`generated/`, `upstream/`, `objdir`, `.planning/`) plus three files. Its registry rows are `scripts/verify-platform.sh:3607-3608`, inside the CHECKS array the `--quick` gate runs (the `QUICK -eq 0` append begins at `:4452`). A new tracked `docs/PRIVACY.md` naming the foundation therefore reddens the quick gate unless it carries an allowlist row, and the row itself goes stale-red if the doc does not name it, so task 3 decides both together.
- `scripts/verify-shell-error-copy.mjs` (1012 lines) has no occurrence of `xhtml`. Its header at `:70-71` states plainly that "a user-facing string added at a NEW site is the known residual hole". `powerbrowser/shell/powerbrowser.xhtml` (50 lines) carries `Retry`, `Details` and `Close` under a `default-src chrome:` CSP meta at `:29`.
- `powerbrowserShowDiagnostics` (`powerbrowser/shell/powerbrowser.js:163-218`) builds its `rows` array and its `log.join("\n")` as function-local values. A Copy handler needs the same representation, so the builder is hoisted, not duplicated.
- `PowerBrowserTelemetrySender` defaults are `maxBatchSize = 20` and `flushIntervalMs = 30000` at `telemetry-sender.ts:120-121`; the POST is `{ events: [...] }` with `content-type: application/json` at `:213-215`. `readTelemetryConfig()` runs in the container-module body (`telemetry-frontend-module.ts:47-49`), so the endpoint is baked into the frontend bundle and only a rebuild moves it.
- `git ls-files theia/applications/browser` returns exactly one path, `package.json`. The built frontend bundle under `theia/applications/browser/lib` is untracked, which is why task 6 asserts on the bundle and not only on a clean `git diff`.
- `theia/extensions/branding/package.json` depends on `@theia/ai-ide` and `@theia/core` only. `theia/extensions/modes/package.json:7` declares `"@powerbrowser/tab-uris": "0.1.0"`; `theia/package.json:3-6` makes `extensions/*` workspaces, and no tsconfig uses project references, so a workspace dependency resolves through the sibling's `lib/` and that sibling must be built first.
- `theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx` is 117 lines; the existing repository link is an `<a role='button' tabIndex={0} onClick={...openNewWindow(this.repoUrl, { external: true })}>` at `:107-113` with **no href**. `scripts/verify-branding-preflight.mjs:937` rejects any `href="https?:` line in that file, and its sixteenth plant proves it. The privacy link imitates the existing call site.
- `@theia/core`'s browser `WindowService.openNewWindow(url)` compiles to `window.open(url, undefined, 'noopener')` (`theia/node_modules/@theia/core/lib/browser/window/default-window-service.js:41-44`). That is a different call from the proven `window.open(url, '_blank')` in `theia/extensions/tab-uris/src/browser/browser-window-command.ts:77`, because a non-empty features string changes how `nsWindowWatcher` shapes the new window. Nothing in this tree has observed the `openNewWindow` path opening stock chrome, which is why probe P3 exists.
- `.mozconfig:13` is `ac_add_options --disable-crashreporter`, emitted by the literal at `scripts/generate.mjs:1422`. `nix` package `wrangler` is 4.62.0 on nixos-unstable (checked 2026-09-06); it is an operator tool, not a build input, and nothing in this plan adds it to a flake shell.
- Concurrency: a v1.3 session owns `.planning/STATE.md`, `.planning/state.json`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` and everything under `.planning/phases/`. No task here writes any of those. Task 7 reads `.planning/milestones/v1.2-REQUIREMENTS.md:98` (verified: the Socorro / native-reporter row is on that line) and edits nothing there.
</context>

<tasks>

<task type="auto">
  <name>Substrate probe: two live verdicts, three read verdicts</name>
  <reversibility rating="reversible">Untracked scratch removed at closeout; the record is a decision artifact, not shipped code.</reversibility>
  <read_first>
    - powerbrowser/shell/TheiaService.sys.mjs lines 605-655 (the spawn environment block: THEIA_CONFIG_DIR, VSX_REGISTRY_URL, POWERBROWSER_SUPERVISED, POWERBROWSER_TOKEN_DISABLE, POWERBROWSER_PROFILE_DIR, and the header's standing instruction not to add a key expecting a grandchild to read it)
    - theia/extensions/token-gate/src/node/powerbrowser-env.ts (the backend capture-and-delete of every POWERBROWSER_* key at module load, which is why a frontend read would need a backend query even if a key existed)
    - powerbrowser/shell/powerbrowser.xhtml lines 27-47 (the `default-src chrome:` CSP meta and the three-layer deck the Copy button joins)
    - This stage runs in wave 6, not wave 5, for one reason: on the RED branch of probe P2 it inserts into powerbrowser/shell/PowerBrowserAPI.sys.mjs, and powerbrowser/INTERNAL-APIS.md's catalogue rows are keyed to absolute line numbers in that file, so an insertion renumbers 42 rows. Stage macos-adhoc-signed adds a TheiaService accessor row to the same table in wave 5; running after it makes the two edits sequential rather than parallel. Append the new row at the END of the table, run the renumber sweep as the last step of this stage, and run `scripts/check-internals-boundary.sh --catalogue` in the verify. A red there that names a row this stage did not add belongs to stage macos-adhoc-signed and is triaged there, never re-fixed here
    - powerbrowser/shell/PowerBrowserAPI.sys.mjs lines 235-260 (getAppIdentity, the accessor convention a clipboard helper would imitate) and powerbrowser/INTERNAL-APIS.md line 23 (the catalogue row shape a new touchpoint needs)
    - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx lines 93-117 (the existing `windowService.openNewWindow(this.repoUrl, { external: true })` call site at 111) and theia/node_modules/@theia/core/lib/browser/window/default-window-service.js lines 41-44 (`window.open(url, undefined, 'noopener')`, which is what that call actually issues)
    - theia/extensions/tab-uris/src/browser/browser-window-command.ts lines 26-86 (the proven `window.open(url, '_blank')` path, its recorded nsWindowWatcher reasoning, and the exported id constant)
    - scripts/crash-collector.mjs lines 265-275 (the annotation loop keying on part.name against ANNOTATION_ALLOWLIST) and scripts/verify-crash-collector.mjs lines 184-190 (the self-test body, which only ever posts parts named after the allowlist)
    - upstream/toolkit/crashreporter/CrashSubmit.sys.mjs line 162 and upstream/toolkit/crashreporter/client/app/src/net/report.rs lines 67-79 (both submitters send every annotation as one `extra` JSON part)
    - scripts/lib/firefox-bidi.mjs (withFirefoxPage temp-profile/finally harness)
  </read_first>
  <files>.planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md</files>
  <action>Record a one-line verdict for each of the five claims this stage was scoped on, in the order below, each followed by the verbatim evidence that produced it. Two need a live run; three are settled by reading the tree and are recorded as read-verdicts with their citations, because a live harness cannot tell you anything a direct citation does not already say and the live budget belongs to the two branches that actually change what gets written.

P1, the enrichment source. READ VERDICT. The stage scope states that version, buildID and OS are available "from the POWERBROWSER_* environment block TheiaService already passes at spawn". Quote the block: it carries a config dir, a registry URL, a supervision flag, a cleared bypass and a profile dir, and no identity value of any kind. Quote its header, which forbids adding a key expecting a grandchild to read it, and quote the backend's capture-and-delete, which means even an added key would never reach the frontend without a backend query. Record RED. It routes task 5 to derive OS in the frontend from navigator.userAgent and to admit version and buildID in the rule while shipping neither from an environment key.

P2, the clipboard mechanism. LIVE. Launch the built binary through the BiDi harness on a temp profile removed in a finally, drive the diagnostics layer open through its existing global, and call navigator.clipboard.writeText from a click handler inside the chrome document under the `default-src chrome:` CSP, reading the value back with navigator.clipboard.readText. GREEN routes task 3 to the plain DOM API with no new Firefox touchpoint. RED routes task 3 to one new PowerBrowserAPI accessor plus one INTERNAL-APIS.md catalogue row, and never to a second file importing a Firefox internal.

P3, the window path. LIVE. From the running Theia frontend, invoke windowService.openNewWindow with a URL and external true, and observe through BiDi whether a new top-level browsing context carrying that URL appears in stock chrome with its own address bar. This is not covered by the existing gui01 rows, which drive the tab-uris command's `window.open(url, '_blank')`; the service issues `window.open(url, undefined, 'noopener')`, and a non-empty features string is exactly what changes how nsWindowWatcher shapes the result. GREEN routes task 2 to the openNewWindow call the scope names. RED routes task 2 to executing the existing OPEN_BROWSER_WINDOW_COMMAND_ID with the URL, which gui01-command already proves, and adds `@powerbrowser/tab-uris` to the branding package alongside the `@powerbrowser/telemetry` dependency task 2 adds anyway.

P4, the collector defect. READ VERDICT. Quote scripts/crash-collector.mjs lines 266-272, which key the annotation loop on `part.name` against ANNOTATION_ALLOWLIST, against upstream/toolkit/crashreporter/CrashSubmit.sys.mjs:162 and upstream/toolkit/crashreporter/client/app/src/net/report.rs:67-79, which both append one part named `extra` carrying the whole annotation JSON. Quote scripts/verify-crash-collector.mjs's well-formed body, which posts parts named ProductName and Version, which is why the defect has stayed green. Record RED with the stored annotations object it implies, `{}`. The gated sub-plan starts from this citation set.

P5, the version derivation. READ VERDICT. Grep scripts/generate.mjs for a product-version derivation from `[product].revision` and `[upstreams].firefox_esr_tag`, which the release-identity stage owns and which this stage's depends_on requires to have landed. GREEN, meaning the derivation exists, routes task 5 to emit a version key into the telemetry fragment with its comparand assertion. RED routes task 5 to ship OS alone and to record version as a deferral row in task 7's operator record.

Keep every harness artifact under an untracked tmp-prefixed directory removed at closeout, stage nothing under theia, scripts, powerbrowser or worker, and write the record with the same section shape the spike records in this tree use: header block, one verdict line per claim in the form `P<n> verdict: GREEN|RED <routing sentence>`, verbatim evidence per claim, and a clean-tree proof. Commit as docs(distribution-S8): record reports substrate probe verdicts. Finish with the quick gate green.</action>
  <verify>
    <automated>git add .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md && for p in P1 P2 P3 P4 P5; do grep -qE "^${p} verdict: (GREEN|RED) " .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md || exit 1; done && grep -q 'CrashSubmit.sys.mjs' .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md && grep -q 'default-src chrome:' .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md && git -C upstream diff --quiet && test -z "$(git status --porcelain theia/ scripts/ powerbrowser/ worker/ | head -5)" && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>any verdict line is missing or malformed, the record cites neither the upstream submitter nor the shell CSP, the upstream tree is dirty, the probe staged a file under theia, scripts, powerbrowser or worker, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Five verdict lines, each naming the routing it selects for a later task in this plan
    - P2 and P3 verdicts rest on a live BiDi run against the built binary
    - P1, P4 and P5 verdicts each quote the file and line that settles them
    - Scratch removed, nothing staged outside the record, upstream diff empty
  </acceptance_criteria>
  <done>Every branch later tasks take is selected by evidence in the tree or on the wire, never by the seed's wording</done>
</task>

<task type="auto">
  <name>Issue-tracker manifest key, issue form, Report a Bug command, and the prefill agreement gate</name>
  <reversibility rating="costly">The template filename and its field ids are the addresses of the prefill URL and of every future report; renaming them breaks links already handed to users, and the manifest key becomes a documented rebrand input the moment REBRANDING.md names it.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md (P3 verdict, which selects the window path)
    - configuration.toml lines 69-88 (the [installer] comment block, the [urls] table the release-identity stage added, and the [telemetry] block task 5 rewrites)
    - scripts/lib/config-schema.json lines 104-140 (the five urls.* entries: every one type "string", required false, same https regex, with regex_help and regex_example)
    - scripts/generate.mjs lines 1740-1766 (emitTheiaBranding: rawRepo from installer.support_url, repoPath, the emitted key list) and lines 3450-3462 (the theia-branding comparand row)
    - scripts/generate.mjs lines 2618-2642 (manifestEndpointSources: the urls key list a new key joins)
    - theia/extensions/branding/src/browser/powerbrowser-branding-config.ts (whole file: the interface pair, textOrUndefined, and the one synchronous read site with per-value fallbacks)
    - theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts (whole file: the guarded rebind idiom and the bind-then-toService shape a new contribution joins)
    - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx lines 93-117 (the overridden render and the existing role='button' repo link a second button sits beside)
    - theia/extensions/tab-uris/src/browser/browser-window-command.ts lines 14-24 (Command literal shape, exported id constant so a gate looks it up rather than copying it)
    - theia/extensions/modes/package.json lines 6-12 (the in-tree precedent for a workspace dependency between two @powerbrowser extensions)
    - scripts/verify-theia-endpoints.mjs lines 1-55 (the derive-both-sides-and-compare header voice a new gate imitates)
    - scripts/verify-theia-branding.mjs lines 60-80 and 220-235 (BRANDING_BLOCK_KEY and the removed-block plant, the gate a new fragment key must keep green)
    - docs/REBRANDING.md lines 275-284 (the [urls] table a new row joins) and scripts/verify-rebranding-docs.mjs (every schema key must appear as inline code or a heading)
    - scripts/verify-platform.sh lines 4158-4186 (the paired row plus honesty comment shape to append beside)
  </read_first>
  <files>configuration.toml, scripts/lib/config-schema.json, scripts/generate.mjs, docs/REBRANDING.md, theia/applications/browser/package.json, theia/extensions/branding/src/browser/powerbrowser-branding-config.ts, .github/ISSUE_TEMPLATE/bug.yml, theia/extensions/branding/package.json, theia/extensions/branding/src/browser/powerbrowser-report-bug-contribution.ts, theia/extensions/branding/src/browser/powerbrowser-frontend-module.ts, theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx, theia/extensions/telemetry/src/browser/telemetry-enrichment.ts, powerbrowser/endpoint-allowlist.json, scripts/verify-bug-report-affordance.mjs, scripts/verify-platform.sh</files>
  <action>Manifest first, because without it the command has nowhere to point. Add `issues` to the `[urls]` table stating the public repository root, with a comment in the manifest's voice naming what it reaches: the in-app Report a Bug affordance and nothing else. Add `urls.issues` to scripts/lib/config-schema.json as type "string", required false, with the same https regex, regex_help and regex_example its five siblings carry. Add `issues` to manifestEndpointSources' urls key list so the host is covered like every other stated URL. Extend emitTheiaBranding with an `issuesUrl` key derived through assertEmittable exactly as repoUrl is, null when the key is unset, and extend the PowerBrowserBrandingConfig and PowerBrowserBranding interfaces and readBrandingConfig with the matching field through textOrUndefined. Regenerate and copy the powerbrowserBranding block surgically into theia/applications/browser/package.json's theia.frontend.config, that key only, leaving every sibling key byte-identical. Add one row to docs/REBRANDING.md's [urls] table naming what urls.issues reaches, because verify-rebranding-docs requires every schema key to appear.

Add the events-independent half of the enrichment module now, in the telemetry extension, because the prefill needs an OS value and there must be exactly one derivation of it. Write theia/extensions/telemetry/src/browser/telemetry-enrichment.ts exporting the admitted key set and an OS bucket derived from navigator.userAgent, one of the three platform names plus a fallback, with the reason stated in the header: P1 established that the spawn environment carries no identity value and that the backend deletes every POWERBROWSER_* key at module load, so a frontend-side derivation is the only one available and a second copy of it in the branding extension would let the bug report and the error payload disagree about the same machine. Declare `"@powerbrowser/telemetry": "0.1.0"` in theia/extensions/branding/package.json, the way theia/extensions/modes/package.json already declares `@powerbrowser/tab-uris`; there are no tsconfig project references in this tree, so telemetry builds before branding.

Write the issue form with exactly the six contracted field ids: version, os, steps, expected, actual, diagnostics. Field labels and descriptions are user-facing copy and carry no pref key, port, timeout, sentinel name or raw exception text; the diagnostics field's description tells the user to press the Copy button on the details view and paste, which is the affordance task 3 lands, and states that the pasted block contains file paths and process identifiers so a user who does not want them public can trim it. Mark version, steps and actual required and leave the rest optional; a report missing the optional fields is still a report.

Write the Report a Bug contribution in the branding extension as a CommandContribution plus a MenuContribution registering into CommonMenus.HELP. Export the command id and the URL builder as named constants so the gate looks them up rather than keeping copies. The builder takes the issues URL from the branding runtime config with a compiled fallback, appends the new-issue path with `template=bug.yml`, and prefills only parameters whose names are template field ids, with the os value from the enrichment module's exported bucket. Route the open through the path P3 selected: the windowService.openNewWindow(url, { external: true }) call on GREEN, or executeCommand against the tab-uris open-browser-window id on RED with that workspace dependency added alongside the telemetry one. Author no chrome of any kind, no toolbar and no address bar; the stock window is the target, not a surface this plan builds.

Add one Report a Bug button to the About dialog beside the existing repository link, invoking the same command through the command registry so the two entry points cannot drift, rendered with the same role='button' onClick pattern the repository link uses and never as a literal href, which verify-branding-preflight rejects in that file.

Settle the github.com allowlist row here rather than depending on a stage whose reason would not cover this path. The linux-release-pipeline-and-update-channel stage adds the host for MAR asset downloads from a layer-3 observation and lands before this wave, so the entry is expected to be present: EXTEND it, preserving that updater-observation reason verbatim alongside the new bug-report path and adding `"manifest": "urls.issues"`. The two reasons are cumulative on one row, never alternatives, and deleting or rewriting the updater half is the drift this instruction exists to prevent. If the entry is genuinely absent, add it with disposition allow and both reasons written out. Either way the file keeps one entry per host, so it stays one source of truth. This is the second and third marked entry in the file, not the first: the release-identity stage already marked updates.powerbrowser.org with urls.update.

Write the gate to derive both sides at check time and compare, never to keep a list. It parses the template's `id:` values into a set, parses the contribution source for the query parameter names its builder appends, and fails when a prefill parameter names no field id, because GitHub silently drops an unknown parameter and the prefill would appear to work while doing nothing. It resolves the manifest's urls.issues through the generator's own resolver and fails when the builder's base does not carry that origin or does not end in the new-issue path, which is the failure a parameter-only comparison cannot see. It also fails on a duplicated or empty field id, on a template with zero ids, on a contribution with zero derived parameters, when the exported command id string is absent from the module that binds it, and when either derivation is empty. Give it a self-test that runs the unmutated control green first, then plants a renamed template id, a renamed prefill parameter, a duplicated id, an emptied template and a builder base repointed off the manifest host, and requires each to go red naming the drift.

Stage every file before any scan, build the telemetry then the branding extension in the Nix theia shell, append the two registry rows with an honesty comment saying what they assert that no row above them does, and commit as feat(distribution-S8): issue tracker key, bug report template, command and prefill agreement gate. Finish with the quick gate green.</action>
  <verify>
    <automated>git add configuration.toml scripts/lib/config-schema.json scripts/generate.mjs docs/REBRANDING.md theia/applications/browser/package.json .github/ISSUE_TEMPLATE/bug.yml theia/extensions/branding theia/extensions/telemetry powerbrowser/endpoint-allowlist.json scripts/verify-bug-report-affordance.mjs scripts/verify-platform.sh && nix develop .#theia --command node scripts/generate.mjs && nix develop .#theia --command node scripts/generate.mjs --check && nix develop .#theia --command bash -c "cd theia/extensions/telemetry && yarn build" && nix develop .#theia --command bash -c "cd theia/extensions/branding && yarn build" && node --check scripts/verify-bug-report-affordance.mjs && node scripts/verify-bug-report-affordance.mjs && node scripts/verify-bug-report-affordance.mjs --self-test && scripts/verify-platform.sh --only bug-report-affordance && scripts/verify-platform.sh --only bug-report-affordance-self-test && scripts/verify-platform.sh --only theia-branding && scripts/verify-platform.sh --only theia-endpoints && node scripts/verify-rebranding-docs.mjs && node -e "const a=require('./powerbrowser/endpoint-allowlist.json');const g=a.hosts.find(h=>h.host==='github.com');process.exit(g&&g.disposition==='allow'&&g.manifest==='urls.issues'?0:1)" && node scripts/scan-brand-residue.mjs && node scripts/verify-manifest-literals.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the generated tree disagrees with the manifest, either extension fails to compile, a prefill parameter names no template field, the builder's base does not carry the manifest origin and the new-issue path, any planted fault fails to go red naming the drift, github.com is absent, is not an allow entry marked for urls.issues, appears more than once, or lost the updater-observation reason the linux-release-pipeline-and-update-channel stage wrote, the residual-brand or manifest-literal scan reports an occurrence, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - urls.issues exists with schema entry, emitter, comparand, endpoint-source row and REBRANDING row, so the issue tracker is a rebrand input and no repository literal lives in a .ts file
    - Template carries exactly the six contracted ids and no label naming an internal identifier
    - Command reaches the stock window through the path the P3 verdict selected, with no chrome authored
    - Help menu and About dialog invoke one command id, and the os value comes from the one enrichment module
    - Gate derives ids, parameters and the manifest origin from the tree and reddens on five plants with the control green first
  </acceptance_criteria>
  <done>A user can file a prefilled report from inside the product, and a downstream can repoint it with a manifest edit</done>
</task>

<task type="auto">
  <name>Diagnostics Copy button, shell copy scope, and the privacy source</name>
  <reversibility rating="reversible">One button, one derived scope in an existing gate, one document and one allowlist row; each is removable without touching a stored format.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md (P2 verdict, which selects the clipboard mechanism)
    - powerbrowser/shell/powerbrowser.js lines 150-235 (powerbrowserShowDiagnostics: the function-local rows array, the log join, the toggle, and the sentinel written on every call)
    - powerbrowser/shell/powerbrowser.xhtml lines 34-48 (the deck, the existing Close and Details buttons)
    - powerbrowser/shell/powerbrowser.css lines 117-212 (the diagnostics block, the Close button rule and the shared focus-visible rule a third button joins)
    - scripts/verify-shell-error-copy.mjs lines 1-80 (the header contract and the stated residual hole at 70-71), lines 520-680 (the modes and widget scopes, deriveModesCopyRaw, deriveWidgetCopy and their zero-derivation guards)
    - scripts/verify-manifest-literals.mjs lines 100-145 (EXCLUDED_PREFIXES, EXCLUDED_FILES and the ALLOWLIST table keyed by slot plus file, with the stale-entry rule)
    - docs/CRASH-POLICY.md (the reviewable-source idiom and voice a privacy document imitates, including its retention and caps paragraphs)
    - theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx lines 107-113 (the role='button' link render site the privacy link sits beside) and scripts/verify-branding-preflight.mjs line 937 (the literal-href rejection that binds this file)
  </read_first>
  <files>powerbrowser/shell/powerbrowser.xhtml, powerbrowser/shell/powerbrowser.js, powerbrowser/shell/powerbrowser.css, powerbrowser/shell/PowerBrowserAPI.sys.mjs, powerbrowser/INTERNAL-APIS.md, scripts/verify-shell-error-copy.mjs, scripts/verify-manifest-literals.mjs, docs/PRIVACY.md, theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx</files>
  <action>Add one button with id powerbrowser-diagnostics-copy beside the existing Close button, labelled Copy, styled by extending the existing Close button rule and the shared focus-visible rule rather than by writing a third block. Hoist the rows array and the log join out of powerbrowserShowDiagnostics into one named snapshot builder that both the show global and the copy handler call, so there is exactly one representation of the diagnostics content and a field added to the rows appears in the copy without a second edit. Write the clipboard through the mechanism the P2 verdict selected: navigator.clipboard.writeText directly on GREEN, or one new PowerBrowserAPI accessor with its INTERNAL-APIS.md catalogue row on RED, and under no circumstances a second file importing a Firefox internal. On a rejected write, leave the layer open and append no new user-facing sentence; the failure is a diagnostic, and inventing copy here would ship a string outside every copy gate.

State plainly in the file header that the copied PAYLOAD is diagnostics and deliberately carries internal identifiers, that this is the whole reason the diagnostics layer exists, and that the no-internal-identifier rule binds the button's LABEL and nothing else. Without that note the next reader treats the payload as a leak and removes the feature.

Close the standing hole in the copy gate rather than exempting the new label. The gate's own header states at lines 70-71 that a user-facing string added at a new site is the known residual hole; this is that site. Add a shell-document scope to scripts/verify-shell-error-copy.mjs that derives every button label and every text node from powerbrowser/shell/powerbrowser.xhtml and applies the same shape tests the other scopes use: an all-caps underscored token of four or more characters and a dotted key of three or more segments are both red. Derive the set, keep no expected list, and fail distinctly when the derivation is empty, the way deriveModesCopyRaw and deriveWidgetCopy already do, so a regex that matches nothing cannot pass. Extend the self-test with a planted label carrying a pref key, a planted label carrying an all-caps sentinel, and an emptied document, each required to go red naming the drift with the control green first.

Write docs/PRIVACY.md as the reviewable source the published page copies, in the CRASH-POLICY voice: what is sent (message text, source file basename, line, column, and the admitted enrichment set), when it is sent (only after a user changes the telemetry preference away from off, which is the shipped default), what is never sent (no account, no install identifier, no cookie, no page URL, no stack), where it goes (the events origin, a Cloudflare Worker writing to Cloudflare D1), how long it is kept (30 days, matching the collector's retention constant so the two policies cannot state different numbers), who processes it (Cloudflare only, no third-party analytics processor), and how a user turns it off again. Name the data controller by the manifest's vendor display form, because a privacy statement that will not say who is responsible is not one, and add the matching `{ slot: 'product.vendor_display', file: 'docs/PRIVACY.md' }` row to scripts/verify-manifest-literals.mjs's ALLOWLIST in the same commit with a one-line reason. That table fails a stale entry whose file carries no occurrence of the slot value, so the row and the sentence are decided together or not at all. State that bug reports are separate, are written by the user, and go to a public repository.

Add the privacy link to the About dialog beside the repository link, resolved as the `/privacy` path against the branding runtime config's repository URL with the compiled constant as the boot fallback, rendered through the same role='button' onClick pattern the repository link uses. Do not render it as an href: the existing link in this file carries none, and scripts/verify-branding-preflight.mjs rejects a literal href line here by name.

Stage every file before any scan and commit as feat(distribution-S8): diagnostics copy, shell copy scope and privacy source. Finish with the quick gate green.</action>
  <verify>
    <automated>git add powerbrowser/shell/powerbrowser.xhtml powerbrowser/shell/powerbrowser.js powerbrowser/shell/powerbrowser.css powerbrowser/shell/PowerBrowserAPI.sys.mjs powerbrowser/INTERNAL-APIS.md scripts/verify-shell-error-copy.mjs scripts/verify-manifest-literals.mjs docs/PRIVACY.md theia/extensions/branding/src/browser/powerbrowser-about-dialog.tsx && grep -q 'powerbrowser-diagnostics-copy' powerbrowser/shell/powerbrowser.xhtml && grep -q 'powerbrowser.xhtml' scripts/verify-shell-error-copy.mjs && node scripts/verify-shell-error-copy.mjs && node scripts/verify-shell-error-copy.mjs --self-test && scripts/verify-platform.sh --only shell-error-copy-no-internals && scripts/verify-platform.sh --only shell-error-copy-no-internals-self-test && bash scripts/check-internals-boundary.sh && bash scripts/check-internals-boundary.sh --catalogue && node scripts/verify-manifest-literals.mjs && node scripts/verify-manifest-literals.mjs --self-test && node scripts/verify-branding-preflight.mjs && nix develop .#theia --command bash -c "cd theia/extensions/branding && yarn build" && node scripts/scan-brand-residue.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the copy gate carries no shell-document scope, that scope passes a planted label carrying a pref key or an all-caps sentinel, the derivation is empty, the internals boundary or catalogue rejects a new touchpoint (a catalogue red naming a row this stage did not add is stage macos-adhoc-signed's renumber and is triaged there), the manifest-literal gate reddens on the privacy document or on a stale allowlist row, the branding preflight rejects the new link, the branding extension fails to compile, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Copy button and the layer render from one hoisted snapshot builder, not two copies
    - Copy label passes the shape test through a derived shell-document scope the gate did not have before, asserted by name in the verify
    - Any new privileged touchpoint went through the one boundary file with a catalogue row, or none was added
    - Privacy source states fields, trigger, retention, processor and the off switch, names the controller, and carries its manifest-literal allowlist row
  </acceptance_criteria>
  <done>A user hands a maintainer a complete diagnostics block in one gesture, and can read what the product sends before enabling anything</done>
</task>

<task type="auto">
  <name>Events Worker and its contract gate</name>
  <reversibility rating="costly">The route, the request shape and the D1 table are the public contract of a client already in users' hands; changing them after the first release strands every deployed build.</reversibility>
  <read_first>
    - scripts/crash-collector.mjs lines 44-90 (the contract-constants block: SUBMIT_PATH, the rejection vocabulary with its status discipline, THROTTLE_* , MAX_PARTS/MAX_PART_MIB/MAX_BODY_MIB, RETENTION_DAYS, MAX_ANNOTATION_BYTES, and the zero-dependency rule that makes a pure surface importable under plain node)
    - scripts/crash-collector.mjs lines 245-292 (handleSubmit: validate, throttle, allowlist, store, sweep, respond, in that order)
    - scripts/verify-crash-collector.mjs (the contract gate's shape: import the constants, drive the pure surface, plant one fault per rule)
    - docs/CRASH-POLICY.md (the caps and vocabulary the events receiver states in its own terms rather than copying)
    - theia/extensions/telemetry/src/browser/telemetry-sender.ts lines 118-128 (maxBatchSize 20 and flushIntervalMs 30000) and lines 203-220 (the exact POST the receiver must accept: JSON body `{ events: [...] }`, content-type application/json)
    - docs/PRIVACY.md (task 3: the retention window and field list the Worker must not exceed)
  </read_first>
  <files>worker/events-worker.mjs, worker/wrangler.toml, scripts/verify-events-worker.mjs, scripts/verify-platform.sh</files>
  <action>Write the receiver as one ES module exporting a default object with a fetch handler, using only the Workers runtime globals Request, Response, URL and the D1 binding. Import nothing: a Workers module cannot load node built-ins, and the gate must be able to import this file under plain node with no install, which is the same property that makes the crash collector testable.

Accept POST on the events path only; every other method and path is 404 with no body detail. Validate before reading: reject a content type that is not application/json, a Content-Length above the body cap, a body that does not parse, a body whose top level is not an object with an events array, an events array longer than the batch cap, and any event that is not an object with a string kind, a string name and a numeric at. Reject with a fixed vocabulary of short reasons and the same status discipline the collector uses: malformed shapes are 400, over-cap bodies are 413, and an over-rate request is answered 200 with a discard reason so a public client treats it as a soft no and does not retry into a queue. Drop, never store, any event property outside the admitted set; the receiver enforces the same upper bound the client enforces, because a client is not a trust boundary. Truncate each stored string at a stated length so a single large message cannot fill a row. Write one D1 row per event with a server-assigned received time and no client-supplied identifier of any kind. Hold no credential and read no configured key: a public client cannot keep one, and a credential that ships in a bundle is a credential everyone has. State in the header that abuse control is a Cloudflare rate-limiting rule on the route, configured by the operator task, plus the in-Worker caps, and that the Worker is deliberately not the only line.

Write the deploy descriptor with the D1 binding, the route for the events origin, the compatibility date, and no configured key. Put the deploy runbook in the descriptor's own comments, naming the pinned tool version, wrangler 4.62.0 on nixos-unstable as checked on 2026-09-06: create the database, apply the one-table schema, deploy, add the rate-limiting rule, verify with one synthetic POST. Do not add wrangler to either flake shell; it is an operator tool run once per deploy through `nix run nixpkgs#wrangler`, not a build input, and adding it would put a Node toolchain of a different vintage next to the pinned one.

Write the gate to import the module and drive its fetch handler with synthetic Requests and a stub D1 binding that records what it was asked to write. Assert the accepted path writes exactly one row per admitted event with no client identifier and no property outside the admitted set, and assert one planted fault per rule: wrong method, wrong path, wrong content type, unparseable body, wrong top-level shape, over-cap batch, over-cap body, an event carrying an extra property, an over-length string, and an over-rate sequence. Require the unmutated control green first in every half. Assert the caps and the retention window the Worker states equal the values docs/PRIVACY.md states, deriving both sides so a doc edit and a code edit cannot drift apart, and fail distinctly when either derivation is empty.

The credential assertion is a shape test over assignments, not a word ban: the header is required to say the Worker holds no credential, so a check that greps for the word would fail the correct implementation. Match a credential-shaped identifier followed by an assignment on a line that has not yet reached a comment marker, which is what the verify below does.

Stage every file before any scan, append the two registry rows with an honesty comment naming what they assert that no row above them does, and commit as feat(distribution-S8): events worker and contract gate. Finish with the quick gate green.</action>
  <verify>
    <automated>git add worker/events-worker.mjs worker/wrangler.toml scripts/verify-events-worker.mjs scripts/verify-platform.sh && node --check worker/events-worker.mjs && node --check scripts/verify-events-worker.mjs && node scripts/verify-events-worker.mjs && node scripts/verify-events-worker.mjs --self-test && scripts/verify-platform.sh --only events-worker && scripts/verify-platform.sh --only events-worker-self-test && ! grep -rnE '^[^/#]*\b([Aa][Pp][Ii][_-]?[Kk][Ee][Yy]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Tt][Oo][Kk][Ee][Nn]|[Bb][Ee][Aa][Rr][Ee][Rr]|[Aa][Uu][Tt][Hh][Oo][Rr][Ii][Zz][Aa][Tt][Ii][Oo][Nn])\b[[:space:]]*[:=]' worker/ && grep -q '4.62.0' worker/wrangler.toml && node scripts/scan-brand-residue.mjs && node scripts/verify-manifest-literals.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the module does not parse, any planted fault is accepted, a stored row carries a client identifier or an unadmitted property, the caps disagree with the privacy source, a credential-shaped assignment appears on a non-comment line under worker/, the descriptor does not pin the tool version, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Receiver validates shape and size before it reads or writes anything
    - Admitted event property set is enforced server side, not trusted from the client
    - No credential and no client-supplied identifier anywhere in the module or descriptor, asserted as an assignment shape so the header may state the design in words
    - Gate plants one fault per rule with the control green first, and derives the caps from both the code and the privacy source
  </acceptance_criteria>
  <done>The endpoint the next task points a shipped build at exists, is bounded, and is asserted by a check that can go red</done>
</task>

<task type="auto">
  <name>Frontend error hooks, bounded enrichment, stated endpoint and allowlist row</name>
  <reversibility rating="costly">The manifest endpoint and its allowlist row are the shipped outbound surface; the enrichment set is a privacy commitment stated in a published document.</reversibility>
  <read_first>
    - .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md (P1 and P5 verdicts, which select the enrichment sources)
    - theia/extensions/telemetry/src/browser/telemetry-enrichment.ts (task 2: the OS bucket and the admitted key set this task completes)
    - theia/extensions/telemetry/src/browser/telemetry-sender.ts lines 19-25 (the WHAT IT NEVER DOES paragraph, the rule this task amends, and the stated reason stacks are excluded) and line 147 (sendErrorData's signature)
    - theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts (whole file: readTelemetryConfig, the fail-closed fallback, and the dynamic-value sender bind a listener contribution joins)
    - theia/extensions/telemetry/src/browser/telemetry-preferences.ts lines 27-47 (the level preference this endpoint turns into a working opt-in, and its four enum descriptions, one of which already promises uncaught errors)
    - configuration.toml lines 78-88 (the [telemetry] comment block that states endpoint is deliberately unset, which this task rewrites)
    - scripts/generate.mjs lines 1995-2016 (emitTheiaTelemetry) and lines 2583-2600 (mozillaEndpointPrefs: toolkit.telemetry.server resolves to the empty string whenever level is off, so a stated endpoint at level off leaves the Gecko pref blank)
    - scripts/verify-theia-endpoints.mjs lines 141-167 (steps 2 and 3, the coverage and stale-marking checks a marked entry arms)
    - powerbrowser/endpoint-allowlist.json (the reason-writing voice, and the marked entries the release-identity stage and task 2 have already added)
  </read_first>
  <files>theia/extensions/telemetry/src/browser/telemetry-enrichment.ts, theia/extensions/telemetry/src/browser/telemetry-error-hooks.ts, theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts, theia/extensions/telemetry/src/browser/telemetry-sender.ts, theia/applications/browser/package.json, configuration.toml, scripts/generate.mjs, powerbrowser/endpoint-allowlist.json, scripts/verify-telemetry.mjs, scripts/verify-platform.sh</files>
  <action>Complete the enrichment module task 2 opened so it is the one derivation site for every field the sender is now allowed to add, exporting the admitted key set and the function that produces the values. The OS bucket already lands there. Ship version through the telemetry fragment when P5 was GREEN, adding the key to emitTheiaTelemetry, the comparand assertion to the telemetry gate and the surgical copy into the application package.json block; omit it when P5 was RED and record it as a deferral row in task 7's operator record. Never ship buildID in this plan: it is admitted by the rule so the field is reserved, and it needs a backend query the frontend does not have, which is also recorded as a deferral row.

Amend the sender's never-enriches paragraph in place to state the new rule exactly: the sender adds nothing, and the error hook adds at most the three admitted keys and never a stack, a page URL, a cookie, an account or an install identifier. Amend the rule, do not delete it; a deleted rule is an unbounded one.

Write the error hooks as a FrontendApplicationContribution that registers window error and unhandledrejection listeners on start and removes them on stop. Each listener calls the existing sendErrorData with the message and a data object of source basename, line, column and the enrichment fields. Take the basename only, never the path: a full path is the identifier class this whole rule exists to keep out. Every listener body is wrapped so a telemetry path can never throw into the page, matching the convention every other method in this extension already follows, and neither listener calls preventDefault, so the console still receives what it always received. Add no second transport, no second queue and no second level read; the sender's per-event live level read is the enforcement point and stays the only one.

Set the manifest [telemetry] endpoint to the events origin the Worker serves, keep level off, and rewrite the comment block that currently says the endpoint is deliberately unset so it says what is now true: the level is the opt-in, the endpoint is stated so the preference has somewhere to send when a user turns it on, and nothing leaves the application at the shipped level. Regenerate and copy the powerbrowserTelemetry fragment surgically into the application package.json block. Confirm through the endpoints gate that `toolkit.telemetry.server` is still emitted blank, because mozillaEndpointPrefs blanks it whenever the level is off regardless of the endpoint, so the Gecko telemetry path gains nothing from this change.

Add the events host to the allowlist in the same commit, with disposition allow, a hand-written reason derived from what this plan actually does rather than from a plan document, and the `manifest` field naming the dotted key `telemetry.endpoint`. Do not touch the github.com entry: task 2 settled it.

Extend the telemetry gate to assert the enrichment upper bound by deriving the keys the enrichment module produces and requiring the set to be a subset of the admitted set, to require the error hooks to reach the sender through sendErrorData and not through a second path, and to fail distinctly on an empty derivation. Extend its self-test with a planted extra enrichment key, a planted stack field, a planted direct fetch in the hooks and a planted level bypass, each required to go red naming the drift with the control green first.

Stage every file before any scan and commit as feat(distribution-S8): frontend error hooks with bounded enrichment and stated endpoint. Finish with the quick gate green.</action>
  <verify>
    <automated>git add theia/extensions/telemetry configuration.toml scripts/generate.mjs powerbrowser/endpoint-allowlist.json theia/applications/browser/package.json scripts/verify-telemetry.mjs scripts/verify-platform.sh && nix develop .#theia --command node scripts/generate.mjs && nix develop .#theia --command node scripts/generate.mjs --check && scripts/verify-platform.sh --only generate-check && nix develop .#theia --command bash -c "cd theia/extensions/telemetry && yarn build" && node scripts/verify-telemetry.mjs && node scripts/verify-telemetry.mjs --self-test && scripts/verify-platform.sh --only telemetry && scripts/verify-platform.sh --only telemetry-self-test && scripts/verify-platform.sh --only theia-endpoints && scripts/verify-platform.sh --only theia-endpoints-self-test && node -e "const a=require('./powerbrowser/endpoint-allowlist.json');process.exit(a.hosts.some(h=>h.manifest==='telemetry.endpoint'&&h.disposition==='allow')?0:1)" && node -e "const a=require('./powerbrowser/endpoint-allowlist.json');const p=a.prefs.find(x=>x.name==='toolkit.telemetry.server');process.exit(p&&p.expect===''?0:1)" && node scripts/scan-brand-residue.mjs && node scripts/verify-manifest-literals.mjs && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the generated tree disagrees with the manifest, the enrichment set exceeds the admitted keys, a hook reaches the network without the sender, the events host is missing or unmarked in the allowlist, the Gecko telemetry server pref is no longer blank, any planted fault fails to go red, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Both listeners registered on start and removed on stop, neither able to throw into the page
    - Data carries message, source basename, line, column and at most the admitted enrichment keys, never a stack or a full path
    - Shipped level stays off with a real endpoint stated, and the Gecko telemetry pref stays blank
    - Allowlist row carries the dotted manifest key, and version and buildID are either shipped or recorded as deferrals
  </acceptance_criteria>
  <done>The sender that has never had a producer has one, bounded by a rule a gate enforces</done>
</task>

<task type="auto">
  <name>Live loopback delivery drill</name>
  <reversibility rating="reversible">A check and its registry rows; removable without touching shipped code.</reversibility>
  <read_first>
    - scripts/lib/firefox-bidi.mjs (withFirefoxPage, the free-port helper, and the finally that always kills the process and removes the profile)
    - scripts/verify-platform.sh lines 4452-4600 (the full-set append block, the rows that launch the built binary, and the comment voice explaining why each is not quick)
    - theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts lines 33-49 (the construction-time endpoint read out of FrontendApplicationConfigProvider, which is why the drill must rebuild the frontend bundle rather than set a preference)
    - theia/applications/browser/package.json (the theia.frontend.config block the drill mutates and restores; `git ls-files theia/applications/browser` returns this one path, so the built bundle beside it is untracked and a clean git diff proves nothing about it)
    - theia/extensions/telemetry/src/browser/telemetry-preferences.ts (the level preference the drill writes into the drill config directory to arm the sender)
    - theia/extensions/telemetry/src/browser/telemetry-sender.ts lines 118-128 (batch size 20 and flush interval 30000, which set the drill's wait budget)
  </read_first>
  <files>scripts/verify-telemetry-live-delivery.mjs, scripts/verify-platform.sh</files>
  <action>Write the drill that proves what the TEL-02 unit suite could not: that a real uncaught error in a running frontend produces a real POST on a real socket.

Bind a loopback HTTP server on a free port that records every request it receives and answers 200. Its path carries the fixed marker segment `pb-drill-events`, which exists so the restore can be proven rather than assumed. Point the frontend at that origin by writing it into the application package.json frontend config, rebuilding only the frontend bundle inside the Nix theia shell, and restoring the file in a finally that runs on success, on a thrown assertion and on interrupt. State in the header why the rebuild is unavoidable: the sender fixes its endpoint at construction from the frontend config, which is baked into the bundle, so a preference or an environment variable cannot move it. Arm the level by writing the telemetry level preference into the drill's own config directory, which the sender reads live per event, so the level needs no rebuild.

The same finally rebuilds the bundle a second time from the restored file. This is the half a git diff cannot see: the tracked package.json is one path and the built bundle beside it is untracked, so restoring only the source would leave every later launch-based row, and every developer run of the sidecar, pointing at a port that closed when this drill exited. The verify below greps the built bundle for the marker segment and requires zero occurrences.

Launch the built binary through the BiDi harness on a temporary profile removed in the same finally, wait for the frontend, throw an uncaught error and reject an unhandled promise from page script, force a flush by exceeding the batch size or by waiting past the flush interval, whichever the drill's budget allows, and assert on what the server received: at least one POST, content type application/json, a parseable body whose events array carries both events with the message, the source basename, a numeric line and column, and no key outside the admitted enrichment set. Assert that no event carries a stack, a full path or a page URL, deriving the admitted key set from the enrichment module rather than keeping a copy.

Add the negative half in the same run and only in the same run: repeat with the level set to off and require zero requests within the same budget. That is an absence assertion, and it is admissible only because the positive half in the same run already proved the emitter fires and the socket receives; state that reasoning in the header so nobody later keeps the negative half after deleting the positive one.

Split the file so the analyzer is a pure function over a captured request list and the drill is the launcher around it. Give the analyzer a self-test that plants a missing POST, an event carrying a stack, an event carrying an unadmitted key, an event carrying a full path instead of a basename, and an empty capture, each required to go red naming the drift with the control green first. Register the drill in the full set with an honesty comment saying it needs a built binary and two frontend rebuilds and is emphatically not quick, and register the analyzer self-test in the quick set beside it.

Stage both files and commit as feat(distribution-S8): live loopback error delivery drill. Finish with the drill green, the self-test green, and the quick gate green.</action>
  <verify>
    <automated>git add scripts/verify-telemetry-live-delivery.mjs scripts/verify-platform.sh && node --check scripts/verify-telemetry-live-delivery.mjs && node scripts/verify-telemetry-live-delivery.mjs --self-test && scripts/verify-platform.sh --only tel06-error-delivery-live-self-test && scripts/verify-platform.sh --only tel06-error-delivery-live && git diff --quiet theia/applications/browser/package.json && test -d theia/applications/browser/lib && ! grep -rq 'pb-drill-events' theia/applications/browser/lib && scripts/verify-platform.sh --only telemetry && git -C upstream diff --quiet && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>no POST is observed at level error, any observed event carries a stack, a full path or an unadmitted key, any request arrives at level off, the drill leaves the tracked application package.json mutated, the rebuilt frontend bundle still carries the drill marker, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Positive half observes a real POST from a real launch with the contracted body shape
    - Negative half runs only alongside the positive half, with the reason stated in the header
    - Analyzer derives the admitted key set from the enrichment module and reddens on five plants
    - Both the tracked source and the untracked built bundle are restored on every exit path, the second proven by a marker grep rather than by a git diff
  </acceptance_criteria>
  <done>The delivery claim that was only ever asserted against a stub is now asserted against a socket</done>
</task>

<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Operator: events origin, receiver deploy, rate limiting, privacy page, deferrals and the crash-reporter gate decision</name>
  <reversibility rating="dangerous">A published DNS name and a live receiver accept traffic from builds already in users' hands; retiring the standing crash exclusion changes what the product does on a user's machine.</reversibility>
  <read_first>
    - worker/wrangler.toml (task 4: the binding names, the route, the pinned wrangler version and the deploy runbook in its comments)
    - docs/PRIVACY.md (task 3: the exact text the published page must carry, and the retention number the lifecycle must match)
    - powerbrowser/endpoint-allowlist.json (task 5: the events host entry, which must name the origin the operator actually creates)
    - .planning/milestones/v1.2-REQUIREMENTS.md line 98 (the standing exclusion row: "Socorro self-host or re-enabling the native crash reporter | Standing v1 exclusion, unchanged")
    - .planning/drafts/distribution/S8-PROBE-REPORTS-SUBSTRATE.md (P4 and P5 verdicts, the measured collector defect the gated sub-plan starts from and the version-enrichment routing)
  </read_first>
  <files>.planning/drafts/distribution/S8-OPERATOR-RECORD.md</files>
  <action>These steps need the Cloudflare account, the domain, the website repository and the owner's own decision, and cannot be done from this session.

1. In the Cloudflare dashboard for powerbrowser.org, create the DNS record for the events hostname exactly as the allowlist entry names it, proxied.
2. Create the D1 database with `nix run nixpkgs#wrangler -- d1 create DBNAME`, apply the one-table schema from the descriptor's comments with `nix run nixpkgs#wrangler -- d1 execute DBNAME --file`, and record the database id and the wrangler version that ran, which `nix run nixpkgs#wrangler -- --version` prints.
3. Put the database id into worker/wrangler.toml, then `nix run nixpkgs#wrangler -- deploy` from the worker directory. Record the deployed version id.
4. Add a Cloudflare rate-limiting rule on the events route: a per-IP request budget over a one-minute window, action block. Record the rule's threshold and period verbatim; the Worker's header states that the rule exists, and a header claiming a control nobody configured is worse than no header.
5. Publish the privacy page: copy docs/PRIVACY.md into the website repository at /home/chris/coding/powerbrowser-website as the /privacy route, commit, push, and confirm Cloudflare Pages serves it. Do not reword it in transit; the repository copy is the reviewable source and a divergence makes two policies.
6. Confirm from a machine outside the Cloudflare account that a single synthetic POST to the events origin returns 200 and lands one D1 row, that a body over the size cap returns 413, and that a burst past the rate-limit rule is blocked. Paste all three responses verbatim.
7. Record the two TEL-06 deferrals as their own lines, each naming the stage that picks it up and what it needs: version enrichment against the release-identity stage's product-version derivation when P5 was RED, and buildID enrichment against a backend query plus an RPC surface that does not exist. TEL-06 ships partially in this plan and the record is the artifact a later stage reads.
8. Decide the crash-reporter gate in writing. Either record RETIRED, which authorizes the separated TEL-07 sub-plan below as plan 02 of this stage and requires the exclusion row in .planning/milestones/v1.2-REQUIREMENTS.md to be amended by the milestone owner rather than by this plan set, or record HELD, which leaves --disable-crashreporter in place and the sub-plan unexecuted. Do not edit .planning/milestones/ or .planning/phases/ from this session; a concurrent session owns them.

Write every decision, id, version, threshold and pasted response into the operator record, with the gate, origin, rate-limit, privacy-page and deferral lines in the exact forms the verify below matches.</action>
  <verify>
    <automated>export REC=.planning/drafts/distribution/S8-OPERATOR-RECORD.md && git add "$REC" && grep -qE '^TEL-07 gate: (RETIRED|HELD) ' "$REC" && grep -qE '^Events origin: https://[a-z0-9.-]+/events$' "$REC" && grep -qE '^Privacy page: https://[a-z0-9.-]+/privacy$' "$REC" && grep -qE '^Rate limit: [0-9]+ requests per [0-9]+ s' "$REC" && grep -qE '^Wrangler version: [0-9]+\.[0-9]+\.[0-9]+$' "$REC" && grep -qE '^Deferred: version enrichment ' "$REC" && grep -qE '^Deferred: buildID enrichment ' "$REC" && node -e "const a=require('./powerbrowser/endpoint-allowlist.json'),fs=require('fs');const rec=fs.readFileSync(process.env.REC,'utf8');const m=rec.match(/^Events origin: (https:\/\/[a-z0-9.-]+)\/events\$/m);if(!m)process.exit(1);const host=new URL(m[1]).hostname;process.exit(a.hosts.some(h=>h.host===host&&h.manifest==='telemetry.endpoint')?0:1)" && node -e "const fs=require('fs');const c=fs.readFileSync('configuration.toml','utf8');const rec=fs.readFileSync(process.env.REC,'utf8');const m=rec.match(/^Events origin: (\S+)\$/m);if(!m)process.exit(1);process.exit(c.includes(m[1])?0:1)" && curl -fsS -o /dev/null -w '%{http_code}' "$(grep -oE '^Privacy page: https://[a-z0-9.-]+/privacy$' "$REC" | head -1 | cut -d' ' -f3)" | grep -q '^200$' && git diff --quiet HEAD -- .planning/milestones/ && nix develop .#theia --command scripts/verify-platform.sh --quick</automated>
    <fails_when>the gate, origin, privacy-page, rate-limit, wrangler-version or either deferral line is absent or malformed, the deployed events origin does not match the allowlist host or the manifest endpoint, the privacy page does not serve 200, this session modified anything under .planning/milestones/, or the quick gate exits non-zero</fails_when>
  </verify>
  <acceptance_criteria>
    - Deployed origin, allowlist host and manifest endpoint are the same string, checked mechanically rather than by reading
    - Rate-limit threshold and period plus the wrangler version recorded verbatim, so the Worker header names a control that exists and the deploy is reproducible
    - All three probe responses pasted, including the 413 and the blocked burst
    - Both TEL-06 deferrals recorded as named rows, and the gate line recorded as RETIRED or HELD with no edit to .planning/milestones/ or .planning/phases/ from this session
  </acceptance_criteria>
  <done>The endpoint the shipped build names resolves, is bounded, the two TEL-06 gaps are on the record, and the crash decision is written rather than assumed</done>
</task>

</tasks>

<sub_plan gate="TEL-07" status="conditional" executes_as="plan 02">

This section executes only when the operator record from task 7 reads `TEL-07 gate: RETIRED`. Under `HELD` it stays unexecuted and nothing below is written. It is separated because it changes what the product does after a crash on a user's machine, which is a different class of decision from everything above.

Ordered work, each item a task in plan 02:

1. **Fix the collector's extra-part parsing.** P4 recorded the defect from the tree: both submitters send every annotation as one part named `extra` whose body is a JSON object (`upstream/toolkit/crashreporter/CrashSubmit.sys.mjs:162`, `upstream/toolkit/crashreporter/client/app/src/net/report.rs:67-79`), while `scripts/crash-collector.mjs:266-272` keeps parts by part name against `ANNOTATION_ALLOWLIST`, so a real submission stores `annotations {}`. Parse the `extra` part as JSON, apply the existing allowlist and the existing `MAX_ANNOTATION_BYTES` cap to its keys, and keep the per-part path as a fallback so a hand-built submit still works. Extend `scripts/verify-crash-collector.mjs` with a Gecko-shaped plant whose annotations must survive and a malformed-`extra` plant that must be dropped without a throw. The existing self-test's well-formed body posts parts named `ProductName` and `Version`, which is why the defect stayed green.

2. **Drive the reporter from the manifest.** Add `[telemetry].crash_endpoint`, validated as an https origin with no path, to the schema and to `validateTelemetry`. In the mozconfig emitter, replace the `--disable-crashreporter` literal at `scripts/generate.mjs:1422` (which produces `.mozconfig:13`) with the pair `--enable-crashreporter` and `--with-crashreporter-url` when the key is set, and the current literal when it is not. Both options are stock: `upstream/toolkit/moz.configure:3474-3481` and `:3392-3405`, where the URL default is `https://crash-reports.mozilla.com/` and the value is right-stripped of its trailing slash. No patch is needed; this is a generator emission, a comparand row and a manifest key. It does change `.mozconfig` and therefore forces a tier-3 rebuild, which is why it lives here and not above.

3. **Keep the consent UI stock.** The per-crash dialog is the consent surface. Verify that `upstream/toolkit/locales/en-US/crashreporter/crashreporter.ftl` resolves its product and vendor names through `-brand-short-name` and `-vendor-short-name` (lines 5, 8, 11, 13, 29, 41, 43), which the generated `powerbrowser/branding/{dev,release}/locales/en-US/brand.ftl` already supplies, so the dialog names the product without any new copy. Author no dialog and no infobar.

4. **Receive the reports.** Add a `/submit` route to the events Worker writing minidumps to R2 under a 30-day lifecycle rule and answering `CrashID=<uuid>`, reusing the collector's caps, rejection vocabulary and annotation allowlist. `upstream/build/application.ini.in:48-50` bakes `ServerURL=@MOZ_CRASHREPORTER_URL@/submit?...`, so the path is `/submit` and is not negotiable.

5. **Close the endpoint surface.** The `crash-reports.mozilla.com` deny row already exists: the linux-release-pipeline-and-update-channel stage created it under UPD-05, with a reason naming the fact that `.mozconfig` carries `--disable-crashreporter` while both config.status files still carry `MOZ_CRASHREPORTER_URL`. EXTEND that one row's reason rather than adding a second entry, stating that it becomes live the moment the reporter is enabled without `--with-crashreporter-url`, and add the assertion that proves it: extend `scripts/verify-endpoints.sh` layer 1 to read `[Crash Reporter] ServerURL` out of the built `application.ini` and assert its host against the allowlist, with a positive control that a restored stock URL goes red. One row per host, one source of truth.

6. **Ship the symbols and the runbook.** Add `mach buildsymbols` to the release job and the symbols zip to the Release assets, and write the `minidump-stackwalk` runbook naming the symbol path.

7. **Rewrite the exposure paragraph.** `docs/CRASH-POLICY.md:76-81` states that collection beyond loopback "needs token auth", which a public client cannot satisfy. Replace it with the real controls: the Cloudflare rate-limiting rule, the size and part caps, the annotation allowlist, and the absence of any credential, stating plainly that the receiver is public by necessity and bounded by construction.

</sub_plan>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Theia frontend to the events origin | A public, unauthenticated client posts JSON to a Worker over the open internet. |
| Public internet to the Worker | Anyone who reads a shipped bundle knows the URL and can post to it. |
| Diagnostics layer to the clipboard | Content that deliberately carries internal identifiers leaves the machine the moment the user pastes it. |
| Manifest to the endpoint allowlist | Two new outbound hosts, the issue tracker and the events origin, enter the build's contactable set. |
| Product to a public GitHub issue | A prefilled URL and a pasted diagnostics block become world-readable. |
| Operator to Cloudflare and the website repository | DNS, deploy, rate limiting and the published page are configured outside this repository. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-S8-01 | Information disclosure | error payload carrying paths, URLs or stacks | high | mitigate | Data is message, source BASENAME, line, column plus at most three admitted enrichment keys; the sender's never-enriches rule is amended rather than removed; the static gate derives the produced key set and requires a subset, and the live drill asserts on the wire that no stack, full path or page URL appears. |
| T-S8-02 | Information disclosure | telemetry live by default | high | mitigate | Shipped level stays off with the endpoint merely stated; the sender reads the level live per event and drops before queueing at off; the drill's negative half proves zero requests at off in the same run that proves delivery at error. |
| T-S8-03 | Information disclosure | diagnostics pasted into a public issue | medium | accept-with-control | The payload is diagnostics by design; the copy is an explicit user gesture, the issue form's diagnostics field states what the block contains and that it may be trimmed, and the privacy source states that bug reports are user-written and public. |
| T-S8-04 | Denial of service | public receiver flooded | high | mitigate | Content-Length and body caps rejected before the body is read, batch-length cap, per-string truncation, over-rate answered 200 with a discard reason so clients do not retry into a queue, plus a Cloudflare rate-limiting rule the operator task configures and records verbatim. |
| T-S8-05 | Spoofing | forged or replayed events | low | accept | A public client cannot hold a credential, so every event is unauthenticated by construction; nothing downstream grants authority from an event, rows carry a server-assigned time only, and no client-supplied identifier is stored. |
| T-S8-06 | Tampering | client-declared fields widening the stored set | medium | mitigate | The Worker enforces the admitted property set server side and drops the rest; the gate plants an event carrying an extra property and requires the row not to contain it. |
| T-S8-07 | Elevation of privilege | a second Firefox-internal importer for the clipboard | medium | mitigate | P2 routes the implementation: the DOM API on GREEN, and on RED one accessor in the single boundary file with an INTERNAL-APIS.md row; the boundary and catalogue checks run in this task's verify. |
| T-S8-08 | Tampering | an outbound host reaching a build without a reason | medium | mitigate | The issues host and the events host each land as an allowlist entry marked with a dotted manifest key in the same commit as the manifest change; the endpoints gate fails on a missing host and on a marked entry whose key no longer names it, and task 2's verify asserts github.com is present and allow rather than leaving it to a stage whose written reason covers only MAR downloads. |
| T-S8-09 | Repudiation | a prefill parameter silently ignored, or a prefill URL that is not a new-issue URL | medium | mitigate | GitHub drops unknown parameters without error, so the gate derives the parameter names from the contribution and the field ids from the template and fails when a parameter names no field; it also resolves urls.issues through the generator and fails when the builder's base does not carry that origin and the new-issue path, which is the failure a parameter-only comparison cannot see. |
| T-S8-10 | Information disclosure | internal identifier in the Copy button label | low | mitigate | The shell document joins the copy gate as a derived scope with the same all-caps and dotted-key shape tests, closing the label hole for Retry, Details, Close and Copy at once rather than for the new button alone; the task's verify asserts the scope exists by name so the row cannot go green on a gate that never reads the document. |
| T-S8-11 | Tampering | live drill leaving a dead endpoint baked into the built frontend | medium | mitigate | The finally restores the tracked source AND rebuilds the bundle from it; the verify greps the built bundle for the drill's marker segment and requires zero occurrences, because the bundle is untracked and a clean git diff proves nothing about it. |
| T-S8-12 | Information disclosure | privacy statement suppressing the controller's name to pass a gate | low | mitigate | The document names the controller and carries the matching manifest-literal allowlist row in the same commit; that table fails a stale row whose file no longer carries the value, so the sentence and the row cannot drift apart. |
| T-S8-SC | Tampering | npm/pip/cargo installs | medium | mitigate | No new registry package anywhere: the Worker imports nothing, both new gates are plain node over repository files, the branding extension gains only workspace dependencies already pinned in this tree, and wrangler is an operator tool run through `nix run` at a recorded version rather than a flake input. |
</threat_model>

<verification>
Probe record carries five well-formed verdicts, two backed by live evidence and three by file-and-line citations; urls.issues exists with schema, emitter, comparand, endpoint-source row and REBRANDING row, and the issue form's field ids, the command's prefill parameters and the manifest origin all agree through a derived gate with five plants red; the Copy button renders the layer's own hoisted snapshot and its label passes a derived shell-document scope asserted by name with three plants red; the events Worker rejects one planted fault per rule with the control green first and carries no credential-shaped assignment; the frontend error hooks reach the existing sender with bounded enrichment and the static gate reddens on four plants; the live drill observes a real POST at level error and none at level off in the same run, restoring both the tracked application package.json and the built frontend bundle on every exit path; the endpoints gate finds the events and issues hosts present and marked and the Gecko telemetry pref still blank; the manifest-literal gate is green over the new privacy document through a declared allowlist row; the operator record's events origin matches both the allowlist host and the manifest endpoint, the privacy page serves 200, and both TEL-06 deferrals are recorded; the residual-brand scan is green over a fully staged tree; the internals boundary and catalogue are green; the branding preflight is green; the upstream diff is empty; the quick gate is green after every task.
</verification>

<success_criteria>
A user can report a bug and copy diagnostics from inside the product, the report target is a manifest value a downstream can repoint, an uncaught frontend error reaches a real endpoint the moment that user opts in and reaches nothing before, the receiver is bounded and asserted, the privacy statement is published and linked, and native crash reporting is either authorized in writing or still compiled out.
</success_criteria>

<output>
Stage 8 entry slice: the whole of TEL-05 and TEL-08, and TEL-06 in part. Delivered: probe verdicts routing three implementation choices, the urls.issues manifest key with its full generator chain, issue form plus Report a Bug command with a prefill agreement gate, diagnostics Copy button with the shell copy scope closed, events Worker with a contract gate, frontend error hooks with bounded enrichment and a stated endpoint, two manifest-marked allowlist entries plus the settled github.com row, a live loopback delivery drill, the privacy source with its About link and its manifest-literal allowlist row, and an operator record carrying the Cloudflare deployment and the TEL-07 gate decision.

TEL-06 ships partially and the record says which half remains: OS enrichment ships unconditionally, version ships only when probe P5 finds the release-identity stage's product-version derivation, and buildID ships in neither case because it needs a backend query and an RPC surface that do not exist. Both gaps are recorded as named deferral rows in the operator record, which is the artifact a later stage reads. TEL-07 executes as plan 02 only under a RETIRED gate.
</output>
