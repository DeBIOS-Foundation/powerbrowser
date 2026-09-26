# Wave B: questions

Every row NG-021 to NG-028 is planned. All four questions are answered by the controller's rulings in `docs/non-gui/decisions.md` (2026-09-25). The plan conforms to each ruling.

## Q1: `PowerBrowserGroupParent.receiveMessage` is edited by waves B and C

- Wave B's Task 3 adds one line there: `if (isStoreRequestKind(message.data?.kind)) { return handleStoreRequest(message.data, this); }`. Wave C's Q2 edits the same method.
- **Ruling R17:** both edits stand. Whichever wave merges second keeps both, and the controller resolves the merge. B's Task 3 says: if wave C's change is already on `main`, keep it and put the hook line before the `handleGroupMutation` return.

## Q2: settings through the write path

- Wave A's `docs/TAB-STORE.md` ("Settings") says a setting can be edited through wave B's documented write path.
- **Ruling R18:** wave B adds a `setSetting` op to the NG-026 write path, through the chrome writer. Wave A's `docs/TAB-STORE.md` states each key's valid values, and the writer validates against them.
- **Planned in Task 6:**
  - `setSetting: ['key', 'value']` in `TAB_STORE_WRITE_FIELDS`.
  - A chrome store kind `setSetting` in `handleStoreRequest`, with `STORE_SETTING_RULES` and `setStoreSetting`, which updates existing keys only.
  - Step 4a (`Needs: wave-a`) aligns each rule with the values wave A's doc states.
  - The NG-026 check requires the rule keys to equal the doc's keys, and reads each change back through `GroupQueryService.getSettings()`.
  - Because `setSetting` runs chrome-side, the NG-026 check moved from live-clone to live-main.

## Q3: shared files B touches outside its listed ownership

- The touches: the `theiaExtensions` entry in `tab-uris/package.json`; five new browser-side files in tab-uris; two seams in `verify-web-tab-live.mjs`; `EXPECTED_SCHEMA_HEAD` and `EXPECTED_GROUP_METHODS` in the roundtrip check; `docs/TAB-STORE.md` (after wave A merges); and `INTERNAL-APIS.md` rows.
- **Ruling R19:** approved as proposed. `INTERNAL-APIS.md` conflicts with wave C are resolved at merge.
- B makes no addition to the `GroupMutation` union in `group-actor-client.ts` (R2). B's store kinds go through its own `ChromeStoreClient`.

## Q4: schema version 6 for `saved_pages`

- **Ruling R20:** schema v6 goes in wave B's Task 7, after wave A's v5 is merged.
- The plan uses the marker `PB-SQL-V6-DDL`, adds `migrateTabStoreToV6` and one entry in `migrateTabStoreToHead`'s `steps`, and bumps the head to 6.
