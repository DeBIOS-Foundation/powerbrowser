---
phase: 19-node-24-react-19-theia-1-76-0
plan: 01
subsystem: verification (live tier)
tags: [UPD-10, first-boot, telemetry, react, fixture, tracer]
status: complete
requires: []
provides:
  - scripts/verify-first-boot-surface.mjs (fresh, --carried, --capture, --self-test)
  - registry rows first-boot-surface-self-test (--quick), first-boot-surface-fresh and first-boot-surface-carried (full)
  - carried-over fixture ~/coding/Power-Browser-fixtures/phase19-carried-over (outside the repo, never committed)
affects: [19-02, 19-03, 19-04, 19-05, 19-06, 19-07]
tech-stack:
  added: []
  patterns:
    - BiDi script.addPreloadScript installed in the withFirefoxPage callback, before the shell navigates its browser element to the sidecar
    - the carried main area is compared by TabUriRegistry.uriOf address, not by widget id
key-files:
  created:
    - scripts/verify-first-boot-surface.mjs
  modified:
    - scripts/verify-platform.sh
decisions:
  - "The first-boot perspective is derived from the product's launch rule (mode-service.ts applyLaunchMode fallback, 'browsing'), not from @theia/core's DEFAULT_PERSPECTIVE_ID ('default'). Measured live: the product opens in browsing"
  - "The carried mode compares main-area tab addresses (TabUriRegistry.uriOf), because web-tab widget ids carry a per-session counter and are minted again on restore"
  - "The UI-SPEC N1 theia-ide.org DOM absence is not asserted, because that assertion is vacuous. The getting-started widget-id assertion and its command positive control replace it"
metrics:
  duration: ~25m
  completed: 2026-10-17
  tasks: 2
  files: 2
estimate_ref: {tokens: 60000, tasks: 2}
actuals:
  tokens: 8500
  tasks: 2
  commits: 2
commits: 2
plan_head_before: 446b395fd5f89035a6ea49dbee4a80f9e72a5e20
plan_head_after: e31c2de87524549b26120683af2e6966eb474d57
---

# Phase 19 Plan 01: First-boot surface live check Summary

This plan adds a live check, run through the supervised shell, that covers first boot on a fresh config dir and on a carried-over one. It has a preload boot error counter, a forced React render-phase error as the counter's positive control, and Settings telemetry copy compared with telemetry-preferences.ts. Both modes pass on the pristine 1.74.1 / React 18.3.1 / Node 22 tree, and a 13-plant self-test runs in `--quick`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (tracer) | Live first-boot check, fresh config dir | 996ffd5 | scripts/verify-first-boot-surface.mjs, scripts/verify-platform.sh |
| 2 | Capture the carried-over fixture; carried mode at baseline | e31c2de | scripts/verify-first-boot-surface.mjs, scripts/verify-platform.sh |

Tracer gate: auto mode was not detected, and `<verify>` is automated-only (end-of-phase default). `<verify>` was re-run end to end after the Task 1 commit and passed, so expansion went ahead.

## What the check does

- **Derived at check time:**
  - the seed id `welcome` and its area `main`, from powerbrowser-welcome-contribution.ts;
  - the welcome widget class, from the same file's import, for the forced error;
  - the launch mode `browsing`, from the mode-service.ts `applyLaunchMode` fallback;
  - the getting-started widget and command ids from the installed lib. At 1.74.1 the lib is absent, so a notice prints. The regex was tested against a scratch `npm pack` of `@theia/getting-started@1.76.0`: it yields `getting.started.widget`, the command id resolves to the widget ID, and the lib reads `workbench.startupEditor`;
  - the Settings widget `settings_widget` and the command `workbench.action.openGlobalSettings`, from the installed `@theia/preferences`;
  - the level key, description, default and enumDescriptions, from telemetry-preferences.ts;
  - the manifest level and the startupEditor default from the app manifest. The startupEditor default is absent, so a notice prints.
- **Boot error counter:** `script.addPreloadScript` runs first in the callback. When the Theia document has no `__pbBootErrors`, the check fails with "boot error counter never reached the Theia document".
- **Forced error:** Code Example 3 (ForcedRenderError). `logError` must see `frontend.uncaught-error` with type ForcedRenderError at least once, and the counter must hold at least one entry of that type.

## Observed at baseline (1.74.1 / React 18.3.1 / Node 22)

