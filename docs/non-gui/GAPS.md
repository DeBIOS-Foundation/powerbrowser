# PowerBrowser non-GUI gaps

Source: four read-only audits run 2026-09-25 from GUI-research (tab SQL store; AI backend Phase 16;
v1.3 internals; v1.0–v1.2 platform), checked against HEAD `b9412fa` plus the uncommitted working
tree. Each row states the behaviour the docs promise; the evidence names where the code falls
short. Abbreviations: PBA = `powerbrowser/shell/PowerBrowserAPI.sys.mjs`, TQS =
`theia/extensions/tab-uris/src/node/tab-query-service.ts`, OC = `theia/extensions/backend-opencode/src/`.

Rows are imported into `ledger/REQUIREMENTS.json` with `ledger-amend.py import-brainstorm`. Only you
drop or defer a row.

## Requirements

### Wave A: tab identity and store

- **NG-001** Every tab row (stock tab, in-shell web tab, editor, terminal) is keyed by the tab's stable registry URI, not by its page URL; the page URL is a column, and one key rule holds for all tab kinds. Evidence: PBA:780 keys stock tabs `webview:`+URL, PBA:2479 keys overlays by bare URL, docs/URI-SCHEMES.md:250-254, `webview:` is also the plugin-panel scheme (URI-SCHEMES.md:211-229).
- **NG-002** Navigating a tab keeps its row: group_id, x/y, ord and thumbnail survive a link click. Evidence: `onLocationChange` deletes the old row and inserts a new one (PBA:2473-2480, 1078-1092).
- **NG-003** Two tabs on the same page URL have two rows. Evidence: URI-SCHEMES.md:250-254.
- **NG-004** A New Tab opened with "+" and no URL has a row; setTabGroupId, setTabPosition and setGroupOrder work on it, and a mutation on an unknown URI returns an error instead of doing nothing. Evidence: PBA:2463-2466 writes no row; PBA:995, 1046 return silently.
- **NG-005** The 7-day prune never deletes the row of a tab that is open, in-shell tabs included. Evidence: the prune's live set holds only `webview:` keys (PBA:2038, 2253, 177).
- **NG-006** Close Group closes the group's in-shell web tabs as well as its stock tabs, as its dialog says. Evidence: `closeGroupRows` matches `webview:<url>` only (PBA:1348-1378, 1470, 1578); group-model.ts:636-663 and organising-widget.ts:382-417 never close the WebTabWidget.
- **NG-007** Editors, terminals and other non-web tabs keep their group and canvas position across a restart. Evidence: keyed `session:<widget.id>` and held in memory only (group-model.ts:80-93, 575-600; organising-widget.ts:345-354; uncommitted).
- **NG-008** A Panorama card for a tab that is not open reopens that tab through the opener; a card for an open tab activates it. Evidence: URI-SCHEMES.md:240-246; uncommitted `dive()` only activates open widgets (organising-widget.ts:1936-1950).
- **NG-009** Each row records content age: when the tab was created and when it was last accessed (from sessionstore `lastAccessed`), separate from "last seen open". Evidence: only `last_active`, set to `Date.now()` for every open tab on each sweep (PBA:2101); notes/tab-sql-substrate.md "Age is a first-class column".
- **NG-010** Closing a tab keeps its row as closed-tab history (`closed_at`) under a retention setting, and sessionstore `_closedTabs` are projected into it. Evidence: TabClose deletes the row (PBA:2283); the parser reads open tabs only (PBA:2085-2104); research/FEATURES.md Area 4.
- **NG-011** A settings table in tabs.sqlite holds restore behaviour and age tiers, and the restore path reads them. Evidence: only `tabs` and `groups` DDL exist (PBA:51, 66); notes/tab-sql-substrate.md.
- **NG-012** The Theia reader checks `user_version` and reports errors instead of returning an empty list. Evidence: TQS:198-249.
- **NG-013** An unopenable tabs.sqlite is quarantined and rebuilt, as MIGRATIONS.md:53 says. Evidence: `ensureTabStore` returns "degraded" before the tripwire runs (PBA:2211-2215); quarantine needs an open connection (PBA:2146).
- **NG-014** The quarantine rebuild creates the head schema, not v2. Evidence: the rebuild runs the v1 and v2 migrations only (PBA:2183, 2189); TQS `getGroupTabs` then returns `[]` (TQS:265).
- **NG-015** A check runs the real migration code from fixture databases at every earlier version to head (v1→head, v2→head, v3→head). Evidence: exercise-migrations.mjs covers v1; v2 only through a `node:sqlite` re-implementation; v3 and v4 have none.
- **NG-016** The gui08-persistence-roundtrip quick check passes against the current schema head. Evidence: `EXPECTED_SCHEMA_HEAD = 2` (scripts/verify-gui08-persistence-roundtrip.mjs:60, 245) against head 4 (PBA:50).
- **NG-017** The SQL-05 round-trip check restarts the real browser and compares the restored tabs with sessionstore. Evidence: verify-sql-store-roundtrip.mjs replays over temp DBs with `CHAIN_HEAD = 1` (:33).
- **NG-018** The runtime runs a full `PRAGMA integrity_check` on a schedule, as SCHEMA.md:200-201 says. Evidence: only a startup `quick_check` (PBA:2064).
- **NG-019** SCHEMA.md and MIGRATIONS.md document every schema version up to head, and docs/ has a tabs.sqlite page covering schema, keys and retention. Evidence: .planning/milestones/v1.2-phases/11-sql-store-design/schema/ covers v1; v3/v4 exist only as comments (PBA:83-88).
- **NG-020** The absence instrument confirms the startup wiring by the call itself, not by a text pattern a comment would also satisfy. Evidence: scripts/verify-sql-store-absence.mjs:362.

