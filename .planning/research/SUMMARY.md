# Project Research Summary

**Project:** Power Browser — v1.1 Hardening and SQL Tabs
**Domain:** Rebrandable browser platform (Firefox-ESR patch-stack fork + Eclipse Theia sidecar)
**Researched:** 2026-09-04
**Confidence:** HIGH overall (tree-derived claims + canonical upstream docs; gaps enumerated below)

## Executive Summary

Power Browser v1.1 hardens distribution (real Windows/macOS installer builds, npm/local-path extension sources, a crash-report pipeline) and promotes SQL-backed tabs ahead of all GUI work. Experts build each of these by reusing upstream machinery rather than inventing parallel systems: Mozilla's `mach package`/`mach repackage` for installers, Theia's existing `theiaPlugins` fragment pipeline for new extension source kinds, a Breakpad-protocol-compatible minimal collector instead of full Socorro, and Mozilla's own `Sqlite.sys.mjs` plus one new `tabs.sqlite` file for tab storage.

The recommended approach is three phases in dependency order: Phase 08 installer hardening with the NAME-01 canonical-`PowerBrowser` rename slice folded in (every installer surface embeds the name, so renaming after packaging proofs would invalidate them), Phase 09 extensions + crash pipeline (both reuse the hardened generator/verification loop and both touch the endpoint allowlist, so they land under one review), Phase 10 SQL tabs last with zero presentation changes. Every v1 carry-over drill rides inside the phase that needs it — release build with installers, per-fixture tier-3 with extensions, live ESR rebase over the new SQL touchpoints — because a terminal "drills phase" is the first thing cut under schedule pressure.

The key risks are all second-machine failures: an updater that phones Mozilla or dies silently, profile/remoting collisions exposed only alongside stock Firefox, floating extension pins that resolve differently next month, and a second SQLite writer that corrupts the profile. Each is mitigated by a decision-first gate (update story and crash rung are questioning outputs that precede any mechanism), an authority/invariant table written before schema or code (single chrome-side writer, sessionstore authoritative for restore, registry URIs as join keys), and verification biased toward second-machine, second-profile, second-month checks.

## Key Findings

### Recommended Stack

Two new npm dependencies total (`better-sqlite3@13.0.3`, `@sentry/node@10.73.0`) and zero new build-system dependencies. Everything else is host tooling on packaging machines or machinery already in the tree. ESR stays on the 153 line (one-minor re-pin via existing uptake tooling, not a stack decision); Theia stays at 1.74.1 (no framework bump inside a hardening milestone).

**Core technologies:**
- `Sqlite.sys.mjs` (in-tree, ESR 153) — Gecko chrome-side SQLite writer for the new `tabs.sqlite`; the promise wrapper every first-party consumer already sits on — zero new deps, profile-dir-aware, WAL-capable
- `better-sqlite3@13.0.3` — Theia Node-backend SQLite **readonly** reader; exact pin, prebuilds cover Node 22, call shape mirrors `node:sqlite` so a future stdlib swap is mechanical (see reconciliation below)
- `@sentry/node@10.73.0` + self-hosted Sentry 26.8.0 (or SaaS) — sidecar crash/error capture behind the existing `[telemetry]` level gate; platform carries only the DSN, never collector infra
- NSIS 3.12 + Windows SDK (`MAKEAPPX`/`SIGNTOOL`) + macOS `hdiutil`/`iconutil` — packaging-host tools only; nothing enters the repo or flake
- Generator-owned `ExtensionSettings` policy emission + npm-exact/`file:` extension resolution through the existing `theiaPlugins` fragment pipeline — no new tooling, no second packaging system

**Stack reconciliation — `better-sqlite3` vs `node:sqlite` (decided):** the architecture researcher preferred the Node 22 built-in `node:sqlite` (no native addon, no `yarn.lock` delta); the stack researcher pinned `better-sqlite3@13.0.3` and rejected `node:sqlite`. **Recommendation: `better-sqlite3@13.0.3`, readonly, for v1.1.** Rationale: `node:sqlite` is Stability 1.2 / Release Candidate on the pinned Node 22 line with API shifts across 22.x minors (`column()`/session/`location()` landed mid-line) — a platform that pins exact versions cannot build on a moving stdlib surface. The native-addon objection is already answered in-tree: prebuilds cover `NODE_MODULE_VERSION` 127 and the `theia` dev shell carries the node-gyp fallback toolchain (the `drivelist` precedent). The call shapes are deliberately similar, so revisit `node:sqlite` at the next Node re-pin as a mechanical swap. One line in the backend reader carries a `ponytail:` comment marking that ceiling.