| Run | main | left | right | bottom | perspective | boot errors | forced error | wall |
|-----|------|------|-------|--------|-------------|-------------|--------------|------|
| fresh (logs/first-boot-fresh-19-01.log) | `welcome` | explorer-view-container, vsx-extensions-view-container, search-view-container, scm-view-container, debug, test-view-container | outline-view, chat-view-widget | problems, t1 | browsing | 0 | logged 6x, counted 6x | 10 s |
| carried (logs/first-boot-carried-19-01.log) | `view:welcome`, `http://127.0.0.1:42079/carried`, `view:disassembly-view-widget` | explorer-view-container, test-view-container, vsx-extensions-view-container, debug, scm-view-container, search-view-container | outline-view, chat-view-widget | problems, t1 | browsing | 0 | logged 6x, counted 6x | 9 s |

The carried left panel comes back in a different order from the fresh one, which shows the layout was restored from the fixture rather than created fresh. The restored web tab came back with widget id `powerbrowser.web-tab:wt-zbremz-restored-1`. At capture its id was `...wt-0m68im-1` (first capture, which was moved aside). Its address was unchanged.

Under React 18 the forced render error reaches both logError and the window `error` listener. That is the finding the plan asked to confirm: no React 18 miss.

Other runs: the rebuild in logs/build-19-01.log took 12 s and exited 0. `tsc -b` was up to date in all 7 extensions, and the app was rebuilt by esbuild. The capture took 31 s.

## Carried-over fixture

- Path: `~/coding/Power-Browser-fixtures/phase19-carried-over` (`profile/`, `config/`, `main-area.json`, 74 files, 75 MB). It is outside the repo and untracked. It holds only state this check created: a fresh `makeProfile()`, one page served by `servePages` on 127.0.0.1, and one view.
- View chosen: `disassembly-view-widget`. It is the first non-AI row of view-factory-table.ts, in table order, that opens in the main area.
- main-area.json (sha256 `35da4a1c738c8d19da6e7a978fa3fc03afbc61fa94816a64779f482c87e5fb38`):
  `["view:welcome", "http://127.0.0.1:42079/carried", "view:disassembly-view-widget"]`
- Fixture checksums before and after the carried run are identical. `cmp` of the two full `sha256sum` lists exits 0, and both list files hash to `66b7d9eb745f8d7b342632b776c38f3504fde4b114a311a050937a5a3ca5fcf7`. The lists below show the first 16 hex characters of each sha256.

<details><summary>Before the carried run</summary>