### Wave B: queries, history and access

- **NG-021** Theia reads history entries, bookmarks and bookmark folders through the actor. Evidence: readHistoryEntry, readBookmarkByUrl, listBookmarkFolder have no callers and no message kind (PBA:1951, 1971, 1994).
- **NG-022** The sessionstore projection is reachable from Theia. Evidence: `projectSessionStoreTabs` has no caller (PBA:2027).
- **NG-023** Address-bar suggestions include history and bookmark matches, not only open tabs. Evidence: 13-UI-SPEC.md:141, 192; TQS:219-227 queries `tabs` only.
- **NG-024** A query API joins tabs with history and bookmarks. Evidence: research/FEATURES.md Area 4; no such API.
- **NG-025** Users and MCP clients run read-only SQL against tabs.sqlite through a documented, token-gated endpoint. Evidence: notes/tab-sql-substrate.md "SQL is a user-queryable substrate"; only an internal reader exists.
- **NG-026** Users and MCP clients change tab and group data through a documented write path that goes through the single chrome-side writer. Evidence: notes/tab-sql-substrate.md; no external write path.
- **NG-027** Every reader method in PBA and TQS has a caller on the runtime path; a method with no consumer is deleted. Evidence: getByUri, getBrowserTabByUrl, listByRecency (TQS:167, 184, 195); readTabRow, listTabRows, listGroupRows, getGroupTabs (PBA:1108, 1137, 1621, 1644).
- **NG-028** A tab can store a full saved copy of its page. Evidence: notes/tab-sql-substrate.md "optional full saved-page capture"; no capture code.

### Wave C: modes, setups, windows, bridge