**SQLite access reconciliation (STACK readonly-backend vs PITFALLS never-open):** Pitfall 8's strict rule is preserved in substance — *no Theia-side process ever opens `places.sqlite` or `sessionstore` files, read or write* (WAL `-shm` coordination makes even readers hazardous, and profile-lock defeat is a corruption story). The sanctioned design is: all tab writes go through `PowerBrowserAPI.sys.mjs` → chrome-side `Sqlite.sys.mjs` (single writer); tab data lives in its **own `tabs.sqlite`** (own WAL, decoupled checkpoint/vacuum, a tab bug can never take bookmarks down); the backend's `better-sqlite3` handle on that dedicated file is `readonly: true`; verification keeps the static no-`sqlite`-open scan (forgiving only the dedicated-file readonly reader) plus an interleaved-write soak asserting `PRAGMA integrity_check` stays clean. Details in STACK.md and PITFALLS.md Pitfall 8.

### Expected Features

v1.1 covers exactly four areas — PKG-01 installers, EXT-02 extension sources + WebExtensions declaration, TEL-04 crash pipeline, SQL-01 SQL tabs. GUI-02/GUI-05 are explicitly deferred until after SQL tabs (2026-09-04 scoping). See FEATURES.md for the full landscape, dependency graph, and prioritization matrix.

**Must have (table stakes):**
- Full branding-dir file set emitted + real `mach package` builds on Windows/macOS packaging hosts + `docs/BUILD.md` installer procedure, with WR-04 (reject bare `$VAR` in NSIS defines) and WR-07 (fixture root through installer verifier) as pre-fixes before the first real-host build
- NAME-01 rename slice (`PowerBrowser` canonical) folded into installer work with every display-form gate re-pinned — not a late standalone slice
- EXT-02 `npm` source kind (generate-time resolve to pinned tarball URL + hash into the existing `theiaPlugins` chain) and `local-path` kind (repo- or `PB_CONFIG_DIR`-relative, hashed, fail-loud on absence)
- WebExtensions declaration sibling: one mechanism — **default hypothesis `distribution/policies.json` `ExtensionSettings`** (the policy Mozilla is actively improving; confirm against the pinned ESR surface in phase research) — schema + emitter + verifier, no curated list in tree (REQUIREMENTS.md bar)
- TEL-04 rung for v1.1: **Gecko reporter stays compiled out; ship the server side** — minimal Antenna-protocol collector (multipart POST with `upload_file_minidump` → `CrashID=`), `about:crashes` acceptance, crash-ping/report separation kept, PII/retention/throttle policy written before go-live
- SQL-01 live-tab table keyed on `TabUriRegistry` URIs (registry → SQL write-through only) + places read exposure + sessionstore read projection + private-browsing exclusion with absence test + query API home on `@powerbrowser/tab-uris` (extension point, never a `[features]` flag)
- Update-story decision recorded as the installer phase's first output (fork-hosted updates / no in-place updates / OS-package updates — no fourth option by omission), with zero Mozilla hosts in packaged config

**Should have (competitive):**
- Single-manifest propagation into NSIS + DMG + MSIX surfaces (nearly free once the generator owns the emitters — the installer half of the single-file claim)
- Per-fixture installer verification staged for packaging hosts (build script + assert script a human runs; full CI with Windows/macOS runners is the later form)
- Minimal collector shipped as downstream-runnable platform tooling (same status as `scripts/`)
- Cross-surface joins (tabs ⋈ history ⋈ bookmarks on URL) and queryable closed-tab retention with a bounded retention policy from day one
- Unified `[[extensions]]` with explicit `side = "theia" | "gecko"` key — design alongside EXT-02, land after

**Defer (v2+):**
- Stub installer, Maintenance Service, MSIX build/sign — trigger: real users downloading at volume (generate `msix/` branding slots as inert files only if cheap)
- Symbol upload wiring, processor-side crash analysis — trigger: crash volume or the reporter-client re-enable decision (itself a later milestone of privacy surface)
- SQL → registry write-back (restore/reopen from SQL) — trigger: GUI-02 landing as the consumer
- Full Socorro deployment — never at v1.1 scale; revisit on crash-volume evidence
- Replacing sessionstore or `places.sqlite` write paths — never without a dual-write + restore-parity proof