```
aa5585d07a0bfb8a  ./config/powerbrowser/recentworkspace.json
35da4a1c738c8d19  ./main-area.json
237743b96b7cce89  ./profile/addonStartup.json.lz4
25ce4d06173f19d5  ./profile/bounce-tracking-protection.sqlite
2434da8148c2fdac  ./profile/cache2/entries/0413A9B8780C3232D295AA521D08C03AE21C08A1
8d19bc7bf654d25f  ./profile/cache2/entries/111AE63D71402EFB02DAB8AC254CA509866314D5
aefcb6ff1f5b53bc  ./profile/cache2/entries/18D9829C258B53F3297B2C41D556246E5517A7A2
49f9e66871b59897  ./profile/cache2/entries/360DE1F3E174E84794C36651DD126686164A2F9A
8f4906d156928f81  ./profile/cache2/entries/3CCD1DF296D5147DF60741A550FB5E12A4B60082
ba933c4431c43752  ./profile/cache2/entries/5142686DCC7827C200EEB6E6688B42018EF4B2BF
1a5839e1192c6e38  ./profile/cache2/entries/A1F5EA805912F110780D406BD59C9CE3B5707897
e02a1018095403a6  ./profile/cache2/entries/BA63CE1279D81C68FF2D88A2A407D6E6DBA6C2CF
e0f4eca62474f7a9  ./profile/cache2/entries/BB95D0607349D05725D5FE01D4FB300E319072AD
cefe6df047a4c260  ./profile/cache2/entries/D0F48A0632B6C451791F4257697E861961F06A6F
541cb0f031f5cb75  ./profile/cache2/entries/E3F6329CF73BB6C045C2422587AAB3837B01E2F9
b56f7a7f27fc0667  ./profile/cache2/entries/E53CCBC73343525714D189539A360EE3A2AD7782
bfcec3f9a8438feb  ./profile/cache2/entries/E8F2A0DF27A0A738832398FC84E808986A7DAF5F
da97296fdd61702e  ./profile/cache2/entries/E9338C5CCF1E2FCF149487351399F198A4F9FCD6
5cc4c2ba944a5c36  ./profile/cert9.db
fc6ef8a8c9851d59  ./profile/compatibility.ini
6de6b920e568ddf0  ./profile/containers.json
4f933bb098da7a63  ./profile/cookies.sqlite
65d4bb10efc275e4  ./profile/datareporting/archived/2026-10/1792254260420.16058e4d-600d-4de2-b146-b3a708299ca2.new-profile.jsonlz4
65a0e93d5c2a7e32  ./profile/datareporting/archived/2026-10/1792254260423.a854ef5d-61ff-47d1-a1d4-b88f32ba840a.event.jsonlz4
c1dc73a308c30287  ./profile/datareporting/glean/client_id.txt
45e814b25c650f32  ./profile/datareporting/glean/db/data.safe.bin
e8336ec6bf5c139f  ./profile/datareporting/glean/events/events
936aabf4ab8772af  ./profile/datareporting/glean/pending_pings/04cdbdf5-8a11-4979-b779-b62077f8f84e
94c99267b08c944b  ./profile/datareporting/glean/pending_pings/643f3207-c828-46b2-ad61-52374572b6de
fd8d662f1b30bef5  ./profile/datareporting/glean/pending_pings/858c4843-30df-4109-937d-ad6dfe6e6a14
b623ed48f86045da  ./profile/datareporting/glean/pending_pings/8aa7b6c3-8b2c-42c8-b3b5-3e9a6d931530
cc21944aebbcf398  ./profile/datareporting/glean/pending_pings/8b5036e1-bc1e-4e68-b3da-f9d979acd9e9
02f8348e54548008  ./profile/datareporting/session-state.json
1c9adfd4f7230c61  ./profile/datareporting/state.json
adf7cb031789fc5f  ./profile/extension-preferences.json
3233b35458c9763b  ./profile/extensions.json
cb87328bd677833a  ./profile/extension-store/data.safe.bin
16dc784ed2e21b07  ./profile/favicons.sqlite
e3b0c44298fc1c14  ./profile/favicons.sqlite-wal
c25a9a0d6f0ec528  ./profile/key4.db
e3b0c44298fc1c14  ./profile/.parentlock
49612f705116177b  ./profile/permissions.sqlite
added08c53aec5bb  ./profile/pkcs11.txt
5363c49675d34930  ./profile/places.sqlite
e3b0c44298fc1c14  ./profile/places.sqlite-wal
d358b8f15bbef716  ./profile/powerbrowser-shell-state.json
a17c823b96b82bcf  ./profile/powerbrowser-web-tab-history.json
fe153899d7db179c  ./profile/prefs.js
a900700300865c94  ./profile/protections.sqlite
c40d1a8460187b4e  ./profile/sessionCheckpoints.json
f8c8cc6fdf569156  ./profile/sessionstore-backups/recovery.jsonlz4
1417ac14b7189859  ./profile/startupCache/scriptCache.bin
c0676039bedf1dba  ./profile/startupCache/scriptCache-child.bin
d37dfa43b0afab49  ./profile/startupCache/startupCache.8.little
d13c6867b2cbbc16  ./profile/startupCache/urlCache.bin
1461de9184e65774  ./profile/startupCache/webext.sc.lz4
ead932d0f5e342f5  ./profile/storage/default/http+++127.0.0.1+46733/idb/3040474327tohceainao-m.sqlite
e3b0c44298fc1c14  ./profile/storage/default/http+++127.0.0.1+46733/idb/3040474327tohceainao-m.sqlite-wal
559cf082200681bf  ./profile/storage/default/http+++127.0.0.1+46733/ls/data.sqlite
c0aa9632014e571d  ./profile/storage/default/http+++127.0.0.1+46733/ls/usage
eec15941b592518d  ./profile/storage/default/http+++127.0.0.1+46733/.metadata-v2
e400f49481c17cc5  ./profile/storage/ls-archive.sqlite
22cd4f49c9701b26  ./profile/storage/permanent/chrome/idb/3870112724rsegmnoittet-es.sqlite
e3b0c44298fc1c14  ./profile/storage/permanent/chrome/idb/3870112724rsegmnoittet-es.sqlite-wal
f96868e76e3b7adf  ./profile/storage/permanent/chrome/.metadata-v2
a4c12f8cc7881303  ./profile/storage.sqlite
490af7a20da96482  ./profile/tabs.sqlite
1a3ad605cf7a1486  ./profile/tabs.sqlite-shm
e3b0c44298fc1c14  ./profile/tabs.sqlite-wal
31c656391e5af170  ./profile/Telemetry.ShutdownTime.txt
926c5c554145b064  ./profile/times.json
2e863662476526c4  ./profile/user.js
be2f1d4dc816df8d  ./profile/webappsstore.sqlite
e3b0c44298fc1c14  ./profile/webappsstore.sqlite-wal
```
</details>