- **NG-029** Restoring a setup activates its mode through ModeService, so the panel map, Explorer dock, Organising slot, furniture and mode attribute apply. Evidence: setups-service.ts:438, 441 call `switchPerspective` directly; applies to the launch restore (:350→:842).
- **NG-030** Restoring a setup opens each web tab once and does not duplicate tabs that are already open. Evidence: setups-service.ts:666-667 opens the active tab a second time; web-tab.ts:643-644 mints a new id per call.
- **NG-031** Restore Setup and Open Dependent Window are reachable from the command palette and a menu. Evidence: registered with no label (setups-commands.ts:8-14); notes/browser-window-model.md:39-40.
- **NG-032** Quitting saves the current session state, and the next launch restores it with no saved setup. Evidence: `onStop` persists only the lastSession pointer (setups-service.ts:364-368); 14-UI-SPEC.md:245 "guaranteed restore on relaunch"; GUI-09.
- **NG-033** The active mode, per-mode layouts and the shell layout survive a relaunch. Evidence: first spawn uses port 0 (TheiaService.sys.mjs:602), so localStorage is per launch; mode-service.ts:562-592.
- **NG-034** In-shell web tabs survive a restart with their back/forward history. Evidence: layout restore refuses them (tab-uris-frontend-module.ts:107); the shell window is not a `navigator:browser` window, so sessionstore never sees them.
- **NG-035** A custom mode saves the layout, not only three panel flags, and the shipped defaults are data. Evidence: mode-service.ts:23-28, 76-81, 371-376; hard-coded furniture rule (:306) and `visibilityFor` (:403-414); 14-CONTEXT.md:33.
- **NG-036** A setup records dock and split positions, tab order across tab bars, and the mode of each window. Evidence: one flat URI list per window plus one modeId (setups-service.ts:538-564); notes/browser-window-model.md:41-43.
- **NG-037** Closing the core window quits the app and stops the backend, including when stock browser windows are open. Evidence: the close button calls `window.close()` (powerbrowser.js:356, uncommitted); the backend stops only on quit-application-granted (TheiaService.sys.mjs:211).
- **NG-038** The actor accepts messages only from the shell's own Theia frame on the sidecar's port; a 127.0.0.1 page in a selected stock tab is refused. Evidence: `matches` ignores the port (PBA:1705); stock tabbrowser sets `primary="true"` (upstream tabbrowser.js:728, 1720), which passes `groupSenderIsTheia` (PBA:150-166).
- **NG-039** Every Firefox-internal touchpoint, including `wrappedJSObject` and `drawSnapshot`, has an INTERNAL-APIS.md row, and check-internals-boundary.sh detects both. Evidence: GroupActorChild.sys.mjs:117, 136; `captureShellRegion` (PBA:1533); guard patterns (scripts/check-internals-boundary.sh:38-64).
- **NG-040** The internals catalogue check passes on the tree: every INTERNAL-APIS.md line reference matches the file. Evidence: rows from `:2079` on are one line behind in the working tree (catalogue 2312, 2562, 2563; file 2313, 2563, 2564).

### Wave D: AI backend

