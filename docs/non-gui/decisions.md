# Non-GUI build — decisions

Answered by Chris on 2026-09-25 (program plan: GUI-research
docs/superpowers/plans/2026-09-25-powerbrowser-non-gui.md, "Decisions for you").

- **D1 Uncommitted work: (a) committed to main** as `7b7a1f7`. The wave clones start from it.
- **D2 AI backend: (b) retire the opencode adapter for the PowerBrowser-Assistant plugin.**
  - Kept: NG-051 (with `backend = "off"`, no opencode process and no `/mcp` endpoint start).
  - Also built, in wave E: the adapter leaves the default build — `backend = "off"` is the
    `configuration.toml` default, and `@powerbrowser/backend-opencode` is not a dependency of
    `theia/applications/browser` unless the manifest selects it. The adapter's source stays in
    the tree.
  - Dropped with your quote: NG-041 to NG-050 and NG-052 to NG-062.
  - Doc sync (Task 12) writes the retirement into `.planning/REQUIREMENTS.md` (AI-01..AI-05)
    and `.planning/ROADMAP.md` (Phase 16). PBA itself is planned in ~/coding/PowerBrowser-Assistant.
- **D3 Encryption: (a) dropped.** NG-083. mozStorage has no SQLCipher; full-disk encryption
  covers the threat; the file stays queryable (NG-025).
- **D4 Hosts, accounts, long builds: (a) deferred to a later milestone.** NG-075 to NG-082,
  each with your APPROVE. Wave E builds Linux-local rows only.
- **D5 MAR signing key: (a)** generated locally, private key at
  `~/.config/powerbrowser-release/mar-key/` (outside the repo), public cert in the tree.
- **D6 Backlog and seeds:** Phase 999.1, seeds content-gui-plugins and hister-style-history
  stay where they are. Not rows.
- **D7 UAT sheets: (a)** you run the five v1.2 sheets in Task 12 (NG-084).

## Waves after these answers

| Wave | Rows | Clone |
|---|---|---|
| A tab identity and store | NG-001 – NG-020 (20) | ~/coding/Power-Browser-ng-a |
| B queries, history, access | NG-021 – NG-028 (8) | ~/coding/Power-Browser-ng-b |
| C modes, setups, windows, bridge | NG-029 – NG-040 (12) | ~/coding/Power-Browser-ng-c |
| E platform (Linux) + adapter off | NG-051, NG-063 – NG-074 (13) | ~/coding/Power-Browser-ng-e |

No wave D. NG-084 is yours (Task 12).

## Quick-tier baseline

`docs/non-gui/quick-baseline.txt` lists the nine `--quick` rows already red on `7b7a1f7`.
The commit gate for every wave is: no `--quick` failure outside that list, except a wave's own
recorded NG checks. Command:

    scripts/verify-platform.sh --quick 2>&1 | sed -n '/^verify-platform: summary/,$p' \
      | grep ': FAIL$' | awk '{print $1}' | sed 's/:$//' | sort \
      | comm -13 docs/non-gui/quick-baseline.txt -

It prints the new failures; empty output passes. NG-016 and NG-040 own two baseline rows
(`gui08-persistence-roundtrip`, `internals-catalogue`) and must turn them green.

## Controller rulings on the drafters' questions (2026-09-25)