<details><summary>After the carried run (identical)</summary>

```
aa5585d07a0bfb8a  ./config/powerbrowser/recentworkspace.json
35da4a1c738c8d19  ./main-area.json
237743b96b7cce89  ./profile/addonStartup.json.lz4
25ce4d06173f19d5  ./profile/bounce-tracking-protection.sqlite
2434da8148c2fdac  ./profile/cache2/entries/0413A9B8780C3232D295AA521D08C03AE21C08A1
8d19bc7bf654d25f  ./profile/cache2/entries/111AE63D71402EFB02DAB8AC254CA509866314D5
aefcb6ff1f5b53bc  ./profile/cache2/entries/18D9829C258B53F3297B2C41D556246E5517A7A2
49f9e66871b59897  ./profile/cache2/entries/360DE1F3E174E84794C36651DD126686164A2F9A
8f4906d156928f81  ./profile/cache2/entries/3CCD1DF296D5147DF60741A550FB5E12A4B60082
ba933c4431c43752  ./profile/cache2/entries/5142686DCC7827C200EEB6E6688B42018EF4B2BF
1a5839e1192c6e38  ./profile/cache2/entries/A1F5EA805912F110780D406BD59C9CE3B5707897
e02a1018095403a6  ./profile/cache2/entries/BA63CE1279D81C68FF2D88A2A407D6E6DBA6C2CF
e0f4eca62474f7a9  ./profile/cache2/entries/BB95D0607349D05725D5FE01D4FB300E319072AD
cefe6df047a4c260  ./profile/cache2/entries/D0F48A0632B6C451791F4257697E861961F06A6F
541cb0f031f5cb75  ./profile/cache2/entries/E3F6329CF73BB6C045C2422587AAB3837B01E2F9
b56f7a7f27fc0667  ./profile/cache2/entries/E53CCBC73343525714D189539A360EE3A2AD7782
bfcec3f9a8438feb  ./profile/cache2/entries/E8F2A0DF27A0A738832398FC84E808986A7DAF5F
da97296fdd61702e  ./profile/cache2/entries/E9338C5CCF1E2FCF149487351399F198A4F9FCD6
5cc4c2ba944a5c36  ./profile/cert9.db
fc6ef8a8c9851d59  ./profile/compatibility.ini
6de6b920e568ddf0  ./profile/containers.json
4f933bb098da7a63  ./profile/cookies.sqlite
65d4bb10efc275e4  ./profile/datareporting/archived/2026-10/1792254260420.16058e4d-600d-4de2-b146-b3a708299ca2.new-profile.jsonlz4
65a0e93d5c2a7e32  ./profile/datareporting/archived/2026-10/1792254260423.a854ef5d-61ff-47d1-a1d4-b88f32ba840a.event.jsonlz4
c1dc73a308c30287  ./profile/datareporting/glean/client_id.txt
45e814b25c650f32  ./profile/datareporting/glean/db/data.safe.bin
e8336ec6bf5c139f  ./profile/datareporting/glean/events/events
936aabf4ab8772af  ./profile/datareporting/glean/pending_pings/04cdbdf5-8a11-4979-b779-b62077f8f84e
94c99267b08c944b  ./profile/datareporting/glean/pending_pings/643f3207-c828-46b2-ad61-52374572b6de
fd8d662f1b30bef5  ./profile/datareporting/glean/pending_pings/858c4843-30df-4109-937d-ad6dfe6e6a14
b623ed48f86045da  ./profile/datareporting/glean/pending_pings/8aa7b6c3-8b2c-42c8-b3b5-3e9a6d931530
cc21944aebbcf398  ./profile/datareporting/glean/pending_pings/8b5036e1-bc1e-4e68-b3da-f9d979acd9e9
02f8348e54548008  ./profile/datareporting/session-state.json
1c9adfd4f7230c61  ./profile/datareporting/state.json
adf7cb031789fc5f  ./profile/extension-preferences.json
3233b35458c9763b  ./profile/extensions.json
cb87328bd677833a  ./profile/extension-store/data.safe.bin
16dc784ed2e21b07  ./profile/favicons.sqlite
e3b0c44298fc1c14  ./profile/favicons.sqlite-wal
c25a9a0d6f0ec528  ./profile/key4.db
e3b0c44298fc1c14  ./profile/.parentlock
49612f705116177b  ./profile/permissions.sqlite
added08c53aec5bb  ./profile/pkcs11.txt
5363c49675d34930  ./profile/places.sqlite
e3b0c44298fc1c14  ./profile/places.sqlite-wal
d358b8f15bbef716  ./profile/powerbrowser-shell-state.json
a17c823b96b82bcf  ./profile/powerbrowser-web-tab-history.json
fe153899d7db179c  ./profile/prefs.js
a900700300865c94  ./profile/protections.sqlite
c40d1a8460187b4e  ./profile/sessionCheckpoints.json
f8c8cc6fdf569156  ./profile/sessionstore-backups/recovery.jsonlz4
1417ac14b7189859  ./profile/startupCache/scriptCache.bin
c0676039bedf1dba  ./profile/startupCache/scriptCache-child.bin
d37dfa43b0afab49  ./profile/startupCache/startupCache.8.little
d13c6867b2cbbc16  ./profile/startupCache/urlCache.bin
1461de9184e65774  ./profile/startupCache/webext.sc.lz4
ead932d0f5e342f5  ./profile/storage/default/http+++127.0.0.1+46733/idb/3040474327tohceainao-m.sqlite
e3b0c44298fc1c14  ./profile/storage/default/http+++127.0.0.1+46733/idb/3040474327tohceainao-m.sqlite-wal
559cf082200681bf  ./profile/storage/default/http+++127.0.0.1+46733/ls/data.sqlite
c0aa9632014e571d  ./profile/storage/default/http+++127.0.0.1+46733/ls/usage
eec15941b592518d  ./profile/storage/default/http+++127.0.0.1+46733/.metadata-v2
e400f49481c17cc5  ./profile/storage/ls-archive.sqlite
22cd4f49c9701b26  ./profile/storage/permanent/chrome/idb/3870112724rsegmnoittet-es.sqlite
e3b0c44298fc1c14  ./profile/storage/permanent/chrome/idb/3870112724rsegmnoittet-es.sqlite-wal
f96868e76e3b7adf  ./profile/storage/permanent/chrome/.metadata-v2
a4c12f8cc7881303  ./profile/storage.sqlite
490af7a20da96482  ./profile/tabs.sqlite
1a3ad605cf7a1486  ./profile/tabs.sqlite-shm
e3b0c44298fc1c14  ./profile/tabs.sqlite-wal
31c656391e5af170  ./profile/Telemetry.ShutdownTime.txt
926c5c554145b064  ./profile/times.json
2e863662476526c4  ./profile/user.js
be2f1d4dc816df8d  ./profile/webappsstore.sqlite
e3b0c44298fc1c14  ./profile/webappsstore.sqlite-wal
```
</details>

