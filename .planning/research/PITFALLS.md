# Pitfalls Research: v1.1 Hardening and SQL Tabs

**Domain:** Adding installer builds, extension/crash pipelines, and SQL tab stores to a Firefox-ESR patch-stack fork + Theia sidecar (Power Browser, post-v1.0)
**Researched:** 2026-09-04
**Confidence:** HIGH for tree-derived claims (verified against `/home/chris/coding/Power-Browser` live tree and `upstream/` Gecko source); MEDIUM for web findings cross-checked across official docs + Bugzilla + source (seam-classified `websearch --verified` = MEDIUM); LOW where single-sourced (marked inline).
**Replaces:** the v1 research file (debranding/rename pitfalls). Standing v1 invariants that remain in force are carried forward in §Standing Invariants rather than re-argued.

> **Framing.** v1's dangerous failure mode was *"the build succeeds and is silently wrong."* v1.1's is one level up: **"it installs, launches, and demos fine — and is wrong on the second machine, the second downstream, or the second month."** Every pitfall below is something that passes a developer's single-host smoke test and fails in distribution, at update time, at rebase time, or at restore-after-crash time. The verification half of each pitfall is therefore biased toward *second-machine, second-profile, and second-month* checks.

---

## Critical Pitfalls

### Pitfall 1: The updater ships with no update story — and phones Mozilla or dies silently

**What goes wrong:**
A fork that builds installers but never decides its update story gets the worst of all worlds. Three sub-failures, all observed in the wild for Firefox derivatives:

- **Update URL still points at Mozilla.** The build pulls `app.update.url` / AUS endpoints configured for official Firefox. At best updates fail signature checks; at worst a "successful" update path pulls Mozilla-signed bits over the fork's branding, or the fork's users never get security updates at all. Mozilla's own update-server setup doc shows the update URL is repointable per-install via `distribution/policies.json` (`AppUpdateURL`) — which means *someone must repoint it*, and that someone is this milestone.
- **MAR signature verification assumed away.** MARs are signed by Mozilla; a fork cannot produce Mozilla-signed MARs. Building MAR-capable updates requires either `--disable-verify-mar` in mozconfig (`--enable-unverified-updates`, plus `DISABLE_UPDATER_AUTHENTICODE_CHECK` uncommented in `toolkit/components/maintenanceservice/moz.build` and `toolkit/mozapps/update/tests/moz.build`) or a fork-owned MAR signing certificate compiled into the updater. Neither happens by default. An updater built with default verification and fed fork MARs fails every update with signature errors.
- **The Windows maintenance service cert pin goes stale.** The service verifies `updater.exe`'s signature against an issuer stored in the registry, rewritten on every update by `helper.exe`'s `PostUpdate` NSIS macro from strings compiled into the binary (`defines.nsi`). Change signing certificates without updating those defines and background updates break permanently after the first hop (Bug 1205843 / Bug 1079858 — Mozilla itself nearly broke all background updates on a cert rotation).

**Why it happens:**
`./mach package` produces an installer that *installs*. Nothing in the packaging path forces the packager to answer "who signs updates, where are they hosted, who verifies them." The update subsystem is a second product hiding inside the installer, and PKG-01 scoped as "build the installer" never looks at it.

**How to avoid:**
Make the update story an explicit, recorded decision in the installer phase — one of exactly three, no fourth option by omission:

1. **Fork-hosted updates**: own MAR signing key, own AUS-compatible update XML endpoint, `AppUpdateURL` policy pointing at it, verification left on. (Most work; only honest "Firefox-style updater" option.)
2. **No in-place updates**: updater/maintenance-service disabled at build time; updates = download the new installer. (Legitimate; must then *remove* the update UI promises, not just break the mechanism.)
3. **OS-package updates**: installer registers with the system package manager; Gecko updater off.

Whichever is chosen: assert in verification that no Mozilla update host remains in the packaged artifact's effective configuration, and run one real update hop (install N, update to N+1) on each OS before calling PKG-01 done.

**Warning signs:**
- A PKG-01 plan that never mentions MAR, AUS, `AppUpdateURL`, or the maintenance service.
- `distribution/policies.json` untouched by the generator while everything else is generated.
- "We'll figure out updates after we can install" said out loud.

**Phase to address:** Installer phase (PKG-01), as a *decision first, mechanism second*. The decision gates the phase; the mechanism is sized by the decision.

---

### Pitfall 2: Profile / remoting collision — tested alone, broken alongside Firefox

**What goes wrong:**
`MOZ_APP_BASENAME` controls the profile directory; `MOZ_APP_REMOTINGNAME` controls single-instance routing. Get either wrong and:

- Power Browser shares a profile directory with stock Firefox (or with Sourcerer, or with another downstream). Two different products write to one `places.sqlite`, one `sessionstore`, one extension registry — slow corruption, mystery settings migration, "my bookmarks doubled."
- The single-instance handler routes to the wrong product: launching Power Browser focuses Firefox, or vice versa. The `a-powerbrowser` category-entry sort-key mechanism (v1 Pitfall 2) only works if the remoting identity is actually distinct.
- The NAME-01 rename slice turns this from latent to active: display-name changes are safe, but if anyone "tidies" `basename`/`binary_name`/`remoting name` during the rename, **every existing user suffers a profile-migration event** — a silent fresh profile that looks exactly like data loss (v1 Pitfall 22, now with real users).

**Why it happens:**
Every installer test happens on a clean VM or a dev machine's throwaway profile. Nobody installs the fork *next to Firefox* and *next to the previous fork build* and launches them interleaved — which is the only test that exercises this. And the fields look cosmetic, so the rename slice touches them.

**How to avoid:**
- NAME-01 changes **display strings only**. `basename`, `binary_name`, and remoting name are frozen for the milestone; the generator asserts they equal their v1 values (or, if the milestone deliberately changes them, a migration path ships in the same phase).
- Verification installs Power Browser alongside stock Firefox (or alongside the pre-rename build), launches both interleaved, and asserts: distinct profile directories, `WM_CLASS`/remoting separation, launch-twice-get-one-window *per product*.
- Document the old→new profile path mapping in `docs/BUILD.md` / `REBRANDING.md` the moment any identity field changes, with a copy command.

**Warning signs:**
- A rename plan whose diff touches `[identity]` in `configuration.toml`.
- Installer verification that never mentions a second browser on the same machine.
- `MOZ_APP_REMOTINGNAME` left to its channel-derived default (release channel derives from `MOZ_APP_NAME`; any other channel appends `-<channel>` — v1 Pitfall 12, now biting real installs).

**Phase to address:** Installer phase (PKG-01 + NAME-01 slice). The alongside-Firefox test is a phase exit criterion.

---

### Pitfall 3: "Installer builds" declared done from a Linux build log

**What goes wrong:**
PKG-01's acceptance is *verified on real packaging hosts* — and v1 explicitly scoped that as schema-only. The failure modes that only exist on the real host:

- **Windows:** unsigned binaries → SmartScreen warnings and enterprise blocks; the maintenance service refuses to install without a trusted signature; NSIS `branding.nsi` defines (`BrandFullName`, `BrandFullNameInternal`, `Channel`) compile into registry keys, Add/Remove-Programs entries, and install paths — a wrong define is a wrong uninstall that orphans registry keys. Bare `$VAR` in NSIS defines (WR-04) expands to empty at compile time and produces paths that install "successfully" into nonsense locations.
- **macOS:** unsigned/notarized DMG → Gatekeeper blocks; `icns`/`Assets.car` handling; the `identifier` used for `--enable-mac-elevated-updates-with-generic-certs` vs production signing anchors.
- **Cross-build trap:** building the Windows/macOS installer from the Linux host with platform-specific Theia plugins bundled (see Pitfall 6) — the installer assembles fine and ships the wrong-architecture native plugin.

**Why it happens:**
`mach package` succeeding is such a satisfying green that it gets mistaken for the whole job. The remaining half (install → launch → uninstall → no residue) needs a Windows machine and a Mac, which are never in the room.

**How to avoid:**
Define PKG-01 done per-OS as: installs on a clean host, launches, uninstalls, leaves no registry keys / `~/Library` residue / `.desktop` residue, and the installed binary reports the right `--version` two-token string. Signing is a decision with the same three-option shape as Pitfall 1 (own cert + timestamping; unsigned with documented SmartScreen/Gatekeeper friction; OS-store distribution) — recorded, not drifted into. WR-04 (reject bare `$VAR`) and WR-07 (fixture `root` through the installer verifier) land as pre-fix *before* the first real-host build, not after it embarrasses someone.

**Warning signs:**
- A PKG-01 plan with no named human and no named host per OS.
- `docs/BUILD.md` procedure written from a Linux shell transcript.
- Signing mentioned as "follow-up."

**Phase to address:** Installer phase (PKG-01). The per-OS install/uninstall matrix *is* the phase's exit gate.

---

### Pitfall 4: Installer strings live outside the generator

**What goes wrong:**
`branding.nsi` defines, `setup.ini` overrides, `.desktop` files, macOS plist strings, and the endpoint-allowlist-adjacent update URLs get hand-edited "just for the installer phase" and never folded into `tools/generate.mjs` emitters. From that moment there are two sources of truth for product identity, and the single-file-rebrand contract — the project's core value — is broken for exactly the artifacts users see first (Add/Remove Programs, the dock, the installer banner). The NAME-01 rename then has to be applied in two systems, and the second one gets missed.

**Why it happens:**
Installer inputs feel like packaging trivia beneath the generator's dignity. They are not: `BrandFullName` in Add/Remove Programs *is* the product name to most users.

**How to avoid:**
Every installer-consumed string is emitted from `configuration.toml` by a named emitter (extend the `desktop.mjs` pattern to `nsis.mjs` / `dmg.mjs`), covered by `generate --check` byte-identity, and the residual-brand scan covers the installer inputs with the same rigor as source. WR-04's bare-`$VAR` rejection is a generator-time assertion, not a review guideline.

**Warning signs:**
- A `branding.nsi` / `setup.ini` / plist checked in with literal product strings.
- "We'll generate these later" in an installer plan.
- The rename slice's file list doesn't include installer inputs.

**Phase to address:** Installer phase, first task (emitters before first real-host build).

---

### Pitfall 5: Extension pins float — `@latest` today, someone else's code tomorrow

**What goes wrong:**
`[extensions]` entries resolved at build time against live registries without exact pins produce installers that differ day to day with zero tree changes. Concretely:

- **Open VSX has no lockfile.** Theia's own `theia-plugins.lock` proposal (integrity-pinned `publisher/ext@version` → resolved URL + sha512) was discussed and **closed unimplemented** (PR #8864) — upstream decided complex download verification belongs in adopter-side scripts. `yarn download:plugins` resolves `latest` fresh each run. There is no upstream mechanism to inherit; the platform must build its own.
- **Registries move under you.** Open VSX namespace-ownership changes broke Theia's own `vscode`-namespace publishing; Theia master switched built-in extensions to a self-packaged tarball (PR #16774). A `[extensions]` entry pointing at a namespace whose ownership changes, or a version yanked upstream, breaks the build — or worse, resolves to attacker-controlled content under a familiar name.
- **npm/local-path kinds (EXT-02) widen the hole.** `file:` dependencies carry no integrity hash; a local path that exists on the packager's machine and not in CI (or in the downstream's checkout) fails builds non-locally. npm semver ranges re-resolve transitives on every fresh install unless a committed lockfile pins them.

**Why it happens:**
During development, `@latest` and unpinned paths are convenient and always green *today*. The failure arrives months later as an unreproducible build or a supply-chain incident, far from the commit that allowed it.

**How to avoid:**
- Every `[extensions]` entry carries **id + source + exact version pin + integrity hash**, enforced by schema validation (fail-loud on pin miss — PROJECT.md already says "pinned and fail-loud"; this is the mechanism). The generator resolves pins to a committed lock artifact (adopter-side equivalent of the rejected `theia-plugins.lock`) *before* invoking `download:plugins`, and CI verifies the downloaded bytes against it.
- `VSX_REGISTRY_URL` is set explicitly in the start/build path (v1 02-LEARNINGS precedent), never defaulted — so a mirror/proxy cutover is a config change, not a code change.
- npm kinds install via a committed lockfile (`--frozen-lockfile`); local-path kinds resolve against paths inside the repo or `PB_CONFIG_DIR` and fail with the expected path printed when absent.

**Warning signs:**
- Any `latest` in `configuration.toml`, generated manifests, or docs.
- A build that requires network access to succeed with no vendored/mirrored fallback documented.
- `yarn install` (not frozen) or bare `download:plugins` in the build path.

**Phase to address:** Extensions phase (EXT-02). Pin schema + lock artifact land *with* the new source kinds, not after.

---

### Pitfall 6: The bundled extensions target the wrong machine or no network

**What goes wrong:**
Two independent ways to ship an installer whose extensions don't run:

- **Wrong architecture.** Platform-specific VSIX (native binaries — the `rust-analyzer` precedent) must be fetched per target platform via the `${targetPlatform}` placeholder (Theia PR #12410 CLI-side, #13825 runtime-side). PKG-01 cross-builds Windows/macOS artifacts; a naive `download:plugins` on the Linux packaging host bundles Linux-native plugins into the Windows installer. It installs, the plugin crashes on activation, and nothing in the packaging log is red.
- **Offline/air-gapped builds.** `download:plugins` hitting the live Open VSX registry at build time means release builds depend on a third-party service being up, fast, and serving identical bytes. A registry outage, a yanked version, or a slow mirror turns release day into debugging day.

**Why it happens:**
The dev loop (`download:plugins` on the dev machine, for the dev machine, with good wifi) never exercises either axis. Both only exist in the release/packaging path that v1 never ran.

**How to avoid:**
- Per-target plugin resolution: the generator emits the plugin set per packaging target with `${targetPlatform}` expanded for *that target*, and verification asserts the bundled native binaries match the target arch (even a `file(1)`-level check beats nothing).
- Vendored or mirrored extension artifacts for release builds: resolve-then-vendor during the extensions phase so the installer build consumes local bytes + integrity hashes, with the live registry as the refresh path, not the build path.
- A plugin-activation smoke check per target (the extension host reports the plugin loaded), not just "file present in `plugins/`".

**Warning signs:**
- One plugin set for all installer targets.
- No `${targetPlatform}` anywhere in the extension pipeline.
- "File present" asserted where "plugin activated" was possible.

**Phase to address:** Extensions phase (EXT-02), jointly with the installer phase's per-target matrix (Pitfall 3). The cross-target plugin check belongs in the installer exit gate.

---

### Pitfall 7: TEL-04 scoped as "stand up Socorro" — plus PII you didn't plan to hold

**What goes wrong:**
Two complementary disasters:

- **Scope blowup.** Socorro is a multi-service AWS pipeline (Antenna collector → S3 + SQS → processor → S3 + Elasticsearch → crash-stats webapp + BigQuery export), and its maintainers state explicitly they **do not support external users** ("Mozilla-specific product… consider mini-breakpad-server, sentry_breakpad, Backtrace, BugSplat"). Scoping TEL-04 as a Socorro deployment turns a milestone phase into a multi-month infrastructure project that still won't match upstream's operational maturity (throttling rules, signature generation, symbolication pipeline).
- **PII liability by accident.** Crash reports contain URLs, user email addresses, user comments, register contents, and heap excerpts — Mozilla gates all of it behind protected-data access groups, with only a scrubbed subset public. The moment Power Browser's crash endpoint receives a real minidump, the project holds PII with retention, access-control, and disclosure obligations. Pointing the Crash Reporter at a logging endpoint "temporarily" with no scrubbing/retention policy is how a sidecar becomes a liability.
- **Volume.** Every crash in the wild reports in. Without collector-side throttling/sampling (Antenna's throttle rules exist precisely because Mozilla drowns otherwise), a crash loop in one bad build fills whatever disk the receiver has.

**Why it happens:**
TEL-04 is written as "crash-report pipeline beyond endpoint repointing," which reads like "build the server half." And crash reporting feels like telemetry's boring sibling — it isn't; telemetry crash *pings* are PII-free aggregates over Mozilla's telemetry infra, while Socorro-style *reports* are full minidumps with memory contents.

**How to avoid:**
Decide TEL-04's scope in questioning from an explicit ladder, and pick the lowest rung that answers the milestone's actual question:

1. **Off + documented**: Crash Reporter disabled by policy, crash *pings* via the project's own telemetry endpoint if TEL-01..03 need volume data. Zero PII held.
2. **Minimal receiver**: Breakpad-protocol-compatible POST endpoint (e.g. mini-breakpad-server class) that records product/version/signature-class + counts, discards or never stores minidumps, with retention stated in days. Throttle at the edge.
3. **Full pipeline**: only with named ownership, symbol upload automation, access groups, and a retention/deletion policy written before the first report arrives.

Whatever the rung: the crash-report URL and the update URL and the telemetry endpoint all flow from `[urls]`/`[telemetry]` through the generator into the allowlist (v1 ARCHITECTURE.md data-flow couplings), or `verify-endpoints.sh` fails the build the moment TEL-04 lands.

**Warning signs:**
- A TEL-04 plan that starts with infrastructure and has no PII/retention section.
- Minidumps stored "for now, we'll figure out access later."
- No throttle/sampling design.
- The crash endpoint live before the allowlist + policy entries exist.

**Phase to address:** Extensions + crash phase (TEL-04). The scope decision is a questioning output; the PII/retention policy gates any receiver going live.

---

### Pitfall 8: A second writer opens `places.sqlite` — corruption, not contention

**What goes wrong:**
The SQL-tabs work needs tab/bookmark/session data visible to both the Gecko side and the Theia sidecar. The catastrophic implementation is the obvious one: the Theia backend (a separate Node process) opens `places.sqlite` directly with its own SQLite library while Gecko holds it. Precedent is unambiguous — two processes writing one profile's `*.sqlite` files without shared lock coordination corrupt them (SQLite forum, 2026-05: bwrap-sandboxed Firefox+Thunderbird sharing `$HOME` produced repeatable `places.sqlite` corruption; WAL/`-shm` shared-memory coordination and Firefox's own profile lock both defeated). Symptoms match the project's nightmare class: silent at first (a stuck `-wal` that never checkpoints, bookmark writes silently failing — Bug 2040253), then `database disk image is malformed` and the bookmarks/history system goes dark with "one of Firefox's files is in use by another application."

Gecko-internal precedent agrees from the other direction: even *within* one process, concurrent `Sqlite.jsm` transactions throw (Bug 1090961 — needed a transaction queue), exclusive locking was rejected for WAL databases because WAL fundamentally needs multiple coordinated connections (Bug 627936), and forced WAL checkpoints deadlock across Gecko's own sync/async split (Bug 1359887).

**Why it happens:**
`places.sqlite` is *right there* in the profile directory, SQLite is trivially openable from Node, and "read-only queries can't hurt" is folk wisdom that is false under WAL (even readers participate in checkpoint coordination via the `-shm` file).

**How to avoid:**
- **One writer, on the chrome side.** All SQL access — including the new tab store — goes through Gecko-owned connections behind `PowerBrowserAPI.sys.mjs` (the single anti-corruption layer; `check-internals-boundary.sh` already enforces one-file access). The Theia side never opens profile SQLite files; it calls the API over the existing supervised channel. This is non-negotiable and stated as a design invariant before any schema is drawn.
- New tab storage lives in its **own SQLite file** (own WAL, own `-shm`), never as extra tables in `places.sqlite` — so a bug in tab writes cannot take bookmarks/history down with it, and checkpoint/vacuum behavior stays decoupled.
- Verification includes a "second writer" negative test: assert from the packaged artifact that no Theia-side code path opens `*.sqlite` under the profile (static scan for `sqlite` opens outside `powerbrowser/shell/`), plus a soak test with interleaved tab writes and bookmark writes asserting `PRAGMA integrity_check` stays clean.

**Warning signs:**
- `sqlite3`, `better-sqlite3`, or `node-sqlite` appearing in any `theia/extensions/*/package.json`.
- A file path under the Gecko profile constructed anywhere in TypeScript.
- "Read-only, so it's safe" in a plan or review.

**Phase to address:** SQL-tabs phase, as design invariant #1 — before schema, before code. The negative test lands with the first storage commit.

---

### Pitfall 9: Two sources of truth for "which tabs are open"

**What goes wrong:**
`sessionstore` keeps its own ledger of open windows/tabs (compressed JSON: `sessionstore.jsonlz4` + `sessionstore-backups/` with a version-gated load order `clean → recovery → recoveryBackup → cleanBackup → upgradeBackup`), and the new SQL tab store keeps another. After any abnormal shutdown they disagree — that is precisely when both are consulted. Known sessionstore behaviors that will ambush a naive SQL mirror:

- A corrupt or empty `recovery.jsonlz4` causes a skeleton (empty) session restore while a valid `previous.jsonlz4` sits one directory away (Bug 1906808 — users routinely hand-repair by swapping files). An SQL store that blindly mirrors "current state" mirrors the skeleton and destroys the good data.
- Upgrade backups, `formatVersion` gating (unreadable files are skipped, not errors), and the clean-shutdown removal of `recovery*` files mean "the session files present" varies by shutdown path. Logic that assumes one canonical file is wrong on every path but the happy one.

**Why it happens:**
The SQL-tabs pitch ("every tab a SQL row") sounds like the SQL store *replaces* session knowledge. It doesn't — sessionstore owns window/tab restoration on startup, and duplicating that ownership creates a split-brain that only manifests after crashes, i.e. exactly when users can least afford confusion.

**How to avoid:**
Declare authority per question, in writing, before building:

- **Window/tab restoration at startup:** sessionstore remains authoritative. The SQL store never overrides what sessionstore restores.
- **Tab identity across time:** `TabUriRegistry` URIs are the join key (the GUI-04 asserted shape). SQL rows key on registry identity; sessionstore entries get *annotated*, never rewritten, from the outside.
- **Crash path:** on startup after abnormal shutdown, the SQL layer reconciles *toward* the restored session (adopt restored tabs, mark the rest closed-by-crash) — it never "restores" tabs sessionstore dropped.
- Never write `sessionstore.jsonlz4` or anything under `sessionstore-backups/` from outside Gecko's sessionstore code. That format's load-order and version-gating are its corruption handling; bypassing them bypasses the handling.

**Warning signs:**
- A design doc where the SQL store "restores" tabs.
- Writes to sessionstore files from the Theia side or the generator.
- A happy-path-only demo (clean shutdown, restore works) with no crash-path test.
- The words "single source of truth" applied to open-tab state without naming sessionstore.

**Phase to address:** SQL-tabs phase, design task (authority table), verified by a crash-path test: kill -9 mid-session, restart, assert restored set == sessionstore's answer and SQL reconciles without resurrecting or duplicating tabs.

---

### Pitfall 10: Every new Gecko touchpoint is future rebase debt — and SQL tabs invite several

**What goes wrong:**
SQL tabs need Gecko-side storage, session observation, and (eventually) `<xul:browser>`-backed web tabs. Each need is a temptation to add a new patch hunk, a new file importing Firefox internals, or a new `moz.build`/`jar.mn` coupling — and each one widens the ESR-rebase conflict surface that v1 deliberately narrowed to hook-only patches. The WINDOWS #13 precedent (`registerWindowActor` hole in the boundary guard) shows exactly how this happens: a real capability need, a direct internal import that works, a guard with a gap. The carry-over live-rebase drill exists to catch this class — but only if the new touchpoints exist *before* the drill runs. New code landing after the drill gets a free pass until the next ESR, when it detonates.

**Why it happens:**
The boundary (`PowerBrowserAPI.sys.mjs` + `INTERNAL-APIS.md` catalogue + `check-internals-boundary.sh`) feels like ceremony when you're trying to ship a feature. The cost it prevents (rebase conflicts, silent behavior drift across ESR) arrives a year later, charged to someone else.

**How to avoid:**
- New Gecko touchpoints go through `PowerBrowserAPI.sys.mjs`, catalogued in `INTERNAL-APIS.md`, in the same commit — no second importer (the `TheiaService.sys.mjs` consumer-not-boundary precedent holds). Extend `check-patch-surface.sh` / the boundary guard to cover the new surface (storage, session observation) as part of the feature commit.
- Patches stay hook-only: if tab storage needs build-system wiring, the patch adds `DIRS`/`include()` lines pointing at platform-tree files; schema, SQL, and defaults live outside `upstream/`.
- The live ESR-rebase drill runs *after* the SQL-tabs touchpoints land, over the new surface — schedule it as the SQL phase's closing task, not as a standalone later phase (see Pitfall 12).

**Warning signs:**
- A second `.sys.mjs` importing Gecko internals.
- An `INTERNAL-APIS.md` untouched by a phase that clearly touches internals.
- A patch hunk containing SQL, schema, or product logic rather than a hook line.
- "We'll catalogue it during cleanup."

**Phase to address:** SQL-tabs phase (boundary extension in-feature) + carry-over drill scheduled inside it. Installer/extensions phases are lower-risk here (mostly generator/Theia-side) but get the same rule if they touch `upstream/`.

---

## Moderate Pitfalls

### Pitfall 11: Designing one schema for four different histories

ROADMAP.md already records this ("three migrations, not one") — the pitfall is *implementing* as one anyway. Bookmarks/history are already SQL upstream (`places.sqlite`: expose via the Places API, don't rebuild); sessions are versioned compressed JSON with corruption fallbacks (mirror, don't reimplement); Theia workbench layout is a third serialization with its own versioning; only tabs are net-new schema. A unified `items` table with a `kind` column couples the new code to three upstream formats' evolution and makes every ESR's Places/sessionstore changes a migration event for tab data too. **Prevention:** one store, separate domains; tabs own their table, everything else is referenced by stable key (Places GUIDs, registry URIs). **Phase:** SQL-tabs design. (MEDIUM — documented in-repo + sessionstore source; the risk is execution drift, not unknown unknowns.)

### Pitfall 12: Carry-over drills stage forever while the surface they must cover grows

Release `objdir-release` build, tier-3 per-fixture builds, live ESR rebase, Theia re-pin, WINDOWS #13/#14 — all staged in v1, all still staged. v1.1 adds installers (which need release builds to be meaningful), new extension kinds (which need per-fixture builds), and new Gecko touchpoints (which need the rebase drill) — every phase widens the gap between "verified" and "true." A terminal "drills phase" at the end of the milestone will be the first thing cut under schedule pressure. **Prevention:** each phase carries its own drill (installer phase runs the release build it needs; extensions phase runs per-fixture tier-3 over the new source kinds; SQL phase closes with the live rebase over its touchpoints). The "carry-over" bucket holds only WINDOWS #13/#14 fixes. (HIGH confidence as process risk — v1 closeout was an override with 16 unchecked requirements; MEDIUM as prediction.)

### Pitfall 13: NAME-01 re-pin done halfway

The rename slice touches `identity.display_name`, `generate --self-test` byte-identity comparands, `brand_display_expectations` in `inventory/brand-tokens.json`, the trademark-surface scan, and downstream fixtures — plus the single-edit propagation proof re-run and a tier-3 Linux rebuild. A partial re-pin fails loudly in the best case (gate red on old spaced form) and silently in the worst (fixtures regenerated to the new form while a gate still asserts the old one, then "fixed" by updating the gate to match the fixture — assertion laundering). **Prevention:** the slice is one plan with a checklist of every gate asserting display form; each gate is proven red against the *other* form before green is accepted. **Phase:** Installer phase (folded slice). (HIGH — tree-derived; the gates exist and are enumerable today.)

### Pitfall 14: Theia layout conflated with tab state

Persisting Theia widget layout (positions, splits, sizes) into the same rows/transactions as tab identity means a Theia upgrade that changes layout serialization breaks tab restore, and a tab-store migration risks scrambling layout. **Prevention:** `TabUriRegistry` URI as the join key; layout stored opaquely (blob + version tag) in a separate table/store, restored best-effort after tabs resolve. Tab restore must succeed with layout missing; layout restore must fail soft with tabs present. **Phase:** SQL-tabs design. (MEDIUM — tree-derived contract shape + Theia layout versioning is upstream-controlled.)

### Pitfall 15: Unversioned schema, no corruption path

A fresh SQLite file with no `user_version`, no migration harness, and no plan for "this file is corrupt" repeats Places' hardest-learned lessons (`places.sqlite.corrupt` rename-and-rebuild, backup rotation). Beta users *will* carry corrupt or half-migrated tab stores across builds. **Prevention:** `PRAGMA user_version` + forward-only migrations exercised against fixture databases from each prior version; startup `integrity_check` with a defined degraded mode (rebuild from sessionstore + registry, never block startup); never delete-and-recreate silently — quarantine (`tabs.sqlite.corrupt`) so data is recoverable. **Phase:** SQL-tabs implementation, first schema commit. (MEDIUM — Places precedent is direct and public.)

### Pitfall 16: Two extension systems, one declaration, zero reconciliation

`[extensions]` feeds Theia's `theiaPlugins` — but EXT-02's WebExtensions declaration sibling feeds Firefox's extension machinery (distribution/policies, signing requirements for `.xpi`, `MOZ_APP_ID` compatibility kept deliberately per v1 Pitfall 1). A TOML entry that installs into Theia but not Firefox (or installs unsigned into a build that enforces signing) is a feature that demos on one side. **Prevention:** the declaration schema distinguishes the target runtime per entry; verification asserts presence-and-loaded on *both* runtimes where declared; a Firefox-side entry without a signing story fails at generate time. **Phase:** Extensions phase. (LOW-MEDIUM — the sibling was a STATE.md todo; Firefox add-on signing enforcement for forks is version-dependent and needs phase-level confirmation.)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Leave update URL / crash URL at Mozilla defaults "until the pipeline exists" | Installer phase ships faster | Users' crashes and update checks go to Mozilla under a fork identity; established behavior nobody revisits | **Never** — decide Pitfalls 1/7 first; "off" is a valid decision, "default" is not |
| `@latest` / unpinned extension entries | Green build today | Unreproducible builds; supply-chain exposure with no audit trail (Pitfall 5) | **Never** in committed config; fine in a local scratch config never used for packaging |
| `file:` / local-path extension pointing outside the repo | Uses the code at hand | Breaks hermetic builds, per-fixture tier-3, and every downstream checkout (Pitfall 5) | Only with the path inside the repo or `PB_CONFIG_DIR` + absence fails loudly |
| Theia backend opens profile SQLite directly | Fastest path to "tabs in SQL" | Profile corruption class failure (Pitfall 8) | **Never** — this is the one "never" in the milestone |
| SQL store "restores" tabs at startup | Demo restores tabs without touching sessionstore | Split-brain after every crash (Pitfall 9) | **Never** as authority; reconciliation toward sessionstore only |
| New `.sys.mjs` importing internals directly | Feature ships without boundary ceremony | Rebase debt + second boundary to guard (Pitfall 10) | **Never** — extend `PowerBrowserAPI`, catalogue it |
| Terminal "drills phase" for all carry-overs | Clean-looking roadmap | Drills get cut; surface grows uncovered (Pitfall 12) | **Never** — drills ride inside the phases that need them |
| Defer signing/notarization to "release hardening" | Avoids cert procurement now | PKG-01's exit gate can't pass without it; late discovery of identifier/issuer constraints (Pitfalls 1, 3) | Acceptable only if the unsigned-friction decision is recorded and the per-OS matrix still runs |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| AUS / update server | Serving Mozilla's `update.xml` shape from memory; hash/size mismatches | Generate `update.xml` from the actual MAR bytes (hash + size of the shipped file); one real N→N+1 hop per OS |
| MAR signing | Assuming `mach package` output is updatable | Own signing key compiled into updater, or updater built with `--enable-unverified-updates` + `DISABLE_UPDATER_AUTHENTICODE_CHECK`; recorded decision (Pitfall 1) |
| Windows maintenance service | Changing certs without updating `defines.nsi` issuer strings | Update issuer pins with the cert rotation; verify a background (non-admin) update hop, not just admin install |
| Open VSX at build time | `download:plugins` against live registry in the release path | Resolve-then-vendor; build consumes local bytes + hashes; `VSX_REGISTRY_URL` explicit (Pitfalls 5, 6) |
| `${targetPlatform}` plugins | One plugin set for all installer targets | Per-target resolution; assert bundled native arch == target arch (Pitfall 6) |
| Crash receiver | Accepting minidumps into an ungoverned bucket | Throttle at edge; scrub/retention policy before go-live; access groups for anything PII-bearing (Pitfall 7) |
| Endpoint allowlist | New update/crash/registry hosts not added to generated allowlist | Hosts flow from `[urls]`/`[telemetry]` through the generator; `verify-endpoints.sh` green before merge |
| Places API (bookmarks/history) | Raw SQL against `places.sqlite` from new code | Places API (`Bookmarks.jsm`/`History.jsm`) through the chrome-side boundary; respect the transaction queue (Bugs 1090961) |
| Session files | Reading/parsing `sessionstore*.jsonlz4` outside sessionstore | Treat as opaque; reconcile via restored session, never parse or write (Pitfall 9) |

---

## Performance Traps

*(v1 repurposed this section to build-time traps; v1.1 keeps that and adds runtime-data traps — the milestone's scaling axis is still build minutes + profile data growth, not users.)*

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Per-target installers multiply tier-3 builds | PKG-01 needs Linux + Windows + macOS artifacts; each is a full build + packaging-host run | Tier every installer check; cheap static gates (defines lint, manifest diff) in `--quick`, real-host matrix as the scheduled heavy run | At 3 targets × N fixtures — plan the matrix before promising dates |
| Tab-write volume hits the main thread | Session-store-style per-keystroke persistence ported naively to SQL; UI jank on tab switch | Batch + throttle writes (sessionstore's `TabStateFlusher` exists for this reason); write-behind with crash-safe reconciliation, never synchronous per-event commits | At browser-session scale (100+ tabs, rapid switching) — test with a tab-hoarder fixture profile |
| Unbounded tab/history row growth | Store grows forever; startup reconciliation scans balloon | Retention policy (closed-tab window, not infinite history); indexes on the join keys (registry URI); measure startup cost with a 10k-row fixture | Months of daily use, not days |
| Crash-receiver volume | One bad build's crash loop fills the disk / bill | Edge throttling + sampling rules from day one (Antenna's throttler is the model); alerts on rate spikes | First widely-distributed crash bug — i.e. the moment the pipeline is most needed |
| Extension download in the critical build path | Release build waits on registry latency or fails on outage | Vendored artifacts (Pitfall 6); registry fetch is refresh, not build | Release day |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Crash/minidump store without access control | URLs, emails, memory contents readable beyond the team; data-protection liability | Protected-data groups modeled on Socorro's (PII visible only to named roles); default-deny; retention + deletion policy (Pitfall 7) |
| Unpinned extension sources | Supply-chain injection into every downstream build | Exact pin + integrity hash per entry; lock artifact verified in CI; fail-loud on mismatch (Pitfall 5) |
| Updater verifying against Mozilla trust | Updates fail — or worse, a Mozilla-signed bit path is trusted by the fork | Own MAR key or explicit unverified-updates build config; no Mozilla update/crash hosts in packaged config (Pitfall 1) |
| Second SQLite writer on the profile | Corruption of bookmarks/history/session (data-loss class) | Single chrome-side writer invariant; static scan + soak test (Pitfall 8) |
| Token-gate bypass for new "local read" APIs | New tab/query endpoints added outside the credential gate | Every new backend endpoint inherits the `token-gate` fail-closed posture (SEC-01); no unauthenticated localhost APIs |

---

## UX Pitfalls

*(Users here: the person installing the browser, the person seeing the crash dialog, and the downstream rebrander. The UI-SPEC rule holds — no internal identifiers in user-facing text; every omitted identifier appears in diagnostics.)*

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Unsigned installer warnings with no explanation | SmartScreen/Gatekeeper fear screens; users abandon install | If shipping unsigned, the download page says so plainly with what to click; if signed, verify the publisher name reads as the product on each OS |
| Uninstaller leaves residue | Registry keys, profile associations, `.desktop` files point at a removed product; reinstall misbehaves | Per-OS uninstall-residue check in the installer exit gate (Pitfall 3) |
| Crash dialog promises a report pipeline that doesn't exist | "Send report" button that discards (or leaks) data; erodes trust | Dialog copy matches the TEL-04 rung actually shipped; if off, no send affordance — say what's collected, where it goes, retention, in one line + diagnostics link |
| Profile "lost" after rename/reinstall | User's data looks gone; support load; perceived data loss | Identity-field freeze (Pitfall 2) + first-run migration copy with plain-language progress and a diagnostics row mapping old→new paths |
| Tab restore silently drops tabs after crash | Research sessions vanish; the SQL feature gets blamed for sessionstore behavior | Reconciliation report: after abnormal shutdown, state what was restored / marked closed-by-crash; never silently discard (Pitfall 9) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Update hop, not just install:** N installed from the packaged installer, updated to N+1 through the shipped mechanism, on each OS. Install-only is half the feature (Pitfall 1).
- [ ] **No Mozilla network in the artifact:** packaged build's effective update/crash/telemetry endpoints enumerated; zero Mozilla hosts unless deliberately retained and documented (Pitfall 1, 7).
- [ ] **Alongside-Firefox install:** fork + stock Firefox installed together, launched interleaved; distinct profiles, correct single-instance routing per product (Pitfall 2).
- [ ] **Uninstall residue:** per-OS check after uninstall — no keys, no associations, no `.desktop`/plist residue (Pitfall 3).
- [ ] **Installer strings generated:** `branding.nsi` defines, plists, `.desktop` all byte-traceable to `configuration.toml` via `generate --check` (Pitfall 4).
- [ ] **Pins resolve offline:** packaging-host build with registry access cut succeeds from vendored bytes + hashes (Pitfalls 5, 6).
- [ ] **No `latest`, no floating ranges:** in committed config, lock artifacts, and docs (Pitfall 5).
- [ ] **Right-arch natives:** bundled platform-specific plugin binaries match each installer target's arch (Pitfall 6).
- [ ] **Crash path end-to-end:** forced crash → dialog copy correct → receiver stores per policy → PII access restricted → retention enforced (Pitfall 7).
- [ ] **No second SQLite writer:** static scan (no profile-DB opens outside `powerbrowser/shell/`) + soak test with `integrity_check` clean (Pitfall 8).
- [ ] **Crash-restart reconciliation:** kill -9 mid-session → restored set equals sessionstore's answer; SQL reconciles, nothing resurrected or duplicated (Pitfall 9).
- [ ] **Boundary intact:** `INTERNAL-APIS.md` diff covers every new Gecko touchpoint; boundary guard green with a red-proven control for the new surface (Pitfall 10).
- [ ] **Drills rode along:** release build, per-fixture tier-3, rebase-over-new-surface each tied to their phase — no orphan "drills phase" (Pitfall 12).
- [ ] **Rename fully re-pinned:** every display-form gate enumerated, each proven red against the other form, propagation proof re-run live (Pitfall 13).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Updater phones Mozilla / dead updater shipped (P1) | **HIGH — external** | Ship a fixed build via full-installer channel; users on the broken updater may never self-heal — plan an out-of-band update notice. Prevention is the only real control. |
| Profile collision shipped (P2) | **HIGH — user data** | Migration tool old→new profile paths + plain-language first-run copy; cannot un-corrupt interleaved writes, only separate futures. |
| Unsigned installer distributed (P3) | MEDIUM | Sign and re-release; reputation warnings decay once signed builds propagate. Registry/plist residue needs the fixed uninstaller. |
| Hand-edited installer strings (P4) | LOW | Fold into emitters; `generate --check` proves convergence; re-run rename slice over the unified surface. |
| Floating pins resolved badly (P5) | MEDIUM-HIGH | Pin to last-known-good + hash; audit what shipped in the window; rotate if compromise suspected. The lock artifact makes "last known good" answerable. |
| Wrong-arch plugins shipped (P6) | MEDIUM | Per-target re-release; add the arch assertion so it can't recur. |
| PII held without policy (P7) | **HIGH — legal** | Freeze access, write the retention/deletion policy late (with counsel), purge out-of-policy data, disclose if required. Nothing technical substitutes. |
| Profile DB corrupted by second writer (P8) | **HIGH — user data** | Remove the second writer; affected users restore from `*.corrupt` quarantine / backups; Places rebuilds history from scratch (bookmarks may be lost). |
| Split-brain tab state (P9) | MEDIUM | Declare authority retroactively; reconcile toward sessionstore; users re-close phantom tabs once. |
| Boundary bypassed (P10) | MEDIUM (grows with time) | Move the touchpoint behind `PowerBrowserAPI` + catalogue; cost compounds every ESR until done. |

---

## Pitfall-to-Phase Mapping

Descriptive phase names — the roadmap may number them differently. The ordering constraints below the table are the load-bearing part.

| # | Pitfall | Prevention Phase | Verification |
|---|---|---|---|
| 1 | Updater with no update story | Installer (decision gates phase) | Real N→N+1 hop per OS; zero Mozilla hosts in packaged config |
| 2 | Profile/remoting collision | Installer (+ NAME-01 slice) | Alongside-Firefox interleaved test; identity-field freeze assertion |
| 3 | Done-from-Linux installer | Installer | Per-OS install→launch→uninstall→no-residue matrix on real hosts |
| 4 | Installer strings outside generator | Installer (emitters first) | `generate --check` covers installer inputs; residual scan covers them |
| 5 | Floating extension pins | Extensions + crash | Offline-from-vendor packaging build; no `latest` anywhere committed |
| 6 | Wrong-arch / offline plugins | Extensions + installer matrix | Per-target arch assertion; plugin-activation smoke per target |
| 7 | Socorro-scope + PII | Extensions + crash (scope in questioning) | Rung decision recorded; PII/retention policy gates go-live; throttle present |
| 8 | Second SQLite writer | SQL tabs (invariant before schema) | Static no-open scan + interleaved soak with `integrity_check` clean |
| 9 | Two truths for open tabs | SQL tabs (authority table in design) | kill -9 restart reconciliation test |
| 10 | New Gecko touchpoints | SQL tabs (in-feature) + rebase drill inside the phase | `INTERNAL-APIS.md` covers all; guard red-proven on new surface |
| 11 | One schema for four histories | SQL tabs design | Separate domains; tabs own one table; others referenced by stable key |
| 12 | Drills staged forever | All phases (no terminal drills phase) | Each phase's exit gate names its drill; WINDOWS #13/#14 only in carry-over |
| 13 | Half re-pin | Installer (one-plan slice) | Every display-form gate red-proven against the other form |
| 14 | Layout conflated with tabs | SQL tabs design | Tabs restore with layout missing; layout fails soft with tabs present |
| 15 | Unversioned schema | SQL tabs implementation | `user_version` migrations vs fixtures; quarantine-not-delete corruption path |
| 16 | Two extension runtimes, one entry | Extensions | Per-entry runtime target; presence-and-loaded asserted on both runtimes |

**Ordering constraints:**

1. **Update-scope (P1) and crash-scope (P7) decisions precede their mechanisms.** Both are questioning outputs. A phase that starts building the pipeline before the rung is chosen builds the wrong rung.
2. **Installer emitters (P4) and pin schema (P5) precede first real-host / first vendored builds.** Generating after packaging means re-verifying everything twice.
3. **SQL-tabs invariants (P8 single-writer, P9 authority table) precede schema.** They are design inputs, not review findings.
4. **The rebase drill follows the SQL-tabs touchpoints (P10), inside that phase.** A drill run before the touchpoints land covers the old surface and certifies nothing.
5. **SQL tabs land before any GUI work.** PROJECT.md already orders this (GUI-02/05 deferred); the reason is now concrete — the bridge's join key (registry URI) and the authority table must exist before any chrome reads them, or the GUI bakes in the split-brain (P9).
6. **NAME-01 (P13) lands with the installer phase, not as its own late slice.** Installer artifacts are where display-form assertions multiply; renaming after installers are verified means re-verifying all of them.

**Phases likely to need their own deeper research:**

- **SQL-tabs phase — HIGH.** Storage-API choice (which Gecko storage interface the tab store builds on), Places API evolution at the pinned ESR, and Theia-side observation plumbing are all version-sensitive and unverified in this tree.
- **Installer phase — MEDIUM.** NSIS/DMG mechanics are documented, but per-OS signing/notarization requirements and the maintenance-service cert story need confirmation against the pinned ESR source, not (mostly older) web docs.
- **Extensions + crash phase — MEDIUM.** Open VSX resolution semantics and Firefox-side signing enforcement for the pinned versions need phase-level confirmation; TEL-04's rung decision needs real scoping, not research.
- **Carry-over drills — LOW.** Known work with known shapes; the risk is scheduling (P12), not discovery.

---

## Standing Invariants (v1, still in force)

Kept short — the full analysis was the v1 file. Violating any of these re-opens a v1 pitfall on top of the v1.1 work:

1. **Hook-only patches; never template a `.patch`** (v1 P4). SQL tabs and installer wiring both tempt build-logic patches — hook lines only, config lives outside `upstream/`.
2. **Silent patch no-op guard travels with the stack** — `apply-patches.sh` non-vacuity assertion + `--self-test`, red-proven, on every new patchsurface (v1 P4).
3. **Verify artifacts, not the manifest** (v1 P6/P7) — installer and plugin checks observe installed bytes, running processes, and live registries; descriptor-per-target + coverage guard for the per-OS matrix.
4. **Fail-closed identity; echo defaults** (v1 P5) — `[identity]`/`[legal]` required keys stay required through NAME-01; every defaulted cosmetic key echoed at generate time.
5. **Residual-brand + trademark gates stay green and human** (v1 P8/P14) — installer inputs join the scan scope; the human ritual re-runs over new brand surfaces (installer banners, DMG background, crash dialog).
6. **Token-gate fail-closed extends to new endpoints** (SEC-01) — tab-query/crash-status APIs inherit it; `verify-dev-flag-off` stays red-provable.
7. **No second GUI chrome** — v1.1 does no GUI work; nothing in SQL tabs may assume or smuggle presentation (GUI-04 bridge stays landable).

---

## Confidence by Area

| Area | Confidence | Basis |
|---|---|---|
| Updater/MAR/maintenance-service mechanics (P1) | **MEDIUM** | Official MDN-archive update-server doc + `update-programs.configure` source + Bugs 1079858/1205843 cross-check; not verified against the pinned ESR tree — installer phase must confirm |
| Profile/remoting/rename hazards (P2, P13) | **HIGH** | Live tree (`components.conf` sort-key comment, `[identity]` schema decision) + v1 Pitfalls 2/3/12/22 verified against `upstream/` Gecko source |
| Real-host installer requirements (P3, P4) | **MEDIUM** | NSIS/branding sources + WR-04/WR-07 repo precedent; signing/Gatekeeper specifics are stable industry knowledge but host-dependent |
| Extension pinning/lockfile gap (P5, P6) | **MEDIUM** | Theia PR #8864 (closed unimplemented) + PRs #12410/#13825/#16774 + npm lockfile docs; all primary sources, mutually consistent |
| Crash pipeline scope/PII (P7) | **MEDIUM** | Socorro docs + repo statement declining external users + Breakpad POST spec + crash-pings-vs-reports distinction (Mozilla-authored); alternatives list is maintainer-sourced |
| SQLite second-writer corruption (P8) | **MEDIUM-HIGH** | 2026 SQLite-forum corruption report + Bugs 627936/1090961/1359887 + Bug 2040253 WAL-checkpoint failure; mechanism consistent across all; not reproduced in this tree (must not be) |
| Sessionstore authority/divergence (P9, P11) | **MEDIUM** | `SessionFile.sys.mjs` source (load order, version gating) + Bugs 1906808/1983990 + session-restore source docs; ROADMAP 999.1 three-migrations framing is in-repo |
| Rebase-boundary fragility (P10) | **HIGH** | Repo-enforced boundary (`check-internals-boundary.sh`, `INTERNAL-APIS.md`, WINDOWS #13) + hook-only patch precedent; prediction about SQL-tab temptation is inference (marked) |
| Trademark for distributed installers | **MEDIUM** | Current `mozilla.org` distribution-policy + trademark-policy primary text (stronger than v1's LOW — now read directly, not archived); not legal advice |

---

## Gaps

- **Pinned-ESR confirmation outstanding.** Updater flags, maintenance-service issuer defines, sessionstore load order, and Places WAL behavior were verified against upstream *main*/recent sources, not the pinned ESR tag in `upstream/`. The installer and SQL phases must re-confirm each against the actual tag — behavior drifts across ESRs.
- **Firefox-side extension signing enforcement** for the pinned ESR is unresolved (P16) — needs a phase-level check, since enforcement policy is version-dependent.
- **TEL-04's rung is a scoping decision, not a researchable fact.** This file argues the ladder; questioning must pick the rung.
- **No packaging host exists yet.** Every per-OS claim above is unverified until PKG-01 names hosts and runs the matrix.
- **Tab-store storage API unchosen.** Which Gecko storage interface (Sqlite.jsm, Storage service, IndexedDB-backed, plain file) hosts tab rows is the SQL phase's HIGH-priority research question — deliberately not pre-decided here.

---

## Sources

**Primary — read directly (HIGH):**
- `/home/chris/coding/Power-Browser` live tree: `patches/`, `powerbrowser/shell/{components.conf,jar.mn,moz.build}`, `theia/extensions/tab-uris/src/browser/tab-uri-registry.ts`, `scripts/verify-registry-shape.mjs`, `configuration.toml`, `.planning/{PROJECT,ROADMAP,REQUIREMENTS,NEXT-MILESTONE-INPUTS}.md`
- Gecko `upstream/` (via v1 research, re-cited): `js/moz.configure` (`MOZ_APP_NAME` derivation), `toolkit/moz.configure` (remoting default), `browser/branding/branding-common.mozbuild` (five-PNG contract)

**Official docs + source (MEDIUM, cross-checked):**
- [Setting up an update server (MDN archive)](http://udn.realityripple.com/docs/Mozilla/Setting_up_an_update_server) · [`build/moz.configure/update-programs.configure`](https://github.com/spsforks/mozilla-firefox-firefox/blob/main/build/moz.configure/update-programs.configure) · [Session Restore source docs](https://firefox-source-docs.mozilla.org/browser/components/sessionstore/docs/index.html) · [`SessionFile.sys.mjs`](https://raw.githubusercontent.com/mozilla-firefox/firefox/main/browser/components/sessionstore/SessionFile.sys.mjs) · [Firefox Crash Reporting source docs](https://firefox-source-docs.mozilla.org/crash-reporting/index.html) · [Socorro overview](https://socorro.readthedocs.io/en/latest/overview.html) · [Breakpad crash-report spec](https://github.com/mozilla-services/socorro/blob/210b2d65/docs/spec_crashreport.rst) · [Crash pings vs crash reports (Will Kahn-Greene)](https://bluesock.org/~willkg/blog/mozilla/crash_pings_crash_reports.html) · [Socorro repo (external-use statement + alternatives)](https://github.com/mozilla-services/socorro)
- [Distribution Policy for Mozilla Software](https://www.mozilla.org/en-US/foundation/trademarks/distribution-policy/) · [Mozilla Trademark Guidelines](https://www.mozilla.org/en-US/foundation/trademarks/policy/) · [Partnering/Open Source Distributions (MozillaWiki)](https://wiki.mozilla.org/Partnering/Open_Source_Distributions)
- [Theia extensions docs](https://theia-ide.org/docs/extensions/) · [Installing VS Code extensions in Theia](https://theia-ide.org/docs/user_install_vscode_extensions/) · [Theia PR #8864 (plugins.lock — closed)](https://github.com/eclipse-theia/theia/pull/8864) · [Theia PR #12410 (`${targetPlatform}` CLI)](https://github.com/eclipse-theia/theia/pull/12410) · [Theia PR #13825 (`targetPlatform` resolver)](https://github.com/eclipse-theia/theia/pull/13825) · [Theia PR #16774 (built-ins leave Open VSX)](https://github.com/eclipse-theia/theia/pull/16774)
- [Bug 1205843 (maintenance-service SHA-2 pin)](https://bugzilla.mozilla.org/show_bug.cgi?id=1205843) · [Bug 1079858 (SHA-1 deprecation)](https://bugzilla.mozilla.org/show_bug.cgi?id=1079858) · [Bug 1090961 (concurrent Sqlite transactions)](https://bugzilla.mozilla.org/show_bug.cgi?id=1090961) · [Bug 627936 (exclusive locking rejected)](https://bugzilla.mozilla.org/show_bug.cgi?id=627936) · [Bug 1359887 (WAL checkpoint deadlock)](https://bugzilla.mozilla.org/show_bug.cgi?id=1359887) · [Bug 1906808 (skeleton session vs `previous.jsonlz4`)](https://bugzilla.mozilla.org/show_bug.cgi?id=1906808) · [Bug 2040253 (WAL never checkpoints, bookmark writes silently fail)](https://bugzilla.mozilla.org/show_bug.cgi?id=2040253) · [Bug 573492 (WAL journaling for places)](https://bugzilla.mozilla.org/show_bug.cgi?id=573492)
- [SQLite forum: concurrent-access corruption across sandboxed processes sharing a profile](https://sqlite.org/forum/info/a9ee12e5f36adc13da1f59b1912753ba08d87c596eb6cb2f1d3882270) · [npm package-lock.json docs](https://docs.npmjs.com/cli/v12/configuring-npm/package-lock-json/) · [Version pinning, lockfiles, reproducible builds (sscsecurity.dev)](https://sscsecurity.dev/book2/chapter-13/ch-13.2/)
- [NSIS `branding.nsi` (official)](https://searchfox.org/mozilla-central/source/browser/branding/official/branding.nsi) · [NSIS `installer.nsi`](https://searchfox.org/firefox-main/source/browser/installer/windows/nsis/installer.nsi)

---
*Pitfalls research for: v1.1 Hardening and SQL Tabs (installers, extensions/crash pipelines, SQL tab stores on a Firefox-ESR + Theia platform)*
*Researched: 2026-09-04*