- **R1 Check files and the TSV.** Every row's check lives in its own file (`scripts/verify-ng-NNN-<slug>.mjs`, shared helpers allowed under `scripts/lib/`), and is also registered in `scripts/verify-platform.sh`. `lock-checks` digests the check file, so one file per row keeps a registration edit from breaking the lock. `docs/non-gui/checks-wave-X.tsv` has exactly three tab-separated fields: `NG-NNN`, the test ref `scripts/verify-ng-NNN-<slug>.mjs::<label>`, and a command that contains that file path; the tier may follow the command as a trailing ` # live-main|live-clone|quick` (the kit runs the command through a shell, so the comment is inert).
- **R2 Ownership (wave A Q1).** The seven regions wave A listed go to wave A: `liveTabs()`, the key line in `scheduleShellCapture` and the import in `organising-widget.ts`; the `GroupMutation` union in `group-actor-client.ts`; `getSettings` on `GroupQueryService`; the `closed_at` column in `verify-chrome-bar-suggestions.mjs`'s fixture; the expectation in `verify-gui08-close-exactness.mjs`; PowerBrowserAPI.sys.mjs :45–109 (DDL markers, store constants); deleting `browser-tab-uri.ts`. Wave B's additions to the `GroupMutation` union are `Needs: wave-a`.
- **R3 Kept profile (wave A Q2).** Done in main as `f4818a0`: `withFirefoxPage(url, cb, { profileDir })` and appended `user.js` overrides.
- **R4 Pointer lines (wave A Q3).** The controller adds the pointer to `docs/TAB-STORE.md` in the v1.2 SCHEMA.md and MIGRATIONS.md when wave A merges.
- **R5 NG-011 restore (wave A Q4).** Wave C names its launch-restore entry point and per-tab restore; its saved session records, per web tab, `rowKey`, `url`, `last_accessed`, plus the save time.
- **R6 Wave A Q5 rulings** (minted `web:`/`stock:` keys; settings defaults; not-open cards for grouped tabs only; Theia-drawn rows written when first organised; a quit never closes a row) stand unless Chris changes them.
- **R7 Real-profile fixture (wave A Q8).** Done: `~/coding/Power-Browser-fixtures/real-profile-tabs-2026-09-25.sqlite` (SQLite backup of the live profile, schema v4, 6 tabs, 5 groups, 0 grouped), outside the repo, never committed. Checks read it through an env var (`PB_REAL_PROFILE_FIXTURE`) and skip with a printed notice when it is absent, so CI and clones without it stay honest.
- **R8 Size gate (wave E).** `size-gate.py` guards `.planning/**` plans; the wave plans live outside `.planning` and are bound only by the 20-ID limit.
- **R9 ai-opencode rows (wave E Q2).** They run only when the adapter is composed; otherwise the `ai-opencode-held` stand-in reports held.
- **R10 aus5 (wave E Q4).** Accepted: bare hosts in upstream's HTTP/3 list and the Remote Settings fallback map are not update URLs; the check asserts no update URL points at aus5.
- **R11 Downstream update URL (wave E Q5).** The generator refuses a downstream build whose `urls.update` is PowerBrowser's own host (fail closed).
- **R12 MAR (wave E Q6).** Certificate in `powerbrowser/packaging/mar/`; one key fills both updater slots; the key store gets a password read from a file in `~/.config/powerbrowser-release/mar-key/` created in Chris's key step, not an empty one. Wave E updates BUILD.md and RELEASING.md.
- **R13 Packaged Node (wave E Q7).** The package ships an official upstream Node release binary (pinned version, sha256-checked), not the Nix-store binary, so it runs off this machine.
- **R14 Docs (wave E Q9).** Wave E updates the docs its changes make stale: REBRANDING.md, ai-opencode-adapter.md, BUILD.md, RELEASING.md.
- **R15 Allowlist (wave E Q10).** open-vsx.org, the AI provider hosts and the download hosts are allowed with reason "user-initiated" and the feature named; AI hosts only when a key is configured.
- **R16 NSIS issuer (wave E Q11).** Accepted; Windows signing is deferred with NG-075.
- **R17 `receiveMessage` (wave B Q1, wave C Q2).** Both waves edit `PowerBrowserGroupParent.receiveMessage`; whichever merges second keeps both edits; the controller resolves at merge.
- **R18 Settings writes (wave B Q2).** Wave B adds a `setSetting` op to the documented write path (NG-026), through the chrome writer. Wave A's `docs/TAB-STORE.md` states each settings key's valid values, and the writer validates against them.
- **R19 Wave B's touches outside its list (wave B Q3).** Approved: the `theiaExtensions` entry in `tab-uris/package.json`, five new browser-side files in tab-uris, two seams in `verify-web-tab-live.mjs`, `EXPECTED_SCHEMA_HEAD`/`EXPECTED_GROUP_METHODS` in the roundtrip check, `docs/TAB-STORE.md` (after wave A merges), and `INTERNAL-APIS.md` rows (conflicts with wave C resolved at merge).
- **R20 `saved_pages` (wave B Q4).** Schema v6 in wave B's Task 7, after wave A's v5 is merged.
- **R21 Downstream fixtures (wave E Q12).** Exception to G3 for test inputs only: wave E's Task 15 adds `[urls] update = "https://updates.example.org/update.xml"` to the seven downstream fixture configs under `.planning/milestones/` that state none, in the same commit as the R11 refusal, and `verify-downstream-fixtures` stays green. No other `.planning/` file is touched.
- **R22 Package portability (wave E Q13).** NG-063 is met by a package that runs on this machine's Nix store; running on other Linux hosts (the Gecko launcher's `/nix/store` interpreter, `libxul.so` references) belongs with the deferred packaging and release rows (NG-075–NG-078).
- **R23 Wave C's extra files (wave C Q1, Q3).** Granted: `verify-mode-switch-tabs-invariant.mjs` (Task 5), `verify-setup-roundtrip.mjs` (Tasks 7, 8), `verify-mode-toggle-commands.mjs` (Task 9), one `MenuContribution` bind line in `modes-frontend-module.ts` (NG-031), and the new file `theia/extensions/tab-uris/src/browser/profile-storage.ts` (NG-033).
- **R24 Catalogue after merges (wave C Q4).** After wave C's NG-039/NG-040 merge, every later merge that changes `PowerBrowserAPI.sys.mjs` runs `verify-ng-040-…mjs --fix` in main and adds `INTERNAL-APIS.md` rows for new touchpoints, in the merge commit; the controller does it.
- **R25 Small wave C calls (Q6, Q7, Q8).** The NG-031 labels "Restore Setup" and "Open Tab in Own Window" stand unless Chris renames them. A dependent window records `modeId: null` (it hosts one tab and carries no mode). The ten live NG checks prove red through record-fail on the pre-build tree plus the final reviewer deleting a named call site; no `--self-test` is required for them.
- **R26 Wave B from wave A's pre-flight.** Wave B's Task 7 (schema v6) also bumps `TAB_STORE_SCHEMA_HEAD` in `theia/extensions/tab-uris/src/node/tab-query-service.ts`, or the reader refuses every v6 store. Wave B's checks match the substring `unknown tab URI`, since wave A's messages carry a method prefix (and a suffix for `setGroupOrder`).
- **R27 verify-web-tab-live.mjs.** Wave A's Task 2 moves the thumbnail lookups (:481, :878, :888) to the row key so `gui02-web-tab-live` stays green; wave B's two seams in that file rebase on wave A's version.
- **R28 Flaky rows under load.** With several waves running quick tiers and live checks at once, a row can fail and then pass alone (`verify-downstream-fixtures-self-test` at f3633a8: red in the full run, PASS alone, unique mkdtemp paths). A new failure in the baseline comparison is re-run alone with `scripts/verify-platform.sh --only <label>` before it counts; the merge gate in main always re-runs its failures alone. A row that fails alone is real.
- **R29 NG-085 (found by wave C's Task 1).** Every quit on the current tree hangs about 72 s and aborts because the tabs.sqlite connection is never closed at shutdown. New ledger row NG-085, owned by wave A (store open/close is its region, G11): its check joins wave A's Task 1, its fix joins wave A's Task 2 (the slice that merges first). Wave A cites 21 IDs; the 20-ID limit (R8) is relaxed by this one row. Wave C's NG-032, NG-033, NG-034 and NG-037 tasks become `Needs: wave-a` (Task 2 slice); their checks are recorded red now (they fail at the first quit), and their 30 s quit budget stays, since a 72 s quit is itself the defect.
- **R30 The ledger log is a manifest-literal carrier.** `record-fail` stores failing check output verbatim in the append-only `ledger/history/log.jsonl`, and branding checks print configured values, so `verify-manifest-literals` allowlists that file for `product.vendor_display` and `legal.trademark_notice` (894248d). Every recording run ends with the manifest-literal check and the brand scan.
- **R31 Chrome-side code is proven live, in main, under the lock.** An offline Node harness cannot see Firefox-API rules (wave A Task 2: Sqlite.sys.mjs refuses an unbound LIKE, so the migration rolled back while 87/87 offline checks passed). Every chrome-side task proves its live-main rows before review completes, using the controller's lock-safe tools: verify-slice.sh (runs the rows on a temporary branch of main with the task commit merged) and chrome-diag.sh (headless start with chrome console on stderr). Both hold pb-live.lock for their whole run and always restore main. Every operation in main — merges, recording, diagnostics — holds pb-live.lock.
- **R32 Ledger writes never dirty a live check's tree.** Wave A's harness refuses to run on a dirty tree (assertCleanTree). The controller's recording and mark-done loops wrote the ledger between rows, so wave A's 18 live rows were recorded failing on that guard, not on their behaviour gap, and seven passing slice rows were reported "still failing". Their true RED evidence is in wave A's reviewed Task 1 report (task-1-report.md, reviewer-confirmed). Fix: every loop commits the ledger after each row, holding pb-live.lock (record-wave.sh, ledger-rows.sh). The ten wave A rows not yet built were re-recorded on a clean tree; the eight slice rows were marked done on a clean tree.