## Verification results

- Task 1 `<verify>` chain passed:
  - build and fresh logs end `PHASE19_EXIT=0`;
  - the fresh log holds `first-boot-surface-fresh: PASS -- main area [welcome]` and `  first-boot-surface-fresh: PASS`;
  - the self-test passes;
  - the row is registered and the file is tracked;
  - the brand scan passes over 348 files after staging;
  - `--quick` (logs/quick-19-01-t1.log) reaches the summary, `first-boot-surface-self-test: PASS`, and the R33 subtraction is empty. The only FAILs are the 4 gui08 baseline rows.
- Task 2 `<verify>` chain passed:
  - the fixture has `profile/`, `config/` and a `main-area.json` of 3 entries, and sits outside the repo;
  - capture and carried logs end `PHASE19_EXIT=0`;
  - the carried log holds `first-boot-surface-carried: PASS -- restored main area` and `  first-boot-surface-carried: PASS`;
  - unset, the env var prints the R7 notice;
  - `/nonexistent-phase19` exits 1;
  - the self-test passes;
  - the fixture is untracked;
  - the brand scan passes;
  - `--quick` (logs/quick-19-01-t2.log) has an empty R33 subtraction.
- Acceptance criteria:
  - `grep -c 'first-boot-surface' scripts/verify-platform.sh` = 3 (the three rows; the comments do not spell the label);
  - no `-PLAN.md` name appears in the diff;
  - the fresh log carries both notices (getting-started not installed, no startupEditor default);
  - the self-test reports 13 plants red: 10 in Task 1 and 3 carried plants in Task 2;
  - each commit names exactly the two script files;
  - `git diff --quiet HEAD -- scripts/lib scripts/verify-ng-067-frontend-errors.mjs` succeeds.