### Architecture Approach

v1.1 adds surfaces, not layers: `configuration.toml` gains additive keys only, `generate.mjs` gains emitters + `TARGETS` rows, verification gains registry rows, and three of four features land as `@powerbrowser/*` extensions plus generated fragments. The Gecko patch stack stays at two hook-only patches, `PowerBrowserAPI.sys.mjs` stays the sole internals touchpoint, and the SQL store lives *beside* `TabUriRegistry` as a new `tab-store` extension consuming URI strings as opaque keys — never inside the registry, never behind a `[features]` flag, never touching presentation. See ARCHITECTURE.md §§1–8.

**Major components:**
1. Generator fan-out (`generate.mjs` + frozen `TARGETS`) — all derivation; every new emitter adds a row so `--check` and derive-and-compare gates cover it with no further edits
2. `@powerbrowser/tab-store` (new extension) — backend SQLite service + frontend URI-keyed API; DB filename and schema version are fixed platform content, not manifest keys
3. Extended `theiaPlugins` fragment pipeline — EXT-02 npm/local-path kinds resolve *into* the v1 URL/hash chain; `verify-extension-pins.mjs` grows per-kind archive handling
4. Theia-side crash events via the existing `PowerBrowserTelemetrySender` (`sendErrorData`, level-`crash` admission) — no second sender; Gecko repoint derivation stays honest
5. `verify-platform.sh` (one driver, one `CHECKS` registry) — new gates append rows only: SQL roundtrip, installer build-proof (full-mode only), WebExtensions agreement, crash-pipeline agreement; every gate derives expectations from the generator and self-tests in both directions

### Critical Pitfalls

Full analysis (10 critical, 6 moderate, debt patterns, "looks done" checklist) is in PITFALLS.md. The five that shape the roadmap:

1. **Updater with no update story (P1)** — installer that installs but phones Mozilla for updates or dies silently; MAR verification assumed away; maintenance-service cert pin goes stale. Avoid: record one of three decisions (fork-hosted / none / OS-package) before mechanism; prove one real N→N+1 hop per OS.
2. **Profile/remoting collision + rename-triggered migration (P2)** — NAME-01 must change display strings only; `basename`/`binary_name`/remoting frozen. Avoid: identity-field freeze assertion + alongside-Firefox interleaved launch test as installer-phase exit criteria.
3. **Second SQLite writer (P8)** — Theia backend opening profile SQLite corrupts it (WAL/`-shm` + profile-lock precedent). Avoid: single chrome-side writer invariant before schema; own `tabs.sqlite`; static no-open scan + soak test. This is the milestone's one absolute "never."
4. **Two truths for open tabs (P9)** — SQL mirror vs sessionstore split-brain after abnormal shutdown (skeleton-session Bug 1906808 class). Avoid: authority table in writing before building — sessionstore restores, SQL reconciles toward it, registry URIs are the join key; prove with a kill -9 restart test.
5. **Drills staged forever (P12)** — release build, per-fixture tier-3, live rebase, re-pin all carried; a terminal drills phase gets cut. Avoid: each phase carries its own drill; the carry-over bucket holds only WINDOWS #13/#14.

## Implications for Roadmap

### Phase 08: Installer hardening + NAME-01

**Rationale:** Every installer surface embeds the display/identity names — verifying installers under the old spaced form then re-pinning doubles the packaging-host work, so the rename rides here, first. Gates must discriminate before binaries exist, so WR-04/WR-07 pre-fixes come before the first real-host run.
**Delivers:** WR-04 + WR-07 pre-fixes; NAME-01 propagation with all display-form gates re-pinned; full branding-dir file set; real `mach package` builds on named Windows + macOS hosts; per-OS install→launch→uninstall→no-residue matrix; update-story decision recorded; `docs/BUILD.md` installer procedure with attributed timings; `objdir-release` carry-over build.
**Addresses:** PKG-01, NAME-01, WR-04/WR-07, signing decision, release-build drill.
**Avoids:** Pitfalls 1 (updater), 2 (profile collision), 3 (done-from-Linux), 4 (strings outside generator), 13 (half re-pin).

### Phase 09: Extensions + crash pipeline