- **NG-041** @OpenCode's model is chosen in Theia's model picker: a LanguageModel is registered and the agent declares its requirements. Evidence: `languageModelRequirements = []` (OC browser/opencode-chat-agent.ts:47); only a ChatAgent is bound (browser/backend-opencode-frontend-module.ts:30-31).
- **NG-042** Inline chat (Ctrl+I) works with @OpenCode. Evidence: `locations = [ChatAgentLocation.Panel]` (opencode-chat-agent.ts:51).
- **NG-043** A Review Changes pane lists the session's changes with accept, reject and revert. Evidence: AI-02; no such surface.
- **NG-044** Open Diff on a change opens a diff editor. Evidence: the element has no `openChange()` (opencode-chat-agent.ts:116-141).
- **NG-045** A change moves through pending, applied, rejected and stale, and the reject and revert buttons appear. Evidence: fixed `state: 'pending'` with no `onDidChange` (opencode-chat-agent.ts:122); Theia shows revert only for applied or stale.
- **NG-046** Deleting a change in the chat UI un-stages it in the backend. Evidence: the proposal stays staged and is re-attached every turn (node/opencode-acp-supervisor.ts:198 → opencode-changeset-emitter.ts:281-283).
- **NG-047** Change history is listed through the service, persists across a restart, and survives in saved chats. Evidence: emitter history is in memory (opencode-changeset-emitter.ts:180, 418); no list method (common/opencode-service.ts:46-70); no `toSerializable`.
- **NG-048** Gated mode holds whatever the user's opencode config says: the adapter starts opencode with edit and write set to ask and declares its file-system capabilities. Evidence: spawn uses the user's config (supervisor.ts:234-246); `initialize` has no `clientCapabilities` (:258).
- **NG-049** Auto-accept applies only the current turn's proposals. Evidence: `applyAllStaged` applies every staged proposal (opencode-chat-agent.ts:89-90, 154-165).
- **NG-050** Non-edit tool requests (bash, webfetch, task) are shown to the user to approve or deny. Evidence: auto-rejected (opencode-changeset-emitter.ts:214-216); `handlePermissionResponse` cannot answer inbound asks (supervisor.ts:129-139).
- **NG-051** With `backend = "off"`, no opencode process and no `/mcp` endpoint start. Evidence: the backend module binds both unconditionally (node/backend-opencode-backend-module.ts:18-27); five crashes call `process.exit(78)` (supervisor.ts:274-281); docs/REBRANDING.md:303.
- **NG-052** The backend selected in configuration.toml reaches the build with no manual copy step. Evidence: docs/ai-opencode-adapter.md step 3.
- **NG-053** `#`-variables and chat-context attachments reach opencode resolved. Evidence: the agent sends the raw text (opencode-chat-agent.ts:63); docs/ai-opencode-adapter.md:38-41 claims otherwise.
- **NG-054** Skill selections apply to @OpenCode. Evidence: the agent implements ChatAgent directly and never reads them; docs/ai-opencode-adapter.md:42-43 claims they apply.
- **NG-055** @OpenCode replies stream as they are generated. Evidence: the `OpencodeClient` interface is never bound (common/opencode-service.ts:72).
- **NG-056** The port variable in opencode.mcp.json is set, and the file is used at runtime. Evidence: nothing sets `POWERBROWSER_MCP_PORT` (opencode-bridge-env.ts:27-39).
- **NG-057** A live @OpenCode turn is run against the built app and checked. Evidence: 16-VERIFICATION.md residual 1.
- **NG-058** A @Pi backend is selectable (AI-01, AI-04). Evidence: cut in 16-SPEC.md only.
- **NG-059** A DSH backend is selectable (AI-04). Evidence: cut in 16-SPEC.md only; notes/pba-plugin-shipping-design.md restates AI-04.
- **NG-060** Per-line comment-to-steer (AI-02). Evidence: cut in 16-SPEC.md only.
- **NG-061** `/btw` ephemeral question (AI-02). Evidence: cut in 16-SPEC.md only.
- **NG-062** File-wide Supercomplete Tab-accept (AI-02). Evidence: cut in 16-SPEC.md only.

### Wave E: platform (Linux)