- After the Task 2 edits, the fresh mode was re-run and still passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Perspective expectation derived from the wrong source**
- **Found during:** Task 1, first live run.
- **Issue:** The plan derives the expected perspective from `@theia/core` `DEFAULT_PERSPECTIVE_ID` (`default`). The product opens in `browsing`: `applyLaunchMode` activates the persisted shipped mode or falls back to `browsing`. The first run went red with "active perspective is "browsing", expected the default "default"".
- **Fix:** The expectation is now the fallback literal of `applyLaunchMode` in theia/extensions/modes/src/browser/mode-service.ts, which is still derived and still fails closed. This still catches an upstream perspective (the AI First one at 1.76) switching on at boot.
- **Files modified:** scripts/verify-first-boot-surface.mjs
- **Commit:** 996ffd5

**2. [Rule 1 - Bug] The carried set compared widget ids, which change on restore**
- **Found during:** Task 2, first carried run.
- **Issue:** Web-tab widget ids carry a per-session counter (`wt-<session>-<n>`). The restored tab came back as `wt-zbremz-restored-1` against the captured `wt-0m68im-1`, so an id-set comparison is red on a correct restore.
- **Fix:** Capture writes, and carried compares, the product's own tab addresses from `TabUriRegistry.uriOf`. docs/URI-SCHEMES.md rule 4 keeps the counter out of the URI. The fresh mode still compares widget ids.
- **Recapture:** The first, id-based capture was moved to the session scratchpad (`phase19-carried-over-id-capture`). A hook blocks recursive deletes outside the project. The fixture was then recaptured on the same pristine tree.
- **Files modified:** scripts/verify-first-boot-surface.mjs
- **Commit:** e31c2de

**3. [UI-SPEC N1 deviation, as the plan requires] The `theia-ide.org` DOM absence is not asserted**
- **Why:** That assertion is vacuous. The getting-started links are click handlers, so the text is absent even while the widget is open (19-RESEARCH Pitfall 6).
- **Replacement:** The getting-started widget-id assertion. Its positive control executes the getting-started command and requires the widget to open. Both apply once `@theia/getting-started` is installed (1.76.0); at 1.74.1 a notice says it is not composed.

## Known Stubs

None. Two assertions do not apply at baseline and become active on their own, with no code change:

- the getting-started absence and its positive control, once `@theia/getting-started` is installed;
- the startupEditor assertion, once the manifest declares `workbench.startupEditor`.

## Threat Flags

None. No new endpoint, auth path or schema. T-19-01 is mitigated:

- `--capture` refuses a dir inside the repo; this was tested with `--capture ./x`, which gave FAIL.
- `--capture` refuses a non-empty dir.
- The fixture holds only check-created state.

T-19-03 is mitigated: pgrep was clean before each LONG run, and port 3000 was never touched.

## Notes for later plans

- **The rebuild changed no extension `lib/`.** `yarn build` found `tsc -b` up to date in all seven extensions. Three emitted files have no source; they are logged in deferred-items.md in this phase directory.
- **The carried fixture can only be captured on the pristine tree.** Re-capturing it after commit 1 would defeat its purpose.

## Self-Check: PASSED

- FOUND: scripts/verify-first-boot-surface.mjs (tracked)
- FOUND: ~/coding/Power-Browser-fixtures/phase19-carried-over/{profile,config,main-area.json}
- FOUND: 996ffd5 and e31c2de are ancestors of HEAD