**Rationale:** Builds directly on 08's hardened generator/verification loop — new source kinds reuse the exact emitter→fragment→block→hash pipeline EXT-01 proved. Crash work is mostly agreement plumbing (prefs + allowlist + sender call sites), so it pairs cheaply with the resolver work; both touch `endpoint-allowlist.json` and land under one allowlist review.
**Delivers:** EXT-02 npm + local-path kinds (pinned, fail-loud, per-kind self-tests); WebExtensions declaration via `ExtensionSettings` (mechanism confirmed against pinned ESR in phase research); vendored/mirrored artifacts with offline-from-vendor packaging proof; per-target `${targetPlatform}` arch assertions; TEL-04 minimal Antenna-protocol collector + `about:crashes` acceptance + ping/report separation + PII/retention/throttle policy; Theia re-pin proof + per-fixture tier-3 over the new source kinds as the riding drills.
**Uses:** `better-sqlite3`/`@sentry/node` pins resolved (stack), `theiaPlugins` chain (architecture), pin/registry-host mechanics (pitfalls 5–6).
**Implements:** Extended extension pipeline, crash agreement gate, allowlist rows for collector/crash/registry hosts.
**Avoids:** Pitfalls 5 (floating pins), 6 (wrong-arch/offline plugins), 7 (Socorro-scope + PII), 16 (two runtimes, one entry).

### Phase 10: SQL tabs (no GUI)

**Rationale:** Depends on a stable registry (untouched by 08/09 by construction) and on the verification discipline 08/09 exercise — its gate is the most behaviorally novel. Landing persistence before any presentation is the PROJECT.md ordering: GUI-02/GUI-05 then build on rows, not wishes.
**Delivers:** `tab-store` extension (chrome-side `Sqlite.sys.mjs` writer, `better-sqlite3` readonly backend reader, own `tabs.sqlite` with `schema_version` from day one); registry→SQL write-through; places read exposure; sessionstore read projection; private-browsing exclusion + absence test; query API on `@powerbrowser/tab-uris`; authority table + single-writer invariant recorded before schema; kill -9 reconciliation test; `user_version` migrations + quarantine-not-delete corruption path; **live ESR rebase drill over the new touchpoints as the phase's closing task**; registry-shape gate green untouched as proof the bridge stayed landable.
**Addresses:** SQL-01 (backlog 999.1), rebase-drill carry-over.
**Avoids:** Pitfalls 8 (second writer), 9 (split-brain), 10 (rebase debt), 11 (one schema for four histories), 14 (layout conflated), 15 (unversioned schema).

### Phase Ordering Rationale