- **NG-063** The Linux package contains the Theia app, the sidecar, the Node runtime and distribution/, the sidecar finds its backend relative to the install, and a check launches the packaged tree to a ready workbench. Evidence: the tarball has 0 theia/sidecar/Node/distribution entries; `backendMain` is `@POWERBROWSER_DEV_TREE@` (powerbrowser/shell/powerbrowser-sidecar.js:18).
- **NG-064** The update URL comes from configuration.toml, and aus5.mozilla.org is absent from the build. Evidence: objdir/dist/bin/application.ini:22; scripts/generate.mjs:1901-1902; docs/REBRANDING.md:280.
- **NG-065** Update MARs are signed with the fork's key and verified. Evidence: `--enable-unverified-updates` (.mozconfig:8); `ACCEPTED_MAR_CHANNEL_IDS=None` (update-settings.ini:5).
- **NG-066** The NSIS installer takes its branding from the manifest and sends no Mozilla ping. Evidence: upstream nsis/defines.nsi.in:23, 56, 150; installer.nsi:848, 1803 call `SendPingIfApplicable`; no patch touches NSIS.
- **NG-067** Uncaught frontend errors and unhandled rejections reach the telemetry logger, subject to the level setting. Evidence: the logger is bound but nothing injects it (theia/extensions/telemetry/src/browser/telemetry-frontend-module.ts:63).
- **NG-068** The crash collector accepts Gecko's single `extra` annotation part. Evidence: scripts/crash-collector.mjs:77-85.
- **NG-069** open-vsx.org and the AI provider hosts have allowlist rows, and the egress check covers the sidecar's traffic. Evidence: scripts/verify-endpoints.sh:23, 385 read Gecko's MOZ_LOG only; TheiaService.sys.mjs:624; theia/applications/browser/package.json:47, 57.
- **NG-070** No user-visible or generated surface shows the spaced "Power Browser". Evidence: configuration.toml:47 → generated/theia-branding.json; TheiaService.sys.mjs:42-44; mode-service.ts:380, 514, 530.
- **NG-071** npm and local-path (.tgz) extension sources install through `yarn build`, with no files placed by hand. Evidence: 09-04-SUMMARY.md:36-38, 152-154.
- **NG-072** A WebExtension declared in policies.json installs and loads, and policies.json is packaged. Evidence: `ExtensionSettings: {}` (powerbrowser/distribution/policies.json:6).
- **NG-073** A declared Theia extension loads in the built app (EXT-01). Evidence: the pin gate passes because nothing is declared (10-02-SUMMARY.md:192).
- **NG-074** The CI verify workflow passes on main. Evidence: no passing run since 2026-09-04; run 34911771311 fails 15 rows.

### Needs a decision from you (hosts, accounts or scope)

- **NG-075** A Windows MSIX package is built. Evidence: docs/BUILD.md:966-967 staged-unexecuted; PKG-01 box checked (v1.1-REQUIREMENTS.md:31).
- **NG-076** A macOS DMG with .icns is built. Evidence: same as NG-075.
- **NG-077** The Windows and macOS install matrix and per-OS MAR update hop run. Evidence: docs/BUILD.md:997-998.
- **NG-078** A release pipeline exists, per docs/RELEASING.md and SEED-001. Evidence: RELEASING.md:11-12; SEED-001 dormant; no release.yml.
- **NG-079** updates.powerbrowser.org serves updates. Evidence: no DNS record.
- **NG-080** A production crash-ingest host receives reports. Evidence: collector is loopback only (scripts/crash-collector.mjs:27, 89, 343).
- **NG-081** Per-fixture Gecko builds (BLD-02) and fixture live builds (VER-03, DOC-02) run. Evidence: v1.0 07-VERIFICATION.md:18, 75 "NOT RUN".
- **NG-082** Theia is re-pinned to 1.75.0 (UPD-02, UPD-04). Evidence: docs/BUILD.md:258-264 "staged, not executed".
- **NG-083** tabs.sqlite is encrypted. Evidence: plain `Sqlite.openConnection` (PBA:799); notes/tab-sql-substrate.md; research/questions.md Q1 open.
- **NG-084** The five v1.2 human UAT sheets are signed. Evidence: 10-UAT.md:57, 73, 94.

### Found during the build

- **NG-085** Quitting closes the tab store's connection before shutdown, so the app quits in seconds instead of hanging until AsyncShutdown aborts it. Evidence: wave C Task 1 (2026-09-25, report ng-c task-1-report.md) — every quit on the current tree takes about 72 s and aborts in profile-before-change because the tabs.sqlite connection opened at PBA:799/2175 is never closed; wave C's NG-032, NG-033, NG-034 and NG-037 depend on it.