- **Rename-with-installers:** installer artifacts multiply display-form assertions; renaming after verification means re-verifying all of them (FEATURES dependency notes, Pitfall 13).
- **Extensions-after-generator-hardening:** EXT-02 reuses the EXT-01 fragment chain — it needs the hardened emitter/verifier loop from 08, not a parallel greenfield pipeline.
- **SQL-last-before-GUI:** the bridge join key (registry URI) and the authority table must exist before any chrome reads them, or GUI-02 bakes in the split-brain (Pitfall 9, ordering constraint 5).
- **Drills ride inside phases:** installer phase runs the release build it needs; extensions phase runs per-fixture tier-3 over the new source kinds; SQL phase closes with the live rebase over its touchpoints. WINDOWS #13 (boundary hole) + #14 (BiDi double-window) ride alongside 08–09 — the boundary must be airtight before a persistence layer keys user data off chrome-adjacent identity.
- **Decisions precede mechanisms:** update-scope (P1) and crash-scope (P7) rungs are questioning outputs; SQL invariants (P8/P9) are design inputs, not review findings.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-plan-phase --research-phase <N>`):
- **Phase 10 (SQL tabs) — HIGH.** Storage-API choice (which Gecko storage interface hosts tab rows), Places API evolution at the pinned ESR, and Theia-side observation plumbing are version-sensitive and unverified in this tree. Also re-confirm sessionstore load order, Places WAL behavior, and updater/maintenance-service defines against the **pinned ESR tag**, not upstream main.
- **Phase 08 (installers) — MEDIUM.** NSIS/DMG mechanics are documented, but per-OS signing/notarization requirements and the maintenance-service cert story need confirmation against pinned ESR source.
- **Phase 09 (extensions + crash) — MEDIUM.** Open VSX resolution semantics and Firefox-side add-on signing enforcement for the pinned versions need phase-level confirmation; TEL-04's rung needs scoping (questioning decision), not research.

Phases with standard patterns (skip research-phase):
- **Carry-over drills (release build, Theia re-pin, WINDOWS #13/#14 fixes)** — known work with known shapes; risk is scheduling, not discovery.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against npm registry, Mozilla source docs, and release feeds this session; integration points read from the live tree. `node:sqlite`-vs-`better-sqlite3` conflict resolved above with a revisit trigger. Collector-operability MEDIUM — needs the TEL-04 live drill. |
| Features | MEDIUM-HIGH | Canonical upstream docs read verbatim (installer, DMG, crash protocol, `theiaPlugins`, places, sessionstore, policies) + local tree reads; effort estimates and DS_Store-maintenance burden are judgment. |
| Architecture | HIGH (as-is) / MEDIUM (to-be) | Every as-is claim derived from first-party tree reads at pinned paths; to-be layout is design inference against those constraints, not executed work. |
| Pitfalls | HIGH (tree-derived) / MEDIUM (web, cross-checked) | Pinned-ESR confirmation outstanding for updater flags, sessionstore load order, Places WAL, and extension-signing enforcement — each flagged to its phase. |

**Overall confidence:** HIGH for direction and phase structure; MEDIUM for per-OS installer mechanics and crash-collector operability until real hosts and a live collector drill exist.

### Gaps to Address

- **No packaging host exists yet.** Every per-OS installer claim is unverified until Phase 08 names hosts and runs the matrix — handle by making the matrix the phase exit gate, never a follow-up.
- **Pinned-ESR drift.** Updater flags, maintenance-service issuer defines, sessionstore load order, Places WAL behavior verified against upstream main/recent sources — Phase 08/10 must re-confirm against the actual pinned tag.
- **Firefox-side extension signing enforcement** for the pinned ESR is unresolved — Phase 09 confirms before schema freezes.
- **Tab-store storage API unchosen** (which Gecko interface hosts tab rows) — Phase 10's HIGH-priority research question, deliberately not pre-decided here.
- **TEL-04 rung and update story are scoping decisions**, not researchable facts — questioning picks the rung; the decision gates its phase.

## Sources

### Primary (HIGH confidence)

- Local tree reads: `scripts/generate.mjs`, `scripts/verify-{installer-schema,extension-pins,theia-endpoints,registry-shape}.mjs`, `scripts/verify-platform.sh`, `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, `powerbrowser/INTERNAL-APIS.md`, `powerbrowser/endpoint-allowlist.json`, `powerbrowser/distribution/policies.json`, `theia/extensions/tab-uris`, `theia/extensions/telemetry`, `configuration.toml` — via STACK.md / ARCHITECTURE.md
- npm registry metadata: `better-sqlite3` 13.0.3, `@sentry/node` 10.73.0, `smol-toml` 1.8.0, `sharp` 0.35.4; Node.js docs (`node:sqlite` Stability 1.2 RC) — via STACK.md
- Firefox Source Docs: MSIX packaging, Windows installer kinds, macOS DMG + `UpdatingMacIcons`, Places architecture, sessionstore, crash reporter; `toolkit/modules/Sqlite.sys.mjs` header; ESR 153.0/153.2 release notes; Theia v1.74.1 releases; Firefox enterprise `ExtensionSettings`/`policies.json` docs — via STACK.md / FEATURES.md
- Socorro README (declines external users) + `mini-breakpad-server` archived status; getsentry/self-hosted 26.8.0 — via STACK.md
- Firefox installer/DMB/crash/`theiaPlugins`/places/sessionstore/policy sources read verbatim (full URL list in FEATURES.md Source Confidence + Sources)

### Secondary (MEDIUM confidence)

- MDN-archive update-server doc, `update-programs.configure`, maintenance-service Bugs 1205843/1079858; SQLite-forum WAL corruption report + Bugs 627936/1090961/1359887/2040253; sessionstore Bugs 1906808/1983990; Theia PRs #8864/#12410/#13825/#16774; Mozilla distribution-policy/trademark text — all cross-checked across official docs + Bugzilla + source (PITFALLS.md)
- libicns 0.8.1 (Linux icns smoke-check fallback only); self-hosted Sentry operability — MEDIUM, flagged to live drills

### Tertiary (LOW confidence)

- Firefox-side add-on signing enforcement for the pinned ESR (version-dependent, needs Phase 09 confirmation); per-OS signing/Gatekeeper host specifics before packaging hosts exist — both recorded as phase research items, not assumed.

---

*Research completed: 2026-09-04*
*Ready for roadmap: yes*
